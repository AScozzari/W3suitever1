/**
 * 🎯 WORKFLOW FLOW CONTROL NODE COMPONENT  
 * Custom ReactFlow node per Flow Control (IF, Switch, Loop, Parallel)
 */

import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch, Split, RotateCw, GitMerge, Merge } from 'lucide-react';

interface FlowControlNodeData {
  id: string;
  name: string;
  description: string;
  category: string;
  color: string;
  config?: Record<string, any>;
}

const FLOW_ICONS: Record<string, any> = {
  'if-condition': GitBranch,
  'switch-case': Split,
  'while-loop': RotateCw,
  'parallel-fork': GitMerge,
  'join-sync': Merge
};

export function WorkflowFlowControlNode({ data, selected }: NodeProps<FlowControlNodeData>) {
  const Icon = FLOW_ICONS[data.id] || GitBranch;
  
  // IF e Switch hanno handle multipli per branches
  const hasMultipleOutputs = data.id === 'if-condition' || data.id === 'switch-case';
  
  return (
    <div className={`workflow-node ${selected ? 'selected' : ''}`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="handle-target"
        style={{ background: data.color }}
      />
      
      <Card className={`min-w-[200px] windtre-glass-panel border-2 transition-all ${
        selected ? 'border-windtre-orange shadow-lg' : 'border-white/20 hover:border-windtre-orange/50'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-semibold drag-handle cursor-move" style={{ background: data.color }}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm truncate">{data.name}</h4>
              <p className="text-xs text-gray-600 truncate">{data.description}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs bg-windtre-orange/10 border-windtre-orange/30">
              Flow Control
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      {/* Multiple handles for branching nodes */}
      {hasMultipleOutputs ? (
        <>
          <Handle 
            type="source" 
            position={Position.Bottom} 
            id="true"
            className="handle-source"
            style={{ background: '#22c55e', left: '30%' }}
          />
          <Handle 
            type="source" 
            position={Position.Bottom} 
            id="false"
            className="handle-source"
            style={{ background: '#ef4444', left: '70%' }}
          />
        </>
      ) : (
        <Handle 
          type="source" 
          position={Position.Bottom} 
          className="handle-source"
          style={{ background: data.color }}
        />
      )}
    </div>
  );
}
