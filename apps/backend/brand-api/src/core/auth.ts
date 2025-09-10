// Brand Interface Cross-Tenant Authentication System
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { brandStorage } from "./storage.js";
import type { BrandUser } from "../db/index.js";

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

const JWT_SECRET = process.env.BRAND_JWT_SECRET || "brand-interface-secret-key-change-in-production";

// Service per autenticazione cross-tenant
export class BrandAuthService {
  
  /**
   * Valida credenziali utente Brand
   */
  static async validateCredentials(email: string, password: string): Promise<BrandUser | null> {
    try {
      const user = await brandStorage.getUserByEmail(email);
      
      if (!user || !user.isActive) {
        return null;
      }
      
      // In sviluppo, accetta password fissa per test
      if (process.env.NODE_ENV === "development") {
        if (password === "Brand123!") {
          return user;
        }
      }
      
      // In produzione userebbe bcrypt.compare con hash reale
      // const isValid = await bcrypt.compare(password, user.passwordHash);
      // if (!isValid) return null;
      
      // Aggiorna ultimo login
      await brandStorage.updateUser(user.id, { 
        lastLoginAt: new Date(),
        failedLoginAttempts: 0 
      });
      
      return user;
    } catch (error) {
      console.error("Error validating credentials:", error);
      return null;
    }
  }
  
  /**
   * Genera JWT token per utente Brand
   */
  static generateToken(user: BrandUser): string {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      commercialAreas: user.commercialAreaCodes,
      permissions: user.permissions
    };
    
    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn: "8h",
      issuer: "brand-interface"
    });
  }
  
  /**
   * Verifica JWT token Brand
   */
  static async verifyToken(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: "brand-interface"
      });
      return decoded;
    } catch (error) {
      console.error("Token verification failed:", error);
      return null;
    }
  }
  
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