import { ActionExecutionResult } from '../types';
import { BaseExecutor } from './BaseExecutor';

export class AiDecisionExecutor extends BaseExecutor {
  executorId = 'ai-decision-executor';
  description = 'Uses workflow-assistant AI agent to make intelligent decisions based on context';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      this.logInfo('🧠 [EXECUTOR] Executing AI decision with workflow-assistant agent', {
        stepId: step.nodeId,
        context: context?.tenantId
      });

      const config = step.config || {};
      const userPrompt = config.prompt || 'Analyze this workflow decision request and provide a decision with clear reasoning.';
      const maxTokens = config.parameters?.maxTokens || 500;

      const aiInput = `
Workflow Decision Request:
- Step: ${step.config?.label || 'Decision Point'}
- Request Data: ${JSON.stringify(inputData, null, 2)}
- Context: Tenant ${context?.tenantId}, Requester ${context?.requesterId}

${userPrompt}

Please analyze this information and provide a decision. Respond in JSON format:
{"decision": "approve|reject|escalate", "reason": "clear explanation", "confidence": "high|medium|low"}
      `;

      this.logInfo('🤖 [EXECUTOR] Calling workflow-assistant agent', {
        agentId: 'workflow-assistant',
        maxTokens
      });

      const response = await this.callAI(
        aiInput,
        {
          agentId: 'workflow-assistant',
          tenantId: context?.tenantId || 'default',
          userId: context?.requesterId || 'system',
          moduleContext: 'workflow',
          businessEntityId: context?.instanceId
        },
        {
          maxTokens,
          temperature: 0
        }
      );

      if (!response.success || !response.output) {
        throw new Error('AI service returned unsuccessful response');
      }

      let decision = 'approve';
      let reason = 'AI decision completed';
      let confidence = 'medium';
      
      try {
        const parsed = JSON.parse(response.output);
        decision = parsed.decision || 'approve';
        reason = parsed.reason || 'AI analysis completed';
        confidence = parsed.confidence || 'medium';
      } catch {
        const aiResponse = response.output.toLowerCase();
        if (aiResponse.includes('reject')) {
          decision = 'reject';
        } else if (aiResponse.includes('escalate')) {
          decision = 'escalate';
        }
        reason = response.output;
      }

      this.logInfo('✅ [EXECUTOR] AI decision completed', {
        decision,
        confidence,
        agentUsed: 'workflow-assistant'
      });

      return {
        success: true,
        message: `AI Decision: ${decision} - ${reason}`,
        decision,
        data: {
          aiResponse: response.output,
          agentId: 'workflow-assistant',
          confidence,
          inputData,
          evaluatedAt: new Date().toISOString(),
          tokensUsed: response.tokensUsed,
          cost: response.cost
        }
      };

    } catch (error) {
      this.logError('❌ [EXECUTOR] AI decision failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      return {
        success: true,
        message: 'AI decision failed, defaulting to approve',
        decision: 'approve',
        data: {
          fallback: true,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}
