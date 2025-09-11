// Seed script for Brand Interface users
import { db, brandTenants, brandUsers } from "./index.js";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { BrandAuthService } from "../core/auth.js";

async function seedBrandUsers() {
  console.log("🌱 Seeding Brand Interface users...");
  
  try {
    // Get or create brand tenant
    const existingTenants = await db.select().from(brandTenants).limit(1);
    let brandTenantId: string;
    
    if (existingTenants.length === 0) {
      console.log("Creating Brand Interface tenant...");
      const [tenant] = await db.insert(brandTenants).values({
        id: '50dbf940-5809-4094-afa1-bd699122a636',
        name: 'WindTre Brand HQ',
        slug: 'windtre-hq',
        type: 'brand_interface',
        status: 'active',
        settings: {
          theme: 'windtre',
          features: ['cross-tenant', 'campaigns', 'analytics']
        },
        features: {
          crossTenant: true,
          campaigns: true,
          analytics: true,
          deployment: true
        },
        brandAdminEmail: 'brand.admin@windtre.it',
        maxConcurrentUsers: 100
      }).returning();
      brandTenantId = tenant.id;
      console.log("✅ Brand tenant created");
    } else {
      brandTenantId = existingTenants[0].id;
      console.log("✅ Using existing brand tenant");
    }
    
    // Create password hash for the new sbadmin user
    const sbadminPasswordHash = await BrandAuthService.hashPassword('admin123');
    
    // Create users
    const users = [
      {
        id: 'brand-super-admin-' + nanoid(8),
        email: 'brand.superadmin@windtre.it',
        firstName: 'Super',
        lastName: 'Administrator',
        role: 'super_admin' as const,
        commercialAreaCodes: ['*'], // All areas
        permissions: [
          'brand.admin',
          'brand.deploy',
          'brand.analytics',
          'brand.campaigns',
          'tenant.manage',
          'tenant.view_all',
          'user.manage'
        ],
        department: 'HQ Management',
        isActive: true,
        tenantId: brandTenantId
      },
      {
        id: 'brand-sbadmin-' + nanoid(8),
        email: 'sbadmin',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin' as const,
        commercialAreaCodes: ['*'], // All areas
        permissions: [
          'brand.admin',
          'brand.deploy',
          'brand.analytics',
          'brand.campaigns',
          'tenant.manage',
          'tenant.view_all',
          'user.manage'
        ],
        department: 'HQ Management',
        passwordHash: sbadminPasswordHash,
        isActive: true,
        tenantId: brandTenantId
      },
      {
        id: 'brand-nat-manager-' + nanoid(8),
        email: 'brand.national@windtre.it',
        firstName: 'National',
        lastName: 'Manager',
        role: 'national_manager' as const,
        commercialAreaCodes: ['IT-NORTH', 'IT-CENTER', 'IT-SOUTH'],
        permissions: [
          'brand.analytics',
          'brand.campaigns',
          'tenant.view_all',
          'campaign.create',
          'campaign.deploy'
        ],
        department: 'National Operations',
        isActive: true,
        tenantId: brandTenantId
      },
      {
        id: 'brand-area-manager-' + nanoid(8),
        email: 'brand.areamanager@windtre.it',
        firstName: 'Area',
        lastName: 'Manager',
        role: 'area_manager' as const,
        commercialAreaCodes: ['IT-NORTH'],
        permissions: [
          'brand.view',
          'campaign.view',
          'analytics.view_area',
          'stores.view_area'
        ],
        department: 'North Region',
        isActive: true,
        tenantId: brandTenantId
      }
    ];
    
    console.log("Creating Brand users...");
    for (const user of users) {
      // Check if user exists
      const existing = await db.select()
        .from(brandUsers)
        .where(eq(brandUsers.email, user.email))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(brandUsers).values(user);
        console.log(`✅ Created user: ${user.email} (${user.role})`);
      } else {
        console.log(`⏭️ User already exists: ${user.email}`);
      }
    }
    
    // Also create some test tenants for cross-tenant operations
    const testTenants = [
      { 
        name: 'Staging Environment', 
        slug: 'staging',
        status: 'active' as const,
        settings: { environment: 'staging' }
      },
      { 
        name: 'Demo Store Milano', 
        slug: 'demo',
        status: 'active' as const,
        settings: { location: 'Milano' }
      },
      { 
        name: 'ACME Corporation', 
        slug: 'acme',
        status: 'active' as const,
        settings: { type: 'corporate' }
      },
      { 
        name: 'Tech Solutions', 
        slug: 'tech',
        status: 'active' as const,
        settings: { type: 'b2b' }
      }
    ];
    
    console.log("\nCreating test tenants for cross-tenant operations...");
    for (const tenant of testTenants) {
      const existing = await db.select()
        .from(brandTenants)
        .where(eq(brandTenants.slug, tenant.slug))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(brandTenants).values({
          ...tenant,
          type: 'retail',
          features: { pos: true, inventory: true }
        });
        console.log(`✅ Created tenant: ${tenant.name} (${tenant.slug})`);
      } else {
        console.log(`⏭️ Tenant already exists: ${tenant.name}`);
      }
    }
    
    console.log("\n🎉 Brand Interface seeding completed!");
    console.log("\n📋 Test Credentials:");
    console.log("=====================================");
    console.log("Super Admin: brand.superadmin@windtre.it / Brand123!");
    console.log("Super Admin (sbadmin): sbadmin / admin123");
    console.log("National Manager: brand.national@windtre.it / Brand123!");
    console.log("Area Manager: brand.areamanager@windtre.it / Brand123!");
    console.log("=====================================\n");
    
  } catch (error) {
    console.error("❌ Error seeding Brand users:", error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedBrandUsers()
    .then(() => {
      console.log("✅ Seed completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seed failed:", error);
      process.exit(1);
    });
}

export default seedBrandUsers;