import { db } from '../core/db';
import { roles, rolePerms, userAssignments, tenants } from './schema/w3suite';
import { eq, and } from 'drizzle-orm';
import { rbacStorage } from '../core/rbac-storage';
import { PERMISSIONS, getAllPermissions } from '../core/permissions/registry';

// Define default Italian roles template (identical across all tenants)
const DEFAULT_ROLES = [
  {
    name: 'Amministratore',
    description: 'Accesso completo a tutte le funzionalità',
    isSystem: true,
    permissions: getAllPermissions() // All 223 permissions from registry
  },
  {
    name: 'Store Manager',
    description: 'Gestione completa del punto vendita',
    isSystem: true,
    permissions: [
      '*.view',
      'dashboard.view',
      'reports.*.view'
    ]
  },
  {
    name: 'Area Manager',
    description: 'Supervisione di più punti vendita',
    isSystem: true,
    permissions: [
      '*.view',
      'dashboard.view',
      'reports.*.view'
    ]
  },
  {
    name: 'Finance',
    description: 'Gestione finanziaria e reportistica',
    isSystem: true,
    permissions: [
      '*.view',
      'dashboard.view',
      'reports.*.view'
    ]
  },
  {
    name: 'HR Manager',
    description: 'Gestione risorse umane',
    isSystem: true,
    permissions: [
      '*.view',
      'dashboard.view',
      'reports.*.view'
    ]
  },
  {
    name: 'Marketing',
    description: 'Gestione campagne e promozioni',
    isSystem: true,
    permissions: [
      '*.view',
      'dashboard.view',
      'reports.*.view'
    ]
  },
  {
    name: 'Sales Agent',
    description: 'Agente di vendita',
    isSystem: true,
    permissions: [
      '*.view',
      'dashboard.view',
      'reports.*.view'
    ]
  },
  {
    name: 'Cassiere',
    description: 'Gestione cassa e vendite',
    isSystem: false,
    permissions: [
      '*.view',
      'dashboard.view',
      'reports.*.view'
    ]
  },
  {
    name: 'Magazziniere',
    description: 'Gestione magazzino e inventario',
    isSystem: false,
    permissions: [
      '*.view',
      'dashboard.view',
      'reports.*.view'
    ]
  },
  {
    name: 'Operatore',
    description: 'Accesso limitato alle operazioni base',
    isSystem: false,
    permissions: [
      '*.view',
      'dashboard.view',
      'reports.*.view'
    ]
  }
];

export async function seedRBACForTenant(tenantId: string) {
  console.log(`🔐 Seeding RBAC roles for tenant ${tenantId}...`);
  
  try {
    // Create each default role
    for (const roleData of DEFAULT_ROLES) {
      // Check if role already exists
      const existingRoles = await db
        .select()
        .from(roles)
        .where(and(
          eq(roles.tenantId, tenantId),
          eq(roles.name, roleData.name)
        ))
        .limit(1);
      
      let roleId: string;
      
      if (existingRoles.length === 0) {
        // Create the role
        const newRole = await rbacStorage.createRole(tenantId, {
          name: roleData.name,
          description: roleData.description,
          isSystem: roleData.isSystem
        });
        roleId = newRole.id;
        console.log(`  ✅ Created role: ${roleData.name}`);
      } else {
        roleId = existingRoles[0].id;
        console.log(`  ⏭️  Role already exists: ${roleData.name}`);
      }
      
      // Set permissions for the role
      await rbacStorage.setRolePermissions(roleId, roleData.permissions);
      console.log(`    📝 Set ${roleData.permissions.length} permissions for ${roleData.name}`);
    }
    
    console.log(`✅ RBAC seeding completed for tenant ${tenantId}`);
    return true;
  } catch (error) {
    console.error('❌ Error seeding RBAC:', error);
    throw error;
  }
}

export async function seedRBACForAllTenants() {
  console.log('🔐 Starting RBAC seeding for all tenants...');
  
  try {
    // Get all active tenants
    const allTenants = await db
      .select()
      .from(tenants)
      .where(eq(tenants.status, 'active'));
    
    console.log(`Found ${allTenants.length} active tenants`);
    
    // Seed RBAC for each tenant
    for (const tenant of allTenants) {
      await seedRBACForTenant(tenant.id);
    }
    
    console.log('✅ RBAC seeding completed for all tenants');
    return true;
  } catch (error) {
    console.error('❌ Error seeding RBAC for all tenants:', error);
    throw error;
  }
}

// Function to assign admin role to a user (prefers "Amministratore", fallback to "admin")
export async function assignAdminRole(userId: string, tenantId: string) {
  try {
    // Try to find "Amministratore" role first (new Italian standard)
    let adminRoles = await db
      .select()
      .from(roles)
      .where(and(
        eq(roles.tenantId, tenantId),
        eq(roles.name, 'Amministratore')
      ))
      .limit(1);
    
    // Fallback to legacy "admin" role if Amministratore not found
    if (adminRoles.length === 0) {
      adminRoles = await db
        .select()
        .from(roles)
        .where(and(
          eq(roles.tenantId, tenantId),
          eq(roles.name, 'admin')
        ))
        .limit(1);
    }
    
    if (adminRoles.length === 0) {
      console.error('Admin/Amministratore role not found for tenant');
      return false;
    }
    
    // Assign the admin role to the user
    await rbacStorage.assignRoleToUser({
      userId,
      roleId: adminRoles[0].id,
      scopeType: 'tenant',
      scopeId: tenantId
    });
    
    console.log(`✅ Assigned ${adminRoles[0].name} role to user ${userId} for tenant ${tenantId}`);
    return true;
  } catch (error) {
    console.error('Error assigning admin role:', error);
    return false;
  }
}

// Function to update admin roles with all permissions (handles both legacy "admin" and new "Amministratore")
export async function updateAdminRolesWithAllPermissions() {
  console.log('🔄 Updating admin roles with all permissions...');
  
  try {
    const allPermissions = getAllPermissions();
    console.log(`  📋 Found ${allPermissions.length} permissions in registry`);
    
    // Get all "Amministratore" roles (new Italian standard)
    const amministratoreRoles = await db
      .select()
      .from(roles)
      .where(eq(roles.name, 'Amministratore'));
    
    // Get all legacy "admin" roles (for backward compatibility during transition)
    const adminRoles = await db
      .select()
      .from(roles)
      .where(eq(roles.name, 'admin'));
    
    const allAdminRoles = [...amministratoreRoles, ...adminRoles];
    
    if (allAdminRoles.length === 0) {
      console.log('  ⚠️  No admin/Amministratore roles found');
      return;
    }
    
    // Update each admin role with all permissions
    for (const role of allAdminRoles) {
      await rbacStorage.setRolePermissions(role.id, allPermissions);
      console.log(`  ✅ Updated ${role.name} role for tenant ${role.tenantId} with ${allPermissions.length} permissions`);
    }
    
    console.log(`✅ Updated ${allAdminRoles.length} admin role(s) with all permissions`);
    return true;
  } catch (error) {
    console.error('❌ Error updating admin roles:', error);
    throw error;
  }
}

// Main seed function
export async function seedRBAC() {
  console.log('🚀 Starting RBAC seed...');
  
  try {
    // Seed RBAC for all tenants
    await seedRBACForAllTenants();
    
    // Update all admin roles with all permissions (ensures they always have full access)
    await updateAdminRolesWithAllPermissions();
    
    // In development, assign admin role to the demo user
    if (process.env.NODE_ENV === 'development') {
      const demoTenantId = '00000000-0000-0000-0000-000000000001';
      const demoUserId = 'demo-user';
      
      // Create admin role if it doesn't exist
      await seedRBACForTenant(demoTenantId);
      
      // Assign admin role to demo user
      await assignAdminRole(demoUserId, demoTenantId);
    }
    
    console.log('✅ RBAC seed completed successfully');
  } catch (error) {
    console.error('❌ RBAC seed failed:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedRBAC()
    .then(() => {
      console.log('✅ RBAC seed script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ RBAC seed script failed:', error);
      process.exit(1);
    });
}