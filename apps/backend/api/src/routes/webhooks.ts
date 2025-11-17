import { Router, Request, Response } from 'express';
import { WebhookService } from '../services/webhook-service.js';
import { logger } from '../core/logger.js';
import { z } from 'zod';
import { rbacMiddleware, requirePermission } from '../middleware/tenant.js';
import crypto from 'crypto';
import { db } from '../core/db.js';
import { eq } from 'drizzle-orm';
import { tenants } from '../db/schema/w3suite.js';

const router = Router();

/**
 * 🚀 Brand Deploy Webhook Endpoint
 * POST /api/webhooks/brand-deploy/:tenantId
 * 
 * Receives deployment pushes from Brand Interface HQ
 * Validates HMAC signature, merges WMS data (full replace)
 * 
 * Headers:
 * - x-webhook-signature: HMAC-SHA256 signature
 * - x-webhook-timestamp: Unix timestamp for replay protection
 * 
 * Body: {
 *   commitId: string;
 *   tool: 'wms' | 'crm' | 'pos' | 'analytics';
 *   resourceType: string;
 *   version: string;
 *   data: any; // JSON payload
 * }
 */
const brandDeploySchema = z.object({
  commitId: z.string().min(1),
  tool: z.enum(['wms', 'crm', 'pos', 'analytics']),
  resourceType: z.string().min(1),
  version: z.string().min(1),
  data: z.any()
});

router.post('/brand-deploy/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    
    // 🔒 Verify HMAC signature
    const signature = req.headers['x-webhook-signature'] as string;
    const timestamp = req.headers['x-webhook-timestamp'] as string;
    
    if (!signature || !timestamp) {
      logger.error('🚀 Brand deploy webhook: Missing signature or timestamp', { tenantId });
      return res.status(401).json({ 
        error: 'Missing signature or timestamp',
        received: false
      });
    }
    
    // Check timestamp to prevent replay attacks (5 min tolerance)
    const requestTimestamp = parseInt(timestamp, 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTimestamp - requestTimestamp) > 300) {
      logger.error('🚀 Brand deploy webhook: Timestamp outside tolerance', {
        tenantId,
        requestTimestamp,
        currentTimestamp,
        diff: currentTimestamp - requestTimestamp
      });
      return res.status(401).json({ 
        error: 'Timestamp outside tolerance window',
        received: false
      });
    }
    
    // Get WEBHOOK_SECRET from environment or database
    const webhookSecret = process.env.BRAND_WEBHOOK_SECRET || 'dev-webhook-secret-change-in-production';
    
    // Use raw body for signature verification (preserves exact payload)
    // Express middleware should have attached rawBody to req
    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      logger.error('🚀 Brand deploy webhook: Raw body not available', {
        tenantId,
        note: 'Ensure raw-body middleware is applied before webhook routes'
      });
      return res.status(500).json({ 
        error: 'Server configuration error: raw body not available',
        received: false
      });
    }
    
    const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    const payload = `${timestamp}.${bodyString}`;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      logger.error('🚀 Brand deploy webhook: Invalid signature', {
        tenantId,
        received: signature.substring(0, 10) + '...',
        expected: expectedSignature.substring(0, 10) + '...',
        payloadLength: bodyString.length
      });
      return res.status(401).json({ 
        error: 'Invalid signature',
        received: false
      });
    }
    
    logger.info('✅ Webhook signature verified successfully', { tenantId });
    
    // Validate request body (already parsed by express.json())
    const validatedData = brandDeploySchema.parse(req.body);
    
    logger.info('🚀 Brand deploy webhook received', {
      tenantId,
      commitId: validatedData.commitId,
      tool: validatedData.tool,
      resourceType: validatedData.resourceType,
      version: validatedData.version
    });
    
    // ==================== MERGE LOGIC ====================
    let mergeResult;
    
    switch (validatedData.tool) {
      case 'wms':
        // WMS = Full Replace (per replit.md requirements)
        mergeResult = await mergeWMSData(tenantId, validatedData);
        break;
        
      case 'crm':
        // CRM = Merge/Update logic (future implementation)
        mergeResult = { 
          success: true, 
          message: 'CRM merge not yet implemented',
          replaced: 0
        };
        break;
        
      case 'pos':
        // POS = Merge logic (future implementation)
        mergeResult = { 
          success: true, 
          message: 'POS merge not yet implemented',
          replaced: 0
        };
        break;
        
      case 'analytics':
        // Analytics = Config update (future implementation)
        mergeResult = { 
          success: true, 
          message: 'Analytics merge not yet implemented',
          replaced: 0
        };
        break;
        
      default:
        return res.status(400).json({ 
          error: `Unknown tool: ${validatedData.tool}`,
          received: false
        });
    }
    
    logger.info('🚀 Brand deploy webhook processed successfully', {
      tenantId,
      commitId: validatedData.commitId,
      tool: validatedData.tool,
      mergeResult
    });
    
    return res.status(200).json({
      received: true,
      processed: true,
      commitId: validatedData.commitId,
      tool: validatedData.tool,
      result: mergeResult
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('🚀 Brand deploy webhook: Validation error', {
        error: error.errors,
        tenantId: req.params.tenantId
      });
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
        received: false
      });
    }
    
    logger.error('🚀 Brand deploy webhook error', {
      error: error instanceof Error ? error.message : String(error),
      tenantId: req.params.tenantId
    });
    return res.status(500).json({ 
      error: 'Internal webhook processing error',
      received: false
    });
  }
});

/**
 * 🔄 Merge WMS Data (Full Replace Strategy)
 * Replaces all WMS master data for the tenant with new version from Brand
 * 
 * NOTE: This is a stub implementation for testing. Production implementation would:
 * 1. Start database transaction
 * 2. Delete all brand-origin records for this tenant
 * 3. Insert all records from data payload
 * 4. Update deployment tracking metadata
 * 5. Commit transaction or rollback on error
 */
async function mergeWMSData(tenantId: string, deployment: z.infer<typeof brandDeploySchema>) {
  const { resourceType, data, version, commitId } = deployment;
  
  logger.info('🔄 Starting WMS full replace (STUB MODE)', {
    tenantId,
    resourceType,
    version,
    commitId,
    note: 'Production logic not yet implemented'
  });
  
  // Get tenant info for validation
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) {
    throw new Error(`Tenant ${tenantId} not found`);
  }
  
  let replaced = 0;
  
  switch (resourceType) {
    case 'suppliers':
      // STUB: Count items to simulate processing
      // Production: DELETE FROM suppliers WHERE tenant_id = ? AND origin = 'brand'
      //             INSERT INTO suppliers (...) VALUES (...)
      logger.info('🔄 WMS Suppliers full replace (STUB - no DB changes)', {
        tenantId,
        suppliersCount: Array.isArray(data.suppliers) ? data.suppliers.length : 0,
        action: 'simulated'
      });
      replaced = Array.isArray(data.suppliers) ? data.suppliers.length : 0;
      break;
      
    case 'products':
      // STUB: Count items to simulate processing
      // Production: DELETE FROM products WHERE tenant_id = ? AND origin = 'brand'
      //             INSERT INTO products (...) VALUES (...)
      logger.info('🔄 WMS Products full replace (STUB - no DB changes)', {
        tenantId,
        productsCount: Array.isArray(data.products) ? data.products.length : 0,
        action: 'simulated'
      });
      replaced = Array.isArray(data.products) ? data.products.length : 0;
      break;
      
    case 'price_lists':
      // STUB: Count items to simulate processing
      // Production: DELETE FROM price_lists WHERE tenant_id = ? AND origin = 'brand'
      //             INSERT INTO price_lists (...) VALUES (...)
      logger.info('🔄 WMS Price Lists full replace (STUB - no DB changes)', {
        tenantId,
        priceListsCount: Array.isArray(data.priceLists) ? data.priceLists.length : 0,
        action: 'simulated'
      });
      replaced = Array.isArray(data.priceLists) ? data.priceLists.length : 0;
      break;
      
    default:
      logger.warn('🔄 Unknown WMS resource type', { resourceType, tenantId });
      return {
        success: false,
        message: `Unknown WMS resource type: ${resourceType}`,
        replaced: 0
      };
  }
  
  logger.warn('⚠️  WMS merge completed in STUB mode - no actual database changes made', {
    tenantId,
    resourceType,
    replaced,
    note: 'Implement production logic before deploying to real tenants'
  });
  
  return {
    success: true,
    message: `WMS ${resourceType} full replace simulated (STUB MODE)`,
    replaced,
    version,
    commitId,
    stubMode: true // Flag to indicate this was a stub execution
  };
}

/**
 * 🪝 PUBLIC Webhook Receiver Endpoint
 * POST /api/webhooks/:tenantId/:source
 * 
 * Receives webhooks from external providers (Stripe, Twilio, GitHub, etc.)
 * Validates signature, stores event, queues for async processing
 * 
 * URL Parameters:
 * - tenantId: UUID of tenant receiving the webhook
 * - source: Provider name (stripe, twilio, github, custom)
 * 
 * Headers:
 * - x-webhook-signature: HMAC signature (for generic providers)
 * - stripe-signature: Stripe-specific signature format
 * - x-twilio-signature: Twilio-specific signature
 * - x-hub-signature-256: GitHub signature
 * 
 * Body: Raw JSON payload from provider
 */
router.post('/:tenantId/:source', async (req: Request, res: Response) => {
  try {
    const { tenantId, source } = req.params;
    
    // Parse body from Buffer (express.raw()) to object
    const bodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    const bodyString = bodyBuffer.toString('utf8');
    const parsedBody = JSON.parse(bodyString);

    // Extract event metadata from provider-specific formats
    let eventId: string;
    let eventType: string;
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';

    // Provider-specific event extraction
    switch (source.toLowerCase()) {
      case 'stripe':
        eventId = parsedBody.id || `stripe-${Date.now()}`;
        eventType = parsedBody.type || 'unknown';
        priority = getStripePriority(parsedBody.type);
        break;

      case 'twilio':
        eventId = parsedBody.MessageSid || parsedBody.SmsSid || `twilio-${Date.now()}`;
        eventType = parsedBody.SmsStatus || parsedBody.MessageStatus || 'sms.status';
        priority = 'high'; // SMS delivery is usually time-sensitive
        break;

      case 'github':
        eventId = parsedBody.delivery || `github-${Date.now()}`;
        eventType = req.headers['x-github-event'] as string || 'push';
        priority = getGitHubPriority(eventType);
        break;

      default:
        // Generic webhook
        eventId = parsedBody.id || parsedBody.event_id || `${source}-${Date.now()}`;
        eventType = parsedBody.type || parsedBody.event_type || parsedBody.event || 'webhook.received';
        priority = parsedBody.priority || 'medium';
    }

    // Get signature from appropriate header
    const signature = 
      req.headers['stripe-signature'] as string ||
      req.headers['x-twilio-signature'] as string ||
      req.headers['x-hub-signature-256'] as string ||
      req.headers['x-webhook-signature'] as string ||
      undefined;

    logger.info('🪝 Webhook received', {
      tenantId,
      source,
      eventId,
      eventType,
      priority,
      hasSignature: !!signature
    });

    // Process webhook through service
    const result = await WebhookService.receiveWebhookEvent({
      tenantId,
      source,
      eventId,
      eventType,
      payload: parsedBody,
      signature,
      headers: req.headers as Record<string, any>,
      priority
    });

    if (!result.success) {
      logger.error('🪝 Webhook processing failed', {
        tenantId,
        source,
        error: result.error
      });
      return res.status(400).json({ error: result.error });
    }

    logger.info('🪝 Webhook processed successfully', {
      tenantId,
      source,
      eventId,
      eventType
    });

    return res.status(202).json({
      received: true,
      eventId: result.eventId,
      message: result.message || 'Webhook event queued for processing'
    });

  } catch (error) {
    logger.error('🪝 Webhook receiver error', {
      error: error instanceof Error ? error.message : String(error),
      tenantId: req.params.tenantId,
      source: req.params.source
    });
    return res.status(500).json({ error: 'Internal webhook processing error' });
  }
});

// Helper functions for priority mapping
function getStripePriority(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
  if (eventType?.includes('payment_intent.succeeded')) return 'critical';
  if (eventType?.includes('charge.failed')) return 'high';
  if (eventType?.includes('customer.subscription')) return 'high';
  return 'medium';
}

function getGitHubPriority(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
  if (eventType === 'push') return 'medium';
  if (eventType === 'pull_request') return 'medium';
  if (eventType === 'deployment') return 'high';
  return 'low';
}

/**
 * 📊 Webhook Events Query Endpoint
 * GET /api/webhooks/:tenantId/events
 * 
 * Query webhook events for a tenant
 */
router.get('/:tenantId/events', rbacMiddleware, requirePermission('webhooks.events.view'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { source, eventType, status, limit } = req.query;

    const events = await WebhookService.getWebhookEvents(tenantId, {
      source: source as string,
      eventType: eventType as string,
      status: status as string,
      limit: limit ? parseInt(limit as string) : 100
    });

    return res.json({
      events,
      count: events.length
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('📊 Webhook events query error', {
      error: errorMessage,
      tenantId: req.params.tenantId
    });

    return res.status(500).json({
      error: 'Failed to fetch webhook events',
      details: errorMessage
    });
  }
});

/**
 * ⚙️ Webhook Signature Configuration Endpoints
 */

/**
 * ⚙️ Get Webhook Signature Configurations
 * GET /api/webhooks/:tenantId/signatures
 * 
 * Returns all webhook signature configs for a tenant
 */
router.get('/:tenantId/signatures', rbacMiddleware, requirePermission('webhooks.signatures.view'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const configs = await WebhookService.getWebhookSignatures(tenantId);

    return res.json({
      signatures: configs,
      count: configs.length
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('⚙️ Webhook signatures fetch error', {
      error: errorMessage,
      tenantId: req.params.tenantId
    });

    return res.status(500).json({
      error: 'Failed to fetch webhook signatures',
      details: errorMessage
    });
  }
});

/**
 * ⚙️ Create Webhook Signature Config
 * POST /api/webhooks/:tenantId/signatures
 */
const createSignatureSchema = z.object({
  provider: z.string().min(1),
  providerName: z.string().min(1),
  description: z.string().optional(),
  signingSecret: z.string().min(1),
  validationAlgorithm: z.enum(['hmac-sha256', 'hmac-sha512', 'hmac-sha1']).default('hmac-sha256'),
  signatureHeader: z.string().default('x-webhook-signature'),
  timestampHeader: z.string().optional(),
  toleranceWindowSeconds: z.number().default(300),
  requireTimestamp: z.boolean().default(false),
  requiredPermission: z.string().default('webhooks.receive.*'),
  allowedEventTypes: z.array(z.string()).default([])
});

router.post('/:tenantId/signatures', rbacMiddleware, requirePermission('webhooks.signatures.create'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    
    // Validate request body
    const validatedData = createSignatureSchema.parse(req.body);

    const config = await WebhookService.createWebhookSignature({
      ...validatedData,
      tenantId,
      createdBy: (req as any).user?.id // Assuming auth middleware sets req.user
    });

    logger.info('⚙️ Webhook signature config created', {
      provider: config.provider,
      tenantId
    });

    return res.status(201).json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('⚙️ Webhook signature creation error', {
      error: errorMessage,
      tenantId: req.params.tenantId
    });

    return res.status(500).json({
      error: 'Failed to create webhook signature',
      details: errorMessage
    });
  }
});

export default router;
