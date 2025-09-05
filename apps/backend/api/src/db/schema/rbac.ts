// RBAC (Role-Based Access Control) schema
import { pgTable, varchar, text, timestamp, uuid, boolean, primaryKey, uniqueIndex } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { tenants, users, scopeTypeEnum, permModeEnum } from './core';
import { stores } from './organization';

// ==================== ROLES ====================
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isSystem: boolean('is_system').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  tenantNameUnique: uniqueIndex('roles_tenant_name_unique').on(table.tenantId, table.name),
}));

export const insertRoleSchema = createInsertSchema(roles).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

// ==================== ROLE PERMISSIONS ====================
export const rolePerms = pgTable('role_perms', {
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  perm: varchar('perm', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.roleId, table.perm] }),
}));

// ==================== USER ASSIGNMENTS ====================
export const userAssignments = pgTable('user_assignments', {
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  scopeType: scopeTypeEnum('scope_type').notNull(),
  scopeId: uuid('scope_id'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.roleId, table.scopeType, table.scopeId] }),
}));

export const insertUserAssignmentSchema = createInsertSchema(userAssignments).omit({ 
  createdAt: true 
});
export type InsertUserAssignment = z.infer<typeof insertUserAssignmentSchema>;
export type UserAssignment = typeof userAssignments.$inferSelect;

// ==================== USER EXTRA PERMISSIONS ====================
export const userExtraPerms = pgTable('user_extra_perms', {
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  perm: varchar('perm', { length: 255 }).notNull(),
  mode: permModeEnum('mode').notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.perm] }),
}));