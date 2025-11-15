import { BaseExecutor } from './BaseExecutor';
import type { ActionExecutionResult } from '../types';

export class WhileLoopExecutor extends BaseExecutor {
  executorId = 'while-loop-executor';
  description = 'Executes loop while condition is true';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      this.logInfo('🔁 [EXECUTOR] Executing WHILE loop', {
        stepId: step.nodeId
      });

      const config = step.config || {};
      const condition = config.condition;
      const currentIteration = context?.metadata?.iteration || 0;
      const maxIterations = config.maxIterations || 10;

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

      const value = inputData?.[condition.field] || context?.metadata?.[condition.field] || 0;
      const conditionMet = this.evaluateCondition(value, condition.operator, condition.value);

      if (conditionMet) {
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
      this.logError('❌ [EXECUTOR] WHILE loop failed', {
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
