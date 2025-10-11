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
  crmPersons,
  crmPersonConsents,
  crmLeads,
  crmCampaigns,
  crmPipelines,
  crmPipelineWorkflows,
  crmPipelineStages,
  crmDeals,
  crmInteractions,
  crmTasks,
  workflowTemplates,
  insertCrmPersonSchema,
  insertCrmLeadSchema,
  insertCrmCampaignSchema,
  insertCrmPipelineSchema,
  insertCrmPipelineWorkflowSchema,
  insertCrmPipelineStageSchema,
  insertCrmDealSchema
} from '../db/schema/w3suite';
import { ApiSuccessResponse, ApiErrorResponse } from '../types/workflow-shared';

const router = express.Router();

router.use(correlationMiddleware);

// Helper: Get tenant ID from request
const getTenantId = (req: express.Request): string | null => {
  return req.headers['x-tenant-id'] as string || req.user?.tenantId || null;
};

// ==================== PERSONS (Identity Graph) ====================

/**
 * GET /api/crm/persons
 * Get all persons for the current tenant with optional search
 */
router.get('/persons', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { search, limit = '100', offset = '0' } = req.query;
    
    await setTenantContext(tenantId);

    // Build combined predicate with tenant isolation
    const conditions = [eq(crmPersons.tenantId, tenantId)];
    if (search) {
      conditions.push(
        or(
          ilike(crmPersons.emailCanonical, `%${search}%`),
          ilike(crmPersons.phoneCanonical, `%${search}%`),
          ilike(crmPersons.firstName, `%${search}%`),
          ilike(crmPersons.lastName, `%${search}%`)
        )
      );
    }

    const persons = await db
      .select()
      .from(crmPersons)
      .where(and(...conditions))
      .orderBy(desc(crmPersons.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.status(200).json({
      success: true,
      data: persons,
      message: 'Persons retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving persons', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve persons',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/crm/persons/:id
 * Get a single person by ID
 */
router.get('/persons/:id', async (req, res) => {
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

    const [person] = await db
      .select()
      .from(crmPersons)
      .where(and(
        eq(crmPersons.id, id),
        eq(crmPersons.tenantId, tenantId)
      ));

    if (!person) {
      return res.status(404).json({
        success: false,
        error: 'Person not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    res.status(200).json({
      success: true,
      data: person,
      message: 'Person retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving person', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      personId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve person',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/crm/persons
 * Create a new person (with automatic deduplication)
 */
router.post('/persons', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const validation = insertCrmPersonSchema.omit({ tenantId: true }).safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    // Check for existing person by email or phone
    let existingPerson = null;
    if (validation.data.emailCanonical) {
      [existingPerson] = await db
        .select()
        .from(crmPersons)
        .where(and(
          eq(crmPersons.tenantId, tenantId),
          eq(crmPersons.emailCanonical, validation.data.emailCanonical)
        ))
        .limit(1);
    }

    if (!existingPerson && validation.data.phoneCanonical) {
      [existingPerson] = await db
        .select()
        .from(crmPersons)
        .where(and(
          eq(crmPersons.tenantId, tenantId),
          eq(crmPersons.phoneCanonical, validation.data.phoneCanonical)
        ))
        .limit(1);
    }

    if (existingPerson) {
      return res.status(200).json({
        success: true,
        data: existingPerson,
        message: 'Existing person found (deduplication)',
        timestamp: new Date().toISOString()
      } as ApiSuccessResponse);
    }

    const [person] = await db
      .insert(crmPersons)
      .values({
        ...validation.data,
        tenantId
      })
      .returning();

    logger.info('Person created', { personId: person.id, tenantId });

    res.status(201).json({
      success: true,
      data: person,
      message: 'Person created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error creating person', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to create person',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PATCH /api/crm/persons/:id
 * Update a person
 */
router.patch('/persons/:id', async (req, res) => {
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
    const updateSchema = insertCrmPersonSchema.omit({ tenantId: true }).partial();
    
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
      .update(crmPersons)
      .set({
        ...validation.data,
        updatedAt: new Date()
      })
      .where(and(
        eq(crmPersons.id, id),
        eq(crmPersons.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Person not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Person updated', { personId: id, tenantId });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Person updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error updating person', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      personId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to update person',
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

    const { status, storeId, limit = '100', offset = '0' } = req.query;
    
    await setTenantContext(tenantId);

    // Build combined predicate with tenant isolation
    const conditions = [eq(crmLeads.tenantId, tenantId)];
    if (status) {
      conditions.push(eq(crmLeads.status, status as string));
    }
    if (storeId) {
      conditions.push(eq(crmLeads.storeId, storeId as string));
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

    const validation = insertCrmLeadSchema.omit({ tenantId: true }).safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const [lead] = await db
      .insert(crmLeads)
      .values({
        ...validation.data,
        tenantId
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
 * Get all pipelines for the current tenant
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
      .select()
      .from(crmPipelines)
      .where(and(...conditions))
      .orderBy(desc(crmPipelines.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.status(200).json({
      success: true,
      data: pipelines,
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
 * DELETE /api/crm/pipelines/:id/stages/:stageId
 * Delete a custom stage
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

    const [deleted] = await db
      .delete(crmPipelineStages)
      .where(and(
        eq(crmPipelineStages.id, stageId),
        eq(crmPipelineStages.pipelineId, pipelineId)
      ))
      .returning();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Stage not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('Pipeline stage deleted', { 
      pipelineId, 
      stageId,
      tenantId 
    });

    res.status(200).json({
      success: true,
      data: deleted,
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
      .select()
      .from(crmDeals)
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

    const validation = insertCrmDealSchema.omit({ tenantId: true }).safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    await setTenantContext(tenantId);

    const [deal] = await db
      .insert(crmDeals)
      .values({
        ...validation.data,
        tenantId
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

    // Build combined predicate with tenant isolation
    const conditions = [eq(crmInteractions.tenantId, tenantId)];
    if (entityId) {
      conditions.push(eq(crmInteractions.entityId, entityId as string));
    }
    if (personId) {
      conditions.push(eq(crmInteractions.personId, personId as string));
    }
    if (channel) {
      conditions.push(eq(crmInteractions.channel, channel as string));
    }

    const interactions = await db
      .select()
      .from(crmInteractions)
      .where(and(...conditions))
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

// ==================== CONSENTS ====================

/**
 * GET /api/crm/persons/:id/consents
 * Get all consents for a specific person
 */
router.get('/persons/:id/consents', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id: personId } = req.params;
    
    await setTenantContext(tenantId);

    // Verify person exists and belongs to tenant
    const [person] = await db
      .select()
      .from(crmPersons)
      .where(and(
        eq(crmPersons.id, personId),
        eq(crmPersons.tenantId, tenantId)
      ));

    if (!person) {
      return res.status(404).json({
        success: false,
        error: 'Person not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const consents = await db
      .select()
      .from(crmPersonConsents)
      .where(and(
        eq(crmPersonConsents.personId, personId),
        eq(crmPersonConsents.tenantId, tenantId)
      ))
      .orderBy(desc(crmPersonConsents.grantedAt));

    res.status(200).json({
      success: true,
      data: consents,
      message: 'Consents retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving consents', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      personId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve consents',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== ANALYTICS ====================

/**
 * GET /api/crm/persons/:id/analytics
 * Get analytics data for a specific person (customer 360 view)
 */
router.get('/persons/:id/analytics', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { id: personId } = req.params;
    
    await setTenantContext(tenantId);

    // Verify person exists and belongs to tenant
    const [person] = await db
      .select()
      .from(crmPersons)
      .where(and(
        eq(crmPersons.id, personId),
        eq(crmPersons.tenantId, tenantId)
      ));

    if (!person) {
      return res.status(404).json({
        success: false,
        error: 'Person not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Calculate Lifetime Value (sum of won deals)
    const wonDeals = await db
      .select()
      .from(crmDeals)
      .where(and(
        eq(crmDeals.personId, personId),
        eq(crmDeals.tenantId, tenantId),
        eq(crmDeals.status, 'won')
      ));

    const lifetimeValue = wonDeals.reduce((sum, deal) => sum + (deal.estimatedValue || 0), 0);
    const dealsClosed = wonDeals.length;

    // Get all deals for revenue trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const recentDeals = await db
      .select()
      .from(crmDeals)
      .where(and(
        eq(crmDeals.personId, personId),
        eq(crmDeals.tenantId, tenantId),
        eq(crmDeals.status, 'won'),
        sql`${crmDeals.wonAt} >= ${sixMonthsAgo.toISOString()}`
      ));

    // Group deals by month for revenue trend
    const revenueByMonth: { [key: string]: number } = {};
    const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    
    recentDeals.forEach(deal => {
      if (deal.wonAt) {
        const month = new Date(deal.wonAt).getMonth();
        const monthKey = monthNames[month];
        revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + (deal.estimatedValue || 0);
      }
    });

    const revenueData = Object.entries(revenueByMonth).map(([month, value]) => ({ month, value }));

    // Get interactions for engagement score and channel distribution
    const interactions = await db
      .select()
      .from(crmInteractions)
      .where(and(
        eq(crmInteractions.tenantId, tenantId),
        sql`${crmInteractions.entityId} IN (
          SELECT id FROM ${crmDeals} WHERE person_id = ${personId}
          UNION
          SELECT id FROM ${crmLeads} WHERE person_id = ${personId}
        )`
      ));

    // Calculate engagement score (0-100 based on interaction count)
    const engagementScore = Math.min(100, Math.floor(interactions.length * 5));

    // Group interactions by channel
    const interactionsByChannel: { [key: string]: number } = {};
    interactions.forEach(interaction => {
      const channel = interaction.channel || 'Other';
      interactionsByChannel[channel] = (interactionsByChannel[channel] || 0) + 1;
    });

    const interactionData = Object.entries(interactionsByChannel).map(([channel, count]) => ({ channel, count }));

    // Get campaign attribution from leads/deals
    const leads = await db
      .select()
      .from(crmLeads)
      .where(and(
        eq(crmLeads.personId, personId),
        eq(crmLeads.tenantId, tenantId)
      ));

    const deals = await db
      .select()
      .from(crmDeals)
      .where(and(
        eq(crmDeals.personId, personId),
        eq(crmDeals.tenantId, tenantId)
      ));

    const campaignSources: { [key: string]: number } = {};
    [...leads, ...deals].forEach(item => {
      const source = item.sourceChannel || 'Direct';
      campaignSources[source] = (campaignSources[source] || 0) + 1;
    });

    const campaignData = Object.entries(campaignSources).map(([name, value]) => ({ name, value }));

    // Calculate referrals (count of leads where source indicates referral)
    const referrals = leads.filter(lead => 
      lead.sourceChannel?.toLowerCase().includes('referral') || 
      lead.sourceChannel?.toLowerCase().includes('passaparola')
    ).length;

    // Calculate LTV trend (percentage change)
    const previousPeriodDeals = await db
      .select()
      .from(crmDeals)
      .where(and(
        eq(crmDeals.personId, personId),
        eq(crmDeals.tenantId, tenantId),
        eq(crmDeals.status, 'won'),
        sql`${crmDeals.wonAt} < ${sixMonthsAgo.toISOString()}`
      ));

    const previousLTV = previousPeriodDeals.reduce((sum, deal) => sum + (deal.estimatedValue || 0), 0);
    const ltvTrendPercentage = previousLTV > 0 
      ? ((lifetimeValue - previousLTV) / previousLTV * 100).toFixed(1)
      : lifetimeValue > 0 ? '100.0' : '0.0';

    res.status(200).json({
      success: true,
      data: {
        kpi: {
          lifetimeValue,
          ltvTrend: parseFloat(ltvTrendPercentage),
          dealsClosed,
          engagementScore,
          referrals
        },
        charts: {
          revenueData,
          interactionData,
          campaignData
        }
      },
      message: 'Analytics retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse);

  } catch (error: any) {
    logger.error('Error retrieving analytics', { 
      errorMessage: error?.message || 'Unknown error',
      errorStack: error?.stack,
      personId: req.params.id,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error?.message || 'Failed to retrieve analytics',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

export default router;
