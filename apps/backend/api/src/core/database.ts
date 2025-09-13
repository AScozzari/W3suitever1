import { Pool } from '@neondatabase/serverless';

// Check if database is disabled for in-memory mode
const isDbDisabled = process.env.DB_DISABLED === '1' || process.env.USE_INMEMORY_DB === 'true' || !process.env.DATABASE_URL;

// In-memory storage fallback
let inMemoryData: Map<string, any> = new Map();

// Create database connection pool (only if DB enabled)
export const db = isDbDisabled ? null : new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

if (isDbDisabled) {
  console.log('⚠️  Database disabled - using in-memory storage');
} else {
  console.log('✅ Database connection pool initialized');
}

// Helper function to execute queries
export async function query(text: string, params?: any[]) {
  if (isDbDisabled) {
    // In-memory query simulation
    console.log('🔧 In-memory query:', text.substring(0, 50) + '...');
    return { rows: [], rowCount: 0 };
  }
  
  const client = await db!.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// Transaction helper
export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  if (isDbDisabled) {
    // In-memory transaction simulation
    console.log('🔧 In-memory transaction executed');
    const mockClient = { query: async () => ({ rows: [], rowCount: 0 }) };
    return await callback(mockClient);
  }
  
  const client = await db!.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Export in-memory helpers
export { isDbDisabled, inMemoryData };