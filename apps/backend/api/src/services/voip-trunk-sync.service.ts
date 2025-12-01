/**
 * VoIP Trunk Sync Service (DEPRECATED)
 * 
 * @deprecated Use integrations/edgvoip/trunks.service.ts instead.
 * This legacy service uses global environment variables for configuration.
 * The new service uses per-tenant API keys from voip_tenant_config table.
 * 
 * Synchronizes trunk data from edgvoip PBX to W3 Suite database
 * Supports manual refresh triggered by users
 */

import { db, setTenantContext } from '../core/db';
import { logger } from '../core/logger';
import { eq, and } from 'drizzle-orm';
import { voipTrunks } from '../db/schema/w3suite';
import { 
  fetchTrunksFromEdgvoip, 
  fetchTrunkFromEdgvoip,
  EdgvoipTrunkData 
} from './edgvoip-api-client.service';

export interface TrunkSyncResult {
  success: boolean;
  synced: number;
  failed: number;
  total: number;
  errors?: Array<{ trunkId: string; error: string }>;
}

/**
 * Sync single trunk from edgvoip to local database
 */
async function upsertTrunkFromEdgvoip(
  trunkData: EdgvoipTrunkData,
  tenantId: string
): Promise<{ success: boolean; trunkId?: string; error?: string }> {
  try {
    await setTenantContext(db, tenantId);

    // Check if trunk already exists
    const [existing] = await db.select()
      .from(voipTrunks)
      .where(and(
        eq(voipTrunks.edgvoipTrunkId, trunkData.edgvoipTrunkId),
        eq(voipTrunks.tenantId, tenantId)
      ))
      .limit(1);

    const trunkPayload = {
      tenantId,
      storeId: trunkData.storeId,
      edgvoipTrunkId: trunkData.edgvoipTrunkId,
      syncSource: 'edgvoip' as const,
      lastSyncAt: new Date(),
      name: trunkData.name,
      provider: trunkData.provider || null,
      host: trunkData.host || null,
      port: trunkData.port || 5060,
      protocol: trunkData.protocol || 'udp',
      didRange: trunkData.didRange || null,
      maxChannels: trunkData.maxChannels || 10,
      currentChannels: trunkData.currentChannels || 0,
      status: trunkData.status,
      updatedAt: new Date()
    };

    if (existing) {
      // Update existing trunk
      const [updated] = await db.update(voipTrunks)
        .set(trunkPayload)
        .where(eq(voipTrunks.id, existing.id))
        .returning();

      logger.info('Trunk updated from edgvoip', {
        trunkId: updated.id,
        edgvoipTrunkId: trunkData.edgvoipTrunkId,
        tenantId
      });

      return { success: true, trunkId: updated.id };
    } else {
      // Create new trunk
      const [created] = await db.insert(voipTrunks)
        .values(trunkPayload)
        .returning();

      logger.info('Trunk created from edgvoip', {
        trunkId: created.id,
        edgvoipTrunkId: trunkData.edgvoipTrunkId,
        tenantId
      });

      return { success: true, trunkId: created.id };
    }
  } catch (error) {
    logger.error('Failed to upsert trunk from edgvoip', {
      error,
      edgvoipTrunkId: trunkData.edgvoipTrunkId,
      tenantId
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sync all trunks for a tenant from edgvoip
 */
export async function syncTrunksFromEdgvoip(
  tenantId: string
): Promise<TrunkSyncResult> {
  try {
    logger.info('Starting trunk sync from edgvoip', { tenantId });

    // Fetch trunks from edgvoip API
    const response = await fetchTrunksFromEdgvoip(tenantId);

    if (!response.success || !response.data) {
      logger.error('Failed to fetch trunks from edgvoip', {
        tenantId,
        error: response.error
      });

      const errorDetails = response.error 
        ? `${response.error}${response.code ? ` (${response.code})` : ''}`
        : 'Failed to fetch from edgvoip';
        
      return {
        success: false,
        synced: 0,
        failed: 0,
        total: 0,
        errors: [{
          trunkId: 'fetch',
          error: errorDetails
        }]
      };
    }

    const trunksData = response.data;
    const results = {
      success: true,
      synced: 0,
      failed: 0,
      total: trunksData.length,
      errors: [] as Array<{ trunkId: string; error: string }>
    };

    // Sync each trunk
    for (const trunkData of trunksData) {
      const result = await upsertTrunkFromEdgvoip(trunkData, tenantId);

      if (result.success) {
        results.synced++;
      } else {
        results.failed++;
        results.errors.push({
          trunkId: trunkData.edgvoipTrunkId,
          error: result.error || 'Unknown error'
        });
      }
    }

    // Mark as failed if any trunk failed to sync
    if (results.failed > 0) {
      results.success = false;
    }

    logger.info('Trunk sync completed', {
      tenantId,
      total: results.total,
      synced: results.synced,
      failed: results.failed,
      success: results.success
    });

    return results;
  } catch (error) {
    logger.error('Trunk sync failed', { error, tenantId });

    return {
      success: false,
      synced: 0,
      failed: 0,
      total: 0,
      errors: [{
        trunkId: 'sync',
        error: error instanceof Error ? error.message : 'Unknown error'
      }]
    };
  }
}

/**
 * Sync single trunk by edgvoip ID
 */
export async function syncSingleTrunkFromEdgvoip(
  edgvoipTrunkId: string,
  tenantId: string
): Promise<{ success: boolean; trunkId?: string; error?: string }> {
  try {
    logger.info('Syncing single trunk from edgvoip', { edgvoipTrunkId, tenantId });

    const response = await fetchTrunkFromEdgvoip(edgvoipTrunkId, tenantId);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || 'Failed to fetch trunk from edgvoip'
      };
    }

    return await upsertTrunkFromEdgvoip(response.data, tenantId);
  } catch (error) {
    logger.error('Single trunk sync failed', {
      error,
      edgvoipTrunkId,
      tenantId
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
