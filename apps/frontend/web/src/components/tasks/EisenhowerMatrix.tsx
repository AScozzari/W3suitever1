import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  AlertCircle, 
  Clock, 
  Users, 
  Trash2, 
  Eye, 
  Pencil, 
  CheckCircle2, 
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

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
  onTaskComplete?: (taskId: string) => void;
  onTaskEdit?: (taskId: string) => void;
  onTaskDelete?: (taskId: string) => void;
}

type Quadrant = 'do-first' | 'schedule' | 'delegate' | 'eliminate';

const quadrantConfig = {
  'do-first': {
    title: 'DA FARE SUBITO',
    subtitle: 'Urgente e Importante',
    tooltip: 'Attività critiche che richiedono azione immediata. Esempio: scadenze imminenti, crisi, emergenze.',
    icon: AlertCircle,
    bgColor: 'bg-red-50/80',
    borderColor: 'border-red-200',
    headerBg: 'bg-gradient-to-r from-red-500 to-rose-500',
    iconColor: 'text-red-600',
    badgeColor: 'bg-red-100 text-red-700',
    priority: 'high' as const,
    urgency: ['critical', 'high'] as const,
  },
  'schedule': {
    title: 'PIANIFICA',
    subtitle: 'Importante ma Non Urgente',
    tooltip: 'Attività strategiche per il lungo termine. Esempio: pianificazione, formazione, sviluppo relazioni.',
    icon: Clock,
    bgColor: 'bg-blue-50/80',
    borderColor: 'border-blue-200',
    headerBg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    iconColor: 'text-blue-600',
    badgeColor: 'bg-blue-100 text-blue-700',
    priority: 'high' as const,
    urgency: ['medium', 'low'] as const,
  },
  'delegate': {
    title: 'DELEGA',
    subtitle: 'Urgente ma Non Importante',
    tooltip: 'Attività che richiedono attenzione ma possono essere delegate. Esempio: alcune email, riunioni, interruzioni.',
    icon: Users,
    bgColor: 'bg-amber-50/80',
    borderColor: 'border-amber-200',
    headerBg: 'bg-gradient-to-r from-amber-500 to-orange-500',
    iconColor: 'text-amber-600',
    badgeColor: 'bg-amber-100 text-amber-700',
    priority: 'medium' as const,
    urgency: ['critical', 'high'] as const,
  },
  'eliminate': {
    title: 'ELIMINA',
    subtitle: 'Né Urgente né Importante',
    tooltip: 'Attività da eliminare o ridurre al minimo. Esempio: distrazioni, perdite di tempo, attività superflue.',
    icon: Trash2,
    bgColor: 'bg-gray-50/80',
    borderColor: 'border-gray-200',
    headerBg: 'bg-gradient-to-r from-gray-500 to-slate-500',
    iconColor: 'text-gray-600',
    badgeColor: 'bg-gray-100 text-gray-700',
    priority: 'low' as const,
    urgency: ['medium', 'low'] as const,
  },
};

interface TaskCardCompactProps {
  task: MatrixTask;
  onView: () => void;
  onEdit?: () => void;
  onComplete?: () => void;
  onDelete?: () => void;
  quadrantColor: string;
}

function TaskCardCompact({ task, onView, onEdit, onComplete, onDelete, quadrantColor }: TaskCardCompactProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedDueDate = task.dueDate
    ? formatDistanceToNow(new Date(task.dueDate), { addSuffix: true, locale: it })
    : null;

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  return (
    <div
      className={cn(
        'bg-white rounded-lg border shadow-sm transition-all duration-200',
        'hover:shadow-md cursor-pointer',
        isExpanded ? 'ring-2 ring-offset-1' : '',
        quadrantColor
      )}
      data-testid={`matrix-task-${task.id}`}
    >
      {/* Header compatto - sempre visibile */}
      <div
        className="p-3 flex items-start justify-between gap-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-gray-900 truncate leading-tight">
            {task.title}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            {formattedDueDate && (
              <span className={cn(
                'text-xs flex items-center gap-0.5',
                isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
              )}>
                <Calendar className="h-3 w-3" />
                {formattedDueDate}
              </span>
            )}
            {task.assigneeCount && task.assigneeCount > 0 && (
              <span className="text-xs text-gray-500 flex items-center gap-0.5">
                <User className="h-3 w-3" />
                {task.assigneeCount}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          data-testid={`toggle-expand-${task.id}`}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </Button>
      </div>

      {/* Dettagli espansi */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100">
          {/* Descrizione */}
          {task.description && (
            <p className="text-xs text-gray-600 mt-2 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {task.tags.slice(0, 3).map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="text-[0.625rem] px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
              {task.tags.length > 3 && (
                <Badge variant="outline" className="text-[0.625rem] px-1.5 py-0">
                  +{task.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Azioni shortcut */}
          <div className="flex items-center gap-1 mt-3 pt-2 border-t border-gray-100">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView();
                    }}
                    data-testid={`view-task-${task.id}`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Vedi
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Apri dettagli completi
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {onEdit && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1 text-gray-600 hover:text-amber-600 hover:bg-amber-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                      }}
                      data-testid={`edit-task-${task.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Modifica
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Modifica attività
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {onComplete && task.status !== 'done' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1 text-gray-600 hover:text-green-600 hover:bg-green-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        onComplete();
                      }}
                      data-testid={`complete-task-${task.id}`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Fatto
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Segna come completato
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {onDelete && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1 text-gray-600 hover:text-red-600 hover:bg-red-50 ml-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Sei sicuro di voler eliminare questa attività?')) {
                          onDelete();
                        }
                      }}
                      data-testid={`delete-task-${task.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Elimina attività
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function EisenhowerMatrix({ 
  tasks, 
  onTaskClick, 
  onTaskMove, 
  onTaskComplete,
  onTaskEdit,
  onTaskDelete 
}: EisenhowerMatrixProps) {
  const [draggedTask, setDraggedTask] = useState<MatrixTask | null>(null);
  const [dragOverQuadrant, setDragOverQuadrant] = useState<Quadrant | null>(null);
  const [mobileActiveQuadrant, setMobileActiveQuadrant] = useState<Quadrant>('do-first');

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

  const renderQuadrant = (quadrant: Quadrant, isMobile = false) => {
    const config = quadrantConfig[quadrant];
    const quadrantTasks = tasksByQuadrant[quadrant] || [];
    const Icon = config.icon;
    const isDragOver = dragOverQuadrant === quadrant;

    return (
      <div
        key={quadrant}
        className={cn(
          'flex flex-col rounded-xl overflow-hidden border-2 transition-all duration-200',
          config.bgColor,
          config.borderColor,
          isDragOver && 'ring-4 ring-blue-400/50 scale-[1.01] shadow-lg',
          isMobile ? 'h-full' : 'h-full min-h-[18.75rem]'
        )}
        onDragOver={(e) => handleDragOver(e, quadrant)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, quadrant)}
        data-testid={`quadrant-${quadrant}`}
      >
        {/* Header del quadrante */}
        <div className={cn('px-4 py-3 text-white', config.headerBg)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              <h3 className="font-bold text-sm tracking-wide">{config.title}</h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 text-white hover:bg-white/30 text-xs">
                {quadrantTasks.length}
              </Badge>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 opacity-80 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[14rem] text-xs">
                    <p className="font-semibold mb-1">{config.subtitle}</p>
                    <p>{config.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <p className="text-xs opacity-90 mt-1">{config.subtitle}</p>
        </div>

        {/* Lista task con scroll indipendente */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {quadrantTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
              <Icon className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nessuna attività</p>
              <p className="text-xs mt-1">Trascina qui le attività</p>
            </div>
          ) : (
            quadrantTasks.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task)}
                onDragEnd={handleDragEnd}
                className="cursor-move"
              >
                <TaskCardCompact
                  task={task}
                  onView={() => onTaskClick(task)}
                  onEdit={onTaskEdit ? () => onTaskEdit(task.id) : undefined}
                  onComplete={onTaskComplete ? () => onTaskComplete(task.id) : undefined}
                  onDelete={onTaskDelete ? () => onTaskDelete(task.id) : undefined}
                  quadrantColor={`ring-${quadrant === 'do-first' ? 'red' : quadrant === 'schedule' ? 'blue' : quadrant === 'delegate' ? 'amber' : 'gray'}-400`}
                />
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-xl font-bold text-gray-900">Matrice di Eisenhower</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[18rem] text-xs">
                <p className="font-semibold mb-2">Come funziona?</p>
                <ul className="space-y-1">
                  <li><strong>Importanza:</strong> Quanto contribuisce ai tuoi obiettivi</li>
                  <li><strong>Urgenza:</strong> Quanto richiede attenzione immediata</li>
                </ul>
                <p className="mt-2 text-gray-500">Trascina le attività tra i quadranti per riclassificarle.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-sm text-gray-600">
          Organizza le attività per importanza e urgenza. Trascina per riclassificare.
        </p>
      </div>

      {/* Desktop: Griglia 2x2 */}
      <div className="hidden md:grid md:grid-cols-2 gap-4 flex-1 min-h-0">
        {renderQuadrant('do-first')}
        {renderQuadrant('schedule')}
        {renderQuadrant('delegate')}
        {renderQuadrant('eliminate')}
      </div>

      {/* Mobile: Tab per switchare quadranti */}
      <div className="md:hidden flex flex-col flex-1 min-h-0">
        <Tabs 
          value={mobileActiveQuadrant} 
          onValueChange={(v) => setMobileActiveQuadrant(v as Quadrant)}
          className="flex flex-col flex-1"
        >
          <TabsList className="grid grid-cols-4 mb-3">
            <TabsTrigger value="do-first" className="text-xs px-1 data-[state=active]:bg-red-100">
              <AlertCircle className="h-3.5 w-3.5 mr-1" />
              <span className="hidden xs:inline">Subito</span>
              <Badge variant="secondary" className="ml-1 h-4 min-w-4 text-[0.625rem] px-1">
                {(tasksByQuadrant['do-first'] || []).length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs px-1 data-[state=active]:bg-blue-100">
              <Clock className="h-3.5 w-3.5 mr-1" />
              <span className="hidden xs:inline">Pianifica</span>
              <Badge variant="secondary" className="ml-1 h-4 min-w-4 text-[0.625rem] px-1">
                {(tasksByQuadrant['schedule'] || []).length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="delegate" className="text-xs px-1 data-[state=active]:bg-amber-100">
              <Users className="h-3.5 w-3.5 mr-1" />
              <span className="hidden xs:inline">Delega</span>
              <Badge variant="secondary" className="ml-1 h-4 min-w-4 text-[0.625rem] px-1">
                {(tasksByQuadrant['delegate'] || []).length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="eliminate" className="text-xs px-1 data-[state=active]:bg-gray-100">
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              <span className="hidden xs:inline">Elimina</span>
              <Badge variant="secondary" className="ml-1 h-4 min-w-4 text-[0.625rem] px-1">
                {(tasksByQuadrant['eliminate'] || []).length}
              </Badge>
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 min-h-0">
            {renderQuadrant(mobileActiveQuadrant, true)}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
