import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import ws from "ws";
import * as publicSharedSchema from "../db/schema/public";
import * as w3suiteSchema from "../db/schema/w3suite";
import * as brandInterfaceSchema from "../db/schema/brand-interface";

// Merge degli schemi per supportare multi-schema database
const schema = { 
  ...publicSharedSchema,     // Shared reference data
  ...w3suiteSchema,          // W3 Suite tenant-specific data
  ...brandInterfaceSchema    // Brand Interface system
};

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

// ============================================================================
// MULTITENANT DATABASE CONTEXT MANAGEMENT
// ============================================================================

/**
 * Imposta il tenant corrente nella sessione PostgreSQL
 * Necessario per Row Level Security (RLS)
 */
export const setTenantContext = async (tenantId: string) => {
  await db.execute(
    sql`SELECT set_current_tenant(${tenantId}::uuid)`
  );
};

/**
 * Ottiene il tenant corrente dalla sessione PostgreSQL
 */
export const getCurrentTenant = async (): Promise<string | null> => {
  try {
    const result = await db.execute(
      sql`SELECT get_current_tenant() as tenant_id`
    );
    return result.rows[0]?.tenant_id as string || null;
  } catch (error) {
    return null;
  }
};

/**
 * Wrapper per eseguire operazioni nel contesto di un tenant specifico
 */
export const withTenantContext = async <T>(
  tenantId: string, 
  operation: () => Promise<T>
): Promise<T> => {
  await setTenantContext(tenantId);
  try {
    return await operation();
  } finally {
    // Reset context dopo l'operazione
    await db.execute(sql`SELECT set_config('app.current_tenant_id', NULL, false)`);
  }
};