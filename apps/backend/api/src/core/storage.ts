import {
  users,
  tenants,
  legalEntities,
  stores,
  commercialAreas,
  roles,
  userAssignments,
  legalForms,
  countries,
  italianCities,
  type User,
  type UpsertUser,
  type Tenant,
  type InsertTenant,
  type LegalEntity,
  type InsertLegalEntity,
  type Store,
  type InsertStore,
  type CommercialArea,
  type InsertCommercialArea,
  type UserAssignment,
  type InsertUserAssignment,
  type Role,
  type InsertRole,
  type LegalForm,
  type Country,
} from "../db/schema";
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
  
  // Reference Data Management
  getLegalForms(): Promise<LegalForm[]>;
  getCountries(): Promise<Country[]>;
  getItalianCities(): Promise<any[]>;
  getCommercialAreas(): Promise<CommercialArea[]>;
  createCommercialArea(areaData: InsertCommercialArea): Promise<CommercialArea>;
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
    // First check if roles exist for this tenant
    const existingRoles = await db.select().from(roles).where(eq(roles.tenantId, tenantId));
    
    // If no roles exist, initialize default roles
    if (existingRoles.length === 0) {
      const defaultRoles = [
        { name: 'Amministratore', description: 'Accesso completo a tutte le funzionalità', isSystem: true },
        { name: 'Store Manager', description: 'Gestione completa del punto vendita', isSystem: true },
        { name: 'Area Manager', description: 'Supervisione di più punti vendita', isSystem: true },
        { name: 'Finance', description: 'Gestione finanziaria e reportistica', isSystem: true },
        { name: 'HR Manager', description: 'Gestione risorse umane', isSystem: true },
        { name: 'Sales Agent', description: 'Agente di vendita', isSystem: false },
        { name: 'Cassiere', description: 'Gestione cassa e vendite', isSystem: false },
        { name: 'Magazziniere', description: 'Gestione magazzino e inventario', isSystem: false },
        { name: 'Marketing', description: 'Gestione campagne e promozioni', isSystem: false }
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

}

export const storage = new DatabaseStorage();
