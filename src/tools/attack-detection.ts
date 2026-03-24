import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { attackDetection } from "../client.js";

export function registerAttackDetectionTools(server: McpServer): void {

    server.registerTool(
        "keycloak_get_brute_force_status",
        {
            title: "Get Brute Force Status",
            description: "Get the brute force lockout status for a specific user. Returns whether the account is temporarily locked, number of failures, last failure time, etc.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, user_id }) => {
            const status = await attackDetection.getStatus(realm, user_id);
            return { content: [{ type: "text", text: JSON.stringify(status, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_clear_brute_force_user",
        {
            title: "Clear Brute Force for User",
            description: "Clear the brute force lockout status for a specific user, allowing them to attempt login again immediately.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID to unlock"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, user_id }) => {
            await attackDetection.clearUser(realm, user_id);
            return { content: [{ type: "text", text: `Brute force lockout cleared for user '${user_id}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_clear_brute_force_realm",
        {
            title: "Clear Brute Force for All Users",
            description: "Clear brute force lockout counters for ALL users in a realm. Use when you need to bulk-reset lockouts after an incident or maintenance.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm }) => {
            await attackDetection.clearAll(realm);
            return { content: [{ type: "text", text: `Brute force lockout cleared for all users in realm '${realm}'.` }] };
        }
    );
}
