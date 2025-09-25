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

// Export types
export type BrandTenant = typeof brandTenants.$inferSelect;
export type NewBrandTenant = typeof brandTenants.$inferInsert;
export type BrandUser = typeof brandUsers.$inferSelect;
export type NewBrandUser = typeof brandUsers.$inferInsert;
export type BrandRole = typeof brandRoles.$inferSelect;
export type NewBrandRole = typeof brandRoles.$inferInsert;
export type BrandAuditLog = typeof brandAuditLogs.$inferSelect;
export type NewBrandAuditLog = typeof brandAuditLogs.$inferInsert;

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
}

// ==================== AI AGENT SCHEMAS ====================

export const insertAIAgentRegistrySchema = createInsertSchema(aiAgentsRegistry).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const selectAIAgentRegistrySchema = createSelectSchema(aiAgentsRegistry);