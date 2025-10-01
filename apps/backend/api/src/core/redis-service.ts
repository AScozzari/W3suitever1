// Redis Service for Real-time Notifications & Caching
import Redis from 'ioredis';
import { config } from './config';
import { logger } from './logger';

export class RedisService {
  private static instance: RedisService;
  private redis: Redis | null = null;
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private isRedisAvailable: boolean = false;

  private constructor() {
    const redisUrl = process.env.REDIS_URL;
    
    // Only initialize Redis if URL is provided (optional in development)
    if (redisUrl) {
      try {
        // Main Redis connection with limited retries
        this.redis = new Redis(redisUrl, {
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          maxRetriesPerRequest: 1, // Fail fast
          lazyConnect: true, // Don't connect immediately
          connectTimeout: 5000, // 5 second timeout
          enableOfflineQueue: false, // Disable queue when offline
          retryStrategy: () => null, // Don't retry indefinitely
        });

        // Publisher for notifications
        this.publisher = new Redis(redisUrl, {
          lazyConnect: true,
          connectTimeout: 5000,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          retryStrategy: () => null,
        });
        
        // Subscriber for real-time events
        this.subscriber = new Redis(redisUrl, {
          lazyConnect: true,
          connectTimeout: 5000,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
          retryStrategy: () => null,
        });

        this.setupEventHandlers();
        this.isRedisAvailable = true;
        
        logger.info('🔴 Redis Service initialized', {
          environment: config.NODE_ENV,
          redisUrl: redisUrl.replace(/\/\/.*@/, '//***@') // Hide credentials in logs
        });
      } catch (error) {
        logger.warn('🔴 Redis initialization failed, continuing without Redis', { error });
        this.isRedisAvailable = false;
      }
    } else {
      logger.info('🔴 Redis Service disabled (no REDIS_URL configured)');
      this.isRedisAvailable = false;
    }
  }

  static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  private setupEventHandlers() {
    if (!this.redis || !this.publisher || !this.subscriber) return;

    // Main Redis connection handlers
    this.redis.on('connect', () => {
      logger.info('🔴 Redis connected');
    });

    this.redis.on('error', (error) => {
      logger.warn('🔴 Redis connection error (non-blocking)', { error: error.message });
      // Don't throw, just log warning to prevent unhandled errors
    });

    this.redis.on('close', () => {
      logger.warn('🔴 Redis connection closed');
    });

    // Publisher handlers
    this.publisher.on('error', (error) => {
      logger.warn('🔴 Redis Publisher error (non-blocking)', { error: error.message });
    });

    // Subscriber handlers  
    this.subscriber.on('error', (error) => {
      logger.warn('🔴 Redis Subscriber error (non-blocking)', { error: error.message });
    });
  }

  // ==================== NOTIFICATION CACHE ====================
  
  /**
   * Cache unread notification count for fast access
   */
  async cacheUnreadCount(userId: string, tenantId: string, count: number): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) return; // Skip if Redis not available
    try {
      const key = `unread_count:${tenantId}:${userId}`;
      await this.redis.setex(key, 300, count); // Cache for 5 minutes
    } catch (error) {
      logger.warn('🔴 Failed to cache unread count', { error, userId, tenantId });
    }
  }

  /**
   * Get cached unread count
   */
  async getCachedUnreadCount(userId: string, tenantId: string): Promise<number | null> {
    if (!this.isRedisAvailable || !this.redis) return null;
    const key = `unread_count:${tenantId}:${userId}`;
    const count = await this.redis.get(key);
    return count ? parseInt(count, 10) : null;
  }

  /**
   * Invalidate user's notification cache
   */
  async invalidateUserNotificationCache(userId: string, tenantId: string): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) return;
    const patterns = [
      `unread_count:${tenantId}:${userId}`,
      `notifications:${tenantId}:${userId}:*`
    ];
    
    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }

  // ==================== REAL-TIME PUB/SUB ====================

  /**
   * Publish notification event for real-time delivery
   */
  async publishNotification(notificationEvent: {
    type: 'new_notification' | 'notification_read' | 'notification_update';
    tenantId: string;
    userId?: string;
    notificationId: string;
    data: any;
  }): Promise<void> {
    if (!this.isRedisAvailable || !this.publisher) {
      logger.warn('🔴 Redis not available, skipping notification publish', { 
        tenantId: notificationEvent.tenantId,
        notificationId: notificationEvent.notificationId 
      });
      return;
    }

    const channel = `notifications:${notificationEvent.tenantId}`;
    
    try {
      await this.publisher.publish(channel, JSON.stringify(notificationEvent));
      
      logger.debug('🔴 Notification published', {
        channel,
        type: notificationEvent.type,
        notificationId: notificationEvent.notificationId
      });
    } catch (error) {
      logger.error('🔴 Failed to publish notification', { 
        channel, 
        notificationId: notificationEvent.notificationId,
        error 
      });
    }
  }

  /**
   * Subscribe to notification events for a tenant
   */
  async subscribeToNotifications(tenantId: string, callback: (event: any) => void): Promise<void> {
    if (!this.isRedisAvailable || !this.subscriber) {
      logger.warn('🔴 Redis not available, skipping notification subscription', { tenantId });
      return;
    }

    const channel = `notifications:${tenantId}`;
    
    try {
      await this.subscriber.subscribe(channel);
      
      this.subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const event = JSON.parse(message);
            callback(event);
          } catch (error) {
            logger.error('🔴 Failed to parse notification event', { error, message });
          }
        }
      });

      logger.info('🔴 Subscribed to notification channel', { channel });
    } catch (error) {
      logger.error('🔴 Failed to subscribe to notification channel', { channel, error });
    }
  }

  // ==================== NOTIFICATION QUEUE ====================

  /**
   * Queue notification for background processing (email, etc.)
   */
  async queueNotification(notification: {
    id: string;
    tenantId: string;
    userId?: string;
    type: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    data: any;
  }): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) return;
    const queueKey = `notification_queue:${notification.priority}`;
    
    await this.redis.lpush(queueKey, JSON.stringify({
      ...notification,
      queuedAt: new Date().toISOString()
    }));

    logger.debug('🔴 Notification queued', {
      notificationId: notification.id,
      priority: notification.priority
    });
  }

  /**
   * Process notification queue (for background workers)
   */
  async processNotificationQueue(priority: 'low' | 'medium' | 'high' | 'critical', processorFn: (notification: any) => Promise<void>): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) {
      logger.warn('🔴 Redis not available, notification queue processing skipped', { priority });
      return;
    }
    const queueKey = `notification_queue:${priority}`;
    
    while (true) {
      try {
        const result = await this.redis.brpop(queueKey, 5); // 5 second timeout
        
        if (result) {
          const [, notificationJson] = result;
          const notification = JSON.parse(notificationJson);
          
          await processorFn(notification);
          
          logger.debug('🔴 Notification processed', {
            notificationId: notification.id,
            priority
          });
        }
      } catch (error) {
        logger.error('🔴 Error processing notification queue', {
          error: error instanceof Error ? error.message : String(error),
          priority
        });
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  // ==================== WEBSOCKET SESSION MANAGEMENT ====================

  /**
   * Register WebSocket session for user
   */
  async registerWebSocketSession(userId: string, tenantId: string, sessionId: string): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) return;
    const key = `websocket_sessions:${tenantId}:${userId}`;
    await this.redis.sadd(key, sessionId);
    await this.redis.expire(key, 3600); // Expire in 1 hour
  }

  /**
   * Remove WebSocket session
   */
  async removeWebSocketSession(userId: string, tenantId: string, sessionId: string): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) return;
    const key = `websocket_sessions:${tenantId}:${userId}`;
    await this.redis.srem(key, sessionId);
  }

  /**
   * Get active WebSocket sessions for user
   */
  async getWebSocketSessions(userId: string, tenantId: string): Promise<string[]> {
    if (!this.isRedisAvailable || !this.redis) return [];
    const key = `websocket_sessions:${tenantId}:${userId}`;
    return await this.redis.smembers(key);
  }

  /**
   * Set WebSocket subscription for a specific service
   */
  async setWebSocketSubscription(
    userId: string, 
    tenantId: string, 
    sessionId: string, 
    service: string, 
    preferences: any
  ): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) return;
    try {
      const key = `websocket_subscription:${tenantId}:${userId}:${sessionId}:${service}`;
      await this.redis.setex(key, 3600, JSON.stringify(preferences)); // Cache for 1 hour
    } catch (error) {
      logger.warn('🔴 Failed to set WebSocket subscription', { error, userId, tenantId, sessionId, service });
    }
  }

  /**
   * Get WebSocket subscription preferences
   */
  async getWebSocketSubscription(
    userId: string, 
    tenantId: string, 
    sessionId: string, 
    service: string
  ): Promise<any | null> {
    if (!this.isRedisAvailable || !this.redis) return null;
    try {
      const key = `websocket_subscription:${tenantId}:${userId}:${sessionId}:${service}`;
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.warn('🔴 Failed to get WebSocket subscription', { error, userId, tenantId, sessionId, service });
      return null;
    }
  }

  /**
   * Remove WebSocket subscription
   */
  async removeWebSocketSubscription(
    userId: string, 
    tenantId: string, 
    sessionId: string, 
    service: string
  ): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) return;
    try {
      const key = `websocket_subscription:${tenantId}:${userId}:${sessionId}:${service}`;
      await this.redis.del(key);
    } catch (error) {
      logger.warn('🔴 Failed to remove WebSocket subscription', { error, userId, tenantId, sessionId, service });
    }
  }

  // ==================== RATE LIMITING ====================

  /**
   * Check rate limit for notifications
   */
  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    if (!this.isRedisAvailable || !this.redis) return true; // Allow if Redis down
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, windowSeconds);
    }
    
    return current <= limit;
  }

  // ==================== AI CACHE SYSTEM ====================

  /**
   * Cache AI chat response to avoid duplicate OpenAI calls
   * Uses content hash as key for intelligent deduplication
   */
  async cacheAIResponse(
    contentHash: string, 
    tenantId: string, 
    response: any, 
    ttlSeconds: number = 3600 // 1 hour default
  ): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) return;
    try {
      const key = `ai_response:${tenantId}:${contentHash}`;
      await this.redis.setex(key, ttlSeconds, JSON.stringify({
        response,
        cachedAt: new Date().toISOString(),
        contentHash
      }));
      
      logger.debug('🤖 AI Response cached', { contentHash, tenantId, ttl: ttlSeconds });
    } catch (error) {
      logger.warn('🤖 Failed to cache AI response', { error, contentHash, tenantId });
    }
  }

  /**
   * Retrieve cached AI response
   */
  async getCachedAIResponse(contentHash: string, tenantId: string): Promise<any | null> {
    if (!this.isRedisAvailable || !this.redis) return null;
    try {
      const key = `ai_response:${tenantId}:${contentHash}`;
      const cached = await this.redis.get(key);
      
      if (cached) {
        const parsed = JSON.parse(cached);
        logger.debug('🤖 AI Response cache hit', { contentHash, tenantId });
        return parsed.response;
      }
      
      return null;
    } catch (error) {
      logger.warn('🤖 Failed to retrieve cached AI response', { error, contentHash, tenantId });
      return null;
    }
  }

  /**
   * Cache vector embeddings for faster RAG retrieval
   */
  async cacheEmbedding(
    textHash: string, 
    tenantId: string, 
    embedding: number[], 
    ttlSeconds: number = 86400 // 24 hours default
  ): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) return;
    try {
      const key = `embedding:${tenantId}:${textHash}`;
      await this.redis.setex(key, ttlSeconds, JSON.stringify({
        embedding,
        cachedAt: new Date().toISOString(),
        textHash
      }));
      
      logger.debug('🔍 Embedding cached', { textHash, tenantId, vectorLength: embedding.length });
    } catch (error) {
      logger.warn('🔍 Failed to cache embedding', { error, textHash, tenantId });
    }
  }

  /**
   * Retrieve cached embedding
   */
  async getCachedEmbedding(textHash: string, tenantId: string): Promise<number[] | null> {
    if (!this.isRedisAvailable || !this.redis) return null;
    try {
      const key = `embedding:${tenantId}:${textHash}`;
      const cached = await this.redis.get(key);
      
      if (cached) {
        const parsed = JSON.parse(cached);
        logger.debug('🔍 Embedding cache hit', { textHash, tenantId });
        return parsed.embedding;
      }
      
      return null;
    } catch (error) {
      logger.warn('🔍 Failed to retrieve cached embedding', { error, textHash, tenantId });
      return null;
    }
  }

  /**
   * Cache web search results to avoid duplicate searches
   */
  async cacheWebSearch(
    searchHash: string, 
    tenantId: string, 
    results: any[], 
    ttlSeconds: number = 7200 // 2 hours default
  ): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) return;
    try {
      const key = `web_search:${tenantId}:${searchHash}`;
      await this.redis.setex(key, ttlSeconds, JSON.stringify({
        results,
        cachedAt: new Date().toISOString(),
        searchHash,
        resultsCount: results.length
      }));
      
      logger.debug('🌐 Web search cached', { searchHash, tenantId, resultsCount: results.length });
    } catch (error) {
      logger.warn('🌐 Failed to cache web search', { error, searchHash, tenantId });
    }
  }

  /**
   * Retrieve cached web search results
   */
  async getCachedWebSearch(searchHash: string, tenantId: string): Promise<any[] | null> {
    if (!this.isRedisAvailable || !this.redis) return null;
    try {
      const key = `web_search:${tenantId}:${searchHash}`;
      const cached = await this.redis.get(key);
      
      if (cached) {
        const parsed = JSON.parse(cached);
        logger.debug('🌐 Web search cache hit', { searchHash, tenantId });
        return parsed.results;
      }
      
      return null;
    } catch (error) {
      logger.warn('🌐 Failed to retrieve cached web search', { error, searchHash, tenantId });
      return null;
    }
  }

  /**
   * Cache document processing results (URL scraping, PDF analysis, etc.)
   */
  async cacheDocumentProcessing(
    documentHash: string, 
    tenantId: string, 
    processedData: any, 
    ttlSeconds: number = 43200 // 12 hours default
  ): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) return;
    try {
      const key = `document:${tenantId}:${documentHash}`;
      await this.redis.setex(key, ttlSeconds, JSON.stringify({
        processedData,
        cachedAt: new Date().toISOString(),
        documentHash
      }));
      
      logger.debug('📄 Document processing cached', { documentHash, tenantId });
    } catch (error) {
      logger.warn('📄 Failed to cache document processing', { error, documentHash, tenantId });
    }
  }

  /**
   * Retrieve cached document processing results
   */
  async getCachedDocumentProcessing(documentHash: string, tenantId: string): Promise<any | null> {
    if (!this.isRedisAvailable || !this.redis) return null;
    try {
      const key = `document:${tenantId}:${documentHash}`;
      const cached = await this.redis.get(key);
      
      if (cached) {
        const parsed = JSON.parse(cached);
        logger.debug('📄 Document processing cache hit', { documentHash, tenantId });
        return parsed.processedData;
      }
      
      return null;
    } catch (error) {
      logger.warn('📄 Failed to retrieve cached document processing', { error, documentHash, tenantId });
      return null;
    }
  }

  /**
   * Invalidate AI cache for a tenant (useful for cache refreshes)
   */
  async invalidateAICache(tenantId: string, cacheType?: 'ai_response' | 'embedding' | 'web_search' | 'document'): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) return;
    try {
      const patterns = cacheType 
        ? [`${cacheType}:${tenantId}:*`]
        : [`ai_response:${tenantId}:*`, `embedding:${tenantId}:*`, `web_search:${tenantId}:*`, `document:${tenantId}:*`];
      
      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          logger.info('🤖 AI Cache invalidated', { pattern, keysDeleted: keys.length });
        }
      }
    } catch (error) {
      logger.warn('🤖 Failed to invalidate AI cache', { error, tenantId, cacheType });
    }
  }

  /**
   * Get AI cache statistics for monitoring
   */
  async getAICacheStats(tenantId: string): Promise<{
    aiResponses: number;
    embeddings: number;
    webSearches: number;
    documents: number;
    totalMemory: string;
  }> {
    if (!this.isRedisAvailable || !this.redis) {
      return { aiResponses: 0, embeddings: 0, webSearches: 0, documents: 0, totalMemory: '0MB' };
    }

    try {
      const [aiKeys, embeddingKeys, webSearchKeys, documentKeys] = await Promise.all([
        this.redis.keys(`ai_response:${tenantId}:*`),
        this.redis.keys(`embedding:${tenantId}:*`),
        this.redis.keys(`web_search:${tenantId}:*`),
        this.redis.keys(`document:${tenantId}:*`)
      ]);

      // Get memory usage (approximation)
      const memoryInfo = await this.redis.memory('usage', ...aiKeys, ...embeddingKeys, ...webSearchKeys, ...documentKeys);
      const totalMemoryBytes = Array.isArray(memoryInfo) ? memoryInfo.reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0) : 0;
      const totalMemoryMB = (totalMemoryBytes / 1024 / 1024).toFixed(2);

      return {
        aiResponses: aiKeys.length,
        embeddings: embeddingKeys.length,
        webSearches: webSearchKeys.length,
        documents: documentKeys.length,
        totalMemory: `${totalMemoryMB}MB`
      };
    } catch (error) {
      logger.warn('🤖 Failed to get AI cache stats', { error, tenantId });
      return { aiResponses: 0, embeddings: 0, webSearches: 0, documents: 0, totalMemory: '0MB' };
    }
  }

  /**
   * Generate cache key hash from content for intelligent deduplication
   */
  static generateContentHash(content: string, additional?: string): string {
    const crypto = require('crypto');
    const hashContent = additional ? `${content}:${additional}` : content;
    return crypto.createHash('sha256').update(hashContent).digest('hex').substring(0, 16);
  }

  // ==================== WEBHOOK QUEUE SYSTEM ====================

  /**
   * Queue webhook event for async processing
   * Uses priority-based queues: critical > high > medium > low
   */
  async queueWebhookEvent(event: {
    id: string;
    tenantId: string;
    eventType: string;
    source: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    payload: any;
    signature?: string;
    headers?: Record<string, any>;
  }): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) {
      logger.warn('🔴 Redis not available, webhook event cannot be queued', { 
        eventId: event.id,
        eventType: event.eventType 
      });
      return;
    }

    try {
      const queueKey = `webhook_queue:${event.priority}`;
      
      await this.redis.lpush(queueKey, JSON.stringify({
        ...event,
        queuedAt: new Date().toISOString()
      }));

      logger.debug('🪝 Webhook event queued', {
        eventId: event.id,
        eventType: event.eventType,
        source: event.source,
        priority: event.priority,
        tenantId: event.tenantId
      });
    } catch (error) {
      logger.error('🔴 Failed to queue webhook event', { 
        error: error instanceof Error ? error.message : String(error),
        eventId: event.id,
        eventType: event.eventType
      });
      throw error;
    }
  }

  /**
   * Process webhook queue with blocking pop (for background workers)
   * @param priority Queue priority to process
   * @param processorFn Async function to process each webhook event
   * @param timeout Timeout in seconds for brpop (default 5)
   */
  async processWebhookQueue(
    priority: 'low' | 'medium' | 'high' | 'critical', 
    processorFn: (event: any) => Promise<void>,
    timeout: number = 5
  ): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) {
      logger.warn('🔴 Redis not available, webhook queue processing skipped', { priority });
      return;
    }

    const queueKey = `webhook_queue:${priority}`;
    
    while (true) {
      try {
        const result = await this.redis.brpop(queueKey, timeout);
        
        if (result) {
          const [, eventJson] = result;
          const event = JSON.parse(eventJson);
          
          logger.debug('🪝 Processing webhook event from queue', {
            eventId: event.id,
            eventType: event.eventType,
            source: event.source,
            priority
          });
          
          await processorFn(event);
          
          logger.debug('🪝 Webhook event processed successfully', {
            eventId: event.id,
            eventType: event.eventType,
            priority
          });
        }
      } catch (error) {
        logger.error('🔴 Error processing webhook queue', {
          error: error instanceof Error ? error.message : String(error),
          priority
        });
        
        // Wait before retrying to avoid tight error loop
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  /**
   * Check if webhook event already processed (deduplication)
   * Uses Redis SET with TTL for fast lookup
   */
  async checkWebhookDeduplication(
    tenantId: string, 
    source: string, 
    eventId: string
  ): Promise<boolean> {
    if (!this.isRedisAvailable || !this.redis) return false;
    
    try {
      const key = `webhook_dedup:${tenantId}:${source}:${eventId}`;
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      logger.warn('🔴 Failed to check webhook deduplication', { 
        error, 
        tenantId, 
        source, 
        eventId 
      });
      return false;
    }
  }

  /**
   * Mark webhook event as processed (for deduplication)
   * Sets key with 24h TTL
   */
  async markWebhookProcessed(
    tenantId: string, 
    source: string, 
    eventId: string,
    ttlSeconds: number = 86400 // 24 hours default
  ): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) return;
    
    try {
      const key = `webhook_dedup:${tenantId}:${source}:${eventId}`;
      await this.redis.setex(key, ttlSeconds, '1');
      
      logger.debug('🪝 Webhook marked as processed', {
        tenantId,
        source,
        eventId,
        ttl: ttlSeconds
      });
    } catch (error) {
      logger.warn('🔴 Failed to mark webhook as processed', { 
        error, 
        tenantId, 
        source, 
        eventId 
      });
    }
  }

  /**
   * Get webhook queue statistics for monitoring
   */
  async getWebhookQueueStats(): Promise<{
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  }> {
    if (!this.isRedisAvailable || !this.redis) {
      return { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    }

    try {
      const [critical, high, medium, low] = await Promise.all([
        this.redis.llen('webhook_queue:critical'),
        this.redis.llen('webhook_queue:high'),
        this.redis.llen('webhook_queue:medium'),
        this.redis.llen('webhook_queue:low')
      ]);

      const total = critical + high + medium + low;

      return { critical, high, medium, low, total };
    } catch (error) {
      logger.warn('🔴 Failed to get webhook queue stats', { error });
      return { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    }
  }

  /**
   * Clear webhook queue (for testing/debugging)
   */
  async clearWebhookQueue(priority?: 'low' | 'medium' | 'high' | 'critical'): Promise<void> {
    if (!this.isRedisAvailable || !this.redis) return;

    try {
      if (priority) {
        await this.redis.del(`webhook_queue:${priority}`);
        logger.info('🪝 Webhook queue cleared', { priority });
      } else {
        await Promise.all([
          this.redis.del('webhook_queue:critical'),
          this.redis.del('webhook_queue:high'),
          this.redis.del('webhook_queue:medium'),
          this.redis.del('webhook_queue:low')
        ]);
        logger.info('🪝 All webhook queues cleared');
      }
    } catch (error) {
      logger.warn('🔴 Failed to clear webhook queue', { error, priority });
    }
  }

  // ==================== CLEANUP ====================

  async disconnect(): Promise<void> {
    await Promise.all([
      this.redis.disconnect(),
      this.publisher.disconnect(),
      this.subscriber.disconnect()
    ]);
    
    logger.info('🔴 Redis Service disconnected');
  }
}

// Export singleton instance
export const redisService = RedisService.getInstance();