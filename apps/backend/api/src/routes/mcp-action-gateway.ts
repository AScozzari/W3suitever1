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
  tenants
} from '../db/schema/w3suite';
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

export default router;
