#!/usr/bin/env node
/**
 * keycloak-mcp — Model Context Protocol server for Keycloak Admin API.
 *
 * Transport: stdio (for use with Claude Desktop, VS Code, Cursor, etc.)
 *
 * Required environment variables:
 *   KEYCLOAK_URL              Base URL of your Keycloak instance, e.g. http://localhost:8080
 *   KEYCLOAK_ADMIN            Admin username
 *   KEYCLOAK_ADMIN_PASSWORD   Admin password
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerRealmTools } from "./tools/realms.js";
import { registerUserTools } from "./tools/users.js";
import { registerGroupTools } from "./tools/groups.js";
import { registerRoleTools } from "./tools/roles.js";
import { registerClientTools } from "./tools/clients.js";
import { registerEventTools } from "./tools/events.js";
import { registerIdentityProviderTools } from "./tools/identity-providers.js";
import { registerClientScopeTools } from "./tools/client-scopes.js";
import { registerAuthenticationTools } from "./tools/authentication.js";
import { registerAttackDetectionTools } from "./tools/attack-detection.js";
import { registerOrganizationTools } from "./tools/organizations.js";
import { registerConnectionTools } from "./tools/connection.js";
import { enableLogging, enableNetworkLogging, enableHttpLogging } from "./logger.js";

const REQUIRED_ENV = ["KEYCLOAK_URL", "KEYCLOAK_ADMIN", "KEYCLOAK_ADMIN_PASSWORD"] as const;

function validateEnv(): void {
    const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
    if (missing.length > 0) {
        process.stderr.write(
            `[keycloak-mcp] No environment credentials found (${missing.join(", ")} not set).\n` +
            `Use the keycloak_connect tool at runtime to supply credentials.\n`
        );
    }
}

async function main(): Promise<void> {
    validateEnv();
    enableNetworkLogging(); // intercept raw JSON-RPC stdio before transport starts
    enableHttpLogging();    // intercept all fetch() calls to Keycloak REST API

    const server = new McpServer({
        name: "keycloak-mcp",
        version: "1.0.0",
    });

    enableLogging(server);

    registerRealmTools(server);
    registerUserTools(server);
    registerGroupTools(server);
    registerRoleTools(server);
    registerClientTools(server);
    registerEventTools(server);
    registerIdentityProviderTools(server);
    registerClientScopeTools(server);
    registerAuthenticationTools(server);
    registerAttackDetectionTools(server);
    registerOrganizationTools(server);
    registerConnectionTools(server);

    const transport = new StdioServerTransport();
    await server.connect(transport);

    process.stderr.write("[keycloak-mcp] Server started. Waiting for requests...\n");
}

main().catch((err) => {
    process.stderr.write(`[keycloak-mcp] Fatal error: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
});
