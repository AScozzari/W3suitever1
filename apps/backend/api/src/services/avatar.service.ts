/**
 * 🖼️ AVATAR SERVICE - S3-based Avatar Management
 * 
 * Gestisce upload e download avatar tramite AWS S3 signed URLs.
 * Path: avatars/{tenant_id}/{user_id}/avatar.{ext}
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '../core/db';
import { eq, and } from 'drizzle-orm';
import { users } from '../db/schema/w3suite';
import { logger } from '../core/logger';
import { getBrandStorageConfig } from './brand-storage-config.service';
import { decryptMCPCredentials } from './mcp-credential-encryption';

const SIGNED_URL_EXPIRY_SECONDS = 3600;
const UPLOAD_URL_EXPIRY_SECONDS = 300;
const ALLOWED_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

interface AvatarContext {
  tenantId: string;
  userId: string;
  requestingUserId: string;
}

interface PresignedUrlResult {
  url: string;
  expiresAt: Date;
  objectKey: string;
}

interface AvatarInfo {
  hasAvatar: boolean;
  url: string | null;
  expiresAt: Date | null;
  objectKey: string | null;
  initials: string;
}

let s3Client: S3Client | null = null;
let bucketName: string | null = null;
let initialized = false;

async function initializeS3(): Promise<boolean> {
  if (initialized) return s3Client !== null;
  initialized = true;

  try {
    const brandConfig = await getBrandStorageConfig();
    if (brandConfig && brandConfig.accessKeyId && brandConfig.secretAccessKey) {
      let accessKeyId = brandConfig.accessKeyId;
      let secretAccessKey = brandConfig.secretAccessKey;

      if (accessKeyId.includes(':')) {
        const decrypted = decryptMCPCredentials(accessKeyId);
        if (decrypted) accessKeyId = decrypted;
      }
      if (secretAccessKey.includes(':')) {
        const decrypted = decryptMCPCredentials(secretAccessKey);
        if (decrypted) secretAccessKey = decrypted;
      }

      s3Client = new S3Client({
        region: brandConfig.region,
        credentials: { accessKeyId, secretAccessKey }
      });
      bucketName = brandConfig.bucketName;
      
      logger.info('✅ [Avatar] S3 initialized from Brand Interface', { bucket: bucketName, region: brandConfig.region });
      return true;
    }
  } catch (error) {
    logger.warn('[Avatar] Failed to load Brand Interface config', { error });
  }

  const envAccessKey = process.env.AWS_ACCESS_KEY_ID;
  const envSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const envBucket = process.env.AWS_S3_BUCKET;
  const envRegion = process.env.AWS_REGION || 'eu-central-1';

  if (envAccessKey && envSecretKey && envBucket) {
    s3Client = new S3Client({
      region: envRegion,
      credentials: {
        accessKeyId: envAccessKey,
        secretAccessKey: envSecretKey
      }
    });
    bucketName = envBucket;
    
    logger.info('✅ [Avatar] S3 initialized from environment', { bucket: bucketName, region: envRegion });
    return true;
  }

  logger.error('❌ [Avatar] No S3 configuration available');
  return false;
}

function getAvatarObjectKey(tenantId: string, userId: string, extension: string = 'png'): string {
  return `avatars/${tenantId}/${userId}/avatar.${extension}`;
}

function getInitials(firstName?: string | null, lastName?: string | null): string {
  if (firstName && lastName) {
    return (firstName[0] + lastName[0]).toUpperCase();
  }
  if (firstName) {
    return firstName.substring(0, 2).toUpperCase();
  }
  return 'U';
}

export async function getAvatarUploadUrl(
  ctx: AvatarContext,
  contentType: string = 'image/png'
): Promise<PresignedUrlResult> {
  const ready = await initializeS3();
  if (!ready || !s3Client || !bucketName) {
    throw new Error('S3 not configured');
  }

  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    throw new Error(`Invalid content type. Allowed: ${ALLOWED_CONTENT_TYPES.join(', ')}`);
  }

  if (ctx.requestingUserId !== ctx.userId) {
    throw new Error('Cannot upload avatar for another user');
  }

  const extension = contentType.split('/')[1] || 'png';
  const objectKey = getAvatarObjectKey(ctx.tenantId, ctx.userId, extension);

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
    ContentType: contentType,
    ServerSideEncryption: 'AES256',
    Metadata: {
      'tenant-id': ctx.tenantId,
      'user-id': ctx.userId,
      'upload-date': new Date().toISOString()
    }
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: UPLOAD_URL_EXPIRY_SECONDS });
  const expiresAt = new Date(Date.now() + UPLOAD_URL_EXPIRY_SECONDS * 1000);

  logger.info('[Avatar] Generated upload URL', { userId: ctx.userId, objectKey });

  return { url, expiresAt, objectKey };
}

export async function confirmAvatarUpload(
  ctx: AvatarContext,
  objectKey: string
): Promise<boolean> {
  const ready = await initializeS3();
  if (!ready || !s3Client || !bucketName) {
    throw new Error('S3 not configured');
  }

  if (ctx.requestingUserId !== ctx.userId) {
    throw new Error('Cannot confirm avatar for another user');
  }

  const expectedPrefix = `avatars/${ctx.tenantId}/${ctx.userId}/`;
  if (!objectKey.startsWith(expectedPrefix)) {
    throw new Error('Invalid object key for user');
  }

  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: bucketName,
      Key: objectKey
    }));
  } catch {
    throw new Error('Avatar file not found on S3. Upload may have failed.');
  }

  await db.update(users)
    .set({ 
      avatarObjectPath: objectKey,
      avatarUploadedAt: new Date(),
      avatarUploadedBy: ctx.requestingUserId
    })
    .where(and(
      eq(users.id, ctx.userId),
      eq(users.tenantId, ctx.tenantId)
    ));

  logger.info('[Avatar] Confirmed upload', { userId: ctx.userId, objectKey });

  return true;
}

export async function getAvatarDownloadUrl(
  tenantId: string,
  userId: string
): Promise<AvatarInfo> {
  const [user] = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      avatarObjectPath: users.avatarObjectPath
    })
    .from(users)
    .where(and(
      eq(users.id, userId),
      eq(users.tenantId, tenantId)
    ))
    .limit(1);

  const initials = getInitials(user?.firstName, user?.lastName);

  if (!user || !user.avatarObjectPath) {
    return { hasAvatar: false, url: null, expiresAt: null, objectKey: null, initials };
  }

  const ready = await initializeS3();
  if (!ready || !s3Client || !bucketName) {
    return { hasAvatar: false, url: null, expiresAt: null, objectKey: null, initials };
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: user.avatarObjectPath
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: SIGNED_URL_EXPIRY_SECONDS });
    const expiresAt = new Date(Date.now() + SIGNED_URL_EXPIRY_SECONDS * 1000);

    return {
      hasAvatar: true,
      url,
      expiresAt,
      objectKey: user.avatarObjectPath,
      initials
    };
  } catch (error) {
    logger.warn('[Avatar] Failed to generate download URL', { userId, error });
    return { hasAvatar: false, url: null, expiresAt: null, objectKey: null, initials };
  }
}

export async function deleteAvatar(ctx: AvatarContext): Promise<boolean> {
  const ready = await initializeS3();
  if (!ready || !s3Client || !bucketName) {
    throw new Error('S3 not configured');
  }

  if (ctx.requestingUserId !== ctx.userId) {
    throw new Error('Cannot delete avatar for another user');
  }

  const [user] = await db
    .select({ avatarObjectPath: users.avatarObjectPath })
    .from(users)
    .where(and(
      eq(users.id, ctx.userId),
      eq(users.tenantId, ctx.tenantId)
    ))
    .limit(1);

  if (!user?.avatarObjectPath) {
    return true;
  }

  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: user.avatarObjectPath
    }));
  } catch (error) {
    logger.warn('[Avatar] Failed to delete from S3', { userId: ctx.userId, error });
  }

  await db.update(users)
    .set({ 
      avatarObjectPath: null,
      avatarUploadedAt: null,
      avatarUploadedBy: null
    })
    .where(and(
      eq(users.id, ctx.userId),
      eq(users.tenantId, ctx.tenantId)
    ));

  logger.info('[Avatar] Deleted avatar', { userId: ctx.userId });

  return true;
}

/**
 * List all avatars in user's avatar folder (for MyDrive picker)
 * Returns presigned URLs for each avatar image
 */
export async function listUserAvatars(
  tenantId: string,
  userId: string
): Promise<Array<{
  objectKey: string;
  url: string;
  fileName: string;
  uploadedAt: string;
  sizeBytes: number;
}>> {
  const ready = await initializeS3();
  if (!ready || !s3Client || !bucketName) {
    return [];
  }

  const prefix = `avatars/${tenantId}/${userId}/`;

  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      MaxKeys: 50
    });

    const response = await s3Client.send(command);
    const objects = response.Contents || [];

    // Generate presigned URLs for each avatar
    const avatars = await Promise.all(
      objects
        .filter(obj => obj.Key && obj.Size && obj.Size > 0)
        .map(async (obj) => {
          const getCommand = new GetObjectCommand({
            Bucket: bucketName!,
            Key: obj.Key!
          });

          const url = await getSignedUrl(s3Client!, getCommand, { expiresIn: SIGNED_URL_EXPIRY_SECONDS });

          return {
            objectKey: obj.Key!,
            url,
            fileName: obj.Key!.split('/').pop() || 'avatar',
            uploadedAt: obj.LastModified?.toISOString() || new Date().toISOString(),
            sizeBytes: obj.Size || 0
          };
        })
    );

    logger.info('[Avatar] Listed user avatars', { userId, count: avatars.length });
    return avatars;

  } catch (error) {
    logger.error('[Avatar] Failed to list avatars', { userId, error });
    return [];
  }
}

export const avatarService = {
  getUploadUrl: getAvatarUploadUrl,
  confirmUpload: confirmAvatarUpload,
  getDownloadUrl: getAvatarDownloadUrl,
  deleteAvatar,
  listUserAvatars
};
