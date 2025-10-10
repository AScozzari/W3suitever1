/**
 * 🎯 ACTION EXECUTORS REGISTRY
 * 
 * Registro centrale per tutti gli executors che implementano le azioni 
 * dei nodi ReactFlow. Mappa executor IDs ai servizi backend reali.
 */

import { logger } from '../core/logger';
import { notificationService } from '../core/notification-service';
import { UnifiedOpenAIService } from './unified-openai';
import { AIRegistryService, RegistryAwareContext } from './ai-registry-service';
import { mcpClientService } from './mcp-client-service';

// ==================== INTERFACES ====================

/**
 * Base interface for all action executors
 */
export interface ActionExecutor {
  executorId: string;
  description: string;
  execute(
    step: any, 
    inputData?: Record<string, any>, 
    context?: any
  ): Promise<ActionExecutionResult>;
}

/**
 * Standard result interface for all executors
 */
export interface ActionExecutionResult {
  success: boolean;
  message: string;
  data?: Record<string, any>;
  decision?: string; // For decision-type executors
  nextAction?: string; // For routing executors
  error?: string;
}

/**
 * Execution context passed to executors
 */
export interface ExecutionContext {
  tenantId: string;
  requesterId: string;
  instanceId: string;
  templateId: string;
  metadata?: Record<string, any>;
}

// ==================== CONCRETE EXECUTORS ====================

/**
 * 📧 EMAIL ACTION EXECUTOR
 * Sends emails using the notification service
 */
export class EmailActionExecutor implements ActionExecutor {
  executorId = 'email-action-executor';
  description = 'Sends email notifications using notification service';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      logger.info('📧 [EXECUTOR] Executing email action', {
        stepId: step.nodeId,
        context: context?.tenantId
      });

      const config = step.config || {};
      const emailData = {
        to: config.recipient || inputData?.email || context?.requesterEmail,
        subject: config.subject || 'Workflow Notification',
        message: config.message || 'A workflow action has been completed.',
        type: 'workflow' as const,
        priority: config.priority || 'medium' as const
      };

      // Validate required fields
      if (!emailData.to) {
        throw new Error('Email recipient is required');
      }

      // Use notification service to send email
      await notificationService.sendEmailNotification(
        context?.tenantId || 'default',
        emailData.to,
        emailData.subject,
        emailData.message,
        emailData.type,
        emailData.priority,
        { 
          stepId: step.nodeId,
          instanceId: context?.instanceId,
          ...inputData 
        }
      );

      return {
        success: true,
        message: `Email sent successfully to ${emailData.to}`,
        data: { 
          recipient: emailData.to,
          subject: emailData.subject,
          sentAt: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('❌ [EXECUTOR] Email action failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      return {
        success: false,
        message: 'Failed to send email',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * ✅ APPROVAL ACTION EXECUTOR
 * Handles approval requests and workflow pausing
 */
export class ApprovalActionExecutor implements ActionExecutor {
  executorId = 'approval-action-executor';
  description = 'Handles approval requests and notifications';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      logger.info('✅ [EXECUTOR] Executing approval action', {
        stepId: step.nodeId,
        context: context?.tenantId
      });

      const config = step.config || {};
      const approverRole = config.approverRole || 'manager';
      const approvalMessage = config.message || `Approval required for: ${step.config?.label || 'Workflow Step'}`;

      // Send approval notification to assigned approver
      if (context?.currentAssigneeId && context.currentAssigneeId !== 'system') {
        await notificationService.sendNotification(
          context.tenantId,
          context.currentAssigneeId,
          'Approval Required',
          approvalMessage,
          'workflow_approval',
          'high',
          {
            stepId: step.nodeId,
            instanceId: context.instanceId,
            actionRequired: 'approve_or_reject',
            approverRole
          }
        );
      }

      return {
        success: true,
        message: 'Approval request sent successfully',
        data: {
          approverRole,
          assigneeId: context?.currentAssigneeId,
          status: 'waiting_approval',
          requestedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('❌ [EXECUTOR] Approval action failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      return {
        success: false,
        message: 'Failed to send approval request',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * 🤖 AUTO APPROVAL EXECUTOR
 * Automatically approves based on conditions
 */
export class AutoApprovalExecutor implements ActionExecutor {
  executorId = 'auto-approval-executor';
  description = 'Automatically approves requests based on configured conditions';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      logger.info('🤖 [EXECUTOR] Executing auto approval', {
        stepId: step.nodeId,
        context: context?.tenantId
      });

      const config = step.config || {};
      const conditions = config.conditions || {};
      
      // Simple rule-based auto approval
      let shouldApprove = true;
      let reason = 'Automatic approval - all conditions met';

      // Check amount threshold
      if (conditions.maxAmount && inputData?.amount) {
        if (parseFloat(inputData.amount) > parseFloat(conditions.maxAmount)) {
          shouldApprove = false;
          reason = `Amount ${inputData.amount} exceeds threshold ${conditions.maxAmount}`;
        }
      }

      // Check user role
      if (conditions.allowedRoles && context?.requesterRole) {
        if (!conditions.allowedRoles.includes(context.requesterRole)) {
          shouldApprove = false;
          reason = `User role ${context.requesterRole} not in allowed list`;
        }
      }

      // Check time-based rules
      if (conditions.businessHoursOnly) {
        const now = new Date();
        const hour = now.getHours();
        if (hour < 9 || hour > 17) {
          shouldApprove = false;
          reason = 'Request outside business hours';
        }
      }

      const result = shouldApprove ? 'approve' : 'reject';

      return {
        success: true,
        message: `Auto ${result}: ${reason}`,
        decision: result,
        data: {
          autoApproved: shouldApprove,
          reason,
          evaluatedAt: new Date().toISOString(),
          conditions: conditions
        }
      };

    } catch (error) {
      logger.error('❌ [EXECUTOR] Auto approval failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      return {
        success: false,
        message: 'Auto approval evaluation failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * 🤔 DECISION EVALUATOR
 * Evaluates conditions and routes workflow
 */
export class DecisionEvaluator implements ActionExecutor {
  executorId = 'decision-evaluator';
  description = 'Evaluates conditions and determines workflow routing';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      logger.info('🤔 [EXECUTOR] Executing decision evaluation', {
        stepId: step.nodeId,
        context: context?.tenantId
      });

      const config = step.config || {};
      const condition = config.condition || '';
      const defaultDecision = config.defaultDecision || 'continue';
      
      let decision = defaultDecision;
      let reason = 'Default decision';

      // Parse simple conditions
      if (condition.includes('amount >')) {
        const match = condition.match(/amount\s*>\s*(\d+)/);
        if (match && inputData?.amount) {
          const threshold = parseFloat(match[1]);
          const amount = parseFloat(inputData.amount);
          decision = amount > threshold ? 'reject' : 'approve';
          reason = `Amount ${amount} ${decision === 'reject' ? 'exceeds' : 'within'} threshold ${threshold}`;
        }
      } else if (condition.includes('days >')) {
        const match = condition.match(/days\s*>\s*(\d+)/);
        if (match && inputData?.days) {
          const threshold = parseInt(match[1]);
          const days = parseInt(inputData.days);
          decision = days > threshold ? 'manager_approval' : 'auto_approve';
          reason = `${days} days ${decision === 'manager_approval' ? 'requires' : 'allows'} manager approval (threshold: ${threshold})`;
        }
      } else if (condition.includes('role =')) {
        const match = condition.match(/role\s*=\s*['"]([^'"]+)['"]/);
        if (match && context?.requesterRole) {
          const requiredRole = match[1];
          decision = context.requesterRole === requiredRole ? 'approve' : 'reject';
          reason = `Role ${context.requesterRole} ${decision === 'approve' ? 'matches' : 'does not match'} required ${requiredRole}`;
        }
      }

      return {
        success: true,
        message: `Decision: ${decision} - ${reason}`,
        decision,
        data: {
          condition,
          evaluatedCondition: reason,
          inputData,
          evaluatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('❌ [EXECUTOR] Decision evaluation failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      return {
        success: false,
        message: 'Decision evaluation failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        decision: 'error'
      };
    }
  }
}

/**
 * 🧠 AI DECISION EXECUTOR
 * Uses workflow-assistant agent from AI Registry for intelligent decision making
 */
export class AiDecisionExecutor implements ActionExecutor {
  executorId = 'ai-decision-executor';
  description = 'Uses workflow-assistant AI agent to make intelligent decisions based on context';
  private aiRegistry: AIRegistryService | null = null;

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      logger.info('🧠 [EXECUTOR] Executing AI decision with workflow-assistant agent', {
        stepId: step.nodeId,
        context: context?.tenantId
      });

      // Initialize AI Registry if not already done
      if (!this.aiRegistry) {
        const { storage } = await import('../core/storage');
        this.aiRegistry = new AIRegistryService(storage);
      }

      const config = step.config || {};
      const userPrompt = config.prompt || 'Analyze this workflow decision request and provide a decision with clear reasoning.';
      const maxTokens = config.parameters?.maxTokens || 500;

      // Prepare message for AI with structured context
      const aiInput = `
Workflow Decision Request:
- Step: ${step.config?.label || 'Decision Point'}
- Request Data: ${JSON.stringify(inputData, null, 2)}
- Context: Tenant ${context?.tenantId}, Requester ${context?.requesterId}

${userPrompt}

Please analyze this information and provide a decision. Respond in JSON format:
{"decision": "approve|reject|escalate", "reason": "clear explanation", "confidence": "high|medium|low"}
      `;

      // Use workflow-assistant agent from registry
      // Model and temperature are inherited from agent configuration
      const aiSettings = {
        openaiModel: '', // Will be overridden by agent's baseConfiguration
        systemPrompt: '', // Will be overridden by agent's systemPrompt
        maxTokens, // Respect UI configuration
        temperature: 0 // Will be overridden by agent's baseConfiguration
      };

      const registryContext: RegistryAwareContext = {
        agentId: 'workflow-assistant', // Use centralized workflow agent
        tenantId: context?.tenantId || 'default',
        userId: context?.requesterId || 'system',
        moduleContext: 'workflow',
        businessEntityId: context?.instanceId
      };

      logger.info('🤖 [EXECUTOR] Calling workflow-assistant agent', {
        agentId: 'workflow-assistant',
        maxTokens
      });

      const response = await this.aiRegistry.createUnifiedResponse(
        aiInput,
        aiSettings as any,
        registryContext
      );

      if (!response.success || !response.output) {
        throw new Error('AI service returned unsuccessful response');
      }

      // Parse AI response
      let decision = 'approve';
      let reason = 'AI decision completed';
      let confidence = 'medium';
      
      try {
        const parsed = JSON.parse(response.output);
        decision = parsed.decision || 'approve';
        reason = parsed.reason || 'AI analysis completed';
        confidence = parsed.confidence || 'medium';
      } catch {
        // Fallback: simple text parsing
        const aiResponse = response.output.toLowerCase();
        if (aiResponse.includes('reject')) {
          decision = 'reject';
        } else if (aiResponse.includes('escalate')) {
          decision = 'escalate';
        }
        reason = response.output;
      }

      logger.info('✅ [EXECUTOR] AI decision completed', {
        decision,
        confidence,
        agentUsed: 'workflow-assistant'
      });

      return {
        success: true,
        message: `AI Decision: ${decision} - ${reason}`,
        decision,
        data: {
          aiResponse: response.output,
          agentId: 'workflow-assistant',
          confidence,
          inputData,
          evaluatedAt: new Date().toISOString(),
          tokensUsed: response.tokensUsed,
          cost: response.cost
        }
      };

    } catch (error) {
      logger.error('❌ [EXECUTOR] AI decision failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      // Fallback to approve in case of AI failure
      return {
        success: true, // Still successful, just with fallback
        message: 'AI decision failed, defaulting to approve',
        decision: 'approve',
        data: {
          fallback: true,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}

/**
 * 📝 FORM TRIGGER EXECUTOR
 * Handles form submission triggers
 */
export class FormTriggerExecutor implements ActionExecutor {
  executorId = 'form-trigger-executor';
  description = 'Processes form submission triggers';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      logger.info('📝 [EXECUTOR] Executing form trigger', {
        stepId: step.nodeId,
        context: context?.tenantId
      });

      const config = step.config || {};
      const formData = inputData || {};

      // Validate required fields
      const requiredFields = config.requiredFields || [];
      const missingFields = requiredFields.filter((field: string) => !formData[field]);

      if (missingFields.length > 0) {
        return {
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`,
          error: 'Validation failed'
        };
      }

      // Process form data
      const processedData = {
        ...formData,
        submittedAt: new Date().toISOString(),
        submitterId: context?.requesterId,
        tenantId: context?.tenantId
      };

      return {
        success: true,
        message: 'Form trigger processed successfully',
        data: processedData
      };

    } catch (error) {
      logger.error('❌ [EXECUTOR] Form trigger failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      return {
        success: false,
        message: 'Form trigger processing failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * ⚙️ GENERIC ACTION EXECUTOR
 * Fallback executor for simple actions
 */
export class GenericActionExecutor implements ActionExecutor {
  executorId = 'generic-action-executor';
  description = 'Generic fallback executor for simple actions';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    logger.info('⚙️ [EXECUTOR] Executing generic action', {
      stepId: step.nodeId,
      executorId: step.executorId,
      context: context?.tenantId
    });

    return {
      success: true,
      message: `Generic action completed for step ${step.nodeId}`,
      data: {
        stepId: step.nodeId,
        executorId: step.executorId,
        inputData,
        completedAt: new Date().toISOString()
      }
    };
  }
}

/**
 * 🔔 TASK TRIGGER EXECUTOR
 * Handles task event triggers (created, status changed, assigned)
 */
export class TaskTriggerExecutor implements ActionExecutor {
  executorId = 'task-trigger-executor';
  description = 'Handles task-related triggers for workflow automation';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      logger.info('🔔 [EXECUTOR] Executing task trigger', {
        stepId: step.nodeId,
        eventType: step.config?.eventType
      });

      const config = step.config || {};
      const eventType = config.eventType;
      const taskData = inputData?.task || inputData;

      // Validate trigger conditions
      let shouldTrigger = true;
      let reason = 'Trigger conditions met';

      // Filter by department
      if (config.filters?.department && taskData?.department !== config.filters.department) {
        shouldTrigger = false;
        reason = `Department ${taskData?.department} does not match filter ${config.filters.department}`;
      }

      // Filter by status change
      if (eventType === 'task_status_changed') {
        const fromStatus = config.filters?.fromStatus;
        const toStatus = config.filters?.toStatus;
        
        if (fromStatus && taskData?.oldStatus !== fromStatus) {
          shouldTrigger = false;
          reason = `Old status ${taskData?.oldStatus} does not match filter ${fromStatus}`;
        }
        
        if (toStatus && taskData?.status !== toStatus) {
          shouldTrigger = false;
          reason = `New status ${taskData?.status} does not match filter ${toStatus}`;
        }
      }

      // Filter by assigned user
      if (eventType === 'task_assigned') {
        const assignedTo = config.filters?.assignedTo;
        if (assignedTo && taskData?.assigneeId !== assignedTo) {
          shouldTrigger = false;
          reason = `Assignee ${taskData?.assigneeId} does not match filter ${assignedTo}`;
        }
      }

      if (!shouldTrigger) {
        return {
          success: true,
          message: `Trigger skipped: ${reason}`,
          data: {
            triggered: false,
            reason,
            taskId: taskData?.id
          }
        };
      }

      return {
        success: true,
        message: `Task trigger activated: ${eventType}`,
        data: {
          triggered: true,
          eventType,
          taskId: taskData?.id,
          taskTitle: taskData?.title,
          triggeredAt: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('❌ [EXECUTOR] Task trigger failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      return {
        success: false,
        message: 'Failed to process task trigger',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * 📋 TASK ACTION EXECUTOR
 * Handles task creation, assignment and updates within workflows
 */
export class TaskActionExecutor implements ActionExecutor {
  executorId = 'task-action-executor';
  description = 'Creates, assigns and updates tasks from workflow';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      logger.info('📋 [EXECUTOR] Executing task action', {
        stepId: step.nodeId,
        context: context?.tenantId
      });

      const config = step.config || {};
      const action = config.action || 'create';
      const { TaskService } = await import('./task-service');

      if (!context?.tenantId) {
        throw new Error('Tenant ID is required for task actions');
      }

      // CREATE TASK
      if (action === 'create') {
        const taskData = {
          tenantId: context.tenantId,
          title: config.title || inputData?.title || 'Workflow Task',
          description: config.description || inputData?.description,
          status: config.status || 'todo',
          priority: config.priority || 'medium',
          urgency: config.urgency || 'medium',
          department: config.department,
          creatorId: context.requesterId,
          dueDate: config.dueDate ? new Date(config.dueDate) : undefined,
          linkedWorkflowInstanceId: context.instanceId
        };

        const task = await TaskService.createTask(taskData);

        // Auto-assign if specified
        if (config.assignToRole || config.assignToUser) {
          const assigneeId = config.assignToUser || context.requesterId;
          await TaskService.assignTask(
            task.id,
            context.tenantId,
            assigneeId,
            'assignee'
          );
        }

        return {
          success: true,
          message: `Task created successfully: ${task.title}`,
          data: {
            taskId: task.id,
            title: task.title,
            status: task.status,
            createdAt: task.createdAt
          }
        };
      }

      // ASSIGN TASK
      if (action === 'assign') {
        const taskId = config.taskId || inputData?.taskId;
        const assigneeId = config.assignToUser || inputData?.assignToUser;
        
        if (!taskId || !assigneeId) {
          throw new Error('Task ID and assignee are required for assignment');
        }

        await TaskService.assignTask(
          taskId,
          context.tenantId,
          assigneeId,
          config.role || 'assignee'
        );

        return {
          success: true,
          message: `Task assigned successfully to user ${assigneeId}`,
          data: {
            taskId,
            assigneeId,
            role: config.role || 'assignee'
          }
        };
      }

      // UPDATE TASK STATUS
      if (action === 'update_status') {
        const taskId = config.taskId || inputData?.taskId;
        const newStatus = config.newStatus || inputData?.status;
        
        if (!taskId || !newStatus) {
          throw new Error('Task ID and new status are required for update');
        }

        const updated = await TaskService.updateTask(
          taskId,
          context.tenantId,
          { status: newStatus }
        );

        return {
          success: true,
          message: `Task status updated to ${newStatus}`,
          data: {
            taskId: updated.id,
            oldStatus: config.oldStatus,
            newStatus: updated.status,
            updatedAt: updated.updatedAt
          }
        };
      }

      throw new Error(`Unknown task action: ${action}`);

    } catch (error) {
      logger.error('❌ [EXECUTOR] Task action failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      return {
        success: false,
        message: 'Failed to execute task action',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// ==================== ROUTING EXECUTORS ====================

/**
 * 👥 TEAM ROUTING EXECUTOR
 * Routes workflow to team based on team_workflow_assignments
 */
export class TeamRoutingExecutor implements ActionExecutor {
  executorId = 'team-routing-executor';
  description = 'Routes workflow to team (auto or manual)';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      logger.info('👥 [EXECUTOR] Executing team routing', {
        stepId: step.nodeId,
        context: context?.tenantId
      });

      const config = step.config || {};
      const mode = config.assignmentMode || 'auto';

      // Auto mode: usa RequestTriggerService per selezionare team automaticamente
      if (mode === 'auto') {
        const { RequestTriggerService } = await import('./request-trigger-service');
        const department = config.forDepartment || context?.department || 'operations';
        
        const selectedTeam = await RequestTriggerService.findTeamForDepartment(
          department,
          context?.tenantId
        );

        if (!selectedTeam) {
          throw new Error(`No team found for department: ${department}`);
        }

        return {
          success: true,
          message: `Workflow routed to team: ${selectedTeam.name}`,
          data: {
            teamId: selectedTeam.id,
            teamName: selectedTeam.name,
            department,
            mode: 'auto'
          },
          nextAction: selectedTeam.id
        };
      }

      // Manual mode: usa teamId specificato
      if (mode === 'manual' && config.teamId) {
        return {
          success: true,
          message: `Workflow routed to specific team`,
          data: {
            teamId: config.teamId,
            mode: 'manual'
          },
          nextAction: config.teamId
        };
      }

      throw new Error('Invalid team assignment configuration');

    } catch (error) {
      logger.error('❌ [EXECUTOR] Team routing failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      return {
        success: false,
        message: 'Failed to route workflow to team',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * 👤 USER ROUTING EXECUTOR
 * Assigns workflow to specific users (auto or manual)
 */
export class UserRoutingExecutor implements ActionExecutor {
  executorId = 'user-routing-executor';
  description = 'Routes workflow to user(s) (auto or manual)';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      logger.info('👤 [EXECUTOR] Executing user routing', {
        stepId: step.nodeId,
        context: context?.tenantId
      });

      const config = step.config || {};
      const mode = config.assignmentMode || 'auto';
      let userIds: string[] = [];
      let assignmentType = config.assignmentType || 'all';

      // Auto mode: usa RequestTriggerService per selezionare users automaticamente
      if (mode === 'auto') {
        const { RequestTriggerService } = await import('./request-trigger-service');
        const department = config.forDepartment || context?.department || 'operations';
        
        const selectedUsers = await RequestTriggerService.findUsersForDepartment(
          department,
          context?.tenantId,
          context?.templateId
        );

        if (!selectedUsers || selectedUsers.length === 0) {
          throw new Error(`No users found for department: ${department}`);
        }

        userIds = selectedUsers.map(u => u.id);

        logger.info('✅ [EXECUTOR] Auto-assigned users from workflow assignments', {
          department,
          userIds,
          count: userIds.length
        });
      } 
      // Manual mode: usa userIds specificati
      else if (mode === 'manual' && config.userIds && config.userIds.length > 0) {
        userIds = config.userIds;
        
        logger.info('✅ [EXECUTOR] Manual user assignment', {
          userIds,
          count: userIds.length
        });
      } 
      else {
        throw new Error('Invalid user assignment configuration: no users specified');
      }

      // Send notifications to all assigned users
      for (const userId of userIds) {
        await notificationService.sendNotification(
          context?.tenantId,
          userId,
          'Workflow Assignment',
          `You have been assigned to a workflow: ${step.config?.label || 'Workflow Task'}`,
          'workflow_assignment',
          'high',
          {
            stepId: step.nodeId,
            instanceId: context?.instanceId,
            assignmentType,
            mode
          }
        );
      }

      return {
        success: true,
        message: `Workflow assigned to ${userIds.length} user(s) (${mode} mode)`,
        data: {
          userIds,
          assignmentType,
          mode,
          assignedAt: new Date().toISOString()
        },
        nextAction: userIds[0] // Use first user as next action
      };

    } catch (error) {
      logger.error('❌ [EXECUTOR] User routing failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      return {
        success: false,
        message: 'Failed to assign workflow to users',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// ==================== FLOW CONTROL EXECUTORS ====================

/**
 * 🔀 IF CONDITION EXECUTOR
 * Evaluates condition and routes to true/false path
 */
export class IfConditionExecutor implements ActionExecutor {
  executorId = 'if-condition-executor';
  description = 'Evaluates IF condition and routes workflow';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      logger.info('🔀 [EXECUTOR] Executing IF condition', {
        stepId: step.nodeId
      });

      const config = step.config || {};
      const conditions = config.conditions || [];
      const logic = config.logic || 'AND';

      // Evaluate all conditions
      const results = conditions.map((cond: any) => {
        const fieldValue = inputData?.[cond.field] || context?.metadata?.[cond.field];
        return this.evaluateCondition(fieldValue, cond.operator, cond.value);
      });

      // Apply logic
      const finalResult = logic === 'AND' 
        ? results.every(r => r) 
        : results.some(r => r);

      const nextPath = finalResult ? config.truePath : config.falsePath;

      return {
        success: true,
        message: `Condition evaluated to: ${finalResult}`,
        data: {
          result: finalResult,
          nextPath,
          conditions: results
        },
        decision: finalResult ? 'true' : 'false',
        nextAction: nextPath
      };

    } catch (error) {
      logger.error('❌ [EXECUTOR] IF condition failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        message: 'Failed to evaluate condition',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private evaluateCondition(value: any, operator: string, target: any): boolean {
    switch (operator) {
      case 'equals': return value === target;
      case 'not_equals': return value !== target;
      case 'greater_than': return Number(value) > Number(target);
      case 'less_than': return Number(value) < Number(target);
      case 'contains': return String(value).includes(String(target));
      default: return false;
    }
  }
}

/**
 * 🔄 SWITCH CASE EXECUTOR
 * Multi-branch routing based on variable value
 */
export class SwitchCaseExecutor implements ActionExecutor {
  executorId = 'switch-case-executor';
  description = 'Routes workflow based on switch case';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      logger.info('🔄 [EXECUTOR] Executing SWITCH case', {
        stepId: step.nodeId
      });

      const config = step.config || {};
      const variable = config.variable;
      const cases = config.cases || [];
      const value = inputData?.[variable] || context?.metadata?.[variable];

      // Find matching case
      const matchedCase = cases.find((c: any) => c.value === value);
      const nextPath = matchedCase?.path || config.defaultPath;

      return {
        success: true,
        message: `Matched case: ${matchedCase?.label || 'default'}`,
        data: {
          variable,
          value,
          matchedCase: matchedCase?.value,
          nextPath
        },
        decision: matchedCase?.value || 'default',
        nextAction: nextPath
      };

    } catch (error) {
      logger.error('❌ [EXECUTOR] SWITCH case failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        message: 'Failed to evaluate switch case',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * 🔁 WHILE LOOP EXECUTOR
 * Repeats execution while condition is true
 */
export class WhileLoopExecutor implements ActionExecutor {
  executorId = 'while-loop-executor';
  description = 'Executes loop while condition is true';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      logger.info('🔁 [EXECUTOR] Executing WHILE loop', {
        stepId: step.nodeId
      });

      const config = step.config || {};
      const condition = config.condition;
      const currentIteration = context?.metadata?.iteration || 0;
      const maxIterations = config.maxIterations || 10;

      // Check iteration limit
      if (currentIteration >= maxIterations) {
        return {
          success: true,
          message: 'Max iterations reached, exiting loop',
          data: {
            iterations: currentIteration,
            exitReason: 'max_iterations'
          },
          nextAction: config.exitPath
        };
      }

      // Evaluate condition
      const value = inputData?.[condition.field] || context?.metadata?.[condition.field] || 0;
      const conditionMet = this.evaluateCondition(value, condition.operator, condition.value);

      if (conditionMet) {
        // Continue loop
        return {
          success: true,
          message: 'Condition true, continuing loop',
          data: {
            iterations: currentIteration + 1,
            conditionValue: value
          },
          nextAction: config.loopBody
        };
      } else {
        // Exit loop
        return {
          success: true,
          message: 'Condition false, exiting loop',
          data: {
            iterations: currentIteration,
            exitReason: 'condition_false'
          },
          nextAction: config.exitPath
        };
      }

    } catch (error) {
      logger.error('❌ [EXECUTOR] WHILE loop failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        message: 'Failed to execute loop',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private evaluateCondition(value: any, operator: string, target: any): boolean {
    switch (operator) {
      case 'less_than': return Number(value) < Number(target);
      case 'greater_than': return Number(value) > Number(target);
      case 'equals': return value === target;
      default: return false;
    }
  }
}

/**
 * 🌿 PARALLEL FORK EXECUTOR
 * Executes multiple branches in parallel
 */
export class ParallelForkExecutor implements ActionExecutor {
  executorId = 'parallel-fork-executor';
  description = 'Forks workflow into parallel branches';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      logger.info('🌿 [EXECUTOR] Executing PARALLEL fork', {
        stepId: step.nodeId
      });

      const config = step.config || {};
      const branches = config.branches || [];

      // Create parallel execution tracking
      const branchNodes = branches.map((b: any) => b.startNode).filter(Boolean);

      return {
        success: true,
        message: `Forked into ${branches.length} parallel branches`,
        data: {
          branches: branches.map((b: any) => ({
            name: b.name,
            startNode: b.startNode
          })),
          waitFor: config.waitFor,
          timeout: config.timeout
        },
        nextAction: branchNodes.join(',') // Multiple next nodes
      };

    } catch (error) {
      logger.error('❌ [EXECUTOR] PARALLEL fork failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        message: 'Failed to fork parallel branches',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * 🔗 JOIN SYNC EXECUTOR
 * Synchronizes parallel branches
 */
export class JoinSyncExecutor implements ActionExecutor {
  executorId = 'join-sync-executor';
  description = 'Synchronizes parallel branches';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      logger.info('🔗 [EXECUTOR] Executing JOIN sync', {
        stepId: step.nodeId
      });

      const config = step.config || {};
      const completedBranches = context?.metadata?.completedBranches || [];
      const totalBranches = context?.metadata?.totalBranches || 0;

      const allCompleted = config.waitForAll 
        ? completedBranches.length === totalBranches
        : completedBranches.length > 0;

      if (allCompleted) {
        return {
          success: true,
          message: 'All branches synchronized successfully',
          data: {
            completedBranches,
            totalBranches,
            aggregateResults: config.aggregateResults ? completedBranches : undefined
          }
        };
      } else {
        return {
          success: true,
          message: 'Waiting for branches to complete',
          data: {
            completedBranches: completedBranches.length,
            totalBranches,
            waiting: true
          }
        };
      }

    } catch (error) {
      logger.error('❌ [EXECUTOR] JOIN sync failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        message: 'Failed to synchronize branches',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * 🔌 MCP CONNECTOR EXECUTOR
 * Executes tools via Model Context Protocol
 */
export class MCPConnectorExecutor implements ActionExecutor {
  executorId = 'mcp-connector-executor';
  description = 'Executes MCP tools with retry logic and error handling';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      logger.info('🔌 [EXECUTOR] Executing MCP Connector', {
        stepId: step.nodeId,
        tenantId: context?.tenantId
      });

      const config = step.config || {};
      
      // Validate required fields
      if (!config.serverId || !config.toolName) {
        throw new Error('MCP Connector requires serverId and toolName');
      }

      // Merge parameters with inputData for dynamic values
      const parameters = this.resolveParameters(config.parameters || {}, inputData);
      
      // Extract configuration
      const {
        serverId,
        toolName,
        timeout = 30000,
        retryPolicy = { enabled: true, maxRetries: 3, retryDelayMs: 1000 },
        errorHandling = { onError: 'fail', fallbackValue: null }
      } = config;

      // Execute tool with retry logic (multi-user OAuth support)
      const result = await this.executeWithRetry({
        serverId,
        toolName,
        arguments: parameters,
        tenantId: context.tenantId,
        userId: context.requesterId, // REQUIRED for multi-user OAuth
        timeout,
        retryPolicy,
        errorHandling
      });

      return result;

    } catch (error) {
      logger.error('❌ [EXECUTOR] MCP Connector failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      // Apply error handling strategy
      const errorHandling = step.config?.errorHandling || { onError: 'fail' };
      
      if (errorHandling.onError === 'continue') {
        return {
          success: true, // Continue workflow despite error
          message: 'MCP execution failed but continuing workflow',
          data: {
            error: error instanceof Error ? error.message : String(error),
            fallbackValue: errorHandling.fallbackValue
          }
        };
      }

      return {
        success: false,
        message: 'MCP tool execution failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute MCP tool with retry logic
   * MULTI-USER OAUTH: Now requires userId for credential isolation
   */
  private async executeWithRetry(options: {
    serverId: string;
    toolName: string;
    arguments: Record<string, any>;
    tenantId: string;
    userId: string; // REQUIRED for multi-user OAuth
    timeout: number;
    retryPolicy: { enabled: boolean; maxRetries: number; retryDelayMs: number };
    errorHandling: { onError: 'fail' | 'continue' | 'retry'; fallbackValue: any };
  }): Promise<ActionExecutionResult> {
    const { serverId, toolName, arguments: args, tenantId, userId, timeout, retryPolicy, errorHandling } = options;
    
    let lastError: Error | null = null;
    const maxAttempts = retryPolicy.enabled ? retryPolicy.maxRetries + 1 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        logger.debug('🔌 [MCP] Executing tool', {
          serverId,
          toolName,
          attempt,
          maxAttempts
        });

        // Execute with timeout (multi-user OAuth support)
        const result = await Promise.race([
          mcpClientService.executeTool({
            serverId,
            toolName,
            arguments: args,
            tenantId,
            userId // REQUIRED for multi-user OAuth
          }),
          this.createTimeout(timeout)
        ]);

        // Success!
        logger.info('✅ [MCP] Tool executed successfully', {
          serverId,
          toolName,
          attempt
        });

        return {
          success: true,
          message: `MCP tool '${toolName}' executed successfully`,
          data: {
            result,
            serverId,
            toolName,
            executedAt: new Date().toISOString(),
            attempts: attempt
          }
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        logger.warn('⚠️ [MCP] Tool execution failed', {
          serverId,
          toolName,
          attempt,
          maxAttempts,
          error: lastError.message
        });

        // If this was the last attempt, throw
        if (attempt === maxAttempts) {
          throw lastError;
        }

        // Wait before retry (exponential backoff)
        const delay = retryPolicy.retryDelayMs * Math.pow(2, attempt - 1);
        logger.debug('🔄 [MCP] Retrying after delay', {
          attempt,
          delayMs: delay
        });
        await this.sleep(delay);
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError || new Error('MCP execution failed');
  }

  /**
   * Resolve parameters by replacing template variables with inputData values
   */
  private resolveParameters(
    parameters: Record<string, any>,
    inputData?: Record<string, any>
  ): Record<string, any> {
    if (!inputData) return parameters;

    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'string' && value.includes('{{')) {
        // Replace {{variable}} with inputData.variable
        resolved[key] = value.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
          return inputData[varName] !== undefined ? String(inputData[varName]) : value;
        });
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Create timeout promise
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`MCP execution timeout after ${ms}ms`)), ms);
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 🤖 AI MCP EXECUTOR
 * Executes AI-driven MCP tool orchestration with OpenAI function calling
 */
export class AIMCPExecutor implements ActionExecutor {
  executorId = 'ai-mcp-executor';
  description = 'AI-driven MCP tool orchestration using OpenAI function calling';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      logger.info('🤖 [EXECUTOR] Executing AI MCP Node', {
        stepId: step.nodeId,
        tenantId: context?.tenantId
      });

      const config = step.config || {};
      
      // Validate required fields
      if (!config.mcpServerIds || config.mcpServerIds.length === 0) {
        throw new Error('AI MCP Node requires at least one MCP server selected');
      }

      if (!config.aiInstructions || config.aiInstructions.trim() === '') {
        throw new Error('AI MCP Node requires AI instructions');
      }

      // Extract configuration
      const {
        mcpServerIds,
        aiInstructions,
        model = 'gpt-4',
        temperature = 0.7,
        maxTokens = 1000,
        topP,
        frequencyPenalty,
        fallbackResponse,
        outputMapping = {}
      } = config;

      // Build user message from instructions + inputData
      const userMessage = this.buildUserMessage(aiInstructions, inputData);

      // Load MCP servers and build tools array (multi-user OAuth)
      const mcpTools = await this.loadMCPTools(
        mcpServerIds, 
        context.tenantId,
        context.requesterId // REQUIRED for multi-user OAuth
      );

      if (mcpTools.length === 0) {
        logger.warn('⚠️ [AI-MCP] No MCP tools available from selected servers');
        
        // Use fallback if configured
        if (fallbackResponse) {
          return {
            success: true,
            message: 'No MCP tools available, using fallback response',
            data: { response: fallbackResponse, fallbackUsed: true }
          };
        }
        
        throw new Error('No MCP tools available from selected servers');
      }

      logger.info('🔧 [AI-MCP] Loaded MCP tools', {
        toolCount: mcpTools.length,
        servers: mcpServerIds
      });

      // Get UnifiedOpenAIService storage (from context)
      const { default: storage } = await import('../core/storage');
      const openaiService = new UnifiedOpenAIService(storage);

      // Build AI settings for OpenAI API (fetch from DB or use defaults)
      const aiSettings: any = {
        tenantId: context.tenantId,
        id: 'ai-mcp-executor',
        createdAt: new Date(),
        updatedAt: new Date(),
        openaiModel: model as any,
        responseCreativity: Math.round(temperature * 10), // Map 0-2.0 to 0-20
        maxTokensPerResponse: maxTokens,
        featuresEnabled: {},
        privacyMode: 'normal' as const,
        streamingEnabled: false,
        conversationContext: false,
        maxConversationMessages: 10,
        conversationSummaryEnabled: false,
        ragEnabled: false,
        ragSettings: {},
        contextSettings: {},
        customSystemPrompt: null,
        toolsEnabled: false
      };

      // Build OpenAI request context with MCP tools
      const openaiContext = {
        tenantId: context.tenantId,
        availableTools: [], // No native tools, only MCP
        mcpTools: mcpTools, // Pass MCP tools for function calling
        moduleContext: 'workflow' as const
      };

      // Execute AI with MCP tools
      const aiResponse = await openaiService.createUnifiedResponse(
        userMessage,
        aiSettings,
        openaiContext
      );

      if (!aiResponse.success) {
        throw new Error(aiResponse.error || 'AI execution failed');
      }

      // Extract response text from output
      const responseText = typeof aiResponse.output === 'string' 
        ? aiResponse.output 
        : JSON.stringify(aiResponse.output || '');

      // Apply output mapping if configured
      const mappedOutput = this.applyOutputMapping(responseText, outputMapping);

      logger.info('✅ [AI-MCP] AI execution completed successfully', {
        responseLength: responseText.length,
        tokensUsed: aiResponse.tokensUsed,
        mapped: Object.keys(mappedOutput).length > 0
      });

      return {
        success: true,
        message: 'AI MCP orchestration completed successfully',
        data: {
          response: responseText,
          mappedOutput,
          tokensUsed: aiResponse.tokensUsed || 0,
          cost: aiResponse.cost || 0,
          executedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('❌ [EXECUTOR] AI MCP execution failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      // Try fallback response if configured
      const fallbackResponse = step.config?.fallbackResponse;
      if (fallbackResponse) {
        return {
          success: true,
          message: 'AI MCP execution failed, using fallback response',
          data: {
            response: fallbackResponse,
            fallbackUsed: true,
            error: error instanceof Error ? error.message : String(error)
          }
        };
      }

      return {
        success: false,
        message: 'AI MCP orchestration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Build user message by resolving template variables
   */
  private buildUserMessage(instructions: string, inputData?: Record<string, any>): string {
    if (!inputData) return instructions;

    // Replace {{variable}} with inputData values
    return instructions.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
      return inputData[varName] !== undefined ? String(inputData[varName]) : `{{${varName}}}`;
    });
  }

  /**
   * Load MCP servers and build tools array for OpenAI function calling
   * 
   * MULTI-USER OAUTH: Requires userId for credential isolation
   */
  private async loadMCPTools(
    serverIds: string[], 
    tenantId: string,
    userId: string // REQUIRED for multi-user OAuth
  ): Promise<Array<{
    serverId: string;
    serverName: string;
    toolName: string;
    toolDescription?: string;
    schema?: any;
  }>> {
    const mcpTools: Array<any> = [];

    for (const serverId of serverIds) {
      try {
        // List tools available from this server (multi-user OAuth support)
        const tools = await mcpClientService.listTools({
          serverId,
          tenantId,
          userId // REQUIRED for multi-user OAuth
        });

        if (!tools || tools.length === 0) {
          logger.warn('⚠️ [AI-MCP] No tools available from server', { serverId });
          continue;
        }

        // Load server info for serverName (optional, fallback to serverId)
        let serverName = serverId;
        try {
          const { mcpServers } = await import('../db/schema/w3suite');
          const { eq } = await import('drizzle-orm');
          const { db } = await import('../core/db');
          
          const [server] = await db
            .select()
            .from(mcpServers)
            .where(eq(mcpServers.id, serverId))
            .limit(1);
          
          if (server) {
            serverName = server.name;
          }
        } catch {
          // Fallback to serverId if DB query fails
        }

        // Convert tools to MCPToolDefinition format
        for (const tool of tools) {
          mcpTools.push({
            serverId,
            serverName,
            toolName: tool.name,
            toolDescription: tool.description,
            schema: tool.inputSchema // OpenAI function parameters format
          });
        }

        logger.debug('🔧 [AI-MCP] Loaded tools from server', {
          serverId,
          serverName,
          toolCount: tools.length
        });

      } catch (error) {
        logger.error('❌ [AI-MCP] Failed to load tools from server', {
          serverId,
          error: error instanceof Error ? error.message : String(error)
        });
        // Continue with other servers
      }
    }

    return mcpTools;
  }

  /**
   * Apply output mapping to extract structured data from AI response
   */
  private applyOutputMapping(
    responseText: string, 
    mapping: Record<string, string>
  ): Record<string, any> {
    const output: Record<string, any> = {};

    if (!mapping || Object.keys(mapping).length === 0) {
      return output;
    }

    // For each mapping rule, extract value using regex or simple match
    for (const [key, pattern] of Object.entries(mapping)) {
      if (!pattern) continue;

      // Try regex extraction: {{regex:/pattern/}}
      const regexMatch = pattern.match(/\{\{regex:\/(.+)\/\}\}/);
      if (regexMatch) {
        const regex = new RegExp(regexMatch[1], 'i');
        const match = responseText.match(regex);
        output[key] = match ? match[1] || match[0] : null;
        continue;
      }

      // Try JSON path extraction: {{json.path}}
      if (pattern.startsWith('{{json.')) {
        try {
          const jsonData = JSON.parse(responseText);
          const path = pattern.slice(7, -2).split('.');
          let value = jsonData;
          for (const p of path) {
            value = value?.[p];
          }
          output[key] = value;
        } catch {
          output[key] = null;
        }
        continue;
      }

      // Simple string match
      output[key] = responseText.includes(pattern) ? pattern : null;
    }

    return output;
  }
}

// ==================== REGISTRY CLASS ====================

/**
 * 🎯 ACTION EXECUTORS REGISTRY
 * Central registry for all action executors
 */
export class ActionExecutorsRegistry {
  private executors = new Map<string, ActionExecutor>();

  constructor() {
    this.registerDefaultExecutors();
  }

  /**
   * Register all default executors
   */
  private registerDefaultExecutors(): void {
    // Action executors
    this.register(new EmailActionExecutor());
    this.register(new ApprovalActionExecutor());
    this.register(new AutoApprovalExecutor());
    this.register(new DecisionEvaluator());
    this.register(new AiDecisionExecutor());
    this.register(new FormTriggerExecutor());
    this.register(new TaskTriggerExecutor());
    this.register(new TaskActionExecutor());
    this.register(new GenericActionExecutor());
    
    // Routing executors
    this.register(new TeamRoutingExecutor());
    this.register(new UserRoutingExecutor());
    
    // Flow control executors
    this.register(new IfConditionExecutor());
    this.register(new SwitchCaseExecutor());
    this.register(new WhileLoopExecutor());
    this.register(new ParallelForkExecutor());
    this.register(new JoinSyncExecutor());
    
    // Integration executors
    this.register(new MCPConnectorExecutor());
    this.register(new AIMCPExecutor());

    logger.info('🎯 [REGISTRY] Registered default action executors', {
      count: this.executors.size,
      executors: Array.from(this.executors.keys())
    });
  }

  /**
   * Register a new executor
   */
  register(executor: ActionExecutor): void {
    this.executors.set(executor.executorId, executor);
    logger.debug('📝 [REGISTRY] Registered executor', {
      executorId: executor.executorId,
      description: executor.description
    });
  }

  /**
   * Get executor by ID
   */
  getExecutor(executorId: string): ActionExecutor | null {
    return this.executors.get(executorId) || null;
  }

  /**
   * Execute action using registered executor
   */
  async executeAction(
    executorId: string,
    step: any,
    inputData?: Record<string, any>,
    context?: ExecutionContext
  ): Promise<ActionExecutionResult> {
    const executor = this.getExecutor(executorId);
    
    if (!executor) {
      logger.warn('⚠️ [REGISTRY] Unknown executor, using generic fallback', {
        requestedExecutorId: executorId,
        stepId: step?.nodeId
      });
      
      // Fallback to generic executor
      const genericExecutor = this.getExecutor('generic-action-executor');
      if (genericExecutor) {
        return await genericExecutor.execute(step, inputData, context);
      }
      
      throw new Error(`No executor found for ID: ${executorId}`);
    }

    return await executor.execute(step, inputData, context);
  }

  /**
   * Execute step using registered executor (wrapper for executeAction)
   */
  async executeStep(
    step: any,
    inputData?: Record<string, any>,
    context?: ExecutionContext
  ): Promise<ActionExecutionResult> {
    return await this.executeAction(step.executorId, step, inputData, context);
  }

  /**
   * List all registered executors
   */
  listExecutors(): Array<{ id: string; description: string }> {
    return Array.from(this.executors.values()).map(executor => ({
      id: executor.executorId,
      description: executor.description
    }));
  }

  /**
   * Check if executor exists
   */
  hasExecutor(executorId: string): boolean {
    return this.executors.has(executorId);
  }
}

// ==================== SINGLETON EXPORT ====================

export const actionExecutorsRegistry = new ActionExecutorsRegistry();