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

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // DEVELOPMENT BYPASS - Use mock tenant when database is unavailable
    if (process.env.NODE_ENV === 'development') {
      const mockTenant = {
        id: 'demo-tenant-id',
        name: 'W3 Suite Demo',
        slug: 'w3-demo'
      };
      
      req.tenant = mockTenant;
      console.log('[TENANT-DEV] Using mock tenant:', mockTenant.name);
      return next();
    }
    
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
    console.error('Tenant middleware error:', error);
    
    // FALLBACK: Use mock tenant even in production if database fails
    console.log('[TENANT-FALLBACK] Database unavailable, using mock tenant');
    req.tenant = {
      id: 'fallback-tenant-id',
      name: 'Fallback Tenant',
      slug: 'fallback'
    };
    next();
  }
}

export async function rbacMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || !req.tenant) {
      return next();
    }
    
    // DEMO USER FAST PATH: Use req.user.permissions for demo users in development
    if (process.env.NODE_ENV === 'development' && req.user?.id === 'demo-user') {
      const perms = Array.isArray((req.user as any).permissions) ? (req.user as any).permissions : [];
      req.userPermissions = perms;
      console.log(`[RBAC-DEMO] Using inline permissions: ${req.userPermissions?.join(',')}`);
      return next();
    }
    
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