import {
  users,
  tenants,
  legalEntities,
  stores,
  roles,
  userAssignments,
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
  type Role,
  type InsertRole,
} from "../../../../../shared/schema";
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
  
  // Role Management
  getRolesByTenant(tenantId: string): Promise<Role[]>;
  createRole(role: InsertRole): Promise<Role>;
  
  // Store Management
  getStoresByTenant(tenantId: string): Promise<Store[]>;
  createStore(store: InsertStore): Promise<Store>;
  
  // User Assignment Management
  getUserAssignments(userId: string): Promise<UserAssignment[]>;
  getUserTenantAssignments(userId: string, tenantId: string): Promise<UserAssignment[]>;
  createUserAssignment(userAssignment: InsertUserAssignment): Promise<UserAssignment>;
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

  // ==================== ROLE MANAGEMENT ====================

  async getRolesByTenant(tenantId: string): Promise<Role[]> {
    return await db.select().from(roles).where(eq(roles.tenantId, tenantId));
  }

  async createRole(roleData: InsertRole): Promise<Role> {
    const [role] = await db.insert(roles).values(roleData).returning();
    return role;
  }

  // ==================== STORE MANAGEMENT ====================

  async getStoresByTenant(tenantId: string): Promise<Store[]> {
    return await db.select().from(stores).where(eq(stores.tenantId, tenantId));
  }


  async createStore(storeData: InsertStore): Promise<Store> {
    const [store] = await db.insert(stores).values(storeData).returning();
    return store;
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

}

export const storage = new DatabaseStorage();
