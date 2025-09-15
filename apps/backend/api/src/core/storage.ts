// Import from W3 Suite schema (tenant-specific)
import {
  users,
  tenants,
  legalEntities,
  stores,
  roles,
  userAssignments,
  userStores,
  entityLogs,
  structuredLogs,
  notifications,
  type User,
  type UpsertUser,
  type Tenant,
  type InsertTenant,
  type LegalEntity,
  type InsertLegalEntity,
  type Store,
  type InsertStore,
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
} from "../db/schema/w3suite";

// Import from Public schema (shared reference data)
import {
  commercialAreas,
  channels,
  legalForms,
  countries,
  italianCities,
  type CommercialArea,
  type InsertCommercialArea,
  type LegalForm,
  type Country,
} from "../db/schema/public";
import { db, setTenantContext, withTenantContext } from "./db";
import { eq, and, or, gte, lte, desc, asc, sql } from "drizzle-orm";

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
export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUsersByTenant(tenantId: string): Promise<any[]>;
  
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
  getStoresByTenant(tenantId: string): Promise<any[]>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: string, store: Partial<InsertStore>): Promise<Store>;
  deleteStore(id: string): Promise<void>;
  
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
  getItalianCities(): Promise<any[]>;
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
}

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
  
  async getUsersByTenant(tenantId: string): Promise<any[]> {
    console.log(`[STORAGE-RLS] 🔍 getUsersByTenant: Setting tenant context for ${tenantId}`);
    
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
    
    // Ensure tenant context is set for RLS
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

  async getStoresByTenant(tenantId: string): Promise<any[]> {
    console.log(`[STORAGE-RLS] 🔍 getStoresByTenant: Setting tenant context for ${tenantId}`);
    
    // Ensure tenant context is set for RLS
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

  async getItalianCities(): Promise<any[]> {
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
      conditions.push(
        or(
          eq(notifications.broadcast, true),
          eq(notifications.targetUserId, userId),
          sql`EXISTS(SELECT 1 FROM ${users} WHERE id = ${userId} AND role = ANY(${notifications.targetRoles}))`
        )
      );
    }
    
    // Apply filters
    if (filters?.type) {
      conditions.push(eq(notifications.type, filters.type));
    }
    
    if (filters?.priority) {
      conditions.push(eq(notifications.priority, filters.priority));
    }
    
    if (filters?.status) {
      conditions.push(eq(notifications.status, filters.status));
    }
    
    if (filters?.targetUserId) {
      conditions.push(eq(notifications.targetUserId, filters.targetUserId));
    }
    
    // Filter out expired notifications
    conditions.push(
      or(
        eq(notifications.expiresAt, null),
        gte(notifications.expiresAt, new Date())
      )
    );
    
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
      conditions.push(
        or(
          eq(notifications.broadcast, true),
          eq(notifications.targetUserId, userId),
          sql`EXISTS(SELECT 1 FROM ${users} WHERE id = ${userId} AND role = ANY(${notifications.targetRoles}))`
        )
      );
    }
    
    // Filter out expired notifications
    conditions.push(
      or(
        eq(notifications.expiresAt, null),
        gte(notifications.expiresAt, new Date())
      )
    );
    
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

}

export const storage = new DatabaseStorage();
