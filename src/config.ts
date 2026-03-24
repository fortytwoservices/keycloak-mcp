/**
 * Keycloak connection configuration.
 *
 * Two sources, in priority order:
 *   1. Session config — set at runtime via the keycloak_connect tool.
 *   2. Environment variables — KEYCLOAK_URL, KEYCLOAK_ADMIN, KEYCLOAK_ADMIN_PASSWORD.
 *
 * Call setSessionConfig() to connect at runtime. Call clearSessionConfig() to
 * revert to env vars. clearTokenCache() (from client.ts) must be called alongside
 * setSessionConfig() so the next API call fetches a fresh token for the new server.
 */

export interface KeycloakConfig {
    url: string;
    user: string;
    pass: string;
}

let sessionConfig: KeycloakConfig | null = null;

export function setSessionConfig(url: string, user: string, pass: string): void {
    sessionConfig = { url: url.replace(/\/$/, ""), user, pass };
}

export function clearSessionConfig(): void {
    sessionConfig = null;
}

export function hasSessionConfig(): boolean {
    return sessionConfig !== null;
}

export function getConfig(): KeycloakConfig | null {
    if (sessionConfig) return sessionConfig;

    const url = process.env.KEYCLOAK_URL?.replace(/\/$/, "");
    const user = process.env.KEYCLOAK_ADMIN;
    const pass = process.env.KEYCLOAK_ADMIN_PASSWORD;

    if (url && user && pass) return { url, user, pass };
    return null;
}
