import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// OAuth legacy system removed - using only OAuth2 enterprise
import { setupOAuth2Server } from "./oauth2-server";
import { dashboardService } from "./dashboard-service";
import { tenantMiddleware, validateTenantAccess, addTenantToData } from "../middleware/tenantMiddleware";
import { rbacMiddleware, requirePermission } from "../middleware/tenant";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { createAuditMiddleware } from "../middleware/audit";
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('CRITICAL: JWT_SECRET environment variable is not set. Using default for development only.');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  // Only in development
  JWT_SECRET = "w3suite-dev-secret-2025";
  process.env.JWT_SECRET = JWT_SECRET;
}
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export async function registerRoutes(app: Express): Promise<Server> {
  
  // CRITICAL ISOLATION: Reject Brand Interface routes with 404
  // W3 Suite (port 5000) must NOT handle Brand Interface paths
  app.use((req, res, next) => {
    // Reject any Brand Interface paths - they belong to port 5001 only
    if (req.path.startsWith('/brandinterface') || 
        req.path.startsWith('/brand-api')) {
      console.warn(`[SECURITY] W3 Suite rejecting Brand Interface path: ${req.path}`);
      return res.status(404).json({ 
        error: 'not_found',
        message: 'Resource not found on W3 Suite',
        hint: 'Brand Interface is available on port 5001'
      });
    }
    next();
  });
  
  // Apply audit logging middleware for critical operations
  app.use(createAuditMiddleware());
  
  // Setup OAuth2 Authorization Server (Enterprise)
  setupOAuth2Server(app);
  
  // Apply tenant middleware to all API routes except auth and OAuth2
  app.use((req, res, next) => {
    // Skip tenant middleware only for auth routes and OAuth2 routes
    if (req.path.startsWith('/api/auth/') || 
        req.path.startsWith('/oauth2/') || 
        req.path.startsWith('/.well-known/')) {
      return next();
    }
    // Apply tenant middleware for all other API routes (including stores, users, roles, etc.)
    // The tenant context will be set from headers or user context
    if (req.path.startsWith('/api/')) {
      return tenantMiddleware(req, res, next);
    }
    next();
  });
  
  // Only OAuth2 endpoints are available - legacy auth endpoints removed

  // Enterprise JWT Authentication Middleware with OAuth2 compatibility
  const enterpriseAuth = async (req: any, res: any, next: any) => {
    const startTime = Date.now();
    
    try {
      // In development/demo mode, allow bypass for testing
      if (process.env.NODE_ENV === 'development') {
        // Check for demo session header (for testing)
        const demoUser = req.headers['x-demo-user'];
        if (demoUser) {
          const tenantId = req.headers['x-tenant-id'] || '00000000-0000-0000-0000-000000000001';
          req.user = {
            id: 'demo-user',
            email: demoUser || 'admin@w3suite.com',
            tenantId: tenantId,
            roles: ['admin'],
            permissions: [],
            capabilities: [],
            scope: 'openid profile email'
          };
          console.log(`[AUTH-DEMO] ${req.method} ${req.path} - User: ${req.user.email} - Tenant: ${tenantId}`);
          
          // Set RLS context for demo user
          try {
            await db.execute(sql.raw(`SET LOCAL app.current_tenant = '${tenantId}'`));
            console.log(`[RLS] Set tenant context: ${tenantId}`);
          } catch (rlsError) {
            console.log(`[RLS] Could not set tenant context: ${rlsError}`);
          }
          
          return next();
        }
        
        // Check for authenticated session from OAuth2 login
        const sessionAuth = req.headers['x-auth-session'];
        if (sessionAuth === 'authenticated') {
          const tenantId = req.headers['x-tenant-id'] || '00000000-0000-0000-0000-000000000001';
          req.user = {
            id: 'session-user',
            email: 'admin@w3suite.com',
            tenantId: tenantId,
            roles: ['admin'],
            permissions: [],
            capabilities: [],
            scope: 'openid profile email'
          };
          console.log(`[AUTH-SESSION] ${req.method} ${req.path} - Session User - Tenant: ${tenantId}`);
          
          // Set RLS context for session user
          try {
            await db.execute(sql.raw(`SET LOCAL app.current_tenant = '${tenantId}'`));
            console.log(`[RLS] Set tenant context: ${tenantId}`);
          } catch (rlsError) {
            console.log(`[RLS] Could not set tenant context: ${rlsError}`);
          }
          
          return next();
        }
      }
      
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ 
          error: 'unauthorized',
          message: 'No authentication token provided',
          loginUrl: '/oauth2/authorize'
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
          loginUrl: '/oauth2/authorize'
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
          loginUrl: '/oauth2/authorize'
        });
      }
      
      return res.status(401).json({ 
        error: 'invalid_token',
        message: 'Invalid token',
        loginUrl: '/oauth2/authorize'
      });
    }
  };

  // Combined middleware for authentication + RBAC
  const authWithRBAC = [enterpriseAuth, rbacMiddleware];

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


  // ==================== TENANT MANAGEMENT API ====================
  
  // Get all tenants (for admin/multi-tenant views)
  app.get('/api/tenants', ...authWithRBAC, async (req: any, res) => {
    try {
      // In a real enterprise app, this would check permissions
      // For demo, return the current user's tenant
      const tenantId = req.user?.tenantId || '00000000-0000-0000-0000-000000000001';
      const tenant = await storage.getTenant(tenantId);
      
      if (!tenant) {
        return res.json([]);
      }
      
      // Return as array for compatibility with frontend expecting multiple tenants
      res.json([tenant]);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ error: "Failed to fetch tenants" });
    }
  });
  
  // Get tenant info
  app.get('/api/tenants/:id', enterpriseAuth, async (req, res) => {
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
  app.post('/api/tenants', enterpriseAuth, async (req, res) => {
    try {
      const tenant = await storage.createTenant(req.body);
      res.status(201).json(tenant);
    } catch (error) {
      console.error("Error creating tenant:", error);
      res.status(500).json({ error: "Failed to create tenant" });
    }
  });

  // ==================== STORE MANAGEMENT API ====================

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
  app.get('/api/stores', ...authWithRBAC, async (req: any, res) => {
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
  app.get('/api/tenants/:tenantId/stores', enterpriseAuth, async (req, res) => {
    try {
      const stores = await storage.getStoresByTenant(req.params.tenantId);
      res.json(stores);
    } catch (error) {
      console.error("Error fetching stores:", error);
      res.status(500).json({ error: "Failed to fetch stores" });
    }
  });

  // Create store (simple endpoint for current tenant)
  app.post('/api/stores', ...authWithRBAC, requirePermission('stores.create'), async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({ error: "No tenant ID available" });
      }
      
      const storeData = { ...req.body, tenantId };
      const store = await storage.createStore(storeData);
      res.status(201).json(store);
    } catch (error) {
      console.error("Error creating store:", error);
      res.status(500).json({ error: "Failed to create store" });
    }
  });

  // Update store
  app.put('/api/stores/:id', ...authWithRBAC, requirePermission('stores.update'), async (req: any, res) => {
    try {
      const store = await storage.updateStore(req.params.id, req.body);
      res.json(store);
    } catch (error: any) {
      console.error("Error updating store:", error);
      if (error.message?.includes('not found')) {
        res.status(404).json({ error: "Store not found" });
      } else {
        res.status(500).json({ error: "Failed to update store" });
      }
    }
  });

  // Delete store
  app.delete('/api/stores/:id', ...authWithRBAC, requirePermission('stores.delete'), async (req: any, res) => {
    try {
      await storage.deleteStore(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting store:", error);
      if (error.message?.includes('not found')) {
        res.status(404).json({ error: "Store not found" });
      } else {
        res.status(500).json({ error: "Failed to delete store" });
      }
    }
  });

  // Create store (legacy endpoint with tenantId parameter)
  app.post('/api/tenants/:tenantId/stores', enterpriseAuth, async (req, res) => {
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

  // Update legal entity
  app.put('/api/legal-entities/:id', enterpriseAuth, async (req: any, res) => {
    try {
      const legalEntity = await storage.updateLegalEntity(req.params.id, req.body);
      res.json(legalEntity);
    } catch (error: any) {
      console.error("Error updating legal entity:", error);
      if (error.message?.includes('not found')) {
        res.status(404).json({ error: "Legal entity not found" });
      } else {
        res.status(500).json({ error: "Failed to update legal entity" });
      }
    }
  });
  
  // Delete legal entity
  app.delete('/api/legal-entities/:id', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const legalEntityId = req.params.id;
      
      if (!tenantId) {
        return res.status(400).json({ error: "No tenant ID available" });
      }
      
      await storage.deleteLegalEntity(legalEntityId, tenantId);
      res.status(200).json({ message: "Legal entity deleted successfully" });
    } catch (error) {
      console.error("Error deleting legal entity:", error);
      res.status(500).json({ error: "Failed to delete legal entity" });
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
  app.get('/api/users/:userId/roles', enterpriseAuth, async (req, res) => {
    try {
      const assignments = await storage.getUserAssignments(req.params.userId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching user roles:", error);
      res.status(500).json({ error: "Failed to fetch user roles" });
    }
  });

  // Assign user role
  app.post('/api/users/:userId/roles', enterpriseAuth, async (req, res) => {
    try {
      const assignmentData = { ...req.body, userId: req.params.userId };
      const assignment = await storage.createUserAssignment(assignmentData);
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning user role:", error);
      res.status(500).json({ error: "Failed to assign user role" });
    }
  });

  // ==================== REFERENCE DATA ENDPOINTS ====================
  
  // Get Italian cities
  app.get('/api/italian-cities', async (req, res) => {
    try {
      const cities = await storage.getItalianCities();
      res.json(cities);
    } catch (error) {
      console.error("Error fetching Italian cities:", error);
      res.status(500).json({ error: "Failed to fetch Italian cities" });
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
  app.get('/api/dashboard/metrics', enterpriseAuth, async (req, res) => {
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
  app.get('/api/crm/customers', enterpriseAuth, async (req, res) => {
    try {
      // TODO: Implement CRM customer management
      res.json({ customers: [], total: 0 });
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  // POS endpoints  
  app.get('/api/pos/transactions', enterpriseAuth, async (req, res) => {
    try {
      // TODO: Implement POS transaction management
      res.json({ transactions: [], total: 0 });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Inventory endpoints
  app.get('/api/inventory/products', enterpriseAuth, async (req, res) => {
    try {
      // TODO: Implement inventory management
      res.json({ products: [], total: 0 });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Analytics endpoints
  app.get('/api/analytics/reports', enterpriseAuth, async (req, res) => {
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

  // ==================== RBAC MANAGEMENT API ====================
  
  // Get all roles for the current tenant
  app.get('/api/roles', ...authWithRBAC, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      
      if (!tenantId) {
        return res.status(400).json({ error: "No tenant ID available" });
      }
      
      const roles = await storage.getRolesByTenant(tenantId);
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  // Create a new role
  app.post('/api/roles', ...authWithRBAC, requirePermission('admin.roles.create'), async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      
      if (!tenantId) {
        return res.status(400).json({ error: "No tenant ID available" });
      }
      
      const { rbacStorage } = await import('../core/rbac-storage.js');
      const role = await rbacStorage.createRole(tenantId, req.body);
      res.status(201).json(role);
    } catch (error) {
      console.error("Error creating role:", error);
      res.status(500).json({ error: "Failed to create role" });
    }
  });

  // Update a role
  app.put('/api/roles/:roleId', ...authWithRBAC, requirePermission('admin.roles.update'), async (req: any, res) => {
    try {
      const { rbacStorage } = await import('../core/rbac-storage.js');
      const role = await rbacStorage.updateRole(req.params.roleId, req.body);
      res.json(role);
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  // Delete a role
  app.delete('/api/roles/:roleId', ...authWithRBAC, requirePermission('admin.roles.delete'), async (req: any, res) => {
    try {
      const { rbacStorage } = await import('../core/rbac-storage.js');
      await rbacStorage.deleteRole(req.params.roleId);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting role:", error);
      if (error.message?.includes('system role')) {
        res.status(403).json({ error: "Cannot delete system role" });
      } else {
        res.status(500).json({ error: "Failed to delete role" });
      }
    }
  });

  // Get permissions for a role
  app.get('/api/roles/:roleId/permissions', enterpriseAuth, async (req: any, res) => {
    try {
      const { rbacStorage } = await import('../core/rbac-storage.js');
      const permissions = await rbacStorage.getRolePermissions(req.params.roleId);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      res.status(500).json({ error: "Failed to fetch role permissions" });
    }
  });

  // Set permissions for a role
  app.put('/api/roles/:roleId/permissions', enterpriseAuth, async (req: any, res) => {
    try {
      const { rbacStorage } = await import('../core/rbac-storage.js');
      await rbacStorage.setRolePermissions(req.params.roleId, req.body.permissions || []);
      res.json({ message: "Permissions updated successfully" });
    } catch (error) {
      console.error("Error updating role permissions:", error);
      res.status(500).json({ error: "Failed to update role permissions" });
    }
  });

  // Get user roles and permissions
  app.get('/api/users/:userId/permissions', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      
      if (!tenantId) {
        return res.status(400).json({ error: "No tenant ID available" });
      }
      
      const { rbacStorage } = await import('../core/rbac-storage.js');
      const roles = await rbacStorage.getUserRoles(req.params.userId, tenantId);
      const permissions = await rbacStorage.getUserPermissions(req.params.userId, tenantId);
      
      res.json({
        roles,
        permissions
      });
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ error: "Failed to fetch user permissions" });
    }
  });

  // Assign role to user
  app.post('/api/users/:userId/roles/:roleId', enterpriseAuth, async (req: any, res) => {
    try {
      const { rbacStorage } = await import('../core/rbac-storage.js');
      const assignmentData = {
        userId: req.params.userId,
        roleId: req.params.roleId,
        scopeType: req.body.scopeType || 'tenant',
        scopeId: req.body.scopeId || req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID,
        expiresAt: req.body.expiresAt
      };
      
      await rbacStorage.assignRoleToUser(assignmentData);
      res.status(201).json({ message: "Role assigned successfully" });
    } catch (error) {
      console.error("Error assigning role:", error);
      res.status(500).json({ error: "Failed to assign role" });
    }
  });

  // Remove role from user
  app.delete('/api/users/:userId/roles/:roleId', enterpriseAuth, async (req: any, res) => {
    try {
      const { rbacStorage } = await import('../core/rbac-storage.js');
      const scopeType = req.query.scopeType as string || 'tenant';
      const scopeId = req.query.scopeId as string || req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      
      await rbacStorage.removeRoleFromUser(
        req.params.userId,
        req.params.roleId,
        scopeType,
        scopeId
      );
      res.status(204).send();
    } catch (error) {
      console.error("Error removing role:", error);
      res.status(500).json({ error: "Failed to remove role" });
    }
  });

  // Grant extra permission to user
  app.post('/api/users/:userId/extra-permissions', enterpriseAuth, async (req: any, res) => {
    try {
      const { rbacStorage } = await import('../core/rbac-storage.js');
      await rbacStorage.grantExtraPermission(
        req.params.userId,
        req.body.permission,
        req.body.expiresAt
      );
      res.status(201).json({ message: "Permission granted successfully" });
    } catch (error) {
      console.error("Error granting permission:", error);
      res.status(500).json({ error: "Failed to grant permission" });
    }
  });

  // Revoke extra permission from user
  app.delete('/api/users/:userId/extra-permissions/:permission', enterpriseAuth, async (req: any, res) => {
    try {
      const { rbacStorage } = await import('../core/rbac-storage.js');
      await rbacStorage.clearExtraPermission(
        req.params.userId,
        req.params.permission
      );
      res.status(204).send();
    } catch (error) {
      console.error("Error revoking permission:", error);
      res.status(500).json({ error: "Failed to revoke permission" });
    }
  });

  // Initialize system roles for a tenant
  app.post('/api/rbac/initialize', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      
      if (!tenantId) {
        return res.status(400).json({ error: "No tenant ID available" });
      }
      
      const { rbacStorage } = await import('../core/rbac-storage.js');
      await rbacStorage.initializeSystemRoles(tenantId);
      res.json({ message: "System roles initialized successfully" });
    } catch (error) {
      console.error("Error initializing system roles:", error);
      res.status(500).json({ error: "Failed to initialize system roles" });
    }
  });

  // Get all available permissions (from registry)
  app.get('/api/permissions', enterpriseAuth, async (req: any, res) => {
    try {
      const { PERMISSIONS } = await import('../core/permissions/registry.js');
      res.json(PERMISSIONS);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
