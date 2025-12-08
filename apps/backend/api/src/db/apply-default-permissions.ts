import { db } from '../core/db';
import { roles, tenants } from './schema/w3suite';
import { eq } from 'drizzle-orm';
import { rbacStorage } from '../core/rbac-storage';
import { getRoleTemplatePermissions } from './italian-role-templates';
import { getAllPermissions } from '../core/permissions/registry';

/**
 * Apply default permissions to all existing Italian roles across all tenants
 * 
 * This script:
 * 1. Finds all active tenants
 * 2. For each tenant, finds all Italian roles
 * 3. Assigns default permissions based on role template
 * 4. Ensures Amministratore has all 215 permissions
 */
export async function applyDefaultPermissionsToAllRoles() {
  console.log('🔐 Applying default permissions to all Italian roles...');
  
  try {
    // Get all active tenants
    const allTenants = await db
      .select()
      .from(tenants)
      .where(eq(tenants.status, 'active'));
    
    console.log(`📊 Found ${allTenants.length} active tenant(s)`);
    
    let totalRolesUpdated = 0;
    
    for (const tenant of allTenants) {
      console.log(`\n🔄 Processing tenant: ${tenant.name} (${tenant.id})`);
      
      // Get all roles for this tenant
      const tenantRoles = await db
        .select()
        .from(roles)
        .where(eq(roles.tenantId, tenant.id));
      
      console.log(`  📋 Found ${tenantRoles.length} role(s)`);
      
      for (const role of tenantRoles) {
        // Get default permissions for this role based on template
        let permissions: string[];
        
        if (role.name === 'Amministratore') {
          // Amministratore gets ALL 215 permissions
          permissions = getAllPermissions();
          console.log(`  👑 ${role.name}: Assigning ALL ${permissions.length} permissions`);
        } else {
          // Get permissions from template
          permissions = getRoleTemplatePermissions(role.name);
          
          if (permissions.length === 0) {
            console.log(`  ⚠️  ${role.name}: No template found, skipping`);
            continue;
          }
          
          console.log(`  ✅ ${role.name}: Assigning ${permissions.length} default permissions`);
        }
        
        // Apply permissions to the role
        await rbacStorage.setRolePermissions(role.id, permissions);
        totalRolesUpdated++;
      }
    }
    
    console.log(`\n✅ Successfully updated ${totalRolesUpdated} role(s) with default permissions`);
    return true;
  } catch (error) {
    console.error('❌ Error applying default permissions:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  applyDefaultPermissionsToAllRoles()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}
