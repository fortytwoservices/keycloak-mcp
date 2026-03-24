import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { realms } from "../client.js";

export function registerRealmTools(server: McpServer): void {

    server.registerTool(
        "keycloak_list_realms",
        {
            title: "List Realms",
            description: "List all Keycloak realms. Returns id, realm name, displayName and enabled status.",
            inputSchema: z.object({}),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ }) => {
            const list = await realms.list();
            const summary = list.map((r) => ({
                id: r.id,
                realm: r.realm,
                displayName: r.displayName,
                enabled: r.enabled,
            }));
            return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_get_realm",
        {
            title: "Get Realm",
            description: "Get the full configuration of a specific Keycloak realm.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name (e.g. 'master')"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm }) => {
            const rep = await realms.get(realm);
            return { content: [{ type: "text", text: JSON.stringify(rep, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_create_realm",
        {
            title: "Create Realm",
            description: "Create a new Keycloak realm.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name — unique identifier, no spaces (e.g. 'my-app')"),
                displayName: z.string().optional().describe("Human-readable display name"),
                enabled: z.boolean().default(true).describe("Whether the realm is active"),
                loginWithEmailAllowed: z.boolean().optional().describe("Allow login with email address"),
                registrationAllowed: z.boolean().optional().describe("Allow self-registration"),
                resetPasswordAllowed: z.boolean().optional().describe("Allow password reset via email"),
                rememberMe: z.boolean().optional().describe("Enable remember-me session extension"),
                bruteForceProtected: z.boolean().optional().describe("Enable brute force attack protection"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, displayName, enabled, loginWithEmailAllowed, registrationAllowed, resetPasswordAllowed, rememberMe, bruteForceProtected }) => {
            const rep = Object.fromEntries(
                Object.entries({ realm, displayName, enabled, loginWithEmailAllowed, registrationAllowed, resetPasswordAllowed, rememberMe, bruteForceProtected })
                    .filter(([, v]) => v !== undefined)
            );
            await realms.create(rep);
            return { content: [{ type: "text", text: `Realm '${realm}' created successfully.` }] };
        }
    );

    server.registerTool(
        "keycloak_update_realm",
        {
            title: "Update Realm",
            description: "Update realm settings. Only provided fields are changed.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name to update"),
                displayName: z.string().optional().describe("New display name"),
                enabled: z.boolean().optional().describe("Enable or disable the realm"),
                loginWithEmailAllowed: z.boolean().optional().describe("Allow login with email"),
                registrationAllowed: z.boolean().optional().describe("Allow self-registration"),
                resetPasswordAllowed: z.boolean().optional().describe("Allow password reset"),
                rememberMe: z.boolean().optional().describe("Enable remember-me"),
                bruteForceProtected: z.boolean().optional().describe("Enable brute force protection"),
                accessTokenLifespan: z.number().int().optional().describe("Access token lifespan in seconds"),
                ssoSessionIdleTimeout: z.number().int().optional().describe("SSO session idle timeout in seconds"),
                ssoSessionMaxLifespan: z.number().int().optional().describe("SSO session max lifespan in seconds"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, ...fields }) => {
            const update = Object.fromEntries(
                Object.entries(fields).filter(([, v]) => v !== undefined)
            );
            await realms.update(realm, update);
            return { content: [{ type: "text", text: `Realm '${realm}' updated.` }] };
        }
    );

    server.registerTool(
        "keycloak_delete_realm",
        {
            title: "Delete Realm",
            description: "Permanently delete a Keycloak realm and all its users, groups, clients and data. This cannot be undone.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name to delete"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm }) => {
            await realms.delete(realm);
            return { content: [{ type: "text", text: `Realm '${realm}' permanently deleted.` }] };
        }
    );

    server.registerTool(
        "keycloak_clear_user_cache",
        {
            title: "Clear User Cache",
            description: "Clear the user cache for a realm, forcing objects to be re-fetched from the database on next access.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm }) => {
            await realms.clearUserCache(realm);
            return { content: [{ type: "text", text: `User cache cleared for realm '${realm}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_clear_realm_cache",
        {
            title: "Clear Realm Cache",
            description: "Clear the realm cache, forcing realm objects and configuration to be re-fetched from the database.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm }) => {
            await realms.clearRealmCache(realm);
            return { content: [{ type: "text", text: `Realm cache cleared for realm '${realm}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_clear_keys_cache",
        {
            title: "Clear Keys Cache",
            description: "Clear the keys cache for a realm, forcing signing and encryption keys to be re-fetched.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm }) => {
            await realms.clearKeysCache(realm);
            return { content: [{ type: "text", text: `Keys cache cleared for realm '${realm}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_get_realm_keys",
        {
            title: "Get Realm Keys",
            description: "Retrieve the active signing and encryption keys for a realm (public keys, key IDs, algorithms).",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm }) => {
            const keys = await realms.getKeys(realm);
            return { content: [{ type: "text", text: JSON.stringify(keys, null, 2) }] };
        }
    );
}
