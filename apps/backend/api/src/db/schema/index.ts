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
  shifts,
  shiftTemplates,
  timeTracking,
  hrDocuments,
  expenseReports,
  expenseItems,
  // HR types
  type CalendarEvent,
  type Shift,
  type ShiftTemplate,
  type TimeTracking,
  type HrDocument,
  type ExpenseReport,
  type ExpenseItem,
  // HR insert schemas
  type InsertCalendarEvent,
  type InsertShift,
  type InsertShiftTemplate,
  type InsertTimeTracking,
  type InsertHrDocument,
  type InsertExpenseReport,
  type InsertExpenseItem,
  // Other w3suite tables needed for storage
  users as w3suiteUsers,
  tenants as w3suiteTenants,
  legalEntities as w3suiteLegalEntities,
  stores as w3suiteStores,
  userAssignments as w3suiteUserAssignments,
  userStores as w3suiteUserStores
} from './w3suite';

// ==================== ENUMS RE-EXPORTED FROM W3SUITE ====================
// Import and re-export enums from w3suite schema for backward compatibility
export { scopeTypeEnum, permModeEnum } from './w3suite';

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

// ==================== PUBLIC SCHEMA RE-EXPORTS ====================
// Import and re-export from public schema for backward compatibility
import { 
  brands as publicBrands, 
  channels as publicChannels, 
  commercialAreas as publicCommercialAreas, 
  drivers as publicDrivers
} from './public';

export const brands = publicBrands;
export const channels = publicChannels;
export const commercialAreas = publicCommercialAreas;
export const drivers = publicDrivers;

// Export types for backward compatibility
export type { InsertBrand, Brand } from './public';
export type { InsertChannel, Channel } from './public';
export type { InsertCommercialArea, CommercialArea } from './public';
export type { InsertDriver, Driver } from './public';

// ==================== STORES RE-EXPORTED FROM W3SUITE ====================
import { stores as w3suiteStoresTable } from './w3suite';
export const stores = w3suiteStoresTable;
export type { InsertStore, Store } from './w3suite';

// ==================== STORE ASSOCIATIONS RE-EXPORTED FROM W3SUITE ====================
// Import and re-export from w3suite schema for backward compatibility
import { 
  storeBrands as w3suiteStoreBrands,
  storeDriverPotential as w3suiteStoreDriverPotential
} from './w3suite';

export const storeBrands = w3suiteStoreBrands;
export const storeDriverPotential = w3suiteStoreDriverPotential;

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

// ==================== REFERENCE TABLES RE-EXPORTED FROM PUBLIC ====================
// Import and re-export from public schema for backward compatibility
import { 
  legalForms as publicLegalForms,
  countries as publicCountries,
  italianCities as publicItalianCities
} from './public';

export const legalForms = publicLegalForms;
export const countries = publicCountries;
export const italianCities = publicItalianCities;

// Export types for backward compatibility
export type { InsertLegalForm, LegalForm } from './public';
export type { InsertCountry, Country } from './public';
export type { InsertItalianCity, ItalianCity } from './public';

// ==================== USER EXTRA PERMS RE-EXPORTED FROM W3SUITE ====================
import { userExtraPerms as w3suiteUserExtraPermsTable } from './w3suite';
export const userExtraPerms = w3suiteUserExtraPermsTable;

// ==================== ENTITY LOGS RE-EXPORTED FROM W3SUITE ====================
import { entityLogs as w3suiteEntityLogsTable } from './w3suite';
export const entityLogs = w3suiteEntityLogsTable;
export type { InsertEntityLog, EntityLog } from './w3suite';

// ==================== BRAND INTERFACE MOVED TO SEPARATE SCHEMA ====================
// Brand Interface tables are now in brand-interface.ts with dedicated 'brand_interface' schema