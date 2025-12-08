import { BaseExecutor } from './BaseExecutor';
import type { ActionExecutionResult } from '../types';

export class DecisionEvaluator extends BaseExecutor {
  executorId = 'decision-evaluator';
  description = 'Evaluates conditions and determines workflow routing';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      this.logInfo('🤔 [EXECUTOR] Executing decision evaluation', {
        stepId: step.nodeId,
        context: context?.tenantId
      });

      const config = step.config || {};
      const condition = config.condition || '';
      const defaultDecision = config.defaultDecision || 'continue';
      
      let decision = defaultDecision;
      let reason = 'Default decision';

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
      this.logError('❌ [EXECUTOR] Decision evaluation failed', {
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
