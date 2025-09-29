/**
 * 🎯 WORKFLOW BUILDER COMPONENT
 * ReactFlow canvas professionale per drag & drop workflow
 * Integra il catalogo nodi con configurazione dinamica
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  NodeTypes,
  ReactFlowProvider,
  ReactFlowInstance,
  useReactFlow,
  Panel,
  NodeChange,
  EdgeChange
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

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
  Settings,
  Palette,
  Eye,
  RotateCcw,
  Search,
  X,
  Undo2,
  Redo2
} from 'lucide-react';

import { useWorkflowStore } from '../stores/workflowStore';
import { ALL_WORKFLOW_NODES, getNodesByCategory } from '../lib/workflow-node-definitions';
import { WorkflowActionNode } from './workflow-nodes/WorkflowActionNode';
import { WorkflowTriggerNode } from './workflow-nodes/WorkflowTriggerNode';
import { WorkflowAiNode } from './workflow-nodes/WorkflowAiNode';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkflowTemplate, useCreateTemplate, useUpdateTemplate } from '../hooks/useWorkflowTemplates';
import NodeConfigPanel from './NodeConfigPanel';

// ✅ REAL PROFESSIONAL NODE COMPONENTS - DEFINED OUTSIDE TO PREVENT RE-RENDERS
const nodeTypes: NodeTypes = {
  action: WorkflowActionNode,
  trigger: WorkflowTriggerNode,
  ai: WorkflowAiNode,
  condition: WorkflowActionNode, // Reuse action node for conditions
  flow: WorkflowActionNode, // Reuse action node for flow control
};

interface WorkflowBuilderProps {
  templateId?: string;
  initialCategory?: string;
  onSave?: (workflow: { nodes: Node[]; edges: Edge[] }) => void;
  onClose?: () => void;
}

function WorkflowBuilderContent({ templateId, initialCategory, onSave, onClose }: WorkflowBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { project } = useReactFlow();
  
  // ✅ REAL WORKFLOW STORE (debug successful!)
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    addNode,
    selectNode,
    selectedNodeId,
    clearWorkflow,
    exportWorkflow,
    importWorkflow
  } = useWorkflowStore();
  
  // 🎯 TEMPLATE MANAGEMENT HOOKS
  const { data: templateData, isLoading: templateLoading } = useWorkflowTemplate(templateId);
  const createTemplateMutation = useCreateTemplate();
  const updateTemplateMutation = useUpdateTemplate();
  
  // 🎯 TEMPLATE LOADING LOGIC
  React.useEffect(() => {
    if (templateId && templateData && !templateLoading) {
      // ✅ LOAD EXISTING TEMPLATE
      console.log('📂 Loading template data:', templateData);
      
      const definition = templateData.definition;
      if (definition?.nodes && definition?.edges) {
        // Add onConfigClick to all loaded nodes
        const nodesWithConfig = definition.nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            onConfigClick: handleConfigClick
          }
        }));
        
        setNodes(nodesWithConfig);
        setEdges(definition.edges);
        
        console.log('✅ Template loaded successfully:', {
          nodeCount: nodesWithConfig.length,
          edgeCount: definition.edges.length
        });
      }
    } else if (!templateId) {
      // 🆕 NEW WORKFLOW - ensure clean canvas
      clearWorkflow();
    }
  }, [templateId, templateData, templateLoading, setNodes, setEdges, clearWorkflow]);
  
  

  // Local state
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [isNodePaletteOpen, setIsNodePaletteOpen] = useState(true);
  const [draggedNodeType, setDraggedNodeType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Department mapping for context
  const departmentInfo = {
    hr: { name: 'Human Resources', color: '#7B2CBF', icon: '👥' },
    finance: { name: 'Finance', color: '#FF6900', icon: '💰' },
    sales: { name: 'Sales', color: '#7B2CBF', icon: '🏢' },
    operations: { name: 'Operations', color: '#FF6900', icon: '⚙️' },
    support: { name: 'Support', color: '#7B2CBF', icon: '🎧' },
    crm: { name: 'CRM', color: '#FF6900', icon: '📊' }
  };
  
  // Use initialCategory from props
  React.useEffect(() => {
    if (initialCategory) {
      // Keep all categories visible but show department context
    }
  }, [initialCategory]);

  // ✅ REAL REACTFLOW EVENT HANDLERS
  const onConnect = useCallback(
    (params: Connection) => {
      // Controllo che source e target non siano null
      if (!params.source || !params.target) return;
      
      const newEdge: Edge = {
        id: `edge-${params.source}-${params.target}`,
        source: params.source,
        target: params.target,
        type: 'default',
        animated: true,
        style: { stroke: '#FF6900', strokeWidth: 2 }
      };
      setEdges([...edges, newEdge]);
      console.log('🔗 Real connection made:', newEdge);
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

  // ✅ NODE CONFIG HANDLER - Must be defined before use
  const handleConfigClick = useCallback((nodeId: string) => {
    setConfigNodeId(nodeId);
    setShowConfigPanel(true);
    console.log('🎛️ Opening config panel for node:', nodeId);
  }, []);

  // ✅ DOUBLE-CLICK TO CONFIGURE NODE
  const onNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      handleConfigClick(node.id);
    },
    [handleConfigClick]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // ✅ DRAG AND DROP IMPLEMENTATION
  const onDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
    setDraggedNodeType(nodeType);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/reactflow', nodeType);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      
      const type = event.dataTransfer.getData('application/reactflow');
      
      if (!type || !reactFlowInstance) {
        return;
      }
      
      const nodeDefinition = ALL_WORKFLOW_NODES.find(n => n.id === type);
      if (!nodeDefinition) {
        return;
      }
      
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      const newNode: Node = {
        id: `${nodeDefinition.id}-${Date.now()}`,
        type: nodeDefinition.category,
        position,
        data: {
          ...nodeDefinition,
          config: { ...nodeDefinition.defaultConfig },
          onConfigClick: handleConfigClick
        },
        draggable: true,
        connectable: true,
        deletable: true,
        selectable: true,
      };
      
      console.log('✨ Node dropped at position:', position);
      addNode(newNode);
      setDraggedNodeType(null);
    },
    [reactFlowInstance, addNode]
  );

  // ✅ NODE CONFIGURATION PANEL
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [configNodeId, setConfigNodeId] = useState<string | null>(null);

  // 💾 SMART SAVE: CREATE vs UPDATE TEMPLATE
  const handleSaveWorkflow = () => {
    if (nodes.length === 0) {
      alert('⚠️ Il workflow è vuoto. Aggiungi almeno un nodo prima di salvare.');
      return;
    }
    
    // Clean nodes data before saving (remove onConfigClick function)
    const cleanNodes = nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onConfigClick: undefined // Remove function reference
      }
    }));
    
    const workflowDefinition = {
      nodes: cleanNodes,
      edges,
      viewport: { x: 0, y: 0, zoom: 1 } // Default viewport
    };
    
    if (templateId && templateData) {
      // 📝 UPDATE EXISTING TEMPLATE
      console.log('📝 Updating template:', templateId);
      updateTemplateMutation.mutate({
        id: templateId,
        name: templateData.name,
        description: templateData.description,
        category: templateData.category,
        definition: workflowDefinition,
        tags: templateData.tags,
        metadata: {
          ...templateData.metadata,
          nodeCount: cleanNodes.length,
          edgeCount: edges.length,
          lastModified: new Date().toISOString()
        }
      });
    } else {
      // 🆕 CREATE NEW TEMPLATE
      console.log('🆕 Creating new template');
      const templateName = prompt('📝 Nome del template:', 'Nuovo Workflow');
      if (!templateName) return;
      
      createTemplateMutation.mutate({
        name: templateName,
        description: 'Template workflow creato dal builder',
        category: (initialCategory as any) || 'operations',
        definition: workflowDefinition,
        tags: [],
        metadata: {
          nodeCount: cleanNodes.length,
          edgeCount: edges.length,
          createdVia: 'workflow-builder'
        }
      });
    }
    
    // Also call onSave prop if provided (backward compatibility)
    onSave?.({
      nodes: cleanNodes,
      edges,
      metadata: { nodeCount: cleanNodes.length, edgeCount: edges.length }
    });
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
      <div className={`${isNodePaletteOpen ? 'w-96' : 'w-12'} transition-all duration-300 bg-white border-r border-gray-200 flex flex-col overflow-hidden`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
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
          
          {/* Department Context Display */}
          {initialCategory && departmentInfo[initialCategory as keyof typeof departmentInfo] && (
            <div className="windtre-glass-panel rounded-lg p-3 border border-white/20">
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm"
                  style={{ backgroundColor: departmentInfo[initialCategory as keyof typeof departmentInfo].color }}
                >
                  {departmentInfo[initialCategory as keyof typeof departmentInfo].icon}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {departmentInfo[initialCategory as keyof typeof departmentInfo].name} Workflow
                  </div>
                  <div className="text-xs text-gray-600">
                    Creating workflow for {initialCategory} department
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {isNodePaletteOpen && (
          <div className="flex flex-col">
            {/* Search and Filters - Fixed Area */}
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <div className="space-y-4">
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
            </div>
            
            {/* Node List - Internally Scrollable Area */}
            <div className="max-h-[500px] overflow-y-auto">
                <div className="p-4 pb-8">
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
                        className="p-4 windtre-glass-panel rounded-lg border border-gray-200 hover:shadow-md transition-all cursor-grab active:cursor-grabbing w-full"
                        draggable
                        onDragStart={(e) => onDragStart(e, node.id)}
                        data-testid={`node-palette-${node.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: node.color }}
                          >
                            <span className="text-xs">A</span>
                          </div>
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-gray-900 leading-tight">{node.name}</h5>
                            <p className="text-xs text-gray-600 leading-relaxed mt-1">{node.description}</p>
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
                        className="p-4 windtre-glass-panel rounded-lg border border-gray-200 hover:shadow-md transition-all cursor-grab active:cursor-grabbing w-full"
                        draggable
                        onDragStart={(e) => onDragStart(e, node.id)}
                        data-testid={`node-palette-${node.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: node.color }}
                          >
                            <span className="text-xs">T</span>
                          </div>
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-gray-900 leading-tight">{node.name}</h5>
                            <p className="text-xs text-gray-600 leading-relaxed mt-1">{node.description}</p>
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
                        className="p-4 windtre-glass-panel rounded-lg border border-gray-200 hover:shadow-md transition-all cursor-grab active:cursor-grabbing w-full"
                        draggable
                        onDragStart={(e) => onDragStart(e, node.id)}
                        data-testid={`node-palette-${node.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-r from-windtre-orange to-windtre-purple"
                          >
                            <span className="text-xs">AI</span>
                          </div>
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-gray-900 leading-tight">{node.name}</h5>
                            <p className="text-xs text-gray-600 leading-relaxed mt-1">{node.description}</p>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => console.log('🔄 Undo action')}
                title="Annulla ultima azione"
                data-testid="button-undo"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => console.log('🔄 Redo action')}
                title="Ripeti azione"
                data-testid="button-redo"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
              
              <Separator orientation="vertical" className="h-6" />
              
              {/* Configure Selected Node Button */}
              {selectedNodeId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConfigClick(selectedNodeId)}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  title="Configura nodo selezionato"
                  data-testid="button-configure-node"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configure
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={clearWorkflow}
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                title="Reset workflow"
                data-testid="button-reset"
              >
                <RotateCcw className="h-4 w-4" />
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
            </div>
          </div>
        </div>

        {/* Canvas Zone - Fixed Size */}
        <div 
          ref={reactFlowWrapper}
          style={{ 
            width: '800px',
            height: '600px',
            border: '2px solid #E5E7EB',
            backgroundColor: '#F9FAFB',
            margin: '1cm auto 0 auto'
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onPaneClick={onPaneClick}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            style={{ width: '800px', height: '600px' }}
            data-testid="reactflow-canvas"
          >
            <Controls />
            <Background variant={BackgroundVariant.Dots} color="#E5E7EB" gap={20} />
          </ReactFlow>
        </div>
      </div>

      {/* ✅ NODE CONFIGURATION PANEL - Fixed hook order violations */}
      <NodeConfigPanel 
        node={showConfigPanel && configNodeId ? nodes.find(n => n.id === configNodeId) || null : null}
        isOpen={showConfigPanel}
        onClose={() => setShowConfigPanel(false)}
        onSave={(nodeId: string, config: any) => {
          // 💾 Update node data with new configuration
          setNodes(prevNodes => 
            prevNodes.map(node => 
              node.id === nodeId 
                ? { ...node, data: { ...node.data, config } }
                : node
            )
          );
          
          console.log('🎛️ Node config saved:', { nodeId, config });
        }}
      />

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
