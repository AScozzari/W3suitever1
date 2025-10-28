/**
 * 🔍 MCP DISCOVERY SERVICE
 * Auto-discovers tools from MCP servers and caches them in database
 */

import { db } from '../core/db';
import { mcpServers } from '../db/schema/w3suite';
import { eq, sql } from 'drizzle-orm';
import { mcpClientService } from './mcp-client-service';
import { logger } from '../core/logger';

interface DiscoveredTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, any>;
  category?: string;
}

export class MCPDiscoveryService {
  /**
   * Discover tools from a specific MCP server
   * @param serverId - Server ID to discover tools from
   * @param tenantId - Tenant ID for RLS
   * @param userId - User ID for multi-user OAuth (optional for discovery)
   * @returns Array of discovered tools
   */
  async discoverTools(
    serverId: string,
    tenantId: string,
    userId?: string
  ): Promise<DiscoveredTool[]> {
    try {
      logger.info('🔍 [MCP Discovery] Starting tool discovery', {
        serverId,
        tenantId,
        userId
      });

      // Get server details
      const servers = await db
        .select()
        .from(mcpServers)
        .where(eq(mcpServers.id, serverId))
        .limit(1);

      if (servers.length === 0) {
        throw new Error(`MCP Server not found: ${serverId}`);
      }

      const server = servers[0];

      // List available tools from MCP server
      const tools = await mcpClientService.listTools({
        serverId,
        tenantId,
        userId: userId || 'system' // Use system for discovery if no user provided
      });

      logger.info('✅ [MCP Discovery] Tools discovered', {
        serverId,
        serverName: server.name,
        toolCount: tools.length
      });

      // Transform to DiscoveredTool format
      const discoveredTools: DiscoveredTool[] = tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        category: this.inferCategory(tool.name, tool.description)
      }));

      // Update server's discoveredTools cache
      await db
        .update(mcpServers)
        .set({
          discoveredTools: discoveredTools as any,
          lastHealthCheck: new Date(),
          errorCount: 0, // Reset error count on successful discovery
          lastError: null
        })
        .where(eq(mcpServers.id, serverId));

      logger.info('💾 [MCP Discovery] Tools cached in database', {
        serverId,
        toolCount: discoveredTools.length
      });

      return discoveredTools;

    } catch (error) {
      logger.error('❌ [MCP Discovery] Failed to discover tools', {
        serverId,
        tenantId,
        error: error instanceof Error ? error.message : String(error)
      });

      // Update server with error (increment error count)
      try {
        await db
          .update(mcpServers)
          .set({
            lastError: error instanceof Error ? error.message : String(error),
            errorCount: sql`${mcpServers.errorCount} + 1`,
            lastHealthCheck: new Date()
          })
          .where(eq(mcpServers.id, serverId));
      } catch (updateError) {
        logger.error('❌ [MCP Discovery] Failed to update error state', {
          serverId,
          updateError: updateError instanceof Error ? updateError.message : String(updateError)
        });
      }

      throw error;
    }
  }

  /**
   * Discover tools from all active MCP servers for a tenant
   * @param tenantId - Tenant ID
   * @param userId - Optional user ID for OAuth-based servers
   */
  async discoverAllServers(
    tenantId: string,
    userId?: string
  ): Promise<Record<string, DiscoveredTool[]>> {
    try {
      logger.info('🔍 [MCP Discovery] Discovering all servers', {
        tenantId,
        userId
      });

      // Get all active servers for tenant
      const servers = await db
        .select()
        .from(mcpServers)
        .where(eq(mcpServers.tenantId, tenantId));

      const results: Record<string, DiscoveredTool[]> = {};

      // Discover tools for each server (parallel)
      await Promise.allSettled(
        servers.map(async (server) => {
          try {
            const tools = await this.discoverTools(
              server.id,
              tenantId,
              userId
            );
            results[server.id] = tools;
          } catch (error) {
            logger.warn('⚠️ [MCP Discovery] Server discovery failed', {
              serverId: server.id,
              serverName: server.name,
              error: error instanceof Error ? error.message : String(error)
            });
            results[server.id] = [];
          }
        })
      );

      logger.info('✅ [MCP Discovery] All servers discovered', {
        tenantId,
        serverCount: servers.length,
        totalTools: Object.values(results).reduce((sum, tools) => sum + tools.length, 0)
      });

      return results;

    } catch (error) {
      logger.error('❌ [MCP Discovery] Failed to discover all servers', {
        tenantId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get cached tools for a server (from database)
   * @param serverId - Server ID
   * @returns Cached tools or empty array if not cached
   */
  async getCachedTools(serverId: string): Promise<DiscoveredTool[]> {
    try {
      const servers = await db
        .select()
        .from(mcpServers)
        .where(eq(mcpServers.id, serverId))
        .limit(1);

      if (servers.length === 0) {
        return [];
      }

      const discoveredTools = servers[0].discoveredTools as any;
      return Array.isArray(discoveredTools) ? discoveredTools : [];

    } catch (error) {
      logger.error('❌ [MCP Discovery] Failed to get cached tools', {
        serverId,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Find servers that support a specific tool
   * @param toolName - Tool name to search for
   * @param tenantId - Tenant ID for RLS
   * @returns Array of server IDs that support the tool
   */
  async findServersByTool(
    toolName: string,
    tenantId: string
  ): Promise<Array<{ serverId: string; serverName: string; displayName: string }>> {
    try {
      // Get all servers for tenant
      const servers = await db
        .select()
        .from(mcpServers)
        .where(eq(mcpServers.tenantId, tenantId));

      // Filter servers that have the tool in discoveredTools
      const matchingServers = servers.filter((server) => {
        const tools = (server.discoveredTools as any) || [];
        return Array.isArray(tools) && tools.some((tool: any) => tool.name === toolName);
      });

      return matchingServers.map((server) => ({
        serverId: server.id,
        serverName: server.name,
        displayName: server.displayName
      }));

    } catch (error) {
      logger.error('❌ [MCP Discovery] Failed to find servers by tool', {
        toolName,
        tenantId,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Infer category from tool name and description
   * @param name - Tool name
   * @param description - Tool description
   * @returns Inferred category
   */
  private inferCategory(name?: string, description?: string): string {
    const text = `${name} ${description}`.toLowerCase();

    if (text.includes('email') || text.includes('mail') || text.includes('gmail')) {
      return 'communication';
    }
    if (text.includes('calendar') || text.includes('schedule') || text.includes('event')) {
      return 'productivity';
    }
    if (text.includes('drive') || text.includes('file') || text.includes('upload') || text.includes('storage') || text.includes('s3')) {
      return 'storage';
    }
    if (text.includes('sheet') || text.includes('doc') || text.includes('document')) {
      return 'productivity';
    }
    if (text.includes('database') || text.includes('postgres') || text.includes('sql')) {
      return 'database';
    }
    if (text.includes('payment') || text.includes('stripe') || text.includes('invoice')) {
      return 'payment';
    }
    if (text.includes('slack') || text.includes('message') || text.includes('chat')) {
      return 'communication';
    }
    if (text.includes('analytics') || text.includes('gtm') || text.includes('tracking')) {
      return 'analytics';
    }

    return 'other';
  }
}

// Singleton export
export const mcpDiscoveryService = new MCPDiscoveryService();
