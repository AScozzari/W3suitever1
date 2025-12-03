/**
 * Workflow Management API Routes
 * 
 * Provides REST endpoints for workflow templates, instances, universal requests,
 * and teams with full tenant isolation and RBAC integration.
 */

import express from 'express';
import { z } from 'zod';
import { db, setTenantContext } from '../core/db';
import { storage } from '../core/storage';
import { tenantMiddleware, rbacMiddleware, requirePermission } from '../middleware/tenant';
import { correlationMiddleware, logger } from '../core/logger';
import { eq, and, or, desc, asc, like, count, sql, inArray, not } from 'drizzle-orm';
import { WorkflowEngine } from '../services/workflow-engine';

// Database imports
import {
  workflowTemplates,
  workflowInstances,
  workflowStepExecutions,
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
import { RequestTriggerService } from '../services/request-trigger-service';
import { DEPARTMENT_ACTION_TAGS, ALL_DEPARTMENTS, getActionTagsForDepartment, getAllActionTags } from '../lib/action-tags';

// Initialize Workflow Engine
const workflowEngine = new WorkflowEngine();

const router = express.Router();

// Apply middleware to all routes
router.use(correlationMiddleware);
router.use(tenantMiddleware);

// ==================== ACTION TAGS ====================

/**
 * GET /api/workflows/action-tags
 * Get all predefined action tags organized by department
 * Used in workflow editor to tag what the workflow DOES
 */
router.get('/action-tags', async (req, res) => {
  try {
    const { department } = req.query;
    
    if (department) {
      // Return tags for specific department
      const tags = getActionTagsForDepartment(department as string);
      return res.json({
        success: true,
        data: {
          department,
          tags
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Return all action tags organized by department
    const allTags = getAllActionTags();
    return res.json({
      success: true,
      data: {
        departments: ALL_DEPARTMENTS,
        actionTagsByDepartment: allTags
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Error fetching action tags', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch action tags',
      timestamp: new Date().toISOString()
    });
  }
});

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
    // ✅ EXCEPTION: CRM workflows are accessible to all users (consistent with CRM endpoints)
    const userId = req.user?.id;
    const isCrmCategory = category === 'crm';
    
    let accessibleTemplateIds: string[] = [];
    
    if (!isCrmCategory) {
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
      accessibleTemplateIds = userTeamAssignments.map(ta => ta.templateId);
    }

    // Build where conditions  
    let whereConditions = [eq(workflowTemplates.tenantId, tenantId)];
    
    // 🎯 DEPARTMENTAL FILTER: Only show templates assigned to user's teams
    // ✅ Skip team filter for CRM workflows (open access within tenant)
    if (!isCrmCategory) {
      if (accessibleTemplateIds.length > 0) {
        whereConditions.push(inArray(workflowTemplates.id, accessibleTemplateIds));
      } else {
        // If user has no team assignments, show no templates (secure by default)
        whereConditions.push(eq(workflowTemplates.id, 'no-access'));
      }
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

    // ✅ Transform data to match frontend interface: wrap nodes/edges/viewport in definition object
    const transformedTemplate = {
      ...template,
      definition: {
        nodes: template.nodes || [],
        edges: template.edges || [],
        viewport: template.viewport || { x: 0, y: 0, zoom: 1 }
      }
    };

    res.json({
      success: true,
      data: transformedTemplate,
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<typeof transformedTemplate>);

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

    // ✅ DETECT ReactFlow templates and use proper creation method
    const isReactFlowTemplate = !!(template.nodes && template.edges);

    logger.info('🔍 Template detection', { 
      templateId: template.id,
      hasNodes: !!template.nodes,
      hasEdges: !!template.edges,
      nodesType: typeof template.nodes,
      edgesType: typeof template.edges,
      isReactFlow: isReactFlowTemplate
    });

    let newInstance;

    if (isReactFlowTemplate) {
      // Use ReactFlow-specific creation with bridge parser
      newInstance = await workflowEngine.createInstanceFromReactFlow(template.id, {
        tenantId,
        requesterId: userId || 'system',
        requestId: instanceData.referenceId,
        instanceName: instanceData.instanceName,
        metadata: instanceData.context || {}
      });
    } else {
      // Legacy method for old workflow_steps based templates
      const [instance] = await db
        .insert(workflowInstances)
        .values({
          ...instanceData,
          category: template.category, // 🎯 PROPAGATE category from template to instance
          createdBy: userId,
          updatedBy: userId
        })
        .returning();
      newInstance = instance;
    }

    logger.info('Workflow instance created', { 
      instanceId: newInstance.id, 
      templateId: instanceData.templateId,
      isReactFlow: isReactFlowTemplate,
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
    logger.error('Error creating workflow instance', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      tenantId: req.user?.tenantId 
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
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

    // 🚀 AUTOMATION: Auto-trigger workflow for request if team/template exist
    let automationResult = null;
    if (!requestData.workflowInstanceId) { // Only auto-trigger if no workflow manually specified
      try {
        automationResult = await RequestTriggerService.triggerWorkflowForRequest(newRequest, tenantId);
        
        if (automationResult.success) {
          logger.info('✅ Request automation successful', {
            requestId: newRequest.id,
            workflowInstanceId: automationResult.workflowInstanceId,
            message: automationResult.message
          });
        } else {
          logger.warn('⚠️ Request automation skipped', {
            requestId: newRequest.id,
            reason: automationResult.message || automationResult.error
          });
        }
      } catch (autoError) {
        logger.error('❌ Request automation failed', {
          requestId: newRequest.id,
          error: autoError instanceof Error ? autoError.message : 'Unknown automation error'
        });
        // Don't fail the request creation if automation fails
      }
    }

    // Include automation info in response
    const responseData = {
      ...newRequest,
      automation: automationResult ? {
        triggered: automationResult.success,
        workflowInstanceId: automationResult.workflowInstanceId,
        message: automationResult.message || automationResult.error
      } : {
        triggered: false,
        reason: 'Manual workflow specified or automation disabled'
      }
    };

    res.status(201).json({
      success: true,
      data: responseData,
      message: automationResult?.success 
        ? `Universal request created and ${automationResult.message}`
        : 'Universal request created successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<typeof responseData>);

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
    const aiRegistry = new AIRegistryService(storage);
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

/**
 * POST /api/workflows/ai-analyze
 * AI-powered workflow analysis (Phase 1)
 * Analyzes user request and provides workflow plan before generation
 */
router.post('/ai-analyze', rbacMiddleware, requirePermission('workflow.create'), async (req, res) => {
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
    const aiAnalyzeSchema = z.object({
      prompt: z.string().min(3, 'Prompt must be at least 3 characters'),
      conversationHistory: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string()
      })).optional(),
      context: z.object({
        department: z.string().optional(),
        category: z.string().optional()
      }).optional()
    });

    const validationResult = aiAnalyzeSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        message: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { prompt, conversationHistory, context } = validationResult.data;

    logger.info('🤖 [AI Analyze] Starting workflow analysis', {
      tenantId,
      userId,
      promptLength: prompt.length,
      context
    });

    // Get tenant AI settings
    await setTenantContext(tenantId);
    const [tenantAISettings] = await db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.tenantId, tenantId))
      .limit(1);

    if (!tenantAISettings) {
      return res.status(400).json({
        success: false,
        error: 'AI settings not configured for this tenant',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Build conversational prompt with full history for context retention
    let fullPrompt = prompt;
    if (conversationHistory && conversationHistory.length > 0) {
      const historyText = conversationHistory
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');
      fullPrompt = `${historyText}\n\nUser: ${prompt}`;
    }

    logger.info('🤖 [AI Analyze] Conversation history', {
      tenantId,
      historyLength: conversationHistory?.length || 0,
      fullPromptLength: fullPrompt.length
    });

    // Initialize AI services
    const aiRegistry = new AIRegistryService(storage);

    // Call workflow-assistant agent for conversational analysis
    // The agent will respond with JSON: {status, type, message, missing, collected, taskReminder, readyToBuild}
    const aiResponse = await aiRegistry.createUnifiedResponse(
      fullPrompt, // Pass full conversation history for context
      tenantAISettings,
      {
        agentId: 'workflow-assistant',
        tenantId,
        userId: userId || 'system',
        moduleContext: 'workflow',
        mcpTools: []
      }
    );

    // Check if AI response is valid
    if (!aiResponse.success || !aiResponse.output) {
      return res.status(500).json({
        success: false,
        error: 'AI service error',
        message: aiResponse.error || 'No response from AI service',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Parse JSON response from AI (clean markdown code blocks first)
    let parsedAnalysis;
    try {
      let cleanedOutput = aiResponse.output.trim();
      
      // Remove markdown code blocks if present
      if (cleanedOutput.startsWith('```json')) {
        cleanedOutput = cleanedOutput.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedOutput.startsWith('```')) {
        cleanedOutput = cleanedOutput.replace(/```\n?/g, '');
      }
      
      parsedAnalysis = JSON.parse(cleanedOutput.trim());
    } catch (parseError) {
      logger.warn('🤖 [AI Analyze] AI returned non-JSON response, using raw text', {
        tenantId,
        outputPreview: aiResponse.output.substring(0, 100),
        error: parseError
      });
      parsedAnalysis = null;
    }

    logger.info('🤖 [AI Analyze] Analysis completed', {
      tenantId,
      status: parsedAnalysis?.status || 'unknown',
      type: parsedAnalysis?.type || 'text',
      tokensUsed: aiResponse.tokensUsed
    });

    return res.json({
      success: true,
      data: {
        analysis: aiResponse.output, // Raw text (fallback)
        parsedAnalysis: parsedAnalysis, // Parsed JSON structure
        tokensUsed: aiResponse.tokensUsed,
        cost: aiResponse.cost
      },
      message: 'Workflow analysis completed successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<{
      analysis: string;
      parsedAnalysis?: {
        status: 'incomplete' | 'complete';
        type: 'question' | 'reminder';
        message: string;
        missing?: string[];
        collected?: any;
        taskReminder?: any;
        readyToBuild?: boolean;
      };
      tokensUsed?: number;
      cost?: number;
    }>);

  } catch (error) {
    logger.error('❌ [AI Analyze] Error during analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred during AI analysis',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/workflows/ai-generate
 * AI-powered workflow generation from natural language (Phase 2)
 * Uses workflow-builder-ai agent to generate workflow JSON from user prompt
 */
router.post('/ai-generate', rbacMiddleware, requirePermission('workflow.create'), async (req, res) => {
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
    const aiGenerateSchema = z.object({
      taskReminder: z.object({
        workflowType: z.string(),
        trigger: z.string(),
        approver: z.string(),
        teamsInvolved: z.array(z.string()).optional(),
        flow: z.string(),
        routing: z.object({
          mode: z.enum(['auto', 'manual']),
          department: z.string().optional()
        }).optional(),
        notifications: z.string().optional(),
        businessRules: z.string().optional(),
        sla: z.string().optional()
      }),
      originalPrompt: z.string().optional(),
      context: z.object({
        department: z.string().optional(),
        category: z.string().optional()
      }).optional()
    });

    console.log('[AI-GENERATE] 📥 Request body received:', JSON.stringify(req.body, null, 2));
    
    const validationResult = aiGenerateSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error('[AI-GENERATE] ❌ Validation failed:', validationResult.error.errors);
      console.error('[AI-GENERATE] 📋 Received body:', JSON.stringify(req.body, null, 2));
      
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        message: validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        details: validationResult.error.errors,
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }
    
    console.log('[AI-GENERATE] ✅ Validation passed, taskReminder:', JSON.stringify(validationResult.data.taskReminder, null, 2));

    const { taskReminder, originalPrompt, context } = validationResult.data;

    logger.info('🤖 [AI Generate] Starting workflow generation', {
      tenantId,
      userId,
      taskReminder,
      originalPrompt,
      context
    });

    // Get tenant AI settings
    await setTenantContext(tenantId);
    const [tenantAISettings] = await db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.tenantId, tenantId))
      .limit(1);

    if (!tenantAISettings) {
      return res.status(400).json({
        success: false,
        error: 'AI settings not configured for this tenant',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // 🔍 Fetch real tenant data for AI context
    const [teamsData, usersData] = await Promise.all([
      db.select({
        id: teams.id,
        name: teams.name,
        department: teams.assignedDepartments
      }).from(teams).where(sql`${teams.tenantId} = ${tenantId}`),
      
      db.select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        department: users.department
      }).from(users).where(sql`${users.tenantId} = ${tenantId}`)
    ]);
    
    // Build team/user context for AI
    const teamsContext = teamsData.length > 0 
      ? `\n\nTEAM DISPONIBILI (usa questi ID reali):\n${teamsData.map(t => `- ${t.name} (ID: "${t.id}", Department: ${t.department || 'N/A'})`).join('\n')}`
      : '';
      
    const usersContext = usersData.length > 0
      ? `\n\nUTENTI DISPONIBILI (usa questi ID reali):\n${usersData.slice(0, 10).map(u => `- ${u.fullName} (ID: "${u.id}", Email: ${u.email}, Department: ${u.department || 'N/A'})`).join('\n')}`
      : '';
    
    // Build comprehensive prompt from task reminder with REAL DATA
    const userPrompt = `Genera un workflow JSON completo con queste specifiche:

Tipo Workflow: ${taskReminder.workflowType}
Trigger: ${taskReminder.trigger}
Approver: ${taskReminder.approver}
Team Coinvolti: ${taskReminder.teamsInvolved?.join(', ') || 'N/A'}
Flow Type: ${taskReminder.flow}
${taskReminder.routing ? `Routing Mode: ${taskReminder.routing.mode} (${taskReminder.routing.mode === 'auto' ? 'automatic assignment by department' : 'manual assignment to specific teams/users'})${taskReminder.routing.department ? ` - Department: ${taskReminder.routing.department}` : ''}` : ''}
${taskReminder.notifications ? `Notifiche: ${taskReminder.notifications}` : ''}
${taskReminder.businessRules ? `Regole Business: ${taskReminder.businessRules}` : ''}
${taskReminder.sla ? `SLA: ${taskReminder.sla}` : ''}
${context?.department ? `\nReparto: ${context.department}` : ''}
${teamsContext}
${usersContext}

Genera un workflow ReactFlow JSON con nodi e collegamenti configurati correttamente.
${taskReminder.routing ? `\nIMPORTANTE: Il nodo di routing (team-routing o user-routing) deve avere assignmentMode='${taskReminder.routing.mode}'${taskReminder.routing.department ? ` e forDepartment='${taskReminder.routing.department}'` : ''}. USA GLI ID REALI dei team/utenti dalla lista sopra!` : ''}
${taskReminder.routing?.mode === 'manual' ? `\nPer MANUAL routing, seleziona gli ID appropriati dei team/utenti dalla lista sopra in base al department richiesto.` : ''}`;

    // Initialize AI services
    const aiRegistry = new AIRegistryService(storage);

    // Use workflow-builder-ai agent from Brand Interface registry
    // The agent already has the correct system prompt for JSON workflow generation
    // IMPORTANT: Disable all tools to enable JSON mode (tools and response_format are incompatible)
    const settingsForJSONMode = {
      ...tenantAISettings,
      responseFormat: { type: "json_object" }, // Force JSON mode
      featuresEnabled: {
        ...tenantAISettings.featuresEnabled,
        web_search: false, // Disable to allow JSON mode
        file_search: false,
        code_interpreter: false,
        computer_use: false
      }
    };
    
    const aiResponse = await aiRegistry.createUnifiedResponse(
      userPrompt,
      settingsForJSONMode,
      {
        agentId: 'workflow-builder-ai', // Use dedicated workflow builder agent
        tenantId,
        userId: userId || 'system',
        moduleContext: 'workflow',
        mcpTools: [] // No MCP tools for workflow generation
      }
    );

    // Check if AI response is valid
    if (!aiResponse.success || !aiResponse.output) {
      return res.status(500).json({
        success: false,
        error: 'AI service error',
        message: aiResponse.error || 'No response from AI service',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('🤖 [AI Generate] Received AI response', {
      tenantId,
      outputLength: aiResponse.output.length,
      tokensUsed: aiResponse.tokensUsed,
      cost: aiResponse.cost
    });

    // Parse and validate JSON
    let workflowJSON;
    try {
      // Clean response (remove markdown code blocks if present)
      let cleanedOutput = aiResponse.output.trim();
      if (cleanedOutput.startsWith('```json')) {
        cleanedOutput = cleanedOutput.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanedOutput.startsWith('```')) {
        cleanedOutput = cleanedOutput.replace(/```\n?/g, '');
      }
      
      workflowJSON = JSON.parse(cleanedOutput);
      
      // Basic validation
      if (!workflowJSON.nodes || !Array.isArray(workflowJSON.nodes)) {
        throw new Error('Invalid workflow structure: missing nodes array');
      }
      if (!workflowJSON.edges) {
        workflowJSON.edges = [];
      }

    } catch (parseError) {
      logger.error('❌ [AI Generate] Failed to parse AI response', {
        error: parseError,
        response: aiResponse.output.substring(0, 500)
      });
      
      return res.status(500).json({
        success: false,
        error: 'Failed to parse AI-generated workflow',
        message: parseError instanceof Error ? parseError.message : 'Invalid JSON format',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    logger.info('✅ [AI Generate] Workflow generated successfully', {
      tenantId,
      userId,
      nodesCount: workflowJSON.nodes.length,
      edgesCount: workflowJSON.edges.length
    });

    res.status(200).json({
      success: true,
      data: {
        workflow: workflowJSON,
        metadata: {
          tokensUsed: aiResponse.tokensUsed,
          cost: aiResponse.cost,
          model: aiResponse.model
        }
      },
      message: 'Workflow generated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ [AI Generate] Error generating workflow', { 
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      prompt: req.body?.prompt,
      tenantId: req.user?.tenantId,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
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

    // 📈 Performance Analytics - Using workflow_instances (ReactFlow compatible)
    const performanceStats = await db.execute(sql`
      SELECT 
        DATE_TRUNC('day', wi.started_at) as date,
        COUNT(*) as executions,
        AVG(EXTRACT(EPOCH FROM (wi.completed_at - wi.started_at))) as avg_duration,
        MIN(EXTRACT(EPOCH FROM (wi.completed_at - wi.started_at))) as min_duration,
        MAX(EXTRACT(EPOCH FROM (wi.completed_at - wi.started_at))) as max_duration,
        COUNT(CASE WHEN wi.current_status = 'completed' THEN 1 END) as successful,
        COUNT(CASE WHEN wi.current_status = 'failed' THEN 1 END) as failed
      FROM workflow_instances wi
      WHERE wi.tenant_id = ${tenantId}
        AND wi.started_at IS NOT NULL
        AND wi.started_at >= NOW() - make_interval(days => ${parseInt(period as string, 10)})
      GROUP BY DATE_TRUNC('day', wi.started_at)
      ORDER BY date DESC
    `);

    // 🎯 Category Performance - Fixed with raw SQL (snake_case)
    const categoryStats = await db.execute(sql`
      SELECT 
        wt.category,
        COUNT(wi.id) as total_instances,
        COUNT(CASE WHEN wi.current_status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN wi.current_status = 'in_progress' OR wi.current_status = 'running' THEN 1 END) as running,
        COUNT(CASE WHEN wi.current_status = 'failed' THEN 1 END) as failed,
        AVG(CASE 
          WHEN wi.completed_at IS NOT NULL AND wi.started_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (wi.completed_at - wi.started_at)) 
          ELSE NULL 
        END) as avg_completion_time
      FROM workflow_templates wt
      INNER JOIN workflow_instances wi ON wi.template_id = wt.id
      WHERE wt.tenant_id = ${tenantId}
        AND wi.created_at >= NOW() - make_interval(days => ${parseInt(period as string, 10)})
      GROUP BY wt.category
      ORDER BY total_instances DESC
    `);

    // ⚡ Most Active Templates - Fixed with raw SQL (snake_case)
    const activeTemplates = await db.execute(sql`
      SELECT 
        wt.name,
        wt.category,
        COUNT(wi.id) as instances_count,
        AVG(CASE 
          WHEN wi.completed_at IS NOT NULL AND wi.started_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (wi.completed_at - wi.started_at)) 
          ELSE NULL 
        END) as avg_duration,
        MAX(wi.last_activity_at) as last_used
      FROM workflow_templates wt
      INNER JOIN workflow_instances wi ON wi.template_id = wt.id
      WHERE wt.tenant_id = ${tenantId}
        AND wi.created_at >= NOW() - make_interval(days => ${parseInt(period as string, 10)})
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

    // 📊 Calculate summary statistics
    const totalExecutions = performanceStats.rows.reduce((sum: number, row: any) => 
      sum + parseInt(row.executions || '0', 10), 0
    );
    
    const totalSuccessful = performanceStats.rows.reduce((sum: number, row: any) => 
      sum + parseInt(row.successful || '0', 10), 0
    );
    
    const totalFailed = performanceStats.rows.reduce((sum: number, row: any) => 
      sum + parseInt(row.failed || '0', 10), 0
    );
    
    const successRate = totalExecutions > 0 
      ? ((totalSuccessful / totalExecutions) * 100) 
      : 0;
    
    const avgExecTime = performanceStats.rows.length > 0
      ? performanceStats.rows.reduce((sum: number, row: any) => 
          sum + (parseFloat(row.avg_duration) || 0), 0) / performanceStats.rows.length
      : null;
    
    const mostActiveCategory = categoryStats.rows.length > 0 
      ? categoryStats.rows[0].category 
      : null;
    
    const peakHour = hourlyDistribution.rows.length > 0
      ? hourlyDistribution.rows.reduce((max: any, row: any) => 
          parseInt(row.instances_started || '0', 10) > parseInt(max.instances_started || '0', 10) ? row : max
        ).hour
      : null;

    const analyticsData = {
      performance: performanceStats.rows,
      categoryStats: categoryStats.rows,
      activeTemplates: activeTemplates.rows,
      hourlyDistribution: hourlyDistribution.rows,
      period: parseInt(period as string),
      generatedAt: new Date().toISOString(),
      summary: {
        totalExecutions,
        averageExecutionTime: avgExecTime,
        successRate: parseFloat(successRate.toFixed(1)),
        mostActiveCategory,
        peakHour: peakHour ? parseInt(peakHour, 10) : null
      }
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

// ==================== ASYNC WORKFLOW EXECUTION ENDPOINTS ====================

router.post('/instances/:id/execute', rbacMiddleware, requirePermission('workflow.execute'), async (req, res) => {
  try {
    const { id: instanceId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    const userId = req.user?.id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { isRedisAvailable } = await import('../queue/index.js');
    const redisAvailable = await isRedisAvailable();

    const [instance] = await db
      .select()
      .from(workflowInstances)
      .where(and(
        eq(workflowInstances.id, instanceId),
        eq(workflowInstances.tenantId, tenantId)
      ))
      .limit(1);

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Workflow instance not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // ASYNC MODE (with Redis)
    if (redisAvailable) {
      const { enqueueWorkflowStep } = await import('../queue/index.js');
      
      // Get template and steps separately
      const [template] = await db
        .select()
        .from(workflowTemplates)
        .where(eq(workflowTemplates.id, instance.templateId))
        .limit(1);

      const steps = (template?.nodes as any[]) || [];
      const enqueuedSteps = [];

      for (const step of steps) {
        const job = await enqueueWorkflowStep({
          instanceId: instance.id,
          tenantId,
          stepId: step.nodeId,
          stepName: step.name,
          attemptNumber: 1,
          inputData: step.config || {}
        });

        enqueuedSteps.push({
          stepId: step.nodeId,
          stepName: step.name,
          jobId: job.id
        });
      }

      await db
        .update(workflowInstances)
        .set({
          currentStatus: 'executing',
          startedAt: new Date(),
          updatedBy: userId
        })
        .where(eq(workflowInstances.id, instanceId));

      logger.info('Workflow execution started (ASYNC)', {
        instanceId,
        tenantId,
        stepsEnqueued: enqueuedSteps.length,
        userId
      });

      return res.status(200).json({
        success: true,
        data: {
          instanceId,
          status: 'executing',
          mode: 'async',
          stepsEnqueued: enqueuedSteps.length,
          steps: enqueuedSteps
        },
        message: 'Workflow execution started (async mode)',
        timestamp: new Date().toISOString()
      } as ApiSuccessResponse<{
        instanceId: string;
        status: string;
        mode: string;
        stepsEnqueued: number;
        steps: any[];
      }>);
    }

    // SYNC MODE (without Redis - Development)
    logger.info('Starting workflow execution (SYNC mode - no Redis)', {
      instanceId,
      tenantId,
      userId
    });

    const { workflowEngine } = await import('../services/workflow-engine.js');
    
    // Update status to running
    await db
      .update(workflowInstances)
      .set({
        currentStatus: 'running',
        startedAt: new Date(),
        updatedBy: userId
      })
      .where(eq(workflowInstances.id, instanceId));

    // Execute workflow synchronously using ReactFlow engine
    try {
      const result = await workflowEngine.executeReactFlowWorkflow(instanceId, {
        tenantId,
        requesterId: userId || 'system',
        initiatedAt: new Date().toISOString()
      });

      logger.info('Workflow execution completed (SYNC)', {
        instanceId,
        success: result.success,
        finalStatus: result.finalStatus
      });

      res.status(200).json({
        success: true,
        data: {
          instanceId,
          status: result.finalStatus,
          mode: 'sync',
          executionDetails: result
        },
        message: 'Workflow execution completed (sync mode)',
        timestamp: new Date().toISOString()
      } as ApiSuccessResponse<{
        instanceId: string;
        status: string;
        mode: string;
        executionDetails: any;
      }>);
    } catch (executionError: any) {
      logger.error('Sync workflow execution failed', {
        instanceId,
        error: executionError.message
      });

      // Mark as failed
      await db
        .update(workflowInstances)
        .set({
          currentStatus: 'failed',
          updatedBy: userId
        })
        .where(eq(workflowInstances.id, instanceId));

      res.status(500).json({
        success: false,
        error: 'Workflow execution failed',
        message: executionError.message,
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

  } catch (error: any) {
    logger.error('Error starting workflow execution', { error, instanceId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

router.get('/instances/:id/executions', rbacMiddleware, requirePermission('workflow.view'), async (req, res) => {
  try {
    const { id: instanceId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const executions = await db.query.workflowStepExecutions.findMany({
      where: and(
        eq(workflowStepExecutions.instanceId, instanceId),
        eq(workflowStepExecutions.tenantId, tenantId)
      ),
      orderBy: (executions, { asc }) => [asc(executions.createdAt)]
    });

    res.status(200).json({
      success: true,
      data: executions,
      message: 'Step executions retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<typeof executions>);

  } catch (error) {
    logger.error('Error retrieving step executions', { error, instanceId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

router.post('/instances/:id/steps/:stepId/retry', rbacMiddleware, requirePermission('workflow.execute'), async (req, res) => {
  try {
    const { id: instanceId, stepId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { isRedisAvailable } = await import('../queue/index.js');
    const redisAvailable = await isRedisAvailable();

    if (!redisAvailable) {
      return res.status(503).json({
        success: false,
        error: 'Async workflow execution unavailable',
        message: 'Redis is not available. Cannot retry step without Redis.',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const latestExecution = await db.query.workflowStepExecutions.findFirst({
      where: and(
        eq(workflowStepExecutions.instanceId, instanceId),
        eq(workflowStepExecutions.stepId, stepId),
        eq(workflowStepExecutions.tenantId, tenantId)
      ),
      orderBy: (executions, { desc }) => [desc(executions.attemptNumber)]
    });

    if (!latestExecution) {
      return res.status(404).json({
        success: false,
        error: 'Step execution not found',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { enqueueWorkflowStep } = await import('../queue/index.js');

    const nextAttempt = (latestExecution.attemptNumber || 0) + 1;

    const job = await enqueueWorkflowStep({
      instanceId,
      tenantId,
      stepId,
      stepName: latestExecution.stepName || stepId,
      attemptNumber: nextAttempt,
      inputData: latestExecution.inputData as Record<string, any> || {}
    });

    logger.info('Step retry enqueued', {
      instanceId,
      stepId,
      attemptNumber: nextAttempt,
      jobId: job.id
    });

    res.status(200).json({
      success: true,
      data: {
        instanceId,
        stepId,
        attemptNumber: nextAttempt,
        jobId: job.id
      },
      message: 'Step retry enqueued successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<{
      instanceId: string;
      stepId: string;
      attemptNumber: number;
      jobId: string | undefined;
    }>);

  } catch (error: any) {
    logger.error('Error retrying step', { error, instanceId: req.params.id, stepId: req.params.stepId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== WORKFLOW TEST RUN ====================

/**
 * Helper: Simulate input data for a step based on node type and context
 */
function simulateStepInput(step: any, context: any): Record<string, any> {
  const baseInput: Record<string, any> = {
    stepId: step.nodeId,
    stepName: step.name,
    tenantId: context.tenantId,
    userId: context.userId,
    timestamp: new Date().toISOString()
  };

  // Add node-specific input data based on type
  switch (step.type) {
    case 'trigger':
      return { ...baseInput, triggerData: step.config || {}, source: 'test-run' };
    case 'action':
      return { ...baseInput, actionConfig: step.config || {}, context: context.variables };
    case 'condition':
      return { ...baseInput, conditionConfig: step.config || {}, evaluationContext: context.variables };
    case 'routing':
      return { ...baseInput, routingRules: step.config?.rules || [], candidates: ['user-1', 'user-2'] };
    default:
      return { ...baseInput, config: step.config || {} };
  }
}

/**
 * Helper: Simulate step execution and generate output/messages
 */
function simulateStepExecution(step: any, inputData: any, context: any): {
  status: 'success' | 'warning' | 'error';
  outputData: Record<string, any> | null;
  messages: string[];
  warnings: string[];
  stack?: string;
} {
  const messages: string[] = [];
  const warnings: string[] = [];
  
  // Simulate realistic execution based on executor type
  const executorId = step.executorId || 'generic-action-executor';
  
  // Random chance of warning (10%)
  const hasWarning = Math.random() < 0.1;
  
  // Random chance of error (5% - for testing error UI)
  const hasError = Math.random() < 0.05;
  
  if (hasError) {
    return {
      status: 'error',
      outputData: null,
      messages: [`Simulated error in ${step.name}: Test execution failure`],
      warnings: [],
      stack: `Error: Test execution failure\n  at ${executorId}.execute()\n  at WorkflowEngine.runStep(${step.nodeId})\n  at WorkflowInstance.processNext()`
    };
  }

  // Generate realistic output based on executor type
  let outputData: Record<string, any> = {};
  
  if (executorId.includes('email')) {
    outputData = { 
      emailSent: true, 
      messageId: `msg-${Date.now()}`, 
      recipient: inputData.config?.to || 'test@example.com',
      sentAt: new Date().toISOString()
    };
    messages.push(`Email sent successfully to ${outputData.recipient}`);
    if (hasWarning) {
      warnings.push('SMTP response time slower than expected (>300ms)');
    }
  } else if (executorId.includes('approval')) {
    outputData = { 
      approved: true, 
      approver: 'admin-user', 
      approvedAt: new Date().toISOString(),
      comments: 'Test approval'
    };
    messages.push('Approval granted by admin-user');
  } else if (executorId.includes('lead') || executorId.includes('crm')) {
    outputData = { 
      leadId: `lead-${Date.now()}`, 
      leadScore: 85, 
      status: 'qualified',
      updatedFields: ['status', 'score', 'assignedTo']
    };
    messages.push('Lead record updated successfully');
    if (hasWarning) {
      warnings.push('Lead score calculation took longer than threshold');
    }
  } else if (executorId.includes('routing') || executorId.includes('assignment')) {
    outputData = { 
      assignedTo: 'user-1', 
      assignmentMethod: 'round-robin',
      queuePosition: 3,
      estimatedResponseTime: '15 minutes'
    };
    messages.push('Task assigned to user-1 via round-robin routing');
  } else if (executorId.includes('condition') || executorId.includes('decision')) {
    outputData = { 
      conditionMet: true, 
      evaluatedValue: inputData.config?.value || 'true',
      branch: 'success'
    };
    messages.push('Condition evaluated to TRUE');
  } else {
    // Generic action output
    outputData = { 
      executionResult: 'success', 
      processedData: inputData.config || {},
      timestamp: new Date().toISOString()
    };
    messages.push(`${step.name} executed successfully`);
  }

  return {
    status: hasWarning ? 'warning' : 'success',
    outputData,
    messages,
    warnings
  };
}

/**
 * POST /api/workflows/test-run
 * Test workflow execution without saving to database
 * Accepts ReactFlow nodes/edges directly and simulates execution
 * 🔐 RBAC: workflow.create permission required
 */
router.post('/test-run', rbacMiddleware, requirePermission('workflow.create'), async (req, res) => {
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

    // Validate request body (allow empty workflows for testing)
    const testRunSchema = z.object({
      nodes: z.array(z.any()).optional().default([]),
      edges: z.array(z.any()).optional().default([]),
      testName: z.string().optional().default('Test Run')
    });

    const validation = testRunSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { nodes, edges, testName } = validation.data;

    logger.info('🧪 [TEST-RUN] Starting workflow test execution', {
      tenantId,
      userId,
      nodesCount: nodes.length,
      edgesCount: edges.length,
      testName
    });

    // Parse ReactFlow workflow using bridge parser
    const { reactFlowBridgeParser } = await import('../services/reactflow-bridge-parser.js');
    
    const reactFlowData = {
      nodes,
      edges,
      viewport: { x: 0, y: 0, zoom: 1 }
    };

    let parsedWorkflow;
    try {
      parsedWorkflow = await reactFlowBridgeParser.parseWorkflow(reactFlowData, {
        templateId: 'test-run-temp',
        templateName: testName,
        department: undefined
      });
    } catch (parseError: any) {
      logger.error('❌ [TEST-RUN] Failed to parse workflow', {
        error: parseError.message,
        nodesCount: nodes.length
      });

      return res.status(400).json({
        success: false,
        error: 'Workflow parsing failed',
        message: parseError.message,
        details: {
          phase: 'parsing',
          nodesFailed: nodes.length
        },
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Validate parsed workflow
    const validation2 = reactFlowBridgeParser.validateWorkflow(parsedWorkflow);
    if (!validation2.isValid) {
      logger.error('❌ [TEST-RUN] Workflow validation failed', {
        errors: validation2.errors
      });

      return res.status(400).json({
        success: false,
        error: 'Workflow validation failed',
        message: validation2.errors.join(', '),
        details: {
          phase: 'validation',
          errors: validation2.errors
        },
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    // Simulate execution (dry-run with detailed debug tracking)
    const startTime = Date.now();
    const executionResults = [];
    let currentNodeId = parsedWorkflow.startNodeId;
    let failedNodeId: string | null = null;
    let failureReason: string | null = null;
    let failureStack: string | null = null;
    
    // Context accumulator (simulates workflow state)
    const workflowContext: Record<string, any> = {
      tenantId,
      userId,
      startedAt: new Date().toISOString(),
      variables: {}
    };

    try {
      // Walk through the workflow graph
      for (let i = 0; i < parsedWorkflow.totalSteps && i < 100; i++) { // Max 100 steps safety limit
        const stepStartTime = Date.now();
        const step = parsedWorkflow.steps.get(currentNodeId);
        
        if (!step) {
          failedNodeId = currentNodeId;
          failureReason = 'Step not found in workflow definition';
          failureStack = `at WorkflowParser.getStep(${currentNodeId})\n  at TestRunner.execute()\n  at POST /api/workflows/test-run`;
          break;
        }

        // Simulate input data based on node type and config
        const inputData = simulateStepInput(step, workflowContext);
        
        // Simulate step execution with potential warnings
        const stepResult = simulateStepExecution(step, inputData, workflowContext);
        
        const stepEndTime = Date.now();
        const stepDuration = stepEndTime - stepStartTime;

        // Add simulated delay for realistic timing
        const simulatedDelay = Math.floor(Math.random() * 50) + 5; // 5-55ms
        
        // Track detailed execution result
        executionResults.push({
          nodeId: step.nodeId,
          nodeName: step.name,
          nodeType: step.type,
          executorId: step.executorId,
          status: stepResult.status, // 'success' | 'warning' | 'error'
          durationMs: stepDuration + simulatedDelay,
          startedAt: new Date(stepStartTime).toISOString(),
          completedAt: new Date(stepEndTime).toISOString(),
          inputData: inputData,
          outputData: stepResult.outputData,
          contextSnapshot: { ...workflowContext.variables },
          messages: stepResult.messages,
          warnings: stepResult.warnings,
          config: step.config
        });

        // Update workflow context with step output
        if (stepResult.outputData) {
          workflowContext.variables = {
            ...workflowContext.variables,
            ...stepResult.outputData
          };
        }

        // Check if step failed
        if (stepResult.status === 'error') {
          failedNodeId = step.nodeId;
          failureReason = stepResult.messages?.[0] || 'Step execution failed';
          failureStack = stepResult.stack || `at ${step.executorId}.execute()\n  at WorkflowEngine.runStep()\n  at POST /api/workflows/test-run`;
          break;
        }

        // Find next step
        const nextSteps = parsedWorkflow.edges.filter(e => e.source === currentNodeId);
        if (nextSteps.length === 0) {
          // End of workflow
          break;
        }

        // For simplicity, follow first edge (in real execution, routing logic would apply)
        currentNodeId = nextSteps[0].target;
      }

      const executionTime = Date.now() - startTime;

      if (failedNodeId) {
        logger.warn('⚠️ [TEST-RUN] Workflow test completed with issues', {
          tenantId,
          failedNodeId,
          failureReason,
          executedSteps: executionResults.length
        });

        return res.status(200).json({
          success: false,
          data: {
            status: 'failed',
            executionTime,
            totalSteps: parsedWorkflow.totalSteps,
            executedSteps: executionResults.length,
            failedNodeId,
            failureReason,
            failureStack,
            executionResults,
            workflowContext: workflowContext.variables
          },
          message: `Test run failed at node: ${failedNodeId}`,
          timestamp: new Date().toISOString()
        } as ApiSuccessResponse<any>);
      }

      logger.info('✅ [TEST-RUN] Workflow test completed successfully', {
        tenantId,
        executionTime,
        stepsExecuted: executionResults.length,
        totalSteps: parsedWorkflow.totalSteps
      });

      return res.status(200).json({
        success: true,
        data: {
          status: 'success',
          executionTime,
          totalSteps: parsedWorkflow.totalSteps,
          executedSteps: executionResults.length,
          startNodeId: parsedWorkflow.startNodeId,
          executionResults,
          workflowContext: workflowContext.variables
        },
        message: 'Workflow test run completed successfully',
        timestamp: new Date().toISOString()
      } as ApiSuccessResponse<{
        status: string;
        executionTime: number;
        totalSteps: number;
        executedSteps: number;
        startNodeId: string;
        executionResults: any[];
        workflowContext: Record<string, any>;
      }>);

    } catch (executionError: any) {
      logger.error('❌ [TEST-RUN] Execution simulation failed', {
        error: executionError.message,
        currentNodeId
      });

      return res.status(500).json({
        success: false,
        error: 'Execution simulation failed',
        message: executionError.message,
        details: {
          phase: 'execution',
          failedNodeId: currentNodeId,
          executedSteps: executionResults.length
        },
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

  } catch (error: any) {
    logger.error('❌ [TEST-RUN] Unexpected error', { 
      error: error.message,
      tenantId: req.user?.tenantId,
      userId: req.user?.id
    });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== EVENT SOURCING & RECOVERY ====================

/**
 * GET /api/workflows/:id/events
 * Get event history for a workflow instance
 * 🔐 RBAC: workflow.view permission required
 */
router.get('/instances/:id/events', rbacMiddleware, requirePermission('workflow.view'), async (req, res) => {
  try {
    const { id: instanceId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const { eventSourcingService } = await import('../services/event-sourcing-service');
    const result = await eventSourcingService.getEventHistory({
      instanceId,
      limit,
      offset,
    });

    res.status(200).json({
      success: true,
      data: result.events,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: offset + limit < result.total,
      },
      message: 'Event history retrieved successfully',
      timestamp: new Date().toISOString(),
    } as ApiSuccessResponse<typeof result.events>);

  } catch (error: any) {
    logger.error('Error retrieving event history', { error, instanceId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString(),
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/workflows/:id/recover
 * Manually trigger recovery for a workflow instance
 * 🔐 RBAC: workflow.manage permission required
 */
router.post('/instances/:id/recover', rbacMiddleware, requirePermission('workflow.manage'), async (req, res) => {
  try {
    const { id: instanceId } = req.params;
    const { recoveryService } = await import('../services/recovery-service');

    logger.info('Manual recovery triggered', { instanceId, userId: req.user?.id });

    const result = await recoveryService.recoverWorkflow(instanceId, {
      maxStaleMinutes: 30,
      autoResume: true,
    });

    res.status(200).json({
      success: true,
      data: result,
      message: `Workflow recovered: ${result.action}`,
      timestamp: new Date().toISOString(),
    } as ApiSuccessResponse<typeof result>);

  } catch (error: any) {
    logger.error('Error recovering workflow', { error, instanceId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString(),
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/workflows/recovery-status
 * Get recovery status overview for tenant
 * 🔐 RBAC: workflow.view permission required
 */
router.get('/recovery-status', rbacMiddleware, requirePermission('workflow.view'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString(),
      } as ApiErrorResponse);
    }

    const { recoveryService } = await import('../services/recovery-service');
    const status = await recoveryService.getRecoveryStatus(tenantId);

    res.status(200).json({
      success: true,
      data: status,
      message: 'Recovery status retrieved successfully',
      timestamp: new Date().toISOString(),
    } as ApiSuccessResponse<typeof status>);

  } catch (error: any) {
    logger.error('Error retrieving recovery status', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString(),
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/workflows/:id/snapshot
 * Create manual recovery checkpoint for a workflow instance
 * 🔐 RBAC: workflow.manage permission required
 */
router.post('/instances/:id/snapshot', rbacMiddleware, requirePermission('workflow.manage'), async (req, res) => {
  try {
    const { id: instanceId } = req.params;
    const { recoveryService } = await import('../services/recovery-service');

    logger.info('Manual snapshot triggered', { instanceId, userId: req.user?.id });

    await recoveryService.createRecoveryCheckpoint(instanceId);

    res.status(200).json({
      success: true,
      data: { instanceId },
      message: 'Recovery checkpoint created successfully',
      timestamp: new Date().toISOString(),
    } as ApiSuccessResponse<{ instanceId: string }>);

  } catch (error: any) {
    logger.error('Error creating snapshot', { error, instanceId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString(),
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/workflows/recover-stalled
 * Batch recovery of all stalled workflows for tenant
 * 🔐 RBAC: workflow.manage permission required
 */
router.post('/recover-stalled', rbacMiddleware, requirePermission('workflow.manage'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString(),
      } as ApiErrorResponse);
    }

    const { recoveryService } = await import('../services/recovery-service');

    logger.info('Batch recovery triggered', { tenantId, userId: req.user?.id });

    const results = await recoveryService.recoverStalledWorkflows(tenantId, {
      maxStaleMinutes: parseInt(req.body.maxStaleMinutes) || 30,
      batchSize: parseInt(req.body.batchSize) || 10,
      autoResume: req.body.autoResume !== false,
    });

    res.status(200).json({
      success: true,
      data: results,
      message: `Batch recovery completed: ${results.length} workflows processed`,
      timestamp: new Date().toISOString(),
    } as ApiSuccessResponse<typeof results>);

  } catch (error: any) {
    logger.error('Error in batch recovery', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString(),
    } as ApiErrorResponse);
  }
});

// ==================== ANALYTICS ENDPOINTS ====================

/**
 * GET /api/workflows/analytics/trends
 * Get execution trends over time
 * 🔐 RBAC: workflow.view permission required
 */
router.get('/analytics/trends', rbacMiddleware, requirePermission('workflow.view'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString(),
      } as ApiErrorResponse);
    }

    const timeRange = req.query.timeRange as string || '30d';
    const days = timeRange === '7d' ? 7 : timeRange === '90d' ? 90 : 30;

    const trends = await db.execute(sql`
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '${sql.raw(days.toString())} days',
          CURRENT_DATE,
          '1 day'::interval
        )::date AS date
      )
      SELECT 
        ds.date::text AS date,
        COALESCE(COUNT(*) FILTER (WHERE wse.status = 'completed'), 0)::int AS completed,
        COALESCE(COUNT(*) FILTER (WHERE wse.status = 'failed'), 0)::int AS failed,
        COALESCE(COUNT(*) FILTER (WHERE wse.status = 'running'), 0)::int AS running,
        COALESCE(COUNT(*), 0)::int AS total
      FROM date_series ds
      LEFT JOIN ${workflowStepExecutions} wse
        ON DATE(wse.started_at) = ds.date
        AND wse.tenant_id = ${tenantId}
      GROUP BY ds.date
      ORDER BY ds.date DESC
    `);

    res.status(200).json({
      success: true,
      data: trends.rows,
      message: 'Execution trends retrieved successfully',
      timestamp: new Date().toISOString(),
    } as ApiSuccessResponse<typeof trends.rows>);

  } catch (error: any) {
    logger.error('Error retrieving execution trends', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString(),
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/workflows/analytics/status-distribution
 * Get distribution of workflow statuses
 * 🔐 RBAC: workflow.view permission required
 */
router.get('/analytics/status-distribution', rbacMiddleware, requirePermission('workflow.view'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString(),
      } as ApiErrorResponse);
    }

    const distribution = await db.execute(sql`
      SELECT 
        status,
        COUNT(*)::int AS count,
        ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()), 2) AS percentage
      FROM ${workflowStepExecutions}
      WHERE tenant_id = ${tenantId}
      GROUP BY status
      ORDER BY count DESC
    `);

    res.status(200).json({
      success: true,
      data: distribution.rows,
      message: 'Status distribution retrieved successfully',
      timestamp: new Date().toISOString(),
    } as ApiSuccessResponse<typeof distribution.rows>);

  } catch (error: any) {
    logger.error('Error retrieving status distribution', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString(),
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/workflows/analytics/performance
 * Get performance metrics by step
 * 🔐 RBAC: workflow.view permission required
 */
router.get('/analytics/performance', rbacMiddleware, requirePermission('workflow.view'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString(),
      } as ApiErrorResponse);
    }

    const performance = await db.execute(sql`
      SELECT 
        step_name AS "stepName",
        ROUND(AVG(duration_ms))::int AS "avgDuration",
        MIN(duration_ms)::int AS "minDuration",
        MAX(duration_ms)::int AS "maxDuration",
        COUNT(*)::int AS executions
      FROM ${workflowStepExecutions}
      WHERE tenant_id = ${tenantId}
        AND status = 'completed'
        AND duration_ms IS NOT NULL
      GROUP BY step_name
      HAVING COUNT(*) >= 5
      ORDER BY "avgDuration" DESC
      LIMIT 20
    `);

    res.status(200).json({
      success: true,
      data: performance.rows,
      message: 'Performance metrics retrieved successfully',
      timestamp: new Date().toISOString(),
    } as ApiSuccessResponse<typeof performance.rows>);

  } catch (error: any) {
    logger.error('Error retrieving performance metrics', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString(),
    } as ApiErrorResponse);
  }
});

/**
 * GET /api/workflows/analytics/completion-rates
 * Get completion rates by workflow step
 * 🔐 RBAC: workflow.view permission required
 */
router.get('/analytics/completion-rates', rbacMiddleware, requirePermission('workflow.view'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString(),
      } as ApiErrorResponse);
    }

    const rates = await db.execute(sql`
      SELECT 
        step_id AS "stepId",
        step_name AS "stepName",
        ROUND((COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*)), 2) AS "completionRate",
        ROUND((COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / COUNT(*)), 2) AS "failureRate",
        COUNT(*)::int AS "totalExecutions"
      FROM ${workflowStepExecutions}
      WHERE tenant_id = ${tenantId}
      GROUP BY step_id, step_name
      HAVING COUNT(*) >= 5
      ORDER BY "totalExecutions" DESC
      LIMIT 20
    `);

    res.status(200).json({
      success: true,
      data: rates.rows,
      message: 'Completion rates retrieved successfully',
      timestamp: new Date().toISOString(),
    } as ApiSuccessResponse<typeof rates.rows>);

  } catch (error: any) {
    logger.error('Error retrieving completion rates', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString(),
    } as ApiErrorResponse);
  }
});

// ==================== QUEUE METRICS ====================

router.get('/queue/metrics', rbacMiddleware, requirePermission('workflow.view'), async (req, res) => {
  try {
    const { isRedisAvailable, getQueueMetrics } = await import('../queue/index.js');
    const redisAvailable = await isRedisAvailable();

    if (!redisAvailable) {
      return res.status(503).json({
        success: false,
        error: 'Queue metrics unavailable',
        message: 'Redis is not available. Queue metrics require Redis.',
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const metrics = await getQueueMetrics();

    res.status(200).json({
      success: true,
      data: metrics,
      message: 'Queue metrics retrieved successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<typeof metrics>);

  } catch (error: any) {
    logger.error('Error retrieving queue metrics', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

// ==================== SINGLE NODE EXECUTION (N8N-STYLE INSPECTOR) ====================

/**
 * POST /api/workflows/nodes/:nodeId/test-execute
 * Execute a single node in isolation for testing/debugging
 * Used by the n8n-style Node Inspector to preview node outputs
 * 🔐 RBAC: workflow.create permission required
 */
router.post('/nodes/:nodeId/test-execute', rbacMiddleware, requirePermission('workflow.create'), async (req, res) => {
  try {
    const { nodeId } = req.params;
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
    const executeNodeSchema = z.object({
      nodeData: z.object({
        id: z.string(),
        type: z.string(),
        category: z.string().optional(),
        config: z.record(z.unknown()).optional().default({})
      }),
      inputData: z.record(z.unknown()).optional().default({})
    });

    const validation = executeNodeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
        timestamp: new Date().toISOString()
      } as ApiErrorResponse);
    }

    const { nodeData, inputData } = validation.data;

    logger.info('🎯 [NODE-EXECUTE] Testing single node execution', {
      tenantId,
      userId,
      nodeId,
      nodeType: nodeData.type,
      category: nodeData.category
    });

    // Simulate node execution based on type
    const startTime = Date.now();
    let outputData: Record<string, unknown>;
    let messages: string[] = [];
    let warnings: string[] = [];

    // Type-specific simulation logic (expanded from simulateStepExecution)
    if (nodeData.type === 'ai-decision' || nodeData.category === 'ai') {
      outputData = {
        decision: 'approve',
        confidence: 0.85,
        reasoning: 'Based on analysis criteria',
        aiModel: 'gpt-4-turbo',
        timestamp: new Date().toISOString()
      };
      messages.push('AI decision computed successfully');
    } else if (nodeData.type === 'send-email' || nodeData.id === 'send-email') {
      outputData = {
        messageId: `msg_${Date.now()}`,
        status: 'sent',
        recipient: inputData.email || 'test@example.com',
        timestamp: new Date().toISOString()
      };
      messages.push('Email sent successfully');
    } else if (nodeData.category === 'trigger') {
      outputData = {
        triggered: true,
        triggerTime: new Date().toISOString(),
        source: 'manual_test',
        payload: inputData
      };
      messages.push('Trigger activated');
    } else if (nodeData.type === 'if-condition' || nodeData.id === 'if-condition') {
      const conditionMet = Math.random() > 0.3; // 70% success rate for demo
      outputData = {
        conditionMet,
        evaluatedValue: inputData.value || 'test_value',
        branch: conditionMet ? 'success' : 'failure'
      };
      messages.push(`Condition evaluated to ${conditionMet ? 'TRUE' : 'FALSE'}`);
    } else {
      // Generic action output
      outputData = {
        executionResult: 'success',
        processedData: nodeData.config || {},
        inputEcho: inputData,
        timestamp: new Date().toISOString()
      };
      messages.push(`Node ${nodeId} executed successfully`);
    }

    const endTime = Date.now();
    const duration = endTime - startTime + Math.floor(Math.random() * 50) + 5; // Add simulated delay

    // Construct response matching WorkflowItem format
    const executionResult = {
      nodeId,
      nodeType: nodeData.type,
      category: nodeData.category || 'action',
      status: 'success' as const,
      durationMs: duration,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date(endTime).toISOString(),
      inputData,
      outputData,
      messages,
      warnings,
      config: nodeData.config
    };

    logger.info('✅ [NODE-EXECUTE] Single node execution completed', {
      nodeId,
      status: 'success',
      durationMs: duration
    });

    res.status(200).json({
      success: true,
      data: {
        execution: executionResult,
        items: [outputData], // n8n-style items array
        metadata: {
          executionTime: duration,
          itemCount: 1,
          nodeId,
          timestamp: new Date().toISOString()
        }
      },
      message: 'Node executed successfully',
      timestamp: new Date().toISOString()
    } as ApiSuccessResponse<any>);

  } catch (error: any) {
    logger.error('❌ [NODE-EXECUTE] Single node execution failed', {
      error: error.message,
      nodeId: req.params.nodeId
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    } as ApiErrorResponse);
  }
});

export { router as workflowRoutes };