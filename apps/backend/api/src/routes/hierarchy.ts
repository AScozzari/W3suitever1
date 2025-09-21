import { Router, Request, Response } from 'express';
import { eq, and, sql, asc, desc, isNull } from 'drizzle-orm';
import { db } from '../core/db';
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
  workflowInstances,
  workflowExecutions,
  insertWorkflowActionSchema,
  insertWorkflowTriggerSchema,
  insertWorkflowTemplateSchema,
  insertTeamSchema,
  insertTeamWorkflowAssignmentSchema,
  insertWorkflowInstanceSchema
} from '../db/schema/w3suite';
import { z } from 'zod';

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
    const serviceName = req.query.service as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const conditions = [eq(approvalWorkflows.tenantId, tenantId)];
    
    if (serviceName) {
      conditions.push(eq(approvalWorkflows.serviceName, serviceName));
    }
    
    const query = db
      .select()
      .from(approvalWorkflows)
      .where(and(...conditions))

    const workflows = await query.orderBy(desc(approvalWorkflows.priority));

    // Group workflows by service
    const groupedWorkflows = workflows.reduce((acc, workflow) => {
      if (!acc[workflow.serviceName]) {
        acc[workflow.serviceName] = [];
      }
      acc[workflow.serviceName].push(workflow);
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
router.get('/universal-requests', requirePermission('requests.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const { service, status, requester } = req.query;

    // Build query conditions
    let conditions = [eq(universalRequests.tenantId, tenantId)];
    
    if (service) {
      conditions.push(eq(universalRequests.serviceName, service as string));
    }
    if (status) {
      conditions.push(eq(universalRequests.status, status as string));
    }
    if (requester) {
      conditions.push(eq(universalRequests.requesterId, requester as string));
    }

    const requests = await db
      .select({
        id: universalRequests.id,
        serviceName: universalRequests.serviceName,
        requestType: universalRequests.requestType,
        requesterId: universalRequests.requesterId,
        requestData: universalRequests.requestData,
        status: universalRequests.status,
        currentLevel: universalRequests.currentLevel,
        approvalChain: universalRequests.approvalChain,
        priority: universalRequests.priority,
        dueDate: universalRequests.dueDate,
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

// POST /api/universal-requests - Create new request
router.post('/universal-requests', requirePermission('requests.create'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    
    if (!tenantId || !userId) {
      return res.status(400).json({ error: 'Tenant ID and User ID are required' });
    }

    const validatedData = insertUniversalRequestSchema.parse({
      ...req.body,
      tenantId,
      requesterId: userId,
      createdBy: userId,
      status: 'pending'
    });

    // Get applicable workflow
    const workflow = await db
      .select()
      .from(approvalWorkflows)
      .where(
        and(
          eq(approvalWorkflows.tenantId, tenantId),
          eq(approvalWorkflows.serviceName, validatedData.serviceName),
          eq(approvalWorkflows.workflowType, validatedData.requestType),
          eq(approvalWorkflows.isActive, true)
        )
      )
      .orderBy(desc(approvalWorkflows.priority))
      .limit(1);

    if (workflow.length === 0) {
      return res.status(400).json({ 
        error: `No active workflow found for ${validatedData.serviceName}/${validatedData.requestType}` 
      });
    }

    // Calculate approval chain based on workflow rules
    const approvalChain = await calculateApprovalChain(
      userId,
      tenantId,
      workflow[0].rules,
      validatedData.requestData
    );

    // Create request with approval chain
    const [newRequest] = await db
      .insert(universalRequests)
      .values({
        ...validatedData,
        approvalChain,
        currentLevel: 0,
        dueDate: calculateDueDate(workflow[0].rules)
      })
      .returning();

    res.json({
      success: true,
      request: newRequest
    });
  } catch (error) {
    console.error('Error creating universal request:', error);
    res.status(500).json({ error: 'Failed to create universal request' });
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
      conditions.push(eq(servicePermissions.serviceName, service as string));
    }

    const permissions = await db
      .select()
      .from(servicePermissions)
      .where(and(...conditions));

    // Group permissions by service
    const groupedPermissions = permissions.reduce((acc, perm) => {
      if (!acc[perm.serviceName]) {
        acc[perm.serviceName] = [];
      }
      acc[perm.serviceName].push({
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

// GET /api/teams - Get all teams for tenant
router.get('/teams', requirePermission('workflow.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const result = await db
      .select()
      .from(teams)
      .where(eq(teams.tenantId, tenantId))
      .orderBy(desc(teams.createdAt));

    res.json(result);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// POST /api/teams - Create new team
router.post('/teams', requirePermission('workflow.create'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = (req as any).user?.id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const teamData = {
      ...req.body,
      tenantId,
      createdBy: userId,
      updatedBy: userId
    };

    const validated = insertTeamSchema.parse(teamData);
    
    const result = await db
      .insert(teams)
      .values(validated)
      .returning();

    res.json(result[0]);
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// PATCH /api/teams/:id - Update team
router.patch('/teams/:id', requirePermission('workflow.update'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = (req as any).user?.id;
    const { id } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const result = await db
      .update(teams)
      .set({
        ...req.body,
        updatedBy: userId,
        updatedAt: new Date()
      })
      .where(and(
        eq(teams.id, id),
        eq(teams.tenantId, tenantId)
      ))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// DELETE /api/teams/:id - Delete team
router.delete('/teams/:id', requirePermission('workflow.delete'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const result = await db
      .delete(teams)
      .where(and(
        eq(teams.id, id),
        eq(teams.tenantId, tenantId)
      ))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

// GET /api/workflow-templates - Get workflow templates
router.get('/workflow-templates', requirePermission('workflow.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const category = req.query.category as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const conditions = [eq(workflowTemplates.tenantId, tenantId)];
    if (category) {
      conditions.push(eq(workflowTemplates.category, category));
    }

    const result = await db
      .select()
      .from(workflowTemplates)
      .where(and(...conditions))
      .orderBy(desc(workflowTemplates.createdAt));

    res.json(result);
  } catch (error) {
    console.error('Error fetching workflow templates:', error);
    res.status(500).json({ error: 'Failed to fetch workflow templates' });
  }
});

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

// GET /api/team-workflow-assignments - Get assignments
router.get('/team-workflow-assignments', requirePermission('workflow.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const result = await db
      .select()
      .from(teamWorkflowAssignments)
      .where(eq(teamWorkflowAssignments.tenantId, tenantId))
      .orderBy(desc(teamWorkflowAssignments.createdAt));

    res.json(result);
  } catch (error) {
    console.error('Error fetching team workflow assignments:', error);
    res.status(500).json({ error: 'Failed to fetch team workflow assignments' });
  }
});

// POST /api/team-workflow-assignments - Create assignment
router.post('/team-workflow-assignments', requirePermission('workflow.create'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = (req as any).user?.id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const assignmentData = {
      ...req.body,
      tenantId,
      createdBy: userId
    };

    const validated = insertTeamWorkflowAssignmentSchema.parse(assignmentData);
    
    const result = await db
      .insert(teamWorkflowAssignments)
      .values(validated)
      .returning();

    res.json(result[0]);
  } catch (error) {
    console.error('Error creating team workflow assignment:', error);
    res.status(500).json({ error: 'Failed to create team workflow assignment' });
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

    // Static base permissions
    const staticPermissions = [
      'dashboard.view',
      'dashboard.manage',
      'users.view',
      'users.manage',
      'stores.view',
      'stores.manage',
      'store.manage',
      'inventory.view',
      'inventory.manage',
      'pos.use',
      'customers.view',
      'customers.manage',
      'finance.view',
      'finance.manage',
      'reports.view',
      'reports.manage',
      'analytics.view',
      'analytics.manage',
      'hr.view',
      'hr.manage',
      'training.view',
      'training.manage',
      'sales.view',
      'sales.manage',
      'transactions.view',
      'transactions.manage',
      'cash.manage',
      'warehouse.view',
      'warehouse.manage',
      'products.view',
      'products.manage',
      'marketing.view',
      'marketing.manage',
      'campaigns.view',
      'campaigns.manage',
      // Workflow management permissions
      'workflow.read',
      'workflow.create',
      'workflow.update',
      'workflow.delete',
      // Hierarchy permissions
      'hierarchy.read',
      'hierarchy.create',
      'hierarchy.update',
      'hierarchy.delete',
      // RBAC permissions
      'rbac.permissions.read',
      'rbac.permissions.manage',
      // Other permissions
      'permissions.read',
      'permissions.write'
    ];

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

    // Fetch dynamic workflow triggers from database
    const triggers = await db
      .select({
        category: workflowTriggers.category,
        triggerId: workflowTriggers.triggerId,
        requiredPermission: workflowTriggers.requiredPermission
      })
      .from(workflowTriggers)
      .where(and(
        eq(workflowTriggers.tenantId, tenantId),
        eq(workflowTriggers.isActive, true)
      ));

    // Convert workflow actions to permissions
    const actionPermissions = actions.map(action => 
      action.requiredPermission || `workflow.action.${action.category}.${action.actionId}`
    );

    // Convert workflow triggers to permissions
    const triggerPermissions = triggers.map(trigger => 
      trigger.requiredPermission || `workflow.trigger.${trigger.category}.${trigger.triggerId}`
    );

    // Combine all permissions and remove duplicates
    const allPermissions = [...new Set([
      ...staticPermissions,
      ...actionPermissions,
      ...triggerPermissions
    ])];

    res.json({
      success: true,
      permissions: allPermissions
    });
  } catch (error) {
    console.error('Error fetching RBAC permissions:', error);
    res.status(500).json({ error: 'Failed to fetch RBAC permissions' });
  }
});

export default router;