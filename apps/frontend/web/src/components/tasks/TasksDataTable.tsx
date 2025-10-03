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
} from 'lucide-react';

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
}

interface TaskWithRole extends Task {
  userRole: 'assignee' | 'creator' | 'watcher' | 'none';
}

export interface TasksDataTableProps {
  tasks: Task[];
  currentUserId: string;
  onTaskClick?: (task: Task) => void;
  className?: string;
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
  className
}: TasksDataTableProps) {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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
            <TableHead className="w-12">
              <span className="sr-only">Stato</span>
            </TableHead>
            <TableHead>
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
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('role')}
                className="h-auto p-0 hover:bg-transparent font-semibold"
                data-testid="sort-role"
              >
                Il Mio Ruolo
                <SortIcon field="role" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('status')}
                className="h-auto p-0 hover:bg-transparent font-semibold"
                data-testid="sort-status"
              >
                Stato
                <SortIcon field="status" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('priority')}
                className="h-auto p-0 hover:bg-transparent font-semibold"
                data-testid="sort-priority"
              >
                Priorità/Urgenza
                <SortIcon field="priority" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('dueDate')}
                className="h-auto p-0 hover:bg-transparent font-semibold"
                data-testid="sort-dueDate"
              >
                Scadenza
                <SortIcon field="dueDate" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort('createdAt')}
                className="h-auto p-0 hover:bg-transparent font-semibold"
                data-testid="sort-createdAt"
              >
                Creato
                <SortIcon field="createdAt" />
              </Button>
            </TableHead>
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
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn('whitespace-nowrap', roleInfo.color)}
                    data-testid={`badge-role-${task.id}`}
                  >
                    {roleInfo.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn('whitespace-nowrap', statusInfo.bg, statusInfo.color)}>
                    {statusInfo.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <PriorityUrgencyBadge
                    priority={task.priority}
                    urgency={task.urgency || 'medium'}
                    size="sm"
                  />
                </TableCell>
                <TableCell>
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
                <TableCell>
                  <span className="text-sm text-gray-600">
                    {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true, locale: it })}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
