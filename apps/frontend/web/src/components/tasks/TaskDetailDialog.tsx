import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';
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
  Plus,
  X,
  Check,
  Download,
  Upload,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DependenciesGraph } from './DependenciesGraph';
import { ActivityFeed } from './ActivityFeed';

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
  onEdit?: (task: TaskDetailProps['task']) => void;
  onDelete?: () => void;
  onStatusChange?: (status: string) => void;
  availableTasks?: Array<{ id: string; title: string; status: string; priority: string }>;
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

interface Attachment {
  id: string;
  taskId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  objectStorageKey: string;
  uploadedById: string;
  uploadedBy: { id: string; firstName: string | null; lastName: string | null };
  uploadedAt: string;
}

export function TaskDetailDialog({
  task,
  open,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  availableTasks = [],
}: TaskDetailProps) {
  const { toast } = useToast();
  const { currentUser } = useTenant();
  const [activeTab, setActiveTab] = useState('details');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newComment, setNewComment] = useState('');

  // Fetch complete task details when modal opens
  const { data: taskDetails } = useQuery({
    queryKey: ['/api/tasks', task.id],
    queryFn: () => apiRequest(`/api/tasks/${task.id}`),
    enabled: open, // Only fetch when modal is open
  });

  // Use detailed task data if available, fallback to prop
  const fullTask = taskDetails || task;

  const { data: attachmentsData = [] } = useQuery<Attachment[]>({
    queryKey: ['/api/tasks', task.id, 'attachments'],
    queryFn: () => apiRequest(`/api/tasks/${task.id}/attachments`),
    enabled: open, // Only fetch when modal is open
  });

  const activeTimer = fullTask.timeTracking?.find(log => 
    !log.endTime && log.userId === currentUser?.id
  );
  
  const status = statusConfig[fullTask.status as keyof typeof statusConfig] || statusConfig.todo;
  const priority = priorityConfig[fullTask.priority as keyof typeof priorityConfig] || priorityConfig.medium;

  const dueDate = fullTask.dueDate ? new Date(fullTask.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date() && fullTask.status !== 'done';

  const checklistCompleted = fullTask.checklist?.filter(item => item.completed).length || 0;
  const checklistTotal = fullTask.checklist?.length || 0;

  const totalTimeTracked = fullTask.timeTracking?.reduce((sum, entry) => {
    if (entry.duration) return sum + entry.duration;
    if (entry.startTime && entry.endTime) {
      const duration = new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime();
      return sum + Math.floor(duration / 1000 / 60);
    }
    return sum;
  }, 0) || 0;

  // Checklist mutations
  const toggleChecklistItemMutation = useMutation({
    mutationFn: async ({ itemId, currentCompleted }: { itemId: string; currentCompleted: boolean }) => {
      return apiRequest(`/api/tasks/${task.id}/checklist/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isCompleted: !currentCompleted }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', task.id] });
    },
  });

  const updateChecklistItemMutation = useMutation({
    mutationFn: async ({ itemId, title }: { itemId: string; title: string }) => {
      return apiRequest(`/api/tasks/${task.id}/checklist/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setEditingItemId(null);
      toast({ title: 'Item aggiornato' });
    },
  });

  const deleteChecklistItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiRequest(`/api/tasks/${task.id}/checklist/${itemId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({ title: 'Item eliminato' });
    },
  });

  const addChecklistItemMutation = useMutation({
    mutationFn: async (title: string) => {
      const position = (fullTask.checklist?.length || 0) + 1;
      return apiRequest(`/api/tasks/${task.id}/checklist`, {
        method: 'POST',
        body: JSON.stringify({ title, position }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setNewItemTitle('');
      setIsAddingItem(false);
      toast({ title: 'Item aggiunto' });
    },
  });

  const startTimerMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/tasks/${task.id}/timer/start`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', task.id] });
      toast({ title: 'Timer avviato' });
    },
  });

  const stopTimerMutation = useMutation({
    mutationFn: async (logId: string) => {
      return apiRequest(`/api/tasks/${task.id}/timer/stop/${logId}`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', task.id] });
      toast({ title: 'Timer fermato' });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
    },
    onMutate: async (content: string) => {
      await queryClient.cancelQueries({ queryKey: ['/api/tasks', task.id] });
      
      const previousTask = queryClient.getQueryData(['/api/tasks', task.id]);
      
      queryClient.setQueryData(['/api/tasks', task.id], (old: any) => {
        if (!old) return old;
        
        const optimisticComment = {
          id: `temp-${Date.now()}`,
          content,
          createdAt: new Date().toISOString(),
          user: {
            id: currentUser?.id || 'temp-user',
            name: currentUser?.firstName && currentUser?.lastName
              ? `${currentUser.firstName} ${currentUser.lastName}`
              : currentUser?.email || 'Tu',
          },
        };
        
        return {
          ...old,
          comments: [...(old.comments || []), optimisticComment],
        };
      });
      
      return { previousTask };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && query.queryKey[0] === '/api/tasks'
      });
      setNewComment('');
      toast({ title: 'Commento aggiunto' });
    },
    onError: (error: any, _content, context: any) => {
      if (context?.previousTask) {
        queryClient.setQueryData(['/api/tasks', task.id], context.previousTask);
      }
      
      const errorMessage = error?.message || 'Impossibile aggiungere il commento';
      toast({ 
        title: 'Errore', 
        description: errorMessage, 
        variant: 'destructive' 
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-[880px] max-h-[calc(95vh+80px)] overflow-y-auto flex flex-col p-0" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-2">
                <DialogTitle className="text-xl font-semibold">
                  {fullTask.title}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Dettagli e gestione task: {fullTask.title}
                </DialogDescription>
                {activeTimer ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => stopTimerMutation.mutate(activeTimer.id)}
                    disabled={stopTimerMutation.isPending}
                    className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                    data-testid="button-stop-timer"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Stop Timer
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startTimerMutation.mutate()}
                    disabled={startTimerMutation.isPending}
                    className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                    data-testid="button-start-timer"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Timer
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={status.variant} data-testid="badge-status">
                  {status.label}
                </Badge>
                <Badge className={cn('px-2', priority.color)} data-testid="badge-priority">
                  <Flag className="h-3 w-3 mr-1" />
                  {priority.label}
                </Badge>
                {fullTask.linkedWorkflowInstanceId && (
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
                  onClick={() => onEdit(fullTask)}
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
              Commenti ({fullTask.comments?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="attachments" data-testid="tab-attachments">
              <Paperclip className="h-4 w-4 mr-2" />
              Allegati ({attachmentsData.length})
            </TabsTrigger>
            <TabsTrigger value="dependencies" data-testid="tab-dependencies">
              <Link2 className="h-4 w-4 mr-2" />
              Dipendenze
            </TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">
              <Activity className="h-4 w-4 mr-2" />
              Attività
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="details" className="space-y-6 mt-0">
              {fullTask.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Descrizione</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{fullTask.description}</p>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Informazioni Generali */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#FF6900]" />
                    Informazioni
                  </h3>
                  <div className="space-y-2.5">
                    {dueDate && (
                      <div className="flex items-start gap-2 text-sm">
                        <div className="text-gray-500 min-w-[80px]">Scadenza</div>
                        <div className={cn(
                          'font-medium flex-1',
                          isOverdue && 'text-red-600'
                        )}>
                          {format(dueDate, 'PPP', { locale: it })}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-start gap-2 text-sm">
                      <div className="text-gray-500 min-w-[80px]">Creato</div>
                      <div className="font-medium text-gray-900 flex-1">
                        {format(new Date(fullTask.createdAt), 'PPP', { locale: it })}
                      </div>
                    </div>

                    {fullTask.createdBy && (
                      <div className="flex items-start gap-2 text-sm">
                        <div className="text-gray-500 min-w-[80px]">Creato da</div>
                        <div className="font-medium text-gray-900 flex-1">{fullTask.createdBy.name}</div>
                      </div>
                    )}

                    {totalTimeTracked > 0 && (
                      <div className="flex items-start gap-2 text-sm">
                        <div className="text-gray-500 min-w-[80px]">Tempo</div>
                        <div className="font-medium text-gray-900 flex-1">
                          {Math.floor(totalTimeTracked / 60)}h {totalTimeTracked % 60}m
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Team */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="h-4 w-4 text-[#FF6900]" />
                    Team
                  </h3>
                  <div className="space-y-3">
                    {/* Assegnati */}
                    {fullTask.assignees && fullTask.assignees.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Assegnati</div>
                        <div className="space-y-2">
                          {fullTask.assignees.map((assignee) => (
                            <div key={assignee.id} className="flex items-center gap-2.5" data-testid={`assignee-${assignee.id}`}>
                              <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
                                <AvatarFallback className="text-xs bg-gradient-to-br from-[#FF6900] to-[#ff8533] text-white font-semibold">
                                  {(assignee.name || assignee.email || 'U').substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900" data-testid={`text-assignee-name-${assignee.id}`}>
                                  {assignee.name || assignee.email || 'Utente'}
                                </div>
                                <div className="text-xs text-gray-500" data-testid={`text-assignee-role-${assignee.id}`}>
                                  {assignee.role}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Osservatori */}
                    {fullTask.watchers && fullTask.watchers.length > 0 && (
                      <div className={fullTask.assignees && fullTask.assignees.length > 0 ? 'pt-3 border-t border-gray-200' : ''}>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Osservatori</div>
                        <div className="flex flex-wrap gap-1.5">
                          {fullTask.watchers.map((watcher) => (
                            <Badge 
                              key={watcher.id} 
                              variant="secondary" 
                              className="text-xs bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                            >
                              {watcher.name || watcher.email || 'Utente'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {fullTask.tags && fullTask.tags.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {fullTask.tags.map((tag, index) => (
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
              <div className="space-y-2">
                {checklistTotal > 0 && (
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
                )}

                {fullTask.checklist?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors group"
                    data-testid={`checklist-item-${item.id}`}
                  >
                    <button
                      onClick={() => toggleChecklistItemMutation.mutate({ itemId: item.id, currentCompleted: item.completed })}
                      className="flex-shrink-0"
                      data-testid={`button-toggle-${item.id}`}
                    >
                      {item.completed ? (
                        <CheckCircle2 className="h-11 w-11 text-green-600" data-testid={`icon-completed-${item.id}`} />
                      ) : (
                        <Circle className="h-11 w-11 text-gray-400 hover:text-gray-600" data-testid={`icon-pending-${item.id}`} />
                      )}
                    </button>
                    
                    {editingItemId === item.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateChecklistItemMutation.mutate({ itemId: item.id, title: editTitle });
                            } else if (e.key === 'Escape') {
                              setEditingItemId(null);
                            }
                          }}
                          className="h-8"
                          autoFocus
                          data-testid={`input-edit-${item.id}`}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-12 w-12 p-0"
                          onClick={() => updateChecklistItemMutation.mutate({ itemId: item.id, title: editTitle })}
                          data-testid={`button-save-${item.id}`}
                        >
                          <Check className="h-11 w-11" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-12 w-12 p-0"
                          onClick={() => setEditingItemId(null)}
                          data-testid={`button-cancel-${item.id}`}
                        >
                          <X className="h-11 w-11" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span
                          className={cn(
                            'flex-1 text-sm cursor-pointer',
                            item.completed && 'line-through text-gray-500'
                          )}
                          onDoubleClick={() => {
                            setEditingItemId(item.id);
                            setEditTitle(item.title);
                          }}
                          data-testid={`text-checklist-title-${item.id}`}
                        >
                          {item.title}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-12 w-12 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setEditingItemId(item.id);
                            setEditTitle(item.title);
                          }}
                          data-testid={`button-edit-${item.id}`}
                        >
                          <Edit className="h-11 w-11" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-12 w-12 p-0 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteChecklistItemMutation.mutate(item.id)}
                          data-testid={`button-delete-${item.id}`}
                        >
                          <Trash2 className="h-11 w-11" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}

                {isAddingItem ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-blue-500">
                    <Circle className="h-11 w-11 text-gray-400 flex-shrink-0" />
                    <Input
                      value={newItemTitle}
                      onChange={(e) => setNewItemTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newItemTitle.trim()) {
                          addChecklistItemMutation.mutate(newItemTitle);
                        } else if (e.key === 'Escape') {
                          setIsAddingItem(false);
                          setNewItemTitle('');
                        }
                      }}
                      placeholder="Nuovo elemento..."
                      className="h-8"
                      autoFocus
                      data-testid="input-new-item"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-12 w-12 p-0"
                      onClick={() => newItemTitle.trim() && addChecklistItemMutation.mutate(newItemTitle)}
                      disabled={!newItemTitle.trim()}
                      data-testid="button-save-new-item"
                    >
                      <Check className="h-11 w-11" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-12 w-12 p-0"
                      onClick={() => {
                        setIsAddingItem(false);
                        setNewItemTitle('');
                      }}
                      data-testid="button-cancel-new-item"
                    >
                      <X className="h-11 w-11" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setIsAddingItem(true)}
                    data-testid="button-add-item"
                  >
                    <Plus className="h-11 w-11 mr-2" />
                    Aggiungi elemento
                  </Button>
                )}
                
                {checklistTotal === 0 && !isAddingItem && (
                  <div className="text-center py-8 text-gray-500">
                    <ListChecks className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Nessun elemento nella checklist</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="comments" className="space-y-4 mt-0">
              {/* Add Comment Input */}
              <div className="sticky top-0 bg-white pb-4 border-b">
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback className="text-xs bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                      {currentUser?.firstName?.substring(0, 1).toUpperCase() || 'U'}
                      {currentUser?.lastName?.substring(0, 1).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Scrivi un commento..."
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#FF6900] resize-none disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                      rows={3}
                      disabled={addCommentMutation.isPending}
                      data-testid="textarea-new-comment"
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (newComment.trim()) {
                            addCommentMutation.mutate(newComment.trim());
                          }
                        }}
                        disabled={!newComment.trim() || addCommentMutation.isPending}
                        className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                        data-testid="button-add-comment"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {addCommentMutation.isPending ? 'Invio...' : 'Aggiungi Commento'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments Feed */}
              <div className="space-y-4">
                {!fullTask.comments || fullTask.comments.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Nessun commento ancora</p>
                    <p className="text-xs mt-1">Sii il primo a commentare!</p>
                  </div>
                ) : (
                  fullTask.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors" data-testid={`comment-${comment.id}`}>
                      <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                        <AvatarFallback className="text-xs bg-gradient-to-br from-gray-500 to-gray-600 text-white">
                          {comment.user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-gray-900" data-testid={`text-comment-user-${comment.id}`}>
                            {comment.user.name}
                          </span>
                          <span className="text-xs text-gray-500" data-testid={`text-comment-date-${comment.id}`}>
                            {format(new Date(comment.createdAt), 'PPp', { locale: it })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed" data-testid={`text-comment-content-${comment.id}`}>
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="attachments" className="space-y-4 mt-0">
              <AttachmentsTab taskId={task.id} attachments={attachmentsData} />
            </TabsContent>

            <TabsContent value="dependencies" className="mt-0">
              <DependenciesGraph 
                taskId={task.id} 
                availableTasks={availableTasks}
              />
            </TabsContent>

            <TabsContent value="activity" className="space-y-3 mt-0">
              <ActivityFeed taskId={task.id} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function AttachmentsTab({ taskId, attachments }: { taskId: string; attachments: Attachment[] }) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      return apiRequest(`/api/tasks/${taskId}/attachments/${attachmentId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId, 'attachments'] });
      toast({ title: 'Allegato eliminato', description: 'L\'allegato è stato rimosso con successo' });
    },
    onError: () => {
      toast({ title: 'Errore', description: 'Impossibile eliminare l\'allegato', variant: 'destructive' });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`/api/tasks/${taskId}/attachments`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        return response.json();
      });

      await Promise.all(uploadPromises);
      
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId, 'attachments'] });
      toast({ title: 'File caricati', description: `${files.length} file caricati con successo` });
      e.target.value = '';
    } catch (error: any) {
      toast({ title: 'Errore', description: error.message || 'Impossibile caricare i file', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getUserName = (user: { firstName: string | null; lastName: string | null }) => {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Allegati ({attachments.length})</h3>
        <div>
          <Input
            type="file"
            multiple
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
            id="upload-attachments"
            data-testid="input-upload-attachments"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => document.getElementById('upload-attachments')?.click()}
            data-testid="button-upload-attachment"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Caricamento...' : 'Carica file'}
          </Button>
        </div>
      </div>

      {attachments.length === 0 ? (
        <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-lg">
          <Paperclip className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Nessun allegato</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
              data-testid={`attachment-${attachment.id}`}
            >
              <Paperclip className="h-4 w-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate" data-testid={`text-attachment-name-${attachment.id}`}>
                    {attachment.fileName}
                  </p>
                  <span className="text-xs text-gray-500">({formatFileSize(attachment.fileSize)})</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Caricato da {getUserName(attachment.uploadedBy)} il {format(new Date(attachment.uploadedAt), 'PPp', { locale: it })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = `/api/tasks/${taskId}/attachments/${attachment.id}/download`;
                    link.download = attachment.fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  data-testid={`button-download-${attachment.id}`}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Eliminare l'allegato "${attachment.fileName}"?`)) {
                      deleteMutation.mutate(attachment.id);
                    }
                  }}
                  className="text-red-500 hover:text-red-700"
                  data-testid={`button-delete-${attachment.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
