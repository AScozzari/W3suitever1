/**
 * 🎯 WORKFLOW ROUTING NODE COMPONENT
 * Custom ReactFlow node per Routing (Team/User Assignment)
 */

import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck } from 'lucide-react';

interface RoutingNodeData {
  id: string;
  name: string;
  description: string;
  category: string;
  color: string;
  config?: Record<string, any>;
}

export function WorkflowRoutingNode({ data, selected }: NodeProps<RoutingNodeData>) {
  const isTeamAssignment = data.id === 'team-assignment';
  const Icon = isTeamAssignment ? Users : UserCheck;
  
  return (
    <div className={`workflow-node ${selected ? 'selected' : ''}`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="handle-target"
        style={{ background: data.color }}
      />
      
      <Card className={`min-w-[200px] windtre-glass-panel border-2 transition-all ${
        selected ? 'border-windtre-purple shadow-lg' : 'border-white/20 hover:border-windtre-purple/50'
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
            <Badge variant="outline" className="text-xs bg-windtre-purple/10 border-windtre-purple/30">
              Routing
            </Badge>
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
