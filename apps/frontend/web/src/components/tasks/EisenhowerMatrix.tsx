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
  Info,
  Tag,
  Timer,
  ListChecks,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow, differenceInDays, differenceInHours } from 'date-fns';
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
  creatorName?: string;
  assigneeCount?: number;
  assigneeNames?: string[];
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

  // Calcola timing dalla creazione
  const taskAge = formatDistanceToNow(new Date(task.createdAt), { locale: it });
  
  // Calcola stato scadenza con colori: rosso scaduta, arancione 2-3gg, verde >3gg
  const getDueDateStatus = () => {
    if (!task.dueDate || task.status === 'done') return null;
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const daysUntilDue = differenceInDays(dueDate, now);
    const hoursUntilDue = differenceInHours(dueDate, now);
    
    if (hoursUntilDue < 0) {
      return { status: 'overdue', label: 'Scaduta', color: 'text-red-600 bg-red-100', icon: '🔴' };
    } else if (daysUntilDue <= 1) {
      return { status: 'urgent', label: 'Oggi/Domani', color: 'text-amber-600 bg-amber-100', icon: '🟠' };
    } else if (daysUntilDue <= 3) {
      return { status: 'soon', label: `${daysUntilDue}g`, color: 'text-orange-500 bg-orange-100', icon: '🟠' };
    }
    return { status: 'ok', label: `${daysUntilDue}g`, color: 'text-green-600 bg-green-100', icon: '🟢' };
  };
  
  const dueDateStatus = getDueDateStatus();
  const formattedDueDate = task.dueDate
    ? formatDistanceToNow(new Date(task.dueDate), { addSuffix: true, locale: it })
    : null;

  // Calcola progresso checklist
  const checklistPercent = task.checklistProgress 
    ? Math.round((task.checklistProgress.completed / task.checklistProgress.total) * 100)
    : 0;

  const handleCardClick = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div
      className={cn(
        'bg-white rounded-xl border-2 shadow-sm transition-all duration-200',
        'hover:shadow-lg cursor-pointer group',
        isExpanded ? 'ring-2 ring-blue-400 ring-offset-2 shadow-md' : 'hover:border-gray-300',
        quadrantColor
      )}
      onClick={handleCardClick}
      data-testid={`matrix-task-${task.id}`}
    >
      {/* Card principale - sempre visibile */}
      <div className="p-4">
        {/* Titolo e chevron */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h4 className="font-semibold text-sm text-gray-900 leading-snug line-clamp-2 flex-1">
            {task.title}
          </h4>
          <div className={cn(
            'shrink-0 transition-transform duration-200',
            isExpanded ? 'rotate-180' : ''
          )}>
            <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
          </div>
        </div>

        {/* Info row 1: Creatore con data creazione */}
        <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
          {task.creatorName && (
            <div className="flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-blue-500" />
              <span className="font-medium text-gray-700">{task.creatorName}</span>
            </div>
          )}
          <span className="text-gray-400">•</span>
          <div className="flex items-center gap-1 text-gray-500">
            <Calendar className="h-3 w-3" />
            <span>{new Date(task.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}</span>
          </div>
        </div>

        {/* Info row 2: Scadenza con alert colorato + Assegnati */}
        <div className="flex items-center justify-between text-xs mb-3">
          <div className="flex items-center gap-3">
            {dueDateStatus && (
              <div className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-md font-medium',
                dueDateStatus.color
              )}>
                <span className="text-sm">{dueDateStatus.icon}</span>
                <span>Scade {formattedDueDate}</span>
              </div>
            )}
            {!dueDateStatus && task.dueDate && (
              <div className="flex items-center gap-1 text-gray-500">
                <Calendar className="h-3.5 w-3.5" />
                <span>Scade {formattedDueDate}</span>
              </div>
            )}
          </div>
          {task.assigneeCount && task.assigneeCount > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-gray-500">
                    <Users className="h-3.5 w-3.5" />
                    <span>{task.assigneeCount}</span>
                  </div>
                </TooltipTrigger>
                {task.assigneeNames && task.assigneeNames.length > 0 && (
                  <TooltipContent side="top" className="text-xs">
                    {task.assigneeNames.join(', ')}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Checklist progress bar */}
        {task.checklistProgress && task.checklistProgress.total > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <div className="flex items-center gap-1">
                <ListChecks className="h-3.5 w-3.5" />
                <span>Checklist</span>
              </div>
              <span className="font-medium">
                {task.checklistProgress.completed}/{task.checklistProgress.total}
              </span>
            </div>
            <Progress value={checklistPercent} className="h-1.5" />
          </div>
        )}

        {/* Tags - sempre visibili con colori */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {task.tags.map((tag, idx) => {
              const tagColors = [
                'bg-blue-100 text-blue-700 border-blue-200',
                'bg-purple-100 text-purple-700 border-purple-200',
                'bg-green-100 text-green-700 border-green-200',
                'bg-pink-100 text-pink-700 border-pink-200',
                'bg-orange-100 text-orange-700 border-orange-200',
                'bg-teal-100 text-teal-700 border-teal-200',
              ];
              const colorClass = tagColors[idx % tagColors.length];
              return (
                <span 
                  key={idx} 
                  className={cn(
                    'text-[0.625rem] px-2 py-0.5 rounded-full font-medium border',
                    colorClass
                  )}
                >
                  {tag}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Dropdown espanso con azioni */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
          {/* Descrizione */}
          {task.description && (
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs text-gray-600 line-clamp-3">
                {task.description}
              </p>
            </div>
          )}

          {/* Azioni - stile link cliccabile */}
          <div className="px-4 py-3 flex items-center justify-between gap-2">
            <button
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium flex items-center gap-1"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              data-testid={`view-task-${task.id}`}
            >
              <Eye className="h-3.5 w-3.5" />
              Dettagli completi
            </button>

            <div className="flex items-center gap-3">
              {onEdit && (
                <button
                  className="text-xs text-gray-500 hover:text-amber-600 hover:underline flex items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  data-testid={`edit-task-${task.id}`}
                >
                  <Pencil className="h-3 w-3" />
                  Modifica
                </button>
              )}

              {onComplete && task.status !== 'done' && (
                <button
                  className="text-xs text-gray-500 hover:text-green-600 hover:underline flex items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onComplete();
                  }}
                  data-testid={`complete-task-${task.id}`}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Completa
                </button>
              )}

              {onDelete && (
                <button
                  className="text-xs text-gray-500 hover:text-red-600 hover:underline flex items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Sei sicuro di voler eliminare questa attività?')) {
                      onDelete();
                    }
                  }}
                  data-testid={`delete-task-${task.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                  Elimina
                </button>
              )}
            </div>
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
  
  // Stato ordinamento per quadrante: 'desc' = più recenti prima, 'asc' = più vecchie prima
  const [sortOrder, setSortOrder] = useState<Record<Quadrant, 'asc' | 'desc'>>({
    'do-first': 'desc',
    'schedule': 'desc',
    'delegate': 'desc',
    'eliminate': 'desc'
  });
  
  const toggleSortOrder = (quadrant: Quadrant) => {
    setSortOrder(prev => ({
      ...prev,
      [quadrant]: prev[quadrant] === 'desc' ? 'asc' : 'desc'
    }));
  };

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
    const rawTasks = tasksByQuadrant[quadrant] || [];
    const Icon = config.icon;
    const isDragOver = dragOverQuadrant === quadrant;
    const currentSortOrder = sortOrder[quadrant];
    
    // Ordina task per data creazione
    const quadrantTasks = [...rawTasks].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return currentSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

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
        {/* Header del quadrante con toggle ordinamento */}
        <div className={cn('px-4 py-3 text-white', config.headerBg)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              <h3 className="font-bold text-sm tracking-wide">{config.title}</h3>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => toggleSortOrder(quadrant)}
                      className="p-1 rounded hover:bg-white/20 transition-colors"
                      data-testid={`sort-${quadrant}`}
                    >
                      {currentSortOrder === 'desc' ? (
                        <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUp className="h-4 w-4" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {currentSortOrder === 'desc' ? 'Più recenti prima' : 'Più vecchie prima'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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

        {/* Lista task con scroll indipendente - max-height per garantire scroll */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{ maxHeight: isMobile ? 'calc(100vh - 20rem)' : '25rem' }}>
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
