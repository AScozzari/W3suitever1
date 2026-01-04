import { Router, Request, Response } from 'express';
import { eq, and, sql, asc, desc, isNull, inArray, exists } from 'drizzle-orm';
import { db, setTenantContext } from '../core/db';
import { requirePermission } from '../middleware/tenant';
import { logger } from '../core/logger';
import { notificationService } from '../core/notification-service';
import { 
  organizationalStructure, 
  approvalWorkflows, 
  universalRequests,
  servicePermissions,
  users, 
  tenants,
  userAssignments,
  userTeams,
  insertOrganizationalStructureSchema,
  insertApprovalWorkflowSchema,
  insertUniversalRequestSchema,
  insertServicePermissionSchema,
  // Workflow tables
  workflowActions,
  workflowTriggers,
  workflowTemplates,
  workflowSteps,
  teams,
  teamWorkflowAssignments,
  userWorkflowAssignments,
  workflowInstances,
  workflowExecutions,
  insertWorkflowActionSchema,
  insertWorkflowTriggerSchema,
  insertWorkflowTemplateSchema,
  insertTeamSchema,
  insertTeamWorkflowAssignmentSchema,
  insertUserWorkflowAssignmentSchema,
  insertWorkflowInstanceSchema,
  // Team enrichment tables
  teamDepartments,
  departments,
  teamObservers,
  // Action configurations
  actionConfigurations
} from '../db/schema/w3suite';
import { z } from 'zod';
import { workflowEngine } from '../services/workflow-engine';
import { detectWorkflowRoutingNodes } from '../utils/workflow-routing-utils';
import { DEPARTMENT_ACTION_TAGS, ALL_DEPARTMENTS as ACTION_TAG_DEPARTMENTS } from '../lib/action-tags';
import { ALL_DEPARTMENT_CODES, departmentEnum } from '../core/constants/departments';

const router = Router();

// ==================== ORGANIZATIONAL STRUCTURE ENDPOINTS ====================

// GET /api/organizational-structure - Get full hierarchy tree for tenant
router.get('/organizational-structure', requirePermission('hierarchy.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Get all organizational structure records
    const orgData = await db
      .select({
        id: organizationalStructure.id,
        userId: organizationalStructure.userId,
        parentId: organizationalStructure.parentId,
        depth: organizationalStructure.depth,
        pathTree: organizationalStructure.pathTree,
        organizationalUnit: organizationalStructure.organizationalUnit,
        unitType: organizationalStructure.unitType,
        delegates: organizationalStructure.delegates,
        permissions: organizationalStructure.permissions,
        validFrom: organizationalStructure.validFrom,
        validTo: organizationalStructure.validTo,
        // Join user data
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userEmail: users.email,
        userRole: users.role,
        avatarObjectPath: users.avatarObjectPath,
      })
      .from(organizationalStructure)
      .leftJoin(users, eq(organizationalStructure.userId, users.id))
      .where(
        and(
          eq(organizationalStructure.tenantId, tenantId),
          isNull(organizationalStructure.validTo)
        )
      )
      .orderBy(asc(organizationalStructure.depth));

    // Build hierarchy tree
    const hierarchyMap = new Map();
    const rootNodes: any[] = [];

    // First pass: create all nodes with avatar URLs
    orgData.forEach(item => {
      let avatarUrl: string | null = null;
      if (item.avatarObjectPath) {
        const filename = item.avatarObjectPath.split('/').pop();
        avatarUrl = `/api/storage/avatars/serve/${tenantId}/${filename}`;
      }
      hierarchyMap.set(item.userId, {
        ...item,
        userProfileImage: avatarUrl,
        avatarUrl,
        children: []
      });
    });

    // Second pass: build tree structure
    orgData.forEach(item => {
      if (!item.parentId) {
        rootNodes.push(hierarchyMap.get(item.userId));
      } else {
        const parent = hierarchyMap.get(item.parentId);
        if (parent) {
          parent.children.push(hierarchyMap.get(item.userId));
        }
      }
    });

    res.json({
      success: true,
      hierarchy: rootNodes,
      totalNodes: orgData.length
    });
  } catch (error) {
    console.error('Error fetching organizational structure:', error);
    res.status(500).json({ error: 'Failed to fetch organizational structure' });
  }
});

// POST /api/organizational-structure - Create or update hierarchy node
router.post('/organizational-structure', requirePermission('hierarchy.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const validatedData = insertOrganizationalStructureSchema.parse({
      ...req.body,
      tenantId
    });

    // If parentId is provided, calculate depth and path
    if (validatedData.parentId) {
      const parent = await db
        .select()
        .from(organizationalStructure)
        .where(
          and(
            eq(organizationalStructure.userId, validatedData.parentId),
            eq(organizationalStructure.tenantId, tenantId),
            isNull(organizationalStructure.validTo)
          )
        )
        .limit(1);

      if (parent.length > 0) {
        validatedData.depth = parent[0].depth + 1;
        validatedData.pathTree = [...(parent[0].pathTree || []), validatedData.userId];
      }
    } else {
      validatedData.depth = 0;
      validatedData.pathTree = [validatedData.userId];
    }

    // Check if user already has active position
    const existing = await db
      .select()
      .from(organizationalStructure)
      .where(
        and(
          eq(organizationalStructure.userId, validatedData.userId),
          eq(organizationalStructure.tenantId, tenantId),
          isNull(organizationalStructure.validTo)
        )
      );

    if (existing.length > 0) {
      // Invalidate old position
      await db
        .update(organizationalStructure)
        .set({ validTo: new Date() })
        .where(eq(organizationalStructure.id, existing[0].id));
    }

    // Create new position
    const [newRecord] = await db
      .insert(organizationalStructure)
      .values(validatedData)
      .returning();

    res.json({
      success: true,
      data: newRecord
    });
  } catch (error) {
    console.error('Error creating organizational structure:', error);
    res.status(500).json({ error: 'Failed to create organizational structure' });
  }
});

// ==================== APPROVAL WORKFLOW ENDPOINTS ====================

// GET /api/approval-workflows - Get all workflows for tenant
router.get('/approval-workflows', requirePermission('workflows.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const category = req.query.category as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const conditions = [eq(approvalWorkflows.tenantId, tenantId)];
    
    if (category) {
      conditions.push(eq((approvalWorkflows as any).category, category));
    }
    
    const query = db
      .select()
      .from(approvalWorkflows)
      .where(and(...conditions))

    const workflows = await query.orderBy(desc((approvalWorkflows as any).priority));

    // Group workflows by service (using workflowType as fallback for category)
    const groupedWorkflows = workflows.reduce((acc, workflow) => {
      const cat = (workflow as any).category || workflow.workflowType || 'general';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(workflow);
      return acc;
    }, {} as Record<string, typeof workflows>);

    res.json({
      success: true,
      workflows: groupedWorkflows,
      totalWorkflows: workflows.length
    });
  } catch (error) {
    console.error('Error fetching approval workflows:', error);
    res.status(500).json({ error: 'Failed to fetch approval workflows' });
  }
});

// POST /api/approval-workflows - Create or update workflow
router.post('/approval-workflows', requirePermission('workflows.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const validatedData = insertApprovalWorkflowSchema.parse({
      ...req.body,
      tenantId,
      createdBy: userId,
      updatedBy: userId
    });

    // Check if workflow already exists
    const existing = await db
      .select()
      .from(approvalWorkflows)
      .where(
        and(
          eq(approvalWorkflows.tenantId, tenantId),
          eq(approvalWorkflows.serviceName, validatedData.serviceName),
          eq(approvalWorkflows.workflowType, validatedData.workflowType)
        )
      );

    let result;
    if (existing.length > 0) {
      // Update existing workflow
      [result] = await db
        .update(approvalWorkflows)
        .set({
          ...validatedData,
          version: existing[0].version + 1,
          updatedAt: new Date()
        })
        .where(eq(approvalWorkflows.id, existing[0].id))
        .returning();
    } else {
      // Create new workflow
      [result] = await db
        .insert(approvalWorkflows)
        .values(validatedData)
        .returning();
    }

    res.json({
      success: true,
      workflow: result
    });
  } catch (error) {
    console.error('Error saving approval workflow:', error);
    res.status(500).json({ error: 'Failed to save approval workflow' });
  }
});

// ==================== UNIVERSAL REQUESTS ENDPOINTS ====================

// GET /api/universal-requests - Get all requests
router.get('/universal-requests', requirePermission('hr.requests.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.user?.id; // ✅ FIX: Use req.user.id from auth middleware
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const { category, status, requester } = req.query;

    // Build query conditions
    let conditions = [eq(universalRequests.tenantId, tenantId)];
    
    if (category) {
      conditions.push(eq(universalRequests.category, category as string));
    }
    if (status) {
      conditions.push(eq(universalRequests.status, status as any));
    }
    if (requester) {
      conditions.push(eq(universalRequests.requesterId, requester as string));
    }

    const requests = await db
      .select({
        id: universalRequests.id,
        category: universalRequests.category,
        type: universalRequests.type,
        title: universalRequests.title,
        description: universalRequests.description,
        requesterId: universalRequests.requesterId,
        requestData: universalRequests.requestData,
        status: universalRequests.status,
        priority: universalRequests.priority,
        dueDate: universalRequests.dueDate,
        startDate: universalRequests.startDate,
        endDate: universalRequests.endDate,
        createdAt: universalRequests.createdAt,
        // Join requester data
        requesterFirstName: users.firstName,
        requesterLastName: users.lastName,
        requesterEmail: users.email,
      })
      .from(universalRequests)
      .leftJoin(users, eq(universalRequests.requesterId, users.id))
      .where(and(...conditions))
      .orderBy(desc(universalRequests.createdAt))
      .limit(100);

    res.json({
      success: true,
      requests,
      totalRequests: requests.length
    });
  } catch (error) {
    console.error('Error fetching universal requests:', error);
    res.status(500).json({ error: 'Failed to fetch universal requests' });
  }
});

// 🚫 DEPRECATED: POST /api/universal-requests - Use POST /api/workflows/requests instead
// The canonical endpoint for creating requests is in workflows.ts with full workflow automation support
// This endpoint is kept as redirect for backwards compatibility
router.post('/universal-requests', requirePermission('hr.requests.create'), async (req: Request, res: Response) => {
  res.setHeader('Location', '/api/workflows/requests');
  return res.status(301).json({
    error: 'Endpoint deprecated',
    message: 'Please use POST /api/workflows/requests instead. This endpoint provides full workflow automation.',
    redirect: '/api/workflows/requests'
  });
});

// DELETE /api/universal-requests/:id - Delete request (for drafts)
router.delete('/universal-requests/:id', requirePermission('hr.requests.delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.user?.id;
    
    if (!tenantId || !userId) {
      return res.status(400).json({ error: 'Tenant ID and User ID are required' });
    }

    // Check if request exists and belongs to user
    const existingRequest = await db
      .select()
      .from(universalRequests)
      .where(
        and(
          eq(universalRequests.id, id),
          eq(universalRequests.tenantId, tenantId),
          eq(universalRequests.requesterId, userId)
        )
      )
      .limit(1);

    if (existingRequest.length === 0) {
      return res.status(404).json({ error: 'Request not found or access denied' });
    }

    const request = existingRequest[0];

    // Only allow deleting drafts or pending requests
    if (!['draft', 'pending'].includes(request.status)) {
      return res.status(403).json({ error: 'Can only delete draft or pending requests' });
    }

    // Delete the request
    await db
      .delete(universalRequests)
      .where(
        and(
          eq(universalRequests.id, id),
          eq(universalRequests.tenantId, tenantId),
          eq(universalRequests.requesterId, userId)
        )
      );

    res.json({ success: true, message: 'Request deleted successfully' });

  } catch (error) {
    console.error('❌ [DELETE-REQUEST-ERROR] Error deleting request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== SERVICE PERMISSIONS ENDPOINTS ====================

// GET /api/service-permissions - Get permissions for user/role
router.get('/service-permissions', requirePermission('permissions.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { userId, roleId, service } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    let conditions = [eq(servicePermissions.tenantId, tenantId)];
    
    if (userId) {
      conditions.push(eq(servicePermissions.userId, userId as string));
    }
    if (roleId) {
      conditions.push(eq(servicePermissions.roleId, roleId as string));
    }
    if (service) {
      conditions.push(eq((servicePermissions as any).category, service as string));
    }

    const permissions = await db
      .select()
      .from(servicePermissions)
      .where(and(...conditions));

    // Group permissions by service (using serviceName as fallback for category)
    const groupedPermissions = permissions.reduce((acc, perm) => {
      const cat = (perm as any).category || perm.serviceName || 'general';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push({
        resource: perm.resource,
        action: perm.action,
        conditions: perm.conditions
      });
      return acc;
    }, {} as Record<string, any[]>);

    res.json({
      success: true,
      permissions: groupedPermissions
    });
  } catch (error) {
    console.error('Error fetching service permissions:', error);
    res.status(500).json({ error: 'Failed to fetch service permissions' });
  }
});

// ==================== HELPER FUNCTIONS ====================

async function calculateApprovalChain(
  requesterId: string,
  tenantId: string,
  rules: any,
  requestData: any
): Promise<any[]> {
  const approvalChain = [];
  
  // Get requester's hierarchy
  const requesterHierarchy = await db
    .select()
    .from(organizationalStructure)
    .where(
      and(
        eq(organizationalStructure.userId, requesterId),
        eq(organizationalStructure.tenantId, tenantId),
        isNull(organizationalStructure.validTo)
      )
    )
    .limit(1);

  if (requesterHierarchy.length === 0) {
    throw new Error('Requester not found in organizational structure');
  }

  // Process each level in the workflow rules
  for (const level of rules.levels || []) {
    // Evaluate condition
    if (evaluateCondition(level.condition, requestData)) {
      for (const approverRole of level.approvers) {
        let approverId;
        
        if (approverRole === 'direct_manager') {
          approverId = requesterHierarchy[0].parentId;
        } else if (approverRole === 'department_head') {
          // Get department head from hierarchy
          approverId = await getDepartmentHead(requesterId, tenantId);
        } else {
          // Get user with specific role
          approverId = await getUserWithRole(approverRole, tenantId);
        }

        if (approverId) {
          approvalChain.push({
            level: approvalChain.length + 1,
            approverId,
            role: approverRole,
            status: 'pending',
            slaHours: level.slaHours || 24
          });
        }
      }
      break; // Only use first matching rule
    }
  }

  return approvalChain;
}

function evaluateCondition(condition: string, data: any): boolean {
  // Simple condition evaluator (can be expanded)
  // Examples: "amount <= 1000", "days > 10"
  try {
    const parts = condition.split(' ');
    if (parts.length !== 3) return true;
    
    const [field, operator, value] = parts;
    const fieldValue = data[field];
    const compareValue = parseFloat(value);
    
    switch (operator) {
      case '<=': return fieldValue <= compareValue;
      case '>=': return fieldValue >= compareValue;
      case '<': return fieldValue < compareValue;
      case '>': return fieldValue > compareValue;
      case '==': return fieldValue == compareValue;
      default: return true;
    }
  } catch {
    return true;
  }
}

async function getDepartmentHead(userId: string, tenantId: string): Promise<string | null> {
  // Walk up the hierarchy to find department head
  const result = await db.execute(sql`
    WITH RECURSIVE hierarchy AS (
      SELECT user_id, parent_id, unit_type, depth
      FROM w3suite.organizational_structure
      WHERE user_id = ${userId} 
        AND tenant_id = ${tenantId}
        AND valid_to IS NULL
      
      UNION ALL
      
      SELECT os.user_id, os.parent_id, os.unit_type, os.depth
      FROM w3suite.organizational_structure os
      JOIN hierarchy h ON os.user_id = h.parent_id
      WHERE os.tenant_id = ${tenantId}
        AND os.valid_to IS NULL
    )
    SELECT user_id FROM hierarchy 
    WHERE unit_type = 'department'
    LIMIT 1
  `);
  
  return result.rows.length > 0 ? (result.rows[0] as any).user_id as string : null;
}

async function getUserWithRole(role: string, tenantId: string): Promise<string | null> {
  // Find user with specific role
  const result = await db
    .select({ userId: users.id })
    .from(users)
    .where(
      and(
        eq(users.tenantId, tenantId),
        eq(users.role, role)
      )
    )
    .limit(1);
  
  return result.length > 0 ? result[0].userId : null;
}

function calculateDueDate(rules: any): Date {
  const maxSla = Math.max(...(rules.levels || []).map((l: any) => l.slaHours || 24));
  const dueDate = new Date();
  dueDate.setHours(dueDate.getHours() + maxSla);
  return dueDate;
}

// ==================== WORKFLOW MANAGEMENT ENDPOINTS ====================

// NOTE: POST/PATCH/DELETE /api/teams endpoints consolidated in TEAMS ENDPOINTS section (line ~1050)
// Single source of truth with teams.write permission and workflowAssignments sync

// POST /api/workflow-templates - Create workflow template
router.post('/workflow-templates', requirePermission('workflow.create'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = (req as any).user?.id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const templateData = {
      ...req.body,
      tenantId,
      createdBy: userId,
      updatedBy: userId
    };

    const validated = insertWorkflowTemplateSchema.parse(templateData);
    
    const result = await db
      .insert(workflowTemplates)
      .values(validated)
      .returning();

    res.json(result[0]);
  } catch (error) {
    console.error('Error creating workflow template:', error);
    res.status(500).json({ error: 'Failed to create workflow template' });
  }
});


// GET /api/workflow-instances - Get workflow instances
router.get('/workflow-instances', requirePermission('workflow.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const status = req.query.status as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const conditions = [eq(workflowInstances.tenantId, tenantId)];
    if (status && status !== 'all') {
      conditions.push(eq(workflowInstances.currentStatus, status));
    }

    const result = await db
      .select()
      .from(workflowInstances)
      .where(and(...conditions))
      .orderBy(desc(workflowInstances.createdAt));

    res.json(result);
  } catch (error) {
    console.error('Error fetching workflow instances:', error);
    res.status(500).json({ error: 'Failed to fetch workflow instances' });
  }
});

// POST /api/workflow-instances - Create workflow instance
router.post('/workflow-instances', requirePermission('workflow.create'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = (req as any).user?.id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const instanceData = {
      ...req.body,
      tenantId,
      requesterId: userId,
      currentStatus: 'initialized',
      instanceData: req.body.instanceData || {}
    };

    const validated = insertWorkflowInstanceSchema.parse(instanceData);
    
    const result = await db
      .insert(workflowInstances)
      .values(validated)
      .returning();

    res.json(result[0]);
  } catch (error) {
    console.error('Error creating workflow instance:', error);
    res.status(500).json({ error: 'Failed to create workflow instance' });
  }
});

// GET /api/workflow-actions - Get workflow actions
router.get('/workflow-actions', requirePermission('workflow.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const category = req.query.category as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const conditions = [
      eq(workflowActions.tenantId, tenantId),
      eq(workflowActions.isActive, true)
    ];
    
    if (category) {
      conditions.push(eq(workflowActions.category, category));
    }

    const result = await db
      .select()
      .from(workflowActions)
      .where(and(...conditions))
      .orderBy(asc(workflowActions.priority));

    res.json(result);
  } catch (error) {
    console.error('Error fetching workflow actions:', error);
    res.status(500).json({ error: 'Failed to fetch workflow actions' });
  }
});

// GET /api/workflow-triggers - Get workflow triggers
router.get('/workflow-triggers', requirePermission('workflow.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const category = req.query.category as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const conditions = [
      eq(workflowTriggers.tenantId, tenantId),
      eq(workflowTriggers.isActive, true)
    ];
    
    if (category) {
      conditions.push(eq(workflowTriggers.category, category));
    }

    const result = await db
      .select()
      .from(workflowTriggers)
      .where(and(...conditions))
      .orderBy(asc(workflowTriggers.name));

    res.json(result);
  } catch (error) {
    console.error('Error fetching workflow triggers:', error);
    res.status(500).json({ error: 'Failed to fetch workflow triggers' });
  }
});

// ==================== RBAC PERMISSIONS ENDPOINT ====================

// GET /api/rbac/permissions - Get all available RBAC permissions including workflow actions and triggers
router.get('/rbac/permissions', requirePermission('rbac.permissions.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Import from registry to get ALL system permissions (centinaia)
    const { getAllPermissions, getPermissionDescription } = await import('../core/permissions/registry');
    
    // Get all static permissions from registry (sostituisce lista hardcoded obsoleta)
    const staticPermissions = getAllPermissions();

    // Fetch dynamic workflow actions from database
    const actions = await db
      .select({
        category: workflowActions.category,
        actionId: workflowActions.actionId,
        requiredPermission: workflowActions.requiredPermission
      })
      .from(workflowActions)
      .where(and(
        eq(workflowActions.tenantId, tenantId),
        eq(workflowActions.isActive, true)
      ));

    // Convert workflow actions to permissions
    const actionPermissions = actions.map(action => 
      action.requiredPermission || `workflow.action.${action.category}.${action.actionId}`
    );

    // Combine all permissions and remove duplicates
    const allPermissionsSet = [...new Set([
      ...staticPermissions,
      ...actionPermissions
    ])];

    // Helper to extract category from permission string
    const extractCategory = (permission: string): string => {
      const parts = permission.split('.');
      return parts[0] || 'system';
    };

    // Transform permissions to objects with description and category
    const permissionsWithMetadata = allPermissionsSet.map(permission => ({
      permission,
      description: getPermissionDescription(permission),
      category: extractCategory(permission)
    }));

    res.json({
      success: true,
      permissions: permissionsWithMetadata
    });
  } catch (error) {
    console.error('Error fetching RBAC permissions:', error);
    res.status(500).json({ error: 'Failed to fetch RBAC permissions' });
  }
});

// ==================== TEAMS ENDPOINTS ====================

// GET /api/teams - Get all teams for tenant (with optional type filter)
// Supports workflow.read permission (used by both workflow and teams features)
// 🎯 ENRICHED: Returns memberCount, supervisorNames, and department codes
router.get('/teams', requirePermission('workflow.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const typeFilter = req.query.type as string | undefined; // e.g., "crm,sales"
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Build where conditions
    let whereCondition: any = eq(teams.tenantId, tenantId);
    
    // Apply type filter if provided
    if (typeFilter) {
      const types = typeFilter.split(',').map(t => t.trim());
      whereCondition = and(whereCondition, inArray(teams.teamType, types));
    }

    const allTeams = await db
      .select()
      .from(teams)
      .where(whereCondition)
      .orderBy(asc(teams.name));

    // 🎯 Enrich teams with member count, member IDs, observers, supervisor names, and departments
    const enrichedTeams = await Promise.all(allTeams.map(async (team) => {
      // Get members from user_teams (both count and IDs for edit functionality)
      const membersResult = await db
        .select({ userId: userTeams.userId })
        .from(userTeams)
        .where(eq(userTeams.teamId, team.id));
      const memberCount = membersResult.length;
      const userMembers = membersResult.map(m => m.userId);
      
      // Get observers from team_observers table
      const observersResult = await db
        .select({ userId: teamObservers.userId })
        .from(teamObservers)
        .where(eq(teamObservers.teamId, team.id));
      const observers = observersResult.map(o => o.userId);
      
      // Get primary supervisor name
      let primarySupervisorName = null;
      if (team.primarySupervisorUser) {
        const [supervisor] = await db
          .select({ firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(eq(users.id, team.primarySupervisorUser))
          .limit(1);
        if (supervisor) {
          primarySupervisorName = `${supervisor.firstName || ''} ${supervisor.lastName || ''}`.trim();
        }
      }
      
      // Get secondary supervisor name
      let secondarySupervisorName = null;
      if (team.secondarySupervisorUser) {
        const [supervisor] = await db
          .select({ firstName: users.firstName, lastName: users.lastName })
          .from(users)
          .where(eq(users.id, team.secondarySupervisorUser))
          .limit(1);
        if (supervisor) {
          secondarySupervisorName = `${supervisor.firstName || ''} ${supervisor.lastName || ''}`.trim();
        }
      }
      
      // Get departments from junction table
      const teamDepts = await db
        .select({ 
          departmentId: teamDepartments.departmentId,
          code: departments.code,
          name: departments.name
        })
        .from(teamDepartments)
        .innerJoin(departments, eq(teamDepartments.departmentId, departments.id))
        .where(eq(teamDepartments.teamId, team.id));
      
      return {
        ...team,
        teamType: team.teamType || 'functional',
        memberCount,
        userMembers, // Array of user IDs for edit functionality
        observers, // Array of observer user IDs for edit functionality
        primarySupervisorName,
        secondarySupervisorName,
        departments: teamDepts,
        assignedDepartments: teamDepts.map(d => d.code),
        workflowAssignments: []
      };
    }));

    res.json(enrichedTeams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// 🔒 VALIDATION: Supervisor cannot be a member of the same team
// Now accepts memberUserIds directly (caller provides from user_teams or request body)
function validateSupervisorNotMember(
  memberUserIds: string[],
  primarySupervisorUser: string | null | undefined,
  secondarySupervisorUser: string | null | undefined
): { valid: boolean; error?: string } {
  const members = memberUserIds || [];

  if (primarySupervisorUser && members.includes(primarySupervisorUser)) {
    return {
      valid: false,
      error: 'Il supervisore primario non può essere anche membro dello stesso team'
    };
  }

  if (secondarySupervisorUser && members.includes(secondarySupervisorUser)) {
    return {
      valid: false,
      error: 'Il supervisore secondario non può essere anche membro dello stesso team'
    };
  }

  return { valid: true };
}

// 🔒 VALIDATION: User can only belong to ONE functional team per department
// Temporary/project teams allow multiple memberships per department
// EXCEPTION: A user who is a SUPERVISOR of the new team CAN be a member of another team in the same department
async function validateFunctionalTeamExclusivity(
  tenantId: string,
  teamType: string | null | undefined,
  assignedDepartments: string[] | null | undefined,
  memberUserIds: string[],
  supervisorUserIds: string[],
  excludeTeamId?: string
): Promise<{ valid: boolean; error?: string; conflicts?: { userId: string; department: string; existingTeam: string }[] }> {
  // Only validate for functional teams
  if (teamType !== 'functional') {
    return { valid: true };
  }

  // Skip if no members or departments
  if (!memberUserIds || memberUserIds.length === 0 || !assignedDepartments || assignedDepartments.length === 0) {
    return { valid: true };
  }

  // Exclude supervisors from the exclusivity check (supervisors can be in multiple teams)
  const nonSupervisorMembers = memberUserIds.filter(id => !supervisorUserIds.includes(id));
  
  if (nonSupervisorMembers.length === 0) {
    return { valid: true };
  }

  // Query existing functional teams that overlap with this team's departments
  // Join with user_teams to find conflicting memberships
  const conflictQuery = await db.execute(sql`
    SELECT DISTINCT
      t.id as team_id,
      t.name as team_name,
      t.assigned_departments,
      ut.user_id
    FROM w3suite.teams t
    INNER JOIN w3suite.user_teams ut ON ut.team_id = t.id AND ut.tenant_id = t.tenant_id
    WHERE t.tenant_id = ${tenantId}
      AND t.team_type = 'functional'
      AND t.is_active = true
      ${excludeTeamId ? sql`AND t.id != ${excludeTeamId}` : sql``}
      AND t.assigned_departments::text[] && ${sql`ARRAY[${sql.join(assignedDepartments.map(d => sql`${d}`), sql`, `)}]::text[]`}
      AND ut.user_id = ANY(${sql`ARRAY[${sql.join(nonSupervisorMembers.map(m => sql`${m}`), sql`, `)}]::text[]`})
  `);

  if (conflictQuery.rows.length === 0) {
    return { valid: true };
  }

  // Build detailed conflict list
  const conflicts: { userId: string; department: string; existingTeam: string }[] = [];
  
  for (const row of conflictQuery.rows as any[]) {
    const existingDepts = row.assigned_departments || [];
    const userId = row.user_id;
    
    // Find which departments conflict
    for (const dept of assignedDepartments) {
      if (existingDepts.includes(dept)) {
        conflicts.push({
          userId,
          department: dept,
          existingTeam: row.team_name
        });
      }
    }
  }

  if (conflicts.length > 0) {
    const firstConflict = conflicts[0];
    return {
      valid: false,
      error: `L'utente non può appartenere a più team funzionali per lo stesso dipartimento. Conflitto: l'utente è già membro del team "${firstConflict.existingTeam}" per il dipartimento "${firstConflict.department}"`,
      conflicts
    };
  }

  return { valid: true };
}

// POST /api/teams - Create new team with workflow assignments sync
router.post('/teams', requirePermission('teams.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = (req as any).user?.id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // 🎯 Extract workflowAssignments and members before validation (not part of teams table)
    const { workflowAssignments, members, ...teamData } = req.body;
    
    // Members array from request body (array of user IDs)
    const memberUserIds: string[] = Array.isArray(members) ? members : [];
    
    // Build supervisor list for exclusivity exception
    const supervisorUserIds: string[] = [];
    if (teamData.primarySupervisorUser) supervisorUserIds.push(teamData.primarySupervisorUser);
    if (teamData.secondarySupervisorUser) supervisorUserIds.push(teamData.secondarySupervisorUser);

    // 🔒 VALIDATION: Supervisor cannot be member of same team
    const supervisorValidation = validateSupervisorNotMember(
      memberUserIds,
      teamData.primarySupervisorUser,
      teamData.secondarySupervisorUser
    );
    if (!supervisorValidation.valid) {
      return res.status(400).json({ error: supervisorValidation.error });
    }

    // 🔒 VALIDATION: User can only belong to ONE functional team per department
    const exclusivityValidation = await validateFunctionalTeamExclusivity(
      tenantId,
      teamData.teamType,
      teamData.assignedDepartments,
      memberUserIds,
      supervisorUserIds
    );
    if (!exclusivityValidation.valid) {
      return res.status(400).json({ 
        error: exclusivityValidation.error,
        conflicts: exclusivityValidation.conflicts 
      });
    }

    // 🎯 ENHANCED VALIDATION: Include assignedDepartments in team creation
    const validatedData = insertTeamSchema.parse({
      ...teamData,
      tenantId,
      createdBy: userId || 'system',
      updatedBy: userId || 'system'
    });

    await setTenantContext(tenantId);
    const [newTeam] = await db
      .insert(teams)
      .values(validatedData)
      .returning();
    
    // 🎯 INSERT MEMBERS INTO user_teams TABLE
    if (memberUserIds.length > 0) {
      const userTeamRecords = memberUserIds.map((memberId, index) => ({
        userId: memberId,
        teamId: newTeam.id,
        tenantId,
        isPrimary: index === 0
      }));
      
      await db.insert(userTeams).values(userTeamRecords);
      
      logger.info('✅ Members added to user_teams', {
        teamId: newTeam.id,
        memberCount: memberUserIds.length
      });
    }

    // 🎯 SYNC WORKFLOW ASSIGNMENTS: Save to team_workflow_assignments table
    if (workflowAssignments && Array.isArray(workflowAssignments) && workflowAssignments.length > 0) {
      // Valid department enum values (must match departmentEnum in schema)
      const validDepartments = [...ALL_DEPARTMENT_CODES];
      
      const assignmentsToInsert = workflowAssignments
        .filter((assignment: any) => {
          // Validate department is a valid enum value
          const dept = assignment.department?.toLowerCase();
          if (!dept || !validDepartments.includes(dept)) {
            logger.warn('⚠️ Skipping invalid department in workflow assignment', {
              department: assignment.department,
              validOptions: validDepartments
            });
            return false;
          }
          return true;
        })
        .map((assignment: any) => ({
          tenantId,
          teamId: newTeam.id,
          templateId: assignment.templateId,
          forDepartment: assignment.department.toLowerCase(), // Normalize to lowercase
          autoAssign: assignment.autoAssign ?? true,
          priority: assignment.priority ?? 100,
          isActive: true,
          createdBy: userId || 'system',
          updatedBy: userId || 'system'
        }));

      if (assignmentsToInsert.length > 0) {
        await db
          .insert(teamWorkflowAssignments)
          .values(assignmentsToInsert);

        logger.info('✅ Workflow assignments synced for new team', {
          teamId: newTeam.id,
          assignmentsCount: assignmentsToInsert.length,
          departments: assignmentsToInsert.map((a: any) => a.forDepartment)
        });
      }
    }

    logger.info('Team created with department assignments', { 
      teamId: newTeam.id, 
      teamName: newTeam.name,
      assignedDepartments: newTeam.assignedDepartments,
      workflowAssignmentsCount: workflowAssignments?.length || 0,
      tenantId, 
      userId 
    });

    res.status(201).json(newTeam);
  } catch (error: any) {
    console.error('Error creating team:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid team data', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create team' });
    }
  }
});

// PATCH /api/teams/:id - Update team with workflow assignments sync
router.patch('/teams/:id', requirePermission('teams.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const teamId = req.params.id;
    const userId = (req as any).user?.id;

    logger.info('🔍 [TEAM-PATCH] Request received', {
      teamId,
      tenantId,
      body: JSON.stringify(req.body).substring(0, 500)
    });
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // 🎯 Extract workflowAssignments, members, and observers before update (not part of teams table)
    const { workflowAssignments, members, observers, ...teamData } = req.body;

    await setTenantContext(tenantId);

    // 🔒 VALIDATION: Fetch existing team to merge with updates for proper validation
    const [existingTeam] = await db
      .select()
      .from(teams)
      .where(and(
        eq(teams.id, teamId),
        eq(teams.tenantId, tenantId)
      ));

    if (!existingTeam) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get existing members from user_teams table
    const existingMembers = await db
      .select({ userId: userTeams.userId })
      .from(userTeams)
      .where(and(
        eq(userTeams.teamId, teamId),
        eq(userTeams.tenantId, tenantId)
      ));
    const existingMemberIds = existingMembers.map(m => m.userId);
    
    // Determine member list: use provided members or existing members
    const memberUserIds: string[] = members !== undefined 
      ? (Array.isArray(members) ? members : [])
      : existingMemberIds;

    // Merge existing data with updates for validation
    const mergedData = {
      primarySupervisorUser: teamData.primarySupervisorUser ?? existingTeam.primarySupervisorUser,
      secondarySupervisorUser: teamData.secondarySupervisorUser ?? existingTeam.secondarySupervisorUser,
      teamType: teamData.teamType ?? existingTeam.teamType,
      assignedDepartments: teamData.assignedDepartments ?? existingTeam.assignedDepartments,
    };

    // Build supervisor list for exclusivity exception
    const supervisorUserIds: string[] = [];
    if (mergedData.primarySupervisorUser) supervisorUserIds.push(mergedData.primarySupervisorUser);
    if (mergedData.secondarySupervisorUser) supervisorUserIds.push(mergedData.secondarySupervisorUser);

    // 🔒 VALIDATION: Supervisor cannot be member of same team
    const supervisorValidation = validateSupervisorNotMember(
      memberUserIds,
      mergedData.primarySupervisorUser,
      mergedData.secondarySupervisorUser
    );
    if (!supervisorValidation.valid) {
      return res.status(400).json({ error: supervisorValidation.error });
    }

    // 🔒 VALIDATION: User can only belong to ONE functional team per department
    logger.info('🔍 [TEAM-PATCH] Validating exclusivity', {
      teamId,
      teamType: mergedData.teamType,
      assignedDepartments: mergedData.assignedDepartments,
      memberUserIds,
      supervisorUserIds,
      observers: req.body.observers
    });

    const exclusivityValidation = await validateFunctionalTeamExclusivity(
      tenantId,
      mergedData.teamType,
      mergedData.assignedDepartments,
      memberUserIds,
      supervisorUserIds,
      teamId // Exclude current team from check
    );
    if (!exclusivityValidation.valid) {
      logger.warn('❌ [TEAM-PATCH] Exclusivity validation failed', {
        error: exclusivityValidation.error,
        conflicts: exclusivityValidation.conflicts
      });
      return res.status(400).json({ 
        error: exclusivityValidation.error,
        conflicts: exclusivityValidation.conflicts 
      });
    }

    // 🎯 ENHANCED UPDATE: Support assignedDepartments updates
    const [updatedTeam] = await db
      .update(teams)
      .set({
        ...teamData,
        updatedAt: new Date(),
        updatedBy: userId || 'system'
      })
      .where(and(
        eq(teams.id, teamId),
        eq(teams.tenantId, tenantId)
      ))
      .returning();

    if (!updatedTeam) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // 🎯 SYNC USER_TEAMS: Replace all existing members with new ones if members array was provided
    if (members !== undefined) {
      // Step 1: Delete all existing members for this team
      await db
        .delete(userTeams)
        .where(and(
          eq(userTeams.teamId, teamId),
          eq(userTeams.tenantId, tenantId)
        ));

      // Step 2: Insert new members if any
      if (memberUserIds.length > 0) {
        const userTeamRecords = memberUserIds.map((memberId, index) => ({
          userId: memberId,
          teamId,
          tenantId,
          isPrimary: index === 0
        }));
        
        await db.insert(userTeams).values(userTeamRecords);
        
        logger.info('✅ Members synced in user_teams for updated team', {
          teamId,
          memberCount: memberUserIds.length
        });
      }
    }

    // 🎯 SYNC TEAM_OBSERVERS: Replace all existing observers with new ones if observers array was provided
    if (observers !== undefined) {
      // Step 1: Delete all existing observers for this team
      await db
        .delete(teamObservers)
        .where(and(
          eq(teamObservers.teamId, teamId),
          eq(teamObservers.tenantId, tenantId)
        ));

      // Step 2: Insert new observers if any
      const observerUserIds: string[] = Array.isArray(observers) ? observers : [];
      if (observerUserIds.length > 0) {
        const observerRecords = observerUserIds.map(observerId => ({
          userId: observerId,
          teamId,
          tenantId,
          canApprove: true,
          assignedBy: userId || null
        }));
        
        await db.insert(teamObservers).values(observerRecords);
        
        logger.info('✅ Observers synced in team_observers for updated team', {
          teamId,
          observerCount: observerUserIds.length
        });
      }
    }

    // 🎯 SYNC WORKFLOW ASSIGNMENTS: Replace all existing assignments with new ones
    if (workflowAssignments !== undefined) {
      // Step 1: Delete all existing assignments for this team
      await db
        .delete(teamWorkflowAssignments)
        .where(and(
          eq(teamWorkflowAssignments.teamId, teamId),
          eq(teamWorkflowAssignments.tenantId, tenantId)
        ));

      logger.info('🗑️ Deleted existing workflow assignments for team', {
        teamId,
        tenantId
      });

      // Step 2: Insert new assignments if any
      if (Array.isArray(workflowAssignments) && workflowAssignments.length > 0) {
        // Valid department enum values (must match departmentEnum in schema)
        const validDepartments = [...ALL_DEPARTMENT_CODES];
        
        const assignmentsToInsert = workflowAssignments
          .filter((assignment: any) => {
            // Validate department is a valid enum value
            const dept = assignment.department?.toLowerCase();
            if (!dept || !validDepartments.includes(dept)) {
              logger.warn('⚠️ Skipping invalid department in workflow assignment', {
                department: assignment.department,
                validOptions: validDepartments
              });
              return false;
            }
            return true;
          })
          .map((assignment: any) => ({
            tenantId,
            teamId,
            templateId: assignment.templateId,
            forDepartment: assignment.department.toLowerCase(), // Normalize to lowercase
            autoAssign: assignment.autoAssign ?? true,
            priority: assignment.priority ?? 100,
            isActive: true,
            createdBy: userId || 'system',
            updatedBy: userId || 'system'
          }));

        if (assignmentsToInsert.length > 0) {
          await db
            .insert(teamWorkflowAssignments)
            .values(assignmentsToInsert);

          logger.info('✅ Workflow assignments synced for updated team', {
            teamId,
            assignmentsCount: assignmentsToInsert.length,
            departments: assignmentsToInsert.map((a: any) => a.forDepartment)
          });
        }
      }
    }

    logger.info('Team updated with department assignments', { 
      teamId: updatedTeam.id, 
      teamName: updatedTeam.name,
      assignedDepartments: updatedTeam.assignedDepartments,
      workflowAssignmentsCount: workflowAssignments?.length || 0,
      tenantId, 
      userId 
    });

    res.json(updatedTeam);
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// DELETE /api/teams/:id - Delete team
router.delete('/teams/:id', requirePermission('teams.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const teamId = req.params.id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const [deletedTeam] = await db
      .delete(teams)
      .where(and(
        eq(teams.id, teamId),
        eq(teams.tenantId, tenantId)
      ))
      .returning();

    if (!deletedTeam) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ success: true, deleted: deletedTeam });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

// GET /api/teams/:id/members - Get all members of a team via user_teams table
router.get('/teams/:id/members', requirePermission('teams.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const teamId = req.params.id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    await setTenantContext(tenantId);

    // 1. Get team info
    const [team] = await db
      .select({
        id: teams.id,
        name: teams.name,
        assignedDepartments: teams.assignedDepartments
      })
      .from(teams)
      .where(and(
        eq(teams.id, teamId),
        eq(teams.tenantId, tenantId)
      ));

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // 2. Get all members via user_teams table
    const members = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        isPrimary: userTeams.isPrimary,
        assignedAt: userTeams.assignedAt
      })
      .from(userTeams)
      .innerJoin(users, eq(userTeams.userId, users.id))
      .where(
        and(
          eq(userTeams.teamId, teamId),
          eq(userTeams.tenantId, tenantId)
        )
      )
      .orderBy(desc(userTeams.isPrimary), asc(users.lastName), asc(users.firstName));

    res.json({
      team: {
        id: team.id,
        name: team.name,
        assignedDepartments: team.assignedDepartments,
      },
      members,
      count: members.length,
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// ==================== WORKFLOW TEMPLATES ENDPOINTS ====================

// GET /api/workflow-templates - Get workflow templates with optional category filter
router.get('/workflow-templates', requirePermission('workflows.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const category = req.query.category as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const conditions = [
      eq(workflowTemplates.tenantId, tenantId),
      eq(workflowTemplates.isActive, true)
    ];

    if (category) {
      conditions.push(eq(workflowTemplates.category, category));
    }

    const templates = await db
      .select()
      .from(workflowTemplates)
      .where(and(...conditions))
      .orderBy(asc(workflowTemplates.name));

    // Aggiungi routing info a ogni template
    const templatesWithRouting = templates.map(template => {
      // Parse nodes if it's a string (JSONB from database)
      const parsedTemplate = {
        ...template,
        nodes: typeof template.nodes === 'string' ? JSON.parse(template.nodes) : template.nodes
      };
      
      console.log(`[ROUTING-DEBUG] Template ${template.name}:`, {
        nodesType: typeof template.nodes,
        nodesIsArray: Array.isArray(parsedTemplate.nodes),
        nodesLength: parsedTemplate.nodes?.length,
        hasTeamRouting: parsedTemplate.nodes?.some((n: any) => n.type === 'team-routing')
      });
      
      const routingInfo = detectWorkflowRoutingNodes(parsedTemplate as any);
      console.log(`[ROUTING-DEBUG] Detected routing:`, routingInfo);
      
      return {
        ...template,
        routingInfo
      };
    });

    res.json(templatesWithRouting);
  } catch (error) {
    console.error('Error fetching workflow templates:', error);
    res.status(500).json({ error: 'Failed to fetch workflow templates' });
  }
});

// POST /api/workflow-templates - Create new workflow template
router.post('/workflow-templates', requirePermission('workflows.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = (req as any).user?.id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const validatedData = insertWorkflowTemplateSchema.parse({
      ...req.body,
      tenantId,
      createdBy: userId || 'system'
    });

    const [newTemplate] = await db
      .insert(workflowTemplates)
      .values(validatedData)
      .returning();

    res.status(201).json(newTemplate);
  } catch (error: any) {
    console.error('Error creating workflow template:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid template data', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create workflow template' });
    }
  }
});

// ==================== WORKFLOW ACTIONS ENDPOINTS ====================

// GET /api/workflow-actions - Get workflow actions with optional category filter
router.get('/workflow-actions', requirePermission('workflows.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const category = req.query.category as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const conditions = [
      eq(workflowActions.tenantId, tenantId),
      eq(workflowActions.isActive, true)
    ];

    if (category) {
      conditions.push(eq(workflowActions.category, category));
    }

    const actions = await db
      .select()
      .from(workflowActions)
      .where(and(...conditions))
      .orderBy(asc(workflowActions.name));

    res.json(actions);
  } catch (error) {
    console.error('Error fetching workflow actions:', error);
    res.status(500).json({ error: 'Failed to fetch workflow actions' });
  }
});

// ==================== WORKFLOW TRIGGERS ENDPOINTS ====================

// GET /api/workflow-triggers - Get workflow triggers with optional category filter
router.get('/workflow-triggers', requirePermission('workflows.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const category = req.query.category as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const conditions = [
      eq(workflowTriggers.tenantId, tenantId),
      eq(workflowTriggers.isActive, true)
    ];

    if (category) {
      conditions.push(eq(workflowTriggers.category, category));
    }

    const triggers = await db
      .select()
      .from(workflowTriggers)
      .where(and(...conditions))
      .orderBy(asc(workflowTriggers.name));

    res.json(triggers);
  } catch (error) {
    console.error('Error fetching workflow triggers:', error);
    res.status(500).json({ error: 'Failed to fetch workflow triggers' });
  }
});

// ==================== TEAM-WORKFLOW ASSIGNMENTS ENDPOINTS ====================

// GET /api/team-workflow-assignments - Get all assignments
router.get('/team-workflow-assignments', requirePermission('workflows.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const assignments = await db
      .select()
      .from(teamWorkflowAssignments)
      .where(eq(teamWorkflowAssignments.tenantId, tenantId))
      .orderBy(desc(teamWorkflowAssignments.priority));

    res.json(assignments);
  } catch (error) {
    console.error('Error fetching team-workflow assignments:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// POST /api/team-workflow-assignments - Create or update assignment
router.post('/team-workflow-assignments', requirePermission('workflows.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = (req as any).user?.id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const { teamId, templateId, ...assignmentData } = req.body;

    // Check if assignment already exists
    const existing = await db
      .select()
      .from(teamWorkflowAssignments)
      .where(and(
        eq(teamWorkflowAssignments.tenantId, tenantId),
        eq(teamWorkflowAssignments.teamId, teamId),
        eq(teamWorkflowAssignments.templateId, templateId)
      ))
      .limit(1);

    if (existing.length > 0) {
      // Update existing assignment
      const [updated] = await db
        .update(teamWorkflowAssignments)
        .set({
          ...assignmentData,
          updatedAt: new Date()
        })
        .where(eq(teamWorkflowAssignments.id, existing[0].id))
        .returning();

      res.json(updated);
    } else {
      // Create new assignment
      const validatedData = insertTeamWorkflowAssignmentSchema.parse({
        teamId,
        templateId,
        ...assignmentData,
        tenantId,
        createdBy: userId || 'system'
      });

      const [newAssignment] = await db
        .insert(teamWorkflowAssignments)
        .values(validatedData)
        .returning();

      res.status(201).json(newAssignment);
    }
  } catch (error: any) {
    console.error('Error creating/updating assignment:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid assignment data', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create/update assignment' });
    }
  }
});

// ==================== USER-WORKFLOW ASSIGNMENTS ENDPOINTS ====================

// GET /api/user-workflow-assignments - Get all user-workflow assignments
router.get('/user-workflow-assignments', requirePermission('workflows.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const assignments = await db
      .select()
      .from(userWorkflowAssignments)
      .where(eq(userWorkflowAssignments.tenantId, tenantId))
      .orderBy(desc(userWorkflowAssignments.priority));

    res.json(assignments);
  } catch (error) {
    console.error('Error fetching user-workflow assignments:', error);
    res.status(500).json({ error: 'Failed to fetch user assignments' });
  }
});

// POST /api/user-workflow-assignments - Create or update user-workflow assignment
router.post('/user-workflow-assignments', requirePermission('workflows.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = (req as any).user?.id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const { userId: assigneeUserId, templateId, forDepartment, ...assignmentData } = req.body;

    // Validate with Zod FIRST (both create and update paths)
    const validatedData = insertUserWorkflowAssignmentSchema.parse({
      userId: assigneeUserId,
      templateId,
      forDepartment,
      ...assignmentData,
      tenantId,
      createdBy: userId || 'system'
    });

    // Check if assignment already exists
    const existing = await db
      .select()
      .from(userWorkflowAssignments)
      .where(and(
        eq(userWorkflowAssignments.tenantId, tenantId),
        eq(userWorkflowAssignments.userId, validatedData.userId),
        eq(userWorkflowAssignments.templateId, validatedData.templateId),
        eq(userWorkflowAssignments.forDepartment, validatedData.forDepartment)
      ))
      .limit(1);

    if (existing.length > 0) {
      // Update existing assignment with validated data
      const [updated] = await db
        .update(userWorkflowAssignments)
        .set({
          ...validatedData,
          updatedAt: new Date(),
          updatedBy: userId || 'system'
        })
        .where(eq(userWorkflowAssignments.id, existing[0].id))
        .returning();

      res.json(updated);
    } else {
      // Create new assignment with validated data
      const [newAssignment] = await db
        .insert(userWorkflowAssignments)
        .values(validatedData)
        .returning();

      res.status(201).json(newAssignment);
    }
  } catch (error: any) {
    console.error('Error creating/updating user assignment:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ error: 'Invalid assignment data', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create/update user assignment' });
    }
  }
});

// DELETE /api/user-workflow-assignments/:id - Delete user-workflow assignment
router.delete('/user-workflow-assignments/:id', requirePermission('workflows.delete'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    await db
      .delete(userWorkflowAssignments)
      .where(and(
        eq(userWorkflowAssignments.id, id),
        eq(userWorkflowAssignments.tenantId, tenantId)
      ));

    res.json({ success: true, message: 'User assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting user assignment:', error);
    res.status(500).json({ error: 'Failed to delete user assignment' });
  }
});

// ==================== WORKFLOW INSTANCES ENDPOINTS ====================

// GET /api/workflow-instances - Get workflow instances with optional status filter
router.get('/workflow-instances', requirePermission('workflows.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const status = req.query.status as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const conditions: any[] = [eq(workflowInstances.tenantId, tenantId)];

    if (status && status !== 'all') {
      conditions.push(eq((workflowInstances as any).currentStatus, status));
    }

    const instances = await db
      .select({
        id: workflowInstances.id,
        templateId: workflowInstances.templateId,
        referenceId: workflowInstances.referenceId, // ✅ FIXED: Updated to match schema  
        status: workflowInstances.currentStatus, // ✅ FIXED: Updated column name
        currentStepId: workflowInstances.currentStepId,
        currentAssignee: workflowInstances.currentAssignee, // ✅ FIXED: Updated column name
        metadata: workflowInstances.metadata,
        createdAt: workflowInstances.createdAt,
        completedAt: workflowInstances.completedAt,
        // Join template name
        templateName: workflowTemplates.name,
        templateCategory: workflowTemplates.category
      })
      .from(workflowInstances)
      .leftJoin(workflowTemplates, eq(workflowInstances.templateId, workflowTemplates.id))
      .where(and(...conditions))
      .orderBy(desc(workflowInstances.createdAt));

    res.json(instances);
  } catch (error) {
    console.error('Error fetching workflow instances:', error);
    res.status(500).json({ error: 'Failed to fetch workflow instances' });
  }
});

// POST /api/workflow-instances - Create new workflow instance
router.post('/workflow-instances', requirePermission('workflows.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = (req as any).user?.id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const { templateId, referenceId, requestType, metadata } = req.body; // ✅ FIXED: Updated parameter name

    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    // Use workflow engine to create instance
    const instance = await workflowEngine.createInstance(
      templateId,
      {
        tenantId,
        requesterId: userId || 'system',
        referenceId, // ✅ FIXED: Updated parameter name
        requestType,
        metadata
      } as any
    );

    res.status(201).json(instance);
  } catch (error: any) {
    console.error('Error creating workflow instance:', error);
    res.status(500).json({ error: error.message || 'Failed to create workflow instance' });
  }
});

// GET /api/workflow-instances/approvals - Get pending approval requests for current user
router.get('/workflow-instances/approvals', requirePermission('workflows.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = (req as any).user?.id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const { 
      status = 'pending',
      department,
      excludeDepartment,
      limit = '50',
      offset = '0'
    } = req.query;

    // Build query to get workflow instances where current user can approve
    // User can approve if:
    // 1. Direct assignee (currentAssigneeId matches)
    // 2. Primary/secondary supervisor of the team linked to the workflow
    // 3. Observer of the team (if escalated)
    const results = await db.execute<{
      id: string;
      tenant_id: string;
      template_id: string;
      template_name: string;
      current_status: string;
      current_node_id: string;
      current_step_id: string;
      reference_id: string;
      instance_name: string;
      created_at: string;
      updated_at: string;
      entity_type: string;
      entity_id: string;
      triggered_by: string;
      triggered_by_name: string;
      department: string;
      action_id: string;
      action_name: string;
      escalated: boolean;
      sla_hours: number;
    }>(`
      SELECT DISTINCT
        wi.id,
        wi.tenant_id,
        wi.template_id,
        wt.name as template_name,
        wi.current_status,
        wi.current_node_id,
        wi.current_step_id,
        wi.reference_id,
        wi.instance_name,
        wi.created_at,
        wi.updated_at,
        COALESCE(ur.category, 'workflow') as entity_type,
        COALESCE(ur.id::text, wi.reference_id) as entity_id,
        COALESCE(ur.requester_id, wi.workflow_data->>'requesterId') as triggered_by,
        COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as triggered_by_name,
        COALESCE(ur.department::text, wt.for_department, 'general') as department,
        COALESCE(wi.workflow_data->>'actionId', ur.type, 'generic') as action_id,
        COALESCE(wi.workflow_data->>'actionName', ur.title, wi.instance_name) as action_name,
        COALESCE((wi.workflow_data->>'escalated')::boolean, false) as escalated,
        COALESCE((wi.workflow_data->>'slaHours')::integer, 24) as sla_hours
      FROM w3suite.workflow_instances wi
      LEFT JOIN w3suite.workflow_templates wt ON wt.id = wi.template_id
      LEFT JOIN w3suite.universal_requests ur ON ur.workflow_instance_id = wi.id
      LEFT JOIN w3suite.users u ON u.id = ur.requester_id
      WHERE wi.tenant_id = $1
        AND wi.current_status IN ('running', 'waiting_approval', 'pending')
        -- Filter by status if specified
        AND ($3::text IS NULL OR $3::text = 'all' OR wi.current_status = $3::text)
        -- Filter by department if specified
        AND ($4::text IS NULL OR ur.department::text = $4::text OR wt.for_department = $4::text)
        -- Exclude department (e.g., exclude HR from Tasks view)
        AND (
          $5::text IS NULL 
          OR (
            (ur.department IS NULL OR ur.department::text != $5::text)
            AND (wt.for_department IS NULL OR wt.for_department != $5::text)
          )
        )
        -- User authorization: can approve if direct assignee OR team supervisor OR explicit approver
        AND (
          -- Direct assignee in workflow_data
          wi.workflow_data->>'currentAssigneeId' = $2
          -- OR explicit approver in approvers array
          OR wi.workflow_data->'approvers' @> to_jsonb($2::text)
          -- OR supervisor of team linked to request (only if teamId exists)
          OR (
            COALESCE(ur.metadata->>'teamId', wi.workflow_data->>'teamId', ur.metadata->'firstWinsRouting'->>'teamId') IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM w3suite.teams t
              WHERE t.tenant_id = $1
                AND t.is_active = true
                AND t.id::text = COALESCE(
                  ur.metadata->>'teamId',
                  wi.workflow_data->>'teamId',
                  ur.metadata->'firstWinsRouting'->>'teamId'
                )
                AND (t.primary_supervisor_id = $2 OR t.secondary_supervisor_id = $2)
            )
          )
          -- OR observer if escalated (only if teamId exists)
          OR (
            COALESCE((wi.workflow_data->>'escalated')::boolean, false) = true
            AND COALESCE(ur.metadata->>'teamId', wi.workflow_data->>'teamId', ur.metadata->'firstWinsRouting'->>'teamId') IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM w3suite.team_observers tobs
              JOIN w3suite.teams t ON t.id = tobs.team_id
              WHERE t.tenant_id = $1
                AND t.is_active = true
                AND tobs.user_id = $2
                AND t.id::text = COALESCE(
                  ur.metadata->>'teamId',
                  wi.workflow_data->>'teamId',
                  ur.metadata->'firstWinsRouting'->>'teamId'
                )
            )
          )
        )
      ORDER BY wi.created_at DESC
      LIMIT $6 OFFSET $7
    `, [
      tenantId,
      userId,
      status === 'all' ? null : (status || 'pending'),
      department || null,
      excludeDepartment || null,
      parseInt(limit as string, 10),
      parseInt(offset as string, 10)
    ]);

    // Transform results to match ApprovalRequest interface
    const approvals = results.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      status: row.current_status === 'running' || row.current_status === 'waiting_approval' ? 'pending' : row.current_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      entityType: row.entity_type,
      entityId: row.entity_id,
      triggeredBy: row.triggered_by,
      triggeredByName: row.triggered_by_name,
      currentStepData: {
        department: row.department,
        actionId: row.action_id,
        actionName: row.action_name,
        escalated: row.escalated,
        observersCanApprove: row.escalated,
        slaHours: row.sla_hours
      },
      workflowTemplateId: row.template_id,
      workflowTemplateName: row.template_name
    }));

    res.json({ 
      success: true, 
      data: approvals,
      meta: {
        total: approvals.length,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10)
      }
    });
  } catch (error: any) {
    console.error('Error fetching approval requests:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch approval requests' });
  }
});

// POST /api/workflow-instances/:id/approve - Approve workflow step
router.post('/workflow-instances/:id/approve', requirePermission('workflows.approve'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const instanceId = req.params.id;
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.firstName 
      ? `${(req as any).user.firstName} ${(req as any).user.lastName || ''}`.trim()
      : 'Un supervisore';
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const { comment, attachments, notes } = req.body;

    // Get workflow instance details for notification
    const [instance] = await db
      .select({
        id: workflowInstances.id,
        referenceId: workflowInstances.referenceId,
        instanceName: workflowInstances.instanceName,
        workflowData: workflowInstances.workflowData
      })
      .from(workflowInstances)
      .where(eq(workflowInstances.id, instanceId))
      .limit(1);

    // Get requester from universal_requests if linked
    let requesterId: string | null = null;
    let actionName = instance?.instanceName || 'Richiesta';
    let department: string | null = null;

    if (instance?.referenceId) {
      const [linkedRequest] = await db
        .select({
          requesterId: universalRequests.requesterId,
          title: universalRequests.title,
          department: universalRequests.department
        })
        .from(universalRequests)
        .where(eq(universalRequests.id, instance.referenceId))
        .limit(1);

      if (linkedRequest) {
        requesterId = linkedRequest.requesterId;
        actionName = linkedRequest.title || actionName;
        department = linkedRequest.department;
      }
    }

    // Fallback to workflow_data requesterId
    if (!requesterId && instance?.workflowData) {
      requesterId = (instance.workflowData as any)?.requesterId || null;
    }

    // Use workflow engine to process approval
    const result = await workflowEngine.processApproval({
      instanceId,
      approverId: userId || 'system',
      decision: 'approve',
      comment: comment || notes,
      attachments
    });

    // Send notification to requester (skip HR - has its own notification system)
    if (requesterId && department !== 'hr') {
      await notificationService.sendNotification(
        tenantId,
        requesterId,
        '✅ Richiesta Approvata',
        `La tua richiesta "${actionName}" è stata approvata da ${userName}.${comment ? ` Note: ${comment}` : ''}`,
        'request_approved',
        'normal',
        {
          workflowInstanceId: instanceId,
          status: 'approved',
          approverId: userId,
          actionName,
          department
        }
      );
      logger.info('📧 [APPROVAL] Notification sent to requester', {
        instanceId,
        requesterId,
        actionName,
        department
      });
    }

    // Update universal_requests status if linked
    if (instance?.referenceId && department !== 'hr') {
      await db
        .update(universalRequests)
        .set({
          status: 'approved',
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(universalRequests.id, instance.referenceId));
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error approving workflow:', error);
    res.status(500).json({ error: error.message || 'Failed to approve workflow' });
  }
});

// POST /api/workflow-instances/:id/reject - Reject workflow step
router.post('/workflow-instances/:id/reject', requirePermission('workflows.approve'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const instanceId = req.params.id;
    const userId = (req as any).user?.id;
    const userName = (req as any).user?.firstName 
      ? `${(req as any).user.firstName} ${(req as any).user.lastName || ''}`.trim()
      : 'Un supervisore';
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const { reason, comment } = req.body;
    const rejectionReason = reason || comment || 'Nessuna motivazione specificata';

    // Get workflow instance details for notification
    const [instance] = await db
      .select({
        id: workflowInstances.id,
        referenceId: workflowInstances.referenceId,
        instanceName: workflowInstances.instanceName,
        workflowData: workflowInstances.workflowData
      })
      .from(workflowInstances)
      .where(eq(workflowInstances.id, instanceId))
      .limit(1);

    // Get requester from universal_requests if linked
    let requesterId: string | null = null;
    let actionName = instance?.instanceName || 'Richiesta';
    let department: string | null = null;

    if (instance?.referenceId) {
      const [linkedRequest] = await db
        .select({
          requesterId: universalRequests.requesterId,
          title: universalRequests.title,
          department: universalRequests.department
        })
        .from(universalRequests)
        .where(eq(universalRequests.id, instance.referenceId))
        .limit(1);

      if (linkedRequest) {
        requesterId = linkedRequest.requesterId;
        actionName = linkedRequest.title || actionName;
        department = linkedRequest.department;
      }
    }

    // Fallback to workflow_data requesterId
    if (!requesterId && instance?.workflowData) {
      requesterId = (instance.workflowData as any)?.requesterId || null;
    }

    // Use workflow engine to process rejection
    const result = await workflowEngine.processApproval({
      instanceId,
      approverId: userId || 'system',
      decision: 'reject',
      comment: rejectionReason
    });

    // Send notification to requester (skip HR - has its own notification system)
    if (requesterId && department !== 'hr') {
      await notificationService.sendNotification(
        tenantId,
        requesterId,
        '❌ Richiesta Rifiutata',
        `La tua richiesta "${actionName}" è stata rifiutata da ${userName}.\nMotivo: ${rejectionReason}`,
        'request_rejected',
        'high',
        {
          workflowInstanceId: instanceId,
          status: 'rejected',
          rejecterId: userId,
          reason: rejectionReason,
          actionName,
          department
        }
      );
      logger.info('📧 [REJECTION] Notification sent to requester', {
        instanceId,
        requesterId,
        actionName,
        department,
        reason: rejectionReason
      });
    }

    // Update universal_requests status if linked
    if (instance?.referenceId && department !== 'hr') {
      await db
        .update(universalRequests)
        .set({
          status: 'rejected',
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(universalRequests.id, instance.referenceId));
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error rejecting workflow:', error);
    res.status(500).json({ error: error.message || 'Failed to reject workflow' });
  }
});

// POST /api/workflow-instances/:id/delegate - Delegate workflow step
router.post('/workflow-instances/:id/delegate', requirePermission('workflows.approve'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const instanceId = req.params.id;
    const userId = (req as any).user?.id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const { delegateToId, comment } = req.body;

    if (!delegateToId) {
      return res.status(400).json({ error: 'Delegate user ID is required' });
    }

    // Use workflow engine to process delegation
    const result = await workflowEngine.processApproval({
      instanceId,
      approverId: userId || 'system',
      decision: 'delegate',
      delegateToId,
      comment
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error delegating workflow:', error);
    res.status(500).json({ error: error.message || 'Failed to delegate workflow' });
  }
});

// GET /api/workflow-instances/:id/details - Get workflow instance details with history
router.get('/workflow-instances/:id/details', requirePermission('workflows.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const instanceId = req.params.id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Use workflow engine to get detailed instance information
    const details = await workflowEngine.getInstanceDetails(instanceId);

    res.json(details);
  } catch (error: any) {
    console.error('Error getting workflow details:', error);
    res.status(500).json({ error: error.message || 'Failed to get workflow details' });
  }
});

// ==================== ADMIN COVERAGE DASHBOARD ENDPOINTS ====================

/**
 * 📊 GET /api/admin/coverage-dashboard
 * Returns complete 3-level coverage analysis:
 * - Level 1: Departments → Teams (Does each department have at least one team?)
 * - Level 2: Departments → Workflows + Action Tags (What actions are covered per department?)
 * - Level 3: Users → Teams per Department (Does each user have team coverage for required departments?)
 */
router.get('/admin/coverage-dashboard', requirePermission('teams.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    await setTenantContext(tenantId);

    // 1. Get all active teams with their departments
    const allTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        description: teams.description,
        teamType: teams.teamType,
        assignedDepartments: teams.assignedDepartments,
        primarySupervisorUser: teams.primarySupervisorUser,
        isActive: teams.isActive
      })
      .from(teams)
      .where(and(
        eq(teams.tenantId, tenantId),
        eq(teams.isActive, true)
      ));
    
    // 1b. Get all team memberships from user_teams table
    const allTeamMemberships = await db
      .select({
        userId: userTeams.userId,
        teamId: userTeams.teamId
      })
      .from(userTeams)
      .where(eq(userTeams.tenantId, tenantId));
    
    // Build a map of teamId -> member user IDs
    const teamMembersMap = new Map<string, string[]>();
    allTeamMemberships.forEach(m => {
      const members = teamMembersMap.get(m.teamId) || [];
      members.push(m.userId);
      teamMembersMap.set(m.teamId, members);
    });

    // 2. Get all workflow templates with action tags
    const allTemplates = await db
      .select({
        id: workflowTemplates.id,
        name: workflowTemplates.name,
        category: workflowTemplates.category,
        templateType: workflowTemplates.templateType,
        actionTags: workflowTemplates.actionTags,
        customAction: workflowTemplates.customAction,
        isActive: workflowTemplates.isActive
      })
      .from(workflowTemplates)
      .where(and(
        eq(workflowTemplates.tenantId, tenantId),
        eq(workflowTemplates.isActive, true)
      ));

    // 3. Get all active users
    const allUsers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        status: users.status
      })
      .from(users)
      .where(and(
        eq(users.tenantId, tenantId),
        sql`(${users.status} = 'attivo' OR ${users.status} = 'active')`
      ));

    // 4. Define all departments
    const allDepartments = [...ALL_DEPARTMENT_CODES];
    const criticalDepartments = ['hr']; // Departments that all users should have access to

    // ==================== LEVEL 1: Departments → Teams ====================
    const level1_departmentsTeams = allDepartments.map(dept => {
      const teamsForDept = allTeams.filter(t => 
        t.assignedDepartments && t.assignedDepartments.includes(dept)
      );
      
      return {
        department: dept,
        departmentLabel: dept.charAt(0).toUpperCase() + dept.slice(1),
        hasTeams: teamsForDept.length > 0,
        teamCount: teamsForDept.length,
        teams: teamsForDept.map(t => ({
          id: t.id,
          name: t.name,
          memberCount: (teamMembersMap.get(t.id) || []).length
        })),
        status: teamsForDept.length > 0 ? 'ok' : 'critical'
      };
    });

    // ==================== LEVEL 2: Departments → Workflows + Action Tags ====================
    const level2_departmentsWorkflows = allDepartments.map(dept => {
      // Get workflow templates for this department
      const templatesForDept = allTemplates.filter(t => 
        t.category?.toLowerCase() === dept.toLowerCase()
      );

      // Get all action tags defined for this department
      const deptKey = dept as keyof typeof DEPARTMENT_ACTION_TAGS;
      const expectedActionTags = DEPARTMENT_ACTION_TAGS[deptKey] || [];
      const expectedTagValues = expectedActionTags.map(t => t.value);

      // Get action tags covered by workflows
      const coveredActionTags: string[] = [];
      const customActions: string[] = [];
      
      templatesForDept.forEach(template => {
        if (template.actionTags) {
          template.actionTags.forEach(tag => {
            if (!coveredActionTags.includes(tag)) {
              coveredActionTags.push(tag);
            }
          });
        }
        if (template.customAction) {
          customActions.push(template.customAction);
        }
      });

      // Find missing action tags
      const missingActionTags = expectedTagValues.filter(tag => !coveredActionTags.includes(tag));

      // Build workflow list with their action tags
      const workflows = templatesForDept.map(t => ({
        id: t.id,
        name: t.name,
        actionTags: (t.actionTags || []).map(tagValue => {
          const tagDef = expectedActionTags.find(et => et.value === tagValue);
          return {
            value: tagValue,
            label: tagDef?.label || tagValue
          };
        }),
        customAction: t.customAction
      }));

      // Determine status
      let status: 'ok' | 'warning' | 'critical' = 'ok';
      if (templatesForDept.length === 0) {
        status = 'critical';
      } else if (missingActionTags.length > 0) {
        status = 'warning';
      }

      return {
        department: dept,
        departmentLabel: dept.charAt(0).toUpperCase() + dept.slice(1),
        hasWorkflows: templatesForDept.length > 0,
        workflowCount: templatesForDept.length,
        workflows,
        actionTags: {
          expected: expectedActionTags,
          covered: coveredActionTags.map(tagValue => {
            const tagDef = expectedActionTags.find(et => et.value === tagValue);
            return { value: tagValue, label: tagDef?.label || tagValue };
          }),
          missing: missingActionTags.map(tagValue => {
            const tagDef = expectedActionTags.find(et => et.value === tagValue);
            return { value: tagValue, label: tagDef?.label || tagValue };
          }),
          customActions,
          coveragePercent: expectedTagValues.length > 0
            ? Math.round((coveredActionTags.length / expectedTagValues.length) * 100)
            : (templatesForDept.length > 0 ? 100 : 0)
        },
        status
      };
    });

    // ==================== LEVEL 3: Users → Teams per Department ====================
    // Build user-to-department coverage map
    const userCoverageMap = new Map<string, Set<string>>();
    
    allUsers.forEach(user => {
      userCoverageMap.set(user.id, new Set());
    });

    allTeams.forEach(team => {
      const teamDepartments = team.assignedDepartments || [];
      const teamMembers = teamMembersMap.get(team.id) || [];
      
      teamMembers.forEach(userId => {
        const coverage = userCoverageMap.get(userId);
        if (coverage) {
          teamDepartments.forEach(dept => coverage.add(dept));
        }
      });
    });

    // Analyze user coverage
    const level3_usersCoverage = {
      totalUsers: allUsers.length,
      usersWithFullCoverage: 0,
      usersWithPartialCoverage: 0,
      orphanUsers: [] as Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        coveredDepartments: string[];
        missingDepartments: string[];
      }>,
      departmentBreakdown: allDepartments.map(dept => {
        const usersWithCoverage = allUsers.filter(user => {
          const coverage = userCoverageMap.get(user.id);
          return coverage && coverage.has(dept);
        });

        return {
          department: dept,
          departmentLabel: dept.charAt(0).toUpperCase() + dept.slice(1),
          usersWithCoverage: usersWithCoverage.length,
          usersWithoutCoverage: allUsers.length - usersWithCoverage.length,
          coveragePercent: allUsers.length > 0 
            ? Math.round((usersWithCoverage.length / allUsers.length) * 100) 
            : 0,
          isCritical: criticalDepartments.includes(dept)
        };
      })
    };

    // Find orphan users and users missing critical departments
    allUsers.forEach(user => {
      const coverage = userCoverageMap.get(user.id) || new Set();
      const coveredDepts = Array.from(coverage);
      const missingCriticalDepts = criticalDepartments.filter(dept => !coverage.has(dept));

      if (coverage.size === 0 || missingCriticalDepts.length > 0) {
        level3_usersCoverage.orphanUsers.push({
          id: user.id || '',
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || '',
          email: user.email || '',
          role: user.role || 'N/A',
          coveredDepartments: coveredDepts,
          missingDepartments: missingCriticalDepts
        });
      }

      if (coveredDepts.length >= allDepartments.length) {
        level3_usersCoverage.usersWithFullCoverage++;
      } else if (coveredDepts.length > 0) {
        level3_usersCoverage.usersWithPartialCoverage++;
      }
    });

    // ==================== Summary ====================
    const level1Critical = level1_departmentsTeams.filter(d => d.status === 'critical').length;
    const level2Critical = level2_departmentsWorkflows.filter(d => d.status === 'critical').length;
    const level2Warning = level2_departmentsWorkflows.filter(d => d.status === 'warning').length;
    const level3Issues = level3_usersCoverage.orphanUsers.length;

    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (level1Critical > 0 || level2Critical > 0) {
      overallHealth = 'critical';
    } else if (level2Warning > 0 || level3Issues > 0) {
      overallHealth = 'warning';
    }

    res.json({
      success: true,
      data: {
        summary: {
          overallHealth,
          level1: {
            name: 'Dipartimenti → Teams',
            description: 'Ogni dipartimento ha almeno un team assegnato?',
            totalDepartments: allDepartments.length,
            coveredDepartments: allDepartments.length - level1Critical,
            uncoveredDepartments: level1Critical,
            status: level1Critical > 0 ? 'critical' : 'ok'
          },
          level2: {
            name: 'Dipartimenti → Workflows + Azioni',
            description: 'Ogni dipartimento ha workflow con azioni coperte?',
            totalDepartments: allDepartments.length,
            fullyConfigured: level2_departmentsWorkflows.filter(d => d.status === 'ok').length,
            partiallyConfigured: level2Warning,
            notConfigured: level2Critical,
            status: level2Critical > 0 ? 'critical' : level2Warning > 0 ? 'warning' : 'ok'
          },
          level3: {
            name: 'Utenti → Copertura Team',
            description: 'Ogni utente ha accesso ai dipartimenti critici (HR)?',
            totalUsers: allUsers.length,
            usersWithIssues: level3Issues,
            usersOk: allUsers.length - level3Issues,
            status: level3Issues > 0 ? 'warning' : 'ok'
          }
        },
        level1: level1_departmentsTeams,
        level2: level2_departmentsWorkflows,
        level3: level3_usersCoverage
      }
    });

  } catch (error: any) {
    console.error('Error fetching coverage dashboard:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch coverage dashboard' });
  }
});

/**
 * 👤 GET /api/admin/orphan-users
 * Returns users who are not members of any team for specific departments
 * Helps identify employees who cannot submit requests for certain departments
 */
router.get('/admin/orphan-users', requirePermission('teams.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    await setTenantContext(tenantId);

    // 1. Get all active users in tenant
    const allUsers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        status: users.status
      })
      .from(users)
      .where(and(
        eq(users.tenantId, tenantId),
        sql`(${users.status} = 'attivo' OR ${users.status} = 'active')`
      ));

    // 2. Get all active teams with their departments
    const allTeamsOrphan = await db
      .select({
        id: teams.id,
        name: teams.name,
        assignedDepartments: teams.assignedDepartments
      })
      .from(teams)
      .where(and(
        eq(teams.tenantId, tenantId),
        eq(teams.isActive, true)
      ));
    
    // 2b. Get all team memberships from user_teams table
    const teamMembershipsOrphan = await db
      .select({
        userId: userTeams.userId,
        teamId: userTeams.teamId
      })
      .from(userTeams)
      .where(eq(userTeams.tenantId, tenantId));
    
    // Build a map of teamId -> member user IDs
    const teamMembersMapOrphan = new Map<string, string[]>();
    teamMembershipsOrphan.forEach(m => {
      const members = teamMembersMapOrphan.get(m.teamId) || [];
      members.push(m.userId);
      teamMembersMapOrphan.set(m.teamId, members);
    });

    // 3. Build user-to-department coverage map
    const userCoverage = new Map<string, Set<string>>();
    
    // Initialize all users with empty coverage
    allUsers.forEach(user => {
      userCoverage.set(user.id, new Set());
    });

    // Add department coverage based on team membership via user_teams
    allTeamsOrphan.forEach(team => {
      const teamDepartments = team.assignedDepartments || [];
      const teamMembers = teamMembersMapOrphan.get(team.id) || [];
      
      teamMembers.forEach(userId => {
        const coverage = userCoverage.get(userId);
        if (coverage) {
          teamDepartments.forEach(dept => coverage.add(dept));
        }
      });
    });

    // 4. Critical departments that users should typically have coverage for
    const criticalDepartments = ['hr']; // HR is critical - everyone should be able to submit HR requests

    // 5. Find orphan users (no team membership at all)
    const orphanUsers = allUsers.filter(user => {
      const coverage = userCoverage.get(user.id);
      return !coverage || coverage.size === 0;
    });

    // 6. Find users missing critical department coverage
    const usersWithMissingCoverage = allUsers
      .filter(user => {
        const coverage = userCoverage.get(user.id);
        if (!coverage) return true;
        return criticalDepartments.some(dept => !coverage.has(dept));
      })
      .map(user => {
        const coverage = userCoverage.get(user.id) || new Set();
        const missingDepts = criticalDepartments.filter(dept => !coverage.has(dept));
        return {
          id: user.id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          email: user.email,
          role: user.role,
          coveredDepartments: Array.from(coverage),
          missingCriticalDepartments: missingDepts,
          isOrphan: coverage.size === 0
        };
      });

    // 7. Build department-wise breakdown
    const allDepartments = [...ALL_DEPARTMENT_CODES];
    const departmentBreakdown = allDepartments.map(dept => {
      const usersWithCoverage = allUsers.filter(user => {
        const coverage = userCoverage.get(user.id);
        return coverage && coverage.has(dept);
      });
      const usersWithoutCoverage = allUsers.filter(user => {
        const coverage = userCoverage.get(user.id);
        return !coverage || !coverage.has(dept);
      });

      return {
        department: dept,
        departmentLabel: dept.charAt(0).toUpperCase() + dept.slice(1),
        coveredUsersCount: usersWithCoverage.length,
        uncoveredUsersCount: usersWithoutCoverage.length,
        coveragePercent: allUsers.length > 0 
          ? Math.round((usersWithCoverage.length / allUsers.length) * 100) 
          : 0,
        isCritical: criticalDepartments.includes(dept)
      };
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalUsers: allUsers.length,
          orphanUsers: orphanUsers.length,
          usersWithMissingCritical: usersWithMissingCoverage.filter(u => u.missingCriticalDepartments.length > 0).length
        },
        orphanUsers: orphanUsers.map(u => ({
          id: u.id,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
          email: u.email,
          role: u.role
        })),
        usersWithMissingCoverage: usersWithMissingCoverage.filter(u => !u.isOrphan),
        departmentBreakdown
      }
    });

  } catch (error: any) {
    console.error('Error fetching orphan users:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch orphan users' });
  }
});

/**
 * 📋 GET /api/admin/workflow-scopes
 * Returns all available workflow scopes (templateTypes) grouped by department
 * Used to populate scope selection in UI
 */
router.get('/admin/workflow-scopes', requirePermission('workflows.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    await setTenantContext(tenantId);

    // Get all workflow templates grouped by category and templateType
    const allTemplates = await db
      .select({
        category: workflowTemplates.category,
        templateType: workflowTemplates.templateType,
        name: workflowTemplates.name
      })
      .from(workflowTemplates)
      .where(and(
        eq(workflowTemplates.tenantId, tenantId),
        eq(workflowTemplates.isActive, true)
      ));

    // Group by department (category)
    const scopesByDepartment: Record<string, Array<{ scope: string; name: string; label: string }>> = {};
    
    allTemplates.forEach(template => {
      const dept = template.category?.toLowerCase() || 'other';
      if (!scopesByDepartment[dept]) {
        scopesByDepartment[dept] = [];
      }
      
      // Avoid duplicates
      const exists = scopesByDepartment[dept].some(s => s.scope === template.templateType);
      if (!exists && template.templateType) {
        scopesByDepartment[dept].push({
          scope: template.templateType,
          name: template.name,
          label: template.templateType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        });
      }
    });

    res.json({
      success: true,
      data: scopesByDepartment
    });

  } catch (error: any) {
    console.error('Error fetching workflow scopes:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch workflow scopes' });
  }
});

// ==================== COVERAGE DASHBOARD V2 ====================
/**
 * 📊 GET /api/admin/coverage-dashboard-v2
 * Complete 5-level coverage analysis + health checks:
 * - L1: Team Coverage - Does each department have at least one team?
 * - L2: User Coverage - Does each user belong to at least one team?
 * - L3: Action Coverage - Which actions have active flows configured?
 * - L4: Team-Action Coverage - Are all teams covered by active actions?
 * - L5: Workflow Health - Are assigned workflows active and being used?
 * - Health Checks: Teams without supervisors, actions without SLA, disabled workflows in use
 */
router.get('/admin/coverage-dashboard-v2', requirePermission('teams.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    await setTenantContext(tenantId);

    // ==================== FETCH ALL DATA (raw SQL for reliability) ====================
    
    // Get all departments
    const allDepartments = await db.execute<{
      id: string; code: string; name: string; is_active: boolean;
    }>(sql`
      SELECT id, code, name, is_active FROM w3suite.departments
      WHERE tenant_id = ${tenantId} AND is_active = true
    `).then(r => r.rows.map(d => ({
      id: d.id, code: d.code, name: d.name, isActive: d.is_active
    })));

    // Get all teams
    const allTeams = await db.execute<{
      id: string; name: string; team_type: string; primary_supervisor_user: string | null; secondary_supervisor_user: string | null; is_active: boolean;
    }>(sql`
      SELECT id, name, team_type, primary_supervisor_user, secondary_supervisor_user, is_active 
      FROM w3suite.teams WHERE tenant_id = ${tenantId} AND is_active = true
    `).then(r => r.rows.map(t => ({
      id: t.id, name: t.name, teamType: t.team_type,
      primarySupervisorUser: t.primary_supervisor_user,
      secondarySupervisorUser: t.secondary_supervisor_user,
      isActive: t.is_active
    })));

    // Get team-department associations
    const allTeamDepts = await db.execute<{
      team_id: string; department_id: string;
    }>(sql`
      SELECT team_id, department_id FROM w3suite.team_departments WHERE tenant_id = ${tenantId}
    `).then(r => r.rows.map(td => ({ teamId: td.team_id, departmentId: td.department_id })));

    // Get team memberships
    const allTeamMemberships = await db.execute<{
      user_id: string; team_id: string;
    }>(sql`
      SELECT user_id, team_id FROM w3suite.user_teams WHERE tenant_id = ${tenantId}
    `).then(r => r.rows.map(m => ({ userId: m.user_id, teamId: m.team_id })));

    // Get team observers
    const allObservers = await db.execute<{
      team_id: string; user_id: string; can_approve: boolean;
    }>(sql`
      SELECT team_id, user_id, can_approve FROM w3suite.team_observers WHERE tenant_id = ${tenantId}
    `).then(r => r.rows.map(o => ({ teamId: o.team_id, userId: o.user_id, canApprove: o.can_approve })));

    // Get all users (status = 'active' instead of is_active)
    const allUsers = await db.execute<{
      id: string; first_name: string; last_name: string; email: string; role: string; status: string;
    }>(sql`
      SELECT id, first_name, last_name, email, role, status FROM w3suite.users
      WHERE tenant_id = ${tenantId} AND status = 'active'
    `).then(r => r.rows.map(u => ({
      id: u.id, firstName: u.first_name, lastName: u.last_name, email: u.email, role: u.role, isActive: u.status === 'active'
    })));

    // Get action configurations
    const allActionConfigs = await db.execute<{
      id: string; department: string; action_id: string; action_name: string; flow_type: string;
      requires_approval: boolean; team_scope: string; specific_team_ids: string[];
      workflow_template_id: string | null; sla_hours: number | null; is_active: boolean;
    }>(sql`
      SELECT id, department, action_id, action_name, flow_type, requires_approval, 
             team_scope, specific_team_ids, workflow_template_id, sla_hours, is_active
      FROM w3suite.action_configurations WHERE tenant_id = ${tenantId}
    `).then(r => r.rows.map(a => ({
      id: a.id, department: a.department, actionId: a.action_id, actionName: a.action_name,
      flowType: a.flow_type, requiresApproval: a.requires_approval, teamScope: a.team_scope,
      specificTeamIds: a.specific_team_ids || [], workflowTemplateId: a.workflow_template_id,
      slaHours: a.sla_hours, isActive: a.is_active
    })));

    // Get workflow templates
    const allWorkflowTemplates = await db.execute<{
      id: string; name: string; category: string; is_active: boolean; created_at: string;
    }>(sql`
      SELECT id, name, category, is_active, created_at FROM w3suite.workflow_templates WHERE tenant_id = ${tenantId}
    `).then(r => r.rows.map(w => ({
      id: w.id, name: w.name, category: w.category, isActive: w.is_active, createdAt: w.created_at
    })));

    // Get workflow instances for usage stats
    const workflowUsageStats = await db.execute<{
      template_id: string; last_used: string; usage_count: number;
    }>(sql`
      SELECT template_id, MAX(created_at) as last_used, COUNT(*)::int as usage_count 
      FROM w3suite.workflow_instances WHERE tenant_id = ${tenantId} GROUP BY template_id
    `).then(r => r.rows.map(s => ({
      templateId: s.template_id, lastUsed: s.last_used, usageCount: s.usage_count
    })));

    // ==================== BUILD MAPS ====================
    
    // Map: departmentId -> department
    const deptMap = new Map(allDepartments.map(d => [d.id, d]));
    const deptCodeMap = new Map(allDepartments.map(d => [d.code, d]));
    
    // Map: teamId -> departmentIds
    const teamToDepts = new Map<string, string[]>();
    allTeamDepts.forEach(td => {
      const depts = teamToDepts.get(td.teamId) || [];
      depts.push(td.departmentId);
      teamToDepts.set(td.teamId, depts);
    });

    // Map: departmentId -> teams
    const deptToTeams = new Map<string, typeof allTeams>();
    allTeamDepts.forEach(td => {
      const team = allTeams.find(t => t.id === td.teamId);
      if (team) {
        const teams = deptToTeams.get(td.departmentId) || [];
        teams.push(team);
        deptToTeams.set(td.departmentId, teams);
      }
    });

    // Map: teamId -> member userIds
    const teamMembers = new Map<string, string[]>();
    allTeamMemberships.forEach(m => {
      const members = teamMembers.get(m.teamId) || [];
      members.push(m.userId);
      teamMembers.set(m.teamId, members);
    });

    // Map: teamId -> observers
    const teamObserversMap = new Map<string, typeof allObservers>();
    allObservers.forEach(o => {
      const obs = teamObserversMap.get(o.teamId) || [];
      obs.push(o);
      teamObserversMap.set(o.teamId, obs);
    });

    // Map: templateId -> usage stats
    const workflowUsage = new Map(workflowUsageStats.map(w => [w.templateId, w]));

    // ==================== LEVEL 1: TEAM COVERAGE ====================
    
    const level1Data = allDepartments.map(dept => {
      const deptTeams = deptToTeams.get(dept.id) || [];
      const hasTeams = deptTeams.length > 0;
      
      return {
        departmentId: dept.id,
        departmentCode: dept.code,
        departmentName: dept.name,
        hasTeams,
        teamCount: deptTeams.length,
        teams: deptTeams.map(t => ({
          id: t.id,
          name: t.name,
          memberCount: (teamMembers.get(t.id) || []).length,
          hasSupervisor: !!t.primarySupervisorUser
        })),
        status: hasTeams ? 'ok' : 'critical' as 'ok' | 'warning' | 'critical'
      };
    }).sort((a, b) => (a.hasTeams ? 1 : 0) - (b.hasTeams ? 1 : 0));

    const level1Summary = {
      totalDepartments: allDepartments.length,
      coveredDepartments: level1Data.filter(d => d.hasTeams).length,
      uncoveredDepartments: level1Data.filter(d => !d.hasTeams).length
    };

    // ==================== LEVEL 2: USER COVERAGE ====================
    
    // For each user, check coverage across ALL departments (not just any team)
    const totalDeptCount = allDepartments.length;
    const userCoverage = allUsers.map(user => {
      const memberOfTeams = allTeamMemberships.filter(m => m.userId === user.id).map(m => m.teamId);
      const supervisorOfTeams = allTeams.filter(t => 
        t.primarySupervisorUser === user.id || t.secondarySupervisorUser === user.id
      ).map(t => t.id);
      const observerOfTeams = allObservers.filter(o => o.userId === user.id).map(o => o.teamId);
      
      const allUserTeams = [...new Set([...memberOfTeams, ...supervisorOfTeams, ...observerOfTeams])];
      
      // Get departments covered by these teams
      const coveredDeptIds = new Set<string>();
      allUserTeams.forEach(teamId => {
        const depts = teamToDepts.get(teamId) || [];
        depts.forEach(d => coveredDeptIds.add(d));
      });
      
      const coveredDepts = Array.from(coveredDeptIds).map(id => deptMap.get(id)?.code || id);
      const missingDepts = allDepartments.filter(d => !coveredDeptIds.has(d.id)).map(d => ({
        code: d.code,
        name: d.name
      }));
      
      // Full coverage = has team in ALL departments
      const hasFullCoverage = coveredDeptIds.size === totalDeptCount;
      // Partial coverage = has at least 1 team but not all departments
      const hasPartialCoverage = allUserTeams.length > 0 && !hasFullCoverage;
      // No coverage = no teams at all
      const hasNoCoverage = allUserTeams.length === 0;
      
      return {
        userId: user.id,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        userEmail: user.email,
        userRole: user.role,
        teamCount: allUserTeams.length,
        hasTeam: allUserTeams.length > 0,
        hasFullCoverage,
        hasPartialCoverage,
        hasNoCoverage,
        coveredDepartments: coveredDepts,
        coveredDeptCount: coveredDeptIds.size,
        missingDepartments: missingDepts,
        missingDeptCount: missingDepts.length,
        coveragePercent: Math.round((coveredDeptIds.size / totalDeptCount) * 100)
      };
    });

    const level2Summary = {
      totalUsers: allUsers.length,
      totalDepartments: totalDeptCount,
      usersWithFullCoverage: userCoverage.filter(u => u.hasFullCoverage).length,
      usersWithPartialCoverage: userCoverage.filter(u => u.hasPartialCoverage).length,
      usersWithNoCoverage: userCoverage.filter(u => u.hasNoCoverage).length,
      // Legacy fields for backward compat
      usersWithTeam: userCoverage.filter(u => u.hasTeam).length,
      usersWithoutTeam: userCoverage.filter(u => !u.hasTeam).length
    };

    const level2Data = {
      summary: level2Summary,
      // Users grouped by coverage status
      usersWithFullCoverage: userCoverage.filter(u => u.hasFullCoverage).slice(0, 30),
      usersWithPartialCoverage: userCoverage.filter(u => u.hasPartialCoverage).slice(0, 30),
      usersWithNoCoverage: userCoverage.filter(u => u.hasNoCoverage).slice(0, 30),
      // Legacy field
      usersWithoutTeam: userCoverage.filter(u => !u.hasTeam),
      // Per-department breakdown (who is/isn't covered for THIS specific dept)
      departmentBreakdown: allDepartments.map(dept => {
        const usersInDept = userCoverage.filter(u => u.coveredDepartments.includes(dept.code));
        const usersNotInDept = userCoverage.filter(u => !u.coveredDepartments.includes(dept.code));
        return {
          departmentCode: dept.code,
          departmentName: dept.name,
          usersWithCoverage: usersInDept.length,
          usersWithoutCoverage: usersNotInDept.length,
          coveragePercent: Math.round((usersInDept.length / allUsers.length) * 100) || 0,
          coveredUsers: usersInDept.slice(0, 20).map(u => ({
            userId: u.userId,
            userName: u.userName,
            userRole: u.userRole,
            teamCount: u.teamCount,
            coveragePercent: u.coveragePercent
          })),
          uncoveredUsers: usersNotInDept.slice(0, 20).map(u => ({
            userId: u.userId,
            userName: u.userName,
            userRole: u.userRole,
            missingDepts: u.missingDepartments.map(d => d.name)
          })),
          hasMoreCovered: usersInDept.length > 20,
          hasMoreUncovered: usersNotInDept.length > 20
        };
      })
    };

    // ==================== LEVEL 3: ACTION COVERAGE ====================
    
    // Group actions by department from action_configurations
    const actionsByDept = new Map<string, typeof allActionConfigs>();
    allActionConfigs.forEach(ac => {
      const dept = ac.department;
      const actions = actionsByDept.get(dept) || [];
      actions.push(ac);
      actionsByDept.set(dept, actions);
    });

    const level3Data = allDepartments.map(dept => {
      const deptActions = actionsByDept.get(dept.code) || [];
      const activeActions = deptActions.filter(a => a.flowType !== 'none' && a.requiresApproval);
      const inactiveActions = deptActions.filter(a => a.flowType === 'none' || !a.requiresApproval);
      
      return {
        departmentCode: dept.code,
        departmentName: dept.name,
        totalActions: deptActions.length,
        activeActions: activeActions.length,
        inactiveActions: inactiveActions.length,
        coveragePercent: deptActions.length > 0 
          ? Math.round((activeActions.length / deptActions.length) * 100) 
          : 0,
        actions: deptActions.map(a => ({
          id: a.id,
          actionId: a.actionId,
          actionName: a.actionName,
          flowType: a.flowType,
          isActive: a.flowType !== 'none' && a.requiresApproval,
          defaultScope: a.teamScope,
          teamCount: a.teamScope === 'all' 
            ? (deptToTeams.get(dept.id) || []).length 
            : ((a.specificTeamIds as string[]) || []).length,
          hasWorkflow: a.flowType === 'workflow',
          slaHours: a.slaHours
        })),
        status: activeActions.length === deptActions.length && deptActions.length > 0 
          ? 'ok' 
          : activeActions.length > 0 
            ? 'warning' 
            : 'critical' as 'ok' | 'warning' | 'critical'
      };
    });

    const level3Summary = {
      totalActions: allActionConfigs.length,
      activeActions: allActionConfigs.filter(a => a.flowType !== 'none' && a.requiresApproval).length,
      inactiveActions: allActionConfigs.filter(a => a.flowType === 'none' || !a.requiresApproval).length,
      withWorkflow: allActionConfigs.filter(a => a.flowType === 'workflow').length,
      withDefault: allActionConfigs.filter(a => a.flowType === 'default').length
    };

    // ==================== LEVEL 4: TEAM-ACTION COVERAGE ====================
    
    // For each team, check if it's covered by active actions
    const level4Data = allTeams.map(team => {
      const teamDeptIds = teamToDepts.get(team.id) || [];
      const teamDeptCodes = teamDeptIds.map(id => deptMap.get(id)?.code).filter(Boolean) as string[];
      
      // Find actions that cover this team
      const coveringActions = allActionConfigs.filter(ac => {
        if (ac.flowType === 'none' || !ac.requiresApproval) return false;
        if (!teamDeptCodes.includes(ac.department)) return false;
        
        if (ac.teamScope === 'all') return true;
        if (ac.teamScope === 'specific') {
          const teamIds = (ac.specificTeamIds as string[]) || [];
          return teamIds.includes(team.id);
        }
        return false;
      });

      const memberCount = (teamMembers.get(team.id) || []).length;
      const observers = teamObserversMap.get(team.id) || [];
      
      return {
        teamId: team.id,
        teamName: team.name,
        teamType: team.teamType,
        departments: teamDeptCodes,
        memberCount,
        hasSupervisor: !!team.primarySupervisorUser,
        hasSecondarySupervisor: !!team.secondarySupervisorUser,
        observerCount: observers.length,
        coveredByActions: coveringActions.length,
        actions: coveringActions.map(a => ({
          actionId: a.actionId,
          actionName: a.actionName,
          flowType: a.flowType
        })),
        status: coveringActions.length > 0 ? 'ok' : 'warning' as 'ok' | 'warning' | 'critical'
      };
    });

    const level4Summary = {
      totalTeams: allTeams.length,
      teamsCoveredByActions: level4Data.filter(t => t.coveredByActions > 0).length,
      teamsNotCovered: level4Data.filter(t => t.coveredByActions === 0).length
    };

    // ==================== LEVEL 5: WORKFLOW HEALTH ====================
    
    const level5Data = allWorkflowTemplates.map(wf => {
      const usage = workflowUsage.get(wf.id);
      const usedInActions = allActionConfigs.filter(ac => 
        ac.workflowTemplateId === wf.id
      );
      
      const isUsedButDisabled = usedInActions.length > 0 && !wf.isActive;
      const neverUsed = !usage || usage.usageCount === 0;
      
      return {
        workflowId: wf.id,
        workflowName: wf.name,
        category: wf.category,
        isActive: wf.isActive,
        usageCount: usage?.usageCount || 0,
        lastUsed: usage?.lastUsed || null,
        usedInActionsCount: usedInActions.length,
        isUsedButDisabled,
        neverUsed: neverUsed && wf.isActive,
        status: isUsedButDisabled 
          ? 'critical' 
          : neverUsed && wf.isActive 
            ? 'warning' 
            : 'ok' as 'ok' | 'warning' | 'critical'
      };
    });

    const level5Summary = {
      totalWorkflows: allWorkflowTemplates.length,
      activeWorkflows: allWorkflowTemplates.filter(w => w.isActive).length,
      disabledWorkflows: allWorkflowTemplates.filter(w => !w.isActive).length,
      neverUsed: level5Data.filter(w => w.neverUsed).length,
      usedButDisabled: level5Data.filter(w => w.isUsedButDisabled).length
    };

    // ==================== HEALTH CHECKS ====================
    
    const healthChecks = {
      teamsWithoutSupervisor: allTeams
        .filter(t => !t.primarySupervisorUser)
        .map(t => ({ id: t.id, name: t.name, type: 'team_no_supervisor' })),
      
      actionsWithoutSLA: allActionConfigs
        .filter(a => a.flowType !== 'none' && a.requiresApproval && (!a.slaHours || a.slaHours === 0))
        .map(a => ({ id: a.id, name: a.actionName, department: a.department, type: 'action_no_sla' })),
      
      disabledWorkflowsInUse: level5Data
        .filter(w => w.isUsedButDisabled)
        .map(w => ({ id: w.workflowId, name: w.workflowName, usedInActions: w.usedInActionsCount, type: 'workflow_disabled_in_use' })),
      
      teamsWithoutMembers: allTeams
        .filter(t => (teamMembers.get(t.id) || []).length === 0)
        .map(t => ({ id: t.id, name: t.name, type: 'team_no_members' })),
      
      teamsWithoutObservers: allTeams
        .filter(t => (teamObserversMap.get(t.id) || []).length === 0)
        .map(t => ({ id: t.id, name: t.name, type: 'team_no_observers' }))
    };

    const totalIssues = 
      healthChecks.teamsWithoutSupervisor.length +
      healthChecks.actionsWithoutSLA.length +
      healthChecks.disabledWorkflowsInUse.length +
      healthChecks.teamsWithoutMembers.length;

    // ==================== OVERALL SCORE ====================
    
    const scores = {
      level1: level1Summary.totalDepartments > 0 
        ? Math.round((level1Summary.coveredDepartments / level1Summary.totalDepartments) * 100) 
        : 0,
      level2: level2Summary.totalUsers > 0 
        ? Math.round((level2Summary.usersWithTeam / level2Summary.totalUsers) * 100) 
        : 0,
      level3: level3Summary.totalActions > 0 
        ? Math.round((level3Summary.activeActions / level3Summary.totalActions) * 100) 
        : 0,
      level4: level4Summary.totalTeams > 0 
        ? Math.round((level4Summary.teamsCoveredByActions / level4Summary.totalTeams) * 100) 
        : 0,
      level5: level5Summary.totalWorkflows > 0 
        ? Math.round((level5Summary.activeWorkflows / level5Summary.totalWorkflows) * 100) 
        : 0
    };

    const overallScore = Math.round(
      (scores.level1 + scores.level2 + scores.level3 + scores.level4 + scores.level5) / 5
    );

    const overallHealth = overallScore >= 80 
      ? 'healthy' 
      : overallScore >= 50 
        ? 'warning' 
        : 'critical';

    // ==================== RESPONSE ====================
    
    res.json({
      success: true,
      data: {
        overview: {
          overallScore,
          overallHealth,
          scores,
          totalIssues
        },
        healthChecks,
        level1: {
          name: 'Team Coverage',
          description: 'Ogni dipartimento ha almeno un team?',
          summary: level1Summary,
          data: level1Data
        },
        level2: {
          name: 'User Coverage',
          description: 'Ogni utente appartiene ad almeno un team?',
          summary: level2Summary,
          data: level2Data
        },
        level3: {
          name: 'Action Coverage',
          description: 'Ogni azione ha un flusso attivo?',
          summary: level3Summary,
          data: level3Data
        },
        level4: {
          name: 'Team-Action Coverage',
          description: 'Ogni team è coperto da azioni attive?',
          summary: level4Summary,
          data: level4Data
        },
        level5: {
          name: 'Workflow Health',
          description: 'I workflow sono attivi e utilizzati?',
          summary: level5Summary,
          data: level5Data
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching coverage dashboard v2:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch coverage dashboard' });
  }
});

export default router;