import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { groups } from "../client.js";

export function registerGroupTools(server: McpServer): void {

    server.registerTool(
        "keycloak_list_groups",
        {
            title: "List Groups",
            description: "List top-level groups in a realm with optional name search and pagination.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                search: z.string().optional().describe("Filter by group name (prefix match)"),
                max: z.number().int().positive().default(100).describe("Maximum results (default 100)"),
                first: z.number().int().nonnegative().default(0).describe("Pagination offset (default 0)"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, search, max, first }) => {
            const list = await groups.list(realm, { search, max, first });
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_get_group",
        {
            title: "Get Group",
            description: "Get full details of a group by its UUID, including subgroups and attributes.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                group_id: z.string().describe("Group UUID"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, group_id }) => {
            const group = await groups.get(realm, group_id);
            return { content: [{ type: "text", text: JSON.stringify(group, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_create_group",
        {
            title: "Create Group",
            description: "Create a new top-level group in a realm.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                name: z.string().describe("Group name"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, name }) => {
            await groups.create(realm, { name });
            return { content: [{ type: "text", text: `Group '${name}' created in realm '${realm}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_create_subgroup",
        {
            title: "Create Subgroup",
            description: "Create a child group under an existing parent group.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                parent_group_id: z.string().describe("Parent group UUID"),
                name: z.string().describe("Subgroup name"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, parent_group_id, name }) => {
            await groups.createSubGroup(realm, parent_group_id, { name });
            return { content: [{ type: "text", text: `Subgroup '${name}' created under group '${parent_group_id}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_update_group",
        {
            title: "Update Group",
            description: "Rename a group or update its attributes.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                group_id: z.string().describe("Group UUID"),
                name: z.string().describe("New group name"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, group_id, name }) => {
            await groups.update(realm, group_id, { name });
            return { content: [{ type: "text", text: `Group '${group_id}' updated.` }] };
        }
    );

    server.registerTool(
        "keycloak_delete_group",
        {
            title: "Delete Group",
            description: "Permanently delete a group. Members are unaffected (not deleted).",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                group_id: z.string().describe("Group UUID"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, group_id }) => {
            await groups.delete(realm, group_id);
            return { content: [{ type: "text", text: `Group '${group_id}' deleted.` }] };
        }
    );

    server.registerTool(
        "keycloak_get_group_members",
        {
            title: "Get Group Members",
            description: "List users that belong to a group.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                group_id: z.string().describe("Group UUID"),
                max: z.number().int().positive().default(100).describe("Maximum members to return (default 100)"),
                first: z.number().int().nonnegative().default(0).describe("Pagination offset (default 0)"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, group_id, max, first }) => {
            const list = await groups.members(realm, group_id, { max, first });
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_get_group_roles",
        {
            title: "Get Group Realm Roles",
            description: "List the realm-level roles assigned to a group. All group members inherit these roles.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                group_id: z.string().describe("Group UUID"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, group_id }) => {
            const list = await groups.realmRoles(realm, group_id);
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_assign_realm_roles_to_group",
        {
            title: "Assign Realm Roles to Group",
            description: "Assign one or more realm-level roles to a group. All group members inherit the roles. Each role must include both 'id' and 'name'. Get role IDs from keycloak_list_roles.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                group_id: z.string().describe("Group UUID"),
                roles: z.array(z.object({
                    id: z.string().describe("Role UUID"),
                    name: z.string().describe("Role name"),
                })).describe("Roles to assign"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, group_id, roles }) => {
            await groups.addRealmRoles(realm, group_id, roles);
            return { content: [{ type: "text", text: `Roles [${roles.map((r) => r.name).join(", ")}] assigned to group '${group_id}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_remove_realm_roles_from_group",
        {
            title: "Remove Realm Roles from Group",
            description: "Remove one or more realm-level roles from a group. Each role must include both 'id' and 'name'.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                group_id: z.string().describe("Group UUID"),
                roles: z.array(z.object({
                    id: z.string().describe("Role UUID"),
                    name: z.string().describe("Role name"),
                })).describe("Roles to remove"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, group_id, roles }) => {
            await groups.removeRealmRoles(realm, group_id, roles);
            return { content: [{ type: "text", text: `Roles [${roles.map((r) => r.name).join(", ")}] removed from group '${group_id}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_get_group_client_roles",
        {
            title: "Get Group Client Roles",
            description: "List client-level roles assigned to a group for a specific client. All group members inherit these roles.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                group_id: z.string().describe("Group UUID"),
                client_uuid: z.string().describe("Client internal UUID"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, group_id, client_uuid }) => {
            const list = await groups.listClientRoleMappings(realm, group_id, client_uuid);
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_assign_client_roles_to_group",
        {
            title: "Assign Client Roles to Group",
            description: "Assign one or more client-level roles to a group. All group members inherit these roles. Each role must include both 'id' and 'name'.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                group_id: z.string().describe("Group UUID"),
                client_uuid: z.string().describe("Client internal UUID"),
                roles: z.array(z.object({
                    id: z.string().describe("Role UUID"),
                    name: z.string().describe("Role name"),
                })).describe("Roles to assign"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, group_id, client_uuid, roles }) => {
            await groups.addClientRoleMappings(realm, group_id, client_uuid, roles);
            return { content: [{ type: "text", text: `Client roles [${roles.map((r) => r.name).join(", ")}] assigned to group '${group_id}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_remove_client_roles_from_group",
        {
            title: "Remove Client Roles from Group",
            description: "Remove one or more client-level roles from a group. Each role must include both 'id' and 'name'.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                group_id: z.string().describe("Group UUID"),
                client_uuid: z.string().describe("Client internal UUID"),
                roles: z.array(z.object({
                    id: z.string().describe("Role UUID"),
                    name: z.string().describe("Role name"),
                })).describe("Roles to remove"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, group_id, client_uuid, roles }) => {
            await groups.removeClientRoleMappings(realm, group_id, client_uuid, roles);
            return { content: [{ type: "text", text: `Client roles [${roles.map((r) => r.name).join(", ")}] removed from group '${group_id}'.` }] };
        }
    );
}
