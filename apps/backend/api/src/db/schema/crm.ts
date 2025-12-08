// CRM Module schema
import { pgTable, varchar, text, timestamp, uuid, integer, uniqueIndex } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { tenants, users } from './w3suite';
import { stores } from './w3suite';
import { utmSources, utmMediums } from './public';

// ==================== CUSTOMERS ====================
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  storeId: uuid('store_id').references(() => stores.id),
  code: varchar('code', { length: 50 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'individual' | 'business'
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  businessName: varchar('business_name', { length: 255 }),
  fiscalCode: varchar('fiscal_code', { length: 50 }),
  vat: varchar('vat', { length: 50 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  mobilePhone: varchar('mobile_phone', { length: 50 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  province: varchar('province', { length: 10 }),
  postalCode: varchar('postal_code', { length: 10 }),
  country: varchar('country', { length: 50 }).default('IT'),
  segment: varchar('segment', { length: 50 }), // 'residential' | 'soho' | 'pmi' | 'enterprise'
  status: varchar('status', { length: 50 }).default('active'),
  tags: text('tags').array(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantCodeUnique: uniqueIndex('customers_tenant_code_unique').on(table.tenantId, table.code),
}));

export const insertCustomerSchema = createInsertSchema(customers).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// ==================== LEADS ====================
export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  storeId: uuid('store_id').references(() => stores.id),
  assignedTo: varchar('assigned_to').references(() => users.id),
  source: varchar('source', { length: 50 }), // 'website' | 'phone' | 'store' | 'campaign' | 'referral'
  campaign: varchar('campaign', { length: 255 }),
  status: varchar('status', { length: 50 }).default('new'), // 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
  score: integer('score').default(0),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  businessName: varchar('business_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  interests: text('interests').array(),
  estimatedValue: integer('estimated_value'),
  notes: text('notes'),
  convertedToCustomerId: uuid('converted_to_customer_id').references(() => customers.id),
  convertedAt: timestamp('converted_at'),
  lastContactAt: timestamp('last_contact_at'),
  nextActionAt: timestamp('next_action_at'),
  // UTM Marketing Attribution Parameters (inherited from campaign or captured from URL)
  utmSourceId: uuid('utm_source_id').references(() => utmSources.id),
  utmMediumId: uuid('utm_medium_id').references(() => utmMediums.id),
  utmCampaign: varchar('utm_campaign', { length: 255 }),
  utmContent: varchar('utm_content', { length: 255 }), // For A/B testing (e.g., 'cta-blue', 'banner-top')
  utmTerm: varchar('utm_term', { length: 255 }), // For paid search keywords
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;