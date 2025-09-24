// Inventory/Warehouse Module schema
import { pgTable, varchar, text, timestamp, uuid, integer, boolean, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { tenants } from './w3suite';
import { stores } from './w3suite';

// ==================== PRODUCTS ====================
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  sku: varchar('sku', { length: 100 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  brand: varchar('brand', { length: 100 }),
  unitPrice: integer('unit_price'), // In cents
  costPrice: integer('cost_price'), // In cents
  barcode: varchar('barcode', { length: 50 }),
  weight: integer('weight'), // In grams
  dimensions: jsonb('dimensions'), // {length, width, height}
  isActive: boolean('is_active').default(true),
  isService: boolean('is_service').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantSkuUnique: uniqueIndex('products_tenant_sku_unique').on(table.tenantId, table.sku),
}));

export const insertProductSchema = createInsertSchema(products).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// ==================== INVENTORY ====================
export const inventory = pgTable('inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  quantity: integer('quantity').notNull().default(0),
  reservedQuantity: integer('reserved_quantity').notNull().default(0),
  minStock: integer('min_stock').default(0),
  maxStock: integer('max_stock'),
  reorderPoint: integer('reorder_point'),
  location: varchar('location', { length: 100 }),
  lastRestockAt: timestamp('last_restock_at'),
  lastInventoryAt: timestamp('last_inventory_at'),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  storeProductUnique: uniqueIndex('inventory_store_product_unique').on(table.storeId, table.productId),
}));

export const insertInventorySchema = createInsertSchema(inventory).omit({ 
  id: true, 
  updatedAt: true 
});
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Inventory = typeof inventory.$inferSelect;