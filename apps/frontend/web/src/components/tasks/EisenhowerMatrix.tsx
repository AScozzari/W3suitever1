import { useState } from 'react';
import { TaskCard } from './TaskCard';
import { cn } from '@/lib/utils';
import { AlertCircle, Clock, Zap, Trash2 } from 'lucide-react';

export interface MatrixTask {
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
}

interface EisenhowerMatrixProps {
  tasks: MatrixTask[];
  onTaskClick: (task: MatrixTask) => void;
  onTaskMove?: (taskId: string, newPriority: 'low' | 'medium' | 'high', newUrgency: 'low' | 'medium' | 'high' | 'critical') => void;
}

type Quadrant = 'do-first' | 'schedule' | 'delegate' | 'eliminate';

const quadrantConfig = {
  'do-first': {
    title: 'DO FIRST',
    subtitle: 'Urgente e Importante',
    icon: AlertCircle,
    color: 'bg-red-50 border-red-200',
    headerColor: 'bg-red-100 text-red-900',
    iconColor: 'text-red-600',
    priority: 'high' as const,
    urgency: ['critical', 'high'] as const,
  },
  'schedule': {
    title: 'SCHEDULE',
    subtitle: 'Importante ma Non Urgente',
    icon: Clock,
    color: 'bg-orange-50 border-orange-200',
    headerColor: 'bg-orange-100 text-orange-900',
    iconColor: 'text-orange-600',
    priority: 'high' as const,
    urgency: ['medium', 'low'] as const,
  },
  'delegate': {
    title: 'DELEGATE',
    subtitle: 'Urgente ma Non Importante',
    icon: Zap,
    color: 'bg-yellow-50 border-yellow-200',
    headerColor: 'bg-yellow-100 text-yellow-900',
    iconColor: 'text-yellow-600',
    priority: 'medium' as const,
    urgency: ['critical', 'high'] as const,
  },
  'eliminate': {
    title: 'ELIMINATE',
    subtitle: 'Né Urgente né Importante',
    icon: Trash2,
    color: 'bg-gray-50 border-gray-200',
    headerColor: 'bg-gray-100 text-gray-900',
    iconColor: 'text-gray-600',
    priority: 'low' as const,
    urgency: ['medium', 'low'] as const,
  },
};

export function EisenhowerMatrix({ tasks, onTaskClick, onTaskMove }: EisenhowerMatrixProps) {
  const [draggedTask, setDraggedTask] = useState<MatrixTask | null>(null);
  const [dragOverQuadrant, setDragOverQuadrant] = useState<Quadrant | null>(null);

  const categorizeTask = (task: MatrixTask): Quadrant => {
    const priority = task.priority || 'medium';
    const urgency = task.urgency || 'medium';

    if (priority === 'high') {
      if (urgency === 'critical' || urgency === 'high') {
        return 'do-first';
      }
      return 'schedule';
    } else if (priority === 'medium') {
      if (urgency === 'critical' || urgency === 'high') {
        return 'delegate';
      }
      return 'eliminate';
    } else {
      return 'eliminate';
    }
  };

  const tasksByQuadrant = tasks.reduce((acc, task) => {
    const quadrant = categorizeTask(task);
    if (!acc[quadrant]) acc[quadrant] = [];
    acc[quadrant].push(task);
    return acc;
  }, {} as Record<Quadrant, MatrixTask[]>);

  const handleDragStart = (e: React.DragEvent, task: MatrixTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, quadrant: Quadrant) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverQuadrant(quadrant);
  };

  const handleDragLeave = () => {
    setDragOverQuadrant(null);
  };

  const handleDrop = (e: React.DragEvent, quadrant: Quadrant) => {
    e.preventDefault();
    setDragOverQuadrant(null);

    if (!draggedTask || !onTaskMove) return;

    const config = quadrantConfig[quadrant];
    const newPriority = config.priority;
    const newUrgency = config.urgency[0];

    if (categorizeTask(draggedTask) !== quadrant) {
      onTaskMove(draggedTask.id, newPriority, newUrgency);
    }

    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverQuadrant(null);
  };

  const renderQuadrant = (quadrant: Quadrant) => {
    const config = quadrantConfig[quadrant];
    const quadrantTasks = tasksByQuadrant[quadrant] || [];
    const Icon = config.icon;
    const isDragOver = dragOverQuadrant === quadrant;

    return (
      <div
        key={quadrant}
        className={cn(
          'border-2 rounded-lg overflow-hidden flex flex-col transition-all',
          config.color,
          isDragOver && 'ring-4 ring-blue-400 ring-opacity-50 scale-[1.02]'
        )}
        onDragOver={(e) => handleDragOver(e, quadrant)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, quadrant)}
        data-testid={`quadrant-${quadrant}`}
      >
        <div className={cn('p-4', config.headerColor)}>
          <div className="flex items-center gap-2 mb-1">
            <Icon className={cn('h-5 w-5', config.iconColor)} />
            <h3 className="font-bold text-lg">{config.title}</h3>
          </div>
          <p className="text-sm opacity-80">{config.subtitle}</p>
          <div className="mt-2 text-xs font-medium">
            {quadrantTasks.length} task{quadrantTasks.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[300px]">
          {quadrantTasks.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Nessun task in questo quadrante
            </div>
          ) : (
            quadrantTasks.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task)}
                onDragEnd={handleDragEnd}
                className="cursor-move transition-transform hover:scale-[1.02]"
                data-testid={`matrix-task-${task.id}`}
              >
                <TaskCard
                  task={task}
                  onClick={() => onTaskClick(task)}
                />
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Eisenhower Matrix</h2>
        <p className="text-sm text-gray-600">
          Organizza i task per priorità e urgenza. Trascina i task tra i quadranti per riclassificarli.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 h-[calc(100%-6rem)]">
        {renderQuadrant('do-first')}
        {renderQuadrant('schedule')}
        {renderQuadrant('delegate')}
        {renderQuadrant('eliminate')}
      </div>
    </div>
  );
}
