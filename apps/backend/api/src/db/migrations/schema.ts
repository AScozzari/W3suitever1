import { pgTable, index, varchar, jsonb, timestamp, unique, uuid, boolean, text, smallint, primaryKey, pgView, bigint, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const channelType = pgEnum("channel_type", ['FRANCHISING', 'TOP_DEALER', 'DEALER'])
export const driverType = pgEnum("driver_type", ['FISSO', 'MOBILE', 'ENERGIA', 'PROTEZIONE', 'ASSICURAZIONE'])
export const notificationPriority = pgEnum("notification_priority", ['low', 'medium', 'high', 'critical'])
export const notificationStatus = pgEnum("notification_status", ['unread', 'read'])
export const notificationType = pgEnum("notification_type", ['system', 'security', 'data', 'custom'])
export const objectType = pgEnum("object_type", ['avatar', 'document', 'image', 'file'])
export const objectVisibility = pgEnum("object_visibility", ['public', 'private'])
export const permMode = pgEnum("perm_mode", ['GRANT', 'REVOKE'])
export const permissionScope = pgEnum("permission_scope", ['system', 'tenant', 'rs', 'store'])
export const scopeType = pgEnum("scope_type", ['tenant', 'legal_entity', 'store'])
export const storeType = pgEnum("store_type", ['flagship', 'franchise', 'outlet', 'pop_up'])
export const subscriptionStatus = pgEnum("subscription_status", ['active', 'suspended', 'cancelled', 'trial'])
export const supplierOrigin = pgEnum("supplier_origin", ['brand', 'tenant'])
export const supplierStatus = pgEnum("supplier_status", ['active', 'suspended', 'blocked'])
export const supplierType = pgEnum("supplier_type", ['distributore', 'produttore', 'servizi', 'logistica'])
export const tenantType = pgEnum("tenant_type", ['franchise', 'corporate', 'independent'])
export const userRole = pgEnum("user_role", ['super_admin', 'tenant_admin', 'store_manager', 'cashier', 'user'])
export const userStatus = pgEnum("user_status", ['attivo', 'sospeso', 'off-boarding'])


export const sessions = pgTable("sessions", {
        sid: varchar().primaryKey().notNull(),
        sess: jsonb().notNull(),
        expire: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
        index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const channels = pgTable("channels", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        code: varchar({ length: 50 }).notNull(),
        name: varchar({ length: 255 }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
        unique("channels_code_key").on(table.code),
]);

export const brands = pgTable("brands", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        code: varchar({ length: 50 }).notNull(),
        name: varchar({ length: 255 }).notNull(),
        status: varchar({ length: 50 }).default('active'),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
        unique("brands_code_key").on(table.code),
]);

export const drivers = pgTable("drivers", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        code: varchar({ length: 50 }).notNull(),
        name: varchar({ length: 255 }).notNull(),
        active: boolean().default(true),
        createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
        unique("drivers_code_key").on(table.code),
]);

export const italianCities = pgTable("italian_cities", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        name: varchar({ length: 100 }).notNull(),
        province: varchar({ length: 2 }).notNull(),
        provinceName: varchar("province_name", { length: 100 }).notNull(),
        region: varchar({ length: 100 }).notNull(),
        postalCode: varchar("postal_code", { length: 5 }).notNull(),
        active: boolean().default(true),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        unique("italian_cities_name_province_key").on(table.name, table.province),
]);

export const legalForms = pgTable("legal_forms", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        code: varchar({ length: 20 }).notNull(),
        name: varchar({ length: 100 }).notNull(),
        description: text(),
        minCapital: varchar("min_capital", { length: 50 }),
        liability: varchar({ length: 50 }),
        active: boolean().default(true),
        sortOrder: smallint("sort_order").default(0),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        unique("legal_forms_code_key").on(table.code),
]);

export const countries = pgTable("countries", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        code: varchar({ length: 3 }).notNull(),
        name: varchar({ length: 100 }).notNull(),
        active: boolean().default(true),
        isDefault: boolean("is_default").default(false),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        unique("countries_code_key").on(table.code),
]);

export const commercialAreas = pgTable("commercial_areas", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        code: varchar({ length: 20 }).notNull(),
        name: varchar({ length: 100 }).notNull(),
        description: text(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        unique("commercial_areas_code_key").on(table.code),
]);

export const italianCitiesBackup = pgTable("italian_cities_backup", {
        id: uuid(),
        name: varchar({ length: 100 }),
        province: varchar({ length: 2 }),
        provinceName: varchar("province_name", { length: 100 }),
        region: varchar({ length: 100 }),
        postalCode: varchar("postal_code", { length: 5 }),
        active: boolean(),
        createdAt: timestamp("created_at", { mode: 'string' }),
});

export const roles = pgTable("roles", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        tenantId: uuid("tenant_id").notNull(),
        name: varchar({ length: 100 }).notNull(),
        description: text(),
        isSystem: boolean("is_system").default(false),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const paymentMethods = pgTable("payment_methods", {
        id: uuid().defaultRandom().primaryKey().notNull(),
        code: varchar({ length: 50 }).notNull(),
        name: varchar({ length: 100 }).notNull(),
        description: text(),
        category: varchar({ length: 50 }).notNull(),
        requiresIban: boolean("requires_iban").default(false),
        requiresAuth: boolean("requires_auth").default(false),
        supportsBatching: boolean("supports_batching").default(false),
        countryCode: varchar("country_code", { length: 3 }),
        active: boolean().default(true),
        isDefault: boolean("is_default").default(false),
        sortOrder: smallint("sort_order").default(0),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        index("idx_payment_methods_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
        index("idx_payment_methods_country").using("btree", table.countryCode.asc().nullsLast().op("text_ops")),
        unique("payment_methods_code_key").on(table.code),
]);

export const rolePerms = pgTable("role_perms", {
        roleId: uuid("role_id").notNull(),
        perm: varchar({ length: 255 }).notNull(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        primaryKey({ columns: [table.roleId, table.perm], name: "role_perms_pkey"}),
]);

export const userAssignments = pgTable("user_assignments", {
        userId: varchar("user_id").notNull(),
        roleId: uuid("role_id").notNull(),
        scopeType: scopeType("scope_type").notNull(),
        scopeId: uuid("scope_id").notNull(),
        expiresAt: timestamp("expires_at", { mode: 'string' }),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        primaryKey({ columns: [table.userId, table.roleId, table.scopeType, table.scopeId], name: "user_assignments_pkey"}),
]);
export const rlsStatus = pgView("rls_status", { // TODO: failed to parse database type 'name'
        schemaname: text("schemaname"),
        // TODO: failed to parse database type 'name'
        tablename: text("tablename"),
        rlsEnabled: boolean("rls_enabled"),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        policiesCount: bigint("policies_count", { mode: "number" }),
}).as(sql`SELECT schemaname, tablename, rowsecurity AS rls_enabled, ( SELECT count(*) AS count FROM pg_policies WHERE pg_policies.schemaname = pg_policies.schemaname AND pg_policies.tablename = pg_policies.tablename) AS policies_count FROM pg_tables WHERE schemaname = 'public'::name ORDER BY tablename`);

export const rlsStatusMultiSchema = pgView("rls_status_multi_schema", { // TODO: failed to parse database type 'name'
        schemaname: text("schemaname"),
        // TODO: failed to parse database type 'name'
        tablename: text("tablename"),
        rlsEnabled: boolean("rls_enabled"),
        // You can use { mode: "bigint" } if numbers are exceeding js number limitations
        policiesCount: bigint("policies_count", { mode: "number" }),
}).as(sql`SELECT schemaname, tablename, rowsecurity AS rls_enabled, ( SELECT count(*) AS count FROM pg_policies WHERE pg_policies.schemaname = pg_policies.schemaname AND pg_policies.tablename = pg_policies.tablename) AS policies_count FROM pg_tables WHERE schemaname = ANY (ARRAY['public'::name, 'brand_interface'::name]) ORDER BY schemaname, tablename`);