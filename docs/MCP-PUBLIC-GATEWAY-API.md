# MCP Public Gateway API Reference

## Overview

The MCP Public Gateway provides external JSON-RPC 2.0 endpoints for Claude Desktop, n8n, Zapier, and other AI/automation platforms to execute W3 Suite business operations through secure, parameterized query templates.

**Base URL:** `https://your-domain.com/api/mcp-public/sse`

## Authentication

The MCP Public Gateway supports **hybrid authentication** - you can use either API Keys or OAuth2 tokens:

| Method | Token Format | Use Case |
|--------|--------------|----------|
| **API Key** | `sk_live_*`, `sk_test_*` | n8n, Zapier, scripts, automation |
| **OAuth2 JWT** | `eyJ*` (JWT) | ChatGPT, Claude Desktop, browser apps |

### API Key Authentication

Provide API key via `Authorization` header or `X-MCP-Key` header:

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

| Endpoint | URL |
|----------|-----|
| Authorization | `https://your-domain.com/oauth2/authorize` |
| Token | `https://your-domain.com/oauth2/token` |
| Revoke | `https://your-domain.com/oauth2/revoke` |
| JWKS | `https://your-domain.com/oauth2/jwks` |

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

### ChatGPT Custom MCP Server Configuration

In ChatGPT settings, add a new MCP connector:

| Field | Value |
|-------|-------|
| Name | W3 Suite |
| MCP Server URL | `https://your-domain.com/api/mcp-public/sse` |
| Authentication | OAuth 2.0 |
| Authorization URL | `https://your-domain.com/oauth2/authorize` |
| Token URL | `https://your-domain.com/oauth2/token` |
| Client ID | `chatgpt-mcp-client` |
| Scopes | `openid tenant_access mcp_read mcp_write` |

---

### Claude Desktop with mcp-remote

Configure `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "w3suite": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://your-domain.com/api/mcp-public/sse",
        "--oauth-client-id", "claude-mcp-client",
        "--oauth-authorize-url", "https://your-domain.com/oauth2/authorize",
        "--oauth-token-url", "https://your-domain.com/oauth2/token",
        "--oauth-scopes", "openid tenant_access mcp_read mcp_write"
      ]
    }
  }
}
```

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
https://w3suite.yourdomain.com/api/mcp-public/sse
```

Nginx configuration automatically proxies requests to the backend API.

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

**Document Version:** 2.0  
**Last Updated:** 2026-01-01  
**API Version:** 2.0 (Hybrid Auth: API Key + OAuth2)
