import { BaseExecutor } from './BaseExecutor';
import type { ActionExecutionResult } from '../types';

export class SwitchCaseExecutor extends BaseExecutor {
  executorId = 'switch-case-executor';
  description = 'Routes workflow based on switch case';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      this.logInfo('🔄 [EXECUTOR] Executing SWITCH case', {
        stepId: step.nodeId
      });

      const config = step.config || {};
      const variable = config.variable;
      const cases = config.cases || [];
      const value = inputData?.[variable] || context?.metadata?.[variable];

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
      this.logError('❌ [EXECUTOR] SWITCH case failed', {
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
