/**
 * 🎯 WORKFLOW TRIGGER NODE COMPONENT
 * Custom ReactFlow node per Triggers
 */

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';

interface TriggerNodeData {
  id: string;
  label: string;
  description: string;
  category: string;
  icon: string;
  config?: Record<string, any>;
}

export function WorkflowTriggerNode({ data, selected, id }: NodeProps<TriggerNodeData>) {
  return (
    <div className={`workflow-node ${selected ? 'selected' : ''}`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="handle-target"
        style={{ background: '#3b82f6' }}
      />
      
      <Card className={`min-w-[200px] windtre-glass-panel border-2 transition-all ${
        selected ? 'border-blue-500 shadow-lg' : 'border-white/20 hover:border-blue-500/50'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-semibold drag-handle cursor-move bg-blue-500">
              <Zap className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm truncate">{data.label}</h4>
              <p className="text-xs text-gray-600 truncate">{data.description}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs bg-blue-500/10">
              Trigger
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="handle-source"
        style={{ background: '#3b82f6' }}
      />
    </div>
  );
}
