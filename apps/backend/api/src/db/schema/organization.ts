// Organizational hierarchy schema
import { pgTable, varchar, text, timestamp, uuid, date, jsonb, smallint, primaryKey, uniqueIndex, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { tenants } from './core';

// ==================== LEGAL ENTITIES ====================
export const legalEntities = pgTable('legal_entities', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: varchar('name', { length: 255 }).notNull(),
  vat: varchar('vat', { length: 50 }),
  codiceFiscale: varchar('codice_fiscale', { length: 50 }),
  formaGiuridica: varchar('forma_giuridica', { length: 100 }),
  capitaleSociale: varchar('capitale_sociale', { length: 50 }),
  dataCostituzione: date('data_costituzione'),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  province: varchar('province', { length: 10 }),
  cap: varchar('cap', { length: 10 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  pec: varchar('pec', { length: 255 }),
  rea: varchar('rea', { length: 50 }),
  registroImprese: varchar('registro_imprese', { length: 100 }),
  billingProfileId: uuid('billing_profile_id'),
  status: varchar('status', { length: 50 }).default('Attiva').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  archivedAt: timestamp('archived_at'),
});

export const insertLegalEntitySchema = createInsertSchema(legalEntities).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertLegalEntity = z.infer<typeof insertLegalEntitySchema>;
export type LegalEntity = typeof legalEntities.$inferSelect;

// ==================== BRANDS ====================
export const brands = pgTable('brands', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ==================== CHANNELS ====================
export const channels = pgTable('channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// ==================== BUSINESS DRIVERS ====================
export const drivers = pgTable('drivers', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// ==================== COMMERCIAL AREAS ====================
export const commercialAreas = pgTable('commercial_areas', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const insertCommercialAreaSchema = createInsertSchema(commercialAreas).omit({ 
  id: true, 
  createdAt: true
});
export type InsertCommercialArea = z.infer<typeof insertCommercialAreaSchema>;
export type CommercialArea = typeof commercialAreas.$inferSelect;

// ==================== STORES ====================
export const stores = pgTable('stores', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  legalEntityId: uuid('legal_entity_id').notNull().references(() => legalEntities.id),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  channelId: uuid('channel_id').notNull().references(() => channels.id),
  commercialAreaId: uuid('commercial_area_id').references(() => commercialAreas.id),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  province: varchar('province', { length: 10 }),
  cap: varchar('cap', { length: 10 }),
  region: varchar('region', { length: 100 }),
  geo: jsonb('geo'),
  status: varchar('status', { length: 50 }).default('Attivo').notNull(),
  openedAt: date('opened_at'),
  closedAt: date('closed_at'),
  billingOverrideId: uuid('billing_override_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  archivedAt: timestamp('archived_at'),
}, (table) => ({
  tenantCodeUnique: uniqueIndex('stores_tenant_code_unique').on(table.tenantId, table.code),
}));

export const insertStoreSchema = createInsertSchema(stores).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Store = typeof stores.$inferSelect;

// ==================== STORE ASSOCIATIONS ====================
export const storeBrands = pgTable('store_brands', {
  storeId: uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  brandId: uuid('brand_id').notNull().references(() => brands.id),
  isPrimary: boolean('is_primary').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.storeId, table.brandId] }),
}));

export const storeDriverPotential = pgTable('store_driver_potential', {
  storeId: uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  driverId: uuid('driver_id').notNull().references(() => drivers.id),
  potentialScore: smallint('potential_score').notNull(),
  clusterLabel: varchar('cluster_label', { length: 50 }),
  kpis: jsonb('kpis'),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.storeId, table.driverId] }),
}));

// ==================== ENTITY LOGS ====================
export const entityLogs = pgTable('entity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
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