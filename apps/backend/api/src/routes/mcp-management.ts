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
  actionDefinitions 
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
        scopes: mcpApiKeys.scopes,
        rateLimit: mcpApiKeys.rateLimit,
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

    const { name, scopes, rateLimit, expiresAt } = req.body;
    
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
        scopes: scopes || ['mcp_read'],
        rateLimit: rateLimit || 100,
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
    const { name, isActive, rateLimit, scopes } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (isActive !== undefined) updates.isActive = isActive;
    if (rateLimit !== undefined) updates.rateLimit = rateLimit;
    if (scopes !== undefined) updates.scopes = scopes;

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
        gte(mcpUsageLogs.timestamp, today)
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
        toolName: mcpUsageLogs.toolName,
        requestMethod: mcpUsageLogs.requestMethod,
        requestPath: mcpUsageLogs.requestPath,
        responseStatus: mcpUsageLogs.responseStatus,
        executionTimeMs: mcpUsageLogs.executionTimeMs,
        timestamp: mcpUsageLogs.timestamp,
        errorMessage: mcpUsageLogs.errorMessage,
      })
      .from(mcpUsageLogs)
      .where(eq(mcpUsageLogs.tenantId, tenantId))
      .orderBy(desc(mcpUsageLogs.timestamp))
      .limit(limit);

    res.json({ success: true, data: logs });
  } catch (error) {
    logger.error('[MCP-MGMT] Error fetching usage logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch usage logs' });
  }
});

export default router;
