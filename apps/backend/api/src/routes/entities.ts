/**
 * Entities API Routes
 * 
 * Provides REST endpoints for managing legal entities, stores, and users
 * with full tenant isolation and RBAC integration.
 */

import express from 'express';
import { z } from 'zod';
import { createHash } from 'crypto';
import { db, setTenantContext } from '../core/db';
import { tenantMiddleware, rbacMiddleware, requirePermission } from '../middleware/tenant';
import { correlationMiddleware, logger } from '../core/logger';
import { eq, and, sql, desc, inArray, or, isNull } from 'drizzle-orm';
import { legalEntities, organizationEntities, stores, users, tenants, roles, userAssignments, rolePerms, voipExtensions, insertVoipExtensionSchema, storeTrackingConfig, insertStoreTrackingConfigSchema, storeOpeningRules, drivers, supplierOverrides, financialEntities, suppliers, insertOrganizationEntitySchema, userOrganizationEntities, userTeams, userStores } from '../db/schema/w3suite';
import { channels, commercialAreas, vatRates, vatRegimes, legalForms, paymentMethods, paymentMethodsConditions, operators } from '../db/schema/public';
import { ApiSuccessResponse, ApiErrorResponse } from '../types/workflow-shared';
import { RBACStorage } from '../core/rbac-storage';
import { bidirectionalSyncService } from '../core/bidirectional-sync';

const router = express.Router();

router.use(correlationMiddleware);

/**
 * Generate a deterministic UUID v5 from a code string
 * This allows code → id synchronization while maintaining UUID format
 * Uses SHA-1 hash with W3Suite namespace UUID
 */
function codeToUUID(code: string): string {
  // W3Suite namespace UUID (generated once, hardcoded)
  const W3SUITE_NAMESPACE = '7f000000-0000-4000-8000-000000000000';
  
  // Create SHA-1 hash of namespace + code
  const hash = createHash('sha1')
    .update(W3SUITE_NAMESPACE + code)
    .digest('hex');
  
  // Format as UUID v5: xxxxxxxx-xxxx-5xxx-yxxx-xxxxxxxxxxxx
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '5' + hash.substring(13, 16), // version 5
    ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.substring(18, 20),
    hash.substring(20, 32)
  ].join('-');
}

// ==================== COMMERCIAL AREAS ====================

/**
 * GET /api/commercial-areas
 * Get all commercial areas (from public schema - shared reference data)
 * Used for area-based filtering in user/team management
 */
router.get('/commercial-areas', async (req, res) => {
  try {
    // Commercial areas are in public schema - no tenant filtering needed
    const areasList = await db.query.commercialAreas.findMany({
      orderBy: [desc(commercialAreas.createdAt)]
    });

    res.status(200).json({
      success: true,
      data: areasList,
      message: 'Commercial areas retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving commercial areas', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve commercial areas',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== OPERATORS (Telco Brands: WindTre, VeryMobile) ====================

/**
 * GET /api/operators
 * Get all active operators (from public schema - shared reference data)
 * Used for driver association and CANVAS product categorization
 */
router.get('/operators', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    
    // Operators are in public schema - no tenant filtering needed
    const operatorsList = await db
      .select()
      .from(operators)
      .where(includeInactive ? undefined : eq(operators.isActive, true))
      .orderBy(operators.sortOrder, operators.name);

    res.status(200).json({
      success: true,
      data: operatorsList,
      message: 'Operators retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving operators', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve operators',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== CHANNELS (Sales Channels) ====================

/**
 * GET /api/reference/channels
 * Get all sales channels (from public schema - shared reference data)
 * Used for CANVAS product targeting (e.g., flagship, corner, shop-in-shop)
 */
router.get('/reference/channels', async (req, res) => {
  try {
    // Channels are in public schema - no tenant filtering needed
    const channelsList = await db
      .select()
      .from(channels)
      .orderBy(channels.name);

    res.status(200).json({
      success: true,
      data: channelsList,
      message: 'Channels retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving channels', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve channels',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== ORGANIZATION ENTITIES (Ragioni Sociali dell'Organizzazione) ====================

/**
 * GET /api/organization-entities
 * Get all organization entities (Ragioni Sociali) for the current tenant
 * These are the tenant's own legal entities linked to stores
 * NOT partner entities (suppliers, financial entities, operators)
 */
router.get('/organization-entities', async (req, res) => {
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

    // Get all organization entities for the tenant with their linked stores
    const orgEntities = await db
      .select({
        id: organizationEntities.id,
        codice: organizationEntities.codice,
        nome: organizationEntities.nome,
        pIva: organizationEntities.pIva,
        stato: organizationEntities.stato,
        codiceFiscale: organizationEntities.codiceFiscale,
        formaGiuridica: organizationEntities.formaGiuridica,
        capitaleSociale: organizationEntities.capitaleSociale,
        dataCostituzione: organizationEntities.dataCostituzione,
        indirizzo: organizationEntities.indirizzo,
        citta: organizationEntities.citta,
        provincia: organizationEntities.provincia,
        cap: organizationEntities.cap,
        telefono: organizationEntities.telefono,
        email: organizationEntities.email,
        pec: organizationEntities.pec,
        rea: organizationEntities.rea,
        registroImprese: organizationEntities.registroImprese,
        logo: organizationEntities.logo,
        codiceSDI: organizationEntities.codiceSDI,
        iban: organizationEntities.iban,
        bic: organizationEntities.bic,
        website: organizationEntities.website,
        refAmminNome: organizationEntities.refAmminNome,
        refAmminCognome: organizationEntities.refAmminCognome,
        refAmminEmail: organizationEntities.refAmminEmail,
        note: organizationEntities.note,
        createdAt: organizationEntities.createdAt,
        updatedAt: organizationEntities.updatedAt,
      })
      .from(organizationEntities)
      .where(eq(organizationEntities.tenantId, tenantId))
      .orderBy(organizationEntities.codice);

    // Get linked stores count for each organization entity
    const storesData = await db
      .select({
        organizationEntityId: stores.organizationEntityId,
        storeCount: sql<number>`count(*)::int`,
      })
      .from(stores)
      .where(eq(stores.tenantId, tenantId))
      .groupBy(stores.organizationEntityId);

    const storesCountMap = new Map(
      storesData.map(s => [s.organizationEntityId, s.storeCount])
    );

    // Enhance entities with store count
    const enhancedEntities = orgEntities.map(entity => ({
      ...entity,
      storeCount: storesCountMap.get(entity.id) || 0,
      hasDependencies: (storesCountMap.get(entity.id) || 0) > 0,
    }));

    res.status(200).json({
      success: true,
      data: enhancedEntities,
      message: 'Organization entities retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving organization entities', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve organization entities',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/organization-entities
 * Create a new organization entity
 */
router.post('/organization-entities', async (req, res) => {
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

    const validatedData = insertOrganizationEntitySchema.parse({
      ...req.body,
      tenantId
    });

    const [newEntity] = await db
      .insert(organizationEntities)
      .values(validatedData)
      .returning();

    res.status(201).json({
      success: true,
      data: newEntity,
      message: 'Organization entity created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error creating organization entity', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to create organization entity',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PUT /api/organization-entities/:id
 * Update an organization entity
 */
router.put('/organization-entities/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    const { id } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const { tenantId: _, id: __, createdAt, updatedAt, ...updateData } = req.body;

    const [updatedEntity] = await db
      .update(organizationEntities)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(organizationEntities.id, id),
        eq(organizationEntities.tenantId, tenantId)
      ))
      .returning();

    if (!updatedEntity) {
      return res.status(404).json({
        success: false,
        error: 'Organization entity not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    res.status(200).json({
      success: true,
      data: updatedEntity,
      message: 'Organization entity updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating organization entity', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to update organization entity',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * DELETE /api/organization-entities/:id
 * Delete an organization entity (only if no linked stores)
 */
router.delete('/organization-entities/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    const { id } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Check if entity has linked stores
    const linkedStores = await db
      .select({ id: stores.id })
      .from(stores)
      .where(and(
        eq(stores.organizationEntityId, id),
        eq(stores.tenantId, tenantId)
      ))
      .limit(1);

    if (linkedStores.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete organization entity with linked stores',
        message: 'Rimuovi prima gli store collegati a questa ragione sociale',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const [deletedEntity] = await db
      .delete(organizationEntities)
      .where(and(
        eq(organizationEntities.id, id),
        eq(organizationEntities.tenantId, tenantId)
      ))
      .returning();

    if (!deletedEntity) {
      return res.status(404).json({
        success: false,
        error: 'Organization entity not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    res.status(200).json({
      success: true,
      data: deletedEntity,
      message: 'Organization entity deleted successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error deleting organization entity', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to delete organization entity',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== LEGAL ENTITIES (Partner Entities Only) ====================

/**
 * GET /api/legal-entities
 * Get all partner entities (Suppliers, Financial Entities, Operators) for the current tenant
 * Query params:
 * - roleFilter=true: Only return entities with at least one role
 * 
 * NOTE: This endpoint returns ONLY partner entities, NOT organization's ragioni sociali
 * For organization entities, use /api/organization-entities instead
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

    // ==================== BIDIRECTIONAL LEGAL ENTITIES ARCHITECTURE ====================
    // 1. Read from w3suite.legal_entities as the SINGLE SOURCE OF TRUTH
    // 2. Role flags (is_supplier, is_operator, is_financial_entity) determine badges
    // 3. Children (operators, suppliers, financial_entities) are nested via FK
    // 4. ONE entity per P.IVA - no duplicates
    // 5. CRITICAL: Only show PARTNER entities (at least one role flag = true)
    //    Organization entities (all flags false) belong in organization_entities page

    // Step 1: Get ONLY PARTNER legal entities (is_supplier OR is_operator OR is_financial_entity = true)
    // Plus brand-pushed (tenant_id = '00000000-0000-0000-0000-000000000000') or tenant-specific
    const BRAND_SCOPE_TENANT_ID = '00000000-0000-0000-0000-000000000000';
    
    const allLegalEntities = await db
      .select()
      .from(legalEntities)
      .where(and(
        // Tenant-specific OR brand-pushed (brand scope tenant_id)
        or(
          eq(legalEntities.tenantId, tenantId),
          eq(legalEntities.tenantId, BRAND_SCOPE_TENANT_ID)
        ),
        // CRITICAL FILTER: Must have at least one partner role
        or(
          eq(legalEntities.isSupplier, true),
          eq(legalEntities.isOperator, true),
          eq(legalEntities.isFinancialEntity, true)
        )
      ))
      .orderBy(legalEntities.nome);

    // Step 2: Operators are in public schema WITHOUT legal_entity_id FK
    // They don't link to legal_entities, so we skip this query
    const allOperators: any[] = [];

    // Step 3: Get all suppliers linked to legal entities (tenant-specific)
    const allSuppliers = await db
      .select({ 
        id: suppliers.id, 
        code: suppliers.code, 
        name: suppliers.name, 
        legalEntityId: suppliers.legalEntityId,
        status: suppliers.status,
        origin: suppliers.origin
      })
      .from(suppliers)
      .where(sql`${suppliers.legalEntityId} IS NOT NULL`);

    // Step 4: Get tenant supplier_overrides linked to legal entities
    const tenantSupplierOverrides = await db
      .select({ 
        id: supplierOverrides.id, 
        code: supplierOverrides.code, 
        name: supplierOverrides.name, 
        legalEntityId: supplierOverrides.legalEntityId,
        status: supplierOverrides.status,
        origin: supplierOverrides.origin
      })
      .from(supplierOverrides)
      .where(and(
        eq(supplierOverrides.tenantId, tenantId),
        sql`${supplierOverrides.legalEntityId} IS NOT NULL`
      ));

    // Step 5: Get all financial entities linked to legal entities
    const allFinancialEntities = await db
      .select({ 
        id: financialEntities.id, 
        code: financialEntities.code, 
        name: financialEntities.name, 
        legalEntityId: financialEntities.legalEntityId,
        status: financialEntities.status,
        origin: financialEntities.origin
      })
      .from(financialEntities)
      .where(sql`${financialEntities.legalEntityId} IS NOT NULL`);

    // Step 6: Build the response with children nested under each legal entity
    const result = allLegalEntities.map((entity) => {
      // Find children linked to this legal entity
      const childOperators = allOperators.filter(op => op.legalEntityId === entity.id);
      const childSuppliers = [
        ...allSuppliers.filter(sup => sup.legalEntityId === entity.id),
        ...tenantSupplierOverrides.filter(sup => sup.legalEntityId === entity.id)
      ];
      const childFinancialEntities = allFinancialEntities.filter(fe => fe.legalEntityId === entity.id);

      // Build roles array based on flags AND actual children
      const roles = [];
      if (entity.isSupplier || childSuppliers.length > 0) {
        roles.push({ type: 'supplier', label: 'Fornitore' });
      }
      if (entity.isOperator || childOperators.length > 0) {
        roles.push({ type: 'operator', label: 'Operatore' });
      }
      if (entity.isFinancialEntity || childFinancialEntities.length > 0) {
        roles.push({ type: 'financial_entity', label: 'Ente Finanziante' });
      }

      // Normalize status
      const normalizedStato = entity.stato === 'active' || entity.stato === 'Attiva' || entity.stato === 'attiva' ? 'Attiva' :
                              entity.stato === 'suspended' || entity.stato === 'Sospesa' ? 'Sospesa' :
                              entity.stato === 'inactive' || entity.stato === 'Cessata' ? 'Cessata' :
                              entity.stato === 'draft' || entity.stato === 'Bozza' ? 'Bozza' : entity.stato || 'Attiva';

      return {
        id: entity.id,
        codice: entity.codice,
        nome: entity.nome,
        pIva: entity.pIva,
        codiceFiscale: entity.codiceFiscale,
        formaGiuridica: entity.formaGiuridica,
        indirizzo: entity.indirizzo,
        citta: entity.citta,
        provincia: entity.provincia,
        cap: entity.cap,
        telefono: entity.telefono,
        email: entity.email,
        pec: entity.pec,
        website: entity.website,
        iban: entity.iban,
        bic: entity.bic,
        rea: entity.rea,
        registroImprese: entity.registroImprese,
        codiceSDI: entity.codiceSDI,
        capitaleSociale: entity.capitaleSociale,
        note: entity.note,
        isSupplier: entity.isSupplier,
        isOperator: entity.isOperator,
        isFinancialEntity: entity.isFinancialEntity,
        stato: normalizedStato,
        roles,
        isBrandPushed: entity.tenantId === BRAND_SCOPE_TENANT_ID, // Brand-pushed entities (shared across all tenants)
        isEditable: entity.tenantId !== BRAND_SCOPE_TENANT_ID, // Only tenant-owned entities are editable
        hasDependencies: childOperators.length > 0 || childSuppliers.length > 0 || childFinancialEntities.length > 0,
        _children: {
          operators: childOperators.map(op => ({ ...op, origin: 'brand' })),
          suppliers: childSuppliers,
          financialEntities: childFinancialEntities,
          hasOperator: childOperators.length > 0,
          hasSupplier: childSuppliers.length > 0,
          hasFinancialEntity: childFinancialEntities.length > 0,
          hasBrandManagedChildren: childOperators.length > 0 // Operators are brand-managed
        }
      };
    });

    res.status(200).json({
      success: true,
      data: result,
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
 * Create a new legal entity with child table propagation
 * If isSupplier=true → creates supplier_override
 * If isFinancialEntity=true → creates financial_entity
 */
router.post('/legal-entities', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    const userId = req.user?.id;
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
      settoreAttivita: z.string().optional(),
      indirizzo: z.string().optional(),
      citta: z.string().optional(),
      provincia: z.string().optional(),
      cap: z.string().optional(),
      telefono: z.string().optional(),
      email: z.string().optional(),
      pec: z.string().optional(),
      rea: z.string().optional(),
      registroImprese: z.string().optional(),
      codiceSDI: z.string().optional(),
      iban: z.string().optional(),
      bic: z.string().optional(),
      website: z.string().optional(),
      capitaleSociale: z.string().optional(),
      isSupplier: z.boolean().default(false),
      isFinancialEntity: z.boolean().default(false),
      isOperator: z.boolean().default(false),
      supplierType: z.enum(['distributore', 'produttore', 'servizi', 'logistica']).optional(),
      note: z.string().optional()
    }).transform(data => ({
      ...data,
      nome: data.ragioneSociale,
      pIva: data.partitaIva
    }));

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

    const entityId = codeToUUID(validation.data.codice);
    const { supplierType, ...entityFields } = validation.data;
    const entityData = {
      ...entityFields,
      id: entityId,
      tenantId
    };

    const [entity] = await db
      .insert(legalEntities)
      .values(entityData as any)
      .returning();

    const createdChildren: { suppliers?: any; financialEntities?: any } = {};

    // Propagate to supplier_overrides if isSupplier flag is set
    if (validation.data.isSupplier && userId) {
      const supplierData = {
        legalEntityId: entity.id,
        origin: 'tenant' as const,
        tenantId,
        code: entity.codice,
        name: entity.nome,
        legalName: entity.nome,
        legalForm: entity.formaGiuridica,
        supplierType: supplierType || 'distributore',
        vatNumber: entity.pIva,
        taxCode: entity.codiceFiscale,
        sdiCode: entity.codiceSDI,
        pecEmail: entity.pec,
        registeredAddress: entity.indirizzo ? { via: entity.indirizzo, cap: entity.cap, citta: entity.citta, provincia: entity.provincia } : null,
        email: entity.email,
        phone: entity.telefono,
        website: entity.website,
        iban: entity.iban,
        bic: entity.bic,
        countryId: '987aed38-cc72-4d26-8284-a6e0bff74093', // Italy UUID
        createdBy: userId,
        status: 'active' as const
      };

      const [supplier] = await db
        .insert(supplierOverrides)
        .values(supplierData as any)
        .returning();
      createdChildren.suppliers = supplier;
      logger.info('Supplier created from legal entity', { legalEntityId: entity.id, supplierId: supplier.id });
    }

    // Propagate to financial_entities if isFinancialEntity flag is set
    if (validation.data.isFinancialEntity) {
      const financialEntityData = {
        legalEntityId: entity.id,
        origin: 'tenant' as const,
        tenantId,
        code: entity.codice,
        name: entity.nome,
        vatNumber: entity.pIva,
        taxCode: entity.codiceFiscale,
        sdiCode: entity.codiceSDI,
        pecEmail: entity.pec,
        registeredAddress: entity.indirizzo ? { via: entity.indirizzo, cap: entity.cap, citta: entity.citta, provincia: entity.provincia } : null,
        email: entity.email,
        phone: entity.telefono,
        website: entity.website,
        iban: entity.iban,
        bic: entity.bic,
        capitalStock: entity.capitaleSociale,
        createdBy: userId,
        status: 'active' as const
      };

      const [financialEntity] = await db
        .insert(financialEntities)
        .values(financialEntityData as any)
        .returning();
      createdChildren.financialEntities = financialEntity;
      logger.info('Financial entity created from legal entity', { legalEntityId: entity.id, financialEntityId: financialEntity.id });
    }

    logger.info('Legal entity created with child propagation', { 
      entityId: entity.id, 
      codice: validation.data.codice,
      isSupplier: validation.data.isSupplier,
      isFinancialEntity: validation.data.isFinancialEntity,
      tenantId 
    });

    res.status(201).json({
      success: true,
      data: { ...entity, _createdChildren: createdChildren },
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

/**
 * PUT /api/legal-entities/:id
 * Update a legal entity and propagate changes to linked children
 */
router.put('/legal-entities/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const updateSchema = z.object({
      codice: z.string().min(1).max(20).optional(),
      ragioneSociale: z.string().min(1).max(255).optional(),
      formaGiuridica: z.string().optional(),
      partitaIva: z.string().optional(),
      codiceFiscale: z.string().optional(),
      indirizzo: z.string().optional(),
      citta: z.string().optional(),
      provincia: z.string().optional(),
      cap: z.string().optional(),
      telefono: z.string().optional(),
      email: z.string().optional(),
      pec: z.string().optional(),
      rea: z.string().optional(),
      registroImprese: z.string().optional(),
      codiceSDI: z.string().optional(),
      iban: z.string().optional(),
      bic: z.string().optional(),
      website: z.string().optional(),
      capitaleSociale: z.string().optional(),
      isSupplier: z.boolean().optional(),
      isFinancialEntity: z.boolean().optional(),
      isOperator: z.boolean().optional(),
      supplierType: z.enum(['distributore', 'produttore', 'servizi', 'logistica']).optional(),
      stato: z.string().optional(),
      note: z.string().optional()
    });

    const validation = updateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Verify entity exists (tenant-owned OR brand-pushed)
    const existingEntity = await db.query.legalEntities.findFirst({
      where: and(eq(legalEntities.id, id), or(eq(legalEntities.tenantId, tenantId), isNull(legalEntities.tenantId)))
    });

    if (!existingEntity) {
      return res.status(404).json({
        success: false,
        error: 'Legal entity not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Brand-pushed entities (tenant_id = NULL) are read-only for tenants
    if (existingEntity.tenantId === null) {
      return res.status(403).json({
        success: false,
        error: 'Cannot modify brand-pushed entity',
        message: 'Le entità pushed dal brand sono di sola lettura. Contatta l\'amministratore del brand per modifiche.',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { supplierType, ...updateFields } = validation.data;
    const updateData: any = {
      ...updateFields,
      updatedAt: new Date()
    };
    if (updateFields.ragioneSociale) updateData.nome = updateFields.ragioneSociale;
    if (updateFields.partitaIva) updateData.pIva = updateFields.partitaIva;

    const [entity] = await db
      .update(legalEntities)
      .set(updateData)
      .where(and(eq(legalEntities.id, id), eq(legalEntities.tenantId, tenantId)))
      .returning();

    // Propagate anagrafica changes to linked suppliers (only tenant-owned)
    const supplierUpdateData = {
      name: entity.nome,
      legalName: entity.nome,
      legalForm: entity.formaGiuridica,
      vatNumber: entity.pIva,
      taxCode: entity.codiceFiscale,
      sdiCode: entity.codiceSDI,
      pecEmail: entity.pec,
      registeredAddress: entity.indirizzo ? { via: entity.indirizzo, cap: entity.cap, citta: entity.citta, provincia: entity.provincia } : null,
      email: entity.email,
      phone: entity.telefono,
      website: entity.website,
      iban: entity.iban,
      bic: entity.bic,
      updatedBy: userId,
      updatedAt: new Date()
    };

    await db
      .update(supplierOverrides)
      .set(supplierUpdateData)
      .where(and(
        eq(supplierOverrides.legalEntityId, id),
        eq(supplierOverrides.tenantId, tenantId)
      ));

    // Propagate to financial_entities (only tenant-owned)
    const financialUpdateData = {
      name: entity.nome,
      vatNumber: entity.pIva,
      taxCode: entity.codiceFiscale,
      sdiCode: entity.codiceSDI,
      pecEmail: entity.pec,
      registeredAddress: entity.indirizzo ? { via: entity.indirizzo, cap: entity.cap, citta: entity.citta, provincia: entity.provincia } : null,
      email: entity.email,
      phone: entity.telefono,
      website: entity.website,
      iban: entity.iban,
      bic: entity.bic,
      capitalStock: entity.capitaleSociale,
      updatedBy: userId,
      updatedAt: new Date()
    };

    await db
      .update(financialEntities)
      .set(financialUpdateData)
      .where(and(
        eq(financialEntities.legalEntityId, id),
        eq(financialEntities.origin, 'tenant')
      ));

    // Handle new role assignments (create children if flag newly set)
    if (validation.data.isSupplier && !existingEntity.isSupplier && userId) {
      // Check if supplier already exists
      const existingSupplier = await db.query.supplierOverrides.findFirst({
        where: and(eq(supplierOverrides.legalEntityId, id), eq(supplierOverrides.tenantId, tenantId))
      });
      if (!existingSupplier) {
        await db.insert(supplierOverrides).values({
          legalEntityId: entity.id,
          origin: 'tenant',
          tenantId,
          code: entity.codice,
          name: entity.nome,
          legalName: entity.nome,
          supplierType: supplierType || 'distributore',
          vatNumber: entity.pIva,
          taxCode: entity.codiceFiscale,
          countryId: '550e8400-e29b-41d4-a716-446655440000',
          createdBy: userId,
          status: 'active'
        } as any);
      }
    }

    if (validation.data.isFinancialEntity && !existingEntity.isFinancialEntity) {
      const existingFE = await db.query.financialEntities.findFirst({
        where: eq(financialEntities.legalEntityId, id)
      });
      if (!existingFE) {
        await db.insert(financialEntities).values({
          legalEntityId: entity.id,
          origin: 'tenant',
          tenantId,
          code: entity.codice,
          name: entity.nome,
          vatNumber: entity.pIva,
          taxCode: entity.codiceFiscale,
          createdBy: userId,
          status: 'active'
        } as any);
      }
    }

    logger.info('Legal entity updated with child propagation', { entityId: entity.id, tenantId });

    res.status(200).json({
      success: true,
      data: entity,
      message: 'Legal entity updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<typeof entity>);

  } catch (error: any) {
    logger.error('Error updating legal entity', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to update legal entity',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * DELETE /api/legal-entities/:id
 * Delete a legal entity and its tenant-owned children
 * Blocks deletion if brand-managed children exist
 */
router.delete('/legal-entities/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Check for brand-managed children (cannot delete)
    const brandSuppliers = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(and(eq(suppliers.legalEntityId, id), eq(suppliers.origin, 'brand')));

    const brandFinancialEntities = await db
      .select({ id: financialEntities.id })
      .from(financialEntities)
      .where(and(eq(financialEntities.legalEntityId, id), eq(financialEntities.origin, 'brand')));

    const linkedOperators = await db
      .select({ id: operators.id })
      .from(operators)
      .where(eq(operators.legalEntityId, id));

    if (brandSuppliers.length > 0 || brandFinancialEntities.length > 0 || linkedOperators.length > 0) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete legal entity with brand-managed children',
        message: 'This legal entity has suppliers, financial entities or operators managed by the brand. Contact your brand administrator.',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Delete tenant-owned children first
    await db
      .delete(supplierOverrides)
      .where(and(eq(supplierOverrides.legalEntityId, id), eq(supplierOverrides.tenantId, tenantId)));

    await db
      .delete(financialEntities)
      .where(and(eq(financialEntities.legalEntityId, id), eq(financialEntities.origin, 'tenant')));

    // Delete the legal entity
    const [deleted] = await db
      .delete(legalEntities)
      .where(and(eq(legalEntities.id, id), eq(legalEntities.tenantId, tenantId)))
      .returning();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Legal entity not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Legal entity deleted with children', { entityId: id, tenantId });

    res.status(200).json({
      success: true,
      data: deleted,
      message: 'Legal entity deleted successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error deleting legal entity', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to delete legal entity',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== SUPPLIER OVERRIDES (TENANT SUPPLIERS) ====================

/**
 * POST /api/supplier-overrides
 * Create a new tenant supplier with BIDIRECTIONAL legal entity creation
 * This creates both the supplier_override record AND the corresponding legal_entity
 */
router.post('/supplier-overrides', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const createSchema = z.object({
      code: z.string().min(1).max(20),
      name: z.string().min(1).max(255),
      legalName: z.string().optional(),
      legalForm: z.string().optional(),
      supplierType: z.enum(['distributore', 'produttore', 'servizi', 'logistica']).default('distributore'),
      vatNumber: z.string().optional(),
      taxCode: z.string().optional(),
      sdiCode: z.string().optional(),
      pecEmail: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().optional(),
      iban: z.string().optional(),
      bic: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      province: z.string().optional(),
      cap: z.string().optional(),
      note: z.string().optional(),
      // Option to link to existing legal entity or create new
      legalEntityId: z.string().uuid().optional(),
      createLegalEntity: z.boolean().default(true) // Default: create bidirectionally
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
    const data = validation.data;
    let linkedLegalEntityId = data.legalEntityId;

    // BIDIRECTIONAL: Create legal entity if not linking to existing one
    // Search by P.IVA (vatNumber) - this is the unique business identifier
    if (!linkedLegalEntityId && data.createLegalEntity) {
      let existingLE = null;
      
      // Step 1: Search by P.IVA first (primary identifier)
      if (data.vatNumber) {
        existingLE = await db.query.legalEntities.findFirst({
          where: and(eq(legalEntities.pIva, data.vatNumber), eq(legalEntities.tenantId, tenantId))
        });
      }
      
      // Step 2: Fallback to search by code if no P.IVA match
      if (!existingLE) {
        existingLE = await db.query.legalEntities.findFirst({
          where: and(eq(legalEntities.codice, data.code), eq(legalEntities.tenantId, tenantId))
        });
      }

      if (!existingLE) {
        // Create new legal entity
        const legalEntityId = codeToUUID(data.code);
        const [newLegalEntity] = await db
          .insert(legalEntities)
          .values({
            id: legalEntityId,
            tenantId,
            codice: data.code,
            nome: data.legalName || data.name,
            formaGiuridica: data.legalForm,
            pIva: data.vatNumber,
            codiceFiscale: data.taxCode,
            codiceSDI: data.sdiCode,
            pec: data.pecEmail,
            email: data.email,
            telefono: data.phone,
            website: data.website,
            iban: data.iban,
            bic: data.bic,
            indirizzo: data.address,
            citta: data.city,
            provincia: data.province,
            cap: data.cap,
            stato: 'Attiva',
            isSupplier: true,
            isFinancialEntity: false,
            isOperator: false
          } as any)
          .returning();
        
        linkedLegalEntityId = newLegalEntity.id;
        logger.info('Legal entity created from supplier (bidirectional)', { legalEntityId: newLegalEntity.id, code: data.code, vatNumber: data.vatNumber });
      } else {
        // Link to existing legal entity and update role flag
        linkedLegalEntityId = existingLE.id;
        await db.update(legalEntities)
          .set({ isSupplier: true, updatedAt: new Date() })
          .where(eq(legalEntities.id, existingLE.id));
        logger.info('Supplier linked to existing legal entity (bidirectional)', { legalEntityId: existingLE.id, code: data.code, vatNumber: data.vatNumber });
      }
    }

    // Create the supplier_override record
    const supplierData = {
      legalEntityId: linkedLegalEntityId || null,
      origin: 'tenant' as const,
      tenantId,
      code: data.code,
      name: data.name,
      legalName: data.legalName || data.name,
      legalForm: data.legalForm,
      supplierType: data.supplierType,
      vatNumber: data.vatNumber,
      taxCode: data.taxCode,
      sdiCode: data.sdiCode,
      pecEmail: data.pecEmail,
      registeredAddress: data.address ? { via: data.address, cap: data.cap, citta: data.city, provincia: data.province } : null,
      email: data.email,
      phone: data.phone,
      website: data.website,
      iban: data.iban,
      bic: data.bic,
      countryId: '987aed38-cc72-4d26-8284-a6e0bff74093', // Italy
      createdBy: userId,
      status: 'active' as const
    };

    const [supplier] = await db
      .insert(supplierOverrides)
      .values(supplierData as any)
      .returning();

    logger.info('Supplier created with bidirectional legal entity link', { 
      supplierId: supplier.id, 
      legalEntityId: linkedLegalEntityId,
      code: data.code 
    });

    res.status(201).json({
      success: true,
      data: { ...supplier, _linkedLegalEntityId: linkedLegalEntityId },
      message: 'Fornitore creato con successo',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error creating supplier', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to create supplier',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== FINANCIAL ENTITIES ====================

/**
 * POST /api/financial-entities
 * Create a new financial entity with BIDIRECTIONAL legal entity creation
 * This creates both the financial_entity record AND the corresponding legal_entity
 */
router.post('/financial-entities', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    const userId = req.user?.id;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const createSchema = z.object({
      code: z.string().min(1).max(20),
      name: z.string().min(1).max(255),
      vatNumber: z.string().optional(),
      taxCode: z.string().optional(),
      sdiCode: z.string().optional(),
      pecEmail: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().optional(),
      iban: z.string().optional(),
      bic: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      province: z.string().optional(),
      cap: z.string().optional(),
      capitalStock: z.string().optional(),
      note: z.string().optional(),
      // Option to link to existing legal entity or create new
      legalEntityId: z.string().uuid().optional(),
      createLegalEntity: z.boolean().default(true) // Default: create bidirectionally
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
    const data = validation.data;
    let linkedLegalEntityId = data.legalEntityId;

    // BIDIRECTIONAL: Create legal entity if not linking to existing one
    // Search by P.IVA (vatNumber) - this is the unique business identifier
    if (!linkedLegalEntityId && data.createLegalEntity) {
      let existingLE = null;
      
      // Step 1: Search by P.IVA first (primary identifier)
      if (data.vatNumber) {
        existingLE = await db.query.legalEntities.findFirst({
          where: and(eq(legalEntities.pIva, data.vatNumber), eq(legalEntities.tenantId, tenantId))
        });
      }
      
      // Step 2: Fallback to search by code if no P.IVA match
      if (!existingLE) {
        existingLE = await db.query.legalEntities.findFirst({
          where: and(eq(legalEntities.codice, data.code), eq(legalEntities.tenantId, tenantId))
        });
      }

      if (!existingLE) {
        // Create new legal entity
        const legalEntityId = codeToUUID(data.code);
        const [newLegalEntity] = await db
          .insert(legalEntities)
          .values({
            id: legalEntityId,
            tenantId,
            codice: data.code,
            nome: data.name,
            pIva: data.vatNumber,
            codiceFiscale: data.taxCode,
            codiceSDI: data.sdiCode,
            pec: data.pecEmail,
            email: data.email,
            telefono: data.phone,
            website: data.website,
            iban: data.iban,
            bic: data.bic,
            indirizzo: data.address,
            citta: data.city,
            provincia: data.province,
            cap: data.cap,
            capitaleSociale: data.capitalStock,
            stato: 'Attiva',
            isSupplier: false,
            isFinancialEntity: true,
            isOperator: false
          } as any)
          .returning();
        
        linkedLegalEntityId = newLegalEntity.id;
        logger.info('Legal entity created from financial entity (bidirectional)', { legalEntityId: newLegalEntity.id, code: data.code, vatNumber: data.vatNumber });
      } else {
        // Link to existing legal entity and update role flag
        linkedLegalEntityId = existingLE.id;
        await db.update(legalEntities)
          .set({ isFinancialEntity: true, updatedAt: new Date() })
          .where(eq(legalEntities.id, existingLE.id));
        logger.info('Financial entity linked to existing legal entity (bidirectional)', { legalEntityId: existingLE.id, code: data.code, vatNumber: data.vatNumber });
      }
    }

    // Create the financial_entity record
    const financialEntityData = {
      legalEntityId: linkedLegalEntityId || null,
      origin: 'tenant' as const,
      tenantId,
      code: data.code,
      name: data.name,
      vatNumber: data.vatNumber,
      taxCode: data.taxCode,
      sdiCode: data.sdiCode,
      pecEmail: data.pecEmail,
      registeredAddress: data.address ? { via: data.address, cap: data.cap, citta: data.city, provincia: data.province } : null,
      email: data.email,
      phone: data.phone,
      website: data.website,
      iban: data.iban,
      bic: data.bic,
      capitalStock: data.capitalStock,
      createdBy: userId,
      status: 'active' as const
    };

    const [financialEntity] = await db
      .insert(financialEntities)
      .values(financialEntityData as any)
      .returning();

    logger.info('Financial entity created with bidirectional legal entity link', { 
      financialEntityId: financialEntity.id, 
      legalEntityId: linkedLegalEntityId,
      code: data.code 
    });

    res.status(201).json({
      success: true,
      data: { ...financialEntity, _linkedLegalEntityId: linkedLegalEntityId },
      message: 'Ente finanziante creato con successo',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error creating financial entity', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to create financial entity',
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
 * GET /api/stores/:storeId/opening-rules
 * Get opening rules for a specific store
 */
router.get('/stores/:storeId/opening-rules', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    const { storeId } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const rules = await db
      .select()
      .from(storeOpeningRules)
      .where(
        and(
          eq(storeOpeningRules.storeId, storeId),
          eq(storeOpeningRules.tenantId, tenantId)
        )
      );

    const mappedRules = rules.map(rule => ({
      id: rule.id,
      storeId: rule.storeId,
      dayOfWeek: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(rule.dayOfWeek),
      openTime: rule.openTime || '09:00',
      closeTime: rule.closeTime || '18:00',
      isClosed: !rule.isOpen,
      isOpen: rule.isOpen,
      hasBreak: rule.hasBreak,
      breakStartTime: rule.breakStartTime,
      breakEndTime: rule.breakEndTime
    }));

    res.status(200).json({
      success: true,
      data: mappedRules,
      message: 'Opening rules retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving opening rules', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve opening rules',
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
      organizationEntityId: z.string().uuid(),
      channelId: z.string().uuid().optional(),
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

    // RULE: Generate deterministic UUID from code for code → id synchronization
    const storeId = codeToUUID(validation.data.code);
    const storeData = {
      ...validation.data,
      id: storeId, // UUID generated from code
      tenantId,
      category
    };

    const [store] = await db
      .insert(stores)
      .values(storeData as any)
      .returning();

    logger.info('Store created with code→UUID sync', { 
      storeId: store.id, 
      code: validation.data.code,
      generatedUUID: storeId,
      tenantId 
    });

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

/**
 * PUT /api/stores/:id
 * Update an existing store
 */
router.put('/stores/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    const storeId = req.params.id;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const updateSchema = z.object({
      code: z.string().min(1).max(50).optional(),
      nome: z.string().min(1).max(255).optional(),
      organizationEntityId: z.string().uuid().optional(),
      channelId: z.string().uuid().optional().nullable(),
      commercialAreaId: z.string().uuid().optional(),
      category: z.enum(['sales_point', 'office', 'warehouse']).optional(),
      hasWarehouse: z.boolean().optional(),
      address: z.string().optional(),
      citta: z.string().optional(),
      provincia: z.string().optional(),
      cap: z.string().optional(),
      region: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional().nullable(),
      status: z.string().optional()
    });

    const validation = updateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const [updatedStore] = await db
      .update(stores)
      .set({
        ...validation.data,
        updatedAt: new Date()
      })
      .where(and(eq(stores.id, storeId), eq(stores.tenantId, tenantId)))
      .returning();

    if (!updatedStore) {
      return res.status(404).json({
        success: false,
        error: 'Store not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Store updated', { storeId, tenantId });

    res.status(200).json({
      success: true,
      data: updatedStore,
      message: 'Store updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<typeof updatedStore>);

  } catch (error: any) {
    logger.error('Error updating store', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to update store',
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

    const searchQuery = (req.query.search as string || '').toLowerCase();
    const limitParam = parseInt(req.query.limit as string) || 100;

    // ✅ Use Drizzle query builder - auto-converts snake_case to camelCase
    let usersList = await db.query.users.findMany({
      where: eq(users.tenantId, tenantId),
      orderBy: [desc(users.createdAt)],
      limit: limitParam
    });

    // Apply search filter if provided
    if (searchQuery) {
      usersList = usersList.filter(user => 
        user.email?.toLowerCase().includes(searchQuery) ||
        user.firstName?.toLowerCase().includes(searchQuery) ||
        user.lastName?.toLowerCase().includes(searchQuery) ||
        user.username?.toLowerCase().includes(searchQuery)
      );
    }

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
        } as any)
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
          .values(extensionValidation.data as any)
          .returning();
        
        createdExtension = ext;
        logger.info('VoIP extension auto-provisioned for user', { 
          userId: createdUser.id, 
          extNumber: (ext as any).extNumber, 
          sipDomain: (ext as any).sipDomain,
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
router.get('/users/:id/assignments', requirePermission('users:read'), async (req, res) => {
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
        } else if (assignment.scopeType === 'organization_entity') {
          const [orgEntity] = await db
            .select({ id: organizationEntities.id, name: organizationEntities.nome, code: organizationEntities.codice })
            .from(organizationEntities)
            .where(eq(organizationEntities.id, assignment.scopeId))
            .limit(1);
          scopeDetails = orgEntity;
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
router.post('/users/assignments-batch', requirePermission('users:read'), async (req, res) => {
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
router.get('/users/:id/permissions', requirePermission('users:read'), async (req, res) => {
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

// ==================== USER ORGANIZATION ENTITIES (Scope Interno) ====================

/**
 * GET /api/users/:id/organization-entities
 * Get organization entities assigned to a user
 */
router.get('/users/:id/organization-entities', requirePermission('users:read'), async (req, res) => {
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

    const userOrgEntities = await db
      .select({
        userId: userOrganizationEntities.userId,
        organizationEntityId: userOrganizationEntities.organizationEntityId,
        isPrimary: userOrganizationEntities.isPrimary,
        createdAt: userOrganizationEntities.createdAt,
        orgName: organizationEntities.nome,
        orgCode: organizationEntities.codice,
        orgPiva: organizationEntities.pIva
      })
      .from(userOrganizationEntities)
      .innerJoin(organizationEntities, eq(userOrganizationEntities.organizationEntityId, organizationEntities.id))
      .where(
        and(
          eq(userOrganizationEntities.userId, userId),
          eq(userOrganizationEntities.tenantId, tenantId)
        )
      );

    res.status(200).json({
      success: true,
      data: userOrgEntities,
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving user organization entities', { errorMessage: error?.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message,
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PUT /api/users/:id/organization-entities
 * Set organization entities for a user (replaces existing)
 * Uses transaction for atomicity and validates IDs before mutation
 */
router.put('/users/:id/organization-entities', requirePermission('users:write'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    const userId = req.params.id;
    const { organizationEntityIds, primaryId } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Validate request body
    if (organizationEntityIds !== undefined && !Array.isArray(organizationEntityIds)) {
      return res.status(400).json({
        success: false,
        error: 'organizationEntityIds must be an array',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    if (primaryId && organizationEntityIds && !organizationEntityIds.includes(primaryId)) {
      return res.status(400).json({
        success: false,
        error: 'primaryId must be included in organizationEntityIds',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Validate user exists
    const [userExists] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!userExists) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Validate all organization entities exist and belong to tenant
    if (organizationEntityIds && organizationEntityIds.length > 0) {
      const validOrgs = await db
        .select({ id: organizationEntities.id })
        .from(organizationEntities)
        .where(
          and(
            inArray(organizationEntities.id, organizationEntityIds),
            eq(organizationEntities.tenantId, tenantId)
          )
        );

      if (validOrgs.length !== organizationEntityIds.length) {
        const validIds = validOrgs.map(o => o.id);
        const invalidIds = organizationEntityIds.filter((id: string) => !validIds.includes(id));
        return res.status(400).json({
          success: false,
          error: 'Some organization entity IDs are invalid or not accessible',
          invalidIds,
          timestamp: new Date().toISOString()
        } as ApiErrorResponse);
      }
    }

    // Use transaction for atomic delete+insert
    await db.transaction(async (tx) => {
      await tx
        .delete(userOrganizationEntities)
        .where(
          and(
            eq(userOrganizationEntities.userId, userId),
            eq(userOrganizationEntities.tenantId, tenantId)
          )
        );

      if (organizationEntityIds && organizationEntityIds.length > 0) {
        const newAssignments = organizationEntityIds.map((orgId: string) => ({
          userId,
          organizationEntityId: orgId,
          tenantId,
          isPrimary: orgId === primaryId
        }));

        await tx.insert(userOrganizationEntities).values(newAssignments);
      }
    });

    logger.info('User organization entities updated', { userId, count: organizationEntityIds?.length || 0 });

    res.status(200).json({
      success: true,
      message: 'User organization entities updated',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating user organization entities', { errorMessage: error?.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message,
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== USER TEAMS (Normalized) ====================

/**
 * GET /api/users/:id/teams
 * Get teams assigned to a user
 */
router.get('/users/:id/teams', requirePermission('users:read'), async (req, res) => {
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

    // Import teams table dynamically to avoid circular dependency
    const { teams } = await import('../db/schema/w3suite');

    const userTeamsList = await db
      .select({
        userId: userTeams.userId,
        teamId: userTeams.teamId,
        isPrimary: userTeams.isPrimary,
        assignedAt: userTeams.assignedAt,
        teamName: teams.name,
        teamType: teams.teamType
      })
      .from(userTeams)
      .innerJoin(teams, eq(userTeams.teamId, teams.id))
      .where(
        and(
          eq(userTeams.userId, userId),
          eq(userTeams.tenantId, tenantId)
        )
      );

    res.status(200).json({
      success: true,
      data: userTeamsList,
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving user teams', { errorMessage: error?.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message,
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PUT /api/users/:id/teams
 * Set teams for a user (replaces existing)
 * Uses transaction for atomicity and validates IDs before mutation
 */
router.put('/users/:id/teams', requirePermission('users:write'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    const userId = req.params.id;
    const { teamIds, primaryId } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Validate request body
    if (teamIds !== undefined && !Array.isArray(teamIds)) {
      return res.status(400).json({
        success: false,
        error: 'teamIds must be an array',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    if (primaryId && teamIds && !teamIds.includes(primaryId)) {
      return res.status(400).json({
        success: false,
        error: 'primaryId must be included in teamIds',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Import teams table
    const { teams } = await import('../db/schema/w3suite');

    // Validate user exists
    const [userExists] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!userExists) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Validate all teams exist and belong to tenant
    if (teamIds && teamIds.length > 0) {
      const validTeams = await db
        .select({ id: teams.id })
        .from(teams)
        .where(
          and(
            inArray(teams.id, teamIds),
            eq(teams.tenantId, tenantId)
          )
        );

      if (validTeams.length !== teamIds.length) {
        const validIds = validTeams.map(t => t.id);
        const invalidIds = teamIds.filter((id: string) => !validIds.includes(id));
        return res.status(400).json({
          success: false,
          error: 'Some team IDs are invalid or not accessible',
          invalidIds,
          timestamp: new Date().toISOString()
        } as ApiErrorResponse);
      }
    }

    // Use transaction for atomic delete+insert
    await db.transaction(async (tx) => {
      await tx
        .delete(userTeams)
        .where(
          and(
            eq(userTeams.userId, userId),
            eq(userTeams.tenantId, tenantId)
          )
        );

      if (teamIds && teamIds.length > 0) {
        const newAssignments = teamIds.map((teamId: string) => ({
          userId,
          teamId,
          tenantId,
          isPrimary: teamId === primaryId
        }));

        await tx.insert(userTeams).values(newAssignments);
      }
    });

    logger.info('User teams updated', { userId, count: teamIds?.length || 0 });

    res.status(200).json({
      success: true,
      message: 'User teams updated',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating user teams', { errorMessage: error?.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message,
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PUT /api/users/:id/stores
 * Set stores for a user (replaces existing)
 * Uses transaction for atomicity and validates IDs before mutation
 */
router.put('/users/:id/stores', requirePermission('users:write'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    const userId = req.params.id;
    const { storeIds, primaryId } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Validate request body
    if (storeIds !== undefined && !Array.isArray(storeIds)) {
      return res.status(400).json({
        success: false,
        error: 'storeIds must be an array',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    if (primaryId && storeIds && !storeIds.includes(primaryId)) {
      return res.status(400).json({
        success: false,
        error: 'primaryId must be included in storeIds',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Validate user exists
    const [userExists] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
      .limit(1);

    if (!userExists) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Validate all stores exist and belong to tenant
    if (storeIds && storeIds.length > 0) {
      const validStores = await db
        .select({ id: stores.id })
        .from(stores)
        .where(
          and(
            inArray(stores.id, storeIds),
            eq(stores.tenantId, tenantId)
          )
        );

      if (validStores.length !== storeIds.length) {
        const validIds = validStores.map(s => s.id);
        const invalidIds = storeIds.filter((id: string) => !validIds.includes(id));
        return res.status(400).json({
          success: false,
          error: 'Some store IDs are invalid or not accessible',
          invalidIds,
          timestamp: new Date().toISOString()
        } as ApiErrorResponse);
      }
    }

    // Use transaction for atomic delete+insert
    await db.transaction(async (tx) => {
      await tx
        .delete(userStores)
        .where(
          and(
            eq(userStores.userId, userId),
            eq(userStores.tenantId, tenantId)
          )
        );

      if (storeIds && storeIds.length > 0) {
        const newAssignments = storeIds.map((storeId: string) => ({
          userId,
          storeId,
          tenantId,
          isPrimary: storeId === primaryId
        }));

        await tx.insert(userStores).values(newAssignments);
      }
    });

    logger.info('User stores updated', { userId, count: storeIds?.length || 0 });

    res.status(200).json({
      success: true,
      message: 'User stores updated',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating user stores', { errorMessage: error?.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message,
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

// ==================== BUSINESS DRIVERS ====================

/**
 * GET /api/drivers
 * Get all active drivers (brand + tenant-custom with tenant override precedence)
 * Brand drivers are stored in brand tenant (00000000-0000-0000-0000-000000000000)
 * Tenant can create custom drivers or override brand drivers by code
 */
router.get('/drivers', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const BRAND_TENANT_ID = '00000000-0000-0000-0000-000000000000';
    const includeInactive = req.query.includeInactive === 'true';

    // Get brand drivers (shared across all tenants)
    const brandDrivers = await db
      .select({
        id: drivers.id,
        code: drivers.code,
        name: drivers.name,
        description: drivers.description,
        icon: drivers.icon,
        allowedProductTypes: drivers.allowedProductTypes,
        operatorId: drivers.operatorId,
        source: drivers.source,
        isBrandSynced: drivers.isBrandSynced,
        isActive: drivers.isActive,
        sortOrder: drivers.sortOrder,
        createdAt: drivers.createdAt,
      })
      .from(drivers)
      .where(includeInactive 
        ? eq(drivers.tenantId, BRAND_TENANT_ID)
        : and(eq(drivers.tenantId, BRAND_TENANT_ID), eq(drivers.isActive, true))
      );

    // Get tenant-specific drivers (custom or overrides)
    const tenantDrivers = await db
      .select({
        id: drivers.id,
        code: drivers.code,
        name: drivers.name,
        description: drivers.description,
        icon: drivers.icon,
        allowedProductTypes: drivers.allowedProductTypes,
        operatorId: drivers.operatorId,
        source: drivers.source,
        isBrandSynced: drivers.isBrandSynced,
        isActive: drivers.isActive,
        sortOrder: drivers.sortOrder,
        createdAt: drivers.createdAt,
      })
      .from(drivers)
      .where(includeInactive 
        ? eq(drivers.tenantId, tenantId)
        : and(eq(drivers.tenantId, tenantId), eq(drivers.isActive, true))
      );

    // Merge with tenant override precedence (tenant drivers shadow brand drivers by code)
    const tenantCodes = new Set(tenantDrivers.map(d => d.code));
    const filteredBrandDrivers = brandDrivers.filter(d => !tenantCodes.has(d.code));
    const driversList = [...tenantDrivers, ...filteredBrandDrivers]
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));

    res.status(200).json({
      success: true,
      data: driversList,
      message: 'Drivers retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving drivers', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.headers['x-tenant-id'] || req.user?.tenantId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve drivers',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/drivers
 * Create a new tenant-custom driver
 */
router.post('/drivers', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { code, name, description, allowedProductTypes, operatorId, isActive } = req.body;

    if (!code || !name) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Code and name are required',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    if (!allowedProductTypes || allowedProductTypes.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'At least one product type must be selected',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Check if code already exists for this tenant
    const [existingDriver] = await db
      .select()
      .from(drivers)
      .where(and(
        eq(drivers.tenantId, tenantId),
        eq(drivers.code, code.toUpperCase())
      ))
      .limit(1);

    if (existingDriver) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: `Driver with code "${code}" already exists`,
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Get max sort order for new driver
    const [maxSortOrder] = await db
      .select({ maxSort: sql<number>`COALESCE(MAX(${drivers.sortOrder}), 0)` })
      .from(drivers)
      .where(eq(drivers.tenantId, tenantId));

    const [newDriver] = await db
      .insert(drivers)
      .values({
        tenantId,
        code: code.toUpperCase(),
        name,
        description: description || null,
        allowedProductTypes: allowedProductTypes,
        operatorId: operatorId || null,
        source: 'tenant',
        isBrandSynced: false,
        isActive: isActive ?? true,
        sortOrder: (maxSortOrder?.maxSort || 0) + 1,
      })
      .returning();

    logger.info('Tenant driver created', { driverId: newDriver.id, code: newDriver.code, tenantId });

    res.status(201).json({
      success: true,
      data: newDriver,
      message: 'Driver created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error creating driver', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.headers['x-tenant-id'] || req.user?.tenantId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to create driver',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PUT /api/drivers/:id
 * Update a tenant-custom driver (cannot update brand drivers)
 */
router.put('/drivers/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const driverId = req.params.id;
    const { code, name, description, allowedProductTypes, operatorId, isActive } = req.body;

    await setTenantContext(tenantId);

    // Find driver and verify it's tenant-owned
    const [existingDriver] = await db
      .select()
      .from(drivers)
      .where(and(
        eq(drivers.id, driverId),
        eq(drivers.tenantId, tenantId)
      ))
      .limit(1);

    if (!existingDriver) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Driver not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    if (existingDriver.source === 'brand') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Cannot modify brand drivers',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Check if new code conflicts with existing
    if (code && code.toUpperCase() !== existingDriver.code) {
      const [codeConflict] = await db
        .select()
        .from(drivers)
        .where(and(
          eq(drivers.tenantId, tenantId),
          eq(drivers.code, code.toUpperCase()),
          sql`${drivers.id} != ${driverId}`
        ))
        .limit(1);

      if (codeConflict) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: `Driver with code "${code}" already exists`,
          timestamp: new Date().toISOString()
        } as ApiErrorResponse);
      }
    }

    const [updatedDriver] = await db
      .update(drivers)
      .set({
        code: code ? code.toUpperCase() : existingDriver.code,
        name: name ?? existingDriver.name,
        description: description !== undefined ? description : existingDriver.description,
        allowedProductTypes: allowedProductTypes ?? existingDriver.allowedProductTypes,
        operatorId: operatorId !== undefined ? (operatorId || null) : existingDriver.operatorId,
        isActive: isActive ?? existingDriver.isActive,
        updatedAt: new Date(),
      })
      .where(eq(drivers.id, driverId))
      .returning();

    logger.info('Tenant driver updated', { driverId, tenantId });

    res.status(200).json({
      success: true,
      data: updatedDriver,
      message: 'Driver updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating driver', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      driverId: req.params.id,
      tenantId: req.headers['x-tenant-id'] || req.user?.tenantId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to update driver',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * DELETE /api/drivers/:id
 * Delete a tenant-custom driver (cannot delete brand drivers, check dependencies)
 */
router.delete('/drivers/:id', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const driverId = req.params.id;

    await setTenantContext(tenantId);

    // Find driver and verify it's tenant-owned
    const [existingDriver] = await db
      .select()
      .from(drivers)
      .where(and(
        eq(drivers.id, driverId),
        eq(drivers.tenantId, tenantId)
      ))
      .limit(1);

    if (!existingDriver) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Driver not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    if (existingDriver.source === 'brand') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Cannot delete brand drivers',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Check for dependencies: driver_category_mappings, crm_leads, crm_pipelines
    const { driverCategoryMappings, crmLeads, crmPipelines } = await import("../db/schema/w3suite");
    
    // Check for dependencies: driver_category_mappings
    const mappingsCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(driverCategoryMappings)
      .where(eq(driverCategoryMappings.driverId, driverId));
    
    // Check for dependencies: crm_leads
    const leadsCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(crmLeads)
      .where(eq(crmLeads.driverId, driverId));
    
    // Check for dependencies: crm_pipelines
    const pipelinesCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(crmPipelines)
      .where(eq(crmPipelines.driverId, driverId));

    const totalMappings = mappingsCount[0]?.count ?? 0;
    const totalLeads = leadsCount[0]?.count ?? 0;
    const totalPipelines = pipelinesCount[0]?.count ?? 0;
    
    const hasDependencies = totalMappings > 0 || totalLeads > 0 || totalPipelines > 0;

    if (hasDependencies) {
      const dependencies = [];
      if (totalMappings > 0) dependencies.push(`${totalMappings} mappature categoria`);
      if (totalLeads > 0) dependencies.push(`${totalLeads} lead CRM`);
      if (totalPipelines > 0) dependencies.push(`${totalPipelines} pipeline CRM`);
      
      return res.status(400).json({
        success: false,
        error: 'has_dependencies',
        message: `Impossibile eliminare il driver: esistono ${dependencies.join(', ')} associati. Puoi solo archiviarlo.`,
        canDelete: false,
        canArchive: true,
        dependencies: {
          mappings: totalMappings,
          leads: totalLeads,
          pipelines: totalPipelines
        },
        timestamp: new Date().toISOString()
      });
    }

    // No dependencies - safe to delete
    await db
      .delete(drivers)
      .where(eq(drivers.id, driverId));

    logger.info('Tenant driver deleted', { driverId, code: existingDriver.code, tenantId });

    res.status(200).json({
      success: true,
      data: { id: driverId },
      message: 'Driver deleted successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error deleting driver', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      driverId: req.params.id,
      tenantId: req.headers['x-tenant-id'] || req.user?.tenantId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to delete driver',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/drivers/:id/archive
 * Archive a tenant-custom driver (soft-delete)
 */
router.patch('/drivers/:id/archive', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const driverId = req.params.id;
    await setTenantContext(tenantId);

    // Find driver and verify it's tenant-owned
    const [existingDriver] = await db
      .select()
      .from(drivers)
      .where(and(
        eq(drivers.id, driverId),
        eq(drivers.tenantId, tenantId)
      ))
      .limit(1);

    if (!existingDriver) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Driver not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    if (existingDriver.source === 'brand') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Cannot archive brand drivers',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Soft-delete by setting isActive to false
    const [archivedDriver] = await db
      .update(drivers)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(drivers.id, driverId))
      .returning();

    logger.info('Tenant driver archived', { driverId, code: existingDriver.code, tenantId });

    res.status(200).json({
      success: true,
      data: archivedDriver,
      message: 'Driver archiviato con successo',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error archiving driver', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      driverId: req.params.id,
      tenantId: req.headers['x-tenant-id'] || req.user?.tenantId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to archive driver',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== STORE TRACKING CONFIG ====================

/**
 * GET /api/stores/:id/tracking-config
 * Get GTM tracking configuration for a store
 */
router.get('/stores/:id/tracking-config', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const storeId = req.params.id;

    await setTenantContext(tenantId);

    // Verify store belongs to tenant
    const [store] = await db
      .select()
      .from(stores)
      .where(and(
        eq(stores.id, storeId),
        eq(stores.tenantId, tenantId)
      ))
      .limit(1);

    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Store not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Get tracking config
    const [config] = await db
      .select()
      .from(storeTrackingConfig)
      .where(and(
        eq(storeTrackingConfig.storeId, storeId),
        eq(storeTrackingConfig.tenantId, tenantId)
      ))
      .limit(1);

    res.status(200).json({
      success: true,
      data: config || {
        storeId,
        tenantId,
        gtmConfigured: false,
        ga4MeasurementId: null,
        googleAdsConversionId: null,
        facebookPixelId: null,
        tiktokPixelId: null
      },
      message: 'Store tracking config retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving store tracking config', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId,
      storeId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve store tracking config',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PUT /api/stores/:id/tracking-config
 * Update GTM tracking configuration for a store
 */
router.put('/stores/:id/tracking-config', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const storeId = req.params.id;

    const updateSchema = z.object({
      ga4MeasurementId: z.string().optional().nullable(),
      googleAdsConversionId: z.string().optional().nullable(),
      facebookPixelId: z.string().optional().nullable(),
      tiktokPixelId: z.string().optional().nullable()
    });

    const validation = updateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Verify store belongs to tenant
    const [store] = await db
      .select()
      .from(stores)
      .where(and(
        eq(stores.id, storeId),
        eq(stores.tenantId, tenantId)
      ))
      .limit(1);

    if (!store) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Store not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Check if config exists
    const [existingConfig] = await db
      .select()
      .from(storeTrackingConfig)
      .where(and(
        eq(storeTrackingConfig.storeId, storeId),
        eq(storeTrackingConfig.tenantId, tenantId)
      ))
      .limit(1);

    let config;

    if (existingConfig) {
      // Update existing config
      [config] = await db
        .update(storeTrackingConfig)
        .set({
          ...validation.data,
          updatedAt: new Date()
        })
        .where(eq(storeTrackingConfig.id, existingConfig.id))
        .returning();
    } else {
      // Create new config
      [config] = await db
        .insert(storeTrackingConfig)
        .values({
          storeId,
          tenantId,
          ...validation.data
        } as any)
        .returning();
    }

    logger.info('Store tracking config updated', { 
      storeId,
      tenantId,
      hasGA4: !!validation.data.ga4MeasurementId,
      hasGoogleAds: !!validation.data.googleAdsConversionId,
      hasFacebook: !!validation.data.facebookPixelId,
      hasTikTok: !!validation.data.tiktokPixelId
    });

    res.status(200).json({
      success: true,
      data: config,
      message: 'Store tracking config updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating store tracking config', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId,
      storeId: req.params.id
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to update store tracking config',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== VAT RATES ====================

/**
 * GET /api/vat-rates
 * Get all Italian VAT rates (from public schema - shared reference data)
 * Returns the 5 standard Italian VAT rates: 22%, 10%, 5%, 4%, 0%
 */
router.get('/vat-rates', async (req, res) => {
  try {
    // VAT rates are in public schema - no tenant filtering needed
    const rates = await db.query.vatRates.findMany({
      where: eq(vatRates.isActive, true),
      orderBy: [desc(vatRates.sortOrder)]
    });

    res.status(200).json({
      success: true,
      data: rates,
      message: 'VAT rates retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving VAT rates', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve VAT rates',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/vat-rates/:code
 * Get a specific VAT rate by code
 */
router.get('/vat-rates/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const [rate] = await db
      .select()
      .from(vatRates)
      .where(eq(vatRates.code, code.toUpperCase()))
      .limit(1);

    if (!rate) {
      return res.status(404).json({
        success: false,
        error: 'VAT rate not found',
        message: `No VAT rate found with code '${code}'`,
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    res.status(200).json({
      success: true,
      data: rate,
      message: 'VAT rate retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving VAT rate', { 
      code: req.params.code,
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve VAT rate',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== VAT REGIMES ====================

/**
 * GET /api/vat-regimes
 * Get all Italian VAT regimes (from public schema - shared reference data)
 * Returns all special VAT regimes: Art.10, Art.17, Art.36, Split Payment, etc.
 */
router.get('/vat-regimes', async (req, res) => {
  try {
    // Optional filters
    const { rateStrategy, vatPayer } = req.query;
    
    // Build query conditions
    let conditions = [eq(vatRegimes.isActive, true)];
    
    if (rateStrategy && typeof rateStrategy === 'string') {
      conditions.push(eq(vatRegimes.rateStrategy, rateStrategy));
    }
    
    if (vatPayer && typeof vatPayer === 'string') {
      conditions.push(eq(vatRegimes.vatPayer, vatPayer));
    }

    // LEFT JOIN to include fixed rate details when present
    const regimes = await db
      .select({
        id: vatRegimes.id,
        code: vatRegimes.code,
        name: vatRegimes.name,
        description: vatRegimes.description,
        legalReference: vatRegimes.legalReference,
        rateStrategy: vatRegimes.rateStrategy,
        fixedRateId: vatRegimes.fixedRateId,
        vatPayer: vatRegimes.vatPayer,
        naturaFeCode: vatRegimes.naturaFeCode,
        invoiceNote: vatRegimes.invoiceNote,
        requiresSeparateAccounting: vatRegimes.requiresSeparateAccounting,
        supportsDeduction: vatRegimes.supportsDeduction,
        requiresStampDuty: vatRegimes.requiresStampDuty,
        applicableTo: vatRegimes.applicableTo,
        isActive: vatRegimes.isActive,
        sortOrder: vatRegimes.sortOrder,
        createdAt: vatRegimes.createdAt,
        // Joined fixed rate info
        fixedRateCode: vatRates.code,
        fixedRateName: vatRates.name,
        fixedRatePercent: vatRates.ratePercent,
      })
      .from(vatRegimes)
      .leftJoin(vatRates, eq(vatRegimes.fixedRateId, vatRates.id))
      .where(and(...conditions))
      .orderBy(vatRegimes.sortOrder);

    res.status(200).json({
      success: true,
      data: regimes,
      message: 'VAT regimes retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving VAT regimes', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve VAT regimes',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/vat-regimes/:code
 * Get a specific VAT regime by code with joined rate info
 */
router.get('/vat-regimes/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const [regime] = await db
      .select({
        id: vatRegimes.id,
        code: vatRegimes.code,
        name: vatRegimes.name,
        description: vatRegimes.description,
        legalReference: vatRegimes.legalReference,
        rateStrategy: vatRegimes.rateStrategy,
        fixedRateId: vatRegimes.fixedRateId,
        vatPayer: vatRegimes.vatPayer,
        naturaFeCode: vatRegimes.naturaFeCode,
        invoiceNote: vatRegimes.invoiceNote,
        requiresSeparateAccounting: vatRegimes.requiresSeparateAccounting,
        supportsDeduction: vatRegimes.supportsDeduction,
        requiresStampDuty: vatRegimes.requiresStampDuty,
        applicableTo: vatRegimes.applicableTo,
        isActive: vatRegimes.isActive,
        sortOrder: vatRegimes.sortOrder,
        // Join fixed rate details if present
        fixedRateCode: vatRates.code,
        fixedRateName: vatRates.name,
        fixedRatePercent: vatRates.ratePercent,
      })
      .from(vatRegimes)
      .leftJoin(vatRates, eq(vatRegimes.fixedRateId, vatRates.id))
      .where(eq(vatRegimes.code, code.toUpperCase()))
      .orderBy(vatRegimes.sortOrder)
      .limit(1);

    if (!regime) {
      return res.status(404).json({
        success: false,
        error: 'VAT regime not found',
        message: `No VAT regime found with code '${code}'`,
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    res.status(200).json({
      success: true,
      data: regime,
      message: 'VAT regime retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving VAT regime', { 
      code: req.params.code,
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve VAT regime',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== LEGAL FORMS ====================

/**
 * GET /api/legal-forms
 * Lista tutte le forme giuridiche italiane
 * Query params:
 *   - category: filtra per categoria (IMPRESA, ENTE_PUBBLICO, NON_PROFIT, PROFESSIONALE, PERSONA_FISICA)
 *   - active: filtra per stato attivo (true/false)
 */
router.get('/legal-forms', async (req: Request, res: Response) => {
  try {
    const { category, active } = req.query;
    
    const conditions: any[] = [];
    
    if (category && typeof category === 'string') {
      conditions.push(eq(legalForms.category, category.toUpperCase()));
    }
    
    if (active !== undefined) {
      conditions.push(eq(legalForms.active, active === 'true'));
    }
    
    const forms = await db
      .select()
      .from(legalForms)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(legalForms.sortOrder);
    
    res.status(200).json({
      success: true,
      data: forms,
      count: forms.length,
      message: 'Legal forms retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);
    
  } catch (error: any) {
    logger.error('Error retrieving legal forms', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve legal forms',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/legal-forms/categories/list
 * Lista tutte le categorie disponibili con conteggio
 * NOTA: Questa route DEVE venire PRIMA di /legal-forms/:code
 */
router.get('/legal-forms/categories/list', async (req: Request, res: Response) => {
  try {
    const categories = await db
      .select({
        category: legalForms.category,
        count: sql<number>`count(*)::int`,
      })
      .from(legalForms)
      .where(eq(legalForms.active, true))
      .groupBy(legalForms.category)
      .orderBy(legalForms.category);
    
    // Mapping per nomi italiani
    const categoryNames: Record<string, string> = {
      'IMPRESA': 'Imprese',
      'ENTE_PUBBLICO': 'Pubblica Amministrazione',
      'NON_PROFIT': 'Enti Non Profit',
      'PROFESSIONALE': 'Professionisti',
      'PERSONA_FISICA': 'Persone Fisiche'
    };
    
    const enrichedCategories = categories.map(c => ({
      ...c,
      name: categoryNames[c.category || 'IMPRESA'] || c.category
    }));
    
    res.status(200).json({
      success: true,
      data: enrichedCategories,
      message: 'Legal form categories retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);
    
  } catch (error: any) {
    logger.error('Error retrieving legal form categories', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve legal form categories',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/legal-forms/:code
 * Recupera singola forma giuridica per codice
 */
router.get('/legal-forms/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    
    const [form] = await db
      .select()
      .from(legalForms)
      .where(eq(legalForms.code, code.toUpperCase()))
      .limit(1);
    
    if (!form) {
      return res.status(404).json({
        success: false,
        error: 'Legal form not found',
        message: `No legal form found with code '${code}'`,
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }
    
    res.status(200).json({
      success: true,
      data: form,
      message: 'Legal form retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);
    
  } catch (error: any) {
    logger.error('Error retrieving legal form', { 
      code: req.params.code,
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve legal form',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== PAYMENT METHODS (Reference Data) ====================

/**
 * GET /api/reference/payment-methods
 * Get all payment methods from public.payment_methods
 */
router.get('/reference/payment-methods', async (req, res) => {
  try {
    const methods = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.active, true))
      .orderBy(paymentMethods.sortOrder);
    
    res.status(200).json({
      success: true,
      data: methods,
      message: 'Payment methods retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);
    
  } catch (error: any) {
    logger.error('Error retrieving payment methods', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve payment methods',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== PAYMENT CONDITIONS (Reference Data) ====================

/**
 * GET /api/reference/payment-conditions
 * Get all payment conditions from public.payment_methods_conditions
 */
router.get('/reference/payment-conditions', async (req, res) => {
  try {
    const conditions = await db
      .select()
      .from(paymentMethodsConditions)
      .where(eq(paymentMethodsConditions.active, true))
      .orderBy(paymentMethodsConditions.sortOrder);
    
    res.status(200).json({
      success: true,
      data: conditions,
      message: 'Payment conditions retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);
    
  } catch (error: any) {
    logger.error('Error retrieving payment conditions', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve payment conditions',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== VAT RATES (Reference Data) ====================

/**
 * GET /api/reference/vat-rates
 * Get all VAT rates from public.vat_rates
 */
router.get('/reference/vat-rates', async (req, res) => {
  try {
    const rates = await db
      .select()
      .from(vatRates)
      .where(eq(vatRates.isActive, true))
      .orderBy(desc(vatRates.sortOrder));
    
    res.status(200).json({
      success: true,
      data: rates,
      message: 'VAT rates retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);
    
  } catch (error: any) {
    logger.error('Error retrieving VAT rates', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve VAT rates',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== VAT REGIMES (Reference Data) ====================

/**
 * GET /api/reference/vat-regimes
 * Get all VAT regimes from public.vat_regimes
 */
router.get('/reference/vat-regimes', async (req, res) => {
  try {
    const regimes = await db
      .select()
      .from(vatRegimes)
      .where(eq(vatRegimes.isActive, true))
      .orderBy(vatRegimes.sortOrder);
    
    res.status(200).json({
      success: true,
      data: regimes,
      message: 'VAT regimes retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);
    
  } catch (error: any) {
    logger.error('Error retrieving VAT regimes', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve VAT regimes',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

export default router;