import { type UniversalRequest } from '../db/schema/w3suite.js';
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
export declare class RequestTriggerService {
    /**
     * 🎯 MAIN METHOD: Triggered when a new universal request is created
     * Finds appropriate team and workflow, creates instance, and starts execution
     */
    static triggerWorkflowForRequest(request: UniversalRequest, tenantId: string): Promise<RequestTriggerResult>;
    /**
     * 🔄 STEP 1A: Find Team with Fallback Logic
     * Tries original department first, then fallback departments if no team found
     */
    private static findTeamForDepartmentWithFallback;
    /**
     * 🆘 LAST RESORT: Find any available team when no department-specific teams exist
     */
    private static findAnyAvailableTeam;
    /**
     * 🔍 STEP 1B: Smart Team Selection with Priority Logic
     * Finds the BEST team for department using workflow assignment priorities
     */
    private static findTeamForDepartment;
    /**
     * 🔄 LOAD BALANCING: Round-robin selection among teams with same priority
     */
    private static selectTeamWithLoadBalancing;
    /**
     * 🔍 STEP 2: Find workflow template assignment for team and department
     */
    private static findWorkflowAssignment;
    /**
     * ⚡ STEP 3: Create workflow instance
     */
    private static createWorkflowInstance;
    /**
     * 🔗 STEP 4: Link universal request to workflow instance
     */
    private static linkRequestToWorkflow;
    /**
     * 🔍 HELPER: Get workflow automation status for a request
     */
    static getAutomationStatus(requestId: string, tenantId: string): Promise<{
        hasWorkflow: boolean;
        workflowInstanceId: string | null;
        status: "draft" | "pending" | "cancelled" | "approved" | "rejected";
        department: "crm" | "hr" | "sales" | "finance" | "marketing" | "support" | "operations";
    }>;
    /**
     * 👤 FIND USERS FOR DEPARTMENT
     * Finds eligible users for a department based on user_workflow_assignments
     * Used by UserRoutingExecutor in auto mode
     */
    static findUsersForDepartment(department: string, tenantId: string, templateId?: string): Promise<Array<{
        id: string;
        name: string;
        email: string;
    }>>;
}
//# sourceMappingURL=request-trigger-service.d.ts.map