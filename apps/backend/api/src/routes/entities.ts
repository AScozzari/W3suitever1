/**
 * Entities API Routes
 * 
 * Provides REST endpoints for managing legal entities, stores, and users
 * with full tenant isolation and RBAC integration.
 */

import express from 'express';
import { z } from 'zod';
import { db, setTenantContext } from '../core/db';
import { tenantMiddleware, rbacMiddleware, requirePermission } from '../middleware/tenant';
import { correlationMiddleware, logger } from '../core/logger';
import { eq, and, sql, desc } from 'drizzle-orm';
import { legalEntities, stores, users, tenants } from '../db/schema/w3suite';
import { channels, commercialAreas } from '../db/schema/public';
import { ApiSuccessResponse, ApiErrorResponse } from '../types/workflow-shared';

const router = express.Router();

router.use(correlationMiddleware);
router.use(tenantMiddleware);

// ==================== LEGAL ENTITIES ====================

/**
 * GET /api/legal-entities
 * Get all legal entities for the current tenant
 */
router.get('/legal-entities', rbacMiddleware, requirePermission('workflow.view'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const entities = await db
      .select({
        id: legalEntities.id,
        codice: legalEntities.codice,
        ragioneSociale: legalEntities.ragioneSociale,
        formaGiuridica: legalEntities.formaGiuridica,
        partitaIva: legalEntities.partitaIva,
        codiceFiscale: legalEntities.codiceFiscale,
        settoreAttivita: legalEntities.settoreAttivita,
        isActive: legalEntities.isActive,
        createdAt: legalEntities.createdAt,
        updatedAt: legalEntities.updatedAt
      })
      .from(legalEntities)
      .where(eq(legalEntities.tenantId, tenantId))
      .orderBy(desc(legalEntities.createdAt));

    res.status(200).json({
      success: true,
      data: entities,
      message: 'Legal entities retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<typeof entities>);

  } catch (error: any) {
    logger.error('Error retrieving legal entities', { error, tenantId: req.user?.tenantId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/legal-entities
 * Create a new legal entity
 */
router.post('/legal-entities', rbacMiddleware, requirePermission('workflow.manage'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const createSchema = z.object({
      codice: z.string().min(1).max(20),
      ragioneSociale: z.string().min(1).max(255),
      formaGiuridica: z.string().optional(),
      partitaIva: z.string().optional(),
      codiceFiscale: z.string().optional(),
      settoreAttivita: z.string().optional()
    });

    const validation = createSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const [entity] = await db
      .insert(legalEntities)
      .values({
        ...validation.data,
        tenantId,
        isActive: true
      })
      .returning();

    logger.info('Legal entity created', { entityId: entity.id, tenantId });

    res.status(201).json({
      success: true,
      data: entity,
      message: 'Legal entity created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<typeof entity>);

  } catch (error: any) {
    logger.error('Error creating legal entity', { error, tenantId: req.user?.tenantId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== STORES ====================

/**
 * GET /api/stores
 * Get all stores for the current tenant
 */
router.get('/stores', rbacMiddleware, requirePermission('workflow.view'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const storesList = await db
      .select({
        id: stores.id,
        code: stores.code,
        nome: stores.nome,
        address: stores.address,
        city: stores.city,
        province: stores.province,
        cap: stores.cap,
        phone: stores.phone,
        email: stores.email,
        isActive: stores.isActive,
        legalEntityId: stores.legalEntityId,
        channelId: stores.channelId,
        commercialAreaId: stores.commercialAreaId,
        legalEntityName: legalEntities.ragioneSociale,
        channelName: channels.name,
        commercialAreaName: commercialAreas.name,
        createdAt: stores.createdAt,
        updatedAt: stores.updatedAt
      })
      .from(stores)
      .leftJoin(legalEntities, eq(stores.legalEntityId, legalEntities.id))
      .leftJoin(channels, eq(stores.channelId, channels.id))
      .leftJoin(commercialAreas, eq(stores.commercialAreaId, commercialAreas.id))
      .where(eq(stores.tenantId, tenantId))
      .orderBy(desc(stores.createdAt));

    res.status(200).json({
      success: true,
      data: storesList,
      message: 'Stores retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<typeof storesList>);

  } catch (error: any) {
    logger.error('Error retrieving stores', { error, tenantId: req.user?.tenantId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/stores
 * Create a new store
 */
router.post('/stores', rbacMiddleware, requirePermission('workflow.manage'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const createSchema = z.object({
      code: z.string().min(1).max(50),
      nome: z.string().min(1).max(255),
      legalEntityId: z.string().uuid(),
      channelId: z.string().uuid(),
      commercialAreaId: z.string().uuid(),
      address: z.string().optional(),
      city: z.string().optional(),
      province: z.string().optional(),
      cap: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional()
    });

    const validation = createSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const [store] = await db
      .insert(stores)
      .values({
        ...validation.data,
        tenantId,
        isActive: true
      })
      .returning();

    logger.info('Store created', { storeId: store.id, tenantId });

    res.status(201).json({
      success: true,
      data: store,
      message: 'Store created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<typeof store>);

  } catch (error: any) {
    logger.error('Error creating store', { error, tenantId: req.user?.tenantId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== USERS ====================

/**
 * GET /api/users
 * Get all users for the current tenant
 */
router.get('/users', rbacMiddleware, requirePermission('workflow.view'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const usersList = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
        lastActive: users.lastActive,
        isActive: users.isActive,
        oauthProvider: users.oauthProvider,
        phoneNumber: users.phoneNumber,
        birthDate: users.birthDate,
        hireDate: users.hireDate,
        department: users.department,
        jobTitle: users.jobTitle
      })
      .from(users)
      .where(eq(users.tenantId, tenantId))
      .orderBy(desc(users.createdAt));

    res.status(200).json({
      success: true,
      data: usersList,
      message: 'Users retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<typeof usersList>);

  } catch (error: any) {
    logger.error('Error retrieving users', { error, tenantId: req.user?.tenantId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/users
 * Create a new user
 */
router.post('/users', rbacMiddleware, requirePermission('workflow.manage'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const createSchema = z.object({
      email: z.string().email(),
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      phoneNumber: z.string().optional(),
      department: z.string().optional(),
      jobTitle: z.string().optional(),
      hireDate: z.string().optional()
    });

    const validation = createSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Generate user ID (in production this would come from OAuth)
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        ...validation.data,
        tenantId,
        isActive: true,
        oauthProvider: 'manual' // In production, this would be the actual OAuth provider
      })
      .returning();

    logger.info('User created', { userId: user.id, tenantId });

    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<typeof user>);

  } catch (error: any) {
    logger.error('Error creating user', { error, tenantId: req.user?.tenantId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

export default router;