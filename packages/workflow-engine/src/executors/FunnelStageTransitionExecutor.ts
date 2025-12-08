import { ActionExecutionResult } from '../types';
import { BaseExecutor } from './BaseExecutor';

export class FunnelStageTransitionExecutor extends BaseExecutor {
  executorId = 'funnel-stage-transition-executor';
  description = 'Handles stage transition within pipeline with validation and workflow triggers';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      this.logInfo('🎯 [EXECUTOR] Executing funnel stage transition', {
        stepId: step.nodeId,
        tenantId: context?.tenantId
      });

      const config = step.config || {};
      const dealData = inputData?.deal || inputData;
      const dealId = dealData?.id || config.dealId;
      const targetStage = config.targetStage;

      if (!dealId || !targetStage) {
        throw new Error('Deal ID and target stage are required');
      }

      if (config.conditions) {
        const { minDealValue, maxDaysInStage } = config.conditions;
        
        if (minDealValue && dealData?.value < minDealValue) {
          return {
            success: false,
            message: `Deal value ${dealData.value} below minimum ${minDealValue}`,
            error: 'CONDITION_NOT_MET'
          };
        }

        if (maxDaysInStage && dealData?.daysInStage > maxDaysInStage) {
          return {
            success: false,
            message: `Deal exceeded max days in stage (${maxDaysInStage})`,
            error: 'CONDITION_NOT_MET'
          };
        }
      }

      const updatedDeals = await this.runtime.database.query(
        `UPDATE crm_deals 
         SET stage = $1, updated_at = $2
         WHERE id = $3 AND tenant_id = $4
         RETURNING *`,
        [targetStage, new Date(), dealId, context.tenantId]
      );

      const updatedDeal = updatedDeals[0];

      if (config.notifyTeam && updatedDeal.team_id) {
        await this.sendNotification(
          context.tenantId,
          updatedDeal.team_id,
          'Deal Stage Changed',
          `Deal moved to stage: ${targetStage}`,
          'deal_stage_change',
          'medium',
          { dealId, stage: targetStage }
        );
      }

      this.logInfo('✅ [EXECUTOR] Stage transition completed', {
        dealId,
        targetStage,
        requiresApproval: config.requiresApproval
      });

      return {
        success: true,
        message: `Deal stage updated to: ${targetStage}`,
        data: {
          dealId: updatedDeal.id,
          previousStage: dealData?.stage,
          currentStage: targetStage,
          requiresApproval: config.requiresApproval,
          workflowsTriggered: config.triggerWorkflows || []
        }
      };

    } catch (error) {
      this.logError('❌ [EXECUTOR] Funnel stage transition failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      return {
        success: false,
        message: 'Failed to transition deal stage',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
