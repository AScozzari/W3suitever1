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
  console.log('🔍 DEBUG STEP 2: WorkflowActionNode rendering with data:', data);
  return (
    <div style={{
      width: '200px',
      height: '100px',
      backgroundColor: 'red',
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
      <div>ACTION: {data.name}</div>
    </div>
  );
}