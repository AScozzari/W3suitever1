import { ActionExecutionResult } from '../types';
import { BaseExecutor } from './BaseExecutor';

export class AIFunnelOrchestratorExecutor extends BaseExecutor {
  executorId = 'ai-funnel-orchestrator-executor';
  description = 'AI-powered funnel orchestration for intelligent pipeline routing';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      this.logInfo('🤖 [EXECUTOR] Executing AI Funnel Orchestrator', {
        stepId: step.nodeId,
        tenantId: context?.tenantId
      });

      const config = step.config || {};
      const dealData = inputData?.deal || inputData;
      const funnelId = config.funnelId;
      const currentPipelineId = config.currentPipelineId || dealData?.pipelineId;

      if (!funnelId || !currentPipelineId) {
        throw new Error('Funnel ID and current pipeline ID are required');
      }

      const funnelPipelines = await this.runtime.database.query(
        `SELECT id AS "pipelineId", name, domain, funnel_stage_order AS "funnelStageOrder"
         FROM crm_pipelines
         WHERE funnel_id = $1`,
        [funnelId]
      );

      const aiInput = `
Analizza questo deal e decidi la pipeline ottimale:

${JSON.stringify({
  dealId: dealData?.id,
  currentPipelineId,
  funnelId,
  funnelPipelines,
  dealData: {
    value: dealData?.value || 0,
    customerSegment: dealData?.customerType || 'b2c',
    leadScore: dealData?.leadScore || 50,
    daysInCurrentPipeline: dealData?.daysInStage || 0,
    daysInFunnel: config.contextData?.daysInFunnel || 0,
    probabilityToClose: dealData?.probability || 50,
    customerLifetimeValue: config.contextData?.customerLifetimeValue || 0,
    interactionQuality: config.contextData?.interactionQuality || 'medium'
  },
  customerHistory: config.contextData?.customerHistory || {}
}, null, 2)}

Rispondi con JSON strutturato secondo il formato richiesto.
      `;

      const response = await this.callAI(
        aiInput,
        {
          agentId: 'funnel-orchestrator-assistant',
          tenantId: context.tenantId,
          userId: context.requesterId,
          moduleContext: 'crm',
          businessEntityId: dealData?.id
        },
        {
          model: 'gpt-4o',
          maxTokens: 800,
          temperature: 0.3
        }
      );

      if (!response.success || !response.output) {
        throw new Error('AI orchestration failed');
      }

      const aiDecision = JSON.parse(response.output);
      const autoAssignThreshold = config.autoAssignThreshold || 80;

      this.logInfo('✅ [EXECUTOR] AI Funnel Orchestrator decision', {
        targetPipelineId: aiDecision.targetPipelineId,
        confidence: aiDecision.confidence,
        reasoning: aiDecision.reasoning,
        autoAssign: aiDecision.confidence >= autoAssignThreshold
      });

      if (aiDecision.confidence >= autoAssignThreshold) {
        return {
          success: true,
          message: `AI recommends pipeline: ${aiDecision.reasoning}`,
          data: {
            ...aiDecision,
            autoAssigned: true,
            tokensUsed: response.tokensUsed,
            cost: response.cost
          },
          nextAction: aiDecision.targetPipelineId
        };
      }

      return {
        success: true,
        message: `AI suggests pipeline (confidence ${aiDecision.confidence}%): ${aiDecision.reasoning}`,
        data: {
          ...aiDecision,
          autoAssigned: false,
          requiresManualConfirmation: true,
          tokensUsed: response.tokensUsed,
          cost: response.cost
        }
      };

    } catch (error) {
      this.logError('❌ [EXECUTOR] AI Funnel Orchestrator failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      const fallbackPipelineId = step.config?.fallbackPipelineId;
      if (fallbackPipelineId) {
        return {
          success: true,
          message: 'AI orchestration failed, using fallback pipeline',
          data: {
            targetPipelineId: fallbackPipelineId,
            confidence: 50,
            reasoning: 'Fallback pipeline (AI failed)',
            fallbackUsed: true,
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          nextAction: fallbackPipelineId
        };
      }

      return {
        success: false,
        message: 'AI funnel orchestration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
