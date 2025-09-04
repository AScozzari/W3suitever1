import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupOAuthRoutes, requireAuth, requirePermission } from "./oauth";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Setup OAuth2/OIDC authentication
  setupOAuthRoutes(app);

  // ==================== TENANT MANAGEMENT API ====================
  
  // Get tenant info
  app.get('/api/tenants/:id', requireAuth(), requirePermission('tenant.view'), async (req: any, res) => {
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
  app.post('/api/tenants', requireAuth(), requirePermission('tenant.create'), async (req: any, res) => {
    try {
      const tenant = await storage.createTenant(req.body);
      res.status(201).json(tenant);
    } catch (error) {
      console.error("Error creating tenant:", error);
      res.status(500).json({ error: "Failed to create tenant" });
    }
  });

  // ==================== STORE MANAGEMENT API ====================
  
  // Get stores for tenant
  app.get('/api/tenants/:tenantId/stores', requireAuth(), requirePermission('store.view'), async (req: any, res) => {
    try {
      const stores = await storage.getStoresByTenant(req.params.tenantId);
      res.json(stores);
    } catch (error) {
      console.error("Error fetching stores:", error);
      res.status(500).json({ error: "Failed to fetch stores" });
    }
  });

  // Create store
  app.post('/api/tenants/:tenantId/stores', requireAuth(), requirePermission('store.create'), async (req: any, res) => {
    try {
      const storeData = { ...req.body, tenantId: req.params.tenantId };
      const store = await storage.createStore(storeData);
      res.status(201).json(store);
    } catch (error) {
      console.error("Error creating store:", error);
      res.status(500).json({ error: "Failed to create store" });
    }
  });

  // ==================== USER MANAGEMENT API ====================

  // Get user roles
  app.get('/api/users/:userId/roles', requireAuth(), requirePermission('user.view'), async (req: any, res) => {
    try {
      const roles = await storage.getUserTenantRoles(req.params.userId);
      res.json(roles);
    } catch (error) {
      console.error("Error fetching user roles:", error);
      res.status(500).json({ error: "Failed to fetch user roles" });
    }
  });

  // Assign user role
  app.post('/api/users/:userId/roles', requireAuth(), requirePermission('user.manage'), async (req: any, res) => {
    try {
      const roleData = { ...req.body, userId: req.params.userId };
      const role = await storage.createUserTenantRole(roleData);
      res.status(201).json(role);
    } catch (error) {
      console.error("Error assigning user role:", error);
      res.status(500).json({ error: "Failed to assign user role" });
    }
  });

  // ==================== ENTERPRISE API ENDPOINTS ====================

  // Dashboard data
  app.get('/api/dashboard/metrics', requireAuth(), requirePermission('dashboard.view'), async (req: any, res) => {
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
  app.get('/api/crm/customers', requireAuth(), requirePermission('crm.view'), async (req: any, res) => {
    try {
      // TODO: Implement CRM customer management
      res.json({ customers: [], total: 0 });
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  // POS endpoints  
  app.get('/api/pos/transactions', requireAuth(), requirePermission('pos.view'), async (req: any, res) => {
    try {
      // TODO: Implement POS transaction management
      res.json({ transactions: [], total: 0 });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Inventory endpoints
  app.get('/api/inventory/products', requireAuth(), requirePermission('inventory.view'), async (req: any, res) => {
    try {
      // TODO: Implement inventory management
      res.json({ products: [], total: 0 });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Analytics endpoints
  app.get('/api/analytics/reports', requireAuth(), requirePermission('analytics.view'), async (req: any, res) => {
    try {
      // TODO: Implement analytics and reporting
      res.json({ reports: [], total: 0 });
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
