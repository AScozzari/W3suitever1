import { Pool } from 'pg';

// Check if database is disabled for in-memory mode
const isDbDisabled = process.env.DB_DISABLED === '1' || process.env.USE_INMEMORY_DB === 'true' || !process.env.DATABASE_URL;

// In-memory storage fallback
let inMemoryData: Map<string, any> = new Map();

// Create database connection pool (only if DB enabled)
export const db = isDbDisabled ? null : new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  keepAlive: true,
  idleTimeoutMillis: 30000,
  ssl: { rejectUnauthorized: false },
  // Connection retry settings
  connectionTimeoutMillis: 5000,
});

if (isDbDisabled) {
  console.log('⚠️  Database disabled - using in-memory storage');
} else {
  console.log('✅ Database connection pool initialized (TCP)');
  
  // Add error handling for connection pool
  db!.on('error', (err) => {
    console.error('❌ Database pool error:', err.message);
    if (err.code === '57P01' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
      console.log('🔄 Database connection will be retried automatically');
    }
  });
}

// Helper function to execute queries with retry logic
export async function query(text: string, params?: any[], retries: number = 3): Promise<any> {
  if (isDbDisabled) {
    // In-memory query simulation
    console.log('🔧 In-memory query:', text.substring(0, 50) + '...');
    return { rows: [], rowCount: 0 };
  }
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await db!.connect();
      try {
        const result = await client.query(text, params);
        return result;
      } finally {
        client.release();
      }
    } catch (error: any) {
      const isRetryableError = error.code === '57P01' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT';
      if (attempt < retries && isRetryableError) {
        console.log(`🔄 Database query retry ${attempt}/${retries} due to: ${error.code}`);
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100)); // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}

// Transaction helper with retry logic
export async function transaction<T>(callback: (client: any) => Promise<T>, retries: number = 3): Promise<T> {
  if (isDbDisabled) {
    // In-memory transaction simulation
    console.log('🔧 In-memory transaction executed');
    const mockClient = { query: async () => ({ rows: [], rowCount: 0 }) };
    return await callback(mockClient);
  }
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    let client;
    try {
      client = await db!.connect();
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error: any) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('❌ Transaction rollback failed:', rollbackError);
        }
      }
      
      const isRetryableError = error.code === '57P01' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT';
      if (attempt < retries && isRetryableError) {
        console.log(`🔄 Database transaction retry ${attempt}/${retries} due to: ${error.code}`);
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100)); // Exponential backoff
        continue;
      }
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}

// Export in-memory helpers
export { isDbDisabled, inMemoryData };