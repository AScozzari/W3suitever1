"use strict";
// Public Schema - Shared reference data accessible by all tenants
// All tables in this file remain in the default 'public' schema
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertUtmMediumSchema = exports.utmMediums = exports.insertUtmSourceSchema = exports.utmSources = exports.insertPaymentMethodsConditionSchema = exports.paymentMethodsConditions = exports.insertPaymentMethodSchema = exports.paymentMethods = exports.insertItalianCitySchema = exports.italianCities = exports.insertCountrySchema = exports.countries = exports.insertLegalFormSchema = exports.legalForms = exports.insertDriverTypologySchema = exports.driverTypologies = exports.insertDriverCategorySchema = exports.driverCategories = exports.insertDriverSchema = exports.drivers = exports.insertCommercialAreaSchema = exports.commercialAreas = exports.insertMarketingChannelUtmMappingSchema = exports.marketingChannelUtmMappings = exports.insertMarketingChannelSchema = exports.marketingChannels = exports.insertChannelSchema = exports.channels = exports.insertBrandSchema = exports.brands = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_zod_1 = require("drizzle-zod");
// ==================== SHARED REFERENCE TABLES ====================
// ==================== BRANDS ====================
exports.brands = (0, pg_core_1.pgTable)("brands", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    code: (0, pg_core_1.varchar)("code", { length: 50 }).unique().notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    status: (0, pg_core_1.varchar)("status", { length: 50 }).default("active"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.insertBrandSchema = (0, drizzle_zod_1.createInsertSchema)(exports.brands).omit({
    id: true,
    createdAt: true
});
// ==================== CHANNELS ====================
exports.channels = (0, pg_core_1.pgTable)("channels", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    code: (0, pg_core_1.varchar)("code", { length: 50 }).unique().notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.insertChannelSchema = (0, drizzle_zod_1.createInsertSchema)(exports.channels).omit({
    id: true,
    createdAt: true
});
// ==================== MARKETING CHANNELS ====================
exports.marketingChannels = (0, pg_core_1.pgTable)("marketing_channels", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    code: (0, pg_core_1.varchar)("code", { length: 50 }).unique().notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    category: (0, pg_core_1.varchar)("category", { length: 20 }).notNull(), // digital, traditional, direct
    generatesUtm: (0, pg_core_1.boolean)("generates_utm").default(false).notNull(), // true for digital channels with UTM, false for tracking-only
    active: (0, pg_core_1.boolean)("active").default(true),
    sortOrder: (0, pg_core_1.smallint)("sort_order").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.insertMarketingChannelSchema = (0, drizzle_zod_1.createInsertSchema)(exports.marketingChannels).omit({
    id: true,
    createdAt: true
});
// ==================== MARKETING CHANNEL UTM MAPPINGS ====================
exports.marketingChannelUtmMappings = (0, pg_core_1.pgTable)("marketing_channel_utm_mappings", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    marketingChannelId: (0, pg_core_1.uuid)("marketing_channel_id").notNull().references(() => exports.marketingChannels.id, { onDelete: 'cascade' }),
    suggestedUtmSource: (0, pg_core_1.varchar)("suggested_utm_source", { length: 100 }).notNull(),
    suggestedUtmMedium: (0, pg_core_1.varchar)("suggested_utm_medium", { length: 100 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_marketing_channel_utm_mappings_channel").on(table.marketingChannelId),
]);
exports.insertMarketingChannelUtmMappingSchema = (0, drizzle_zod_1.createInsertSchema)(exports.marketingChannelUtmMappings).omit({
    id: true,
    createdAt: true
});
// ==================== COMMERCIAL AREAS ====================
exports.commercialAreas = (0, pg_core_1.pgTable)("commercial_areas", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    code: (0, pg_core_1.varchar)("code", { length: 20 }).unique().notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 100 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.insertCommercialAreaSchema = (0, drizzle_zod_1.createInsertSchema)(exports.commercialAreas).omit({
    id: true,
    createdAt: true
});
// ==================== BUSINESS DRIVERS ====================
exports.drivers = (0, pg_core_1.pgTable)("drivers", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    code: (0, pg_core_1.varchar)("code", { length: 50 }).unique().notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    active: (0, pg_core_1.boolean)("active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.insertDriverSchema = (0, drizzle_zod_1.createInsertSchema)(exports.drivers).omit({
    id: true,
    createdAt: true
});
// ==================== DRIVER CATEGORIES (Brand Official) ====================
exports.driverCategories = (0, pg_core_1.pgTable)("driver_categories", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    driverId: (0, pg_core_1.uuid)("driver_id").notNull().references(() => exports.drivers.id, { onDelete: 'cascade' }),
    code: (0, pg_core_1.varchar)("code", { length: 50 }).notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    active: (0, pg_core_1.boolean)("active").default(true),
    sortOrder: (0, pg_core_1.smallint)("sort_order").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_driver_categories_driver").on(table.driverId),
    (0, pg_core_1.uniqueIndex)("driver_categories_unique").on(table.driverId, table.code),
]);
exports.insertDriverCategorySchema = (0, drizzle_zod_1.createInsertSchema)(exports.driverCategories).omit({
    id: true,
    createdAt: true
});
// ==================== DRIVER TYPOLOGIES (Brand Official) ====================
exports.driverTypologies = (0, pg_core_1.pgTable)("driver_typologies", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    categoryId: (0, pg_core_1.uuid)("category_id").notNull().references(() => exports.driverCategories.id, { onDelete: 'cascade' }),
    code: (0, pg_core_1.varchar)("code", { length: 50 }).notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    active: (0, pg_core_1.boolean)("active").default(true),
    sortOrder: (0, pg_core_1.smallint)("sort_order").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_driver_typologies_category").on(table.categoryId),
    (0, pg_core_1.uniqueIndex)("driver_typologies_unique").on(table.categoryId, table.code),
]);
exports.insertDriverTypologySchema = (0, drizzle_zod_1.createInsertSchema)(exports.driverTypologies).omit({
    id: true,
    createdAt: true
});
// ==================== REFERENCE TABLES ====================
// Forme giuridiche italiane
exports.legalForms = (0, pg_core_1.pgTable)("legal_forms", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    code: (0, pg_core_1.varchar)("code", { length: 20 }).unique().notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 100 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    minCapital: (0, pg_core_1.varchar)("min_capital", { length: 50 }),
    liability: (0, pg_core_1.varchar)("liability", { length: 50 }), // "limited", "unlimited", "mixed"
    active: (0, pg_core_1.boolean)("active").default(true),
    sortOrder: (0, pg_core_1.smallint)("sort_order").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.insertLegalFormSchema = (0, drizzle_zod_1.createInsertSchema)(exports.legalForms).omit({
    id: true,
    createdAt: true
});
// Paesi
exports.countries = (0, pg_core_1.pgTable)("countries", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    code: (0, pg_core_1.varchar)("code", { length: 3 }).unique().notNull(), // ISO 3166-1
    name: (0, pg_core_1.varchar)("name", { length: 100 }).notNull(),
    active: (0, pg_core_1.boolean)("active").default(true),
    isDefault: (0, pg_core_1.boolean)("is_default").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.insertCountrySchema = (0, drizzle_zod_1.createInsertSchema)(exports.countries).omit({
    id: true,
    createdAt: true
});
// Città italiane
exports.italianCities = (0, pg_core_1.pgTable)("italian_cities", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    name: (0, pg_core_1.varchar)("name", { length: 100 }).notNull(),
    province: (0, pg_core_1.varchar)("province", { length: 2 }).notNull(), // Codice provincia (MI, RM, etc)
    provinceName: (0, pg_core_1.varchar)("province_name", { length: 100 }).notNull(),
    region: (0, pg_core_1.varchar)("region", { length: 100 }).notNull(),
    postalCode: (0, pg_core_1.varchar)("postal_code", { length: 5 }).notNull(),
    active: (0, pg_core_1.boolean)("active").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_italian_cities_name").on(table.name),
    (0, pg_core_1.index)("idx_italian_cities_province").on(table.province),
    (0, pg_core_1.uniqueIndex)("italian_cities_unique").on(table.name, table.province),
]);
exports.insertItalianCitySchema = (0, drizzle_zod_1.createInsertSchema)(exports.italianCities).omit({
    id: true,
    createdAt: true
});
// ==================== PAYMENT METHODS ====================
exports.paymentMethods = (0, pg_core_1.pgTable)("payment_methods", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    code: (0, pg_core_1.varchar)("code", { length: 50 }).unique().notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 100 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    category: (0, pg_core_1.varchar)("category", { length: 50 }).notNull(), // 'bank_transfer', 'direct_debit', 'card', 'digital', 'cash', 'check'
    requiresIban: (0, pg_core_1.boolean)("requires_iban").default(false),
    requiresAuth: (0, pg_core_1.boolean)("requires_auth").default(false),
    supportsBatching: (0, pg_core_1.boolean)("supports_batching").default(false),
    countryCode: (0, pg_core_1.varchar)("country_code", { length: 3 }), // ISO 3166-1 (NULL = international)
    active: (0, pg_core_1.boolean)("active").default(true),
    isDefault: (0, pg_core_1.boolean)("is_default").default(false),
    sortOrder: (0, pg_core_1.smallint)("sort_order").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_payment_methods_category").on(table.category),
    (0, pg_core_1.index)("idx_payment_methods_country").on(table.countryCode),
]);
exports.insertPaymentMethodSchema = (0, drizzle_zod_1.createInsertSchema)(exports.paymentMethods).omit({
    id: true,
    createdAt: true
});
// ==================== PAYMENT CONDITIONS ====================
exports.paymentMethodsConditions = (0, pg_core_1.pgTable)("payment_methods_conditions", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    code: (0, pg_core_1.varchar)("code", { length: 50 }).unique().notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 100 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    days: (0, pg_core_1.smallint)("days"), // Number of days for payment (30, 60, 90, etc.)
    type: (0, pg_core_1.varchar)("type", { length: 50 }).notNull(), // 'standard', 'dffm', 'immediate', 'custom'
    calculation: (0, pg_core_1.varchar)("calculation", { length: 50 }), // 'from_invoice', 'from_month_end', 'immediate'
    active: (0, pg_core_1.boolean)("active").default(true),
    isDefault: (0, pg_core_1.boolean)("is_default").default(false),
    sortOrder: (0, pg_core_1.smallint)("sort_order").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_payment_conditions_type").on(table.type),
    (0, pg_core_1.index)("idx_payment_conditions_days").on(table.days),
]);
exports.insertPaymentMethodsConditionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.paymentMethodsConditions).omit({
    id: true,
    createdAt: true
});
// ==================== UTM SOURCES (Marketing Attribution) ====================
exports.utmSources = (0, pg_core_1.pgTable)("utm_sources", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    code: (0, pg_core_1.varchar)("code", { length: 50 }).unique().notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 100 }).notNull(),
    displayName: (0, pg_core_1.varchar)("display_name", { length: 100 }).notNull(),
    category: (0, pg_core_1.varchar)("category", { length: 50 }).notNull(), // 'social', 'search', 'email', 'referral', 'direct', 'partner'
    iconUrl: (0, pg_core_1.text)("icon_url"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    sortOrder: (0, pg_core_1.smallint)("sort_order").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_utm_sources_category").on(table.category),
    (0, pg_core_1.index)("idx_utm_sources_active").on(table.isActive),
]);
exports.insertUtmSourceSchema = (0, drizzle_zod_1.createInsertSchema)(exports.utmSources).omit({
    id: true,
    createdAt: true
});
// ==================== UTM MEDIUMS (Marketing Attribution) ====================
exports.utmMediums = (0, pg_core_1.pgTable)("utm_mediums", {
    id: (0, pg_core_1.uuid)("id").primaryKey().default((0, drizzle_orm_1.sql) `gen_random_uuid()`),
    code: (0, pg_core_1.varchar)("code", { length: 50 }).unique().notNull(),
    name: (0, pg_core_1.varchar)("name", { length: 100 }).notNull(),
    displayName: (0, pg_core_1.varchar)("display_name", { length: 100 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    applicableSources: (0, pg_core_1.jsonb)("applicable_sources").$type(), // Array of source codes that can use this medium
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    sortOrder: (0, pg_core_1.smallint)("sort_order").default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (table) => [
    (0, pg_core_1.index)("idx_utm_mediums_active").on(table.isActive),
]);
exports.insertUtmMediumSchema = (0, drizzle_zod_1.createInsertSchema)(exports.utmMediums).omit({
    id: true,
    createdAt: true
});
