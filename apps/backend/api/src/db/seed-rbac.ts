import { db } from '../core/db';
import { roles, rolePerms, userAssignments, tenants } from './schema/w3suite';
import { eq, and } from 'drizzle-orm';
import { rbacStorage } from '../core/rbac-storage';
import { PERMISSIONS } from '../core/permissions/registry';

// Define default roles with their permissions
const DEFAULT_ROLES = [
  {
    name: 'admin',
    description: 'Full system administrator with all permissions',
    isSystem: true,
    level: 1,
    permissions: ['*'] // Full access
  },
  {
    name: 'store_manager',
    description: 'Store manager with full store management capabilities',
    isSystem: true,
    level: 10,
    permissions: [
      'stores.*',
      'inventory.*',
      'pos.*',
      'crm.leads.view',
      'crm.leads.create',
      'crm.leads.update',
      'crm.customers.view',
      'crm.customers.create',
      'crm.customers.update',
      'reports.store.*',
      'dashboard.view'
    ]
  },
  {
    name: 'finance',
    description: 'Financial operations and reporting access',
    isSystem: true,
    level: 20,
    permissions: [
      'finance.*',
      'reports.financial.*',
      'pos.transactions.view',
      'stores.view',
      'dashboard.view'
    ]
  },
  {
    name: 'marketing',
    description: 'Marketing and CRM full access',
    isSystem: true,
    level: 30,
    permissions: [
      'crm.*',
      'marketing.*',
      'reports.marketing.*',
      'stores.view',
      'dashboard.view'
    ]
  },
  {
    name: 'operations',
    description: 'Operations and inventory management',
    isSystem: true,
    level: 40,
    permissions: [
      'inventory.*',
      'procurement.*',
      'stores.view',
      'stores.update',
      'reports.operations.*',
      'dashboard.view'
    ]
  },
  {
    name: 'sales',
    description: 'Sales and POS operations',
    isSystem: true,
    level: 50,
    permissions: [
      'pos.*',
      'crm.customers.view',
      'crm.customers.create',
      'crm.customers.update',
      'inventory.view',
      'reports.sales.*',
      'dashboard.view'
    ]
  },
  {
    name: 'hr',
    description: 'Human resources management',
    isSystem: true,
    level: 60,
    permissions: [
      'hr.*',
      'users.view',
      'users.create',
      'users.update',
      'reports.hr.*',
      'dashboard.view'
    ]
  },
  {
    name: 'viewer',
    description: 'Read-only access to all data',
    isSystem: true,
    level: 100,
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

// Function to assign admin role to a user
export async function assignAdminRole(userId: string, tenantId: string) {
  try {
    // Find the admin role for this tenant
    const adminRoles = await db
      .select()
      .from(roles)
      .where(and(
        eq(roles.tenantId, tenantId),
        eq(roles.name, 'admin')
      ))
      .limit(1);
    
    if (adminRoles.length === 0) {
      console.error('Admin role not found for tenant');
      return false;
    }
    
    // Assign the admin role to the user
    await rbacStorage.assignRoleToUser({
      userId,
      roleId: adminRoles[0].id,
      scopeType: 'tenant',
      scopeId: tenantId
    });
    
    console.log(`✅ Assigned admin role to user ${userId} for tenant ${tenantId}`);
    return true;
  } catch (error) {
    console.error('Error assigning admin role:', error);
    return false;
  }
}

// Main seed function
export async function seedRBAC() {
  console.log('🚀 Starting RBAC seed...');
  
  try {
    // Seed RBAC for all tenants
    await seedRBACForAllTenants();
    
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