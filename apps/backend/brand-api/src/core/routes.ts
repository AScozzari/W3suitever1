import express from "express";
import http from "http";
import { createTenantContextMiddleware, BrandAuthService } from "./auth.js";

export async function registerBrandRoutes(app: express.Express): Promise<http.Server> {
  console.log("📡 Setting up Brand Interface API routes...");
  
  // Middleware per context tenant su tutte le routes Brand
  app.use("/brand-api", createTenantContextMiddleware());
  
  // Health check - sempre disponibile
  app.get("/brand-api/health", (req, res) => {
    const context = (req as any).brandContext;
    res.json({ 
      status: "healthy", 
      service: "Brand Interface API",
      context: {
        isCrossTenant: context?.isCrossTenant,
        tenantId: context?.tenantId,
        brandTenantId: context?.brandTenantId
      },
      timestamp: new Date().toISOString()
    });
  });

  // ==================== CROSS-TENANT ENDPOINTS ====================
  // Operazioni che vedono tutti i tenant
  
  app.get("/brand-api/organizations", (req, res) => {
    const context = (req as any).brandContext;
    
    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }
    
    res.json({ 
      organizations: [
        { id: "00000000-0000-0000-0000-000000000001", name: "Staging Environment", stores: 5 },
        { id: "99999999-9999-9999-9999-999999999999", name: "Demo Organization", stores: 3 },
        { id: "11111111-1111-1111-1111-111111111111", name: "ACME Corporation", stores: 8 },
        { id: "22222222-2222-2222-2222-222222222222", name: "Tech Solutions Ltd", stores: 2 }
      ],
      context: "cross-tenant",
      message: "All organizations visible in cross-tenant mode"
    });
  });

  app.get("/brand-api/analytics/cross-tenant", (req, res) => {
    const context = (req as any).brandContext;
    
    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "Analytics cross-tenant requires global access" });
    }
    
    res.json({
      summary: {
        totalTenants: 4,
        totalStores: 18,
        totalRevenue: 1250000,
        growthRate: "+12.5%"
      },
      context: "cross-tenant",
      message: "Global analytics data"
    });
  });

  // ==================== TENANT-SPECIFIC ENDPOINTS ====================
  // Operazioni su tenant specifico (path: /brand-api/:tenant/...)
  
  app.get("/brand-api/:tenant/stores", (req, res) => {
    const context = (req as any).brandContext;
    
    if (context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires tenant-specific context" });
    }
    
    res.json({
      tenant: context.tenantId,
      stores: [
        { id: "store-1", name: "Store Centro", status: "active" },
        { id: "store-2", name: "Store Nord", status: "active" }
      ],
      context: `tenant-specific: ${req.params.tenant}`,
      message: "Stores for specific tenant"
    });
  });

  // ==================== BRAND LEVEL ENDPOINTS ====================
  // Operazioni su tabelle Brand Interface
  
  app.get("/brand-api/campaigns", (req, res) => {
    const context = (req as any).brandContext;
    
    res.json({ 
      campaigns: [
        {
          id: "camp-1",
          name: "Campagna Primavera 2024",
          type: "global",
          status: "active",
          targetTenants: "all"
        },
        {
          id: "camp-2", 
          name: "Promo Tech Solutions",
          type: "tenant_specific",
          status: "draft",
          targetTenants: ["22222222-2222-2222-2222-222222222222"]
        }
      ],
      context: context.isCrossTenant ? "cross-tenant" : `tenant: ${context.tenantId}`,
      message: "Brand campaigns (stored in Brand Level tables)"
    });
  });

  app.get("/brand-api/deployment-targets", (req, res) => {
    const context = (req as any).brandContext;
    
    res.json({ 
      targets: context.isCrossTenant 
        ? ["all-tenants", "staging", "demo", "acme", "tech"]
        : [`tenant-${context.tenantId}`],
      context: context.isCrossTenant ? "cross-tenant" : `tenant-specific: ${context.tenantId}`,
      message: "Available deployment targets"
    });
  });

  // ==================== DEPLOYMENT ENDPOINTS ====================
  app.post("/brand-api/deploy", express.json(), (req, res) => {
    const context = (req as any).brandContext;
    const { campaignId, targetType, targetTenants } = req.body;
    
    res.json({
      deployment: {
        id: `deploy-${Date.now()}`,
        campaignId,
        targetType,
        targetTenants: targetType === 'all' ? 'all-tenants' : targetTenants,
        status: 'pending',
        initiatedBy: context.userId,
        initiatedAt: new Date().toISOString()
      },
      context: context.isCrossTenant ? "cross-tenant" : `tenant-specific: ${context.tenantId}`,
      message: "Deployment initiated"
    });
  });

  // Crea server HTTP
  const server = http.createServer(app);
  
  console.log("✅ Brand Interface API routes registered");
  return server;
}