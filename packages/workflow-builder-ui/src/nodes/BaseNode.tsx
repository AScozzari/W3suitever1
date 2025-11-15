/**
 * 🎯 BASE WORKFLOW NODE COMPONENT
 * 
 * Base component for all workflow nodes with common UI structure.
 * Supports locked mode for tenant apps.
 */

import { Handle, Position, NodeProps } from '@xyflow/react';
import type { WorkflowNodeData } from '../types';

interface BaseNodeProps extends NodeProps {
  data: WorkflowNodeData & { readOnly?: boolean };
  icon?: string;
  color?: string;
  showConfig?: boolean;
}

export function BaseNode({ 
  data, 
  icon = '📦', 
  color = 'blue',
  showConfig = false,
  selected 
}: BaseNodeProps) {
  const isLocked = data.locked || data.readOnly || false;
  
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-300 text-blue-900',
    green: 'bg-green-50 border-green-300 text-green-900',
    purple: 'bg-purple-50 border-purple-300 text-purple-900',
    orange: 'bg-orange-50 border-orange-300 text-orange-900',
    red: 'bg-red-50 border-red-300 text-red-900',
    gray: 'bg-gray-50 border-gray-300 text-gray-900'
  };

  return (
    <div 
      className={`
        px-4 py-3 rounded-lg border-2 min-w-[180px]
        ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        ${isLocked ? 'opacity-75' : ''}
        transition-all duration-150
      `}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 !bg-gray-400"
        isConnectable={!isLocked}
        style={{ 
          opacity: isLocked ? 0.3 : 1,
          cursor: isLocked ? 'not-allowed' : 'crosshair'
        }}
      />
      
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <div className="flex-1">
          <div className="font-medium text-sm">{data.label}</div>
          {data.description && (
            <div className="text-xs opacity-70 mt-0.5">{data.description}</div>
          )}
        </div>
        {isLocked && (
          <span className="text-sm">🔒</span>
        )}
      </div>

      {showConfig && data.config && Object.keys(data.config).length > 0 && (
        <div className="mt-2 pt-2 border-t border-current/20 text-xs space-y-1">
          {Object.entries(data.config).slice(0, 2).map(([key, value]) => (
            <div key={key} className="truncate opacity-70">
              <span className="font-medium">{key}:</span> {String(value)}
            </div>
          ))}
        </div>
      )}
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 !bg-gray-400"
        isConnectable={!isLocked}
        style={{ 
          opacity: isLocked ? 0.3 : 1,
          cursor: isLocked ? 'not-allowed' : 'crosshair'
        }}
      />
    </div>
  );
}
