/**
 * MCP HYBRID MARKETPLACE SERVICE
 * 
 * Aggregates MCP servers from multiple sources with trust ranking:
 * 1. Curated official list (highest trust)
 * 2. MCP Registry verified servers
 * 3. MCP Registry community servers
 * 
 * Features:
 * - In-memory caching (24h)
 * - Trust-based ranking
 * - Deduplication
 * - Search & filtering
 */

import { logger } from '../core/logger';
import { MCPMarketplaceRegistry, type MCPServerTemplate } from './mcp-marketplace-registry';
import { MCPRegistryAPIClient } from './mcp-registry-api-client';

// ==================== TYPES ====================

export interface MarketplaceSearchParams {
  query?: string;
  category?: string;
  trustLevel?: 'official' | 'verified' | 'community';
  authType?: string;
  language?: 'typescript' | 'python' | 'go' | 'rust';
  transport?: 'stdio' | 'http-sse';
  includeRegistry?: boolean; // Default: true
}

export interface MarketplaceStats {
  total: number;
  byTrustLevel: {
    official: number;
    verified: number;
    community: number;
  };
  byCategory: Record<string, number>;
  lastUpdated: Date;
}

// ==================== CACHE ====================

interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  set<T>(key: string, data: T, ttlMs: number = this.DEFAULT_TTL_MS): void {
    const now = new Date();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: new Date(now.getTime() + ttlMs)
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check expiration
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
}

// ==================== SERVICE ====================

export class MCPHybridMarketplaceService {
  private static cache = new SimpleCache();
  private static readonly CACHE_KEY_PREFIX = 'mcp:marketplace:';
  private static readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get all servers from hybrid sources
   * 
   * Priority: Curated > Registry Verified > Registry Community
   */
  static async getAllServers(params: MarketplaceSearchParams = {}): Promise<MCPServerTemplate[]> {
    const { includeRegistry = true } = params;
    
    // Start with curated servers (always included)
    let servers = MCPMarketplaceRegistry.getCuratedServers();

    // Add registry servers if enabled
    if (includeRegistry) {
      const registryServers = await this.getRegistryServers();
      servers = this.mergeServers(servers, registryServers);
    }

    // Apply filters
    servers = this.applyFilters(servers, params);

    // Sort by trust level and name
    servers = this.sortByTrust(servers);

    logger.info('📊 [Hybrid Marketplace] Servers fetched', {
      total: servers.length,
      curated: servers.filter(s => s.trustLevel === 'official').length,
      verified: servers.filter(s => s.trustLevel === 'verified').length,
      community: servers.filter(s => s.trustLevel === 'community').length,
      cached: this.cache.has(this.getCacheKey('all'))
    });

    return servers;
  }

  /**
   * Search servers across all sources
   */
  static async searchServers(query: string, params: MarketplaceSearchParams = {}): Promise<MCPServerTemplate[]> {
    const allServers = await this.getAllServers({ ...params, query });
    return allServers;
  }

  /**
   * Get server by ID (check curated first, then registry)
   */
  static async getServerById(serverId: string): Promise<MCPServerTemplate | null> {
    // Check curated first
    const curatedServer = MCPMarketplaceRegistry.getCuratedTemplate(serverId);
    if (curatedServer) {
      return curatedServer;
    }

    // Check registry
    try {
      const registryServer = await MCPRegistryAPIClient.getServerById(serverId);
      return registryServer;
    } catch (error) {
      logger.error('❌ [Hybrid Marketplace] Get server failed', {
        serverId,
        error: (error as Error).message
      });
      return null;
    }
  }

  /**
   * Get marketplace statistics
   */
  static async getStats(): Promise<MarketplaceStats> {
    const servers = await this.getAllServers();

    const byTrustLevel = {
      official: servers.filter(s => s.trustLevel === 'official').length,
      verified: servers.filter(s => s.trustLevel === 'verified').length,
      community: servers.filter(s => s.trustLevel === 'community').length
    };

    const byCategory = servers.reduce((acc, server) => {
      acc[server.category] = (acc[server.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: servers.length,
      byTrustLevel,
      byCategory,
      lastUpdated: new Date()
    };
  }

  /**
   * Clear cache (admin operation)
   */
  static clearCache(): void {
    this.cache.clear();
    logger.info('🗑️ [Hybrid Marketplace] Cache cleared');
  }

  /**
   * Validate if server is from trusted source
   */
  static async isTrustedServer(packageName: string): Promise<boolean> {
    // Check curated list first
    if (MCPMarketplaceRegistry.isCuratedPackage(packageName)) {
      return true;
    }

    // Check if verified in registry
    const allServers = await this.getAllServers();
    const server = allServers.find(s => s.packageName === packageName);
    
    return server?.verified === true || server?.trustLevel === 'official';
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Get servers from MCP Registry (with caching)
   */
  private static async getRegistryServers(): Promise<MCPServerTemplate[]> {
    const cacheKey = this.getCacheKey('registry');
    
    // Check cache first
    const cached = this.cache.get<MCPServerTemplate[]>(cacheKey);
    if (cached) {
      logger.debug('✅ [Hybrid Marketplace] Using cached registry servers');
      return cached;
    }

    // Fetch from registry
    try {
      const servers = await MCPRegistryAPIClient.searchServers({ limit: 100 });
      
      // Cache results
      this.cache.set(cacheKey, servers, this.CACHE_TTL_MS);
      
      logger.info('✅ [Hybrid Marketplace] Registry servers fetched and cached', {
        count: servers.length
      });
      
      return servers;
    } catch (error) {
      logger.error('❌ [Hybrid Marketplace] Registry fetch failed', {
        error: (error as Error).message
      });
      return []; // Return empty on error
    }
  }

  /**
   * Merge servers with deduplication
   * Priority: Curated > Verified > Community
   */
  private static mergeServers(
    curated: MCPServerTemplate[],
    registry: MCPServerTemplate[]
  ): MCPServerTemplate[] {
    const serverMap = new Map<string, MCPServerTemplate>();

    // Add curated servers first (highest priority)
    for (const server of curated) {
      const key = this.getServerKey(server);
      serverMap.set(key, server);
    }

    // Add registry servers (lower priority - only if not already present)
    for (const server of registry) {
      const key = this.getServerKey(server);
      
      if (!serverMap.has(key)) {
        serverMap.set(key, server);
      } else {
        // Server exists in curated list - keep curated version
        logger.debug('⚠️ [Hybrid Marketplace] Duplicate server skipped', {
          server: server.name,
          reason: 'Already in curated list'
        });
      }
    }

    return Array.from(serverMap.values());
  }

  /**
   * Get unique key for server (for deduplication)
   */
  private static getServerKey(server: MCPServerTemplate): string {
    // Use package name as primary key, fallback to name
    return server.packageName || server.name;
  }

  /**
   * Apply search and filter parameters
   */
  private static applyFilters(
    servers: MCPServerTemplate[],
    params: MarketplaceSearchParams
  ): MCPServerTemplate[] {
    let filtered = servers;

    // Query search
    if (params.query) {
      const lowerQuery = params.query.toLowerCase();
      filtered = filtered.filter(s =>
        s.displayName.toLowerCase().includes(lowerQuery) ||
        s.description.toLowerCase().includes(lowerQuery) ||
        s.name.toLowerCase().includes(lowerQuery) ||
        s.packageName.toLowerCase().includes(lowerQuery) ||
        s.exampleTools?.some(tool => tool.toLowerCase().includes(lowerQuery))
      );
    }

    // Category filter
    if (params.category) {
      filtered = filtered.filter(s => s.category === params.category);
    }

    // Language filter (FIXED: was missing)
    if (params.language) {
      filtered = filtered.filter(s => s.language === params.language);
    }

    // Trust level filter
    if (params.trustLevel) {
      filtered = filtered.filter(s => s.trustLevel === params.trustLevel);
    }

    // Auth type filter
    if (params.authType) {
      filtered = filtered.filter(s => s.authType === params.authType);
    }

    // Transport filter
    if (params.transport) {
      filtered = filtered.filter(s => s.transport === params.transport);
    }

    return filtered;
  }

  /**
   * Sort servers by trust level, then by name
   * Order: Official > Verified > Community
   */
  private static sortByTrust(servers: MCPServerTemplate[]): MCPServerTemplate[] {
    const trustOrder = { official: 0, verified: 1, community: 2 };

    return servers.sort((a, b) => {
      // Sort by trust level first
      const trustCompare = trustOrder[a.trustLevel] - trustOrder[b.trustLevel];
      if (trustCompare !== 0) return trustCompare;

      // Then by name
      return a.displayName.localeCompare(b.displayName);
    });
  }

  /**
   * Get cache key
   */
  private static getCacheKey(suffix: string): string {
    return `${this.CACHE_KEY_PREFIX}${suffix}`;
  }
}
