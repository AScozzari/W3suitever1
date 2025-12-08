// 🏗️ WORKFLOW API CLIENT SERVICE
// Connects frontend workflow execution engine to backend APIs

import { Node, Edge } from '@xyflow/react';
import { ExecutionContext, ExecutionResult } from './workflowExecution';

// 🎯 API CLIENT CONFIGURATION
const API_BASE_URL = '/api/workflows';

// 🎯 WORKFLOW INSTANCE API TYPES
export interface CreateInstanceRequest {
  templateId?: string;
  workflowDefinition: {
    nodes: Node[];
    edges: Edge[];
  };
  triggerData?: any;
  metadata?: {
    triggerType?: string;
    userContext?: {
      userId: string;
      tenantId: string;
      storeId?: string;
    };
    requestData?: any;
  };
}

export interface WorkflowInstanceResponse {
  id: string;
  templateId?: string;
  status: string;
  currentNodeId?: string;
  variables: Record<string, any>;
  executionLog: Array<{
    nodeId: string;
    status: string;
    result?: any;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateInstanceRequest {
  status?: string;
  currentNodeId?: string;
  variables?: Record<string, any>;
  executionLog?: Array<{
    nodeId: string;
    status: string;
    result?: any;
    timestamp: string;
  }>;
}

// 🎯 AI ROUTING API TYPES
export interface AIRoutingRequest {
  workflowContext: {
    instanceId: string;
    currentNodeId: string;
    variables: Record<string, any>;
    nodeData: any;
  };
  requestData: {
    content: string;
    type: string;
    metadata?: any;
  };
  userContext: {
    userId: string;
    tenantId: string;
    storeId?: string;
  };
}

export interface AIRoutingResponse {
  success: boolean;
  routing: {
    targetAgent: string;
    confidence: number;
    reasoning: string;
  };
  actionRecommendation?: {
    nodeId: string;
    action: string;
    parameters: Record<string, any>;
  };
  nextSteps?: string[];
}

// 🎯 WORKFLOW API CLIENT CLASS
export class WorkflowApiClient {
  
  // 🏗️ CREATE WORKFLOW INSTANCE
  async createWorkflowInstance(request: CreateInstanceRequest): Promise<WorkflowInstanceResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/instances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to create workflow instance: ${response.status} ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to create workflow instance:', error);
      throw error;
    }
  }

  // 🔄 UPDATE WORKFLOW INSTANCE
  async updateWorkflowInstance(instanceId: string, request: UpdateInstanceRequest): Promise<WorkflowInstanceResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/instances/${instanceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to update workflow instance: ${response.status} ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to update workflow instance:', error);
      throw error;
    }
  }

  // 📖 GET WORKFLOW INSTANCE
  async getWorkflowInstance(instanceId: string): Promise<WorkflowInstanceResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/instances/${instanceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to get workflow instance: ${response.status} ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get workflow instance:', error);
      throw error;
    }
  }

  // 🤖 AI-POWERED WORKFLOW ROUTING
  async routeWithAI(request: AIRoutingRequest): Promise<AIRoutingResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/ai-route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to route with AI: ${response.status} ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Failed to route with AI:', error);
      throw error;
    }
  }

  // ⚡ EXECUTE WORKFLOW ACTION (Backend Integration)
  async executeWorkflowAction(
    instanceId: string, 
    nodeId: string, 
    actionType: string, 
    actionData: any,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    try {
      // For now, we'll use the AI routing endpoint to determine the best course of action
      // In the future, this could be expanded to specific action execution endpoints
      
      const aiRequest: AIRoutingRequest = {
        workflowContext: {
          instanceId,
          currentNodeId: nodeId,
          variables: context.variables,
          nodeData: actionData,
        },
        requestData: {
          content: `Execute ${actionType} action: ${actionData.label || actionData.description || 'Workflow Action'}`,
          type: 'workflow-action',
          metadata: {
            actionType,
            nodeId,
            ...actionData,
          },
        },
        userContext: context.metadata.userContext || {
          userId: 'anonymous',
          tenantId: 'default',
        },
      };

      const aiResponse = await this.routeWithAI(aiRequest);

      if (aiResponse.success) {
        // Update workflow instance with the execution result
        await this.updateWorkflowInstance(instanceId, {
          currentNodeId: nodeId,
          variables: {
            ...context.variables,
            lastAiRouting: aiResponse.routing,
            lastActionRecommendation: aiResponse.actionRecommendation,
          },
          executionLog: [
            ...(context.metadata as any).executionLog || [],
            {
              nodeId,
              status: 'completed',
              result: {
                aiRouting: aiResponse.routing,
                actionRecommendation: aiResponse.actionRecommendation,
              },
              timestamp: new Date().toISOString(),
            }
          ],
        });

        return {
          success: true,
          message: `Action executed successfully via AI routing to ${aiResponse.routing.targetAgent}`,
          data: {
            aiRouting: aiResponse.routing,
            actionRecommendation: aiResponse.actionRecommendation,
            nextSteps: aiResponse.nextSteps,
          },
        };
      } else {
        return {
          success: false,
          message: 'AI routing failed for workflow action',
          error: 'Unable to route action through AI system',
        };
      }
    } catch (error) {
      console.error('❌ Failed to execute workflow action:', error);
      return {
        success: false,
        message: 'Action execution failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // 🤝 WORKFLOW APPROVAL ACTIONS
  async requestApproval(
    instanceId: string,
    nodeId: string,
    approvalData: {
      approverRole: string;
      message: string;
      data: any;
    },
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    try {
      // Create approval request through backend
      const aiRequest: AIRoutingRequest = {
        workflowContext: {
          instanceId,
          currentNodeId: nodeId,
          variables: context.variables,
          nodeData: approvalData,
        },
        requestData: {
          content: `Approval request: ${approvalData.message}`,
          type: 'approval-request',
          metadata: {
            approverRole: approvalData.approverRole,
            ...approvalData.data,
          },
        },
        userContext: context.metadata.userContext || {
          userId: 'anonymous',
          tenantId: 'default',
        },
      };

      const aiResponse = await this.routeWithAI(aiRequest);

      // Update workflow instance with approval request
      await this.updateWorkflowInstance(instanceId, {
        status: 'waiting',
        currentNodeId: nodeId,
        variables: {
          ...context.variables,
          pendingApproval: {
            approverRole: approvalData.approverRole,
            message: approvalData.message,
            requestId: `approval-${instanceId}-${nodeId}-${Date.now()}`,
            aiRouting: aiResponse.routing,
          },
        },
      });

      return {
        success: true,
        message: 'Approval request created and routed via AI',
        waitForApproval: {
          approverRole: approvalData.approverRole,
          message: approvalData.message,
          data: {
            ...approvalData.data,
            aiRouting: aiResponse.routing,
            instanceId,
            nodeId,
          },
        },
      };
    } catch (error) {
      console.error('❌ Failed to request approval:', error);
      return {
        success: false,
        message: 'Approval request failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // 🔀 AI-POWERED DECISION MAKING
  async makeDecision(
    instanceId: string,
    nodeId: string,
    decisionData: any,
    context: ExecutionContext,
    availablePaths: string[]
  ): Promise<ExecutionResult> {
    try {
      const aiRequest: AIRoutingRequest = {
        workflowContext: {
          instanceId,
          currentNodeId: nodeId,
          variables: context.variables,
          nodeData: decisionData,
        },
        requestData: {
          content: `Make decision for workflow: ${decisionData.label || 'Decision Point'}`,
          type: 'workflow-decision',
          metadata: {
            availablePaths,
            decisionCriteria: decisionData.criteria || {},
            currentVariables: context.variables,
          },
        },
        userContext: context.metadata.userContext || {
          userId: 'anonymous',
          tenantId: 'default',
        },
      };

      const aiResponse = await this.routeWithAI(aiRequest);

      // Determine the best path based on AI recommendation
      let chosenPath = availablePaths[0]; // Default to first path
      
      if (aiResponse.actionRecommendation?.parameters?.chosenPath) {
        const recommendedPath = aiResponse.actionRecommendation.parameters.chosenPath;
        if (availablePaths.includes(recommendedPath)) {
          chosenPath = recommendedPath;
        }
      } else if (aiResponse.nextSteps && aiResponse.nextSteps.length > 0) {
        // Use AI suggested next steps if available
        const suggestedStep = aiResponse.nextSteps[0];
        if (availablePaths.includes(suggestedStep)) {
          chosenPath = suggestedStep;
        }
      }

      // Update workflow instance with decision
      await this.updateWorkflowInstance(instanceId, {
        currentNodeId: nodeId,
        variables: {
          ...context.variables,
          lastDecision: {
            nodeId,
            chosenPath,
            aiRouting: aiResponse.routing,
            reasoning: aiResponse.routing.reasoning,
          },
        },
      });

      return {
        success: true,
        message: `Decision made via AI: ${aiResponse.routing.reasoning}`,
        data: {
          chosenPath,
          aiRouting: aiResponse.routing,
          reasoning: aiResponse.routing.reasoning,
        },
        nextNodeIds: [chosenPath],
      };
    } catch (error) {
      console.error('❌ Failed to make AI decision:', error);
      // Fallback to first available path
      return {
        success: true,
        message: 'Decision made with fallback logic (AI unavailable)',
        data: { chosenPath: availablePaths[0], fallback: true },
        nextNodeIds: availablePaths.slice(0, 1),
      };
    }
  }
}

// 🎯 SINGLETON INSTANCE
export const workflowApiClient = new WorkflowApiClient();