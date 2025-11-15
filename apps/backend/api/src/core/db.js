"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTenantTransaction = exports.withTenantContext = exports.getCurrentTenant = exports.setTenantContext = exports.db = exports.pool = void 0;
const pg_1 = require("pg");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const publicSharedSchema = __importStar(require("../db/schema/public"));
const w3suiteSchema = __importStar(require("../db/schema/w3suite"));
const brandInterfaceSchema = __importStar(require("../db/schema/brand-interface"));
// Merge degli schemi per supportare multi-schema database
const schema = {
    ...publicSharedSchema, // Shared reference data
    ...w3suiteSchema, // W3 Suite tenant-specific data
    ...brandInterfaceSchema // Brand Interface system
};
// Standard TCP connection - no WebSocket needed
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}
exports.pool = new pg_1.Pool({
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
exports.pool.on('error', (err) => {
    console.error('❌ Drizzle pool error:', err.message);
    // Type assertion for PostgreSQL/Node.js errors that have a code property
    const pgError = err;
    if (pgError.code === '57P01' || pgError.code === 'ECONNRESET' || pgError.code === 'ETIMEDOUT') {
        console.log('🔄 Drizzle connection will be retried automatically');
    }
});
exports.db = (0, node_postgres_1.drizzle)(exports.pool, { schema });
console.log('✅ Drizzle ORM initialized with TCP connection');
// ============================================================================
// MULTITENANT DATABASE CONTEXT MANAGEMENT
// ============================================================================
/**
 * Imposta il tenant corrente nella sessione PostgreSQL
 * Necessario per Row Level Security (RLS)
 */
const setTenantContext = async (tenantId) => {
    // Use raw SQL to avoid Drizzle template literal issues with set_config
    await exports.db.execute(drizzle_orm_1.sql.raw(`SELECT set_config('app.current_tenant_id', '${tenantId}', false)`));
};
exports.setTenantContext = setTenantContext;
/**
 * Ottiene il tenant corrente dalla sessione PostgreSQL
 */
const getCurrentTenant = async () => {
    try {
        const result = await exports.db.execute((0, drizzle_orm_1.sql) `SELECT current_setting('app.current_tenant_id', true) as tenant_id`);
        return result.rows[0]?.tenant_id || null;
    }
    catch (error) {
        return null;
    }
};
exports.getCurrentTenant = getCurrentTenant;
/**
 * Wrapper per eseguire operazioni nel contesto di un tenant specifico
 */
const withTenantContext = async (tenantId, operation) => {
    await (0, exports.setTenantContext)(tenantId);
    try {
        return await operation();
    }
    finally {
        // Reset context dopo l'operazione
        await exports.db.execute(drizzle_orm_1.sql.raw(`SELECT set_config('app.current_tenant_id', NULL, false)`));
    }
};
exports.withTenantContext = withTenantContext;
/**
 * Wrapper per eseguire operazioni DB nel contesto di un tenant specifico
 * Usa una singola transazione per garantire che RLS funzioni correttamente
 * Risolve il problema di connessioni multiple dal pool che non hanno il tenant context
 */
const withTenantTransaction = async (tenantId, operation) => {
    return await exports.db.transaction(async (tx) => {
        // Imposta il tenant context sulla stessa connessione della transazione
        await tx.execute(drizzle_orm_1.sql.raw(`SELECT set_config('app.current_tenant_id', '${tenantId}', false)`));
        // Esegui l'operazione con la transazione tenant-scoped
        return await operation(tx);
    });
};
exports.withTenantTransaction = withTenantTransaction;
