import { useState, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Save, GitBranch, Info, RefreshCw, Zap, Play, X
} from 'lucide-react';

interface WorkflowBuilderTabProps {
  workflowActionsData: any[];
  workflowTriggersData: any[];
  templatesData: any[];
  loadingTemplates: boolean;
  selectedCategory: string;
  saveTemplateMutation: any;
}

export default function WorkflowBuilderTab({
  workflowActionsData,
  workflowTriggersData,
  templatesData,
  loadingTemplates,
  selectedCategory,
  saveTemplateMutation
}: WorkflowBuilderTabProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    description: '',
    category: 'hr',
    tags: [] as string[]
  });
  
  const { toast } = useToast();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowType = event.dataTransfer.getData('application/reactflow');
      if (!reactFlowType) return;

      const reactFlowBounds = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      let nodeData: any = {};
      let nodeType = 'default';
      
      if (reactFlowType === 'action') {
        const actionData = JSON.parse(event.dataTransfer.getData('actionData'));
        nodeData = { label: actionData.name, actionData };
        nodeType = 'action';
      } else if (reactFlowType === 'trigger') {
        const triggerData = JSON.parse(event.dataTransfer.getData('triggerData'));
        nodeData = { label: triggerData.name, triggerData };
        nodeType = 'trigger';
      }

      const newNode: Node = {
        id: `${reactFlowType}_${Date.now()}`,
        type: nodeType,
        position,
        data: nodeData,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const handleSaveTemplate = () => {
    const template = {
      name: templateFormData.name,
      description: templateFormData.description,
      category: templateFormData.category,
      templateType: 'custom',
      nodes: nodes, // Send as JSON object, not stringified
      edges: edges, // Send as JSON object, not stringified
      viewport: { x: 0, y: 0, zoom: 1 }, // Send as JSON object
      metadata: { tags: templateFormData.tags },
      isActive: true
      // Do NOT include tenantId - server derives from headers
    };
    saveTemplateMutation.mutate(template);
    setShowSaveTemplateModal(false);
    setTemplateFormData({ name: '', description: '', category: 'hr', tags: [] });
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 200px)' }}>
        {/* Action Library */}
        <div style={{
          flex: '0 0 250px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          padding: '16px',
          overflowY: 'auto'
        }}>
          {/* Template Selector */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: '0 0 12px' }}>
              Templates
            </h3>
            <div style={{ marginBottom: '12px' }}>
              <Button
                onClick={() => {
                  // Clear canvas for new workflow
                  setNodes([]);
                  setEdges([]);
                }}
                size="sm"
                variant="outline"
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Workflow
              </Button>
            </div>
            {loadingTemplates ? (
              <div className="space-y-2">
                {[1, 2].map(i => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {(templatesData || []).filter((t: any) => t.category === selectedCategory).map((template: any) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      // Load template nodes and edges - they should already be JSON objects
                      try {
                        setNodes(template.nodes || []);
                        setEdges(template.edges || []);
                        toast({
                          title: 'Template Loaded',
                          description: `Loaded "${template.name}" template`,
                        });
                      } catch (error) {
                        console.error('Failed to load template:', error);
                        toast({
                          title: 'Error Loading Template',
                          description: 'Failed to parse template data',
                          variant: 'destructive'
                        });
                      }
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="text-xs font-medium">{template.name}</div>
                    <div className="text-xs text-muted-foreground">{template.templateType}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: '0 0 16px' }}>
            Actions Library
          </h3>

          {/* Actions */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', margin: '0 0 8px' }}>
              Actions
            </h4>
            {(workflowActionsData || []).map((action: any) => (
              <div
                key={action.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/reactflow', 'action');
                  e.dataTransfer.setData('actionData', JSON.stringify(action));
                }}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255, 105, 0, 0.1)',
                  border: '1px solid rgba(255, 105, 0, 0.2)',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  cursor: 'move',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Zap size={14} />
                {action.name}
              </div>
            ))}
          </div>

          {/* Triggers */}
          <div>
            <h4 style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', margin: '0 0 8px' }}>
              Triggers
            </h4>
            {(workflowTriggersData || []).map((trigger: any) => (
              <div
                key={trigger.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/reactflow', 'trigger');
                  e.dataTransfer.setData('triggerData', JSON.stringify(trigger));
                }}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(123, 44, 191, 0.1)',
                  border: '1px solid rgba(123, 44, 191, 0.2)',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  cursor: 'move',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Play size={14} />
                {trigger.name}
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div style={{
          flex: 1,
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          overflow: 'hidden'
        }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
          
          {/* Save Button */}
          <button
            onClick={() => setShowSaveTemplateModal(true)}
            style={{
              position: 'absolute',
              bottom: '20px',
              right: '20px',
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
            data-testid="save-workflow"
          >
            <Save size={16} />
            Save Workflow
          </button>
        </div>

        {/* Properties Panel */}
        {selectedNode && (
          <div style={{
            flex: '0 0 300px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            padding: '16px',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>
                Node Properties
              </h3>
              <button
                onClick={() => setSelectedNode(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                  Node ID
                </label>
                <input
                  type="text"
                  value={selectedNode.id}
                  disabled
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    color: '#6b7280',
                    fontSize: '12px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                  Team Assignment
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#111827',
                    fontSize: '12px'
                  }}
                >
                  <option value="">Auto-assign</option>
                </select>
              </div>
              
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                  SLA (hours)
                </label>
                <input
                  type="number"
                  placeholder="24"
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#111827',
                    fontSize: '12px'
                  }}
                />
              </div>
              
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                  Conditions
                </label>
                <textarea
                  placeholder="JSON conditions..."
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#111827',
                    fontSize: '12px',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-orange-500" />
                  Save Workflow Template
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Save your workflow design as a reusable template
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="templateName">Template Name*</Label>
                  <Input
                    id="templateName"
                    value={templateFormData.name}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                    placeholder="e.g., Leave Request Approval"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="templateDescription">Description</Label>
                  <Textarea
                    id="templateDescription"
                    value={templateFormData.description}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
                    placeholder="Describe what this workflow does and when to use it"
                    className="mt-2 h-24"
                  />
                </div>

                <div>
                  <Label htmlFor="templateCategory">Category*</Label>
                  <select
                    id="templateCategory"
                    value={templateFormData.category}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, category: e.target.value })}
                    className="mt-2 w-full px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="hr">HR</option>
                    <option value="finance">Finance</option>
                    <option value="operations">Operations</option>
                    <option value="crm">CRM</option>
                    <option value="support">Support</option>
                    <option value="sales">Sales</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="templateTags">Tags (comma-separated)</Label>
                  <Input
                    id="templateTags"
                    placeholder="e.g., approval, leave, hr"
                    onChange={(e) => setTemplateFormData({ 
                      ...templateFormData, 
                      tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) 
                    })}
                    className="mt-2"
                  />
                </div>

                <div className="bg-muted/30 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Info className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Workflow Summary</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    <p>• {nodes.length} nodes configured</p>
                    <p>• {edges.length} connections</p>
                    <p>• Category: {templateFormData.category}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSaveTemplateModal(false);
                    setTemplateFormData({ name: '', description: '', category: 'hr', tags: [] });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveTemplate}
                  disabled={!templateFormData.name || saveTemplateMutation.isPending}
                  className="bg-gradient-to-r from-orange-500 to-purple-600"
                >
                  {saveTemplateMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Template
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}