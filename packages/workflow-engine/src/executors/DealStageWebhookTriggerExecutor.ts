import { BaseExecutor } from './BaseExecutor';
import type { ActionExecutionResult } from '../types';

export class DealStageWebhookTriggerExecutor extends BaseExecutor {
  executorId = 'deal-stage-webhook-trigger-executor';
  description = 'Sends webhooks on deal stage/pipeline changes with retry policy';

  async execute(step: any, inputData?: any, context?: any): Promise<ActionExecutionResult> {
    try {
      this.logInfo('🔗 [EXECUTOR] Executing deal stage webhook trigger', {
        stepId: step.nodeId,
        tenantId: context?.tenantId
      });

      const config = step.config || {};
      const dealData = inputData?.deal || inputData;
      const webhookUrl = config.webhookUrl;

      if (!webhookUrl) {
        throw new Error('Webhook URL is required');
      }

      const shouldTrigger =
        (config.onStageChange && dealData?.stageChanged) ||
        (config.onPipelineChange && dealData?.pipelineChanged) ||
        (config.onDealWon && dealData?.status === 'won') ||
        (config.onDealLost && dealData?.status === 'lost');

      if (!shouldTrigger) {
        return {
          success: true,
          message: 'Webhook not triggered (conditions not met)',
          data: { triggered: false }
        };
      }

      const payload = {
        event: dealData?.stageChanged ? 'deal.stage.changed' :
               dealData?.pipelineChanged ? 'deal.pipeline.changed' :
               dealData?.status === 'won' ? 'deal.won' :
               dealData?.status === 'lost' ? 'deal.lost' : 'deal.updated',
        tenantId: context.tenantId,
        dealId: dealData?.id,
        timestamp: new Date().toISOString(),
        data: {
          ...dealData,
          ...(config.payload || {})
        }
      };

      const retryPolicy = config.retryPolicy || { maxRetries: 3, delayMs: 1000 };
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= retryPolicy.maxRetries + 1; attempt++) {
        try {
          const fetch = (await import('node-fetch')).default;
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(config.headers || {})
            },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
          }

          this.logInfo('✅ [EXECUTOR] Webhook sent successfully', {
            webhookUrl,
            attempt,
            status: response.status
          });

          return {
            success: true,
            message: 'Webhook sent successfully',
            data: {
              webhookUrl,
              event: payload.event,
              dealId: dealData?.id,
              attempts: attempt,
              status: response.status
            }
          };

        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          if (attempt < retryPolicy.maxRetries + 1) {
            this.logWarn('⚠️ [EXECUTOR] Webhook attempt failed, retrying', {
              webhookUrl,
              attempt,
              error: lastError.message
            });
            
            const delay = retryPolicy.delayMs * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      throw lastError;

    } catch (error) {
      this.logError('❌ [EXECUTOR] Deal stage webhook trigger failed', {
        error: error instanceof Error ? error.message : String(error),
        stepId: step.nodeId
      });

      return {
        success: false,
        message: 'Failed to send webhook',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
