import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTenant } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { TasksDataTable } from '@/components/tasks/TasksDataTable';
import { TaskFilters, TaskFiltersState } from '@/components/tasks/TaskFilters';
import { TaskDetailDialog } from '@/components/tasks/TaskDetailDialog';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import { TemplateSelector } from '@/components/tasks/TemplateSelector';
import { BulkActionsBar } from '@/components/tasks/BulkActionsBar';
import { LoadingState } from '@w3suite/frontend-kit/components/blocks';
import { EmptyState } from '@w3suite/frontend-kit/components/blocks';
import { ErrorState } from '@w3suite/frontend-kit/components/blocks';

interface Task {
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
  assigneeCount?: number;
  commentCount?: number;
  attachmentCount?: number;
  checklistProgress?: { completed: number; total: number };
}

export default function TasksPage() {
  const { toast } = useToast();
  const { user } = useTenant();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<TaskFiltersState>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const { data: tasks = [], isLoading, error } = useQuery<Task[]>({
    queryKey: ['/api/tasks', filters],
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      return apiRequest('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setIsCreateDialogOpen(false);
      toast({
        title: 'Task creato',
        description: 'Il task è stato creato con successo',
      });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: 'Impossibile creare il task',
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

      <div className="flex-1 overflow-y-auto p-6">
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
            currentUserId={user?.id || ''}
            onTaskClick={handleTaskClick}
            selectedTaskIds={selectedTaskIds}
            onSelectionChange={setSelectedTaskIds}
          />
        )}
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
        />
      )}

      <TaskFormDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={(data) => createTaskMutation.mutateAsync(data)}
        isSubmitting={createTaskMutation.isPending}
      />
    </div>
  );
}
