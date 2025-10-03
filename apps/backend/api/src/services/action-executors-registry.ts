/**
 * 🎯 ACTION EXECUTORS REGISTRY
 * 
 * Registro centrale per tutti gli executors che implementano le azioni 
 * dei nodi ReactFlow. Mappa executor IDs ai servizi backend reali.
 */

import { logger } from '../core/logger';
import { notificationService } from '../core/notification-service';
import { UnifiedOpenAIService } from './unified-openai';

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
 * Uses UnifiedOpenAIService for intelligent decision making
 */
export class AiDecisionExecutor implements ActionExecutor {
  executorId = 'ai-decision-executor';
  description = 'Uses AI to make intelligent decisions based on context';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      logger.info('🧠 [EXECUTOR] Executing AI decision', {
        stepId: step.nodeId,
        context: context?.tenantId
      });

      // Import and create UnifiedOpenAIService
      const { createUnifiedOpenAIService } = await import('./unified-openai');
      const { storage } = await import('../core/storage');
      const openaiService = createUnifiedOpenAIService(storage);

      const config = step.config || {};
      const systemPrompt = config.prompt || 'You are a workflow decision assistant. Analyze requests and provide decisions with clear reasoning.';
      const model = config.model || 'gpt-3.5-turbo';

      // Prepare message for AI
      const userMessage = `
        Workflow Decision Request:
        - Step: ${step.config?.label || 'Decision Point'}
        - Request Data: ${JSON.stringify(inputData, null, 2)}
        - Context: Tenant ${context?.tenantId}, Requester ${context?.requesterId}
        
        Please analyze this information and provide a decision. Respond in JSON format:
        {"decision": "approve|reject|escalate", "reason": "clear explanation", "confidence": "high|medium|low"}
      `;

      // Call UnifiedOpenAIService
      const aiSettings = {
        openaiModel: model,
        systemPrompt,
        maxTokens: 200,
        temperature: 0.3
      };

      const requestContext = {
        tenantId: context?.tenantId || 'default',
        userId: context?.requesterId || 'system',
        moduleContext: 'workflow',
        businessEntityId: context?.instanceId
      };

      const response = await openaiService.chatAssistant(
        userMessage,
        aiSettings,
        requestContext
      );

      if (!response.success || !response.content) {
        throw new Error('AI service returned unsuccessful response');
      }

      // Parse AI response
      let decision = 'approve';
      let reason = 'AI decision completed';
      let confidence = 'medium';
      
      try {
        const parsed = JSON.parse(response.content);
        decision = parsed.decision || 'approve';
        reason = parsed.reason || 'AI analysis completed';
        confidence = parsed.confidence || 'medium';
      } catch {
        // Fallback: simple text parsing
        const aiResponse = response.content.toLowerCase();
        if (aiResponse.includes('reject')) {
          decision = 'reject';
        } else if (aiResponse.includes('escalate')) {
          decision = 'escalate';
        }
        reason = response.content;
      }

      return {
        success: true,
        message: `AI Decision: ${decision} - ${reason}`,
        decision,
        data: {
          aiResponse: response.content,
          model,
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
    this.register(new EmailActionExecutor());
    this.register(new ApprovalActionExecutor());
    this.register(new AutoApprovalExecutor());
    this.register(new DecisionEvaluator());
    this.register(new AiDecisionExecutor());
    this.register(new FormTriggerExecutor());
    this.register(new TaskTriggerExecutor());
    this.register(new TaskActionExecutor());
    this.register(new GenericActionExecutor());

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