import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  GetObjectCommandOutput
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '../core/db';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '../core/logger';
import crypto from 'crypto';
import { decryptMCPCredentials } from './mcp-credential-encryption';

export interface AWSStorageConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
  serverSideEncryption?: boolean;
  versioningEnabled?: boolean;
}

export interface TenantStorageContext {
  tenantId: string;
  userId: string;
  teamId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface StoragePrefix {
  base: string;
  tenant: string;
  user?: string;
  team?: string;
  brandShared: string;
  brandCatalog: string;
}

export interface UploadResult {
  success: boolean;
  objectKey: string;
  etag?: string;
  versionId?: string;
  sizeBytes: number;
  contentHash: string;
}

export interface PresignedUrlResult {
  url: string;
  expiresAt: Date;
  method: 'GET' | 'PUT';
}

export class AWSStorageService {
  private s3Client: S3Client | null = null;
  private config: AWSStorageConfig | null = null;

  constructor(config?: AWSStorageConfig) {
    if (config) {
      this.config = config;
      this.initializeClient();
    }
  }

  private initializeClient(): void {
    if (!this.config) {
      logger.warn('[AWS Storage] No config provided, client not initialized');
      return;
    }

    this.s3Client = new S3Client({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });

    logger.info('[AWS Storage] S3 client initialized', {
      region: this.config.region,
      bucket: this.config.bucketName,
    });
  }

  setConfig(config: AWSStorageConfig): void {
    this.config = config;
    this.initializeClient();
  }

  isConfigured(): boolean {
    return this.s3Client !== null && this.config !== null;
  }

  /**
   * Health check: verify S3 bucket is accessible
   * Returns true if bucket exists and credentials are valid
   */
  async healthCheck(): Promise<boolean> {
    if (!this.s3Client || !this.config) {
      return false;
    }

    try {
      // Try to list objects with max 1 result to verify bucket access
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucketName,
        MaxKeys: 1,
      });
      
      await this.s3Client.send(command);
      
      logger.info('[AWS Storage] Health check passed', {
        bucket: this.config.bucketName,
        region: this.config.region,
      });
      
      return true;
    } catch (error: any) {
      logger.error('[AWS Storage] Health check FAILED', {
        bucket: this.config.bucketName,
        error: error.message || String(error),
        code: error.Code || error.name,
      });
      return false;
    }
  }

  getStoragePrefixes(ctx: TenantStorageContext): StoragePrefix {
    return {
      base: 'tenants',
      tenant: `tenants/${ctx.tenantId}`,
      user: ctx.userId ? `tenants/${ctx.tenantId}/users/${ctx.userId}` : undefined,
      team: ctx.teamId ? `tenants/${ctx.tenantId}/teams/${ctx.teamId}` : undefined,
      brandShared: 'brand/shared-assets',
      brandCatalog: 'brand/catalog',
    };
  }

  validatePrefixAccess(ctx: TenantStorageContext, objectKey: string): boolean {
    const prefixes = this.getStoragePrefixes(ctx);
    
    if (objectKey.startsWith(prefixes.brandShared) || objectKey.startsWith(prefixes.brandCatalog)) {
      return true;
    }
    
    if (objectKey.startsWith(`tenants/${ctx.tenantId}/`)) {
      return true;
    }
    
    return false;
  }

  validateWriteAccess(ctx: TenantStorageContext, objectKey: string): boolean {
    const prefixes = this.getStoragePrefixes(ctx);
    
    if (objectKey.startsWith(prefixes.brandShared) || objectKey.startsWith(prefixes.brandCatalog)) {
      return false;
    }
    
    if (objectKey.startsWith(`tenants/${ctx.tenantId}/`)) {
      return true;
    }
    
    return false;
  }

  generateObjectKey(ctx: TenantStorageContext, options: {
    fileName: string;
    category?: string;
    scope?: 'user' | 'team' | 'tenant';
  }): string {
    const prefixes = this.getStoragePrefixes(ctx);
    const extension = options.fileName.split('.').pop() || '';
    const uuid = crypto.randomUUID();
    const category = options.category || 'general';
    const scope = options.scope || 'user';

    let basePath: string;
    
    switch (scope) {
      case 'team':
        if (!prefixes.team) throw new Error('Team ID required for team scope');
        basePath = prefixes.team;
        break;
      case 'tenant':
        basePath = prefixes.tenant;
        break;
      case 'user':
      default:
        if (!prefixes.user) throw new Error('User ID required for user scope');
        basePath = prefixes.user;
        break;
    }

    return `${basePath}/${category}/${uuid}.${extension}`;
  }

  async uploadObject(
    ctx: TenantStorageContext,
    objectKey: string,
    buffer: Buffer,
    options: {
      mimeType?: string;
      metadata?: Record<string, string>;
    } = {}
  ): Promise<UploadResult> {
    if (!this.s3Client || !this.config) {
      throw new Error('AWS Storage not configured');
    }

    if (!this.validateWriteAccess(ctx, objectKey)) {
      throw new Error('Access denied: Invalid prefix for tenant');
    }

    const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');

    const command = new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: objectKey,
      Body: buffer,
      ContentType: options.mimeType || 'application/octet-stream',
      Metadata: {
        ...options.metadata,
        'tenant-id': ctx.tenantId,
        'user-id': ctx.userId,
        'content-hash': contentHash,
        'upload-timestamp': new Date().toISOString(),
      },
      ServerSideEncryption: this.config.serverSideEncryption ? 'AES256' : undefined,
    });

    try {
      const response = await this.s3Client.send(command);

      logger.info('[AWS Storage] Object uploaded', {
        bucket: this.config.bucketName,
        key: objectKey,
        size: buffer.length,
        etag: response.ETag,
        versionId: response.VersionId,
      });

      return {
        success: true,
        objectKey,
        etag: response.ETag,
        versionId: response.VersionId,
        sizeBytes: buffer.length,
        contentHash,
      };
    } catch (error) {
      logger.error('[AWS Storage] Upload failed', {
        error: error instanceof Error ? error.message : String(error),
        key: objectKey,
      });
      throw error;
    }
  }

  async downloadObject(
    ctx: TenantStorageContext,
    objectKey: string,
    versionId?: string
  ): Promise<{ buffer: Buffer; metadata: Record<string, string>; mimeType: string }> {
    if (!this.s3Client || !this.config) {
      throw new Error('AWS Storage not configured');
    }

    if (!this.validatePrefixAccess(ctx, objectKey)) {
      throw new Error('Access denied: Cannot access this object');
    }

    const command = new GetObjectCommand({
      Bucket: this.config.bucketName,
      Key: objectKey,
      VersionId: versionId,
    });

    try {
      const response = await this.s3Client.send(command);
      const chunks: Uint8Array[] = [];
      
      if (response.Body) {
        const stream = response.Body as AsyncIterable<Uint8Array>;
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
      }

      const buffer = Buffer.concat(chunks);

      return {
        buffer,
        metadata: response.Metadata || {},
        mimeType: response.ContentType || 'application/octet-stream',
      };
    } catch (error) {
      logger.error('[AWS Storage] Download failed', {
        error: error instanceof Error ? error.message : String(error),
        key: objectKey,
      });
      throw error;
    }
  }

  async deleteObject(
    ctx: TenantStorageContext,
    objectKey: string,
    versionId?: string
  ): Promise<boolean> {
    if (!this.s3Client || !this.config) {
      throw new Error('AWS Storage not configured');
    }

    if (!this.validateWriteAccess(ctx, objectKey)) {
      throw new Error('Access denied: Cannot delete this object');
    }

    const command = new DeleteObjectCommand({
      Bucket: this.config.bucketName,
      Key: objectKey,
      VersionId: versionId,
    });

    try {
      await this.s3Client.send(command);

      logger.info('[AWS Storage] Object deleted', {
        bucket: this.config.bucketName,
        key: objectKey,
        versionId,
      });

      return true;
    } catch (error) {
      logger.error('[AWS Storage] Delete failed', {
        error: error instanceof Error ? error.message : String(error),
        key: objectKey,
      });
      throw error;
    }
  }

  async getObjectMetadata(
    ctx: TenantStorageContext,
    objectKey: string,
    versionId?: string
  ): Promise<{
    sizeBytes: number;
    lastModified: Date;
    etag: string;
    mimeType: string;
    metadata: Record<string, string>;
    versionId?: string;
  }> {
    if (!this.s3Client || !this.config) {
      throw new Error('AWS Storage not configured');
    }

    if (!this.validatePrefixAccess(ctx, objectKey)) {
      throw new Error('Access denied: Cannot access this object');
    }

    const command = new HeadObjectCommand({
      Bucket: this.config.bucketName,
      Key: objectKey,
      VersionId: versionId,
    });

    try {
      const response = await this.s3Client.send(command);

      return {
        sizeBytes: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        etag: response.ETag || '',
        mimeType: response.ContentType || 'application/octet-stream',
        metadata: response.Metadata || {},
        versionId: response.VersionId,
      };
    } catch (error) {
      logger.error('[AWS Storage] Head object failed', {
        error: error instanceof Error ? error.message : String(error),
        key: objectKey,
      });
      throw error;
    }
  }

  async listObjects(
    ctx: TenantStorageContext,
    options: {
      prefix?: string;
      maxKeys?: number;
      continuationToken?: string;
      delimiter?: string;
    } = {}
  ): Promise<{
    objects: Array<{
      key: string;
      size: number;
      lastModified: Date;
      etag: string;
    }>;
    commonPrefixes: string[];
    isTruncated: boolean;
    nextContinuationToken?: string;
  }> {
    if (!this.s3Client || !this.config) {
      throw new Error('AWS Storage not configured');
    }

    const prefixes = this.getStoragePrefixes(ctx);
    let effectivePrefix = options.prefix || prefixes.tenant + '/';
    
    if (!effectivePrefix.startsWith(prefixes.tenant) && 
        !effectivePrefix.startsWith(prefixes.brandShared) &&
        !effectivePrefix.startsWith(prefixes.brandCatalog)) {
      throw new Error('Access denied: Invalid prefix for listing');
    }

    const command = new ListObjectsV2Command({
      Bucket: this.config.bucketName,
      Prefix: effectivePrefix,
      MaxKeys: options.maxKeys || 1000,
      ContinuationToken: options.continuationToken,
      Delimiter: options.delimiter,
    });

    try {
      const response = await this.s3Client.send(command);

      return {
        objects: (response.Contents || []).map(obj => ({
          key: obj.Key || '',
          size: obj.Size || 0,
          lastModified: obj.LastModified || new Date(),
          etag: obj.ETag || '',
        })),
        commonPrefixes: (response.CommonPrefixes || []).map(p => p.Prefix || ''),
        isTruncated: response.IsTruncated || false,
        nextContinuationToken: response.NextContinuationToken,
      };
    } catch (error) {
      logger.error('[AWS Storage] List objects failed', {
        error: error instanceof Error ? error.message : String(error),
        prefix: effectivePrefix,
      });
      throw error;
    }
  }

  async copyObject(
    ctx: TenantStorageContext,
    sourceKey: string,
    destinationKey: string,
    sourceVersionId?: string
  ): Promise<{
    etag: string;
    versionId?: string;
  }> {
    if (!this.s3Client || !this.config) {
      throw new Error('AWS Storage not configured');
    }

    if (!this.validatePrefixAccess(ctx, sourceKey)) {
      throw new Error('Access denied: Cannot read source object');
    }

    if (!this.validateWriteAccess(ctx, destinationKey)) {
      throw new Error('Access denied: Cannot write to destination');
    }

    let copySource = `${this.config.bucketName}/${sourceKey}`;
    if (sourceVersionId) {
      copySource += `?versionId=${sourceVersionId}`;
    }

    const command = new CopyObjectCommand({
      Bucket: this.config.bucketName,
      CopySource: copySource,
      Key: destinationKey,
      MetadataDirective: 'COPY',
      ServerSideEncryption: this.config.serverSideEncryption ? 'AES256' : undefined,
    });

    try {
      const response = await this.s3Client.send(command);

      logger.info('[AWS Storage] Object copied', {
        source: sourceKey,
        destination: destinationKey,
      });

      return {
        etag: response.CopyObjectResult?.ETag || '',
        versionId: response.VersionId,
      };
    } catch (error) {
      logger.error('[AWS Storage] Copy failed', {
        error: error instanceof Error ? error.message : String(error),
        source: sourceKey,
        destination: destinationKey,
      });
      throw error;
    }
  }

  async getPresignedUploadUrl(
    ctx: TenantStorageContext,
    objectKey: string,
    options: {
      expiresInSeconds?: number;
      contentType?: string;
    } = {}
  ): Promise<PresignedUrlResult> {
    if (!this.s3Client || !this.config) {
      throw new Error('AWS Storage not configured');
    }

    if (!this.validateWriteAccess(ctx, objectKey)) {
      throw new Error('Access denied: Cannot write to this location');
    }

    const expiresIn = options.expiresInSeconds || 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const command = new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: objectKey,
      ContentType: options.contentType,
      Metadata: {
        'tenant-id': ctx.tenantId,
        'user-id': ctx.userId,
      },
      ServerSideEncryption: this.config.serverSideEncryption ? 'AES256' : undefined,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn });

    logger.info('[AWS Storage] Presigned upload URL generated', {
      key: objectKey,
      expiresIn,
    });

    return {
      url,
      expiresAt,
      method: 'PUT',
    };
  }

  async getPresignedDownloadUrl(
    ctx: TenantStorageContext,
    objectKey: string,
    options: {
      expiresInSeconds?: number;
      versionId?: string;
      responseContentDisposition?: string;
    } = {}
  ): Promise<PresignedUrlResult> {
    if (!this.s3Client || !this.config) {
      throw new Error('AWS Storage not configured');
    }

    if (!this.validatePrefixAccess(ctx, objectKey)) {
      throw new Error('Access denied: Cannot access this object');
    }

    const expiresIn = options.expiresInSeconds || 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const command = new GetObjectCommand({
      Bucket: this.config.bucketName,
      Key: objectKey,
      VersionId: options.versionId,
      ResponseContentDisposition: options.responseContentDisposition,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn });

    logger.info('[AWS Storage] Presigned download URL generated', {
      key: objectKey,
      expiresIn,
    });

    return {
      url,
      expiresAt,
      method: 'GET',
    };
  }

  async getTenantUsage(tenantId: string): Promise<{
    totalBytes: number;
    objectCount: number;
  }> {
    if (!this.s3Client || !this.config) {
      throw new Error('AWS Storage not configured');
    }

    const prefix = `tenants/${tenantId}/`;
    let totalBytes = 0;
    let objectCount = 0;
    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });

      const response = await this.s3Client.send(command);

      for (const obj of response.Contents || []) {
        totalBytes += obj.Size || 0;
        objectCount++;
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    return { totalBytes, objectCount };
  }

  async getBrandAssetsForTenant(tenantId: string): Promise<Array<{
    key: string;
    name: string;
    size: number;
    lastModified: Date;
    category: string;
  }>> {
    if (!this.s3Client || !this.config) {
      throw new Error('AWS Storage not configured');
    }

    const prefixes = ['brand/shared-assets/', 'brand/catalog/'];
    const assets: Array<{
      key: string;
      name: string;
      size: number;
      lastModified: Date;
      category: string;
    }> = [];

    for (const prefix of prefixes) {
      const category = prefix.includes('catalog') ? 'catalog' : 'shared';
      
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucketName,
        Prefix: prefix,
        MaxKeys: 1000,
      });

      try {
        const response = await this.s3Client.send(command);

        for (const obj of response.Contents || []) {
          if (obj.Key) {
            const name = obj.Key.split('/').pop() || obj.Key;
            assets.push({
              key: obj.Key,
              name,
              size: obj.Size || 0,
              lastModified: obj.LastModified || new Date(),
              category,
            });
          }
        }
      } catch (error) {
        logger.warn('[AWS Storage] Failed to list brand assets', {
          prefix,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return assets;
  }
}

let defaultAWSStorageService: AWSStorageService | null = null;

export function getAWSStorageService(): AWSStorageService {
  if (!defaultAWSStorageService) {
    defaultAWSStorageService = new AWSStorageService();
  }
  return defaultAWSStorageService;
}

export function initializeAWSStorage(config: AWSStorageConfig): AWSStorageService {
  const service = getAWSStorageService();
  service.setConfig(config);
  return service;
}
