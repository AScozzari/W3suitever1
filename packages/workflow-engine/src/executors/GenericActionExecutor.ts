import { BaseExecutor } from './BaseExecutor';
import type { ActionExecutionResult } from '../types';

export class GenericActionExecutor extends BaseExecutor {
  executorId = 'generic-action-executor';
  description = 'Generic fallback executor for simple actions';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    this.logInfo('⚙️ [EXECUTOR] Executing generic action', {
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
