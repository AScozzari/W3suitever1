import { eq, and, desc } from 'drizzle-orm';
import { db } from '../core/db.js';
import { webhookEvents, webhookSignatures, type InsertWebhookEvent, type WebhookSignature } from '../db/schema/w3suite.js';
import { redisService } from '../core/redis-service.js';
import { logger } from '../core/logger.js';
import crypto from 'crypto';

export interface WebhookEventPayload {
  tenantId: string;
  source: string; // 'stripe', 'twilio', 'github', 'custom'
  eventId: string; // Provider's event ID
  eventType: string; // 'payment.succeeded', 'sms.delivered', etc.
  payload: any;
  signature?: string;
  headers?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface WebhookValidationResult {
  isValid: boolean;
  signatureValid?: boolean;
  error?: string;
  config?: WebhookSignature;
}

/**
 * Webhook Service
 * Centralized webhook event handling with signature validation, deduplication, and queueing
 */
export class WebhookService {
  
  /**
   * 🎯 MAIN ENTRY POINT: Receive and process webhook event
   * Validates signature, checks deduplication, stores in DB, queues for processing
   */
  static async receiveWebhookEvent(event: WebhookEventPayload): Promise<{
    success: boolean;
    eventId?: string;
    message?: string;
    error?: string;
  }> {
    try {
      logger.info('🪝 Webhook event received', {
        source: event.source,
        eventType: event.eventType,
        eventId: event.eventId,
        tenantId: event.tenantId
      });

      // STEP 1: Check deduplication (prevent processing same event twice)
      // Try Redis first (fast), fallback to DB if Redis unavailable
      let isDuplicate = false;
      
      try {
        isDuplicate = await redisService.checkWebhookDeduplication(
          event.tenantId,
          event.source,
          event.eventId
        );
      } catch (redisError) {
        // Redis unavailable - fallback to DB check
        logger.warn('⚠️ Redis deduplication unavailable, checking DB', {
          error: redisError instanceof Error ? redisError.message : String(redisError)
        });
        
        isDuplicate = await this.checkDatabaseDeduplication(
          event.tenantId,
          event.source,
          event.eventId
        );
      }

      if (isDuplicate) {
        logger.warn('🪝 Webhook event already processed (duplicate)', {
          source: event.source,
          eventId: event.eventId,
          tenantId: event.tenantId
        });
        
        // Store duplicate event for audit trail
        await this.storeWebhookEvent({
          ...event,
          signatureValid: undefined,
          status: 'skipped',
          processingError: 'Duplicate event (already processed)'
        });
        
        return {
          success: true,
          message: 'Event already processed (duplicate)',
          eventId: event.eventId
        };
      }

      // STEP 2: Validate signature (if signature provided)
      let signatureValid: boolean | undefined = undefined;
      let validationConfig: WebhookSignature | undefined = undefined;

      if (event.signature) {
        const validation = await this.validateWebhookSignature(event);
        signatureValid = validation.isValid;
        validationConfig = validation.config;

        if (!validation.isValid) {
          logger.error('🪝 Webhook signature validation failed', {
            source: event.source,
            eventId: event.eventId,
            tenantId: event.tenantId,
            error: validation.error
          });

          // Store failed event for audit
          await this.storeWebhookEvent({
            ...event,
            signatureValid: false,
            status: 'failed',
            processingError: `Signature validation failed: ${validation.error}`
          });

          return {
            success: false,
            error: `Signature validation failed: ${validation.error}`
          };
        }
      }

      // STEP 3: Store event in database
      const storedEvent = await this.storeWebhookEvent({
        ...event,
        signatureValid,
        status: 'pending'
      });

      // STEP 4: Queue for async processing with Redis fallback
      const priority = event.priority || 'medium';
      let queuedSuccessfully = false;
      
      try {
        await redisService.queueWebhookEvent({
          id: storedEvent.id,
          tenantId: event.tenantId,
          eventType: event.eventType,
          source: event.source,
          priority,
          payload: event.payload,
          signature: event.signature,
          headers: event.headers
        });
        queuedSuccessfully = true;
      } catch (queueError) {
        // Redis queue failed - use DB fallback mode
        logger.warn('⚠️ Redis queue unavailable, using DB fallback mode', {
          error: queueError instanceof Error ? queueError.message : String(queueError),
          eventId: storedEvent.id,
          source: event.source,
          tenantId: event.tenantId,
          note: 'Event saved in DB with pending status, background poller will process'
        });
        
        // Update event metadata to indicate fallback mode
        await db.update(webhookEvents)
          .set({ 
            metadata: { 
              queueFallback: true, 
              redisError: queueError instanceof Error ? queueError.message : String(queueError),
              fallbackTimestamp: new Date().toISOString()
            } 
          })
          .where(eq(webhookEvents.id, storedEvent.id));
        
        // Do NOT throw - event is safely stored in DB for background processing
        queuedSuccessfully = false;
      }

      // STEP 5: Mark as received (best-effort, non-blocking)
      // Short TTL prevents race condition duplicates during processing
      // Worker will extend TTL to 24h after successful processing
      // If mark fails, worker will handle deduplication via DB status check
      try {
        await redisService.markWebhookProcessed(
          event.tenantId,
          event.source,
          event.eventId,
          300 // 5 min TTL - prevents duplicates during processing
        );
      } catch (markError) {
        // Mark failed but event is queued - log warning and continue
        // Worker will prevent duplicate processing via DB status check
        logger.warn('⚠️ Failed to mark webhook as processed (non-critical)', {
          error: markError instanceof Error ? markError.message : String(markError),
          eventId: storedEvent.id,
          source: event.source,
          tenantId: event.tenantId,
          note: 'Event queued successfully, worker will handle deduplication via DB'
        });
      }

      logger.info('✅ Webhook event processed successfully', {
        eventId: storedEvent.id,
        source: event.source,
        eventType: event.eventType,
        tenantId: event.tenantId,
        signatureValid,
        priority,
        queuedSuccessfully
      });

      return {
        success: true,
        eventId: storedEvent.id,
        message: queuedSuccessfully 
          ? 'Event queued for processing' 
          : 'Event stored for processing (fallback mode)'
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('❌ Webhook event processing failed', {
        error: errorMessage,
        source: event.source,
        eventId: event.eventId,
        tenantId: event.tenantId
      });

      return {
        success: false,
        error: `Webhook processing failed: ${errorMessage}`
      };
    }
  }

  /**
   * 🔍 Check database for duplicate events (fallback when Redis unavailable)
   */
  private static async checkDatabaseDeduplication(
    tenantId: string,
    source: string,
    eventId: string
  ): Promise<boolean> {
    const existing = await db
      .select()
      .from(webhookEvents)
      .where(
        and(
          eq(webhookEvents.tenantId, tenantId),
          eq(webhookEvents.source, source),
          eq(webhookEvents.eventId, eventId)
        )
      )
      .limit(1);

    return existing.length > 0;
  }

  /**
   * 🔐 Validate webhook signature using HMAC
   */
  static async validateWebhookSignature(event: WebhookEventPayload): Promise<WebhookValidationResult> {
    try {
      // Get signature configuration for provider
      const config = await this.getWebhookSignatureConfig(event.tenantId, event.source);

      if (!config) {
        return {
          isValid: false,
          error: `No signature configuration found for provider: ${event.source}`
        };
      }

      if (!config.isActive) {
        return {
          isValid: false,
          error: `Signature configuration is inactive for provider: ${event.source}`
        };
      }

      // Check if event type is allowed (whitelist)
      if (config.allowedEventTypes && config.allowedEventTypes.length > 0) {
        if (!config.allowedEventTypes.includes(event.eventType)) {
          return {
            isValid: false,
            error: `Event type ${event.eventType} not in allowed list`
          };
        }
      }

      // Timestamp validation (replay attack protection)
      if (config.requireTimestamp && config.timestampHeader && event.headers) {
        const timestamp = event.headers[config.timestampHeader];
        if (!timestamp) {
          return {
            isValid: false,
            error: 'Timestamp header missing (required for replay protection)'
          };
        }

        const eventTime = parseInt(timestamp, 10);
        const currentTime = Math.floor(Date.now() / 1000);
        const tolerance = config.toleranceWindowSeconds || 300;

        if (Math.abs(currentTime - eventTime) > tolerance) {
          return {
            isValid: false,
            error: `Timestamp outside tolerance window (${tolerance}s)`
          };
        }
      }

      // HMAC signature validation
      const expectedSignature = this.computeHmacSignature(
        JSON.stringify(event.payload),
        config.signingSecret,
        config.validationAlgorithm
      );

      const receivedSignature = event.signature!;
      const signaturesMatch = this.secureCompare(expectedSignature, receivedSignature);

      if (!signaturesMatch) {
        return {
          isValid: false,
          signatureValid: false,
          error: 'Signature mismatch',
          config
        };
      }

      // Update last used timestamp
      await db
        .update(webhookSignatures)
        .set({ lastUsed: new Date() })
        .where(eq(webhookSignatures.id, config.id));

      return {
        isValid: true,
        signatureValid: true,
        config
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('🔐 Signature validation error', {
        error: errorMessage,
        source: event.source,
        tenantId: event.tenantId
      });

      return {
        isValid: false,
        error: `Signature validation error: ${errorMessage}`
      };
    }
  }

  /**
   * 🔢 Compute HMAC signature
   */
  private static computeHmacSignature(
    payload: string,
    secret: string,
    algorithm: string = 'hmac-sha256'
  ): string {
    const hashAlgorithm = algorithm.replace('hmac-', ''); // 'sha256', 'sha512'
    const hmac = crypto.createHmac(hashAlgorithm, secret);
    hmac.update(payload);
    return hmac.digest('hex');
  }

  /**
   * 🔒 Timing-safe string comparison (prevent timing attacks)
   */
  private static secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  /**
   * 💾 Store webhook event in database
   */
  private static async storeWebhookEvent(event: WebhookEventPayload & {
    signatureValid?: boolean;
    status?: string;
    processingError?: string;
  }): Promise<typeof webhookEvents.$inferSelect> {
    const insertData: InsertWebhookEvent = {
      tenantId: event.tenantId,
      eventId: event.eventId,
      eventType: event.eventType,
      source: event.source,
      payload: event.payload,
      headers: event.headers || {},
      signature: event.signature,
      signatureValid: event.signatureValid,
      status: event.status as any || 'pending',
      processingError: event.processingError,
      maxRetries: 3,
      metadata: {}
    };

    const [storedEvent] = await db
      .insert(webhookEvents)
      .values(insertData)
      .returning();

    logger.debug('💾 Webhook event stored in database', {
      eventId: storedEvent.id,
      source: event.source,
      eventType: event.eventType,
      tenantId: event.tenantId
    });

    return storedEvent;
  }

  /**
   * 🔍 Get webhook signature configuration for provider
   */
  static async getWebhookSignatureConfig(
    tenantId: string,
    provider: string
  ): Promise<WebhookSignature | null> {
    const [config] = await db
      .select()
      .from(webhookSignatures)
      .where(and(
        eq(webhookSignatures.tenantId, tenantId),
        eq(webhookSignatures.provider, provider)
      ))
      .limit(1);

    return config || null;
  }

  /**
   * 📊 Get webhook event by ID
   */
  static async getWebhookEvent(eventId: string, tenantId: string) {
    const [event] = await db
      .select()
      .from(webhookEvents)
      .where(and(
        eq(webhookEvents.id, eventId),
        eq(webhookEvents.tenantId, tenantId)
      ))
      .limit(1);

    return event || null;
  }

  /**
   * 📋 Get webhook events with filtering
   */
  static async getWebhookEvents(
    tenantId: string,
    options: {
      source?: string;
      eventType?: string;
      status?: string;
      limit?: number;
    } = {}
  ) {
    const conditions = [eq(webhookEvents.tenantId, tenantId)];

    if (options.source) {
      conditions.push(eq(webhookEvents.source, options.source));
    }
    if (options.eventType) {
      conditions.push(eq(webhookEvents.eventType, options.eventType));
    }
    if (options.status) {
      conditions.push(eq(webhookEvents.status, options.status as any));
    }

    const events = await db
      .select()
      .from(webhookEvents)
      .where(and(...conditions))
      .orderBy(desc(webhookEvents.receivedAt))
      .limit(options.limit || 100);

    return events;
  }

  /**
   * 🔄 Update webhook event status
   */
  static async updateWebhookEventStatus(
    eventId: string,
    tenantId: string,
    status: 'processing' | 'completed' | 'failed' | 'skipped',
    data?: {
      processingError?: string;
      workflowInstanceId?: string;
      workflowTriggerId?: string;
    }
  ) {
    const updateData: any = {
      status,
      processedAt: status === 'completed' ? new Date() : undefined,
      updatedAt: new Date()
    };

    if (data?.processingError) {
      updateData.processingError = data.processingError;
    }
    if (data?.workflowInstanceId) {
      updateData.workflowInstanceId = data.workflowInstanceId;
    }
    if (data?.workflowTriggerId) {
      updateData.workflowTriggerId = data.workflowTriggerId;
    }

    const [updated] = await db
      .update(webhookEvents)
      .set(updateData)
      .where(and(
        eq(webhookEvents.id, eventId),
        eq(webhookEvents.tenantId, tenantId)
      ))
      .returning();

    logger.debug('🔄 Webhook event status updated', {
      eventId,
      status,
      tenantId
    });

    return updated;
  }

  /**
   * ⚙️ CRUD: Create webhook signature configuration
   */
  static async createWebhookSignature(data: {
    tenantId: string;
    provider: string;
    providerName: string;
    description?: string;
    signingSecret: string;
    validationAlgorithm?: string;
    signatureHeader?: string;
    timestampHeader?: string;
    toleranceWindowSeconds?: number;
    requireTimestamp?: boolean;
    requiredPermission?: string;
    allowedEventTypes?: string[];
    createdBy?: string;
  }) {
    const [config] = await db
      .insert(webhookSignatures)
      .values(data)
      .returning();

    logger.info('⚙️ Webhook signature configuration created', {
      provider: data.provider,
      tenantId: data.tenantId
    });

    return config;
  }

  /**
   * ⚙️ CRUD: Update webhook signature configuration
   */
  static async updateWebhookSignature(
    id: string,
    tenantId: string,
    data: Partial<{
      providerName: string;
      description: string;
      signingSecret: string;
      validationAlgorithm: string;
      signatureHeader: string;
      timestampHeader: string;
      toleranceWindowSeconds: number;
      requireTimestamp: boolean;
      requiredPermission: string;
      allowedEventTypes: string[];
      isActive: boolean;
      updatedBy: string;
    }>
  ) {
    const [updated] = await db
      .update(webhookSignatures)
      .set({ ...data, updatedAt: new Date() })
      .where(and(
        eq(webhookSignatures.id, id),
        eq(webhookSignatures.tenantId, tenantId)
      ))
      .returning();

    logger.info('⚙️ Webhook signature configuration updated', {
      id,
      tenantId
    });

    return updated;
  }

  /**
   * 📋 Get webhook signature configurations for tenant
   */
  static async getWebhookSignatures(tenantId: string) {
    const configs = await db
      .select()
      .from(webhookSignatures)
      .where(eq(webhookSignatures.tenantId, tenantId))
      .orderBy(desc(webhookSignatures.createdAt));

    return configs;
  }

  /**
   * 🗑️ Delete webhook signature configuration
   */
  static async deleteWebhookSignature(id: string, tenantId: string) {
    const [deleted] = await db
      .delete(webhookSignatures)
      .where(and(
        eq(webhookSignatures.id, id),
        eq(webhookSignatures.tenantId, tenantId)
      ))
      .returning();

    logger.info('🗑️ Webhook signature configuration deleted', {
      id,
      tenantId
    });

    return deleted;
  }
}
