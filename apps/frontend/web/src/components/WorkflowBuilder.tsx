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
  MiniMap,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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
  Brain,
  Undo2,
  Redo2,
  PlayCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

import { useWorkflowStore } from '../stores/workflowStore';
import { ALL_WORKFLOW_NODES, getNodesByCategory } from '../lib/workflow-node-definitions';
import { getMCPNodesByCategory, getMCPNodesByEcosystem, MCP_ECOSYSTEMS } from '../lib/mcp-node-definitions';
import { WorkflowActionNode } from './workflow-nodes/WorkflowActionNode';
import { WorkflowTriggerNode } from './workflow-nodes/WorkflowTriggerNode';
import { WorkflowAiNode } from './workflow-nodes/WorkflowAiNode';
import { WorkflowRoutingNode } from './workflow-nodes/WorkflowRoutingNode';
import { WorkflowFlowControlNode } from './workflow-nodes/WorkflowFlowControlNode';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWorkflowTemplate, useCreateTemplate, useUpdateTemplate } from '../hooks/useWorkflowTemplates';
import NodeInspector from './workflow/NodeInspector';
import { AIWorkflowChatModal } from './AIWorkflowChatModal';
import { WorkflowTestResultDialog } from './WorkflowTestResultDialog';
import { useTenant } from '../contexts/TenantContext';
import { WorkflowSettingsModal, type WorkflowSettings } from './WorkflowSettingsModal';

// ✅ REAL PROFESSIONAL NODE COMPONENTS - DEFINED OUTSIDE TO PREVENT RE-RENDERS
const nodeTypes = {
  action: WorkflowActionNode,
  trigger: WorkflowTriggerNode,
  ai: WorkflowAiNode,
  routing: WorkflowRoutingNode,
  'flow-control': WorkflowFlowControlNode,
  'mcp-outbound': WorkflowActionNode, // MCP Outbound nodes use action component
  'mcp-inbound': WorkflowTriggerNode, // MCP Inbound nodes use trigger component
  'w3-data': WorkflowActionNode, // W3 Data nodes use action component
  condition: WorkflowActionNode, // Reuse action node for conditions (legacy)
  flow: WorkflowActionNode, // Reuse action node for flow control (legacy)
} as const;

interface WorkflowBuilderProps {
  templateId?: string;
  initialCategory?: string;
  onSave?: (workflow: { nodes: Node[]; edges: Edge[] }) => void;
  onClose?: () => void;
}

function WorkflowBuilderContent({ templateId, initialCategory, onSave, onClose }: WorkflowBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
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
  const { data: templateData, isLoading: templateLoading } = useWorkflowTemplate(templateId || null);
  const createTemplateMutation = useCreateTemplate();
  const updateTemplateMutation = useUpdateTemplate();
  
  // 🎯 TENANT CONTEXT
  const { currentTenant } = useTenant();
  
  // 🎯 TEMPLATE LOADING LOGIC
  React.useEffect(() => {
    if (templateId && templateData && !templateLoading) {
      // ✅ LOAD EXISTING TEMPLATE
      console.log('📂 Loading template data:', templateData);
      
      const definition = templateData.definition;
      if (definition?.nodes && definition?.edges) {
        // Add onConfigClick to all loaded nodes
        const nodesWithConfig = definition.nodes.map((node: Node) => ({
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
  
  // 📝 WORKFLOW SETTINGS MODAL STATE
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [pendingWorkflowSettings, setPendingWorkflowSettings] = useState<WorkflowSettings | null>(null);
  
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
          // Handle position changes (dragging)
          if (change.type === 'position' && 'position' in change && change.position) {
            return { ...node, position: change.position, positionAbsolute: change.positionAbsolute };
          }
          // Handle selection changes
          if (change.type === 'select' && 'selected' in change) {
            return { ...node, selected: change.selected };
          }
          // Handle dimensions changes (CRITICAL for drag initialization)
          if (change.type === 'dimensions' && 'dimensions' in change) {
            return { 
              ...node, 
              measured: { width: change.dimensions?.width || 0, height: change.dimensions?.height || 0 },
              width: change.dimensions?.width,
              height: change.dimensions?.height
            };
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

  // 🧪 TEST RUN STATE
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testRunResult, setTestRunResult] = useState<any | null>(null);

  // 💾 SMART SAVE: CREATE vs UPDATE TEMPLATE
  const handleSaveWorkflow = () => {
    if (nodes.length === 0) {
      alert('⚠️ Il workflow è vuoto. Aggiungi almeno un nodo prima di salvare.');
      return;
    }
    
    if (templateId && templateData) {
      // 📝 UPDATE EXISTING TEMPLATE - Open settings modal for editing
      setShowSettingsModal(true);
    } else {
      // 🆕 CREATE NEW TEMPLATE - Open settings modal
      setShowSettingsModal(true);
    }
  };
  
  // 📝 Handle settings modal save
  const handleSettingsSave = (settings: WorkflowSettings) => {
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
        name: settings.name,
        description: settings.description,
        category: settings.category,
        definition: workflowDefinition,
        tags: templateData.tags || [],
        actionTags: settings.actionTags,
        customAction: settings.customAction || undefined,
        metadata: {
          ...templateData.metadata,
          nodeCount: cleanNodes.length,
          edgeCount: edges.length,
          lastModified: new Date().toISOString()
        }
      });
    } else {
      // 🆕 CREATE NEW TEMPLATE
      console.log('🆕 Creating new template with action tags:', settings.actionTags);
      createTemplateMutation.mutate({
        name: settings.name,
        description: settings.description,
        category: settings.category as any,
        definition: workflowDefinition,
        tags: [],
        actionTags: settings.actionTags,
        customAction: settings.customAction || undefined,
        metadata: {
          nodeCount: cleanNodes.length,
          edgeCount: edges.length,
          createdVia: 'workflow-builder'
        }
      });
    }
    
    // Close modal
    setShowSettingsModal(false);
    
    // Also call onSave prop if provided (backward compatibility)
    onSave?.({
      nodes: cleanNodes,
      edges
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

  // 🧪 TEST RUN HANDLER
  const handleTestRun = async () => {
    if (nodes.length === 0) {
      alert('⚠️ Il workflow è vuoto. Aggiungi almeno un nodo prima di testarlo.');
      return;
    }

    setIsTestRunning(true);
    setTestRunResult(null);

    try {
      // Clean nodes data before sending (remove functions)
      const cleanNodes = nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onConfigClick: undefined
        }
      }));

      const response = await fetch('/api/workflows/test-run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': currentTenant?.id || '',
          'X-Auth-Session': 'authenticated',
        },
        credentials: 'include',
        body: JSON.stringify({
          nodes: cleanNodes,
          edges,
          testName: templateData?.name || 'Test Run'
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Test run completed:', result);
        setTestRunResult(result);
      } else {
        console.error('❌ Test run failed:', result);
        setTestRunResult({ 
          success: false, 
          error: result.error || 'Test run failed',
          message: result.message 
        });
      }
    } catch (error: any) {
      console.error('❌ Test run request failed:', error);
      setTestRunResult({ 
        success: false, 
        error: 'Network error',
        message: error.message || 'Failed to connect to server' 
      });
    } finally {
      setIsTestRunning(false);
    }
  };

  const handleAIWorkflowGenerated = useCallback((workflowJson: any) => {
    console.log('🤖 AI workflow generated:', workflowJson);
    
    if (!workflowJson?.nodes || !workflowJson?.edges) {
      console.error('❌ Invalid workflow JSON structure');
      alert('❌ Invalid workflow structure from AI. Please try a different description.');
      return;
    }

    const aiNodes = workflowJson.nodes.map((node: any) => {
      const nodeDefinition = ALL_WORKFLOW_NODES.find(n => n.id === node.type);
      
      if (!nodeDefinition) {
        console.warn(`⚠️ Node type not found: ${node.type}`);
      }
      
      return {
        id: node.id || `${node.type}-${Date.now()}-${Math.random()}`,
        type: node.category || nodeDefinition?.category || 'action',
        position: node.position || { x: Math.random() * 400, y: Math.random() * 300 },
        data: {
          ...(nodeDefinition || {}),
          label: node.label || node.name || nodeDefinition?.name || 'Unnamed Node',
          config: {
            ...(nodeDefinition?.defaultConfig || {}),
            ...(node.config || {})
          },
          onConfigClick: handleConfigClick
        },
        draggable: true,
        connectable: true,
        deletable: true,
        selectable: true,
      };
    });

    const aiEdges = workflowJson.edges.map((edge: any) => ({
      id: edge.id || `edge-${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: edge.type || 'default',
      animated: edge.animated !== false,
      style: edge.style || { stroke: '#FF6900', strokeWidth: 2 }
    }));

    setNodes(aiNodes);
    setEdges(aiEdges);
    
    console.log('✅ AI workflow applied to canvas:', {
      nodes: aiNodes.length,
      edges: aiEdges.length
    });
  }, [setNodes, setEdges, handleConfigClick]);

  // AI Assistant Drawer state
  const [showAIDrawer, setShowAIDrawer] = useState(false);

  return (
    <>
      {/* Outer Container */}
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, hsl(210, 20%, 98%), hsl(210, 25%, 96%))',
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        position: 'relative'
      }}>
        {/* Main Workflow Builder Container - Reduced height by 5cm */}
        <div className="flex" style={{
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          width: '100%',
          height: 'calc(88vh - 2rem)',
          overflow: 'hidden'
        }}>
        {/* Node Palette Sidebar - Full height */}
        <div className={`${isNodePaletteOpen ? 'w-96' : 'w-16'} transition-all duration-300 bg-white border-r border-gray-200 flex flex-col h-full`}>
        {/* Header - Always Visible */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {isNodePaletteOpen && <h3 className="font-semibold text-gray-900">Node Library</h3>}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsNodePaletteOpen(!isNodePaletteOpen)}
            data-testid="toggle-palette"
            className={!isNodePaletteOpen ? "mx-auto" : ""}
            title={isNodePaletteOpen ? "Collapse palette" : "Expand palette"}
          >
            {isNodePaletteOpen ? <Eye className="h-4 w-4" /> : <Palette className="h-4 w-4" />}
          </Button>
        </div>

        {/* Collapsed State - Icon Rail */}
        {!isNodePaletteOpen && (
          <ScrollArea className="flex-1">
            <div className="flex flex-col items-center gap-3 py-4">
              {/* Actions Category */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCategory('action');
                  setIsNodePaletteOpen(true);
                }}
                className="w-12 h-12 p-0 hover:bg-orange-50"
                title="Actions"
                data-testid="collapsed-icon-action"
              >
                <div className="w-10 h-10 rounded-lg bg-windtre-orange flex items-center justify-center text-white">
                  <span className="text-sm font-bold">A</span>
                </div>
              </Button>

              {/* Triggers Category */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCategory('trigger');
                  setIsNodePaletteOpen(true);
                }}
                className="w-12 h-12 p-0 hover:bg-purple-50"
                title="Triggers"
                data-testid="collapsed-icon-trigger"
              >
                <div className="w-10 h-10 rounded-lg bg-windtre-purple flex items-center justify-center text-white">
                  <span className="text-sm font-bold">T</span>
                </div>
              </Button>

              {/* AI Category */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCategory('ai');
                  setIsNodePaletteOpen(true);
                }}
                className="w-12 h-12 p-0 hover:bg-blue-50"
                title="AI Nodes"
                data-testid="collapsed-icon-ai"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Brain className="h-5 w-5" />
                </div>
              </Button>

              {/* Routing Category */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCategory('routing');
                  setIsNodePaletteOpen(true);
                }}
                className="w-12 h-12 p-0 hover:bg-green-50"
                title="Routing"
                data-testid="collapsed-icon-routing"
              >
                <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center text-white">
                  <span className="text-sm font-bold">R</span>
                </div>
              </Button>

              {/* MCP Integrations - Opens to mcp-outbound */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCategory('mcp-outbound');
                  setIsNodePaletteOpen(true);
                }}
                className="w-12 h-12 p-0 hover:bg-indigo-50"
                title="MCP Integrations"
                data-testid="collapsed-icon-mcp"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <span className="text-sm font-bold">🔌</span>
                </div>
              </Button>
            </div>
          </ScrollArea>
        )}

        {/* Department Context - Only when expanded */}
        {isNodePaletteOpen && initialCategory && departmentInfo[initialCategory as keyof typeof departmentInfo] && (
          <div className="px-4 pb-4 border-b border-gray-200">
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
          </div>
        )}

        {isNodePaletteOpen && (
          <div className="flex flex-col flex-1 min-h-0">
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
                    <SelectItem value="routing">Routing</SelectItem>
                    <SelectItem value="flow-control">Flow Control</SelectItem>
                    <SelectItem value="w3-data">🗄️ W3 Data</SelectItem>
                    <SelectItem value="mcp-outbound">🔌 MCP Outbound</SelectItem>
                    <SelectItem value="mcp-inbound">📥 MCP Inbound</SelectItem>
                    <SelectItem value="mcp-google">🔵 Google Workspace</SelectItem>
                    <SelectItem value="mcp-aws">🟠 AWS Services</SelectItem>
                    <SelectItem value="mcp-meta">📸 Meta/Instagram</SelectItem>
                    <SelectItem value="mcp-microsoft">💼 Microsoft 365</SelectItem>
                    <SelectItem value="mcp-stripe">💳 Stripe</SelectItem>
                    <SelectItem value="mcp-gtm">📊 GTM/Analytics</SelectItem>
                    <SelectItem value="mcp-postgresql">🐘 PostgreSQL</SelectItem>
                    <SelectItem value="mcp-telegram">✈️ Telegram</SelectItem>
                    <SelectItem value="mcp-whatsapp">💬 WhatsApp</SelectItem>
                    <SelectItem value="mcp-twilio">📞 Twilio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Node List - Dynamically Sized Scrollable Area */}
            <div className="flex-1 overflow-y-auto">
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
                            {node.name.includes("Decision") ? (
                              <Brain className="h-4 w-4" />
                            ) : (
                              <span className="text-xs">AI</span>
                            )}
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

                {(selectedCategory === 'all' || selectedCategory === 'routing') && (
                <>
                <Separator />

                {/* Routing Nodes */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 bg-windtre-purple rounded-full" />
                    Routing ({getNodesByCategory('routing').filter(node => 
                      !searchTerm || 
                      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length})
                  </h4>
                  <div className="space-y-2">
                    {getNodesByCategory('routing')
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
                            <span className="text-xs">R</span>
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

                {(selectedCategory === 'all' || selectedCategory === 'flow-control') && (
                <>
                <Separator />

                {/* Flow Control Nodes */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 bg-windtre-orange rounded-full" />
                    Flow Control ({getNodesByCategory('flow-control').filter(node => 
                      !searchTerm || 
                      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length})
                  </h4>
                  <div className="space-y-2">
                    {getNodesByCategory('flow-control')
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
                            <span className="text-xs">FC</span>
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

                {/* W3 Data Nodes */}
                {(selectedCategory === 'all' || selectedCategory === 'w3-data') && (
                <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <div className="w-3 h-3 bg-windtre-orange rounded-full" />
                    W3 Data ({getNodesByCategory('w3-data').filter(node => 
                      !searchTerm || 
                      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length})
                  </h4>
                  <div className="space-y-2">
                    {getNodesByCategory('w3-data')
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
                            <span className="text-xs">DB</span>
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

                {/* 🔌 MCP NODES SECTIONS - Organized by Ecosystem */}
                
                {/* Google Workspace MCP */}
                {(selectedCategory === 'all' || selectedCategory === 'mcp-outbound' || selectedCategory === 'mcp-inbound' || selectedCategory === 'mcp-google') && getMCPNodesByEcosystem('google').length > 0 && (
                <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: MCP_ECOSYSTEMS.google.color }}>
                      <span className="text-[10px]">G</span>
                    </div>
                    🔵 Google Workspace ({getMCPNodesByEcosystem('google').filter(node => 
                      !searchTerm || 
                      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length})
                  </h4>
                  <div className="space-y-2">
                    {getMCPNodesByEcosystem('google')
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
                            <span className="text-xs font-bold">G</span>
                          </div>
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-gray-900 leading-tight">{node.name}</h5>
                            <p className="text-xs text-gray-600 leading-relaxed mt-1">{node.description}</p>
                            <Badge className="mt-2" variant="outline" style={{ borderColor: node.color, color: node.color }}>
                              {node.category === 'mcp-outbound' ? '📤 Outbound' : '📥 Inbound'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                </>
                )}

                {/* AWS MCP */}
                {(selectedCategory === 'all' || selectedCategory === 'mcp-outbound' || selectedCategory === 'mcp-inbound' || selectedCategory === 'mcp-aws') && getMCPNodesByEcosystem('aws').length > 0 && (
                <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: MCP_ECOSYSTEMS.aws.color }}>
                      <span className="text-[9px] font-bold">AWS</span>
                    </div>
                    🟠 AWS Services ({getMCPNodesByEcosystem('aws').filter(node => 
                      !searchTerm || 
                      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length})
                  </h4>
                  <div className="space-y-2">
                    {getMCPNodesByEcosystem('aws')
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
                            <span className="text-[9px] font-bold">AWS</span>
                          </div>
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-gray-900 leading-tight">{node.name}</h5>
                            <p className="text-xs text-gray-600 leading-relaxed mt-1">{node.description}</p>
                            <Badge className="mt-2" variant="outline" style={{ borderColor: node.color, color: node.color }}>
                              {node.category === 'mcp-outbound' ? '📤 Outbound' : '📥 Inbound'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                </>
                )}

                {/* Meta/Instagram MCP */}
                {(selectedCategory === 'all' || selectedCategory === 'mcp-outbound' || selectedCategory === 'mcp-inbound' || selectedCategory === 'mcp-meta') && getMCPNodesByEcosystem('meta').length > 0 && (
                <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: MCP_ECOSYSTEMS.meta.color }}>
                      <span className="text-[9px] font-bold">META</span>
                    </div>
                    📸 Meta/Instagram ({getMCPNodesByEcosystem('meta').filter(node => 
                      !searchTerm || 
                      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length})
                  </h4>
                  <div className="space-y-2">
                    {getMCPNodesByEcosystem('meta')
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
                            <span className="text-[8px] font-bold">META</span>
                          </div>
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-gray-900 leading-tight">{node.name}</h5>
                            <p className="text-xs text-gray-600 leading-relaxed mt-1">{node.description}</p>
                            <Badge className="mt-2" variant="outline" style={{ borderColor: node.color, color: node.color }}>
                              {node.category === 'mcp-outbound' ? '📤 Outbound' : '📥 Inbound'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                </>
                )}

                {/* Microsoft 365 MCP */}
                {(selectedCategory === 'all' || selectedCategory === 'mcp-outbound' || selectedCategory === 'mcp-inbound' || selectedCategory === 'mcp-microsoft') && getMCPNodesByEcosystem('microsoft').length > 0 && (
                <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: MCP_ECOSYSTEMS.microsoft.color }}>
                      <span className="text-[9px] font-bold">MS</span>
                    </div>
                    💼 Microsoft 365 ({getMCPNodesByEcosystem('microsoft').filter(node => 
                      !searchTerm || 
                      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length})
                  </h4>
                  <div className="space-y-2">
                    {getMCPNodesByEcosystem('microsoft')
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
                            <span className="text-[9px] font-bold">MS</span>
                          </div>
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-gray-900 leading-tight">{node.name}</h5>
                            <p className="text-xs text-gray-600 leading-relaxed mt-1">{node.description}</p>
                            <Badge className="mt-2" variant="outline" style={{ borderColor: node.color, color: node.color }}>
                              {node.category === 'mcp-outbound' ? '📤 Outbound' : '📥 Inbound'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                </>
                )}

                {/* Stripe MCP */}
                {(selectedCategory === 'all' || selectedCategory === 'mcp-outbound' || selectedCategory === 'mcp-inbound' || selectedCategory === 'mcp-stripe') && getMCPNodesByEcosystem('stripe').length > 0 && (
                <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: MCP_ECOSYSTEMS.stripe.color }}>
                      <span className="text-[8px] font-bold">$$$</span>
                    </div>
                    💳 Stripe ({getMCPNodesByEcosystem('stripe').filter(node => 
                      !searchTerm || 
                      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length})
                  </h4>
                  <div className="space-y-2">
                    {getMCPNodesByEcosystem('stripe')
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
                            <span className="text-[10px] font-bold">💳</span>
                          </div>
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-gray-900 leading-tight">{node.name}</h5>
                            <p className="text-xs text-gray-600 leading-relaxed mt-1">{node.description}</p>
                            <Badge className="mt-2" variant="outline" style={{ borderColor: node.color, color: node.color }}>
                              {node.category === 'mcp-outbound' ? '📤 Outbound' : '📥 Inbound'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                </>
                )}

                {/* GTM/Analytics MCP */}
                {(selectedCategory === 'all' || selectedCategory === 'mcp-outbound' || selectedCategory === 'mcp-inbound' || selectedCategory === 'mcp-gtm') && getMCPNodesByEcosystem('gtm').length > 0 && (
                <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: MCP_ECOSYSTEMS.gtm.color }}>
                      <span className="text-[8px] font-bold">GTM</span>
                    </div>
                    📊 GTM/Analytics ({getMCPNodesByEcosystem('gtm').filter(node => 
                      !searchTerm || 
                      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length})
                  </h4>
                  <div className="space-y-2">
                    {getMCPNodesByEcosystem('gtm')
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
                            <span className="text-[8px] font-bold">GTM</span>
                          </div>
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-gray-900 leading-tight">{node.name}</h5>
                            <p className="text-xs text-gray-600 leading-relaxed mt-1">{node.description}</p>
                            <Badge className="mt-2" variant="outline" style={{ borderColor: node.color, color: node.color }}>
                              {node.category === 'mcp-outbound' ? '📤 Outbound' : '📥 Inbound'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                </>
                )}

                {/* PostgreSQL MCP */}
                {(selectedCategory === 'all' || selectedCategory === 'mcp-outbound' || selectedCategory === 'mcp-inbound' || selectedCategory === 'mcp-postgresql') && getMCPNodesByEcosystem('postgresql').length > 0 && (
                <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: MCP_ECOSYSTEMS.postgresql.color }}>
                      <span className="text-[9px] font-bold">PG</span>
                    </div>
                    🐘 PostgreSQL ({getMCPNodesByEcosystem('postgresql').filter(node => 
                      !searchTerm || 
                      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      node.description.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length})
                  </h4>
                  <div className="space-y-2">
                    {getMCPNodesByEcosystem('postgresql')
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
                            <span className="text-[9px] font-bold">PG</span>
                          </div>
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-gray-900 leading-tight">{node.name}</h5>
                            <p className="text-xs text-gray-600 leading-relaxed mt-1">{node.description}</p>
                            <Badge className="mt-2" variant="outline" style={{ borderColor: node.color, color: node.color }}>
                              {node.category === 'mcp-outbound' ? '📤 Outbound' : '📥 Inbound'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                </>
                )}

                {/* Telegram MCP */}
                {(selectedCategory === 'all' || selectedCategory === 'mcp-outbound' || selectedCategory === 'mcp-inbound' || selectedCategory === 'mcp-telegram') && getMCPNodesByEcosystem('telegram').length > 0 && (
                <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: MCP_ECOSYSTEMS.telegram.color }}
                    >
                      TG
                    </div>
                    <span style={{ color: MCP_ECOSYSTEMS.telegram.color }}>
                      {MCP_ECOSYSTEMS.telegram.name}
                    </span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {getMCPNodesByEcosystem('telegram').length} nodes
                    </Badge>
                  </h4>
                  <div className="space-y-2">
                    {getMCPNodesByEcosystem('telegram')
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
                            <span className="text-[9px] font-bold">TG</span>
                          </div>
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-gray-900 leading-tight">{node.name}</h5>
                            <p className="text-xs text-gray-600 leading-relaxed mt-1">{node.description}</p>
                            <Badge className="mt-2" variant="outline" style={{ borderColor: node.color, color: node.color }}>
                              {node.category === 'mcp-outbound' ? '📤 Outbound' : '📥 Inbound'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                </>
                )}

                {/* WhatsApp MCP */}
                {(selectedCategory === 'all' || selectedCategory === 'mcp-outbound' || selectedCategory === 'mcp-inbound' || selectedCategory === 'mcp-whatsapp') && getMCPNodesByEcosystem('whatsapp').length > 0 && (
                <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: MCP_ECOSYSTEMS.whatsapp.color }}
                    >
                      WA
                    </div>
                    <span style={{ color: MCP_ECOSYSTEMS.whatsapp.color }}>
                      {MCP_ECOSYSTEMS.whatsapp.name}
                    </span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {getMCPNodesByEcosystem('whatsapp').length} nodes
                    </Badge>
                  </h4>
                  <div className="space-y-2">
                    {getMCPNodesByEcosystem('whatsapp')
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
                            <span className="text-[9px] font-bold">WA</span>
                          </div>
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-gray-900 leading-tight">{node.name}</h5>
                            <p className="text-xs text-gray-600 leading-relaxed mt-1">{node.description}</p>
                            <Badge className="mt-2" variant="outline" style={{ borderColor: node.color, color: node.color }}>
                              {node.category === 'mcp-outbound' ? '📤 Outbound' : '📥 Inbound'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                </>
                )}

                {/* Twilio MCP */}
                {(selectedCategory === 'all' || selectedCategory === 'mcp-outbound' || selectedCategory === 'mcp-inbound' || selectedCategory === 'mcp-twilio') && getMCPNodesByEcosystem('twilio').length > 0 && (
                <>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: MCP_ECOSYSTEMS.twilio.color }}
                    >
                      TW
                    </div>
                    <span style={{ color: MCP_ECOSYSTEMS.twilio.color }}>
                      {MCP_ECOSYSTEMS.twilio.name}
                    </span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {getMCPNodesByEcosystem('twilio').length} nodes
                    </Badge>
                  </h4>
                  <div className="space-y-2">
                    {getMCPNodesByEcosystem('twilio')
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
                            <span className="text-[9px] font-bold">TW</span>
                          </div>
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-gray-900 leading-tight">{node.name}</h5>
                            <p className="text-xs text-gray-600 leading-relaxed mt-1">{node.description}</p>
                            <Badge className="mt-2" variant="outline" style={{ borderColor: node.color, color: node.color }}>
                              {node.category === 'mcp-outbound' ? '📤 Outbound' : '📥 Inbound'}
                            </Badge>
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
        <div className="flex-1 flex flex-col h-full">
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
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestRun}
                disabled={isTestRunning || nodes.length === 0}
                className="text-green-600 hover:text-green-700 hover:bg-green-50 disabled:opacity-50"
                title="Test workflow execution"
                data-testid="button-test-run"
              >
                <PlayCircle className="h-4 w-4" />
              </Button>
              
              <Separator orientation="vertical" className="h-6" />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAIDrawer(!showAIDrawer)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
                title="AI Workflow Assistant"
                data-testid="button-ai-assistant"
              >
                <Brain className="h-4 w-4 mr-2" />
                AI Assistant
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

        {/* Canvas Zone - Full Size with Flex */}
        <div className="flex-1 flex flex-col h-full">
          <div 
            ref={reactFlowWrapper}
            className="flex-1 relative"
            style={{ 
              backgroundColor: '#F9FAFB'
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
              style={{ width: '100%', height: '100%' }}
              data-testid="reactflow-canvas"
            >
              <Controls />
              <Background variant={BackgroundVariant.Dots} color="#94A3B8" gap={16} size={1} />
              <MiniMap 
                nodeColor={(node) => {
                  // WindTre color scheme for different node types
                  switch (node.type) {
                    case 'trigger': return '#10B981'; // green
                    case 'action': return '#FF6900'; // WindTre orange
                    case 'ai': return '#8B5CF6'; // purple
                    case 'routing': return '#3B82F6'; // blue
                    case 'flow-control': return '#F59E0B'; // amber
                    case 'mcp-outbound': return '#EC4899'; // pink
                    case 'mcp-inbound': return '#06B6D4'; // cyan
                    case 'w3-data': return '#14B8A6'; // teal
                    default: return '#6B7280'; // gray
                  }
                }}
                style={{
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                }}
                maskColor="rgba(249, 250, 251, 0.6)"
                data-testid="workflow-minimap"
              />
            </ReactFlow>
          </div>
        </div>
      </div>

      {/* 🤖 AI Assistant Dialog Modal - Redesigned for better UX */}
      <Dialog open={showAIDrawer} onOpenChange={setShowAIDrawer}>
        <DialogContent 
          className="max-w-4xl w-[90vw] h-[85vh] min-h-[600px] max-h-[900px] p-0 flex flex-col overflow-hidden"
        >
          <AIWorkflowChatModal
            onWorkflowGenerated={handleAIWorkflowGenerated}
          />
        </DialogContent>
      </Dialog>

      {/* ✅ NODE INSPECTOR - N8N-STYLE THREE-PANEL LAYOUT */}
      <NodeInspector 
        node={showConfigPanel && configNodeId ? nodes.find(n => n.id === configNodeId) || null : null}
        allNodes={nodes}
        edges={edges}
        isOpen={showConfigPanel}
        onClose={() => setShowConfigPanel(false)}
        onSave={(nodeId: string, config: any) => {
          // 💾 Update node data with new configuration
          setNodes((prevNodes: Node[]) => 
            prevNodes.map((node: Node) => 
              node.id === nodeId 
                ? { ...node, data: { ...node.data, config } }
                : node
            )
          );
          
          console.log('🎛️ Node config saved:', { nodeId, config });
        }}
        workflowId={templateId}
      />

      {/* 🧪 TEST RUN RESULTS POPUP - Advanced Debug View */}
      <WorkflowTestResultDialog
        result={testRunResult}
        open={testRunResult !== null}
        onOpenChange={(open) => !open && setTestRunResult(null)}
      />

      {/* 📝 WORKFLOW SETTINGS MODAL - Action Tags & Metadata */}
      <WorkflowSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSave={handleSettingsSave}
        mode={templateId && templateData ? 'edit' : 'create'}
        initialSettings={{
          name: templateData?.name || '',
          description: templateData?.description || '',
          category: templateData?.category || initialCategory || '',
          actionTags: templateData?.actionTags || [],
          customAction: templateData?.customAction || null
        }}
        isSaving={createTemplateMutation.isPending || updateTemplateMutation.isPending}
      />

        </div> {/* End Main Workflow Builder Container */}
      </div> {/* End Outer Container */}
    </>
  );
}

export default function WorkflowBuilder(props: WorkflowBuilderProps) {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderContent {...props} />
    </ReactFlowProvider>
  );
}
