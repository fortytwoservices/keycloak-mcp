import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { users } from "../client.js";

export function registerUserTools(server: McpServer): void {

    server.registerTool(
        "keycloak_list_users",
        {
            title: "List Users",
            description: "List users in a realm. Supports free-text search (matched against username, email, first/last name) and field-specific filters. Use count=true to get the total count instead.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                search: z.string().optional().describe("Free-text search matched against username, email, firstName, lastName"),
                email: z.string().optional().describe("Filter by exact email (prefix match)"),
                username: z.string().optional().describe("Filter by exact username (prefix match)"),
                firstName: z.string().optional().describe("Filter by first name (prefix match)"),
                lastName: z.string().optional().describe("Filter by last name (prefix match)"),
                enabled: z.boolean().optional().describe("Filter by enabled status"),
                max: z.number().int().positive().default(50).describe("Maximum results to return (default 50)"),
                first: z.number().int().nonnegative().default(0).describe("Pagination offset (default 0)"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, search, email, username, firstName, lastName, enabled, max, first }) => {
            const list = await users.list(realm, { search, email, username, firstName, lastName, enabled, max, first });
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_get_user",
        {
            title: "Get User",
            description: "Get full details of a specific user by their UUID.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, user_id }) => {
            const user = await users.get(realm, user_id);
            return { content: [{ type: "text", text: JSON.stringify(user, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_create_user",
        {
            title: "Create User",
            description: "Create a new user in a realm. Optionally set an initial password (use temporary=true to force change on first login).",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                username: z.string().describe("Username — must be unique within the realm"),
                email: z.string().email().optional().describe("Email address"),
                firstName: z.string().optional().describe("First name"),
                lastName: z.string().optional().describe("Last name"),
                enabled: z.boolean().default(true).describe("Account enabled"),
                emailVerified: z.boolean().default(false).describe("Mark email as pre-verified"),
                password: z.string().optional().describe("Initial password"),
                temporary: z.boolean().default(false).describe("If true the user must change the password on first login"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, username, email, firstName, lastName, enabled, emailVerified, password, temporary }) => {
            const rep = {
                username,
                email,
                firstName,
                lastName,
                enabled,
                emailVerified,
                ...(password ? {
                    credentials: [{ type: "password", value: password, temporary }],
                } : {}),
            };
            await users.create(realm, rep);
            return { content: [{ type: "text", text: `User '${username}' created in realm '${realm}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_update_user",
        {
            title: "Update User",
            description: "Update a user's profile. Only provided fields are changed.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID"),
                email: z.string().email().optional().describe("New email address"),
                firstName: z.string().optional().describe("New first name"),
                lastName: z.string().optional().describe("New last name"),
                enabled: z.boolean().optional().describe("Enable or disable the account"),
                emailVerified: z.boolean().optional().describe("Set email verification status"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, user_id, ...fields }) => {
            const update = Object.fromEntries(
                Object.entries(fields).filter(([, v]) => v !== undefined)
            );
            await users.update(realm, user_id, update);
            return { content: [{ type: "text", text: `User '${user_id}' updated.` }] };
        }
    );

    server.registerTool(
        "keycloak_delete_user",
        {
            title: "Delete User",
            description: "Permanently delete a user from a realm. Cannot be undone.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, user_id }) => {
            await users.delete(realm, user_id);
            return { content: [{ type: "text", text: `User '${user_id}' deleted from realm '${realm}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_reset_password",
        {
            title: "Reset User Password",
            description: "Set a new password for a user. Use temporary=true to force a password change on next login.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID"),
                password: z.string().min(1).describe("New password value"),
                temporary: z.boolean().default(false).describe("If true the user must change the password on next login"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, user_id, password, temporary }) => {
            await users.resetPassword(realm, user_id, { type: "password", value: password, temporary });
            return { content: [{ type: "text", text: `Password reset for user '${user_id}' in realm '${realm}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_get_user_credentials",
        {
            title: "Get User Credentials",
            description: "List the credentials (password, OTP, WebAuthn, etc.) registered for a user.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, user_id }) => {
            const creds = await users.credentials(realm, user_id);
            return { content: [{ type: "text", text: JSON.stringify(creds, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_delete_user_credential",
        {
            title: "Delete User Credential",
            description: "Remove a specific credential (e.g. OTP or WebAuthn key) from a user. Get credential IDs from keycloak_get_user_credentials.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID"),
                credential_id: z.string().describe("Credential UUID (from keycloak_get_user_credentials)"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, user_id, credential_id }) => {
            await users.deleteCredential(realm, user_id, credential_id);
            return { content: [{ type: "text", text: `Credential '${credential_id}' deleted from user '${user_id}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_send_verify_email",
        {
            title: "Send Verification Email",
            description: "Send an email verification link to the user's email address.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
        },
        async ({ realm, user_id }) => {
            await users.sendVerifyEmail(realm, user_id);
            return { content: [{ type: "text", text: `Verification email sent to user '${user_id}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_execute_actions_email",
        {
            title: "Send Required Actions Email",
            description: "Send an email asking the user to complete required actions (e.g. VERIFY_EMAIL, UPDATE_PASSWORD, UPDATE_PROFILE, CONFIGURE_TOTP). Actions are Keycloak action names.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID"),
                actions: z.array(z.string()).describe("List of required action names, e.g. [\"VERIFY_EMAIL\", \"UPDATE_PASSWORD\"]"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
        },
        async ({ realm, user_id, actions }) => {
            await users.executeActionsEmail(realm, user_id, actions);
            return { content: [{ type: "text", text: `Required actions email sent to user '${user_id}' with actions: ${actions.join(", ")}.` }] };
        }
    );

    server.registerTool(
        "keycloak_logout_user",
        {
            title: "Logout User",
            description: "Terminate all active sessions for a user, forcing them to log in again.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, user_id }) => {
            await users.logout(realm, user_id);
            return { content: [{ type: "text", text: `All sessions for user '${user_id}' terminated.` }] };
        }
    );

    server.registerTool(
        "keycloak_get_user_groups",
        {
            title: "Get User Groups",
            description: "List the groups a user belongs to.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, user_id }) => {
            const list = await users.groups(realm, user_id);
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_add_user_to_group",
        {
            title: "Add User to Group",
            description: "Add a user to a group.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID"),
                group_id: z.string().describe("Group UUID"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, user_id, group_id }) => {
            await users.joinGroup(realm, user_id, group_id);
            return { content: [{ type: "text", text: `User '${user_id}' added to group '${group_id}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_remove_user_from_group",
        {
            title: "Remove User from Group",
            description: "Remove a user from a group.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID"),
                group_id: z.string().describe("Group UUID"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, user_id, group_id }) => {
            await users.leaveGroup(realm, user_id, group_id);
            return { content: [{ type: "text", text: `User '${user_id}' removed from group '${group_id}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_get_user_roles",
        {
            title: "Get User Realm Roles",
            description: "List the realm-level roles assigned to a user.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, user_id }) => {
            const list = await users.realmRoles(realm, user_id);
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_assign_realm_roles_to_user",
        {
            title: "Assign Realm Roles to User",
            description: "Assign one or more realm-level roles to a user. Each role must include both 'id' and 'name'. Get role IDs from keycloak_list_roles.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID"),
                roles: z.array(z.object({
                    id: z.string().describe("Role UUID"),
                    name: z.string().describe("Role name"),
                })).describe("Roles to assign"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, user_id, roles }) => {
            await users.addRealmRoles(realm, user_id, roles);
            return { content: [{ type: "text", text: `Roles [${roles.map((r) => r.name).join(", ")}] assigned to user '${user_id}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_get_user_sessions",
        {
            title: "Get User Sessions",
            description: "List active sessions for a specific user.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, user_id }) => {
            const list = await users.sessions(realm, user_id);
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_get_user_federated_identities",
        {
            title: "Get User Federated Identities",
            description: "List federated (social/OIDC) identity links for a user, showing which external identity providers they have linked.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, user_id }) => {
            const list = await users.listFederatedIdentities(realm, user_id);
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_add_user_federated_identity",
        {
            title: "Add User Federated Identity",
            description: "Link a user to an external identity provider (e.g. Google, GitHub). Requires the alias of the configured identity provider.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID"),
                provider: z.string().describe("Identity provider alias (e.g. 'google', 'github')"),
                userId: z.string().describe("User ID in the external identity provider"),
                userName: z.string().describe("Username in the external identity provider"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, user_id, provider, userId, userName }) => {
            await users.addFederatedIdentity(realm, user_id, provider, { identityProvider: provider, userId, userName });
            return { content: [{ type: "text", text: `Federated identity '${provider}' linked to user '${user_id}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_remove_user_federated_identity",
        {
            title: "Remove User Federated Identity",
            description: "Unlink a federated identity provider from a user.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID"),
                provider: z.string().describe("Identity provider alias to unlink"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, user_id, provider }) => {
            await users.removeFederatedIdentity(realm, user_id, provider);
            return { content: [{ type: "text", text: `Federated identity '${provider}' unlinked from user '${user_id}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_get_user_consents",
        {
            title: "Get User Consents",
            description: "List all application consents granted by a user (OAuth scopes the user has approved for each client).",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, user_id }) => {
            const list = await users.listConsents(realm, user_id);
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_revoke_user_consent",
        {
            title: "Revoke User Consent",
            description: "Revoke a user's consent for a specific client, removing all approved OAuth scopes for that application.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID"),
                client_id: z.string().describe("Client ID (not UUID) to revoke consent for"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, user_id, client_id }) => {
            await users.revokeConsent(realm, user_id, client_id);
            return { content: [{ type: "text", text: `Consent for client '${client_id}' revoked from user '${user_id}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_impersonate_user",
        {
            title: "Impersonate User",
            description: "Start an impersonation session for a user. Returns redirect information for the admin to take on the user's identity in the UI. Use with caution.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID to impersonate"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, user_id }) => {
            const result = await users.impersonate(realm, user_id);
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_get_user_client_roles",
        {
            title: "Get User Client Roles",
            description: "List client-level roles assigned to a user for a specific client.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID"),
                client_uuid: z.string().describe("Client internal UUID"),
            }),
            annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        async ({ realm, user_id, client_uuid }) => {
            const list = await users.listClientRoleMappings(realm, user_id, client_uuid);
            return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
        }
    );

    server.registerTool(
        "keycloak_assign_client_roles_to_user",
        {
            title: "Assign Client Roles to User",
            description: "Assign one or more client-level roles to a user. Each role must include both 'id' and 'name'. Use keycloak_list_client_roles to get role details.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID"),
                client_uuid: z.string().describe("Client internal UUID"),
                roles: z.array(z.object({
                    id: z.string().describe("Role UUID"),
                    name: z.string().describe("Role name"),
                })).describe("Roles to assign"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, user_id, client_uuid, roles }) => {
            await users.addClientRoleMappings(realm, user_id, client_uuid, roles);
            return { content: [{ type: "text", text: `Client roles [${roles.map((r) => r.name).join(", ")}] assigned to user '${user_id}'.` }] };
        }
    );

    server.registerTool(
        "keycloak_remove_client_roles_from_user",
        {
            title: "Remove Client Roles from User",
            description: "Remove one or more client-level roles from a user. Each role must include both 'id' and 'name'.",
            inputSchema: z.object({
                realm: z.string().describe("Realm name"),
                user_id: z.string().describe("User UUID"),
                client_uuid: z.string().describe("Client internal UUID"),
                roles: z.array(z.object({
                    id: z.string().describe("Role UUID"),
                    name: z.string().describe("Role name"),
                })).describe("Roles to remove"),
            }),
            annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
        },
        async ({ realm, user_id, client_uuid, roles }) => {
            await users.removeClientRoleMappings(realm, user_id, client_uuid, roles);
            return { content: [{ type: "text", text: `Client roles [${roles.map((r) => r.name).join(", ")}] removed from user '${user_id}'.` }] };
        }
    );
}
