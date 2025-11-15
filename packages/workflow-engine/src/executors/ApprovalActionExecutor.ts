import { BaseExecutor } from './BaseExecutor';
import type { ActionExecutionResult } from '../types';

export class ApprovalActionExecutor extends BaseExecutor {
  executorId = 'approval-action-executor';
  description = 'Handles approval requests and notifications';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      this.logInfo('✅ [EXECUTOR] Executing approval action', {
        stepId: step.nodeId,
        context: context?.tenantId
      });

      if (context?.currentAssigneeId && context.currentAssigneeId !== 'system') {
        const scopeCheck = await this.validateUserScope(
          context.currentAssigneeId,
          context.tenantId,
          context.storeId,
          context.legalEntityId
        );

        if (!scopeCheck.hasAccess) {
          this.logWarn('🚫 [EXECUTOR] Approval blocked - user lacks scope access', {
            userId: context.currentAssigneeId,
            storeId: context.storeId,
            legalEntityId: context.legalEntityId,
            reason: scopeCheck.message
          });

          return {
            success: false,
            message: scopeCheck.message || 'Non hai permessi per approvare questa richiesta',
            error: 'SCOPE_ACCESS_DENIED'
          };
        }
      }

      const config = step.config || {};
      const approverRole = config.approverRole || 'manager';
      const approvalMessage = config.message || `Approval required for: ${step.config?.label || 'Workflow Step'}`;

      if (context?.currentAssigneeId && context.currentAssigneeId !== 'system') {
        await this.sendNotification(
          context.tenantId,
          context.currentAssigneeId,
          'Approval Required',
          approvalMessage,
          'workflow_approval',
          'high',
          {
            stepId: step.nodeId,
            instanceId: context.instanceId,
            actionRequired: 'approve_or_reject',
            approverRole
          }
        );
      }

      return {
        success: true,
        message: 'Approval request sent successfully',
        data: {
          approverRole,
          assigneeId: context?.currentAssigneeId,
          status: 'waiting_approval',
          requestedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logError('❌ [EXECUTOR] Approval action failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      return {
        success: false,
        message: 'Failed to send approval request',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
