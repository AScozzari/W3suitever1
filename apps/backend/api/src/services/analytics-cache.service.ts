/**
 * Analytics Cache Service
 * 
 * Layered caching for CRM analytics queries using Redis
 * Extends RedisService with tenant-scoped, metric-specific caching
 * 
 * Key Design: crm:analytics:{tenantId}:{funnelId|'global'}:{metric}:{mode}:{paramsHash}
 * TTL Strategy: 
 *   - realtime: 2-3 minutes (fresh data)
 *   - historical: 15 minutes (stable data)
 * Invalidation: Async fire-and-forget with targeted SCAN + pipeline delete
 * 
 * Performance target: 70-90% cache hit rate, <50ms fetch latency
 */

import { RedisService } from '../core/redis-service';
import { logger } from '../core/logger';
import crypto from 'crypto';

export interface AnalyticsCacheConfig {
  ttl: number; // TTL in seconds
  mode: 'realtime' | 'historical';
  metric: string; // e.g. 'overview', 'stage-performance', 'roi'
}

export interface AnalyticsCacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  avgFetchLatency: number;
  totalKeys: number;
}

export class AnalyticsCacheService {
  private static instance: AnalyticsCacheService;
  private redis: RedisService;
  private stats: Map<string, { hits: number; misses: number; latencies: number[] }>;

  // TTL presets (in seconds)
  private readonly TTL_PRESETS = {
    realtime: 180,      // 3 minutes (fresh data for dashboards)
    historical: 900,    // 15 minutes (stable data for reports)
    export: 0           // No cache (always fresh for exports)
  };

  private constructor() {
    this.redis = RedisService.getInstance();
    this.stats = new Map();
    
    logger.info('📊 Analytics Cache Service initialized', {
      ttlPresets: this.TTL_PRESETS
    });
  }

  static getInstance(): AnalyticsCacheService {
    if (!AnalyticsCacheService.instance) {
      AnalyticsCacheService.instance = new AnalyticsCacheService();
    }
    return AnalyticsCacheService.instance;
  }

  /**
   * Build deterministic cache key from parameters
   * Format: crm:analytics:{tenantId}:{funnelId|'global'}:{metric}:{mode}:{paramsHash}
   */
  private buildCacheKey(
    tenantId: string,
    funnelId: string | null,
    metric: string,
    mode: 'realtime' | 'historical',
    params: Record<string, any> = {}
  ): string {
    // Hash params for consistent, collision-resistant keys
    const paramsHash = this.hashParams(params);
    const funnelScope = funnelId || 'global';
    
    return `crm:analytics:${tenantId}:${funnelScope}:${metric}:${mode}:${paramsHash}`;
  }

  /**
   * Generate SHA1 hash of params (first 12 chars for brevity)
   * Deterministic ordering ensures same params = same hash
   */
  private hashParams(params: Record<string, any>): string {
    // Sort keys for deterministic hashing
    const sortedKeys = Object.keys(params).sort();
    const normalized = sortedKeys.map(k => `${k}=${JSON.stringify(params[k])}`).join('&');
    
    return crypto
      .createHash('sha1')
      .update(normalized)
      .digest('hex')
      .substring(0, 12); // 12 chars = 48 bits (low collision probability)
  }

  /**
   * Get or fetch analytics data with caching
   * Main entry point for all analytics queries
   * 
   * @param tenantId - Tenant identifier
   * @param funnelId - Funnel ID (null for global metrics)
   * @param metric - Metric name (e.g. 'overview', 'stage-performance')
   * @param mode - Data freshness mode
   * @param params - Query parameters (filters, date ranges)
   * @param fetcher - Function to fetch fresh data if cache miss
   * @returns Cached or freshly fetched data
   */
  async getOrFetch<T>(
    tenantId: string,
    funnelId: string | null,
    metric: string,
    mode: 'realtime' | 'historical',
    params: Record<string, any>,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const cacheKey = this.buildCacheKey(tenantId, funnelId, metric, mode, params);
    const startTime = Date.now();

    try {
      // Try to get from cache
      const cached = await this.get<T>(cacheKey);
      
      if (cached !== null) {
        // Cache HIT
        this.recordHit(metric);
        const latency = Date.now() - startTime;
        
        logger.debug('📊 Analytics cache HIT', {
          metric,
          mode,
          latency: `${latency}ms`,
          cacheKey
        });
        
        return cached;
      }

      // Cache MISS - fetch fresh data
      this.recordMiss(metric);
      const freshData = await fetcher();
      
      const fetchLatency = Date.now() - startTime;
      logger.debug('📊 Analytics cache MISS', {
        metric,
        mode,
        fetchLatency: `${fetchLatency}ms`,
        cacheKey
      });

      // Store in cache with appropriate TTL
      const ttl = this.TTL_PRESETS[mode] || this.TTL_PRESETS.historical;
      await this.set(cacheKey, freshData, ttl);

      this.recordLatency(metric, fetchLatency);
      
      return freshData;
    } catch (error) {
      logger.error('📊 Analytics cache error, falling back to direct fetch', {
        error: error instanceof Error ? error.message : String(error),
        metric,
        cacheKey
      });

      // Graceful degradation: return fresh data even if caching fails
      return await fetcher();
    }
  }

  /**
   * Get value from cache
   */
  private async get<T>(key: string): Promise<T | null> {
    // RedisService handles availability checks internally
    const redis = (this.redis as any).redis;
    if (!redis) return null;

    try {
      const cached = await redis.get(key);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      return parsed.data as T;
    } catch (error) {
      logger.warn('📊 Failed to get from cache', { error, key });
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  private async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    const redis = (this.redis as any).redis;
    if (!redis || ttlSeconds === 0) return; // Skip cache if TTL is 0 (export mode)

    try {
      const payload = JSON.stringify({
        data,
        cachedAt: new Date().toISOString()
      });

      await redis.setex(key, ttlSeconds, payload);
      
      logger.debug('📊 Analytics data cached', { 
        key, 
        ttl: `${ttlSeconds}s`,
        size: `${payload.length} bytes`
      });
    } catch (error) {
      logger.warn('📊 Failed to set cache', { error, key });
    }
  }

  /**
   * Invalidate analytics cache for specific scope
   * Supports wildcard patterns using SCAN for efficiency
   * 
   * @param tenantId - Tenant to invalidate
   * @param funnelId - Specific funnel (null = all funnels)
   * @param metric - Specific metric (null = all metrics)
   */
  async invalidate(
    tenantId: string,
    funnelId: string | null = null,
    metric: string | null = null
  ): Promise<void> {
    const redis = (this.redis as any).redis;
    if (!redis) return;

    try {
      // Build pattern for SCAN
      const funnelScope = funnelId || '*';
      const metricScope = metric || '*';
      const pattern = `crm:analytics:${tenantId}:${funnelScope}:${metricScope}:*`;

      logger.info('📊 Invalidating analytics cache', {
        pattern,
        tenantId,
        funnelId: funnelId || 'all',
        metric: metric || 'all'
      });

      // Use SCAN for memory-efficient iteration (non-blocking)
      let cursor = '0';
      let totalDeleted = 0;
      const batchSize = 100;

      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          batchSize
        );

        cursor = nextCursor;

        if (keys.length > 0) {
          // Pipeline delete for efficiency
          const pipeline = redis.pipeline();
          keys.forEach((key: string) => pipeline.del(key));
          await pipeline.exec();
          
          totalDeleted += keys.length;
        }
      } while (cursor !== '0');

      logger.info('📊 Analytics cache invalidated', {
        pattern,
        keysDeleted: totalDeleted
      });
    } catch (error) {
      // Fire-and-forget: log but don't throw
      logger.error('📊 Failed to invalidate analytics cache', {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        funnelId,
        metric
      });
    }
  }

  /**
   * Invalidate all analytics for a funnel (deal/pipeline changes)
   */
  async invalidateFunnel(tenantId: string, funnelId: string): Promise<void> {
    await this.invalidate(tenantId, funnelId, null);
  }

  /**
   * Invalidate ROI metrics (campaign spend changes)
   */
  async invalidateROI(tenantId: string): Promise<void> {
    // ROI metrics are in 'overview' metric type
    await this.invalidate(tenantId, null, 'overview');
  }

  /**
   * Invalidate stage performance (stage config changes)
   */
  async invalidateStagePerformance(tenantId: string, funnelId: string): Promise<void> {
    await this.invalidate(tenantId, funnelId, 'stage-performance');
  }

  /**
   * Get cache statistics for monitoring
   */
  async getStats(metric?: string): Promise<AnalyticsCacheStats> {
    const allStats = metric ? [metric] : Array.from(this.stats.keys());
    
    let totalHits = 0;
    let totalMisses = 0;
    let allLatencies: number[] = [];

    allStats.forEach(m => {
      const s = this.stats.get(m);
      if (s) {
        totalHits += s.hits;
        totalMisses += s.misses;
        allLatencies = allLatencies.concat(s.latencies);
      }
    });

    const total = totalHits + totalMisses;
    const hitRate = total > 0 ? (totalHits / total) * 100 : 0;
    const avgLatency = allLatencies.length > 0
      ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length
      : 0;

    // Get total keys count from Redis
    const redis = (this.redis as any).redis;
    let totalKeys = 0;
    if (redis) {
      try {
        const keys = await redis.keys('crm:analytics:*');
        totalKeys = keys.length;
      } catch (error) {
        logger.warn('📊 Failed to count cache keys', { error });
      }
    }

    return {
      hits: totalHits,
      misses: totalMisses,
      hitRate: Math.round(hitRate * 100) / 100,
      avgFetchLatency: Math.round(avgLatency),
      totalKeys
    };
  }

  /**
   * Record cache hit for metrics
   */
  private recordHit(metric: string): void {
    const stats = this.stats.get(metric) || { hits: 0, misses: 0, latencies: [] };
    stats.hits++;
    this.stats.set(metric, stats);
  }

  /**
   * Record cache miss for metrics
   */
  private recordMiss(metric: string): void {
    const stats = this.stats.get(metric) || { hits: 0, misses: 0, latencies: [] };
    stats.misses++;
    this.stats.set(metric, stats);
  }

  /**
   * Record fetch latency for metrics (keep last 100 samples)
   */
  private recordLatency(metric: string, latency: number): void {
    const stats = this.stats.get(metric) || { hits: 0, misses: 0, latencies: [] };
    stats.latencies.push(latency);
    
    // Keep only last 100 samples to avoid memory growth
    if (stats.latencies.length > 100) {
      stats.latencies = stats.latencies.slice(-100);
    }
    
    this.stats.set(metric, stats);
  }

  /**
   * Clear all stats (useful for testing)
   */
  clearStats(): void {
    this.stats.clear();
    logger.debug('📊 Analytics cache stats cleared');
  }

  /**
   * Flush entire analytics cache (admin operation)
   * Use with caution - forces cold cache
   */
  async flushAll(tenantId?: string): Promise<void> {
    const pattern = tenantId 
      ? `crm:analytics:${tenantId}:*`
      : 'crm:analytics:*';

    logger.warn('📊 Flushing analytics cache', { pattern });
    
    const redis = (this.redis as any).redis;
    if (!redis) return;

    try {
      let cursor = '0';
      let totalDeleted = 0;

      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 1000);
        cursor = nextCursor;

        if (keys.length > 0) {
          await redis.del(...keys);
          totalDeleted += keys.length;
        }
      } while (cursor !== '0');

      logger.info('📊 Analytics cache flushed', { 
        pattern, 
        keysDeleted: totalDeleted 
      });
    } catch (error) {
      logger.error('📊 Failed to flush analytics cache', { error, pattern });
    }
  }
}

// Export singleton instance
export const analyticsCacheService = AnalyticsCacheService.getInstance();
