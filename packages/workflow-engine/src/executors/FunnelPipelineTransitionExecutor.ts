import { ActionExecutionResult } from '../types';
import { BaseExecutor } from './BaseExecutor';

export class FunnelPipelineTransitionExecutor extends BaseExecutor {
  executorId = 'funnel-pipeline-transition-executor';
  description = 'Handles pipeline transition within funnel with validation and history preservation';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      this.logInfo('🔀 [EXECUTOR] Executing funnel pipeline transition', {
        stepId: step.nodeId,
        tenantId: context?.tenantId
      });

      const config = step.config || {};
      const dealData = inputData?.deal || inputData;
      const dealId = dealData?.id || config.dealId;
      const targetPipelineId = config.targetPipelineId;
      const funnelId = config.funnelId;

      if (!dealId || !targetPipelineId || !funnelId) {
        throw new Error('Deal ID, target pipeline ID and funnel ID are required');
      }

      const targetPipelines = await this.runtime.database.query(
        `SELECT * FROM crm_pipelines 
         WHERE id = $1 AND funnel_id = $2 AND tenant_id = $3
         LIMIT 1`,
        [targetPipelineId, funnelId, context.tenantId]
      );

      const targetPipeline = targetPipelines[0];

      if (!targetPipeline) {
        return {
          success: false,
          message: 'Target pipeline not found or not in the same funnel',
          error: 'INVALID_PIPELINE'
        };
      }

      let targetStage = dealData?.stage;
      if (config.resetStage) {
        const firstStages = await this.runtime.database.query(
          `SELECT * FROM crm_pipeline_stages 
           WHERE pipeline_id = $1
           ORDER BY order_index
           LIMIT 1`,
          [targetPipelineId]
        );

        targetStage = firstStages[0]?.name || targetStage;
      }

      const updatedDeals = await this.runtime.database.query(
        `UPDATE crm_deals 
         SET pipeline_id = $1, stage = $2, updated_at = $3
         WHERE id = $4 AND tenant_id = $5
         RETURNING *`,
        [targetPipelineId, targetStage, new Date(), dealId, context.tenantId]
      );

      const updatedDeal = updatedDeals[0];

      if (config.triggerAIReScore) {
        this.logInfo('🤖 [EXECUTOR] Triggering AI re-score after pipeline change', {
          dealId
        });
      }

      if (config.notifyAssignee && updatedDeal.assigned_to_user_id) {
        await this.sendNotification(
          context.tenantId,
          updatedDeal.assigned_to_user_id,
          'Deal Pipeline Changed',
          `Your deal has been moved to pipeline: ${targetPipeline.name}`,
          'deal_pipeline_change',
          'high',
          {
            dealId,
            targetPipelineName: targetPipeline.name,
            transitionReason: config.transitionReason
          }
        );
      }

      this.logInfo('✅ [EXECUTOR] Pipeline transition completed', {
        dealId,
        targetPipelineId,
        transitionReason: config.transitionReason
      });

      return {
        success: true,
        message: `Deal moved to pipeline: ${targetPipeline.name}`,
        data: {
          dealId: updatedDeal.id,
          previousPipelineId: dealData?.pipelineId,
          currentPipelineId: targetPipelineId,
          currentStage: targetStage,
          transitionReason: config.transitionReason,
          resetStage: config.resetStage,
          preserveHistory: config.preserveHistory
        },
        nextAction: targetPipelineId
      };

    } catch (error) {
      this.logError('❌ [EXECUTOR] Funnel pipeline transition failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      return {
        success: false,
        message: 'Failed to transition deal pipeline',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
