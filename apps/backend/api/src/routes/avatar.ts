import { Router, Request, Response } from 'express';
import multer from 'multer';
import { eq, and } from 'drizzle-orm';
import { db } from '../core/db';
import { users } from '../db/schema/w3suite';
import { requirePermission } from '../middleware/tenant';
import { structuredLogger } from '../core/logger';
import { avatarService } from '../core/objectStorage';
import { Client } from '@replit/object-storage';
import * as fs from 'fs';
import * as path from 'path';
import { storageService, StorageServiceContext } from '../services/storage.service';

const router = Router();

// RUNTIME check for Object Storage (use bracket syntax to avoid esbuild inlining)
function hasObjectStorage(): boolean {
  const envKey = 'DEFAULT_OBJECT_STORAGE_BUCKET_ID';
  const bucketId = process.env[envKey];
  return Boolean(bucketId && bucketId.length > 0);
}

// Local avatar directory for VPS (fallback)
function getLocalAvatarDir(): string {
  const envKey = 'LOCAL_AVATAR_DIR';
  return process.env[envKey] || '/var/www/w3suite/public/avatars';
}

// Helper to get Object Storage client with bucket ID (ONLY call if hasObjectStorage() is true)
function getStorageClient(): Client | null {
  const envKey = 'DEFAULT_OBJECT_STORAGE_BUCKET_ID';
  const bucketId = process.env[envKey];
  if (bucketId && bucketId.length > 0) {
    return new Client({ bucketId });
  }
  return null;
}

// Check if running on Replit (has internal Object Storage service)
function isReplitEnvironment(): boolean {
  // Replit sets REPL_ID and REPLIT_DB_URL in its environment
  const replId = process.env['REPL_ID'];
  const replitDb = process.env['REPLIT_DB_URL'];
  return Boolean(replId || replitDb);
}

// Helper to download avatar (Object Storage or local file) - returns buffer and content type
async function downloadAvatarBytes(filename: string): Promise<{ ok: boolean; buffer?: Buffer; isSvg?: boolean }> {
  // ONLY try Object Storage on Replit (has internal service on port 1106)
  // VPS doesn't have this service, so skip entirely to avoid ECONNREFUSED
  if (isReplitEnvironment() && hasObjectStorage()) {
    try {
      const client = getStorageClient();
      if (client) {
        const paths = [`avatars/${filename}`, filename];
        for (const objectKey of paths) {
          // First try downloadAsText (works for SVG files which are common for generated avatars)
          const textResult = await client.downloadAsText(objectKey);
          if (textResult.ok && textResult.value && textResult.value.length > 10) {
            const content = textResult.value;
            const isSvg = content.startsWith('<svg') || content.includes('xmlns="http://www.w3.org/2000/svg"');
            if (isSvg) {
              return { ok: true, buffer: Buffer.from(content, 'utf-8'), isSvg: true };
            }
          }
          
          // If not SVG text, try binary download for real PNG/JPG/WEBP
          const bytesResult = await client.downloadAsBytes(objectKey);
          if (bytesResult.ok && bytesResult.value && bytesResult.value.length > 10) {
            const buffer = Buffer.from(bytesResult.value);
            return { ok: true, buffer, isSvg: false };
          }
        }
      }
    } catch (err) {
      structuredLogger.warn('Object Storage failed, trying local files', {
        component: 'avatar-fallback',
        metadata: { filename }
      });
    }
  }
  
  // Local file system (VPS mode or Object Storage failure)
  const localDir = getLocalAvatarDir();
  const filePath = path.join(localDir, filename);
  
  try {
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      const isSvg = buffer.toString('utf-8', 0, 100).includes('<svg');
      return { ok: true, buffer, isSvg };
    }
  } catch (err) {
    structuredLogger.error('Local avatar read failed', {
      component: 'avatar-local',
      error: err instanceof Error ? err : new Error(String(err)),
      metadata: { filePath }
    });
  }
  return { ok: false };
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
        .select({ id: users.id, tenantId: users.tenantId })
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

      const ctx: StorageServiceContext = {
        tenantId,
        userId: currentUserId || userId,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
      };

      const avatarObject = await storageService.uploadAvatar(
        ctx,
        userId,
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      );

      structuredLogger.info('Avatar uploaded via unified storage', {
        component: 'avatar-upload',
        metadata: { userId, tenantId, objectId: avatarObject.id, storageKey: avatarObject.storageKey }
      });

      const signedUrl = await storageService.getAvatarSignedUrl(ctx, userId);

      res.json({
        success: true,
        avatarUrl: signedUrl?.url || null,
        objectId: avatarObject.id,
        storageKey: avatarObject.storageKey,
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
    
    // Build the full path including tenant ID for proper isolation
    const fullPath = `${tenantId}/${filename}`;
    
    // Use helper that works with both Object Storage (Replit) and local files (VPS)
    const result = await downloadAvatarBytes(fullPath);

    if (!result.ok || !result.buffer) {
      // Fallback: try without tenant prefix for legacy paths
      const legacyResult = await downloadAvatarBytes(filename);
      if (!legacyResult.ok || !legacyResult.buffer) {
        return res.status(404).json({ error: 'Avatar non trovato' });
      }
      const contentType = legacyResult.isSvg ? 'image/svg+xml' 
        : filename.endsWith('.png') ? 'image/png' 
        : filename.endsWith('.webp') ? 'image/webp' 
        : 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(legacyResult.buffer);
    }

    // Determine content type - SVG if detected, otherwise by extension
    const contentType = result.isSvg ? 'image/svg+xml' 
      : filename.endsWith('.png') ? 'image/png' 
      : filename.endsWith('.webp') ? 'image/webp' 
      : 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(result.buffer);

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
      const currentUserId = (req as any).user?.id;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID richiesto' });
      }

      const [targetUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, userId), eq(users.tenantId, tenantId)))
        .limit(1);

      if (!targetUser) {
        return res.status(404).json({ error: 'Utente non trovato' });
      }

      const ctx: StorageServiceContext = {
        tenantId,
        userId: currentUserId || userId,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
      };

      await storageService.deleteAvatar(ctx, userId);

      structuredLogger.info('Avatar removed via unified storage', {
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
      // Use tenant-scoped serve endpoint for RLS compliance
      // Format: /api/avatars/serve/{tenantId}/{filename}
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

// ==================== ENTERPRISE STORAGE SIGNED URL ENDPOINTS ====================

// Get signed URL for avatar (NEW - secure access via temporary signed URL)
router.get('/users/:userId/signed-url', requirePermission('users.read'), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] as string;
    const currentUserId = (req as any).user?.id;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID richiesto' });
    }

    const ctx: StorageServiceContext = {
      tenantId,
      userId: currentUserId,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    const result = await storageService.getAvatarSignedUrl(ctx, userId);

    if (!result) {
      // No avatar in new storage system, check legacy
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

      if (user.avatarObjectPath) {
        // Legacy avatar exists - return legacy URL (will be migrated later)
        const filename = user.avatarObjectPath.split('/').pop();
        return res.json({
          hasAvatar: true,
          url: `/api/avatars/serve/${user.tenantId}/${filename}`,
          isLegacy: true,
          expiresAt: null,
          initials: `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || '??'
        });
      }

      // No avatar at all
      return res.json({
        hasAvatar: false,
        url: null,
        initials: `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || '??'
      });
    }

    // Get user for initials
    const [user] = await db
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    res.json({
      hasAvatar: true,
      url: result.url,
      expiresAt: result.expiresAt,
      mimeType: result.mimeType,
      isLegacy: false,
      initials: user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : '??'
    });

  } catch (error) {
    structuredLogger.error('Avatar signed URL failed', {
      component: 'avatar-signed-url',
      error: error instanceof Error ? error : new Error(String(error))
    });
    res.status(500).json({ error: 'Errore nel recupero avatar' });
  }
});

// Upload avatar using new storage service (optional - can coexist with legacy)
router.post('/users/:userId/avatar-v2', requirePermission('users.update'), upload.single('avatar'), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const tenantId = req.tenant?.id || req.headers['x-tenant-id'] as string;
    const currentUserId = (req as any).user?.id;

    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID richiesto' });
    }

    const ctx: StorageServiceContext = {
      tenantId,
      userId: currentUserId,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    const storageObject = await storageService.uploadAvatar(ctx, userId, req.file.buffer, req.file.mimetype);

    // Get signed URL for the newly uploaded avatar
    const signedUrl = await storageService.getAvatarSignedUrl(ctx, userId);

    structuredLogger.info('Avatar uploaded via new storage service', {
      component: 'avatar-v2-upload',
      metadata: { userId, tenantId, objectId: storageObject.id }
    });

    res.status(201).json({
      success: true,
      objectId: storageObject.id,
      signedUrl: signedUrl?.url,
      expiresAt: signedUrl?.expiresAt,
      message: 'Avatar caricato con successo'
    });

  } catch (error: any) {
    structuredLogger.error('Avatar v2 upload failed', {
      component: 'avatar-v2-upload',
      error: error instanceof Error ? error : new Error(String(error))
    });
    res.status(500).json({ error: error.message || 'Errore durante il caricamento' });
  }
});

// Serve avatar by direct object path (supports legacy paths like /avatars/filename.png)
router.get('/serve-path/:objectPath(*)', async (req: Request, res: Response) => {
  try {
    const objectPath = decodeURIComponent(req.params.objectPath);
    const filename = objectPath.split('/').pop() || objectPath;
    
    // Use the unified download helper that works on both Replit and VPS
    const result = await downloadAvatarBytes(filename);

    if (!result.ok || !result.buffer) {
      return res.status(404).json({ error: 'Avatar non trovato' });
    }

    const extension = objectPath.split('.').pop()?.toLowerCase();
    const contentType = extension === 'png' ? 'image/png' 
      : extension === 'webp' ? 'image/webp' 
      : 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(result.buffer);

  } catch (error) {
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

export default router;
