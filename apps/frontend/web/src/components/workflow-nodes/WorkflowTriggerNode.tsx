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
    <div style={{
      width: '200px',
      height: '100px',
      backgroundColor: 'blue',
      border: '3px solid black',
      borderRadius: '8px',
      padding: '10px',
      color: 'white',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      zIndex: 10
    }}>
      <div>TRIGGER: {data.name}</div>
    </div>
  );
}