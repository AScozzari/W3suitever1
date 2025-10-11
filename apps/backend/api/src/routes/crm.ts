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
import { eq, and, sql, desc, or, ilike } from 'drizzle-orm';
import {
  crmPersons,
  crmPersonConsents,
  crmLeads,
  crmCampaigns,
  crmPipelines,
  crmDeals,
  crmInteractions,
  crmTasks,
  insertCrmPersonSchema,
  insertCrmLeadSchema,
  insertCrmCampaignSchema,
  insertCrmPipelineSchema,
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

export default router;
