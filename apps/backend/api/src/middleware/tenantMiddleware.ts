import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include tenant
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      user?: any;
    }
  }
}

// Middleware per estrarre e validare il tenant ID
export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Prima controlla se l'utente è autenticato e ha un tenant
    if (req.user && req.user.tenantId) {
      req.tenantId = req.user.tenantId;
      return next();
    }

    // 2. Poi controlla l'header X-Tenant-ID
    const tenantIdHeader = req.headers['x-tenant-id'] as string;
    if (tenantIdHeader) {
      // Valida che sia un UUID valido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(tenantIdHeader)) {
        return res.status(400).json({ 
          error: 'Invalid tenant ID format',
          message: 'Tenant ID must be a valid UUID'
        });
      }
      req.tenantId = tenantIdHeader;
      return next();
    }

    // 3. Per alcune rotte pubbliche, il tenant ID potrebbe non essere richiesto
    const publicRoutes = ['/api/health', '/api/auth/login', '/api/auth/register', '/api/public'];
    if (publicRoutes.some(route => req.path.startsWith(route))) {
      return next();
    }

    // 4. Se non c'è tenant ID e non è una rotta pubblica, errore
    return res.status(400).json({ 
      error: 'Tenant ID required',
      message: 'X-Tenant-ID header or authenticated session required'
    });
  } catch (error) {
    console.error('Tenant middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware per verificare che l'utente abbia accesso al tenant specificato
export const validateTenantAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'Tenant ID not found in request' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verifica che l'utente abbia accesso a questo tenant
    // Questo può includere controlli su:
    // - L'utente appartiene al tenant
    // - L'utente ha permessi cross-tenant (super admin)
    // - Il tenant è attivo
    
    const userTenants = req.user.tenants || [req.user.tenantId];
    if (!userTenants.includes(req.tenantId)) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have access to this tenant'
      });
    }

    next();
  } catch (error) {
    console.error('Tenant validation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper per applicare il filtro tenant alle query database
export const applyTenantFilter = (query: any, tenantId: string) => {
  // Questo è un esempio generico
  // In pratica, useresti il query builder del tuo ORM (Drizzle)
  return {
    ...query,
    where: {
      ...query.where,
      tenant_id: tenantId
    }
  };
};

// Helper per aggiungere automaticamente tenant_id ai dati in creazione
export const addTenantToData = <T extends Record<string, any>>(
  data: T,
  tenantId: string
): T & { tenant_id: string } => {
  return {
    ...data,
    tenant_id: tenantId
  };
};