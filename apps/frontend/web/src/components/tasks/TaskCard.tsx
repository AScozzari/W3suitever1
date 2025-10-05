import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Archive,
  CheckSquare,
  Tag,
  Zap,
  Copy,
  Pencil,
  Trash2
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
  onDuplicate?: (taskId: string) => void;
  onEdit?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  className?: string;
}

const statusConfig = {
  todo: { 
    label: 'Da fare', 
    variant: 'secondary' as const, 
    icon: Circle,
    gradient: 'from-gray-100 to-gray-200',
    borderColor: 'border-gray-300',
    textColor: 'text-gray-700'
  },
  in_progress: { 
    label: 'In corso', 
    variant: 'default' as const, 
    icon: Clock,
    gradient: 'from-blue-100 to-cyan-100',
    borderColor: 'border-blue-400',
    textColor: 'text-blue-700'
  },
  review: { 
    label: 'In revisione', 
    variant: 'outline' as const, 
    icon: AlertCircle,
    gradient: 'from-orange-100 to-amber-100',
    borderColor: 'border-orange-400',
    textColor: 'text-orange-700'
  },
  done: { 
    label: 'Completato', 
    variant: 'default' as const, 
    icon: CheckCircle2,
    gradient: 'from-green-100 to-emerald-100',
    borderColor: 'border-green-400',
    textColor: 'text-green-700'
  },
  archived: { 
    label: 'Archiviato', 
    variant: 'secondary' as const, 
    icon: Archive,
    gradient: 'from-gray-50 to-gray-100',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-500'
  },
};

const priorityGradients = {
  low: 'from-green-400 to-emerald-400',
  medium: 'from-yellow-400 to-orange-400',
  high: 'from-red-400 to-rose-400',
};

export function TaskCard({ 
  task, 
  variant = 'default',
  onClick,
  onStatusChange,
  onDuplicate,
  onEdit,
  onDelete,
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
          'group flex items-center gap-3 p-3 rounded-lg',
          'bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-2',
          'hover:bg-white/90 hover:shadow-lg hover:scale-[1.02] cursor-pointer',
          'transition-all duration-200',
          status.borderColor,
          className
        )}
      >
        <button
          data-testid={`button-status-${task.id}`}
          onClick={handleStatusClick}
          className="flex-shrink-0"
        >
          <StatusIcon className={cn(
            'h-5 w-5 transition-all group-hover:scale-110',
            status.textColor
          )} />
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-900 truncate">
              {task.title}
            </span>
            {task.linkedWorkflowInstanceId && (
              <Badge variant="outline" className="text-xs bg-purple-50 border-purple-300 text-purple-700">
                <Zap className="h-2.5 w-2.5 mr-1" />
                Workflow
              </Badge>
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
                isOverdue && 'text-red-600 font-semibold'
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

  const checklistPercentage = task.checklistProgress && task.checklistProgress.total > 0
    ? (task.checklistProgress.completed / task.checklistProgress.total) * 100
    : 0;

  return (
    <Card
      data-testid={`task-card-${task.id}`}
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden',
        'bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl',
        'border-2 transition-all duration-300',
        'hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 cursor-pointer',
        status.borderColor,
        className
      )}
    >
      <div className={cn(
        'absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r opacity-80',
        priorityGradients[task.priority]
      )} />

      <CardHeader className="pb-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <button
              data-testid={`button-status-${task.id}`}
              onClick={handleStatusClick}
              className="flex-shrink-0 mt-1 transition-transform group-hover:scale-125 hover:rotate-12"
            >
              <StatusIcon className={cn(
                'h-6 w-6 transition-colors drop-shadow-sm',
                status.textColor
              )} />
            </button>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1.5 group-hover:text-orange-600 transition-colors">
                {task.title}
              </h3>
              {task.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                  {task.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 flex-shrink-0">
            <Badge 
              className={cn(
                'text-xs whitespace-nowrap font-semibold shadow-sm',
                'bg-gradient-to-r',
                status.gradient,
                status.textColor,
                'border',
                status.borderColor
              )}
              data-testid={`badge-status-${task.id}`}
            >
              {status.label}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid={`button-menu-${task.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-2">
                {onDuplicate && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate(task.id);
                    }}
                    className="cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/20"
                    data-testid={`menu-item-duplicate-${task.id}`}
                  >
                    <Copy className="mr-2 h-4 w-4 text-orange-600" />
                    <span className="font-medium">Duplica task</span>
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(task.id);
                    }}
                    className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    data-testid={`menu-item-edit-${task.id}`}
                  >
                    <Pencil className="mr-2 h-4 w-4 text-blue-600" />
                    <span className="font-medium">Modifica</span>
                  </DropdownMenuItem>
                )}
                {(onDuplicate || onEdit) && onDelete && <DropdownMenuSeparator />}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(task.id);
                    }}
                    className="cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
                    data-testid={`menu-item-delete-${task.id}`}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span className="font-medium">Elimina</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <PriorityUrgencyBadge 
            priority={task.priority}
            urgency={urgency as any}
            size="md"
          />

          {dueDate && (
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium',
              isOverdue 
                ? 'bg-red-100 text-red-700 border border-red-300' 
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            )}>
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs">{formatDistanceToNow(dueDate, { addSuffix: true, locale: it })}</span>
            </div>
          )}

          {task.linkedWorkflowInstanceId && (
            <Badge className="text-xs bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border border-purple-300 font-semibold">
              <Zap className="h-3 w-3 mr-1" />
              Workflow
            </Badge>
          )}
        </div>

        {task.checklistProgress && task.checklistProgress.total > 0 && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200">
            <div className="flex items-center justify-between text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">
              <div className="flex items-center gap-1.5">
                <CheckSquare className="h-3.5 w-3.5" />
                <span>Checklist</span>
              </div>
              <span className="font-bold">
                {task.checklistProgress.completed}/{task.checklistProgress.total}
              </span>
            </div>
            <div className="relative w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${checklistPercentage}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 text-sm">
            {task.assigneeCount && task.assigneeCount > 0 && (
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 font-medium" data-testid={`text-assignees-${task.id}`}>
                <div className="p-1 rounded bg-orange-100 dark:bg-orange-900/30">
                  <User className="h-3.5 w-3.5 text-orange-600" />
                </div>
                <span>{task.assigneeCount}</span>
              </div>
            )}
            {task.commentCount && task.commentCount > 0 && (
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 font-medium" data-testid={`text-comments-${task.id}`}>
                <div className="p-1 rounded bg-blue-100 dark:bg-blue-900/30">
                  <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <span>{task.commentCount}</span>
              </div>
            )}
            {task.attachmentCount && task.attachmentCount > 0 && (
              <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 font-medium" data-testid={`text-attachments-${task.id}`}>
                <div className="p-1 rounded bg-purple-100 dark:bg-purple-900/30">
                  <Paperclip className="h-3.5 w-3.5 text-purple-600" />
                </div>
                <span>{task.attachmentCount}</span>
              </div>
            )}
          </div>

          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{createdAgo}</span>
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {task.tags.map((tag, index) => (
              <Badge
                key={index}
                className="text-xs bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-500 font-medium"
                data-testid={`badge-tag-${index}`}
              >
                <Tag className="h-2.5 w-2.5 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
