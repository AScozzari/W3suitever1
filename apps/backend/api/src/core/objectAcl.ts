import { structuredLogger } from './logger';
import { objectStorageService } from './objectStorage';
import { db } from './db';
import { objectAcls, InsertObjectAcl } from '../db/schema/w3suite';
import { eq } from 'drizzle-orm';

// ACL Types
export interface AccessRule {
  type: 'user' | 'tenant' | 'role' | 'public';
  id: string; // userId, tenantId, roleId, or 'public'
  permission: 'read' | 'write' | 'delete' | 'admin';
}

export interface ObjectAcl {
  objectPath: string;
  ownerId: string;
  ownerTenantId: string;
  visibility: 'public' | 'private';
  accessRules: AccessRule[];
  createdAt: string;
  updatedAt: string;
}

// Permission levels (hierarchical)
const PERMISSION_LEVELS = {
  'read': 1,
  'write': 2,
  'delete': 3,
  'admin': 4
};

export class ObjectAclService {
  // Database-backed ACL storage using objectAcls table

  /**
   * Create ACL for a new object
   */
  async createObjectAcl(
    objectPath: string,
    ownerId: string,
    ownerTenantId: string,
    visibility: 'public' | 'private' = 'private'
  ): Promise<ObjectAcl> {
    try {
      const accessRules = [
        // Owner always has admin access
        {
          type: 'user',
          id: ownerId,
          permission: 'admin'
        },
        // Tenant members have read access for public objects
        ...(visibility === 'public' ? [{
          type: 'tenant' as const,
          id: ownerTenantId,
          permission: 'read' as const
        }] : [])
      ];

      const aclData: InsertObjectAcl = {
        tenantId: ownerTenantId,
        objectPath,
        ownerId,
        ownerTenantId,
        visibility,
        accessRules
      };

      // Insert ACL into database
      const [createdAcl] = await db.insert(objectAcls).values(aclData).returning();

      structuredLogger.info('Object ACL created in database', {
        component: 'object-acl',
        metadata: {
          objectPath,
          ownerId,
          ownerTenantId,
          visibility,
          aclId: createdAcl.id
        }
      });

      // Convert database record to ObjectAcl interface
      const acl: ObjectAcl = {
        objectPath: createdAcl.objectPath,
        ownerId: createdAcl.ownerId,
        ownerTenantId: createdAcl.ownerTenantId,
        visibility: createdAcl.visibility,
        accessRules: createdAcl.accessRules as AccessRule[],
        createdAt: createdAcl.createdAt!.toISOString(),
        updatedAt: createdAcl.updatedAt!.toISOString()
      };

      return acl;
    } catch (error) {
      structuredLogger.error('Failed to create object ACL in database', {
        component: 'object-acl',
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          objectPath,
          ownerId,
          ownerTenantId
        }
      });
      throw new Error('Errore nella creazione ACL oggetto');
    }
  }

  /**
   * Get ACL for an object
   */
  async getObjectAcl(objectPath: string): Promise<ObjectAcl | null> {
    try {
      // Query ACL from database
      const aclResults = await db
        .select()
        .from(objectAcls)
        .where(eq(objectAcls.objectPath, objectPath))
        .limit(1);
      
      if (aclResults.length === 0) {
        // If no ACL exists, try to create one from object metadata
        const metadata = await objectStorageService.getObjectMetadata(objectPath);
        if (metadata) {
          return this.createObjectAcl(
            objectPath,
            metadata.uploadedBy,
            metadata.tenantId,
            metadata.visibility
          );
        }
        return null;
      }

      const aclRecord = aclResults[0];

      // Convert database record to ObjectAcl interface
      const acl: ObjectAcl = {
        objectPath: aclRecord.objectPath,
        ownerId: aclRecord.ownerId,
        ownerTenantId: aclRecord.ownerTenantId,
        visibility: aclRecord.visibility,
        accessRules: aclRecord.accessRules as AccessRule[],
        createdAt: aclRecord.createdAt!.toISOString(),
        updatedAt: aclRecord.updatedAt!.toISOString()
      };

      return acl;
    } catch (error) {
      structuredLogger.error('Failed to get object ACL from database', {
        component: 'object-acl',
        error: error instanceof Error ? error.message : 'Unknown error',
        objectPath
      });
      return null;
    }
  }

  /**
   * Check if user has permission to access object
   */
  async checkPermission(
    objectPath: string,
    userId: string,
    tenantId: string,
    requiredPermission: 'read' | 'write' | 'delete' | 'admin'
  ): Promise<boolean> {
    try {
      const acl = await this.getObjectAcl(objectPath);
      
      if (!acl) {
        structuredLogger.warn('Object ACL not found for permission check', {
          component: 'object-acl',
          metadata: {
            objectPath,
            userId,
            tenantId,
            requiredPermission
          }
        });
        return false;
      }

      // Public objects are readable by anyone in the same tenant
      if (acl.visibility === 'public' && requiredPermission === 'read' && tenantId === acl.ownerTenantId) {
        return true;
      }

      // Check access rules
      const requiredLevel = PERMISSION_LEVELS[requiredPermission];

      for (const rule of acl.accessRules) {
        const userHasAccess = this.checkAccessRule(rule, userId, tenantId);
        const ruleLevel = PERMISSION_LEVELS[rule.permission];

        if (userHasAccess && ruleLevel >= requiredLevel) {
          structuredLogger.debug('Permission granted via access rule', {
            component: 'object-acl',
            metadata: {
              objectPath,
              userId,
              tenantId,
              requiredPermission,
              ruleType: rule.type,
              ruleId: rule.id,
              rulePermission: rule.permission
            }
          });
          return true;
        }
      }

      structuredLogger.info('Permission denied', {
        component: 'object-acl',
        metadata: {
          objectPath,
          userId,
          tenantId,
          requiredPermission,
          aclVisibility: acl.visibility,
          aclOwner: acl.ownerId,
          aclTenant: acl.ownerTenantId
        }
      });

      return false;
    } catch (error) {
      structuredLogger.error('Failed to check permission', {
        component: 'object-acl',
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          objectPath,
          userId,
          tenantId,
          requiredPermission
        }
      });
      return false;
    }
  }

  /**
   * Add access rule to object
   */
  async addAccessRule(
    objectPath: string,
    rule: AccessRule,
    requesterId: string,
    requesterTenantId: string
  ): Promise<boolean> {
    try {
      // Check if requester has admin permission
      const hasAdmin = await this.checkPermission(objectPath, requesterId, requesterTenantId, 'admin');
      if (!hasAdmin) {
        return false;
      }

      const acl = await this.getObjectAcl(objectPath);
      if (!acl) {
        return false;
      }

      // Remove existing rule for the same type and id
      const updatedAccessRules = acl.accessRules.filter(
        existingRule => !(existingRule.type === rule.type && existingRule.id === rule.id)
      );

      // Add new rule
      updatedAccessRules.push(rule);

      // Update ACL in database
      await db
        .update(objectAcls)
        .set({ 
          accessRules: updatedAccessRules,
          updatedAt: new Date()
        })
        .where(eq(objectAcls.objectPath, objectPath));

      structuredLogger.info('Access rule added to database', {
        component: 'object-acl',
        metadata: {
          objectPath,
          requesterId,
          requesterTenantId,
          ruleType: rule.type,
          ruleId: rule.id,
          rulePermission: rule.permission
        }
      });

      return true;
    } catch (error) {
      structuredLogger.error('Failed to add access rule to database', {
        component: 'object-acl',
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          objectPath,
          requesterId,
          requesterTenantId
        }
      });
      return false;
    }
  }

  /**
   * Remove access rule from object
   */
  async removeAccessRule(
    objectPath: string,
    ruleType: string,
    ruleId: string,
    requesterId: string,
    requesterTenantId: string
  ): Promise<boolean> {
    try {
      // Check if requester has admin permission
      const hasAdmin = await this.checkPermission(objectPath, requesterId, requesterTenantId, 'admin');
      if (!hasAdmin) {
        return false;
      }

      const acl = await this.getObjectAcl(objectPath);
      if (!acl) {
        return false;
      }

      // Remove rule
      const initialLength = acl.accessRules.length;
      const updatedAccessRules = acl.accessRules.filter(
        rule => !(rule.type === ruleType && rule.id === ruleId)
      );

      if (updatedAccessRules.length === initialLength) {
        return false; // Rule not found
      }

      // Update ACL in database
      await db
        .update(objectAcls)
        .set({ 
          accessRules: updatedAccessRules,
          updatedAt: new Date()
        })
        .where(eq(objectAcls.objectPath, objectPath));

      structuredLogger.info('Access rule removed', {
        component: 'object-acl',
        metadata: {
          objectPath,
          requesterId,
          requesterTenantId,
          ruleType,
          ruleId
        }
      });

      return true;
    } catch (error) {
      structuredLogger.error('Failed to remove access rule', {
        component: 'object-acl',
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          objectPath,
          requesterId,
          requesterTenantId
        }
      });
      return false;
    }
  }

  /**
   * Update object visibility
   */
  async updateVisibility(
    objectPath: string,
    visibility: 'public' | 'private',
    requesterId: string,
    requesterTenantId: string
  ): Promise<boolean> {
    try {
      // Check if requester has admin permission
      const hasAdmin = await this.checkPermission(objectPath, requesterId, requesterTenantId, 'admin');
      if (!hasAdmin) {
        return false;
      }

      const acl = await this.getObjectAcl(objectPath);
      if (!acl) {
        return false;
      }

      // Update access rules based on new visibility
      let updatedAccessRules = [...acl.accessRules];
      
      if (visibility === 'public') {
        // Add tenant read access if not exists
        const hasTenantRead = updatedAccessRules.some(
          rule => rule.type === 'tenant' && rule.id === acl.ownerTenantId
        );
        if (!hasTenantRead) {
          updatedAccessRules.push({
            type: 'tenant',
            id: acl.ownerTenantId,
            permission: 'read'
          });
        }
      } else {
        // Remove tenant read access
        updatedAccessRules = updatedAccessRules.filter(
          rule => !(rule.type === 'tenant' && rule.id === acl.ownerTenantId && rule.permission === 'read')
        );
      }

      // Update ACL in database
      await db
        .update(objectAcls)
        .set({ 
          visibility,
          accessRules: updatedAccessRules,
          updatedAt: new Date()
        })
        .where(eq(objectAcls.objectPath, objectPath));

      structuredLogger.info('Object visibility updated', {
        component: 'object-acl',
        metadata: {
          objectPath,
          requesterId,
          requesterTenantId,
          visibility
        }
      });

      return true;
    } catch (error) {
      structuredLogger.error('Failed to update visibility', {
        component: 'object-acl',
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          objectPath,
          requesterId,
          requesterTenantId
        }
      });
      return false;
    }
  }

  /**
   * Delete object ACL
   */
  async deleteObjectAcl(
    objectPath: string,
    requesterId: string,
    requesterTenantId: string
  ): Promise<boolean> {
    try {
      // Check if requester has admin permission
      const hasAdmin = await this.checkPermission(objectPath, requesterId, requesterTenantId, 'admin');
      if (!hasAdmin) {
        return false;
      }

      // Delete ACL from database
      const deleteResult = await db
        .delete(objectAcls)
        .where(eq(objectAcls.objectPath, objectPath));

      const deleted = deleteResult.rowCount > 0;

      if (deleted) {
        structuredLogger.info('Object ACL deleted from database', {
          component: 'object-acl',
          metadata: {
            objectPath,
            requesterId,
            requesterTenantId
          }
        });
      }

      return deleted;
    } catch (error) {
      structuredLogger.error('Failed to delete object ACL', {
        component: 'object-acl',
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          objectPath,
          requesterId,
          requesterTenantId
        }
      });
      return false;
    }
  }

  /**
   * Check if access rule applies to user
   */
  private checkAccessRule(rule: AccessRule, userId: string, tenantId: string): boolean {
    switch (rule.type) {
      case 'user':
        return rule.id === userId;
      case 'tenant':
        return rule.id === tenantId;
      case 'public':
        return true;
      case 'role':
        // TODO: Implement role-based access when RBAC is needed
        return false;
      default:
        return false;
    }
  }

  /**
   * List objects accessible by user
   */
  async listAccessibleObjects(
    userId: string,
    tenantId: string,
    permission: 'read' | 'write' | 'delete' | 'admin' = 'read'
  ): Promise<string[]> {
    try {
      const accessibleObjects: string[] = [];

      for (const [objectPath, acl] of this.aclStorage.entries()) {
        const hasAccess = await this.checkPermission(objectPath, userId, tenantId, permission);
        if (hasAccess) {
          accessibleObjects.push(objectPath);
        }
      }

      return accessibleObjects;
    } catch (error) {
      structuredLogger.error('Failed to list accessible objects', {
        component: 'object-acl',
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          userId,
          tenantId,
          permission
        }
      });
      return [];
    }
  }
}

// Export singleton instance
export const objectAclService = new ObjectAclService();

// Note: Types are exported above where they are defined