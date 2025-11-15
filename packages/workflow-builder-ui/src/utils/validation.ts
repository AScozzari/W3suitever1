/**
 * 🎯 WORKFLOW VALIDATION UTILITIES
 * 
 * Validates workflow structure, connections, and configuration.
 */

import type { 
  WorkflowNode, 
  WorkflowEdge, 
  WorkflowValidationResult,
  WorkflowValidationError,
  WorkflowValidationWarning
} from '../types';

/**
 * Validate complete workflow
 */
export function validateWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): WorkflowValidationResult {
  const errors: WorkflowValidationError[] = [];
  const warnings: WorkflowValidationWarning[] = [];

  // Check for start node
  const startNodes = nodes.filter(n => n.type === 'start');
  if (startNodes.length === 0) {
    errors.push({
      nodeId: '',
      message: 'Workflow must have at least one Start node'
    });
  } else if (startNodes.length > 1) {
    warnings.push({
      nodeId: startNodes[1].id,
      message: 'Multiple Start nodes detected',
      severity: 'medium'
    });
  }

  // Check for end node
  const endNodes = nodes.filter(n => n.type === 'end');
  if (endNodes.length === 0) {
    warnings.push({
      nodeId: '',
      message: 'Workflow should have at least one End node',
      severity: 'low'
    });
  }

  // Check for disconnected nodes
  const connectedNodeIds = new Set<string>();
  edges.forEach(edge => {
    if (edge.source) connectedNodeIds.add(edge.source);
    if (edge.target) connectedNodeIds.add(edge.target);
  });

  nodes.forEach(node => {
    if (!connectedNodeIds.has(node.id) && node.type !== 'start') {
      warnings.push({
        nodeId: node.id,
        message: `Node "${node.data.label}" is not connected`,
        severity: 'high'
      });
    }
  });

  // Check for nodes without executorId (except start/end)
  nodes.forEach(node => {
    if (node.type !== 'start' && node.type !== 'end') {
      if (!node.data.executorId) {
        errors.push({
          nodeId: node.id,
          message: `Node "${node.data.label}" is missing executorId`,
          field: 'executorId'
        });
      }
    }
  });

  // Check for required config fields
  nodes.forEach(node => {
    if (node.data.executorId && !node.data.config) {
      warnings.push({
        nodeId: node.id,
        message: `Node "${node.data.label}" has no configuration`,
        severity: 'medium'
      });
    }
  });

  // Check for cycles (basic detection)
  const hasCycle = detectCycle(nodes, edges);
  if (hasCycle) {
    warnings.push({
      nodeId: '',
      message: 'Workflow contains a cycle (loop detected)',
      severity: 'high'
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Simple cycle detection using DFS
 */
function detectCycle(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
  const adjList = new Map<string, string[]>();
  
  nodes.forEach(node => adjList.set(node.id, []));
  edges.forEach(edge => {
    const sources = adjList.get(edge.source) || [];
    sources.push(edge.target);
    adjList.set(edge.source, sources);
  });

  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);

    const neighbors = adjList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  for (const nodeId of adjList.keys()) {
    if (!visited.has(nodeId)) {
      if (dfs(nodeId)) return true;
    }
  }

  return false;
}

/**
 * Validate node configuration against executor requirements
 */
export function validateNodeConfig(
  node: WorkflowNode,
  requiredFields: string[] = []
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!node.data.config) {
    if (requiredFields.length > 0) {
      errors.push('Configuration is required but not provided');
    }
    return { valid: errors.length === 0, errors };
  }

  requiredFields.forEach(field => {
    if (!(field in node.data.config!)) {
      errors.push(`Required field "${field}" is missing`);
    }
  });

  return { valid: errors.length === 0, errors };
}
