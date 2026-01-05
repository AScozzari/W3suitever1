import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
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

router.delete('/folders/:folderId', requirePermission('storage:write'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const { folderId } = req.params;
    
    await storageService.deleteFolder(ctx, folderId);
    res.status(200).json({ success: true, message: 'Folder deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting folder:', error);
    res.status(400).json({ error: error.message });
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
    const { folderId, all } = req.query;
    
    // Only return ALL objects when explicitly requested with all=true
    if (all === 'true') {
      const objects = await storageService.getAllMyDriveObjects(ctx);
      return res.json(objects);
    }
    
    // Default behavior: return objects filtered by folderId (root if not specified)
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
    
    const fileName = req.file.originalname || 'avatar.png';
    const avatar = await storageService.uploadAvatar(ctx, req.params.userId, req.file.buffer, req.file.mimetype, fileName);
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
      // Return response format expected by useUserAvatar hook
      return res.json({ hasAvatar: false, url: null, expiresAt: null, initials: 'U' });
    }
    
    // Add hasAvatar: true for the useUserAvatar hook
    res.json({ 
      ...result, 
      hasAvatar: true,
      initials: req.params.userId.substring(0, 2).toUpperCase()
    });
  } catch (error: any) {
    console.error('Error getting avatar signed URL:', error);
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

router.get('/quotas/summary', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const summary = await storageService.getQuotaSummary(ctx);
    res.json(summary);
  } catch (error: any) {
    console.error('Error getting quota summary:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/quotas/defaults', requirePermission('settings:read'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const defaults = await storageService.getQuotaDefaults(ctx);
    res.json(defaults);
  } catch (error: any) {
    console.error('Error getting quota defaults:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/quotas/defaults', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const { userQuotaBytes, teamQuotaBytes } = req.body;
    const defaults = await storageService.updateQuotaDefaults(ctx, { userQuotaBytes, teamQuotaBytes });
    res.json(defaults);
  } catch (error: any) {
    console.error('Error updating quota defaults:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/quotas/user/:userId', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const { quotaBytes, suspended } = req.body;
    const quota = await storageService.updateUserQuota(ctx, req.params.userId, { quotaBytes, suspended });
    res.json(quota);
  } catch (error: any) {
    console.error('Error updating user quota:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/quotas/team/:teamId', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const { quotaBytes, suspended } = req.body;
    const quota = await storageService.updateTeamQuota(ctx, req.params.teamId, { quotaBytes, suspended });
    res.json(quota);
  } catch (error: any) {
    console.error('Error updating team quota:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== MIGRATION ====================

/**
 * POST /storage/admin/migrate-evergreen-folders
 * Create evergreen folders for all existing users who don't have them
 * Admin only - for migrating existing users to the new storage system
 */
router.post('/admin/migrate-evergreen-folders', requirePermission('settings:write'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const result = await storageService.migrateEvergreenFolders(ctx);
    res.json({
      success: true,
      message: 'Evergreen folders migration completed',
      ...result
    });
  } catch (error: any) {
    console.error('Error migrating evergreen folders:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SHARING ====================

/**
 * POST /storage/share
 * Create a share for an object or folder with optional password protection
 */
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

/**
 * GET /storage/share/:shareToken
 * Access a shared item via token (public endpoint)
 */
router.get('/share/:shareToken', async (req: Request, res: Response) => {
  try {
    const { password } = req.query;
    const share = await storageService.accessShare(req.params.shareToken, password as string | undefined);
    res.json(share);
  } catch (error: any) {
    console.error('Error accessing share:', error);
    res.status(error.message.includes('not found') ? 404 : 403).json({ error: error.message });
  }
});

/**
 * DELETE /storage/share/:shareToken
 * Revoke a share
 */
router.delete('/share/:shareToken', requirePermission('storage:write'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    await storageService.revokeShare(ctx, req.params.shareToken);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error revoking share:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /storage/shares
 * List all shares created by the current user
 */
router.get('/shares', requirePermission('storage:read'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const shares = await storageService.listMyShares(ctx);
    res.json(shares);
  } catch (error: any) {
    console.error('Error listing shares:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ACL / PERMISSIONS ====================

/**
 * POST /storage/acl
 * Grant access to an object or folder
 */
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

/**
 * DELETE /storage/acl/:aclId
 * Revoke access
 */
router.delete('/acl/:aclId', requirePermission('storage:write'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    await storageService.revokeAccess(ctx, req.params.aclId);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error revoking access:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /storage/acl/object/:objectId
 * Get all ACL entries for an object
 */
router.get('/acl/object/:objectId', requirePermission('storage:read'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const acls = await storageService.getObjectAcl(ctx, req.params.objectId);
    res.json(acls);
  } catch (error: any) {
    console.error('Error getting object ACL:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /storage/acl/folder/:folderId
 * Get all ACL entries for a folder (including inherited)
 */
router.get('/acl/folder/:folderId', requirePermission('storage:read'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const acls = await storageService.getFolderAcl(ctx, req.params.folderId);
    res.json(acls);
  } catch (error: any) {
    console.error('Error getting folder ACL:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /storage/permissions/effective/:resourceType/:resourceId
 * Get effective permissions for current user on a resource (resolves inheritance)
 */
router.get('/permissions/effective/:resourceType/:resourceId', requirePermission('storage:read'), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const { resourceType, resourceId } = req.params;
    const permissions = await storageService.getEffectivePermissions(
      ctx, 
      resourceType as 'object' | 'folder', 
      resourceId
    );
    res.json(permissions);
  } catch (error: any) {
    console.error('Error getting effective permissions:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== BATCH UPLOAD ====================

/**
 * POST /storage/upload/batch
 * Upload multiple files at once (drag & drop support)
 */
router.post('/upload/batch', requirePermission('storage:write'), upload.array('files', 20), async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const { folderId, category } = req.body;
    const results = await storageService.uploadBatch(ctx, files, {
      folderId,
      category: category || 'general'
    });

    res.status(201).json({
      success: true,
      uploaded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    });
  } catch (error: any) {
    console.error('Error in batch upload:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
