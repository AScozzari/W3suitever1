/**
 * MCP Public Gateway Routes
 * 
 * PUBLIC endpoints for external integrations (n8n, Claude, Zapier, ChatGPT)
 * Authenticated via:
 *   - API Key (sk_live_*, sk_test_*) - for scripts, n8n, Zapier
 *   - OAuth2 JWT (eyJ*) - for ChatGPT, Claude Desktop, browser-based clients
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * CHATGPT CUSTOM MCP SERVER CONFIGURATION (OpenAI)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * In ChatGPT Settings → Connectors → Add Custom MCP Server:
 * 
 *   Name:              W3 Suite
 *   MCP Server URL:    https://your-domain.com/api/mcp-public/sse
 *   Authentication:    OAuth 2.0
 *   Authorization URL: https://your-domain.com/oauth2/authorize
 *   Token URL:         https://your-domain.com/oauth2/token
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
 *           "https://your-domain.com/api/mcp-public/sse",
 *           "--oauth-client-id", "claude-mcp-client",
 *           "--oauth-authorize-url", "https://your-domain.com/oauth2/authorize",
 *           "--oauth-token-url", "https://your-domain.com/oauth2/token",
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
    
    let apiKey: string | null = null;
    let oauthToken: string | null = null;
    
    // 1. Try X-MCP-Key header (API key only)
    if (apiKeyHeader) {
      apiKey = apiKeyHeader;
    } 
    // 2. Try Authorization header
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
    
    let whereCondition = and(
      eq(mcpToolSettings.tenantId, tenantId),
      eq(mcpToolSettings.exposedViaMcp, true)
    );
    
    const exposedSettings = await db
      .select({
        actionConfigId: mcpToolSettings.actionConfigId,
        customToolName: mcpToolSettings.customToolName,
        customToolDescription: mcpToolSettings.customToolDescription,
        parametersSchema: mcpToolSettings.parametersSchema,
      })
      .from(mcpToolSettings)
      .where(whereCondition);
    
    const customActions = await db
      .select({
        id: actionConfigurations.id,
        code: actionConfigurations.code,
        name: actionConfigurations.name,
        description: actionConfigurations.description,
        department: actionConfigurations.department,
        mcpActionType: actionConfigurations.mcpActionType,
        mcpInputSchema: actionConfigurations.mcpInputSchema,
      })
      .from(actionConfigurations)
      .where(and(
        eq(actionConfigurations.tenantId, tenantId),
        eq(actionConfigurations.isActive, true),
        eq(actionConfigurations.isCustomAction, true)
      ));
    
    const actionIds = exposedSettings.map(s => s.actionConfigId);
    
    const permissions = await db
      .select({ actionConfigId: mcpToolPermissions.actionConfigId })
      .from(mcpToolPermissions)
      .where(and(
        eq(mcpToolPermissions.apiKeyId, apiKeyId),
        eq(mcpToolPermissions.isEnabled, true)
      ));
    
    const allowedActionIds = new Set(permissions.map(p => p.actionConfigId));
    
    const standardActions = actionIds.length > 0 ? await db
      .select({
        id: actionConfigurations.id,
        code: actionConfigurations.code,
        name: actionConfigurations.name,
        description: actionConfigurations.description,
        department: actionConfigurations.department,
        flowType: actionConfigurations.flowType,
      })
      .from(actionConfigurations)
      .where(and(
        eq(actionConfigurations.tenantId, tenantId),
        eq(actionConfigurations.isActive, true),
        inArray(actionConfigurations.id, actionIds)
      )) : [];
    
    const settingsMap = new Map(exposedSettings.map(s => [s.actionConfigId, s]));
    
    const standardTools = standardActions
      .filter(action => {
        if (permissions.length > 0 && !allowedActionIds.has(action.id)) {
          return false;
        }
        if (allowedDepartments && allowedDepartments.length > 0) {
          if (!allowedDepartments.includes(action.department)) {
            return false;
          }
        }
        return true;
      })
      .map(action => {
        const settings = settingsMap.get(action.id);
        return {
          name: settings?.customToolName || action.code,
          description: settings?.customToolDescription || action.description || action.name,
          department: action.department,
          flowType: action.flowType,
          isCustomAction: false,
          inputSchema: settings?.parametersSchema || {
            type: 'object',
            properties: {
              payload: { type: 'object', description: 'Action payload data' }
            }
          }
        };
      });
    
    const [apiKeySettings] = await db
      .select({
        allowedActionTypes: mcpApiKeys.allowedActionTypes,
      })
      .from(mcpApiKeys)
      .where(eq(mcpApiKeys.id, apiKeyId))
      .limit(1);
    
    const allowedActionTypes = apiKeySettings?.allowedActionTypes || ['read', 'create', 'update', 'delete'];
    
    const customTools = customActions
      .filter(action => {
        if (permissions.length > 0 && !allowedActionIds.has(action.id)) {
          return false;
        }
        if (allowedDepartments && allowedDepartments.length > 0) {
          if (!allowedDepartments.includes(action.department)) {
            return false;
          }
        }
        if (action.mcpActionType && !allowedActionTypes.includes(action.mcpActionType)) {
          return false;
        }
        return true;
      })
      .map(action => ({
        name: action.code,
        description: action.description || action.name,
        department: action.department,
        actionType: action.mcpActionType,
        isCustomAction: true,
        inputSchema: action.mcpInputSchema || {
          type: 'object',
          properties: {}
        }
      }));
    
    const tools = [...standardTools, ...customTools];
    
    await logMcpUsage(req, 'discovery', null, 'tools', 200, true, Date.now() - startTime);
    
    res.json({
      tools,
      count: tools.length,
      standardCount: standardTools.length,
      customCount: customTools.length,
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
    
    const [action] = await db
      .select()
      .from(actionConfigurations)
      .where(and(
        eq(actionConfigurations.tenantId, tenantId),
        eq(actionConfigurations.code, actionCode),
        eq(actionConfigurations.isActive, true)
      ))
      .limit(1);
    
    if (!action) {
      await logMcpUsage(req, actionCode, null, 'execute', 404, false, Date.now() - startTime, 'NOT_FOUND', 'Action not found');
      return res.status(404).json({ error: 'Action not found', code: actionCode });
    }
    
    const [toolSettings] = await db
      .select()
      .from(mcpToolSettings)
      .where(and(
        eq(mcpToolSettings.tenantId, tenantId),
        eq(mcpToolSettings.actionConfigId, action.id),
        eq(mcpToolSettings.exposedViaMcp, true)
      ))
      .limit(1);
    
    if (!toolSettings) {
      await logMcpUsage(req, actionCode, action.department, 'execute', 403, false, Date.now() - startTime, 'NOT_EXPOSED', 'Action not exposed via MCP');
      return res.status(403).json({ error: 'Action not exposed via MCP', code: actionCode });
    }
    
    const [permission] = await db
      .select()
      .from(mcpToolPermissions)
      .where(and(
        eq(mcpToolPermissions.apiKeyId, apiKeyId),
        eq(mcpToolPermissions.actionConfigId, action.id),
        eq(mcpToolPermissions.isEnabled, true)
      ))
      .limit(1);
    
    const hasAnyPermissions = await db
      .select({ count: eq(mcpToolPermissions.id, mcpToolPermissions.id) })
      .from(mcpToolPermissions)
      .where(eq(mcpToolPermissions.apiKeyId, apiKeyId))
      .limit(1);
    
    if (hasAnyPermissions.length > 0 && !permission) {
      await logMcpUsage(req, actionCode, action.department, 'execute', 403, false, Date.now() - startTime, 'PERMISSION_DENIED', 'API key does not have permission for this action');
      return res.status(403).json({ error: 'API key does not have permission for this action' });
    }
    
    if (allowedDepartments && allowedDepartments.length > 0) {
      if (!allowedDepartments.includes(action.department)) {
        await logMcpUsage(req, actionCode, action.department, 'execute', 403, false, Date.now() - startTime, 'DEPARTMENT_DENIED', 'API key cannot access this department');
        return res.status(403).json({ error: 'API key cannot access this department' });
      }
    }
    
    if (dryRun) {
      await logMcpUsage(req, actionCode, action.department, 'execute', 200, true, Date.now() - startTime);
      return res.json({
        dryRun: true,
        action: {
          code: action.code,
          name: action.name,
          department: action.department,
          flowType: action.flowType,
          requiresApproval: action.flowType !== 'none',
        },
        message: 'Dry run successful - action would be triggered'
      });
    }
    
    const triggerService = new UnifiedTriggerService();
    
    const result = await triggerService.triggerAction({
      tenantId,
      department: action.department as any,
      actionId: action.id,
      entityType: entityType || 'mcp_request',
      entityId: entityId || `mcp_${Date.now()}`,
      payload: payload || {},
      triggeredBy: `mcp:${apiKeyName}`,
      source: 'mcp_gateway',
    });
    
    await logMcpUsage(
      req, 
      actionCode, 
      action.department, 
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
        code: action.code,
        name: action.name,
        department: action.department,
        flowType: action.flowType,
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
  
  const actions = await db
    .select({
      id: actionConfigurations.id,
      actionId: actionConfigurations.actionId,
      actionName: actionConfigurations.actionName,
      description: actionConfigurations.description,
      mcpInputSchema: actionConfigurations.mcpInputSchema,
    })
    .from(actionConfigurations)
    .innerJoin(mcpToolPermissions, and(
      eq(mcpToolPermissions.actionConfigId, actionConfigurations.id),
      eq(mcpToolPermissions.apiKeyId, apiKeyId),
      eq(mcpToolPermissions.isEnabled, true)
    ))
    .where(and(
      eq(actionConfigurations.tenantId, tenantId),
      eq(actionConfigurations.isActive, true),
      eq(actionConfigurations.actionCategory, 'query')
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
      const actions = await db
        .select({
          actionId: actionConfigurations.actionId,
          actionName: actionConfigurations.actionName,
          description: actionConfigurations.description,
          mcpInputSchema: actionConfigurations.mcpInputSchema,
        })
        .from(actionConfigurations)
        .innerJoin(mcpToolPermissions, and(
          eq(mcpToolPermissions.actionConfigId, actionConfigurations.id),
          eq(mcpToolPermissions.apiKeyId, apiKeyId),
          eq(mcpToolPermissions.isEnabled, true)
        ))
        .where(and(
          eq(actionConfigurations.tenantId, tenantId),
          eq(actionConfigurations.isActive, true),
          eq(actionConfigurations.actionCategory, 'query')
        ));
      
      return res.json({
        jsonrpc: '2.0', id,
        result: { tools: actions.map(a => ({ name: a.actionId, description: a.description || a.actionName, inputSchema: a.mcpInputSchema || { type: 'object', properties: {}, required: [] } })) },
      });
    }
    
    if (method === 'tools/call') {
      const { name: toolName, arguments: toolArgs } = params;
      
      const [action] = await db
        .select({ queryTemplateId: actionConfigurations.queryTemplateId })
        .from(actionConfigurations)
        .innerJoin(mcpToolPermissions, and(
          eq(mcpToolPermissions.actionConfigId, actionConfigurations.id),
          eq(mcpToolPermissions.apiKeyId, apiKeyId),
          eq(mcpToolPermissions.isEnabled, true)
        ))
        .where(and(eq(actionConfigurations.actionId, toolName), eq(actionConfigurations.tenantId, tenantId), eq(actionConfigurations.isActive, true)))
        .limit(1);
      
      if (!action?.queryTemplateId) {
        return res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Tool not found: ${toolName}` } });
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
        return res.json({ 
          jsonrpc: '2.0', 
          id, 
          result: { 
            content: [{ type: 'text', text: JSON.stringify(rows) }],
            // Extended: structured data for programmatic access (n8n, Zapier)
            data: rows,
            meta: {
              rowCount: rows.length,
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
