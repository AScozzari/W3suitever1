/**
 * EDGVoIP Unified Webhook Endpoint
 * 
 * Single endpoint to receive ALL webhook events from EDGVoIP:
 * - Trunk events: trunk.created, trunk.updated, trunk.deleted, trunk.status
 * - Extension events: extension.created, extension.updated, extension.deleted, extension.status
 * - Call events: call.start, call.answered, call.ended
 * - CDR events: cdr.created
 * - API events: api.error
 * 
 * Security:
 * - HMAC-SHA256 signature verification via X-Edgvoip-Signature header
 * - Tenant isolation via RLS (setTenantContext)
 * - Replay attack protection via timestamp validation
 * 
 * URL: POST /api/webhooks/edgvoip
 */

import express, { Request, Response, RequestHandler } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { db, setTenantContext } from '../core/db';
import { logger, correlationMiddleware } from '../core/logger';
import { eq, and } from 'drizzle-orm';
import {
  voipTrunks,
  voipExtensions,
  voipCdrs,
  voipActivityLog,
  voipTenantConfig,
  notifications,
  tenants,
  stores
} from '../db/schema/w3suite';
import { nanoid } from 'nanoid';

const router = express.Router();

router.use(correlationMiddleware);

router.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

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

const webhookPayloadSchema = z.object({
  type: z.string(),
  tenant_external_id: z.string(),
  store_id: z.string().uuid().optional(),
  timestamp: z.string(),
  data: z.record(z.any())
});

type WebhookEventType = 
  | 'trunk.created' | 'trunk.updated' | 'trunk.deleted' | 'trunk.status'
  | 'extension.created' | 'extension.updated' | 'extension.deleted' | 'extension.status'
  | 'call.start' | 'call.answered' | 'call.ended'
  | 'cdr.created'
  | 'api.error';

interface WebhookResult {
  success: boolean;
  event?: string;
  error?: string;
  data?: any;
}

async function getWebhookSecret(tenantExternalId: string): Promise<string | null> {
  try {
    const [config] = await db.select()
      .from(voipTenantConfig)
      .where(eq(voipTenantConfig.tenantExternalId, tenantExternalId))
      .limit(1);
    return config?.webhookSecret || null;
  } catch (error) {
    logger.error('Failed to get webhook secret', { error, tenantExternalId });
    return null;
  }
}

async function getTenantIdFromExternalId(tenantExternalId: string): Promise<string | null> {
  try {
    const [config] = await db.select()
      .from(voipTenantConfig)
      .where(eq(voipTenantConfig.tenantExternalId, tenantExternalId))
      .limit(1);
    return config?.tenantId || null;
  } catch (error) {
    logger.error('Failed to get tenant ID', { error, tenantExternalId });
    return null;
  }
}

async function validateTenantAndStore(tenantId: string, storeId?: string): Promise<boolean> {
  try {
    const [tenant] = await db.select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      logger.error('Webhook received for non-existent tenant', { tenantId });
      return false;
    }

    if (storeId) {
      const [store] = await db.select()
        .from(stores)
        .where(and(eq(stores.id, storeId), eq(stores.tenantId, tenantId)))
        .limit(1);

      if (!store) {
        logger.error('Webhook received for non-existent store', { tenantId, storeId });
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error('Error validating tenant and store', { error, tenantId, storeId });
    return false;
  }
}

function verifySignature(rawBody: Buffer, signature: string, secret: string, timestamp: string, method: string, path: string): boolean {
  try {
    const bodyString = rawBody.toString('utf8');
    const payload = `${timestamp}.${method}.${path}.${bodyString}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    logger.error('Signature verification failed', { error });
    return false;
  }
}

async function logWebhookActivity(
  tenantId: string,
  eventType: string,
  targetType: 'trunk' | 'ext' | 'cdr',
  targetId: string,
  status: 'ok' | 'fail',
  details?: any
): Promise<void> {
  try {
    await db.insert(voipActivityLog).values({
      tenantId,
      actor: 'system:edgvoip-webhook',
      action: 'sync',
      targetType,
      targetId,
      status,
      detailsJson: { eventType, ...details }
    });
  } catch (error) {
    logger.error('Failed to log webhook activity', { error, tenantId, eventType });
  }
}

async function handleTrunkCreatedOrUpdated(tenantId: string, storeId: string | undefined, data: any): Promise<WebhookResult> {
  await setTenantContext(db, tenantId);

  const edgvoipTrunkId = data.trunk_id || data.edgvoip_trunk_id || data.id;
  
  if (!edgvoipTrunkId) {
    return { success: false, error: 'Missing trunk_id in payload' };
  }

  const [existing] = await db.select()
    .from(voipTrunks)
    .where(eq(voipTrunks.edgvoipTrunkId, edgvoipTrunkId))
    .limit(1);

  const trunkData = {
    tenantId,
    storeId: storeId || existing?.storeId || tenantId,
    edgvoipTrunkId,
    syncSource: 'edgvoip' as const,
    lastSyncAt: new Date(),
    name: data.name || data.trunk_name || existing?.name || 'Unknown Trunk',
    provider: data.provider || existing?.provider || null,
    host: data.host || existing?.host || null,
    port: data.port || existing?.port || 5060,
    protocol: data.protocol || existing?.protocol || 'udp',
    didRange: data.did_range || data.didRange || existing?.didRange || null,
    maxChannels: data.max_channels || data.maxChannels || existing?.maxChannels || 10,
    status: data.status || existing?.status || 'active',
    aiAgentEnabled: data.ai_agent_enabled ?? existing?.aiAgentEnabled ?? false,
    aiAgentRef: data.ai_agent_ref || existing?.aiAgentRef || null,
    aiTimePolicy: data.ai_time_policy || existing?.aiTimePolicy || null,
    aiFailoverExtension: data.ai_failover_extension || existing?.aiFailoverExtension || null,
    webhookToken: existing?.webhookToken || nanoid(32),
    updatedAt: new Date()
  };

  let result;
  if (existing) {
    [result] = await db.update(voipTrunks)
      .set(trunkData)
      .where(eq(voipTrunks.id, existing.id))
      .returning();
    
    await logWebhookActivity(tenantId, 'trunk.updated', 'trunk', result.id, 'ok', { edgvoipTrunkId });
  } else {
    [result] = await db.insert(voipTrunks)
      .values(trunkData)
      .returning();
    
    await logWebhookActivity(tenantId, 'trunk.created', 'trunk', result.id, 'ok', { edgvoipTrunkId });
  }

  logger.info('Trunk synced from webhook', {
    trunkId: result.id,
    edgvoipTrunkId,
    tenantId,
    action: existing ? 'updated' : 'created'
  });

  return { success: true, event: existing ? 'trunk.updated' : 'trunk.created', data: { trunkId: result.id } };
}

async function handleTrunkDeleted(tenantId: string, data: any): Promise<WebhookResult> {
  await setTenantContext(db, tenantId);

  const edgvoipTrunkId = data.trunk_id || data.edgvoip_trunk_id || data.id;
  
  if (!edgvoipTrunkId) {
    return { success: false, error: 'Missing trunk_id in payload' };
  }

  const [existing] = await db.select()
    .from(voipTrunks)
    .where(eq(voipTrunks.edgvoipTrunkId, edgvoipTrunkId))
    .limit(1);

  if (!existing) {
    return { success: true, event: 'trunk.deleted' };
  }

  await db.update(voipTrunks)
    .set({ status: 'inactive', lastSyncAt: new Date(), updatedAt: new Date() })
    .where(eq(voipTrunks.id, existing.id));

  await logWebhookActivity(tenantId, 'trunk.deleted', 'trunk', existing.id, 'ok', { edgvoipTrunkId });

  logger.info('Trunk soft-deleted from webhook', { trunkId: existing.id, edgvoipTrunkId, tenantId });

  return { success: true, event: 'trunk.deleted' };
}

async function handleTrunkStatus(tenantId: string, data: any): Promise<WebhookResult> {
  await setTenantContext(db, tenantId);

  const trunkId = data.trunk_id || data.id;
  const currentStatus = data.current_status || data.status;
  const previousStatus = data.previous_status;

  const [updated] = await db.update(voipTrunks)
    .set({
      registrationStatus: currentStatus,
      lastSyncAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(voipTrunks.externalId, trunkId))
    .returning();

  if (updated) {
    if (currentStatus === 'unregistered' || currentStatus === 'failed') {
      await db.insert(notifications).values({
        tenantId,
        userId: null,
        title: `Trunk ${data.trunk_name || trunkId} Offline`,
        message: `Il trunk ${data.trunk_name || trunkId} è passato da ${previousStatus} a ${currentStatus}`,
        type: 'warning',
        category: 'system',
        priority: 'high'
      } as any);
    }

    await logWebhookActivity(tenantId, 'trunk.status', 'trunk', trunkId, 'ok', { previousStatus, currentStatus });
    
    logger.info('Trunk status updated', { tenantId, trunkId, previousStatus, currentStatus });

    return { success: true, event: 'trunk.status' };
  }

  return { success: false, error: 'Trunk not found' };
}

async function handleExtensionCreatedOrUpdated(tenantId: string, data: any): Promise<WebhookResult> {
  await setTenantContext(db, tenantId);

  const edgvoipExtensionId = data.extension_id || data.edgvoip_extension_id || data.id;
  
  if (!edgvoipExtensionId) {
    return { success: false, error: 'Missing extension_id in payload' };
  }

  const [existing] = await db.select()
    .from(voipExtensions)
    .where(and(
      eq(voipExtensions.tenantId, tenantId),
      eq(voipExtensions.edgvoipExtensionId, edgvoipExtensionId)
    ))
    .limit(1);

  const extensionData = {
    tenantId,
    domainId: tenantId,
    edgvoipExtensionId,
    userId: data.user_id || existing?.userId || null,
    extension: data.extension || existing?.extension || '',
    sipUsername: data.sip_username || existing?.sipUsername || '',
    sipPassword: existing?.sipPassword || 'temp_' + crypto.randomBytes(16).toString('hex'),
    displayName: data.display_name || existing?.displayName || data.sip_username || '',
    email: data.email || existing?.email || null,
    sipServer: data.sip_server || existing?.sipServer || 'demo.edgvoip.it',
    sipPort: data.sip_port || existing?.sipPort || 5060,
    wsPort: data.ws_port || existing?.wsPort || 443,
    transport: data.transport || existing?.transport || 'wss',
    voicemailEnabled: data.voicemail_enabled ?? existing?.voicemailEnabled ?? true,
    voicemailEmail: data.voicemail_email || existing?.voicemailEmail || null,
    recordingEnabled: data.recording_enabled ?? existing?.recordingEnabled ?? false,
    dndEnabled: data.dnd_enabled ?? existing?.dndEnabled ?? false,
    forwardOnBusy: data.forward_on_busy || existing?.forwardOnBusy || null,
    forwardOnNoAnswer: data.forward_on_no_answer || existing?.forwardOnNoAnswer || null,
    forwardUnconditional: data.forward_unconditional || existing?.forwardUnconditional || null,
    maxConcurrentCalls: data.max_concurrent_calls || existing?.maxConcurrentCalls || 2,
    status: data.status || existing?.status || 'active',
    lastSyncAt: new Date(),
    updatedAt: new Date()
  };

  let result;
  if (existing) {
    [result] = await db.update(voipExtensions)
      .set(extensionData)
      .where(eq(voipExtensions.id, existing.id))
      .returning();
    
    await logWebhookActivity(tenantId, 'extension.updated', 'ext', result.id, 'ok', { edgvoipExtensionId });
  } else {
    [result] = await db.insert(voipExtensions)
      .values(extensionData)
      .returning();
    
    await logWebhookActivity(tenantId, 'extension.created', 'ext', result.id, 'ok', { edgvoipExtensionId });
  }

  logger.info('Extension synced from webhook', {
    extensionId: result.id,
    edgvoipExtensionId,
    tenantId,
    action: existing ? 'updated' : 'created'
  });

  return { success: true, event: existing ? 'extension.updated' : 'extension.created', data: { extensionId: result.id } };
}

async function handleExtensionDeleted(tenantId: string, data: any): Promise<WebhookResult> {
  await setTenantContext(db, tenantId);

  const edgvoipExtensionId = data.extension_id || data.edgvoip_extension_id || data.id;
  
  await db.update(voipExtensions)
    .set({ status: 'inactive', updatedAt: new Date() })
    .where(and(
      eq(voipExtensions.tenantId, tenantId),
      eq(voipExtensions.edgvoipExtensionId, edgvoipExtensionId)
    ));

  await logWebhookActivity(tenantId, 'extension.deleted', 'ext', edgvoipExtensionId, 'ok');

  logger.info('Extension soft-deleted from webhook', { edgvoipExtensionId, tenantId });

  return { success: true, event: 'extension.deleted' };
}

async function handleExtensionStatus(tenantId: string, data: any): Promise<WebhookResult> {
  await setTenantContext(db, tenantId);

  const extensionId = data.extension_id || data.id;
  const currentStatus = data.current_status || data.status;

  const [updated] = await db.update(voipExtensions)
    .set({
      registrationStatus: currentStatus,
      ipAddress: data.registration_ip || null,
      lastRegistration: new Date(),
      lastSyncAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(voipExtensions.externalId, extensionId))
    .returning();

  if (updated) {
    await logWebhookActivity(tenantId, 'extension.status', 'ext', extensionId, 'ok', {
      extension: data.extension,
      previousStatus: data.previous_status,
      currentStatus
    });

    logger.info('Extension status updated', { tenantId, extensionId, currentStatus });

    return { success: true, event: 'extension.status' };
  }

  return { success: false, error: 'Extension not found' };
}

async function handleCallStart(tenantId: string, data: any): Promise<WebhookResult> {
  await setTenantContext(db, tenantId);

  logger.info('Call started', {
    tenantId,
    callUuid: data.call_uuid,
    direction: data.call_direction,
    caller: data.caller_id_number,
    destination: data.destination_number
  });

  await logWebhookActivity(tenantId, 'call.start', 'cdr', data.call_uuid, 'ok', data);

  return { success: true, event: 'call.start' };
}

async function handleCallAnswered(tenantId: string, data: any): Promise<WebhookResult> {
  await setTenantContext(db, tenantId);

  logger.info('Call answered', {
    tenantId,
    callUuid: data.call_uuid,
    direction: data.call_direction
  });

  await logWebhookActivity(tenantId, 'call.answered', 'cdr', data.call_uuid, 'ok', data);

  return { success: true, event: 'call.answered' };
}

async function handleCallEnded(tenantId: string, data: any): Promise<WebhookResult> {
  await setTenantContext(db, tenantId);

  try {
    await db.insert(voipCdrs).values({
      tenantId,
      edgvoipCallId: data.call_uuid,
      callUuid: data.call_uuid,
      direction: data.call_direction,
      callerNumber: data.caller_id_number,
      calledNumber: data.destination_number,
      startTime: new Date(data.start_time),
      answerTime: data.answer_time ? new Date(data.answer_time) : null,
      endTime: new Date(data.end_time),
      duration: data.duration,
      billSec: data.bill_sec,
      hangupCause: data.hangup_cause,
      disposition: data.hangup_disposition,
      syncSource: 'edgvoip'
    });

    logger.info('CDR created from call.ended webhook', {
      tenantId,
      callUuid: data.call_uuid,
      duration: data.duration,
      disposition: data.hangup_disposition
    });

    await logWebhookActivity(tenantId, 'call.ended', 'cdr', data.call_uuid, 'ok', {
      duration: data.duration,
      disposition: data.hangup_disposition
    });

    return { success: true, event: 'call.ended' };
  } catch (error) {
    logger.error('Failed to create CDR from call.ended', { error, data });
    await logWebhookActivity(tenantId, 'call.ended', 'cdr', data.call_uuid, 'fail', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return { success: false, error: 'Failed to create CDR' };
  }
}

async function handleCdrCreated(tenantId: string, data: any): Promise<WebhookResult> {
  await setTenantContext(db, tenantId);

  try {
    const [cdr] = await db.insert(voipCdrs)
      .values({
        tenantId,
        edgvoipCallId: data.call_id || data.call_uuid,
        callUuid: data.call_uuid,
        direction: data.direction || data.call_direction,
        callerNumber: data.caller_number || data.caller_id_number,
        calledNumber: data.called_number || data.destination_number,
        startTime: data.start_time ? new Date(data.start_time) : new Date(),
        answerTime: data.answer_time ? new Date(data.answer_time) : null,
        endTime: data.end_time ? new Date(data.end_time) : null,
        duration: data.duration || 0,
        billSec: data.bill_sec || data.billable_seconds || 0,
        hangupCause: data.hangup_cause,
        disposition: data.disposition || data.hangup_disposition,
        syncSource: 'edgvoip'
      })
      .returning();

    await logWebhookActivity(tenantId, 'cdr.created', 'cdr', cdr.id, 'ok');

    logger.info('CDR created from webhook', { cdrId: cdr.id, tenantId });

    return { success: true, event: 'cdr.created', data: { cdrId: cdr.id } };
  } catch (error) {
    logger.error('Failed to create CDR', { error, data });
    return { success: false, error: 'Failed to create CDR' };
  }
}

async function handleApiError(tenantId: string, data: any): Promise<WebhookResult> {
  await setTenantContext(db, tenantId);

  logger.warn('EDGVoIP API error received', {
    tenantId,
    requestId: data.request_id,
    endpoint: data.endpoint,
    statusCode: data.status_code,
    errorCode: data.error_code,
    errorMessage: data.error_message
  });

  await logWebhookActivity(tenantId, 'api.error', 'trunk', data.request_id, 'fail', data);

  if (data.status_code >= 500) {
    await db.insert(notifications).values({
      tenantId,
      userId: null,
      title: 'Errore API EDGVoIP',
      message: `Errore ${data.status_code}: ${data.error_message}`,
      type: 'error',
      category: 'system',
      priority: 'high'
    } as any);
  }

  return { success: true, event: 'api.error' };
}

async function routeWebhookEvent(
  eventType: WebhookEventType,
  tenantId: string,
  storeId: string | undefined,
  data: any
): Promise<WebhookResult> {
  switch (eventType) {
    case 'trunk.created':
    case 'trunk.updated':
      return handleTrunkCreatedOrUpdated(tenantId, storeId, data);
    case 'trunk.deleted':
      return handleTrunkDeleted(tenantId, data);
    case 'trunk.status':
      return handleTrunkStatus(tenantId, data);
    case 'extension.created':
    case 'extension.updated':
      return handleExtensionCreatedOrUpdated(tenantId, data);
    case 'extension.deleted':
      return handleExtensionDeleted(tenantId, data);
    case 'extension.status':
      return handleExtensionStatus(tenantId, data);
    case 'call.start':
      return handleCallStart(tenantId, data);
    case 'call.answered':
      return handleCallAnswered(tenantId, data);
    case 'call.ended':
      return handleCallEnded(tenantId, data);
    case 'cdr.created':
      return handleCdrCreated(tenantId, data);
    case 'api.error':
      return handleApiError(tenantId, data);
    default:
      logger.warn('Unknown webhook event type', { eventType });
      return { success: false, error: `Unknown event type: ${eventType}` };
  }
}

const webhookHandler: RequestHandler = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const signature = req.headers['x-edgvoip-signature'] as string;
    const timestamp = req.headers['x-edgvoip-timestamp'] as string;
    const idempotencyKey = req.headers['x-idempotency-key'] as string;

    if (idempotencyKey && processedWebhooks.has(idempotencyKey)) {
      logger.info('Duplicate webhook ignored (idempotency)', { idempotencyKey });
      res.status(200).json({
        success: true,
        message: 'Webhook already processed (idempotent)'
      });
      return;
    }

    const validated = webhookPayloadSchema.safeParse(req.body);
    if (!validated.success) {
      logger.error('Invalid webhook payload schema', { errors: validated.error.errors, body: req.body });
      res.status(400).json({
        error: 'Invalid webhook payload',
        details: validated.error.errors
      });
      return;
    }

    const { type, tenant_external_id, store_id, data } = validated.data;
    const eventType = type as WebhookEventType;

    logger.info('Webhook received', { type: eventType, tenant_external_id, store_id });

    const tenantId = await getTenantIdFromExternalId(tenant_external_id);
    if (!tenantId) {
      logger.error('Tenant not found for external ID', { tenant_external_id });
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    const secret = await getWebhookSecret(tenant_external_id);
    if (secret && signature && timestamp) {
      const rawBody = (req as any).rawBody;
      if (rawBody) {
        const path = req.originalUrl || req.url;
        const isValid = verifySignature(rawBody, signature, secret, timestamp, req.method, path);
        
        if (!isValid) {
          logger.error('Invalid webhook signature', { tenant_external_id, eventType });
          res.status(401).json({ error: 'Invalid signature' });
          return;
        }

        const requestTime = parseInt(timestamp, 10);
        const timeDiff = Math.abs(Date.now() - requestTime);
        if (timeDiff > TIMESTAMP_TOLERANCE_MS) {
          logger.error('Webhook timestamp too old', { tenant_external_id, timeDiff });
          res.status(401).json({ error: 'Timestamp too old (replay protection)' });
          return;
        }
      }
    } else if (!secret) {
      logger.warn('No webhook secret configured, skipping signature verification', { tenant_external_id });
    }

    const isValid = await validateTenantAndStore(tenantId, store_id);
    if (!isValid) {
      res.status(400).json({ error: 'Invalid tenant or store' });
      return;
    }

    const result = await routeWebhookEvent(eventType, tenantId, store_id, data);

    if (idempotencyKey && result.success) {
      processedWebhooks.set(idempotencyKey, Date.now());
    }

    const executionTime = Date.now() - startTime;

    logger.info('Webhook processed', {
      type: eventType,
      tenant_external_id,
      tenantId,
      success: result.success,
      executionTimeMs: executionTime
    });

    if (result.success) {
      res.status(200).json({
        success: true,
        event: result.event,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('Error processing webhook', { error, body: req.body });
    res.status(500).json({
      error: 'Internal error processing webhook'
    });
  }
};

router.post('/', webhookHandler);

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'edgvoip-webhook',
    timestamp: new Date().toISOString()
  });
});

export default router;
