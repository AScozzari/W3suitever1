import { structuredLogger } from '../core/logger';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { db } from '../core/db';
import { objectMetadata, objectAcls } from '../db/schema/w3suite';
import { eq, and } from 'drizzle-orm';

const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
const PUBLIC_PATH = process.env.PUBLIC_OBJECT_SEARCH_PATHS;
const PRIVATE_DIR = process.env.PRIVATE_OBJECT_DIR;

export const chatFileUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().refine(
    (val) => {
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip',
        'text/plain',
        'text/csv',
        'video/mp4',
        'video/quicktime',
        'audio/mpeg',
        'audio/wav'
      ];
      return allowedTypes.includes(val);
    },
    { message: 'Tipo file non supportato. Supportati: immagini, PDF, documenti Office, ZIP, testo, audio, video' }
  ),
  fileSize: z.number().min(1).max(10 * 1024 * 1024) // Max 10MB for chat files
});

export type ChatFileUpload = z.infer<typeof chatFileUploadSchema>;

export interface ChatAttachmentMetadata {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  uploadedBy: string;
  tenantId: string;
  channelId: string;
  messageId?: string;
  objectPath: string;
  publicUrl?: string;
  createdAt: string;
}

export interface ChatUploadResponse {
  uploadUrl: string;
  objectPath: string;
  expiresAt: string;
  metadata: ChatAttachmentMetadata;
}

export class ChatAttachmentService {
  private publicBasePath: string;
  private privateBasePath: string;

  constructor() {
    this.publicBasePath = PUBLIC_PATH || '';
    this.privateBasePath = PRIVATE_DIR || '';
  }

  async generateUploadUrl(
    config: ChatFileUpload,
    userId: string,
    tenantId: string,
    channelId: string,
    messageId?: string
  ): Promise<ChatUploadResponse> {
    try {
      // Generate unique object path for chat attachment
      const fileExtension = path.extname(config.fileName);
      const uniqueFileName = `${uuidv4()}${fileExtension}`;
      
      // Chat files are stored in private directory with source categorization
      const objectPath = `${this.privateBasePath}/chat/${tenantId}/${channelId}/${uniqueFileName}`;

      // Create metadata with source='chat'
      const metadata: ChatAttachmentMetadata = {
        id: uuidv4(),
        fileName: config.fileName,
        contentType: config.contentType,
        fileSize: config.fileSize,
        uploadedBy: userId,
        tenantId,
        channelId,
        messageId,
        objectPath,
        createdAt: new Date().toISOString()
      };

      // Store metadata in database with source='chat'
      await db.insert(objectMetadata).values({
        id: metadata.id,
        fileName: metadata.fileName,
        contentType: metadata.contentType,
        fileSize: metadata.fileSize,
        visibility: 'private',
        uploadedBy: userId,
        tenantId,
        objectPath,
        source: 'chat',
        metadata: {
          channelId,
          messageId: messageId || null
        }
      });

      // Create ACL for private access
      await db.insert(objectAcls).values({
        id: uuidv4(),
        objectPath,
        userId,
        tenantId,
        permission: 'write',
        metadata: {
          source: 'chat',
          channelId,
          messageId: messageId || null
        }
      });

      const uploadUrl = `/api/chat/upload`;
      const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

      structuredLogger.info('Generated chat attachment upload URL', {
        component: 'chat-attachment',
        metadata: {
          objectPath,
          userId,
          tenantId,
          channelId,
          fileName: config.fileName,
          contentType: config.contentType,
          source: 'chat'
        }
      });

      return {
        uploadUrl,
        objectPath,
        expiresAt,
        metadata
      };
    } catch (error) {
      structuredLogger.error('Failed to generate chat upload URL', {
        component: 'chat-attachment',
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          userId,
          tenantId,
          channelId,
          fileName: config.fileName
        }
      });
      throw new Error('Errore nella generazione URL di upload');
    }
  }

  async getAttachmentMetadata(objectPath: string, tenantId: string): Promise<ChatAttachmentMetadata | null> {
    try {
      const metadataRecord = await db.select()
        .from(objectMetadata)
        .where(and(
          eq(objectMetadata.objectPath, objectPath),
          eq(objectMetadata.tenantId, tenantId),
          eq(objectMetadata.source, 'chat')
        ))
        .limit(1);

      if (!metadataRecord || metadataRecord.length === 0) {
        return null;
      }

      const record = metadataRecord[0];

      return {
        id: record.id,
        fileName: record.fileName,
        contentType: record.contentType,
        fileSize: record.fileSize,
        uploadedBy: record.uploadedBy,
        tenantId: record.tenantId,
        channelId: record.metadata?.channelId || '',
        messageId: record.metadata?.messageId || undefined,
        objectPath,
        createdAt: record.createdAt?.toISOString() || new Date().toISOString()
      };
    } catch (error) {
      structuredLogger.error('Failed to get chat attachment metadata', {
        component: 'chat-attachment',
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: { objectPath, tenantId }
      });
      return null;
    }
  }

  async deleteAttachment(objectPath: string, userId: string, tenantId: string): Promise<boolean> {
    try {
      // Verify user owns the attachment
      const aclRecord = await db.select()
        .from(objectAcls)
        .where(and(
          eq(objectAcls.objectPath, objectPath),
          eq(objectAcls.userId, userId),
          eq(objectAcls.tenantId, tenantId)
        ))
        .limit(1);

      if (!aclRecord || aclRecord.length === 0) {
        structuredLogger.warn('Unauthorized deletion attempt', {
          component: 'chat-attachment',
          metadata: { objectPath, userId, tenantId }
        });
        throw new Error('Access denied: insufficient permissions for deletion');
      }

      // Delete metadata and ACL
      await db.delete(objectMetadata).where(eq(objectMetadata.objectPath, objectPath));
      await db.delete(objectAcls).where(eq(objectAcls.objectPath, objectPath));

      structuredLogger.info('Chat attachment deleted', {
        component: 'chat-attachment',
        metadata: { objectPath, userId, tenantId }
      });

      return true;
    } catch (error) {
      structuredLogger.error('Failed to delete chat attachment', {
        component: 'chat-attachment',
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: { objectPath, userId, tenantId }
      });
      return false;
    }
  }

  getPublicUrl(objectPath: string): string {
    const baseUrl = process.env.REPLIT_OBJECT_STORE_PUBLIC_URL || `https://storage.replit.com`;
    return `${baseUrl}${objectPath}`;
  }
}

export const chatAttachmentService = new ChatAttachmentService();
