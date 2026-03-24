import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { realmRoles, clients } from "../client.js";

export function registerRoleTools(server: McpServer): void {

    // ── Realm Roles ───────────────────────────────────────────────────────────

    server.registerTool(
        "keycloak_list_roles",
        {
            title: "List Realm Roles",
            description: "List all realm-level roles in a Keycloak realm.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                search: z.string().optional().describe("Filter by role name (prefix match)"),
                max: z.number().int().positive().default(100).describe("Maximum results (default 100)"),
                first: z.number().int().nonnegative().default(0).describe("Pagination offset (default 0)"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, search, max, first }) => {
            const list = await realmRoles.list(realm, { search, max, first });
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_get_role",
        {
            title: "Get Realm Role",
            description: "Get details of a specific realm-level role by name.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                role_name: z.string().describe("Role name"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, role_name }) => {
            const role = await realmRoles.get(realm, role_name);
            return { content: [{ type: "text", text: JSON.stringify(role, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_create_role",
        {
            title: "Create Realm Role",
            description: "Create a new realm-level role.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                name: z.string().describe("Role name — unique within the realm"),
                description: z.string().optional().describe("Human-readable description"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, name, description }) => {
            await realmRoles.create(realm, { name, description });
            return { content: [{ type: "text", text: `Realm role '${name}' created in realm '${realm}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_update_role",
        {
            title: "Update Realm Role",
            description: "Update a realm role's name or description.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                role_name: z.string().describe("Current role name"),
                name: z.string().optional().describe("New role name"),
                description: z.string().optional().describe("New description"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, role_name, name, description }) => {
            const update = Object.fromEntries(
                Object.entries({ name, description }).filter(([, v]) => v !== undefined)
            );
            await realmRoles.update(realm, role_name, update);
            return { content: [{ type: "text", text: `Role '${role_name}' updated in realm '${realm}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_delete_role",
        {
            title: "Delete Realm Role",
            description: "Permanently delete a realm-level role.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                role_name: z.string().describe("Role name to delete"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, role_name }) => {
            await realmRoles.delete(realm, role_name);
            return { content: [{ type: "text", text: `Realm role '${role_name}' deleted from realm '${realm}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_get_role_users",
        {
            title: "Get Users with Realm Role",
            description: "List users that have a specific realm-level role assigned.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                role_name: z.string().describe("Role name"),
                max: z.number().int().positive().default(50).describe("Maximum results (default 50)"),
                first: z.number().int().nonnegative().default(0).describe("Pagination offset (default 0)"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, role_name, max, first }) => {
            const list = await realmRoles.users(realm, role_name, { max, first });
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    // ── Client Roles ──────────────────────────────────────────────────────────

    server.registerTool(
        "keycloak_list_client_roles",
        {
            title: "List Client Roles",
            description: "List all roles defined on a specific client. Use keycloak_list_clients to find the client's internal UUID.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                client_uuid: z.string().describe("Client internal UUID (not clientId — use keycloak_list_clients to find it)"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, client_uuid }) => {
            const list = await clients.listRoles(realm, client_uuid);
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_get_client_role",
        {
            title: "Get Client Role",
            description: "Get details of a specific role on a client.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                client_uuid: z.string().describe("Client internal UUID"),
                role_name: z.string().describe("Role name"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, client_uuid, role_name }) => {
            const role = await clients.getRole(realm, client_uuid, role_name);
            return { content: [{ type: "text", text: JSON.stringify(role, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_create_client_role",
        {
            title: "Create Client Role",
            description: "Create a new role on a specific client.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                client_uuid: z.string().describe("Client internal UUID"),
                name: z.string().describe("Role name — unique within the client"),
                description: z.string().optional().describe("Human-readable description"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, client_uuid, name, description }) => {
            await clients.createRole(realm, client_uuid, { name, description });
            return { content: [{ type: "text", text: `Client role '${name}' created on client '${client_uuid}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_update_client_role",
        {
            title: "Update Client Role",
            description: "Update a client role's name or description.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                client_uuid: z.string().describe("Client internal UUID"),
                role_name: z.string().describe("Current role name"),
                name: z.string().optional().describe("New role name"),
                description: z.string().optional().describe("New description"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, client_uuid, role_name, name, description }) => {
            const update = Object.fromEntries(
                Object.entries({ name, description }).filter(([, v]) => v !== undefined)
            );
            await clients.updateRole(realm, client_uuid, role_name, update);
            return { content: [{ type: "text", text: `Client role '${role_name}' updated.` }] };
        }
    );

    server.registerTool(
        "keycloak_delete_client_role",
        {
            title: "Delete Client Role",
            description: "Permanently delete a role from a client.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                client_uuid: z.string().describe("Client internal UUID"),
                role_name: z.string().describe("Role name to delete"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, client_uuid, role_name }) => {
            await clients.deleteRole(realm, client_uuid, role_name);
            return { content: [{ type: "text", text: `Client role '${role_name}' deleted from client '${client_uuid}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_get_role_composites",
        {
            title: "Get Role Composites",
            description: "List the child (composite) roles that are included in a realm role. Composite roles aggregate permissions from multiple roles.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                role_name: z.string().describe("Realm role name"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, role_name }) => {
            const list = await realmRoles.listComposites(realm, role_name);
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_add_role_composites",
        {
            title: "Add Role Composites",
            description: "Add child roles to a realm role, making it a composite role that includes all the child roles' permissions. Each role must include both 'id' and 'name'.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                role_name: z.string().describe("Realm role name to add composites to"),
                roles: z.array(z.object({
                    id: z.string().describe("Child role UUID"),
                    name: z.string().describe("Child role name"),
                })).describe("Child roles to add"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, role_name, roles }) => {
            await realmRoles.addComposites(realm, role_name, roles);
            return { content: [{ type: "text", text: `Composite roles [${roles.map((r) => r.name).join(", ")}] added to role '${role_name}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_remove_role_composites",
        {
            title: "Remove Role Composites",
            description: "Remove child roles from a composite realm role. Each role must include both 'id' and 'name'.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                role_name: z.string().describe("Realm role name to remove composites from"),
                roles: z.array(z.object({
                    id: z.string().describe("Child role UUID"),
                    name: z.string().describe("Child role name"),
                })).describe("Child roles to remove"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, role_name, roles }) => {
            await realmRoles.removeComposites(realm, role_name, roles);
            return { content: [{ type: "text", text: `Composite roles [${roles.map((r) => r.name).join(", ")}] removed from role '${role_name}'.` }] };
        }
    );
}
