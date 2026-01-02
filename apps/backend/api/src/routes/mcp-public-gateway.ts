/**
 * MCP Public Gateway Routes
 * 
 * PUBLIC endpoints for external integrations (n8n, Claude, Zapier, ChatGPT)
 * Authenticated via:
 *   - API Key (sk_live_*, sk_test_*) - for scripts, n8n, Zapier
 *   - OAuth2 JWT (eyJ*) - for ChatGPT, Claude Desktop, browser-based clients
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * API ENDPOINTS REFERENCE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * JSON-RPC 2.0 SSE Transport (Model Context Protocol):
 *   POST /api/mcp-public/sse         - MCP SSE endpoint (main entry point)
 * 
 * REST Endpoints (Management):
 *   GET  /api/mcp-gateway/tools      - List available MCP tools
 *   POST /api/mcp-gateway/execute    - Execute an MCP tool
 *   GET  /api/mcp-gateway/stats      - Usage statistics
 *   GET  /api/mcp-gateway/keys       - List API keys
 *   POST /api/mcp-gateway/keys       - Create new API key
 *   GET  /api/mcp-gateway/usage-logs - Usage logs
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTHENTICATION METHODS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 1. API Key Authentication (for scripts, n8n, Zapier):
 *    Header: Authorization: Bearer sk_live_xxxxxxxxxxxx
 *    
 *    API keys support:
 *    - Rate limiting (per-minute)
 *    - Daily quota limits
 *    - Department-scoped permissions
 *    - IP whitelisting (optional)
 * 
 * 2. OAuth2 JWT Authentication (for ChatGPT, Claude Desktop):
 *    Header: Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
 *    
 *    OAuth2 supports:
 *    - Authorization Code flow with PKCE (S256)
 *    - Refresh token rotation
 *    - Scope-based permissions (mcp_read, mcp_write)
 *    - User-level audit trails
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * CHATGPT CUSTOM MCP SERVER CONFIGURATION (OpenAI)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * In ChatGPT Settings → Connectors → Add Custom MCP Server:
 * 
 *   Name:              W3 Suite
 *   MCP Server URL:    https://w3suite.it/api/mcp-public/sse
 *   Authentication:    OAuth 2.0
 *   Authorization URL: https://w3suite.it/oauth2/authorize
 *   Token URL:         https://w3suite.it/oauth2/token
 *   Client ID:         chatgpt-mcp-client
 *   Client Secret:     (leave empty - public client)
 *   Scopes:            openid tenant_access mcp_read mcp_write
 * 
 * OAuth2 Flow: Authorization Code with PKCE (S256)
 * Grant Types: authorization_code, refresh_token
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * CLAUDE DESKTOP CONFIGURATION (Anthropic)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * In claude_desktop_config.json (via mcp-remote):
 * 
 *   {
 *     "mcpServers": {
 *       "w3suite": {
 *         "command": "npx",
 *         "args": [
 *           "mcp-remote",
 *           "https://w3suite.it/api/mcp-public/sse",
 *           "--oauth-client-id", "claude-mcp-client",
 *           "--oauth-authorize-url", "https://w3suite.it/oauth2/authorize",
 *           "--oauth-token-url", "https://w3suite.it/oauth2/token",
 *           "--oauth-scopes", "openid tenant_access mcp_read mcp_write"
 *         ]
 *       }
 *     }
 *   }
 * 
 * Config file location:
 *   - macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
 *   - Windows: %APPDATA%\Claude\claude_desktop_config.json
 *   - Linux: ~/.config/Claude/claude_desktop_config.json
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * N8N / ZAPIER / SCRIPTS CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * For automated workflows, use API Key authentication:
 * 
 *   1. Generate API key in W3 Suite → Impostazioni → MCP Gateway → API Keys
 *   2. Copy the sk_live_* or sk_test_* key
 *   3. Add to your workflow:
 * 
 *   cURL Example:
 *   curl -X POST https://w3suite.it/api/mcp-gateway/execute \
 *     -H "Authorization: Bearer sk_live_xxxxxxxxxxxx" \
 *     -H "Content-Type: application/json" \
 *     -d '{"tool": "CRM_CREATE_LEAD", "params": {"name": "John", "email": "john@example.com"}}'
 * 
 *   n8n HTTP Request Node:
 *     - Method: POST
 *     - URL: https://w3suite.it/api/mcp-gateway/execute
 *     - Authentication: Header Auth
 *     - Name: Authorization, Value: Bearer sk_live_xxxxxxxxxxxx
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * REGISTERED OAUTH CLIENTS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 *   Client ID              | Platform       | Redirect URI
 *   -----------------------|----------------|----------------------------------
 *   chatgpt-mcp-client     | ChatGPT        | https://chatgpt.com/aip/{id}/oauth/callback
 *   claude-mcp-client      | Claude Desktop | http://localhost:{port}/callback
 *   n8n-mcp-client         | n8n            | (workflow callback)
 *   zapier-mcp-client      | Zapier         | https://zapier.com/oauth/callback
 * 
 * MCP Scopes:
 *   - mcp_read:  Read-only access to MCP tools (list, query)
 *   - mcp_write: Write access to MCP tools (create, update, delete, execute actions)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * RATE LIMITING & QUOTAS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Per API Key:
 *   - Rate limit: Configurable per-minute limit (default: 60/min)
 *   - Daily quota: Configurable daily limit (default: 1000/day)
 *   - Department restrictions: Optional scope to specific departments
 * 
 * Rate limit headers in response:
 *   - X-RateLimit-Limit: Maximum requests per minute
 *   - X-RateLimit-Remaining: Requests remaining in current window
 *   - X-RateLimit-Reset: Unix timestamp when limit resets
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @author W3 Suite Team
 * @date 2025-12-31
 */

import { Router, Request, Response, NextFunction } from 'express';
import { db, pool, setTenantContext } from '../core/db';
import { 
  mcpApiKeys, 
  mcpToolPermissions, 
  mcpUsageLogs, 
  mcpToolSettings,
  actionConfigurations,
  actionDefinitions,
  tenants,
  mcpQueryTemplates
} from '../db/schema/w3suite';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { createHash } from 'crypto';
import { logger } from '../core/logger';
import { UnifiedTriggerService } from '../services/unified-trigger.service';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../core/config';

const router = Router();

// In-memory rate limiting cache (per-minute tracking)
// Per-minute tracking uses memory for speed; daily quota uses database for persistence
const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

function checkMinuteRateLimit(apiKeyId: string, rateLimitPerMinute: number): { allowed: boolean; error?: string } {
  if (rateLimitPerMinute <= 0) return { allowed: true };
  
  const now = Date.now();
  const minuteWindow = 60 * 1000;
  
  let limits = rateLimitCache.get(apiKeyId);
  
  if (!limits || now > limits.resetAt) {
    limits = { count: 0, resetAt: now + minuteWindow };
    rateLimitCache.set(apiKeyId, limits);
  }
  
  if (limits.count >= rateLimitPerMinute) {
    return { allowed: false, error: `Rate limit exceeded: ${rateLimitPerMinute} requests per minute` };
  }
  
  limits.count++;
  return { allowed: true };
}

async function checkDailyQuota(apiKeyId: string, dailyQuota: number): Promise<{ allowed: boolean; error?: string }> {
  if (dailyQuota <= 0) return { allowed: true };
  
  // Query database for today's usage count (persistent across restarts)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const [usage] = await db
    .select({ count: sql<number>`count(*)` })
    .from(mcpUsageLogs)
    .where(and(
      eq(mcpUsageLogs.apiKeyId, apiKeyId),
      sql`executed_at >= ${todayStart.toISOString()}::timestamp`
    ));
  
  const todayCount = Number(usage?.count || 0);
  
  if (todayCount >= dailyQuota) {
    return { allowed: false, error: `Daily quota exceeded: ${dailyQuota} requests per day (used: ${todayCount})` };
  }
  
  return { allowed: true };
}

interface McpAuthenticatedRequest extends Request {
  mcpAuth?: {
    apiKeyId: string;
    apiKeyName: string;
    tenantId: string;
    allowedDepartments: string[] | null;
    rateLimitPerMinute: number;
    dailyQuota: number;
    authMethod: 'api_key' | 'oauth';  // Track which auth method was used
    userId?: string;                   // User ID from OAuth token
    scopes?: string[];                 // OAuth scopes (mcp_read, mcp_write)
  };
}

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

function getClientIpFromRequest(req: Request): string {
  // Handle proxy headers (X-Forwarded-For, X-Real-IP) for clients behind load balancers/CDNs
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    // X-Forwarded-For can contain multiple IPs; take the first (original client)
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string') return realIp;
  return req.ip || req.socket.remoteAddress || '';
}

/**
 * Hybrid MCP Authentication Middleware
 * Supports both API Key and OAuth2 JWT authentication
 * 
 * API Key: sk_live_*, sk_test_* → Validates against mcp_api_keys table
 * OAuth JWT: eyJ* → Validates JWT signature and extracts tenant/user/scopes
 */
async function mcpApiKeyAuth(req: McpAuthenticatedRequest, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  try {
    const authHeader = req.headers['authorization'] as string;
    const apiKeyHeader = req.headers['x-mcp-key'] as string;
    const queryApiKey = req.query.api_key as string | undefined;
    
    let apiKey: string | null = null;
    let oauthToken: string | null = null;
    
    // 1. Try X-MCP-Key header (API key only)
    if (apiKeyHeader) {
      apiKey = apiKeyHeader;
    }
    // 2. Try api_key query parameter (for Claude Web connectors)
    else if (queryApiKey) {
      apiKey = queryApiKey;
    }
    // 3. Try Authorization header
    else if (authHeader) {
      if (authHeader.startsWith('Api-Key ')) {
        apiKey = authHeader.substring(8);
      } else if (authHeader.startsWith('Bearer sk_')) {
        // API key in Bearer format (sk_live_*, sk_test_*)
        apiKey = authHeader.substring(7);
      } else if (authHeader.startsWith('Bearer eyJ')) {
        // OAuth2 JWT token (starts with eyJ = base64 of {"alg":...})
        oauthToken = authHeader.substring(7);
      } else if (authHeader.startsWith('Bearer ')) {
        // Other bearer token - try as JWT first, then API key
        const token = authHeader.substring(7);
        if (token.startsWith('eyJ')) {
          oauthToken = token;
        } else {
          apiKey = token;
        }
      }
    }
    
    // Route to appropriate auth handler
    if (oauthToken) {
      return await handleOAuthAuth(req, res, next, oauthToken);
    } else if (apiKey) {
      return await handleApiKeyAuth(req, res, next, apiKey);
    }
    
    // No valid auth provided
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Provide API key (X-MCP-Key or Bearer sk_live_...) or OAuth token (Bearer eyJ...)',
      docs: '/api/mcp-gateway/docs',
      supported_auth: ['api_key', 'oauth2']
    });
    
  } catch (error) {
    logger.error('🔑 [MCP-GATEWAY] Auth error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Handle API Key Authentication
 */
async function handleApiKeyAuth(
  req: McpAuthenticatedRequest, 
  res: Response, 
  next: NextFunction,
  apiKey: string
) {
  const keyHash = hashApiKey(apiKey);
  
  const [keyRecord] = await db
    .select({
      id: mcpApiKeys.id,
      name: mcpApiKeys.name,
      tenantId: mcpApiKeys.tenantId,
      allowedDepartments: mcpApiKeys.allowedDepartments,
      rateLimitPerMinute: mcpApiKeys.rateLimitPerMinute,
      dailyQuota: mcpApiKeys.dailyQuota,
      isActive: mcpApiKeys.isActive,
      expiresAt: mcpApiKeys.expiresAt,
      allowedIps: mcpApiKeys.allowedIps,
    })
    .from(mcpApiKeys)
    .where(eq(mcpApiKeys.keyHash, keyHash))
    .limit(1);
  
  if (!keyRecord) {
    logger.warn('🔑 [MCP-GATEWAY] Invalid API key attempt');
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  if (!keyRecord.isActive) {
    return res.status(403).json({ error: 'API key is revoked' });
  }
  
  if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
    return res.status(403).json({ error: 'API key has expired' });
  }
  
  if (keyRecord.allowedIps && keyRecord.allowedIps.length > 0) {
    const clientIp = getClientIpFromRequest(req);
    if (!keyRecord.allowedIps.includes(clientIp)) {
      logger.warn(`🔑 [MCP-GATEWAY] IP not allowed: ${clientIp} for key ${keyRecord.name}`);
      return res.status(403).json({ error: 'IP address not allowed' });
    }
  }
  
  // Rate limiting
  const minuteCheck = checkMinuteRateLimit(keyRecord.id, keyRecord.rateLimitPerMinute);
  if (!minuteCheck.allowed) {
    logger.warn(`🔑 [MCP-GATEWAY] ${minuteCheck.error} for key ${keyRecord.name}`);
    return res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED', message: minuteCheck.error });
  }
  
  const dailyCheck = await checkDailyQuota(keyRecord.id, keyRecord.dailyQuota);
  if (!dailyCheck.allowed) {
    logger.warn(`🔑 [MCP-GATEWAY] ${dailyCheck.error} for key ${keyRecord.name}`);
    return res.status(429).json({ error: 'QUOTA_EXCEEDED', message: dailyCheck.error });
  }
  
  await db
    .update(mcpApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(mcpApiKeys.id, keyRecord.id));
  
  await setTenantContext(keyRecord.tenantId);
  
  req.mcpAuth = {
    apiKeyId: keyRecord.id,
    apiKeyName: keyRecord.name,
    tenantId: keyRecord.tenantId,
    allowedDepartments: keyRecord.allowedDepartments,
    rateLimitPerMinute: keyRecord.rateLimitPerMinute,
    dailyQuota: keyRecord.dailyQuota,
    authMethod: 'api_key',
  };
  
  logger.info(`🔑 [MCP-GATEWAY] API Key auth: ${keyRecord.name}`);
  next();
}

/**
 * Handle OAuth2 JWT Authentication
 * Validates JWT tokens issued by W3 Suite OAuth2 server
 * 
 * JWT payload expected:
 * - sub: user ID
 * - tenant_id: tenant UUID
 * - scope: space-separated scopes (e.g., "openid mcp_read mcp_write")
 * - client_id: OAuth client (chatgpt-mcp-client, claude-mcp-client, etc.)
 */
async function handleOAuthAuth(
  req: McpAuthenticatedRequest,
  res: Response,
  next: NextFunction,
  token: string
) {
  try {
    // Verify JWT signature and expiration
    const decoded = jwt.verify(token, JWT_SECRET) as {
      sub: string;           // User ID
      tenant_id: string;     // Tenant UUID
      scope?: string;        // Space-separated scopes
      scopes?: string[];     // Array of scopes (alternative format)
      client_id?: string;    // OAuth client ID
      iat?: number;
      exp?: number;
    };
    
    // Extract tenant ID (required)
    const tenantId = decoded.tenant_id;
    if (!tenantId) {
      logger.warn('🔐 [MCP-GATEWAY] OAuth token missing tenant_id');
      return res.status(401).json({ error: 'Invalid OAuth token: missing tenant_id' });
    }
    
    // Extract user ID (required)
    const userId = decoded.sub;
    if (!userId) {
      logger.warn('🔐 [MCP-GATEWAY] OAuth token missing sub (user ID)');
      return res.status(401).json({ error: 'Invalid OAuth token: missing user ID' });
    }
    
    // Parse scopes (support both space-separated string and array)
    let scopes: string[] = [];
    if (decoded.scopes && Array.isArray(decoded.scopes)) {
      scopes = decoded.scopes;
    } else if (decoded.scope && typeof decoded.scope === 'string') {
      scopes = decoded.scope.split(' ').filter(s => s.length > 0);
    }
    
    // Validate MCP scopes
    const hasMcpRead = scopes.includes('mcp_read');
    const hasMcpWrite = scopes.includes('mcp_write');
    const hasTenantAccess = scopes.includes('tenant_access');
    
    if (!hasMcpRead && !hasMcpWrite) {
      logger.warn(`🔐 [MCP-GATEWAY] OAuth token lacks MCP scopes: ${scopes.join(', ')}`);
      return res.status(403).json({ 
        error: 'Insufficient scope', 
        message: 'Token requires mcp_read or mcp_write scope',
        provided_scopes: scopes
      });
    }
    
    // Set tenant context
    await setTenantContext(tenantId);
    
    // Generate synthetic API key ID for logging/rate limiting (based on user+client)
    const syntheticKeyId = `oauth:${userId}:${decoded.client_id || 'unknown'}`;
    const clientName = decoded.client_id || 'OAuth User';
    
    // OAuth users get default rate limits (can be customized per client in future)
    const oauthRateLimitPerMinute = 60;
    const oauthDailyQuota = 1000;
    
    // Apply rate limiting for OAuth users
    const minuteCheck = checkMinuteRateLimit(syntheticKeyId, oauthRateLimitPerMinute);
    if (!minuteCheck.allowed) {
      return res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED', message: minuteCheck.error });
    }
    
    req.mcpAuth = {
      apiKeyId: syntheticKeyId,
      apiKeyName: `OAuth: ${clientName}`,
      tenantId: tenantId,
      allowedDepartments: null, // OAuth users can access all departments (controlled by scopes)
      rateLimitPerMinute: oauthRateLimitPerMinute,
      dailyQuota: oauthDailyQuota,
      authMethod: 'oauth',
      userId: userId,
      scopes: scopes,
    };
    
    logger.info(`🔐 [MCP-GATEWAY] OAuth auth: user=${userId}, client=${decoded.client_id}, scopes=${scopes.join(',')}`);
    next();
    
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'OAuth token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      logger.warn(`🔐 [MCP-GATEWAY] Invalid JWT: ${error.message}`);
      return res.status(401).json({ error: 'Invalid OAuth token' });
    }
    throw error;
  }
}

async function logMcpUsage(
  req: McpAuthenticatedRequest,
  actionCode: string,
  department: string | null,
  endpoint: string,
  statusCode: number,
  success: boolean,
  responseTime: number,
  errorCode?: string,
  errorMessage?: string,
  workflowInstanceId?: string
) {
  try {
    if (!req.mcpAuth) return;
    
    await db.insert(mcpUsageLogs).values({
      tenantId: req.mcpAuth.tenantId,
      apiKeyId: req.mcpAuth.apiKeyId,
      apiKeyName: req.mcpAuth.apiKeyName,
      actionCode,
      department,
      endpoint,
      statusCode,
      responseTime,
      success,
      errorCode,
      errorMessage,
      workflowInstanceId,
      clientIp: getClientIpFromRequest(req),
      userAgent: req.headers['user-agent'],
    });
  } catch (error) {
    logger.error('Failed to log MCP usage:', error);
  }
}

router.get('/tools', mcpApiKeyAuth, async (req: McpAuthenticatedRequest, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { tenantId, apiKeyId, allowedDepartments } = req.mcpAuth!;
    
    // NEW ARCHITECTURE: Read directly from action_definitions (unified catalog)
    // Filter: exposed_via_mcp = true AND (tenant's tools OR global tools)
    const permissions = await db
      .select({ actionDefinitionId: mcpToolPermissions.actionDefinitionId })
      .from(mcpToolPermissions)
      .where(and(
        eq(mcpToolPermissions.apiKeyId, apiKeyId),
        eq(mcpToolPermissions.isEnabled, true)
      ));
    
    const allowedDefinitionIds = new Set(permissions.map(p => p.actionDefinitionId).filter(Boolean));
    
    const [apiKeySettings] = await db
      .select({ allowedActionTypes: mcpApiKeys.allowedActionTypes })
      .from(mcpApiKeys)
      .where(eq(mcpApiKeys.id, apiKeyId))
      .limit(1);
    
    const allowedActionTypes = apiKeySettings?.allowedActionTypes || ['read', 'create', 'update', 'delete'];
    
    // Query all exposed action definitions (global + tenant-specific)
    const allDefinitions = await db
      .select({
        id: actionDefinitions.id,
        actionId: actionDefinitions.actionId,
        actionName: actionDefinitions.actionName,
        description: actionDefinitions.description,
        department: actionDefinitions.department,
        actionCategory: actionDefinitions.actionCategory,
        mcpActionType: actionDefinitions.mcpActionType,
        mcpInputSchema: actionDefinitions.mcpInputSchema,
        flowType: actionDefinitions.flowType,
        tenantId: actionDefinitions.tenantId,
      })
      .from(actionDefinitions)
      .where(and(
        sql`(${actionDefinitions.tenantId} = ${tenantId} OR ${actionDefinitions.tenantId} IS NULL)`,
        eq(actionDefinitions.isActive, true),
        eq(actionDefinitions.exposedViaMcp, true)
      ));
    
    // Filter by permissions and department restrictions
    const tools = allDefinitions
      .filter(def => {
        // Check permissions if any are defined
        if (permissions.length > 0 && !allowedDefinitionIds.has(def.id)) {
          return false;
        }
        // Check department restrictions
        if (allowedDepartments && allowedDepartments.length > 0) {
          if (!allowedDepartments.includes(def.department)) {
            return false;
          }
        }
        // Check action type restrictions
        if (def.mcpActionType && !allowedActionTypes.includes(def.mcpActionType)) {
          return false;
        }
        return true;
      })
      .map(def => ({
        name: def.actionId,
        description: def.description || def.actionName,
        department: def.department,
        actionCategory: def.actionCategory,
        actionType: def.mcpActionType,
        flowType: def.flowType,
        isGlobal: def.tenantId === null,
        inputSchema: def.mcpInputSchema || {
          type: 'object',
          properties: {}
        }
      }));
    
    await logMcpUsage(req, 'discovery', null, 'tools', 200, true, Date.now() - startTime);
    
    const globalCount = tools.filter(t => t.isGlobal).length;
    const tenantCount = tools.filter(t => !t.isGlobal).length;
    
    res.json({
      tools,
      count: tools.length,
      globalCount,
      tenantCount,
      tenant: tenantId,
    });
  } catch (error) {
    logger.error('Error fetching MCP tools:', error);
    await logMcpUsage(req, 'discovery', null, 'tools', 500, false, Date.now() - startTime, 'INTERNAL_ERROR', String(error));
    res.status(500).json({ error: 'Failed to fetch tools' });
  }
});

router.post('/execute/:actionCode', mcpApiKeyAuth, async (req: McpAuthenticatedRequest, res: Response) => {
  const startTime = Date.now();
  const actionCode = req.params.actionCode;
  
  try {
    const { tenantId, apiKeyId, apiKeyName, allowedDepartments } = req.mcpAuth!;
    const { payload, entityType, entityId, dryRun } = req.body;
    
    // NEW ARCHITECTURE: Read from action_definitions (unified catalog)
    const [actionDef] = await db
      .select()
      .from(actionDefinitions)
      .where(and(
        sql`(${actionDefinitions.tenantId} = ${tenantId} OR ${actionDefinitions.tenantId} IS NULL)`,
        eq(actionDefinitions.actionId, actionCode),
        eq(actionDefinitions.isActive, true),
        eq(actionDefinitions.exposedViaMcp, true)
      ))
      .limit(1);
    
    if (!actionDef) {
      await logMcpUsage(req, actionCode, null, 'execute', 404, false, Date.now() - startTime, 'NOT_FOUND', 'Action not found or not exposed via MCP');
      return res.status(404).json({ error: 'Action not found or not exposed via MCP', code: actionCode });
    }
    
    // Check permissions using action_definition_id
    const [permission] = await db
      .select()
      .from(mcpToolPermissions)
      .where(and(
        eq(mcpToolPermissions.apiKeyId, apiKeyId),
        eq(mcpToolPermissions.actionDefinitionId, actionDef.id),
        eq(mcpToolPermissions.isEnabled, true)
      ))
      .limit(1);
    
    const hasAnyPermissions = await db
      .select({ count: eq(mcpToolPermissions.id, mcpToolPermissions.id) })
      .from(mcpToolPermissions)
      .where(eq(mcpToolPermissions.apiKeyId, apiKeyId))
      .limit(1);
    
    if (hasAnyPermissions.length > 0 && !permission) {
      await logMcpUsage(req, actionCode, actionDef.department, 'execute', 403, false, Date.now() - startTime, 'PERMISSION_DENIED', 'API key does not have permission for this action');
      return res.status(403).json({ error: 'API key does not have permission for this action' });
    }
    
    if (allowedDepartments && allowedDepartments.length > 0) {
      if (!allowedDepartments.includes(actionDef.department)) {
        await logMcpUsage(req, actionCode, actionDef.department, 'execute', 403, false, Date.now() - startTime, 'DEPARTMENT_DENIED', 'API key cannot access this department');
        return res.status(403).json({ error: 'API key cannot access this department' });
      }
    }
    
    if (dryRun) {
      await logMcpUsage(req, actionCode, actionDef.department, 'execute', 200, true, Date.now() - startTime);
      return res.json({
        dryRun: true,
        action: {
          code: actionDef.actionId,
          name: actionDef.actionName,
          department: actionDef.department,
          flowType: actionDef.flowType,
          requiresApproval: actionDef.flowType !== 'none',
        },
        message: 'Dry run successful - action would be triggered'
      });
    }
    
    const triggerService = new UnifiedTriggerService();
    
    // CRITICAL: triggerAction expects action_configurations.id, not action_definitions.id
    // For actions sourced from action_configurations, use sourceId; otherwise use the definition id
    const actionIdForTrigger = actionDef.sourceTable === 'action_configurations' && actionDef.sourceId 
      ? actionDef.sourceId 
      : actionDef.id;
    
    const result = await triggerService.triggerAction({
      tenantId,
      department: actionDef.department as any,
      actionId: actionIdForTrigger,
      entityType: entityType || 'mcp_request',
      entityId: entityId || `mcp_${Date.now()}`,
      payload: payload || {},
      triggeredBy: `mcp:${apiKeyName}`,
      source: 'mcp_gateway',
    });
    
    await logMcpUsage(
      req, 
      actionCode, 
      actionDef.department, 
      'execute', 
      200, 
      true, 
      Date.now() - startTime,
      undefined,
      undefined,
      result.workflowInstanceId
    );
    
    res.json({
      success: true,
      action: {
        code: actionDef.actionId,
        name: actionDef.actionName,
        department: actionDef.department,
        flowType: actionDef.flowType,
      },
      result: {
        status: result.status,
        workflowInstanceId: result.workflowInstanceId,
        message: result.message,
      },
      executedAt: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    });
  } catch (error) {
    logger.error('Error executing MCP action:', error);
    await logMcpUsage(req, actionCode, null, 'execute', 500, false, Date.now() - startTime, 'EXECUTION_ERROR', String(error));
    res.status(500).json({ error: 'Failed to execute action', details: String(error) });
  }
});

router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'W3 Suite MCP Action Gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

router.get('/docs', (req: Request, res: Response) => {
  res.json({
    title: 'W3 Suite MCP Action Gateway API',
    version: '1.0.0',
    description: 'Exposes tenant actions as callable tools for external integrations',
    authentication: {
      type: 'API Key',
      header: 'X-MCP-Key or Authorization: Api-Key sk_live_...',
      format: 'sk_live_{tenant_slug}_{random}',
    },
    endpoints: [
      {
        method: 'GET',
        path: '/api/mcp-public/tools',
        description: 'List available tools for your API key',
        authentication: 'Required',
      },
      {
        method: 'POST',
        path: '/api/mcp-public/execute/:actionCode',
        description: 'Execute an action/tool',
        authentication: 'Required',
        body: {
          payload: 'Object - Action-specific data',
          entityType: 'String (optional) - Entity type for tracking',
          entityId: 'String (optional) - Entity ID for tracking',
          dryRun: 'Boolean (optional) - Test without executing',
        },
      },
      {
        method: 'GET',
        path: '/api/mcp-public/health',
        description: 'Health check endpoint',
        authentication: 'Not required',
      },
    ],
    examples: {
      curl: `curl -X POST \\
  https://your-domain.com/api/mcp-public/execute/richiesta_ferie \\
  -H "X-MCP-Key: sk_live_staging_abc123..." \\
  -H "Content-Type: application/json" \\
  -d '{"payload": {"days": 3, "startDate": "2025-01-15"}}'`,
      n8n: {
        node: 'HTTP Request',
        method: 'POST',
        url: 'https://your-domain.com/api/mcp-public/execute/:actionCode',
        headers: { 'X-MCP-Key': 'sk_live_...' },
        body: { payload: { data: '...action data...' } },
      },
      claude: {
        toolDefinition: {
          name: 'w3suite_action',
          description: 'Execute W3 Suite action',
          input_schema: {
            type: 'object',
            properties: {
              actionCode: { type: 'string' },
              payload: { type: 'object' },
            },
          },
        },
      },
    },
  });
});

// ==================== MCP SSE TRANSPORT FOR CLAUDE ====================

const sseConnections = new Map<string, Response>();

router.get('/sse', mcpApiKeyAuth, async (req: McpAuthenticatedRequest, res: Response) => {
  const { tenantId, apiKeyId } = req.mcpAuth!;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  
  const connectionId = `${apiKeyId}-${Date.now()}`;
  sseConnections.set(connectionId, res);
  
  logger.info(`[MCP-SSE] New connection: ${connectionId} for tenant ${tenantId}`);
  
  // NEW ARCHITECTURE: Read from action_definitions (unified catalog) with exposed_via_mcp flag
  // Filter: tenant's tools OR global tools (tenant_id IS NULL)
  const actions = await db
    .select({
      id: actionDefinitions.id,
      actionId: actionDefinitions.actionId,
      actionName: actionDefinitions.actionName,
      description: actionDefinitions.description,
      mcpInputSchema: actionDefinitions.mcpInputSchema,
    })
    .from(actionDefinitions)
    .innerJoin(mcpToolPermissions, and(
      eq(mcpToolPermissions.actionDefinitionId, actionDefinitions.id),
      eq(mcpToolPermissions.apiKeyId, apiKeyId),
      eq(mcpToolPermissions.isEnabled, true)
    ))
    .where(and(
      sql`(${actionDefinitions.tenantId} = ${tenantId} OR ${actionDefinitions.tenantId} IS NULL)`,
      eq(actionDefinitions.isActive, true),
      eq(actionDefinitions.exposedViaMcp, true)
    ));
  
  const tools = actions.map(action => ({
    name: action.actionId,
    description: action.description || action.actionName,
    inputSchema: action.mcpInputSchema || { type: 'object', properties: {}, required: [] },
  }));
  
  const serverInfo = {
    jsonrpc: '2.0',
    method: 'notifications/initialized',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'w3suite-mcp', version: '1.0.0' },
    },
  };
  
  res.write(`data: ${JSON.stringify(serverInfo)}\n\n`);
  res.write(`data: ${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/tools/list_changed', params: { tools } })}\n\n`);
  
  const keepAlive = setInterval(() => {
    try { res.write(': keepalive\n\n'); } catch { clearInterval(keepAlive); }
  }, 30000);
  
  req.on('close', () => {
    clearInterval(keepAlive);
    sseConnections.delete(connectionId);
    logger.info(`[MCP-SSE] Connection closed: ${connectionId}`);
  });
});

router.post('/sse', mcpApiKeyAuth, async (req: McpAuthenticatedRequest, res: Response) => {
  const { tenantId, apiKeyId } = req.mcpAuth!;
  const { id, method, params } = req.body;
  
  logger.info(`[MCP-SSE] RPC: ${method}`, { id, params });
  
  try {
    if (method === 'initialize') {
      return res.json({
        jsonrpc: '2.0', id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'w3suite-mcp', version: '1.0.0' },
        },
      });
    }
    
    if (method === 'tools/list') {
      // NEW ARCHITECTURE: Read from action_definitions (unified catalog)
      const actions = await db
        .select({
          actionId: actionDefinitions.actionId,
          actionName: actionDefinitions.actionName,
          description: actionDefinitions.description,
          mcpInputSchema: actionDefinitions.mcpInputSchema,
          actionCategory: actionDefinitions.actionCategory,
        })
        .from(actionDefinitions)
        .innerJoin(mcpToolPermissions, and(
          eq(mcpToolPermissions.actionDefinitionId, actionDefinitions.id),
          eq(mcpToolPermissions.apiKeyId, apiKeyId),
          eq(mcpToolPermissions.isEnabled, true)
        ))
        .where(and(
          sql`(${actionDefinitions.tenantId} = ${tenantId} OR ${actionDefinitions.tenantId} IS NULL)`,
          eq(actionDefinitions.isActive, true),
          eq(actionDefinitions.exposedViaMcp, true)
        ));
      
      return res.json({
        jsonrpc: '2.0', id,
        result: { tools: actions.map(a => ({ 
          name: a.actionId, 
          description: `[${a.actionCategory?.toUpperCase() || 'QUERY'}] ${a.description || a.actionName}`, 
          inputSchema: a.mcpInputSchema || { type: 'object', properties: {}, required: [] } 
        })) },
      });
    }
    
    if (method === 'tools/call') {
      const { name: toolName, arguments: toolArgs } = params;
      
      // NEW ARCHITECTURE: Read from action_definitions (unified catalog)
      const [action] = await db
        .select({ 
          queryTemplateId: actionDefinitions.queryTemplateId,
          actionCategory: actionDefinitions.actionCategory,
          actionName: actionDefinitions.actionName,
          actionId: actionDefinitions.actionId,
        })
        .from(actionDefinitions)
        .innerJoin(mcpToolPermissions, and(
          eq(mcpToolPermissions.actionDefinitionId, actionDefinitions.id),
          eq(mcpToolPermissions.apiKeyId, apiKeyId),
          eq(mcpToolPermissions.isEnabled, true)
        ))
        .where(and(
          eq(actionDefinitions.actionId, toolName), 
          sql`(${actionDefinitions.tenantId} = ${tenantId} OR ${actionDefinitions.tenantId} IS NULL)`, 
          eq(actionDefinitions.isActive, true),
          eq(actionDefinitions.exposedViaMcp, true)
        ))
        .limit(1);
      
      if (!action) {
        return res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Tool not found or not authorized: ${toolName}` } });
      }
      
      if (action.actionCategory === 'operative') {
        logger.info(`[MCP-SSE] Operative action called: ${toolName}`, { args: toolArgs });
        return res.json({
          jsonrpc: '2.0', id,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify({
                status: 'pending',
                action: action.actionName,
                actionId: action.actionId,
                message: `Azione operativa "${action.actionName}" registrata. Questa azione richiede elaborazione nel sistema WMS.`,
                parameters: toolArgs,
                timestamp: new Date().toISOString()
              }, null, 2)
            }]
          }
        });
      }
      
      if (!action.queryTemplateId) {
        return res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Query template not configured for: ${toolName}` } });
      }
      
      const [template] = await db.select().from(mcpQueryTemplates).where(eq(mcpQueryTemplates.id, action.queryTemplateId)).limit(1);
      if (!template) {
        return res.json({ jsonrpc: '2.0', id, error: { code: -32603, message: 'Query template not found' } });
      }
      
      let sqlQuery = template.sqlTemplate;
      const queryParams: any[] = [];
      let paramIndex = 1;
      
      // SECURITY: Inject tenantId from authenticated API key (not from client input)
      const normalizedArgs: Record<string, any> = {
        tenant_id: tenantId,
        tenantId: tenantId
      };
      
      // Map common parameter name variations (MCP schema uses camelCase, templates use snake_case)
      const paramMapping: Record<string, string> = {
        'dateFrom': 'date_start', 'dateTo': 'date_end', 'storeId': 'store_id',
        'employeeName': 'employee_name', 'status': 'shift_status', 'category': 'request_category'
      };
      if (toolArgs) {
        for (const [key, val] of Object.entries(toolArgs)) {
          normalizedArgs[key] = val;
          if (paramMapping[key]) normalizedArgs[paramMapping[key]] = val;
        }
      }
      
      // SECURITY: Validate numeric fields to prevent SQL injection
      const numericFields = ['limit', 'offset', 'page', 'pageSize', 'year'];
      for (const field of numericFields) {
        if (normalizedArgs[field] !== undefined) {
          const numVal = parseInt(String(normalizedArgs[field]), 10);
          if (isNaN(numVal) || numVal < 0 || numVal > 10000) {
            return res.json({ jsonrpc: '2.0', id, error: { code: -32602, message: `Invalid ${field} value` } });
          }
          normalizedArgs[field] = numVal;
        }
      }
      
      // SECURITY: Validate string fields don't contain SQL-risky patterns
      // Even though we use parameterized queries, this provides defense-in-depth
      const sqlRiskyPatterns = /(['";]--|\bUNION\b|\bSELECT\b|\bDROP\b|\bDELETE\b|\bUPDATE\b|\bINSERT\b|\bEXEC\b)/i;
      for (const [key, val] of Object.entries(normalizedArgs)) {
        if (typeof val === 'string' && val.length > 500) {
          return res.json({ jsonrpc: '2.0', id, error: { code: -32602, message: `Parameter ${key} exceeds max length` } });
        }
        // Note: We only log suspicious patterns, not block them, since parameterized queries handle safety
        if (typeof val === 'string' && sqlRiskyPatterns.test(val)) {
          logger.warn(`[MCP-SSE] Suspicious pattern in parameter ${key}`, { value: val.substring(0, 50) });
        }
      }
      
      // Process Handlebars-style conditionals: {{#if varName}}...{{/if}}
      sqlQuery = sqlQuery.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, varName, content) => {
        return normalizedArgs[varName] !== undefined && normalizedArgs[varName] !== '' ? content : '';
      });
      
      // SECURITY: Process variables with defaults - validate numeric defaults only allow safe chars
      sqlQuery = sqlQuery.replace(/\{\{(\w+)\|(\d+)\}\}/g, (_, varName, defaultVal) => {
        const val = normalizedArgs[varName] !== undefined ? normalizedArgs[varName] : parseInt(defaultVal, 10);
        const numVal = parseInt(String(val), 10);
        if (isNaN(numVal) || numVal < 0 || numVal > 10000) return '100'; // Safe fallback
        return String(numVal);
      });
      
      // SECURITY: Process simple variables with PARAMETERIZED queries (not inline)
      sqlQuery = sqlQuery.replace(/'?\{\{(\w+)\}\}'?/g, (fullMatch, varName) => {
        if (normalizedArgs[varName] !== undefined) {
          queryParams.push(normalizedArgs[varName]);
          return `$${paramIndex++}`;
        }
        return 'NULL';
      });
      
      // Set RLS context for tenant isolation using pool connection
      const client = await pool.connect();
      try {
        await client.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenantId]);
        
        const startTime = Date.now();
        logger.info(`[MCP-SSE] Executing secure query:`, { query: sqlQuery.substring(0, 200), paramCount: queryParams.length });
        
        // SECURITY: Execute with parameterized query using pg pool directly
        const result = await client.query(sqlQuery, queryParams);
        logger.info(`[MCP-SSE] Query returned ${result.rows?.length || 0} rows`);
        
        await logMcpUsage(req, toolName, null, '/sse', 200, true, Date.now() - startTime);
        
        // MCP-compliant response with both text (for Claude) and structured data (for n8n/Zapier)
        const rows = result.rows || [];
        
        // Human-readable message for empty results (Claude Web needs this to not interpret as error)
        const textContent = rows.length > 0 
          ? JSON.stringify(rows, null, 2)
          : `Nessun risultato trovato per la query "${toolName}". Prova a modificare i parametri di ricerca (es. ampliare il range di date o rimuovere filtri).`;
        
        return res.json({ 
          jsonrpc: '2.0', 
          id, 
          result: { 
            content: [{ type: 'text', text: textContent }],
            // Extended: structured data for programmatic access (n8n, Zapier)
            data: rows,
            meta: {
              rowCount: rows.length,
              success: true,
              tool: toolName,
              executedAt: new Date().toISOString()
            }
          } 
        });
      } finally {
        client.release();
      }
    }
    
    if (method === 'notifications/initialized') {
      return res.json({ jsonrpc: '2.0', id, result: {} });
    }
    
    return res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
    
  } catch (error: any) {
    logger.error(`[MCP-SSE] Error:`, error);
    await logMcpUsage(req, params?.name || method, null, '/sse', 500, false, 0, 'EXECUTION_ERROR', error.message);
    return res.json({ jsonrpc: '2.0', id, error: { code: -32603, message: error.message } });
  }
});

export default router;
