// Core multi-tenant schema
import { pgTable, varchar, text, timestamp, boolean, jsonb, uuid, pgEnum, primaryKey, uniqueIndex } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// ==================== ENUMS ====================
export const scopeTypeEnum = pgEnum('scope_type', ['tenant', 'legal_entity', 'store']);
export const permModeEnum = pgEnum('perm_mode', ['grant', 'revoke']);

// ==================== TENANTS ====================
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique(),
  status: varchar('status', { length: 50 }).default('active'),
  settings: jsonb('settings').default({}),
  features: jsonb('features').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  archivedAt: timestamp('archived_at'),
});

export const insertTenantSchema = createInsertSchema(tenants).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

// ==================== USERS ====================
export const users = pgTable('users', {
  id: varchar('id').primaryKey(), // varchar per compatibilità Replit Auth
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  profileImageUrl: varchar('profile_image_url', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isSystemAdmin: boolean('is_system_admin').default(false),
  lastLoginAt: timestamp('last_login_at'),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  status: varchar('status', { length: 50 }).default('active'),
  mfaEnabled: boolean('mfa_enabled').default(false),
});

export const insertUserSchema = createInsertSchema(users).omit({ 
  createdAt: true, 
  updatedAt: true 
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UpsertUser = InsertUser;