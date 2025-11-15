"use strict";
// Brand Interface Schema - Dedicated schema for Brand Interface system
// All tables in this file will be created in 'brand_interface' schema
Object.defineProperty(exports, "__esModule", { value: true });
exports.brandCategories = exports.insertBrandAiAgentSchema = exports.brandAiAgents = exports.insertBrandTemplateDeploymentSchema = exports.brandTemplateDeployments = exports.insertBrandCrmPipelineSchema = exports.brandCrmPipelines = exports.insertBrandCrmCampaignSchema = exports.brandCrmCampaigns = exports.insertAiPdcServiceMappingSchema = exports.aiPdcServiceMapping = exports.insertAiPdcExtractedDataSchema = exports.aiPdcExtractedData = exports.insertAiPdcPdfUploadSchema = exports.aiPdcPdfUploads = exports.insertAiPdcTrainingDatasetSchema = exports.aiPdcTrainingDataset = exports.insertAiPdcAnalysisSessionSchema = exports.aiPdcAnalysisSessions = exports.pdcAnalysisStatusEnum = exports.organizationAnalyticsSchema = exports.insertBrandConfigSchema = exports.brandConfigs = exports.insertBrandDeploymentSchema = exports.brandDeployments = exports.insertBrandTemplateSchema = exports.brandTemplates = exports.insertBrandPriceListSchema = exports.brandPriceLists = exports.insertBrandCampaignSchema = exports.brandCampaigns = exports.insertBrandAuditLogSchema = exports.brandAuditLogs = exports.insertBrandRoleSchema = exports.brandRoles = exports.insertBrandUserSchema = exports.brandUsers = exports.brandTenants = exports.brandSupplierStatusEnum = exports.brandSupplierTypeEnum = exports.brandSerialTypeEnum = exports.brandProductConditionEnum = exports.brandProductStatusEnum = exports.brandProductTypeEnum = exports.wmsDeploymentStatusEnum = exports.deploymentStatusEnum = exports.campaignTypeEnum = exports.campaignStatusEnum = exports.brandRoleEnum = exports.brandInterfaceSchema = void 0;
exports.insertBrandWorkflowDeploymentSchema = exports.brandWorkflowDeployments = exports.insertBrandWorkflowVersionSchema = exports.brandWorkflowVersions = exports.updateBrandWorkflowSchema = exports.insertBrandWorkflowSchema = exports.brandWorkflows = exports.brandWorkflowExecutionModeEnum = exports.brandWorkflowStatusEnum = exports.brandWorkflowCategoryEnum = exports.insertBrandWmsDeploymentSchema = exports.brandWmsDeployments = exports.updateBrandSupplierSchema = exports.insertBrandSupplierSchema = exports.brandSuppliers = exports.updateBrandProductSchema = exports.insertBrandProductSchema = exports.brandProducts = exports.updateBrandProductTypeSchema = exports.insertBrandProductTypeSchema = exports.brandProductTypes = exports.updateBrandCategorySchema = exports.insertBrandCategorySchema = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_zod_1 = require("drizzle-zod");
const zod_1 = require("zod");
// ==================== BRAND INTERFACE SCHEMA ====================
exports.brandInterfaceSchema = (0, pg_core_1.pgSchema)("brand_interface");
// ==================== BRAND INTERFACE ENUMS ====================
exports.brandRoleEnum = (0, pg_core_1.pgEnum)('brand_role', ['area_manager', 'national_manager', 'super_admin']);
exports.campaignStatusEnum = (0, pg_core_1.pgEnum)('brand_campaign_status', ['draft', 'active', 'paused', 'completed', 'archived']);
exports.campaignTypeEnum = (0, pg_core_1.pgEnum)('brand_campaign_type', ['global', 'tenant_specific', 'selective']);
exports.deploymentStatusEnum = (0, pg_core_1.pgEnum)('brand_deployment_status', ['pending', 'in_progress', 'completed', 'failed']);
// WMS (Warehouse Management System) Enums
exports.wmsDeploymentStatusEnum = (0, pg_core_1.pgEnum)('wms_deployment_status', ['draft', 'deployed', 'archived']);
exports.brandProductTypeEnum = (0, pg_core_1.pgEnum)('brand_product_type', ['PHYSICAL', 'VIRTUAL', 'SERVICE', 'CANVAS']);
exports.brandProductStatusEnum = (0, pg_core_1.pgEnum)('brand_product_status', ['active', 'inactive', 'discontinued', 'draft']);
exports.brandProductConditionEnum = (0, pg_core_1.pgEnum)('brand_product_condition', ['new', 'used', 'refurbished', 'demo']);
exports.brandSerialTypeEnum = (0, pg_core_1.pgEnum)('brand_serial_type', ['imei', 'iccid', 'mac_address', 'other']);
exports.brandSupplierTypeEnum = (0, pg_core_1.pgEnum)('brand_supplier_type', ['distributore', 'produttore', 'servizi', 'logistica']);
exports.brandSupplierStatusEnum = (0, pg_core_1.pgEnum)('brand_supplier_status', ['active', 'suspended', 'blocked']);
// ==================== BRAND TENANTS TABLE ====================
exports.brandTenants = exports.brandInterfaceSchema.table("brand_tenants", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    slug: (0, pg_core_1.varchar)("slug", { length: 100 }).unique(),
    type: (0, pg_core_1.varchar)("type", { length: 50 }).default('brand_interface'),
    status: (0, pg_core_1.varchar)("status", { length: 50 }).default('active'),
    settings: (0, pg_core_1.jsonb)("settings").default({}),
    features: (0, pg_core_1.jsonb)("features").default({}),
    brandAdminEmail: (0, pg_core_1.varchar)("brand_admin_email", { length: 255 }),
    apiKey: (0, pg_core_1.varchar)("api_key", { length: 255 }),
    allowedIpRanges: (0, pg_core_1.text)("allowed_ip_ranges").array(),
    maxConcurrentUsers: (0, pg_core_1.smallint)("max_concurrent_users").default(50),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    archivedAt: (0, pg_core_1.timestamp)("archived_at"),
});
// ==================== BRAND USERS TABLE ====================
exports.brandUsers = exports.brandInterfaceSchema.table("brand_users", {
    id: (0, pg_core_1.varchar)("id").primaryKey(), // mario.brand@company.com
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.brandTenants.id), // ← RLS KEY
    email: (0, pg_core_1.varchar)("email", { length: 255 }).unique().notNull(),
    firstName: (0, pg_core_1.varchar)("first_name", { length: 100 }),
    lastName: (0, pg_core_1.varchar)("last_name", { length: 100 }),
    // RBAC Geografico Proprietario
    role: (0, exports.brandRoleEnum)("role").notNull().default('area_manager'),
    commercialAreaCodes: (0, pg_core_1.text)("commercial_area_codes").array(), // ["AREA_03"] o NULL per globale
    permissions: (0, pg_core_1.text)("permissions").array().notNull(), // ["inventory:read", "sales:read"]
    // Brand Interface specifics
    department: (0, pg_core_1.varchar)("department", { length: 100 }), // "marketing", "sales", "operations"
    hireDate: (0, pg_core_1.date)("hire_date"),
    managerId: (0, pg_core_1.varchar)("manager_id", { length: 255 }), // Self-reference
    // Security & Audit
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    mfaEnabled: (0, pg_core_1.boolean)("mfa_enabled").default(false),
    mfaSecret: (0, pg_core_1.varchar)("mfa_secret", { length: 255 }), // TOTP secret
    lastLoginAt: (0, pg_core_1.timestamp)("last_login_at"),
    failedLoginAttempts: (0, pg_core_1.smallint)("failed_login_attempts").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("brand_users_email_unique").on(table.email),
]);
exports.insertBrandUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.brandUsers).omit({
    createdAt: true,
    updatedAt: true
});
// ==================== BRAND ROLES TABLE ====================
exports.brandRoles = exports.brandInterfaceSchema.table("brand_roles", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.brandTenants.id), // ← RLS KEY
    name: (0, pg_core_1.varchar)("name", { length: 100 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    // Geographic scope
    isGlobal: (0, pg_core_1.boolean)("is_global").default(false), // true = National Manager, false = Area Manager
    allowedAreas: (0, pg_core_1.text)("allowed_areas").array(), // NULL = global, ["AREA_03"] = specific areas
    // Permissions
    permissions: (0, pg_core_1.text)("permissions").array().notNull(),
    // Metadata
    isSystem: (0, pg_core_1.boolean)("is_system").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("brand_roles_name_unique").on(table.tenantId, table.name), // Unique per tenant
]);
exports.insertBrandRoleSchema = (0, drizzle_zod_1.createInsertSchema)(exports.brandRoles).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== BRAND AUDIT LOGS ====================
exports.brandAuditLogs = exports.brandInterfaceSchema.table("brand_audit_logs", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.brandTenants.id), // ← RLS KEY
    userEmail: (0, pg_core_1.varchar)("user_email", { length: 255 }).notNull(),
    userRole: (0, pg_core_1.varchar)("user_role", { length: 100 }),
    commercialAreas: (0, pg_core_1.text)("commercial_areas").array(), // Areas the user had access to
    // Action details
    action: (0, pg_core_1.varchar)("action", { length: 100 }).notNull(), // "cross_tenant_stores_read", "price_list_deploy"
    resourceType: (0, pg_core_1.varchar)("resource_type", { length: 100 }), // "stores", "campaigns", "price_lists"
    resourceIds: (0, pg_core_1.text)("resource_ids").array(), // IDs of affected resources
    // Context
    targetTenants: (0, pg_core_1.text)("target_tenants").array(), // Which tenants were affected
    metadata: (0, pg_core_1.jsonb)("metadata").default({}), // Additional context
    ipAddress: (0, pg_core_1.varchar)("ip_address", { length: 45 }), // IPv4/IPv6
    userAgent: (0, pg_core_1.text)("user_agent"),
    // Timing
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.insertBrandAuditLogSchema = (0, drizzle_zod_1.createInsertSchema)(exports.brandAuditLogs).omit({
    id: true,
    createdAt: true
});
// ==================== MIGRATED BRAND TABLES (from old brand.ts) ====================
// BRAND CAMPAIGNS - Migrated to brand_interface schema
exports.brandCampaigns = exports.brandInterfaceSchema.table("brand_campaigns", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    code: (0, pg_core_1.varchar)("code", { length: 50 }).unique().notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    type: (0, exports.campaignTypeEnum)("type").notNull().default('global'),
    status: (0, exports.campaignStatusEnum)("status").notNull().default('draft'),
    startDate: (0, pg_core_1.date)("start_date"),
    endDate: (0, pg_core_1.date)("end_date"),
    targetTenants: (0, pg_core_1.jsonb)("target_tenants").default([]), // Array di tenant IDs per selective/tenant_specific
    content: (0, pg_core_1.jsonb)("content").default({}), // Template, messaggi, assets
    settings: (0, pg_core_1.jsonb)("settings").default({}), // Configurazioni specifiche
    metrics: (0, pg_core_1.jsonb)("metrics").default({}), // KPI e risultati
    createdBy: (0, pg_core_1.varchar)("created_by", { length: 255 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    archivedAt: (0, pg_core_1.timestamp)("archived_at"),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("brand_campaigns_code_unique").on(table.code),
]);
exports.insertBrandCampaignSchema = (0, drizzle_zod_1.createInsertSchema)(exports.brandCampaigns).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// BRAND PRICE LISTS - Migrated to brand_interface schema
exports.brandPriceLists = exports.brandInterfaceSchema.table("brand_price_lists", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    code: (0, pg_core_1.varchar)("code", { length: 50 }).unique().notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    type: (0, pg_core_1.varchar)("type", { length: 50 }).notNull(), // 'standard', 'promotional', 'special'
    validFrom: (0, pg_core_1.date)("valid_from").notNull(),
    validTo: (0, pg_core_1.date)("valid_to"),
    targetChannels: (0, pg_core_1.jsonb)("target_channels").default([]), // Array di channel IDs
    targetBrands: (0, pg_core_1.jsonb)("target_brands").default([]), // Array di brand IDs  
    priceData: (0, pg_core_1.jsonb)("price_data").notNull(), // Struttura prezzi
    approval: (0, pg_core_1.jsonb)("approval").default({}), // Workflow approvazione
    isActive: (0, pg_core_1.boolean)("is_active").default(false),
    createdBy: (0, pg_core_1.varchar)("created_by", { length: 255 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("brand_price_lists_code_unique").on(table.code),
]);
exports.insertBrandPriceListSchema = (0, drizzle_zod_1.createInsertSchema)(exports.brandPriceLists).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// BRAND TEMPLATES - Migrated to brand_interface schema
exports.brandTemplates = exports.brandInterfaceSchema.table("brand_templates", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    code: (0, pg_core_1.varchar)("code", { length: 50 }).unique().notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    category: (0, pg_core_1.varchar)("category", { length: 100 }).notNull(), // 'communication', 'pricing', 'promotion', 'report'
    version: (0, pg_core_1.varchar)("version", { length: 20 }).notNull().default('1.0'),
    description: (0, pg_core_1.text)("description"),
    templateData: (0, pg_core_1.jsonb)("template_data").notNull(), // Struttura template
    variables: (0, pg_core_1.jsonb)("variables").default([]), // Variabili personalizzabili
    preview: (0, pg_core_1.text)("preview"), // Preview HTML/immagine
    isPublic: (0, pg_core_1.boolean)("is_public").default(false),
    usageCount: (0, pg_core_1.smallint)("usage_count").default(0),
    createdBy: (0, pg_core_1.varchar)("created_by", { length: 255 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("brand_templates_code_unique").on(table.code),
]);
exports.insertBrandTemplateSchema = (0, drizzle_zod_1.createInsertSchema)(exports.brandTemplates).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// BRAND DEPLOYMENTS - Migrated to brand_interface schema
exports.brandDeployments = exports.brandInterfaceSchema.table("brand_deployments", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    campaignId: (0, pg_core_1.uuid)("campaign_id"),
    priceListId: (0, pg_core_1.uuid)("price_list_id"),
    type: (0, pg_core_1.varchar)("type", { length: 50 }).notNull(), // 'campaign', 'price_list', 'template', 'config'
    targetType: (0, pg_core_1.varchar)("target_type", { length: 50 }).notNull(), // 'all_tenants', 'selective', 'tenant_specific'
    targetTenants: (0, pg_core_1.jsonb)("target_tenants").default([]), // Array tenant IDs
    status: (0, exports.deploymentStatusEnum)("status").notNull().default('pending'),
    scheduledAt: (0, pg_core_1.timestamp)("scheduled_at"),
    startedAt: (0, pg_core_1.timestamp)("started_at"),
    completedAt: (0, pg_core_1.timestamp)("completed_at"),
    results: (0, pg_core_1.jsonb)("results").default({}), // Risultati deployment
    errors: (0, pg_core_1.jsonb)("errors").default([]), // Errori durante deployment
    metadata: (0, pg_core_1.jsonb)("metadata").default({}), // Metadati aggiuntivi
    createdBy: (0, pg_core_1.varchar)("created_by", { length: 255 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.insertBrandDeploymentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.brandDeployments).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// BRAND CONFIGS - Migrated to brand_interface schema
exports.brandConfigs = exports.brandInterfaceSchema.table("brand_configs", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    key: (0, pg_core_1.varchar)("key", { length: 100 }).unique().notNull(),
    value: (0, pg_core_1.jsonb)("value").notNull(),
    description: (0, pg_core_1.text)("description"),
    category: (0, pg_core_1.varchar)("category", { length: 50 }).notNull(), // 'pricing', 'campaigns', 'templates', 'deployment'
    isEncrypted: (0, pg_core_1.boolean)("is_encrypted").default(false),
    accessLevel: (0, pg_core_1.varchar)("access_level", { length: 50 }).default('global'), // 'global', 'regional', 'tenant_specific'
    allowedRoles: (0, pg_core_1.text)("allowed_roles").array().default(['super_admin']),
    lastModifiedBy: (0, pg_core_1.varchar)("last_modified_by", { length: 255 }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("brand_configs_key_unique").on(table.key),
]);
exports.insertBrandConfigSchema = (0, drizzle_zod_1.createInsertSchema)(exports.brandConfigs).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== ORGANIZATION ANALYTICS TYPES ====================
// Data contracts for organizational analytics - computed at runtime, not persisted
exports.organizationAnalyticsSchema = zod_1.z.object({
    organizationId: zod_1.z.string().uuid(),
    organizationName: zod_1.z.string(),
    structureBreakdown: zod_1.z.object({
        legalEntities: zod_1.z.object({
            total: zod_1.z.number(),
            active: zod_1.z.number(),
            inactive: zod_1.z.number(),
            breakdown: zod_1.z.array(zod_1.z.object({
                id: zod_1.z.string(),
                nome: zod_1.z.string(),
                formaGiuridica: zod_1.z.string().optional(),
                status: zod_1.z.string()
            }))
        }),
        stores: zod_1.z.object({
            total: zod_1.z.number(),
            active: zod_1.z.number(),
            inactive: zod_1.z.number(),
            breakdown: zod_1.z.array(zod_1.z.object({
                id: zod_1.z.string(),
                nome: zod_1.z.string(),
                tipo: zod_1.z.string().optional(),
                citta: zod_1.z.string().optional(),
                status: zod_1.z.string()
            }))
        }),
        users: zod_1.z.object({
            total: zod_1.z.number(),
            active: zod_1.z.number(),
            inactive: zod_1.z.number(),
            byRole: zod_1.z.array(zod_1.z.object({
                role: zod_1.z.string(),
                count: zod_1.z.number()
            }))
        })
    }),
    aiTokenStatus: zod_1.z.object({
        hasAIIntegration: zod_1.z.boolean(),
        totalTokensUsed: zod_1.z.number(),
        totalTokensAvailable: zod_1.z.number().optional(),
        lastUsage: zod_1.z.string().optional(),
        activeConnections: zod_1.z.number(),
        usageByCategory: zod_1.z.array(zod_1.z.object({
            category: zod_1.z.string(),
            tokens: zod_1.z.number(),
            percentage: zod_1.z.number()
        }))
    }),
    systemHealth: zod_1.z.object({
        overallStatus: zod_1.z.enum(['healthy', 'warning', 'critical']),
        services: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            status: zod_1.z.enum(['active', 'inactive', 'error']),
            uptime: zod_1.z.string().optional(),
            lastCheck: zod_1.z.string()
        })),
        connections: zod_1.z.object({
            database: zod_1.z.boolean(),
            redis: zod_1.z.boolean(),
            websocket: zod_1.z.boolean()
        })
    }),
    databaseUsage: zod_1.z.object({
        totalSize: zod_1.z.string(), // "125.4 MB"
        categoryBreakdown: zod_1.z.array(zod_1.z.object({
            category: zod_1.z.string(), // "users", "stores", "products", "logs"
            size: zod_1.z.string(),
            tableCount: zod_1.z.number(),
            recordCount: zod_1.z.number(),
            percentage: zod_1.z.number()
        })),
        recentGrowth: zod_1.z.object({
            lastWeek: zod_1.z.string(),
            lastMonth: zod_1.z.string()
        })
    }),
    fileInventory: zod_1.z.object({
        totalFiles: zod_1.z.number(),
        totalSize: zod_1.z.string(),
        categoryBreakdown: zod_1.z.array(zod_1.z.object({
            category: zod_1.z.string(), // "images", "documents", "uploads", "cache"
            fileCount: zod_1.z.number(),
            size: zod_1.z.string(),
            percentage: zod_1.z.number()
        })),
        recentActivity: zod_1.z.object({
            uploadsLastWeek: zod_1.z.number(),
            uploadsLastMonth: zod_1.z.number()
        })
    }),
    generatedAt: zod_1.z.string()
});
// ==================== AI PDC ANALYZER SYSTEM ====================
// PDC Analysis Status Enum
exports.pdcAnalysisStatusEnum = (0, pg_core_1.pgEnum)('pdc_analysis_status', ['pending', 'analyzing', 'review', 'training', 'completed', 'failed']);
// ==================== AI PDC ANALYSIS SESSIONS ====================
// Multi-PDF analysis sessions with attachment rate tracking
exports.aiPdcAnalysisSessions = exports.brandInterfaceSchema.table("ai_pdc_analysis_sessions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(), // Reference to w3suite.tenants
    userId: (0, pg_core_1.varchar)("user_id", { length: 255 }).notNull(), // Reference to w3suite.users
    // Session metadata
    sessionName: (0, pg_core_1.varchar)("session_name", { length: 255 }),
    status: (0, exports.pdcAnalysisStatusEnum)("status").notNull().default('pending'),
    totalPdfs: (0, pg_core_1.smallint)("total_pdfs").default(0),
    processedPdfs: (0, pg_core_1.smallint)("processed_pdfs").default(0),
    // Analysis results summary
    extractedCustomers: (0, pg_core_1.jsonb)("extracted_customers").default([]), // Array of customer data from all PDFs
    extractedProducts: (0, pg_core_1.jsonb)("extracted_products").default([]), // Array of all products found
    attachmentRate: (0, pg_core_1.jsonb)("attachment_rate").default({}), // Product attachment analysis
    // Final output
    finalJson: (0, pg_core_1.jsonb)("final_json"), // Consolidated JSON for cashier API
    exportedAt: (0, pg_core_1.timestamp)("exported_at"),
    // Training feedback
    wasUsedForTraining: (0, pg_core_1.boolean)("was_used_for_training").default(false),
    trainingFeedback: (0, pg_core_1.text)("training_feedback"),
    // Metadata
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    completedAt: (0, pg_core_1.timestamp)("completed_at"),
});
exports.insertAiPdcAnalysisSessionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.aiPdcAnalysisSessions).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== AI PDC TRAINING DATASET ====================
// Cross-tenant training data: validated PDF analyses for AI learning
exports.aiPdcTrainingDataset = exports.brandInterfaceSchema.table("ai_pdc_training_dataset", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    sessionId: (0, pg_core_1.uuid)("session_id").notNull().references(() => exports.aiPdcAnalysisSessions.id, { onDelete: 'cascade' }),
    // PDF reference
    pdfUrl: (0, pg_core_1.text)("pdf_url").notNull(), // Object storage URL
    pdfFileName: (0, pg_core_1.varchar)("pdf_file_name", { length: 255 }),
    pdfHash: (0, pg_core_1.varchar)("pdf_hash", { length: 64 }), // SHA256 for deduplication
    // AI extraction (initial)
    aiExtractedData: (0, pg_core_1.jsonb)("ai_extracted_data").notNull(), // Raw AI output
    aiModel: (0, pg_core_1.varchar)("ai_model", { length: 100 }).default('gpt-4-vision-preview'),
    aiConfidence: (0, pg_core_1.smallint)("ai_confidence"), // 0-100
    // Human validation (corrected)
    correctedJson: (0, pg_core_1.jsonb)("corrected_json").notNull(), // Human-validated JSON
    correctionNotes: (0, pg_core_1.text)("correction_notes"), // What was fixed
    validatedBy: (0, pg_core_1.varchar)("validated_by", { length: 255 }).notNull(), // User who validated
    // Product mapping
    driverMapping: (0, pg_core_1.jsonb)("driver_mapping"), // { driver, category, typology, product }
    serviceType: (0, pg_core_1.varchar)("service_type", { length: 100 }), // "Fisso", "Mobile", etc.
    // Training metadata
    isPublicTraining: (0, pg_core_1.boolean)("is_public_training").default(true), // Cross-tenant vs tenant-specific
    sourceTenantId: (0, pg_core_1.uuid)("source_tenant_id"), // Which tenant contributed this
    useCount: (0, pg_core_1.smallint)("use_count").default(0), // How many times used for training
    successRate: (0, pg_core_1.smallint)("success_rate"), // 0-100 - accuracy in subsequent matches
    // Metadata
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("ai_pdc_training_pdf_hash_unique").on(table.pdfHash),
]);
exports.insertAiPdcTrainingDatasetSchema = (0, drizzle_zod_1.createInsertSchema)(exports.aiPdcTrainingDataset).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== AI PDC PDF UPLOADS ====================
// Individual PDF files uploaded to a session
exports.aiPdcPdfUploads = exports.brandInterfaceSchema.table("ai_pdc_pdf_uploads", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    sessionId: (0, pg_core_1.uuid)("session_id").notNull().references(() => exports.aiPdcAnalysisSessions.id, { onDelete: 'cascade' }),
    // PDF file info
    fileName: (0, pg_core_1.varchar)("file_name", { length: 255 }).notNull(),
    fileUrl: (0, pg_core_1.text)("file_url").notNull(), // Object storage URL
    fileHash: (0, pg_core_1.varchar)("file_hash", { length: 64 }), // SHA256 for deduplication
    fileSize: (0, pg_core_1.integer)("file_size"), // bytes
    // Analysis status
    status: (0, exports.pdcAnalysisStatusEnum)("status").notNull().default('pending'),
    aiModel: (0, pg_core_1.varchar)("ai_model", { length: 100 }).default('gpt-4o'),
    aiConfidence: (0, pg_core_1.smallint)("ai_confidence"), // 0-100
    // Timestamps
    uploadedAt: (0, pg_core_1.timestamp)("uploaded_at").defaultNow(),
    analyzedAt: (0, pg_core_1.timestamp)("analyzed_at"),
    reviewedAt: (0, pg_core_1.timestamp)("reviewed_at"),
}, (table) => [
    (0, pg_core_1.index)("idx_pdc_uploads_session").on(table.sessionId),
    (0, pg_core_1.index)("idx_pdc_uploads_status").on(table.status),
]);
exports.insertAiPdcPdfUploadSchema = (0, drizzle_zod_1.createInsertSchema)(exports.aiPdcPdfUploads).omit({
    id: true,
    uploadedAt: true
});
// ==================== AI PDC EXTRACTED DATA ====================
// Customer and service data extracted from each PDF
exports.aiPdcExtractedData = exports.brandInterfaceSchema.table("ai_pdc_extracted_data", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    pdfId: (0, pg_core_1.uuid)("pdf_id").notNull().references(() => exports.aiPdcPdfUploads.id, { onDelete: 'cascade' }),
    sessionId: (0, pg_core_1.uuid)("session_id").notNull().references(() => exports.aiPdcAnalysisSessions.id, { onDelete: 'cascade' }),
    // Customer data (anagrafica)
    customerType: (0, pg_core_1.varchar)("customer_type", { length: 50 }), // 'business' | 'private'
    customerData: (0, pg_core_1.jsonb)("customer_data").notNull(), // { nome, cognome, cf, piva, indirizzo, telefono, email, etc }
    // Service data
    servicesExtracted: (0, pg_core_1.jsonb)("services_extracted").notNull(), // Array of services found
    // AI extraction metadata
    aiRawOutput: (0, pg_core_1.jsonb)("ai_raw_output"), // Full AI response
    extractionMethod: (0, pg_core_1.varchar)("extraction_method", { length: 100 }).default('gpt-4o-vision'),
    // Human review
    wasReviewed: (0, pg_core_1.boolean)("was_reviewed").default(false),
    reviewedBy: (0, pg_core_1.varchar)("reviewed_by", { length: 255 }),
    correctedData: (0, pg_core_1.jsonb)("corrected_data"), // User corrections
    reviewNotes: (0, pg_core_1.text)("review_notes"),
    // Timestamps
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    reviewedAt: (0, pg_core_1.timestamp)("reviewed_at"),
}, (table) => [
    (0, pg_core_1.index)("idx_pdc_extracted_pdf").on(table.pdfId),
    (0, pg_core_1.index)("idx_pdc_extracted_session").on(table.sessionId),
    (0, pg_core_1.index)("idx_pdc_extracted_reviewed").on(table.wasReviewed),
]);
exports.insertAiPdcExtractedDataSchema = (0, drizzle_zod_1.createInsertSchema)(exports.aiPdcExtractedData).omit({
    id: true,
    createdAt: true
});
// ==================== AI PDC SERVICE MAPPING ====================
// Maps extracted services to WindTre product hierarchy (Driver → Category → Typology → Product)
exports.aiPdcServiceMapping = exports.brandInterfaceSchema.table("ai_pdc_service_mapping", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    extractedDataId: (0, pg_core_1.uuid)("extracted_data_id").notNull().references(() => exports.aiPdcExtractedData.id, { onDelete: 'cascade' }),
    // Extracted service text
    serviceTextExtracted: (0, pg_core_1.text)("service_text_extracted").notNull(), // Raw text from PDF
    serviceDescription: (0, pg_core_1.text)("service_description"), // AI interpretation
    // WindTre Hierarchy Mapping
    driverId: (0, pg_core_1.uuid)("driver_id"), // References public.drivers (Fisso, Mobile, Energia, etc)
    categoryId: (0, pg_core_1.uuid)("category_id"), // References public.driver_categories OR w3suite.tenant_driver_categories
    typologyId: (0, pg_core_1.uuid)("typology_id"), // References public.driver_typologies OR w3suite.tenant_driver_typologies
    productId: (0, pg_core_1.uuid)("product_id"), // References w3suite.products (tenant inventory)
    // Mapping metadata
    mappingConfidence: (0, pg_core_1.smallint)("mapping_confidence"), // 0-100
    mappingMethod: (0, pg_core_1.varchar)("mapping_method", { length: 100 }).default('ai-auto'), // 'ai-auto' | 'manual' | 'training-match'
    mappedBy: (0, pg_core_1.varchar)("mapped_by", { length: 255 }), // User ID if manual
    // Training integration
    wasUsedForTraining: (0, pg_core_1.boolean)("was_used_for_training").default(false),
    trainingDatasetId: (0, pg_core_1.uuid)("training_dataset_id").references(() => exports.aiPdcTrainingDataset.id),
    // Timestamps
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_pdc_mapping_extracted").on(table.extractedDataId),
    (0, pg_core_1.index)("idx_pdc_mapping_driver").on(table.driverId),
    (0, pg_core_1.index)("idx_pdc_mapping_training").on(table.wasUsedForTraining),
]);
exports.insertAiPdcServiceMappingSchema = (0, drizzle_zod_1.createInsertSchema)(exports.aiPdcServiceMapping).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== CRM BRAND TEMPLATES ====================
// Brand CRM Campaigns - Template centralizzati per campagne
exports.brandCrmCampaigns = exports.brandInterfaceSchema.table("brand_crm_campaigns", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    brandId: (0, pg_core_1.uuid)("brand_id").notNull(), // For RLS
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    templateConfig: (0, pg_core_1.jsonb)("template_config").notNull(), // {type, utm_defaults, budget_suggestion, recommended_channels}
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_brand_crm_campaigns_brand").on(table.brandId),
]);
exports.insertBrandCrmCampaignSchema = (0, drizzle_zod_1.createInsertSchema)(exports.brandCrmCampaigns).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// Brand CRM Pipelines - Template centralizzati per pipeline
exports.brandCrmPipelines = exports.brandInterfaceSchema.table("brand_crm_pipelines", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    brandId: (0, pg_core_1.uuid)("brand_id").notNull(), // For RLS
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    domain: (0, pg_core_1.varchar)("domain", { length: 50 }).notNull(), // 'sales', 'service', 'retention'
    defaultStages: (0, pg_core_1.jsonb)("default_stages").notNull(), // [{order:1, name:'Contatto', category:'new', color:'#ff6900'}]
    recommendedWorkflows: (0, pg_core_1.jsonb)("recommended_workflows"), // Array of workflow IDs or configs
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_brand_crm_pipelines_brand").on(table.brandId),
]);
exports.insertBrandCrmPipelineSchema = (0, drizzle_zod_1.createInsertSchema)(exports.brandCrmPipelines).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// Brand Template Deployments - Tracking dei template pushati ai tenant
exports.brandTemplateDeployments = exports.brandInterfaceSchema.table("brand_template_deployments", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    templateType: (0, pg_core_1.varchar)("template_type", { length: 50 }).notNull(), // 'campaign', 'pipeline', 'workflow'
    brandTemplateId: (0, pg_core_1.uuid)("brand_template_id").notNull(), // References brand_crm_campaigns.id or brand_crm_pipelines.id
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(), // Target tenant
    deployedEntityId: (0, pg_core_1.uuid)("deployed_entity_id").notNull(), // ID dell'entità creata nel tenant (w3suite.crm_campaigns.id, etc)
    deployedAt: (0, pg_core_1.timestamp)("deployed_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_brand_template_deployments_template").on(table.templateType, table.brandTemplateId),
    (0, pg_core_1.index)("idx_brand_template_deployments_tenant").on(table.tenantId),
]);
exports.insertBrandTemplateDeploymentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.brandTemplateDeployments).omit({
    id: true,
    deployedAt: true
});
// Brand AI Agents - Centralized AI agent configuration
exports.brandAiAgents = exports.brandInterfaceSchema.table("brand_ai_agents", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    brandId: (0, pg_core_1.uuid)("brand_id").notNull(), // For RLS
    // Agent Identity
    agentId: (0, pg_core_1.varchar)("agent_id", { length: 100 }).notNull().unique(), // 'lead-routing-agent', 'tippy-sales', etc.
    agentName: (0, pg_core_1.varchar)("agent_name", { length: 255 }).notNull(),
    agentDescription: (0, pg_core_1.text)("agent_description"),
    // AI Configuration
    model: (0, pg_core_1.varchar)("model", { length: 50 }).default('gpt-4o').notNull(),
    temperature: (0, pg_core_1.real)("temperature").default(0.3).notNull(), // 0.0-2.0
    maxTokens: (0, pg_core_1.integer)("max_tokens").default(1000).notNull(),
    systemPrompt: (0, pg_core_1.text)("system_prompt").notNull(),
    responseFormat: (0, pg_core_1.varchar)("response_format", { length: 20 }).default('json_object'), // 'text', 'json_object'
    // Feature Flags
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    enabledForWorkflows: (0, pg_core_1.boolean)("enabled_for_workflows").default(true).notNull(),
    // Deployment
    deployToAllTenants: (0, pg_core_1.boolean)("deploy_to_all_tenants").default(true).notNull(),
    specificTenants: (0, pg_core_1.jsonb)("specific_tenants"), // Array of tenant IDs if not deploy to all
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_brand_ai_agents_brand").on(table.brandId),
    (0, pg_core_1.index)("idx_brand_ai_agents_agent_id").on(table.agentId),
]);
exports.insertBrandAiAgentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.brandAiAgents).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// ==================== WMS (WAREHOUSE MANAGEMENT SYSTEM) - BRAND MASTER CATALOG ====================
// 1) brand_categories - Master product categories (deployed to tenants)
exports.brandCategories = exports.brandInterfaceSchema.table("brand_categories", {
    id: (0, pg_core_1.varchar)("id", { length: 100 }).primaryKey(), // Reused across tenants (VARCHAR for consistency with w3suite)
    // Deployment tracking
    deploymentStatus: (0, exports.wmsDeploymentStatusEnum)("deployment_status").default('draft').notNull(),
    deployedToCount: (0, pg_core_1.integer)("deployed_to_count").default(0).notNull(), // How many tenants have this
    lastDeployedAt: (0, pg_core_1.timestamp)("last_deployed_at"),
    // Product type hierarchy
    productType: (0, exports.brandProductTypeEnum)("product_type").default('PHYSICAL').notNull(),
    // Category hierarchy (self-referencing for multi-level trees)
    parentCategoryId: (0, pg_core_1.varchar)("parent_category_id", { length: 100 }).references(() => exports.brandCategories.id, { onDelete: 'restrict' }), // FK for hierarchical structure
    // Category info
    nome: (0, pg_core_1.varchar)("nome", { length: 255 }).notNull(),
    descrizione: (0, pg_core_1.text)("descrizione"),
    icona: (0, pg_core_1.varchar)("icona", { length: 100 }),
    ordine: (0, pg_core_1.integer)("ordine").default(0).notNull(),
    // Status
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    archivedAt: (0, pg_core_1.timestamp)("archived_at"),
    // Audit fields
    createdBy: (0, pg_core_1.varchar)("created_by").notNull(),
    modifiedBy: (0, pg_core_1.varchar)("modified_by"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("brand_categories_nome_parent_unique").on(table.nome, table.parentCategoryId), // Prevent sibling dupes
    (0, pg_core_1.index)("brand_categories_deployment_status_idx").on(table.deploymentStatus),
    (0, pg_core_1.index)("brand_categories_product_type_idx").on(table.productType),
    (0, pg_core_1.index)("brand_categories_parent_idx").on(table.parentCategoryId), // Tree queries
]);
exports.insertBrandCategorySchema = (0, drizzle_zod_1.createInsertSchema)(exports.brandCategories).omit({
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
    productType: zod_1.z.enum(['PHYSICAL', 'VIRTUAL', 'SERVICE', 'CANVAS']),
    parentCategoryId: zod_1.z.string().max(100).optional(),
    nome: zod_1.z.string().min(1, "Nome categoria obbligatorio").max(255),
    descrizione: zod_1.z.string().optional(),
    icona: zod_1.z.string().max(100).optional(),
    ordine: zod_1.z.coerce.number().int().default(0),
});
exports.updateBrandCategorySchema = exports.insertBrandCategorySchema.partial();
// 2) brand_product_types - Master product types (deployed to tenants)
exports.brandProductTypes = exports.brandInterfaceSchema.table("brand_product_types", {
    id: (0, pg_core_1.varchar)("id", { length: 100 }).primaryKey(), // Reused across tenants (VARCHAR for consistency)
    // Deployment tracking
    deploymentStatus: (0, exports.wmsDeploymentStatusEnum)("deployment_status").default('draft').notNull(),
    deployedToCount: (0, pg_core_1.integer)("deployed_to_count").default(0).notNull(),
    lastDeployedAt: (0, pg_core_1.timestamp)("last_deployed_at"),
    // Foreign key to category
    categoryId: (0, pg_core_1.varchar)("category_id", { length: 100 }).notNull().references(() => exports.brandCategories.id, { onDelete: 'restrict' }),
    // Type info
    nome: (0, pg_core_1.varchar)("nome", { length: 255 }).notNull(),
    descrizione: (0, pg_core_1.text)("descrizione"),
    ordine: (0, pg_core_1.integer)("ordine").default(0).notNull(),
    // Status
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    archivedAt: (0, pg_core_1.timestamp)("archived_at"),
    // Audit fields
    createdBy: (0, pg_core_1.varchar)("created_by").notNull(),
    modifiedBy: (0, pg_core_1.varchar)("modified_by"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("brand_types_category_nome_unique").on(table.categoryId, table.nome),
    (0, pg_core_1.index)("brand_types_category_idx").on(table.categoryId),
    (0, pg_core_1.index)("brand_types_deployment_status_idx").on(table.deploymentStatus),
]);
exports.insertBrandProductTypeSchema = (0, drizzle_zod_1.createInsertSchema)(exports.brandProductTypes).omit({
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
    categoryId: zod_1.z.string().min(1, "ID categoria obbligatorio").max(100),
    nome: zod_1.z.string().min(1, "Nome tipologia obbligatorio").max(255),
    descrizione: zod_1.z.string().optional(),
    ordine: zod_1.z.coerce.number().int().default(0),
});
exports.updateBrandProductTypeSchema = exports.insertBrandProductTypeSchema.partial();
// 3) brand_products - Master products (deployed to tenants)
exports.brandProducts = exports.brandInterfaceSchema.table("brand_products", {
    id: (0, pg_core_1.varchar)("id", { length: 100 }).primaryKey(), // Reused across tenants (VARCHAR for consistency)
    // Deployment tracking
    deploymentStatus: (0, exports.wmsDeploymentStatusEnum)("deployment_status").default('draft').notNull(),
    deployedToCount: (0, pg_core_1.integer)("deployed_to_count").default(0).notNull(),
    lastDeployedAt: (0, pg_core_1.timestamp)("last_deployed_at"),
    // Core product info
    sku: (0, pg_core_1.varchar)("sku", { length: 100 }).notNull().unique(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    model: (0, pg_core_1.varchar)("model", { length: 255 }),
    description: (0, pg_core_1.text)("description"),
    notes: (0, pg_core_1.text)("notes"),
    brand: (0, pg_core_1.varchar)("brand", { length: 100 }),
    ean: (0, pg_core_1.varchar)("ean", { length: 13 }),
    memory: (0, pg_core_1.varchar)("memory", { length: 50 }),
    color: (0, pg_core_1.varchar)("color", { length: 50 }),
    imageUrl: (0, pg_core_1.varchar)("image_url", { length: 512 }),
    // Product categorization
    categoryId: (0, pg_core_1.varchar)("category_id", { length: 100 }).references(() => exports.brandCategories.id, { onDelete: 'restrict' }),
    typeId: (0, pg_core_1.varchar)("type_id", { length: 100 }).references(() => exports.brandProductTypes.id, { onDelete: 'restrict' }),
    type: (0, exports.brandProductTypeEnum)("type").notNull(),
    status: (0, exports.brandProductStatusEnum)("status").default('active').notNull(),
    condition: (0, exports.brandProductConditionEnum)("condition"),
    isSerializable: (0, pg_core_1.boolean)("is_serializable").default(false).notNull(),
    serialType: (0, exports.brandSerialTypeEnum)("serial_type"),
    monthlyFee: (0, pg_core_1.real)("monthly_fee"),
    // Validity period
    validFrom: (0, pg_core_1.date)("valid_from"),
    validTo: (0, pg_core_1.date)("valid_to"),
    // Physical properties
    weight: (0, pg_core_1.real)("weight"),
    dimensions: (0, pg_core_1.jsonb)("dimensions"),
    // Attachments
    attachments: (0, pg_core_1.jsonb)("attachments").default([]),
    // Stock management defaults (for tenant initialization)
    reorderPoint: (0, pg_core_1.integer)("reorder_point").default(0).notNull(),
    unitOfMeasure: (0, pg_core_1.varchar)("unit_of_measure", { length: 20 }).default('pz').notNull(),
    // Status
    isActive: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    archivedAt: (0, pg_core_1.timestamp)("archived_at"),
    // Audit fields
    createdBy: (0, pg_core_1.varchar)("created_by").notNull(),
    modifiedBy: (0, pg_core_1.varchar)("modified_by"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("brand_products_sku_unique").on(table.sku),
    (0, pg_core_1.index)("brand_products_deployment_status_idx").on(table.deploymentStatus),
    (0, pg_core_1.index)("brand_products_type_idx").on(table.type),
    (0, pg_core_1.index)("brand_products_status_idx").on(table.status),
    (0, pg_core_1.index)("brand_products_ean_idx").on(table.ean),
    (0, pg_core_1.index)("brand_products_category_idx").on(table.categoryId),
    (0, pg_core_1.index)("brand_products_type_id_idx").on(table.typeId),
]);
exports.insertBrandProductSchema = (0, drizzle_zod_1.createInsertSchema)(exports.brandProducts).omit({
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
    sku: zod_1.z.string().min(1, "SKU è obbligatorio").max(100),
    name: zod_1.z.string().min(1, "Descrizione è obbligatoria").max(255),
    model: zod_1.z.string().max(255).optional(),
    notes: zod_1.z.string().optional(),
    brand: zod_1.z.string().max(100).optional(),
    imageUrl: zod_1.z.string().max(512).url("URL immagine non valido").or(zod_1.z.literal('')).optional(),
    type: zod_1.z.enum(['PHYSICAL', 'VIRTUAL', 'SERVICE', 'CANVAS']),
    status: zod_1.z.enum(['active', 'inactive', 'discontinued', 'draft']).optional(),
    condition: zod_1.z.enum(['new', 'used', 'refurbished', 'demo']).optional(),
    serialType: zod_1.z.enum(['imei', 'iccid', 'mac_address', 'other']).optional(),
    monthlyFee: zod_1.z.coerce.number().min(0).optional(),
    ean: zod_1.z.string().regex(/^\d{13}$/, "EAN deve essere di 13 cifre").or(zod_1.z.literal('')).optional(),
    memory: zod_1.z.string().max(50).optional(),
    color: zod_1.z.string().max(50).optional(),
    categoryId: zod_1.z.string().max(100).optional(),
    typeId: zod_1.z.string().max(100).optional(),
    validFrom: zod_1.z.coerce.date().optional(),
    validTo: zod_1.z.coerce.date().optional(),
    weight: zod_1.z.coerce.number().min(0).optional(),
    dimensions: zod_1.z.any().optional(),
    attachments: zod_1.z.any().optional(),
    reorderPoint: zod_1.z.coerce.number().int().default(0),
    unitOfMeasure: zod_1.z.string().max(20).default('pz'),
    isSerializable: zod_1.z.boolean().default(false),
    isActive: zod_1.z.boolean().optional(),
});
exports.updateBrandProductSchema = exports.insertBrandProductSchema.partial();
// 4) brand_suppliers - Master suppliers (deployed to tenants)
exports.brandSuppliers = exports.brandInterfaceSchema.table("brand_suppliers", {
    id: (0, pg_core_1.varchar)("id", { length: 100 }).primaryKey(), // Consistent with other WMS tables
    // Deployment tracking
    deploymentStatus: (0, exports.wmsDeploymentStatusEnum)("deployment_status").default('draft').notNull(),
    deployedToCount: (0, pg_core_1.integer)("deployed_to_count").default(0).notNull(),
    lastDeployedAt: (0, pg_core_1.timestamp)("last_deployed_at"),
    // Identity & classification
    code: (0, pg_core_1.varchar)("code", { length: 50 }).notNull().unique(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    legalName: (0, pg_core_1.varchar)("legal_name", { length: 255 }),
    legalForm: (0, pg_core_1.varchar)("legal_form", { length: 100 }),
    supplierType: (0, exports.brandSupplierTypeEnum)("supplier_type").notNull(),
    // Italian fiscal data
    vatNumber: (0, pg_core_1.varchar)("vat_number", { length: 20 }),
    taxCode: (0, pg_core_1.varchar)("tax_code", { length: 20 }),
    sdiCode: (0, pg_core_1.varchar)("sdi_code", { length: 20 }),
    pecEmail: (0, pg_core_1.varchar)("pec_email", { length: 255 }),
    reaNumber: (0, pg_core_1.varchar)("rea_number", { length: 50 }),
    chamberOfCommerce: (0, pg_core_1.varchar)("chamber_of_commerce", { length: 255 }),
    // Address
    registeredAddress: (0, pg_core_1.jsonb)("registered_address"),
    cityId: (0, pg_core_1.uuid)("city_id"), // Reference to public.italian_cities (will be set on deploy)
    countryId: (0, pg_core_1.uuid)("country_id"), // Reference to public.countries (will be set on deploy)
    // Payments
    preferredPaymentMethodId: (0, pg_core_1.uuid)("preferred_payment_method_id"), // Reference to public.payment_methods
    paymentConditionId: (0, pg_core_1.uuid)("payment_condition_id"), // Reference to public.payment_methods_conditions
    paymentTerms: (0, pg_core_1.varchar)("payment_terms", { length: 100 }),
    currency: (0, pg_core_1.varchar)("currency", { length: 3 }).default("EUR"),
    // Contacts
    email: (0, pg_core_1.varchar)("email", { length: 255 }),
    phone: (0, pg_core_1.varchar)("phone", { length: 50 }),
    website: (0, pg_core_1.varchar)("website", { length: 255 }),
    contacts: (0, pg_core_1.jsonb)("contacts").default({}),
    // Administrative
    iban: (0, pg_core_1.varchar)("iban", { length: 34 }),
    bic: (0, pg_core_1.varchar)("bic", { length: 11 }),
    splitPayment: (0, pg_core_1.boolean)("split_payment").default(false),
    withholdingTax: (0, pg_core_1.boolean)("withholding_tax").default(false),
    taxRegime: (0, pg_core_1.varchar)("tax_regime", { length: 100 }),
    // Status
    status: (0, exports.brandSupplierStatusEnum)("status").notNull().default("active"),
    notes: (0, pg_core_1.text)("notes"),
    // Audit fields
    createdBy: (0, pg_core_1.varchar)("created_by").notNull(),
    updatedBy: (0, pg_core_1.varchar)("updated_by"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("brand_suppliers_code_unique").on(table.code),
    (0, pg_core_1.index)("brand_suppliers_deployment_status_idx").on(table.deploymentStatus),
    (0, pg_core_1.index)("brand_suppliers_status_idx").on(table.status),
    (0, pg_core_1.index)("brand_suppliers_vat_number_idx").on(table.vatNumber),
    (0, pg_core_1.index)("brand_suppliers_name_idx").on(table.name),
]);
exports.insertBrandSupplierSchema = (0, drizzle_zod_1.createInsertSchema)(exports.brandSuppliers).omit({
    id: true,
    deploymentStatus: true,
    deployedToCount: true,
    lastDeployedAt: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    code: zod_1.z.string().min(1, "Codice fornitore obbligatorio").max(50),
    name: zod_1.z.string().min(1, "Nome fornitore obbligatorio").max(255),
    legalName: zod_1.z.string().max(255).optional(),
    legalForm: zod_1.z.string().max(100).optional(),
    supplierType: zod_1.z.enum(['distributore', 'produttore', 'servizi', 'logistica']),
    vatNumber: zod_1.z.string().max(20).optional(),
    taxCode: zod_1.z.string().max(20).optional(),
    sdiCode: zod_1.z.string().max(20).optional(),
    pecEmail: zod_1.z.string().email("Email PEC non valida").max(255).optional(),
    reaNumber: zod_1.z.string().max(50).optional(),
    chamberOfCommerce: zod_1.z.string().max(255).optional(),
    registeredAddress: zod_1.z.any().optional(),
    cityId: zod_1.z.string().uuid().optional(),
    countryId: zod_1.z.string().uuid().optional(),
    preferredPaymentMethodId: zod_1.z.string().uuid().optional(),
    paymentConditionId: zod_1.z.string().uuid().optional(),
    paymentTerms: zod_1.z.string().max(100).optional(),
    currency: zod_1.z.string().length(3).default("EUR"),
    email: zod_1.z.string().email("Email non valida").max(255).optional(),
    phone: zod_1.z.string().max(50).optional(),
    website: zod_1.z.string().url("URL non valido").max(255).optional(),
    contacts: zod_1.z.any().optional(),
    iban: zod_1.z.string().max(34).optional(),
    bic: zod_1.z.string().max(11).optional(),
    splitPayment: zod_1.z.boolean().default(false),
    withholdingTax: zod_1.z.boolean().default(false),
    taxRegime: zod_1.z.string().max(100).optional(),
    status: zod_1.z.enum(['active', 'suspended', 'blocked']).optional(),
    notes: zod_1.z.string().optional(),
    createdBy: zod_1.z.string().min(1),
    updatedBy: zod_1.z.string().optional(),
});
exports.updateBrandSupplierSchema = exports.insertBrandSupplierSchema.partial();
// 5) brand_wms_deployments - Per-tenant deployment tracking (audit & rollback)
exports.brandWmsDeployments = exports.brandInterfaceSchema.table("brand_wms_deployments", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    // Entity identification
    entityType: (0, pg_core_1.varchar)("entity_type", { length: 50 }).notNull(), // 'product' | 'category' | 'product_type' | 'supplier'
    entityId: (0, pg_core_1.varchar)("entity_id", { length: 100 }).notNull(), // FK to brand_products (varchar), brand_categories (varchar), brand_suppliers (uuid)
    // Target tenant
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(), // Reference to w3suite.tenants
    // Deployment metadata
    version: (0, pg_core_1.integer)("version").default(1).notNull(), // Incremental version for each entity
    status: (0, exports.deploymentStatusEnum)("status").notNull().default('pending'), // pending, in_progress, completed, failed
    // Payload snapshot (for rollback)
    payload: (0, pg_core_1.jsonb)("payload").notNull(), // Full entity data at deployment time
    // Execution details
    deployedBy: (0, pg_core_1.varchar)("deployed_by").notNull(), // Brand user ID
    scheduledAt: (0, pg_core_1.timestamp)("scheduled_at"),
    startedAt: (0, pg_core_1.timestamp)("started_at"),
    completedAt: (0, pg_core_1.timestamp)("completed_at"),
    // Error tracking
    errorMessage: (0, pg_core_1.text)("error_message"),
    retryCount: (0, pg_core_1.integer)("retry_count").default(0),
    // Metadata
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("brand_wms_deployments_entity_idx").on(table.entityType, table.entityId),
    (0, pg_core_1.index)("brand_wms_deployments_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("brand_wms_deployments_status_idx").on(table.status),
    (0, pg_core_1.uniqueIndex)("brand_wms_deployments_unique").on(table.entityType, table.entityId, table.tenantId, table.version),
]);
exports.insertBrandWmsDeploymentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.brandWmsDeployments).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    entityType: zod_1.z.enum(['product', 'category', 'product_type', 'supplier']),
    entityId: zod_1.z.string().min(1).max(100), // Support both varchar and uuid entity IDs
    tenantId: zod_1.z.string().uuid(),
    status: zod_1.z.enum(['pending', 'in_progress', 'completed', 'failed']).optional(),
    payload: zod_1.z.any(),
    deployedBy: zod_1.z.string().min(1),
    version: zod_1.z.number().int().default(1),
    retryCount: zod_1.z.number().int().default(0),
    errorMessage: zod_1.z.string().optional(),
});
// ==================== CROSS-TENANT KNOWLEDGE - USE W3SUITE SCHEMA ====================
// 
// 🎯 NOTA ARCHITETTURALE: 
// Il Brand Interface training salva direttamente in w3suite.vectorEmbeddings con:
// - origin = 'brand' (cross-tenant)
// - origin = 'tenant' (tenant-specific override)
// 
// Non servono tabelle duplicate - usiamo l'architettura esistente!
// ==================== BRAND CRM WORKFLOWS ====================
// Master workflow templates created in Brand Interface and deployed to tenants
// Workflow Category Enum
exports.brandWorkflowCategoryEnum = (0, pg_core_1.pgEnum)('brand_workflow_category', [
    'crm',
    'wms',
    'hr',
    'pos',
    'analytics',
    'generic'
]);
// Workflow Status Enum  
exports.brandWorkflowStatusEnum = (0, pg_core_1.pgEnum)('brand_workflow_status', [
    'draft',
    'active',
    'archived',
    'deprecated'
]);
// Workflow Execution Mode Enum
exports.brandWorkflowExecutionModeEnum = (0, pg_core_1.pgEnum)('brand_workflow_execution_mode', [
    'automatic',
    'manual'
]);
// ==================== BRAND WORKFLOWS TABLE ====================
// Core workflow templates with DSL, checksum, and metadata
exports.brandWorkflows = exports.brandInterfaceSchema.table("brand_workflows", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    // Identification
    code: (0, pg_core_1.varchar)("code", { length: 100 }).unique().notNull(), // "brand-wf-email-benvenuto"
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(), // "Email Benvenuto Lead"
    description: (0, pg_core_1.text)("description"),
    // Categorization
    category: (0, exports.brandWorkflowCategoryEnum)("category").notNull().default('crm'),
    tags: (0, pg_core_1.text)("tags").array().default([]), // ["email", "automation", "lead"]
    // Versioning
    version: (0, pg_core_1.varchar)("version", { length: 20 }).notNull().default('1.0.0'), // Semantic versioning
    status: (0, exports.brandWorkflowStatusEnum)("status").notNull().default('draft'),
    // Workflow DSL (ReactFlow compatible)
    dslJson: (0, pg_core_1.jsonb)("dsl_json").notNull(), // { nodes: [...], edges: [...] }
    checksum: (0, pg_core_1.varchar)("checksum", { length: 64 }).notNull(), // SHA-256 hash of dslJson for integrity
    // Executor Requirements
    requiredExecutors: (0, pg_core_1.text)("required_executors").array().notNull(), // ["email-action-executor", "ai-decision-executor"]
    // Placeholder Registry
    placeholders: (0, pg_core_1.jsonb)("placeholders").default({}), // { "{{TEAM:sales}}": { type: "team_reference" }, ... }
    // Execution Settings
    defaultExecutionMode: (0, exports.brandWorkflowExecutionModeEnum)("default_execution_mode").default('manual'),
    timeoutSeconds: (0, pg_core_1.integer)("timeout_seconds").default(3600), // Max execution time
    maxRetries: (0, pg_core_1.smallint)("max_retries").default(3),
    // Deployment Tracking
    deploymentStatus: (0, exports.wmsDeploymentStatusEnum)("deployment_status").notNull().default('draft'),
    deployedToCount: (0, pg_core_1.integer)("deployed_to_count").default(0),
    lastDeployedAt: (0, pg_core_1.timestamp)("last_deployed_at"),
    // Usage Statistics
    usageCount: (0, pg_core_1.integer)("usage_count").default(0), // How many times executed across all tenants
    lastUsedAt: (0, pg_core_1.timestamp)("last_used_at"),
    // Metadata
    isPublic: (0, pg_core_1.boolean)("is_public").default(true), // Can be deployed to all tenants
    isTemplate: (0, pg_core_1.boolean)("is_template").default(true), // Template vs instance
    // Audit fields
    createdBy: (0, pg_core_1.varchar)("created_by").notNull(),
    updatedBy: (0, pg_core_1.varchar)("updated_by"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    archivedAt: (0, pg_core_1.timestamp)("archived_at"),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("brand_workflows_code_unique").on(table.code),
    (0, pg_core_1.index)("brand_workflows_category_idx").on(table.category),
    (0, pg_core_1.index)("brand_workflows_status_idx").on(table.status),
    (0, pg_core_1.index)("brand_workflows_deployment_status_idx").on(table.deploymentStatus),
]);
exports.insertBrandWorkflowSchema = (0, drizzle_zod_1.createInsertSchema)(exports.brandWorkflows).omit({
    id: true,
    deploymentStatus: true,
    deployedToCount: true,
    lastDeployedAt: true,
    usageCount: true,
    lastUsedAt: true,
    createdAt: true,
    updatedAt: true,
    archivedAt: true,
}).extend({
    code: zod_1.z.string().min(1, "Codice workflow obbligatorio").max(100),
    name: zod_1.z.string().min(3, "Nome workflow obbligatorio (min 3 caratteri)").max(255),
    description: zod_1.z.string().optional(),
    category: zod_1.z.enum(['crm', 'wms', 'hr', 'pos', 'analytics', 'generic']),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    version: zod_1.z.string().regex(/^\d+\.\d+\.\d+$/, "Versione deve essere formato x.y.z").default('1.0.0'),
    status: zod_1.z.enum(['draft', 'active', 'archived', 'deprecated']).optional(),
    dslJson: zod_1.z.object({
        nodes: zod_1.z.array(zod_1.z.any()),
        edges: zod_1.z.array(zod_1.z.any()),
    }),
    checksum: zod_1.z.string().length(64, "Checksum deve essere SHA-256 (64 caratteri)"),
    requiredExecutors: zod_1.z.array(zod_1.z.string()).min(1, "Almeno un executor richiesto"),
    placeholders: zod_1.z.record(zod_1.z.any()).optional(),
    defaultExecutionMode: zod_1.z.enum(['automatic', 'manual']).optional(),
    timeoutSeconds: zod_1.z.number().int().positive().optional(),
    maxRetries: zod_1.z.number().int().min(0).max(10).optional(),
    isPublic: zod_1.z.boolean().optional(),
    isTemplate: zod_1.z.boolean().optional(),
    createdBy: zod_1.z.string().min(1),
    updatedBy: zod_1.z.string().optional(),
});
exports.updateBrandWorkflowSchema = exports.insertBrandWorkflowSchema.partial();
// ==================== BRAND WORKFLOW VERSIONS TABLE ====================
// Version history for workflows (audit trail)
exports.brandWorkflowVersions = exports.brandInterfaceSchema.table("brand_workflow_versions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    workflowId: (0, pg_core_1.uuid)("workflow_id").notNull().references(() => exports.brandWorkflows.id, { onDelete: 'cascade' }),
    // Version snapshot
    version: (0, pg_core_1.varchar)("version", { length: 20 }).notNull(),
    dslJson: (0, pg_core_1.jsonb)("dsl_json").notNull(),
    checksum: (0, pg_core_1.varchar)("checksum", { length: 64 }).notNull(),
    // Change metadata
    changeDescription: (0, pg_core_1.text)("change_description"), // What changed in this version
    changeType: (0, pg_core_1.varchar)("change_type", { length: 50 }), // "major", "minor", "patch", "hotfix"
    // Deployment tracking
    wasDeployed: (0, pg_core_1.boolean)("was_deployed").default(false),
    deployedToTenants: (0, pg_core_1.text)("deployed_to_tenants").array().default([]), // Array of tenant IDs
    // Audit
    createdBy: (0, pg_core_1.varchar)("created_by").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)("brand_workflow_versions_unique").on(table.workflowId, table.version),
    (0, pg_core_1.index)("brand_workflow_versions_workflow_idx").on(table.workflowId),
]);
exports.insertBrandWorkflowVersionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.brandWorkflowVersions).omit({
    id: true,
    createdAt: true,
}).extend({
    workflowId: zod_1.z.string().uuid(),
    version: zod_1.z.string().regex(/^\d+\.\d+\.\d+$/),
    dslJson: zod_1.z.object({
        nodes: zod_1.z.array(zod_1.z.any()),
        edges: zod_1.z.array(zod_1.z.any()),
    }),
    checksum: zod_1.z.string().length(64),
    changeDescription: zod_1.z.string().optional(),
    changeType: zod_1.z.enum(['major', 'minor', 'patch', 'hotfix']).optional(),
    createdBy: zod_1.z.string().min(1),
});
// ==================== BRAND WORKFLOW DEPLOYMENTS TABLE ====================
// Track workflow deployments to tenants (similar to WMS deployments)
exports.brandWorkflowDeployments = exports.brandInterfaceSchema.table("brand_workflow_deployments", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    workflowId: (0, pg_core_1.uuid)("workflow_id").notNull().references(() => exports.brandWorkflows.id, { onDelete: 'cascade' }),
    // Target tenant
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(), // Reference to w3suite.tenants
    // Deployment metadata
    version: (0, pg_core_1.varchar)("version", { length: 20 }).notNull(), // Which version was deployed
    status: (0, exports.deploymentStatusEnum)("status").notNull().default('pending'),
    // Execution mode override (tenant-specific)
    executionMode: (0, exports.brandWorkflowExecutionModeEnum)("execution_mode").default('manual'),
    // Payload snapshot (for rollback)
    payload: (0, pg_core_1.jsonb)("payload").notNull(), // Full workflow DSL at deployment time
    // Execution details
    deployedBy: (0, pg_core_1.varchar)("deployed_by").notNull(),
    scheduledAt: (0, pg_core_1.timestamp)("scheduled_at"),
    startedAt: (0, pg_core_1.timestamp)("started_at"),
    completedAt: (0, pg_core_1.timestamp)("completed_at"),
    // Error tracking
    errorMessage: (0, pg_core_1.text)("error_message"),
    retryCount: (0, pg_core_1.integer)("retry_count").default(0),
    // Metadata
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("brand_workflow_deployments_workflow_idx").on(table.workflowId),
    (0, pg_core_1.index)("brand_workflow_deployments_tenant_idx").on(table.tenantId),
    (0, pg_core_1.index)("brand_workflow_deployments_status_idx").on(table.status),
    // Composite index for efficient tenant-scoped filtering queries
    // Example: "Show all pending deployments for tenant X" or "Show deployment history for tenant Y"
    (0, pg_core_1.index)("brand_workflow_deployments_tenant_status_idx").on(table.tenantId, table.status),
    (0, pg_core_1.index)("brand_workflow_deployments_tenant_created_idx").on(table.tenantId, table.createdAt),
    (0, pg_core_1.uniqueIndex)("brand_workflow_deployments_unique").on(table.workflowId, table.tenantId, table.version),
]);
exports.insertBrandWorkflowDeploymentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.brandWorkflowDeployments).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
}).extend({
    workflowId: zod_1.z.string().uuid(),
    tenantId: zod_1.z.string().uuid(),
    version: zod_1.z.string().regex(/^\d+\.\d+\.\d+$/),
    status: zod_1.z.enum(['pending', 'in_progress', 'completed', 'failed']).optional(),
    executionMode: zod_1.z.enum(['automatic', 'manual']).optional(),
    payload: zod_1.z.any(),
    deployedBy: zod_1.z.string().min(1),
    retryCount: zod_1.z.number().int().default(0),
    errorMessage: zod_1.z.string().optional(),
});
