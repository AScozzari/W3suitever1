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
          'bg-white/90 backdrop-blur-xl border-2',
          'hover:bg-white hover:shadow-lg hover:scale-[1.02] cursor-pointer',
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
        'bg-white/90 backdrop-blur-xl border-2',
        'transition-all duration-300',
        'hover:shadow-2xl hover:shadow-orange-500/20 hover:bg-white/95',
        'hover:scale-[1.02] hover:-translate-y-1 cursor-pointer',
        'hover:border-orange-300',
        status.borderColor,
        className
      )}
    >
      <div className={cn(
        'absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r',
        priorityGradients[task.priority]
      )} />

      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <button
              data-testid={`button-status-${task.id}`}
              onClick={handleStatusClick}
              className="flex-shrink-0 mt-0.5"
            >
              <StatusIcon className={cn(
                'h-4 w-4 transition-colors',
                status.textColor
              )} />
            </button>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
                {task.title}
              </h3>
              {task.description && (
                <p className="text-xs text-gray-600 line-clamp-1">
                  {task.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-1 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  data-testid={`button-menu-${task.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                >
                  <MoreVertical className="h-3.5 w-3.5 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-white border border-gray-200">
                {onDuplicate && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate(task.id);
                    }}
                    className="cursor-pointer hover:bg-orange-50"
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
                    className="cursor-pointer hover:bg-blue-50"
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
                    className="cursor-pointer hover:bg-red-50 text-red-600"
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

      <CardContent className="pt-0 pb-2 px-3 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <PriorityUrgencyBadge 
            priority={task.priority}
            urgency={urgency as any}
            size="sm"
          />

          {dueDate && (
            <div className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs',
              isOverdue 
                ? 'bg-red-50 text-red-600' 
                : 'bg-blue-50 text-blue-600'
            )}>
              <Clock className="h-3 w-3" />
              <span>{formatDistanceToNow(dueDate, { addSuffix: true, locale: it })}</span>
            </div>
          )}

          {task.linkedWorkflowInstanceId && (
            <Badge className="text-xs bg-purple-50 text-purple-700 border-purple-200">
              <Zap className="h-2.5 w-2.5 mr-0.5" />
              Workflow
            </Badge>
          )}
        </div>

        {task.checklistProgress && task.checklistProgress.total > 0 && (
          <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-blue-900 font-medium">Checklist</span>
              <span className="text-blue-700 font-semibold">
                {task.checklistProgress.completed}/{task.checklistProgress.total}
              </span>
            </div>
            <div className="relative w-full bg-blue-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${checklistPercentage}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs">
            {task.assigneeCount && task.assigneeCount > 0 && (
              <div className="flex items-center gap-1 text-gray-600" data-testid={`text-assignees-${task.id}`}>
                <User className="h-3 w-3" />
                <span>{task.assigneeCount}</span>
              </div>
            )}
            {task.commentCount && task.commentCount > 0 && (
              <div className="flex items-center gap-1 text-gray-600" data-testid={`text-comments-${task.id}`}>
                <MessageSquare className="h-3 w-3" />
                <span>{task.commentCount}</span>
              </div>
            )}
            {task.attachmentCount && task.attachmentCount > 0 && (
              <div className="flex items-center gap-1 text-gray-600" data-testid={`text-attachments-${task.id}`}>
                <Paperclip className="h-3 w-3" />
                <span>{task.attachmentCount}</span>
              </div>
            )}
          </div>

          <span className="text-xs text-gray-500">{createdAgo}</span>
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {task.tags.slice(0, 2).map((tag, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs text-gray-600 px-1.5 py-0"
                data-testid={`badge-tag-${index}`}
              >
                {tag}
              </Badge>
            ))}
            {task.tags.length > 2 && (
              <Badge variant="outline" className="text-xs text-gray-500 px-1.5 py-0">
                +{task.tags.length - 2}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
