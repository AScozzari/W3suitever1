// W3 Suite Schema - Dedicated schema for tenant-specific tables
// All tables in this file will be created in 'w3suite' schema

import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  pgEnum,
  pgSchema,
  timestamp,
  varchar,
  text,
  boolean,
  uuid,
  primaryKey,
  smallint,
  integer,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Import public schema tables for FK references
import { brands, channels, commercialAreas, drivers } from './public';

// ==================== W3 SUITE SCHEMA ====================
export const w3suiteSchema = pgSchema("w3suite");

// ==================== ENUMS ====================
export const scopeTypeEnum = pgEnum('scope_type', ['tenant', 'legal_entity', 'store']);
export const permModeEnum = pgEnum('perm_mode', ['grant', 'revoke']);
export const userStatusEnum = pgEnum('user_status', ['attivo', 'sospeso', 'off-boarding']);

// Notification System Enums
export const notificationTypeEnum = pgEnum('notification_type', ['system', 'security', 'data', 'custom']);
export const notificationPriorityEnum = pgEnum('notification_priority', ['low', 'medium', 'high', 'critical']);
export const notificationStatusEnum = pgEnum('notification_status', ['unread', 'read']);

// Object Storage Enums
export const objectVisibilityEnum = pgEnum('object_visibility', ['public', 'private']);
export const objectTypeEnum = pgEnum('object_type', ['avatar', 'document', 'image', 'file']);

// ==================== TENANTS ====================
export const tenants = w3suiteSchema.table("tenants", {
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

// ==================== USERS TABLE (OAuth2 Enterprise) ====================
export const users = w3suiteSchema.table("users", {
  id: varchar("id").primaryKey(), // OAuth2 standard sub field
  email: varchar("email", { length: 255 }).unique(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  // Avatar metadata fields
  avatarObjectPath: varchar("avatar_object_path", { length: 500 }),
  avatarVisibility: objectVisibilityEnum("avatar_visibility").default("public"),
  avatarUploadedAt: timestamp("avatar_uploaded_at"),
  avatarUploadedBy: varchar("avatar_uploaded_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isSystemAdmin: boolean("is_system_admin").default(false),
  lastLoginAt: timestamp("last_login_at"),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  status: userStatusEnum("status").default("attivo"),
  mfaEnabled: boolean("mfa_enabled").default(false),
  // Extended enterprise fields
  role: varchar("role", { length: 50 }),
  storeId: uuid("store_id").references(() => stores.id),
  phone: varchar("phone", { length: 20 }),
  position: varchar("position", { length: 100 }),
  department: varchar("department", { length: 100 }),
  hireDate: date("hire_date"),
  contractType: varchar("contract_type", { length: 50 }),
}, (table) => [
  index("users_tenant_idx").on(table.tenantId),
]);

export const insertUserSchema = createInsertSchema(users).omit({ 
  createdAt: true, 
  updatedAt: true 
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UpsertUser = InsertUser;

// ==================== LEGAL ENTITIES ====================
export const legalEntities = w3suiteSchema.table("legal_entities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  codice: varchar("codice", { length: 20 }).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  pIva: varchar("piva", { length: 50 }),
  billingProfileId: uuid("billing_profile_id"),
  stato: varchar("stato", { length: 50 }).default("Attiva"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
  // Extended enterprise fields
  codiceFiscale: varchar("codiceFiscale", { length: 50 }),
  formaGiuridica: varchar("formaGiuridica", { length: 100 }),
  capitaleSociale: varchar("capitaleSociale", { length: 50 }),
  dataCostituzione: date("dataCostituzione"),
  indirizzo: text("indirizzo"),
  citta: varchar("citta", { length: 100 }),
  provincia: varchar("provincia", { length: 10 }),
  cap: varchar("cap", { length: 10 }),
  telefono: varchar("telefono", { length: 50 }),
  email: varchar("email", { length: 255 }),
  pec: varchar("pec", { length: 255 }),
  rea: varchar("rea", { length: 100 }),
  registroImprese: varchar("registroImprese", { length: 255 }),
  // New enterprise fields for enhanced functionality
  logo: text("logo"), // PNG file path or base64
  codiceSDI: varchar("codiceSDI", { length: 10 }),
  // Administrative contact section - using camelCase column names
  refAmminNome: varchar("refAmminNome", { length: 100 }),
  refAmminCognome: varchar("refAmminCognome", { length: 100 }),
  refAmminEmail: varchar("refAmminEmail", { length: 255 }),
  refAmminCodiceFiscale: varchar("refAmminCodiceFiscale", { length: 16 }),
  refAmminIndirizzo: text("refAmminIndirizzo"),
  refAmminCitta: varchar("refAmminCitta", { length: 100 }),
  refAmminCap: varchar("refAmminCap", { length: 10 }),
  refAmminPaese: varchar("refAmminPaese", { length: 100 }),
  // Dynamic notes field
  note: text("note"),
}, (table) => [
  uniqueIndex("legal_entities_tenant_codice_unique").on(table.tenantId, table.codice),
]);

export const insertLegalEntitySchema = createInsertSchema(legalEntities).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertLegalEntity = z.infer<typeof insertLegalEntitySchema>;
export type LegalEntity = typeof legalEntities.$inferSelect;

// ==================== STORES ====================
export const stores = w3suiteSchema.table("stores", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  legalEntityId: uuid("legal_entity_id").notNull().references(() => legalEntities.id),
  code: varchar("code", { length: 50 }).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  channelId: uuid("channel_id").notNull().references(() => channels.id),
  commercialAreaId: uuid("commercial_area_id").notNull().references(() => commercialAreas.id),
  address: text("address"),
  citta: varchar("citta", { length: 100 }),
  provincia: varchar("provincia", { length: 10 }),
  cap: varchar("cap", { length: 10 }),
  region: varchar("region", { length: 100 }),
  geo: jsonb("geo"),
  status: varchar("status", { length: 50 }).default("active"),
  openedAt: date("opened_at"),
  closedAt: date("closed_at"),
  billingOverrideId: uuid("billing_override_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
  // Contact fields
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  // Social and digital contact fields
  whatsapp1: varchar("whatsapp1", { length: 20 }),
  whatsapp2: varchar("whatsapp2", { length: 20 }),
  facebook: varchar("facebook", { length: 255 }),
  instagram: varchar("instagram", { length: 255 }),
  tiktok: varchar("tiktok", { length: 255 }),
  googleMapsUrl: text("google_maps_url"),
  telegram: varchar("telegram", { length: 255 }),
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

// ==================== RBAC SYSTEM ====================
export const roles = w3suiteSchema.table("roles", {
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

export const rolePerms = w3suiteSchema.table("role_perms", {
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: 'cascade' }),
  perm: varchar("perm", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.roleId, table.perm] }),
]);

export const userAssignments = w3suiteSchema.table("user_assignments", {
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

export const userExtraPerms = w3suiteSchema.table("user_extra_perms", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  perm: varchar("perm", { length: 255 }).notNull(),
  mode: permModeEnum("mode").notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.perm] }),
]);

// ==================== STORE ASSOCIATIONS ====================
export const userStores = w3suiteSchema.table("user_stores", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.storeId] }),
  index("user_stores_user_idx").on(table.userId),
  index("user_stores_store_idx").on(table.storeId),
  index("user_stores_tenant_idx").on(table.tenantId),
]);

export const insertUserStoreSchema = createInsertSchema(userStores).omit({ 
  createdAt: true 
});
export type InsertUserStore = z.infer<typeof insertUserStoreSchema>;
export type UserStore = typeof userStores.$inferSelect;

// ==================== USER LEGAL ENTITIES (1:M Users → Legal Entities) ====================
export const userLegalEntities = w3suiteSchema.table("user_legal_entities", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  legalEntityId: uuid("legal_entity_id").notNull().references(() => legalEntities.id, { onDelete: 'cascade' }),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.legalEntityId] }),
  index("user_legal_entities_user_idx").on(table.userId),
  index("user_legal_entities_legal_entity_idx").on(table.legalEntityId),
  index("user_legal_entities_tenant_idx").on(table.tenantId),
]);

export const insertUserLegalEntitySchema = createInsertSchema(userLegalEntities).omit({ 
  createdAt: true 
});
export type InsertUserLegalEntity = z.infer<typeof insertUserLegalEntitySchema>;
export type UserLegalEntity = typeof userLegalEntities.$inferSelect;

export const storeBrands = w3suiteSchema.table("store_brands", {
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
  brandId: uuid("brand_id").notNull().references(() => brands.id),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.storeId, table.brandId] }),
  index("store_brands_tenant_idx").on(table.tenantId),
]);

export const storeDriverPotential = w3suiteSchema.table("store_driver_potential", {
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
  driverId: uuid("driver_id").notNull().references(() => drivers.id),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  potentialScore: smallint("potential_score").notNull(),
  clusterLabel: varchar("cluster_label", { length: 50 }),
  kpis: jsonb("kpis"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.storeId, table.driverId] }),
  index("store_driver_potential_tenant_idx").on(table.tenantId),
]);

// ==================== ENTITY LOGS ====================
export const entityLogs = w3suiteSchema.table('entity_logs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'legal_entity', 'store', 'user'
  entityId: uuid('entity_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(), // 'created', 'status_changed', 'updated', 'deleted'
  previousStatus: varchar('previous_status', { length: 50 }),
  newStatus: varchar('new_status', { length: 50 }),
  changes: jsonb('changes'), // JSON con tutti i cambiamenti
  userId: varchar('user_id').references(() => users.id), // Chi ha fatto il cambio
  userEmail: varchar('user_email', { length: 255 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const insertEntityLogSchema = createInsertSchema(entityLogs).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertEntityLog = z.infer<typeof insertEntityLogSchema>;
export type EntityLog = typeof entityLogs.$inferSelect;

// ==================== STRUCTURED LOGS ====================
export const structuredLogs = w3suiteSchema.table('structured_logs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  
  // Core log fields
  level: varchar('level', { length: 10 }).notNull(), // INFO, WARN, ERROR, DEBUG
  message: text('message').notNull(),
  component: varchar('component', { length: 100 }).notNull(),
  
  // Context tracking
  correlationId: varchar('correlation_id', { length: 50 }),
  userId: varchar('user_id').references(() => users.id),
  userEmail: varchar('user_email', { length: 255 }),
  
  // Business context
  action: varchar('action', { length: 100 }),
  entityType: varchar('entity_type', { length: 50 }), // 'tenant', 'legal_entity', 'store', 'user'
  entityId: uuid('entity_id'),
  
  // Performance metrics
  duration: integer('duration'), // in milliseconds
  
  // Request context
  httpMethod: varchar('http_method', { length: 10 }),
  httpPath: varchar('http_path', { length: 255 }),
  httpStatusCode: integer('http_status_code'),
  ipAddress: varchar('ip_address', { length: 45 }), // IPv6 compatible
  userAgent: text('user_agent'),
  
  // Error context
  errorStack: text('error_stack'),
  errorCode: varchar('error_code', { length: 50 }),
  
  // Additional metadata
  metadata: jsonb('metadata'), // Flexible JSON data
  
  // Timestamps
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  // Indexes for performance
  index('structured_logs_tenant_timestamp_idx').on(table.tenantId, table.timestamp),
  index('structured_logs_level_timestamp_idx').on(table.level, table.timestamp),
  index('structured_logs_component_timestamp_idx').on(table.component, table.timestamp),
  index('structured_logs_correlation_idx').on(table.correlationId),
  index('structured_logs_user_timestamp_idx').on(table.userId, table.timestamp),
  index('structured_logs_entity_idx').on(table.entityType, table.entityId),
]);

export const insertStructuredLogSchema = createInsertSchema(structuredLogs).omit({ 
  id: true, 
  createdAt: true,
  timestamp: true
});
export type InsertStructuredLog = z.infer<typeof insertStructuredLogSchema>;
export type StructuredLog = typeof structuredLogs.$inferSelect;

// ==================== OBJECT STORAGE METADATA ====================
export const objectMetadata = w3suiteSchema.table("object_metadata", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  objectPath: varchar("object_path", { length: 500 }).notNull().unique(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  contentType: varchar("content_type", { length: 100 }).notNull(),
  fileSize: integer("file_size").notNull(),
  visibility: objectVisibilityEnum("visibility").notNull().default("private"),
  objectType: objectTypeEnum("object_type").notNull().default("file"),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  publicUrl: varchar("public_url", { length: 500 }),
  bucketId: varchar("bucket_id", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  metadata: jsonb("metadata").default({}), // Additional custom metadata
}, (table) => [
  index("object_metadata_tenant_idx").on(table.tenantId),
  index("object_metadata_uploaded_by_idx").on(table.uploadedBy),
  index("object_metadata_object_type_idx").on(table.objectType),
]);

export const insertObjectMetadataSchema = createInsertSchema(objectMetadata).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertObjectMetadata = z.infer<typeof insertObjectMetadataSchema>;
export type ObjectMetadata = typeof objectMetadata.$inferSelect;

// ==================== OBJECT ACCESS CONTROL (ACL) ====================
export const objectAcls = w3suiteSchema.table("object_acls", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  objectPath: varchar("object_path", { length: 500 }).notNull(),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  ownerTenantId: uuid("owner_tenant_id").notNull().references(() => tenants.id),
  visibility: objectVisibilityEnum("visibility").notNull().default("private"),
  accessRules: jsonb("access_rules").default([]), // Array of access rules
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("object_acls_tenant_idx").on(table.tenantId),
  index("object_acls_object_path_idx").on(table.objectPath),
  index("object_acls_owner_idx").on(table.ownerId),
  uniqueIndex("object_acls_object_path_unique").on(table.objectPath),
]);

export const insertObjectAclSchema = createInsertSchema(objectAcls).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertObjectAcl = z.infer<typeof insertObjectAclSchema>;
export type ObjectAcl = typeof objectAcls.$inferSelect;

// ==================== NOTIFICATIONS SYSTEM ====================
export const notifications = w3suiteSchema.table("notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Notification Classification
  type: notificationTypeEnum("type").notNull().default("system"),
  priority: notificationPriorityEnum("priority").notNull().default("medium"),
  status: notificationStatusEnum("status").notNull().default("unread"),
  
  // Content
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  data: jsonb("data").default({}), // Extra structured data
  url: varchar("url", { length: 500 }), // Deep link URL
  
  // Targeting
  targetUserId: varchar("target_user_id").references(() => users.id), // Specific user (null = broadcast)
  targetRoles: text("target_roles").array(), // Role-based targeting
  broadcast: boolean("broadcast").default(false), // Send to all tenant users
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Auto-cleanup for temp notifications
}, (table) => [
  // Performance indexes for common queries
  index("notifications_tenant_status_created_idx").on(table.tenantId, table.status, table.createdAt.desc()),
  index("notifications_tenant_user_status_idx").on(table.tenantId, table.targetUserId, table.status),
  index("notifications_target_roles_gin_idx").using("gin", table.targetRoles),
  index("notifications_expires_at_idx").on(table.expiresAt),
  index("notifications_tenant_priority_created_idx").on(table.tenantId, table.priority, table.createdAt.desc()),
]);

export const insertNotificationSchema = createInsertSchema(notifications).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ==================== DRIZZLE RELATIONS ====================

// Tenants Relations
export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  users: many(users),
  stores: many(stores),
  legalEntities: many(legalEntities),
  roles: many(roles),
  entityLogs: many(entityLogs),
  structuredLogs: many(structuredLogs),
  userStores: many(userStores),
  userLegalEntities: many(userLegalEntities),
  storeBrands: many(storeBrands),
  storeDriverPotential: many(storeDriverPotential),
  notifications: many(notifications),
}));

// Users Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  store: one(stores, { fields: [users.storeId], references: [stores.id] }),
  userStores: many(userStores),
  userLegalEntities: many(userLegalEntities),
  userAssignments: many(userAssignments),
  userExtraPerms: many(userExtraPerms),
  entityLogs: many(entityLogs),
  structuredLogs: many(structuredLogs),
  notifications: many(notifications),
}));

// Legal Entities Relations
export const legalEntitiesRelations = relations(legalEntities, ({ one, many }) => ({
  tenant: one(tenants, { fields: [legalEntities.tenantId], references: [tenants.id] }),
  stores: many(stores),
  userLegalEntities: many(userLegalEntities),
}));

// Stores Relations
export const storesRelations = relations(stores, ({ one, many }) => ({
  tenant: one(tenants, { fields: [stores.tenantId], references: [tenants.id] }),
  legalEntity: one(legalEntities, { fields: [stores.legalEntityId], references: [legalEntities.id] }),
  channel: one(channels, { fields: [stores.channelId], references: [channels.id] }),
  commercialArea: one(commercialAreas, { fields: [stores.commercialAreaId], references: [commercialAreas.id] }),
  userStores: many(userStores),
  storeBrands: many(storeBrands),
  storeDriverPotential: many(storeDriverPotential),
  users: many(users),
}));

// Roles Relations
export const rolesRelations = relations(roles, ({ one, many }) => ({
  tenant: one(tenants, { fields: [roles.tenantId], references: [tenants.id] }),
  rolePerms: many(rolePerms),
  userAssignments: many(userAssignments),
}));

// Role Permissions Relations
export const rolePermsRelations = relations(rolePerms, ({ one }) => ({
  role: one(roles, { fields: [rolePerms.roleId], references: [roles.id] }),
}));

// User Assignments Relations
export const userAssignmentsRelations = relations(userAssignments, ({ one }) => ({
  user: one(users, { fields: [userAssignments.userId], references: [users.id] }),
  role: one(roles, { fields: [userAssignments.roleId], references: [roles.id] }),
}));

// User Extra Permissions Relations
export const userExtraPermsRelations = relations(userExtraPerms, ({ one }) => ({
  user: one(users, { fields: [userExtraPerms.userId], references: [users.id] }),
}));

// User Stores Relations
export const userStoresRelations = relations(userStores, ({ one }) => ({
  user: one(users, { fields: [userStores.userId], references: [users.id] }),
  store: one(stores, { fields: [userStores.storeId], references: [stores.id] }),
  tenant: one(tenants, { fields: [userStores.tenantId], references: [tenants.id] }),
}));

// Store Brands Relations
export const storeBrandsRelations = relations(storeBrands, ({ one }) => ({
  store: one(stores, { fields: [storeBrands.storeId], references: [stores.id] }),
  brand: one(brands, { fields: [storeBrands.brandId], references: [brands.id] }),
  tenant: one(tenants, { fields: [storeBrands.tenantId], references: [tenants.id] }),
}));

// Store Driver Potential Relations
export const storeDriverPotentialRelations = relations(storeDriverPotential, ({ one }) => ({
  store: one(stores, { fields: [storeDriverPotential.storeId], references: [stores.id] }),
  driver: one(drivers, { fields: [storeDriverPotential.driverId], references: [drivers.id] }),
  tenant: one(tenants, { fields: [storeDriverPotential.tenantId], references: [tenants.id] }),
}));

// Entity Logs Relations
export const entityLogsRelations = relations(entityLogs, ({ one }) => ({
  tenant: one(tenants, { fields: [entityLogs.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [entityLogs.userId], references: [users.id] }),
}));

// Structured Logs Relations
export const structuredLogsRelations = relations(structuredLogs, ({ one }) => ({
  tenant: one(tenants, { fields: [structuredLogs.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [structuredLogs.userId], references: [users.id] }),
}));

// User Legal Entities Relations
export const userLegalEntitiesRelations = relations(userLegalEntities, ({ one }) => ({
  user: one(users, { fields: [userLegalEntities.userId], references: [users.id] }),
  legalEntity: one(legalEntities, { fields: [userLegalEntities.legalEntityId], references: [legalEntities.id] }),
  tenant: one(tenants, { fields: [userLegalEntities.tenantId], references: [tenants.id] }),
}));

// Notifications Relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  tenant: one(tenants, { fields: [notifications.tenantId], references: [tenants.id] }),
  targetUser: one(users, { fields: [notifications.targetUserId], references: [users.id] }),
}));

// Object Metadata Relations
export const objectMetadataRelations = relations(objectMetadata, ({ one }) => ({
  tenant: one(tenants, { fields: [objectMetadata.tenantId], references: [tenants.id] }),
  uploadedByUser: one(users, { fields: [objectMetadata.uploadedBy], references: [users.id] }),
}));

// Object ACLs Relations  
export const objectAclsRelations = relations(objectAcls, ({ one }) => ({
  tenant: one(tenants, { fields: [objectAcls.tenantId], references: [tenants.id] }),
  ownerTenant: one(tenants, { fields: [objectAcls.ownerTenantId], references: [tenants.id] }),
  owner: one(users, { fields: [objectAcls.ownerId], references: [users.id] }),
}));