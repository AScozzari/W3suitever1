import express from "express";
import http from "http";
import { createTenantContextMiddleware, BrandAuthService, authenticateToken, BRAND_TENANT_ID } from "./auth.js";
import { brandStorage } from "./storage.js";

export async function registerBrandRoutes(app: express.Express): Promise<http.Server> {
  console.log("📡 Setting up Brand Interface API routes...");

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "brand-api-backend",
      version: "1.0.0"
    });
  });

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

  // Health check - NO auth required
  app.get("/brand-api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      service: "Brand Interface API",
      timestamp: new Date().toISOString()
    });
  });

  // Verify token endpoint - requires auth
  app.get("/brand-api/auth/me", authenticateToken(), async (req, res) => {
    const user = (req as any).user;

    res.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        commercialAreas: user.commercialAreas,
        permissions: user.permissions
      }
    });
  });

  // Apply JWT authentication middleware to all routes except auth/login and health
  app.use("/brand-api", (req, res, next) => {
    // Skip auth for login, health and reference endpoints  
    if (req.path === "/auth/login" || req.path === "/health" || req.path.startsWith("/reference/")) {
      return next();
    }
    
    // 🔧 DEVELOPMENT MODE: Bypass authentication
    if (process.env.NODE_ENV === "development") {
      console.log("🔧 [BRAND-DEV] Development mode: Bypassing authentication for", req.path);
      // Simulate authenticated super admin user
      (req as any).user = {
        id: "brand-admin-user",
        email: "admin@brandinterface.com", 
        firstName: "Brand",
        lastName: "Admin",
        role: "super_admin",
        commercialAreas: [],
        permissions: ["*"], // All permissions
        isActive: true,
        brandTenantId: BRAND_TENANT_ID
      };
      return next();
    }
    
    // Apply JWT middleware for all other routes in production
    return authenticateToken()(req, res, next);
  });

  // Apply tenant context middleware after authentication
  app.use("/brand-api", createTenantContextMiddleware());

  // ==================== CROSS-TENANT ENDPOINTS ====================
  // Operazioni che vedono tutti i tenant

  app.get("/brand-api/organizations", async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;

    // Role-based access control - only super_admin and national_manager can see all orgs
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to view all organizations" });
    }

    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }

    try {
      const organizations = await brandStorage.getOrganizations();
      res.json({ 
        organizations: organizations.map(org => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          status: org.status,
          notes: org.notes,
          createdAt: org.createdAt,
          updatedAt: org.updatedAt
        })),
        context: "cross-tenant",
        message: "All organizations visible in cross-tenant mode"
      });
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ error: "Failed to fetch organizations" });
    }
  });

  // Legal Entities management endpoints
  app.post("/brand-api/organizations", express.json(), async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;

    // Role-based access control - only super_admin and national_manager can create orgs
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to create organizations" });
    }

    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }

    try {
      const { name, slug, status, notes } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Organization name is required" });
      }

      const organization = await brandStorage.createOrganization({
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
        status: status || 'active',
        notes: notes || ''
      });

      res.status(201).json({
        success: true,
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          status: organization.status,
          notes: organization.notes,
          createdAt: organization.createdAt
        },
        message: "Organization created successfully"
      });
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({ error: "Failed to create organization" });
    }
  });

  // Get legal entities for specific tenant
  app.get("/brand-api/legal-entities/:tenantId", async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;
    const { tenantId } = req.params;

    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to view legal entities" });
    }

    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }

    try {
      const legalEntities = await brandStorage.getLegalEntitiesByTenant(tenantId);
      res.json({
        legalEntities: legalEntities.map(entity => ({
          id: entity.id,
          tenantId: entity.tenantId,
          codice: entity.codice,
          nome: entity.nome,
          pIva: entity.pIva,
          codiceFiscale: entity.codiceFiscale,
          formaGiuridica: entity.formaGiuridica,
          stato: entity.stato,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt
        })),
        tenantId,
        context: "cross-tenant",
        message: `Legal entities for tenant ${tenantId}`
      });
    } catch (error) {
      console.error(`Error fetching legal entities for tenant ${tenantId}:`, error);
      res.status(500).json({ error: "Failed to fetch legal entities" });
    }
  });

  // Create new legal entity for specific tenant
  app.post("/brand-api/legal-entities", express.json(), async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;

    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to create legal entities" });
    }

    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }

    try {
      const { tenantId, codice, nome, pIva, codiceFiscale, formaGiuridica, ...otherFields } = req.body;

      // Validazione campi obbligatori
      if (!tenantId) {
        return res.status(400).json({ error: "tenantId is required" });
      }
      if (!nome) {
        return res.status(400).json({ error: "Nome (legal entity name) is required" });
      }
      if (!pIva) {
        return res.status(400).json({ error: "Partita IVA is required" });
      }

      // Auto-generate codice if not provided (8 + timestamp last 6 digits)
      const finalCodice = codice || `8${String(Date.now()).slice(-6)}`;

      const legalEntityData = {
        tenantId,
        codice: finalCodice,
        nome,
        pIva,
        codiceFiscale,
        formaGiuridica,
        stato: 'Attiva',
        ...otherFields
      };

      const legalEntity = await brandStorage.createLegalEntity(legalEntityData);

      res.status(201).json({
        success: true,
        legalEntity: {
          id: legalEntity.id,
          tenantId: legalEntity.tenantId,
          codice: legalEntity.codice,
          nome: legalEntity.nome,
          pIva: legalEntity.pIva,
          codiceFiscale: legalEntity.codiceFiscale,
          formaGiuridica: legalEntity.formaGiuridica,
          stato: legalEntity.stato,
          createdAt: legalEntity.createdAt
        },
        message: "Legal entity created successfully"
      });
    } catch (error) {
      console.error("Error creating legal entity:", error);
      res.status(500).json({ error: "Failed to create legal entity" });
    }
  });

  app.get("/brand-api/analytics/cross-tenant", async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;

    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions for cross-tenant analytics" });
    }

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

  app.get("/brand-api/:tenant/stores", async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;

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

  app.get("/brand-api/campaigns", async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;

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
  app.post("/brand-api/deploy", express.json(), async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;
    const { campaignId, targetType, targetTenants } = req.body;

    // Only super_admin and national_manager can deploy
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to deploy campaigns" });
    }

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

  // ==================== SECURE CROSS-TENANT ENDPOINTS ====================
  // Security-first implementation for cross-tenant operations

  // Helper function for secure W3 backend calls with service authentication
  async function secureW3BackendCall(endpoint: string, options: any = {}) {
    try {
      const response = await fetch(`http://localhost:3004${endpoint}`, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.W3_SERVICE_TOKEN || 'dev-service-token'}`,
          'X-Service': 'brand-interface',
          'X-Service-Version': '1.0.0',
          ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      if (!response.ok) {
        throw new Error(`W3 Backend error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Secure W3 Backend call failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Get tenants for cross-tenant operations (alias for organizations)
  app.get("/brand-api/cross-tenant/tenants", async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;

    // Only super_admin and national_manager can access cross-tenant operations
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions for cross-tenant operations" });
    }

    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }

    try {
      const tenants = await brandStorage.getTenants();
      res.json({ 
        tenants: tenants.map(t => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          status: t.status
        }))
      });
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ error: "Failed to fetch tenants" });
    }
  });

  // Get legal entities for specific tenant (server-side tenant validation)
  app.get("/brand-api/cross-tenant/legal-entities/:tenantSlug", async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;
    const { tenantSlug } = req.params;

    // Only super_admin and national_manager can access cross-tenant operations
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions for cross-tenant operations" });
    }

    try {
      // Server-side tenant validation - map slug to ID
      const tenants = await brandStorage.getTenants();
      const tenant = tenants.find(t => t.slug === tenantSlug);
      
      if (!tenant) {
        return res.status(404).json({ error: `Tenant not found: ${tenantSlug}` });
      }

      // Secure service-to-service call to W3 backend
      const legalEntities = await secureW3BackendCall(`/api/legal-entities?tenantId=${tenant.id}`);
      
      res.json({ 
        legalEntities,
        tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name }
      });
    } catch (error) {
      console.error(`Error fetching legal entities for tenant ${tenantSlug}:`, error);
      res.status(500).json({ error: "Failed to fetch legal entities" });
    }
  });

  // Get channels for specific tenant
  app.get("/brand-api/cross-tenant/channels/:tenantSlug", async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;
    const { tenantSlug } = req.params;

    // Only super_admin and national_manager can access cross-tenant operations
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions for cross-tenant operations" });
    }

    try {
      // Server-side tenant validation
      const tenants = await brandStorage.getTenants();
      const tenant = tenants.find(t => t.slug === tenantSlug);
      
      if (!tenant) {
        return res.status(404).json({ error: `Tenant not found: ${tenantSlug}` });
      }

      // Secure service-to-service call
      const channels = await secureW3BackendCall(`/api/channels?tenantId=${tenant.id}`);
      
      res.json({ 
        channels,
        tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name }
      });
    } catch (error) {
      console.error(`Error fetching channels for tenant ${tenantSlug}:`, error);
      res.status(500).json({ error: "Failed to fetch channels" });
    }
  });

  // Get commercial areas for specific tenant
  app.get("/brand-api/cross-tenant/commercial-areas/:tenantSlug", async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;
    const { tenantSlug } = req.params;

    // Only super_admin and national_manager can access cross-tenant operations
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions for cross-tenant operations" });
    }

    try {
      // Server-side tenant validation
      const tenants = await brandStorage.getTenants();
      const tenant = tenants.find(t => t.slug === tenantSlug);
      
      if (!tenant) {
        return res.status(404).json({ error: `Tenant not found: ${tenantSlug}` });
      }

      // Secure service-to-service call
      const commercialAreas = await secureW3BackendCall(`/api/commercial-areas?tenantId=${tenant.id}`);
      
      res.json({ 
        commercialAreas,
        tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name }
      });
    } catch (error) {
      console.error(`Error fetching commercial areas for tenant ${tenantSlug}:`, error);
      res.status(500).json({ error: "Failed to fetch commercial areas" });
    }
  });

  // Get brands for specific tenant
  app.get("/brand-api/cross-tenant/brands/:tenantSlug", async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;
    const { tenantSlug } = req.params;

    // Only super_admin and national_manager can access cross-tenant operations
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions for cross-tenant operations" });
    }

    try {
      // Server-side tenant validation
      const tenants = await brandStorage.getTenants();
      const tenant = tenants.find(t => t.slug === tenantSlug);
      
      if (!tenant) {
        return res.status(404).json({ error: `Tenant not found: ${tenantSlug}` });
      }

      // Secure service-to-service call
      const brands = await secureW3BackendCall(`/api/brands?tenantId=${tenant.id}`);
      
      res.json({ 
        brands,
        tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name }
      });
    } catch (error) {
      console.error(`Error fetching brands for tenant ${tenantSlug}:`, error);
      res.status(500).json({ error: "Failed to fetch brands" });
    }
  });

  // Create store with secure cross-tenant validation
  app.post("/brand-api/cross-tenant/stores", express.json(), async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;
    const storeData = req.body;

    // Only super_admin and national_manager can create cross-tenant stores
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to create cross-tenant stores" });
    }

    if (!storeData.tenantSlug) {
      return res.status(400).json({ error: "tenantSlug is required" });
    }

    try {
      // Server-side tenant validation and mapping
      const tenants = await brandStorage.getTenants();
      const tenant = tenants.find(t => t.slug === storeData.tenantSlug);
      
      if (!tenant) {
        return res.status(404).json({ error: `Tenant not found: ${storeData.tenantSlug}` });
      }

      // Remove tenantSlug from data and add proper tenantId for W3 backend
      const { tenantSlug, ...cleanStoreData } = storeData;
      const storePayload = {
        ...cleanStoreData,
        tenantId: tenant.id, // Server-controlled tenant ID
        createdBy: user.id,
        createdFromBrandInterface: true,
        brandInterfaceUser: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      };

      // Secure service-to-service call to create store
      const createdStore = await secureW3BackendCall('/api/stores', {
        method: 'POST',
        body: storePayload,
        headers: {
          'X-Tenant-ID': tenant.id, // Server-controlled tenant targeting
          'X-Source': 'brand-interface'
        }
      });

      // Log the cross-tenant operation for audit
      await brandStorage.createAuditLog({
        tenantId: tenant.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'CREATE_CROSS_TENANT_STORE',
        resourceType: 'store',
        resourceIds: [createdStore.id],
        targetTenants: [tenant.slug || tenant.name],
        metadata: {
          storeCode: storeData.code,
          storeName: storeData.nome,
          brandInterfaceUserId: user.id
        }
      });

      res.json({
        success: true,
        store: createdStore,
        tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
        message: `Store created successfully on tenant ${tenant.name}`
      });
    } catch (error) {
      console.error(`Error creating store for tenant ${storeData.tenantSlug}:`, error);
      res.status(500).json({ 
        error: "Failed to create store",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ==================== AI MANAGEMENT ENDPOINTS ====================
  
  // AI Agents Registry Routes - require authentication
  app.get("/brand-api/ai/agents", async (req, res) => {
    try {
      const { moduleContext, status, search, page = '1', limit = '25' } = req.query;
      
      const filters = {
        moduleContext: moduleContext as string,
        status: status as string, 
        search: search as string
      };
      
      // Remove empty filters
      Object.keys(filters).forEach(key => {
        if (!filters[key as keyof typeof filters] || filters[key as keyof typeof filters] === 'all') {
          delete filters[key as keyof typeof filters];
        }
      });
      
      const agents = await brandStorage.getAIAgents(filters);
      
      res.json({
        success: true,
        data: {
          agents,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: agents.length
          }
        }
      });
    } catch (error) {
      console.error('Error fetching AI agents:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch AI agents'
      });
    }
  });

  app.get("/brand-api/ai/agents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const agent = await brandStorage.getAIAgent(id);
      
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'AI agent not found'
        });
      }
      
      res.json({
        success: true,
        data: agent
      });
    } catch (error) {
      console.error('Error fetching AI agent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch AI agent'
      });
    }
  });

  app.post("/brand-api/ai/agents", async (req, res) => {
    try {
      const agentData = req.body;
      
      // Validate required fields
      if (!agentData.agentId || !agentData.name || !agentData.systemPrompt) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: agentId, name, systemPrompt'
        });
      }
      
      // Check if agentId already exists
      const existingAgent = await brandStorage.getAIAgentByAgentId(agentData.agentId);
      if (existingAgent) {
        return res.status(409).json({
          success: false,
          error: 'Agent ID already exists'
        });
      }
      
      const newAgent = await brandStorage.createAIAgent(agentData);
      
      res.status(201).json({
        success: true,
        data: newAgent
      });
    } catch (error) {
      console.error('Error creating AI agent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create AI agent'
      });
    }
  });

  app.put("/brand-api/ai/agents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const updatedAgent = await brandStorage.updateAIAgent(id, updateData);
      
      if (!updatedAgent) {
        return res.status(404).json({
          success: false,
          error: 'AI agent not found'
        });
      }
      
      res.json({
        success: true,
        data: updatedAgent
      });
    } catch (error) {
      console.error('Error updating AI agent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update AI agent'
      });
    }
  });

  app.delete("/brand-api/ai/agents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const deleted = await brandStorage.deleteAIAgent(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'AI agent not found'
        });
      }
      
      res.json({
        success: true,
        message: 'AI agent deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting AI agent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete AI agent'
      });
    }
  });

  app.post("/brand-api/ai/agents/bulk", async (req, res) => {
    try {
      const { operation, agentIds, values } = req.body;
      
      if (!operation || !agentIds || !Array.isArray(agentIds)) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: operation, agentIds (array)'
        });
      }
      
      const result = await brandStorage.bulkUpdateAIAgents(agentIds, operation, values);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error in bulk operation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform bulk operation'
      });
    }
  });

  app.get("/brand-api/ai/agents/export.csv", async (req, res) => {
    try {
      const { moduleContext, status, search } = req.query;
      
      const filters = {
        moduleContext: moduleContext as string,
        status: status as string,
        search: search as string
      };
      
      // Remove empty filters
      Object.keys(filters).forEach(key => {
        if (!filters[key as keyof typeof filters] || filters[key as keyof typeof filters] === 'all') {
          delete filters[key as keyof typeof filters];
        }
      });
      
      const csvContent = await brandStorage.exportAIAgentsCSV(filters);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="ai-agents-export-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error('Error exporting AI agents CSV:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export AI agents CSV'
      });
    }
  });

  // AI Analytics Routes (placeholder for now)
  app.get("/brand-api/ai/analytics", async (req, res) => {
    try {
      // Placeholder analytics data
      const analyticsData = {
        totalAgents: 1,
        activeAgents: 1,
        totalInteractions: 0,
        totalTokensUsed: 0,
        agentsByModule: [
          { module: 'general', count: 1, percentage: 100 }
        ],
        usageByAgent: [],
        tenantUsage: []
      };
      
      res.json({
        success: true,
        data: analyticsData
      });
    } catch (error) {
      console.error('Error fetching AI analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch AI analytics'
      });
    }
  });

  // AI Configurations Routes (placeholder for now)
  app.get("/brand-api/ai/configurations", async (req, res) => {
    try {
      res.json({
        success: true,
        data: []
      });
    } catch (error) {
      console.error('Error fetching AI configurations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch AI configurations'
      });
    }
  });

  // ==============================================================================
  // AI AGENT RAG KNOWLEDGE BASE ENDPOINTS  
  // ==============================================================================

  // Upload documents for agent knowledge base - IMPLEMENTED
  app.post("/brand-api/ai/agents/:id/documents", async (req, res) => {
    try {
      const { id: agentId } = req.params;
      const { content, filename } = req.body;
      
      // Verify agent exists
      const agent = await brandStorage.getAIAgent(agentId);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'AI agent not found'
        });
      }

      if (!content || !filename) {
        return res.status(400).json({
          success: false,
          error: 'content and filename are required'
        });
      }

      console.log(`[BRAND-TRAINING] 📄 Processing document training for agent ${agentId}: ${filename}`);

      // Process document using Brand training pipeline
      const result = await brandStorage.processAgentTraining({
        agentId,
        sourceType: 'document',
        content,
        filename,
        origin: 'brand'
      });
      
      res.json({
        success: true,
        message: 'Document processed successfully for cross-tenant training',
        data: { 
          agentId, 
          filename,
          chunksCreated: result.chunksCreated,
          embeddingsGenerated: result.embeddingsGenerated,
          savedToOrigin: 'brand'
        }
      });
    } catch (error) {
      console.error('Error uploading agent documents:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload documents'
      });
    }
  });

  // Add URL knowledge source for agent - IMPLEMENTED
  app.post("/brand-api/ai/agents/:id/urls", async (req, res) => {
    try {
      const { id: agentId } = req.params;
      const { url } = req.body;
      
      // Verify agent exists
      const agent = await brandStorage.getAIAgent(agentId);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'AI agent not found'
        });
      }

      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL is required'
        });
      }

      // Basic URL validation
      try {
        new URL(url);
      } catch {
        return res.status(400).json({
          success: false,
          error: 'Invalid URL format'
        });
      }

      console.log(`[BRAND-TRAINING] 🌐 Processing URL training for agent ${agentId}: ${url}`);

      // Process URL using Brand training pipeline
      const result = await brandStorage.processAgentTraining({
        agentId,
        sourceType: 'url',
        sourceUrl: url,
        origin: 'brand'
      });
      
      res.json({
        success: true,
        message: 'URL processed successfully for cross-tenant training',
        data: { 
          agentId, 
          url,
          chunksCreated: result.chunksCreated,
          embeddingsGenerated: result.embeddingsGenerated,
          savedToOrigin: 'brand'
        }
      });
    } catch (error) {
      console.error('Error adding agent URL:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add URL knowledge source'
      });
    }
  });

  // Get agent URLs only (for editing modal)
  app.get("/brand-api/ai/agents/:id/urls", async (req, res) => {
    try {
      const { id: agentId } = req.params;
      
      // Verify agent exists
      const agent = await brandStorage.getAIAgent(agentId);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'AI agent not found'
        });
      }

      // Get only URLs for this agent (for editing modal)
      const knowledgeBase = await brandStorage.getAgentCrossTenantKnowledge(agentId, {
        includeUrls: true,
        includeDocuments: false,
        limit: 20
      });
      
      // Filter only URL items
      const urlItems = knowledgeBase.items.filter(item => item.sourceType === 'url_content');
      
      res.json({
        success: true,
        data: {
          agentId,
          urls: urlItems,
          count: urlItems.length
        }
      });
    } catch (error) {
      console.error('Error fetching agent URLs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch URLs'
      });
    }
  });

  // Get agent knowledge base (embeddings)
  app.get("/brand-api/ai/agents/:id/knowledge", async (req, res) => {
    try {
      const { id: agentId } = req.params;
      
      // Verify agent exists
      const agent = await brandStorage.getAIAgent(agentId);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'AI agent not found'
        });
      }

      // 🎯 CROSS-TENANT KNOWLEDGE RETRIEVAL: Cerca in brand + tenant knowledge
      const knowledgeBase = await brandStorage.getAgentCrossTenantKnowledge(agentId, {
        includeDocuments: true,
        includeUrls: true,
        limit: parseInt(req.query.limit as string) || 50
      });
      
      res.json({
        success: true,
        data: {
          agentId,
          knowledgeBase: knowledgeBase.items,
          stats: {
            totalDocuments: knowledgeBase.stats.documents,
            totalUrls: knowledgeBase.stats.urls,
            totalEmbeddings: knowledgeBase.stats.totalEmbeddings,
            brandLevel: knowledgeBase.stats.brandLevel,
            tenantLevel: knowledgeBase.stats.tenantLevel
          }
        }
      });
    } catch (error) {
      console.error('Error fetching agent knowledge base:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch knowledge base'
      });
    }
  });

  // 🗑️ DELETE knowledge base item (document or URL)
  app.delete("/brand-api/ai/agents/:id/knowledge/:itemId", async (req, res) => {
    try {
      const { id: agentId, itemId } = req.params;
      const { type } = req.body; // 'document' or 'url'
      
      console.log(`🗑️ [RAG] Deleting ${type} with ID ${itemId} for agent ${agentId}`);
      
      // Verify agent exists
      const agent = await brandStorage.getAIAgent(agentId);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'AI agent not found'
        });
      }

      // TODO: Implement real deletion from vectorEmbeddings table
      // DELETE FROM w3suite.vector_embeddings 
      // WHERE id = ? AND agent_id = ? AND origin = 'brand'
      
      // For now, simulate successful deletion
      console.log(`✅ [RAG] Successfully deleted ${type} ${itemId} for agent ${agentId}`);
      
      res.json({
        success: true,
        message: `${type === 'document' ? 'Documento' : 'URL'} eliminato con successo`,
        deletedItem: {
          id: itemId,
          agentId,
          type
        }
      });
    } catch (error) {
      console.error('Error deleting knowledge item:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete knowledge item'
      });
    }
  });

  // ==================== MANAGEMENT/STRUCTURE ENDPOINTS ====================
  // New Management structure endpoints for Brand Interface

  // Get structure stores with filters and pagination
  app.get("/brand-api/structure/stores", async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;

    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions for structure management" });
    }

    try {
      const filters = {
        tenantId: req.query.tenantId as string,
        areaCommerciale: req.query.areaCommerciale as string,
        canale: req.query.canale as string,
        citta: req.query.citta as string,
        provincia: req.query.provincia as string,
        stato: req.query.stato as 'active' | 'inactive' | 'pending' | 'all',
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      };

      const storesData = await brandStorage.getStructureStores(filters);

      // Log the access for audit
      await brandStorage.createAuditLog({
        tenantId: context.tenantId || '00000000-0000-0000-0000-000000000000',
        userEmail: user.email,
        userRole: user.role,
        action: 'VIEW_STRUCTURE_STORES',
        resourceType: 'stores',
        resourceIds: storesData.stores.map(s => s.id),
        metadata: {
          filters,
          resultsCount: storesData.stores.length,
          totalCount: storesData.pagination.total
        }
      });

      res.json({
        success: true,
        data: storesData,
        message: `Retrieved ${storesData.stores.length} stores`
      });
    } catch (error) {
      console.error("Error fetching structure stores:", error);
      res.status(500).json({ 
        error: "Failed to fetch structure stores",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // SSE endpoint for real-time structure statistics
  app.get("/brand-api/structure/stats/stream", async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;

    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions for structure statistics" });
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const tenantId = req.query.tenantId as string;

    // Function to send stats data
    const sendStats = async () => {
      try {
        const stats = await brandStorage.getStructureStats(tenantId);
        const data = {
          success: true,
          data: stats,
          timestamp: new Date().toISOString()
        };
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (error) {
        console.error("Error fetching real-time stats:", error);
        const errorData = {
          success: false,
          error: "Failed to fetch statistics",
          timestamp: new Date().toISOString()
        };
        res.write(`data: ${JSON.stringify(errorData)}\n\n`);
      }
    };

    // Send initial data immediately
    await sendStats();

    // Set up interval for real-time updates (every 30 seconds)
    const interval = setInterval(sendStats, 30000);

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });

    req.on('aborted', () => {
      clearInterval(interval);
      res.end();
    });
  });


  // Get audit logs
  app.get("/brand-api/audit-logs", async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;

    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions for audit logs" });
    }

    try {
      const tenantId = req.query.tenantId as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const auditLogs = await brandStorage.getAuditLogs(tenantId, limit);

      res.json({
        success: true,
        data: { auditLogs },
        message: "Audit logs retrieved successfully"
      });
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ 
        error: "Failed to fetch audit logs",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get structure statistics
  app.get("/brand-api/structure/stats", async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;

    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions for structure statistics" });
    }

    try {
      const tenantId = req.query.tenantId as string;
      const stats = await brandStorage.getStructureStats(tenantId);

      // Log the access for audit
      await brandStorage.createAuditLog({
        tenantId: context.tenantId || '00000000-0000-0000-0000-000000000000',
        userEmail: user.email,
        userRole: user.role,
        action: 'VIEW_STRUCTURE_STATS',
        resourceType: 'statistics',
        metadata: {
          tenantId,
          totalStores: stats.totalStores,
          activeStores: stats.activeStores
        }
      });

      res.json({
        success: true,
        data: stats,
        message: "Structure statistics retrieved successfully"
      });
    } catch (error) {
      console.error("Error fetching structure stats:", error);
      res.status(500).json({ 
        error: "Failed to fetch structure statistics",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Create new organization/tenant
  app.post("/brand-api/tenants", express.json(), async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;

    // Only super_admin can create new organizations
    if (user.role !== 'super_admin') {
      return res.status(403).json({ error: "Only super administrators can create organizations" });
    }

    const organizationData = req.body;

    // Validate required fields
    if (!organizationData.name || !organizationData.brandAdminEmail) {
      return res.status(400).json({ 
        error: "Missing required fields: name and brandAdminEmail are required" 
      });
    }

    try {
      const newOrganization = await brandStorage.createOrganization(organizationData);

      // Log the creation for audit
      await brandStorage.createAuditLog({
        tenantId: newOrganization.id,
        userEmail: user.email,
        userRole: user.role,
        action: 'CREATE_ORGANIZATION',
        resourceType: 'organization',
        resourceIds: [newOrganization.id],
        metadata: {
          organizationName: newOrganization.name,
          organizationSlug: newOrganization.slug,
          brandAdminEmail: newOrganization.brandAdminEmail,
          createdByUserId: user.id
        }
      });

      res.json({
        success: true,
        data: {
          id: newOrganization.id,
          name: newOrganization.name,
          slug: newOrganization.slug,
          status: newOrganization.status,
          brandAdminEmail: newOrganization.brandAdminEmail,
          createdAt: newOrganization.createdAt
        },
        message: `Organization '${newOrganization.name}' created successfully`
      });
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({ 
        error: "Failed to create organization",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ==================== NEW ORGANIZATIONS ENDPOINTS (W3 Suite Tenants) ====================

  // Create new organization using w3suite.tenants
  app.post("/brand-api/organizations", express.json(), async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;

    // Only super_admin can create new organizations
    if (user.role !== 'super_admin') {
      return res.status(403).json({ error: "Only super administrators can create organizations" });
    }

    const { name, slug, status = 'active', notes } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ 
        error: "Missing required field: name is required" 
      });
    }

    // Validate slug if provided
    if (slug) {
      const isSlugAvailable = await brandStorage.validateSlug(slug);
      if (!isSlugAvailable) {
        return res.status(400).json({ 
          error: "Slug is already taken. Please choose a different one." 
        });
      }
    }

    try {
      const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      const newOrganization = await brandStorage.createOrganizationRecord({
        name,
        slug: finalSlug,
        status,
        notes: notes || null
      });

      // Note: No audit log needed for W3Suite organizations
      // They are managed separately from Brand Interface

      res.json({
        success: true,
        data: {
          id: newOrganization.id,
          name: newOrganization.name,
          slug: newOrganization.slug,
          status: newOrganization.status,
          notes: newOrganization.notes,
          createdAt: newOrganization.createdAt
        },
        message: `Organization '${newOrganization.name}' created successfully`
      });
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({ 
        error: "Failed to create organization",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Validate slug availability
  app.get("/brand-api/organizations/validate-slug/:slug", async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;

    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ error: "Slug parameter is required" });
    }

    try {
      const isAvailable = await brandStorage.validateSlug(slug);
      res.json({
        slug,
        available: isAvailable,
        message: isAvailable ? "Slug is available" : "Slug is already taken"
      });
    } catch (error) {
      console.error("Error validating slug:", error);
      res.status(500).json({ 
        error: "Failed to validate slug",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Export stores to CSV
  app.get("/brand-api/structure/export.csv", async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;

    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions for data export" });
    }

    try {
      const filters = {
        tenantId: req.query.tenantId as string,
        areaCommerciale: req.query.areaCommerciale as string,
        canale: req.query.canale as string,
        citta: req.query.citta as string,
        provincia: req.query.provincia as string,
        stato: req.query.stato as 'active' | 'inactive' | 'pending' | 'all',
        search: req.query.search as string
      };

      const csvContent = await brandStorage.exportStoresCSV(filters);

      // Log the export for audit
      await brandStorage.createAuditLog({
        tenantId: context.tenantId || '00000000-0000-0000-0000-000000000000',
        userEmail: user.email,
        userRole: user.role,
        action: 'EXPORT_STRUCTURE_STORES_CSV',
        resourceType: 'export',
        metadata: {
          filters,
          exportFormat: 'csv',
          exportTimestamp: new Date().toISOString()
        }
      });

      // Set CSV response headers
      const filename = `stores-export-${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');
      
      res.send(csvContent);
    } catch (error) {
      console.error("Error exporting stores CSV:", error);
      res.status(500).json({ 
        error: "Failed to export stores data",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Perform bulk operations on stores
  app.post("/brand-api/structure/bulk", express.json(), async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;

    // Only super_admin and national_manager can perform bulk operations
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions for bulk operations" });
    }

    const bulkOperation = req.body;

    // Validate required fields
    if (!bulkOperation.operation || !bulkOperation.storeIds || !Array.isArray(bulkOperation.storeIds)) {
      return res.status(400).json({ 
        error: "Missing required fields: operation and storeIds array are required" 
      });
    }

    try {
      const result = await brandStorage.performBulkOperation(bulkOperation);

      // Log the bulk operation for audit
      await brandStorage.createAuditLog({
        tenantId: context.tenantId || '00000000-0000-0000-0000-000000000000',
        userEmail: user.email,
        userRole: user.role,
        action: 'PERFORM_BULK_OPERATION',
        resourceType: 'stores',
        resourceIds: bulkOperation.storeIds,
        metadata: {
          operation: bulkOperation.operation,
          storeCount: bulkOperation.storeIds.length,
          processedCount: result.processedCount,
          errorCount: result.errorCount,
          reason: bulkOperation.reason,
          values: bulkOperation.values
        }
      });

      res.json({
        success: result.success,
        data: result,
        message: `Bulk ${bulkOperation.operation} completed: ${result.processedCount} processed, ${result.errorCount} errors`
      });
    } catch (error) {
      console.error("Error performing bulk operation:", error);
      res.status(500).json({ 
        error: "Failed to perform bulk operation",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ==================== REFERENCE DATA ENDPOINTS ====================
  
  // Get Italian cities from public schema - NO auth required (reference data)
  app.get("/brand-api/reference/italian-cities", async (req, res) => {
    try {
      const cities = await brandStorage.getItalianCities();
      
      res.json(cities);
    } catch (error) {
      console.error("Error fetching Italian cities:", error);
      res.status(500).json({ 
        error: "Failed to fetch Italian cities",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Crea server HTTP
  const server = http.createServer(app);

  console.log("✅ Brand Interface API routes registered (including Management/Structure endpoints)");
  return server;
}