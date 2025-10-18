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
import { legalEntities, stores, users, tenants, roles, userAssignments, rolePerms, voipExtensions, insertVoipExtensionSchema } from '../db/schema/w3suite';
import { channels, commercialAreas, drivers } from '../db/schema/public';
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

    // ✅ Use Drizzle query builder - auto-converts snake_case to camelCase
    const entitiesList = await db.query.legalEntities.findMany({
      where: eq(legalEntities.tenantId, tenantId),
      orderBy: [desc(legalEntities.createdAt)]
    });

    res.status(200).json({
      success: true,
      data: entitiesList,
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

    // ✅ Use Drizzle query builder - auto-converts snake_case to camelCase
    const storesList = await db.query.stores.findMany({
      where: eq(stores.tenantId, tenantId),
      orderBy: [desc(stores.createdAt)]
    });

    // Map 'nome' to 'name' for frontend compatibility
    const mappedStores = storesList.map(store => ({
      ...store,
      name: store.nome
    }));

    res.status(200).json({
      success: true,
      data: mappedStores,
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

    // ✅ Use Drizzle query builder - auto-converts snake_case to camelCase
    const usersList = await db.query.users.findMany({
      where: eq(users.tenantId, tenantId),
      orderBy: [desc(users.createdAt)]
    });

    res.status(200).json({
      success: true,
      data: usersList,
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
      selectedStores: z.array(z.string()).default([]), // UUID strings
      // ✅ Extension VoIP (optional - 1:1 relationship con user)
      extension: z.object({
        extNumber: z.string().regex(/^\d{3,6}$/, "Extension must be 3-6 digits"),
        sipDomain: z.string().min(1, "SIP domain required"),
        classOfService: z.enum(['agent', 'supervisor', 'admin']).default('agent'),
        voicemailEnabled: z.boolean().default(true),
        storeId: z.string().uuid().optional(), // Optional store association
      }).optional()
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

    // 2️⃣ Crea l'utente + extension in transaction atomica
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // ✅ ATOMIC TRANSACTION: User + Extension creation (rollback on any failure)
    const { user, extension } = await db.transaction(async (tx) => {
      // Insert user
      const [createdUser] = await tx
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

      // Auto-provision VoIP Extension (if data provided) - atomic with user creation
      let createdExtension = null;
      if (data.extension) {
        // ✅ Validate extension data using insertVoipExtensionSchema
        const extensionValidation = insertVoipExtensionSchema.safeParse({
          tenantId,
          userId: createdUser.id,
          storeId: data.extension.storeId || null,
          sipDomain: data.extension.sipDomain,
          extNumber: data.extension.extNumber,
          displayName: `${data.nome} ${data.cognome}`,
          enabled: true,
          voicemailEnabled: data.extension.voicemailEnabled,
          classOfService: data.extension.classOfService,
        });

        if (!extensionValidation.success) {
          throw new Error(`Extension validation failed: ${extensionValidation.error.issues.map(i => i.message).join(', ')}`);
        }

        const [ext] = await tx
          .insert(voipExtensions)
          .values(extensionValidation.data)
          .returning();
        
        createdExtension = ext;
        logger.info('VoIP extension auto-provisioned for user', { 
          userId: createdUser.id, 
          extNumber: ext.extNumber, 
          sipDomain: ext.sipDomain,
          tenantId 
        });
      }

      return { user: createdUser, extension: createdExtension };
    });

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
      // 🚫 VALIDATION ERROR: Nessuno scope selezionato
      // L'utente DEVE selezionare almeno uno scope o richiedere esplicitamente accesso tenant
      logger.error('User creation failed - no scope selected', { userId: user.id, roleId: role.id });
      
      // Rollback: elimina l'utente creato
      await db.delete(users).where(eq(users.id, user.id));
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Devi selezionare almeno uno scope: accesso completo (tutte le legal entities), legal entities specifiche, o punti vendita specifici',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
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
 * POST /api/users/assignments-batch
 * Get assignments for multiple users in a single request (performance optimization)
 * RBAC: Requires users:read permission
 */
router.post('/users/assignments-batch', requirePermission('users', 'read'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    const { userIds } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'userIds must be a non-empty array',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);
    const rbacStorage = new RBACStorage();

    // Fetch all assignments for all users in parallel
    const assignmentPromises = userIds.map(async (userId: string) => {
      const rawAssignments = await rbacStorage.getUserRoles(userId, tenantId);

      // Enrich with scope details
      const enrichedAssignments = await Promise.all(
        rawAssignments.map(async (assignment: any) => {
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

      return {
        userId,
        assignments: enrichedAssignments
      };
    });

    const results = await Promise.all(assignmentPromises);

    logger.info('Batch user assignments retrieved', { 
      userCount: userIds.length, 
      totalAssignments: results.reduce((sum, r) => sum + r.assignments.length, 0) 
    });

    res.status(200).json({
      success: true,
      data: results,
      message: 'Batch user assignments retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving batch user assignments', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve batch user assignments',
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

// ==================== ROLES ====================

/**
 * GET /api/roles
 * Get all roles for the current tenant
 */
router.get('/roles', async (req, res) => {
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

    // Get all roles for this tenant
    const rolesList = await db.query.roles.findMany({
      where: eq(roles.tenantId, tenantId),
      orderBy: [desc(roles.createdAt)]
    });

    logger.info('Roles retrieved', { rolesCount: rolesList.length, tenantId });

    res.status(200).json({
      success: true,
      data: rolesList,
      message: 'Roles retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving roles', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve roles',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== PUBLIC REFERENCE DATA ====================

/**
 * GET /api/drivers
 * Get all active drivers from public schema (no tenant context needed)
 */
router.get('/drivers', async (req, res) => {
  try {
    // Query public.drivers - no tenant isolation needed
    const driversList = await db.query.drivers.findMany({
      where: eq(drivers.active, true),
      orderBy: [desc(drivers.name)]
    });

    res.status(200).json({
      success: true,
      data: driversList,
      message: 'Drivers retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving drivers', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve drivers',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

export default router;