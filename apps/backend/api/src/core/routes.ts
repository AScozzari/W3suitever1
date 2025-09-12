import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { login, refresh, getMe, logout, authenticateJWT } from "./auth";
import { dashboardService } from "./dashboard-service";
import { tenantMiddleware, validateTenantAccess, addTenantToData } from "../middleware/tenantMiddleware";
import { rbacMiddleware, requirePermission } from "../middleware/tenant";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { createAuditMiddleware } from "../middleware/audit";
import cookieParser from "cookie-parser";

const JWT_SECRET = process.env.JWT_SECRET || "w3suite-dev-secret-2025";
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Add cookie parser for handling refresh tokens
  app.use(cookieParser());
  
  // Apply audit logging middleware for critical operations
  app.use(createAuditMiddleware());
  
  // JWT Authentication routes (public - no auth required)
  app.post('/api/auth/login', login);
  app.post('/api/auth/refresh', refresh);
  app.post('/api/auth/logout', logout);
  app.get('/api/auth/me', authenticateJWT as any, getMe);
  
  // Apply tenant middleware to all API routes except auth
  app.use((req, res, next) => {
    // Skip tenant middleware only for auth routes
    if (req.path.startsWith('/api/auth/')) {
      return next();
    }
    // Apply tenant middleware for all other API routes
    if (req.path.startsWith('/api/')) {
      return tenantMiddleware(req, res, next);
    }
    next();
  });

  // Simple JWT Authentication Middleware
  const authMiddleware = async (req: any, res: any, next: any) => {
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
            userId: 'demo-user',
            email: demoUser || 'admin@w3suite.com',
            tenantId: tenantId,
            roles: ['admin'],
            permissions: [],
            capabilities: []
          };
          console.log(`[AUTH-DEMO] ${req.method} ${req.path} - User: ${req.user.email} - Tenant: ${tenantId}`);
          
          // Set RLS context for demo user
          try {
            await db.execute(sql.raw(`SET LOCAL app.current_tenant_id = '${tenantId}'`));
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
          message: 'No authentication token provided'
        });
      }
      
      // Use the authenticateJWT middleware from auth.ts
      return authenticateJWT(req as any, res, next);
    } catch (error: any) {
      console.error(`[AUTH ERROR] ${req.method} ${req.path} - Error: ${error.message} - Duration: ${Date.now() - startTime}ms`);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'token_expired',
          message: 'Token has expired'
        });
      }
      
      return res.status(401).json({ 
        error: 'invalid_token',
        message: 'Invalid token'
      });
    }
  };

  // Combined middleware for authentication + RBAC
  const authWithRBAC = [authMiddleware, rbacMiddleware];

  // Session endpoint with tenant info (for compatibility)
  app.get('/api/auth/session', authenticateJWT as any, async (req: any, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non autenticato" });
    }
    
    // Return session data in expected format
    const sessionData = {
      user: {
        id: req.user.userId || req.user.id,
        email: req.user.email,
        firstName: 'Admin',
        lastName: 'User',
        tenantId: req.user.tenantId || '00000000-0000-0000-0000-000000000001',
        tenant: {
          id: req.user.tenantId || '00000000-0000-0000-0000-000000000001',
          name: 'Demo Organization',
          code: 'DEMO001',
          plan: 'Enterprise',
          isActive: true
        },
        roles: req.user.roles || ['admin', 'manager']
      }
    };
    
    res.json(sessionData);
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
  app.get('/api/tenants/:id', authMiddleware, async (req, res) => {
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
  app.post('/api/tenants', authMiddleware, async (req, res) => {
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
  app.get('/api/commercial-areas', authMiddleware, async (req: any, res) => {
    try {
      const areas = await storage.getCommercialAreas();
      res.json(areas);
    } catch (error) {
      console.error("Error fetching commercial areas:", error);
      res.status(500).json({ error: "Failed to fetch commercial areas" });
    }
  });

  // Get stores for current tenant
  app.get('/api/stores', authMiddleware, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      
      if (!tenantId) {
        return res.status(400).json({ error: "No tenant ID available" });
      }
      
      const stores = await storage.getStoresByTenant(tenantId);
      res.json(stores);
    } catch (error) {
      console.error("Error fetching stores:", error);
      res.status(500).json({ error: "Failed to fetch stores" });
    }
  });

  // Get stores for tenant
  app.get('/api/tenants/:tenantId/stores', authMiddleware, async (req, res) => {
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
  app.post('/api/tenants/:tenantId/stores', authMiddleware, async (req, res) => {
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
  app.get('/api/legal-entities', authMiddleware, async (req: any, res) => {
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
  app.post('/api/legal-entities', authMiddleware, async (req: any, res) => {
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
  app.put('/api/legal-entities/:id', authMiddleware, async (req: any, res) => {
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
  app.delete('/api/legal-entities/:id', authMiddleware, async (req: any, res) => {
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
  app.get('/api/users', authMiddleware, async (req: any, res) => {
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
  app.post('/api/users', authMiddleware, async (req: any, res) => {
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
  app.get('/api/users/:userId/roles', authMiddleware, async (req, res) => {
    try {
      const assignments = await storage.getUserAssignments(req.params.userId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching user roles:", error);
      res.status(500).json({ error: "Failed to fetch user roles" });
    }
  });

  // Assign user role
  app.post('/api/users/:userId/roles', authMiddleware, async (req, res) => {
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
        // Use our JWT auth to get tenant
        const tempReq = { headers: { authorization: authHeader } } as any;
        const tempRes = { status: () => ({ json: () => {} }) } as any;
        let userInfo: any = null;
        
        await authenticateJWT(tempReq, tempRes, () => {
          userInfo = tempReq.user;
        });
        
        if (userInfo) {
          tenantId = userInfo.tenantId;
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
  app.get('/api/dashboard/metrics', authMiddleware, async (req, res) => {
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
  app.get('/api/crm/customers', authMiddleware, async (req, res) => {
    try {
      // TODO: Implement CRM customer management
      res.json({ customers: [], total: 0 });
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  // POS endpoints  
  app.get('/api/pos/transactions', authMiddleware, async (req, res) => {
    try {
      // TODO: Implement POS transaction management
      res.json({ transactions: [], total: 0 });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Inventory endpoints
  app.get('/api/inventory/products', authMiddleware, async (req, res) => {
    try {
      // TODO: Implement inventory management
      res.json({ products: [], total: 0 });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Analytics endpoints
  app.get('/api/analytics/reports', authMiddleware, async (req, res) => {
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

  // ==================== ROLES & PERMISSIONS API ====================
  
  // Get all roles
  app.get('/api/roles', authMiddleware, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const roles = await storage.getRolesByTenant(tenantId);
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  // Create role
  app.post('/api/roles', authMiddleware, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const roleData = { ...req.body, tenantId };
      const role = await storage.createRole(roleData);
      res.status(201).json(role);
    } catch (error) {
      console.error("Error creating role:", error);
      res.status(500).json({ error: "Failed to create role" });
    }
  });

  // Update role
  app.put('/api/roles/:id', authMiddleware, async (req, res) => {
    try {
      const role = await storage.updateRole(req.params.id, req.body);
      res.json(role);
    } catch (error: any) {
      console.error("Error updating role:", error);
      if (error.message?.includes('not found')) {
        res.status(404).json({ error: "Role not found" });
      } else {
        res.status(500).json({ error: "Failed to update role" });
      }
    }
  });

  // Delete role
  app.delete('/api/roles/:id', authMiddleware, async (req, res) => {
    try {
      await storage.deleteRole(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting role:", error);
      if (error.message?.includes('not found')) {
        res.status(404).json({ error: "Role not found" });
      } else {
        res.status(500).json({ error: "Failed to delete role" });
      }
    }
  });

  // Get role permissions
  app.get('/api/roles/:roleId/permissions', authMiddleware, async (req, res) => {
    try {
      const permissions = await storage.getRolePermissions(req.params.roleId);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      res.status(500).json({ error: "Failed to fetch role permissions" });
    }
  });

  // Grant permission to role
  app.post('/api/roles/:roleId/permissions', authMiddleware, async (req, res) => {
    try {
      const permissionData = { ...req.body, roleId: req.params.roleId };
      const permission = await storage.grantPermission(permissionData);
      res.status(201).json(permission);
    } catch (error) {
      console.error("Error granting permission:", error);
      res.status(500).json({ error: "Failed to grant permission" });
    }
  });

  // Create server
  const httpServer = createServer(app);
  
  return httpServer;
}