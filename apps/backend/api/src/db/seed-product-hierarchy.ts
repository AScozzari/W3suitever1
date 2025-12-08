import { db } from "./index.js";
import { driverCategories, driverTypologies } from "./schema/public.js";

/**
 * Seed Product Hierarchy - WindTre Official Drivers, Categories, Typologies
 * Popola le tabelle public con la gerarchia prodotti ufficiale di WindTre
 */
export async function seedProductHierarchy() {
  console.log("🏗️  Seeding product hierarchy (drivers, categories, typologies)...");
  
  try {
    // ==================== FISSO ====================
    const fissoCategories = await db.insert(driverCategories)
      .values([
        {
          driverName: "Fisso",
          categoryName: "Voce Fissa",
          categoryDescription: "Servizi di telefonia fissa tradizionale",
          displayOrder: 1,
          isActive: true
        },
        {
          driverName: "Fisso",
          categoryName: "Internet Fissa",
          categoryDescription: "Connettività internet fibra/ADSL",
          displayOrder: 2,
          isActive: true
        },
        {
          driverName: "Fisso",
          categoryName: "Combo Fisso",
          categoryDescription: "Pacchetti voce + internet",
          displayOrder: 3,
          isActive: true
        }
      ])
      .onConflictDoNothing()
      .returning();

    await db.insert(driverTypologies)
      .values([
        { driverName: "Fisso", categoryName: "Voce Fissa", typologyName: "Voce Unlimited", typologyDescription: "Chiamate illimitate nazionale", displayOrder: 1, isActive: true },
        { driverName: "Fisso", categoryName: "Voce Fissa", typologyName: "Voce Base", typologyDescription: "Piano tariffario base", displayOrder: 2, isActive: true },
        { driverName: "Fisso", categoryName: "Internet Fissa", typologyName: "Fibra 1Gb", typologyDescription: "Fibra ottica 1 Gigabit", displayOrder: 1, isActive: true },
        { driverName: "Fisso", categoryName: "Internet Fissa", typologyName: "Fibra 100Mb", typologyDescription: "Fibra ottica 100 Megabit", displayOrder: 2, isActive: true },
        { driverName: "Fisso", categoryName: "Internet Fissa", typologyName: "ADSL", typologyDescription: "Internet ADSL", displayOrder: 3, isActive: true },
        { driverName: "Fisso", categoryName: "Combo Fisso", typologyName: "Voce+Fibra Premium", typologyDescription: "Voce illimitata + Fibra 1Gb", displayOrder: 1, isActive: true },
        { driverName: "Fisso", categoryName: "Combo Fisso", typologyName: "Voce+Fibra Base", typologyDescription: "Voce base + Fibra 100Mb", displayOrder: 2, isActive: true }
      ])
      .onConflictDoNothing();

    // ==================== MOBILE ====================
    const mobileCategories = await db.insert(driverCategories)
      .values([
        {
          driverName: "Mobile",
          categoryName: "Solo SIM",
          categoryDescription: "Piano tariffario senza dispositivo",
          displayOrder: 1,
          isActive: true
        },
        {
          driverName: "Mobile",
          categoryName: "Con Dispositivo",
          categoryDescription: "Piano con smartphone incluso",
          displayOrder: 2,
          isActive: true
        },
        {
          driverName: "Mobile",
          categoryName: "Ricaricabile",
          categoryDescription: "Piano ricaricabile prepagato",
          displayOrder: 3,
          isActive: true
        }
      ])
      .onConflictDoNothing()
      .returning();

    await db.insert(driverTypologies)
      .values([
        { driverName: "Mobile", categoryName: "Solo SIM", typologyName: "Unlimited 5G", typologyDescription: "Dati illimitati 5G", displayOrder: 1, isActive: true },
        { driverName: "Mobile", categoryName: "Solo SIM", typologyName: "Special 70GB", typologyDescription: "70GB + minuti illimitati", displayOrder: 2, isActive: true },
        { driverName: "Mobile", categoryName: "Solo SIM", typologyName: "Top 50GB", typologyDescription: "50GB + minuti illimitati", displayOrder: 3, isActive: true },
        { driverName: "Mobile", categoryName: "Con Dispositivo", typologyName: "5G Premium Device", typologyDescription: "Smartphone 5G + piano dati", displayOrder: 1, isActive: true },
        { driverName: "Mobile", categoryName: "Con Dispositivo", typologyName: "4G Standard Device", typologyDescription: "Smartphone 4G + piano dati", displayOrder: 2, isActive: true },
        { driverName: "Mobile", categoryName: "Ricaricabile", typologyName: "Prepagata Unlimited", typologyDescription: "Ricarica mensile illimitata", displayOrder: 1, isActive: true },
        { driverName: "Mobile", categoryName: "Ricaricabile", typologyName: "Prepagata Base", typologyDescription: "Ricarica base con soglie", displayOrder: 2, isActive: true }
      ])
      .onConflictDoNothing();

    // ==================== ENERGIA ====================
    const energiaCategories = await db.insert(driverCategories)
      .values([
        {
          driverName: "Energia",
          categoryName: "Luce",
          categoryDescription: "Fornitura energia elettrica",
          displayOrder: 1,
          isActive: true
        },
        {
          driverName: "Energia",
          categoryName: "Gas",
          categoryDescription: "Fornitura gas naturale",
          displayOrder: 2,
          isActive: true
        },
        {
          driverName: "Energia",
          categoryName: "Dual Fuel",
          categoryDescription: "Luce + Gas combinati",
          displayOrder: 3,
          isActive: true
        }
      ])
      .onConflictDoNothing()
      .returning();

    await db.insert(driverTypologies)
      .values([
        { driverName: "Energia", categoryName: "Luce", typologyName: "Monoraria", typologyDescription: "Tariffa unica tutto il giorno", displayOrder: 1, isActive: true },
        { driverName: "Energia", categoryName: "Luce", typologyName: "Bioraria", typologyDescription: "Tariffa F1/F23", displayOrder: 2, isActive: true },
        { driverName: "Energia", categoryName: "Gas", typologyName: "Gas Fisso", typologyDescription: "Prezzo fisso bloccato", displayOrder: 1, isActive: true },
        { driverName: "Energia", categoryName: "Gas", typologyName: "Gas Variabile", typologyDescription: "Prezzo variabile mercato", displayOrder: 2, isActive: true },
        { driverName: "Energia", categoryName: "Dual Fuel", typologyName: "Dual Energy Plus", typologyDescription: "Luce + Gas con sconto combinato", displayOrder: 1, isActive: true },
        { driverName: "Energia", categoryName: "Dual Fuel", typologyName: "Dual Energy Base", typologyDescription: "Luce + Gas standard", displayOrder: 2, isActive: true }
      ])
      .onConflictDoNothing();

    // ==================== ASSICURAZIONE ====================
    const assicurazioneCategories = await db.insert(driverCategories)
      .values([
        {
          driverName: "Assicurazione",
          categoryName: "Auto",
          categoryDescription: "Assicurazioni auto e moto",
          displayOrder: 1,
          isActive: true
        },
        {
          driverName: "Assicurazione",
          categoryName: "Casa",
          categoryDescription: "Assicurazioni abitazione",
          displayOrder: 2,
          isActive: true
        },
        {
          driverName: "Assicurazione",
          categoryName: "Persona",
          categoryDescription: "Assicurazioni vita e salute",
          displayOrder: 3,
          isActive: true
        }
      ])
      .onConflictDoNothing()
      .returning();

    await db.insert(driverTypologies)
      .values([
        { driverName: "Assicurazione", categoryName: "Auto", typologyName: "RCA Base", typologyDescription: "Responsabilità civile auto", displayOrder: 1, isActive: true },
        { driverName: "Assicurazione", categoryName: "Auto", typologyName: "Kasko Completa", typologyDescription: "Copertura totale auto", displayOrder: 2, isActive: true },
        { driverName: "Assicurazione", categoryName: "Casa", typologyName: "Multirischio Casa", typologyDescription: "Copertura abitazione completa", displayOrder: 1, isActive: true },
        { driverName: "Assicurazione", categoryName: "Casa", typologyName: "Incendio e Furto", typologyDescription: "Protezione base abitazione", displayOrder: 2, isActive: true },
        { driverName: "Assicurazione", categoryName: "Persona", typologyName: "Assicurazione Vita", typologyDescription: "Polizza vita", displayOrder: 1, isActive: true },
        { driverName: "Assicurazione", categoryName: "Persona", typologyName: "Salute Premium", typologyDescription: "Copertura sanitaria completa", displayOrder: 2, isActive: true }
      ])
      .onConflictDoNothing();

    // ==================== PROTECTA ====================
    const protectaCategories = await db.insert(driverCategories)
      .values([
        {
          driverName: "Protecta",
          categoryName: "Dispositivi",
          categoryDescription: "Protezione smartphone e device",
          displayOrder: 1,
          isActive: true
        },
        {
          driverName: "Protecta",
          categoryName: "Servizi",
          categoryDescription: "Servizi di assistenza e supporto",
          displayOrder: 2,
          isActive: true
        }
      ])
      .onConflictDoNothing()
      .returning();

    await db.insert(driverTypologies)
      .values([
        { driverName: "Protecta", categoryName: "Dispositivi", typologyName: "Protezione Premium", typologyDescription: "Copertura totale device + furto", displayOrder: 1, isActive: true },
        { driverName: "Protecta", categoryName: "Dispositivi", typologyName: "Protezione Base", typologyDescription: "Copertura danni accidentali", displayOrder: 2, isActive: true },
        { driverName: "Protecta", categoryName: "Servizi", typologyName: "Assistenza Device", typologyDescription: "Supporto tecnico 24/7", displayOrder: 1, isActive: true },
        { driverName: "Protecta", categoryName: "Servizi", typologyName: "Backup Cloud", typologyDescription: "Backup dati automatico", displayOrder: 2, isActive: true }
      ])
      .onConflictDoNothing();

    // ==================== CUSTOMER BASE ====================
    const customerBaseCategories = await db.insert(driverCategories)
      .values([
        {
          driverName: "Customer Base",
          categoryName: "Retention",
          categoryDescription: "Attività di fidelizzazione clienti",
          displayOrder: 1,
          isActive: true
        },
        {
          driverName: "Customer Base",
          categoryName: "Upselling",
          categoryDescription: "Upgrade piano esistente",
          displayOrder: 2,
          isActive: true
        },
        {
          driverName: "Customer Base",
          categoryName: "Cross-sell",
          categoryDescription: "Vendita servizi aggiuntivi",
          displayOrder: 3,
          isActive: true
        }
      ])
      .onConflictDoNothing()
      .returning();

    await db.insert(driverTypologies)
      .values([
        { driverName: "Customer Base", categoryName: "Retention", typologyName: "Fidelizzazione Premium", typologyDescription: "Offerta esclusiva per clienti esistenti", displayOrder: 1, isActive: true },
        { driverName: "Customer Base", categoryName: "Retention", typologyName: "Retention Standard", typologyDescription: "Incentivo standard per retention", displayOrder: 2, isActive: true },
        { driverName: "Customer Base", categoryName: "Upselling", typologyName: "Upgrade Piano", typologyDescription: "Passaggio a piano superiore", displayOrder: 1, isActive: true },
        { driverName: "Customer Base", categoryName: "Upselling", typologyName: "Aumento Soglie", typologyDescription: "Aumento GB/minuti", displayOrder: 2, isActive: true },
        { driverName: "Customer Base", categoryName: "Cross-sell", typologyName: "Add-on Servizi", typologyDescription: "Servizi aggiuntivi al piano base", displayOrder: 1, isActive: true },
        { driverName: "Customer Base", categoryName: "Cross-sell", typologyName: "Bundle Famiglia", typologyDescription: "Offerta famiglia multi-linea", displayOrder: 2, isActive: true }
      ])
      .onConflictDoNothing();

    console.log("✅ Product hierarchy seeded successfully!");
    console.log("📊 Seeded data:");
    console.log("   - Fisso: 3 categories, 7 typologies");
    console.log("   - Mobile: 3 categories, 7 typologies");
    console.log("   - Energia: 3 categories, 6 typologies");
    console.log("   - Assicurazione: 3 categories, 6 typologies");
    console.log("   - Protecta: 2 categories, 4 typologies");
    console.log("   - Customer Base: 3 categories, 6 typologies");
    console.log("🔍 Query: SELECT * FROM public.driver_categories;");
    console.log("🔍 Query: SELECT * FROM public.driver_typologies;");
    
  } catch (error) {
    console.error("❌ Error seeding product hierarchy:", error);
    throw error;
  }
}
