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
    const key = `unread_count:${tenantId}:${userId}`;
    const count = await this.redis.get(key);
    return count ? parseInt(count, 10) : null;
  }

  /**
   * Invalidate user's notification cache
   */
  async invalidateUserNotificationCache(userId: string, tenantId: string): Promise<void> {
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
    const channel = `notifications:${notificationEvent.tenantId}`;
    await this.publisher.publish(channel, JSON.stringify(notificationEvent));
    
    logger.debug('🔴 Notification published', {
      channel,
      type: notificationEvent.type,
      notificationId: notificationEvent.notificationId
    });
  }

  /**
   * Subscribe to notification events for a tenant
   */
  async subscribeToNotifications(tenantId: string, callback: (event: any) => void): Promise<void> {
    const channel = `notifications:${tenantId}`;
    
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
    const key = `websocket_sessions:${tenantId}:${userId}`;
    await this.redis.sadd(key, sessionId);
    await this.redis.expire(key, 3600); // Expire in 1 hour
  }

  /**
   * Remove WebSocket session
   */
  async removeWebSocketSession(userId: string, tenantId: string, sessionId: string): Promise<void> {
    const key = `websocket_sessions:${tenantId}:${userId}`;
    await this.redis.srem(key, sessionId);
  }

  /**
   * Get active WebSocket sessions for user
   */
  async getWebSocketSessions(userId: string, tenantId: string): Promise<string[]> {
    const key = `websocket_sessions:${tenantId}:${userId}`;
    return await this.redis.smembers(key);
  }

  // ==================== RATE LIMITING ====================

  /**
   * Check rate limit for notifications
   */
  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, windowSeconds);
    }
    
    return current <= limit;
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