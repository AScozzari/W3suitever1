import { BaseExecutor } from './BaseExecutor';
import type { ActionExecutionResult } from '../types';

export class LeadRoutingExecutor extends BaseExecutor {
  executorId = 'lead-routing-executor';
  description = 'Routes leads based on CRM criteria (source, status, score, age)';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      this.logInfo('📋 [EXECUTOR] Executing lead routing', {
        stepId: step.nodeId,
        context: context?.tenantId
      });

      const config = step.config || {};
      const leadData = inputData?.lead || inputData;

      const conditions = config.outputBranches || [];
      for (const branch of conditions) {
        const branchConditions = branch.conditions || [];
        let allConditionsMet = true;

        for (const condition of branchConditions) {
          const fieldValue = leadData?.[condition.field];
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
            case 'contains':
              if (!String(fieldValue).includes(String(conditionValue))) allConditionsMet = false;
              break;
          }

          if (!allConditionsMet) break;
        }

        if (allConditionsMet) {
          return {
            success: true,
            message: `Lead routed to branch: ${branch.name}`,
            data: { branch: branch.name, branchId: branch.id, leadId: leadData?.id },
            nextAction: branch.id || branch.name
          };
        }
      }

      return {
        success: true,
        message: 'Lead routed to default branch',
        data: { branch: 'default', leadId: leadData?.id },
        nextAction: 'default'
      };

    } catch (error) {
      this.logError('❌ [EXECUTOR] Lead routing failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      return {
        success: false,
        message: 'Failed to route lead',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
