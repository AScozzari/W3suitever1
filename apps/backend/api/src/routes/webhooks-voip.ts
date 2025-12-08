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

import express, { Request, Response, RequestHandler } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { db, setTenantContext } from '../core/db';
import { logger, correlationMiddleware } from '../core/logger';
import { verifyEdgvoipSignature } from '../middleware/hmac';
import { upsertTrunkFromWebhook, deleteTrunkFromWebhook } from '../services/voip-webhook.service';
import { voipCdrs, voipExtensions, insertVoipCdrSchema } from '../db/schema/w3suite';
import { eq, and } from 'drizzle-orm';

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
    userId: z.string().uuid().optional(),
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
    forwardOnBusy: z.string().optional(),
    forwardOnNoAnswer: z.string().optional(),
    forwardUnconditional: z.string().optional(),
    maxConcurrentCalls: z.number().optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional()
  })
});

const router = express.Router();

router.use(correlationMiddleware);

router.use(express.json({
  verify: (req: any, res, buf, encoding) => {
    req.rawBody = buf;
  }
}));

const processedWebhooks = new Map<string, number>();
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of processedWebhooks.entries()) {
    if (now - timestamp > IDEMPOTENCY_TTL_MS) {
      processedWebhooks.delete(key);
    }
  }
}, 60 * 60 * 1000);

const trunkHandler: RequestHandler = async (req, res) => {
  try {
    const event = req.headers['x-edgvoip-event'] as string;
    const idempotencyKey = req.headers['x-idempotency-key'] as string;

    if (idempotencyKey && processedWebhooks.has(idempotencyKey)) {
      logger.info('Duplicate webhook ignored (idempotency)', {
        event,
        idempotencyKey,
        path: req.path
      });
      res.status(200).json({
        success: true,
        message: 'Webhook already processed (idempotent)'
      });
      return;
    }

    const validated = trunkWebhookPayloadSchema.safeParse(req.body);
    if (!validated.success) {
      logger.error('Invalid trunk webhook payload schema', { 
        event, 
        errors: validated.error.errors,
        body: req.body 
      });
      res.status(400).json({
        error: 'Invalid webhook payload',
        details: validated.error.errors
      });
      return;
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
          res.status(400).json({
            error: result.error || 'Failed to sync trunk'
          });
          return;
        }

        if (idempotencyKey) {
          processedWebhooks.set(idempotencyKey, Date.now());
        }

        logger.info('Trunk webhook processed successfully', {
          event,
          trunkId: result.trunkId,
          edgvoipTrunkId: trunkData.edgvoipTrunkId,
          tenantId
        });

        res.status(200).json({
          success: true,
          data: {
            trunkId: result.trunkId,
            event
          }
        });
        return;

      case 'trunk.deleted':
        result = await deleteTrunkFromWebhook(trunkData.edgvoipTrunkId, tenantId);

        if (!result.success) {
          res.status(400).json({
            error: result.error || 'Failed to delete trunk'
          });
          return;
        }

        if (idempotencyKey) {
          processedWebhooks.set(idempotencyKey, Date.now());
        }

        logger.info('Trunk deletion webhook processed successfully', {
          event,
          edgvoipTrunkId: trunkData.edgvoipTrunkId,
          tenantId
        });

        res.status(200).json({
          success: true,
          data: { event }
        });
        return;

      default:
        logger.error('Unknown trunk webhook event', { event, body: req.body, tenantId });
        res.status(400).json({
          error: `Unknown event type: ${event}`
        });
        return;
    }
  } catch (error) {
    logger.error('Error processing trunk webhook', { error, body: req.body });
    res.status(500).json({
      error: 'Internal error processing trunk webhook'
    });
  }
};

const extensionHandler: RequestHandler = async (req, res) => {
  try {
    const event = req.headers['x-edgvoip-event'] as string;
    const idempotencyKey = req.headers['x-idempotency-key'] as string;

    if (idempotencyKey && processedWebhooks.has(idempotencyKey)) {
      logger.info('Duplicate extension webhook ignored (idempotency)', {
        event,
        idempotencyKey,
        path: req.path
      });
      res.status(200).json({
        success: true,
        message: 'Webhook already processed (idempotent)'
      });
      return;
    }

    const validated = extensionWebhookPayloadSchema.safeParse(req.body);
    if (!validated.success) {
      logger.error('Invalid extension webhook payload schema', { 
        event, 
        errors: validated.error.errors,
        body: req.body 
      });
      res.status(400).json({
        error: 'Invalid webhook payload',
        details: validated.error.errors
      });
      return;
    }

    const { tenantId, extension: extensionData } = validated.data;

    switch (event) {
      case 'extension.created':
      case 'extension.updated':
        await setTenantContext(db, tenantId);

        const domainId = tenantId;

        const [upsertedExt] = await db.insert(voipExtensions)
          .values({
            tenantId,
            domainId,
            edgvoipExtensionId: extensionData.edgvoipExtensionId,
            userId: extensionData.userId || null,
            extension: extensionData.extension,
            sipUsername: extensionData.sipUsername,
            sipPassword: 'temp_' + crypto.randomBytes(16).toString('hex'),
            displayName: extensionData.displayName || extensionData.sipUsername,
            email: extensionData.email,
            sipServer: extensionData.sipServer || 'demo.edgvoip.it',
            sipPort: extensionData.sipPort || 5060,
            wsPort: extensionData.wsPort || 443,
            transport: extensionData.transport || 'wss',
            voicemailEnabled: extensionData.voicemailEnabled ?? true,
            voicemailEmail: extensionData.voicemailEmail,
            recordingEnabled: extensionData.recordingEnabled ?? false,
            dndEnabled: extensionData.dndEnabled ?? false,
            forwardOnBusy: extensionData.forwardOnBusy,
            forwardOnNoAnswer: extensionData.forwardOnNoAnswer,
            forwardUnconditional: extensionData.forwardUnconditional,
            maxConcurrentCalls: extensionData.maxConcurrentCalls || 2,
            status: extensionData.status || 'active',
            lastSyncAt: new Date()
          })
          .onConflictDoUpdate({
            target: [voipExtensions.tenantId, voipExtensions.edgvoipExtensionId],
            set: {
              ...(extensionData.userId && { userId: extensionData.userId }),
              extension: extensionData.extension,
              sipUsername: extensionData.sipUsername,
              displayName: extensionData.displayName || extensionData.sipUsername,
              email: extensionData.email,
              sipServer: extensionData.sipServer || 'demo.edgvoip.it',
              sipPort: extensionData.sipPort || 5060,
              wsPort: extensionData.wsPort || 443,
              transport: extensionData.transport || 'wss',
              voicemailEnabled: extensionData.voicemailEnabled ?? true,
              voicemailEmail: extensionData.voicemailEmail,
              recordingEnabled: extensionData.recordingEnabled ?? false,
              dndEnabled: extensionData.dndEnabled ?? false,
              forwardOnBusy: extensionData.forwardOnBusy,
              forwardOnNoAnswer: extensionData.forwardOnNoAnswer,
              forwardUnconditional: extensionData.forwardUnconditional,
              maxConcurrentCalls: extensionData.maxConcurrentCalls || 2,
              status: extensionData.status || 'active',
              lastSyncAt: new Date(),
              updatedAt: new Date()
            }
          })
          .returning();

        if (idempotencyKey) {
          processedWebhooks.set(idempotencyKey, Date.now());
        }

        logger.info('Extension webhook processed successfully', {
          event,
          extensionId: upsertedExt.id,
          edgvoipExtensionId: extensionData.edgvoipExtensionId,
          tenantId
        });

        res.status(200).json({
          success: true,
          data: {
            extensionId: upsertedExt.id,
            event
          }
        });
        return;

      case 'extension.deleted':
        await setTenantContext(db, tenantId);

        await db.update(voipExtensions)
          .set({ 
            status: 'inactive',
            updatedAt: new Date()
          })
          .where(
            and(
              eq(voipExtensions.tenantId, tenantId),
              eq(voipExtensions.edgvoipExtensionId, extensionData.edgvoipExtensionId)
            )
          );

        if (idempotencyKey) {
          processedWebhooks.set(idempotencyKey, Date.now());
        }

        logger.info('Extension deletion webhook processed successfully', {
          event,
          edgvoipExtensionId: extensionData.edgvoipExtensionId,
          tenantId
        });

        res.status(200).json({
          success: true,
          data: { event }
        });
        return;

      default:
        logger.error('Unknown extension webhook event', { event, body: req.body, tenantId });
        res.status(400).json({
          error: `Unknown event type: ${event}`
        });
        return;
    }
  } catch (error) {
    logger.error('Error processing extension webhook', { error, body: req.body });
    res.status(500).json({
      error: 'Internal error processing extension webhook'
    });
  }
};

const cdrHandler: RequestHandler = async (req, res) => {
  try {
    const idempotencyKey = req.headers['x-idempotency-key'] as string || req.body.callId;

    if (idempotencyKey && processedWebhooks.has(idempotencyKey)) {
      logger.info('Duplicate CDR webhook ignored (idempotency)', {
        callId: req.body.callId,
        idempotencyKey
      });
      res.status(200).json({
        success: true,
        message: 'CDR already processed (idempotent)'
      });
      return;
    }

    const validated = insertVoipCdrSchema.parse(req.body);

    await setTenantContext(db, validated.tenantId);

    const [cdr] = await db.insert(voipCdrs)
      .values(validated)
      .returning();

    processedWebhooks.set(idempotencyKey, Date.now());

    logger.info('CDR webhook processed successfully', {
      cdrId: cdr.id,
      callId: cdr.callId,
      tenantId: validated.tenantId,
      direction: validated.direction,
      disposition: validated.disposition
    });

    res.status(201).json({
      success: true,
      data: {
        cdrId: cdr.id,
        callId: cdr.callId
      }
    });
  } catch (error) {
    logger.error('Error processing CDR webhook', { error, body: req.body });
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid CDR payload',
        details: error.errors
      });
      return;
    }

    res.status(500).json({
      error: 'Internal error processing CDR webhook'
    });
  }
};

const statusHandler: RequestHandler = async (req, res) => {
  try {
    const { type, data } = req.body;

    logger.info('VoIP status update received', {
      type,
      data
    });

    res.status(200).json({
      success: true,
      message: 'Status update acknowledged'
    });
  } catch (error) {
    logger.error('Error processing status webhook', { error, body: req.body });
    res.status(500).json({
      error: 'Internal error processing status webhook'
    });
  }
};

router.post('/trunk', verifyEdgvoipSignature, trunkHandler);
router.post('/extension', verifyEdgvoipSignature, extensionHandler);
router.post('/cdr', verifyEdgvoipSignature, cdrHandler);
router.post('/status', verifyEdgvoipSignature, statusHandler);

export default router;
