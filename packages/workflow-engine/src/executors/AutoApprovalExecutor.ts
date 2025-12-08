import { BaseExecutor } from './BaseExecutor';
import type { ActionExecutionResult } from '../types';

export class AutoApprovalExecutor extends BaseExecutor {
  executorId = 'auto-approval-executor';
  description = 'Automatically approves requests based on configured conditions';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      this.logInfo('🤖 [EXECUTOR] Executing auto approval', {
        stepId: step.nodeId,
        context: context?.tenantId
      });

      const config = step.config || {};
      const conditions = config.conditions || {};
      
      let shouldApprove = true;
      let reason = 'Automatic approval - all conditions met';

      if (conditions.maxAmount && inputData?.amount) {
        if (parseFloat(inputData.amount) > parseFloat(conditions.maxAmount)) {
          shouldApprove = false;
          reason = `Amount ${inputData.amount} exceeds threshold ${conditions.maxAmount}`;
        }
      }

      if (conditions.allowedRoles && context?.requesterRole) {
        if (!conditions.allowedRoles.includes(context.requesterRole)) {
          shouldApprove = false;
          reason = `User role ${context.requesterRole} not in allowed list`;
        }
      }

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
      this.logError('❌ [EXECUTOR] Auto approval failed', {
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
