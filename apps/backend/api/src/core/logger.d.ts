import winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';
declare const contextStorage: AsyncLocalStorage<{
    correlationId: string;
    tenantId?: string;
    userId?: string;
    userEmail?: string;
}>;
declare const logger: winston.Logger;
export interface LogContext {
    component: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    duration?: number;
    metadata?: Record<string, any>;
}
export declare const structuredLogger: {
    info: (message: string, context: LogContext) => winston.Logger;
    warn: (message: string, context: LogContext) => winston.Logger;
    error: (message: string, context: LogContext & {
        error?: Error;
    }) => winston.Logger;
    debug: (message: string, context: LogContext) => winston.Logger;
    userAction: (action: string, context: Omit<LogContext, "component"> & {
        userId?: string;
    }) => void;
    apiRequest: (method: string, path: string, context: Omit<LogContext, "component"> & {
        statusCode?: number;
        duration?: number;
        ip?: string;
    }) => void;
    databaseQuery: (query: string, context: Omit<LogContext, "component"> & {
        duration?: number;
        rowCount?: number;
    }) => void;
    security: (event: string, context: Omit<LogContext, "component"> & {
        severity: "low" | "medium" | "high" | "critical";
        ip?: string;
        userAgent?: string;
    }) => void;
    audit: (action: string, context: Omit<LogContext, "component"> & {
        beforeData?: any;
        afterData?: any;
        changes?: Record<string, any>;
    }) => void;
};
export declare const setLogContext: (context: Parameters<typeof contextStorage.run>[0]) => (callback: (...args: any[]) => unknown, ...args: any[]) => unknown;
export declare const getLogContext: () => {
    correlationId: string;
    tenantId?: string;
    userId?: string;
    userEmail?: string;
} | undefined;
export declare const correlationMiddleware: (req: any, res: any, next: any) => void;
export default logger;
export { logger };
//# sourceMappingURL=logger.d.ts.map