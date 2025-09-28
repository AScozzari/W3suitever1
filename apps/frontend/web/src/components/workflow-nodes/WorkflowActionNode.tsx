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
    <div style={{
      width: '300px',
      height: '150px',
      backgroundColor: '#FF0000',
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
      <div>🔴 ACTION: {data.name}</div>
    </div>
  );
}