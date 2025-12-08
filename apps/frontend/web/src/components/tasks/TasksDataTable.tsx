import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { PriorityUrgencyBadge } from './PriorityUrgencyBadge';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Archive,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Pencil,
  Trash2,
  UserCheck,
  Play,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: 'low' | 'medium' | 'high';
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: Date | string | null;
  createdAt: Date | string;
  assignees?: Array<{ id: string; name: string; role: string }>;
  watchers?: Array<{ id: string; name: string }>;
  createdBy?: { id: string; name: string };
  tags?: string[];
  checklistProgress?: { completed: number; total: number };
}

interface TaskWithRole extends Task {
  userRole: 'assignee' | 'creator' | 'watcher' | 'none';
}

export interface TasksDataTableProps {
  tasks: Task[];
  currentUserId: string;
  onTaskClick?: (task: Task) => void;
  className?: string;
  selectedTaskIds?: string[];
  onSelectionChange?: (taskIds: string[]) => void;
  onEdit?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  onStartTimer?: (taskId: string) => void;
}

const statusConfig = {
  todo: { label: 'Da fare', icon: Circle, color: 'text-gray-600', bg: 'bg-gray-50' },
  in_progress: { label: 'In corso', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
  review: { label: 'In revisione', icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
  done: { label: 'Completato', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
  archived: { label: 'Archiviato', icon: Archive, color: 'text-gray-400', bg: 'bg-gray-100' },
};

const roleConfig = {
  assignee: { label: 'Assegnato', variant: 'default' as const, color: 'bg-blue-100 text-blue-800' },
  creator: { label: 'Creatore', variant: 'secondary' as const, color: 'bg-purple-100 text-purple-800' },
  watcher: { label: 'Osservatore', variant: 'outline' as const, color: 'bg-gray-100 text-gray-800' },
  none: { label: 'Nessun ruolo', variant: 'outline' as const, color: 'bg-gray-50 text-gray-500' },
};

type SortField = 'title' | 'status' | 'priority' | 'dueDate' | 'createdAt' | 'role';
type SortDirection = 'asc' | 'desc';

export function TasksDataTable({
  tasks,
  currentUserId,
  onTaskClick,
  className,
  selectedTaskIds = [],
  onSelectionChange,
  onEdit,
  onDelete,
  onStartTimer,
}: TasksDataTableProps) {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [openAssignPopover, setOpenAssignPopover] = useState<string | null>(null);

  const handleSelectAll = (checked: boolean) => {
    if (onSelectionChange) {
      onSelectionChange(checked ? tasks.map(t => t.id) : []);
    }
  };

  const handleSelectTask = (taskId: string, checked: boolean) => {
    if (onSelectionChange) {
      const newSelection = checked
        ? [...selectedTaskIds, taskId]
        : selectedTaskIds.filter(id => id !== taskId);
      onSelectionChange(newSelection);
    }
  };

  const allSelected = tasks.length > 0 && selectedTaskIds.length === tasks.length;
  const someSelected = selectedTaskIds.length > 0 && selectedTaskIds.length < tasks.length;

  const determineUserRole = (task: Task): TaskWithRole['userRole'] => {
    if (task.createdBy?.id === currentUserId) return 'creator';
    
    const assignee = task.assignees?.find(a => a.id === currentUserId && a.role === 'assignee');
    if (assignee) return 'assignee';
    
    const watcher = task.watchers?.find(w => w.id === currentUserId);
    if (watcher) return 'watcher';
    
    return 'none';
  };

  const tasksWithRole: TaskWithRole[] = tasks.map(task => ({
    ...task,
    userRole: determineUserRole(task),
  }));

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedTasks = [...tasksWithRole].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    
    switch (sortField) {
      case 'title':
        return direction * a.title.localeCompare(b.title);
      case 'status':
        return direction * a.status.localeCompare(b.status);
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return direction * (priorityOrder[a.priority] - priorityOrder[b.priority]);
      case 'dueDate':
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return direction * (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      case 'createdAt':
        return direction * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'role':
        const roleOrder = { assignee: 1, creator: 2, watcher: 3, none: 4 };
        return direction * (roleOrder[a.userRole] - roleOrder[b.userRole]);
      default:
        return 0;
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

  const getUserInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border border-dashed border-gray-300 rounded-lg">
        <div className="text-center">
          <p className="text-gray-500">Nessun task disponibile</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-md border', className)} data-testid="tasks-data-table">
      <Table>
        <TableHeader>
          <TableRow>
            {onSelectionChange && (
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Seleziona tutti"
                  data-testid="checkbox-select-all"
                  className={someSelected ? "opacity-50" : ""}
                />
              </TableHead>
            )}
            <TableHead className="w-12">
              <span className="sr-only">Stato</span>
            </TableHead>
            <TableHead className="min-w-[200px]">
              <Button
                variant="ghost"
                onClick={() => handleSort('title')}
                className="h-auto p-0 hover:bg-transparent font-semibold"
                data-testid="sort-title"
              >
                Titolo
                <SortIcon field="title" />
              </Button>
            </TableHead>
            <TableHead className="w-[180px] text-center">
              <Button
                variant="ghost"
                onClick={() => handleSort('role')}
                className="h-auto p-0 hover:bg-transparent font-semibold mx-auto"
                data-testid="sort-role"
              >
                Il Mio Ruolo
                <SortIcon field="role" />
              </Button>
            </TableHead>
            <TableHead className="w-[140px] text-center">
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
                onClick={() => handleSort('priority')}
                className="h-auto p-0 hover:bg-transparent font-semibold mx-auto"
                data-testid="sort-priority"
              >
                Priorità/Urgenza
                <SortIcon field="priority" />
              </Button>
            </TableHead>
            <TableHead className="w-[140px] text-center">
              <Button
                variant="ghost"
                onClick={() => handleSort('dueDate')}
                className="h-auto p-0 hover:bg-transparent font-semibold mx-auto"
                data-testid="sort-dueDate"
              >
                Scadenza
                <SortIcon field="dueDate" />
              </Button>
            </TableHead>
            <TableHead className="w-[140px] text-center">
              <Button
                variant="ghost"
                onClick={() => handleSort('createdAt')}
                className="h-auto p-0 hover:bg-transparent font-semibold mx-auto"
                data-testid="sort-createdAt"
              >
                Creato
                <SortIcon field="createdAt" />
              </Button>
            </TableHead>
            {(onStartTimer || onEdit || onDelete) && (
              <TableHead className="w-24 text-center">
                <span className="font-semibold">Azioni</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTasks.map((task) => {
            const StatusIcon = statusConfig[task.status as keyof typeof statusConfig]?.icon || Circle;
            const statusInfo = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.todo;
            const roleInfo = roleConfig[task.userRole];
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
            
            return (
              <TableRow
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                className="cursor-pointer hover:bg-gray-50"
                data-testid={`row-task-${task.id}`}
              >
                {onSelectionChange && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedTaskIds.includes(task.id)}
                      onCheckedChange={(checked) => handleSelectTask(task.id, checked as boolean)}
                      aria-label={`Seleziona ${task.title}`}
                      data-testid={`checkbox-task-${task.id}`}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <StatusIcon className={cn('h-5 w-5', statusInfo.color)} />
                </TableCell>
                <TableCell className="font-medium">
                  <div>
                    <div className="text-gray-900">{task.title}</div>
                    {task.description && (
                      <div className="text-sm text-gray-500 line-clamp-1 mt-1">
                        {task.description}
                      </div>
                    )}
                    {task.checklistProgress && task.checklistProgress.total > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              task.checklistProgress.completed === task.checklistProgress.total
                                ? "bg-green-500"
                                : "bg-blue-500"
                            )}
                            style={{
                              width: `${task.checklistProgress.total > 0 ? (task.checklistProgress.completed / task.checklistProgress.total) * 100 : 0}%`
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {task.checklistProgress.completed}/{task.checklistProgress.total}
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    className={cn('whitespace-nowrap', roleInfo.color)}
                    data-testid={`badge-role-${task.id}`}
                  >
                    {roleInfo.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={cn('whitespace-nowrap', statusInfo.bg, statusInfo.color)}>
                    {statusInfo.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <PriorityUrgencyBadge
                    priority={task.priority}
                    urgency={task.urgency || 'medium'}
                    size="sm"
                  />
                </TableCell>
                <TableCell className="text-center">
                  {task.dueDate ? (
                    <span className={cn(
                      'text-sm',
                      isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'
                    )}>
                      {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true, locale: it })}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm text-gray-600">
                    {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true, locale: it })}
                  </span>
                </TableCell>
                {(onStartTimer || onEdit || onDelete) && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <TooltipProvider>
                      <div className="flex items-center justify-center gap-1">
                        {onStartTimer && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onStartTimer(task.id)}
                                className="h-10 w-10 p-0 hover:bg-green-100 text-green-600"
                                aria-label="Avvia timer"
                                data-testid={`button-start-timer-${task.id}`}
                              >
                                <Play className="h-11 w-11" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Avvia timer</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {onEdit && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit(task.id)}
                                className="h-10 w-10 p-0 hover:bg-orange-100 text-orange-600"
                                data-testid={`button-edit-${task.id}`}
                              >
                                <Pencil className="h-11 w-11" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Modifica task</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {onDelete && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete(task.id)}
                                className="h-10 w-10 p-0 hover:bg-red-100 text-red-600"
                                data-testid={`button-delete-${task.id}`}
                              >
                                <Trash2 className="h-11 w-11" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Elimina task</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Popover
                          open={openAssignPopover === task.id}
                          onOpenChange={(open) => setOpenAssignPopover(open ? task.id : null)}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-10 w-10 p-0 hover:bg-blue-100 text-blue-600"
                                  data-testid={`button-assign-${task.id}`}
                                >
                                  <UserCheck className="h-11 w-11" />
                                </Button>
                              </PopoverTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Visualizza assegnati</p>
                            </TooltipContent>
                          </Tooltip>
                          <PopoverContent className="w-64" align="end">
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm text-gray-900">Assegnati</h4>
                              {task.assignees && task.assignees.length > 0 ? (
                                <div className="space-y-2">
                                  {task.assignees
                                    .filter(a => a.role === 'assignee')
                                    .map((assignee) => (
                                      <div
                                        key={assignee.id}
                                        className="flex items-center gap-2 p-2 rounded hover:bg-gray-50"
                                        data-testid={`assignee-item-${assignee.id}`}
                                      >
                                        <Avatar className="h-6 w-6">
                                          <AvatarFallback className="text-xs bg-blue-500 text-white">
                                            {getUserInitials(assignee.name)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm text-gray-700">
                                          {assignee.name}
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">Nessun assegnato</p>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
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
