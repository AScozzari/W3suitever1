/**
 * MCP (Model Context Protocol) API Routes
 * 
 * Endpoints for managing MCP servers, credentials, tools, and execution
 * Provides integration with external services via MCP protocol
 * 
 * @author W3 Suite Team
 * @date 2025-10-08
 */

import express, { Request, Response } from 'express';
import { mcpClientService } from '../services/mcp-client-service';
import { mcpInstallationService } from '../services/mcp-installation.service';
import { mcpDiscoveryService } from '../services/mcp-discovery.service';
import { MCPMarketplaceRegistry } from '../services/mcp-marketplace-registry';
import { tenantMiddleware, rbacMiddleware, requirePermission } from '../middleware/tenant';
import { handleApiError, validateRequestBody, parseUUIDParam } from '../core/error-utils';
import { z } from 'zod';
import { db } from '../core/db';
import {
  mcpServers,
  mcpServerCredentials,
  mcpToolSchemas,
  insertMCPServerSchema,
  insertMCPServerCredentialSchema,
  InsertMCPServer,
  InsertMCPServerCredential
} from '../db/schema/w3suite';
import { eq, and, desc, or, sql } from 'drizzle-orm';
import { encryptMCPCredentials } from '../services/mcp-credential-encryption.js';

const router = express.Router();

// Apply tenant and RBAC middleware to all MCP routes
router.use(tenantMiddleware);
router.use(rbacMiddleware);

// ==================== HELPER FUNCTIONS ====================

/**
 * Normalize server name to base provider for frontend routing
 * Examples:
 * - "google-workspace-oauth-config" → "google"
 * - "meta-instagram" → "meta"
 * - "microsoft-365-oauth-config" → "microsoft"
 */
function normalizeProviderFromServerName(serverName: string | null): string {
  if (!serverName) return 'unknown';
  
  const normalized = serverName.toLowerCase();
  
  if (normalized.startsWith('google')) return 'google';
  if (normalized.startsWith('meta')) return 'meta';
  if (normalized.startsWith('microsoft')) return 'microsoft';
  if (normalized.startsWith('aws')) return 'aws';
  if (normalized.startsWith('stripe')) return 'stripe';
  if (normalized.startsWith('gtm')) return 'gtm';
  
  return 'unknown';
}

// ==================== VALIDATION SCHEMAS ====================

const createMCPServerSchema = insertMCPServerSchema
  .omit({ tenantId: true, createdBy: true })
  .extend({
    // Ensure config is an object
    config: z.record(z.any()).default({})
  });

const updateMCPServerSchema = createMCPServerSchema.partial();

const createMCPCredentialSchema = z.object({
  serverId: z.string().uuid(),
  credentialType: z.enum(['oauth2', 'api_key', 'bearer_token', 'basic_auth']),
  credentials: z.record(z.any()), // Will be encrypted
  tokenType: z.string().optional(),
  scope: z.string().optional(),
  expiresAt: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined)
});

const executeMCPToolSchema = z.object({
  serverId: z.string().uuid(),
  toolName: z.string().min(1),
  arguments: z.record(z.any()).default({})
});

const listToolsQuerySchema = z.object({
  forceRefresh: z.enum(['true', 'false']).optional().transform(val => val === 'true')
});

// ==================== MCP SERVER MANAGEMENT ROUTES ====================

/**
 * GET /api/mcp/servers
 * List all MCP servers for tenant
 */
router.get('/servers', requirePermission('mcp.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    
    const servers = await db
      .select()
      .from(mcpServers)
      .where(eq(mcpServers.tenantId, tenantId))
      .orderBy(desc(mcpServers.createdAt));
    
    res.json(servers);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch MCP servers');
  }
});

/**
 * GET /api/mcp/servers/:id
 * Get single MCP server details
 */
router.get('/servers/:id', requirePermission('mcp.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const serverId = parseUUIDParam(req.params.id);
    
    const [server] = await db
      .select()
      .from(mcpServers)
      .where(and(
        eq(mcpServers.id, serverId),
        eq(mcpServers.tenantId, tenantId)
      ))
      .limit(1);
    
    if (!server) {
      return res.status(404).json({ error: 'MCP server not found' });
    }
    
    res.json(server);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch MCP server');
  }
});

/**
 * POST /api/mcp/servers
 * Create new MCP server
 */
router.post('/servers', requirePermission('mcp.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    
    const data = validateRequestBody(createMCPServerSchema, req.body, res);
    
    if (!data) {
      return; // validateRequestBody already sent error response
    }
    
    const [newServer] = await db
      .insert(mcpServers)
      .values({
        ...data,
        tenantId,
        createdBy: userId
      })
      .returning();
    
    res.status(201).json(newServer);
  } catch (error) {
    handleApiError(error, res, 'Failed to create MCP server');
  }
});

/**
 * PUT /api/mcp/servers/:id
 * Update MCP server configuration
 */
router.put('/servers/:id', requirePermission('mcp.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const serverId = parseUUIDParam(req.params.id);
    
    const data = validateRequestBody(updateMCPServerSchema, req.body);
    
    const [updatedServer] = await db
      .update(mcpServers)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(and(
        eq(mcpServers.id, serverId),
        eq(mcpServers.tenantId, tenantId)
      ))
      .returning();
    
    if (!updatedServer) {
      return res.status(404).json({ error: 'MCP server not found' });
    }
    
    res.json(updatedServer);
  } catch (error) {
    handleApiError(error, res, 'Failed to update MCP server');
  }
});

/**
 * DELETE /api/mcp/servers/:id
 * Delete MCP server (soft delete via archivedAt)
 */
router.delete('/servers/:id', requirePermission('mcp.delete'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const serverId = parseUUIDParam(req.params.id);
    
    const [archivedServer] = await db
      .update(mcpServers)
      .set({
        archivedAt: new Date(),
        status: 'disabled'
      })
      .where(and(
        eq(mcpServers.id, serverId),
        eq(mcpServers.tenantId, tenantId)
      ))
      .returning();
    
    if (!archivedServer) {
      return res.status(404).json({ error: 'MCP server not found' });
    }
    
    res.json({ message: 'MCP server archived successfully' });
  } catch (error) {
    handleApiError(error, res, 'Failed to delete MCP server');
  }
});

// ==================== MCP SERVER CREDENTIALS ROUTES ====================

/**
 * GET /api/mcp/my-credentials
 * Get current user's OAuth credentials across all MCP servers
 * Used by frontend to show which providers the user has connected
 */
router.get('/my-credentials', requirePermission('mcp.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    
    // Fetch all OAuth credentials for this user
    const credentials = await db
      .select({
        id: mcpServerCredentials.id,
        serverId: mcpServerCredentials.serverId,
        serverName: mcpServers.name,
        oauthProvider: mcpServerCredentials.oauthProvider,
        credentialType: mcpServerCredentials.credentialType,
        tokenType: mcpServerCredentials.tokenType,
        scope: mcpServerCredentials.scope,
        expiresAt: mcpServerCredentials.expiresAt,
        accountEmail: mcpServerCredentials.accountEmail,
        accountName: mcpServerCredentials.accountName,
        revokedAt: mcpServerCredentials.revokedAt,
        createdAt: mcpServerCredentials.createdAt,
        updatedAt: mcpServerCredentials.updatedAt
      })
      .from(mcpServerCredentials)
      .innerJoin(mcpServers, eq(mcpServers.id, mcpServerCredentials.serverId))
      .where(and(
        eq(mcpServerCredentials.tenantId, tenantId),
        eq(mcpServerCredentials.userId, userId)
        // Include both OAuth user credentials AND OAuth config credentials (google-oauth-config, meta-oauth-config, etc.)
      ))
      .orderBy(desc(mcpServerCredentials.createdAt));
    
    // Format credentials for frontend
    const formattedCredentials = credentials.map(cred => ({
      id: cred.id,
      serverId: cred.serverId,
      serverName: cred.serverName,
      provider: normalizeProviderFromServerName(cred.serverName), // Normalize provider from serverName
      credentialType: cred.credentialType,
      status: cred.revokedAt 
        ? 'revoked' 
        : (cred.expiresAt && new Date(cred.expiresAt) < new Date()) 
        ? 'expired' 
        : 'active',
      scope: cred.scope,
      expiresAt: cred.expiresAt,
      accountEmail: cred.accountEmail,
      accountName: cred.accountName,
      connectedAt: cred.createdAt,
      lastUpdated: cred.updatedAt
    }));
    
    res.json(formattedCredentials);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch user credentials');
  }
});

/**
 * POST /api/mcp/servers/:id/credentials
 * Configure credentials for MCP server
 */
router.post('/servers/:id/credentials', requirePermission('mcp.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const serverId = parseUUIDParam(req.params.id);
    const userId = req.user!.id;
    
    const data = validateRequestBody(createMCPCredentialSchema, req.body);
    
    // Verify server exists and belongs to tenant
    const [server] = await db
      .select()
      .from(mcpServers)
      .where(and(
        eq(mcpServers.id, serverId),
        eq(mcpServers.tenantId, tenantId)
      ))
      .limit(1);
    
    if (!server) {
      return res.status(404).json({ error: 'MCP server not found' });
    }
    
    // Encrypt credentials using enterprise encryption service
    const encryptedCreds = await encryptMCPCredentials(data.credentials, tenantId);
    
    // Check if credentials already exist (upsert pattern)
    const [existingCred] = await db
      .select()
      .from(mcpServerCredentials)
      .where(and(
        eq(mcpServerCredentials.serverId, serverId),
        eq(mcpServerCredentials.tenantId, tenantId)
      ))
      .limit(1);
    
    if (existingCred) {
      // Update existing credentials
      const [updatedCred] = await db
        .update(mcpServerCredentials)
        .set({
          credentialType: data.credentialType,
          encryptedCredentials: encryptedCreds,
          tokenType: data.tokenType || null,
          scope: data.scope || null,
          expiresAt: data.expiresAt || null,
          updatedAt: new Date(),
          revokedAt: null // Un-revoke if previously revoked
        })
        .where(eq(mcpServerCredentials.id, existingCred.id))
        .returning();
      
      return res.json({ 
        message: 'Credentials updated successfully',
        id: updatedCred.id
      });
    } else {
      // Insert new credentials
      const [newCred] = await db
        .insert(mcpServerCredentials)
        .values({
          tenantId,
          serverId,
          credentialType: data.credentialType,
          encryptedCredentials: encryptedCreds,
          tokenType: data.tokenType || null,
          scope: data.scope || null,
          expiresAt: data.expiresAt || null,
          createdBy: userId
        })
        .returning();
      
      res.status(201).json({ 
        message: 'Credentials created successfully',
        id: newCred.id
      });
    }
  } catch (error) {
    handleApiError(error, res, 'Failed to configure MCP server credentials');
  }
});

/**
 * DELETE /api/mcp/servers/:id/credentials
 * Revoke credentials for MCP server
 */
router.delete('/servers/:id/credentials', requirePermission('mcp.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const serverId = parseUUIDParam(req.params.id);
    
    const [revokedCred] = await db
      .update(mcpServerCredentials)
      .set({
        revokedAt: new Date()
      })
      .where(and(
        eq(mcpServerCredentials.serverId, serverId),
        eq(mcpServerCredentials.tenantId, tenantId)
      ))
      .returning();
    
    if (!revokedCred) {
      return res.status(404).json({ error: 'Credentials not found' });
    }
    
    res.json({ message: 'Credentials revoked successfully' });
  } catch (error) {
    handleApiError(error, res, 'Failed to revoke credentials');
  }
});

// ==================== MCP TOOLS ROUTES ====================

/**
 * GET /api/mcp/servers/:id/tools
 * List available tools from MCP server
 */
router.get('/servers/:id/tools', requirePermission('mcp.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id; // REQUIRED for multi-user OAuth
    const serverId = parseUUIDParam(req.params.id);
    const { forceRefresh } = listToolsQuerySchema.parse(req.query);
    
    const tools = await mcpClientService.listTools({
      serverId,
      tenantId,
      userId, // Multi-user OAuth support
      forceRefresh
    });
    
    res.json(tools);
  } catch (error) {
    handleApiError(error, res, 'Failed to list MCP tools');
  }
});

/**
 * GET /api/mcp/servers/:id/tools/:toolName/schema
 * Get tool input/output schema
 */
router.get('/servers/:id/tools/:toolName/schema', requirePermission('mcp.read'), async (req: Request, res: Response) => {
  try {
    const serverId = parseUUIDParam(req.params.id);
    const toolName = req.params.toolName;
    
    const [toolSchema] = await db
      .select()
      .from(mcpToolSchemas)
      .where(and(
        eq(mcpToolSchemas.serverId, serverId),
        eq(mcpToolSchemas.toolName, toolName)
      ))
      .limit(1);
    
    if (!toolSchema) {
      return res.status(404).json({ error: 'Tool schema not found' });
    }
    
    res.json({
      name: toolSchema.toolName,
      displayName: toolSchema.displayName,
      description: toolSchema.description,
      category: toolSchema.category,
      inputSchema: toolSchema.inputSchema,
      outputSchema: toolSchema.outputSchema,
      examples: toolSchema.examples,
      tags: toolSchema.tags
    });
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch tool schema');
  }
});

// ==================== MCP EXECUTION ROUTES ====================

/**
 * POST /api/mcp/execute
 * Execute MCP tool
 */
router.post('/execute', requirePermission('mcp.execute'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id; // REQUIRED for multi-user OAuth
    
    const data = validateRequestBody(executeMCPToolSchema, req.body);
    
    const result = await mcpClientService.executeTool({
      serverId: data.serverId,
      toolName: data.toolName,
      arguments: data.arguments,
      tenantId,
      userId // Multi-user OAuth support
    });
    
    res.json(result);
  } catch (error) {
    handleApiError(error, res, 'Failed to execute MCP tool');
  }
});

// ==================== MCP HEALTH CHECK ROUTES ====================

/**
 * GET /api/mcp/servers/:id/health
 * Health check for MCP server
 */
router.get('/servers/:id/health', requirePermission('mcp.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id; // REQUIRED for multi-user OAuth
    const serverId = parseUUIDParam(req.params.id);
    
    const healthStatus = await mcpClientService.healthCheck(serverId, tenantId, userId);
    
    res.json(healthStatus);
  } catch (error) {
    handleApiError(error, res, 'Failed to check MCP server health');
  }
});

/**
 * GET /api/mcp/stats
 * Get MCP client service statistics
 */
router.get('/stats', requirePermission('mcp.read'), async (req: Request, res: Response) => {
  try {
    const stats = mcpClientService.getStats();
    res.json(stats);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch MCP stats');
  }
});

// ==================== MCP MARKETPLACE ROUTES ====================

/**
 * GET /api/mcp/marketplace
 * Get all available MCP server templates from marketplace
 */
router.get('/marketplace', requirePermission('mcp.read'), async (req: Request, res: Response) => {
  try {
    const { category, language, authType, search } = req.query;
    
    let templates = MCPMarketplaceRegistry.getAllTemplates();
    
    // Apply filters
    if (category) {
      templates = MCPMarketplaceRegistry.getTemplatesByCategory(category as string);
    }
    if (language) {
      templates = MCPMarketplaceRegistry.getTemplatesByLanguage(language as 'typescript' | 'python');
    }
    if (authType) {
      templates = MCPMarketplaceRegistry.getTemplatesByAuthType(authType as string);
    }
    if (search) {
      templates = MCPMarketplaceRegistry.searchTemplates(search as string);
    }
    
    res.json(templates);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch marketplace templates');
  }
});

/**
 * GET /api/mcp/marketplace/:id
 * Get specific marketplace template details
 */
router.get('/marketplace/:id', requirePermission('mcp.read'), async (req: Request, res: Response) => {
  try {
    const templateId = req.params.id;
    const template = MCPMarketplaceRegistry.getTemplate(templateId);
    
    if (!template) {
      return res.status(404).json({ error: 'Marketplace template not found' });
    }
    
    res.json(template);
  } catch (error) {
    handleApiError(error, res, 'Failed to fetch marketplace template');
  }
});

// ==================== MCP INSTALLATION ROUTES ====================

const installMCPServerSchema = z.object({
  templateId: z.string().min(1),
  customName: z.string().optional(), // Optional custom name for the server
  version: z.string().optional()
});

/**
 * POST /api/mcp/install
 * Install MCP server from marketplace template
 */
router.post('/install', requirePermission('mcp.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    
    const data = validateRequestBody(installMCPServerSchema, req.body);
    
    // Get template from marketplace
    const template = MCPMarketplaceRegistry.getTemplate(data.templateId);
    if (!template) {
      return res.status(404).json({ error: 'Marketplace template not found' });
    }
    
    // Install package
    const installResult = await mcpInstallationService.installFromPackage({
      packageName: template.packageName,
      packageManager: template.packageManager,
      version: data.version
    });
    
    if (!installResult.success) {
      return res.status(500).json({ 
        error: 'Installation failed',
        details: installResult.error
      });
    }
    
    // Create server record in database
    const [newServer] = await db
      .insert(mcpServers)
      .values({
        tenantId,
        name: data.customName || template.name,
        displayName: template.displayName,
        description: template.description,
        transport: template.transport,
        category: template.category,
        iconUrl: template.iconUrl,
        sourceType: 'npm_package',
        installMethod: installResult.installMethod,
        installLocation: installResult.installLocation,
        status: 'configuring', // Needs credentials configuration
        createdBy: userId
      })
      .returning();
    
    // Trigger discovery in background (don't await)
    mcpDiscoveryService.discoverTools(newServer.id, tenantId, userId)
      .catch(err => console.error('Background discovery failed:', err));
    
    res.status(201).json({
      message: 'MCP server installed successfully',
      server: newServer,
      template
    });
  } catch (error) {
    handleApiError(error, res, 'Failed to install MCP server');
  }
});

/**
 * POST /api/mcp/servers/:id/discover
 * Force discovery of tools from MCP server
 */
router.post('/servers/:id/discover', requirePermission('mcp.write'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    const serverId = parseUUIDParam(req.params.id);
    
    const tools = await mcpDiscoveryService.discoverTools(serverId, tenantId, userId);
    
    res.json({
      message: 'Tool discovery completed',
      toolCount: tools.length,
      tools
    });
  } catch (error) {
    handleApiError(error, res, 'Failed to discover MCP tools');
  }
});

/**
 * POST /api/mcp/servers/:id/test
 * Test connection to MCP server
 */
router.post('/servers/:id/test', requirePermission('mcp.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const userId = req.user!.id;
    const serverId = parseUUIDParam(req.params.id);
    
    // Try to list tools as a health check
    const tools = await mcpClientService.listTools({
      serverId,
      tenantId,
      userId
    });
    
    // Update server status to 'active' if test succeeds
    await db
      .update(mcpServers)
      .set({
        status: 'active',
        lastHealthCheck: new Date(),
        errorCount: 0,
        lastError: null
      })
      .where(and(
        eq(mcpServers.id, serverId),
        eq(mcpServers.tenantId, tenantId)
      ));
    
    res.json({
      success: true,
      message: 'Connection test successful',
      toolCount: tools.length
    });
  } catch (error) {
    // Update server status to 'error' if test fails
    try {
      await db
        .update(mcpServers)
        .set({
          status: 'error',
          lastHealthCheck: new Date(),
          errorCount: sql`${mcpServers.errorCount} + 1`,
          lastError: error instanceof Error ? error.message : String(error)
        })
        .where(eq(mcpServers.id, req.params.id));
    } catch (updateErr) {
      console.error('Failed to update error state:', updateErr);
    }
    
    handleApiError(error, res, 'Connection test failed');
  }
});

// ==================== MCP TOOL DISCOVERY ROUTES ====================

/**
 * GET /api/mcp/by-tool/:toolName
 * Find all MCP servers that support a specific tool
 * Used by workflow nodes to populate server dropdown
 */
router.get('/by-tool/:toolName', requirePermission('mcp.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenant!.id;
    const toolName = req.params.toolName;
    
    const servers = await mcpDiscoveryService.findServersByTool(toolName, tenantId);
    
    res.json(servers);
  } catch (error) {
    handleApiError(error, res, 'Failed to find servers by tool');
  }
});

export default router;
