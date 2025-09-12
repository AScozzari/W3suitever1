// Audit Logging Middleware for W3 Suite
import type { Request, Response, NextFunction } from 'express';

export interface AuditLog {
  timestamp: Date;
  userId?: string;
  userEmail?: string;
  tenantId?: string;
  action: string;
  resource?: string;
  method: string;
  path: string;
  statusCode?: number;
  ip: string;
  userAgent?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

// In production, this would write to a database table
const auditLogs: AuditLog[] = [];

// Critical operations that must be audited
const CRITICAL_OPERATIONS = [
  '/api/auth/login',
  '/api/auth/logout',
  '/oauth2/token',
  '/oauth2/revoke',
  '/api/users',
  '/api/roles',
  '/api/permissions',
  '/api/tenants',
  '/api/stores',
];

export function createAuditMiddleware() {
  return (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalSend = res.send;
    
    // Determine if this is a critical operation
    const isCritical = CRITICAL_OPERATIONS.some(path => 
      req.path.startsWith(path) || req.originalUrl.startsWith(path)
    );
    
    // Always audit critical operations and non-GET requests
    const shouldAudit = isCritical || (req.method !== 'GET' && req.path.startsWith('/api/'));
    
    if (!shouldAudit) {
      return next();
    }
    
    // Capture response for audit
    res.send = function(data: any) {
      res.send = originalSend;
      
      const auditEntry: AuditLog = {
        timestamp: new Date(),
        userId: req.user?.id,
        userEmail: req.user?.email,
        tenantId: req.user?.tenantId,
        action: `${req.method} ${req.path}`,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'],
        duration: Date.now() - startTime,
        metadata: {
          query: req.query,
          body: req.method !== 'GET' ? sanitizeBody(req.body) : undefined
        }
      };
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[AUDIT] ${auditEntry.action} - User: ${auditEntry.userEmail || 'anonymous'} - Status: ${auditEntry.statusCode} - ${auditEntry.duration}ms`);
      }
      
      // Store audit log
      auditLogs.push(auditEntry);
      
      // In production, write to database
      if (process.env.NODE_ENV === 'production') {
        // Write audit entry to logs table when implemented
        // await storage.createAuditLog(auditEntry);
      }
      
      // Keep only last 1000 entries in memory
      if (auditLogs.length > 1000) {
        auditLogs.shift();
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
}

// Sanitize sensitive data from request body
function sanitizeBody(body: any): any {
  if (!body) return undefined;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'apiKey'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

// Get recent audit logs (for admin dashboard)
export function getAuditLogs(limit = 100): AuditLog[] {
  return auditLogs.slice(-limit);
}

// Clear audit logs (for testing)
export function clearAuditLogs(): void {
  auditLogs.length = 0;
}