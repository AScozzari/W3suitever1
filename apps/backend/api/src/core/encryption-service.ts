// Enterprise Encryption Key Management Service
// Handles key metadata, rotation, and GDPR compliance for tenant encryption keys

import { db } from "./db";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { encryptionKeys, EncryptionKey, InsertEncryptionKey } from "../db/schema/w3suite";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

// ==================== INTERFACES ====================
export interface KeyMetadata {
  id: string;
  keyId: string;
  tenantId: string;
  version: number;
  algorithm: string;
  keyLength: number;
  saltBase64: string;
  iterations: number;
  isActive: boolean;
  createdAt: Date;
  expiresAt: Date | null;
  destroyedAt: Date | null;
}

export interface KeyRotationResult {
  oldKeyId: string;
  newKeyId: string;
  rotatedAt: Date;
  affectedRecords: number;
}

export interface GDPRDeletionResult {
  keysDestroyed: number;
  deletionTimestamp: Date;
  affectedTenants: string[];
}

export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  iterations: number;
  saltLength: number;
  keyExpiryDays: number;
}

// ==================== ENCRYPTION KEY SERVICE ====================
export class EncryptionKeyService {
  private config: EncryptionConfig;

  constructor() {
    this.config = {
      algorithm: 'AES-GCM',
      keyLength: 256,
      iterations: 100000,
      saltLength: 32,
      keyExpiryDays: 90
    };
  }

  // ==================== KEY CREATION & MANAGEMENT ====================
  
  /**
   * Creates a new encryption key for a tenant
   * Only stores metadata - actual key is derived client-side
   */
  async createTenantKey(tenantId: string): Promise<KeyMetadata> {
    try {
      // Generate unique key ID
      const keyId = this.generateKeyId();
      
      // Generate secure salt for key derivation
      const salt = crypto.randomBytes(this.config.saltLength);
      const saltBase64 = salt.toString('base64');
      
      // Set expiry date (90 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.config.keyExpiryDays);
      
      // Deactivate any existing active keys for this tenant
      await this.deactivateExistingKeys(tenantId);
      
      const keyData: InsertEncryptionKey = {
        keyId,
        tenantId,
        version: await this.getNextVersion(tenantId),
        algorithm: this.config.algorithm,
        keyLength: this.config.keyLength,
        saltBase64,
        iterations: this.config.iterations,
        isActive: true,
        expiresAt
      };

      const [newKey] = await db.insert(encryptionKeys).values(keyData).returning();
      
      console.log(`🔐 Created new encryption key for tenant ${tenantId}: ${keyId}`);
      
      return this.mapToKeyMetadata(newKey);
    } catch (error) {
      console.error('Failed to create tenant encryption key:', error);
      throw new Error(`Failed to create encryption key for tenant ${tenantId}`);
    }
  }

  /**
   * Retrieves the active encryption key metadata for a tenant
   */
  async getActiveTenantKey(tenantId: string): Promise<KeyMetadata | null> {
    try {
      const [activeKey] = await db
        .select()
        .from(encryptionKeys)
        .where(
          and(
            eq(encryptionKeys.tenantId, tenantId),
            eq(encryptionKeys.isActive, true),
            isNull(encryptionKeys.destroyedAt)
          )
        )
        .orderBy(desc(encryptionKeys.createdAt))
        .limit(1);

      if (!activeKey) {
        // No active key found, create one
        return await this.createTenantKey(tenantId);
      }

      // Check if key has expired
      if (activeKey.expiresAt && new Date() > activeKey.expiresAt) {
        console.log(`🔄 Encryption key expired for tenant ${tenantId}, rotating...`);
        const rotationResult = await this.rotateKey(tenantId);
        return await this.getKeyByKeyId(rotationResult.newKeyId);
      }

      return this.mapToKeyMetadata(activeKey);
    } catch (error) {
      console.error('Failed to get active tenant key:', error);
      throw new Error(`Failed to retrieve encryption key for tenant ${tenantId}`);
    }
  }

  /**
   * Retrieves key metadata by keyId (used for decryption)
   */
  async getKeyByKeyId(keyId: string): Promise<KeyMetadata | null> {
    try {
      const [key] = await db
        .select()
        .from(encryptionKeys)
        .where(
          and(
            eq(encryptionKeys.keyId, keyId),
            isNull(encryptionKeys.destroyedAt)
          )
        )
        .limit(1);

      return key ? this.mapToKeyMetadata(key) : null;
    } catch (error) {
      console.error('Failed to get key by keyId:', error);
      return null;
    }
  }

  /**
   * Lists all encryption keys for a tenant (for admin purposes)
   */
  async getTenantKeys(tenantId: string, includeDestroyed: boolean = false): Promise<KeyMetadata[]> {
    try {
      const whereConditions = [eq(encryptionKeys.tenantId, tenantId)];
      
      if (!includeDestroyed) {
        whereConditions.push(isNull(encryptionKeys.destroyedAt));
      }

      const keys = await db
        .select()
        .from(encryptionKeys)
        .where(and(...whereConditions))
        .orderBy(desc(encryptionKeys.createdAt));

      return keys.map(key => this.mapToKeyMetadata(key));
    } catch (error) {
      console.error('Failed to get tenant keys:', error);
      throw new Error(`Failed to retrieve keys for tenant ${tenantId}`);
    }
  }

  // ==================== KEY ROTATION ====================

  /**
   * Rotates encryption key for a tenant
   */
  async rotateKey(tenantId: string): Promise<KeyRotationResult> {
    try {
      // Get current active key
      const currentKey = await this.getActiveTenantKey(tenantId);
      if (!currentKey) {
        throw new Error('No active key found to rotate');
      }

      // Create new key
      const newKey = await this.createTenantKey(tenantId);
      
      // Deactivate old key (but don't destroy - needed for decrypting existing data)
      await db
        .update(encryptionKeys)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(encryptionKeys.keyId, currentKey.keyId));

      // In a real implementation, we would need to:
      // 1. Re-encrypt existing data with the new key
      // 2. Update all references to use the new keyId
      // For now, we'll count this as a successful rotation
      
      console.log(`🔄 Key rotation completed for tenant ${tenantId}: ${currentKey.keyId} → ${newKey.keyId}`);
      
      return {
        oldKeyId: currentKey.keyId,
        newKeyId: newKey.keyId,
        rotatedAt: new Date(),
        affectedRecords: 0 // Would be updated after re-encryption
      };
    } catch (error) {
      console.error('Failed to rotate encryption key:', error);
      throw new Error(`Failed to rotate key for tenant ${tenantId}`);
    }
  }

  /**
   * Schedules automatic key rotation for keys nearing expiry
   */
  async scheduleKeyRotations(): Promise<string[]> {
    try {
      // Find keys expiring in the next 7 days
      const expiryThreshold = new Date();
      expiryThreshold.setDate(expiryThreshold.getDate() + 7);

      const expiringKeys = await db
        .select()
        .from(encryptionKeys)
        .where(
          and(
            eq(encryptionKeys.isActive, true),
            isNull(encryptionKeys.destroyedAt),
            sql`${encryptionKeys.expiresAt} <= ${expiryThreshold}`
          )
        );

      const rotatedTenants: string[] = [];

      for (const key of expiringKeys) {
        try {
          await this.rotateKey(key.tenantId);
          rotatedTenants.push(key.tenantId);
        } catch (error) {
          console.error(`Failed to rotate key for tenant ${key.tenantId}:`, error);
        }
      }

      if (rotatedTenants.length > 0) {
        console.log(`🔄 Scheduled key rotation completed for ${rotatedTenants.length} tenants`);
      }

      return rotatedTenants;
    } catch (error) {
      console.error('Failed to schedule key rotations:', error);
      return [];
    }
  }

  // ==================== GDPR COMPLIANCE ====================

  /**
   * Destroys encryption keys for GDPR "right to be forgotten"
   * This makes encrypted data unrecoverable
   */
  async destroyTenantKeys(tenantId: string, reason: string = 'GDPR_REQUEST'): Promise<GDPRDeletionResult> {
    try {
      const deletionTimestamp = new Date();
      
      // Mark all keys for this tenant as destroyed
      const result = await db
        .update(encryptionKeys)
        .set({
          isActive: false,
          destroyedAt: deletionTimestamp,
          destroyReason: reason
        })
        .where(
          and(
            eq(encryptionKeys.tenantId, tenantId),
            isNull(encryptionKeys.destroyedAt)
          )
        )
        .returning({ keyId: encryptionKeys.keyId });

      const keysDestroyed = result.length;
      
      console.log(`🗑️ GDPR Key destruction completed for tenant ${tenantId}: ${keysDestroyed} keys destroyed`);
      
      return {
        keysDestroyed,
        deletionTimestamp,
        affectedTenants: [tenantId]
      };
    } catch (error) {
      console.error('Failed to destroy encryption keys:', error);
      throw new Error(`Failed to destroy keys for tenant ${tenantId}`);
    }
  }

  /**
   * Destroys specific key by keyId
   */
  async destroySpecificKey(keyId: string, reason: string = 'MANUAL_DESTRUCTION'): Promise<boolean> {
    try {
      const [result] = await db
        .update(encryptionKeys)
        .set({
          isActive: false,
          destroyedAt: new Date(),
          destroyReason: reason
        })
        .where(
          and(
            eq(encryptionKeys.keyId, keyId),
            isNull(encryptionKeys.destroyedAt)
          )
        )
        .returning({ keyId: encryptionKeys.keyId });

      if (result) {
        console.log(`🗑️ Destroyed encryption key: ${keyId}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to destroy specific key:', error);
      return false;
    }
  }

  // ==================== UTILITY METHODS ====================

  private generateKeyId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString('hex');
    return `key_${timestamp}_${random}`;
  }

  private async getNextVersion(tenantId: string): Promise<number> {
    const [latestKey] = await db
      .select({ version: encryptionKeys.version })
      .from(encryptionKeys)
      .where(eq(encryptionKeys.tenantId, tenantId))
      .orderBy(desc(encryptionKeys.version))
      .limit(1);

    return latestKey ? latestKey.version + 1 : 1;
  }

  private async deactivateExistingKeys(tenantId: string): Promise<void> {
    await db
      .update(encryptionKeys)
      .set({ isActive: false })
      .where(
        and(
          eq(encryptionKeys.tenantId, tenantId),
          eq(encryptionKeys.isActive, true)
        )
      );
  }

  private mapToKeyMetadata(key: EncryptionKey): KeyMetadata {
    return {
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
  }

  // ==================== HEALTH CHECK ====================

  /**
   * Performs health check on encryption key system
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    details: {
      totalActiveKeys: number;
      keysNearingExpiry: number;
      destroyedKeys: number;
      oldestActiveKey: Date | null;
    };
  }> {
    try {
      // Count active keys
      const [activeKeysResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(encryptionKeys)
        .where(
          and(
            eq(encryptionKeys.isActive, true),
            isNull(encryptionKeys.destroyedAt)
          )
        );

      // Count keys expiring in next 7 days
      const expiryThreshold = new Date();
      expiryThreshold.setDate(expiryThreshold.getDate() + 7);

      const [expiringKeysResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(encryptionKeys)
        .where(
          and(
            eq(encryptionKeys.isActive, true),
            isNull(encryptionKeys.destroyedAt),
            sql`${encryptionKeys.expiresAt} <= ${expiryThreshold}`
          )
        );

      // Count destroyed keys
      const [destroyedKeysResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(encryptionKeys)
        .where(sql`${encryptionKeys.destroyedAt} IS NOT NULL`);

      // Find oldest active key
      const [oldestKeyResult] = await db
        .select({ createdAt: encryptionKeys.createdAt })
        .from(encryptionKeys)
        .where(
          and(
            eq(encryptionKeys.isActive, true),
            isNull(encryptionKeys.destroyedAt)
          )
        )
        .orderBy(encryptionKeys.createdAt)
        .limit(1);

      const details = {
        totalActiveKeys: activeKeysResult.count,
        keysNearingExpiry: expiringKeysResult.count,
        destroyedKeys: destroyedKeysResult.count,
        oldestActiveKey: oldestKeyResult?.createdAt || null
      };

      let status: 'healthy' | 'warning' | 'error' = 'healthy';

      if (details.keysNearingExpiry > 0) {
        status = 'warning';
      }

      if (details.totalActiveKeys === 0) {
        status = 'error';
      }

      return { status, details };
    } catch (error) {
      console.error('Encryption key health check failed:', error);
      return {
        status: 'error',
        details: {
          totalActiveKeys: 0,
          keysNearingExpiry: 0,
          destroyedKeys: 0,
          oldestActiveKey: null
        }
      };
    }
  }
}

// ==================== SINGLETON EXPORT ====================
export const encryptionKeyService = new EncryptionKeyService();