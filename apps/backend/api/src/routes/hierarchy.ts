import { Router, Request, Response } from 'express';
import { eq, and, sql, asc, desc, isNull, inArray } from 'drizzle-orm';
import { db, setTenantContext } from '../core/db';
import { requirePermission } from '../middleware/tenant';
import { 
  organizationalStructure, 
  approvalWorkflows, 
  universalRequests,
  servicePermissions,
  users, 
  tenants,
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
  insertWorkflowInstanceSchema
} from '../db/schema/w3suite';
import { z } from 'zod';
import { workflowEngine } from '../services/workflow-engine';
import { detectWorkflowRoutingNodes } from '../utils/workflow-routing-utils';

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
        userProfileImage: users.profileImageUrl,
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
    const rootNodes = [];

    // First pass: create all nodes
    orgData.forEach(item => {
      hierarchyMap.set(item.userId, {
        ...item,
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
        validatedData.pathTree = [...parent[0].pathTree, validatedData.userId];
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
      conditions.push(eq(approvalWorkflows.category, category));
    }
    
    const query = db
      .select()
      .from(approvalWorkflows)
      .where(and(...conditions))

    const workflows = await query.orderBy(desc(approvalWorkflows.priority));

    // Group workflows by service
    const groupedWorkflows = workflows.reduce((acc, workflow) => {
      if (!acc[workflow.category]) {
        acc[workflow.category] = [];
      }
      acc[workflow.category].push(workflow);
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
      conditions.push(eq(servicePermissions.category, service as string));
    }

    const permissions = await db
      .select()
      .from(servicePermissions)
      .where(and(...conditions));

    // Group permissions by service
    const groupedPermissions = permissions.reduce((acc, perm) => {
      if (!acc[perm.category]) {
        acc[perm.category] = [];
      }
      acc[perm.category].push({
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
  
  return result.rows.length > 0 ? result.rows[0].user_id : null;
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
router.get('/teams', requirePermission('workflow.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const typeFilter = req.query.type as string | undefined; // e.g., "crm,sales"
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Build where conditions
    let whereCondition = eq(teams.tenantId, tenantId);
    
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

    res.json(allTeams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// POST /api/teams - Create new team with workflow assignments sync
router.post('/teams', requirePermission('teams.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = (req as any).user?.id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // 🎯 Extract workflowAssignments before validation (not part of teams table)
    const { workflowAssignments, ...teamData } = req.body;

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

    // 🎯 SYNC WORKFLOW ASSIGNMENTS: Save to team_workflow_assignments table
    if (workflowAssignments && Array.isArray(workflowAssignments) && workflowAssignments.length > 0) {
      // Valid department enum values (must match departmentEnum in schema)
      const validDepartments = ['hr', 'operations', 'support', 'finance', 'crm', 'sales', 'marketing'];
      
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
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // 🎯 Extract workflowAssignments before update (not part of teams table)
    const { workflowAssignments, ...teamData } = req.body;

    // 🎯 ENHANCED UPDATE: Support assignedDepartments updates
    await setTenantContext(tenantId);
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
        const validDepartments = ['hr', 'operations', 'support', 'finance', 'crm', 'sales', 'marketing'];
        
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

// GET /api/teams/:id/members - Get all members of a team (direct users + role-based users)
router.get('/teams/:id/members', requirePermission('teams.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const teamId = req.params.id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    await setTenantContext(tenantId);

    // 1. Get team with members
    const [team] = await db
      .select()
      .from(teams)
      .where(and(
        eq(teams.id, teamId),
        eq(teams.tenantId, tenantId)
      ));

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const memberMap = new Map();

    // 2. Get direct user members
    if (team.userMembers && team.userMembers.length > 0) {
      const directUsers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          membershipType: sql<string>`'direct'`,
        })
        .from(users)
        .where(
          and(
            eq(users.tenantId, tenantId),
            inArray(users.id, team.userMembers)
          )
        );

      directUsers.forEach(user => {
        memberMap.set(user.id, user);
      });
    }

    // 3. Get users via role assignments (roleMembers)
    if (team.roleMembers && team.roleMembers.length > 0) {
      const roleBasedUsers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          membershipType: sql<string>`'role'`,
        })
        .from(users)
        .innerJoin(userAssignments, eq(users.id, userAssignments.userId))
        .where(
          and(
            eq(users.tenantId, tenantId),
            inArray(userAssignments.roleId, team.roleMembers)
          )
        );

      roleBasedUsers.forEach(user => {
        if (!memberMap.has(user.id)) {
          memberMap.set(user.id, user);
        }
      });
    }

    const members = Array.from(memberMap.values());

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

    const conditions = [eq(workflowInstances.tenantId, tenantId)];

    if (status && status !== 'all') {
      conditions.push(eq(workflowInstances.status, status));
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
        initiatorId: userId || 'system',
        referenceId, // ✅ FIXED: Updated parameter name
        requestType,
        metadata
      }
    );

    res.status(201).json(instance);
  } catch (error: any) {
    console.error('Error creating workflow instance:', error);
    res.status(500).json({ error: error.message || 'Failed to create workflow instance' });
  }
});

// POST /api/workflow-instances/:id/approve - Approve workflow step
router.post('/workflow-instances/:id/approve', requirePermission('workflows.approve'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const instanceId = req.params.id;
    const userId = (req as any).user?.id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const { comment, attachments } = req.body;

    // Use workflow engine to process approval
    const result = await workflowEngine.processApproval({
      instanceId,
      approverId: userId || 'system',
      decision: 'approve',
      comment,
      attachments
    });

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
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const { reason, comment } = req.body;

    // Use workflow engine to process rejection
    const result = await workflowEngine.processApproval({
      instanceId,
      approverId: userId || 'system',
      decision: 'reject',
      comment: reason || comment
    });

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
 * Returns complete coverage analysis:
 * - Departments with their teams and workflow scopes
 * - Critical issues (teams without workflows, departments without teams)
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
        userMembers: teams.userMembers,
        roleMembers: teams.roleMembers,
        primarySupervisorUser: teams.primarySupervisorUser,
        primarySupervisorRole: teams.primarySupervisorRole,
        isActive: teams.isActive
      })
      .from(teams)
      .where(and(
        eq(teams.tenantId, tenantId),
        eq(teams.isActive, true)
      ));

    // 2. Get all workflow templates with their scopes
    const allTemplates = await db
      .select({
        id: workflowTemplates.id,
        name: workflowTemplates.name,
        category: workflowTemplates.category,
        templateType: workflowTemplates.templateType,
        isActive: workflowTemplates.isActive
      })
      .from(workflowTemplates)
      .where(and(
        eq(workflowTemplates.tenantId, tenantId),
        eq(workflowTemplates.isActive, true)
      ));

    // 3. Get all team workflow assignments
    const allAssignments = await db
      .select({
        id: teamWorkflowAssignments.id,
        teamId: teamWorkflowAssignments.teamId,
        templateId: teamWorkflowAssignments.templateId,
        forDepartment: teamWorkflowAssignments.forDepartment,
        isActive: teamWorkflowAssignments.isActive
      })
      .from(teamWorkflowAssignments)
      .where(and(
        eq(teamWorkflowAssignments.tenantId, tenantId),
        eq(teamWorkflowAssignments.isActive, true)
      ));

    // 4. Define all possible departments
    const allDepartments = ['hr', 'operations', 'support', 'finance', 'crm', 'sales', 'marketing'];

    // 5. Build coverage analysis per department
    const departmentCoverage = allDepartments.map(dept => {
      // Teams assigned to this department
      const teamsForDept = allTeams.filter(t => 
        t.assignedDepartments && t.assignedDepartments.includes(dept)
      );

      // Workflow templates for this department (by category)
      const templatesForDept = allTemplates.filter(t => 
        t.category?.toLowerCase() === dept
      );

      // Unique scopes available (templateType)
      const availableScopes = [...new Set(templatesForDept.map(t => t.templateType))];

      // Workflow assignments for teams in this department
      const assignmentsForDept = allAssignments.filter(a => 
        a.forDepartment?.toLowerCase() === dept
      );

      // Scopes covered by team assignments
      const coveredScopes = assignmentsForDept
        .map(a => {
          const template = templatesForDept.find(t => t.id === a.templateId);
          return template?.templateType;
        })
        .filter(Boolean);

      // Scopes NOT covered
      const uncoveredScopes = availableScopes.filter(s => !coveredScopes.includes(s));

      // Calculate status
      let status: 'ok' | 'warning' | 'critical' = 'ok';
      if (teamsForDept.length === 0) {
        status = 'critical';
      } else if (uncoveredScopes.length > 0) {
        status = 'warning';
      }

      // Count members in teams for this department
      const totalMembers = teamsForDept.reduce((sum, t) => {
        const userCount = (t.userMembers || []).length;
        const roleCount = (t.roleMembers || []).length;
        return sum + userCount + roleCount;
      }, 0);

      return {
        department: dept,
        departmentLabel: dept.charAt(0).toUpperCase() + dept.slice(1),
        status,
        teams: teamsForDept.map(t => ({
          id: t.id,
          name: t.name,
          memberCount: (t.userMembers || []).length + (t.roleMembers || []).length,
          hasSupervisor: !!(t.primarySupervisorUser || t.primarySupervisorRole)
        })),
        teamCount: teamsForDept.length,
        totalMembers,
        workflows: {
          available: templatesForDept.map(t => ({
            id: t.id,
            name: t.name,
            scope: t.templateType
          })),
          availableCount: templatesForDept.length,
          coveredScopes,
          uncoveredScopes,
          coveragePercent: availableScopes.length > 0 
            ? Math.round((coveredScopes.length / availableScopes.length) * 100) 
            : 100
        }
      };
    });

    // 6. Calculate summary metrics
    const criticalDepartments = departmentCoverage.filter(d => d.status === 'critical');
    const warningDepartments = departmentCoverage.filter(d => d.status === 'warning');
    const okDepartments = departmentCoverage.filter(d => d.status === 'ok');

    // 7. Find teams without any workflow assignments
    const teamsWithoutWorkflows = allTeams.filter(team => {
      const hasAssignments = allAssignments.some(a => a.teamId === team.id);
      return !hasAssignments;
    }).map(t => ({
      id: t.id,
      name: t.name,
      departments: t.assignedDepartments || []
    }));

    res.json({
      success: true,
      data: {
        summary: {
          totalDepartments: allDepartments.length,
          criticalCount: criticalDepartments.length,
          warningCount: warningDepartments.length,
          okCount: okDepartments.length,
          overallHealth: criticalDepartments.length > 0 ? 'critical' 
            : warningDepartments.length > 0 ? 'warning' : 'healthy'
        },
        departments: departmentCoverage,
        criticalIssues: {
          departmentsWithoutTeams: criticalDepartments.map(d => d.department),
          teamsWithoutWorkflows
        }
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
        isActive: users.isActive
      })
      .from(users)
      .where(and(
        eq(users.tenantId, tenantId),
        eq(users.isActive, true)
      ));

    // 2. Get all active teams with their members and departments
    const allTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        assignedDepartments: teams.assignedDepartments,
        userMembers: teams.userMembers,
        roleMembers: teams.roleMembers
      })
      .from(teams)
      .where(and(
        eq(teams.tenantId, tenantId),
        eq(teams.isActive, true)
      ));

    // 3. Build user-to-department coverage map
    const userCoverage = new Map<string, Set<string>>();
    
    // Initialize all users with empty coverage
    allUsers.forEach(user => {
      userCoverage.set(user.id, new Set());
    });

    // Add department coverage based on team membership
    allTeams.forEach(team => {
      const teamDepartments = team.assignedDepartments || [];
      const teamMembers = team.userMembers || [];
      
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
    const allDepartments = ['hr', 'operations', 'support', 'finance', 'crm', 'sales', 'marketing'];
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

export default router;