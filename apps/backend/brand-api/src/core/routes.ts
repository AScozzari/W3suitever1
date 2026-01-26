import express from "express";
import http from "http";
import bcrypt from "bcryptjs";
import { sql, eq, isNull, and } from "drizzle-orm";
import { db } from "../../../api/src/core/db.js";
import { createTenantContextMiddleware, BrandAuthService, authenticateToken, BRAND_TENANT_ID } from "./auth.js";
import { brandStorage } from "./storage.js";
import { insertStoreSchema, tenantGtmConfig, tenants } from "../../../api/src/db/schema/index.js";
import { EncryptionKeyService } from "../../../api/src/core/encryption-service.js";
import { 
  insertBrandCategorySchema, updateBrandCategorySchema,
  insertBrandProductTypeSchema, updateBrandProductTypeSchema,
  insertBrandProductSchema, updateBrandProductSchema,
  insertBrandSupplierSchema, updateBrandSupplierSchema
} from "../../../api/src/db/schema/brand-interface.js";
import { templateStorageService, type TemplateType } from "../services/template-storage.service.js";

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
  app.use(express.json({ limit: '50mb' })); // Increased to 50MB to support large payloads (price lists, products)

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

  // Verify token endpoint - requires auth (with development bypass)
  app.get("/brand-api/auth/me", async (req, res, next) => {
    // Development mode bypass
    if (process.env.NODE_ENV === "development") {
      const savedToken = req.headers.authorization?.replace('Bearer ', '');
      // If no token or invalid, return dev user
      if (!savedToken) {
        return res.json({ 
          success: true,
          user: {
            id: "brand-admin-user",
            email: "admin@brandinterface.com",
            firstName: "Brand",
            lastName: "Admin",
            role: "super_admin",
            commercialAreas: [],
            permissions: ["*"]
          }
        });
      }
      // Try to verify token, if fails return dev user
      try {
        const decoded = BrandAuthService.verifyToken(savedToken);
        return res.json({ success: true, user: decoded });
      } catch (err) {
        console.log("🔧 [BRAND-DEV] Token invalid/expired, using dev user");
        return res.json({ 
          success: true,
          user: {
            id: "brand-admin-user",
            email: "admin@brandinterface.com",
            firstName: "Brand",
            lastName: "Admin",
            role: "super_admin",
            commercialAreas: [],
            permissions: ["*"]
          }
        });
      }
    }
    // Production: use authenticateToken middleware
    authenticateToken()(req, res, () => {
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
  });

  // Apply JWT authentication middleware to all routes except auth/login and health
  app.use("/brand-api", (req, res, next) => {
    // Skip auth for login, health, auth/me and reference endpoints  
    if (req.path === "/auth/login" || req.path === "/auth/me" || req.path === "/health" || req.path.startsWith("/reference/")) {
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

  // Get single organization by ID
  app.get("/brand-api/organizations/:id", async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;
    const { id } = req.params;

    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to view organization details" });
    }

    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }

    try {
      const organization = await brandStorage.getOrganization(id);
      
      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      res.json({
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          status: organization.status,
          notes: organization.notes,
          createdAt: organization.createdAt,
          updatedAt: organization.updatedAt
        },
        context: "cross-tenant",
        message: `Organization details for ${organization.name}`
      });
    } catch (error) {
      console.error(`Error fetching organization ${id}:`, error);
      res.status(500).json({ error: "Failed to fetch organization details" });
    }
  });

  // Create organization (tenant) with admin user
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
      const { name, slug, status, notes, admin } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Organization name is required" });
      }

      // Validate admin data if provided
      if (admin) {
        if (!admin.email) {
          return res.status(400).json({ error: "Admin email is required" });
        }
        if (!admin.password || admin.password.length < 8) {
          return res.status(400).json({ error: "Admin password must be at least 8 characters" });
        }
      }

      // Generate slug from name if not provided
      const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      // Check if slug already exists
      const slugExists = await brandStorage.validateSlug(finalSlug);
      if (!slugExists) {
        return res.status(400).json({ error: `Slug "${finalSlug}" is already in use` });
      }

      // Create organization in w3suite.tenants (NOT brand_interface.tenants!)
      console.log(`📝 Creating tenant in w3suite.tenants: ${name} (${finalSlug})`);
      const organization = await brandStorage.createOrganizationRecord({
        name,
        slug: finalSlug,
        status: status || 'attivo',
        notes: notes || null
      });
      console.log(`✅ Tenant created in w3suite.tenants: ${organization.id}`);

      let adminUser = null;

      // Create admin user if data provided
      if (admin) {
        const passwordHash = await bcrypt.hash(admin.password, 10);
        
        adminUser = await brandStorage.createTenantAdmin({
          tenantId: organization.id,
          email: admin.email.toLowerCase().trim(),
          passwordHash,
          firstName: admin.firstName || 'Admin',
          lastName: admin.lastName || organization.name,
          role: 'admin',
          status: 'attivo',
          isSystemAdmin: true
        });
      }

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
        admin: adminUser ? {
          id: adminUser.id,
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          role: adminUser.role
        } : null,
        message: adminUser 
          ? "Organization and admin user created successfully" 
          : "Organization created successfully (no admin)"
      });
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({ error: "Failed to create organization" });
    }
  });

  // Update organization (tenant) - name and slug
  app.patch("/brand-api/organizations/:id", express.json(), async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;
    const { id } = req.params;

    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to update organizations" });
    }

    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }

    try {
      const { name, slug, notes } = req.body;
      
      // If slug is being changed, validate it's unique (excluding current org)
      if (slug) {
        const currentOrg = await brandStorage.getOrganization(id);
        if (currentOrg && currentOrg.slug !== slug) {
          const slugValid = await brandStorage.validateSlug(slug);
          if (!slugValid) {
            return res.status(400).json({ error: `Slug "${slug}" is already in use` });
          }
        }
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (slug) updateData.slug = slug;
      if (notes !== undefined) updateData.notes = notes;

      const organization = await brandStorage.updateOrganization(id, updateData);

      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      res.json({
        success: true,
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          status: organization.status,
          notes: organization.notes
        },
        message: "Organization updated successfully"
      });
    } catch (error) {
      console.error("Error updating organization:", error);
      res.status(500).json({ error: "Failed to update organization" });
    }
  });

  // Suspend organization (tenant)
  app.patch("/brand-api/organizations/:id/suspend", async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;
    const { id } = req.params;

    console.log(`🔒 [SUSPEND] Request to suspend tenant: ${id} by user: ${user.email}`);

    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to suspend organizations" });
    }

    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }

    try {
      console.log(`🔒 [SUSPEND] Updating tenant ${id} status to 'sospeso'`);
      const organization = await brandStorage.updateOrganization(id, { 
        status: 'sospeso' 
      });

      if (!organization) {
        console.log(`❌ [SUSPEND] Tenant not found: ${id}`);
        return res.status(404).json({ error: "Organization not found" });
      }

      console.log(`✅ [SUSPEND] Tenant ${id} suspended. New status: ${organization.status}`);
      res.json({
        success: true,
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          status: organization.status
        },
        message: "Organization suspended successfully"
      });
    } catch (error) {
      console.error("❌ [SUSPEND] Error suspending organization:", error);
      res.status(500).json({ error: "Failed to suspend organization" });
    }
  });

  // Reactivate organization (tenant)
  app.patch("/brand-api/organizations/:id/reactivate", async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;
    const { id } = req.params;

    console.log(`🔓 [REACTIVATE] Request to reactivate tenant: ${id} by user: ${user.email}`);

    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to reactivate organizations" });
    }

    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }

    try {
      console.log(`🔓 [REACTIVATE] Updating tenant ${id} status to 'attivo'`);
      const organization = await brandStorage.updateOrganization(id, { 
        status: 'attivo' 
      });

      if (!organization) {
        console.log(`❌ [REACTIVATE] Tenant not found: ${id}`);
        return res.status(404).json({ error: "Organization not found" });
      }

      console.log(`✅ [REACTIVATE] Tenant ${id} reactivated. New status: ${organization.status}`);
      res.json({
        success: true,
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          status: organization.status
        },
        message: "Organization reactivated successfully"
      });
    } catch (error) {
      console.error("❌ [REACTIVATE] Error reactivating organization:", error);
      res.status(500).json({ error: "Failed to reactivate organization" });
    }
  });

  // Delete organization (HARD DELETE - permanent removal)
  app.delete("/brand-api/organizations/:id", async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;
    const { id } = req.params;
    const { confirmationText } = req.body || {};

    // Only super_admin can delete organizations
    if (user.role !== 'super_admin') {
      return res.status(403).json({ error: "Only super administrators can delete organizations" });
    }

    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }

    // Require confirmation text "ELIMINA" for safety
    if (confirmationText !== 'ELIMINA') {
      return res.status(400).json({ 
        error: "Confirmation required",
        message: "Please send confirmationText: 'ELIMINA' to confirm deletion"
      });
    }

    try {
      // Get organization first to check it exists
      const organization = await brandStorage.getOrganization(id);
      if (!organization) {
        return res.status(404).json({ error: "Organization not found" });
      }

      console.log(`🗑️ [HARD DELETE] Starting permanent deletion of tenant: ${organization.name} (${id})`);

      // HARD DELETE - Permanently remove tenant and all related records
      // Use raw SQL for cascade deletion - order matters!
      await db.transaction(async (tx) => {
        // Set RLS context for cross-tenant operation
        await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${id}, true)`);

        // 1. First get IDs of stores and entities BEFORE deleting them (for user associations)
        const storeIds = await tx.execute(sql`
          SELECT id FROM w3suite.stores WHERE tenant_id = ${id}::uuid
        `);
        const entityIds = await tx.execute(sql`
          SELECT id FROM w3suite.organization_entities WHERE tenant_id = ${id}::uuid
        `);

        // 2. Delete user associations using the IDs we just fetched
        if (storeIds.rows && storeIds.rows.length > 0) {
          const storeIdList = storeIds.rows.map((r: any) => r.id);
          for (const storeId of storeIdList) {
            await tx.execute(sql`DELETE FROM w3suite.user_stores WHERE store_id = ${storeId}::uuid`);
          }
        }
        if (entityIds.rows && entityIds.rows.length > 0) {
          const entityIdList = entityIds.rows.map((r: any) => r.id);
          for (const entityId of entityIdList) {
            await tx.execute(sql`DELETE FROM w3suite.user_organization_entities WHERE organization_entity_id = ${entityId}::uuid`);
          }
        }
        console.log(`   ✓ Deleted user associations`);

        // 3. Delete users belonging to this tenant
        await tx.execute(sql`DELETE FROM w3suite.users WHERE tenant_id = ${id}::uuid`);
        console.log(`   ✓ Deleted users`);

        // 4. Delete stores
        await tx.execute(sql`DELETE FROM w3suite.stores WHERE tenant_id = ${id}::uuid`);
        console.log(`   ✓ Deleted stores`);

        // 5. Delete organization_entities (legal entities)
        await tx.execute(sql`DELETE FROM w3suite.organization_entities WHERE tenant_id = ${id}::uuid`);
        console.log(`   ✓ Deleted organization entities`);

        // 6. brand_interface.brand_tenants is NOT linked to w3suite.tenants (different schema)
        // Skip this step - brand_tenants has its own id, not tenant_id FK
        console.log(`   ⊘ brand_interface separate, skipping`);

        // 7. Finally delete the tenant itself
        await tx.execute(sql`DELETE FROM w3suite.tenants WHERE id = ${id}::uuid`);
        console.log(`   ✓ Deleted tenant record`);
      });

      console.log(`✅ [HARD DELETE] Tenant ${organization.name} permanently deleted`);

      res.json({
        success: true,
        organization: {
          id: organization.id,
          name: organization.name,
        },
        message: "Organization permanently deleted"
      });
    } catch (error) {
      console.error("❌ [HARD DELETE] Error deleting organization:", error);
      res.status(500).json({ error: "Failed to delete organization permanently" });
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

  // ==================== STORES ENDPOINTS ====================

  // Get stores for specific tenant/organization
  app.get("/brand-api/stores/:tenantId", async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;
    const { tenantId } = req.params;

    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to view stores" });
    }

    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }

    try {
      const stores = await brandStorage.getStoresByTenant(tenantId);
      res.json({
        stores: stores.map(store => ({
          id: store.id,
          tenantId: store.tenantId,
          legalEntityId: store.legalEntityId,
          code: store.code,
          nome: store.nome,
          channelId: store.channelId,
          commercialAreaId: store.commercialAreaId,
          citta: store.citta,
          provincia: store.provincia,
          cap: store.cap,
          status: store.status,
          phone: store.phone,
          email: store.email,
          createdAt: store.createdAt,
          updatedAt: store.updatedAt
        })),
        tenantId,
        context: "cross-tenant",
        message: `Stores for tenant ${tenantId}`
      });
    } catch (error) {
      console.error(`Error fetching stores for tenant ${tenantId}:`, error);
      res.status(500).json({ error: "Failed to fetch stores" });
    }
  });

  // Alias endpoint - Get stores for organization (same as above, different naming for consistency)
  app.get("/brand-api/organizations/:id/stores", async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;
    // Clean tenantId to remove query parameters (e.g., ?tab=analytics)
    const { id: rawTenantId } = req.params;
    const tenantId = rawTenantId?.split('?')[0];

    // Role-based access control
    console.log(`🔐 [BRAND-API-AUTH] Stores endpoint - User role: '${user.role}', Required: 'super_admin' or 'national_manager'`);
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      console.log(`❌ [BRAND-API-AUTH] REJECTED: User role '${user.role}' insufficient for stores`);
      return res.status(403).json({ error: "Insufficient permissions to view organization stores" });
    }

    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }

    try {
      console.log(`🔍 [BRAND-API-STORES] Fetching stores for tenantId: ${tenantId}`);
      const stores = await brandStorage.getStoresByOrganization(tenantId);
      console.log(`✅ [BRAND-API-STORES] Retrieved ${stores?.length || 0} stores from database`);
      res.json({
        stores: stores.map(store => ({
          id: store.id,
          tenantId: store.tenantId,
          legalEntityId: store.legalEntityId,
          code: store.code,
          nome: store.nome,
          channelId: store.channelId,
          commercialAreaId: store.commercialAreaId,
          citta: store.citta,
          provincia: store.provincia,
          cap: store.cap,
          status: store.status,
          phone: store.phone,
          email: store.email,
          createdAt: store.createdAt,
          updatedAt: store.updatedAt
        })),
        organizationId: tenantId,
        context: "cross-tenant",
        message: `Stores for organization ${tenantId}`
      });
    } catch (error) {
      console.error(`Error fetching stores for organization ${tenantId}:`, error);
      res.status(500).json({ error: "Failed to fetch organization stores" });
    }
  });

  // Get legal entities for organization
  app.get("/brand-api/organizations/:id/legal-entities", async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;
    // Clean tenantId to remove query parameters (e.g., ?tab=analytics)
    const { id: rawTenantId } = req.params;
    const tenantId = rawTenantId?.split('?')[0];

    // Role-based access control
    console.log(`🔐 [BRAND-API-AUTH] Legal entities endpoint - User role: '${user.role}', Required: 'super_admin' or 'national_manager'`);
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      console.log(`❌ [BRAND-API-AUTH] REJECTED: User role '${user.role}' insufficient for legal entities`);
      return res.status(403).json({ error: "Insufficient permissions to view organization legal entities" });
    }

    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }

    try {
      console.log(`🔍 [BRAND-API-LEGAL] Fetching legal entities for tenantId: ${tenantId}`);
      const legalEntities = await brandStorage.getLegalEntitiesByOrganization(tenantId);
      console.log(`✅ [BRAND-API-LEGAL] Retrieved ${legalEntities?.length || 0} legal entities from database`);
      res.json({
        legalEntities: legalEntities.map(entity => ({
          id: entity.id,
          tenantId: entity.tenantId,
          codice: entity.codice,
          nome: entity.nome,
          pIva: entity.pIva,
          stato: entity.stato,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt
        })),
        organizationId: tenantId,
        context: "cross-tenant",
        message: `Legal entities for organization ${tenantId}`
      });
    } catch (error) {
      console.error(`Error fetching legal entities for organization ${tenantId}:`, error);
      res.status(500).json({ error: "Failed to fetch organization legal entities" });
    }
  });

  // Get organizational analytics for a tenant
  app.get("/brand-api/organizations/:id/analytics", async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;
    // Clean tenantId to remove query parameters (e.g., ?tab=analytics)
    const { id: rawTenantId } = req.params;
    const tenantId = rawTenantId?.split('?')[0];

    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager' && user.role !== 'regional_manager') {
      return res.status(403).json({ error: "Insufficient permissions to view organizational analytics" });
    }

    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }

    try {
      console.log(`🔧 [BRAND-DEV] Development mode: Bypassing authentication for /organizations/${tenantId}/analytics`);
      console.log("🎯 Brand Auth Context:", context.type);

      const analytics = await brandStorage.getOrganizationalAnalytics(tenantId);

      res.json({
        success: true,
        data: analytics,
        organizationId: tenantId,
        context: "cross-tenant",
        metadata: {
          tenantId: tenantId,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error(`Error fetching organizational analytics for ${tenantId}:`, error);
      res.status(500).json({ error: "Failed to fetch organizational analytics" });
    }
  });

  // Create new store
  app.post("/brand-api/stores", express.json(), async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;

    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to create stores" });
    }

    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }

    try {
      // Validate request body with Zod schema
      const parseResult = insertStoreSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid store data", 
          details: parseResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        });
      }

      const validatedData = parseResult.data;
      const { tenantId, legalEntityId, code, nome, channelId, commercialAreaId, ...otherFields } = validatedData;

      // Auto-generate code if not provided
      const finalCode = code || `ST${String(Date.now()).slice(-6)}`;

      const storeData = {
        ...validatedData,
        code: finalCode,
        status: validatedData.status || 'active'
      };

      const store = await brandStorage.createStore(storeData);

      res.status(201).json({
        success: true,
        store: {
          id: store.id,
          tenantId: store.tenantId,
          legalEntityId: store.legalEntityId,
          code: store.code,
          nome: store.nome,
          channelId: store.channelId,
          commercialAreaId: store.commercialAreaId,
          citta: store.citta,
          provincia: store.provincia,
          cap: store.cap,
          status: store.status,
          phone: store.phone,
          email: store.email,
          createdAt: store.createdAt
        },
        message: "Store created successfully"
      });
    } catch (error) {
      console.error("Error creating store:", error);
      res.status(500).json({ error: "Failed to create store" });
    }
  });

  // Update existing store
  app.patch("/brand-api/stores/:id", express.json(), async (req, res) => {
    const context = (req as any).brandContext;
    const user = (req as any).user;
    const { id } = req.params;

    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to update stores" });
    }

    if (!context.isCrossTenant) {
      return res.status(400).json({ error: "This endpoint requires cross-tenant access" });
    }

    try {
      // Create partial schema for updates (excluding immutable fields)
      const updateSchema = insertStoreSchema.partial().omit({
        id: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true
      });

      // Validate request body with partial schema
      const parseResult = updateSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid update data", 
          details: parseResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        });
      }

      const allowedFields = parseResult.data;

      const store = await brandStorage.updateStore(id, allowedFields);

      if (!store) {
        return res.status(404).json({ error: "Store not found" });
      }

      res.json({
        success: true,
        store: {
          id: store.id,
          tenantId: store.tenantId,
          legalEntityId: store.legalEntityId,
          code: store.code,
          nome: store.nome,
          channelId: store.channelId,
          commercialAreaId: store.commercialAreaId,
          citta: store.citta,
          provincia: store.provincia,
          cap: store.cap,
          status: store.status,
          phone: store.phone,
          email: store.email,
          updatedAt: store.updatedAt
        },
        message: "Store updated successfully"
      });
    } catch (error) {
      console.error("Error updating store:", error);
      res.status(500).json({ error: "Failed to update store" });
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
      // Get real counts from w3suite schema directly
      const tenantStats = await db.execute(sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status IN ('active', 'attivo')) as active,
          COUNT(*) FILTER (WHERE status IN ('sospeso', 'suspended', 'inactive')) as suspended
        FROM w3suite.tenants
      `);

      const userStats = await db.execute(sql`
        SELECT COUNT(*) as total FROM w3suite.users
      `);

      const stats = tenantStats.rows[0] as any;
      const userCount = userStats.rows[0] as any;

      res.json({
        summary: {
          totalTenants: parseInt(stats.total) || 0,
          totalUsers: parseInt(userCount.total) || 0,
          activeUsers: parseInt(userCount.total) || 0, // All users in system
          activeTenants: parseInt(stats.active) || 0,
          suspendedTenants: parseInt(stats.suspended) || 0,
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

      // Log the access for audit (non-blocking)
      if (context.tenantId) {
        brandStorage.createAuditLog({
          tenantId: context.tenantId,
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
        }).catch(err => console.log('Audit log skipped:', err?.message));
      }

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

      // Log the access for audit (non-blocking - don't fail the request if audit fails)
      if (context.tenantId) {
        brandStorage.createAuditLog({
          tenantId: context.tenantId,
          userEmail: user.email,
          userRole: user.role,
          action: 'VIEW_STRUCTURE_STATS',
          resourceType: 'statistics',
          metadata: {
            tenantId,
            totalStores: stats.totalStores,
            activeStores: stats.activeStores
          }
        }).catch(err => console.log('Audit log skipped:', err?.message));
      }

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

      // Log the export for audit (non-blocking)
      if (context.tenantId) {
        brandStorage.createAuditLog({
          tenantId: context.tenantId,
          userEmail: user.email,
          userRole: user.role,
          action: 'EXPORT_STRUCTURE_STORES_CSV',
          resourceType: 'export',
          metadata: {
            filters,
            exportFormat: 'csv',
            exportTimestamp: new Date().toISOString()
          }
        }).catch(err => console.log('Audit log skipped:', err?.message));
      }

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

      // Log the bulk operation for audit (non-blocking)
      if (context.tenantId) {
        brandStorage.createAuditLog({
          tenantId: context.tenantId,
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
        }).catch(err => console.log('Audit log skipped:', err?.message));
      }

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

  // ==================== AI AGENTS CONFIGURATION ENDPOINTS ====================
  
  /**
   * POST /brand-api/ai-agents
   * Create new AI agent configuration
   */
  app.post("/brand-api/ai-agents", async (req, res) => {
    const user = (req as any).user;
    
    // Only super_admin can manage AI agents
    if (user.role !== 'super_admin') {
      return res.status(403).json({ error: "Only super admins can create AI agents" });
    }
    
    try {
      const agentData = req.body;
      const agent = await brandStorage.createAIAgent(agentData);
      
      res.json({
        success: true,
        data: agent,
        message: 'AI agent created successfully'
      });
    } catch (error) {
      console.error("Error creating AI agent:", error);
      res.status(500).json({ 
        error: "Failed to create AI agent",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  /**
   * GET /brand-api/ai-agents
   * List all AI agents with optional filters
   */
  app.get("/brand-api/ai-agents", async (req, res) => {
    try {
      const filters = {
        moduleContext: req.query.moduleContext as string,
        status: req.query.status as string,
        search: req.query.search as string
      };
      
      const agents = await brandStorage.getAIAgents(filters);
      
      res.json({
        success: true,
        data: agents
      });
    } catch (error) {
      console.error("Error fetching AI agents:", error);
      res.status(500).json({ 
        error: "Failed to fetch AI agents",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  /**
   * GET /brand-api/ai-agents/:id
   * Get AI agent by ID
   */
  app.get("/brand-api/ai-agents/:id", async (req, res) => {
    try {
      const agent = await brandStorage.getAIAgent(req.params.id);
      
      if (!agent) {
        return res.status(404).json({ error: "AI agent not found" });
      }
      
      res.json({
        success: true,
        data: agent
      });
    } catch (error) {
      console.error("Error fetching AI agent:", error);
      res.status(500).json({ 
        error: "Failed to fetch AI agent",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  /**
   * PUT /brand-api/ai-agents/:id
   * Update AI agent configuration
   */
  app.put("/brand-api/ai-agents/:id", async (req, res) => {
    const user = (req as any).user;
    
    // Only super_admin can manage AI agents
    if (user.role !== 'super_admin') {
      return res.status(403).json({ error: "Only super admins can update AI agents" });
    }
    
    try {
      const agentData = req.body;
      const agent = await brandStorage.updateAIAgent(req.params.id, agentData);
      
      if (!agent) {
        return res.status(404).json({ error: "AI agent not found" });
      }
      
      res.json({
        success: true,
        data: agent,
        message: 'AI agent updated successfully'
      });
    } catch (error) {
      console.error("Error updating AI agent:", error);
      res.status(500).json({ 
        error: "Failed to update AI agent",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  /**
   * DELETE /brand-api/ai-agents/:id
   * Delete AI agent
   */
  app.delete("/brand-api/ai-agents/:id", async (req, res) => {
    const user = (req as any).user;
    
    // Only super_admin can manage AI agents
    if (user.role !== 'super_admin') {
      return res.status(403).json({ error: "Only super admins can delete AI agents" });
    }
    
    try {
      const success = await brandStorage.deleteAIAgent(req.params.id);
      
      if (!success) {
        return res.status(404).json({ error: "AI agent not found" });
      }
      
      res.json({
        success: true,
        message: 'AI agent deleted successfully'
      });
    } catch (error) {
      console.error("Error deleting AI agent:", error);
      res.status(500).json({ 
        error: "Failed to delete AI agent",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ==================== WMS MASTER CATALOG ENDPOINTS ====================

  // Categories endpoints
  app.get("/brand-api/wms/categories", async (req, res) => {
    const user = (req as any).user;
    
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    
    try {
      const categories = await brandStorage.getCategories();
      res.json({ success: true, data: categories });
    } catch (error) {
      console.error("Error fetching brand categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/brand-api/wms/categories", express.json(), async (req, res) => {
    const user = (req as any).user;
    
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    
    try {
      const parseResult = insertBrandCategorySchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid category data", 
          details: parseResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        });
      }
      
      const data = { ...parseResult.data, createdBy: user.id };
      const category = await brandStorage.createCategory(data);
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      console.error("Error creating brand category:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  app.patch("/brand-api/wms/categories/:id", express.json(), async (req, res) => {
    const user = (req as any).user;
    
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    
    try {
      const parseResult = updateBrandCategorySchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid category data", 
          details: parseResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        });
      }
      
      const data = { ...parseResult.data, modifiedBy: user.id };
      const category = await brandStorage.updateCategory(req.params.id, data);
      
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      
      res.json({ success: true, data: category });
    } catch (error) {
      console.error("Error updating brand category:", error);
      res.status(500).json({ error: "Failed to update category" });
    }
  });

  app.delete("/brand-api/wms/categories/:id", async (req, res) => {
    const user = (req as any).user;
    
    if (user.role !== 'super_admin') {
      return res.status(403).json({ error: "Only super admins can delete categories" });
    }
    
    try {
      const success = await brandStorage.deleteCategory(req.params.id);
      
      if (!success) {
        return res.status(404).json({ error: "Category not found" });
      }
      
      res.json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting brand category:", error);
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // Product Types endpoints
  app.get("/brand-api/wms/product-types", async (req, res) => {
    const user = (req as any).user;
    
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    
    try {
      const categoryId = req.query.categoryId as string | undefined;
      const productTypes = await brandStorage.getProductTypes(categoryId);
      res.json({ success: true, data: productTypes });
    } catch (error) {
      console.error("Error fetching brand product types:", error);
      res.status(500).json({ error: "Failed to fetch product types" });
    }
  });

  app.post("/brand-api/wms/product-types", express.json(), async (req, res) => {
    const user = (req as any).user;
    
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    
    try {
      const parseResult = insertBrandProductTypeSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid product type data", 
          details: parseResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        });
      }
      
      const data = { ...parseResult.data, createdBy: user.id };
      const productType = await brandStorage.createProductType(data);
      res.status(201).json({ success: true, data: productType });
    } catch (error) {
      console.error("Error creating brand product type:", error);
      res.status(500).json({ error: "Failed to create product type" });
    }
  });

  app.patch("/brand-api/wms/product-types/:id", express.json(), async (req, res) => {
    const user = (req as any).user;
    
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    
    try {
      const parseResult = updateBrandProductTypeSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid product type data", 
          details: parseResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        });
      }
      
      const data = { ...parseResult.data, modifiedBy: user.id };
      const productType = await brandStorage.updateProductType(req.params.id, data);
      
      if (!productType) {
        return res.status(404).json({ error: "Product type not found" });
      }
      
      res.json({ success: true, data: productType });
    } catch (error) {
      console.error("Error updating brand product type:", error);
      res.status(500).json({ error: "Failed to update product type" });
    }
  });

  app.delete("/brand-api/wms/product-types/:id", async (req, res) => {
    const user = (req as any).user;
    
    if (user.role !== 'super_admin') {
      return res.status(403).json({ error: "Only super admins can delete product types" });
    }
    
    try {
      const success = await brandStorage.deleteProductType(req.params.id);
      
      if (!success) {
        return res.status(404).json({ error: "Product type not found" });
      }
      
      res.json({ success: true, message: "Product type deleted successfully" });
    } catch (error) {
      console.error("Error deleting brand product type:", error);
      res.status(500).json({ error: "Failed to delete product type" });
    }
  });

  // Products endpoints
  app.get("/brand-api/wms/products", async (req, res) => {
    const user = (req as any).user;
    
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    
    try {
      const filters = {
        categoryId: req.query.categoryId as string | undefined,
        typeId: req.query.typeId as string | undefined,
        status: req.query.status as string | undefined
      };
      const products = await brandStorage.getProducts(filters);
      res.json({ success: true, data: products });
    } catch (error) {
      console.error("Error fetching brand products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.post("/brand-api/wms/products", express.json(), async (req, res) => {
    const user = (req as any).user;
    
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    
    try {
      const parseResult = insertBrandProductSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid product data", 
          details: parseResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        });
      }
      
      const data = { ...parseResult.data, createdBy: user.id };
      const product = await brandStorage.createProduct(data);
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      console.error("Error creating brand product:", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.patch("/brand-api/wms/products/:id", express.json(), async (req, res) => {
    const user = (req as any).user;
    
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    
    try {
      const parseResult = updateBrandProductSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid product data", 
          details: parseResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        });
      }
      
      const data = { ...parseResult.data, modifiedBy: user.id };
      const product = await brandStorage.updateProduct(req.params.id, data);
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.json({ success: true, data: product });
    } catch (error) {
      console.error("Error updating brand product:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.delete("/brand-api/wms/products/:id", async (req, res) => {
    const user = (req as any).user;
    
    if (user.role !== 'super_admin') {
      return res.status(403).json({ error: "Only super admins can delete products" });
    }
    
    try {
      const success = await brandStorage.deleteProduct(req.params.id);
      
      if (!success) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting brand product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // Suppliers endpoints
  app.get("/brand-api/wms/suppliers", async (req, res) => {
    const user = (req as any).user;
    
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    
    try {
      const filters = {
        status: req.query.status as string | undefined,
        search: req.query.search as string | undefined
      };
      const suppliers = await brandStorage.getSuppliers(filters);
      res.json({ success: true, data: suppliers });
    } catch (error) {
      console.error("Error fetching brand suppliers:", error);
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  });

  app.post("/brand-api/wms/suppliers", express.json(), async (req, res) => {
    const user = (req as any).user;
    
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    
    try {
      const parseResult = insertBrandSupplierSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid supplier data", 
          details: parseResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        });
      }
      
      const data = { ...parseResult.data, createdBy: user.id };
      const supplier = await brandStorage.createSupplier(data);
      res.status(201).json({ success: true, data: supplier });
    } catch (error) {
      console.error("Error creating brand supplier:", error);
      res.status(500).json({ error: "Failed to create supplier" });
    }
  });

  app.patch("/brand-api/wms/suppliers/:id", express.json(), async (req, res) => {
    const user = (req as any).user;
    
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    
    try {
      const parseResult = updateBrandSupplierSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid supplier data", 
          details: parseResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        });
      }
      
      const data = { ...parseResult.data, updatedBy: user.id };
      const supplier = await brandStorage.updateSupplier(req.params.id, data);
      
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      
      res.json({ success: true, data: supplier });
    } catch (error) {
      console.error("Error updating brand supplier:", error);
      res.status(500).json({ error: "Failed to update supplier" });
    }
  });

  app.delete("/brand-api/wms/suppliers/:id", async (req, res) => {
    const user = (req as any).user;
    
    if (user.role !== 'super_admin') {
      return res.status(403).json({ error: "Only super admins can delete suppliers" });
    }
    
    try {
      const success = await brandStorage.deleteSupplier(req.params.id);
      
      if (!success) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      
      res.json({ success: true, message: "Supplier deleted successfully" });
    } catch (error) {
      console.error("Error deleting brand supplier:", error);
      res.status(500).json({ error: "Failed to delete supplier" });
    }
  });

  app.post("/brand-api/wms/suppliers/:id/deploy", express.json(), async (req, res) => {
    const user = (req as any).user;
    
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    
    try {
      const { branchNames } = req.body;
      
      if (!Array.isArray(branchNames) || branchNames.length === 0) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: "branchNames must be a non-empty array" 
        });
      }
      
      const result = await brandStorage.deploySupplier(
        req.params.id,
        branchNames,
        user.id
      );
      
      res.json({ 
        success: result.success,
        data: result
      });
    } catch (error: any) {
      console.error("Error deploying supplier:", error);
      res.status(500).json({ 
        error: "Failed to deploy supplier",
        message: error.message 
      });
    }
  });

  app.get("/brand-api/wms/suppliers/:id/deployment-history", async (req, res) => {
    const user = (req as any).user;
    
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    
    try {
      const history = await brandStorage.getSupplierDeploymentHistory(req.params.id);
      res.json({ success: true, data: history });
    } catch (error) {
      console.error("Error fetching supplier deployment history:", error);
      res.status(500).json({ error: "Failed to fetch deployment history" });
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

  // ==================== MASTER CATALOG TEMPLATES ENDPOINTS ====================
  // JSON-based storage for campaigns, pipelines, and funnels (Git-versioned)

  // Initialize template storage
  await templateStorageService.initialize();

  // Get all templates (cross-type)
  app.get("/brand-api/templates", async (req, res) => {
    const user = (req as any).user;
    
    try {
      const templates = await templateStorageService.getAllTemplates();
      res.json({ 
        success: true, 
        data: templates,
        count: templates.length
      });
    } catch (error) {
      console.error("Error fetching all templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // Get templates by type
  app.get("/brand-api/templates/:type", async (req, res) => {
    const user = (req as any).user;
    const { type } = req.params as { type: TemplateType };
    
    // Validate type
    if (!['campaign', 'pipeline', 'funnel'].includes(type)) {
      return res.status(400).json({ error: "Invalid template type. Must be: campaign, pipeline, or funnel" });
    }
    
    try {
      const templates = await templateStorageService.getTemplates(type);
      res.json({ 
        success: true, 
        data: templates,
        type,
        count: templates.length
      });
    } catch (error) {
      console.error(`Error fetching ${type} templates:`, error);
      res.status(500).json({ error: `Failed to fetch ${type} templates` });
    }
  });

  // Get single template
  app.get("/brand-api/templates/:type/:id", async (req, res) => {
    const user = (req as any).user;
    const { type, id } = req.params as { type: TemplateType; id: string };
    
    // Validate type
    if (!['campaign', 'pipeline', 'funnel'].includes(type)) {
      return res.status(400).json({ error: "Invalid template type" });
    }
    
    try {
      const template = await templateStorageService.getTemplate(type, id);
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      res.json({ 
        success: true, 
        data: template
      });
    } catch (error) {
      console.error(`Error fetching ${type} template ${id}:`, error);
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  // Create new template
  app.post("/brand-api/templates/:type", async (req, res) => {
    const user = (req as any).user;
    const { type } = req.params as { type: TemplateType };
    
    // Validate type
    if (!['campaign', 'pipeline', 'funnel'].includes(type)) {
      return res.status(400).json({ error: "Invalid template type" });
    }
    
    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to create templates" });
    }
    
    try {
      const { code, name, description, status, isActive, version, linkedItems, metadata, templateData } = req.body;
      
      if (!code || !name) {
        return res.status(400).json({ error: "Code and name are required" });
      }
      
      if (!templateData) {
        return res.status(400).json({ error: "templateData is required (wizard form data)" });
      }
      
      const template = await templateStorageService.createTemplate(type, {
        code,
        name,
        description,
        status: status || 'draft',
        isActive: isActive !== undefined ? isActive : false,
        version: version || '1.0.0',
        linkedItems: linkedItems || [],
        metadata: metadata || {},
        templateData,
        createdBy: user.id || user.email
      });
      
      res.status(201).json({
        success: true,
        data: template,
        message: `${type} template created successfully`
      });
    } catch (error) {
      console.error(`Error creating ${type} template:`, error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  // Update template
  app.patch("/brand-api/templates/:type/:id", async (req, res) => {
    const user = (req as any).user;
    const { type, id } = req.params as { type: TemplateType; id: string };
    
    // Validate type
    if (!['campaign', 'pipeline', 'funnel'].includes(type)) {
      return res.status(400).json({ error: "Invalid template type" });
    }
    
    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to update templates" });
    }
    
    try {
      const updates = {
        ...req.body,
        updatedBy: user.id || user.email
      };
      
      const template = await templateStorageService.updateTemplate(type, id, updates);
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      res.json({
        success: true,
        data: template,
        message: `${type} template updated successfully`
      });
    } catch (error) {
      console.error(`Error updating ${type} template ${id}:`, error);
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  // Toggle template active state
  app.post("/brand-api/templates/:type/:id/toggle", async (req, res) => {
    const user = (req as any).user;
    const { type, id } = req.params as { type: TemplateType; id: string };
    
    // Validate type
    if (!['campaign', 'pipeline', 'funnel'].includes(type)) {
      return res.status(400).json({ error: "Invalid template type" });
    }
    
    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to toggle templates" });
    }
    
    try {
      const template = await templateStorageService.toggleTemplateActive(type, id);
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      res.json({
        success: true,
        data: template,
        message: `${type} template ${template.isActive ? 'enabled' : 'disabled'} successfully`
      });
    } catch (error) {
      console.error(`Error toggling ${type} template ${id}:`, error);
      res.status(500).json({ error: "Failed to toggle template" });
    }
  });

  // Delete template
  app.delete("/brand-api/templates/:type/:id", async (req, res) => {
    const user = (req as any).user;
    const { type, id } = req.params as { type: TemplateType; id: string };
    
    // Validate type
    if (!['campaign', 'pipeline', 'funnel'].includes(type)) {
      return res.status(400).json({ error: "Invalid template type" });
    }
    
    // Role-based access control
    if (user.role !== 'super_admin') {
      return res.status(403).json({ error: "Only super admins can delete templates" });
    }
    
    try {
      const success = await templateStorageService.deleteTemplate(type, id);
      
      if (!success) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      res.json({
        success: true,
        message: `${type} template deleted successfully`
      });
    } catch (error) {
      console.error(`Error deleting ${type} template ${id}:`, error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // Import templates (bulk create/update from JSON)
  app.post("/brand-api/templates/import", async (req, res) => {
    const user = (req as any).user;
    const { templates } = req.body as { templates: any[] };
    
    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to import templates" });
    }
    
    if (!Array.isArray(templates) || templates.length === 0) {
      return res.status(400).json({ error: "Invalid import data - expecting array of templates" });
    }
    
    try {
      // Fetch all existing templates once (optimization: avoid O(n²))
      const [existingCampaigns, existingPipelines, existingFunnels] = await Promise.all([
        templateStorageService.getTemplates('campaign'),
        templateStorageService.getTemplates('pipeline'),
        templateStorageService.getTemplates('funnel')
      ]);
      
      const existingTemplates = new Map<string, any>();
      [...existingCampaigns, ...existingPipelines, ...existingFunnels].forEach(t => {
        existingTemplates.set(`${t.type}:${t.code}`, t);
      });
      
      const results = {
        imported: [] as any[],
        updated: [] as any[],
        errors: [] as any[]
      };
      
      for (const template of templates) {
        try {
          // Validate required fields
          if (!template.type || !['campaign', 'pipeline', 'funnel'].includes(template.type)) {
            results.errors.push({
              template: template.name || 'Unknown',
              error: 'Invalid or missing template type'
            });
            continue;
          }
          
          if (!template.name || !template.code) {
            results.errors.push({
              template: template.name || 'Unknown',
              error: 'Missing required fields (name, code)'
            });
            continue;
          }
          
          // Check if template already exists
          const existing = existingTemplates.get(`${template.type}:${template.code}`);
          
          if (existing) {
            // Update existing template
            const updated = await templateStorageService.updateTemplate(
              template.type as TemplateType,
              existing.id,
              {
                ...template,
                updatedBy: user.email
              }
            );
            
            if (updated) {
              results.updated.push(updated);
            }
          } else {
            // Create new template
            const created = await templateStorageService.createTemplate(
              template.type as TemplateType,
              {
                code: template.code,
                name: template.name,
                description: template.description || '',
                status: template.status || 'draft',
                isActive: template.isActive ?? false,
                version: template.version || '1.0.0',
                linkedItems: template.linkedItems || [],
                metadata: template.metadata || {},
                templateData: template.templateData || {},
                createdBy: user.email
              }
            );
            
            results.imported.push(created);
          }
        } catch (error: any) {
          results.errors.push({
            template: template.name || 'Unknown',
            error: error.message || 'Failed to process template'
          });
        }
      }
      
      res.json({
        success: true,
        data: results,
        message: `Import completed: ${results.imported.length} created, ${results.updated.length} updated, ${results.errors.length} errors`
      });
    } catch (error) {
      console.error("Error importing templates:", error);
      res.status(500).json({ error: "Failed to import templates" });
    }
  });

  // ==================== WORKFLOWS ENDPOINTS ====================
  // DB-based storage for workflows (full replication to tenants)

  // Get all workflows
  app.get("/brand-api/workflows", async (req, res) => {
    const user = (req as any).user;
    
    try {
      const workflows = await brandStorage.getBrandWorkflows();
      res.json({ 
        success: true, 
        data: workflows,
        count: workflows.length
      });
    } catch (error) {
      console.error("Error fetching workflows:", error);
      res.status(500).json({ error: "Failed to fetch workflows" });
    }
  });

  // Get single workflow
  app.get("/brand-api/workflows/:id", async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    
    try {
      const workflow = await brandStorage.getBrandWorkflow(id);
      
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      
      res.json({ 
        success: true, 
        data: workflow
      });
    } catch (error) {
      console.error(`Error fetching workflow ${id}:`, error);
      res.status(500).json({ error: "Failed to fetch workflow" });
    }
  });

  // Create new workflow
  app.post("/brand-api/workflows", async (req, res) => {
    const user = (req as any).user;
    
    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to create workflows" });
    }
    
    try {
      const { code, name, description, category, tags, version, status, dslJson } = req.body;
      
      if (!code || !name) {
        return res.status(400).json({ error: "Code and name are required" });
      }
      
      if (!dslJson) {
        return res.status(400).json({ error: "dslJson is required (workflow definition)" });
      }
      
      const workflow = await brandStorage.createBrandWorkflow({
        code,
        name,
        description,
        category: category || 'crm',
        tags: tags || [],
        version: version || '1.0.0',
        status: status || 'draft',
        dslJson,
        createdBy: user.id || user.email
      });
      
      res.status(201).json({
        success: true,
        data: workflow,
        message: "Workflow created successfully"
      });
    } catch (error) {
      console.error("Error creating workflow:", error);
      res.status(500).json({ error: "Failed to create workflow" });
    }
  });

  // Update workflow
  app.patch("/brand-api/workflows/:id", async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    
    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to update workflows" });
    }
    
    try {
      const updates = {
        ...req.body,
        updatedBy: user.id || user.email
      };
      
      const workflow = await brandStorage.updateBrandWorkflow(id, updates);
      
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      
      res.json({
        success: true,
        data: workflow,
        message: "Workflow updated successfully"
      });
    } catch (error) {
      console.error(`Error updating workflow ${id}:`, error);
      res.status(500).json({ error: "Failed to update workflow" });
    }
  });

  // Delete workflow
  app.delete("/brand-api/workflows/:id", async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    
    // Role-based access control
    if (user.role !== 'super_admin') {
      return res.status(403).json({ error: "Only super admins can delete workflows" });
    }
    
    try {
      const success = await brandStorage.deleteBrandWorkflow(id);
      
      if (!success) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      
      res.json({
        success: true,
        message: "Workflow deleted successfully"
      });
    } catch (error) {
      console.error(`Error deleting workflow ${id}:`, error);
      res.status(500).json({ error: "Failed to delete workflow" });
    }
  });

  // ==================== TASKS ENDPOINTS ====================
  
  // Get all tasks
  app.get("/brand-api/tasks", async (req, res) => {
    const user = (req as any).user;
    
    try {
      const tasks = await brandStorage.getAllBrandTasks();
      
      res.json({
        success: true,
        data: tasks,
        count: tasks.length
      });
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Get single task
  app.get("/brand-api/tasks/:id", async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    
    try {
      const task = await brandStorage.getBrandTaskById(id);
      
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      console.error(`Error fetching task ${id}:`, error);
      res.status(500).json({ error: "Failed to fetch task" });
    }
  });

  // Create new task
  app.post("/brand-api/tasks", async (req, res) => {
    const user = (req as any).user;
    
    try {
      const taskData = {
        ...req.body,
        brandTenantId: BRAND_TENANT_ID
      };
      
      const task = await brandStorage.createBrandTask(taskData);
      
      res.status(201).json({
        success: true,
        data: task,
        message: "Task created successfully"
      });
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  // Update task
  app.patch("/brand-api/tasks/:id", async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    
    try {
      const task = await brandStorage.updateBrandTask(id, req.body);
      
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      res.json({
        success: true,
        data: task,
        message: "Task updated successfully"
      });
    } catch (error) {
      console.error(`Error updating task ${id}:`, error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  // Delete task
  app.delete("/brand-api/tasks/:id", async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    
    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to delete tasks" });
    }
    
    try {
      const success = await brandStorage.deleteBrandTask(id);
      
      if (!success) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      res.json({
        success: true,
        message: "Task deleted successfully"
      });
    } catch (error) {
      console.error(`Error deleting task ${id}:`, error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // ==================== DEPLOY CENTER ENDPOINTS ====================

  // Gap Analysis endpoint - shows version distribution per tool
  app.get("/brand-api/deploy/gap-analysis", async (req, res) => {
    const user = (req as any).user;
    
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    
    try {
      // Get all commits grouped by tool and version
      const commits = await brandStorage.getDeployments({});
      
      // Group commits by tool
      const toolGroups: Record<string, any[]> = {};
      commits.forEach(commit => {
        if (!toolGroups[commit.tool]) {
          toolGroups[commit.tool] = [];
        }
        toolGroups[commit.tool].push(commit);
      });
      
      // For each tool, calculate version distribution
      const gapAnalysis = Object.entries(toolGroups).map(([tool, toolCommits]) => {
        // Find latest version for this tool
        const versions = toolCommits.map(c => c.version).sort((a, b) => b.localeCompare(a));
        const latestVersion = versions[0];
        
        // Count deployments per version
        const versionCounts: Record<string, { tenantCount: Set<string>; storeCount: number }> = {};
        toolCommits.forEach(commit => {
          if (!versionCounts[commit.version]) {
            versionCounts[commit.version] = {
              tenantCount: new Set(),
              storeCount: 0
            };
          }
          // Count unique tenants and stores (mock data for now)
          versionCounts[commit.version].tenantCount.add(commit.id);
          versionCounts[commit.version].storeCount += 1;
        });
        
        // Format as array
        const deployedVersions = Object.entries(versionCounts).map(([version, counts]) => ({
          version,
          tenantCount: counts.tenantCount.size,
          storeCount: counts.storeCount,
          isLatest: version === latestVersion
        })).sort((a, b) => b.version.localeCompare(a.version));
        
        return {
          tool,
          latestVersion,
          deployedVersions
        };
      });
      
      res.json({ success: true, data: gapAnalysis });
    } catch (error) {
      console.error("Error fetching gap analysis:", error);
      res.status(500).json({ error: "Failed to fetch gap analysis" });
    }
  });

  // Get all deployments (commits)
  app.get("/brand-api/deploy/commits", async (req, res) => {
    const user = (req as any).user;
    
    try {
      const filters = {
        tool: req.query.tool as string | undefined,
        status: req.query.status as string | undefined
      };
      
      const deployments = await brandStorage.getDeployments(filters);
      
      res.json({
        success: true,
        data: deployments
      });
    } catch (error) {
      console.error("Error fetching deployments:", error);
      res.status(500).json({ error: "Failed to fetch deployments" });
    }
  });

  // Get single deployment
  app.get("/brand-api/deploy/commits/:id", async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    
    try {
      const deployment = await brandStorage.getDeployment(id);
      
      if (!deployment) {
        return res.status(404).json({ error: "Deployment not found" });
      }
      
      res.json({
        success: true,
        data: deployment
      });
    } catch (error) {
      console.error(`Error fetching deployment ${id}:`, error);
      res.status(500).json({ error: "Failed to fetch deployment" });
    }
  });

  // Create deployment (commit)
  app.post("/brand-api/deploy/commits", express.json(), async (req, res) => {
    const user = (req as any).user;
    
    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to create deployments" });
    }
    
    try {
      const deployment = await brandStorage.createDeployment({
        ...req.body,
        createdBy: user.email,
        brandTenantId: user.brandTenantId
      });
      
      res.status(201).json({
        success: true,
        data: deployment,
        message: "Deployment created successfully"
      });
    } catch (error) {
      console.error("Error creating deployment:", error);
      res.status(500).json({ error: "Failed to create deployment" });
    }
  });

  // Update deployment
  app.patch("/brand-api/deploy/commits/:id", express.json(), async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    
    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to update deployments" });
    }
    
    try {
      const deployment = await brandStorage.updateDeployment(id, req.body);
      
      if (!deployment) {
        return res.status(404).json({ error: "Deployment not found" });
      }
      
      res.json({
        success: true,
        data: deployment,
        message: "Deployment updated successfully"
      });
    } catch (error) {
      console.error(`Error updating deployment ${id}:`, error);
      res.status(500).json({ error: "Failed to update deployment" });
    }
  });

  // Delete deployment
  app.delete("/brand-api/deploy/commits/:id", async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    
    // Role-based access control
    if (user.role !== 'super_admin') {
      return res.status(403).json({ error: "Only super admins can delete deployments" });
    }
    
    try {
      const success = await brandStorage.deleteDeployment(id);
      
      if (!success) {
        return res.status(404).json({ error: "Deployment not found" });
      }
      
      res.json({
        success: true,
        message: "Deployment deleted successfully"
      });
    } catch (error) {
      console.error(`Error deleting deployment ${id}:`, error);
      res.status(500).json({ error: "Failed to delete deployment" });
    }
  });

  // Get all branches
  app.get("/brand-api/deploy/branches", async (req, res) => {
    const user = (req as any).user;
    
    try {
      const tenantId = req.query.tenantId as string | undefined;
      const branches = await brandStorage.getBranches(tenantId);
      
      res.json({
        success: true,
        data: branches
      });
    } catch (error) {
      console.error("Error fetching branches:", error);
      res.status(500).json({ error: "Failed to fetch branches" });
    }
  });

  // Execute deployment to selected branches
  app.post("/brand-api/deploy/execute", express.json(), async (req, res) => {
    const user = (req as any).user;
    
    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to execute deployments" });
    }
    
    try {
      const { commitId, branchIds } = req.body;
      
      if (!commitId || !Array.isArray(branchIds) || branchIds.length === 0) {
        return res.status(400).json({ 
          error: "Missing required fields: commitId and branchIds (array)" 
        });
      }
      
      // Get commit/deployment details
      const deployment = await brandStorage.getDeployment(commitId);
      if (!deployment) {
        return res.status(404).json({ error: "Deployment not found" });
      }
      
      // Get selected branches
      const allBranches = await brandStorage.getBranches();
      const selectedBranches = allBranches.filter(b => branchIds.includes(b.id));
      
      if (selectedBranches.length === 0) {
        return res.status(404).json({ error: "No valid branches found" });
      }
      
      console.log(`🚀 Executing deployment ${commitId} to ${selectedBranches.length} branches`);
      
      // Update deployment status to 'in_progress'
      await brandStorage.updateDeployment(commitId, { status: 'in_progress' });
      
      // Execute deployment to each branch
      const results = [];
      const webhookSecret = process.env.BRAND_WEBHOOK_SECRET || 'dev-webhook-secret-change-in-production';
      
      for (const branch of selectedBranches) {
        try {
          console.log(`📤 Pushing to branch: ${branch.branchName} (tenant: ${branch.tenantId})`);
          
          // Prepare webhook payload
          const payload = {
            commitId: deployment.id,
            tool: deployment.tool,
            resourceType: deployment.resourceType,
            version: deployment.version,
            data: deployment.payloadData // JSON data to merge
          };
          
          // Generate HMAC signature
          const timestamp = Math.floor(Date.now() / 1000).toString();
          const payloadString = JSON.stringify(payload);
          const signaturePayload = `${timestamp}.${payloadString}`;
          const crypto = await import('crypto');
          const signature = crypto.createHmac('sha256', webhookSecret)
            .update(signaturePayload)
            .digest('hex');
          
          // Determine webhook URL based on environment
          const tenantWebhookUrl = process.env.TENANT_WEBHOOK_BASE_URL 
            || `http://localhost:3004`; // Default to W3 Suite backend
          const webhookUrl = `${tenantWebhookUrl}/api/webhooks/brand-deploy/${branch.tenantId}`;
          
          console.log(`🔗 Calling webhook: ${webhookUrl}`);
          
          // Call tenant webhook
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-webhook-signature': signature,
              'x-webhook-timestamp': timestamp
            },
            body: payloadString
          });
          
          const responseData = await response.json();
          
          if (response.ok && responseData.received) {
            console.log(`✅ Deployment successful for branch: ${branch.branchName}`);
            
            // Update branch deployment status
            await brandStorage.updateBranch(branch.id, {
              deploymentStatus: 'deployed',
              lastDeployedCommitId: commitId,
              lastDeployedAt: new Date()
            });
            
            // Track status in deployment_status table
            await brandStorage.createDeploymentStatus({
              deploymentId: commitId,
              branchId: branch.id,
              status: 'success',
              deployedAt: new Date(),
              metadata: responseData.result
            });
            
            results.push({
              branchId: branch.id,
              branchName: branch.branchName,
              tenantId: branch.tenantId,
              status: 'success',
              message: responseData.result?.message || 'Deployed successfully'
            });
          } else {
            console.error(`❌ Deployment failed for branch: ${branch.branchName}`, responseData);
            
            // Track failure
            await brandStorage.createDeploymentStatus({
              deploymentId: commitId,
              branchId: branch.id,
              status: 'failed',
              errorMessage: responseData.error || 'Webhook call failed',
              metadata: responseData
            });
            
            results.push({
              branchId: branch.id,
              branchName: branch.branchName,
              tenantId: branch.tenantId,
              status: 'failed',
              error: responseData.error || 'Webhook call failed'
            });
          }
        } catch (error) {
          console.error(`❌ Error deploying to branch ${branch.branchName}:`, error);
          
          // Track error
          await brandStorage.createDeploymentStatus({
            deploymentId: commitId,
            branchId: branch.id,
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : String(error)
          });
          
          results.push({
            branchId: branch.id,
            branchName: branch.branchName,
            tenantId: branch.tenantId,
            status: 'failed',
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      // Update deployment status based on results
      const allSuccess = results.every(r => r.status === 'success');
      const someSuccess = results.some(r => r.status === 'success');
      const finalStatus = allSuccess ? 'completed' : (someSuccess ? 'partial' : 'failed');
      
      await brandStorage.updateDeployment(commitId, { 
        status: finalStatus,
        completedAt: new Date()
      });
      
      console.log(`🏁 Deployment ${commitId} finished with status: ${finalStatus}`);
      console.log(`   Success: ${results.filter(r => r.status === 'success').length}/${results.length}`);
      
      res.json({
        success: true,
        deploymentId: commitId,
        status: finalStatus,
        results,
        summary: {
          total: results.length,
          success: results.filter(r => r.status === 'success').length,
          failed: results.filter(r => r.status === 'failed').length
        }
      });
    } catch (error) {
      console.error("Error executing deployment:", error);
      res.status(500).json({ error: "Failed to execute deployment" });
    }
  });

  // Get single branch
  app.get("/brand-api/deploy/branches/:branchName", async (req, res) => {
    const user = (req as any).user;
    const { branchName} = req.params;
    
    try {
      const branch = await brandStorage.getBranch(branchName);
      
      if (!branch) {
        return res.status(404).json({ error: "Branch not found" });
      }
      
      res.json({
        success: true,
        data: branch
      });
    } catch (error) {
      console.error(`Error fetching branch ${branchName}:`, error);
      res.status(500).json({ error: "Failed to fetch branch" });
    }
  });

  // Create branch
  app.post("/brand-api/deploy/branches", express.json(), async (req, res) => {
    const user = (req as any).user;
    
    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to create branches" });
    }
    
    try {
      const branch = await brandStorage.createBranch({
        ...req.body,
        brandTenantId: user.brandTenantId
      });
      
      res.status(201).json({
        success: true,
        data: branch,
        message: "Branch created successfully"
      });
    } catch (error) {
      console.error("Error creating branch:", error);
      res.status(500).json({ error: "Failed to create branch" });
    }
  });

  // Sync branches from W3Suite tenants/stores
  app.post("/brand-api/deploy/branches/sync", async (req, res) => {
    const user = (req as any).user;
    
    // Role-based access control
    if (user.role !== 'super_admin' && user.role !== 'national_manager') {
      return res.status(403).json({ error: "Insufficient permissions to sync branches" });
    }
    
    try {
      console.log(`🔄 [SYNC-BRANCHES] User ${user.email} initiated branch sync`);
      const result = await brandStorage.syncBranchesFromTenants();
      
      res.json({ 
        success: true, 
        data: result,
        message: `Branch synchronization complete. Created: ${result.created}, Updated: ${result.updated}, Total: ${result.total}` 
      });
    } catch (error) {
      console.error("❌ [SYNC-BRANCHES] Error syncing branches:", error);
      res.status(500).json({ error: "Failed to sync branches" });
    }
  });

  // Get all deployment statuses with optional filters (enhanced with tool, tenant, store)
  app.get("/brand-api/deploy/status", async (req, res) => {
    const user = (req as any).user;
    const { deploymentId, branchId, status, tool, tenantSlug, storeCode, limit, offset } = req.query;
    
    try {
      const filters: any = {};
      if (deploymentId) filters.deploymentId = deploymentId as string;
      if (branchId) filters.branchId = branchId as string;
      if (status) filters.status = status as string;
      if (tool) filters.tool = tool as string;
      if (tenantSlug) filters.tenantSlug = tenantSlug as string;
      if (storeCode) filters.storeCode = storeCode as string;
      if (limit) filters.limit = parseInt(limit as string);
      if (offset) filters.offset = parseInt(offset as string);
      
      const statuses = await brandStorage.getDeploymentStatuses(filters);
      
      res.json({
        success: true,
        data: statuses
      });
    } catch (error) {
      console.error("Error fetching deployment statuses:", error);
      res.status(500).json({ 
        success: false,
        error: "Failed to fetch deployment statuses" 
      });
    }
  });

  // Get deployment statuses for a specific deployment
  app.get("/brand-api/deploy/status/:deploymentId", async (req, res) => {
    const user = (req as any).user;
    const { deploymentId } = req.params;
    
    try {
      const statuses = await brandStorage.getDeploymentStatuses(deploymentId);
      
      res.json({
        success: true,
        data: statuses
      });
    } catch (error) {
      console.error(`Error fetching deployment statuses for ${deploymentId}:`, error);
      res.status(500).json({ error: "Failed to fetch deployment statuses" });
    }
  });

  // Create deployment status
  app.post("/brand-api/deploy/status", express.json(), async (req, res) => {
    const user = (req as any).user;
    
    try {
      const status = await brandStorage.createDeploymentStatus({
        ...req.body,
        brandTenantId: user.brandTenantId
      });
      
      res.status(201).json({
        success: true,
        data: status,
        message: "Deployment status created successfully"
      });
    } catch (error) {
      console.error("Error creating deployment status:", error);
      res.status(500).json({ error: "Failed to create deployment status" });
    }
  });

  // Update deployment status
  app.patch("/brand-api/deploy/status/:id", express.json(), async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    
    try {
      const status = await brandStorage.updateDeploymentStatus(id, req.body);
      
      if (!status) {
        return res.status(404).json({ error: "Deployment status not found" });
      }
      
      res.json({
        success: true,
        data: status,
        message: "Deployment status updated successfully"
      });
    } catch (error) {
      console.error(`Error updating deployment status ${id}:`, error);
      res.status(500).json({ error: "Failed to update deployment status" });
    }
  });

  // ==================== DEPLOYMENT SESSIONS ENDPOINTS ====================

  // Get all deployment sessions with optional filters
  app.get("/brand-api/deploy/sessions", async (req, res) => {
    const user = (req as any).user;
    const { status, launchedBy } = req.query;
    
    try {
      const filters: any = {};
      if (status) filters.status = status;
      if (launchedBy) filters.launchedBy = launchedBy;
      
      const sessions = await brandStorage.getDeploymentSessions(filters);
      
      res.json({
        success: true,
        data: sessions,
        message: "Deployment sessions fetched successfully"
      });
    } catch (error) {
      console.error("Error fetching deployment sessions:", error);
      res.status(500).json({ error: "Failed to fetch deployment sessions" });
    }
  });

  // Get single deployment session
  app.get("/brand-api/deploy/sessions/:id", async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    
    try {
      const session = await brandStorage.getDeploymentSession(id);
      
      if (!session) {
        return res.status(404).json({ error: "Deployment session not found" });
      }
      
      res.json({
        success: true,
        data: session,
        message: "Deployment session fetched successfully"
      });
    } catch (error) {
      console.error(`Error fetching deployment session ${id}:`, error);
      res.status(500).json({ error: "Failed to fetch deployment session" });
    }
  });

  // Create deployment session
  app.post("/brand-api/deploy/sessions", express.json(), async (req, res) => {
    const user = (req as any).user;
    
    try {
      const session = await brandStorage.createDeploymentSession({
        ...req.body,
        launchedBy: user.email,
        brandTenantId: user.brandTenantId
      });
      
      res.status(201).json({
        success: true,
        data: session,
        message: "Deployment session created successfully"
      });
    } catch (error) {
      console.error("Error creating deployment session:", error);
      res.status(500).json({ error: "Failed to create deployment session" });
    }
  });

  // Launch deployment session
  app.post("/brand-api/deploy/sessions/:id/launch", async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    
    try {
      const session = await brandStorage.launchDeploymentSession(id);
      
      if (!session) {
        return res.status(404).json({ error: "Deployment session not found" });
      }
      
      res.json({
        success: true,
        data: session,
        message: "Deployment session launched successfully"
      });
    } catch (error) {
      console.error(`Error launching deployment session ${id}:`, error);
      res.status(500).json({ error: "Failed to launch deployment session" });
    }
  });

  // Update deployment session
  app.patch("/brand-api/deploy/sessions/:id", express.json(), async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    
    try {
      const session = await brandStorage.updateDeploymentSession(id, req.body);
      
      if (!session) {
        return res.status(404).json({ error: "Deployment session not found" });
      }
      
      res.json({
        success: true,
        data: session,
        message: "Deployment session updated successfully"
      });
    } catch (error) {
      console.error(`Error updating deployment session ${id}:`, error);
      res.status(500).json({ error: "Failed to update deployment session" });
    }
  });

  // ==================== SESSION COMMITS ENDPOINTS ====================

  // Update session commit (for tracking per-commit deployment progress)
  app.patch("/brand-api/deploy/session-commits/:id", express.json(), async (req, res) => {
    const user = (req as any).user;
    const { id } = req.params;
    
    try {
      console.log(`[SESSION-COMMIT-UPDATE] ID: ${id}, Body:`, JSON.stringify(req.body, null, 2));
      
      // Sanitize timestamp fields if they're strings
      const sanitizedData: any = { ...req.body };
      if (sanitizedData.startedAt && typeof sanitizedData.startedAt === 'string') {
        sanitizedData.startedAt = new Date(sanitizedData.startedAt);
      }
      if (sanitizedData.completedAt && typeof sanitizedData.completedAt === 'string') {
        sanitizedData.completedAt = new Date(sanitizedData.completedAt);
      }
      
      const sessionCommit = await brandStorage.updateSessionCommit(id, sanitizedData);
      
      if (!sessionCommit) {
        return res.status(404).json({ error: "Session commit not found" });
      }
      
      res.json({
        success: true,
        data: sessionCommit,
        message: "Session commit updated successfully"
      });
    } catch (error) {
      console.error(`Error updating session commit ${id}:`, error);
      res.status(500).json({ error: "Failed to update session commit" });
    }
  });

  // ==================== BRANCH RELEASES ENDPOINTS ====================

  // Get all branch releases or for a specific branch
  app.get("/brand-api/deploy/releases", async (req, res) => {
    const user = (req as any).user;
    const { branchName } = req.query;
    
    try {
      const releases = await brandStorage.getBranchReleases(branchName as string | undefined);
      
      res.json({
        success: true,
        data: releases,
        message: "Branch releases fetched successfully"
      });
    } catch (error) {
      console.error("Error fetching branch releases:", error);
      res.status(500).json({ error: "Failed to fetch branch releases" });
    }
  });

  // Get single branch release for specific branch and tool
  app.get("/brand-api/deploy/releases/:branchName/:tool", async (req, res) => {
    const user = (req as any).user;
    const { branchName, tool } = req.params;
    
    try {
      const release = await brandStorage.getBranchRelease(branchName, tool);
      
      if (!release) {
        return res.status(404).json({ error: "Branch release not found" });
      }
      
      res.json({
        success: true,
        data: release,
        message: "Branch release fetched successfully"
      });
    } catch (error) {
      console.error(`Error fetching branch release ${branchName}/${tool}:`, error);
      res.status(500).json({ error: "Failed to fetch branch release" });
    }
  });

  // Update or create branch release
  app.put("/brand-api/deploy/releases", express.json(), async (req, res) => {
    const user = (req as any).user;
    
    try {
      const release = await brandStorage.updateBranchRelease({
        ...req.body,
        brandTenantId: user.brandTenantId
      });
      
      res.json({
        success: true,
        data: release,
        message: "Branch release updated successfully"
      });
    } catch (error) {
      console.error("Error updating branch release:", error);
      res.status(500).json({ error: "Failed to update branch release" });
    }
  });

  // ==================== RAG SYSTEM - WINDTRE OFFERS ====================

  // Trigger WindTre scraping and embedding pipeline
  app.post("/brand-api/windtre/sync", async (req, res) => {
    const user = (req as any).user;
    const { WindtreScraperService } = await import("../services/windtre-scraper.service.js");
    const { WindtreChunkingEmbeddingService } = await import("../services/windtre-chunking-embedding.service.js");
    const { ragSyncState } = await import("../db/schema/brand-interface.js");
    const { db } = await import("../db/index.js");
    const { eq } = await import("drizzle-orm");

    try {
      console.log("🚀 Starting WindTre RAG sync pipeline...");

      // Update sync state to running
      await db
        .update(ragSyncState)
        .set({
          status: "running",
          lastRunAt: new Date(),
          errorMessage: null
        })
        .where(eq(ragSyncState.brandTenantId, user.brandTenantId));

      // Step 1: Scrape WindTre offers
      console.log("📡 Step 1: Scraping WindTre website...");
      const scraper = new WindtreScraperService(user.brandTenantId);
      const scrapeResult = await scraper.scrapeWindtreOffers();

      if (!scrapeResult.success) {
        throw new Error(`Scraping failed: ${scrapeResult.errors.join(", ")}`);
      }

      console.log(`✅ Scraping complete: ${scrapeResult.pagesScraped} pages scraped`);

      // Step 2: Process chunks and generate embeddings
      console.log("🔮 Step 2: Processing chunks and generating embeddings...");
      const embeddingService = new WindtreChunkingEmbeddingService();
      const embeddingResult = await embeddingService.processAllOffers(user.brandTenantId);

      if (!embeddingResult.success) {
        throw new Error(`Embedding failed: ${embeddingResult.errors.join(", ")}`);
      }

      console.log(`✅ Embedding complete: ${embeddingResult.chunksProcessed} chunks, ${embeddingResult.embeddingsCreated} embeddings`);

      // Update sync state to success
      await db
        .update(ragSyncState)
        .set({
          status: "success",
          totalPagesScraped: scrapeResult.pagesScraped,
          totalChunksCreated: embeddingResult.embeddingsCreated,
          updatedAt: new Date()
        })
        .where(eq(ragSyncState.brandTenantId, user.brandTenantId));

      res.json({
        success: true,
        data: {
          pagesScraped: scrapeResult.pagesScraped,
          chunksProcessed: embeddingResult.chunksProcessed,
          embeddingsCreated: embeddingResult.embeddingsCreated
        },
        message: "WindTre RAG sync completed successfully"
      });

    } catch (error) {
      console.error("❌ WindTre RAG sync failed:", error);

      // Update sync state to error
      const { ragSyncState } = await import("../db/schema/brand-interface.js");
      const { db } = await import("../db/index.js");
      const { eq } = await import("drizzle-orm");

      await db
        .update(ragSyncState)
        .set({
          status: "error",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          updatedAt: new Date()
        })
        .where(eq(ragSyncState.brandTenantId, user.brandTenantId));

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "WindTre RAG sync failed"
      });
    }
  });

  // Generate embeddings only (skip scraping - use existing raw data)
  app.post("/brand-api/windtre/generate-embeddings", async (req, res) => {
    const user = (req as any).user;
    const { WindtreChunkingEmbeddingService } = await import("../services/windtre-chunking-embedding.service.js");

    try {
      console.log("🔮 Starting embedding generation only (no scraping)...");
      
      // Process chunks and generate embeddings from existing raw data
      const embeddingService = new WindtreChunkingEmbeddingService();
      const embeddingResult = await embeddingService.processAllOffers(user.brandTenantId);

      if (!embeddingResult.success) {
        throw new Error(`Embedding failed: ${embeddingResult.errors.join(", ")}`);
      }

      console.log(`✅ Embedding complete: ${embeddingResult.chunksProcessed} chunks, ${embeddingResult.embeddingsCreated} embeddings`);

      res.json({
        success: true,
        data: {
          chunksProcessed: embeddingResult.chunksProcessed,
          embeddingsCreated: embeddingResult.embeddingsCreated
        },
        message: "Embeddings generated successfully"
      });

    } catch (error) {
      console.error("❌ Embedding generation failed:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Embedding generation failed"
      });
    }
  });

  // Regenerate embeddings for existing chunks (replaces random embeddings with real OpenAI ones)
  app.post("/brand-api/windtre/regenerate-embeddings", async (req, res) => {
    const user = (req as any).user;

    try {
      const { WindtreChunkingEmbeddingService } = await import("../services/windtre-chunking-embedding.service.js");
      const { windtreOfferChunks } = await import("../db/schema/brand-interface.js");
      const { db } = await import("../db/index.js");
      const { eq } = await import("drizzle-orm");

      console.log("🔄 Regenerating embeddings for existing chunks...");

      // Get all chunks
      const chunks = await db
        .select({ id: windtreOfferChunks.id, chunkText: windtreOfferChunks.chunkText })
        .from(windtreOfferChunks)
        .where(eq(windtreOfferChunks.brandTenantId, user.brandTenantId));

      console.log(`📄 Found ${chunks.length} chunks to process`);

      const embeddingService = new WindtreChunkingEmbeddingService();
      let processed = 0;

      for (const chunk of chunks) {
        const embedding = await (embeddingService as any).generateEmbedding(chunk.chunkText);
        
        await db
          .update(windtreOfferChunks)
          .set({ embedding })
          .where(eq(windtreOfferChunks.id, chunk.id));
        
        processed++;
        console.log(`✅ [${processed}/${chunks.length}] Embedding regenerated`);
      }

      console.log(`✅ Regeneration complete: ${processed} embeddings updated`);

      res.json({
        success: true,
        data: { processed },
        message: `Regenerated ${processed} embeddings`
      });

    } catch (error) {
      console.error("❌ Embedding regeneration failed:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Embedding regeneration failed"
      });
    }
  });

  // RAG similarity search endpoint
  app.get("/brand-api/windtre/search", async (req, res) => {
    const user = (req as any).user;
    const { query, limit = "5" } = req.query;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    try {
      const { WindtreChunkingEmbeddingService } = await import("../services/windtre-chunking-embedding.service.js");
      const { windtreOfferChunks } = await import("../db/schema/brand-interface.js");
      const { db } = await import("../db/index.js");
      const { eq, sql } = await import("drizzle-orm");

      // Generate embedding for query
      const embeddingService = new WindtreChunkingEmbeddingService();
      const queryEmbedding = await (embeddingService as any).generateEmbedding(query);

      // Perform cosine similarity search (cross-tenant for WindTre offers)
      const similarityThreshold = 0.5; // Lower threshold for better recall
      const maxResults = Math.min(parseInt(limit as string, 10), 20);

      // WindTre offers are shared across all tenants
      const results = await db.execute(sql`
        SELECT 
          id,
          chunk_text,
          metadata,
          1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) AS similarity
        FROM brand_interface.windtre_offer_chunks
        WHERE 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) > ${similarityThreshold}
        ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT ${maxResults}
      `);

      res.json({
        success: true,
        data: {
          query,
          results: results.rows.map((row: any) => ({
            id: row.id,
            text: row.chunk_text,
            metadata: row.metadata,
            similarity: parseFloat(row.similarity)
          }))
        },
        message: `Found ${results.rows.length} similar results`
      });

    } catch (error) {
      console.error("❌ RAG search failed:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "RAG search failed"
      });
    }
  });

  // Get RAG sync status
  app.get("/brand-api/windtre/sync-status", async (req, res) => {
    const user = (req as any).user;

    try {
      const { ragSyncState } = await import("../db/schema/brand-interface.js");
      const { db } = await import("../db/index.js");
      const { eq } = await import("drizzle-orm");

      const syncStatus = await db
        .select()
        .from(ragSyncState)
        .where(eq(ragSyncState.brandTenantId, user.brandTenantId))
        .limit(1);

      if (syncStatus.length === 0) {
        // Create initial sync state
        const newStatus = await db
          .insert(ragSyncState)
          .values({
            brandTenantId: user.brandTenantId,
            status: "idle",
            totalPagesScraped: 0,
            totalChunksCreated: 0
          })
          .returning();

        return res.json({
          success: true,
          data: newStatus[0]
        });
      }

      res.json({
        success: true,
        data: syncStatus[0]
      });

    } catch (error) {
      console.error("❌ Error fetching sync status:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch sync status"
      });
    }
  });

  // ==================== RAG MULTI-AGENT SYSTEM ====================

  // Get agent details (configuration, stats, RAG health)
  app.get("/brand-api/agents/:agentId/details", async (req, res) => {
    const brandContext = (req as any).brandContext;
    const { agentId } = req.params;

    try {
      const { RagMultiAgentService } = await import("../services/rag-multi-agent.service.js");
      const ragService = new RagMultiAgentService(brandContext.brandTenantId);
      const details = await ragService.getAgentDetails(agentId);

      if (!details) {
        return res.status(404).json({
          success: false,
          error: `Agent not found: ${agentId}`
        });
      }

      res.json({ success: true, data: details });
    } catch (error) {
      console.error("❌ Error fetching agent details:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch agent details"
      });
    }
  });

  // Get RAG stats for an agent
  app.get("/brand-api/agents/:agentId/rag/stats", async (req, res) => {
    const user = (req as any).user;
    const { agentId } = req.params;

    try {
      const { RagMultiAgentService } = await import("../services/rag-multi-agent.service.js");
      const ragService = new RagMultiAgentService(user.brandTenantId);
      const stats = await ragService.getAgentStats(agentId);

      if (!stats) {
        return res.json({
          success: true,
          data: {
            agentId,
            sourcesCount: 0,
            chunksCount: 0,
            totalTokensUsed: 0,
            totalCostCents: 0,
            config: null
          }
        });
      }

      res.json({ success: true, data: stats });
    } catch (error) {
      console.error("❌ Error fetching RAG stats:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch RAG stats"
      });
    }
  });

  // List data sources for an agent
  app.get("/brand-api/agents/:agentId/rag/sources", async (req, res) => {
    const user = (req as any).user;
    const { agentId } = req.params;

    try {
      const { RagMultiAgentService } = await import("../services/rag-multi-agent.service.js");
      const ragService = new RagMultiAgentService(user.brandTenantId);
      const sources = await ragService.listDataSources(agentId);

      res.json({ success: true, data: sources });
    } catch (error) {
      console.error("❌ Error fetching data sources:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch data sources"
      });
    }
  });

  // Add URL source to agent
  app.post("/brand-api/agents/:agentId/rag/sources/url", async (req, res) => {
    const user = (req as any).user;
    const { agentId } = req.params;
    const { url, metadata } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, error: "URL is required" });
    }

    try {
      const { RagMultiAgentService } = await import("../services/rag-multi-agent.service.js");
      const { brandAiAgents } = await import("../db/schema/brand-interface.js");
      const { eq, and } = await import("drizzle-orm");

      const ragService = new RagMultiAgentService(user.brandTenantId);

      // Get agent name from brandAiAgents table
      const agents = await db
        .select()
        .from(brandAiAgents)
        .where(
          and(
            eq(brandAiAgents.agentId, agentId),
            eq(brandAiAgents.brandTenantId, user.brandTenantId)
          )
        )
        .limit(1);

      const agentName = agents.length > 0 ? agents[0].name : agentId;

      // Ensure RAG agent exists
      await ragService.ensureRagAgent({
        agentId,
        agentName
      });

      const sourceId = await ragService.addWebUrlSource(agentId, url, metadata);

      // Start processing in background automatically
      ragService.processDataSource(sourceId).catch(err => {
        console.error(`❌ Background processing failed for URL ${url}:`, err);
      });

      res.json({
        success: true,
        data: { sourceId },
        message: "URL source added successfully, processing started"
      });
    } catch (error) {
      console.error("❌ Error adding URL source:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to add URL source"
      });
    }
  });

  // Add manual text source to agent
  app.post("/brand-api/agents/:agentId/rag/sources/text", async (req, res) => {
    const user = (req as any).user;
    const { agentId } = req.params;
    const { text, metadata } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, error: "Text content is required" });
    }

    try {
      const { RagMultiAgentService } = await import("../services/rag-multi-agent.service.js");
      
      const ragService = new RagMultiAgentService(user.brandTenantId);

      // Use agentId as name (simpler approach that avoids DB lookup issues)
      const agentName = agentId;

      // Ensure RAG agent exists
      await ragService.ensureRagAgent({
        agentId,
        agentName
      });

      const sourceId = await ragService.addManualTextSource(agentId, text, metadata);

      // Start processing in background automatically
      ragService.processDataSource(sourceId).catch(err => {
        console.error(`❌ Background processing failed for manual text:`, err);
      });

      res.json({
        success: true,
        data: { sourceId },
        message: "Text source added successfully, processing started"
      });
    } catch (error) {
      console.error("❌ Error adding text source:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to add text source"
      });
    }
  });

  // Upload documents (PDF, DOC, TXT, etc.)
  app.post("/brand-api/agents/:agentId/rag/sources/upload", async (req, res) => {
    const user = (req as any).user;
    const { agentId } = req.params;

    try {
      const multer = await import("multer");
      const path = await import("path");
      const fs = await import("fs/promises");
      
      const storage = multer.default.memoryStorage();
      const upload = multer.default({
        storage,
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
        fileFilter: (req: any, file: any, cb: any) => {
          const allowedMimes = [
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/markdown'
          ];
          const allowedExts = ['.pdf', '.txt', '.doc', '.docx', '.md'];
          const ext = path.extname(file.originalname).toLowerCase();
          
          if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
            cb(null, true);
          } else {
            cb(new Error(`Formato file non supportato: ${ext}. Usa PDF, TXT, DOC, DOCX o MD.`));
          }
        }
      }).array('documents', 10); // Max 10 files

      upload(req, res, async (err: any) => {
        if (err) {
          console.error("❌ Upload error:", err);
          return res.status(400).json({
            success: false,
            error: err.message || "Upload failed"
          });
        }

        const files = (req as any).files as Express.Multer.File[];
        if (!files || files.length === 0) {
          return res.status(400).json({
            success: false,
            error: "No files provided"
          });
        }

        const { db } = await import("../db/index.js");
        const { RagMultiAgentService } = await import("../services/rag-multi-agent.service.js");
        const { brandAiAgents } = await import("../db/schema/brand-interface.js");
        const { eq, and } = await import("drizzle-orm");

        const ragService = new RagMultiAgentService(user.brandTenantId);

        // Get agent name
        const agents = await db
          .select()
          .from(brandAiAgents)
          .where(
            and(
              eq(brandAiAgents.agentId, agentId),
              eq(brandAiAgents.brandTenantId, user.brandTenantId)
            )
          )
          .limit(1);

        const agentName = agents.length > 0 ? agents[0].name : agentId;

        // Ensure RAG agent exists
        await ragService.ensureRagAgent({
          agentId,
          agentName
        });

        const results: { fileName: string; sourceId: string; success: boolean; error?: string }[] = [];

        for (const file of files) {
          try {
            // Extract text from file based on type
            let textContent = "";
            const ext = path.extname(file.originalname).toLowerCase();

            if (ext === '.txt' || ext === '.md') {
              textContent = file.buffer.toString('utf-8');
            } else if (ext === '.pdf') {
              // Use pdf-parse for PDF extraction
              const pdfParse = await import("pdf-parse");
              const pdfData = await pdfParse.default(file.buffer);
              textContent = pdfData.text;
            } else if (ext === '.doc' || ext === '.docx') {
              // For DOC/DOCX, store raw and extract later or use basic extraction
              textContent = `[Document: ${file.originalname}]\n\nThis document format requires specialized parsing. The file has been stored for processing.`;
            }

            if (!textContent.trim()) {
              textContent = `[Empty or unreadable document: ${file.originalname}]`;
            }

            const sourceId = await ragService.addDocumentSource(
              agentId,
              file.originalname,
              file.size,
              textContent,
              {
                mimeType: file.mimetype,
                uploadedAt: new Date().toISOString()
              }
            );

            // Start processing in background automatically
            ragService.processDataSource(sourceId).catch(err => {
              console.error(`❌ Background processing failed for ${file.originalname}:`, err);
            });

            results.push({
              fileName: file.originalname,
              sourceId,
              success: true
            });

          } catch (fileError: any) {
            console.error(`❌ Error processing file ${file.originalname}:`, fileError);
            results.push({
              fileName: file.originalname,
              sourceId: '',
              success: false,
              error: fileError.message
            });
          }
        }

        const successCount = results.filter(r => r.success).length;
        
        res.json({
          success: successCount > 0,
          data: {
            count: successCount,
            total: files.length,
            results
          },
          message: `${successCount}/${files.length} documenti caricati con successo`
        });
      });

    } catch (error) {
      console.error("❌ Error in upload endpoint:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to upload documents"
      });
    }
  });

  // Process/sync a data source (generate chunks and embeddings)
  app.post("/brand-api/agents/:agentId/rag/sources/:sourceId/sync", async (req, res) => {
    const user = (req as any).user;
    const { agentId, sourceId } = req.params;

    try {
      const { RagMultiAgentService } = await import("../services/rag-multi-agent.service.js");
      const ragService = new RagMultiAgentService(user.brandTenantId);

      // Process async in background
      ragService.processDataSource(sourceId).catch(err => {
        console.error(`❌ Background sync failed for source ${sourceId}:`, err);
      });

      res.json({
        success: true,
        message: "Sync started in background"
      });
    } catch (error) {
      console.error("❌ Error starting sync:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to start sync"
      });
    }
  });

  // Delete a data source
  app.delete("/brand-api/agents/:agentId/rag/sources/:sourceId", async (req, res) => {
    const user = (req as any).user;
    const { agentId, sourceId } = req.params;

    try {
      const { RagMultiAgentService } = await import("../services/rag-multi-agent.service.js");
      const ragService = new RagMultiAgentService(user.brandTenantId);
      await ragService.deleteDataSource(sourceId);

      res.json({
        success: true,
        message: "Data source deleted successfully"
      });
    } catch (error) {
      console.error("❌ Error deleting data source:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete data source"
      });
    }
  });

  // List active embedding jobs (sources in pending/processing state)
  app.get("/brand-api/agents/:agentId/rag/jobs", async (req, res) => {
    const user = (req as any).user;
    const { agentId } = req.params;

    try {
      const { db } = await import("../db/index.js");
      const { ragDataSources, ragAgents } = await import("../db/schema/brand-interface.js");
      const { eq, and, or, inArray } = await import("drizzle-orm");

      // Get the RAG agent
      const ragAgent = await db
        .select()
        .from(ragAgents)
        .where(
          and(
            eq(ragAgents.agentId, agentId),
            eq(ragAgents.brandTenantId, user.brandTenantId)
          )
        )
        .limit(1);

      if (ragAgent.length === 0) {
        return res.json({
          success: true,
          data: []
        });
      }

      // Get sources in pending or processing state
      const jobs = await db
        .select({
          id: ragDataSources.id,
          sourceType: ragDataSources.sourceType,
          sourceUrl: ragDataSources.sourceUrl,
          fileName: ragDataSources.fileName,
          status: ragDataSources.status,
          createdAt: ragDataSources.createdAt,
          updatedAt: ragDataSources.updatedAt
        })
        .from(ragDataSources)
        .where(
          and(
            eq(ragDataSources.ragAgentId, ragAgent[0].id),
            eq(ragDataSources.brandTenantId, user.brandTenantId),
            or(
              eq(ragDataSources.status, 'pending'),
              eq(ragDataSources.status, 'processing')
            )
          )
        );

      res.json({
        success: true,
        data: jobs.map(job => ({
          id: job.id,
          type: job.sourceType,
          name: job.fileName || job.sourceUrl || 'Unknown',
          status: job.status,
          startedAt: job.createdAt,
          updatedAt: job.updatedAt
        }))
      });
    } catch (error) {
      console.error("❌ Error fetching jobs:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch jobs"
      });
    }
  });

  // Cancel an embedding job (set status to 'cancelled')
  app.post("/brand-api/agents/:agentId/rag/jobs/:jobId/cancel", async (req, res) => {
    const user = (req as any).user;
    const { agentId, jobId } = req.params;

    try {
      const { db } = await import("../db/index.js");
      const { ragDataSources } = await import("../db/schema/brand-interface.js");
      const { eq, and } = await import("drizzle-orm");

      await db
        .update(ragDataSources)
        .set({ 
          status: 'cancelled',
          updatedAt: new Date()
        })
        .where(
          and(
            eq(ragDataSources.id, jobId),
            eq(ragDataSources.brandTenantId, user.brandTenantId)
          )
        );

      res.json({
        success: true,
        message: "Job cancelled successfully"
      });
    } catch (error) {
      console.error("❌ Error cancelling job:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to cancel job"
      });
    }
  });

  // Cancel all pending/processing jobs for an agent
  app.post("/brand-api/agents/:agentId/rag/jobs/cancel-all", async (req, res) => {
    const user = (req as any).user;
    const { agentId } = req.params;

    try {
      const { db } = await import("../db/index.js");
      const { ragDataSources, ragAgents } = await import("../db/schema/brand-interface.js");
      const { eq, and, or } = await import("drizzle-orm");

      // Get the RAG agent
      const ragAgent = await db
        .select()
        .from(ragAgents)
        .where(
          and(
            eq(ragAgents.agentId, agentId),
            eq(ragAgents.brandTenantId, user.brandTenantId)
          )
        )
        .limit(1);

      if (ragAgent.length === 0) {
        return res.json({
          success: true,
          data: { cancelled: 0 }
        });
      }

      const result = await db
        .update(ragDataSources)
        .set({ 
          status: 'cancelled',
          updatedAt: new Date()
        })
        .where(
          and(
            eq(ragDataSources.ragAgentId, ragAgent[0].id),
            eq(ragDataSources.brandTenantId, user.brandTenantId),
            or(
              eq(ragDataSources.status, 'pending'),
              eq(ragDataSources.status, 'processing')
            )
          )
        )
        .returning();

      res.json({
        success: true,
        data: { cancelled: result.length },
        message: `${result.length} job(s) cancelled`
      });
    } catch (error) {
      console.error("❌ Error cancelling all jobs:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to cancel jobs"
      });
    }
  });

  // Search similar chunks (RAG retrieval) - GET version for compatibility
  app.get("/brand-api/agents/:agentId/rag/search", async (req, res) => {
    const brandContext = (req as any).brandContext;
    const { agentId } = req.params;
    const { query, limit = "5" } = req.query;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ success: false, error: "Query parameter is required" });
    }

    try {
      const { RagMultiAgentService } = await import("../services/rag-multi-agent.service.js");
      const ragService = new RagMultiAgentService(brandContext.brandTenantId);
      const results = await ragService.searchSimilar(agentId, query, parseInt(limit as string, 10));

      res.json({
        success: true,
        data: {
          query,
          results
        },
        message: `Found ${results.length} similar results`
      });
    } catch (error) {
      console.error("❌ Error searching RAG:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to search RAG"
      });
    }
  });

  // Search similar chunks (RAG retrieval) - POST version for long queries
  app.post("/brand-api/agents/:agentId/rag/search", async (req, res) => {
    const brandContext = (req as any).brandContext;
    const { agentId } = req.params;
    const { query, limit = 5 } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ success: false, error: "Query is required in request body" });
    }

    try {
      const { RagMultiAgentService } = await import("../services/rag-multi-agent.service.js");
      const ragService = new RagMultiAgentService(brandContext.brandTenantId);
      const results = await ragService.searchSimilar(agentId, query, parseInt(limit as string, 10));

      res.json({
        success: true,
        data: {
          query,
          results
        },
        message: `Found ${results.length} similar results`
      });
    } catch (error) {
      console.error("❌ Error searching RAG:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to search RAG"
      });
    }
  });

  // List chunks for an agent
  app.get("/brand-api/agents/:agentId/rag/chunks", async (req, res) => {
    const user = (req as any).user;
    const { agentId } = req.params;
    const { sourceId, limit = "50" } = req.query;

    try {
      const { RagMultiAgentService } = await import("../services/rag-multi-agent.service.js");
      const ragService = new RagMultiAgentService(user.brandTenantId);
      const chunks = await ragService.listChunks(
        agentId,
        sourceId as string | undefined,
        parseInt(limit as string, 10)
      );

      res.json({
        success: true,
        data: chunks
      });
    } catch (error) {
      console.error("❌ Error fetching chunks:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch chunks"
      });
    }
  });

  // Delete a chunk
  app.delete("/brand-api/agents/:agentId/rag/chunks/:chunkId", async (req, res) => {
    const user = (req as any).user;
    const { agentId, chunkId } = req.params;

    try {
      const { ragChunks } = await import("../db/schema/brand-interface.js");
      const { eq, and } = await import("drizzle-orm");

      await db
        .delete(ragChunks)
        .where(
          and(
            eq(ragChunks.id, chunkId),
            eq(ragChunks.brandTenantId, user.brandTenantId)
          )
        );

      res.json({
        success: true,
        message: "Chunk deleted successfully"
      });
    } catch (error) {
      console.error("❌ Error deleting chunk:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete chunk"
      });
    }
  });

  // Get sync jobs for an agent
  app.get("/brand-api/agents/:agentId/rag/jobs", async (req, res) => {
    const user = (req as any).user;
    const { agentId } = req.params;
    const { limit = "20" } = req.query;

    try {
      const { ragSyncJobs, ragAgents } = await import("../db/schema/brand-interface.js");
      const { eq, and, desc } = await import("drizzle-orm");

      // Get RAG agent ID
      const agents = await db
        .select()
        .from(ragAgents)
        .where(
          and(
            eq(ragAgents.agentId, agentId),
            eq(ragAgents.brandTenantId, user.brandTenantId)
          )
        )
        .limit(1);

      if (agents.length === 0) {
        return res.json({ success: true, data: [] });
      }

      const jobs = await db
        .select()
        .from(ragSyncJobs)
        .where(
          and(
            eq(ragSyncJobs.ragAgentId, agents[0].id),
            eq(ragSyncJobs.brandTenantId, user.brandTenantId)
          )
        )
        .orderBy(desc(ragSyncJobs.createdAt))
        .limit(parseInt(limit as string, 10));

      res.json({ success: true, data: jobs });
    } catch (error) {
      console.error("❌ Error fetching sync jobs:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch sync jobs"
      });
    }
  });

  // Get embeddings usage for an agent
  app.get("/brand-api/agents/:agentId/rag/usage", async (req, res) => {
    const user = (req as any).user;
    const { agentId } = req.params;

    try {
      const { db } = await import("../db/index.js");
      const { ragEmbeddingsUsage, ragAgents } = await import("../db/schema/brand-interface.js");
      const { eq, and, desc, sql } = await import("drizzle-orm");

      // Get RAG agent ID
      const agents = await db
        .select()
        .from(ragAgents)
        .where(
          and(
            eq(ragAgents.agentId, agentId),
            eq(ragAgents.brandTenantId, user.brandTenantId)
          )
        )
        .limit(1);

      if (agents.length === 0) {
        return res.json({
          success: true,
          data: {
            totalTokens: 0,
            totalCost: 0,
            history: []
          }
        });
      }

      // Get aggregated stats
      const stats = await db
        .select({
          totalTokens: sql<number>`COALESCE(SUM(tokens_used), 0)`,
          totalCost: sql<number>`COALESCE(SUM(estimated_cost), 0)`
        })
        .from(ragEmbeddingsUsage)
        .where(
          and(
            eq(ragEmbeddingsUsage.ragAgentId, agents[0].id),
            eq(ragEmbeddingsUsage.brandTenantId, user.brandTenantId)
          )
        );

      // Get recent usage history
      const history = await db
        .select()
        .from(ragEmbeddingsUsage)
        .where(
          and(
            eq(ragEmbeddingsUsage.ragAgentId, agents[0].id),
            eq(ragEmbeddingsUsage.brandTenantId, user.brandTenantId)
          )
        )
        .orderBy(desc(ragEmbeddingsUsage.createdAt))
        .limit(30);

      res.json({
        success: true,
        data: {
          totalTokens: stats[0]?.totalTokens || 0,
          totalCost: stats[0]?.totalCost || 0,
          history
        }
      });
    } catch (error) {
      console.error("❌ Error fetching usage:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch usage"
      });
    }
  });

  // ==================== CLOUD STORAGE MANAGEMENT ENDPOINTS ====================
  
  // Get global storage configuration
  app.get("/brand-api/storage/config", async (req, res) => {
    const user = (req as any).user;

    try {
      const { db } = await import("../db/index.js");
      const { storageGlobalConfig } = await import("../db/schema/brand-interface.js");
      const { eq } = await import("drizzle-orm");

      const configs = await db
        .select()
        .from(storageGlobalConfig)
        .where(eq(storageGlobalConfig.brandTenantId, user.brandTenantId))
        .limit(1);

      if (configs.length === 0) {
        return res.json({
          success: true,
          data: null // No config exists yet
        });
      }

      // Remove encrypted keys from response
      const config = configs[0];
      const safeConfig = {
        ...config,
        accessKeyEncrypted: config.accessKeyEncrypted ? "****" : null,
        secretKeyEncrypted: config.secretKeyEncrypted ? "****" : null,
        hasCredentials: !!(config.accessKeyEncrypted && config.secretKeyEncrypted)
      };

      res.json({
        success: true,
        data: safeConfig
      });
    } catch (error) {
      console.error("❌ Error fetching storage config:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch storage config"
      });
    }
  });

  // Create or update global storage configuration
  app.post("/brand-api/storage/config", async (req, res) => {
    const user = (req as any).user;
    const configData = req.body;

    try {
      const { db } = await import("../db/index.js");
      const { storageGlobalConfig } = await import("../db/schema/brand-interface.js");
      const { eq } = await import("drizzle-orm");
      const crypto = await import("crypto");

      // Simple AES encryption for credentials - REQUIRES environment variable
      const encryptKey = process.env.STORAGE_ENCRYPTION_KEY;
      if (!encryptKey || encryptKey.length < 32) {
        return res.status(500).json({
          success: false,
          error: "STORAGE_ENCRYPTION_KEY environment variable must be set (min 32 characters)"
        });
      }
      const encrypt = (text: string): string => {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptKey.padEnd(32).slice(0, 32)), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
      };

      // Check if config exists
      const existing = await db
        .select({ id: storageGlobalConfig.id })
        .from(storageGlobalConfig)
        .where(eq(storageGlobalConfig.brandTenantId, user.brandTenantId))
        .limit(1);

      // Prepare data - encrypt credentials if provided
      const dataToSave: any = {
        provider: configData.provider || 'aws_s3',
        bucketName: configData.bucketName,
        region: configData.region || 'eu-central-1',
        endpoint: configData.endpoint,
        versioningEnabled: configData.versioningEnabled ?? true,
        encryptionEnabled: configData.encryptionEnabled ?? true,
        encryptionType: configData.encryptionType || 'AES256',
        corsEnabled: configData.corsEnabled ?? true,
        corsAllowedOrigins: configData.corsAllowedOrigins || [],
        lifecycleRules: configData.lifecycleRules || [],
        signedUrlExpiryHours: configData.signedUrlExpiryHours || 24,
        maxUploadSizeMb: configData.maxUploadSizeMb || 100,
        updatedAt: new Date()
      };

      // Only update credentials if provided
      if (configData.accessKey) {
        dataToSave.accessKeyEncrypted = encrypt(configData.accessKey);
      }
      if (configData.secretKey) {
        dataToSave.secretKeyEncrypted = encrypt(configData.secretKey);
      }

      let result;
      if (existing.length > 0) {
        // Update existing
        result = await db
          .update(storageGlobalConfig)
          .set(dataToSave)
          .where(eq(storageGlobalConfig.id, existing[0].id))
          .returning();
      } else {
        // Create new
        result = await db
          .insert(storageGlobalConfig)
          .values({
            ...dataToSave,
            brandTenantId: user.brandTenantId,
            createdAt: new Date()
          })
          .returning();
      }

      res.json({
        success: true,
        data: {
          id: result[0].id,
          hasCredentials: !!(result[0].accessKeyEncrypted && result[0].secretKeyEncrypted)
        }
      });
    } catch (error) {
      console.error("❌ Error saving storage config:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to save storage config"
      });
    }
  });

  // Test S3 connection
  app.post("/brand-api/storage/test-connection", async (req, res) => {
    const user = (req as any).user;

    try {
      const { db } = await import("../db/index.js");
      const { storageGlobalConfig } = await import("../db/schema/brand-interface.js");
      const { eq } = await import("drizzle-orm");
      const crypto = await import("crypto");
      const { S3Client, HeadBucketCommand } = await import("@aws-sdk/client-s3");

      // Get config
      const configs = await db
        .select()
        .from(storageGlobalConfig)
        .where(eq(storageGlobalConfig.brandTenantId, user.brandTenantId))
        .limit(1);

      if (configs.length === 0 || !configs[0].accessKeyEncrypted || !configs[0].secretKeyEncrypted) {
        return res.status(400).json({
          success: false,
          error: "Storage configuration or credentials not found"
        });
      }

      const config = configs[0];

      // Decrypt credentials - REQUIRES environment variable
      const encryptKey = process.env.STORAGE_ENCRYPTION_KEY;
      if (!encryptKey || encryptKey.length < 32) {
        return res.status(500).json({
          success: false,
          error: "STORAGE_ENCRYPTION_KEY environment variable must be set"
        });
      }
      const decrypt = (encryptedText: string): string => {
        const [ivHex, encrypted] = encryptedText.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptKey.padEnd(32).slice(0, 32)), iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      };

      const accessKey = decrypt(config.accessKeyEncrypted);
      const secretKey = decrypt(config.secretKeyEncrypted);

      // Test connection with AWS SDK
      const s3Client = new S3Client({
        region: config.region || 'eu-central-1',
        credentials: {
          accessKeyId: accessKey,
          secretAccessKey: secretKey
        },
        ...(config.endpoint && { endpoint: config.endpoint })
      });

      await s3Client.send(new HeadBucketCommand({ Bucket: config.bucketName! }));

      // Update connection status
      await db
        .update(storageGlobalConfig)
        .set({
          connectionStatus: 'connected',
          connectionError: null,
          lastConnectionTestAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(storageGlobalConfig.id, config.id));

      res.json({
        success: true,
        message: "Connection successful",
        data: {
          bucket: config.bucketName,
          region: config.region,
          status: "connected"
        }
      });
    } catch (error: any) {
      console.error("❌ S3 connection test failed:", error);

      // Update connection status with error
      const { db } = await import("../db/index.js");
      const { storageGlobalConfig } = await import("../db/schema/brand-interface.js");
      const { eq } = await import("drizzle-orm");

      await db
        .update(storageGlobalConfig)
        .set({
          connectionStatus: 'error',
          connectionError: error.message,
          lastConnectionTestAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(storageGlobalConfig.brandTenantId, (req as any).user.brandTenantId));

      res.status(400).json({
        success: false,
        error: error.message || "Connection failed"
      });
    }
  });

  // Disconnect AWS S3 - remove credentials and reset connection
  app.delete("/brand-api/storage/disconnect", async (req, res) => {
    const user = (req as any).user;

    try {
      const { db } = await import("../db/index.js");
      const { storageGlobalConfig } = await import("../db/schema/brand-interface.js");
      const { eq } = await import("drizzle-orm");

      // Get existing config
      const configs = await db
        .select({ id: storageGlobalConfig.id })
        .from(storageGlobalConfig)
        .where(eq(storageGlobalConfig.brandTenantId, user.brandTenantId))
        .limit(1);

      if (configs.length === 0) {
        return res.status(404).json({
          success: false,
          error: "No storage configuration found"
        });
      }

      // Clear credentials and reset connection status
      await db
        .update(storageGlobalConfig)
        .set({
          accessKeyEncrypted: null,
          secretKeyEncrypted: null,
          connectionStatus: 'not_tested',
          connectionError: null,
          lastConnectionTestAt: null,
          updatedAt: new Date()
        })
        .where(eq(storageGlobalConfig.id, configs[0].id));

      res.json({
        success: true,
        message: "AWS S3 credentials removed successfully"
      });
    } catch (error) {
      console.error("❌ Error disconnecting storage:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to disconnect storage"
      });
    }
  });

  // Get all tenant storage allocations with real usage data from W3 Suite
  // This endpoint fetches ALL tenants from W3 backend and merges with existing allocations
  app.get("/brand-api/storage/allocations", async (req, res) => {
    const user = (req as any).user;

    try {
      const { db } = await import("../db/index.js");
      const { tenantStorageAllocations } = await import("../db/schema/brand-interface.js");
      const { eq } = await import("drizzle-orm");

      // Step 1: Get existing allocations from Brand Interface DB
      const existingAllocations = await db
        .select()
        .from(tenantStorageAllocations)
        .where(eq(tenantStorageAllocations.brandTenantId, user.brandTenantId));

      // Create a map for quick lookup
      const allocationMap = new Map(existingAllocations.map(a => [a.tenantId, a]));

      // Step 2: Fetch ALL tenants from W3 Suite backend
      const W3_BACKEND_URL = process.env.W3_BACKEND_URL || 'http://localhost:3004';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Tenant-ID': '00000000-0000-0000-0000-000000000001', // Brand tenant
        'X-Service': 'brand-interface',
        'X-Service-Version': '1.0.0'
      };
      
      if (process.env.NODE_ENV === 'development') {
        headers['X-Auth-Session'] = 'authenticated';
        headers['X-Demo-User'] = 'demo-user';
      } else {
        headers['Authorization'] = `Bearer ${process.env.W3_SERVICE_TOKEN || 'dev-service-token'}`;
      }

      let allTenants: Array<{ id: string; name: string; slug: string; description?: string; isActive?: boolean }> = [];
      
      try {
        const tenantsResponse = await fetch(`${W3_BACKEND_URL}/api/tenants/all`, {
          method: 'GET',
          headers
        });

        if (tenantsResponse.ok) {
          const tenantsData = await tenantsResponse.json();
          allTenants = tenantsData.data || [];
          console.log(`✅ Fetched ${allTenants.length} tenants from W3 backend`);
        } else {
          console.warn('⚠️ Could not fetch tenants from W3 backend:', await tenantsResponse.text());
        }
      } catch (fetchError) {
        console.warn('⚠️ Could not connect to W3 backend:', fetchError);
      }

      // Step 3: Merge tenants with allocations and fetch real usage data
      const enrichedAllocations = await Promise.all(allTenants.map(async (tenant) => {
        const existingAllocation = allocationMap.get(tenant.id);
        
        // Get real usage data for this tenant
        let usedBytes = 0;
        let objectCount = 0;
        
        try {
          const usageHeaders = { ...headers, 'X-Tenant-ID': tenant.id };
          const usageResponse = await fetch(`${W3_BACKEND_URL}/api/storage/tenant-allocation`, {
            method: 'GET',
            headers: usageHeaders
          });

          if (usageResponse.ok) {
            const usageData = await usageResponse.json();
            usedBytes = usageData.usedBytes || 0;
            objectCount = usageData.objectCount || 0;
          }
        } catch (usageError) {
          console.warn(`⚠️ Could not fetch usage for tenant ${tenant.id}`);
        }

        if (existingAllocation) {
          // Merge with existing allocation
          const quotaBytes = existingAllocation.quotaBytes || 0;
          return {
            ...existingAllocation,
            tenantName: tenant.name, // Update name from source
            tenantSlug: tenant.slug,
            usedBytes,
            objectCount,
            usagePercent: quotaBytes > 0 ? Math.round((usedBytes / quotaBytes) * 100) : 0
          };
        } else {
          // Create virtual allocation for tenant without one
          return {
            id: `virtual-${tenant.id}`,
            brandTenantId: user.brandTenantId,
            tenantId: tenant.id,
            tenantName: tenant.name,
            tenantSlug: tenant.slug,
            quotaBytes: 0,
            usedBytes,
            objectCount,
            usagePercent: 0,
            alertThresholdPercent: 80,
            maxUploadSizeMb: null,
            allowedFileTypes: null,
            features: null,
            suspended: false,
            suspendReason: null,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        }
      }));

      res.json({
        success: true,
        data: enrichedAllocations
      });
    } catch (error) {
      console.error("❌ Error fetching allocations:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch allocations"
      });
    }
  });

  // Create or update tenant storage allocation
  app.post("/brand-api/storage/allocations", async (req, res) => {
    const user = (req as any).user;
    const { tenantId, tenantName, tenantSlug, quotaBytes, alertThresholdPercent, maxUploadSizeMb, allowedFileTypes, features } = req.body;

    try {
      const { db } = await import("../db/index.js");
      const { tenantStorageAllocations, storageGlobalConfig } = await import("../db/schema/brand-interface.js");
      const { eq, and, sql } = await import("drizzle-orm");

      if (!tenantId || !tenantName) {
        return res.status(400).json({
          success: false,
          error: "tenantId and tenantName are required"
        });
      }

      // Check if allocation exists
      const existing = await db
        .select()
        .from(tenantStorageAllocations)
        .where(
          and(
            eq(tenantStorageAllocations.tenantId, tenantId),
            eq(tenantStorageAllocations.brandTenantId, user.brandTenantId)
          )
        )
        .limit(1);

      let result;
      if (existing.length > 0) {
        // Update
        result = await db
          .update(tenantStorageAllocations)
          .set({
            quotaBytes: quotaBytes ?? existing[0].quotaBytes,
            alertThresholdPercent: alertThresholdPercent ?? existing[0].alertThresholdPercent,
            maxUploadSizeMb,
            allowedFileTypes,
            features: features ?? existing[0].features,
            updatedAt: new Date()
          })
          .where(eq(tenantStorageAllocations.id, existing[0].id))
          .returning();
      } else {
        // Create
        result = await db
          .insert(tenantStorageAllocations)
          .values({
            tenantId,
            tenantName,
            tenantSlug,
            quotaBytes: quotaBytes ?? 5368709120, // 5GB default
            alertThresholdPercent: alertThresholdPercent ?? 80,
            maxUploadSizeMb,
            allowedFileTypes,
            features: features ?? {},
            brandTenantId: user.brandTenantId
          })
          .returning();
      }

      // Update total allocated in global config
      const totalAllocated = await db
        .select({ total: sql<number>`COALESCE(SUM(quota_bytes), 0)` })
        .from(tenantStorageAllocations)
        .where(eq(tenantStorageAllocations.brandTenantId, user.brandTenantId));

      await db
        .update(storageGlobalConfig)
        .set({
          totalAllocatedBytes: totalAllocated[0]?.total || 0,
          updatedAt: new Date()
        })
        .where(eq(storageGlobalConfig.brandTenantId, user.brandTenantId));

      res.json({
        success: true,
        data: result[0]
      });
    } catch (error) {
      console.error("❌ Error saving allocation:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to save allocation"
      });
    }
  });

  // Suspend/unsuspend tenant storage
  app.patch("/brand-api/storage/allocations/:tenantId/suspend", async (req, res) => {
    const user = (req as any).user;
    const { tenantId } = req.params;
    const { suspended, reason } = req.body;

    try {
      const { db } = await import("../db/index.js");
      const { tenantStorageAllocations } = await import("../db/schema/brand-interface.js");
      const { eq, and } = await import("drizzle-orm");

      const result = await db
        .update(tenantStorageAllocations)
        .set({
          suspended: suspended ?? false,
          suspendReason: suspended ? reason : null,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(tenantStorageAllocations.tenantId, tenantId),
            eq(tenantStorageAllocations.brandTenantId, user.brandTenantId)
          )
        )
        .returning();

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Tenant allocation not found"
        });
      }

      res.json({
        success: true,
        data: result[0]
      });
    } catch (error) {
      console.error("❌ Error updating suspend status:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to update suspend status"
      });
    }
  });

  // Delete tenant storage allocation
  app.delete("/brand-api/storage/allocations/:tenantId", async (req, res) => {
    const user = (req as any).user;
    const { tenantId } = req.params;

    try {
      const { db } = await import("../db/index.js");
      const { tenantStorageAllocations, storageGlobalConfig } = await import("../db/schema/brand-interface.js");
      const { eq, and, sql } = await import("drizzle-orm");

      // Delete the allocation
      const result = await db
        .delete(tenantStorageAllocations)
        .where(
          and(
            eq(tenantStorageAllocations.tenantId, tenantId),
            eq(tenantStorageAllocations.brandTenantId, user.brandTenantId)
          )
        )
        .returning();

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Tenant allocation not found"
        });
      }

      // Update total allocated in global config
      const totalAllocated = await db
        .select({ total: sql<number>`COALESCE(SUM(quota_bytes), 0)` })
        .from(tenantStorageAllocations)
        .where(eq(tenantStorageAllocations.brandTenantId, user.brandTenantId));

      await db
        .update(storageGlobalConfig)
        .set({
          totalAllocatedBytes: totalAllocated[0]?.total || 0,
          updatedAt: new Date()
        })
        .where(eq(storageGlobalConfig.brandTenantId, user.brandTenantId));

      res.json({
        success: true,
        message: "Tenant allocation deleted successfully"
      });
    } catch (error) {
      console.error("❌ Error deleting allocation:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete allocation"
      });
    }
  });

  // Get storage usage analytics with real data from W3 Suite
  // This endpoint fetches ALL tenants from W3 backend and merges with existing allocations
  app.get("/brand-api/storage/analytics", async (req, res) => {
    const user = (req as any).user;
    const { startDate, endDate } = req.query;

    try {
      const { db } = await import("../db/index.js");
      const { storageUsageLogs, tenantStorageAllocations, storageGlobalConfig } = await import("../db/schema/brand-interface.js");
      const { eq, sql, and, gte, lte } = await import("drizzle-orm");

      // Get global config
      const configs = await db
        .select()
        .from(storageGlobalConfig)
        .where(eq(storageGlobalConfig.brandTenantId, user.brandTenantId))
        .limit(1);

      // Step 1: Get existing allocations from Brand Interface DB
      const existingAllocations = await db
        .select()
        .from(tenantStorageAllocations)
        .where(eq(tenantStorageAllocations.brandTenantId, user.brandTenantId));

      // Create a map for quick lookup
      const allocationMap = new Map(existingAllocations.map(a => [a.tenantId, a]));

      // Step 2: Fetch ALL tenants from W3 Suite backend
      const W3_BACKEND_URL = process.env.W3_BACKEND_URL || 'http://localhost:3004';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Tenant-ID': '00000000-0000-0000-0000-000000000001',
        'X-Service': 'brand-interface',
        'X-Service-Version': '1.0.0'
      };
      
      if (process.env.NODE_ENV === 'development') {
        headers['X-Auth-Session'] = 'authenticated';
        headers['X-Demo-User'] = 'demo-user';
      } else {
        headers['Authorization'] = `Bearer ${process.env.W3_SERVICE_TOKEN || 'dev-service-token'}`;
      }

      let allTenants: Array<{ id: string; name: string; slug: string }> = [];
      
      try {
        const tenantsResponse = await fetch(`${W3_BACKEND_URL}/api/tenants/all`, {
          method: 'GET',
          headers
        });

        if (tenantsResponse.ok) {
          const tenantsData = await tenantsResponse.json();
          allTenants = tenantsData.data || [];
        }
      } catch (fetchError) {
        console.warn('⚠️ Could not connect to W3 backend for analytics:', fetchError);
      }

      // Step 3: Merge tenants with allocations and fetch real usage data
      const enrichedAllocations = await Promise.all(allTenants.map(async (tenant) => {
        const existingAllocation = allocationMap.get(tenant.id);
        
        let usedBytes = 0;
        let objectCount = 0;
        
        try {
          const usageHeaders = { ...headers, 'X-Tenant-ID': tenant.id };
          const usageResponse = await fetch(`${W3_BACKEND_URL}/api/storage/tenant-allocation`, {
            method: 'GET',
            headers: usageHeaders
          });

          if (usageResponse.ok) {
            const usageData = await usageResponse.json();
            usedBytes = usageData.usedBytes || 0;
            objectCount = usageData.objectCount || 0;
          }
        } catch (usageError) {
          console.warn(`⚠️ Could not fetch usage for tenant ${tenant.id}`);
        }

        if (existingAllocation) {
          return {
            ...existingAllocation,
            tenantName: tenant.name,
            tenantSlug: tenant.slug,
            usedBytes,
            objectCount
          };
        } else {
          return {
            tenantId: tenant.id,
            tenantName: tenant.name,
            tenantSlug: tenant.slug,
            quotaBytes: 0,
            usedBytes,
            objectCount,
            alertThresholdPercent: 80,
            suspended: false
          };
        }
      }));

      // Calculate totals from enriched data
      const totalQuota = enrichedAllocations.reduce((sum, a) => sum + (a.quotaBytes || 0), 0);
      const totalUsed = enrichedAllocations.reduce((sum, a) => sum + (a.usedBytes || 0), 0);
      const totalObjects = enrichedAllocations.reduce((sum, a) => sum + (a.objectCount || 0), 0);

      // AWS S3 Standard Frankfurt pricing (eu-central-1) - as of 2024
      const AWS_S3_PRICING = {
        storagePerGbMonth: 0.023,      // $0.023/GB/month for first 50TB
        putPostListPer1k: 0.0054,      // $0.0054 per 1,000 PUT/POST/LIST requests
        getSelectPer1k: 0.00043,       // $0.00043 per 1,000 GET/SELECT requests
        dataTransferPerGb: 0.09,       // $0.09/GB for data transfer out (first 10TB)
      };

      // Calculate estimated monthly costs
      const storageGb = totalUsed / (1024 * 1024 * 1024);
      const estimatedStorageCost = storageGb * AWS_S3_PRICING.storagePerGbMonth;
      // Estimate requests based on object count (rough approximation)
      const estimatedPutCost = (totalObjects / 1000) * AWS_S3_PRICING.putPostListPer1k;
      const estimatedGetCost = (totalObjects * 10 / 1000) * AWS_S3_PRICING.getSelectPer1k; // Assume 10 gets per object
      const totalEstimatedCost = estimatedStorageCost + estimatedPutCost + estimatedGetCost;

      // Get usage logs if date range provided
      let usageLogs: any[] = [];
      if (startDate && endDate) {
        usageLogs = await db
          .select()
          .from(storageUsageLogs)
          .where(
            and(
              eq(storageUsageLogs.brandTenantId, user.brandTenantId),
              gte(storageUsageLogs.periodStart, new Date(startDate as string)),
              lte(storageUsageLogs.periodEnd, new Date(endDate as string))
            )
          );
      }

      res.json({
        success: true,
        data: {
          config: configs[0] ? {
            provider: configs[0].provider,
            region: configs[0].region,
            bucketName: configs[0].bucketName,
            connectionStatus: configs[0].connectionStatus,
            lastConnectionTestAt: configs[0].lastConnectionTestAt
          } : null,
          summary: {
            totalQuotaBytes: totalQuota,
            totalUsedBytes: totalUsed,
            totalObjectCount: totalObjects,
            usagePercent: totalQuota > 0 ? Math.round((totalUsed / totalQuota) * 100) : 0,
            tenantCount: enrichedAllocations.length
          },
          costs: {
            currency: 'USD',
            estimatedMonthly: {
              storage: Math.round(estimatedStorageCost * 100) / 100,
              putPostList: Math.round(estimatedPutCost * 100) / 100,
              getSelect: Math.round(estimatedGetCost * 100) / 100,
              total: Math.round(totalEstimatedCost * 100) / 100
            },
            pricing: {
              storagePerGbMonth: AWS_S3_PRICING.storagePerGbMonth,
              putPostListPer1k: AWS_S3_PRICING.putPostListPer1k,
              getSelectPer1k: AWS_S3_PRICING.getSelectPer1k,
              region: 'eu-central-1 (Frankfurt)'
            }
          },
          tenants: enrichedAllocations.map(a => ({
            tenantId: a.tenantId,
            tenantName: a.tenantName,
            tenantSlug: a.tenantSlug,
            quotaBytes: a.quotaBytes,
            usedBytes: a.usedBytes || 0,
            objectCount: a.objectCount || 0,
            usagePercent: a.quotaBytes && a.quotaBytes > 0 ? Math.round(((a.usedBytes || 0) / a.quotaBytes) * 100) : 0,
            suspended: a.suspended,
            alertThresholdPercent: a.alertThresholdPercent
          })),
          usageLogs
        }
      });
    } catch (error) {
      console.error("❌ Error fetching analytics:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch analytics"
      });
    }
  });

  // Sync storage usage from S3 (recalculate actual usage per tenant)
  app.post("/brand-api/storage/sync-usage", async (req, res) => {
    const user = (req as any).user;

    try {
      const { db } = await import("../db/index.js");
      const { tenantStorageAllocations, storageGlobalConfig } = await import("../db/schema/brand-interface.js");
      const { eq, and } = await import("drizzle-orm");
      const crypto = await import("crypto");

      // Get storage config
      const configs = await db
        .select()
        .from(storageGlobalConfig)
        .where(eq(storageGlobalConfig.brandTenantId, user.brandTenantId))
        .limit(1);

      if (!configs[0]?.accessKeyEncrypted || !configs[0]?.secretKeyEncrypted) {
        return res.status(400).json({
          success: false,
          error: "S3 credentials not configured"
        });
      }

      const config = configs[0];
      
      // Decrypt credentials
      const encryptKey = process.env.STORAGE_ENCRYPTION_KEY;
      if (!encryptKey || encryptKey.length < 32) {
        return res.status(500).json({
          success: false,
          error: "STORAGE_ENCRYPTION_KEY not configured"
        });
      }
      const decrypt = (encryptedText: string): string => {
        const [ivHex, encrypted] = encryptedText.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptKey.padEnd(32).slice(0, 32)), iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      };
      
      const accessKey = decrypt(config.accessKeyEncrypted);
      const secretKey = decrypt(config.secretKeyEncrypted);

      const { S3Client, ListObjectsV2Command } = await import("@aws-sdk/client-s3");
      
      const s3Client = new S3Client({
        region: config.region || 'eu-central-1',
        credentials: {
          accessKeyId: accessKey,
          secretAccessKey: secretKey
        }
      });

      // Get all tenant allocations
      const allocations = await db
        .select()
        .from(tenantStorageAllocations)
        .where(eq(tenantStorageAllocations.brandTenantId, user.brandTenantId));

      const syncResults: { tenantId: string; usedBytes: number; objectCount: number; success: boolean }[] = [];

      // For each tenant, calculate their S3 usage
      for (const allocation of allocations) {
        try {
          let totalSize = 0;
          let objectCount = 0;
          let continuationToken: string | undefined;

          do {
            const response = await s3Client.send(new ListObjectsV2Command({
              Bucket: config.bucketName!,
              Prefix: `tenants/${allocation.tenantId}/`,
              ContinuationToken: continuationToken
            }));

            if (response.Contents) {
              for (const obj of response.Contents) {
                totalSize += obj.Size || 0;
                objectCount++;
              }
            }

            continuationToken = response.NextContinuationToken;
          } while (continuationToken);

          // Update allocation with actual usage
          await db
            .update(tenantStorageAllocations)
            .set({
              usedBytes: totalSize,
              objectCount: objectCount,
              updatedAt: new Date()
            })
            .where(eq(tenantStorageAllocations.id, allocation.id));

          syncResults.push({
            tenantId: allocation.tenantId,
            usedBytes: totalSize,
            objectCount,
            success: true
          });
        } catch (tenantError) {
          console.error(`❌ Error syncing tenant ${allocation.tenantId}:`, tenantError);
          syncResults.push({
            tenantId: allocation.tenantId,
            usedBytes: 0,
            objectCount: 0,
            success: false
          });
        }
      }

      res.json({
        success: true,
        message: "Storage usage synchronized from S3",
        data: syncResults
      });
    } catch (error) {
      console.error("❌ Error syncing storage usage:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to sync storage usage"
      });
    }
  });

  // Get brand assets
  app.get("/brand-api/storage/assets", async (req, res) => {
    const user = (req as any).user;
    const { category } = req.query;

    try {
      const { db } = await import("../db/index.js");
      const { brandAssets } = await import("../db/schema/brand-interface.js");
      const { eq, and } = await import("drizzle-orm");

      let query = db
        .select()
        .from(brandAssets)
        .where(
          category 
            ? and(
                eq(brandAssets.brandTenantId, user.brandTenantId),
                eq(brandAssets.category, category as string)
              )
            : eq(brandAssets.brandTenantId, user.brandTenantId)
        );

      const assets = await query;

      res.json({
        success: true,
        data: assets
      });
    } catch (error) {
      console.error("❌ Error fetching assets:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch assets"
      });
    }
  });

  // Create brand asset
  app.post("/brand-api/storage/assets", async (req, res) => {
    const user = (req as any).user;
    const { name, description, objectKey, mimeType, sizeBytes, category, tags } = req.body;

    try {
      const { db } = await import("../db/index.js");
      const { brandAssets } = await import("../db/schema/brand-interface.js");

      if (!name || !objectKey) {
        return res.status(400).json({
          success: false,
          error: "name and objectKey are required"
        });
      }

      const result = await db
        .insert(brandAssets)
        .values({
          name,
          description,
          objectKey,
          mimeType,
          sizeBytes: sizeBytes || 0,
          category,
          tags,
          createdBy: user.email,
          brandTenantId: user.brandTenantId
        })
        .returning();

      res.json({
        success: true,
        data: result[0]
      });
    } catch (error) {
      console.error("❌ Error creating asset:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to create asset"
      });
    }
  });

  // Delete brand asset
  app.delete("/brand-api/storage/assets/:assetId", async (req, res) => {
    const user = (req as any).user;
    const { assetId } = req.params;

    try {
      const { db } = await import("../db/index.js");
      const { brandAssets, storageGlobalConfig } = await import("../db/schema/brand-interface.js");
      const { eq, and } = await import("drizzle-orm");

      // Get asset first
      const assets = await db
        .select()
        .from(brandAssets)
        .where(
          and(
            eq(brandAssets.id, assetId),
            eq(brandAssets.brandTenantId, user.brandTenantId)
          )
        )
        .limit(1);

      if (assets.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Asset not found"
        });
      }

      const asset = assets[0];

      // Try to delete from S3 if configured
      const configs = await db
        .select()
        .from(storageGlobalConfig)
        .where(eq(storageGlobalConfig.brandTenantId, user.brandTenantId))
        .limit(1);

      const config = configs[0];
      let s3Deleted = false;

      if (config?.accessKeyEncrypted && config?.secretKeyEncrypted && config.bucketName) {
        try {
          const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
          const crypto = await import("crypto");

          const encryptKey = process.env.STORAGE_ENCRYPTION_KEY;
          if (encryptKey && encryptKey.length >= 32) {
            const decrypt = (encryptedText: string): string => {
              const [ivHex, encrypted] = encryptedText.split(':');
              const iv = Buffer.from(ivHex, 'hex');
              const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptKey.padEnd(32).slice(0, 32)), iv);
              let decrypted = decipher.update(encrypted, 'hex', 'utf8');
              decrypted += decipher.final('utf8');
              return decrypted;
            };

            const accessKey = decrypt(config.accessKeyEncrypted);
            const secretKey = decrypt(config.secretKeyEncrypted);

            const s3Client = new S3Client({
              region: config.region || 'eu-central-1',
              credentials: {
                accessKeyId: accessKey,
                secretAccessKey: secretKey
              }
            });

            await s3Client.send(new DeleteObjectCommand({
              Bucket: config.bucketName,
              Key: asset.objectKey
            }));

            s3Deleted = true;
            console.log(`✅ Deleted asset from S3: ${asset.objectKey}`);
          }
        } catch (s3Error) {
          console.error("❌ S3 delete failed:", s3Error);
        }
      }

      // Delete from database
      await db
        .delete(brandAssets)
        .where(eq(brandAssets.id, assetId));

      res.json({
        success: true,
        message: s3Deleted ? "Asset eliminato da S3 e database" : "Asset eliminato dal database",
        s3Deleted
      });
    } catch (error) {
      console.error("❌ Error deleting asset:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete asset"
      });
    }
  });

  // Upload brand asset with file
  app.post("/brand-api/storage/assets/upload", async (req, res) => {
    try {
      const multer = await import("multer");
      const storage = multer.default.memoryStorage();
      const upload = multer.default({
        storage,
        limits: { fileSize: 50 * 1024 * 1024 } // 50MB
      });

      upload.single("file")(req, res, async (err: any) => {
        if (err) {
          return res.status(400).json({
            success: false,
            error: err.message
          });
        }

        const user = (req as any).user;
        const file = (req as any).file;
        const { name, description, category } = req.body;

        if (!file || !name) {
          return res.status(400).json({
            success: false,
            error: "file and name are required"
          });
        }

        try {
          const { db } = await import("../db/index.js");
          const { brandAssets, storageGlobalConfig } = await import("../db/schema/brand-interface.js");
          const { eq } = await import("drizzle-orm");
          const crypto = await import("crypto");

          // Get storage config
          const configs = await db
            .select()
            .from(storageGlobalConfig)
            .where(eq(storageGlobalConfig.brandTenantId, user.brandTenantId))
            .limit(1);

          const config = configs[0];

          // Generate object key
          const fileId = crypto.randomUUID();
          const ext = file.originalname.split('.').pop() || '';
          const categoryPath = category || 'shared-assets';
          const objectKey = `brand/${categoryPath}/${fileId}.${ext}`;

          // Try to upload to S3 if configured
          let uploadSuccess = false;
          if (config?.accessKeyEncrypted && config?.secretKeyEncrypted) {
            try {
              const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
              const cryptoMod = await import("crypto");
              
              // Decrypt credentials using same method as test-connection
              const encryptKey = process.env.STORAGE_ENCRYPTION_KEY;
              if (!encryptKey || encryptKey.length < 32) {
                throw new Error("STORAGE_ENCRYPTION_KEY not configured");
              }
              const decrypt = (encryptedText: string): string => {
                const [ivHex, encrypted] = encryptedText.split(':');
                const iv = Buffer.from(ivHex, 'hex');
                const decipher = cryptoMod.createDecipheriv('aes-256-cbc', Buffer.from(encryptKey.padEnd(32).slice(0, 32)), iv);
                let decrypted = decipher.update(encrypted, 'hex', 'utf8');
                decrypted += decipher.final('utf8');
                return decrypted;
              };
              
              const accessKey = decrypt(config.accessKeyEncrypted);
              const secretKey = decrypt(config.secretKeyEncrypted);

              const s3Client = new S3Client({
                region: config.region || 'eu-central-1',
                credentials: {
                  accessKeyId: accessKey,
                  secretAccessKey: secretKey
                }
              });

              await s3Client.send(new PutObjectCommand({
                Bucket: config.bucketName || '',
                Key: objectKey,
                Body: file.buffer,
                ContentType: file.mimetype,
                Metadata: {
                  'original-name': file.originalname,
                  'uploaded-by': user.email,
                  'category': categoryPath
                },
                ServerSideEncryption: 'AES256'
              }));

              uploadSuccess = true;
              console.log(`✅ Brand asset uploaded to S3: ${objectKey}`);
            } catch (s3Error) {
              console.error("❌ S3 upload failed:", s3Error);
            }
          }

          // Create asset record in database
          const result = await db
            .insert(brandAssets)
            .values({
              name,
              description,
              objectKey,
              mimeType: file.mimetype,
              sizeBytes: file.size,
              category: categoryPath,
              createdBy: user.email,
              brandTenantId: user.brandTenantId
            })
            .returning();

          res.json({
            success: true,
            data: result[0],
            uploadedToS3: uploadSuccess,
            message: uploadSuccess 
              ? "Asset caricato su S3 con successo"
              : "Asset registrato (S3 non configurato)"
          });
        } catch (dbError) {
          console.error("❌ Database error:", dbError);
          res.status(500).json({
            success: false,
            error: dbError instanceof Error ? dbError.message : "Database error"
          });
        }
      });
    } catch (error) {
      console.error("❌ Error uploading asset:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to upload asset"
      });
    }
  });

  // Push asset to tenants
  app.post("/brand-api/storage/assets/:assetId/push", async (req, res) => {
    const user = (req as any).user;
    const { assetId } = req.params;
    const { tenantIds } = req.body;

    try {
      const { db } = await import("../db/index.js");
      const { brandAssets } = await import("../db/schema/brand-interface.js");
      const { eq, and } = await import("drizzle-orm");

      if (!tenantIds || !Array.isArray(tenantIds) || tenantIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: "tenantIds array is required"
        });
      }

      // Get asset
      const assets = await db
        .select()
        .from(brandAssets)
        .where(
          and(
            eq(brandAssets.id, assetId),
            eq(brandAssets.brandTenantId, user.brandTenantId)
          )
        )
        .limit(1);

      if (assets.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Asset not found"
        });
      }

      // Get storage config for S3 credentials
      const { storageGlobalConfig } = await import("../db/schema/brand-interface.js");
      const configs = await db
        .select()
        .from(storageGlobalConfig)
        .where(eq(storageGlobalConfig.brandTenantId, user.brandTenantId))
        .limit(1);

      const config = configs[0];
      const asset = assets[0];
      const copyResults: { tenantId: string; success: boolean; error?: string }[] = [];

      // Perform S3 copy to each tenant prefix if configured
      if (config?.accessKeyEncrypted && config?.secretKeyEncrypted && config.bucketName) {
        try {
          const { S3Client, CopyObjectCommand, HeadObjectCommand } = await import("@aws-sdk/client-s3");
          const cryptoMod = await import("crypto");
          
          // Decrypt credentials using same method as test-connection
          const encryptKey = process.env.STORAGE_ENCRYPTION_KEY;
          if (!encryptKey || encryptKey.length < 32) {
            throw new Error("STORAGE_ENCRYPTION_KEY not configured");
          }
          const decrypt = (encryptedText: string): string => {
            const [ivHex, encrypted] = encryptedText.split(':');
            const iv = Buffer.from(ivHex, 'hex');
            const decipher = cryptoMod.createDecipheriv('aes-256-cbc', Buffer.from(encryptKey.padEnd(32).slice(0, 32)), iv);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
          };
          
          const accessKey = decrypt(config.accessKeyEncrypted);
          const secretKey = decrypt(config.secretKeyEncrypted);

          const s3Client = new S3Client({
            region: config.region || 'eu-central-1',
            credentials: {
              accessKeyId: accessKey,
              secretAccessKey: secretKey
            }
          });

          // Verify source exists
          try {
            await s3Client.send(new HeadObjectCommand({
              Bucket: config.bucketName,
              Key: asset.objectKey
            }));
          } catch (headError) {
            console.error(`❌ Source object not found: ${asset.objectKey}`);
            return res.status(404).json({
              success: false,
              error: `Source file not found in S3: ${asset.objectKey}`
            });
          }

          // Copy to each tenant prefix
          for (const tenantId of tenantIds) {
            try {
              const fileName = asset.objectKey.split('/').pop() || 'asset';
              const destinationKey = `tenants/${tenantId}/brand-assets/${asset.category || 'shared'}/${fileName}`;
              
              await s3Client.send(new CopyObjectCommand({
                Bucket: config.bucketName,
                CopySource: `${config.bucketName}/${asset.objectKey}`,
                Key: destinationKey,
                MetadataDirective: 'COPY',
                ServerSideEncryption: 'AES256'
              }));

              copyResults.push({ tenantId, success: true });
              console.log(`✅ Asset copied to tenant ${tenantId}: ${destinationKey}`);
            } catch (copyError) {
              copyResults.push({ 
                tenantId, 
                success: false, 
                error: copyError instanceof Error ? copyError.message : 'Copy failed'
              });
              console.error(`❌ Failed to copy to tenant ${tenantId}:`, copyError);
            }
          }
        } catch (s3Error) {
          console.error("❌ S3 client error:", s3Error);
          return res.status(500).json({
            success: false,
            error: "Failed to initialize S3 client"
          });
        }
      } else {
        // No S3 config - just record the push without actual copy
        tenantIds.forEach(tenantId => {
          copyResults.push({ tenantId, success: false, error: 'S3 not configured' });
        });
      }

      // Update pushed tenants in database
      const successfulTenants = copyResults.filter(r => r.success).map(r => r.tenantId);
      const existingPushed = asset.pushedToTenants || [];
      const newPushed = [...new Set([...existingPushed, ...successfulTenants])];

      const result = await db
        .update(brandAssets)
        .set({
          pushedToTenants: newPushed,
          lastPushedAt: successfulTenants.length > 0 ? new Date() : asset.lastPushedAt,
          updatedAt: new Date()
        })
        .where(eq(brandAssets.id, assetId))
        .returning();

      const failedCount = copyResults.filter(r => !r.success).length;
      res.json({
        success: failedCount === 0,
        data: result[0],
        copyResults,
        message: failedCount === 0
          ? `Asset copiato a ${successfulTenants.length} tenant con successo`
          : `Copiato a ${successfulTenants.length} tenant, ${failedCount} falliti`
      });
    } catch (error) {
      console.error("❌ Error pushing asset:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to push asset"
      });
    }
  });

  // ==================== GTM (GOOGLE TAG MANAGER) CONFIGURATION ENDPOINTS ====================
  // Centralized GTM configuration with Mixed RLS pattern
  // tenant_id = NULL → Global container config
  // tenant_id = UUID → Tenant-specific API secrets

  const encryptionService = new EncryptionKeyService();

  // GET global GTM container ID (tenant_id = NULL row)
  app.get("/brand-api/gtm/global", async (req, res) => {
    const user = (req as any).user;

    // Only super_admin can view global GTM config
    if (user.role !== 'super_admin') {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    try {
      const [globalConfig] = await db
        .select()
        .from(tenantGtmConfig)
        .where(isNull(tenantGtmConfig.tenantId))
        .limit(1);

      res.json({
        success: true,
        data: globalConfig ? {
          id: globalConfig.id,
          containerId: globalConfig.containerId,
          isActive: globalConfig.isActive,
          createdAt: globalConfig.createdAt,
          updatedAt: globalConfig.updatedAt
        } : null
      });
    } catch (error) {
      console.error("Error fetching global GTM config:", error);
      res.status(500).json({ error: "Failed to fetch GTM configuration" });
    }
  });

  // POST/PUT global GTM container ID
  app.put("/brand-api/gtm/global", async (req, res) => {
    const user = (req as any).user;
    const { containerId } = req.body;

    // Only super_admin can update global GTM config
    if (user.role !== 'super_admin') {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    if (!containerId) {
      return res.status(400).json({ error: "Container ID is required (format: GTM-XXXXXXX)" });
    }

    // Validate GTM container ID format
    if (!/^GTM-[A-Z0-9]+$/.test(containerId)) {
      return res.status(400).json({ error: "Invalid GTM Container ID format. Expected: GTM-XXXXXXX" });
    }

    try {
      // Check if global config exists
      const [existing] = await db
        .select()
        .from(tenantGtmConfig)
        .where(isNull(tenantGtmConfig.tenantId))
        .limit(1);

      let result;
      if (existing) {
        // Update existing
        [result] = await db
          .update(tenantGtmConfig)
          .set({ 
            containerId, 
            updatedAt: new Date() 
          })
          .where(eq(tenantGtmConfig.id, existing.id))
          .returning();
      } else {
        // Create new global config
        [result] = await db
          .insert(tenantGtmConfig)
          .values({
            tenantId: null,
            containerId,
            isActive: true
          })
          .returning();
      }

      res.json({
        success: true,
        data: {
          id: result.id,
          containerId: result.containerId,
          isActive: result.isActive
        },
        message: "GTM Container ID salvato con successo"
      });
    } catch (error) {
      console.error("Error saving global GTM config:", error);
      res.status(500).json({ error: "Failed to save GTM configuration" });
    }
  });

  // GET all tenant GTM configs (for admin overview)
  app.get("/brand-api/gtm/tenants", async (req, res) => {
    const user = (req as any).user;

    // Only super_admin can view all tenant configs
    if (user.role !== 'super_admin') {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    try {
      // Get all tenant configs with tenant info
      const configs = await db
        .select({
          id: tenantGtmConfig.id,
          tenantId: tenantGtmConfig.tenantId,
          ga4MeasurementId: tenantGtmConfig.ga4MeasurementId,
          hasApiSecret: sql<boolean>`${tenantGtmConfig.ga4ApiSecretEncrypted} IS NOT NULL`,
          isActive: tenantGtmConfig.isActive,
          createdAt: tenantGtmConfig.createdAt,
          updatedAt: tenantGtmConfig.updatedAt,
          tenantName: tenants.name,
          tenantSlug: tenants.slug
        })
        .from(tenantGtmConfig)
        .leftJoin(tenants, eq(tenantGtmConfig.tenantId, tenants.id))
        .where(sql`${tenantGtmConfig.tenantId} IS NOT NULL`);

      res.json({
        success: true,
        data: configs
      });
    } catch (error) {
      console.error("Error fetching tenant GTM configs:", error);
      res.status(500).json({ error: "Failed to fetch tenant configurations" });
    }
  });

  // GET specific tenant GTM config
  app.get("/brand-api/gtm/tenants/:tenantId", async (req, res) => {
    const user = (req as any).user;
    const { tenantId } = req.params;

    // Only super_admin can view tenant configs
    if (user.role !== 'super_admin') {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    try {
      const [config] = await db
        .select()
        .from(tenantGtmConfig)
        .where(eq(tenantGtmConfig.tenantId, tenantId))
        .limit(1);

      res.json({
        success: true,
        data: config ? {
          id: config.id,
          tenantId: config.tenantId,
          ga4MeasurementId: config.ga4MeasurementId,
          hasApiSecret: !!config.ga4ApiSecretEncrypted,
          isActive: config.isActive,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt
        } : null
      });
    } catch (error) {
      console.error("Error fetching tenant GTM config:", error);
      res.status(500).json({ error: "Failed to fetch tenant configuration" });
    }
  });

  // PUT tenant GTM config (create or update)
  app.put("/brand-api/gtm/tenants/:tenantId", async (req, res) => {
    const user = (req as any).user;
    const { tenantId } = req.params;
    const { ga4MeasurementId, ga4ApiSecret, isActive } = req.body;

    // Only super_admin can update tenant configs
    if (user.role !== 'super_admin') {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    try {
      // Check if tenant exists
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);

      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      // Encrypt API secret if provided
      let encryptedSecret: string | undefined;
      if (ga4ApiSecret) {
        encryptedSecret = await encryptionService.encrypt(ga4ApiSecret, tenantId);
      }

      // Check if config exists
      const [existing] = await db
        .select()
        .from(tenantGtmConfig)
        .where(eq(tenantGtmConfig.tenantId, tenantId))
        .limit(1);

      let result;
      if (existing) {
        // Update existing
        const updateData: any = { 
          updatedAt: new Date() 
        };
        if (ga4MeasurementId !== undefined) updateData.ga4MeasurementId = ga4MeasurementId;
        if (encryptedSecret) updateData.ga4ApiSecretEncrypted = encryptedSecret;
        if (isActive !== undefined) updateData.isActive = isActive;

        [result] = await db
          .update(tenantGtmConfig)
          .set(updateData)
          .where(eq(tenantGtmConfig.id, existing.id))
          .returning();
      } else {
        // Create new tenant config
        [result] = await db
          .insert(tenantGtmConfig)
          .values({
            tenantId,
            ga4MeasurementId: ga4MeasurementId || null,
            ga4ApiSecretEncrypted: encryptedSecret || null,
            isActive: isActive !== undefined ? isActive : true
          })
          .returning();
      }

      res.json({
        success: true,
        data: {
          id: result.id,
          tenantId: result.tenantId,
          ga4MeasurementId: result.ga4MeasurementId,
          hasApiSecret: !!result.ga4ApiSecretEncrypted,
          isActive: result.isActive
        },
        message: `Configurazione GTM salvata per ${tenant.name}`
      });
    } catch (error) {
      console.error("Error saving tenant GTM config:", error);
      res.status(500).json({ error: "Failed to save tenant configuration" });
    }
  });

  // DELETE tenant GTM config
  app.delete("/brand-api/gtm/tenants/:tenantId", async (req, res) => {
    const user = (req as any).user;
    const { tenantId } = req.params;

    // Only super_admin can delete tenant configs
    if (user.role !== 'super_admin') {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    try {
      const deleted = await db
        .delete(tenantGtmConfig)
        .where(eq(tenantGtmConfig.tenantId, tenantId))
        .returning();

      if (deleted.length === 0) {
        return res.status(404).json({ error: "Configuration not found" });
      }

      res.json({
        success: true,
        message: "Configurazione GTM eliminata"
      });
    } catch (error) {
      console.error("Error deleting tenant GTM config:", error);
      res.status(500).json({ error: "Failed to delete configuration" });
    }
  });

  // POST test tenant GTM connection (validates API Secret with GA4)
  app.post("/brand-api/gtm/tenants/:tenantId/test", async (req, res) => {
    const user = (req as any).user;
    const { tenantId } = req.params;

    // Only super_admin can test connections
    if (user.role !== 'super_admin') {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    try {
      // Get tenant config with encrypted secret
      const [config] = await db
        .select()
        .from(tenantGtmConfig)
        .where(eq(tenantGtmConfig.tenantId, tenantId))
        .limit(1);

      if (!config) {
        return res.json({
          success: false,
          message: "Nessuna configurazione trovata per questo tenant"
        });
      }

      if (!config.ga4MeasurementId || !config.ga4ApiSecretEncrypted) {
        return res.json({
          success: false,
          message: "Measurement ID o API Secret mancanti"
        });
      }

      // Decrypt API secret
      let apiSecret: string;
      try {
        apiSecret = await encryptionService.decrypt(config.ga4ApiSecretEncrypted, tenantId);
      } catch (decryptError) {
        return res.json({
          success: false,
          message: "Impossibile decifrare l'API Secret. Potrebbe essere necessario riconfigurarlo."
        });
      }

      // Test connection to GA4 Measurement Protocol
      // Send a test event (debug mode) to validate credentials
      const testPayload = {
        client_id: `test_${tenantId.substring(0, 8)}`,
        events: [{
          name: 'gtm_connection_test',
          params: {
            test_timestamp: new Date().toISOString(),
            source: 'brand_interface'
          }
        }]
      };

      // Use debug endpoint for validation (doesn't record real events)
      const debugUrl = `https://www.google-analytics.com/debug/mp/collect?measurement_id=${config.ga4MeasurementId}&api_secret=${apiSecret}`;
      
      const response = await fetch(debugUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });

      const result = await response.json();

      // Check validation result
      if (result.validationMessages && result.validationMessages.length === 0) {
        res.json({
          success: true,
          message: "Connessione GA4 verificata con successo"
        });
      } else {
        const errorMessages = result.validationMessages?.map((m: any) => m.description).join(', ') || 'Errore sconosciuto';
        res.json({
          success: false,
          message: `Validazione fallita: ${errorMessages}`
        });
      }
    } catch (error) {
      console.error("Error testing GTM connection:", error);
      res.status(500).json({ 
        success: false,
        message: "Errore durante il test della connessione" 
      });
    }
  });

  // Crea server HTTP
  const server = http.createServer(app);

  console.log("✅ Brand Interface API routes registered (including Management/Structure endpoints)");
  return server;
}