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

/**
 * 🚀 POWERFUL API - Lead Intake Webhook
 * POST /api/webhooks/powerful/leads
 * 
 * Receives leads from Powerful API with automatic campaign management and deduplication.
 * 
 * Features:
 * - Auto-creates campaign if externalCampaignId not found
 * - Multi-field deduplication (email OR phone OR fiscalCode)
 * - Smart expiry handling (creates new lead with same personId if expired)
 * - Batch processing support
 */
router.post('/powerful/leads', async (req: Request, res: Response) => {
  try {
    const { tenantId, externalCampaignId, leads } = req.body;

    if (!tenantId || !externalCampaignId || !Array.isArray(leads)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tenantId, externalCampaignId, leads (array)'
      });
    }

    logger.info('🚀 Powerful API lead intake started', {
      tenantId,
      externalCampaignId,
      leadsCount: leads.length
    });

    // Import dependencies (dynamic to avoid circular deps)
    const { db } = await import('../core/db.js');
    const { eq, and, or } = await import('drizzle-orm');
    const { crmCampaigns, crmLeads, crmPersonIdentities } = await import('../db/schema/w3suite.js');

    // Step 1: Find or create campaign
    let [campaign] = await db.select()
      .from(crmCampaigns)
      .where(and(
        eq(crmCampaigns.tenantId, tenantId),
        eq(crmCampaigns.externalCampaignId, externalCampaignId)
      ))
      .limit(1);

    if (!campaign) {
      // Auto-create campaign with Powerful API defaults
      [campaign] = await db.insert(crmCampaigns).values({
        tenantId,
        name: `Powerful Campaign ${externalCampaignId}`,
        externalCampaignId,
        defaultLeadSource: 'powerful_api',
        status: 'active',
        targetDriverIds: [],
        channels: []
      }).returning();

      logger.info('🆕 Auto-created campaign for Powerful API', {
        campaignId: campaign.id,
        externalCampaignId
      });
    }

    const results = {
      created: [] as string[],
      updated: [] as string[],
      skipped: [] as string[],
      errors: [] as any[]
    };

    // Step 2: Process each lead with deduplication
    for (const leadData of leads) {
      try {
        const { email, phone, fiscalCode, externalLeadId, validUntil, ...otherFields } = leadData;

        // Build deduplication conditions (email OR phone OR fiscalCode)
        const dedupeConditions = [];
        if (email) dedupeConditions.push(eq(crmLeads.email, email));
        if (phone) dedupeConditions.push(eq(crmLeads.phone, phone));
        if (fiscalCode) dedupeConditions.push(eq(crmLeads.fiscalCode, fiscalCode));

        if (dedupeConditions.length === 0) {
          results.errors.push({
            externalLeadId,
            error: 'No identifiers provided (email, phone, or fiscalCode required)'
          });
          continue;
        }

        // Check for existing lead
        const [existingLead] = await db.select()
          .from(crmLeads)
          .where(and(
            eq(crmLeads.tenantId, tenantId),
            or(...dedupeConditions)
          ))
          .limit(1);

        const now = new Date();
        const isExpired = validUntil && new Date(validUntil) < now;

        if (existingLead) {
          if (existingLead.validUntil && new Date(existingLead.validUntil) < now) {
            // Expired lead - create NEW lead with SAME personId
            const [newLead] = await db.insert(crmLeads).values({
              tenantId,
              campaignId: campaign.id,
              personId: existingLead.personId, // Keep person identity
              email,
              phone,
              fiscalCode,
              externalLeadId,
              leadSource: 'powerful_api',
              validUntil: validUntil ? new Date(validUntil) : null,
              ...otherFields
            }).returning();

            results.created.push(newLead.id);
            logger.info('🆕 Created new lead (expired duplicate)', {
              newLeadId: newLead.id,
              oldLeadId: existingLead.id,
              personId: existingLead.personId
            });
          } else {
            // Active duplicate - skip
            results.skipped.push(existingLead.id);
            logger.info('⏭️  Skipped duplicate lead', {
              leadId: existingLead.id,
              externalLeadId
            });
          }
        } else {
          // New lead - create with person identity
          const personId = crypto.randomUUID();
          
          // Create person identities
          if (email) {
            await db.insert(crmPersonIdentities).values({
              tenantId,
              personId,
              identifierType: 'email',
              identifierValue: email
            }).onConflictDoNothing();
          }
          if (phone) {
            await db.insert(crmPersonIdentities).values({
              tenantId,
              personId,
              identifierType: 'phone',
              identifierValue: phone
            }).onConflictDoNothing();
          }

          const [newLead] = await db.insert(crmLeads).values({
            tenantId,
            campaignId: campaign.id,
            personId,
            email,
            phone,
            fiscalCode,
            externalLeadId,
            leadSource: 'powerful_api',
            validUntil: validUntil ? new Date(validUntil) : null,
            ...otherFields
          }).returning();

          results.created.push(newLead.id);
          logger.info('✅ Created new lead', {
            leadId: newLead.id,
            personId,
            externalLeadId
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push({
          externalLeadId: leadData.externalLeadId,
          error: errorMessage
        });
        logger.error('❌ Error processing lead', {
          externalLeadId: leadData.externalLeadId,
          error: errorMessage
        });
      }
    }

    logger.info('🏁 Powerful API lead intake completed', {
      tenantId,
      campaignId: campaign.id,
      results
    });

    return res.status(200).json({
      success: true,
      campaignId: campaign.id,
      results,
      message: `Processed ${leads.length} leads: ${results.created.length} created, ${results.updated.length} updated, ${results.skipped.length} skipped, ${results.errors.length} errors`
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('💥 Powerful API webhook error', {
      error: errorMessage,
      body: req.body
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: errorMessage
    });
  }
});

export default router;
