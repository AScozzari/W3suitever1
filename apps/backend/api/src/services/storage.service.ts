import { db } from '../core/db';
import { eq, and, or, sql, desc, isNull, gte, lte, inArray } from 'drizzle-orm';
import { 
  storageFolders, storageObjects, storageObjectVersions,
  storageAcl, storageShares, storageUploadSessions,
  storageSignedTokens, storageQuotas, storageAuditEvents,
  users, teams
} from '../db/schema/w3suite';
import crypto from 'crypto';
import { Client } from '@replit/object-storage';

const DEFAULT_USER_QUOTA_BYTES = 1 * 1024 * 1024 * 1024; // 1GB
const DEFAULT_TEAM_QUOTA_BYTES = 10 * 1024 * 1024 * 1024; // 10GB
const SIGNED_URL_EXPIRY_MINUTES = 5;
const UPLOAD_SESSION_EXPIRY_HOURS = 24;

let objectStorageClient: Client | null = null;
let objectStorageInitialized = false;
let objectStorageAvailable = false;

// Object Storage bucket ID from environment
const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || 'replit-objstore-b368c0d0-002a-406a-a949-7390d88e61cc';

async function initObjectStorageClient(): Promise<void> {
  if (objectStorageInitialized) return;
  objectStorageInitialized = true;
  
  try {
    const client = new Client({ bucketId: BUCKET_ID });
    // Test if storage is available
    await client.exists('test-connection');
    objectStorageClient = client;
    objectStorageAvailable = true;
  } catch (e: any) {
    // Silently fail - Object Storage not configured
    objectStorageClient = null;
    objectStorageAvailable = false;
  }
}

async function getObjectStorageClient(): Promise<Client | null> {
  await initObjectStorageClient();
  return objectStorageClient;
}

function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateSignedUrl(objectKey: string, token: string, expiresAt: Date): string {
  return `/api/storage/serve?token=${token}&expires=${expiresAt.getTime()}`;
}

export interface StorageServiceContext {
  tenantId: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateFolderInput {
  name: string;
  parentId?: string;
  category?: string;
  departmentId?: string;
  scopeLevel?: 'tenant' | 'team' | 'user' | 'system';
  ownerTeamId?: string;
  color?: string;
  icon?: string;
}

export interface UploadSessionInput {
  fileName: string;
  mimeType: string;
  totalSizeBytes: number;
  targetFolderId?: string;
  objectType: 'avatar' | 'document' | 'image' | 'file';
  category?: string;
  linkedResourceType?: string;
  linkedResourceId?: string;
}

export interface ShareInput {
  objectId?: string;
  folderId?: string;
  allowDownload?: boolean;
  allowEdit?: boolean;
  requirePassword?: boolean;
  password?: string;
  maxDownloads?: number;
  expiresInHours?: number;
}

export interface AclInput {
  objectId?: string;
  folderId?: string;
  subjectUserId?: string;
  subjectTeamId?: string;
  subjectTenantWide?: boolean;
  role: 'owner' | 'editor' | 'viewer';
  expiresAt?: Date;
}

export const storageService = {
  async createFolder(ctx: StorageServiceContext, input: CreateFolderInput) {
    let path = '/' + input.name;
    
    if (input.parentId) {
      const parent = await db.select().from(storageFolders)
        .where(and(
          eq(storageFolders.id, input.parentId),
          eq(storageFolders.tenantId, ctx.tenantId)
        )).limit(1);
      
      if (parent.length > 0) {
        path = parent[0].path + '/' + input.name;
      }
    }

    const [folder] = await db.insert(storageFolders).values({
      tenantId: ctx.tenantId,
      name: input.name,
      parentId: input.parentId,
      path,
      scopeLevel: input.scopeLevel || 'user',
      ownerUserId: ctx.userId,
      ownerTeamId: input.ownerTeamId,
      category: input.category as any || 'general',
      departmentId: input.departmentId,
      color: input.color,
      icon: input.icon,
      createdByUserId: ctx.userId,
    }).returning();

    await db.insert(storageAcl).values({
      tenantId: ctx.tenantId,
      folderId: folder.id,
      subjectUserId: ctx.userId,
      role: 'owner',
      grantedByUserId: ctx.userId,
    });

    await this.logAuditEvent(ctx, 'create_folder', { folderId: folder.id });

    return folder;
  },

  async deleteFolder(ctx: StorageServiceContext, folderId: string) {
    const folder = await db.select().from(storageFolders)
      .where(and(
        eq(storageFolders.id, folderId),
        eq(storageFolders.tenantId, ctx.tenantId),
        isNull(storageFolders.deletedAt)
      ))
      .limit(1);

    if (folder.length === 0) {
      throw new Error('Cartella non trovata');
    }

    const hasSubfolders = await db.select({ count: sql<number>`count(*)::int` })
      .from(storageFolders)
      .where(and(
        eq(storageFolders.parentId, folderId),
        eq(storageFolders.tenantId, ctx.tenantId),
        isNull(storageFolders.deletedAt)
      ));

    if (hasSubfolders[0]?.count > 0) {
      throw new Error('La cartella contiene sottocartelle e non può essere eliminata');
    }

    const hasObjects = await db.select({ count: sql<number>`count(*)::int` })
      .from(storageObjects)
      .where(and(
        eq(storageObjects.folderId, folderId),
        eq(storageObjects.tenantId, ctx.tenantId),
        isNull(storageObjects.deletedAt)
      ));

    if (hasObjects[0]?.count > 0) {
      throw new Error('La cartella contiene file e non può essere eliminata');
    }

    await db.update(storageFolders)
      .set({ deletedAt: new Date() })
      .where(eq(storageFolders.id, folderId));

    await this.logAuditEvent(ctx, 'delete_folder', { folderId });

    return { success: true };
  },

  async getFolders(ctx: StorageServiceContext, parentId?: string, category?: string) {
    const conditions = [
      eq(storageFolders.tenantId, ctx.tenantId),
      isNull(storageFolders.deletedAt),
    ];

    if (parentId) {
      conditions.push(eq(storageFolders.parentId, parentId));
    } else {
      conditions.push(isNull(storageFolders.parentId));
    }

    if (category) {
      conditions.push(eq(storageFolders.category, category as any));
    }

    const folders = await db.select().from(storageFolders)
      .where(and(...conditions))
      .orderBy(storageFolders.name);

    return folders;
  },

  async getMyDriveFolders(ctx: StorageServiceContext) {
    await this.ensureUserEvergreenFolders(ctx);
    
    const folders = await db.select().from(storageFolders)
      .where(and(
        eq(storageFolders.tenantId, ctx.tenantId),
        eq(storageFolders.ownerUserId, ctx.userId),
        eq(storageFolders.scopeLevel, 'user'),
        isNull(storageFolders.deletedAt),
      ))
      .orderBy(storageFolders.name);

    const folderIds = folders.map(f => f.id);
    
    const shareCountMap = new Map<string, number>();
    const subfolderCountMap = new Map<string, number>();
    const objectCountMap = new Map<string, number>();
    
    if (folderIds.length > 0) {
      const shares = await db.select({ 
        folderId: storageShares.folderId,
        count: sql<number>`count(*)::int`
      })
        .from(storageShares)
        .where(inArray(storageShares.folderId, folderIds))
        .groupBy(storageShares.folderId);
      
      for (const share of shares) {
        if (share.folderId) {
          shareCountMap.set(share.folderId, share.count);
        }
      }

      const subfolders = await db.select({
        parentId: storageFolders.parentId,
        count: sql<number>`count(*)::int`
      })
        .from(storageFolders)
        .where(and(
          inArray(storageFolders.parentId, folderIds),
          eq(storageFolders.tenantId, ctx.tenantId),
          isNull(storageFolders.deletedAt)
        ))
        .groupBy(storageFolders.parentId);
      
      for (const sf of subfolders) {
        if (sf.parentId) {
          subfolderCountMap.set(sf.parentId, sf.count);
        }
      }

      const objects = await db.select({
        folderId: storageObjects.folderId,
        count: sql<number>`count(*)::int`
      })
        .from(storageObjects)
        .where(and(
          inArray(storageObjects.folderId, folderIds),
          eq(storageObjects.tenantId, ctx.tenantId),
          isNull(storageObjects.deletedAt)
        ))
        .groupBy(storageObjects.folderId);
      
      for (const obj of objects) {
        if (obj.folderId) {
          objectCountMap.set(obj.folderId, obj.count);
        }
      }
    }

    return folders.map(folder => ({
      ...folder,
      isShared: shareCountMap.has(folder.id),
      shareCount: shareCountMap.get(folder.id) || 0,
      subfolderCount: subfolderCountMap.get(folder.id) || 0,
      objectCount: objectCountMap.get(folder.id) || 0,
      isEmpty: (subfolderCountMap.get(folder.id) || 0) === 0 && (objectCountMap.get(folder.id) || 0) === 0,
    }));
  },

  async ensureUserEvergreenFolders(ctx: StorageServiceContext) {
    const evergreenFolders = [
      { name: 'Avatar', category: 'avatars', icon: 'user-circle', color: '#FF6900' },
      { name: 'Documenti', category: 'documents', icon: 'file-text', color: '#3B82F6' },
      { name: 'Feed', category: 'feed', icon: 'rss', color: '#10B981' },
      { name: 'Condivisi', category: 'shared', icon: 'users', color: '#8B5CF6' },
    ];

    const existingFolders = await db.select({ name: storageFolders.name }).from(storageFolders)
      .where(and(
        eq(storageFolders.tenantId, ctx.tenantId),
        eq(storageFolders.ownerUserId, ctx.userId),
        eq(storageFolders.scopeLevel, 'user'),
        isNull(storageFolders.deletedAt),
        isNull(storageFolders.parentId),
      ));

    if (existingFolders.length >= evergreenFolders.length) {
      return;
    }

    const existingNames = new Set(existingFolders.map(f => f.name));
    const foldersToCreate = evergreenFolders.filter(f => !existingNames.has(f.name));

    if (foldersToCreate.length === 0) {
      return;
    }

    for (const folderDef of foldersToCreate) {
      const path = '/' + folderDef.name;
      try {
        await db.insert(storageFolders).values({
          tenantId: ctx.tenantId,
          name: folderDef.name,
          path,
          scopeLevel: 'user',
          ownerUserId: ctx.userId,
          category: folderDef.category as any,
          color: folderDef.color,
          icon: folderDef.icon,
          createdByUserId: ctx.userId,
        }).onConflictDoNothing();
      } catch (e) {
        // Ignore duplicate key errors from race conditions
      }
    }
  },

  async getTeamDriveFolders(ctx: StorageServiceContext, teamId: string) {
    const folders = await db.select().from(storageFolders)
      .where(and(
        eq(storageFolders.tenantId, ctx.tenantId),
        eq(storageFolders.ownerTeamId, teamId),
        eq(storageFolders.scopeLevel, 'team'),
        isNull(storageFolders.deletedAt),
        isNull(storageFolders.parentId),
      ))
      .orderBy(storageFolders.name);

    return folders;
  },

  async createUploadSession(ctx: StorageServiceContext, input: UploadSessionInput) {
    const quotaCheck = await this.checkQuota(ctx, input.totalSizeBytes);
    if (!quotaCheck.allowed) {
      throw new Error(`Quota exceeded: ${quotaCheck.message}`);
    }

    const uploadToken = generateToken(32);
    const expiresAt = new Date(Date.now() + UPLOAD_SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

    const [session] = await db.insert(storageUploadSessions).values({
      tenantId: ctx.tenantId,
      uploadToken,
      fileName: input.fileName,
      mimeType: input.mimeType,
      totalSizeBytes: input.totalSizeBytes,
      targetFolderId: input.targetFolderId,
      objectType: input.objectType,
      category: input.category as any || 'general',
      linkedResourceType: input.linkedResourceType,
      linkedResourceId: input.linkedResourceId,
      expiresAt,
      createdByUserId: ctx.userId,
    }).returning();

    return {
      sessionId: session.id,
      uploadToken: session.uploadToken,
      expiresAt: session.expiresAt,
    };
  },

  async completeUpload(ctx: StorageServiceContext, uploadToken: string, fileBuffer: Buffer) {
    const [session] = await db.select().from(storageUploadSessions)
      .where(and(
        eq(storageUploadSessions.uploadToken, uploadToken),
        eq(storageUploadSessions.tenantId, ctx.tenantId),
        eq(storageUploadSessions.status, 'pending'),
      )).limit(1);

    if (!session) {
      throw new Error('Upload session not found or expired');
    }

    if (new Date() > session.expiresAt) {
      await db.update(storageUploadSessions)
        .set({ status: 'expired' })
        .where(eq(storageUploadSessions.id, session.id));
      throw new Error('Upload session expired');
    }

    const extension = session.fileName.split('.').pop() || '';
    const objectId = crypto.randomUUID();
    const objectKey = `${ctx.tenantId}/${session.category}/${ctx.userId}/${objectId}.${extension}`;

    try {
      await db.update(storageUploadSessions)
        .set({ status: 'uploading' })
        .where(eq(storageUploadSessions.id, session.id));

      const client = await getObjectStorageClient();
      if (!client) throw new Error('Object Storage not available');
      await client.uploadFromBytes(objectKey, fileBuffer);

      const contentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      const [storageObject] = await db.insert(storageObjects).values({
        tenantId: ctx.tenantId,
        name: session.fileName,
        originalName: session.fileName,
        mimeType: session.mimeType,
        sizeBytes: fileBuffer.length,
        extension,
        objectKey,
        folderId: session.targetFolderId,
        objectType: session.objectType,
        category: session.category,
        scopeLevel: 'user',
        ownerUserId: ctx.userId,
        contentHash,
        linkedResourceType: session.linkedResourceType,
        linkedResourceId: session.linkedResourceId,
        createdByUserId: ctx.userId,
      }).returning();

      await db.insert(storageAcl).values({
        tenantId: ctx.tenantId,
        objectId: storageObject.id,
        subjectUserId: ctx.userId,
        role: 'owner',
        grantedByUserId: ctx.userId,
      });

      await db.update(storageUploadSessions)
        .set({ 
          status: 'completed',
          resultObjectId: storageObject.id,
          completedAt: new Date(),
        })
        .where(eq(storageUploadSessions.id, session.id));

      await this.updateQuotaUsage(ctx, fileBuffer.length);

      await this.logAuditEvent(ctx, 'upload', { objectId: storageObject.id });

      return storageObject;

    } catch (error: any) {
      await db.update(storageUploadSessions)
        .set({ 
          status: 'failed',
          errorMessage: error.message,
        })
        .where(eq(storageUploadSessions.id, session.id));
      throw error;
    }
  },

  async uploadDirect(ctx: StorageServiceContext, input: UploadSessionInput, fileBuffer: Buffer) {
    const quotaCheck = await this.checkQuota(ctx, input.totalSizeBytes);
    if (!quotaCheck.allowed) {
      throw new Error(`Quota exceeded: ${quotaCheck.message}`);
    }

    const extension = input.fileName.split('.').pop() || '';
    const objectId = crypto.randomUUID();
    const category = input.category || 'general';
    const objectKey = `${ctx.tenantId}/${category}/${ctx.userId}/${objectId}.${extension}`;

    const client = await getObjectStorageClient();
    if (!client) throw new Error('Object Storage not available');
    await client.uploadFromBytes(objectKey, fileBuffer);

    const contentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const [storageObject] = await db.insert(storageObjects).values({
      tenantId: ctx.tenantId,
      name: input.fileName,
      originalName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: fileBuffer.length,
      extension,
      objectKey,
      folderId: input.targetFolderId,
      objectType: input.objectType,
      category: category as any,
      scopeLevel: 'user',
      ownerUserId: ctx.userId,
      contentHash,
      linkedResourceType: input.linkedResourceType,
      linkedResourceId: input.linkedResourceId,
      createdByUserId: ctx.userId,
    }).returning();

    await db.insert(storageAcl).values({
      tenantId: ctx.tenantId,
      objectId: storageObject.id,
      subjectUserId: ctx.userId,
      role: 'owner',
      grantedByUserId: ctx.userId,
    });

    await this.updateQuotaUsage(ctx, fileBuffer.length);
    await this.logAuditEvent(ctx, 'upload', { objectId: storageObject.id });

    return storageObject;
  },

  async getSignedUrl(ctx: StorageServiceContext, objectId: string) {
    const hasAccess = await this.checkAccess(ctx, objectId, 'viewer');
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    const [object] = await db.select().from(storageObjects)
      .where(and(
        eq(storageObjects.id, objectId),
        eq(storageObjects.tenantId, ctx.tenantId),
        isNull(storageObjects.deletedAt),
      )).limit(1);

    if (!object) {
      throw new Error('Object not found');
    }

    const token = generateToken(64);
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + SIGNED_URL_EXPIRY_MINUTES * 60 * 1000);

    await db.insert(storageSignedTokens).values({
      objectId,
      token,
      tokenHash,
      userId: ctx.userId,
      ipAddress: ctx.ipAddress,
      expiresAt,
    });

    const signedUrl = generateSignedUrl(object.objectKey, token, expiresAt);

    await this.logAuditEvent(ctx, 'generate_signed_url', { objectId });

    return {
      url: signedUrl,
      expiresAt,
      mimeType: object.mimeType,
      fileName: object.name,
    };
  },

  async serveByToken(token: string) {
    const tokenHash = hashToken(token);

    const [tokenRecord] = await db.select().from(storageSignedTokens)
      .where(eq(storageSignedTokens.token, token))
      .limit(1);

    if (!tokenRecord) {
      throw new Error('Invalid token');
    }

    if (new Date() > tokenRecord.expiresAt) {
      throw new Error('Token expired');
    }

    if (tokenRecord.singleUse && tokenRecord.usedAt) {
      throw new Error('Token already used');
    }

    const [object] = await db.select().from(storageObjects)
      .where(eq(storageObjects.id, tokenRecord.objectId))
      .limit(1);

    if (!object) {
      throw new Error('Object not found');
    }

    if (tokenRecord.singleUse) {
      await db.update(storageSignedTokens)
        .set({ usedAt: new Date() })
        .where(eq(storageSignedTokens.id, tokenRecord.id));
    }

    const client = await getObjectStorageClient();
    if (!client) throw new Error('Object Storage not available');
    const downloadResult = await client.downloadAsBytes(object.objectKey);
    
    // downloadAsBytes returns Buffer[] - extract the first buffer
    const [fileBuffer] = downloadResult.value || [];

    return {
      buffer: fileBuffer,
      mimeType: object.mimeType,
      fileName: object.name,
    };
  },

  async checkAccess(ctx: StorageServiceContext, objectId: string, requiredRole: 'owner' | 'editor' | 'viewer'): Promise<boolean> {
    const roleHierarchy = { owner: 3, editor: 2, viewer: 1 };
    const requiredLevel = roleHierarchy[requiredRole];

    const acls = await db.select().from(storageAcl)
      .where(and(
        eq(storageAcl.tenantId, ctx.tenantId),
        eq(storageAcl.objectId, objectId),
        or(
          eq(storageAcl.subjectUserId, ctx.userId),
          eq(storageAcl.subjectTenantWide, true),
        ),
        or(
          isNull(storageAcl.expiresAt),
          gte(storageAcl.expiresAt, new Date()),
        ),
      ));

    for (const acl of acls) {
      const aclLevel = roleHierarchy[acl.role];
      if (aclLevel >= requiredLevel) {
        return true;
      }
    }

    return false;
  },

  async createShare(ctx: StorageServiceContext, input: ShareInput) {
    const shareToken = generateToken(32);

    const values: any = {
      tenantId: ctx.tenantId,
      objectId: input.objectId,
      folderId: input.folderId,
      shareToken,
      allowDownload: input.allowDownload ?? true,
      allowEdit: input.allowEdit ?? false,
      requirePassword: input.requirePassword ?? false,
      maxDownloads: input.maxDownloads,
      createdByUserId: ctx.userId,
    };

    if (input.requirePassword && input.password) {
      values.passwordHash = crypto.createHash('sha256').update(input.password).digest('hex');
    }

    if (input.expiresInHours) {
      values.expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000);
    }

    const [share] = await db.insert(storageShares).values(values).returning();

    await this.logAuditEvent(ctx, 'create_share', { 
      objectId: input.objectId, 
      folderId: input.folderId,
      shareId: share.id,
    });

    return {
      shareId: share.id,
      shareToken: share.shareToken,
      shareUrl: `/api/storage/shared/${share.shareToken}`,
      expiresAt: share.expiresAt,
    };
  },

  async grantAccess(ctx: StorageServiceContext, input: AclInput) {
    const [acl] = await db.insert(storageAcl).values({
      tenantId: ctx.tenantId,
      objectId: input.objectId,
      folderId: input.folderId,
      subjectUserId: input.subjectUserId,
      subjectTeamId: input.subjectTeamId,
      subjectTenantWide: input.subjectTenantWide ?? false,
      role: input.role,
      grantedByUserId: ctx.userId,
      expiresAt: input.expiresAt,
    }).returning();

    await this.logAuditEvent(ctx, 'grant_access', { 
      objectId: input.objectId,
      folderId: input.folderId,
      subjectUserId: input.subjectUserId,
      subjectTeamId: input.subjectTeamId,
      role: input.role,
    });

    return acl;
  },

  async revokeAccess(ctx: StorageServiceContext, aclId: string) {
    const [deleted] = await db.delete(storageAcl)
      .where(and(
        eq(storageAcl.id, aclId),
        eq(storageAcl.tenantId, ctx.tenantId),
      ))
      .returning();

    if (deleted) {
      await this.logAuditEvent(ctx, 'revoke_access', { aclId });
    }

    return deleted;
  },

  async checkQuota(ctx: StorageServiceContext, additionalBytes: number): Promise<{ allowed: boolean; message?: string }> {
    const [quota] = await db.select().from(storageQuotas)
      .where(and(
        eq(storageQuotas.tenantId, ctx.tenantId),
        eq(storageQuotas.userId, ctx.userId),
        eq(storageQuotas.scopeLevel, 'user'),
      )).limit(1);

    if (!quota) {
      await db.insert(storageQuotas).values({
        tenantId: ctx.tenantId,
        scopeLevel: 'user',
        userId: ctx.userId,
        quotaBytes: DEFAULT_USER_QUOTA_BYTES,
        usedBytes: 0,
      });
      return { allowed: true };
    }

    const newUsage = (quota.usedBytes || 0) + additionalBytes;
    if (newUsage > quota.quotaBytes) {
      return { 
        allowed: false, 
        message: `Would exceed quota: ${formatBytes(newUsage)} / ${formatBytes(quota.quotaBytes)}` 
      };
    }

    return { allowed: true };
  },

  async updateQuotaUsage(ctx: StorageServiceContext, deltaBytes: number) {
    await db.update(storageQuotas)
      .set({ 
        usedBytes: sql`used_bytes + ${deltaBytes}`,
        updatedAt: new Date(),
      })
      .where(and(
        eq(storageQuotas.tenantId, ctx.tenantId),
        eq(storageQuotas.userId, ctx.userId),
        eq(storageQuotas.scopeLevel, 'user'),
      ));
  },

  async getQuotaUsage(ctx: StorageServiceContext) {
    const [quota] = await db.select().from(storageQuotas)
      .where(and(
        eq(storageQuotas.tenantId, ctx.tenantId),
        eq(storageQuotas.userId, ctx.userId),
        eq(storageQuotas.scopeLevel, 'user'),
      )).limit(1);

    if (!quota) {
      return {
        quotaBytes: DEFAULT_USER_QUOTA_BYTES,
        usedBytes: 0,
        percentUsed: 0,
        remainingBytes: DEFAULT_USER_QUOTA_BYTES,
      };
    }

    const percentUsed = Math.round(((quota.usedBytes || 0) / quota.quotaBytes) * 100);

    return {
      quotaBytes: quota.quotaBytes,
      usedBytes: quota.usedBytes || 0,
      percentUsed,
      remainingBytes: quota.quotaBytes - (quota.usedBytes || 0),
    };
  },

  async getObjects(ctx: StorageServiceContext, folderId?: string, category?: string) {
    const conditions = [
      eq(storageObjects.tenantId, ctx.tenantId),
      isNull(storageObjects.deletedAt),
    ];

    if (folderId) {
      conditions.push(eq(storageObjects.folderId, folderId));
    }

    if (category) {
      conditions.push(eq(storageObjects.category, category as any));
    }

    const objects = await db.select().from(storageObjects)
      .where(and(...conditions))
      .orderBy(desc(storageObjects.createdAt));

    const objectIds = objects.map(o => o.id);
    
    const shareCountMap = new Map<string, number>();
    if (objectIds.length > 0) {
      const shares = await db.select({ 
        objectId: storageShares.objectId,
        count: sql<number>`count(*)::int`
      })
        .from(storageShares)
        .where(inArray(storageShares.objectId, objectIds))
        .groupBy(storageShares.objectId);
      
      for (const share of shares) {
        if (share.objectId) {
          shareCountMap.set(share.objectId, share.count);
        }
      }
    }

    return objects.map(obj => ({
      ...obj,
      isShared: shareCountMap.has(obj.id),
      shareCount: shareCountMap.get(obj.id) || 0,
    }));
  },

  async getMyDriveObjects(ctx: StorageServiceContext, folderId?: string) {
    const conditions = [
      eq(storageObjects.tenantId, ctx.tenantId),
      eq(storageObjects.ownerUserId, ctx.userId),
      isNull(storageObjects.deletedAt),
    ];

    if (folderId) {
      conditions.push(eq(storageObjects.folderId, folderId));
    } else {
      conditions.push(isNull(storageObjects.folderId));
    }

    const objects = await db.select().from(storageObjects)
      .where(and(...conditions))
      .orderBy(desc(storageObjects.createdAt));

    return objects;
  },

  // Returns ALL user's objects for tree navigator (no folder filtering, but maintains user ownership)
  async getAllMyDriveObjects(ctx: StorageServiceContext) {
    const conditions = [
      eq(storageObjects.tenantId, ctx.tenantId),
      eq(storageObjects.ownerUserId, ctx.userId), // SECURITY: Only return user's own objects
      isNull(storageObjects.deletedAt),
    ];

    const objects = await db.select().from(storageObjects)
      .where(and(...conditions))
      .orderBy(desc(storageObjects.createdAt));

    return objects;
  },

  async getSharedWithMe(ctx: StorageServiceContext) {
    const acls = await db.select({
      objectId: storageAcl.objectId,
      folderId: storageAcl.folderId,
      role: storageAcl.role,
    }).from(storageAcl)
      .where(and(
        eq(storageAcl.tenantId, ctx.tenantId),
        eq(storageAcl.subjectUserId, ctx.userId),
        or(
          isNull(storageAcl.expiresAt),
          gte(storageAcl.expiresAt, new Date()),
        ),
      ));

    const objectIds = acls.filter(a => a.objectId).map(a => a.objectId!);
    const folderIds = acls.filter(a => a.folderId).map(a => a.folderId!);

    const objects = objectIds.length > 0 
      ? await db.select().from(storageObjects)
          .where(and(
            sql`${storageObjects.id} = ANY(${objectIds})`,
            isNull(storageObjects.deletedAt),
          ))
      : [];

    const folders = folderIds.length > 0
      ? await db.select().from(storageFolders)
          .where(and(
            sql`${storageFolders.id} = ANY(${folderIds})`,
            isNull(storageFolders.deletedAt),
          ))
      : [];

    return { objects, folders };
  },

  async moveToTrash(ctx: StorageServiceContext, objectId: string) {
    const hasAccess = await this.checkAccess(ctx, objectId, 'editor');
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    const permanentDeleteAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const [updated] = await db.update(storageObjects)
      .set({ 
        deletedAt: new Date(),
        deletedByUserId: ctx.userId,
        permanentDeleteAt,
      })
      .where(and(
        eq(storageObjects.id, objectId),
        eq(storageObjects.tenantId, ctx.tenantId),
      ))
      .returning();

    if (updated) {
      await this.updateQuotaUsage(ctx, -(updated.sizeBytes || 0));
      await this.logAuditEvent(ctx, 'trash', { objectId });
    }

    return updated;
  },

  async restoreFromTrash(ctx: StorageServiceContext, objectId: string) {
    const [object] = await db.select().from(storageObjects)
      .where(and(
        eq(storageObjects.id, objectId),
        eq(storageObjects.tenantId, ctx.tenantId),
      )).limit(1);

    if (!object) {
      throw new Error('Object not found');
    }

    const [updated] = await db.update(storageObjects)
      .set({ 
        deletedAt: null,
        deletedByUserId: null,
        permanentDeleteAt: null,
      })
      .where(eq(storageObjects.id, objectId))
      .returning();

    if (updated) {
      await this.updateQuotaUsage(ctx, updated.sizeBytes || 0);
      await this.logAuditEvent(ctx, 'restore', { objectId });
    }

    return updated;
  },

  async permanentDelete(ctx: StorageServiceContext, objectId: string) {
    const hasAccess = await this.checkAccess(ctx, objectId, 'owner');
    if (!hasAccess) {
      throw new Error('Access denied - owner required');
    }

    const [object] = await db.select().from(storageObjects)
      .where(and(
        eq(storageObjects.id, objectId),
        eq(storageObjects.tenantId, ctx.tenantId),
      )).limit(1);

    if (!object) {
      throw new Error('Object not found');
    }

    try {
      const client = await getObjectStorageClient();
      if (client) await client.delete(object.objectKey);
    } catch (error) {
      console.error('Failed to delete from object storage:', error);
    }

    await db.delete(storageObjects)
      .where(eq(storageObjects.id, objectId));

    await this.logAuditEvent(ctx, 'permanent_delete', { objectId, objectKey: object.objectKey });

    return { deleted: true };
  },

  async getTrash(ctx: StorageServiceContext) {
    const objects = await db.select().from(storageObjects)
      .where(and(
        eq(storageObjects.tenantId, ctx.tenantId),
        eq(storageObjects.ownerUserId, ctx.userId),
        sql`${storageObjects.deletedAt} IS NOT NULL`,
      ))
      .orderBy(desc(storageObjects.deletedAt));

    return objects;
  },

  async ensureSystemFolders(ctx: StorageServiceContext) {
    const systemFolders = [
      { name: 'Avatars', path: '/System/Avatars', category: 'avatars' as const, icon: 'user-circle' },
      { name: 'Feed', path: '/System/Feed', category: 'feed' as const, icon: 'newspaper' },
      { name: 'Chat', path: '/System/Chat', category: 'chat' as const, icon: 'message-circle' },
    ];

    for (const folderDef of systemFolders) {
      const exists = await db.select().from(storageFolders)
        .where(and(
          eq(storageFolders.tenantId, ctx.tenantId),
          eq(storageFolders.path, folderDef.path),
          eq(storageFolders.isSystemFolder, true),
        )).limit(1);

      if (exists.length === 0) {
        await db.insert(storageFolders).values({
          tenantId: ctx.tenantId,
          name: folderDef.name,
          path: folderDef.path,
          scopeLevel: 'system',
          category: folderDef.category,
          isSystemFolder: true,
          icon: folderDef.icon,
          createdByUserId: ctx.userId,
        });
      }
    }
  },

  async logAuditEvent(ctx: StorageServiceContext, action: string, details: Record<string, any> = {}) {
    await db.insert(storageAuditEvents).values({
      tenantId: ctx.tenantId,
      objectId: details.objectId,
      folderId: details.folderId,
      action,
      userId: ctx.userId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      details,
    });
  },

  // Legacy uploadAvatar and getAvatarSignedUrl removed - use evergreen folder versions below

  async getRecentObjects(ctx: StorageServiceContext, limit: number = 20) {
    const objects = await db.select().from(storageObjects)
      .where(and(
        eq(storageObjects.tenantId, ctx.tenantId),
        eq(storageObjects.ownerUserId, ctx.userId),
        isNull(storageObjects.deletedAt),
      ))
      .orderBy(desc(storageObjects.updatedAt))
      .limit(limit);

    return objects;
  },

  async toggleFavorite(ctx: StorageServiceContext, objectId: string) {
    const hasAccess = await this.checkAccess(ctx, objectId, 'viewer');
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    const [object] = await db.select().from(storageObjects)
      .where(and(
        eq(storageObjects.id, objectId),
        eq(storageObjects.tenantId, ctx.tenantId),
      )).limit(1);

    if (!object) {
      throw new Error('Object not found');
    }

    const [updated] = await db.update(storageObjects)
      .set({ 
        isFavorite: !object.isFavorite,
        updatedAt: new Date(),
      })
      .where(and(
        eq(storageObjects.id, objectId),
        eq(storageObjects.tenantId, ctx.tenantId),
      ))
      .returning();

    await this.logAuditEvent(ctx, object.isFavorite ? 'unfavorite' : 'favorite', { objectId });
    return updated;
  },

  async generateSignedUrl(ctx: StorageServiceContext, objectId: string) {
    return this.getSignedUrl(ctx, objectId);
  },

  async getQuotaSummary(ctx: StorageServiceContext) {
    const userQuotas = await db.select()
      .from(storageQuotas)
      .where(and(
        eq(storageQuotas.tenantId, ctx.tenantId),
        eq(storageQuotas.scopeLevel, 'user'),
      ));

    const teamQuotas = await db.select()
      .from(storageQuotas)
      .where(and(
        eq(storageQuotas.tenantId, ctx.tenantId),
        eq(storageQuotas.scopeLevel, 'team'),
      ));

    const usersList = await db.select()
      .from(users)
      .where(eq(users.tenantId, ctx.tenantId));

    const teamsList = await db.select()
      .from(teams)
      .where(eq(teams.tenantId, ctx.tenantId));

    const userQuotaMap = new Map(userQuotas.map(q => [q.userId, q]));
    const teamQuotaMap = new Map(teamQuotas.map(q => [q.teamId, q]));

    const userSummary = usersList.map((user: any) => {
      const quota = userQuotaMap.get(user.id);
      return {
        type: 'user' as const,
        id: user.id,
        name: `${user.first_name || user.firstName || ''} ${user.last_name || user.lastName || ''}`.trim() || user.email,
        email: user.email,
        isActive: user.is_active ?? user.isActive ?? true,
        quotaBytes: quota?.quotaBytes || DEFAULT_USER_QUOTA_BYTES,
        usedBytes: quota?.usedBytes || 0,
        hasCustomQuota: !!quota,
        suspended: quota?.suspended || false,
      };
    });

    const teamSummary = teamsList.map((team: any) => {
      const quota = teamQuotaMap.get(team.id);
      return {
        type: 'team' as const,
        id: team.id,
        name: team.name,
        isActive: team.is_active ?? team.isActive ?? true,
        quotaBytes: quota?.quotaBytes || DEFAULT_TEAM_QUOTA_BYTES,
        usedBytes: quota?.usedBytes || 0,
        hasCustomQuota: !!quota,
        suspended: quota?.suspended || false,
      };
    });

    const tenantDefaults = await this.getQuotaDefaultsInternal(ctx);

    return {
      users: userSummary,
      teams: teamSummary,
      defaults: tenantDefaults,
    };
  },

  async getQuotaDefaultsInternal(ctx: StorageServiceContext) {
    const tenantQuotas = await db.select().from(storageQuotas)
      .where(and(
        eq(storageQuotas.tenantId, ctx.tenantId),
        eq(storageQuotas.scopeLevel, 'tenant'),
      ));
    
    const userDefault = tenantQuotas.find(q => q.userId === null && q.teamId === null);
    
    return {
      userQuotaBytes: userDefault?.quotaBytes || DEFAULT_USER_QUOTA_BYTES,
      teamQuotaBytes: DEFAULT_TEAM_QUOTA_BYTES,
    };
  },

  async getQuotaDefaults(ctx: StorageServiceContext) {
    return this.getQuotaDefaultsInternal(ctx);
  },

  async updateQuotaDefaults(ctx: StorageServiceContext, data: { userQuotaBytes?: number; teamQuotaBytes?: number }) {
    const [existing] = await db.select().from(storageQuotas)
      .where(and(
        eq(storageQuotas.tenantId, ctx.tenantId),
        eq(storageQuotas.scopeLevel, 'tenant'),
      )).limit(1);

    if (existing) {
      await db.update(storageQuotas)
        .set({ 
          quotaBytes: data.userQuotaBytes || existing.quotaBytes,
          updatedAt: new Date(),
        })
        .where(eq(storageQuotas.id, existing.id));
    } else {
      await db.insert(storageQuotas).values({
        tenantId: ctx.tenantId,
        scopeLevel: 'tenant',
        quotaBytes: data.userQuotaBytes || DEFAULT_USER_QUOTA_BYTES,
      });
    }

    await this.logAuditEvent(ctx, 'update_quota_defaults', data);

    return {
      userQuotaBytes: data.userQuotaBytes || DEFAULT_USER_QUOTA_BYTES,
      teamQuotaBytes: data.teamQuotaBytes || DEFAULT_TEAM_QUOTA_BYTES,
    };
  },

  async updateUserQuota(ctx: StorageServiceContext, userId: string, data: { quotaBytes?: number; suspended?: boolean }) {
    const [existing] = await db.select().from(storageQuotas)
      .where(and(
        eq(storageQuotas.tenantId, ctx.tenantId),
        eq(storageQuotas.userId, userId),
        eq(storageQuotas.scopeLevel, 'user'),
      )).limit(1);

    if (existing) {
      const [updated] = await db.update(storageQuotas)
        .set({ 
          quotaBytes: data.quotaBytes !== undefined ? data.quotaBytes : existing.quotaBytes,
          suspended: data.suspended !== undefined ? data.suspended : existing.suspended,
          updatedAt: new Date(),
        })
        .where(eq(storageQuotas.id, existing.id))
        .returning();
      
      await this.logAuditEvent(ctx, 'update_user_quota', { userId, ...data });
      return updated;
    } else {
      const [created] = await db.insert(storageQuotas).values({
        tenantId: ctx.tenantId,
        userId,
        scopeLevel: 'user',
        quotaBytes: data.quotaBytes || DEFAULT_USER_QUOTA_BYTES,
        suspended: data.suspended || false,
      }).returning();
      
      await this.logAuditEvent(ctx, 'create_user_quota', { userId, ...data });
      return created;
    }
  },

  async updateTeamQuota(ctx: StorageServiceContext, teamId: string, data: { quotaBytes?: number; suspended?: boolean }) {
    const [existing] = await db.select().from(storageQuotas)
      .where(and(
        eq(storageQuotas.tenantId, ctx.tenantId),
        eq(storageQuotas.teamId, teamId),
        eq(storageQuotas.scopeLevel, 'team'),
      )).limit(1);

    if (existing) {
      const [updated] = await db.update(storageQuotas)
        .set({ 
          quotaBytes: data.quotaBytes !== undefined ? data.quotaBytes : existing.quotaBytes,
          suspended: data.suspended !== undefined ? data.suspended : existing.suspended,
          updatedAt: new Date(),
        })
        .where(eq(storageQuotas.id, existing.id))
        .returning();
      
      await this.logAuditEvent(ctx, 'update_team_quota', { teamId, ...data });
      return updated;
    } else {
      const [created] = await db.insert(storageQuotas).values({
        tenantId: ctx.tenantId,
        teamId,
        scopeLevel: 'team',
        quotaBytes: data.quotaBytes || DEFAULT_TEAM_QUOTA_BYTES,
        suspended: data.suspended || false,
      }).returning();
      
      await this.logAuditEvent(ctx, 'create_team_quota', { teamId, ...data });
      return created;
    }
  },

  async createUserEvergreenFolders(ctx: StorageServiceContext, targetUserId?: string) {
    const userId = targetUserId || ctx.userId;
    const EVERGREEN_FOLDERS = [
      { name: 'Avatar', icon: 'user-circle', category: 'avatars' },
      { name: 'Feed', icon: 'rss', category: 'feed' },
      { name: 'Documenti', icon: 'file-text', category: 'documents' },
      { name: 'Condivisi', icon: 'share-2', category: 'general' },
    ];

    const existingFolders = await db.select().from(storageFolders)
      .where(and(
        eq(storageFolders.tenantId, ctx.tenantId),
        eq(storageFolders.ownerUserId, userId),
        eq(storageFolders.scopeLevel, 'user'),
        isNull(storageFolders.parentId),
      ));

    const existingNames = new Set(existingFolders.map(f => f.name.toLowerCase()));
    const createdFolders = [];

    for (const folderDef of EVERGREEN_FOLDERS) {
      if (!existingNames.has(folderDef.name)) {
        const [folder] = await db.insert(storageFolders).values({
          tenantId: ctx.tenantId,
          name: folderDef.name,
          path: `/${folderDef.name}`,
          scopeLevel: 'user',
          ownerUserId: userId,
          category: folderDef.category as any,
          icon: folderDef.icon,
          isSystemFolder: true,
          createdByUserId: ctx.userId,
        }).returning();

        await db.insert(storageAcl).values({
          tenantId: ctx.tenantId,
          folderId: folder.id,
          subjectUserId: userId,
          role: 'owner',
          grantedByUserId: ctx.userId,
        });

        createdFolders.push(folder);
      }
    }

    if (createdFolders.length > 0) {
      await this.logAuditEvent(ctx, 'create_evergreen_folders', { 
        targetUserId: userId, 
        folders: createdFolders.map(f => f.name) 
      });
    }

    return createdFolders;
  },

  async ensureUserAvatarFolder(ctx: StorageServiceContext, targetUserId?: string) {
    const userId = targetUserId || ctx.userId;
    
    const [existingAvatarFolder] = await db.select().from(storageFolders)
      .where(and(
        eq(storageFolders.tenantId, ctx.tenantId),
        eq(storageFolders.ownerUserId, userId),
        eq(storageFolders.name, 'Avatar'),
        eq(storageFolders.scopeLevel, 'user'),
        isNull(storageFolders.parentId),
        isNull(storageFolders.deletedAt),
      )).limit(1);

    if (existingAvatarFolder) {
      return existingAvatarFolder;
    }

    await this.createUserEvergreenFolders(ctx, userId);

    const [avatarFolder] = await db.select().from(storageFolders)
      .where(and(
        eq(storageFolders.tenantId, ctx.tenantId),
        eq(storageFolders.ownerUserId, userId),
        eq(storageFolders.name, 'Avatar'),
        eq(storageFolders.scopeLevel, 'user'),
        isNull(storageFolders.parentId),
      )).limit(1);

    return avatarFolder;
  },

  async uploadAvatar(ctx: StorageServiceContext, targetUserId: string, fileBuffer: Buffer, mimeType: string, fileName: string) {
    const avatarFolder = await this.ensureUserAvatarFolder(ctx, targetUserId);
    if (!avatarFolder) {
      throw new Error('Could not create avatar folder');
    }

    const existingAvatars = await db.select().from(storageObjects)
      .where(and(
        eq(storageObjects.tenantId, ctx.tenantId),
        eq(storageObjects.folderId, avatarFolder.id),
        eq(storageObjects.objectType, 'avatar'),
        isNull(storageObjects.deletedAt),
      ));

    for (const oldAvatar of existingAvatars) {
      await db.update(storageObjects)
        .set({ deletedAt: new Date() })
        .where(eq(storageObjects.id, oldAvatar.id));
      
      try {
        const client = await getObjectStorageClient();
        if (client) await client.delete(oldAvatar.objectKey);
      } catch (err) {
        console.warn('Failed to delete old avatar from object storage:', err);
      }
    }

    const ext = fileName.split('.').pop() || 'webp';
    const objectKey = `users/${targetUserId}/avatar/profile.${ext}`;
    const sizeBytes = fileBuffer.length;

    const client = await getObjectStorageClient();
    if (!client) throw new Error('Object Storage not available');
    const uploadResult = await client.uploadFromBytes(objectKey, fileBuffer);
    
    if (!uploadResult.ok) {
      throw new Error('Failed to upload avatar to object storage');
    }

    const contentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const [avatarObject] = await db.insert(storageObjects).values({
      tenantId: ctx.tenantId,
      folderId: avatarFolder.id,
      name: `profile.${ext}`,
      originalName: fileName,
      objectKey,
      mimeType,
      sizeBytes,
      extension: ext,
      objectType: 'avatar',
      category: 'avatars',
      scopeLevel: 'user',
      ownerUserId: targetUserId,
      visibility: 'public',
      contentHash,
      linkedResourceType: 'user_avatar',
      linkedResourceId: targetUserId,
      createdByUserId: ctx.userId,
    }).returning();

    // Create public ACL for avatar (tenant-wide read access)
    await db.insert(storageAcl).values({
      tenantId: ctx.tenantId,
      objectId: avatarObject.id,
      subjectTenantWide: true,
      role: 'viewer',
      grantedByUserId: ctx.userId,
    });

    // Update user's avatar_object_path for backward compatibility
    await db.update(users)
      .set({ avatarObjectPath: objectKey })
      .where(eq(users.id, targetUserId));

    await this.updateQuotaUsage(ctx, sizeBytes);

    await this.logAuditEvent(ctx, 'upload_avatar', { 
      targetUserId, 
      objectId: avatarObject.id,
      sizeBytes 
    });

    return avatarObject;
  },

  async getAvatarSignedUrl(ctx: StorageServiceContext, targetUserId: string) {
    const avatarFolder = await db.select().from(storageFolders)
      .where(and(
        eq(storageFolders.tenantId, ctx.tenantId),
        eq(storageFolders.ownerUserId, targetUserId),
        eq(storageFolders.name, 'Avatar'),
        eq(storageFolders.scopeLevel, 'user'),
        isNull(storageFolders.parentId),
        isNull(storageFolders.deletedAt),
      )).limit(1);

    if (!avatarFolder[0]) {
      return null;
    }

    const [avatarObject] = await db.select().from(storageObjects)
      .where(and(
        eq(storageObjects.tenantId, ctx.tenantId),
        eq(storageObjects.folderId, avatarFolder[0].id),
        eq(storageObjects.objectType, 'avatar'),
        isNull(storageObjects.deletedAt),
      ))
      .orderBy(desc(storageObjects.createdAt))
      .limit(1);

    if (!avatarObject) {
      return null;
    }

    // Avatars are always public within a tenant - bypass ACL check
    const token = generateToken(64);
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + SIGNED_URL_EXPIRY_MINUTES * 60 * 1000);

    await db.insert(storageSignedTokens).values({
      objectId: avatarObject.id,
      token,
      tokenHash,
      userId: ctx.userId,
      ipAddress: ctx.ipAddress,
      expiresAt,
    });

    const signedUrl = generateSignedUrl(avatarObject.objectKey, token, expiresAt);

    return {
      url: signedUrl,
      expiresAt,
      mimeType: avatarObject.mimeType,
      fileName: avatarObject.name,
    };
  },

  async deleteAvatar(ctx: StorageServiceContext, targetUserId: string) {
    const avatarFolder = await db.select().from(storageFolders)
      .where(and(
        eq(storageFolders.tenantId, ctx.tenantId),
        eq(storageFolders.ownerUserId, targetUserId),
        eq(storageFolders.name, 'Avatar'),
        eq(storageFolders.scopeLevel, 'user'),
        isNull(storageFolders.parentId),
        isNull(storageFolders.deletedAt),
      )).limit(1);

    if (!avatarFolder[0]) {
      return { deleted: false, message: 'No avatar folder found' };
    }

    const avatarObjects = await db.select().from(storageObjects)
      .where(and(
        eq(storageObjects.tenantId, ctx.tenantId),
        eq(storageObjects.folderId, avatarFolder[0].id),
        eq(storageObjects.objectType, 'avatar'),
        isNull(storageObjects.deletedAt),
      ));

    let totalBytesDeleted = 0;

    for (const avatarObject of avatarObjects) {
      await db.update(storageObjects)
        .set({ deletedAt: new Date() })
        .where(eq(storageObjects.id, avatarObject.id));
      
      totalBytesDeleted += avatarObject.sizeBytes || 0;

      try {
        const client = await getObjectStorageClient();
        if (client) await client.delete(avatarObject.objectKey);
      } catch (err) {
        console.warn('Failed to delete avatar from object storage:', err);
      }
    }

    if (totalBytesDeleted > 0) {
      await this.updateQuotaUsage(ctx, -totalBytesDeleted);
    }

    await this.logAuditEvent(ctx, 'delete_avatar', { 
      targetUserId, 
      objectsDeleted: avatarObjects.length,
      bytesFreed: totalBytesDeleted 
    });

    return { deleted: true, objectsDeleted: avatarObjects.length, bytesFreed: totalBytesDeleted };
  },

  // ==================== MIGRATION ====================

  async migrateEvergreenFolders(ctx: StorageServiceContext) {
    const tenantUsers = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.tenantId, ctx.tenantId));

    let usersProcessed = 0;
    let foldersCreated = 0;
    const errors: string[] = [];

    for (const user of tenantUsers) {
      try {
        const created = await this.createUserEvergreenFolders(ctx, user.id);
        foldersCreated += created.length;
        usersProcessed++;
      } catch (err: any) {
        errors.push(`User ${user.id}: ${err.message}`);
      }
    }

    await this.logAuditEvent(ctx, 'migrate_evergreen_folders', {
      usersProcessed,
      foldersCreated,
      errors: errors.length
    });

    return { usersProcessed, foldersCreated, errors };
  },

  // ==================== SHARING ====================

  async createShare(ctx: StorageServiceContext, input: ShareInput) {
    const shareToken = generateToken(32);
    let passwordHash = null;

    if (input.requirePassword && input.password) {
      passwordHash = hashToken(input.password);
    }

    const expiresAt = input.expiresInHours 
      ? new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000)
      : null;

    const [share] = await db.insert(storageShares).values({
      tenantId: ctx.tenantId,
      objectId: input.objectId,
      folderId: input.folderId,
      shareToken,
      allowDownload: input.allowDownload ?? true,
      allowEdit: input.allowEdit ?? false,
      requirePassword: input.requirePassword ?? false,
      passwordHash,
      maxDownloads: input.maxDownloads,
      expiresAt,
      createdByUserId: ctx.userId,
      inheritToChildren: true,
    }).returning();

    await this.logAuditEvent(ctx, 'create_share', { shareId: share.id });

    return {
      ...share,
      shareUrl: `/api/storage/share/${shareToken}`,
      shareToken,
    };
  },

  async accessShare(shareToken: string, password?: string) {
    const [share] = await db.select().from(storageShares)
      .where(and(
        eq(storageShares.shareToken, shareToken),
        eq(storageShares.isActive, true),
      )).limit(1);

    if (!share) {
      throw new Error('Share not found or expired');
    }

    if (share.expiresAt && new Date() > share.expiresAt) {
      throw new Error('Share has expired');
    }

    if (share.maxDownloads && share.downloadCount >= share.maxDownloads) {
      throw new Error('Maximum downloads reached');
    }

    if (share.requirePassword) {
      if (!password) {
        throw new Error('Password required');
      }
      if (hashToken(password) !== share.passwordHash) {
        throw new Error('Invalid password');
      }
    }

    await db.update(storageShares)
      .set({ 
        downloadCount: (share.downloadCount || 0) + 1,
        lastAccessedAt: new Date(),
      })
      .where(eq(storageShares.id, share.id));

    if (share.objectId) {
      const [object] = await db.select().from(storageObjects)
        .where(eq(storageObjects.id, share.objectId)).limit(1);
      return { type: 'object', share, item: object };
    } else if (share.folderId) {
      const [folder] = await db.select().from(storageFolders)
        .where(eq(storageFolders.id, share.folderId)).limit(1);
      const contents = await db.select().from(storageObjects)
        .where(and(
          eq(storageObjects.folderId, share.folderId),
          isNull(storageObjects.deletedAt),
        ));
      return { type: 'folder', share, item: folder, contents };
    }

    return { type: 'unknown', share };
  },

  async revokeShare(ctx: StorageServiceContext, shareToken: string) {
    const [share] = await db.select().from(storageShares)
      .where(and(
        eq(storageShares.shareToken, shareToken),
        eq(storageShares.tenantId, ctx.tenantId),
        eq(storageShares.createdByUserId, ctx.userId),
      )).limit(1);

    if (!share) {
      throw new Error('Share not found or not owned by user');
    }

    await db.update(storageShares)
      .set({ isActive: false })
      .where(eq(storageShares.id, share.id));

    await this.logAuditEvent(ctx, 'revoke_share', { shareId: share.id });
  },

  async listMyShares(ctx: StorageServiceContext) {
    const shares = await db.select().from(storageShares)
      .where(and(
        eq(storageShares.tenantId, ctx.tenantId),
        eq(storageShares.createdByUserId, ctx.userId),
        eq(storageShares.isActive, true),
      ))
      .orderBy(desc(storageShares.createdAt));

    return shares;
  },

  // ==================== ACL ====================

  async grantAccess(ctx: StorageServiceContext, input: AclInput) {
    const canShare = await this.checkSharePermission(ctx, input.objectId, input.folderId);
    if (!canShare) {
      throw new Error('You do not have permission to share this item');
    }

    const [acl] = await db.insert(storageAcl).values({
      tenantId: ctx.tenantId,
      objectId: input.objectId,
      folderId: input.folderId,
      subjectUserId: input.subjectUserId,
      subjectTeamId: input.subjectTeamId,
      subjectTenantWide: input.subjectTenantWide,
      role: input.role,
      inherited: false,
      inheritToChildren: true,
      grantedByUserId: ctx.userId,
      expiresAt: input.expiresAt,
    }).returning();

    await this.logAuditEvent(ctx, 'grant_access', { aclId: acl.id, ...input });

    return acl;
  },

  async revokeAccess(ctx: StorageServiceContext, aclId: string) {
    const [acl] = await db.select().from(storageAcl)
      .where(and(
        eq(storageAcl.id, aclId),
        eq(storageAcl.tenantId, ctx.tenantId),
      )).limit(1);

    if (!acl) {
      throw new Error('ACL not found');
    }

    const canRevoke = await this.checkSharePermission(ctx, acl.objectId || undefined, acl.folderId || undefined);
    if (!canRevoke && acl.grantedByUserId !== ctx.userId) {
      throw new Error('You do not have permission to revoke this access');
    }

    await db.delete(storageAcl).where(eq(storageAcl.id, aclId));

    await this.logAuditEvent(ctx, 'revoke_access', { aclId });
  },

  async getObjectAcl(ctx: StorageServiceContext, objectId: string) {
    const acls = await db.select({
      id: storageAcl.id,
      role: storageAcl.role,
      subjectUserId: storageAcl.subjectUserId,
      subjectTeamId: storageAcl.subjectTeamId,
      subjectTenantWide: storageAcl.subjectTenantWide,
      inherited: storageAcl.inherited,
      inheritToChildren: storageAcl.inheritToChildren,
      inheritedFromFolderId: storageAcl.inheritedFromFolderId,
      expiresAt: storageAcl.expiresAt,
      createdAt: storageAcl.createdAt,
      userName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as('userName'),
      userEmail: users.email,
    }).from(storageAcl)
      .leftJoin(users, eq(storageAcl.subjectUserId, users.id))
      .where(and(
        eq(storageAcl.objectId, objectId),
        eq(storageAcl.tenantId, ctx.tenantId),
      ));

    return acls;
  },

  async getFolderAcl(ctx: StorageServiceContext, folderId: string) {
    const [folder] = await db.select().from(storageFolders)
      .where(and(
        eq(storageFolders.id, folderId),
        eq(storageFolders.tenantId, ctx.tenantId),
      )).limit(1);

    if (!folder) {
      throw new Error('Folder not found');
    }

    const directAcls = await db.select({
      id: storageAcl.id,
      role: storageAcl.role,
      subjectUserId: storageAcl.subjectUserId,
      subjectTeamId: storageAcl.subjectTeamId,
      subjectTenantWide: storageAcl.subjectTenantWide,
      inherited: storageAcl.inherited,
      inheritToChildren: storageAcl.inheritToChildren,
      inheritedFromFolderId: storageAcl.inheritedFromFolderId,
      expiresAt: storageAcl.expiresAt,
      createdAt: storageAcl.createdAt,
      userName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as('userName'),
      userEmail: users.email,
    }).from(storageAcl)
      .leftJoin(users, eq(storageAcl.subjectUserId, users.id))
      .where(and(
        eq(storageAcl.folderId, folderId),
        eq(storageAcl.tenantId, ctx.tenantId),
      ));

    const inheritedAcls = await this.getInheritedAclsForFolder(ctx, folder.parentId);

    return {
      direct: directAcls,
      inherited: inheritedAcls,
    };
  },

  async getInheritedAclsForFolder(ctx: StorageServiceContext, parentFolderId: string | null): Promise<any[]> {
    if (!parentFolderId) return [];

    const parentAcls = await db.select({
      id: storageAcl.id,
      role: storageAcl.role,
      subjectUserId: storageAcl.subjectUserId,
      subjectTeamId: storageAcl.subjectTeamId,
      subjectTenantWide: storageAcl.subjectTenantWide,
      inheritToChildren: storageAcl.inheritToChildren,
      folderId: storageAcl.folderId,
      folderName: storageFolders.name,
    }).from(storageAcl)
      .innerJoin(storageFolders, eq(storageAcl.folderId, storageFolders.id))
      .where(and(
        eq(storageAcl.folderId, parentFolderId),
        eq(storageAcl.tenantId, ctx.tenantId),
        eq(storageAcl.inheritToChildren, true),
      ));

    const [parentFolder] = await db.select().from(storageFolders)
      .where(eq(storageFolders.id, parentFolderId)).limit(1);

    const ancestorAcls = parentFolder?.parentId 
      ? await this.getInheritedAclsForFolder(ctx, parentFolder.parentId)
      : [];

    return [...parentAcls, ...ancestorAcls];
  },

  async getEffectivePermissions(ctx: StorageServiceContext, resourceType: 'object' | 'folder', resourceId: string) {
    let folderId: string | null = null;
    let objectId: string | null = null;

    if (resourceType === 'object') {
      objectId = resourceId;
      const [obj] = await db.select().from(storageObjects)
        .where(eq(storageObjects.id, resourceId)).limit(1);
      folderId = obj?.folderId || null;
    } else {
      folderId = resourceId;
    }

    const directAcls = await db.select().from(storageAcl)
      .where(and(
        eq(storageAcl.tenantId, ctx.tenantId),
        objectId ? eq(storageAcl.objectId, objectId) : eq(storageAcl.folderId, folderId!),
        or(
          eq(storageAcl.subjectUserId, ctx.userId),
          eq(storageAcl.subjectTenantWide, true),
        ),
        or(
          isNull(storageAcl.expiresAt),
          gte(storageAcl.expiresAt, new Date()),
        ),
      ));

    let inheritedRole: string | null = null;
    if (folderId) {
      const [folder] = await db.select().from(storageFolders)
        .where(eq(storageFolders.id, folderId)).limit(1);
      
      if (folder?.parentId) {
        const inherited = await this.getInheritedPermissionForUser(ctx, folder.parentId);
        inheritedRole = inherited;
      }
    }

    const roleHierarchy = ['viewer', 'editor', 'owner'];
    const directRoles = directAcls.map(a => a.role);
    const allRoles = inheritedRole ? [...directRoles, inheritedRole] : directRoles;
    
    const highestRole = allRoles.reduce((highest, role) => {
      return roleHierarchy.indexOf(role) > roleHierarchy.indexOf(highest) ? role : highest;
    }, 'viewer');

    const hasAccess = allRoles.length > 0;

    return {
      hasAccess,
      effectiveRole: hasAccess ? highestRole : null,
      canRead: hasAccess,
      canWrite: hasAccess && ['editor', 'owner'].includes(highestRole),
      canShare: hasAccess && highestRole === 'owner',
      directPermissions: directAcls.length,
      inheritedRole,
    };
  },

  async getInheritedPermissionForUser(ctx: StorageServiceContext, folderId: string): Promise<string | null> {
    const acls = await db.select().from(storageAcl)
      .where(and(
        eq(storageAcl.folderId, folderId),
        eq(storageAcl.tenantId, ctx.tenantId),
        eq(storageAcl.inheritToChildren, true),
        or(
          eq(storageAcl.subjectUserId, ctx.userId),
          eq(storageAcl.subjectTenantWide, true),
        ),
        or(
          isNull(storageAcl.expiresAt),
          gte(storageAcl.expiresAt, new Date()),
        ),
      ));

    if (acls.length > 0) {
      const roleHierarchy = ['viewer', 'editor', 'owner'];
      return acls.reduce((highest, acl) => {
        return roleHierarchy.indexOf(acl.role) > roleHierarchy.indexOf(highest) ? acl.role : highest;
      }, 'viewer');
    }

    const [folder] = await db.select().from(storageFolders)
      .where(eq(storageFolders.id, folderId)).limit(1);

    if (folder?.parentId) {
      return this.getInheritedPermissionForUser(ctx, folder.parentId);
    }

    return null;
  },

  async checkSharePermission(ctx: StorageServiceContext, objectId?: string, folderId?: string): Promise<boolean> {
    const resourceType = objectId ? 'object' : 'folder';
    const resourceId = objectId || folderId!;
    const perms = await this.getEffectivePermissions(ctx, resourceType, resourceId);
    return perms.canShare;
  },

  // ==================== BATCH UPLOAD ====================

  async uploadBatch(ctx: StorageServiceContext, files: Express.Multer.File[], options: { folderId?: string; category?: string }) {
    const results: Array<{ success: boolean; fileName: string; objectId?: string; error?: string }> = [];

    let totalSize = 0;
    for (const file of files) {
      totalSize += file.size;
    }

    const quotaCheck = await this.checkQuota(ctx, totalSize);
    if (!quotaCheck.allowed) {
      throw new Error(`Quota exceeded: ${quotaCheck.message}`);
    }

    for (const file of files) {
      try {
        const object = await this.uploadDirect(ctx, {
          fileName: file.originalname,
          mimeType: file.mimetype,
          totalSizeBytes: file.size,
          targetFolderId: options.folderId,
          objectType: 'file',
          category: options.category,
        }, file.buffer);

        results.push({
          success: true,
          fileName: file.originalname,
          objectId: object.id,
        });
      } catch (err: any) {
        results.push({
          success: false,
          fileName: file.originalname,
          error: err.message,
        });
      }
    }

    await this.logAuditEvent(ctx, 'batch_upload', {
      totalFiles: files.length,
      successCount: results.filter(r => r.success).length,
      folderId: options.folderId,
    });

    return results;
  },
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default storageService;
