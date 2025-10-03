import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  CheckCircle2,
  Circle,
  Clock,
  User,
  Calendar,
  Flag,
  Link2,
  MessageSquare,
  Paperclip,
  ListChecks,
  Activity,
  Edit,
  Trash2,
  Play,
  Pause,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface TaskDetailProps {
  task: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    priority: string;
    dueDate?: Date | string | null;
    createdAt: Date | string;
    updatedAt?: Date | string;
    createdBy?: { id: string; name: string };
    assignees?: Array<{ id: string; name: string; role: string }>;
    watchers?: Array<{ id: string; name: string }>;
    checklist?: Array<{ id: string; title: string; completed: boolean; order: number }>;
    comments?: Array<{ 
      id: string; 
      content: string; 
      createdAt: Date | string;
      user: { id: string; name: string };
    }>;
    attachments?: Array<{ id: string; fileName: string; fileUrl: string; createdAt: Date | string }>;
    tags?: string[];
    linkedWorkflowInstanceId?: string | null;
    timeTracking?: Array<{
      id: string;
      userId: string;
      userName: string;
      startTime: Date | string;
      endTime?: Date | string | null;
      duration?: number | null;
    }>;
  };
  open: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: string) => void;
}

const statusConfig = {
  todo: { label: 'Da fare', variant: 'secondary' as const },
  in_progress: { label: 'In corso', variant: 'default' as const },
  review: { label: 'In revisione', variant: 'outline' as const },
  done: { label: 'Completato', variant: 'default' as const },
  archived: { label: 'Archiviato', variant: 'secondary' as const },
};

const priorityConfig = {
  low: { label: 'Bassa', color: 'text-gray-600 bg-gray-100' },
  medium: { label: 'Media', color: 'text-blue-600 bg-blue-100' },
  high: { label: 'Alta', color: 'text-orange-600 bg-orange-100' },
};

export function TaskDetailDialog({
  task,
  open,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
}: TaskDetailProps) {
  const [activeTab, setActiveTab] = useState('details');
  
  const status = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.todo;
  const priority = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium;

  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date() && task.status !== 'done';

  const checklistCompleted = task.checklist?.filter(item => item.completed).length || 0;
  const checklistTotal = task.checklist?.length || 0;

  const totalTimeTracked = task.timeTracking?.reduce((sum, entry) => {
    if (entry.duration) return sum + entry.duration;
    if (entry.startTime && entry.endTime) {
      const duration = new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime();
      return sum + Math.floor(duration / 1000 / 60);
    }
    return sum;
  }, 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-semibold mb-2">
                {task.title}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={status.variant} data-testid="badge-status">
                  {status.label}
                </Badge>
                <Badge className={cn('px-2', priority.color)} data-testid="badge-priority">
                  <Flag className="h-3 w-3 mr-1" />
                  {priority.label}
                </Badge>
                {task.linkedWorkflowInstanceId && (
                  <Badge variant="outline" data-testid="badge-workflow">
                    <Link2 className="h-3 w-3 mr-1" />
                    Workflow
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                  data-testid="button-edit"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDelete}
                  data-testid="button-delete"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="details" data-testid="tab-details">
              <User className="h-4 w-4 mr-2" />
              Dettagli
            </TabsTrigger>
            <TabsTrigger value="checklist" data-testid="tab-checklist">
              <ListChecks className="h-4 w-4 mr-2" />
              Checklist ({checklistCompleted}/{checklistTotal})
            </TabsTrigger>
            <TabsTrigger value="comments" data-testid="tab-comments">
              <MessageSquare className="h-4 w-4 mr-2" />
              Commenti ({task.comments?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="attachments" data-testid="tab-attachments">
              <Paperclip className="h-4 w-4 mr-2" />
              Allegati ({task.attachments?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">
              <Activity className="h-4 w-4 mr-2" />
              Attività
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="details" className="space-y-6 mt-0">
              {task.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Descrizione</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{task.description}</p>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Informazioni</h3>
                  <div className="space-y-3">
                    {dueDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Scadenza:</span>
                        <span className={cn(
                          'font-medium',
                          isOverdue && 'text-red-600'
                        )}>
                          {format(dueDate, 'PPP', { locale: it })}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Creato:</span>
                      <span className="font-medium">
                        {format(new Date(task.createdAt), 'PPP', { locale: it })}
                      </span>
                    </div>

                    {task.createdBy && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Creato da:</span>
                        <span className="font-medium">{task.createdBy.name}</span>
                      </div>
                    )}

                    {totalTimeTracked > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Play className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Tempo tracciato:</span>
                        <span className="font-medium">
                          {Math.floor(totalTimeTracked / 60)}h {totalTimeTracked % 60}m
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Team</h3>
                  <div className="space-y-3">
                    {task.assignees && task.assignees.length > 0 && (
                      <div>
                        <div className="text-sm text-gray-600 mb-2">Assegnati:</div>
                        <div className="space-y-2">
                          {task.assignees.map((assignee) => (
                            <div key={assignee.id} className="flex items-center gap-2" data-testid={`assignee-${assignee.id}`}>
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {assignee.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium" data-testid={`text-assignee-name-${assignee.id}`}>{assignee.name}</div>
                                <div className="text-xs text-gray-500" data-testid={`text-assignee-role-${assignee.id}`}>{assignee.role}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {task.watchers && task.watchers.length > 0 && (
                      <div>
                        <div className="text-sm text-gray-600 mb-2">Osservatori:</div>
                        <div className="flex flex-wrap gap-1">
                          {task.watchers.map((watcher) => (
                            <Badge key={watcher.id} variant="secondary" className="text-xs">
                              {watcher.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {task.tags && task.tags.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {task.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="checklist" className="space-y-3 mt-0">
              {checklistTotal === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ListChecks className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Nessun elemento nella checklist</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>Progresso</span>
                      <span className="font-medium">
                        {checklistCompleted}/{checklistTotal} completati
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{
                          width: `${checklistTotal > 0 ? (checklistCompleted / checklistTotal) * 100 : 0}%`
                        }}
                      />
                    </div>
                  </div>

                  {task.checklist?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200"
                      data-testid={`checklist-item-${item.id}`}
                    >
                      {item.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" data-testid={`icon-completed-${item.id}`} />
                      ) : (
                        <Circle className="h-5 w-5 text-gray-400 flex-shrink-0" data-testid={`icon-pending-${item.id}`} />
                      )}
                      <span className={cn(
                        'flex-1 text-sm',
                        item.completed && 'line-through text-gray-500'
                      )}
                      data-testid={`text-checklist-title-${item.id}`}>
                        {item.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="comments" className="space-y-4 mt-0">
              {!task.comments || task.comments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Nessun commento</p>
                </div>
              ) : (
                task.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3" data-testid={`comment-${comment.id}`}>
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className="text-xs">
                        {comment.user.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium" data-testid={`text-comment-user-${comment.id}`}>{comment.user.name}</span>
                        <span className="text-xs text-gray-500" data-testid={`text-comment-date-${comment.id}`}>
                          {format(new Date(comment.createdAt), 'PPp', { locale: it })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap" data-testid={`text-comment-content-${comment.id}`}>{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="attachments" className="space-y-2 mt-0">
              {!task.attachments || task.attachments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Paperclip className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Nessun allegato</p>
                </div>
              ) : (
                task.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                    data-testid={`attachment-${attachment.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Paperclip className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" data-testid={`text-attachment-name-${attachment.id}`}>{attachment.fileName}</div>
                        <div className="text-xs text-gray-500" data-testid={`text-attachment-date-${attachment.id}`}>
                          {format(new Date(attachment.createdAt), 'PPp', { locale: it })}
                        </div>
                      </div>
                    </div>
                    <a 
                      href={attachment.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      data-testid={`link-attachment-${attachment.id}`}
                    >
                      Apri
                    </a>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="activity" className="space-y-3 mt-0">
              <div className="text-center py-12 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Log attività disponibile a breve</p>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
