import { pgTable, varchar, text, boolean, uuid, timestamp, smallint, date, integer, jsonb, pgSchema, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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