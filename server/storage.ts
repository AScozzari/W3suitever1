import {
  users,
  tenants,
  legalEntities,
  strategicGroups,
  stores,
  userTenantRoles,
  permissions,
  rolePermissions,
  type User,
  type UpsertUser,
  type Tenant,
  type InsertTenant,
  type LegalEntity,
  type InsertLegalEntity,
  type StrategicGroup,
  type InsertStrategicGroup,
  type Store,
  type InsertStore,
  type UserTenantRole,
  type InsertUserTenantRole,
  type Permission,
  type InsertPermission,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Tenant Management
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, tenant: Partial<InsertTenant>): Promise<Tenant | undefined>;
  
  // Legal Entity Management
  getLegalEntitiesByTenant(tenantId: string): Promise<LegalEntity[]>;
  createLegalEntity(legalEntity: InsertLegalEntity): Promise<LegalEntity>;
  
  // Strategic Group Management
  getStrategicGroupsByTenant(tenantId: string): Promise<StrategicGroup[]>;
  createStrategicGroup(strategicGroup: InsertStrategicGroup): Promise<StrategicGroup>;
  
  // Store Management
  getStoresByTenant(tenantId: string): Promise<Store[]>;
  getStoresByStrategicGroup(strategicGroupId: string): Promise<Store[]>;
  createStore(store: InsertStore): Promise<Store>;
  
  // User-Tenant Role Management
  getUserTenantRoles(userId: string): Promise<UserTenantRole[]>;
  getUserTenantRole(userId: string, tenantId: string): Promise<UserTenantRole | undefined>;
  createUserTenantRole(userTenantRole: InsertUserTenantRole): Promise<UserTenantRole>;
  
  // Permission Management
  getPermissionsByRole(role: string): Promise<Permission[]>;
  createPermission(permission: InsertPermission): Promise<Permission>;
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
    return await db.select().from(legalEntities).where(eq(legalEntities.tenantId, tenantId));
  }

  async createLegalEntity(legalEntityData: InsertLegalEntity): Promise<LegalEntity> {
    const [legalEntity] = await db.insert(legalEntities).values(legalEntityData).returning();
    return legalEntity;
  }

  // ==================== STRATEGIC GROUP MANAGEMENT ====================

  async getStrategicGroupsByTenant(tenantId: string): Promise<StrategicGroup[]> {
    return await db.select().from(strategicGroups).where(eq(strategicGroups.tenantId, tenantId));
  }

  async createStrategicGroup(strategicGroupData: InsertStrategicGroup): Promise<StrategicGroup> {
    const [strategicGroup] = await db.insert(strategicGroups).values(strategicGroupData).returning();
    return strategicGroup;
  }

  // ==================== STORE MANAGEMENT ====================

  async getStoresByTenant(tenantId: string): Promise<Store[]> {
    return await db.select().from(stores).where(eq(stores.tenantId, tenantId));
  }

  async getStoresByStrategicGroup(strategicGroupId: string): Promise<Store[]> {
    return await db.select().from(stores).where(eq(stores.strategicGroupId, strategicGroupId));
  }

  async createStore(storeData: InsertStore): Promise<Store> {
    const [store] = await db.insert(stores).values(storeData).returning();
    return store;
  }

  // ==================== USER-TENANT ROLE MANAGEMENT ====================

  async getUserTenantRoles(userId: string): Promise<UserTenantRole[]> {
    return await db.select().from(userTenantRoles).where(eq(userTenantRoles.userId, userId));
  }

  async getUserTenantRole(userId: string, tenantId: string): Promise<UserTenantRole | undefined> {
    const [userTenantRole] = await db
      .select()
      .from(userTenantRoles)
      .where(and(eq(userTenantRoles.userId, userId), eq(userTenantRoles.tenantId, tenantId)));
    return userTenantRole;
  }

  async createUserTenantRole(userTenantRoleData: InsertUserTenantRole): Promise<UserTenantRole> {
    const [userTenantRole] = await db.insert(userTenantRoles).values(userTenantRoleData).returning();
    return userTenantRole;
  }

  // ==================== PERMISSION MANAGEMENT ====================

  async getPermissionsByRole(role: string): Promise<Permission[]> {
    return await db
      .select({ 
        id: permissions.id,
        code: permissions.code,
        name: permissions.name,
        description: permissions.description,
        module: permissions.module,
        scope: permissions.scope,
        isActive: permissions.isActive,
        createdAt: permissions.createdAt
      })
      .from(permissions)
      .innerJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))
      .where(eq(rolePermissions.role, role));
  }

  async createPermission(permissionData: InsertPermission): Promise<Permission> {
    const [permission] = await db.insert(permissions).values(permissionData).returning();
    return permission;
  }
}

export const storage = new DatabaseStorage();
