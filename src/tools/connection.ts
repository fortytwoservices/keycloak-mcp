/**
 * keycloak_connect — runtime connection tool.
 *
 * Lets the user supply Keycloak URL, admin username and password directly
 * from the prompt, instead of having to pre-configure environment variables.
 *
 * Usage:
 *   "Connect to https://keycloak.example.com as admin"
 *   → AI calls keycloak_connect with the URL and credentials
 *   → All subsequent tool calls use those credentials until reconnected.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { setSessionConfig, clearSessionConfig, getConfig, hasSessionConfig } from "../config.js";
import { clearTokenCache, adminGet } from "../client.js";

export function registerConnectionTools(server: McpServer): void {

    server.registerTool(
        "keycloak_connect",
        {
            title: "Connect to Keycloak",
            description: "Set the Keycloak server URL, admin username and password for this session. Overrides any environment variables. The connection is verified immediately by listing realms.",
            inputSchema: z.object({
                url: z.string().describe("Base URL of the Keycloak instance, e.g. https://keycloak.example.com or http://localhost:8080"),
                username: z.string().describe("Admin username"),
                password: z.string().describe("Admin password"),
            }),
        },
        async ({ url, username, password }) => {
            setSessionConfig(url, username, password);
            clearTokenCache();
            try {
                // Verify by listing realms — fail fast if credentials are wrong.
                await adminGet<unknown[]>("realms");
                return {
                    content: [{
                        type: "text",
                        text: `Connected to ${url.replace(/\/$/, "")} as ${username}`,
                    }],
                };
            } catch (err) {
                clearSessionConfig();
                clearTokenCache();
                return {
                    content: [{
                        type: "text",
                        text: `Connection failed: ${err instanceof Error ? err.message : String(err)}`,
                    }],
                    isError: true,
                };
            }
        }
    );

    server.registerTool(
        "keycloak_connection_status",
        {
            title: "Connection Status",
            description: "Show the current Keycloak connection — server URL and username. Never reveals the password.",
            inputSchema: z.object({}),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
        },
        async ({ }) => {
            const config = getConfig();
            if (!config) {
                return {
                    content: [{
                        type: "text",
                        text: "Not connected. Use keycloak_connect to set credentials, or set KEYCLOAK_URL, KEYCLOAK_ADMIN, KEYCLOAK_ADMIN_PASSWORD environment variables.",
                    }],
                };
            }
            const source = hasSessionConfig() ? "keycloak_connect (session)" : "environment variables";
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({ url: config.url, username: config.user, source }, null, 2),
                }],
            };
        }
    );
}
