/**
 * 🎯 BRAND WORKFLOWS TAB
 * Complete workflow builder integration for Brand Interface CRM
 * Features: Workflow list, Canvas editor, Node palette, AI assistant
 */

import { useState, useCallback, useMemo, memo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  useNodesState, 
  useEdgesState, 
  addEdge,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
  type NodeProps,
  ReactFlowProvider 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Plus, GitBranch, Search, Edit, Trash2, Copy, 
  Download, Upload, PlayCircle, Brain, List, 
  LayoutGrid, ArrowLeft, Save, X, Palette, Loader2
} from 'lucide-react';
import { BrandWorkflowsDataTable } from './BrandWorkflowsDataTable';
import { useBrandWorkflows, useCreateBrandWorkflow, useUpdateBrandWorkflow, useDeleteBrandWorkflow, type BrandWorkflow as APIBrandWorkflow } from '../hooks/useBrandWorkflows';
import { useToast } from '../hooks/use-toast';
import { ALL_WORKFLOW_NODES, getNodesByCategory } from '../../../web/src/lib/workflow-node-definitions';
import { AIWorkflowChatModal } from './AIWorkflowChatModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

// Types for workflows (aligned with API types)
type WorkflowStatus = 'active' | 'draft' | 'archived' | 'deprecated';

interface BrandWorkflow {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  version: string;
  status: WorkflowStatus;
  dslJson: {
    nodes: any[];
    edges: any[];
    viewport?: any;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

type ViewMode = 'list' | 'canvas';

export function BrandWorkflowsTab() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedWorkflow, setSelectedWorkflow] = useState<BrandWorkflow | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const { toast } = useToast();

  // Fetch workflows from API
  const { data: apiWorkflows, isLoading, error } = useBrandWorkflows();
  const createMutation = useCreateBrandWorkflow();
  const updateMutation = useUpdateBrandWorkflow();
  const deleteMutation = useDeleteBrandWorkflow();

  // Map API workflows to component format
  const workflows: BrandWorkflow[] = (apiWorkflows || []).map((w: APIBrandWorkflow) => {
    // Validate status - default to 'draft' if unsupported
    const validStatuses: WorkflowStatus[] = ['active', 'draft', 'archived', 'deprecated'];
    const status: WorkflowStatus = validStatuses.includes(w.status as WorkflowStatus) 
      ? (w.status as WorkflowStatus) 
      : 'draft';
    
    if (w.status !== status) {
      console.warn(`[WORKFLOW] Unsupported status "${w.status}" for workflow ${w.id}, defaulting to "${status}"`);
    }
    
    return {
      id: w.id,
      code: w.code,
      name: w.name,
      description: w.description || '',
      category: w.category,
      tags: w.tags,
      version: w.version,
      status,
      dslJson: {
        nodes: (w.dslJson as any)?.nodes || [],
        edges: (w.dslJson as any)?.edges || [],
        viewport: (w.dslJson as any)?.viewport
      },
      createdBy: w.createdBy,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt
    };
  });

  const filteredWorkflows = useMemo(() => {
    if (!searchQuery) return workflows;
    const query = searchQuery.toLowerCase();
    return workflows.filter(w => 
      w.name.toLowerCase().includes(query) ||
      w.code.toLowerCase().includes(query) ||
      w.description?.toLowerCase().includes(query) ||
      w.tags.some(t => t.toLowerCase().includes(query))
    );
  }, [searchQuery, workflows]);

  const handleCreateWorkflow = () => {
    setSelectedWorkflow({
      id: 'new',
      code: '',
      name: 'Nuovo Workflow',
      description: '',
      category: 'crm',
      tags: [],
      version: '1.0.0',
      status: 'draft',
      dslJson: { nodes: [], edges: [] },
      createdBy: 'admin@brand.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setViewMode('canvas');
  };

  const handleEditWorkflow = (workflow: BrandWorkflow) => {
    setSelectedWorkflow(workflow);
    setViewMode('canvas');
  };

  const handleBackToList = () => {
    setSelectedWorkflow(null);
    setViewMode('list');
  };

  const handleSaveWorkflow = async (updatedDSL: { nodes: Node[]; edges: Edge[]; viewport: any }) => {
    if (!selectedWorkflow) return;
    
    try {
      if (selectedWorkflow.id === 'new') {
        // Create new workflow
        await createMutation.mutateAsync({
          code: selectedWorkflow.code || `wf-${Date.now()}`,
          name: selectedWorkflow.name,
          description: selectedWorkflow.description,
          category: selectedWorkflow.category as any,
          tags: selectedWorkflow.tags,
          version: selectedWorkflow.version,
          status: selectedWorkflow.status as any,
          dslJson: updatedDSL
        });
        
        toast({
          title: 'Workflow creato',
          description: `${selectedWorkflow.name} è stato creato con successo`,
        });
      } else {
        // Update existing workflow
        await updateMutation.mutateAsync({
          id: selectedWorkflow.id,
          updates: { dslJson: updatedDSL }
        });
        
        toast({
          title: 'Workflow aggiornato',
          description: `${selectedWorkflow.name} è stato aggiornato con successo`,
        });
      }
      
      handleBackToList();
    } catch (error) {
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Errore nel salvataggio del workflow',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo workflow?')) return;
    
    try {
      await deleteMutation.mutateAsync(workflowId);
      
      toast({
        title: 'Workflow eliminato',
        description: 'Il workflow è stato eliminato con successo',
      });
    } catch (error) {
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Errore nell\'eliminazione del workflow',
        variant: 'destructive'
      });
    }
  };

  const handleDuplicateWorkflow = (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) return;
    
    console.log('📋 Duplicating workflow:', workflow);
    // TODO: Implement duplicate logic with API mutation
  };

  const handleExportWorkflow = (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) return;
    
    console.log('📥 Exporting workflow:', workflow);
    // TODO: Implement export as JSON file
  };

  if (viewMode === 'canvas') {
    return (
      <ReactFlowProvider>
        <WorkflowCanvasView
          workflow={selectedWorkflow}
          onBack={handleBackToList}
          onSave={handleSaveWorkflow}
          onAIAssistant={() => setIsAIModalOpen(true)}
        />
      </ReactFlowProvider>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
            size="sm"
          >
            <List className="h-4 w-4 mr-2" />
            Lista
          </Button>
          <Button
            variant={viewMode === 'canvas' ? 'default' : 'outline'}
            onClick={() => setViewMode('canvas')}
            size="sm"
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Canvas
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={handleCreateWorkflow}
            className="bg-windtre-orange hover:bg-windtre-orange-dark text-white"
            data-testid="button-create-workflow"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Workflow
          </Button>
        </div>
      </div>

      {/* Search & Stats */}
      <div className="flex items-center justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cerca workflow per nome, codice o tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-workflows"
          />
        </div>
        <div className="text-sm text-gray-600">
          {filteredWorkflows.length} workflow{filteredWorkflows.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Workflows DataTable */}
      <BrandWorkflowsDataTable
        workflows={filteredWorkflows}
        onEdit={(id) => {
          const workflow = workflows.find(w => w.id === id);
          if (workflow) handleEditWorkflow(workflow);
        }}
        onDelete={handleDeleteWorkflow}
        onDuplicate={handleDuplicateWorkflow}
        onExport={handleExportWorkflow}
      />
      
      {/* AI Workflow Assistant Modal */}
      <Dialog open={isAIModalOpen} onOpenChange={setIsAIModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>AI Workflow Builder</DialogTitle>
          </DialogHeader>
          <AIWorkflowChatModal
            onWorkflowGenerated={(workflowJson) => {
              console.log('🤖 AI Generated Workflow:', workflowJson);
              toast({
                title: "Workflow Generato",
                description: "Apri la canvas per visualizzare il workflow generato dall'AI."
              });
              setIsAIModalOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Workflow Canvas View Component
interface WorkflowCanvasViewProps {
  workflow: BrandWorkflow | null;
  onBack: () => void;
  onSave: (updatedDSL: { nodes: Node[]; edges: Edge[]; viewport: any }) => void;
  onAIAssistant: () => void;
}

function WorkflowCanvasView({ workflow, onBack, onSave, onAIAssistant }: WorkflowCanvasViewProps) {
  const [isPaletteOpen, setIsPaletteOpen] = useState(true);
  const [draggedNodeType, setDraggedNodeType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const reactFlowInstance = useReactFlow();
  
  // Initialize ReactFlow state from workflow DSL
  const initialNodes: Node[] = workflow?.dslJson?.nodes || [];
  const initialEdges: Edge[] = workflow?.dslJson?.edges || [];
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Handle edge connections
  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  // Handle node click for config
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  // Drag and drop handlers
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
      
      if (!type) return;
      
      const nodeDefinition = ALL_WORKFLOW_NODES.find(n => n.id === type);
      if (!nodeDefinition) return;
      
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
        },
        draggable: true,
        connectable: true,
        deletable: true,
        selectable: true,
      };
      
      setNodes((nds) => nds.concat(newNode));
      setDraggedNodeType(null);
    },
    [reactFlowInstance, setNodes]
  );

  const handleSaveClick = () => {
    const updatedDSL = {
      nodes,
      edges,
      viewport: { x: 0, y: 0, zoom: 1 }
    };
    console.log('💾 Saving workflow with DSL:', updatedDSL);
    onSave(updatedDSL);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Canvas Header */}
      <div className="windtre-glass-panel p-4 border-b border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={onBack}
              variant="outline"
              size="sm"
              data-testid="button-back-to-list"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna alla Lista
            </Button>
            <div>
              <h2 className="font-semibold text-gray-900">{workflow?.name || 'Nuovo Workflow'}</h2>
              <p className="text-xs text-gray-500">{workflow?.code || 'Codice non assegnato'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsPaletteOpen(!isPaletteOpen)}
              variant="outline"
              size="sm"
              data-testid="button-toggle-palette"
            >
              <Palette className="h-4 w-4 mr-2" />
              {isPaletteOpen ? 'Nascondi' : 'Mostra'} Palette
            </Button>
            <Button
              onClick={onAIAssistant}
              variant="outline"
              size="sm"
              className="border-windtre-purple text-windtre-purple hover:bg-windtre-purple/10"
              data-testid="button-ai-assistant"
            >
              <Brain className="h-4 w-4 mr-2" />
              AI Assistant
            </Button>
            <Button
              size="sm"
              variant="outline"
              data-testid="button-test-workflow"
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Test Run
            </Button>
            <Button
              onClick={handleSaveClick}
              size="sm"
              className="bg-windtre-orange hover:bg-windtre-orange-dark text-white"
              data-testid="button-save-workflow"
            >
              <Save className="h-4 w-4 mr-2" />
              Salva Workflow
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas + Palette Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Node Palette Sidebar */}
        {isPaletteOpen && (
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Node Library</h3>
              <p className="text-xs text-gray-500 mt-1">
                Trascina i nodi nella canvas
              </p>
            </div>
            
            {/* Search and Category Filter */}
            <div className="p-4 border-b border-gray-100 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cerca nodi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-nodes"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tutte le Categorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le Categorie</SelectItem>
                  <SelectItem value="trigger">🔵 Triggers</SelectItem>
                  <SelectItem value="action">🟢 Actions</SelectItem>
                  <SelectItem value="ai">🟣 AI Nodes</SelectItem>
                  <SelectItem value="routing">🟠 Routing</SelectItem>
                  <SelectItem value="integration">🔷 Integration</SelectItem>
                  <SelectItem value="flow-control">⚪ Flow Control</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Triggers */}
              {(selectedCategory === 'all' || selectedCategory === 'trigger') && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  TRIGGERS ({getNodesByCategory('trigger').filter(node => 
                    !searchTerm || 
                    node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    node.description.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length})
                </h4>
                <div className="space-y-2">
                  {getNodesByCategory('trigger')
                    .filter(node => 
                      !searchTerm || 
                      node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((node) => (
                    <NodePaletteItem
                      key={node.id}
                      nodeId={node.id}
                      label={node.label}
                      description={node.description}
                      icon={node.icon}
                      onDragStart={onDragStart}
                    />
                  ))}
                </div>
              </div>
              )}
              {/* Actions */}
              {(selectedCategory === 'all' || selectedCategory === 'action') && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  ACTIONS ({getNodesByCategory('action').filter(node => 
                    !searchTerm || 
                    node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    node.description.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length})
                </h4>
                <div className="space-y-2">
                  {getNodesByCategory('action')
                    .filter(node => 
                      !searchTerm || 
                      node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((node) => (
                    <NodePaletteItem
                      key={node.id}
                      nodeId={node.id}
                      label={node.label}
                      description={node.description}
                      icon={node.icon}
                      onDragStart={onDragStart}
                    />
                  ))}
                </div>
              </div>
              )}
              {/* AI Nodes */}
              {(selectedCategory === 'all' || selectedCategory === 'ai') && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full" />
                  AI ({getNodesByCategory('ai').filter(node => 
                    !searchTerm || 
                    node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    node.description.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length})
                </h4>
                <div className="space-y-2">
                  {getNodesByCategory('ai')
                    .filter(node => 
                      !searchTerm || 
                      node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((node) => (
                    <NodePaletteItem
                      key={node.id}
                      nodeId={node.id}
                      label={node.label}
                      description={node.description}
                      icon={node.icon}
                      onDragStart={onDragStart}
                    />
                  ))}
                </div>
              </div>
              )}
              {/* Routing */}
              {(selectedCategory === 'all' || selectedCategory === 'routing') && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full" />
                  ROUTING ({getNodesByCategory('routing').filter(node => 
                    !searchTerm || 
                    node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    node.description.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length})
                </h4>
                <div className="space-y-2">
                  {getNodesByCategory('routing')
                    .filter(node => 
                      !searchTerm || 
                      node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((node) => (
                    <NodePaletteItem
                      key={node.id}
                      nodeId={node.id}
                      label={node.label}
                      description={node.description}
                      icon={node.icon}
                      onDragStart={onDragStart}
                    />
                  ))}
                </div>
              </div>
              )}
              {/* Integration */}
              {(selectedCategory === 'all' || selectedCategory === 'integration') && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 bg-cyan-500 rounded-full" />
                  INTEGRATION ({getNodesByCategory('integration').filter(node => 
                    !searchTerm || 
                    node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    node.description.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length})
                </h4>
                <div className="space-y-2">
                  {getNodesByCategory('integration')
                    .filter(node => 
                      !searchTerm || 
                      node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((node) => (
                    <NodePaletteItem
                      key={node.id}
                      nodeId={node.id}
                      label={node.label}
                      description={node.description}
                      icon={node.icon}
                      onDragStart={onDragStart}
                    />
                  ))}
                </div>
              </div>
              )}
              {/* Flow Control */}
              {(selectedCategory === 'all' || selectedCategory === 'flow-control') && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-500 rounded-full" />
                  FLOW CONTROL ({getNodesByCategory('flow-control').filter(node => 
                    !searchTerm || 
                    node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    node.description.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length})
                </h4>
                <div className="space-y-2">
                  {getNodesByCategory('flow-control')
                    .filter(node => 
                      !searchTerm || 
                      node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((node) => (
                    <NodePaletteItem
                      key={node.id}
                      nodeId={node.id}
                      label={node.label}
                      description={node.description}
                      icon={node.icon}
                      onDragStart={onDragStart}
                    />
                  ))}
                </div>
              </div>
              )}
            </div>
          </div>
        )}

        {/* ReactFlow Canvas */}
        <div className="flex-1 bg-white" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-white"
          >
            <Background color="#ddd" gap={16} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {/* Node Config Panel */}
        {selectedNodeId && (
          <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Configurazione Nodo</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedNodeId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {(() => {
              const node = nodes.find(n => n.id === selectedNodeId);
              if (!node) return <p className="text-sm text-gray-500">Nodo non trovato</p>;
              
              return (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-700">Nome Nodo</label>
                    <p className="text-sm text-gray-900 mt-1">{node.data.label || 'Senza nome'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700">Tipo</label>
                    <p className="text-sm text-gray-900 mt-1">{node.type || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700">Descrizione</label>
                    <p className="text-xs text-gray-600 mt-1">{node.data.description || 'Nessuna descrizione'}</p>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      💡 Click su un nodo per configurarlo. Funzionalità complete in sviluppo.
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}

// Category color mapping
function getCategoryStyles(category: string) {
  const styles = {
    trigger: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      hoverBorder: 'hover:border-blue-500',
      icon: 'bg-blue-100 text-blue-600',
      label: 'text-blue-900'
    },
    action: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      hoverBorder: 'hover:border-green-500',
      icon: 'bg-green-100 text-green-600',
      label: 'text-green-900'
    },
    ai: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      hoverBorder: 'hover:border-purple-500',
      icon: 'bg-purple-100 text-purple-600',
      label: 'text-purple-900'
    },
    routing: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      hoverBorder: 'hover:border-orange-500',
      icon: 'bg-orange-100 text-orange-600',
      label: 'text-orange-900'
    },
    integration: {
      bg: 'bg-cyan-50',
      border: 'border-cyan-200',
      hoverBorder: 'hover:border-cyan-500',
      icon: 'bg-cyan-100 text-cyan-600',
      label: 'text-cyan-900'
    },
    'flow-control': {
      bg: 'bg-gray-50',
      border: 'border-gray-300',
      hoverBorder: 'hover:border-gray-500',
      icon: 'bg-gray-100 text-gray-700',
      label: 'text-gray-900'
    }
  };
  return styles[category as keyof typeof styles] || styles['flow-control'];
}

// Custom Node Component per ReactFlow Canvas
const CustomWorkflowNode = memo(({ data }: NodeProps) => {
  const styles = getCategoryStyles(data.category);
  
  return (
    <div className={`px-4 py-3 rounded-lg border-2 shadow-md min-w-[180px] ${styles.bg} ${styles.border}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-md flex items-center justify-center text-lg ${styles.icon}`}>
          {data.icon || '⚙️'}
        </div>
        <div className="flex-1">
          <div className={`text-sm font-semibold ${styles.label}`}>
            {data.label || 'Node'}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {data.executorType || data.category}
          </div>
        </div>
      </div>
    </div>
  );
});

CustomWorkflowNode.displayName = 'CustomWorkflowNode';

// Node types registry per ReactFlow
const nodeTypes = {
  trigger: CustomWorkflowNode,
  action: CustomWorkflowNode,
  ai: CustomWorkflowNode,
  routing: CustomWorkflowNode,
  integration: CustomWorkflowNode,
  'flow-control': CustomWorkflowNode,
};

// Node palette item with category styling
interface NodePaletteItemProps {
  nodeId: string;
  label: string;
  description: string;
  icon: string;
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
}

function NodePaletteItem({ nodeId, label, description, icon, onDragStart }: NodePaletteItemProps) {
  const nodeData = ALL_WORKFLOW_NODES.find(n => n.id === nodeId);
  const color = nodeData?.color || '#6B7280';
  
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, nodeId)}
      className="p-4 windtre-glass-panel rounded-lg border border-gray-200 hover:shadow-md transition-all cursor-grab active:cursor-grabbing w-full"
      data-testid={`node-palette-${nodeId}`}
    >
      <div className="flex items-start gap-3">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
          style={{ backgroundColor: color }}
        >
          <span className="text-xs">{icon}</span>
        </div>
        <div className="flex-1">
          <h5 className="text-sm font-medium text-gray-900 leading-tight">{label}</h5>
          <p className="text-xs text-gray-600 leading-relaxed mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}
