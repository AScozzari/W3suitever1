import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as publicSharedSchema from "../db/schema/public";
import * as w3suiteSchema from "../db/schema/w3suite";
import * as brandInterfaceSchema from "../db/schema/brand-interface";

// Merge degli schemi per supportare multi-schema database
const schema = { 
  ...publicSharedSchema,     // Shared reference data
  ...w3suiteSchema,          // W3 Suite tenant-specific data
  ...brandInterfaceSchema    // Brand Interface system
};

// Standard TCP connection - no WebSocket needed

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 1, // 🛠️ HOTFIX: Force single connection to prevent tenant context loss with RLS
  keepAlive: true,
  idleTimeoutMillis: 30000,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
  // Set search_path to prioritize w3suite schema for multitenant operations
  options: '-c search_path=w3suite,public'
});

// Add error handling for connection pool
pool.on('error', (err) => {
  console.error('❌ Drizzle pool error:', err.message);
  // Type assertion for PostgreSQL/Node.js errors that have a code property
  const pgError = err as any;
  if (pgError.code === '57P01' || pgError.code === 'ECONNRESET' || pgError.code === 'ETIMEDOUT') {
    console.log('🔄 Drizzle connection will be retried automatically');
  }
});

export const db = drizzle(pool, { schema });

console.log('✅ Drizzle ORM initialized with TCP connection');

// ============================================================================
// MULTITENANT DATABASE CONTEXT MANAGEMENT
// ============================================================================

/**
 * Imposta il tenant corrente nella sessione PostgreSQL
 * Necessario per Row Level Security (RLS)
 */
export const setTenantContext = async (tenantId: string) => {
  // Use raw SQL to avoid Drizzle template literal issues with set_config
  await db.execute(
    sql.raw(`SELECT set_config('app.current_tenant_id', '${tenantId}', false)`)
  );
};

/**
 * Ottiene il tenant corrente dalla sessione PostgreSQL
 */
export const getCurrentTenant = async (): Promise<string | null> => {
  try {
    const result = await db.execute(
      sql`SELECT current_setting('app.current_tenant_id', true) as tenant_id`
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
    await db.execute(sql.raw(`SELECT set_config('app.current_tenant_id', NULL, false)`));
  }
};