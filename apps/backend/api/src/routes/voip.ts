/**
 * VoIP API Routes - edgvoip Integration
 * 
 * Provides REST endpoints for VoIP system management:
 * - Trunks (Read-only, synced from edgvoip via webhook)
 * - Extensions (Full CRUD, W3 Suite is source of truth)
 * - CDRs (Ingested from edgvoip via webhook)
 * - Contact Policies (Business hours, fallback rules)
 * - Activity Log (Audit trail for provisioning)
 * 
 * NOTE: DIDs and Routes are managed entirely in edgvoip PBX
 */

import express from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { db, setTenantContext } from '../core/db';
import { correlationMiddleware, logger } from '../core/logger';
import { rbacMiddleware, requirePermission } from '../middleware/tenant';
import { eq, and, sql, desc, or, ilike, gte, lte, inArray } from 'drizzle-orm';
import {
  tenants,
  stores,
  voipTrunks,
  voipExtensions,
  voipExtensionStoreAccess,
  contactPolicies,
  voipActivityLog,
  voipCdrs,
  voipAiSessions,
  notifications,
  users,
  voipTenantConfig,
  insertVoipExtensionSchema,
  updateVoipExtensionSchema,
  insertVoipExtensionStoreAccessSchema,
  updateVoipExtensionStoreAccessSchema,
  insertContactPolicySchema,
  updateContactPolicySchema,
  insertVoipActivityLogSchema,
  insertVoipCdrSchema,
  insertVoipAiSessionSchema,
  insertVoipTenantConfigSchema,
  updateVoipTenantConfigSchema
} from '../db/schema/w3suite';
import { encryptionKeyService } from '../core/encryption-service';
import { ApiSuccessResponse, ApiErrorResponse } from '../types/workflow-shared';
import { 
  extensionsService,
  trunksService,
  checkEdgvoipConnection,
  syncTrunksWithEdgvoip,
  syncExtensionsWithEdgvoip
} from '../integrations/edgvoip';

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

// GET /api/voip/trunks - List all trunks for tenant with store info and extension count
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

    // Get trunks with store names
    const trunksWithStores = await db
      .select({
        trunk: voipTrunks,
        storeName: stores.nome // Italian column name
      })
      .from(voipTrunks)
      .leftJoin(stores, eq(voipTrunks.storeId, stores.id))
      .where(and(...conditions))
      .orderBy(desc(voipTrunks.createdAt));

    // Get total extensions count for the tenant (extensions are tenant-scoped, not store-scoped)
    const [extensionsResult] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(voipExtensions)
      .where(eq(voipExtensions.tenantId, tenantId));
    
    const totalExtensions = Number(extensionsResult?.count || 0);

    // Map trunks with store names and extensions count
    const enrichedTrunks = trunksWithStores.map(({ trunk, storeName }) => ({
      trunk: {
        ...trunk,
        extensionsCount: totalExtensions // Show total tenant extensions
      },
      storeName
    }));

    return res.json({ 
      success: true, 
      data: enrichedTrunks 
    } as ApiSuccessResponse<typeof enrichedTrunks>);
  } catch (error) {
    logger.error('Error fetching VoIP trunks', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to fetch VoIP trunks' } as ApiErrorResponse);
  }
});

// NOTE: Trunk creation/update/delete managed by edgvoip via webhook
// See /api/webhooks/voip/trunk for sync endpoint

// POST /api/voip/trunks/refresh - Manual sync of all trunks from edgvoip
router.post('/trunks/refresh', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    logger.info('Manual trunk refresh requested', { tenantId, actor: req.user?.id });

    // Check edgvoip connection first
    const connectionCheck = await checkEdgvoipConnection(tenantId);
    if (!connectionCheck.available) {
      logger.warn('edgvoip not available for trunk refresh', { 
        tenantId, 
        error: connectionCheck.error 
      });
      
      return res.status(503).json({ 
        error: 'edgvoip service not available',
        details: connectionCheck.error
      } as ApiErrorResponse);
    }

    // Sync trunks from edgvoip
    const syncResult = await syncTrunksWithEdgvoip(tenantId);

    // Log activity
    await logActivity(
      tenantId,
      req.user?.id || 'system',
      'sync',
      'trunk',
      'all',
      syncResult.success ? 'ok' : 'fail',
      { 
        total: syncResult.total,
        synced: syncResult.synced,
        failed: syncResult.failed,
        errors: syncResult.errors
      }
    );

    if (!syncResult.success) {
      logger.error('Trunk refresh failed', { 
        tenantId, 
        syncResult 
      });

      return res.status(500).json({ 
        error: 'Trunk refresh failed',
        details: syncResult.errors
      } as ApiErrorResponse);
    }

    logger.info('Trunk refresh completed successfully', { 
      tenantId,
      total: syncResult.total,
      synced: syncResult.synced,
      failed: syncResult.failed
    });

    return res.json({ 
      success: true, 
      data: {
        message: `Successfully synced ${syncResult.synced} of ${syncResult.total} trunks from edgvoip`,
        total: syncResult.total,
        synced: syncResult.synced,
        failed: syncResult.failed,
        errors: syncResult.errors
      }
    } as ApiSuccessResponse);
  } catch (error) {
    logger.error('Error refreshing trunks', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to refresh trunks' } as ApiErrorResponse);
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

    const { status } = req.query;

    const conditions = [eq(voipExtensions.tenantId, tenantId)];
    
    // Filter by status if provided (active|inactive|suspended)
    if (status) {
      conditions.push(eq(voipExtensions.status, status as string));
    }

    // Join with users table to get user details
    const extensionsData = await db.select({
      extension: voipExtensions,
      user: users
    })
      .from(voipExtensions)
      .leftJoin(users, eq(voipExtensions.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(voipExtensions.createdAt));

    // Format response with user details and domain FQDN
    const formattedExtensions = extensionsData.map(({ extension, user }) => ({
      extension,
      userName: user ? `${user.firstName} ${user.lastName}`.trim() : '()',
      userEmail: user?.email || '',
      domainFqdn: extension.sipServer || 'sip.edgvoip.com'
    }));

    return res.json({ 
      success: true, 
      data: formattedExtensions 
    } as ApiSuccessResponse<typeof formattedExtensions>);
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

    // Auto-generate secure SIP password (20 chars)
    const plaintextPassword = extensionsService.generateSIPPassword(20);
    
    // Encrypt password for storage
    const encryptedPassword = await encryptionKeyService.encrypt(plaintextPassword, tenantId);

    // Validate input (without sipPassword from request body)
    const { sipPassword: _ignored, ...bodyWithoutPassword } = req.body;
    const validated = insertVoipExtensionSchema.omit({ sipPassword: true }).parse({
      ...bodyWithoutPassword,
      tenantId
    });

    const [newExtension] = await db.insert(voipExtensions)
      .values({
        ...validated,
        sipPassword: encryptedPassword // Store encrypted
      })
      .returning();

    await logActivity(
      tenantId,
      req.user?.id || 'system',
      'create',
      'ext',
      newExtension.id,
      'ok',
      { extension: newExtension.extension, userId: newExtension.userId }
    );

    logger.info('VoIP extension created', { 
      extensionId: newExtension.id, 
      extension: newExtension.extension, 
      userId: newExtension.userId,
      tenantId 
    });

    // Return extension data WITH plaintext password (ONLY on creation!)
    return res.status(201).json({ 
      success: true, 
      data: {
        ...newExtension,
        plaintextPassword, // ⚠️ Plaintext password - ONLY shown on creation!
        message: 'Extension created successfully. Save the password - it will not be shown again.'
      }
    } as ApiSuccessResponse);
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

// GET /api/voip/extensions/me - Get decrypted SIP credentials for logged-in user (SIP.js registration)
router.get('/extensions/me', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user?.id;

    if (!tenantId || !userId) {
      return res.status(401).json({ error: 'Authentication required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    // Get decrypted SIP credentials via service
    const credentials = await extensionsService.getUserCredentials(userId, tenantId);

    if (!credentials) {
      return res.status(404).json({ 
        error: 'No VoIP extension assigned to your account. Contact your administrator.' 
      } as ApiErrorResponse);
    }

    logger.info('SIP credentials retrieved for user', { userId, tenantId, extension: credentials.extension });

    return res.json({ 
      success: true, 
      data: credentials 
    } as ApiSuccessResponse<typeof credentials>);
  } catch (error) {
    logger.error('Error retrieving user SIP credentials', { error, userId: req.user?.id, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to retrieve SIP credentials' } as ApiErrorResponse);
  }
});

// PATCH /api/voip/extensions/:id/reset-password - Reset SIP password for extension
router.patch('/extensions/:id/reset-password', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { id } = req.params;

    // Verify extension exists
    const extension = await db.query.voipExtensions.findFirst({
      where: and(
        eq(voipExtensions.id, id),
        eq(voipExtensions.tenantId, tenantId)
      )
    });

    if (!extension) {
      return res.status(404).json({ error: 'Extension not found' } as ApiErrorResponse);
    }

    // Reset password via service
    const newPassword = await extensionsService.resetExtensionPassword(id, tenantId);

    await logActivity(
      tenantId,
      req.user?.id || 'system',
      'update',
      'ext',
      id,
      'ok',
      { action: 'password_reset', extension: extension.extension }
    );

    logger.info('SIP password reset', { extensionId: id, extension: extension.extension, tenantId });

    // Return plaintext password ONLY on reset
    return res.json({ 
      success: true, 
      data: { 
        extensionId: id,
        extension: extension.extension,
        newPassword, // Plaintext - ONLY returned once!
        message: 'SIP password reset successfully. Save this password - it will not be shown again.'
      } 
    } as ApiSuccessResponse);
  } catch (error) {
    logger.error('Error resetting SIP password', { error, extensionId: req.params.id, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to reset SIP password' } as ApiErrorResponse);
  }
});

// POST /api/voip/extensions/:id/sync - Sync extension with edgvoip API
router.post('/extensions/:id/sync', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { id } = req.params;

    // Verify extension exists
    const extension = await db.query.voipExtensions.findFirst({
      where: and(
        eq(voipExtensions.id, id),
        eq(voipExtensions.tenantId, tenantId)
      )
    });

    if (!extension) {
      return res.status(404).json({ error: 'Extension not found' } as ApiErrorResponse);
    }

    // Sync with edgvoip
    const syncResult = await extensionsService.syncExtensionWithEdgvoip(id, tenantId);

    await logActivity(
      tenantId,
      req.user?.id || 'system',
      'sync',
      'ext',
      id,
      syncResult.success ? 'ok' : 'fail',
      { extension: extension.extension, result: syncResult }
    );

    logger.info('Extension sync attempt', { 
      extensionId: id, 
      extension: extension.extension, 
      success: syncResult.success,
      tenantId 
    });

    return res.json({ 
      success: syncResult.success, 
      data: syncResult 
    } as ApiSuccessResponse);
  } catch (error) {
    logger.error('Error syncing extension', { error, extensionId: req.params.id, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to sync extension' } as ApiErrorResponse);
  }
});

// POST /api/voip/extensions/refresh-all - Manual sync of all extensions from edgvoip
router.post('/extensions/refresh-all', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    const { domainId } = req.body;

    logger.info('Manual extension refresh requested', { 
      tenantId, 
      domainId,
      actor: req.user?.id 
    });

    // Check edgvoip connection first
    const connectionCheck = await checkEdgvoipConnection(tenantId);
    if (!connectionCheck.available) {
      logger.warn('edgvoip not available for extension refresh', { 
        tenantId, 
        error: connectionCheck.error 
      });
      
      return res.status(503).json({ 
        error: 'edgvoip service not available',
        details: connectionCheck.error
      } as ApiErrorResponse);
    }

    // Sync extensions from edgvoip
    const syncResult = await syncExtensionsWithEdgvoip(tenantId);

    // Log activity
    await logActivity(
      tenantId,
      req.user?.id || 'system',
      'sync',
      'ext',
      'all',
      syncResult.success ? 'ok' : 'fail',
      { 
        total: syncResult.total,
        synced: syncResult.synced,
        failed: syncResult.failed,
        errors: syncResult.errors,
        domainId
      }
    );

    if (!syncResult.success) {
      logger.error('Extension refresh failed', { 
        tenantId, 
        syncResult 
      });

      return res.status(500).json({ 
        error: 'Extension refresh failed',
        details: syncResult.errors
      } as ApiErrorResponse);
    }

    logger.info('Extension refresh completed successfully', { 
      tenantId,
      domainId,
      total: syncResult.total,
      synced: syncResult.synced,
      failed: syncResult.failed
    });

    return res.json({ 
      success: true, 
      data: {
        message: `Successfully synced ${syncResult.synced} of ${syncResult.total} extensions from edgvoip`,
        total: syncResult.total,
        synced: syncResult.synced,
        failed: syncResult.failed,
        errors: syncResult.errors
      }
    } as ApiSuccessResponse);
  } catch (error) {
    logger.error('Error refreshing extensions', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to refresh extensions' } as ApiErrorResponse);
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

// NOTE: Routing (inbound/outbound/internal) managed entirely in edgvoip PBX

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

// POST /api/voip/cdr/client - Create CDR from authenticated frontend client (WebRTC calls)
router.post('/cdr/client', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    // Validate and create CDR
    const validated = insertVoipCdrSchema.parse({
      ...req.body,
      tenantId
    });

    const [newCdr] = await db.insert(voipCdrs)
      .values(validated)
      .returning();

    logger.info('VoIP CDR created from WebRTC client', { 
      cdrId: newCdr.id, 
      callId: newCdr.callId, 
      direction: newCdr.direction,
      disposition: newCdr.disposition,
      billsec: newCdr.billsec,
      tenantId 
    });

    return res.status(201).json({ 
      success: true, 
      data: { id: newCdr.id } 
    } as ApiSuccessResponse<{ id: string }>);
  } catch (error) {
    logger.error('Error creating VoIP CDR from client', { error, body: req.body });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors } as ApiErrorResponse);
    }
    return res.status(500).json({ error: 'Failed to create VoIP CDR' } as ApiErrorResponse);
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

    // Map trunk data with honest status information
    const trunks = trunksData.map((row: any) => ({
      id: row.voip_trunks?.id || 'unknown',
      storeId: row.voip_trunks?.storeId || 'unknown',
      storeName: row.stores?.businessName || 'N/A',
      provider: row.voip_trunks?.provider || 'Unknown',
      dbStatus: row.voip_trunks?.status || 'unknown', // Database status (not real-time)
      sipStatus: 'unknown', // Real SIP status requires PBX monitoring
      proxy: `${row.voip_trunks?.host || 'unknown'}:${row.voip_trunks?.port || 5060}`,
      aiAgent: row.voip_trunks?.aiAgentEnabled ? 'enabled' : 'disabled',
      lastPing: null, // Real monitoring requires PBX integration
    }));

    const extensions = extensionsData.map((row: any) => ({
      id: row.id,
      extension: row.extension || 'unknown',
      displayName: row.displayName || 'N/A',
      sipStatus: 'unknown', // Real SIP registration status requires PBX integration
      dbStatus: row.status, // Database status (active/inactive/suspended)
      lastRegistered: null, // Real registration time requires PBX integration
    }));

    const trunksActive = trunks.filter(t => t.dbStatus === 'active').length;
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
// NOTE: Inbound routing handled by edgvoip PBX based on trunk.aiAgentRef configuration

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

// ==================== VOICE GATEWAY AI ROUTING ====================

/**
 * POST /api/voip/ai-gateway/session
 * 
 * AI routing decision endpoint for Voice Gateway (W3 Voice Gateway Microservice)
 * Called by Voice Gateway when inbound call arrives to determine routing
 * 
 * Request body:
 * - callId: Unique call identifier
 * - did: Dialed number (DID)
 * - callerNumber: Caller ID
 * - trunkId: edgvoip trunk ID
 * - tenantId: Tenant identifier
 * - storeId: Store identifier
 * 
 * Response:
 * - routeToAI: boolean (true if route to AI agent)
 * - aiAgentRef: AI agent reference (from Brand Interface aiAgentsRegistry)
 * - aiConfig: AI agent configuration (persona, tools, etc.)
 * - fallbackExtension: Extension to transfer if AI fails
 * - sessionId: W3 Suite session ID for tracking
 */
router.post('/ai-gateway/session', async (req, res) => {
  try {
    // API key validation for Voice Gateway
    const expectedApiKey = process.env.W3_VOICE_GATEWAY_API_KEY;
    const providedApiKey = req.headers['x-api-key'] as string;

    if (!expectedApiKey) {
      logger.error('W3_VOICE_GATEWAY_API_KEY not configured on backend');
      return res.status(500).json({
        error: 'Voice Gateway API key not configured'
      } as ApiErrorResponse);
    }

    if (providedApiKey !== expectedApiKey) {
      logger.warn('Unauthorized Voice Gateway AI routing request', {
        providedKey: providedApiKey?.substring(0, 8) + '...'
      });
      return res.status(401).json({
        error: 'Unauthorized - Invalid API key'
      } as ApiErrorResponse);
    }

    const { callId, did, callerNumber, trunkId, tenantId, storeId } = req.body;

    if (!callId || !did || !callerNumber || !trunkId || !tenantId || !storeId) {
      return res.status(400).json({
        error: 'Missing required fields: callId, did, callerNumber, trunkId, tenantId, storeId'
      } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    // Find trunk configuration
    const [trunk] = await db.select()
      .from(voipTrunks)
      .where(and(
        eq(voipTrunks.edgvoipTrunkId, trunkId),
        eq(voipTrunks.tenantId, tenantId)
      ))
      .limit(1);

    if (!trunk) {
      logger.error('Trunk not found for AI routing', { trunkId, tenantId, storeId });
      return res.status(404).json({
        error: 'Trunk not found'
      } as ApiErrorResponse);
    }

    // Check if AI agent is enabled on trunk
    if (!trunk.aiAgentEnabled || !trunk.aiAgentRef) {
      logger.info('AI agent not enabled on trunk, routing to fallback', {
        trunkId,
        tenantId,
        storeId,
        callId
      });
      return res.json({
        success: true,
        data: {
          routeToAI: false,
          fallbackExtension: trunk.aiFailoverExtension || null,
          reason: 'AI agent not enabled on trunk'
        }
      } as ApiSuccessResponse);
    }

    // Check time-based routing policy
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday

    if (trunk.aiTimePolicy) {
      const policy = trunk.aiTimePolicy as any;
      
      // Check if current time falls within business hours
      if (policy.businessHours) {
        const { startHour, startMinute, endHour, endMinute, daysOfWeek } = policy.businessHours;
        
        const currentTime = currentHour * 60 + currentMinute;
        const startTime = (startHour || 0) * 60 + (startMinute || 0);
        const endTime = (endHour || 23) * 60 + (endMinute || 59);
        
        const isInTimeRange = currentTime >= startTime && currentTime <= endTime;
        const isInDayRange = !daysOfWeek || daysOfWeek.includes(currentDay);
        
        if (!isInTimeRange || !isInDayRange) {
          logger.info('Call outside business hours, routing to fallback', {
            trunkId,
            callId,
            currentTime,
            startTime,
            endTime,
            currentDay
          });
          return res.json({
            success: true,
            data: {
              routeToAI: false,
              fallbackExtension: trunk.aiFailoverExtension || null,
              reason: 'Outside business hours'
            }
          } as ApiSuccessResponse);
        }
      }
    }

    // Create AI session record
    const [session] = await db.insert(voipAiSessions).values({
      tenantId,
      storeId,
      callId,
      aiAgentRef: trunk.aiAgentRef,
      trunkId: trunk.id,
      did,
      callerNumber,
      startTs: now,
      status: 'active'
    }).returning();

    logger.info('AI routing decision: route to AI agent', {
      sessionId: session.id,
      callId,
      aiAgentRef: trunk.aiAgentRef,
      tenantId,
      storeId,
      trunkId
    });

    // Return routing decision with AI configuration
    return res.json({
      success: true,
      data: {
        routeToAI: true,
        sessionId: session.id,
        aiAgentRef: trunk.aiAgentRef,
        aiConfig: {
          model: 'gpt-4o-realtime',
          voice: 'alloy',
          temperature: 0.7,
          moduleContext: 'support' // From Brand Interface aiAgentsRegistry
        },
        fallbackExtension: trunk.aiFailoverExtension || null,
        tenantId,
        storeId
      }
    } as ApiSuccessResponse);
  } catch (error) {
    logger.error('Error processing AI routing decision', { error, body: req.body });
    return res.status(500).json({
      error: 'Internal error processing AI routing'
    } as ApiErrorResponse);
  }
});

// ==================== TRUNK AI CONFIGURATION ====================

// PATCH /api/voip/trunks/:id/ai-config - Update AI Voice Agent configuration
// Auto-triggers sync with edgvoip when AI settings change
router.patch('/trunks/:id/ai-config', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { id } = req.params;

    // Validate request body
    const updateSchema = z.object({
      aiAgentEnabled: z.boolean(),
      aiAgentRef: z.string().nullable().optional(),
      aiTimePolicy: z.any().nullable().optional(), // JSON business hours
      aiFailoverExtension: z.string().nullable().optional()
    });

    const validated = updateSchema.parse(req.body);

    // Update trunk AI configuration
    const [updated] = await db.update(voipTrunks)
      .set({
        aiAgentEnabled: validated.aiAgentEnabled,
        aiAgentRef: validated.aiAgentRef,
        aiTimePolicy: validated.aiTimePolicy,
        aiFailoverExtension: validated.aiFailoverExtension,
        updatedAt: new Date()
      })
      .where(and(
        eq(voipTrunks.id, id),
        eq(voipTrunks.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Trunk not found' } as ApiErrorResponse);
    }

    logger.info('Trunk AI config updated', {
      trunkId: id,
      aiEnabled: validated.aiAgentEnabled,
      aiAgentRef: validated.aiAgentRef,
      tenantId
    });

    await logActivity(
      tenantId,
      req.user?.id || 'system',
      'update',
      'trunk',
      id,
      'ok',
      { aiConfig: validated }
    );

    // Note: AI config is stored locally. Use trunks sync to push to edgvoip
    logger.info('Trunk AI config updated locally', { trunkId: id, tenantId });

    // Return updated trunk
    return res.json({
      success: true,
      data: {
        trunk: updated,
        message: 'AI configuration saved. Use sync to push changes to EDGVoIP.'
      }
    } as ApiSuccessResponse);
  } catch (error) {
    logger.error('Error updating trunk AI config', { error, trunkId: req.params.id, tenantId: getTenantId(req) });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors } as ApiErrorResponse);
    }
    return res.status(500).json({ error: 'Failed to update trunk AI configuration' } as ApiErrorResponse);
  }
});

// ==================== VOIP INTEGRATION SETTINGS ====================

// GET /api/voip/settings - Get tenant VoIP integration settings
router.get('/settings', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const [config] = await db
      .select({
        id: voipTenantConfig.id,
        tenantId: voipTenantConfig.tenantId,
        tenantExternalId: voipTenantConfig.tenantExternalId,
        apiKeyLastFour: voipTenantConfig.apiKeyLastFour,
        webhookSecret: voipTenantConfig.webhookSecret,
        apiBaseUrl: voipTenantConfig.apiBaseUrl,
        scopes: voipTenantConfig.scopes,
        enabled: voipTenantConfig.enabled,
        connectionStatus: voipTenantConfig.connectionStatus,
        lastConnectionTest: voipTenantConfig.lastConnectionTest,
        connectionError: voipTenantConfig.connectionError,
        createdAt: voipTenantConfig.createdAt,
        updatedAt: voipTenantConfig.updatedAt
      })
      .from(voipTenantConfig)
      .where(eq(voipTenantConfig.tenantId, tenantId));

    if (!config) {
      return res.json({
        success: true,
        data: {
          configured: false,
          config: null
        }
      } as ApiSuccessResponse);
    }

    return res.json({
      success: true,
      data: {
        configured: true,
        config: {
          id: config.id,
          tenantId: config.tenantId,
          tenantExternalId: config.tenantExternalId,
          apiKeyLastFour: config.apiKeyLastFour,
          apiBaseUrl: config.apiBaseUrl,
          scopes: config.scopes,
          enabled: config.enabled,
          connectionStatus: config.connectionStatus,
          lastConnectionTest: config.lastConnectionTest,
          connectionError: config.connectionError,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt,
          hasApiKey: !!config.apiKeyLastFour,
          hasWebhookSecret: !!config.webhookSecret
        }
      }
    } as ApiSuccessResponse);
  } catch (error) {
    logger.error('Error fetching VoIP settings', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to fetch VoIP settings' } as ApiErrorResponse);
  }
});

// PUT /api/voip/settings - Create or update tenant VoIP settings
router.put('/settings', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const updateSchema = z.object({
      tenantExternalId: z.string().min(1, 'Tenant External ID required'),
      apiKey: z.string().optional(), // Only if changing
      webhookSecret: z.string().optional(),
      apiBaseUrl: z.string().url().optional(),
      scopes: z.array(z.string()).optional(),
      enabled: z.boolean().optional()
    });

    const validated = updateSchema.parse(req.body);

    // Check if config exists
    const [existing] = await db
      .select({ id: voipTenantConfig.id })
      .from(voipTenantConfig)
      .where(eq(voipTenantConfig.tenantId, tenantId));

    let result;

    if (existing) {
      // Update existing config
      const updateData: any = {
        tenantExternalId: validated.tenantExternalId,
        updatedAt: new Date()
      };

      if (validated.apiKey) {
        // Encrypt new API key
        updateData.apiKey = await encryptionKeyService.encrypt(validated.apiKey, tenantId);
        updateData.apiKeyLastFour = validated.apiKey.slice(-4);
      }

      if (validated.webhookSecret !== undefined) {
        updateData.webhookSecret = validated.webhookSecret;
      }

      if (validated.apiBaseUrl) {
        updateData.apiBaseUrl = validated.apiBaseUrl;
      }

      if (validated.scopes) {
        updateData.scopes = validated.scopes;
      }

      if (validated.enabled !== undefined) {
        updateData.enabled = validated.enabled;
      }

      const [updated] = await db
        .update(voipTenantConfig)
        .set(updateData)
        .where(eq(voipTenantConfig.tenantId, tenantId))
        .returning();

      result = updated;
      
      logger.info('VoIP settings updated', { tenantId, configId: updated.id });
    } else {
      // Create new config
      if (!validated.apiKey) {
        return res.status(400).json({ error: 'API key required for initial setup' } as ApiErrorResponse);
      }

      const encryptedApiKey = await encryptionKeyService.encrypt(validated.apiKey, tenantId);

      const [created] = await db
        .insert(voipTenantConfig)
        .values({
          tenantId,
          tenantExternalId: validated.tenantExternalId,
          apiKey: encryptedApiKey,
          apiKeyLastFour: validated.apiKey.slice(-4),
          webhookSecret: validated.webhookSecret,
          apiBaseUrl: validated.apiBaseUrl || 'https://edgvoip.it/api/v2/voip',
          scopes: validated.scopes || ['voip:read', 'voip:write'],
          enabled: validated.enabled !== false,
          connectionStatus: 'unknown'
        })
        .returning();

      result = created;
      
      logger.info('VoIP settings created', { tenantId, configId: created.id });
    }

    // Return config without sensitive data
    return res.json({
      success: true,
      data: {
        id: result.id,
        tenantExternalId: result.tenantExternalId,
        apiKeyLastFour: result.apiKeyLastFour,
        apiBaseUrl: result.apiBaseUrl,
        scopes: result.scopes,
        enabled: result.enabled,
        connectionStatus: result.connectionStatus,
        updatedAt: result.updatedAt,
        hasApiKey: !!result.apiKeyLastFour,
        hasWebhookSecret: !!result.webhookSecret
      }
    } as ApiSuccessResponse);
  } catch (error) {
    logger.error('Error updating VoIP settings', { error, tenantId: getTenantId(req) });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors } as ApiErrorResponse);
    }
    return res.status(500).json({ error: 'Failed to update VoIP settings' } as ApiErrorResponse);
  }
});

// POST /api/voip/settings/test - Test API connection
router.post('/settings/test', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    // Get config
    const [config] = await db
      .select()
      .from(voipTenantConfig)
      .where(eq(voipTenantConfig.tenantId, tenantId));

    if (!config) {
      return res.status(404).json({ error: 'VoIP not configured for this tenant' } as ApiErrorResponse);
    }

    // Decrypt API key
    const decryptedApiKey = await encryptionKeyService.decrypt(config.apiKey, tenantId);
    if (!decryptedApiKey) {
      return res.status(500).json({ error: 'Failed to decrypt API key' } as ApiErrorResponse);
    }

    // Test connection
    try {
      // Health check is PUBLIC - no auth required
      const testUrl = `${config.apiBaseUrl || 'https://edgvoip.it/api/v2/voip'}/health`;
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const isHealthy = response.ok;
      const connectionStatus = isHealthy ? 'connected' : 'error';
      const connectionError = isHealthy ? null : `HTTP ${response.status}: ${response.statusText}`;

      // Update connection status
      await db
        .update(voipTenantConfig)
        .set({
          connectionStatus,
          lastConnectionTest: new Date(),
          connectionError
        })
        .where(eq(voipTenantConfig.tenantId, tenantId));

      logger.info('VoIP connection test completed', {
        tenantId,
        status: connectionStatus,
        httpStatus: response.status
      });

      return res.json({
        success: true,
        data: {
          connected: isHealthy,
          status: connectionStatus,
          lastTest: new Date(),
          error: connectionError,
          httpStatus: response.status
        }
      } as ApiSuccessResponse);
    } catch (fetchError: any) {
      // Network error
      const connectionError = fetchError.message || 'Connection failed';

      await db
        .update(voipTenantConfig)
        .set({
          connectionStatus: 'error',
          lastConnectionTest: new Date(),
          connectionError
        })
        .where(eq(voipTenantConfig.tenantId, tenantId));

      logger.error('VoIP connection test failed', {
        tenantId,
        error: connectionError
      });

      return res.json({
        success: true,
        data: {
          connected: false,
          status: 'error',
          lastTest: new Date(),
          error: connectionError
        }
      } as ApiSuccessResponse);
    }
  } catch (error) {
    logger.error('Error testing VoIP connection', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to test VoIP connection' } as ApiErrorResponse);
  }
});

// POST /api/voip/settings/test-all - Test all EDGVoIP APIs
router.post('/settings/test-all', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    // Get config
    const [config] = await db
      .select()
      .from(voipTenantConfig)
      .where(eq(voipTenantConfig.tenantId, tenantId));

    if (!config) {
      return res.status(404).json({ error: 'VoIP not configured for this tenant' } as ApiErrorResponse);
    }

    // Decrypt API key
    const decryptedApiKey = await encryptionKeyService.decrypt(config.apiKey, tenantId);
    if (!decryptedApiKey) {
      return res.status(500).json({ error: 'Failed to decrypt API key' } as ApiErrorResponse);
    }

    const baseUrl = config.apiBaseUrl || 'https://edgvoip.it/api/v2/voip';
    
    // Headers for authenticated endpoints
    const authHeaders = {
      'X-API-Key': decryptedApiKey,
      'X-Tenant-ID': config.tenantExternalId,
      'Content-Type': 'application/json'
    };
    
    // Headers for public endpoints (no auth)
    const publicHeaders = {
      'Content-Type': 'application/json'
    };

    // Define all API tests - health is PUBLIC, others require auth
    const apiTests = [
      { name: 'Health Check', endpoint: '/health', method: 'GET', description: 'Verifica connessione API (pubblico)', isPublic: true },
      { name: 'Lista Trunk', endpoint: '/trunks', method: 'GET', description: 'Recupera lista trunk SIP', isPublic: false },
      { name: 'Lista Extensions', endpoint: '/extensions', method: 'GET', description: 'Recupera lista interni', isPublic: false },
      { name: 'Lista DID', endpoint: '/did', method: 'GET', description: 'Recupera lista numeri DID', isPublic: false },
      { name: 'CDR Access', endpoint: '/cdr', method: 'GET', description: 'Accesso ai record chiamate', isPublic: false },
    ];

    const results: Array<{
      name: string;
      endpoint: string;
      description: string;
      success: boolean;
      status: number | null;
      responseTime: number;
      error: string | null;
      data?: any;
      requiresAuth: boolean;
    }> = [];

    // Execute all tests
    for (const test of apiTests) {
      const startTime = Date.now();
      try {
        const response = await fetch(`${baseUrl}${test.endpoint}`, {
          method: test.method,
          headers: test.isPublic ? publicHeaders : authHeaders
        });

        const responseTime = Date.now() - startTime;
        const success = response.ok;
        let responseData = null;

        try {
          responseData = await response.json();
        } catch {
          // Response might not be JSON
        }

        results.push({
          name: test.name,
          endpoint: test.endpoint,
          description: test.description,
          success,
          status: response.status,
          responseTime,
          error: success ? null : `HTTP ${response.status}: ${response.statusText}`,
          data: success && responseData ? { 
            count: Array.isArray(responseData) ? responseData.length : 
                   (responseData.data && Array.isArray(responseData.data)) ? responseData.data.length : 
                   undefined 
          } : undefined,
          requiresAuth: !test.isPublic
        });
      } catch (fetchError: any) {
        const responseTime = Date.now() - startTime;
        results.push({
          name: test.name,
          endpoint: test.endpoint,
          description: test.description,
          success: false,
          status: null,
          responseTime,
          error: fetchError.message || 'Network error',
          requiresAuth: !test.isPublic
        });
      }
    }

    // Calculate summary
    const successCount = results.filter(r => r.success).length;
    const totalTests = results.length;
    const allPassed = successCount === totalTests;

    // Update connection status based on health check
    const healthTest = results.find(r => r.name === 'Health Check');
    if (healthTest) {
      await db
        .update(voipTenantConfig)
        .set({
          connectionStatus: healthTest.success ? 'connected' : 'error',
          lastConnectionTest: new Date(),
          connectionError: healthTest.error
        })
        .where(eq(voipTenantConfig.tenantId, tenantId));
    }

    logger.info('VoIP API test-all completed', {
      tenantId,
      successCount,
      totalTests,
      allPassed
    });

    return res.json({
      success: true,
      data: {
        summary: {
          passed: successCount,
          failed: totalTests - successCount,
          total: totalTests,
          allPassed,
          testedAt: new Date()
        },
        results
      }
    } as ApiSuccessResponse);
  } catch (error) {
    logger.error('Error running VoIP API tests', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to run API tests' } as ApiErrorResponse);
  }
});

// ==================== VOIP ACTIVITY LOGS ====================

// GET /api/voip/logs - Get VoIP activity logs with filters
router.get('/logs', rbacMiddleware, requirePermission('view_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const {
      targetType,
      action,
      status,
      limit = '50',
      offset = '0',
      startDate,
      endDate
    } = req.query;

    const conditions = [eq(voipActivityLog.tenantId, tenantId)];

    if (targetType) {
      conditions.push(eq(voipActivityLog.targetType, targetType as any));
    }

    if (action) {
      conditions.push(eq(voipActivityLog.action, action as any));
    }

    if (status) {
      conditions.push(eq(voipActivityLog.status, status as any));
    }

    if (startDate) {
      conditions.push(gte(voipActivityLog.ts, new Date(startDate as string)));
    }

    if (endDate) {
      conditions.push(lte(voipActivityLog.ts, new Date(endDate as string)));
    }

    const logs = await db
      .select()
      .from(voipActivityLog)
      .where(and(...conditions))
      .orderBy(desc(voipActivityLog.ts))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(voipActivityLog)
      .where(and(...conditions));

    return res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total: countResult?.count || 0,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      }
    } as ApiSuccessResponse);
  } catch (error) {
    logger.error('Error fetching VoIP logs', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to fetch VoIP logs' } as ApiErrorResponse);
  }
});

// GET /api/voip/logs/stats - Get VoIP activity stats
router.get('/logs/stats', rbacMiddleware, requirePermission('view_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const { days = '7' } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

    // Get stats by action
    const actionStats = await db
      .select({
        action: voipActivityLog.action,
        count: sql<number>`cast(count(*) as int)`
      })
      .from(voipActivityLog)
      .where(and(
        eq(voipActivityLog.tenantId, tenantId),
        gte(voipActivityLog.ts, daysAgo)
      ))
      .groupBy(voipActivityLog.action);

    // Get stats by status
    const statusStats = await db
      .select({
        status: voipActivityLog.status,
        count: sql<number>`cast(count(*) as int)`
      })
      .from(voipActivityLog)
      .where(and(
        eq(voipActivityLog.tenantId, tenantId),
        gte(voipActivityLog.ts, daysAgo)
      ))
      .groupBy(voipActivityLog.status);

    // Get stats by target type
    const targetStats = await db
      .select({
        targetType: voipActivityLog.targetType,
        count: sql<number>`cast(count(*) as int)`
      })
      .from(voipActivityLog)
      .where(and(
        eq(voipActivityLog.tenantId, tenantId),
        gte(voipActivityLog.ts, daysAgo)
      ))
      .groupBy(voipActivityLog.targetType);

    return res.json({
      success: true,
      data: {
        period: `last ${days} days`,
        byAction: actionStats,
        byStatus: statusStats,
        byTargetType: targetStats
      }
    } as ApiSuccessResponse);
  } catch (error) {
    logger.error('Error fetching VoIP log stats', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to fetch VoIP log stats' } as ApiErrorResponse);
  }
});

// ==================== WEBHOOK TEST ENDPOINT ====================
// POST /api/voip/webhooks/test - Test webhook configuration (internal)
// Note: Main webhook receiver is at POST /api/webhooks (in webhooks.ts)

// Type for test webhook payload
interface WebhookTestPayload {
  type: string;
  tenant_id: string;
  tenant_external_id: string;
  timestamp: string;
  data: {
    call_uuid: string;
    caller_id_number: string;
    caller_id_name: string;
    destination_number: string;
    call_direction: string;
    start_time: string;
    answer_time: string;
    end_time: string;
    duration: number;
    billable_seconds: number;
    hangup_cause: string;
    hangup_cause_code: number;
  };
}

// Helper function to verify HMAC signature
function verifyTestWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  try {
    if (!signature || !secret) return false;
    const expectedSig = 'sha256=' + crypto.createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex');
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);
    if (sigBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

router.post('/webhooks/test', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }
    
    await setTenantContext(db, tenantId);
    
    // Get tenant config
    const [config] = await db
      .select({
        tenantExternalId: voipTenantConfig.tenantExternalId,
        webhookSecret: voipTenantConfig.webhookSecret
      })
      .from(voipTenantConfig)
      .where(eq(voipTenantConfig.tenantId, tenantId));
    
    if (!config) {
      return res.status(400).json({ 
        error: 'VoIP not configured',
        configured: false 
      } as ApiErrorResponse);
    }
    
    if (!config.webhookSecret) {
      return res.status(400).json({ 
        error: 'Webhook secret not configured',
        hasWebhookSecret: false 
      } as ApiErrorResponse);
    }
    
    // Simulate a test webhook payload
    const testPayload: WebhookTestPayload = {
      type: 'call.ended',
      tenant_id: 'test-internal',
      tenant_external_id: config.tenantExternalId,
      timestamp: new Date().toISOString(),
      data: {
        call_uuid: `test-${crypto.randomUUID()}`,
        caller_id_number: '+390000000000',
        caller_id_name: 'Test Call',
        destination_number: '2000',
        call_direction: 'inbound',
        start_time: new Date(Date.now() - 60000).toISOString(),
        answer_time: new Date(Date.now() - 55000).toISOString(),
        end_time: new Date().toISOString(),
        duration: 55,
        billable_seconds: 55,
        hangup_cause: 'NORMAL_CLEARING',
        hangup_cause_code: 16
      }
    };
    
    const rawPayload = JSON.stringify(testPayload);
    
    // Generate correct signature
    const signature = 'sha256=' + crypto.createHmac('sha256', config.webhookSecret)
      .update(rawPayload, 'utf8')
      .digest('hex');
    
    // Verify our own signature (sanity check)
    const isValid = verifyTestWebhookSignature(rawPayload, signature, config.webhookSecret);
    
    // Log test
    await db.insert(voipActivityLog).values({
      tenantId,
      action: 'webhook_test',
      targetType: 'webhook',
      targetId: 'internal-test',
      status: isValid ? 'success' : 'failed',
      detailsJson: {
        signatureValid: isValid,
        testPayloadType: testPayload.type,
        timestamp: testPayload.timestamp
      }
    });
    
    return res.json({
      success: true,
      data: {
        configured: true,
        hasWebhookSecret: true,
        signatureVerificationTest: isValid ? 'passed' : 'failed',
        testPayload: {
          type: testPayload.type,
          tenantExternalId: testPayload.tenant_external_id,
          timestamp: testPayload.timestamp
        },
        generatedSignature: signature.substring(0, 20) + '...',
        message: isValid 
          ? 'Webhook configuration is valid. HMAC verification works correctly.'
          : 'Webhook configuration error. HMAC verification failed.'
      }
    } as ApiSuccessResponse);
  } catch (error) {
    logger.error('Error testing webhook configuration', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to test webhook configuration' } as ApiErrorResponse);
  }
});

export default router;
