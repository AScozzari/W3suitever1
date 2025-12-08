import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ListTodo
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useTenantNavigation } from '@/hooks/useTenantSafety';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: Date | string | null;
  createdAt: Date | string;
}

export interface TasksWidgetProps {
  tenantSlug: string;
  limit?: number;
  className?: string;
}

const priorityConfig = {
  urgent: { label: 'Urgente', color: 'text-red-600' },
  high: { label: 'Alta', color: 'text-orange-600' },
  medium: { label: 'Media', color: 'text-blue-600' },
  low: { label: 'Bassa', color: 'text-gray-600' },
};

export function TasksWidget({ 
  tenantSlug, 
  limit = 5,
  className 
}: TasksWidgetProps) {
  const { navigate } = useTenantNavigation();

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ['/api/tasks/my-tasks', { limit }],
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery<{
    total: number;
    pending: number;
    inProgress: number;
    overdue: number;
  }>({
    queryKey: ['/api/tasks/stats'],
    refetchInterval: 30000,
  });

  const handleViewAll = () => {
    navigate('tasks');
  };

  const handleCreateTask = () => {
    navigate('tasks?action=create');
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`tasks?id=${taskId}`);
  };

  return (
    <Card className={cn('w-full', className)} data-testid="tasks-widget">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-base font-semibold">I Miei Task</CardTitle>
          </div>
          {stats && stats.total > 0 && (
            <Badge variant="secondary" data-testid="badge-total">
              {stats.total}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {stats && (
          <div className="grid grid-cols-3 gap-2 pb-3 border-b border-gray-100">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">In corso</div>
              <div 
                className="text-lg font-semibold text-blue-600"
                data-testid="stat-in-progress"
              >
                {stats.inProgress}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">In attesa</div>
              <div 
                className="text-lg font-semibold text-gray-600"
                data-testid="stat-pending"
              >
                {stats.pending}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">In ritardo</div>
              <div 
                className="text-lg font-semibold text-red-600"
                data-testid="stat-overdue"
              >
                {stats.overdue}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))
          ) : !tasks || tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nessun task</p>
            </div>
          ) : (
            tasks.slice(0, limit).map((task) => {
              const dueDate = task.dueDate ? new Date(task.dueDate) : null;
              const isOverdue = dueDate && dueDate < new Date() && task.status !== 'completed';
              const priority = priorityConfig[task.priority as keyof typeof priorityConfig];

              return (
                <button
                  key={task.id}
                  onClick={() => handleTaskClick(task.id)}
                  className={cn(
                    'w-full text-left p-2.5 rounded-lg border border-gray-200',
                    'hover:border-gray-300 hover:bg-gray-50 transition-colors',
                    'group'
                  )}
                  data-testid={`widget-task-${task.id}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900 line-clamp-1 flex-1">
                      {task.title}
                    </span>
                    <span className={cn('text-xs font-medium', priority.color)}>
                      {priority.label}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {task.status === 'completed' ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Completato</span>
                      </div>
                    ) : task.status === 'in_progress' ? (
                      <div className="flex items-center gap-1 text-blue-600">
                        <Clock className="h-3 w-3" />
                        <span>In corso</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Da fare</span>
                      </div>
                    )}
                    
                    {dueDate && (
                      <>
                        <span>•</span>
                        <span className={cn(isOverdue && 'text-red-600 font-medium')}>
                          {formatDistanceToNow(dueDate, { addSuffix: true, locale: it })}
                        </span>
                      </>
                    )}

                    {isOverdue && (
                      <AlertCircle className="h-3 w-3 text-red-600 ml-auto" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="flex gap-2 pt-3 border-t border-gray-100">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateTask}
            className="flex-1"
            data-testid="button-create-task"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nuovo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewAll}
            className="flex-1"
            data-testid="button-view-all"
          >
            Vedi tutti
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
