/**
 * VoIP API Routes (Final Spec - 7 Tables)
 * 
 * Provides REST endpoints for VoIP system management with full tenant isolation:
 * - Trunks (Store-scoped SIP trunks)
 * - DIDs (Direct Inward Dialing numbers)
 * - Extensions (User internal numbers)
 * - Routes (Outbound routing patterns)
 * - Contact Policies (Business hours, fallback rules)
 * - Activity Log (Audit trail for provisioning)
 * - CDRs (Call Detail Records - inbound from PBX)
 */

import express from 'express';
import { z } from 'zod';
import { db, setTenantContext } from '../core/db';
import { correlationMiddleware, logger } from '../core/logger';
import { rbacMiddleware, requirePermission } from '../middleware/tenant';
import { eq, and, sql, desc, or, ilike, gte, lte, inArray } from 'drizzle-orm';
import {
  tenants,
  stores,
  voipTrunks,
  voipDids,
  voipExtensions,
  voipExtensionStoreAccess,
  voipRoutes,
  contactPolicies,
  voipActivityLog,
  voipCdrs,
  voipAiSessions,
  notifications,
  users,
  insertVoipTrunkSchema,
  updateVoipTrunkSchema,
  insertVoipDidSchema,
  updateVoipDidSchema,
  insertVoipExtensionSchema,
  updateVoipExtensionSchema,
  insertVoipExtensionStoreAccessSchema,
  updateVoipExtensionStoreAccessSchema,
  insertVoipRouteSchema,
  updateVoipRouteSchema,
  insertContactPolicySchema,
  updateContactPolicySchema,
  insertVoipActivityLogSchema,
  insertVoipCdrSchema,
  insertVoipAiSessionSchema
} from '../db/schema/w3suite';
import { ApiSuccessResponse, ApiErrorResponse } from '../types/workflow-shared';

const router = express.Router();

router.use(correlationMiddleware);

// Helper: Get tenant ID from request
const getTenantId = (req: express.Request): string | null => {
  return req.headers['x-tenant-id'] as string || req.user?.tenantId || null;
};

// Helper: Log activity
const logActivity = async (
  tenantId: string,
  actor: string,
  action: 'create' | 'update' | 'delete' | 'provision' | 'sync',
  targetType: 'trunk' | 'did' | 'ext' | 'route' | 'policy',
  targetId: string,
  status: 'ok' | 'fail',
  detailsJson?: any
) => {
  try {
    await db.insert(voipActivityLog).values({
      tenantId,
      actor,
      action,
      targetType,
      targetId,
      status,
      detailsJson
    });
  } catch (error) {
    logger.error('Failed to log VoIP activity', { error, tenantId, action, targetType, targetId });
  }
};

// ==================== VOIP TRUNKS ====================

// GET /api/voip/trunks - List all trunks for tenant
router.get('/trunks', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const { storeId } = req.query;

    const conditions = [eq(voipTrunks.tenantId, tenantId)];
    if (storeId) {
      conditions.push(eq(voipTrunks.storeId, storeId as string));
    }

    const trunks = await db.select()
      .from(voipTrunks)
      .where(and(...conditions))
      .orderBy(desc(voipTrunks.createdAt));

    return res.json({ 
      success: true, 
      data: trunks 
    } as ApiSuccessResponse<typeof trunks>);
  } catch (error) {
    logger.error('Error fetching VoIP trunks', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to fetch VoIP trunks' } as ApiErrorResponse);
  }
});

// POST /api/voip/trunks - Create VoIP trunk
router.post('/trunks', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const validated = insertVoipTrunkSchema.parse({
      ...req.body,
      tenantId
    });

    // CONSTRAINT: Max 2 trunks per store
    const existingTrunks = await db.select({ count: sql<number>`count(*)::int` })
      .from(voipTrunks)
      .where(and(
        eq(voipTrunks.tenantId, tenantId),
        eq(voipTrunks.storeId, validated.storeId)
      ));

    const trunkCount = existingTrunks[0]?.count || 0;
    if (trunkCount >= 2) {
      return res.status(400).json({ 
        error: 'Maximum 2 SIP trunks per store allowed. Please delete an existing trunk first.' 
      } as ApiErrorResponse);
    }

    const [newTrunk] = await db.insert(voipTrunks)
      .values(validated)
      .returning();

    await logActivity(
      tenantId,
      req.user?.id || 'system',
      'create',
      'trunk',
      newTrunk.id,
      'ok',
      { trunk: newTrunk }
    );

    logger.info('VoIP trunk created', { trunkId: newTrunk.id, provider: newTrunk.provider, tenantId });

    return res.status(201).json({ 
      success: true, 
      data: newTrunk 
    } as ApiSuccessResponse<typeof newTrunk>);
  } catch (error) {
    logger.error('Error creating VoIP trunk', { error, tenantId: getTenantId(req) });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors } as ApiErrorResponse);
    }
    return res.status(500).json({ error: 'Failed to create VoIP trunk' } as ApiErrorResponse);
  }
});

// PATCH /api/voip/trunks/:id - Update VoIP trunk
router.patch('/trunks/:id', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { id } = req.params;

    const updateData = updateVoipTrunkSchema.parse(req.body);

    const [updated] = await db.update(voipTrunks)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(voipTrunks.id, id),
        eq(voipTrunks.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Trunk not found' } as ApiErrorResponse);
    }

    await logActivity(
      tenantId,
      req.user?.id || 'system',
      'update',
      'trunk',
      id,
      'ok',
      { updates: updateData }
    );

    logger.info('VoIP trunk updated', { trunkId: id, tenantId });

    return res.json({ 
      success: true, 
      data: updated 
    } as ApiSuccessResponse<typeof updated>);
  } catch (error) {
    logger.error('Error updating VoIP trunk', { error, tenantId: getTenantId(req) });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors } as ApiErrorResponse);
    }
    return res.status(500).json({ error: 'Failed to update VoIP trunk' } as ApiErrorResponse);
  }
});

// DELETE /api/voip/trunks/:id - Delete VoIP trunk
router.delete('/trunks/:id', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { id } = req.params;

    const [deleted] = await db.delete(voipTrunks)
      .where(and(
        eq(voipTrunks.id, id),
        eq(voipTrunks.tenantId, tenantId)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Trunk not found' } as ApiErrorResponse);
    }

    await logActivity(
      tenantId,
      req.user?.id || 'system',
      'delete',
      'trunk',
      id,
      'ok',
      { deleted: deleted }
    );

    logger.info('VoIP trunk deleted', { trunkId: id, tenantId });

    return res.json({ 
      success: true, 
      data: { id } 
    } as ApiSuccessResponse<{ id: string }>);
  } catch (error) {
    logger.error('Error deleting VoIP trunk', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to delete VoIP trunk' } as ApiErrorResponse);
  }
});

// ==================== VOIP DIDs ====================

// GET /api/voip/dids - List all DIDs for tenant
router.get('/dids', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const { storeId, active } = req.query;

    const conditions = [eq(voipDids.tenantId, tenantId)];
    if (storeId) {
      conditions.push(eq(voipDids.storeId, storeId as string));
    }
    if (active !== undefined) {
      conditions.push(eq(voipDids.active, active === 'true'));
    }

    const dids = await db.select()
      .from(voipDids)
      .where(and(...conditions))
      .orderBy(desc(voipDids.createdAt));

    return res.json({ 
      success: true, 
      data: dids 
    } as ApiSuccessResponse<typeof dids>);
  } catch (error) {
    logger.error('Error fetching VoIP DIDs', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to fetch VoIP DIDs' } as ApiErrorResponse);
  }
});

// POST /api/voip/dids - Create VoIP DID
router.post('/dids', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const validated = insertVoipDidSchema.parse({
      ...req.body,
      tenantId
    });

    const [newDid] = await db.insert(voipDids)
      .values(validated)
      .returning();

    await logActivity(
      tenantId,
      req.user?.id || 'system',
      'create',
      'did',
      newDid.id,
      'ok',
      { did: newDid }
    );

    logger.info('VoIP DID created', { didId: newDid.id, e164: newDid.e164, tenantId });

    return res.status(201).json({ 
      success: true, 
      data: newDid 
    } as ApiSuccessResponse<typeof newDid>);
  } catch (error) {
    logger.error('Error creating VoIP DID', { error, tenantId: getTenantId(req) });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors } as ApiErrorResponse);
    }
    return res.status(500).json({ error: 'Failed to create VoIP DID' } as ApiErrorResponse);
  }
});

// PATCH /api/voip/dids/:id - Update VoIP DID
router.patch('/dids/:id', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { id } = req.params;

    const updateData = updateVoipDidSchema.parse(req.body);

    const [updated] = await db.update(voipDids)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(voipDids.id, id),
        eq(voipDids.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'DID not found' } as ApiErrorResponse);
    }

    await logActivity(
      tenantId,
      req.user?.id || 'system',
      'update',
      'did',
      id,
      'ok',
      { updates: updateData }
    );

    logger.info('VoIP DID updated', { didId: id, tenantId });

    return res.json({ 
      success: true, 
      data: updated 
    } as ApiSuccessResponse<typeof updated>);
  } catch (error) {
    logger.error('Error updating VoIP DID', { error, tenantId: getTenantId(req) });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors } as ApiErrorResponse);
    }
    return res.status(500).json({ error: 'Failed to update VoIP DID' } as ApiErrorResponse);
  }
});

// DELETE /api/voip/dids/:id - Delete VoIP DID
router.delete('/dids/:id', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { id } = req.params;

    const [deleted] = await db.delete(voipDids)
      .where(and(
        eq(voipDids.id, id),
        eq(voipDids.tenantId, tenantId)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'DID not found' } as ApiErrorResponse);
    }

    await logActivity(
      tenantId,
      req.user?.id || 'system',
      'delete',
      'did',
      id,
      'ok',
      { deleted: deleted }
    );

    logger.info('VoIP DID deleted', { didId: id, tenantId });

    return res.json({ 
      success: true, 
      data: { id } 
    } as ApiSuccessResponse<{ id: string }>);
  } catch (error) {
    logger.error('Error deleting VoIP DID', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to delete VoIP DID' } as ApiErrorResponse);
  }
});

// ==================== VOIP EXTENSIONS ====================

// GET /api/voip/extensions - List all extensions for tenant
router.get('/extensions', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const { storeId, enabled } = req.query;

    const conditions = [eq(voipExtensions.tenantId, tenantId)];
    if (storeId) {
      conditions.push(eq(voipExtensions.storeId, storeId as string));
    }
    if (enabled !== undefined) {
      conditions.push(eq(voipExtensions.enabled, enabled === 'true'));
    }

    const extensions = await db.select()
      .from(voipExtensions)
      .where(and(...conditions))
      .orderBy(desc(voipExtensions.createdAt));

    return res.json({ 
      success: true, 
      data: extensions 
    } as ApiSuccessResponse<typeof extensions>);
  } catch (error) {
    logger.error('Error fetching VoIP extensions', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to fetch VoIP extensions' } as ApiErrorResponse);
  }
});

// POST /api/voip/extensions - Create VoIP extension
router.post('/extensions', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const validated = insertVoipExtensionSchema.parse({
      ...req.body,
      tenantId
    });

    const [newExtension] = await db.insert(voipExtensions)
      .values(validated)
      .returning();

    await logActivity(
      tenantId,
      req.user?.id || 'system',
      'create',
      'ext',
      newExtension.id,
      'ok',
      { extension: newExtension }
    );

    logger.info('VoIP extension created', { extensionId: newExtension.id, extNumber: newExtension.extNumber, tenantId });

    return res.status(201).json({ 
      success: true, 
      data: newExtension 
    } as ApiSuccessResponse<typeof newExtension>);
  } catch (error) {
    logger.error('Error creating VoIP extension', { error, tenantId: getTenantId(req) });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors } as ApiErrorResponse);
    }
    return res.status(500).json({ error: 'Failed to create VoIP extension' } as ApiErrorResponse);
  }
});

// PATCH /api/voip/extensions/:id - Update VoIP extension
router.patch('/extensions/:id', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { id } = req.params;

    const updateData = updateVoipExtensionSchema.parse(req.body);

    const [updated] = await db.update(voipExtensions)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(voipExtensions.id, id),
        eq(voipExtensions.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Extension not found' } as ApiErrorResponse);
    }

    await logActivity(
      tenantId,
      req.user?.id || 'system',
      'update',
      'ext',
      id,
      'ok',
      { updates: updateData }
    );

    logger.info('VoIP extension updated', { extensionId: id, tenantId });

    return res.json({ 
      success: true, 
      data: updated 
    } as ApiSuccessResponse<typeof updated>);
  } catch (error) {
    logger.error('Error updating VoIP extension', { error, tenantId: getTenantId(req) });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors } as ApiErrorResponse);
    }
    return res.status(500).json({ error: 'Failed to update VoIP extension' } as ApiErrorResponse);
  }
});

// DELETE /api/voip/extensions/:id - Delete VoIP extension
router.delete('/extensions/:id', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { id } = req.params;

    const [deleted] = await db.delete(voipExtensions)
      .where(and(
        eq(voipExtensions.id, id),
        eq(voipExtensions.tenantId, tenantId)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Extension not found' } as ApiErrorResponse);
    }

    await logActivity(
      tenantId,
      req.user?.id || 'system',
      'delete',
      'ext',
      id,
      'ok',
      { deleted: deleted }
    );

    logger.info('VoIP extension deleted', { extensionId: id, tenantId });

    return res.json({ 
      success: true, 
      data: { id } 
    } as ApiSuccessResponse<{ id: string }>);
  } catch (error) {
    logger.error('Error deleting VoIP extension', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to delete VoIP extension' } as ApiErrorResponse);
  }
});

// GET /api/voip/my-extension - Get extension for current logged-in user (Softphone SSO Auto-Login)
router.get('/my-extension', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user?.id;

    if (!tenantId || !userId) {
      return res.status(401).json({ error: 'Authentication required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    // Find extension for current user (1:1 relationship)
    const [extension] = await db.select()
      .from(voipExtensions)
      .where(and(
        eq(voipExtensions.tenantId, tenantId),
        eq(voipExtensions.userId, userId)
      ))
      .limit(1);

    if (!extension) {
      return res.status(404).json({ 
        error: 'No extension assigned to your account. Contact your administrator.' 
      } as ApiErrorResponse);
    }

    // Return real SIP credentials for softphone auto-login
    const sipCredentials = {
      sipUsername: extension.extNumber, // Use extension number as SIP username
      sipPassword: extension.sipPassword, // Real SIP password from database
      sipDomain: extension.sipDomain,
      displayName: extension.displayName,
      extension: extension.extNumber,
      storeId: extension.storeId,
      classOfService: extension.classOfService,
      enabled: extension.enabled
    };

    logger.info('Softphone SSO credentials retrieved', { 
      userId, 
      extensionId: extension.id, 
      extNumber: extension.extNumber, 
      tenantId 
    });

    return res.json({ 
      success: true, 
      data: sipCredentials 
    } as ApiSuccessResponse<typeof sipCredentials>);
  } catch (error) {
    logger.error('Error retrieving user extension for SSO', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to retrieve extension credentials' } as ApiErrorResponse);
  }
});

// ==================== EXTENSION-STORE ACCESS ====================

// GET /api/voip/extensions/:id/store-access - List enabled stores for an extension
router.get('/extensions/:id/store-access', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { id: extensionId } = req.params;

    const storeAccessList = await db.select()
      .from(voipExtensionStoreAccess)
      .where(and(
        eq(voipExtensionStoreAccess.tenantId, tenantId),
        eq(voipExtensionStoreAccess.extensionId, extensionId)
      ))
      .orderBy(desc(voipExtensionStoreAccess.createdAt));

    return res.json({ 
      success: true, 
      data: storeAccessList 
    } as ApiSuccessResponse<typeof storeAccessList>);
  } catch (error) {
    logger.error('Error fetching extension store access', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to fetch store access' } as ApiErrorResponse);
  }
});

// POST /api/voip/extension-store-access - Grant store access to extension
router.post('/extension-store-access', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const validated = insertVoipExtensionStoreAccessSchema.parse({
      ...req.body,
      tenantId
    });

    // Check if access already exists (unique constraint)
    const existing = await db.select()
      .from(voipExtensionStoreAccess)
      .where(and(
        eq(voipExtensionStoreAccess.extensionId, validated.extensionId),
        eq(voipExtensionStoreAccess.storeId, validated.storeId)
      ))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ 
        error: 'Extension already has access to this store' 
      } as ApiErrorResponse);
    }

    const [newAccess] = await db.insert(voipExtensionStoreAccess)
      .values(validated)
      .returning();

    logger.info('Extension store access granted', { 
      accessId: newAccess.id, 
      extensionId: validated.extensionId,
      storeId: validated.storeId,
      tenantId 
    });

    return res.status(201).json({ 
      success: true, 
      data: newAccess 
    } as ApiSuccessResponse<typeof newAccess>);
  } catch (error) {
    logger.error('Error granting extension store access', { error, tenantId: getTenantId(req) });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors } as ApiErrorResponse);
    }
    return res.status(500).json({ error: 'Failed to grant store access' } as ApiErrorResponse);
  }
});

// DELETE /api/voip/extension-store-access/:id - Revoke store access from extension
router.delete('/extension-store-access/:id', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { id } = req.params;

    const [deleted] = await db.delete(voipExtensionStoreAccess)
      .where(and(
        eq(voipExtensionStoreAccess.id, id),
        eq(voipExtensionStoreAccess.tenantId, tenantId)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Store access not found' } as ApiErrorResponse);
    }

    logger.info('Extension store access revoked', { 
      accessId: id, 
      extensionId: deleted.extensionId,
      storeId: deleted.storeId,
      tenantId 
    });

    return res.json({ 
      success: true, 
      data: { id } 
    } as ApiSuccessResponse<{ id: string }>);
  } catch (error) {
    logger.error('Error revoking extension store access', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to revoke store access' } as ApiErrorResponse);
  }
});

// ==================== VOIP ROUTES ====================

// GET /api/voip/routes - List all routes for tenant
router.get('/routes', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const { active } = req.query;

    const conditions = [eq(voipRoutes.tenantId, tenantId)];
    if (active !== undefined) {
      conditions.push(eq(voipRoutes.active, active === 'true'));
    }

    const routes = await db.select()
      .from(voipRoutes)
      .where(and(...conditions))
      .orderBy(voipRoutes.priority, desc(voipRoutes.createdAt));

    return res.json({ 
      success: true, 
      data: routes 
    } as ApiSuccessResponse<typeof routes>);
  } catch (error) {
    logger.error('Error fetching VoIP routes', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to fetch VoIP routes' } as ApiErrorResponse);
  }
});

// POST /api/voip/routes - Create VoIP route
router.post('/routes', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const validated = insertVoipRouteSchema.parse({
      ...req.body,
      tenantId
    });

    const [newRoute] = await db.insert(voipRoutes)
      .values(validated)
      .returning();

    await logActivity(
      tenantId,
      req.user?.id || 'system',
      'create',
      'route',
      newRoute.id,
      'ok',
      { route: newRoute }
    );

    logger.info('VoIP route created', { routeId: newRoute.id, name: newRoute.name, tenantId });

    return res.status(201).json({ 
      success: true, 
      data: newRoute 
    } as ApiSuccessResponse<typeof newRoute>);
  } catch (error) {
    logger.error('Error creating VoIP route', { error, tenantId: getTenantId(req) });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors } as ApiErrorResponse);
    }
    return res.status(500).json({ error: 'Failed to create VoIP route' } as ApiErrorResponse);
  }
});

// PATCH /api/voip/routes/:id - Update VoIP route
router.patch('/routes/:id', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { id } = req.params;

    const updateData = updateVoipRouteSchema.parse(req.body);

    const [updated] = await db.update(voipRoutes)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(voipRoutes.id, id),
        eq(voipRoutes.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Route not found' } as ApiErrorResponse);
    }

    await logActivity(
      tenantId,
      req.user?.id || 'system',
      'update',
      'route',
      id,
      'ok',
      { updates: updateData }
    );

    logger.info('VoIP route updated', { routeId: id, tenantId });

    return res.json({ 
      success: true, 
      data: updated 
    } as ApiSuccessResponse<typeof updated>);
  } catch (error) {
    logger.error('Error updating VoIP route', { error, tenantId: getTenantId(req) });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors } as ApiErrorResponse);
    }
    return res.status(500).json({ error: 'Failed to update VoIP route' } as ApiErrorResponse);
  }
});

// DELETE /api/voip/routes/:id - Delete VoIP route
router.delete('/routes/:id', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { id } = req.params;

    const [deleted] = await db.delete(voipRoutes)
      .where(and(
        eq(voipRoutes.id, id),
        eq(voipRoutes.tenantId, tenantId)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Route not found' } as ApiErrorResponse);
    }

    await logActivity(
      tenantId,
      req.user?.id || 'system',
      'delete',
      'route',
      id,
      'ok',
      { deleted: deleted }
    );

    logger.info('VoIP route deleted', { routeId: id, tenantId });

    return res.json({ 
      success: true, 
      data: { id } 
    } as ApiSuccessResponse<{ id: string }>);
  } catch (error) {
    logger.error('Error deleting VoIP route', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to delete VoIP route' } as ApiErrorResponse);
  }
});

// ==================== CONTACT POLICIES ====================

// GET /api/voip/policies - List all contact policies for tenant
router.get('/policies', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const { scopeType, scopeRef, active } = req.query;

    const conditions = [eq(contactPolicies.tenantId, tenantId)];
    if (scopeType) {
      conditions.push(eq(contactPolicies.scopeType, scopeType as string));
    }
    if (scopeRef) {
      conditions.push(eq(contactPolicies.scopeRef, scopeRef as string));
    }
    if (active !== undefined) {
      conditions.push(eq(contactPolicies.active, active === 'true'));
    }

    const policies = await db.select()
      .from(contactPolicies)
      .where(and(...conditions))
      .orderBy(desc(contactPolicies.createdAt));

    return res.json({ 
      success: true, 
      data: policies 
    } as ApiSuccessResponse<typeof policies>);
  } catch (error) {
    logger.error('Error fetching contact policies', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to fetch contact policies' } as ApiErrorResponse);
  }
});

// POST /api/voip/policies - Create contact policy
router.post('/policies', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const validated = insertContactPolicySchema.parse({
      ...req.body,
      tenantId
    });

    const [newPolicy] = await db.insert(contactPolicies)
      .values(validated)
      .returning();

    await logActivity(
      tenantId,
      req.user?.id || 'system',
      'create',
      'policy',
      newPolicy.id,
      'ok',
      { policy: newPolicy }
    );

    logger.info('Contact policy created', { policyId: newPolicy.id, scopeType: newPolicy.scopeType, tenantId });

    return res.status(201).json({ 
      success: true, 
      data: newPolicy 
    } as ApiSuccessResponse<typeof newPolicy>);
  } catch (error) {
    logger.error('Error creating contact policy', { error, tenantId: getTenantId(req) });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors } as ApiErrorResponse);
    }
    return res.status(500).json({ error: 'Failed to create contact policy' } as ApiErrorResponse);
  }
});

// PATCH /api/voip/policies/:id - Update contact policy
router.patch('/policies/:id', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { id } = req.params;

    const updateData = updateContactPolicySchema.parse(req.body);

    const [updated] = await db.update(contactPolicies)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(contactPolicies.id, id),
        eq(contactPolicies.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Policy not found' } as ApiErrorResponse);
    }

    await logActivity(
      tenantId,
      req.user?.id || 'system',
      'update',
      'policy',
      id,
      'ok',
      { updates: updateData }
    );

    logger.info('Contact policy updated', { policyId: id, tenantId });

    return res.json({ 
      success: true, 
      data: updated 
    } as ApiSuccessResponse<typeof updated>);
  } catch (error) {
    logger.error('Error updating contact policy', { error, tenantId: getTenantId(req) });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors } as ApiErrorResponse);
    }
    return res.status(500).json({ error: 'Failed to update contact policy' } as ApiErrorResponse);
  }
});

// DELETE /api/voip/policies/:id - Delete contact policy
router.delete('/policies/:id', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { id } = req.params;

    const [deleted] = await db.delete(contactPolicies)
      .where(and(
        eq(contactPolicies.id, id),
        eq(contactPolicies.tenantId, tenantId)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Policy not found' } as ApiErrorResponse);
    }

    await logActivity(
      tenantId,
      req.user?.id || 'system',
      'delete',
      'policy',
      id,
      'ok',
      { deleted: deleted }
    );

    logger.info('Contact policy deleted', { policyId: id, tenantId });

    return res.json({ 
      success: true, 
      data: { id } 
    } as ApiSuccessResponse<{ id: string }>);
  } catch (error) {
    logger.error('Error deleting contact policy', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to delete contact policy' } as ApiErrorResponse);
  }
});

// ==================== VOIP ACTIVITY LOG ====================

// GET /api/voip/activity - List activity log for tenant
router.get('/activity', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const { targetType, targetId, action, limit = '100' } = req.query;

    const conditions = [eq(voipActivityLog.tenantId, tenantId)];
    if (targetType) {
      conditions.push(eq(voipActivityLog.targetType, targetType as string));
    }
    if (targetId) {
      conditions.push(eq(voipActivityLog.targetId, targetId as string));
    }
    if (action) {
      conditions.push(eq(voipActivityLog.action, action as string));
    }

    const logs = await db.select()
      .from(voipActivityLog)
      .where(and(...conditions))
      .orderBy(desc(voipActivityLog.ts))
      .limit(parseInt(limit as string, 10));

    return res.json({ 
      success: true, 
      data: logs 
    } as ApiSuccessResponse<typeof logs>);
  } catch (error) {
    logger.error('Error fetching VoIP activity log', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to fetch VoIP activity log' } as ApiErrorResponse);
  }
});

// ==================== VOIP CDRS ====================

// GET /api/voip/cdrs - List CDRs for tenant
router.get('/cdrs', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const { storeId, direction, disposition, startDate, endDate, limit = '100' } = req.query;

    const conditions = [eq(voipCdrs.tenantId, tenantId)];
    if (storeId) {
      conditions.push(eq(voipCdrs.storeId, storeId as string));
    }
    if (direction) {
      conditions.push(eq(voipCdrs.direction, direction as any));
    }
    if (disposition) {
      conditions.push(eq(voipCdrs.disposition, disposition as any));
    }
    if (startDate) {
      conditions.push(gte(voipCdrs.startTs, new Date(startDate as string)));
    }
    if (endDate) {
      conditions.push(lte(voipCdrs.startTs, new Date(endDate as string)));
    }

    const cdrs = await db.select()
      .from(voipCdrs)
      .where(and(...conditions))
      .orderBy(desc(voipCdrs.startTs))
      .limit(parseInt(limit as string, 10));

    return res.json({ 
      success: true, 
      data: cdrs 
    } as ApiSuccessResponse<typeof cdrs>);
  } catch (error) {
    logger.error('Error fetching VoIP CDRs', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to fetch VoIP CDRs' } as ApiErrorResponse);
  }
});

// POST /api/voip/cdr - Receive CDR from PBX (webhook)
router.post('/cdr', async (req, res) => {
  try {
    // Extract tenant ID from SIP domain or API key
    const { sipDomain, tenantId: bodyTenantId } = req.body;
    
    let tenantId = bodyTenantId;
    
    // If no tenantId in body, try to lookup from sipDomain
    if (!tenantId && sipDomain) {
      // You could lookup tenant from stores table using sipDomain
      // For now, require tenantId in body
      return res.status(400).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const validated = insertVoipCdrSchema.parse({
      ...req.body,
      tenantId
    });

    const [newCdr] = await db.insert(voipCdrs)
      .values(validated)
      .returning();

    logger.info('VoIP CDR received from PBX', { 
      cdrId: newCdr.id, 
      callId: newCdr.callId, 
      direction: newCdr.direction,
      tenantId 
    });

    return res.status(201).json({ 
      success: true, 
      data: { id: newCdr.id } 
    } as ApiSuccessResponse<{ id: string }>);
  } catch (error) {
    logger.error('Error receiving VoIP CDR', { error, body: req.body });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors } as ApiErrorResponse);
    }
    return res.status(500).json({ error: 'Failed to receive VoIP CDR' } as ApiErrorResponse);
  }
});

// ==================== VOIP PROVISION/SYNC ====================

// POST /api/voip/provision/sync - Sync VoIP configuration with PBX
router.post('/provision/sync', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const { targetType, targetId } = req.body;

    // Validate targetType
    if (!['trunk', 'did', 'ext', 'route', 'policy'].includes(targetType)) {
      return res.status(400).json({ error: 'Invalid target type' } as ApiErrorResponse);
    }

    // TODO: Implement actual provisioning logic to PBX
    // This would make API calls to FreeSWITCH/Asterisk/etc. to sync configuration
    // For now, just log the sync request

    await logActivity(
      tenantId,
      req.user?.id || 'system',
      'sync',
      targetType,
      targetId,
      'ok',
      { message: 'Provisioning sync requested', targetType, targetId }
    );

    logger.info('VoIP provisioning sync requested', { targetType, targetId, tenantId });

    return res.json({ 
      success: true, 
      data: { message: 'Provisioning sync completed', targetType, targetId } 
    } as ApiSuccessResponse<any>);
  } catch (error) {
    logger.error('Error during VoIP provisioning sync', { error, tenantId: getTenantId(req) });
    
    await logActivity(
      getTenantId(req) || '',
      req.user?.id || 'system',
      'sync',
      req.body.targetType,
      req.body.targetId,
      'fail',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );

    return res.status(500).json({ error: 'Failed to sync provisioning' } as ApiErrorResponse);
  }
});

// ==================== CONNECTION STATUS (DASHBOARD) ====================

// GET /api/voip/connection-status - Real-time connection status for dashboard
router.get('/connection-status', rbacMiddleware, requirePermission('view_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    // Set tenant context for RLS
    await setTenantContext(db, tenantId);

    // Query all trunks with store names (RLS handles tenant isolation)
    // TEMP: Minimal query to debug schema issue
    const trunksData = await db
      .select()
      .from(voipTrunks)
      .leftJoin(stores, eq(voipTrunks.storeId, stores.id));

    // Query all extensions with user info (RLS handles tenant isolation)
    // TEMP: Minimal query to debug schema issue
    const extensionsData = await db
      .select()
      .from(voipExtensions);

    // TEMP: Return minimal data while debugging
    const trunks = trunksData.map((row: any) => ({
      id: row.voip_trunks?.id || 'unknown',
      storeId: row.voip_trunks?.storeId || 'unknown',
      storeName: row.stores?.businessName || 'N/A',
      provider: row.voip_trunks?.provider || 'Unknown',
      status: row.voip_trunks?.status || 'unknown',
      proxy: `${row.voip_trunks?.host || 'unknown'}:${row.voip_trunks?.port || 5060}`,
      aiAgent: 'disabled',
      lastPing: row.voip_trunks?.status === 'active' ? new Date().toISOString() : null,
    }));

    const extensions = extensionsData.map((row: any) => ({
      id: row.id,
      extension: row.extension || 'unknown',
      displayName: row.displayName || 'N/A',
      sipStatus: row.status === 'active' ? 'registered' : 'unregistered',
      lastRegistered: row.status === 'active' ? new Date().toISOString() : null,
    }));

    const trunksActive = trunks.filter(t => t.status === 'active').length;
    const trunksTotal = trunks.length;
    const extensionsRegistered = extensions.filter(e => e.sipStatus === 'registered').length;
    const extensionsTotal = extensions.length;

    const response = {
      trunks,
      extensions,
      stats: {
        trunksActive,
        trunksTotal,
        extensionsRegistered,
        extensionsTotal,
      },
    };

    logger.info('VoIP connection status retrieved', { 
      tenantId, 
      trunksTotal, 
      trunksActive, 
      extensionsTotal, 
      extensionsRegistered 
    });

    return res.json({ success: true, data: response } as ApiSuccessResponse<typeof response>);
  } catch (error) {
    logger.error('Error fetching connection status', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      tenantId: getTenantId(req) 
    });
    return res.status(500).json({ error: 'Failed to fetch connection status' } as ApiErrorResponse);
  }
});

// ==================== AI VOICE AGENT CONFIGURATION ====================

// Helper: Check if current time is within business hours considering time conditions
const isWithinBusinessHours = (timeConditions: any, timezone: string = 'Europe/Rome'): boolean => {
  if (!timeConditions) return true; // No restrictions = always available

  try {
    const now = new Date();
    const nowInTimezone = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(now);

    // Check holidays
    if (timeConditions.holidays && Array.isArray(timeConditions.holidays)) {
      const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      if (timeConditions.holidays.includes(todayStr)) {
        return false; // It's a holiday
      }
    }

    // Check business hours
    if (timeConditions.businessHours && Array.isArray(timeConditions.businessHours)) {
      const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
      const currentTime = nowInTimezone.split(', ')[1]; // Extract HH:MM

      const todaySchedule = timeConditions.businessHours.find((schedule: any) => schedule.day === dayOfWeek);
      if (!todaySchedule) {
        return false; // No schedule for this day
      }

      if (currentTime >= todaySchedule.start && currentTime <= todaySchedule.end) {
        return true;
      }
      return false;
    }

    return true; // No time conditions specified
  } catch (error) {
    logger.error('Error checking business hours', { error, timeConditions });
    return false; // Fail safe - don't enable AI if we can't validate time
  }
};

// GET /api/voip/ai-config/:storeId - Get AI Voice Agent configuration for a store
router.get('/ai-config/:storeId', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { storeId } = req.params;

    // Get all trunks for this store with AI config
    const trunks = await db.select()
      .from(voipTrunks)
      .where(and(
        eq(voipTrunks.tenantId, tenantId),
        eq(voipTrunks.storeId, storeId)
      ));

    const aiConfigs = trunks.map(trunk => ({
      trunkId: trunk.id,
      provider: trunk.provider,
      aiAgentEnabled: trunk.aiAgentEnabled,
      aiAgentRef: trunk.aiAgentRef,
      fallbackExtension: trunk.fallbackExtension,
      timeConditions: trunk.timeConditions,
      sipDomain: trunk.sipDomain,
      isCurrentlyActive: trunk.aiAgentEnabled && isWithinBusinessHours(
        trunk.timeConditions, 
        (trunk.timeConditions as any)?.timezone || 'Europe/Rome'
      )
    }));

    return res.json({ 
      success: true, 
      data: { storeId, configs: aiConfigs } 
    } as ApiSuccessResponse<{ storeId: string; configs: typeof aiConfigs }>);
  } catch (error) {
    logger.error('Error fetching AI voice config', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to fetch AI voice configuration' } as ApiErrorResponse);
  }
});

// POST /api/voip/ai-config/:storeId - Update AI Voice Agent configuration for store trunk
const aiConfigSchema = z.object({
  trunkId: z.string().uuid(),
  aiAgentEnabled: z.boolean(),
  aiAgentRef: z.string().optional().nullable(),
  fallbackExtension: z.string().optional().nullable(),
  timeConditions: z.object({
    businessHours: z.array(z.object({
      day: z.number().min(0).max(6), // 0=Sunday, 6=Saturday
      start: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
      end: z.string().regex(/^\d{2}:\d{2}$/)
    })).optional(),
    holidays: z.array(z.string()).optional(), // Array of YYYY-MM-DD dates
    timezone: z.string().optional()
  }).optional().nullable()
});

router.post('/ai-config/:storeId', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { storeId } = req.params;

    const validated = aiConfigSchema.parse(req.body);

    // Verify trunk belongs to this store and tenant
    const [trunk] = await db.select()
      .from(voipTrunks)
      .where(and(
        eq(voipTrunks.id, validated.trunkId),
        eq(voipTrunks.tenantId, tenantId),
        eq(voipTrunks.storeId, storeId)
      ))
      .limit(1);

    if (!trunk) {
      return res.status(404).json({ error: 'Trunk not found for this store' } as ApiErrorResponse);
    }

    // Update trunk with AI configuration
    const [updated] = await db.update(voipTrunks)
      .set({
        aiAgentEnabled: validated.aiAgentEnabled,
        aiAgentRef: validated.aiAgentRef,
        fallbackExtension: validated.fallbackExtension,
        timeConditions: validated.timeConditions,
        updatedAt: new Date()
      })
      .where(eq(voipTrunks.id, validated.trunkId))
      .returning();

    await logActivity(
      tenantId,
      req.user?.id || 'system',
      'update',
      'trunk',
      validated.trunkId,
      'ok',
      { aiConfig: validated }
    );

    logger.info('AI Voice Agent config updated', { 
      trunkId: validated.trunkId, 
      storeId, 
      aiEnabled: validated.aiAgentEnabled,
      tenantId 
    });

    return res.json({ 
      success: true, 
      data: updated 
    } as ApiSuccessResponse<typeof updated>);
  } catch (error) {
    logger.error('Error updating AI voice config', { error, tenantId: getTenantId(req) });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors } as ApiErrorResponse);
    }
    return res.status(500).json({ error: 'Failed to update AI voice configuration' } as ApiErrorResponse);
  }
});

// GET /api/voip/routes/inbound - FreeSWITCH Inbound Routing Endpoint
// This endpoint is called by FreeSWITCH to determine how to route an inbound call
router.get('/routes/inbound', async (req, res) => {
  try {
    const { did, domain } = req.query;

    if (!did || !domain) {
      return res.status(400).json({ 
        error: 'Missing required parameters: did and domain' 
      } as ApiErrorResponse);
    }

    // Find DID configuration
    const [didConfig] = await db.select()
      .from(voipDids)
      .where(and(
        eq(voipDids.e164, did as string),
        eq(voipDids.active, true)
      ))
      .limit(1);

    if (!didConfig) {
      logger.warn('Inbound call to unknown DID', { did, domain });
      return res.status(404).json({ 
        error: 'DID not found or inactive' 
      } as ApiErrorResponse);
    }

    // Get trunk configuration for AI settings
    const [trunk] = await db.select()
      .from(voipTrunks)
      .where(and(
        eq(voipTrunks.id, didConfig.trunkId!),
        eq(voipTrunks.sipDomain, domain as string)
      ))
      .limit(1);

    let routeTarget = didConfig.routeTargetType;
    let routeRef = didConfig.routeTargetRef;
    let aiEnabled = false;

    // Check if AI agent should handle this call
    if (trunk && trunk.aiAgentEnabled && trunk.aiAgentRef) {
      const withinBusinessHours = isWithinBusinessHours(
        trunk.timeConditions,
        (trunk.timeConditions as any)?.timezone || 'Europe/Rome'
      );

      if (withinBusinessHours) {
        aiEnabled = true;
        routeTarget = 'ai';
        routeRef = trunk.aiAgentRef;
      } else {
        // Outside business hours - use fallback
        if (trunk.fallbackExtension) {
          routeTarget = 'ext';
          routeRef = trunk.fallbackExtension;
        }
      }
    }

    const response = {
      tenantId: didConfig.tenantId,
      storeId: didConfig.storeId,
      targetType: routeTarget,
      targetRef: routeRef,
      aiEnabled,
      fallbackExtension: trunk?.fallbackExtension || null,
      sipDomain: domain
    };

    logger.info('Inbound routing resolved', { did, domain, targetType: routeTarget, aiEnabled });

    return res.json({ 
      success: true, 
      data: response 
    } as ApiSuccessResponse<typeof response>);
  } catch (error) {
    logger.error('Error resolving inbound route', { error, did: req.query.did, domain: req.query.domain });
    return res.status(500).json({ error: 'Failed to resolve inbound route' } as ApiErrorResponse);
  }
});

// POST /api/voip/ai-sessions - Create new AI voice session (called by Voice Gateway)
router.post('/ai-sessions', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const apiKey = req.headers['x-api-key'] as string;
    
    // API key validation for Voice Gateway - NO DEFAULT FALLBACK
    const expectedApiKey = process.env.W3_VOICE_GATEWAY_API_KEY;
    
    if (!expectedApiKey) {
      logger.error('W3_VOICE_GATEWAY_API_KEY not configured on backend');
      return res.status(500).json({ error: 'Server configuration error' } as ApiErrorResponse);
    }

    if (!apiKey || apiKey !== expectedApiKey) {
      return res.status(401).json({ error: 'Invalid API key' } as ApiErrorResponse);
    }

    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const validated = insertVoipAiSessionSchema.parse({
      ...req.body,
      tenantId
    });

    const [newSession] = await db.insert(voipAiSessions)
      .values(validated)
      .returning();

    logger.info('AI voice session saved', { 
      sessionId: newSession.id, 
      callId: newSession.callId,
      duration: newSession.durationSec,
      tenantId 
    });

    return res.status(201).json({ 
      success: true, 
      data: newSession 
    } as ApiSuccessResponse<typeof newSession>);
  } catch (error) {
    logger.error('Error saving AI session', { error });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors } as ApiErrorResponse);
    }
    return res.status(500).json({ error: 'Failed to save AI session' } as ApiErrorResponse);
  }
});

// POST /api/voip/admin/ai-error-notification - Send admin notification for AI errors (called by Voice Gateway)
router.post('/admin/ai-error-notification', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const apiKey = req.headers['x-api-key'] as string;
    
    // API key validation for Voice Gateway - NO DEFAULT FALLBACK
    const expectedApiKey = process.env.W3_VOICE_GATEWAY_API_KEY;
    
    if (!expectedApiKey) {
      logger.error('W3_VOICE_GATEWAY_API_KEY not configured on backend');
      return res.status(500).json({ error: 'Server configuration error' } as ApiErrorResponse);
    }

    if (!apiKey || apiKey !== expectedApiKey) {
      logger.warn('Unauthorized Voice Gateway API request', { 
        hasApiKey: !!apiKey,
        tenantId 
      });
      return res.status(401).json({ error: 'Invalid API key' } as ApiErrorResponse);
    }

    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const { callId, did, callerNumber, errorMessage, errorType, fallbackAction } = req.body;

    // Find admin users for this tenant
    const adminUsers = await db.select({ id: users.id })
      .from(users)
      .where(and(
        eq(users.tenantId, tenantId),
        eq(users.role, 'admin')
      ))
      .limit(10);

    // Alert if no admin users found
    if (adminUsers.length === 0) {
      logger.warn('CRITICAL: No admin users found for AI error notification', {
        tenantId,
        callId,
        errorMessage,
        fallbackAction
      });
      return res.status(200).json({ 
        success: true, 
        data: { 
          notificationCount: 0,
          callId,
          warning: 'No admin users found to notify'
        } 
      } as ApiSuccessResponse<{ notificationCount: number; callId: string; warning: string }>);
    }

    // Create notification for each admin
    const notificationPromises = adminUsers.map(admin => 
      db.insert(notifications).values({
        tenantId,
        targetUserId: admin.id,
        type: 'alert',
        priority: 'high',
        category: 'support',
        sourceModule: 'voip_ai',
        title: 'AI Voice Agent Error',
        message: `AI Voice Agent encountered an error on call from ${callerNumber} to DID ${did}. ${errorMessage || 'Unknown error'}. ${fallbackAction || 'Call ended.'}`,
        data: {
          callId,
          did,
          callerNumber,
          errorMessage,
          errorType,
          fallbackAction,
          timestamp: new Date().toISOString()
        },
        url: `/voip/analytics/ai-sessions?callId=${callId}`,
        status: 'unread'
      }).returning()
    );

    const createdNotifications = await Promise.all(notificationPromises);

    logger.info('Admin notifications sent for AI error', { 
      tenantId,
      callId,
      adminCount: adminUsers.length 
    });

    return res.status(201).json({ 
      success: true, 
      data: { 
        notificationCount: createdNotifications.length,
        callId 
      } 
    } as ApiSuccessResponse<{ notificationCount: number; callId: string }>);
  } catch (error) {
    logger.error('Error sending admin notification', { error });
    return res.status(500).json({ error: 'Failed to send admin notification' } as ApiErrorResponse);
  }
});

// GET /api/voip/ai-sessions - List AI voice sessions with analytics
router.get('/ai-sessions', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const { storeId, aiAgentRef, limit = '50' } = req.query;

    const conditions = [eq(voipAiSessions.tenantId, tenantId)];
    if (storeId) {
      conditions.push(eq(voipAiSessions.storeId, storeId as string));
    }
    if (aiAgentRef) {
      conditions.push(eq(voipAiSessions.aiAgentRef, aiAgentRef as string));
    }

    const sessions = await db.select()
      .from(voipAiSessions)
      .where(and(...conditions))
      .orderBy(desc(voipAiSessions.startTs))
      .limit(parseInt(limit as string));

    return res.json({ 
      success: true, 
      data: sessions 
    } as ApiSuccessResponse<typeof sessions>);
  } catch (error) {
    logger.error('Error fetching AI sessions', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to fetch AI sessions' } as ApiErrorResponse);
  }
});


export default router;
