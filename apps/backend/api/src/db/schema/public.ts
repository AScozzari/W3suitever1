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

// ==================== BUSINESS DRIVERS ====================
export const drivers = pgTable("drivers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDriverSchema = createInsertSchema(drivers).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof drivers.$inferSelect;

// ==================== DRIVER CATEGORIES (Brand Official) ====================
export const driverCategories = pgTable("driver_categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: uuid("driver_id").notNull().references(() => drivers.id, { onDelete: 'cascade' }),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  active: boolean("active").default(true),
  sortOrder: smallint("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_driver_categories_driver").on(table.driverId),
  uniqueIndex("driver_categories_unique").on(table.driverId, table.code),
]);

export const insertDriverCategorySchema = createInsertSchema(driverCategories).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertDriverCategory = z.infer<typeof insertDriverCategorySchema>;
export type DriverCategory = typeof driverCategories.$inferSelect;

// ==================== DRIVER TYPOLOGIES (Brand Official) ====================
export const driverTypologies = pgTable("driver_typologies", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: uuid("category_id").notNull().references(() => driverCategories.id, { onDelete: 'cascade' }),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  active: boolean("active").default(true),
  sortOrder: smallint("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_driver_typologies_category").on(table.categoryId),
  uniqueIndex("driver_typologies_unique").on(table.categoryId, table.code),
]);

export const insertDriverTypologySchema = createInsertSchema(driverTypologies).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertDriverTypology = z.infer<typeof insertDriverTypologySchema>;
export type DriverTypology = typeof driverTypologies.$inferSelect;

// ==================== REFERENCE TABLES ====================

// Forme giuridiche italiane
export const legalForms = pgTable("legal_forms", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  minCapital: varchar("min_capital", { length: 50 }),
  liability: varchar("liability", { length: 50 }), // "limited", "unlimited", "mixed"
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