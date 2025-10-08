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
import { eq, and, desc } from 'drizzle-orm';
import { encryptMCPCredentials } from '../services/mcp-credential-encryption.js';

const router = express.Router();

// Apply tenant and RBAC middleware to all MCP routes
router.use(tenantMiddleware);
router.use(rbacMiddleware);

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
    
    const data = validateRequestBody(createMCPServerSchema, req.body);
    
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

export default router;
