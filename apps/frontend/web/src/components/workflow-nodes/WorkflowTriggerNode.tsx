/**
 * 🎯 WORKFLOW TRIGGER NODE COMPONENT
 * Custom ReactFlow node per Triggers
 */

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, Zap } from 'lucide-react';

interface TriggerNodeData {
  id: string;
  name: string;
  description: string;
  category: string;
  color: string;
  config?: Record<string, any>;
}

export function WorkflowTriggerNode({ data, selected }: NodeProps<TriggerNodeData>) {
  console.log('🔍 DEBUG STEP 2: WorkflowTriggerNode rendering with data:', data);
  return (
    <div className={`workflow-node ${selected ? 'selected' : ''}`}>
      <Card className={`min-w-[200px] windtre-glass-panel border-2 transition-all ${
        selected ? 'border-windtre-purple shadow-lg' : 'border-white/20 hover:border-windtre-purple/50'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-semibold drag-handle cursor-move"
              style={{ backgroundColor: data.color }}
            >
              T
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm truncate">{data.name}</h4>
              <p className="text-xs text-gray-600 truncate">{data.description}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              Trigger
            </Badge>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Settings className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Zap className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="handle-source"
        style={{ background: data.color }}
      />
    </div>
  );
}