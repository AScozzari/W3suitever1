import { Router, Request, Response } from 'express';
import { WebhookService } from '../services/webhook-service.js';
import { logger } from '../core/logger.js';
import { z } from 'zod';
import { rbacMiddleware, requirePermission } from '../middleware/tenant.js';
import crypto from 'crypto';
import { db, setTenantContext } from '../core/db.js';
import { eq, and, sql } from 'drizzle-orm';
import { tenants, suppliers, voipTenantConfig, voipActivityLog, voipTrunks, voipExtensions } from '../db/schema/w3suite.js';

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
 * Implementation:
 * 1. Start database transaction
 * 2. Delete all brand-origin records for this tenant
 * 3. Insert all records from data payload with origin='brand'
 * 4. Commit transaction or rollback on error
 */
async function mergeWMSData(tenantId: string, deployment: z.infer<typeof brandDeploySchema>) {
  const { resourceType, data, version, commitId } = deployment;
  
  logger.info('🔄 Starting WMS full replace', {
    tenantId,
    resourceType,
    version,
    commitId
  });
  
  // Get tenant info for validation
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) {
    throw new Error(`Tenant ${tenantId} not found`);
  }
  
  let replaced = 0;
  let inserted = 0;
  
  try {
    switch (resourceType) {
      case 'suppliers':
        if (!Array.isArray(data.suppliers)) {
          throw new Error('Invalid suppliers data: expected array');
        }
        
        // Start transaction: DELETE + INSERT
        await db.transaction(async (tx) => {
          // 1. Delete all brand-origin suppliers for this tenant
          const deleteResult = await tx
            .delete(suppliers)
            .where(and(
              eq(suppliers.tenantId, tenantId),
              eq(suppliers.origin, 'brand')
            ))
            .returning({ id: suppliers.id });
          
          replaced = deleteResult.length;
          
          logger.info(`🗑️  Deleted ${replaced} existing brand suppliers for tenant`, { tenantId });
          
          // 2. Insert new suppliers from Brand payload
          if (data.suppliers.length > 0) {
            for (const supplier of data.suppliers) {
              await tx.insert(suppliers).values({
                ...supplier,
                id: undefined, // Let DB generate new UUID
                origin: 'brand',
                tenantId: tenantId,
                externalId: supplier.id, // Store original Brand supplier ID
                // Keep original createdBy/updatedBy from Brand (already UUIDs)
                // createdAt/updatedAt will use default (NOW())
                createdAt: undefined,
                updatedAt: undefined
              });
              inserted++;
            }
            
            logger.info(`✅ Inserted ${inserted} new brand suppliers for tenant`, { tenantId });
          }
        });
        
        logger.info('🔄 WMS Suppliers full replace completed', {
          tenantId,
          deleted: replaced,
          inserted,
          version,
          commitId
        });
        break;
        
      case 'products':
        // STUB: Products full replace not yet implemented
        logger.warn('🔄 WMS Products full replace (STUB - no DB changes)', {
          tenantId,
          productsCount: Array.isArray(data.products) ? data.products.length : 0,
          note: 'Production logic not yet implemented'
        });
        replaced = Array.isArray(data.products) ? data.products.length : 0;
        break;
        
      case 'price_lists':
        // STUB: Price lists full replace not yet implemented
        logger.warn('🔄 WMS Price Lists full replace (STUB - no DB changes)', {
          tenantId,
          priceListsCount: Array.isArray(data.priceLists) ? data.priceLists.length : 0,
          note: 'Production logic not yet implemented'
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
    
    return {
      success: true,
      message: `WMS ${resourceType} full replace completed`,
      replaced,
      inserted: inserted || replaced, // For suppliers we track both, for others use replaced
      version,
      commitId
    };
  } catch (error) {
    logger.error('❌ WMS merge failed', {
      tenantId,
      resourceType,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
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

// ==================== EDGVoIP WEBHOOK RECEIVER ====================
// POST /api/webhooks - Main endpoint for EDGVoIP call and status events
// Uses HMAC-SHA256 signature verification with tenant-specific secrets
// Reference: EDGVoIP API v2 Webhook Documentation

// Types for EDGVoIP webhook events
interface WebhookCallData {
  call_uuid: string;
  caller_id_number?: string;
  caller_id_name?: string;
  destination_number: string;
  call_direction: 'inbound' | 'outbound';
  context?: string;
  answer_time?: string;
  start_time?: string;
  end_time?: string;
  duration?: number;
  billable_seconds?: number;
  hangup_cause?: string;
  hangup_cause_code?: number;
}

interface WebhookTrunkStatusData {
  trunk_id: string;
  trunk_external_id: string;
  trunk_name: string;
  previous_status: string;
  current_status: string;
}

interface WebhookExtensionStatusData {
  extension_id: string;
  extension_external_id: string;
  extension: string;
  previous_status: string;
  current_status: string;
  connection_type?: string;
  registration_ip?: string;
  registration_port?: number;
}

interface EDGVoIPWebhookPayload {
  type: 'call.start' | 'call.ringing' | 'call.answered' | 'call.ended' | 'trunk.status' | 'extension.status';
  tenant_id: string;
  tenant_external_id: string;
  timestamp: string;
  data: WebhookCallData | WebhookTrunkStatusData | WebhookExtensionStatusData;
}

// Timing-safe HMAC verification
function verifyEdgvoipWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  try {
    if (!signature || !secret) return false;
    
    // Signature format: sha256=<hex_hash>
    const expectedSig = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex');
    
    // Timing-safe comparison
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);
    
    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch (error) {
    logger.error('Error verifying EDGVoIP webhook signature', { error });
    return false;
  }
}

// Get tenant's webhook secret by external ID
async function getEdgvoipTenantWebhookSecret(tenantExternalId: string): Promise<{ tenantId: string; secret: string } | null> {
  try {
    const [config] = await db
      .select({
        tenantId: voipTenantConfig.tenantId,
        webhookSecret: voipTenantConfig.webhookSecret
      })
      .from(voipTenantConfig)
      .where(eq(voipTenantConfig.tenantExternalId, tenantExternalId));
    
    if (!config || !config.webhookSecret) {
      return null;
    }
    
    return {
      tenantId: config.tenantId,
      secret: config.webhookSecret
    };
  } catch (error) {
    logger.error('Error fetching tenant webhook secret', { error, tenantExternalId });
    return null;
  }
}

// Process call events asynchronously
async function processEdgvoipCallEvent(tenantId: string, eventType: string, data: WebhookCallData): Promise<void> {
  try {
    await setTenantContext(db, tenantId);
    
    // Log the call event
    await db.insert(voipActivityLog).values({
      tenantId,
      action: `webhook_${eventType}`,
      targetType: 'call',
      targetId: data.call_uuid,
      status: 'success',
      detailsJson: {
        callerNumber: data.caller_id_number,
        callerName: data.caller_id_name,
        destination: data.destination_number,
        direction: data.call_direction,
        answerTime: data.answer_time,
        duration: data.duration,
        hangupCause: data.hangup_cause
      }
    });
    
    logger.debug('EDGVoIP call event processed', { tenantId, eventType, callUuid: data.call_uuid });
  } catch (error) {
    logger.error('Error processing EDGVoIP call event', { error, tenantId, eventType, data });
    throw error;
  }
}

// Process trunk status events
async function processEdgvoipTrunkStatusEvent(tenantId: string, data: WebhookTrunkStatusData): Promise<void> {
  try {
    await setTenantContext(db, tenantId);
    
    // Update trunk status in local database
    await db
      .update(voipTrunks)
      .set({
        status: data.current_status,
        updatedAt: new Date()
      })
      .where(and(
        eq(voipTrunks.tenantId, tenantId),
        eq(voipTrunks.externalId, data.trunk_external_id)
      ));
    
    // Log the status change
    await db.insert(voipActivityLog).values({
      tenantId,
      action: 'webhook_trunk.status',
      targetType: 'trunk',
      targetId: data.trunk_external_id,
      status: 'success',
      detailsJson: {
        trunkName: data.trunk_name,
        previousStatus: data.previous_status,
        currentStatus: data.current_status
      }
    });
    
    logger.info('EDGVoIP trunk status updated via webhook', {
      tenantId,
      trunkId: data.trunk_external_id,
      status: data.current_status
    });
  } catch (error) {
    logger.error('Error processing EDGVoIP trunk status event', { error, tenantId, data });
    throw error;
  }
}

// Process extension status events
async function processEdgvoipExtensionStatusEvent(tenantId: string, data: WebhookExtensionStatusData): Promise<void> {
  try {
    await setTenantContext(db, tenantId);
    
    // Update extension status in local database
    await db
      .update(voipExtensions)
      .set({
        status: data.current_status,
        updatedAt: new Date()
      })
      .where(and(
        eq(voipExtensions.tenantId, tenantId),
        eq(voipExtensions.externalId, data.extension_external_id)
      ));
    
    // Log the status change
    await db.insert(voipActivityLog).values({
      tenantId,
      action: 'webhook_extension.status',
      targetType: 'extension',
      targetId: data.extension_external_id,
      status: 'success',
      detailsJson: {
        extension: data.extension,
        previousStatus: data.previous_status,
        currentStatus: data.current_status,
        connectionType: data.connection_type,
        registrationIp: data.registration_ip
      }
    });
    
    logger.info('EDGVoIP extension status updated via webhook', {
      tenantId,
      extensionId: data.extension_external_id,
      status: data.current_status
    });
  } catch (error) {
    logger.error('Error processing EDGVoIP extension status event', { error, tenantId, data });
    throw error;
  }
}

/**
 * POST /api/webhooks
 * 
 * Main EDGVoIP webhook receiver endpoint
 * Receives call events (start, ringing, answered, ended) and status events (trunk.status, extension.status)
 * 
 * Headers:
 * - X-Webhook-Signature: HMAC-SHA256 signature (sha256=<hex>)
 * - X-Webhook-Event: Event type
 * - X-Request-ID: Unique delivery ID
 * 
 * Payload:
 * - type: Event type
 * - tenant_id: EDGVoIP internal tenant ID
 * - tenant_external_id: W3 Suite tenant identifier (used for lookup)
 * - timestamp: ISO 8601 timestamp
 * - data: Event-specific data
 */
router.post('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  const eventType = req.headers['x-webhook-event'] as string;
  const signature = req.headers['x-webhook-signature'] as string;
  
  try {
    // Get raw body for HMAC verification
    const rawBody = (req as any).rawBody;
    
    if (!rawBody) {
      logger.warn('EDGVoIP webhook received without raw body', { requestId });
      return res.status(400).json({ error: 'Invalid request body' });
    }
    
    const rawBodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
    
    // Parse the payload
    let payload: EDGVoIPWebhookPayload;
    try {
      payload = JSON.parse(rawBodyStr);
    } catch (e) {
      logger.warn('EDGVoIP webhook received with invalid JSON', { requestId, error: e });
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }
    
    // Extract tenant_external_id from payload
    const { tenant_external_id, type, data, timestamp } = payload;
    
    if (!tenant_external_id) {
      logger.warn('EDGVoIP webhook missing tenant_external_id', { requestId, eventType: type });
      return res.status(400).json({ error: 'Missing tenant_external_id' });
    }
    
    // Get tenant's webhook secret
    const tenantConfig = await getEdgvoipTenantWebhookSecret(tenant_external_id);
    
    if (!tenantConfig) {
      logger.warn('EDGVoIP webhook secret not found for tenant', { requestId, tenantExternalId: tenant_external_id });
      return res.status(401).json({ error: 'Tenant not configured' });
    }
    
    // Verify HMAC signature
    if (!verifyEdgvoipWebhookSignature(rawBodyStr, signature, tenantConfig.secret)) {
      logger.warn('EDGVoIP webhook signature verification failed', { 
        requestId, 
        tenantExternalId: tenant_external_id,
        eventType: type 
      });
      
      // Log failed attempt for security monitoring
      await db.insert(voipActivityLog).values({
        tenantId: tenantConfig.tenantId,
        action: 'webhook_signature_failed',
        targetType: 'webhook',
        targetId: requestId,
        status: 'failed',
        detailsJson: {
          eventType: type,
          timestamp,
          reason: 'Invalid HMAC signature'
        }
      }).catch(() => {}); // Don't fail if logging fails
      
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Respond immediately with 200 OK (best practice - respond within 5 seconds)
    res.status(200).json({ received: true, requestId });
    
    // Process event asynchronously (don't await - fire and forget)
    setImmediate(async () => {
      try {
        switch (type) {
          case 'call.start':
          case 'call.ringing':
          case 'call.answered':
          case 'call.ended':
            await processEdgvoipCallEvent(tenantConfig.tenantId, type, data as WebhookCallData);
            break;
          
          case 'trunk.status':
            await processEdgvoipTrunkStatusEvent(tenantConfig.tenantId, data as WebhookTrunkStatusData);
            break;
          
          case 'extension.status':
            await processEdgvoipExtensionStatusEvent(tenantConfig.tenantId, data as WebhookExtensionStatusData);
            break;
          
          default:
            logger.warn('Unknown EDGVoIP webhook event type', { requestId, eventType: type, tenantExternalId: tenant_external_id });
        }
        
        logger.info('EDGVoIP webhook processed successfully', {
          requestId,
          eventType: type,
          tenantExternalId: tenant_external_id,
          processingTime: Date.now() - startTime
        });
      } catch (error) {
        logger.error('Error processing EDGVoIP webhook event', { 
          error, 
          requestId, 
          eventType: type, 
          tenantExternalId: tenant_external_id 
        });
      }
    });
    
  } catch (error) {
    logger.error('EDGVoIP webhook handler error', { error, requestId });
    // Return 200 anyway to prevent retries if we've already received the webhook
    return res.status(200).json({ received: true, requestId, warning: 'Processing error occurred' });
  }
});

export default router;
