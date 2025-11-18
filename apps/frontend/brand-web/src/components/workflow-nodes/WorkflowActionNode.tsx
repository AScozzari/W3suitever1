/**
 * 🎯 WORKFLOW ACTION NODE COMPONENT
 * Custom ReactFlow node per Actions
 */

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Play } from 'lucide-react';
import { BaseNodeDefinition } from '../../types/workflow-nodes';

export function WorkflowActionNode({ data, selected, id }: NodeProps<BaseNodeDefinition>) {
  return (
    <div className={`workflow-node ${selected ? 'selected' : ''}`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="handle-target"
        style={{ background: '#22c55e' }}
      />
      
      <Card className={`min-w-[200px] windtre-glass-panel border-2 transition-all ${
        selected ? 'border-green-500 shadow-lg' : 'border-white/20 hover:border-green-500/50'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-semibold drag-handle cursor-move bg-green-500">
              <Play className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm truncate">{data.name}</h4>
              <p className="text-xs text-gray-600 truncate">{data.description}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs bg-green-500/10">
              Action
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="handle-source"
        style={{ background: '#22c55e' }}
      />
    </div>
  );
}
