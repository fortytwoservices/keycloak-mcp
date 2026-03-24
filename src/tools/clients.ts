import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { clients, sessions } from "../client.js";

export function registerClientTools(server: McpServer): void {

    server.registerTool(
        "keycloak_list_clients",
        {
            title: "List Clients",
            description: "List clients (applications) registered in a realm. Optionally filter by clientId string.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                client_id: z.string().optional().describe("Filter by clientId (prefix match)"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, client_id }) => {
            const list = await clients.list(realm, client_id);
            const summary = list.map((c) => ({
                id: c.id,
                clientId: c.clientId,
                name: c.name,
                enabled: c.enabled,
                protocol: c.protocol,
                publicClient: c.publicClient,
            }));
            return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_get_client",
        {
            title: "Get Client",
            description: "Get the full configuration of a client by its internal UUID (the 'id' field from keycloak_list_clients, not the clientId string).",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                client_uuid: z.string().describe("Client internal UUID (the 'id' field, not clientId)"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, client_uuid }) => {
            const client = await clients.get(realm, client_uuid);
            return { content: [{ type: "text", text: JSON.stringify(client, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_create_client",
        {
            title: "Create Client",
            description: "Register a new client (application) in a realm.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                clientId: z.string().describe("Client ID string — unique within the realm"),
                name: z.string().optional().describe("Display name"),
                description: z.string().optional().describe("Description"),
                enabled: z.boolean().default(true).describe("Enable the client"),
                publicClient: z.boolean().default(false).describe("Public client (no client secret)"),
                protocol: z.enum(["openid-connect", "saml"]).default("openid-connect").describe("Protocol"),
                redirectUris: z.array(z.string()).optional().describe("Allowed redirect URIs"),
                webOrigins: z.array(z.string()).optional().describe("Allowed CORS web origins"),
                serviceAccountsEnabled: z.boolean().optional().describe("Enable service account (client credentials flow)"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, clientId, name, description, enabled, publicClient, protocol, redirectUris, webOrigins, serviceAccountsEnabled }) => {
            const rep = Object.fromEntries(
                Object.entries({ clientId, name, description, enabled, publicClient, protocol, redirectUris, webOrigins, serviceAccountsEnabled })
                    .filter(([, v]) => v !== undefined)
            );
            await clients.create(realm, rep);
            return { content: [{ type: "text", text: `Client '${clientId}' created in realm '${realm}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_update_client",
        {
            title: "Update Client",
            description: "Update a client's settings. Only provided fields are changed.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                client_uuid: z.string().describe("Client internal UUID"),
                name: z.string().optional().describe("New display name"),
                description: z.string().optional().describe("New description"),
                enabled: z.boolean().optional().describe("Enable or disable the client"),
                redirectUris: z.array(z.string()).optional().describe("New list of allowed redirect URIs"),
                webOrigins: z.array(z.string()).optional().describe("New list of allowed CORS origins"),
                publicClient: z.boolean().optional().describe("Toggle public client mode"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, client_uuid, ...fields }) => {
            const update = Object.fromEntries(
                Object.entries(fields).filter(([, v]) => v !== undefined)
            );
            await clients.update(realm, client_uuid, update);
            return { content: [{ type: "text", text: `Client '${client_uuid}' updated.` }] };
        }
    );

    server.registerTool(
        "keycloak_delete_client",
        {
            title: "Delete Client",
            description: "Permanently delete a client from a realm.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                client_uuid: z.string().describe("Client internal UUID"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, client_uuid }) => {
            await clients.delete(realm, client_uuid);
            return { content: [{ type: "text", text: `Client '${client_uuid}' deleted from realm '${realm}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_get_client_secret",
        {
            title: "Get Client Secret",
            description: "Retrieve the current client secret for a confidential client.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                client_uuid: z.string().describe("Client internal UUID"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, client_uuid }) => {
            const secret = await clients.secret(realm, client_uuid);
            return { content: [{ type: "text", text: JSON.stringify(secret, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_regenerate_client_secret",
        {
            title: "Regenerate Client Secret",
            description: "Generate a new client secret for a confidential client. The old secret is immediately invalidated.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                client_uuid: z.string().describe("Client internal UUID"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, client_uuid }) => {
            const secret = await clients.regenerateSecret(realm, client_uuid);
            return { content: [{ type: "text", text: JSON.stringify(secret, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_get_session_stats",
        {
            title: "Get Session Stats",
            description: "Get active and offline session counts per client in a realm.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm }) => {
            const stats = await sessions.stats(realm);
            return { content: [{ type: "text", text: JSON.stringify(stats, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_get_client_sessions",
        {
            title: "Get Client User Sessions",
            description: "List active user sessions for a specific client.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                client_uuid: z.string().describe("Client internal UUID"),
                max: z.number().int().positive().default(50).describe("Maximum sessions to return (default 50)"),
                first: z.number().int().nonnegative().default(0).describe("Pagination offset (default 0)"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, client_uuid, max, first }) => {
            const list = await clients.userSessions(realm, client_uuid, { max, first });
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_get_client_offline_sessions",
        {
            title: "Get Client Offline Sessions",
            description: "List offline (refresh token) sessions for a specific client.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                client_uuid: z.string().describe("Client internal UUID"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, client_uuid }) => {
            const list = await clients.offlineSessions(realm, client_uuid);
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_logout_session",
        {
            title: "Logout Session",
            description: "Terminate (invalidate) a specific user session by its session ID.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                session_id: z.string().describe("Session UUID (from keycloak_get_client_sessions or keycloak_get_user_sessions)"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, session_id }) => {
            await sessions.logout(realm, session_id);
            return { content: [{ type: "text", text: `Session '${session_id}' terminated.` }] };
        }
    );

    server.registerTool(
        "keycloak_list_client_protocol_mappers",
        {
            title: "List Client Protocol Mappers",
            description: "List all protocol mappers configured for a client. Protocol mappers control how claims and attributes are added to tokens.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                client_uuid: z.string().describe("Client internal UUID"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, client_uuid }) => {
            const list = await clients.listProtocolMappers(realm, client_uuid);
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_get_client_protocol_mapper",
        {
            title: "Get Client Protocol Mapper",
            description: "Retrieve a specific protocol mapper configuration by its ID.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                client_uuid: z.string().describe("Client internal UUID"),
                mapper_id: z.string().describe("Protocol mapper UUID"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, client_uuid, mapper_id }) => {
            const mapper = await clients.getProtocolMapper(realm, client_uuid, mapper_id);
            return { content: [{ type: "text", text: JSON.stringify(mapper, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_create_client_protocol_mapper",
        {
            title: "Create Client Protocol Mapper",
            description: "Add a protocol mapper to a client to include custom claims in tokens (e.g. user attribute, hardcoded claim, group membership).",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                client_uuid: z.string().describe("Client internal UUID"),
                name: z.string().describe("Mapper name"),
                protocol: z.string().default("openid-connect").describe("Protocol (e.g. 'openid-connect')"),
                protocolMapper: z.string().describe("Mapper type (e.g. 'oidc-usermodel-attribute-mapper', 'oidc-hardcoded-claim-mapper')"),
                config: z.record(z.string()).optional().describe("Mapper configuration key-value pairs"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, client_uuid, name, protocol, protocolMapper, config }) => {
            const mapper = await clients.createProtocolMapper(realm, client_uuid, { name, protocol, protocolMapper, config });
            return { content: [{ type: "text", text: JSON.stringify(mapper, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_update_client_protocol_mapper",
        {
            title: "Update Client Protocol Mapper",
            description: "Update an existing protocol mapper configuration on a client.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                client_uuid: z.string().describe("Client internal UUID"),
                mapper_id: z.string().describe("Protocol mapper UUID"),
                name: z.string().optional().describe("New mapper name"),
                config: z.record(z.string()).optional().describe("Updated mapper configuration key-value pairs"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, client_uuid, mapper_id, name, config }) => {
            await clients.updateProtocolMapper(realm, client_uuid, mapper_id, { id: mapper_id, name, config });
            return { content: [{ type: "text", text: `Protocol mapper '${mapper_id}' updated on client '${client_uuid}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_delete_client_protocol_mapper",
        {
            title: "Delete Client Protocol Mapper",
            description: "Remove a protocol mapper from a client.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                client_uuid: z.string().describe("Client internal UUID"),
                mapper_id: z.string().describe("Protocol mapper UUID to delete"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, client_uuid, mapper_id }) => {
            await clients.deleteProtocolMapper(realm, client_uuid, mapper_id);
            return { content: [{ type: "text", text: `Protocol mapper '${mapper_id}' deleted from client '${client_uuid}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_get_service_account_user",
        {
            title: "Get Service Account User",
            description: "Get the service account user entity for a confidential client. Only available for clients with service accounts enabled.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                client_uuid: z.string().describe("Client internal UUID"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, client_uuid }) => {
            const user = await clients.serviceAccountUser(realm, client_uuid);
            return { content: [{ type: "text", text: JSON.stringify(user, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_list_client_scope_role_mappings",
        {
            title: "List Client Scope Role Mappings",
            description: "List realm roles included in a client's scope token. These roles appear in access tokens issued for this client.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                client_uuid: z.string().describe("Client internal UUID"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, client_uuid }) => {
            const list = await clients.listScopeRoleMappings(realm, client_uuid);
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_add_client_scope_role_mappings",
        {
            title: "Add Client Scope Role Mappings",
            description: "Add realm roles to a client's scope so they are included in access tokens. Each role must include both 'id' and 'name'.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                client_uuid: z.string().describe("Client internal UUID"),
                roles: z.array(z.object({
                    id: z.string().describe("Role UUID"),
                    name: z.string().describe("Role name"),
                })).describe("Realm roles to add to client scope"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, client_uuid, roles }) => {
            await clients.addScopeRoleMappings(realm, client_uuid, roles);
            return { content: [{ type: "text", text: `Scope roles [${roles.map((r) => r.name).join(", ")}] added to client '${client_uuid}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_remove_client_scope_role_mappings",
        {
            title: "Remove Client Scope Role Mappings",
            description: "Remove realm roles from a client's scope so they are no longer included in access tokens. Each role must include both 'id' and 'name'.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                client_uuid: z.string().describe("Client internal UUID"),
                roles: z.array(z.object({
                    id: z.string().describe("Role UUID"),
                    name: z.string().describe("Role name"),
                })).describe("Realm roles to remove from client scope"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, client_uuid, roles }) => {
            await clients.removeScopeRoleMappings(realm, client_uuid, roles);
            return { content: [{ type: "text", text: `Scope roles [${roles.map((r) => r.name).join(", ")}] removed from client '${client_uuid}'.` }] };
        }
    );
}
