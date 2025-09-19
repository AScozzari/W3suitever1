import { Request, Response, NextFunction } from 'express';
import { db } from '../core/db';
import { tenants, userAssignments, roles, rolePerms, userExtraPerms } from '../db/schema/w3suite';
import { eq, and, or, sql } from 'drizzle-orm';
import { rbacStorage } from '../core/rbac-storage';

declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
        name: string;
        slug: string;
      };
      userPermissions?: string[];
    }
  }
}

// Add loop prevention mechanism
let tenantMiddlewareCallCount = 0;
let lastCallTime = 0;

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // CRITICAL FIX: Completely exclude non-API requests to prevent infinite loops
    // This middleware should only process /api routes
    if (!req.path.startsWith('/api')) {
      console.log('[TENANT-SKIP] Skipping tenant middleware for non-API path:', req.path);
      return next();
    }
    
    // Prevent infinite loop - check if middleware is being called too frequently
    const now = Date.now();
    if (now - lastCallTime < 10) { // Less than 10ms between calls
      tenantMiddlewareCallCount++;
      if (tenantMiddlewareCallCount > 100) {
        console.error('[TENANT-ERROR] Infinite loop detected in tenant middleware - blocking further execution');
        return res.status(500).json({ error: 'Server configuration error - infinite loop detected' });
      }
    } else {
      tenantMiddlewareCallCount = 0; // Reset counter if enough time has passed
    }
    lastCallTime = now;

    // SECURITY: Remove development bypass - all environments must use real database
    // No mock tenant bypasses allowed - this was a security vulnerability
    
    // PRODUCTION LOGIC - Real database queries
    // In produzione, il tenant verrebbe determinato da:
    // 1. Subdomain (e.g., demo.w3suite.com)
    // 2. Header X-Tenant-Id
    // 3. User's tenant association
    
    const tenantSlug = req.headers['x-tenant-slug'] as string || 'w3-demo';
    
    // Otteniamo il tenant dal database usando Drizzle ORM
    const tenantResult = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        status: tenants.status
      })
      .from(tenants)
      .where(and(
        eq(tenants.slug, tenantSlug),
        eq(tenants.status, 'active')
      ))
      .limit(1);
    
    if (tenantResult.length === 0) {
      return res.status(404).json({ error: 'Tenant not found or inactive' });
    }
    
    const tenant = tenantResult[0];
    req.tenant = {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug || ''
    };
    
    // Impostiamo il tenant_id per RLS (Row Level Security)
    try {
      if (tenant.id) {
        await db.execute(sql.raw(`SET app.tenant_id = '${tenant.id}'`));
      }
    } catch (error) {
      console.log('RLS set tenant_id:', tenant.id);
      // RLS configuration might not be set up yet, continue without error
    }
    
    next();
  } catch (error) {
    console.error('CRITICAL: Tenant middleware database error:', error);
    
    // SECURITY FIX: Fail fast in production - no fallback tenant allowed
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 PRODUCTION SECURITY: Database tenant resolution failed - rejecting request');
      return res.status(503).json({ 
        error: 'SECURITY_ERROR',
        message: 'Tenant resolution failed - service unavailable for security',
        details: 'Production does not allow tenant fallbacks'
      });
    }
    
    // Development only: Allow controlled fallback with clear logging
    console.log('[TENANT-DEV-FALLBACK] Development fallback tenant (DATABASE UNAVAILABLE)');
    req.tenant = {
      id: 'dev-fallback-tenant-id',
      name: 'Development Fallback Tenant',
      slug: 'dev-fallback'
    };
    next();
  }
}

export async function rbacMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || !req.tenant) {
      return next();
    }
    
    // SECURITY FIX: Remove demo user permissions bypass - all users must go through proper RBAC
    // This was a security vulnerability that bypassed proper authorization
    
    // Check if tenant has granular RBAC enabled - default is simplified admin permissions
    const tenantResult = await db
      .select({ settings: tenants.settings })
      .from(tenants)
      .where(eq(tenants.id, req.tenant.id))
      .limit(1);
    
    const tenantSettings = tenantResult[0]?.settings as any || {};
    const rbacEnabled = tenantSettings.rbac_enabled === true;
    
    // If RBAC is not enabled (default), give admin users wildcard permissions
    if (!rbacEnabled && req.user.roles?.includes('admin')) {
      req.userPermissions = ['*'];
      console.log(`[RBAC-SIMPLE] Admin user with wildcard permissions (RBAC disabled for tenant)`);
      return next();
    }
    
    // Determina lo scope dal contesto della richiesta
    let scopeType = 'tenant';
    let scopeId = req.tenant.id;
    let parentScopes: { legalEntityId?: string } = {};
    
    // Controlla se abbiamo un contesto più specifico dai parametri o body
    if (req.params?.storeId || req.body?.storeId) {
      scopeType = 'store';
      scopeId = req.params?.storeId || req.body?.storeId;
      
      // Try to get the legal entity ID for this store
      // This would normally come from the database
      // For now, check if it's in the request
      if (req.body?.legalEntityId || req.params?.legalEntityId) {
        parentScopes.legalEntityId = req.body?.legalEntityId || req.params?.legalEntityId;
      }
      // TODO: Query database to get store's legal entity if not provided
    } else if (req.params?.legalEntityId || req.body?.legalEntityId) {
      scopeType = 'legal_entity';
      scopeId = req.params?.legalEntityId || req.body?.legalEntityId;
    }
    
    // Otteniamo i permessi dell'utente per questo tenant con lo scope corretto
    const userPermissions = await rbacStorage.getUserPermissions(
      req.user.id,
      req.tenant.id,
      scopeType,
      scopeId,
      parentScopes
    );
    
    // Se l'utente non ha permessi, proviamo a inizializzare i ruoli di sistema
    // e assegnare il ruolo admin al primo utente (utile per development)
    if (userPermissions.length === 0) {
      // Inizializza i ruoli di sistema per questo tenant se non esistono
      await rbacStorage.initializeSystemRoles(req.tenant.id);
      
      // In development, assegna automaticamente il ruolo admin al primo utente
      if (process.env.NODE_ENV === 'development') {
        const adminRole = await db
          .select()
          .from(roles)
          .where(and(
            eq(roles.tenantId, req.tenant.id),
            eq(roles.name, 'admin')
          ))
          .limit(1);
        
        if (adminRole.length > 0) {
          // Assegna il ruolo admin all'utente corrente
          await rbacStorage.assignRoleToUser({
            userId: req.user.id,
            roleId: adminRole[0].id,
            scopeType: 'tenant',
            scopeId: req.tenant.id
          });
          
          // Aggiungi tutti i permessi al ruolo admin
          await rbacStorage.setRolePermissions(adminRole[0].id, ['*']);
          
          // Ricarica i permessi
          req.userPermissions = ['*'];
        }
      }
    } else {
      req.userPermissions = userPermissions;
    }
    
    next();
  } catch (error) {
    console.error('RBAC middleware error:', error);
    // In caso di errore, continuiamo ma senza permessi
    req.userPermissions = [];
    next();
  }
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userPermissions) {
      return res.status(403).json({ error: 'No permissions assigned' });
    }
    
    // Check for wildcard permission
    if (req.userPermissions.includes('*')) {
      return next();
    }
    
    // Check for exact permission
    if (req.userPermissions.includes(permission)) {
      return next();
    }
    
    // Check for wildcard in permission path
    const permParts = permission.split('.');
    for (let i = permParts.length - 1; i >= 0; i--) {
      const wildcardPerm = [...permParts.slice(0, i), '*'].join('.');
      if (req.userPermissions.includes(wildcardPerm)) {
        return next();
      }
    }
    
    return res.status(403).json({ 
      error: 'Insufficient permissions',
      required: permission 
    });
  };
}