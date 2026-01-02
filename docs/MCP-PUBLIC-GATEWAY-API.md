# MCP Public Gateway API Reference

## Overview

The MCP Public Gateway provides external JSON-RPC 2.0 endpoints for Claude Desktop, n8n, Zapier, and other AI/automation platforms to execute W3 Suite business operations through secure, parameterized query templates.

**Base URL (Production):** `https://w3suite.it/api/mcp-public/sse`  
**Base URL (Development):** `https://your-replit-domain.replit.dev/api/mcp-public/sse`

## Authentication

The MCP Public Gateway supports multiple authentication methods:

| Method | Use Case | Complexity |
|--------|----------|------------|
| **API Key in URL** | ChatGPT, Claude Desktop (Recommended) | Simple |
| **API Key in Header** | n8n, Zapier, scripts, automation | Simple |
| **OAuth2 JWT** | Browser apps, advanced integrations | Complex |
| **Hybrid (OAuth2 + API Key)** | Audit trail + granular permissions | Advanced |

---

## ChatGPT Setup (Recommended)

The simplest way to connect ChatGPT to W3 Suite MCP Gateway:

### Step 1: Create API Key in W3 Suite

1. Go to **Impostazioni → MCP Gateway → API Keys**
2. Click **"Nuova API Key"**
3. Name it (e.g., "ChatGPT Production")
4. **Copy the key immediately** (shown only once!)
5. Go to **Permissions** tab and enable the tools you want ChatGPT to use

### Step 2: Configure ChatGPT

1. Go to **ChatGPT → Settings → Connected Apps → MCP**
2. Click **"Add MCP Server"**
3. Enter the URL with your API key:

```
https://w3suite.it/api/mcp-public/sse?api_key=sk_live_YOUR_KEY_HERE
```

4. **Authorization:** Select **"None"** (No authentication required - the API key in the URL handles it)
5. Click **Connect**

### Step 3: Verify Connection

ChatGPT will show:
- ✅ **Connected** status
- List of available tools (based on your API Key permissions)

### How It Works

```
┌─────────────┐     API Key in URL      ┌─────────────────┐
│   ChatGPT   │ ────────────────────────▶ │  MCP Gateway    │
└─────────────┘   ?api_key=sk_live_xxx   └─────────────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │  Lookup Key     │
                                         │  → tenant_id    │
                                         │  → permissions  │
                                         │  → rate limits  │
                                         └─────────────────┘
```

The API Key contains all the context needed:
- **Tenant identification** (which W3 Suite instance)
- **Tool permissions** (which MCP tools can be called)
- **Rate limiting** (requests per minute/day)

---

## Claude Desktop Setup

Claude Desktop also works with API Key in URL:

### Using mcp-remote (Recommended)

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "w3suite": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://w3suite.it/api/mcp-public/sse?api_key=sk_live_YOUR_KEY_HERE"
      ]
    }
  }
}
```

Restart Claude Desktop and the tools will appear automatically.

---

## API Key Authentication (Headers)

For n8n, Zapier, and scripts, provide API key via headers:

```bash
# Using Bearer token
curl -X POST https://your-domain.com/api/mcp-public/sse \
  -H "Authorization: Bearer sk_live_staging_xxxxxxxxxxxx" \
  -H "Content-Type: application/json"

# Using X-MCP-Key header
curl -X POST https://your-domain.com/api/mcp-public/sse \
  -H "X-MCP-Key: sk_live_staging_xxxxxxxxxxxx" \
  -H "Content-Type: application/json"
```

### API Key Format

API keys follow this format:
- `sk_live_{tenant_slug}_{random_hex}` - Production keys
- `sk_test_{tenant_slug}_{random_hex}` - Test keys (development only)

### Creating API Keys

API keys are managed via the MCP API Keys table in the database (`w3suite.mcp_api_keys`).

Required fields:
- `tenantId`: UUID of the tenant
- `name`: Human-readable key name
- `keyHash`: SHA-256 hash of the API key
- `permissions`: JSON array of allowed actions (e.g., `["hr:read", "hr:write"]`)
- `rateLimitPerMinute`: Max requests per minute (0 = unlimited)
- `dailyQuota`: Max requests per day (0 = unlimited)

---

### OAuth2 Authentication

For ChatGPT, Claude Desktop, and browser-based integrations, use OAuth2 with JWT tokens.

#### OAuth2 Endpoints

| Endpoint | Production URL | Development URL |
|----------|----------------|-----------------|
| Authorization | `https://w3suite.it/oauth2/authorize` | `https://your-replit-domain.replit.dev/oauth2/authorize` |
| Token | `https://w3suite.it/oauth2/token` | `https://your-replit-domain.replit.dev/oauth2/token` |
| Revoke | `https://w3suite.it/oauth2/revoke` | `https://your-replit-domain.replit.dev/oauth2/revoke` |
| JWKS | `https://w3suite.it/oauth2/jwks` | `https://your-replit-domain.replit.dev/oauth2/jwks` |

#### Registered Redirect URIs (Production)

| Client | Redirect URIs |
|--------|---------------|
| `w3suite-frontend` | `https://w3suite.it/auth/callback`, `https://*.w3suite.it/auth/callback` |
| `chatgpt-mcp-client` | `https://chatgpt.com/aip/*/oauth/callback` |
| `claude-mcp-client` | `http://127.0.0.1/*/callback`, `http://localhost/*/callback` |
| `n8n-mcp-client` | `https://*/oauth/callback` |
| `zapier-mcp-client` | `https://zapier.com/oauth/callback` |

#### OAuth2 Clients (Pre-Configured)

| Client ID | Type | Use Case |
|-----------|------|----------|
| `chatgpt-mcp-client` | Public (PKCE) | ChatGPT Custom MCP Server |
| `claude-mcp-client` | Public (PKCE) | Claude Desktop via mcp-remote |
| `n8n-mcp-client` | Confidential | n8n workflow automation |
| `zapier-mcp-client` | Confidential | Zapier integrations |

#### OAuth2 Scopes

| Scope | Description |
|-------|-------------|
| `openid` | OpenID Connect standard |
| `profile` | User profile information |
| `tenant_access` | Access tenant data |
| `mcp_read` | Read-only MCP tool access (required) |
| `mcp_write` | Write MCP tool access (mutations, actions) |

#### Using OAuth2 JWT Token

Once you have a JWT token from OAuth2 flow:

```bash
curl -X POST https://your-domain.com/api/mcp-public/sse \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"mcp_hr_list_shifts"}}'
```

#### JWT Token Requirements

The JWT must contain:
- `sub`: User ID (UUID)
- `tenant_id`: Tenant UUID
- `scope`: Space-separated scopes (must include `mcp_read` or `mcp_write`)

Example JWT payload:
```json
{
  "sub": "user-uuid-here",
  "tenant_id": "tenant-uuid-here",
  "scope": "openid tenant_access mcp_read mcp_write",
  "client_id": "chatgpt-mcp-client",
  "iat": 1735689600,
  "exp": 1735693200
}
```

---

### Hybrid Authentication (OAuth2 + API Key)

The MCP Gateway supports a powerful **hybrid authentication** mode that combines OAuth2 for user identity with API Keys for granular tool permissions.

#### How It Works

| Layer | Source | Provides |
|-------|--------|----------|
| **OAuth2 Token** | `Authorization: Bearer eyJ...` | User identity, tenant, audit trail |
| **API Key** | `?api_key=sk_live_xxx` or `X-MCP-Key` header | Granular tool permissions, rate limits |

When **both** are present, the gateway:
1. Validates OAuth2 token for user identity and tenant
2. Validates API Key for tool-level permissions (from `mcp_tool_permissions` table)
3. Verifies tenant match (OAuth tenant must equal API Key tenant)
4. Applies API Key rate limits and department restrictions
5. Logs actions with full user identity (from OAuth)

#### Use Cases

| Scenario | Configuration |
|----------|---------------|
| **Same user, different tool sets** | Create multiple API Keys with different `mcp_tool_permissions` |
| **Department-specific access** | API Key with `allowed_departments: ['hr']` limits to HR tools only |
| **Read-only integrations** | API Key with `allowed_action_types: ['read']` |
| **Audit trail required** | Hybrid mode captures WHO did WHAT |

#### Example: Claude/ChatGPT with Hybrid Auth

```
MCP Server URL: https://w3suite.it/api/mcp-public/sse?api_key=sk_live_staging_abc123
Authentication: OAuth 2.0
```

The user logs in via OAuth (identity), but the API Key controls which tools they can see/use.

#### Example: curl with Hybrid Auth

```bash
curl -X POST "https://w3suite.it/api/mcp-public/sse?api_key=sk_live_staging_abc123" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"mcp_hr_list_shifts"}}'
```

#### Security Considerations

- **Tenant Mismatch Protection**: If OAuth token's tenant doesn't match API Key's tenant, request is rejected with `403 Tenant mismatch`
- **API Key in URL**: While less secure than headers, acceptable for OAuth-authenticated sessions since the API Key only controls permissions (not identity)
- **Audit Trail**: All actions are logged with the OAuth user ID, not just the API Key

---

### Dynamic Client Registration (DCR)

External OAuth2 clients (ChatGPT, Claude) can register dynamically via the `/oauth2/register` endpoint.

#### Registration Request

```bash
curl -X POST https://w3suite.it/oauth2/register \
  -H "Content-Type: application/json" \
  -d '{
    "redirect_uris": ["https://chatgpt.com/connector_platform_oauth_redirect"],
    "client_name": "My ChatGPT Integration",
    "scope": "mcp_read mcp_write tenant_access"
  }'
```

#### Registration Response

```json
{
  "client_id": "dyn_1767366172891_abc123",
  "client_name": "My ChatGPT Integration",
  "redirect_uris": ["https://chatgpt.com/connector_platform_oauth_redirect"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "scope": "mcp_read mcp_write tenant_access",
  "token_endpoint_auth_method": "none",
  "client_id_issued_at": 1767366172
}
```

#### Persistence

Dynamic clients are persisted in the `w3suite.oauth2_dynamic_clients` table and survive server restarts.

---

### Session-Based Login (for External OAuth2 Clients)

When using external OAuth2 clients (ChatGPT, Claude Desktop) and the user's session expires, the system provides a streamlined login experience:

1. **User visits** `/oauth2/authorize?client_id=chatgpt-mcp-client&...`
2. **Backend checks session** - if no valid session exists, redirects to `/login?returnTo=<encoded_oauth2_url>`
3. **User sees styled login page** (not a raw HTML form)
4. **After successful login**, user is redirected back to the OAuth2 authorize endpoint
5. **Backend auto-generates auth code** and redirects to the client's callback

#### Session Login Endpoint

For programmatic session creation (used internally by the login page):

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "user@example.com",
  "password": "password123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "tenantId": "tenant-uuid"
  }
}
```

**Response (Error):**
```json
{
  "error": "invalid_credentials",
  "message": "Credenziali non valide"
}
```

**Note:** This endpoint is used internally by the login page for external OAuth2 client flows. Backend-to-backend integrations should continue using API Keys or Client Credentials.

---

### ChatGPT Custom MCP Server Configuration

In ChatGPT settings, add a new MCP connector:

| Field | Value (Production) |
|-------|---------------------|
| Name | W3 Suite |
| MCP Server URL | `https://w3suite.it/api/mcp-public/sse` |
| Authentication | OAuth 2.0 |
| Authorization URL | `https://w3suite.it/oauth2/authorize` |
| Token URL | `https://w3suite.it/oauth2/token` |
| Client ID | (leave empty - ChatGPT uses DCR) |
| Scopes | `openid tenant_access mcp_read mcp_write` |

**Notes:**
- ChatGPT uses PKCE (Proof Key for Code Exchange) automatically
- ChatGPT registers dynamically via DCR (Dynamic Client Registration)
- The redirect URI `https://chatgpt.com/connector_platform_oauth_redirect` is auto-registered

#### ChatGPT with Hybrid Auth (Optional)

To use granular tool permissions with ChatGPT, append an API Key to the MCP Server URL:

```
MCP Server URL: https://w3suite.it/api/mcp-public/sse?api_key=sk_live_staging_abc123
```

This enables:
- OAuth2 for user identity and tenant
- API Key for filtering which tools ChatGPT can see/use
- Full audit trail with user identity

---

### Claude Desktop with mcp-remote

Configure `claude_desktop_config.json`:

**Production Configuration:**
```json
{
  "mcpServers": {
    "w3suite": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://w3suite.it/api/mcp-public/sse",
        "--oauth-client-id", "claude-mcp-client",
        "--oauth-authorize-url", "https://w3suite.it/oauth2/authorize",
        "--oauth-token-url", "https://w3suite.it/oauth2/token",
        "--oauth-scopes", "openid tenant_access mcp_read mcp_write"
      ]
    }
  }
}
```

**Note:** Claude Desktop uses `mcp-remote` which opens a local browser for OAuth. The redirect URIs `http://127.0.0.1/*/callback` and `http://localhost/*/callback` are pre-registered to support this flow.

---

### OpenAI Responses API (Programmatic)

Use MCP tools directly via OpenAI API with Bearer token:

```python
from openai import OpenAI

client = OpenAI()

response = client.responses.create(
    model="gpt-4.1",
    tools=[{
        "type": "mcp",
        "server_label": "w3suite",
        "server_url": "https://your-domain.com/api/mcp-public/sse",
        "require_approval": "never",
        "headers": {
            "Authorization": "Bearer sk_live_staging_xxxxxxxxxxxx"
        }
    }],
    input="List HR shifts for January 2025"
)

print(response.output_text)
```

## Rate Limiting

### Per-Minute Limits

In-memory rate limiting enforced per API key:
- Default: 60 requests/minute (configurable per key)
- Returns HTTP 429 on limit exceeded

### Daily Quota

Persistent daily quota tracked in database:
- Resets at midnight (server timezone)
- Survives server restarts
- Returns HTTP 429 when quota exhausted

### Rate Limit Response

```json
{
  "error": "Rate limit exceeded: 60 per minute (try again in 45s)"
}
```

## Request Format (JSON-RPC 2.0)

All requests use JSON-RPC 2.0 format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "mcp_hr_list_shifts",
    "arguments": {
      "dateFrom": "2025-01-01",
      "dateTo": "2025-01-31",
      "storeId": "store-uuid",
      "limit": 100
    }
  }
}
```

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `jsonrpc` | string | Yes | Must be "2.0" |
| `id` | number/string | Yes | Request identifier |
| `method` | string | Yes | Must be "tools/call" for MCP operations |
| `params.name` | string | Yes | Tool/action name from mcp_query_templates |
| `params.arguments` | object | No | Parameters for the query template |

## Response Format

### Successful Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "[{\"shift_id\":\"...\",\"user_name\":\"...\"}]"
      }
    ],
    "data": [
      {"shift_id": "...", "user_name": "..."}
    ],
    "meta": {
      "rowCount": 1,
      "tool": "mcp_hr_list_shifts",
      "executedAt": "2026-01-01T12:00:00.000Z"
    }
  }
}
```

- **content**: MCP-compliant format (for Claude Desktop)
- **data**: Structured JSON array (for n8n, Zapier, programmatic access)
- **meta**: Execution metadata

### Error Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params: limit must be a number between 0 and 10000"
  }
}
```

### Error Codes

| Code | Meaning |
|------|---------|
| -32700 | Parse error (invalid JSON) |
| -32600 | Invalid Request (missing required fields) |
| -32601 | Method not found (unknown tool name) |
| -32602 | Invalid params (validation failed) |
| -32603 | Internal error (database/server error) |

## Available Tools

### HR Department

#### `mcp_hr_list_shifts`

List employee shifts within a date range.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `dateFrom` | string | No | 30 days ago | Start date (ISO 8601) |
| `dateTo` | string | No | Today | End date (ISO 8601) |
| `storeId` | string (UUID) | No | All stores | Filter by store |
| `userId` | string (UUID) | No | All users | Filter by user |
| `status` | string | No | All statuses | Shift status filter |
| `limit` | number | No | 100 | Max results (1-10000) |
| `offset` | number | No | 0 | Pagination offset |

**Example:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "mcp_hr_list_shifts",
    "arguments": {
      "dateFrom": "2025-01-01",
      "dateTo": "2025-01-15",
      "limit": 50
    }
  }
}
```

#### `mcp_hr_list_leave_requests`

List HR leave/absence requests.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `dateFrom` | string | No | 30 days ago | Start date |
| `dateTo` | string | No | Today | End date |
| `status` | string | No | All | Request status |
| `category` | string | No | All | Leave category |
| `limit` | number | No | 100 | Max results |

#### `mcp_hr_user_analytics`

Get HR analytics for a specific user.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `userId` | string (UUID) | Yes | Target user ID |
| `year` | number | No | Current year |

### WMS Department

#### `mcp_wms_inventory_summary`

Get current inventory summary across stores.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `storeId` | string (UUID) | No | Filter by store |
| `productType` | string | No | Filter by product type |

#### `mcp_wms_movements`

List inventory movements (inbound/outbound).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `dateFrom` | string | No | Start date |
| `dateTo` | string | No | End date |
| `movementType` | string | No | INBOUND/OUTBOUND |
| `limit` | number | No | Max results |

### CRM Department

#### `mcp_crm_customers`

List customer profiles.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `searchTerm` | string | No | Search by name/email |
| `segment` | string | No | Customer segment filter |
| `limit` | number | No | Max results |

#### `mcp_crm_leads`

List CRM leads.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `pipelineId` | string (UUID) | No | Filter by pipeline |
| `status` | string | No | Lead status |
| `limit` | number | No | Max results |

### Sales Department

#### `mcp_sales_transactions`

List POS transactions.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `dateFrom` | string | No | Start date |
| `dateTo` | string | No | End date |
| `storeId` | string (UUID) | No | Filter by store |
| `limit` | number | No | Max results |

## Security Features

### SQL Injection Protection

All queries use PostgreSQL parameterized queries via `pool.query()`:

```typescript
// SAFE: Parameters are bound, not concatenated
const result = await pool.query(
  "SELECT * FROM shifts WHERE tenant_id = $1 AND date >= $2",
  [tenantId, dateFrom]
);
```

### Tenant Isolation (RLS)

- TenantId is injected from API key authentication context
- Clients cannot override or specify tenant_id
- Row Level Security (RLS) policies enforced at database level

### Numeric Validation

All numeric parameters (limit, offset, year) are validated:
- Must be integers
- Range: 0-10000
- Invalid values return JSON-RPC error -32602

### String Length Validation

String parameters exceeding 500 characters are rejected. Suspicious SQL patterns are logged (but not blocked since parameterized queries are used).

### Proxy-Aware IP Detection

For clients behind load balancers or CDNs, the gateway reads client IP from:
1. `X-Forwarded-For` header (first IP in chain)
2. `X-Real-IP` header
3. Direct connection IP (fallback)

This ensures IP allowlists work correctly when deployed behind Nginx, Cloudflare, or other proxies.

### Permissions

API keys have granular permissions:
- `hr:read` - Read HR data
- `hr:write` - Modify HR data
- `wms:read` - Read WMS data
- `crm:read` - Read CRM data
- `sales:read` - Read sales data

## Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "w3suite": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "https://your-domain.com/api/mcp-public/sse",
        "-H", "Authorization: Bearer sk_live_staging_xxxx",
        "-H", "Content-Type: application/json"
      ]
    }
  }
}
```

## n8n Integration

Use the HTTP Request node with:

- **Method:** POST
- **URL:** `https://your-domain.com/api/mcp-public/sse`
- **Headers:**
  - `Authorization: Bearer sk_live_staging_xxxx`
  - `Content-Type: application/json`
- **Body (JSON):**

```json
{
  "jsonrpc": "2.0",
  "id": "{{$runIndex}}",
  "method": "tools/call",
  "params": {
    "name": "mcp_hr_list_shifts",
    "arguments": {
      "dateFrom": "{{$now.minus(30, 'days').toISODate()}}",
      "limit": 50
    }
  }
}
```

## Zapier Integration

Use the Webhooks by Zapier action:

1. **Action:** POST
2. **URL:** `https://your-domain.com/api/mcp-public/sse`
3. **Headers:**
   - `Authorization: Bearer sk_live_staging_xxxx`
   - `Content-Type: application/json`
4. **Data Pass-Through:** Custom payload

## VPS Deployment

When deploying to VPS, the MCP gateway is accessible at:

```
https://w3suite.it/api/mcp-public/sse
```

### Deployment Details

| Component | Path |
|-----------|------|
| Backend Bundle | `/var/www/w3suite/apps/backend/api/dist/server.cjs` |
| Start Script | `/var/www/w3suite/start-w3-api.sh` |
| PM2 Process | `w3-api` (port 3004) |
| Frontend Dist | `/var/www/w3suite/apps/frontend/web/dist/` |

### Nginx Configuration

Nginx reverse proxy automatically routes:
- `/api/*` → Backend (port 3004)
- `/oauth2/*` → Backend OAuth2 server (port 3004)
- `/*` → Frontend static files

### Environment Requirements

Production frontend must be built with:
```bash
VITE_AUTH_MODE=oauth2 VITE_FONT_SCALE=80 npx vite build
```

## Troubleshooting

### "Authentication failed"

- Verify API key is valid and not revoked
- Check key format: `sk_live_{tenant}_{hash}` or `sk_test_{tenant}_{hash}`
- Ensure tenant exists and is active

### "Rate limit exceeded"

- Wait for the cooldown period (shown in error message)
- Consider increasing `rateLimitPerMinute` for the API key
- Check if daily quota is exhausted

### "Tool not found"

- Verify tool name matches exactly (e.g., `mcp_hr_list_shifts`)
- Check API key has permission for the tool's department
- Ensure tool is enabled in `mcp_query_templates`

### Empty results

- Check date range parameters
- Verify tenant has data in the requested time period
- Check store/user filters match existing records

---

## Quick Reference

### Production URLs

| Service | URL |
|---------|-----|
| MCP Gateway (SSE) | `https://w3suite.it/api/mcp-public/sse` |
| OAuth2 Authorize | `https://w3suite.it/oauth2/authorize` |
| OAuth2 Token | `https://w3suite.it/oauth2/token` |
| OAuth2 JWKS | `https://w3suite.it/oauth2/jwks` |
| MCP Gateway Admin UI | `https://w3suite.it/staging/settings/mcp-gateway` |

### Pre-Registered OAuth2 Clients

| Client ID | Type | PKCE | Redirect Pattern |
|-----------|------|------|------------------|
| `w3suite-frontend` | Public | Required | `https://w3suite.it/auth/callback`, `https://*.w3suite.it/auth/callback` |
| `chatgpt-mcp-client` | Public | Required | `https://chatgpt.com/aip/*/oauth/callback` |
| `claude-mcp-client` | Public | Required | `http://127.0.0.1/*/callback`, `http://localhost/*/callback` |
| `n8n-mcp-client` | Confidential | Optional | `https://*/oauth/callback` |
| `zapier-mcp-client` | Confidential | Optional | `https://zapier.com/oauth/callback` |

---

**Document Version:** 2.1  
**Last Updated:** 2026-01-01  
**API Version:** 2.0 (Hybrid Auth: API Key + OAuth2)
