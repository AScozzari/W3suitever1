import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// OAuth legacy system removed - using only OAuth2 enterprise
import { setupOAuth2Server } from "./oauth2-server";
import { dashboardService } from "./dashboard-service";
import { tenantMiddleware, rbacMiddleware, requirePermission } from "../middleware/tenant";
import { correlationMiddleware } from "./logger";
import jwt from "jsonwebtoken";
import { db, setTenantContext } from "./db";
import { sql, eq } from "drizzle-orm";
import { tenants } from "../db/schema";
import { insertStructuredLogSchema, insertLegalEntitySchema, insertStoreSchema, insertUserSchema, insertUserAssignmentSchema, insertRoleSchema, insertTenantSchema, insertNotificationSchema, InsertTenant, InsertLegalEntity, InsertStore, InsertUser, InsertUserAssignment, InsertRole, InsertNotification } from "../db/schema/w3suite";
import { JWT_SECRET, config } from "./config";
import { z } from "zod";
import { handleApiError, validateRequestBody, validateUUIDParam } from "./error-utils";
const DEMO_TENANT_ID = config.DEMO_TENANT_ID;

// Zod validation schemas for logs API
const getLogsQuerySchema = z.object({
  level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).optional(),
  component: z.string().min(1).max(100).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  correlationId: z.string().min(1).max(50).optional(),
  userId: z.string().uuid().optional(),
  page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1)).default('1'),
  limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1).max(1000)).default('50')
});

const createLogBodySchema = insertStructuredLogSchema.omit({ tenantId: true });

// Zod validation schemas for notifications API
const getNotificationsQuerySchema = z.object({
  type: z.enum(['system', 'security', 'data', 'custom']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['unread', 'read']).optional(),
  targetUserId: z.string().uuid().optional(),
  page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1)).default('1'),
  limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1).max(100)).default('20')
});

const createNotificationBodySchema = insertNotificationSchema.omit({ tenantId: true });

const bulkMarkReadBodySchema = z.object({
  notificationIds: z.array(z.string().uuid()).min(1).max(100)
});

export async function registerRoutes(app: Express): Promise<Server> {

  // Setup OAuth2 Authorization Server (Enterprise)
  setupOAuth2Server(app);

  // Apply correlation middleware globally for request tracking
  app.use(correlationMiddleware);

  // Apply tenant middleware to all API routes except auth and OAuth2
  app.use((req, res, next) => {
    // Skip tenant middleware only for auth routes, OAuth2 routes, and health endpoints
    if (req.path.startsWith('/api/auth/') || 
        req.path.startsWith('/oauth2/') || 
        req.path.startsWith('/.well-known/') ||
        req.path === '/api/health' ||
        req.path === '/health' ||
        req.path === '/healthz') {
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

  // Public health endpoints (no authentication required)
  app.get('/api/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      service: 'W3 Suite API', 
      timestamp: new Date().toISOString() 
    });
  });
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      service: 'W3 Suite API', 
      timestamp: new Date().toISOString() 
    });
  });
  app.get('/healthz', (req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      service: 'W3 Suite API', 
      timestamp: new Date().toISOString() 
    });
  });

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
            permissions: ['*'],
            capabilities: [],
            scope: 'openid profile email'
          };
          // Set RLS context for demo user
          try {
            await setTenantContext(tenantId);
          } catch (rlsError) {
            console.error(`[RLS-DEMO] Failed to set tenant context: ${rlsError}`);
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
          // Set RLS context for session user
          try {
            await setTenantContext(tenantId);
          } catch (rlsError) {
            console.error(`[RLS-SESSION] Failed to set tenant context: ${rlsError}`);
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

      // Token format validation before jwt.verify to prevent "jwt malformed" errors
      if (token === 'undefined' || token === 'null' || token === '' || token.length < 10) {
        return res.status(401).json({ 
          error: 'invalid_token',
          message: 'Invalid token format provided',
          loginUrl: '/oauth2/authorize'
        });
      }

      // Basic JWT structure validation: should have 3 parts separated by dots
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        return res.status(401).json({ 
          error: 'invalid_token',
          message: 'Malformed JWT token structure',
          loginUrl: '/oauth2/authorize'
        });
      }

      // Each part should be base64-like (letters, numbers, -, _)
      const base64Pattern = /^[A-Za-z0-9\-_]+$/;
      if (!tokenParts.every((part: string) => part.length > 0 && base64Pattern.test(part))) {
        return res.status(401).json({ 
          error: 'invalid_token',
          message: 'Invalid JWT token encoding',
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

      next();
    } catch (error: any) {
      // Enterprise error handling
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
    // Check for development mode authentication first
    if (process.env.NODE_ENV === 'development') {
      // Check for demo session header (for development)
      const sessionAuth = req.headers['x-auth-session'];
      const demoUser = req.headers['x-demo-user'];
      
      if (sessionAuth === 'authenticated') {
        const tenantId = req.headers['x-tenant-id'] || '00000000-0000-0000-0000-000000000001';
        // Return development session data
        const sessionData = {
          user: {
            id: 'admin-user',
            email: demoUser || 'admin@w3suite.com',
            firstName: 'Admin',
            lastName: 'User',
            tenantId: tenantId,
            tenant: {
              id: tenantId,
              name: 'Demo Organization',
              code: 'DEMO001',
              plan: 'Enterprise',
              isActive: true
            },
            roles: ['admin', 'manager'] // Ruoli dell'utente
          }
        };
        
        return res.json(sessionData);
      }
    }
    
    // Check for auth token (production mode)
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: "Non autenticato" });
    }

    // Token format validation for session endpoint
    if (token === 'undefined' || token === 'null' || token === '' || token.length < 10) {
      return res.status(401).json({ message: "Token non valido" });
    }

    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ message: "Token malformato" });
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

  // Health check endpoint
  app.get("/health", async (req, res) => {
    try {
      // Simple database connectivity check
      await db.select().from(tenants).limit(1);
      return res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "w3-suite-backend",
        version: "1.0.0",
        database: "connected"
      });
    } catch (error) {
      return res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        service: "w3-suite-backend",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Tenant management
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
      // Validate UUID parameter
      if (!validateUUIDParam(req.params.id, 'ID organizzazione', res)) return;

      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ 
          error: 'not_found',
          message: 'Organizzazione non trovata' 
        });
      }
      res.json(tenant);
    } catch (error) {
      handleApiError(error, res, 'recupero informazioni organizzazione');
    }
  });

  // Create tenant
  app.post('/api/tenants', enterpriseAuth, async (req, res) => {
    try {
      // Validate request body with Zod
      const validatedData = validateRequestBody(insertTenantSchema, req.body, res);
      if (!validatedData) return; // Error already sent by validateRequestBody

      const tenant = await storage.createTenant(validatedData as InsertTenant);
      res.status(201).json(tenant);
    } catch (error) {
      handleApiError(error, res, 'creazione organizzazione');
    }
  });

  // ==================== STORE MANAGEMENT API ====================

  // Get commercial areas (reference data)
  app.get('/api/commercial-areas', enterpriseAuth, async (req: any, res) => {
    try {
      const areas = await storage.getCommercialAreas();
      res.json(areas);
    } catch (error) {
      handleApiError(error, res, 'recupero aree commerciali');
    }
  });

  // Get stores for current tenant (automatic via middleware)
  app.get('/api/stores', ...authWithRBAC, async (req: any, res) => {
    try {
      // Preferisci sempre l'header X-Tenant-ID che contiene l'UUID corretto
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || req.tenantId;

      if (!tenantId) {
        return res.status(400).json({
          error: 'missing_tenant',
          message: 'Identificativo organizzazione non disponibile'
        });
      }

      // Valida che il tenantId sia un UUID valido usando utility function
      if (!validateUUIDParam(tenantId, 'Identificativo organizzazione', res)) return;

      const stores = await storage.getStoresByTenant(tenantId);
      res.json(stores);
    } catch (error) {
      handleApiError(error, res, 'recupero negozi');
    }
  });

  // Get stores for tenant
  app.get('/api/tenants/:tenantId/stores', enterpriseAuth, async (req, res) => {
    try {
      // Validate UUID parameter
      if (!validateUUIDParam(req.params.tenantId, 'ID organizzazione', res)) return;

      const stores = await storage.getStoresByTenant(req.params.tenantId);
      res.json(stores);
    } catch (error) {
      handleApiError(error, res, 'recupero negozi per organizzazione');
    }
  });

  // Create store (simple endpoint for current tenant)
  app.post('/api/stores', ...authWithRBAC, requirePermission('stores.create'), async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;

      if (!tenantId) {
        return res.status(400).json({
          error: 'missing_tenant',
          message: 'Identificativo organizzazione non disponibile'
        });
      }

      // Validate request body with Zod
      const validatedData = validateRequestBody(insertStoreSchema, req.body, res);
      if (!validatedData) return; // Error already sent by validateRequestBody

      const storeData = { ...(validatedData as InsertStore), tenantId };
      const store = await storage.createStore(storeData);
      res.status(201).json(store);
    } catch (error) {
      handleApiError(error, res, 'creazione negozio');
    }
  });

  // Update store
  app.put('/api/stores/:id', ...authWithRBAC, requirePermission('stores.update'), async (req: any, res) => {
    try {
      // Validate UUID parameter
      if (!validateUUIDParam(req.params.id, 'ID negozio', res)) return;

      // Validate request body with Zod (make all fields optional for updates)
      const updateSchema = insertStoreSchema.partial();
      const validatedData = validateRequestBody(updateSchema, req.body, res);
      if (!validatedData) return; // Error already sent by validateRequestBody

      const store = await storage.updateStore(req.params.id, validatedData);
      res.json(store);
    } catch (error: any) {
      handleApiError(error, res, 'aggiornamento negozio');
    }
  });

  // Delete store
  app.delete('/api/stores/:id', ...authWithRBAC, requirePermission('stores.delete'), async (req: any, res) => {
    try {
      // Validate UUID parameter
      if (!validateUUIDParam(req.params.id, 'ID negozio', res)) return;

      await storage.deleteStore(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      handleApiError(error, res, 'eliminazione negozio');
    }
  });

  // Create store (legacy endpoint with tenantId parameter)
  app.post('/api/tenants/:tenantId/stores', enterpriseAuth, async (req, res) => {
    try {
      // Validate UUID parameter
      if (!validateUUIDParam(req.params.tenantId, 'ID organizzazione', res)) return;

      // Validate request body with Zod
      const validatedData = validateRequestBody(insertStoreSchema, req.body, res);
      if (!validatedData) return; // Error already sent by validateRequestBody

      const storeData = { ...(validatedData as InsertStore), tenantId: req.params.tenantId };
      const store = await storage.createStore(storeData);
      res.status(201).json(store);
    } catch (error) {
      handleApiError(error, res, 'creazione negozio legacy');
    }
  });

  // ==================== LEGAL ENTITIES API ====================

  // Get legal entities for current tenant
  app.get('/api/legal-entities', ...authWithRBAC, requirePermission('legal_entities.read'), async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;

      if (!tenantId) {
        return res.status(400).json({
          error: 'missing_tenant',
          message: 'Identificativo organizzazione non disponibile'
        });
      }

      const legalEntities = await storage.getLegalEntitiesByTenant(tenantId);
      res.json(legalEntities);
    } catch (error) {
      handleApiError(error, res, 'recupero entità legali');
    }
  });

  // Create legal entity
  app.post('/api/legal-entities', ...authWithRBAC, requirePermission('legal_entities.create'), async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;

      if (!tenantId) {
        return res.status(400).json({
          error: 'missing_tenant',
          message: 'Identificativo organizzazione non disponibile'
        });
      }

      // Validate request body with Zod
      const validatedData = validateRequestBody(insertLegalEntitySchema, req.body, res);
      if (!validatedData) return; // Error already sent by validateRequestBody

      const legalEntityData = { ...(validatedData as InsertLegalEntity), tenantId };
      const legalEntity = await storage.createLegalEntity(legalEntityData);
      res.status(201).json(legalEntity);
    } catch (error) {
      handleApiError(error, res, 'creazione entità legale');
    }
  });

  // Update legal entity
  app.put('/api/legal-entities/:id', ...authWithRBAC, requirePermission('legal_entities.update'), async (req: any, res) => {
    try {
      // Validate UUID parameter
      if (!validateUUIDParam(req.params.id, 'ID entità legale', res)) return;

      // Validate request body with Zod (make tenantId optional for updates)
      const updateSchema = insertLegalEntitySchema.partial();
      const validatedData = validateRequestBody(updateSchema, req.body, res);
      if (!validatedData) return; // Error already sent by validateRequestBody

      const legalEntity = await storage.updateLegalEntity(req.params.id, validatedData);
      res.json(legalEntity);
    } catch (error: any) {
      handleApiError(error, res, 'aggiornamento entità legale');
    }
  });

  // Delete legal entity
  app.delete('/api/legal-entities/:id', ...authWithRBAC, requirePermission('legal_entities.delete'), async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const legalEntityId = req.params.id;

      if (!tenantId) {
        return res.status(400).json({
          error: 'missing_tenant',
          message: 'Identificativo organizzazione non disponibile'
        });
      }

      // Validate UUID parameter
      if (!validateUUIDParam(legalEntityId, 'ID entità legale', res)) return;

      await storage.deleteLegalEntity(legalEntityId, tenantId);
      res.status(200).json({ 
        message: "Entità legale eliminata con successo" 
      });
    } catch (error) {
      handleApiError(error, res, 'eliminazione entità legale');
    }
  });

  // ==================== USER MANAGEMENT API ====================

  // Get users for current tenant
  app.get('/api/users', ...authWithRBAC, requirePermission('users.read'), async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;

      if (!tenantId) {
        return res.status(400).json({
          error: 'missing_tenant',
          message: 'Identificativo organizzazione non disponibile'
        });
      }

      const users = await storage.getUsersByTenant(tenantId);
      res.json(users);
    } catch (error) {
      handleApiError(error, res, 'recupero utenti');
    }
  });

  // Create user
  app.post('/api/users', ...authWithRBAC, requirePermission('users.create'), async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;

      if (!tenantId) {
        return res.status(400).json({
          error: 'missing_tenant',
          message: 'Identificativo organizzazione non disponibile'
        });
      }

      // Validate request body with Zod
      const validatedData = validateRequestBody(insertUserSchema, req.body, res);
      if (!validatedData) return; // Error already sent by validateRequestBody

      // Generate proper user ID if not provided
      const validatedUser = validatedData as InsertUser;
      const userData = { 
        ...validatedUser, 
        tenantId, 
        id: validatedUser.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` 
      };
      
      const user = await storage.upsertUser(userData);
      res.status(201).json(user);
    } catch (error) {
      handleApiError(error, res, 'creazione utente');
    }
  });

  // Get user roles
  app.get('/api/users/:userId/roles', ...authWithRBAC, requirePermission('users.read'), async (req, res) => {
    try {
      // Basic validation for userId parameter
      if (!req.params.userId || req.params.userId.trim() === '') {
        return res.status(400).json({
          error: 'missing_parameter',
          message: 'ID utente non specificato'
        });
      }

      const assignments = await storage.getUserAssignments(req.params.userId);
      res.json(assignments);
    } catch (error) {
      handleApiError(error, res, 'recupero ruoli utente');
    }
  });

  // Assign user role
  app.post('/api/users/:userId/roles', ...authWithRBAC, requirePermission('users.update'), async (req, res) => {
    try {
      // Basic validation for userId parameter
      if (!req.params.userId || req.params.userId.trim() === '') {
        return res.status(400).json({
          error: 'missing_parameter',
          message: 'ID utente non specificato'
        });
      }

      // Validate request body with Zod
      const validatedData = validateRequestBody(insertUserAssignmentSchema, req.body, res);
      if (!validatedData) return; // Error already sent by validateRequestBody

      const assignmentData = { ...(validatedData as InsertUserAssignment), userId: req.params.userId };
      const assignment = await storage.createUserAssignment(assignmentData);
      res.status(201).json(assignment);
    } catch (error) {
      handleApiError(error, res, 'assegnazione ruolo utente');
    }
  });

  // ==================== REFERENCE DATA ENDPOINTS ====================

  // Get Italian cities
  app.get('/api/italian-cities', async (req, res) => {
    try {
      const cities = await storage.getItalianCities();
      res.json(cities);
    } catch (error) {
      handleApiError(error, res, 'recupero città italiane');
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
      handleApiError(error, res, 'recupero forme giuridiche');
    }
  });

  // Get all countries
  app.get('/api/reference/countries', async (req, res) => {
    try {
      const countries = await storage.getCountries();
      res.json(countries);
    } catch (error) {
      handleApiError(error, res, 'recupero paesi');
    }
  });

  // Get Italian cities
  app.get('/api/reference/italian-cities', async (req, res) => {
    try {
      const cities = await storage.getItalianCities();
      res.json(cities);
    } catch (error) {
      handleApiError(error, res, 'recupero città italiane');
    }
  });

  // ==================== RBAC MANAGEMENT API ====================

  // Get all roles for the current tenant
  app.get('/api/roles', ...authWithRBAC, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;

      if (!tenantId) {
        return res.status(400).json({
          error: 'missing_tenant',
          message: 'Identificativo organizzazione non disponibile'
        });
      }

      const roles = await storage.getRolesByTenant(tenantId);
      res.json(roles);
    } catch (error) {
      handleApiError(error, res, 'recupero ruoli');
    }
  });

  // Create a new role
  app.post('/api/roles', ...authWithRBAC, requirePermission('admin.roles.create'), async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;

      if (!tenantId) {
        return res.status(400).json({
          error: 'missing_tenant',
          message: 'Identificativo organizzazione non disponibile'
        });
      }

      // Validate request body with Zod
      const validatedData = validateRequestBody(insertRoleSchema, req.body, res);
      if (!validatedData) return; // Error already sent by validateRequestBody

      const { rbacStorage } = await import('../core/rbac-storage.js');
      const role = await rbacStorage.createRole(tenantId, validatedData as InsertRole);
      res.status(201).json(role);
    } catch (error) {
      handleApiError(error, res, 'creazione ruolo');
    }
  });

  // Update a role
  app.put('/api/roles/:roleId', ...authWithRBAC, requirePermission('admin.roles.update'), async (req: any, res) => {
    try {
      // Validate UUID parameter
      if (!validateUUIDParam(req.params.roleId, 'ID ruolo', res)) return;

      // Validate request body with Zod (make fields optional for updates)
      const updateSchema = insertRoleSchema.partial();
      const validatedData = validateRequestBody(updateSchema, req.body, res);
      if (!validatedData) return; // Error already sent by validateRequestBody

      const { rbacStorage } = await import('../core/rbac-storage.js');
      const role = await rbacStorage.updateRole(req.params.roleId, validatedData);
      res.json(role);
    } catch (error) {
      handleApiError(error, res, 'aggiornamento ruolo');
    }
  });

  // Delete a role
  app.delete('/api/roles/:roleId', ...authWithRBAC, requirePermission('admin.roles.delete'), async (req: any, res) => {
    try {
      // Validate UUID parameter
      if (!validateUUIDParam(req.params.roleId, 'ID ruolo', res)) return;

      const { rbacStorage } = await import('../core/rbac-storage.js');
      await rbacStorage.deleteRole(req.params.roleId);
      res.status(204).send();
    } catch (error: any) {
      // Handle specific business logic errors
      if (error.message?.includes('system role')) {
        return res.status(403).json({ 
          error: 'forbidden',
          message: 'Non è possibile eliminare un ruolo di sistema' 
        });
      }
      handleApiError(error, res, 'eliminazione ruolo');
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

  // ==================== TENANT SETTINGS API ====================

  // Get tenant settings (including RBAC configuration)
  app.get('/api/tenant/settings', enterpriseAuth, rbacMiddleware, requirePermission('admin.settings.read'), async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required - no tenant context' });
      }

      const tenantResult = await db
        .select({ 
          settings: tenants.settings,
          features: tenants.features,
          name: tenants.name,
          status: tenants.status 
        })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (tenantResult.length === 0) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      const tenant = tenantResult[0];
      const settings = tenant.settings as any || {};
      
      res.json({
        tenantId,
        name: tenant.name,
        status: tenant.status,
        settings: {
          rbac_enabled: settings.rbac_enabled === true,
          ...settings
        },
        features: tenant.features || {}
      });

    } catch (error) {
      console.error("Error fetching tenant settings:", error);
      res.status(500).json({ error: "Failed to fetch tenant settings" });
    }
  });

  // Update tenant settings (including RBAC toggle)
  app.put('/api/tenant/settings', enterpriseAuth, rbacMiddleware, requirePermission('admin.settings.update'), async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required - no tenant context' });
      }

      const { settings, features } = req.body;
      
      // Validate settings object
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Invalid settings object' });
      }

      // Update tenant settings
      const updatedData: any = {};
      if (settings) {
        updatedData.settings = settings;
      }
      if (features) {
        updatedData.features = features;
      }
      updatedData.updatedAt = new Date();

      await db
        .update(tenants)
        .set(updatedData)
        .where(eq(tenants.id, tenantId));

      console.log(`[TENANT-SETTINGS] Updated tenant ${tenantId} settings - RBAC enabled: ${settings.rbac_enabled}`);

      res.json({ 
        message: "Tenant settings updated successfully",
        settings: settings,
        features: features || {}
      });

    } catch (error) {
      console.error("Error updating tenant settings:", error);
      res.status(500).json({ error: "Failed to update tenant settings" });
    }
  });

  // ==================== UNIFIED RBAC API ====================

  // Get all permissions from registry (flat list for UI)
  app.get('/api/rbac/permissions', enterpriseAuth, rbacMiddleware, requirePermission('settings.roles.view'), async (req: any, res) => {
    try {
      const { getAllPermissions } = await import('../core/permissions/registry.js');
      const permissions = getAllPermissions();
      
      // Return as flat array of permission strings for easy UI consumption
      res.json({
        permissions: permissions.sort(),
        total: permissions.length
      });
    } catch (error) {
      handleApiError(error, res, 'recupero permessi');
    }
  });

  // Get all roles for the current tenant
  app.get('/api/rbac/roles', enterpriseAuth, rbacMiddleware, requirePermission('settings.roles.view'), async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required - no tenant context' });
      }

      const { rbacStorage } = await import('../core/rbac-storage.js');
      const roles = await rbacStorage.getRolesByTenant(tenantId);
      res.json({
        roles,
        total: roles.length
      });
    } catch (error) {
      handleApiError(error, res, 'recupero ruoli RBAC');
    }
  });

  // Create a new custom role
  app.post('/api/rbac/roles', enterpriseAuth, rbacMiddleware, requirePermission('settings.roles.create'), async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required - no tenant context' });
      }

      // Validate request body with Zod
      const validatedData = validateRequestBody(insertRoleSchema.omit({ tenantId: true }), req.body, res);
      if (!validatedData) return;

      const { rbacStorage } = await import('../core/rbac-storage.js');
      const role = await rbacStorage.createRole(tenantId, validatedData as any);
      res.status(201).json(role);
    } catch (error) {
      handleApiError(error, res, 'creazione ruolo RBAC');
    }
  });

  // Update an existing role
  app.patch('/api/rbac/roles/:id', enterpriseAuth, rbacMiddleware, requirePermission('settings.roles.edit'), async (req: any, res) => {
    try {
      if (!validateUUIDParam(req.params.id, 'ID ruolo', res)) return;

      // Validate request body - allow partial updates
      const updateSchema = insertRoleSchema.omit({ tenantId: true }).partial();
      const validatedData = validateRequestBody(updateSchema, req.body, res);
      if (!validatedData) return;

      const { rbacStorage } = await import('../core/rbac-storage.js');
      const role = await rbacStorage.updateRole(req.params.id, validatedData);
      
      if (!role) {
        return res.status(404).json({ error: 'Ruolo non trovato' });
      }
      
      res.json(role);
    } catch (error) {
      if (error.message?.includes('system role')) {
        return res.status(403).json({ 
          error: 'forbidden',
          message: 'Non è possibile modificare un ruolo di sistema' 
        });
      }
      handleApiError(error, res, 'aggiornamento ruolo RBAC');
    }
  });

  // Delete a role (only non-system roles)
  app.delete('/api/rbac/roles/:id', enterpriseAuth, rbacMiddleware, requirePermission('settings.roles.delete'), async (req: any, res) => {
    try {
      if (!validateUUIDParam(req.params.id, 'ID ruolo', res)) return;

      const { rbacStorage } = await import('../core/rbac-storage.js');
      await rbacStorage.deleteRole(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      if (error.message?.includes('system role')) {
        return res.status(403).json({ 
          error: 'forbidden',
          message: 'Non è possibile eliminare un ruolo di sistema' 
        });
      }
      handleApiError(error, res, 'eliminazione ruolo RBAC');
    }
  });

  // Get permissions for a specific role
  app.get('/api/rbac/roles/:id/permissions', enterpriseAuth, rbacMiddleware, requirePermission('settings.roles.view'), async (req: any, res) => {
    try {
      if (!validateUUIDParam(req.params.id, 'ID ruolo', res)) return;

      const { rbacStorage } = await import('../core/rbac-storage.js');
      const permissions = await rbacStorage.getRolePermissions(req.params.id);
      res.json({
        roleId: req.params.id,
        permissions,
        total: permissions.length
      });
    } catch (error) {
      handleApiError(error, res, 'recupero permessi ruolo');
    }
  });

  // Set permissions for a role (replace all permissions)
  app.put('/api/rbac/roles/:id/permissions', enterpriseAuth, rbacMiddleware, requirePermission('settings.roles.edit'), async (req: any, res) => {
    try {
      if (!validateUUIDParam(req.params.id, 'ID ruolo', res)) return;

      const { permissions } = req.body;
      if (!Array.isArray(permissions)) {
        return res.status(400).json({
          error: 'invalid_permissions',
          message: 'Il campo permissions deve essere un array'
        });
      }

      // Validate that all permissions exist
      const { getAllPermissions } = await import('../core/permissions/registry.js');
      const validPermissions = getAllPermissions();
      const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
      
      if (invalidPermissions.length > 0) {
        return res.status(400).json({
          error: 'invalid_permissions',
          message: `Permessi non validi: ${invalidPermissions.join(', ')}`
        });
      }

      const { rbacStorage } = await import('../core/rbac-storage.js');
      await rbacStorage.setRolePermissions(req.params.id, permissions);
      res.json({
        roleId: req.params.id,
        permissions,
        message: 'Permessi aggiornati con successo'
      });
    } catch (error) {
      handleApiError(error, res, 'aggiornamento permessi ruolo');
    }
  });

  // Get user role assignments
  app.get('/api/rbac/users/:userId/assignments', enterpriseAuth, rbacMiddleware, requirePermission('settings.users.view'), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required - no tenant context' });
      }

      const { rbacStorage } = await import('../core/rbac-storage.js');
      const assignments = await rbacStorage.getUserRoles(userId, tenantId);
      const permissions = await rbacStorage.getUserPermissions(userId, tenantId);

      res.json({
        userId,
        assignments: assignments.map(a => ({
          id: `${a.assignment.userId}-${a.assignment.roleId}-${a.assignment.scopeType}-${a.assignment.scopeId}`,
          role: a.role,
          assignment: a.assignment
        })),
        effectivePermissions: permissions,
        total: assignments.length
      });
    } catch (error) {
      handleApiError(error, res, 'recupero assegnazioni utente');
    }
  });

  // Assign role to user
  app.post('/api/rbac/users/:userId/assignments', enterpriseAuth, rbacMiddleware, requirePermission('settings.roles.assign'), async (req: any, res) => {
    try {
      const { userId } = req.params;
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required - no tenant context' });
      }

      // Validate request body
      const assignmentSchema = insertUserAssignmentSchema.omit({ userId: true });
      const validatedData = validateRequestBody(assignmentSchema, req.body, res);
      if (!validatedData) return;

      const assignmentData = {
        ...validatedData as any,
        userId,
        scopeId: validatedData.scopeId || tenantId // Default to tenant scope if not specified
      };

      const { rbacStorage } = await import('../core/rbac-storage.js');
      await rbacStorage.assignRoleToUser(assignmentData);
      
      res.status(201).json({
        userId,
        assignment: assignmentData,
        message: 'Ruolo assegnato con successo'
      });
    } catch (error) {
      handleApiError(error, res, 'assegnazione ruolo utente');
    }
  });

  // Remove role assignment from user
  app.delete('/api/rbac/users/:userId/assignments/:assignmentId', enterpriseAuth, rbacMiddleware, requirePermission('settings.roles.assign'), async (req: any, res) => {
    try {
      const { userId, assignmentId } = req.params;
      
      // Parse compound assignment ID: userId-roleId-scopeType-scopeId
      const parts = assignmentId.split('-');
      if (parts.length < 4) {
        return res.status(400).json({
          error: 'invalid_assignment_id',
          message: 'Format ID assegnazione non valido'
        });
      }
      
      const [, roleId, scopeType, ...scopeIdParts] = parts;
      const scopeId = scopeIdParts.join('-'); // Handle UUIDs with hyphens

      const { rbacStorage } = await import('../core/rbac-storage.js');
      await rbacStorage.removeRoleFromUser(userId, roleId, scopeType, scopeId);
      
      res.status(204).send();
    } catch (error) {
      handleApiError(error, res, 'rimozione assegnazione ruolo');
    }
  });

  // Update tenant RBAC settings
  app.patch('/api/tenants/:id/settings', enterpriseAuth, rbacMiddleware, requirePermission('settings.organization.manage'), async (req: any, res) => {
    try {
      const tenantId = req.params.id;
      const currentUserTenantId = req.user?.tenantId;
      
      // Users can only modify their own tenant settings
      if (tenantId !== currentUserTenantId) {
        return res.status(403).json({ 
          error: 'forbidden',
          message: 'Non autorizzato a modificare le impostazioni di questo tenant' 
        });
      }

      const { settings } = req.body;
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ 
          error: 'invalid_settings',
          message: 'Campo settings richiesto e deve essere un oggetto' 
        });
      }

      // Get current tenant settings
      const [currentTenant] = await db
        .select({ settings: tenants.settings })
        .from(tenants)
        .where(eq(tenants.id, tenantId));

      if (!currentTenant) {
        return res.status(404).json({ error: 'Tenant non trovato' });
      }

      const currentSettings = currentTenant.settings || {};
      const updatedSettings = { ...currentSettings, ...settings };

      // Update tenant settings
      await db
        .update(tenants)
        .set({ 
          settings: updatedSettings,
          updatedAt: new Date() 
        })
        .where(eq(tenants.id, tenantId));

      res.json({
        tenantId,
        settings: updatedSettings,
        message: 'Impostazioni tenant aggiornate con successo'
      });
    } catch (error) {
      handleApiError(error, res, 'aggiornamento impostazioni tenant');
    }
  });

  // ==================== STRUCTURED LOGS API ====================

  // Get structured logs with filtering and pagination
  app.get('/api/logs', enterpriseAuth, rbacMiddleware, requirePermission('logs.read'), async (req: any, res) => {
    try {
      // SECURE: Use ONLY authenticated user's tenant ID
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required - no tenant context' });
      }

      // Validate query parameters with Zod
      const validationResult = getLogsQuerySchema.safeParse(req.query);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: validationResult.error.errors
        });
      }

      const { level, component, dateFrom, dateTo, correlationId, userId, page, limit } = validationResult.data;

      // Build filters object
      const filters = {
        ...(level && { level }),
        ...(component && { component }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
        ...(correlationId && { correlationId }),
        ...(userId && { userId })
      };

      // Pagination object
      const pagination = { page, limit };

      console.log(`[API] GET /api/logs - Tenant: ${tenantId}, User: ${req.user.id}, Filters:`, filters, 'Pagination:', pagination);

      // Get logs from storage (tenant-isolated)
      const result = await storage.getStructuredLogs(tenantId, filters, pagination);

      // Calculate total pages
      const totalPages = Math.ceil(result.total / limit);

      // Return logs with metadata
      res.json({
        logs: result.logs,
        metadata: {
          total: result.total,
          page,
          limit,
          totalPages
        }
      });

    } catch (error) {
      console.error("Error fetching structured logs:", error);
      res.status(500).json({ error: "Failed to fetch structured logs" });
    }
  });

  // Create a new structured log entry (for internal use)
  app.post('/api/logs', enterpriseAuth, rbacMiddleware, requirePermission('logs.write'), async (req: any, res) => {
    try {
      // SECURE: Use ONLY authenticated user's tenant ID
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required - no tenant context' });
      }

      // Validate request body with Zod
      const validationResult = createLogBodySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Invalid log data',
          details: validationResult.error.errors
        });
      }

      // Add tenant ID to the validated log data
      const logData = {
        ...validationResult.data,
        tenantId
      };

      console.log(`[API] POST /api/logs - Creating log for tenant: ${tenantId}, User: ${req.user.id}`);

      const log = await storage.createStructuredLog(logData);
      res.status(201).json(log);

    } catch (error) {
      console.error("Error creating structured log:", error);
      res.status(500).json({ error: "Failed to create structured log" });
    }
  });

  // ==================== NOTIFICATION ENDPOINTS ====================

  // Get notifications for tenant with filtering and pagination
  app.get('/api/notifications', ...authWithRBAC, requirePermission('notifications.read'), async (req: any, res) => {
    try {
      // SECURE: Use ONLY authenticated user's tenant ID
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required - no tenant context' });
      }

      // Validate query parameters with Zod
      const validationResult = getNotificationsQuerySchema.safeParse(req.query);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: validationResult.error.errors
        });
      }

      const { type, priority, status, targetUserId, page, limit } = validationResult.data;

      // Build filters object
      const filters = {
        ...(type && { type }),
        ...(priority && { priority }),
        ...(status && { status }),
        ...(targetUserId && { targetUserId })
      };

      // Pagination object
      const pagination = { page, limit };

      console.log(`[API] GET /api/notifications - Tenant: ${tenantId}, User: ${userId}, Filters:`, filters, 'Pagination:', pagination);

      // Get notifications from storage (tenant-isolated with user visibility)
      const result = await storage.getNotificationsByTenant(tenantId, userId, filters, pagination);

      // Calculate total pages
      const totalPages = Math.ceil(result.total / limit);

      // Return notifications with metadata
      res.json({
        notifications: result.notifications,
        unreadCount: result.unreadCount,
        metadata: {
          total: result.total,
          page,
          limit,
          totalPages
        }
      });

    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Get unread notification count for current user
  app.get('/api/notifications/unread-count', ...authWithRBAC, requirePermission('notifications.read'), async (req: any, res) => {
    try {
      // SECURE: Use ONLY authenticated user's tenant ID
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required - no tenant context' });
      }

      console.log(`[API] GET /api/notifications/unread-count - Tenant: ${tenantId}, User: ${userId}`);

      const unreadCount = await storage.getUnreadNotificationCount(tenantId, userId);

      res.json({ unreadCount });

    } catch (error) {
      console.error("Error fetching unread notification count:", error);
      res.status(500).json({ error: "Failed to fetch unread notification count" });
    }
  });

  // Create a new notification (admin/system only)
  app.post('/api/notifications', ...authWithRBAC, requirePermission('notifications.create'), async (req: any, res) => {
    try {
      // SECURE: Use ONLY authenticated user's tenant ID
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required - no tenant context' });
      }

      // Validate request body with Zod
      const validationResult = createNotificationBodySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Invalid notification data',
          details: validationResult.error.errors
        });
      }

      // Add tenant ID to the validated notification data
      const notificationData = {
        ...validationResult.data,
        tenantId
      } as InsertNotification;

      console.log(`[API] POST /api/notifications - Creating notification for tenant: ${tenantId}, User: ${req.user.id}`);

      const notification = await storage.createNotification(notificationData);
      res.status(201).json(notification);

    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  // Mark notification as read
  app.patch('/api/notifications/:id/read', ...authWithRBAC, requirePermission('notifications.markRead'), async (req: any, res) => {
    try {
      // SECURE: Use ONLY authenticated user's tenant ID
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required - no tenant context' });
      }

      // Validate UUID parameter
      if (!validateUUIDParam(req.params.id, 'Notification ID', res)) return;

      console.log(`[API] PATCH /api/notifications/${req.params.id}/read - Tenant: ${tenantId}, User: ${req.user.id}`);

      const notification = await storage.markNotificationRead(req.params.id, tenantId);
      
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found or access denied' });
      }

      res.json(notification);

    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Mark notification as unread
  app.patch('/api/notifications/:id/unread', ...authWithRBAC, requirePermission('notifications.markRead'), async (req: any, res) => {
    try {
      // SECURE: Use ONLY authenticated user's tenant ID
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required - no tenant context' });
      }

      // Validate UUID parameter
      if (!validateUUIDParam(req.params.id, 'Notification ID', res)) return;

      console.log(`[API] PATCH /api/notifications/${req.params.id}/unread - Tenant: ${tenantId}, User: ${req.user.id}`);

      const notification = await storage.markNotificationUnread(req.params.id, tenantId);
      
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found or access denied' });
      }

      res.json(notification);

    } catch (error) {
      console.error("Error marking notification as unread:", error);
      res.status(500).json({ error: "Failed to mark notification as unread" });
    }
  });

  // Bulk mark notifications as read
  app.patch('/api/notifications/bulk-read', ...authWithRBAC, requirePermission('notifications.bulkActions'), async (req: any, res) => {
    try {
      // SECURE: Use ONLY authenticated user's tenant ID
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required - no tenant context' });
      }

      // Validate request body with Zod
      const validationResult = bulkMarkReadBodySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Invalid bulk read data',
          details: validationResult.error.errors
        });
      }

      const { notificationIds } = validationResult.data;

      console.log(`[API] PATCH /api/notifications/bulk-read - Marking ${notificationIds.length} notifications as read for tenant: ${tenantId}, User: ${req.user.id}`);

      const updatedCount = await storage.bulkMarkNotificationsRead(notificationIds, tenantId);

      res.json({ 
        success: true,
        updatedCount,
        message: `Marked ${updatedCount} notifications as read`
      });

    } catch (error) {
      console.error("Error bulk marking notifications as read:", error);
      res.status(500).json({ error: "Failed to bulk mark notifications as read" });
    }
  });

  // Delete notification (admin/manage only)
  app.delete('/api/notifications/:id', ...authWithRBAC, requirePermission('notifications.delete'), async (req: any, res) => {
    try {
      // SECURE: Use ONLY authenticated user's tenant ID
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required - no tenant context' });
      }

      // Validate UUID parameter
      if (!validateUUIDParam(req.params.id, 'Notification ID', res)) return;

      console.log(`[API] DELETE /api/notifications/${req.params.id} - Tenant: ${tenantId}, User: ${req.user.id}`);

      await storage.deleteNotification(req.params.id, tenantId);
      res.status(204).send();

    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // Delete expired notifications (cleanup operation)
  app.delete('/api/notifications/expired', ...authWithRBAC, requirePermission('notifications.manage'), async (req: any, res) => {
    try {
      // SECURE: Use ONLY authenticated user's tenant ID
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required - no tenant context' });
      }

      console.log(`[API] DELETE /api/notifications/expired - Cleaning up expired notifications for tenant: ${tenantId}, User: ${req.user.id}`);

      const deletedCount = await storage.deleteExpiredNotifications(tenantId);

      res.json({ 
        success: true,
        deletedCount,
        message: `Cleaned up ${deletedCount} expired notifications`
      });

    } catch (error) {
      console.error("Error deleting expired notifications:", error);
      res.status(500).json({ error: "Failed to delete expired notifications" });
    }
  });

  // Direct health check route (outside /api prefix)
  app.get("/health", async (req, res) => {
    try {
      await db.select().from(tenants).limit(1);
      return res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "w3-suite-backend",
        version: "1.0.0",
        database: "connected"
      });
    } catch (error) {
      return res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        service: "w3-suite-backend",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}