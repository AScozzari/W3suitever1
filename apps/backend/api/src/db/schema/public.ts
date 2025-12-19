// Public Schema - Shared reference data accessible by all tenants
// All tables in this file remain in the default 'public' schema

import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  uuid,
  smallint,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==================== SHARED REFERENCE TABLES ====================

// ==================== BRANDS ====================
export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBrandSchema = createInsertSchema(brands).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type Brand = typeof brands.$inferSelect;

// ==================== OPERATORS (Telco Brands: WindTre, VeryMobile) ====================
// Operators are brand commercial names that can be linked to a Legal Entity (N:1 relationship)
// Example: Wind Tre S.p.A. (Legal Entity) → WindTre + VeryMobile (Operators/Brands)
export const operators = pgTable("operators", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  legalEntityId: uuid("legal_entity_id"), // FK to w3suite.legal_entities (logical, not physical FK due to cross-schema)
  code: varchar("code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  logoUrl: varchar("logo_url", { length: 500 }),
  primaryColor: varchar("primary_color", { length: 7 }), // Hex color es. #FF6900
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: smallint("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOperatorSchema = createInsertSchema(operators).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertOperator = z.infer<typeof insertOperatorSchema>;
export type Operator = typeof operators.$inferSelect;

// ==================== CHANNELS ====================
export const channels = pgTable("channels", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChannelSchema = createInsertSchema(channels).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type Channel = typeof channels.$inferSelect;

// ==================== MARKETING CHANNELS ====================
export const marketingChannels = pgTable("marketing_channels", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 20 }).notNull(), // digital, traditional, direct
  generatesUtm: boolean("generates_utm").default(false).notNull(), // true for digital channels with UTM, false for tracking-only
  active: boolean("active").default(true),
  sortOrder: smallint("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMarketingChannelSchema = createInsertSchema(marketingChannels).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertMarketingChannel = z.infer<typeof insertMarketingChannelSchema>;
export type MarketingChannel = typeof marketingChannels.$inferSelect;

// ==================== MARKETING CHANNEL UTM MAPPINGS ====================
export const marketingChannelUtmMappings = pgTable("marketing_channel_utm_mappings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  marketingChannelId: uuid("marketing_channel_id").notNull().references(() => marketingChannels.id, { onDelete: 'cascade' }),
  suggestedUtmSource: varchar("suggested_utm_source", { length: 100 }).notNull(),
  suggestedUtmMedium: varchar("suggested_utm_medium", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_marketing_channel_utm_mappings_channel").on(table.marketingChannelId),
]);

export const insertMarketingChannelUtmMappingSchema = createInsertSchema(marketingChannelUtmMappings).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertMarketingChannelUtmMapping = z.infer<typeof insertMarketingChannelUtmMappingSchema>;
export type MarketingChannelUtmMapping = typeof marketingChannelUtmMappings.$inferSelect;

// ==================== COMMERCIAL AREAS ====================
export const commercialAreas = pgTable("commercial_areas", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCommercialAreaSchema = createInsertSchema(commercialAreas).omit({ 
  id: true, 
  createdAt: true
});
export type InsertCommercialArea = z.infer<typeof insertCommercialAreaSchema>;
export type CommercialArea = typeof commercialAreas.$inferSelect;


// ==================== REFERENCE TABLES ====================

// Forme giuridiche italiane
// Legal form category enum: IMPRESA, ENTE_PUBBLICO, NON_PROFIT, PROFESSIONALE, PERSONA_FISICA
export const legalForms = pgTable("legal_forms", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  abbreviation: varchar("abbreviation", { length: 30 }), // Sigla per documenti (es. "S.r.l.")
  nameEnglish: varchar("name_english", { length: 100 }), // Nome inglese per documenti internazionali
  description: text("description"),
  category: varchar("category", { length: 20 }).default("IMPRESA"), // IMPRESA, ENTE_PUBBLICO, NON_PROFIT, PROFESSIONALE, PERSONA_FISICA
  minCapital: varchar("min_capital", { length: 50 }),
  liability: varchar("liability", { length: 50 }), // "limited", "unlimited", "mixed"
  requiresVat: boolean("requires_vat").default(true), // Obbligatoria P.IVA
  requiresFiscalCode: boolean("requires_fiscal_code").default(true), // Obbligatorio Codice Fiscale
  active: boolean("active").default(true),
  sortOrder: smallint("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLegalFormSchema = createInsertSchema(legalForms).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertLegalForm = z.infer<typeof insertLegalFormSchema>;
export type LegalForm = typeof legalForms.$inferSelect;

// Paesi
export const countries = pgTable("countries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 3 }).unique().notNull(), // ISO 3166-1
  name: varchar("name", { length: 100 }).notNull(),
  active: boolean("active").default(true),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCountrySchema = createInsertSchema(countries).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertCountry = z.infer<typeof insertCountrySchema>;
export type Country = typeof countries.$inferSelect;

// Città italiane
export const italianCities = pgTable("italian_cities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  province: varchar("province", { length: 2 }).notNull(), // Codice provincia (MI, RM, etc)
  provinceName: varchar("province_name", { length: 100 }).notNull(),
  region: varchar("region", { length: 100 }).notNull(),
  postalCode: varchar("postal_code", { length: 5 }).notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_italian_cities_name").on(table.name),
  index("idx_italian_cities_province").on(table.province),
  uniqueIndex("italian_cities_unique").on(table.name, table.province),
]);

export const insertItalianCitySchema = createInsertSchema(italianCities).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertItalianCity = z.infer<typeof insertItalianCitySchema>;
export type ItalianCity = typeof italianCities.$inferSelect;

// ==================== PAYMENT METHODS ====================
export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(), // 'bank_transfer', 'direct_debit', 'card', 'digital', 'cash', 'check'
  requiresIban: boolean("requires_iban").default(false),
  requiresAuth: boolean("requires_auth").default(false),
  supportsBatching: boolean("supports_batching").default(false),
  countryCode: varchar("country_code", { length: 3 }), // ISO 3166-1 (NULL = international)
  active: boolean("active").default(true),
  isDefault: boolean("is_default").default(false),
  sortOrder: smallint("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_payment_methods_category").on(table.category),
  index("idx_payment_methods_country").on(table.countryCode),
]);

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;

// ==================== PAYMENT CONDITIONS ====================
export const paymentMethodsConditions = pgTable("payment_methods_conditions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  days: smallint("days"), // Number of days for payment (30, 60, 90, etc.)
  type: varchar("type", { length: 50 }).notNull(), // 'standard', 'dffm', 'immediate', 'custom'
  calculation: varchar("calculation", { length: 50 }), // 'from_invoice', 'from_month_end', 'immediate'
  active: boolean("active").default(true),
  isDefault: boolean("is_default").default(false),
  sortOrder: smallint("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_payment_conditions_type").on(table.type),
  index("idx_payment_conditions_days").on(table.days),
]);

export const insertPaymentMethodsConditionSchema = createInsertSchema(paymentMethodsConditions).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertPaymentMethodsCondition = z.infer<typeof insertPaymentMethodsConditionSchema>;
export type PaymentMethodsCondition = typeof paymentMethodsConditions.$inferSelect;

// ==================== UTM SOURCES (Marketing Attribution) ====================
export const utmSources = pgTable("utm_sources", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // 'social', 'search', 'email', 'referral', 'direct', 'partner'
  iconUrl: text("icon_url"),
  isActive: boolean("is_active").default(true),
  sortOrder: smallint("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_utm_sources_category").on(table.category),
  index("idx_utm_sources_active").on(table.isActive),
]);

export const insertUtmSourceSchema = createInsertSchema(utmSources).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertUtmSource = z.infer<typeof insertUtmSourceSchema>;
export type UtmSource = typeof utmSources.$inferSelect;

// ==================== UTM MEDIUMS (Marketing Attribution) ====================
export const utmMediums = pgTable("utm_mediums", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  applicableSources: jsonb("applicable_sources").$type<string[]>(), // Array of source codes that can use this medium
  isActive: boolean("is_active").default(true),
  sortOrder: smallint("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_utm_mediums_active").on(table.isActive),
]);

export const insertUtmMediumSchema = createInsertSchema(utmMediums).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertUtmMedium = z.infer<typeof insertUtmMediumSchema>;
export type UtmMedium = typeof utmMediums.$inferSelect;

// ==================== VAT RATES (Aliquote IVA Italiane) ====================
export const vatRates = pgTable("vat_rates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).unique().notNull(), // STD, RID10, RID5, RID4, ESE
  name: varchar("name", { length: 100 }).notNull(), // Ordinaria, Ridotta 10%, etc.
  description: text("description"),
  ratePercent: varchar("rate_percent", { length: 10 }).notNull(), // "22.00", "10.00", "5.00", "4.00", "0.00"
  multiplier: varchar("multiplier", { length: 10 }).notNull(), // "1.22", "1.10", "1.05", "1.04", "1.00" - per calcolo lordo
  divisor: varchar("divisor", { length: 10 }).notNull(), // "0.8197", "0.9091", etc. - per scorporo IVA
  applicableProducts: text("applicable_products"), // Descrizione prodotti/servizi applicabili
  legalReference: varchar("legal_reference", { length: 100 }), // DPR 633/72, Allegato A, etc.
  naturaFeCode: varchar("natura_fe_code", { length: 10 }), // Codice Natura per fattura elettronica (N1, N2, N3, N4, etc.)
  effectiveFrom: timestamp("effective_from"),
  effectiveTo: timestamp("effective_to"),
  isActive: boolean("is_active").default(true),
  sortOrder: smallint("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_vat_rates_code").on(table.code),
  index("idx_vat_rates_active").on(table.isActive),
]);

export const insertVatRateSchema = createInsertSchema(vatRates).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertVatRate = z.infer<typeof insertVatRateSchema>;
export type VatRate = typeof vatRates.$inferSelect;

// ==================== VAT REGIMES (Regimi Fiscali Speciali Italiani) ====================
export const vatRegimes = pgTable("vat_regimes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).unique().notNull(), // STANDARD, ART10, ART17_RC, ART36_MARG, etc.
  name: varchar("name", { length: 150 }).notNull(), // Regime Ordinario, Esente Art.10, Reverse Charge, etc.
  description: text("description"),
  legalReference: varchar("legal_reference", { length: 200 }), // Art.10 DPR 633/72, Art.17 comma 6, etc.
  
  // Strategia di applicazione aliquota
  rateStrategy: varchar("rate_strategy", { length: 20 }).notNull(), // 'product_rate', 'fixed_rate', 'margin', 'excluded'
  fixedRateId: uuid("fixed_rate_id").references(() => vatRates.id), // Se rateStrategy='fixed_rate', usa questa aliquota
  
  // Chi paga l'IVA
  vatPayer: varchar("vat_payer", { length: 20 }).notNull(), // 'supplier', 'customer', 'pa', 'none'
  
  // Codici per fatturazione elettronica (SDI)
  naturaFeCode: varchar("natura_fe_code", { length: 10 }), // N1, N2.1, N2.2, N3.x, N4, N5, N6.x, N7
  
  // Nota da inserire in fattura (obbligatoria per regimi speciali)
  invoiceNote: text("invoice_note"), // "Operazione esente IVA ai sensi dell'art. 10 DPR 633/72"
  
  // Requisiti contabili
  requiresSeparateAccounting: boolean("requires_separate_accounting").default(false), // Contabilità separata Art.36
  supportsDeduction: boolean("supports_deduction").default(true), // Può detrarre IVA acquisti
  requiresStampDuty: boolean("requires_stamp_duty").default(false), // Marca da bollo €2 se > €77.47
  
  // Applicabilità
  applicableTo: text("applicable_to"), // PA, Costruzioni, Rottami, etc.
  
  effectiveFrom: timestamp("effective_from"),
  effectiveTo: timestamp("effective_to"),
  isActive: boolean("is_active").default(true),
  sortOrder: smallint("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_vat_regimes_code").on(table.code),
  index("idx_vat_regimes_rate_strategy").on(table.rateStrategy),
  index("idx_vat_regimes_vat_payer").on(table.vatPayer),
  index("idx_vat_regimes_active").on(table.isActive),
]);

export const insertVatRegimeSchema = createInsertSchema(vatRegimes).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertVatRegime = z.infer<typeof insertVatRegimeSchema>;
export type VatRegime = typeof vatRegimes.$inferSelect;

// ==================== SALES MODES (Modalità di Vendita) ====================
export const salesModes = pgTable("sales_modes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).unique().notNull(), // ALL, FIN, VAR
  name: varchar("name", { length: 100 }).notNull(), // "Tutte le modalità", "Finanziamento", "Rateizzazione"
  description: text("description"),
  requiresFinancialEntity: boolean("requires_financial_entity").default(false), // true solo per FIN
  requiresInstallmentMethod: boolean("requires_installment_method").default(false), // true solo per VAR
  isActive: boolean("is_active").default(true),
  displayOrder: smallint("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_sales_modes_code").on(table.code),
  index("idx_sales_modes_active").on(table.isActive),
]);

export const insertSalesModeSchema = createInsertSchema(salesModes).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertSalesMode = z.infer<typeof insertSalesModeSchema>;
export type SalesMode = typeof salesModes.$inferSelect;

// ==================== INSTALLMENT METHODS (Metodi Rateizzazione) ====================
export const installmentMethods = pgTable("installment_methods", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).unique().notNull(), // CREDIT_CARD, RID
  name: varchar("name", { length: 100 }).notNull(), // "Carta di Credito", "RID Bancario"
  description: text("description"),
  isActive: boolean("is_active").default(true),
  displayOrder: smallint("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_installment_methods_code").on(table.code),
  index("idx_installment_methods_active").on(table.isActive),
]);

export const insertInstallmentMethodSchema = createInsertSchema(installmentMethods).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertInstallmentMethod = z.infer<typeof insertInstallmentMethodSchema>;
export type InstallmentMethod = typeof installmentMethods.$inferSelect;