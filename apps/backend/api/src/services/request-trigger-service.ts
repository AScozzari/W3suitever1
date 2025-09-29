import { eq, and, desc } from 'drizzle-orm';
import { db } from '../core/db.js';
import { 
  universalRequests, 
  teams, 
  teamWorkflowAssignments, 
  workflowInstances,
  workflowTemplates,
  type UniversalRequest,
  type InsertWorkflowInstance
} from '../db/schema/w3suite.js';
import { logger } from '../core/logger.js';

export interface RequestTriggerResult {
  success: boolean;
  workflowInstanceId?: string;
  message?: string;
  error?: string;
}

/**
 * Request Trigger Service
 * Automatizza la creazione di workflow instances quando arriva una universal request
 */
export class RequestTriggerService {
  
  /**
   * 🎯 MAIN METHOD: Triggered when a new universal request is created
   * Finds appropriate team and workflow, creates instance, and starts execution
   */
  static async triggerWorkflowForRequest(
    request: UniversalRequest, 
    tenantId: string
  ): Promise<RequestTriggerResult> {
    try {
      logger.info('🚀 Request Trigger Service: Starting workflow automation', {
        requestId: request.id,
        department: request.department,
        category: request.category,
        tenantId
      });

      // STEP 1: Find active team for this department
      const eligibleTeam = await this.findTeamForDepartment(request.department, tenantId);
      
      if (!eligibleTeam) {
        logger.warn('⚠️ No active team found for department', {
          department: request.department,
          tenantId,
          requestId: request.id
        });
        
        return {
          success: false,
          message: `No active team configured for department: ${request.department}`
        };
      }

      // STEP 2: Find workflow template assigned to this team for this department
      const workflowAssignment = await this.findWorkflowAssignment(
        eligibleTeam.id, 
        request.department, 
        tenantId
      );

      if (!workflowAssignment) {
        logger.warn('⚠️ No workflow template assigned to team for department', {
          teamId: eligibleTeam.id,
          teamName: eligibleTeam.name,
          department: request.department,
          tenantId,
          requestId: request.id
        });
        
        return {
          success: false,
          message: `No workflow template assigned to team "${eligibleTeam.name}" for department: ${request.department}`
        };
      }

      // STEP 3: Create workflow instance
      const workflowInstance = await this.createWorkflowInstance(
        workflowAssignment.templateId,
        request.id,
        tenantId,
        request.requesterId
      );

      // STEP 4: Update universal request with workflow instance ID
      await this.linkRequestToWorkflow(request.id, workflowInstance.id, tenantId);

      logger.info('✅ Request Trigger Service: Workflow automation completed successfully', {
        requestId: request.id,
        workflowInstanceId: workflowInstance.id,
        teamId: eligibleTeam.id,
        templateId: workflowAssignment.templateId,
        department: request.department,
        tenantId
      });

      return {
        success: true,
        workflowInstanceId: workflowInstance.id,
        message: `Workflow automatically assigned to team "${eligibleTeam.name}"`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error('❌ Request Trigger Service: Failed to trigger workflow', {
        error: errorMessage,
        requestId: request.id,
        tenantId,
        stack: errorStack
      });

      return {
        success: false,
        error: `Workflow automation failed: ${errorMessage}`
      };
    }
  }

  /**
   * 🔍 STEP 1: Find active team for department
   * Looks for teams that can handle requests for this department
   */
  private static async findTeamForDepartment(
    department: string, 
    tenantId: string
  ) {
    const eligibleTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        teamType: teams.teamType,
        assignedDepartments: teams.assignedDepartments
      })
      .from(teams)
      .where(and(
        eq(teams.tenantId, tenantId),
        eq(teams.isActive, true)
      ))
      .orderBy(desc(teams.createdAt));

    // Find team that handles this department
    for (const team of eligibleTeams) {
      const departments = team.assignedDepartments || [];
      if (departments.includes(department)) {
        logger.info('📋 Found eligible team for department', {
          teamId: team.id,
          teamName: team.name,
          department,
          assignedDepartments: departments
        });
        return team;
      }
    }

    return null;
  }

  /**
   * 🔍 STEP 2: Find workflow template assignment for team and department
   */
  private static async findWorkflowAssignment(
    teamId: string, 
    department: string, 
    tenantId: string
  ) {
    const [assignment] = await db
      .select({
        id: teamWorkflowAssignments.id,
        teamId: teamWorkflowAssignments.teamId,
        templateId: teamWorkflowAssignments.templateId,
        forDepartment: teamWorkflowAssignments.forDepartment,
        autoAssign: teamWorkflowAssignments.autoAssign,
        priority: teamWorkflowAssignments.priority,
        conditions: teamWorkflowAssignments.conditions,
        overrides: teamWorkflowAssignments.overrides
      })
      .from(teamWorkflowAssignments)
      .where(and(
        eq(teamWorkflowAssignments.tenantId, tenantId),
        eq(teamWorkflowAssignments.teamId, teamId),
        eq(teamWorkflowAssignments.forDepartment, department as any),
        eq(teamWorkflowAssignments.autoAssign, true),
        eq(teamWorkflowAssignments.isActive, true)
      ))
      .orderBy(desc(teamWorkflowAssignments.priority));

    if (assignment) {
      logger.info('📋 Found workflow assignment', {
        assignmentId: assignment.id,
        teamId: assignment.teamId,
        templateId: assignment.templateId,
        department: assignment.forDepartment,
        priority: assignment.priority
      });
    }

    return assignment;
  }

  /**
   * ⚡ STEP 3: Create workflow instance
   */
  private static async createWorkflowInstance(
    templateId: string,
    referenceId: string,
    tenantId: string,
    initiatorId: string
  ) {
    const workflowInstanceData: InsertWorkflowInstance = {
      tenantId,
      templateId,
      referenceId, // Link to universal request
      instanceType: 'approval',
      instanceName: `Auto-generated for request ${referenceId}`,
      category: 'request',
      currentStepId: '0',
      stepHistory: [],
      variables: {},
      metadata: {
        triggeredBy: 'request-trigger-service',
        autoCreated: true,
        timestamp: new Date().toISOString(),
        initiatorId
      },
      createdBy: initiatorId
    };

    const [newInstance] = await db
      .insert(workflowInstances)
      .values(workflowInstanceData)
      .returning();

    logger.info('⚡ Created workflow instance', {
      instanceId: newInstance.id,
      templateId,
      referenceId,
      tenantId
    });

    return newInstance;
  }

  /**
   * 🔗 STEP 4: Link universal request to workflow instance
   */
  private static async linkRequestToWorkflow(
    requestId: string,
    workflowInstanceId: string,
    tenantId: string
  ) {
    await db
      .update(universalRequests)
      .set({ 
        workflowInstanceId,
        status: 'pending', // Move from draft to pending
        submittedAt: new Date()
      })
      .where(and(
        eq(universalRequests.id, requestId),
        eq(universalRequests.tenantId, tenantId)
      ));

    logger.info('🔗 Linked request to workflow instance', {
      requestId,
      workflowInstanceId,
      tenantId
    });
  }

  /**
   * 🔍 HELPER: Get workflow automation status for a request
   */
  static async getAutomationStatus(requestId: string, tenantId: string) {
    const [request] = await db
      .select({
        id: universalRequests.id,
        workflowInstanceId: universalRequests.workflowInstanceId,
        status: universalRequests.status,
        department: universalRequests.department
      })
      .from(universalRequests)
      .where(and(
        eq(universalRequests.id, requestId),
        eq(universalRequests.tenantId, tenantId)
      ));

    return {
      hasWorkflow: !!request?.workflowInstanceId,
      workflowInstanceId: request?.workflowInstanceId,
      status: request?.status,
      department: request?.department
    };
  }
}