/**
 * VoIP API Routes
 * 
 * Provides REST endpoints for VoIP system management with full tenant isolation:
 * - Domains (SIP domains for WebRTC)
 * - Trunks (Store-scoped SIP trunks)
 * - Extensions (User-scoped internal numbers)
 * - Devices (WebRTC/Deskphone registration)
 * - CDRs (Call Detail Records)
 * - Policies (Dialplan rules, blacklists, business hours)
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
  users,
  voipDomains,
  voipTrunks,
  voipExtensions,
  voipDevices,
  voipCdrs,
  voipPolicies,
  insertVoipDomainSchema,
  insertVoipTrunkSchema,
  insertVoipExtensionSchema,
  insertVoipDeviceSchema,
  insertVoipCdrSchema,
  insertVoipPolicySchema
} from '../db/schema/w3suite';
import { ApiSuccessResponse, ApiErrorResponse } from '../types/workflow-shared';

const router = express.Router();

router.use(correlationMiddleware);

// Helper: Get tenant ID from request
const getTenantId = (req: express.Request): string | null => {
  return req.headers['x-tenant-id'] as string || req.user?.tenantId || null;
};

// ==================== VOIP DOMAINS ====================

// GET /api/voip/domains - List all VoIP domains for tenant
router.get('/domains', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const domains = await db.select()
      .from(voipDomains)
      .where(eq(voipDomains.tenantId, tenantId))
      .orderBy(desc(voipDomains.createdAt));

    return res.json({ 
      success: true, 
      data: domains 
    } as ApiSuccessResponse<typeof domains>);
  } catch (error) {
    logger.error('Error fetching VoIP domains', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to fetch VoIP domains' } as ApiErrorResponse);
  }
});

// POST /api/voip/domains - Create VoIP domain
router.post('/domains', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const validated = insertVoipDomainSchema.parse({
      ...req.body,
      tenantId
    });

    const [newDomain] = await db.insert(voipDomains)
      .values(validated)
      .returning();

    logger.info('VoIP domain created', { domainId: newDomain.id, fqdn: newDomain.fqdn, tenantId });

    return res.status(201).json({ 
      success: true, 
      data: newDomain 
    } as ApiSuccessResponse<typeof newDomain>);
  } catch (error) {
    logger.error('Error creating VoIP domain', { error, tenantId: getTenantId(req) });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors } as ApiErrorResponse);
    }
    return res.status(500).json({ error: 'Failed to create VoIP domain' } as ApiErrorResponse);
  }
});

// PATCH /api/voip/domains/:id - Update VoIP domain
router.patch('/domains/:id', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { id } = req.params;

    const updateData = insertVoipDomainSchema.partial().parse(req.body);

    const [updated] = await db.update(voipDomains)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(voipDomains.id, id),
        eq(voipDomains.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'VoIP domain not found' } as ApiErrorResponse);
    }

    logger.info('VoIP domain updated', { domainId: id, tenantId });

    return res.json({ 
      success: true, 
      data: updated 
    } as ApiSuccessResponse<typeof updated>);
  } catch (error) {
    logger.error('Error updating VoIP domain', { error, tenantId: getTenantId(req) });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors } as ApiErrorResponse);
    }
    return res.status(500).json({ error: 'Failed to update VoIP domain' } as ApiErrorResponse);
  }
});

// ==================== VOIP TRUNKS ====================

// GET /api/voip/trunks - List all VoIP trunks for tenant
router.get('/trunks', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { storeId } = req.query;

    let query = db.select({
      trunk: voipTrunks,
      storeName: stores.businessName
    })
    .from(voipTrunks)
    .leftJoin(stores, eq(voipTrunks.storeId, stores.id))
    .where(eq(voipTrunks.tenantId, tenantId));

    if (storeId) {
      query = query.where(eq(voipTrunks.storeId, storeId as string)) as typeof query;
    }

    const trunks = await query.orderBy(desc(voipTrunks.createdAt));

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

    // Verify store belongs to tenant
    const store = await db.select().from(stores)
      .where(and(
        eq(stores.id, validated.storeId),
        eq(stores.tenantId, tenantId)
      ))
      .limit(1);

    if (!store.length) {
      return res.status(403).json({ error: 'Store not found or access denied' } as ApiErrorResponse);
    }

    const [newTrunk] = await db.insert(voipTrunks)
      .values(validated)
      .returning();

    logger.info('VoIP trunk created', { trunkId: newTrunk.id, storeId: newTrunk.storeId, tenantId });

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

    const updateData = insertVoipTrunkSchema.partial().parse(req.body);

    const [updated] = await db.update(voipTrunks)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(voipTrunks.id, id),
        eq(voipTrunks.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'VoIP trunk not found' } as ApiErrorResponse);
    }

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
      return res.status(404).json({ error: 'VoIP trunk not found' } as ApiErrorResponse);
    }

    logger.info('VoIP trunk deleted', { trunkId: id, tenantId });

    return res.json({ 
      success: true, 
      data: deleted 
    } as ApiSuccessResponse<typeof deleted>);
  } catch (error) {
    logger.error('Error deleting VoIP trunk', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to delete VoIP trunk' } as ApiErrorResponse);
  }
});

// ==================== VOIP EXTENSIONS ====================

// GET /api/voip/extensions - List all VoIP extensions for tenant
router.get('/extensions', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { userId, domainId } = req.query;

    let query = db.select({
      extension: voipExtensions,
      userName: users.firstName,
      userEmail: users.email,
      domainFqdn: voipDomains.fqdn
    })
    .from(voipExtensions)
    .leftJoin(users, eq(voipExtensions.userId, users.id))
    .leftJoin(voipDomains, eq(voipExtensions.domainId, voipDomains.id))
    .where(eq(voipExtensions.tenantId, tenantId));

    if (userId) {
      query = query.where(eq(voipExtensions.userId, userId as string)) as typeof query;
    }
    if (domainId) {
      query = query.where(eq(voipExtensions.domainId, domainId as string)) as typeof query;
    }

    const extensions = await query.orderBy(voipExtensions.extension);

    // Remove sensitive SIP password from response
    const sanitized = extensions.map(e => ({
      ...e,
      extension: { ...e.extension, sipPassword: undefined }
    }));

    return res.json({ 
      success: true, 
      data: sanitized 
    } as ApiSuccessResponse<typeof sanitized>);
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

    // Verify user belongs to tenant
    const user = await db.select().from(users)
      .where(and(
        eq(users.id, validated.userId),
        eq(users.tenantId, tenantId)
      ))
      .limit(1);

    if (!user.length) {
      return res.status(403).json({ error: 'User not found or access denied' } as ApiErrorResponse);
    }

    // Verify domain belongs to tenant
    const domain = await db.select().from(voipDomains)
      .where(and(
        eq(voipDomains.id, validated.domainId),
        eq(voipDomains.tenantId, tenantId)
      ))
      .limit(1);

    if (!domain.length) {
      return res.status(403).json({ error: 'Domain not found or access denied' } as ApiErrorResponse);
    }

    const [newExtension] = await db.insert(voipExtensions)
      .values(validated)
      .returning();

    logger.info('VoIP extension created', { 
      extensionId: newExtension.id, 
      extension: newExtension.extension, 
      userId: newExtension.userId,
      tenantId 
    });

    // Remove SIP password from response
    const sanitized = { ...newExtension, sipPassword: undefined };

    return res.status(201).json({ 
      success: true, 
      data: sanitized 
    } as ApiSuccessResponse<typeof sanitized>);
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

    const updateData = insertVoipExtensionSchema.partial().parse(req.body);

    const [updated] = await db.update(voipExtensions)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(voipExtensions.id, id),
        eq(voipExtensions.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'VoIP extension not found' } as ApiErrorResponse);
    }

    logger.info('VoIP extension updated', { extensionId: id, tenantId });

    // Remove SIP password from response
    const sanitized = { ...updated, sipPassword: undefined };

    return res.json({ 
      success: true, 
      data: sanitized 
    } as ApiSuccessResponse<typeof sanitized>);
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
      return res.status(404).json({ error: 'VoIP extension not found' } as ApiErrorResponse);
    }

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

// GET /api/voip/extensions/:id/credentials - Get SIP credentials for WebRTC client
router.get('/extensions/:id/credentials', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { id } = req.params;

    const [extension] = await db.select({
      extension: voipExtensions,
      domain: voipDomains
    })
    .from(voipExtensions)
    .leftJoin(voipDomains, eq(voipExtensions.domainId, voipDomains.id))
    .where(and(
      eq(voipExtensions.id, id),
      eq(voipExtensions.tenantId, tenantId)
    ))
    .limit(1);

    if (!extension) {
      return res.status(404).json({ error: 'Extension not found' } as ApiErrorResponse);
    }

    // Return SIP credentials for WebRTC registration
    const credentials = {
      sipUri: `sip:${extension.extension.sipUsername}@${extension.domain?.fqdn}`,
      username: extension.extension.sipUsername,
      password: extension.extension.sipPassword, // ⚠️ Only send over HTTPS
      domain: extension.domain?.fqdn,
      extension: extension.extension.extension,
      displayName: extension.extension.displayName,
      webrtcEnabled: extension.domain?.webrtcEnabled,
      stunServer: extension.domain?.stunServer,
      turnServer: extension.domain?.turnServer,
      turnUsername: extension.domain?.turnUsername,
      turnPassword: extension.domain?.turnPassword
    };

    logger.info('SIP credentials requested', { extensionId: id, tenantId });

    return res.json({ 
      success: true, 
      data: credentials 
    } as ApiSuccessResponse<typeof credentials>);
  } catch (error) {
    logger.error('Error fetching SIP credentials', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to fetch SIP credentials' } as ApiErrorResponse);
  }
});

// ==================== VOIP DEVICES ====================

// GET /api/voip/devices - List all registered devices
router.get('/devices', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { extensionId } = req.query;

    let query = db.select({
      device: voipDevices,
      extension: voipExtensions.extension,
      userName: users.firstName
    })
    .from(voipDevices)
    .leftJoin(voipExtensions, eq(voipDevices.extensionId, voipExtensions.id))
    .leftJoin(users, eq(voipExtensions.userId, users.id))
    .where(eq(voipDevices.tenantId, tenantId));

    if (extensionId) {
      query = query.where(eq(voipDevices.extensionId, extensionId as string)) as typeof query;
    }

    const devices = await query.orderBy(desc(voipDevices.lastRegisteredAt));

    return res.json({ 
      success: true, 
      data: devices 
    } as ApiSuccessResponse<typeof devices>);
  } catch (error) {
    logger.error('Error fetching VoIP devices', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to fetch VoIP devices' } as ApiErrorResponse);
  }
});

// POST /api/voip/devices - Register new device
router.post('/devices', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const validated = insertVoipDeviceSchema.parse({
      ...req.body,
      tenantId,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.headers['x-forwarded-for']
    });

    const [newDevice] = await db.insert(voipDevices)
      .values({
        ...validated,
        lastRegisteredAt: new Date(),
        isOnline: true
      })
      .returning();

    logger.info('VoIP device registered', { 
      deviceId: newDevice.id, 
      extensionId: newDevice.extensionId,
      deviceType: newDevice.deviceType,
      tenantId 
    });

    return res.status(201).json({ 
      success: true, 
      data: newDevice 
    } as ApiSuccessResponse<typeof newDevice>);
  } catch (error) {
    logger.error('Error registering VoIP device', { error, tenantId: getTenantId(req) });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors } as ApiErrorResponse);
    }
    return res.status(500).json({ error: 'Failed to register VoIP device' } as ApiErrorResponse);
  }
});

// ==================== VOIP CDRs ====================

// GET /api/voip/cdrs - List call detail records
router.get('/cdrs', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    
    const { 
      startDate, 
      endDate, 
      direction, 
      disposition,
      trunkId,
      phoneNumber,
      limit = '100' 
    } = req.query;

    let query = db.select({
      cdr: voipCdrs,
      trunkName: voipTrunks.name
    })
    .from(voipCdrs)
    .leftJoin(voipTrunks, eq(voipCdrs.trunkId, voipTrunks.id))
    .where(eq(voipCdrs.tenantId, tenantId));

    // Apply filters
    if (startDate) {
      query = query.where(gte(voipCdrs.startTime, new Date(startDate as string))) as typeof query;
    }
    if (endDate) {
      query = query.where(lte(voipCdrs.startTime, new Date(endDate as string))) as typeof query;
    }
    if (direction) {
      query = query.where(eq(voipCdrs.direction, direction as any)) as typeof query;
    }
    if (disposition) {
      query = query.where(eq(voipCdrs.disposition, disposition as any)) as typeof query;
    }
    if (trunkId) {
      query = query.where(eq(voipCdrs.trunkId, trunkId as string)) as typeof query;
    }
    if (phoneNumber) {
      query = query.where(
        or(
          eq(voipCdrs.fromNumber, phoneNumber as string),
          eq(voipCdrs.toNumber, phoneNumber as string)
        )
      ) as typeof query;
    }

    const cdrs = await query
      .orderBy(desc(voipCdrs.startTime))
      .limit(parseInt(limit as string));

    return res.json({ 
      success: true, 
      data: cdrs 
    } as ApiSuccessResponse<typeof cdrs>);
  } catch (error) {
    logger.error('Error fetching VoIP CDRs', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to fetch VoIP CDRs' } as ApiErrorResponse);
  }
});

// POST /api/voip/cdrs - Create CDR (typically called by FreeSWITCH webhook)
router.post('/cdrs', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
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

    logger.info('VoIP CDR created', { 
      cdrId: newCdr.id, 
      callId: newCdr.callId,
      disposition: newCdr.disposition,
      duration: newCdr.duration,
      tenantId 
    });

    return res.status(201).json({ 
      success: true, 
      data: newCdr 
    } as ApiSuccessResponse<typeof newCdr>);
  } catch (error) {
    logger.error('Error creating VoIP CDR', { error, tenantId: getTenantId(req) });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors } as ApiErrorResponse);
    }
    return res.status(500).json({ error: 'Failed to create VoIP CDR' } as ApiErrorResponse);
  }
});

// ==================== VOIP POLICIES ====================

// GET /api/voip/policies - List all policies
router.get('/policies', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { policyType } = req.query;

    let query = db.select()
      .from(voipPolicies)
      .where(eq(voipPolicies.tenantId, tenantId));

    if (policyType) {
      query = query.where(eq(voipPolicies.policyType, policyType as string)) as typeof query;
    }

    const policies = await query.orderBy(desc(voipPolicies.createdAt));

    return res.json({ 
      success: true, 
      data: policies 
    } as ApiSuccessResponse<typeof policies>);
  } catch (error) {
    logger.error('Error fetching VoIP policies', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to fetch VoIP policies' } as ApiErrorResponse);
  }
});

// POST /api/voip/policies - Create policy
router.post('/policies', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);

    const validated = insertVoipPolicySchema.parse({
      ...req.body,
      tenantId
    });

    const [newPolicy] = await db.insert(voipPolicies)
      .values(validated)
      .returning();

    logger.info('VoIP policy created', { 
      policyId: newPolicy.id, 
      policyType: newPolicy.policyType,
      tenantId 
    });

    return res.status(201).json({ 
      success: true, 
      data: newPolicy 
    } as ApiSuccessResponse<typeof newPolicy>);
  } catch (error) {
    logger.error('Error creating VoIP policy', { error, tenantId: getTenantId(req) });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors } as ApiErrorResponse);
    }
    return res.status(500).json({ error: 'Failed to create VoIP policy' } as ApiErrorResponse);
  }
});

// PATCH /api/voip/policies/:id - Update policy
router.patch('/policies/:id', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { id } = req.params;

    const updateData = insertVoipPolicySchema.partial().parse(req.body);

    const [updated] = await db.update(voipPolicies)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(voipPolicies.id, id),
        eq(voipPolicies.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'VoIP policy not found' } as ApiErrorResponse);
    }

    logger.info('VoIP policy updated', { policyId: id, tenantId });

    return res.json({ 
      success: true, 
      data: updated 
    } as ApiSuccessResponse<typeof updated>);
  } catch (error) {
    logger.error('Error updating VoIP policy', { error, tenantId: getTenantId(req) });
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors } as ApiErrorResponse);
    }
    return res.status(500).json({ error: 'Failed to update VoIP policy' } as ApiErrorResponse);
  }
});

// DELETE /api/voip/policies/:id - Delete policy
router.delete('/policies/:id', rbacMiddleware, requirePermission('manage_telephony'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant ID required' } as ApiErrorResponse);
    }

    await setTenantContext(db, tenantId);
    const { id } = req.params;

    const [deleted] = await db.delete(voipPolicies)
      .where(and(
        eq(voipPolicies.id, id),
        eq(voipPolicies.tenantId, tenantId)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'VoIP policy not found' } as ApiErrorResponse);
    }

    logger.info('VoIP policy deleted', { policyId: id, tenantId });

    return res.json({ 
      success: true, 
      data: { id } 
    } as ApiSuccessResponse<{ id: string }>);
  } catch (error) {
    logger.error('Error deleting VoIP policy', { error, tenantId: getTenantId(req) });
    return res.status(500).json({ error: 'Failed to delete VoIP policy' } as ApiErrorResponse);
  }
});

export default router;
