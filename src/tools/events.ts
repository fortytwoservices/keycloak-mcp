import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { events } from "../client.js";

export function registerEventTools(server: McpServer): void {

    server.registerTool(
        "keycloak_list_events",
        {
            title: "List User Events",
            description: "List user activity events (login, logout, register, failed login, etc.) from the realm event log. Events are retained per the realm's event settings.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                type: z.string().optional().describe("Filter by event type, e.g. LOGIN, LOGIN_ERROR, LOGOUT, REGISTER, UPDATE_PASSWORD, UPDATE_PROFILE"),
                client: z.string().optional().describe("Filter by clientId string"),
                user: z.string().optional().describe("Filter by user UUID"),
                ipAddress: z.string().optional().describe("Filter by IP address"),
                dateFrom: z.string().optional().describe("Start date filter (ISO 8601, e.g. 2024-01-01)"),
                dateTo: z.string().optional().describe("End date filter (ISO 8601, e.g. 2024-12-31)"),
                max: z.number().int().positive().default(50).describe("Maximum results (default 50)"),
                first: z.number().int().nonnegative().default(0).describe("Pagination offset (default 0)"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, type, client, user, ipAddress, dateFrom, dateTo, max, first }) => {
            const list = await events.list(realm, { type, client, user, ipAddress, dateFrom, dateTo, max, first });
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_list_admin_events",
        {
            title: "List Admin Events",
            description: "List admin audit events (realm configuration changes made via the Admin API or console). Useful for auditing who changed what and when.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                operationTypes: z.string().optional().describe("Filter by operation type: CREATE, UPDATE, DELETE, ACTION"),
                resourceTypes: z.string().optional().describe("Filter by resource type, e.g. USER, GROUP, CLIENT, REALM, ROLE"),
                authRealm: z.string().optional().describe("Filter by the realm used to authenticate the admin"),
                authClient: z.string().optional().describe("Filter by the client used to authenticate the admin"),
                authUser: z.string().optional().describe("Filter by admin user ID"),
                resourcePath: z.string().optional().describe("Filter by resource path (e.g. users/abc-123)"),
                dateFrom: z.string().optional().describe("Start date filter (ISO 8601, e.g. 2024-01-01)"),
                dateTo: z.string().optional().describe("End date filter (ISO 8601, e.g. 2024-12-31)"),
                max: z.number().int().positive().default(50).describe("Maximum results (default 50)"),
                first: z.number().int().nonnegative().default(0).describe("Pagination offset (default 0)"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, operationTypes, resourceTypes, authRealm, authClient, authUser, resourcePath, dateFrom, dateTo, max, first }) => {
            const list = await events.adminList(realm, { operationTypes, resourceTypes, authRealm, authClient, authUser, resourcePath, dateFrom, dateTo, max, first });
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_delete_events",
        {
            title: "Clear User Events",
            description: "Delete all user events from the realm event log. This cannot be undone.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm }) => {
            await events.deleteAll(realm);
            return { content: [{ type: "text", text: `All user events cleared from realm '${realm}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_delete_admin_events",
        {
            title: "Clear Admin Events",
            description: "Delete all admin audit events from the realm. This cannot be undone.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm }) => {
            await events.deleteAdminAll(realm);
            return { content: [{ type: "text", text: `All admin events cleared from realm '${realm}'.` }] };
        }
    );
}
