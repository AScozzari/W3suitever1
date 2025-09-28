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
  return (
    <div className="workflow-node" style={{
      width: 180,
      height: 80,
      background: 'white',
      border: '2px solid #7B2CBF',
      borderRadius: '8px',
      padding: '12px',
      fontSize: '14px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      position: 'relative'
    }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#7B2CBF' }}
      />
      <div style={{ fontWeight: 600, color: '#374151' }}>
        {data.name || 'Trigger Node'}
      </div>
      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
        {data.description || 'Workflow trigger'}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#7B2CBF' }}
      />
    </div>
  );
}