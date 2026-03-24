/**
 * MCP logger — three levels of visibility:
 *
 * 1. TOOL    (enableLogging)
 *    Every MCP tool call with args, result and duration.
 *    Human summary: "keycloak_list_users(realm=demo) → 3 items [851ms]"
 *
 * 2. HTTP    (enableHttpLogging)
 *    Every outbound fetch() call from the MCP server to Keycloak REST API.
 *    Human summary: "GET /admin/realms/demo/users → 200 OK [210ms]"
 *    Includes full request URL, method, request body, response body, status.
 *    Passwords and access tokens are automatically redacted.
 *
 * 3. NETWORK (enableNetworkLogging)
 *    Raw JSON-RPC messages on stdin/stdout (wire between VS Code and this server).
 *    Human summary:
 *      rx "← [#12] tools/call  keycloak_list_users"
 *      tx "→ [#12] result  (1 content item)"
 *
 * Configuration (env vars):
 *   MCP_LOG_FILE    Path to log file. Default: keycloak-mcp.log in the process cwd.
 *                   Set to "" or "off" to disable all file logging.
 *   MCP_LOG_STDERR  Set to "1" to also echo every entry to stderr.
 *   MCP_LOG_LEVEL   Comma-separated list of levels: tool, http, network, all.
 *                   Default: "all"  (all three levels)
 *
 * Every JSONL entry contains:
 *   ts        ISO-8601 timestamp
 *   level     "tool" | "http" | "network"
 *   summary   Plain-English one-liner describing the event
 *   ...       Level-specific fields documented below
 */

import fs from "node:fs";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// ── Config ────────────────────────────────────────────────────────────────────

const logFileEnv = process.env["MCP_LOG_FILE"];
const logToStderr = process.env["MCP_LOG_STDERR"] === "1";
const logLevelEnv = (process.env["MCP_LOG_LEVEL"] ?? "all").toLowerCase();
const logLevels = new Set(
    logLevelEnv === "all"
        ? ["tool", "http", "network"]
        : logLevelEnv.split(",").map((s) => s.trim())
);

const logFile: string | null = (() => {
    if (logFileEnv === "" || logFileEnv === "off") return null;
    return logFileEnv ?? path.join(process.cwd(), "keycloak-mcp.log");
})();

const keycloakBase = (process.env["KEYCLOAK_URL"] ?? "").replace(/\/$/, "");

// ── Low-level write ───────────────────────────────────────────────────────────

function writeEntry(entry: Record<string, unknown>): void {
    const line = JSON.stringify(entry) + "\n";
    if (logFile) {
        try {
            fs.appendFileSync(logFile, line, "utf8");
        } catch {
            // degrade gracefully — never crash the server over a logging error
        }
    }
    if (logToStderr) {
        process.stderr.write("[mcp-log] " + line);
    }
}

// ── Human-readable summary helpers ───────────────────────────────────────────

/** Produce a short "key=value" argument string from the most interesting fields.
 * @param parsedResult  Already-unwrapped result (not the raw MCP content envelope). */
function toolSummary(name: string, args: unknown, parsedResult: unknown, durationMs: number): string {
    const argsObj = (args ?? {}) as Record<string, unknown>;
    const SHOW = ["realm", "userId", "groupId", "roleId", "clientId", "id", "username", "search"];
    const shownArgs = SHOW
        .filter((k) => argsObj[k] !== undefined)
        .map((k) => `${k}=${argsObj[k]}`)
        .join(", ");

    let outcome = "ok";
    if (Array.isArray(parsedResult)) {
        outcome = `${parsedResult.length} item${parsedResult.length !== 1 ? "s" : ""}`;
    } else if (parsedResult && typeof parsedResult === "object") {
        const keys = Object.keys(parsedResult as object);
        outcome = keys.length > 0
            ? `{${keys.slice(0, 3).join(", ")}${keys.length > 3 ? "…" : ""}}`
            : "{}";
    }

    return `${name}(${shownArgs}) → ${outcome} [${durationMs}ms]`;
}

/** One-liner for an HTTP request/response pair. */
function httpSummary(method: string, url: string, status: number, durationMs: number): string {
    const shortUrl = keycloakBase ? url.replace(keycloakBase, "") : url;
    const ok = status >= 200 && status < 300;
    return `${method} ${shortUrl} → ${status} ${ok ? "OK" : "ERROR"} [${durationMs}ms]`;
}

/** One-liner for a JSON-RPC stdio message. */
function networkSummary(direction: "rx" | "tx", raw: unknown): string {
    const msg = raw as Record<string, unknown>;
    const arrow = direction === "rx" ? "←" : "→";
    const id = msg["id"] !== undefined ? ` [#${msg["id"]}]` : "";

    if (direction === "rx") {
        const method = String(msg["method"] ?? "?");
        const params = msg["params"] as Record<string, unknown> | undefined;
        const toolName = (params?.["name"] as string | undefined) ?? "";
        return `${arrow}${id} ${method}${toolName ? `  ${toolName}` : ""}`;
    } else {
        if (msg["error"]) {
            const err = msg["error"] as Record<string, unknown>;
            return `${arrow}${id} error  code=${err["code"]}  ${err["message"]}`;
        }
        if (msg["result"] !== undefined) {
            const result = msg["result"] as Record<string, unknown> | null;
            if (result === null) return `${arrow}${id} result  (null — notification ack)`;
            const content = result["content"] as unknown[] | undefined;
            const extra = content !== undefined
                ? `${content.length} content item${content.length !== 1 ? "s" : ""}`
                : "ok";
            return `${arrow}${id} result  (${extra})`;
        }
        return `${arrow}${id} ${String(msg["method"] ?? "?")}`;
    }
}

/** Reduce oversized JSON-RPC payloads before logging (e.g. tools/list with many entries). */
function slimRaw(direction: "rx" | "tx", raw: unknown): unknown {
    const msg = raw as Record<string, unknown>;
    const result = msg["result"] as Record<string, unknown> | undefined;
    if (direction === "tx" && result) {
        // tools/list response — replace tool array with a count
        if (Array.isArray(result["tools"])) {
            const count = (result["tools"] as unknown[]).length;
            return { ...msg, result: { ...result, tools: `[${count} tool definitions — omitted]` } };
        }
        // tools/call response — trim content text to avoid re-logging what the tool entry already has
        if (Array.isArray(result["content"])) {
            const slim = (result["content"] as Array<{ type?: string; text?: string }>).map((c) =>
                c.type === "text" ? { type: c.type, chars: c.text?.length ?? 0, preview: (c.text ?? "").slice(0, 120) } : c
            );
            return { ...msg, result: { ...result, content: slim } };
        }
    }
    return raw;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Patches globalThis.fetch to log every HTTP request the MCP server makes to Keycloak.
 * Passwords and access tokens in logs are automatically redacted.
 * Call this once at startup, before any tool is invoked.
 */
export function enableHttpLogging(): void {
    if (!logFile && !logToStderr) return;
    if (!logLevels.has("http")) return;

    process.stderr.write("[keycloak-mcp] HTTP logging enabled\n");

    const originalFetch = globalThis.fetch;

    globalThis.fetch = async function (
        input: RequestInfo | URL,
        init?: RequestInit
    ): Promise<Response> {
        const start = Date.now();
        const ts = new Date().toISOString();
        const method = (init?.method ?? "GET").toUpperCase();
        const url = typeof input === "string"
            ? input
            : input instanceof URL
                ? input.toString()
                : (input as Request).url;

        // Redact Authorization header (keep token type only).
        const headers = { ...(init?.headers as Record<string, string> | undefined ?? {}) };
        for (const key of Object.keys(headers)) {
            if (key.toLowerCase() === "authorization") {
                headers[key] = String(headers[key]).replace(/(Bearer\s+)\S+/, "$1[REDACTED]");
            }
        }

        // Redact password from token endpoint request body.
        let requestBody: unknown = undefined;
        if (init?.body) {
            requestBody = String(init.body).replace(/password=[^&]+/, "password=[REDACTED]");
        }

        let response: Response;
        try {
            response = await originalFetch(input, init);
        } catch (err) {
            const durationMs = Date.now() - start;
            writeEntry({
                ts,
                level: "http",
                summary: `${method} ${url} → NETWORK ERROR [${durationMs}ms]`,
                method,
                url,
                requestHeaders: headers,
                requestBody,
                error: err instanceof Error ? err.message : String(err),
                durationMs,
            });
            throw err;
        }

        const durationMs = Date.now() - start;
        const cloned = response.clone();
        let responseBody: unknown = undefined;
        try {
            const text = await cloned.text();
            try { responseBody = JSON.parse(text); } catch { responseBody = text || undefined; }
        } catch { /* ignore */ }

        // Redact tokens from token endpoint responses.
        if (responseBody && typeof responseBody === "object") {
            const rb = responseBody as Record<string, unknown>;
            if (rb["access_token"]) rb["access_token"] = "[REDACTED]";
            if (rb["refresh_token"]) rb["refresh_token"] = "[REDACTED]";
        }

        writeEntry({
            ts,
            level: "http",
            summary: httpSummary(method, url, response.status, durationMs),
            method,
            url,
            requestHeaders: headers,
            requestBody,
            status: response.status,
            statusText: response.statusText,
            responseBody,
            durationMs,
        });

        return response;
    };
}

/**
 * Intercepts raw stdin/stdout to log all JSON-RPC messages at the protocol level.
 * Call this BEFORE creating the StdioServerTransport (i.e. before server.connect).
 *
 * rx = messages from VS Code / AI model arriving on stdin
 * tx = messages the server sends back on stdout
 */
export function enableNetworkLogging(): void {
    if (!logFile && !logToStderr) return;
    if (!logLevels.has("network")) return;

    process.stderr.write(`[keycloak-mcp] Network (stdio) logging enabled\n`);

    // ── Outgoing: server → client (stdout) ───────────────────────────────────
    // The MCP SDK writes one complete JSON-RPC object per write() call,
    // terminated with \n. We intercept each write, parse and log it.
    const origWrite = process.stdout.write.bind(process.stdout) as typeof process.stdout.write;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.stdout as any).write = function (
        chunk: string | Buffer | Uint8Array,
        encodingOrCb?: unknown,
        cb?: unknown
    ): boolean {
        const text = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
        for (const line of text.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            let raw: unknown;
            try { raw = JSON.parse(trimmed); } catch { raw = trimmed; }
            writeEntry({
                ts: new Date().toISOString(),
                level: "network",
                summary: networkSummary("tx", raw),
                direction: "tx",
                raw: slimRaw("tx", raw),
            });
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (origWrite as any)(chunk, encodingOrCb, cb);
    };

    // ── Incoming: client → server (stdin) ────────────────────────────────────
    // Data may arrive in multiple chunks, so we buffer and split on newlines.
    let rxBuf = "";
    const origEmit = process.stdin.emit.bind(process.stdin);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.stdin as any).emit = function (event: string, ...args: unknown[]): boolean {
        if (event === "data") {
            const chunk = args[0];
            rxBuf += Buffer.isBuffer(chunk) ? (chunk as Buffer).toString("utf8") : String(chunk);
            const parts = rxBuf.split("\n");
            rxBuf = parts.pop() ?? "";
            for (const line of parts) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                let raw: unknown;
                try { raw = JSON.parse(trimmed); } catch { raw = trimmed; }
                writeEntry({
                    ts: new Date().toISOString(),
                    level: "network",
                    summary: networkSummary("rx", raw),
                    direction: "rx",
                    raw: slimRaw("rx", raw),
                });
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (origEmit as any)(event, ...args);
    };
}

/**
 * Patches server.registerTool so every tool invocation is automatically logged.
 * Call this once, before registering any tools.
 */
export function enableLogging(server: McpServer): void {
    if (!logFile && !logToStderr) return; // nothing to do
    if (!logLevels.has("tool")) return;

    const destination = logFile ?? "stderr";
    process.stderr.write(`[keycloak-mcp] Tool logging enabled → ${destination}\n`);

    const original = server.registerTool.bind(server);

    (server as unknown as Record<string, unknown>)["registerTool"] = function (
        name: string,
        config: unknown,
        handler: (args: unknown) => Promise<unknown>
    ) {
        const wrappedHandler = async (args: unknown): Promise<unknown> => {
            const start = Date.now();
            const ts = new Date().toISOString();
            try {
                const result = await handler(args);
                const durationMs = Date.now() - start;
                // Unwrap the MCP content envelope so we log the actual data, not the SDK wrapper.
                let parsedResult: unknown = result;
                try {
                    const content = (result as { content?: { text?: string }[] })?.content;
                    if (content?.[0]?.text) {
                        parsedResult = JSON.parse(content[0].text);
                    }
                } catch { /* keep raw */ }
                writeEntry({
                    ts,
                    level: "tool",
                    summary: toolSummary(name, args, parsedResult, durationMs),
                    tool: name,
                    input: args,
                    result: parsedResult,
                    durationMs,
                });
                return result;
            } catch (err) {
                const durationMs = Date.now() - start;
                const message = err instanceof Error ? err.message : String(err);
                writeEntry({
                    ts,
                    level: "tool",
                    summary: `${name}() → ERROR: ${message} [${durationMs}ms]`,
                    tool: name,
                    input: args,
                    error: message,
                    durationMs,
                });
                throw err;
            }
        };
        return original(name as never, config as never, wrappedHandler as never);
    };
}
