import { BaseExecutor } from './BaseExecutor';
import type { ActionExecutionResult } from '../types';

export class FormTriggerExecutor extends BaseExecutor {
  executorId = 'form-trigger-executor';
  description = 'Processes form submission triggers';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      this.logInfo('📝 [EXECUTOR] Executing form trigger', {
        stepId: step.nodeId,
        context: context?.tenantId
      });

      const config = step.config || {};
      const formData = inputData || {};

      const requiredFields = config.requiredFields || [];
      const missingFields = requiredFields.filter((field: string) => !formData[field]);

      if (missingFields.length > 0) {
        return {
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`,
          error: 'Validation failed'
        };
      }

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
      this.logError('❌ [EXECUTOR] Form trigger failed', {
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
