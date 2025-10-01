import { Router, Request, Response } from 'express';
import { WebhookService } from '../services/webhook-service.js';
import { logger } from '../core/logger.js';
import { z } from 'zod';
import { rbacMiddleware, requirePermission } from '../middleware/tenant.js';

const router = Router();

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
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    // Extract event metadata from provider-specific formats
    let eventId: string;
    let eventType: string;
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';

    // Provider-specific event extraction
    switch (source.toLowerCase()) {
      case 'stripe':
        eventId = req.body.id || `stripe-${Date.now()}`;
        eventType = req.body.type || 'unknown';
        priority = getStripePriority(req.body.type);
        break;

      case 'twilio':
        eventId = req.body.MessageSid || req.body.SmsSid || `twilio-${Date.now()}`;
        eventType = req.body.SmsStatus || req.body.MessageStatus || 'sms.status';
        priority = 'high'; // SMS delivery is usually time-sensitive
        break;

      case 'github':
        eventId = req.body.delivery || `github-${Date.now()}`;
        eventType = req.headers['x-github-event'] as string || 'push';
        priority = getGitHubPriority(eventType);
        break;

      default:
        // Generic webhook
        eventId = req.body.id || req.body.event_id || `${source}-${Date.now()}`;
        eventType = req.body.type || req.body.event_type || req.body.event || 'webhook.received';
        priority = req.body.priority || 'medium';
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
      payload: req.body,
      signature,
      headers: req.headers as Record<string, any>,
      priority
    });

    if (!result.success) {
      logger.error('🪝 Webhook processing failed', {
        tenantId,
        source,
        eventId,
        error: result.error
      });
      
      return res.status(400).json({
        error: result.error || 'Webhook processing failed'
      });
    }

    // Return 202 Accepted (webhook queued for processing)
    return res.status(202).json({
      received: true,
      eventId: result.eventId,
      message: result.message || 'Webhook queued for processing'
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('🪝 Webhook endpoint error', {
      error: errorMessage,
      tenantId: req.params.tenantId,
      source: req.params.source
    });

    return res.status(500).json({
      error: 'Internal webhook processing error',
      details: errorMessage
    });
  }
});

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
 * 🔍 Get Single Webhook Event
 * GET /api/webhooks/:tenantId/events/:eventId
 */
router.get('/:tenantId/events/:eventId', rbacMiddleware, requirePermission('webhooks.events.view'), async (req: Request, res: Response) => {
  try {
    const { tenantId, eventId } = req.params;

    const event = await WebhookService.getWebhookEvent(eventId, tenantId);

    if (!event) {
      return res.status(404).json({
        error: 'Webhook event not found'
      });
    }

    return res.json(event);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('🔍 Webhook event fetch error', {
      error: errorMessage,
      tenantId: req.params.tenantId,
      eventId: req.params.eventId
    });

    return res.status(500).json({
      error: 'Failed to fetch webhook event',
      details: errorMessage
    });
  }
});

/**
 * ⚙️ Webhook Signature Config Management
 * GET /api/webhooks/:tenantId/signatures
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
      error: 'Failed to create webhook signature config',
      details: errorMessage
    });
  }
});

/**
 * ⚙️ Update Webhook Signature Config
 * PATCH /api/webhooks/:tenantId/signatures/:signatureId
 */
router.patch('/:tenantId/signatures/:signatureId', rbacMiddleware, requirePermission('webhooks.signatures.edit'), async (req: Request, res: Response) => {
  try {
    const { tenantId, signatureId } = req.params;

    const updated = await WebhookService.updateWebhookSignature(
      signatureId,
      tenantId,
      {
        ...req.body,
        updatedBy: (req as any).user?.id
      }
    );

    if (!updated) {
      return res.status(404).json({
        error: 'Webhook signature config not found'
      });
    }

    logger.info('⚙️ Webhook signature config updated', {
      signatureId,
      tenantId
    });

    return res.json(updated);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('⚙️ Webhook signature update error', {
      error: errorMessage,
      tenantId: req.params.tenantId,
      signatureId: req.params.signatureId
    });

    return res.status(500).json({
      error: 'Failed to update webhook signature config',
      details: errorMessage
    });
  }
});

/**
 * ⚙️ Delete Webhook Signature Config
 * DELETE /api/webhooks/:tenantId/signatures/:signatureId
 */
router.delete('/:tenantId/signatures/:signatureId', rbacMiddleware, requirePermission('webhooks.signatures.delete'), async (req: Request, res: Response) => {
  try {
    const { tenantId, signatureId } = req.params;

    const deleted = await WebhookService.deleteWebhookSignature(signatureId, tenantId);

    if (!deleted) {
      return res.status(404).json({
        error: 'Webhook signature config not found'
      });
    }

    logger.info('⚙️ Webhook signature config deleted', {
      signatureId,
      tenantId
    });

    return res.json({
      deleted: true,
      signatureId
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('⚙️ Webhook signature deletion error', {
      error: errorMessage,
      tenantId: req.params.tenantId,
      signatureId: req.params.signatureId
    });

    return res.status(500).json({
      error: 'Failed to delete webhook signature config',
      details: errorMessage
    });
  }
});

/**
 * 🎯 Helper: Get Stripe event priority
 */
function getStripePriority(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
  if (eventType?.includes('charge.failed') || eventType?.includes('payment_intent.payment_failed')) {
    return 'critical';
  }
  if (eventType?.includes('charge.succeeded') || eventType?.includes('payment_intent.succeeded')) {
    return 'high';
  }
  if (eventType?.includes('customer.') || eventType?.includes('subscription.')) {
    return 'medium';
  }
  return 'low';
}

/**
 * 🎯 Helper: Get GitHub event priority
 */
function getGitHubPriority(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
  if (eventType === 'push' || eventType === 'pull_request') {
    return 'high';
  }
  if (eventType === 'release' || eventType === 'deployment') {
    return 'medium';
  }
  return 'low';
}

export default router;
