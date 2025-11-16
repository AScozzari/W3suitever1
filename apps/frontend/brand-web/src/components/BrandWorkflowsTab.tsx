/**
 * 🎯 BRAND WORKFLOWS TAB
 * Complete workflow builder integration for Brand Interface CRM
 * Features: Workflow list, Canvas editor, Node palette, AI assistant
 */

import { useState, useCallback, useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  useNodesState, 
  useEdgesState, 
  addEdge,
  type Connection,
  type Node,
  type Edge,
  ReactFlowProvider 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Plus, GitBranch, Search, Edit, Trash2, Copy, 
  Download, Upload, PlayCircle, Brain, List, 
  LayoutGrid, ArrowLeft, Save, X, Palette
} from 'lucide-react';
import { BrandWorkflowsDataTable } from './BrandWorkflowsDataTable';

// Types for workflows
interface BrandWorkflow {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  version: string;
  status: 'active' | 'draft' | 'archived';
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

  // Mock data - will be replaced with TanStack Query API calls
  const workflows: BrandWorkflow[] = [
    {
      id: '1',
      code: 'brand-wf-email-benvenuto',
      name: 'Email Benvenuto Lead',
      description: 'Workflow automatico per email di benvenuto ai nuovi lead',
      category: 'crm',
      tags: ['email', 'automation', 'lead'],
      version: '1.0.0',
      status: 'active',
      dslJson: { nodes: [], edges: [] },
      createdBy: 'admin@brand.com',
      createdAt: '2025-01-15T10:00:00Z',
      updatedAt: '2025-03-20T14:22:00Z'
    },
    {
      id: '2',
      code: 'brand-wf-lead-scoring',
      name: 'AI Lead Scoring',
      description: 'Workflow con AI per scoring automatico lead',
      category: 'crm',
      tags: ['ai', 'lead', 'scoring'],
      version: '2.1.0',
      status: 'active',
      dslJson: { nodes: [], edges: [] },
      createdBy: 'admin@brand.com',
      createdAt: '2025-02-01T14:30:00Z',
      updatedAt: '2025-03-18T09:15:00Z'
    },
    {
      id: '3',
      code: 'brand-wf-pipeline-routing',
      name: 'Pipeline Auto Routing',
      description: 'Routing automatico deal tra pipeline basato su regole',
      category: 'crm',
      tags: ['pipeline', 'routing', 'automation'],
      version: '1.5.0',
      status: 'draft',
      dslJson: { nodes: [], edges: [] },
      createdBy: 'admin@brand.com',
      createdAt: '2025-03-05T11:20:00Z',
      updatedAt: '2025-03-05T16:45:00Z'
    }
  ];

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

  const handleSaveWorkflow = (updatedDSL: { nodes: Node[]; edges: Edge[]; viewport: any }) => {
    console.log('💾 Saving workflow with updated DSL:', updatedDSL);
    
    if (selectedWorkflow) {
      // Update workflow with new DSL (in real implementation, this would persist to backend)
      const updatedWorkflow = { ...selectedWorkflow, dslJson: updatedDSL };
      console.log('📝 Updated workflow object:', updatedWorkflow);
      
      // TODO: Implement TanStack Query mutation to persist to backend
      // updateWorkflowMutation.mutate({ id: selectedWorkflow.id, dslJson: updatedDSL });
    }
    
    handleBackToList();
  };

  const handleDeleteWorkflow = (workflowId: string) => {
    console.log('🗑️ Deleting workflow:', workflowId);
    // TODO: Implement API call to delete workflow
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
            disabled
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
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Node Library</h3>
              <p className="text-xs text-gray-500 mt-1">
                Trascina i nodi nella canvas
              </p>
            </div>
            <div className="p-4 space-y-4">
              {/* Triggers */}
              <div>
                <h4 className="text-xs font-medium text-gray-700 uppercase mb-2">Triggers</h4>
                <div className="space-y-2">
                  <NodePaletteItem label="Form Trigger" description="Attiva workflow su form submit" icon="📝" />
                  <NodePaletteItem label="Task Trigger" description="Attiva workflow su eventi task" icon="✅" />
                </div>
              </div>
              {/* Actions */}
              <div>
                <h4 className="text-xs font-medium text-gray-700 uppercase mb-2">Actions</h4>
                <div className="space-y-2">
                  <NodePaletteItem label="Send Email" description="Invia email notification" icon="📧" />
                  <NodePaletteItem label="Approval Request" description="Richiedi approvazione" icon="✓" />
                </div>
              </div>
              {/* AI Nodes */}
              <div>
                <h4 className="text-xs font-medium text-gray-700 uppercase mb-2">AI Nodes</h4>
                <div className="space-y-2">
                  <NodePaletteItem label="AI Decision" description="Decisione intelligente AI" icon="🤖" />
                  <NodePaletteItem label="AI Lead Scoring" description="Score automatico lead" icon="🎯" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ReactFlow Canvas */}
        <div className="flex-1 bg-gray-50">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            className="bg-gray-50"
          >
            <Background color="#ccc" gap={16} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

// Simple node palette item
function NodePaletteItem({ label, description, icon }: { label: string; description: string; icon: string }) {
  return (
    <div className="p-3 bg-white border border-gray-200 rounded-lg hover:border-windtre-orange hover:shadow-sm transition-all cursor-grab">
      <div className="flex items-start gap-2">
        <div className="text-xl">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">{label}</div>
          <div className="text-xs text-gray-500 truncate">{description}</div>
        </div>
      </div>
    </div>
  );
}
