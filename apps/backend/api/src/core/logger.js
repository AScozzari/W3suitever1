"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.correlationMiddleware = exports.getLogContext = exports.setLogContext = exports.structuredLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const async_hooks_1 = require("async_hooks");
// Context storage per correlation IDs e tenant context
const contextStorage = new async_hooks_1.AsyncLocalStorage();
// Custom format per structured logging
const structuredFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.printf(({ timestamp, level, message, component, ...meta }) => {
    const context = contextStorage.getStore();
    const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        message,
        component,
        correlationId: context?.correlationId,
        tenantId: context?.tenantId,
        userId: context?.userId,
        userEmail: context?.userEmail,
        ...meta
    };
    // Rimuovi campi undefined
    Object.keys(logEntry).forEach(key => {
        if (logEntry[key] === undefined) {
            delete logEntry[key];
        }
    });
    return JSON.stringify(logEntry);
}));
// Configurazione logger Winston
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: structuredFormat,
    transports: [
        // Console per development
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
        }),
        // File per production (opzionale)
        ...(process.env.NODE_ENV === 'production' ? [
            new winston_1.default.transports.File({
                filename: '/tmp/logs/error.log',
                level: 'error'
            }),
            new winston_1.default.transports.File({
                filename: '/tmp/logs/combined.log'
            })
        ] : [])
    ]
});
exports.logger = logger;
// Structured logger methods
exports.structuredLogger = {
    // Metodi standard
    info: (message, context) => logger.info(message, context),
    warn: (message, context) => logger.warn(message, context),
    error: (message, context) => logger.error(message, context),
    debug: (message, context) => logger.debug(message, context),
    // Metodi specifici per business events
    userAction: (action, context) => {
        logger.info(`User action: ${action}`, {
            component: 'user-action',
            action,
            ...context
        });
    },
    apiRequest: (method, path, context) => {
        logger.info(`API ${method} ${path}`, {
            component: 'api-request',
            action: `${method} ${path}`,
            ...context
        });
    },
    databaseQuery: (query, context) => {
        logger.debug(`Database query executed`, {
            component: 'database',
            action: 'query',
            query: query.slice(0, 100), // Tronca query lunghe
            ...context
        });
    },
    security: (event, context) => {
        logger.warn(`Security event: ${event}`, {
            component: 'security',
            action: event,
            ...context
        });
    },
    audit: (action, context) => {
        logger.info(`Audit: ${action}`, {
            component: 'audit',
            action,
            ...context
        });
    }
};
// Context management functions
const setLogContext = (context) => {
    return contextStorage.run.bind(contextStorage, context);
};
exports.setLogContext = setLogContext;
const getLogContext = () => {
    return contextStorage.getStore();
};
exports.getLogContext = getLogContext;
// Middleware per generare correlation ID
const correlationMiddleware = (req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] ||
        `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    // Set correlation ID in response header
    res.setHeader('X-Correlation-ID', correlationId);
    // Run request in context
    contextStorage.run({ correlationId, tenantId, userId, userEmail }, () => next());
};
exports.correlationMiddleware = correlationMiddleware;
// Export default logger for backward compatibility
exports.default = logger;
