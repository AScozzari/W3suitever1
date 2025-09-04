import { sql } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  jsonb,
  uuid,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ==================== ENUMS ====================
export const tenantTypeEnum = pgEnum('tenant_type', ['franchise', 'corporate', 'independent']);
export const userRoleEnum = pgEnum('user_role', ['super_admin', 'tenant_admin', 'store_manager', 'cashier', 'user']);
export const permissionScopeEnum = pgEnum('permission_scope', ['system', 'tenant', 'rs', 'store']);
export const storeTypeEnum = pgEnum('store_type', ['flagship', 'franchise', 'outlet', 'pop_up']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'suspended', 'cancelled', 'trial']);

// ==================== CORE MULTITENANT ARCHITECTURE ====================

// Session storage table (Required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Tenants - Root level tenant organization
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  type: tenantTypeEnum('type').notNull(),
  description: text('description'),
  
  // Business details
  vatNumber: varchar('vat_number', { length: 50 }),
  fiscalCode: varchar('fiscal_code', { length: 50 }),
  pec: varchar('pec', { length: 255 }),
  sdiCode: varchar('sdi_code', { length: 10 }),
  
  // Subscription & limits
  subscriptionStatus: subscriptionStatusEnum('subscription_status').notNull().default('trial'),
  maxStores: integer('max_stores').notNull().default(1),
  maxUsers: integer('max_users').notNull().default(5),
  
  // Metadata
  settings: jsonb('settings').default('{}'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Legal Entities - Multiple legal entities per tenant for complex organizations
export const legalEntities = pgTable('legal_entities', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  
  name: varchar('name', { length: 255 }).notNull(),
  legalName: varchar('legal_name', { length: 255 }).notNull(),
  vatNumber: varchar('vat_number', { length: 50 }).notNull(),
  fiscalCode: varchar('fiscal_code', { length: 50 }),
  
  // Address
  address: varchar('address', { length: 500 }),
  city: varchar('city', { length: 100 }),
  province: varchar('province', { length: 10 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 100 }).default('IT'),
  
  // Contacts
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  pec: varchar('pec', { length: 255 }),
  website: varchar('website', { length: 255 }),
  
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// RS (Raggruppamento Strategico) - Strategic groupings within tenant
export const strategicGroups = pgTable('strategic_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  legalEntityId: uuid('legal_entity_id').references(() => legalEntities.id, { onDelete: 'cascade' }).notNull(),
  
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  settings: jsonb('settings').default('{}'),
  
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Stores - Physical or virtual store locations
export const stores = pgTable('stores', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  legalEntityId: uuid('legal_entity_id').references(() => legalEntities.id, { onDelete: 'cascade' }),
  strategicGroupId: uuid('strategic_group_id').references(() => strategicGroups.id, { onDelete: 'set null' }),
  
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: storeTypeEnum('type').notNull(),
  
  // Location
  address: varchar('address', { length: 500 }),
  city: varchar('city', { length: 100 }),
  province: varchar('province', { length: 10 }),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 100 }).default('IT'),
  geoLocation: jsonb('geo_location'), // {lat, lng}
  
  // Business details
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  managerEmail: varchar('manager_email', { length: 255 }),
  
  // Settings
  timezone: varchar('timezone', { length: 100 }).default('Europe/Rome'),
  currency: varchar('currency', { length: 10 }).default('EUR'),
  settings: jsonb('settings').default('{}'),
  
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==================== USER MANAGEMENT & RBAC ====================

// Users - Central user management with tenant-scoped access (maintain Replit Auth compatibility)
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  
  // System fields
  isSystemAdmin: boolean('is_system_admin').notNull().default(false),
  lastLoginAt: timestamp('last_login_at'),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Tenant Roles - Many-to-many with scoped permissions
export const userTenantRoles = pgTable('user_tenant_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  role: userRoleEnum('role').notNull(),
  
  // Scope limitations (null = full scope within role)
  legalEntityId: uuid('legal_entity_id').references(() => legalEntities.id, { onDelete: 'cascade' }),
  strategicGroupId: uuid('strategic_group_id').references(() => strategicGroups.id, { onDelete: 'cascade' }),
  storeId: uuid('store_id').references(() => stores.id, { onDelete: 'cascade' }),
  
  // Permissions override
  customPermissions: jsonb('custom_permissions').default('[]'),
  
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Permissions - Granular permission system
export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  module: varchar('module', { length: 100 }).notNull(), // crm, pos, inventory, etc
  scope: permissionScopeEnum('scope').notNull(),
  
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Role Permissions - Default permissions per role
export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  role: userRoleEnum('role').notNull(),
  permissionId: uuid('permission_id').references(() => permissions.id, { onDelete: 'cascade' }).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

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

export const storesRelations = relations(stores, ({ one }) => ({
  tenant: one(tenants, {
    fields: [stores.tenantId],
    references: [tenants.id],
  }),
  legalEntity: one(legalEntities, {
    fields: [stores.legalEntityId],
    references: [legalEntities.id],
  }),
  strategicGroup: one(strategicGroups, {
    fields: [stores.strategicGroupId],
    references: [strategicGroups.id],
  }),
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
  legalEntity: one(legalEntities, {
    fields: [userTenantRoles.legalEntityId],
    references: [legalEntities.id],
  }),
  strategicGroup: one(strategicGroups, {
    fields: [userTenantRoles.strategicGroupId],
    references: [strategicGroups.id],
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

// ==================== ZOD SCHEMAS ====================

// Tenant schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectTenantSchema = createSelectSchema(tenants);
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = z.infer<typeof selectTenantSchema>;

// Legal Entity schemas
export const insertLegalEntitySchema = createInsertSchema(legalEntities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectLegalEntitySchema = createSelectSchema(legalEntities);
export type InsertLegalEntity = z.infer<typeof insertLegalEntitySchema>;
export type LegalEntity = z.infer<typeof selectLegalEntitySchema>;

// Strategic Group schemas
export const insertStrategicGroupSchema = createInsertSchema(strategicGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectStrategicGroupSchema = createSelectSchema(strategicGroups);
export type InsertStrategicGroup = z.infer<typeof insertStrategicGroupSchema>;
export type StrategicGroup = z.infer<typeof selectStrategicGroupSchema>;

// Store schemas
export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectStoreSchema = createSelectSchema(stores);
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Store = z.infer<typeof selectStoreSchema>;

// User schemas (maintain compatibility with Replit Auth)
export const upsertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;

// User Tenant Role schemas
export const insertUserTenantRoleSchema = createInsertSchema(userTenantRoles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectUserTenantRoleSchema = createSelectSchema(userTenantRoles);
export type InsertUserTenantRole = z.infer<typeof insertUserTenantRoleSchema>;
export type UserTenantRole = z.infer<typeof selectUserTenantRoleSchema>;

// Permission schemas
export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  createdAt: true,
});
export const selectPermissionSchema = createSelectSchema(permissions);
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type Permission = z.infer<typeof selectPermissionSchema>;
