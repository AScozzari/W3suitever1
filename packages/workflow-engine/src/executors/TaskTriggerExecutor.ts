import { BaseExecutor } from './BaseExecutor';
import type { ActionExecutionResult } from '../types';

export class TaskTriggerExecutor extends BaseExecutor {
  executorId = 'task-trigger-executor';
  description = 'Handles task-related triggers for workflow automation';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      this.logInfo('🔔 [EXECUTOR] Executing task trigger', {
        stepId: step.nodeId,
        eventType: step.config?.eventType
      });

      const config = step.config || {};
      const eventType = config.eventType;
      const taskData = inputData?.task || inputData;

      let shouldTrigger = true;
      let reason = 'Trigger conditions met';

      if (config.filters?.department && taskData?.department !== config.filters.department) {
        shouldTrigger = false;
        reason = `Department ${taskData?.department} does not match filter ${config.filters.department}`;
      }

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
      this.logError('❌ [EXECUTOR] Task trigger failed', {
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
