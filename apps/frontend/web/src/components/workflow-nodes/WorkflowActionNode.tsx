/**
 * 🎯 WORKFLOW ACTION NODE COMPONENT
 * Custom ReactFlow node per Actions
 */

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, Play } from 'lucide-react';

interface ActionNodeData {
  id: string;
  name: string;
  description: string;
  category: string;
  color: string;
  config?: Record<string, any>;
}

export function WorkflowActionNode({ data, selected }: NodeProps<ActionNodeData>) {
  return (
    <div className="workflow-node" style={{
      width: 180,
      height: 80,
      background: 'white',
      border: '2px solid #FF6900',
      borderRadius: '8px',
      padding: '12px',
      fontSize: '14px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      position: 'relative'
    }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#FF6900' }}
      />
      <div style={{ fontWeight: 600, color: '#374151' }}>
        {data.name || 'Action Node'}
      </div>
      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
        {data.description || 'Workflow action'}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#FF6900' }}
      />
    </div>
  );
}