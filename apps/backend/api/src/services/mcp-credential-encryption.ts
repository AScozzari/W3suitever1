/**
 * MCP Credential Encryption Utilities
 * 
 * Enterprise-grade encryption for MCP server credentials using existing
 * encryption key management service with tenant-specific keys and rotation.
 * 
 * Security Features:
 * - Tenant-specific encryption keys with automatic rotation
 * - Random IV per encryption operation
 * - AES-256-GCM authenticated encryption
 * - GDPR-compliant key destruction
 * 
 * @author W3 Suite Team
 * @date 2025-10-08
 */

import crypto from 'crypto';
import { encryptionKeyService } from '../core/encryption-service.js';
import { logger } from '../core/logger.js';
import { db } from '../core/db.js';
import { encryptionKeys } from '../db/schema/w3suite.js';
import { eq } from 'drizzle-orm';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get master encryption secret from environment
 * SECURITY: This MUST be set in production or encryption will fail
 */
function getMasterSecret(): string {
  const secret = process.env.MCP_ENCRYPTION_KEY;
  
  if (!secret) {
    // In development mode, use a default secret
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  WARNING: Using default MCP_ENCRYPTION_KEY for development. NEVER use in production!');
      return 'INSECURE_DEV_KEY_FOR_MCP_CREDENTIALS_DO_NOT_USE_IN_PRODUCTION_1234567890';
    }
    
    throw new Error(
      'CRITICAL SECURITY ERROR: MCP_ENCRYPTION_KEY environment variable is not set. ' +
      'MCP credential encryption requires a secure master key. ' +
      'Set MCP_ENCRYPTION_KEY in your environment to proceed.'
    );
  }
  
  if (secret.length < 32) {
    throw new Error(
      'SECURITY ERROR: MCP_ENCRYPTION_KEY must be at least 32 characters long for secure encryption.'
    );
  }
  
  return secret;
}

/**
 * Derive tenant-isolated encryption key
 * SECURITY: Two-level derivation for complete tenant isolation
 * - Level 1: Master secret + tenant salt → tenant-specific intermediate key
 * - Level 2: Tenant key + keyId salt → final encryption key (rotation support)
 */
async function deriveEncryptionKey(
  tenantId: string,
  keyId?: string
): Promise<{ key: Buffer; keyMetadata: any }> {
  try {
    // Get key metadata - either specific keyId (for decrypt) or active (for encrypt)
    let keyMetadata;
    if (keyId) {
      // GDPR COMPLIANCE: Fetch key including destroyed ones for proper error signaling
      // We need to detect destroyed keys explicitly, not just return "not found"
      const [key] = await db
        .select()
        .from(encryptionKeys)
        .where(eq(encryptionKeys.keyId, keyId))
        .limit(1);
      
      if (!key) {
        throw new Error(`Encryption key not found: ${keyId}`);
      }
      
      // Validate tenant ownership BEFORE checking destroyed status
      if (key.tenantId !== tenantId) {
        throw new Error('Tenant mismatch for encryption key');
      }
      
      // GDPR COMPLIANCE: Return metadata INCLUDING destroyedAt
      // Caller (decryptMCPCredentials) will check destroyedAt and throw appropriate error
      // This allows proper audit trail signaling
      keyMetadata = {
        id: key.id,
        keyId: key.keyId,
        tenantId: key.tenantId,
        version: key.version,
        algorithm: key.algorithm,
        keyLength: key.keyLength,
        saltBase64: key.saltBase64,
        iterations: key.iterations,
        isActive: key.isActive,
        createdAt: key.createdAt,
        expiresAt: key.expiresAt,
        destroyedAt: key.destroyedAt
      };
    } else {
      keyMetadata = await encryptionKeyService.getActiveTenantKey(tenantId);
      if (!keyMetadata) {
        throw new Error(`No active encryption key for tenant ${tenantId}`);
      }
    }
    
    // Get master secret
    const masterSecret = getMasterSecret();
    
    // LEVEL 1: Derive tenant-specific intermediate key
    // Combines master secret + tenant salt for tenant isolation
    const tenantSalt = Buffer.from(keyMetadata.saltBase64, 'base64');
    const tenantKey = crypto.scryptSync(
      masterSecret,
      tenantSalt,
      32,
      {
        N: Math.pow(2, 14),
        r: 8,
        p: 1,
        maxmem: 64 * 1024 * 1024
      }
    );
    
    // LEVEL 2: Derive final key from tenant key + keyId
    // Enables key rotation while maintaining tenant isolation
    const keyIdSalt = Buffer.from(keyMetadata.keyId, 'utf8');
    const finalKey = crypto.scryptSync(
      tenantKey,
      keyIdSalt,
      32,
      {
        N: Math.pow(2, 13), // Lower cost for second derivation
        r: 8,
        p: 1,
        maxmem: 64 * 1024 * 1024
      }
    );
    
    // SECURITY: No logging of keyId or salt
    logger.info('Derived encryption key for MCP credentials', {
      tenantId,
      keyVersion: keyMetadata.version
    });
    
    return { key: finalKey, keyMetadata };
  } catch (error: any) {
    logger.error('Failed to derive encryption key', {
      tenantId,
      error: error.message
    });
    throw new Error(`Key derivation failed: ${error.message}`);
  }
}

/**
 * Encrypt MCP server credentials
 * 
 * @param data - Credentials object to encrypt
 * @param tenantId - Tenant ID for key derivation
 * @returns Encrypted data with IV, auth tag, and keyId
 */
export async function encryptMCPCredentials(
  data: Record<string, any>,
  tenantId: string
): Promise<Record<string, any>> {
  try {
    // Derive tenant-isolated encryption key (uses active key)
    const { key, keyMetadata } = await deriveEncryptionKey(tenantId);
    
    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt data
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data), 'utf8'),
      cipher.final()
    ]);
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // SECURITY: Minimal logging, no keyId/salt exposure
    logger.info('Encrypted MCP credentials', {
      tenantId,
      dataSize: encrypted.length
    });
    
    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      keyId: keyMetadata.keyId, // Store keyId for rotation support
      algorithm: ALGORITHM,
      keyVersion: keyMetadata.version
    };
  } catch (error: any) {
    logger.error('Failed to encrypt MCP credentials', {
      tenantId,
      errorType: error.constructor.name
    });
    throw new Error(`Credential encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt MCP server credentials
 * SECURITY: Supports key rotation by using stored keyId
 * 
 * @param encryptedData - Encrypted data object with IV, auth tag, and keyId
 * @param tenantId - Tenant ID for key derivation and validation
 * @returns Decrypted credentials object
 */
export async function decryptMCPCredentials(
  encryptedData: Record<string, any>,
  tenantId: string
): Promise<Record<string, any>> {
  try {
    // Validate encrypted data structure
    if (!encryptedData.encrypted || !encryptedData.iv || !encryptedData.authTag || !encryptedData.keyId) {
      throw new Error('Invalid encrypted data structure: missing required fields');
    }
    
    // SECURITY: Derive key using stored keyId for rotation support
    // This fetches historical key if rotated, ensuring old ciphertext remains decryptable
    const { key, keyMetadata } = await deriveEncryptionKey(tenantId, encryptedData.keyId);
    
    // GDPR COMPLIANCE CHECK: Validate key is not destroyed
    // This check provides audit-specific error signaling for destroyed keys
    if (keyMetadata.destroyedAt) {
      logger.error('Attempted to decrypt with destroyed encryption key', {
        tenantId,
        keyVersion: keyMetadata.version,
        destroyedAt: keyMetadata.destroyedAt,
        complianceViolation: 'GDPR_KEY_DESTROYED'
      });
      throw new Error('GDPR_KEY_DESTROYED');
    }
    
    // Convert base64 to buffers
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');
    const encrypted = Buffer.from(encryptedData.encrypted, 'base64');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt data
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    // SECURITY: Minimal logging, no sensitive data
    logger.info('Decrypted MCP credentials', {
      tenantId,
      dataSize: decrypted.length
    });
    
    return JSON.parse(decrypted.toString('utf8'));
  } catch (error: any) {
    // Re-throw with context - GDPR compliance signals FIRST for audit
    if (error.message === 'GDPR_KEY_DESTROYED') {
      // GDPR COMPLIANCE: Specific error for destroyed keys (audit trail)
      // This is the PRIMARY path for GDPR compliance signaling
      throw new Error('GDPR_COMPLIANCE: Credentials unavailable - encryption key destroyed per data retention policy');
    }
    
    // SECURITY: Preserve error semantics without leaking details for other errors
    logger.error('Failed to decrypt MCP credentials', {
      tenantId,
      errorType: error.constructor.name,
      isAuthError: error.message?.includes('auth'),
      isKeyError: error.message?.includes('key'),
      isTenantError: error.message?.includes('Tenant mismatch')
    });
    
    if (error.message?.includes('Tenant mismatch')) {
      throw new Error('Security error: tenant mismatch');
    } else if (error.message?.includes('key not found')) {
      throw new Error('Credentials unavailable: encryption key not found');
    } else {
      throw new Error(`Credential decryption failed: ${error.message}`);
    }
  }
}

/**
 * Re-encrypt credentials with new key (for key rotation)
 * SECURITY: Validates old key, decrypts, re-encrypts with active key
 * 
 * @param encryptedData - Old encrypted data with keyId
 * @param tenantId - Tenant ID
 * @returns New encrypted data with updated keyId
 */
export async function reEncryptMCPCredentials(
  encryptedData: Record<string, any>,
  tenantId: string
): Promise<Record<string, any>> {
  try {
    // Decrypt with historical key (uses stored keyId)
    const decrypted = await decryptMCPCredentials(encryptedData, tenantId);
    
    // Encrypt with current active key
    const reEncrypted = await encryptMCPCredentials(decrypted, tenantId);
    
    // SECURITY: Minimal logging
    logger.info('Re-encrypted MCP credentials after key rotation', {
      tenantId,
      oldVersion: encryptedData.keyVersion,
      newVersion: reEncrypted.keyVersion
    });
    
    return reEncrypted;
  } catch (error: any) {
    logger.error('Failed to re-encrypt MCP credentials', {
      tenantId,
      errorType: error.constructor.name
    });
    throw new Error(`Credential re-encryption failed: ${error.message}`);
  }
}
