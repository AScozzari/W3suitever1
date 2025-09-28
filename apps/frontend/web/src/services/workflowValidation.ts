// 🔍 ENTERPRISE WORKFLOW VALIDATION SYSTEM
// Professional validation for W3 Suite workflow builder

import { Node, Edge } from '@xyflow/react';

// 🎯 VALIDATION RESULT INTERFACES
export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100 score for workflow quality
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  metadata: {
    totalNodes: number;
    totalEdges: number;
    complexity: 'low' | 'medium' | 'high' | 'very-high';
    estimatedDuration: number; // in minutes
    riskLevel: 'low' | 'medium' | 'high';
  };
}

export interface ValidationError {
  id: string;
  type: ValidationErrorType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  description: string;
  nodeId?: string;
  edgeId?: string;
  fix?: {
    action: string;
    description: string;
    automated?: boolean;
  };
}

export interface ValidationWarning {
  id: string;
  type: string;
  message: string;
  description: string;
  nodeId?: string;
  impact: 'performance' | 'maintainability' | 'user-experience' | 'compliance';
}

export interface ValidationSuggestion {
  id: string;
  type: string;
  message: string;
  description: string;
  improvement: 'efficiency' | 'reliability' | 'user-experience' | 'best-practice' | 'maintainability';
  priority: 'high' | 'medium' | 'low';
}

// 🎯 VALIDATION ERROR TYPES
export enum ValidationErrorType {
  // Structure errors
  NO_START_NODE = 'no_start_node',
  MULTIPLE_START_NODES = 'multiple_start_nodes',
  NO_END_NODE = 'no_end_node',
  ORPHANED_NODES = 'orphaned_nodes',
  CIRCULAR_DEPENDENCY = 'circular_dependency',
  
  // Connection errors
  INVALID_CONNECTION = 'invalid_connection',
  MISSING_CONNECTIONS = 'missing_connections',
  TOO_MANY_CONNECTIONS = 'too_many_connections',
  
  // Node configuration errors
  MISSING_REQUIRED_FIELDS = 'missing_required_fields',
  INVALID_CONFIGURATION = 'invalid_configuration',
  INCOMPATIBLE_SETTINGS = 'incompatible_settings',
  
  // Business logic errors
  APPROVAL_CHAIN_BROKEN = 'approval_chain_broken',
  INSUFFICIENT_PERMISSIONS = 'insufficient_permissions',
  COMPLIANCE_VIOLATION = 'compliance_violation',
  
  // Performance errors
  TOO_COMPLEX = 'too_complex',
  INFINITE_LOOP_RISK = 'infinite_loop_risk',
  RESOURCE_INTENSIVE = 'resource_intensive'
}

// 🎯 BUSINESS RULES INTERFACE
interface BusinessRule {
  id: string;
  name: string;
  description: string;
  category: 'hr' | 'finance' | 'operations' | 'compliance' | 'security';
  severity: ValidationError['severity'];
  validate: (nodes: Node[], edges: Edge[]) => ValidationError[];
}

// 🎯 ENTERPRISE WORKFLOW VALIDATOR
export class WorkflowValidator {
  private businessRules: BusinessRule[] = [];
  private customValidators: Map<string, Function> = new Map();

  constructor() {
    this.initializeBusinessRules();
  }

  // 🔍 MAIN VALIDATION ENTRY POINT
  public validate(nodes: Node[], edges: Edge[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // 1. Structural validation
    errors.push(...this.validateStructure(nodes, edges));
    
    // 2. Connection validation
    errors.push(...this.validateConnections(nodes, edges));
    
    // 3. Node configuration validation
    errors.push(...this.validateNodeConfigurations(nodes));
    
    // 4. Business rules validation
    errors.push(...this.validateBusinessRules(nodes, edges));
    
    // 5. Performance validation
    warnings.push(...this.validatePerformance(nodes, edges));
    
    // 6. Best practices suggestions
    suggestions.push(...this.generateSuggestions(nodes, edges));

    // Calculate validation score
    const score = this.calculateValidationScore(errors, warnings);
    
    // Generate metadata
    const metadata = this.generateMetadata(nodes, edges, errors);

    return {
      isValid: errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0,
      score,
      errors,
      warnings,
      suggestions,
      metadata
    };
  }

  // 🏗️ STRUCTURAL VALIDATION
  private validateStructure(nodes: Node[], edges: Edge[]): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check for start nodes
    const startNodes = nodes.filter(node => node.type === 'start');
    if (startNodes.length === 0) {
      errors.push({
        id: 'struct-001',
        type: ValidationErrorType.NO_START_NODE,
        severity: 'critical',
        message: 'No start node found',
        description: 'Every workflow must have at least one start node (trigger) to begin execution.',
        fix: {
          action: 'Add a start node',
          description: 'Drag a trigger from the palette to create a workflow entry point.',
          automated: false
        }
      });
    } else if (startNodes.length > 3) {
      errors.push({
        id: 'struct-002',
        type: ValidationErrorType.MULTIPLE_START_NODES,
        severity: 'medium',
        message: 'Too many start nodes',
        description: 'Having more than 3 start nodes can make the workflow confusing and hard to maintain.',
      });
    }

    // Check for end nodes or terminal paths
    const hasEndNode = nodes.some(node => node.type === 'end');
    const terminalNodes = this.findTerminalNodes(nodes, edges);
    
    if (!hasEndNode && terminalNodes.length === 0) {
      errors.push({
        id: 'struct-003',
        type: ValidationErrorType.NO_END_NODE,
        severity: 'high',
        message: 'No end node or terminal path',
        description: 'Workflows should have clear termination points to prevent infinite execution.',
        fix: {
          action: 'Add an end node',
          description: 'Add an end node or ensure some paths naturally terminate.',
          automated: false
        }
      });
    }

    // Check for orphaned nodes
    const orphanedNodes = this.findOrphanedNodes(nodes, edges);
    if (orphanedNodes.length > 0) {
      errors.push({
        id: 'struct-004',
        type: ValidationErrorType.ORPHANED_NODES,
        severity: 'medium',
        message: `${orphanedNodes.length} orphaned nodes found`,
        description: 'Orphaned nodes are not connected to the main workflow and will never execute.',
        nodeId: orphanedNodes[0].id,
        fix: {
          action: 'Connect or remove orphaned nodes',
          description: 'Either connect these nodes to the workflow or remove them.',
          automated: false
        }
      });
    }

    // Check for circular dependencies
    const circularPaths = this.detectCircularDependencies(nodes, edges);
    if (circularPaths.length > 0) {
      errors.push({
        id: 'struct-005',
        type: ValidationErrorType.CIRCULAR_DEPENDENCY,
        severity: 'high',
        message: 'Circular dependency detected',
        description: 'Circular dependencies can cause infinite loops and prevent workflow completion.',
        fix: {
          action: 'Remove circular dependencies',
          description: 'Add conditions or break points to prevent infinite loops.',
          automated: false
        }
      });
    }

    return errors;
  }

  // 🔗 CONNECTION VALIDATION
  private validateConnections(nodes: Node[], edges: Edge[]): ValidationError[] {
    const errors: ValidationError[] = [];

    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);

      if (!sourceNode || !targetNode) {
        errors.push({
          id: `conn-${edge.id}`,
          type: ValidationErrorType.INVALID_CONNECTION,
          severity: 'high',
          message: 'Invalid connection',
          description: 'Connection references nodes that do not exist.',
          edgeId: edge.id,
          fix: {
            action: 'Remove invalid connection',
            description: 'Remove this connection as it points to non-existent nodes.',
            automated: true
          }
        });
        return;
      }

      // Validate connection compatibility
      if (!this.areNodesCompatible(sourceNode, targetNode)) {
        errors.push({
          id: `conn-compat-${edge.id}`,
          type: ValidationErrorType.INVALID_CONNECTION,
          severity: 'medium',
          message: 'Incompatible node connection',
          description: `${sourceNode.type} nodes cannot connect directly to ${targetNode.type} nodes.`,
          edgeId: edge.id
        });
      }
    });

    // Check for nodes with missing required connections
    nodes.forEach(node => {
      const incomingEdges = edges.filter(e => e.target === node.id);
      const outgoingEdges = edges.filter(e => e.source === node.id);

      // Start nodes should have no incoming connections
      if (node.type === 'start' && incomingEdges.length > 0) {
        errors.push({
          id: `conn-start-${node.id}`,
          type: ValidationErrorType.INVALID_CONNECTION,
          severity: 'medium',
          message: 'Start node has incoming connections',
          description: 'Start nodes should not have incoming connections as they are workflow triggers.',
          nodeId: node.id
        });
      }

      // Non-start nodes should have incoming connections
      if (node.type !== 'start' && incomingEdges.length === 0) {
        errors.push({
          id: `conn-in-${node.id}`,
          type: ValidationErrorType.MISSING_CONNECTIONS,
          severity: 'medium',
          message: 'Node has no incoming connections',
          description: 'This node will never be reached during workflow execution.',
          nodeId: node.id
        });
      }

      // End nodes should have no outgoing connections
      if (node.type === 'end' && outgoingEdges.length > 0) {
        errors.push({
          id: `conn-end-${node.id}`,
          type: ValidationErrorType.INVALID_CONNECTION,
          severity: 'medium',
          message: 'End node has outgoing connections',
          description: 'End nodes should not have outgoing connections as they terminate the workflow.',
          nodeId: node.id
        });
      }
    });

    return errors;
  }

  // ⚙️ NODE CONFIGURATION VALIDATION
  private validateNodeConfigurations(nodes: Node[]): ValidationError[] {
    const errors: ValidationError[] = [];

    nodes.forEach(node => {
      const nodeData = node.data || {};

      // Validate based on node type
      switch (node.type) {
        case 'action':
          if (!nodeData.actionId) {
            errors.push({
              id: `config-action-${node.id}`,
              type: ValidationErrorType.MISSING_REQUIRED_FIELDS,
              severity: 'high',
              message: 'Action node missing action type',
              description: 'Action nodes must specify which action to perform.',
              nodeId: node.id
            });
          }
          break;

        case 'approval':
          if (!nodeData.approverRole) {
            errors.push({
              id: `config-approval-${node.id}`,
              type: ValidationErrorType.MISSING_REQUIRED_FIELDS,
              severity: 'high',
              message: 'Approval node missing approver role',
              description: 'Approval nodes must specify who can approve the request.',
              nodeId: node.id
            });
          }
          break;

        case 'decision':
          if (!nodeData.condition && !nodeData.rules) {
            errors.push({
              id: `config-decision-${node.id}`,
              type: ValidationErrorType.MISSING_REQUIRED_FIELDS,
              severity: 'high',
              message: 'Decision node missing logic',
              description: 'Decision nodes must have conditions or rules to make decisions.',
              nodeId: node.id
            });
          }
          break;
      }

      // Validate required fields
      if (!nodeData.label || nodeData.label.trim() === '') {
        errors.push({
          id: `config-label-${node.id}`,
          type: ValidationErrorType.MISSING_REQUIRED_FIELDS,
          severity: 'low',
          message: 'Node missing label',
          description: 'All nodes should have descriptive labels for better workflow understanding.',
          nodeId: node.id
        });
      }
    });

    return errors;
  }

  // 📋 BUSINESS RULES VALIDATION
  private validateBusinessRules(nodes: Node[], edges: Edge[]): ValidationError[] {
    const errors: ValidationError[] = [];

    this.businessRules.forEach(rule => {
      const ruleErrors = rule.validate(nodes, edges);
      errors.push(...ruleErrors);
    });

    return errors;
  }

  // ⚡ PERFORMANCE VALIDATION
  private validatePerformance(nodes: Node[], edges: Edge[]): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];

    // Check workflow complexity
    if (nodes.length > 50) {
      warnings.push({
        id: 'perf-001',
        type: 'complexity',
        message: 'Very complex workflow',
        description: 'Workflows with more than 50 nodes can be difficult to maintain and debug.',
        impact: 'maintainability'
      });
    }

    // Check for deeply nested paths
    const maxDepth = this.calculateMaxPath(nodes, edges);
    if (maxDepth > 20) {
      warnings.push({
        id: 'perf-002',
        type: 'depth',
        message: 'Very deep workflow paths',
        description: 'Deep workflow paths can impact performance and user experience.',
        impact: 'performance'
      });
    }

    return warnings;
  }

  // 💡 SUGGESTIONS GENERATION
  private generateSuggestions(nodes: Node[], edges: Edge[]): ValidationSuggestion[] {
    const suggestions: ValidationSuggestion[] = [];

    // Suggest adding descriptions to nodes
    const nodesWithoutDescriptions = nodes.filter(n => !n.data?.description);
    if (nodesWithoutDescriptions.length > 0) {
      suggestions.push({
        id: 'sug-001',
        type: 'documentation',
        message: 'Add descriptions to nodes',
        description: 'Adding descriptions helps team members understand the workflow better.',
        improvement: 'maintainability',
        priority: 'medium'
      });
    }

    // Suggest grouping related actions
    if (nodes.length > 10) {
      suggestions.push({
        id: 'sug-002',
        type: 'organization',
        message: 'Consider breaking into sub-workflows',
        description: 'Large workflows can be broken into smaller, reusable sub-workflows.',
        improvement: 'maintainability',
        priority: 'medium'
      });
    }

    return suggestions;
  }

  // 📊 HELPER METHODS
  private findTerminalNodes(nodes: Node[], edges: Edge[]): Node[] {
    return nodes.filter(node => {
      const outgoingEdges = edges.filter(e => e.source === node.id);
      return outgoingEdges.length === 0 && node.type !== 'start';
    });
  }

  private findOrphanedNodes(nodes: Node[], edges: Edge[]): Node[] {
    const connectedNodeIds = new Set([
      ...edges.map(e => e.source),
      ...edges.map(e => e.target)
    ]);
    
    return nodes.filter(node => 
      !connectedNodeIds.has(node.id) && node.type !== 'start'
    );
  }

  private detectCircularDependencies(nodes: Node[], edges: Edge[]): string[][] {
    // Simple cycle detection using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (nodeId: string, path: string[] = []): boolean => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodeId);
        cycles.push(path.slice(cycleStart));
        return true;
      }

      if (visited.has(nodeId)) {
        return false;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingEdges = edges.filter(e => e.source === nodeId);
      for (const edge of outgoingEdges) {
        if (dfs(edge.target, [...path, nodeId])) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    });

    return cycles;
  }

  private areNodesCompatible(sourceNode: Node, targetNode: Node): boolean {
    // Define compatibility rules
    const incompatiblePairs = [
      ['end', 'start'],
      ['end', 'action'],
      ['end', 'decision'],
      ['end', 'approval']
    ];

    return !incompatiblePairs.some(([source, target]) => 
      sourceNode.type === source && targetNode.type === target
    );
  }

  private calculateMaxPath(nodes: Node[], edges: Edge[]): number {
    // Calculate the longest path in the workflow
    const startNodes = nodes.filter(n => n.type === 'start');
    let maxDepth = 0;

    const dfs = (nodeId: string, depth: number, visited: Set<string>): number => {
      if (visited.has(nodeId)) return depth;
      
      visited.add(nodeId);
      const outgoingEdges = edges.filter(e => e.source === nodeId);
      
      if (outgoingEdges.length === 0) {
        return depth;
      }

      let maxChildDepth = depth;
      for (const edge of outgoingEdges) {
        const childDepth = dfs(edge.target, depth + 1, new Set(visited));
        maxChildDepth = Math.max(maxChildDepth, childDepth);
      }

      return maxChildDepth;
    };

    startNodes.forEach(startNode => {
      const pathDepth = dfs(startNode.id, 1, new Set());
      maxDepth = Math.max(maxDepth, pathDepth);
    });

    return maxDepth;
  }

  private calculateValidationScore(
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): number {
    let score = 100;

    // Deduct points for errors
    errors.forEach(error => {
      switch (error.severity) {
        case 'critical': score -= 20; break;
        case 'high': score -= 10; break;
        case 'medium': score -= 5; break;
        case 'low': score -= 2; break;
      }
    });

    // Deduct points for warnings
    score -= warnings.length * 2;

    return Math.max(0, score);
  }

  private generateMetadata(
    nodes: Node[], 
    edges: Edge[], 
    errors: ValidationError[]
  ) {
    const criticalErrors = errors.filter(e => e.severity === 'critical').length;
    const highErrors = errors.filter(e => e.severity === 'high').length;

    let complexity: 'low' | 'medium' | 'high' | 'very-high' = 'low';
    if (nodes.length > 30) complexity = 'very-high';
    else if (nodes.length > 15) complexity = 'high';
    else if (nodes.length > 5) complexity = 'medium';

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (criticalErrors > 0) riskLevel = 'high';
    else if (highErrors > 0) riskLevel = 'medium';

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      complexity,
      estimatedDuration: nodes.length * 2, // Rough estimate: 2 minutes per node
      riskLevel
    };
  }

  // 📋 BUSINESS RULES INITIALIZATION
  private initializeBusinessRules() {
    // HR Workflow Rules
    this.businessRules.push({
      id: 'hr-001',
      name: 'HR Approval Chain',
      description: 'HR workflows must include proper approval chain',
      category: 'hr',
      severity: 'high',
      validate: (nodes: Node[], edges: Edge[]) => {
        const errors: ValidationError[] = [];
        const hrActions = nodes.filter(n => 
          n.data?.category === 'hr' || n.data?.actionId?.includes('hr')
        );
        
        hrActions.forEach(node => {
          // Check if HR action has approval step
          const hasApproval = this.hasDownstreamNodeType(node.id, 'approval', nodes, edges);
          if (!hasApproval) {
            errors.push({
              id: `hr-approval-${node.id}`,
              type: ValidationErrorType.APPROVAL_CHAIN_BROKEN,
              severity: 'high',
              message: 'HR action missing approval step',
              description: 'HR actions require approval before execution for compliance.',
              nodeId: node.id
            });
          }
        });

        return errors;
      }
    });

    // Finance Workflow Rules
    this.businessRules.push({
      id: 'fin-001',
      name: 'Expense Approval Limits',
      description: 'Financial workflows must respect approval limits',
      category: 'finance',
      severity: 'high',
      validate: (nodes: Node[], edges: Edge[]) => {
        const errors: ValidationError[] = [];
        const expenseNodes = nodes.filter(n => 
          n.data?.actionId?.includes('expense') || n.data?.category === 'finance'
        );
        
        expenseNodes.forEach(node => {
          const hasManagerApproval = this.hasDownstreamNodeType(node.id, 'approval', nodes, edges);
          if (!hasManagerApproval) {
            errors.push({
              id: `fin-approval-${node.id}`,
              type: ValidationErrorType.COMPLIANCE_VIOLATION,
              severity: 'high',
              message: 'Financial action requires approval',
              description: 'All financial actions must include approval step for audit compliance.',
              nodeId: node.id
            });
          }
        });

        return errors;
      }
    });
  }

  private hasDownstreamNodeType(
    nodeId: string, 
    targetType: string, 
    nodes: Node[], 
    edges: Edge[]
  ): boolean {
    const visited = new Set<string>();
    
    const search = (currentId: string): boolean => {
      if (visited.has(currentId)) return false;
      visited.add(currentId);

      const outgoingEdges = edges.filter(e => e.source === currentId);
      for (const edge of outgoingEdges) {
        const targetNode = nodes.find(n => n.id === edge.target);
        if (targetNode?.type === targetType) {
          return true;
        }
        if (search(edge.target)) {
          return true;
        }
      }

      return false;
    };

    return search(nodeId);
  }
}

// 🌟 SINGLETON VALIDATOR INSTANCE
export const workflowValidator = new WorkflowValidator();

// 🎯 CONVENIENCE FUNCTIONS
export function validateWorkflow(nodes: Node[], edges: Edge[]): ValidationResult {
  return workflowValidator.validate(nodes, edges);
}

export function validateQuick(nodes: Node[], edges: Edge[]): boolean {
  const result = workflowValidator.validate(nodes, edges);
  return result.isValid;
}

export function getValidationSummary(nodes: Node[], edges: Edge[]): string {
  const result = workflowValidator.validate(nodes, edges);
  const criticalErrors = result.errors.filter(e => e.severity === 'critical').length;
  const highErrors = result.errors.filter(e => e.severity === 'high').length;
  
  if (result.isValid) {
    return `✅ Workflow is valid (Score: ${result.score}/100)`;
  } else {
    return `❌ Workflow has issues: ${criticalErrors} critical, ${highErrors} high severity errors`;
  }
}