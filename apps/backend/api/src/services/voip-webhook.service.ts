/**
 * VoIP Webhook Service
 * 
 * Handles trunk synchronization from edgvoip PBX via webhooks
 * Responsible for upserting trunk data and maintaining sync state
 */

import { db, setTenantContext } from '../core/db';
import { logger } from '../core/logger';
import { eq, and } from 'drizzle-orm';
import { voipTrunks, tenants, stores, voipActivityLog } from '../db/schema/w3suite';

export interface EdgvoipTrunkPayload {
  edgvoipTrunkId: string;
  tenantId: string;
  storeId: string;
  name: string;
  provider?: string;
  host?: string;
  port?: number;
  protocol?: 'udp' | 'tcp' | 'tls';
  didRange?: string;
  maxChannels?: number;
  status?: 'active' | 'inactive' | 'error';
  aiAgentEnabled?: boolean;
  aiAgentRef?: string;
  aiTimePolicy?: any; // JSON object
  aiFailoverExtension?: string;
}

export interface TrunkWebhookEvent {
  event: 'trunk.created' | 'trunk.updated' | 'trunk.deleted';
  timestamp: string;
  tenantId: string;
  storeId: string;
  trunk: EdgvoipTrunkPayload;
}

/**
 * Validate that tenant and store exist before syncing trunk
 */
const validateTenantAndStore = async (tenantId: string, storeId: string): Promise<boolean> => {
  try {
    // Check tenant exists
    const [tenant] = await db.select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      logger.error('Webhook received for non-existent tenant', { tenantId, storeId });
      return false;
    }

    // Check store exists and belongs to tenant
    const [store] = await db.select()
      .from(stores)
      .where(and(
        eq(stores.id, storeId),
        eq(stores.tenantId, tenantId)
      ))
      .limit(1);

    if (!store) {
      logger.error('Webhook received for non-existent store', { tenantId, storeId });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error validating tenant and store', { error, tenantId, storeId });
    return false;
  }
};

/**
 * Log activity to voip_activity_log table
 */
const logTrunkActivity = async (
  tenantId: string,
  action: 'create' | 'update' | 'delete' | 'sync',
  trunkId: string,
  status: 'ok' | 'fail',
  details?: any
) => {
  try {
    await db.insert(voipActivityLog).values({
      tenantId,
      actor: 'system:edgvoip-webhook',
      action,
      targetType: 'trunk',
      targetId: trunkId,
      status,
      detailsJson: details
    });
  } catch (error) {
    logger.error('Failed to log trunk activity', { error, tenantId, action, trunkId });
  }
};

/**
 * Handle trunk.created or trunk.updated events
 * Performs upsert (insert if new, update if exists)
 */
export const upsertTrunkFromWebhook = async (payload: EdgvoipTrunkPayload): Promise<{
  success: boolean;
  trunkId?: string;
  error?: string;
}> => {
  try {
    const { edgvoipTrunkId, tenantId, storeId } = payload;

    // Validate tenant and store exist
    const isValid = await validateTenantAndStore(tenantId, storeId);
    if (!isValid) {
      await logTrunkActivity(tenantId, 'sync', edgvoipTrunkId, 'fail', {
        reason: 'Invalid tenant or store',
        payload
      });
      return {
        success: false,
        error: 'Invalid tenant or store'
      };
    }

    // Set tenant context for RLS
    await setTenantContext(db, tenantId);

    // Check if trunk already exists (by edgvoipTrunkId)
    const [existing] = await db.select()
      .from(voipTrunks)
      .where(eq(voipTrunks.edgvoipTrunkId, edgvoipTrunkId))
      .limit(1);

    const trunkData = {
      tenantId,
      storeId,
      edgvoipTrunkId,
      syncSource: 'edgvoip' as const,
      lastSyncAt: new Date(),
      name: payload.name,
      provider: payload.provider || null,
      host: payload.host || null,
      port: payload.port || 5060,
      protocol: payload.protocol || 'udp',
      didRange: payload.didRange || null,
      maxChannels: payload.maxChannels || 10,
      status: payload.status || 'active',
      aiAgentEnabled: payload.aiAgentEnabled || false,
      aiAgentRef: payload.aiAgentRef || null,
      aiTimePolicy: payload.aiTimePolicy || null,
      aiFailoverExtension: payload.aiFailoverExtension || null,
      updatedAt: new Date()
    };

    let result;
    if (existing) {
      // Update existing trunk
      [result] = await db.update(voipTrunks)
        .set(trunkData)
        .where(eq(voipTrunks.id, existing.id))
        .returning();

      logger.info('Trunk updated from edgvoip webhook', {
        trunkId: result.id,
        edgvoipTrunkId,
        tenantId,
        storeId,
        name: payload.name
      });

      await logTrunkActivity(tenantId, 'update', result.id, 'ok', {
        edgvoipTrunkId,
        changes: trunkData
      });
    } else {
      // Insert new trunk
      [result] = await db.insert(voipTrunks)
        .values(trunkData)
        .returning();

      logger.info('Trunk created from edgvoip webhook', {
        trunkId: result.id,
        edgvoipTrunkId,
        tenantId,
        storeId,
        name: payload.name
      });

      await logTrunkActivity(tenantId, 'create', result.id, 'ok', {
        edgvoipTrunkId,
        trunk: trunkData
      });
    }

    return {
      success: true,
      trunkId: result.id
    };
  } catch (error) {
    logger.error('Error upserting trunk from webhook', { error, payload });
    await logTrunkActivity(payload.tenantId, 'sync', payload.edgvoipTrunkId, 'fail', {
      error: String(error),
      payload
    });
    return {
      success: false,
      error: 'Internal error processing trunk webhook'
    };
  }
};

/**
 * Handle trunk.deleted events
 * Soft delete or remove trunk entry
 */
export const deleteTrunkFromWebhook = async (
  edgvoipTrunkId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    await setTenantContext(db, tenantId);

    // Find trunk by edgvoipTrunkId
    const [existing] = await db.select()
      .from(voipTrunks)
      .where(eq(voipTrunks.edgvoipTrunkId, edgvoipTrunkId))
      .limit(1);

    if (!existing) {
      logger.warn('Trunk delete webhook for non-existent trunk', { edgvoipTrunkId, tenantId });
      return {
        success: true // Idempotent - already deleted
      };
    }

    // Soft delete: mark as inactive
    await db.update(voipTrunks)
      .set({
        status: 'inactive',
        lastSyncAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(voipTrunks.id, existing.id));

    logger.info('Trunk soft-deleted from edgvoip webhook', {
      trunkId: existing.id,
      edgvoipTrunkId,
      tenantId
    });

    await logTrunkActivity(tenantId, 'delete', existing.id, 'ok', {
      edgvoipTrunkId,
      action: 'soft_delete'
    });

    return { success: true };
  } catch (error) {
    logger.error('Error deleting trunk from webhook', { error, edgvoipTrunkId, tenantId });
    await logTrunkActivity(tenantId, 'delete', edgvoipTrunkId, 'fail', {
      error: String(error)
    });
    return {
      success: false,
      error: 'Internal error processing trunk deletion'
    };
  }
};
