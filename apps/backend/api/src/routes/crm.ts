/**
 * CRM API Routes
 * 
 * Provides REST endpoints for managing CRM entities with full tenant isolation:
 * - Persons (identity graph)
 * - Leads (with GDPR consent tracking)
 * - Campaigns
 * - Pipelines
 * - Deals
 */

import express from 'express';
import { z } from 'zod';
import { db, setTenantContext } from '../core/db';
import { correlationMiddleware, logger } from '../core/logger';
import { rbacMiddleware, requirePermission } from '../middleware/tenant';
import { eq, and, sql, desc, or, ilike } from 'drizzle-orm';
import {
  users,
  crmLeads,
  crmCampaigns,
  crmPipelines,
  crmPipelineSettings,
  crmPipelineWorkflows,
  crmPipelineStages,
  crmDeals,
  crmCustomers,
  crmInteractions,
  crmTasks,
  crmPersonIdentities,
  workflowTemplates,
  leadRoutingHistory,
  leadAiInsights,
  insertCrmLeadSchema,
  insertCrmCampaignSchema,
  insertCrmPipelineSchema,
  insertCrmPipelineSettingsSchema,
  insertCrmPipelineWorkflowSchema,
  insertCrmPipelineStageSchema,
  insertCrmDealSchema,
  insertCrmCustomerSchema
} from '../db/schema/w3suite';
import { drivers } from '../db/schema/public';
import { ApiSuccessResponse, ApiErrorResponse } from '../types/workflow-shared';

const router = express.Router();

router.use(correlationMiddleware);

// Helper: Get tenant ID from request
const getTenantId = (req: express.Request): string | null => {
  return req.headers['x-tenant-id'] as string || req.user?.tenantId || null;
};

// Helper: Get or create personId with transactional UPSERT (prevents all race conditions)
const getOrCreatePersonId = async (
  tenantId: string,
  email?: string | null,
  phone?: string | null,
  socialId?: string | null
): Promise<string> => {
  const identifiers: Array<{type: 'email' | 'phone' | 'social', value: string}> = [];
  
  if (email) identifiers.push({type: 'email', value: email});
  if (phone) identifiers.push({type: 'phone', value: phone});
  if (socialId) identifiers.push({type: 'social', value: socialId});
  
  // No identifiers - generate new personId
  if (identifiers.length === 0) {
    const newPersonId = crypto.randomUUID();
    logger.info('New person ID generated (no identifiers)', {personId: newPersonId, tenantId});
    return newPersonId;
  }
  
  // Wrap in transaction to ensure atomicity across all identifier UPSERTs
  return await db.transaction(async (tx) => {
    const firstIdentifier = identifiers[0];
    
    // STEP 1: UPSERT FIRST identifier to get/create canonical personId from DB
    const firstResult = await tx.execute(sql`
      INSERT INTO w3suite.crm_person_identities (tenant_id, person_id, identifier_type, identifier_value)
      VALUES (${tenantId}, gen_random_uuid(), ${firstIdentifier.type}, ${firstIdentifier.value})
      ON CONFLICT (tenant_id, identifier_type, identifier_value) 
      DO UPDATE SET identifier_value = EXCLUDED.identifier_value
      RETURNING person_id
    `);
    
    const canonicalPersonId = (firstResult.rows[0] as {person_id: string}).person_id;
    
    // STEP 2: UPSERT remaining identifiers with canonical personId
    if (identifiers.length > 1) {
      await Promise.all(
        identifiers.slice(1).map(({type, value}) =>
          tx.execute(sql`
            INSERT INTO w3suite.crm_person_identities (tenant_id, person_id, identifier_type, identifier_value)
            VALUES (${tenantId}, ${canonicalPersonId}, ${type}, ${value})
            ON CONFLICT (tenant_id, identifier_type, identifier_value) 
            DO UPDATE SET person_id = ${canonicalPersonId}
          `)
        )
      );
    }
    
    // STEP 3: Re-query canonical from DB to ensure final value (handles concurrent updates)
    const finalResult = await tx.select({personId: crmPersonIdentities.personId})
      .from(crmPersonIdentities)
      .where(and(
        eq(crmPersonIdentities.tenantId, tenantId),
        eq(crmPersonIdentities.identifierType, firstIdentifier.type),
        eq(crmPersonIdentities.identifierValue, firstIdentifier.value)
      ))
      .limit(1);
    
    const finalPersonId = finalResult[0].personId;
    logger.info('Person ID resolved in transaction', {personId: finalPersonId, tenantId, identifiers});
    return finalPersonId;
  });
};

// ==================== DASHBOARD STATS ====================

/**
 * GET /api/crm/dashboard/stats
 * Get aggregated dashboard statistics for the current tenant
 */
router.get('/dashboard/stats', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Get total unique persons count (distinct personId from leads)
    const personsResult = await db
      .select({ count: sql<number>`count(DISTINCT ${crmLeads.personId})::int` })
      .from(crmLeads)
      .where(eq(crmLeads.tenantId, tenantId));
    
    const totalPersons = personsResult[0]?.count || 0;

    // Get total leads count
    const leadsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(crmLeads)
      .where(eq(crmLeads.tenantId, tenantId));
    
    const totalLeads = leadsResult[0]?.count || 0;

    // Get open deals count (status != 'won' AND status != 'lost')
    const openDealsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(crmDeals)
      .where(
        and(
          eq(crmDeals.tenantId, tenantId),
          sql`${crmDeals.status} NOT IN ('won', 'lost')`
        )
      );
    
    const openDeals = openDealsResult[0]?.count || 0;

    // Get total pipeline value (sum of all open deal estimated values)
    const pipelineValueResult = await db
      .select({ total: sql<string>`COALESCE(SUM(${crmDeals.estimatedValue}), 0)::text` })
      .from(crmDeals)
      .where(
        and(
          eq(crmDeals.tenantId, tenantId),
          sql`${crmDeals.status} NOT IN ('won', 'lost')`
        )
      );
    
    const pipelineValue = Number(pipelineValueResult[0]?.total || 0);

    return res.json({
      success: true,
      data: {
        totalPersons,
        totalLeads,
        openDeals,
        pipelineValue
      },
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);
  } catch (error: any) {
    logger.error('Failed to fetch dashboard stats', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});





// ==================== LEADS ====================

/**
 * GET /api/crm/leads
 * Get all leads for the current tenant
 */
router.get('/leads', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { status, storeId, campaign, limit = '100', offset = '0' } = req.query;
    
    await setTenantContext(tenantId);

    // Build combined predicate with tenant isolation
    const conditions = [eq(crmLeads.tenantId, tenantId)];
    if (status) {
      conditions.push(eq(crmLeads.status, status as string));
    }
    if (storeId) {
      conditions.push(eq(crmLeads.storeId, storeId as string));
    }
    if (campaign) {
      conditions.push(eq(crmLeads.campaignId, campaign as string));
    }

    const leads = await db
      .select()
      .from(crmLeads)
      .where(and(...conditions))
      .orderBy(desc(crmLeads.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.status(200).json({
      success: true,
      data: leads,
      message: 'Leads retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving leads', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve leads',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/leads
 * Create a new lead
 */
router.post('/leads', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const validation = insertCrmLeadSchema.omit({ tenantId: true, personId: true }).safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Get or create personId with intelligent matching
    const personId = await getOrCreatePersonId(
      tenantId,
      validation.data.email,
      validation.data.phone,
      validation.data.sourceSocialAccountId
    );

    const [lead] = await db
      .insert(crmLeads)
      .values({
        ...validation.data,
        tenantId,
        personId
      })
      .returning();

    logger.info('Lead created', { leadId: lead.id, tenantId });

    res.status(201).json({
      success: true,
      data: lead,
      message: 'Lead created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error creating lead', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to create lead',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/leads/:id
 * Update a lead
 */
router.patch('/leads/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    const updateSchema = insertCrmLeadSchema.omit({ tenantId: true }).partial();
    
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

    const [updated] = await db
      .update(crmLeads)
      .set({
        ...validation.data,
        updatedAt: new Date()
      })
      .where(and(
        eq(crmLeads.id, id),
        eq(crmLeads.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Lead updated', { leadId: id, tenantId });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Lead updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating lead', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      leadId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to update lead',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/leads/:id/convert
 * Convert a lead to a deal
 */
router.post('/leads/:id/convert', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    const { pipelineId, stage, ownerUserId } = req.body;

    if (!pipelineId || !stage || !ownerUserId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: pipelineId, stage, ownerUserId',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Get the lead
    const [lead] = await db
      .select()
      .from(crmLeads)
      .where(and(
        eq(crmLeads.id, id),
        eq(crmLeads.tenantId, tenantId)
      ));

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Create deal from lead
    const [deal] = await db
      .insert(crmDeals)
      .values({
        tenantId,
        legalEntityId: lead.legalEntityId,
        storeId: lead.storeId,
        ownerUserId,
        pipelineId,
        stage,
        status: 'open',
        leadId: lead.id,
        campaignId: lead.campaignId,
        sourceChannel: lead.sourceChannel,
        personId: lead.personId,
        driverId: lead.driverId
      })
      .returning();

    // Update lead status to converted (with tenant isolation)
    await db
      .update(crmLeads)
      .set({
        status: 'converted',
        updatedAt: new Date()
      })
      .where(and(
        eq(crmLeads.id, id),
        eq(crmLeads.tenantId, tenantId)
      ));

    logger.info('Lead converted to deal', { leadId: id, dealId: deal.id, tenantId });

    res.status(201).json({
      success: true,
      data: deal,
      message: 'Lead converted to deal successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error converting lead', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      leadId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to convert lead',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== CAMPAIGNS ====================

/**
 * GET /api/crm/campaigns
 * Get all campaigns for the current tenant
 */
router.get('/campaigns', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { status, type, limit = '100', offset = '0' } = req.query;
    
    await setTenantContext(tenantId);

    // Build combined predicate with tenant isolation
    const conditions = [eq(crmCampaigns.tenantId, tenantId)];
    if (status) {
      conditions.push(eq(crmCampaigns.status, status as string));
    }
    if (type) {
      conditions.push(eq(crmCampaigns.type, type as string));
    }

    const campaigns = await db
      .select()
      .from(crmCampaigns)
      .where(and(...conditions))
      .orderBy(desc(crmCampaigns.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.status(200).json({
      success: true,
      data: campaigns,
      message: 'Campaigns retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving campaigns', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve campaigns',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/campaigns
 * Create a new campaign
 */
router.post('/campaigns', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const validation = insertCrmCampaignSchema.omit({ tenantId: true }).safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const [campaign] = await db
      .insert(crmCampaigns)
      .values({
        ...validation.data,
        tenantId
      })
      .returning();

    logger.info('Campaign created', { campaignId: campaign.id, tenantId });

    res.status(201).json({
      success: true,
      data: campaign,
      message: 'Campaign created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error creating campaign', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to create campaign',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/campaigns/:id
 * Update a campaign
 */
router.patch('/campaigns/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    const updateSchema = insertCrmCampaignSchema.omit({ tenantId: true }).partial();
    
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

    const [updated] = await db
      .update(crmCampaigns)
      .set({
        ...validation.data,
        updatedAt: new Date()
      })
      .where(and(
        eq(crmCampaigns.id, id),
        eq(crmCampaigns.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Campaign updated', { campaignId: id, tenantId });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Campaign updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating campaign', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      campaignId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to update campaign',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== PIPELINES ====================

/**
 * GET /api/crm/pipelines
 * Get all pipelines with aggregated metrics for the current tenant
 */
router.get('/pipelines', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { domain, isActive, limit = '100', offset = '0' } = req.query;
    
    await setTenantContext(tenantId);

    // Build combined predicate with tenant isolation
    const conditions = [eq(crmPipelines.tenantId, tenantId)];
    if (domain) {
      conditions.push(eq(crmPipelines.domain, domain as string));
    }
    if (isActive !== undefined) {
      conditions.push(eq(crmPipelines.isActive, isActive === 'true'));
    }

    const pipelines = await db
      .select({
        pipeline: crmPipelines,
        driverName: drivers.name
      })
      .from(crmPipelines)
      .leftJoin(drivers, eq(crmPipelines.driverId, drivers.id))
      .where(and(...conditions))
      .orderBy(desc(crmPipelines.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Enrich pipelines with aggregated metrics from deals
    const enrichedPipelines = await Promise.all(
      pipelines.map(async (row) => {
        const pipelineData = row.pipeline;
        const dealsMetrics = await db.execute(sql`
          SELECT 
            COUNT(*) FILTER (WHERE status NOT IN ('won', 'lost'))::int as active_deals,
            COALESCE(SUM(estimated_value) FILTER (WHERE status NOT IN ('won', 'lost')), 0)::float as total_value,
            COUNT(*) FILTER (WHERE status = 'won')::int as won_deals,
            COUNT(*) FILTER (WHERE status IN ('won', 'lost'))::int as closed_deals,
            COALESCE(AVG(estimated_value) FILTER (WHERE status NOT IN ('won', 'lost')), 0)::float as avg_deal_value
          FROM w3suite.crm_deals
          WHERE pipeline_id = ${pipelineData.id}
          AND tenant_id = ${tenantId}
        `);

        const metrics = dealsMetrics.rows[0] as any;
        const conversionRate = metrics.closed_deals > 0 
          ? Math.round((metrics.won_deals / metrics.closed_deals) * 100) 
          : 0;

        return {
          ...pipelineData,
          driver: pipelineData.driverId || 'FISSO',
          driverName: row.driverName || 'FISSO',
          activeDeals: metrics.active_deals || 0,
          totalValue: metrics.total_value || 0,
          conversionRate,
          avgDealValue: Math.round(metrics.avg_deal_value || 0),
          products: [] // TODO: Add products from deal metadata or relations
        };
      })
    );

    res.status(200).json({
      success: true,
      data: enrichedPipelines,
      message: 'Pipelines retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving pipelines', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve pipelines',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/pipelines
 * Create a new pipeline
 */
router.post('/pipelines', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const validation = insertCrmPipelineSchema.omit({ tenantId: true }).safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const [pipeline] = await db
      .insert(crmPipelines)
      .values({
        ...validation.data,
        tenantId
      })
      .returning();

    logger.info('Pipeline created', { pipelineId: pipeline.id, tenantId });

    res.status(201).json({
      success: true,
      data: pipeline,
      message: 'Pipeline created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error creating pipeline', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to create pipeline',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/pipelines/:id
 * Update a pipeline
 */
router.patch('/pipelines/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    const updateSchema = insertCrmPipelineSchema.omit({ tenantId: true }).partial();
    
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

    const [updated] = await db
      .update(crmPipelines)
      .set({
        ...validation.data,
        updatedAt: new Date()
      })
      .where(and(
        eq(crmPipelines.id, id),
        eq(crmPipelines.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Pipeline updated', { pipelineId: id, tenantId });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Pipeline updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating pipeline', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to update pipeline',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/pipelines/:id/settings
 * Get pipeline settings (team/user assignments, channels, etc.)
 */
router.get('/pipelines/:id/settings', rbacMiddleware, requirePermission('crm.view_pipeline'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id: pipelineId } = req.params;

    await setTenantContext(tenantId);

    // Verify pipeline exists and belongs to tenant
    const [pipeline] = await db
      .select()
      .from(crmPipelines)
      .where(and(
        eq(crmPipelines.id, pipelineId),
        eq(crmPipelines.tenantId, tenantId)
      ));

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Get settings
    const [settings] = await db
      .select()
      .from(crmPipelineSettings)
      .where(eq(crmPipelineSettings.pipelineId, pipelineId));

    // Return settings or empty object if not created yet
    res.status(200).json({
      success: true,
      data: settings || {
        pipelineId,
        assignedTeams: [],
        leadManagers: [],
        dealApprovers: [],
        pipelineAdmins: [],
      },
      message: 'Pipeline settings retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error getting pipeline settings', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to get pipeline settings',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/pipelines/:id/settings
 * Update pipeline settings (team/user assignments, channels, etc.)
 */
router.patch('/pipelines/:id/settings', rbacMiddleware, requirePermission('crm.manage_pipelines'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id: pipelineId } = req.params;
    
    // Validate request body
    const updateSchema = insertCrmPipelineSettingsSchema.omit({ pipelineId: true }).partial();
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

    // Verify pipeline exists and belongs to tenant
    const [pipeline] = await db
      .select()
      .from(crmPipelines)
      .where(and(
        eq(crmPipelines.id, pipelineId),
        eq(crmPipelines.tenantId, tenantId)
      ));

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Check if settings exist
    const [existingSettings] = await db
      .select()
      .from(crmPipelineSettings)
      .where(eq(crmPipelineSettings.pipelineId, pipelineId));

    let settings;
    
    if (existingSettings) {
      // Update existing settings
      [settings] = await db
        .update(crmPipelineSettings)
        .set({
          ...validation.data,
          updatedAt: new Date()
        })
        .where(eq(crmPipelineSettings.pipelineId, pipelineId))
        .returning();
    } else {
      // Create new settings
      [settings] = await db
        .insert(crmPipelineSettings)
        .values({
          pipelineId,
          ...validation.data,
        })
        .returning();
    }

    logger.info('Pipeline settings updated', { pipelineId, tenantId });

    res.status(200).json({
      success: true,
      data: settings,
      message: 'Pipeline settings updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating pipeline settings', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to update pipeline settings',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/pipelines/:id
 * Get a single pipeline by ID with all details
 */
router.get('/pipelines/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    await setTenantContext(tenantId);

    const [result] = await db
      .select({
        id: crmPipelines.id,
        tenantId: crmPipelines.tenantId,
        isBrandTemplate: crmPipelines.isBrandTemplate,
        brandPipelineId: crmPipelines.brandPipelineId,
        name: crmPipelines.name,
        domain: crmPipelines.domain,
        driverId: crmPipelines.driverId,
        driver: drivers.code,
        driverName: drivers.name,
        isActive: crmPipelines.isActive,
        stagesConfig: crmPipelines.stagesConfig,
        createdAt: crmPipelines.createdAt,
        updatedAt: crmPipelines.updatedAt,
      })
      .from(crmPipelines)
      .leftJoin(drivers, eq(crmPipelines.driverId, drivers.id))
      .where(and(
        eq(crmPipelines.id, id),
        eq(crmPipelines.tenantId, tenantId)
      ))
      .limit(1);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        message: `Pipeline with ID ${id} not found`,
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    res.status(200).json({
      success: true,
      data: result,
      message: 'Pipeline retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving pipeline', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve pipeline',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== PIPELINE WORKFLOWS (Subresource) ====================

/**
 * GET /api/crm/pipelines/:id/workflows
 * Get all workflows assigned to a pipeline with details
 */
router.get('/pipelines/:pipelineId/workflows', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId } = req.params;
    await setTenantContext(tenantId);

    // Verify pipeline exists and belongs to tenant
    const [pipeline] = await db
      .select()
      .from(crmPipelines)
      .where(and(
        eq(crmPipelines.id, pipelineId),
        eq(crmPipelines.tenantId, tenantId)
      ))
      .limit(1);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Get assigned workflows with join
    const workflows = await db
      .select({
        id: crmPipelineWorkflows.id,
        pipelineId: crmPipelineWorkflows.pipelineId,
        workflowTemplateId: crmPipelineWorkflows.workflowTemplateId,
        isActive: crmPipelineWorkflows.isActive,
        assignedBy: crmPipelineWorkflows.assignedBy,
        assignedAt: crmPipelineWorkflows.assignedAt,
        notes: crmPipelineWorkflows.notes,
        workflowName: workflowTemplates.name,
        workflowCategory: workflowTemplates.category,
        workflowType: workflowTemplates.templateType
      })
      .from(crmPipelineWorkflows)
      .innerJoin(workflowTemplates, eq(crmPipelineWorkflows.workflowTemplateId, workflowTemplates.id))
      .where(eq(crmPipelineWorkflows.pipelineId, pipelineId))
      .orderBy(desc(crmPipelineWorkflows.assignedAt));

    res.status(200).json({
      success: true,
      data: workflows,
      message: 'Pipeline workflows retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving pipeline workflows', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve pipeline workflows',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/pipelines/:id/workflows
 * Assign a workflow to a pipeline (RBAC: admin + marketing roles)
 */
router.post('/pipelines/:pipelineId/workflows', rbacMiddleware, requirePermission('crm.manage_pipelines'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const userId = req.user?.id;

    if (!tenantId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context or user authentication',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId } = req.params;

    // TODO: Implement RBAC check for admin + marketing permissions via sovereignty system
    // For now, allow any authenticated user (consistent with other CRM endpoints)

    const validation = insertCrmPipelineWorkflowSchema.omit({ assignedBy: true }).safeParse({
      ...req.body,
      pipelineId
    });

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Verify pipeline exists and belongs to tenant
    const [pipeline] = await db
      .select()
      .from(crmPipelines)
      .where(and(
        eq(crmPipelines.id, pipelineId),
        eq(crmPipelines.tenantId, tenantId)
      ))
      .limit(1);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Verify workflow template exists
    const [workflow] = await db
      .select()
      .from(workflowTemplates)
      .where(eq(workflowTemplates.id, validation.data.workflowTemplateId))
      .limit(1);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow template not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const [assignment] = await db
      .insert(crmPipelineWorkflows)
      .values({
        ...validation.data,
        assignedBy: userId
      })
      .returning();

    logger.info('Workflow assigned to pipeline', { 
      pipelineId, 
      workflowTemplateId: validation.data.workflowTemplateId,
      assignedBy: userId,
      tenantId 
    });

    res.status(201).json({
      success: true,
      data: assignment,
      message: 'Workflow assigned to pipeline successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    // Handle unique constraint violation
    if (error?.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'This workflow is already assigned to this pipeline',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.error('Error assigning workflow to pipeline', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to assign workflow to pipeline',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * DELETE /api/crm/pipelines/:id/workflows/:workflowId
 * Remove a workflow assignment from a pipeline
 */
router.delete('/pipelines/:pipelineId/workflows/:workflowId', rbacMiddleware, requirePermission('crm.manage_pipelines'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId, workflowId } = req.params;
    await setTenantContext(tenantId);

    // Verify pipeline belongs to tenant
    const [pipeline] = await db
      .select()
      .from(crmPipelines)
      .where(and(
        eq(crmPipelines.id, pipelineId),
        eq(crmPipelines.tenantId, tenantId)
      ))
      .limit(1);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const [deleted] = await db
      .delete(crmPipelineWorkflows)
      .where(and(
        eq(crmPipelineWorkflows.id, workflowId),
        eq(crmPipelineWorkflows.pipelineId, pipelineId)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Workflow assignment not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Workflow removed from pipeline', { 
      pipelineId, 
      workflowId,
      tenantId 
    });

    res.status(200).json({
      success: true,
      data: deleted,
      message: 'Workflow removed from pipeline successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error removing workflow from pipeline', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      workflowId: req.params.workflowId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to remove workflow from pipeline',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== PIPELINE STAGES (Subresource) ====================

/**
 * GET /api/crm/pipelines/:id/stages
 * Get all custom stages for a pipeline ordered by orderIndex
 */
router.get('/pipelines/:pipelineId/stages', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId } = req.params;
    await setTenantContext(tenantId);

    // Verify pipeline exists and belongs to tenant
    const [pipeline] = await db
      .select()
      .from(crmPipelines)
      .where(and(
        eq(crmPipelines.id, pipelineId),
        eq(crmPipelines.tenantId, tenantId)
      ))
      .limit(1);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const stages = await db
      .select()
      .from(crmPipelineStages)
      .where(eq(crmPipelineStages.pipelineId, pipelineId))
      .orderBy(crmPipelineStages.orderIndex);

    res.status(200).json({
      success: true,
      data: stages,
      message: 'Pipeline stages retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving pipeline stages', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve pipeline stages',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/pipelines/:id/category-stats
 * Get deal distribution by stage category with percentages (only categories > 0)
 */
router.get('/pipelines/:pipelineId/category-stats', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId } = req.params;
    await setTenantContext(tenantId);

    // Verify pipeline exists and belongs to tenant
    const [pipeline] = await db
      .select()
      .from(crmPipelines)
      .where(and(
        eq(crmPipelines.id, pipelineId),
        eq(crmPipelines.tenantId, tenantId)
      ))
      .limit(1);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Query: COUNT deals grouped by stage category with percentage calculation
    const categoryStats = await db.execute(sql`
      WITH category_counts AS (
        SELECT 
          s.category,
          COUNT(d.id)::int as deal_count
        FROM w3suite.crm_pipeline_stages s
        LEFT JOIN w3suite.crm_deals d ON d.stage = s.name 
          AND d.pipeline_id = s.pipeline_id 
          AND d.tenant_id = ${tenantId}
        WHERE s.pipeline_id = ${pipelineId}
        GROUP BY s.category
      ),
      total_deals AS (
        SELECT SUM(deal_count)::int as total FROM category_counts
      )
      SELECT 
        cc.category,
        cc.deal_count,
        CASE 
          WHEN td.total > 0 THEN ROUND((cc.deal_count::float / td.total::float * 100)::numeric, 1)
          ELSE 0
        END as percentage
      FROM category_counts cc
      CROSS JOIN total_deals td
      WHERE cc.deal_count > 0
      ORDER BY cc.deal_count DESC
    `);

    const stats = categoryStats.rows.map((row: any) => ({
      category: row.category,
      count: row.deal_count,
      percentage: parseFloat(row.percentage)
    }));

    res.status(200).json({
      success: true,
      data: stats,
      message: 'Category stats retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving category stats', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve category stats',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/pipelines/:id/channel-stats
 * Get top 5 acquisition channels with deal count and percentages
 */
router.get('/pipelines/:pipelineId/channel-stats', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId } = req.params;
    await setTenantContext(tenantId);

    // Verify pipeline exists and belongs to tenant
    const [pipeline] = await db
      .select()
      .from(crmPipelines)
      .where(and(
        eq(crmPipelines.id, pipelineId),
        eq(crmPipelines.tenantId, tenantId)
      ))
      .limit(1);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Query: COUNT deals grouped by last_contact_channel (OUTBOUND) with percentage
    const channelStats = await db.execute(sql`
      WITH channel_counts AS (
        SELECT 
          COALESCE(last_contact_channel::text, 'Non contattato') as channel,
          COUNT(*)::int as deal_count
        FROM w3suite.crm_deals
        WHERE pipeline_id = ${pipelineId}
          AND tenant_id = ${tenantId}
        GROUP BY last_contact_channel
      ),
      total_deals AS (
        SELECT SUM(deal_count)::int as total FROM channel_counts
      )
      SELECT 
        cc.channel,
        cc.deal_count,
        CASE 
          WHEN td.total > 0 THEN ROUND((cc.deal_count::float / td.total::float * 100)::numeric, 1)
          ELSE 0
        END as percentage
      FROM channel_counts cc
      CROSS JOIN total_deals td
      ORDER BY 
        CASE WHEN cc.channel = 'Non contattato' THEN 0 ELSE 1 END,
        cc.deal_count DESC
      LIMIT 5
    `);

    const stats = channelStats.rows.map((row: any) => ({
      channel: row.channel,
      count: row.deal_count,
      percentage: parseFloat(row.percentage)
    }));

    res.status(200).json({
      success: true,
      data: stats,
      message: 'Channel stats retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving channel stats', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve channel stats',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/pipelines/:id/channel-matrix
 * Get win rate matrix for inbound x outbound channel combinations
 */
router.get('/pipelines/:pipelineId/channel-matrix', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId } = req.params;
    await setTenantContext(tenantId);

    // Query: Win rate per inbound×outbound combination
    const matrixData = await db.execute(sql`
      SELECT 
        COALESCE(source_channel::text, 'Unknown') as inbound_channel,
        COALESCE(last_contact_channel::text, 'No Contact') as outbound_channel,
        COUNT(*) FILTER (WHERE status = 'won')::int as won_count,
        COUNT(*)::int as total_count,
        CASE 
          WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'won')::float / COUNT(*)::float * 100)::numeric, 1)
          ELSE 0
        END as win_rate
      FROM w3suite.crm_deals
      WHERE pipeline_id = ${pipelineId}
        AND tenant_id = ${tenantId}
        AND status IN ('won', 'lost')
      GROUP BY source_channel, last_contact_channel
      HAVING COUNT(*) >= 1
      ORDER BY win_rate DESC
    `);

    const matrix = matrixData.rows.map((row: any) => ({
      inboundChannel: row.inbound_channel,
      outboundChannel: row.outbound_channel,
      wonCount: row.won_count,
      totalCount: row.total_count,
      winRate: parseFloat(row.win_rate)
    }));

    res.status(200).json({
      success: true,
      data: matrix,
      message: 'Channel attribution matrix retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving channel matrix', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve channel matrix',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/pipelines/:id/best-pairs
 * Get top 5 inbound×outbound channel pairs by conversion rate
 */
router.get('/pipelines/:pipelineId/best-pairs', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId } = req.params;
    await setTenantContext(tenantId);

    const bestPairs = await db.execute(sql`
      SELECT 
        COALESCE(source_channel::text, 'Unknown') as inbound_channel,
        COALESCE(last_contact_channel::text, 'No Contact') as outbound_channel,
        COUNT(*) FILTER (WHERE status = 'won')::int as won_count,
        COUNT(*)::int as total_count,
        CASE 
          WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'won')::float / COUNT(*)::float * 100)::numeric, 1)
          ELSE 0
        END as conversion_rate,
        CONCAT(COALESCE(source_channel::text, 'Unknown'), ' + ', COALESCE(last_contact_channel::text, 'No Contact')) as pair_name
      FROM w3suite.crm_deals
      WHERE pipeline_id = ${pipelineId}
        AND tenant_id = ${tenantId}
        AND status IN ('won', 'lost')
      GROUP BY source_channel, last_contact_channel
      HAVING COUNT(*) >= 1
      ORDER BY conversion_rate DESC, total_count DESC
      LIMIT 5
    `);

    const pairs = bestPairs.rows.map((row: any) => ({
      pairName: row.pair_name,
      inboundChannel: row.inbound_channel,
      outboundChannel: row.outbound_channel,
      wonCount: row.won_count,
      totalCount: row.total_count,
      conversionRate: parseFloat(row.conversion_rate)
    }));

    res.status(200).json({
      success: true,
      data: pairs,
      message: 'Best performing pairs retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving best pairs', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve best pairs',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/pipelines/:id/funnel-by-source
 * Get conversion funnel breakdown by inbound source channel
 */
router.get('/pipelines/:pipelineId/funnel-by-source', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId } = req.params;
    await setTenantContext(tenantId);

    const funnelData = await db.execute(sql`
      WITH stage_categories AS (
        SELECT DISTINCT
          s.category,
          s.order_index
        FROM w3suite.crm_pipeline_stages s
        WHERE s.pipeline_id = ${pipelineId}
        ORDER BY s.order_index
      )
      SELECT 
        COALESCE(d.source_channel::text, 'Unknown') as source_channel,
        s.category as stage_category,
        COUNT(*)::int as deal_count,
        s.order_index
      FROM w3suite.crm_deals d
      JOIN w3suite.crm_pipeline_stages s ON s.name = d.stage AND s.pipeline_id = d.pipeline_id
      WHERE d.pipeline_id = ${pipelineId}
        AND d.tenant_id = ${tenantId}
      GROUP BY d.source_channel, s.category, s.order_index
      ORDER BY d.source_channel, s.order_index
    `);

    const funnel = funnelData.rows.map((row: any) => ({
      sourceChannel: row.source_channel,
      stageCategory: row.stage_category,
      dealCount: row.deal_count,
      orderIndex: row.order_index
    }));

    res.status(200).json({
      success: true,
      data: funnel,
      message: 'Funnel by source retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving funnel by source', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve funnel by source',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/pipelines/:id/outbound-efficiency
 * Get overall performance metrics for each outbound contact channel
 */
router.get('/pipelines/:pipelineId/outbound-efficiency', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId } = req.params;
    await setTenantContext(tenantId);

    const efficiencyData = await db.execute(sql`
      SELECT 
        COALESCE(last_contact_channel::text, 'No Contact') as channel,
        COUNT(*)::int as total_deals,
        COUNT(*) FILTER (WHERE status = 'won')::int as won_deals,
        COUNT(*) FILTER (WHERE status = 'lost')::int as lost_deals,
        CASE 
          WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'won')::float / COUNT(*)::float * 100)::numeric, 1)
          ELSE 0
        END as win_rate,
        ROUND(AVG(estimated_value) FILTER (WHERE status = 'won')::numeric, 2) as avg_deal_value
      FROM w3suite.crm_deals
      WHERE pipeline_id = ${pipelineId}
        AND tenant_id = ${tenantId}
        AND status IN ('won', 'lost', 'open')
      GROUP BY last_contact_channel
      ORDER BY win_rate DESC, total_deals DESC
    `);

    const efficiency = efficiencyData.rows.map((row: any) => ({
      channel: row.channel,
      totalDeals: row.total_deals,
      wonDeals: row.won_deals,
      lostDeals: row.lost_deals,
      winRate: parseFloat(row.win_rate),
      avgDealValue: parseFloat(row.avg_deal_value || 0)
    }));

    res.status(200).json({
      success: true,
      data: efficiency,
      message: 'Outbound channel efficiency retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving outbound efficiency', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve outbound efficiency',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/pipelines/:id/time-to-close
 * Get average time to close deals by inbound×outbound channel pair
 */
router.get('/pipelines/:pipelineId/time-to-close', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId } = req.params;
    await setTenantContext(tenantId);

    const timeData = await db.execute(sql`
      SELECT 
        COALESCE(source_channel::text, 'Unknown') as inbound_channel,
        COALESCE(last_contact_channel::text, 'No Contact') as outbound_channel,
        COUNT(*)::int as deal_count,
        ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(won_at, NOW()) - created_at)) / 86400)::numeric, 1) as avg_days_to_close,
        CONCAT(COALESCE(source_channel::text, 'Unknown'), ' + ', COALESCE(last_contact_channel::text, 'No Contact')) as pair_name
      FROM w3suite.crm_deals
      WHERE pipeline_id = ${pipelineId}
        AND tenant_id = ${tenantId}
        AND status = 'won'
      GROUP BY source_channel, last_contact_channel
      HAVING COUNT(*) >= 1
      ORDER BY avg_days_to_close ASC
    `);

    const timeToClose = timeData.rows.map((row: any) => ({
      pairName: row.pair_name,
      inboundChannel: row.inbound_channel,
      outboundChannel: row.outbound_channel,
      dealCount: row.deal_count,
      avgDaysToClose: parseFloat(row.avg_days_to_close)
    }));

    res.status(200).json({
      success: true,
      data: timeToClose,
      message: 'Time to close analysis retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving time to close', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve time to close',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/pipelines/:id/stages
 * Create a new custom stage for a pipeline
 */
router.post('/pipelines/:pipelineId/stages', rbacMiddleware, requirePermission('crm.manage_pipelines'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId } = req.params;

    const validation = insertCrmPipelineStageSchema.safeParse({
      ...req.body,
      pipelineId
    });

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Verify pipeline exists and belongs to tenant
    const [pipeline] = await db
      .select()
      .from(crmPipelines)
      .where(and(
        eq(crmPipelines.id, pipelineId),
        eq(crmPipelines.tenantId, tenantId)
      ))
      .limit(1);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const [stage] = await db
      .insert(crmPipelineStages)
      .values(validation.data)
      .returning();

    logger.info('Pipeline stage created', { 
      pipelineId, 
      stageId: stage.id,
      stageName: stage.name,
      category: stage.category,
      tenantId 
    });

    res.status(201).json({
      success: true,
      data: stage,
      message: 'Pipeline stage created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    // Handle unique constraint violation
    if (error?.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'A stage with this name already exists in this pipeline',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.error('Error creating pipeline stage', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to create pipeline stage',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/pipelines/:id/stages/:stageId
 * Update a custom stage
 */
router.patch('/pipelines/:pipelineId/stages/:stageId', rbacMiddleware, requirePermission('crm.manage_pipelines'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId, stageId } = req.params;
    const updateSchema = insertCrmPipelineStageSchema.omit({ pipelineId: true }).partial();

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

    // Verify pipeline belongs to tenant
    const [pipeline] = await db
      .select()
      .from(crmPipelines)
      .where(and(
        eq(crmPipelines.id, pipelineId),
        eq(crmPipelines.tenantId, tenantId)
      ))
      .limit(1);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const [updated] = await db
      .update(crmPipelineStages)
      .set({
        ...validation.data,
        updatedAt: new Date()
      })
      .where(and(
        eq(crmPipelineStages.id, stageId),
        eq(crmPipelineStages.pipelineId, pipelineId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Stage not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Pipeline stage updated', { 
      pipelineId, 
      stageId,
      tenantId 
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Pipeline stage updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating pipeline stage', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      stageId: req.params.stageId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to update pipeline stage',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/pipelines/:id/stages/:stageId/deals/count
 * Count deals in a specific stage
 */
router.get('/pipelines/:pipelineId/stages/:stageId/deals/count', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { stageId } = req.params;
    await setTenantContext(tenantId);

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(crmDeals)
      .where(and(
        eq(crmDeals.stageId, stageId),
        eq(crmDeals.tenantId, tenantId)
      ));

    const count = result[0]?.count || 0;

    res.status(200).json({
      success: true,
      data: { count },
      message: 'Deal count retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error counting deals for stage', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      stageId: req.params.stageId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to count deals',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * DELETE /api/crm/pipelines/:id/stages/:stageId
 * Delete or archive a custom stage (archives if deals exist, deletes if none)
 */
router.delete('/pipelines/:pipelineId/stages/:stageId', rbacMiddleware, requirePermission('crm.manage_pipelines'), async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { pipelineId, stageId } = req.params;
    await setTenantContext(tenantId);

    // Verify pipeline belongs to tenant
    const [pipeline] = await db
      .select()
      .from(crmPipelines)
      .where(and(
        eq(crmPipelines.id, pipelineId),
        eq(crmPipelines.tenantId, tenantId)
      ))
      .limit(1);

    if (!pipeline) {
      return res.status(404).json({
        success: false,
        error: 'Pipeline not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Verify stage exists
    const [stage] = await db
      .select()
      .from(crmPipelineStages)
      .where(and(
        eq(crmPipelineStages.id, stageId),
        eq(crmPipelineStages.pipelineId, pipelineId)
      ))
      .limit(1);

    if (!stage) {
      return res.status(404).json({
        success: false,
        error: 'Stage not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Check if stage has any deals
    const dealCountResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(crmDeals)
      .where(and(
        eq(crmDeals.stageId, stageId),
        eq(crmDeals.tenantId, tenantId)
      ));

    const dealCount = dealCountResult[0]?.count || 0;

    // If stage has deals, archive it instead of deleting
    if (dealCount > 0) {
      const [archived] = await db
        .update(crmPipelineStages)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(and(
          eq(crmPipelineStages.id, stageId),
          eq(crmPipelineStages.pipelineId, pipelineId)
        ))
        .returning();

      logger.info('Pipeline stage archived (has deals)', { 
        pipelineId, 
        stageId,
        dealCount,
        tenantId 
      });

      return res.status(200).json({
        success: true,
        data: { 
          ...archived, 
          action: 'archived',
          dealCount 
        },
        message: `Stato archiviato perché ha ${dealCount} deal associati`,
        timestamp: new Date().toISOString()
      } as ApiSuccessResponse);
    }

    // No deals, safe to delete
    const [deleted] = await db
      .delete(crmPipelineStages)
      .where(and(
        eq(crmPipelineStages.id, stageId),
        eq(crmPipelineStages.pipelineId, pipelineId)
      ))
      .returning();

    logger.info('Pipeline stage deleted (no deals)', { 
      pipelineId, 
      stageId,
      tenantId 
    });

    res.status(200).json({
      success: true,
      data: { 
        ...deleted, 
        action: 'deleted' 
      },
      message: 'Pipeline stage deleted successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error deleting pipeline stage', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      pipelineId: req.params.pipelineId,
      stageId: req.params.stageId,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to delete pipeline stage',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== DEALS ====================

/**
 * GET /api/crm/deals
 * Get all deals for the current tenant
 */
router.get('/deals', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { status, pipelineId, stage, limit = '100', offset = '0' } = req.query;
    
    await setTenantContext(tenantId);

    // Build combined predicate with tenant isolation
    const conditions = [eq(crmDeals.tenantId, tenantId)];
    if (status) {
      conditions.push(eq(crmDeals.status, status as string));
    }
    if (pipelineId) {
      conditions.push(eq(crmDeals.pipelineId, pipelineId as string));
    }
    if (stage) {
      conditions.push(eq(crmDeals.stage, stage as string));
    }

    const deals = await db
      .select({
        id: crmDeals.id,
        tenantId: crmDeals.tenantId,
        storeId: crmDeals.storeId,
        ownerUserId: crmDeals.ownerUserId,
        pipelineId: crmDeals.pipelineId,
        stage: crmDeals.stage,
        status: crmDeals.status,
        leadId: crmDeals.leadId,
        sourceChannel: crmDeals.sourceChannel,
        personId: crmDeals.personId,
        customerId: crmDeals.customerId,
        estimatedValue: crmDeals.estimatedValue,
        probability: crmDeals.probability,
        agingDays: crmDeals.agingDays,
        wonAt: crmDeals.wonAt,
        preferredContactChannel: crmDeals.preferredContactChannel,
        lastContactChannel: crmDeals.lastContactChannel,
        lastContactDate: crmDeals.lastContactDate,
        createdAt: crmDeals.createdAt,
        updatedAt: crmDeals.updatedAt,
        // Join fields
        ownerName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        customerName: sql<string>`CASE 
          WHEN ${crmCustomers.customerType} = 'b2b' THEN ${crmCustomers.companyName}
          WHEN ${crmCustomers.customerType} = 'b2c' THEN CONCAT(${crmCustomers.firstName}, ' ', ${crmCustomers.lastName})
          ELSE NULL
        END`,
        customerType: crmCustomers.customerType,
      })
      .from(crmDeals)
      .leftJoin(users, eq(crmDeals.ownerUserId, users.id))
      .leftJoin(crmCustomers, eq(crmDeals.customerId, crmCustomers.id))
      .where(and(...conditions))
      .orderBy(desc(crmDeals.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.status(200).json({
      success: true,
      data: deals,
      message: 'Deals retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving deals', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve deals',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/deals
 * Create a new deal
 */
router.post('/deals', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const validation = insertCrmDealSchema.omit({ tenantId: true, personId: true }).safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Get personId from lead if leadId is provided
    let personId: string | undefined;
    if (validation.data.leadId) {
      const [lead] = await db
        .select({ personId: crmLeads.personId })
        .from(crmLeads)
        .where(and(
          eq(crmLeads.id, validation.data.leadId),
          eq(crmLeads.tenantId, tenantId)
        ));
      
      if (lead) {
        personId = lead.personId;
        logger.info('Person ID propagated from lead to deal', {
          leadId: validation.data.leadId,
          personId,
          tenantId
        });
      } else {
        return res.status(404).json({
          success: false,
          error: 'Lead not found',
          timestamp: new Date().toISOString()
        } as ApiErrorResponse);
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'leadId is required to create a deal',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const [deal] = await db
      .insert(crmDeals)
      .values({
        ...validation.data,
        tenantId,
        personId
      })
      .returning();

    logger.info('Deal created', { dealId: deal.id, tenantId });

    res.status(201).json({
      success: true,
      data: deal,
      message: 'Deal created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error creating deal', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to create deal',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/deals/:id
 * Update a deal (including stage transitions)
 */
router.patch('/deals/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    const updateSchema = insertCrmDealSchema.omit({ tenantId: true }).partial();
    
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

    // Check if status is being changed to won/lost
    let updateData = { ...validation.data, updatedAt: new Date() };
    if (validation.data.status === 'won' && !validation.data.wonAt) {
      updateData = { ...updateData, wonAt: new Date() };
    } else if (validation.data.status === 'lost' && !validation.data.lostAt) {
      updateData = { ...updateData, lostAt: new Date() };
    }

    const [updated] = await db
      .update(crmDeals)
      .set(updateData)
      .where(and(
        eq(crmDeals.id, id),
        eq(crmDeals.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Deal updated', { dealId: id, tenantId, status: updateData.status });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Deal updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating deal', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      dealId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to update deal',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/deals/:id/move
 * Move deal to a different stage with workflow validation
 * 
 * Workflow Rules:
 * 1. Cannot return to "starter" category from any other stage
 * 2. finalized/ko/archive stages are LOCKED (require confirmOverride=true)
 */
router.patch('/deals/:id/move', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    const moveSchema = z.object({
      targetStage: z.string().min(1, 'Target stage is required'),
      confirmOverride: z.boolean().optional().default(false)
    });

    const validation = moveSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { targetStage, confirmOverride } = validation.data;
    await setTenantContext(tenantId);

    // Get current deal with its stage category
    const dealResult = await db.execute(sql`
      SELECT 
        d.id,
        d.stage as current_stage,
        d.pipeline_id,
        s_current.category as current_category
      FROM w3suite.crm_deals d
      LEFT JOIN w3suite.crm_pipeline_stages s_current 
        ON s_current.name = d.stage 
        AND s_current.pipeline_id = d.pipeline_id
      WHERE d.id = ${id} 
        AND d.tenant_id = ${tenantId}
    `);

    if (dealResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const deal = dealResult.rows[0] as any;

    // Get target stage category
    const targetStageResult = await db.execute(sql`
      SELECT category, name
      FROM w3suite.crm_pipeline_stages
      WHERE name = ${targetStage}
        AND pipeline_id = ${deal.pipeline_id}
    `);

    if (targetStageResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid target stage',
        message: `Stage "${targetStage}" does not exist in this pipeline`,
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const targetStageData = targetStageResult.rows[0] as any;
    const targetCategory = targetStageData.category;
    const currentCategory = deal.current_category;

    // WORKFLOW VALIDATION RULE 1: Cannot return to "starter" category
    if (targetCategory === 'starter' && currentCategory !== 'starter') {
      return res.status(403).json({
        success: false,
        error: 'Workflow violation',
        message: 'Non puoi tornare allo stage iniziale da uno stage successivo',
        code: 'FORBIDDEN_TRANSITION_TO_STARTER',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // WORKFLOW VALIDATION RULE 2: finalized/ko/archive are LOCKED
    const lockedCategories = ['finalized', 'ko', 'archive'];
    if (lockedCategories.includes(currentCategory) && !confirmOverride) {
      return res.status(403).json({
        success: false,
        error: 'Stage locked',
        message: `Questo deal è in uno stage bloccato (${currentCategory}). Conferma per riaprirlo.`,
        code: 'STAGE_LOCKED_NEEDS_CONFIRMATION',
        currentCategory,
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Validation passed - update stage
    const [updated] = await db
      .update(crmDeals)
      .set({
        stage: targetStage,
        updatedAt: new Date()
      })
      .where(and(
        eq(crmDeals.id, id),
        eq(crmDeals.tenantId, tenantId)
      ))
      .returning();

    logger.info('Deal stage moved', { 
      dealId: id, 
      tenantId, 
      from: deal.current_stage,
      to: targetStage,
      fromCategory: currentCategory,
      toCategory: targetCategory,
      confirmOverride 
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: `Deal spostato in "${targetStage}" con successo`,
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error moving deal', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      dealId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to move deal',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== INTERACTIONS ====================

/**
 * GET /api/crm/interactions
 * Get all interactions for the current tenant with optional filters
 */
router.get('/interactions', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { entityId, personId, channel, limit = '100', offset = '0' } = req.query;
    
    await setTenantContext(tenantId);

    // Build where clause with and()
    const whereConditions = [eq(crmInteractions.tenantId, tenantId)];
    
    // Note: crmInteractions uses entityId, not personId. If personId is provided, ignore it for now
    // as interactions are tied to entities (leads/deals/customers) not directly to persons
    if (entityId && typeof entityId === 'string' && entityId.trim()) {
      whereConditions.push(eq(crmInteractions.entityId, entityId));
    }
    if (channel && typeof channel === 'string' && channel.trim()) {
      whereConditions.push(eq(crmInteractions.channel, channel));
    }

    const interactions = await db
      .select()
      .from(crmInteractions)
      .where(whereConditions.length > 1 ? and(...whereConditions) : whereConditions[0])
      .orderBy(desc(crmInteractions.occurredAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.status(200).json({
      success: true,
      data: interactions,
      message: 'Interactions retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving interactions', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve interactions',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== CUSTOMERS ENDPOINTS ====================

/**
 * GET /api/crm/customers
 * Get all customers with optional filtering
 */
router.get('/customers', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { customerType, status, limit = '100', offset = '0' } = req.query;
    
    await setTenantContext(tenantId);

    const conditions = [eq(crmCustomers.tenantId, tenantId)];
    if (customerType) {
      conditions.push(eq(crmCustomers.customerType, customerType as any));
    }
    if (status) {
      conditions.push(eq(crmCustomers.status, status as string));
    }

    const customers = await db
      .select()
      .from(crmCustomers)
      .where(and(...conditions))
      .orderBy(desc(crmCustomers.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.status(200).json({
      success: true,
      data: customers,
      message: 'Customers retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving customers', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve customers',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/customers
 * Create a new customer
 */
router.post('/customers', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const validation = insertCrmCustomerSchema.omit({ tenantId: true }).safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const [customer] = await db
      .insert(crmCustomers)
      .values({
        ...validation.data,
        tenantId
      })
      .returning();

    logger.info('Customer created', { customerId: customer.id, tenantId });

    res.status(201).json({
      success: true,
      data: customer,
      message: 'Customer created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error creating customer', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to create customer',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/customers/:id
 * Get a single customer by ID
 */
router.get('/customers/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    await setTenantContext(tenantId);

    const [customer] = await db
      .select()
      .from(crmCustomers)
      .where(and(
        eq(crmCustomers.id, id),
        eq(crmCustomers.tenantId, tenantId)
      ))
      .limit(1);

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    res.status(200).json({
      success: true,
      data: customer,
      message: 'Customer retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving customer', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve customer',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/customers/:id
 * Update a customer
 */
router.patch('/customers/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    const validation = insertCrmCustomerSchema.omit({ tenantId: true }).partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const [customer] = await db
      .update(crmCustomers)
      .set({
        ...validation.data,
        updatedAt: new Date()
      })
      .where(and(
        eq(crmCustomers.id, id),
        eq(crmCustomers.tenantId, tenantId)
      ))
      .returning();

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Customer updated', { customerId: customer.id, tenantId });

    res.status(200).json({
      success: true,
      data: customer,
      message: 'Customer updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating customer', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to update customer',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * DELETE /api/crm/customers/:id
 * Delete a customer
 */
router.delete('/customers/:id', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id } = req.params;
    
    await setTenantContext(tenantId);

    const [customer] = await db
      .delete(crmCustomers)
      .where(and(
        eq(crmCustomers.id, id),
        eq(crmCustomers.tenantId, tenantId)
      ))
      .returning();

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Customer deleted', { customerId: id, tenantId });

    res.status(200).json({
      success: true,
      data: customer,
      message: 'Customer deleted successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error deleting customer', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to delete customer',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== PERSONS ENDPOINTS ====================

/**
 * GET /api/crm/persons/:personId/consents
 * Get consent information for a person
 */
router.get('/persons/:personId/consents', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { personId } = req.params;
    await setTenantContext(tenantId);

    // Get consent data from leads associated with this person
    const leads = await db
      .select({
        leadId: crmLeads.id,
        marketingConsent: crmLeads.marketingConsent,
        profilingConsent: crmLeads.profilingConsent,
        consentTimestamp: crmLeads.consentTimestamp,
        consentSource: crmLeads.consentSource
      })
      .from(crmLeads)
      .where(and(
        eq(crmLeads.personId, personId),
        eq(crmLeads.tenantId, tenantId)
      ))
      .limit(10);

    // Return the most recent consent if available
    const consents = leads.map(lead => ({
      type: 'lead',
      leadId: lead.leadId,
      marketingConsent: lead.marketingConsent || false,
      profilingConsent: lead.profilingConsent || false,
      timestamp: lead.consentTimestamp,
      source: lead.consentSource
    }));

    res.status(200).json({
      success: true,
      data: consents,
      message: 'Consents retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving person consents', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId,
      personId: req.params.personId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve consents',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/persons/:personId/analytics
 * Get analytics data for a person (KPIs and charts)
 */
router.get('/persons/:personId/analytics', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { personId } = req.params;
    await setTenantContext(tenantId);

    // Calculate KPIs using raw SQL to avoid Drizzle compatibility issues
    
    // 1. Lifetime Value & Deals Closed (from deals)
    const dealStatsResult = await db.execute(sql`
      SELECT 
        COALESCE(SUM(estimated_value), 0)::numeric AS total_value,
        COUNT(*)::integer AS deals_closed
      FROM w3suite.crm_deals
      WHERE person_id = ${personId}::uuid 
        AND tenant_id = ${tenantId}::uuid
        AND status = 'won'
    `);
    
    const dealStats = dealStatsResult.rows[0] || { total_value: 0, deals_closed: 0 };
    const lifetimeValue = parseFloat(String(dealStats.total_value || '0'));
    const dealsClosed = Number(dealStats.deals_closed || 0);

    // 2. Engagement Score (based on interactions count)
    const interactionsResult = await db.execute(sql`
      SELECT COUNT(*)::integer AS count
      FROM w3suite.crm_interactions
      WHERE entity_type = 'customer'
        AND entity_id IN (
          SELECT id FROM w3suite.crm_customers 
          WHERE person_id = ${personId}::uuid 
            AND tenant_id = ${tenantId}::uuid
        )
    `);
    
    const interactionsCount = Number(interactionsResult.rows[0]?.count || 0);
    const engagementScore = Math.min(100, Math.round(interactionsCount * 5));

    // 3. Referrals count
    const referralsResult = await db.execute(sql`
      SELECT COUNT(*)::integer AS count
      FROM w3suite.crm_leads
      WHERE tenant_id = ${tenantId}::uuid
        AND (source_channel ILIKE '%referral%' OR utm_source ILIKE '%referral%')
    `);
    
    const referrals = Number(referralsResult.rows[0]?.count || 0);

    // 4. LTV Trend (last 3 months vs previous 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentRevenueResult = await db.execute(sql`
      SELECT COALESCE(SUM(estimated_value), 0)::numeric AS total
      FROM w3suite.crm_deals
      WHERE person_id = ${personId}::uuid
        AND tenant_id = ${tenantId}::uuid
        AND status = 'won'
        AND won_at >= ${threeMonthsAgo.toISOString()}::timestamp
    `);
    
    const previousRevenueResult = await db.execute(sql`
      SELECT COALESCE(SUM(estimated_value), 0)::numeric AS total
      FROM w3suite.crm_deals
      WHERE person_id = ${personId}::uuid
        AND tenant_id = ${tenantId}::uuid
        AND status = 'won'
        AND won_at >= ${sixMonthsAgo.toISOString()}::timestamp
        AND won_at < ${threeMonthsAgo.toISOString()}::timestamp
    `);

    const recentRevenue = parseFloat(String(recentRevenueResult.rows[0]?.total || '0'));
    const previousRevenue = parseFloat(String(previousRevenueResult.rows[0]?.total || '0'));
    const ltvTrend = previousRevenue > 0 ? Math.round(((recentRevenue - previousRevenue) / previousRevenue) * 100) : 0;

    // Charts Data
    // 1. Revenue Data (last 6 months)
    const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    const revenueData = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const monthRevenueResult = await db.execute(sql`
        SELECT COALESCE(SUM(estimated_value), 0)::numeric AS total
        FROM w3suite.crm_deals
        WHERE person_id = ${personId}::uuid
          AND tenant_id = ${tenantId}::uuid
          AND status = 'won'
          AND won_at >= ${monthStart.toISOString()}::timestamp
          AND won_at < ${monthEnd.toISOString()}::timestamp
      `);

      revenueData.push({
        month: monthNames[monthStart.getMonth()],
        value: parseFloat(String(monthRevenueResult.rows[0]?.total || '0'))
      });
    }

    // 2. Interaction Channels
    const channelDataResult = await db.execute(sql`
      SELECT 
        channel,
        COUNT(*)::integer AS count
      FROM w3suite.crm_interactions
      WHERE entity_type = 'customer'
        AND entity_id IN (
          SELECT id FROM w3suite.crm_customers 
          WHERE person_id = ${personId}::uuid 
            AND tenant_id = ${tenantId}::uuid
        )
      GROUP BY channel
    `);
    
    const channelData = channelDataResult.rows.map((r: any) => ({
      channel: r.channel || 'unknown',
      count: Number(r.count)
    }));

    // 3. Campaign Distribution
    const campaignDataResult = await db.execute(sql`
      SELECT 
        c.name,
        COUNT(DISTINCT l.id)::integer AS count
      FROM w3suite.crm_leads l
      INNER JOIN w3suite.crm_campaigns c ON l.campaign_id = c.id
      WHERE l.person_id = ${personId}::uuid
        AND l.tenant_id = ${tenantId}::uuid
      GROUP BY c.name
    `);
    
    const campaignData = campaignDataResult.rows.map((r: any) => ({
      name: r.name,
      value: Number(r.count)
    }));

    const analyticsData = {
      kpi: {
        lifetimeValue,
        ltvTrend,
        dealsClosed,
        engagementScore,
        referrals
      },
      charts: {
        revenueData,
        interactionData: channelData.length > 0 ? channelData : [
          { channel: 'Email', count: 0 },
          { channel: 'Phone', count: 0 },
          { channel: 'In-Store', count: 0 }
        ],
        campaignData: campaignData.length > 0 ? campaignData : [
          { name: 'Nessuna Campagna', value: 1 }
        ]
      }
    };

    res.status(200).json({
      success: true,
      data: analyticsData,
      message: 'Analytics retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving person analytics', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId,
      personId: req.params.personId
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve analytics',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== AI LEAD ROUTING ====================

/**
 * POST /api/crm/ai/route-lead
 * Analyze customer interaction and route lead using AI
 */
router.post('/ai/route-lead', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Import AI service
    const { AILeadRoutingService } = await import('../services/ai-lead-routing.service');
    const aiService = new AILeadRoutingService();

    // Validate input
    const inputSchema = z.object({
      leadId: z.string().uuid().optional(),
      interactionType: z.string().min(1),
      interactionContent: z.string().min(1),
      leadName: z.string().optional(),
      leadEmail: z.string().email().optional(),
      leadPhone: z.string().optional(),
      leadCompany: z.string().optional(),
      acquisitionSourceId: z.string().uuid().optional(),
    });

    const validatedInput = inputSchema.parse(req.body);

    // Call AI service
    const routing = await aiService.routeLead({
      tenantId,
      ...validatedInput,
    });

    // Save to lead_routing_history
    const [routingHistory] = await db.insert(leadRoutingHistory).values({
      tenantId,
      leadId: validatedInput.leadId || null,
      interactionType: validatedInput.interactionType,
      interactionContent: validatedInput.interactionContent,
      acquisitionSourceId: validatedInput.acquisitionSourceId || null,
      recommendedDriver: routing.recommendedDriver,
      driverConfidence: routing.driverConfidence,
      driverReasoning: routing.driverReasoning,
      targetPipelineId: routing.targetPipelineId,
      campaignSuggestion: routing.campaignSuggestion,
      primaryOutboundChannel: routing.primaryOutboundChannel,
      secondaryOutboundChannel: routing.secondaryOutboundChannel,
      channelReasoning: routing.channelReasoning,
      estimatedValue: routing.estimatedValue,
      expectedCloseDate: routing.expectedCloseDate ? new Date(routing.expectedCloseDate) : null,
      priority: routing.priority,
      aiModel: routing.aiModel,
      responseTimeMs: routing.responseTimeMs,
      tokenUsage: routing.tokenUsage,
      fullAiResponse: routing.fullAiResponse,
    }).returning();

    // Save insights if lead exists
    if (validatedInput.leadId && routing.insights.length > 0) {
      await db.insert(leadAiInsights).values({
        tenantId,
        leadId: validatedInput.leadId,
        insightType: 'routing_analysis',
        insights: { items: routing.insights },
        nextAction: routing.nextAction,
        riskFactors: { items: routing.riskFactors },
        score: routing.driverConfidence === 'high' ? 90 : routing.driverConfidence === 'medium' ? 70 : 50,
        confidence: routing.driverConfidence === 'high' ? 0.9 : routing.driverConfidence === 'medium' ? 0.7 : 0.5,
        generatedBy: 'lead-routing-agent',
        aiModel: routing.aiModel,
      });
    }

    logger.info('AI Lead Routing completed', {
      routingHistoryId: routingHistory.id,
      leadId: validatedInput.leadId,
      driver: routing.recommendedDriver,
      confidence: routing.driverConfidence,
      tenantId,
    });

    res.status(200).json({
      success: true,
      data: {
        routing,
        routingHistoryId: routingHistory.id,
      },
      message: 'Lead routed successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error routing lead with AI', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to route lead',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/ai/routing-history/:leadId
 * Get AI routing history for a specific lead
 */
router.get('/ai/routing-history/:leadId', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const history = await db.select()
      .from(leadRoutingHistory)
      .where(and(
        eq(leadRoutingHistory.tenantId, tenantId),
        eq(leadRoutingHistory.leadId, req.params.leadId)
      ))
      .orderBy(desc(leadRoutingHistory.createdAt));

    res.status(200).json({
      success: true,
      data: history,
      message: 'Routing history retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving routing history', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId,
      leadId: req.params.leadId,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve routing history',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/ai/insights/:leadId
 * Get AI insights for a specific lead
 */
router.get('/ai/insights/:leadId', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const insights = await db.select()
      .from(leadAiInsights)
      .where(and(
        eq(leadAiInsights.tenantId, tenantId),
        eq(leadAiInsights.leadId, req.params.leadId)
      ))
      .orderBy(desc(leadAiInsights.createdAt));

    res.status(200).json({
      success: true,
      data: insights,
      message: 'AI insights retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving AI insights', {
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId,
      leadId: req.params.leadId,
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve AI insights',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

export default router;
