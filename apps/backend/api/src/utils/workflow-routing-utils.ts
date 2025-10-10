/**
 * Workflow Routing Detection Utilities
 * 
 * Analizza workflow templates per identificare nodi di routing (team/user)
 * e determinare quali richiedono assegnazioni manuali.
 */

import { WorkflowTemplate, WorkflowNode } from '../types/workflow-shared';

/**
 * Informazioni su un nodo di routing rilevato
 */
export interface RoutingNodeInfo {
  nodeId: string;
  label?: string;
  assignmentMode?: 'auto' | 'manual';
  forDepartment?: string;
  teamIds?: string[];
  userIds?: string[];
}

/**
 * Risultato della detection dei nodi routing
 */
export interface WorkflowRoutingInfo {
  teams: {
    hasManualRouting: boolean;
    manualNodes: RoutingNodeInfo[];
    autoNodes: RoutingNodeInfo[];
  };
  users: {
    hasManualRouting: boolean;
    manualNodes: RoutingNodeInfo[];
    autoNodes: RoutingNodeInfo[];
  };
}

/**
 * Analizza un workflow template per identificare nodi di routing
 * 
 * @param template - Il workflow template da analizzare
 * @returns Informazioni strutturate sui nodi di routing trovati
 */
export function detectWorkflowRoutingNodes(template: WorkflowTemplate): WorkflowRoutingInfo {
  const teamManualNodes: RoutingNodeInfo[] = [];
  const teamAutoNodes: RoutingNodeInfo[] = [];
  const userManualNodes: RoutingNodeInfo[] = [];
  const userAutoNodes: RoutingNodeInfo[] = [];

  // Analizza tutti i nodi del template
  template.nodes.forEach((node: WorkflowNode) => {
    // Rileva nodi team-routing
    if (node.type === 'team-routing') {
      const nodeInfo: RoutingNodeInfo = {
        nodeId: node.id,
        label: node.data?.label,
        assignmentMode: node.data?.assignmentMode || 'auto',
        forDepartment: node.data?.forDepartment,
        teamIds: node.data?.teamIds
      };

      if (nodeInfo.assignmentMode === 'manual') {
        teamManualNodes.push(nodeInfo);
      } else {
        teamAutoNodes.push(nodeInfo);
      }
    }

    // Rileva nodi user-routing
    if (node.type === 'user-routing') {
      const nodeInfo: RoutingNodeInfo = {
        nodeId: node.id,
        label: node.data?.label,
        assignmentMode: node.data?.assignmentMode || 'auto',
        forDepartment: node.data?.forDepartment,
        userIds: node.data?.userIds
      };

      if (nodeInfo.assignmentMode === 'manual') {
        userManualNodes.push(nodeInfo);
      } else {
        userAutoNodes.push(nodeInfo);
      }
    }
  });

  return {
    teams: {
      hasManualRouting: teamManualNodes.length > 0,
      manualNodes: teamManualNodes,
      autoNodes: teamAutoNodes
    },
    users: {
      hasManualRouting: userManualNodes.length > 0,
      manualNodes: userManualNodes,
      autoNodes: userAutoNodes
    }
  };
}

/**
 * Verifica se un workflow ha nodi team-routing manuali
 */
export function hasManualTeamRouting(template: WorkflowTemplate): boolean {
  return detectWorkflowRoutingNodes(template).teams.hasManualRouting;
}

/**
 * Verifica se un workflow ha nodi user-routing manuali
 */
export function hasManualUserRouting(template: WorkflowTemplate): boolean {
  return detectWorkflowRoutingNodes(template).users.hasManualRouting;
}

/**
 * Ottiene solo i nodi team-routing manuali
 */
export function getManualTeamRoutingNodes(template: WorkflowTemplate): RoutingNodeInfo[] {
  return detectWorkflowRoutingNodes(template).teams.manualNodes;
}

/**
 * Ottiene solo i nodi user-routing manuali
 */
export function getManualUserRoutingNodes(template: WorkflowTemplate): RoutingNodeInfo[] {
  return detectWorkflowRoutingNodes(template).users.manualNodes;
}
