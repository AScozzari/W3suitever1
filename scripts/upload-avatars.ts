import { Client } from '@replit/object-storage';
import * as fs from 'fs';
import * as path from 'path';
import pg from 'pg';

const { Pool } = pg;

const STAGING_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || 'replit-objstore-b368c0d0-002a-406a-a949-7390d88e61cc';

const avatarMappings = [
  { userId: 'admin-user', file: 'developer_cartoon_avatar.png' },
  { userId: 'user-002', file: 'manager_cartoon_avatar.png' },
  { userId: 'user-003', file: 'sales_rep_cartoon_avatar.png' },
  { userId: 'user-004', file: 'creative_designer_cartoon_avatar.png' },
  { userId: 'user-005', file: 'manager_cartoon_avatar.png' },
  { userId: 'user-007', file: 'support_specialist_cartoon_avatar.png' },
  { userId: 'user-008', file: 'sales_rep_cartoon_avatar.png' },
  { userId: 'user-009', file: 'creative_designer_cartoon_avatar.png' },
  { userId: 'user-013', file: 'manager_cartoon_avatar.png' },
  { userId: 'user-014', file: 'support_specialist_cartoon_avatar.png' },
];

async function main() {
  console.log('🚀 Starting avatar upload to Object Storage...');
  console.log(`📦 Using bucket: ${BUCKET_ID}`);
  
  const client = new Client({ bucketId: BUCKET_ID });
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  for (const mapping of avatarMappings) {
    const localPath = path.join('attached_assets/generated_images', mapping.file);
    
    if (!fs.existsSync(localPath)) {
      console.log(`⚠️ File not found: ${localPath}`);
      continue;
    }
    
    const buffer = fs.readFileSync(localPath);
    const objectPath = `avatars/${STAGING_TENANT_ID}/${mapping.userId}.png`;
    
    try {
      await client.uploadFromBytes(objectPath, buffer);
      console.log(`✅ Uploaded: ${objectPath}`);
      
      await pool.query(
        `UPDATE w3suite.users 
         SET avatar_object_path = $1, 
             avatar_visibility = 'public',
             avatar_uploaded_at = NOW()
         WHERE id = $2`,
        [objectPath, mapping.userId]
      );
      console.log(`   📝 Updated DB for user ${mapping.userId}`);
      
    } catch (error) {
      console.error(`❌ Error uploading ${mapping.file}:`, error);
    }
  }
  
  await pool.end();
  console.log('✨ Avatar upload complete!');
}

main().catch(console.error);
