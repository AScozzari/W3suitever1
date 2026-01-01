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
  insertActionConfigurationSchema,
  actionTeamOverrides,
  insertActionTeamOverrideSchema
} from '../db/schema/w3suite';
import { actionDefinitions } from '../db/schema/public';
import { logger } from '../core/logger';
import { z } from 'zod';
import { departmentEnum, ALL_DEPARTMENT_CODES } from '../core/constants/departments';

const router = Router();

// ==================== GET ALL ACTIONS BY DEPARTMENT ====================

router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const { department, actionCategory } = req.query;

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
        actionCategory: actionConfigurations.actionCategory,
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

    // Filtra per department e/o actionCategory
    let filteredActions = actions;
    if (department) {
      filteredActions = filteredActions.filter(a => a.department === department);
    }
    if (actionCategory && (actionCategory === 'operative' || actionCategory === 'query')) {
      filteredActions = filteredActions.filter(a => a.actionCategory === actionCategory);
    }

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
  department: departmentEnum,
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
    const deptCodes = [...ALL_DEPARTMENT_CODES];
    const coverage: Record<string, any> = {};

    for (const dept of deptCodes) {
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
  try {
    const tenantId = req.tenant?.id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const deptList = await db
      .select({
        id: departments.id,
        code: departments.code,
        name: departments.name,
        description: departments.description,
        isActive: departments.isActive,
        sortOrder: departments.sortOrder
      })
      .from(departments)
      .where(
        and(
          eq(departments.tenantId, tenantId),
          eq(departments.isActive, true)
        )
      )
      .orderBy(departments.sortOrder, departments.name);

    res.json({
      departments: deptList.map(d => ({
        id: d.code,
        code: d.code,
        name: d.name,
        description: d.description || ''
      }))
    });
  } catch (error) {
    logger.error('❌ [ACTION-CONFIG] Error fetching departments', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
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

// ==================== TOGGLE ACTION ENABLE/DISABLE ====================
// Toggle isActive - if config doesn't exist, create it from action_definitions

router.patch('/toggle/:department/:actionId', async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;
    const { department, actionId } = req.params;
    const { isActive } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive boolean required' });
    }

    // Check if configuration already exists
    const [existing] = await db
      .select()
      .from(actionConfigurations)
      .where(
        and(
          eq(actionConfigurations.tenantId, tenantId),
          eq(actionConfigurations.department, department as any),
          eq(actionConfigurations.actionId, actionId)
        )
      )
      .limit(1);

    if (existing) {
      // Update existing configuration
      const [updated] = await db
        .update(actionConfigurations)
        .set({ 
          isActive, 
          updatedAt: new Date(),
          updatedBy: userId 
        })
        .where(eq(actionConfigurations.id, existing.id))
        .returning();

      logger.info('✅ [ACTION-CONFIG] Action toggled', {
        id: updated.id,
        department,
        actionId,
        isActive
      });

      return res.json(updated);
    }

    // Configuration doesn't exist - create from action_definitions
    const [definition] = await db
      .select()
      .from(actionDefinitions)
      .where(
        and(
          eq(actionDefinitions.department, department),
          eq(actionDefinitions.actionId, actionId)
        )
      )
      .limit(1);

    if (!definition) {
      return res.status(404).json({ 
        error: 'Action definition not found',
        message: `Nessuna definizione trovata per ${department}/${actionId}`
      });
    }

    // Create configuration from definition with requested isActive state
    const [newConfig] = await db
      .insert(actionConfigurations)
      .values({
        tenantId,
        department: definition.department as any,
        actionId: definition.actionId,
        actionName: definition.name,
        description: definition.description,
        requiresApproval: definition.defaultRequiresApproval ?? false,
        flowType: (definition.defaultFlowType as any) || 'default',
        isActive,
        slaHours: 24,
        escalationEnabled: true,
        priority: definition.displayOrder ?? 100,
        metadata: { 
          fromDefinition: true, 
          definitionId: definition.id,
          assignments: [] 
        },
        createdBy: userId,
        updatedBy: userId
      })
      .returning();

    logger.info('✅ [ACTION-CONFIG] Configuration created from definition', {
      id: newConfig.id,
      department,
      actionId,
      isActive
    });

    res.status(201).json(newConfig);

  } catch (error) {
    logger.error('❌ [ACTION-CONFIG] Error toggling action', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to toggle action' });
  }
});

// ==================== SEED ALL CONFIGURATIONS FROM DEFINITIONS ====================
// Creates configurations for all action_definitions that don't have one yet

router.post('/seed', async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    // Get all action definitions
    const definitions = await db
      .select()
      .from(actionDefinitions)
      .where(eq(actionDefinitions.isActive, true));

    // Get existing configurations for this tenant
    const existingConfigs = await db
      .select({
        department: actionConfigurations.department,
        actionId: actionConfigurations.actionId
      })
      .from(actionConfigurations)
      .where(eq(actionConfigurations.tenantId, tenantId));

    // Create a set of existing department+actionId combinations
    const existingSet = new Set(
      existingConfigs.map(c => `${c.department}:${c.actionId}`)
    );

    // Filter definitions that don't have configurations yet
    const toCreate = definitions.filter(
      d => !existingSet.has(`${d.department}:${d.actionId}`)
    );

    if (toCreate.length === 0) {
      return res.json({
        success: true,
        message: 'All definitions already have configurations',
        created: 0,
        total: definitions.length
      });
    }

    // Insert all missing configurations (with isActive = true by default)
    const inserted = await db
      .insert(actionConfigurations)
      .values(
        toCreate.map(def => ({
          tenantId,
          department: def.department as any,
          actionId: def.actionId,
          actionName: def.name,
          description: def.description,
          requiresApproval: def.defaultRequiresApproval ?? false,
          flowType: (def.defaultFlowType as any) || 'default',
          isActive: true,
          slaHours: 24,
          escalationEnabled: true,
          priority: def.displayOrder ?? 100,
          metadata: { 
            fromDefinition: true, 
            definitionId: def.id,
            assignments: [] 
          },
          createdBy: userId,
          updatedBy: userId
        }))
      )
      .returning();

    logger.info('✅ [ACTION-CONFIG] Seeded configurations from definitions', {
      tenantId,
      created: inserted.length,
      total: definitions.length
    });

    res.json({
      success: true,
      message: `Created ${inserted.length} configurations`,
      created: inserted.length,
      total: definitions.length,
      configs: inserted
    });

  } catch (error) {
    logger.error('❌ [ACTION-CONFIG] Error seeding configurations', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to seed configurations' });
  }
});

// ==================== ACTION TEAM OVERRIDES ====================
// Override per-team: permette di avere flowType diversi per team diversi sulla stessa azione

// GET overrides per una action configuration
router.get('/:actionConfigId/team-overrides', async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const { actionConfigId } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const overrides = await db
      .select({
        id: actionTeamOverrides.id,
        tenantId: actionTeamOverrides.tenantId,
        actionConfigId: actionTeamOverrides.actionConfigId,
        teamId: actionTeamOverrides.teamId,
        teamName: teams.name,
        flowType: actionTeamOverrides.flowType,
        workflowTemplateId: actionTeamOverrides.workflowTemplateId,
        workflowName: workflowTemplates.name,
        slaHoursOverride: actionTeamOverrides.slaHoursOverride,
        priority: actionTeamOverrides.priority,
        isActive: actionTeamOverrides.isActive,
        createdAt: actionTeamOverrides.createdAt,
        updatedAt: actionTeamOverrides.updatedAt
      })
      .from(actionTeamOverrides)
      .leftJoin(teams, eq(teams.id, actionTeamOverrides.teamId))
      .leftJoin(workflowTemplates, eq(workflowTemplates.id, actionTeamOverrides.workflowTemplateId))
      .where(
        and(
          eq(actionTeamOverrides.actionConfigId, actionConfigId),
          eq(actionTeamOverrides.tenantId, tenantId)
        )
      )
      .orderBy(actionTeamOverrides.priority);

    res.json({
      overrides,
      total: overrides.length
    });

  } catch (error) {
    logger.error('❌ [ACTION-CONFIG] Error fetching team overrides', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to fetch team overrides' });
  }
});

// CREATE team override
router.post('/:actionConfigId/team-overrides', async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;
    const { actionConfigId } = req.params;
    const { teamId, flowType, workflowTemplateId, slaHoursOverride, priority } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    if (!teamId || !flowType) {
      return res.status(400).json({ error: 'teamId and flowType are required' });
    }

    // Validate flowType
    if (!['none', 'default', 'workflow'].includes(flowType)) {
      return res.status(400).json({ error: 'Invalid flowType. Must be: none, default, or workflow' });
    }

    // If flowType is 'workflow', workflowTemplateId is required
    if (flowType === 'workflow' && !workflowTemplateId) {
      return res.status(400).json({ error: 'workflowTemplateId is required when flowType is workflow' });
    }

    // Check if action config exists
    const [actionConfig] = await db
      .select()
      .from(actionConfigurations)
      .where(
        and(
          eq(actionConfigurations.id, actionConfigId),
          eq(actionConfigurations.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!actionConfig) {
      return res.status(404).json({ error: 'Action configuration not found' });
    }

    // Check if team exists
    const [team] = await db
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.id, teamId),
          eq(teams.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Create override
    const [override] = await db
      .insert(actionTeamOverrides)
      .values({
        tenantId,
        actionConfigId,
        teamId,
        flowType: flowType as any,
        workflowTemplateId: flowType === 'workflow' ? workflowTemplateId : null,
        slaHoursOverride: slaHoursOverride || null,
        priority: priority || 100,
        isActive: true,
        createdBy: userId,
        updatedBy: userId
      })
      .returning();

    logger.info('✅ [ACTION-CONFIG] Team override created', {
      tenantId,
      actionConfigId,
      teamId,
      flowType
    });

    res.json({
      success: true,
      override,
      message: `Override creato per il team ${team.name}`
    });

  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Override already exists for this team' });
    }
    logger.error('❌ [ACTION-CONFIG] Error creating team override', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to create team override' });
  }
});

// UPDATE team override
router.patch('/:actionConfigId/team-overrides/:overrideId', async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const userId = req.user?.id;
    const { actionConfigId, overrideId } = req.params;
    const { flowType, workflowTemplateId, slaHoursOverride, priority, isActive } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    // Validate flowType if provided
    if (flowType && !['none', 'default', 'workflow'].includes(flowType)) {
      return res.status(400).json({ error: 'Invalid flowType. Must be: none, default, or workflow' });
    }

    // If flowType is 'workflow', workflowTemplateId is required
    if (flowType === 'workflow' && !workflowTemplateId) {
      return res.status(400).json({ error: 'workflowTemplateId is required when flowType is workflow' });
    }

    const updateData: any = {
      updatedAt: new Date(),
      updatedBy: userId
    };

    if (flowType !== undefined) updateData.flowType = flowType;
    if (workflowTemplateId !== undefined) updateData.workflowTemplateId = flowType === 'workflow' ? workflowTemplateId : null;
    if (slaHoursOverride !== undefined) updateData.slaHoursOverride = slaHoursOverride;
    if (priority !== undefined) updateData.priority = priority;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updated] = await db
      .update(actionTeamOverrides)
      .set(updateData)
      .where(
        and(
          eq(actionTeamOverrides.id, overrideId),
          eq(actionTeamOverrides.actionConfigId, actionConfigId),
          eq(actionTeamOverrides.tenantId, tenantId)
        )
      )
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Override not found' });
    }

    logger.info('✅ [ACTION-CONFIG] Team override updated', {
      tenantId,
      overrideId,
      changes: updateData
    });

    res.json({
      success: true,
      override: updated
    });

  } catch (error) {
    logger.error('❌ [ACTION-CONFIG] Error updating team override', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to update team override' });
  }
});

// DELETE team override
router.delete('/:actionConfigId/team-overrides/:overrideId', async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    const { actionConfigId, overrideId } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    const [deleted] = await db
      .delete(actionTeamOverrides)
      .where(
        and(
          eq(actionTeamOverrides.id, overrideId),
          eq(actionTeamOverrides.actionConfigId, actionConfigId),
          eq(actionTeamOverrides.tenantId, tenantId)
        )
      )
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: 'Override not found' });
    }

    logger.info('✅ [ACTION-CONFIG] Team override deleted', {
      tenantId,
      overrideId
    });

    res.json({
      success: true,
      message: 'Override eliminato'
    });

  } catch (error) {
    logger.error('❌ [ACTION-CONFIG] Error deleting team override', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    res.status(500).json({ error: 'Failed to delete team override' });
  }
});

export default router;
