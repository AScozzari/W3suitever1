import express from "express";
import http from "http";
import { createTenantContextMiddleware, BrandAuthService } from "./auth.js";
import { brandStorage } from "./storage.js";

export async function registerBrandRoutes(app: express.Express): Promise<http.Server> {
  console.log("📡 Setting up Brand Interface API routes...");
  
  // Middleware per parsing cookies
  app.use(express.json());
  
  // ==================== AUTH ENDPOINTS ====================
  // Login endpoint - non richiede autenticazione
  app.post("/brand-api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    
    const user = await BrandAuthService.validateCredentials(email, password);
    
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    const token = BrandAuthService.generateToken(user);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        commercialAreas: user.commercialAreaCodes,
        permissions: user.permissions
      }
    });
  });
  
  // Verify token endpoint
  app.get("/brand-api/auth/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }
    
    const token = authHeader.substring(7);
    const decoded = await BrandAuthService.verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }
    
    res.json({ 
      success: true,
      user: decoded 
    });
  });
  
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
  
  app.get("/brand-api/organizations", async (req, res) => {
    const context = (req as any).brandContext;
    
    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }
    
    try {
      const tenants = await brandStorage.getTenants();
      res.json({ 
        organizations: tenants.map(t => ({
          id: t.id,
          name: t.name,
          status: t.status,
          settings: t.settings
        })),
        context: "cross-tenant",
        message: "All organizations visible in cross-tenant mode"
      });
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ error: "Failed to fetch organizations" });
    }
  });

  app.get("/brand-api/analytics/cross-tenant", async (req, res) => {
    const context = (req as any).brandContext;
    
    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "Analytics cross-tenant requires global access" });
    }
    
    try {
      const tenants = await brandStorage.getTenants();
      const users = await brandStorage.getUsers();
      
      res.json({
        summary: {
          totalTenants: tenants.length,
          totalUsers: users.length,
          activeTenants: tenants.filter(t => t.status === 'active').length,
          totalRevenue: 1250000, // Mock per ora
          growthRate: "+12.5%" // Mock per ora
        },
        context: "cross-tenant",
        message: "Global analytics data"
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
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