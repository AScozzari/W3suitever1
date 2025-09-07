import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';

// Import shared schema from W3 Suite API
import * as schema from '@shared/db/schema/index.js';

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = neon(connectionString);
export const db = drizzle(client, { schema });

// Brand Interface special tenant ID
export const BRAND_TENANT_ID = 'brand-interface-uuid';

/**
 * Setup Brand Database Context
 * Sets up the database connection with Brand-specific configurations
 */
export async function setupBrandDatabase() {
  try {
    // Test connection
    await db.execute(sql`SELECT 1`);
    
    // Set Brand tenant context for Row Level Security
    await setBrandTenantContext();
    
    console.log('✅ Brand Database setup completed');
    return true;
  } catch (error) {
    console.error('❌ Brand Database setup failed:', error);
    throw error;
  }
}

/**
 * Set Brand Tenant Context for RLS
 * This allows Brand Interface to operate with special tenant permissions
 */
export async function setBrandTenantContext() {
  try {
    // Set the current tenant context to Brand Interface UUID
    await db.execute(
      sql`SELECT set_current_tenant(${BRAND_TENANT_ID}::uuid)`
    );
    
    console.log('🎯 Brand tenant context set:', BRAND_TENANT_ID);
  } catch (error) {
    console.warn('⚠️ Could not set Brand tenant context (RLS may not be enabled):', error.message);
  }
}

/**
 * Switch to specific tenant context for cross-tenant operations
 */
export async function switchTenantContext(tenantId: string) {
  try {
    await db.execute(
      sql`SELECT set_current_tenant(${tenantId}::uuid)`
    );
    console.log('🔄 Switched to tenant context:', tenantId);
  } catch (error) {
    console.error('❌ Failed to switch tenant context:', error);
    throw error;
  }
}

/**
 * Reset to Brand tenant context
 */
export async function resetToBrandContext() {
  await setBrandTenantContext();
}