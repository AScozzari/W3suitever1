/**
 * 🤖 AI WORKFLOW GENERATION SCHEMA
 * Zod schema per validazione workflow JSON generato da AI
 */

import { z } from 'zod';

// Position Schema
export const PositionSchema = z.object({
  x: z.number(),
  y: z.number()
});

// Node Data Schema
export const NodeDataSchema = z.object({
  label: z.string(),
  config: z.record(z.any()).optional(), // Config specifico per tipo nodo
  description: z.string().optional()
});

// Workflow Node Schema
export const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(), // Es: 'send-email', 'approve-request', 'ai-decision'
  position: PositionSchema,
  data: NodeDataSchema
});

// Workflow Edge Schema
export const WorkflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(), // Source node ID
  target: z.string(), // Target node ID
  sourceHandle: z.string().optional().default('output'),
  targetHandle: z.string().optional().default('input'),
  label: z.string().optional(),
  type: z.string().optional().default('default')
});

// Complete Workflow Schema
export const AIWorkflowSchema = z.object({
  nodes: z.array(WorkflowNodeSchema).min(1, "Workflow must have at least one node"),
  edges: z.array(WorkflowEdgeSchema).default([])
});

// TypeScript Types
export type AIWorkflowNode = z.infer<typeof WorkflowNodeSchema>;
export type AIWorkflowEdge = z.infer<typeof WorkflowEdgeSchema>;
export type AIWorkflow = z.infer<typeof AIWorkflowSchema>;

// Validation Helper
export function validateAIWorkflow(data: unknown): { success: true; data: AIWorkflow } | { success: false; error: string } {
  try {
    const validated = AIWorkflowSchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      };
    }
    return { success: false, error: 'Unknown validation error' };
  }
}
