# MCP Public Gateway API Reference

## Overview

The MCP Public Gateway provides external JSON-RPC 2.0 endpoints for Claude Desktop, n8n, Zapier, and other AI/automation platforms to execute W3 Suite business operations through secure, parameterized query templates.

**Base URL:** `https://your-domain.com/api/mcp-public/sse`

## Authentication

### API Key Authentication

All requests require an API key in the `Authorization` header or `X-MCP-Key` header:

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
    ]
  }
}
```

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

**Document Version:** 1.0  
**Last Updated:** 2026-01-01  
**API Version:** 1.0
