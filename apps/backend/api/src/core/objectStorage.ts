import { structuredLogger } from './logger';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { config } from './config';

// Object Storage configuration from environment variables set by setup_object_storage
const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || process.env.REPLIT_OBJECT_STORE_ID;
const PUBLIC_PATHS = process.env.PUBLIC_OBJECT_SEARCH_PATHS ? JSON.parse(process.env.PUBLIC_OBJECT_SEARCH_PATHS) : [];
const PRIVATE_PATH = process.env.PRIVATE_OBJECT_DIR;

// Fallback to hardcoded values if env vars not set (shouldn't happen after setup_object_storage)
const PUBLIC_PATH = Array.isArray(PUBLIC_PATHS) && PUBLIC_PATHS.length > 0 
  ? PUBLIC_PATHS[0] 
  : `/replit-objstore-b368c0d0-002a-406a-a949-7390d88e61cc/public`;

const PRIVATE_DIR = PRIVATE_PATH || `/replit-objstore-b368c0d0-002a-406a-a949-7390d88e61cc/.private`;

// Validation schemas
export const uploadConfigSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().refine(
    (val) => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(val),
    { message: 'Solo immagini JPEG, PNG, GIF, WEBP sono supportate' }
  ),
  fileSize: z.number().min(1).max(2 * 1024 * 1024), // Max 2MB
  visibility: z.enum(['public', 'private']).default('public')
});

export const objectPathSchema = z.object({
  objectPath: z.string().min(1).max(500)
});

export type UploadConfig = z.infer<typeof uploadConfigSchema>;
export type ObjectPath = z.infer<typeof objectPathSchema>;

// Object Storage types
export interface ObjectMetadata {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  visibility: 'public' | 'private';
  uploadedBy: string;
  tenantId: string;
  createdAt: string;
  objectPath: string;
  publicUrl?: string;
}

export interface PresignedUploadUrl {
  uploadUrl: string;
  objectPath: string;
  expiresAt: string;
  metadata: ObjectMetadata;
}

export interface ObjectStorageService {
  generatePresignedUploadUrl(config: UploadConfig, userId: string, tenantId: string): Promise<PresignedUploadUrl>;
  getObjectMetadata(objectPath: string): Promise<ObjectMetadata | null>;
  deleteObject(objectPath: string, userId: string, tenantId: string): Promise<boolean>;
  getPublicUrl(objectPath: string): string;
  validateObjectAccess(objectPath: string, userId: string, tenantId: string): Promise<boolean>;
}

// Replit Object Storage Service Implementation
class ReplitObjectStorageService implements ObjectStorageService {
  private bucketId: string;
  private publicBasePath: string;
  private privateBasePath: string;

  constructor() {
    this.bucketId = BUCKET_ID;
    this.publicBasePath = PUBLIC_PATH;
    this.privateBasePath = PRIVATE_DIR;
  }

  async generatePresignedUploadUrl(
    config: UploadConfig, 
    userId: string, 
    tenantId: string
  ): Promise<PresignedUploadUrl> {
    try {
      // Generate unique object path
      const fileExtension = path.extname(config.fileName);
      const uniqueFileName = `${uuidv4()}${fileExtension}`;
      const objectPath = config.visibility === 'public' 
        ? `${this.publicBasePath}/avatars/${tenantId}/${uniqueFileName}`
        : `${this.privateBasePath}/avatars/${tenantId}/${uniqueFileName}`;

      // Create metadata
      const metadata: ObjectMetadata = {
        id: uuidv4(),
        fileName: config.fileName,
        contentType: config.contentType,
        fileSize: config.fileSize,
        visibility: config.visibility,
        uploadedBy: userId,
        tenantId,
        createdAt: new Date().toISOString(),
        objectPath,
        publicUrl: config.visibility === 'public' ? this.getPublicUrl(objectPath) : undefined
      };

      // For Replit Object Storage, we simulate a presigned URL by returning the object path
      // The actual upload will be handled by the frontend upload component
      const uploadUrl = `/api/objects/upload`;
      const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

      structuredLogger.info('Generated presigned upload URL', {
        component: 'object-storage',
        metadata: {
          objectPath,
          userId,
          tenantId,
          fileName: config.fileName,
          contentType: config.contentType,
          visibility: config.visibility
        }
      });

      return {
        uploadUrl,
        objectPath,
        expiresAt,
        metadata
      };
    } catch (error) {
      structuredLogger.error('Failed to generate presigned upload URL', {
        component: 'object-storage',
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          userId,
          tenantId,
          fileName: config.fileName
        }
      });
      throw new Error('Errore nella generazione URL di upload');
    }
  }

  async getObjectMetadata(objectPath: string): Promise<ObjectMetadata | null> {
    try {
      // For Replit Object Storage, we'll need to implement metadata storage
      // This is a simplified implementation that extracts info from the path
      const pathParts = objectPath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const visibility = objectPath.includes('/public/') ? 'public' : 'private';
      
      // Extract tenant ID from path
      const tenantIdIndex = pathParts.findIndex(part => part === 'avatars') + 1;
      const tenantId = pathParts[tenantIdIndex] || '';

      // This is a basic implementation - in production you'd store metadata in database
      if (!fileName || !tenantId) {
        return null;
      }

      const metadata: ObjectMetadata = {
        id: uuidv4(),
        fileName,
        contentType: this.guessContentType(fileName),
        fileSize: 0, // Would need to query actual file size
        visibility: visibility as 'public' | 'private',
        uploadedBy: '', // Would need to store this in metadata
        tenantId,
        createdAt: new Date().toISOString(),
        objectPath,
        publicUrl: visibility === 'public' ? this.getPublicUrl(objectPath) : undefined
      };

      return metadata;
    } catch (error) {
      structuredLogger.error('Failed to get object metadata', {
        component: 'object-storage',
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: { objectPath }
      });
      return null;
    }
  }

  async deleteObject(objectPath: string, userId: string, tenantId: string): Promise<boolean> {
    try {
      // For Replit Object Storage, this would require the Object Storage API
      // For now, we'll log the delete operation
      structuredLogger.info('Object deletion requested', {
        component: 'object-storage',
        metadata: {
          objectPath,
          userId,
          tenantId
        }
      });

      // In a real implementation, you would call the Replit Object Storage API
      // to delete the file at the specified path
      return true;
    } catch (error) {
      structuredLogger.error('Failed to delete object', {
        component: 'object-storage',
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          objectPath,
          userId,
          tenantId
        }
      });
      return false;
    }
  }

  getPublicUrl(objectPath: string): string {
    // For Replit Object Storage, public objects are accessible via a direct URL
    // The exact format depends on Replit's Object Storage implementation
    const baseUrl = process.env.REPLIT_OBJECT_STORE_PUBLIC_URL || `https://storage.replit.com`;
    return `${baseUrl}${objectPath}`;
  }

  getBucketId(): string {
    return this.bucketId;
  }

  getPublicBasePath(): string {
    return this.publicBasePath;
  }

  async validateObjectAccess(objectPath: string, userId: string, tenantId: string): Promise<boolean> {
    try {
      const metadata = await this.getObjectMetadata(objectPath);
      
      if (!metadata) {
        return false;
      }

      // Public objects are accessible to all authenticated users
      if (metadata.visibility === 'public') {
        return true;
      }

      // Private objects are only accessible to the same tenant
      if (metadata.visibility === 'private') {
        return metadata.tenantId === tenantId;
      }

      return false;
    } catch (error) {
      structuredLogger.error('Failed to validate object access', {
        component: 'object-storage',
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          objectPath,
          userId,
          tenantId
        }
      });
      return false;
    }
  }

  private guessContentType(fileName: string): string {
    const extension = path.extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    return mimeTypes[extension] || 'application/octet-stream';
  }
}

// Avatar-specific utilities
export class AvatarService {
  private objectStorage: ObjectStorageService;

  constructor() {
    this.objectStorage = new ReplitObjectStorageService();
  }

  async generateAvatarUploadUrl(
    fileName: string,
    contentType: string,
    fileSize: number,
    userId: string,
    tenantId: string
  ): Promise<PresignedUploadUrl> {
    const config: UploadConfig = {
      fileName,
      contentType,
      fileSize,
      visibility: 'public' // Avatars are always public for header display
    };

    return this.objectStorage.generatePresignedUploadUrl(config, userId, tenantId);
  }

  async deleteAvatar(objectPath: string, userId: string, tenantId: string): Promise<boolean> {
    return this.objectStorage.deleteObject(objectPath, userId, tenantId);
  }

  getAvatarPublicUrl(objectPath: string): string {
    return this.objectStorage.getPublicUrl(objectPath);
  }

  async validateAvatarAccess(objectPath: string, userId: string, tenantId: string): Promise<boolean> {
    return this.objectStorage.validateObjectAccess(objectPath, userId, tenantId);
  }

  validateAvatarFile(fileName: string, contentType: string, fileSize: number): { valid: boolean; error?: string } {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(contentType)) {
      return { valid: false, error: 'Formato file non supportato. Usa JPEG, PNG, GIF o WEBP.' };
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (fileSize > maxSize) {
      return { valid: false, error: 'File troppo grande. Dimensione massima: 2MB.' };
    }

    // Validate file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const extension = path.extname(fileName).toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      return { valid: false, error: 'Estensione file non valida.' };
    }

    return { valid: true };
  }
}

// Export singleton instances
export const objectStorageService = new ReplitObjectStorageService();
export const avatarService = new AvatarService();

// Note: Schemas are exported above where they are defined