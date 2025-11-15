import { ActionExecutionResult } from '../types';
import { BaseExecutor } from './BaseExecutor';

export class FunnelExitExecutor extends BaseExecutor {
  executorId = 'funnel-exit-executor';
  description = 'Handles deal exit from funnel with customer record creation and analytics';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      this.logInfo('🏁 [EXECUTOR] Executing funnel exit', {
        stepId: step.nodeId,
        tenantId: context?.tenantId
      });

      const config = step.config || {};
      const dealData = inputData?.deal || inputData;
      const dealId = dealData?.id || config.dealId;
      const exitReason = config.exitReason;

      if (!dealId || !exitReason) {
        throw new Error('Deal ID and exit reason are required');
      }

      const newStatus = exitReason === 'won' ? 'won' : 'lost';
      const updatedDeals = await this.runtime.database.query(
        `UPDATE crm_deals 
         SET status = $1, closed_at = $2, lost_reason = $3, updated_at = $4
         WHERE id = $5 AND tenant_id = $6
         RETURNING *`,
        [newStatus, new Date(), exitReason === 'lost' ? config.lostReason : null, new Date(), dealId, context.tenantId]
      );

      const updatedDeal = updatedDeals[0];

      let customerId = null;
      if (exitReason === 'won' && config.createCustomerRecord && dealData?.personId) {
        this.logInfo('📝 [EXECUTOR] Creating customer record for won deal', {
          dealId,
          personId: dealData.personId
        });
      }

      if (config.archiveDeal) {
        await this.runtime.database.query(
          'UPDATE crm_deals SET is_archived = $1 WHERE id = $2',
          [true, dealId]
        );
      }

      if (exitReason === 'churned' && config.triggerRetentionWorkflow) {
        this.logInfo('🔄 [EXECUTOR] Triggering retention workflow', {
          dealId,
          customerId: dealData?.personId
        });
      }

      if (config.notifyAnalytics) {
        this.logInfo('📊 [EXECUTOR] Sending funnel exit analytics event', {
          dealId,
          exitReason,
          value: updatedDeal.value,
          status: newStatus
        });
      }

      this.logInfo('✅ [EXECUTOR] Funnel exit completed', {
        dealId,
        exitReason,
        status: newStatus
      });

      return {
        success: true,
        message: `Deal ${exitReason}: ${newStatus}`,
        data: {
          dealId: updatedDeal.id,
          exitReason,
          status: newStatus,
          value: updatedDeal.value,
          customerId,
          closedAt: updatedDeal.closedAt,
          archived: config.archiveDeal
        }
      };

    } catch (error) {
      this.logError('❌ [EXECUTOR] Funnel exit failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      return {
        success: false,
        message: 'Failed to exit deal from funnel',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
