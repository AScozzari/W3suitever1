import { eq, and } from 'drizzle-orm';
import { db } from '../core/db.js';
import { webhookEvents } from '../db/schema/w3suite.js';
import { logger } from '../core/logger.js';
import { WebhookWorker } from './webhook-worker.js';

/**
 * Webhook DB Poller (Redis Fallback)
 * 
 * When Redis is unavailable, webhook events are stored in DB with status='pending'
 * This poller processes those pending events as a fallback mechanism
 */
export class WebhookPoller {
  private static isRunning = false;
  private static intervalId: NodeJS.Timeout | null = null;
  private static readonly POLL_INTERVAL_MS = 5000; // 5 seconds
  private static readonly BATCH_SIZE = 50; // Process up to 50 events per poll

  /**
   * Start the background poller
   */
  static start() {
    if (this.isRunning) {
      logger.warn('🔄 Webhook poller already running');
      return;
    }

    logger.info('🔄 Starting webhook DB poller (Redis fallback mode)');
    this.isRunning = true;

    // Initial poll
    this.pollPendingEvents().catch(err => {
      logger.error('🔄 Initial poll failed', { error: err.message });
    });

    // Schedule recurring polls
    this.intervalId = setInterval(async () => {
      try {
        await this.pollPendingEvents();
      } catch (error) {
        logger.error('🔄 Poller error', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, this.POLL_INTERVAL_MS);

    logger.info(`🔄 Webhook poller started (interval: ${this.POLL_INTERVAL_MS}ms)`);
  }

  /**
   * Stop the background poller
   */
  static stop() {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    logger.info('🔄 Webhook poller stopped');
  }

  /**
   * Poll and process pending webhook events from database
   */
  private static async pollPendingEvents() {
    try {
      // Query pending events (status='pending', not yet picked up by worker)
      const pendingEvents = await db
        .select()
        .from(webhookEvents)
        .where(
          and(
            eq(webhookEvents.status, 'pending')
          )
        )
        .limit(this.BATCH_SIZE);

      if (pendingEvents.length === 0) {
        return; // No pending events
      }

      logger.info(`🔄 Found ${pendingEvents.length} pending webhook events`, {
        batchSize: pendingEvents.length
      });

      // Process each event
      for (const event of pendingEvents) {
        try {
          // Mark as processing to prevent duplicate processing
          await db
            .update(webhookEvents)
            .set({ status: 'processing' })
            .where(eq(webhookEvents.id, event.id));

          // Process the webhook event via worker
          await WebhookWorker.processEvent({
            id: event.id,
            tenantId: event.tenantId,
            eventType: event.eventType,
            source: event.source,
            priority: 'medium', // Default priority for fallback mode
            payload: event.payload,
            signature: event.signature || undefined,
            headers: event.headers as Record<string, any>
          });

          logger.info(`🔄 Processed pending webhook event`, {
            eventId: event.id,
            eventType: event.eventType,
            source: event.source
          });

        } catch (processError) {
          logger.error(`🔄 Failed to process pending event`, {
            eventId: event.id,
            error: processError instanceof Error ? processError.message : String(processError)
          });

          // Mark as failed with retry
          await db
            .update(webhookEvents)
            .set({ 
              status: 'failed',
              processingError: processError instanceof Error ? processError.message : String(processError),
              retryCount: (event.retryCount || 0) + 1
            })
            .where(eq(webhookEvents.id, event.id));
        }
      }

    } catch (error) {
      logger.error('🔄 Polling error', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Manually trigger a poll (for testing/debugging)
   */
  static async pollNow(): Promise<void> {
    return this.pollPendingEvents();
  }
}

// Auto-start poller in production/development
if (process.env.NODE_ENV !== 'test') {
  WebhookPoller.start();
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('🔄 SIGTERM received, stopping webhook poller');
    WebhookPoller.stop();
  });
  
  process.on('SIGINT', () => {
    logger.info('🔄 SIGINT received, stopping webhook poller');
    WebhookPoller.stop();
  });
}
