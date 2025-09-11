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
    // In produzione, il tenant verrebbe determinato da:
    // 1. Subdomain (e.g., demo.w3suite.com)
    // 2. Header X-Tenant-Id
    // 3. User's tenant association
    
    // Per ora usiamo il tenant demo come default
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
    
    // Impostiamo il tenant_id per RLS usando Drizzle
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
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function rbacMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || !req.tenant) {
      return next();
    }
    
    // Otteniamo i permessi dell'utente per questo tenant dal database
    const userPermissions = await rbacStorage.getUserPermissions(
      req.user.id,
      req.tenant.id
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