import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addDays, differenceInDays, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Flag, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface GanttTask {
  id: string;
  title: string;
  status: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date | string | null;
  createdAt: Date | string;
  linkedWorkflowInstanceId?: string | null;
  dependencies?: string[];
}

interface GanttChartProps {
  tasks: GanttTask[];
  onTaskClick: (task: GanttTask) => void;
}

const statusColors = {
  todo: 'bg-gray-400',
  in_progress: 'bg-blue-500',
  review: 'bg-purple-500',
  done: 'bg-green-500',
  archived: 'bg-gray-300',
};

const priorityColors = {
  low: 'border-gray-400',
  medium: 'border-orange-400',
  high: 'border-red-500',
};

export function GanttChart({ tasks, onTaskClick }: GanttChartProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { timelineDays, visibleTasks } = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const tasksWithDates = tasks
      .filter(task => task.dueDate)
      .map(task => ({
        ...task,
        startDate: new Date(task.createdAt),
        endDate: task.dueDate ? new Date(task.dueDate) : addDays(new Date(task.createdAt), 7),
      }))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    return {
      timelineDays: days,
      visibleTasks: tasksWithDates,
    };
  }, [tasks, currentMonth]);

  const getTaskPosition = (task: typeof visibleTasks[0]) => {
    const monthStart = startOfMonth(currentMonth);
    const startDay = differenceInDays(task.startDate, monthStart);
    const duration = differenceInDays(task.endDate, task.startDate) + 1;

    return {
      left: Math.max(0, startDay),
      width: duration,
      isVisible: startDay < timelineDays.length && startDay + duration > 0,
    };
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prev => addDays(startOfMonth(prev), -1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addDays(endOfMonth(prev), 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  const today = new Date();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Gantt Chart</h2>
          <p className="text-sm text-gray-600">
            Visualizza la timeline e le dipendenze dei task
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevMonth} data-testid="button-prev-month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday} data-testid="button-today">
            Oggi
          </Button>
          <div className="px-4 py-2 bg-gray-100 rounded-md font-medium text-sm">
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </div>
          <Button variant="outline" size="sm" onClick={handleNextMonth} data-testid="button-next-month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden flex flex-col bg-white">
        <div className="flex border-b border-gray-200 bg-gray-50">
          <div className="w-64 p-3 font-semibold text-sm text-gray-700 border-r border-gray-200 flex-shrink-0">
            Task
          </div>
          <div className="flex-1 flex overflow-x-auto">
            {timelineDays.map((day, index) => {
              const isToday = isSameDay(day, today);
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;

              return (
                <div
                  key={index}
                  className={cn(
                    'flex-shrink-0 w-12 p-2 text-center border-r border-gray-200',
                    isWeekend && 'bg-gray-100',
                    isToday && 'bg-blue-50 border-blue-300'
                  )}
                  data-testid={`gantt-day-${index}`}
                >
                  <div className={cn('text-xs font-medium', isToday && 'text-blue-600')}>
                    {format(day, 'EEE', { locale: it })}
                  </div>
                  <div className={cn('text-xs', isToday && 'text-blue-600 font-bold')}>
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {visibleTasks.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              Nessun task con scadenza in questo mese
            </div>
          ) : (
            visibleTasks.map((task) => {
              const position = getTaskPosition(task);
              if (!position.isVisible) return null;

              return (
                <div
                  key={task.id}
                  className="flex border-b border-gray-100 hover:bg-gray-50 group"
                  data-testid={`gantt-row-${task.id}`}
                >
                  <div className="w-64 p-3 border-r border-gray-200 flex-shrink-0 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {task.title}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Badge
                          variant="outline"
                          className={cn('text-xs px-1 h-5', priorityColors[task.priority])}
                        >
                          <Flag className="h-3 w-3" />
                        </Badge>
                        {task.linkedWorkflowInstanceId && (
                          <Badge variant="outline" className="text-xs px-1 h-5">
                            <Link2 className="h-3 w-3" />
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 relative" style={{ height: '60px' }}>
                    <div className="absolute inset-0 flex">
                      {timelineDays.map((_, index) => (
                        <div
                          key={index}
                          className="flex-shrink-0 w-12 border-r border-gray-100"
                        />
                      ))}
                    </div>

                    <div
                      className={cn(
                        'absolute top-1/2 -translate-y-1/2 h-8 rounded-md cursor-pointer',
                        'transition-all group-hover:shadow-md border-2',
                        statusColors[task.status as keyof typeof statusColors] || statusColors.todo,
                        priorityColors[task.priority]
                      )}
                      style={{
                        left: `${position.left * 48}px`,
                        width: `${position.width * 48}px`,
                        minWidth: '48px',
                      }}
                      onClick={() => onTaskClick(task)}
                      data-testid={`gantt-bar-${task.id}`}
                    >
                      <div className="px-2 py-1 text-xs text-white font-medium truncate">
                        {task.title}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-400 rounded"></div>
          <span className="text-gray-600">Da fare</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span className="text-gray-600">In corso</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-500 rounded"></div>
          <span className="text-gray-600">In revisione</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-gray-600">Completato</span>
        </div>
      </div>
    </div>
  );
}
