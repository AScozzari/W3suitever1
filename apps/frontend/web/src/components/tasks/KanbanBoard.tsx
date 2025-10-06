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
  XCircle,
  Sparkles
} from 'lucide-react';

export interface KanbanTask {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: 'low' | 'medium' | 'high';
  urgency?: 'low' | 'medium' | 'high' | 'critical';
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
  gradient: string;
  badgeColor: string;
}

export interface KanbanBoardProps {
  tasks: KanbanTask[];
  columns?: Column[];
  onTaskClick?: (task: KanbanTask) => void;
  onStatusChange?: (taskId: string, status: string) => void;
  onDuplicate?: (taskId: string) => void;
  onEdit?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  className?: string;
}

export const DEFAULT_TASK_COLUMNS: Column[] = [
  {
    id: 'todo',
    title: 'Da fare',
    status: 'todo',
    icon: Circle,
    color: 'text-gray-700',
    bgColor: 'bg-gradient-to-br from-gray-100 to-gray-200',
    gradient: 'from-gray-200 to-gray-300',
    badgeColor: 'bg-gray-600 text-white',
  },
  {
    id: 'in_progress',
    title: 'In corso',
    status: 'in_progress',
    icon: Clock,
    color: 'text-blue-700',
    bgColor: 'bg-gradient-to-br from-blue-100 to-cyan-100',
    gradient: 'from-blue-400 to-cyan-400',
    badgeColor: 'bg-blue-600 text-white',
  },
  {
    id: 'review',
    title: 'In revisione',
    status: 'review',
    icon: AlertCircle,
    color: 'text-orange-700',
    bgColor: 'bg-gradient-to-br from-orange-100 to-amber-100',
    gradient: 'from-orange-400 to-amber-400',
    badgeColor: 'bg-orange-600 text-white',
  },
  {
    id: 'done',
    title: 'Completato',
    status: 'done',
    icon: CheckCircle2,
    color: 'text-green-700',
    bgColor: 'bg-gradient-to-br from-green-100 to-emerald-100',
    gradient: 'from-green-400 to-emerald-400',
    badgeColor: 'bg-green-600 text-white',
  },
  {
    id: 'archived',
    title: 'Archiviato',
    status: 'archived',
    icon: XCircle,
    color: 'text-gray-500',
    bgColor: 'bg-gradient-to-br from-gray-50 to-gray-100',
    gradient: 'from-gray-300 to-gray-400',
    badgeColor: 'bg-gray-500 text-white',
  },
];

export function KanbanBoard({
  tasks,
  columns = DEFAULT_TASK_COLUMNS,
  onTaskClick,
  onStatusChange,
  onDuplicate,
  onEdit,
  onDelete,
  className
}: KanbanBoardProps) {
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, KanbanTask[]> = {};
    columns.forEach(col => {
      grouped[col.status] = [];
    });

    tasks.forEach((task) => {
      const status = task.status || columns[0]?.status || 'todo';
      if (grouped[status]) {
        grouped[status].push(task);
      } else {
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
    (e.target as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.classList.add('ring-4', 'ring-orange-500', 'ring-offset-2', 'bg-orange-50/50', 'shadow-2xl', 'shadow-orange-500/50', 'scale-[1.02]');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('ring-4', 'ring-orange-500', 'ring-offset-2', 'bg-orange-50/50', 'shadow-2xl', 'shadow-orange-500/50', 'scale-[1.02]');
  };

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('ring-4', 'ring-orange-500', 'ring-offset-2', 'bg-orange-50/50', 'shadow-2xl', 'shadow-orange-500/50', 'scale-[1.02]');
    
    const taskId = e.dataTransfer.getData('taskId');
    
    if (taskId && onStatusChange) {
      onStatusChange(taskId, newStatus);
    }
  };

  return (
    <div 
      className={cn('flex gap-5 overflow-x-auto pb-6 px-1', className)}
      data-testid="kanban-board"
    >
      {columns.map((column) => {
        const Icon = column.icon;
        const columnTasks = tasksByStatus[column.status] || [];
        
        return (
          <div
            key={column.id}
            className="flex-shrink-0 w-[420px] animate-in fade-in slide-in-from-bottom-8 duration-700"
            style={{ animationDelay: `${columns.indexOf(column) * 150}ms` }}
            data-testid={`kanban-column-${column.id}`}
          >
            <Card className="h-full flex flex-col border-2 shadow-xl transition-shadow duration-300 bg-white/95 backdrop-blur-xl overflow-hidden">
              <div className={cn('absolute top-0 left-0 right-0 h-2 bg-gradient-to-r shadow-lg animate-pulse', column.gradient)} />
              <div className={cn('absolute top-0 left-0 right-0 h-2 bg-gradient-to-r blur-md opacity-60', column.gradient)} />
              
              <CardHeader className={cn('pb-4 pt-6 border-b-2 border-gray-200/50', 'bg-gradient-to-br backdrop-blur-xl', column.bgColor, 'shadow-inner')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2.5 rounded-xl bg-white/95 shadow-xl backdrop-blur-sm', 'hover:scale-110 transition-transform duration-300', 'border-2 border-white/50')}>
                      <Icon className={cn('h-6 w-6', column.color, 'drop-shadow-lg')} />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-gray-900">
                        {column.title}
                      </CardTitle>
                      <p className="text-xs font-semibold text-gray-600 mt-1">
                        {columnTasks.length} {columnTasks.length === 1 ? 'task' : 'tasks'}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    className={cn('shadow-xl font-bold text-base px-4 py-1.5 rounded-xl animate-pulse', column.badgeColor, 'border-2 border-white/30')}
                    data-testid={`badge-count-${column.id}`}
                  >
                    {columnTasks.length}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent
                className="flex-1 px-4 pb-4 pt-0 space-y-4 overflow-y-auto min-h-[400px] bg-gradient-to-b from-transparent to-gray-50/30"
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.status)}
                data-testid={`drop-zone-${column.id}`}
              >
                {columnTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="p-4 rounded-full bg-white/80 backdrop-blur-sm border-2 border-gray-200 mb-4">
                      <Sparkles className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">
                      Nessun task
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Trascina qui i task
                    </p>
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      data-testid={`draggable-task-${task.id}`}
                      className="cursor-move transition-opacity"
                    >
                      <TaskCard
                        task={task}
                        variant="default"
                        onClick={() => onTaskClick?.(task)}
                        onStatusChange={(status) => onStatusChange?.(task.id, status)}
                        onDuplicate={onDuplicate}
                        onEdit={onEdit}
                        onDelete={onDelete}
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
