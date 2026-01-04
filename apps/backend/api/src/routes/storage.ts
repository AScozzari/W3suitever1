import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requirePermission } from '../middleware/tenant';
import { storageService, StorageServiceContext } from '../services/storage.service';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

function getContext(req: Request): StorageServiceContext {
  return {
    tenantId: req.tenant!.id,
    userId: req.user!.id,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers['user-agent'],
  };
}

// ==================== FOLDERS ====================

router.get('/folders', requirePermission('storage:read'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const { parentId, category } = req.query;
    
    const folders = await storageService.getFolders(
      ctx, 
      parentId as string | undefined,
      category as string | undefined
    );
    
    res.json(folders);
  } catch (error: any) {
    console.error('Error getting folders:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/my-drive/folders', requirePermission('storage:read'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const folders = await storageService.getMyDriveFolders(ctx);
    res.json(folders);
  } catch (error: any) {
    console.error('Error getting my drive folders:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/team-drive/:teamId/folders', requirePermission('storage:read'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const folders = await storageService.getTeamDriveFolders(ctx, req.params.teamId);
    res.json(folders);
  } catch (error: any) {
    console.error('Error getting team drive folders:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/folders', requirePermission('storage:write'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const folder = await storageService.createFolder(ctx, req.body);
    res.status(201).json(folder);
  } catch (error: any) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== OBJECTS ====================

router.get('/objects', requirePermission('storage:read'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const { folderId, category } = req.query;
    
    const objects = await storageService.getObjects(
      ctx,
      folderId as string | undefined,
      category as string | undefined
    );
    
    res.json(objects);
  } catch (error: any) {
    console.error('Error getting objects:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/my-drive/objects', requirePermission('storage:read'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const { folderId } = req.query;
    const objects = await storageService.getMyDriveObjects(ctx, folderId as string | undefined);
    res.json(objects);
  } catch (error: any) {
    console.error('Error getting my drive objects:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/shared-with-me', requirePermission('storage:read'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const result = await storageService.getSharedWithMe(ctx);
    res.json(result);
  } catch (error: any) {
    console.error('Error getting shared items:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/trash', requirePermission('storage:read'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const objects = await storageService.getTrash(ctx);
    res.json(objects);
  } catch (error: any) {
    console.error('Error getting trash:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== UPLOAD ====================

router.post('/upload/session', requirePermission('storage:write'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const session = await storageService.createUploadSession(ctx, req.body);
    res.status(201).json(session);
  } catch (error: any) {
    console.error('Error creating upload session:', error);
    res.status(400).json({ error: error.message });
  }
});

router.post('/upload/complete/:uploadToken', requirePermission('storage:write'), upload.single('file'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    const object = await storageService.completeUpload(ctx, req.params.uploadToken, req.file.buffer);
    res.status(201).json(object);
  } catch (error: any) {
    console.error('Error completing upload:', error);
    res.status(400).json({ error: error.message });
  }
});

router.post('/upload/direct', requirePermission('storage:write'), upload.single('file'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    const input = {
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      totalSizeBytes: req.file.size,
      targetFolderId: req.body.folderId,
      objectType: req.body.objectType || 'file',
      category: req.body.category || 'general',
      linkedResourceType: req.body.linkedResourceType,
      linkedResourceId: req.body.linkedResourceId,
    };
    
    const object = await storageService.uploadDirect(ctx, input as any, req.file.buffer);
    res.status(201).json(object);
  } catch (error: any) {
    console.error('Error direct upload:', error);
    res.status(400).json({ error: error.message });
  }
});

// ==================== SIGNED URLs ====================

router.get('/signed-url/:objectId', requirePermission('storage:read'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const result = await storageService.getSignedUrl(ctx, req.params.objectId);
    res.json(result);
  } catch (error: any) {
    console.error('Error getting signed URL:', error);
    res.status(403).json({ error: error.message });
  }
});

router.get('/serve', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token required' });
    }
    
    const result = await storageService.serveByToken(token);
    
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${result.fileName}"`);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(Buffer.from(result.buffer));
  } catch (error: any) {
    console.error('Error serving file:', error);
    res.status(403).json({ error: error.message });
  }
});

// ==================== AVATARS ====================

router.post('/avatars/:userId', requirePermission('storage:write'), upload.single('avatar'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    const avatar = await storageService.uploadAvatar(ctx, req.params.userId, req.file.buffer, req.file.mimetype);
    res.status(201).json(avatar);
  } catch (error: any) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/avatars/:userId/signed-url', requirePermission('storage:read'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const result = await storageService.getAvatarSignedUrl(ctx, req.params.userId);
    
    if (!result) {
      return res.status(404).json({ error: 'Avatar not found' });
    }
    
    res.json(result);
  } catch (error: any) {
    console.error('Error getting avatar signed URL:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SHARING ====================

router.post('/share', requirePermission('storage:write'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const share = await storageService.createShare(ctx, req.body);
    res.status(201).json(share);
  } catch (error: any) {
    console.error('Error creating share:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/acl', requirePermission('storage:write'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const acl = await storageService.grantAccess(ctx, req.body);
    res.status(201).json(acl);
  } catch (error: any) {
    console.error('Error granting access:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/acl/:aclId', requirePermission('storage:write'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const deleted = await storageService.revokeAccess(ctx, req.params.aclId);
    res.json({ deleted: !!deleted });
  } catch (error: any) {
    console.error('Error revoking access:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== TRASH & DELETE ====================

router.post('/objects/:objectId/trash', requirePermission('storage:write'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const object = await storageService.moveToTrash(ctx, req.params.objectId);
    res.json(object);
  } catch (error: any) {
    console.error('Error moving to trash:', error);
    res.status(403).json({ error: error.message });
  }
});

router.post('/objects/:objectId/restore', requirePermission('storage:write'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const object = await storageService.restoreFromTrash(ctx, req.params.objectId);
    res.json(object);
  } catch (error: any) {
    console.error('Error restoring from trash:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/objects/:objectId', requirePermission('storage:delete'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const result = await storageService.permanentDelete(ctx, req.params.objectId);
    res.json(result);
  } catch (error: any) {
    console.error('Error permanently deleting:', error);
    res.status(403).json({ error: error.message });
  }
});

// ==================== RECENT & FAVORITES ====================

router.get('/objects/recent', requirePermission('storage:read'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const limit = parseInt(req.query.limit as string) || 20;
    const objects = await storageService.getRecentObjects(ctx, limit);
    res.json({ objects });
  } catch (error: any) {
    console.error('Error getting recent objects:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/objects/:objectId/favorite', requirePermission('storage:write'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const object = await storageService.toggleFavorite(ctx, req.params.objectId);
    res.json(object);
  } catch (error: any) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/objects/:objectId/signed-url', requirePermission('storage:read'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const result = await storageService.generateSignedUrl(ctx, req.params.objectId);
    res.json(result);
  } catch (error: any) {
    console.error('Error generating signed URL:', error);
    res.status(403).json({ error: error.message });
  }
});

// ==================== QUOTA ====================

router.get('/quota', requirePermission('storage:read'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const quota = await storageService.getQuotaUsage(ctx);
    res.json(quota);
  } catch (error: any) {
    console.error('Error getting quota:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
