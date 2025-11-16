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
  label: string;
  description: string;
  category: string;
  icon: string;
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
  const color = '#6b7280';
  
  // Render handles based on node type
  const renderHandles = () => {
    switch (data.id) {
      case 'if-condition':
        // IF: true/false paths
        return (
          <>
            <Handle 
              type="source" 
              position={Position.Bottom} 
              id="true"
              className="handle-source"
              style={{ background: '#22c55e', left: '30%' }}
              data-testid="handle-if-true"
            />
            <Handle 
              type="source" 
              position={Position.Bottom} 
              id="false"
              className="handle-source"
              style={{ background: '#ef4444', left: '70%' }}
              data-testid="handle-if-false"
            />
          </>
        );
      
      case 'switch-case':
        // SWITCH: Multiple case handles + default
        const cases = data.config?.cases || [];
        const totalHandles = cases.length + 1; // cases + default
        return (
          <>
            {cases.map((caseItem: any, index: number) => (
              <Handle
                key={`case-${caseItem.value}`}
                type="source"
                position={Position.Bottom}
                id={`case-${caseItem.value}`}
                className="handle-source"
                style={{ 
                  background: color,
                  left: `${((index + 1) / (totalHandles + 1)) * 100}%`
                }}
                data-testid={`handle-case-${caseItem.value}`}
              />
            ))}
            <Handle
              type="source"
              position={Position.Bottom}
              id="default"
              className="handle-source"
              style={{ 
                background: '#6b7280',
                left: `${((totalHandles) / (totalHandles + 1)) * 100}%`
              }}
              data-testid="handle-switch-default"
            />
          </>
        );
      
      case 'while-loop':
        // WHILE: continue (loop) + exit paths
        return (
          <>
            <Handle 
              type="source" 
              position={Position.Bottom} 
              id="continue"
              className="handle-source"
              style={{ background: '#3b82f6', left: '30%' }}
              data-testid="handle-loop-continue"
            />
            <Handle 
              type="source" 
              position={Position.Bottom} 
              id="exit"
              className="handle-source"
              style={{ background: '#10b981', left: '70%' }}
              data-testid="handle-loop-exit"
            />
          </>
        );
      
      case 'parallel-fork':
        // PARALLEL: Multiple branch handles
        const branches = data.config?.branches || [];
        return (
          <>
            {branches.map((branch: any, index: number) => (
              <Handle
                key={`branch-${index}`}
                type="source"
                position={Position.Bottom}
                id={`branch-${index}`}
                className="handle-source"
                style={{ 
                  background: color,
                  left: `${((index + 1) / (branches.length + 1)) * 100}%`
                }}
                data-testid={`handle-parallel-branch-${index}`}
              />
            ))}
          </>
        );
      
      case 'join-sync':
        // JOIN: Single output after sync
        return (
          <Handle 
            type="source" 
            position={Position.Bottom} 
            className="handle-source"
            style={{ background: color }}
            data-testid="handle-join-output"
          />
        );
      
      default:
        return (
          <Handle 
            type="source" 
            position={Position.Bottom} 
            className="handle-source"
            style={{ background: color }}
          />
        );
    }
  };
  
  return (
    <div className={`workflow-node ${selected ? 'selected' : ''}`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="handle-target"
        style={{ background: color }}
        data-testid={`handle-${data.id}-input`}
      />
      
      <Card className={`min-w-[200px] windtre-glass-panel border-2 transition-all ${
        selected ? 'border-gray-500 shadow-lg' : 'border-white/20 hover:border-gray-500/50'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-semibold drag-handle cursor-move bg-gray-500">
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm truncate">{data.label}</h4>
              <p className="text-xs text-gray-600 truncate">{data.description}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs bg-gray-500/10 border-gray-500/30">
              Flow Control
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      {renderHandles()}
    </div>
  );
}
