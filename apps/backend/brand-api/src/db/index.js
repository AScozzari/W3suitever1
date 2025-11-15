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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inMemoryBrandData = exports.isDbDisabled = exports.pool = exports.db = void 0;
const node_postgres_1 = require("drizzle-orm/node-postgres");
const pg_1 = require("pg");
const brandSchema = __importStar(require("./schema/brand-interface.js"));
// Check if database is disabled for in-memory mode
const isDbDisabled = process.env.DB_DISABLED === '1' || process.env.USE_INMEMORY_DB === 'true' || !process.env.DATABASE_URL;
exports.isDbDisabled = isDbDisabled;
// In-memory storage fallback
let inMemoryBrandData = new Map();
exports.inMemoryBrandData = inMemoryBrandData;
let db;
let pool = null;
exports.pool = pool;
if (isDbDisabled) {
    console.log('⚠️  Brand Database disabled - using in-memory storage');
    // Mock Drizzle client for in-memory mode
    exports.db = db = {
        select: () => ({ from: () => ({ where: () => [] }) }),
        insert: () => ({ values: () => ({ returning: () => [] }) }),
        update: () => ({ set: () => ({ where: () => ({ returning: () => [] }) }) }),
        delete: () => ({ where: () => ({ returning: () => [] }) })
    };
}
else {
    const databaseUrl = process.env.DATABASE_URL; // Safe because we checked above
    // Create connection pool with resilience settings
    exports.pool = pool = new pg_1.Pool({
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
    exports.db = db = (0, node_postgres_1.drizzle)(pool, { schema: brandSchema });
    console.log('✅ Brand Database connection initialized (TCP)');
}
// Export schema per uso esterno
__exportStar(require("./schema/brand-interface.js"), exports);
