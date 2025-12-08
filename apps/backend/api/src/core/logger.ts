import winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';

// Context storage per correlation IDs e tenant context
const contextStorage = new AsyncLocalStorage<{
  correlationId: string;
  tenantId?: string;
  userId?: string;
  userEmail?: string;
}>();

// Custom format per structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, component, ...meta }) => {
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
      if (logEntry[key as keyof typeof logEntry] === undefined) {
        delete logEntry[key as keyof typeof logEntry];
      }
    });
    
    return JSON.stringify(logEntry);
  })
);

// Configurazione logger Winston
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: structuredFormat,
  transports: [
    // Console per development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // File per production (opzionale)
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({ 
        filename: '/tmp/logs/error.log', 
        level: 'error' 
      }),
      new winston.transports.File({ 
        filename: '/tmp/logs/combined.log' 
      })
    ] : [])
  ]
});

// Typed logger interface
export interface LogContext {
  component: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

// Structured logger methods
export const structuredLogger = {
  // Metodi standard
  info: (message: string, context: LogContext) => logger.info(message, context),
  warn: (message: string, context: LogContext) => logger.warn(message, context),
  error: (message: string, context: LogContext & { error?: Error }) => logger.error(message, context),
  debug: (message: string, context: LogContext) => logger.debug(message, context),
  
  // Metodi specifici per business events
  userAction: (action: string, context: Omit<LogContext, 'component'> & { userId?: string }) => {
    logger.info(`User action: ${action}`, { 
      component: 'user-action', 
      action,
      ...context 
    });
  },
  
  apiRequest: (method: string, path: string, context: Omit<LogContext, 'component'> & { 
    statusCode?: number;
    duration?: number;
    ip?: string;
  }) => {
    logger.info(`API ${method} ${path}`, { 
      component: 'api-request',
      action: `${method} ${path}`,
      ...context 
    });
  },
  
  databaseQuery: (query: string, context: Omit<LogContext, 'component'> & { 
    duration?: number;
    rowCount?: number;
  }) => {
    logger.debug(`Database query executed`, { 
      component: 'database',
      action: 'query',
      query: query.slice(0, 100), // Tronca query lunghe
      ...context 
    });
  },
  
  security: (event: string, context: Omit<LogContext, 'component'> & { 
    severity: 'low' | 'medium' | 'high' | 'critical';
    ip?: string;
    userAgent?: string;
  }) => {
    logger.warn(`Security event: ${event}`, { 
      component: 'security',
      action: event,
      ...context 
    });
  },
  
  audit: (action: string, context: Omit<LogContext, 'component'> & {
    beforeData?: any;
    afterData?: any;
    changes?: Record<string, any>;
  }) => {
    logger.info(`Audit: ${action}`, { 
      component: 'audit',
      action,
      ...context 
    });
  }
};

// Context management functions
export const setLogContext = (context: Parameters<typeof contextStorage.run>[0]) => {
  return contextStorage.run.bind(contextStorage, context);
};

export const getLogContext = () => {
  return contextStorage.getStore();
};

// Middleware per generare correlation ID
export const correlationMiddleware = (req: any, res: any, next: any) => {
  const correlationId = req.headers['x-correlation-id'] || 
                        `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
  const userId = req.user?.id;
  const userEmail = req.user?.email;
  
  // Set correlation ID in response header
  res.setHeader('X-Correlation-ID', correlationId);
  
  // Run request in context
  contextStorage.run(
    { correlationId, tenantId, userId, userEmail },
    () => next()
  );
};

// Export default logger for backward compatibility
export default logger;
export { logger };