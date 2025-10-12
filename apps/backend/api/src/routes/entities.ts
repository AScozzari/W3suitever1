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
import { legalEntities, stores, users, tenants, roles, userAssignments, rolePerms } from '../db/schema/w3suite';
import { channels, commercialAreas } from '../db/schema/public';
import { ApiSuccessResponse, ApiErrorResponse } from '../types/workflow-shared';
import { RBACStorage } from '../core/rbac-storage';

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
 * Create a new user with RBAC scope assignments
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

    // ✅ Schema che corrisponde ai campi inviati dal frontend
    const createSchema = z.object({
      username: z.string().min(1).max(100),
      nome: z.string().min(1).max(100),
      cognome: z.string().min(1).max(100),
      email: z.string().email(),
      telefono: z.string().optional(),
      ruolo: z.string().min(1), // Nome del ruolo (non UUID)
      stato: z.string().default('attivo'),
      foto: z.string().nullable().optional(),
      password: z.string().min(6),
      // ✅ Scope piramidale dal frontend - UUID strings
      selectAllLegalEntities: z.boolean().default(false),
      selectedLegalEntities: z.array(z.string()).default([]), // UUID strings
      selectedStores: z.array(z.string()).default([]) // UUID strings
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

    const data = validation.data;

    await setTenantContext(tenantId);

    // 1️⃣ Cerca il ruolo per nome nel database
    const [role] = await db
      .select()
      .from(roles)
      .where(
        and(
          eq(roles.tenantId, tenantId),
          eq(roles.name, data.ruolo)
        )
      )
      .limit(1);

    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role',
        message: `Role '${data.ruolo}' not found for tenant`,
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // 2️⃣ Crea l'utente
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        firstName: data.nome,
        lastName: data.cognome,
        email: data.email,
        phoneNumber: data.telefono || null,
        tenantId,
        isActive: data.stato === 'attivo',
        oauthProvider: 'manual'
      })
      .returning();

    // 3️⃣ Crea userAssignments con logica scope piramidale
    const rbacStorage = new RBACStorage();
    
    if (data.selectAllLegalEntities) {
      // ✅ LIVELLO 1: Accesso completo tenant
      await rbacStorage.assignRoleToUser({
        userId: user.id,
        roleId: role.id,
        scopeType: 'tenant',
        scopeId: tenantId
      });
      logger.info('User assigned tenant-wide access', { userId: user.id, roleId: role.id, tenantId });
    } else if (data.selectedStores.length > 0) {
      // ✅ LIVELLO 3: Accesso specifico a punti vendita
      for (const storeId of data.selectedStores) {
        await rbacStorage.assignRoleToUser({
          userId: user.id,
          roleId: role.id,
          scopeType: 'store',
          scopeId: storeId // UUID string
        });
      }
      logger.info('User assigned store-level access', { userId: user.id, roleId: role.id, storeCount: data.selectedStores.length });
    } else if (data.selectedLegalEntities.length > 0) {
      // ✅ LIVELLO 2: Accesso specifico a ragioni sociali
      for (const legalEntityId of data.selectedLegalEntities) {
        await rbacStorage.assignRoleToUser({
          userId: user.id,
          roleId: role.id,
          scopeType: 'legal_entity',
          scopeId: legalEntityId // UUID string
        });
      }
      logger.info('User assigned legal entity access', { userId: user.id, roleId: role.id, legalEntityCount: data.selectedLegalEntities.length });
    } else {
      // ⚠️ Fallback: se nessuna selezione, assegna accesso tenant
      await rbacStorage.assignRoleToUser({
        userId: user.id,
        roleId: role.id,
        scopeType: 'tenant',
        scopeId: tenantId
      });
      logger.warn('User assigned default tenant access (no scope selected)', { userId: user.id, roleId: role.id });
    }

    logger.info('User created with RBAC assignments', { userId: user.id, tenantId, role: role.name });

    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully with role assignments',
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

/**
 * GET /api/users/:id/assignments
 * Get user scope assignments with details
 * RBAC: Requires admin permission
 */
router.get('/users/:id/assignments', requirePermission('users', 'read'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    const userId = req.params.id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Get user assignments with role and scope details
    const assignments = await db
      .select({
        userId: userAssignments.userId,
        roleId: userAssignments.roleId,
        roleName: roles.name,
        roleDescription: roles.description,
        scopeType: userAssignments.scopeType,
        scopeId: userAssignments.scopeId,
        expiresAt: userAssignments.expiresAt,
        createdAt: userAssignments.createdAt
      })
      .from(userAssignments)
      .innerJoin(roles, eq(userAssignments.roleId, roles.id))
      .where(
        and(
          eq(userAssignments.userId, userId),
          eq(roles.tenantId, tenantId)
        )
      );

    // Enrich with scope details (legal entity or store names)
    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        let scopeDetails = null;

        if (assignment.scopeType === 'legal_entity') {
          const [legalEntity] = await db
            .select({ id: legalEntities.id, name: legalEntities.nome, code: legalEntities.codice })
            .from(legalEntities)
            .where(eq(legalEntities.id, assignment.scopeId))
            .limit(1);
          scopeDetails = legalEntity;
        } else if (assignment.scopeType === 'store') {
          const [store] = await db
            .select({ id: stores.id, name: stores.nome, code: stores.code })
            .from(stores)
            .where(eq(stores.id, assignment.scopeId))
            .limit(1);
          scopeDetails = store;
        } else if (assignment.scopeType === 'tenant') {
          const [tenant] = await db
            .select({ id: tenants.id, name: tenants.name })
            .from(tenants)
            .where(eq(tenants.id, assignment.scopeId))
            .limit(1);
          scopeDetails = tenant;
        }

        return {
          ...assignment,
          scopeDetails
        };
      })
    );

    logger.info('User assignments retrieved', { userId, assignmentsCount: enrichedAssignments.length });

    res.status(200).json({
      success: true,
      data: enrichedAssignments,
      message: 'User assignments retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving user assignments', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      userId: req.params.id 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve user assignments',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/users/:id/permissions
 * Get calculated permissions from user's role(s)
 * RBAC: Requires admin permission
 */
router.get('/users/:id/permissions', requirePermission('users', 'read'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    const userId = req.params.id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Use RBACStorage to get calculated permissions
    const rbacStorage = new RBACStorage();
    const permissions = await rbacStorage.getUserPermissions(userId, tenantId);

    logger.info('User permissions calculated', { userId, permissionsCount: permissions.length });

    res.status(200).json({
      success: true,
      data: permissions,
      message: 'User permissions calculated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error calculating user permissions', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      userId: req.params.id 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to calculate user permissions',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

export default router;