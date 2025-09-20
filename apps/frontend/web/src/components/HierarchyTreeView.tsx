import { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, User, Users, UserPlus, Trash2, Edit2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface HierarchyNode {
  id: string;
  name: string;
  type: 'position' | 'department' | 'team';
  parentId: string | null;
  level: number;
  metadata: {
    roleId?: string;
    employeeCount?: number;
    managerName?: string;
    description?: string;
  };
  children: HierarchyNode[];
}

interface HierarchyTreeViewProps {
  data: HierarchyNode[];
  onNodeSelect?: (node: HierarchyNode) => void;
  onNodeAdd?: (parentId: string | null) => void;
  onNodeEdit?: (node: HierarchyNode) => void;
  onNodeDelete?: (nodeId: string) => void;
  selectedNodeId?: string | null;
}

function TreeNode({ 
  node, 
  onNodeSelect, 
  onNodeAdd, 
  onNodeEdit, 
  onNodeDelete,
  selectedNodeId,
  depth = 0 
}: {
  node: HierarchyNode;
  onNodeSelect?: (node: HierarchyNode) => void;
  onNodeAdd?: (parentId: string | null) => void;
  onNodeEdit?: (node: HierarchyNode) => void;
  onNodeDelete?: (nodeId: string) => void;
  selectedNodeId?: string | null;
  depth?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNodeId === node.id;

  const getNodeIcon = () => {
    switch (node.type) {
      case 'department':
        return <Users size={16} className="text-blue-500" />;
      case 'team':
        return <Users size={16} className="text-green-500" />;
      default:
        return <User size={16} className="text-gray-500" />;
    }
  };

  const getNodeColor = () => {
    switch (node.type) {
      case 'department':
        return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800';
      case 'team':
        return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800';
      default:
        return 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800';
    }
  };

  return (
    <div className="select-none">
      <div
        className={`
          group flex items-center gap-2 p-2 rounded-lg cursor-pointer
          transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800
          ${isSelected ? 'bg-orange-50 dark:bg-orange-950 ring-1 ring-orange-300 dark:ring-orange-700' : ''}
        `}
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
        onClick={() => onNodeSelect?.(node)}
        data-testid={`hierarchy-node-${node.id}`}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            data-testid={`hierarchy-expand-${node.id}`}
          >
            {isExpanded ? (
              <ChevronDown size={16} className="text-gray-500" />
            ) : (
              <ChevronRight size={16} className="text-gray-500" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-5" />}
        
        <div className={`flex-1 flex items-center gap-3 p-2 rounded-md border ${getNodeColor()}`}>
          {getNodeIcon()}
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{node.name}</span>
              <Badge variant="outline" className="text-xs">
                {node.type === 'department' ? 'Dipartimento' : 
                 node.type === 'team' ? 'Team' : 'Posizione'}
              </Badge>
              {node.metadata.employeeCount && node.metadata.employeeCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {node.metadata.employeeCount} {node.metadata.employeeCount === 1 ? 'persona' : 'persone'}
                </Badge>
              )}
            </div>
            {node.metadata.managerName && (
              <div className="text-xs text-gray-500 mt-0.5">
                Manager: {node.metadata.managerName}
              </div>
            )}
            {node.metadata.description && (
              <div className="text-xs text-gray-400 mt-0.5">
                {node.metadata.description}
              </div>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`hierarchy-menu-${node.id}`}
              >
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onNodeAdd?.(node.id)}>
                <UserPlus size={14} className="mr-2" />
                Aggiungi Sotto-nodo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNodeEdit?.(node)}>
                <Edit2 size={14} className="mr-2" />
                Modifica
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onNodeDelete?.(node.id)}
                className="text-red-600 dark:text-red-400"
              >
                <Trash2 size={14} className="mr-2" />
                Elimina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {isExpanded && hasChildren && (
        <div className="ml-3 border-l-2 border-gray-200 dark:border-gray-700">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              onNodeSelect={onNodeSelect}
              onNodeAdd={onNodeAdd}
              onNodeEdit={onNodeEdit}
              onNodeDelete={onNodeDelete}
              selectedNodeId={selectedNodeId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function HierarchyTreeView({
  data,
  onNodeSelect,
  onNodeAdd,
  onNodeEdit,
  onNodeDelete,
  selectedNodeId
}: HierarchyTreeViewProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <Users size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          Nessuna struttura gerarchica definita
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Inizia creando il nodo radice dell'organigramma
        </p>
        <Button
          onClick={() => onNodeAdd?.(null)}
          className="mt-4"
          data-testid="hierarchy-create-root"
        >
          <UserPlus size={16} className="mr-2" />
          Crea Nodo Radice
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="space-y-1">
        {data.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            onNodeSelect={onNodeSelect}
            onNodeAdd={onNodeAdd}
            onNodeEdit={onNodeEdit}
            onNodeDelete={onNodeDelete}
            selectedNodeId={selectedNodeId}
          />
        ))}
      </div>
    </div>
  );
}

export default HierarchyTreeView;