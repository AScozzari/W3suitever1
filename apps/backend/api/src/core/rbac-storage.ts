import { eq, and, or, inArray, isNull, isNotNull, gt } from "drizzle-orm";
import { db } from "./db.js";
import { 
  roles, 
  rolePerms, 
  userAssignments, 
  userExtraPerms,
  users,
  type Role,
  type InsertRole,
  type UserAssignment,
  type InsertUserAssignment
} from "../db/schema/w3suite.js";
import { PERMISSIONS } from "./permissions/registry.js";

export class RBACStorage {
  // ==================== ROLES ====================
  
  async createRole(tenantId: string, data: Omit<InsertRole, 'tenantId'>) {
    const [role] = await db.insert(roles).values({
      ...data,
      tenantId
    }).returning();
    return role;
  }

  async getRoleById(roleId: string) {
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId));
    return role;
  }

  async getRolesByTenant(tenantId: string) {
    return db
      .select()
      .from(roles)
      .where(eq(roles.tenantId, tenantId));
  }

  async updateRole(roleId: string, data: Partial<InsertRole>) {
    const [updated] = await db
      .update(roles)
      .set(data)
      .where(eq(roles.id, roleId))
      .returning();
    return updated;
  }

  async deleteRole(roleId: string) {
    // Check if role is system role
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId));
    
    if (role?.isSystem) {
      throw new Error("Cannot delete system role");
    }

    await db.delete(roles).where(eq(roles.id, roleId));
    return true;
  }

  // ==================== PERMISSIONS ====================
  
  async addPermissionsToRole(roleId: string, permissions: string[]) {
    const values = permissions.map(perm => ({
      roleId,
      perm
    }));
    
    await db.insert(rolePerms).values(values).onConflictDoNothing();
    return true;
  }

  async removePermissionsFromRole(roleId: string, permissions: string[]) {
    await db
      .delete(rolePerms)
      .where(
        and(
          eq(rolePerms.roleId, roleId),
          inArray(rolePerms.perm, permissions)
        )
      );
    return true;
  }

  async getRolePermissions(roleId: string): Promise<string[]> {
    const perms = await db
      .select({ perm: rolePerms.perm })
      .from(rolePerms)
      .where(eq(rolePerms.roleId, roleId));
    
    return perms.map(p => p.perm);
  }

  async setRolePermissions(roleId: string, permissions: string[]) {
    // Delete all existing permissions
    await db.delete(rolePerms).where(eq(rolePerms.roleId, roleId));
    
    // Add new permissions
    if (permissions.length > 0) {
      await this.addPermissionsToRole(roleId, permissions);
    }
    
    return true;
  }

  // ==================== USER ASSIGNMENTS ====================
  
  async assignRoleToUser(data: InsertUserAssignment) {
    await db.insert(userAssignments).values(data).onConflictDoNothing();
    return true;
  }

  async removeRoleFromUser(userId: string, roleId: string, scopeType: string, scopeId: string) {
    await db
      .delete(userAssignments)
      .where(
        and(
          eq(userAssignments.userId, userId),
          eq(userAssignments.roleId, roleId),
          eq(userAssignments.scopeType, scopeType as any),
          eq(userAssignments.scopeId, scopeId)
        )
      );
    return true;
  }

  async getUserRoles(userId: string, tenantId: string) {
    const assignments = await db
      .select({
        role: roles,
        assignment: userAssignments
      })
      .from(userAssignments)
      .innerJoin(roles, eq(userAssignments.roleId, roles.id))
      .where(
        and(
          eq(userAssignments.userId, userId),
          eq(roles.tenantId, tenantId)
        )
      );
    
    return assignments;
  }

  async getUserPermissions(
    userId: string, 
    tenantId: string, 
    scopeType?: string, 
    scopeId?: string,
    parentScopes?: { legalEntityId?: string }
  ): Promise<string[]> {
    // Get all user role assignments for this tenant
    const assignments = await db
      .select({
        role: roles,
        assignment: userAssignments
      })
      .from(userAssignments)
      .innerJoin(roles, eq(userAssignments.roleId, roles.id))
      .where(
        and(
          eq(userAssignments.userId, userId),
          eq(roles.tenantId, tenantId),
          // Check for expired assignments
          or(
            isNull(userAssignments.expiresAt),
            gt(userAssignments.expiresAt, new Date())
          )
        )
      );
    
    // Filter assignments based on scope with hierarchy support
    const validAssignments = assignments.filter(({ assignment }) => {
      // Tenant-level assignments apply everywhere in this tenant
      if (assignment.scopeType === 'tenant' && assignment.scopeId === tenantId) {
        return true;
      }
      
      // Check scope hierarchy based on current context
      if (scopeType && scopeId) {
        // Store scope: include store, legal_entity parent, and tenant assignments
        if (scopeType === 'store') {
          // Direct store assignment
          if (assignment.scopeType === 'store' && assignment.scopeId === scopeId) {
            return true;
          }
          // Include legal_entity parent assignments if provided
          if (parentScopes?.legalEntityId && 
              assignment.scopeType === 'legal_entity' && 
              assignment.scopeId === parentScopes.legalEntityId) {
            return true;
          }
        }
        
        // Legal entity scope: include legal_entity and tenant assignments
        if (scopeType === 'legal_entity') {
          if (assignment.scopeType === 'legal_entity' && assignment.scopeId === scopeId) {
            return true;
          }
        }
        
        // Tenant scope already handled above
      }
      
      return false;
    });
    
    // Get permissions for valid roles
    const allPermissions = new Set<string>();
    
    for (const { role } of validAssignments) {
      const rolePerms = await this.getRolePermissions(role.id);
      rolePerms.forEach(perm => allPermissions.add(perm));
    }
    
    // Get user extra permissions (respecting expiry)
    const extraPerms = await db
      .select()
      .from(userExtraPerms)
      .where(
        and(
          eq(userExtraPerms.userId, userId),
          or(
            isNull(userExtraPerms.expiresAt),
            gt(userExtraPerms.expiresAt, new Date())
          )
        )
      );
    
    // Apply extra permissions (grant or revoke)
    for (const extra of extraPerms) {
      if (extra.mode === 'grant') {
        allPermissions.add(extra.perm);
      } else if (extra.mode === 'revoke') {
        allPermissions.delete(extra.perm);
      }
    }
    
    return Array.from(allPermissions);
  }

  // ==================== USER EXTRA PERMISSIONS ====================
  
  async grantExtraPermission(userId: string, perm: string, expiresAt?: Date) {
    await db
      .insert(userExtraPerms)
      .values({
        userId,
        perm,
        mode: 'grant',
        expiresAt
      })
      .onConflictDoUpdate({
        target: [userExtraPerms.userId, userExtraPerms.perm],
        set: {
          mode: 'grant',
          expiresAt
        }
      });
    return true;
  }

  async revokeExtraPermission(userId: string, perm: string) {
    await db
      .insert(userExtraPerms)
      .values({
        userId,
        perm,
        mode: 'revoke'
      })
      .onConflictDoUpdate({
        target: [userExtraPerms.userId, userExtraPerms.perm],
        set: {
          mode: 'revoke'
        }
      });
    return true;
  }

  async clearExtraPermission(userId: string, perm: string) {
    await db
      .delete(userExtraPerms)
      .where(
        and(
          eq(userExtraPerms.userId, userId),
          eq(userExtraPerms.perm, perm)
        )
      );
    return true;
  }

  // ==================== PERMISSION CHECKS ====================
  
  async userHasPermission(userId: string, tenantId: string, permission: string): Promise<boolean> {
    const userPerms = await this.getUserPermissions(userId, tenantId);
    
    // Check for exact permission
    if (userPerms.includes(permission)) {
      return true;
    }
    
    // Check for wildcard permission
    if (userPerms.includes('*')) {
      return true;
    }
    
    // Check for wildcard in permission path
    const permParts = permission.split('.');
    for (let i = permParts.length - 1; i >= 0; i--) {
      const wildcardPerm = [...permParts.slice(0, i), '*'].join('.');
      if (userPerms.includes(wildcardPerm)) {
        return true;
      }
    }
    
    return false;
  }

  async userHasAnyPermission(userId: string, tenantId: string, permissions: string[]): Promise<boolean> {
    for (const perm of permissions) {
      if (await this.userHasPermission(userId, tenantId, perm)) {
        return true;
      }
    }
    return false;
  }

  async userHasAllPermissions(userId: string, tenantId: string, permissions: string[]): Promise<boolean> {
    for (const perm of permissions) {
      if (!(await this.userHasPermission(userId, tenantId, perm))) {
        return false;
      }
    }
    return true;
  }

  // ==================== INITIALIZATION ====================
  
  async initializeSystemRoles(tenantId: string) {
    // Create default system roles based on ROLE_TEMPLATES from registry
    const systemRoles = [
      {
        name: 'admin',
        description: 'Full system access',
        isSystem: true,
        level: 1
      },
      {
        name: 'store_manager',
        description: 'Store management access',
        isSystem: true,
        level: 10
      },
      {
        name: 'finance',
        description: 'Financial operations access',
        isSystem: true,
        level: 20
      },
      {
        name: 'marketing',
        description: 'Marketing and CRM access',
        isSystem: true,
        level: 30
      },
      {
        name: 'operations',
        description: 'Operations and inventory access',
        isSystem: true,
        level: 40
      },
      {
        name: 'viewer',
        description: 'Read-only access',
        isSystem: true,
        level: 100
      }
    ];

    for (const roleData of systemRoles) {
      const [existingRole] = await db
        .select()
        .from(roles)
        .where(
          and(
            eq(roles.tenantId, tenantId),
            eq(roles.name, roleData.name)
          )
        );

      if (!existingRole) {
        await this.createRole(tenantId, roleData);
      }
    }

    return true;
  }
}

export const rbacStorage = new RBACStorage();