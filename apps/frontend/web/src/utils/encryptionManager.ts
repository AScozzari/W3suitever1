// Enterprise Encryption Manager - End-to-End Encryption for Sensitive HR Data
// AES-256-GCM with PBKDF2 key derivation for GDPR-compliant data protection

// ==================== INTERFACES ====================
export interface EncryptedData {
  data: string;           // Base64 encoded encrypted data
  iv: string;            // Initialization vector (Base64)
  salt: string;          // Unique salt for key derivation (Base64)
  tag: string;           // Authentication tag for GCM (Base64)
  version: number;       // Encryption version for future compatibility
  keyId: string;         // Reference to the encryption key used
  timestamp: number;     // Encryption timestamp for audit
}

export interface EncryptionKey {
  id: string;
  tenantId: string;
  derivedKey: CryptoKey;
  salt: Uint8Array;
  createdAt: number;
  expiresAt?: number;
  version: number;
  isActive: boolean;
}

export interface EncryptionConfig {
  algorithm: 'AES-GCM';
  keyLength: 256;
  ivLength: 12;          // 96 bits for GCM
  saltLength: 32;        // 256 bits
  tagLength: 16;         // 128 bits
  iterations: 100000;    // PBKDF2 iterations
  hashAlgorithm: 'SHA-256';
}

export interface SensitiveFields {
  geoLocation?: {
    lat?: number;
    lng?: number;
    accuracy?: number;
    address?: string;
  };
  deviceInfo?: {
    deviceId?: string;
    ipAddress?: string;
    userAgent?: string;
    deviceType?: string;
  };
  notes?: string;
  storeCoordinates?: {
    latitude?: string;
    longitude?: string;
    address?: string;
  };
}

// ==================== ENCRYPTION MANAGER CLASS ====================
class EncryptionManager {
  private static instance: EncryptionManager;
  private config: EncryptionConfig;
  private keyCache: Map<string, EncryptionKey> = new Map();
  private masterPassword: string | null = null;
  private isInitialized: boolean = false;

  private constructor() {
    this.config = {
      algorithm: 'AES-GCM',
      keyLength: 256,
      ivLength: 12,
      saltLength: 32,
      tagLength: 16,
      iterations: 100000,
      hashAlgorithm: 'SHA-256'
    };
  }

  public static getInstance(): EncryptionManager {
    if (!EncryptionManager.instance) {
      EncryptionManager.instance = new EncryptionManager();
    }
    return EncryptionManager.instance;
  }

  // ==================== INITIALIZATION ====================
  public async initialize(tenantId: string, userPassword?: string): Promise<boolean> {
    try {
      if (!crypto.subtle) {
        throw new Error('Web Crypto API not supported');
      }

      // Use tenant-specific master password or derive from user session
      this.masterPassword = userPassword || this.deriveTenantPassword(tenantId);
      
      // Generate or retrieve tenant encryption key
      await this.initializeTenantKey(tenantId);
      
      this.isInitialized = true;
      console.log(`🔐 Encryption Manager initialized for tenant: ${tenantId}`);
      return true;
    } catch (error) {
      console.error('Failed to initialize encryption manager:', error);
      return false;
    }
  }

  private deriveTenantPassword(tenantId: string): string {
    // In production, this should come from secure key management
    // For now, derive from tenant ID and session data
    const sessionData = sessionStorage.getItem('w3_auth_session') || '';
    return `w3suite_${tenantId}_${sessionData.slice(0, 16)}`;
  }

  private async initializeTenantKey(tenantId: string): Promise<void> {
    const existingKey = this.keyCache.get(tenantId);
    
    if (existingKey && existingKey.isActive && this.isKeyValid(existingKey)) {
      return;
    }

    // Generate new encryption key
    const salt = crypto.getRandomValues(new Uint8Array(this.config.saltLength));
    const derivedKey = await this.deriveKey(this.masterPassword!, salt);
    
    const encryptionKey: EncryptionKey = {
      id: this.generateKeyId(),
      tenantId,
      derivedKey,
      salt,
      createdAt: Date.now(),
      expiresAt: Date.now() + (90 * 24 * 60 * 60 * 1000), // 90 days
      version: 1,
      isActive: true
    };

    this.keyCache.set(tenantId, encryptionKey);
    
    // Store key metadata in localStorage (not the actual key!)
    this.storeKeyMetadata(encryptionKey);
  }

  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const passwordBuffer = new TextEncoder().encode(password);
    
    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive AES-GCM key using PBKDF2
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.config.iterations,
        hash: this.config.hashAlgorithm
      },
      keyMaterial,
      {
        name: this.config.algorithm,
        length: this.config.keyLength
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // ==================== ENCRYPTION/DECRYPTION ====================
  public async encryptSensitiveData(
    data: SensitiveFields,
    tenantId: string
  ): Promise<EncryptedData> {
    if (!this.isInitialized) {
      throw new Error('Encryption manager not initialized');
    }

    const encryptionKey = this.keyCache.get(tenantId);
    if (!encryptionKey) {
      throw new Error('No encryption key found for tenant');
    }

    // Serialize data to JSON
    const plaintext = JSON.stringify(data);
    const plaintextBuffer = new TextEncoder().encode(plaintext);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(this.config.ivLength));

    // Encrypt using AES-GCM
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: this.config.algorithm,
        iv: iv,
        tagLength: this.config.tagLength * 8 // Convert to bits
      },
      encryptionKey.derivedKey,
      plaintextBuffer
    );

    // Extract encrypted data and authentication tag
    const encryptedData = new Uint8Array(encryptedBuffer.slice(0, -this.config.tagLength));
    const tag = new Uint8Array(encryptedBuffer.slice(-this.config.tagLength));

    return {
      data: this.arrayBufferToBase64(encryptedData),
      iv: this.arrayBufferToBase64(iv),
      salt: this.arrayBufferToBase64(encryptionKey.salt),
      tag: this.arrayBufferToBase64(tag),
      version: encryptionKey.version,
      keyId: encryptionKey.id,
      timestamp: Date.now()
    };
  }

  public async decryptSensitiveData(
    encryptedData: EncryptedData,
    tenantId: string
  ): Promise<SensitiveFields> {
    if (!this.isInitialized) {
      throw new Error('Encryption manager not initialized');
    }

    const encryptionKey = this.keyCache.get(tenantId);
    if (!encryptionKey || encryptionKey.id !== encryptedData.keyId) {
      // Try to restore key from metadata and derive it again
      await this.restoreKeyFromMetadata(tenantId, encryptedData.keyId);
    }

    const currentKey = this.keyCache.get(tenantId);
    if (!currentKey) {
      throw new Error('Unable to restore encryption key');
    }

    // Convert Base64 back to Uint8Array
    const iv = this.base64ToArrayBuffer(encryptedData.iv);
    const ciphertext = this.base64ToArrayBuffer(encryptedData.data);
    const tag = this.base64ToArrayBuffer(encryptedData.tag);

    // Combine ciphertext and tag for AES-GCM
    const encryptedBuffer = new Uint8Array(ciphertext.length + tag.length);
    encryptedBuffer.set(new Uint8Array(ciphertext));
    encryptedBuffer.set(new Uint8Array(tag), ciphertext.length);

    try {
      // Decrypt using AES-GCM
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.config.algorithm,
          iv: new Uint8Array(iv),
          tagLength: this.config.tagLength * 8
        },
        currentKey.derivedKey,
        encryptedBuffer
      );

      const plaintext = new TextDecoder().decode(decryptedBuffer);
      return JSON.parse(plaintext);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  // ==================== FIELD-SPECIFIC ENCRYPTION ====================
  public async encryptGeoLocation(
    geoLocation: { lat: number; lng: number; accuracy: number; address?: string },
    tenantId: string
  ): Promise<EncryptedData> {
    return await this.encryptSensitiveData({ geoLocation }, tenantId);
  }

  public async decryptGeoLocation(
    encryptedData: EncryptedData,
    tenantId: string
  ): Promise<{ lat: number; lng: number; accuracy: number; address?: string }> {
    const decrypted = await this.decryptSensitiveData(encryptedData, tenantId);
    return decrypted.geoLocation!;
  }

  public async encryptDeviceInfo(
    deviceInfo: { deviceId?: string; ipAddress?: string; userAgent?: string; deviceType?: string },
    tenantId: string
  ): Promise<EncryptedData> {
    return await this.encryptSensitiveData({ deviceInfo }, tenantId);
  }

  public async decryptDeviceInfo(
    encryptedData: EncryptedData,
    tenantId: string
  ): Promise<{ deviceId?: string; ipAddress?: string; userAgent?: string; deviceType?: string }> {
    const decrypted = await this.decryptSensitiveData(encryptedData, tenantId);
    return decrypted.deviceInfo!;
  }

  public async encryptNotes(notes: string, tenantId: string): Promise<EncryptedData> {
    return await this.encryptSensitiveData({ notes }, tenantId);
  }

  public async decryptNotes(encryptedData: EncryptedData, tenantId: string): Promise<string> {
    const decrypted = await this.decryptSensitiveData(encryptedData, tenantId);
    return decrypted.notes!;
  }

  // ==================== KEY MANAGEMENT ====================
  public async rotateKey(tenantId: string): Promise<string> {
    const newSalt = crypto.getRandomValues(new Uint8Array(this.config.saltLength));
    const newDerivedKey = await this.deriveKey(this.masterPassword!, newSalt);
    
    const newEncryptionKey: EncryptionKey = {
      id: this.generateKeyId(),
      tenantId,
      derivedKey: newDerivedKey,
      salt: newSalt,
      createdAt: Date.now(),
      expiresAt: Date.now() + (90 * 24 * 60 * 60 * 1000),
      version: (this.keyCache.get(tenantId)?.version || 0) + 1,
      isActive: true
    };

    // Deactivate old key
    const oldKey = this.keyCache.get(tenantId);
    if (oldKey) {
      oldKey.isActive = false;
    }

    this.keyCache.set(tenantId, newEncryptionKey);
    this.storeKeyMetadata(newEncryptionKey);

    console.log(`🔄 Key rotated for tenant: ${tenantId}, new key ID: ${newEncryptionKey.id}`);
    return newEncryptionKey.id;
  }

  public async deleteKeyForGDPR(tenantId: string, userId?: string): Promise<boolean> {
    try {
      // For GDPR "right to be forgotten", we destroy the encryption keys
      // making the encrypted data unrecoverable
      this.keyCache.delete(tenantId);
      localStorage.removeItem(`w3_encryption_key_${tenantId}`);
      
      // Log the deletion for audit purposes
      console.log(`🗑️ GDPR Key deletion completed for tenant: ${tenantId}${userId ? `, user: ${userId}` : ''}`);
      return true;
    } catch (error) {
      console.error('Failed to delete encryption key:', error);
      return false;
    }
  }

  // ==================== UTILITY METHODS ====================
  private generateKeyId(): string {
    return `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isKeyValid(key: EncryptionKey): boolean {
    if (!key.expiresAt) return true;
    return Date.now() < key.expiresAt;
  }

  private storeKeyMetadata(key: EncryptionKey): void {
    const metadata = {
      id: key.id,
      tenantId: key.tenantId,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
      version: key.version,
      isActive: key.isActive,
      salt: this.arrayBufferToBase64(key.salt)
    };
    localStorage.setItem(`w3_encryption_key_${key.tenantId}`, JSON.stringify(metadata));
  }

  private async restoreKeyFromMetadata(tenantId: string, keyId: string): Promise<void> {
    const metadataStr = localStorage.getItem(`w3_encryption_key_${tenantId}`);
    if (!metadataStr) {
      throw new Error('No key metadata found');
    }

    const metadata = JSON.parse(metadataStr);
    if (metadata.id !== keyId) {
      throw new Error('Key ID mismatch');
    }

    const salt = this.base64ToArrayBuffer(metadata.salt);
    const derivedKey = await this.deriveKey(this.masterPassword!, new Uint8Array(salt));

    const restoredKey: EncryptionKey = {
      id: metadata.id,
      tenantId: metadata.tenantId,
      derivedKey,
      salt: new Uint8Array(salt),
      createdAt: metadata.createdAt,
      expiresAt: metadata.expiresAt,
      version: metadata.version,
      isActive: metadata.isActive
    };

    this.keyCache.set(tenantId, restoredKey);
  }

  private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // ==================== PUBLIC API ====================
  public isSupported(): boolean {
    return typeof crypto !== 'undefined' && !!crypto.subtle;
  }

  public getEncryptionInfo(): EncryptionConfig {
    return { ...this.config };
  }

  public async healthCheck(): Promise<boolean> {
    try {
      // Test encryption/decryption with sample data
      const testData = { notes: 'test_encryption_health_check' };
      const testTenant = 'health_check_tenant';
      
      await this.initialize(testTenant);
      const encrypted = await this.encryptSensitiveData(testData, testTenant);
      const decrypted = await this.decryptSensitiveData(encrypted, testTenant);
      
      return decrypted.notes === testData.notes;
    } catch (error) {
      console.error('Encryption health check failed:', error);
      return false;
    }
  }
}

// ==================== SINGLETON EXPORT ====================
export const encryptionManager = EncryptionManager.getInstance();

// ==================== CONVENIENCE FUNCTIONS ====================
export async function encryptGeolocationData(
  geoData: { lat: number; lng: number; accuracy: number; address?: string },
  tenantId: string
): Promise<EncryptedData> {
  return await encryptionManager.encryptGeoLocation(geoData, tenantId);
}

export async function decryptGeolocationData(
  encryptedData: EncryptedData,
  tenantId: string
): Promise<{ lat: number; lng: number; accuracy: number; address?: string }> {
  return await encryptionManager.decryptGeoLocation(encryptedData, tenantId);
}

export async function encryptTimeTrackingData(
  timeTrackingData: SensitiveFields,
  tenantId: string
): Promise<EncryptedData> {
  return await encryptionManager.encryptSensitiveData(timeTrackingData, tenantId);
}

export async function decryptTimeTrackingData(
  encryptedData: EncryptedData,
  tenantId: string
): Promise<SensitiveFields> {
  return await encryptionManager.decryptSensitiveData(encryptedData, tenantId);
}

// ==================== GDPR COMPLIANCE ====================
export async function exerciseRightToBeForgotten(
  tenantId: string,
  userId?: string
): Promise<boolean> {
  return await encryptionManager.deleteKeyForGDPR(tenantId, userId);
}

// ==================== ERROR TYPES ====================
export class EncryptionError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

export class KeyNotFoundError extends EncryptionError {
  constructor(tenantId: string) {
    super(`Encryption key not found for tenant: ${tenantId}`, 'KEY_NOT_FOUND');
  }
}

export class DecryptionError extends EncryptionError {
  constructor(message: string) {
    super(`Decryption failed: ${message}`, 'DECRYPTION_FAILED');
  }
}