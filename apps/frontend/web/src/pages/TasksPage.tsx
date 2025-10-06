import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, List, LayoutGrid, Grid2X2, BarChart3, GanttChart as GanttIcon } from 'lucide-react';
import { TasksDataTable } from '@/components/tasks/TasksDataTable';
import { TaskFilters, TaskFiltersState } from '@/components/tasks/TaskFilters';
import { TaskDetailDialog } from '@/components/tasks/TaskDetailDialog';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import { TemplateSelector } from '@/components/tasks/TemplateSelector';
import { BulkActionsBar } from '@/components/tasks/BulkActionsBar';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { EisenhowerMatrix } from '@/components/tasks/EisenhowerMatrix';
import { GanttChart } from '@/components/tasks/GanttChart';
import { TaskAnalytics } from '@/components/tasks/TaskAnalytics';
import { LoadingState } from '@w3suite/frontend-kit/components/blocks';
import { EmptyState } from '@w3suite/frontend-kit/components/blocks';
import { ErrorState } from '@w3suite/frontend-kit/components/blocks';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: 'low' | 'medium' | 'high';
  urgency?: 'low' | 'medium' | 'high' | 'critical';
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
  assigneeCount?: number;
  commentCount?: number;
  attachmentCount?: number;
  checklistProgress?: { completed: number; total: number };
}

export default function TasksPage() {
  const { toast } = useToast();
  const { currentUser } = useTenant();
  
  const [currentModule, setCurrentModule] = useState('tasks');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<TaskFiltersState>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'board' | 'matrix' | 'analytics'>('list');
  const [boardView, setBoardView] = useState<'kanban' | 'gantt'>('kanban');

  const { data: tasks = [], isLoading, error } = useQuery<Task[]>({
    queryKey: ['/api/tasks', filters],
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: any) => {
      const { assignees, watchers, checklistItems, attachments, ...taskData } = data;
      
      const createdTask = await apiRequest('/api/tasks/complete', {
        method: 'POST',
        body: JSON.stringify({
          task: taskData,
          assignees: assignees || [],
          watchers: watchers || [],
          checklistItems: checklistItems || [],
        }),
      });

      if (attachments && attachments.length > 0) {
        const uploadPromises = attachments.map(async (file: File) => {
          const formData = new FormData();
          formData.append('file', file);
          
          const response = await fetch(`/api/tasks/${createdTask.id}/attachments`, {
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
      }

      return createdTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setIsCreateDialogOpen(false);
      toast({
        title: 'Task creato',
        description: 'Il task è stato creato con successo con assegnazioni, checklist e allegati',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error?.message || 'Impossibile creare il task',
        variant: 'destructive',
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      return apiRequest(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: 'Stato aggiornato',
        description: 'Lo stato del task è stato modificato con successo',
      });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare lo stato del task',
        variant: 'destructive',
      });
    },
  });

  const duplicateTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest(`/api/tasks/${taskId}/duplicate`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: '✅ Task duplicato',
        description: 'Il task è stato duplicato con successo',
      });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: 'Impossibile duplicare il task',
        variant: 'destructive',
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: any }) => {
      return apiRequest(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: 'Task aggiornato',
        description: 'Il task è stato modificato con successo',
      });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare il task',
        variant: 'destructive',
      });
    },
  });

  const filteredTasks = tasks.filter(task => {
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleStatusChange = (taskId: string, status: string) => {
    updateStatusMutation.mutate({ taskId, status });
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleCloseDetail = () => {
    setSelectedTask(null);
  };

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <ErrorState
          title="Errore caricamento tasks"
          message="Si è verificato un errore durante il caricamento dei tasks"
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['/api/tasks'] })}
        />
      </div>
    );
  }

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="flex-1 flex flex-col min-h-0 bg-white">
      <div className="border-b border-gray-200 bg-white">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
              <p className="text-sm text-gray-600 mt-1">
                Gestisci tutte le tue attività in un'unica vista unificata
              </p>
            </div>
            <div className="flex items-center gap-2">
              <TemplateSelector />
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                data-testid="button-create-task"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Task
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cerca tasks per titolo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>

            <TaskFilters
              filters={filters}
              onChange={setFilters}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-w-0">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="h-full flex flex-col min-w-0">
          <div className="border-b border-gray-200 bg-white px-6">
            <TabsList className="bg-transparent border-b-0 h-12">
              <TabsTrigger value="list" className="data-[state=active]:border-b-2 data-[state=active]:border-windtre-orange rounded-none" data-testid="tab-list">
                <List className="h-4 w-4 mr-2" />
                Lista
              </TabsTrigger>
              <TabsTrigger value="board" className="data-[state=active]:border-b-2 data-[state=active]:border-windtre-orange rounded-none" data-testid="tab-board">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Board
              </TabsTrigger>
              <TabsTrigger value="matrix" className="data-[state=active]:border-b-2 data-[state=active]:border-windtre-orange rounded-none" data-testid="tab-matrix">
                <Grid2X2 className="h-4 w-4 mr-2" />
                Matrice
              </TabsTrigger>
              <TabsTrigger value="analytics" className="data-[state=active]:border-b-2 data-[state=active]:border-windtre-orange rounded-none" data-testid="tab-analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="list" className="flex-1 p-6 m-0">
            {isLoading ? (
              <LoadingState variant="spinner" message="Caricamento tasks..." />
            ) : filteredTasks.length === 0 ? (
              <EmptyState
                title={searchQuery || Object.keys(filters).length > 0 ? "Nessun task trovato" : "Nessun task"}
                description={
                  searchQuery || Object.keys(filters).length > 0
                    ? "Prova a modificare i filtri di ricerca"
                    : "Inizia creando il tuo primo task"
                }
                primaryAction={
                  searchQuery || Object.keys(filters).length > 0
                    ? undefined
                    : {
                        label: 'Crea Task',
                        onClick: () => setIsCreateDialogOpen(true)
                      }
                }
              />
            ) : (
              <TasksDataTable
                tasks={filteredTasks}
                currentUserId={currentUser?.id || ''}
                onTaskClick={handleTaskClick}
                selectedTaskIds={selectedTaskIds}
                onSelectionChange={setSelectedTaskIds}
                onEdit={(taskId) => {
                  const task = filteredTasks.find(t => t.id === taskId);
                  if (task) handleTaskClick(task);
                }}
                onDelete={(taskId) => {
                  if (confirm('Sei sicuro di voler eliminare questo task?')) {
                    updateTaskMutation.mutate({ taskId, updates: { status: 'archived' } });
                  }
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="board" className="flex-1 m-0 flex flex-col">
            <div className="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant={boardView === 'kanban' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBoardView('kanban')}
                  data-testid="button-view-kanban"
                >
                  <LayoutGrid className="h-4 w-4 mr-2" />
                  Kanban
                </Button>
                <Button
                  variant={boardView === 'gantt' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBoardView('gantt')}
                  data-testid="button-view-gantt"
                >
                  <GanttIcon className="h-4 w-4 mr-2" />
                  Gantt
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {isLoading ? (
                <LoadingState variant="spinner" message="Caricamento board..." />
              ) : boardView === 'kanban' ? (
                <KanbanBoard
                  tasks={filteredTasks}
                  onTaskClick={handleTaskClick}
                  onStatusChange={handleStatusChange}
                  onDuplicate={(taskId) => duplicateTaskMutation.mutate(taskId)}
                  onEdit={(taskId) => {
                    const task = filteredTasks.find(t => t.id === taskId);
                    if (task) handleTaskClick(task);
                  }}
                  onDelete={(taskId) => {
                    if (confirm('Sei sicuro di voler eliminare questo task?')) {
                      updateTaskMutation.mutate({ taskId, updates: { status: 'archived' } });
                    }
                  }}
                />
              ) : (
                <GanttChart
                  tasks={filteredTasks}
                  onTaskClick={handleTaskClick}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="matrix" className="flex-1 p-6 m-0">
            {isLoading ? (
              <LoadingState variant="spinner" message="Caricamento matrix..." />
            ) : (
              <EisenhowerMatrix
                tasks={filteredTasks}
                onTaskClick={handleTaskClick}
                onTaskMove={(taskId, newPriority, newUrgency) => {
                  updateTaskMutation.mutate({ 
                    taskId, 
                    updates: { priority: newPriority, urgency: newUrgency }
                  });
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="analytics" className="flex-1 p-6 m-0 overflow-y-auto">
            <TaskAnalytics />
          </TabsContent>
        </Tabs>
      </div>

      <BulkActionsBar
        selectedTaskIds={selectedTaskIds}
        onClearSelection={() => setSelectedTaskIds([])}
      />

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          open={!!selectedTask}
          onClose={handleCloseDetail}
          availableTasks={tasks as Array<{ id: string; title: string; status: string; priority: string }>}
        />
      )}

      <TaskFormDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={(data) => createTaskMutation.mutateAsync(data)}
        isSubmitting={createTaskMutation.isPending}
      />
      </div>
    </Layout>
  );
}
