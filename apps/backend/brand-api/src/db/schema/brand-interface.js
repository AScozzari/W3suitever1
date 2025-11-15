"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectAIAgentRegistrySchema = exports.insertAIAgentRegistrySchema = exports.aiAgentsRegistry = exports.agentStatusEnum = exports.agentModuleContextEnum = exports.brandAuditLogs = exports.brandRoles = exports.brandUsers = exports.brandTenants = exports.brandRoleEnum = exports.brandInterfaceSchema = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_zod_1 = require("drizzle-zod");
// Create brand_interface schema
exports.brandInterfaceSchema = (0, pg_core_1.pgSchema)("brand_interface");
// Enum per i ruoli brand (deve matchare l'enum esistente nel database)
exports.brandRoleEnum = exports.brandInterfaceSchema.enum("brand_role", [
    "area_manager",
    "national_manager",
    "super_admin"
]);
// Brand Tenants table
exports.brandTenants = exports.brandInterfaceSchema.table("brand_tenants", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    slug: (0, pg_core_1.varchar)("slug", { length: 255 }),
    type: (0, pg_core_1.varchar)("type", { length: 50 }).default("brand_interface"),
    status: (0, pg_core_1.varchar)("status", { length: 50 }).default("active"),
    settings: (0, pg_core_1.jsonb)("settings").default({}),
    features: (0, pg_core_1.jsonb)("features").default({}),
    brandAdminEmail: (0, pg_core_1.varchar)("brand_admin_email", { length: 255 }),
    apiKey: (0, pg_core_1.varchar)("api_key", { length: 255 }),
    allowedIpRanges: (0, pg_core_1.text)("allowed_ip_ranges").array(),
    maxConcurrentUsers: (0, pg_core_1.integer)("max_concurrent_users").default(50),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    archivedAt: (0, pg_core_1.timestamp)("archived_at")
});
// Brand Users table
exports.brandUsers = exports.brandInterfaceSchema.table("brand_users", {
    id: (0, pg_core_1.varchar)("id", { length: 255 }).primaryKey(),
    email: (0, pg_core_1.varchar)("email", { length: 255 }).notNull().unique(),
    firstName: (0, pg_core_1.varchar)("first_name", { length: 255 }),
    lastName: (0, pg_core_1.varchar)("last_name", { length: 255 }),
    role: (0, exports.brandRoleEnum)("role").notNull().default("area_manager"),
    commercialAreaCodes: (0, pg_core_1.text)("commercial_area_codes").array(),
    permissions: (0, pg_core_1.text)("permissions").array().notNull(),
    department: (0, pg_core_1.varchar)("department", { length: 255 }),
    hireDate: (0, pg_core_1.date)("hire_date"),
    managerId: (0, pg_core_1.varchar)("manager_id", { length: 255 }),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    mfaEnabled: (0, pg_core_1.boolean)("mfa_enabled").default(false),
    mfaSecret: (0, pg_core_1.varchar)("mfa_secret", { length: 255 }),
    lastLoginAt: (0, pg_core_1.timestamp)("last_login_at"),
    failedLoginAttempts: (0, pg_core_1.smallint)("failed_login_attempts").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.brandTenants.id)
});
// Brand Roles table
exports.brandRoles = exports.brandInterfaceSchema.table("brand_roles", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.brandTenants.id),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    isGlobal: (0, pg_core_1.boolean)("is_global").default(false),
    allowedAreas: (0, pg_core_1.text)("allowed_areas").array(),
    permissions: (0, pg_core_1.text)("permissions").array().notNull(),
    isSystem: (0, pg_core_1.boolean)("is_system").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow()
});
// Brand Audit Logs table
exports.brandAuditLogs = exports.brandInterfaceSchema.table("brand_audit_logs", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    userEmail: (0, pg_core_1.varchar)("user_email", { length: 255 }).notNull(),
    userRole: (0, pg_core_1.varchar)("user_role", { length: 50 }),
    commercialAreas: (0, pg_core_1.text)("commercial_areas").array(),
    action: (0, pg_core_1.varchar)("action", { length: 100 }).notNull(),
    resourceType: (0, pg_core_1.varchar)("resource_type", { length: 100 }),
    resourceIds: (0, pg_core_1.text)("resource_ids").array(),
    targetTenants: (0, pg_core_1.text)("target_tenants").array(),
    metadata: (0, pg_core_1.jsonb)("metadata").default({}),
    ipAddress: (0, pg_core_1.varchar)("ip_address", { length: 45 }),
    userAgent: (0, pg_core_1.text)("user_agent"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull().references(() => exports.brandTenants.id)
});
// ==================== AI AGENT REGISTRY ====================
// Central registry for AI agents managed by Brand Interface
exports.agentModuleContextEnum = exports.brandInterfaceSchema.enum("agent_module_context", [
    "sales", "hr", "finance", "operations", "support", "general", "workflow"
]);
exports.agentStatusEnum = exports.brandInterfaceSchema.enum("agent_status", [
    "active", "inactive", "deprecated", "development"
]);
// AI Agents Registry - Master control for all tenants
exports.aiAgentsRegistry = exports.brandInterfaceSchema.table("ai_agents_registry", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    agentId: (0, pg_core_1.varchar)("agent_id", { length: 50 }).notNull().unique(),
    name: (0, pg_core_1.varchar)("name", { length: 100 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    systemPrompt: (0, pg_core_1.text)("system_prompt").notNull(),
    personality: (0, pg_core_1.jsonb)("personality").default({}),
    moduleContext: (0, exports.agentModuleContextEnum)("module_context").notNull().default("general"),
    baseConfiguration: (0, pg_core_1.jsonb)("base_configuration").default({}),
    version: (0, pg_core_1.integer)("version").notNull().default(1),
    status: (0, exports.agentStatusEnum)("status").notNull().default("active"),
    isLegacy: (0, pg_core_1.boolean)("is_legacy").default(false), // Flag per agenti migrati
    targetTenants: (0, pg_core_1.text)("target_tenants").array(), // Specific tenants or null for all
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    createdBy: (0, pg_core_1.varchar)("created_by", { length: 255 }),
    brandTenantId: (0, pg_core_1.uuid)("brand_tenant_id").notNull().references(() => exports.brandTenants.id)
});
// ==================== AI AGENT SCHEMAS ====================
exports.insertAIAgentRegistrySchema = (0, drizzle_zod_1.createInsertSchema)(exports.aiAgentsRegistry).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.selectAIAgentRegistrySchema = (0, drizzle_zod_1.createSelectSchema)(exports.aiAgentsRegistry);
