/**
 * EDGVoIP Trunks Service
 * 
 * Full CRUD + Bidirectional Sync for SIP Trunks with EDGVoIP API v2.
 * 
 * Features:
 * - Create, Read, Update, Delete trunks
 * - Bidirectional sync with EDGVoIP
 * - Status monitoring
 * - Activity logging
 */

import { db, setTenantContext } from '../../core/db';
import { logger } from '../../core/logger';
import { eq, and } from 'drizzle-orm';
import { voipTrunks, voipActivityLog, stores } from '../../db/schema/w3suite';
import { EdgvoipApiClient } from './api-client';
import type {
  EdgvoipTrunk,
  CreateTrunkRequest,
  UpdateTrunkRequest,
  TrunkSyncResponse,
  SipConfig,
  DidConfig,
  TrunkSecurity,
  TrunkGdpr
} from './types';

export interface TrunkSyncResult {
  success: boolean;
  synced: number;
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ trunkId: string; error: string }>;
}

export interface LocalTrunk {
  id: string;
  tenantId: string;
  storeId: string;
  externalId?: string;
  name: string;
  provider?: string;
  status: string;
  sipConfig?: SipConfig;
  didConfig?: DidConfig;
  security?: TrunkSecurity;
  gdpr?: TrunkGdpr;
  codecPreferences?: string[];
  lastSyncAt?: Date;
  syncStatus: 'synced' | 'pending' | 'failed' | 'local_only';
}

/**
 * Log trunk activity to voip_activity_log
 */
async function logActivity(
  tenantId: string,
  action: 'create' | 'update' | 'delete' | 'sync',
  trunkId: string,
  status: 'ok' | 'fail',
  details?: any
): Promise<void> {
  try {
    await db.insert(voipActivityLog).values({
      tenantId,
      actor: 'system:edgvoip-api',
      action,
      targetType: 'trunk',
      targetId: trunkId,
      status,
      detailsJson: details
    });
  } catch (error) {
    logger.error('Failed to log trunk activity', { error, tenantId, action, trunkId });
  }
}

/**
 * Get all trunks for tenant from local database
 */
export async function getLocalTrunks(
  tenantId: string,
  storeId?: string
): Promise<LocalTrunk[]> {
  await setTenantContext(db, tenantId);

  const conditions = [eq(voipTrunks.tenantId, tenantId)];
  if (storeId) {
    conditions.push(eq(voipTrunks.storeId, storeId));
  }

  const trunks = await db.select()
    .from(voipTrunks)
    .where(and(...conditions));

  return trunks.map(t => ({
    id: t.id,
    tenantId: t.tenantId,
    storeId: t.storeId,
    externalId: t.externalId || undefined,
    name: t.name,
    provider: t.provider || undefined,
    status: t.status,
    sipConfig: t.sipConfig as SipConfig | undefined,
    didConfig: t.didConfig as DidConfig | undefined,
    security: t.security as TrunkSecurity | undefined,
    gdpr: t.gdpr as TrunkGdpr | undefined,
    codecPreferences: t.codecPreferences as string[] | undefined,
    lastSyncAt: t.lastSyncAt || undefined,
    syncStatus: (t.syncStatus as LocalTrunk['syncStatus']) || 'local_only'
  }));
}

/**
 * Create trunk locally and push to EDGVoIP
 */
export async function createTrunk(
  tenantId: string,
  data: {
    storeId: string;
    name: string;
    provider?: string;
    sipConfig: SipConfig;
    didConfig: DidConfig;
    security?: TrunkSecurity;
    gdpr?: TrunkGdpr;
    codecPreferences?: string[];
  }
): Promise<{ success: boolean; trunk?: LocalTrunk; error?: string }> {
  try {
    await setTenantContext(db, tenantId);

    // Get EDGVoIP client (loads tenant config from voip_tenant_config table)
    const client = await EdgvoipApiClient.fromTenantId(tenantId);

    // Get store reference
    const [store] = await db.select()
      .from(stores)
      .where(eq(stores.id, data.storeId))
      .limit(1);

    if (!store) {
      return { success: false, error: 'Store not found' };
    }

    let externalId: string | undefined;
    let syncStatus: LocalTrunk['syncStatus'] = 'local_only';

    // If EDGVoIP is configured, create trunk there first
    if (client) {
      const createRequest: CreateTrunkRequest = {
        tenant_external_id: client.tenantExternalId,
        store_id: store.id,
        name: data.name,
        provider: data.provider,
        sip_config: data.sipConfig,
        did_config: data.didConfig,
        security: data.security,
        gdpr: data.gdpr,
        codec_preferences: data.codecPreferences
      };

      const response = await client.createTrunk(createRequest);

      if (response.success && response.data) {
        externalId = response.data.external_id;
        syncStatus = 'synced';
        
        logger.info('Trunk created in EDGVoIP', {
          tenantId,
          externalId,
          name: data.name
        });
      } else {
        logger.warn('Failed to create trunk in EDGVoIP, creating local only', {
          tenantId,
          error: response.error
        });
        syncStatus = 'pending';
      }
    }

    // Create local trunk
    const [created] = await db.insert(voipTrunks)
      .values({
        tenantId,
        storeId: data.storeId,
        externalId,
        name: data.name,
        provider: data.provider,
        status: 'testing',
        sipConfig: data.sipConfig,
        didConfig: data.didConfig,
        security: data.security,
        gdpr: data.gdpr,
        codecPreferences: data.codecPreferences,
        syncSource: client ? 'w3suite' : 'local',
        syncStatus,
        lastSyncAt: syncStatus === 'synced' ? new Date() : null
      })
      .returning();

    await logActivity(tenantId, 'create', created.id, 'ok', {
      externalId,
      syncStatus,
      name: data.name
    });

    return {
      success: true,
      trunk: {
        id: created.id,
        tenantId: created.tenantId,
        storeId: created.storeId,
        externalId: created.externalId || undefined,
        name: created.name,
        provider: created.provider || undefined,
        status: created.status,
        sipConfig: created.sipConfig as SipConfig | undefined,
        didConfig: created.didConfig as DidConfig | undefined,
        security: created.security as TrunkSecurity | undefined,
        gdpr: created.gdpr as TrunkGdpr | undefined,
        codecPreferences: created.codecPreferences as string[] | undefined,
        lastSyncAt: created.lastSyncAt || undefined,
        syncStatus
      }
    };
  } catch (error) {
    logger.error('Failed to create trunk', { error, tenantId, data });
    await logActivity(tenantId, 'create', 'new', 'fail', {
      error: error instanceof Error ? error.message : 'Unknown error',
      data
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create trunk'
    };
  }
}

/**
 * Update trunk locally and push to EDGVoIP
 */
export async function updateTrunk(
  tenantId: string,
  trunkId: string,
  data: Partial<{
    name: string;
    provider: string;
    sipConfig: SipConfig;
    didConfig: DidConfig;
    security: TrunkSecurity;
    gdpr: TrunkGdpr;
    codecPreferences: string[];
  }>
): Promise<{ success: boolean; trunk?: LocalTrunk; error?: string }> {
  try {
    await setTenantContext(db, tenantId);

    // Get existing trunk
    const [existing] = await db.select()
      .from(voipTrunks)
      .where(and(
        eq(voipTrunks.id, trunkId),
        eq(voipTrunks.tenantId, tenantId)
      ))
      .limit(1);

    if (!existing) {
      return { success: false, error: 'Trunk not found' };
    }

    let syncStatus = existing.syncStatus as LocalTrunk['syncStatus'];

    // If trunk has external_id and EDGVoIP is configured, update there
    if (existing.externalId) {
      const client = await EdgvoipApiClient.fromTenantId(tenantId);
      
      if (client) {
        const updateRequest: UpdateTrunkRequest = {
          name: data.name,
          provider: data.provider,
          sip_config: data.sipConfig,
          did_config: data.didConfig,
          security: data.security,
          gdpr: data.gdpr,
          codec_preferences: data.codecPreferences
        };

        const response = await client.updateTrunk(existing.externalId, updateRequest);

        if (response.success) {
          syncStatus = 'synced';
          logger.info('Trunk updated in EDGVoIP', {
            tenantId,
            trunkId,
            externalId: existing.externalId
          });
        } else {
          syncStatus = 'pending';
          logger.warn('Failed to update trunk in EDGVoIP', {
            tenantId,
            trunkId,
            error: response.error
          });
        }
      }
    }

    // Update local trunk
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
      syncStatus
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.provider !== undefined) updateData.provider = data.provider;
    if (data.sipConfig !== undefined) updateData.sipConfig = data.sipConfig;
    if (data.didConfig !== undefined) updateData.didConfig = data.didConfig;
    if (data.security !== undefined) updateData.security = data.security;
    if (data.gdpr !== undefined) updateData.gdpr = data.gdpr;
    if (data.codecPreferences !== undefined) updateData.codecPreferences = data.codecPreferences;
    if (syncStatus === 'synced') updateData.lastSyncAt = new Date();

    const [updated] = await db.update(voipTrunks)
      .set(updateData)
      .where(eq(voipTrunks.id, trunkId))
      .returning();

    await logActivity(tenantId, 'update', trunkId, 'ok', {
      externalId: existing.externalId,
      syncStatus,
      changes: data
    });

    return {
      success: true,
      trunk: {
        id: updated.id,
        tenantId: updated.tenantId,
        storeId: updated.storeId,
        externalId: updated.externalId || undefined,
        name: updated.name,
        provider: updated.provider || undefined,
        status: updated.status,
        sipConfig: updated.sipConfig as SipConfig | undefined,
        didConfig: updated.didConfig as DidConfig | undefined,
        security: updated.security as TrunkSecurity | undefined,
        gdpr: updated.gdpr as TrunkGdpr | undefined,
        codecPreferences: updated.codecPreferences as string[] | undefined,
        lastSyncAt: updated.lastSyncAt || undefined,
        syncStatus
      }
    };
  } catch (error) {
    logger.error('Failed to update trunk', { error, tenantId, trunkId, data });
    await logActivity(tenantId, 'update', trunkId, 'fail', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update trunk'
    };
  }
}

/**
 * Delete trunk locally and from EDGVoIP
 */
export async function deleteTrunk(
  tenantId: string,
  trunkId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await setTenantContext(db, tenantId);

    // Get existing trunk
    const [existing] = await db.select()
      .from(voipTrunks)
      .where(and(
        eq(voipTrunks.id, trunkId),
        eq(voipTrunks.tenantId, tenantId)
      ))
      .limit(1);

    if (!existing) {
      return { success: false, error: 'Trunk not found' };
    }

    // If trunk has external_id, delete from EDGVoIP
    if (existing.externalId) {
      const client = await EdgvoipApiClient.fromTenantId(tenantId);
      
      if (client) {
        const response = await client.deleteTrunk(existing.externalId);

        if (!response.success) {
          logger.warn('Failed to delete trunk from EDGVoIP', {
            tenantId,
            trunkId,
            externalId: existing.externalId,
            error: response.error
          });
        } else {
          logger.info('Trunk deleted from EDGVoIP', {
            tenantId,
            trunkId,
            externalId: existing.externalId
          });
        }
      }
    }

    // Soft delete local trunk (mark as inactive)
    await db.update(voipTrunks)
      .set({
        status: 'inactive',
        updatedAt: new Date()
      })
      .where(eq(voipTrunks.id, trunkId));

    await logActivity(tenantId, 'delete', trunkId, 'ok', {
      externalId: existing.externalId,
      name: existing.name
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to delete trunk', { error, tenantId, trunkId });
    await logActivity(tenantId, 'delete', trunkId, 'fail', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete trunk'
    };
  }
}

/**
 * Bidirectional sync trunks with EDGVoIP
 * Strategy: EDGVoIP wins on conflicts (last_updated)
 */
export async function syncTrunksWithEdgvoip(
  tenantId: string,
  options?: {
    force?: boolean;
    trunkIds?: string[];
  }
): Promise<TrunkSyncResult> {
  const result: TrunkSyncResult = {
    success: true,
    synced: 0,
    created: 0,
    updated: 0,
    failed: 0,
    errors: []
  };

  try {
    await setTenantContext(db, tenantId);

    const client = await EdgvoipApiClient.fromTenantId(tenantId);
    
    if (!client) {
      return {
        ...result,
        success: false,
        errors: [{ trunkId: 'config', error: 'EDGVoIP not configured' }]
      };
    }

    // Trigger bidirectional sync on EDGVoIP side
    const syncResponse = await client.syncTrunks({
      tenant_external_id: client.tenantExternalId,
      force: options?.force || false,
      trunk_ids: options?.trunkIds || []
    });

    if (!syncResponse.success || !syncResponse.data) {
      return {
        ...result,
        success: false,
        errors: [{ trunkId: 'sync', error: syncResponse.error || 'Sync failed' }]
      };
    }

    const syncData = syncResponse.data;

    // Now fetch all trunks from EDGVoIP and upsert locally
    const trunksResponse = await client.getTrunks();

    if (trunksResponse.success && trunksResponse.data) {
      for (const remoteTrunk of trunksResponse.data) {
        try {
          // Check if trunk exists locally by external_id
          const [existing] = await db.select()
            .from(voipTrunks)
            .where(and(
              eq(voipTrunks.externalId, remoteTrunk.external_id),
              eq(voipTrunks.tenantId, tenantId)
            ))
            .limit(1);

          // Sanitize JSONB fields: ensure they are objects or null, never strings
          const sanitizeJson = (value: any): any => {
            if (value === null || value === undefined || value === '') return null;
            if (typeof value === 'string') {
              try {
                return JSON.parse(value);
              } catch {
                return null;
              }
            }
            if (typeof value === 'object') return value;
            return null;
          };

          const trunkData = {
            tenantId,
            externalId: remoteTrunk.external_id,
            name: remoteTrunk.name,
            provider: remoteTrunk.provider || null,
            status: remoteTrunk.status,
            sipConfig: sanitizeJson(remoteTrunk.sip_config),
            didConfig: sanitizeJson(remoteTrunk.did_config),
            security: sanitizeJson(remoteTrunk.security),
            gdpr: sanitizeJson(remoteTrunk.gdpr),
            codecPreferences: Array.isArray(remoteTrunk.codec_preferences) ? remoteTrunk.codec_preferences : null,
            syncSource: 'edgvoip' as const,
            syncStatus: 'synced' as const,
            lastSyncAt: new Date(),
            updatedAt: new Date()
          };

          if (existing) {
            await db.update(voipTrunks)
              .set(trunkData)
              .where(eq(voipTrunks.id, existing.id));
            result.updated++;
          } else {
            // Need storeId - try to find matching store
            const [store] = await db.select()
              .from(stores)
              .where(eq(stores.tenantId, tenantId))
              .limit(1);

            if (store) {
              await db.insert(voipTrunks)
                .values({
                  ...trunkData,
                  storeId: store.id
                });
              result.created++;
            }
          }

          result.synced++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            trunkId: remoteTrunk.external_id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    // Log sync activity
    await logActivity(tenantId, 'sync', 'batch', result.failed === 0 ? 'ok' : 'fail', {
      synced: result.synced,
      created: result.created,
      updated: result.updated,
      failed: result.failed
    });

    result.success = result.failed === 0;
    
    logger.info('Trunk sync completed', {
      tenantId,
      ...result
    });

    return result;
  } catch (error) {
    logger.error('Trunk sync failed', { error, tenantId });
    return {
      ...result,
      success: false,
      errors: [{ trunkId: 'sync', error: error instanceof Error ? error.message : 'Unknown error' }]
    };
  }
}
