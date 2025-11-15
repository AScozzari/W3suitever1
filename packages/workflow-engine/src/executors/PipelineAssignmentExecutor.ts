import { ActionExecutionResult } from '../types';
import { BaseExecutor } from './BaseExecutor';

export class PipelineAssignmentExecutor extends BaseExecutor {
  executorId = 'pipeline-assignment-executor';
  description = 'Assigns leads/deals to pipeline based on campaign routing rules';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      this.logInfo('🎯 [EXECUTOR] Executing pipeline assignment', {
        stepId: step.nodeId,
        tenantId: context?.tenantId
      });

      const config = step.config || {};
      const leadData = inputData?.lead || inputData;
      const campaignData = inputData?.campaign || {};

      const storeId = campaignData.storeId || leadData?.storeId || config.storeId;
      if (storeId) {
        const scopeCheck = await this.validateUserScope(
          context.requesterId,
          context.tenantId,
          storeId
        );

        if (!scopeCheck.hasAccess) {
          return {
            success: false,
            message: 'User lacks permissions for pipeline store scope',
            error: 'SCOPE_DENIED',
            data: { storeId, reason: scopeCheck.message }
          };
        }
      }

      const pipelineRules = config.pipelineRules || [];
      const defaultPipelineId = campaignData.primaryPipelineId || config.defaultPipelineId;
      const productInterest = leadData?.productInterest;

      for (const rule of pipelineRules) {
        let conditionsMet = true;

        if (rule.productInterest && productInterest !== rule.productInterest) {
          conditionsMet = false;
        }

        if (rule.sourceChannel && leadData?.sourceChannel !== rule.sourceChannel) {
          conditionsMet = false;
        }

        if (rule.minScore !== undefined && (leadData?.leadScore || 0) < rule.minScore) {
          conditionsMet = false;
        }

        if (conditionsMet && rule.pipelineId) {
          return {
            success: true,
            message: `Lead assigned to pipeline: ${rule.pipelineName || rule.pipelineId}`,
            data: {
              leadId: leadData?.id,
              pipelineId: rule.pipelineId,
              pipelineName: rule.pipelineName,
              assignmentReason: `Matched rule: ${rule.name || 'Unnamed rule'}`,
              productInterest,
              leadScore: leadData?.leadScore
            },
            nextAction: rule.pipelineId
          };
        }
      }

      if (defaultPipelineId) {
        return {
          success: true,
          message: 'Lead assigned to default campaign pipeline',
          data: {
            leadId: leadData?.id,
            pipelineId: defaultPipelineId,
            assignmentReason: 'No matching rules - using default pipeline',
            productInterest,
            leadScore: leadData?.leadScore
          },
          nextAction: defaultPipelineId
        };
      }

      return {
        success: false,
        message: 'No pipeline assignment rules matched and no default pipeline configured',
        error: 'NO_PIPELINE_CONFIGURED',
        data: {
          leadId: leadData?.id,
          productInterest,
          leadScore: leadData?.leadScore
        }
      };

    } catch (error) {
      this.logError('❌ [EXECUTOR] Pipeline assignment failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      return {
        success: false,
        message: 'Failed to assign pipeline',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
