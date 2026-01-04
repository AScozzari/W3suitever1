import { db } from '../core/db';
import { eq, and, or, sql, desc, isNull, gte, lte } from 'drizzle-orm';
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

function getObjectStorageClient(): Client {
  if (!objectStorageClient) {
    objectStorageClient = new Client();
  }
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
    const folders = await db.select().from(storageFolders)
      .where(and(
        eq(storageFolders.tenantId, ctx.tenantId),
        eq(storageFolders.ownerUserId, ctx.userId),
        eq(storageFolders.scopeLevel, 'user'),
        isNull(storageFolders.deletedAt),
        isNull(storageFolders.parentId),
      ))
      .orderBy(storageFolders.name);

    return folders;
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

      const client = getObjectStorageClient();
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

    const client = getObjectStorageClient();
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

    const client = getObjectStorageClient();
    const { value: fileBuffer } = await client.downloadAsBytes(object.objectKey);

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

    return objects;
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
      const client = getObjectStorageClient();
      await client.delete(object.objectKey);
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

  async uploadAvatar(ctx: StorageServiceContext, userId: string, fileBuffer: Buffer, mimeType: string) {
    await this.ensureSystemFolders(ctx);

    const extension = mimeType.split('/')[1] || 'png';
    const objectKey = `${ctx.tenantId}/avatars/${userId}/avatar.${extension}`;

    const existingAvatar = await db.select().from(storageObjects)
      .where(and(
        eq(storageObjects.tenantId, ctx.tenantId),
        eq(storageObjects.linkedResourceType, 'user_avatar'),
        eq(storageObjects.linkedResourceId, userId),
      )).limit(1);

    const client = getObjectStorageClient();
    await client.uploadFromBytes(objectKey, fileBuffer);

    const contentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    if (existingAvatar.length > 0) {
      try {
        await client.delete(existingAvatar[0].objectKey);
      } catch (e) {}

      const [updated] = await db.update(storageObjects)
        .set({
          objectKey,
          sizeBytes: fileBuffer.length,
          contentHash,
          mimeType,
          updatedAt: new Date(),
        })
        .where(eq(storageObjects.id, existingAvatar[0].id))
        .returning();

      await this.logAuditEvent(ctx, 'update_avatar', { objectId: updated.id, userId });
      return updated;
    } else {
      const [newAvatar] = await db.insert(storageObjects).values({
        tenantId: ctx.tenantId,
        name: `avatar.${extension}`,
        originalName: `avatar.${extension}`,
        mimeType,
        sizeBytes: fileBuffer.length,
        extension,
        objectKey,
        objectType: 'avatar',
        category: 'avatars',
        scopeLevel: 'user',
        ownerUserId: userId,
        visibility: 'private',
        contentHash,
        linkedResourceType: 'user_avatar',
        linkedResourceId: userId,
        createdByUserId: ctx.userId,
      }).returning();

      await db.insert(storageAcl).values({
        tenantId: ctx.tenantId,
        objectId: newAvatar.id,
        subjectTenantWide: true,
        role: 'viewer',
        grantedByUserId: ctx.userId,
      });

      await this.logAuditEvent(ctx, 'upload_avatar', { objectId: newAvatar.id, userId });
      return newAvatar;
    }
  },

  async getAvatarSignedUrl(ctx: StorageServiceContext, userId: string) {
    const [avatar] = await db.select().from(storageObjects)
      .where(and(
        eq(storageObjects.tenantId, ctx.tenantId),
        eq(storageObjects.linkedResourceType, 'user_avatar'),
        eq(storageObjects.linkedResourceId, userId),
        isNull(storageObjects.deletedAt),
      )).limit(1);

    if (!avatar) {
      return null;
    }

    return this.getSignedUrl(ctx, avatar.id);
  },

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
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default storageService;
