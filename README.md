
![Keycloak MCP by Fortytwo.io](image.png)

# Keycloak MCP by Fortytwo.io

> **For [Keycloak Community Edition](https://www.keycloak.org/) — intended for testing, development, and local administration.**

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that gives AI assistants full administrative control over a [Keycloak](https://www.keycloak.org/) instance via the [Keycloak Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/index.html).

Manage realms, users, groups, roles, clients, sessions and audit events — all through natural language, directly from your IDE.

---

## About Keycloak

[Keycloak](https://github.com/keycloak/keycloak) is an open-source Identity and Access Management solution maintained by Red Hat and the CNCF community. It adds authentication to applications and secures services with minimum effort — handling user federation, strong authentication, user management, fine-grained authorization, SSO, and more.

- **License:** [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
- **Latest release:** 26.5.6 — [GitHub Releases](https://github.com/keycloak/keycloak/releases)
- **33.5k+ stars**, **1,400+ contributors**, **8.2k forks**
- Protocols: OpenID Connect, OAuth 2.0, SAML 2.0
- Full documentation: [keycloak.org/documentation](https://www.keycloak.org/documentation.html)

---

## Disclaimer

> **Use this MCP server at your own responsibility.**
> This tool provides unrestricted administrative access to your Keycloak instance. It is designed for **Keycloak Community Edition**, and is intended for **testing, development, and local environments**. Do not use it against production systems without a full understanding of the consequences. The authors take no responsibility for data loss, misconfiguration, or security incidents resulting from its use.

---

## How it works

- **Fully local** — all interactions happen between your IDE and your Keycloak instance. No data leaves your machine to any third-party service.
- **All AI IDEs supported** — works with Claude Desktop, VS Code, Cursor, Windsurf, Google Antigravity, and any other MCP-compatible client.
- **Battle-tested** — exercised across a wide range of real-world administration scenarios including realm setup, user lifecycle, role hierarchies, federation, OIDC clients, and brute-force management.
- **Internal logging** — every tool call, HTTP request, and JSON-RPC message is logged locally (JSONL format) so you can audit exactly what the AI did and correlate it with your Keycloak admin events.

---

## Features

| Area | Tools | Capabilities |
|------|------:|--------------|
| **Realms** | 9 | CRUD, caches, keys |
| **Users** | 26 | Profile, password, credentials, email, sessions, groups, roles, federated identities, consents, impersonation |
| **Groups** | 13 | CRUD, hierarchy, members, realm/client role assignments |
| **Roles** | 14 | Realm roles, client roles, composite roles |
| **Clients** | 20 | CRUD, secrets, sessions, protocol mappers, service accounts, scope role mappings |
| **Client Scopes** | 11 | CRUD, default/optional scope management |
| **Identity Providers** | 10 | CRUD for providers and attribute/role mappers |
| **Authentication** | 10 | Auth flows, required actions |
| **Organizations** | 8 | CRUD, member management _(Keycloak 26+ only)_ |
| **Events** | 4 | User events, admin audit events |
| **Attack Detection** | 3 | Brute-force status and lockout management |
| **Total** | **128** | Full scope of day-to-day Keycloak administration |

---

## Requirements

- **Node.js** v18+
- A running **Keycloak instance** (v21+ recommended; v26+ for Organizations)
- Admin credentials with full realm access

---

## Installation

**Option A — run directly with npx (no install needed):**

The MCP client configs below use `npx -y @fortytwoservices/keycloak-mcp` which downloads and runs the latest version automatically. No local setup required.

**Option B — Docker (GitHub Container Registry):**

```bash
docker pull ghcr.io/fortytwoservices/keycloak-mcp:latest
```

Use this image in your MCP client config by setting `command` to `docker` and passing environment variables via `-e` flags (see the [Client Setup](#client-setup) examples below). The image is published automatically on each release to [ghcr.io/fortytwoservices/keycloak-mcp](https://ghcr.io/fortytwoservices/keycloak-mcp).

**Option C — install globally:**

```bash
npm install -g @fortytwoservices/keycloak-mcp
```

**Option D — build from source:**

```bash
git clone https://github.com/fortytwoservices/keycloak-mcp.git
cd keycloak-mcp
npm install
npm run build
```

Then set `command` to `node` and `args` to `["dist/index.js"]` in your MCP client config.

---

## Configuration

Set these environment variables in your MCP client config. The server reads `process.env` directly — there is no `.env` file loading.

| Variable | Required | Description | Example |
|----------|:--------:|-------------|---------|
| `KEYCLOAK_URL` | ✅ | Base URL of your Keycloak server (no trailing slash) | `http://localhost:8080` |
| `KEYCLOAK_ADMIN` | ✅ | Admin username | `admin` |
| `KEYCLOAK_ADMIN_PASSWORD` | ✅ | Admin password | `changeme` |
| `MCP_LOG_FILE` | | Path to log file. Default: `keycloak-mcp.log` in cwd. Set to `""` or `"off"` to disable. | `/tmp/mcp.log` |
| `MCP_LOG_STDERR` | | Set to `"1"` to echo every log entry to stderr | `1` |
| `MCP_LOG_LEVEL` | | `tool`, `http`, `network`, or `all` (default: `all`) | `tool,http` |

---

## Client Setup

### Claude Desktop

Config file locations:
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Using npx:**
```json
{
  "mcpServers": {
    "keycloak": {
      "command": "npx",
      "args": ["-y", "@fortytwoservices/keycloak-mcp"],
      "env": {
        "KEYCLOAK_URL": "http://localhost:8080",
        "KEYCLOAK_ADMIN": "admin",
        "KEYCLOAK_ADMIN_PASSWORD": "changeme"
      }
    }
  }
}
```

**Using Docker:**
```json
{
  "mcpServers": {
    "keycloak": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "KEYCLOAK_URL=http://host.docker.internal:8080",
        "-e", "KEYCLOAK_ADMIN=admin",
        "-e", "KEYCLOAK_ADMIN_PASSWORD=changeme",
        "ghcr.io/fortytwoservices/keycloak-mcp:latest"
      ]
    }
  }
}
```

> **Note:** When running in Docker, use `host.docker.internal` instead of `localhost` to reach a Keycloak instance running on your machine.

Restart Claude Desktop after saving. The tools appear under the hammer icon in the chat input.

### VS Code (native MCP)

Config file locations:
- **Windows:** `%APPDATA%\Code\User\mcp.json`
- **macOS/Linux:** `~/.config/Code/User/mcp.json`

> VS Code uses `"servers"` (not `"mcpServers"`) as the top-level key.

**Using npx:**
```json
{
  "servers": {
    "keycloak": {
      "command": "npx",
      "args": ["-y", "@fortytwoservices/keycloak-mcp"],
      "env": {
        "KEYCLOAK_URL": "http://localhost:8080",
        "KEYCLOAK_ADMIN": "admin",
        "KEYCLOAK_ADMIN_PASSWORD": "changeme"
      }
    }
  }
}
```

**Using Docker:**
```json
{
  "servers": {
    "keycloak": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "KEYCLOAK_URL=http://host.docker.internal:8080",
        "-e", "KEYCLOAK_ADMIN=admin",
        "-e", "KEYCLOAK_ADMIN_PASSWORD=changeme",
        "ghcr.io/fortytwoservices/keycloak-mcp:latest"
      ]
    }
  }
}
```

You can also add a workspace-scoped config in `.vscode/mcp.json` at the project root with the same structure.

### Cursor

**Global config:**
- **Windows:** `%USERPROFILE%\.cursor\mcp.json`
- **macOS/Linux:** `~/.cursor/mcp.json`

**Using npx:**
```json
{
  "mcpServers": {
    "keycloak": {
      "command": "npx",
      "args": ["-y", "@fortytwoservices/keycloak-mcp"],
      "env": {
        "KEYCLOAK_URL": "http://localhost:8080",
        "KEYCLOAK_ADMIN": "admin",
        "KEYCLOAK_ADMIN_PASSWORD": "changeme"
      }
    }
  }
}
```

**Using Docker:**
```json
{
  "mcpServers": {
    "keycloak": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "KEYCLOAK_URL=http://host.docker.internal:8080",
        "-e", "KEYCLOAK_ADMIN=admin",
        "-e", "KEYCLOAK_ADMIN_PASSWORD=changeme",
        "ghcr.io/fortytwoservices/keycloak-mcp:latest"
      ]
    }
  }
}
```

**Per-project config:** create `.cursor/mcp.json` at the root of your project with the same structure. Project config takes precedence over global.

After saving, open **Cursor Settings → MCP** and verify `keycloak` appears with a green status indicator.

### Windsurf

Config file:
- **Windows:** `%USERPROFILE%\.codeium\windsurf\mcp_config.json`
- **macOS/Linux:** `~/.codeium/windsurf/mcp_config.json`

**Using npx:**
```json
{
  "mcpServers": {
    "keycloak": {
      "command": "npx",
      "args": ["-y", "@fortytwoservices/keycloak-mcp"],
      "env": {
        "KEYCLOAK_URL": "http://localhost:8080",
        "KEYCLOAK_ADMIN": "admin",
        "KEYCLOAK_ADMIN_PASSWORD": "changeme"
      }
    }
  }
}
```

**Using Docker:**
```json
{
  "mcpServers": {
    "keycloak": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "KEYCLOAK_URL=http://host.docker.internal:8080",
        "-e", "KEYCLOAK_ADMIN=admin",
        "-e", "KEYCLOAK_ADMIN_PASSWORD=changeme",
        "ghcr.io/fortytwoservices/keycloak-mcp:latest"
      ]
    }
  }
}
```

Restart Windsurf after saving. The Cascade panel will show `keycloak` as an available MCP server.

### Google Antigravity

[Google Antigravity](https://antigravity.google/) is Google's next-generation local agent-first IDE (successor to Firebase Studio / Project IDX).

To add a custom MCP server:

1. Open the **Agent panel** (the side panel on the left)
2. Click the **"..."** dropdown at the top of the panel
3. Select **Manage MCP Servers**
4. Click **View raw config**
5. Add the server to the `mcp_config.json` that opens:

**Using npx:**
```json
{
  "mcpServers": {
    "keycloak": {
      "command": "npx",
      "args": ["-y", "@fortytwoservices/keycloak-mcp"],
      "env": {
        "KEYCLOAK_URL": "http://localhost:8080",
        "KEYCLOAK_ADMIN": "admin",
        "KEYCLOAK_ADMIN_PASSWORD": "changeme"
      }
    }
  }
}
```

**Using Docker:**
```json
{
  "mcpServers": {
    "keycloak": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "KEYCLOAK_URL=http://host.docker.internal:8080",
        "-e", "KEYCLOAK_ADMIN=admin",
        "-e", "KEYCLOAK_ADMIN_PASSWORD=changeme",
        "ghcr.io/fortytwoservices/keycloak-mcp:latest"
      ]
    }
  }
}
```

Save the file and the server will appear in the MCP store. See the [Antigravity MCP docs](https://antigravity.google/docs/mcp) for more detail.

---

## Logging

Log entries are written as JSONL to `keycloak-mcp.log` in the server process working directory by default.

Use `Show-McpLog.ps1` (PowerShell) to tail and pretty-print the log:

```powershell
# Last 50 lines (default)
.\Show-McpLog.ps1

# Tail live (Ctrl+C to stop)
.\Show-McpLog.ps1 -Follow

# Filter to tool calls only
.\Show-McpLog.ps1 -Level tool

# Last 100 lines
.\Show-McpLog.ps1 -Last 100
```

`Show-McpLog.ps1` uses `$PSScriptRoot` to locate the log file, so it must sit in the **same directory as the log** (the working directory when the server starts). Run it from the project root. If you change `MCP_LOG_FILE` to a custom path, copy the script next to that file.

---

## Tool Reference

> **Legend:** ✅ required · ☐ optional · ⚠️ destructive (cannot be undone)

---

### Realms (9)

#### `keycloak_list_realms`
List all Keycloak realms. No parameters required.

```
List all realms on this server.
```

---

#### `keycloak_get_realm`
Get the full configuration of a realm.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |

```
Show me the full config of the "customers" realm.
```

---

#### `keycloak_create_realm`
Create a new realm.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Unique realm name (no spaces) |
| `displayName` | string | ☐ | Human-readable display name |
| `enabled` | boolean | ☐ | Active (default: true) |
| `loginWithEmailAllowed` | boolean | ☐ | Allow email as username |
| `registrationAllowed` | boolean | ☐ | Allow self-registration |
| `resetPasswordAllowed` | boolean | ☐ | Allow email password reset |
| `rememberMe` | boolean | ☐ | Enable remember-me |
| `bruteForceProtected` | boolean | ☐ | Enable brute-force protection |

```
Create a realm called "my-app" with self-registration enabled, email login allowed, and brute-force protection on.
```

---

#### `keycloak_update_realm`
Update realm settings. Only provided fields are changed.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `displayName` | string | ☐ | New display name |
| `enabled` | boolean | ☐ | Enable/disable |
| `loginWithEmailAllowed` | boolean | ☐ | Allow email login |
| `registrationAllowed` | boolean | ☐ | Allow self-registration |
| `resetPasswordAllowed` | boolean | ☐ | Allow password reset |
| `rememberMe` | boolean | ☐ | Remember-me |
| `bruteForceProtected` | boolean | ☐ | Brute-force protection |
| `accessTokenLifespan` | integer | ☐ | Access token TTL in seconds |
| `ssoSessionIdleTimeout` | integer | ☐ | SSO idle timeout in seconds |
| `ssoSessionMaxLifespan` | integer | ☐ | SSO max session in seconds |

```
Set the access token lifespan to 300 seconds and enable brute-force protection in the "my-app" realm.
```

---

#### `keycloak_delete_realm` ⚠️
Permanently delete a realm and **all** its users, groups, clients, and data.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |

```
Delete the "test-realm" realm.
```

---

#### `keycloak_clear_user_cache`
Clear the user cache for a realm, forcing objects to be re-fetched from the database.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |

```
Clear the user cache in the "customers" realm.
```

---

#### `keycloak_clear_realm_cache`
Clear the realm configuration cache.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |

```
Clear the realm cache for "customers".
```

---

#### `keycloak_clear_keys_cache`
Clear the signing/encryption keys cache.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |

```
Clear the keys cache in "customers".
```

---

#### `keycloak_get_realm_keys`
Get the active signing and encryption keys for a realm.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |

```
Show me the active signing keys for the "customers" realm.
```

---

### Users (26)

#### `keycloak_list_users`
List or search users in a realm. Supports free-text search and field-specific filters.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `search` | string | ☐ | Free-text search (username, email, name) |
| `email` | string | ☐ | Filter by email (prefix match) |
| `username` | string | ☐ | Filter by username (prefix match) |
| `firstName` | string | ☐ | Filter by first name (prefix match) |
| `lastName` | string | ☐ | Filter by last name (prefix match) |
| `enabled` | boolean | ☐ | Filter by enabled status |
| `max` | integer | ☐ | Max results (default 50) |
| `first` | integer | ☐ | Pagination offset (default 0) |

```
Find all users in the "customers" realm with email ending in "@example.com".
List disabled users in the "my-app" realm.
Search for users named "john" in the "customers" realm.
```

---

#### `keycloak_get_user`
Get full details of a user by UUID.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |

```
Get the full profile of user abc-123 in the "customers" realm.
```

---

#### `keycloak_create_user`
Create a new user. Optionally set an initial password.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `username` | string | ✅ | Username (unique in realm) |
| `email` | string | ☐ | Email address |
| `firstName` | string | ☐ | First name |
| `lastName` | string | ☐ | Last name |
| `enabled` | boolean | ☐ | Enabled (default: true) |
| `emailVerified` | boolean | ☐ | Pre-verify email (default: false) |
| `password` | string | ☐ | Initial password |
| `temporary` | boolean | ☐ | Force password change on first login (default: false) |

```
Create a user "jane.doe" with email jane.doe@example.com in the "customers" realm and set a temporary password "Welcome1!".
```

---

#### `keycloak_update_user`
Update a user's profile. Only provided fields are changed.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |
| `email` | string | ☐ | New email |
| `firstName` | string | ☐ | New first name |
| `lastName` | string | ☐ | New last name |
| `enabled` | boolean | ☐ | Enable/disable account |
| `emailVerified` | boolean | ☐ | Email verification status |

```
Disable user abc-123 in the "customers" realm.
Update the email for user abc-123 to newemail@example.com.
```

---

#### `keycloak_delete_user` ⚠️
Permanently delete a user.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |

```
Delete user abc-123 from the "customers" realm.
```

---

#### `keycloak_reset_password`
Set a new password for a user.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |
| `password` | string | ✅ | New password |
| `temporary` | boolean | ☐ | Force change on next login (default: false) |

```
Reset the password for user abc-123 in "customers" to "NewPass1!" and mark it as temporary.
```

---

#### `keycloak_get_user_credentials`
List credentials (password, OTP, WebAuthn, etc.) for a user.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |

```
What credentials does user abc-123 have in the "customers" realm?
```

---

#### `keycloak_delete_user_credential` ⚠️
Remove a specific credential from a user.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |
| `credential_id` | string | ✅ | Credential UUID (from `keycloak_get_user_credentials`) |

```
Remove the OTP credential cred-xyz from user abc-123 in "customers".
```

---

#### `keycloak_send_verify_email`
Send an email verification link to the user.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |

```
Send a verification email to user abc-123 in "customers".
```

---

#### `keycloak_execute_actions_email`
Send an email asking the user to complete required actions.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |
| `actions` | string[] | ✅ | Action names: `VERIFY_EMAIL`, `UPDATE_PASSWORD`, `UPDATE_PROFILE`, `CONFIGURE_TOTP` |

```
Ask user abc-123 to verify their email and update their password via email.
```

---

#### `keycloak_logout_user`
Terminate all active sessions for a user.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |

```
Log out all sessions for user abc-123 in "customers".
```

---

#### `keycloak_get_user_groups`
List the groups a user belongs to.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |

```
Which groups is user abc-123 a member of in "customers"?
```

---

#### `keycloak_add_user_to_group`
Add a user to a group.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |
| `group_id` | string | ✅ | Group UUID |

```
Add user abc-123 to the "admins" group in "customers".
```

---

#### `keycloak_remove_user_from_group`
Remove a user from a group.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |
| `group_id` | string | ✅ | Group UUID |

```
Remove user abc-123 from the "admins" group in "customers".
```

---

#### `keycloak_get_user_roles`
List the realm-level roles assigned to a user.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |

```
What realm roles does user abc-123 have in "customers"?
```

---

#### `keycloak_assign_realm_roles_to_user`
Assign realm-level roles to a user. Each role needs both `id` and `name`.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |
| `roles` | `{id, name}[]` | ✅ | Roles to assign (get IDs from `keycloak_list_roles`) |

```
Assign the "realm-admin" role to user abc-123 in "customers". First look up the role ID.
```

---

#### `keycloak_get_user_sessions`
List active sessions for a user.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |

```
Show active sessions for user abc-123 in "customers".
```

---

#### `keycloak_get_user_federated_identities`
List federated (social/OIDC) identity links for a user.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |

```
Which social providers is user abc-123 linked to in "customers"?
```

---

#### `keycloak_add_user_federated_identity`
Link a user to an external identity provider.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |
| `provider` | string | ✅ | IDP alias (e.g. `google`, `github`) |
| `userId` | string | ✅ | User ID in the external provider |
| `userName` | string | ✅ | Username in the external provider |

```
Link user abc-123 to their Google account (Google ID: 12345, Google username: jane@gmail.com).
```

---

#### `keycloak_remove_user_federated_identity` ⚠️
Unlink a federated identity from a user.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |
| `provider` | string | ✅ | IDP alias to unlink |

```
Unlink user abc-123's Google identity in "customers".
```

---

#### `keycloak_get_user_consents`
List OAuth scopes the user has approved for each client.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |

```
What OAuth consents has user abc-123 granted in "customers"?
```

---

#### `keycloak_revoke_user_consent` ⚠️
Revoke a client's consent for a user.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |
| `client_id` | string | ✅ | Client ID string (not UUID) |

```
Revoke user abc-123's consent for the "my-spa" client in "customers".
```

---

#### `keycloak_impersonate_user`
Impersonate a user (returns impersonation redirect URL/info).

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |

```
Get an impersonation link for user abc-123 in "customers".
```

---

#### `keycloak_get_user_client_roles`
List client-level roles assigned to a user for a specific client.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |
| `client_uuid` | string | ✅ | Client internal UUID |

```
What roles does user abc-123 have on the "backend-api" client in "customers"?
```

---

#### `keycloak_assign_client_roles_to_user`
Assign client-level roles to a user.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |
| `client_uuid` | string | ✅ | Client internal UUID |
| `roles` | `{id, name}[]` | ✅ | Client roles to assign |

```
Assign the "api-admin" role on the "backend-api" client to user abc-123 in "customers".
```

---

#### `keycloak_remove_client_roles_from_user`
Remove client-level roles from a user.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |
| `client_uuid` | string | ✅ | Client internal UUID |
| `roles` | `{id, name}[]` | ✅ | Client roles to remove |

```
Remove the "api-admin" role from user abc-123 on the "backend-api" client.
```

---

### Groups (13)

#### `keycloak_list_groups`
List top-level groups in a realm.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `search` | string | ☐ | Filter by name (prefix match) |
| `max` | integer | ☐ | Max results (default 100) |
| `first` | integer | ☐ | Pagination offset (default 0) |

```
List all groups in the "customers" realm.
Show groups starting with "admin" in "customers".
```

---

#### `keycloak_get_group`
Get full details of a group including subgroups and attributes.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `group_id` | string | ✅ | Group UUID |

```
Get the details of group grp-123 in "customers".
```

---

#### `keycloak_create_group`
Create a new top-level group.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `name` | string | ✅ | Group name |

```
Create a group called "premium-users" in the "customers" realm.
```

---

#### `keycloak_create_subgroup`
Create a child group under a parent group.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `parent_group_id` | string | ✅ | Parent group UUID |
| `name` | string | ✅ | Subgroup name |

```
Create a subgroup "europe" under the "regions" group in "customers".
```

---

#### `keycloak_update_group`
Rename a group.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `group_id` | string | ✅ | Group UUID |
| `name` | string | ✅ | New group name |

```
Rename group grp-123 to "vip-customers" in "customers".
```

---

#### `keycloak_delete_group` ⚠️
Delete a group. Members are unaffected (not deleted).

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `group_id` | string | ✅ | Group UUID |

```
Delete group grp-123 from the "customers" realm.
```

---

#### `keycloak_get_group_members`
List users that belong to a group.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `group_id` | string | ✅ | Group UUID |
| `max` | integer | ☐ | Max results (default 100) |
| `first` | integer | ☐ | Pagination offset (default 0) |

```
List all members of the "admins" group in "customers".
```

---

#### `keycloak_get_group_roles`
List realm-level roles assigned to a group.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `group_id` | string | ✅ | Group UUID |

```
What realm roles does the "admins" group have in "customers"?
```

---

#### `keycloak_assign_realm_roles_to_group`
Assign realm roles to a group. All members inherit them.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `group_id` | string | ✅ | Group UUID |
| `roles` | `{id, name}[]` | ✅ | Roles to assign |

```
Assign the "realm-admin" role to the "admins" group in "customers".
```

---

#### `keycloak_remove_realm_roles_from_group`
Remove realm roles from a group.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `group_id` | string | ✅ | Group UUID |
| `roles` | `{id, name}[]` | ✅ | Roles to remove |

```
Remove the "realm-admin" role from the "admins" group in "customers".
```

---

#### `keycloak_get_group_client_roles`
List client-level roles assigned to a group for a specific client.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `group_id` | string | ✅ | Group UUID |
| `client_uuid` | string | ✅ | Client internal UUID |

```
What roles does the "backend-team" group have on the "api" client in "customers"?
```

---

#### `keycloak_assign_client_roles_to_group`
Assign client-level roles to a group.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `group_id` | string | ✅ | Group UUID |
| `client_uuid` | string | ✅ | Client internal UUID |
| `roles` | `{id, name}[]` | ✅ | Client roles to assign |

```
Give the "backend-team" group the "api-read" role on the "api" client in "customers".
```

---

#### `keycloak_remove_client_roles_from_group`
Remove client-level roles from a group.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `group_id` | string | ✅ | Group UUID |
| `client_uuid` | string | ✅ | Client internal UUID |
| `roles` | `{id, name}[]` | ✅ | Client roles to remove |

```
Remove the "api-write" role from the "contractors" group on the "api" client.
```

---

### Roles (14)

#### `keycloak_list_roles`
List all realm-level roles.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `search` | string | ☐ | Filter by name (prefix match) |
| `max` | integer | ☐ | Max results (default 100) |
| `first` | integer | ☐ | Pagination offset (default 0) |

```
List all realm roles in "customers".
```

---

#### `keycloak_get_role`
Get details of a realm role by name.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `role_name` | string | ✅ | Role name |

```
Get the details of the "premium" role in "customers".
```

---

#### `keycloak_create_role`
Create a new realm role.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `name` | string | ✅ | Role name (unique in realm) |
| `description` | string | ☐ | Description |

```
Create a realm role called "report-viewer" with description "Read-only access to reports" in "customers".
```

---

#### `keycloak_update_role`
Update a realm role's name or description.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `role_name` | string | ✅ | Current role name |
| `name` | string | ☐ | New role name |
| `description` | string | ☐ | New description |

```
Update the description of the "premium" role in "customers" to "Premium tier subscriber".
```

---

#### `keycloak_delete_role` ⚠️
Permanently delete a realm role.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `role_name` | string | ✅ | Role name |

```
Delete the "legacy-access" role from "customers".
```

---

#### `keycloak_get_role_users`
List users that have a specific realm role assigned.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `role_name` | string | ✅ | Role name |
| `max` | integer | ☐ | Max results (default 50) |
| `first` | integer | ☐ | Pagination offset (default 0) |

```
Who has the "realm-admin" role in "customers"?
```

---

#### `keycloak_list_client_roles`
List all roles defined on a specific client.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `client_uuid` | string | ✅ | Client internal UUID |

```
List all roles on the "backend-api" client in "customers".
```

---

#### `keycloak_get_client_role`
Get details of a specific client role.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `client_uuid` | string | ✅ | Client internal UUID |
| `role_name` | string | ✅ | Role name |

```
Show me details of the "api-admin" role on the "backend-api" client.
```

---

#### `keycloak_create_client_role`
Create a new role on a client.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `client_uuid` | string | ✅ | Client internal UUID |
| `name` | string | ✅ | Role name (unique within client) |
| `description` | string | ☐ | Description |

```
Create an "api-write" role on the "backend-api" client in "customers".
```

---

#### `keycloak_update_client_role`
Update a client role's name or description.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `client_uuid` | string | ✅ | Client internal UUID |
| `role_name` | string | ✅ | Current role name |
| `name` | string | ☐ | New name |
| `description` | string | ☐ | New description |

```
Rename the "api-read" role to "api-reader" on the "backend-api" client.
```

---

#### `keycloak_delete_client_role` ⚠️
Delete a role from a client.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `client_uuid` | string | ✅ | Client internal UUID |
| `role_name` | string | ✅ | Role name |

```
Delete the "legacy-write" role from the "backend-api" client.
```

---

#### `keycloak_get_role_composites`
List the child roles included in a composite realm role.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `role_name` | string | ✅ | Composite role name |

```
What child roles does the "super-admin" composite role include in "customers"?
```

---

#### `keycloak_add_role_composites`
Add child roles to a composite realm role.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `role_name` | string | ✅ | Composite role name |
| `roles` | `{id, name}[]` | ✅ | Roles to include |

```
Make the "super-admin" role a composite that includes "realm-admin" and "report-viewer" in "customers".
```

---

#### `keycloak_remove_role_composites`
Remove child roles from a composite realm role.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `role_name` | string | ✅ | Composite role name |
| `roles` | `{id, name}[]` | ✅ | Roles to remove |

```
Remove "report-viewer" from the "super-admin" composite role in "customers".
```

---

### Clients (20)

#### `keycloak_list_clients`
List clients registered in a realm.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `client_id` | string | ☐ | Filter by clientId (prefix match) |

```
List all clients in "customers".
Show me all clients in "customers" whose clientId starts with "backend".
```

---

#### `keycloak_get_client`
Get the full configuration of a client.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `client_uuid` | string | ✅ | Client internal UUID (the `id` field from `keycloak_list_clients`) |

```
Get the full config of the backend-api client in "customers". First list clients to find its UUID.
```

---

#### `keycloak_create_client`
Register a new client.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `clientId` | string | ✅ | Client ID string (unique in realm) |
| `name` | string | ☐ | Display name |
| `description` | string | ☐ | Description |
| `enabled` | boolean | ☐ | Enabled (default: true) |
| `publicClient` | boolean | ☐ | Public client — no secret (default: false) |
| `protocol` | string | ☐ | `openid-connect` or `saml` (default: `openid-connect`) |
| `redirectUris` | string[] | ☐ | Allowed redirect URIs |
| `webOrigins` | string[] | ☐ | Allowed CORS origins |
| `serviceAccountsEnabled` | boolean | ☐ | Enable service account (client credentials flow) |

```
Create a public OIDC client called "my-spa" with redirect URI "https://app.example.com/*" in "customers".
Create a confidential client "backend-api" with service accounts enabled in "customers".
```

---

#### `keycloak_update_client`
Update client settings.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `client_uuid` | string | ✅ | Client internal UUID |
| `name` | string | ☐ | New display name |
| `description` | string | ☐ | New description |
| `enabled` | boolean | ☐ | Enable/disable |
| `redirectUris` | string[] | ☐ | New redirect URIs |
| `webOrigins` | string[] | ☐ | New CORS origins |
| `publicClient` | boolean | ☐ | Toggle public mode |

```
Add "https://staging.example.com/*" to the redirect URIs of the "my-spa" client.
Disable the "legacy-app" client in "customers".
```

---

#### `keycloak_delete_client` ⚠️
Permanently delete a client.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `client_uuid` | string | ✅ | Client internal UUID |

```
Delete the "old-mobile-app" client from "customers".
```

---

#### `keycloak_get_client_secret`
Get the current client secret of a confidential client.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `client_uuid` | string | ✅ | Client internal UUID |

```
What is the current client secret for "backend-api" in "customers"?
```

---

#### `keycloak_regenerate_client_secret`
Generate a new client secret. The old secret is immediately invalidated.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `client_uuid` | string | ✅ | Client internal UUID |

```
Regenerate the client secret for "backend-api" in "customers".
```

---

#### `keycloak_get_session_stats`
Get active and offline session counts per client in a realm.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |

```
Show session counts for all clients in "customers".
```

---

#### `keycloak_get_client_sessions`
List active user sessions for a specific client.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `client_uuid` | string | ✅ | Client internal UUID |
| `max` | integer | ☐ | Max results (default 50) |
| `first` | integer | ☐ | Pagination offset (default 0) |

```
List all active sessions on the "my-spa" client in "customers".
```

---

#### `keycloak_get_client_offline_sessions`
List offline (refresh token) sessions for a client.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `client_uuid` | string | ✅ | Client internal UUID |

```
List offline sessions for the "mobile-app" client in "customers".
```

---

#### `keycloak_logout_session` ⚠️
Terminate a specific session by ID.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `session_id` | string | ✅ | Session UUID |

```
Terminate session sess-456 in "customers".
```

---

#### `keycloak_list_client_protocol_mappers`
List protocol mappers on a client.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `client_uuid` | string | ✅ | Client internal UUID |

```
List all protocol mappers on the "backend-api" client in "customers".
```

---

#### `keycloak_get_client_protocol_mapper`
Get a specific protocol mapper.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `client_uuid` | string | ✅ | Client internal UUID |
| `mapper_id` | string | ✅ | Mapper UUID |

```
Get details of protocol mapper map-789 on the "backend-api" client.
```

---

#### `keycloak_create_client_protocol_mapper`
Add a protocol mapper to include custom claims in tokens.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `client_uuid` | string | ✅ | Client internal UUID |
| `name` | string | ✅ | Mapper name |
| `protocol` | string | ☐ | Protocol (default: `openid-connect`) |
| `protocolMapper` | string | ✅ | Mapper type (e.g. `oidc-usermodel-attribute-mapper`, `oidc-hardcoded-claim-mapper`) |
| `config` | object | ☐ | Key-value mapper configuration |

```
Add a protocol mapper to "backend-api" that includes the user attribute "department" as a claim in tokens.
```

---

#### `keycloak_update_client_protocol_mapper`
Update an existing protocol mapper.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `client_uuid` | string | ✅ | Client internal UUID |
| `mapper_id` | string | ✅ | Mapper UUID |
| `name` | string | ☐ | New name |
| `config` | object | ☐ | Updated config |

```
Update the "department" mapper on "backend-api" to use claim name "dept" instead.
```

---

#### `keycloak_delete_client_protocol_mapper` ⚠️
Remove a protocol mapper from a client.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `client_uuid` | string | ✅ | Client internal UUID |
| `mapper_id` | string | ✅ | Mapper UUID |

```
Delete protocol mapper map-789 from the "backend-api" client.
```

---

#### `keycloak_get_service_account_user`
Get the service account user entity for a client with service accounts enabled.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `client_uuid` | string | ✅ | Client internal UUID |

```
Get the service account user for the "backend-api" client in "customers".
```

---

#### `keycloak_list_client_scope_role_mappings`
List realm roles included in a client's token scope.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `client_uuid` | string | ✅ | Client internal UUID |

```
Which realm roles appear in access tokens issued for the "backend-api" client?
```

---

#### `keycloak_add_client_scope_role_mappings`
Add realm roles to a client's scope.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `client_uuid` | string | ✅ | Client internal UUID |
| `roles` | `{id, name}[]` | ✅ | Roles to include in token scope |

```
Include the "report-viewer" role in tokens issued by the "backend-api" client.
```

---

#### `keycloak_remove_client_scope_role_mappings`
Remove realm roles from a client's scope.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `client_uuid` | string | ✅ | Client internal UUID |
| `roles` | `{id, name}[]` | ✅ | Roles to exclude from token scope |

```
Remove "legacy-role" from the token scope of the "backend-api" client.
```

---

### Client Scopes (11)

#### `keycloak_list_client_scopes`
List all client scopes in a realm.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |

```
List all client scopes in "customers".
```

---

#### `keycloak_get_client_scope`
Get a client scope by ID.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `scope_id` | string | ✅ | Client scope UUID |

```
Get the details of client scope scope-123 in "customers".
```

---

#### `keycloak_create_client_scope`
Create a new client scope.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `name` | string | ✅ | Scope name |
| `description` | string | ☐ | Description |
| `protocol` | string | ☐ | Protocol (default: `openid-connect`) |

```
Create a client scope called "orders:read" in "customers".
```

---

#### `keycloak_update_client_scope`
Update a client scope.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `scope_id` | string | ✅ | Client scope UUID |
| `name` | string | ☐ | New name |
| `description` | string | ☐ | New description |

```
Update the description of scope-123 to "Read access to orders" in "customers".
```

---

#### `keycloak_delete_client_scope` ⚠️
Delete a client scope.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `scope_id` | string | ✅ | Client scope UUID |

```
Delete the "legacy-scope" client scope from "customers".
```

---

#### `keycloak_list_default_client_scopes`
List default client scopes (automatically assigned to new clients).

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |

```
What are the default client scopes in "customers"?
```

---

#### `keycloak_add_default_client_scope`
Add a scope to the default set.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `scope_id` | string | ✅ | Client scope UUID |

```
Make "orders:read" a default client scope in "customers".
```

---

#### `keycloak_remove_default_client_scope`
Remove a scope from the default set.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `scope_id` | string | ✅ | Client scope UUID |

```
Remove "phone" from the default client scopes in "customers".
```

---

#### `keycloak_list_optional_client_scopes`
List optional client scopes.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |

```
List optional client scopes in "customers".
```

---

#### `keycloak_add_optional_client_scope`
Add a scope to the optional set.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `scope_id` | string | ✅ | Client scope UUID |

```
Make "orders:write" an optional client scope in "customers".
```

---

#### `keycloak_remove_optional_client_scope`
Remove a scope from the optional set.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `scope_id` | string | ✅ | Client scope UUID |

```
Remove "microprofile-jwt" from optional client scopes in "customers".
```

---

### Identity Providers (10)

#### `keycloak_list_identity_providers`
List all identity providers in a realm.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |

```
List all identity providers in "customers".
```

---

#### `keycloak_get_identity_provider`
Get the configuration of a specific identity provider.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `alias` | string | ✅ | IDP alias (e.g. `google`, `github`) |

```
Show the Google identity provider config in "customers".
```

---

#### `keycloak_create_identity_provider`
Add a new identity provider.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `alias` | string | ✅ | Unique alias (used in redirect URIs) |
| `providerId` | string | ✅ | Provider type: `google`, `github`, `facebook`, `microsoft`, `oidc`, `saml`, `keycloak-oidc` |
| `displayName` | string | ☐ | Name shown on login page |
| `enabled` | boolean | ☐ | Enabled (default: true) |
| `trustEmail` | boolean | ☐ | Trust email from IDP without verification |
| `storeToken` | boolean | ☐ | Store the IDP token |
| `config` | object | ☐ | Provider-specific config (`clientId`, `clientSecret`, etc.) |

```
Add a Google identity provider to "customers" with clientId "my-google-app" and clientSecret "secret123".
Configure a GitHub social login for "customers".
```

---

#### `keycloak_update_identity_provider`
Update an existing identity provider.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `alias` | string | ✅ | IDP alias |
| `displayName` | string | ☐ | New display name |
| `enabled` | boolean | ☐ | Enable/disable |
| `trustEmail` | boolean | ☐ | Trust email |
| `storeToken` | boolean | ☐ | Store token |
| `config` | object | ☐ | Config fields to update |

```
Disable the GitHub identity provider in "customers".
Update the Google IDP client secret in "customers".
```

---

#### `keycloak_delete_identity_provider` ⚠️
Remove an identity provider from a realm.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `alias` | string | ✅ | IDP alias |

```
Remove the "twitter" identity provider from "customers".
```

---

#### `keycloak_list_idp_mappers`
List mappers for an identity provider.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `alias` | string | ✅ | IDP alias |

```
List all mappers for the Google identity provider in "customers".
```

---

#### `keycloak_get_idp_mapper`
Get a specific IDP mapper.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `alias` | string | ✅ | IDP alias |
| `mapper_id` | string | ✅ | Mapper UUID |

```
Get the details of IDP mapper map-abc from the Google provider in "customers".
```

---

#### `keycloak_create_idp_mapper`
Create an attribute or role mapper for an identity provider.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `alias` | string | ✅ | IDP alias |
| `name` | string | ✅ | Mapper name |
| `identityProviderMapper` | string | ✅ | Mapper type: `oidc-user-attribute-idp-mapper`, `oidc-role-idp-mapper`, `hardcoded-role-idp-mapper`, `hardcoded-attribute-idp-mapper` |
| `config` | object | ☐ | Mapper configuration |

```
Create a mapper on the Google IDP to store the "picture" claim as the user's "picture" attribute in "customers".
Automatically assign the "google-user" realm role to anyone who logs in via Google.
```

---

#### `keycloak_update_idp_mapper`
Update an IDP mapper's configuration.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `alias` | string | ✅ | IDP alias |
| `mapper_id` | string | ✅ | Mapper UUID |
| `name` | string | ☐ | New name |
| `identityProviderMapper` | string | ☐ | Mapper type |
| `config` | object | ☐ | Updated config |

```
Update the Google picture mapper to store into "avatar" attribute instead.
```

---

#### `keycloak_delete_idp_mapper` ⚠️
Delete an IDP mapper.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `alias` | string | ✅ | IDP alias |
| `mapper_id` | string | ✅ | Mapper UUID |

```
Delete IDP mapper map-abc from the Google provider in "customers".
```

---

### Authentication (10)

#### `keycloak_list_auth_flows`
List all authentication flows in a realm.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |

```
List all authentication flows in "customers".
```

---

#### `keycloak_get_auth_flow`
Get full details of an authentication flow including its execution steps.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `flow_id` | string | ✅ | Flow UUID |

```
Show the execution steps of flow flow-123 in "customers".
```

---

#### `keycloak_copy_auth_flow`
Copy an existing flow under a new alias. Use this to customize built-in flows safely.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `flow_alias` | string | ✅ | Alias of the flow to copy (e.g. `browser`) |
| `new_alias` | string | ✅ | Alias for the copy |

```
Create a copy of the "browser" auth flow called "browser-with-otp" in "customers".
```

---

#### `keycloak_delete_auth_flow` ⚠️
Delete a custom auth flow. Built-in flows cannot be deleted.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `flow_id` | string | ✅ | Flow UUID |

```
Delete the "old-browser-flow" authentication flow from "customers".
```

---

#### `keycloak_list_required_actions`
List all required actions configured in a realm.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |

```
What required actions are configured in "customers"?
```

---

#### `keycloak_get_required_action`
Get details of a required action by alias.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `alias` | string | ✅ | Action alias: `VERIFY_EMAIL`, `UPDATE_PASSWORD`, `UPDATE_PROFILE`, `CONFIGURE_TOTP`, `terms_and_conditions` |

```
Is the VERIFY_EMAIL required action enabled in "customers"?
```

---

#### `keycloak_update_required_action`
Enable/disable a required action or set it as default for new users.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `alias` | string | ✅ | Action alias |
| `enabled` | boolean | ☐ | Enable/disable |
| `defaultAction` | boolean | ☐ | Apply to all new users on first login |
| `priority` | integer | ☐ | Execution priority (lower = earlier) |

```
Make VERIFY_EMAIL a default required action for all new users in "customers".
Disable the terms_and_conditions required action in "customers".
```

---

#### `keycloak_delete_required_action` ⚠️
Remove a required action from a realm.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `alias` | string | ✅ | Action alias |

```
Delete the "custom-compliance" required action from "customers".
```

---

#### `keycloak_list_unregistered_required_actions`
List available required action providers not yet registered in the realm.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |

```
What required actions are available to add to "customers" but not yet registered?
```

---

#### `keycloak_register_required_action`
Register a new required action provider in a realm.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `providerId` | string | ✅ | Provider ID (from `keycloak_list_unregistered_required_actions`) |
| `name` | string | ✅ | Display name |

```
Register the "webauthn-register" required action in "customers".
```

---

### Organizations (8)

> Requires **Keycloak 26+**. Earlier versions return 404.

#### `keycloak_list_organizations`
List organizations in a realm.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |

```
List all organizations in "customers".
```

---

#### `keycloak_get_organization`
Get an organization by ID.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `org_id` | string | ✅ | Organization UUID |

```
Get the details of organization org-123 in "customers".
```

---

#### `keycloak_create_organization`
Create a new organization.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `name` | string | ✅ | Organization name |
| `description` | string | ☐ | Description |
| `domains` | string[] | ☐ | Associated email domains |

```
Create an organization called "Acme Corp" with domain "acmecorp.com" in "customers".
```

---

#### `keycloak_update_organization`
Update an organization.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `org_id` | string | ✅ | Organization UUID |
| `name` | string | ☐ | New name |
| `description` | string | ☐ | New description |
| `domains` | string[] | ☐ | New domain list |

```
Add the domain "acme.io" to the Acme Corp organization in "customers".
```

---

#### `keycloak_delete_organization` ⚠️
Delete an organization.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `org_id` | string | ✅ | Organization UUID |

```
Delete organization org-123 from "customers".
```

---

#### `keycloak_list_organization_members`
List members of an organization.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `org_id` | string | ✅ | Organization UUID |

```
Who are the members of the Acme Corp organization in "customers"?
```

---

#### `keycloak_add_organization_member`
Add a user to an organization.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `org_id` | string | ✅ | Organization UUID |
| `user_id` | string | ✅ | User UUID |

```
Add user abc-123 to the Acme Corp organization in "customers".
```

---

#### `keycloak_remove_organization_member`
Remove a user from an organization.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `org_id` | string | ✅ | Organization UUID |
| `user_id` | string | ✅ | User UUID |

```
Remove user abc-123 from the Acme Corp organization.
```

---

### Events (4)

#### `keycloak_list_events`
List user-facing events (login, logout, register, password reset, etc.).

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `type` | string[] | ☐ | Event types: `LOGIN`, `LOGIN_ERROR`, `LOGOUT`, `REGISTER`, `RESET_PASSWORD`, `UPDATE_EMAIL`, etc. |
| `client` | string | ☐ | Filter by client ID |
| `user` | string | ☐ | Filter by user ID |
| `ipAddress` | string | ☐ | Filter by IP address |
| `dateFrom` | string | ☐ | Start date (ISO 8601) |
| `dateTo` | string | ☐ | End date (ISO 8601) |
| `max` | integer | ☐ | Max results (default 50) |
| `first` | integer | ☐ | Pagination offset (default 0) |

```
Show all failed login events in "customers" in the last 24 hours.
List all REGISTER events for the "my-spa" client in "customers".
```

---

#### `keycloak_list_admin_events`
List admin audit events (changes made via admin console or API).

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `operationTypes` | string[] | ☐ | Operation filter: `CREATE`, `UPDATE`, `DELETE`, `ACTION` |
| `resourceTypes` | string[] | ☐ | Resource filter: `USER`, `GROUP`, `CLIENT`, `REALM`, `ROLE`, etc. |
| `authUser` | string | ☐ | Filter by admin user ID |
| `authRealm` | string | ☐ | Filter by admin realm |
| `authClient` | string | ☐ | Filter by admin client |
| `resourcePath` | string | ☐ | Filter by resource path |
| `dateFrom` | string | ☐ | Start date (ISO 8601) |
| `dateTo` | string | ☐ | End date (ISO 8601) |
| `max` | integer | ☐ | Max results (default 50) |
| `first` | integer | ☐ | Pagination offset (default 0) |

```
Show all admin events for "customers" in the last hour.
List all user deletion events in "customers".
```

---

#### `keycloak_delete_events` ⚠️
Clear the user event log for a realm.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |

```
Clear all user events in "customers".
```

---

#### `keycloak_delete_admin_events` ⚠️
Clear the admin audit event log for a realm.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |

```
Clear the admin event log in "customers".
```

---

### Attack Detection (3)

#### `keycloak_get_brute_force_status`
Get the brute-force lockout status for a specific user.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |

```
Is user abc-123 locked out due to too many failed logins in "customers"?
```

---

#### `keycloak_clear_brute_force_user`
Clear the brute-force lockout for a specific user.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |
| `user_id` | string | ✅ | User UUID |

```
Unlock user abc-123 in "customers" — they have been locked out.
```

---

#### `keycloak_clear_brute_force_realm`
Clear all brute-force lockouts across an entire realm.

| Parameter | Type | Required | Description |
|-----------|------|:--------:|-------------|
| `realm` | string | ✅ | Realm name |

```
Clear all brute-force lockouts in the "customers" realm.
```

---

## Security Notes

- Auth uses ROPC flow against the `master` realm with `admin-cli`. Tokens are cached in process memory and auto-refreshed 10 seconds before expiry.
- **Never commit Keycloak admin credentials** to version control. Use environment variables injected by your MCP client config.
- This server grants the AI the same permissions as the admin account — restrict access appropriately.
- Destructive operations (⚠️) are permanent. Deletions of realms, users, and roles cannot be undone.

---

## License

MIT
