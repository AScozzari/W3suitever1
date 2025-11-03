/**
 * VoIP Webhooks - edgvoip Integration
 * 
 * Receives webhooks from edgvoip PBX for:
 * - Trunk synchronization (trunk.created, trunk.updated, trunk.deleted)
 * - CDR delivery (call detail records)
 * - Status updates (trunk health, registration status)
 * 
 * All webhooks are secured with HMAC-SHA256 signature verification
 */

import express from 'express';
import { z } from 'zod';
import { db, setTenantContext } from '../core/db';
import { logger, correlationMiddleware } from '../core/logger';
import { verifyEdgvoipSignature } from '../middleware/hmac';
import { upsertTrunkFromWebhook, deleteTrunkFromWebhook } from '../services/voip-webhook.service';
import { voipCdrs, insertVoipCdrSchema } from '../db/schema/w3suite';
import { ApiSuccessResponse, ApiErrorResponse } from '../types/workflow-shared';

// Webhook payload validation schemas
const trunkWebhookPayloadSchema = z.object({
  tenantId: z.string().uuid(),
  storeId: z.string().uuid(),
  trunk: z.object({
    edgvoipTrunkId: z.string(),
    name: z.string(),
    provider: z.string().optional(),
    host: z.string().optional(),
    port: z.number().optional(),
    protocol: z.enum(['udp', 'tcp', 'tls']).optional(),
    didRange: z.string().optional(),
    maxChannels: z.number().optional(),
    status: z.enum(['active', 'inactive', 'error']).optional(),
    aiAgentEnabled: z.boolean().optional(),
    aiAgentRef: z.string().optional(),
    aiTimePolicy: z.any().optional(),
    aiFailoverExtension: z.string().optional()
  })
});

const router = express.Router();

router.use(correlationMiddleware);

// CRITICAL: Capture raw body for HMAC verification while parsing JSON
// express.json's verify callback runs before parsing, allowing us to save the raw buffer
router.use(express.json({
  verify: (req: any, res, buf, encoding) => {
    // Attach raw buffer to request for HMAC signature verification
    req.rawBody = buf;
  }
}));

// Idempotency tracking for webhook deduplication
const processedWebhooks = new Map<string, number>(); // key: idempotency-key, value: timestamp
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Cleanup old idempotency keys every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of processedWebhooks.entries()) {
    if (now - timestamp > IDEMPOTENCY_TTL_MS) {
      processedWebhooks.delete(key);
    }
  }
}, 60 * 60 * 1000);

/**
 * POST /api/webhooks/voip/trunk
 * 
 * Receive trunk configuration updates from edgvoip
 * Events: trunk.created, trunk.updated, trunk.deleted
 */
router.post('/trunk', verifyEdgvoipSignature, async (req, res) => {
  try {
    const event = req.headers['x-edgvoip-event'] as string;
    const idempotencyKey = req.headers['x-idempotency-key'] as string;

    // Idempotency check
    if (idempotencyKey && processedWebhooks.has(idempotencyKey)) {
      logger.info('Duplicate webhook ignored (idempotency)', {
        event,
        idempotencyKey,
        path: req.path
      });
      return res.status(200).json({
        success: true,
        message: 'Webhook already processed (idempotent)'
      } as ApiSuccessResponse);
    }

    // Validate webhook payload schema
    const validated = trunkWebhookPayloadSchema.safeParse(req.body);
    if (!validated.success) {
      logger.error('Invalid trunk webhook payload schema', { 
        event, 
        errors: validated.error.errors,
        body: req.body 
      });
      return res.status(400).json({
        error: 'Invalid webhook payload',
        details: validated.error.errors
      } as ApiErrorResponse);
    }

    const { tenantId, storeId, trunk } = validated.data;

    let result;

    switch (event) {
      case 'trunk.created':
      case 'trunk.updated':
        result = await upsertTrunkFromWebhook({
          ...trunk,
          tenantId,
          storeId
        });

        if (!result.success) {
          return res.status(400).json({
            error: result.error || 'Failed to sync trunk'
          } as ApiErrorResponse);
        }

        // Mark as processed
        if (idempotencyKey) {
          processedWebhooks.set(idempotencyKey, Date.now());
        }

        logger.info('Trunk webhook processed successfully', {
          event,
          trunkId: result.trunkId,
          edgvoipTrunkId: trunk.edgvoipTrunkId,
          tenantId
        });

        return res.status(200).json({
          success: true,
          data: {
            trunkId: result.trunkId,
            event
          }
        } as ApiSuccessResponse);

      case 'trunk.deleted':
        result = await deleteTrunkFromWebhook(trunk.edgvoipTrunkId, tenantId);

        if (!result.success) {
          return res.status(400).json({
            error: result.error || 'Failed to delete trunk'
          } as ApiErrorResponse);
        }

        // Mark as processed
        if (idempotencyKey) {
          processedWebhooks.set(idempotencyKey, Date.now());
        }

        logger.info('Trunk deletion webhook processed successfully', {
          event,
          edgvoipTrunkId: trunk.edgvoipTrunkId,
          tenantId
        });

        return res.status(200).json({
          success: true,
          data: { event }
        } as ApiSuccessResponse);

      default:
        logger.error('Unknown trunk webhook event', { event, body: req.body });
        return res.status(400).json({
          error: `Unknown event type: ${event}`
        } as ApiErrorResponse);
    }
  } catch (error) {
    logger.error('Error processing trunk webhook', { error, body: req.body });
    return res.status(500).json({
      error: 'Internal error processing trunk webhook'
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/webhooks/voip/cdr
 * 
 * Receive Call Detail Records from edgvoip
 * Idempotent based on callId
 */
router.post('/cdr', verifyEdgvoipSignature, async (req, res) => {
  try {
    const idempotencyKey = req.headers['x-idempotency-key'] as string || req.body.callId;

    // Idempotency check (based on callId)
    if (idempotencyKey && processedWebhooks.has(idempotencyKey)) {
      logger.info('Duplicate CDR webhook ignored (idempotency)', {
        callId: req.body.callId,
        idempotencyKey
      });
      return res.status(200).json({
        success: true,
        message: 'CDR already processed (idempotent)'
      } as ApiSuccessResponse);
    }

    // Validate CDR payload
    const validated = insertVoipCdrSchema.parse(req.body);

    await setTenantContext(db, validated.tenantId);

    // Insert CDR
    const [cdr] = await db.insert(voipCdrs)
      .values(validated)
      .returning();

    // Mark as processed
    processedWebhooks.set(idempotencyKey, Date.now());

    logger.info('CDR webhook processed successfully', {
      cdrId: cdr.id,
      callId: cdr.callId,
      tenantId: validated.tenantId,
      direction: validated.direction,
      disposition: validated.disposition
    });

    return res.status(201).json({
      success: true,
      data: {
        cdrId: cdr.id,
        callId: cdr.callId
      }
    } as ApiSuccessResponse);
  } catch (error) {
    logger.error('Error processing CDR webhook', { error, body: req.body });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid CDR payload',
        details: error.errors
      } as ApiErrorResponse);
    }

    return res.status(500).json({
      error: 'Internal error processing CDR webhook'
    } as ApiErrorResponse);
  }
});

/**
 * POST /api/webhooks/voip/status
 * 
 * Receive status updates from edgvoip (trunk health, extension registration status)
 * Optional endpoint for monitoring/observability
 */
router.post('/status', verifyEdgvoipSignature, async (req, res) => {
  try {
    const { type, data } = req.body;

    logger.info('VoIP status update received', {
      type,
      data
    });

    // Currently just logs status updates
    // Can be extended to update database state, trigger alerts, etc.

    return res.status(200).json({
      success: true,
      message: 'Status update acknowledged'
    } as ApiSuccessResponse);
  } catch (error) {
    logger.error('Error processing status webhook', { error, body: req.body });
    return res.status(500).json({
      error: 'Internal error processing status webhook'
    } as ApiErrorResponse);
  }
});

export default router;
