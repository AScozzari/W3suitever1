/**
 * 🌉 REACTFLOW BRIDGE PARSER
 * 
 * Trasforma nodi ReactFlow salvati nel database in step eseguibili 
 * dal workflow engine. Ponte cruciale tra design visual e business logic.
 */

import { Node as ReactFlowNode, Edge as ReactFlowEdge } from 'reactflow';
import { logger } from '../core/logger';

// ==================== TYPES ====================

export interface ParsedWorkflowStep {
  id: string;
  nodeId: string; // ReactFlow node ID
  type: 'trigger' | 'action' | 'decision' | 'approval' | 'ai';
  executorId: string; // Which executor to use (send-email, approve-request, etc.)
  actionType?: string; // Original actionType from ReactFlow node data (for backward compatibility)
  config: Record<string, any>; // Configuration from ReactFlow node.data
  position: { x: number; y: number };
  nextSteps: string[]; // Node IDs this step leads to
  conditions?: Record<string, string>; // For conditional edges
}

export interface ParsedWorkflow {
  startNodeId: string;
  steps: Map<string, ParsedWorkflowStep>;
  edges: ReactFlowEdge[];
  totalSteps: number;
  metadata: {
    templateId?: string;
    templateName?: string;
    department?: string;
  };
}

/**
 * 🔄 SERIALIZABLE version of ParsedWorkflow for database persistence
 * Converts Map to array to enable JSON serialization
 */
export interface SerializableParsedWorkflow {
  startNodeId: string;
  steps: ParsedWorkflowStep[]; // Array instead of Map for JSON serialization
  edges: ReactFlowEdge[];
  totalSteps: number;
  metadata: {
    templateId?: string;
    templateName?: string;
    department?: string;
  };
}

export interface ReactFlowWorkflowData {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

// ==================== PARSER CLASS ====================

export class ReactFlowBridgeParser {
  
  /**
   * MAIN ENTRY POINT: Parse ReactFlow data into executable workflow
   */
  async parseWorkflow(
    workflowData: ReactFlowWorkflowData,
    metadata?: { templateId?: string; templateName?: string; department?: string }
  ): Promise<ParsedWorkflow> {
    try {
      logger.info('🌉 [BRIDGE] Starting ReactFlow workflow parsing', {
        nodesCount: workflowData.nodes.length,
        edgesCount: workflowData.edges.length,
        templateId: metadata?.templateId
      });

      // Find start node (trigger types)
      const startNode = this.findStartNode(workflowData.nodes);
      if (!startNode) {
        throw new Error('No start node (trigger) found in workflow');
      }

      // Parse all nodes into executable steps
      const steps = new Map<string, ParsedWorkflowStep>();
      
      for (const node of workflowData.nodes) {
        const parsedStep = this.parseNode(node, workflowData.edges);
        steps.set(node.id, parsedStep);
      }

      // Build next steps relationships from edges
      this.buildNextStepsRelationships(steps, workflowData.edges);

      const parsedWorkflow: ParsedWorkflow = {
        startNodeId: startNode.id,
        steps,
        edges: workflowData.edges,
        totalSteps: workflowData.nodes.length,
        metadata: metadata || {}
      };

      logger.info('✅ [BRIDGE] Workflow parsed successfully', {
        startNodeId: startNode.id,
        totalSteps: steps.size,
        templateId: metadata?.templateId
      });

      return parsedWorkflow;

    } catch (error) {
      logger.error('❌ [BRIDGE] Failed to parse ReactFlow workflow', {
        error: error instanceof Error ? error.message : String(error),
        templateId: metadata?.templateId
      });
      throw error;
    }
  }

  /**
   * Find the start node (should be a trigger type)
   */
  private findStartNode(nodes: ReactFlowNode[]): ReactFlowNode | null {
    // Look for trigger type nodes
    const triggerNode = nodes.find(node => 
      node.type === 'trigger' || 
      node.data?.nodeType === 'trigger' ||
      node.data?.triggerType // From our demo data
    );

    if (triggerNode) {
      return triggerNode;
    }

    // Fallback: find node with no incoming edges
    const nodeIds = new Set(nodes.map(n => n.id));
    const nodesWithIncoming = new Set();
    
    // This would need edges to be passed, but for now return first node
    return nodes[0] || null;
  }

  /**
   * Parse a single ReactFlow node into executable step
   */
  private parseNode(node: ReactFlowNode, edges: ReactFlowEdge[]): ParsedWorkflowStep {
    // Determine node type and executor
    const { type, executorId } = this.determineNodeExecutor(node);

    // Extract configuration from node.data
    const config = this.extractNodeConfig(node);

    // Extract actionType from node data for backward compatibility
    const actionType = node.data?.actionType as string | undefined;

    return {
      id: `step-${node.id}`,
      nodeId: node.id,
      type,
      executorId,
      actionType,
      config,
      position: node.position,
      nextSteps: [], // Will be populated later
      conditions: this.extractConditions(node, edges)
    };
  }

  /**
   * Determine what type and executor this node should use
   */
  private determineNodeExecutor(node: ReactFlowNode): { type: ParsedWorkflowStep['type']; executorId: string } {
    // Check explicit type first
    if (node.type) {
      switch (node.type) {
        case 'trigger':
          return { type: 'trigger', executorId: this.mapTriggerExecutor(node) };
        case 'action':
          return { type: 'action', executorId: this.mapActionExecutor(node) };
        case 'decision':
          return { type: 'decision', executorId: 'decision-evaluator' };
        case 'approval':
          return { type: 'approval', executorId: 'approval-handler' };
        case 'ai':
          return { type: 'ai', executorId: this.mapAiExecutor(node) };
      }
    }

    // Fallback: analyze node.data for clues
    const data = node.data || {};
    
    if (data.triggerType) {
      return { type: 'trigger', executorId: this.mapTriggerExecutor(node) };
    }
    
    if (data.actionType || data.approverRole) {
      return { type: 'action', executorId: this.mapActionExecutor(node) };
    }
    
    if (data.condition) {
      return { type: 'decision', executorId: 'decision-evaluator' };
    }

    // Default to action
    return { type: 'action', executorId: 'generic-action' };
  }

  /**
   * Map trigger nodes to specific executors
   */
  private mapTriggerExecutor(node: ReactFlowNode): string {
    const triggerType = node.data?.triggerType;
    
    switch (triggerType) {
      case 'form_submitted':
      case 'form_trigger':
        return 'form-trigger-executor';
      case 'time_trigger':
      case 'cron':
        return 'time-trigger-executor';
      case 'webhook':
        return 'webhook-trigger-executor';
      case 'event':
        return 'event-trigger-executor';
      default:
        return 'generic-trigger-executor';
    }
  }

  /**
   * Map action nodes to specific executors
   */
  private mapActionExecutor(node: ReactFlowNode): string {
    const data = node.data || {};
    
    // Check for specific action identifiers
    if (data.actionType) {
      switch (data.actionType) {
        case 'auto_approve':
          return 'auto-approval-executor';
        case 'send_email':
        case 'send-email':
          return 'email-action-executor';
        case 'send_sms':
        case 'send-sms':
          return 'sms-action-executor';
        case 'ai-decision':
        case 'ai_decision':
          return 'ai-decision-executor';
        case 'create_ticket':
        case 'create-ticket':
          return 'ticket-action-executor';
        case 'process_payment':
        case 'process-payment':
          return 'payment-action-executor';
        default:
          return 'generic-action-executor';
      }
    }
    
    // Check for approval-related nodes
    if (data.approverRole || data.approverType) {
      return 'approval-action-executor';
    }
    
    // Check label for hints
    const label = (data.label || '').toLowerCase();
    if (label.includes('email')) return 'email-action-executor';
    if (label.includes('sms')) return 'sms-action-executor';
    if (label.includes('approve')) return 'approval-action-executor';
    if (label.includes('ticket')) return 'ticket-action-executor';
    if (label.includes('payment')) return 'payment-action-executor';
    
    return 'generic-action-executor';
  }

  /**
   * Map AI nodes to specific executors
   */
  private mapAiExecutor(node: ReactFlowNode): string {
    const aiType = node.data?.aiType;
    
    switch (aiType) {
      case 'decision':
        return 'ai-decision-executor';
      case 'classification':
        return 'ai-classification-executor';
      case 'content':
        return 'ai-content-executor';
      case 'routing':
        return 'ai-routing-executor';
      default:
        return 'ai-generic-executor';
    }
  }

  /**
   * Extract configuration data from ReactFlow node
   */
  private extractNodeConfig(node: ReactFlowNode): Record<string, any> {
    const config = { ...node.data };
    
    // Clean up display-only properties
    delete config.label; // Keep for reference but don't pass to executor
    
    // Preserve important fields
    return {
      label: node.data?.label, // Keep for logging/debugging
      ...config,
      nodeId: node.id,
      position: node.position
    };
  }

  /**
   * Extract conditions for conditional edges
   */
  private extractConditions(node: ReactFlowNode, edges: ReactFlowEdge[]): Record<string, string> {
    const conditions: Record<string, string> = {};
    
    // Find outgoing edges from this node
    const outgoingEdges = edges.filter(edge => edge.source === node.id);
    
    for (const edge of outgoingEdges) {
      if (edge.label) {
        // Use edge label as condition
        conditions[edge.target] = edge.label;
      } else if (edge.data?.condition) {
        // Use edge data condition
        conditions[edge.target] = edge.data.condition;
      }
    }
    
    return conditions;
  }

  /**
   * Build next steps relationships from edges
   */
  private buildNextStepsRelationships(steps: Map<string, ParsedWorkflowStep>, edges: ReactFlowEdge[]): void {
    for (const edge of edges) {
      const sourceStep = steps.get(edge.source);
      if (sourceStep) {
        sourceStep.nextSteps.push(edge.target);
      }
    }
  }

  /**
   * UTILITY: Convert parsed workflow back to ReactFlow format
   */
  convertToReactFlow(parsedWorkflow: ParsedWorkflow): ReactFlowWorkflowData {
    const nodes: ReactFlowNode[] = [];
    const edges = parsedWorkflow.edges;

    for (const [nodeId, step] of parsedWorkflow.steps) {
      nodes.push({
        id: nodeId,
        type: step.type,
        position: step.position,
        data: {
          ...step.config,
          executorId: step.executorId
        }
      });
    }

    return { nodes, edges };
  }

  /**
   * 🔄 SERIALIZATION: Convert ParsedWorkflow Map to serializable format
   */
  serializeWorkflow(parsedWorkflow: ParsedWorkflow): SerializableParsedWorkflow {
    const stepsArray: ParsedWorkflowStep[] = Array.from(parsedWorkflow.steps.values());
    
    return {
      startNodeId: parsedWorkflow.startNodeId,
      steps: stepsArray,
      edges: parsedWorkflow.edges,
      totalSteps: parsedWorkflow.totalSteps,
      metadata: parsedWorkflow.metadata
    };
  }

  /**
   * 🔄 DESERIALIZATION: Convert serializable format back to ParsedWorkflow with Map
   */
  deserializeWorkflow(serializedWorkflow: SerializableParsedWorkflow): ParsedWorkflow {
    const stepsMap = new Map<string, ParsedWorkflowStep>();
    
    // Rebuild Map from array using nodeId as key
    for (const step of serializedWorkflow.steps) {
      stepsMap.set(step.nodeId, step);
    }
    
    return {
      startNodeId: serializedWorkflow.startNodeId,
      steps: stepsMap,
      edges: serializedWorkflow.edges,
      totalSteps: serializedWorkflow.totalSteps,
      metadata: serializedWorkflow.metadata
    };
  }

  /**
   * 🔄 HELPER: Safe workflow extraction from instance data
   * Handles both old and new serialization formats
   */
  extractWorkflowFromInstanceData(workflowData: any): ParsedWorkflow | null {
    try {
      const parsedWorkflow = workflowData?.parsedWorkflow;
      
      if (!parsedWorkflow) {
        return null;
      }

      // Check if it's already a Map (new format)
      if (parsedWorkflow.steps instanceof Map) {
        return parsedWorkflow as ParsedWorkflow;
      }

      // Check if it's serialized format (array of steps)
      if (Array.isArray(parsedWorkflow.steps)) {
        return this.deserializeWorkflow(parsedWorkflow as SerializableParsedWorkflow);
      }

      // Handle legacy format or corrupted data
      logger.warn('🔄 [BRIDGE] Unknown workflow format in instance data', {
        hasSteps: !!parsedWorkflow.steps,
        stepsType: typeof parsedWorkflow.steps,
        isArray: Array.isArray(parsedWorkflow.steps)
      });
      
      return null;

    } catch (error) {
      logger.error('❌ [BRIDGE] Failed to extract workflow from instance data', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * UTILITY: Validate parsed workflow integrity
   */
  validateWorkflow(parsedWorkflow: ParsedWorkflow): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if start node exists
    if (!parsedWorkflow.steps.has(parsedWorkflow.startNodeId)) {
      errors.push(`Start node ${parsedWorkflow.startNodeId} not found in steps`);
    }

    // Check for orphaned nodes (no incoming or outgoing connections)
    for (const [nodeId, step] of parsedWorkflow.steps) {
      const hasIncoming = parsedWorkflow.edges.some(edge => edge.target === nodeId);
      const hasOutgoing = step.nextSteps.length > 0;
      
      if (nodeId !== parsedWorkflow.startNodeId && !hasIncoming && !hasOutgoing) {
        errors.push(`Orphaned node found: ${nodeId}`);
      }
    }

    // Check for missing executors
    for (const [nodeId, step] of parsedWorkflow.steps) {
      if (!step.executorId) {
        errors.push(`Missing executor for node: ${nodeId}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// ==================== SINGLETON EXPORT ====================

export const reactFlowBridgeParser = new ReactFlowBridgeParser();