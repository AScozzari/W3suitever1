/**
 * 🎯 ACTION CONFIGURATIONS API
 * 
 * API per gestire le configurazioni delle azioni per dipartimento.
 * Questa è la dashboard centralizzata per configurare:
 * - Quali azioni richiedono approvazione
 * - Tipo di flusso (none/default/workflow)
 * - Workflow abbinato
 * - Scope team (tutti o specifici)
 */

import { Router } from 'express';
import { db } from '../core/db';
import { eq, and, desc } from 'drizzle-orm';
import { 
  actionConfigurations,
  workflowTemplates,
  teams,
  teamDepartments,
  departments,
  insertActionConfigurationSchema
} from '../db/schema/w3suite';
import { logger } from '../core/logger';
import { z } from 'zod';

const router = Router();

// ==================== GET ALL ACTIONS BY DEPARTMENT ====================

router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const { department } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    let query = db
      .select({
        id: actionConfigurations.id,
        tenantId: actionConfigurations.tenantId,
        department: actionConfigurations.department,
        actionId: actionConfigurations.actionId,
        actionName: actionConfigurations.actionName,
        description: actionConfigurations.description,
        requiresApproval: actionConfigurations.requiresApproval,
        flowType: actionConfigurations.flowType,
        workflowTemplateId: actionConfigurations.workflowTemplateId,
        teamScope: actionConfigurations.teamScope,
        specificTeamIds: actionConfigurations.specificTeamIds,
        slaHours: actionConfigurations.slaHours,
        escalationEnabled: actionConfigurations.escalationEnabled,
        priority: actionConfigurations.priority,
        isActive: actionConfigurations.isActive,
        metadata: actionConfigurations.metadata,
        createdAt: actionConfigurations.createdAt,
        updatedAt: actionConfigurations.updatedAt
      })
      .from(actionConfigurations)
      .where(eq(actionConfigurations.tenantId, tenantId))
      .orderBy(actionConfigurations.department, actionConfigurations.priority);

    const actions = await query;

    // Se richiesto un department specifico, filtra
    const filteredActions = department 
      ? actions.filter(a => a.department === department)
      : actions;

    // Extract assignments from metadata and add as top-level field
    const actionsWithAssignments = filteredActions.map(action => {
      const metadata = action.metadata as Record<string, any> || {};
      return {
        ...action,
        assignments: metadata.assignments || []
      };
    });

    // Raggruppa per department
    const grouped = actionsWithAssignments.reduce((acc, action) => {
      if (!acc[action.department]) {
        acc[action.department] = [];
      }
      acc[action.department].push(action);
      return acc;
    }, {} as Record<string, typeof actionsWithAssignments>);

    res.json({
      actions: actionsWithAssignments,
      grouped,
      total: actionsWithAssignments.length
    });

  } catch (error) {
    logger.error('❌ [ACTION-CONFIG] Error fetching action configurations', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to fetch action configurations' });
  }
});

// ==================== GET SINGLE ACTION ====================

router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const [action] = await db
      .select()
      .from(actionConfigurations)
      .where(
        and(
          eq(actionConfigurations.id, id),
          eq(actionConfigurations.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!action) {
      return res.status(404).json({ error: 'Action configuration not found' });
    }

    // Se ha workflow abbinato, recupera info template
    let workflowTemplate = null;
    if (action.workflowTemplateId) {
      const [template] = await db
        .select({
          id: workflowTemplates.id,
          name: workflowTemplates.name,
          category: workflowTemplates.category,
          isActive: workflowTemplates.isActive
        })
        .from(workflowTemplates)
        .where(eq(workflowTemplates.id, action.workflowTemplateId))
        .limit(1);
      workflowTemplate = template;
    }

    // Se ha team specifici, recupera info team
    let specificTeams: any[] = [];
    if (action.teamScope === 'specific' && action.specificTeamIds && (action.specificTeamIds as string[]).length > 0) {
      for (const teamId of action.specificTeamIds as string[]) {
        const [team] = await db
          .select({
            id: teams.id,
            name: teams.name,
            teamType: teams.teamType
          })
          .from(teams)
          .where(eq(teams.id, teamId))
          .limit(1);
        if (team) specificTeams.push(team);
      }
    }

    res.json({
      ...action,
      workflowTemplate,
      specificTeams
    });

  } catch (error) {
    logger.error('❌ [ACTION-CONFIG] Error fetching action configuration', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to fetch action configuration' });
  }
});

// ==================== CREATE ACTION CONFIGURATION ====================

// Schema for individual assignment (workflow + teams pair)
const assignmentSchema = z.object({
  id: z.string().uuid(),
  flowType: z.enum(['default', 'workflow']),
  workflowTemplateId: z.string().uuid().optional().or(z.literal('')),
  teamScope: z.enum(['all', 'specific']),
  teamIds: z.array(z.string().uuid()).optional().default([])
});

const createActionSchema = z.object({
  department: z.enum(['hr', 'operations', 'support', 'finance', 'crm', 'sales', 'marketing', 'wms']),
  actionId: z.string().min(1).max(100),
  actionName: z.string().min(1).max(200),
  description: z.string().optional(),
  requiresApproval: z.boolean().default(false),
  // Legacy single assignment fields (for backward compatibility)
  flowType: z.enum(['none', 'default', 'workflow']).optional().default('none'),
  workflowTemplateId: z.string().uuid().optional().nullable(),
  teamScope: z.enum(['all', 'specific']).optional().default('all'),
  specificTeamIds: z.array(z.string().uuid()).optional().default([]),
  // NEW: Multiple assignments per action
  assignments: z.array(assignmentSchema).optional().default([]),
  slaHours: z.number().int().positive().optional().default(24),
  escalationEnabled: z.boolean().optional().default(true),
  priority: z.number().int().optional().default(100),
  metadata: z.record(z.any()).optional().default({})
});

router.post('/', async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const validationResult = createActionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      });
    }

    const data = validationResult.data;

    // Verifica che non esista già un'azione con stesso department + actionId
    const [existing] = await db
      .select({ id: actionConfigurations.id })
      .from(actionConfigurations)
      .where(
        and(
          eq(actionConfigurations.tenantId, tenantId),
          eq(actionConfigurations.department, data.department as any),
          eq(actionConfigurations.actionId, data.actionId)
        )
      )
      .limit(1);

    if (existing) {
      return res.status(409).json({ 
        error: 'Action already exists', 
        message: `Azione "${data.actionId}" già configurata per dipartimento ${data.department}` 
      });
    }

    // Se flowType = 'workflow', verifica che workflowTemplateId sia valido
    if (data.flowType === 'workflow' && data.workflowTemplateId) {
      const [template] = await db
        .select({ id: workflowTemplates.id })
        .from(workflowTemplates)
        .where(
          and(
            eq(workflowTemplates.id, data.workflowTemplateId),
            eq(workflowTemplates.isActive, true)
          )
        )
        .limit(1);

      if (!template) {
        return res.status(400).json({ 
          error: 'Invalid workflow template',
          message: 'Il workflow selezionato non esiste o non è attivo'
        });
      }
    }

    // Build metadata with assignments
    const metadataWithAssignments = {
      ...data.metadata,
      assignments: data.assignments || []
    };

    // Determine flowType from first assignment if using new format
    let effectiveFlowType = data.flowType || 'none';
    let effectiveWorkflowId = data.workflowTemplateId;
    let effectiveTeamScope = data.teamScope || 'all';
    let effectiveTeamIds = data.specificTeamIds || [];

    if (data.assignments && data.assignments.length > 0) {
      // Use first assignment for legacy columns (backward compatibility)
      const firstAssignment = data.assignments[0];
      effectiveFlowType = firstAssignment.flowType;
      effectiveWorkflowId = firstAssignment.workflowTemplateId || null;
      effectiveTeamScope = firstAssignment.teamScope;
      effectiveTeamIds = firstAssignment.teamIds || [];
    }

    const [newAction] = await db
      .insert(actionConfigurations)
      .values({
        tenantId,
        department: data.department as any,
        actionId: data.actionId,
        actionName: data.actionName,
        description: data.description,
        requiresApproval: data.requiresApproval,
        flowType: effectiveFlowType as any,
        workflowTemplateId: effectiveWorkflowId,
        teamScope: effectiveTeamScope as any,
        specificTeamIds: effectiveTeamIds,
        slaHours: data.slaHours,
        escalationEnabled: data.escalationEnabled,
        priority: data.priority,
        metadata: metadataWithAssignments,
        createdBy: userId,
        updatedBy: userId
      })
      .returning();

    logger.info('✅ [ACTION-CONFIG] Action configuration created', {
      id: newAction.id,
      department: newAction.department,
      actionId: newAction.actionId
    });

    res.status(201).json(newAction);

  } catch (error) {
    logger.error('❌ [ACTION-CONFIG] Error creating action configuration', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to create action configuration' });
  }
});

// ==================== UPDATE ACTION CONFIGURATION ====================

const updateActionSchema = createActionSchema.partial();

router.put('/:id', async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const validationResult = updateActionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      });
    }

    // Verifica che l'azione esista
    const [existing] = await db
      .select()
      .from(actionConfigurations)
      .where(
        and(
          eq(actionConfigurations.id, id),
          eq(actionConfigurations.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Action configuration not found' });
    }

    const data = validationResult.data;

    // Se sta cambiando department + actionId, verifica unicità
    if (data.department && data.actionId) {
      if (data.department !== existing.department || data.actionId !== existing.actionId) {
        const [duplicate] = await db
          .select({ id: actionConfigurations.id })
          .from(actionConfigurations)
          .where(
            and(
              eq(actionConfigurations.tenantId, tenantId),
              eq(actionConfigurations.department, data.department as any),
              eq(actionConfigurations.actionId, data.actionId)
            )
          )
          .limit(1);

        if (duplicate && duplicate.id !== id) {
          return res.status(409).json({ 
            error: 'Action already exists',
            message: `Azione "${data.actionId}" già configurata per dipartimento ${data.department}`
          });
        }
      }
    }

    // Build metadata with assignments
    const existingMetadata = (existing.metadata as Record<string, any>) || {};
    const metadataWithAssignments = {
      ...existingMetadata,
      ...data.metadata,
      assignments: data.assignments || existingMetadata.assignments || []
    };

    // Determine effective values from assignments if present
    let effectiveFlowType = data.flowType || existing.flowType;
    let effectiveWorkflowId = data.workflowTemplateId ?? existing.workflowTemplateId;
    let effectiveTeamScope = data.teamScope || existing.teamScope;
    let effectiveTeamIds = data.specificTeamIds || existing.specificTeamIds;

    if (data.assignments && data.assignments.length > 0) {
      // Use first assignment for legacy columns (backward compatibility)
      const firstAssignment = data.assignments[0];
      effectiveFlowType = firstAssignment.flowType;
      effectiveWorkflowId = firstAssignment.workflowTemplateId || null;
      effectiveTeamScope = firstAssignment.teamScope;
      effectiveTeamIds = firstAssignment.teamIds || [];
    }

    const [updated] = await db
      .update(actionConfigurations)
      .set({
        department: data.department as any ?? existing.department,
        actionId: data.actionId ?? existing.actionId,
        actionName: data.actionName ?? existing.actionName,
        description: data.description ?? existing.description,
        requiresApproval: data.requiresApproval ?? existing.requiresApproval,
        flowType: effectiveFlowType as any,
        workflowTemplateId: effectiveWorkflowId,
        teamScope: effectiveTeamScope as any,
        specificTeamIds: effectiveTeamIds,
        slaHours: data.slaHours ?? existing.slaHours,
        escalationEnabled: data.escalationEnabled ?? existing.escalationEnabled,
        priority: data.priority ?? existing.priority,
        metadata: metadataWithAssignments,
        updatedAt: new Date(),
        updatedBy: userId
      })
      .where(
        and(
          eq(actionConfigurations.id, id),
          eq(actionConfigurations.tenantId, tenantId)
        )
      )
      .returning();

    logger.info('✅ [ACTION-CONFIG] Action configuration updated', {
      id: updated.id,
      department: updated.department,
      actionId: updated.actionId
    });

    res.json(updated);

  } catch (error) {
    logger.error('❌ [ACTION-CONFIG] Error updating action configuration', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to update action configuration' });
  }
});

// ==================== DELETE ACTION CONFIGURATION ====================

router.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const [deleted] = await db
      .delete(actionConfigurations)
      .where(
        and(
          eq(actionConfigurations.id, id),
          eq(actionConfigurations.tenantId, tenantId)
        )
      )
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Action configuration not found' });
    }

    logger.info('✅ [ACTION-CONFIG] Action configuration deleted', {
      id: deleted.id,
      department: deleted.department,
      actionId: deleted.actionId
    });

    res.json({ success: true, deleted });

  } catch (error) {
    logger.error('❌ [ACTION-CONFIG] Error deleting action configuration', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to delete action configuration' });
  }
});

// ==================== GET COVERAGE STATS ====================

router.get('/stats/coverage', async (req, res) => {
  try {
    const tenantId = req.tenant?.id;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const actions = await db
      .select()
      .from(actionConfigurations)
      .where(
        and(
          eq(actionConfigurations.tenantId, tenantId),
          eq(actionConfigurations.isActive, true)
        )
      );

    // Raggruppa per department e calcola coverage
    const departments = ['hr', 'operations', 'support', 'finance', 'crm', 'sales', 'marketing', 'wms'];
    const coverage: Record<string, any> = {};

    for (const dept of departments) {
      const deptActions = actions.filter(a => a.department === dept);
      coverage[dept] = {
        total: deptActions.length,
        withWorkflow: deptActions.filter(a => a.flowType === 'workflow').length,
        withDefaultFlow: deptActions.filter(a => a.flowType === 'default').length,
        noApproval: deptActions.filter(a => !a.requiresApproval || a.flowType === 'none').length,
        workflowCoveragePercent: deptActions.length > 0
          ? Math.round((deptActions.filter(a => a.flowType === 'workflow').length / deptActions.length) * 100)
          : 0
      };
    }

    res.json({
      coverage,
      totalActions: actions.length,
      totalWithWorkflow: actions.filter(a => a.flowType === 'workflow').length,
      totalWithDefaultFlow: actions.filter(a => a.flowType === 'default').length
    });

  } catch (error) {
    logger.error('❌ [ACTION-CONFIG] Error fetching coverage stats', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to fetch coverage stats' });
  }
});

// ==================== GET AVAILABLE DEPARTMENTS ====================

router.get('/meta/departments', async (req, res) => {
  res.json({
    departments: [
      { id: 'hr', name: 'Human Resources', description: 'Ferie, permessi, congedi' },
      { id: 'operations', name: 'Operations', description: 'Manutenzione, logistics, inventory' },
      { id: 'support', name: 'Support IT', description: 'Accessi, hardware, software' },
      { id: 'finance', name: 'Finance', description: 'Expenses, budgets, payments' },
      { id: 'crm', name: 'CRM', description: 'Customer relations, complaints, escalations' },
      { id: 'sales', name: 'Sales', description: 'Discount approvals, contract changes' },
      { id: 'marketing', name: 'Marketing', description: 'Campaigns, content, branding' },
      { id: 'wms', name: 'WMS', description: 'Warehouse movements, approvals, inventory' }
    ]
  });
});

// ==================== GET WORKFLOW TEMPLATES FOR DEPARTMENT ====================

router.get('/meta/workflows/:department', async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const { department } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const templates = await db
      .select({
        id: workflowTemplates.id,
        name: workflowTemplates.name,
        category: workflowTemplates.category,
        templateType: workflowTemplates.templateType,
        description: workflowTemplates.description,
        isActive: workflowTemplates.isActive
      })
      .from(workflowTemplates)
      .where(
        and(
          eq(workflowTemplates.tenantId, tenantId),
          eq(workflowTemplates.category, department),
          eq(workflowTemplates.isActive, true)
        )
      );

    res.json({ templates });

  } catch (error) {
    logger.error('❌ [ACTION-CONFIG] Error fetching workflow templates', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to fetch workflow templates' });
  }
});

// ==================== GET TEAMS FOR DEPARTMENT ====================

router.get('/meta/teams/:department', async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const { department } = req.params; // department code like 'hr', 'wms', etc.

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    // Teams are linked to departments via teamDepartments junction table
    // department param is a code (e.g., 'hr'), not a UUID
    // We need: teams → teamDepartments → departments (filter by code)
    const teamList = await db
      .selectDistinct({
        id: teams.id,
        name: teams.name,
        teamType: teams.teamType,
        primarySupervisorUser: teams.primarySupervisorUser
      })
      .from(teams)
      .innerJoin(teamDepartments, eq(teams.id, teamDepartments.teamId))
      .innerJoin(departments, eq(teamDepartments.departmentId, departments.id))
      .where(
        and(
          eq(teams.tenantId, tenantId),
          eq(departments.code, department), // Filter by department code
          eq(teams.isActive, true)
        )
      );

    res.json({ teams: teamList });

  } catch (error) {
    logger.error('❌ [ACTION-CONFIG] Error fetching teams', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// ==================== ESCALATION CHECK (Manual Trigger) ====================

router.post('/escalation/check', async (req, res) => {
  try {
    const { actionEscalationService } = await import('../services/action-escalation.service');
    const result = await actionEscalationService.runManualCheck();
    
    res.json({
      success: true,
      message: `Escalation check completed: ${result.escalated} requests escalated out of ${result.processed} processed`,
      ...result
    });

  } catch (error) {
    logger.error('❌ [ACTION-CONFIG] Error running escalation check', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to run escalation check' });
  }
});

export default router;
