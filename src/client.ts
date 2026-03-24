/**
 * Keycloak Admin REST API client.
 *
 * Authenticates against the master realm using admin credentials and exposes
 * typed helpers for all endpoints used by the MCP tools.
 *
 * Credentials are resolved in order:
 *   1. Runtime session config set via the keycloak_connect tool
 *   2. Environment variables: KEYCLOAK_URL, KEYCLOAK_ADMIN, KEYCLOAK_ADMIN_PASSWORD
 *
 * Tokens are cached in-process and automatically refreshed before expiry.
 */
import { getConfig } from "./config.js";

// ─── Config ───────────────────────────────────────────────────────────────────

function cfg() {
    const config = getConfig();
    if (!config) {
        throw new Error(
            "Not connected to Keycloak. Use the keycloak_connect tool to set server URL and credentials, " +
            "or configure KEYCLOAK_URL, KEYCLOAK_ADMIN, and KEYCLOAK_ADMIN_PASSWORD environment variables."
        );
    }
    return config;
}

// ─── Token cache ──────────────────────────────────────────────────────────────

interface TokenCache {
    accessToken: string;
    expiresAt: number; // ms epoch
}

let tokenCache: TokenCache | null = null;

export function clearTokenCache(): void {
    tokenCache = null;
}

async function getToken(): Promise<string> {
    if (tokenCache && Date.now() < tokenCache.expiresAt - 10_000) {
        return tokenCache.accessToken;
    }

    const { url, user, pass } = cfg();
    const body = new URLSearchParams({
        grant_type: "password",
        client_id: "admin-cli",
        username: user,
        password: pass,
    });

    const res = await fetch(`${url}/realms/master/protocol/openid-connect/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Keycloak authentication failed (${res.status}): ${text}`);
    }

    const data = await res.json() as { access_token: string; expires_in: number };
    tokenCache = {
        accessToken: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
    };
    return tokenCache.accessToken;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

export async function adminGet<T>(path: string): Promise<T> {
    const { url } = cfg();
    const token = await getToken();
    const res = await fetch(`${url}/admin/${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`GET ${path} → ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
}

async function adminPost<T = void>(path: string, body: unknown): Promise<T> {
    const { url } = cfg();
    const token = await getToken();
    const res = await fetch(`${url}/admin/${path}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`POST ${path} → ${res.status}: ${text}`);
    }
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
}

async function adminPut(path: string, body: unknown): Promise<void> {
    const { url } = cfg();
    const token = await getToken();
    const res = await fetch(`${url}/admin/${path}`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`PUT ${path} → ${res.status}: ${text}`);
    }
}

async function adminDelete(path: string): Promise<void> {
    const { url } = cfg();
    const token = await getToken();
    const res = await fetch(`${url}/admin/${path}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`DELETE ${path} → ${res.status}: ${text}`);
    }
}

async function adminDeleteWithBody(path: string, body: unknown): Promise<void> {
    const { url } = cfg();
    const token = await getToken();
    const res = await fetch(`${url}/admin/${path}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`DELETE ${path} → ${res.status}: ${text}`);
    }
}

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface RealmRepresentation {
    id?: string;
    realm?: string;
    displayName?: string;
    enabled?: boolean;
    loginWithEmailAllowed?: boolean;
    registrationAllowed?: boolean;
    resetPasswordAllowed?: boolean;
    rememberMe?: boolean;
    bruteForceProtected?: boolean;
    [key: string]: unknown;
}

export interface UserRepresentation {
    id?: string;
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    enabled?: boolean;
    emailVerified?: boolean;
    attributes?: Record<string, string[]>;
    credentials?: CredentialRepresentation[];
    [key: string]: unknown;
}

export interface CredentialRepresentation {
    id?: string;
    type?: string;
    value?: string;
    temporary?: boolean;
    userLabel?: string;
    [key: string]: unknown;
}

export interface RoleRepresentation {
    id?: string;
    name?: string;
    description?: string;
    composite?: boolean;
    clientRole?: boolean;
    containerId?: string;
    [key: string]: unknown;
}

export interface GroupRepresentation {
    id?: string;
    name?: string;
    path?: string;
    subGroups?: GroupRepresentation[];
    [key: string]: unknown;
}

export interface ClientRepresentation {
    id?: string;
    clientId?: string;
    name?: string;
    description?: string;
    enabled?: boolean;
    protocol?: string;
    publicClient?: boolean;
    redirectUris?: string[];
    webOrigins?: string[];
    serviceAccountsEnabled?: boolean;
    [key: string]: unknown;
}

export interface UserSessionRepresentation {
    id?: string;
    username?: string;
    userId?: string;
    ipAddress?: string;
    start?: number;
    lastAccess?: number;
    clients?: Record<string, string>;
    [key: string]: unknown;
}

export interface ClientSessionStatsRepresentation {
    id?: string;
    clientId?: string;
    active?: number;
    offline?: number;
    [key: string]: unknown;
}

export interface EventRepresentation {
    time?: number;
    type?: string;
    realmId?: string;
    clientId?: string;
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    error?: string;
    details?: Record<string, string>;
    [key: string]: unknown;
}

export interface AdminEventRepresentation {
    time?: number;
    realmId?: string;
    authDetails?: unknown;
    operationType?: string;
    resourceType?: string;
    resourcePath?: string;
    error?: string;
    [key: string]: unknown;
}

export interface IdentityProviderRepresentation {
    alias?: string;
    displayName?: string;
    providerId?: string;
    enabled?: boolean;
    trustEmail?: boolean;
    storeToken?: boolean;
    addReadTokenRoleOnCreate?: boolean;
    config?: Record<string, string>;
    [key: string]: unknown;
}

export interface IdentityProviderMapperRepresentation {
    id?: string;
    name?: string;
    identityProviderAlias?: string;
    identityProviderMapper?: string;
    config?: Record<string, string>;
    [key: string]: unknown;
}

export interface ClientScopeRepresentation {
    id?: string;
    name?: string;
    description?: string;
    protocol?: string;
    attributes?: Record<string, string>;
    [key: string]: unknown;
}

export interface AuthenticationFlowRepresentation {
    id?: string;
    alias?: string;
    description?: string;
    providerId?: string;
    topLevel?: boolean;
    builtIn?: boolean;
    authenticationExecutions?: unknown[];
    [key: string]: unknown;
}

export interface RequiredActionProviderRepresentation {
    alias?: string;
    name?: string;
    providerId?: string;
    enabled?: boolean;
    defaultAction?: boolean;
    priority?: number;
    [key: string]: unknown;
}

export interface ProtocolMapperRepresentation {
    id?: string;
    name?: string;
    protocol?: string;
    protocolMapper?: string;
    consentRequired?: boolean;
    config?: Record<string, string>;
    [key: string]: unknown;
}

export interface OrganizationRepresentation {
    id?: string;
    name?: string;
    alias?: string;
    enabled?: boolean;
    description?: string;
    domains?: Array<{ name: string; verified: boolean }>;
    [key: string]: unknown;
}

export interface FederatedIdentityRepresentation {
    identityProvider?: string;
    userId?: string;
    userName?: string;
    [key: string]: unknown;
}

export interface UserConsentRepresentation {
    clientId?: string;
    grantedClientScopes?: string[];
    createdDate?: number;
    lastUpdatedDate?: number;
    [key: string]: unknown;
}

// ─── Realm API ────────────────────────────────────────────────────────────────

export const realms = {
    list: () => adminGet<RealmRepresentation[]>("realms"),
    get: (realm: string) => adminGet<RealmRepresentation>(`realms/${realm}`),
    create: (rep: RealmRepresentation) => adminPost<void>("realms", rep),
    update: (realm: string, rep: Partial<RealmRepresentation>) => adminPut(`realms/${realm}`, rep),
    delete: (realm: string) => adminDelete(`realms/${realm}`),
    clearUserCache: (realm: string) => adminPost<void>(`realms/${realm}/clear-user-cache`, {}),
    clearRealmCache: (realm: string) => adminPost<void>(`realms/${realm}/clear-realm-cache`, {}),
    clearKeysCache: (realm: string) => adminPost<void>(`realms/${realm}/clear-keys-cache`, {}),
    getKeys: (realm: string) => adminGet<{ active: Record<string, string>; keys: unknown[] }>(`realms/${realm}/keys`),
};

// ─── User API ─────────────────────────────────────────────────────────────────

export const users = {
    list: (realm: string, params?: { search?: string; email?: string; username?: string; firstName?: string; lastName?: string; enabled?: boolean; max?: number; first?: number }) => {
        const qs = new URLSearchParams();
        if (params?.search) qs.set("search", params.search);
        if (params?.email) qs.set("email", params.email);
        if (params?.username) qs.set("username", params.username);
        if (params?.firstName) qs.set("firstName", params.firstName);
        if (params?.lastName) qs.set("lastName", params.lastName);
        if (params?.enabled !== undefined) qs.set("enabled", String(params.enabled));
        if (params?.max !== undefined) qs.set("max", String(params.max));
        if (params?.first !== undefined) qs.set("first", String(params.first));
        const q = qs.toString();
        return adminGet<UserRepresentation[]>(`realms/${realm}/users${q ? "?" + q : ""}`);
    },
    count: (realm: string, search?: string) => {
        const qs = search ? `?search=${encodeURIComponent(search)}` : "";
        return adminGet<number>(`realms/${realm}/users/count${qs}`);
    },
    get: (realm: string, id: string) => adminGet<UserRepresentation>(`realms/${realm}/users/${id}`),
    create: (realm: string, rep: UserRepresentation) => adminPost<void>(`realms/${realm}/users`, rep),
    update: (realm: string, id: string, rep: Partial<UserRepresentation>) => adminPut(`realms/${realm}/users/${id}`, rep),
    delete: (realm: string, id: string) => adminDelete(`realms/${realm}/users/${id}`),
    resetPassword: (realm: string, id: string, cred: CredentialRepresentation) =>
        adminPut(`realms/${realm}/users/${id}/reset-password`, cred),
    credentials: (realm: string, id: string) =>
        adminGet<CredentialRepresentation[]>(`realms/${realm}/users/${id}/credentials`),
    deleteCredential: (realm: string, userId: string, credentialId: string) =>
        adminDelete(`realms/${realm}/users/${userId}/credentials/${credentialId}`),
    sendVerifyEmail: (realm: string, id: string) =>
        adminPut(`realms/${realm}/users/${id}/send-verify-email`, {}),
    executeActionsEmail: (realm: string, id: string, actions: string[]) =>
        adminPut(`realms/${realm}/users/${id}/execute-actions-email`, actions),
    logout: (realm: string, id: string) =>
        adminPost<void>(`realms/${realm}/users/${id}/logout`, {}),
    groups: (realm: string, id: string) =>
        adminGet<Array<{ id: string; name: string; path: string }>>(`realms/${realm}/users/${id}/groups`),
    joinGroup: (realm: string, userId: string, groupId: string) =>
        adminPut(`realms/${realm}/users/${userId}/groups/${groupId}`, {}),
    leaveGroup: (realm: string, userId: string, groupId: string) =>
        adminDelete(`realms/${realm}/users/${userId}/groups/${groupId}`),
    realmRoles: (realm: string, id: string) =>
        adminGet<RoleRepresentation[]>(`realms/${realm}/users/${id}/role-mappings/realm`),
    addRealmRoles: (realm: string, id: string, roles: RoleRepresentation[]) =>
        adminPost<void>(`realms/${realm}/users/${id}/role-mappings/realm`, roles),
    removeRealmRoles: (realm: string, id: string, roles: RoleRepresentation[]) =>
        adminDeleteWithBody(`realms/${realm}/users/${id}/role-mappings/realm`, roles),
    sessions: (realm: string, id: string) =>
        adminGet<UserSessionRepresentation[]>(`realms/${realm}/users/${id}/sessions`),
    // Federated identities (social logins)
    listFederatedIdentities: (realm: string, id: string) =>
        adminGet<FederatedIdentityRepresentation[]>(`realms/${realm}/users/${id}/federated-identity`),
    addFederatedIdentity: (realm: string, userId: string, provider: string, rep: FederatedIdentityRepresentation) =>
        adminPost<void>(`realms/${realm}/users/${userId}/federated-identity/${encodeURIComponent(provider)}`, rep),
    removeFederatedIdentity: (realm: string, userId: string, provider: string) =>
        adminDelete(`realms/${realm}/users/${userId}/federated-identity/${encodeURIComponent(provider)}`),
    // Consents
    listConsents: (realm: string, id: string) =>
        adminGet<UserConsentRepresentation[]>(`realms/${realm}/users/${id}/consents`),
    revokeConsent: (realm: string, userId: string, clientId: string) =>
        adminDelete(`realms/${realm}/users/${userId}/consents/${encodeURIComponent(clientId)}`),
    // Impersonation
    impersonate: (realm: string, id: string) =>
        adminPost<Record<string, unknown>>(`realms/${realm}/users/${id}/impersonation`, {}),
    // Client role mappings
    listClientRoleMappings: (realm: string, userId: string, clientUuid: string) =>
        adminGet<RoleRepresentation[]>(`realms/${realm}/users/${userId}/role-mappings/clients/${clientUuid}`),
    availableClientRoleMappings: (realm: string, userId: string, clientUuid: string) =>
        adminGet<RoleRepresentation[]>(`realms/${realm}/users/${userId}/role-mappings/clients/${clientUuid}/available`),
    addClientRoleMappings: (realm: string, userId: string, clientUuid: string, roles: RoleRepresentation[]) =>
        adminPost<void>(`realms/${realm}/users/${userId}/role-mappings/clients/${clientUuid}`, roles),
    removeClientRoleMappings: (realm: string, userId: string, clientUuid: string, roles: RoleRepresentation[]) =>
        adminDeleteWithBody(`realms/${realm}/users/${userId}/role-mappings/clients/${clientUuid}`, roles),
};

// ─── Group API ────────────────────────────────────────────────────────────────

export const groups = {
    list: (realm: string, params?: { search?: string; max?: number; first?: number }) => {
        const qs = new URLSearchParams();
        if (params?.search) qs.set("search", params.search);
        if (params?.max !== undefined) qs.set("max", String(params.max));
        if (params?.first !== undefined) qs.set("first", String(params.first));
        const q = qs.toString();
        return adminGet<GroupRepresentation[]>(`realms/${realm}/groups${q ? "?" + q : ""}`);
    },
    get: (realm: string, id: string) => adminGet<GroupRepresentation>(`realms/${realm}/groups/${id}`),
    create: (realm: string, rep: GroupRepresentation) => adminPost<void>(`realms/${realm}/groups`, rep),
    createSubGroup: (realm: string, parentId: string, rep: GroupRepresentation) =>
        adminPost<void>(`realms/${realm}/groups/${parentId}/children`, rep),
    update: (realm: string, id: string, rep: Partial<GroupRepresentation>) => adminPut(`realms/${realm}/groups/${id}`, rep),
    delete: (realm: string, id: string) => adminDelete(`realms/${realm}/groups/${id}`),
    members: (realm: string, id: string, params?: { max?: number; first?: number }) => {
        const qs = new URLSearchParams();
        if (params?.max !== undefined) qs.set("max", String(params.max));
        if (params?.first !== undefined) qs.set("first", String(params.first));
        const q = qs.toString();
        return adminGet<UserRepresentation[]>(`realms/${realm}/groups/${id}/members${q ? "?" + q : ""}`);
    },
    realmRoles: (realm: string, id: string) =>
        adminGet<RoleRepresentation[]>(`realms/${realm}/groups/${id}/role-mappings/realm`),
    addRealmRoles: (realm: string, id: string, roles: RoleRepresentation[]) =>
        adminPost<void>(`realms/${realm}/groups/${id}/role-mappings/realm`, roles),
    removeRealmRoles: (realm: string, id: string, roles: RoleRepresentation[]) =>
        adminDeleteWithBody(`realms/${realm}/groups/${id}/role-mappings/realm`, roles),
    // Client role mappings for group
    listClientRoleMappings: (realm: string, groupId: string, clientUuid: string) =>
        adminGet<RoleRepresentation[]>(`realms/${realm}/groups/${groupId}/role-mappings/clients/${clientUuid}`),
    availableClientRoleMappings: (realm: string, groupId: string, clientUuid: string) =>
        adminGet<RoleRepresentation[]>(`realms/${realm}/groups/${groupId}/role-mappings/clients/${clientUuid}/available`),
    addClientRoleMappings: (realm: string, groupId: string, clientUuid: string, roles: RoleRepresentation[]) =>
        adminPost<void>(`realms/${realm}/groups/${groupId}/role-mappings/clients/${clientUuid}`, roles),
    removeClientRoleMappings: (realm: string, groupId: string, clientUuid: string, roles: RoleRepresentation[]) =>
        adminDeleteWithBody(`realms/${realm}/groups/${groupId}/role-mappings/clients/${clientUuid}`, roles),
};

// ─── Realm Role API ───────────────────────────────────────────────────────────

export const realmRoles = {
    list: (realm: string, params?: { search?: string; max?: number; first?: number }) => {
        const qs = new URLSearchParams();
        if (params?.search) qs.set("search", params.search);
        if (params?.max !== undefined) qs.set("max", String(params.max));
        if (params?.first !== undefined) qs.set("first", String(params.first));
        const q = qs.toString();
        return adminGet<RoleRepresentation[]>(`realms/${realm}/roles${q ? "?" + q : ""}`);
    },
    get: (realm: string, name: string) =>
        adminGet<RoleRepresentation>(`realms/${realm}/roles/${encodeURIComponent(name)}`),
    create: (realm: string, rep: RoleRepresentation) => adminPost<void>(`realms/${realm}/roles`, rep),
    update: (realm: string, name: string, rep: Partial<RoleRepresentation>) =>
        adminPut(`realms/${realm}/roles/${encodeURIComponent(name)}`, rep),
    delete: (realm: string, name: string) =>
        adminDelete(`realms/${realm}/roles/${encodeURIComponent(name)}`),
    users: (realm: string, name: string, params?: { max?: number; first?: number }) => {
        const qs = new URLSearchParams();
        if (params?.max !== undefined) qs.set("max", String(params.max));
        if (params?.first !== undefined) qs.set("first", String(params.first));
        const q = qs.toString();
        return adminGet<UserRepresentation[]>(
            `realms/${realm}/roles/${encodeURIComponent(name)}/users${q ? "?" + q : ""}`
        );
    },
    // Composite roles
    listComposites: (realm: string, name: string) =>
        adminGet<RoleRepresentation[]>(`realms/${realm}/roles/${encodeURIComponent(name)}/composites`),
    addComposites: (realm: string, name: string, roles: RoleRepresentation[]) =>
        adminPost<void>(`realms/${realm}/roles/${encodeURIComponent(name)}/composites`, roles),
    removeComposites: (realm: string, name: string, roles: RoleRepresentation[]) =>
        adminDeleteWithBody(`realms/${realm}/roles/${encodeURIComponent(name)}/composites`, roles),
};

// ─── Client API ──────────────────────────────────────────────────────────────

export const clients = {
    list: (realm: string, clientId?: string) => {
        const qs = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
        return adminGet<ClientRepresentation[]>(`realms/${realm}/clients${qs}`);
    },
    get: (realm: string, id: string) => adminGet<ClientRepresentation>(`realms/${realm}/clients/${id}`),
    create: (realm: string, rep: ClientRepresentation) => adminPost<void>(`realms/${realm}/clients`, rep),
    update: (realm: string, id: string, rep: Partial<ClientRepresentation>) =>
        adminPut(`realms/${realm}/clients/${id}`, rep),
    delete: (realm: string, id: string) => adminDelete(`realms/${realm}/clients/${id}`),
    secret: (realm: string, id: string) =>
        adminGet<{ type: string; value: string }>(`realms/${realm}/clients/${id}/client-secret`),
    regenerateSecret: (realm: string, id: string) =>
        adminPost<{ type: string; value: string }>(`realms/${realm}/clients/${id}/client-secret`, {}),
    // Client-level roles
    listRoles: (realm: string, id: string) =>
        adminGet<RoleRepresentation[]>(`realms/${realm}/clients/${id}/roles`),
    getRole: (realm: string, id: string, roleName: string) =>
        adminGet<RoleRepresentation>(`realms/${realm}/clients/${id}/roles/${encodeURIComponent(roleName)}`),
    createRole: (realm: string, id: string, rep: RoleRepresentation) =>
        adminPost<void>(`realms/${realm}/clients/${id}/roles`, rep),
    updateRole: (realm: string, id: string, roleName: string, rep: Partial<RoleRepresentation>) =>
        adminPut(`realms/${realm}/clients/${id}/roles/${encodeURIComponent(roleName)}`, rep),
    deleteRole: (realm: string, id: string, roleName: string) =>
        adminDelete(`realms/${realm}/clients/${id}/roles/${encodeURIComponent(roleName)}`),
    // Sessions
    userSessions: (realm: string, id: string, params?: { max?: number; first?: number }) => {
        const qs = new URLSearchParams();
        if (params?.max !== undefined) qs.set("max", String(params.max));
        if (params?.first !== undefined) qs.set("first", String(params.first));
        const q = qs.toString();
        return adminGet<UserSessionRepresentation[]>(`realms/${realm}/clients/${id}/user-sessions${q ? "?" + q : ""}`);
    },
    offlineSessions: (realm: string, id: string) =>
        adminGet<UserSessionRepresentation[]>(`realms/${realm}/clients/${id}/offline-sessions`),
    // Protocol mappers
    listProtocolMappers: (realm: string, clientId: string) =>
        adminGet<ProtocolMapperRepresentation[]>(`realms/${realm}/clients/${clientId}/protocol-mappers/models`),
    getProtocolMapper: (realm: string, clientId: string, mapperId: string) =>
        adminGet<ProtocolMapperRepresentation>(`realms/${realm}/clients/${clientId}/protocol-mappers/models/${mapperId}`),
    createProtocolMapper: (realm: string, clientId: string, rep: ProtocolMapperRepresentation) =>
        adminPost<void>(`realms/${realm}/clients/${clientId}/protocol-mappers/models`, rep),
    updateProtocolMapper: (realm: string, clientId: string, mapperId: string, rep: Partial<ProtocolMapperRepresentation>) =>
        adminPut(`realms/${realm}/clients/${clientId}/protocol-mappers/models/${mapperId}`, rep),
    deleteProtocolMapper: (realm: string, clientId: string, mapperId: string) =>
        adminDelete(`realms/${realm}/clients/${clientId}/protocol-mappers/models/${mapperId}`),
    // Service account user
    serviceAccountUser: (realm: string, clientId: string) =>
        adminGet<UserRepresentation>(`realms/${realm}/clients/${clientId}/service-account-user`),
    // Client scope/role mappings (what realm roles appear in tokens for this client)
    listScopeRoleMappings: (realm: string, clientId: string) =>
        adminGet<RoleRepresentation[]>(`realms/${realm}/clients/${clientId}/scope-mappings/realm`),
    availableScopeRoleMappings: (realm: string, clientId: string) =>
        adminGet<RoleRepresentation[]>(`realms/${realm}/clients/${clientId}/scope-mappings/realm/available`),
    addScopeRoleMappings: (realm: string, clientId: string, roles: RoleRepresentation[]) =>
        adminPost<void>(`realms/${realm}/clients/${clientId}/scope-mappings/realm`, roles),
    removeScopeRoleMappings: (realm: string, clientId: string, roles: RoleRepresentation[]) =>
        adminDeleteWithBody(`realms/${realm}/clients/${clientId}/scope-mappings/realm`, roles),
};

// ─── Session API ──────────────────────────────────────────────────────────────

export const sessions = {
    stats: (realm: string) =>
        adminGet<ClientSessionStatsRepresentation[]>(`realms/${realm}/client-session-stats`),
    logout: (realm: string, sessionId: string) =>
        adminDelete(`realms/${realm}/sessions/${sessionId}`),
};

// ─── Events API ───────────────────────────────────────────────────────────────

export const events = {
    list: (realm: string, params?: {
        type?: string;
        client?: string;
        user?: string;
        ipAddress?: string;
        dateFrom?: string;
        dateTo?: string;
        max?: number;
        first?: number;
    }) => {
        const qs = new URLSearchParams();
        if (params?.type) qs.set("type", params.type);
        if (params?.client) qs.set("client", params.client);
        if (params?.user) qs.set("user", params.user);
        if (params?.ipAddress) qs.set("ipAddress", params.ipAddress);
        if (params?.dateFrom) qs.set("dateFrom", params.dateFrom);
        if (params?.dateTo) qs.set("dateTo", params.dateTo);
        if (params?.max !== undefined) qs.set("max", String(params.max));
        if (params?.first !== undefined) qs.set("first", String(params.first));
        const q = qs.toString();
        return adminGet<EventRepresentation[]>(`realms/${realm}/events${q ? "?" + q : ""}`);
    },
    adminList: (realm: string, params?: {
        operationTypes?: string;
        resourceTypes?: string;
        authRealm?: string;
        authClient?: string;
        authUser?: string;
        resourcePath?: string;
        dateFrom?: string;
        dateTo?: string;
        max?: number;
        first?: number;
    }) => {
        const qs = new URLSearchParams();
        if (params?.operationTypes) qs.set("operationTypes", params.operationTypes);
        if (params?.resourceTypes) qs.set("resourceTypes", params.resourceTypes);
        if (params?.authRealm) qs.set("authRealm", params.authRealm);
        if (params?.authClient) qs.set("authClient", params.authClient);
        if (params?.authUser) qs.set("authUser", params.authUser);
        if (params?.resourcePath) qs.set("resourcePath", params.resourcePath);
        if (params?.dateFrom) qs.set("dateFrom", params.dateFrom);
        if (params?.dateTo) qs.set("dateTo", params.dateTo);
        if (params?.max !== undefined) qs.set("max", String(params.max));
        if (params?.first !== undefined) qs.set("first", String(params.first));
        const q = qs.toString();
        return adminGet<AdminEventRepresentation[]>(`realms/${realm}/admin-events${q ? "?" + q : ""}`);
    },
    deleteAll: (realm: string) => adminDelete(`realms/${realm}/events`),
    deleteAdminAll: (realm: string) => adminDelete(`realms/${realm}/admin-events`),
};

// ─── Identity Provider API ────────────────────────────────────────────────────

export const identityProviders = {
    list: (realm: string) =>
        adminGet<IdentityProviderRepresentation[]>(`realms/${realm}/identity-provider/instances`),
    get: (realm: string, alias: string) =>
        adminGet<IdentityProviderRepresentation>(`realms/${realm}/identity-provider/instances/${encodeURIComponent(alias)}`),
    create: (realm: string, rep: IdentityProviderRepresentation) =>
        adminPost<void>(`realms/${realm}/identity-provider/instances`, rep),
    update: (realm: string, alias: string, rep: Partial<IdentityProviderRepresentation>) =>
        adminPut(`realms/${realm}/identity-provider/instances/${encodeURIComponent(alias)}`, rep),
    delete: (realm: string, alias: string) =>
        adminDelete(`realms/${realm}/identity-provider/instances/${encodeURIComponent(alias)}`),
    // Mappers
    listMappers: (realm: string, alias: string) =>
        adminGet<IdentityProviderMapperRepresentation[]>(`realms/${realm}/identity-provider/instances/${encodeURIComponent(alias)}/mappers`),
    getMapper: (realm: string, alias: string, mapperId: string) =>
        adminGet<IdentityProviderMapperRepresentation>(`realms/${realm}/identity-provider/instances/${encodeURIComponent(alias)}/mappers/${mapperId}`),
    createMapper: (realm: string, alias: string, rep: IdentityProviderMapperRepresentation) =>
        adminPost<IdentityProviderMapperRepresentation>(`realms/${realm}/identity-provider/instances/${encodeURIComponent(alias)}/mappers`, rep),
    updateMapper: (realm: string, alias: string, mapperId: string, rep: Partial<IdentityProviderMapperRepresentation>) =>
        adminPut(`realms/${realm}/identity-provider/instances/${encodeURIComponent(alias)}/mappers/${mapperId}`, rep),
    deleteMapper: (realm: string, alias: string, mapperId: string) =>
        adminDelete(`realms/${realm}/identity-provider/instances/${encodeURIComponent(alias)}/mappers/${mapperId}`),
};

// ─── Client Scope API ─────────────────────────────────────────────────────────

export const clientScopes = {
    list: (realm: string) =>
        adminGet<ClientScopeRepresentation[]>(`realms/${realm}/client-scopes`),
    get: (realm: string, id: string) =>
        adminGet<ClientScopeRepresentation>(`realms/${realm}/client-scopes/${id}`),
    create: (realm: string, rep: ClientScopeRepresentation) =>
        adminPost<void>(`realms/${realm}/client-scopes`, rep),
    update: (realm: string, id: string, rep: Partial<ClientScopeRepresentation>) =>
        adminPut(`realms/${realm}/client-scopes/${id}`, rep),
    delete: (realm: string, id: string) =>
        adminDelete(`realms/${realm}/client-scopes/${id}`),
    listDefault: (realm: string) =>
        adminGet<ClientScopeRepresentation[]>(`realms/${realm}/default-client-scopes`),
    addDefault: (realm: string, scopeId: string) =>
        adminPut(`realms/${realm}/default-client-scopes/${scopeId}`, {}),
    removeDefault: (realm: string, scopeId: string) =>
        adminDelete(`realms/${realm}/default-client-scopes/${scopeId}`),
    listOptional: (realm: string) =>
        adminGet<ClientScopeRepresentation[]>(`realms/${realm}/default-optional-client-scopes`),
    addOptional: (realm: string, scopeId: string) =>
        adminPut(`realms/${realm}/default-optional-client-scopes/${scopeId}`, {}),
    removeOptional: (realm: string, scopeId: string) =>
        adminDelete(`realms/${realm}/default-optional-client-scopes/${scopeId}`),
};

// ─── Authentication API ───────────────────────────────────────────────────────

export const authentication = {
    listFlows: (realm: string) =>
        adminGet<AuthenticationFlowRepresentation[]>(`realms/${realm}/authentication/flows`),
    getFlow: (realm: string, flowId: string) =>
        adminGet<AuthenticationFlowRepresentation>(`realms/${realm}/authentication/flows/${flowId}`),
    copyFlow: (realm: string, flowAlias: string, newAlias: string) =>
        adminPost<void>(`realms/${realm}/authentication/flows/${encodeURIComponent(flowAlias)}/copy`, { newName: newAlias }),
    deleteFlow: (realm: string, flowId: string) =>
        adminDelete(`realms/${realm}/authentication/flows/${flowId}`),
    listRequiredActions: (realm: string) =>
        adminGet<RequiredActionProviderRepresentation[]>(`realms/${realm}/authentication/required-actions`),
    getRequiredAction: (realm: string, alias: string) =>
        adminGet<RequiredActionProviderRepresentation>(`realms/${realm}/authentication/required-actions/${encodeURIComponent(alias)}`),
    updateRequiredAction: (realm: string, alias: string, rep: Partial<RequiredActionProviderRepresentation>) =>
        adminPut(`realms/${realm}/authentication/required-actions/${encodeURIComponent(alias)}`, rep),
    deleteRequiredAction: (realm: string, alias: string) =>
        adminDelete(`realms/${realm}/authentication/required-actions/${encodeURIComponent(alias)}`),
    listUnregisteredRequiredActions: (realm: string) =>
        adminGet<RequiredActionProviderRepresentation[]>(`realms/${realm}/authentication/unregistered-required-actions`),
    registerRequiredAction: (realm: string, data: { providerId: string; name: string }) =>
        adminPost<void>(`realms/${realm}/authentication/register-required-action`, data),
};

// ─── Attack Detection API ─────────────────────────────────────────────────────

export const attackDetection = {
    getStatus: (realm: string, userId: string) =>
        adminGet<Record<string, unknown>>(`realms/${realm}/attack-detection/brute-force/users/${userId}`),
    clearUser: (realm: string, userId: string) =>
        adminDelete(`realms/${realm}/attack-detection/brute-force/users/${userId}`),
    clearAll: (realm: string) =>
        adminDelete(`realms/${realm}/attack-detection/brute-force/users`),
};

// ─── Organizations API (Keycloak 24+) ─────────────────────────────────────────

export const organizations = {
    list: (realm: string, params?: { search?: string; max?: number; first?: number }) => {
        const qs = new URLSearchParams();
        if (params?.search) qs.set("search", params.search);
        if (params?.max !== undefined) qs.set("max", String(params.max));
        if (params?.first !== undefined) qs.set("first", String(params.first));
        const q = qs.toString();
        return adminGet<OrganizationRepresentation[]>(`realms/${realm}/organizations${q ? "?" + q : ""}`);
    },
    get: (realm: string, id: string) =>
        adminGet<OrganizationRepresentation>(`realms/${realm}/organizations/${id}`),
    create: (realm: string, rep: OrganizationRepresentation) =>
        adminPost<void>(`realms/${realm}/organizations`, rep),
    update: (realm: string, id: string, rep: Partial<OrganizationRepresentation>) =>
        adminPut(`realms/${realm}/organizations/${id}`, rep),
    delete: (realm: string, id: string) =>
        adminDelete(`realms/${realm}/organizations/${id}`),
    listMembers: (realm: string, id: string, params?: { max?: number; first?: number }) => {
        const qs = new URLSearchParams();
        if (params?.max !== undefined) qs.set("max", String(params.max));
        if (params?.first !== undefined) qs.set("first", String(params.first));
        const q = qs.toString();
        return adminGet<UserRepresentation[]>(`realms/${realm}/organizations/${id}/members${q ? "?" + q : ""}`);
    },
    addMember: (realm: string, id: string, userId: string) =>
        adminPost<void>(`realms/${realm}/organizations/${id}/members`, userId),
    removeMember: (realm: string, id: string, userId: string) =>
        adminDelete(`realms/${realm}/organizations/${id}/members/${userId}`),
};
