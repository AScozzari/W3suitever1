import { Request, Response, NextFunction } from 'express';
import { query } from '../../apps/backend/api/src/core/database';

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
    
    // Otteniamo il tenant dal database
    const result = await query(`
      SELECT id, name, slug, status 
      FROM tenants 
      WHERE slug = $1 AND status = 'active'
      LIMIT 1
    `, [tenantSlug]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found or inactive' });
    }
    
    const tenant = result.rows[0];
    req.tenant = {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug
    };
    
    // Impostiamo il tenant_id per RLS
    await query(`SET app.tenant_id = $1`, [tenant.id]);
    
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
    
    // Otteniamo i permessi dell'utente per questo tenant
    const result = await query(`
      SELECT DISTINCT rp.perm
      FROM user_assignments ua
      JOIN role_perms rp ON rp.role_id = ua.role_id
      WHERE ua.user_id = $1
        AND (
          (ua.scope_type = 'tenant' AND ua.scope_id = $2) OR
          (ua.scope_type = 'legal_entity' AND ua.scope_id IN (
            SELECT id FROM legal_entities WHERE tenant_id = $2
          )) OR
          (ua.scope_type = 'store' AND ua.scope_id IN (
            SELECT id FROM stores WHERE tenant_id = $2
          ))
        )
        AND (ua.expires_at IS NULL OR ua.expires_at > NOW())
      
      UNION
      
      SELECT perm
      FROM user_extra_perms
      WHERE user_id = $1
        AND mode = 'grant'
        AND (expires_at IS NULL OR expires_at > NOW())
      
      EXCEPT
      
      SELECT perm
      FROM user_extra_perms
      WHERE user_id = $1
        AND mode = 'revoke'
        AND (expires_at IS NULL OR expires_at > NOW())
    `, [req.user.id, req.tenant.id]);
    
    req.userPermissions = result.rows.map((row: any) => row.perm);
    
    next();
  } catch (error) {
    console.error('RBAC middleware error:', error);
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