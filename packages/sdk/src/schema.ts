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
  unique,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==================== SESSIONS TABLE ====================
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// ==================== USERS TABLE ====================
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ==================== MULTITENANT CORE TABLES ====================

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  domain: varchar("domain", { length: 255 }),
  isActive: boolean("is_active").default(true),
  subscriptionTier: varchar("subscription_tier", { length: 50 }).default("basic"),
  features: jsonb("features").default({}),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const legalEntities = pgTable("legal_entities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  legalForm: varchar("legal_form", { length: 100 }),
  taxId: varchar("tax_id", { length: 50 }),
  vatNumber: varchar("vat_number", { length: 50 }),
  address: text("address"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_legal_entities_tenant").on(table.tenantId),
]);

export const strategicGroups = pgTable("strategic_groups", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  legalEntityId: uuid("legal_entity_id").references(() => legalEntities.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_strategic_groups_tenant").on(table.tenantId),
  index("idx_strategic_groups_legal_entity").on(table.legalEntityId),
]);

export const stores = pgTable("stores", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  strategicGroupId: uuid("strategic_group_id").references(() => strategicGroups.id, { onDelete: "set null" }),
  legalEntityId: uuid("legal_entity_id").references(() => legalEntities.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  isActive: boolean("is_active").default(true),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_stores_tenant").on(table.tenantId),
  index("idx_stores_strategic_group").on(table.strategicGroupId),
  index("idx_stores_legal_entity").on(table.legalEntityId),
  unique("unique_store_code_tenant").on(table.code, table.tenantId),
]);

// ==================== RBAC TABLES ====================

export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  module: varchar("module", { length: 100 }).notNull(),
  scope: varchar("scope", { length: 50 }).default("tenant"), // tenant, store, global
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_permissions_module").on(table.module),
  index("idx_permissions_scope").on(table.scope),
]);

export const rolePermissions = pgTable("role_permissions", {
  role: varchar("role", { length: 100 }).notNull(),
  permissionId: uuid("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.role, table.permissionId] }),
  index("idx_role_permissions_role").on(table.role),
]);

export const userTenantRoles = pgTable("user_tenant_roles", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 100 }).notNull(),
  storeId: uuid("store_id").references(() => stores.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.tenantId, table.role] }),
  index("idx_user_tenant_roles_user").on(table.userId),
  index("idx_user_tenant_roles_tenant").on(table.tenantId),
  index("idx_user_tenant_roles_store").on(table.storeId),
]);

// ==================== RELATIONS ====================

export const tenantsRelations = relations(tenants, ({ many }) => ({
  legalEntities: many(legalEntities),
  strategicGroups: many(strategicGroups),
  stores: many(stores),
  userTenantRoles: many(userTenantRoles),
}));

export const legalEntitiesRelations = relations(legalEntities, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [legalEntities.tenantId],
    references: [tenants.id],
  }),
  strategicGroups: many(strategicGroups),
  stores: many(stores),
}));

export const strategicGroupsRelations = relations(strategicGroups, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [strategicGroups.tenantId],
    references: [tenants.id],
  }),
  legalEntity: one(legalEntities, {
    fields: [strategicGroups.legalEntityId],
    references: [legalEntities.id],
  }),
  stores: many(stores),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [stores.tenantId],
    references: [tenants.id],
  }),
  strategicGroup: one(strategicGroups, {
    fields: [stores.strategicGroupId],
    references: [strategicGroups.id],
  }),
  legalEntity: one(legalEntities, {
    fields: [stores.legalEntityId],
    references: [legalEntities.id],
  }),
  userTenantRoles: many(userTenantRoles),
}));

export const usersRelations = relations(users, ({ many }) => ({
  userTenantRoles: many(userTenantRoles),
}));

export const userTenantRolesRelations = relations(userTenantRoles, ({ one }) => ({
  user: one(users, {
    fields: [userTenantRoles.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [userTenantRoles.tenantId],
    references: [tenants.id],
  }),
  store: one(stores, {
    fields: [userTenantRoles.storeId],
    references: [stores.id],
  }),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

// ==================== TYPES & SCHEMAS ====================

// User types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Tenant types
export type InsertTenant = typeof tenants.$inferInsert;
export type Tenant = typeof tenants.$inferSelect;
export const insertTenantSchema = createInsertSchema(tenants);

// Legal Entity types
export type InsertLegalEntity = typeof legalEntities.$inferInsert;
export type LegalEntity = typeof legalEntities.$inferSelect;
export const insertLegalEntitySchema = createInsertSchema(legalEntities);

// Strategic Group types
export type InsertStrategicGroup = typeof strategicGroups.$inferInsert;
export type StrategicGroup = typeof strategicGroups.$inferSelect;
export const insertStrategicGroupSchema = createInsertSchema(strategicGroups);

// Store types
export type InsertStore = typeof stores.$inferInsert;
export type Store = typeof stores.$inferSelect;
export const insertStoreSchema = createInsertSchema(stores);

// RBAC types
export type InsertPermission = typeof permissions.$inferInsert;
export type Permission = typeof permissions.$inferSelect;
export const insertPermissionSchema = createInsertSchema(permissions);

export type InsertRolePermission = typeof rolePermissions.$inferInsert;
export type RolePermission = typeof rolePermissions.$inferSelect;

export type InsertUserTenantRole = typeof userTenantRoles.$inferInsert;
export type UserTenantRole = typeof userTenantRoles.$inferSelect;
export const insertUserTenantRoleSchema = createInsertSchema(userTenantRoles);