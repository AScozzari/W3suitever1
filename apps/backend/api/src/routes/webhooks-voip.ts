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
import { voipCdrs, voipExtensions, insertVoipCdrSchema } from '../db/schema/w3suite';
import { eq, and } from 'drizzle-orm';
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

const extensionWebhookPayloadSchema = z.object({
  tenantId: z.string().uuid(),
  extension: z.object({
    edgvoipExtensionId: z.string(),
    userId: z.string().uuid(),
    extension: z.string(),
    sipUsername: z.string(),
    displayName: z.string().optional(),
    email: z.string().email().optional(),
    sipServer: z.string().optional(),
    sipPort: z.number().optional(),
    wsPort: z.number().optional(),
    transport: z.enum(['udp', 'tcp', 'tls', 'wss']).optional(),
    voicemailEnabled: z.boolean().optional(),
    voicemailEmail: z.string().email().optional(),
    recordingEnabled: z.boolean().optional(),
    dndEnabled: z.boolean().optional(),
    callForwardEnabled: z.boolean().optional(),
    callForwardNumber: z.string().optional(),
    maxConcurrentCalls: z.number().optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional()
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

    const { tenantId, storeId, trunk: trunkData } = validated.data;

    let result;

    switch (event) {
      case 'trunk.created':
      case 'trunk.updated':
        result = await upsertTrunkFromWebhook({
          ...trunkData,
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
          edgvoipTrunkId: trunkData.edgvoipTrunkId,
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
        result = await deleteTrunkFromWebhook(trunkData.edgvoipTrunkId, tenantId);

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
          edgvoipTrunkId: trunkData.edgvoipTrunkId,
          tenantId
        });

        return res.status(200).json({
          success: true,
          data: { event }
        } as ApiSuccessResponse);

      default:
        logger.error('Unknown trunk webhook event', { event, body: req.body, tenantId });
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
 * POST /api/webhooks/voip/extension
 * 
 * Receive extension configuration updates from edgvoip
 * Events: extension.created, extension.updated, extension.deleted
 */
router.post('/extension', verifyEdgvoipSignature, async (req, res) => {
  try {
    const event = req.headers['x-edgvoip-event'] as string;
    const idempotencyKey = req.headers['x-idempotency-key'] as string;

    // Idempotency check
    if (idempotencyKey && processedWebhooks.has(idempotencyKey)) {
      logger.info('Duplicate extension webhook ignored (idempotency)', {
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
    const validated = extensionWebhookPayloadSchema.safeParse(req.body);
    if (!validated.success) {
      logger.error('Invalid extension webhook payload schema', { 
        event, 
        errors: validated.error.errors,
        body: req.body 
      });
      return res.status(400).json({
        error: 'Invalid webhook payload',
        details: validated.error.errors
      } as ApiErrorResponse);
    }

    const { tenantId, extension: extensionData } = validated.data;

    // Note: Extensions are tenant-scoped (NO storeId)
    let result;

    switch (event) {
      case 'extension.created':
      case 'extension.updated':
        // Set tenant context for RLS
        await setTenantContext(db, tenantId);

        // Upsert extension (inline implementation for quick testing)
        const [upsertedExt] = await db.insert(voipExtensions)
          .values({
            tenantId,
            edgvoipExtensionId: extensionData.edgvoipExtensionId,
            userId: extensionData.userId,
            extension: extensionData.extension,
            sipUsername: extensionData.sipUsername,
            displayName: extensionData.displayName || extensionData.sipUsername,
            email: extensionData.email,
            sipServer: extensionData.sipServer || 'sip.edgvoip.com',
            sipPort: extensionData.sipPort || 5060,
            wsPort: extensionData.wsPort || 8443,
            transport: extensionData.transport || 'wss',
            voicemailEnabled: extensionData.voicemailEnabled ?? true,
            voicemailEmail: extensionData.voicemailEmail,
            recordingEnabled: extensionData.recordingEnabled ?? false,
            dndEnabled: extensionData.dndEnabled ?? false,
            callForwardEnabled: extensionData.callForwardEnabled ?? false,
            callForwardNumber: extensionData.callForwardNumber,
            maxConcurrentCalls: extensionData.maxConcurrentCalls || 2,
            status: extensionData.status || 'active',
            syncSource: 'edgvoip',
            lastSyncAt: new Date()
          })
          .onConflictDoUpdate({
            target: [voipExtensions.tenantId, voipExtensions.edgvoipExtensionId],
            set: {
              userId: extensionData.userId,
              extension: extensionData.extension,
              sipUsername: extensionData.sipUsername,
              displayName: extensionData.displayName || extensionData.sipUsername,
              email: extensionData.email,
              sipServer: extensionData.sipServer || 'sip.edgvoip.com',
              sipPort: extensionData.sipPort || 5060,
              wsPort: extensionData.wsPort || 8443,
              transport: extensionData.transport || 'wss',
              voicemailEnabled: extensionData.voicemailEnabled ?? true,
              voicemailEmail: extensionData.voicemailEmail,
              recordingEnabled: extensionData.recordingEnabled ?? false,
              dndEnabled: extensionData.dndEnabled ?? false,
              callForwardEnabled: extensionData.callForwardEnabled ?? false,
              callForwardNumber: extensionData.callForwardNumber,
              maxConcurrentCalls: extensionData.maxConcurrentCalls || 2,
              status: extensionData.status || 'active',
              lastSyncAt: new Date(),
              updatedAt: new Date()
            }
          })
          .returning();

        result = {
          success: true,
          extensionId: upsertedExt.id
        };

        if (!result.success) {
          return res.status(400).json({
            error: result.error || 'Failed to sync extension'
          } as ApiErrorResponse);
        }

        // Mark as processed
        if (idempotencyKey) {
          processedWebhooks.set(idempotencyKey, Date.now());
        }

        logger.info('Extension webhook processed successfully', {
          event,
          extensionId: result.extensionId,
          edgvoipExtensionId: extensionData.edgvoipExtensionId,
          tenantId
        });

        return res.status(200).json({
          success: true,
          data: {
            extensionId: result.extensionId,
            event
          }
        } as ApiSuccessResponse);

      case 'extension.deleted':
        // Set tenant context for RLS
        await setTenantContext(db, tenantId);

        // Soft delete: update status to 'deleted'
        await db.update(voipExtensions)
          .set({ 
            status: 'deleted',
            updatedAt: new Date()
          })
          .where(
            and(
              eq(voipExtensions.tenantId, tenantId),
              eq(voipExtensions.edgvoipExtensionId, extensionData.edgvoipExtensionId)
            )
          );

        result = { success: true };

        if (!result.success) {
          return res.status(400).json({
            error: result.error || 'Failed to delete extension'
          } as ApiErrorResponse);
        }

        // Mark as processed
        if (idempotencyKey) {
          processedWebhooks.set(idempotencyKey, Date.now());
        }

        logger.info('Extension deletion webhook processed successfully', {
          event,
          edgvoipExtensionId: extensionData.edgvoipExtensionId,
          tenantId
        });

        return res.status(200).json({
          success: true,
          data: { event }
        } as ApiSuccessResponse);

      default:
        logger.error('Unknown extension webhook event', { event, body: req.body, tenantId });
        return res.status(400).json({
          error: `Unknown event type: ${event}`
        } as ApiErrorResponse);
    }
  } catch (error) {
    logger.error('Error processing extension webhook', { error, body: req.body });
    return res.status(500).json({
      error: 'Internal error processing extension webhook'
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
