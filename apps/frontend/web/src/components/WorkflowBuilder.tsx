/**
 * 🎯 WORKFLOW BUILDER COMPONENT
 * ReactFlow canvas professionale per drag & drop workflow
 * Integra il catalogo nodi con configurazione dinamica
 */

import React, { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  NodeTypes,
  ReactFlowProvider,
  ReactFlowInstance,
  useReactFlow,
  Panel,
  NodeChange,
  EdgeChange
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  Save, 
  Download, 
  Upload, 
  Play, 
  Square, 
  RotateCcw, 
  RotateCw,
  Settings,
  Palette,
  Eye,
  Trash2,
  Search
} from 'lucide-react';

import { useWorkflowStore } from '../stores/workflowStore';
import { ALL_WORKFLOW_NODES, getNodesByCategory } from '../lib/workflow-node-definitions';
import { WorkflowActionNode } from './workflow-nodes/WorkflowActionNode';
import { WorkflowTriggerNode } from './workflow-nodes/WorkflowTriggerNode';
import { WorkflowAiNode } from './workflow-nodes/WorkflowAiNode';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Custom node types for ReactFlow
const nodeTypes: NodeTypes = {
  action: WorkflowActionNode,
  trigger: WorkflowTriggerNode,
  ai: WorkflowAiNode,
  condition: WorkflowActionNode, // Reuse action node for conditions
  flow: WorkflowActionNode, // Reuse action node for flow control
};

interface WorkflowBuilderProps {
  templateId?: string;
  onSave?: (workflow: { nodes: Node[]; edges: Edge[] }) => void;
  onClose?: () => void;
}

function WorkflowBuilderContent({ templateId, onSave, onClose }: WorkflowBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project } = useReactFlow();
  
  // Workflow store
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    addNode,
    selectNode,
    selectedNodeId,
    isRunning,
    setRunning,
    undo,
    redo,
    clearWorkflow,
    exportWorkflow,
    importWorkflow
  } = useWorkflowStore();
  
  // DEBUG: Log store state
  console.log('🔍 WorkflowBuilder render - nodes from store:', nodes?.length || 0);
  console.log('🔍 WorkflowBuilder render - edges from store:', edges?.length || 0);

  // Local state
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [isNodePaletteOpen, setIsNodePaletteOpen] = useState(true);
  const [draggedNodeType, setDraggedNodeType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // ReactFlow event handlers
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        id: `edge-${params.source}-${params.target}`,
        type: 'default',
        animated: true,
        style: { stroke: '#FF6900', strokeWidth: 2 }
      };
      setEdges(addEdge(newEdge, edges));
    },
    [setEdges, edges]
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const currentNodes = nodes || [];
      const updatedNodes = currentNodes.map((node: Node) => {
        const change = changes.find((c) => 'id' in c && c.id === node.id);
        if (change) {
          if (change.type === 'position' && 'position' in change && change.position) {
            return { ...node, position: change.position };
          }
          if (change.type === 'select' && 'selected' in change) {
            return { ...node, selected: change.selected };
          }
        }
        return node;
      });
      setNodes(updatedNodes);
    },
    [setNodes, nodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const currentEdges = edges || [];
      const updatedEdges = currentEdges.filter((edge: Edge) => {
        const change = changes.find((c) => 'id' in c && c.id === edge.id);
        return !(change && change.type === 'remove');
      });
      setEdges(updatedEdges);
    },
    [setEdges, edges]
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // Drag and drop functionality
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      
      console.log('🎯 DROP EVENT TRIGGERED');
      console.log('reactFlowInstance:', reactFlowInstance);
      console.log('draggedNodeType:', draggedNodeType);

      if (!reactFlowInstance) {
        console.error('❌ No reactFlowInstance');
        return;
      }
      
      if (!draggedNodeType) {
        console.error('❌ No draggedNodeType');
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      console.log('📍 Position calculated:', position);

      const nodeDefinition = ALL_WORKFLOW_NODES.find(n => n.id === draggedNodeType);
      console.log('🔍 Node definition found:', nodeDefinition);
      
      if (!nodeDefinition) {
        console.error('❌ No nodeDefinition found for:', draggedNodeType);
        return;
      }

      const newNode: Node = {
        id: `${nodeDefinition.id}-${Date.now()}`,
        type: nodeDefinition.category,
        position,
        data: {
          ...nodeDefinition,
          config: { ...nodeDefinition.defaultConfig }
        },
        draggable: true,
        connectable: true,
        deletable: true,
        selectable: true,
      };
      
      console.log('✨ New node created:', newNode);
      addNode(newNode);
      console.log('✅ Node added to store');
      setDraggedNodeType(null);
    },
    [reactFlowInstance, addNode, draggedNodeType]
  );

  // Node palette drag start
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    console.log('🚀 DRAG START:', nodeType);
    setDraggedNodeType(nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  // TEST: Add test node function
  const handleTestAddNode = () => {
    console.log('🧪 TEST: Adding test node manually');
    
    const testNode: Node = {
      id: `test-node-${Date.now()}`,
      type: 'action',
      position: { x: 100, y: 100 },
      data: {
        id: 'test-send-email',
        name: 'Test Email Node',
        description: 'Test node for debugging',
        category: 'action',
        color: '#FF6900',
        defaultConfig: { recipient: '', subject: '', body: '' }
      },
      draggable: true,
      connectable: true,
      deletable: true,
      selectable: true,
    };
    
    console.log('🧪 TEST: Created test node:', testNode);
    addNode(testNode);
    console.log('🧪 TEST: Node should be added now');
  };

  // Workflow actions
  const handleSaveWorkflow = () => {
    const workflow = { nodes, edges };
    onSave?.(workflow);
  };

  const handleRunWorkflow = () => {
    setRunning(!isRunning);
  };

  const handleClearWorkflow = () => {
    if (confirm('Are you sure you want to clear the entire workflow?')) {
      clearWorkflow();
    }
  };

  const handleExportWorkflow = () => {
    const workflowData = exportWorkflow();
    const blob = new Blob([workflowData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportWorkflow = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (importWorkflow(content)) {
        alert('Workflow imported successfully!');
      } else {
        alert('Failed to import workflow. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex h-full w-full bg-gray-50">
      {/* Node Palette Sidebar */}
      <div className={`${isNodePaletteOpen ? 'w-80' : 'w-12'} transition-all duration-300 bg-white border-r border-gray-200 flex flex-col`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Node Library</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsNodePaletteOpen(!isNodePaletteOpen)}
              data-testid="toggle-palette"
            >
              {isNodePaletteOpen ? <Eye className="h-4 w-4" /> : <Palette className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {isNodePaletteOpen && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              {/* Search and Filters */}
              <div className="space-y-4 mb-6">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search nodes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-nodes"
                  />
                </div>
                
                {/* Category Filter */}
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="action">Actions</SelectItem>
                    <SelectItem value="trigger">Triggers</SelectItem>
                    <SelectItem value="ai">AI Nodes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-6">
                {/* Action Nodes */}
                {(selectedCategory === 'all' || selectedCategory === 'action') && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 bg-windtre-orange rounded-full" />
                    Actions ({getNodesByCategory('action').filter(node => 
                      !searchTerm || 
                      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length})
                  </h4>
                  <div className="space-y-2">
                    {getNodesByCategory('action')
                      .filter(node => 
                        !searchTerm || 
                        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        node.description.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((node) => (
                      <div
                        key={node.id}
                        className="p-3 windtre-glass-panel rounded-lg border border-gray-200 cursor-move hover:shadow-md transition-all"
                        draggable
                        onDragStart={(e) => onDragStart(e, node.id)}
                        data-testid={`node-palette-${node.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: node.color }}
                          >
                            <span className="text-xs">A</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-sm font-medium text-gray-900 truncate">{node.name}</h5>
                            <p className="text-xs text-gray-600 truncate">{node.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                )}

                {(selectedCategory === 'all' || selectedCategory === 'trigger') && (
                <>
                <Separator />

                {/* Trigger Nodes */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 bg-windtre-purple rounded-full" />
                    Triggers ({getNodesByCategory('trigger').filter(node => 
                      !searchTerm || 
                      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length})
                  </h4>
                  <div className="space-y-2">
                    {getNodesByCategory('trigger')
                      .filter(node => 
                        !searchTerm || 
                        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        node.description.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((node) => (
                      <div
                        key={node.id}
                        className="p-3 windtre-glass-panel rounded-lg border border-gray-200 cursor-move hover:shadow-md transition-all"
                        draggable
                        onDragStart={(e) => onDragStart(e, node.id)}
                        data-testid={`node-palette-${node.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: node.color }}
                          >
                            <span className="text-xs">T</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-sm font-medium text-gray-900 truncate">{node.name}</h5>
                            <p className="text-xs text-gray-600 truncate">{node.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                </>
                )}

                {(selectedCategory === 'all' || selectedCategory === 'ai') && (
                <>
                <Separator />

                {/* AI Nodes */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-windtre-orange to-windtre-purple rounded-full" />
                    AI Nodes ({getNodesByCategory('ai').filter(node => 
                      !searchTerm || 
                      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length})
                  </h4>
                  <div className="space-y-2">
                    {getNodesByCategory('ai')
                      .filter(node => 
                        !searchTerm || 
                        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        node.description.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((node) => (
                      <div
                        key={node.id}
                        className="p-3 windtre-glass-panel rounded-lg border border-gray-200 cursor-move hover:shadow-md transition-all"
                        draggable
                        onDragStart={(e) => onDragStart(e, node.id)}
                        data-testid={`node-palette-${node.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-r from-windtre-orange to-windtre-purple"
                          >
                            <span className="text-xs">AI</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-sm font-medium text-gray-900 truncate">{node.name}</h5>
                            <p className="text-xs text-gray-600 truncate">{node.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">Workflow Builder</h2>
              <Badge variant="outline" className="ml-2">
                {nodes.length} nodes
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {/* DEBUG: Test add node button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestAddNode}
                className="bg-red-100 border-red-300"
                data-testid="button-test-add"
              >
                🧪 TEST ADD
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={undo}
                disabled={false}
                data-testid="button-undo"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={redo}
                disabled={false}
                data-testid="button-redo"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              
              <Separator orientation="vertical" className="h-6" />
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveWorkflow}
                data-testid="button-save"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button
                variant={isRunning ? "destructive" : "default"}
                size="sm"
                onClick={handleRunWorkflow}
                data-testid="button-run"
              >
                {isRunning ? <Square className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {isRunning ? 'Stop' : 'Run'}
              </Button>
            </div>
          </div>
        </div>

        {/* ReactFlow Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            fitView
            attributionPosition="bottom-left"
            className="bg-gray-50"
            data-testid="reactflow-canvas"
          >
            <Controls 
              position="bottom-right"
              className="bg-white border border-gray-200 rounded-lg shadow-sm"
            />
            <Background 
              color="#E5E7EB" 
              gap={20} 
              size={1}
              variant={"dots" as any}
            />
            
            {/* Canvas Instructions */}
            {nodes.length === 0 && (
              <Panel position="top-center" className="pointer-events-none">
                <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-6 max-w-md text-center shadow-lg">
                  <div className="text-gray-500 mb-2">
                    <Palette className="h-8 w-8 mx-auto" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Start Building Your Workflow
                  </h3>
                  <p className="text-sm text-gray-600">
                    Drag nodes from the library on the left to begin creating your workflow. Connect nodes to define the flow logic.
                  </p>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowBuilder(props: WorkflowBuilderProps) {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderContent {...props} />
    </ReactFlowProvider>
  );
}