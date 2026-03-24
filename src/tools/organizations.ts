import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { organizations } from "../client.js";

export function registerOrganizationTools(server: McpServer): void {

    server.registerTool(
        "keycloak_list_organizations",
        {
            title: "List Organizations",
            description: "List all organizations in a realm. Organizations are a Keycloak 24+ feature for B2B tenant management, enabling enterprise federation and multi-tenant access control.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                search: z.string().optional().describe("Filter by organization name"),
                max: z.number().int().positive().default(100).describe("Maximum results (default 100)"),
                first: z.number().int().nonnegative().default(0).describe("Pagination offset (default 0)"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, search, max, first }) => {
            const list = await organizations.list(realm, { search, max, first });
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_get_organization",
        {
            title: "Get Organization",
            description: "Get full details of an organization by its UUID, including domains and settings.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                org_id: z.string().describe("Organization UUID"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, org_id }) => {
            const org = await organizations.get(realm, org_id);
            return { content: [{ type: "text", text: JSON.stringify(org, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_create_organization",
        {
            title: "Create Organization",
            description: "Create a new organization in a realm. Requires Keycloak 24+ with the Organizations feature enabled.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                name: z.string().describe("Organization name"),
                alias: z.string().optional().describe("URL-friendly alias (auto-derived from name if omitted)"),
                description: z.string().optional().describe("Description"),
                enabled: z.boolean().default(true).describe("Enable the organization"),
                domains: z.array(z.string()).optional().describe("Email domains belonging to this organization (e.g. ['acme.com'])"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, name, alias, description, enabled, domains }) => {
            const rep = Object.fromEntries(
                Object.entries({
                    name, alias, description, enabled,
                    domains: domains?.map((d) => ({ name: d, verified: false })),
                }).filter(([, v]) => v !== undefined)
            );
            await organizations.create(realm, rep);
            return { content: [{ type: "text", text: `Organization '${name}' created in realm '${realm}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_update_organization",
        {
            title: "Update Organization",
            description: "Update an organization's settings.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                org_id: z.string().describe("Organization UUID"),
                name: z.string().optional().describe("New name"),
                description: z.string().optional().describe("New description"),
                enabled: z.boolean().optional().describe("Enable or disable the organization"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, org_id, name, description, enabled }) => {
            const update = Object.fromEntries(
                Object.entries({ name, description, enabled }).filter(([, v]) => v !== undefined)
            );
            await organizations.update(realm, org_id, update);
            return { content: [{ type: "text", text: `Organization '${org_id}' updated.` }] };
        }
    );

    server.registerTool(
        "keycloak_delete_organization",
        {
            title: "Delete Organization",
            description: "Delete an organization from a realm. Members retain their user accounts but are removed from the organization.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                org_id: z.string().describe("Organization UUID to delete"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, org_id }) => {
            await organizations.delete(realm, org_id);
            return { content: [{ type: "text", text: `Organization '${org_id}' deleted from realm '${realm}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_list_organization_members",
        {
            title: "List Organization Members",
            description: "List all users who are members of an organization.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                org_id: z.string().describe("Organization UUID"),
                max: z.number().int().positive().default(100).describe("Maximum results (default 100)"),
                first: z.number().int().nonnegative().default(0).describe("Pagination offset (default 0)"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, org_id, max, first }) => {
            const members = await organizations.listMembers(realm, org_id, { max, first });
            return { content: [{ type: "text", text: JSON.stringify(members, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_add_organization_member",
        {
            title: "Add Organization Member",
            description: "Add an existing realm user to an organization.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                org_id: z.string().describe("Organization UUID"),
                user_id: z.string().describe("User UUID to add as member"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, org_id, user_id }) => {
            await organizations.addMember(realm, org_id, user_id);
            return { content: [{ type: "text", text: `User '${user_id}' added to organization '${org_id}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_remove_organization_member",
        {
            title: "Remove Organization Member",
            description: "Remove a user from an organization. The user's realm account is retained.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                org_id: z.string().describe("Organization UUID"),
                user_id: z.string().describe("User UUID to remove"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, org_id, user_id }) => {
            await organizations.removeMember(realm, org_id, user_id);
            return { content: [{ type: "text", text: `User '${user_id}' removed from organization '${org_id}'.` }] };
        }
    );
}
