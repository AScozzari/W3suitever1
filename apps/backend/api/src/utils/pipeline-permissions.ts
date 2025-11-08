import { db } from '../core/db';
import { eq, and, inArray } from 'drizzle-orm';
import { crmPipelineSettings, teams, users } from '../db/schema/w3suite';

export type PipelineAction = 'create' | 'modify' | 'delete';

/**
 * Check if a user can perform an action on a pipeline based on hierarchical RBAC
 * 
 * Hierarchy:
 * 1. Parent Access: assignedTeams[] (team members get base access)
 * 2. Role-based Permissions:
 *    - 'all' → all team members
 *    - 'deal_managers' → dealManagementUsers[]
 *    - 'pipeline_admins' → pipelineAdmins[]
 *    - 'supervisor_only' → team supervisor
 *    - 'custom' → custom users for this action
 *    - 'none' → nobody
 */
export async function canUserPerformAction(
  userId: string,
  pipelineId: string,
  action: PipelineAction
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    // 1. Fetch pipeline settings
    const [settings] = await db
      .select()
      .from(crmPipelineSettings)
      .where(eq(crmPipelineSettings.pipelineId, pipelineId));

    if (!settings) {
      return { allowed: false, reason: 'Pipeline settings not found' };
    }

    // 2. Determine permission mode based on action
    let mode: string;
    let customUsers: string[] = [];

    switch (action) {
      case 'create':
        mode = settings.dealCreationMode || 'all';
        customUsers = settings.dealCreationUsers || [];
        break;
      case 'modify':
        mode = settings.stateModificationMode || 'all';
        customUsers = settings.stateModificationUsers || [];
        break;
      case 'delete':
        mode = settings.dealDeletionMode || 'admins';
        customUsers = settings.dealDeletionUsers || [];
        break;
      default:
        return { allowed: false, reason: 'Invalid action' };
    }

    // 3. Check permission based on mode
    switch (mode) {
      case 'none':
        return { allowed: false, reason: 'Action disabled for all users' };

      case 'all':
        // All team members allowed - check if user in any assigned team
        return await isUserInTeams(userId, settings.assignedTeams || []);

      case 'deal_managers':
        // Only deal managers (dealManagementUsers)
        if (settings.dealManagementUsers?.includes(userId)) {
          return { allowed: true };
        }
        return { allowed: false, reason: 'User not in deal managers list' };

      case 'pipeline_admins':
        // Only pipeline admins
        if (settings.pipelineAdmins?.includes(userId)) {
          return { allowed: true };
        }
        return { allowed: false, reason: 'User not a pipeline admin' };

      case 'supervisor_only':
        // Only team supervisor
        return await isUserSupervisorOfTeams(userId, settings.assignedTeams || []);

      case 'custom':
        // Custom users list for this action
        if (customUsers.includes(userId)) {
          return { allowed: true };
        }
        return { allowed: false, reason: 'User not in custom permissions list' };

      case 'admins':
        // Legacy mode - same as pipeline_admins
        if (settings.pipelineAdmins?.includes(userId)) {
          return { allowed: true };
        }
        return { allowed: false, reason: 'User not a pipeline admin' };

      default:
        return { allowed: false, reason: `Unknown permission mode: ${mode}` };
    }
  } catch (error) {
    console.error('[PIPELINE-PERMISSIONS] Error checking user permissions:', error);
    return { allowed: false, reason: 'Error checking permissions' };
  }
}

/**
 * Check if user is member of any of the given teams
 */
async function isUserInTeams(userId: string, teamIds: string[]): Promise<{ allowed: boolean; reason?: string }> {
  if (!teamIds || teamIds.length === 0) {
    return { allowed: false, reason: 'No teams assigned to pipeline' };
  }

  const userTeams = await db
    .select({ id: teams.id })
    .from(teams)
    .where(
      and(
        inArray(teams.id, teamIds),
        // Check if user in userMembers array
        // Note: This is PostgreSQL array contains syntax
        // @ts-ignore - Drizzle array contains
        sql`${userId} = ANY(${teams.userMembers})`
      )
    );

  if (userTeams.length > 0) {
    return { allowed: true };
  }

  return { allowed: false, reason: 'User not a member of pipeline teams' };
}

/**
 * Check if user is supervisor of any of the given teams
 */
async function isUserSupervisorOfTeams(userId: string, teamIds: string[]): Promise<{ allowed: boolean; reason?: string }> {
  if (!teamIds || teamIds.length === 0) {
    return { allowed: false, reason: 'No teams assigned to pipeline' };
  }

  const supervisorTeams = await db
    .select({ id: teams.id })
    .from(teams)
    .where(
      and(
        inArray(teams.id, teamIds),
        eq(teams.supervisorUserId, userId)
      )
    );

  if (supervisorTeams.length > 0) {
    return { allowed: true };
  }

  return { allowed: false, reason: 'User not supervisor of pipeline teams' };
}
