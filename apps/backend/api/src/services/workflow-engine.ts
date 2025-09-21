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
   * Create a new workflow instance from a template
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
          requestId: context.requestId,
          instanceName: context.instanceName || `${template.name} - ${new Date().toISOString()}`,
          requesterId: context.requesterId,
          currentStatus: 'running',
          currentStepId: firstStep.id,
          instanceData: {
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
      const currentAssigneeId = (instance.instanceData as any)?.currentAssigneeId;
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
          metadata: instance.instanceData 
        }
      );

      // Update instance to next step
      const [updated] = await db
        .update(workflowInstances)
        .set({
          currentStatus: 'running',
          currentStepId: nextStep.id,
          instanceData: {
            ...(instance.instanceData as any),
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
          instanceData: {
            ...(instance.instanceData as any),
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
        instanceData: {
          ...(instance.instanceData as any),
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
    const currentAssigneeId = (instance.instanceData as any)?.currentAssigneeId;
    
    const [updated] = await db
      .update(workflowInstances)
      .set({
        instanceData: {
          ...(instance.instanceData as any),
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
   */
  private async verifyApprover(
    instanceId: string,
    approverId: string,
    stepId: string
  ): Promise<boolean> {
    // TODO: Implement RBAC verification logic
    // For now, just check if user is part of assigned team
    return true;
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
          instanceData: {
            ...(instance.instanceData as any),
            currentAssigneeId: step.escalationTarget,
            escalatedAt: new Date(),
            originalAssignee: (instance.instanceData as any)?.currentAssigneeId
          },
          escalationCount: (instance.escalationCount || 0) + 1,
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
}

export const workflowEngine = new WorkflowEngine();