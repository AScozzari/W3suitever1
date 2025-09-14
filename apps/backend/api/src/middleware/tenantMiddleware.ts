import { Request, Response, NextFunction } from 'express';
import { setTenantContext } from '../core/db';

// Extend Express Request type to include tenant
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      user?: any;
    }
  }
}

// Mapping sottodomini -> tenant IDs
const TENANT_SUBDOMAIN_MAP: Record<string, { id: string, name: string }> = {
  'staging': { 
    id: '00000000-0000-0000-0000-000000000001', 
    name: 'Staging Environment - W3 Suite' 
  },
  'demo': { 
    id: '99999999-9999-9999-9999-999999999999', 
    name: 'Demo Organization' 
  },
  'acme': { 
    id: '11111111-1111-1111-1111-111111111111', 
    name: 'Acme Corporation' 
  },
  'tech': { 
    id: '22222222-2222-2222-2222-222222222222', 
    name: 'Tech Solutions Ltd' 
  }
};

// Helper per estrarre il sottodominio dall'hostname
const extractSubdomain = (hostname: string): string | null => {
  // In produzione: acme.w3suite.com -> 'acme'
  // In development: localhost:5000 -> usa header di test
  
  // Se siamo in localhost, cerca l'header di test
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return null; // Useremo l'header X-Tenant-Subdomain per testing
  }
  
  // Bypass per Replit URLs (contengono .replit.dev)
  if (hostname.includes('.replit.dev')) {
    return null; // Usa headers per tenant identification su Replit
  }
  
  // Estrai il primo segmento del dominio
  const parts = hostname.split('.');
  if (parts.length >= 3) { // es: acme.w3suite.com
    return parts[0];
  }
  
  return null;
};

// Middleware per estrarre e validare il tenant ID
export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Estrazione tenant ID da URL path (es: /staging/dashboard)
    const pathSegments = req.path.split('/').filter(Boolean);
    const pathTenant = pathSegments[0]; // primo segmento del path
    
    if (pathTenant && TENANT_SUBDOMAIN_MAP[pathTenant.toLowerCase()]) {
      const tenant = TENANT_SUBDOMAIN_MAP[pathTenant.toLowerCase()];
      req.tenantId = tenant.id;
      (req as any).tenantInfo = tenant;
      
      // Imposta il context del database per RLS
      await setTenantContext(tenant.id);
      return next();
    }

    // 2. Prima controlla se l'utente è autenticato e ha un tenant
    if (req.user && req.user.tenantId) {
      req.tenantId = req.user.tenantId;
      await setTenantContext(req.user.tenantId);
      return next();
    }

    // 2. Estrai il sottodominio dall'hostname
    const subdomain = extractSubdomain(req.hostname);
    
    // 3. In development, permetti override tramite header per testing
    const testSubdomain = req.headers['x-tenant-subdomain'] as string;
    const finalSubdomain = subdomain || testSubdomain;
    
    if (finalSubdomain) {
      const tenant = TENANT_SUBDOMAIN_MAP[finalSubdomain.toLowerCase()];
      if (tenant) {
        req.tenantId = tenant.id;
        // Aggiungi anche info tenant alla request
        (req as any).tenantInfo = tenant;
        return next();
      } else {
        return res.status(404).json({ 
          error: 'Tenant not found',
          message: `Organization '${finalSubdomain}' not found. Please check your URL.`
        });
      }
    }

    // 4. Fallback: controlla l'header X-Tenant-ID (per backward compatibility)
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
      
      // DEMO FIX: Set req.tenant object for rbacMiddleware compatibility
      (req as any).tenant = {
        id: tenantIdHeader,
        name: 'Demo Tenant',
        slug: 'demo'
      };
      
      await setTenantContext(tenantIdHeader);
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