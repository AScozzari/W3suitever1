import { db } from '../core/db';
import { roles, rolePerms } from './schema/w3suite';
import { eq, and } from 'drizzle-orm';

async function verifyPermissions() {
  const tenantId = '00000000-0000-0000-0000-000000000001'; // Staging
  
  console.log('🔍 Verifying permissions for Staging tenant...\n');
  
  // Check Amministratore
  const adminRole = await db
    .select()
    .from(roles)
    .where(and(
      eq(roles.tenantId, tenantId),
      eq(roles.name, 'Amministratore')
    ))
    .limit(1);
  
  if (adminRole.length > 0) {
    const perms = await db
      .select()
      .from(rolePerms)
      .where(eq(rolePerms.roleId, adminRole[0].id));
    
    console.log('👑 Amministratore role:');
    console.log(`  - Total permissions: ${perms.length}`);
    console.log(`  - Sample permissions:`, perms.slice(0, 5).map(p => p.permission));
  }
  
  // Check Store Manager
  const storeManagerRole = await db
    .select()
    .from(roles)
    .where(and(
      eq(roles.tenantId, tenantId),
      eq(roles.name, 'Store Manager')
    ))
    .limit(1);
  
  if (storeManagerRole.length > 0) {
    const perms = await db
      .select()
      .from(rolePerms)
      .where(eq(rolePerms.roleId, storeManagerRole[0].id));
    
    console.log('\n🏪 Store Manager role:');
    console.log(`  - Total permissions: ${perms.length}`);
    console.log(`  - Sample permissions:`, perms.slice(0, 10).map(p => p.permission));
  }
  
  // Check Operatore
  const operatoreRole = await db
    .select()
    .from(roles)
    .where(and(
      eq(roles.tenantId, tenantId),
      eq(roles.name, 'Operatore')
    ))
    .limit(1);
  
  if (operatoreRole.length > 0) {
    const perms = await db
      .select()
      .from(rolePerms)
      .where(eq(rolePerms.roleId, operatoreRole[0].id));
    
    console.log('\n👤 Operatore role:');
    console.log(`  - Total permissions: ${perms.length}`);
    console.log(`  - Sample permissions:`, perms.map(p => p.permission));
  }
  
  console.log('\n✅ Verification complete!');
}

verifyPermissions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
