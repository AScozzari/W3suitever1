/**
 * 🎯 WORKFLOW BUILDER HOOK
 * 
 * React hook for managing workflow builder state and operations.
 */

import { useState, useCallback } from 'react';
import type { WorkflowNode, WorkflowEdge, WorkflowSavePayload } from '../types';
import { validateWorkflow } from '../utils/validation';

interface UseWorkflowBuilderOptions {
  initialNodes?: WorkflowNode[];
  initialEdges?: WorkflowEdge[];
  onSave?: (payload: WorkflowSavePayload) => Promise<void>;
}

export function useWorkflowBuilder({
  initialNodes = [],
  initialEdges = [],
  onSave
}: UseWorkflowBuilderOptions = {}) {
  const [nodes, setNodes] = useState<WorkflowNode[]>(initialNodes);
  const [edges, setEdges] = useState<WorkflowEdge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const addNode = useCallback((node: WorkflowNode) => {
    setNodes(prev => [...prev, node]);
    setIsDirty(true);
  }, []);

  const updateNode = useCallback((nodeId: string, updates: Partial<WorkflowNode>) => {
    setNodes(prev => prev.map(n => 
      n.id === nodeId ? { ...n, ...updates } : n
    ));
    setIsDirty(true);
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    setIsDirty(true);
  }, []);

  const addEdge = useCallback((edge: WorkflowEdge) => {
    setEdges(prev => [...prev, edge]);
    setIsDirty(true);
  }, []);

  const removeEdge = useCallback((edgeId: string) => {
    setEdges(prev => prev.filter(e => e.id !== edgeId));
    setIsDirty(true);
  }, []);

  const validate = useCallback(() => {
    return validateWorkflow(nodes, edges);
  }, [nodes, edges]);

  const save = useCallback(async (name: string, description?: string) => {
    if (!onSave) return;

    const validation = validate();
    if (!validation.valid) {
      throw new Error('Workflow validation failed: ' + validation.errors.map(e => e.message).join(', '));
    }

    setIsSaving(true);
    try {
      await onSave({
        name,
        description,
        nodes,
        edges
      });
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  }, [nodes, edges, validate, onSave]);

  const reset = useCallback(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setSelectedNode(null);
    setIsDirty(false);
  }, [initialNodes, initialEdges]);

  return {
    nodes,
    edges,
    selectedNode,
    isSaving,
    isDirty,
    setNodes,
    setEdges,
    setSelectedNode,
    addNode,
    updateNode,
    removeNode,
    addEdge,
    removeEdge,
    validate,
    save,
    reset
  };
}
