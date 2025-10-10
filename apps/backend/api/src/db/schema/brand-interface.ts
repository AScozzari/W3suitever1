// Brand Interface Schema - Dedicated schema for Brand Interface system
// All tables in this file will be created in 'brand_interface' schema

import { sql } from 'drizzle-orm';
import {
  pgTable,
  pgEnum,
  pgSchema,
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

// ==================== BRAND INTERFACE SCHEMA ====================
export const brandInterfaceSchema = pgSchema("brand_interface");

// ==================== BRAND INTERFACE ENUMS ====================
export const brandRoleEnum = pgEnum('brand_role', ['area_manager', 'national_manager', 'super_admin']);
export const campaignStatusEnum = pgEnum('brand_campaign_status', ['draft', 'active', 'paused', 'completed', 'archived']);
export const campaignTypeEnum = pgEnum('brand_campaign_type', ['global', 'tenant_specific', 'selective']);
export const deploymentStatusEnum = pgEnum('brand_deployment_status', ['pending', 'in_progress', 'completed', 'failed']);

// ==================== BRAND TENANTS TABLE ====================
export const brandTenants = brandInterfaceSchema.table("brand_tenants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique(),
  type: varchar("type", { length: 50 }).default('brand_interface'),
  status: varchar("status", { length: 50 }).default('active'),
  settings: jsonb("settings").default({}),
  features: jsonb("features").default({}),
  brandAdminEmail: varchar("brand_admin_email", { length: 255 }),
  apiKey: varchar("api_key", { length: 255 }),
  allowedIpRanges: text("allowed_ip_ranges").array(),
  maxConcurrentUsers: smallint("max_concurrent_users").default(50),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
});

// ==================== BRAND USERS TABLE ====================
export const brandUsers = brandInterfaceSchema.table("brand_users", {
  id: varchar("id").primaryKey(), // mario.brand@company.com
  tenantId: uuid("tenant_id").notNull().references(() => brandTenants.id), // ← RLS KEY
  email: varchar("email", { length: 255 }).unique().notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  
  // RBAC Geografico Proprietario
  role: brandRoleEnum("role").notNull().default('area_manager'),
  commercialAreaCodes: text("commercial_area_codes").array(), // ["AREA_03"] o NULL per globale
  permissions: text("permissions").array().notNull(), // ["inventory:read", "sales:read"]
  
  // Brand Interface specifics
  department: varchar("department", { length: 100 }), // "marketing", "sales", "operations"
  hireDate: date("hire_date"),
  managerId: varchar("manager_id", { length: 255 }), // Self-reference
  
  // Security & Audit
  isActive: boolean("is_active").default(true),
  mfaEnabled: boolean("mfa_enabled").default(false),
  mfaSecret: varchar("mfa_secret", { length: 255 }), // TOTP secret
  lastLoginAt: timestamp("last_login_at"),
  failedLoginAttempts: smallint("failed_login_attempts").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("brand_users_email_unique").on(table.email),
]);

export const insertBrandUserSchema = createInsertSchema(brandUsers).omit({ 
  createdAt: true, 
  updatedAt: true 
});
export type InsertBrandUser = z.infer<typeof insertBrandUserSchema>;
export type BrandUser = typeof brandUsers.$inferSelect;

// ==================== BRAND ROLES TABLE ====================
export const brandRoles = brandInterfaceSchema.table("brand_roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => brandTenants.id), // ← RLS KEY
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  
  // Geographic scope
  isGlobal: boolean("is_global").default(false), // true = National Manager, false = Area Manager
  allowedAreas: text("allowed_areas").array(), // NULL = global, ["AREA_03"] = specific areas
  
  // Permissions
  permissions: text("permissions").array().notNull(),
  
  // Metadata
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("brand_roles_name_unique").on(table.tenantId, table.name), // Unique per tenant
]);

export const insertBrandRoleSchema = createInsertSchema(brandRoles).omit({ 
  id: true,
  createdAt: true, 
  updatedAt: true 
});
export type InsertBrandRole = z.infer<typeof insertBrandRoleSchema>;
export type BrandRole = typeof brandRoles.$inferSelect;

// ==================== BRAND AUDIT LOGS ====================
export const brandAuditLogs = brandInterfaceSchema.table("brand_audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => brandTenants.id), // ← RLS KEY
  userEmail: varchar("user_email", { length: 255 }).notNull(),
  userRole: varchar("user_role", { length: 100 }),
  commercialAreas: text("commercial_areas").array(), // Areas the user had access to
  
  // Action details
  action: varchar("action", { length: 100 }).notNull(), // "cross_tenant_stores_read", "price_list_deploy"
  resourceType: varchar("resource_type", { length: 100 }), // "stores", "campaigns", "price_lists"
  resourceIds: text("resource_ids").array(), // IDs of affected resources
  
  // Context
  targetTenants: text("target_tenants").array(), // Which tenants were affected
  metadata: jsonb("metadata").default({}), // Additional context
  ipAddress: varchar("ip_address", { length: 45 }), // IPv4/IPv6
  userAgent: text("user_agent"),
  
  // Timing
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBrandAuditLogSchema = createInsertSchema(brandAuditLogs).omit({ 
  id: true,
  createdAt: true 
});
export type InsertBrandAuditLog = z.infer<typeof insertBrandAuditLogSchema>;
export type BrandAuditLog = typeof brandAuditLogs.$inferSelect;

// ==================== MIGRATED BRAND TABLES (from old brand.ts) ====================

// BRAND CAMPAIGNS - Migrated to brand_interface schema
export const brandCampaigns = brandInterfaceSchema.table("brand_campaigns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
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

// BRAND PRICE LISTS - Migrated to brand_interface schema
export const brandPriceLists = brandInterfaceSchema.table("brand_price_lists", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
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

// BRAND TEMPLATES - Migrated to brand_interface schema
export const brandTemplates = brandInterfaceSchema.table("brand_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
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

// BRAND DEPLOYMENTS - Migrated to brand_interface schema
export const brandDeployments = brandInterfaceSchema.table("brand_deployments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: uuid("campaign_id"),
  priceListId: uuid("price_list_id"),
  type: varchar("type", { length: 50 }).notNull(), // 'campaign', 'price_list', 'template', 'config'
  targetType: varchar("target_type", { length: 50 }).notNull(), // 'all_tenants', 'selective', 'tenant_specific'
  targetTenants: jsonb("target_tenants").default([]), // Array tenant IDs
  status: deploymentStatusEnum("status").notNull().default('pending'),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  results: jsonb("results").default({}), // Risultati deployment
  errors: jsonb("errors").default([]), // Errori durante deployment
  metadata: jsonb("metadata").default({}), // Metadati aggiuntivi
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

// BRAND CONFIGS - Migrated to brand_interface schema
export const brandConfigs = brandInterfaceSchema.table("brand_configs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).unique().notNull(),
  value: jsonb("value").notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(), // 'pricing', 'campaigns', 'templates', 'deployment'
  isEncrypted: boolean("is_encrypted").default(false),
  accessLevel: varchar("access_level", { length: 50 }).default('global'), // 'global', 'regional', 'tenant_specific'
  allowedRoles: text("allowed_roles").array().default(['super_admin']),
  lastModifiedBy: varchar("last_modified_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("brand_configs_key_unique").on(table.key),
]);

export const insertBrandConfigSchema = createInsertSchema(brandConfigs).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertBrandConfig = z.infer<typeof insertBrandConfigSchema>;
export type BrandConfig = typeof brandConfigs.$inferSelect;

// ==================== ORGANIZATION ANALYTICS TYPES ====================
// Data contracts for organizational analytics - computed at runtime, not persisted

export const organizationAnalyticsSchema = z.object({
  organizationId: z.string().uuid(),
  organizationName: z.string(),
  structureBreakdown: z.object({
    legalEntities: z.object({
      total: z.number(),
      active: z.number(),
      inactive: z.number(),
      breakdown: z.array(z.object({
        id: z.string(),
        nome: z.string(),
        formaGiuridica: z.string().optional(),
        status: z.string()
      }))
    }),
    stores: z.object({
      total: z.number(),
      active: z.number(),
      inactive: z.number(),
      breakdown: z.array(z.object({
        id: z.string(),
        nome: z.string(),
        tipo: z.string().optional(),
        citta: z.string().optional(),
        status: z.string()
      }))
    }),
    users: z.object({
      total: z.number(),
      active: z.number(),
      inactive: z.number(),
      byRole: z.array(z.object({
        role: z.string(),
        count: z.number()
      }))
    })
  }),
  aiTokenStatus: z.object({
    hasAIIntegration: z.boolean(),
    totalTokensUsed: z.number(),
    totalTokensAvailable: z.number().optional(),
    lastUsage: z.string().optional(),
    activeConnections: z.number(),
    usageByCategory: z.array(z.object({
      category: z.string(),
      tokens: z.number(),
      percentage: z.number()
    }))
  }),
  systemHealth: z.object({
    overallStatus: z.enum(['healthy', 'warning', 'critical']),
    services: z.array(z.object({
      name: z.string(),
      status: z.enum(['active', 'inactive', 'error']),
      uptime: z.string().optional(),
      lastCheck: z.string()
    })),
    connections: z.object({
      database: z.boolean(),
      redis: z.boolean(),
      websocket: z.boolean()
    })
  }),
  databaseUsage: z.object({
    totalSize: z.string(), // "125.4 MB"
    categoryBreakdown: z.array(z.object({
      category: z.string(), // "users", "stores", "products", "logs"
      size: z.string(),
      tableCount: z.number(),
      recordCount: z.number(),
      percentage: z.number()
    })),
    recentGrowth: z.object({
      lastWeek: z.string(),
      lastMonth: z.string()
    })
  }),
  fileInventory: z.object({
    totalFiles: z.number(),
    totalSize: z.string(),
    categoryBreakdown: z.array(z.object({
      category: z.string(), // "images", "documents", "uploads", "cache"
      fileCount: z.number(),
      size: z.string(),
      percentage: z.number()
    })),
    recentActivity: z.object({
      uploadsLastWeek: z.number(),
      uploadsLastMonth: z.number()
    })
  }),
  generatedAt: z.string()
});

export type OrganizationAnalytics = z.infer<typeof organizationAnalyticsSchema>;

// ==================== AI PDC ANALYZER SYSTEM ====================

// PDC Analysis Status Enum
export const pdcAnalysisStatusEnum = pgEnum('pdc_analysis_status', ['pending', 'analyzing', 'review', 'training', 'completed', 'failed']);

// ==================== AI PDC ANALYSIS SESSIONS ====================
// Multi-PDF analysis sessions with attachment rate tracking
export const aiPdcAnalysisSessions = brandInterfaceSchema.table("ai_pdc_analysis_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull(), // Reference to w3suite.tenants
  userId: varchar("user_id", { length: 255 }).notNull(), // Reference to w3suite.users
  
  // Session metadata
  sessionName: varchar("session_name", { length: 255 }),
  status: pdcAnalysisStatusEnum("status").notNull().default('pending'),
  totalPdfs: smallint("total_pdfs").default(0),
  processedPdfs: smallint("processed_pdfs").default(0),
  
  // Analysis results summary
  extractedCustomers: jsonb("extracted_customers").default([]), // Array of customer data from all PDFs
  extractedProducts: jsonb("extracted_products").default([]), // Array of all products found
  attachmentRate: jsonb("attachment_rate").default({}), // Product attachment analysis
  
  // Final output
  finalJson: jsonb("final_json"), // Consolidated JSON for cashier API
  exportedAt: timestamp("exported_at"),
  
  // Training feedback
  wasUsedForTraining: boolean("was_used_for_training").default(false),
  trainingFeedback: text("training_feedback"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertAiPdcAnalysisSessionSchema = createInsertSchema(aiPdcAnalysisSessions).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertAiPdcAnalysisSession = z.infer<typeof insertAiPdcAnalysisSessionSchema>;
export type AiPdcAnalysisSession = typeof aiPdcAnalysisSessions.$inferSelect;

// ==================== AI PDC TRAINING DATASET ====================
// Cross-tenant training data: validated PDF analyses for AI learning
export const aiPdcTrainingDataset = brandInterfaceSchema.table("ai_pdc_training_dataset", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").notNull().references(() => aiPdcAnalysisSessions.id, { onDelete: 'cascade' }),
  
  // PDF reference
  pdfUrl: text("pdf_url").notNull(), // Object storage URL
  pdfFileName: varchar("pdf_file_name", { length: 255 }),
  pdfHash: varchar("pdf_hash", { length: 64 }), // SHA256 for deduplication
  
  // AI extraction (initial)
  aiExtractedData: jsonb("ai_extracted_data").notNull(), // Raw AI output
  aiModel: varchar("ai_model", { length: 100 }).default('gpt-4-vision-preview'),
  aiConfidence: smallint("ai_confidence"), // 0-100
  
  // Human validation (corrected)
  correctedJson: jsonb("corrected_json").notNull(), // Human-validated JSON
  correctionNotes: text("correction_notes"), // What was fixed
  validatedBy: varchar("validated_by", { length: 255 }).notNull(), // User who validated
  
  // Product mapping
  driverMapping: jsonb("driver_mapping"), // { driver, category, typology, product }
  serviceType: varchar("service_type", { length: 100 }), // "Fisso", "Mobile", etc.
  
  // Training metadata
  isPublicTraining: boolean("is_public_training").default(true), // Cross-tenant vs tenant-specific
  sourceTenantId: uuid("source_tenant_id"), // Which tenant contributed this
  useCount: smallint("use_count").default(0), // How many times used for training
  successRate: smallint("success_rate"), // 0-100 - accuracy in subsequent matches
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("ai_pdc_training_pdf_hash_unique").on(table.pdfHash),
]);

export const insertAiPdcTrainingDatasetSchema = createInsertSchema(aiPdcTrainingDataset).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertAiPdcTrainingDataset = z.infer<typeof insertAiPdcTrainingDatasetSchema>;
export type AiPdcTrainingDataset = typeof aiPdcTrainingDataset.$inferSelect;

// ==================== CROSS-TENANT KNOWLEDGE - USE W3SUITE SCHEMA ====================
// 
// 🎯 NOTA ARCHITETTURALE: 
// Il Brand Interface training salva direttamente in w3suite.vectorEmbeddings con:
// - origin = 'brand' (cross-tenant)
// - origin = 'tenant' (tenant-specific override)
// 
// Non servono tabelle duplicate - usiamo l'architettura esistente!