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
   * 
   * ROUTING LOGIC (FUNCTIONAL FIRST):
   * 1. Find teams where the requester is a member for the request's department
   * 2. Prioritize FUNCTIONAL teams (1 user = max 1 functional team per department)
   * 3. For TEMPORARY teams: notify all supervisors (First Wins pattern)
   * 4. Fallback to department-based team selection if user has no team membership
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
        requesterId: request.requesterId,
        tenantId
      });

      // 🎯 STEP 1: FUNCTIONAL FIRST - Find teams where requester is a member
      const userTeams = await this.findTeamsForUserByDepartment(
        request.requesterId, 
        request.department, 
        tenantId
      );

      let eligibleTeam: { id: string; name: string; teamType: string; assignedDepartments: string[] } | null = null;
      let isTemporaryRouting = false;
      let allTemporaryTeams: typeof userTeams = [];

      if (userTeams.length > 0) {
        // 🔒 FUNCTIONAL FIRST: Prioritize functional teams
        const functionalTeam = userTeams.find(t => t.teamType === 'functional');
        
        if (functionalTeam) {
          eligibleTeam = functionalTeam;
          logger.info('🔒 FUNCTIONAL FIRST: Using user\'s functional team', {
            teamId: functionalTeam.id,
            teamName: functionalTeam.name,
            userId: request.requesterId,
            department: request.department
          });
        } else {
          // No functional team found - use temporary teams with First Wins logic
          allTemporaryTeams = userTeams.filter(t => ['temporary', 'project'].includes(t.teamType));
          
          if (allTemporaryTeams.length > 0) {
            eligibleTeam = allTemporaryTeams[0]; // Primary team for workflow assignment
            isTemporaryRouting = allTemporaryTeams.length > 1;
            
            logger.info('⏰ TEMPORARY ROUTING: Multiple temporary teams found', {
              primaryTeamId: eligibleTeam.id,
              primaryTeamName: eligibleTeam.name,
              totalTemporaryTeams: allTemporaryTeams.length,
              temporaryTeamNames: allTemporaryTeams.map(t => t.name),
              firstWinsEnabled: isTemporaryRouting,
              userId: request.requesterId
            });
          } else {
            // Fallback to any team the user belongs to
            eligibleTeam = userTeams[0];
          }
        }
      }

      // 🔄 FALLBACK: If no user-based team found, use department-based selection
      if (!eligibleTeam) {
        logger.info('🔄 No user team membership found, falling back to department-based selection', {
          userId: request.requesterId,
          department: request.department
        });
        
        // Only use department fallback if department is present
        if (request.department) {
          eligibleTeam = await this.findTeamForDepartmentWithFallback(request.department, tenantId);
        } else {
          // No department - use legacy "any available team" logic
          logger.info('🔍 Request has no department, using any available team fallback', {
            requestId: request.id,
            tenantId
          });
          eligibleTeam = await this.findAnyAvailableTeam(tenantId);
        }
      }
      
      if (!eligibleTeam) {
        const departmentInfo = request.department || 'nessun dipartimento specificato';
        logger.warn('⚠️ No active team found even after fallback attempts', {
          department: request.department,
          tenantId,
          requestId: request.id
        });
        
        return {
          success: false,
          message: `No active team configured for "${departmentInfo}" and no fallback teams available`
        };
      }

      // STEP 2: Find workflow template assigned to this team for this department
      const workflowAssignment = await this.findWorkflowAssignment(
        eligibleTeam.id, 
        request.department, 
        tenantId
      );

      if (!workflowAssignment) {
        const departmentLabel = request.department || 'any department';
        logger.warn('⚠️ No workflow template assigned to team for department', {
          teamId: eligibleTeam.id,
          teamName: eligibleTeam.name,
          department: request.department,
          tenantId,
          requestId: request.id
        });
        
        return {
          success: false,
          message: `No workflow template assigned to team "${eligibleTeam.name}" for ${departmentLabel}`
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
      // 🔒 FUNCTIONAL or single team: Notify only that team's supervisors
      // ⏰ TEMPORARY (multiple teams): Notify ALL team supervisors (First Wins pattern)
      const allNotifiedSupervisors: string[] = [];
      const allNotifiedTeams: { id: string; name: string; teamType: string }[] = [];

      if (isTemporaryRouting && allTemporaryTeams.length > 1) {
        logger.info('⏰ FIRST WINS ROUTING: Notifying supervisors from ALL temporary teams', {
          requestId: request.id,
          temporaryTeamsCount: allTemporaryTeams.length,
          temporaryTeamNames: allTemporaryTeams.map(t => t.name)
        });
        
        // Notify supervisors from ALL temporary teams (first to respond wins)
        for (const tempTeam of allTemporaryTeams) {
          const notifiedIds = await this.notifyTeamSupervisors(tempTeam.id, request, workflowInstance.id, tenantId);
          allNotifiedSupervisors.push(...notifiedIds);
          allNotifiedTeams.push({
            id: tempTeam.id,
            name: tempTeam.name,
            teamType: tempTeam.teamType
          });
        }
      } else {
        // Standard routing: only primary team supervisors
        const notifiedIds = await this.notifyTeamSupervisors(eligibleTeam.id, request, workflowInstance.id, tenantId);
        allNotifiedSupervisors.push(...notifiedIds);
        allNotifiedTeams.push({
          id: eligibleTeam.id,
          name: eligibleTeam.name,
          teamType: eligibleTeam.teamType
        });
      }

      // STEP 6: Update request metadata for First Wins tracking
      await this.updateRequestMetadataForFirstWins(
        request.id,
        [...new Set(allNotifiedSupervisors)], // Remove duplicates
        allNotifiedTeams,
        tenantId
      );

      const routingType = isTemporaryRouting ? 'TEMPORARY_FIRST_WINS' : 
                          (eligibleTeam.teamType === 'functional' ? 'FUNCTIONAL_PRIMARY' : 'STANDARD');

      logger.info('✅ Request Trigger Service: Workflow automation completed successfully', {
        requestId: request.id,
        workflowInstanceId: workflowInstance.id,
        teamId: eligibleTeam.id,
        templateId: workflowAssignment.templateId,
        department: request.department,
        tenantId,
        routingType,
        temporaryTeamsNotified: isTemporaryRouting ? allTemporaryTeams.length : 0
      });

      return {
        success: true,
        workflowInstanceId: workflowInstance.id,
        message: isTemporaryRouting 
          ? `Workflow assigned with First Wins routing to ${allTemporaryTeams.length} temporary team supervisors`
          : `Workflow automatically assigned to team "${eligibleTeam.name}"`
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
   * 🎯 FUNCTIONAL FIRST: Find teams where user is a member, filtered by department
   * Returns teams ordered by teamType priority: functional first, then temporary/project
   * Handles gracefully: missing department, teams with null/empty assignedDepartments (universal teams)
   */
  private static async findTeamsForUserByDepartment(
    userId: string,
    department: string | null | undefined,
    tenantId: string
  ): Promise<{ id: string; name: string; teamType: string; assignedDepartments: string[] }[]> {
    // If no department, find user's teams without department filter
    // These would be teams where user is a member, regardless of department
    if (!department) {
      logger.info('🔍 No department specified, finding all user teams', { userId, tenantId });
      
      const allUserTeams = await db.execute<{
        id: string;
        name: string;
        team_type: string;
        assigned_departments: string[];
      }>(`
        SELECT 
          id, name, team_type, assigned_departments
        FROM w3suite.teams
        WHERE tenant_id = $1
          AND is_active = true
          AND $2 = ANY(user_members)
        ORDER BY 
          CASE team_type 
            WHEN 'functional' THEN 1 
            WHEN 'specialized' THEN 2
            WHEN 'cross_functional' THEN 3
            WHEN 'project' THEN 4
            WHEN 'temporary' THEN 5
            ELSE 6 
          END,
          created_at DESC
      `, [tenantId, userId]);

      return allUserTeams.rows.map(row => ({
        id: row.id,
        name: row.name,
        teamType: row.team_type,
        assignedDepartments: row.assigned_departments || []
      }));
    }

    // Query teams where:
    // 1. User is a member (in user_members array)
    // 2. Team handles this department OR has no department restrictions (null/empty assigned_departments)
    const teamsWithMembership = await db.execute<{
      id: string;
      name: string;
      team_type: string;
      assigned_departments: string[];
    }>(`
      SELECT 
        id, name, team_type, assigned_departments
      FROM w3suite.teams
      WHERE tenant_id = $1
        AND is_active = true
        AND $2 = ANY(user_members)
        AND (
          $3 = ANY(assigned_departments)
          OR assigned_departments IS NULL 
          OR array_length(assigned_departments, 1) IS NULL
        )
      ORDER BY 
        CASE team_type 
          WHEN 'functional' THEN 1 
          WHEN 'specialized' THEN 2
          WHEN 'cross_functional' THEN 3
          WHEN 'project' THEN 4
          WHEN 'temporary' THEN 5
          ELSE 6 
        END,
        created_at DESC
    `, [tenantId, userId, department]);

    const result = teamsWithMembership.rows.map(row => ({
      id: row.id,
      name: row.name,
      teamType: row.team_type,
      assignedDepartments: row.assigned_departments || []
    }));

    logger.info('🔍 Found teams for user by department', {
      userId,
      department,
      teamsFound: result.length,
      teamNames: result.map(t => `${t.name} (${t.teamType})`)
    });

    return result;
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
   * Strategy: 
   * 1. If department provided, try to find specific assignment
   * 2. If not found (or no department), find any active assignment for the team
   */
  private static async findWorkflowAssignment(
    teamId: string, 
    department: string | null | undefined, 
    tenantId: string
  ) {
    // Base conditions always applied
    const baseConditions = [
      eq(teamWorkflowAssignments.tenantId, tenantId),
      eq(teamWorkflowAssignments.teamId, teamId),
      eq(teamWorkflowAssignments.autoAssign, true),
      eq(teamWorkflowAssignments.isActive, true)
    ];

    // ATTEMPT 1: Try to find department-specific assignment
    if (department) {
      const [departmentAssignment] = await db
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
        .where(and(...baseConditions, eq(teamWorkflowAssignments.forDepartment, department as any)))
        .orderBy(desc(teamWorkflowAssignments.priority));

      if (departmentAssignment) {
        logger.info('📋 Found department-specific workflow assignment', {
          assignmentId: departmentAssignment.id,
          teamId: departmentAssignment.teamId,
          templateId: departmentAssignment.templateId,
          department: departmentAssignment.forDepartment,
          priority: departmentAssignment.priority
        });
        return departmentAssignment;
      }
    }

    // ATTEMPT 2: Fall back to any active assignment for this team
    const [anyAssignment] = await db
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
      .where(and(...baseConditions))
      .orderBy(desc(teamWorkflowAssignments.priority));

    if (anyAssignment) {
      logger.info('📋 Found fallback workflow assignment (any department)', {
        assignmentId: anyAssignment.id,
        teamId: anyAssignment.teamId,
        templateId: anyAssignment.templateId,
        actualDepartment: anyAssignment.forDepartment,
        requestedDepartment: department || 'null',
        priority: anyAssignment.priority
      });
    }

    return anyAssignment;
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
    const workflowInstanceData = {
      tenantId,
      templateId,
      referenceId, // Link to universal request
      instanceType: 'approval',
      instanceName: `Auto-generated for request ${referenceId}`,
      category: 'request',
      currentStepId: '0',
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
        sql`${users.status} = 'Operativo'`
      ];

      // If templateId specified, filter by it
      if (templateId) {
        queryConditions.push(eq(userWorkflowAssignments.templateId, templateId));
      }

      const usersWithAssignments = await db
        .select({
          userId: users.id,
          userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`.as('userName'),
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
   * @returns Array of notified supervisor IDs for First Wins tracking
   */
  private static async notifyTeamSupervisors(
    teamId: string,
    request: UniversalRequest,
    workflowInstanceId: string,
    tenantId: string
  ): Promise<string[]> {
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

      // 3. If still no supervisors, log warning and return empty array
      if (supervisorIds.size === 0) {
        logger.warn('⚠️ No supervisors (user or role-based) configured for team', { 
          teamId: team.id, 
          teamName: team.name,
          hasUserSupervisors: !!(team.primarySupervisorUser || team.secondarySupervisorUser),
          hasRoleSupervisors: !!(team.primarySupervisorRole || (team.secondarySupervisorRoles && team.secondarySupervisorRoles.length > 0))
        });
        return [];
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

      return supervisorIdsArray;

    } catch (error) {
      // Don't fail the request if notification fails
      logger.error('❌ Failed to notify team supervisors', {
        error: error instanceof Error ? error.message : String(error),
        teamId,
        requestId: request.id,
        tenantId
      });
      return [];
    }
  }

  /**
   * 📊 Update request metadata with First Wins tracking info
   * Uses deep merge to preserve existing nested metadata fields
   */
  private static async updateRequestMetadataForFirstWins(
    requestId: string,
    notifiedSupervisors: string[],
    notifiedTeams: { id: string; name: string; teamType: string }[],
    tenantId: string
  ): Promise<void> {
    try {
      // Get current metadata
      const [request] = await db
        .select({ metadata: universalRequests.metadata })
        .from(universalRequests)
        .where(and(
          eq(universalRequests.id, requestId),
          eq(universalRequests.tenantId, tenantId)
        ));

      const existingMetadata = (request?.metadata as Record<string, any>) || {};
      
      // Create First Wins routing data in a dedicated namespace to avoid conflicts
      const firstWinsData = {
        enabled: notifiedTeams.length > 1,
        notifiedSupervisors: notifiedSupervisors,
        notifiedTeams: notifiedTeams.map(t => ({
          id: t.id,
          name: t.name,
          teamType: t.teamType
        })),
        routingTimestamp: new Date().toISOString(),
        status: 'pending' // Will be updated to 'handled' when supervisor responds
      };
      
      // Deep merge: preserve all existing metadata and add/update firstWinsRouting
      const updatedMetadata = {
        ...existingMetadata,
        // Preserve existing routing if it exists, merge with new data
        firstWinsRouting: existingMetadata.firstWinsRouting 
          ? { ...existingMetadata.firstWinsRouting, ...firstWinsData }
          : firstWinsData
      };

      await db.update(universalRequests)
        .set({ 
          metadata: updatedMetadata,
          updatedAt: new Date()
        })
        .where(eq(universalRequests.id, requestId));

      logger.info('📊 Updated request metadata for First Wins tracking', {
        requestId,
        supervisorCount: notifiedSupervisors.length,
        teamCount: notifiedTeams.length,
        isFirstWins: notifiedTeams.length > 1
      });

    } catch (error) {
      logger.error('❌ Failed to update request metadata for First Wins', {
        error: error instanceof Error ? error.message : String(error),
        requestId,
        tenantId
      });
    }
  }
}