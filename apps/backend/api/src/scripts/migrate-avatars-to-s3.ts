/**
 * 🔄 AVATAR MIGRATION SCRIPT: Filesystem → AWS S3
 * 
 * Migra tutti gli avatar dal filesystem locale a AWS S3.
 * Nuovo path: avatars/{tenant_id}/{user_id}/avatar.{ext}
 * 
 * Eseguire con: npx tsx apps/backend/api/src/scripts/migrate-avatars-to-s3.ts
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { db } from '../core/db';
import { eq, and, isNotNull, isNull, sql } from 'drizzle-orm';
import { users, storageFolders, storageObjects, storageAcl } from '../db/schema/w3suite';
import fs from 'fs';
import path from 'path';

const AVATAR_SOURCE_DIRS = [
  '/var/www/w3suite/apps/frontend/web/dist/avatars',
  './apps/frontend/web/dist/avatars',
  './public/avatars'
];

const S3_CONFIG = {
  region: process.env.AWS_REGION || 'eu-central-1',
  bucket: process.env.AWS_S3_BUCKET || 'w3suite-storage',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
};

interface MigrationResult {
  userId: string;
  userName: string;
  tenantId: string;
  oldPath: string;
  newPath: string;
  status: 'migrated' | 'skipped' | 'error';
  error?: string;
}

async function findAvatarFile(filename: string): Promise<string | null> {
  for (const dir of AVATAR_SOURCE_DIRS) {
    const fullPath = path.join(dir, filename);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
    const filenameOnly = path.basename(filename);
    const altPath = path.join(dir, filenameOnly);
    if (fs.existsSync(altPath)) {
      return altPath;
    }
  }
  return null;
}

async function uploadToS3(
  s3Client: S3Client, 
  localPath: string, 
  s3Key: string
): Promise<boolean> {
  try {
    const fileContent = fs.readFileSync(localPath);
    const ext = path.extname(localPath).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : 
                        ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                        ext === '.webp' ? 'image/webp' : 'image/png';

    await s3Client.send(new PutObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: s3Key,
      Body: fileContent,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
      Metadata: {
        'migrated-from': 'filesystem',
        'migration-date': new Date().toISOString()
      }
    }));

    return true;
  } catch (error) {
    console.error(`Failed to upload ${localPath} to S3:`, error);
    return false;
  }
}

async function checkS3ObjectExists(s3Client: S3Client, key: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: key
    }));
    return true;
  } catch {
    return false;
  }
}

async function getOrCreateAvatarFolder(tenantId: string, userId: string): Promise<{ id: string }> {
  const [existingFolder] = await db.select().from(storageFolders)
    .where(and(
      eq(storageFolders.tenantId, tenantId),
      eq(storageFolders.ownerUserId, userId),
      eq(storageFolders.name, 'Avatar'),
      eq(storageFolders.scopeLevel, 'user'),
      isNull(storageFolders.parentId),
      isNull(storageFolders.deletedAt),
    ))
    .limit(1);
  
  if (existingFolder) return existingFolder;
  
  const [newFolder] = await db.insert(storageFolders).values({
    tenantId,
    ownerUserId: userId,
    name: 'Avatar',
    path: `/users/${userId}/Avatar`,
    scopeLevel: 'user' as const,
    isSystemFolder: true,
    createdByUserId: userId,
  }).returning();
  
  return newFolder;
}

async function registerStorageObject(
  tenantId: string, 
  userId: string, 
  folderId: string, 
  objectKey: string, 
  filename: string,
  sizeBytes: number,
  mimeType: string
): Promise<void> {
  const [existingObject] = await db.select().from(storageObjects)
    .where(and(
      eq(storageObjects.tenantId, tenantId),
      eq(storageObjects.folderId, folderId),
      eq(storageObjects.objectType, 'avatar'),
      isNull(storageObjects.deletedAt),
    ))
    .limit(1);
  
  if (existingObject) {
    await db.update(storageObjects)
      .set({ objectKey, sizeBytes, mimeType })
      .where(eq(storageObjects.id, existingObject.id));
    return;
  }
  
  const [avatarObject] = await db.insert(storageObjects).values({
    tenantId,
    folderId,
    name: filename,
    originalName: filename,
    mimeType,
    sizeBytes,
    objectKey,
    objectType: 'avatar' as const,
    isPublic: true,
    createdByUserId: userId,
  }).returning();
  
  await db.insert(storageAcl).values({
    tenantId,
    objectId: avatarObject.id,
    subjectTenantWide: true,
    role: 'viewer' as const,
    grantedByUserId: userId,
  });
}

async function migrateAvatars(): Promise<void> {
  console.log('🔄 Starting Avatar Migration to AWS S3...\n');

  if (!S3_CONFIG.accessKeyId || !S3_CONFIG.secretAccessKey) {
    console.error('❌ AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
    process.exit(1);
  }

  const s3Client = new S3Client({
    region: S3_CONFIG.region,
    credentials: {
      accessKeyId: S3_CONFIG.accessKeyId,
      secretAccessKey: S3_CONFIG.secretAccessKey
    }
  });

  console.log(`📦 S3 Bucket: ${S3_CONFIG.bucket}`);
  console.log(`🌍 Region: ${S3_CONFIG.region}\n`);

  const usersWithAvatars = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      tenantId: users.tenantId,
      avatarObjectPath: users.avatarObjectPath
    })
    .from(users)
    .where(isNotNull(users.avatarObjectPath));

  console.log(`📊 Found ${usersWithAvatars.length} users with avatars\n`);

  const results: MigrationResult[] = [];
  const uploadedFiles = new Map<string, string>();

  for (const user of usersWithAvatars) {
    const userName = `${user.firstName} ${user.lastName}`;
    console.log(`👤 Processing: ${userName} (${user.id})`);

    if (!user.avatarObjectPath || !user.tenantId) {
      results.push({
        userId: user.id,
        userName,
        tenantId: user.tenantId || 'unknown',
        oldPath: user.avatarObjectPath || '',
        newPath: '',
        status: 'skipped',
        error: 'Missing avatar path or tenant ID'
      });
      continue;
    }

    const filename = path.basename(user.avatarObjectPath);
    const ext = path.extname(filename) || '.png';
    const newS3Key = `avatars/${user.tenantId}/${user.id}/avatar${ext}`;

    if (uploadedFiles.has(filename)) {
      const existingS3Key = uploadedFiles.get(filename)!;
      const copyKey = `avatars/${user.tenantId}/${user.id}/avatar${ext}`;
      
      try {
        const localPath = await findAvatarFile(filename);
        if (localPath) {
          const uploaded = await uploadToS3(s3Client, localPath, copyKey);
          if (uploaded) {
            await db.update(users)
              .set({ avatarObjectPath: copyKey })
              .where(eq(users.id, user.id));
            
            results.push({
              userId: user.id,
              userName,
              tenantId: user.tenantId,
              oldPath: user.avatarObjectPath,
              newPath: copyKey,
              status: 'migrated'
            });
            console.log(`   ✅ Migrated (copy from ${filename})`);
            continue;
          }
        }
      } catch (error) {
        console.log(`   ⚠️ Copy failed, uploading new`);
      }
    }

    const localPath = await findAvatarFile(user.avatarObjectPath);
    
    if (!localPath) {
      const filenameOnly = path.basename(user.avatarObjectPath);
      const altLocalPath = await findAvatarFile(filenameOnly);
      
      if (!altLocalPath) {
        results.push({
          userId: user.id,
          userName,
          tenantId: user.tenantId,
          oldPath: user.avatarObjectPath,
          newPath: '',
          status: 'error',
          error: `File not found: ${user.avatarObjectPath}`
        });
        console.log(`   ❌ File not found: ${user.avatarObjectPath}`);
        continue;
      }
    }

    const finalLocalPath = localPath || await findAvatarFile(path.basename(user.avatarObjectPath));
    
    if (!finalLocalPath) {
      results.push({
        userId: user.id,
        userName,
        tenantId: user.tenantId,
        oldPath: user.avatarObjectPath,
        newPath: '',
        status: 'error',
        error: 'File not found after retry'
      });
      continue;
    }

    const alreadyExists = await checkS3ObjectExists(s3Client, newS3Key);
    if (alreadyExists) {
      const fileStats = finalLocalPath ? fs.statSync(finalLocalPath) : { size: 0 };
      const ext = path.extname(filename).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : 
                       ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                       ext === '.webp' ? 'image/webp' : 'image/png';
      
      const folder = await getOrCreateAvatarFolder(user.tenantId, user.id);
      await registerStorageObject(
        user.tenantId, 
        user.id, 
        folder.id, 
        newS3Key, 
        filename,
        fileStats.size,
        mimeType
      );
      
      await db.update(users)
        .set({ avatarObjectPath: newS3Key })
        .where(eq(users.id, user.id));
      
      results.push({
        userId: user.id,
        userName,
        tenantId: user.tenantId,
        oldPath: user.avatarObjectPath,
        newPath: newS3Key,
        status: 'migrated'
      });
      console.log(`   ✅ Already exists on S3, registered in DB`);
      continue;
    }

    const uploaded = await uploadToS3(s3Client, finalLocalPath, newS3Key);
    
    if (uploaded) {
      const fileStats = fs.statSync(finalLocalPath);
      const ext = path.extname(finalLocalPath).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : 
                       ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                       ext === '.webp' ? 'image/webp' : 'image/png';
      
      const folder = await getOrCreateAvatarFolder(user.tenantId, user.id);
      await registerStorageObject(
        user.tenantId, 
        user.id, 
        folder.id, 
        newS3Key, 
        filename,
        fileStats.size,
        mimeType
      );
      
      await db.update(users)
        .set({ avatarObjectPath: newS3Key })
        .where(eq(users.id, user.id));
      
      uploadedFiles.set(filename, newS3Key);
      
      results.push({
        userId: user.id,
        userName,
        tenantId: user.tenantId,
        oldPath: user.avatarObjectPath,
        newPath: newS3Key,
        status: 'migrated'
      });
      console.log(`   ✅ Uploaded to S3 and registered in DB: ${newS3Key}`);
    } else {
      results.push({
        userId: user.id,
        userName,
        tenantId: user.tenantId,
        oldPath: user.avatarObjectPath,
        newPath: newS3Key,
        status: 'error',
        error: 'S3 upload failed'
      });
      console.log(`   ❌ S3 upload failed`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  
  const migrated = results.filter(r => r.status === 'migrated').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const errors = results.filter(r => r.status === 'error').length;
  
  console.log(`✅ Migrated: ${migrated}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📁 Total: ${results.length}`);
  
  if (errors > 0) {
    console.log('\n❌ ERRORS:');
    results.filter(r => r.status === 'error').forEach(r => {
      console.log(`   - ${r.userName}: ${r.error}`);
    });
  }
  
  console.log('\n✅ Migration completed!');
}

migrateAvatars()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
