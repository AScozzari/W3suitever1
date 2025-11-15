"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestTriggerService = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const db_js_1 = require("../core/db.js");
const w3suite_js_1 = require("../db/schema/w3suite.js");
const logger_js_1 = require("../core/logger.js");
/**
 * Request Trigger Service
 * Automatizza la creazione di workflow instances quando arriva una universal request
 */
class RequestTriggerService {
    /**
     * 🎯 MAIN METHOD: Triggered when a new universal request is created
     * Finds appropriate team and workflow, creates instance, and starts execution
     */
    static async triggerWorkflowForRequest(request, tenantId) {
        try {
            logger_js_1.logger.info('🚀 Request Trigger Service: Starting workflow automation', {
                requestId: request.id,
                department: request.department,
                category: request.category,
                tenantId
            });
            // STEP 1: Find active team for this department (with fallback logic)
            const eligibleTeam = await this.findTeamForDepartmentWithFallback(request.department, tenantId);
            if (!eligibleTeam) {
                logger_js_1.logger.warn('⚠️ No active team found even after fallback attempts', {
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
            const workflowAssignment = await this.findWorkflowAssignment(eligibleTeam.id, request.department, tenantId);
            if (!workflowAssignment) {
                logger_js_1.logger.warn('⚠️ No workflow template assigned to team for department', {
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
            const workflowInstance = await this.createWorkflowInstance(workflowAssignment.templateId, request.id, tenantId, request.requesterId);
            // STEP 4: Update universal request with workflow instance ID
            await this.linkRequestToWorkflow(request.id, workflowInstance.id, tenantId);
            logger_js_1.logger.info('✅ Request Trigger Service: Workflow automation completed successfully', {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            logger_js_1.logger.error('❌ Request Trigger Service: Failed to trigger workflow', {
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
    static async findTeamForDepartmentWithFallback(department, tenantId) {
        // 🎯 PRIMARY ATTEMPT: Try to find team for original department
        let eligibleTeam = await this.findTeamForDepartment(department, tenantId);
        if (eligibleTeam) {
            return eligibleTeam;
        }
        // 🔄 FALLBACK LOGIC: Define department fallback hierarchy
        const departmentFallbacks = {
            'hr': ['operations', 'support'], // HR → Operations → Support
            'finance': ['hr', 'operations'], // Finance → HR → Operations  
            'sales': ['support', 'operations'], // Sales → Support → Operations
            'crm': ['sales', 'support'], // CRM → Sales → Support
            'support': ['operations', 'hr'], // Support → Operations → HR
            'operations': ['hr', 'support'] // Operations → HR → Support
        };
        const fallbackDepartments = departmentFallbacks[department] || [];
        // 🔍 TRY FALLBACK DEPARTMENTS in order
        for (const fallbackDept of fallbackDepartments) {
            logger_js_1.logger.info('🔄 Trying fallback department', {
                originalDepartment: department,
                fallbackDepartment: fallbackDept,
                tenantId
            });
            eligibleTeam = await this.findTeamForDepartment(fallbackDept, tenantId);
            if (eligibleTeam) {
                logger_js_1.logger.info('✅ Found team via fallback department', {
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
            logger_js_1.logger.warn('⚠️ Using last resort team assignment', {
                originalDepartment: department,
                assignedTeamId: anyEligibleTeam.id,
                assignedTeamName: anyEligibleTeam.name,
                reason: 'No teams found for department or fallbacks'
            });
            return anyEligibleTeam;
        }
        // 🚫 NO TEAMS AVAILABLE
        logger_js_1.logger.error('❌ No teams available for department or any fallbacks', {
            department,
            triedFallbacks: fallbackDepartments,
            tenantId
        });
        return null;
    }
    /**
     * 🆘 LAST RESORT: Find any available team when no department-specific teams exist
     */
    static async findAnyAvailableTeam(tenantId) {
        const availableTeams = await db_js_1.db
            .select({
            teamId: w3suite_js_1.teams.id,
            teamName: w3suite_js_1.teams.name,
            teamType: w3suite_js_1.teams.teamType,
            assignedDepartments: w3suite_js_1.teams.assignedDepartments,
            workflowPriority: w3suite_js_1.teamWorkflowAssignments.priority,
            templateId: w3suite_js_1.teamWorkflowAssignments.templateId
        })
            .from(w3suite_js_1.teams)
            .innerJoin(w3suite_js_1.teamWorkflowAssignments, (0, drizzle_orm_1.eq)(w3suite_js_1.teams.id, w3suite_js_1.teamWorkflowAssignments.teamId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_js_1.teams.tenantId, tenantId), (0, drizzle_orm_1.eq)(w3suite_js_1.teams.isActive, true), (0, drizzle_orm_1.eq)(w3suite_js_1.teamWorkflowAssignments.tenantId, tenantId), (0, drizzle_orm_1.eq)(w3suite_js_1.teamWorkflowAssignments.autoAssign, true), (0, drizzle_orm_1.eq)(w3suite_js_1.teamWorkflowAssignments.isActive, true)))
            .orderBy((0, drizzle_orm_1.desc)(w3suite_js_1.teamWorkflowAssignments.priority))
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
    static async findTeamForDepartment(department, tenantId) {
        // 🎯 ENHANCED QUERY: Join teams with their workflow assignments to get priority info
        const teamsWithWorkflowPriority = await db_js_1.db
            .select({
            teamId: w3suite_js_1.teams.id,
            teamName: w3suite_js_1.teams.name,
            teamType: w3suite_js_1.teams.teamType,
            assignedDepartments: w3suite_js_1.teams.assignedDepartments,
            workflowPriority: w3suite_js_1.teamWorkflowAssignments.priority,
            templateId: w3suite_js_1.teamWorkflowAssignments.templateId,
            autoAssign: w3suite_js_1.teamWorkflowAssignments.autoAssign
        })
            .from(w3suite_js_1.teams)
            .innerJoin(w3suite_js_1.teamWorkflowAssignments, (0, drizzle_orm_1.eq)(w3suite_js_1.teams.id, w3suite_js_1.teamWorkflowAssignments.teamId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_js_1.teams.tenantId, tenantId), (0, drizzle_orm_1.eq)(w3suite_js_1.teams.isActive, true), (0, drizzle_orm_1.eq)(w3suite_js_1.teamWorkflowAssignments.tenantId, tenantId), (0, drizzle_orm_1.eq)(w3suite_js_1.teamWorkflowAssignments.forDepartment, department), (0, drizzle_orm_1.eq)(w3suite_js_1.teamWorkflowAssignments.autoAssign, true), (0, drizzle_orm_1.eq)(w3suite_js_1.teamWorkflowAssignments.isActive, true)))
            .orderBy((0, drizzle_orm_1.desc)(w3suite_js_1.teamWorkflowAssignments.priority), // Highest priority first
        (0, drizzle_orm_1.desc)(w3suite_js_1.teams.createdAt) // Newest team as tiebreaker
        );
        if (teamsWithWorkflowPriority.length === 0) {
            logger_js_1.logger.warn('⚠️ No teams with workflow assignments found for department', {
                department,
                tenantId
            });
            return null;
        }
        // 🎯 PRIORITY LOGIC: Group teams by priority and apply load balancing within same priority
        const teamsByPriority = teamsWithWorkflowPriority.reduce((acc, team) => {
            const priority = team.workflowPriority || 100;
            if (!acc[priority])
                acc[priority] = [];
            acc[priority].push(team);
            return acc;
        }, {});
        // Get highest priority teams
        const priorities = Object.keys(teamsByPriority).map(Number).sort((a, b) => b - a);
        const highestPriority = priorities[0];
        const highestPriorityTeams = teamsByPriority[highestPriority];
        // 🔄 LOAD BALANCING: If multiple teams have same priority, use round-robin selection
        const selectedTeam = await this.selectTeamWithLoadBalancing(highestPriorityTeams, department, tenantId);
        logger_js_1.logger.info('🎯 Smart team selection completed', {
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
    static async selectTeamWithLoadBalancing(teams, department, tenantId) {
        if (teams.length === 1) {
            return teams[0];
        }
        // 📊 Get request counts for each team in the last 24 hours to balance load
        const teamRequestCounts = await db_js_1.db
            .select({
            teamId: w3suite_js_1.teamWorkflowAssignments.teamId,
            requestCount: (0, drizzle_orm_1.count)(w3suite_js_1.universalRequests.id)
        })
            .from(w3suite_js_1.teamWorkflowAssignments)
            .leftJoin(w3suite_js_1.workflowInstances, (0, drizzle_orm_1.eq)(w3suite_js_1.teamWorkflowAssignments.templateId, w3suite_js_1.workflowInstances.templateId))
            .leftJoin(w3suite_js_1.universalRequests, (0, drizzle_orm_1.eq)(w3suite_js_1.workflowInstances.referenceId, w3suite_js_1.universalRequests.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_js_1.teamWorkflowAssignments.tenantId, tenantId), (0, drizzle_orm_1.eq)(w3suite_js_1.teamWorkflowAssignments.forDepartment, department), (0, drizzle_orm_1.inArray)(w3suite_js_1.teamWorkflowAssignments.teamId, teams.map(t => t.teamId))))
            .groupBy(w3suite_js_1.teamWorkflowAssignments.teamId);
        // Create map for quick lookup
        const requestCountMap = teamRequestCounts.reduce((acc, item) => {
            acc[item.teamId] = item.requestCount;
            return acc;
        }, {});
        // 🎯 SELECT TEAM: Choose team with lowest request count (load balancing)
        const teamWithLowestLoad = teams.reduce((bestTeam, currentTeam) => {
            const currentLoad = requestCountMap[currentTeam.teamId] || 0;
            const bestLoad = requestCountMap[bestTeam.teamId] || 0;
            return currentLoad < bestLoad ? currentTeam : bestTeam;
        });
        logger_js_1.logger.info('⚖️ Load balancing applied', {
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
    static async findWorkflowAssignment(teamId, department, tenantId) {
        const [assignment] = await db_js_1.db
            .select({
            id: w3suite_js_1.teamWorkflowAssignments.id,
            teamId: w3suite_js_1.teamWorkflowAssignments.teamId,
            templateId: w3suite_js_1.teamWorkflowAssignments.templateId,
            forDepartment: w3suite_js_1.teamWorkflowAssignments.forDepartment,
            autoAssign: w3suite_js_1.teamWorkflowAssignments.autoAssign,
            priority: w3suite_js_1.teamWorkflowAssignments.priority,
            conditions: w3suite_js_1.teamWorkflowAssignments.conditions,
            overrides: w3suite_js_1.teamWorkflowAssignments.overrides
        })
            .from(w3suite_js_1.teamWorkflowAssignments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_js_1.teamWorkflowAssignments.tenantId, tenantId), (0, drizzle_orm_1.eq)(w3suite_js_1.teamWorkflowAssignments.teamId, teamId), (0, drizzle_orm_1.eq)(w3suite_js_1.teamWorkflowAssignments.forDepartment, department), (0, drizzle_orm_1.eq)(w3suite_js_1.teamWorkflowAssignments.autoAssign, true), (0, drizzle_orm_1.eq)(w3suite_js_1.teamWorkflowAssignments.isActive, true)))
            .orderBy((0, drizzle_orm_1.desc)(w3suite_js_1.teamWorkflowAssignments.priority));
        if (assignment) {
            logger_js_1.logger.info('📋 Found workflow assignment', {
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
    static async createWorkflowInstance(templateId, referenceId, tenantId, initiatorId) {
        const workflowInstanceData = {
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
        const [newInstance] = await db_js_1.db
            .insert(w3suite_js_1.workflowInstances)
            .values(workflowInstanceData)
            .returning();
        logger_js_1.logger.info('⚡ Created workflow instance', {
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
    static async linkRequestToWorkflow(requestId, workflowInstanceId, tenantId) {
        await db_js_1.db
            .update(w3suite_js_1.universalRequests)
            .set({
            workflowInstanceId,
            status: 'pending', // Move from draft to pending
            submittedAt: new Date()
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_js_1.universalRequests.id, requestId), (0, drizzle_orm_1.eq)(w3suite_js_1.universalRequests.tenantId, tenantId)));
        logger_js_1.logger.info('🔗 Linked request to workflow instance', {
            requestId,
            workflowInstanceId,
            tenantId
        });
    }
    /**
     * 🔍 HELPER: Get workflow automation status for a request
     */
    static async getAutomationStatus(requestId, tenantId) {
        const [request] = await db_js_1.db
            .select({
            id: w3suite_js_1.universalRequests.id,
            workflowInstanceId: w3suite_js_1.universalRequests.workflowInstanceId,
            status: w3suite_js_1.universalRequests.status,
            department: w3suite_js_1.universalRequests.department
        })
            .from(w3suite_js_1.universalRequests)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(w3suite_js_1.universalRequests.id, requestId), (0, drizzle_orm_1.eq)(w3suite_js_1.universalRequests.tenantId, tenantId)));
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
    static async findUsersForDepartment(department, tenantId, templateId) {
        try {
            logger_js_1.logger.info('👤 Finding users for department', {
                department,
                tenantId,
                templateId
            });
            // Query user_workflow_assignments with priority ordering
            const queryConditions = [
                (0, drizzle_orm_1.eq)(w3suite_js_1.userWorkflowAssignments.tenantId, tenantId),
                (0, drizzle_orm_1.eq)(w3suite_js_1.userWorkflowAssignments.forDepartment, department),
                (0, drizzle_orm_1.eq)(w3suite_js_1.userWorkflowAssignments.autoAssign, true),
                (0, drizzle_orm_1.eq)(w3suite_js_1.userWorkflowAssignments.isActive, true),
                (0, drizzle_orm_1.eq)(w3suite_js_1.users.isActive, true)
            ];
            // If templateId specified, filter by it
            if (templateId) {
                queryConditions.push((0, drizzle_orm_1.eq)(w3suite_js_1.userWorkflowAssignments.templateId, templateId));
            }
            const usersWithAssignments = await db_js_1.db
                .select({
                userId: w3suite_js_1.users.id,
                userName: w3suite_js_1.users.name,
                userEmail: w3suite_js_1.users.email,
                priority: w3suite_js_1.userWorkflowAssignments.priority,
                templateId: w3suite_js_1.userWorkflowAssignments.templateId
            })
                .from(w3suite_js_1.userWorkflowAssignments)
                .innerJoin(w3suite_js_1.users, (0, drizzle_orm_1.eq)(w3suite_js_1.userWorkflowAssignments.userId, w3suite_js_1.users.id))
                .where((0, drizzle_orm_1.and)(...queryConditions))
                .orderBy((0, drizzle_orm_1.desc)(w3suite_js_1.userWorkflowAssignments.priority), // Highest priority first
            (0, drizzle_orm_1.desc)(w3suite_js_1.userWorkflowAssignments.createdAt) // Newest assignment as tiebreaker
            );
            if (usersWithAssignments.length === 0) {
                logger_js_1.logger.warn('⚠️ No users with workflow assignments found for department', {
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
            logger_js_1.logger.info('✅ Found users for department', {
                department,
                userCount: result.length,
                users: result.map(u => ({ id: u.id, name: u.name }))
            });
            return result;
        }
        catch (error) {
            logger_js_1.logger.error('❌ Failed to find users for department', {
                error: error instanceof Error ? error.message : String(error),
                department,
                tenantId
            });
            return [];
        }
    }
}
exports.RequestTriggerService = RequestTriggerService;
