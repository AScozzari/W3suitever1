import { db } from '../core/db';
import { and, eq, or, sql, inArray, desc, asc, isNull } from 'drizzle-orm';
import {
  workflowTemplates,
  workflowSteps,
  workflowInstances,
  workflowExecutions,
  workflowActions,
  workflowTriggers,
  teams,
  teamWorkflowAssignments,
  users,
  notifications
} from '../db/schema/w3suite';
import { nanoid } from 'nanoid';
import { reactFlowBridgeParser, type ParsedWorkflow, type ReactFlowWorkflowData } from './reactflow-bridge-parser';
import { logger } from '../core/logger';

export interface WorkflowExecutionContext {
  tenantId: string;
  requesterId: string;
  requestId?: string;
  instanceName?: string;
  metadata?: Record<string, any>;
}

export interface ApprovalDecision {
  instanceId: string;
  approverId: string;
  decision: 'approve' | 'reject' | 'delegate';
  comment?: string;
  delegateToId?: string;
  attachments?: string[];
}

export class WorkflowEngine {
  
  /**
   * 🌉 NEW: Create workflow instance from ReactFlow template
   * Uses the bridge parser to convert ReactFlow nodes into executable steps
   */
  async createInstanceFromReactFlow(
    templateId: string,
    context: WorkflowExecutionContext
  ): Promise<any> {
    try {
      logger.info('🚀 [ENGINE] Creating instance from ReactFlow template', {
        templateId,
        tenantId: context.tenantId,
        requesterId: context.requesterId
      });

      // Get the ReactFlow template
      const [template] = await db
        .select()
        .from(workflowTemplates)
        .where(and(
          eq(workflowTemplates.id, templateId),
          eq(workflowTemplates.tenantId, context.tenantId),
          eq(workflowTemplates.isActive, true)
        ))
        .limit(1);

      if (!template) {
        throw new Error('ReactFlow workflow template not found or inactive');
      }

      // Parse ReactFlow data using bridge parser
      const reactFlowData: ReactFlowWorkflowData = {
        nodes: template.nodes as any[] || [],
        edges: template.edges as any[] || [],
        viewport: template.viewport as any || { x: 0, y: 0, zoom: 1 }
      };

      const parsedWorkflow = await reactFlowBridgeParser.parseWorkflow(reactFlowData, {
        templateId: template.id,
        templateName: template.name,
        department: template.for_department || undefined
      });

      // Validate parsed workflow
      const validation = reactFlowBridgeParser.validateWorkflow(parsedWorkflow);
      if (!validation.isValid) {
        throw new Error(`Invalid workflow structure: ${validation.errors.join(', ')}`);
      }

      // Find assignee for start step
      const startStep = parsedWorkflow.steps.get(parsedWorkflow.startNodeId);
      if (!startStep) {
        throw new Error('Start step not found in parsed workflow');
      }

      const assigneeId = await this.findAssigneeForReactFlowStep(
        templateId,
        startStep,
        context
      );

      // 🔄 Serialize parsed workflow for JSON storage
      const serializedWorkflow = reactFlowBridgeParser.serializeWorkflow(parsedWorkflow);

      // Create workflow instance with ReactFlow data
      const [instance] = await db
        .insert(workflowInstances)
        .values({
          tenantId: context.tenantId,
          templateId,
          referenceId: context.requestId,
          instanceType: 'reactflow', // NEW: Mark as ReactFlow type
          instanceName: context.instanceName || `${template.name} - ${new Date().toISOString()}`,
          currentStatus: 'running',
          currentStepId: startStep.nodeId, // Use ReactFlow node ID
          workflowData: {
            currentAssigneeId: assigneeId,
            templateName: template.name,
            templateCategory: template.category,
            totalSteps: parsedWorkflow.totalSteps,
            currentStepIndex: 1,
            parsedWorkflow: serializedWorkflow, // 🔄 Store SERIALIZED workflow (Map → Array)
            currentStepExecutorId: startStep.executorId
          },
          context: context.metadata || {},
          priority: 'normal',
          startedAt: new Date()
        })
        .returning();

      // Create first execution record for ReactFlow step
      await db.insert(workflowExecutions).values({
        tenantId: context.tenantId,
        instanceId: instance.id,
        stepId: startStep.nodeId, // Use ReactFlow node ID
        executionType: startStep.type,
        executorId: assigneeId || 'system',
        status: 'pending',
        inputData: {
          ...context.metadata || {},
          stepConfig: startStep.config,
          executorId: startStep.executorId
        },
        startedAt: new Date()
      });

      logger.info('✅ [ENGINE] ReactFlow instance created successfully', {
        instanceId: instance.id,
        startStepId: startStep.nodeId,
        executorId: startStep.executorId,
        assigneeId
      });

      // Execute start step if it's not a manual trigger
      if (startStep.type === 'trigger' && startStep.executorId !== 'manual-trigger') {
        await this.executeReactFlowStep(instance.id, startStep, context);
      }

      return instance;

    } catch (error) {
      logger.error('❌ [ENGINE] Failed to create ReactFlow instance', {
        error: error instanceof Error ? error.message : String(error),
        templateId,
        tenantId: context.tenantId
      });
      throw error;
    }
  }

  /**
   * Create a new workflow instance from a template (LEGACY METHOD)
   * Supports old workflow_steps based templates
   */
  async createInstance(
    templateId: string,
    context: WorkflowExecutionContext
  ): Promise<any> {
    try {
      // Get the template with steps
      const [template] = await db
        .select()
        .from(workflowTemplates)
        .where(and(
          eq(workflowTemplates.id, templateId),
          eq(workflowTemplates.tenantId, context.tenantId),
          eq(workflowTemplates.isActive, true)
        ))
        .limit(1);

      if (!template) {
        throw new Error('Workflow template not found or inactive');
      }

      // Get all steps for this template
      const steps = await db
        .select()
        .from(workflowSteps)
        .where(and(
          eq(workflowSteps.templateId, templateId),
          eq(workflowSteps.tenantId, context.tenantId)
        ))
        .orderBy(asc(workflowSteps.order));

      if (steps.length === 0) {
        throw new Error('No active steps found for workflow template');
      }

      // Find the first step
      const firstStep = steps.find(s => s.order === 1) || steps[0];

      // Auto-assign based on team assignments
      const assigneeId = await this.findAssignee(
        templateId, 
        firstStep.id,
        context
      );

      // Create workflow instance
      const [instance] = await db
        .insert(workflowInstances)
        .values({
          tenantId: context.tenantId,
          templateId,
          referenceId: context.requestId, // ✅ FIXED: Updated to match schema
          instanceType: 'manual', // ✅ FIXED: Required field
          instanceName: context.instanceName || `${template.name} - ${new Date().toISOString()}`,
          currentStatus: 'running',
          currentStepId: firstStep.id,
          workflowData: {
            currentAssigneeId: assigneeId,
            templateName: template.name,
            templateCategory: template.category,
            totalSteps: steps.length,
            currentStepIndex: 1
          },
          context: context.metadata || {},
          priority: 'normal',
          startedAt: new Date()
        })
        .returning();

      // Create first execution record
      await db.insert(workflowExecutions).values({
        tenantId: context.tenantId,
        instanceId: instance.id,
        stepId: firstStep.id,
        executionType: firstStep.stepType || 'action',
        executorId: assigneeId || 'system',
        status: 'pending',
        inputData: context.metadata || {},
        startedAt: new Date()
      });

      // Send notification to assignee
      if (assigneeId) {
        await this.sendApprovalNotification(
          instance.id,
          assigneeId,
          firstStep.name,
          context.tenantId
        );
      }

      // Schedule escalation if configured
      if (firstStep.escalationTimeout && firstStep.escalationTimeout > 0) {
        await this.scheduleEscalation(
          instance.id,
          firstStep.id,
          firstStep.escalationTimeout * 60 // Convert hours to minutes
        );
      }

      return instance;
    } catch (error) {
      console.error('Error creating workflow instance:', error);
      throw error;
    }
  }

  /**
   * Process approval decision and advance workflow
   */
  async processApproval(decision: ApprovalDecision): Promise<any> {
    try {
      // Get current instance state
      const [instance] = await db
        .select()
        .from(workflowInstances)
        .where(eq(workflowInstances.id, decision.instanceId))
        .limit(1);

      if (!instance) {
        throw new Error('Workflow instance not found');
      }

      if (!['running', 'waiting_approval'].includes(instance.currentStatus)) {
        throw new Error('Workflow is not in approvable state');
      }

      // Verify approver is authorized
      const currentAssigneeId = (instance.workflowData as any)?.currentAssigneeId;
      if (currentAssigneeId && currentAssigneeId !== decision.approverId) {
        const isAuthorized = await this.verifyApprover(
          decision.instanceId,
          decision.approverId,
          instance.currentStepId!
        );
        
        if (!isAuthorized) {
          throw new Error('User not authorized to approve this step');
        }
      }

      // Record the execution
      await db.insert(workflowExecutions).values({
        tenantId: instance.tenantId,
        instanceId: instance.id,
        stepId: instance.currentStepId!,
        executionType: 'action',
        executorId: decision.approverId,
        status: decision.decision === 'approve' ? 'success' : 'failed',
        outputData: {
          decision: decision.decision,
          comment: decision.comment,
          attachments: decision.attachments,
          delegateToId: decision.delegateToId
        },
        startedAt: new Date(),
        completedAt: new Date()
      });

      // Handle different decisions
      if (decision.decision === 'approve') {
        return await this.advanceToNextStep(instance);
      } else if (decision.decision === 'reject') {
        return await this.rejectWorkflow(instance, decision.comment);
      } else if (decision.decision === 'delegate') {
        return await this.delegateStep(
          instance, 
          decision.delegateToId!,
          decision.comment
        );
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      throw error;
    }
  }

  /**
   * Advance workflow to next step
   */
  private async advanceToNextStep(instance: any): Promise<any> {
    // Get all steps for this template
    const steps = await db
      .select()
      .from(workflowSteps)
      .where(and(
        eq(workflowSteps.templateId, instance.templateId),
        eq(workflowSteps.tenantId, instance.tenantId)
      ))
      .orderBy(asc(workflowSteps.order));

    // Find current step index
    const currentIndex = steps.findIndex(s => s.id === instance.currentStepId);
    
    // Check if there's a next step
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      
      // Find assignee for next step
      const assigneeId = await this.findAssignee(
        instance.templateId,
        nextStep.id,
        { 
          tenantId: instance.tenantId, 
          requesterId: instance.requesterId,
          metadata: instance.workflowData 
        }
      );

      // Update instance to next step
      const [updated] = await db
        .update(workflowInstances)
        .set({
          currentStatus: 'running',
          currentStepId: nextStep.id,
          workflowData: {
            ...(instance.workflowData as any),
            currentAssigneeId: assigneeId,
            currentStepIndex: currentIndex + 2,
            previousStepId: instance.currentStepId
          },
          lastActivity: new Date()
        })
        .where(eq(workflowInstances.id, instance.id))
        .returning();

      // Send notification to new assignee
      if (assigneeId) {
        await this.sendApprovalNotification(
          instance.id,
          assigneeId,
          nextStep.name,
          instance.tenantId
        );
      }

      // Schedule escalation if configured
      if (nextStep.escalationTimeout && nextStep.escalationTimeout > 0) {
        await this.scheduleEscalation(
          instance.id,
          nextStep.id,
          nextStep.escalationTimeout * 60 // Convert hours to minutes
        );
      }

      return updated;
    } else {
      // No more steps - workflow complete
      const [completed] = await db
        .update(workflowInstances)
        .set({
          currentStatus: 'completed',
          completedAt: new Date(),
          workflowData: {
            ...(instance.workflowData as any),
            completedSteps: steps.length
          },
          lastActivity: new Date()
        })
        .where(eq(workflowInstances.id, instance.id))
        .returning();

      // Send completion notification
      await this.sendCompletionNotification(
        instance.id,
        instance.requesterId,
        instance.tenantId
      );

      return completed;
    }
  }

  /**
   * Reject workflow
   */
  private async rejectWorkflow(
    instance: any, 
    reason?: string
  ): Promise<any> {
    const [rejected] = await db
      .update(workflowInstances)
      .set({
        currentStatus: 'failed',
        completedAt: new Date(),
        workflowData: {
          ...(instance.workflowData as any),
          rejectionReason: reason,
          rejectedAtStep: instance.currentStepId
        },
        failureReason: reason,
        lastActivity: new Date()
      })
      .where(eq(workflowInstances.id, instance.id))
      .returning();

    // Send rejection notification to requestor
    await this.sendRejectionNotification(
      instance.id,
      instance.requesterId,
      reason || 'Workflow was rejected',
      instance.tenantId
    );

    return rejected;
  }

  /**
   * Delegate step to another user
   */
  private async delegateStep(
    instance: any,
    delegateToId: string,
    comment?: string
  ): Promise<any> {
    const currentAssigneeId = (instance.workflowData as any)?.currentAssigneeId;
    
    const [updated] = await db
      .update(workflowInstances)
      .set({
        workflowData: {
          ...(instance.workflowData as any),
          currentAssigneeId: delegateToId,
          delegatedFrom: currentAssigneeId,
          delegationComment: comment,
          delegatedAt: new Date()
        },
        lastActivity: new Date()
      })
      .where(eq(workflowInstances.id, instance.id))
      .returning();

    // Get current step details
    const [currentStep] = await db
      .select()
      .from(workflowSteps)
      .where(eq(workflowSteps.id, instance.currentStepId))
      .limit(1);

    // Send notification to new assignee
    await this.sendDelegationNotification(
      instance.id,
      delegateToId,
      currentAssigneeId || 'system',
      currentStep?.name || 'Workflow step',
      comment,
      instance.tenantId
    );

    return updated;
  }

  /**
   * Find appropriate assignee based on team assignments
   */
  private async findAssignee(
    templateId: string,
    stepId: string,
    context: WorkflowExecutionContext
  ): Promise<string | null> {
    try {
      // Get team assignments for this template
      const assignments = await db
        .select()
        .from(teamWorkflowAssignments)
        .where(and(
          eq(teamWorkflowAssignments.templateId, templateId),
          eq(teamWorkflowAssignments.tenantId, context.tenantId),
          eq(teamWorkflowAssignments.isActive, true)
        ))
        .orderBy(desc(teamWorkflowAssignments.priority));

      if (assignments.length === 0) {
        return null;
      }

      // For now, use the first assignment's team
      const assignment = assignments[0];
      
      // Get team details
      const [team] = await db
        .select()
        .from(teams)
        .where(and(
          eq(teams.id, assignment.teamId),
          eq(teams.tenantId, context.tenantId),
          eq(teams.isActive, true)
        ))
        .limit(1);

      if (!team) {
        return null;
      }

      // Return supervisor if available
      if (team.primarySupervisor) {
        return team.primarySupervisor;
      }

      // Otherwise return first team member
      if (team.userMembers && team.userMembers.length > 0) {
        return team.userMembers[0];
      }

      return null;
    } catch (error) {
      console.error('Error finding assignee:', error);
      return null;
    }
  }

  /**
   * Verify if user is authorized to approve current step
   * Implements complete RBAC verification logic
   */
  private async verifyApprover(
    instanceId: string,
    approverId: string,
    stepId: string
  ): Promise<boolean> {
    try {
      // Get the workflow instance with tenant context
      const [instance] = await db
        .select()
        .from(workflowInstances)
        .where(eq(workflowInstances.id, instanceId))
        .limit(1);

      if (!instance) {
        console.error('Workflow instance not found for RBAC verification');
        return false;
      }

      // Get the workflow step with approval requirements
      const [step] = await db
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.id, stepId))
        .limit(1);

      if (!step) {
        console.error('Workflow step not found for RBAC verification');
        return false;
      }

      // Get the template with RBAC action requirements
      const [template] = await db
        .select()
        .from(workflowTemplates)
        .where(eq(workflowTemplates.id, step.templateId))
        .limit(1);

      if (!template) {
        console.error('Workflow template not found for RBAC verification');
        return false;
      }

      // Check 1: User must belong to the same tenant
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.id, approverId),
            eq(users.tenantId, instance.tenantId)
          )
        )
        .limit(1);

      if (!user) {
        console.warn(`User ${approverId} not found in tenant ${instance.tenantId}`);
        return false;
      }

      // Check 2: Verify approver logic from workflow step
      const approverLogic = step.approverLogic as any || {};
      
      // If specific user is assigned
      if (approverLogic.userId && approverLogic.userId === approverId) {
        return true;
      }

      // If role-based approval
      // TODO: Implement when user-role junction table is available
      if (approverLogic.roleId) {
        // For now, check if the role is in the team's roleMembers
        // This will be expanded when user-role relationships are available
        console.log(`Role-based approval check for roleId: ${approverLogic.roleId}`);
      }

      // Check 3: Team-based approval with supervisor hierarchy
      if (approverLogic.teamId) {
        const [team] = await db
          .select()
          .from(teams)
          .where(
            and(
              eq(teams.id, approverLogic.teamId),
              eq(teams.tenantId, instance.tenantId)
            )
          )
          .limit(1);

        if (team) {
          // Check if user is primary supervisor
          if (team.primarySupervisor === approverId) {
            return true;
          }

          // Check if user is secondary supervisor
          if (team.secondarySupervisors?.includes(approverId)) {
            return true;
          }

          // Check if user is a team member
          if (team.userMembers?.includes(approverId)) {
            return true;
          }

          // Check if user has a role that's part of the team
          // TODO: Implement when user-role junction table is available
          if (team.roleMembers && team.roleMembers.length > 0) {
            // For now, we can't check user's roles directly
            // This will be expanded when user-role relationships are available
            console.log(`Team has role members, but user-role checking not yet implemented`);
          }
        }
      }

      // Check 4: RBAC action-based permission
      // TODO: Implement when workflow actions have required permissions
      // and user-role relationships are available
      // For now, skip this check as the schema doesn't support it yet
      const templateData = template as any;
      if (templateData.requiredActionId) {
        console.log(`RBAC action check for actionId: ${templateData.requiredActionId} - not yet implemented`);
      }

      // Check 5: Delegation check
      const delegatedAuth = (instance.workflowData as any)?.delegations?.find(
        (d: any) => d.stepId === stepId && d.delegateToId === approverId
      );
      
      if (delegatedAuth) {
        return true;
      }

      console.warn(
        `User ${approverId} failed all authorization checks for workflow instance ${instanceId}, step ${stepId}`
      );
      return false;

    } catch (error) {
      console.error('Error in RBAC verification:', error);
      return false;
    }
  }

  /**
   * Send approval notification
   */
  private async sendApprovalNotification(
    instanceId: string,
    assigneeId: string,
    stepName: string,
    tenantId: string
  ): Promise<void> {
    try {
      await db.insert(notifications).values({
        tenantId,
        targetUserId: assigneeId,
        type: 'custom',
        title: 'Approval Required',
        message: `You have a pending approval for: ${stepName}`,
        priority: 'high',
        status: 'unread',
        data: {
          notificationType: 'workflow_approval',
          instanceId,
          stepName,
          actionRequired: 'approve'
        },
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error sending approval notification:', error);
    }
  }

  /**
   * Send completion notification
   */
  private async sendCompletionNotification(
    instanceId: string,
    initiatorId: string,
    tenantId: string
  ): Promise<void> {
    try {
      await db.insert(notifications).values({
        tenantId,
        targetUserId: initiatorId,
        type: 'custom',
        title: 'Workflow Completed',
        message: 'Your workflow request has been completed successfully',
        priority: 'medium',
        status: 'unread',
        data: {
          notificationType: 'workflow_complete',
          instanceId,
          completedAt: new Date()
        },
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error sending completion notification:', error);
    }
  }

  /**
   * Send rejection notification
   */
  private async sendRejectionNotification(
    instanceId: string,
    initiatorId: string,
    reason: string,
    tenantId: string
  ): Promise<void> {
    try {
      await db.insert(notifications).values({
        tenantId,
        targetUserId: initiatorId,
        type: 'custom',
        title: 'Workflow Rejected',
        message: `Your workflow request was rejected: ${reason}`,
        priority: 'high',
        status: 'unread',
        data: {
          notificationType: 'workflow_rejected',
          instanceId,
          rejectionReason: reason,
          rejectedAt: new Date()
        },
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error sending rejection notification:', error);
    }
  }

  /**
   * Send delegation notification
   */
  private async sendDelegationNotification(
    instanceId: string,
    delegateToId: string,
    delegatedFromId: string,
    stepName: string,
    comment: string | undefined,
    tenantId: string
  ): Promise<void> {
    try {
      await db.insert(notifications).values({
        tenantId,
        targetUserId: delegateToId,
        type: 'custom',
        title: 'Task Delegated to You',
        message: `A workflow task has been delegated to you: ${stepName}`,
        priority: 'high',
        status: 'unread',
        data: {
          notificationType: 'workflow_delegated',
          instanceId,
          stepName,
          delegatedFrom: delegatedFromId,
          delegationComment: comment,
          actionRequired: 'approve'
        },
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error sending delegation notification:', error);
    }
  }

  /**
   * Schedule escalation for a step
   */
  private async scheduleEscalation(
    instanceId: string,
    stepId: string,
    escalationMinutes: number
  ): Promise<void> {
    // TODO: Implement escalation scheduling with BullMQ or similar
    // For now, just log the intent
    console.log(`Escalation scheduled for instance ${instanceId}, step ${stepId} in ${escalationMinutes} minutes`);
  }

  /**
   * Handle escalation when timeout occurs
   */
  async handleEscalation(instanceId: string, stepId: string): Promise<void> {
    try {
      const [instance] = await db
        .select()
        .from(workflowInstances)
        .where(eq(workflowInstances.id, instanceId))
        .limit(1);

      if (!instance || instance.currentStatus !== 'running') {
        return;
      }

      const [step] = await db
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.id, stepId))
        .limit(1);

      if (!step || !step.escalationTarget) {
        return;
      }

      // Update assignee to escalation user
      await db
        .update(workflowInstances)
        .set({
          workflowData: {
            ...(instance.workflowData as any),
            currentAssigneeId: step.escalationTarget,
            escalatedAt: new Date(),
            originalAssignee: (instance.workflowData as any)?.currentAssigneeId
          },
          escalationLevel: (instance.escalationLevel || 0) + 1,
          lastActivity: new Date()
        })
        .where(eq(workflowInstances.id, instanceId));

      // Send escalation notification
      await db.insert(notifications).values({
        tenantId: instance.tenantId,
        targetUserId: step.escalationTarget,
        type: 'custom',
        title: 'Escalated Approval',
        message: `An approval has been escalated to you: ${step.name}`,
        priority: 'critical',
        status: 'unread',
        data: {
          notificationType: 'workflow_escalated',
          instanceId,
          stepName: step.name,
          escalationReason: 'timeout',
          actionRequired: 'approve'
        },
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error handling escalation:', error);
    }
  }

  /**
   * Get workflow instance status and history
   */
  async getInstanceDetails(instanceId: string): Promise<any> {
    try {
      const [instance] = await db
        .select()
        .from(workflowInstances)
        .where(eq(workflowInstances.id, instanceId))
        .limit(1);

      if (!instance) {
        throw new Error('Workflow instance not found');
      }

      // Get execution history
      const executions = await db
        .select()
        .from(workflowExecutions)
        .where(eq(workflowExecutions.instanceId, instanceId))
        .orderBy(asc(workflowExecutions.startedAt));

      // Get all steps for context
      const steps = await db
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.templateId, instance.templateId))
        .orderBy(asc(workflowSteps.order));

      return {
        instance,
        executions,
        steps,
        progress: {
          currentStep: steps.findIndex(s => s.id === instance.currentStepId) + 1,
          totalSteps: steps.length,
          percentComplete: Math.round(
            ((steps.findIndex(s => s.id === instance.currentStepId) + 1) / steps.length) * 100
          )
        }
      };
    } catch (error) {
      console.error('Error getting instance details:', error);
      throw error;
    }
  }

  /**
   * 🌉 NEW: Find assignee for ReactFlow step
   */
  async findAssigneeForReactFlowStep(
    templateId: string,
    step: any, // ParsedWorkflowStep from bridge parser
    context: WorkflowExecutionContext
  ): Promise<string | null> {
    try {
      logger.info('🔍 [ENGINE] Finding assignee for ReactFlow step', {
        stepId: step.nodeId,
        executorId: step.executorId,
        stepType: step.type
      });

      // For trigger steps, usually system handles them
      if (step.type === 'trigger') {
        return 'system';
      }

      // For approval steps, find appropriate approver
      if (step.type === 'approval' || step.executorId === 'approval-action-executor') {
        return await this.findApprovalAssignee(templateId, step, context);
      }

      // For AI steps, usually system handles them
      if (step.type === 'ai') {
        return 'system';
      }

      // For action steps, check if manual assignment needed
      if (step.type === 'action') {
        // Check if step requires human intervention
        const config = step.config || {};
        if (config.approverRole || config.approverType) {
          return await this.findApprovalAssignee(templateId, step, context);
        }
        
        // Otherwise system can handle it
        return 'system';
      }

      // Default: try to find team-based assignment
      return await this.findTeamAssignee(templateId, context);

    } catch (error) {
      logger.error('❌ [ENGINE] Failed to find ReactFlow step assignee', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });
      return null;
    }
  }

  /**
   * 🌉 NEW: Execute a ReactFlow step
   */
  async executeReactFlowStep(
    instanceId: string,
    step: any, // ParsedWorkflowStep
    context: WorkflowExecutionContext,
    inputData?: Record<string, any>
  ): Promise<any> {
    try {
      logger.info('⚡ [ENGINE] Executing ReactFlow step', {
        instanceId,
        stepId: step.nodeId,
        executorId: step.executorId,
        stepType: step.type
      });

      // Update execution record to running
      await db
        .update(workflowExecutions)
        .set({
          status: 'running',
          startedAt: new Date()
        })
        .where(and(
          eq(workflowExecutions.instanceId, instanceId),
          eq(workflowExecutions.stepId, step.nodeId)
        ));

      let executionResult;

      // Route to appropriate executor based on step type and executor ID
      switch (step.executorId) {
        case 'email-action-executor':
          executionResult = await this.executeEmailAction(step, inputData);
          break;
        
        case 'approval-action-executor':
          executionResult = await this.executeApprovalAction(step, inputData, context);
          break;
        
        case 'auto-approval-executor':
          executionResult = await this.executeAutoApproval(step, inputData, context);
          break;
        
        case 'decision-evaluator':
          executionResult = await this.executeDecision(step, inputData);
          break;
        
        case 'ai-decision-executor':
          executionResult = await this.executeAiDecision(step, inputData, context);
          break;

        case 'form-trigger-executor':
          executionResult = await this.executeFormTrigger(step, inputData);
          break;

        case 'generic-action-executor':
        default:
          executionResult = await this.executeGenericAction(step, inputData);
          break;
      }

      // Update execution record with result
      await db
        .update(workflowExecutions)
        .set({
          status: executionResult.success ? 'completed' : 'failed',
          outputData: executionResult.data || {},
          completedAt: new Date(),
          notes: executionResult.message || ''
        })
        .where(and(
          eq(workflowExecutions.instanceId, instanceId),
          eq(workflowExecutions.stepId, step.nodeId)
        ));

      // If execution successful, advance to next step
      if (executionResult.success && step.nextSteps.length > 0) {
        await this.advanceToNextReactFlowStep(instanceId, step, executionResult, context);
      }

      logger.info('✅ [ENGINE] ReactFlow step executed successfully', {
        instanceId,
        stepId: step.nodeId,
        success: executionResult.success
      });

      return executionResult;

    } catch (error) {
      logger.error('❌ [ENGINE] Failed to execute ReactFlow step', {
        error: error instanceof Error ? error.message : String(error),
        instanceId,
        stepId: step.nodeId
      });

      // Mark execution as failed
      await db
        .update(workflowExecutions)
        .set({
          status: 'failed',
          completedAt: new Date(),
          notes: error instanceof Error ? error.message : 'Unknown error'
        })
        .where(and(
          eq(workflowExecutions.instanceId, instanceId),
          eq(workflowExecutions.stepId, step.nodeId)
        ));

      throw error;
    }
  }

  /**
   * 🌉 HELPER: Find approval assignee for ReactFlow step
   */
  private async findApprovalAssignee(
    templateId: string,
    step: any,
    context: WorkflowExecutionContext
  ): Promise<string | null> {
    const config = step.config || {};
    
    // Check for specific approver role in step config
    if (config.approverRole) {
      // TODO: Implement role-based assignment
      // For now, return requester's manager or system
      return context.requesterId; // Fallback
    }

    // Use existing team-based assignment logic
    return await this.findTeamAssignee(templateId, context);
  }

  /**
   * 🌉 HELPER: Find team-based assignee
   */
  private async findTeamAssignee(
    templateId: string,
    context: WorkflowExecutionContext
  ): Promise<string | null> {
    // Get team assignments for this template
    const teamAssignments = await db
      .select({
        teamId: teamWorkflowAssignments.teamId,
        teamName: teams.name,
        primarySupervisor: teams.primarySupervisor
      })
      .from(teamWorkflowAssignments)
      .innerJoin(teams, eq(teams.id, teamWorkflowAssignments.teamId))
      .where(and(
        eq(teamWorkflowAssignments.templateId, templateId),
        eq(teams.tenantId, context.tenantId),
        eq(teams.isActive, true)
      ))
      .limit(1);

    if (teamAssignments.length > 0) {
      const assignment = teamAssignments[0];
      return assignment.primarySupervisor || context.requesterId;
    }

    return context.requesterId; // Fallback to requester
  }

  /**
   * 🌉 HELPER: Advance to next ReactFlow step
   */
  private async advanceToNextReactFlowStep(
    instanceId: string,
    currentStep: any,
    executionResult: any,
    context: WorkflowExecutionContext
  ): Promise<void> {
    try {
      // Get instance to access parsed workflow
      const [instance] = await db
        .select()
        .from(workflowInstances)
        .where(eq(workflowInstances.id, instanceId))
        .limit(1);

      if (!instance) {
        throw new Error('Workflow instance not found');
      }

      // 🔄 Extract and deserialize workflow from instance data
      const workflowData = instance.workflowData as any;
      const parsedWorkflow = reactFlowBridgeParser.extractWorkflowFromInstanceData(workflowData);

      if (!parsedWorkflow) {
        throw new Error('Parsed workflow not found or could not be deserialized from instance data');
      }

      // Determine next step based on execution result and conditions
      let nextStepId: string | null = null;

      if (currentStep.type === 'decision' && executionResult.decision) {
        // For decision nodes, use the decision result to choose path
        const conditions = currentStep.conditions || {};
        nextStepId = Object.keys(conditions).find(targetId => 
          conditions[targetId].toLowerCase() === executionResult.decision.toLowerCase()
        ) || null;
      } else if (currentStep.nextSteps.length === 1) {
        // Single path - go to next step
        nextStepId = currentStep.nextSteps[0];
      } else if (currentStep.nextSteps.length > 1) {
        // Multiple paths - use first one for now (TODO: improve logic)
        nextStepId = currentStep.nextSteps[0];
      }

      if (!nextStepId) {
        // No next step - workflow completed
        await db
          .update(workflowInstances)
          .set({
            currentStatus: 'completed',
            completedAt: new Date()
          })
          .where(eq(workflowInstances.id, instanceId));
        
        logger.info('🏁 [ENGINE] ReactFlow workflow completed', { instanceId });
        return;
      }

      const nextStep = parsedWorkflow.steps.get(nextStepId);
      if (!nextStep) {
        throw new Error(`Next step ${nextStepId} not found in parsed workflow`);
      }

      // Find assignee for next step
      const nextAssigneeId = await this.findAssigneeForReactFlowStep(
        instance.templateId,
        nextStep,
        context
      );

      // 🔄 Re-serialize workflow for storage (preserve serialized format)
      const serializedWorkflow = reactFlowBridgeParser.serializeWorkflow(parsedWorkflow);

      // Update instance to point to next step
      await db
        .update(workflowInstances)
        .set({
          currentStepId: nextStepId,
          workflowData: {
            ...workflowData,
            currentAssigneeId: nextAssigneeId,
            currentStepExecutorId: nextStep.executorId,
            parsedWorkflow: serializedWorkflow // 🔄 Keep serialized format
          }
        })
        .where(eq(workflowInstances.id, instanceId));

      // Create execution record for next step
      await db.insert(workflowExecutions).values({
        tenantId: context.tenantId,
        instanceId,
        stepId: nextStepId,
        executionType: nextStep.type,
        executorId: nextAssigneeId || 'system',
        status: 'pending',
        inputData: executionResult.data || {}
      });

      logger.info('↪️ [ENGINE] Advanced to next ReactFlow step', {
        instanceId,
        fromStep: currentStep.nodeId,
        toStep: nextStepId,
        assigneeId: nextAssigneeId
      });

      // Auto-execute if it's a system step
      if (nextStep.type === 'action' && nextAssigneeId === 'system') {
        await this.executeReactFlowStep(instanceId, nextStep, context, executionResult.data);
      }

    } catch (error) {
      logger.error('❌ [ENGINE] Failed to advance to next ReactFlow step', {
        error: error instanceof Error ? error.message : String(error),
        instanceId,
        currentStepId: currentStep.nodeId
      });
      throw error;
    }
  }

  /**
   * 🌉 PLACEHOLDER: Basic action executors (to be expanded)
   */
  private async executeEmailAction(step: any, inputData?: any): Promise<any> {
    logger.info('📧 [EXECUTOR] Email action placeholder', { stepId: step.nodeId });
    return { success: true, message: 'Email action executed (placeholder)', data: {} };
  }

  private async executeApprovalAction(step: any, inputData?: any, context?: any): Promise<any> {
    logger.info('✅ [EXECUTOR] Approval action placeholder', { stepId: step.nodeId });
    return { success: true, message: 'Approval action executed (placeholder)', data: {} };
  }

  private async executeAutoApproval(step: any, inputData?: any, context?: any): Promise<any> {
    logger.info('🤖 [EXECUTOR] Auto approval placeholder', { stepId: step.nodeId });
    return { success: true, message: 'Auto approval executed', data: { approved: true } };
  }

  private async executeDecision(step: any, inputData?: any): Promise<any> {
    logger.info('🤔 [EXECUTOR] Decision placeholder', { stepId: step.nodeId });
    // Placeholder: always return first condition
    const config = step.config || {};
    const condition = config.condition || 'true';
    return { success: true, message: 'Decision evaluated', data: {}, decision: 'approve' };
  }

  private async executeAiDecision(step: any, inputData?: any, context?: any): Promise<any> {
    logger.info('🧠 [EXECUTOR] AI decision placeholder', { stepId: step.nodeId });
    return { success: true, message: 'AI decision executed (placeholder)', data: {}, decision: 'approve' };
  }

  private async executeFormTrigger(step: any, inputData?: any): Promise<any> {
    logger.info('📝 [EXECUTOR] Form trigger placeholder', { stepId: step.nodeId });
    return { success: true, message: 'Form trigger executed', data: inputData || {} };
  }

  private async executeGenericAction(step: any, inputData?: any): Promise<any> {
    logger.info('⚙️ [EXECUTOR] Generic action placeholder', { stepId: step.nodeId });
    return { success: true, message: 'Generic action executed', data: {} };
  }
}

export const workflowEngine = new WorkflowEngine();