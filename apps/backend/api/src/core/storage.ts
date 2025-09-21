// Import from W3 Suite schema (tenant-specific)
import {
  users,
  tenants,
  legalEntities,
  stores,
  suppliers,
  supplierOverrides,
  roles,
  userAssignments,
  userStores,
  entityLogs,
  structuredLogs,
  notifications,
  // HR tables
  calendarEvents,
  leaveRequests,
  shifts,
  shiftTemplates,
  timeTracking,
  hrDocuments,
  expenseReports,
  hrAnnouncements,
  employeeBalances,
  // HR Request System
  hrRequests,
  hrRequestApprovals,
  hrRequestComments,
  hrRequestStatusHistory,
  type User,
  type UpsertUser,
  type Tenant,
  type InsertTenant,
  type LegalEntity,
  type InsertLegalEntity,
  type Store,
  type InsertStore,
  type Supplier,
  type InsertSupplier,
  type SupplierOverride,
  type InsertSupplierOverride,
  type UserAssignment,
  type InsertUserAssignment,
  type UserStore,
  type InsertUserStore,
  type Role,
  type InsertRole,
  type EntityLog,
  type InsertEntityLog,
  type StructuredLog,
  type InsertStructuredLog,
  type Notification,
  type InsertNotification,
  // HR types
  type CalendarEvent,
  type LeaveRequest,
  type Shift,
  type ShiftTemplate,
  type TimeTracking,
  type HrDocument,
  type ExpenseReport,
  type HrAnnouncement,
  type EmployeeBalance,
  type InsertCalendarEvent,
  type InsertLeaveRequest,
  type InsertShift,
  type InsertTimeTracking,
  // HR Request System types
  type HrRequest,
  type InsertHrRequest,
  type HrRequestApproval,
  type InsertHrRequestApproval,
  type HrRequestComment,
  type InsertHrRequestComment,
  type HrRequestStatusHistory,
  type InsertHrRequestStatusHistory,
} from "../db/schema/w3suite";

// Import from Public schema (shared reference data)
import {
  commercialAreas,
  channels,
  legalForms,
  countries,
  italianCities,
  paymentMethods,
  type CommercialArea,
  type InsertCommercialArea,
  type LegalForm,
  type Country,
} from "../db/schema/public";
import { db, setTenantContext, withTenantContext } from "./db";
import { eq, and, or, gte, lte, desc, asc, sql, isNull, isNotNull } from "drizzle-orm";
import { CalendarScope, CALENDAR_PERMISSIONS } from "./hr-storage";

// Types for structured logs filtering and pagination
export interface LogFilters {
  level?: string;
  component?: string;
  dateFrom?: string;
  dateTo?: string;
  correlationId?: string;
  userId?: string;
}

export interface Pagination {
  page: number;
  limit: number;
}

export interface LogsResponse {
  logs: StructuredLog[];
  total: number;
}

// Types for notification filtering and pagination
export interface NotificationFilters {
  type?: string;
  priority?: string;
  status?: string;
  targetUserId?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

// Interface for storage operations
// Import HR Storage
import { IHRStorage } from "./hr-storage";

// HR Request System interfaces
export interface HRRequestFilters {
  status?: string;
  category?: string;
  type?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
}

export interface HRRequestListOptions {
  page?: number;
  limit?: number;
  sortBy?: 'created' | 'updated' | 'priority' | 'startDate';
  sortOrder?: 'asc' | 'desc';
}

export interface HRRequestWithDetails extends HrRequest {
  requester?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  currentApprover?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
  comments?: HrRequestComment[];
  approvals?: HrRequestApproval[];
  statusHistory?: HrRequestStatusHistory[];
}

export interface IStorage extends IHRStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUsersByTenant(tenantId: string): Promise<User[]>;
  
  // Tenant Management
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, tenant: Partial<InsertTenant>): Promise<Tenant | undefined>;
  
  // Legal Entity Management
  getLegalEntitiesByTenant(tenantId: string): Promise<LegalEntity[]>;
  createLegalEntity(legalEntity: InsertLegalEntity): Promise<LegalEntity>;
  updateLegalEntity(id: string, legalEntity: Partial<InsertLegalEntity>): Promise<LegalEntity>;
  deleteLegalEntity(legalEntityId: string, tenantId: string): Promise<void>;
  
  // Role Management
  getRolesByTenant(tenantId: string): Promise<Role[]>;
  createRole(role: InsertRole): Promise<Role>;
  
  // Store Management
  getStoresByTenant(tenantId: string): Promise<Store[]>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: string, store: Partial<InsertStore>): Promise<Store>;
  deleteStore(id: string): Promise<void>;
  
  // Supplier Management (Brand Base + Tenant Override Pattern)
  getSuppliersByTenant(tenantId: string): Promise<Array<SupplierOverride & { country?: Country; city_name?: string; payment_method?: any }>>;
  createTenantSupplier(supplier: InsertSupplierOverride): Promise<SupplierOverride>;
  updateTenantSupplier(id: string, supplier: Partial<InsertSupplierOverride>): Promise<SupplierOverride>;
  deleteTenantSupplier(id: string, tenantId: string): Promise<void>;
  
  // User Assignment Management
  getUserAssignments(userId: string): Promise<UserAssignment[]>;
  getUserTenantAssignments(userId: string, tenantId: string): Promise<UserAssignment[]>;
  createUserAssignment(userAssignment: InsertUserAssignment): Promise<UserAssignment>;
  
  // User-Store Relationship Management
  getUserStores(userId: string): Promise<UserStore[]>;
  addUserStore(userStore: InsertUserStore): Promise<UserStore>;
  removeUserStore(userId: string, storeId: string): Promise<void>;
  setPrimaryStore(userId: string, storeId: string): Promise<void>;
  getUsersByStore(storeId: string, tenantId: string): Promise<any[]>;
  
  // Reference Data Management
  getLegalForms(): Promise<LegalForm[]>;
  getCountries(): Promise<Country[]>;
  getItalianCities(): Promise<Array<{ id: string; name: string; province: string; region: string; active: boolean }>>;
  getCommercialAreas(): Promise<CommercialArea[]>;
  createCommercialArea(areaData: InsertCommercialArea): Promise<CommercialArea>;
  
  // Entity Logs Management
  logEntityChange(log: InsertEntityLog): Promise<EntityLog>;
  getEntityLogs(tenantId: string, entityType?: string, entityId?: string): Promise<EntityLog[]>;
  
  // Structured Logs Management
  getStructuredLogs(tenantId: string, filters: LogFilters, pagination: Pagination): Promise<LogsResponse>;
  createStructuredLog(log: InsertStructuredLog): Promise<StructuredLog>;

  // Notification Management
  getNotificationsByTenant(tenantId: string, userId?: string, filters?: NotificationFilters, pagination?: Pagination): Promise<NotificationsResponse>;
  getUnreadNotificationCount(tenantId: string, userId?: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(notificationId: string, tenantId: string): Promise<Notification | undefined>;
  markNotificationUnread(notificationId: string, tenantId: string): Promise<Notification | undefined>;
  bulkMarkNotificationsRead(notificationIds: string[], tenantId: string): Promise<number>;
  deleteNotification(notificationId: string, tenantId: string): Promise<void>;
  deleteExpiredNotifications(tenantId: string): Promise<number>;
  
  // HR Request System Management
  createRequest(data: InsertHrRequest): Promise<HrRequest>;
  getMyRequests(tenantId: string, requesterId: string, filters?: HRRequestFilters, options?: HRRequestListOptions): Promise<{ requests: HrRequest[], total: number }>;
  getPendingApprovals(tenantId: string, approverId: string): Promise<HrRequest[]>;
  getRequestById(tenantId: string, requestId: string): Promise<HRRequestWithDetails | null>;
  addComment(tenantId: string, requestId: string, authorId: string, comment: string, isInternal?: boolean): Promise<HrRequestComment>;
  transitionStatus(requestId: string, newStatus: string, changedBy: string, reason?: string): Promise<HrRequest>;
  listRequests(tenantId: string, filters?: HRRequestFilters, options?: HRRequestListOptions): Promise<{ requests: HrRequest[], total: number }>;
  approveRequest(tenantId: string, requestId: string, approverId: string, comment?: string): Promise<HrRequest>;
  rejectRequest(tenantId: string, requestId: string, approverId: string, reason: string): Promise<HrRequest>;
  cancelRequest(tenantId: string, requestId: string, requesterId: string, reason?: string): Promise<HrRequest>;
  
  // Manager-specific methods
  getRequestsForManager(tenantId: string, managerId: string, filters?: HRRequestFilters, options?: HRRequestListOptions): Promise<{ requests: HrRequest[], total: number }>;
  getManagerTeamRequests(tenantId: string, managerId: string, filters?: HRRequestFilters, options?: HRRequestListOptions): Promise<{ requests: HrRequest[], total: number }>;
  getManagerApprovalHistory(tenantId: string, managerId: string, filters?: { startDate?: string; endDate?: string; limit?: number }): Promise<any[]>;
  
  // Comment and history methods
  getRequestComments(tenantId: string, requestId: string): Promise<HrRequestComment[]>;
  getRequestHistory(tenantId: string, requestId: string): Promise<HrRequestStatusHistory[]>;
  
  // Manager statistics methods
  getManagerPendingCount(tenantId: string, managerId: string): Promise<number>;
  getManagerUrgentCount(tenantId: string, managerId: string): Promise<number>;
  getManagerApprovedTodayCount(tenantId: string, managerId: string): Promise<number>;
  getManagerRejectedTodayCount(tenantId: string, managerId: string): Promise<number>;
  getManagerAvgResponseTime(tenantId: string, managerId: string): Promise<number>;
  getManagerTeamRequestsCount(tenantId: string, managerId: string): Promise<number>;
}

// Database is always enabled - no mock data bypass
const isDbDisabled = false;

export class DatabaseStorage implements IStorage {
  // ==================== USER OPERATIONS ====================
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }
  
  async getUsersByTenant(tenantId: string): Promise<User[]> {
    console.log(`[STORAGE-RLS] 🔍 getUsersByTenant: Setting tenant context for ${tenantId}`);
    
    // Always use real database - mock data removed
    
    // PRODUCTION - Ensure tenant context is set for RLS
    await setTenantContext(tenantId);
    
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        isSystemAdmin: users.isSystemAdmin,
        lastLoginAt: users.lastLoginAt,
        tenantId: users.tenantId,
        status: users.status,
        mfaEnabled: users.mfaEnabled,
        role: users.role,
        // Keep legacy storeId for backward compatibility
        storeId: users.storeId,
        phone: users.phone,
        position: users.position,
        department: users.department,
        hireDate: users.hireDate,
        contractType: users.contractType,
        // Legacy store name from users.storeId (deprecated)
        legacy_store_name: stores.nome,
        // New user_stores relationship data
        primary_store_id: userStores.storeId,
        primary_store_name: sql<string>`CASE WHEN ${userStores.isPrimary} = true THEN ${stores.nome} ELSE NULL END`.as('primary_store_name'),
        is_primary_store: userStores.isPrimary,
        // Role information
        role_name: roles.name,
        role_description: roles.description,
      })
      .from(users)
      // Legacy join for backward compatibility
      .leftJoin(stores, eq(users.storeId, stores.id))
      // New user_stores relationship (prioritize primary store)
      .leftJoin(userStores, and(
        eq(users.id, userStores.userId),
        eq(userStores.tenantId, tenantId),
        eq(userStores.isPrimary, true)
      ))
      .leftJoin(userAssignments, eq(users.id, userAssignments.userId))
      .leftJoin(roles, eq(userAssignments.roleId, roles.id))
      .where(eq(users.tenantId, tenantId))
      .orderBy(users.firstName, users.lastName);
    
    console.log(`[STORAGE-RLS] ✅ getUsersByTenant: Found ${result.length} users for tenant ${tenantId}`);
    return result;
  }

  // ==================== TENANT MANAGEMENT ====================

  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    return tenant;
  }

  async createTenant(tenantData: InsertTenant): Promise<Tenant> {
    const [tenant] = await db.insert(tenants).values(tenantData).returning();
    return tenant;
  }

  async updateTenant(id: string, tenantData: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [tenant] = await db
      .update(tenants)
      .set({ ...tenantData, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return tenant;
  }

  // ==================== LEGAL ENTITY MANAGEMENT ====================

  async getLegalEntitiesByTenant(tenantId: string): Promise<LegalEntity[]> {
    console.log(`[STORAGE-RLS] 🔍 getLegalEntitiesByTenant: Setting tenant context for ${tenantId}`);
    
    // Always use real database - no mock data
    
    // PRODUCTION - Ensure tenant context is set for RLS
    await setTenantContext(tenantId);
    
    const result = await db.select().from(legalEntities).where(eq(legalEntities.tenantId, tenantId));
    console.log(`[STORAGE-RLS] ✅ getLegalEntitiesByTenant: Found ${result.length} legal entities for tenant ${tenantId}`);
    return result;
  }

  async createLegalEntity(legalEntityData: InsertLegalEntity): Promise<LegalEntity> {
    const [legalEntity] = await db.insert(legalEntities).values(legalEntityData).returning();
    return legalEntity;
  }

  async updateLegalEntity(id: string, legalEntityData: Partial<InsertLegalEntity>): Promise<LegalEntity> {
    const [legalEntity] = await db
      .update(legalEntities)
      .set({ ...legalEntityData, updatedAt: new Date() })
      .where(eq(legalEntities.id, id))
      .returning();
    
    if (!legalEntity) {
      throw new Error(`Legal entity with id ${id} not found`);
    }
    
    return legalEntity;
  }

  async deleteLegalEntity(legalEntityId: string, tenantId: string): Promise<void> {
    await db.delete(legalEntities)
      .where(and(eq(legalEntities.id, legalEntityId), eq(legalEntities.tenantId, tenantId)));
  }

  // ==================== ROLE MANAGEMENT ====================

  async getRolesByTenant(tenantId: string): Promise<Role[]> {
    console.log(`[STORAGE-RLS] 🔍 getRolesByTenant: Setting tenant context for ${tenantId}`);
    
    // Ensure tenant context is set for RLS
    await setTenantContext(tenantId);
    
    // First check if roles exist for this tenant
    const existingRoles = await db.select().from(roles).where(eq(roles.tenantId, tenantId));
    
    // If no roles exist, initialize default roles
    if (existingRoles.length === 0) {
      const defaultRoles = [
        { name: 'Admin', description: 'Accesso completo', isSystem: true },
        { name: 'Finance', description: 'Gestione finanziaria', isSystem: true },
        { name: 'Direttore', description: 'Supervisione strategica', isSystem: true },
        { name: 'Store Manager', description: 'Gestione punto vendita', isSystem: true },
        { name: 'Store Specialist', description: 'Operazioni quotidiane', isSystem: false },
        { name: 'Student', description: 'Accesso limitato formazione', isSystem: false },
        { name: 'Marketing', description: 'Campagne e comunicazione', isSystem: false },
        { name: 'HR Management', description: 'Gestione risorse umane', isSystem: false },
        { name: 'Custom', description: 'Ruolo personalizzato', isSystem: false }
      ];
      
      const insertedRoles = await Promise.all(
        defaultRoles.map(roleData => 
          db.insert(roles).values({
            tenantId,
            ...roleData
          }).returning()
        )
      );
      
      return insertedRoles.map(([role]) => role);
    }
    
    return existingRoles;
  }

  async createRole(roleData: InsertRole): Promise<Role> {
    const [role] = await db.insert(roles).values(roleData).returning();
    return role;
  }

  // ==================== STORE MANAGEMENT ====================

  async getStoresByTenant(tenantId: string): Promise<Store[]> {
    console.log(`[STORAGE-RLS] 🔍 getStoresByTenant: Setting tenant context for ${tenantId}`);
    
    // Always use real database - no mock data
    
    // PRODUCTION - Ensure tenant context is set for RLS
    await setTenantContext(tenantId);
    
    const result = await db
      .select({
        id: stores.id,
        tenantId: stores.tenantId,
        legalEntityId: stores.legalEntityId,
        code: stores.code,
        nome: stores.nome,
        address: stores.address,
        citta: stores.citta,
        provincia: stores.provincia,
        cap: stores.cap,
        region: stores.region,
        geo: stores.geo,
        phone: stores.phone,
        email: stores.email,
        whatsapp1: stores.whatsapp1,
        whatsapp2: stores.whatsapp2,
        facebook: stores.facebook,
        instagram: stores.instagram,
        tiktok: stores.tiktok,
        googleMapsUrl: stores.googleMapsUrl,
        telegram: stores.telegram,
        // Relazioni con i nomi delle entità correlate
        channelId: stores.channelId,
        channel_name: channels.name,
        commercialAreaId: stores.commercialAreaId,  
        commercial_area_name: commercialAreas.name,
        ragioneSociale_id: stores.legalEntityId,
        ragioneSociale_name: legalEntities.nome,
        status: stores.status,
        openedAt: stores.openedAt,
        closedAt: stores.closedAt,
        billingOverrideId: stores.billingOverrideId,
        archivedAt: stores.archivedAt,
        createdAt: stores.createdAt,
        updatedAt: stores.updatedAt
      })
      .from(stores)
      .leftJoin(commercialAreas, eq(stores.commercialAreaId, commercialAreas.id))
      .leftJoin(channels, eq(stores.channelId, channels.id))
      .leftJoin(legalEntities, eq(stores.legalEntityId, legalEntities.id))
      .where(eq(stores.tenantId, tenantId));
    
    console.log(`[STORAGE-RLS] ✅ getStoresByTenant: Found ${result.length} stores for tenant ${tenantId}`);
    return result;
  }


  async createStore(storeData: InsertStore): Promise<Store> {
    const [store] = await db.insert(stores).values(storeData).returning();
    return store;
  }

  async updateStore(id: string, storeData: Partial<InsertStore>): Promise<Store> {
    const [store] = await db
      .update(stores)
      .set({ ...storeData, updatedAt: new Date() })
      .where(eq(stores.id, id))
      .returning();
    
    if (!store) {
      throw new Error(`Store with id ${id} not found`);
    }
    
    return store;
  }

  async deleteStore(id: string): Promise<void> {
    const result = await db.delete(stores).where(eq(stores.id, id));
    
    if (result.rowCount === 0) {
      throw new Error(`Store with id ${id} not found`);
    }
  }

  // ==================== SUPPLIER OPERATIONS ====================
  // Brand Base + Tenant Override Pattern Implementation
  
  async getSuppliersByTenant(tenantId: string): Promise<Array<SupplierOverride & { country?: Country; city_name?: string; payment_method?: any }>> {
    console.log(`[STORAGE-RLS] 🔍 getSuppliersByTenant: Getting suppliers for tenant ${tenantId}`);
    
    // Set the tenant context for RLS
    await setTenantContext(tenantId);
    
    // CRITICAL FIX: Proper Union Query with Precedence Logic
    // 1. Get brand suppliers (origin='brand', tenantId is NULL)
    // 2. Get tenant suppliers (from supplier_overrides)
    // 3. Apply precedence: tenant suppliers shadow brand suppliers with same code
    
    const brandSuppliersQuery = db
      .select({
        // Identità & Classificazione
        id: suppliers.id,
        origin: suppliers.origin,
        tenantId: suppliers.tenantId,
        externalId: suppliers.externalId,
        code: suppliers.code,
        name: suppliers.name,
        legal_name: suppliers.legalName,
        supplier_type: suppliers.supplierType,
        
        // Dati fiscali
        vat_number: suppliers.vatNumber,
        tax_code: suppliers.taxCode,
        sdi_code: suppliers.sdiCode,
        pec_email: suppliers.pecEmail,
        rea_number: suppliers.reaNumber,
        chamber_of_commerce: suppliers.chamberOfCommerce,
        
        // Indirizzo
        registered_address: suppliers.registeredAddress,
        city_id: suppliers.cityId,
        country_id: suppliers.countryId,
        
        // Relazioni con nomi delle entità correlate
        country: {
          id: countries.id,
          name: countries.name,
          code: countries.code
        },
        city_name: italianCities.name,
        payment_method: {
          id: paymentMethods.id,
          name: paymentMethods.name,
          code: paymentMethods.code
        },
        
        // Pagamenti
        preferred_payment_method_id: suppliers.preferredPaymentMethodId,
        payment_terms: suppliers.paymentTerms,
        currency: suppliers.currency,
        
        // Controllo & Stato
        status: suppliers.status,
        locked_fields: suppliers.lockedFields,
        
        // Metadati
        created_by: suppliers.createdBy,
        updated_by: suppliers.updatedBy,
        created_at: suppliers.createdAt,
        updated_at: suppliers.updatedAt,
        notes: suppliers.notes
      })
      .from(suppliers)
      .leftJoin(countries, eq(suppliers.countryId, countries.id))
      .leftJoin(italianCities, eq(suppliers.cityId, italianCities.id))
      .leftJoin(paymentMethods, eq(suppliers.preferredPaymentMethodId, paymentMethods.id))
      .where(
        and(
          eq(suppliers.origin, 'brand'), // Only brand suppliers
          isNull(suppliers.tenantId) // Brand suppliers have NULL tenantId
        )
      );
    
    const tenantSuppliersQuery = db
      .select({
        // Identità & Classificazione
        id: supplierOverrides.id,
        origin: supplierOverrides.origin,
        tenantId: supplierOverrides.tenantId,
        externalId: supplierOverrides.externalId,
        code: supplierOverrides.code,
        name: supplierOverrides.name,
        legal_name: supplierOverrides.legalName,
        supplier_type: supplierOverrides.supplierType,
        
        // Dati fiscali
        vat_number: supplierOverrides.vatNumber,
        tax_code: supplierOverrides.taxCode,
        sdi_code: supplierOverrides.sdiCode,
        pec_email: supplierOverrides.pecEmail,
        rea_number: supplierOverrides.reaNumber,
        chamber_of_commerce: supplierOverrides.chamberOfCommerce,
        
        // Indirizzo
        registered_address: supplierOverrides.registeredAddress,
        city_id: supplierOverrides.cityId,
        country_id: supplierOverrides.countryId,
        
        // Relazioni con nomi delle entità correlate
        country: {
          id: countries.id,
          name: countries.name,
          code: countries.code
        },
        city_name: italianCities.name,
        payment_method: {
          id: paymentMethods.id,
          name: paymentMethods.name,
          code: paymentMethods.code
        },
        
        // Pagamenti
        preferred_payment_method_id: supplierOverrides.preferredPaymentMethodId,
        payment_terms: supplierOverrides.paymentTerms,
        currency: supplierOverrides.currency,
        
        // Controllo & Stato
        status: supplierOverrides.status,
        locked_fields: supplierOverrides.lockedFields,
        
        // Metadati
        created_by: supplierOverrides.createdBy,
        updated_by: supplierOverrides.updatedBy,
        created_at: supplierOverrides.createdAt,
        updated_at: supplierOverrides.updatedAt,
        notes: supplierOverrides.notes
      })
      .from(supplierOverrides)
      .leftJoin(countries, eq(supplierOverrides.countryId, countries.id))
      .leftJoin(italianCities, eq(supplierOverrides.cityId, italianCities.id))
      .leftJoin(paymentMethods, eq(supplierOverrides.preferredPaymentMethodId, paymentMethods.id))
      .where(
        and(
          eq(supplierOverrides.origin, 'tenant'), // Only tenant suppliers
          eq(supplierOverrides.tenantId, tenantId) // For this specific tenant
        )
      );
    
    // Execute both queries
    const [brandSuppliers, tenantSuppliers] = await Promise.all([
      brandSuppliersQuery,
      tenantSuppliersQuery
    ]);
    
    // Apply precedence logic: tenant suppliers override brand suppliers with same code
    const tenantSupplierCodes = new Set(tenantSuppliers.map(s => s.code));
    const filteredBrandSuppliers = brandSuppliers.filter(supplier => 
      !tenantSupplierCodes.has(supplier.code)
    );
    
    // Combine with precedence: tenant suppliers first, then non-overridden brand suppliers
    const result = [...tenantSuppliers, ...filteredBrandSuppliers]
      .sort((a, b) => {
        // Sort by origin (tenant first), then by name
        if (a.origin !== b.origin) {
          return a.origin === 'tenant' ? -1 : 1;
        }
        return (a.name || '').localeCompare(b.name || '');
      });
    
    console.log(`[STORAGE-RLS] ✅ getSuppliersByTenant: Found ${result.length} suppliers for tenant ${tenantId} (${tenantSuppliers.length} tenant, ${filteredBrandSuppliers.length} brand)`);
    return result;
  }

  async createTenantSupplier(supplierData: InsertSupplierOverride): Promise<SupplierOverride> {
    console.log(`[STORAGE-SECURITY] 🔒 createTenantSupplier: Creating tenant supplier for tenant ${supplierData.tenantId}`);
    
    // SECURITY: Ensure we're writing to the correct table (supplier_overrides)
    // NEVER allow writing to the brand suppliers table from tenant API
    await setTenantContext(supplierData.tenantId!);
    
    const [supplier] = await db.insert(supplierOverrides).values({
      ...supplierData,
      origin: 'tenant', // Force tenant origin
      tenantId: supplierData.tenantId // Ensure tenantId is set
    }).returning();
    
    console.log(`[STORAGE-SECURITY] ✅ createTenantSupplier: Created tenant supplier ${supplier.id} with code ${supplier.code}`);
    return supplier;
  }

  async updateTenantSupplier(id: string, supplierData: Partial<InsertSupplierOverride>): Promise<SupplierOverride> {
    console.log(`[STORAGE-SECURITY] 🔒 updateTenantSupplier: Updating tenant supplier ${id}`);
    
    // SECURITY: Only allow updating tenant suppliers, never brand suppliers
    // CRITICAL: Ensure we cannot update brand suppliers through this method
    const [supplier] = await db
      .update(supplierOverrides)
      .set({ 
        ...supplierData, 
        updatedAt: new Date(),
        origin: 'tenant' // Prevent origin change
      })
      .where(
        and(
          eq(supplierOverrides.id, id),
          eq(supplierOverrides.origin, 'tenant') // SECURITY: Only tenant suppliers
        )
      )
      .returning();
    
    if (!supplier) {
      throw new Error(`Tenant supplier with id ${id} not found or access denied`);
    }
    
    console.log(`[STORAGE-SECURITY] ✅ updateTenantSupplier: Updated tenant supplier ${supplier.id}`);
    return supplier;
  }

  async deleteTenantSupplier(id: string, tenantId: string): Promise<void> {
    console.log(`[STORAGE-SECURITY] 🔒 deleteTenantSupplier: Deleting tenant supplier ${id} for tenant ${tenantId}`);
    
    // SECURITY: Only tenant-specific suppliers from supplier_overrides can be deleted
    // CRITICAL: Brand suppliers CANNOT be deleted through this method
    await setTenantContext(tenantId);
    
    const result = await db
      .delete(supplierOverrides)
      .where(and(
        eq(supplierOverrides.id, id),
        eq(supplierOverrides.tenantId, tenantId),
        eq(supplierOverrides.origin, 'tenant') // SECURITY: Only tenant suppliers
      ));
    
    if (result.rowCount === 0) {
      throw new Error(`Tenant supplier with id ${id} not found or access denied for tenant ${tenantId}`);
    }
    
    console.log(`[STORAGE-SECURITY] ✅ deleteTenantSupplier: Deleted tenant supplier ${id}`);
  }

  // ==================== USER ASSIGNMENT MANAGEMENT ====================

  async getUserAssignments(userId: string): Promise<UserAssignment[]> {
    return await db.select().from(userAssignments).where(eq(userAssignments.userId, userId));
  }

  async getUserTenantAssignments(userId: string, tenantId: string): Promise<UserAssignment[]> {
    // Get assignments for tenant scope
    return await db
      .select()
      .from(userAssignments)
      .where(and(
        eq(userAssignments.userId, userId),
        eq(userAssignments.scopeType, 'tenant')
      ));
  }

  async createUserAssignment(userAssignmentData: InsertUserAssignment): Promise<UserAssignment> {
    const [userAssignment] = await db.insert(userAssignments).values(userAssignmentData).returning();
    return userAssignment;
  }

  // ==================== USER-STORE RELATIONSHIP MANAGEMENT ====================

  async getUserStores(userId: string): Promise<UserStore[]> {
    console.log(`[STORAGE-RLS] 🔍 getUserStores: Getting stores for user ${userId}`);
    
    const result = await db
      .select()
      .from(userStores)
      .where(eq(userStores.userId, userId))
      .orderBy(userStores.isPrimary, userStores.createdAt);
    
    console.log(`[STORAGE-RLS] ✅ getUserStores: Found ${result.length} store associations for user ${userId}`);
    return result;
  }

  async addUserStore(userStoreData: InsertUserStore): Promise<UserStore> {
    console.log(`[STORAGE-RLS] 🔍 addUserStore: Adding store ${userStoreData.storeId} to user ${userStoreData.userId}`);
    
    // If this is set as primary, unset any existing primary store for this user
    if (userStoreData.isPrimary) {
      await db
        .update(userStores)
        .set({ isPrimary: false })
        .where(and(
          eq(userStores.userId, userStoreData.userId),
          eq(userStores.tenantId, userStoreData.tenantId)
        ));
    }
    
    const [userStore] = await db
      .insert(userStores)
      .values(userStoreData)
      .onConflictDoUpdate({
        target: [userStores.userId, userStores.storeId],
        set: {
          isPrimary: userStoreData.isPrimary,
        },
      })
      .returning();
    
    console.log(`[STORAGE-RLS] ✅ addUserStore: Added store association for user ${userStoreData.userId}`);
    return userStore;
  }

  async removeUserStore(userId: string, storeId: string): Promise<void> {
    console.log(`[STORAGE-RLS] 🔍 removeUserStore: Removing store ${storeId} from user ${userId}`);
    
    const result = await db
      .delete(userStores)
      .where(and(
        eq(userStores.userId, userId),
        eq(userStores.storeId, storeId)
      ));
    
    if (result.rowCount === 0) {
      throw new Error(`User-store association not found for user ${userId} and store ${storeId}`);
    }
    
    console.log(`[STORAGE-RLS] ✅ removeUserStore: Removed store association for user ${userId}`);
  }

  async setPrimaryStore(userId: string, storeId: string): Promise<void> {
    console.log(`[STORAGE-RLS] 🔍 setPrimaryStore: Setting primary store ${storeId} for user ${userId}`);
    
    // First, get the tenant ID for this user-store combination
    const [userStoreData] = await db
      .select({ tenantId: userStores.tenantId })
      .from(userStores)
      .where(and(
        eq(userStores.userId, userId),
        eq(userStores.storeId, storeId)
      ));
    
    if (!userStoreData) {
      throw new Error(`User-store association not found for user ${userId} and store ${storeId}`);
    }
    
    // Unset all primary stores for this user in this tenant
    await db
      .update(userStores)
      .set({ isPrimary: false })
      .where(and(
        eq(userStores.userId, userId),
        eq(userStores.tenantId, userStoreData.tenantId)
      ));
    
    // Set the specified store as primary
    await db
      .update(userStores)
      .set({ isPrimary: true })
      .where(and(
        eq(userStores.userId, userId),
        eq(userStores.storeId, storeId)
      ));
    
    console.log(`[STORAGE-RLS] ✅ setPrimaryStore: Set primary store for user ${userId}`);
  }

  async getUsersByStore(storeId: string, tenantId: string): Promise<any[]> {
    console.log(`[STORAGE-RLS] 🔍 getUsersByStore: Getting users for store ${storeId}`);
    
    // Ensure tenant context is set for RLS
    await setTenantContext(tenantId);
    
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        isSystemAdmin: users.isSystemAdmin,
        lastLoginAt: users.lastLoginAt,
        tenantId: users.tenantId,
        status: users.status,
        mfaEnabled: users.mfaEnabled,
        role: users.role,
        phone: users.phone,
        position: users.position,
        department: users.department,
        hireDate: users.hireDate,
        contractType: users.contractType,
        isPrimaryStore: userStores.isPrimary,
        userStoreCreatedAt: userStores.createdAt,
      })
      .from(users)
      .innerJoin(userStores, eq(users.id, userStores.userId))
      .where(and(
        eq(userStores.storeId, storeId),
        eq(userStores.tenantId, tenantId)
      ))
      .orderBy(userStores.isPrimary, users.firstName, users.lastName);
    
    console.log(`[STORAGE-RLS] ✅ getUsersByStore: Found ${result.length} users for store ${storeId}`);
    return result;
  }

  // ==================== REFERENCE DATA MANAGEMENT ====================

  async getLegalForms(): Promise<LegalForm[]> {
    return await db.select().from(legalForms).where(eq(legalForms.active, true)).orderBy(legalForms.sortOrder);
  }

  async getCountries(): Promise<Country[]> {
    return await db.select().from(countries).where(eq(countries.active, true)).orderBy(countries.name);
  }

  async getItalianCities(): Promise<Array<{ id: string; name: string; province: string; region: string; active: boolean }>> {
    return await db.select().from(italianCities).where(eq(italianCities.active, true)).orderBy(italianCities.name);
  }

  async getCommercialAreas(): Promise<CommercialArea[]> {
    return await db.select().from(commercialAreas).orderBy(commercialAreas.name);
  }

  async createCommercialArea(areaData: InsertCommercialArea): Promise<CommercialArea> {
    const [area] = await db.insert(commercialAreas).values(areaData).returning();
    return area;
  }

  // ==================== ENTITY LOGS MANAGEMENT ====================

  async logEntityChange(logData: InsertEntityLog): Promise<EntityLog> {
    const [log] = await db.insert(entityLogs).values(logData).returning();
    return log;
  }

  async getEntityLogs(tenantId: string, entityType?: string, entityId?: string): Promise<EntityLog[]> {
    const conditions = [eq(entityLogs.tenantId, tenantId)];
    
    if (entityType) {
      conditions.push(eq(entityLogs.entityType, entityType));
    }
    
    if (entityId) {
      conditions.push(eq(entityLogs.entityId, entityId));
    }
    
    return await db.select()
      .from(entityLogs)
      .where(and(...conditions))
      .orderBy(entityLogs.createdAt);
  }

  // ==================== STRUCTURED LOGS MANAGEMENT ====================

  async getStructuredLogs(tenantId: string, filters: LogFilters, pagination: Pagination): Promise<LogsResponse> {
    console.log(`[STORAGE-RLS] 🔍 getStructuredLogs: Setting tenant context for ${tenantId}`);
    
    // Ensure tenant context is set for RLS
    await setTenantContext(tenantId);
    
    // Build filtering conditions
    const conditions = [eq(structuredLogs.tenantId, tenantId)];
    
    if (filters.level) {
      conditions.push(eq(structuredLogs.level, filters.level));
    }
    
    if (filters.component) {
      conditions.push(eq(structuredLogs.component, filters.component));
    }
    
    if (filters.correlationId) {
      conditions.push(eq(structuredLogs.correlationId, filters.correlationId));
    }
    
    if (filters.userId) {
      conditions.push(eq(structuredLogs.userId, filters.userId));
    }
    
    if (filters.dateFrom) {
      conditions.push(gte(structuredLogs.timestamp, new Date(filters.dateFrom)));
    }
    
    if (filters.dateTo) {
      conditions.push(lte(structuredLogs.timestamp, new Date(filters.dateTo)));
    }
    
    // Count total records for pagination
    const [countResult] = await db
      .select({ count: sql<string>`count(*)::text` })
      .from(structuredLogs)
      .where(and(...conditions));
    
    const total = parseInt(countResult.count, 10);
    
    // Calculate offset
    const offset = (pagination.page - 1) * pagination.limit;
    
    // Get paginated logs
    const logs = await db
      .select()
      .from(structuredLogs)
      .where(and(...conditions))
      .orderBy(desc(structuredLogs.timestamp))
      .limit(pagination.limit)
      .offset(offset);
    
    console.log(`[STORAGE-RLS] ✅ getStructuredLogs: Found ${logs.length} logs (total: ${total}) for tenant ${tenantId}`);
    
    return {
      logs,
      total
    };
  }

  async createStructuredLog(logData: InsertStructuredLog): Promise<StructuredLog> {
    const [log] = await db.insert(structuredLogs).values(logData).returning();
    return log;
  }

  // ==================== NOTIFICATION MANAGEMENT ====================

  async getNotificationsByTenant(
    tenantId: string, 
    userId?: string, 
    filters?: NotificationFilters, 
    pagination?: Pagination
  ): Promise<NotificationsResponse> {
    console.log(`[STORAGE-RLS] 🔔 getNotificationsByTenant: Setting tenant context for ${tenantId}`);
    
    // Ensure tenant context is set for RLS
    await setTenantContext(tenantId);
    
    // Build filtering conditions
    const conditions = [eq(notifications.tenantId, tenantId)];
    
    // User-specific notifications: broadcast or targeted to specific user
    if (userId) {
      const userConditions = [
        eq(notifications.broadcast, true),
        eq(notifications.targetUserId, userId),
        sql`EXISTS(SELECT 1 FROM ${users} WHERE id = ${userId} AND role = ANY(${notifications.targetRoles}))` as any
      ].filter(Boolean);
      
      if (userConditions.length > 0) {
        const userCondition = or(...userConditions);
        if (userCondition) {
          conditions.push(userCondition);
        }
      }
    }
    
    // Apply filters
    if (filters?.type) {
      conditions.push(eq(notifications.type, filters.type as any));
    }
    
    if (filters?.priority) {
      conditions.push(eq(notifications.priority, filters.priority as any));
    }
    
    if (filters?.status) {
      conditions.push(eq(notifications.status, filters.status as any));
    }
    
    if (filters?.targetUserId) {
      conditions.push(eq(notifications.targetUserId, filters.targetUserId));
    }
    
    // Filter out expired notifications
    const expiryConditions = [
      isNull(notifications.expiresAt),
      gte(notifications.expiresAt, new Date())
    ].filter(Boolean);
    
    if (expiryConditions.length > 0) {
      const expiryCondition = or(...expiryConditions);
      if (expiryCondition) {
        conditions.push(expiryCondition);
      }
    }
    
    // Count total and unread records
    const [countResult] = await db
      .select({ 
        total: sql<string>`count(*)::text`,
        unread: sql<string>`count(case when status = 'unread' then 1 end)::text`
      })
      .from(notifications)
      .where(and(...conditions));
    
    const total = parseInt(countResult.total, 10);
    const unreadCount = parseInt(countResult.unread, 10);
    
    // Default pagination
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const offset = (page - 1) * limit;
    
    // Get paginated notifications
    const notificationsList = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
    
    console.log(`[STORAGE-RLS] ✅ getNotificationsByTenant: Found ${notificationsList.length} notifications (total: ${total}, unread: ${unreadCount}) for tenant ${tenantId}`);
    
    return {
      notifications: notificationsList,
      total,
      unreadCount
    };
  }

  async getUnreadNotificationCount(tenantId: string, userId?: string): Promise<number> {
    console.log(`[STORAGE-RLS] 🔔 getUnreadNotificationCount: Setting tenant context for ${tenantId}`);
    
    // Ensure tenant context is set for RLS
    await setTenantContext(tenantId);
    
    const conditions = [
      eq(notifications.tenantId, tenantId),
      eq(notifications.status, 'unread')
    ];
    
    // User-specific notifications: broadcast or targeted to specific user
    if (userId) {
      const userConditions = [
        eq(notifications.broadcast, true),
        eq(notifications.targetUserId, userId),
        sql`EXISTS(SELECT 1 FROM ${users} WHERE id = ${userId} AND role = ANY(${notifications.targetRoles}))` as any
      ].filter(Boolean);
      
      if (userConditions.length > 0) {
        const userCondition = or(...userConditions);
        if (userCondition) {
          conditions.push(userCondition);
        }
      }
    }
    
    // Filter out expired notifications
    const expiryConditions = [
      isNull(notifications.expiresAt),
      gte(notifications.expiresAt, new Date())
    ].filter(Boolean);
    
    if (expiryConditions.length > 0) {
      const expiryCondition = or(...expiryConditions);
      if (expiryCondition) {
        conditions.push(expiryCondition);
      }
    }
    
    const [result] = await db
      .select({ count: sql<string>`count(*)::text` })
      .from(notifications)
      .where(and(...conditions));
    
    const count = parseInt(result.count, 10);
    console.log(`[STORAGE-RLS] ✅ getUnreadNotificationCount: Found ${count} unread notifications for tenant ${tenantId}`);
    
    return count;
  }

  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    console.log(`[STORAGE-RLS] 🔔 createNotification: Creating notification for tenant ${notificationData.tenantId}`);
    
    // Ensure tenant context is set for RLS
    await setTenantContext(notificationData.tenantId);
    
    const [notification] = await db.insert(notifications).values(notificationData).returning();
    
    console.log(`[STORAGE-RLS] ✅ createNotification: Created notification ${notification.id} for tenant ${notificationData.tenantId}`);
    
    return notification;
  }

  async markNotificationRead(notificationId: string, tenantId: string): Promise<Notification | undefined> {
    console.log(`[STORAGE-RLS] 🔔 markNotificationRead: Marking notification ${notificationId} as read for tenant ${tenantId}`);
    
    // Ensure tenant context is set for RLS
    await setTenantContext(tenantId);
    
    const [notification] = await db
      .update(notifications)
      .set({ status: 'read' })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.tenantId, tenantId)
      ))
      .returning();
    
    console.log(`[STORAGE-RLS] ✅ markNotificationRead: ${notification ? 'Successfully marked' : 'Failed to mark'} notification ${notificationId} as read`);
    
    return notification;
  }

  async markNotificationUnread(notificationId: string, tenantId: string): Promise<Notification | undefined> {
    console.log(`[STORAGE-RLS] 🔔 markNotificationUnread: Marking notification ${notificationId} as unread for tenant ${tenantId}`);
    
    // Ensure tenant context is set for RLS
    await setTenantContext(tenantId);
    
    const [notification] = await db
      .update(notifications)
      .set({ status: 'unread' })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.tenantId, tenantId)
      ))
      .returning();
    
    console.log(`[STORAGE-RLS] ✅ markNotificationUnread: ${notification ? 'Successfully marked' : 'Failed to mark'} notification ${notificationId} as unread`);
    
    return notification;
  }

  async bulkMarkNotificationsRead(notificationIds: string[], tenantId: string): Promise<number> {
    console.log(`[STORAGE-RLS] 🔔 bulkMarkNotificationsRead: Marking ${notificationIds.length} notifications as read for tenant ${tenantId}`);
    
    // Ensure tenant context is set for RLS
    await setTenantContext(tenantId);
    
    const result = await db
      .update(notifications)
      .set({ status: 'read' })
      .where(and(
        sql`${notifications.id} = ANY(${notificationIds})`,
        eq(notifications.tenantId, tenantId)
      ));
    
    const updatedCount = result.rowCount || 0;
    console.log(`[STORAGE-RLS] ✅ bulkMarkNotificationsRead: Marked ${updatedCount} notifications as read for tenant ${tenantId}`);
    
    return updatedCount;
  }

  async deleteNotification(notificationId: string, tenantId: string): Promise<void> {
    console.log(`[STORAGE-RLS] 🔔 deleteNotification: Deleting notification ${notificationId} for tenant ${tenantId}`);
    
    // Ensure tenant context is set for RLS
    await setTenantContext(tenantId);
    
    await db
      .delete(notifications)
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.tenantId, tenantId)
      ));
    
    console.log(`[STORAGE-RLS] ✅ deleteNotification: Deleted notification ${notificationId} for tenant ${tenantId}`);
  }

  async deleteExpiredNotifications(tenantId: string): Promise<number> {
    console.log(`[STORAGE-RLS] 🔔 deleteExpiredNotifications: Cleaning up expired notifications for tenant ${tenantId}`);
    
    // Ensure tenant context is set for RLS
    await setTenantContext(tenantId);
    
    const result = await db
      .delete(notifications)
      .where(and(
        eq(notifications.tenantId, tenantId),
        lte(notifications.expiresAt, new Date())
      ));
    
    const deletedCount = result.rowCount || 0;
    console.log(`[STORAGE-RLS] ✅ deleteExpiredNotifications: Cleaned up ${deletedCount} expired notifications for tenant ${tenantId}`);
    
    return deletedCount;
  }

  // ==================== HR CALENDAR OPERATIONS ====================
  
  async getCalendarEvents(
    tenantId: string,
    userId: string,
    userRole: string,
    filters?: any
  ): Promise<CalendarEvent[]> {
    console.log(`[HR] 📅 Getting calendar events for user ${userId} with role ${userRole}`);
    
    await setTenantContext(tenantId);
    
    const conditions = [eq(calendarEvents.tenantId, tenantId)];
    
    // Add visibility filters based on role
    const permissions = (CALENDAR_PERMISSIONS as any)[userRole] || CALENDAR_PERMISSIONS.USER;
    const visibilityConditions = [];
    
    if (permissions.view.includes(CalendarScope.OWN)) {
      visibilityConditions.push(eq(calendarEvents.ownerId, userId));
    }
    if (permissions.view.includes(CalendarScope.STORE) && filters?.storeId) {
      visibilityConditions.push(eq(calendarEvents.storeId, filters.storeId));
    }
    if (permissions.view.includes(CalendarScope.TENANT)) {
      visibilityConditions.push(eq(calendarEvents.visibility, 'tenant'));
    }
    
    if (visibilityConditions.length > 0) {
      conditions.push(or(...visibilityConditions));
    }
    
    // Add date filters if provided
    if (filters?.startDate) {
      conditions.push(gte(calendarEvents.startDate, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      conditions.push(lte(calendarEvents.endDate, new Date(filters.endDate)));
    }
    
    const events = await db
      .select()
      .from(calendarEvents)
      .where(and(...conditions))
      .orderBy(desc(calendarEvents.startDate));
    
    return events;
  }
  
  async getCalendarEventById(id: string, tenantId: string): Promise<CalendarEvent | null> {
    await setTenantContext(tenantId);
    
    const [event] = await db
      .select()
      .from(calendarEvents)
      .where(and(
        eq(calendarEvents.id, id),
        eq(calendarEvents.tenantId, tenantId)
      ));
    
    return event || null;
  }
  
  async createCalendarEvent(data: InsertCalendarEvent): Promise<CalendarEvent> {
    console.log(`[HR] 📅 Creating calendar event for tenant ${data.tenantId}`);
    
    await setTenantContext(data.tenantId);
    
    const [event] = await db
      .insert(calendarEvents)
      .values(data)
      .returning();
    
    return event;
  }
  
  async updateCalendarEvent(id: string, data: Partial<InsertCalendarEvent>, tenantId: string): Promise<CalendarEvent> {
    await setTenantContext(tenantId);
    
    const [event] = await db
      .update(calendarEvents)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(and(
        eq(calendarEvents.id, id),
        eq(calendarEvents.tenantId, tenantId)
      ))
      .returning();
    
    return event;
  }
  
  async deleteCalendarEvent(id: string, tenantId: string): Promise<void> {
    await setTenantContext(tenantId);
    
    await db
      .delete(calendarEvents)
      .where(and(
        eq(calendarEvents.id, id),
        eq(calendarEvents.tenantId, tenantId)
      ));
  }
  
  // ==================== LEAVE REQUESTS ====================
  
  async getLeaveRequests(
    tenantId: string,
    userId: string,
    userRole: string,
    filters?: any
  ): Promise<LeaveRequest[]> {
    await setTenantContext(tenantId);
    
    const conditions = [eq(leaveRequests.tenantId, tenantId)];
    
    // Add visibility filters based on role
    const permissions = (CALENDAR_PERMISSIONS as any)[userRole] || CALENDAR_PERMISSIONS.USER;
    
    if (!permissions.approveLeave) {
      // Non-approvers can only see their own requests
      conditions.push(eq(leaveRequests.userId, userId));
    }
    
    if (filters?.status) {
      conditions.push(eq(leaveRequests.status, filters.status));
    }
    
    const requests = await db
      .select()
      .from(leaveRequests)
      .where(and(...conditions))
      .orderBy(desc(leaveRequests.createdAt));
    
    return requests;
  }
  
  async createLeaveRequest(data: InsertLeaveRequest): Promise<LeaveRequest> {
    await setTenantContext(data.tenantId);
    
    const [request] = await db
      .insert(leaveRequests)
      .values(data)
      .returning();
    
    return request;
  }
  
  async approveLeaveRequest(id: string, approverId: string, comments?: string): Promise<LeaveRequest> {
    const [request] = await db
      .update(leaveRequests)
      .set({
        status: 'approved',
        processedAt: new Date(),
        approvalChain: sql`${leaveRequests.approvalChain} || jsonb_build_array(jsonb_build_object('approverId', ${approverId}, 'status', 'approved', 'timestamp', ${new Date().toISOString()}, 'comments', ${comments || ''}))`
      })
      .where(eq(leaveRequests.id, id))
      .returning();
    
    return request;
  }
  
  async rejectLeaveRequest(id: string, approverId: string, reason: string): Promise<LeaveRequest> {
    const [request] = await db
      .update(leaveRequests)
      .set({
        status: 'rejected',
        processedAt: new Date(),
        approvalChain: sql`${leaveRequests.approvalChain} || jsonb_build_array(jsonb_build_object('approverId', ${approverId}, 'status', 'rejected', 'timestamp', ${new Date().toISOString()}, 'comments', ${reason}))`
      })
      .where(eq(leaveRequests.id, id))
      .returning();
    
    return request;
  }
  
  // ==================== SHIFTS ====================
  
  async getShifts(tenantId: string, storeId: string, dateRange: any): Promise<Shift[]> {
    await setTenantContext(tenantId);
    
    const conditions = [
      eq(shifts.tenantId, tenantId),
      eq(shifts.storeId, storeId)
    ];
    
    if (dateRange?.startDate) {
      conditions.push(gte(shifts.date, dateRange.startDate));
    }
    if (dateRange?.endDate) {
      conditions.push(lte(shifts.date, dateRange.endDate));
    }
    
    return await db
      .select()
      .from(shifts)
      .where(and(...conditions))
      .orderBy(asc(shifts.date));
  }
  
  async createShift(data: InsertShift): Promise<Shift> {
    await setTenantContext(data.tenantId);
    
    const [shift] = await db
      .insert(shifts)
      .values(data)
      .returning();
    
    return shift;
  }
  
  async assignUserToShift(shiftId: string, userId: string): Promise<Shift> {
    const [shift] = await db
      .update(shifts)
      .set({
        assignedUsers: sql`${shifts.assignedUsers} || jsonb_build_array(${userId})`
      })
      .where(eq(shifts.id, shiftId))
      .returning();
    
    return shift;
  }
  
  async removeUserFromShift(shiftId: string, userId: string): Promise<Shift> {
    const [shift] = await db
      .update(shifts)
      .set({
        assignedUsers: sql`${shifts.assignedUsers} - ${userId}`
      })
      .where(eq(shifts.id, shiftId))
      .returning();
    
    return shift;
  }
  
  // ==================== TIME TRACKING ====================
  
  async clockIn(data: InsertTimeTracking): Promise<TimeTracking> {
    await setTenantContext(data.tenantId);
    
    const [entry] = await db
      .insert(timeTracking)
      .values({
        ...data,
        clockIn: new Date(),
        status: 'active'
      })
      .returning();
    
    return entry;
  }
  
  async clockOut(id: string, tenantId: string, notes?: string): Promise<TimeTracking> {
    await setTenantContext(tenantId);
    
    const [entry] = await db
      .update(timeTracking)
      .set({
        clockOut: new Date(),
        status: 'completed',
        notes
      })
      .where(and(
        eq(timeTracking.id, id),
        eq(timeTracking.tenantId, tenantId)
      ))
      .returning();
    
    return entry;
  }
  
  async getActiveTimeTracking(userId: string, tenantId: string): Promise<TimeTracking | null> {
    await setTenantContext(tenantId);
    
    const [entry] = await db
      .select()
      .from(timeTracking)
      .where(and(
        eq(timeTracking.userId, userId),
        eq(timeTracking.tenantId, tenantId),
        eq(timeTracking.status, 'active'),
        isNull(timeTracking.clockOut)
      ));
    
    return entry || null;
  }
  
  async getTimeTrackingHistory(
    userId: string,
    tenantId: string,
    dateRange: any
  ): Promise<TimeTracking[]> {
    await setTenantContext(tenantId);
    
    const conditions = [
      eq(timeTracking.userId, userId),
      eq(timeTracking.tenantId, tenantId)
    ];
    
    if (dateRange?.startDate) {
      conditions.push(gte(timeTracking.clockIn, new Date(dateRange.startDate)));
    }
    if (dateRange?.endDate) {
      conditions.push(lte(timeTracking.clockIn, new Date(dateRange.endDate)));
    }
    
    return await db
      .select()
      .from(timeTracking)
      .where(and(...conditions))
      .orderBy(desc(timeTracking.clockIn));
  }
  
  // ==================== HR REQUEST SYSTEM ====================
  
  // Italian regulatory compliance validation helper
  private validateItalianCompliance(data: InsertHrRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Marriage leave: Must be within 30 days of wedding date
    if (data.type === 'marriage_leave' && data.payload?.weddingDate && data.startDate) {
      const weddingDate = new Date(data.payload.weddingDate);
      const startDate = new Date(data.startDate);
      const daysDiff = Math.abs(startDate.getTime() - weddingDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 30) {
        errors.push('Il congedo matrimoniale deve essere richiesto entro 30 giorni dalla data del matrimonio');
      }
    }
    
    // Law 104: Maximum 3 days per month
    if (data.type === 'law_104_leave' && data.payload?.durationDays) {
      if (data.payload.durationDays > 3) {
        errors.push('La Legge 104 consente massimo 3 giorni al mese');
      }
      if (!data.payload?.medicalDocumentation) {
        errors.push('Documentazione medica richiesta per la Legge 104');
      }
    }
    
    // Study leave: Maximum 150 hours over 3 years (simplified check)
    if (data.type === 'study_leave' && data.payload?.durationHours) {
      if (data.payload.durationHours > 150) {
        errors.push('Il diritto allo studio consente massimo 150 ore in 3 anni');
      }
    }
    
    // Medical documentation required for certain types
    const medicalTypes = ['law_104_leave', 'maternity_leave', 'paternity_leave', 'breastfeeding_leave'];
    if (medicalTypes.includes(data.type) && !data.payload?.medicalDocumentation) {
      errors.push('Documentazione medica richiesta per questo tipo di richiesta');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async createRequest(data: InsertHrRequest): Promise<HrRequest> {
    await setTenantContext(data.tenantId);
    
    // Italian regulatory compliance validation
    const italianTypes = ['marriage_leave', 'maternity_leave', 'paternity_leave', 'parental_leave', 
                         'breastfeeding_leave', 'law_104_leave', 'study_leave', 'rol_leave', 
                         'electoral_leave', 'bereavement_extended'];
    
    if (italianTypes.includes(data.type)) {
      const validation = this.validateItalianCompliance(data);
      if (!validation.isValid) {
        throw new Error(`Italian compliance validation failed: ${validation.errors.join(', ')}`);
      }
    }
    
    const [request] = await db
      .insert(hrRequests)
      .values({
        ...data,
        status: 'draft'
      })
      .returning();
    
    // Log status history - temporarily disabled due to schema mismatch
    // await this.logStatusHistory(request.id, data.tenantId, data.requesterId, null, 'draft', 'Request created');
    
    // Integration Hook: Notify user of request creation with error handling
    try {
      await this.createNotification({
        tenantId: data.tenantId,
        type: 'system',
        priority: 'low',
        title: 'HR Request Created',
        message: `Your ${data.type} request has been created and saved as draft.`,
        targetUserId: data.requesterId,
        metadata: { requestId: request.id, requestType: data.type }
      });
    } catch (error) {
      // Log integration failure but don't break main flow
      console.error(`[INTEGRATION-ERROR] Failed to create notification for request creation:`, error);
    }
    
    return request;
  }
  
  async getMyRequests(tenantId: string, requesterId: string, filters?: HRRequestFilters, options?: HRRequestListOptions): Promise<{ requests: HrRequest[], total: number }> {
    await setTenantContext(tenantId);
    
    const conditions = [
      eq(hrRequests.tenantId, tenantId),
      eq(hrRequests.requesterId, requesterId)
    ];
    
    // Apply filters
    if (filters?.status) {
      conditions.push(eq(hrRequests.status, filters.status as any));
    }
    if (filters?.category) {
      conditions.push(eq(hrRequests.category, filters.category as any));
    }
    if (filters?.type) {
      conditions.push(eq(hrRequests.type, filters.type as any));
    }
    if (filters?.priority) {
      conditions.push(eq(hrRequests.priority, filters.priority));
    }
    if (filters?.startDate) {
      conditions.push(gte(hrRequests.startDate, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      conditions.push(lte(hrRequests.endDate, new Date(filters.endDate)));
    }
    
    // Pagination
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;
    
    // Sort order
    let orderBy;
    switch (options?.sortBy) {
      case 'updated':
        orderBy = options.sortOrder === 'asc' ? asc(hrRequests.updatedAt) : desc(hrRequests.updatedAt);
        break;
      case 'priority':
        orderBy = options.sortOrder === 'asc' ? asc(hrRequests.priority) : desc(hrRequests.priority);
        break;
      case 'startDate':
        orderBy = options.sortOrder === 'asc' ? asc(hrRequests.startDate) : desc(hrRequests.startDate);
        break;
      default:
        orderBy = desc(hrRequests.createdAt);
    }
    
    const [requests, [{ total }]] = await Promise.all([
      db.select()
        .from(hrRequests)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)` })
        .from(hrRequests)
        .where(and(...conditions))
    ]);
    
    return {
      requests,
      total: Number(total)
    };
  }
  
  async getPendingApprovals(tenantId: string, approverId: string): Promise<HrRequest[]> {
    await setTenantContext(tenantId);
    
    return await db
      .select()
      .from(hrRequests)
      .where(and(
        eq(hrRequests.tenantId, tenantId),
        eq(hrRequests.status, 'pending'),
        eq(hrRequests.currentApproverId, approverId)
      ))
      .orderBy(desc(hrRequests.createdAt));
  }
  
  async getRequestById(tenantId: string, requestId: string): Promise<HRRequestWithDetails | null> {
    await setTenantContext(tenantId);
    
    const [request] = await db
      .select({
        // Main request fields
        id: hrRequests.id,
        tenantId: hrRequests.tenantId,
        requesterId: hrRequests.requesterId,
        category: hrRequests.category,
        type: hrRequests.type,
        payload: hrRequests.payload,
        startDate: hrRequests.startDate,
        endDate: hrRequests.endDate,
        status: hrRequests.status,
        currentApproverId: hrRequests.currentApproverId,
        attachments: hrRequests.attachments,
        title: hrRequests.title,
        description: hrRequests.description,
        priority: hrRequests.priority,
        createdAt: hrRequests.createdAt,
        updatedAt: hrRequests.updatedAt,
        // Requester details
        requesterFirstName: users.firstName,
        requesterLastName: users.lastName,
        requesterEmail: users.email,
        // Current approver details
        approverFirstName: sql<string>`approver.first_name`.as('approverFirstName'),
        approverLastName: sql<string>`approver.last_name`.as('approverLastName'),
      })
      .from(hrRequests)
      .leftJoin(users, eq(hrRequests.requesterId, users.id))
      .leftJoin(
        sql`${users} as approver`,
        sql`${hrRequests.currentApproverId} = approver.id`
      )
      .where(and(
        eq(hrRequests.tenantId, tenantId),
        eq(hrRequests.id, requestId)
      ));
    
    if (!request) return null;
    
    // Get comments, approvals, and status history - ALL temporarily disabled due to schema mismatches
    // const [statusHistory] = await Promise.all([
      // this.getRequestComments(tenantId, requestId),  // Temporarily disabled - mentioned_users column missing
      // this.getRequestApprovals(tenantId, requestId),  // Temporarily disabled - level column missing
      // this.getRequestStatusHistory(tenantId, requestId)  // Temporarily disabled - automatic_change column missing
    // ]);
    const comments: any[] = [];  // Empty array for now
    const approvals: any[] = [];  // Empty array for now
    const statusHistory: any[] = [];  // Empty array for now
    
    return {
      ...request,
      requester: request.requesterFirstName ? {
        id: request.requesterId,
        firstName: request.requesterFirstName,
        lastName: request.requesterLastName,
        email: request.requesterEmail
      } : undefined,
      currentApprover: request.approverFirstName ? {
        id: request.currentApproverId!,
        firstName: request.approverFirstName,
        lastName: request.approverLastName
      } : undefined,
      comments,
      approvals,
      statusHistory
    } as HRRequestWithDetails;
  }
  
  async addComment(tenantId: string, requestId: string, authorId: string, comment: string, isInternal?: boolean): Promise<HrRequestComment> {
    await setTenantContext(tenantId);
    
    const [commentRecord] = await db
      .insert(hrRequestComments)
      .values({
        tenantId,
        requestId,
        authorId,
        comment,
        isInternal: isInternal || false
      })
      .returning();
    
    // Update request timestamp
    await db
      .update(hrRequests)
      .set({ updatedAt: new Date() })
      .where(and(
        eq(hrRequests.tenantId, tenantId),
        eq(hrRequests.id, requestId)
      ));
    
    return commentRecord;
  }
  
  async transitionStatus(requestId: string, newStatus: string, changedBy: string, reason?: string): Promise<HrRequest> {
    // Use transaction for atomic operation
    return await db.transaction(async (tx) => {
      const [request] = await tx
        .select()
        .from(hrRequests)
        .where(eq(hrRequests.id, requestId));
      
      if (!request) {
        throw new Error('Request not found');
      }
      
      await setTenantContext(request.tenantId);
      
      const oldStatus = request.status;
      
      // Validate status transition
      if (!this.isValidStatusTransition(oldStatus, newStatus as any)) {
        throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
      }
      
      // Add ownership/approver checks for critical transitions
      await this.validateTransitionAuthority(request, newStatus, changedBy);
      
      // Update request status
      const [updatedRequest] = await tx
        .update(hrRequests)
        .set({
          status: newStatus as any,
          updatedAt: new Date(),
          ...(newStatus === 'approved' && { approvedAt: new Date(), approvedBy: changedBy }),
          ...(newStatus === 'rejected' && { rejectedAt: new Date(), rejectedBy: changedBy })
        })
        .where(eq(hrRequests.id, requestId))
        .returning();
      
      // Log status history in same transaction
      await tx
        .insert(hrRequestStatusHistory)
        .values({
          tenantId: request.tenantId,
          requestId,
          changedBy,
          fromStatus: oldStatus as any,
          toStatus: newStatus as any,
          reason
        });
      
      return updatedRequest;
    });
  }
  
  async listRequests(tenantId: string, filters?: HRRequestFilters, options?: HRRequestListOptions): Promise<{ requests: HrRequest[], total: number }> {
    await setTenantContext(tenantId);
    
    const conditions = [eq(hrRequests.tenantId, tenantId)];
    
    // Apply filters
    if (filters?.status) {
      conditions.push(eq(hrRequests.status, filters.status as any));
    }
    if (filters?.category) {
      conditions.push(eq(hrRequests.category, filters.category as any));
    }
    if (filters?.type) {
      conditions.push(eq(hrRequests.type, filters.type as any));
    }
    if (filters?.priority) {
      conditions.push(eq(hrRequests.priority, filters.priority));
    }
    if (filters?.startDate) {
      conditions.push(gte(hrRequests.startDate, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      conditions.push(lte(hrRequests.endDate, new Date(filters.endDate)));
    }
    
    // Pagination
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;
    
    // Sort order
    let orderBy;
    switch (options?.sortBy) {
      case 'updated':
        orderBy = options.sortOrder === 'asc' ? asc(hrRequests.updatedAt) : desc(hrRequests.updatedAt);
        break;
      case 'priority':
        orderBy = options.sortOrder === 'asc' ? asc(hrRequests.priority) : desc(hrRequests.priority);
        break;
      case 'startDate':
        orderBy = options.sortOrder === 'asc' ? asc(hrRequests.startDate) : desc(hrRequests.startDate);
        break;
      default:
        orderBy = desc(hrRequests.createdAt);
    }
    
    const [requests, [{ total }]] = await Promise.all([
      db.select()
        .from(hrRequests)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      db.select({ total: sql<number>`count(*)` })
        .from(hrRequests)
        .where(and(...conditions))
    ]);
    
    return {
      requests,
      total: Number(total)
    };
  }
  
  async approveRequest(tenantId: string, requestId: string, approverId: string, comment?: string): Promise<HrRequest> {
    await setTenantContext(tenantId);
    
    // Record approval
    await db
      .insert(hrRequestApprovals)
      .values({
        tenantId,
        requestId,
        approverId,
        action: 'approved',
        comment
      });
    
    // Update request status
    const updatedRequest = await this.transitionStatus(requestId, 'approved', approverId, comment);
    
    // Create notification for requester
    const [request] = await db
      .select({ requesterId: hrRequests.requesterId, type: hrRequests.type })
      .from(hrRequests)
      .where(eq(hrRequests.id, requestId));
    
    if (request) {
      await this.createNotification({
        tenantId,
        type: 'system',
        priority: 'medium',
        title: 'Request Approved',
        message: `Your ${request.type} request has been approved.`,
        targetUserId: request.requesterId,
        metadata: { requestId, approverId }
      });
      
      // For leave requests, create calendar event
      if (request.type === 'vacation' || request.type === 'sick' || request.type === 'personal') {
        await this.createCalendarEventForApprovedLeave(tenantId, requestId);
      }
    }
    
    return updatedRequest;
  }
  
  async rejectRequest(tenantId: string, requestId: string, approverId: string, reason: string): Promise<HrRequest> {
    await setTenantContext(tenantId);
    
    // Record rejection
    await db
      .insert(hrRequestApprovals)
      .values({
        tenantId,
        requestId,
        approverId,
        action: 'rejected',
        comment: reason
      });
    
    // Update request status
    const updatedRequest = await this.transitionStatus(requestId, 'rejected', approverId, reason);
    
    // Create notification for requester
    const [request] = await db
      .select({ requesterId: hrRequests.requesterId, type: hrRequests.type })
      .from(hrRequests)
      .where(eq(hrRequests.id, requestId));
    
    if (request) {
      await this.createNotification({
        tenantId,
        type: 'system',
        priority: 'medium',
        title: 'Request Rejected',
        message: `Your ${request.type} request has been rejected. Reason: ${reason}`,
        targetUserId: request.requesterId,
        metadata: { requestId, approverId, reason }
      });
    }
    
    return updatedRequest;
  }
  
  async cancelRequest(tenantId: string, requestId: string, requesterId: string, reason?: string): Promise<HrRequest> {
    await setTenantContext(tenantId);
    
    // Verify requester owns the request
    const [request] = await db
      .select({ requesterId: hrRequests.requesterId, type: hrRequests.type, currentApproverId: hrRequests.currentApproverId })
      .from(hrRequests)
      .where(and(
        eq(hrRequests.tenantId, tenantId),
        eq(hrRequests.id, requestId)
      ));
    
    if (!request || request.requesterId !== requesterId) {
      throw new Error('Request not found or access denied');
    }
    
    // Update request status
    const updatedRequest = await this.transitionStatus(requestId, 'cancelled', requesterId, reason);
    
    // Integration Hook: Notify approver that request was cancelled
    try {
      if (request.currentApproverId) {
        await this.createNotification({
          tenantId,
          type: 'system',
          priority: 'low',
          title: 'Request Cancelled',
          message: `A ${request.type} request has been cancelled by the requester. ${reason ? `Reason: ${reason}` : ''}`,
          targetUserId: request.currentApproverId,
          metadata: { requestId, requesterId, reason }
        });
      }
    } catch (error) {
      // Log integration failure but don't break main flow
      console.error(`[INTEGRATION-ERROR] Failed to create notification for request cancellation:`, error);
    }
    
    return updatedRequest;
  }
  
  // Helper methods
  private async getRequestComments(tenantId: string, requestId: string): Promise<HrRequestComment[]> {
    return await db
      .select()
      .from(hrRequestComments)
      .where(and(
        eq(hrRequestComments.tenantId, tenantId),
        eq(hrRequestComments.requestId, requestId)
      ))
      .orderBy(hrRequestComments.createdAt);
  }
  
  private async getRequestApprovals(tenantId: string, requestId: string): Promise<HrRequestApproval[]> {
    return await db
      .select()
      .from(hrRequestApprovals)
      .where(and(
        eq(hrRequestApprovals.tenantId, tenantId),
        eq(hrRequestApprovals.requestId, requestId)
      ))
      .orderBy(hrRequestApprovals.createdAt);
  }
  
  private async getRequestStatusHistory(tenantId: string, requestId: string): Promise<HrRequestStatusHistory[]> {
    return await db
      .select()
      .from(hrRequestStatusHistory)
      .where(and(
        eq(hrRequestStatusHistory.tenantId, tenantId),
        eq(hrRequestStatusHistory.requestId, requestId)
      ))
      .orderBy(hrRequestStatusHistory.createdAt);
  }
  
  private async logStatusHistory(requestId: string, tenantId: string, changedBy: string, fromStatus: string | null, toStatus: string, reason?: string): Promise<void> {
    await db
      .insert(hrRequestStatusHistory)
      .values({
        tenantId,
        requestId,
        changedBy,
        fromStatus: fromStatus as any,
        toStatus: toStatus as any,
        reason
        // automaticChange: false  // Temporarily disabled due to schema mismatch
      });
  }
  
  private isValidStatusTransition(from: string, to: string): boolean {
    // Centralized transition map with enhanced validation
    const validTransitions: Record<string, string[]> = {
      'draft': ['pending'],
      'pending': ['approved', 'rejected'],
      'approved': [],
      'rejected': ['pending'] // Allow resubmission
    };
    
    return validTransitions[from]?.includes(to) || false;
  }
  
  private async validateTransitionAuthority(request: HrRequest, newStatus: string, changedBy: string): Promise<void> {
    // Ownership check - user can only cancel their own requests
    if (newStatus === 'cancelled' && request.requesterId !== changedBy) {
      throw new Error('Only the request owner can cancel their request');
    }
    
    // Authority check - only approvers can approve/reject (this will be enforced by RBAC middleware)
    if ((newStatus === 'approved' || newStatus === 'rejected') && request.requesterId === changedBy) {
      throw new Error('Users cannot approve/reject their own requests');
    }
    
    // Status-specific validations
    if (newStatus === 'approved' && request.status !== 'pending') {
      throw new Error('Only pending requests can be approved');
    }
    
    if (newStatus === 'rejected' && request.status !== 'pending') {
      throw new Error('Only pending requests can be rejected');
    }
  }
  
  private async createCalendarEventForApprovedLeave(tenantId: string, requestId: string): Promise<void> {
    const [request] = await db
      .select()
      .from(hrRequests)
      .where(eq(hrRequests.id, requestId));
    
    if (!request || !request.startDate || !request.endDate) return;
    
    await db
      .insert(calendarEvents)
      .values({
        tenantId: request.tenantId,
        ownerId: request.requesterId,
        title: `${request.type} Leave`,
        description: request.description || '',
        startDate: new Date(request.startDate),
        endDate: new Date(request.endDate),
        isAllDay: true,
        type: 'time_off',
        visibility: 'private',
        hrSensitive: false,
        metadata: { hrRequestId: requestId }
      });
  }
  
  // ==================== MANAGER-SPECIFIC METHODS ====================
  
  async getRequestsForManager(tenantId: string, managerId: string, filters?: HRRequestFilters, options?: HRRequestListOptions): Promise<{ requests: HrRequest[], total: number }> {
    await setTenantContext(tenantId);
    
    const conditions = [
      eq(hrRequests.tenantId, tenantId),
      eq(hrRequests.currentApproverId, managerId),
      eq(hrRequests.status, 'pending')
    ];
    
    // Apply additional filters
    if (filters?.category) {
      conditions.push(eq(hrRequests.category, filters.category as any));
    }
    if (filters?.type) {
      conditions.push(eq(hrRequests.type, filters.type as any));
    }
    if (filters?.priority) {
      conditions.push(eq(hrRequests.priority, filters.priority));
    }
    if (filters?.startDate) {
      conditions.push(gte(hrRequests.startDate, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      conditions.push(lte(hrRequests.endDate, new Date(filters.endDate)));
    }
    
    // Pagination
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;
    
    // Sort order
    let orderBy;
    switch (options?.sortBy) {
      case 'priority':
        orderBy = options.sortOrder === 'asc' ? asc(hrRequests.priority) : desc(hrRequests.priority);
        break;
      case 'startDate':
        orderBy = options.sortOrder === 'asc' ? asc(hrRequests.startDate) : desc(hrRequests.startDate);
        break;
      default:
        orderBy = desc(hrRequests.createdAt);
    }
    
    // Get requests with requester details
    const [requests, totalResult] = await Promise.all([
      db
        .select({
          ...hrRequests,
          requesterFirstName: users.firstName,
          requesterLastName: users.lastName,
          requesterEmail: users.email
        })
        .from(hrRequests)
        .leftJoin(users, eq(hrRequests.requesterId, users.id))
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      
      db
        .select({ count: sql<number>`count(*)` })
        .from(hrRequests)
        .where(and(...conditions))
    ]);
    
    const total = Number(totalResult[0]?.count || 0);
    
    return {
      requests,
      total
    };
  }
  
  async getManagerTeamRequests(tenantId: string, managerId: string, filters?: HRRequestFilters, options?: HRRequestListOptions): Promise<{ requests: HrRequest[], total: number }> {
    await setTenantContext(tenantId);
    
    // Get team members reporting to this manager
    // Note: This assumes a simple hierarchy where managerId is stored in user records
    // In a more complex org structure, you'd need a more sophisticated approach
    const teamMembers = await db
      .select({ id: users.id })
      .from(users)
      .where(and(
        eq(users.tenantId, tenantId),
        sql`${users.id} IN (
          SELECT user_id FROM user_assignments ua
          JOIN roles r ON ua.role_id = r.id
          WHERE ua.tenant_id = ${tenantId}
          AND r.name IN ('employee', 'team_member')
        )`
      ));
    
    const teamMemberIds = teamMembers.map(tm => tm.id);
    
    if (teamMemberIds.length === 0) {
      return { requests: [], total: 0 };
    }
    
    const conditions = [
      eq(hrRequests.tenantId, tenantId),
      inArray(hrRequests.requesterId, teamMemberIds)
    ];
    
    // Apply filters
    if (filters?.status) {
      conditions.push(eq(hrRequests.status, filters.status as any));
    }
    if (filters?.category) {
      conditions.push(eq(hrRequests.category, filters.category as any));
    }
    if (filters?.type) {
      conditions.push(eq(hrRequests.type, filters.type as any));
    }
    if (filters?.priority) {
      conditions.push(eq(hrRequests.priority, filters.priority));
    }
    if (filters?.startDate) {
      conditions.push(gte(hrRequests.startDate, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      conditions.push(lte(hrRequests.endDate, new Date(filters.endDate)));
    }
    
    // Pagination
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;
    
    // Sort order
    let orderBy;
    switch (options?.sortBy) {
      case 'priority':
        orderBy = options.sortOrder === 'asc' ? asc(hrRequests.priority) : desc(hrRequests.priority);
        break;
      case 'startDate':
        orderBy = options.sortOrder === 'asc' ? asc(hrRequests.startDate) : desc(hrRequests.startDate);
        break;
      default:
        orderBy = desc(hrRequests.createdAt);
    }
    
    // Get requests with requester details
    const [requests, totalResult] = await Promise.all([
      db
        .select({
          ...hrRequests,
          requesterFirstName: users.firstName,
          requesterLastName: users.lastName,
          requesterEmail: users.email
        })
        .from(hrRequests)
        .leftJoin(users, eq(hrRequests.requesterId, users.id))
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset),
      
      db
        .select({ count: sql<number>`count(*)` })
        .from(hrRequests)
        .where(and(...conditions))
    ]);
    
    const total = Number(totalResult[0]?.count || 0);
    
    return {
      requests,
      total
    };
  }
  
  async getManagerApprovalHistory(tenantId: string, managerId: string, filters?: { startDate?: string; endDate?: string; limit?: number }): Promise<any[]> {
    await setTenantContext(tenantId);
    
    const conditions = [
      eq(hrRequestApprovals.tenantId, tenantId),
      eq(hrRequestApprovals.approverId, managerId)
    ];
    
    if (filters?.startDate) {
      conditions.push(gte(hrRequestApprovals.createdAt, new Date(filters.startDate)));
    }
    if (filters?.endDate) {
      conditions.push(lte(hrRequestApprovals.createdAt, new Date(filters.endDate)));
    }
    
    const limit = filters?.limit || 50;
    
    const history = await db
      .select({
        id: hrRequestApprovals.id,
        requestId: hrRequestApprovals.requestId,
        action: hrRequestApprovals.action,
        comment: hrRequestApprovals.comment,
        createdAt: hrRequestApprovals.createdAt,
        requestType: hrRequests.type,
        requestCategory: hrRequests.category,
        requestTitle: hrRequests.title,
        requesterName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        requesterEmail: users.email
      })
      .from(hrRequestApprovals)
      .leftJoin(hrRequests, eq(hrRequestApprovals.requestId, hrRequests.id))
      .leftJoin(users, eq(hrRequests.requesterId, users.id))
      .where(and(...conditions))
      .orderBy(desc(hrRequestApprovals.createdAt))
      .limit(limit);
    
    return history;
  }
  
  // ==================== COMMENT AND HISTORY METHODS ====================
  
  async getRequestComments(tenantId: string, requestId: string): Promise<HrRequestComment[]> {
    await setTenantContext(tenantId);
    return await db
      .select()
      .from(hrRequestComments)
      .where(and(
        eq(hrRequestComments.tenantId, tenantId),
        eq(hrRequestComments.requestId, requestId)
      ))
      .orderBy(hrRequestComments.createdAt);
  }
  
  async getRequestHistory(tenantId: string, requestId: string): Promise<HrRequestStatusHistory[]> {
    await setTenantContext(tenantId);
    return await db
      .select()
      .from(hrRequestStatusHistory)
      .where(and(
        eq(hrRequestStatusHistory.tenantId, tenantId),
        eq(hrRequestStatusHistory.requestId, requestId)
      ))
      .orderBy(hrRequestStatusHistory.createdAt);
  }
  
  // ==================== MANAGER STATISTICS METHODS ====================
  
  async getManagerPendingCount(tenantId: string, managerId: string): Promise<number> {
    await setTenantContext(tenantId);
    
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(hrRequests)
      .where(and(
        eq(hrRequests.tenantId, tenantId),
        eq(hrRequests.currentApproverId, managerId),
        eq(hrRequests.status, 'pending')
      ));
    
    return Number(result[0]?.count || 0);
  }
  
  async getManagerUrgentCount(tenantId: string, managerId: string): Promise<number> {
    await setTenantContext(tenantId);
    
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(hrRequests)
      .where(and(
        eq(hrRequests.tenantId, tenantId),
        eq(hrRequests.currentApproverId, managerId),
        eq(hrRequests.status, 'pending'),
        eq(hrRequests.priority, 'urgent')
      ));
    
    return Number(result[0]?.count || 0);
  }
  
  async getManagerApprovedTodayCount(tenantId: string, managerId: string): Promise<number> {
    await setTenantContext(tenantId);
    
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(hrRequestApprovals)
      .where(and(
        eq(hrRequestApprovals.tenantId, tenantId),
        eq(hrRequestApprovals.approverId, managerId),
        eq(hrRequestApprovals.action, 'approved'),
        gte(hrRequestApprovals.createdAt, startOfDay)
      ));
    
    return Number(result[0]?.count || 0);
  }
  
  async getManagerRejectedTodayCount(tenantId: string, managerId: string): Promise<number> {
    await setTenantContext(tenantId);
    
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(hrRequestApprovals)
      .where(and(
        eq(hrRequestApprovals.tenantId, tenantId),
        eq(hrRequestApprovals.approverId, managerId),
        eq(hrRequestApprovals.action, 'rejected'),
        gte(hrRequestApprovals.createdAt, startOfDay)
      ));
    
    return Number(result[0]?.count || 0);
  }
  
  async getManagerAvgResponseTime(tenantId: string, managerId: string): Promise<number> {
    await setTenantContext(tenantId);
    
    // Calculate average response time for requests approved/rejected by this manager
    const result = await db
      .select({
        avgTime: sql<number>`AVG(EXTRACT(EPOCH FROM (ha.created_at - hr.created_at)) / 3600)`
      })
      .from(hrRequestApprovals.as('ha'))
      .leftJoin(hrRequests.as('hr'), eq(sql`ha.request_id`, sql`hr.id`))
      .where(and(
        eq(sql`ha.tenant_id`, tenantId),
        eq(sql`ha.approver_id`, managerId),
        gte(sql`ha.created_at`, sql`NOW() - INTERVAL '30 days'`)
      ));
    
    return Number(result[0]?.avgTime || 0);
  }
  
  async getManagerTeamRequestsCount(tenantId: string, managerId: string): Promise<number> {
    await setTenantContext(tenantId);
    
    // Get team members reporting to this manager
    const teamMembers = await db
      .select({ id: users.id })
      .from(users)
      .where(and(
        eq(users.tenantId, tenantId),
        sql`${users.id} IN (\n          SELECT user_id FROM user_assignments ua\n          JOIN roles r ON ua.role_id = r.id\n          WHERE ua.tenant_id = ${tenantId}\n          AND r.name IN ('employee', 'team_member')\n        )`
      ));
    
    const teamMemberIds = teamMembers.map(tm => tm.id);
    
    if (teamMemberIds.length === 0) {
      return 0;
    }
    
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(hrRequests)
      .where(and(
        eq(hrRequests.tenantId, tenantId),
        inArray(hrRequests.requesterId, teamMemberIds)
      ));
    
    return Number(result[0]?.count || 0);
  }

}

export const storage = new DatabaseStorage();
