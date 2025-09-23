import { sql } from "drizzle-orm";
import { db } from "../core/db";
import { paymentMethodsConditions } from "./schema/public";

/**
 * Seed Payment Conditions - Condizioni di pagamento standard per Italia/Europa
 */
export async function seedPaymentConditions() {
  console.log("💰 Seeding payment conditions...");

  // ==================== CREATE TABLE IF NOT EXISTS (IDEMPOTENT) ====================
  console.log("🔧 Ensuring payment_methods_conditions table exists...");
  
  // Create payment_methods_conditions table if it doesn't exist
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS public.payment_methods_conditions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code varchar(50) UNIQUE NOT NULL,
      name varchar(100) NOT NULL,
      description text,
      days smallint,
      type varchar(50) NOT NULL,
      calculation varchar(50),
      active boolean DEFAULT true,
      is_default boolean DEFAULT false,
      sort_order smallint DEFAULT 0,
      created_at timestamp DEFAULT now()
    );
  `);

  // Create indexes if they don't exist
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_payment_conditions_type ON public.payment_methods_conditions(type);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_payment_conditions_days ON public.payment_methods_conditions(days);`);
  
  console.log("✅ payment_methods_conditions table ready!");

  const paymentConditionsData = [
    // ==================== PAGAMENTI IMMEDIATI ====================
    {
      code: "IMMEDIATE",
      name: "Pagamento Immediato",
      description: "Pagamento alla consegna o immediatamente",
      days: 0,
      type: "immediate",
      calculation: "immediate",
      active: true,
      isDefault: true,
      sortOrder: 10,
    },
    {
      code: "CASH_ON_DELIVERY",
      name: "Contrassegno",
      description: "Pagamento alla consegna della merce",
      days: 0,
      type: "immediate",
      calculation: "immediate",
      active: true,
      isDefault: false,
      sortOrder: 15,
    },

    // ==================== PAGAMENTI STANDARD ====================
    {
      code: "30GGDF",
      name: "30 Giorni Data Fattura",
      description: "Pagamento entro 30 giorni dalla data fattura",
      days: 30,
      type: "standard",
      calculation: "from_invoice",
      active: true,
      isDefault: false,
      sortOrder: 20,
    },
    {
      code: "60GGDF",
      name: "60 Giorni Data Fattura",
      description: "Pagamento entro 60 giorni dalla data fattura",
      days: 60,
      type: "standard",
      calculation: "from_invoice",
      active: true,
      isDefault: false,
      sortOrder: 30,
    },
    {
      code: "90GGDF",
      name: "90 Giorni Data Fattura",
      description: "Pagamento entro 90 giorni dalla data fattura",
      days: 90,
      type: "standard",
      calculation: "from_invoice",
      active: true,
      isDefault: false,
      sortOrder: 40,
    },
    {
      code: "120GGDF",
      name: "120 Giorni Data Fattura",
      description: "Pagamento entro 120 giorni dalla data fattura",
      days: 120,
      type: "standard",
      calculation: "from_invoice",
      active: true,
      isDefault: false,
      sortOrder: 50,
    },

    // ==================== FINE MESE (DFFM) ====================
    {
      code: "30DFFM",
      name: "30 Giorni Data Fine Mese",
      description: "Pagamento entro 30 giorni dalla fine del mese di fatturazione",
      days: 30,
      type: "dffm",
      calculation: "from_month_end",
      active: true,
      isDefault: false,
      sortOrder: 60,
    },
    {
      code: "60DFFM",
      name: "60 Giorni Data Fine Mese",
      description: "Pagamento entro 60 giorni dalla fine del mese di fatturazione",
      days: 60,
      type: "dffm",
      calculation: "from_month_end",
      active: true,
      isDefault: false,
      sortOrder: 70,
    },
    {
      code: "90DFFM",
      name: "90 Giorni Data Fine Mese",
      description: "Pagamento entro 90 giorni dalla fine del mese di fatturazione",
      days: 90,
      type: "dffm",
      calculation: "from_month_end",
      active: true,
      isDefault: false,
      sortOrder: 80,
    },

    // ==================== CONDIZIONI PERSONALIZZATE ====================
    {
      code: "PREPAYMENT",
      name: "Pagamento Anticipato",
      description: "Pagamento richiesto prima della consegna/erogazione",
      days: -1,
      type: "custom",
      calculation: "immediate",
      active: true,
      isDefault: false,
      sortOrder: 5,
    },
    {
      code: "50_50_SPLIT",
      name: "50% Anticipo + 50% Consegna",
      description: "50% all'ordine, 50% alla consegna",
      days: null,
      type: "custom",
      calculation: "immediate",
      active: true,
      isDefault: false,
      sortOrder: 85,
    },
    {
      code: "END_OF_MONTH",
      name: "Fine Mese",
      description: "Pagamento entro la fine del mese corrente",
      days: null,
      type: "custom",
      calculation: "from_month_end",
      active: true,
      isDefault: false,
      sortOrder: 90,
    },

    // ==================== CONDIZIONI STAGIONALI ====================
    {
      code: "SEASONAL_PAYMENT",
      name: "Pagamento Stagionale",
      description: "Pagamento differito alla stagione commerciale",
      days: null,
      type: "custom",
      calculation: "custom",
      active: true,
      isDefault: false,
      sortOrder: 95,
    },

    // ==================== CONDIZIONI SPECIALI ITALIA ====================
    {
      code: "15_30_SPLIT",
      name: "15gg + 30gg Fine Mese",
      description: "Pagamento a rate: 15 giorni + 30 giorni fine mese",
      days: null,
      type: "custom",
      calculation: "custom",
      active: true,
      isDefault: false,
      sortOrder: 100,
    },
    {
      code: "INSTALLMENTS_3",
      name: "3 Rate Mensili",
      description: "Pagamento dilazionato in 3 rate mensili",
      days: null,
      type: "custom",
      calculation: "custom",
      active: true,
      isDefault: false,
      sortOrder: 110,
    },
    {
      code: "INSTALLMENTS_6",
      name: "6 Rate Mensili",
      description: "Pagamento dilazionato in 6 rate mensili",
      days: null,
      type: "custom",
      calculation: "custom",
      active: true,
      isDefault: false,
      sortOrder: 120,
    },

    // ==================== CONDIZIONI B2B SPECIFICHE ====================
    {
      code: "QUARTERLY",
      name: "Trimestrale",
      description: "Pagamento ogni 3 mesi",
      days: 90,
      type: "custom",
      calculation: "from_invoice",
      active: true,
      isDefault: false,
      sortOrder: 130,
    },
    {
      code: "BIANNUAL",
      name: "Semestrale",
      description: "Pagamento ogni 6 mesi",
      days: 180,
      type: "custom",
      calculation: "from_invoice",
      active: true,
      isDefault: false,
      sortOrder: 140,
    },
    {
      code: "ANNUAL",
      name: "Annuale",
      description: "Pagamento annuale",
      days: 365,
      type: "custom",
      calculation: "from_invoice",
      active: true,
      isDefault: false,
      sortOrder: 150,
    },

    // ==================== CONDIZIONI EXPORT/IMPORT ====================
    {
      code: "LETTER_OF_CREDIT",
      name: "Lettera di Credito",
      description: "Pagamento tramite lettera di credito bancario",
      days: null,
      type: "custom",
      calculation: "custom",
      active: true,
      isDefault: false,
      sortOrder: 160,
    },
    {
      code: "DOCUMENTARY_COLLECTION",
      name: "Incasso Documentario",
      description: "Pagamento tramite incasso documentario",
      days: null,
      type: "custom",
      calculation: "custom",
      active: true,
      isDefault: false,
      sortOrder: 170,
    },
  ];

  try {
    // Insert delle condizioni di pagamento
    await db.insert(paymentMethodsConditions)
      .values(paymentConditionsData)
      .onConflictDoNothing();

    console.log(`✅ Inserted ${paymentConditionsData.length} payment conditions`);
  } catch (error) {
    console.error("❌ Error seeding payment conditions:", error);
    throw error;
  }

  console.log("💰 Payment conditions seeded successfully!\n");
}