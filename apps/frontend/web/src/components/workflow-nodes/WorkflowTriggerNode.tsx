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
  console.log('🎯 TRIGGER NODE RENDERING:', data.name);
  return (
    <div style={{
      width: '300px',
      height: '150px',
      backgroundColor: '#0000FF',
      border: '5px solid #000000',
      borderRadius: '8px',
      padding: '20px',
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      zIndex: 1000,
      boxShadow: '0px 10px 30px rgba(0,0,0,0.5)'
    }}>
      <div>🔵 TRIGGER: {data.name}</div>
    </div>
  );
}