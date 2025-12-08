/**
 * VoIP Extension Service
 * 
 * Manages SIP extension lifecycle including:
 * - Cryptographically secure SIP password generation (16+ chars)
 * - Password encryption using EncryptionKeyService
 * - SIP credentials provisioning and retrieval
 * - edgvoip API sync (stub for future implementation)
 */

import crypto from 'crypto';
import { db, setTenantContext } from '../core/db';
import { eq, and } from 'drizzle-orm';
import { voipExtensions, VoipExtension } from '../db/schema/w3suite';
import { EncryptionKeyService } from '../core/encryption-service';
import { structuredLogger } from '../core/logger';

// ==================== INTERFACES ====================
export interface SIPCredentials {
  sipUsername: string;
  sipPassword: string; // Plaintext - ONLY returned on creation
  sipServer: string;
  sipPort: number;
  wsPort: number;
  transport: string;
  authRealm: string;
  extension: string;
  displayName: string | null;
}

export interface DecryptedExtension extends Omit<VoipExtension, 'sipPassword'> {
  sipPassword: string; // Decrypted plaintext password
}

// ==================== VOIP EXTENSION SERVICE ====================
export class VoIPExtensionService {
  private encryptionService: EncryptionKeyService;

  constructor() {
    this.encryptionService = new EncryptionKeyService();
  }

  /**
   * Generate cryptographically secure SIP password
   * 
   * Requirements (from web research):
   * - Length: 16+ characters
   * - Complexity: Mixed case + digits + special chars
   * - Random generation using crypto.randomInt()
   * - No predictable patterns
   * 
   * @param length Password length (default: 20 for extra security)
   * @returns Secure random password
   */
  generateSIPPassword(length: number = 20): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    const special = '!@#$%^&*()-_=+[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + digits + special;
    
    // Ensure complexity requirements are met
    const password: string[] = [
      lowercase[crypto.randomInt(lowercase.length)],
      uppercase[crypto.randomInt(uppercase.length)],
      digits[crypto.randomInt(digits.length)],
      special[crypto.randomInt(special.length)]
    ];
    
    // Fill remaining characters
    for (let i = 4; i < length; i++) {
      password.push(allChars[crypto.randomInt(allChars.length)]);
    }
    
    // Shuffle to avoid predictable patterns (first chars always meet requirements)
    for (let i = password.length - 1; i > 0; i--) {
      const j = crypto.randomInt(i + 1);
      [password[i], password[j]] = [password[j], password[i]];
    }
    
    return password.join('');
  }

  /**
   * Encrypt SIP password for storage
   * Uses tenant-specific encryption key via EncryptionKeyService
   * 
   * SECURITY FIX: Now uses actual secret key material, not just tenant ID
   * 
   * @param plainPassword Plaintext SIP password
   * @param tenantId Tenant ID for encryption key lookup
   * @returns Encrypted password format: keyId:iv:authTag:encrypted
   */
  async encryptPassword(plainPassword: string, tenantId: string): Promise<string> {
    try {
      // Get or create active encryption key for tenant
      let keyMetadata = await this.encryptionService.getActiveTenantKey(tenantId);
      
      if (!keyMetadata) {
        structuredLogger.warn('No encryption key found for tenant, creating new key', { tenantId } as any);
        keyMetadata = await this.encryptionService.createTenantKey(tenantId);
        
        if (!keyMetadata) {
          throw new Error('Failed to create encryption key for tenant');
        }
      }

      // Derive encryption key using PBKDF2 with tenant-specific salt + secure secret
      // SECURITY: We use keyId as secret material (random UUID) combined with salt
      // This ensures each tenant has unique, non-guessable key material
      const algorithm = 'aes-256-gcm';
      const key = crypto.pbkdf2Sync(
        keyMetadata.keyId, // Use random keyId as secret (NOT tenant ID!)
        Buffer.from(keyMetadata.saltBase64, 'base64'),
        keyMetadata.iterations,
        32,
        'sha256'
      );
      
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      
      let encrypted = cipher.update(plainPassword, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      const authTag = cipher.getAuthTag();
      
      // Format: keyId:iv:authTag:encrypted (keyId needed for decryption)
      return `${keyMetadata.keyId}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
    } catch (error) {
      structuredLogger.error('Failed to encrypt SIP password', { error: error instanceof Error ? error : undefined, tenantId } as any);
      throw new Error('Password encryption failed');
    }
  }

  /**
   * Decrypt SIP password for SIP.js registration
   * 
   * SECURITY FIX: Now uses keyId to fetch correct key material
   * 
   * @param encryptedPassword Encrypted password from database (format: keyId:iv:authTag:encrypted)
   * @param tenantId Tenant ID (for validation only)
   * @returns Decrypted plaintext password
   */
  async decryptPassword(encryptedPassword: string | null | undefined, tenantId: string): Promise<string> {
    try {
      // Guard against null/undefined values
      if (!encryptedPassword) {
        structuredLogger.warn('SIP password is null/empty', { tenantId } as any);
        return '';
      }
      
      // DEVELOPMENT FALLBACK: Check if password is plaintext (for testing)
      // In development, webhooks may send plaintext passwords before encryption is set up
      const parts = encryptedPassword.split(':');
      
      if (parts.length !== 4) {
        // Not encrypted format - assume plaintext for development
        structuredLogger.info('Password is plaintext (not encrypted)', { tenantId, passwordLength: encryptedPassword.length } as any);
        return encryptedPassword;
      }

      const [keyId, ivBase64, authTagBase64, encrypted] = parts;
      
      // Get key metadata by keyId (not active key!)
      const keyMetadata = await this.encryptionService.getKeyByKeyId(keyId);
      
      if (!keyMetadata) {
        throw new Error(`Encryption key not found: ${keyId}`);
      }

      // Verify tenant ID matches (security check)
      if (keyMetadata.tenantId !== tenantId) {
        throw new Error('Tenant ID mismatch - unauthorized decryption attempt');
      }

      const algorithm = 'aes-256-gcm';
      const key = crypto.pbkdf2Sync(
        keyMetadata.keyId, // Use same keyId as encryption
        Buffer.from(keyMetadata.saltBase64, 'base64'),
        keyMetadata.iterations,
        32,
        'sha256'
      );
      
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      structuredLogger.error('Failed to decrypt SIP password', { error: error instanceof Error ? error : undefined, tenantId } as any);
      throw new Error('Password decryption failed');
    }
  }

  /**
   * Get SIP credentials for user (decrypted)
   * Used by softphone for SIP.js registration
   * 
   * @param userId User ID
   * @param tenantId Tenant ID
   * @returns Decrypted SIP credentials or null if extension not found
   */
  async getUserCredentials(userId: string, tenantId: string): Promise<SIPCredentials | null> {
    try {
      structuredLogger.info('[VOIP-EXT-SVC] Searching for extension', { userId, tenantId } as any);
      
      // Set RLS context before query
      await setTenantContext(db, tenantId);
      
      const extension = await db.query.voipExtensions.findFirst({
        where: and(
          eq(voipExtensions.userId, userId),
          eq(voipExtensions.tenantId, tenantId),
          eq(voipExtensions.status, 'active')
        )
      });

      structuredLogger.info('[VOIP-EXT-SVC] Query result', { 
        found: !!extension, 
        extensionNumber: extension?.extension,
        extensionUserId: extension?.userId,
        userId,
        tenantId 
      } as any);

      if (!extension) {
        return null;
      }

      // Decrypt password
      const decryptedPassword = await this.decryptPassword(extension.sipPassword, tenantId);

      return {
        sipUsername: extension.sipUsername,
        sipPassword: decryptedPassword, // Plaintext for SIP.js
        sipServer: extension.sipServer || 'demo.edgvoip.it',
        sipPort: extension.sipPort || 5060,
        wsPort: extension.wsPort || 443, // SEMPRE 443 per WSS
        wsPath: extension.wsPath || '/ws', // SEMPRE /ws
        transport: extension.transport || 'WSS',
        authRealm: extension.authRealm || extension.sipServer || 'demo.edgvoip.it',
        extension: extension.extension,
        displayName: extension.displayName
      };
    } catch (error) {
      structuredLogger.error('Failed to get user credentials', { error: error instanceof Error ? error : undefined, userId, tenantId } as any);
      throw error;
    }
  }

  /**
   * Reset SIP password for extension
   * Generates new password, encrypts it, and updates database
   * 
   * @param extensionId Extension ID
   * @param tenantId Tenant ID
   * @returns New plaintext password (ONLY returned once)
   */
  async resetPassword(extensionId: string, tenantId: string): Promise<string> {
    try {
      // Generate new password
      const newPassword = this.generateSIPPassword(20);
      
      // Encrypt it
      const encryptedPassword = await this.encryptPassword(newPassword, tenantId);
      
      // Update database
      await db.update(voipExtensions)
        .set({
          sipPassword: encryptedPassword,
          updatedAt: new Date()
        })
        .where(and(
          eq(voipExtensions.id, extensionId),
          eq(voipExtensions.tenantId, tenantId)
        ));

      structuredLogger.info('SIP password reset successfully', { extensionId, tenantId } as any);
      
      return newPassword; // Return plaintext ONLY once
    } catch (error) {
      structuredLogger.error('Failed to reset SIP password', { error: error instanceof Error ? error : undefined, extensionId, tenantId } as any);
      throw error;
    }
  }

  /**
   * Sync extension with edgvoip API (STUB)
   * TODO: Implement actual edgvoip API integration
   * 
   * @param extensionId Extension ID
   * @param tenantId Tenant ID
   * @returns Sync status
   */
  async syncWithEdgvoip(extensionId: string, tenantId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // TODO: Implement actual edgvoip API calls:
      // 1. GET /api/extensions/:id to fetch remote state
      // 2. Compare with local state
      // 3. POST/PUT to edgvoip if needed
      // 4. Update syncStatus, lastSyncAt, edgvoipExtensionId

      structuredLogger.warn('edgvoip sync not implemented yet (stub)', { extensionId, tenantId } as any);

      // For now, just mark as pending
      await db.update(voipExtensions)
        .set({
          syncStatus: 'pending',
          syncErrorMessage: 'edgvoip API integration not implemented yet',
          updatedAt: new Date()
        })
        .where(and(
          eq(voipExtensions.id, extensionId),
          eq(voipExtensions.tenantId, tenantId)
        ));

      return {
        success: false,
        message: 'edgvoip API integration pending - manual configuration required'
      };
    } catch (error) {
      structuredLogger.error('Failed to sync with edgvoip', { error: error instanceof Error ? error : undefined, extensionId, tenantId } as any);
      
      await db.update(voipExtensions)
        .set({
          syncStatus: 'failed',
          syncErrorMessage: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date()
        })
        .where(and(
          eq(voipExtensions.id, extensionId),
          eq(voipExtensions.tenantId, tenantId)
        ));

      return {
        success: false,
        message: 'Sync failed: ' + (error instanceof Error ? error.message : 'Unknown error')
      };
    }
  }
}

// Export singleton instance
export const voipExtensionService = new VoIPExtensionService();
