/**
 * MCP Public Gateway Routes
 * 
 * PUBLIC endpoints for external integrations (n8n, Claude, Zapier)
 * Authenticated via API Key (not session/JWT)
 * 
 * @author W3 Suite Team
 * @date 2025-12-31
 */

import { Router, Request, Response, NextFunction } from 'express';
import { db, setTenantContext } from '../core/db';
import { 
  mcpApiKeys, 
  mcpToolPermissions, 
  mcpUsageLogs, 
  mcpToolSettings,
  actionConfigurations,
  tenants
} from '../db/schema/w3suite';
import { eq, and, inArray } from 'drizzle-orm';
import { createHash } from 'crypto';
import { logger } from '../core/logger';
import { UnifiedTriggerService } from '../services/unified-trigger.service';

const router = Router();

interface McpAuthenticatedRequest extends Request {
  mcpAuth?: {
    apiKeyId: string;
    apiKeyName: string;
    tenantId: string;
    allowedDepartments: string[] | null;
    rateLimitPerMinute: number;
    dailyQuota: number;
  };
}

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

async function mcpApiKeyAuth(req: McpAuthenticatedRequest, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  try {
    const authHeader = req.headers['authorization'] as string;
    const apiKeyHeader = req.headers['x-mcp-key'] as string;
    
    let apiKey: string | null = null;
    
    if (apiKeyHeader) {
      apiKey = apiKeyHeader;
    } else if (authHeader?.startsWith('Api-Key ')) {
      apiKey = authHeader.substring(8);
    } else if (authHeader?.startsWith('Bearer sk_')) {
      apiKey = authHeader.substring(7);
    }
    
    if (!apiKey) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Provide API key via X-MCP-Key header or Authorization: Api-Key sk_live_...',
        docs: '/api/mcp-gateway/docs'
      });
    }
    
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
      const clientIp = req.ip || req.socket.remoteAddress || '';
      if (!keyRecord.allowedIps.includes(clientIp)) {
        logger.warn(`🔑 [MCP-GATEWAY] IP not allowed: ${clientIp} for key ${keyRecord.name}`);
        return res.status(403).json({ error: 'IP address not allowed' });
      }
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
    };
    
    next();
  } catch (error) {
    logger.error('🔑 [MCP-GATEWAY] Auth error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
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
      clientIp: req.ip || req.socket.remoteAddress,
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
    
    const customTools = customActions
      .filter(action => {
        if (allowedDepartments && allowedDepartments.length > 0) {
          if (!allowedDepartments.includes(action.department)) {
            return false;
          }
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

export default router;
