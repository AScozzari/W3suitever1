/**
 * Workflow Data Sources API Routes
 * 
 * Provides REST endpoints for database operations within workflows
 * with strict RLS enforcement and w3suite schema restriction.
 * 
 * Security:
 * - All queries execute with tenant_id context via RLS
 * - Only w3suite schema allowed
 * - Prepared statements for all operations
 * - Read-only introspection for metadata
 */

import express from 'express';
import { z } from 'zod';
import { db, setTenantContext } from '../core/db';
import { tenantMiddleware, rbacMiddleware, requirePermission } from '../middleware/tenant';
import { correlationMiddleware, logger } from '../core/logger';
import { sql } from 'drizzle-orm';

const router = express.Router();

// Apply middleware to all routes
router.use(correlationMiddleware);
router.use(tenantMiddleware);

// ==================== VALIDATION SCHEMAS ====================

const getMetadataSchema = z.object({
  schema: z.literal('w3suite').default('w3suite'),
});

const selectOperationSchema = z.object({
  operation: z.literal('SELECT'),
  table: z.string().min(1),
  columns: z.array(z.string()).optional(),
  filters: z.array(z.object({
    column: z.string(),
    operator: z.enum(['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN', 'IS NULL', 'IS NOT NULL']),
    value: z.any().optional(),
  })).optional(),
  limit: z.number().int().positive().max(1000).default(100),
});

const insertOperationSchema = z.object({
  operation: z.literal('INSERT'),
  table: z.string().min(1),
  values: z.record(z.any()),
  returnId: z.boolean().default(true),
});

const updateOperationSchema = z.object({
  operation: z.literal('UPDATE'),
  table: z.string().min(1),
  values: z.record(z.any()),
  filters: z.array(z.object({
    column: z.string(),
    operator: z.enum(['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN']),
    value: z.any(),
  })).min(1),
});

const deleteOperationSchema = z.object({
  operation: z.literal('DELETE'),
  table: z.string().min(1),
  filters: z.array(z.object({
    column: z.string(),
    operator: z.enum(['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN']),
    value: z.any(),
  })).min(1),
  requireConfirmation: z.boolean().default(true),
});

// EXECUTE_QUERY schema removed - operation disabled for MVP (see replit.md)
// const executeQuerySchema = z.object({
//   operation: z.literal('EXECUTE_QUERY'),
//   query: z.string().min(1),
//   params: z.array(z.any()).optional(),
//   readOnly: z.boolean().default(false),
// });
const dbOperationSchema = z.discriminatedUnion('operation', [
  selectOperationSchema,
  insertOperationSchema,
  updateOperationSchema,
  deleteOperationSchema,
  // executeQuerySchema, // Disabled - will re-enable with pg-query-parser in future
]);

// ==================== METADATA API ====================

/**
 * GET /api/workflows/data-sources/metadata
 * Get database schema metadata for w3suite only
 * Returns tables and columns for dropdown population
 * 🔐 RBAC: Requires workflow.execute permission
 */
router.get('/metadata', rbacMiddleware, requirePermission('workflow.execute'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      });
    }

    // Set tenant context for RLS
    await setTenantContext(tenantId);

    // Query information_schema to get tables and columns from w3suite schema only
    const tablesResult = await db.execute<{
      table_name: string;
      table_type: string;
    }>(sql`
      SELECT 
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_schema = 'w3suite'
        AND table_type IN ('BASE TABLE', 'VIEW')
      ORDER BY table_name
    `);

    const tables = tablesResult.rows;

    // For each table, get columns
    const metadata = await Promise.all(
      tables.map(async (table) => {
        const columnsResult = await db.execute<{
          column_name: string;
          data_type: string;
          is_nullable: string;
          column_default: string | null;
        }>(sql`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_schema = 'w3suite'
            AND table_name = ${table.table_name}
          ORDER BY ordinal_position
        `);

        return {
          table: table.table_name,
          tableType: table.table_type,
          columns: columnsResult.rows.map(col => ({
            name: col.column_name,
            type: col.data_type,
            nullable: col.is_nullable === 'YES',
            default: col.column_default,
          })),
        };
      })
    );

    logger.info('[WORKFLOW_DATA_SOURCES] Metadata fetched', {
      tenantId,
      tableCount: metadata.length,
    });

    return res.json({
      success: true,
      data: {
        schema: 'w3suite',
        tables: metadata,
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[WORKFLOW_DATA_SOURCES] Metadata fetch failed', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch database metadata',
      timestamp: new Date().toISOString()
    });
  }
});

// ==================== EXECUTE DATABASE OPERATION ====================

/**
 * POST /api/workflows/execute-db-operation
 * Execute database operation with RLS enforcement
 * 
 * Supported operations: SELECT, INSERT, UPDATE, DELETE (w3suite schema only)
 * ⚠️  EXECUTE_QUERY is disabled - returns 400 (see replit.md for security rationale)
 * 
 * 🔐 RBAC: Requires workflow.execute permission
 * 🔒 Security: All operations enforce tenant isolation via RLS
 */
router.post('/execute-db-operation', rbacMiddleware, requirePermission('workflow.execute'), async (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tenant context',
        timestamp: new Date().toISOString()
      });
    }

    // Validate request body
    const validationResult = dbOperationSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid operation parameters',
        details: validationResult.error.errors,
        timestamp: new Date().toISOString()
      });
    }

    const operation = validationResult.data;

    // Set tenant context for RLS
    await setTenantContext(tenantId);

    let result;

    switch (operation.operation) {
      case 'SELECT':
        result = await executeSelect(operation, tenantId);
        break;
      case 'INSERT':
        result = await executeInsert(operation, tenantId);
        break;
      case 'UPDATE':
        result = await executeUpdate(operation, tenantId);
        break;
      case 'DELETE':
        result = await executeDelete(operation, tenantId);
        break;
      default:
        throw new Error('Unsupported operation');
    }

    logger.info('[WORKFLOW_DATA_SOURCES] Operation executed', {
      tenantId,
      operation: operation.operation,
      rowCount: result.rowCount,
    });

    return res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('[WORKFLOW_DATA_SOURCES] Operation failed', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      error: error.message || 'Database operation failed',
      timestamp: new Date().toISOString()
    });
  }
});

// ==================== SECURITY VALIDATORS ====================

/**
 * Validate table name (no schema qualifier, no special characters)
 * Prevents SQL injection and schema escaping
 */
function validateTableName(table: string): void {
  // Block schema qualifiers (e.g., "public.users")
  if (table.includes('.')) {
    throw new Error('Table name cannot contain schema qualifier');
  }
  
  // Block special characters that could be used for SQL injection
  if (!/^[a-zA-Z0-9_]+$/.test(table)) {
    throw new Error('Table name contains invalid characters');
  }
  
  // Block SQL keywords
  const sqlKeywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE'];
  if (sqlKeywords.some(kw => table.toUpperCase() === kw)) {
    throw new Error('Table name cannot be a SQL keyword');
  }
}

/**
 * Validate column names exist in table schema
 * Prevents column injection attacks
 */
async function validateColumns(table: string, columns: string[]): Promise<void> {
  // Get table metadata from information_schema
  const columnsResult = await db.execute<{ column_name: string }>(sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'w3suite'
      AND table_name = ${table}
  `);
  
  const validColumns = new Set(columnsResult.rows.map(r => r.column_name));
  
  // Check each column exists
  for (const col of columns) {
    if (!validColumns.has(col)) {
      throw new Error(`Column '${col}' does not exist in table '${table}'`);
    }
  }
}

/**
 * Sanitize SQL identifier (table/column name)
 * Returns double-quoted identifier for safety
 */
function sanitizeIdentifier(identifier: string): string {
  // Validate identifier format
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}`);
  }
  
  // Return double-quoted identifier
  return `"${identifier}"`;
}

// ==================== OPERATION EXECUTORS ====================

async function executeSelect(
  operation: z.infer<typeof selectOperationSchema>,
  tenantId: string
) {
  const { table, columns, filters, limit } = operation;

  // 🔒 SECURITY: Validate table name (no schema qualifier, no special chars)
  validateTableName(table);
  
  // 🔒 SECURITY: Validate columns exist in table (if specified)
  if (columns && columns.length > 0) {
    await validateColumns(table, columns);
  }

  // Build SELECT query with explicit w3suite schema prefix
  const selectCols = columns && columns.length > 0 ? columns.map(sanitizeIdentifier).join(', ') : '*';
  let query = `SELECT ${selectCols} FROM w3suite.${sanitizeIdentifier(table)}`;

  const params: any[] = [];
  let paramIndex = 1;

  // Add WHERE clauses
  if (filters && filters.length > 0) {
    const whereClauses = filters.map(filter => {
      if (filter.operator === 'IS NULL' || filter.operator === 'IS NOT NULL') {
        return `${sanitizeIdentifier(filter.column)} ${filter.operator}`;
      }
      if (filter.operator === 'IN') {
        const values = Array.isArray(filter.value) ? filter.value : [filter.value];
        const placeholders = values.map(() => `$${paramIndex++}`).join(', ');
        params.push(...values);
        return `${sanitizeIdentifier(filter.column)} IN (${placeholders})`;
      }
      params.push(filter.value);
      return `${sanitizeIdentifier(filter.column)} ${filter.operator} $${paramIndex++}`;
    });
    query += ` WHERE ${whereClauses.join(' AND ')}`;
  }

  query += ` LIMIT ${limit}`;

  const result = await db.execute(sql.raw(query, params));

  return {
    data: result.rows,
    rowCount: result.rows.length,
    operation: 'SELECT'
  };
}

async function executeInsert(
  operation: z.infer<typeof insertOperationSchema>,
  tenantId: string
) {
  const { table, values, returnId } = operation;

  // 🔒 SECURITY: Validate table name
  validateTableName(table);
  
  // 🔒 SECURITY: Validate columns exist in table
  const columns = Object.keys(values);
  await validateColumns(table, columns);

  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const columnNames = columns.map(sanitizeIdentifier).join(', ');
  
  let query = `INSERT INTO w3suite.${sanitizeIdentifier(table)} (${columnNames}) VALUES (${placeholders})`;
  if (returnId) {
    query += ' RETURNING id';
  }

  const params = Object.values(values);
  const result = await db.execute(sql.raw(query, params));

  return {
    data: result.rows,
    rowCount: result.rowCount || 1,
    operation: 'INSERT'
  };
}

async function executeUpdate(
  operation: z.infer<typeof updateOperationSchema>,
  tenantId: string
) {
  const { table, values, filters } = operation;

  // 🔒 SECURITY: Validate table name
  validateTableName(table);
  
  // 🔒 SECURITY: Validate columns
  const valueColumns = Object.keys(values);
  const filterColumns = filters.map(f => f.column);
  await validateColumns(table, [...valueColumns, ...filterColumns]);

  const setClauses = Object.keys(values).map((col, i) => `${sanitizeIdentifier(col)} = $${i + 1}`).join(', ');
  let query = `UPDATE w3suite.${sanitizeIdentifier(table)} SET ${setClauses}`;

  const params: any[] = Object.values(values);
  let paramIndex = params.length + 1;

  // Add WHERE clauses (mandatory)
  const whereClauses = filters.map(filter => {
    if (filter.operator === 'IN') {
      const vals = Array.isArray(filter.value) ? filter.value : [filter.value];
      const placeholders = vals.map(() => `$${paramIndex++}`).join(', ');
      params.push(...vals);
      return `${sanitizeIdentifier(filter.column)} IN (${placeholders})`;
    }
    params.push(filter.value);
    return `${sanitizeIdentifier(filter.column)} ${filter.operator} $${paramIndex++}`;
  });
  query += ` WHERE ${whereClauses.join(' AND ')}`;

  const result = await db.execute(sql.raw(query, params));

  return {
    data: [],
    rowCount: result.rowCount || 0,
    operation: 'UPDATE'
  };
}

async function executeDelete(
  operation: z.infer<typeof deleteOperationSchema>,
  tenantId: string
) {
  const { table, filters } = operation;

  // 🔒 SECURITY: Validate table name
  validateTableName(table);
  
  // 🔒 SECURITY: Validate filter columns
  const filterColumns = filters.map(f => f.column);
  await validateColumns(table, filterColumns);

  let query = `DELETE FROM w3suite.${sanitizeIdentifier(table)}`;

  const params: any[] = [];
  let paramIndex = 1;

  // Add WHERE clauses (mandatory for safety)
  const whereClauses = filters.map(filter => {
    if (filter.operator === 'IN') {
      const vals = Array.isArray(filter.value) ? filter.value : [filter.value];
      const placeholders = vals.map(() => `$${paramIndex++}`).join(', ');
      params.push(...vals);
      return `${sanitizeIdentifier(filter.column)} IN (${placeholders})`;
    }
    params.push(filter.value);
    return `${sanitizeIdentifier(filter.column)} ${filter.operator} $${paramIndex++}`;
  });
  query += ` WHERE ${whereClauses.join(' AND ')}`;

  const result = await db.execute(sql.raw(query, params));

  return {
    data: [],
    rowCount: result.rowCount || 0,
    operation: 'DELETE'
  };
}

// ==================== EXECUTE_QUERY - DISABLED FOR MVP ====================
// This function has been removed due to security vulnerabilities:
// - search_path manipulation via set_config() in CTEs
// - Schema escaping through quoted identifiers
// - False positives on column aliases
// 
// To re-enable in future: implement pg-query-parser for AST-based validation
// See replit.md "Known Issues & Future Work" section for details

export const workflowDataSourceRoutes = router;
