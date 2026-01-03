import { Router, Request, Response } from 'express';
import multer, { MulterError } from 'multer';
import { eq, and } from 'drizzle-orm';
import { db } from '../core/db';
import { users, objectAcls, objectMetadata } from '../db/schema/w3suite';
import { requirePermission } from '../middleware/tenant';
import { structuredLogger } from '../core/logger';
import { avatarService } from '../core/objectStorage';
import { Client } from '@replit/object-storage';
import { createHash } from 'crypto';

const router = Router();

function generateStableId(path: string): string {
  return createHash('sha256').update(path).digest('hex').substring(0, 32);
}

const AVATAR_CONSTRAINTS = {
  maxSize: 512 * 1024,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
  recommendedDimensions: { width: 256, height: 256 }
};

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: AVATAR_CONSTRAINTS.maxSize },
  fileFilter: (req, file, cb) => {
    if (AVATAR_CONSTRAINTS.allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato non supportato. Usa JPEG, PNG o WEBP.'));
    }
  }
});

router.get('/constraints', async (req: Request, res: Response) => {
  res.json({
    maxSize: AVATAR_CONSTRAINTS.maxSize,
    maxSizeFormatted: '512 KB',
    allowedTypes: AVATAR_CONSTRAINTS.allowedTypes,
    allowedExtensions: AVATAR_CONSTRAINTS.allowedExtensions,
    recommendedDimensions: AVATAR_CONSTRAINTS.recommendedDimensions
  });
});

router.post(
  '/users/:userId/avatar',
  requirePermission('users.update'),
  upload.single('avatar'),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const tenantId = req.headers['x-tenant-id'] as string;
      const currentUserId = (req as any).user?.id;

      if (!req.file) {
        return res.status(400).json({ error: 'Nessun file caricato' });
      }

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID richiesto' });
      }

      const [targetUser] = await db
        .select({ id: users.id, tenantId: users.tenantId, avatarObjectPath: users.avatarObjectPath })
        .from(users)
        .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
        .limit(1);

      if (!targetUser) {
        return res.status(404).json({ error: 'Utente non trovato' });
      }

      const validation = avatarService.validateAvatarFile(
        req.file.originalname,
        req.file.mimetype,
        req.file.size
      );

      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      const extension = req.file.originalname.split('.').pop()?.toLowerCase() || 'png';
      const objectKey = `avatars/${tenantId}/${userId}.${extension}`;

      try {
        const client = new Client();
        await client.uploadFromBytes(objectKey, req.file.buffer);

        structuredLogger.info('Avatar uploaded to object storage', {
          component: 'avatar-upload',
          metadata: { userId, tenantId, objectKey, size: req.file.size }
        });
      } catch (uploadError) {
        structuredLogger.error('Failed to upload avatar to object storage', {
          component: 'avatar-upload',
          error: uploadError instanceof Error ? uploadError : new Error(String(uploadError)),
          metadata: { userId, tenantId }
        });
        return res.status(500).json({ error: 'Errore durante il caricamento del file' });
      }

      const publicUrl = `/api/avatars/serve/${tenantId}/${userId}.${extension}`;

      await db.update(users)
        .set({ avatarObjectPath: objectKey })
        .where(eq(users.id, userId));

      const stableMetadataId = generateStableId(`metadata:${objectKey}`);
      const stableAclId = generateStableId(`acl:${objectKey}`);
      const now = new Date();

      await db.insert(objectMetadata).values({
        id: stableMetadataId,
        objectPath: objectKey,
        fileName: `${userId}.${extension}`,
        contentType: req.file.mimetype,
        fileSize: req.file.size,
        visibility: 'public',
        uploadedBy: currentUserId || userId,
        tenantId,
        createdAt: now
      }).onConflictDoUpdate({
        target: objectMetadata.objectPath,
        set: {
          fileName: `${userId}.${extension}`,
          contentType: req.file.mimetype,
          fileSize: req.file.size,
          uploadedBy: currentUserId || userId
        }
      });

      await db.insert(objectAcls).values({
        id: stableAclId,
        objectPath: objectKey,
        tenantId,
        visibility: 'public',
        ownerId: userId,
        ownerTenantId: tenantId,
        createdAt: now
      }).onConflictDoUpdate({
        target: objectAcls.objectPath,
        set: {
          ownerId: userId,
          ownerTenantId: tenantId
        }
      });

      structuredLogger.info('Avatar updated successfully', {
        component: 'avatar-upload',
        metadata: { userId, tenantId, objectKey, serveUrl: publicUrl }
      });

      res.json({
        success: true,
        avatarUrl: publicUrl,
        objectPath: objectKey,
        message: 'Avatar caricato con successo'
      });

    } catch (error) {
      structuredLogger.error('Avatar upload failed', {
        component: 'avatar-upload',
        error: error instanceof Error ? error : new Error(String(error))
      });
      res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

router.get('/serve/:tenantId/:filename', async (req: Request, res: Response) => {
  try {
    const { tenantId, filename } = req.params;
    const objectKey = `avatars/${tenantId}/${filename}`;

    const client = new Client();
    const { value: buffer, ok } = await client.downloadAsBytes(objectKey);

    if (!ok || !buffer) {
      return res.status(404).json({ error: 'Avatar non trovato' });
    }

    const extension = filename.split('.').pop()?.toLowerCase();
    const contentType = extension === 'png' ? 'image/png' 
      : extension === 'webp' ? 'image/webp' 
      : 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(buffer));

  } catch (error) {
    structuredLogger.error('Avatar serve failed', {
      component: 'avatar-serve',
      error: error instanceof Error ? error : new Error(String(error))
    });
    res.status(500).json({ error: 'Errore nel recupero avatar' });
  }
});

router.delete(
  '/users/:userId/avatar',
  requirePermission('users.update'),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const tenantId = req.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID richiesto' });
      }

      const [targetUser] = await db
        .select({ id: users.id, avatarObjectPath: users.avatarObjectPath })
        .from(users)
        .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
        .limit(1);

      if (!targetUser) {
        return res.status(404).json({ error: 'Utente non trovato' });
      }

      if (targetUser.avatarObjectPath) {
        try {
          const client = new Client();
          await client.delete(targetUser.avatarObjectPath);
          
          await db.delete(objectMetadata)
            .where(eq(objectMetadata.objectPath, targetUser.avatarObjectPath));
          await db.delete(objectAcls)
            .where(eq(objectAcls.objectPath, targetUser.avatarObjectPath));
        } catch (deleteErr) {
          structuredLogger.warn('Failed to delete avatar from storage', {
            component: 'avatar-delete',
            error: deleteErr instanceof Error ? deleteErr : new Error(String(deleteErr)),
            metadata: { userId, objectPath: targetUser.avatarObjectPath }
          });
        }
      }

      await db.update(users)
        .set({ avatarObjectPath: null })
        .where(eq(users.id, userId));

      structuredLogger.info('Avatar removed', {
        component: 'avatar-delete',
        metadata: { userId, tenantId }
      });

      res.json({ success: true, message: 'Avatar rimosso con successo' });

    } catch (error) {
      structuredLogger.error('Avatar delete failed', {
        component: 'avatar-delete',
        error: error instanceof Error ? error : new Error(String(error))
      });
      res.status(500).json({ error: 'Errore interno del server' });
    }
  }
);

router.get('/users/:userId/avatar', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;

    const [user] = await db
      .select({ 
        avatarObjectPath: users.avatarObjectPath, 
        firstName: users.firstName, 
        lastName: users.lastName,
        tenantId: users.tenantId
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    let avatarUrl: string | null = null;
    if (user.avatarObjectPath) {
      const filename = user.avatarObjectPath.split('/').pop();
      avatarUrl = `/api/avatars/serve/${user.tenantId}/${filename}`;
    }

    res.json({
      hasAvatar: !!user.avatarObjectPath,
      avatarUrl,
      objectPath: user.avatarObjectPath,
      initials: `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || '??'
    });

  } catch (error) {
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

export default router;
