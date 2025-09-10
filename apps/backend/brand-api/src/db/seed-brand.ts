import { db, brandTenants, brandUsers, brandRoles } from "./index.js";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

async function seedBrandInterface() {
  console.log("🌱 Seeding Brand Interface database...");
  
  try {
    // Create default Brand tenant
    const brandTenant = await db.insert(brandTenants)
      .values({
        id: "50dbf940-5809-4094-afa1-bd699122a636",
        name: "WindTre Brand HQ",
        slug: "brand-hq",
        type: "brand_interface",
        status: "active",
        settings: {
          theme: "windtre",
          features: ["campaigns", "pricing", "analytics", "propagation"]
        },
        brandAdminEmail: "brand.admin@windtre.it",
        maxConcurrentUsers: 100
      })
      .onConflictDoNothing()
      .returning();
    
    const tenantId = brandTenant[0]?.id || "50dbf940-5809-4094-afa1-bd699122a636";
    
    // Create default roles
    const superAdminRole = await db.insert(brandRoles)
      .values({
        tenantId,
        name: "Super Admin",
        description: "Full access to all Brand Interface features",
        isGlobal: true,
        allowedAreas: ["*"],
        permissions: ["*"],
        isSystem: true
      })
      .onConflictDoNothing()
      .returning();
    
    const areaManagerRole = await db.insert(brandRoles)
      .values({
        tenantId,
        name: "Area Manager",
        description: "Manage specific commercial areas",
        isGlobal: false,
        allowedAreas: [],
        permissions: ["view", "edit", "deploy_to_area"],
        isSystem: true
      })
      .onConflictDoNothing()
      .returning();
    
    // Create hashed password for users
    const defaultPassword = "Brand123!";
    let passwordHash: string | undefined;
    
    // Only hash password in production or if explicitly requested
    if (process.env.NODE_ENV === "production" || process.env.USE_HASHED_PASSWORDS === "true") {
      const saltRounds = 10;
      passwordHash = await bcrypt.hash(defaultPassword, saltRounds);
      console.log("🔐 Using hashed passwords for users");
    } else {
      console.log("⚠️ Development mode: Users created without password hashes");
    }
    
    // Create test users
    const users = [
      {
        id: nanoid(),
        email: "brand.superadmin@windtre.it",
        firstName: "Brand",
        lastName: "Super Admin",
        role: "super_admin" as const,
        commercialAreaCodes: ["*"],
        permissions: ["*"],
        department: "HQ Operations",
        isActive: true,
        tenantId,
        passwordHash
      },
      {
        id: nanoid(),
        email: "brand.areamanager@windtre.it",
        firstName: "Area",
        lastName: "Manager",
        role: "area_manager" as const,
        commercialAreaCodes: ["CA_NORD_OVEST", "CA_CENTRO"],
        permissions: ["view", "edit", "deploy_to_area"],
        department: "Commercial Operations",
        isActive: true,
        tenantId,
        passwordHash
      },
      {
        id: nanoid(),
        email: "brand.national@windtre.it",
        firstName: "National",
        lastName: "Manager",
        role: "national_manager" as const,
        commercialAreaCodes: ["*"],
        permissions: ["view", "edit", "create_campaigns", "deploy_national"],
        department: "National Operations",
        isActive: true,
        tenantId,
        passwordHash
      }
    ];
    
    // Insert all users at once
    await db.insert(brandUsers)
      .values(users)
      .onConflictDoNothing();
    
    console.log("✅ Brand Interface seed data created successfully!");
    console.log("📧 Test users:");
    console.log("  - brand.superadmin@windtre.it (password: Brand123!)");
    console.log("  - brand.areamanager@windtre.it (password: Brand123!)");
    console.log("  - brand.national@windtre.it (password: Brand123!)");
    
  } catch (error) {
    console.error("❌ Error seeding Brand Interface:", error);
    throw error;
  }
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedBrandInterface()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedBrandInterface };