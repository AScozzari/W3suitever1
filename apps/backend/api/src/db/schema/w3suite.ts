// W3 Suite Schema - Dedicated schema for tenant-specific tables
// All tables in this file will be created in 'w3suite' schema

import { sql } from 'drizzle-orm';
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
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==================== W3 SUITE SCHEMA ====================
export const w3suiteSchema = pgSchema("w3suite");

// ==================== ENUMS ====================
export const scopeTypeEnum = pgEnum('scope_type', ['tenant', 'legal_entity', 'store']);
export const permModeEnum = pgEnum('perm_mode', ['grant', 'revoke']);

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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isSystemAdmin: boolean("is_system_admin").default(false),
  lastLoginAt: timestamp("last_login_at"),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  status: varchar("status", { length: 50 }).default("active"),
  mfaEnabled: boolean("mfa_enabled").default(false),
  // Extended enterprise fields
  role: varchar("role", { length: 50 }),
  storeId: uuid("store_id").references(() => stores.id),
  phone: varchar("phone", { length: 20 }),
  position: varchar("position", { length: 100 }),
  department: varchar("department", { length: 100 }),
  hireDate: date("hire_date"),
  contractType: varchar("contract_type", { length: 50 }),
});

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
  codice: varchar("codice", { length: 20 }).notNull().unique(),
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
});

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
  code: varchar("code", { length: 50 }).notNull().unique(),
  nome: varchar("nome", { length: 255 }).notNull(),
  channelId: uuid("channel_id").notNull(), // References public.channels
  commercialAreaId: uuid("commercial_area_id"), // References public.commercial_areas
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
});

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
export const storeBrands = w3suiteSchema.table("store_brands", {
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
  brandId: uuid("brand_id").notNull(), // References public.brands
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.storeId, table.brandId] }),
]);

export const storeDriverPotential = w3suiteSchema.table("store_driver_potential", {
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: 'cascade' }),
  driverId: uuid("driver_id").notNull(), // References public.drivers
  potentialScore: smallint("potential_score").notNull(),
  clusterLabel: varchar("cluster_label", { length: 50 }),
  kpis: jsonb("kpis"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.storeId, table.driverId] }),
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
  userId: uuid('user_id'), // Chi ha fatto il cambio
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