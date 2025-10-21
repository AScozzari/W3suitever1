import { db } from '../core/db.js';
import { mcpServerCredentials } from '../db/schema/w3suite.js';
import { eq, and } from 'drizzle-orm';
import { decryptMCPCredentials } from '../services/mcp-credential-encryption.js';
import { logger } from '../core/logger.js';
import pg from 'pg';

const { Client } = pg;

/**
 * PostgreSQL MCP Executors
 * 
 * 9 action executors for PostgreSQL database integration:
 * - Execute Query, Execute Raw SQL, Insert Row, Update Row, Delete Row
 * - Begin Transaction, Commit Transaction, Rollback Transaction, Create Table
 */

interface PostgreSQLCredentials {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

async function getPostgreSQLClient(serverId: string, tenantId: string): Promise<pg.Client> {
  const [creds] = await db
    .select()
    .from(mcpServerCredentials)
    .where(and(
      eq(mcpServerCredentials.serverId, serverId),
      eq(mcpServerCredentials.tenantId, tenantId)
    ))
    .limit(1);

  if (!creds) {
    throw new Error('PostgreSQL credentials not found');
  }

  const credentials = await decryptMCPCredentials(
    creds.encryptedCredentials,
    tenantId
  ) as PostgreSQLCredentials;

  const client = new Client({
    host: credentials.host,
    port: credentials.port,
    database: credentials.database,
    user: credentials.username,
    password: credentials.password,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  await client.connect();
  return client;
}

// ==================== QUERY EXECUTORS ====================

export async function executePostgreSQLQuery(params: {
  serverId: string;
  tenantId: string;
  config: {
    query: string;
    parameters?: any[];
  };
}): Promise<{ rows: any[]; rowCount: number }> {
  const { serverId, tenantId, config } = params;
  let client: pg.Client | null = null;

  try {
    client = await getPostgreSQLClient(serverId, tenantId);

    const result = await client.query(config.query, config.parameters || []);

    logger.info('✅ [PostgreSQL Execute Query] Query executed successfully', {
      rowCount: result.rowCount,
      query: config.query.substring(0, 100)
    });

    return {
      rows: result.rows,
      rowCount: result.rowCount || 0
    };

  } catch (error) {
    logger.error('❌ [PostgreSQL Execute Query] Failed', {
      error: error instanceof Error ? error.message : String(error),
      serverId,
      tenantId
    });
    throw error;
  } finally {
    if (client) {
      await client.end();
    }
  }
}

export async function executePostgreSQLRawSQL(params: {
  serverId: string;
  tenantId: string;
  config: {
    sql: string;
    parameters?: any[];
  };
}): Promise<{ result: any; affectedRows: number }> {
  const { serverId, tenantId, config } = params;
  let client: pg.Client | null = null;

  try {
    client = await getPostgreSQLClient(serverId, tenantId);

    const result = await client.query(config.sql, config.parameters || []);

    logger.info('✅ [PostgreSQL Execute Raw SQL] SQL executed successfully', {
      affectedRows: result.rowCount || 0
    });

    return {
      result: result.rows,
      affectedRows: result.rowCount || 0
    };

  } catch (error) {
    logger.error('❌ [PostgreSQL Execute Raw SQL] Failed', {
      error: error instanceof Error ? error.message : String(error),
      serverId,
      tenantId
    });
    throw error;
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// ==================== DATA MANIPULATION EXECUTORS ====================

export async function executePostgreSQLInsertRow(params: {
  serverId: string;
  tenantId: string;
  config: {
    table: string;
    data: Record<string, any>;
    returning?: string[];
  };
}): Promise<{ insertedId: any; insertedRow: any }> {
  const { serverId, tenantId, config } = params;
  let client: pg.Client | null = null;

  try {
    client = await getPostgreSQLClient(serverId, tenantId);

    const columns = Object.keys(config.data);
    const values = Object.values(config.data);
    const placeholders = values.map((_, i) => `$${i + 1}`);

    const returningClause = config.returning ? `RETURNING ${config.returning.join(', ')}` : 'RETURNING *';
    const sql = `INSERT INTO ${config.table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) ${returningClause}`;

    const result = await client.query(sql, values);

    logger.info('✅ [PostgreSQL Insert Row] Row inserted successfully', {
      table: config.table,
      insertedId: result.rows[0]?.id
    });

    return {
      insertedId: result.rows[0]?.id,
      insertedRow: result.rows[0]
    };

  } catch (error) {
    logger.error('❌ [PostgreSQL Insert Row] Failed', {
      error: error instanceof Error ? error.message : String(error),
      serverId,
      tenantId
    });
    throw error;
  } finally {
    if (client) {
      await client.end();
    }
  }
}

export async function executePostgreSQLUpdateRow(params: {
  serverId: string;
  tenantId: string;
  config: {
    table: string;
    where: Record<string, any>;
    data: Record<string, any>;
    returning?: string[];
  };
}): Promise<{ updatedCount: number; updatedRows: any[] }> {
  const { serverId, tenantId, config } = params;
  let client: pg.Client | null = null;

  try {
    client = await getPostgreSQLClient(serverId, tenantId);

    const setClauses = Object.keys(config.data).map((key, i) => `${key} = $${i + 1}`);
    const whereKeys = Object.keys(config.where);
    const whereClauses = whereKeys.map((key, i) => `${key} = $${Object.keys(config.data).length + i + 1}`);
    
    const values = [...Object.values(config.data), ...Object.values(config.where)];

    const returningClause = config.returning ? `RETURNING ${config.returning.join(', ')}` : 'RETURNING *';
    const sql = `UPDATE ${config.table} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')} ${returningClause}`;

    const result = await client.query(sql, values);

    logger.info('✅ [PostgreSQL Update Row] Row updated successfully', {
      table: config.table,
      updatedCount: result.rowCount || 0
    });

    return {
      updatedCount: result.rowCount || 0,
      updatedRows: result.rows
    };

  } catch (error) {
    logger.error('❌ [PostgreSQL Update Row] Failed', {
      error: error instanceof Error ? error.message : String(error),
      serverId,
      tenantId
    });
    throw error;
  } finally {
    if (client) {
      await client.end();
    }
  }
}

export async function executePostgreSQLDeleteRow(params: {
  serverId: string;
  tenantId: string;
  config: {
    table: string;
    where: Record<string, any>;
    returning?: string[];
  };
}): Promise<{ deletedCount: number; deletedRows: any[] }> {
  const { serverId, tenantId, config } = params;
  let client: pg.Client | null = null;

  try {
    client = await getPostgreSQLClient(serverId, tenantId);

    const whereKeys = Object.keys(config.where);
    const whereClauses = whereKeys.map((key, i) => `${key} = $${i + 1}`);
    const values = Object.values(config.where);

    const returningClause = config.returning ? `RETURNING ${config.returning.join(', ')}` : 'RETURNING *';
    const sql = `DELETE FROM ${config.table} WHERE ${whereClauses.join(' AND ')} ${returningClause}`;

    const result = await client.query(sql, values);

    logger.info('✅ [PostgreSQL Delete Row] Row deleted successfully', {
      table: config.table,
      deletedCount: result.rowCount || 0
    });

    return {
      deletedCount: result.rowCount || 0,
      deletedRows: result.rows
    };

  } catch (error) {
    logger.error('❌ [PostgreSQL Delete Row] Failed', {
      error: error instanceof Error ? error.message : String(error),
      serverId,
      tenantId
    });
    throw error;
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// ==================== TRANSACTION EXECUTORS ====================

const activeTransactions = new Map<string, pg.Client>();

export async function executePostgreSQLBeginTransaction(params: {
  serverId: string;
  tenantId: string;
  config: {
    isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
  };
}): Promise<{ transactionId: string }> {
  const { serverId, tenantId, config } = params;

  try {
    const client = await getPostgreSQLClient(serverId, tenantId);

    const isolationLevel = config.isolationLevel || 'READ COMMITTED';
    await client.query(`BEGIN TRANSACTION ISOLATION LEVEL ${isolationLevel}`);

    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    activeTransactions.set(transactionId, client);

    logger.info('✅ [PostgreSQL Begin Transaction] Transaction started', {
      transactionId,
      isolationLevel
    });

    return { transactionId };

  } catch (error) {
    logger.error('❌ [PostgreSQL Begin Transaction] Failed', {
      error: error instanceof Error ? error.message : String(error),
      serverId,
      tenantId
    });
    throw error;
  }
}

export async function executePostgreSQLCommitTransaction(params: {
  serverId: string;
  tenantId: string;
  config: {
    transactionId: string;
  };
}): Promise<{ success: boolean }> {
  const { config } = params;

  try {
    const client = activeTransactions.get(config.transactionId);
    if (!client) {
      throw new Error(`Transaction ${config.transactionId} not found or already closed`);
    }

    await client.query('COMMIT');
    await client.end();
    activeTransactions.delete(config.transactionId);

    logger.info('✅ [PostgreSQL Commit Transaction] Transaction committed', {
      transactionId: config.transactionId
    });

    return { success: true };

  } catch (error) {
    logger.error('❌ [PostgreSQL Commit Transaction] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export async function executePostgreSQLRollbackTransaction(params: {
  serverId: string;
  tenantId: string;
  config: {
    transactionId: string;
  };
}): Promise<{ success: boolean }> {
  const { config } = params;

  try {
    const client = activeTransactions.get(config.transactionId);
    if (!client) {
      throw new Error(`Transaction ${config.transactionId} not found or already closed`);
    }

    await client.query('ROLLBACK');
    await client.end();
    activeTransactions.delete(config.transactionId);

    logger.info('✅ [PostgreSQL Rollback Transaction] Transaction rolled back', {
      transactionId: config.transactionId
    });

    return { success: true };

  } catch (error) {
    logger.error('❌ [PostgreSQL Rollback Transaction] Failed', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

// ==================== SCHEMA MANAGEMENT EXECUTORS ====================

export async function executePostgreSQLCreateTable(params: {
  serverId: string;
  tenantId: string;
  config: {
    tableName: string;
    columns: Array<{
      name: string;
      type: string;
      constraints?: string[];
    }>;
    ifNotExists?: boolean;
  };
}): Promise<{ success: boolean; tableName: string }> {
  const { serverId, tenantId, config } = params;
  let client: pg.Client | null = null;

  try {
    client = await getPostgreSQLClient(serverId, tenantId);

    const columnDefinitions = config.columns.map(col => {
      const constraints = col.constraints ? ` ${col.constraints.join(' ')}` : '';
      return `${col.name} ${col.type}${constraints}`;
    });

    const ifNotExistsClause = config.ifNotExists ? 'IF NOT EXISTS' : '';
    const sql = `CREATE TABLE ${ifNotExistsClause} ${config.tableName} (${columnDefinitions.join(', ')})`;

    await client.query(sql);

    logger.info('✅ [PostgreSQL Create Table] Table created successfully', {
      tableName: config.tableName
    });

    return {
      success: true,
      tableName: config.tableName
    };

  } catch (error) {
    logger.error('❌ [PostgreSQL Create Table] Failed', {
      error: error instanceof Error ? error.message : String(error),
      serverId,
      tenantId
    });
    throw error;
  } finally {
    if (client) {
      await client.end();
    }
  }
}
