/**
 * 🎯 WORKFLOW AI NODE COMPONENT
 * Custom ReactFlow node per AI Nodes
 */

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain } from 'lucide-react';

interface AiNodeData {
  id: string;
  label: string;
  description: string;
  category: string;
  icon: string;
  config?: Record<string, any>;
}

export function WorkflowAiNode({ data, selected, id }: NodeProps<AiNodeData>) {
  return (
    <div className={`workflow-node ${selected ? 'selected' : ''}`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="handle-target"
        style={{ background: 'linear-gradient(135deg, #FF6900, #7B2CBF)' }}
      />
      
      <Card className={`min-w-[200px] windtre-glass-panel border-2 transition-all ${
        selected ? 'border-windtre-orange shadow-lg' : 'border-white/20 hover:border-windtre-orange/50'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-semibold drag-handle cursor-move bg-gradient-to-r from-windtre-orange to-windtre-purple">
              AI
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm truncate">{data.label}</h4>
              <p className="text-xs text-gray-600 truncate">{data.description}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs bg-gradient-to-r from-windtre-orange/10 to-windtre-purple/10">
              AI
            </Badge>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Brain className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="handle-source"
        style={{ background: 'linear-gradient(135deg, #FF6900, #7B2CBF)' }}
      />
    </div>
  );
}
