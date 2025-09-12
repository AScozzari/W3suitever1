// Audit Logging Middleware for Brand Interface
import type { Request, Response, NextFunction } from 'express';

export interface BrandAuditLog {
  timestamp: Date;
  userId?: string;
  userEmail?: string;
  role?: string;
  commercialAreas?: string[];
  action: string;
  resource?: string;
  method: string;
  path: string;
  statusCode?: number;
  ip: string;
  userAgent?: string;
  duration?: number;
  context: 'brand-interface';
  metadata?: Record<string, any>;
}

// In production, this would write to brand_interface.audit_logs table
const brandAuditLogs: BrandAuditLog[] = [];

// Critical operations for Brand Interface
const BRAND_CRITICAL_OPERATIONS = [
  '/brand-api/auth/login',
  '/brand-api/auth/logout',
  '/brand-api/organizations',
  '/brand-api/campaigns',
  '/brand-api/deploy',
  '/brand-api/analytics',
];

export function createBrandAuditMiddleware() {
  return (req: Request & { user?: any, brandContext?: any }, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const originalSend = res.send;
    
    // Determine if this is a critical operation
    const isCritical = BRAND_CRITICAL_OPERATIONS.some(path => 
      req.path.startsWith(path) || req.originalUrl.startsWith(path)
    );
    
    // Always audit critical operations and all POST/PUT/DELETE
    const shouldAudit = isCritical || 
      (req.path.startsWith('/brand-api/') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method));
    
    if (!shouldAudit) {
      return next();
    }
    
    // Capture response for audit
    res.send = function(data: any) {
      res.send = originalSend;
      
      const auditEntry: BrandAuditLog = {
        timestamp: new Date(),
        userId: req.user?.id,
        userEmail: req.user?.email,
        role: req.user?.role,
        commercialAreas: req.user?.commercialAreas,
        action: `${req.method} ${req.path}`,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'],
        duration: Date.now() - startTime,
        context: 'brand-interface',
        metadata: {
          isCrossTenant: req.brandContext?.isCrossTenant,
          targetTenant: req.brandContext?.tenantId,
          query: req.query,
          body: req.method !== 'GET' ? sanitizeBody(req.body) : undefined
        }
      };
      
      // Enhanced logging for Brand Interface operations
      const logLevel = res.statusCode >= 400 ? '⚠️' : '✅';
      // Log audit entry in development only
      
      // Store audit log
      brandAuditLogs.push(auditEntry);
      
      // In production, write to brand_interface.audit_logs table
      if (process.env.NODE_ENV === 'production') {
        // Write audit entry to brand interface logs table when implemented
        // await brandStorage.createAuditLog(auditEntry);
      }
      
      // Keep only last 500 entries in memory (less than W3 Suite due to lower traffic)
      if (brandAuditLogs.length > 500) {
        brandAuditLogs.shift();
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
  const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'apiKey', 'jwt'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

// Get recent audit logs for Brand Interface admin
export function getBrandAuditLogs(limit = 50): BrandAuditLog[] {
  return brandAuditLogs.slice(-limit);
}

// Clear audit logs (for testing)
export function clearBrandAuditLogs(): void {
  brandAuditLogs.length = 0;
}