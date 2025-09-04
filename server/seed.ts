import { db } from "./db";
import { users, tenants } from "../shared/schema";
import * as bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Starting seed...");

  try {
    // Create demo tenant
    const [demoTenant] = await db.insert(tenants).values({
      id: "demo-tenant",
      name: "Demo Company",
      domain: "demo.w3suite.com",
      primaryColor: "#FF6900",
      secondaryColor: "#7B2CBF",
      plan: "enterprise",
      isActive: true
    }).onConflictDoNothing().returning();

    console.log("✅ Created demo tenant");

    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const [adminUser] = await db.insert(users).values({
      id: "admin-user",
      email: "admin@w3suite.com",
      firstName: "Admin",
      lastName: "User",
      username: "admin",
      password: hashedPassword,
      tenantId: "demo-tenant",
      role: "admin",
      isActive: true
    }).onConflictDoNothing().returning();

    console.log("✅ Created admin user");
    console.log("\n📋 Login credentials:");
    console.log("Username: admin");
    console.log("Password: admin123");
    
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }

  console.log("\n✨ Seed completed successfully!");
  process.exit(0);
}

seed();