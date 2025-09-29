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
 * 🔐 RBAC: User can only see templates assigned to their teams/departments
 */
router.get('/templates', rbacMiddleware, requirePermission('workflow.read_template'), async (req, res) => {
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

    // 🔐 DEPARTMENTAL RBAC: Get user's team assignments to filter by department
    const userId = req.user?.id;
    const userTeamAssignments = await db
      .select({ templateId: teamWorkflowAssignments.templateId })
      .from(teamWorkflowAssignments)
      .innerJoin(teams, eq(teams.id, teamWorkflowAssignments.teamId))
      .where(and(
        eq(teams.tenantId, tenantId),
        eq(teams.isActive, true),
        // In production, add: inArray(teams.members, [userId])
        // For now, allowing all active teams in tenant
      ));

    // Extract template IDs that user has access to via team assignments
    const accessibleTemplateIds = userTeamAssignments.map(ta => ta.templateId);

    // Build where conditions  
    let whereConditions = [eq(workflowTemplates.tenantId, tenantId)];
    
    // 🎯 DEPARTMENTAL FILTER: Only show templates assigned to user's teams
    if (accessibleTemplateIds.length > 0) {
      whereConditions.push(inArray(workflowTemplates.id, accessibleTemplateIds));
    } else {
      // If user has no team assignments, show no templates (secure by default)
      whereConditions.push(eq(workflowTemplates.id, 'no-access'));
    }
    
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

    // Build where conditions - Fixed type casting
    let whereConditions = [eq(universalRequests.tenantId, tenantId as string)];
    
    if (department && typeof department === 'string') {
      whereConditions.push(sql`${universalRequests.department} = ${department}`);
    }
    
    if (status && typeof status === 'string') {
      whereConditions.push(sql`${universalRequests.status} = ${status}`);
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

    // 🎯 DEPARTMENTAL CONSTRAINT: Validate that department aligns with workflow category
    if (requestData.workflow_instance_id) {
      const [workflowInstance] = await db
        .select({ 
          category: workflowInstances.category 
        })
        .from(workflowInstances)
        .where(and(
          eq(workflowInstances.id, requestData.workflow_instance_id),
          sql`${workflowInstances.tenantId} = ${tenantId}`
        ));

      if (!workflowInstance) {
        return res.status(404).json({
          success: false,
          error: 'Workflow instance not found',
          timestamp: new Date().toISOString()
        } as ApiErrorResponse);
      }

      // Validate department/category alignment
      if (workflowInstance.category !== requestData.department) {
        return res.status(400).json({
          success: false,
          error: 'Department mismatch',
          message: `Request department '${requestData.department}' must match workflow category '${workflowInstance.category}'`,
          timestamp: new Date().toISOString()
        } as ApiErrorResponse);
      }
    }

    // Create universal request
    const [newRequest] = await db
      .insert(universalRequests)
      .values({
        ...requestData
        // Note: createdBy/updatedBy are auto-handled by schema defaults
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
// 🚨 SECURITY FIX: Removed unsecured teams endpoints (RBAC bypass vulnerability)
// Teams endpoints are now unified in hierarchy.ts with proper RBAC protection

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
    const aiRegistry = new AIRegistryService(db);
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

// ==================== DASHBOARD METRICS ====================

/**
 * GET /api/workflows/dashboard/metrics
 * Get workflow dashboard metrics and statistics
 * 🎯 Dashboard completa con dati reali dal database
 */
router.get('/dashboard/metrics', rbacMiddleware, requirePermission('workflow.read_dashboard'), async (req, res) => {
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

    // 📊 Templates Summary
    const templatesStats = await db
      .select({
        total: count(),
        active: sql<number>`COUNT(CASE WHEN is_active = true THEN 1 END)`,
        category: workflowTemplates.category
      })
      .from(workflowTemplates)
      .where(eq(workflowTemplates.tenantId, tenantId))
      .groupBy(workflowTemplates.category);

    // 📈 Instances Summary  
    const instancesStats = await db
      .select({
        total: count(),
        running: sql<number>`COUNT(CASE WHEN current_status = 'running' THEN 1 END)`,
        completed: sql<number>`COUNT(CASE WHEN current_status = 'completed' THEN 1 END)`,
        pending: sql<number>`COUNT(CASE WHEN current_status = 'pending' THEN 1 END)`,
        failed: sql<number>`COUNT(CASE WHEN current_status = 'failed' THEN 1 END)`
      })
      .from(workflowInstances)
      .where(eq(workflowInstances.tenantId, tenantId));

    // 🎯 Top Templates by Usage
    const topTemplates = await db
      .select({
        id: workflowTemplates.id,
        name: workflowTemplates.name,
        category: workflowTemplates.category,
        usageCount: workflowTemplates.usageCount,
        instanceCount: count(workflowInstances.id)
      })
      .from(workflowTemplates)
      .leftJoin(workflowInstances, eq(workflowInstances.templateId, workflowTemplates.id))
      .where(eq(workflowTemplates.tenantId, tenantId))
      .groupBy(workflowTemplates.id, workflowTemplates.name, workflowTemplates.category, workflowTemplates.usageCount)
      .orderBy(desc(workflowTemplates.usageCount))
      .limit(5);

    // 📅 Recent Activity (last 7 days)
    const recentActivity = await db
      .select({
        date: sql<string>`DATE(created_at)`,
        templatesCreated: sql<number>`COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END)`,
        instancesStarted: count(workflowInstances.id)
      })
      .from(workflowInstances)
      .where(
        and(
          eq(workflowInstances.tenantId, tenantId),
          sql`created_at >= NOW() - INTERVAL '7 days'`
        )
      )
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`);

    const dashboardData = {
      summary: {
        totalTemplates: templatesStats.reduce((sum, stat) => sum + Number(stat.total ?? 0), 0),
        activeTemplates: templatesStats.reduce((sum, stat) => sum + Number(stat.active ?? 0), 0),
        totalInstances: instancesStats[0]?.total || 0,
        runningInstances: instancesStats[0]?.running || 0,
        completedInstances: instancesStats[0]?.completed || 0,
        pendingInstances: instancesStats[0]?.pending || 0,
        failedInstances: instancesStats[0]?.failed || 0
      },
      templatesByCategory: templatesStats,
      instancesStatus: instancesStats[0] || { total: 0, running: 0, completed: 0, pending: 0, failed: 0 },
      topTemplates,
      recentActivity
    };

    logger.info('📊 Dashboard metrics retrieved', {
      tenantId,
      totalTemplates: dashboardData.summary.totalTemplates,
      totalInstances: dashboardData.summary.totalInstances,
      userId: req.user?.id
    });

    res.status(200).json({
      success: true,
      data: dashboardData,
      message: 'Dashboard metrics retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<typeof dashboardData>);

  } catch (error) {
    logger.error('Error retrieving dashboard metrics', { 
      error, 
      tenantId: req.user?.tenantId,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while retrieving dashboard metrics',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== TIMELINE ====================

/**
 * GET /api/workflows/timeline
 * Get workflow execution timeline and history
 * 🕒 Timeline completa con dati reali
 */
router.get('/timeline', rbacMiddleware, requirePermission('workflow.read_history'), async (req, res) => {
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
      limit = '20',
      dateFrom,
      dateTo,
      status,
      category
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    await setTenantContext(tenantId);

    // Build where conditions
    let whereConditions = [eq(workflowInstances.tenantId, tenantId)];
    
    if (status) {
      whereConditions.push(eq(workflowInstances.currentStatus, status as string));
    }
    
    if (dateFrom) {
      whereConditions.push(sql`started_at >= ${dateFrom}`);
    }
    
    if (dateTo) {
      whereConditions.push(sql`started_at <= ${dateTo}`);
    }

    // 🕒 Get workflow timeline with template details
    const timelineEntries = await db
      .select({
        instanceId: workflowInstances.id,
        instanceName: workflowInstances.instanceName,
        templateName: workflowTemplates.name,
        templateCategory: workflowTemplates.category,
        status: workflowInstances.currentStatus,
        currentStep: workflowInstances.currentNodeId,
        assignee: workflowInstances.currentAssignee,
        startedAt: workflowInstances.startedAt,
        completedAt: workflowInstances.completedAt,
        lastActivityAt: workflowInstances.lastActivityAt,
        escalationLevel: workflowInstances.escalationLevel,
        referenceId: workflowInstances.referenceId
      })
      .from(workflowInstances)
      .innerJoin(workflowTemplates, eq(workflowTemplates.id, workflowInstances.templateId))
      .where(and(...whereConditions))
      .orderBy(desc(workflowInstances.lastActivityAt))
      .limit(limitNum)
      .offset(offset);

    // Get total count for pagination
    const totalCount = await db
      .select({ count: count() })
      .from(workflowInstances)
      .innerJoin(workflowTemplates, eq(workflowTemplates.id, workflowInstances.templateId))
      .where(and(...whereConditions));

    const total = totalCount[0]?.count || 0;
    const totalPages = Math.ceil(total / limitNum);

    logger.info('🕒 Timeline retrieved', {
      tenantId,
      entriesCount: timelineEntries.length,
      page: pageNum,
      totalPages,
      userId: req.user?.id
    });

    res.status(200).json({
      success: true,
      data: {
        entries: timelineEntries,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      },
      message: 'Timeline retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<{
      entries: typeof timelineEntries;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    }>);

  } catch (error) {
    logger.error('Error retrieving timeline', { 
      error, 
      tenantId: req.user?.tenantId,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while retrieving timeline',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== ANALYTICS ====================

/**
 * GET /api/workflows/analytics
 * Get workflow analytics and performance statistics  
 * 📊 Analytics complete con dati reali
 */
router.get('/analytics', rbacMiddleware, requirePermission('workflow.read_analytics'), async (req, res) => {
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
      period = '30', // days
      category 
    } = req.query;

    await setTenantContext(tenantId);

    // 📈 Performance Analytics - Fixed column names to snake_case
    const performanceStats = await db.execute(sql`
      SELECT 
        DATE_TRUNC('day', we.started_at) as date,
        COUNT(*) as executions,
        AVG(we.duration) as avg_duration,
        MIN(we.duration) as min_duration,
        MAX(we.duration) as max_duration,
        COUNT(CASE WHEN we.status = 'success' THEN 1 END) as successful,
        COUNT(CASE WHEN we.status = 'failed' THEN 1 END) as failed
      FROM workflow_executions we
      JOIN workflow_instances wi ON wi.id = we.instance_id
      WHERE wi.tenant_id = ${tenantId}
        AND we.started_at >= NOW() - make_interval(days => ${parseInt(period as string, 10)})
      GROUP BY DATE_TRUNC('day', we.started_at)
      ORDER BY date DESC
    `);

    // 🎯 Category Performance - Fixed with raw SQL (snake_case)
    const categoryStats = await db.execute(sql`
      SELECT 
        wt.category,
        COUNT(wi.id) as total_instances,
        COUNT(CASE WHEN wi.current_status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN wi.current_status = 'in_progress' THEN 1 END) as running,
        COUNT(CASE WHEN wi.current_status = 'failed' THEN 1 END) as failed,
        AVG(EXTRACT(EPOCH FROM (wi.completed_at - wi.started_at))) as avg_completion_time
      FROM workflow_templates wt
      LEFT JOIN workflow_instances wi ON wi.template_id = wt.id
      WHERE wt.tenant_id = ${tenantId}
        AND (wi.created_at >= NOW() - make_interval(days => ${parseInt(period as string, 10)}) OR wi.created_at IS NULL)
      GROUP BY wt.category
      ORDER BY total_instances DESC
    `);

    // ⚡ Most Active Templates - Fixed with raw SQL (snake_case)
    const activeTemplates = await db.execute(sql`
      SELECT 
        wt.name,
        wt.category,
        COUNT(wi.id) as instances_count,
        AVG(EXTRACT(EPOCH FROM (wi.completed_at - wi.started_at))) as avg_duration,
        MAX(wi.last_activity_at) as last_used
      FROM workflow_templates wt
      LEFT JOIN workflow_instances wi ON wi.template_id = wt.id
      WHERE wt.tenant_id = ${tenantId}
        AND (wi.created_at >= NOW() - make_interval(days => ${parseInt(period as string, 10)}) OR wi.created_at IS NULL)
      GROUP BY wt.id, wt.name, wt.category
      ORDER BY instances_count DESC
      LIMIT 10
    `);

    // 🕒 Hourly Distribution - Fixed with raw SQL (snake_case)
    const hourlyDistribution = await db.execute(sql`
      SELECT 
        EXTRACT(HOUR FROM wi.started_at) as hour,
        COUNT(*) as instances_started
      FROM workflow_instances wi
      WHERE wi.tenant_id = ${tenantId}
        AND wi.started_at >= NOW() - make_interval(days => ${parseInt(period as string, 10)})
      GROUP BY EXTRACT(HOUR FROM wi.started_at)
      ORDER BY hour
    `);

    const analyticsData = {
      performance: performanceStats.rows,
      categoryStats: categoryStats.rows,
      activeTemplates: activeTemplates.rows,
      hourlyDistribution: hourlyDistribution.rows,
      period: parseInt(period as string),
      generatedAt: new Date().toISOString()
    };

    logger.info('📊 Analytics retrieved', {
      tenantId,
      period,
      performanceDataPoints: performanceStats.rows.length,
      categoriesAnalyzed: categoryStats.rows.length,
      userId: req.user?.id
    });

    res.status(200).json({
      success: true,
      data: analyticsData,
      message: 'Analytics retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<typeof analyticsData>);

  } catch (error) {
    logger.error('Error retrieving analytics', { 
      error, 
      tenantId: req.user?.tenantId,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while retrieving analytics',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

export { router as workflowRoutes };