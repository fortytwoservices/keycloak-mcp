import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { identityProviders } from "../client.js";

export function registerIdentityProviderTools(server: McpServer): void {

    server.registerTool(
        "keycloak_list_identity_providers",
        {
            title: "List Identity Providers",
            description: "List all identity providers (social/enterprise federation) configured in a realm.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm }) => {
            const list = await identityProviders.list(realm);
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_get_identity_provider",
        {
            title: "Get Identity Provider",
            description: "Get the full configuration of a specific identity provider by its alias.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                alias: z.string().describe("Identity provider alias (e.g. 'google', 'github', 'saml-idp')"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, alias }) => {
            const idp = await identityProviders.get(realm, alias);
            return { content: [{ type: "text", text: JSON.stringify(idp, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_create_identity_provider",
        {
            title: "Create Identity Provider",
            description: "Add a new identity provider to a realm. Use providerId to specify the type: 'google', 'github', 'facebook', 'microsoft', 'oidc', 'saml', etc.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                alias: z.string().describe("Unique alias for this IDP (used in redirect URIs)"),
                providerId: z.string().describe("Provider type: 'google', 'github', 'facebook', 'microsoft', 'oidc', 'saml', 'keycloak-oidc', etc."),
                displayName: z.string().optional().describe("Human-readable name shown on login page"),
                enabled: z.boolean().default(true).describe("Enable the identity provider"),
                trustEmail: z.boolean().optional().describe("Trust email provided by the IDP (skip verification)"),
                storeToken: z.boolean().optional().describe("Store the IDP token after login"),
                config: z.record(z.string()).optional().describe("Provider-specific config (clientId, clientSecret, authorizationUrl, etc.)"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, alias, providerId, displayName, enabled, trustEmail, storeToken, config }) => {
            const rep = Object.fromEntries(
                Object.entries({ alias, providerId, displayName, enabled, trustEmail, storeToken, config })
                    .filter(([, v]) => v !== undefined)
            );
            await identityProviders.create(realm, rep);
            return { content: [{ type: "text", text: `Identity provider '${alias}' created in realm '${realm}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_update_identity_provider",
        {
            title: "Update Identity Provider",
            description: "Update an existing identity provider's configuration.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                alias: z.string().describe("Identity provider alias"),
                displayName: z.string().optional().describe("New display name"),
                enabled: z.boolean().optional().describe("Enable or disable the IDP"),
                trustEmail: z.boolean().optional().describe("Trust email from IDP"),
                storeToken: z.boolean().optional().describe("Store IDP token"),
                config: z.record(z.string()).optional().describe("Provider-specific config fields to update"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, alias, displayName, enabled, trustEmail, storeToken, config }) => {
            const update = Object.fromEntries(
                Object.entries({ displayName, enabled, trustEmail, storeToken, config })
                    .filter(([, v]) => v !== undefined)
            );
            await identityProviders.update(realm, alias, update);
            return { content: [{ type: "text", text: `Identity provider '${alias}' updated.` }] };
        }
    );

    server.registerTool(
        "keycloak_delete_identity_provider",
        {
            title: "Delete Identity Provider",
            description: "Remove an identity provider from a realm. Users who signed up via this IDP will retain their accounts but can no longer use this login method.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                alias: z.string().describe("Identity provider alias to delete"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, alias }) => {
            await identityProviders.delete(realm, alias);
            return { content: [{ type: "text", text: `Identity provider '${alias}' deleted from realm '${realm}'.` }] };
        }
    );

    // ── IDP Mappers ────────────────────────────────────────────────────────────

    server.registerTool(
        "keycloak_list_idp_mappers",
        {
            title: "List Identity Provider Mappers",
            description: "List all attribute/role mappers configured for an identity provider. Mappers translate IDP attributes to Keycloak user attributes or roles.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                alias: z.string().describe("Identity provider alias"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, alias }) => {
            const mappers = await identityProviders.listMappers(realm, alias);
            return { content: [{ type: "text", text: JSON.stringify(mappers, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_get_idp_mapper",
        {
            title: "Get Identity Provider Mapper",
            description: "Get details of a specific identity provider mapper by its ID.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                alias: z.string().describe("Identity provider alias"),
                mapper_id: z.string().describe("Mapper UUID"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, alias, mapper_id }) => {
            const mapper = await identityProviders.getMapper(realm, alias, mapper_id);
            return { content: [{ type: "text", text: JSON.stringify(mapper, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_create_idp_mapper",
        {
            title: "Create Identity Provider Mapper",
            description: "Create a mapper for an identity provider. Common mapper types: 'oidc-user-attribute-idp-mapper', 'oidc-role-idp-mapper', 'hardcoded-role-idp-mapper', 'hardcoded-attribute-idp-mapper'.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                alias: z.string().describe("Identity provider alias"),
                name: z.string().describe("Mapper name"),
                identityProviderMapper: z.string().describe("Mapper type (e.g. 'oidc-user-attribute-idp-mapper', 'hardcoded-role-idp-mapper')"),
                config: z.record(z.string()).optional().describe("Mapper config (e.g. { attribute: 'email', user.attribute: 'email' })"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, alias, name, identityProviderMapper, config }) => {
            const mapper = await identityProviders.createMapper(realm, alias, {
                name,
                identityProviderAlias: alias,
                identityProviderMapper,
                config,
            });
            return { content: [{ type: "text", text: `IDP mapper '${name}' created. ID: ${mapper.id ?? "unknown"}` }] };
        }
    );

    server.registerTool(
        "keycloak_update_idp_mapper",
        {
            title: "Update Identity Provider Mapper",
            description: "Update an existing identity provider mapper's configuration.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                alias: z.string().describe("Identity provider alias"),
                mapper_id: z.string().describe("Mapper UUID"),
                name: z.string().optional().describe("New mapper name"),
                identityProviderMapper: z.string().optional().describe("Mapper type"),
                config: z.record(z.string()).optional().describe("Updated mapper config"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, alias, mapper_id, name, identityProviderMapper, config }) => {
            const update = Object.fromEntries(
                Object.entries({ name, identityProviderMapper, config }).filter(([, v]) => v !== undefined)
            );
            await identityProviders.updateMapper(realm, alias, mapper_id, update);
            return { content: [{ type: "text", text: `IDP mapper '${mapper_id}' updated.` }] };
        }
    );

    server.registerTool(
        "keycloak_delete_idp_mapper",
        {
            title: "Delete Identity Provider Mapper",
            description: "Delete an identity provider mapper.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                alias: z.string().describe("Identity provider alias"),
                mapper_id: z.string().describe("Mapper UUID to delete"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, alias, mapper_id }) => {
            await identityProviders.deleteMapper(realm, alias, mapper_id);
            return { content: [{ type: "text", text: `IDP mapper '${mapper_id}' deleted.` }] };
        }
    );
}
