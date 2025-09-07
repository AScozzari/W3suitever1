// Brand Interface Cross-Tenant Authentication System

export interface BrandAuthContext {
  userId: string;
  tenantId: string | null; // null = cross-tenant mode
  isCrossTenant: boolean;
  isServiceAccount: boolean;
  brandTenantId: string; // Always brand interface tenant
}

// Brand Interface Tenant ID (constant)
export const BRAND_TENANT_ID = '50dbf940-5809-4094-afa1-bd699122a636';
export const BRAND_SERVICE_ACCOUNT_ID = 'brand-service-account';

// Service per autenticazione cross-tenant
export class BrandAuthService {
  
  /**
   * Crea context di autenticazione per Brand Interface
   * @param targetTenant - null per cross-tenant, tenant ID per operazioni specifiche
   */
  static createBrandContext(targetTenant: string | null = null): BrandAuthContext {
    return {
      userId: BRAND_SERVICE_ACCOUNT_ID,
      tenantId: targetTenant,
      isCrossTenant: targetTenant === null,
      isServiceAccount: true,
      brandTenantId: BRAND_TENANT_ID
    };
  }

  /**
   * Context per operazioni cross-tenant (accede a tutti i tenant)
   */
  static getCrossTenantContext(): BrandAuthContext {
    return this.createBrandContext(null);
  }

  /**
   * Context per operazioni su tenant specifico
   */
  static getTenantSpecificContext(tenantId: string): BrandAuthContext {
    return this.createBrandContext(tenantId);
  }

  /**
   * Context per operazioni Brand Level (su tabelle brand-specific)
   */
  static getBrandLevelContext(): BrandAuthContext {
    return this.createBrandContext(BRAND_TENANT_ID);
  }
}

// Middleware per setting tenant context in base al path URL
export function createTenantContextMiddleware() {
  return (req: any, res: any, next: any) => {
    // Estrai tenant dal path: /brand-api/demo/... or /brand-api/...
    const pathParts = req.path.split('/').filter(Boolean);
    
    if (pathParts[0] === 'brand-api') {
      const potentialTenant = pathParts[1];
      
      // Lista tenant validi (dovresti caricare dal DB)
      const validTenants = ['demo', 'staging', 'acme', 'tech'];
      
      if (validTenants.includes(potentialTenant)) {
        // Tenant-specific operation
        req.brandContext = BrandAuthService.getTenantSpecificContext(getTenantIdBySlug(potentialTenant));
      } else {
        // Cross-tenant operation
        req.brandContext = BrandAuthService.getCrossTenantContext();
      }
    } else {
      // Default cross-tenant
      req.brandContext = BrandAuthService.getCrossTenantContext();
    }
    
    console.log(`🎯 Brand Auth Context: ${req.brandContext.isCrossTenant ? 'Cross-Tenant' : `Tenant ${req.brandContext.tenantId}`}`);
    
    next();
  };
}

// Helper per mapping slug → tenant ID
function getTenantIdBySlug(slug: string): string {
  const tenantMapping: Record<string, string> = {
    'staging': '00000000-0000-0000-0000-000000000001',
    'demo': '99999999-9999-9999-9999-999999999999',
    'acme': '11111111-1111-1111-1111-111111111111',
    'tech': '22222222-2222-2222-2222-222222222222'
  };
  
  return tenantMapping[slug] || tenantMapping['staging'];
}

// Decorator per routes che richiedono specifico context
export function requiresCrossTenant(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = function(...args: any[]) {
    const req = args[0]; // Assume Express req as first arg
    
    if (!req.brandContext?.isCrossTenant) {
      throw new Error('This operation requires cross-tenant access');
    }
    
    return method.apply(this, args);
  };
  
  return descriptor;
}

export function requiresTenantSpecific(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = function(...args: any[]) {
    const req = args[0]; // Assume Express req as first arg
    
    if (req.brandContext?.isCrossTenant) {
      throw new Error('This operation requires tenant-specific access');
    }
    
    return method.apply(this, args);
  };
  
  return descriptor;
}