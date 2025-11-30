/**
 * EDGVoIP Webhooks Handler
 * 
 * Handles incoming webhook events from EDGVoIP API v2.
 * 
 * Events:
 * - call.start, call.answered, call.ended
 * - trunk.status, extension.status
 * - api.error
 * 
 * Security: HMAC-SHA256 signature verification
 */

import crypto from 'crypto';
import { db, setTenantContext } from '../../core/db';
import { logger } from '../../core/logger';
import { eq, and } from 'drizzle-orm';
import { 
  voipTrunks, 
  voipExtensions, 
  voipCdrs, 
  voipActivityLog,
  voipTenantConfig,
  notifications 
} from '../../db/schema/w3suite';
import type {
  WebhookEvent,
  CallStartEvent,
  CallAnsweredEvent,
  CallEndedEvent,
  TrunkStatusEvent,
  ExtensionStatusEvent,
  ApiErrorEvent
} from './types';

export interface WebhookHandlerResult {
  success: boolean;
  event?: string;
  error?: string;
}

/**
 * Verify webhook signature using HMAC-SHA256
 */
export function verifySignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(typeof payload === 'string' ? payload : payload.toString())
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logger.error('Signature verification failed', { error });
    return false;
  }
}

/**
 * Get webhook secret for tenant
 */
export async function getWebhookSecret(tenantExternalId: string): Promise<string | null> {
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

/**
 * Get tenant ID from external ID
 */
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

/**
 * Log webhook activity
 */
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

/**
 * Handle call.start event
 */
async function handleCallStart(event: CallStartEvent): Promise<WebhookHandlerResult> {
  const tenantId = await getTenantIdFromExternalId(event.tenant_external_id);
  
  if (!tenantId) {
    return { success: false, error: 'Tenant not found' };
  }

  await setTenantContext(db, tenantId);

  logger.info('Call started', {
    tenantId,
    callUuid: event.data.call_uuid,
    direction: event.data.call_direction,
    caller: event.data.caller_id_number,
    destination: event.data.destination_number
  });

  await logWebhookActivity(tenantId, 'call.start', 'cdr', event.data.call_uuid, 'ok', event.data);

  return { success: true, event: 'call.start' };
}

/**
 * Handle call.answered event
 */
async function handleCallAnswered(event: CallAnsweredEvent): Promise<WebhookHandlerResult> {
  const tenantId = await getTenantIdFromExternalId(event.tenant_external_id);
  
  if (!tenantId) {
    return { success: false, error: 'Tenant not found' };
  }

  await setTenantContext(db, tenantId);

  logger.info('Call answered', {
    tenantId,
    callUuid: event.data.call_uuid,
    direction: event.data.call_direction
  });

  await logWebhookActivity(tenantId, 'call.answered', 'cdr', event.data.call_uuid, 'ok', event.data);

  return { success: true, event: 'call.answered' };
}

/**
 * Handle call.ended event - Create CDR record
 */
async function handleCallEnded(event: CallEndedEvent): Promise<WebhookHandlerResult> {
  const tenantId = await getTenantIdFromExternalId(event.tenant_external_id);
  
  if (!tenantId) {
    return { success: false, error: 'Tenant not found' };
  }

  await setTenantContext(db, tenantId);

  try {
    // Create CDR record
    await db.insert(voipCdrs).values({
      tenantId,
      edgvoipCallId: event.data.call_uuid,
      callUuid: event.data.call_uuid,
      direction: event.data.call_direction,
      callerNumber: event.data.caller_id_number,
      calledNumber: event.data.destination_number,
      startTime: new Date(event.data.start_time),
      answerTime: event.data.answer_time ? new Date(event.data.answer_time) : null,
      endTime: new Date(event.data.end_time),
      duration: event.data.duration,
      billSec: event.data.bill_sec,
      hangupCause: event.data.hangup_cause,
      disposition: event.data.hangup_disposition,
      syncSource: 'edgvoip'
    });

    logger.info('CDR created from webhook', {
      tenantId,
      callUuid: event.data.call_uuid,
      duration: event.data.duration,
      disposition: event.data.hangup_disposition
    });

    await logWebhookActivity(tenantId, 'call.ended', 'cdr', event.data.call_uuid, 'ok', {
      duration: event.data.duration,
      disposition: event.data.hangup_disposition
    });

    return { success: true, event: 'call.ended' };
  } catch (error) {
    logger.error('Failed to create CDR', { error, event });
    await logWebhookActivity(tenantId, 'call.ended', 'cdr', event.data.call_uuid, 'fail', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return { success: false, error: 'Failed to create CDR' };
  }
}

/**
 * Handle trunk.status event
 */
async function handleTrunkStatus(event: TrunkStatusEvent): Promise<WebhookHandlerResult> {
  const tenantId = await getTenantIdFromExternalId(event.tenant_external_id);
  
  if (!tenantId) {
    return { success: false, error: 'Tenant not found' };
  }

  await setTenantContext(db, tenantId);

  try {
    // Update trunk status in database
    const [updated] = await db.update(voipTrunks)
      .set({
        registrationStatus: event.data.current_status,
        lastSyncAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(voipTrunks.externalId, event.data.trunk_id))
      .returning();

    if (updated) {
      logger.info('Trunk status updated', {
        tenantId,
        trunkId: event.data.trunk_id,
        previousStatus: event.data.previous_status,
        currentStatus: event.data.current_status
      });

      // Send notification if trunk went down
      if (event.data.current_status === 'unregistered' || event.data.current_status === 'failed') {
        await db.insert(notifications).values({
          tenantId,
          userId: null, // System notification
          title: `Trunk ${event.data.trunk_name} Offline`,
          message: `Il trunk ${event.data.trunk_name} è passato da ${event.data.previous_status} a ${event.data.current_status}`,
          type: 'warning',
          category: 'system',
          priority: 'high'
        });
      }

      await logWebhookActivity(tenantId, 'trunk.status', 'trunk', event.data.trunk_id, 'ok', {
        previousStatus: event.data.previous_status,
        currentStatus: event.data.current_status
      });

      return { success: true, event: 'trunk.status' };
    }

    return { success: false, error: 'Trunk not found' };
  } catch (error) {
    logger.error('Failed to update trunk status', { error, event });
    return { success: false, error: 'Failed to update trunk status' };
  }
}

/**
 * Handle extension.status event
 */
async function handleExtensionStatus(event: ExtensionStatusEvent): Promise<WebhookHandlerResult> {
  const tenantId = await getTenantIdFromExternalId(event.tenant_external_id);
  
  if (!tenantId) {
    return { success: false, error: 'Tenant not found' };
  }

  await setTenantContext(db, tenantId);

  try {
    // Update extension status in database
    const [updated] = await db.update(voipExtensions)
      .set({
        registrationStatus: event.data.current_status,
        ipAddress: event.data.registration_ip,
        lastRegistration: new Date(),
        lastSyncAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(voipExtensions.externalId, event.data.extension_id))
      .returning();

    if (updated) {
      logger.info('Extension status updated', {
        tenantId,
        extensionId: event.data.extension_id,
        extension: event.data.extension,
        previousStatus: event.data.previous_status,
        currentStatus: event.data.current_status
      });

      await logWebhookActivity(tenantId, 'extension.status', 'ext', event.data.extension_id, 'ok', {
        extension: event.data.extension,
        previousStatus: event.data.previous_status,
        currentStatus: event.data.current_status
      });

      return { success: true, event: 'extension.status' };
    }

    return { success: false, error: 'Extension not found' };
  } catch (error) {
    logger.error('Failed to update extension status', { error, event });
    return { success: false, error: 'Failed to update extension status' };
  }
}

/**
 * Handle api.error event
 */
async function handleApiError(event: ApiErrorEvent): Promise<WebhookHandlerResult> {
  const tenantId = await getTenantIdFromExternalId(event.tenant_external_id);
  
  if (!tenantId) {
    return { success: false, error: 'Tenant not found' };
  }

  await setTenantContext(db, tenantId);

  logger.warn('EDGVoIP API error received', {
    tenantId,
    requestId: event.data.request_id,
    endpoint: event.data.endpoint,
    statusCode: event.data.status_code,
    errorCode: event.data.error_code,
    errorMessage: event.data.error_message
  });

  await logWebhookActivity(tenantId, 'api.error', 'trunk', event.data.request_id, 'fail', event.data);

  // Send notification for critical errors
  if (event.data.status_code >= 500) {
    await db.insert(notifications).values({
      tenantId,
      userId: null,
      title: 'Errore API EDGVoIP',
      message: `Errore ${event.data.status_code}: ${event.data.error_message}`,
      type: 'error',
      category: 'system',
      priority: 'high'
    });
  }

  return { success: true, event: 'api.error' };
}

/**
 * Main webhook handler - routes events to appropriate handlers
 */
export async function handleWebhookEvent(event: WebhookEvent): Promise<WebhookHandlerResult> {
  logger.info('Received webhook event', {
    type: event.type,
    tenantExternalId: event.tenant_external_id,
    timestamp: event.timestamp
  });

  switch (event.type) {
    case 'call.start':
      return handleCallStart(event);
    case 'call.answered':
      return handleCallAnswered(event);
    case 'call.ended':
      return handleCallEnded(event);
    case 'trunk.status':
      return handleTrunkStatus(event);
    case 'extension.status':
      return handleExtensionStatus(event);
    case 'api.error':
      return handleApiError(event);
    default:
      logger.warn('Unknown webhook event type', { type: (event as any).type });
      return { success: false, error: `Unknown event type: ${(event as any).type}` };
  }
}

/**
 * Validate and process incoming webhook request
 */
export async function processWebhook(
  rawBody: string,
  signature: string,
  tenantExternalId: string
): Promise<WebhookHandlerResult> {
  // Get webhook secret for tenant
  const secret = await getWebhookSecret(tenantExternalId);
  
  if (!secret) {
    logger.error('Webhook secret not found', { tenantExternalId });
    return { success: false, error: 'Webhook secret not configured' };
  }

  // Verify signature
  if (!verifySignature(rawBody, signature, secret)) {
    logger.error('Invalid webhook signature', { tenantExternalId });
    return { success: false, error: 'Invalid signature' };
  }

  // Parse and handle event
  try {
    const event = JSON.parse(rawBody) as WebhookEvent;
    return handleWebhookEvent(event);
  } catch (error) {
    logger.error('Failed to parse webhook payload', { error });
    return { success: false, error: 'Invalid payload' };
  }
}
