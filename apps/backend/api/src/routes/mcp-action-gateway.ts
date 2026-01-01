/**
 * MCP Action Gateway Routes
 * 
 * Exposes tenant action configurations as MCP-compatible tools for external integrations
 * (n8n, Claude, Zapier, etc.)
 * 
 * This is separate from mcp.ts which handles MCP client/server connections.
 * 
 * @author W3 Suite Team
 * @date 2025-12-31
 */

import { Router, Request, Response } from 'express';
import { db, setTenantContext } from '../core/db';
import { 
  mcpApiKeys, 
  mcpToolPermissions, 
  mcpUsageLogs, 
  mcpToolSettings,
  actionConfigurations,
  tenants,
  mcpQueryTemplates
} from '../db/schema/w3suite';
import { VARIABLE_CATEGORIES, getVariableById, generateMcpInputSchema } from '../constants/mcp-action-variables';
import { eq, and, desc, sql, gte, lte, count } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';
import { requirePermission } from '../middleware/tenant';
import { logger } from '../core/logger';

const router = Router();

function generateApiKey(tenantSlug: string): { fullKey: string; prefix: string; hash: string } {
  const randomPart = randomBytes(24).toString('hex');
  const fullKey = `sk_live_${tenantSlug}_${randomPart}`;
  const prefix = fullKey.substring(0, 16);
  const hash = createHash('sha256').update(fullKey).digest('hex');
  return { fullKey, prefix, hash };
}

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

// ==================== MCP SSE TRANSPORT ENDPOINTS ====================

const sseConnections = new Map<string, Response>();

async function validateBearerToken(authHeader: string | undefined): Promise<{ valid: boolean; tenantId?: string; keyId?: string; error?: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid Authorization header' };
  }
  
  const token = authHeader.substring(7);
  const keyHash = hashApiKey(token);
  
  const [apiKey] = await db
    .select({
      id: mcpApiKeys.id,
      tenantId: mcpApiKeys.tenantId,
      isActive: mcpApiKeys.isActive,
      expiresAt: mcpApiKeys.expiresAt,
    })
    .from(mcpApiKeys)
    .where(eq(mcpApiKeys.keyHash, keyHash))
    .limit(1);
  
  if (!apiKey) {
    return { valid: false, error: 'Invalid API key' };
  }
  
  if (!apiKey.isActive) {
    return { valid: false, error: 'API key is inactive' };
  }
  
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    return { valid: false, error: 'API key has expired' };
  }
  
  return { valid: true, tenantId: apiKey.tenantId, keyId: apiKey.id };
}

async function handleSseGet(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  const tenantIdHeader = req.headers['x-tenant-id'] as string;
  
  const validation = await validateBearerToken(authHeader);
  
  if (!validation.valid) {
    logger.warn(`[MCP-SSE] Auth failed: ${validation.error}`);
    return res.status(401).json({ error: validation.error });
  }
  
  const tenantId = tenantIdHeader || validation.tenantId;
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID required' });
  }
  
  await setTenantContext(tenantId);
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
  
  const connectionId = `${validation.keyId}-${Date.now()}`;
  sseConnections.set(connectionId, res);
  
  logger.info(`[MCP-SSE] New connection: ${connectionId} for tenant ${tenantId}`);
  
  const actions = await db
    .select({
      id: actionConfigurations.id,
      actionId: actionConfigurations.actionId,
      actionName: actionConfigurations.actionName,
      description: actionConfigurations.description,
      department: actionConfigurations.department,
      mcpActionType: actionConfigurations.mcpActionType,
      mcpInputSchema: actionConfigurations.mcpInputSchema,
    })
    .from(actionConfigurations)
    .innerJoin(mcpToolPermissions, and(
      eq(mcpToolPermissions.actionConfigId, actionConfigurations.id),
      eq(mcpToolPermissions.apiKeyId, validation.keyId!),
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
      capabilities: {
        tools: { listChanged: false },
      },
      serverInfo: {
        name: 'w3suite-mcp',
        version: '1.0.0',
      },
    },
  };
  
  res.write(`data: ${JSON.stringify(serverInfo)}\n\n`);
  
  const toolsList = {
    jsonrpc: '2.0',
    method: 'notifications/tools/list_changed',
    params: { tools },
  };
  res.write(`data: ${JSON.stringify(toolsList)}\n\n`);
  
  const keepAlive = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(keepAlive);
    }
  }, 30000);
  
  req.on('close', () => {
    clearInterval(keepAlive);
    sseConnections.delete(connectionId);
    logger.info(`[MCP-SSE] Connection closed: ${connectionId}`);
  });
}

async function handleSsePost(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  const tenantIdHeader = req.headers['x-tenant-id'] as string;
  
  const validation = await validateBearerToken(authHeader);
  
  if (!validation.valid) {
    return res.status(401).json({ jsonrpc: '2.0', error: { code: -32001, message: validation.error } });
  }
  
  const tenantId = tenantIdHeader || validation.tenantId;
  if (!tenantId) {
    return res.status(400).json({ jsonrpc: '2.0', error: { code: -32002, message: 'Tenant ID required' } });
  }
  
  await setTenantContext(tenantId);
  
  const { jsonrpc, id, method, params } = req.body;
  
  logger.info(`[MCP-SSE] RPC Request: ${method}`, { id, params });
  
  try {
    if (method === 'initialize') {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: { listChanged: false },
          },
          serverInfo: {
            name: 'w3suite-mcp',
            version: '1.0.0',
          },
        },
      });
    }
    
    if (method === 'tools/list') {
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
          eq(mcpToolPermissions.apiKeyId, validation.keyId!),
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
      
      return res.json({ jsonrpc: '2.0', id, result: { tools } });
    }
    
    if (method === 'tools/call') {
      const { name: toolName, arguments: toolArgs } = params;
      
      const [action] = await db
        .select({
          id: actionConfigurations.id,
          actionId: actionConfigurations.actionId,
          queryTemplateId: actionConfigurations.queryTemplateId,
        })
        .from(actionConfigurations)
        .innerJoin(mcpToolPermissions, and(
          eq(mcpToolPermissions.actionConfigId, actionConfigurations.id),
          eq(mcpToolPermissions.apiKeyId, validation.keyId!),
          eq(mcpToolPermissions.isEnabled, true)
        ))
        .where(and(
          eq(actionConfigurations.actionId, toolName),
          eq(actionConfigurations.tenantId, tenantId),
          eq(actionConfigurations.isActive, true)
        ))
        .limit(1);
      
      if (!action) {
        return res.json({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Tool not found: ${toolName}` },
        });
      }
      
      if (!action.queryTemplateId) {
        return res.json({
          jsonrpc: '2.0',
          id,
          error: { code: -32603, message: 'Tool has no query template configured' },
        });
      }
      
      const [template] = await db
        .select()
        .from(mcpQueryTemplates)
        .where(eq(mcpQueryTemplates.id, action.queryTemplateId))
        .limit(1);
      
      if (!template) {
        return res.json({
          jsonrpc: '2.0',
          id,
          error: { code: -32603, message: 'Query template not found' },
        });
      }
      
      let sqlQuery = template.sqlTemplate;
      const queryParams: string[] = [];
      let paramIndex = 1;
      
      sqlQuery = sqlQuery.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        if (toolArgs && toolArgs[varName] !== undefined) {
          queryParams.push(String(toolArgs[varName]));
          return `$${paramIndex++}`;
        }
        return match;
      });
      
      const startTime = Date.now();
      const result = await db.execute(sql.raw(`${sqlQuery}`, queryParams));
      const responseTime = Date.now() - startTime;
      
      await db.insert(mcpUsageLogs).values({
        tenantId,
        apiKeyId: validation.keyId!,
        actionCode: toolName,
        inputParams: toolArgs || {},
        success: true,
        responseTime,
        clientIp: req.ip || 'unknown',
      });
      
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(result.rows || result, null, 2) }],
        },
      });
    }
    
    if (method === 'notifications/initialized') {
      return res.json({ jsonrpc: '2.0', id, result: {} });
    }
    
    return res.json({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
    
  } catch (error: any) {
    logger.error(`[MCP-SSE] Error executing ${method}:`, error);
    
    await db.insert(mcpUsageLogs).values({
      tenantId,
      apiKeyId: validation.keyId!,
      actionCode: params?.name || method,
      inputParams: params || {},
      success: false,
      errorMessage: error.message,
      clientIp: req.ip || 'unknown',
    });
    
    return res.json({
      jsonrpc: '2.0',
      id,
      error: { code: -32603, message: error.message },
    });
  }
}

router.get('/sse', handleSseGet);
router.post('/sse', handleSsePost);
router.get('/', handleSseGet);
router.post('/', handleSsePost);

// ==================== API KEYS MANAGEMENT ====================

router.get('/keys', requirePermission('settings.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    await setTenantContext(tenantId);

    const keys = await db
      .select({
        id: mcpApiKeys.id,
        name: mcpApiKeys.name,
        description: mcpApiKeys.description,
        keyPrefix: mcpApiKeys.keyPrefix,
        allowedDepartments: mcpApiKeys.allowedDepartments,
        rateLimitPerMinute: mcpApiKeys.rateLimitPerMinute,
        dailyQuota: mcpApiKeys.dailyQuota,
        allowedIps: mcpApiKeys.allowedIps,
        isActive: mcpApiKeys.isActive,
        lastUsedAt: mcpApiKeys.lastUsedAt,
        expiresAt: mcpApiKeys.expiresAt,
        createdAt: mcpApiKeys.createdAt,
        revokedAt: mcpApiKeys.revokedAt,
      })
      .from(mcpApiKeys)
      .where(eq(mcpApiKeys.tenantId, tenantId))
      .orderBy(desc(mcpApiKeys.createdAt));

    const enrichedKeys = await Promise.all(keys.map(async (key) => {
      const [usageCount] = await db
        .select({ count: count() })
        .from(mcpUsageLogs)
        .where(eq(mcpUsageLogs.apiKeyId, key.id));
      
      const [permCount] = await db
        .select({ count: count() })
        .from(mcpToolPermissions)
        .where(and(
          eq(mcpToolPermissions.apiKeyId, key.id),
          eq(mcpToolPermissions.isEnabled, true)
        ));

      return {
        ...key,
        totalCalls: usageCount?.count || 0,
        enabledTools: permCount?.count || 0,
      };
    }));

    res.json(enrichedKeys);
  } catch (error) {
    logger.error('Error fetching MCP API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

router.post('/keys', requirePermission('settings.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = (req as any).user?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    await setTenantContext(tenantId);

    const { name, description, rateLimitPerMinute, dailyQuota, ipRestrictionEnabled, allowedIps, expiresAt } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const [tenant] = await db
      .select({ slug: tenants.slug })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const { fullKey, prefix, hash } = generateApiKey(tenant.slug || 'default');

    const [newKey] = await db
      .insert(mcpApiKeys)
      .values({
        tenantId,
        name,
        description,
        keyPrefix: prefix,
        keyHash: hash,
        rateLimitPerMinute: rateLimitPerMinute || 60,
        dailyQuota: dailyQuota || 10000,
        ipRestrictionEnabled: ipRestrictionEnabled || false,
        allowedIps: ipRestrictionEnabled ? (allowedIps || null) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: userId,
      })
      .returning();

    logger.info(`🔑 [MCP-GATEWAY] API key created: ${name} for tenant ${tenantId}`);

    res.status(201).json({
      id: newKey.id,
      name: newKey.name,
      description: newKey.description,
      keyPrefix: newKey.keyPrefix,
      apiKey: fullKey,
      message: 'Save this API key now. It will not be shown again.',
      createdAt: newKey.createdAt,
    });
  } catch (error) {
    logger.error('Error creating MCP API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

router.patch('/keys/:id', requirePermission('settings.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const keyId = req.params.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    await setTenantContext(tenantId);

    const { name, description, rateLimitPerMinute, dailyQuota, ipRestrictionEnabled, allowedIps, isActive, expiresAt } = req.body;

    const [updated] = await db
      .update(mcpApiKeys)
      .set({
        name,
        description,
        rateLimitPerMinute,
        dailyQuota,
        ipRestrictionEnabled,
        allowedIps: ipRestrictionEnabled ? allowedIps : null,
        isActive,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(mcpApiKeys.id, keyId),
        eq(mcpApiKeys.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json(updated);
  } catch (error) {
    logger.error('Error updating MCP API key:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

router.delete('/keys/:id', requirePermission('settings.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const keyId = req.params.id;
    const userId = (req as any).user?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    await setTenantContext(tenantId);

    const [revoked] = await db
      .update(mcpApiKeys)
      .set({
        isActive: false,
        revokedAt: new Date(),
        revokedBy: userId,
        updatedAt: new Date(),
      })
      .where(and(
        eq(mcpApiKeys.id, keyId),
        eq(mcpApiKeys.tenantId, tenantId)
      ))
      .returning();

    if (!revoked) {
      return res.status(404).json({ error: 'API key not found' });
    }

    logger.info(`🔑 [MCP-GATEWAY] API key revoked: ${revoked.name} for tenant ${tenantId}`);

    res.json({ message: 'API key revoked successfully' });
  } catch (error) {
    logger.error('Error revoking MCP API key:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

// ==================== TOOL SETTINGS ====================

router.get('/tools', requirePermission('settings.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    await setTenantContext(tenantId);

    // Get activeOnly filter from query params - for admin view show all, for public gateway filter active only
    const activeOnly = req.query.activeOnly === 'true';
    
    const actions = await db
      .select({
        id: actionConfigurations.id,
        code: actionConfigurations.actionId,
        name: actionConfigurations.actionName,
        description: actionConfigurations.description,
        department: actionConfigurations.department,
        flowType: actionConfigurations.flowType,
        isActive: actionConfigurations.isActive,
        actionCategory: actionConfigurations.actionCategory,
      })
      .from(actionConfigurations)
      .where(
        activeOnly 
          ? and(eq(actionConfigurations.tenantId, tenantId), eq(actionConfigurations.isActive, true))
          : eq(actionConfigurations.tenantId, tenantId)
      )
      .orderBy(actionConfigurations.department, actionConfigurations.actionName);

    const settings = await db
      .select({
        id: mcpToolSettings.id,
        actionConfigId: mcpToolSettings.actionConfigId,
        exposedViaMcp: mcpToolSettings.exposedViaMcp,
        customToolName: mcpToolSettings.customToolName,
        customToolDescription: mcpToolSettings.customToolDescription,
      })
      .from(mcpToolSettings)
      .where(eq(mcpToolSettings.tenantId, tenantId));

    const settingsMap = new Map(settings.map(s => [s.actionConfigId, s]));

    const enrichedActions = actions.map(action => {
      const settings = settingsMap.get(action.id);
      return {
        id: action.id,
        actionCode: action.code,
        actionName: action.name,
        description: action.description,
        departmentId: action.department,
        flowType: action.flowType,
        isActive: action.isActive,
        actionCategory: action.actionCategory || 'operative', // operative or query
        mcpExposed: settings?.exposedViaMcp || false,
        customToolName: settings?.customToolName || null,
        customToolDescription: settings?.customToolDescription || null,
      };
    });

    res.json(enrichedActions);
  } catch (error) {
    logger.error('Error fetching MCP tool settings:', error);
    res.status(500).json({ error: 'Failed to fetch tool settings' });
  }
});

router.patch('/tools/:actionId', requirePermission('settings.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const actionId = req.params.actionId;
    const userId = (req as any).user?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    await setTenantContext(tenantId);

    const { mcpExposed, exposedViaMcp, customToolName, customToolDescription, parametersSchema, rateLimitPerMinute } = req.body;
    const exposed = mcpExposed !== undefined ? mcpExposed : exposedViaMcp;

    const [existing] = await db
      .select()
      .from(mcpToolSettings)
      .where(and(
        eq(mcpToolSettings.tenantId, tenantId),
        eq(mcpToolSettings.actionConfigId, actionId)
      ))
      .limit(1);

    let result;
    if (existing) {
      [result] = await db
        .update(mcpToolSettings)
        .set({
          exposedViaMcp: exposed,
          customToolName,
          customToolDescription,
          parametersSchema,
          rateLimitPerMinute,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(eq(mcpToolSettings.id, existing.id))
        .returning();
    } else {
      [result] = await db
        .insert(mcpToolSettings)
        .values({
          tenantId,
          actionConfigId: actionId,
          exposedViaMcp: exposed,
          customToolName,
          customToolDescription,
          parametersSchema,
          rateLimitPerMinute,
          updatedBy: userId,
        })
        .returning();
    }

    res.json(result);
  } catch (error) {
    logger.error('Error updating MCP tool settings:', error);
    res.status(500).json({ error: 'Failed to update tool settings' });
  }
});

// ==================== TOOL PERMISSIONS (API Key -> Actions) ====================

router.get('/keys/:keyId/permissions', requirePermission('settings.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const keyId = req.params.keyId;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    await setTenantContext(tenantId);

    const permissions = await db
      .select({
        id: mcpToolPermissions.id,
        actionConfigId: mcpToolPermissions.actionConfigId,
        isEnabled: mcpToolPermissions.isEnabled,
        rateLimitOverride: mcpToolPermissions.rateLimitOverride,
        actionCode: actionConfigurations.actionId,
        actionName: actionConfigurations.actionName,
        department: actionConfigurations.department,
      })
      .from(mcpToolPermissions)
      .innerJoin(actionConfigurations, eq(mcpToolPermissions.actionConfigId, actionConfigurations.id))
      .where(and(
        eq(mcpToolPermissions.apiKeyId, keyId),
        eq(mcpToolPermissions.tenantId, tenantId)
      ));

    res.json(permissions);
  } catch (error) {
    logger.error('Error fetching tool permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

router.put('/keys/:keyId/permissions', requirePermission('settings.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const keyId = req.params.keyId;
    const userId = (req as any).user?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    await setTenantContext(tenantId);

    const { permissions } = req.body;

    await db
      .delete(mcpToolPermissions)
      .where(and(
        eq(mcpToolPermissions.apiKeyId, keyId),
        eq(mcpToolPermissions.tenantId, tenantId)
      ));

    if (permissions && permissions.length > 0) {
      await db
        .insert(mcpToolPermissions)
        .values(permissions.map((p: any) => ({
          tenantId,
          apiKeyId: keyId,
          actionConfigId: p.actionConfigId,
          isEnabled: p.isEnabled !== false,
          rateLimitOverride: p.rateLimitOverride || null,
          createdBy: userId,
        })));
    }

    res.json({ message: 'Permissions updated successfully' });
  } catch (error) {
    logger.error('Error updating tool permissions:', error);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});

// ==================== USAGE ANALYTICS ====================

// Stats endpoint for dashboard summary
router.get('/stats', requirePermission('settings.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    await setTenantContext(tenantId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalCallsResult] = await db
      .select({ count: count() })
      .from(mcpUsageLogs)
      .where(eq(mcpUsageLogs.tenantId, tenantId));

    const [successCallsResult] = await db
      .select({ count: count() })
      .from(mcpUsageLogs)
      .where(and(eq(mcpUsageLogs.tenantId, tenantId), eq(mcpUsageLogs.success, true)));

    const [avgResponseResult] = await db
      .select({ avg: sql<number>`COALESCE(AVG(response_time), 0)` })
      .from(mcpUsageLogs)
      .where(eq(mcpUsageLogs.tenantId, tenantId));

    const [activeKeysResult] = await db
      .select({ count: count() })
      .from(mcpApiKeys)
      .where(and(eq(mcpApiKeys.tenantId, tenantId), eq(mcpApiKeys.isActive, true)));

    const [exposedToolsResult] = await db
      .select({ count: count() })
      .from(mcpToolSettings)
      .where(and(eq(mcpToolSettings.tenantId, tenantId), eq(mcpToolSettings.exposedViaMcp, true)));

    const [callsTodayResult] = await db
      .select({ count: count() })
      .from(mcpUsageLogs)
      .where(and(eq(mcpUsageLogs.tenantId, tenantId), gte(mcpUsageLogs.executedAt, today)));

    const totalCalls = Number(totalCallsResult?.count || 0);
    const successCalls = Number(successCallsResult?.count || 0);

    res.json({
      totalCalls,
      successRate: totalCalls > 0 ? (successCalls / totalCalls * 100) : 100,
      avgResponseTime: Math.round(avgResponseResult?.avg || 0),
      activeKeys: Number(activeKeysResult?.count || 0),
      exposedTools: Number(exposedToolsResult?.count || 0),
      callsToday: Number(callsTodayResult?.count || 0),
    });
  } catch (error) {
    logger.error('Error fetching MCP stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Usage logs endpoint for activity table
router.get('/usage-logs', requirePermission('settings.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    await setTenantContext(tenantId);

    const limit = parseInt(req.query.limit as string) || 50;

    const logs = await db
      .select({
        id: mcpUsageLogs.id,
        apiKeyId: mcpUsageLogs.apiKeyId,
        actionCode: mcpUsageLogs.actionCode,
        success: mcpUsageLogs.success,
        responseTime: mcpUsageLogs.responseTime,
        errorMessage: mcpUsageLogs.errorMessage,
        ipAddress: mcpUsageLogs.clientIp,
        timestamp: mcpUsageLogs.executedAt,
      })
      .from(mcpUsageLogs)
      .where(eq(mcpUsageLogs.tenantId, tenantId))
      .orderBy(desc(mcpUsageLogs.executedAt))
      .limit(limit);

    res.json(logs);
  } catch (error) {
    logger.error('Error fetching MCP usage logs:', error);
    res.status(500).json({ error: 'Failed to fetch usage logs' });
  }
});

router.get('/analytics', requirePermission('settings.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    await setTenantContext(tenantId);

    const { startDate, endDate, apiKeyId } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    let whereConditions = and(
      eq(mcpUsageLogs.tenantId, tenantId),
      gte(mcpUsageLogs.executedAt, start),
      lte(mcpUsageLogs.executedAt, end)
    );

    if (apiKeyId) {
      whereConditions = and(whereConditions, eq(mcpUsageLogs.apiKeyId, apiKeyId as string));
    }

    const totalCalls = await db
      .select({ count: count() })
      .from(mcpUsageLogs)
      .where(whereConditions);

    const successCalls = await db
      .select({ count: count() })
      .from(mcpUsageLogs)
      .where(and(whereConditions, eq(mcpUsageLogs.success, true)));

    const errorCalls = await db
      .select({ count: count() })
      .from(mcpUsageLogs)
      .where(and(whereConditions, eq(mcpUsageLogs.success, false)));

    const avgResponseTime = await db
      .select({ avg: sql<number>`AVG(response_time)` })
      .from(mcpUsageLogs)
      .where(whereConditions);

    const callsByDepartment = await db
      .select({
        department: mcpUsageLogs.department,
        count: count(),
      })
      .from(mcpUsageLogs)
      .where(whereConditions)
      .groupBy(mcpUsageLogs.department);

    const callsByApiKey = await db
      .select({
        apiKeyName: mcpUsageLogs.apiKeyName,
        count: count(),
      })
      .from(mcpUsageLogs)
      .where(whereConditions)
      .groupBy(mcpUsageLogs.apiKeyName);

    const callsByAction = await db
      .select({
        actionCode: mcpUsageLogs.actionCode,
        count: count(),
      })
      .from(mcpUsageLogs)
      .where(whereConditions)
      .groupBy(mcpUsageLogs.actionCode)
      .orderBy(desc(count()))
      .limit(10);

    const recentErrors = await db
      .select({
        id: mcpUsageLogs.id,
        actionCode: mcpUsageLogs.actionCode,
        errorCode: mcpUsageLogs.errorCode,
        errorMessage: mcpUsageLogs.errorMessage,
        apiKeyName: mcpUsageLogs.apiKeyName,
        executedAt: mcpUsageLogs.executedAt,
      })
      .from(mcpUsageLogs)
      .where(and(whereConditions, eq(mcpUsageLogs.success, false)))
      .orderBy(desc(mcpUsageLogs.executedAt))
      .limit(20);

    res.json({
      summary: {
        totalCalls: totalCalls[0]?.count || 0,
        successCalls: successCalls[0]?.count || 0,
        errorCalls: errorCalls[0]?.count || 0,
        successRate: totalCalls[0]?.count ? 
          ((successCalls[0]?.count || 0) / Number(totalCalls[0].count) * 100).toFixed(2) : 0,
        avgResponseTime: Math.round(avgResponseTime[0]?.avg || 0),
      },
      callsByDepartment,
      callsByApiKey,
      callsByAction,
      recentErrors,
      period: { start, end },
    });
  } catch (error) {
    logger.error('Error fetching MCP analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ==================== QUERY TEMPLATES ====================

router.get('/query-templates', requirePermission('settings.read'), async (req: Request, res: Response) => {
  try {
    const { department } = req.query;

    let whereCondition = eq(mcpQueryTemplates.isActive, true);
    if (department) {
      whereCondition = and(whereCondition, eq(mcpQueryTemplates.department, department as any)) as any;
    }

    const templates = await db
      .select()
      .from(mcpQueryTemplates)
      .where(whereCondition)
      .orderBy(mcpQueryTemplates.department, mcpQueryTemplates.name);

    res.json(templates);
  } catch (error) {
    logger.error('Error fetching query templates:', error);
    res.status(500).json({ error: 'Failed to fetch query templates' });
  }
});

router.get('/query-templates/:id', requirePermission('settings.read'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [template] = await db
      .select()
      .from(mcpQueryTemplates)
      .where(eq(mcpQueryTemplates.id, id))
      .limit(1);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const variableDetails = template.availableVariables.map(varId => {
      const variable = getVariableById(varId);
      return variable || { id: varId, name: varId, description: 'Unknown variable' };
    });

    res.json({
      ...template,
      variableDetails,
    });
  } catch (error) {
    logger.error('Error fetching query template:', error);
    res.status(500).json({ error: 'Failed to fetch query template' });
  }
});

// ==================== VARIABLE CATEGORIES ====================

router.get('/variable-categories', requirePermission('settings.read'), async (_req: Request, res: Response) => {
  try {
    res.json(VARIABLE_CATEGORIES);
  } catch (error) {
    logger.error('Error fetching variable categories:', error);
    res.status(500).json({ error: 'Failed to fetch variable categories' });
  }
});

// ==================== CUSTOM ACTIONS BUILDER ====================

router.get('/custom-actions', requirePermission('settings.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { showAll } = req.query; // showAll=true mostra tutte le azioni (operative + query)
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    await setTenantContext(tenantId);

    let actions;
    if (showAll === 'true') {
      // Mostra TUTTE le azioni (per Action Builder e MCP Gateway Catalog)
      actions = await db
        .select()
        .from(actionConfigurations)
        .where(eq(actionConfigurations.tenantId, tenantId))
        .orderBy(desc(actionConfigurations.createdAt));
    } else {
      // Mostra solo azioni custom MCP (comportamento legacy)
      actions = await db
        .select()
        .from(actionConfigurations)
        .where(and(
          eq(actionConfigurations.tenantId, tenantId),
          eq(actionConfigurations.isCustomAction, true)
        ))
        .orderBy(desc(actionConfigurations.createdAt));
    }

    res.json(actions);
  } catch (error) {
    logger.error('Error fetching custom actions:', error);
    res.status(500).json({ error: 'Failed to fetch custom actions' });
  }
});

router.post('/custom-actions', requirePermission('settings.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = (req as any).user?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    await setTenantContext(tenantId);

    const { 
      code, 
      name, 
      description, 
      department, 
      actionType,
      actionCategory = 'query', // Default to query if not specified
      queryTemplateId,
      selectedVariables,
      requiredVariables = []
    } = req.body;

    if (!code || !name || !department || !actionType || !queryTemplateId) {
      return res.status(400).json({ error: 'Missing required fields: code, name, department, actionType, queryTemplateId' });
    }

    // Validate actionCategory
    const validCategory = actionCategory === 'operative' ? 'operative' : 'query';

    const mcpInputSchema = generateMcpInputSchema(selectedVariables || []);

    if (requiredVariables.length > 0) {
      mcpInputSchema.required = requiredVariables;
    }

    const [newAction] = await db
      .insert(actionConfigurations)
      .values({
        tenantId,
        code,
        name,
        description,
        department,
        actionCategory: validCategory, // operative or query based on user selection
        isCustomAction: true,
        mcpActionType: actionType,
        queryTemplateId,
        mcpInputSchema,
        flowType: 'none',
        isActive: true,
        createdBy: userId,
      })
      .returning();

    logger.info(`🔧 [MCP-GATEWAY] Custom action created: ${code} by ${userId}`);

    res.status(201).json(newAction);
  } catch (error: any) {
    logger.error('Error creating custom action:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'An action with this code already exists' });
    }
    res.status(500).json({ error: 'Failed to create custom action' });
  }
});

router.patch('/custom-actions/:id', requirePermission('settings.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const actionId = req.params.id;
    const userId = (req as any).user?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    await setTenantContext(tenantId);

    const { 
      name, 
      description, 
      selectedVariables,
      requiredVariables,
      isActive 
    } = req.body;

    const updateData: any = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (selectedVariables) {
      const mcpInputSchema = generateMcpInputSchema(selectedVariables);
      if (requiredVariables?.length > 0) {
        mcpInputSchema.required = requiredVariables;
      }
      updateData.mcpInputSchema = mcpInputSchema;
    }

    const [updated] = await db
      .update(actionConfigurations)
      .set(updateData)
      .where(and(
        eq(actionConfigurations.id, actionId),
        eq(actionConfigurations.tenantId, tenantId),
        eq(actionConfigurations.isCustomAction, true)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Custom action not found' });
    }

    logger.info(`🔧 [MCP-GATEWAY] Custom action updated: ${updated.code} by ${userId}`);

    res.json(updated);
  } catch (error) {
    logger.error('Error updating custom action:', error);
    res.status(500).json({ error: 'Failed to update custom action' });
  }
});

router.delete('/custom-actions/:id', requirePermission('settings.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const actionId = req.params.id;
    const userId = (req as any).user?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    await setTenantContext(tenantId);

    const [deleted] = await db
      .update(actionConfigurations)
      .set({ 
        isActive: false, 
        archivedAt: new Date(),
        archivedBy: userId,
        updatedAt: new Date() 
      })
      .where(and(
        eq(actionConfigurations.id, actionId),
        eq(actionConfigurations.tenantId, tenantId),
        eq(actionConfigurations.isCustomAction, true)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Custom action not found' });
    }

    logger.info(`🗑️ [MCP-GATEWAY] Custom action archived: ${deleted.code} by ${userId}`);

    res.json({ message: 'Action archived successfully' });
  } catch (error) {
    logger.error('Error archiving custom action:', error);
    res.status(500).json({ error: 'Failed to archive custom action' });
  }
});

router.post('/custom-actions/:id/duplicate', requirePermission('settings.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const actionId = req.params.id;
    const userId = (req as any).user?.id;
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }
    await setTenantContext(tenantId);

    const [original] = await db
      .select()
      .from(actionConfigurations)
      .where(and(
        eq(actionConfigurations.id, actionId),
        eq(actionConfigurations.tenantId, tenantId)
      ))
      .limit(1);

    if (!original) {
      return res.status(404).json({ error: 'Action not found' });
    }

    const newActionId = `${original.actionId}_copy_${Date.now().toString(36)}`;
    const newActionName = `${original.actionName} (Copy)`;

    const [duplicated] = await db
      .insert(actionConfigurations)
      .values({
        tenantId,
        actionId: newActionId,
        actionName: newActionName,
        description: original.description,
        department: original.department,
        actionCategory: original.actionCategory || 'query',
        isCustomAction: true,
        mcpActionType: original.mcpActionType,
        queryTemplateId: original.queryTemplateId,
        mcpInputSchema: original.mcpInputSchema,
        flowType: 'none',
        teamScope: original.teamScope || 'all',
        requiresApproval: false,
        isActive: true,
        createdBy: userId,
      })
      .returning();

    logger.info(`📋 [MCP-GATEWAY] Custom action duplicated: ${original.actionId} → ${newActionId} by ${userId}`);

    res.status(201).json(duplicated);
  } catch (error) {
    logger.error('Error duplicating custom action:', error);
    res.status(500).json({ error: 'Failed to duplicate custom action' });
  }
});

export default router;
