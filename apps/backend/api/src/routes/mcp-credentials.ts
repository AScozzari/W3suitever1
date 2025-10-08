import { Router, Request, Response } from 'express';
import { AWSCredentialsService } from '../services/aws-credentials-service';
import { encryptMCPCredentials } from '../services/mcp-credential-encryption';
import { db } from '../core/db';
import { mcpServers, mcpServerCredentials } from '../db/schema/w3suite';
import { eq, and, isNull } from 'drizzle-orm';
import { logger } from '../core/logger';
import { z } from 'zod';

const router = Router();

/**
 * Get all MCP credentials for tenant
 * GET /api/mcp/credentials
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_TENANT_ID',
        message: 'X-Tenant-ID header is required for all API calls',
        details: 'Frontend must send valid tenant UUID in X-Tenant-ID header'
      });
    }

    // Get all MCP servers for this tenant with their credentials status
    const credentials = await db
      .select({
        id: mcpServerCredentials.id,
        serverId: mcpServerCredentials.serverId,
        credentialType: mcpServerCredentials.credentialType,
        status: mcpServerCredentials.revokedAt ? 'expired' as const : 'active' as const,
        createdAt: mcpServerCredentials.createdAt,
        expiresAt: mcpServerCredentials.expiresAt
      })
      .from(mcpServerCredentials)
      .where(and(
        eq(mcpServerCredentials.tenantId, tenantId),
        isNull(mcpServerCredentials.revokedAt) // Only non-revoked credentials
      ));

    // Transform to match frontend expected format
    const formattedCredentials = credentials.map(cred => ({
      id: cred.id,
      provider: cred.credentialType?.split('-')[0] || 'unknown',
      status: cred.status,
      createdAt: cred.createdAt.toISOString(),
      expiresAt: cred.expiresAt?.toISOString()
    }));

    res.json(formattedCredentials);

  } catch (error) {
    logger.error('❌ [API] List MCP credentials failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      success: false,
      error: 'Failed to list credentials',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Store AWS IAM credentials (auto-create server if not exists)
 * POST /api/mcp/credentials/aws
 */
router.post('/aws', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = (req as any).user?.id || req.headers['x-user-id'] as string;

    if (!tenantId || !userId) {
      return res.status(401).json({
        success: false,
        error: 'Missing authentication headers'
      });
    }

    // Find or create AWS MCP server
    let server = await db
      .select()
      .from(mcpServers)
      .where(and(
        eq(mcpServers.name, 'aws-services'),
        eq(mcpServers.tenantId, tenantId)
      ))
      .limit(1);

    let serverId: string;

    if (server.length === 0) {
      // Create new AWS server
      const [newServer] = await db
        .insert(mcpServers)
        .values({
          tenantId,
          name: 'aws-services',
          displayName: 'AWS Services',
          description: 'Amazon Web Services integration (S3, Lambda, SQS, SNS, DynamoDB)',
          serverType: 'aws',
          status: 'pending',
          createdBy: userId
        })
        .returning({ id: mcpServers.id });

      serverId = newServer.id;
    } else {
      serverId = server[0].id;
    }

    // Validate request body
    const schema = z.object({
      accessKeyId: z.string().min(16).max(128),
      secretAccessKey: z.string().min(16).max(128),
      region: z.string().optional().default('us-east-1')
    });

    const validation = schema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: validation.error.errors
      });
    }

    const { accessKeyId, secretAccessKey, region } = validation.data;

    // Store credentials using AWS service
    const result = await AWSCredentialsService.storeCredentials({
      serverId,
      tenantId,
      userId,
      accessKeyId,
      secretAccessKey,
      region
    });

    logger.info('✅ [API] AWS credentials stored (auto-created server)', {
      serverId,
      credentialId: result.credentialId
    });

    res.json(result);

  } catch (error) {
    logger.error('❌ [API] Auto-create AWS server failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      success: false,
      error: 'Failed to setup AWS credentials',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Store AWS IAM credentials
 * POST /api/mcp/credentials/aws/:serverId
 */
router.post('/aws/:serverId', async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = (req as any).user?.id || req.headers['x-user-id'] as string;

    if (!tenantId || !userId) {
      return res.status(401).json({
        success: false,
        error: 'Missing authentication headers'
      });
    }

    // Validate request body
    const schema = z.object({
      accessKeyId: z.string().min(16).max(128),
      secretAccessKey: z.string().min(16).max(128),
      region: z.string().optional().default('us-east-1')
    });

    const validation = schema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: validation.error.errors
      });
    }

    const { accessKeyId, secretAccessKey, region } = validation.data;

    // Verify server exists and is AWS
    const [server] = await db
      .select()
      .from(mcpServers)
      .where(and(
        eq(mcpServers.id, serverId),
        eq(mcpServers.tenantId, tenantId)
      ))
      .limit(1);

    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'MCP server not found'
      });
    }

    if (server.name !== 'aws-services') {
      return res.status(400).json({
        success: false,
        error: 'Server is not AWS Services - wrong credential type'
      });
    }

    // Store credentials
    const result = await AWSCredentialsService.storeCredentials({
      serverId,
      tenantId,
      userId,
      accessKeyId,
      secretAccessKey,
      region
    });

    logger.info('✅ [API] AWS credentials stored', {
      serverId,
      credentialId: result.credentialId
    });

    res.json(result);

  } catch (error) {
    logger.error('❌ [API] Store AWS credentials failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      success: false,
      error: 'Failed to store credentials',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Test AWS credentials
 * GET /api/mcp/credentials/aws/test/:serverId
 */
router.get('/aws/test/:serverId', async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing x-tenant-id header'
      });
    }

    const result = await AWSCredentialsService.testCredentials({
      serverId,
      tenantId
    });

    res.json({
      success: result.valid,
      ...result
    });

  } catch (error) {
    logger.error('❌ [API] Test AWS credentials failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      success: false,
      error: 'Failed to test credentials',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Delete AWS credentials
 * DELETE /api/mcp/credentials/aws/:serverId
 */
router.delete('/aws/:serverId', async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing x-tenant-id header'
      });
    }

    await AWSCredentialsService.deleteCredentials({
      serverId,
      tenantId
    });

    res.json({
      success: true,
      message: 'AWS credentials deleted successfully'
    });

  } catch (error) {
    logger.error('❌ [API] Delete AWS credentials failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      success: false,
      error: 'Failed to delete credentials',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Store Stripe API key (auto-create server if not exists)
 * POST /api/mcp/credentials/stripe
 */
router.post('/stripe', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = (req as any).user?.id || req.headers['x-user-id'] as string;

    if (!tenantId || !userId) {
      return res.status(401).json({
        success: false,
        error: 'Missing authentication headers'
      });
    }

    // Find or create Stripe MCP server
    let server = await db
      .select()
      .from(mcpServers)
      .where(and(
        eq(mcpServers.name, 'stripe'),
        eq(mcpServers.tenantId, tenantId)
      ))
      .limit(1);

    let serverId: string;

    if (server.length === 0) {
      // Create new Stripe server
      const [newServer] = await db
        .insert(mcpServers)
        .values({
          tenantId,
          name: 'stripe',
          displayName: 'Stripe',
          description: 'Stripe payment processing integration',
          serverType: 'stripe',
          status: 'pending',
          createdBy: userId
        })
        .returning({ id: mcpServers.id });

      serverId = newServer.id;
    } else {
      serverId = server[0].id;
    }

    // Validate request body
    const schema = z.object({
      apiKey: z.string().startsWith('sk_').min(20).max(256),
      webhookSecret: z.string().optional()
    });

    const validation = schema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Stripe API key format',
        details: validation.error.errors
      });
    }

    const { apiKey, webhookSecret } = validation.data;

    // Store credentials using encryption service
    const credentials = {
      apiKey,
      webhookSecret: webhookSecret || null,
      credentialType: 'stripe-api-key'
    };

    const { encryptedData, keyId } = await encryptMCPCredentials(
      tenantId,
      credentials
    );

    // Check if credentials exist
    const existingCreds = await db
      .select()
      .from(mcpServerCredentials)
      .where(and(
        eq(mcpServerCredentials.serverId, serverId),
        eq(mcpServerCredentials.tenantId, tenantId)
      ))
      .limit(1);

    let credentialId: string;

    if (existingCreds.length > 0) {
      await db
        .update(mcpServerCredentials)
        .set({
          encryptedCredentials: encryptedData,
          encryptionKeyId: keyId,
          updatedAt: new Date()
        })
        .where(eq(mcpServerCredentials.id, existingCreds[0].id));

      credentialId = existingCreds[0].id;
    } else {
      const [newCred] = await db
        .insert(mcpServerCredentials)
        .values({
          tenantId,
          serverId,
          credentialType: 'api-key',
          encryptedCredentials: encryptedData,
          encryptionKeyId: keyId,
          createdBy: userId
        })
        .returning({ id: mcpServerCredentials.id });

      credentialId = newCred.id;
    }

    // Update server status
    await db
      .update(mcpServers)
      .set({
        status: 'active',
        lastHealthCheck: new Date(),
        updatedAt: new Date()
      })
      .where(eq(mcpServers.id, serverId));

    logger.info('✅ [API] Stripe credentials stored (auto-created server)', {
      serverId,
      credentialId
    });

    res.json({
      success: true,
      message: 'Stripe API key stored successfully',
      credentialId
    });

  } catch (error) {
    logger.error('❌ [API] Auto-create Stripe server failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      success: false,
      error: 'Failed to store credentials',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Store Stripe API key
 * POST /api/mcp/credentials/stripe/:serverId
 */
router.post('/stripe/:serverId', async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = (req as any).user?.id || req.headers['x-user-id'] as string;

    if (!tenantId || !userId) {
      return res.status(401).json({
        success: false,
        error: 'Missing authentication headers'
      });
    }

    // Validate request body
    const schema = z.object({
      apiKey: z.string().startsWith('sk_').min(20).max(256),
      webhookSecret: z.string().optional()
    });

    const validation = schema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Stripe API key format',
        details: validation.error.errors
      });
    }

    const { apiKey, webhookSecret } = validation.data;

    // Verify server exists and is Stripe
    const [server] = await db
      .select()
      .from(mcpServers)
      .where(and(
        eq(mcpServers.id, serverId),
        eq(mcpServers.tenantId, tenantId)
      ))
      .limit(1);

    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'MCP server not found'
      });
    }

    if (server.name !== 'stripe') {
      return res.status(400).json({
        success: false,
        error: 'Server is not Stripe - wrong credential type'
      });
    }

    // Store credentials using encryption service
    const credentials = {
      apiKey,
      webhookSecret: webhookSecret || null,
      credentialType: 'stripe-api-key'
    };

    const { encryptedData, keyId } = await encryptMCPCredentials(
      tenantId,
      credentials
    );

    // Check if credentials exist
    const existingCreds = await db
      .select()
      .from(mcpServerCredentials)
      .where(and(
        eq(mcpServerCredentials.serverId, serverId),
        eq(mcpServerCredentials.tenantId, tenantId)
      ))
      .limit(1);

    let credentialId: string;

    if (existingCreds.length > 0) {
      await db
        .update(mcpServerCredentials)
        .set({
          encryptedCredentials: encryptedData,
          encryptionKeyId: keyId,
          updatedAt: new Date()
        })
        .where(eq(mcpServerCredentials.id, existingCreds[0].id));

      credentialId = existingCreds[0].id;
    } else {
      const [newCred] = await db
        .insert(mcpServerCredentials)
        .values({
          tenantId,
          serverId,
          credentialType: 'api-key',
          encryptedCredentials: encryptedData,
          encryptionKeyId: keyId,
          createdBy: userId
        })
        .returning({ id: mcpServerCredentials.id });

      credentialId = newCred.id;
    }

    // Update server status
    await db
      .update(mcpServers)
      .set({
        status: 'active',
        lastHealthCheck: new Date(),
        updatedAt: new Date()
      })
      .where(eq(mcpServers.id, serverId));

    logger.info('✅ [API] Stripe credentials stored', {
      serverId,
      credentialId
    });

    res.json({
      success: true,
      message: 'Stripe API key stored successfully',
      credentialId
    });

  } catch (error) {
    logger.error('❌ [API] Store Stripe credentials failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      success: false,
      error: 'Failed to store credentials',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Store GTM Service Account credentials (auto-create server if not exists)
 * POST /api/mcp/credentials/gtm
 */
router.post('/gtm', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = (req as any).user?.id || req.headers['x-user-id'] as string;

    if (!tenantId || !userId) {
      return res.status(401).json({
        success: false,
        error: 'Missing authentication headers'
      });
    }

    // Find or create GTM MCP server
    let server = await db
      .select()
      .from(mcpServers)
      .where(and(
        eq(mcpServers.name, 'gtm-analytics'),
        eq(mcpServers.tenantId, tenantId)
      ))
      .limit(1);

    let serverId: string;

    if (server.length === 0) {
      // Create new GTM server
      const [newServer] = await db
        .insert(mcpServers)
        .values({
          tenantId,
          name: 'gtm-analytics',
          displayName: 'GTM/Analytics',
          description: 'Google Tag Manager and Analytics integration',
          serverType: 'gtm',
          status: 'pending',
          createdBy: userId
        })
        .returning({ id: mcpServers.id });

      serverId = newServer.id;
    } else {
      serverId = server[0].id;
    }

    // Validate request body
    const schema = z.object({
      serviceAccountKey: z.object({
        type: z.literal('service_account'),
        project_id: z.string(),
        private_key_id: z.string(),
        private_key: z.string(),
        client_email: z.string().email(),
        client_id: z.string(),
        auth_uri: z.string().url(),
        token_uri: z.string().url(),
        auth_provider_x509_cert_url: z.string().url(),
        client_x509_cert_url: z.string().url()
      })
    });

    const validation = schema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid GTM service account key format',
        details: validation.error.errors
      });
    }

    const { serviceAccountKey } = validation.data;

    // Store credentials using encryption service
    const credentials = {
      serviceAccountKey,
      credentialType: 'gtm-service-account'
    };

    const { encryptedData, keyId } = await encryptMCPCredentials(
      tenantId,
      credentials
    );

    // Check if credentials exist
    const existingCreds = await db
      .select()
      .from(mcpServerCredentials)
      .where(and(
        eq(mcpServerCredentials.serverId, serverId),
        eq(mcpServerCredentials.tenantId, tenantId)
      ))
      .limit(1);

    let credentialId: string;

    if (existingCreds.length > 0) {
      await db
        .update(mcpServerCredentials)
        .set({
          encryptedCredentials: encryptedData,
          encryptionKeyId: keyId,
          updatedAt: new Date()
        })
        .where(eq(mcpServerCredentials.id, existingCreds[0].id));

      credentialId = existingCreds[0].id;
    } else {
      const [newCred] = await db
        .insert(mcpServerCredentials)
        .values({
          tenantId,
          serverId,
          credentialType: 'api-key',
          encryptedCredentials: encryptedData,
          encryptionKeyId: keyId,
          createdBy: userId
        })
        .returning({ id: mcpServerCredentials.id });

      credentialId = newCred.id;
    }

    // Update server status
    await db
      .update(mcpServers)
      .set({
        status: 'active',
        lastHealthCheck: new Date(),
        updatedAt: new Date()
      })
      .where(eq(mcpServers.id, serverId));

    logger.info('✅ [API] GTM credentials stored (auto-created server)', {
      serverId,
      credentialId,
      projectId: serviceAccountKey.project_id
    });

    res.json({
      success: true,
      message: 'GTM service account credentials stored successfully',
      credentialId
    });

  } catch (error) {
    logger.error('❌ [API] Auto-create GTM server failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      success: false,
      error: 'Failed to store credentials',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Store GTM Service Account credentials
 * POST /api/mcp/credentials/gtm/:serverId
 */
router.post('/gtm/:serverId', async (req: Request, res: Response) => {
  try {
    const { serverId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = (req as any).user?.id || req.headers['x-user-id'] as string;

    if (!tenantId || !userId) {
      return res.status(401).json({
        success: false,
        error: 'Missing authentication headers'
      });
    }

    // Validate request body
    const schema = z.object({
      serviceAccountKey: z.object({
        type: z.literal('service_account'),
        project_id: z.string(),
        private_key_id: z.string(),
        private_key: z.string(),
        client_email: z.string().email(),
        client_id: z.string(),
        auth_uri: z.string().url(),
        token_uri: z.string().url(),
        auth_provider_x509_cert_url: z.string().url(),
        client_x509_cert_url: z.string().url()
      })
    });

    const validation = schema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid GTM service account key format',
        details: validation.error.errors
      });
    }

    const { serviceAccountKey } = validation.data;

    // Verify server exists and is GTM
    const [server] = await db
      .select()
      .from(mcpServers)
      .where(and(
        eq(mcpServers.id, serverId),
        eq(mcpServers.tenantId, tenantId)
      ))
      .limit(1);

    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'MCP server not found'
      });
    }

    if (server.name !== 'gtm-analytics') {
      return res.status(400).json({
        success: false,
        error: 'Server is not GTM/Analytics - wrong credential type'
      });
    }

    // Store credentials using encryption service
    const credentials = {
      serviceAccountKey,
      credentialType: 'gtm-service-account'
    };

    const { encryptedData, keyId } = await encryptMCPCredentials(
      tenantId,
      credentials
    );

    // Check if credentials exist
    const existingCreds = await db
      .select()
      .from(mcpServerCredentials)
      .where(and(
        eq(mcpServerCredentials.serverId, serverId),
        eq(mcpServerCredentials.tenantId, tenantId)
      ))
      .limit(1);

    let credentialId: string;

    if (existingCreds.length > 0) {
      await db
        .update(mcpServerCredentials)
        .set({
          encryptedCredentials: encryptedData,
          encryptionKeyId: keyId,
          updatedAt: new Date()
        })
        .where(eq(mcpServerCredentials.id, existingCreds[0].id));

      credentialId = existingCreds[0].id;
    } else {
      const [newCred] = await db
        .insert(mcpServerCredentials)
        .values({
          tenantId,
          serverId,
          credentialType: 'api-key',
          encryptedCredentials: encryptedData,
          encryptionKeyId: keyId,
          createdBy: userId
        })
        .returning({ id: mcpServerCredentials.id });

      credentialId = newCred.id;
    }

    // Update server status
    await db
      .update(mcpServers)
      .set({
        status: 'active',
        lastHealthCheck: new Date(),
        updatedAt: new Date()
      })
      .where(eq(mcpServers.id, serverId));

    logger.info('✅ [API] GTM credentials stored', {
      serverId,
      credentialId,
      projectId: serviceAccountKey.project_id
    });

    res.json({
      success: true,
      message: 'GTM service account credentials stored successfully',
      credentialId
    });

  } catch (error) {
    logger.error('❌ [API] Store GTM credentials failed', {
      error: error instanceof Error ? error.message : String(error)
    });

    res.status(500).json({
      success: false,
      error: 'Failed to store credentials',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
