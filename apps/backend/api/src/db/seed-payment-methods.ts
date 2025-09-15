import { db } from "../core/db";
import { paymentMethods } from "./schema/public";

/**
 * Seed Payment Methods - Metodi di pagamento standard per Italia/Europa
 */
export async function seedPaymentMethods() {
  console.log("💳 Seeding payment methods...");

  const paymentMethodsData = [
    // ==================== BONIFICI E TRASFERIMENTI ====================
    {
      code: "SEPA_TRANSFER",
      name: "Bonifico SEPA",
      description: "Bonifico bancario Single Euro Payments Area",
      category: "bank_transfer",
      requiresIban: true,
      requiresAuth: false,
      supportsBatching: true,
      countryCode: null, // Internazionale
      active: true,
      isDefault: true,
      sortOrder: 10,
    },
    {
      code: "SWIFT_TRANSFER",
      name: "Bonifico SWIFT",
      description: "Bonifico internazionale tramite rete SWIFT",
      category: "bank_transfer",
      requiresIban: true,
      requiresAuth: false,
      supportsBatching: true,
      countryCode: null,
      active: true,
      isDefault: false,
      sortOrder: 20,
    },
    {
      code: "INSTANT_TRANSFER",
      name: "Bonifico Istantaneo",
      description: "Bonifico SEPA istantaneo (tempo reale)",
      category: "bank_transfer",
      requiresIban: true,
      requiresAuth: false,
      supportsBatching: false,
      countryCode: null,
      active: true,
      isDefault: false,
      sortOrder: 15,
    },

    // ==================== ADDEBITI DIRETTI ====================
    {
      code: "SEPA_DD",
      name: "Addebito Diretto SEPA (SDD)",
      description: "Addebito diretto su conto corrente SEPA",
      category: "direct_debit",
      requiresIban: true,
      requiresAuth: true,
      supportsBatching: true,
      countryCode: null,
      active: true,
      isDefault: false,
      sortOrder: 30,
    },
    {
      code: "RID",
      name: "RID (Rapporti Interbancari Diretti)",
      description: "Sistema di addebito diretto italiano (legacy)",
      category: "direct_debit",
      requiresIban: true,
      requiresAuth: true,
      supportsBatching: true,
      countryCode: "ITA",
      active: true,
      isDefault: false,
      sortOrder: 35,
    },

    // ==================== CARTE DI PAGAMENTO ====================
    {
      code: "CREDIT_CARD",
      name: "Carta di Credito",
      description: "Pagamento con carta di credito (Visa, Mastercard, etc.)",
      category: "card",
      requiresIban: false,
      requiresAuth: true,
      supportsBatching: false,
      countryCode: null,
      active: true,
      isDefault: false,
      sortOrder: 40,
    },
    {
      code: "DEBIT_CARD",
      name: "Carta di Debito",
      description: "Pagamento con carta di debito (Bancomat, Maestro, etc.)",
      category: "card",
      requiresIban: false,
      requiresAuth: true,
      supportsBatching: false,
      countryCode: null,
      active: true,
      isDefault: false,
      sortOrder: 45,
    },

    // ==================== PAGAMENTI DIGITALI ====================
    {
      code: "PAYPAL",
      name: "PayPal",
      description: "Pagamento tramite portafoglio digitale PayPal",
      category: "digital",
      requiresIban: false,
      requiresAuth: true,
      supportsBatching: false,
      countryCode: null,
      active: true,
      isDefault: false,
      sortOrder: 50,
    },
    {
      code: "SATISPAY",
      name: "Satispay",
      description: "Pagamento mobile italiano Satispay",
      category: "digital",
      requiresIban: false,
      requiresAuth: true,
      supportsBatching: false,
      countryCode: "ITA",
      active: true,
      isDefault: false,
      sortOrder: 55,
    },
    {
      code: "GOOGLE_PAY",
      name: "Google Pay",
      description: "Pagamento mobile tramite Google Pay",
      category: "digital",
      requiresIban: false,
      requiresAuth: true,
      supportsBatching: false,
      countryCode: null,
      active: true,
      isDefault: false,
      sortOrder: 60,
    },
    {
      code: "APPLE_PAY",
      name: "Apple Pay",
      description: "Pagamento mobile tramite Apple Pay",
      category: "digital",
      requiresIban: false,
      requiresAuth: true,
      supportsBatching: false,
      countryCode: null,
      active: true,
      isDefault: false,
      sortOrder: 65,
    },

    // ==================== ITALIA SPECIFICI ====================
    {
      code: "MAV",
      name: "MAV (Mediante Avviso)",
      description: "Pagamento tramite bollettino MAV",
      category: "check",
      requiresIban: false,
      requiresAuth: false,
      supportsBatching: true,
      countryCode: "ITA",
      active: true,
      isDefault: false,
      sortOrder: 70,
    },
    {
      code: "RAV",
      name: "RAV (Ruolo Mediante Avviso)",
      description: "Pagamento tramite bollettino RAV",
      category: "check",
      requiresIban: false,
      requiresAuth: false,
      supportsBatching: true,
      countryCode: "ITA",
      active: true,
      isDefault: false,
      sortOrder: 75,
    },
    {
      code: "POSTAL_BULLETIN",
      name: "Bollettino Postale",
      description: "Pagamento tramite bollettino di conto corrente postale",
      category: "check",
      requiresIban: false,
      requiresAuth: false,
      supportsBatching: true,
      countryCode: "ITA",
      active: true,
      isDefault: false,
      sortOrder: 80,
    },
    {
      code: "PAGOBANCOMAT",
      name: "PagoBancomat",
      description: "Pagamento online tramite circuito Bancomat",
      category: "digital",
      requiresIban: false,
      requiresAuth: true,
      supportsBatching: false,
      countryCode: "ITA",
      active: true,
      isDefault: false,
      sortOrder: 52,
    },

    // ==================== TRADIZIONALI ====================
    {
      code: "CASH",
      name: "Contanti",
      description: "Pagamento in contanti",
      category: "cash",
      requiresIban: false,
      requiresAuth: false,
      supportsBatching: false,
      countryCode: null,
      active: true,
      isDefault: false,
      sortOrder: 90,
    },
    {
      code: "CHECK",
      name: "Assegno",
      description: "Pagamento tramite assegno bancario",
      category: "check",
      requiresIban: false,
      requiresAuth: false,
      supportsBatching: true,
      countryCode: null,
      active: true,
      isDefault: false,
      sortOrder: 95,
    },
    {
      code: "COD",
      name: "Contrassegno",
      description: "Pagamento alla consegna (Cash on Delivery)",
      category: "cash",
      requiresIban: false,
      requiresAuth: false,
      supportsBatching: false,
      countryCode: null,
      active: true,
      isDefault: false,
      sortOrder: 85,
    },

    // ==================== RIMESSE E COMPENSAZIONI ====================
    {
      code: "DIRECT_REMITTANCE",
      name: "Rimessa Diretta",
      description: "Pagamento tramite rimessa diretta",
      category: "bank_transfer",
      requiresIban: false,
      requiresAuth: false,
      supportsBatching: true,
      countryCode: null,
      active: true,
      isDefault: false,
      sortOrder: 25,
    },
    {
      code: "NETTING",
      name: "Compensazione",
      description: "Compensazione tra debiti e crediti reciproci",
      category: "bank_transfer",
      requiresIban: false,
      requiresAuth: false,
      supportsBatching: true,
      countryCode: null,
      active: true,
      isDefault: false,
      sortOrder: 100,
    },
  ];

  try {
    // Insert dei metodi di pagamento
    await db.insert(paymentMethods)
      .values(paymentMethodsData)
      .onConflictDoNothing();

    console.log(`✅ Inserted ${paymentMethodsData.length} payment methods`);
  } catch (error) {
    console.error("❌ Error seeding payment methods:", error);
    throw error;
  }

  console.log("💳 Payment methods seeded successfully!\n");
}
