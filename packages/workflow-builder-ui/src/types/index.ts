/**
 * 🎯 WORKFLOW BUILDER UI TYPES
 * 
 * Shared TypeScript interfaces for ReactFlow workflow builder
 * across Brand Interface and W3 Suite tenant apps.
 */

import type { Node, Edge } from '@xyflow/react';

/**
 * Workflow node types supported by the builder
 */
export type WorkflowNodeType =
  | 'start'
  | 'action'
  | 'decision'
  | 'ai-decision'
  | 'approval'
  | 'routing'
  | 'trigger'
  | 'campaign-lead-intake'
  | 'pipeline-assignment'
  | 'funnel-stage-transition'
  | 'funnel-pipeline-transition'
  | 'ai-funnel-orchestrator'
  | 'funnel-exit'
  | 'deal-stage-webhook-trigger'
  | 'switch-case'
  | 'while-loop'
  | 'parallel-fork'
  | 'join-sync'
  | 'end';

/**
 * Node data structure for workflow builder
 */
export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  executorId?: string;
  config?: Record<string, any>;
  description?: string;
  locked?: boolean;
  brandTemplateId?: string;
  overrideConfig?: Record<string, any>;
}

/**
 * Extended ReactFlow node with workflow data
 */
export type WorkflowNode = Node<WorkflowNodeData, WorkflowNodeType>;

/**
 * Extended ReactFlow edge for workflows
 */
export type WorkflowEdge = Edge & {
  label?: string;
  condition?: string;
};

/**
 * Workflow builder mode
 */
export type BuilderMode = 'brand' | 'tenant';

/**
 * Node palette category
 */
export interface NodePaletteCategory {
  id: string;
  label: string;
  icon?: string;
  nodes: NodePaletteItem[];
}

/**
 * Individual node in palette
 */
export interface NodePaletteItem {
  type: WorkflowNodeType;
  label: string;
  description: string;
  icon?: string;
  executorId?: string;
  defaultConfig?: Record<string, any>;
}

/**
 * Workflow validation result
 */
export interface WorkflowValidationResult {
  valid: boolean;
  errors: WorkflowValidationError[];
  warnings: WorkflowValidationWarning[];
}

/**
 * Validation error
 */
export interface WorkflowValidationError {
  nodeId: string;
  message: string;
  field?: string;
}

/**
 * Validation warning
 */
export interface WorkflowValidationWarning {
  nodeId: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Workflow save payload
 */
export interface WorkflowSavePayload {
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  version?: number;
  metadata?: Record<string, any>;
}
