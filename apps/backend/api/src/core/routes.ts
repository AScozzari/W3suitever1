import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupOAuthRoutes, requireAuth, requirePermission } from "./oauth";
import { setupOAuth2Server } from "./oauth2-server";
import { dashboardService } from "./dashboard-service";
import { tenantMiddleware, validateTenantAccess, addTenantToData } from "../middleware/tenantMiddleware";
import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "w3suite-secret-key-2025";
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Setup OAuth2 Authorization Server (Enterprise)
  setupOAuth2Server(app);
  
  // Apply tenant middleware to all API routes except auth, oauth2 and stores
  app.use((req, res, next) => {
    // Skip tenant middleware for auth routes, OAuth2 routes and stores (handled individually)
    if (req.path.startsWith('/api/auth/') || 
        req.path.startsWith('/oauth2/') || 
        req.path.startsWith('/.well-known/') ||
        req.path === '/api/stores') {
      return next();
    }
    // Apply tenant middleware for other API routes
    if (req.path.startsWith('/api/')) {
      return tenantMiddleware(req, res, next);
    }
    next();
  });
  
  // Logout endpoint to clear localStorage
  app.post("/api/auth/logout", async (req: any, res) => {
    res.json({ message: "Logout successful" });
  });

  // Debug endpoint to check auth status
  app.get("/api/auth/debug", async (req: any, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    const tenantId = req.headers['x-tenant-id'];
    
    res.json({ 
      hasToken: !!token, 
      tenantId: tenantId,
      tokenPreview: token ? token.substring(0, 20) + '...' : null
    });
  });

  // Development OAuth2-style authentication (local mock)
  app.post("/api/auth/login", async (req: any, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username e password richiesti" });
      }
      
      // Per development, accetta admin/admin123 con OAuth2 enterprise structure
      if (username === 'admin' && password === 'admin123') {
        const expirationTime = Math.floor(Date.now() / 1000) + (30 * 60); // 30 minuti
        
        // Enterprise OAuth2 session structure compatible with enterpriseAuth
        const oauthSession = {
          userId: 'admin-user',
          email: 'admin@w3suite.com',
          tenantId: '00000000-0000-0000-0000-000000000001',
          roles: ['super_admin', 'tenant_admin'],
          permissions: ['*'], // All permissions
          capabilities: ['*'],
          scope: 'tenant', // Enterprise scope
          expiresAt: expirationTime,
          issuedAt: Math.floor(Date.now() / 1000),
          issuer: 'w3suite-dev'
        };
        
        // Create enterprise JWT token using jsonwebtoken (consistent with enterpriseAuth)
        const token = jwt.sign(oauthSession, JWT_SECRET, { 
          expiresIn: "30m",
          issuer: 'w3suite-dev',
          audience: 'w3suite-frontend'
        });
        
        // OAuth2 response structure
        return res.json({ 
          access_token: token,
          token_type: 'Bearer',
          expires_in: 1800, // 30 minutes
          scope: 'openid profile email tenant_access',
          user: {
            id: 'admin-user',
            email: 'admin@w3suite.com',
            firstName: 'Admin',
            lastName: 'User',
            tenantId: '00000000-0000-0000-0000-000000000001',
            roles: ['super_admin', 'tenant_admin']
          }
        });
      }
      
      return res.status(401).json({ message: "Credenziali non valide" });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Errore durante il login" });
    }
  });

  // Session endpoint with tenant info
  app.get('/api/auth/session', async (req: any, res) => {
    // Check for auth token
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: "Non autenticato" });
    }
    
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Mock session data with tenant information
      const sessionData = {
        user: {
          id: decoded.id || 'admin-user',
          email: decoded.email || 'admin@w3suite.com',
          firstName: 'Admin',
          lastName: 'User',
          tenantId: decoded.tenantId || '00000000-0000-0000-0000-000000000001',
          tenant: {
            id: decoded.tenantId || '00000000-0000-0000-0000-000000000001',
            name: 'Demo Organization',
            code: 'DEMO001',
            plan: 'Enterprise',
            isActive: true
          },
          roles: ['admin', 'manager'] // Ruoli dell'utente
        }
      };
      
      res.json(sessionData);
    } catch (error) {
      console.error("Session error:", error);
      return res.status(401).json({ message: "Token non valido" });
    }
  });

  // Keep the old endpoint for backward compatibility
  app.get('/api/auth/user', async (req: any, res) => {
    // Check for auth token
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: "Non autenticato" });
    }
    
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const mockUser = {
        id: decoded.id || 'admin-user', 
        email: decoded.email || 'admin@w3suite.com',
        firstName: 'Admin',
        lastName: 'User',
        tenantId: decoded.tenantId || '00000000-0000-0000-0000-000000000001'
      };
      
      res.json(mockUser);
    } catch (error) {
      return res.status(401).json({ message: "Token non valido" });
    }
  });
  
  // Setup OAuth2/OIDC authentication
  setupOAuthRoutes(app);

  // ==================== TENANT MANAGEMENT API ====================
  
  // Get tenant info
  app.get('/api/tenants/:id', requireAuth(), requirePermission('tenant.view'), async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ error: 'tenant_not_found' });
      }
      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant:", error);
      res.status(500).json({ error: "Failed to fetch tenant" });
    }
  });

  // Create tenant
  app.post('/api/tenants', requireAuth(), requirePermission('tenant.create'), async (req, res) => {
    try {
      const tenant = await storage.createTenant(req.body);
      res.status(201).json(tenant);
    } catch (error) {
      console.error("Error creating tenant:", error);
      res.status(500).json({ error: "Failed to create tenant" });
    }
  });

  // ==================== STORE MANAGEMENT API ====================
  
  // Enterprise JWT Authentication Middleware with OAuth2 compatibility
  const enterpriseAuth = async (req: any, res: any, next: any) => {
    const startTime = Date.now();
    
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ 
          error: 'unauthorized',
          message: 'No authentication token provided',
          loginUrl: '/api/auth/login'
        });
      }
      
      // Enterprise JWT verification with OAuth2 standard support
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // OAuth2 standard: use 'sub' field for user identification
      if (!decoded.sub && !decoded.userId) {
        return res.status(401).json({ 
          error: 'invalid_token',
          message: 'Invalid token structure - missing subject',
          loginUrl: '/oauth2/authorize'
        });
      }
      
      // Check token expiration (enterprise standard)
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && now >= decoded.exp) {
        return res.status(401).json({ 
          error: 'token_expired',
          message: 'Token has expired',
          loginUrl: '/api/auth/login'
        });
      }
      
      // Set enterprise user context with OAuth2 standard fields
      req.user = {
        id: decoded.sub || decoded.userId, // OAuth2 standard: 'sub' first
        email: decoded.email,
        tenantId: decoded.tenant_id || decoded.tenantId, // OAuth2 uses snake_case
        clientId: decoded.client_id,
        audience: decoded.aud,
        issuer: decoded.iss,
        roles: decoded.roles || [],
        permissions: decoded.permissions || [],
        capabilities: decoded.capabilities || [],
        scope: decoded.scope // OAuth2 scope string
      };
      
      // Enterprise logging for audit
      console.log(`[AUTH] ${req.method} ${req.path} - User: ${req.user.id} - Tenant: ${req.user.tenantId} - Duration: ${Date.now() - startTime}ms`);
      
      next();
    } catch (error: any) {
      // Enterprise error handling with detailed logging
      console.error(`[AUTH ERROR] ${req.method} ${req.path} - Error: ${error.message} - Duration: ${Date.now() - startTime}ms`);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'token_expired',
          message: 'Token has expired',
          loginUrl: '/api/auth/login'
        });
      }
      
      return res.status(401).json({ 
        error: 'invalid_token',
        message: 'Invalid token',
        loginUrl: '/api/auth/login'
      });
    }
  };

  // Get commercial areas (reference data)
  app.get('/api/commercial-areas', enterpriseAuth, async (req: any, res) => {
    try {
      const areas = await storage.getCommercialAreas();
      res.json(areas);
    } catch (error) {
      console.error("Error fetching commercial areas:", error);
      res.status(500).json({ error: "Failed to fetch commercial areas" });
    }
  });

  // Get stores for current tenant (automatic via middleware)
  app.get('/api/stores', enterpriseAuth, async (req: any, res) => {
    try {
      // Preferisci sempre l'header X-Tenant-ID che contiene l'UUID corretto
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || req.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ error: "No tenant ID available" });
      }
      
      // Valida che il tenantId sia un UUID valido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(tenantId)) {
        console.error("Invalid tenant ID format:", tenantId);
        return res.status(400).json({ error: "Invalid tenant ID format" });
      }
      
      const stores = await storage.getStoresByTenant(tenantId);
      res.json(stores);
    } catch (error) {
      console.error("Error fetching stores:", error);
      res.status(500).json({ error: "Failed to fetch stores" });
    }
  });

  // Get stores for tenant
  app.get('/api/tenants/:tenantId/stores', requireAuth(), requirePermission('store.view'), async (req, res) => {
    try {
      const stores = await storage.getStoresByTenant(req.params.tenantId);
      res.json(stores);
    } catch (error) {
      console.error("Error fetching stores:", error);
      res.status(500).json({ error: "Failed to fetch stores" });
    }
  });

  // Create store
  app.post('/api/tenants/:tenantId/stores', requireAuth(), requirePermission('store.create'), async (req, res) => {
    try {
      const storeData = { ...req.body, tenantId: req.params.tenantId };
      const store = await storage.createStore(storeData);
      res.status(201).json(store);
    } catch (error) {
      console.error("Error creating store:", error);
      res.status(500).json({ error: "Failed to create store" });
    }
  });

  // ==================== LEGAL ENTITIES API ====================
  
  // Get legal entities for current tenant
  app.get('/api/legal-entities', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      
      if (!tenantId) {
        return res.status(400).json({ error: "No tenant ID available" });
      }
      
      const legalEntities = await storage.getLegalEntitiesByTenant(tenantId);
      res.json(legalEntities);
    } catch (error) {
      console.error("Error fetching legal entities:", error);
      res.status(500).json({ error: "Failed to fetch legal entities" });
    }
  });
  
  // Create legal entity
  app.post('/api/legal-entities', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const legalEntityData = { ...req.body, tenantId };
      const legalEntity = await storage.createLegalEntity(legalEntityData);
      res.status(201).json(legalEntity);
    } catch (error) {
      console.error("Error creating legal entity:", error);
      res.status(500).json({ error: "Failed to create legal entity" });
    }
  });

  // ==================== USER MANAGEMENT API ====================
  
  // Get users for current tenant
  app.get('/api/users', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      
      if (!tenantId) {
        return res.status(400).json({ error: "No tenant ID available" });
      }
      
      const users = await storage.getUsersByTenant(tenantId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  
  // Create user
  app.post('/api/users', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const userData = { ...req.body, tenantId, id: `user-${Date.now()}` };
      const user = await storage.upsertUser(userData);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Get user roles
  app.get('/api/users/:userId/roles', requireAuth(), requirePermission('user.view'), async (req, res) => {
    try {
      const assignments = await storage.getUserAssignments(req.params.userId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching user roles:", error);
      res.status(500).json({ error: "Failed to fetch user roles" });
    }
  });

  // Assign user role
  app.post('/api/users/:userId/roles', requireAuth(), requirePermission('user.manage'), async (req, res) => {
    try {
      const assignmentData = { ...req.body, userId: req.params.userId };
      const assignment = await storage.createUserAssignment(assignmentData);
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning user role:", error);
      res.status(500).json({ error: "Failed to assign user role" });
    }
  });

  // ==================== ENTERPRISE API ENDPOINTS ====================

  // Dashboard stats (main dashboard data)
  app.get('/api/dashboard/stats', async (req: any, res) => {
    try {
      // Get tenant ID from user if authenticated
      let tenantId = null;
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1];
      
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          tenantId = decoded.tenantId;
        } catch (error) {
          // Continue without tenant context
        }
      }
      
      const stats = await dashboardService.getStats(tenantId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Dashboard metrics (detailed metrics)
  app.get('/api/dashboard/metrics', requireAuth(), requirePermission('dashboard.view'), async (req, res) => {
    try {
      // TODO: Implement dashboard metrics
      const metrics = {
        totalUsers: 0,
        activeStores: 0,
        monthlyRevenue: 0,
        systemHealth: 'healthy'
      };
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ error: "Failed to fetch dashboard metrics" });
    }
  });

  // CRM endpoints
  app.get('/api/crm/customers', requireAuth(), requirePermission('crm.view'), async (req, res) => {
    try {
      // TODO: Implement CRM customer management
      res.json({ customers: [], total: 0 });
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  // POS endpoints  
  app.get('/api/pos/transactions', requireAuth(), requirePermission('pos.view'), async (req, res) => {
    try {
      // TODO: Implement POS transaction management
      res.json({ transactions: [], total: 0 });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Inventory endpoints
  app.get('/api/inventory/products', requireAuth(), requirePermission('inventory.view'), async (req, res) => {
    try {
      // TODO: Implement inventory management
      res.json({ products: [], total: 0 });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Analytics endpoints
  app.get('/api/analytics/reports', requireAuth(), requirePermission('analytics.view'), async (req, res) => {
    try {
      // TODO: Implement analytics and reporting
      res.json({ reports: [], total: 0 });
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  // ==================== REFERENCE DATA API ====================
  
  // Get all legal forms
  app.get('/api/reference/legal-forms', async (req, res) => {
    try {
      const legalForms = await storage.getLegalForms();
      res.json(legalForms);
    } catch (error) {
      console.error("Error fetching legal forms:", error);
      res.status(500).json({ error: "Failed to fetch legal forms" });
    }
  });

  // Get all countries
  app.get('/api/reference/countries', async (req, res) => {
    try {
      const countries = await storage.getCountries();
      res.json(countries);
    } catch (error) {
      console.error("Error fetching countries:", error);
      res.status(500).json({ error: "Failed to fetch countries" });
    }
  });

  // Get Italian cities
  app.get('/api/reference/italian-cities', async (req, res) => {
    try {
      const cities = await storage.getItalianCities();
      res.json(cities);
    } catch (error) {
      console.error("Error fetching Italian cities:", error);
      res.status(500).json({ error: "Failed to fetch Italian cities" });
    }
  });

  // Get all roles for the current tenant
  app.get('/api/roles', async (req: any, res) => {
    try {
      // Get tenant from token or use demo tenant
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1];
      let tenantId = '00000000-0000-0000-0000-000000000001'; // Default demo tenant
      
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          tenantId = decoded.tenantId || tenantId;
        } catch (error) {
          console.log("Using default tenant for roles");
        }
      }
      
      const roles = await storage.getRolesByTenant(tenantId);
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
