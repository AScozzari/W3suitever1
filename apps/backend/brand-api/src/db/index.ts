import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as brandSchema from "./schema/brand-interface.js";

// Check if database is disabled for in-memory mode
const isDbDisabled = process.env.DB_DISABLED === '1' || process.env.USE_INMEMORY_DB === 'true' || !process.env.DATABASE_URL;

// In-memory storage fallback
let inMemoryBrandData: Map<string, any> = new Map();

let db: any;
let pool: Pool | null = null;

if (isDbDisabled) {
  console.log('⚠️  Brand Database disabled - using in-memory storage');
  // Mock Drizzle client for in-memory mode
  db = {
    select: () => ({ from: () => ({ where: () => [] }) }),
    insert: () => ({ values: () => ({ returning: () => [] }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: () => [] }) }) }),
    delete: () => ({ where: () => ({ returning: () => [] }) })
  };
} else {
  const databaseUrl = process.env.DATABASE_URL!; // Safe because we checked above
  
  // Create connection pool with resilience settings
  pool = new Pool({
    connectionString: databaseUrl,
    max: 3,
    keepAlive: true,
    idleTimeoutMillis: 30000,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });
  
  // Add error handling for connection pool
  pool.on('error', (err) => {
    console.error('❌ Brand DB pool error:', err.message);
    if (err.code === '57P01' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
      console.log('🔄 Brand DB connection will be retried automatically');
    }
  });
  
  db = drizzle(pool, { schema: brandSchema });
  console.log('✅ Brand Database connection initialized (TCP)');
}

export { db, pool, isDbDisabled, inMemoryBrandData };

// Export schema per uso esterno
export * from "./schema/brand-interface.js";