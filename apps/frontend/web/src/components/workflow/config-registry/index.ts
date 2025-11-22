/**
 * 🎯 WORKFLOW NODE CONFIG REGISTRY
 * 
 * Centralized registry mapping node IDs to their configuration components.
 * This architecture enables:
 * - Reuse of config forms between Dialog (legacy) and Sheet (new) layouts
 * - Separation of concerns: presentation vs. configuration logic
 * - Easy extension: add new node types without modifying shells
 * 
 * PHASE 1 (v1.0):
 * Extract 5 highest-traffic nodes:
 * - ai-decision, send-email, create-task, approve-request, if-condition
 * 
 * PHASE 2 (v2.0):
 * Migrate remaining ~15 node types incrementally
 */

import { ComponentType } from 'react';
import { Node, Edge } from '@xyflow/react';
import DatabaseOperationConfig from '../config-components/DatabaseOperationConfig';

/**
 * Standard props signature for all node configuration components
 */
export interface NodeConfigProps {
  node: Node;
  allNodes: Node[];
  edges: Edge[];
  onSave: (nodeId: string, config: unknown) => void;
  onClose: () => void;
}

/**
 * Node configuration component type
 */
export type NodeConfigRenderer = ComponentType<NodeConfigProps>;

/**
 * Registry mapping node.data.id → configuration component
 */
export const WORKFLOW_NODE_CONFIG_REGISTRY: Record<string, NodeConfigRenderer> = {
  // Phase 1: Core nodes
  // 'ai-decision': AiDecisionConfig,
  // 'send-email': SendEmailConfig,
  // 'create-task': TaskCreateConfig,
  // 'approve-request': ApprovalRequestConfig,
  // 'if-condition': IfConditionConfig,
  
  // W3Suite Data Operations
  'w3-database-operation': DatabaseOperationConfig,
  
  // Phase 2: Remaining nodes (TBD)
};

/**
 * Get configuration component for a node
 * @param nodeId The node.data.id identifier
 * @returns Configuration component or null if not registered
 */
export function getNodeConfigComponent(nodeId: string): NodeConfigRenderer | null {
  return WORKFLOW_NODE_CONFIG_REGISTRY[nodeId] || null;
}

/**
 * Check if a node has a registered configuration component
 */
export function hasNodeConfig(nodeId: string): boolean {
  return nodeId in WORKFLOW_NODE_CONFIG_REGISTRY;
}
