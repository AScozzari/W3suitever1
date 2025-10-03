import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TaskCard } from './TaskCard';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  XCircle
} from 'lucide-react';

export interface KanbanTask {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: Date | string | null;
  createdAt: Date | string;
  assigneeCount?: number;
  commentCount?: number;
  attachmentCount?: number;
  checklistProgress?: { completed: number; total: number };
  tags?: string[];
  linkedWorkflowInstanceId?: string | null;
}

export interface Column {
  id: string;
  title: string;
  status: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
}

export interface KanbanBoardProps {
  tasks: KanbanTask[];
  columns?: Column[];
  onTaskClick?: (task: KanbanTask) => void;
  onStatusChange?: (taskId: string, status: string) => void;
  className?: string;
}

// Default columns for Task Management (aligned with DB enums)
export const DEFAULT_TASK_COLUMNS: Column[] = [
  {
    id: 'todo',
    title: 'Da fare',
    status: 'todo',
    icon: Circle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
  },
  {
    id: 'in_progress',
    title: 'In corso',
    status: 'in_progress',
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'review',
    title: 'In revisione',
    status: 'review',
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  {
    id: 'done',
    title: 'Completato',
    status: 'done',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    id: 'archived',
    title: 'Archiviato',
    status: 'archived',
    icon: XCircle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-100',
  },
];

export function KanbanBoard({
  tasks,
  columns = DEFAULT_TASK_COLUMNS,
  onTaskClick,
  onStatusChange,
  className
}: KanbanBoardProps) {
  const tasksByStatus = useMemo(() => {
    // Dynamically initialize grouped object based on provided columns
    const grouped: Record<string, KanbanTask[]> = {};
    columns.forEach(col => {
      grouped[col.status] = [];
    });

    tasks.forEach((task) => {
      const status = task.status || columns[0]?.status || 'todo';
      if (grouped[status]) {
        grouped[status].push(task);
      } else {
        // Fallback to first column if status not found
        const fallbackStatus = columns[0]?.status || 'todo';
        if (grouped[fallbackStatus]) {
          grouped[fallbackStatus].push(task);
        }
      }
    });

    return grouped;
  }, [tasks, columns]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    
    if (taskId && onStatusChange) {
      onStatusChange(taskId, newStatus);
    }
  };

  return (
    <div 
      className={cn('flex gap-4 overflow-x-auto pb-4', className)}
      data-testid="kanban-board"
    >
      {columns.map((column) => {
        const Icon = column.icon;
        const columnTasks = tasksByStatus[column.status] || [];
        
        return (
          <div
            key={column.id}
            className="flex-shrink-0 w-80"
            data-testid={`kanban-column-${column.id}`}
          >
            <Card className="h-full flex flex-col">
              <CardHeader className={cn('pb-3', column.bgColor)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-5 w-5', column.color)} />
                    <CardTitle className="text-base font-semibold">
                      {column.title}
                    </CardTitle>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="ml-2"
                    data-testid={`badge-count-${column.id}`}
                  >
                    {columnTasks.length}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent
                className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[200px]"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.status)}
                data-testid={`drop-zone-${column.id}`}
              >
                {columnTasks.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                    Nessun task
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      data-testid={`draggable-task-${task.id}`}
                      className="cursor-move"
                    >
                      <TaskCard
                        task={task}
                        variant="default"
                        onClick={() => onTaskClick?.(task)}
                        onStatusChange={(status) => onStatusChange?.(task.id, status)}
                      />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
