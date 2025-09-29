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
  customType,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Import public schema tables for FK references
import { brands, channels, commercialAreas, drivers, countries, italianCities, paymentMethods, paymentMethodsConditions } from './public';

// ==================== CUSTOM TYPES FOR PGVECTOR ====================
// Define custom type for pgvector columns
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

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

// ✅ STORES CATEGORY: Enum for store types (sales_point=9xxx, office=6xxx, warehouse=5xxx)
export const storeCategoryEnum = pgEnum('store_category', ['sales_point', 'office', 'warehouse']);
export const notificationCategoryEnum = pgEnum('notification_category', ['sales', 'finance', 'marketing', 'support', 'operations']);

// Object Storage Enums
export const objectVisibilityEnum = pgEnum('object_visibility', ['public', 'private']);
export const objectTypeEnum = pgEnum('object_type', ['avatar', 'document', 'image', 'file']);

// Supplier Enums
export const supplierOriginEnum = pgEnum('supplier_origin', ['brand', 'tenant']);
export const supplierTypeEnum = pgEnum('supplier_type', ['distributore', 'produttore', 'servizi', 'logistica']);
export const supplierStatusEnum = pgEnum('supplier_status', ['active', 'suspended', 'blocked']);

// HR System Enums
// Calendar Event Enums
export const calendarEventTypeEnum = pgEnum('calendar_event_type', ['meeting', 'shift', 'time_off', 'overtime', 'training', 'deadline', 'other']);
export const calendarEventVisibilityEnum = pgEnum('calendar_event_visibility', ['private', 'team', 'store', 'area', 'tenant']);
export const calendarEventStatusEnum = pgEnum('calendar_event_status', ['tentative', 'confirmed', 'cancelled']);

// Time Tracking Enums
export const trackingMethodEnum = pgEnum('tracking_method', ['badge', 'nfc', 'app', 'gps', 'manual', 'biometric', 'qr', 'smart', 'web']);
export const timeTrackingStatusEnum = pgEnum('time_tracking_status', ['active', 'completed', 'edited', 'disputed']);


// Shift Enums
export const shiftTypeEnum = pgEnum('shift_type', ['morning', 'afternoon', 'night', 'full_day', 'split', 'on_call']);
export const shiftStatusEnum = pgEnum('shift_status', ['draft', 'published', 'in_progress', 'completed', 'cancelled']);
export const shiftPatternEnum = pgEnum('shift_pattern', ['daily', 'weekly', 'monthly', 'custom']);

// HR Document Enums
export const hrDocumentTypeEnum = pgEnum('hr_document_type', ['payslip', 'contract', 'certificate', 'id_document', 'cv', 'evaluation', 'warning', 'other']);
export const hrDocumentSourceEnum = pgEnum('hr_document_source', ['employee', 'hr', 'system']);

// Expense Report Enums
export const expenseReportStatusEnum = pgEnum('expense_report_status', ['draft', 'submitted', 'approved', 'rejected', 'reimbursed']);
export const expensePaymentMethodEnum = pgEnum('expense_payment_method', ['cash', 'credit_card', 'bank_transfer']);
export const expenseCategoryEnum = pgEnum('expense_category', ['travel', 'meal', 'accommodation', 'transport', 'supplies', 'other']);

// HR Announcement Enums

// AI System Enums
export const aiConnectionStatusEnum = pgEnum('ai_connection_status', ['connected', 'disconnected', 'error']);
export const aiPrivacyModeEnum = pgEnum('ai_privacy_mode', ['standard', 'strict']);
export const aiFeatureTypeEnum = pgEnum('ai_feature_type', [
  'chat', 
  'embedding', 
  'transcription', 
  'vision_analysis', 
  'url_scraping',
  'document_analysis', 
  'natural_queries', 
  'financial_forecasting', 
  'web_search', 
  'code_interpreter', 
  'image_generation', 
  'voice_assistant'
]);
export const aiModelEnum = pgEnum('ai_model', [
  'gpt-4o',
  'gpt-4-turbo', 
  'gpt-4o-mini',
  'gpt-4',
  'gpt-3.5-turbo',
  'text-embedding-3-small',
  'text-embedding-3-large', 
  'whisper-1',
  'dall-e-3'
]);

// ✅ CRITICAL ENUM FIX: Add missing calendar_event_category enum
export const calendarEventCategoryEnum = pgEnum('calendar_event_category', [
  'sales', 'finance', 'hr', 'crm', 'support', 'operations', 'marketing'
]);


// ==================== TENANTS ====================
export const tenants = w3suiteSchema.table("tenants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  status: varchar("status", { length: 50 }).default("active"),
  notes: text("notes"), // Added notes field for Management Center
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
}).extend({
  slug: z.string().min(1, "Slug non può essere vuoto").max(100, "Slug troppo lungo")
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
  
  // LOCATION FIELDS (real database fields only)
  address: text("address"),
  geo: jsonb("geo"),
  
  citta: varchar("citta", { length: 100 }),
  provincia: varchar("provincia", { length: 10 }),
  cap: varchar("cap", { length: 10 }),
  region: varchar("region", { length: 100 }),
  status: varchar("status", { length: 50 }).default("active"),
  category: storeCategoryEnum("category").default("sales_point").notNull(),
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
  
  // ==================== BUSINESS CATEGORY EXTENSION ====================
  category: notificationCategoryEnum("category").default("support"), // Business category
  sourceModule: varchar("source_module", { length: 50 }), // Module that generated notification
  
  // Content
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  data: jsonb("data").default({}), // Extra structured data
  url: varchar("url", { length: 500 }), // Deep link URL
  
  // ==================== ENHANCED TARGETING ====================
  targetUserId: varchar("target_user_id").references(() => users.id), // Specific user (null = broadcast)
  targetRoles: text("target_roles").array(), // Role-based targeting
  broadcast: boolean("broadcast").default(false), // Send to all tenant users
  
  // Store/Area specific targeting
  storeId: uuid("store_id").references(() => stores.id), // Store-specific notifications
  areaId: uuid("area_id").references(() => legalEntities.id), // Area-specific (via legal entities)
  
  // ==================== REAL-TIME TRACKING ====================
  websocketSent: boolean("websocket_sent").default(false), // Track real-time delivery
  
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
  
  // ==================== NEW INDEXES FOR BUSINESS CATEGORIES ====================
  index("notifications_category_created_idx").on(table.category, table.createdAt.desc()),
  index("notifications_store_category_idx").on(table.storeId, table.category, table.status),
  index("notifications_area_category_idx").on(table.areaId, table.category, table.status),
  index("notifications_websocket_pending_idx").on(table.websocketSent, table.status, table.createdAt),
]);

export const insertNotificationSchema = createInsertSchema(notifications).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// ==================== NOTIFICATION TEMPLATES ====================
export const notificationTemplates = w3suiteSchema.table("notification_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Template Identification
  templateKey: varchar("template_key", { length: 100 }).notNull(), // e.g., 'hr_request_submitted'
  category: varchar("category", { length: 50 }).notNull(), // e.g., 'hr_request', 'general'
  eventType: varchar("event_type", { length: 100 }).notNull(), // e.g., 'status_change', 'deadline_reminder'
  
  // Template Content
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // In-App Notification Template
  inAppTitle: varchar("in_app_title", { length: 255 }).notNull(),
  inAppMessage: text("in_app_message").notNull(),
  inAppUrl: varchar("in_app_url", { length: 500 }), // Deep link template
  
  // Email Template
  emailSubject: varchar("email_subject", { length: 255 }),
  emailBodyHtml: text("email_body_html"),
  emailBodyText: text("email_body_text"),
  
  // Template Variables (documentation)
  availableVariables: jsonb("available_variables").default([]), // Array of variable names
  
  // Targeting Rules
  defaultPriority: notificationPriorityEnum("default_priority").notNull().default("medium"),
  roleTargeting: text("role_targeting").array(), // Default roles to target
  
  // Metadata
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("notification_templates_tenant_idx").on(table.tenantId),
  index("notification_templates_category_idx").on(table.category),
  uniqueIndex("notification_templates_tenant_key_unique").on(table.tenantId, table.templateKey),
]);

export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplates).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertNotificationTemplate = z.infer<typeof insertNotificationTemplateSchema>;
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;

// ==================== NOTIFICATION PREFERENCES ====================
export const notificationPreferences = w3suiteSchema.table("notification_preferences", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // Channel Preferences
  inAppEnabled: boolean("in_app_enabled").default(true),
  emailEnabled: boolean("email_enabled").default(true),
  
  // Category Preferences (JSON for flexibility)
  categoryPreferences: jsonb("category_preferences").default({}), // { hr_request: { email: true, inApp: true, priority: 'high' } }
  
  // Priority Filtering
  minPriorityInApp: notificationPriorityEnum("min_priority_in_app").default("low"),
  minPriorityEmail: notificationPriorityEnum("min_priority_email").default("medium"),
  
  // Quiet Hours (24-hour format)
  quietHoursEnabled: boolean("quiet_hours_enabled").default(false),
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }), // "22:00"
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }), // "08:00"
  
  // Digest Preferences
  dailyDigestEnabled: boolean("daily_digest_enabled").default(false),
  weeklyDigestEnabled: boolean("weekly_digest_enabled").default(true),
  digestDeliveryTime: varchar("digest_delivery_time", { length: 5 }).default("09:00"), // "09:00"
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("notification_preferences_tenant_idx").on(table.tenantId),
  index("notification_preferences_user_idx").on(table.userId),
  uniqueIndex("notification_preferences_tenant_user_unique").on(table.tenantId, table.userId),
]);

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;


// ==================== SUPPLIERS (Brand Base + Tenant Override Pattern) ====================
export const suppliers = w3suiteSchema.table("suppliers", {
  // ==================== IDENTITÀ & CLASSIFICAZIONE ====================
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  origin: supplierOriginEnum("origin").notNull(), // 'brand' | 'tenant'
  tenantId: uuid("tenant_id").references(() => tenants.id), // NULL per supplier brand-managed
  externalId: varchar("external_id", { length: 100 }), // ID da Brand Interface
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(), // Nome commerciale
  legalName: varchar("legal_name", { length: 255 }), // Ragione sociale legale
  legalForm: varchar("legal_form", { length: 100 }), // Forma giuridica (SRL, SPA, etc.)
  supplierType: supplierTypeEnum("supplier_type").notNull(),
  
  // ==================== DATI FISCALI ITALIA ====================
  vatNumber: varchar("vat_number", { length: 20 }), // P.IVA
  taxCode: varchar("tax_code", { length: 20 }), // Codice Fiscale (opzionale)
  sdiCode: varchar("sdi_code", { length: 20 }), // Codice SDI fatturazione elettronica
  pecEmail: varchar("pec_email", { length: 255 }), // PEC (alternativa a SDI)
  reaNumber: varchar("rea_number", { length: 50 }), // Numero REA
  chamberOfCommerce: varchar("chamber_of_commerce", { length: 255 }),
  
  // ==================== INDIRIZZO SEDE LEGALE ====================
  registeredAddress: jsonb("registered_address"), // { via, civico, cap, citta, provincia }
  cityId: uuid("city_id").references(() => italianCities.id), // FK to public.italian_cities
  countryId: uuid("country_id").references(() => countries.id).notNull(), // FK to public.countries
  
  // ==================== PAGAMENTI ====================
  preferredPaymentMethodId: uuid("preferred_payment_method_id").references(() => paymentMethods.id),
  paymentConditionId: uuid("payment_condition_id").references(() => paymentMethodsConditions.id),
  paymentTerms: varchar("payment_terms", { length: 100 }), // "30DFFM", "60GGDF", etc. - DEPRECATED, use paymentConditionId
  currency: varchar("currency", { length: 3 }).default("EUR"),
  
  // ==================== CONTATTI ====================
  email: varchar("email", { length: 255 }), // Email principale
  phone: varchar("phone", { length: 50 }), // Telefono principale
  website: varchar("website", { length: 255 }), // Sito web
  // Referenti strutturati (JSONB per flessibilità)
  contacts: jsonb("contacts").default({}), // { commerciale: {...}, amministrativo: {...}, logistico: {...} }
  
  // ==================== AMMINISTRATIVI ESTESI ====================
  iban: varchar("iban", { length: 34 }), // Codice IBAN
  bic: varchar("bic", { length: 11 }), // Codice BIC/SWIFT
  splitPayment: boolean("split_payment").default(false), // Split Payment
  withholdingTax: boolean("withholding_tax").default(false), // Ritenuta d'Acconto
  taxRegime: varchar("tax_regime", { length: 100 }), // Regime fiscale
  
  // ==================== CONTROLLO & STATO ====================
  status: supplierStatusEnum("status").notNull().default("active"),
  lockedFields: text("locked_fields").array().default([]), // Campi bloccati dal brand
  
  // ==================== METADATI ====================
  createdBy: varchar("created_by").notNull().references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  notes: text("notes"),
}, (table) => [
  // Performance indexes
  index("suppliers_tenant_code_idx").on(table.tenantId, table.code),
  index("suppliers_origin_status_idx").on(table.origin, table.status),
  index("suppliers_vat_number_idx").on(table.vatNumber),
  index("suppliers_name_idx").on(table.name),
  uniqueIndex("suppliers_code_unique").on(table.code),
]);

export const insertSupplierSchema = createInsertSchema(suppliers).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

// ==================== SUPPLIER OVERRIDES (Tenant-Specific Suppliers) ====================
// Full table for tenant-created suppliers (not just overrides)
export const supplierOverrides = w3suiteSchema.table("supplier_overrides", {
  // ==================== IDENTITÀ & CLASSIFICAZIONE ====================
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  origin: supplierOriginEnum("origin").notNull().default("tenant"), // Always 'tenant' for this table
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id), // Always required for tenant suppliers
  externalId: varchar("external_id", { length: 100 }), // ID from Brand Interface (usually NULL for tenant suppliers)
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(), // Nome commerciale
  legalName: varchar("legal_name", { length: 255 }), // Ragione sociale legale
  legalForm: varchar("legal_form", { length: 100 }), // Forma giuridica (SRL, SPA, etc.)
  supplierType: supplierTypeEnum("supplier_type").notNull(),
  
  // ==================== DATI FISCALI ITALIA ====================
  vatNumber: varchar("vat_number", { length: 20 }), // P.IVA
  taxCode: varchar("tax_code", { length: 20 }), // Codice Fiscale (opzionale)
  sdiCode: varchar("sdi_code", { length: 20 }), // Codice SDI fatturazione elettronica
  pecEmail: varchar("pec_email", { length: 255 }), // PEC (alternativa a SDI)
  reaNumber: varchar("rea_number", { length: 50 }), // Numero REA
  chamberOfCommerce: varchar("chamber_of_commerce", { length: 255 }),
  
  // ==================== INDIRIZZO SEDE LEGALE ====================
  registeredAddress: jsonb("registered_address"), // { via, civico, cap, citta, provincia }
  cityId: uuid("city_id").references(() => italianCities.id), // FK to public.italian_cities
  countryId: uuid("country_id").references(() => countries.id).notNull(), // FK to public.countries
  
  // ==================== PAGAMENTI ====================
  preferredPaymentMethodId: uuid("preferred_payment_method_id").references(() => paymentMethods.id),
  paymentConditionId: uuid("payment_condition_id").references(() => paymentMethodsConditions.id),
  paymentTerms: varchar("payment_terms", { length: 100 }), // "30DFFM", "60GGDF", etc. - DEPRECATED, use paymentConditionId
  currency: varchar("currency", { length: 3 }).default("EUR"),
  
  // ==================== CONTATTI ====================
  email: varchar("email", { length: 255 }), // Email principale
  phone: varchar("phone", { length: 50 }), // Telefono principale
  website: varchar("website", { length: 255 }), // Sito web
  // Referenti strutturati (JSONB per flessibilità)
  contacts: jsonb("contacts").default({}), // { commerciale: {...}, amministrativo: {...}, logistico: {...} }
  
  // ==================== AMMINISTRATIVI ESTESI ====================
  iban: varchar("iban", { length: 34 }), // Codice IBAN
  bic: varchar("bic", { length: 11 }), // Codice BIC/SWIFT
  splitPayment: boolean("split_payment").default(false), // Split Payment
  withholdingTax: boolean("withholding_tax").default(false), // Ritenuta d'Acconto
  taxRegime: varchar("tax_regime", { length: 100 }), // Regime fiscale
  
  // ==================== CONTROLLO & STATO ====================
  status: supplierStatusEnum("status").notNull().default("active"),
  lockedFields: text("locked_fields").array().default([]), // Campi bloccati dal brand (usually empty for tenant suppliers)
  
  // ==================== METADATI ====================
  createdBy: varchar("created_by").notNull().references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  notes: text("notes"),
}, (table) => [
  // Performance indexes
  index("supplier_overrides_tenant_code_idx").on(table.tenantId, table.code),
  index("supplier_overrides_origin_status_idx").on(table.origin, table.status),
  index("supplier_overrides_vat_number_idx").on(table.vatNumber),
  index("supplier_overrides_name_idx").on(table.name),
  uniqueIndex("supplier_overrides_tenant_code_unique").on(table.tenantId, table.code),
]);

export const insertSupplierOverrideSchema = createInsertSchema(supplierOverrides).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertSupplierOverride = z.infer<typeof insertSupplierOverrideSchema>;
export type SupplierOverride = typeof supplierOverrides.$inferSelect;

// ==================== HR SYSTEM TABLES ====================

// ==================== CALENDAR EVENTS ====================
export const calendarEvents = w3suiteSchema.table("calendar_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  
  // Core event data
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 255 }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  allDay: boolean("all_day").default(false),
  
  // Event classification
  type: calendarEventTypeEnum("type").notNull().default("other"),
  visibility: calendarEventVisibilityEnum("visibility").notNull().default("private"),
  status: calendarEventStatusEnum("status").notNull().default("tentative"),
  hrSensitive: boolean("hr_sensitive").default(false),
  
  // ✅ BUSINESS CATEGORY (was missing from Drizzle)
  category: calendarEventCategoryEnum("category").notNull().default("hr"),
  
  // RBAC scoping
  teamId: uuid("team_id"),
  storeId: uuid("store_id").references(() => stores.id),
  areaId: uuid("area_id"),
  
  // Recurring events
  recurring: jsonb("recurring").default({}), // { pattern, interval, daysOfWeek, endDate, exceptions }
  
  // Participants
  attendees: jsonb("attendees").default([]), // [{ userId, status, responseTime }]
  
  // Additional metadata
  metadata: jsonb("metadata").default({}), // Type-specific data
  color: varchar("color", { length: 7 }), // Hex color for UI
  
  // Audit fields
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
}, (table) => [
  index("calendar_events_tenant_owner_idx").on(table.tenantId, table.ownerId),
  index("calendar_events_tenant_date_idx").on(table.tenantId, table.startDate, table.endDate),
  index("calendar_events_tenant_type_idx").on(table.tenantId, table.type),
  index("calendar_events_store_date_idx").on(table.storeId, table.startDate),
]);

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;

// ==================== ENCRYPTION KEYS ====================
export const encryptionKeys = w3suiteSchema.table("encryption_keys", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Key identification
  keyId: varchar("key_id", { length: 100 }).notNull().unique(),
  version: integer("version").notNull().default(1),
  
  // Key metadata (NOT the actual key - keys are derived client-side)
  algorithm: varchar("algorithm", { length: 50 }).notNull().default("AES-GCM"),
  keyLength: integer("key_length").notNull().default(256),
  saltBase64: text("salt_base64").notNull(), // Salt for key derivation
  iterations: integer("iterations").notNull().default(100000),
  
  // Key status
  isActive: boolean("is_active").default(true),
  
  // GDPR compliance
  destroyedAt: timestamp("destroyed_at"), // For "right to be forgotten"
  destroyReason: varchar("destroy_reason", { length: 100 }),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Key rotation
}, (table) => [
  index("encryption_keys_tenant_active_idx").on(table.tenantId, table.isActive),
  index("encryption_keys_key_id_idx").on(table.keyId),
]);

export const insertEncryptionKeySchema = createInsertSchema(encryptionKeys).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertEncryptionKey = z.infer<typeof insertEncryptionKeySchema>;
export type EncryptionKey = typeof encryptionKeys.$inferSelect;

// ==================== TIME TRACKING ====================
export const timeTracking = w3suiteSchema.table("time_tracking", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  
  // Clock times
  clockIn: timestamp("clock_in").notNull(),
  clockOut: timestamp("clock_out"),
  breaks: jsonb("breaks").default([]), // [{ start, end, duration }]
  
  // Tracking details
  trackingMethod: trackingMethodEnum("tracking_method").notNull(),
  
  // LEGACY FIELDS (for backwards compatibility)
  geoLocation: jsonb("geo_location"), // { lat, lng, accuracy, address } - DEPRECATED
  deviceInfo: jsonb("device_info"), // { deviceId, deviceType, ipAddress, userAgent } - DEPRECATED
  notes: text("notes"), // DEPRECATED - use encryptedNotes
  
  // ENCRYPTED FIELDS
  encryptedGeoLocation: text("encrypted_geo_location"), // Base64 encrypted geo data
  encryptedDeviceInfo: text("encrypted_device_info"), // Base64 encrypted device data  
  encryptedNotes: text("encrypted_notes"), // Base64 encrypted notes
  
  // ENCRYPTION METADATA
  encryptionKeyId: varchar("encryption_key_id", { length: 100 }).references(() => encryptionKeys.keyId),
  encryptionVersion: integer("encryption_version").default(1),
  geoLocationIv: varchar("geo_location_iv", { length: 100 }), // Initialization vector for geo
  deviceInfoIv: varchar("device_info_iv", { length: 100 }), // IV for device info
  notesIv: varchar("notes_iv", { length: 100 }), // IV for notes
  geoLocationTag: varchar("geo_location_tag", { length: 100 }), // Auth tag for geo
  deviceInfoTag: varchar("device_info_tag", { length: 100 }), // Auth tag for device
  notesTag: varchar("notes_tag", { length: 100 }), // Auth tag for notes
  encryptedAt: timestamp("encrypted_at"), // When data was encrypted
  
  // Shift association
  shiftId: uuid("shift_id"), // Reference to planned shift
  
  // Calculated fields
  totalMinutes: integer("total_minutes"),
  breakMinutes: integer("break_minutes"),
  overtimeMinutes: integer("overtime_minutes"),
  holidayBonus: boolean("holiday_bonus").default(false),
  
  // Status and approval
  status: timeTrackingStatusEnum("status").notNull().default("active"),
  editReason: text("edit_reason"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("time_tracking_tenant_user_idx").on(table.tenantId, table.userId),
  index("time_tracking_tenant_store_date_idx").on(table.tenantId, table.storeId, table.clockIn),
  index("time_tracking_shift_idx").on(table.shiftId),
  index("time_tracking_status_idx").on(table.status),
  index("time_tracking_encryption_key_idx").on(table.encryptionKeyId),
]);

export const insertTimeTrackingSchema = createInsertSchema(timeTracking).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertTimeTracking = z.infer<typeof insertTimeTrackingSchema>;
export type TimeTracking = typeof timeTracking.$inferSelect;

// ==================== STORES TIMETRACKING METHODS ====================
// Configuration table linking stores to available timetracking methods
export const storesTimetrackingMethods = w3suiteSchema.table("stores_timetracking_methods", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  
  // Method configuration
  method: trackingMethodEnum("method").notNull(),
  enabled: boolean("enabled").default(true),
  priority: integer("priority").default(0), // For ordering methods in UI
  
  // Method-specific configuration
  config: jsonb("config").default({}), // Store method-specific settings
  // Examples of config content:
  // GPS: { geofenceRadius: 200, requiresWiFi: false, accuracyThreshold: 50 }
  // QR: { qrCodeUrl: "...", dynamicRefresh: 300, cameraRequired: true }
  // NFC: { requiredBadgeTypes: ["employee", "temp"], timeout: 30 }
  // Badge: { allowedBadgeFormats: ["numeric", "barcode"], length: 8 }
  // Smart: { fallbackOrder: ["gps", "qr", "badge"], confidence: 0.8 }
  // Web: { cookieExpiry: 2592000, fingerprintStrict: true }
  
  // Audit fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => [
  // Ensure unique store-method combinations per tenant
  uniqueIndex("stores_timetracking_methods_unique").on(table.tenantId, table.storeId, table.method),
  index("stores_timetracking_methods_tenant_idx").on(table.tenantId),
  index("stores_timetracking_methods_store_idx").on(table.storeId),
  index("stores_timetracking_methods_enabled_idx").on(table.enabled),
]);

export const insertStoresTimetrackingMethodsSchema = createInsertSchema(storesTimetrackingMethods).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertStoresTimetrackingMethods = z.infer<typeof insertStoresTimetrackingMethodsSchema>;
export type StoresTimetrackingMethods = typeof storesTimetrackingMethods.$inferSelect;

// ==================== SHIFTS ====================
export const shifts = w3suiteSchema.table("shifts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  
  // Shift identification
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 50 }),
  
  // Timing
  date: date("date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  breakMinutes: integer("break_minutes").default(0),
  
  // Staffing
  requiredStaff: integer("required_staff").notNull(),
  assignedUsers: jsonb("assigned_users").default([]), // [userId1, userId2, ...]
  
  // Shift details
  shiftType: shiftTypeEnum("shift_type").notNull(),
  templateId: uuid("template_id"),
  skills: jsonb("skills").default([]), // Required skills/certifications
  
  // Status and display
  status: shiftStatusEnum("status").notNull().default("draft"),
  notes: text("notes"),
  color: varchar("color", { length: 7 }), // Hex color for UI
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
}, (table) => [
  index("shifts_tenant_store_date_idx").on(table.tenantId, table.storeId, table.date),
  index("shifts_tenant_status_idx").on(table.tenantId, table.status),
  index("shifts_template_idx").on(table.templateId),
]);

export const insertShiftSchema = createInsertSchema(shifts).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shifts.$inferSelect;

// ==================== SHIFT TEMPLATES ====================
export const shiftTemplates = w3suiteSchema.table("shift_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Template identification
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  
  // Pattern configuration
  pattern: shiftPatternEnum("pattern").notNull(),
  rules: jsonb("rules").default({}), // Complex recurrence rules
  
  // Default values
  defaultStartTime: varchar("default_start_time", { length: 5 }), // HH:MM format
  defaultEndTime: varchar("default_end_time", { length: 5 }), // HH:MM format
  defaultRequiredStaff: integer("default_required_staff").notNull(),
  defaultSkills: jsonb("default_skills").default([]),
  defaultBreakMinutes: integer("default_break_minutes").default(30),
  
  // Validity
  isActive: boolean("is_active").default(true),
  validFrom: date("valid_from"),
  validUntil: date("valid_until"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("shift_templates_tenant_active_idx").on(table.tenantId, table.isActive),
  index("shift_templates_pattern_idx").on(table.pattern),
]);

export const insertShiftTemplateSchema = createInsertSchema(shiftTemplates).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertShiftTemplate = z.infer<typeof insertShiftTemplateSchema>;
export type ShiftTemplate = typeof shiftTemplates.$inferSelect;

// ==================== SHIFT TIME SLOTS ====================
// Enhanced support for multiple time slots per shift template
export const shiftTimeSlots = w3suiteSchema.table("shift_time_slots", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  templateId: uuid("template_id").notNull().references(() => shiftTemplates.id, { onDelete: 'cascade' }),
  
  // Time slot identification
  name: varchar("name", { length: 100 }).notNull(), // e.g. "Apertura", "Pausa Pranzo", "Chiusura"
  slotOrder: integer("slot_order").notNull(), // Order within the template
  
  // Timing
  startTime: varchar("start_time", { length: 5 }).notNull(), // HH:MM format
  endTime: varchar("end_time", { length: 5 }).notNull(), // HH:MM format
  
  // Slot configuration
  requiredStaff: integer("required_staff").notNull(),
  skills: jsonb("skills").default([]), // Required skills for this slot
  isBreak: boolean("is_break").default(false), // True if this is a break slot
  
  // Flexibility
  minStaff: integer("min_staff"), // Minimum staff required
  maxStaff: integer("max_staff"), // Maximum staff allowed
  priority: integer("priority").default(1), // 1=critical, 2=important, 3=optional
  
  // Metadata
  color: varchar("color", { length: 7 }), // Hex color for UI display
  notes: text("notes"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("shift_time_slots_template_order_idx").on(table.templateId, table.slotOrder),
  index("shift_time_slots_tenant_idx").on(table.tenantId),
  uniqueIndex("shift_time_slots_template_order_unique").on(table.templateId, table.slotOrder),
]);

export const insertShiftTimeSlotSchema = createInsertSchema(shiftTimeSlots).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertShiftTimeSlot = z.infer<typeof insertShiftTimeSlotSchema>;
export type ShiftTimeSlot = typeof shiftTimeSlots.$inferSelect;

// ==================== SHIFT ASSIGNMENTS ====================
// Enhanced many-to-many relationship for user-shift assignments with metadata
export const shiftAssignments = w3suiteSchema.table("shift_assignments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  shiftId: uuid("shift_id").notNull().references(() => shifts.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Assignment details
  assignmentType: varchar("assignment_type", { length: 20 }).notNull().default("manual"), // manual, auto, template
  timeSlotId: uuid("time_slot_id").references(() => shiftTimeSlots.id), // Specific time slot assignment
  
  // Assignment metadata
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id),
  
  // Status tracking
  status: varchar("status", { length: 20 }).notNull().default("assigned"), // assigned, confirmed, rejected, completed
  confirmedAt: timestamp("confirmed_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  
  // Performance tracking
  punctualityScore: integer("punctuality_score"), // 0-100 score for punctuality
  performanceNotes: text("performance_notes"),
  
  // Compliance and attendance
  expectedClockIn: timestamp("expected_clock_in"),
  expectedClockOut: timestamp("expected_clock_out"),
  actualClockIn: timestamp("actual_clock_in"),
  actualClockOut: timestamp("actual_clock_out"),
  
  // Deviation tracking
  clockInDeviationMinutes: integer("clock_in_deviation_minutes"), // Calculated deviation
  clockOutDeviationMinutes: integer("clock_out_deviation_minutes"),
  isCompliant: boolean("is_compliant").default(true), // Auto-calculated compliance flag
  
  // Notes and communication
  employeeNotes: text("employee_notes"), // Notes from employee
  managerNotes: text("manager_notes"), // Notes from manager
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Core indexes for performance
  index("shift_assignments_tenant_user_idx").on(table.tenantId, table.userId),
  index("shift_assignments_shift_idx").on(table.shiftId),
  index("shift_assignments_status_idx").on(table.status),
  index("shift_assignments_compliance_idx").on(table.isCompliant),
  index("shift_assignments_punctuality_idx").on(table.punctualityScore),
  
  // Unique constraint to prevent duplicate assignments
  uniqueIndex("shift_assignments_unique").on(table.shiftId, table.userId, table.timeSlotId),
  
  // Time-based indexes for reporting
  index("shift_assignments_assigned_date_idx").on(table.assignedAt),
  index("shift_assignments_expected_clock_in_idx").on(table.expectedClockIn),
]);

export const insertShiftAssignmentSchema = createInsertSchema(shiftAssignments).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  assignedAt: true
});
export type InsertShiftAssignment = z.infer<typeof insertShiftAssignmentSchema>;
export type ShiftAssignment = typeof shiftAssignments.$inferSelect;

// ==================== SHIFT ATTENDANCE ====================
// Enhanced shift compliance and attendance matching system
export const shiftAttendance = w3suiteSchema.table("shift_attendance", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  assignmentId: uuid("assignment_id").notNull().references(() => shiftAssignments.id, { onDelete: 'cascade' }),
  timeTrackingId: uuid("time_tracking_id").references(() => timeTracking.id),
  
  // Attendance status
  attendanceStatus: varchar("attendance_status", { length: 20 }).notNull().default("scheduled"), 
  // scheduled, present, late, absent, early_departure, overtime
  
  // Matching data
  matchingScore: real("matching_score"), // 0.0-1.0 confidence score for auto-matching
  matchingMethod: varchar("matching_method", { length: 20 }), // auto, manual, override
  
  // Deviation analysis
  scheduledStartTime: timestamp("scheduled_start_time").notNull(),
  scheduledEndTime: timestamp("scheduled_end_time").notNull(),
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  
  // Calculated metrics
  startDeviationMinutes: integer("start_deviation_minutes"), // + late, - early
  endDeviationMinutes: integer("end_deviation_minutes"),
  totalWorkedMinutes: integer("total_worked_minutes"),
  scheduledMinutes: integer("scheduled_minutes"),
  overtimeMinutes: integer("overtime_minutes"),
  
  // Compliance flags
  isOnTime: boolean("is_on_time").default(true),
  isCompliantDuration: boolean("is_compliant_duration").default(true),
  requiresApproval: boolean("requires_approval").default(false),
  
  // Geographic compliance
  clockInLocation: jsonb("clock_in_location"), // { lat, lng, accuracy, address }
  clockOutLocation: jsonb("clock_out_location"),
  isLocationCompliant: boolean("is_location_compliant").default(true),
  geofenceDeviationMeters: integer("geofence_deviation_meters"),
  
  // Alert and notification status
  alertsSent: jsonb("alerts_sent").default([]), // Array of alert types sent
  escalationLevel: integer("escalation_level").default(0), // 0=none, 1=supervisor, 2=hr, 3=admin
  
  // Manager review
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewStatus: varchar("review_status", { length: 20 }), // pending, approved, disputed, corrected
  reviewNotes: text("review_notes"),
  
  // System metadata
  processingStatus: varchar("processing_status", { length: 20 }).default("pending"), // pending, processed, error
  lastProcessedAt: timestamp("last_processed_at"),
  errorMessage: text("error_message"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Performance indexes
  index("shift_attendance_tenant_idx").on(table.tenantId),
  index("shift_attendance_assignment_idx").on(table.assignmentId),
  index("shift_attendance_time_tracking_idx").on(table.timeTrackingId),
  index("shift_attendance_status_idx").on(table.attendanceStatus),
  
  // Compliance and monitoring indexes
  index("shift_attendance_compliance_idx").on(table.isOnTime, table.isCompliantDuration, table.isLocationCompliant),
  index("shift_attendance_alerts_idx").on(table.requiresApproval, table.escalationLevel),
  index("shift_attendance_review_idx").on(table.reviewStatus, table.reviewedAt),
  
  // Time-based indexes for reporting
  index("shift_attendance_scheduled_time_idx").on(table.scheduledStartTime),
  index("shift_attendance_actual_time_idx").on(table.actualStartTime),
  index("shift_attendance_processing_idx").on(table.processingStatus, table.lastProcessedAt),
  
  // Unique constraint for assignment-timetracking relationship
  uniqueIndex("shift_attendance_assignment_tracking_unique").on(table.assignmentId, table.timeTrackingId),
]);

export const insertShiftAttendanceSchema = createInsertSchema(shiftAttendance).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertShiftAttendance = z.infer<typeof insertShiftAttendanceSchema>;
export type ShiftAttendance = typeof shiftAttendance.$inferSelect;

// ==================== HR DOCUMENTS ====================
export const hrDocuments = w3suiteSchema.table("hr_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // Document classification
  documentType: hrDocumentTypeEnum("document_type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  // File information
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  storagePath: varchar("storage_path", { length: 500 }).notNull(),
  
  // Period reference (for payslips)
  year: integer("year"),
  month: integer("month"),
  
  // Security and expiry
  isConfidential: boolean("is_confidential").default(false),
  expiryDate: date("expiry_date"),
  
  // Metadata
  metadata: jsonb("metadata").default({}),
  
  // Document source and tracking
  source: hrDocumentSourceEnum("source").notNull().default("employee"),
  viewedAt: timestamp("viewed_at"),
  
  // Audit
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  lastAccessedAt: timestamp("last_accessed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("hr_documents_tenant_user_idx").on(table.tenantId, table.userId),
  index("hr_documents_tenant_type_idx").on(table.tenantId, table.documentType),
  index("hr_documents_tenant_source_idx").on(table.tenantId, table.source),
  index("hr_documents_year_month_idx").on(table.year, table.month),
  index("hr_documents_expiry_idx").on(table.expiryDate),
]);

export const insertHrDocumentSchema = createInsertSchema(hrDocuments).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  uploadedAt: true
});
export type InsertHrDocument = z.infer<typeof insertHrDocumentSchema>;
export type HrDocument = typeof hrDocuments.$inferSelect;

// ==================== EXPENSE REPORTS ====================
export const expenseReports = w3suiteSchema.table("expense_reports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // Report identification
  reportNumber: varchar("report_number", { length: 50 }).notNull(),
  period: varchar("period", { length: 7 }), // YYYY-MM format
  
  // Financial summary
  totalAmount: integer("total_amount").notNull().default(0), // Stored in cents
  currency: varchar("currency", { length: 3 }).default("EUR"),
  
  // Status workflow
  status: expenseReportStatusEnum("status").notNull().default("draft"),
  
  // Approval and payment
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id),
  reimbursedAt: timestamp("reimbursed_at"),
  rejectionReason: text("rejection_reason"),
  paymentMethod: expensePaymentMethodEnum("payment_method"),
  
  // Additional information
  notes: text("notes"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("expense_reports_tenant_user_idx").on(table.tenantId, table.userId),
  index("expense_reports_tenant_status_idx").on(table.tenantId, table.status),
  index("expense_reports_period_idx").on(table.period),
  uniqueIndex("expense_reports_tenant_number_unique").on(table.tenantId, table.reportNumber),
]);

export const insertExpenseReportSchema = createInsertSchema(expenseReports).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertExpenseReport = z.infer<typeof insertExpenseReportSchema>;
export type ExpenseReport = typeof expenseReports.$inferSelect;

// ==================== EXPENSE ITEMS ====================
export const expenseItems = w3suiteSchema.table("expense_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  expenseReportId: uuid("expense_report_id").notNull().references(() => expenseReports.id, { onDelete: "cascade" }),
  
  // Item details
  date: date("date").notNull(),
  category: expenseCategoryEnum("category").notNull(),
  description: text("description").notNull(),
  
  // Financial data
  amount: integer("amount").notNull(), // Stored in cents
  vat: integer("vat").default(0), // VAT percentage * 100 (e.g., 2200 = 22%)
  vatAmount: integer("vat_amount").default(0), // VAT amount in cents
  
  // Receipt and documentation
  receipt: boolean("receipt").default(false),
  receiptPath: varchar("receipt_path", { length: 500 }),
  
  // Project allocation
  projectCode: varchar("project_code", { length: 50 }),
  clientCode: varchar("client_code", { length: 50 }),
  
  // Reimbursement
  isReimbursable: boolean("is_reimbursable").default(true),
  
  // Additional information
  notes: text("notes"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("expense_items_report_idx").on(table.expenseReportId),
  index("expense_items_date_idx").on(table.date),
  index("expense_items_category_idx").on(table.category),
]);

export const insertExpenseItemSchema = createInsertSchema(expenseItems).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertExpenseItem = z.infer<typeof insertExpenseItemSchema>;
export type ExpenseItem = typeof expenseItems.$inferSelect;






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
  // HR relations
  calendarEvents: many(calendarEvents),
  timeTracking: many(timeTracking),
  shifts: many(shifts),
  shiftTemplates: many(shiftTemplates),
  hrDocuments: many(hrDocuments),
  expenseReports: many(expenseReports),
  // Universal Request System relations
  universalRequests: many(universalRequests),
  // Notification System relations
  notificationTemplates: many(notificationTemplates),
  notificationPreferences: many(notificationPreferences),
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
  // HR relations
  ownedCalendarEvents: many(calendarEvents),
  timeTrackingEntries: many(timeTracking),
  hrDocuments: many(hrDocuments),
  expenseReports: many(expenseReports),
  createdShifts: many(shifts),
  approvedTimeTracking: many(timeTracking),
  shiftAssignments: many(shiftAssignments),
  assignedShifts: many(shiftAssignments),
  reviewedAttendance: many(shiftAttendance),
  // Universal Request System relations
  universalRequests: many(universalRequests),
  // Notification System relations
  notificationPreferences: many(notificationPreferences),
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
  // HR relations
  calendarEvents: many(calendarEvents),
  timeTracking: many(timeTracking),
  shifts: many(shifts),
  storesTimetrackingMethods: many(storesTimetrackingMethods),
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

// ==================== SUPPLIERS RELATIONS ====================
export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  // Relations verso w3suite schema
  tenant: one(tenants, { fields: [suppliers.tenantId], references: [tenants.id] }),
  createdByUser: one(users, { fields: [suppliers.createdBy], references: [users.id] }),
  updatedByUser: one(users, { fields: [suppliers.updatedBy], references: [users.id] }),
  
  // Relations verso public schema (reference tables)
  city: one(italianCities, { fields: [suppliers.cityId], references: [italianCities.id] }),
  country: one(countries, { fields: [suppliers.countryId], references: [countries.id] }),
  preferredPaymentMethod: one(paymentMethods, { fields: [suppliers.preferredPaymentMethodId], references: [paymentMethods.id] }),
  paymentCondition: one(paymentMethodsConditions, { fields: [suppliers.paymentConditionId], references: [paymentMethodsConditions.id] }),
  
  // Relations verso overrides
  overrides: many(supplierOverrides),
}));

// Supplier Overrides Relations (now full table for tenant-specific suppliers)
export const supplierOverridesRelations = relations(supplierOverrides, ({ one }) => ({
  // Relations verso w3suite schema
  tenant: one(tenants, { fields: [supplierOverrides.tenantId], references: [tenants.id] }),
  createdByUser: one(users, { fields: [supplierOverrides.createdBy], references: [users.id] }),
  updatedByUser: one(users, { fields: [supplierOverrides.updatedBy], references: [users.id] }),
  
  // Relations verso public schema (reference tables)
  city: one(italianCities, { fields: [supplierOverrides.cityId], references: [italianCities.id] }),
  country: one(countries, { fields: [supplierOverrides.countryId], references: [countries.id] }),
  preferredPaymentMethod: one(paymentMethods, { fields: [supplierOverrides.preferredPaymentMethodId], references: [paymentMethods.id] }),
  paymentCondition: one(paymentMethodsConditions, { fields: [supplierOverrides.paymentConditionId], references: [paymentMethodsConditions.id] }),
}));

// ==================== HR SYSTEM RELATIONS ====================

// Calendar Events Relations
export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  tenant: one(tenants, { fields: [calendarEvents.tenantId], references: [tenants.id] }),
  owner: one(users, { fields: [calendarEvents.ownerId], references: [users.id] }),
  store: one(stores, { fields: [calendarEvents.storeId], references: [stores.id] }),
  createdByUser: one(users, { fields: [calendarEvents.createdBy], references: [users.id] }),
  updatedByUser: one(users, { fields: [calendarEvents.updatedBy], references: [users.id] }),
}));

// Time Tracking Relations
export const timeTrackingRelations = relations(timeTracking, ({ one, many }) => ({
  tenant: one(tenants, { fields: [timeTracking.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [timeTracking.userId], references: [users.id] }),
  store: one(stores, { fields: [timeTracking.storeId], references: [stores.id] }),
  shift: one(shifts, { fields: [timeTracking.shiftId], references: [shifts.id] }),
  approvedByUser: one(users, { fields: [timeTracking.approvedBy], references: [users.id] }),
  attendanceEntries: many(shiftAttendance),
}));

// Stores Timetracking Methods Relations
export const storesTimetrackingMethodsRelations = relations(storesTimetrackingMethods, ({ one }) => ({
  tenant: one(tenants, { fields: [storesTimetrackingMethods.tenantId], references: [tenants.id] }),
  store: one(stores, { fields: [storesTimetrackingMethods.storeId], references: [stores.id] }),
  createdByUser: one(users, { fields: [storesTimetrackingMethods.createdBy], references: [users.id] }),
}));


// Shifts Relations
export const shiftsRelations = relations(shifts, ({ one, many }) => ({
  tenant: one(tenants, { fields: [shifts.tenantId], references: [tenants.id] }),
  store: one(stores, { fields: [shifts.storeId], references: [stores.id] }),
  template: one(shiftTemplates, { fields: [shifts.templateId], references: [shiftTemplates.id] }),
  createdByUser: one(users, { fields: [shifts.createdBy], references: [users.id] }),
  timeTrackingEntries: many(timeTracking),
  assignments: many(shiftAssignments),
}));

// Shift Templates Relations
export const shiftTemplatesRelations = relations(shiftTemplates, ({ one, many }) => ({
  tenant: one(tenants, { fields: [shiftTemplates.tenantId], references: [tenants.id] }),
  shifts: many(shifts),
  timeSlots: many(shiftTimeSlots),
}));

// Shift Time Slots Relations
export const shiftTimeSlotsRelations = relations(shiftTimeSlots, ({ one, many }) => ({
  tenant: one(tenants, { fields: [shiftTimeSlots.tenantId], references: [tenants.id] }),
  template: one(shiftTemplates, { fields: [shiftTimeSlots.templateId], references: [shiftTemplates.id] }),
  assignments: many(shiftAssignments),
}));

// Shift Assignments Relations
export const shiftAssignmentsRelations = relations(shiftAssignments, ({ one, many }) => ({
  tenant: one(tenants, { fields: [shiftAssignments.tenantId], references: [tenants.id] }),
  shift: one(shifts, { fields: [shiftAssignments.shiftId], references: [shifts.id] }),
  user: one(users, { fields: [shiftAssignments.userId], references: [users.id] }),
  timeSlot: one(shiftTimeSlots, { fields: [shiftAssignments.timeSlotId], references: [shiftTimeSlots.id] }),
  assignedByUser: one(users, { fields: [shiftAssignments.assignedBy], references: [users.id] }),
  attendance: many(shiftAttendance),
}));

// Shift Attendance Relations
export const shiftAttendanceRelations = relations(shiftAttendance, ({ one }) => ({
  tenant: one(tenants, { fields: [shiftAttendance.tenantId], references: [tenants.id] }),
  assignment: one(shiftAssignments, { fields: [shiftAttendance.assignmentId], references: [shiftAssignments.id] }),
  timeTracking: one(timeTracking, { fields: [shiftAttendance.timeTrackingId], references: [timeTracking.id] }),
  reviewedByUser: one(users, { fields: [shiftAttendance.reviewedBy], references: [users.id] }),
}));

// HR Documents Relations
export const hrDocumentsRelations = relations(hrDocuments, ({ one }) => ({
  tenant: one(tenants, { fields: [hrDocuments.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [hrDocuments.userId], references: [users.id] }),
  uploadedByUser: one(users, { fields: [hrDocuments.uploadedBy], references: [users.id] }),
}));

// Expense Reports Relations
export const expenseReportsRelations = relations(expenseReports, ({ one, many }) => ({
  tenant: one(tenants, { fields: [expenseReports.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [expenseReports.userId], references: [users.id] }),
  approvedByUser: one(users, { fields: [expenseReports.approvedBy], references: [users.id] }),
  expenseItems: many(expenseItems),
}));

// Expense Items Relations
export const expenseItemsRelations = relations(expenseItems, ({ one }) => ({
  expenseReport: one(expenseReports, { fields: [expenseItems.expenseReportId], references: [expenseReports.id] }),
}));

// Employee Balances Relations

// ==================== HR REQUEST SYSTEM RELATIONS ====================


// ==================== UNIVERSAL HIERARCHY SYSTEM ====================

// Organizational Structure - Gerarchia universale per tutti i servizi
export const organizationalStructure = w3suiteSchema.table("organizational_structure", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // User hierarchy
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  parentId: varchar("parent_id").references(() => users.id), // Manager diretto
  
  // Tree structure optimization
  pathTree: text("path_tree").array().default([]), // ['ceo_id', 'area_mgr_id', 'store_mgr_id', 'user_id']
  depth: integer("depth").notNull().default(0), // Livello nell'albero (0 = CEO)
  
  // Organizational unit
  organizationalUnit: varchar("organizational_unit", { length: 100 }), // 'store_milano', 'it_dept', 'finance_team'
  unitType: varchar("unit_type", { length: 50 }), // 'store', 'department', 'team', 'division'
  
  // Deleghe temporanee
  delegates: jsonb("delegates").default([]), // [{userId, fromDate, toDate, permissions}]
  
  // Temporal validity
  validFrom: timestamp("valid_from").notNull().defaultNow(),
  validTo: timestamp("valid_to"),
  
  // RBAC permissions scope
  permissions: jsonb("permissions").default({}), // Service-specific permissions
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
}, (table) => [
  index("org_structure_tenant_user_idx").on(table.tenantId, table.userId),
  index("org_structure_parent_idx").on(table.parentId),
  index("org_structure_unit_idx").on(table.organizationalUnit),
  index("org_structure_path_gin_idx").using("gin", table.pathTree),
  uniqueIndex("org_structure_user_valid_unique").on(table.userId, table.validFrom),
]);

export const insertOrganizationalStructureSchema = createInsertSchema(organizationalStructure).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertOrganizationalStructure = z.infer<typeof insertOrganizationalStructureSchema>;
export type OrganizationalStructure = typeof organizationalStructure.$inferSelect;

// Approval Workflows - Definizione workflow di approvazione per ogni servizio
export const approvalWorkflows = w3suiteSchema.table("approval_workflows", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Service identification
  serviceName: varchar("service_name", { length: 50 }).notNull(), // 'hr', 'finance', 'operations', 'it', 'sales'
  workflowType: varchar("workflow_type", { length: 100 }).notNull(), // 'leave_request', 'purchase_order', 'discount_approval'
  
  // Workflow rules (JSONB for flexibility)
  rules: jsonb("rules").notNull(), /* {
    levels: [
      { condition: "amount <= 1000", approvers: ["direct_manager"], slaHours: 24 },
      { condition: "amount > 1000", approvers: ["direct_manager", "department_head"], slaHours: 48 }
    ],
    escalation: { afterHours: 24, escalateTo: "next_level" },
    autoApprove: { condition: "amount < 100" }
  } */
  
  // Configuration
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(100), // Higher priority workflows are evaluated first
  
  // Metadata
  description: text("description"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
}, (table) => [
  index("approval_workflows_service_idx").on(table.serviceName, table.workflowType),
  index("approval_workflows_tenant_active_idx").on(table.tenantId, table.isActive),
  uniqueIndex("approval_workflows_unique").on(table.tenantId, table.serviceName, table.workflowType),
]);

export const insertApprovalWorkflowSchema = createInsertSchema(approvalWorkflows).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertApprovalWorkflow = z.infer<typeof insertApprovalWorkflowSchema>;
export type ApprovalWorkflow = typeof approvalWorkflows.$inferSelect;



// ==================== UNIFIED REQUESTS SYSTEM ====================
// ✅ ENTERPRISE CENTRALIZZAZIONE: Tabella unica per tutte le richieste aziendali

// Department Enum - Categorizzazione per dipartimenti aziendali
export const departmentEnum = pgEnum('department', [
  'hr',           // Human Resources (ferie, permessi, congedi)
  'operations',   // Operazioni (manutenzione, logistics, inventory)
  'support',      // Support IT (accessi, hardware, software)
  'crm',          // Customer Relations (complaints, escalations)
  'sales',        // Vendite (discount approvals, contract changes)
  'finance'       // Finanza (expenses, budgets, payments)
]);

// Universal Request Status - Stati unificati per tutte le categorie
export const requestStatusEnum = pgEnum('request_status', [
  'draft',        // Bozza - non ancora inviata
  'pending',      // In attesa di approvazione
  'approved',     // Approvata
  'rejected',     // Rifiutata
  'cancelled'     // Annullata dal richiedente
]);

// Universal Requests - Tabella centralizzata per TUTTE le richieste aziendali
export const universalRequests = w3suiteSchema.table("universal_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // ✅ SICUREZZA MULTI-LIVELLO: Tenant + User + Store + Legal Entity
  requesterId: varchar("requester_id").notNull().references(() => users.id),
  legalEntityId: uuid("legal_entity_id").references(() => legalEntities.id),
  storeId: uuid("store_id").references(() => stores.id),
  onBehalfOf: varchar("on_behalf_of").references(() => users.id), // Richieste delegate
  
  // ✅ CATEGORIZZAZIONE ENTERPRISE: Department + Category + Type
  department: departmentEnum("department").notNull(), // hr, finance, support, crm, sales, operations
  category: varchar("category", { length: 100 }).notNull(), // leave, expense, access, legal, training, etc.
  type: varchar("type", { length: 100 }), // vacation, travel_expense, vpn_access, etc.
  
  // ✅ CONTENUTO RICHIESTA
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  requestData: jsonb("request_data").notNull(), // Dati specifici per categoria
  
  // ✅ WORKFLOW E APPROVAZIONE
  status: requestStatusEnum("status").notNull().default("draft"),
  currentApproverId: varchar("current_approver_id").references(() => users.id),
  approvalChain: jsonb("approval_chain").default([]), // Storia delle approvazioni
  workflowInstanceId: uuid("workflow_instance_id"), // Link al workflow engine
  
  // ✅ SLA E PRIORITÀ
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  dueDate: timestamp("due_date"),
  startDate: timestamp("start_date"), // Per richieste con date (ferie, congedi)
  endDate: timestamp("end_date"),
  submittedAt: timestamp("submitted_at"),
  completedAt: timestamp("completed_at"),
  
  // ✅ ALLEGATI E METADATI
  attachments: text("attachments").array().default([]),
  tags: text("tags").array().default([]),
  metadata: jsonb("metadata").default({}), // Metadati aggiuntivi
  notes: text("notes"),
  
  // ✅ AUDIT COMPLETO
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
}, (table) => [
  // ✅ INDICI OTTIMIZZATI per performance enterprise
  index("universal_requests_tenant_department_idx").on(table.tenantId, table.department),
  index("universal_requests_tenant_status_idx").on(table.tenantId, table.status),
  index("universal_requests_requester_idx").on(table.requesterId),
  index("universal_requests_approver_idx").on(table.currentApproverId),
  index("universal_requests_store_idx").on(table.storeId),
  index("universal_requests_legal_entity_idx").on(table.legalEntityId),
  index("universal_requests_dates_idx").on(table.startDate, table.endDate),
  index("universal_requests_tenant_created_idx").on(table.tenantId, table.createdAt.desc()),
  index("universal_requests_workflow_idx").on(table.workflowInstanceId),
  index("universal_requests_department_category_type_idx").on(table.department, table.category, table.type),
]);

export const insertUniversalRequestSchema = createInsertSchema(universalRequests).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertUniversalRequest = z.infer<typeof insertUniversalRequestSchema>;
export type UniversalRequest = typeof universalRequests.$inferSelect;

// ✅ RELAZIONI ENTERPRISE per Universal Requests
export const universalRequestsRelations = relations(universalRequests, ({ one }) => ({
  tenant: one(tenants, { fields: [universalRequests.tenantId], references: [tenants.id] }),
  requester: one(users, { fields: [universalRequests.requesterId], references: [users.id] }),
  currentApprover: one(users, { fields: [universalRequests.currentApproverId], references: [users.id] }),
  onBehalfOfUser: one(users, { fields: [universalRequests.onBehalfOf], references: [users.id] }),
  legalEntity: one(legalEntities, { fields: [universalRequests.legalEntityId], references: [legalEntities.id] }),
  store: one(stores, { fields: [universalRequests.storeId], references: [stores.id] }),
  createdByUser: one(users, { fields: [universalRequests.createdBy], references: [users.id] }),
  updatedByUser: one(users, { fields: [universalRequests.updatedBy], references: [users.id] }),
}));

// Service Permissions - Definizione permessi per ogni servizio
export const servicePermissions = w3suiteSchema.table("service_permissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Service and permission
  serviceName: varchar("service_name", { length: 50 }).notNull(),
  resource: varchar("resource", { length: 100 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  
  // Permission scope
  roleId: uuid("role_id").references(() => roles.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  
  // Conditions
  conditions: jsonb("conditions").default({}), // { maxAmount: 1000, maxDays: 10, etc }
  
  // Validity
  isActive: boolean("is_active").default(true),
  validFrom: timestamp("valid_from").defaultNow(),
  validTo: timestamp("valid_to"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => [
  index("service_permissions_service_idx").on(table.serviceName),
  index("service_permissions_role_idx").on(table.roleId),
  index("service_permissions_user_idx").on(table.userId),
  uniqueIndex("service_permissions_unique").on(
    table.tenantId, 
    table.serviceName, 
    table.resource, 
    table.action, 
    table.roleId,
    table.userId
  ),
]);

export const insertServicePermissionSchema = createInsertSchema(servicePermissions).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertServicePermission = z.infer<typeof insertServicePermissionSchema>;
export type ServicePermission = typeof servicePermissions.$inferSelect;

// ==================== WORKFLOW SYSTEM TABLES ====================

// Workflow Actions - Libreria azioni per categoria (HR, Finance, Operations, etc.)
export const workflowActions = w3suiteSchema.table("workflow_actions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Category and Action identification
  category: varchar("category", { length: 50 }).notNull(), // 'hr', 'finance', 'operations', 'crm', 'support', 'sales'
  actionId: varchar("action_id", { length: 100 }).notNull(), // 'approve_vacation', 'reject_vacation', 'approve_expense'
  name: varchar("name", { length: 200 }).notNull(), // 'Approva Ferie', 'Rifiuta Ferie'
  description: text("description"),
  
  // RBAC Integration
  requiredPermission: varchar("required_permission", { length: 200 }).notNull(), // 'hr.approve_vacation_max_5_days'
  constraints: jsonb("constraints").default({}), // { maxAmount: 1000, maxDays: 5, excludedPeriods: [] }
  
  // Action Configuration
  actionType: varchar("action_type", { length: 50 }).notNull().default("approval"), // 'approval', 'rejection', 'delegation', 'notification'
  priority: integer("priority").default(100),
  isActive: boolean("is_active").default(true),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
}, (table) => [
  index("workflow_actions_category_idx").on(table.category),
  index("workflow_actions_permission_idx").on(table.requiredPermission),
  uniqueIndex("workflow_actions_unique").on(table.tenantId, table.category, table.actionId),
]);

// Workflow Triggers - Libreria trigger per automazione
export const workflowTriggers = w3suiteSchema.table("workflow_triggers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Trigger identification
  category: varchar("category", { length: 50 }).notNull(), // 'hr', 'finance', etc.
  triggerId: varchar("trigger_id", { length: 100 }).notNull(), // 'notify_team', 'update_calendar', 'start_timer'
  name: varchar("name", { length: 200 }).notNull(), // 'Notifica Team', 'Aggiorna Calendario'
  description: text("description"),
  
  // Trigger Configuration
  triggerType: varchar("trigger_type", { length: 50 }).notNull(), // 'notification', 'timer', 'webhook', 'conditional', 'integration'
  config: jsonb("config").notNull(), // Configurazione specifica per tipo trigger
  
  // Execution settings
  isAsync: boolean("is_async").default(false), // Esecuzione asincrona
  retryPolicy: jsonb("retry_policy").default({}), // { maxRetries: 3, backoff: 'exponential' }
  timeout: integer("timeout").default(30000), // Timeout in milliseconds
  
  // Status
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(100),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
}, (table) => [
  index("workflow_triggers_category_idx").on(table.category),
  index("workflow_triggers_type_idx").on(table.triggerType),
  uniqueIndex("workflow_triggers_unique").on(table.tenantId, table.category, table.triggerId),
]);

// Workflow Templates - Definizione visual workflow (reusable templates)
export const workflowTemplates = w3suiteSchema.table("workflow_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Template identification
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(), // 'hr', 'finance', etc.
  templateType: varchar("template_type", { length: 100 }).notNull(), // 'vacation_approval', 'expense_approval'
  
  // Visual Workflow Definition (React Flow format)
  nodes: jsonb("nodes").notNull(), // Array of workflow nodes with positions
  edges: jsonb("edges").notNull(), // Array of connections between nodes
  viewport: jsonb("viewport").default({ x: 0, y: 0, zoom: 1 }), // Canvas viewport
  
  // Template settings
  isPublic: boolean("is_public").default(false), // Can be shared across tenants
  version: integer("version").default(1),
  isActive: boolean("is_active").default(true),
  tags: text("tags").array().default([]),
  
  // Usage tracking
  usageCount: integer("usage_count").default(0),
  lastUsed: timestamp("last_used"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
}, (table) => [
  index("workflow_templates_category_idx").on(table.category),
  index("workflow_templates_type_idx").on(table.templateType),
  index("workflow_templates_tenant_active_idx").on(table.tenantId, table.isActive),
  uniqueIndex("workflow_templates_name_unique").on(table.tenantId, table.name),
]);

// Workflow Steps - Singoli step all'interno di un workflow template
export const workflowSteps = w3suiteSchema.table("workflow_steps", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  templateId: uuid("template_id").notNull().references(() => workflowTemplates.id, { onDelete: 'cascade' }),
  
  // Step identification
  nodeId: varchar("node_id", { length: 100 }).notNull(), // ID del nodo nel visual editor
  stepType: varchar("step_type", { length: 50 }).notNull(), // 'action', 'condition', 'timer', 'trigger'
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  
  // Step configuration
  actionId: uuid("action_id").references(() => workflowActions.id), // Per step di tipo 'action'
  triggerId: uuid("trigger_id").references(() => workflowTriggers.id), // Per step di tipo 'trigger'
  conditions: jsonb("conditions").default({}), // Condizioni per esecuzione
  config: jsonb("config").default({}), // Configurazione specifica step
  
  // Approval logic
  approverLogic: varchar("approver_logic", { length: 100 }), // 'team_supervisor', 'role:HR', 'department:Finance'
  escalationTimeout: integer("escalation_timeout"), // Timeout escalation in hours
  escalationTarget: varchar("escalation_target", { length: 100 }), // Target escalation
  
  // Step order and flow
  order: integer("order").notNull(), // Ordine esecuzione
  isOptional: boolean("is_optional").default(false),
  canSkip: boolean("can_skip").default(false),
  
  // Visual position (React Flow)
  position: jsonb("position").default({ x: 0, y: 0 }),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("workflow_steps_template_idx").on(table.templateId),
  index("workflow_steps_order_idx").on(table.templateId, table.order),
  uniqueIndex("workflow_steps_node_unique").on(table.templateId, table.nodeId),
]);

// Teams - Team ibridi con utenti e ruoli, supervisor RBAC-validated
export const teams = w3suiteSchema.table("teams", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Team identification
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  teamType: varchar("team_type", { length: 50 }).default("functional"), // 'functional', 'project', 'department'
  
  // Hybrid membership (users + roles)
  userMembers: text("user_members").array().default([]), // Array of user IDs
  roleMembers: text("role_members").array().default([]), // Array of role IDs (tutti gli utenti con questi ruoli)
  
  // Supervisor configuration (RBAC validated)
  primarySupervisor: varchar("primary_supervisor").references(() => users.id), // Supervisor principale
  secondarySupervisors: text("secondary_supervisors").array().default([]), // Co-supervisors
  requiredSupervisorPermission: varchar("required_supervisor_permission", { length: 200 }).default("team.manage"),
  
  // Team scope and permissions
  scope: jsonb("scope").default({}), // Scope ereditato o personalizzato
  permissions: jsonb("permissions").default({}), // Permessi team-specific
  
  // 🎯 DEPARTMENT ASSIGNMENT: Team può gestire multipli dipartimenti
  assignedDepartments: text("assigned_departments").array().default([]), // Array of department enum values ['hr', 'finance', 'sales']
  
  // Configuration
  isActive: boolean("is_active").default(true),
  autoAssignWorkflows: boolean("auto_assign_workflows").default(true), // Auto-assign workflow ai membri
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
}, (table) => [
  index("teams_tenant_active_idx").on(table.tenantId, table.isActive),
  index("teams_supervisor_idx").on(table.primarySupervisor),
  uniqueIndex("teams_name_unique").on(table.tenantId, table.name),
]);

// Team Workflow Assignments - Mapping N:M tra team e workflow (con condizioni)
export const teamWorkflowAssignments = w3suiteSchema.table("team_workflow_assignments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: 'cascade' }),
  templateId: uuid("template_id").notNull().references(() => workflowTemplates.id, { onDelete: 'cascade' }),
  
  // 🎯 DEPARTMENT-SPECIFIC ASSIGNMENT: Workflow assignato per specifico dipartimento
  forDepartment: departmentEnum("for_department").notNull(), // Quale dipartimento usa questo workflow
  
  // Assignment configuration
  autoAssign: boolean("auto_assign").default(true), // Auto-assign a richieste membri team
  priority: integer("priority").default(100), // Se multipli workflow per team, quale usare primo
  
  // Conditions for workflow usage
  conditions: jsonb("conditions").default({}), // { requestType: 'vacation', amountRange: [0, 1000], customRules: {} }
  
  // Overrides specifici per questo team
  overrides: jsonb("overrides").default({}), // { skipSteps: [], alternateApprovers: {}, customSLA: 24 }
  
  // Status and validity
  isActive: boolean("is_active").default(true),
  validFrom: timestamp("valid_from").defaultNow(),
  validTo: timestamp("valid_to"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
}, (table) => [
  index("team_workflow_assignments_team_idx").on(table.teamId),
  index("team_workflow_assignments_template_idx").on(table.templateId),
  index("team_workflow_assignments_active_idx").on(table.isActive),
  // 🎯 UNIQUE PER DIPARTIMENTO: Stesso team può avere stesso workflow per dipartimenti diversi
  uniqueIndex("team_workflow_assignments_unique").on(table.teamId, table.templateId, table.forDepartment),
]);

// Workflow Instances - Istanze runtime di workflow in esecuzione
export const workflowInstances = w3suiteSchema.table("workflow_instances", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  templateId: uuid("template_id").notNull().references(() => workflowTemplates.id),
  // ✅ FIXED: Match existing database structure - use reference_id instead of request_id
  referenceId: varchar("reference_id"), // Collegato a richiesta (existing column)
  
  // 🎯 NEW: Propagate category from template for department isolation
  category: varchar("category", { length: 50 }).notNull(), // Inherited from workflowTemplates.category
  
  // ✅ FIXED: Match existing database columns exactly
  instanceType: varchar("instance_type").notNull(), // existing column
  instanceName: varchar("instance_name").notNull(), // existing column
  
  // ✅ FIXED: State machine - match existing structure  
  currentStatus: varchar("current_status", { length: 50 }).default("pending"), // existing column
  currentStepId: uuid("current_step_id"), // existing column
  currentNodeId: varchar("current_node_id"), // existing column
  currentAssignee: varchar("current_assignee"), // existing column
  assignedTeamId: uuid("assigned_team_id"), // existing column
  assignedUsers: text("assigned_users").array().default(sql`'{}'::text[]`), // existing column
  escalationLevel: integer("escalation_level").default(0), // existing column
  
  // ✅ FIXED: Match existing timestamp columns
  startedAt: timestamp("started_at").default(sql`now()`), // existing column  
  completedAt: timestamp("completed_at"), // existing column
  lastActivityAt: timestamp("last_activity_at").default(sql`now()`), // existing column
  
  // ✅ FIXED: Match existing jsonb columns
  context: jsonb("context").default(sql`'{}'::jsonb`), // existing column
  workflowData: jsonb("workflow_data").default(sql`'{}'::jsonb`), // existing column
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`), // existing column
  
  // ✅ FIXED: Match existing metadata columns
  createdBy: varchar("created_by"), // existing column
  updatedBy: varchar("updated_by"), // existing column
  createdAt: timestamp("created_at").default(sql`now()`), // existing column
  updatedAt: timestamp("updated_at").default(sql`now()`), // existing column
}); // ✅ TEMPORARILY REMOVED ALL INDEXES TO FIX STARTUP ERROR

// Workflow Executions - Log dettagliato esecuzioni step e trigger
export const workflowExecutions = w3suiteSchema.table("workflow_executions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  instanceId: uuid("instance_id").notNull().references(() => workflowInstances.id, { onDelete: 'cascade' }),
  stepId: uuid("step_id").references(() => workflowSteps.id),
  
  // Execution details
  executionType: varchar("execution_type", { length: 50 }).notNull(), // 'action', 'trigger', 'condition', 'timer'
  executorId: varchar("executor_id").references(() => users.id), // Chi ha eseguito (per azioni manuali)
  automatedBy: varchar("automated_by", { length: 100 }), // Sistema che ha eseguito automaticamente
  
  // Execution data
  inputData: jsonb("input_data").default({}),
  outputData: jsonb("output_data").default({}),
  
  // Results and status
  status: varchar("status", { length: 50 }).notNull(), // 'success', 'failed', 'pending', 'skipped', 'timeout'
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  
  // Timing
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // Durata in millisecondi
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("workflow_executions_instance_idx").on(table.instanceId),
  index("workflow_executions_step_idx").on(table.stepId),
  index("workflow_executions_executor_idx").on(table.executorId),
  index("workflow_executions_status_idx").on(table.status),
  index("workflow_executions_started_idx").on(table.startedAt),
]);

// Insert Schemas and Types for new workflow tables
export const insertWorkflowActionSchema = createInsertSchema(workflowActions).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertWorkflowAction = z.infer<typeof insertWorkflowActionSchema>;
export type WorkflowAction = typeof workflowActions.$inferSelect;

export const insertWorkflowTriggerSchema = createInsertSchema(workflowTriggers).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertWorkflowTrigger = z.infer<typeof insertWorkflowTriggerSchema>;
export type WorkflowTrigger = typeof workflowTriggers.$inferSelect;

export const insertWorkflowTemplateSchema = createInsertSchema(workflowTemplates).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertWorkflowTemplate = z.infer<typeof insertWorkflowTemplateSchema>;
export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;

export const insertWorkflowStepSchema = createInsertSchema(workflowSteps).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertWorkflowStep = z.infer<typeof insertWorkflowStepSchema>;
export type WorkflowStep = typeof workflowSteps.$inferSelect;

export const insertTeamSchema = createInsertSchema(teams).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

export const insertTeamWorkflowAssignmentSchema = createInsertSchema(teamWorkflowAssignments).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertTeamWorkflowAssignment = z.infer<typeof insertTeamWorkflowAssignmentSchema>;
export type TeamWorkflowAssignment = typeof teamWorkflowAssignments.$inferSelect;

export const insertWorkflowInstanceSchema = createInsertSchema(workflowInstances).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertWorkflowInstance = z.infer<typeof insertWorkflowInstanceSchema>;
export type WorkflowInstance = typeof workflowInstances.$inferSelect;

export const insertWorkflowExecutionSchema = createInsertSchema(workflowExecutions).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertWorkflowExecution = z.infer<typeof insertWorkflowExecutionSchema>;
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;

// ==================== NOTIFICATION SYSTEM RELATIONS ====================

// Notifications Relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  tenant: one(tenants, { fields: [notifications.tenantId], references: [tenants.id] }),
  targetUser: one(users, { fields: [notifications.targetUserId], references: [users.id] }),
}));

// Notification Templates Relations
export const notificationTemplatesRelations = relations(notificationTemplates, ({ one }) => ({
  tenant: one(tenants, { fields: [notificationTemplates.tenantId], references: [tenants.id] }),
}));

// Notification Preferences Relations
export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  tenant: one(tenants, { fields: [notificationPreferences.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [notificationPreferences.userId], references: [users.id] }),
}));

// ==================== AI SYSTEM TABLES ====================

// AI Settings - Configuration per tenant with encrypted API key storage
export const aiSettings = w3suiteSchema.table("ai_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  
  // Model Configuration
  openaiModel: aiModelEnum("openai_model").default('gpt-4-turbo').notNull(),
  openaiApiKey: text("openai_api_key"), // Encrypted storage for tenant-specific API key
  apiConnectionStatus: aiConnectionStatusEnum("api_connection_status").default('disconnected').notNull(),
  lastConnectionTest: timestamp("last_connection_test"),
  connectionTestResult: jsonb("connection_test_result"), // Store last test details
  
  // Features Configuration - Granular control via JSONB
  featuresEnabled: jsonb("features_enabled").default({
    chat_assistant: true,
    document_analysis: true,
    natural_queries: true,
    financial_forecasting: false,
    web_search: false,
    code_interpreter: false,
    file_search: true,
    image_generation: false,
    voice_assistant: false,
    realtime_streaming: false,
    background_processing: true
  }).notNull(),
  
  // Response Configuration
  maxTokensPerResponse: integer("max_tokens_per_response").default(1000).notNull(),
  responseCreativity: smallint("response_creativity").default(7), // 0-20 scale (mapped to 0-2.0 temperature)
  responseLengthLimit: integer("response_length_limit").default(4000).notNull(),
  
  // ➕ AI AGENT REGISTRY COMPATIBILITY (FASE 2 - Now active!)
  activeAgents: jsonb("active_agents").default('["tippy-sales"]').notNull(), // Lista agenti attivi per tenant
  agentOverrides: jsonb("agent_overrides").default('{}').notNull(), // Override specifici tenant per agenti
  
  // Usage & Limits
  monthlyTokenLimit: integer("monthly_token_limit").default(100000).notNull(),
  currentMonthUsage: integer("current_month_usage").default(0).notNull(),
  usageResetDate: date("usage_reset_date"),
  
  // Privacy & Data Retention
  privacyMode: aiPrivacyModeEnum("privacy_mode").default('standard').notNull(),
  chatRetentionDays: integer("chat_retention_days").default(30).notNull(),
  dataSharingOpenai: boolean("data_sharing_openai").default(false).notNull(),
  
  // Enterprise Features
  contextSettings: jsonb("context_settings").default({
    hr_context_enabled: true,
    finance_context_enabled: true,
    business_rules_integration: false,
    custom_instructions: ""
  }),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  tenantIndex: index("ai_settings_tenant_idx").on(table.tenantId),
}));

// AI Usage Logs - Tracking & Analytics per tenant
export const aiUsageLogs = w3suiteSchema.table("ai_usage_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'set null' }),
  
  // Request Details
  modelUsed: aiModelEnum("model_used").notNull(),
  featureType: aiFeatureTypeEnum("feature_type").notNull(),
  tokensInput: integer("tokens_input").default(0).notNull(),
  tokensOutput: integer("tokens_output").default(0).notNull(),
  tokensTotal: integer("tokens_total").default(0).notNull(),
  costUsd: integer("cost_usd").default(0).notNull(), // Stored as cents for precision
  
  // Performance & Success
  responseTimeMs: integer("response_time_ms"),
  success: boolean("success").default(true).notNull(),
  errorMessage: text("error_message"),
  
  // Request Context
  requestContext: jsonb("request_context").default({}),
  
  requestTimestamp: timestamp("request_timestamp").defaultNow().notNull(),
}, (table) => ({
  tenantIndex: index("ai_usage_logs_tenant_idx").on(table.tenantId),
  userIndex: index("ai_usage_logs_user_idx").on(table.userId),
  timestampIndex: index("ai_usage_logs_timestamp_idx").on(table.requestTimestamp),
  featureIndex: index("ai_usage_logs_feature_idx").on(table.featureType),
  // Composite index for granular analytics queries
  analyticsIndex: index("ai_usage_logs_analytics_idx").on(table.tenantId, table.featureType, table.requestTimestamp),
  costIndex: index("ai_usage_logs_cost_idx").on(table.tenantId, table.costUsd, table.requestTimestamp),
}));

// AI Conversations - Chat History with encryption and retention
export const aiConversations = w3suiteSchema.table("ai_conversations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Conversation Metadata
  title: varchar("title", { length: 255 }).notNull(),
  conversationData: jsonb("conversation_data").notNull(), // Encrypted chat history
  featureContext: aiFeatureTypeEnum("feature_context").default('chat').notNull(),
  
  // Business Context
  moduleContext: varchar("module_context", { length: 50 }), // 'hr', 'finance', 'general'
  businessEntityId: uuid("business_entity_id"), // Related entity (user, store, etc.)
  
  // Retention Management
  expiresAt: timestamp("expires_at"), // Based on retention policy
  isArchived: boolean("is_archived").default(false).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  tenantIndex: index("ai_conversations_tenant_idx").on(table.tenantId),
  userIndex: index("ai_conversations_user_idx").on(table.userId),
  contextIndex: index("ai_conversations_context_idx").on(table.featureContext),
  expiresIndex: index("ai_conversations_expires_idx").on(table.expiresAt),
}));

// ==================== VECTOR EMBEDDINGS SYSTEM (pgvector) ====================
// Enterprise-grade vector storage with multi-tenant RLS isolation

// Vector Embeddings Enums
export const vectorSourceTypeEnum = pgEnum('vector_source_type', [
  'document', 'knowledge_base', 'chat_history', 'policy', 'training_material', 
  'product_catalog', 'customer_data', 'financial_report', 'hr_document',
  'url_content', 'pdf_document', 'image', 'audio_transcript', 'video_transcript'
]);
export const vectorStatusEnum = pgEnum('vector_status', ['pending', 'processing', 'ready', 'failed', 'archived']);
export const embeddingModelEnum = pgEnum('embedding_model', [
  'text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'
]);

// Cross-tenant RAG Origin - CRITICO per distinguere brand vs tenant knowledge
export const vectorOriginEnum = pgEnum('vector_origin', ['brand', 'tenant']);

// Media Type Enum for multimodal content
export const mediaTypeEnum = pgEnum('media_type', [
  'text', 'pdf', 'image', 'audio', 'video', 'url', 'document'
]);

// Extraction Method Enum for processing
export const extractionMethodEnum = pgEnum('extraction_method', [
  'native', 'ocr', 'transcription', 'vision_api', 'pdf_parse', 'web_scrape'
]);

// Vector Embeddings - Core table for storing document embeddings with pgvector
export const vectorEmbeddings = w3suiteSchema.table("vector_embeddings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  
  // 🎯 CROSS-TENANT RAG: Brand vs Tenant distinction
  origin: vectorOriginEnum("origin").notNull(), // 'brand' = Brand Interface, 'tenant' = Tenant specific
  agentId: varchar("agent_id", { length: 100 }), // Agent ID for filtering (e.g., 'tippy-sales')
  
  // Source Reference
  sourceType: vectorSourceTypeEnum("source_type").notNull(),
  sourceId: uuid("source_id"), // Reference to original document/entity
  sourceUrl: text("source_url"), // Optional URL reference
  
  // Content & Embeddings (pgvector support)
  contentChunk: text("content_chunk").notNull(), // Original text chunk
  embedding: vector("embedding"), // OpenAI embedding dimension (1536 for text-embedding-3-small)
  embeddingModel: embeddingModelEnum("embedding_model").notNull(),
  
  // Multimedia Support
  mediaType: mediaTypeEnum("media_type").default('text').notNull(),
  extractionMethod: extractionMethodEnum("extraction_method"),
  originalFileName: varchar("original_file_name", { length: 255 }),
  mimeType: varchar("mime_type", { length: 100 }),
  
  // Metadata & Search Optimization
  metadata: jsonb("metadata").default({}).notNull(), // Searchable metadata with media-specific info
  tags: text("tags").array(), // Search tags array
  language: varchar("language", { length: 10 }).default('it'), // Language code
  
  // Temporal Metadata (for audio/video)
  startTime: real("start_time"), // Start time in seconds for audio/video chunks
  endTime: real("end_time"), // End time in seconds for audio/video chunks
  duration: real("duration"), // Duration in seconds
  
  // Visual Metadata (for images)
  imageAnalysis: jsonb("image_analysis"), // GPT-4 Vision analysis results
  detectedObjects: text("detected_objects").array(), // Objects/entities detected
  imageResolution: varchar("image_resolution", { length: 50 }), // e.g., "1920x1080"
  
  // Security & Access Control
  accessLevel: varchar("access_level", { length: 50 }).default('private'), // public, private, restricted
  ownerUserId: varchar("owner_user_id").references(() => users.id, { onDelete: 'set null' }), // VARCHAR for OAuth2 compatibility
  departmentRestriction: varchar("department_restriction", { length: 100 }), // HR, Finance, etc.
  
  // Performance & Status
  chunkIndex: integer("chunk_index").default(0), // Position in document
  chunkTotal: integer("chunk_total").default(1), // Total chunks for document
  tokenCount: integer("token_count").notNull(), // Tokens in chunk
  status: vectorStatusEnum("status").default('pending').notNull(),
  
  // Audit & Lifecycle
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastAccessedAt: timestamp("last_accessed_at"),
  expiresAt: timestamp("expires_at"), // For retention policies
  processingTimeMs: integer("processing_time_ms"), // Time to generate embedding
  
  // Training & Validation
  isValidated: boolean("is_validated").default(false), // User validated for training
  validationScore: real("validation_score"), // Quality score from validation
  validatedBy: varchar("validated_by"), // User who validated
  validatedAt: timestamp("validated_at") // When validation occurred
}, (table) => ({
  // Indexes for performance and search
  tenantIndex: index("vector_embeddings_tenant_idx").on(table.tenantId),
  sourceIndex: index("vector_embeddings_source_idx").on(table.sourceType, table.sourceId),
  statusIndex: index("vector_embeddings_status_idx").on(table.status),
  ownerIndex: index("vector_embeddings_owner_idx").on(table.ownerUserId),
  expiresIndex: index("vector_embeddings_expires_idx").on(table.expiresAt),
  
  // 🎯 CROSS-TENANT RAG INDEXES: Performance critici per ricerca combinata brand+tenant
  crossTenantAgentIndex: index("vector_embeddings_cross_tenant_agent_idx").on(table.origin, table.agentId),
  tenantAgentIndex: index("vector_embeddings_tenant_agent_idx").on(table.tenantId, table.agentId),
  agentStatusIndex: index("vector_embeddings_agent_status_idx").on(table.agentId, table.status),
  
  // Note: HNSW index for vector similarity will be created via SQL migration
}));

// Vector Search Queries - Audit and performance tracking
export const vectorSearchQueries = w3suiteSchema.table("vector_search_queries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(), // VARCHAR for OAuth2 compatibility
  
  // Query Details
  queryText: text("query_text").notNull(),
  queryEmbedding: vector("query_embedding"), // Store query embedding for analysis
  queryType: varchar("query_type", { length: 50 }), // semantic, hybrid, filtered
  
  // Search Parameters
  searchFilters: jsonb("search_filters").default({}).notNull(),
  maxResults: integer("max_results").default(10),
  similarityThreshold: real("similarity_threshold"), // Minimum similarity score
  
  // Results Metadata
  resultsReturned: integer("results_returned").default(0),
  topScore: real("top_score"), // Best similarity score
  responseTimeMs: integer("response_time_ms").notNull(),
  
  // Context & Purpose
  searchContext: varchar("search_context", { length: 100 }), // hr_search, document_qa, etc.
  moduleContext: varchar("module_context", { length: 50 }), // hr, finance, general
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tenantUserIndex: index("vector_search_queries_tenant_user_idx").on(table.tenantId, table.userId),
  timestampIndex: index("vector_search_queries_timestamp_idx").on(table.createdAt),
  contextIndex: index("vector_search_queries_context_idx").on(table.searchContext),
}));

// Vector Collections - Logical groupings of embeddings
export const vectorCollections = w3suiteSchema.table("vector_collections", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  
  // Collection Info
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  collectionType: varchar("collection_type", { length: 50 }).notNull(), // knowledge_base, policies, etc.
  
  // Settings & Configuration
  embeddingModel: embeddingModelEnum("embedding_model").notNull(),
  chunkingStrategy: jsonb("chunking_strategy").default({
    method: 'sliding_window',
    chunk_size: 1000,
    overlap: 200
  }).notNull(),
  
  // Access Control
  isPublic: boolean("is_public").default(false).notNull(),
  allowedRoles: text("allowed_roles").array(), // Role-based access
  departmentScope: varchar("department_scope", { length: 100 }),
  
  // Statistics
  totalEmbeddings: integer("total_embeddings").default(0).notNull(),
  totalTokens: integer("total_tokens").default(0).notNull(),
  lastUpdatedAt: timestamp("last_updated_at").defaultNow().notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }), // VARCHAR for OAuth2 compatibility
}, (table) => ({
  tenantNameIndex: uniqueIndex("vector_collections_tenant_name_idx").on(table.tenantId, table.name),
  typeIndex: index("vector_collections_type_idx").on(table.collectionType),
}));

// AI Training Sessions - Track training and validation activities
export const aiTrainingSessions = w3suiteSchema.table("ai_training_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // 🎯 AGENT LINKAGE: Critical for agent-specific RAG content
  agentId: varchar("agent_id", { length: 100 }), // Agent ID for filtering (e.g., 'tippy-sales', 'workflow-assistant')
  
  // Session Info
  sessionType: varchar("session_type", { length: 50 }).notNull(), // validation, url_import, media_upload
  sessionStatus: varchar("session_status", { length: 50 }).default('active').notNull(), // active, completed, failed
  
  // Training Data
  sourceUrl: text("source_url"), // For URL imports
  sourceFile: text("source_file"), // For file uploads
  contentType: varchar("content_type", { length: 100 }), // MIME type
  
  // Processing Details
  totalChunks: integer("total_chunks").default(0),
  processedChunks: integer("processed_chunks").default(0),
  failedChunks: integer("failed_chunks").default(0),
  
  // Validation Data (for response validation sessions)
  originalQuery: text("original_query"),
  originalResponse: text("original_response"),
  correctedResponse: text("corrected_response"),
  validationFeedback: jsonb("validation_feedback"),
  
  // Metrics
  processingTimeMs: integer("processing_time_ms"),
  tokensProcessed: integer("tokens_processed").default(0),
  embeddingsCreated: integer("embeddings_created").default(0),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  tenantUserIndex: index("ai_training_sessions_tenant_user_idx").on(table.tenantId, table.userId),
  statusIndex: index("ai_training_sessions_status_idx").on(table.sessionStatus),
  typeIndex: index("ai_training_sessions_type_idx").on(table.sessionType),
  timestampIndex: index("ai_training_sessions_timestamp_idx").on(table.createdAt),
  
  // 🎯 AGENT-SPECIFIC INDEXES: Performance critical for agent RAG queries  
  agentIndex: index("ai_training_sessions_agent_idx").on(table.agentId),
  tenantAgentIndex: index("ai_training_sessions_tenant_agent_idx").on(table.tenantId, table.agentId),
  agentStatusIndex: index("ai_training_sessions_agent_status_idx").on(table.agentId, table.sessionStatus),
}));

// AI System Relations
export const aiSettingsRelations = relations(aiSettings, ({ one }) => ({
  tenant: one(tenants, { fields: [aiSettings.tenantId], references: [tenants.id] }),
}));

export const aiUsageLogsRelations = relations(aiUsageLogs, ({ one }) => ({
  tenant: one(tenants, { fields: [aiUsageLogs.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [aiUsageLogs.userId], references: [users.id] }),
}));

export const aiConversationsRelations = relations(aiConversations, ({ one }) => ({
  tenant: one(tenants, { fields: [aiConversations.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [aiConversations.userId], references: [users.id] }),
}));

// Vector Embeddings Relations
export const vectorEmbeddingsRelations = relations(vectorEmbeddings, ({ one }) => ({
  tenant: one(tenants, { fields: [vectorEmbeddings.tenantId], references: [tenants.id] }),
  owner: one(users, { fields: [vectorEmbeddings.ownerUserId], references: [users.id] }),
}));

export const vectorSearchQueriesRelations = relations(vectorSearchQueries, ({ one }) => ({
  tenant: one(tenants, { fields: [vectorSearchQueries.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [vectorSearchQueries.userId], references: [users.id] }),
}));

export const vectorCollectionsRelations = relations(vectorCollections, ({ one }) => ({
  tenant: one(tenants, { fields: [vectorCollections.tenantId], references: [tenants.id] }),
  createdBy: one(users, { fields: [vectorCollections.createdBy], references: [users.id] }),
}));

export const aiTrainingSessionsRelations = relations(aiTrainingSessions, ({ one }) => ({
  tenant: one(tenants, { fields: [aiTrainingSessions.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [aiTrainingSessions.userId], references: [users.id] }),
}));

// AI Insert Schemas and Types
export const insertAISettingsSchema = createInsertSchema(aiSettings).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertAISettings = z.infer<typeof insertAISettingsSchema>;
export type AISettings = typeof aiSettings.$inferSelect;

export const insertAIUsageLogSchema = createInsertSchema(aiUsageLogs).omit({ 
  id: true, 
  requestTimestamp: true 
});
export type InsertAIUsageLog = z.infer<typeof insertAIUsageLogSchema>;
export type AIUsageLog = typeof aiUsageLogs.$inferSelect;

export const insertAIConversationSchema = createInsertSchema(aiConversations).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true 
});
export type InsertAIConversation = z.infer<typeof insertAIConversationSchema>;
export type AIConversation = typeof aiConversations.$inferSelect;

// Vector Embeddings Insert Schemas and Types
export const insertVectorEmbeddingSchema = createInsertSchema(vectorEmbeddings).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  lastAccessedAt: true 
});
export type InsertVectorEmbedding = z.infer<typeof insertVectorEmbeddingSchema>;
export type VectorEmbedding = typeof vectorEmbeddings.$inferSelect;

export const insertVectorSearchQuerySchema = createInsertSchema(vectorSearchQueries).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertVectorSearchQuery = z.infer<typeof insertVectorSearchQuerySchema>;
export type VectorSearchQuery = typeof vectorSearchQueries.$inferSelect;

export const insertVectorCollectionSchema = createInsertSchema(vectorCollections).omit({ 
  id: true, 
  createdAt: true,
  lastUpdatedAt: true 
});
export type InsertVectorCollection = z.infer<typeof insertVectorCollectionSchema>;
export type VectorCollection = typeof vectorCollections.$inferSelect;

export const insertAITrainingSessionSchema = createInsertSchema(aiTrainingSessions).omit({ 
  id: true, 
  createdAt: true,
  completedAt: true 
});
export type InsertAITrainingSession = z.infer<typeof insertAITrainingSessionSchema>;
export type AITrainingSession = typeof aiTrainingSessions.$inferSelect;