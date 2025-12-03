import { eq, and, desc, count, inArray } from 'drizzle-orm';
import { db } from '../core/db.js';
import { 
  universalRequests, 
  teams, 
  teamWorkflowAssignments,
  users,
  userAssignments,
  userWorkflowAssignments,
  workflowInstances,
  workflowTemplates,
  notifications,
  type UniversalRequest,
  type InsertWorkflowInstance
} from '../db/schema/w3suite.js';
import { logger } from '../core/logger.js';

export interface RequestTriggerResult {
  success: boolean;
  workflowInstanceId?: string;
  message?: string;
  error?: string;
}

/**
 * Request Trigger Service
 * Automatizza la creazione di workflow instances quando arriva una universal request
 */
export class RequestTriggerService {
  
  /**
   * 🎯 MAIN METHOD: Triggered when a new universal request is created
   * Finds appropriate team and workflow, creates instance, and starts execution
   */
  static async triggerWorkflowForRequest(
    request: UniversalRequest, 
    tenantId: string
  ): Promise<RequestTriggerResult> {
    try {
      logger.info('🚀 Request Trigger Service: Starting workflow automation', {
        requestId: request.id,
        department: request.department,
        category: request.category,
        tenantId
      });

      // STEP 1: Find active team for this department (with fallback logic)
      const eligibleTeam = await this.findTeamForDepartmentWithFallback(request.department, tenantId);
      
      if (!eligibleTeam) {
        logger.warn('⚠️ No active team found even after fallback attempts', {
          department: request.department,
          tenantId,
          requestId: request.id
        });
        
        return {
          success: false,
          message: `No active team configured for department "${request.department}" and no fallback teams available`
        };
      }

      // STEP 2: Find workflow template assigned to this team for this department
      const workflowAssignment = await this.findWorkflowAssignment(
        eligibleTeam.id, 
        request.department, 
        tenantId
      );

      if (!workflowAssignment) {
        logger.warn('⚠️ No workflow template assigned to team for department', {
          teamId: eligibleTeam.id,
          teamName: eligibleTeam.name,
          department: request.department,
          tenantId,
          requestId: request.id
        });
        
        return {
          success: false,
          message: `No workflow template assigned to team "${eligibleTeam.name}" for department: ${request.department}`
        };
      }

      // STEP 3: Create workflow instance
      const workflowInstance = await this.createWorkflowInstance(
        workflowAssignment.templateId,
        request.id,
        tenantId,
        request.requesterId
      );

      // STEP 4: Update universal request with workflow instance ID
      await this.linkRequestToWorkflow(request.id, workflowInstance.id, tenantId);

      // STEP 5: Notify team supervisor(s) about the new request
      await this.notifyTeamSupervisors(eligibleTeam.id, request, workflowInstance.id, tenantId);

      logger.info('✅ Request Trigger Service: Workflow automation completed successfully', {
        requestId: request.id,
        workflowInstanceId: workflowInstance.id,
        teamId: eligibleTeam.id,
        templateId: workflowAssignment.templateId,
        department: request.department,
        tenantId
      });

      return {
        success: true,
        workflowInstanceId: workflowInstance.id,
        message: `Workflow automatically assigned to team "${eligibleTeam.name}"`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error('❌ Request Trigger Service: Failed to trigger workflow', {
        error: errorMessage,
        requestId: request.id,
        tenantId,
        stack: errorStack
      });

      return {
        success: false,
        error: `Workflow automation failed: ${errorMessage}`
      };
    }
  }

  /**
   * 🔄 STEP 1A: Find Team with Fallback Logic
   * Tries original department first, then fallback departments if no team found
   */
  private static async findTeamForDepartmentWithFallback(
    department: string, 
    tenantId: string
  ) {
    // 🎯 PRIMARY ATTEMPT: Try to find team for original department
    let eligibleTeam = await this.findTeamForDepartment(department, tenantId);
    
    if (eligibleTeam) {
      return eligibleTeam;
    }

    // 🔄 FALLBACK LOGIC: Define department fallback hierarchy
    const departmentFallbacks: Record<string, string[]> = {
      'hr': ['operations', 'support'],           // HR → Operations → Support
      'finance': ['hr', 'operations'],           // Finance → HR → Operations  
      'sales': ['support', 'operations'],        // Sales → Support → Operations
      'crm': ['sales', 'support'],              // CRM → Sales → Support
      'support': ['operations', 'hr'],          // Support → Operations → HR
      'operations': ['hr', 'support']           // Operations → HR → Support
    };

    const fallbackDepartments = departmentFallbacks[department] || [];

    // 🔍 TRY FALLBACK DEPARTMENTS in order
    for (const fallbackDept of fallbackDepartments) {
      logger.info('🔄 Trying fallback department', {
        originalDepartment: department,
        fallbackDepartment: fallbackDept,
        tenantId
      });

      eligibleTeam = await this.findTeamForDepartment(fallbackDept, tenantId);
      
      if (eligibleTeam) {
        logger.info('✅ Found team via fallback department', {
          originalDepartment: department,
          fallbackDepartment: fallbackDept,
          teamId: eligibleTeam.id,
          teamName: eligibleTeam.name
        });
        return eligibleTeam;
      }
    }

    // 🆘 LAST RESORT: Try to find any active team with auto-assign enabled
    const anyEligibleTeam = await this.findAnyAvailableTeam(tenantId);
    
    if (anyEligibleTeam) {
      logger.warn('⚠️ Using last resort team assignment', {
        originalDepartment: department,
        assignedTeamId: anyEligibleTeam.id,
        assignedTeamName: anyEligibleTeam.name,
        reason: 'No teams found for department or fallbacks'
      });
      return anyEligibleTeam;
    }

    // 🚫 NO TEAMS AVAILABLE
    logger.error('❌ No teams available for department or any fallbacks', {
      department,
      triedFallbacks: fallbackDepartments,
      tenantId
    });

    return null;
  }

  /**
   * 🆘 LAST RESORT: Find any available team when no department-specific teams exist
   */
  private static async findAnyAvailableTeam(tenantId: string) {
    const availableTeams = await db
      .select({
        teamId: teams.id,
        teamName: teams.name,
        teamType: teams.teamType,
        assignedDepartments: teams.assignedDepartments,
        workflowPriority: teamWorkflowAssignments.priority,
        templateId: teamWorkflowAssignments.templateId
      })
      .from(teams)
      .innerJoin(teamWorkflowAssignments, eq(teams.id, teamWorkflowAssignments.teamId))
      .where(and(
        eq(teams.tenantId, tenantId),
        eq(teams.isActive, true),
        eq(teamWorkflowAssignments.tenantId, tenantId),
        eq(teamWorkflowAssignments.autoAssign, true),
        eq(teamWorkflowAssignments.isActive, true)
      ))
      .orderBy(desc(teamWorkflowAssignments.priority))
      .limit(1);

    if (availableTeams.length > 0) {
      const team = availableTeams[0];
      return {
        id: team.teamId,
        name: team.teamName,
        teamType: team.teamType,
        assignedDepartments: team.assignedDepartments
      };
    }

    return null;
  }

  /**
   * 🔍 STEP 1B: Smart Team Selection with Priority Logic
   * Finds the BEST team for department using workflow assignment priorities
   */
  private static async findTeamForDepartment(
    department: string, 
    tenantId: string
  ) {
    // 🎯 ENHANCED QUERY: Join teams with their workflow assignments to get priority info
    const teamsWithWorkflowPriority = await db
      .select({
        teamId: teams.id,
        teamName: teams.name,
        teamType: teams.teamType,
        assignedDepartments: teams.assignedDepartments,
        workflowPriority: teamWorkflowAssignments.priority,
        templateId: teamWorkflowAssignments.templateId,
        autoAssign: teamWorkflowAssignments.autoAssign
      })
      .from(teams)
      .innerJoin(teamWorkflowAssignments, eq(teams.id, teamWorkflowAssignments.teamId))
      .where(and(
        eq(teams.tenantId, tenantId),
        eq(teams.isActive, true),
        eq(teamWorkflowAssignments.tenantId, tenantId),
        eq(teamWorkflowAssignments.forDepartment, department as any),
        eq(teamWorkflowAssignments.autoAssign, true),
        eq(teamWorkflowAssignments.isActive, true)
      ))
      .orderBy(
        desc(teamWorkflowAssignments.priority), // Highest priority first
        desc(teams.createdAt) // Newest team as tiebreaker
      );

    if (teamsWithWorkflowPriority.length === 0) {
      logger.warn('⚠️ No teams with workflow assignments found for department', {
        department,
        tenantId
      });
      return null;
    }

    // 🎯 PRIORITY LOGIC: Group teams by priority and apply load balancing within same priority
    const teamsByPriority = teamsWithWorkflowPriority.reduce((acc, team) => {
      const priority = team.workflowPriority || 100;
      if (!acc[priority]) acc[priority] = [];
      acc[priority].push(team);
      return acc;
    }, {} as Record<number, typeof teamsWithWorkflowPriority>);

    // Get highest priority teams
    const priorities = Object.keys(teamsByPriority).map(Number).sort((a, b) => b - a);
    const highestPriority = priorities[0];
    const highestPriorityTeams = teamsByPriority[highestPriority];

    // 🔄 LOAD BALANCING: If multiple teams have same priority, use round-robin selection
    const selectedTeam = await this.selectTeamWithLoadBalancing(highestPriorityTeams, department, tenantId);

    logger.info('🎯 Smart team selection completed', {
      selectedTeamId: selectedTeam.teamId,
      selectedTeamName: selectedTeam.teamName,
      priority: selectedTeam.workflowPriority,
      department,
      totalEligibleTeams: teamsWithWorkflowPriority.length,
      priorityGroups: Object.keys(teamsByPriority).length
    });

    return {
      id: selectedTeam.teamId,
      name: selectedTeam.teamName,
      teamType: selectedTeam.teamType,
      assignedDepartments: selectedTeam.assignedDepartments
    };
  }

  /**
   * 🔄 LOAD BALANCING: Round-robin selection among teams with same priority
   */
  private static async selectTeamWithLoadBalancing(
    teams: any[],
    department: string,
    tenantId: string
  ) {
    if (teams.length === 1) {
      return teams[0];
    }

    // 📊 Get request counts for each team in the last 24 hours to balance load
    const teamRequestCounts = await db
      .select({
        teamId: teamWorkflowAssignments.teamId,
        requestCount: count(universalRequests.id)
      })
      .from(teamWorkflowAssignments)
      .leftJoin(workflowInstances, eq(teamWorkflowAssignments.templateId, workflowInstances.templateId))
      .leftJoin(universalRequests, eq(workflowInstances.referenceId, universalRequests.id))
      .where(and(
        eq(teamWorkflowAssignments.tenantId, tenantId),
        eq(teamWorkflowAssignments.forDepartment, department as any),
        inArray(teamWorkflowAssignments.teamId, teams.map(t => t.teamId))
      ))
      .groupBy(teamWorkflowAssignments.teamId);

    // Create map for quick lookup
    const requestCountMap = teamRequestCounts.reduce((acc, item) => {
      acc[item.teamId] = item.requestCount;
      return acc;
    }, {} as Record<string, number>);

    // 🎯 SELECT TEAM: Choose team with lowest request count (load balancing)
    const teamWithLowestLoad = teams.reduce((bestTeam, currentTeam) => {
      const currentLoad = requestCountMap[currentTeam.teamId] || 0;
      const bestLoad = requestCountMap[bestTeam.teamId] || 0;
      
      return currentLoad < bestLoad ? currentTeam : bestTeam;
    });

    logger.info('⚖️ Load balancing applied', {
      selectedTeam: teamWithLowestLoad.teamName,
      teamLoads: teams.map(t => ({
        team: t.teamName,
        load: requestCountMap[t.teamId] || 0
      })),
      department
    });

    return teamWithLowestLoad;
  }

  /**
   * 🔍 STEP 2: Find workflow template assignment for team and department
   */
  private static async findWorkflowAssignment(
    teamId: string, 
    department: string, 
    tenantId: string
  ) {
    const [assignment] = await db
      .select({
        id: teamWorkflowAssignments.id,
        teamId: teamWorkflowAssignments.teamId,
        templateId: teamWorkflowAssignments.templateId,
        forDepartment: teamWorkflowAssignments.forDepartment,
        autoAssign: teamWorkflowAssignments.autoAssign,
        priority: teamWorkflowAssignments.priority,
        conditions: teamWorkflowAssignments.conditions,
        overrides: teamWorkflowAssignments.overrides
      })
      .from(teamWorkflowAssignments)
      .where(and(
        eq(teamWorkflowAssignments.tenantId, tenantId),
        eq(teamWorkflowAssignments.teamId, teamId),
        eq(teamWorkflowAssignments.forDepartment, department as any),
        eq(teamWorkflowAssignments.autoAssign, true),
        eq(teamWorkflowAssignments.isActive, true)
      ))
      .orderBy(desc(teamWorkflowAssignments.priority));

    if (assignment) {
      logger.info('📋 Found workflow assignment', {
        assignmentId: assignment.id,
        teamId: assignment.teamId,
        templateId: assignment.templateId,
        department: assignment.forDepartment,
        priority: assignment.priority
      });
    }

    return assignment;
  }

  /**
   * ⚡ STEP 3: Create workflow instance
   */
  private static async createWorkflowInstance(
    templateId: string,
    referenceId: string,
    tenantId: string,
    initiatorId: string
  ) {
    const workflowInstanceData: InsertWorkflowInstance = {
      tenantId,
      templateId,
      referenceId, // Link to universal request
      instanceType: 'approval',
      instanceName: `Auto-generated for request ${referenceId}`,
      category: 'request',
      currentStepId: '0',
      variables: {},
      metadata: {
        triggeredBy: 'request-trigger-service',
        autoCreated: true,
        timestamp: new Date().toISOString(),
        initiatorId
      },
      createdBy: initiatorId
    };

    const [newInstance] = await db
      .insert(workflowInstances)
      .values(workflowInstanceData)
      .returning();

    logger.info('⚡ Created workflow instance', {
      instanceId: newInstance.id,
      templateId,
      referenceId,
      tenantId
    });

    return newInstance;
  }

  /**
   * 🔗 STEP 4: Link universal request to workflow instance
   */
  private static async linkRequestToWorkflow(
    requestId: string,
    workflowInstanceId: string,
    tenantId: string
  ) {
    await db
      .update(universalRequests)
      .set({ 
        workflowInstanceId,
        status: 'pending', // Move from draft to pending
        submittedAt: new Date()
      })
      .where(and(
        eq(universalRequests.id, requestId),
        eq(universalRequests.tenantId, tenantId)
      ));

    logger.info('🔗 Linked request to workflow instance', {
      requestId,
      workflowInstanceId,
      tenantId
    });
  }

  /**
   * 🔍 HELPER: Get workflow automation status for a request
   */
  static async getAutomationStatus(requestId: string, tenantId: string) {
    const [request] = await db
      .select({
        id: universalRequests.id,
        workflowInstanceId: universalRequests.workflowInstanceId,
        status: universalRequests.status,
        department: universalRequests.department
      })
      .from(universalRequests)
      .where(and(
        eq(universalRequests.id, requestId),
        eq(universalRequests.tenantId, tenantId)
      ));

    return {
      hasWorkflow: !!request?.workflowInstanceId,
      workflowInstanceId: request?.workflowInstanceId,
      status: request?.status,
      department: request?.department
    };
  }

  /**
   * 👤 FIND USERS FOR DEPARTMENT
   * Finds eligible users for a department based on user_workflow_assignments
   * Used by UserRoutingExecutor in auto mode
   */
  static async findUsersForDepartment(
    department: string, 
    tenantId: string,
    templateId?: string
  ): Promise<Array<{ id: string; name: string; email: string }>> {
    try {
      logger.info('👤 Finding users for department', {
        department,
        tenantId,
        templateId
      });

      // Query user_workflow_assignments with priority ordering
      const queryConditions = [
        eq(userWorkflowAssignments.tenantId, tenantId),
        eq(userWorkflowAssignments.forDepartment, department as any),
        eq(userWorkflowAssignments.autoAssign, true),
        eq(userWorkflowAssignments.isActive, true),
        eq(users.isActive, true)
      ];

      // If templateId specified, filter by it
      if (templateId) {
        queryConditions.push(eq(userWorkflowAssignments.templateId, templateId));
      }

      const usersWithAssignments = await db
        .select({
          userId: users.id,
          userName: users.name,
          userEmail: users.email,
          priority: userWorkflowAssignments.priority,
          templateId: userWorkflowAssignments.templateId
        })
        .from(userWorkflowAssignments)
        .innerJoin(users, eq(userWorkflowAssignments.userId, users.id))
        .where(and(...queryConditions))
        .orderBy(
          desc(userWorkflowAssignments.priority), // Highest priority first
          desc(userWorkflowAssignments.createdAt) // Newest assignment as tiebreaker
        );

      if (usersWithAssignments.length === 0) {
        logger.warn('⚠️ No users with workflow assignments found for department', {
          department,
          tenantId,
          templateId
        });
        return [];
      }

      const result = usersWithAssignments.map(u => ({
        id: u.userId,
        name: u.userName || 'Unknown User',
        email: u.userEmail || ''
      }));

      logger.info('✅ Found users for department', {
        department,
        userCount: result.length,
        users: result.map(u => ({ id: u.id, name: u.name }))
      });

      return result;

    } catch (error) {
      logger.error('❌ Failed to find users for department', {
        error: error instanceof Error ? error.message : String(error),
        department,
        tenantId
      });
      return [];
    }
  }

  /**
   * 📢 STEP 5: Notify Team Supervisors about new request
   * Sends in-app notification to team supervisor(s) when a new request is assigned
   * Supports both user-based and role-based supervisor assignments
   */
  private static async notifyTeamSupervisors(
    teamId: string,
    request: UniversalRequest,
    workflowInstanceId: string,
    tenantId: string
  ): Promise<void> {
    try {
      // Get team with supervisor info (both user and role based)
      const [team] = await db
        .select({
          id: teams.id,
          name: teams.name,
          primarySupervisorUser: teams.primarySupervisorUser,
          secondarySupervisorUser: teams.secondarySupervisorUser,
          primarySupervisorRole: teams.primarySupervisorRole,
          secondarySupervisorRoles: teams.secondarySupervisorRoles
        })
        .from(teams)
        .where(and(
          eq(teams.id, teamId),
          eq(teams.tenantId, tenantId)
        ));

      if (!team) {
        logger.warn('⚠️ Team not found for notification', { teamId, tenantId });
        return;
      }

      // Get requester info for notification message
      const [requester] = await db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email
        })
        .from(users)
        .where(eq(users.id, request.requesterId));

      const requesterName = requester 
        ? `${requester.firstName || ''} ${requester.lastName || ''}`.trim() || requester.email
        : 'Un utente';

      // Collect supervisor IDs to notify (use Set to avoid duplicates)
      const supervisorIds = new Set<string>();
      
      // 1. Add user-based supervisors
      if (team.primarySupervisorUser) {
        supervisorIds.add(team.primarySupervisorUser);
      }
      if (team.secondarySupervisorUser) {
        supervisorIds.add(team.secondarySupervisorUser);
      }

      // 2. If no user-based supervisors, try role-based supervisors
      if (supervisorIds.size === 0) {
        const roleIds: string[] = [];
        
        if (team.primarySupervisorRole) {
          roleIds.push(team.primarySupervisorRole);
        }
        if (team.secondarySupervisorRoles && team.secondarySupervisorRoles.length > 0) {
          roleIds.push(...team.secondarySupervisorRoles);
        }

        if (roleIds.length > 0) {
          // Find users assigned to these supervisor roles
          const usersWithSupervisorRoles = await db
            .select({ userId: userAssignments.userId })
            .from(userAssignments)
            .where(inArray(userAssignments.roleId, roleIds));

          usersWithSupervisorRoles.forEach(u => supervisorIds.add(u.userId));

          logger.info('🔍 Found role-based supervisors', {
            teamId: team.id,
            roleIds,
            foundUsers: usersWithSupervisorRoles.length
          });
        }
      }

      // 3. If still no supervisors, log warning and return
      if (supervisorIds.size === 0) {
        logger.warn('⚠️ No supervisors (user or role-based) configured for team', { 
          teamId: team.id, 
          teamName: team.name,
          hasUserSupervisors: !!(team.primarySupervisorUser || team.secondarySupervisorUser),
          hasRoleSupervisors: !!(team.primarySupervisorRole || (team.secondarySupervisorRoles && team.secondarySupervisorRoles.length > 0))
        });
        return;
      }

      // Create notifications for all supervisors
      const supervisorIdsArray = Array.from(supervisorIds);
      const notificationsToInsert = supervisorIdsArray.map(supervisorId => ({
        tenantId,
        targetUserId: supervisorId,
        type: 'custom' as const,
        title: 'Nuova Richiesta Ricevuta',
        message: `${requesterName} ha inviato una nuova richiesta ${request.category ? `(${request.category})` : ''} per il dipartimento ${request.department}`,
        priority: 'high' as const,
        status: 'unread' as const,
        data: {
          notificationType: 'new_request_assigned',
          requestId: request.id,
          requestTitle: request.title,
          requestCategory: request.category,
          department: request.department,
          workflowInstanceId,
          teamId: team.id,
          teamName: team.name,
          requesterId: request.requesterId,
          requesterName,
          actionRequired: 'review',
          link: `/hr/requests?requestId=${request.id}`
        },
        createdAt: new Date()
      }));

      await db.insert(notifications).values(notificationsToInsert);

      logger.info('📢 Notified team supervisors about new request', {
        teamId: team.id,
        teamName: team.name,
        requestId: request.id,
        supervisorCount: supervisorIdsArray.length,
        supervisorIds: supervisorIdsArray,
        notificationMethod: team.primarySupervisorUser || team.secondarySupervisorUser ? 'user-based' : 'role-based'
      });

    } catch (error) {
      // Don't fail the request if notification fails
      logger.error('❌ Failed to notify team supervisors', {
        error: error instanceof Error ? error.message : String(error),
        teamId,
        requestId: request.id,
        tenantId
      });
    }
  }
}