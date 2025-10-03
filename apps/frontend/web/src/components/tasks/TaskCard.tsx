import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PriorityUrgencyBadge } from './PriorityUrgencyBadge';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  MessageSquare,
  Paperclip,
  User,
  MoreVertical,
  AlertCircle,
  Archive
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface TaskCardProps {
  task: {
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
  };
  variant?: 'default' | 'compact';
  onClick?: () => void;
  onStatusChange?: (status: string) => void;
  className?: string;
}

const statusConfig = {
  todo: { label: 'Da fare', variant: 'secondary' as const, icon: Circle },
  in_progress: { label: 'In corso', variant: 'default' as const, icon: Clock },
  review: { label: 'In revisione', variant: 'outline' as const, icon: AlertCircle },
  done: { label: 'Completato', variant: 'default' as const, icon: CheckCircle2 },
  archived: { label: 'Archiviato', variant: 'secondary' as const, icon: Archive },
};

export function TaskCard({ 
  task, 
  variant = 'default',
  onClick,
  onStatusChange,
  className 
}: TaskCardProps) {
  const status = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.todo;
  const StatusIcon = status.icon;
  const urgency = task.urgency || 'medium';

  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date() && task.status !== 'done';
  
  const createdDate = new Date(task.createdAt);
  const createdAgo = formatDistanceToNow(createdDate, { addSuffix: true, locale: it });

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const statuses = Object.keys(statusConfig);
    const currentIndex = statuses.indexOf(task.status);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    onStatusChange?.(nextStatus);
  };

  if (variant === 'compact') {
    return (
      <div
        data-testid={`task-card-compact-${task.id}`}
        onClick={onClick}
        className={cn(
          'group flex items-center gap-3 p-3 rounded-lg border border-gray-200',
          'hover:border-gray-300 hover:bg-gray-50 cursor-pointer transition-colors',
          className
        )}
      >
        <button
          data-testid={`button-status-${task.id}`}
          onClick={handleStatusClick}
          className="flex-shrink-0"
        >
          <StatusIcon className={cn(
            'h-5 w-5',
            task.status === 'completed' ? 'text-green-600' : 'text-gray-400'
          )} />
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900 truncate">
              {task.title}
            </span>
            {task.linkedWorkflowInstanceId && (
              <Badge variant="outline" className="text-xs">Workflow</Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {task.assigneeCount && task.assigneeCount > 0 && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {task.assigneeCount}
              </span>
            )}
            {task.commentCount && task.commentCount > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {task.commentCount}
              </span>
            )}
            {dueDate && (
              <span className={cn(
                'flex items-center gap-1',
                isOverdue && 'text-red-600 font-medium'
              )}>
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(dueDate, { addSuffix: true, locale: it })}
              </span>
            )}
          </div>
        </div>

        <PriorityUrgencyBadge 
          priority={task.priority}
          urgency={urgency as any}
          size="sm"
          showLabels={false}
        />
      </div>
    );
  }

  return (
    <Card
      data-testid={`task-card-${task.id}`}
      onClick={onClick}
      className={cn(
        'group hover:shadow-md transition-shadow cursor-pointer',
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <button
              data-testid={`button-status-${task.id}`}
              onClick={handleStatusClick}
              className="flex-shrink-0 mt-0.5"
            >
              <StatusIcon className={cn(
                'h-5 w-5',
                task.status === 'completed' ? 'text-green-600' : 'text-gray-400',
                'hover:text-gray-600 transition-colors'
              )} />
            </button>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {task.title}
              </h3>
              {task.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Badge 
              variant={status.variant}
              className="text-xs whitespace-nowrap"
              data-testid={`badge-status-${task.id}`}
            >
              {status.label}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              data-testid={`button-menu-${task.id}`}
              onClick={(e) => e.stopPropagation()}
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-3">
          <PriorityUrgencyBadge 
            priority={task.priority}
            urgency={urgency as any}
            size="md"
          />

          {dueDate && (
            <div className={cn(
              'flex items-center gap-1.5',
              isOverdue && 'text-red-600 font-medium'
            )}>
              <Clock className="h-3.5 w-3.5" />
              <span>{formatDistanceToNow(dueDate, { addSuffix: true, locale: it })}</span>
            </div>
          )}

          {task.linkedWorkflowInstanceId && (
            <Badge variant="outline" className="text-xs">
              Collegato a Workflow
            </Badge>
          )}
        </div>

        {task.checklistProgress && task.checklistProgress.total > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Checklist</span>
              <span>
                {task.checklistProgress.completed}/{task.checklistProgress.total}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all"
                style={{
                  width: `${(task.checklistProgress.completed / task.checklistProgress.total) * 100}%`
                }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {task.assigneeCount && task.assigneeCount > 0 && (
              <div className="flex items-center gap-1" data-testid={`text-assignees-${task.id}`}>
                <User className="h-4 w-4" />
                <span>{task.assigneeCount}</span>
              </div>
            )}
            {task.commentCount && task.commentCount > 0 && (
              <div className="flex items-center gap-1" data-testid={`text-comments-${task.id}`}>
                <MessageSquare className="h-4 w-4" />
                <span>{task.commentCount}</span>
              </div>
            )}
            {task.attachmentCount && task.attachmentCount > 0 && (
              <div className="flex items-center gap-1" data-testid={`text-attachments-${task.id}`}>
                <Paperclip className="h-4 w-4" />
                <span>{task.attachmentCount}</span>
              </div>
            )}
          </div>

          <span className="text-xs text-gray-400">{createdAgo}</span>
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {task.tags.map((tag, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs"
                data-testid={`badge-tag-${index}`}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
