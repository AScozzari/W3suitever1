import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as brandSchema from "./schema/brand-interface.js";

// Check if database is disabled for in-memory mode
const isDbDisabled = process.env.DB_DISABLED === '1' || process.env.USE_INMEMORY_DB === 'true' || !process.env.DATABASE_URL;

// In-memory storage fallback
let inMemoryBrandData: Map<string, any> = new Map();

let db: any;

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
  const sql = neon(databaseUrl);
  db = drizzle(sql, { schema: brandSchema });
  console.log('✅ Brand Database connection initialized');
}

export { db, isDbDisabled, inMemoryBrandData };

// Export schema per uso esterno
export * from "./schema/brand-interface.js";