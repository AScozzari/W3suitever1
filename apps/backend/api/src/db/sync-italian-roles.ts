import { db } from '../core/db';
import { roles, rolePerms, userAssignments, tenants } from './schema/w3suite';
import { eq, and, inArray } from 'drizzle-orm';
import { seedRBACForTenant, updateAdminRolesWithAllPermissions } from './seed-rbac';

// Legacy English roles to remove
const LEGACY_ENGLISH_ROLES = [
  'admin',
  'store_manager',
  'finance',
  'marketing',
  'operations',
  'sales',
  'hr',
  'viewer'
];

/**
 * Synchronizes Italian role templates across all tenants
 * - Removes legacy English roles
 * - Creates/updates Italian role templates
 * - Ensures Amministratore has all 223 permissions
 * - Ensures other roles have only *.view permissions
 */
export async function syncItalianRolesToAllTenants() {
  console.log('🇮🇹 Starting Italian roles synchronization for all tenants...');
  
  try {
    // Get all active tenants
    const allTenants = await db
      .select()
      .from(tenants)
      .where(eq(tenants.status, 'active'));
    
    console.log(`📊 Found ${allTenants.length} active tenant(s)`);
    
    for (const tenant of allTenants) {
      console.log(`\n🔄 Processing tenant: ${tenant.name} (${tenant.id})`);
      
      // Step 1: Remove legacy English roles
      await removeLegacyEnglishRoles(tenant.id);
      
      // Step 2: Create/update Italian role templates
      await seedRBACForTenant(tenant.id);
      
      console.log(`  ✅ Tenant ${tenant.name} synchronized`);
    }
    
    // Step 3: Update all Amministratore roles with full permissions
    await updateAdminRolesWithAllPermissions();
    
    console.log('\n✅ Italian roles synchronization completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error during Italian roles synchronization:', error);
    throw error;
  }
}

/**
 * Removes legacy English roles from a tenant
 */
async function removeLegacyEnglishRoles(tenantId: string) {
  console.log(`  🗑️  Removing legacy English roles...`);
  
  try {
    // Find all legacy English roles for this tenant
    const legacyRoles = await db
      .select()
      .from(roles)
      .where(and(
        eq(roles.tenantId, tenantId),
        inArray(roles.name, LEGACY_ENGLISH_ROLES)
      ));
    
    if (legacyRoles.length === 0) {
      console.log(`    ℹ️  No legacy English roles found`);
      return;
    }
    
    const roleIds = legacyRoles.map(r => r.id);
    
    // Delete role permissions
    await db
      .delete(rolePerms)
      .where(inArray(rolePerms.roleId, roleIds));
    
    // Delete user assignments
    await db
      .delete(userAssignments)
      .where(inArray(userAssignments.roleId, roleIds));
    
    // Delete roles
    await db
      .delete(roles)
      .where(inArray(roles.id, roleIds));
    
    console.log(`    ✅ Removed ${legacyRoles.length} legacy role(s): ${legacyRoles.map(r => r.name).join(', ')}`);
  } catch (error) {
    console.error(`    ❌ Error removing legacy roles:`, error);
    throw error;
  }
}

/**
 * Synchronize Italian roles for a single tenant (useful for new tenants)
 */
export async function syncItalianRolesForTenant(tenantId: string) {
  console.log(`🇮🇹 Synchronizing Italian roles for tenant ${tenantId}...`);
  
  try {
    // Remove legacy English roles
    await removeLegacyEnglishRoles(tenantId);
    
    // Create/update Italian role templates
    await seedRBACForTenant(tenantId);
    
    // Update Amministratore with all permissions
    await updateAdminRolesWithAllPermissions();
    
    console.log(`✅ Italian roles synchronized for tenant ${tenantId}`);
    return true;
  } catch (error) {
    console.error('❌ Error synchronizing Italian roles:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  syncItalianRolesToAllTenants()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}
