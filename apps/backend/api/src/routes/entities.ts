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

// ==================== LEGAL ENTITIES ====================

/**
 * GET /api/legal-entities
 * Get all legal entities for the current tenant
 */
router.get('/legal-entities', async (req, res) => {
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

    const result = await db.execute(sql`
      SELECT * FROM w3suite.legal_entities
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `);

    res.status(200).json({
      success: true,
      data: result.rows,
      message: 'Legal entities retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving legal entities', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve legal entities',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/legal-entities
 * Create a new legal entity
 */
router.post('/legal-entities', async (req, res) => {
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
        tenantId
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
    logger.error('Error creating legal entity', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to create legal entity',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== STORES ====================

/**
 * GET /api/stores
 * Get all stores for the current tenant
 */
router.get('/stores', async (req, res) => {
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

    const storesList = await db.execute(sql`
      SELECT * FROM w3suite.stores
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `);

    res.status(200).json({
      success: true,
      data: storesList.rows,
      message: 'Stores retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving stores', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve stores',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/stores
 * Create a new store
 */
router.post('/stores', async (req, res) => {
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

    // Auto-determine category based on code prefix
    // 5xxxxxxxx = warehouse, 6xxxxxxxx = office, 9xxxxxxxx = sales_point
    const firstChar = validation.data.code.charAt(0);
    let category: 'warehouse' | 'office' | 'sales_point' = 'sales_point';
    if (firstChar === '5') category = 'warehouse';
    else if (firstChar === '6') category = 'office';
    else if (firstChar === '9') category = 'sales_point';

    const [store] = await db
      .insert(stores)
      .values({
        ...validation.data,
        tenantId,
        category
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
    logger.error('Error creating store', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to create store',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== USERS ====================

/**
 * GET /api/users
 * Get all users for the current tenant
 */
router.get('/users', async (req, res) => {
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

    const usersList = await db.execute(sql`
      SELECT * FROM w3suite.users
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `);

    res.status(200).json({
      success: true,
      data: usersList.rows,
      message: 'Users retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving users', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve users',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/users
 * Create a new user
 */
router.post('/users', async (req, res) => {
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
    logger.error('Error creating user', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to create user',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

export default router;