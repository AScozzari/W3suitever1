/**
 * 🎯 WORKFLOW CANVAS COMPONENT
 * 
 * Main ReactFlow canvas for workflow building.
 * Supports both Brand (full edit) and Tenant (locked nodes + override config) modes.
 */

import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  EdgeTypes,
  Panel
} from '@xyflow/react';
import type { WorkflowNode, WorkflowEdge, BuilderMode } from '../types';

interface WorkflowCanvasProps {
  initialNodes?: WorkflowNode[];
  initialEdges?: WorkflowEdge[];
  mode: BuilderMode;
  nodeTypes: NodeTypes;
  edgeTypes?: EdgeTypes;
  onNodesChange?: (nodes: WorkflowNode[]) => void;
  onEdgesChange?: (edges: WorkflowEdge[]) => void;
  readOnly?: boolean;
  className?: string;
}

export function WorkflowCanvas({
  initialNodes = [],
  initialEdges = [],
  mode,
  nodeTypes,
  edgeTypes,
  onNodesChange,
  onEdgesChange,
  readOnly = false,
  className = ''
}: WorkflowCanvasProps) {
  // Compute effective readOnly state from mode or prop
  const computedReadOnly = mode === 'tenant' || readOnly;
  
  // Add readOnly flag to all nodes for tenant mode
  const nodesWithReadOnly = initialNodes.map(node => ({
    ...node,
    data: { ...node.data, readOnly: computedReadOnly }
  }));
  
  const [nodes, setNodes, handleNodesChange] = useNodesState<WorkflowNode>(nodesWithReadOnly);
  const [edges, setEdges, handleEdgesChange] = useEdgesState<WorkflowEdge>(initialEdges);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (computedReadOnly) return;
      
      const newEdges = addEdge(connection, edges);
      setEdges(newEdges);
      onEdgesChange?.(newEdges as WorkflowEdge[]);
    },
    [edges, setEdges, onEdgesChange, computedReadOnly]
  );

  const onNodesUpdate = useCallback(
    (changes: any) => {
      if (computedReadOnly) return;
      
      handleNodesChange(changes);
      onNodesChange?.(nodes);
    },
    [handleNodesChange, onNodesChange, nodes, computedReadOnly]
  );

  const onEdgesUpdate = useCallback(
    (changes: any) => {
      if (computedReadOnly) return;
      
      handleEdgesChange(changes);
      onEdgesChange?.(edges);
    },
    [handleEdgesChange, onEdgesChange, edges, computedReadOnly]
  );

  return (
    <div className={`w-full h-full ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesUpdate}
        onEdgesChange={onEdgesUpdate}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        nodesDraggable={!computedReadOnly}
        nodesConnectable={!computedReadOnly}
        elementsSelectable={!computedReadOnly}
      >
        <Background />
        <Controls />
        <MiniMap />
        
        {mode === 'tenant' && (
          <Panel position="top-right" className="bg-yellow-100 border border-yellow-400 rounded px-3 py-1 text-sm">
            🔒 Template Bloccato - Solo configurazione modificabile
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
