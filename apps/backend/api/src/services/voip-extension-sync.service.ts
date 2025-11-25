/**
 * VoIP Extension Sync Service
 * 
 * Synchronizes extension data from edgvoip PBX to W3 Suite database
 * Supports manual refresh triggered by users
 */

import { db, setTenantContext } from '../core/db';
import { logger } from '../core/logger';
import { eq, and } from 'drizzle-orm';
import { voipExtensions } from '../db/schema/w3suite';
import { 
  fetchExtensionsFromEdgvoip, 
  fetchExtensionFromEdgvoip,
  EdgvoipExtensionData 
} from './edgvoip-api-client.service';

export interface ExtensionSyncResult {
  success: boolean;
  synced: number;
  failed: number;
  total: number;
  errors?: Array<{ extensionId: string; error: string }>;
}

/**
 * Sync single extension from edgvoip to local database
 */
async function upsertExtensionFromEdgvoip(
  extensionData: EdgvoipExtensionData,
  tenantId: string
): Promise<{ success: boolean; extensionId?: string; error?: string }> {
  try {
    await setTenantContext(db, tenantId);

    // Check if extension already exists
    const [existing] = await db.select()
      .from(voipExtensions)
      .where(and(
        eq(voipExtensions.edgvoipExtensionId, extensionData.edgvoipExtensionId),
        eq(voipExtensions.tenantId, tenantId)
      ))
      .limit(1);

    const extensionPayload = {
      tenantId,
      domainId: extensionData.domainId,
      edgvoipExtensionId: extensionData.edgvoipExtensionId,
      syncSource: 'edgvoip' as const,
      lastSyncAt: new Date(),
      extNumber: extensionData.extension,
      sipUsername: extensionData.sipUsername,
      sipPassword: extensionData.sipPassword,
      sipDomain: extensionData.sipDomain,
      displayName: extensionData.displayName || null,
      email: extensionData.email || null,
      callerIdName: extensionData.callerIdName || null,
      callerIdNumber: extensionData.callerIdNumber || null,
      voicemailEnabled: extensionData.voicemailEnabled ?? false,
      enabled: extensionData.status === 'active',
      registrationStatus: extensionData.registrationStatus || 'unknown',
      lastRegistration: extensionData.lastRegistration ? new Date(extensionData.lastRegistration) : null,
      userAgent: extensionData.userAgent || null,
      ipAddress: extensionData.ipAddress || null,
      syncStatus: 'synced' as const,
      syncErrorMessage: null,
      updatedAt: new Date()
    };

    if (existing) {
      // Update existing extension (preserve userId if already set)
      const [updated] = await db.update(voipExtensions)
        .set({
          ...extensionPayload,
          userId: existing.userId // Preserve W3 user link
        })
        .where(eq(voipExtensions.id, existing.id))
        .returning();

      logger.info('Extension updated from edgvoip', {
        extensionId: updated.id,
        edgvoipExtensionId: extensionData.edgvoipExtensionId,
        extension: extensionData.extension,
        tenantId
      });

      return { success: true, extensionId: updated.id };
    } else {
      // Create new extension (userId will be null initially)
      const [created] = await db.insert(voipExtensions)
        .values({
          ...extensionPayload,
          userId: null,
          storeId: null // Will be set when linked to W3 user
        })
        .returning();

      logger.info('Extension created from edgvoip', {
        extensionId: created.id,
        edgvoipExtensionId: extensionData.edgvoipExtensionId,
        extension: extensionData.extension,
        tenantId
      });

      return { success: true, extensionId: created.id };
    }
  } catch (error) {
    logger.error('Failed to upsert extension from edgvoip', {
      error,
      edgvoipExtensionId: extensionData.edgvoipExtensionId,
      extension: extensionData.extension,
      tenantId
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sync all extensions for a tenant from edgvoip
 */
export async function syncExtensionsFromEdgvoip(
  tenantId: string,
  domainId?: string
): Promise<ExtensionSyncResult> {
  try {
    logger.info('Starting extension sync from edgvoip', { tenantId, domainId });

    // Fetch extensions from edgvoip API
    const response = await fetchExtensionsFromEdgvoip(tenantId, domainId);

    if (!response.success || !response.data) {
      logger.error('Failed to fetch extensions from edgvoip', {
        tenantId,
        domainId,
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
          extensionId: 'fetch',
          error: errorDetails
        }]
      };
    }

    const extensionsData = response.data;
    const results = {
      success: true,
      synced: 0,
      failed: 0,
      total: extensionsData.length,
      errors: [] as Array<{ extensionId: string; error: string }>
    };

    // Sync each extension
    for (const extensionData of extensionsData) {
      const result = await upsertExtensionFromEdgvoip(extensionData, tenantId);

      if (result.success) {
        results.synced++;
      } else {
        results.failed++;
        results.errors.push({
          extensionId: extensionData.edgvoipExtensionId,
          error: result.error || 'Unknown error'
        });
      }
    }

    // Mark as failed if any extension failed to sync
    if (results.failed > 0) {
      results.success = false;
    }

    logger.info('Extension sync completed', {
      tenantId,
      domainId,
      total: results.total,
      synced: results.synced,
      failed: results.failed,
      success: results.success
    });

    return results;
  } catch (error) {
    logger.error('Extension sync failed', { error, tenantId, domainId });

    return {
      success: false,
      synced: 0,
      failed: 0,
      total: 0,
      errors: [{
        extensionId: 'sync',
        error: error instanceof Error ? error.message : 'Unknown error'
      }]
    };
  }
}

/**
 * Sync single extension by edgvoip ID
 */
export async function syncSingleExtensionFromEdgvoip(
  edgvoipExtensionId: string,
  tenantId: string
): Promise<{ success: boolean; extensionId?: string; error?: string }> {
  try {
    logger.info('Syncing single extension from edgvoip', { edgvoipExtensionId, tenantId });

    const response = await fetchExtensionFromEdgvoip(edgvoipExtensionId, tenantId);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error || 'Failed to fetch extension from edgvoip'
      };
    }

    return await upsertExtensionFromEdgvoip(response.data, tenantId);
  } catch (error) {
    logger.error('Single extension sync failed', {
      error,
      edgvoipExtensionId,
      tenantId
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
