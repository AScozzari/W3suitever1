/**
 * EDGVoIP Extensions Service
 * 
 * Full CRUD + Bidirectional Sync for SIP Extensions with EDGVoIP API v2.
 * 
 * Features:
 * - Create, Read, Update, Delete extensions
 * - Bidirectional sync with EDGVoIP
 * - SIP password encryption
 * - Status monitoring
 * - Activity logging
 */

import crypto from 'crypto';
import { db, setTenantContext } from '../../core/db';
import { logger } from '../../core/logger';
import { eq, and } from 'drizzle-orm';
import { voipExtensions, voipActivityLog, users } from '../../db/schema/w3suite';
import { EncryptionKeyService } from '../../core/encryption-service';
import { EdgvoipApiClient } from './api-client';
import type {
  EdgvoipExtension,
  CreateExtensionRequest,
  UpdateExtensionRequest,
  ExtensionSyncResponse,
  ExtensionSettings
} from './types';

export interface ExtensionSyncResult {
  success: boolean;
  synced: number;
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ extensionId: string; error: string }>;
}

export interface LocalExtension {
  id: string;
  tenantId: string;
  userId?: string;
  storeId?: string;
  externalId?: string;
  extension: string;
  displayName: string;
  sipUsername: string;
  status: string;
  type: 'user' | 'queue' | 'conference';
  settings?: ExtensionSettings;
  isRegistered?: boolean;
  lastSyncAt?: Date;
  syncStatus: 'synced' | 'pending' | 'failed' | 'local_only';
}

export interface SIPCredentials {
  sipUsername: string;
  sipPassword: string;
  sipServer: string;
  sipPort: number;
  wsPort: number;
  transport: string;
  authRealm: string;
  extension: string;
  displayName: string | null;
}

const encryptionService = new EncryptionKeyService();

/**
 * Log extension activity to voip_activity_log
 */
async function logActivity(
  tenantId: string,
  action: 'create' | 'update' | 'delete' | 'sync',
  extensionId: string,
  status: 'ok' | 'fail',
  details?: any
): Promise<void> {
  try {
    await db.insert(voipActivityLog).values({
      tenantId,
      actor: 'system:edgvoip-api',
      action,
      targetType: 'ext',
      targetId: extensionId,
      status,
      detailsJson: details
    });
  } catch (error) {
    logger.error('Failed to log extension activity', { error, tenantId, action, extensionId });
  }
}

/**
 * Generate cryptographically secure SIP password
 */
export function generateSIPPassword(length: number = 20): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const special = '!@#$%^&*()-_=+[]{}|;:,.<>?';
  
  const allChars = lowercase + uppercase + digits + special;
  
  const password: string[] = [
    lowercase[crypto.randomInt(lowercase.length)],
    uppercase[crypto.randomInt(uppercase.length)],
    digits[crypto.randomInt(digits.length)],
    special[crypto.randomInt(special.length)]
  ];
  
  for (let i = 4; i < length; i++) {
    password.push(allChars[crypto.randomInt(allChars.length)]);
  }
  
  for (let i = password.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [password[i], password[j]] = [password[j], password[i]];
  }
  
  return password.join('');
}

/**
 * Get all extensions for tenant from local database
 */
export async function getLocalExtensions(
  tenantId: string,
  storeId?: string
): Promise<LocalExtension[]> {
  await setTenantContext(db, tenantId);

  const conditions = [eq(voipExtensions.tenantId, tenantId)];
  if (storeId) {
    conditions.push(eq(voipExtensions.storeId, storeId));
  }

  const extensions = await db.select()
    .from(voipExtensions)
    .where(and(...conditions));

  return extensions.map(e => ({
    id: e.id,
    tenantId: e.tenantId,
    userId: e.userId || undefined,
    storeId: e.storeId || undefined,
    externalId: e.externalId || undefined,
    extension: e.extension,
    displayName: e.displayName || e.extension,
    sipUsername: e.sipUsername,
    status: e.status || 'active',
    type: (e.type as LocalExtension['type']) || 'user',
    settings: e.settings as ExtensionSettings | undefined,
    isRegistered: e.registrationStatus === 'registered',
    lastSyncAt: e.lastSyncAt || undefined,
    syncStatus: (e.syncStatus as LocalExtension['syncStatus']) || 'local_only'
  }));
}

/**
 * Create extension locally and push to EDGVoIP
 */
export async function createExtension(
  tenantId: string,
  data: {
    userId?: string;
    storeId?: string;
    extension: string;
    displayName: string;
    type?: 'user' | 'queue' | 'conference';
    settings?: ExtensionSettings;
  }
): Promise<{ success: boolean; extension?: LocalExtension; sipCredentials?: SIPCredentials; error?: string }> {
  try {
    await setTenantContext(db, tenantId);

    // Generate SIP credentials
    const sipPassword = generateSIPPassword(20);
    const sipUsername = `${data.extension}@w3suite`;

    // Encrypt password for storage
    const encryptedPassword = await encryptionService.encrypt(sipPassword, tenantId);

    // Get EDGVoIP client
    const client = await EdgvoipApiClient.fromTenantId(tenantId);

    let externalId: string | undefined;
    let syncStatus: LocalExtension['syncStatus'] = 'local_only';

    // If EDGVoIP is configured, create extension there first
    if (client) {
      const createRequest: CreateExtensionRequest = {
        tenant_external_id: client.tenantExternalId,
        store_id: data.storeId,
        extension: data.extension,
        display_name: data.displayName,
        password: sipPassword,
        type: data.type || 'user',
        settings: data.settings || {
          voicemail_enabled: true,
          call_forwarding: { enabled: false },
          recording: { enabled: true, mode: 'always' }
        }
      };

      const response = await client.createExtension(createRequest);

      if (response.success && response.data) {
        externalId = response.data.external_id;
        syncStatus = 'synced';
        
        logger.info('Extension created in EDGVoIP', {
          tenantId,
          externalId,
          extension: data.extension
        });
      } else {
        logger.warn('Failed to create extension in EDGVoIP, creating local only', {
          tenantId,
          error: response.error
        });
        syncStatus = 'pending';
      }
    }

    // Create local extension
    const [created] = await db.insert(voipExtensions)
      .values({
        tenantId,
        userId: data.userId,
        storeId: data.storeId,
        externalId,
        extension: data.extension,
        displayName: data.displayName,
        sipUsername,
        sipPassword: encryptedPassword,
        sipServer: 'sip.edgvoip.it',
        sipPort: 5060,
        wsPort: 7443,
        transport: 'WSS',
        authRealm: 'sip.edgvoip.it',
        status: 'active',
        type: data.type || 'user',
        settings: data.settings || {
          voicemail_enabled: true,
          call_forwarding: { enabled: false },
          recording: { enabled: true, mode: 'always' }
        },
        syncSource: client ? 'w3suite' : 'local',
        syncStatus,
        lastSyncAt: syncStatus === 'synced' ? new Date() : null
      })
      .returning();

    await logActivity(tenantId, 'create', created.id, 'ok', {
      externalId,
      syncStatus,
      extension: data.extension
    });

    return {
      success: true,
      extension: {
        id: created.id,
        tenantId: created.tenantId,
        userId: created.userId || undefined,
        storeId: created.storeId || undefined,
        externalId: created.externalId || undefined,
        extension: created.extension,
        displayName: created.displayName || created.extension,
        sipUsername: created.sipUsername,
        status: created.status || 'active',
        type: (created.type as LocalExtension['type']) || 'user',
        settings: created.settings as ExtensionSettings | undefined,
        lastSyncAt: created.lastSyncAt || undefined,
        syncStatus
      },
      sipCredentials: {
        sipUsername,
        sipPassword, // Return plaintext ONLY on creation
        sipServer: 'sip.edgvoip.it',
        sipPort: 5060,
        wsPort: 7443,
        transport: 'WSS',
        authRealm: 'sip.edgvoip.it',
        extension: data.extension,
        displayName: data.displayName
      }
    };
  } catch (error) {
    logger.error('Failed to create extension', { error, tenantId, data });
    await logActivity(tenantId, 'create', 'new', 'fail', {
      error: error instanceof Error ? error.message : 'Unknown error',
      data
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create extension'
    };
  }
}

/**
 * Update extension locally and push to EDGVoIP
 */
export async function updateExtension(
  tenantId: string,
  extensionId: string,
  data: Partial<{
    displayName: string;
    type: 'user' | 'queue' | 'conference';
    settings: ExtensionSettings;
  }>
): Promise<{ success: boolean; extension?: LocalExtension; error?: string }> {
  try {
    await setTenantContext(db, tenantId);

    // Get existing extension
    const [existing] = await db.select()
      .from(voipExtensions)
      .where(and(
        eq(voipExtensions.id, extensionId),
        eq(voipExtensions.tenantId, tenantId)
      ))
      .limit(1);

    if (!existing) {
      return { success: false, error: 'Extension not found' };
    }

    let syncStatus = existing.syncStatus as LocalExtension['syncStatus'];

    // If extension has external_id and EDGVoIP is configured, update there
    if (existing.externalId) {
      const client = await EdgvoipApiClient.fromTenantId(tenantId);
      
      if (client) {
        const updateRequest: UpdateExtensionRequest = {
          display_name: data.displayName,
          type: data.type,
          settings: data.settings
        };

        const response = await client.updateExtension(existing.externalId, updateRequest);

        if (response.success) {
          syncStatus = 'synced';
          logger.info('Extension updated in EDGVoIP', {
            tenantId,
            extensionId,
            externalId: existing.externalId
          });
        } else {
          syncStatus = 'pending';
          logger.warn('Failed to update extension in EDGVoIP', {
            tenantId,
            extensionId,
            error: response.error
          });
        }
      }
    }

    // Update local extension
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
      syncStatus
    };

    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.settings !== undefined) updateData.settings = data.settings;
    if (syncStatus === 'synced') updateData.lastSyncAt = new Date();

    const [updated] = await db.update(voipExtensions)
      .set(updateData)
      .where(eq(voipExtensions.id, extensionId))
      .returning();

    await logActivity(tenantId, 'update', extensionId, 'ok', {
      externalId: existing.externalId,
      syncStatus,
      changes: data
    });

    return {
      success: true,
      extension: {
        id: updated.id,
        tenantId: updated.tenantId,
        userId: updated.userId || undefined,
        storeId: updated.storeId || undefined,
        externalId: updated.externalId || undefined,
        extension: updated.extension,
        displayName: updated.displayName || updated.extension,
        sipUsername: updated.sipUsername,
        status: updated.status || 'active',
        type: (updated.type as LocalExtension['type']) || 'user',
        settings: updated.settings as ExtensionSettings | undefined,
        lastSyncAt: updated.lastSyncAt || undefined,
        syncStatus
      }
    };
  } catch (error) {
    logger.error('Failed to update extension', { error, tenantId, extensionId, data });
    await logActivity(tenantId, 'update', extensionId, 'fail', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update extension'
    };
  }
}

/**
 * Delete extension locally and from EDGVoIP
 */
export async function deleteExtension(
  tenantId: string,
  extensionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await setTenantContext(db, tenantId);

    // Get existing extension
    const [existing] = await db.select()
      .from(voipExtensions)
      .where(and(
        eq(voipExtensions.id, extensionId),
        eq(voipExtensions.tenantId, tenantId)
      ))
      .limit(1);

    if (!existing) {
      return { success: false, error: 'Extension not found' };
    }

    // If extension has external_id, delete from EDGVoIP
    if (existing.externalId) {
      const client = await EdgvoipApiClient.fromTenantId(tenantId);
      
      if (client) {
        const response = await client.deleteExtension(existing.externalId);

        if (!response.success) {
          logger.warn('Failed to delete extension from EDGVoIP', {
            tenantId,
            extensionId,
            externalId: existing.externalId,
            error: response.error
          });
        } else {
          logger.info('Extension deleted from EDGVoIP', {
            tenantId,
            extensionId,
            externalId: existing.externalId
          });
        }
      }
    }

    // Soft delete local extension (mark as inactive)
    await db.update(voipExtensions)
      .set({
        status: 'inactive',
        updatedAt: new Date()
      })
      .where(eq(voipExtensions.id, extensionId));

    await logActivity(tenantId, 'delete', extensionId, 'ok', {
      externalId: existing.externalId,
      extension: existing.extension
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to delete extension', { error, tenantId, extensionId });
    await logActivity(tenantId, 'delete', extensionId, 'fail', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete extension'
    };
  }
}

/**
 * Push local-only extensions to EDGVoIP
 * 
 * This function handles the W3 Suite → EDGVoIP direction of sync.
 * It finds extensions created locally (syncSource='w3suite', syncStatus='local_only')
 * and creates them on EDGVoIP.
 * 
 * Sync Logic:
 * - syncStatus='local_only' + no externalId → Create on EDGVoIP (POST)
 * - syncStatus='pending' + has externalId → Update on EDGVoIP (PUT)
 * 
 * Note: userId and storeId are local-only fields and are NOT pushed to EDGVoIP.
 * They are preserved locally during any sync operation.
 */
export async function pushLocalExtensionsToEdgvoip(
  tenantId: string
): Promise<ExtensionSyncResult & { pushed: number }> {
  const result = {
    success: true,
    total: 0,
    synced: 0,
    created: 0,
    updated: 0,
    pushed: 0,
    failed: 0,
    errors: [] as Array<{ extensionId: string; error: string }>
  };

  try {
    await setTenantContext(db, tenantId);

    const client = await EdgvoipApiClient.fromTenantId(tenantId);
    
    if (!client) {
      return {
        ...result,
        success: false,
        errors: [{ extensionId: 'config', error: 'EDGVoIP not configured' }]
      };
    }

    // Find extensions that need to be pushed to EDGVoIP:
    // 1. syncSource='w3suite' and syncStatus='local_only' (new local extensions)
    // 2. syncSource='w3suite' and syncStatus='pending' (modified local extensions)
    const localExtensions = await db.select()
      .from(voipExtensions)
      .where(
        and(
          eq(voipExtensions.tenantId, tenantId),
          eq(voipExtensions.syncSource, 'w3suite'),
          eq(voipExtensions.status, 'active') // Only push active extensions
        )
      );

    // Filter extensions that need pushing
    const extensionsToPush = localExtensions.filter(ext => 
      ext.syncStatus === 'local_only' || ext.syncStatus === 'pending'
    );

    result.total = extensionsToPush.length;

    logger.info('Found local extensions to push to EDGVoIP', {
      tenantId,
      total: localExtensions.length,
      toPush: extensionsToPush.length
    });

    for (const ext of extensionsToPush) {
      try {
        // Decrypt password for EDGVoIP
        const decryptedPassword = await encryptionService.decrypt(ext.sipPassword, tenantId);
        
        if (!decryptedPassword) {
          result.failed++;
          result.errors.push({
            extensionId: ext.id,
            error: 'Failed to decrypt SIP password'
          });
          continue;
        }

        const settings = ext.settings as ExtensionSettings | null;

        if (!ext.externalId) {
          // CREATE: No externalId = new extension, push to EDGVoIP
          const createRequest: CreateExtensionRequest = {
            tenant_external_id: client.tenantExternalId,
            store_id: ext.storeId || undefined,
            extension: ext.extension,
            display_name: ext.displayName || ext.extension,
            password: decryptedPassword,
            type: ext.type as 'user' | 'queue' | 'conference' || 'user',
            settings: settings || undefined
          };

          logger.info('Pushing new extension to EDGVoIP', {
            tenantId,
            extensionId: ext.id,
            extension: ext.extension
          });

          const response = await client.createExtension(createRequest);

          if (response.success && response.data) {
            // Update local extension with externalId from EDGVoIP
            // IMPORTANT: Preserve userId and storeId (local-only fields)
            await db.update(voipExtensions)
              .set({
                externalId: response.data.external_id,
                edgvoipExtensionId: response.data.external_id,
                syncStatus: 'synced',
                lastSyncAt: new Date(),
                syncErrorMessage: null,
                updatedAt: new Date()
              })
              .where(eq(voipExtensions.id, ext.id));

            result.created++;
            result.pushed++;
            
            await logActivity(tenantId, 'create', ext.id, 'ok', {
              externalId: response.data.external_id,
              extension: ext.extension,
              direction: 'push'
            });

            logger.info('Extension pushed to EDGVoIP successfully', {
              extensionId: ext.id,
              externalId: response.data.external_id
            });
          } else {
            // Mark as failed
            await db.update(voipExtensions)
              .set({
                syncStatus: 'failed',
                syncErrorMessage: response.error || 'Failed to create on EDGVoIP',
                updatedAt: new Date()
              })
              .where(eq(voipExtensions.id, ext.id));

            result.failed++;
            result.errors.push({
              extensionId: ext.id,
              error: response.error || 'Failed to create on EDGVoIP'
            });

            logger.error('Failed to push extension to EDGVoIP', {
              extensionId: ext.id,
              error: response.error
            });
          }
        } else {
          // UPDATE: Has externalId but syncStatus='pending' = local modification
          const updateRequest: UpdateExtensionRequest = {
            display_name: ext.displayName || undefined,
            password: decryptedPassword,
            type: ext.type as 'user' | 'queue' | 'conference' || undefined,
            settings: settings || undefined
          };

          logger.info('Updating extension on EDGVoIP', {
            tenantId,
            extensionId: ext.id,
            externalId: ext.externalId
          });

          const response = await client.updateExtension(ext.externalId, updateRequest);

          if (response.success) {
            await db.update(voipExtensions)
              .set({
                syncStatus: 'synced',
                lastSyncAt: new Date(),
                syncErrorMessage: null,
                updatedAt: new Date()
              })
              .where(eq(voipExtensions.id, ext.id));

            result.updated++;
            result.pushed++;

            await logActivity(tenantId, 'update', ext.id, 'ok', {
              externalId: ext.externalId,
              direction: 'push'
            });

            logger.info('Extension updated on EDGVoIP successfully', {
              extensionId: ext.id,
              externalId: ext.externalId
            });
          } else {
            await db.update(voipExtensions)
              .set({
                syncStatus: 'failed',
                syncErrorMessage: response.error || 'Failed to update on EDGVoIP',
                updatedAt: new Date()
              })
              .where(eq(voipExtensions.id, ext.id));

            result.failed++;
            result.errors.push({
              extensionId: ext.id,
              error: response.error || 'Failed to update on EDGVoIP'
            });
          }
        }

        result.synced++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          extensionId: ext.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        logger.error('Error pushing extension to EDGVoIP', {
          extensionId: ext.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    result.success = result.failed === 0;

    await logActivity(tenantId, 'sync', 'push', result.success ? 'ok' : 'fail', {
      pushed: result.pushed,
      created: result.created,
      updated: result.updated,
      failed: result.failed,
      direction: 'push'
    });

    logger.info('Push local extensions completed', {
      tenantId,
      ...result
    });

    return result;
  } catch (error) {
    logger.error('Push local extensions failed', { error, tenantId });
    return {
      ...result,
      success: false,
      errors: [{ extensionId: 'push', error: error instanceof Error ? error.message : 'Unknown error' }]
    };
  }
}

/**
 * Reset SIP password for extension
 */
export async function resetExtensionPassword(
  tenantId: string,
  extensionId: string
): Promise<{ success: boolean; newPassword?: string; error?: string }> {
  try {
    await setTenantContext(db, tenantId);

    // Get existing extension
    const [existing] = await db.select()
      .from(voipExtensions)
      .where(and(
        eq(voipExtensions.id, extensionId),
        eq(voipExtensions.tenantId, tenantId)
      ))
      .limit(1);

    if (!existing) {
      return { success: false, error: 'Extension not found' };
    }

    // Generate new password
    const newPassword = generateSIPPassword(20);
    const encryptedPassword = await encryptionService.encrypt(newPassword, tenantId);

    // Update local extension
    await db.update(voipExtensions)
      .set({
        sipPassword: encryptedPassword,
        updatedAt: new Date()
      })
      .where(eq(voipExtensions.id, extensionId));

    // If extension has external_id, update password in EDGVoIP
    if (existing.externalId) {
      const client = await EdgvoipApiClient.fromTenantId(tenantId);
      
      if (client) {
        const response = await client.updateExtension(existing.externalId, {
          password: newPassword
        });

        if (!response.success) {
          logger.warn('Failed to update password in EDGVoIP', {
            tenantId,
            extensionId,
            error: response.error
          });
        }
      }
    }

    logger.info('Extension password reset', { tenantId, extensionId });

    return {
      success: true,
      newPassword // Return plaintext ONLY once
    };
  } catch (error) {
    logger.error('Failed to reset extension password', { error, tenantId, extensionId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset password'
    };
  }
}

/**
 * Sync extensions from EDGVoIP (unidirectional: GET only)
 * POST /extensions/sync is not available - we only pull extensions from EDGVoIP
 */
export async function syncExtensionsWithEdgvoip(
  tenantId: string,
  options?: {
    force?: boolean;
    extensionIds?: string[];
  }
): Promise<ExtensionSyncResult> {
  const result: ExtensionSyncResult = {
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
        errors: [{ extensionId: 'config', error: 'EDGVoIP not configured' }]
      };
    }

    logger.info('Starting extension sync from EDGVoIP (GET only)', { tenantId });

    // Fetch all extensions from EDGVoIP
    const extensionsResponse = await client.getExtensions();

    if (extensionsResponse.success && extensionsResponse.data) {
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

      for (const remoteExt of extensionsResponse.data) {
        try {
          // Check if extension exists locally by external_id OR by extension number
          let existing = null;
          
          // First try by external_id
          const [byExternalId] = await db.select()
            .from(voipExtensions)
            .where(and(
              eq(voipExtensions.externalId, remoteExt.external_id),
              eq(voipExtensions.tenantId, tenantId)
            ))
            .limit(1);
          
          if (byExternalId) {
            existing = byExternalId;
          } else {
            // Fallback: try by extension number (for first-time sync of existing local extensions)
            const [byExtNumber] = await db.select()
              .from(voipExtensions)
              .where(and(
                eq(voipExtensions.extension, remoteExt.extension),
                eq(voipExtensions.tenantId, tenantId)
              ))
              .limit(1);
            existing = byExtNumber || null;
          }

          // Build update data - PRESERVE local userId and storeId if remote is null
          const extData = {
            tenantId,
            externalId: remoteExt.external_id,
            extension: remoteExt.extension,
            displayName: remoteExt.display_name || remoteExt.extension,
            // CRITICAL: Preserve local storeId if remote doesn't provide one
            storeId: remoteExt.store_id || (existing?.storeId ?? null),
            status: remoteExt.status || 'active',
            type: remoteExt.type || 'user',
            settings: sanitizeJson(remoteExt.settings),
            registrationStatus: remoteExt.is_registered ? 'registered' : 'unregistered',
            syncSource: 'edgvoip' as const,
            syncStatus: 'synced' as const,
            lastSyncAt: new Date(),
            updatedAt: new Date()
          };

          if (existing) {
            // CRITICAL: Preserve local userId - never overwrite with null from remote
            // userId is a local W3Suite concept, not managed by EDGVoIP
            await db.update(voipExtensions)
              .set({
                ...extData,
                // Explicitly keep existing userId (EDGVoIP doesn't know about W3Suite users)
                userId: existing.userId
              })
              .where(eq(voipExtensions.id, existing.id));
            result.updated++;
          } else {
            // Generate local SIP credentials for new extension
            const sipPassword = generateSIPPassword(20);
            const sipUsername = `${remoteExt.extension}@w3suite`;
            const encryptedPassword = await encryptionService.encrypt(sipPassword, tenantId);

            await db.insert(voipExtensions)
              .values({
                ...extData,
                sipUsername,
                sipPassword: encryptedPassword,
                sipServer: 'sip.edgvoip.it',
                sipPort: 5060,
                wsPort: 7443,
                transport: 'WSS',
                authRealm: 'sip.edgvoip.it'
              });
            result.created++;
          }

          result.synced++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            extensionId: remoteExt.external_id,
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

    logger.info('Extension sync completed', {
      tenantId,
      ...result
    });

    return result;
  } catch (error) {
    logger.error('Extension sync failed', { error, tenantId });
    return {
      ...result,
      success: false,
      errors: [{ extensionId: 'sync', error: error instanceof Error ? error.message : 'Unknown error' }]
    };
  }
}

/**
 * Sync a single extension with EDGVoIP
 */
export async function syncExtensionWithEdgvoip(
  extensionId: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await setTenantContext(db, tenantId);

    const [extension] = await db.select()
      .from(voipExtensions)
      .where(and(
        eq(voipExtensions.id, extensionId),
        eq(voipExtensions.tenantId, tenantId)
      ))
      .limit(1);

    if (!extension) {
      return { success: false, error: 'Extension not found' };
    }

    const client = await EdgvoipApiClient.fromTenantId(tenantId);
    
    if (!client) {
      return { success: false, error: 'EDGVoIP not configured' };
    }

    // Sync this specific extension
    const syncResult = await syncExtensionsWithEdgvoip(tenantId, {
      extensionIds: [extension.externalId || extensionId]
    });

    return {
      success: syncResult.success,
      error: syncResult.errors?.length > 0 ? syncResult.errors[0].error : undefined
    };
  } catch (error) {
    logger.error('Failed to sync extension', { error, extensionId, tenantId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed'
    };
  }
}

/**
 * Get SIP credentials for user (decrypted)
 */
export async function getUserCredentials(
  userId: string,
  tenantId: string
): Promise<SIPCredentials | null> {
  try {
    await setTenantContext(db, tenantId);

    const [extension] = await db.select()
      .from(voipExtensions)
      .where(and(
        eq(voipExtensions.userId, userId),
        eq(voipExtensions.tenantId, tenantId),
        eq(voipExtensions.status, 'active')
      ))
      .limit(1);

    if (!extension) {
      return null;
    }

    // Decrypt password
    const decryptedPassword = await encryptionService.decrypt(extension.sipPassword, tenantId);

    if (!decryptedPassword) {
      logger.error('Failed to decrypt SIP password', { userId, tenantId });
      return null;
    }

    return {
      sipUsername: extension.sipUsername,
      sipPassword: decryptedPassword,
      sipServer: extension.sipServer || 'sip.edgvoip.it',
      sipPort: extension.sipPort || 5060,
      wsPort: extension.wsPort || 7443,
      transport: extension.transport || 'WSS',
      authRealm: extension.authRealm || extension.sipServer || 'sip.edgvoip.it',
      extension: extension.extension,
      displayName: extension.displayName
    };
  } catch (error) {
    logger.error('Failed to get user credentials', { error, userId, tenantId });
    return null;
  }
}

/**
 * Get registration status for all extensions from EDGVoIP
 */
export async function getExtensionRegistrationStatuses(
  tenantId: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const client = await EdgvoipApiClient.fromTenantId(tenantId);
    
    if (!client) {
      return { success: false, error: 'EDGVoIP not configured' };
    }

    const response = await client.getExtensionStatuses();

    if (!response.success) {
      return { 
        success: false, 
        error: response.error || 'Failed to get extension statuses' 
      };
    }

    logger.info('Retrieved extension registration statuses', { 
      tenantId, 
      count: response.data?.length || 0 
    });

    return { 
      success: true, 
      data: response.data || [] 
    };
  } catch (error) {
    logger.error('Failed to get extension registration statuses', { error, tenantId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get registration status for a single extension from EDGVoIP
 */
export async function getExtensionRegistrationStatus(
  tenantId: string,
  externalId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const client = await EdgvoipApiClient.fromTenantId(tenantId);
    
    if (!client) {
      return { success: false, error: 'EDGVoIP not configured' };
    }

    const response = await client.getExtensionStatus(externalId);

    if (!response.success) {
      return { 
        success: false, 
        error: response.error || 'Failed to get extension status' 
      };
    }

    logger.info('Retrieved extension registration status', { 
      tenantId, 
      externalId 
    });

    return { 
      success: true, 
      data: response.data 
    };
  } catch (error) {
    logger.error('Failed to get extension registration status', { error, tenantId, externalId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
