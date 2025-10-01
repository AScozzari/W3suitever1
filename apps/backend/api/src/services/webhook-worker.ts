import { redisService } from '../core/redis-service.js';
import { WebhookService } from './webhook-service.js';
import { WorkflowEngine } from './workflow-engine.js';
import { logger } from '../core/logger.js';
import { db } from '../core/db.js';
import { eq, and } from 'drizzle-orm';
import { webhookEvents, workflowTriggers } from '../db/schema/w3suite.js';

/**
 * Webhook Worker
 * Consumes webhook events from Redis queue and triggers workflow engine
 */
export class WebhookWorker {
  private isRunning: boolean = false;
  private priority: 'low' | 'medium' | 'high' | 'critical';

  constructor(priority: 'low' | 'medium' | 'high' | 'critical' = 'high') {
    this.priority = priority;
  }

  /**
   * Start the webhook worker
   * Runs in infinite loop consuming events from Redis queue
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('🪝 Webhook worker already running', { priority: this.priority });
      return;
    }

    this.isRunning = true;
    logger.info('🪝 Webhook worker started', { priority: this.priority });

    // Process queue with callback
    await redisService.processWebhookQueue(
      this.priority,
      async (event) => {
        await this.processWebhookEvent(event);
      },
      5 // 5 second timeout
    );
  }

  /**
   * Stop the webhook worker
   */
  stop(): void {
    this.isRunning = false;
    logger.info('🪝 Webhook worker stopped', { priority: this.priority });
  }

  /**
   * Static method to process a webhook event (for fallback poller)
   */
  static async processEvent(queuedEvent: any): Promise<void> {
    const worker = new WebhookWorker();
    return worker.processWebhookEvent(queuedEvent);
  }

  /**
   * Process a single webhook event
   */
  private async processWebhookEvent(queuedEvent: any): Promise<void> {
    const { id: eventId, tenantId, eventType, source } = queuedEvent;

    try {
      logger.info('🪝 Processing webhook event', {
        eventId,
        tenantId,
        eventType,
        source
      });

      // STEP 1: Update event status to 'processing'
      await WebhookService.updateWebhookEventStatus(
        eventId,
        tenantId,
        'processing'
      );

      // STEP 2: Find matching workflow trigger
      const trigger = await this.findMatchingWorkflowTrigger(
        tenantId,
        eventType,
        source
      );

      if (!trigger) {
        logger.info('🪝 No workflow trigger found for webhook event', {
          eventId,
          eventType,
          source,
          tenantId
        });

        // Mark as completed (no workflow to trigger)
        await WebhookService.updateWebhookEventStatus(
          eventId,
          tenantId,
          'completed',
          {
            processingError: 'No matching workflow trigger found'
          }
        );

        // Mark as processed in Redis with long TTL (24h)
        await redisService.markWebhookProcessed(tenantId, source, queuedEvent.eventId, 86400);
        
        return;
      }

      // STEP 3: Extract workflow template from trigger config
      const templateId = trigger.config?.templateId || trigger.config?.workflowTemplateId;

      if (!templateId) {
        logger.warn('🪝 Workflow trigger has no template ID', {
          triggerId: trigger.id,
          eventId,
          tenantId
        });

        await WebhookService.updateWebhookEventStatus(
          eventId,
          tenantId,
          'failed',
          {
            processingError: 'Workflow trigger has no template ID configured'
          }
        );

        await redisService.markWebhookProcessed(tenantId, source, queuedEvent.eventId, 86400);
        return;
      }

      // STEP 4: Create workflow instance from template
      const workflowEngine = new WorkflowEngine();
      const workflowInstance = await workflowEngine.createInstanceFromReactFlow(
        templateId,
        {
          tenantId,
          requesterId: 'system', // Webhook-triggered workflows are system-initiated
          requestId: eventId, // Link to webhook event
          instanceName: `Webhook: ${eventType}`,
          metadata: {
            webhookEventId: eventId,
            webhookSource: source,
            webhookEventType: eventType,
            webhookPayload: queuedEvent.payload,
            triggeredBy: 'webhook',
            triggerId: trigger.id
          }
        }
      );

      logger.info('✅ Workflow instance created from webhook', {
        eventId,
        workflowInstanceId: workflowInstance.id,
        templateId,
        eventType,
        tenantId
      });

      // STEP 5: Update webhook event with workflow instance info
      await WebhookService.updateWebhookEventStatus(
        eventId,
        tenantId,
        'completed',
        {
          workflowInstanceId: workflowInstance.id,
          workflowTriggerId: trigger.id
        }
      );

      // STEP 6: Mark as processed in Redis with long TTL (24h)
      await redisService.markWebhookProcessed(tenantId, source, queuedEvent.eventId, 86400);

      logger.info('✅ Webhook event processed successfully', {
        eventId,
        workflowInstanceId: workflowInstance.id,
        tenantId
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('❌ Webhook event processing failed', {
        error: errorMessage,
        eventId,
        tenantId,
        eventType,
        source
      });

      // Update event status to 'failed'
      try {
        await WebhookService.updateWebhookEventStatus(
          eventId,
          tenantId,
          'failed',
          {
            processingError: errorMessage
          }
        );
      } catch (updateError) {
        logger.error('❌ Failed to update webhook event status', {
          error: updateError instanceof Error ? updateError.message : String(updateError),
          eventId,
          tenantId
        });
      }

      // Check retry count and requeue if needed
      await this.handleRetry(queuedEvent, errorMessage);
    }
  }

  /**
   * Find workflow trigger that matches webhook event
   */
  private async findMatchingWorkflowTrigger(
    tenantId: string,
    eventType: string,
    source: string
  ) {
    try {
      // Query workflow triggers with matching event type and source
      const triggers = await db
        .select()
        .from(workflowTriggers)
        .where(and(
          eq(workflowTriggers.tenantId, tenantId),
          eq(workflowTriggers.triggerType, 'webhook'),
          eq(workflowTriggers.isActive, true)
        ));

      // Filter triggers by config matching
      const matchingTrigger = triggers.find(trigger => {
        const config = trigger.config as any;
        
        // Check if source matches
        if (config.webhookSource && config.webhookSource !== source) {
          return false;
        }

        // Check if event type matches (exact or pattern)
        if (config.eventType) {
          // Support wildcard patterns like "payment.*"
          const eventPattern = config.eventType.replace(/\*/g, '.*');
          const regex = new RegExp(`^${eventPattern}$`);
          
          if (!regex.test(eventType)) {
            return false;
          }
        }

        return true;
      });

      if (matchingTrigger) {
        logger.debug('🎯 Found matching workflow trigger', {
          triggerId: matchingTrigger.id,
          triggerName: matchingTrigger.name,
          eventType,
          source,
          tenantId
        });
      }

      return matchingTrigger || null;
    } catch (error) {
      logger.error('❌ Error finding matching workflow trigger', {
        error: error instanceof Error ? error.message : String(error),
        eventType,
        source,
        tenantId
      });
      return null;
    }
  }

  /**
   * Handle retry logic for failed events
   */
  private async handleRetry(queuedEvent: any, errorMessage: string): Promise<void> {
    try {
      const { id: eventId, tenantId, retryCount = 0, maxRetries = 3, priority } = queuedEvent;

      if (retryCount < maxRetries) {
        const newRetryCount = retryCount + 1;
        const nextRetryDelay = Math.pow(2, newRetryCount) * 1000; // Exponential backoff: 2s, 4s, 8s

        logger.info('🔄 Requeuing webhook event for retry', {
          eventId,
          retryCount: newRetryCount,
          maxRetries,
          nextRetryDelay,
          tenantId
        });

        // Wait before requeuing
        await new Promise(resolve => setTimeout(resolve, nextRetryDelay));

        // Requeue with incremented retry count
        await redisService.queueWebhookEvent({
          ...queuedEvent,
          retryCount: newRetryCount
        });

        // Update event in database with retry info
        await db
          .update(webhookEvents)
          .set({
            retryCount: newRetryCount,
            nextRetryAt: new Date(Date.now() + nextRetryDelay),
            processingError: errorMessage,
            updatedAt: new Date()
          })
          .where(and(
            eq(webhookEvents.id, eventId),
            eq(webhookEvents.tenantId, tenantId)
          ));

      } else {
        logger.error('❌ Max retries exceeded for webhook event', {
          eventId,
          retryCount,
          maxRetries,
          tenantId
        });

        // Mark as processed even though failed (prevent infinite retries)
        await redisService.markWebhookProcessed(
          tenantId,
          queuedEvent.source,
          queuedEvent.eventId,
          86400 // 24h TTL
        );
      }
    } catch (error) {
      logger.error('❌ Error handling webhook retry', {
        error: error instanceof Error ? error.message : String(error),
        eventId: queuedEvent.id,
        tenantId: queuedEvent.tenantId
      });
    }
  }
}

// Export singleton workers for each priority
export const criticalWebhookWorker = new WebhookWorker('critical');
export const highWebhookWorker = new WebhookWorker('high');
export const mediumWebhookWorker = new WebhookWorker('medium');
export const lowWebhookWorker = new WebhookWorker('low');

/**
 * Start all webhook workers
 */
export async function startAllWebhookWorkers(): Promise<void> {
  logger.info('🚀 Starting all webhook workers');
  
  // Start workers in parallel
  await Promise.all([
    criticalWebhookWorker.start(),
    highWebhookWorker.start(),
    mediumWebhookWorker.start(),
    lowWebhookWorker.start()
  ]);
}

/**
 * Stop all webhook workers
 */
export function stopAllWebhookWorkers(): void {
  logger.info('🛑 Stopping all webhook workers');
  
  criticalWebhookWorker.stop();
  highWebhookWorker.stop();
  mediumWebhookWorker.stop();
  lowWebhookWorker.stop();
}
