/**
 * 🎯 BRAND WORKFLOWS TAB
 * Complete workflow builder integration for Brand Interface CRM
 * Features: Workflow list, Canvas editor, Node palette, AI assistant
 */

import { useState, useCallback, useMemo } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Plus, GitBranch, Search, Edit, Trash2, Copy, 
  Download, Upload, PlayCircle, Brain, List, 
  LayoutGrid, ArrowLeft, Save, X, Palette
} from 'lucide-react';

// Types for workflows
interface BrandWorkflow {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: 'crm' | 'wms' | 'hr' | 'pos' | 'analytics' | 'generic';
  tags: string[];
  version: string;
  status: 'draft' | 'active' | 'archived' | 'deprecated';
  dslJson: {
    nodes: any[];
    edges: any[];
  };
  deploymentStatus: 'draft' | 'deployed' | 'archived';
  deployedToCount: number;
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
      deploymentStatus: 'deployed',
      deployedToCount: 45,
      createdBy: 'admin@brand.com',
      createdAt: '2025-01-15T10:00:00Z',
      updatedAt: '2025-01-15T10:00:00Z'
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
      deploymentStatus: 'deployed',
      deployedToCount: 120,
      createdBy: 'admin@brand.com',
      createdAt: '2025-02-01T14:30:00Z',
      updatedAt: '2025-02-10T09:15:00Z'
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
      deploymentStatus: 'draft',
      deployedToCount: 0,
      createdBy: 'admin@brand.com',
      createdAt: '2025-03-05T11:20:00Z',
      updatedAt: '2025-03-05T11:20:00Z'
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
      deploymentStatus: 'draft',
      deployedToCount: 0,
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

  const handleSaveWorkflow = () => {
    console.log('💾 Saving workflow:', selectedWorkflow);
    // TODO: Implement API call to save workflow
    handleBackToList();
  };

  const handleDeleteWorkflow = (workflowId: string) => {
    console.log('🗑️ Deleting workflow:', workflowId);
    // TODO: Implement API call to delete workflow
  };

  const handleDuplicateWorkflow = (workflow: BrandWorkflow) => {
    console.log('📋 Duplicating workflow:', workflow);
    // TODO: Implement duplicate logic
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

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Cerca workflow per nome, codice o tag..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-workflows"
        />
      </div>

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWorkflows.map((workflow) => (
          <WorkflowCard
            key={workflow.id}
            workflow={workflow}
            onEdit={() => handleEditWorkflow(workflow)}
            onDelete={() => handleDeleteWorkflow(workflow.id)}
            onDuplicate={() => handleDuplicateWorkflow(workflow)}
          />
        ))}
      </div>

      {filteredWorkflows.length === 0 && (
        <div className="windtre-glass-panel p-12 text-center">
          <GitBranch className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nessun workflow trovato
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery 
              ? 'Prova con un termine di ricerca diverso'
              : 'Inizia creando il tuo primo workflow template'}
          </p>
          {!searchQuery && (
            <Button
              onClick={handleCreateWorkflow}
              className="bg-windtre-orange hover:bg-windtre-orange-dark text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crea Primo Workflow
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Workflow Card Component
interface WorkflowCardProps {
  workflow: BrandWorkflow;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function WorkflowCard({ workflow, onEdit, onDelete, onDuplicate }: WorkflowCardProps) {
  const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-green-100 text-green-700',
    archived: 'bg-yellow-100 text-yellow-700',
    deprecated: 'bg-red-100 text-red-700'
  };

  const categoryColors = {
    crm: 'bg-windtre-orange/10 text-windtre-orange',
    wms: 'bg-blue-100 text-blue-700',
    hr: 'bg-purple-100 text-purple-700',
    pos: 'bg-green-100 text-green-700',
    analytics: 'bg-pink-100 text-pink-700',
    generic: 'bg-gray-100 text-gray-700'
  };

  return (
    <div className="windtre-glass-panel p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[workflow.category]}`}>
              {workflow.category.toUpperCase()}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[workflow.status]}`}>
              {workflow.status}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">{workflow.name}</h3>
          <p className="text-xs text-gray-500 mb-2">{workflow.code}</p>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3 line-clamp-2 min-h-[2.5rem]">
        {workflow.description || 'Nessuna descrizione'}
      </p>

      <div className="flex flex-wrap gap-1 mb-4 min-h-[24px]">
        {workflow.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">
        <div>
          <span className="font-medium">v{workflow.version}</span>
        </div>
        <div>
          {workflow.deploymentStatus === 'deployed' && (
            <span className="text-green-600 font-medium">
              ✓ {workflow.deployedToCount} tenant
            </span>
          )}
          {workflow.deploymentStatus === 'draft' && (
            <span className="text-gray-400">Non deployato</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={onEdit}
          size="sm"
          className="flex-1 bg-windtre-orange hover:bg-windtre-orange-dark text-white"
          data-testid={`button-edit-workflow-${workflow.id}`}
        >
          <Edit className="h-3 w-3 mr-1" />
          Modifica
        </Button>
        <Button
          onClick={onDuplicate}
          size="sm"
          variant="outline"
          data-testid={`button-duplicate-workflow-${workflow.id}`}
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button
          onClick={onDelete}
          size="sm"
          variant="outline"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
          data-testid={`button-delete-workflow-${workflow.id}`}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// Workflow Canvas View Component
interface WorkflowCanvasViewProps {
  workflow: BrandWorkflow | null;
  onBack: () => void;
  onSave: () => void;
  onAIAssistant: () => void;
}

function WorkflowCanvasView({ workflow, onBack, onSave, onAIAssistant }: WorkflowCanvasViewProps) {
  const [nodes, setNodes] = useState<any[]>(workflow?.dslJson?.nodes || []);
  const [edges, setEdges] = useState<any[]>(workflow?.dslJson?.edges || []);
  const [isPaletteOpen, setIsPaletteOpen] = useState(true);

  const handleNodesChange = useCallback((newNodes: any[]) => {
    setNodes(newNodes);
  }, []);

  const handleEdgesChange = useCallback((newEdges: any[]) => {
    setEdges(newEdges);
  }, []);

  const handleSaveClick = () => {
    console.log('💾 Saving workflow with nodes/edges:', { nodes, edges });
    // TODO: Update workflow object with new dslJson
    onSave();
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
          <WorkflowCanvasPlaceholder nodeCount={nodes.length} edgeCount={edges.length} />
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

// Placeholder canvas (will be replaced with real ReactFlow when @xyflow/react is properly installed)
function WorkflowCanvasPlaceholder({ nodeCount, edgeCount }: { nodeCount: number; edgeCount: number }) {
  return (
    <div className="h-full flex items-center justify-center text-gray-500">
      <div className="text-center">
        <GitBranch className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold mb-2">Workflow Canvas</h3>
        <p className="text-sm mb-4">
          ReactFlow canvas sarà disponibile qui
        </p>
        <div className="text-xs text-gray-400 space-y-1">
          <p>📊 Nodes: {nodeCount} | Edges: {edgeCount}</p>
          <p>🔧 Integrazione @xyflow/react in corso</p>
        </div>
      </div>
    </div>
  );
}
