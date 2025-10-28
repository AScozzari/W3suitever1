/**
 * MCP REGISTRY API CLIENT
 * 
 * Official MCP Registry API client for discovering community servers
 * API: https://registry.modelcontextprotocol.io
 * Docs: https://github.com/modelcontextprotocol/registry
 */

import { logger } from '../core/logger';
import type { MCPServerTemplate } from './mcp-marketplace-registry';

// ==================== TYPES ====================

interface MCPRegistryServer {
  name: string; // e.g., "io.github.yourname/your-server"
  description?: string;
  version?: string;
  packages?: Array<{
    registryType: 'npm' | 'pypi' | 'oci' | 'github'; // FIXED: API uses camelCase 'registryType'
    identifier: string; // Package name or repo URL
    version?: string;
  }>;
  remotes?: Array<{
    type: 'http' | 'sse';
    url: string;
  }>;
  verification?: {
    dns?: boolean; // DNS-verified namespace
    github?: boolean; // GitHub OAuth verified
  };
  metadata?: {
    categories?: string[];
    homepage?: string;
    repository?: string;
    license?: string;
    author?: string;
    icon?: string;
  };
  auth?: {
    type: 'none' | 'api_key' | 'oauth2' | 'bearer';
    scopes?: string[];
  };
}

interface MCPRegistryResponse {
  servers: Array<{
    server: MCPRegistryServer;
  }>;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
  };
}

// ==================== CLIENT ====================

export class MCPRegistryAPIClient {
  private static readonly BASE_URL = 'https://registry.modelcontextprotocol.io';
  private static readonly API_VERSION = 'v0';
  private static readonly TIMEOUT_MS = 10000; // 10 seconds
  private static readonly MAX_RETRIES = 3;

  /**
   * Search servers in MCP Registry
   */
  static async searchServers(params: {
    query?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<MCPServerTemplate[]> {
    const { query = '', limit = 50, offset = 0 } = params;

    try {
      const url = new URL(`${this.BASE_URL}/${this.API_VERSION}/servers`);
      
      if (query) {
        url.searchParams.set('search', query);
      }
      url.searchParams.set('limit', limit.toString());
      url.searchParams.set('offset', offset.toString());

      logger.info('🔍 [MCP Registry] Searching servers', {
        query,
        limit,
        offset,
        url: url.toString()
      });

      const response = await this.fetchWithTimeout(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'W3Suite-MCP-Client/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`MCP Registry API error: ${response.status} ${response.statusText}`);
      }

      const data: MCPRegistryResponse = await response.json();
      
      // Extract servers from nested structure
      const servers = (data.servers || []).map(item => item.server);
      
      logger.info('✅ [MCP Registry] Servers fetched', {
        count: servers.length,
        total: data.pagination?.total
      });

      // Transform to our internal format
      return this.transformToTemplates(servers);
    } catch (error: any) {
      logger.error('❌ [MCP Registry] Search failed', {
        error: error.message,
        query
      });
      
      // Return empty array on error (fail gracefully)
      return [];
    }
  }

  /**
   * Get server by ID from registry
   */
  static async getServerById(serverId: string): Promise<MCPServerTemplate | null> {
    try {
      const url = `${this.BASE_URL}/${this.API_VERSION}/servers/${encodeURIComponent(serverId)}`;
      
      logger.info('🔍 [MCP Registry] Fetching server', { serverId });

      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'W3Suite-MCP-Client/1.0'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`MCP Registry API error: ${response.status}`);
      }

      const server: MCPRegistryServer = await response.json();
      const templates = this.transformToTemplates([server]);
      
      return templates[0] || null;
    } catch (error: any) {
      logger.error('❌ [MCP Registry] Get server failed', {
        error: error.message,
        serverId
      });
      return null;
    }
  }

  /**
   * Transform MCP Registry format to our template format
   */
  private static transformToTemplates(servers: MCPRegistryServer[]): MCPServerTemplate[] {
    return servers
      .map(server => this.transformServer(server))
      .filter((t): t is MCPServerTemplate => t !== null);
  }

  /**
   * Transform single server
   */
  private static transformServer(server: MCPRegistryServer): MCPServerTemplate | null {
    try {
      // Extract primary package (prefer npm > pypi > oci/docker > github)
      const npmPkg = server.packages?.find(p => p.registryType === 'npm');
      const pypiPkg = server.packages?.find(p => p.registryType === 'pypi');
      const dockerPkg = server.packages?.find(p => p.registryType === 'oci');
      const githubPkg = server.packages?.find(p => p.registryType === 'github');
      
      const primaryPkg = npmPkg || pypiPkg || dockerPkg || githubPkg;

      if (!primaryPkg) {
        // No installable package, skip
        return null;
      }

      // Determine language from package type
      const language = npmPkg ? 'typescript' : pypiPkg ? 'python' : 'typescript';
      const packageManager = npmPkg ? 'npm' : pypiPkg ? 'pip' : 'docker';

      // Determine transport (FIXED: respect remotes correctly)
      // If server has installable packages (npm/pypi/docker), it can run via stdio
      // If server ONLY exposes HTTP/SSE remotes (no packages), use http-sse
      const hasInstallablePackage = !!(npmPkg || pypiPkg || dockerPkg);
      const hasRemotes = (server.remotes?.length || 0) > 0;
      
      // Priority: installable packages prefer stdio, remotes-only use http-sse
      const transport = hasInstallablePackage ? 'stdio' : hasRemotes ? 'http-sse' : 'stdio';

      // Map auth type
      const authType = this.mapAuthType(server.auth?.type);

      // Determine category
      const category = this.mapCategory(server.metadata?.categories?.[0] || 'other');

      // Extract verification status
      const verified = !!(server.verification?.dns || server.verification?.github);

      return {
        id: server.name.replace(/\//g, '-').replace(/\./g, '-'), // Sanitize ID
        name: server.name,
        displayName: this.extractDisplayName(server.name),
        description: server.description || 'MCP server from registry',
        category,
        language,
        packageManager,
        packageName: primaryPkg.identifier,
        version: primaryPkg.version || server.version || 'latest',
        authType,
        iconUrl: server.metadata?.icon,
        officialSupport: false, // Registry servers are not official Anthropic
        verified,
        transport,
        repoUrl: server.metadata?.repository,
        installHints: {
          envVars: server.auth?.type === 'api_key' ? ['API_KEY'] : [],
          postInstallNotes: `Community server from ${server.name}`
        },
        oauthConfig: server.auth?.type === 'oauth2' ? {
          scopes: server.auth.scopes || [],
          provider: this.detectOAuthProvider(server.name)
        } : undefined,
        exampleTools: [], // Will be discovered after installation
        trustLevel: verified ? 'verified' : 'community',
        securityNotes: verified ? undefined : 'Unverified community server. Review code before installation.'
      };
    } catch (error: any) {
      logger.warn('⚠️ [MCP Registry] Failed to transform server', {
        serverName: server.name,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Extract display name from server ID
   * e.g., "io.github.user/my-server" → "My Server"
   */
  private static extractDisplayName(name: string): string {
    const parts = name.split('/');
    const serverName = parts[parts.length - 1] || name;
    
    return serverName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Map MCP Registry auth type to our format
   */
  private static mapAuthType(type?: string): MCPServerTemplate['authType'] {
    switch (type) {
      case 'oauth2': return 'oauth2';
      case 'api_key': return 'api_key';
      case 'bearer': return 'bearer_token';
      case 'basic': return 'basic_auth';
      default: return 'none';
    }
  }

  /**
   * Map category from registry to our format
   */
  private static mapCategory(category: string): MCPServerTemplate['category'] {
    const lowerCategory = category.toLowerCase();
    
    if (lowerCategory.includes('product')) return 'productivity';
    if (lowerCategory.includes('comm')) return 'communication';
    if (lowerCategory.includes('storage') || lowerCategory.includes('file')) return 'storage';
    if (lowerCategory.includes('database') || lowerCategory.includes('db')) return 'database';
    if (lowerCategory.includes('dev')) return 'development';
    if (lowerCategory.includes('analytic')) return 'analytics';
    
    return 'other';
  }

  /**
   * Detect OAuth provider from server name
   */
  private static detectOAuthProvider(name: string): MCPServerTemplate['oauthConfig']['provider'] {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('google')) return 'google';
    if (lowerName.includes('microsoft') || lowerName.includes('azure')) return 'microsoft';
    if (lowerName.includes('meta') || lowerName.includes('facebook')) return 'meta';
    if (lowerName.includes('github')) return 'github';
    if (lowerName.includes('slack')) return 'slack';
    if (lowerName.includes('stripe')) return 'stripe';
    
    return 'google'; // Default fallback
  }

  /**
   * Fetch with timeout
   */
  private static async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Health check for MCP Registry API
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.BASE_URL}/health`;
      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
