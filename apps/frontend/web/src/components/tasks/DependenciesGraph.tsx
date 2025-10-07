import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SimpleTask {
  id: string;
  title: string;
  status: string;
  priority: string;
}

interface Dependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  dependencyType: string;
  task?: SimpleTask;
  dependsOnTask?: SimpleTask;
}

interface DependenciesGraphProps {
  taskId: string;
  availableTasks?: SimpleTask[];
}

const statusColors: Record<string, string> = {
  todo: '#94a3b8',
  in_progress: '#3b82f6',
  review: '#f59e0b',
  done: '#10b981',
  archived: '#6b7280',
};

export function DependenciesGraph({ taskId, availableTasks = [] }: DependenciesGraphProps) {
  const { toast } = useToast();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedTaskToAdd, setSelectedTaskToAdd] = useState<string>('');
  const [isAddingDependency, setIsAddingDependency] = useState(false);

  const { data: dependencies = [], isLoading, isError, refetch } = useQuery<Dependency[]>({
    queryKey: ['/api/tasks', taskId, 'dependencies'],
    queryFn: () => apiRequest(`/api/tasks/${taskId}/dependencies`),
  });

  const addDependencyMutation = useMutation({
    mutationFn: async (dependsOnTaskId: string) => {
      return apiRequest(`/api/tasks/${taskId}/dependencies`, {
        method: 'POST',
        body: JSON.stringify({
          dependsOnTaskId,
          dependencyType: 'blocks',
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId, 'dependencies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setSelectedTaskToAdd('');
      setIsAddingDependency(false);
      toast({ title: 'Dipendenza aggiunta' });
    },
    onError: () => {
      setIsAddingDependency(false);
      setSelectedTaskToAdd('');
      toast({ 
        title: 'Errore',
        description: 'Impossibile aggiungere la dipendenza',
        variant: 'destructive'
      });
    },
  });

  const removeDependencyMutation = useMutation({
    mutationFn: async (dependencyId: string) => {
      return apiRequest(`/api/tasks/${taskId}/dependencies/${dependencyId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId, 'dependencies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({ title: 'Dipendenza rimossa' });
    },
    onError: () => {
      toast({ 
        title: 'Errore',
        description: 'Impossibile rimuovere la dipendenza',
        variant: 'destructive'
      });
    },
  });

  useEffect(() => {
    if (dependencies.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const taskMap = new Map<string, SimpleTask>();

    dependencies.forEach((dep) => {
      if (dep.task) taskMap.set(dep.task.id, dep.task);
      if (dep.dependsOnTask) taskMap.set(dep.dependsOnTask.id, dep.dependsOnTask);
    });

    const nodePositions = new Map<string, { x: number; y: number }>();
    let currentY = 0;
    const VERTICAL_SPACING = 100;
    const HORIZONTAL_SPACING = 300;

    const processedTasks = new Set<string>();
    const levels = new Map<string, number>();

    const calculateLevel = (task: SimpleTask, level: number = 0): number => {
      if (levels.has(task.id)) return levels.get(task.id)!;
      
      levels.set(task.id, level);
      processedTasks.add(task.id);

      const dependsOn = dependencies.filter(d => d.taskId === task.id);
      dependsOn.forEach(dep => {
        if (dep.dependsOnTask && !processedTasks.has(dep.dependsOnTask.id)) {
          calculateLevel(dep.dependsOnTask, level + 1);
        }
      });

      return level;
    };

    const mainTask = taskMap.get(taskId);
    if (mainTask) {
      calculateLevel(mainTask);
    }

    taskMap.forEach((task) => {
      if (!levels.has(task.id)) {
        calculateLevel(task);
      }
    });

    const levelGroups = new Map<number, SimpleTask[]>();
    levels.forEach((level, taskId) => {
      const task = taskMap.get(taskId);
      if (task) {
        if (!levelGroups.has(level)) levelGroups.set(level, []);
        levelGroups.get(level)!.push(task);
      }
    });

    levelGroups.forEach((tasks, level) => {
      tasks.forEach((task, index) => {
        const y = index * VERTICAL_SPACING;
        const x = level * HORIZONTAL_SPACING;
        nodePositions.set(task.id, { x, y });
      });
    });

    taskMap.forEach((task) => {
      const pos = nodePositions.get(task.id) || { x: 0, y: currentY };
      
      newNodes.push({
        id: task.id,
        type: 'default',
        position: pos,
        data: {
          label: (
            <div className="p-2 min-w-[200px]">
              <div className="font-medium text-sm mb-1">{task.title}</div>
              <div className="flex gap-1">
                <Badge 
                  variant="secondary" 
                  className="text-xs"
                  style={{ 
                    backgroundColor: statusColors[task.status] || '#94a3b8',
                    color: 'white'
                  }}
                >
                  {task.status}
                </Badge>
              </div>
            </div>
          ),
        },
        style: {
          background: task.id === taskId ? '#fef3c7' : 'white',
          border: `2px solid ${task.id === taskId ? '#f59e0b' : '#e5e7eb'}`,
          borderRadius: '8px',
          padding: 0,
        },
      });

      if (!nodePositions.has(task.id)) {
        currentY += VERTICAL_SPACING;
      }
    });

    dependencies.forEach((dep) => {
      newEdges.push({
        id: dep.id,
        source: dep.dependsOnTaskId,
        target: dep.taskId,
        type: 'smoothstep',
        animated: true,
        label: dep.dependencyType === 'blocks' ? 'blocca' : 'dipende',
        style: { stroke: '#3b82f6', strokeWidth: 2 },
        markerEnd: {
          type: 'arrowclosed',
          color: '#3b82f6',
        },
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [dependencies, taskId]);

  const availableToAdd = availableTasks.filter(
    (task) => 
      task.id !== taskId && 
      !dependencies.some(d => d.dependsOnTaskId === task.id)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <p className="text-red-600 font-medium mb-2">Errore caricamento dipendenze</p>
        <p className="text-gray-500 text-sm mb-4">Impossibile caricare le dipendenze del task</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          data-testid="button-retry-dependencies"
        >
          Riprova
        </Button>
      </div>
    );
  }

  if (dependencies.length === 0 && !isAddingDependency) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <p className="text-gray-500 mb-4">Nessuna dipendenza configurata</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddingDependency(true)}
          data-testid="button-start-add-dependency"
        >
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Dipendenza
        </Button>
      </div>
    );
  }

  return (
    <div className="h-96 relative border rounded-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        connectionMode={ConnectionMode.Loose}
        fitView
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Background />
        <Controls />
        
        <Panel position="top-right" className="bg-white p-3 rounded-lg shadow-md">
          {isAddingDependency ? (
            <div className="space-y-2 min-w-[250px]">
              <p className="text-sm font-medium">Aggiungi Dipendenza</p>
              <Select
                value={selectedTaskToAdd}
                onValueChange={setSelectedTaskToAdd}
              >
                <SelectTrigger data-testid="select-dependency-task">
                  <SelectValue placeholder="Seleziona task..." />
                </SelectTrigger>
                <SelectContent>
                  {availableToAdd.map((task) => (
                    <SelectItem 
                      key={task.id} 
                      value={task.id}
                      data-testid={`select-option-dependency-${task.id}`}
                    >
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => addDependencyMutation.mutate(selectedTaskToAdd)}
                  disabled={!selectedTaskToAdd || addDependencyMutation.isPending}
                  data-testid="button-add-dependency"
                >
                  Aggiungi
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingDependency(false);
                    setSelectedTaskToAdd('');
                  }}
                  data-testid="button-cancel-add-dependency"
                >
                  Annulla
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingDependency(true)}
                data-testid="button-show-add-dependency"
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi
              </Button>
              
              {dependencies.length > 0 && (
                <div className="space-y-1 mt-2">
                  <p className="text-xs font-medium text-gray-600">Dipendenze:</p>
                  {dependencies.map((dep) => (
                    <div 
                      key={dep.id} 
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="text-gray-700 truncate">
                        {dep.dependsOnTask?.title || 'Task'}
                      </span>
                      <button
                        onClick={() => removeDependencyMutation.mutate(dep.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                        data-testid={`button-remove-dependency-${dep.id}`}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Panel>
      </ReactFlow>
    </div>
  );
}
