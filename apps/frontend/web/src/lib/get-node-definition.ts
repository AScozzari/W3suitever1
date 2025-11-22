/**
 * 🔍 GET NODE DEFINITION HELPER
 * Retrieves node definition with configSchema from node ID
 */

import { ALL_WORKFLOW_NODES } from './workflow-node-definitions';
import { BaseNodeDefinition } from '../types/workflow-nodes';

/**
 * Get node definition by node ID
 * Returns null if not found
 */
export function getNodeDefinition(nodeId: string): BaseNodeDefinition | null {
  return ALL_WORKFLOW_NODES.find((node) => node.id === nodeId) || null;
}

/**
 * Get node config schema by node ID
 * Returns null if not found or schema not available
 */
export function getNodeConfigSchema(nodeId: string) {
  const nodeDef = getNodeDefinition(nodeId);
  return nodeDef?.configSchema || null;
}

/**
 * Get node default config by node ID
 * Returns empty object if not found
 */
export function getNodeDefaultConfig(nodeId: string): Record<string, any> {
  const nodeDef = getNodeDefinition(nodeId);
  return nodeDef?.defaultConfig || {};
}
