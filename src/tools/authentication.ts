import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { authentication } from "../client.js";

export function registerAuthenticationTools(server: McpServer): void {

    // ── Authentication Flows ───────────────────────────────────────────────────

    server.registerTool(
        "keycloak_list_auth_flows",
        {
            title: "List Authentication Flows",
            description: "List all authentication flows in a realm. Flows define the sequence of steps users go through during login, registration, or password reset.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm }) => {
            const flows = await authentication.listFlows(realm);
            const summary = flows.map((f) => ({
                id: f.id,
                alias: f.alias,
                description: f.description,
                providerId: f.providerId,
                topLevel: f.topLevel,
                builtIn: f.builtIn,
            }));
            return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_get_auth_flow",
        {
            title: "Get Authentication Flow",
            description: "Get full details of an authentication flow including all its execution steps.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                flow_id: z.string().describe("Authentication flow UUID"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, flow_id }) => {
            const flow = await authentication.getFlow(realm, flow_id);
            return { content: [{ type: "text", text: JSON.stringify(flow, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_copy_auth_flow",
        {
            title: "Copy Authentication Flow",
            description: "Create a copy of an existing authentication flow under a new alias. Use this to customize built-in flows (which cannot be edited directly).",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                flow_alias: z.string().describe("Alias of the flow to copy (e.g. 'browser', 'direct grant')"),
                new_alias: z.string().describe("Alias for the new copy"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, flow_alias, new_alias }) => {
            await authentication.copyFlow(realm, flow_alias, new_alias);
            return { content: [{ type: "text", text: `Authentication flow '${flow_alias}' copied to '${new_alias}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_delete_auth_flow",
        {
            title: "Delete Authentication Flow",
            description: "Delete a custom authentication flow. Built-in flows cannot be deleted.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                flow_id: z.string().describe("Authentication flow UUID to delete"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, flow_id }) => {
            await authentication.deleteFlow(realm, flow_id);
            return { content: [{ type: "text", text: `Authentication flow '${flow_id}' deleted.` }] };
        }
    );

    // ── Required Actions ───────────────────────────────────────────────────────

    server.registerTool(
        "keycloak_list_required_actions",
        {
            title: "List Required Actions",
            description: "List all required actions configured in a realm. Required actions are tasks users must complete after login (e.g. update password, verify email, configure OTP).",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm }) => {
            const actions = await authentication.listRequiredActions(realm);
            return { content: [{ type: "text", text: JSON.stringify(actions, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_get_required_action",
        {
            title: "Get Required Action",
            description: "Get details of a specific required action by its alias.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                alias: z.string().describe("Required action alias (e.g. 'VERIFY_EMAIL', 'UPDATE_PASSWORD', 'CONFIGURE_TOTP', 'terms_and_conditions')"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, alias }) => {
            const action = await authentication.getRequiredAction(realm, alias);
            return { content: [{ type: "text", text: JSON.stringify(action, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_update_required_action",
        {
            title: "Update Required Action",
            description: "Update a required action's settings — enable/disable it or set it as the default for new users.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                alias: z.string().describe("Required action alias (e.g. 'VERIFY_EMAIL', 'UPDATE_PASSWORD', 'CONFIGURE_TOTP')"),
                enabled: z.boolean().optional().describe("Enable or disable this required action"),
                defaultAction: z.boolean().optional().describe("If true, new users will have this action applied on first login"),
                priority: z.number().int().optional().describe("Execution priority (lower number = earlier)"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, alias, enabled, defaultAction, priority }) => {
            const update = Object.fromEntries(
                Object.entries({ enabled, defaultAction, priority }).filter(([, v]) => v !== undefined)
            );
            await authentication.updateRequiredAction(realm, alias, update);
            return { content: [{ type: "text", text: `Required action '${alias}' updated.` }] };
        }
    );

    server.registerTool(
        "keycloak_delete_required_action",
        {
            title: "Delete Required Action",
            description: "Remove a required action provider from the realm. Only non-built-in required actions can be deleted.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                alias: z.string().describe("Required action alias to delete"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, alias }) => {
            await authentication.deleteRequiredAction(realm, alias);
            return { content: [{ type: "text", text: `Required action '${alias}' deleted from realm '${realm}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_list_unregistered_required_actions",
        {
            title: "List Unregistered Required Actions",
            description: "List required action providers that are available to register in the realm but have not been added yet.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm }) => {
            const actions = await authentication.listUnregisteredRequiredActions(realm);
            return { content: [{ type: "text", text: JSON.stringify(actions, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_register_required_action",
        {
            title: "Register Required Action",
            description: "Register a new required action provider in the realm so it becomes available for configuration.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                providerId: z.string().describe("Required action provider ID (get from list_unregistered_required_actions)"),
                name: z.string().describe("Display name for this required action"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, providerId, name }) => {
            await authentication.registerRequiredAction(realm, { providerId, name });
            return { content: [{ type: "text", text: `Required action '${name}' (${providerId}) registered in realm '${realm}'.` }] };
        }
    );
}
