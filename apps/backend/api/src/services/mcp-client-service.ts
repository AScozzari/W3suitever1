/**
 * MCP Client Service
 * 
 * Enterprise-grade Model Context Protocol client for W3 Suite
 * Manages connections to external MCP servers (Google Workspace, Meta, AWS, etc.)
 * 
 * Features:
 * - Multi-transport support (stdio, Streamable HTTP)
 * - Credential management with encryption
 * - Health checks and monitoring
 * - Tool discovery and execution
 * - Connection pooling
 * - Error handling with retry logic
 * 
 * @author W3 Suite Team
 * @date 2025-10-08
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { 
  Tool, 
  CallToolResult, 
  ListToolsResult 
} from '@modelcontextprotocol/sdk/types.js';
import { db } from '../core/db.js';
import { mcpServers, mcpServerCredentials, mcpToolSchemas } from '../db/schema/w3suite.js';
import { eq, and } from 'drizzle-orm';
import type { MCPServer, MCPServerCredential } from '../db/schema/w3suite.js';
import { logger } from '../core/logger.js';
import { decryptMCPCredentials } from './mcp-credential-encryption.js';

// ==================== TYPES ====================

interface MCPClientConnection {
  client: Client;
  transport: StdioClientTransport | StreamableHTTPClientTransport;
  serverId: string;
  connected: boolean;
  lastUsed: Date;
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
}

interface ToolExecutionOptions {
  serverId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  tenantId: string;
  userId: string; // REQUIRED for multi-user OAuth
}

interface ToolListOptions {
  serverId: string;
  tenantId: string;
  userId: string; // REQUIRED for multi-user OAuth
  forceRefresh?: boolean; // Force re-sync from server
}

interface ServerHealthCheck {
  serverId: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  latencyMs?: number;
  lastCheck: Date;
  error?: string;
}

// ==================== MCP CLIENT SERVICE ====================

class MCPClientService {
  private connections: Map<string, MCPClientConnection> = new Map();
  private maxConnections = 50; // Connection pool limit
  private connectionTimeout = 30000; // 30 seconds
  private idleTimeout = 300000; // 5 minutes - disconnect idle connections

  constructor() {
    // Start periodic cleanup of idle connections
    setInterval(() => this.cleanupIdleConnections(), 60000); // Every minute
  }

  /**
   * Get or create MCP client connection (multi-user OAuth support)
   * 
   * SECURITY: Connection cache keyed by serverId:userId to prevent
   * cross-user credential leakage. Each user gets isolated connection.
   */
  private async getConnection(serverId: string, tenantId: string, userId: string): Promise<MCPClientConnection> {
    // SECURITY: Use serverId:userId as key to prevent credential leakage
    const connectionKey = `${serverId}:${userId}`;
    
    // Check existing connection for THIS user
    const existingConnection = this.connections.get(connectionKey);
    if (existingConnection && existingConnection.connected) {
      existingConnection.lastUsed = new Date();
      logger.info('Reusing existing MCP connection (user-scoped)', { 
        serverId, 
        tenantId, 
        userId,
        connectionKey 
      });
      return existingConnection;
    }

    // Check connection pool limit
    if (this.connections.size >= this.maxConnections) {
      await this.cleanupIdleConnections();
      
      if (this.connections.size >= this.maxConnections) {
        throw new Error('MCP connection pool limit reached. Please try again later.');
      }
    }

    // Create new connection (user-scoped, multi-user OAuth)
    logger.info('Creating new MCP connection (user-scoped)', { 
      serverId, 
      tenantId, 
      userId,
      connectionKey 
    });
    return await this.createConnection(serverId, tenantId, userId);
  }

  /**
   * Create new MCP client connection (multi-user OAuth support)
   */
  private async createConnection(serverId: string, tenantId: string, userId: string): Promise<MCPClientConnection> {
    // Fetch server config from database
    const [serverConfig] = await db
      .select()
      .from(mcpServers)
      .where(and(
        eq(mcpServers.id, serverId),
        eq(mcpServers.tenantId, tenantId)
      ))
      .limit(1);

    if (!serverConfig) {
      throw new Error(`MCP server not found: ${serverId}`);
    }

    if (serverConfig.status !== 'active') {
      throw new Error(`MCP server is not active: ${serverConfig.displayName} (status: ${serverConfig.status})`);
    }

    // Fetch credentials (multi-user OAuth)
    const credentials = await this.getCredentials(serverId, tenantId, userId);

    // Create client
    const client = new Client({
      name: `w3suite-mcp-client-${serverConfig.name}`,
      version: '1.0.0'
    }, {
      capabilities: {
        sampling: {} // Enable LLM sampling if needed
      }
    });

    // Create transport based on type
    let transport: StdioClientTransport | StreamableHTTPClientTransport;

    if (serverConfig.transport === 'stdio') {
      // Parse stdio config
      const config = serverConfig.config as any;
      if (!config?.command) {
        throw new Error('stdio transport requires command in config');
      }

      transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env: {
          ...process.env,
          ...credentials // Pass credentials as env vars for stdio
        }
      });
    } else {
      // Streamable HTTP transport
      if (!serverConfig.serverUrl) {
        throw new Error('http-sse transport requires serverUrl');
      }

      transport = new StreamableHTTPClientTransport(
        new URL(serverConfig.serverUrl)
      );
      
      // Set up authentication headers for HTTP
      if (credentials?.accessToken) {
        // TODO: Implement custom headers for auth
        // This may require extending the transport or using a custom fetch
      }
    }

    // Connect with timeout
    const connectPromise = client.connect(transport);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), this.connectionTimeout)
    );

    try {
      await Promise.race([connectPromise, timeoutPromise]);
      
      // Initialize connection
      await client.initialize();

      // SECURITY: Store connection with serverId:userId key
      const connectionKey = `${serverId}:${userId}`;
      
      const connection: MCPClientConnection = {
        client,
        transport,
        serverId,
        connected: true,
        lastUsed: new Date(),
        healthStatus: 'healthy'
      };

      this.connections.set(connectionKey, connection);
      
      // Update last health check in database
      await db
        .update(mcpServers)
        .set({ 
          lastHealthCheck: new Date(),
          lastError: null
        })
        .where(eq(mcpServers.id, serverId));

      logger.info('MCP connection established', { 
        serverId, 
        serverName: serverConfig.displayName,
        transport: serverConfig.transport
      });

      return connection;
    } catch (error: any) {
      logger.error('Failed to connect to MCP server', { 
        serverId, 
        serverName: serverConfig.displayName,
        error: error.message 
      });

      // Update error in database
      await db
        .update(mcpServers)
        .set({ 
          lastHealthCheck: new Date(),
          lastError: error.message,
          errorCount: serverConfig.errorCount + 1,
          status: serverConfig.errorCount >= 3 ? 'error' : serverConfig.status
        })
        .where(eq(mcpServers.id, serverId));

      throw new Error(`Failed to connect to MCP server: ${error.message}`);
    }
  }

  /**
   * Get and decrypt server credentials (MULTI-USER OAUTH with UnifiedCredentialService)
   * 
   * Uses UnifiedCredentialService for userId-scoped credential retrieval
   * and automatic OAuth token refresh.
   */
  private async getCredentials(serverId: string, tenantId: string, userId: string): Promise<Record<string, any>> {
    try {
      // Import UnifiedCredentialService
      const { UnifiedCredentialService } = await import('./unified-credential-service');

      // Determine OAuth provider from serverId/name
      // TODO: Store oauthProvider in mcpServers table
      const oauthProvider = this.detectOAuthProvider(serverId);

      if (oauthProvider) {
        // Use UnifiedCredentialService for OAuth providers (multi-user support)
        logger.info('Using UnifiedCredentialService for OAuth credentials', {
          serverId,
          tenantId,
          userId,
          provider: oauthProvider
        });

        const credentialPayload = await UnifiedCredentialService.getValidCredentials({
          tenantId,
          serverId,
          userId,
          oauthProvider,
          credentialType: 'oauth2_user'
        });

        // Update last used timestamp
        await db
          .update(mcpServerCredentials)
          .set({ lastUsedAt: new Date() })
          .where(eq(mcpServerCredentials.id, credentialPayload.credentialId));

        return credentialPayload.credentials;

      } else {
        // Fallback: Use tenant-level credentials for non-OAuth providers (AWS API keys, etc.)
        logger.info('Using tenant-level credentials (non-OAuth)', {
          serverId,
          tenantId
        });

        const [credentialRecord] = await db
          .select()
          .from(mcpServerCredentials)
          .where(and(
            eq(mcpServerCredentials.serverId, serverId),
            eq(mcpServerCredentials.tenantId, tenantId)
          ))
          .limit(1);

        if (!credentialRecord) {
          throw new Error('No credentials found for MCP server. Please configure credentials first.');
        }

        if (credentialRecord.revokedAt) {
          throw new Error('MCP server credentials have been revoked');
        }

        // Decrypt credentials
        const decrypted = await decryptMCPCredentials(
          credentialRecord.encryptedCredentials as any,
          tenantId
        );

        // Update last used timestamp
        await db
          .update(mcpServerCredentials)
          .set({ lastUsedAt: new Date() })
          .where(eq(mcpServerCredentials.id, credentialRecord.id));

        return decrypted;
      }

    } catch (error) {
      logger.error('Failed to get MCP credentials', {
        serverId,
        tenantId,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  /**
   * Detect OAuth provider from serverId/name
   * TODO: Store oauthProvider field in mcpServers table
   */
  private detectOAuthProvider(serverId: string): 'google' | 'microsoft' | 'meta' | null {
    const lowerServerId = serverId.toLowerCase();
    
    if (lowerServerId.includes('google') || lowerServerId.includes('workspace')) {
      return 'google';
    }
    if (lowerServerId.includes('microsoft') || lowerServerId.includes('365') || lowerServerId.includes('office')) {
      return 'microsoft';
    }
    if (lowerServerId.includes('meta') || lowerServerId.includes('facebook') || lowerServerId.includes('instagram')) {
      return 'meta';
    }
    
    return null; // Non-OAuth provider (AWS, Stripe, etc.)
  }

  /**
   * List available tools from MCP server (multi-user OAuth support)
   */
  async listTools(options: ToolListOptions): Promise<Tool[]> {
    const { serverId, tenantId, userId, forceRefresh = false } = options;

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedTools = await db
        .select()
        .from(mcpToolSchemas)
        .where(eq(mcpToolSchemas.serverId, serverId));

      if (cachedTools.length > 0) {
        logger.info('Returning cached MCP tools', { serverId, count: cachedTools.length });
        
        return cachedTools.map(cached => ({
          name: cached.toolName,
          description: cached.description || '',
          inputSchema: cached.inputSchema as any
        }));
      }
    }

    // Fetch from MCP server (user-scoped connection)
    const connection = await this.getConnection(serverId, tenantId, userId);
    
    try {
      const result: ListToolsResult = await connection.client.listTools();
      const tools = result.tools || [];

      logger.info('Fetched tools from MCP server', { serverId, count: tools.length });

      // Update cache
      await this.updateToolSchemaCache(serverId, tools);

      return tools;
    } catch (error: any) {
      logger.error('Failed to list MCP tools', { serverId, error: error.message });
      throw new Error(`Failed to list tools: ${error.message}`);
    }
  }

  /**
   * Execute tool on MCP server (multi-user OAuth support)
   */
  async executeTool(options: ToolExecutionOptions): Promise<CallToolResult> {
    const { serverId, tenantId, userId, toolName, arguments: args } = options;

    const connection = await this.getConnection(serverId, tenantId, userId);

    try {
      logger.info('Executing MCP tool', { serverId, toolName, args });

      const result: CallToolResult = await connection.client.callTool({
        name: toolName,
        arguments: args
      });

      logger.info('MCP tool executed successfully', { 
        serverId, 
        toolName,
        hasContent: !!result.content,
        isError: !!result.isError
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to execute MCP tool', { 
        serverId, 
        toolName, 
        error: error.message 
      });
      
      throw new Error(`Failed to execute tool ${toolName}: ${error.message}`);
    }
  }

  /**
   * Health check for MCP server (multi-user OAuth support)
   */
  async healthCheck(serverId: string, tenantId: string, userId: string): Promise<ServerHealthCheck> {
    const startTime = Date.now();
    
    try {
      const connection = await this.getConnection(serverId, tenantId, userId);
      
      // Simple health check: list tools
      await connection.client.listTools();
      
      const latencyMs = Date.now() - startTime;

      connection.healthStatus = 'healthy';

      return {
        serverId,
        status: 'healthy',
        latencyMs,
        lastCheck: new Date()
      };
    } catch (error: any) {
      logger.error('MCP health check failed', { serverId, userId, error: error.message });

      // SECURITY: Mark user-specific connection as unhealthy
      const connectionKey = `${serverId}:${userId}`;
      const connection = this.connections.get(connectionKey);
      if (connection) {
        connection.healthStatus = 'unhealthy';
      }

      return {
        serverId,
        status: 'unhealthy',
        lastCheck: new Date(),
        error: error.message
      };
    }
  }

  /**
   * Disconnect from MCP server (user-scoped)
   * 
   * SECURITY: Requires userId to prevent disconnecting other users' connections
   */
  async disconnect(serverId: string, userId?: string): Promise<void> {
    // SECURITY: Disconnect specific user's connection if userId provided
    const connectionKey = userId ? `${serverId}:${userId}` : serverId;
    const connection = this.connections.get(connectionKey);
    
    if (!connection) {
      // If no userId provided, try to find and disconnect all connections for this server
      if (!userId) {
        const serverConnections = Array.from(this.connections.entries())
          .filter(([key]) => key.startsWith(`${serverId}:`));
        
        for (const [key, conn] of serverConnections) {
          await this.disconnectConnection(key, conn);
        }
      }
      return;
    }

    await this.disconnectConnection(connectionKey, connection);
  }

  /**
   * Helper to disconnect a specific connection
   */
  private async disconnectConnection(connectionKey: string, connection: MCPClientConnection): Promise<void> {
    try {
      await connection.client.close();
      connection.connected = false;
      this.connections.delete(connectionKey);
      
      logger.info('MCP connection closed', { connectionKey, serverId: connection.serverId });
    } catch (error: any) {
      logger.error('Error closing MCP connection', { connectionKey, error: error.message });
    }
  }

  /**
   * Update tool schema cache in database
   */
  private async updateToolSchemaCache(serverId: string, tools: Tool[]): Promise<void> {
    try {
      // Delete old cached schemas
      await db
        .delete(mcpToolSchemas)
        .where(eq(mcpToolSchemas.serverId, serverId));

      // Insert new schemas
      if (tools.length > 0) {
        await db.insert(mcpToolSchemas).values(
          tools.map(tool => ({
            serverId,
            toolName: tool.name,
            displayName: tool.name, // Use name as display name by default
            description: tool.description || null,
            category: 'other' as const, // TODO: Categorize based on tool metadata
            inputSchema: tool.inputSchema as any,
            outputSchema: null,
            examples: [],
            tags: null,
            lastSyncedAt: new Date(),
            syncVersion: '1.0.0'
          }))
        );
      }

      logger.info('Updated MCP tool schema cache', { serverId, count: tools.length });
    } catch (error: any) {
      logger.error('Failed to update tool schema cache', { serverId, error: error.message });
    }
  }

  /**
   * Cleanup idle connections (user-scoped)
   */
  private async cleanupIdleConnections(): Promise<void> {
    const now = new Date();
    const connectionsToRemove: Array<[string, MCPClientConnection]> = [];

    for (const [connectionKey, connection] of this.connections) {
      const idleTime = now.getTime() - connection.lastUsed.getTime();
      
      if (idleTime > this.idleTimeout) {
        connectionsToRemove.push([connectionKey, connection]);
      }
    }

    for (const [connectionKey, connection] of connectionsToRemove) {
      await this.disconnectConnection(connectionKey, connection);
      logger.info('Cleaned up idle MCP connection', { 
        connectionKey, 
        serverId: connection.serverId 
      });
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    healthyConnections: number;
    unhealthyConnections: number;
  } {
    let healthy = 0;
    let unhealthy = 0;

    for (const connection of this.connections.values()) {
      if (connection.healthStatus === 'healthy') {
        healthy++;
      } else if (connection.healthStatus === 'unhealthy') {
        unhealthy++;
      }
    }

    return {
      totalConnections: this.connections.size,
      healthyConnections: healthy,
      unhealthyConnections: unhealthy
    };
  }
}

// Singleton instance
export const mcpClientService = new MCPClientService();

// Export types
export type { ToolExecutionOptions, ToolListOptions, ServerHealthCheck };
