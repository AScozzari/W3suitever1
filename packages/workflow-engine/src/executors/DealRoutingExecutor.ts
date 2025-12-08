import { BaseExecutor } from './BaseExecutor';
import type { ActionExecutionResult } from '../types';

export class DealRoutingExecutor extends BaseExecutor {
  executorId = 'deal-routing-executor';
  description = 'Routes deals based on CRM criteria (stage, value, probability, pipeline, age)';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      this.logInfo('💰 [EXECUTOR] Executing deal routing', {
        stepId: step.nodeId,
        context: context?.tenantId
      });

      const config = step.config || {};
      const dealData = inputData?.deal || inputData;

      const conditions = config.outputBranches || [];
      for (const branch of conditions) {
        const branchConditions = branch.conditions || [];
        let allConditionsMet = true;

        for (const condition of branchConditions) {
          const fieldValue = dealData?.[condition.field];
          const conditionValue = condition.value;

          switch (condition.operator) {
            case 'equals':
              if (fieldValue !== conditionValue) allConditionsMet = false;
              break;
            case 'greater_than':
              if (!(fieldValue > conditionValue)) allConditionsMet = false;
              break;
            case 'less_than':
              if (!(fieldValue < conditionValue)) allConditionsMet = false;
              break;
            case 'between':
              const [min, max] = (conditionValue as string).split('-').map(Number);
              if (!(fieldValue >= min && fieldValue <= max)) allConditionsMet = false;
              break;
          }

          if (!allConditionsMet) break;
        }

        if (allConditionsMet) {
          return {
            success: true,
            message: `Deal routed to branch: ${branch.name}`,
            data: { branch: branch.name, branchId: branch.id, dealId: dealData?.id, stage: dealData?.stage },
            nextAction: branch.id || branch.name
          };
        }
      }

      return {
        success: true,
        message: 'Deal routed to default branch',
        data: { branch: 'default', dealId: dealData?.id },
        nextAction: 'default'
      };

    } catch (error) {
      this.logError('❌ [EXECUTOR] Deal routing failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      return {
        success: false,
        message: 'Failed to route deal',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
