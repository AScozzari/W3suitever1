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
  integer,
  index,
  real,
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

// WMS (Warehouse Management System) Enums
export const wmsDeploymentStatusEnum = pgEnum('wms_deployment_status', ['draft', 'deployed', 'archived']);
export const brandProductTypeEnum = pgEnum('brand_product_type', ['PHYSICAL', 'VIRTUAL', 'SERVICE', 'CANVAS']);
export const brandProductStatusEnum = pgEnum('brand_product_status', ['active', 'inactive', 'discontinued', 'draft']);
export const brandProductConditionEnum = pgEnum('brand_product_condition', ['new', 'used', 'refurbished', 'demo']);
export const brandSerialTypeEnum = pgEnum('brand_serial_type', ['imei', 'iccid', 'mac_address', 'other']);
export const brandSupplierTypeEnum = pgEnum('brand_supplier_type', ['distributore', 'produttore', 'servizi', 'logistica']);
export const brandSupplierStatusEnum = pgEnum('brand_supplier_status', ['active', 'suspended', 'blocked']);

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

// ==================== AI PDC PDF UPLOADS ====================
// Individual PDF files uploaded to a session
export const aiPdcPdfUploads = brandInterfaceSchema.table("ai_pdc_pdf_uploads", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: uuid("session_id").notNull().references(() => aiPdcAnalysisSessions.id, { onDelete: 'cascade' }),
  
  // PDF file info
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(), // Object storage URL
  fileHash: varchar("file_hash", { length: 64 }), // SHA256 for deduplication
  fileSize: integer("file_size"), // bytes
  
  // Analysis status
  status: pdcAnalysisStatusEnum("status").notNull().default('pending'),
  aiModel: varchar("ai_model", { length: 100 }).default('gpt-4o'),
  aiConfidence: smallint("ai_confidence"), // 0-100
  
  // Timestamps
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  analyzedAt: timestamp("analyzed_at"),
  reviewedAt: timestamp("reviewed_at"),
}, (table) => [
  index("idx_pdc_uploads_session").on(table.sessionId),
  index("idx_pdc_uploads_status").on(table.status),
]);

export const insertAiPdcPdfUploadSchema = createInsertSchema(aiPdcPdfUploads).omit({ 
  id: true, 
  uploadedAt: true 
});
export type InsertAiPdcPdfUpload = z.infer<typeof insertAiPdcPdfUploadSchema>;
export type AiPdcPdfUpload = typeof aiPdcPdfUploads.$inferSelect;

// ==================== AI PDC EXTRACTED DATA ====================
// Customer and service data extracted from each PDF
export const aiPdcExtractedData = brandInterfaceSchema.table("ai_pdc_extracted_data", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  pdfId: uuid("pdf_id").notNull().references(() => aiPdcPdfUploads.id, { onDelete: 'cascade' }),
  sessionId: uuid("session_id").notNull().references(() => aiPdcAnalysisSessions.id, { onDelete: 'cascade' }),
  
  // Customer data (anagrafica)
  customerType: varchar("customer_type", { length: 50 }), // 'business' | 'private'
  customerData: jsonb("customer_data").notNull(), // { nome, cognome, cf, piva, indirizzo, telefono, email, etc }
  
  // Service data
  servicesExtracted: jsonb("services_extracted").notNull(), // Array of services found
  
  // AI extraction metadata
  aiRawOutput: jsonb("ai_raw_output"), // Full AI response
  extractionMethod: varchar("extraction_method", { length: 100 }).default('gpt-4o-vision'),
  
  // Human review
  wasReviewed: boolean("was_reviewed").default(false),
  reviewedBy: varchar("reviewed_by", { length: 255 }),
  correctedData: jsonb("corrected_data"), // User corrections
  reviewNotes: text("review_notes"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
}, (table) => [
  index("idx_pdc_extracted_pdf").on(table.pdfId),
  index("idx_pdc_extracted_session").on(table.sessionId),
  index("idx_pdc_extracted_reviewed").on(table.wasReviewed),
]);

export const insertAiPdcExtractedDataSchema = createInsertSchema(aiPdcExtractedData).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertAiPdcExtractedData = z.infer<typeof insertAiPdcExtractedDataSchema>;
export type AiPdcExtractedData = typeof aiPdcExtractedData.$inferSelect;

// ==================== AI PDC SERVICE MAPPING ====================
// Maps extracted services to WindTre product hierarchy (Driver → Category → Typology → Product)
export const aiPdcServiceMapping = brandInterfaceSchema.table("ai_pdc_service_mapping", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  extractedDataId: uuid("extracted_data_id").notNull().references(() => aiPdcExtractedData.id, { onDelete: 'cascade' }),
  
  // Extracted service text
  serviceTextExtracted: text("service_text_extracted").notNull(), // Raw text from PDF
  serviceDescription: text("service_description"), // AI interpretation
  
  // WindTre Hierarchy Mapping
  driverId: uuid("driver_id"), // References public.drivers (Fisso, Mobile, Energia, etc)
  categoryId: uuid("category_id"), // References public.driver_categories OR w3suite.tenant_driver_categories
  typologyId: uuid("typology_id"), // References public.driver_typologies OR w3suite.tenant_driver_typologies
  productId: uuid("product_id"), // References w3suite.products (tenant inventory)
  
  // Mapping metadata
  mappingConfidence: smallint("mapping_confidence"), // 0-100
  mappingMethod: varchar("mapping_method", { length: 100 }).default('ai-auto'), // 'ai-auto' | 'manual' | 'training-match'
  mappedBy: varchar("mapped_by", { length: 255 }), // User ID if manual
  
  // Training integration
  wasUsedForTraining: boolean("was_used_for_training").default(false),
  trainingDatasetId: uuid("training_dataset_id").references(() => aiPdcTrainingDataset.id),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_pdc_mapping_extracted").on(table.extractedDataId),
  index("idx_pdc_mapping_driver").on(table.driverId),
  index("idx_pdc_mapping_training").on(table.wasUsedForTraining),
]);

export const insertAiPdcServiceMappingSchema = createInsertSchema(aiPdcServiceMapping).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertAiPdcServiceMapping = z.infer<typeof insertAiPdcServiceMappingSchema>;
export type AiPdcServiceMapping = typeof aiPdcServiceMapping.$inferSelect;

// ==================== CRM BRAND TEMPLATES ====================

// Brand CRM Campaigns - Template centralizzati per campagne
export const brandCrmCampaigns = brandInterfaceSchema.table("brand_crm_campaigns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: uuid("brand_id").notNull(), // For RLS
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  templateConfig: jsonb("template_config").notNull(), // {type, utm_defaults, budget_suggestion, recommended_channels}
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_brand_crm_campaigns_brand").on(table.brandId),
]);

export const insertBrandCrmCampaignSchema = createInsertSchema(brandCrmCampaigns).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertBrandCrmCampaign = z.infer<typeof insertBrandCrmCampaignSchema>;
export type BrandCrmCampaign = typeof brandCrmCampaigns.$inferSelect;

// Brand CRM Pipelines - Template centralizzati per pipeline
export const brandCrmPipelines = brandInterfaceSchema.table("brand_crm_pipelines", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: uuid("brand_id").notNull(), // For RLS
  name: varchar("name", { length: 255 }).notNull(),
  domain: varchar("domain", { length: 50 }).notNull(), // 'sales', 'service', 'retention'
  defaultStages: jsonb("default_stages").notNull(), // [{order:1, name:'Contatto', category:'new', color:'#ff6900'}]
  recommendedWorkflows: jsonb("recommended_workflows"), // Array of workflow IDs or configs
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_brand_crm_pipelines_brand").on(table.brandId),
]);

export const insertBrandCrmPipelineSchema = createInsertSchema(brandCrmPipelines).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertBrandCrmPipeline = z.infer<typeof insertBrandCrmPipelineSchema>;
export type BrandCrmPipeline = typeof brandCrmPipelines.$inferSelect;

// Brand Template Deployments - Tracking dei template pushati ai tenant
export const brandTemplateDeployments = brandInterfaceSchema.table("brand_template_deployments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  templateType: varchar("template_type", { length: 50 }).notNull(), // 'campaign', 'pipeline', 'workflow'
  brandTemplateId: uuid("brand_template_id").notNull(), // References brand_crm_campaigns.id or brand_crm_pipelines.id
  tenantId: uuid("tenant_id").notNull(), // Target tenant
  deployedEntityId: uuid("deployed_entity_id").notNull(), // ID dell'entità creata nel tenant (w3suite.crm_campaigns.id, etc)
  deployedAt: timestamp("deployed_at").defaultNow(),
}, (table) => [
  index("idx_brand_template_deployments_template").on(table.templateType, table.brandTemplateId),
  index("idx_brand_template_deployments_tenant").on(table.tenantId),
]);

export const insertBrandTemplateDeploymentSchema = createInsertSchema(brandTemplateDeployments).omit({ 
  id: true, 
  deployedAt: true 
});
export type InsertBrandTemplateDeployment = z.infer<typeof insertBrandTemplateDeploymentSchema>;
export type BrandTemplateDeployment = typeof brandTemplateDeployments.$inferSelect;

// Brand AI Agents - Centralized AI agent configuration
export const brandAiAgents = brandInterfaceSchema.table("brand_ai_agents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  brandId: uuid("brand_id").notNull(), // For RLS
  
  // Agent Identity
  agentId: varchar("agent_id", { length: 100 }).notNull().unique(), // 'lead-routing-agent', 'tippy-sales', etc.
  agentName: varchar("agent_name", { length: 255 }).notNull(),
  agentDescription: text("agent_description"),
  
  // AI Configuration
  model: varchar("model", { length: 50 }).default('gpt-4o').notNull(),
  temperature: real("temperature").default(0.3).notNull(), // 0.0-2.0
  maxTokens: integer("max_tokens").default(1000).notNull(),
  systemPrompt: text("system_prompt").notNull(),
  responseFormat: varchar("response_format", { length: 20 }).default('json_object'), // 'text', 'json_object'
  
  // Feature Flags
  isActive: boolean("is_active").default(true).notNull(),
  enabledForWorkflows: boolean("enabled_for_workflows").default(true).notNull(),
  
  // Deployment
  deployToAllTenants: boolean("deploy_to_all_tenants").default(true).notNull(),
  specificTenants: jsonb("specific_tenants"), // Array of tenant IDs if not deploy to all
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_brand_ai_agents_brand").on(table.brandId),
  index("idx_brand_ai_agents_agent_id").on(table.agentId),
]);

export const insertBrandAiAgentSchema = createInsertSchema(brandAiAgents).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertBrandAiAgent = z.infer<typeof insertBrandAiAgentSchema>;
export type BrandAiAgent = typeof brandAiAgents.$inferSelect;

// ==================== WMS (WAREHOUSE MANAGEMENT SYSTEM) - BRAND MASTER CATALOG ====================

// 1) brand_categories - Master product categories (deployed to tenants)
export const brandCategories = brandInterfaceSchema.table("brand_categories", {
  id: varchar("id", { length: 100 }).primaryKey(), // Reused across tenants (VARCHAR for consistency with w3suite)
  
  // Deployment tracking
  deploymentStatus: wmsDeploymentStatusEnum("deployment_status").default('draft').notNull(),
  deployedToCount: integer("deployed_to_count").default(0).notNull(), // How many tenants have this
  lastDeployedAt: timestamp("last_deployed_at"),
  
  // Product type hierarchy
  productType: brandProductTypeEnum("product_type").default('PHYSICAL').notNull(),
  
  // Category hierarchy (self-referencing for multi-level trees)
  parentCategoryId: varchar("parent_category_id", { length: 100 }).references((): any => brandCategories.id, { onDelete: 'restrict' }), // FK for hierarchical structure
  
  // Category info
  nome: varchar("nome", { length: 255 }).notNull(),
  descrizione: text("descrizione"),
  icona: varchar("icona", { length: 100 }),
  ordine: integer("ordine").default(0).notNull(),
  
  // Status
  isActive: boolean("is_active").default(true).notNull(),
  archivedAt: timestamp("archived_at"),
  
  // Audit fields
  createdBy: varchar("created_by").notNull(),
  modifiedBy: varchar("modified_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("brand_categories_nome_parent_unique").on(table.nome, table.parentCategoryId), // Prevent sibling dupes
  index("brand_categories_deployment_status_idx").on(table.deploymentStatus),
  index("brand_categories_product_type_idx").on(table.productType),
  index("brand_categories_parent_idx").on(table.parentCategoryId), // Tree queries
]);

export const insertBrandCategorySchema = createInsertSchema(brandCategories).omit({
  id: true,
  deploymentStatus: true,
  deployedToCount: true,
  lastDeployedAt: true,
  isActive: true,
  archivedAt: true,
  createdBy: true,
  modifiedBy: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  productType: z.enum(['PHYSICAL', 'VIRTUAL', 'SERVICE', 'CANVAS']),
  parentCategoryId: z.string().max(100).optional(),
  nome: z.string().min(1, "Nome categoria obbligatorio").max(255),
  descrizione: z.string().optional(),
  icona: z.string().max(100).optional(),
  ordine: z.coerce.number().int().default(0),
});

export const updateBrandCategorySchema = insertBrandCategorySchema.partial();
export type InsertBrandCategory = z.infer<typeof insertBrandCategorySchema>;
export type UpdateBrandCategory = z.infer<typeof updateBrandCategorySchema>;
export type BrandCategory = typeof brandCategories.$inferSelect;

// 2) brand_product_types - Master product types (deployed to tenants)
export const brandProductTypes = brandInterfaceSchema.table("brand_product_types", {
  id: varchar("id", { length: 100 }).primaryKey(), // Reused across tenants (VARCHAR for consistency)
  
  // Deployment tracking
  deploymentStatus: wmsDeploymentStatusEnum("deployment_status").default('draft').notNull(),
  deployedToCount: integer("deployed_to_count").default(0).notNull(),
  lastDeployedAt: timestamp("last_deployed_at"),
  
  // Foreign key to category
  categoryId: varchar("category_id", { length: 100 }).notNull().references(() => brandCategories.id, { onDelete: 'restrict' }),
  
  // Type info
  nome: varchar("nome", { length: 255 }).notNull(),
  descrizione: text("descrizione"),
  ordine: integer("ordine").default(0).notNull(),
  
  // Status
  isActive: boolean("is_active").default(true).notNull(),
  archivedAt: timestamp("archived_at"),
  
  // Audit fields
  createdBy: varchar("created_by").notNull(),
  modifiedBy: varchar("modified_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("brand_types_category_nome_unique").on(table.categoryId, table.nome),
  index("brand_types_category_idx").on(table.categoryId),
  index("brand_types_deployment_status_idx").on(table.deploymentStatus),
]);

export const insertBrandProductTypeSchema = createInsertSchema(brandProductTypes).omit({
  id: true,
  deploymentStatus: true,
  deployedToCount: true,
  lastDeployedAt: true,
  isActive: true,
  archivedAt: true,
  createdBy: true,
  modifiedBy: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  categoryId: z.string().min(1, "ID categoria obbligatorio").max(100),
  nome: z.string().min(1, "Nome tipologia obbligatorio").max(255),
  descrizione: z.string().optional(),
  ordine: z.coerce.number().int().default(0),
});

export const updateBrandProductTypeSchema = insertBrandProductTypeSchema.partial();
export type InsertBrandProductType = z.infer<typeof insertBrandProductTypeSchema>;
export type UpdateBrandProductType = z.infer<typeof updateBrandProductTypeSchema>;
export type BrandProductType = typeof brandProductTypes.$inferSelect;

// 3) brand_products - Master products (deployed to tenants)
export const brandProducts = brandInterfaceSchema.table("brand_products", {
  id: varchar("id", { length: 100 }).primaryKey(), // Reused across tenants (VARCHAR for consistency)
  
  // Deployment tracking
  deploymentStatus: wmsDeploymentStatusEnum("deployment_status").default('draft').notNull(),
  deployedToCount: integer("deployed_to_count").default(0).notNull(),
  lastDeployedAt: timestamp("last_deployed_at"),
  
  // Core product info
  sku: varchar("sku", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  model: varchar("model", { length: 255 }),
  description: text("description"),
  notes: text("notes"),
  brand: varchar("brand", { length: 100 }),
  ean: varchar("ean", { length: 13 }),
  memory: varchar("memory", { length: 50 }),
  color: varchar("color", { length: 50 }),
  imageUrl: varchar("image_url", { length: 512 }),
  
  // Product categorization
  categoryId: varchar("category_id", { length: 100 }).references(() => brandCategories.id, { onDelete: 'restrict' }),
  typeId: varchar("type_id", { length: 100 }).references(() => brandProductTypes.id, { onDelete: 'restrict' }),
  type: brandProductTypeEnum("type").notNull(),
  status: brandProductStatusEnum("status").default('active').notNull(),
  condition: brandProductConditionEnum("condition"),
  isSerializable: boolean("is_serializable").default(false).notNull(),
  serialType: brandSerialTypeEnum("serial_type"),
  monthlyFee: real("monthly_fee"),
  
  // Validity period
  validFrom: date("valid_from"),
  validTo: date("valid_to"),
  
  // Physical properties
  weight: real("weight"),
  dimensions: jsonb("dimensions"),
  
  // Attachments
  attachments: jsonb("attachments").default([]),
  
  // Stock management defaults (for tenant initialization)
  reorderPoint: integer("reorder_point").default(0).notNull(),
  unitOfMeasure: varchar("unit_of_measure", { length: 20 }).default('pz').notNull(),
  
  // Status
  isActive: boolean("is_active").default(true).notNull(),
  archivedAt: timestamp("archived_at"),
  
  // Audit fields
  createdBy: varchar("created_by").notNull(),
  modifiedBy: varchar("modified_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("brand_products_sku_unique").on(table.sku),
  index("brand_products_deployment_status_idx").on(table.deploymentStatus),
  index("brand_products_type_idx").on(table.type),
  index("brand_products_status_idx").on(table.status),
  index("brand_products_ean_idx").on(table.ean),
  index("brand_products_category_idx").on(table.categoryId),
  index("brand_products_type_id_idx").on(table.typeId),
]);

export const insertBrandProductSchema = createInsertSchema(brandProducts).omit({
  id: true,
  deploymentStatus: true,
  deployedToCount: true,
  lastDeployedAt: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  createdBy: true,
  modifiedBy: true,
}).extend({
  sku: z.string().min(1, "SKU è obbligatorio").max(100),
  name: z.string().min(1, "Descrizione è obbligatoria").max(255),
  model: z.string().max(255).optional(),
  notes: z.string().optional(),
  brand: z.string().max(100).optional(),
  imageUrl: z.string().max(512).url("URL immagine non valido").or(z.literal('')).optional(),
  type: z.enum(['PHYSICAL', 'VIRTUAL', 'SERVICE', 'CANVAS']),
  status: z.enum(['active', 'inactive', 'discontinued', 'draft']).optional(),
  condition: z.enum(['new', 'used', 'refurbished', 'demo']).optional(),
  serialType: z.enum(['imei', 'iccid', 'mac_address', 'other']).optional(),
  monthlyFee: z.coerce.number().min(0).optional(),
  ean: z.string().regex(/^\d{13}$/, "EAN deve essere di 13 cifre").or(z.literal('')).optional(),
  memory: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  categoryId: z.string().max(100).optional(),
  typeId: z.string().max(100).optional(),
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().optional(),
  weight: z.coerce.number().min(0).optional(),
  dimensions: z.any().optional(),
  attachments: z.any().optional(),
  reorderPoint: z.coerce.number().int().default(0),
  unitOfMeasure: z.string().max(20).default('pz'),
  isSerializable: z.boolean().default(false),
  isActive: z.boolean().optional(),
});

export const updateBrandProductSchema = insertBrandProductSchema.partial();
export type InsertBrandProduct = z.infer<typeof insertBrandProductSchema>;
export type UpdateBrandProduct = z.infer<typeof updateBrandProductSchema>;
export type BrandProduct = typeof brandProducts.$inferSelect;

// 4) brand_suppliers - Master suppliers (deployed to tenants)
export const brandSuppliers = brandInterfaceSchema.table("brand_suppliers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Deployment tracking
  deploymentStatus: wmsDeploymentStatusEnum("deployment_status").default('draft').notNull(),
  deployedToCount: integer("deployed_to_count").default(0).notNull(),
  lastDeployedAt: timestamp("last_deployed_at"),
  
  // Identity & classification
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  legalName: varchar("legal_name", { length: 255 }),
  legalForm: varchar("legal_form", { length: 100 }),
  supplierType: brandSupplierTypeEnum("supplier_type").notNull(),
  
  // Italian fiscal data
  vatNumber: varchar("vat_number", { length: 20 }),
  taxCode: varchar("tax_code", { length: 20 }),
  sdiCode: varchar("sdi_code", { length: 20 }),
  pecEmail: varchar("pec_email", { length: 255 }),
  reaNumber: varchar("rea_number", { length: 50 }),
  chamberOfCommerce: varchar("chamber_of_commerce", { length: 255 }),
  
  // Address
  registeredAddress: jsonb("registered_address"),
  cityId: uuid("city_id"), // Reference to public.italian_cities (will be set on deploy)
  countryId: uuid("country_id"), // Reference to public.countries (will be set on deploy)
  
  // Payments
  preferredPaymentMethodId: uuid("preferred_payment_method_id"), // Reference to public.payment_methods
  paymentConditionId: uuid("payment_condition_id"), // Reference to public.payment_methods_conditions
  paymentTerms: varchar("payment_terms", { length: 100 }),
  currency: varchar("currency", { length: 3 }).default("EUR"),
  
  // Contacts
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  website: varchar("website", { length: 255 }),
  contacts: jsonb("contacts").default({}),
  
  // Administrative
  iban: varchar("iban", { length: 34 }),
  bic: varchar("bic", { length: 11 }),
  splitPayment: boolean("split_payment").default(false),
  withholdingTax: boolean("withholding_tax").default(false),
  taxRegime: varchar("tax_regime", { length: 100 }),
  
  // Status
  status: brandSupplierStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
  
  // Audit fields
  createdBy: varchar("created_by").notNull(),
  updatedBy: varchar("updated_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("brand_suppliers_code_unique").on(table.code),
  index("brand_suppliers_deployment_status_idx").on(table.deploymentStatus),
  index("brand_suppliers_status_idx").on(table.status),
  index("brand_suppliers_vat_number_idx").on(table.vatNumber),
  index("brand_suppliers_name_idx").on(table.name),
]);

export const insertBrandSupplierSchema = createInsertSchema(brandSuppliers).omit({
  id: true,
  deploymentStatus: true,
  deployedToCount: true,
  lastDeployedAt: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  code: z.string().min(1, "Codice fornitore obbligatorio").max(50),
  name: z.string().min(1, "Nome fornitore obbligatorio").max(255),
  legalName: z.string().max(255).optional(),
  legalForm: z.string().max(100).optional(),
  supplierType: z.enum(['distributore', 'produttore', 'servizi', 'logistica']),
  vatNumber: z.string().max(20).optional(),
  taxCode: z.string().max(20).optional(),
  sdiCode: z.string().max(20).optional(),
  pecEmail: z.string().email("Email PEC non valida").max(255).optional(),
  reaNumber: z.string().max(50).optional(),
  chamberOfCommerce: z.string().max(255).optional(),
  registeredAddress: z.any().optional(),
  cityId: z.string().uuid().optional(),
  countryId: z.string().uuid().optional(),
  preferredPaymentMethodId: z.string().uuid().optional(),
  paymentConditionId: z.string().uuid().optional(),
  paymentTerms: z.string().max(100).optional(),
  currency: z.string().length(3).default("EUR"),
  email: z.string().email("Email non valida").max(255).optional(),
  phone: z.string().max(50).optional(),
  website: z.string().url("URL non valido").max(255).optional(),
  contacts: z.any().optional(),
  iban: z.string().max(34).optional(),
  bic: z.string().max(11).optional(),
  splitPayment: z.boolean().default(false),
  withholdingTax: z.boolean().default(false),
  taxRegime: z.string().max(100).optional(),
  status: z.enum(['active', 'suspended', 'blocked']).optional(),
  notes: z.string().optional(),
  createdBy: z.string().min(1),
  updatedBy: z.string().optional(),
});

export const updateBrandSupplierSchema = insertBrandSupplierSchema.partial();
export type InsertBrandSupplier = z.infer<typeof insertBrandSupplierSchema>;
export type UpdateBrandSupplier = z.infer<typeof updateBrandSupplierSchema>;
export type BrandSupplier = typeof brandSuppliers.$inferSelect;

// 5) brand_wms_deployments - Per-tenant deployment tracking (audit & rollback)
export const brandWmsDeployments = brandInterfaceSchema.table("brand_wms_deployments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Entity identification
  entityType: varchar("entity_type", { length: 50 }).notNull(), // 'product' | 'category' | 'product_type' | 'supplier'
  entityId: varchar("entity_id", { length: 100 }).notNull(), // FK to brand_products (varchar), brand_categories (varchar), brand_suppliers (uuid)
  
  // Target tenant
  tenantId: uuid("tenant_id").notNull(), // Reference to w3suite.tenants
  
  // Deployment metadata
  version: integer("version").default(1).notNull(), // Incremental version for each entity
  status: deploymentStatusEnum("status").notNull().default('pending'), // pending, in_progress, completed, failed
  
  // Payload snapshot (for rollback)
  payload: jsonb("payload").notNull(), // Full entity data at deployment time
  
  // Execution details
  deployedBy: varchar("deployed_by").notNull(), // Brand user ID
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  // Error tracking
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("brand_wms_deployments_entity_idx").on(table.entityType, table.entityId),
  index("brand_wms_deployments_tenant_idx").on(table.tenantId),
  index("brand_wms_deployments_status_idx").on(table.status),
  uniqueIndex("brand_wms_deployments_unique").on(table.entityType, table.entityId, table.tenantId, table.version),
]);

export const insertBrandWmsDeploymentSchema = createInsertSchema(brandWmsDeployments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  entityType: z.enum(['product', 'category', 'product_type', 'supplier']),
  entityId: z.string().min(1).max(100), // Support both varchar and uuid entity IDs
  tenantId: z.string().uuid(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']).optional(),
  payload: z.any(),
  deployedBy: z.string().min(1),
  version: z.number().int().default(1),
  retryCount: z.number().int().default(0),
  errorMessage: z.string().optional(),
});

export type InsertBrandWmsDeployment = z.infer<typeof insertBrandWmsDeploymentSchema>;
export type BrandWmsDeployment = typeof brandWmsDeployments.$inferSelect;

// ==================== CROSS-TENANT KNOWLEDGE - USE W3SUITE SCHEMA ====================
// 
// 🎯 NOTA ARCHITETTURALE: 
// Il Brand Interface training salva direttamente in w3suite.vectorEmbeddings con:
// - origin = 'brand' (cross-tenant)
// - origin = 'tenant' (tenant-specific override)
// 
// Non servono tabelle duplicate - usiamo l'architettura esistente!