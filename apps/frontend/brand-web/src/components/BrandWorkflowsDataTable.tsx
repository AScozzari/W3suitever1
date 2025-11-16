/**
 * 📊 BRAND WORKFLOWS DATA TABLE
 * 
 * DataTable identica a W3 Suite TasksDataTable per visualizzare workflow templates
 * Features: Sorting, Status badges, Category badges, Shortcut action icons
 */

import { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { 
  Edit, 
  Trash2, 
  Copy, 
  Download,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  GitBranch
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface BrandWorkflow {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  version: string;
  status: 'active' | 'draft' | 'archived';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface BrandWorkflowsDataTableProps {
  workflows: BrandWorkflow[];
  onEdit?: (workflowId: string) => void;
  onDelete?: (workflowId: string) => void;
  onDuplicate?: (workflowId: string) => void;
  onExport?: (workflowId: string) => void;
  className?: string;
}

type SortField = 'name' | 'code' | 'category' | 'version' | 'status' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

// Category color mapping
const categoryColors: Record<string, string> = {
  crm: 'bg-blue-100 text-blue-800 border-blue-200',
  wms: 'bg-green-100 text-green-800 border-green-200',
  hr: 'bg-purple-100 text-purple-800 border-purple-200',
  operations: 'bg-orange-100 text-orange-800 border-orange-200',
  finance: 'bg-yellow-100 text-yellow-800 border-yellow-200'
};

// Status config
const statusConfig = {
  active: {
    label: 'Attivo',
    color: 'text-green-700',
    bg: 'bg-green-50 border-green-200'
  },
  draft: {
    label: 'Bozza',
    color: 'text-gray-700',
    bg: 'bg-gray-50 border-gray-200'
  },
  archived: {
    label: 'Archiviato',
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200'
  }
};

export function BrandWorkflowsDataTable({
  workflows,
  onEdit,
  onDelete,
  onDuplicate,
  onExport,
  className
}: BrandWorkflowsDataTableProps) {
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedWorkflows = [...workflows].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === 'updatedAt' || sortField === 'name' || sortField === 'code') {
      aValue = aValue?.toLowerCase() || '';
      bValue = bValue?.toLowerCase() || '';
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="ml-2 h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-2 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4" />
    );
  };

  if (workflows.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border border-dashed border-gray-300 rounded-lg windtre-glass-panel">
        <div className="text-center">
          <GitBranch className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-500 font-medium">Nessun workflow disponibile</p>
          <p className="text-sm text-gray-400 mt-1">Crea il tuo primo workflow template</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-md border border-gray-200 bg-white overflow-hidden', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[280px]">
              <Button
                variant="ghost"
                onClick={() => handleSort('name')}
                className="h-auto p-0 hover:bg-transparent font-semibold"
                data-testid="sort-name"
              >
                Nome Workflow
                <SortIcon field="name" />
              </Button>
            </TableHead>
            <TableHead className="w-[160px]">
              <Button
                variant="ghost"
                onClick={() => handleSort('code')}
                className="h-auto p-0 hover:bg-transparent font-semibold"
                data-testid="sort-code"
              >
                Codice
                <SortIcon field="code" />
              </Button>
            </TableHead>
            <TableHead className="w-[140px] text-center">
              <Button
                variant="ghost"
                onClick={() => handleSort('category')}
                className="h-auto p-0 hover:bg-transparent font-semibold mx-auto"
                data-testid="sort-category"
              >
                Categoria
                <SortIcon field="category" />
              </Button>
            </TableHead>
            <TableHead className="w-[100px] text-center">
              <Button
                variant="ghost"
                onClick={() => handleSort('version')}
                className="h-auto p-0 hover:bg-transparent font-semibold mx-auto"
                data-testid="sort-version"
              >
                Versione
                <SortIcon field="version" />
              </Button>
            </TableHead>
            <TableHead className="w-[120px] text-center">
              <Button
                variant="ghost"
                onClick={() => handleSort('status')}
                className="h-auto p-0 hover:bg-transparent font-semibold mx-auto"
                data-testid="sort-status"
              >
                Stato
                <SortIcon field="status" />
              </Button>
            </TableHead>
            <TableHead className="w-[160px] text-center">
              <Button
                variant="ghost"
                onClick={() => handleSort('updatedAt')}
                className="h-auto p-0 hover:bg-transparent font-semibold mx-auto"
                data-testid="sort-updatedAt"
              >
                Ultimo Aggiornamento
                <SortIcon field="updatedAt" />
              </Button>
            </TableHead>
            {(onEdit || onDelete || onDuplicate || onExport) && (
              <TableHead className="w-32 text-center">
                <span className="font-semibold">Azioni</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedWorkflows.map((workflow) => {
            const statusInfo = statusConfig[workflow.status];
            const categoryColor = categoryColors[workflow.category] || 'bg-gray-100 text-gray-800 border-gray-200';
            
            return (
              <TableRow
                key={workflow.id}
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                data-testid={`row-workflow-${workflow.id}`}
              >
                <TableCell className="font-medium">
                  <div>
                    <div className="text-gray-900 font-semibold">{workflow.name}</div>
                    {workflow.description && (
                      <div className="text-sm text-gray-500 line-clamp-1 mt-1">
                        {workflow.description}
                      </div>
                    )}
                    {workflow.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {workflow.tags.slice(0, 3).map((tag, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-xs bg-gray-50 text-gray-600 border-gray-200"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {workflow.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200">
                            +{workflow.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">
                    {workflow.code}
                  </code>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant="outline"
                    className={cn('whitespace-nowrap uppercase text-xs', categoryColor)}
                    data-testid={`badge-category-${workflow.id}`}
                  >
                    {workflow.category}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm font-mono text-gray-600">{workflow.version}</span>
                </TableCell>
                <TableCell className="text-center">
                  <Badge 
                    variant="outline" 
                    className={cn('whitespace-nowrap', statusInfo.bg, statusInfo.color)}
                    data-testid={`badge-status-${workflow.id}`}
                  >
                    {statusInfo.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm text-gray-600">
                    {formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true, locale: it })}
                  </span>
                </TableCell>
                {(onEdit || onDelete || onDuplicate || onExport) && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <TooltipProvider>
                      <div className="flex items-center justify-center gap-1">
                        {onEdit && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit(workflow.id)}
                                className="h-10 w-10 p-0 hover:bg-orange-100 text-orange-600"
                                data-testid={`button-edit-workflow-${workflow.id}`}
                              >
                                <Edit className="h-6 w-6" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Modifica workflow</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {onDuplicate && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDuplicate(workflow.id)}
                                className="h-10 w-10 p-0 hover:bg-blue-100 text-blue-600"
                                data-testid={`button-duplicate-workflow-${workflow.id}`}
                              >
                                <Copy className="h-6 w-6" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Duplica workflow</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {onExport && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onExport(workflow.id)}
                                className="h-10 w-10 p-0 hover:bg-green-100 text-green-600"
                                data-testid={`button-export-workflow-${workflow.id}`}
                              >
                                <Download className="h-6 w-6" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Esporta workflow</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {onDelete && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete(workflow.id)}
                                className="h-10 w-10 p-0 hover:bg-red-100 text-red-600"
                                data-testid={`button-delete-workflow-${workflow.id}`}
                              >
                                <Trash2 className="h-6 w-6" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Elimina workflow</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TooltipProvider>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
