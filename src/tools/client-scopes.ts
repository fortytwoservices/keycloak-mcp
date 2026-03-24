import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { clientScopes } from "../client.js";

export function registerClientScopeTools(server: McpServer): void {

    server.registerTool(
        "keycloak_list_client_scopes",
        {
            title: "List Client Scopes",
            description: "List all client scopes defined in a realm. Client scopes define sets of claims/roles that can be included in tokens.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm }) => {
            const list = await clientScopes.list(realm);
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_get_client_scope",
        {
            title: "Get Client Scope",
            description: "Get full details of a client scope by its UUID.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                scope_id: z.string().describe("Client scope UUID"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, scope_id }) => {
            const scope = await clientScopes.get(realm, scope_id);
            return { content: [{ type: "text", text: JSON.stringify(scope, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_create_client_scope",
        {
            title: "Create Client Scope",
            description: "Create a new client scope in a realm.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                name: z.string().describe("Scope name (e.g. 'read:orders')"),
                description: z.string().optional().describe("Human-readable description"),
                protocol: z.enum(["openid-connect", "saml"]).default("openid-connect").describe("Protocol"),
                attributes: z.record(z.string()).optional().describe("Scope attributes (e.g. { 'include.in.token.scope': 'true' })"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, name, description, protocol, attributes }) => {
            const rep = Object.fromEntries(
                Object.entries({ name, description, protocol, attributes }).filter(([, v]) => v !== undefined)
            );
            await clientScopes.create(realm, rep);
            return { content: [{ type: "text", text: `Client scope '${name}' created in realm '${realm}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_update_client_scope",
        {
            title: "Update Client Scope",
            description: "Update an existing client scope.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                scope_id: z.string().describe("Client scope UUID"),
                name: z.string().optional().describe("New name"),
                description: z.string().optional().describe("New description"),
                attributes: z.record(z.string()).optional().describe("Attributes to update"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, scope_id, name, description, attributes }) => {
            const update = Object.fromEntries(
                Object.entries({ name, description, attributes }).filter(([, v]) => v !== undefined)
            );
            await clientScopes.update(realm, scope_id, update);
            return { content: [{ type: "text", text: `Client scope '${scope_id}' updated.` }] };
        }
    );

    server.registerTool(
        "keycloak_delete_client_scope",
        {
            title: "Delete Client Scope",
            description: "Delete a client scope from a realm. The scope must not be assigned as default or optional to any client before deleting.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                scope_id: z.string().describe("Client scope UUID to delete"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, scope_id }) => {
            await clientScopes.delete(realm, scope_id);
            return { content: [{ type: "text", text: `Client scope '${scope_id}' deleted.` }] };
        }
    );

    // ── Default client scopes ──────────────────────────────────────────────────

    server.registerTool(
        "keycloak_list_default_client_scopes",
        {
            title: "List Default Client Scopes",
            description: "List client scopes that are added by default to all newly-created clients in a realm.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm }) => {
            const list = await clientScopes.listDefault(realm);
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_add_default_client_scope",
        {
            title: "Add Default Client Scope",
            description: "Add a client scope to the realm's default list (automatically assigned to all new clients).",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                scope_id: z.string().describe("Client scope UUID to add as default"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, scope_id }) => {
            await clientScopes.addDefault(realm, scope_id);
            return { content: [{ type: "text", text: `Client scope '${scope_id}' added to realm default scopes.` }] };
        }
    );

    server.registerTool(
        "keycloak_remove_default_client_scope",
        {
            title: "Remove Default Client Scope",
            description: "Remove a client scope from the realm's default list.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                scope_id: z.string().describe("Client scope UUID to remove from defaults"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, scope_id }) => {
            await clientScopes.removeDefault(realm, scope_id);
            return { content: [{ type: "text", text: `Client scope '${scope_id}' removed from realm default scopes.` }] };
        }
    );

    // ── Optional client scopes ─────────────────────────────────────────────────

    server.registerTool(
        "keycloak_list_optional_client_scopes",
        {
            title: "List Optional Client Scopes",
            description: "List client scopes that are available as optional scopes on all new clients in a realm (requestable via the 'scope' parameter).",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm }) => {
            const list = await clientScopes.listOptional(realm);
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_add_optional_client_scope",
        {
            title: "Add Optional Client Scope",
            description: "Add a client scope to the realm's optional list (requestable by clients via the scope parameter).",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                scope_id: z.string().describe("Client scope UUID to add as optional"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, scope_id }) => {
            await clientScopes.addOptional(realm, scope_id);
            return { content: [{ type: "text", text: `Client scope '${scope_id}' added to realm optional scopes.` }] };
        }
    );

    server.registerTool(
        "keycloak_remove_optional_client_scope",
        {
            title: "Remove Optional Client Scope",
            description: "Remove a client scope from the realm's optional list.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                scope_id: z.string().describe("Client scope UUID to remove from optional scopes"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, scope_id }) => {
            await clientScopes.removeOptional(realm, scope_id);
            return { content: [{ type: "text", text: `Client scope '${scope_id}' removed from realm optional scopes.` }] };
        }
    );
}
