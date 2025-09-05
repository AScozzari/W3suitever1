import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  pgEnum,
  timestamp,
  varchar,
  text,
  boolean,
  uuid,
  primaryKey,
  smallint,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==================== ENUMS ====================
export const scopeTypeEnum = pgEnum('scope_type', ['tenant', 'legal_entity', 'store']);
export const permModeEnum = pgEnum('perm_mode', ['grant', 'revoke']);

// ==================== SESSIONS TABLE (Replit Auth) ====================
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// ==================== USERS TABLE (Replit Auth) ====================
export const users = pgTable("users", {
  id: varchar("id").primaryKey(), // varchar per compatibilità Replit Auth
  email: varchar("email", { length: 255 }).unique(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isSystemAdmin: boolean("is_system_admin").default(false),
  lastLoginAt: timestamp("last_login_at"),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  status: varchar("status", { length: 50 }).default("active"),
  mfaEnabled: boolean("mfa_enabled").default(false),
});

export const insertUserSchema = createInsertSchema(users).omit({ 
  createdAt: true, 
  updatedAt: true 
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UpsertUser = InsertUser;

// ==================== TENANTS ====================
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique(),
  status: varchar("status", { length: 50 }).default("active"),
  settings: jsonb("settings").default({}),
  features: jsonb("features").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
});

export const insertTenantSchema = createInsertSchema(tenants).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

// ==================== LEGAL ENTITIES ====================
export const legalEntities = pgTable("legal_entities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  vat: varchar("vat", { length: 50 }),
  billingProfileId: uuid("billing_profile_id"),
  status: varchar("status", { length: 50 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
});

export const insertLegalEntitySchema = createInsertSchema(legalEntities).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertLegalEntity = z.infer<typeof insertLegalEntitySchema>;
export type LegalEntity = typeof legalEntities.$inferSelect;

// ==================== BRANDS ====================
export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==================== CHANNELS ====================
export const channels = pgTable("channels", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==================== BUSINESS DRIVERS ====================
export const drivers = pgTable("drivers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==================== STORES ====================
export const stores = pgTable("stores", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  legalEntityId: uuid("legal_entity_id").notNull().references(() => legalEntities.id),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  channelId: uuid("channel_id").notNull().references(() => channels.id),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  province: varchar("province", { length: 10 }),
  region: varchar("region", { length: 100 }),
  geo: jsonb("geo"),
  status: varchar("status", { length: 50 }).default("active"),
  openedAt: date("opened_at"),
  closedAt: date("closed_at"),
  billingOverrideId: uuid("billing_override_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
}, (table) => [
  uniqueIndex("stores_tenant_code_unique").on(table.tenantId, table.code),
]);

export const insertStoreSchema = createInsertSchema(stores).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Store = typeof stores.$inferSelect;

// ==================== STORE ASSOCIATIONS ====================
export const storeBrands = pgTable("store_brands", {
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
  brandId: uuid("brand_id").notNull().references(() => brands.id),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.storeId, table.brandId] }),
]);

export const storeDriverPotential = pgTable("store_driver_potential", {
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
  driverId: uuid("driver_id").notNull().references(() => drivers.id),
  potentialScore: smallint("potential_score").notNull(),
  clusterLabel: varchar("cluster_label", { length: 50 }),
  kpis: jsonb("kpis"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.storeId, table.driverId] }),
]);

// ==================== RBAC SYSTEM ====================
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("roles_tenant_name_unique").on(table.tenantId, table.name),
]);

export const insertRoleSchema = createInsertSchema(roles).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

export const rolePerms = pgTable("role_perms", {
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: 'cascade' }),
  perm: varchar("perm", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.roleId, table.perm] }),
]);

export const userAssignments = pgTable("user_assignments", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: 'cascade' }),
  scopeType: scopeTypeEnum("scope_type").notNull(),
  scopeId: uuid("scope_id").notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.roleId, table.scopeType, table.scopeId] }),
]);

export const insertUserAssignmentSchema = createInsertSchema(userAssignments).omit({ 
  createdAt: true 
});
export type InsertUserAssignment = z.infer<typeof insertUserAssignmentSchema>;
export type UserAssignment = typeof userAssignments.$inferSelect;

export const userExtraPerms = pgTable("user_extra_perms", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  perm: varchar("perm", { length: 255 }).notNull(),
  mode: permModeEnum("mode").notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.perm] }),
]);