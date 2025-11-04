/**
 * edgvoip Sync Service
 * 
 * Syncs AI Voice Agent configuration from W3 Suite to edgvoip PBX
 * Calls edgvoip API when trunk AI settings change
 */

import { db, setTenantContext } from '../core/db';
import { logger } from '../core/logger';
import { eq } from 'drizzle-orm';
import { voipTrunks } from '../db/schema/w3suite';
import crypto from 'crypto';

export interface EdgvoipAIConfigPayload {
  tenantId: string;
  storeId: string;
  trunkId: string; // edgvoipTrunkId
  aiEnabled: boolean;
  aiEndpoint: string; // W3 Voice Gateway URL
  timestamp: string;
}

export interface EdgvoipSyncResult {
  success: boolean;
  trunkId?: string;
  aiEnabled?: boolean;
  updatedAt?: string;
  error?: string;
  code?: string;
}

/**
 * Generate HMAC-SHA256 signature for webhook security
 */
const generateHMAC = (payload: string, secret: string): string => {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
};

/**
 * Get edgvoip API configuration from environment
 */
const getEdgvoipConfig = () => {
  const apiUrl = process.env.EDGVOIP_API_URL;
  const webhookSecret = process.env.EDGVOIP_WEBHOOK_SECRET;

  if (!apiUrl || !webhookSecret) {
    throw new Error('Missing EDGVOIP_API_URL or EDGVOIP_WEBHOOK_SECRET environment variables');
  }

  return { apiUrl, webhookSecret };
};

/**
 * Construct W3 Voice Gateway URL for AI routing
 */
const getVoiceGatewayURL = (): string => {
  // Use REPLIT_DEPLOYMENT_URL in production, fallback to dev URL
  const baseUrl = process.env.REPLIT_DEPLOYMENT_URL || 'http://localhost:5000';
  return `${baseUrl}/api/voip/ai-gateway/route`;
};

/**
 * Sync AI configuration to edgvoip
 * Called when user changes AI settings in W3 UI
 */
export const syncAIConfigToEdgvoip = async (
  trunkId: string, // W3 internal trunk ID
  tenantId: string
): Promise<EdgvoipSyncResult> => {
  try {
    // Set tenant context
    await setTenantContext(db, tenantId);

    // Get trunk data
    const [trunk] = await db.select()
      .from(voipTrunks)
      .where(eq(voipTrunks.id, trunkId))
      .limit(1);

    if (!trunk) {
      logger.error('Trunk not found for AI sync', { trunkId, tenantId });
      return {
        success: false,
        error: 'Trunk not found',
        code: 'TRUNK_NOT_FOUND'
      };
    }

    if (!trunk.edgvoipTrunkId) {
      logger.error('Trunk missing edgvoipTrunkId', { trunkId, tenantId });
      return {
        success: false,
        error: 'Trunk not synced with edgvoip',
        code: 'MISSING_EDGVOIP_ID'
      };
    }

    // Get edgvoip configuration
    const { apiUrl, webhookSecret } = getEdgvoipConfig();
    const voiceGatewayURL = getVoiceGatewayURL();

    // Prepare payload
    const payload: EdgvoipAIConfigPayload = {
      tenantId: trunk.tenantId,
      storeId: trunk.storeId,
      trunkId: trunk.edgvoipTrunkId,
      aiEnabled: trunk.aiAgentEnabled,
      aiEndpoint: voiceGatewayURL,
      timestamp: new Date().toISOString()
    };

    const payloadString = JSON.stringify(payload);
    const signature = generateHMAC(payloadString, webhookSecret);

    logger.info('Syncing AI config to edgvoip', {
      trunkId: trunk.id,
      edgvoipTrunkId: trunk.edgvoipTrunkId,
      aiEnabled: trunk.aiAgentEnabled,
      voiceGatewayURL
    });

    // Call edgvoip API
    const response = await fetch(`${apiUrl}/api/w3-integration/ai-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-W3-Signature': signature,
        'X-W3-Tenant-ID': trunk.tenantId
      },
      body: payloadString
    });

    const responseData = await response.json();

    if (!response.ok) {
      logger.error('edgvoip API returned error', {
        status: response.status,
        response: responseData,
        trunkId: trunk.id
      });

      // Update sync status in database
      await db.update(voipTrunks)
        .set({
          edgvoipAiSyncStatus: 'error',
          edgvoipAiSyncError: responseData.error || `HTTP ${response.status}`,
          updatedAt: new Date()
        })
        .where(eq(voipTrunks.id, trunk.id));

      return {
        success: false,
        error: responseData.error || 'edgvoip API error',
        code: responseData.code || 'EDGVOIP_API_ERROR'
      };
    }

    // Success - update sync status
    await db.update(voipTrunks)
      .set({
        edgvoipAiSyncedAt: new Date(),
        edgvoipAiSyncStatus: 'success',
        edgvoipAiSyncError: null,
        updatedAt: new Date()
      })
      .where(eq(voipTrunks.id, trunk.id));

    logger.info('AI config synced successfully to edgvoip', {
      trunkId: trunk.id,
      edgvoipTrunkId: trunk.edgvoipTrunkId,
      aiEnabled: trunk.aiAgentEnabled,
      edgvoipResponse: responseData
    });

    return {
      success: true,
      trunkId: responseData.trunkId,
      aiEnabled: responseData.aiEnabled,
      updatedAt: responseData.updatedAt
    };
  } catch (error) {
    logger.error('Error syncing AI config to edgvoip', { error, trunkId, tenantId });

    // Update sync status in database
    try {
      await db.update(voipTrunks)
        .set({
          edgvoipAiSyncStatus: 'error',
          edgvoipAiSyncError: error instanceof Error ? error.message : String(error),
          updatedAt: new Date()
        })
        .where(eq(voipTrunks.id, trunkId));
    } catch (dbError) {
      logger.error('Failed to update sync status', { dbError, trunkId });
    }

    return {
      success: false,
      error: 'Internal error syncing to edgvoip',
      code: 'INTERNAL_ERROR'
    };
  }
};

/**
 * Batch sync all trunks for a tenant (useful for initial setup or recovery)
 */
export const syncAllTrunksToEdgvoip = async (tenantId: string): Promise<{
  total: number;
  success: number;
  failed: number;
  results: EdgvoipSyncResult[];
}> => {
  try {
    await setTenantContext(db, tenantId);

    // Get all active trunks for tenant
    const trunks = await db.select()
      .from(voipTrunks)
      .where(eq(voipTrunks.tenantId, tenantId));

    const results: EdgvoipSyncResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const trunk of trunks) {
      const result = await syncAIConfigToEdgvoip(trunk.id, tenantId);
      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    logger.info('Batch trunk sync completed', {
      tenantId,
      total: trunks.length,
      success: successCount,
      failed: failedCount
    });

    return {
      total: trunks.length,
      success: successCount,
      failed: failedCount,
      results
    };
  } catch (error) {
    logger.error('Error in batch trunk sync', { error, tenantId });
    throw error;
  }
};
