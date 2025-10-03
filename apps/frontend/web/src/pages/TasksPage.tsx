import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  LayoutGrid, 
  List, 
  Calendar as CalendarIcon,
  Eye,
  User,
  Clock
} from 'lucide-react';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskFilters, TaskFiltersState } from '@/components/tasks/TaskFilters';
import { TaskDetailDialog } from '@/components/tasks/TaskDetailDialog';
import { LoadingState } from '@w3suite/frontend-kit/components/blocks';
import { EmptyState } from '@w3suite/frontend-kit/components/blocks';
import { ErrorState } from '@w3suite/frontend-kit/components/blocks';

type ViewMode = 'list' | 'grid' | 'kanban' | 'calendar';
type TaskTab = 'my-tasks' | 'created' | 'watching';

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
  
  const [activeTab, setActiveTab] = useState<TaskTab>('my-tasks');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<TaskFiltersState>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [sortBy, setSortBy] = useState<string>('created_desc');

  const { data: tasks, isLoading, error } = useQuery<Task[]>({
    queryKey: ['/api/tasks', activeTab, filters, sortBy],
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

  const filteredTasks = tasks?.filter(task => {
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filters.status && task.status !== filters.status) {
      return false;
    }
    if (filters.priority && task.priority !== filters.priority) {
      return false;
    }
    if (filters.assignedTo) {
      const isAssigned = task.assignees?.some(a => a.id === filters.assignedTo);
      if (!isAssigned) return false;
    }
    if (filters.dueDateFrom && task.dueDate) {
      if (new Date(task.dueDate) < filters.dueDateFrom) return false;
    }
    if (filters.dueDateTo && task.dueDate) {
      if (new Date(task.dueDate) > filters.dueDateTo) return false;
    }
    if (filters.linkedToWorkflow !== undefined) {
      const hasWorkflow = !!task.linkedWorkflowInstanceId;
      if (filters.linkedToWorkflow !== hasWorkflow) return false;
    }
    return true;
  }) || [];

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case 'created_desc':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'created_asc':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'due_date_asc':
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      case 'due_date_desc':
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      case 'priority':
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority as keyof typeof priorityOrder] - 
               priorityOrder[b.priority as keyof typeof priorityOrder];
      case 'title':
        return a.title.localeCompare(b.title);
      default:
        return 0;
    }
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
                Gestisci le tue attività e collabora con il team
              </p>
            </div>
            <Button data-testid="button-create-task">
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Task
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TaskTab)}>
            <TabsList>
              <TabsTrigger value="my-tasks" data-testid="tab-my-tasks">
                <User className="h-4 w-4 mr-2" />
                I Miei Task
              </TabsTrigger>
              <TabsTrigger value="created" data-testid="tab-created">
                <Clock className="h-4 w-4 mr-2" />
                Creati da me
              </TabsTrigger>
              <TabsTrigger value="watching" data-testid="tab-watching">
                <Eye className="h-4 w-4 mr-2" />
                In osservazione
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="px-6 py-3 border-t border-gray-100">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cerca tasks..."
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

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]" data-testid="select-sort">
                <SelectValue placeholder="Ordina per" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_desc">Più recenti</SelectItem>
                <SelectItem value="created_asc">Meno recenti</SelectItem>
                <SelectItem value="due_date_asc">Scadenza (prima)</SelectItem>
                <SelectItem value="due_date_desc">Scadenza (dopo)</SelectItem>
                <SelectItem value="priority">Priorità</SelectItem>
                <SelectItem value="title">Titolo</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 ml-auto">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                data-testid="button-view-list"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                data-testid="button-view-grid"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                data-testid="button-view-calendar"
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <LoadingState variant="spinner" message="Caricamento tasks..." />
        ) : sortedTasks.length === 0 ? (
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
                    onClick: () => {}
                  }
            }
          />
        ) : (
          <div className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-3'
          }>
            {sortedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                variant={viewMode === 'list' ? 'compact' : 'default'}
                onClick={() => handleTaskClick(task)}
                onStatusChange={(status) => handleStatusChange(task.id, status)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          open={!!selectedTask}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}
