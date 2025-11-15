import { BaseExecutor } from './BaseExecutor';
import type { ActionExecutionResult } from '../types';

export class CustomerRoutingExecutor extends BaseExecutor {
  executorId = 'customer-routing-executor';
  description = 'Routes customers based on CRM criteria (type, segment, lifetime value, contract status)';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      this.logInfo('👥 [EXECUTOR] Executing customer routing', {
        stepId: step.nodeId,
        context: context?.tenantId
      });

      const config = step.config || {};
      const customerData = inputData?.customer || inputData;

      const conditions = config.outputBranches || [];
      for (const branch of conditions) {
        const branchConditions = branch.conditions || [];
        let allConditionsMet = true;

        for (const condition of branchConditions) {
          const fieldValue = customerData?.[condition.field];
          const conditionValue = condition.value;

          switch (condition.operator) {
            case 'equals':
              if (fieldValue !== conditionValue) allConditionsMet = false;
              break;
            case 'greater_than':
              if (!(fieldValue > conditionValue)) allConditionsMet = false;
              break;
            case 'in':
              const values = Array.isArray(conditionValue) ? conditionValue : [conditionValue];
              if (!values.includes(fieldValue)) allConditionsMet = false;
              break;
          }

          if (!allConditionsMet) break;
        }

        if (allConditionsMet) {
          return {
            success: true,
            message: `Customer routed to branch: ${branch.name}`,
            data: { 
              branch: branch.name,
              branchId: branch.id, 
              customerId: customerData?.id,
              type: customerData?.type,
              segment: customerData?.segment
            },
            nextAction: branch.id || branch.name
          };
        }
      }

      return {
        success: true,
        message: 'Customer routed to default branch',
        data: { branch: 'default', customerId: customerData?.id },
        nextAction: 'default'
      };

    } catch (error) {
      this.logError('❌ [EXECUTOR] Customer routing failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      return {
        success: false,
        message: 'Failed to route customer',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
