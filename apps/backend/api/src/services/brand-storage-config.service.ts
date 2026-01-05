/**
 * Brand Storage Config Service
 * 
 * Legge la configurazione AWS S3 centralizzata dalla Brand Interface
 * e fornisce le credenziali decriptate alla main app W3Suite.
 * 
 * Architettura:
 * Brand Interface (config) → Questo servizio (legge/decripta) → AWS S3 Service (usa)
 */

import { db } from '../core/db';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';
import { logger } from '../core/logger';

export interface BrandStorageConfig {
  provider: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region: string;
  endpoint?: string;
  versioningEnabled: boolean;
  encryptionEnabled: boolean;
  encryptionType: string;
  corsEnabled: boolean;
  corsAllowedOrigins: string[];
  signedUrlExpiryHours: number;
  maxUploadSizeMb: number;
  connectionStatus: string;
  lastConnectionTestAt: Date | null;
}

export interface TenantStorageAllocation {
  tenantId: string;
  tenantName: string;
  tenantSlug: string | null;
  quotaBytes: number;
  usedBytes: number;
  objectCount: number;
  alertThresholdPercent: number;
  suspended: boolean;
  suspendReason: string | null;
  maxUploadSizeMb: number | null;
  allowedFileTypes: string[] | null;
  features: Record<string, any>;
}

// Cache per la configurazione (evita query ripetute)
let cachedConfig: BrandStorageConfig | null = null;
let configCacheTime: number = 0;
const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minuti

/**
 * Decripta le credenziali usando AES-256-CBC
 * Stesso algoritmo usato dalla Brand Interface
 */
function decryptCredential(encryptedText: string, encryptKey: string): string {
  try {
    const [ivHex, encrypted] = encryptedText.split(':');
    if (!ivHex || !encrypted) {
      throw new Error('Invalid encrypted format');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const key = Buffer.from(encryptKey.padEnd(32).slice(0, 32));
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    logger.error('[BrandStorageConfig] Failed to decrypt credential', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw new Error('Failed to decrypt storage credentials');
  }
}

/**
 * Recupera la configurazione globale AWS S3 dalla Brand Interface
 * Le credenziali vengono decriptate usando STORAGE_ENCRYPTION_KEY
 */
export async function getBrandStorageConfig(forceRefresh = false): Promise<BrandStorageConfig | null> {
  // Check cache
  if (!forceRefresh && cachedConfig && Date.now() - configCacheTime < CONFIG_CACHE_TTL_MS) {
    return cachedConfig;
  }

  const encryptKey = process.env.STORAGE_ENCRYPTION_KEY;
  if (!encryptKey || encryptKey.length < 32) {
    logger.warn('[BrandStorageConfig] STORAGE_ENCRYPTION_KEY not configured or too short');
    return null;
  }

  try {
    // Query dalla tabella brand_interface.storage_global_config
    const result = await db.execute(sql`
      SELECT 
        provider,
        access_key_encrypted,
        secret_key_encrypted,
        bucket_name,
        region,
        endpoint,
        versioning_enabled,
        encryption_enabled,
        encryption_type,
        cors_enabled,
        cors_allowed_origins,
        signed_url_expiry_hours,
        max_upload_size_mb,
        connection_status,
        last_connection_test_at
      FROM brand_interface.storage_global_config
      WHERE connection_status = 'connected'
      LIMIT 1
    `);

    const rows = result.rows as any[];
    if (!rows || rows.length === 0) {
      logger.info('[BrandStorageConfig] No connected storage configuration found');
      return null;
    }

    const row = rows[0];
    
    // Verifica che le credenziali siano presenti
    if (!row.access_key_encrypted || !row.secret_key_encrypted) {
      logger.warn('[BrandStorageConfig] Storage config found but credentials are missing');
      return null;
    }

    // Decripta le credenziali
    const accessKeyId = decryptCredential(row.access_key_encrypted, encryptKey);
    const secretAccessKey = decryptCredential(row.secret_key_encrypted, encryptKey);

    const config: BrandStorageConfig = {
      provider: row.provider || 'aws_s3',
      accessKeyId,
      secretAccessKey,
      bucketName: row.bucket_name,
      region: row.region || 'eu-central-1',
      endpoint: row.endpoint || undefined,
      versioningEnabled: row.versioning_enabled ?? true,
      encryptionEnabled: row.encryption_enabled ?? true,
      encryptionType: row.encryption_type || 'AES256',
      corsEnabled: row.cors_enabled ?? true,
      corsAllowedOrigins: row.cors_allowed_origins || [],
      signedUrlExpiryHours: row.signed_url_expiry_hours || 24,
      maxUploadSizeMb: row.max_upload_size_mb || 100,
      connectionStatus: row.connection_status,
      lastConnectionTestAt: row.last_connection_test_at
    };

    // Aggiorna cache
    cachedConfig = config;
    configCacheTime = Date.now();

    logger.info('[BrandStorageConfig] Loaded AWS S3 configuration from Brand Interface', {
      bucket: config.bucketName,
      region: config.region,
      provider: config.provider
    });

    return config;
  } catch (error) {
    logger.error('[BrandStorageConfig] Failed to load storage configuration', {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Recupera l'allocazione storage per un tenant specifico
 */
export async function getTenantStorageAllocation(tenantId: string): Promise<TenantStorageAllocation | null> {
  try {
    const result = await db.execute(sql`
      SELECT 
        tenant_id,
        tenant_name,
        tenant_slug,
        quota_bytes,
        used_bytes,
        object_count,
        alert_threshold_percent,
        suspended,
        suspend_reason,
        max_upload_size_mb,
        allowed_file_types,
        features
      FROM brand_interface.tenant_storage_allocations
      WHERE tenant_id = ${tenantId}::uuid
      LIMIT 1
    `);

    const rows = result.rows as any[];
    if (!rows || rows.length === 0) {
      logger.info('[BrandStorageConfig] No storage allocation found for tenant', { tenantId });
      return null;
    }

    const row = rows[0];
    return {
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      tenantSlug: row.tenant_slug,
      quotaBytes: row.quota_bytes || 0,
      usedBytes: row.used_bytes || 0,
      objectCount: row.object_count || 0,
      alertThresholdPercent: row.alert_threshold_percent || 80,
      suspended: row.suspended || false,
      suspendReason: row.suspend_reason,
      maxUploadSizeMb: row.max_upload_size_mb,
      allowedFileTypes: row.allowed_file_types,
      features: row.features || {}
    };
  } catch (error) {
    logger.error('[BrandStorageConfig] Failed to load tenant allocation', {
      tenantId,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

/**
 * Aggiorna l'utilizzo storage di un tenant
 */
export async function updateTenantStorageUsage(
  tenantId: string,
  deltaBytes: number,
  deltaObjects: number
): Promise<void> {
  try {
    await db.execute(sql`
      UPDATE brand_interface.tenant_storage_allocations
      SET 
        used_bytes = GREATEST(0, COALESCE(used_bytes, 0) + ${deltaBytes}),
        object_count = GREATEST(0, COALESCE(object_count, 0) + ${deltaObjects}),
        last_usage_update_at = NOW(),
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid
    `);
    
    logger.debug('[BrandStorageConfig] Updated tenant storage usage', {
      tenantId,
      deltaBytes,
      deltaObjects
    });
  } catch (error) {
    logger.error('[BrandStorageConfig] Failed to update tenant usage', {
      tenantId,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Verifica se un tenant può caricare file (non sospeso e sotto quota)
 */
export async function canTenantUpload(tenantId: string, fileSizeBytes: number): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  try {
    const allocation = await getTenantStorageAllocation(tenantId);
    
    // If no allocation configured in Brand Interface, allow by default (permissive fallback)
    // This prevents blocking uploads when Brand Interface is not configured
    if (!allocation) {
      logger.debug('[BrandStorageConfig] No tenant allocation found, allowing upload by default', { tenantId });
      return { allowed: true };
    }

    if (allocation.suspended) {
      return { allowed: false, reason: allocation.suspendReason || 'Account storage sospeso' };
    }

    // Only enforce quota if it's set (quotaBytes > 0)
    if (allocation.quotaBytes > 0) {
      const projectedUsage = allocation.usedBytes + fileSizeBytes;
      if (projectedUsage > allocation.quotaBytes) {
        return { 
          allowed: false, 
          reason: `Quota storage superata. Utilizzati: ${formatBytes(allocation.usedBytes)}, Quota: ${formatBytes(allocation.quotaBytes)}` 
        };
      }
    }

    return { allowed: true };
  } catch (error) {
    // If Brand Interface is unavailable, allow by default (graceful degradation)
    logger.warn('[BrandStorageConfig] Failed to check tenant quota, allowing by default', {
      tenantId,
      error: error instanceof Error ? error.message : String(error)
    });
    return { allowed: true };
  }
}

/**
 * Formatta bytes in formato leggibile
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Invalida la cache della configurazione
 * Da chiamare quando la Brand Interface aggiorna la config
 */
export function invalidateConfigCache(): void {
  cachedConfig = null;
  configCacheTime = 0;
  logger.info('[BrandStorageConfig] Configuration cache invalidated');
}

/**
 * Verifica se lo storage centralizzato è configurato
 */
export async function isStorageConfigured(): Promise<boolean> {
  const config = await getBrandStorageConfig();
  return config !== null && config.connectionStatus === 'connected';
}
