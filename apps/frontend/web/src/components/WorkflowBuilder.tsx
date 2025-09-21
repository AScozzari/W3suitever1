import React, { useCallback, useState } from 'react';
import { 
  ReactFlow, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  Controls,
  Background,
  Node,
  Edge,
  Connection,
  NodeTypes
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Save, 
  Plus, 
  CheckCircle, 
  AlertCircle, 
  Users,
  Zap,
  ArrowDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Custom node types for workflow actions
const ActionNode = ({ data }: { data: any }) => (
  <div className="bg-white border-2 border-slate-200 rounded-lg p-4 shadow-md min-w-[200px]">
    <div className="flex items-center gap-2 mb-2">
      <div className={`w-3 h-3 rounded-full ${
        data.category === 'hr' ? 'bg-green-500' :
        data.category === 'finance' ? 'bg-blue-500' :
        data.category === 'operations' ? 'bg-orange-500' :
        data.category === 'it' ? 'bg-purple-500' :
        data.category === 'crm' ? 'bg-pink-500' :
        data.category === 'support' ? 'bg-yellow-500' : 'bg-slate-500'
      }`} />
      <span className="font-medium text-sm text-slate-700">{data.category.toUpperCase()}</span>
    </div>
    <div className="text-sm font-semibold text-slate-900 mb-1">
      {data.label}
    </div>
    <div className="text-xs text-slate-600">
      {data.description}
    </div>
    {data.approver && (
      <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
        <Users className="w-3 h-3" />
        {data.approver}
      </div>
    )}
  </div>
);

const StartNode = ({ data }: { data: any }) => (
  <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4 shadow-md">
    <div className="flex items-center gap-2">
      <Play className="w-4 h-4" />
      <span className="font-semibold">START</span>
    </div>
    <div className="text-xs mt-1 opacity-80">
      {data.label || 'Workflow Start'}
    </div>
  </div>
);

const EndNode = ({ data }: { data: any }) => (
  <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg p-4 shadow-md">
    <div className="flex items-center gap-2">
      <CheckCircle className="w-4 h-4" />
      <span className="font-semibold">END</span>
    </div>
    <div className="text-xs mt-1 opacity-80">
      {data.label || 'Workflow End'}
    </div>
  </div>
);

const DecisionNode = ({ data }: { data: any }) => (
  <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-lg p-4 shadow-md transform rotate-45">
    <div className="flex items-center gap-2 transform -rotate-45">
      <AlertCircle className="w-4 h-4" />
      <span className="font-semibold text-xs">DECISION</span>
    </div>
  </div>
);

// Define custom node types
const nodeTypes: NodeTypes = {
  action: ActionNode,
  start: StartNode,
  end: EndNode,
  decision: DecisionNode,
};

// Initial workflow nodes
const initialNodes: Node[] = [
  {
    id: 'start',
    type: 'start',
    position: { x: 100, y: 100 },
    data: { label: 'Workflow Start' }
  },
  {
    id: 'end',
    type: 'end', 
    position: { x: 100, y: 400 },
    data: { label: 'Workflow Complete' }
  }
];

const initialEdges: Edge[] = [];

interface WorkflowBuilderProps {
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  onRun?: (nodes: Node[], edges: Edge[]) => void;
}

export default function WorkflowBuilder({ onSave, onRun }: WorkflowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Add new action node to workflow
  const addActionNode = (actionData: any) => {
    const nodeId = `action_${Date.now()}`;
    const newNode: Node = {
      id: nodeId,
      type: 'action',
      position: { 
        x: Math.random() * 300 + 200, 
        y: Math.random() * 200 + 200 
      },
      data: actionData
    };
    
    setNodes((nds) => nds.concat(newNode));
    
    toast({
      title: "Action Added",
      description: `${actionData.label} added to workflow`,
    });
  };

  // Add decision node
  const addDecisionNode = () => {
    const nodeId = `decision_${Date.now()}`;
    const newNode: Node = {
      id: nodeId,
      type: 'decision',
      position: { 
        x: Math.random() * 300 + 200, 
        y: Math.random() * 200 + 200 
      },
      data: { label: 'Decision Point' }
    };
    
    setNodes((nds) => nds.concat(newNode));
  };

  // Save workflow
  const handleSave = () => {
    if (onSave) {
      onSave(nodes, edges);
    }
    
    toast({
      title: "Workflow Saved",
      description: "Your workflow has been saved successfully",
    });
  };

  // Run workflow simulation
  const handleRun = async () => {
    setIsRunning(true);
    
    if (onRun) {
      onRun(nodes, edges);
    }
    
    toast({
      title: "Workflow Started",
      description: "Running workflow simulation...",
    });
    
    // Simulate workflow execution
    setTimeout(() => {
      setIsRunning(false);
      toast({
        title: "Workflow Complete",
        description: "Workflow executed successfully",
      });
    }, 3000);
  };

  return (
    <div className="h-full w-full relative">
      {/* Workflow Canvas */}
      <div className="h-full w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Controls />
          <Background />
        </ReactFlow>
      </div>

      {/* Action Toolbar */}
      <div className="absolute top-4 left-4 flex gap-2 z-10">
        <Button
          onClick={handleSave}
          variant="outline"
          size="sm"
          data-testid="button-save-workflow"
        >
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
        
        <Button
          onClick={handleRun}
          disabled={isRunning}
          size="sm"
          data-testid="button-run-workflow"
        >
          <Play className="w-4 h-4 mr-2" />
          {isRunning ? 'Running...' : 'Run'}
        </Button>

        <Button
          onClick={addDecisionNode}
          variant="outline"
          size="sm"
          data-testid="button-add-decision"
        >
          <Plus className="w-4 h-4 mr-2" />
          Decision
        </Button>
      </div>

      {/* Quick Add Actions */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
        <Badge 
          className="cursor-pointer hover:bg-green-100 dark:hover:bg-green-900"
          onClick={() => addActionNode({
            category: 'hr',
            label: 'Approve Leave',
            description: 'hr.approve_vacation_max_5_days',
            approver: 'HR Manager'
          })}
          data-testid="quick-add-hr"
        >
          <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
          HR Approve
        </Badge>
        
        <Badge 
          className="cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900"
          onClick={() => addActionNode({
            category: 'finance',
            label: 'Approve Expense',
            description: 'finance.approve_expense_max_1000',
            approver: 'Finance Manager'
          })}
          data-testid="quick-add-finance"
        >
          <CheckCircle className="w-3 h-3 mr-1 text-blue-500" />
          Finance Approve
        </Badge>

        <Badge 
          className="cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900"
          onClick={() => addActionNode({
            category: 'operations',
            label: 'Send Notification',
            description: 'ops.send_notification_email',
            approver: 'Operations Team'
          })}
          data-testid="quick-add-ops"
        >
          <Zap className="w-3 h-3 mr-1 text-orange-500" />
          Ops Notify
        </Badge>
      </div>

      {/* Running Indicator */}
      {isRunning && (
        <div className="absolute inset-0 bg-black bg-opacity-10 flex items-center justify-center z-20">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin">
                <Zap className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <div className="font-semibold">Executing Workflow</div>
                <div className="text-sm text-slate-600">Processing approval chain...</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}