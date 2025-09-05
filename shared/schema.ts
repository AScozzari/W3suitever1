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
  unique,
  primaryKey,
  integer,
  decimal,
  date,
  smallint,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==================== ENUMS ====================
export const scopeTypeEnum = pgEnum('scope_type', ['TENANT', 'RS', 'STORE']);
export const channelTypeEnum = pgEnum('channel_type', ['FRANCHISING', 'TOP_DEALER', 'DEALER']);
export const driverTypeEnum = pgEnum('driver_type', ['FISSO', 'MOBILE', 'ENERGIA', 'PROTEZIONE', 'ASSICURAZIONE']);
export const permModeEnum = pgEnum('perm_mode', ['GRANT', 'REVOKE']);

// ==================== SESSIONS TABLE (Replit Auth) ====================
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// ==================== CORE MULTI-TENANT TABLES ====================

// Tenant (Organizzazione) - Root della gerarchia
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique(),
  status: varchar("status", { length: 50 }).default("active"),
  settings: jsonb("settings").default({}),
  features: jsonb("features").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
}, (table) => [
  index("idx_tenants_slug").on(table.slug),
  index("idx_tenants_status").on(table.status),
]);

// Ragioni Sociali (Legal Entities) - Livello 2
export const legalEntities = pgTable("legal_entities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  vat: varchar("vat", { length: 50 }), // P.IVA
  billingProfileId: uuid("billing_profile_id"),
  status: varchar("status", { length: 50 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
}, (table) => [
  index("idx_legal_entities_tenant").on(table.tenantId),
  index("idx_legal_entities_status").on(table.status),
]);

// Punti Vendita (Stores) - Livello 3
export const stores = pgTable("stores", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  legalEntityId: uuid("legal_entity_id").notNull().references(() => legalEntities.id),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  channelId: uuid("channel_id").notNull().references(() => channels.id),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  province: varchar("province", { length: 10 }),
  region: varchar("region", { length: 100 }),
  geo: jsonb("geo"), // {lat, lng}
  status: varchar("status", { length: 50 }).default("active"),
  openedAt: date("opened_at"),
  closedAt: date("closed_at"),
  billingOverrideId: uuid("billing_override_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
}, (table) => [
  unique("unique_store_code_tenant").on(table.tenantId, table.code),
  index("idx_stores_tenant").on(table.tenantId),
  index("idx_stores_legal_entity").on(table.legalEntityId),
  index("idx_stores_channel").on(table.channelId),
  index("idx_stores_status").on(table.status),
  index("idx_stores_region").on(table.region),
]);

// ==================== DIMENSION TABLES ====================

// Brands (WindTre, Very Mobile, etc.)
export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Canali (Franchising, Top Dealer, Dealer)
export const channels = pgTable("channels", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Driver Business (Fisso, Mobile, Energia, etc.)
export const drivers = pgTable("drivers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).unique().notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==================== ASSOCIATION TABLES ====================

// Store-Brand Association (N-N)
export const storeBrands = pgTable("store_brands", {
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  brandId: uuid("brand_id").notNull().references(() => brands.id),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.storeId, table.brandId] }),
  index("idx_store_brands_store").on(table.storeId),
  index("idx_store_brands_brand").on(table.brandId),
]);

// Store Driver Potential (Clusterizzazione)
export const storeDriverPotential = pgTable("store_driver_potential", {
  storeId: uuid("store_id").notNull().references(() => stores.id, { onDelete: "cascade" }),
  driverId: uuid("driver_id").notNull().references(() => drivers.id),
  potentialScore: smallint("potential_score").notNull(), // 0-100
  clusterLabel: varchar("cluster_label", { length: 50 }), // A/B/C or High/Med/Low
  kpis: jsonb("kpis"), // metriche dettagliate
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.storeId, table.driverId] }),
  index("idx_store_driver_store").on(table.storeId),
  index("idx_store_driver_driver").on(table.driverId),
]);

// ==================== USERS & RBAC ====================

// Users (Risorse)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  email: varchar("email", { length: 255 }).unique().notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  profileImageUrl: varchar("profile_image_url"),
  status: varchar("status", { length: 50 }).default("active"),
  mfaEnabled: boolean("mfa_enabled").default(false),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_users_tenant").on(table.tenantId),
  index("idx_users_email").on(table.email),
  index("idx_users_status").on(table.status),
]);

// Roles
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("unique_role_name_tenant").on(table.tenantId, table.name),
  index("idx_roles_tenant").on(table.tenantId),
]);

// Role Permissions
export const rolePerms = pgTable("role_perms", {
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  perm: varchar("perm", { length: 255 }).notNull(), // es. crm.read, cassa.refund
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.roleId, table.perm] }),
  index("idx_role_perms_role").on(table.roleId),
]);

// User Assignments (con Scope)
export const userAssignments = pgTable("user_assignments", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  scopeType: scopeTypeEnum("scope_type").notNull(),
  scopeId: uuid("scope_id"), // null for TENANT scope
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.roleId, table.scopeType, table.scopeId] }),
  index("idx_user_assignments_user").on(table.userId),
  index("idx_user_assignments_role").on(table.roleId),
  index("idx_user_assignments_scope").on(table.scopeType, table.scopeId),
]);

// User Extra Permissions (Grant/Revoke overrides)
export const userExtraPerms = pgTable("user_extra_perms", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  perm: varchar("perm", { length: 255 }).notNull(),
  mode: permModeEnum("mode").notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.perm] }),
  index("idx_user_extra_perms_user").on(table.userId),
]);

// ==================== CRM MODULE ====================

// Leads
export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  storeId: uuid("store_id").references(() => stores.id),
  source: varchar("source", { length: 100 }).notNull(),
  campaignId: uuid("campaign_id"),
  status: varchar("status", { length: 50 }).notNull(),
  score: smallint("score"), // 0-100 AI scoring
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_leads_tenant_created").on(table.tenantId, table.createdAt),
  index("idx_leads_store").on(table.storeId),
  index("idx_leads_status").on(table.status),
  index("idx_leads_campaign").on(table.campaignId),
]);

// Lead Events (interazioni)
export const leadEvents = pgTable("lead_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  channel: varchar("channel", { length: 50 }).notNull(), // email, whatsapp, phone, etc
  eventType: varchar("event_type", { length: 50 }).notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lead_events_lead").on(table.leadId),
  index("idx_lead_events_channel").on(table.channel),
  index("idx_lead_events_created").on(table.createdAt),
]);

// Customers
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  taxCode: varchar("tax_code", { length: 50 }),
  company: varchar("company", { length: 255 }),
  vatNumber: varchar("vat_number", { length: 50 }),
  address: text("address"),
  preferredStoreId: uuid("preferred_store_id").references(() => stores.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_customers_tenant").on(table.tenantId),
  index("idx_customers_email").on(table.email),
  index("idx_customers_phone").on(table.phone),
  unique("unique_customer_email_tenant").on(table.tenantId, table.email),
]);

// Campaigns
export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  type: varchar("type", { length: 50 }),
  startDate: date("start_date"),
  endDate: date("end_date"),
  budget: decimal("budget", { precision: 10, scale: 2 }),
  targeting: jsonb("targeting"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_campaigns_tenant").on(table.tenantId),
  index("idx_campaigns_status").on(table.status),
  index("idx_campaigns_dates").on(table.startDate, table.endDate),
]);

// ==================== MAGAZZINO MODULE ====================

// Products
export const products = pgTable("products", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  sku: varchar("sku", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default('22.00'),
  category: varchar("category", { length: 100 }),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("unique_product_sku_tenant").on(table.tenantId, table.sku),
  index("idx_products_tenant").on(table.tenantId),
  index("idx_products_category").on(table.category),
  index("idx_products_active").on(table.isActive),
]);

// Stock Items
export const stockItems = pgTable("stock_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  qty: integer("qty").notNull().default(0),
  minQty: integer("min_qty").default(0),
  maxQty: integer("max_qty"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("unique_stock_store_product").on(table.storeId, table.productId),
  index("idx_stock_items_tenant").on(table.tenantId),
  index("idx_stock_items_store").on(table.storeId),
  index("idx_stock_items_product").on(table.productId),
]);

// Stock Movements
export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  stockItemId: uuid("stock_item_id").notNull().references(() => stockItems.id),
  type: varchar("type", { length: 50 }).notNull(), // IN, OUT, ADJUST, TRANSFER
  delta: integer("delta").notNull(),
  reason: varchar("reason", { length: 255 }),
  refId: uuid("ref_id"), // order_id, transfer_id, etc
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_stock_movements_item").on(table.stockItemId),
  index("idx_stock_movements_type").on(table.type),
  index("idx_stock_movements_created").on(table.createdAt),
]);

// ==================== CASSA MODULE ====================

// Orders
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id),
  storeId: uuid("store_id").notNull().references(() => stores.id),
  customerId: uuid("customer_id").references(() => customers.id),
  orderNumber: varchar("order_number", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  totalCents: integer("total_cents").notNull(),
  taxCents: integer("tax_cents").notNull(),
  discountCents: integer("discount_cents").default(0),
  notes: text("notes"),
  metadata: jsonb("metadata"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("unique_order_number_tenant").on(table.tenantId, table.orderNumber),
  index("idx_orders_tenant_created").on(table.tenantId, table.createdAt),
  index("idx_orders_store").on(table.storeId),
  index("idx_orders_customer").on(table.customerId),
  index("idx_orders_status").on(table.status),
]);

// Order Items
export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id),
  qty: integer("qty").notNull(),
  priceCents: integer("price_cents").notNull(),
  discountCents: integer("discount_cents").default(0),
  taxCents: integer("tax_cents").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_order_items_order").on(table.orderId),
  index("idx_order_items_product").on(table.productId),
]);

// Payments
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  method: varchar("method", { length: 50 }).notNull(), // cash, card, bank_transfer
  amountCents: integer("amount_cents").notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  receiptNo: varchar("receipt_no", { length: 100 }),
  transactionId: varchar("transaction_id", { length: 255 }),
  metadata: jsonb("metadata"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_payments_order").on(table.orderId),
  index("idx_payments_status").on(table.status),
  index("idx_payments_method").on(table.method),
]);

// ==================== BRAND INTERFACE ====================

// Price Lists (Listini)
export const priceLists = pgTable("price_lists", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  version: varchar("version", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  validFrom: date("valid_from"),
  validTo: date("valid_to"),
  rules: jsonb("rules"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_price_lists_status").on(table.status),
  index("idx_price_lists_dates").on(table.validFrom, table.validTo),
]);

// Deployments (Propagazione Brand)
export const deployments = pgTable("deployments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  artifactType: varchar("artifact_type", { length: 50 }).notNull(), // PRICE_LIST, CAMPAIGN, TEMPLATE
  artifactId: uuid("artifact_id").notNull(),
  targetType: varchar("target_type", { length: 50 }).notNull(), // ALL, TENANT, RS, STORE
  targetId: uuid("target_id"),
  version: varchar("version", { length: 50 }),
  status: varchar("status", { length: 50 }).notNull(),
  deployedBy: varchar("deployed_by"),
  deployedAt: timestamp("deployed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_deployments_artifact").on(table.artifactType, table.artifactId),
  index("idx_deployments_target").on(table.targetType, table.targetId),
  index("idx_deployments_status").on(table.status),
]);

// ==================== RELATIONS ====================

export const tenantsRelations = relations(tenants, ({ many }) => ({
  legalEntities: many(legalEntities),
  stores: many(stores),
  users: many(users),
  roles: many(roles),
  leads: many(leads),
  customers: many(customers),
  campaigns: many(campaigns),
  products: many(products),
  orders: many(orders),
}));

export const legalEntitiesRelations = relations(legalEntities, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [legalEntities.tenantId],
    references: [tenants.id],
  }),
  stores: many(stores),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [stores.tenantId],
    references: [tenants.id],
  }),
  legalEntity: one(legalEntities, {
    fields: [stores.legalEntityId],
    references: [legalEntities.id],
  }),
  channel: one(channels, {
    fields: [stores.channelId],
    references: [channels.id],
  }),
  storeBrands: many(storeBrands),
  storeDriverPotential: many(storeDriverPotential),
  stockItems: many(stockItems),
  orders: many(orders),
  leads: many(leads),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  userAssignments: many(userAssignments),
  userExtraPerms: many(userExtraPerms),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [roles.tenantId],
    references: [tenants.id],
  }),
  rolePerms: many(rolePerms),
  userAssignments: many(userAssignments),
}));

// ==================== EXPORT TYPES & SCHEMAS ====================

// User types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export const insertUserSchema = createInsertSchema(users);

// Tenant types  
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;
export const insertTenantSchema = createInsertSchema(tenants);

// Legal Entity types
export type LegalEntity = typeof legalEntities.$inferSelect;
export type InsertLegalEntity = typeof legalEntities.$inferInsert;
export const insertLegalEntitySchema = createInsertSchema(legalEntities);

// Store types
export type Store = typeof stores.$inferSelect;
export type InsertStore = typeof stores.$inferInsert;
export const insertStoreSchema = createInsertSchema(stores);

// Lead types
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
export const insertLeadSchema = createInsertSchema(leads);

// Customer types
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;
export const insertCustomerSchema = createInsertSchema(customers);

// Product types
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export const insertProductSchema = createInsertSchema(products);

// Order types
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export const insertOrderSchema = createInsertSchema(orders);

// Campaign types
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;
export const insertCampaignSchema = createInsertSchema(campaigns);