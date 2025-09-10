import { db, brandTenants, brandUsers, brandRoles, brandAuditLogs } from "../db/index.js";
import { eq, and, sql, inArray } from "drizzle-orm";
import type { BrandTenant, NewBrandTenant, BrandUser, NewBrandUser, BrandRole, NewBrandRole, BrandAuditLog, NewBrandAuditLog } from "../db/index.js";
import { nanoid } from "nanoid";

export interface IBrandStorage {
  // Tenant operations
  getTenants(): Promise<BrandTenant[]>;
  getTenant(id: string): Promise<BrandTenant | null>;
  createTenant(data: NewBrandTenant): Promise<BrandTenant>;
  updateTenant(id: string, data: Partial<BrandTenant>): Promise<BrandTenant | null>;
  
  // User operations
  getUsers(tenantId?: string): Promise<BrandUser[]>;
  getUser(id: string): Promise<BrandUser | null>;
  getUserByEmail(email: string): Promise<BrandUser | null>;
  createUser(data: NewBrandUser): Promise<BrandUser>;
  updateUser(id: string, data: Partial<BrandUser>): Promise<BrandUser | null>;
  
  // Role operations
  getRoles(tenantId: string): Promise<BrandRole[]>;
  getRole(id: string): Promise<BrandRole | null>;
  createRole(data: NewBrandRole): Promise<BrandRole>;
  updateRole(id: string, data: Partial<BrandRole>): Promise<BrandRole | null>;
  
  // Audit log operations
  createAuditLog(data: NewBrandAuditLog): Promise<BrandAuditLog>;
  getAuditLogs(tenantId?: string, limit?: number): Promise<BrandAuditLog[]>;
}

class BrandDrizzleStorage implements IBrandStorage {
  // Tenant operations
  async getTenants(): Promise<BrandTenant[]> {
    return await db.select().from(brandTenants);
  }

  async getTenant(id: string): Promise<BrandTenant | null> {
    const results = await db.select()
      .from(brandTenants)
      .where(eq(brandTenants.id, id))
      .limit(1);
    return results[0] || null;
  }

  async createTenant(data: NewBrandTenant): Promise<BrandTenant> {
    const results = await db.insert(brandTenants)
      .values(data)
      .returning();
    return results[0];
  }

  async updateTenant(id: string, data: Partial<BrandTenant>): Promise<BrandTenant | null> {
    const results = await db.update(brandTenants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(brandTenants.id, id))
      .returning();
    return results[0] || null;
  }

  // User operations
  async getUsers(tenantId?: string): Promise<BrandUser[]> {
    if (tenantId) {
      return await db.select()
        .from(brandUsers)
        .where(eq(brandUsers.tenantId, tenantId));
    }
    return await db.select().from(brandUsers);
  }

  async getUser(id: string): Promise<BrandUser | null> {
    const results = await db.select()
      .from(brandUsers)
      .where(eq(brandUsers.id, id))
      .limit(1);
    return results[0] || null;
  }

  async getUserByEmail(email: string): Promise<BrandUser | null> {
    const results = await db.select()
      .from(brandUsers)
      .where(eq(brandUsers.email, email))
      .limit(1);
    return results[0] || null;
  }

  async createUser(data: NewBrandUser): Promise<BrandUser> {
    const userId = data.id || nanoid();
    const results = await db.insert(brandUsers)
      .values({ ...data, id: userId })
      .returning();
    return results[0];
  }

  async updateUser(id: string, data: Partial<BrandUser>): Promise<BrandUser | null> {
    const results = await db.update(brandUsers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(brandUsers.id, id))
      .returning();
    return results[0] || null;
  }

  // Role operations
  async getRoles(tenantId: string): Promise<BrandRole[]> {
    return await db.select()
      .from(brandRoles)
      .where(eq(brandRoles.tenantId, tenantId));
  }

  async getRole(id: string): Promise<BrandRole | null> {
    const results = await db.select()
      .from(brandRoles)
      .where(eq(brandRoles.id, id))
      .limit(1);
    return results[0] || null;
  }

  async createRole(data: NewBrandRole): Promise<BrandRole> {
    const results = await db.insert(brandRoles)
      .values(data)
      .returning();
    return results[0];
  }

  async updateRole(id: string, data: Partial<BrandRole>): Promise<BrandRole | null> {
    const results = await db.update(brandRoles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(brandRoles.id, id))
      .returning();
    return results[0] || null;
  }

  // Audit log operations
  async createAuditLog(data: NewBrandAuditLog): Promise<BrandAuditLog> {
    const results = await db.insert(brandAuditLogs)
      .values(data)
      .returning();
    return results[0];
  }

  async getAuditLogs(tenantId?: string, limit: number = 100): Promise<BrandAuditLog[]> {
    if (tenantId) {
      return await db.select()
        .from(brandAuditLogs)
        .where(eq(brandAuditLogs.tenantId, tenantId))
        .orderBy(sql`${brandAuditLogs.createdAt} DESC`)
        .limit(limit);
    }
    return await db.select()
      .from(brandAuditLogs)
      .orderBy(sql`${brandAuditLogs.createdAt} DESC`)
      .limit(limit);
  }
}

// Export singleton instance
export const brandStorage = new BrandDrizzleStorage();