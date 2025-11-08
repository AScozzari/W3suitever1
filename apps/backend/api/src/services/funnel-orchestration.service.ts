import { db } from '../core/db';
import { 
  crmDeals, 
  crmPipelines, 
  crmPipelineStages,
  crmFunnels 
} from '../db/schema/w3suite';
import { eq, and } from 'drizzle-orm';
import { logger } from '../core/logger';
import { AIRegistryService, RegistryAwareContext } from './ai-registry-service';
import { storage } from '../core/storage';

/**
 * 🎯 FUNNEL ORCHESTRATION SERVICE
 * Centralized service for funnel-based deal transitions
 */
export class FunnelOrchestrationService {
  private aiRegistry: AIRegistryService;

  constructor() {
    this.aiRegistry = new AIRegistryService(storage);
  }

  /**
   * 🔄 TRANSITION DEAL STAGE
   * Move deal to a different stage within the same pipeline
   */
  async transitionStage(params: {
    dealId: string;
    targetStage: string;
    tenantId: string;
    userId: string;
    notifyTeam?: boolean;
    triggerWorkflows?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    data?: any;
    error?: string;
  }> {
    try {
      logger.info('🎯 [FUNNEL-ORCHESTRATION] Transitioning deal stage', {
        dealId: params.dealId,
        targetStage: params.targetStage,
        tenantId: params.tenantId
      });

      // Get current deal
      const [currentDeal] = await db
        .select()
        .from(crmDeals)
        .where(
          and(
            eq(crmDeals.id, params.dealId),
            eq(crmDeals.tenantId, params.tenantId)
          )
        )
        .limit(1);

      if (!currentDeal) {
        return {
          success: false,
          message: 'Deal not found',
          error: 'DEAL_NOT_FOUND'
        };
      }

      // Validate stage exists in pipeline
      const validStages = await db
        .select()
        .from(crmPipelineStages)
        .where(eq(crmPipelineStages.pipelineId, currentDeal.pipelineId));

      const targetStageExists = validStages.some(s => s.name === params.targetStage);
      if (!targetStageExists) {
        return {
          success: false,
          message: 'Target stage does not exist in current pipeline',
          error: 'INVALID_STAGE'
        };
      }

      // Update deal stage
      const [updatedDeal] = await db
        .update(crmDeals)
        .set({
          stage: params.targetStage,
          updatedAt: new Date()
        })
        .where(eq(crmDeals.id, params.dealId))
        .returning();

      logger.info('✅ [FUNNEL-ORCHESTRATION] Stage transition completed', {
        dealId: params.dealId,
        previousStage: currentDeal.stage,
        currentStage: params.targetStage
      });

      return {
        success: true,
        message: `Deal stage updated to: ${params.targetStage}`,
        data: {
          dealId: updatedDeal.id,
          previousStage: currentDeal.stage,
          currentStage: params.targetStage,
          pipelineId: updatedDeal.pipelineId
        }
      };

    } catch (error) {
      logger.error('❌ [FUNNEL-ORCHESTRATION] Stage transition failed', {
        error: error instanceof Error ? error.message : String(error),
        dealId: params.dealId
      });

      return {
        success: false,
        message: 'Failed to transition deal stage',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 🔀 TRANSITION DEAL PIPELINE
   * Move deal to a different pipeline within the same funnel
   */
  async transitionPipeline(params: {
    dealId: string;
    targetPipelineId: string;
    tenantId: string;
    userId: string;
    resetStage?: boolean;
    triggerAIReScore?: boolean;
    transitionReason?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data?: any;
    error?: string;
  }> {
    try {
      logger.info('🔀 [FUNNEL-ORCHESTRATION] Transitioning deal pipeline', {
        dealId: params.dealId,
        targetPipelineId: params.targetPipelineId,
        tenantId: params.tenantId
      });

      // Get current deal
      const [currentDeal] = await db
        .select()
        .from(crmDeals)
        .where(
          and(
            eq(crmDeals.id, params.dealId),
            eq(crmDeals.tenantId, params.tenantId)
          )
        )
        .limit(1);

      if (!currentDeal) {
        return {
          success: false,
          message: 'Deal not found',
          error: 'DEAL_NOT_FOUND'
        };
      }

      // Validate funnel constraint
      const validation = await this.validateFunnelTransition(
        currentDeal.pipelineId,
        params.targetPipelineId,
        params.tenantId
      );

      if (!validation.valid) {
        return {
          success: false,
          message: validation.error || 'Invalid funnel transition',
          error: 'INVALID_FUNNEL_TRANSITION'
        };
      }

      // Get target pipeline details
      const [targetPipeline] = await db
        .select()
        .from(crmPipelines)
        .where(eq(crmPipelines.id, params.targetPipelineId))
        .limit(1);

      if (!targetPipeline) {
        return {
          success: false,
          message: 'Target pipeline not found',
          error: 'PIPELINE_NOT_FOUND'
        };
      }

      // Get first stage of target pipeline if resetStage is true
      let targetStage = currentDeal.stage;
      if (params.resetStage) {
        const [firstStage] = await db
          .select()
          .from(crmPipelineStages)
          .where(eq(crmPipelineStages.pipelineId, params.targetPipelineId))
          .orderBy(crmPipelineStages.orderIndex)
          .limit(1);

        targetStage = firstStage?.name || targetStage;
      }

      // Update deal pipeline
      const [updatedDeal] = await db
        .update(crmDeals)
        .set({
          pipelineId: params.targetPipelineId,
          stage: targetStage,
          updatedAt: new Date()
        })
        .where(eq(crmDeals.id, params.dealId))
        .returning();

      logger.info('✅ [FUNNEL-ORCHESTRATION] Pipeline transition completed', {
        dealId: params.dealId,
        previousPipelineId: currentDeal.pipelineId,
        currentPipelineId: params.targetPipelineId,
        transitionReason: params.transitionReason
      });

      return {
        success: true,
        message: `Deal moved to pipeline: ${targetPipeline.name}`,
        data: {
          dealId: updatedDeal.id,
          previousPipelineId: currentDeal.pipelineId,
          currentPipelineId: params.targetPipelineId,
          currentStage: targetStage,
          transitionReason: params.transitionReason,
          resetStage: params.resetStage,
          funnelId: validation.funnelId
        }
      };

    } catch (error) {
      logger.error('❌ [FUNNEL-ORCHESTRATION] Pipeline transition failed', {
        error: error instanceof Error ? error.message : String(error),
        dealId: params.dealId
      });

      return {
        success: false,
        message: 'Failed to transition deal pipeline',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 🏁 EXIT DEAL FROM FUNNEL
   * Mark deal as won/lost/churned and exit funnel
   */
  async exitFunnel(params: {
    dealId: string;
    exitReason: 'won' | 'lost' | 'churned' | 'disqualified';
    tenantId: string;
    userId: string;
    lostReason?: string;
    createCustomerRecord?: boolean;
    archiveDeal?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    data?: any;
    error?: string;
  }> {
    try {
      logger.info('🏁 [FUNNEL-ORCHESTRATION] Exiting deal from funnel', {
        dealId: params.dealId,
        exitReason: params.exitReason,
        tenantId: params.tenantId
      });

      // Get current deal
      const [currentDeal] = await db
        .select()
        .from(crmDeals)
        .where(
          and(
            eq(crmDeals.id, params.dealId),
            eq(crmDeals.tenantId, params.tenantId)
          )
        )
        .limit(1);

      if (!currentDeal) {
        return {
          success: false,
          message: 'Deal not found',
          error: 'DEAL_NOT_FOUND'
        };
      }

      // Determine final status
      const newStatus = params.exitReason === 'won' ? 'won' : 'lost';

      // Update deal
      const [updatedDeal] = await db
        .update(crmDeals)
        .set({
          status: newStatus,
          closedAt: new Date(),
          lostReason: params.exitReason === 'lost' ? params.lostReason : null,
          isArchived: params.archiveDeal || false,
          updatedAt: new Date()
        })
        .where(eq(crmDeals.id, params.dealId))
        .returning();

      logger.info('✅ [FUNNEL-ORCHESTRATION] Funnel exit completed', {
        dealId: params.dealId,
        exitReason: params.exitReason,
        status: newStatus,
        value: updatedDeal.value
      });

      return {
        success: true,
        message: `Deal ${params.exitReason}: ${newStatus}`,
        data: {
          dealId: updatedDeal.id,
          exitReason: params.exitReason,
          status: newStatus,
          value: updatedDeal.value,
          closedAt: updatedDeal.closedAt,
          archived: params.archiveDeal
        }
      };

    } catch (error) {
      logger.error('❌ [FUNNEL-ORCHESTRATION] Funnel exit failed', {
        error: error instanceof Error ? error.message : String(error),
        dealId: params.dealId
      });

      return {
        success: false,
        message: 'Failed to exit deal from funnel',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * ✅ VALIDATE FUNNEL TRANSITION
   * Check if two pipelines belong to the same funnel
   */
  async validateFunnelTransition(
    currentPipelineId: string,
    targetPipelineId: string,
    tenantId: string
  ): Promise<{
    valid: boolean;
    funnelId?: string;
    error?: string;
  }> {
    try {
      // Get both pipelines
      const [currentPipeline, targetPipeline] = await Promise.all([
        db.select().from(crmPipelines)
          .where(eq(crmPipelines.id, currentPipelineId))
          .limit(1),
        db.select().from(crmPipelines)
          .where(eq(crmPipelines.id, targetPipelineId))
          .limit(1)
      ]);

      if (!currentPipeline[0] || !targetPipeline[0]) {
        return {
          valid: false,
          error: 'One or both pipelines not found'
        };
      }

      // Both pipelines must have a funnel
      if (!currentPipeline[0].funnelId || !targetPipeline[0].funnelId) {
        return {
          valid: false,
          error: 'Pipelines must belong to a funnel'
        };
      }

      // Both pipelines must be in the same funnel
      if (currentPipeline[0].funnelId !== targetPipeline[0].funnelId) {
        return {
          valid: false,
          error: 'Pipelines must belong to the same funnel'
        };
      }

      return {
        valid: true,
        funnelId: currentPipeline[0].funnelId
      };

    } catch (error) {
      logger.error('❌ [FUNNEL-ORCHESTRATION] Funnel validation failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        valid: false,
        error: 'Validation failed'
      };
    }
  }

  /**
   * 🤖 GET AI ORCHESTRATION SUGGESTIONS
   * Use AI to suggest next best pipeline for a deal
   */
  async getOrchestrationSuggestions(params: {
    dealId: string;
    funnelId: string;
    tenantId: string;
    userId: string;
  }): Promise<{
    success: boolean;
    suggestions?: any;
    error?: string;
  }> {
    try {
      logger.info('🤖 [FUNNEL-ORCHESTRATION] Getting AI orchestration suggestions', {
        dealId: params.dealId,
        funnelId: params.funnelId,
        tenantId: params.tenantId
      });

      // Get deal data
      const [deal] = await db
        .select()
        .from(crmDeals)
        .where(
          and(
            eq(crmDeals.id, params.dealId),
            eq(crmDeals.tenantId, params.tenantId)
          )
        )
        .limit(1);

      if (!deal) {
        return {
          success: false,
          error: 'Deal not found'
        };
      }

      // Get funnel pipelines
      const funnelPipelines = await db
        .select({
          pipelineId: crmPipelines.id,
          name: crmPipelines.name,
          domain: crmPipelines.domain,
          funnelStageOrder: crmPipelines.funnelStageOrder
        })
        .from(crmPipelines)
        .where(eq(crmPipelines.funnelId, params.funnelId));

      // Build AI input prompt
      const aiInput = `
Analizza questo deal e decidi la pipeline ottimale:

${JSON.stringify({
  dealId: deal.id,
  currentPipelineId: deal.pipelineId,
  funnelId: params.funnelId,
  funnelPipelines,
  dealData: {
    value: deal.value || 0,
    customerSegment: deal.customerType || 'b2c',
    leadScore: deal.leadScore || 50,
    stage: deal.stage,
    status: deal.status,
    probability: deal.probability || 50
  }
}, null, 2)}

Rispondi con JSON strutturato secondo il formato richiesto.
      `;

      // Call AI agent
      const registryContext: RegistryAwareContext = {
        agentId: 'funnel-orchestrator-assistant',
        tenantId: params.tenantId,
        userId: params.userId,
        moduleContext: 'crm',
        businessEntityId: deal.id
      };

      const response = await this.aiRegistry.createUnifiedResponse(
        aiInput,
        { openaiModel: 'gpt-4o', maxTokens: 800, temperature: 0.3 } as any,
        registryContext
      );

      if (!response.success || !response.output) {
        return {
          success: false,
          error: 'AI orchestration failed'
        };
      }

      // Parse AI response
      const aiSuggestions = JSON.parse(response.output);

      logger.info('✅ [FUNNEL-ORCHESTRATION] AI suggestions generated', {
        targetPipelineId: aiSuggestions.targetPipelineId,
        confidence: aiSuggestions.confidence,
        reasoning: aiSuggestions.reasoning
      });

      return {
        success: true,
        suggestions: {
          ...aiSuggestions,
          tokensUsed: response.tokensUsed,
          cost: response.cost
        }
      };

    } catch (error) {
      logger.error('❌ [FUNNEL-ORCHESTRATION] AI suggestions failed', {
        error: error instanceof Error ? error.message : String(error),
        dealId: params.dealId
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const funnelOrchestrationService = new FunnelOrchestrationService();
