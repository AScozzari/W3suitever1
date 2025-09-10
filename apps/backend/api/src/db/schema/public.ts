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