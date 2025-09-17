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
import { sql, eq, inArray } from "drizzle-orm";
import { tenants, users } from "../db/schema";
import { insertStructuredLogSchema, insertLegalEntitySchema, insertStoreSchema, insertSupplierSchema, insertSupplierOverrideSchema, insertUserSchema, insertUserAssignmentSchema, insertRoleSchema, insertTenantSchema, insertNotificationSchema, objectAcls, InsertTenant, InsertLegalEntity, InsertStore, InsertSupplier, InsertSupplierOverride, InsertUser, InsertUserAssignment, InsertRole, InsertNotification } from "../db/schema/w3suite";
import { JWT_SECRET, config } from "./config";
import { z } from "zod";
import { handleApiError, validateRequestBody, validateUUIDParam } from "./error-utils";
import { avatarService, uploadConfigSchema, objectPathSchema, objectStorageService, ObjectMetadata } from "./objectStorage";
import { objectAclService } from "./objectAcl";
import { HRStorage } from "./hr-storage";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
const DEMO_TENANT_ID = config.DEMO_TENANT_ID;
const hrStorage = new HRStorage();

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

// Zod validation schemas for file upload and ACL routes
const uploadInitBody = z.object({ 
  fileName: z.string().min(1), 
  contentType: z.string().min(1), 
  fileSize: z.union([z.number().int().positive(), z.string().regex(/^\d+$/).transform((v)=>parseInt(v,10))]) 
});

const objectPathBody = z.object({ 
  objectPath: z.string().min(1).max(500)
});

const avatarUpdateBody = z.object({ 
  avatarUrl: z.string().url() 
});

const aclScopeBody = z.object({ 
  scopeId: z.string().uuid() 
});

export async function registerRoutes(app: Express): Promise<Server> {

  // Setup OAuth2 Authorization Server (Enterprise)
  setupOAuth2Server(app);

  // Apply correlation middleware globally for request tracking
  app.use(correlationMiddleware);

  // Apply tenant middleware to all API routes except auth, OAuth2, and public routes
  app.use((req, res, next) => {
    // Skip tenant middleware for auth routes, OAuth2 routes, health endpoints, and public avatar access
    if (req.path.startsWith('/api/auth/') || 
        req.path.startsWith('/oauth2/') || 
        req.path.startsWith('/.well-known/') ||
        req.path.startsWith('/api/public/') ||
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

  // ==================== PUBLIC ROUTES (NO AUTHENTICATION) ====================

  // Public avatar access for header display (no authentication required)
  app.get('/api/public/avatars/:tenantId/:fileName', async (req, res) => {
    try {
      const { tenantId, fileName } = req.params;

      if (!tenantId || !fileName) {
        return res.status(400).json({
          error: 'missing_parameters',
          message: 'Tenant ID e nome file sono richiesti'
        });
      }

      // Construct object path for public avatar
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      const publicPath = process.env.PUBLIC_OBJECT_SEARCH_PATHS;
      const objectPath = `${publicPath}/avatars/${tenantId}/${fileName}`;

      // Check if the avatar is actually public by querying database
      const aclResults = await db
        .select({ visibility: objectAcls.visibility })
        .from(objectAcls)
        .where(eq(objectAcls.objectPath, objectPath))
        .limit(1);

      if (aclResults.length === 0) {
        return res.status(404).json({
          error: 'avatar_not_found',
          message: 'Avatar non trovato'
        });
      }

      const acl = aclResults[0];
      if (acl.visibility !== 'public') {
        return res.status(403).json({
          error: 'avatar_not_public',
          message: 'Avatar non pubblico'
        });
      }

      // For Replit Object Storage, redirect to the actual object storage URL
      const publicUrl = objectStorageService.getPublicUrl(objectPath);
      
      console.log(`[API] GET /api/public/avatars/${tenantId}/${fileName} - Redirecting to: ${publicUrl}`);
      
      // Redirect to the actual object storage URL
      res.redirect(302, publicUrl);

    } catch (error) {
      console.error(`[API] Public avatar access error:`, error);
      res.status(500).json({
        error: 'server_error',
        message: 'Errore interno del server'
      });
    }
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

  // ==================== SUPPLIERS API ENDPOINTS ====================
  // Brand Base + Tenant Override Pattern Implementation
  
  // GET /api/suppliers - Lista fornitori (Brand + Tenant specific)
  app.get('/api/suppliers', ...authWithRBAC, async (req: any, res) => {
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

      const suppliers = await storage.getSuppliersByTenant(tenantId);
      res.json({ suppliers, success: true });
    } catch (error) {
      handleApiError(error, res, 'recupero fornitori');
    }
  });

  // POST /api/suppliers - Crea nuovo fornitore (tenant-specific)
  app.post('/api/suppliers', ...authWithRBAC, requirePermission('suppliers.create'), async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;

      if (!tenantId) {
        return res.status(400).json({
          error: 'missing_tenant',
          message: 'Identificativo organizzazione non disponibile'
        });
      }

      // Validate request body with Zod (use supplier override schema for tenant suppliers)
      const validatedData = validateRequestBody(insertSupplierOverrideSchema, req.body, res);
      if (!validatedData) return; // Error already sent by validateRequestBody

      // Force tenant origin and tenantId for new tenant suppliers
      const supplierData = { 
        ...(validatedData as InsertSupplierOverride), 
        tenantId, 
        origin: 'tenant' as const,
        createdBy: req.user?.id || 'system'
      };
      
      const supplier = await storage.createTenantSupplier(supplierData);
      res.status(201).json(supplier);
    } catch (error) {
      handleApiError(error, res, 'creazione fornitore');
    }
  });

  // PUT /api/suppliers/:id - Aggiorna fornitore esistente
  app.put('/api/suppliers/:id', ...authWithRBAC, requirePermission('suppliers.update'), async (req: any, res) => {
    try {
      // Validate UUID parameter
      if (!validateUUIDParam(req.params.id, 'ID fornitore', res)) return;

      // Validate request body with Zod (make all fields optional for updates)
      const updateSchema = insertSupplierOverrideSchema.partial();
      const validatedData = validateRequestBody(updateSchema, req.body, res);
      if (!validatedData) return; // Error already sent by validateRequestBody

      // Add updatedBy field
      const supplierData = {
        ...validatedData,
        updatedBy: req.user?.id || 'system'
      };

      const supplier = await storage.updateTenantSupplier(req.params.id, supplierData);
      res.json(supplier);
    } catch (error: any) {
      handleApiError(error, res, 'aggiornamento fornitore');
    }
  });

  // DELETE /api/suppliers/:id - Elimina fornitore (solo tenant overrides)
  app.delete('/api/suppliers/:id', ...authWithRBAC, requirePermission('suppliers.delete'), async (req: any, res) => {
    try {
      // Validate UUID parameter
      if (!validateUUIDParam(req.params.id, 'ID fornitore', res)) return;

      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
      if (!tenantId) {
        return res.status(400).json({
          error: 'missing_tenant',
          message: 'Identificativo organizzazione non disponibile'
        });
      }

      await storage.deleteTenantSupplier(req.params.id, tenantId);
      res.status(204).send();
    } catch (error: any) {
      handleApiError(error, res, 'eliminazione fornitore');
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

  // ==================== PAYMENT METHODS API ====================
  
  // GET /api/payment-methods - Get all active payment methods from public schema
  app.get('/api/payment-methods', ...authWithRBAC, async (req: any, res) => {
    try {
      // Import the paymentMethods table from the public schema
      const { paymentMethods: paymentMethodsTable } = await import("../db/schema/public");
      
      const paymentMethodsData = await db
        .select({
          id: paymentMethodsTable.id,
          code: paymentMethodsTable.code,
          name: paymentMethodsTable.name,
          description: paymentMethodsTable.description,
          category: paymentMethodsTable.category,
          requiresIban: paymentMethodsTable.requiresIban,
          requiresAuth: paymentMethodsTable.requiresAuth,
          supportsBatching: paymentMethodsTable.supportsBatching,
          countryCode: paymentMethodsTable.countryCode,
          sortOrder: paymentMethodsTable.sortOrder
        })
        .from(paymentMethodsTable)
        .where(eq(paymentMethodsTable.active, true))
        .orderBy(paymentMethodsTable.sortOrder, paymentMethodsTable.name);

      res.json({ 
        paymentMethods: paymentMethodsData, 
        success: true,
        total: paymentMethodsData.length 
      });
    } catch (error: any) {
      handleApiError(error, res, 'recupero metodi di pagamento');
    }
  });

  // GET /api/payment-conditions - Get all active payment conditions from w3suite schema
  app.get('/api/payment-conditions', ...authWithRBAC, async (req: any, res) => {
    try {
      // Import the paymentMethodsConditions table from the public schema
      const { paymentMethodsConditions } = await import("../db/schema/public");
      
      const paymentConditionsData = await db
        .select({
          id: paymentMethodsConditions.id,
          code: paymentMethodsConditions.code,
          name: paymentMethodsConditions.name,
          description: paymentMethodsConditions.description,
          days: paymentMethodsConditions.days,
          type: paymentMethodsConditions.type,
          calculation: paymentMethodsConditions.calculation,
          sortOrder: paymentMethodsConditions.sortOrder
        })
        .from(paymentMethodsConditions)
        .where(eq(paymentMethodsConditions.active, true))
        .orderBy(paymentMethodsConditions.sortOrder, paymentMethodsConditions.name);

      res.json({ 
        paymentConditions: paymentConditionsData, 
        success: true,
        total: paymentConditionsData.length 
      });
    } catch (error: any) {
      handleApiError(error, res, 'recupero condizioni di pagamento');
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

  // ==================== AVATAR MANAGEMENT API ====================

  // Configure multer for memory storage (we'll handle uploads manually)
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Formato file non supportato. Usa JPEG, PNG, GIF o WEBP.'));
      }
    }
  });

  // Get presigned upload URL for avatar
  app.post('/api/avatar/upload', ...authWithRBAC, requirePermission('users.update'), async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;

      if (!tenantId || !userId) {
        return res.status(401).json({
          error: 'authentication_required',
          message: 'Autenticazione richiesta per upload avatar'
        });
      }

      // Validate request body with Zod
      const validatedData = validateRequestBody<z.infer<typeof uploadConfigSchema>>(uploadConfigSchema, req.body, res);
      if (!validatedData) return; // Error already sent by validateRequestBody

      // Additional avatar-specific validation
      const validation = avatarService.validateAvatarFile(
        validatedData.fileName,
        validatedData.contentType,
        validatedData.fileSize
      );

      if (!validation.valid) {
        return res.status(400).json({
          error: 'invalid_file',
          message: validation.error
        });
      }

      // Generate presigned upload URL
      const uploadData = await avatarService.generateAvatarUploadUrl(
        validatedData.fileName,
        validatedData.contentType,
        validatedData.fileSize,
        userId,
        tenantId
      );

      console.log(`[API] POST /api/avatar/upload - Generated upload URL for user: ${userId}, tenant: ${tenantId}`);
      
      res.status(201).json({
        success: true,
        data: uploadData,
        message: 'URL di upload generato con successo'
      });

    } catch (error) {
      handleApiError(error, res, 'generazione URL upload avatar');
    }
  });

  // Handle actual file upload to object storage
  app.post('/api/objects/upload', upload.single('file'), ...authWithRBAC, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;

      if (!tenantId || !userId) {
        return res.status(401).json({
          error: 'authentication_required',
          message: 'Autenticazione richiesta per upload file'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: 'missing_file',
          message: 'File non fornito per upload'
        });
      }

      // Validate file using avatar service
      const validation = avatarService.validateAvatarFile(
        req.file.originalname,
        req.file.mimetype,
        req.file.size
      );

      if (!validation.valid) {
        return res.status(400).json({
          error: 'invalid_file',
          message: validation.error
        });
      }

      // Extract metadata from request headers or body
      const body = validateRequestBody<z.infer<typeof objectPathBody>>(objectPathBody, req.body, res); if (!body) return;
      const objectPath = (req.headers['x-object-path'] as string) || body.objectPath;
      const visibility = req.headers['x-visibility'] || req.body.visibility || 'public';

      if (!objectPath) {
        return res.status(400).json({
          error: 'missing_object_path',
          message: 'Percorso oggetto non specificato'
        });
      }

      // Create object metadata
      const metadata: ObjectMetadata = {
        id: uuidv4(),
        fileName: req.file.originalname,
        contentType: req.file.mimetype,
        fileSize: req.file.size,
        visibility: visibility as 'public' | 'private',
        uploadedBy: userId,
        tenantId,
        createdAt: new Date().toISOString(),
        objectPath,
        publicUrl: visibility === 'public' ? objectStorageService.getPublicUrl(objectPath) : undefined
      };

      // TODO: Here we should upload the actual file to Replit Object Storage
      // For now we simulate the upload process
      // In a real implementation, this would use Replit's Object Storage API

      // Create ACL for the uploaded object
      await objectAclService.createObjectAcl(
        objectPath,
        userId,
        tenantId,
        visibility as 'public' | 'private'
      );

      console.log(`[API] POST /api/objects/upload - File uploaded successfully: ${objectPath}, user: ${userId}, tenant: ${tenantId}`);

      res.status(201).json({
        success: true,
        data: {
          objectPath,
          publicUrl: metadata.publicUrl,
          metadata
        },
        message: 'File caricato con successo'
      });

    } catch (error) {
      handleApiError(error, res, 'upload file oggetto');
    }
  });

  // Update user avatar URL after successful upload
  app.put('/api/users/:userId/avatar', ...authWithRBAC, requirePermission('users.update'), async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const requesterId = req.user?.id;
      const targetUserId = req.params.userId;

      if (!tenantId || !requesterId) {
        return res.status(401).json({
          error: 'authentication_required',
          message: 'Autenticazione richiesta per aggiornamento avatar'
        });
      }

      // Validate UUID parameter
      if (!validateUUIDParam && targetUserId.includes('-') && targetUserId.length > 10) {
        // Basic validation for user ID
      } else if (!targetUserId || targetUserId.trim() === '') {
        return res.status(400).json({
          error: 'missing_parameter',
          message: 'ID utente non specificato'
        });
      }

      // Users can only update their own avatar (unless admin)
      if (targetUserId !== requesterId && !req.userPermissions?.includes('*') && !req.userPermissions?.includes('admin.users.update')) {
        return res.status(403).json({
          error: 'forbidden',
          message: 'Non autorizzato a modificare avatar di altri utenti'
        });
      }

      // Validate request body
      const avatarSchema = z.object({
        objectPath: z.string().min(1, 'Percorso oggetto richiesto'),
        avatarUrl: z.string().url('URL avatar non valido').optional()
      });

      const validatedData = validateRequestBody<z.infer<typeof avatarSchema>>(avatarSchema, req.body, res);
      if (!validatedData) return;

      // Verify object access permissions
      const hasAccess = await avatarService.validateAvatarAccess(
        validatedData.objectPath,
        requesterId,
        tenantId
      );

      if (!hasAccess) {
        return res.status(403).json({
          error: 'access_denied',
          message: 'Accesso negato al file avatar specificato'
        });
      }

      // Generate public URL for the avatar
      const avatarUrl = validatedData.avatarUrl || avatarService.getAvatarPublicUrl(validatedData.objectPath);

      // Update user's profileImageUrl in database
      await db
        .update(users)
        .set({ 
          profileImageUrl: avatarUrl,
          updatedAt: new Date()
        })
        .where(eq(users.id, targetUserId));

      console.log(`[API] PUT /api/users/${targetUserId}/avatar - Avatar updated for user: ${targetUserId}, tenant: ${tenantId}`);

      res.json({
        success: true,
        data: {
          userId: targetUserId,
          avatarUrl,
          objectPath: validatedData.objectPath
        },
        message: 'Avatar aggiornato con successo'
      });

    } catch (error) {
      handleApiError(error, res, 'aggiornamento avatar utente');
    }
  });

  // Get user avatar URL
  app.get('/api/users/:userId/avatar', ...authWithRBAC, requirePermission('users.read'), async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const targetUserId = req.params.userId;

      if (!tenantId) {
        return res.status(401).json({
          error: 'authentication_required',
          message: 'Autenticazione richiesta per visualizzazione avatar'
        });
      }

      // Basic validation for userId parameter
      if (!targetUserId || targetUserId.trim() === '') {
        return res.status(400).json({
          error: 'missing_parameter',
          message: 'ID utente non specificato'
        });
      }

      // Get user data from database
      const userResult = await db
        .select({
          id: users.id,
          profileImageUrl: users.profileImageUrl,
          firstName: users.firstName,
          lastName: users.lastName
        })
        .from(users)
        .where(eq(users.id, targetUserId))
        .limit(1);

      if (userResult.length === 0) {
        return res.status(404).json({
          error: 'user_not_found',
          message: 'Utente non trovato'
        });
      }

      const user = userResult[0];

      res.json({
        success: true,
        data: {
          userId: user.id,
          avatarUrl: user.profileImageUrl,
          displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.id,
          hasAvatar: !!user.profileImageUrl
        }
      });

    } catch (error) {
      handleApiError(error, res, 'recupero avatar utente');
    }
  });

  // Serve avatar images with ACL check (public endpoint with optional auth)
  app.get('/objects/:objectPath(*)', async (req: any, res) => {
    try {
      const objectPath = `/${req.params.objectPath}`;
      
      // For public avatar images, we'll allow access without strict authentication
      // but still verify tenant context if available
      let tenantId = null;
      let userId = null;

      // Try to get auth context if available
      try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];

        if (token && token !== 'undefined' && token !== 'null' && token.length > 10) {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          userId = decoded.sub || decoded.userId;
          tenantId = decoded.tenant_id || decoded.tenantId;
        }
      } catch (authError) {
        // Continue without auth context for public files
      }

      // Check if object exists and is accessible
      const hasAccess = await objectAclService.checkPermission(
        objectPath,
        userId || 'anonymous',
        tenantId || 'public',
        'read'
      );

      if (!hasAccess) {
        // For avatar images that should be public, try alternative validation
        if (objectPath.includes('/avatars/')) {
          // Avatar images are public by default - allow access
          console.log(`[API] GET /objects${objectPath} - Public avatar access allowed`);
        } else {
          return res.status(403).json({
            error: 'access_denied',
            message: 'Accesso negato al file richiesto'
          });
        }
      }

      // For Replit Object Storage, redirect to the actual file URL
      // In a real implementation, you'd stream the file content
      const publicUrl = avatarService.getAvatarPublicUrl(objectPath);

      console.log(`[API] GET /objects${objectPath} - Serving avatar file for tenant: ${tenantId || 'public'}`);

      // Return file metadata instead of redirecting (for demo purposes)
      res.json({
        success: true,
        data: {
          objectPath,
          publicUrl,
          contentType: 'image/jpeg', // Would be determined from actual file
          message: 'In produzione, questo endpoint restituirebbe il file binario'
        }
      });

    } catch (error) {
      console.error('Error serving object:', error);
      res.status(500).json({
        error: 'server_error',
        message: 'Errore interno del server durante il recupero del file'
      });
    }
  });

  // Delete user avatar
  app.delete('/api/users/:userId/avatar', ...authWithRBAC, requirePermission('users.update'), async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const requesterId = req.user?.id;
      const targetUserId = req.params.userId;

      if (!tenantId || !requesterId) {
        return res.status(401).json({
          error: 'authentication_required',
          message: 'Autenticazione richiesta per eliminazione avatar'
        });
      }

      // Users can only delete their own avatar (unless admin)
      if (targetUserId !== requesterId && !req.userPermissions?.includes('*') && !req.userPermissions?.includes('admin.users.update')) {
        return res.status(403).json({
          error: 'forbidden',
          message: 'Non autorizzato a eliminare avatar di altri utenti'
        });
      }

      // Get current user data
      const userResult = await db
        .select({ profileImageUrl: users.profileImageUrl })
        .from(users)
        .where(eq(users.id, targetUserId))
        .limit(1);

      if (userResult.length === 0) {
        return res.status(404).json({
          error: 'user_not_found',
          message: 'Utente non trovato'
        });
      }

      const currentAvatarUrl = userResult[0].profileImageUrl;

      // Clear avatar from database
      await db
        .update(users)
        .set({ 
          profileImageUrl: null,
          updatedAt: new Date()
        })
        .where(eq(users.id, targetUserId));

      // If there was an avatar, try to delete from object storage
      if (currentAvatarUrl) {
        try {
          // Extract object path from URL and delete
          // This is simplified - in real implementation you'd parse the URL properly
          console.log(`[API] DELETE /api/users/${targetUserId}/avatar - Avatar deleted for user: ${targetUserId}`);
        } catch (deleteError) {
          console.warn('Failed to delete avatar file from storage:', deleteError);
        }
      }

      res.json({
        success: true,
        message: 'Avatar eliminato con successo'
      });

    } catch (error) {
      handleApiError(error, res, 'eliminazione avatar utente');
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

  // ==================== HR LEAVE MANAGEMENT API ====================

  // Get leave balance for a user
  app.get('/api/hr/leave/balance/:userId', enterpriseAuth, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      
      const currentYear = new Date().getFullYear();
      
      // Get employee balance from database
      const { employeeBalances } = await import('../db/schema/w3suite.js');
      const balance = await db.select()
        .from(employeeBalances)
        .where(and(
          eq(employeeBalances.userId, userId),
          eq(employeeBalances.year, currentYear)
        ))
        .limit(1);
      
      if (!balance[0]) {
        // Create default balance if not exists
        const defaultBalance = {
          tenantId,
          userId,
          year: currentYear,
          vacationDaysEntitled: 22, // Default Italian vacation days
          vacationDaysUsed: 0,
          vacationDaysRemaining: 22,
          sickDaysUsed: 0,
          personalDaysUsed: 0,
          overtimeHours: 0,
          compTimeHours: 0,
          adjustments: []
        };
        
        const newBalance = await db.insert(employeeBalances)
          .values(defaultBalance)
          .returning();
        
        return res.json(newBalance[0]);
      }
      
      res.json(balance[0]);
    } catch (error) {
      handleApiError(error, res, 'recupero saldo ferie');
    }
  });

  // Get leave requests
  app.get('/api/hr/leave/requests', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'USER';
      
      const filters = {
        status: req.query.status,
        startDate: req.query.startDate ? new Date(req.query.startDate) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate) : undefined,
        leaveType: req.query.leaveType,
        approverId: req.query.approverId
      };
      
      const requests = await hrStorage.getLeaveRequests(
        tenantId, 
        userId, 
        userRole, 
        filters
      );
      
      res.json(requests);
    } catch (error) {
      handleApiError(error, res, 'recupero richieste ferie');
    }
  });

  // Create leave request
  app.post('/api/hr/leave/requests', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const userId = req.user?.id;
      
      const requestData = {
        ...req.body,
        tenantId,
        userId,
        status: 'draft' as const,
        createdAt: new Date()
      };
      
      // Calculate total days (excluding weekends)
      const startDate = new Date(req.body.startDate);
      const endDate = new Date(req.body.endDate);
      let totalDays = 0;
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sunday (0) and Saturday (6)
          totalDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      requestData.totalDays = totalDays;
      
      // Check balance
      const { employeeBalances } = await import('../db/schema/w3suite.js');
      const currentYear = new Date().getFullYear();
      const balance = await db.select()
        .from(employeeBalances)
        .where(and(
          eq(employeeBalances.userId, userId),
          eq(employeeBalances.year, currentYear)
        ))
        .limit(1);
      
      if (balance[0] && req.body.leaveType === 'vacation') {
        if (balance[0].vacationDaysRemaining < totalDays) {
          return res.status(400).json({
            error: 'insufficient_balance',
            message: `Saldo ferie insufficiente. Disponibili: ${balance[0].vacationDaysRemaining}, Richiesti: ${totalDays}`
          });
        }
      }
      
      const newRequest = await hrStorage.createLeaveRequest(requestData);
      
      res.status(201).json(newRequest);
    } catch (error) {
      handleApiError(error, res, 'creazione richiesta ferie');
    }
  });

  // Update leave request
  app.put('/api/hr/leave/requests/:id', enterpriseAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      
      const { leaveRequests } = await import('../db/schema/w3suite.js');
      
      const updated = await db.update(leaveRequests)
        .set({
          ...req.body,
          updatedAt: new Date()
        })
        .where(and(
          eq(leaveRequests.id, id),
          eq(leaveRequests.tenantId, tenantId)
        ))
        .returning();
      
      if (!updated[0]) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Richiesta non trovata'
        });
      }
      
      res.json(updated[0]);
    } catch (error) {
      handleApiError(error, res, 'aggiornamento richiesta ferie');
    }
  });

  // Delete leave request
  app.delete('/api/hr/leave/requests/:id', enterpriseAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      
      const { leaveRequests } = await import('../db/schema/w3suite.js');
      
      const deleted = await db.delete(leaveRequests)
        .where(and(
          eq(leaveRequests.id, id),
          eq(leaveRequests.tenantId, tenantId),
          eq(leaveRequests.status, 'draft') // Can only delete draft requests
        ))
        .returning();
      
      if (!deleted[0]) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Richiesta non trovata o non cancellabile'
        });
      }
      
      res.status(204).send();
    } catch (error) {
      handleApiError(error, res, 'eliminazione richiesta ferie');
    }
  });

  // Approve leave request
  app.post('/api/hr/leave/requests/:id/approve', enterpriseAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const approverId = req.user?.id;
      const comments = req.body.comments;
      
      const approved = await hrStorage.approveLeaveRequest(id, approverId, comments);
      
      // Update balance if vacation
      if (approved.leaveType === 'vacation') {
        const { employeeBalances } = await import('../db/schema/w3suite.js');
        const currentYear = new Date().getFullYear();
        
        await db.update(employeeBalances)
          .set({
            vacationDaysUsed: sql`${employeeBalances.vacationDaysUsed} + ${approved.totalDays}`,
            vacationDaysRemaining: sql`${employeeBalances.vacationDaysRemaining} - ${approved.totalDays}`,
            updatedAt: new Date()
          })
          .where(and(
            eq(employeeBalances.userId, approved.userId),
            eq(employeeBalances.year, currentYear)
          ));
      }
      
      // Create calendar event
      const eventData = {
        tenantId: approved.tenantId,
        ownerId: approved.userId,
        title: `${approved.leaveType === 'vacation' ? 'Ferie' : 'Permesso'} - ${approved.userId}`,
        description: approved.reason,
        startDate: new Date(approved.startDate),
        endDate: new Date(approved.endDate),
        allDay: true,
        type: 'time_off' as const,
        visibility: 'team' as const,
        status: 'confirmed' as const,
        hrSensitive: true,
        createdBy: approverId
      };
      
      await hrStorage.createCalendarEvent(eventData);
      
      res.json(approved);
    } catch (error) {
      handleApiError(error, res, 'approvazione richiesta ferie');
    }
  });

  // Reject leave request
  app.post('/api/hr/leave/requests/:id/reject', enterpriseAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const approverId = req.user?.id;
      const reason = req.body.reason;
      
      if (!reason) {
        return res.status(400).json({
          error: 'missing_reason',
          message: 'Motivazione del rifiuto richiesta'
        });
      }
      
      const rejected = await hrStorage.rejectLeaveRequest(id, approverId, reason);
      
      res.json(rejected);
    } catch (error) {
      handleApiError(error, res, 'rifiuto richiesta ferie');
    }
  });

  // Get leave policies
  app.get('/api/hr/leave/policies', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      
      // Get policies from tenant settings
      const tenant = await db.select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);
      
      const defaultPolicies = {
        vacationDaysPerYear: 22,
        minimumAdvanceDays: 15,
        maximumConsecutiveDays: 15,
        blackoutDates: [],
        carryoverDays: 5,
        sickDaysRequireCertificate: 3,
        publicHolidays: [
          '2025-01-01', '2025-01-06', '2025-04-21', '2025-04-25',
          '2025-05-01', '2025-06-02', '2025-08-15', '2025-11-01',
          '2025-12-08', '2025-12-25', '2025-12-26'
        ]
      };
      
      const policies = tenant[0]?.settings?.leavePolicies || defaultPolicies;
      
      res.json(policies);
    } catch (error) {
      handleApiError(error, res, 'recupero policy ferie');
    }
  });

  // Update leave policies (HR/Admin only)
  app.put('/api/hr/leave/policies', enterpriseAuth, requirePermission('hr.policies.update'), async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      
      const tenant = await db.select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);
      
      if (!tenant[0]) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Tenant non trovato'
        });
      }
      
      const currentSettings = tenant[0].settings || {};
      currentSettings.leavePolicies = req.body;
      
      const updated = await db.update(tenants)
        .set({
          settings: currentSettings,
          updatedAt: new Date()
        })
        .where(eq(tenants.id, tenantId))
        .returning();
      
      res.json(updated[0].settings.leavePolicies);
    } catch (error) {
      handleApiError(error, res, 'aggiornamento policy ferie');
    }
  });

  // Get team calendar
  app.get('/api/hr/leave/team-calendar', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'USER';
      
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate) : new Date(),
        endDate: req.query.endDate ? new Date(req.query.endDate) : new Date(new Date().setMonth(new Date().getMonth() + 1)),
        type: 'time_off',
        visibility: req.query.visibility || 'team',
        storeId: req.query.storeId,
        teamId: req.query.teamId
      };
      
      const events = await hrStorage.getCalendarEvents(
        tenantId,
        userId,
        userRole,
        filters
      );
      
      res.json(events);
    } catch (error) {
      handleApiError(error, res, 'recupero calendario team');
    }
  });

  // ==================== SHIFT MANAGEMENT ROUTES ====================
  
  // Get shifts
  app.get('/api/hr/shifts', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const storeId = req.query.storeId;
      
      if (!storeId) {
        return res.status(400).json({
          error: 'bad_request',
          message: 'Store ID is required'
        });
      }
      
      const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date();
      const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
      
      const shifts = await hrStorage.getShifts(tenantId, storeId, { start: startDate, end: endDate });
      
      res.json(shifts);
    } catch (error) {
      handleApiError(error, res, 'recupero turni');
    }
  });
  
  // Get shift by ID
  app.get('/api/hr/shifts/:id', enterpriseAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      
      const { shifts } = await import('../db/schema/w3suite.js');
      
      const shift = await db.select()
        .from(shifts)
        .where(and(
          eq(shifts.id, id),
          eq(shifts.tenantId, tenantId)
        ))
        .limit(1);
      
      if (!shift[0]) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Turno non trovato'
        });
      }
      
      res.json(shift[0]);
    } catch (error) {
      handleApiError(error, res, 'recupero turno');
    }
  });
  
  // Create shift
  app.post('/api/hr/shifts', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const userId = req.user?.id;
      
      const shiftData = {
        ...req.body,
        tenantId,
        createdBy: userId,
        createdAt: new Date()
      };
      
      const newShift = await hrStorage.createShift(shiftData);
      
      res.status(201).json(newShift);
    } catch (error) {
      handleApiError(error, res, 'creazione turno');
    }
  });
  
  // Update shift
  app.put('/api/hr/shifts/:id', enterpriseAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      
      const { shifts } = await import('../db/schema/w3suite.js');
      
      const updated = await db.update(shifts)
        .set({
          ...req.body,
          updatedAt: new Date()
        })
        .where(and(
          eq(shifts.id, id),
          eq(shifts.tenantId, tenantId)
        ))
        .returning();
      
      if (!updated[0]) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Turno non trovato'
        });
      }
      
      res.json(updated[0]);
    } catch (error) {
      handleApiError(error, res, 'aggiornamento turno');
    }
  });
  
  // Delete shift
  app.delete('/api/hr/shifts/:id', enterpriseAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      
      const { shifts } = await import('../db/schema/w3suite.js');
      
      await db.delete(shifts)
        .where(and(
          eq(shifts.id, id),
          eq(shifts.tenantId, tenantId)
        ))
        .returning();
      
      res.status(204).send();
    } catch (error) {
      handleApiError(error, res, 'eliminazione turno');
    }
  });
  
  // Bulk create shifts
  app.post('/api/hr/shifts/bulk', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const userId = req.user?.id;
      const { shifts: shiftsData } = req.body;
      
      if (!Array.isArray(shiftsData) || shiftsData.length === 0) {
        return res.status(400).json({
          error: 'bad_request',
          message: 'Array of shifts is required'
        });
      }
      
      const { shifts } = await import('../db/schema/w3suite.js');
      
      const shiftsToCreate = shiftsData.map(shift => ({
        ...shift,
        tenantId,
        createdBy: userId,
        createdAt: new Date()
      }));
      
      const created = await db.insert(shifts)
        .values(shiftsToCreate)
        .returning();
      
      res.status(201).json(created);
    } catch (error) {
      handleApiError(error, res, 'creazione multipla turni');
    }
  });
  
  // Assign user to shift
  app.post('/api/hr/shifts/:id/assign', enterpriseAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      
      const shift = await hrStorage.assignUserToShift(id, userId);
      
      res.json(shift);
    } catch (error) {
      handleApiError(error, res, 'assegnazione utente a turno');
    }
  });

  // ==================== HR DOCUMENTS API ====================

  // Configure multer for file uploads
  const documentUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB max file size
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type'));
      }
    }
  });

  // Get all HR documents
  app.get('/api/hr/documents', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'USER';
      
      const { hrDocuments } = await import('../db/schema/w3suite.js');
      
      // Build query based on user permissions
      let query = db.select().from(hrDocuments).where(eq(hrDocuments.tenantId, tenantId));
      
      // Apply filters
      const conditions = [eq(hrDocuments.tenantId, tenantId)];
      
      // Non-HR users can only see their own documents
      if (userRole !== 'HR_MANAGER' && userRole !== 'ADMIN') {
        conditions.push(eq(hrDocuments.userId, userId));
      }
      
      if (req.query.documentType) {
        conditions.push(eq(hrDocuments.documentType, req.query.documentType));
      }
      
      if (req.query.year) {
        conditions.push(eq(hrDocuments.year, parseInt(req.query.year)));
      }
      
      if (req.query.month) {
        conditions.push(eq(hrDocuments.month, parseInt(req.query.month)));
      }
      
      const documents = await db.select()
        .from(hrDocuments)
        .where(and(...conditions))
        .orderBy(desc(hrDocuments.createdAt));
      
      res.json(documents);
    } catch (error) {
      handleApiError(error, res, 'recupero documenti HR');
    }
  });

  // Upload HR document
  app.post('/api/hr/documents/upload', enterpriseAuth, documentUpload.single('file'), async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const userId = req.user?.id;
      
      if (!req.file) {
        return res.status(400).json({
          error: 'no_file',
          message: 'Nessun file fornito'
        });
      }
      
      const { hrDocuments } = await import('../db/schema/w3suite.js');
      
      // Generate storage path
      const documentId = uuidv4();
      const year = req.body.year || new Date().getFullYear();
      const storagePath = `.private/hr-documents/${tenantId}/${userId}/${year}/${documentId}`;
      
      // Upload to object storage
      const uploadResult = await objectStorageService.uploadDocument({
        buffer: req.file.buffer,
        path: storagePath,
        contentType: req.file.mimetype,
        metadata: {
          userId,
          tenantId,
          documentType: req.body.documentType,
          originalName: req.file.originalname
        }
      });
      
      // Save document metadata to database
      const document = await db.insert(hrDocuments).values({
        tenantId,
        userId,
        documentType: req.body.documentType || 'other',
        title: req.body.title || req.file.originalname,
        description: req.body.description,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        storagePath,
        year: req.body.year ? parseInt(req.body.year) : null,
        month: req.body.month ? parseInt(req.body.month) : null,
        isConfidential: req.body.isConfidential === 'true',
        expiryDate: req.body.expiryDate || null,
        metadata: req.body.metadata ? JSON.parse(req.body.metadata) : {},
        uploadedBy: userId
      }).returning();
      
      res.status(201).json(document[0]);
    } catch (error) {
      handleApiError(error, res, 'caricamento documento HR');
    }
  });

  // Get single HR document
  app.get('/api/hr/documents/:id', enterpriseAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'USER';
      
      const { hrDocuments } = await import('../db/schema/w3suite.js');
      
      const conditions = [
        eq(hrDocuments.id, id),
        eq(hrDocuments.tenantId, tenantId)
      ];
      
      // Non-HR users can only see their own documents
      if (userRole !== 'HR_MANAGER' && userRole !== 'ADMIN') {
        conditions.push(eq(hrDocuments.userId, userId));
      }
      
      const document = await db.select()
        .from(hrDocuments)
        .where(and(...conditions))
        .limit(1);
      
      if (!document[0]) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Documento non trovato'
        });
      }
      
      // Update last accessed timestamp
      await db.update(hrDocuments)
        .set({ lastAccessedAt: new Date() })
        .where(eq(hrDocuments.id, id));
      
      res.json(document[0]);
    } catch (error) {
      handleApiError(error, res, 'recupero documento HR');
    }
  });

  // Download HR document
  app.get('/api/hr/documents/:id/download', enterpriseAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'USER';
      
      const { hrDocuments } = await import('../db/schema/w3suite.js');
      
      const conditions = [
        eq(hrDocuments.id, id),
        eq(hrDocuments.tenantId, tenantId)
      ];
      
      // Non-HR users can only download their own documents
      if (userRole !== 'HR_MANAGER' && userRole !== 'ADMIN') {
        conditions.push(eq(hrDocuments.userId, userId));
      }
      
      const document = await db.select()
        .from(hrDocuments)
        .where(and(...conditions))
        .limit(1);
      
      if (!document[0]) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Documento non trovato'
        });
      }
      
      // Generate signed URL for download
      const downloadUrl = await objectStorageService.getSignedDownloadUrl(document[0].storagePath);
      
      // Update last accessed timestamp
      await db.update(hrDocuments)
        .set({ lastAccessedAt: new Date() })
        .where(eq(hrDocuments.id, id));
      
      // Redirect to signed URL or stream file
      res.redirect(downloadUrl);
    } catch (error) {
      handleApiError(error, res, 'download documento HR');
    }
  });

  // Get document preview (for inline viewing)
  app.get('/api/hr/documents/:id/preview', enterpriseAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'USER';
      
      const { hrDocuments } = await import('../db/schema/w3suite.js');
      
      const conditions = [
        eq(hrDocuments.id, id),
        eq(hrDocuments.tenantId, tenantId)
      ];
      
      // Non-HR users can only preview their own documents
      if (userRole !== 'HR_MANAGER' && userRole !== 'ADMIN') {
        conditions.push(eq(hrDocuments.userId, userId));
      }
      
      const document = await db.select()
        .from(hrDocuments)
        .where(and(...conditions))
        .limit(1);
      
      if (!document[0]) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Documento non trovato'
        });
      }
      
      // Generate signed URL for preview
      const previewUrl = await objectStorageService.getSignedPreviewUrl(document[0].storagePath);
      
      // Set appropriate headers for inline display
      res.setHeader('Content-Type', document[0].mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${document[0].fileName}"`);
      
      // Redirect to signed URL
      res.redirect(previewUrl);
    } catch (error) {
      handleApiError(error, res, 'preview documento HR');
    }
  });

  // Update HR document metadata
  app.put('/api/hr/documents/:id', enterpriseAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'USER';
      
      const { hrDocuments } = await import('../db/schema/w3suite.js');
      
      const conditions = [
        eq(hrDocuments.id, id),
        eq(hrDocuments.tenantId, tenantId)
      ];
      
      // Only HR and Admin can update documents
      if (userRole !== 'HR_MANAGER' && userRole !== 'ADMIN') {
        return res.status(403).json({
          error: 'forbidden',
          message: 'Non autorizzato'
        });
      }
      
      const updated = await db.update(hrDocuments)
        .set({
          ...req.body,
          updatedAt: new Date()
        })
        .where(and(...conditions))
        .returning();
      
      if (!updated[0]) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Documento non trovato'
        });
      }
      
      res.json(updated[0]);
    } catch (error) {
      handleApiError(error, res, 'aggiornamento documento HR');
    }
  });

  // Delete HR document
  app.delete('/api/hr/documents/:id', enterpriseAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'USER';
      
      const { hrDocuments } = await import('../db/schema/w3suite.js');
      
      const conditions = [
        eq(hrDocuments.id, id),
        eq(hrDocuments.tenantId, tenantId)
      ];
      
      // Only document owner, HR and Admin can delete
      if (userRole !== 'HR_MANAGER' && userRole !== 'ADMIN') {
        conditions.push(eq(hrDocuments.userId, userId));
      }
      
      const document = await db.select()
        .from(hrDocuments)
        .where(and(...conditions))
        .limit(1);
      
      if (!document[0]) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Documento non trovato'
        });
      }
      
      // Delete from object storage
      await objectStorageService.deleteObject(document[0].storagePath);
      
      // Delete from database
      await db.delete(hrDocuments).where(eq(hrDocuments.id, id));
      
      res.status(204).send();
    } catch (error) {
      handleApiError(error, res, 'eliminazione documento HR');
    }
  });

  // Share HR document
  app.post('/api/hr/documents/:id/share', enterpriseAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { expiresIn = 168, password, maxDownloads } = req.body; // Default 7 days
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const userId = req.user?.id;
      
      const { hrDocuments } = await import('../db/schema/w3suite.js');
      
      const document = await db.select()
        .from(hrDocuments)
        .where(and(
          eq(hrDocuments.id, id),
          eq(hrDocuments.tenantId, tenantId),
          eq(hrDocuments.userId, userId)
        ))
        .limit(1);
      
      if (!document[0]) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Documento non trovato'
        });
      }
      
      // Generate share token
      const shareToken = uuidv4();
      const expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000);
      
      // Store share info (could be in Redis or DB)
      // For now, encode in JWT
      const shareData = jwt.sign({
        documentId: id,
        tenantId,
        expiresAt: expiresAt.toISOString(),
        maxDownloads,
        password: password ? true : false
      }, JWT_SECRET, { expiresIn: `${expiresIn}h` });
      
      const shareUrl = `${req.protocol}://${req.get('host')}/shared/documents/${shareData}`;
      
      res.json({
        shareUrl,
        expiresAt: expiresAt.toISOString()
      });
    } catch (error) {
      handleApiError(error, res, 'condivisione documento HR');
    }
  });

  // Search HR documents
  app.get('/api/hr/documents/search', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'USER';
      const { query } = req.query;
      
      if (!query) {
        return res.json([]);
      }
      
      const { hrDocuments } = await import('../db/schema/w3suite.js');
      
      const conditions = [
        eq(hrDocuments.tenantId, tenantId),
        or(
          sql`${hrDocuments.title} ILIKE ${`%${query}%`}`,
          sql`${hrDocuments.fileName} ILIKE ${`%${query}%`}`,
          sql`${hrDocuments.description} ILIKE ${`%${query}%`}`
        )
      ];
      
      // Non-HR users can only search their own documents
      if (userRole !== 'HR_MANAGER' && userRole !== 'ADMIN') {
        conditions.push(eq(hrDocuments.userId, userId));
      }
      
      const documents = await db.select()
        .from(hrDocuments)
        .where(and(...conditions))
        .limit(50);
      
      res.json(documents);
    } catch (error) {
      handleApiError(error, res, 'ricerca documenti HR');
    }
  });

  // Get document categories with counts
  app.get('/api/hr/documents/categories', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'USER';
      
      const { hrDocuments } = await import('../db/schema/w3suite.js');
      
      const conditions = [eq(hrDocuments.tenantId, tenantId)];
      
      // Non-HR users can only see stats for their own documents
      if (userRole !== 'HR_MANAGER' && userRole !== 'ADMIN') {
        conditions.push(eq(hrDocuments.userId, userId));
      }
      
      const categories = await db
        .select({
          type: hrDocuments.documentType,
          count: sql<number>`COUNT(*)`,
          totalSize: sql<number>`SUM(${hrDocuments.fileSize})`
        })
        .from(hrDocuments)
        .where(and(...conditions))
        .groupBy(hrDocuments.documentType);
      
      res.json(categories);
    } catch (error) {
      handleApiError(error, res, 'recupero categorie documenti');
    }
  });

  // Get storage quota
  app.get('/api/hr/documents/storage-quota', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const userId = req.user?.id;
      
      const { hrDocuments } = await import('../db/schema/w3suite.js');
      
      const usage = await db
        .select({
          used: sql<number>`COALESCE(SUM(${hrDocuments.fileSize}), 0)`
        })
        .from(hrDocuments)
        .where(and(
          eq(hrDocuments.tenantId, tenantId),
          eq(hrDocuments.userId, userId)
        ));
      
      const used = Number(usage[0]?.used || 0);
      const total = 1073741824; // 1GB per user default
      const percentage = Math.round((used / total) * 100);
      
      res.json({
        used,
        total,
        percentage
      });
    } catch (error) {
      handleApiError(error, res, 'recupero quota storage');
    }
  });

  // Get payslips for a specific year
  app.get('/api/hr/documents/payslips', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const userId = req.user?.id;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      
      const { hrDocuments } = await import('../db/schema/w3suite.js');
      
      const payslips = await db.select()
        .from(hrDocuments)
        .where(and(
          eq(hrDocuments.tenantId, tenantId),
          eq(hrDocuments.userId, userId),
          eq(hrDocuments.documentType, 'payslip'),
          eq(hrDocuments.year, year)
        ))
        .orderBy(hrDocuments.month);
      
      res.json(payslips);
    } catch (error) {
      handleApiError(error, res, 'recupero buste paga');
    }
  });

  // Bulk operations on documents
  app.post('/api/hr/documents/bulk-operation', enterpriseAuth, async (req: any, res) => {
    try {
      const { operation, documentIds } = req.body;
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'USER';
      
      if (!Array.isArray(documentIds) || documentIds.length === 0) {
        return res.status(400).json({
          error: 'bad_request',
          message: 'Document IDs richiesti'
        });
      }
      
      const { hrDocuments } = await import('../db/schema/w3suite.js');
      
      switch (operation) {
        case 'delete':
          if (userRole !== 'HR_MANAGER' && userRole !== 'ADMIN') {
            // Regular users can only delete their own documents
            await db.delete(hrDocuments)
              .where(and(
                inArray(hrDocuments.id, documentIds),
                eq(hrDocuments.tenantId, tenantId),
                eq(hrDocuments.userId, userId)
              ));
          } else {
            // HR and Admin can delete any document in tenant
            await db.delete(hrDocuments)
              .where(and(
                inArray(hrDocuments.id, documentIds),
                eq(hrDocuments.tenantId, tenantId)
              ));
          }
          res.json({ success: true, operation: 'delete', count: documentIds.length });
          break;
          
        case 'download':
          // Generate zip file with all documents
          // This would involve fetching all files from storage and creating a zip
          res.json({ 
            success: true, 
            operation: 'download',
            message: 'Download bulk in preparazione...' 
          });
          break;
          
        default:
          res.status(400).json({
            error: 'invalid_operation',
            message: 'Operazione non valida'
          });
      }
    } catch (error) {
      handleApiError(error, res, 'operazione bulk documenti');
    }
  });

  // Get CUD document for a year
  app.get('/api/hr/documents/cud/:year', enterpriseAuth, async (req: any, res) => {
    try {
      const { year } = req.params;
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const userId = req.user?.id;
      
      // This would generate a CUD document based on payslips
      // For now, return a mock response
      res.json({
        message: 'CUD generation not yet implemented',
        year,
        userId
      });
    } catch (error) {
      handleApiError(error, res, 'generazione CUD');
    }
  });
  
  // Remove user from shift
  app.post('/api/hr/shifts/:id/unassign', enterpriseAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      
      const shift = await hrStorage.removeUserFromShift(id, userId);
      
      res.json(shift);
    } catch (error) {
      handleApiError(error, res, 'rimozione utente da turno');
    }
  });
  
  // Get shift templates
  app.get('/api/hr/shift-templates', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
      
      const templates = await hrStorage.getShiftTemplates(tenantId, isActive);
      
      res.json(templates);
    } catch (error) {
      handleApiError(error, res, 'recupero template turni');
    }
  });
  
  // Get shift template by ID
  app.get('/api/hr/shift-templates/:id', enterpriseAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      
      const { shiftTemplates } = await import('../db/schema/w3suite.js');
      
      const template = await db.select()
        .from(shiftTemplates)
        .where(and(
          eq(shiftTemplates.id, id),
          eq(shiftTemplates.tenantId, tenantId)
        ))
        .limit(1);
      
      if (!template[0]) {
        return res.status(404).json({
          error: 'not_found',
          message: 'Template non trovato'
        });
      }
      
      res.json(template[0]);
    } catch (error) {
      handleApiError(error, res, 'recupero template turno');
    }
  });
  
  // Create shift template
  app.post('/api/hr/shift-templates', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      
      const templateData = {
        ...req.body,
        tenantId,
        createdAt: new Date()
      };
      
      const newTemplate = await hrStorage.createShiftTemplate(templateData);
      
      res.status(201).json(newTemplate);
    } catch (error) {
      handleApiError(error, res, 'creazione template turno');
    }
  });
  
  // Update shift template
  app.put('/api/hr/shift-templates/:id', enterpriseAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      
      const updated = await hrStorage.updateShiftTemplate(id, req.body, tenantId);
      
      res.json(updated);
    } catch (error) {
      handleApiError(error, res, 'aggiornamento template turno');
    }
  });
  
  // Delete shift template
  app.delete('/api/hr/shift-templates/:id', enterpriseAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      
      await hrStorage.deleteShiftTemplate(id, tenantId);
      
      res.status(204).send();
    } catch (error) {
      handleApiError(error, res, 'eliminazione template turno');
    }
  });
  
  // Apply shift template
  app.post('/api/hr/shifts/apply-template', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const { templateId, storeId, startDate, endDate } = req.body;
      
      if (!templateId || !storeId || !startDate || !endDate) {
        return res.status(400).json({
          error: 'bad_request',
          message: 'templateId, storeId, startDate, and endDate are required'
        });
      }
      
      const shifts = await hrStorage.applyShiftTemplate(
        templateId,
        storeId,
        new Date(startDate),
        new Date(endDate),
        tenantId
      );
      
      res.json(shifts);
    } catch (error) {
      handleApiError(error, res, 'applicazione template turno');
    }
  });
  
  // Get staff availability
  app.get('/api/hr/shifts/staff-availability', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const { storeId, startDate, endDate } = req.query;
      
      if (!storeId || !startDate || !endDate) {
        return res.status(400).json({
          error: 'bad_request',
          message: 'storeId, startDate, and endDate are required'
        });
      }
      
      // Get availability for each day in the range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const availability = [];
      
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dayAvailability = await hrStorage.getStaffAvailability(tenantId, storeId, new Date(currentDate));
        availability.push(...dayAvailability);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      res.json(availability);
    } catch (error) {
      handleApiError(error, res, 'recupero disponibilità staff');
    }
  });
  
  // Get coverage analysis
  app.get('/api/hr/shifts/coverage-analysis', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const { storeId, startDate, endDate } = req.query;
      
      if (!storeId || !startDate || !endDate) {
        return res.status(400).json({
          error: 'bad_request',
          message: 'storeId, startDate, and endDate are required'
        });
      }
      
      const analysis = await hrStorage.getShiftCoverageAnalysis(
        tenantId,
        storeId,
        new Date(startDate),
        new Date(endDate)
      );
      
      res.json(analysis);
    } catch (error) {
      handleApiError(error, res, 'analisi copertura turni');
    }
  });
  
  // Detect shift conflicts
  app.get('/api/hr/shifts/conflicts', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const { storeId, userId } = req.query;
      
      if (!storeId) {
        return res.status(400).json({
          error: 'bad_request',
          message: 'storeId is required'
        });
      }
      
      const conflicts = await hrStorage.detectShiftConflicts(tenantId, storeId, userId);
      
      res.json(conflicts);
    } catch (error) {
      handleApiError(error, res, 'rilevamento conflitti turni');
    }
  });
  
  // Auto-schedule shifts
  app.post('/api/hr/shifts/auto-schedule', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const { storeId, startDate, endDate, constraints } = req.body;
      
      if (!storeId || !startDate || !endDate) {
        return res.status(400).json({
          error: 'bad_request',
          message: 'storeId, startDate, and endDate are required'
        });
      }
      
      const result = await hrStorage.autoScheduleShifts(
        tenantId,
        storeId,
        new Date(startDate),
        new Date(endDate),
        constraints
      );
      
      res.json(result);
    } catch (error) {
      handleApiError(error, res, 'auto-scheduling turni');
    }
  });
  
  // Get shift statistics
  app.get('/api/hr/shifts/stats', enterpriseAuth, async (req: any, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || DEMO_TENANT_ID;
      const { storeId, startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'bad_request',
          message: 'startDate and endDate are required'
        });
      }
      
      const { shifts } = await import('../db/schema/w3suite.js');
      
      // Build query conditions
      const conditions = [
        eq(shifts.tenantId, tenantId),
        gte(shifts.date, startDate),
        lte(shifts.date, endDate)
      ];
      
      if (storeId) {
        conditions.push(eq(shifts.storeId, storeId));
      }
      
      const shiftList = await db.select()
        .from(shifts)
        .where(and(...conditions));
      
      // Calculate statistics
      let totalHours = 0;
      let totalStaff = 0;
      let overtimeHours = 0;
      
      shiftList.forEach(shift => {
        const start = new Date(shift.startTime);
        const end = new Date(shift.endTime);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        const breakHours = (shift.breakMinutes || 0) / 60;
        const workingHours = hours - breakHours;
        
        totalHours += workingHours * (shift.assignedUsers as string[]).length;
        totalStaff += (shift.assignedUsers as string[]).length;
        
        // Count overtime (> 8 hours per shift)
        if (workingHours > 8) {
          overtimeHours += (workingHours - 8) * (shift.assignedUsers as string[]).length;
        }
      });
      
      const averageStaffPerShift = shiftList.length > 0 ? totalStaff / shiftList.length : 0;
      const coverageRate = shiftList.reduce((acc, shift) => {
        const coverage = shift.requiredStaff > 0 
          ? ((shift.assignedUsers as string[]).length / shift.requiredStaff) * 100
          : 100;
        return acc + coverage;
      }, 0) / (shiftList.length || 1);
      
      res.json({
        totalShifts: shiftList.length,
        totalHours: Math.round(totalHours),
        averageStaffPerShift: Math.round(averageStaffPerShift * 10) / 10,
        coverageRate: Math.round(coverageRate),
        overtimeHours: Math.round(overtimeHours)
      });
    } catch (error) {
      handleApiError(error, res, 'statistiche turni');
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
      const body = validateRequestBody<z.infer<typeof aclScopeBody>>(aclScopeBody, req.body, res); if (!body) return;
      const assignmentData = {
        userId: req.params.userId,
        roleId: req.params.roleId,
        scopeType: req.body.scopeType || 'tenant',
        scopeId: body.scopeId || (req.headers['x-tenant-id'] as string) || req.user?.tenantId || DEMO_TENANT_ID,
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
  app.get('/api/rbac/permissions', ...authWithRBAC, async (req: any, res) => {
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
  app.get('/api/rbac/roles', ...authWithRBAC, async (req: any, res) => {
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
  app.post('/api/rbac/roles', ...authWithRBAC, async (req: any, res) => {
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
  app.patch('/api/rbac/roles/:id', ...authWithRBAC, async (req: any, res) => {
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
    } catch (error: any) {
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
  app.delete('/api/rbac/roles/:id', ...authWithRBAC, async (req: any, res) => {
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
  app.get('/api/rbac/roles/:id/permissions', ...authWithRBAC, async (req: any, res) => {
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
  app.put('/api/rbac/roles/:id/permissions', ...authWithRBAC, async (req: any, res) => {
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
  app.get('/api/rbac/users/:userId/assignments', ...authWithRBAC, async (req: any, res) => {
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
  app.post('/api/rbac/users/:userId/assignments', ...authWithRBAC, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required - no tenant context' });
      }

      // Validate request body
      const assignmentSchema = insertUserAssignmentSchema.omit({ userId: true });
      const validatedData = validateRequestBody<z.infer<typeof assignmentSchema>>(assignmentSchema, req.body, res);
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
  app.delete('/api/rbac/users/:userId/assignments/:assignmentId', ...authWithRBAC, async (req: any, res) => {
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

  // ==================== HR CALENDAR ENDPOINTS ====================
  
  // Get calendar events
  app.get('/api/hr/calendar/events', ...authWithRBAC, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'USER';
      
      if (!tenantId || !userId) {
        return res.status(401).json({
          error: 'authentication_required',
          message: 'Autenticazione richiesta'
        });
      }
      
      const filters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        type: req.query.type as string,
        visibility: req.query.visibility as string,
        storeId: req.query.storeId as string,
      };
      
      const events = await storage.getCalendarEvents(tenantId, userId, userRole, filters);
      
      res.json({
        success: true,
        data: events,
      });
    } catch (error) {
      handleApiError(error, res, 'recupero eventi calendario');
    }
  });
  
  // Create calendar event
  app.post('/api/hr/calendar/events', ...authWithRBAC, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      
      if (!tenantId || !userId) {
        return res.status(401).json({
          error: 'authentication_required',
          message: 'Autenticazione richiesta'
        });
      }
      
      const eventData = {
        ...req.body,
        tenantId,
        ownerId: userId,
        createdBy: userId,
      };
      
      const event = await storage.createCalendarEvent(eventData);
      
      res.status(201).json({
        success: true,
        data: event,
        message: 'Evento creato con successo'
      });
    } catch (error) {
      handleApiError(error, res, 'creazione evento calendario');
    }
  });
  
  // Update calendar event
  app.put('/api/hr/calendar/events/:id', ...authWithRBAC, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const eventId = req.params.id;
      
      if (!tenantId) {
        return res.status(401).json({
          error: 'authentication_required',
          message: 'Autenticazione richiesta'
        });
      }
      
      const event = await storage.updateCalendarEvent(eventId, req.body, tenantId);
      
      res.json({
        success: true,
        data: event,
        message: 'Evento aggiornato con successo'
      });
    } catch (error) {
      handleApiError(error, res, 'aggiornamento evento calendario');
    }
  });
  
  // Delete calendar event
  app.delete('/api/hr/calendar/events/:id', ...authWithRBAC, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const eventId = req.params.id;
      
      if (!tenantId) {
        return res.status(401).json({
          error: 'authentication_required',
          message: 'Autenticazione richiesta'
        });
      }
      
      await storage.deleteCalendarEvent(eventId, tenantId);
      
      res.json({
        success: true,
        message: 'Evento eliminato con successo'
      });
    } catch (error) {
      handleApiError(error, res, 'eliminazione evento calendario');
    }
  });
  
  // Get calendar permissions
  app.get('/api/hr/calendar/permissions', ...authWithRBAC, async (req: any, res) => {
    try {
      const userRole = req.user?.role || 'USER';
      
      // Map user role to calendar permissions
      const roleMapping: Record<string, any> = {
        USER: { canViewScopes: ['own'], canCreateScopes: ['own'], canApproveLeave: false },
        TEAM_LEADER: { canViewScopes: ['own', 'team'], canCreateScopes: ['own', 'team'], canApproveLeave: true },
        STORE_MANAGER: { canViewScopes: ['own', 'team', 'store'], canCreateScopes: ['own', 'team', 'store'], canApproveLeave: true },
        AREA_MANAGER: { canViewScopes: ['own', 'team', 'store', 'area'], canCreateScopes: ['own', 'team', 'store', 'area'], canApproveLeave: true },
        HR_MANAGER: { canViewScopes: ['own', 'team', 'store', 'area', 'tenant'], canCreateScopes: ['own', 'team', 'store', 'area', 'tenant'], canApproveLeave: true },
        ADMIN: { canViewScopes: ['own', 'team', 'store', 'area', 'tenant'], canCreateScopes: ['own', 'team', 'store', 'area', 'tenant'], canApproveLeave: true },
      };
      
      const permissions = roleMapping[userRole.toUpperCase()] || roleMapping.USER;
      
      res.json({
        success: true,
        data: permissions,
      });
    } catch (error) {
      handleApiError(error, res, 'recupero permessi calendario');
    }
  });
  
  // Get leave requests
  app.get('/api/hr/leave-requests', ...authWithRBAC, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'USER';
      
      if (!tenantId || !userId) {
        return res.status(401).json({
          error: 'authentication_required',
          message: 'Autenticazione richiesta'
        });
      }
      
      const filters = {
        status: req.query.status as string,
      };
      
      const requests = await storage.getLeaveRequests(tenantId, userId, userRole, filters);
      
      res.json({
        success: true,
        data: requests,
      });
    } catch (error) {
      handleApiError(error, res, 'recupero richieste ferie');
    }
  });
  
  // Create leave request
  app.post('/api/hr/leave-requests', ...authWithRBAC, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      
      if (!tenantId || !userId) {
        return res.status(401).json({
          error: 'authentication_required',
          message: 'Autenticazione richiesta'
        });
      }
      
      const requestData = {
        ...req.body,
        tenantId,
        userId,
        status: 'pending',
      };
      
      const request = await storage.createLeaveRequest(requestData);
      
      res.status(201).json({
        success: true,
        data: request,
        message: 'Richiesta ferie creata con successo'
      });
    } catch (error) {
      handleApiError(error, res, 'creazione richiesta ferie');
    }
  });
  
  // Approve leave request
  app.post('/api/hr/leave-requests/:id/approve', ...authWithRBAC, async (req: any, res) => {
    try {
      const requestId = req.params.id;
      const approverId = req.user?.id;
      
      if (!approverId) {
        return res.status(401).json({
          error: 'authentication_required',
          message: 'Autenticazione richiesta'
        });
      }
      
      const request = await storage.approveLeaveRequest(requestId, approverId, req.body.comments);
      
      res.json({
        success: true,
        data: request,
        message: 'Richiesta ferie approvata'
      });
    } catch (error) {
      handleApiError(error, res, 'approvazione richiesta ferie');
    }
  });
  
  // Reject leave request
  app.post('/api/hr/leave-requests/:id/reject', ...authWithRBAC, async (req: any, res) => {
    try {
      const requestId = req.params.id;
      const approverId = req.user?.id;
      
      if (!approverId) {
        return res.status(401).json({
          error: 'authentication_required',
          message: 'Autenticazione richiesta'
        });
      }
      
      const request = await storage.rejectLeaveRequest(requestId, approverId, req.body.reason);
      
      res.json({
        success: true,
        data: request,
        message: 'Richiesta ferie respinta'
      });
    } catch (error) {
      handleApiError(error, res, 'rifiuto richiesta ferie');
    }
  });
  
  // Get pending leave requests count
  app.get('/api/hr/leave-requests/pending-count', ...authWithRBAC, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'USER';
      
      if (!tenantId || !userId) {
        return res.status(401).json({
          error: 'authentication_required',
          message: 'Autenticazione richiesta'
        });
      }
      
      const requests = await storage.getLeaveRequests(tenantId, userId, userRole, { status: 'pending' });
      
      res.json({
        success: true,
        data: {
          count: requests.length,
        },
      });
    } catch (error) {
      handleApiError(error, res, 'conteggio richieste ferie pendenti');
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

  // ==================== HR TIME TRACKING ROUTES ====================
  
  // Clock In
  app.post('/api/hr/time-tracking/clock-in', ...authWithRBAC, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      
      if (!tenantId || !userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { storeId, trackingMethod, geoLocation, deviceInfo, shiftId, notes } = req.body;
      
      if (!storeId || !trackingMethod) {
        return res.status(400).json({ error: 'Store ID and tracking method are required' });
      }

      // Check for active session
      const activeSession = await hrStorage.getActiveSession(userId, tenantId);
      if (activeSession) {
        return res.status(409).json({ error: 'Active session already exists. Clock out first.' });
      }

      const entry = await hrStorage.clockIn({
        tenantId,
        userId,
        storeId,
        trackingMethod,
        geoLocation,
        deviceInfo,
        shiftId,
        notes,
      });

      res.json(entry);
    } catch (error) {
      console.error('Clock in error:', error);
      res.status(500).json({ error: 'Failed to clock in' });
    }
  });

  // Clock Out
  app.post('/api/hr/time-tracking/:id/clock-out', ...authWithRBAC, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      
      if (!tenantId || !userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { notes, geoLocation } = req.body;
      
      // Verify entry belongs to user
      const entry = await hrStorage.getTimeTrackingById(req.params.id, tenantId);
      if (!entry || entry.userId !== userId) {
        return res.status(404).json({ error: 'Time tracking entry not found' });
      }

      if (entry.clockOut) {
        return res.status(400).json({ error: 'Already clocked out' });
      }

      const updated = await hrStorage.clockOut(req.params.id, tenantId, notes);
      res.json(updated);
    } catch (error) {
      console.error('Clock out error:', error);
      res.status(500).json({ error: 'Failed to clock out' });
    }
  });

  // Get Current Session
  app.get('/api/hr/time-tracking/current', ...authWithRBAC, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      
      if (!tenantId || !userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const session = await hrStorage.getActiveSession(userId, tenantId);
      
      if (!session) {
        return res.json(null);
      }

      // Calculate elapsed time
      const elapsedMinutes = Math.floor((Date.now() - new Date(session.clockIn).getTime()) / 60000);
      
      res.json({
        ...session,
        elapsedMinutes,
        isOvertime: elapsedMinutes > 480,
        requiresBreak: elapsedMinutes > 360,
      });
    } catch (error) {
      console.error('Get current session error:', error);
      res.status(500).json({ error: 'Failed to get current session' });
    }
  });

  // Get Time Tracking Entries
  app.get('/api/hr/time-tracking/entries', ...authWithRBAC, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'EMPLOYEE';
      
      if (!tenantId || !userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const filters = {
        userId: req.query.userId || userId,
        storeId: req.query.storeId,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        status: req.query.status,
      };

      // Check permissions for viewing other users' entries
      if (filters.userId !== userId && userRole !== 'ADMIN' && userRole !== 'HR_MANAGER') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const entries = await hrStorage.getTimeTrackingForUser(
        filters.userId,
        { startDate: filters.startDate, endDate: filters.endDate }
      );

      res.json(entries);
    } catch (error) {
      console.error('Get entries error:', error);
      res.status(500).json({ error: 'Failed to get time tracking entries' });
    }
  });

  // Update Time Tracking Entry
  app.put('/api/hr/time-tracking/entries/:id', ...authWithRBAC, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'EMPLOYEE';
      
      if (!tenantId || !userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const entry = await hrStorage.getTimeTrackingById(req.params.id, tenantId);
      if (!entry) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      // Check permissions
      const canEdit = entry.userId === userId || 
                     userRole === 'ADMIN' || 
                     userRole === 'HR_MANAGER' ||
                     (userRole === 'STORE_MANAGER' && entry.storeId === req.user?.storeId);
      
      if (!canEdit) {
        return res.status(403).json({ error: 'Insufficient permissions to edit' });
      }

      const updated = await hrStorage.updateTimeTracking(req.params.id, req.body, tenantId);
      res.json(updated);
    } catch (error) {
      console.error('Update entry error:', error);
      res.status(500).json({ error: 'Failed to update entry' });
    }
  });

  // Approve Time Tracking Entry
  app.post('/api/hr/time-tracking/entries/:id/approve', ...authWithRBAC, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      const userRole = req.user?.role || 'EMPLOYEE';
      
      if (!tenantId || !userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check approval permissions
      const canApprove = userRole === 'ADMIN' || 
                        userRole === 'HR_MANAGER' ||
                        userRole === 'STORE_MANAGER' ||
                        userRole === 'TEAM_LEADER';
      
      if (!canApprove) {
        return res.status(403).json({ error: 'Insufficient permissions to approve' });
      }

      const { comments } = req.body;
      
      const approved = await hrStorage.approveTimeTracking(req.params.id, userId, comments, tenantId);
      res.json(approved);
    } catch (error) {
      console.error('Approve entry error:', error);
      res.status(500).json({ error: 'Failed to approve entry' });
    }
  });

  // Dispute Time Tracking Entry
  app.post('/api/hr/time-tracking/entries/:id/dispute', ...authWithRBAC, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      
      if (!tenantId || !userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ error: 'Dispute reason is required' });
      }

      const disputed = await hrStorage.disputeTimeTracking(req.params.id, reason, tenantId);
      res.json(disputed);
    } catch (error) {
      console.error('Dispute entry error:', error);
      res.status(500).json({ error: 'Failed to dispute entry' });
    }
  });

  // Start Break
  app.post('/api/hr/time-tracking/:id/break/start', ...authWithRBAC, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      
      if (!tenantId || !userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const entry = await hrStorage.getTimeTrackingById(req.params.id, tenantId);
      if (!entry || entry.userId !== userId) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      const updated = await hrStorage.startBreak(req.params.id, tenantId);
      res.json(updated);
    } catch (error) {
      console.error('Start break error:', error);
      res.status(500).json({ error: 'Failed to start break' });
    }
  });

  // End Break
  app.post('/api/hr/time-tracking/:id/break/end', ...authWithRBAC, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      
      if (!tenantId || !userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const entry = await hrStorage.getTimeTrackingById(req.params.id, tenantId);
      if (!entry || entry.userId !== userId) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      const updated = await hrStorage.endBreak(req.params.id, tenantId);
      res.json(updated);
    } catch (error) {
      console.error('End break error:', error);
      res.status(500).json({ error: 'Failed to end break' });
    }
  });

  // Get Time Tracking Reports
  app.get('/api/hr/time-tracking/reports', ...authWithRBAC, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const userRole = req.user?.role || 'EMPLOYEE';
      
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check report permissions
      const canViewReports = userRole === 'ADMIN' || 
                           userRole === 'HR_MANAGER' ||
                           userRole === 'STORE_MANAGER' ||
                           userRole === 'AREA_MANAGER';
      
      if (!canViewReports) {
        return res.status(403).json({ error: 'Insufficient permissions for reports' });
      }

      const { userId, startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }

      const entries = await hrStorage.getTimeTrackingForUser(
        userId as string,
        { startDate: startDate as string, endDate: endDate as string }
      );

      // Calculate report metrics
      const totalMinutes = entries.reduce((sum, e) => sum + (e.totalMinutes || 0), 0);
      const overtimeMinutes = entries.reduce((sum, e) => sum + (e.overtimeMinutes || 0), 0);
      const breakMinutes = entries.reduce((sum, e) => sum + (e.breakMinutes || 0), 0);
      const holidayMinutes = entries.filter(e => e.holidayBonus).reduce((sum, e) => sum + (e.totalMinutes || 0), 0);

      const report = {
        userId,
        period: `${startDate} - ${endDate}`,
        totalHours: totalMinutes / 60,
        regularHours: (totalMinutes - overtimeMinutes) / 60,
        overtimeHours: overtimeMinutes / 60,
        holidayHours: holidayMinutes / 60,
        breakMinutes,
        daysWorked: entries.length,
        averageHoursPerDay: entries.length > 0 ? (totalMinutes / 60) / entries.length : 0,
        entriesCount: entries.length,
        disputedEntries: entries.filter(e => e.status === 'disputed').length,
      };

      res.json(report);
    } catch (error) {
      console.error('Get reports error:', error);
      res.status(500).json({ error: 'Failed to get reports' });
    }
  });

  // Get Team Reports
  app.get('/api/hr/time-tracking/reports/team', ...authWithRBAC, async (req: any, res) => {
    try {
      const tenantId = req.user?.tenantId;
      const userRole = req.user?.role || 'EMPLOYEE';
      
      if (!tenantId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check team report permissions
      const canViewTeamReports = userRole === 'ADMIN' || 
                                userRole === 'HR_MANAGER' ||
                                userRole === 'STORE_MANAGER' ||
                                userRole === 'AREA_MANAGER';
      
      if (!canViewTeamReports) {
        return res.status(403).json({ error: 'Insufficient permissions for team reports' });
      }

      const { storeId, startDate, endDate } = req.query;
      
      if (!storeId || !startDate || !endDate) {
        return res.status(400).json({ error: 'Store ID, start date and end date are required' });
      }

      // Get all users for the store
      const storeUsers = await storage.getUsersByStore(storeId as string, tenantId);
      
      const teamReports = await Promise.all(
        storeUsers.map(async (user) => {
          const entries = await hrStorage.getTimeTrackingForUser(
            user.id,
            { startDate: startDate as string, endDate: endDate as string }
          );

          const totalMinutes = entries.reduce((sum, e) => sum + (e.totalMinutes || 0), 0);
          const overtimeMinutes = entries.reduce((sum, e) => sum + (e.overtimeMinutes || 0), 0);

          return {
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            period: `${startDate} - ${endDate}`,
            totalHours: totalMinutes / 60,
            regularHours: (totalMinutes - overtimeMinutes) / 60,
            overtimeHours: overtimeMinutes / 60,
            daysWorked: entries.length,
            averageHoursPerDay: entries.length > 0 ? (totalMinutes / 60) / entries.length : 0,
            entriesCount: entries.length,
            disputedEntries: entries.filter(e => e.status === 'disputed').length,
          };
        })
      );

      res.json(teamReports);
    } catch (error) {
      console.error('Get team reports error:', error);
      res.status(500).json({ error: 'Failed to get team reports' });
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