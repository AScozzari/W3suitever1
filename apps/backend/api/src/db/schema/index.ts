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

// Export HR-related tables and types from w3suite schema
export {
  // HR tables
  calendarEvents,
  leaveRequests, // ⚠️ DEPRECATED: Use universal_requests instead
  shifts,
  shiftTemplates,
  timeTracking,
  hrDocuments,
  expenseReports,
  expenseItems,
  hrAnnouncements,
  employeeBalances,
  // HR types
  type CalendarEvent,
  type LeaveRequest, // ⚠️ DEPRECATED: Use UniversalRequest instead
  type Shift,
  type ShiftTemplate,
  type TimeTracking,
  type HrDocument,
  type ExpenseReport,
  type ExpenseItem,
  type HrAnnouncement,
  type EmployeeBalance,
  // HR insert schemas
  type InsertCalendarEvent,
  type InsertLeaveRequest, // ⚠️ DEPRECATED: Use InsertUniversalRequest instead
  type InsertShift,
  type InsertShiftTemplate,
  type InsertTimeTracking,
  type InsertHrDocument,
  type InsertExpenseReport,
  type InsertExpenseItem,
  type InsertHrAnnouncement,
  type InsertEmployeeBalance,
  // Other w3suite tables needed for storage
  users as w3suiteUsers,
  tenants as w3suiteTenants,
  legalEntities as w3suiteLegalEntities,
  stores as w3suiteStores,
  userAssignments as w3suiteUserAssignments,
  userStores as w3suiteUserStores
} from './w3suite';

// ==================== ENUMS ====================
export const scopeTypeEnum = pgEnum('scope_type', ['tenant', 'legal_entity', 'store']);
export const permModeEnum = pgEnum('perm_mode', ['grant', 'revoke']);

// ==================== USERS & TENANTS RE-EXPORTED FROM W3SUITE ====================
// Import and re-export from w3suite schema for backward compatibility
import { users as w3suiteUsersTable, tenants as w3suiteTenantsTable } from './w3suite';

export const users = w3suiteUsersTable;
export const tenants = w3suiteTenantsTable;

// Export types for backward compatibility
export type { InsertUser, User } from './w3suite';
export type { InsertTenant, Tenant } from './w3suite';

// ==================== LEGAL ENTITIES RE-EXPORTED FROM W3SUITE ====================
import { legalEntities as w3suiteLegalEntitiesTable } from './w3suite';
export const legalEntities = w3suiteLegalEntitiesTable;
export type { InsertLegalEntity, LegalEntity } from './w3suite';

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

// ==================== COMMERCIAL AREAS ====================
export const commercialAreas = pgTable("commercial_areas", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCommercialAreaSchema = createInsertSchema(commercialAreas).omit({ 
  id: true, 
  createdAt: true
});
export type InsertCommercialArea = z.infer<typeof insertCommercialAreaSchema>;
export type CommercialArea = typeof commercialAreas.$inferSelect;

// ==================== BUSINESS DRIVERS ====================
export const drivers = pgTable("drivers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==================== STORES RE-EXPORTED FROM W3SUITE ====================
import { stores as w3suiteStoresTable } from './w3suite';
export const stores = w3suiteStoresTable;
export type { InsertStore, Store } from './w3suite';

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

// ==================== RBAC SYSTEM RE-EXPORTED FROM W3SUITE ====================
// Import and re-export from w3suite schema for backward compatibility
import { 
  roles as w3suiteRolesTable, 
  rolePerms as w3suiteRolePermsTable, 
  userAssignments as w3suiteUserAssignmentsTable 
} from './w3suite';

export const roles = w3suiteRolesTable;
export const rolePerms = w3suiteRolePermsTable;
export const userAssignments = w3suiteUserAssignmentsTable;

// Export types for backward compatibility
export type { InsertRole, Role } from './w3suite';
export type { InsertUserAssignment, UserAssignment } from './w3suite';

// ==================== REFERENCE TABLES ====================

// Forme giuridiche italiane
export const legalForms = pgTable("legal_forms", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).unique().notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  minCapital: varchar("min_capital", { length: 50 }),
  liability: varchar("liability", { length: 50 }), // "limited", "unlimited", "mixed"
  active: boolean("active").default(true),
  sortOrder: smallint("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLegalFormSchema = createInsertSchema(legalForms).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertLegalForm = z.infer<typeof insertLegalFormSchema>;
export type LegalForm = typeof legalForms.$inferSelect;

// Paesi
export const countries = pgTable("countries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 3 }).unique().notNull(), // ISO 3166-1
  name: varchar("name", { length: 100 }).notNull(),
  active: boolean("active").default(true),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCountrySchema = createInsertSchema(countries).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertCountry = z.infer<typeof insertCountrySchema>;
export type Country = typeof countries.$inferSelect;

// Città italiane
export const italianCities = pgTable("italian_cities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  province: varchar("province", { length: 2 }).notNull(), // Codice provincia (MI, RM, etc)
  provinceName: varchar("province_name", { length: 100 }).notNull(),
  region: varchar("region", { length: 100 }).notNull(),
  postalCode: varchar("postal_code", { length: 5 }).notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_italian_cities_name").on(table.name),
  index("idx_italian_cities_province").on(table.province),
  uniqueIndex("italian_cities_unique").on(table.name, table.province),
]);

// ==================== USER EXTRA PERMS RE-EXPORTED FROM W3SUITE ====================
import { userExtraPerms as w3suiteUserExtraPermsTable } from './w3suite';
export const userExtraPerms = w3suiteUserExtraPermsTable;

// ==================== ENTITY LOGS RE-EXPORTED FROM W3SUITE ====================
import { entityLogs as w3suiteEntityLogsTable } from './w3suite';
export const entityLogs = w3suiteEntityLogsTable;
export type { InsertEntityLog, EntityLog } from './w3suite';

// ==================== BRAND INTERFACE MOVED TO SEPARATE SCHEMA ====================
// Brand Interface tables are now in brand-interface.ts with dedicated 'brand_interface' schema