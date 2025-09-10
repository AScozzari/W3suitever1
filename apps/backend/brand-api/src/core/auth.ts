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

// JWT Secret - required from environment in production
const JWT_SECRET = process.env.BRAND_JWT_SECRET || (
  process.env.NODE_ENV === "development" 
    ? "dev-brand-secret-key-change-in-production" 
    : (() => { throw new Error("BRAND_JWT_SECRET environment variable is required in production"); })()
);

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
      
      // Password validation
      let isValid = false;
      
      if (user.passwordHash) {
        // Use bcrypt to compare password with hash
        isValid = await bcrypt.compare(password, user.passwordHash);
      } else if (process.env.NODE_ENV === "development") {
        // ONLY in development, allow test password if no hash is set
        console.warn(`⚠️ Development mode: Using test password for ${email}`);
        isValid = password === "Brand123!";
      }
      
      if (!isValid) {
        // Update failed login attempts
        await brandStorage.updateUser(user.id, { 
          failedLoginAttempts: (user.failedLoginAttempts || 0) + 1,
          lastFailedLoginAt: new Date()
        });
        return null;
      }
      
      // Successful login - update user
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
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
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

// Middleware per autenticazione JWT
export function authenticateToken() {
  return async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    
    const token = authHeader.substring(7);
    const decoded = await BrandAuthService.verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    
    // Attach user info to request
    req.user = decoded;
    next();
  };
}

// Middleware per setting tenant context in base al path URL
export function createTenantContextMiddleware() {
  return async (req: any, res: any, next: any) => {
    // Since middleware is mounted at /brand-api, req.path is relative
    // Use req.originalUrl or req.baseUrl + req.path to get full path
    const fullPath = req.originalUrl || req.url;
    const pathAfterApi = req.path; // This is already relative to /brand-api
    const pathParts = pathAfterApi.split('/').filter(Boolean);
    
    // First part after /brand-api could be a tenant slug
    const potentialTenant = pathParts[0];
    
    if (potentialTenant) {
      // Query database for valid tenants
      const tenants = await brandStorage.getTenants();
      const tenant = tenants.find(t => t.slug === potentialTenant);
      
      if (tenant) {
        // Tenant-specific operation with user context
        req.brandContext = {
          userId: req.user?.id || BRAND_SERVICE_ACCOUNT_ID,
          tenantId: tenant.id,
          isCrossTenant: false,
          isServiceAccount: false,
          brandTenantId: BRAND_TENANT_ID
        };
        console.log(`🎯 Brand Auth Context: Tenant-specific (${tenant.slug})`);
      } else {
        // Cross-tenant operation with user context
        req.brandContext = {
          userId: req.user?.id || BRAND_SERVICE_ACCOUNT_ID,
          tenantId: null,
          isCrossTenant: true,
          isServiceAccount: false,
          brandTenantId: BRAND_TENANT_ID
        };
        console.log(`🎯 Brand Auth Context: Cross-Tenant`);
      }
    } else {
      // Default cross-tenant for root /brand-api path
      req.brandContext = {
        userId: req.user?.id || BRAND_SERVICE_ACCOUNT_ID,
        tenantId: null,
        isCrossTenant: true,
        isServiceAccount: false,
        brandTenantId: BRAND_TENANT_ID
      };
      console.log(`🎯 Brand Auth Context: Cross-Tenant (root)`);
    }
    
    next();
  };
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