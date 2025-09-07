// Brand Interface Level Schema
// Tabelle dedicate per Brand Interface con tenant ID specifico

import { sql } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  timestamp,
  varchar,
  text,
  boolean,
  uuid,
  jsonb,
  date,
  uniqueIndex,
  smallint,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { tenants } from './index';

// ==================== BRAND LEVEL ENUMS ====================
export const campaignStatusEnum = pgEnum('campaign_status', ['draft', 'active', 'paused', 'completed', 'archived']);
export const campaignTypeEnum = pgEnum('campaign_type', ['global', 'tenant_specific', 'selective']);
export const deploymentStatusEnum = pgEnum('deployment_status', ['pending', 'in_progress', 'completed', 'failed']);

// ==================== BRAND CAMPAIGNS ====================
export const brandCampaigns = pgTable("brand_campaigns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id), // BRAND_INTERFACE tenant
  code: varchar("code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: campaignTypeEnum("type").notNull().default('global'),
  status: campaignStatusEnum("status").notNull().default('draft'),
  startDate: date("start_date"),
  endDate: date("end_date"),
  targetTenants: jsonb("target_tenants").default([]), // Array di tenant IDs per selective/tenant_specific
  content: jsonb("content").default({}), // Template, messaggi, assets
  settings: jsonb("settings").default({}), // Configurazioni specifiche
  metrics: jsonb("metrics").default({}), // KPI e risultati
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
}, (table) => [
  uniqueIndex("brand_campaigns_code_unique").on(table.code),
]);

export const insertBrandCampaignSchema = createInsertSchema(brandCampaigns).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertBrandCampaign = z.infer<typeof insertBrandCampaignSchema>;
export type BrandCampaign = typeof brandCampaigns.$inferSelect;

// ==================== BRAND PRICE LISTS ====================
export const brandPriceLists = pgTable("brand_price_lists", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id), // BRAND_INTERFACE tenant
  code: varchar("code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull(), // 'standard', 'promotional', 'special'
  validFrom: date("valid_from").notNull(),
  validTo: date("valid_to"),
  targetChannels: jsonb("target_channels").default([]), // Array di channel IDs
  targetBrands: jsonb("target_brands").default([]), // Array di brand IDs  
  priceData: jsonb("price_data").notNull(), // Struttura prezzi
  approval: jsonb("approval").default({}), // Workflow approvazione
  isActive: boolean("is_active").default(false),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("brand_price_lists_code_unique").on(table.code),
]);

export const insertBrandPriceListSchema = createInsertSchema(brandPriceLists).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertBrandPriceList = z.infer<typeof insertBrandPriceListSchema>;
export type BrandPriceList = typeof brandPriceLists.$inferSelect;

// ==================== BRAND TEMPLATES ====================
export const brandTemplates = pgTable("brand_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id), // BRAND_INTERFACE tenant
  code: varchar("code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // 'communication', 'pricing', 'promotion', 'report'
  version: varchar("version", { length: 20 }).notNull().default('1.0'),
  description: text("description"),
  templateData: jsonb("template_data").notNull(), // Struttura template
  variables: jsonb("variables").default([]), // Variabili personalizzabili
  preview: text("preview"), // Preview HTML/immagine
  isPublic: boolean("is_public").default(false),
  usageCount: smallint("usage_count").default(0),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("brand_templates_code_unique").on(table.code),
]);

export const insertBrandTemplateSchema = createInsertSchema(brandTemplates).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertBrandTemplate = z.infer<typeof insertBrandTemplateSchema>;
export type BrandTemplate = typeof brandTemplates.$inferSelect;

// ==================== BRAND DEPLOYMENTS ====================
export const brandDeployments = pgTable("brand_deployments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id), // BRAND_INTERFACE tenant
  campaignId: uuid("campaign_id").references(() => brandCampaigns.id),
  priceListId: uuid("price_list_id").references(() => brandPriceLists.id),
  type: varchar("type", { length: 50 }).notNull(), // 'campaign', 'price_list', 'template', 'config'
  targetType: varchar("target_type", { length: 50 }).notNull(), // 'all_tenants', 'selective', 'tenant_specific'
  targetTenants: jsonb("target_tenants").default([]), // Array tenant IDs
  status: deploymentStatusEnum("status").notNull().default('pending'),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  progress: jsonb("progress").default({}), // Tracking progresso
  results: jsonb("results").default({}), // Risultati deployment
  errors: jsonb("errors").default([]), // Errori eventuali
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBrandDeploymentSchema = createInsertSchema(brandDeployments).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertBrandDeployment = z.infer<typeof insertBrandDeploymentSchema>;
export type BrandDeployment = typeof brandDeployments.$inferSelect;

// ==================== BRAND CONFIGURATIONS ====================
export const brandConfigs = pgTable("brand_configs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id), // BRAND_INTERFACE tenant
  key: varchar("key", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // 'system', 'ui', 'business', 'integration'
  value: jsonb("value").notNull(),
  description: text("description"),
  isSecret: boolean("is_secret").default(false), // Per API keys, etc.
  isSystem: boolean("is_system").default(false), // Configurazioni di sistema
  validationRules: jsonb("validation_rules").default({}), // Regole validazione
  updatedBy: varchar("updated_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("brand_configs_tenant_key_unique").on(table.tenantId, table.key),
]);

export const insertBrandConfigSchema = createInsertSchema(brandConfigs).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertBrandConfig = z.infer<typeof insertBrandConfigSchema>;
export type BrandConfig = typeof brandConfigs.$inferSelect;