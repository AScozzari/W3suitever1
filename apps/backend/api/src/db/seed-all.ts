import { seedPaymentMethods } from './seed-payment-methods';
import { seedPaymentConditions } from './seed-payment-conditions';

/**
 * Seed All Public Reference Data
 * Popola tutte le tabelle public con dati di riferimento
 */
async function seedAll() {
  console.log("🌱 Starting database seeding process...\n");
  
  try {
    // Seed payment methods
    await seedPaymentMethods();
    
    // Seed payment conditions
    await seedPaymentConditions();
    
    console.log("🎉 All public reference data seeded successfully!");
    console.log("🔍 You can now check the data:");
    console.log("   - Payment methods: SELECT * FROM public.payment_methods;");
    console.log("   - Payment conditions: SELECT * FROM public.payment_methods_conditions;");
    
  } catch (error) {
    console.error("❌ Error during seeding process:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedAll()
    .then(() => {
      console.log("✅ Seeding completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}

export { seedAll };