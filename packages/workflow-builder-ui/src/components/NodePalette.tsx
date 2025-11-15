/**
 * 🎯 NODE PALETTE COMPONENT
 * 
 * Draggable palette of workflow nodes organized by category.
 * Used in Brand Interface for creating new workflows.
 */

import { NODE_PALETTE } from '../utils/nodeTypes';
import type { NodePaletteItem } from '../types';

interface NodePaletteProps {
  onNodeSelect?: (node: NodePaletteItem) => void;
  disabled?: boolean;
  className?: string;
}

export function NodePalette({ onNodeSelect, disabled = false, className = '' }: NodePaletteProps) {
  const handleNodeClick = (node: NodePaletteItem) => {
    if (disabled) return;
    onNodeSelect?.(node);
  };

  return (
    <div className={`workflow-node-palette ${className}`}>
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Workflow Nodes</h3>
        <p className="text-xs text-gray-500 mt-1">
          Drag nodes onto the canvas
        </p>
      </div>

      <div className="overflow-y-auto p-3 space-y-4">
        {NODE_PALETTE.map((category) => (
          <div key={category.id} className="space-y-2">
            <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
              {category.label}
            </h4>
            
            <div className="space-y-1">
              {category.nodes.map((node) => (
                <button
                  key={`${node.type}-${node.executorId || node.label}`}
                  onClick={() => handleNodeClick(node)}
                  disabled={disabled}
                  draggable={!disabled}
                  className={`
                    w-full text-left px-3 py-2 rounded border
                    transition-colors duration-150
                    ${disabled 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white hover:bg-blue-50 hover:border-blue-300 cursor-grab active:cursor-grabbing'
                    }
                  `}
                >
                  <div className="flex items-start gap-2">
                    <div className="text-base mt-0.5">
                      {node.icon || '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {node.label}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {node.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
