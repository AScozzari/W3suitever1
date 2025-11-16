import { pgTable, varchar, text, boolean, uuid, timestamp, smallint, date, integer, jsonb, pgSchema, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Create brand_interface schema
export const brandInterfaceSchema = pgSchema("brand_interface");

// Enum per i ruoli brand (deve matchare l'enum esistente nel database)
export const brandRoleEnum = brandInterfaceSchema.enum("brand_role", [
  "area_manager",
  "national_manager",
  "super_admin"
]);

// Brand Tenants table
export const brandTenants = brandInterfaceSchema.table("brand_tenants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }),
  type: varchar("type", { length: 50 }).default("brand_interface"),
  status: varchar("status", { length: 50 }).default("active"),
  settings: jsonb("settings").default({}),
  features: jsonb("features").default({}),
  brandAdminEmail: varchar("brand_admin_email", { length: 255 }),
  apiKey: varchar("api_key", { length: 255 }),
  allowedIpRanges: text("allowed_ip_ranges").array(),
  maxConcurrentUsers: integer("max_concurrent_users").default(50),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  archivedAt: timestamp("archived_at")
});

// Brand Users table
export const brandUsers = brandInterfaceSchema.table("brand_users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  role: brandRoleEnum("role").notNull().default("area_manager"),
  commercialAreaCodes: text("commercial_area_codes").array(),
  permissions: text("permissions").array().notNull(),
  department: varchar("department", { length: 255 }),
  hireDate: date("hire_date"),
  managerId: varchar("manager_id", { length: 255 }),
  isActive: boolean("is_active").default(true),
  mfaEnabled: boolean("mfa_enabled").default(false),
  mfaSecret: varchar("mfa_secret", { length: 255 }),
  lastLoginAt: timestamp("last_login_at"),
  failedLoginAttempts: smallint("failed_login_attempts").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  tenantId: uuid("tenant_id").notNull().references(() => brandTenants.id)
});

// Brand Roles table
export const brandRoles = brandInterfaceSchema.table("brand_roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => brandTenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isGlobal: boolean("is_global").default(false),
  allowedAreas: text("allowed_areas").array(),
  permissions: text("permissions").array().notNull(),
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Brand Audit Logs table
export const brandAuditLogs = brandInterfaceSchema.table("brand_audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userEmail: varchar("user_email", { length: 255 }).notNull(),
  userRole: varchar("user_role", { length: 50 }),
  commercialAreas: text("commercial_areas").array(),
  action: varchar("action", { length: 100 }).notNull(),
  resourceType: varchar("resource_type", { length: 100 }),
  resourceIds: text("resource_ids").array(),
  targetTenants: text("target_tenants").array(),
  metadata: jsonb("metadata").default({}),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
  tenantId: uuid("tenant_id").notNull().references(() => brandTenants.id)
});

// Enums for Brand Tasks
export const taskStatusEnum = brandInterfaceSchema.enum("task_status", [
  "pending",
  "in_progress", 
  "completed"
]);

export const taskPriorityEnum = brandInterfaceSchema.enum("task_priority", [
  "low",
  "medium",
  "high"
]);

// Brand Tasks table - Task management for Brand Interface
export const brandTasks = brandInterfaceSchema.table("brand_tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  assignee: varchar("assignee", { length: 255 }).notNull(),
  status: taskStatusEnum("status").notNull().default("pending"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  dueDate: date("due_date"),
  category: varchar("category", { length: 100 }).notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  brandTenantId: uuid("brand_tenant_id").notNull().references(() => brandTenants.id)
});

// Export types
export type BrandTenant = typeof brandTenants.$inferSelect;
export type NewBrandTenant = typeof brandTenants.$inferInsert;
export type BrandUser = typeof brandUsers.$inferSelect;
export type NewBrandUser = typeof brandUsers.$inferInsert;
export type BrandRole = typeof brandRoles.$inferSelect;
export type NewBrandRole = typeof brandRoles.$inferInsert;
export type BrandAuditLog = typeof brandAuditLogs.$inferSelect;
export type NewBrandAuditLog = typeof brandAuditLogs.$inferInsert;
export type BrandTask = typeof brandTasks.$inferSelect;
export type NewBrandTask = typeof brandTasks.$inferInsert;

// Zod schemas for validation
export const insertBrandTaskSchema = createInsertSchema(brandTasks, {
  title: z.string().min(1, "Il titolo è obbligatorio").max(255),
  description: z.string().optional(),
  assignee: z.string().email("Email non valida"),
  status: z.enum(["pending", "in_progress", "completed"]).default("pending"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.string().optional(),
  category: z.string().min(1, "La categoria è obbligatoria"),
  metadata: z.record(z.any()).optional()
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  brandTenantId: true
});

export const selectBrandTaskSchema = createSelectSchema(brandTasks);
export type InsertBrandTask = z.infer<typeof insertBrandTaskSchema>;
export type SelectBrandTask = z.infer<typeof selectBrandTaskSchema>;

// ==================== MANAGEMENT DTOs ====================

// Store/PDV DTOs for Management Structure tab
export interface StoreListDTO {
  id: string;
  codigo: string;
  ragioneSocialeId: string;
  ragioneSocialeName: string;
  nome: string;
  via: string;
  citta: string;
  provincia: string;
  stato: 'active' | 'inactive' | 'pending';
  canale: string;
  areaCommerciale: string;
  dataApertura?: string;
  manager?: string;
  telefono?: string;
  email?: string;
  tenantId: string;
  tenantName: string;
}

// Store list filters DTO
export interface StoreFiltersDTO {
  areaCommerciale?: string;
  canale?: string;
  citta?: string;
  provincia?: string;
  stato?: 'active' | 'inactive' | 'pending' | 'all';
  search?: string;
  tenantId?: string;
  page?: number;
  limit?: number;
}

// Store list response DTO
export interface StoreListResponseDTO {
  stores: StoreListDTO[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  filters: StoreFiltersDTO;
}

// Structure stats DTO
export interface StructureStatsDTO {
  totalStores: number;
  activeStores: number;
  storesByChannel: Array<{
    canale: string;
    count: number;
    percentage: number;
  }>;
  storesByArea: Array<{
    areaCommerciale: string;
    count: number;
    percentage: number;
  }>;
  recentStores: Array<{
    id: string;
    nome: string;
    dataApertura: string;
    stato: string;
  }>;
  growth: {
    thisMonth: number;
    lastMonth: number;
    percentage: number;
  };
}

// Organization creation DTO
export interface CreateOrganizationDTO {
  name: string;
  slug?: string;
  type?: string;
  brandAdminEmail: string;
  settings?: Record<string, any>;
  features?: Record<string, any>;
  maxConcurrentUsers?: number;
  allowedIpRanges?: string[];
}

// Export CSV DTO
export interface ExportStoresDTO {
  format: 'csv' | 'xlsx';
  filters?: StoreFiltersDTO;
  columns?: string[];
  includeStats?: boolean;
}

// Bulk operations DTO
export interface BulkOperationDTO {
  operation: 'activate' | 'deactivate' | 'delete' | 'update_channel' | 'update_area';
  storeIds: string[];
  values?: Record<string, any>;
  reason?: string;
}

// Bulk operation result DTO
export interface BulkOperationResultDTO {
  success: boolean;
  processedCount: number;
  errorCount: number;
  errors: Array<{
    storeId: string;
    error: string;
  }>;
  operation: string;
  timestamp: string;
}

// ==================== AI AGENT REGISTRY ====================
// Central registry for AI agents managed by Brand Interface

export const agentModuleContextEnum = brandInterfaceSchema.enum("agent_module_context", [
  "sales", "hr", "finance", "operations", "support", "general", "workflow"
]);

export const agentStatusEnum = brandInterfaceSchema.enum("agent_status", [
  "active", "inactive", "deprecated", "development"
]);

// AI Agents Registry - Master control for all tenants
export const aiAgentsRegistry = brandInterfaceSchema.table("ai_agents_registry", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  systemPrompt: text("system_prompt").notNull(),
  personality: jsonb("personality").default({}),
  moduleContext: agentModuleContextEnum("module_context").notNull().default("general"),
  baseConfiguration: jsonb("base_configuration").default({}),
  version: integer("version").notNull().default(1),
  status: agentStatusEnum("status").notNull().default("active"),
  isLegacy: boolean("is_legacy").default(false), // Flag per agenti migrati
  targetTenants: text("target_tenants").array(), // Specific tenants or null for all
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by", { length: 255 }),
  brandTenantId: uuid("brand_tenant_id").notNull().references(() => brandTenants.id)
});

// ==================== AI AGENT TYPES ====================

export type AIAgentRegistry = typeof aiAgentsRegistry.$inferSelect;
export type NewAIAgentRegistry = typeof aiAgentsRegistry.$inferInsert;

// Agent profile DTO for runtime usage
export interface AgentProfile {
  id: string;
  agentId: string;
  name: string;
  description?: string;
  systemPrompt: string;
  personality: Record<string, any>;
  moduleContext: string;
  baseConfiguration: Record<string, any>;
  version: number;
  status: string;
  isEnabled?: boolean; // Tenant-specific enabled status from ai_agent_tenant_settings
}

// ==================== AI AGENT SCHEMAS ====================

export const insertAIAgentRegistrySchema = createInsertSchema(aiAgentsRegistry).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const selectAIAgentRegistrySchema = createSelectSchema(aiAgentsRegistry);

// ==================== DEPLOY CENTER SYSTEM ====================
// Git-like deployment tracking for 300+ tenants

// Deployment status enum
export const deploymentStatusEnum = brandInterfaceSchema.enum("deployment_status", [
  "draft",      // Not yet ready for deploy
  "ready",      // Ready to be deployed
  "deploying",  // Currently pushing to tenants
  "deployed",   // Successfully deployed
  "failed"      // Deployment failed
]);

// Tool type enum
export const deployToolEnum = brandInterfaceSchema.enum("deploy_tool", [
  "crm",
  "wms",
  "pos",
  "analytics"
]);

// Resource type enum  
export const deployResourceTypeEnum = brandInterfaceSchema.enum("deploy_resource_type", [
  "campaign",
  "pipeline", 
  "funnel",
  "product",
  "supplier",
  "pricelist",
  "dashboard"
]);

// Branch type enum
export const branchTypeEnum = brandInterfaceSchema.enum("branch_type", [
  "main",  // Tenant main branch
  "pdv"    // PDV secondary branch
]);

// Branch deployment status enum
export const branchDeployStatusEnum = brandInterfaceSchema.enum("branch_deploy_status", [
  "pending",
  "in_progress",
  "completed",
  "failed",
  "conflict"
]);

// Brand Deployments - Commit/deployment tracking (like Git commits)
export const brandDeployments = brandInterfaceSchema.table("brand_deployments", {
  id: varchar("id", { length: 100 }).primaryKey(), // commit-crm-05
  tool: deployToolEnum("tool").notNull(),
  resourceType: deployResourceTypeEnum("resource_type").notNull(),
  resourceId: uuid("resource_id"), // Original resource UUID
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  version: varchar("version", { length: 50 }).notNull(), // 1.2.3
  status: deploymentStatusEnum("status").notNull().default("draft"),
  jsonPath: text("json_path"), // Path to JSON file
  payload: jsonb("payload"), // Full resource data
  metadata: jsonb("metadata").default({}), // Additional info
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deployedAt: timestamp("deployed_at"),
  brandTenantId: uuid("brand_tenant_id").notNull().references(() => brandTenants.id)
});

// Brand Branches - Tenant/PDV branch naming (like Git branches)
export const brandBranches = brandInterfaceSchema.table("brand_branches", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  branchName: varchar("branch_name", { length: 255 }).notNull().unique(), // rossi-spa or rossi-spa/milano-centro
  branchType: branchTypeEnum("branch_type").notNull(),
  tenantId: uuid("tenant_id").notNull(), // FK to w3suite.tenants
  pdvId: uuid("pdv_id"), // FK to w3suite.stores (null for main branch)
  parentBranch: varchar("parent_branch", { length: 255 }), // rossi-spa for PDV branches
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  brandTenantId: uuid("brand_tenant_id").notNull().references(() => brandTenants.id)
});

// Brand Deployment Status - Track deployment status per branch
export const brandDeploymentStatus = brandInterfaceSchema.table("brand_deployment_status", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  deploymentId: varchar("deployment_id", { length: 100 }).notNull().references(() => brandDeployments.id),
  branchName: varchar("branch_name", { length: 255 }).notNull(),
  status: branchDeployStatusEnum("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  webhookResponse: jsonb("webhook_response"),
  attemptCount: integer("attempt_count").default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  deployedAt: timestamp("deployed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  brandTenantId: uuid("brand_tenant_id").notNull().references(() => brandTenants.id)
});

// ==================== DEPLOY CENTER TYPES ====================

export type BrandDeployment = typeof brandDeployments.$inferSelect;
export type NewBrandDeployment = typeof brandDeployments.$inferInsert;
export type BrandBranch = typeof brandBranches.$inferSelect;
export type NewBrandBranch = typeof brandBranches.$inferInsert;
export type BrandDeploymentStatus = typeof brandDeploymentStatus.$inferSelect;
export type NewBrandDeploymentStatus = typeof brandDeploymentStatus.$inferInsert;

// ==================== DEPLOY CENTER SCHEMAS ====================

export const insertBrandDeploymentSchema = createInsertSchema(brandDeployments).omit({
  createdAt: true,
  updatedAt: true
});

export const updateBrandDeploymentSchema = insertBrandDeploymentSchema.partial();

export const insertBrandBranchSchema = createInsertSchema(brandBranches).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const updateBrandBranchSchema = insertBrandBranchSchema.partial();

export const insertBrandDeploymentStatusSchema = createInsertSchema(brandDeploymentStatus).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const updateBrandDeploymentStatusSchema = insertBrandDeploymentStatusSchema.partial();