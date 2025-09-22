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
import { brands, channels, commercialAreas, drivers, countries, italianCities, paymentMethods, paymentMethodsConditions } from './public';

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
export const notificationCategoryEnum = pgEnum('notification_category', ['crm', 'finance', 'hr', 'sales', 'support', 'operations', 'marketing']);

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

// Leave Request Enums
export const leaveTypeEnum = pgEnum('leave_type', ['vacation', 'sick', 'personal', 'maternity', 'paternity', 'bereavement', 'unpaid', 'other']);
export const leaveRequestStatusEnum = pgEnum('leave_request_status', ['draft', 'pending', 'approved', 'rejected', 'cancelled']);

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
export const hrAnnouncementTypeEnum = pgEnum('hr_announcement_type', ['policy', 'event', 'deadline', 'benefit', 'general']);
export const hrAnnouncementPriorityEnum = pgEnum('hr_announcement_priority', ['low', 'medium', 'high', 'urgent']);
export const hrAnnouncementAudienceEnum = pgEnum('hr_announcement_audience', ['all', 'store', 'area', 'role', 'specific']);

// ✅ CRITICAL ENUM FIX: Add missing calendar_event_category enum
export const calendarEventCategoryEnum = pgEnum('calendar_event_category', [
  'sales', 'finance', 'hr', 'crm', 'support', 'operations', 'marketing'
]);

// HR Request System Enums
export const hrRequestCategoryEnum = pgEnum('hr_request_category', [
  'leave', 'schedule', 'other', 'italian_legal', 'family', 'professional_development', 
  'wellness_health', 'remote_work', 'technology_support'
]);
export const hrRequestTypeEnum = pgEnum('hr_request_type', [
  // Original request types (16)
  'vacation', 'sick', 'fmla', 'parental', 'bereavement', 'personal', 'religious', 'military', 
  'jury_duty', 'medical_appt', 'emergency', 'shift_swap', 'time_change', 'flex_hours', 'wfh', 'overtime',
  
  // Italian-Specific Request Types (10)
  'marriage_leave', 'maternity_leave', 'paternity_leave', 'parental_leave', 'breastfeeding_leave',
  'law_104_leave', 'study_leave', 'rol_leave', 'electoral_leave', 'bereavement_extended',
  
  // Modern 2024 Request Types (22)
  'remote_work_request', 'equipment_request', 'training_request', 'certification_request',
  'sabbatical_request', 'sabbatical_unpaid', 'wellness_program', 'mental_health_support',
  'gym_membership', 'financial_counseling', 'pet_insurance', 'ergonomic_assessment',
  'vpn_access', 'internet_stipend', 'mobile_allowance', 'conference_attendance',
  'mentorship_request', 'skill_assessment', 'career_development', 'experience_rewards',
  'volunteer_leave', 'donation_leave'
]);
export const hrRequestStatusEnum = pgEnum('hr_request_status', ['draft', 'pending', 'approved', 'rejected', 'cancelled']);
export const hrRequestApprovalActionEnum = pgEnum('hr_request_approval_action', ['approved', 'rejected', 'requested_changes']);

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
  
  // LEGACY LOCATION FIELDS (for backwards compatibility)
  address: text("address"), // DEPRECATED - use encryptedAddress
  latitude: varchar("latitude", { length: 20 }), // DEPRECATED - use encryptedCoordinates
  longitude: varchar("longitude", { length: 20 }), // DEPRECATED - use encryptedCoordinates
  geo: jsonb("geo"), // DEPRECATED - use encryptedGeoData
  
  // ENCRYPTED LOCATION FIELDS
  encryptedAddress: text("encrypted_address"), // Base64 encrypted physical address
  encryptedCoordinates: text("encrypted_coordinates"), // Base64 encrypted lat/lng
  encryptedGeoData: text("encrypted_geo_data"), // Base64 encrypted detailed geo info
  
  // STORE ENCRYPTION METADATA
  storeEncryptionKeyId: varchar("store_encryption_key_id", { length: 100 }).references(() => encryptionKeys.keyId),
  addressIv: varchar("address_iv", { length: 100 }), // IV for address
  coordinatesIv: varchar("coordinates_iv", { length: 100 }), // IV for coordinates
  geoDataIv: varchar("geo_data_iv", { length: 100 }), // IV for geo data
  addressTag: varchar("address_tag", { length: 100 }), // Auth tag for address
  coordinatesTag: varchar("coordinates_tag", { length: 100 }), // Auth tag for coordinates
  geoDataTag: varchar("geo_data_tag", { length: 100 }), // Auth tag for geo data
  locationEncryptedAt: timestamp("location_encrypted_at"), // When location was encrypted
  
  citta: varchar("citta", { length: 100 }),
  provincia: varchar("provincia", { length: 10 }),
  cap: varchar("cap", { length: 10 }),
  region: varchar("region", { length: 100 }),
  wifiNetworks: jsonb("wifi_networks").default([]), // Store WiFi SSIDs for geofencing
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
  index("stores_encryption_key_idx").on(table.storeEncryptionKeyId),
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
  category: notificationCategoryEnum("category").default("hr"), // Business category
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

// ==================== LEAVE REQUESTS (LEGACY - Being Deprecated) ====================
// ⚠️ DEPRECATION WARNING: This table is being phased out in favor of universal_requests
// New leave requests should use universal_requests with category='hr', request_type='leave'
// Existing data has been migrated, but keeping schema for compatibility during transition
export const leaveRequests = w3suiteSchema.table("leave_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  storeId: uuid("store_id").references(() => stores.id),
  
  // Leave details
  leaveType: leaveTypeEnum("leave_type").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  totalDays: integer("total_days").notNull(),
  
  // Request information
  reason: text("reason"),
  notes: text("notes"),
  
  // Approval workflow
  status: leaveRequestStatusEnum("status").notNull().default("draft"),
  approvalChain: jsonb("approval_chain").default([]), // [{ approverId, status, timestamp, comments }]
  currentApprover: varchar("current_approver").references(() => users.id),
  
  // Coverage
  coveredBy: varchar("covered_by").references(() => users.id),
  
  // Attachments
  attachments: jsonb("attachments").default([]), // [{ fileName, path, uploadedAt }]
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  submittedAt: timestamp("submitted_at"),
  processedAt: timestamp("processed_at"),
}, (table) => [
  index("leave_requests_tenant_user_idx").on(table.tenantId, table.userId),
  index("leave_requests_tenant_status_idx").on(table.tenantId, table.status),
  index("leave_requests_tenant_dates_idx").on(table.tenantId, table.startDate, table.endDate),
  index("leave_requests_current_approver_idx").on(table.currentApprover),
]);

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;

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

// ==================== EMPLOYEE BALANCES ====================
export const employeeBalances = w3suiteSchema.table("employee_balances", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  year: integer("year").notNull(),
  
  // Vacation days
  vacationDaysEntitled: integer("vacation_days_entitled").notNull().default(0),
  vacationDaysUsed: integer("vacation_days_used").notNull().default(0),
  vacationDaysRemaining: integer("vacation_days_remaining").notNull().default(0),
  
  // Other leave types
  sickDaysUsed: integer("sick_days_used").notNull().default(0),
  personalDaysUsed: integer("personal_days_used").notNull().default(0),
  
  // Time balances
  overtimeHours: integer("overtime_hours").notNull().default(0), // Stored as minutes
  compTimeHours: integer("comp_time_hours").notNull().default(0), // Compensatory time in minutes
  
  // Adjustments tracking
  adjustments: jsonb("adjustments").default([]), // [{ date, type, amount, reason, authorizedBy }]
  
  // Calculation metadata
  lastCalculatedAt: timestamp("last_calculated_at"),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("employee_balances_tenant_user_year_idx").on(table.tenantId, table.userId, table.year),
  uniqueIndex("employee_balances_user_year_unique").on(table.userId, table.year),
]);

export const insertEmployeeBalanceSchema = createInsertSchema(employeeBalances).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertEmployeeBalance = z.infer<typeof insertEmployeeBalanceSchema>;
export type EmployeeBalance = typeof employeeBalances.$inferSelect;

// ==================== HR ANNOUNCEMENTS ====================
export const hrAnnouncements = w3suiteSchema.table("hr_announcements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  
  // Content
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  
  // Classification
  type: hrAnnouncementTypeEnum("type").notNull().default("general"),
  priority: hrAnnouncementPriorityEnum("priority").notNull().default("medium"),
  
  // Targeting
  targetAudience: hrAnnouncementAudienceEnum("target_audience").notNull().default("all"),
  targetIds: jsonb("target_ids").default([]), // Store/area/user IDs for specific targeting
  
  // Publishing
  publishDate: timestamp("publish_date").notNull(),
  expiryDate: timestamp("expiry_date"),
  isActive: boolean("is_active").default(true),
  
  // Attachments and engagement
  attachments: jsonb("attachments").default([]), // [{ fileName, path, type }]
  viewCount: integer("view_count").default(0),
  
  // Audit
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("hr_announcements_tenant_active_idx").on(table.tenantId, table.isActive),
  index("hr_announcements_tenant_publish_idx").on(table.tenantId, table.publishDate),
  index("hr_announcements_tenant_priority_idx").on(table.tenantId, table.priority),
  index("hr_announcements_target_audience_idx").on(table.targetAudience),
]);

export const insertHrAnnouncementSchema = createInsertSchema(hrAnnouncements).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertHrAnnouncement = z.infer<typeof insertHrAnnouncementSchema>;
export type HrAnnouncement = typeof hrAnnouncements.$inferSelect;

// ==================== HR REQUESTS SYSTEM ====================
export const hrRequests = w3suiteSchema.table("hr_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  requesterId: varchar("requester_id").notNull().references(() => users.id),
  
  // Request classification
  category: hrRequestCategoryEnum("category").notNull(),
  type: hrRequestTypeEnum("type").notNull(),
  
  // Request content and data
  payload: jsonb("payload").default({}), // Type-specific fields
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  
  // Workflow and approval
  status: hrRequestStatusEnum("status").notNull().default("draft"),
  currentApproverId: varchar("current_approver_id").references(() => users.id),
  
  // Supporting documents
  attachments: text("attachments").array().default([]),
  
  // Request metadata
  title: varchar("title", { length: 255 }),
  description: text("description"),
  priority: varchar("priority", { length: 20 }).default("normal"), // normal, high, urgent
  
  // Audit fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("hr_requests_tenant_status_idx").on(table.tenantId, table.status),
  index("hr_requests_tenant_requester_idx").on(table.tenantId, table.requesterId),
  index("hr_requests_tenant_type_idx").on(table.tenantId, table.type),
  index("hr_requests_tenant_category_idx").on(table.tenantId, table.category),
  index("hr_requests_current_approver_idx").on(table.currentApproverId),
  index("hr_requests_tenant_created_idx").on(table.tenantId, table.createdAt.desc()),
  index("hr_requests_start_date_idx").on(table.startDate),
  index("hr_requests_end_date_idx").on(table.endDate),
]);

export const insertHrRequestSchema = createInsertSchema(hrRequests).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertHrRequest = z.infer<typeof insertHrRequestSchema>;
export type HrRequest = typeof hrRequests.$inferSelect;

// ==================== HR REQUEST APPROVALS ====================
export const hrRequestApprovals = w3suiteSchema.table("hr_request_approvals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  requestId: uuid("request_id").notNull().references(() => hrRequests.id, { onDelete: "cascade" }),
  approverId: varchar("approver_id").notNull().references(() => users.id),
  
  // Approval decision
  action: hrRequestApprovalActionEnum("action").notNull(),
  comment: text("comment"),
  
  // Additional metadata
  level: integer("level").default(1), // Approval level/stage
  isRequired: boolean("is_required").default(true),
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("hr_request_approvals_tenant_idx").on(table.tenantId),
  index("hr_request_approvals_request_idx").on(table.requestId),
  index("hr_request_approvals_approver_idx").on(table.approverId),
  index("hr_request_approvals_tenant_request_created_idx").on(table.tenantId, table.requestId, table.createdAt),
  index("hr_request_approvals_action_idx").on(table.action),
]);

export const insertHrRequestApprovalSchema = createInsertSchema(hrRequestApprovals).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertHrRequestApproval = z.infer<typeof insertHrRequestApprovalSchema>;
export type HrRequestApproval = typeof hrRequestApprovals.$inferSelect;

// ==================== HR REQUEST COMMENTS ====================
export const hrRequestComments = w3suiteSchema.table("hr_request_comments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  requestId: uuid("request_id").notNull().references(() => hrRequests.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id),
  
  // Comment content
  comment: text("comment").notNull(),
  
  // Comment metadata
  isInternal: boolean("is_internal").default(false), // Internal HR comment vs visible to requester
  mentionedUsers: text("mentioned_users").array().default([]), // @mention support
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("hr_request_comments_tenant_idx").on(table.tenantId),
  index("hr_request_comments_request_idx").on(table.requestId),
  index("hr_request_comments_author_idx").on(table.authorId),
  index("hr_request_comments_tenant_request_created_idx").on(table.tenantId, table.requestId, table.createdAt),
  index("hr_request_comments_is_internal_idx").on(table.isInternal),
]);

export const insertHrRequestCommentSchema = createInsertSchema(hrRequestComments).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertHrRequestComment = z.infer<typeof insertHrRequestCommentSchema>;
export type HrRequestComment = typeof hrRequestComments.$inferSelect;

// ==================== HR REQUEST STATUS HISTORY ====================
export const hrRequestStatusHistory = w3suiteSchema.table("hr_request_status_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  requestId: uuid("request_id").notNull().references(() => hrRequests.id, { onDelete: "cascade" }),
  changedBy: varchar("changed_by").notNull().references(() => users.id),
  
  // Status transition
  fromStatus: hrRequestStatusEnum("from_status"),
  toStatus: hrRequestStatusEnum("to_status").notNull(),
  
  // Change context
  reason: text("reason"), // Reason for status change
  
  // Additional metadata
  // metadata: jsonb("metadata").default({}), // Temporarily disabled - not in database
  // automaticChange: boolean("automatic_change").default(false), // Temporarily disabled - not in database
  
  // Audit
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("hr_request_status_history_tenant_idx").on(table.tenantId),
  index("hr_request_status_history_request_idx").on(table.requestId),
  index("hr_request_status_history_changed_by_idx").on(table.changedBy),
  index("hr_request_status_history_tenant_request_created_idx").on(table.tenantId, table.requestId, table.createdAt),
  index("hr_request_status_history_from_status_idx").on(table.fromStatus),
  index("hr_request_status_history_to_status_idx").on(table.toStatus),
  // index("hr_request_status_history_automatic_idx").on(table.automaticChange), // Temporarily disabled
]);

export const insertHrRequestStatusHistorySchema = createInsertSchema(hrRequestStatusHistory).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertHrRequestStatusHistory = z.infer<typeof insertHrRequestStatusHistorySchema>;
export type HrRequestStatusHistory = typeof hrRequestStatusHistory.$inferSelect;

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
  leaveRequests: many(leaveRequests),
  shifts: many(shifts),
  shiftTemplates: many(shiftTemplates),
  hrDocuments: many(hrDocuments),
  expenseReports: many(expenseReports),
  employeeBalances: many(employeeBalances),
  hrAnnouncements: many(hrAnnouncements),
  // HR Request System relations
  hrRequests: many(hrRequests),
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
  leaveRequests: many(leaveRequests),
  hrDocuments: many(hrDocuments),
  expenseReports: many(expenseReports),
  employeeBalances: many(employeeBalances),
  createdShifts: many(shifts),
  approvedTimeTracking: many(timeTracking),
  approvedLeaveRequests: many(leaveRequests),
  createdAnnouncements: many(hrAnnouncements),
  // HR Request System relations
  hrRequests: many(hrRequests),
  hrRequestApprovals: many(hrRequestApprovals),
  hrRequestComments: many(hrRequestComments),
  hrRequestStatusHistory: many(hrRequestStatusHistory),
  assignedHrRequests: many(hrRequests),
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
  leaveRequests: many(leaveRequests),
  shifts: many(shifts),
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
export const timeTrackingRelations = relations(timeTracking, ({ one }) => ({
  tenant: one(tenants, { fields: [timeTracking.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [timeTracking.userId], references: [users.id] }),
  store: one(stores, { fields: [timeTracking.storeId], references: [stores.id] }),
  shift: one(shifts, { fields: [timeTracking.shiftId], references: [shifts.id] }),
  approvedByUser: one(users, { fields: [timeTracking.approvedBy], references: [users.id] }),
}));

// Leave Requests Relations
export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  tenant: one(tenants, { fields: [leaveRequests.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [leaveRequests.userId], references: [users.id] }),
  store: one(stores, { fields: [leaveRequests.storeId], references: [stores.id] }),
  currentApproverUser: one(users, { fields: [leaveRequests.currentApprover], references: [users.id] }),
  coveredByUser: one(users, { fields: [leaveRequests.coveredBy], references: [users.id] }),
}));

// Shifts Relations
export const shiftsRelations = relations(shifts, ({ one, many }) => ({
  tenant: one(tenants, { fields: [shifts.tenantId], references: [tenants.id] }),
  store: one(stores, { fields: [shifts.storeId], references: [stores.id] }),
  template: one(shiftTemplates, { fields: [shifts.templateId], references: [shiftTemplates.id] }),
  createdByUser: one(users, { fields: [shifts.createdBy], references: [users.id] }),
  timeTrackingEntries: many(timeTracking),
}));

// Shift Templates Relations
export const shiftTemplatesRelations = relations(shiftTemplates, ({ one, many }) => ({
  tenant: one(tenants, { fields: [shiftTemplates.tenantId], references: [tenants.id] }),
  shifts: many(shifts),
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
export const employeeBalancesRelations = relations(employeeBalances, ({ one }) => ({
  tenant: one(tenants, { fields: [employeeBalances.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [employeeBalances.userId], references: [users.id] }),
}));

// HR Announcements Relations
export const hrAnnouncementsRelations = relations(hrAnnouncements, ({ one }) => ({
  tenant: one(tenants, { fields: [hrAnnouncements.tenantId], references: [tenants.id] }),
  createdByUser: one(users, { fields: [hrAnnouncements.createdBy], references: [users.id] }),
}));

// ==================== HR REQUEST SYSTEM RELATIONS ====================

// HR Requests Relations
export const hrRequestsRelations = relations(hrRequests, ({ one, many }) => ({
  tenant: one(tenants, { fields: [hrRequests.tenantId], references: [tenants.id] }),
  requester: one(users, { fields: [hrRequests.requesterId], references: [users.id] }),
  currentApprover: one(users, { fields: [hrRequests.currentApproverId], references: [users.id] }),
  approvals: many(hrRequestApprovals),
  comments: many(hrRequestComments),
  statusHistory: many(hrRequestStatusHistory),
}));

// HR Request Approvals Relations
export const hrRequestApprovalsRelations = relations(hrRequestApprovals, ({ one }) => ({
  tenant: one(tenants, { fields: [hrRequestApprovals.tenantId], references: [tenants.id] }),
  request: one(hrRequests, { fields: [hrRequestApprovals.requestId], references: [hrRequests.id] }),
  approver: one(users, { fields: [hrRequestApprovals.approverId], references: [users.id] }),
}));

// HR Request Comments Relations
export const hrRequestCommentsRelations = relations(hrRequestComments, ({ one }) => ({
  tenant: one(tenants, { fields: [hrRequestComments.tenantId], references: [tenants.id] }),
  request: one(hrRequests, { fields: [hrRequestComments.requestId], references: [hrRequests.id] }),
  author: one(users, { fields: [hrRequestComments.authorId], references: [users.id] }),
}));

// HR Request Status History Relations
export const hrRequestStatusHistoryRelations = relations(hrRequestStatusHistory, ({ one }) => ({
  tenant: one(tenants, { fields: [hrRequestStatusHistory.tenantId], references: [tenants.id] }),
  request: one(hrRequests, { fields: [hrRequestStatusHistory.requestId], references: [hrRequests.id] }),
  changedByUser: one(users, { fields: [hrRequestStatusHistory.changedBy], references: [users.id] }),
}));

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

// Request Category Enum - Categorizzazione per moduli aziendali
export const requestCategoryEnum = pgEnum('request_category', [
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
  
  // ✅ CATEGORIZZAZIONE ENTERPRISE: Modulo + Tipo + Sottotipo
  category: requestCategoryEnum("category").notNull(),
  requestType: varchar("request_type", { length: 100 }).notNull(), // 'leave', 'expense', 'access', 'discount'
  requestSubtype: varchar("request_subtype", { length: 100 }), // 'vacation', 'sick', 'maternity', etc.
  
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
  index("universal_requests_tenant_category_idx").on(table.tenantId, table.category),
  index("universal_requests_tenant_status_idx").on(table.tenantId, table.status),
  index("universal_requests_requester_idx").on(table.requesterId),
  index("universal_requests_approver_idx").on(table.currentApproverId),
  index("universal_requests_store_idx").on(table.storeId),
  index("universal_requests_legal_entity_idx").on(table.legalEntityId),
  index("universal_requests_dates_idx").on(table.startDate, table.endDate),
  index("universal_requests_tenant_created_idx").on(table.tenantId, table.createdAt.desc()),
  index("universal_requests_workflow_idx").on(table.workflowInstanceId),
  index("universal_requests_category_type_idx").on(table.category, table.requestType, table.requestSubtype),
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
  uniqueIndex("team_workflow_assignments_unique").on(table.teamId, table.templateId),
]);

// Workflow Instances - Istanze runtime di workflow in esecuzione
export const workflowInstances = w3suiteSchema.table("workflow_instances", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  templateId: uuid("template_id").notNull().references(() => workflowTemplates.id),
  // ✅ FIXED: Match existing database structure - use reference_id instead of request_id
  referenceId: varchar("reference_id"), // Collegato a richiesta (existing column)
  
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