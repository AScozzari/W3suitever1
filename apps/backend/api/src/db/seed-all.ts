import { seedPaymentMethods } from './seed-payment-methods';
import { seedPaymentConditions } from './seed-payment-conditions';
import { seedMCPServers } from './seed-mcp-servers';
import { seedProductHierarchy } from './seed-product-hierarchy';

/**
 * Seed All Public Reference Data
 * Popola tutte le tabelle public con dati di riferimento
 */
async function seedAll() {
  console.log("🌱 Starting database seeding process...\n");
  
  try {
    // Seed product hierarchy (drivers, categories, typologies)
    await seedProductHierarchy();
    
    // Seed payment methods
    await seedPaymentMethods();
    
    // Seed payment conditions
    await seedPaymentConditions();
    
    // Seed MCP servers (tenant-specific)
    await seedMCPServers();
    
    console.log("🎉 All reference data seeded successfully!");
    console.log("🔍 You can now check the data:");
    console.log("   - Product hierarchy: SELECT * FROM public.driver_categories;");
    console.log("   - Payment methods: SELECT * FROM public.payment_methods;");
    console.log("   - Payment conditions: SELECT * FROM public.payment_methods_conditions;");
    console.log("   - MCP servers: SELECT * FROM w3suite.mcp_servers;");
    
  } catch (error) {
    console.error("❌ Error during seeding process:", error);
    process.exit(1);
  }
}

// Auto-run seeding on module load
seedAll()
  .then(() => {
    console.log("✅ Seeding completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });

export { seedAll };