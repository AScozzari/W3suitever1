/**
 * MCP Management Routes - UI endpoints for MCP Action Gateway management
 * Handles API Keys, Permissions, Stats, and Usage Logs for the admin UI
 */

import { Router, Request, Response } from 'express';
import { db } from '../core/db';
import { 
  mcpApiKeys, 
  mcpToolPermissions, 
  mcpUsageLogs,
  actionDefinitions,
  mcpQueryTemplates
} from '../db/schema/w3suite';
import { eq, and, desc, sql, count, isNull, gte, lte } from 'drizzle-orm';
import { logger } from '../core/logger';
import { z } from 'zod';
import crypto from 'crypto';

const router = Router();

// ==================== API KEYS MANAGEMENT ====================

// GET /api/mcp-gateway/keys - List all API keys for tenant
router.get('/keys', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'MISSING_TENANT_ID' });
    }

    const keys = await db
      .select({
        id: mcpApiKeys.id,
        name: mcpApiKeys.name,
        keyPrefix: mcpApiKeys.keyPrefix,
        allowedDepartments: mcpApiKeys.allowedDepartments,
        rateLimitPerMinute: mcpApiKeys.rateLimitPerMinute,
        dailyQuota: mcpApiKeys.dailyQuota,
        isActive: mcpApiKeys.isActive,
        lastUsedAt: mcpApiKeys.lastUsedAt,
        expiresAt: mcpApiKeys.expiresAt,
        createdAt: mcpApiKeys.createdAt,
        revokedAt: mcpApiKeys.revokedAt,
      })
      .from(mcpApiKeys)
      .where(eq(mcpApiKeys.tenantId, tenantId))
      .orderBy(desc(mcpApiKeys.createdAt));

    res.json({ success: true, data: keys });
  } catch (error) {
    logger.error('[MCP-MGMT] Error fetching keys:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch API keys' });
  }
});

// POST /api/mcp-gateway/keys - Create new API key
router.post('/keys', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'MISSING_TENANT_ID' });
    }

    const { name, allowedDepartments, rateLimitPerMinute, dailyQuota, expiresAt } = req.body;
    
    // Generate secure API key
    const rawKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 12);

    const [newKey] = await db
      .insert(mcpApiKeys)
      .values({
        tenantId,
        name: name || 'New API Key',
        keyHash,
        keyPrefix,
        allowedDepartments: allowedDepartments || null,
        rateLimitPerMinute: rateLimitPerMinute || 60,
        dailyQuota: dailyQuota || 10000,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: userId,
      })
      .returning();

    // Return key with raw value (only shown once)
    res.json({ 
      success: true, 
      data: { 
        ...newKey, 
        rawKey // Only returned on creation
      } 
    });
  } catch (error) {
    logger.error('[MCP-MGMT] Error creating key:', error);
    res.status(500).json({ success: false, error: 'Failed to create API key' });
  }
});

// PATCH /api/mcp-gateway/keys/:id - Update API key
router.patch('/keys/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { name, isActive, rateLimitPerMinute, dailyQuota, allowedDepartments } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (isActive !== undefined) updates.isActive = isActive;
    if (rateLimitPerMinute !== undefined) updates.rateLimitPerMinute = rateLimitPerMinute;
    if (dailyQuota !== undefined) updates.dailyQuota = dailyQuota;
    if (allowedDepartments !== undefined) updates.allowedDepartments = allowedDepartments;

    const [updated] = await db
      .update(mcpApiKeys)
      .set(updates)
      .where(and(eq(mcpApiKeys.id, id), eq(mcpApiKeys.tenantId, tenantId)))
      .returning();

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('[MCP-MGMT] Error updating key:', error);
    res.status(500).json({ success: false, error: 'Failed to update API key' });
  }
});

// DELETE /api/mcp-gateway/keys/:id - Revoke API key
router.delete('/keys/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    await db
      .update(mcpApiKeys)
      .set({ 
        isActive: false, 
        revokedAt: new Date(), 
        revokedBy: userId,
        updatedAt: new Date() 
      })
      .where(and(eq(mcpApiKeys.id, id), eq(mcpApiKeys.tenantId, tenantId)));

    res.json({ success: true });
  } catch (error) {
    logger.error('[MCP-MGMT] Error revoking key:', error);
    res.status(500).json({ success: false, error: 'Failed to revoke API key' });
  }
});

// ==================== TOOLS MANAGEMENT ====================

// GET /api/mcp-gateway/tools - List all tools (from action_definitions)
router.get('/tools', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'MISSING_TENANT_ID' });
    }

    const tools = await db
      .select({
        id: actionDefinitions.id,
        actionId: actionDefinitions.actionId,
        actionName: actionDefinitions.actionName,
        description: actionDefinitions.description,
        department: actionDefinitions.department,
        actionCategory: actionDefinitions.actionCategory,
        isMcpEnabled: actionDefinitions.isMcpEnabled,
        exposedViaMcp: actionDefinitions.exposedViaMcp,
        mcpInputSchema: actionDefinitions.mcpInputSchema,
        isActive: actionDefinitions.isActive,
      })
      .from(actionDefinitions)
      .where(and(
        sql`(${actionDefinitions.tenantId} = ${tenantId} OR ${actionDefinitions.tenantId} IS NULL)`,
        eq(actionDefinitions.isActive, true)
      ))
      .orderBy(actionDefinitions.department, actionDefinitions.actionName);

    res.json({ success: true, data: tools });
  } catch (error) {
    logger.error('[MCP-MGMT] Error fetching tools:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tools' });
  }
});

// PATCH /api/mcp-gateway/tools/:id - Toggle tool MCP exposure
router.patch('/tools/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { mcpExposed, isMcpEnabled } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (mcpExposed !== undefined) updates.exposedViaMcp = mcpExposed;
    if (isMcpEnabled !== undefined) updates.isMcpEnabled = isMcpEnabled;

    const [updated] = await db
      .update(actionDefinitions)
      .set(updates)
      .where(and(
        eq(actionDefinitions.actionId, id),
        sql`(${actionDefinitions.tenantId} = ${tenantId} OR ${actionDefinitions.tenantId} IS NULL)`
      ))
      .returning();

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('[MCP-MGMT] Error updating tool:', error);
    res.status(500).json({ success: false, error: 'Failed to update tool' });
  }
});

// ==================== PERMISSIONS ====================

// GET /api/mcp-gateway/keys/:keyId/permissions - Get permissions for API key
router.get('/keys/:keyId/permissions', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { keyId } = req.params;

    const permissions = await db
      .select({
        id: mcpToolPermissions.id,
        actionDefinitionId: mcpToolPermissions.actionDefinitionId,
        actionId: actionDefinitions.actionId,
        actionName: actionDefinitions.actionName,
        department: actionDefinitions.department,
        isEnabled: mcpToolPermissions.isEnabled,
        rateLimitOverride: mcpToolPermissions.rateLimitOverride,
      })
      .from(mcpToolPermissions)
      .leftJoin(actionDefinitions, eq(mcpToolPermissions.actionDefinitionId, actionDefinitions.id))
      .where(and(
        eq(mcpToolPermissions.apiKeyId, keyId),
        eq(mcpToolPermissions.tenantId, tenantId)
      ));

    res.json({ success: true, data: permissions });
  } catch (error) {
    logger.error('[MCP-MGMT] Error fetching permissions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch permissions' });
  }
});

// PUT /api/mcp-gateway/keys/:keyId/permissions - Update permissions
router.put('/keys/:keyId/permissions', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { keyId } = req.params;
    const { permissions } = req.body; // Array of { actionDefinitionId, isEnabled }

    // Delete existing and insert new
    await db
      .delete(mcpToolPermissions)
      .where(and(
        eq(mcpToolPermissions.apiKeyId, keyId),
        eq(mcpToolPermissions.tenantId, tenantId)
      ));

    if (permissions && permissions.length > 0) {
      await db.insert(mcpToolPermissions).values(
        permissions.map((p: any) => ({
          tenantId,
          apiKeyId: keyId,
          actionDefinitionId: p.actionDefinitionId,
          isEnabled: p.isEnabled ?? true,
          rateLimitOverride: p.rateLimitOverride,
        }))
      );
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('[MCP-MGMT] Error updating permissions:', error);
    res.status(500).json({ success: false, error: 'Failed to update permissions' });
  }
});

// ==================== STATS & ANALYTICS ====================

// GET /api/mcp-gateway/stats - Get usage statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'MISSING_TENANT_ID' });
    }

    // Count active keys
    const [keysResult] = await db
      .select({ count: count() })
      .from(mcpApiKeys)
      .where(and(
        eq(mcpApiKeys.tenantId, tenantId),
        eq(mcpApiKeys.isActive, true)
      ));

    // Count exposed tools
    const [toolsResult] = await db
      .select({ count: count() })
      .from(actionDefinitions)
      .where(and(
        sql`(${actionDefinitions.tenantId} = ${tenantId} OR ${actionDefinitions.tenantId} IS NULL)`,
        eq(actionDefinitions.isActive, true),
        eq(actionDefinitions.exposedViaMcp, true)
      ));

    // Count today's API calls
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [callsResult] = await db
      .select({ count: count() })
      .from(mcpUsageLogs)
      .where(and(
        eq(mcpUsageLogs.tenantId, tenantId),
        gte(mcpUsageLogs.executedAt, today)
      ));

    res.json({
      success: true,
      data: {
        activeKeys: keysResult?.count || 0,
        exposedTools: toolsResult?.count || 0,
        todayCalls: callsResult?.count || 0,
      }
    });
  } catch (error) {
    logger.error('[MCP-MGMT] Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// GET /api/mcp-gateway/usage-logs - Get usage logs
router.get('/usage-logs', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const limit = parseInt(req.query.limit as string) || 100;

    const logs = await db
      .select({
        id: mcpUsageLogs.id,
        apiKeyId: mcpUsageLogs.apiKeyId,
        apiKeyName: mcpUsageLogs.apiKeyName,
        actionCode: mcpUsageLogs.actionCode,
        department: mcpUsageLogs.department,
        method: mcpUsageLogs.method,
        endpoint: mcpUsageLogs.endpoint,
        statusCode: mcpUsageLogs.statusCode,
        responseTime: mcpUsageLogs.responseTime,
        executedAt: mcpUsageLogs.executedAt,
        success: mcpUsageLogs.success,
        errorMessage: mcpUsageLogs.errorMessage,
      })
      .from(mcpUsageLogs)
      .where(eq(mcpUsageLogs.tenantId, tenantId))
      .orderBy(desc(mcpUsageLogs.executedAt))
      .limit(limit);

    res.json({ success: true, data: logs });
  } catch (error) {
    logger.error('[MCP-MGMT] Error fetching usage logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch usage logs' });
  }
});

// ==================== CUSTOM ACTIONS (ACTION BUILDER) ====================

// GET /api/mcp-gateway/custom-actions - List custom actions from action_definitions
router.get('/custom-actions', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const showAll = req.query.showAll === 'true';
    
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'MISSING_TENANT_ID' });
    }

    const actions = await db
      .select({
        id: actionDefinitions.id,
        actionId: actionDefinitions.actionId,
        actionName: actionDefinitions.actionName,
        description: actionDefinitions.description,
        department: actionDefinitions.department,
        actionCategory: actionDefinitions.actionCategory,
        sourceTable: actionDefinitions.sourceTable,
        isMcpEnabled: actionDefinitions.isMcpEnabled,
        exposedViaMcp: actionDefinitions.exposedViaMcp,
        mcpInputSchema: actionDefinitions.mcpInputSchema,
        isActive: actionDefinitions.isActive,
        createdAt: actionDefinitions.createdAt,
        updatedAt: actionDefinitions.updatedAt,
      })
      .from(actionDefinitions)
      .where(showAll 
        ? sql`(${actionDefinitions.tenantId} = ${tenantId} OR ${actionDefinitions.tenantId} IS NULL)`
        : and(
            sql`(${actionDefinitions.tenantId} = ${tenantId} OR ${actionDefinitions.tenantId} IS NULL)`,
            eq(actionDefinitions.isActive, true)
          )
      )
      .orderBy(actionDefinitions.department, actionDefinitions.actionName);

    res.json({ success: true, data: actions });
  } catch (error) {
    logger.error('[MCP-MGMT] Error fetching custom actions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch custom actions' });
  }
});

// POST /api/mcp-gateway/custom-actions - Create custom action
router.post('/custom-actions', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'MISSING_TENANT_ID' });
    }

    const { actionName, description, department, actionCategory, mcpInputSchema, exposedViaMcp } = req.body;
    
    const actionId = `custom_${department}_${Date.now()}`;
    
    const [newAction] = await db
      .insert(actionDefinitions)
      .values({
        tenantId,
        actionId,
        actionName,
        description,
        department,
        actionCategory: actionCategory || 'query',
        sourceTable: 'custom',
        isMcpEnabled: true,
        exposedViaMcp: exposedViaMcp ?? true,
        mcpInputSchema: mcpInputSchema || {},
        isActive: true,
      })
      .returning();

    res.json({ success: true, data: newAction });
  } catch (error) {
    logger.error('[MCP-MGMT] Error creating custom action:', error);
    res.status(500).json({ success: false, error: 'Failed to create custom action' });
  }
});

// POST /api/mcp-gateway/custom-actions/:id/duplicate - Duplicate custom action
router.post('/custom-actions/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    
    // Get original action
    const [original] = await db
      .select()
      .from(actionDefinitions)
      .where(eq(actionDefinitions.id, id));
    
    if (!original) {
      return res.status(404).json({ success: false, error: 'Action not found' });
    }

    // Create duplicate
    const newActionId = `${original.actionId}_copy_${Date.now()}`;
    const [duplicate] = await db
      .insert(actionDefinitions)
      .values({
        tenantId,
        actionId: newActionId,
        actionName: `${original.actionName} (Copy)`,
        description: original.description,
        department: original.department,
        actionCategory: original.actionCategory,
        sourceTable: 'custom',
        isMcpEnabled: original.isMcpEnabled,
        exposedViaMcp: original.exposedViaMcp,
        mcpInputSchema: original.mcpInputSchema,
        isActive: true,
      })
      .returning();

    res.json({ success: true, data: duplicate });
  } catch (error) {
    logger.error('[MCP-MGMT] Error duplicating custom action:', error);
    res.status(500).json({ success: false, error: 'Failed to duplicate action' });
  }
});

// DELETE /api/mcp-gateway/custom-actions/:id - Delete custom action
router.delete('/custom-actions/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    await db
      .delete(actionDefinitions)
      .where(and(
        eq(actionDefinitions.id, id),
        eq(actionDefinitions.tenantId, tenantId),
        eq(actionDefinitions.sourceTable, 'custom') // Only allow deleting custom actions
      ));

    res.json({ success: true });
  } catch (error) {
    logger.error('[MCP-MGMT] Error deleting custom action:', error);
    res.status(500).json({ success: false, error: 'Failed to delete action' });
  }
});

// ==================== QUERY TEMPLATES ====================

// GET /api/mcp-gateway/query-templates - List query templates
router.get('/query-templates', async (req: Request, res: Response) => {
  try {
    const templates = await db
      .select({
        id: mcpQueryTemplates.id,
        code: mcpQueryTemplates.code,
        name: mcpQueryTemplates.name,
        description: mcpQueryTemplates.description,
        department: mcpQueryTemplates.department,
        actionType: mcpQueryTemplates.actionType,
        availableVariables: mcpQueryTemplates.availableVariables,
        requiredVariables: mcpQueryTemplates.requiredVariables,
        isActive: mcpQueryTemplates.isActive,
        isSystemTemplate: mcpQueryTemplates.isSystemTemplate,
      })
      .from(mcpQueryTemplates)
      .where(eq(mcpQueryTemplates.isActive, true))
      .orderBy(mcpQueryTemplates.department, mcpQueryTemplates.name);

    res.json({ success: true, data: templates });
  } catch (error) {
    logger.error('[MCP-MGMT] Error fetching query templates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch query templates' });
  }
});

// GET /api/mcp-gateway/variable-categories - Get variable categories
router.get('/variable-categories', async (req: Request, res: Response) => {
  try {
    // Return predefined variable categories for the Action Builder
    const categories = [
      { id: 'employee', name: 'Dipendente', icon: 'User', variables: ['employeeName', 'employeeId', 'email'] },
      { id: 'date', name: 'Date', icon: 'Calendar', variables: ['dateFrom', 'dateTo', 'year', 'month'] },
      { id: 'store', name: 'Punto Vendita', icon: 'Store', variables: ['storeId', 'storeName', 'storeCode'] },
      { id: 'product', name: 'Prodotto', icon: 'Package', variables: ['productId', 'productCode', 'productName', 'sku'] },
      { id: 'customer', name: 'Cliente', icon: 'Users', variables: ['customerId', 'customerName', 'customerEmail'] },
      { id: 'department', name: 'Dipartimento', icon: 'Building', variables: ['departmentId', 'departmentCode'] },
      { id: 'status', name: 'Stato', icon: 'CheckCircle', variables: ['status', 'logisticStatus', 'orderStatus'] },
      { id: 'amount', name: 'Importi', icon: 'DollarSign', variables: ['minAmount', 'maxAmount', 'amount'] },
    ];

    res.json({ success: true, data: categories });
  } catch (error) {
    logger.error('[MCP-MGMT] Error fetching variable categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch variable categories' });
  }
});

export default router;
