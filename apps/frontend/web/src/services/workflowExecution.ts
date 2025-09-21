// 🚀 ENTERPRISE WORKFLOW EXECUTION ENGINE
// Professional workflow runtime system for W3 Suite

import { Node, Edge } from 'reactflow';

// 🎯 EXECUTION CONTEXT INTERFACE
export interface ExecutionContext {
  workflowId: string;
  instanceId: string;
  nodes: Node[];
  edges: Edge[];
  variables: Record<string, any>;
  currentNodeId: string | null;
  executionStack: string[];
  completedNodes: string[];
  errorNodes: string[];
  startTime: Date;
  endTime?: Date;
  status: ExecutionStatus;
  metadata: {
    triggerData?: any;
    userContext?: {
      userId: string;
      tenantId: string;
      storeId?: string;
    };
    requestData?: any;
  };
}

// 🎯 EXECUTION STATUS ENUM
export enum ExecutionStatus {
  IDLE = 'idle',
  STARTING = 'starting', 
  RUNNING = 'running',
  PAUSED = 'paused',
  WAITING = 'waiting', // Waiting for approval
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// 🎯 EXECUTION RESULT INTERFACE
export interface ExecutionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  nextNodeIds?: string[];
  shouldPause?: boolean;
  waitForApproval?: {
    approverRole: string;
    message: string;
    data: any;
  };
}

// 🎯 NODE EXECUTION HANDLER TYPE
export type NodeExecutionHandler = (
  node: Node,
  context: ExecutionContext
) => Promise<ExecutionResult>;

// 🎯 ENTERPRISE WORKFLOW EXECUTION ENGINE
export class WorkflowExecutionEngine {
  private executionHandlers: Map<string, NodeExecutionHandler> = new Map();
  private runningExecutions: Map<string, ExecutionContext> = new Map();
  private executionListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.registerBuiltInHandlers();
  }

  // 📋 REGISTER BUILT-IN NODE EXECUTION HANDLERS
  private registerBuiltInHandlers() {
    // ✅ START NODE HANDLERS (Triggers)
    this.registerHandler('start', this.executeStartNode.bind(this));
    
    // ✅ ACTION NODE HANDLERS
    this.registerHandler('action', this.executeActionNode.bind(this));
    
    // ✅ DECISION NODE HANDLERS
    this.registerHandler('decision', this.executeDecisionNode.bind(this));
    
    // ✅ APPROVAL NODE HANDLERS (HR workflows)
    this.registerHandler('approval', this.executeApprovalNode.bind(this));
    
    // ✅ END NODE HANDLERS
    this.registerHandler('end', this.executeEndNode.bind(this));
  }

  // 🔧 REGISTER CUSTOM NODE HANDLER
  public registerHandler(nodeType: string, handler: NodeExecutionHandler) {
    this.executionHandlers.set(nodeType, handler);
  }

  // 🚀 START WORKFLOW EXECUTION
  public async startExecution(
    workflowId: string,
    nodes: Node[],
    edges: Edge[],
    triggerData?: any,
    userContext?: any
  ): Promise<string> {
    const instanceId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Find start nodes (triggers)
    const startNodes = nodes.filter(node => node.type === 'start');
    
    if (startNodes.length === 0) {
      throw new Error('No start node found in workflow');
    }

    // Create execution context
    const context: ExecutionContext = {
      workflowId,
      instanceId,
      nodes,
      edges,
      variables: {},
      currentNodeId: null,
      executionStack: [],
      completedNodes: [],
      errorNodes: [],
      startTime: new Date(),
      status: ExecutionStatus.STARTING,
      metadata: {
        triggerData,
        userContext,
      },
    };

    this.runningExecutions.set(instanceId, context);
    
    // Start execution from the first start node
    await this.executeNode(startNodes[0].id, context);
    
    return instanceId;
  }

  // ⚡ EXECUTE INDIVIDUAL NODE
  private async executeNode(nodeId: string, context: ExecutionContext): Promise<void> {
    const node = context.nodes.find(n => n.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // Update execution context
    context.currentNodeId = nodeId;
    context.executionStack.push(nodeId);
    context.status = ExecutionStatus.RUNNING;
    
    this.notifyListeners(context.instanceId, 'nodeStarted', { nodeId, node });

    try {
      // Get handler for node type
      const handler = this.executionHandlers.get(node.type as string);
      if (!handler) {
        throw new Error(`No handler registered for node type: ${node.type}`);
      }

      // Execute node
      const result = await handler(node, context);
      
      if (result.success) {
        context.completedNodes.push(nodeId);
        this.notifyListeners(context.instanceId, 'nodeCompleted', { nodeId, result });
        
        // Handle different result scenarios
        if (result.shouldPause) {
          context.status = ExecutionStatus.PAUSED;
          return;
        }
        
        if (result.waitForApproval) {
          context.status = ExecutionStatus.WAITING;
          this.notifyListeners(context.instanceId, 'waitingForApproval', result.waitForApproval);
          return;
        }
        
        // Continue to next nodes
        if (result.nextNodeIds && result.nextNodeIds.length > 0) {
          for (const nextNodeId of result.nextNodeIds) {
            await this.executeNode(nextNodeId, context);
          }
        } else {
          // Auto-find next nodes via edges
          const nextNodeIds = this.getNextNodes(nodeId, context.edges);
          for (const nextNodeId of nextNodeIds) {
            await this.executeNode(nextNodeId, context);
          }
        }
      } else {
        // Node execution failed
        context.errorNodes.push(nodeId);
        context.status = ExecutionStatus.FAILED;
        this.notifyListeners(context.instanceId, 'nodeError', { nodeId, error: result.error });
      }
      
    } catch (error) {
      context.errorNodes.push(nodeId);
      context.status = ExecutionStatus.FAILED;
      this.notifyListeners(context.instanceId, 'executionError', { nodeId, error });
      throw error;
    }
  }

  // 🎯 START NODE EXECUTION (Triggers)
  private async executeStartNode(node: Node, context: ExecutionContext): Promise<ExecutionResult> {
    const triggerData = node.data;
    
    console.log(`🚀 Executing START node: ${triggerData.label}`, {
      nodeId: node.id,
      triggerData,
      context: context.metadata.triggerData
    });

    // Different trigger logic based on trigger type
    switch (triggerData.triggerId) {
      case 'manual-start':
        return {
          success: true,
          message: 'Workflow started manually',
          data: context.metadata.triggerData
        };
        
      case 'form-submission':
        return {
          success: true,
          message: 'Workflow started from form submission',
          data: context.metadata.requestData
        };
        
      case 'scheduled-time':
        return {
          success: true,
          message: 'Workflow started by schedule',
          data: { scheduleTime: new Date() }
        };
        
      default:
        return {
          success: true,
          message: `Workflow started by trigger: ${triggerData.label}`,
          data: context.metadata.triggerData
        };
    }
  }

  // ⚡ ACTION NODE EXECUTION
  private async executeActionNode(node: Node, context: ExecutionContext): Promise<ExecutionResult> {
    const actionData = node.data;
    
    console.log(`⚡ Executing ACTION node: ${actionData.label}`, {
      nodeId: node.id,
      actionData
    });

    // Simulate action execution with realistic timing
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));

    // Different action logic based on action type
    switch (actionData.actionId) {
      case 'hr-approval':
        return {
          success: true,
          message: 'HR approval request sent',
          waitForApproval: {
            approverRole: 'hr-manager',
            message: 'Please review and approve this request',
            data: context.variables
          }
        };
        
      case 'send-email':
        return {
          success: true,
          message: 'Email sent successfully',
          data: { emailId: `email-${Date.now()}` }
        };
        
      case 'update-database':
        return {
          success: true,
          message: 'Database updated successfully',
          data: { recordsUpdated: 1 }
        };
        
      case 'expense-approval':
        const amount = context.variables.amount || 1000;
        if (amount > 5000) {
          return {
            success: true,
            message: 'High-value expense requires manager approval',
            waitForApproval: {
              approverRole: 'finance-manager',
              message: `Expense approval required for $${amount}`,
              data: { amount, requester: context.metadata.userContext?.userId }
            }
          };
        } else {
          return {
            success: true,
            message: 'Expense auto-approved',
            data: { approved: true, amount }
          };
        }
        
      default:
        return {
          success: true,
          message: `Action completed: ${actionData.label}`,
          data: { nodeId: node.id, timestamp: new Date() }
        };
    }
  }

  // 🔀 DECISION NODE EXECUTION
  private async executeDecisionNode(node: Node, context: ExecutionContext): Promise<ExecutionResult> {
    const decisionData = node.data;
    
    console.log(`🔀 Executing DECISION node: ${decisionData.label}`, {
      nodeId: node.id,
      variables: context.variables
    });

    // Simulate decision logic
    const condition = context.variables.condition || 'default';
    
    // Get outgoing edges to determine paths
    const outgoingEdges = context.edges.filter(edge => edge.source === node.id);
    
    // Simple decision logic - can be enhanced with complex conditions
    let chosenPath: string | null = null;
    
    if (outgoingEdges.length >= 2) {
      // Binary decision based on conditions
      if (condition === 'approved' || Math.random() > 0.3) {
        chosenPath = outgoingEdges[0].target; // First path (usually "yes")
      } else {
        chosenPath = outgoingEdges[1].target; // Second path (usually "no")
      }
    } else if (outgoingEdges.length === 1) {
      chosenPath = outgoingEdges[0].target;
    }

    return {
      success: true,
      message: `Decision made: ${condition}`,
      data: { condition, chosenPath },
      nextNodeIds: chosenPath ? [chosenPath] : []
    };
  }

  // 👥 APPROVAL NODE EXECUTION
  private async executeApprovalNode(node: Node, context: ExecutionContext): Promise<ExecutionResult> {
    const approvalData = node.data;
    
    console.log(`👥 Executing APPROVAL node: ${approvalData.label}`, {
      nodeId: node.id,
      approvalData
    });

    return {
      success: true,
      message: 'Approval request created',
      waitForApproval: {
        approverRole: approvalData.approverRole || 'manager',
        message: approvalData.message || 'Please review and approve',
        data: {
          requestId: `approval-${Date.now()}`,
          requester: context.metadata.userContext?.userId,
          ...context.variables
        }
      }
    };
  }

  // 🏁 END NODE EXECUTION
  private async executeEndNode(node: Node, context: ExecutionContext): Promise<ExecutionResult> {
    console.log(`🏁 Executing END node: ${node.data.label}`, {
      nodeId: node.id,
      completedNodes: context.completedNodes.length,
      totalTime: Date.now() - context.startTime.getTime()
    });

    context.status = ExecutionStatus.COMPLETED;
    context.endTime = new Date();
    
    this.notifyListeners(context.instanceId, 'workflowCompleted', {
      instanceId: context.instanceId,
      duration: context.endTime.getTime() - context.startTime.getTime(),
      completedNodes: context.completedNodes.length,
      errorNodes: context.errorNodes.length
    });

    return {
      success: true,
      message: 'Workflow completed successfully',
      data: {
        completedAt: context.endTime,
        duration: context.endTime.getTime() - context.startTime.getTime(),
        nodesCompleted: context.completedNodes.length,
        variables: context.variables
      }
    };
  }

  // 🔗 GET NEXT NODES FROM EDGES
  private getNextNodes(nodeId: string, edges: Edge[]): string[] {
    return edges
      .filter(edge => edge.source === nodeId)
      .map(edge => edge.target);
  }

  // 🎧 EVENT LISTENER SYSTEM
  public addEventListener(instanceId: string, callback: Function) {
    if (!this.executionListeners.has(instanceId)) {
      this.executionListeners.set(instanceId, []);
    }
    this.executionListeners.get(instanceId)!.push(callback);
  }

  private notifyListeners(instanceId: string, event: string, data: any) {
    const listeners = this.executionListeners.get(instanceId) || [];
    listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in execution listener:', error);
      }
    });
  }

  // 📊 EXECUTION STATUS QUERIES
  public getExecutionStatus(instanceId: string): ExecutionContext | null {
    return this.runningExecutions.get(instanceId) || null;
  }

  public getAllRunningExecutions(): ExecutionContext[] {
    return Array.from(this.runningExecutions.values());
  }

  // ⏹️ CONTROL OPERATIONS
  public pauseExecution(instanceId: string): boolean {
    const context = this.runningExecutions.get(instanceId);
    if (context && context.status === ExecutionStatus.RUNNING) {
      context.status = ExecutionStatus.PAUSED;
      this.notifyListeners(instanceId, 'executionPaused', { instanceId });
      return true;
    }
    return false;
  }

  public resumeExecution(instanceId: string): boolean {
    const context = this.runningExecutions.get(instanceId);
    if (context && context.status === ExecutionStatus.PAUSED) {
      context.status = ExecutionStatus.RUNNING;
      this.notifyListeners(instanceId, 'executionResumed', { instanceId });
      return true;
    }
    return false;
  }

  public cancelExecution(instanceId: string): boolean {
    const context = this.runningExecutions.get(instanceId);
    if (context) {
      context.status = ExecutionStatus.CANCELLED;
      context.endTime = new Date();
      this.notifyListeners(instanceId, 'executionCancelled', { instanceId });
      this.runningExecutions.delete(instanceId);
      return true;
    }
    return false;
  }

  // 🧹 CLEANUP
  public cleanup(instanceId: string) {
    this.runningExecutions.delete(instanceId);
    this.executionListeners.delete(instanceId);
  }
}

// 🌟 SINGLETON INSTANCE
export const workflowEngine = new WorkflowExecutionEngine();

// 🎯 CONVENIENCE FUNCTIONS FOR UI
export async function executeWorkflow(
  workflowId: string,
  nodes: Node[],
  edges: Edge[],
  triggerData?: any,
  userContext?: any
): Promise<string> {
  return await workflowEngine.startExecution(workflowId, nodes, edges, triggerData, userContext);
}

export function getWorkflowStatus(instanceId: string): ExecutionContext | null {
  return workflowEngine.getExecutionStatus(instanceId);
}

export function pauseWorkflow(instanceId: string): boolean {
  return workflowEngine.pauseExecution(instanceId);
}

export function resumeWorkflow(instanceId: string): boolean {
  return workflowEngine.resumeExecution(instanceId);
}

export function cancelWorkflow(instanceId: string): boolean {
  return workflowEngine.cancelExecution(instanceId);
}