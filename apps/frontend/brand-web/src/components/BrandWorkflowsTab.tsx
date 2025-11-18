/**
 * 🎯 BRAND WORKFLOWS TAB
 * Complete workflow builder integration for Brand Interface CRM
 * Features: Workflow list, Canvas editor, Node palette, AI assistant
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
  type NodeProps,
  type NodeChange,
  type EdgeChange,
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
import { ALL_WORKFLOW_NODES, getNodesByCategory } from '../lib/workflow-node-definitions';
import { AIWorkflowChatModal } from './AIWorkflowChatModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { useWorkflowStore } from '../stores/workflowStore';
import { WorkflowActionNode } from './workflow-nodes/WorkflowActionNode';
import { WorkflowTriggerNode } from './workflow-nodes/WorkflowTriggerNode';
import { WorkflowAiNode } from './workflow-nodes/WorkflowAiNode';
import { WorkflowRoutingNode } from './workflow-nodes/WorkflowRoutingNode';
import { WorkflowFlowControlNode } from './workflow-nodes/WorkflowFlowControlNode';
import NodeConfigPanel from './NodeConfigPanel';
import { WorkflowTestResultDialog } from './WorkflowTestResultDialog';
import { Undo2, Redo2, Settings } from 'lucide-react';

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
  const [draggedNodeType, setDraggedNodeType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isTestResultOpen, setIsTestResultOpen] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const reactFlowInstance = useReactFlow();
  
  // Zustand Store
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const selectedNodeId = useWorkflowStore((state) => state.selectedNodeId);
  const canUndo = useWorkflowStore((state) => state.historyIndex > 0);
  const canRedo = useWorkflowStore((state) => state.historyIndex < state.history.length - 1);
  const { setNodes, setEdges, setViewport, addNode, updateNode, selectNode, undo, redo, loadTemplateDefinition, clearWorkflow, saveSnapshot, addEdge: storeAddEdge } = useWorkflowStore();
  
  // Initialize workflow from DSL on mount
  const isInitialized = React.useRef(false);
  React.useEffect(() => {
    if (workflow && !isInitialized.current) {
      const initialNodes = workflow.dslJson?.nodes || [];
      const initialEdges = workflow.dslJson?.edges || [];
      const initialViewport = workflow.dslJson?.viewport || { x: 0, y: 0, zoom: 1 };
      loadTemplateDefinition({ nodes: initialNodes, edges: initialEdges, viewport: initialViewport }, workflow.id);
      isInitialized.current = true;
    }
  }, [workflow, loadTemplateDefinition]);

  // ReactFlow change handlers - sync to Zustand store with history
  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const updatedNodes = applyNodeChanges(changes, nodes);
    setNodes(updatedNodes);
    
    // Save snapshot ONLY after drag completes (not during dragging)
    const hasNonDraggingPosition = changes.some(c => 
      c.type === 'position' && (c as any).dragging === false
    );
    const hasOtherSignificant = changes.some(c => 
      ['add', 'remove', 'reset'].includes(c.type)
    );
    
    if (hasNonDraggingPosition || hasOtherSignificant) {
      const changeTypes = changes.map(c => c.type).join(', ');
      saveSnapshot(`Node changes: ${changeTypes}`);
    }
  }, [nodes, setNodes, saveSnapshot]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    const updatedEdges = applyEdgeChanges(changes, edges);
    setEdges(updatedEdges);
    
    // Save snapshot for undo/redo (include all types except select)
    const significantTypes = ['add', 'remove', 'reset'];
    const hasSignificantChange = changes.some(c => significantTypes.includes(c.type));
    if (hasSignificantChange) {
      const changeTypes = changes.map(c => c.type).join(', ');
      saveSnapshot(`Edge changes: ${changeTypes}`);
    }
  }, [edges, setEdges, saveSnapshot]);

  // Handle edge connections - use store action for history
  const onConnect = useCallback(
    (connection: Connection) => {
      // Create new edge from connection
      const newEdge: Edge = {
        id: `${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source!,
        target: connection.target!,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      };
      
      // Use store action (includes saveSnapshot)
      storeAddEdge(newEdge);
    },
    [storeAddEdge]
  );

  // Handle node click - select node (drawer will appear automatically)
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    selectNode(node.id);
  }, [selectNode]);
  
  // Track viewport changes (pan + zoom) - debounced to avoid too many snapshots
  const viewportTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const onMove = useCallback((event: any, viewport: any) => {
    setViewport(viewport);
    
    // Debounce snapshot to avoid too many entries
    if (viewportTimeoutRef.current) {
      clearTimeout(viewportTimeoutRef.current);
    }
    viewportTimeoutRef.current = setTimeout(() => {
      saveSnapshot(`Viewport: zoom ${viewport.zoom.toFixed(2)}, x:${viewport.x.toFixed(0)}, y:${viewport.y.toFixed(0)}`);
    }, 500); // 500ms debounce
  }, [setViewport, saveSnapshot]);

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
      
      addNode(newNode);
      setDraggedNodeType(null);
    },
    [reactFlowInstance, addNode]
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
  
  // NodeTypes registry mapping categories to specialized components
  const nodeTypes = useMemo(() => ({
    action: WorkflowActionNode,
    trigger: WorkflowTriggerNode,
    ai: WorkflowAiNode,
    routing: WorkflowRoutingNode,
    integration: CustomWorkflowNode,
    'flow-control': WorkflowFlowControlNode,
  }), []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'center',
      background: 'linear-gradient(135deg, hsl(210, 20%, 98%), hsl(210, 25%, 96%))',
      padding: '1rem',
      overflow: 'hidden'
    }}>
      {/* View Mode Toggle - Lista/Canvas - Posizionato sopra come nella vista lista */}
      <div style={{ 
        width: 'calc(95vw - 9cm)', 
        marginBottom: '1rem',
        display: 'flex',
        gap: '0.5rem'
      }}>
        <Button
          variant="outline"
          onClick={onBack}
          size="sm"
          data-testid="button-view-list"
        >
          <List className="h-4 w-4 mr-2" />
          Lista
        </Button>
        <Button
          variant="default"
          size="sm"
          data-testid="button-view-canvas"
        >
          <LayoutGrid className="h-4 w-4 mr-2" />
          Canvas
        </Button>
      </div>

      {/* Main Workflow Builder Container - Responsive con dimensioni ridotte */}
      <div style={{
        width: 'calc(95vw - 9cm)',
        height: 'calc(95vh - 8cm)',
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        overflow: 'hidden'
      }}>
        {/* Glassmorphism Header */}
        <div style={{
          background: 'hsla(0, 0%, 100%, 0.7)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
          padding: '1rem 1.5rem',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)'
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'hsl(var(--foreground))', marginBottom: '0.25rem' }}>
                {workflow?.name || 'Nuovo Workflow'}
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                {workflow?.code || 'Codice non assegnato'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Node Count Badge */}
            <div style={{
              padding: '0.5rem 1rem',
              background: 'hsla(220, 90%, 56%, 0.1)',
              border: '1px solid hsla(220, 90%, 56%, 0.3)',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: 'hsl(220, 90%, 56%)'
            }}>
              {nodes.length} nodi
            </div>
            
            {/* Undo/Redo */}
            <Button
              onClick={undo}
              disabled={!canUndo}
              variant="outline"
              size="sm"
              data-testid="button-undo"
              title="Annulla (Ctrl+Z)"
            >
              <Undo2 size={16} />
            </Button>
            <Button
              onClick={redo}
              disabled={!canRedo}
              variant="outline"
              size="sm"
              data-testid="button-redo"
              title="Ripeti (Ctrl+Y)"
            >
              <Redo2 size={16} />
            </Button>
            
            <Button
              onClick={onAIAssistant}
              variant="outline"
              size="sm"
              style={{
                borderColor: 'hsl(274, 65%, 46%)',
                color: 'hsl(274, 65%, 46%)'
              }}
              data-testid="button-ai-assistant"
            >
              <Brain size={16} style={{ marginRight: '0.5rem' }} />
              AI Assistant
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                console.log('🧪 Test Run clicked - Mock result');
                setTestResult({
                  success: true,
                  data: {
                    status: 'success',
                    executionTime: 234,
                    totalSteps: 3,
                    executedSteps: 3,
                    executionResults: []
                  }
                });
                setIsTestResultOpen(true);
              }}
              data-testid="button-test-workflow"
            >
              <PlayCircle size={16} style={{ marginRight: '0.5rem' }} />
              Test Run
            </Button>
            <Button
              onClick={handleSaveClick}
              size="sm"
              style={{
                background: 'linear-gradient(135deg, hsl(25, 95%, 53%), hsl(25, 100%, 60%))',
                color: 'white',
                border: 'none'
              }}
              data-testid="button-save-workflow"
            >
              <Save size={16} style={{ marginRight: '0.5rem' }} />
              Salva Workflow
            </Button>
          </div>
        </div>
      </div>

      {/* Unified Layout: Sidebar + Canvas */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Node Library Sidebar - Always Visible */}
        <div style={{
          width: '280px',
          background: '#fafafa',
          borderRight: '1px solid hsl(var(--border))',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Sidebar Header */}
          <div style={{
            padding: '1.25rem',
            borderBottom: '1px solid hsl(var(--border))',
            background: '#ffffff'
          }}>
            <h3 style={{
              fontSize: '0.95rem',
              fontWeight: '700',
              color: 'hsl(var(--foreground))',
              marginBottom: '0.5rem',
              letterSpacing: '0.02em'
            }}>
              Node Library
            </h3>
            <p style={{
              fontSize: '0.75rem',
              color: 'hsl(var(--muted-foreground))'
            }}>
              Trascina i nodi nel canvas
            </p>
          </div>
          
          {/* Search Bar */}
          <div style={{ padding: '1rem' }}>
            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <Search size={16} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'hsl(var(--muted-foreground))'
              }} />
              <Input
                placeholder="Cerca nodi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  paddingLeft: '2.5rem',
                  fontSize: '0.875rem'
                }}
                data-testid="input-search-nodes"
              />
            </div>
            
            {/* Category Filter */}
            <Select 
              value={selectedCategory} 
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger 
                className="w-full text-sm"
                data-testid="select-category-filter"
              >
                <SelectValue placeholder="Filtra per categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le categorie</SelectItem>
                <SelectItem value="trigger">🎯 Trigger</SelectItem>
                <SelectItem value="action">⚡ Action</SelectItem>
                <SelectItem value="ai">🤖 AI</SelectItem>
                <SelectItem value="routing">🔀 Routing</SelectItem>
                <SelectItem value="integration">🔌 Integration</SelectItem>
                <SelectItem value="flow-control">🔄 Flow Control</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nodes List - Scrollable */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 1rem 1rem 1rem'
          }}>
            {/* Triggers Category */}
            {(selectedCategory === 'all' || selectedCategory === 'trigger') && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: 'hsl(220, 90%, 56%)',
                  marginBottom: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'hsl(220, 90%, 56%)'
                  }} />
                  TRIGGERS ({getNodesByCategory('trigger').filter(node => 
                    !searchTerm || 
                    node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    node.description.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {getNodesByCategory('trigger')
                    .filter(node => 
                      !searchTerm || 
                      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((node) => (
                    <NodePaletteItem
                      key={node.id}
                      nodeId={node.id}
                      label={node.name}
                      description={node.description}
                      icon={node.icon}
                      onDragStart={onDragStart}
                    />
                  ))}
                </div>
              </div>
            )}
            {/* Actions Category */}
            {(selectedCategory === 'all' || selectedCategory === 'action') && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: 'hsl(142, 76%, 36%)',
                  marginBottom: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'hsl(142, 76%, 36%)'
                  }} />
                  ACTIONS ({getNodesByCategory('action').filter(node => 
                    !searchTerm || 
                    node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    node.description.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {getNodesByCategory('action')
                    .filter(node => 
                      !searchTerm || 
                      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((node) => (
                    <NodePaletteItem
                      key={node.id}
                      nodeId={node.id}
                      label={node.name}
                      description={node.description}
                      icon={node.icon}
                      onDragStart={onDragStart}
                    />
                  ))}
                </div>
              </div>
            )}
            {/* AI Nodes Category */}
            {(selectedCategory === 'all' || selectedCategory === 'ai') && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: 'hsl(274, 65%, 46%)',
                  marginBottom: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'hsl(274, 65%, 46%)'
                  }} />
                  AI ({getNodesByCategory('ai').filter(node => 
                    !searchTerm || 
                    node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    node.description.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {getNodesByCategory('ai')
                    .filter(node => 
                      !searchTerm || 
                      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((node) => (
                    <NodePaletteItem
                      key={node.id}
                      nodeId={node.id}
                      label={node.name}
                      description={node.description}
                      icon={node.icon}
                      onDragStart={onDragStart}
                    />
                  ))}
                </div>
              </div>
            )}
            {/* Routing Category */}
            {(selectedCategory === 'all' || selectedCategory === 'routing') && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: 'hsl(25, 95%, 53%)',
                  marginBottom: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'hsl(25, 95%, 53%)'
                  }} />
                  ROUTING ({getNodesByCategory('routing').filter(node => 
                    !searchTerm || 
                    node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    node.description.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {getNodesByCategory('routing')
                    .filter(node => 
                      !searchTerm || 
                      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((node) => (
                    <NodePaletteItem
                      key={node.id}
                      nodeId={node.id}
                      label={node.name}
                      description={node.description}
                      icon={node.icon}
                      onDragStart={onDragStart}
                    />
                  ))}
                </div>
              </div>
            )}
            {/* Integration Category */}
            {(selectedCategory === 'all' || selectedCategory === 'integration') && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: 'hsl(220, 90%, 56%)',
                  marginBottom: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'hsl(220, 90%, 56%)'
                  }} />
                  INTEGRATION ({getNodesByCategory('integration').filter(node => 
                    !searchTerm || 
                    node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    node.description.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {getNodesByCategory('integration')
                    .filter(node => 
                      !searchTerm || 
                      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((node) => (
                    <NodePaletteItem
                      key={node.id}
                      nodeId={node.id}
                      label={node.name}
                      description={node.description}
                      icon={node.icon}
                      onDragStart={onDragStart}
                    />
                  ))}
                </div>
              </div>
            )}
            {/* Flow Control Category */}
            {(selectedCategory === 'all' || selectedCategory === 'flow-control') && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: 'hsl(var(--muted-foreground))',
                  marginBottom: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'hsl(var(--muted-foreground))'
                  }} />
                  FLOW CONTROL ({getNodesByCategory('flow-control').filter(node => 
                    !searchTerm || 
                    node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    node.description.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {getNodesByCategory('flow-control')
                    .filter(node => 
                      !searchTerm || 
                      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((node) => (
                    <NodePaletteItem
                      key={node.id}
                      nodeId={node.id}
                      label={node.name}
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

        {/* ReactFlow Canvas - Flex 1 per occupare tutto lo spazio */}
        <div 
          style={{ flex: 1, background: '#ffffff', position: 'relative' }}
          onDrop={onDrop} 
          onDragOver={onDragOver}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onMove={onMove}
            onViewportChange={(viewport) => {
              setViewport(viewport);
            }}
            nodeTypes={nodeTypes}
            defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
            minZoom={0.1}
            maxZoom={2}
            className="bg-white"
          >
            <Background color="#ddd" gap={16} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>
      
      {/* Node Configuration Modal Dialog */}
      <Dialog 
        open={selectedNodeId !== null} 
        onOpenChange={(open) => {
          if (!open) useWorkflowStore.getState().selectNode(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings size={20} className="text-windtre-orange" />
              Configurazione Nodo
            </DialogTitle>
            <DialogDescription>
              Configura i parametri del nodo selezionato per personalizzare il comportamento nel workflow.
            </DialogDescription>
          </DialogHeader>
          {selectedNodeId && (
            <NodeConfigPanel
              nodeId={selectedNodeId}
              onSave={(config) => {
                const node = nodes.find(n => n.id === selectedNodeId);
                if (node) {
                  updateNode(selectedNodeId, { data: { ...node.data, config } });
                  useWorkflowStore.getState().selectNode(null);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Workflow Test Result Dialog */}
      <WorkflowTestResultDialog
        result={testResult}
        open={isTestResultOpen}
        onOpenChange={setIsTestResultOpen}
      />
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

// Get gradient colors based on category
function getCategoryGradient(category: string) {
  const gradients = {
    trigger: 'linear-gradient(135deg, hsla(220, 90%, 56%, 0.15), hsla(220, 90%, 56%, 0.05))',
    action: 'linear-gradient(135deg, hsla(142, 76%, 36%, 0.15), hsla(142, 76%, 36%, 0.05))',
    ai: 'linear-gradient(135deg, hsla(274, 65%, 46%, 0.15), hsla(274, 65%, 46%, 0.05))',
    routing: 'linear-gradient(135deg, hsla(25, 95%, 53%, 0.15), hsla(25, 95%, 53%, 0.05))',
    integration: 'linear-gradient(135deg, hsla(220, 90%, 56%, 0.15), hsla(220, 90%, 56%, 0.05))',
    'flow-control': 'linear-gradient(135deg, hsla(0, 0%, 50%, 0.08), hsla(0, 0%, 50%, 0.02))',
  };
  return gradients[category as keyof typeof gradients] || gradients['flow-control'];
}

function getCategoryBorderColor(category: string) {
  const colors = {
    trigger: 'hsl(220, 90%, 56%)',
    action: 'hsl(142, 76%, 36%)',
    ai: 'hsl(274, 65%, 46%)',
    routing: 'hsl(25, 95%, 53%)',
    integration: 'hsl(220, 90%, 56%)',
    'flow-control': 'hsl(0, 0%, 60%)',
  };
  return colors[category as keyof typeof colors] || colors['flow-control'];
}

// Custom Node Component per ReactFlow Canvas with WindTre Glassmorphism
const CustomWorkflowNode = memo(({ data }: NodeProps) => {
  const gradient = getCategoryGradient(data.category);
  const borderColor = getCategoryBorderColor(data.category);
  
  return (
    <div
      style={{
        minWidth: '200px',
        padding: '1rem 1.25rem',
        background: gradient,
        backdropFilter: 'blur(12px) saturate(120%)',
        WebkitBackdropFilter: 'blur(12px) saturate(120%)',
        border: `2px solid ${borderColor}`,
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer'
      }}
      className="hover:shadow-xl hover:scale-105"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            background: `${borderColor}20`,
            border: `1.5px solid ${borderColor}40`,
            color: borderColor
          }}
        >
          {data.icon || '⚙️'}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '0.875rem',
              fontWeight: '700',
              color: 'hsl(var(--foreground))',
              lineHeight: '1.3',
              marginBottom: '0.25rem'
            }}
          >
            {data.name || 'Node'}
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'hsl(var(--muted-foreground))',
              fontWeight: '500'
            }}
          >
            {data.executorType || data.category}
          </div>
        </div>
      </div>
    </div>
  );
});

CustomWorkflowNode.displayName = 'CustomWorkflowNode';

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
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
          style={{ backgroundColor: color }}
        >
          <span className="text-sm">{icon}</span>
        </div>
        <div className="flex-1">
          <h5 className="text-sm font-medium text-gray-900 leading-tight">{label}</h5>
          <p className="text-xs text-gray-600 leading-relaxed mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}
