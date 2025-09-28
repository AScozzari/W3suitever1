/**
 * Workflow Management API Routes
 * 
 * Provides REST endpoints for workflow templates, instances, universal requests,
 * and teams with full tenant isolation and RBAC integration.
 */

import express from 'express';
import { z } from 'zod';
import { db, setTenantContext } from '../core/db';
import { tenantMiddleware, rbacMiddleware, requirePermission } from '../middleware/tenant';
import { correlationMiddleware, logger } from '../core/logger';
import { eq, and, or, desc, asc, like, count, sql, inArray, not } from 'drizzle-orm';

// Database imports
import {
  workflowTemplates,
  workflowInstances,
  universalRequests,
  teams,
  teamWorkflowAssignments,
  aiSettings,
  insertWorkflowTemplateSchema,
  insertWorkflowInstanceSchema,
  insertUniversalRequestSchema,
  insertTeamSchema,
  insertTeamWorkflowAssignmentSchema,
} from '../db/schema/w3suite';

// Shared types and validation
import {
  CreateWorkflowTemplateSchema,
  UpdateWorkflowTemplateSchema,
  CreateWorkflowInstanceSchema,
  UpdateWorkflowInstanceSchema,
  CreateUniversalRequestSchema,
  UpdateUniversalRequestSchema,
  CreateTeamSchema,
  UpdateTeamSchema,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiPaginatedResponse,
} from '../types/workflow-shared';

// AI Services for workflow routing
import { WorkflowAIConnector } from '../services/workflow-ai-connector';
import { AIRegistryService } from '../services/ai-registry-service';

const router = express.Router();

// Apply middleware to all routes
router.use(correlationMiddleware);
router.use(tenantMiddleware);

// ==================== WORKFLOW TEMPLATES ====================

/**
 * GET /api/workflows/templates
 * Get all workflow templates for tenant with optional filtering
 */
router.get('/templates', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Query parameters
    const { 
      page = '1', 
      limit = '10', 
      category, 
      search, 
      isActive = 'true',
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build where conditions  
    let whereConditions = [eq(workflowTemplates.tenantId, tenantId)];
    
    if (isActive !== 'all') {
      whereConditions.push(eq(workflowTemplates.isActive, isActive === 'true'));
    }
    
    if (category) {
      whereConditions.push(eq(workflowTemplates.category, category as string));
    }
    
    if (search) {
      whereConditions.push(
        or(
          like(workflowTemplates.name, `%${search}%`),
          like(workflowTemplates.description, `%${search}%`)
        )!
      );
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(workflowTemplates)
      .where(and(...whereConditions));

    const total = totalResult.count;
    const totalPages = Math.ceil(total / limitNum);

    // Get templates with sorting
    // Get templates with sorting
    const orderDirection = sortOrder === 'desc' ? desc : asc;
    let sortColumn;
    switch (sortBy) {
      case 'name':
        sortColumn = workflowTemplates.name;
        break;
      case 'category':
        sortColumn = workflowTemplates.category;
        break;
      case 'createdAt':
        sortColumn = workflowTemplates.createdAt;
        break;
      case 'updatedAt':
      default:
        sortColumn = workflowTemplates.updatedAt;
        break;
    }

    const templates = await db
      .select()
      .from(workflowTemplates)
      .where(and(...whereConditions))
      .orderBy(orderDirection(sortColumn))
      .limit(limitNum)
      .offset(offset);

    res.json({
      success: true,
      data: templates,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      },
      timestamp: new Date().toISOString()
    } as ApiPaginatedResponse<typeof templates[0]>);

  } catch (error) {
    logger.error('Error fetching workflow templates', { error, tenantId: req.user?.tenantId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/workflows/templates/:id
 * Get specific workflow template by ID
 */
router.get('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const [template] = await db
      .select()
      .from(workflowTemplates)
      .where(and(
        eq(workflowTemplates.id, id),
        eq(workflowTemplates.tenantId, tenantId)
      ));

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Workflow template not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    res.json({
      success: true,
      data: template,
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<typeof template>);

  } catch (error) {
    logger.error('Error fetching workflow template', { error, templateId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/workflows/templates
 * Create new workflow template
 */
router.post('/templates', rbacMiddleware, requirePermission('workflow.create_template'), async (req, res) => {
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

    // Validate request body
    const validation = CreateWorkflowTemplateSchema.safeParse({
      ...req.body,
      tenantId
    });

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => i.message).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const templateData = validation.data;

    // Insert template with audit fields
    const [newTemplate] = await db
      .insert(workflowTemplates)
      .values({
        ...templateData,
        createdBy: userId,
        updatedBy: userId
      })
      .returning();

    logger.info('Workflow template created', { 
      templateId: newTemplate.id, 
      tenantId, 
      userId 
    });

    res.status(201).json({
      success: true,
      data: newTemplate,
      message: 'Workflow template created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<typeof newTemplate>);

  } catch (error) {
    logger.error('Error creating workflow template', { error, tenantId: req.user?.tenantId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * PUT /api/workflows/templates/:id
 * Update existing workflow template
 */
router.put('/templates/:id', rbacMiddleware, requirePermission('workflow.edit_template'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    const userId = req.user?.id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Validate request body
    const validation = UpdateWorkflowTemplateSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => i.message).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const updateData = validation.data;

    // Check if template exists and belongs to tenant
    const [existingTemplate] = await db
      .select()
      .from(workflowTemplates)
      .where(and(
        eq(workflowTemplates.id, id),
        eq(workflowTemplates.tenantId, tenantId)
      ));

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Workflow template not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Update template
    const [updatedTemplate] = await db
      .update(workflowTemplates)
      .set({
        ...updateData,
        updatedBy: userId,
        updatedAt: new Date()
      })
      .where(and(
        eq(workflowTemplates.id, id),
        eq(workflowTemplates.tenantId, tenantId)
      ))
      .returning();

    logger.info('Workflow template updated', { 
      templateId: id, 
      tenantId, 
      userId 
    });

    res.json({
      success: true,
      data: updatedTemplate,
      message: 'Workflow template updated successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<typeof updatedTemplate>);

  } catch (error) {
    logger.error('Error updating workflow template', { error, templateId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * DELETE /api/workflows/templates/:id
 * Delete workflow template (soft delete by setting isActive = false)
 */
router.delete('/templates/:id', rbacMiddleware, requirePermission('workflow.delete_template'), async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    const userId = req.user?.id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Check if template exists and belongs to tenant
    const [existingTemplate] = await db
      .select()
      .from(workflowTemplates)
      .where(and(
        eq(workflowTemplates.id, id),
        eq(workflowTemplates.tenantId, tenantId)
      ));

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Workflow template not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Check if template is in use by any active instances
    const [activeInstances] = await db
      .select({ count: count() })
      .from(workflowInstances)
      .where(and(
        eq(workflowInstances.templateId, id),
        eq(workflowInstances.tenantId, tenantId),
        not(eq(workflowInstances.currentStatus, 'completed'))
      ));

    if (activeInstances.count > 0) {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete template with active workflow instances',
        message: `${activeInstances.count} active instances found`,
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Soft delete by setting isActive = false
    await db
      .update(workflowTemplates)
      .set({
        isActive: false,
        updatedBy: userId,
        updatedAt: new Date()
      })
      .where(and(
        eq(workflowTemplates.id, id),
        eq(workflowTemplates.tenantId, tenantId)
      ));

    logger.info('Workflow template deleted', { 
      templateId: id, 
      tenantId, 
      userId 
    });

    res.json({
      success: true,
      data: { id },
      message: 'Workflow template deleted successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<{ id: string }>);

  } catch (error) {
    logger.error('Error deleting workflow template', { error, templateId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== WORKFLOW INSTANCES ====================

/**
 * GET /api/workflows/instances
 * Get workflow instances with filtering
 */
router.get('/instances', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }
    
    const { 
      page = '1', 
      limit = '10', 
      status, 
      templateId,
      referenceId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build where conditions
    let whereConditions = [eq(workflowInstances.tenantId, tenantId)];
    
    if (status) {
      whereConditions.push(eq(workflowInstances.currentStatus, status as string));
    }
    
    if (templateId) {
      whereConditions.push(eq(workflowInstances.templateId, templateId as string));
    }
    
    if (referenceId) {
      whereConditions.push(eq(workflowInstances.referenceId, referenceId as string));
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(workflowInstances)
      .where(and(...whereConditions));

    const total = totalResult.count;
    const totalPages = Math.ceil(total / limitNum);

    // Get instances with template info
    const orderDirection = sortOrder === 'desc' ? desc : asc;
    let sortColumn;
    switch (sortBy) {
      case 'instanceName':
        sortColumn = workflowInstances.instanceName;
        break;
      case 'currentStatus':
        sortColumn = workflowInstances.currentStatus;
        break;
      case 'updatedAt':
        sortColumn = workflowInstances.updatedAt;
        break;
      case 'createdAt':
      default:
        sortColumn = workflowInstances.createdAt;
        break;
    }

    const instances = await db
      .select({
        id: workflowInstances.id,
        tenantId: workflowInstances.tenantId,
        templateId: workflowInstances.templateId,
        referenceId: workflowInstances.referenceId,
        instanceType: workflowInstances.instanceType,
        instanceName: workflowInstances.instanceName,
        currentStatus: workflowInstances.currentStatus,
        currentStepId: workflowInstances.currentStepId,
        currentNodeId: workflowInstances.currentNodeId,
        currentAssignee: workflowInstances.currentAssignee,
        metadata: workflowInstances.metadata,
        context: workflowInstances.context,
        createdAt: workflowInstances.createdAt,
        updatedAt: workflowInstances.updatedAt,
        createdBy: workflowInstances.createdBy,
        updatedBy: workflowInstances.updatedBy,
        template: {
          id: workflowTemplates.id,
          name: workflowTemplates.name,
          category: workflowTemplates.category
        }
      })
      .from(workflowInstances)
      .leftJoin(workflowTemplates, eq(workflowInstances.templateId, workflowTemplates.id))
      .where(and(...whereConditions))
      .orderBy(orderDirection(sortColumn))
      .limit(limitNum)
      .offset(offset);

    res.json({
      success: true,
      data: instances,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      },
      timestamp: new Date().toISOString()
    } as ApiPaginatedResponse<typeof instances[0]>);

  } catch (error) {
    logger.error('Error fetching workflow instances', { error, tenantId: req.user?.tenantId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/workflows/instances
 * Create new workflow instance
 */
router.post('/instances', rbacMiddleware, requirePermission('workflow.create_instance'), async (req, res) => {
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

    // Validate request body
    const validation = CreateWorkflowInstanceSchema.safeParse({
      ...req.body,
      tenantId
    });

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => i.message).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const instanceData = validation.data;

    // Verify template exists and is active
    const [template] = await db
      .select()
      .from(workflowTemplates)
      .where(and(
        eq(workflowTemplates.id, instanceData.templateId),
        eq(workflowTemplates.tenantId, tenantId),
        eq(workflowTemplates.isActive, true)
      ));

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Workflow template not found or inactive',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Create workflow instance with category propagated from template
    const [newInstance] = await db
      .insert(workflowInstances)
      .values({
        ...instanceData,
        category: template.category, // 🎯 PROPAGATE category from template to instance
        createdBy: userId,
        updatedBy: userId
      })
      .returning();

    logger.info('Workflow instance created', { 
      instanceId: newInstance.id, 
      templateId: instanceData.templateId,
      tenantId, 
      userId 
    });

    res.status(201).json({
      success: true,
      data: newInstance,
      message: 'Workflow instance created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<typeof newInstance>);

  } catch (error) {
    logger.error('Error creating workflow instance', { error, tenantId: req.user?.tenantId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== UNIVERSAL REQUESTS ====================

/**
 * GET /api/workflows/requests
 * Get universal requests with filtering
 */
router.get('/requests', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    const { 
      page = '1', 
      limit = '10', 
      department,
      status,
      category,
      requesterId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build where conditions
    let whereConditions = [eq(universalRequests.tenantId, tenantId)];
    
    if (department) {
      whereConditions.push(eq(universalRequests.department, department as string));
    }
    
    if (status) {
      whereConditions.push(eq(universalRequests.status, status as string));
    }
    
    if (category) {
      whereConditions.push(eq(universalRequests.category, category as string));
    }
    
    if (requesterId) {
      whereConditions.push(eq(universalRequests.requesterId, requesterId as string));
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(universalRequests)
      .where(and(...whereConditions));

    const total = totalResult.count;
    const totalPages = Math.ceil(total / limitNum);

    // Get requests
    const orderDirection = sortOrder === 'desc' ? desc : asc;
    let sortColumn;
    switch (sortBy) {
      case 'title':
        sortColumn = universalRequests.title;
        break;
      case 'status':
        sortColumn = universalRequests.status;
        break;
      case 'priority':
        sortColumn = universalRequests.priority;
        break;
      case 'department':
        sortColumn = universalRequests.department;
        break;
      case 'updatedAt':
        sortColumn = universalRequests.updatedAt;
        break;
      case 'createdAt':
      default:
        sortColumn = universalRequests.createdAt;
        break;
    }

    const requests = await db
      .select()
      .from(universalRequests)
      .where(and(...whereConditions))
      .orderBy(orderDirection(sortColumn))
      .limit(limitNum)
      .offset(offset);

    res.json({
      success: true,
      data: requests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      },
      timestamp: new Date().toISOString()
    } as ApiPaginatedResponse<typeof requests[0]>);

  } catch (error) {
    logger.error('Error fetching universal requests', { error, tenantId: req.user?.tenantId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/workflows/requests
 * Create new universal request
 */
router.post('/requests', rbacMiddleware, async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    const userId = req.user?.id;

    // Validate request body
    const validation = CreateUniversalRequestSchema.safeParse({
      ...req.body,
      tenantId,
      requesterId: userId // Set requester to current user
    });

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => i.message).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const requestData = validation.data;

    // Create universal request
    const [newRequest] = await db
      .insert(universalRequests)
      .values({
        ...requestData,
        createdBy: userId,
        updatedBy: userId
      })
      .returning();

    logger.info('Universal request created', { 
      requestId: newRequest.id, 
      department: requestData.department,
      category: requestData.category,
      tenantId, 
      userId 
    });

    res.status(201).json({
      success: true,
      data: newRequest,
      message: 'Universal request created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<typeof newRequest>);

  } catch (error) {
    logger.error('Error creating universal request', { error, tenantId: req.user?.tenantId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== TEAMS ====================

/**
 * GET /api/workflows/teams
 * Get teams with optional filtering
 */
router.get('/teams', async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    const { 
      page = '1', 
      limit = '10', 
      teamType,
      isActive = 'true',
      search
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build where conditions
    let whereConditions = [eq(teams.tenantId, tenantId)];
    
    if (isActive !== 'all') {
      whereConditions.push(eq(teams.isActive, isActive === 'true'));
    }
    
    if (teamType) {
      whereConditions.push(eq(teams.teamType, teamType as string));
    }
    
    if (search) {
      whereConditions.push(
        or(
          like(teams.name, `%${search}%`),
          like(teams.description, `%${search}%`)
        )!
      );
    }

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(teams)
      .where(and(...whereConditions));

    const total = totalResult.count;
    const totalPages = Math.ceil(total / limitNum);

    // Get teams
    const teamsList = await db
      .select()
      .from(teams)
      .where(and(...whereConditions))
      .orderBy(desc(teams.updatedAt))
      .limit(limitNum)
      .offset(offset);

    res.json({
      success: true,
      data: teamsList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      },
      timestamp: new Date().toISOString()
    } as ApiPaginatedResponse<typeof teamsList[0]>);

  } catch (error) {
    logger.error('Error fetching teams', { error, tenantId: req.user?.tenantId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/workflows/teams
 * Create new team
 */
router.post('/teams', rbacMiddleware, requirePermission('team.create'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    const userId = req.user?.id;

    // Validate request body
    const validation = CreateTeamSchema.safeParse({
      ...req.body,
      tenantId
    });

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => i.message).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const teamData = validation.data;

    // Create team
    const [newTeam] = await db
      .insert(teams)
      .values({
        ...teamData,
        createdBy: userId,
        updatedBy: userId
      })
      .returning();

    logger.info('Team created', { 
      teamId: newTeam.id, 
      teamName: teamData.name,
      tenantId, 
      userId 
    });

    res.status(201).json({
      success: true,
      data: newTeam,
      message: 'Team created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<typeof newTeam>);

  } catch (error) {
    logger.error('Error creating team', { error, tenantId: req.user?.tenantId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== AI WORKFLOW ROUTING ====================

/**
 * POST /api/workflows/ai-route
 * AI-powered workflow routing for universal requests
 */
router.post('/ai-route', rbacMiddleware, requirePermission('workflow.create'), async (req, res) => {
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

    // Validate request body
    const aiRouteSchema = z.object({
      requestId: z.string().uuid('Request ID must be a valid UUID'),
      forceReRouting: z.boolean().optional().default(false)
    });

    const validation = aiRouteSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => i.message).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { requestId } = validation.data;

    // Set tenant context for database operations
    await setTenantContext(tenantId);

    // Check if request exists
    const [existingRequest] = await db
      .select()
      .from(universalRequests)
      .where(and(
        eq(universalRequests.id, requestId),
        eq(universalRequests.tenantId, tenantId)
      ))
      .limit(1);

    if (!existingRequest) {
      return res.status(404).json({
        success: false,
        error: 'Request not found',
        message: 'Universal request not found or access denied',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Get AI settings for the tenant
    const [tenantAISettings] = await db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.tenantId, tenantId))
      .limit(1);

    if (!tenantAISettings) {
      return res.status(400).json({
        success: false,
        error: 'AI settings not configured',
        message: 'AI settings must be configured before using AI routing',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Initialize AI services
    const aiRegistry = new AIRegistryService();
    const workflowAI = new WorkflowAIConnector(aiRegistry);

    // Execute AI routing
    const aiResult = await workflowAI.routeRequest(requestId, tenantId, tenantAISettings);

    if (!aiResult.success) {
      return res.status(500).json({
        success: false,
        error: 'AI routing failed',
        message: aiResult.error || 'Unknown AI routing error',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('AI workflow routing completed', {
      requestId,
      tenantId,
      selectedTeam: aiResult.decision.selectedTeam,
      flow: aiResult.decision.flow,
      workflowInstanceId: aiResult.workflowInstanceId,
      userId
    });

    res.status(200).json({
      success: true,
      data: {
        workflowInstanceId: aiResult.workflowInstanceId,
        routing: aiResult.decision,
        requestId
      },
      message: 'AI workflow routing completed successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<{
      workflowInstanceId: string | undefined;
      routing: typeof aiResult.decision;
      requestId: string;
    }>);

  } catch (error) {
    logger.error('Error in AI workflow routing', { 
      error, 
      requestId: req.body?.requestId,
      tenantId: req.user?.tenantId,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred during AI routing',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

export { router as workflowRoutes };