import { useState, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Clock, Users, AlertTriangle, Coffee } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, isSameDay, addWeeks, addMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Shift {
  id: string;
  date: string;
  startTime: string | Date;
  endTime: string | Date;
  name: string;
  requiredStaff: number;
  assignedUsers: string[];
  shiftType: 'morning' | 'afternoon' | 'night';
  status: 'draft' | 'published' | 'locked';
  breakMinutes?: number;
  skills?: string[];
}

interface Props {
  shifts: Shift[];
  viewMode: 'week' | 'month' | 'day';
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onShiftClick: (shift: Shift) => void;
  onShiftDrop?: (shiftId: string, newDate: string, newTime: string) => void;
}

interface TooltipState {
  shift: Shift | null;
  x: number;
  y: number;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SHIFT_COLORS = {
  morning: 'bg-gradient-to-r from-orange-400 to-orange-500',
  afternoon: 'bg-gradient-to-r from-blue-400 to-blue-500',
  night: 'bg-gradient-to-r from-purple-400 to-purple-500'
};

export default function ShiftCalendar({
  shifts,
  viewMode,
  selectedDate,
  onDateChange,
  onShiftClick,
  onShiftDrop
}: Props) {
  const [draggedShift, setDraggedShift] = useState<Shift | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ date: string; hour: number } | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ shift: null, x: 0, y: 0 });
  
  const getVisibleDays = useMemo(() => {
    if (viewMode === 'day') {
      return [selectedDate];
    } else if (viewMode === 'week') {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    } else {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      return Array.from({ length: 28 }, (_, i) => addDays(start, i));
    }
  }, [selectedDate, viewMode]);
  
  const handlePrevious = () => {
    if (viewMode === 'day') {
      onDateChange(addDays(selectedDate, -1));
    } else if (viewMode === 'week') {
      onDateChange(addWeeks(selectedDate, -1));
    } else {
      onDateChange(addMonths(selectedDate, -1));
    }
  };
  
  const handleNext = () => {
    if (viewMode === 'day') {
      onDateChange(addDays(selectedDate, 1));
    } else if (viewMode === 'week') {
      onDateChange(addWeeks(selectedDate, 1));
    } else {
      onDateChange(addMonths(selectedDate, 1));
    }
  };
  
  const shiftsByDateHour = useMemo(() => {
    const map = new Map<string, Shift[]>();
    
    shifts.forEach(shift => {
      const startHour = new Date(shift.startTime).getHours();
      const endHour = new Date(shift.endTime).getHours();
      
      for (let hour = startHour; hour < endHour; hour++) {
        const key = `${shift.date}_${hour}`;
        const existing = map.get(key) || [];
        existing.push(shift);
        map.set(key, existing);
      }
    });
    
    return map;
  }, [shifts]);
  
  const handleDragStart = (e: React.DragEvent, shift: Shift) => {
    setDraggedShift(shift);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e: React.DragEvent, date: string, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHoveredCell({ date, hour });
  };
  
  const handleDragLeave = () => {
    setHoveredCell(null);
  };
  
  const handleDrop = (e: React.DragEvent, date: string, hour: number) => {
    e.preventDefault();
    if (draggedShift && onShiftDrop) {
      const newTime = new Date();
      newTime.setHours(hour, 0, 0, 0);
      onShiftDrop(draggedShift.id, date, newTime.toISOString());
    }
    setDraggedShift(null);
    setHoveredCell(null);
  };
  
  const getCellCoverage = (date: string, hour: number) => {
    const key = `${date}_${hour}`;
    const cellShifts = shiftsByDateHour.get(key) || [];
    
    const totalRequired = cellShifts.reduce((sum, s) => sum + s.requiredStaff, 0);
    const totalAssigned = cellShifts.reduce((sum, s) => sum + s.assignedUsers.length, 0);
    
    if (totalRequired === 0) return 'empty';
    if (totalAssigned >= totalRequired) return 'optimal';
    if (totalAssigned >= totalRequired * 0.8) return 'warning';
    return 'critical';
  };

  const handleShiftMouseEnter = useCallback((shift: Shift, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      shift,
      x: rect.left + rect.width / 2,
      y: rect.top - 8
    });
  }, []);

  const handleShiftMouseLeave = useCallback(() => {
    setTooltip({ shift: null, x: 0, y: 0 });
  }, []);
  
  const renderShift = (shift: Shift) => {
    const coverage = (shift.assignedUsers.length / shift.requiredStaff) * 100;
    const isUnderstaffed = coverage < 100;
    
    return (
      <div
        key={shift.id}
        className={cn(
          "p-2 rounded-lg text-white text-xs cursor-pointer transition-all hover:scale-105 hover:shadow-lg",
          SHIFT_COLORS[shift.shiftType],
          draggedShift?.id === shift.id && "opacity-50"
        )}
        draggable
        onDragStart={(e) => handleDragStart(e, shift)}
        onClick={() => onShiftClick(shift)}
        onMouseEnter={(e) => handleShiftMouseEnter(shift, e)}
        onMouseLeave={handleShiftMouseLeave}
        data-testid={`shift-${shift.id}`}
      >
        <div className="font-semibold">{shift.name}</div>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{shift.assignedUsers.length}/{shift.requiredStaff}</span>
          </div>
          {isUnderstaffed && (
            <AlertTriangle className="h-3 w-3 text-yellow-200" />
          )}
        </div>
        <div className="flex items-center gap-1 mt-1">
          <Clock className="h-3 w-3" />
          <span>
            {format(new Date(shift.startTime), 'HH:mm')} - 
            {format(new Date(shift.endTime), 'HH:mm')}
          </span>
        </div>
      </div>
    );
  };
  
  return (
    <Card className="p-4 relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevious}
            data-testid="button-previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h3 className="text-lg font-semibold">
            {viewMode === 'day' && format(selectedDate, 'dd MMMM yyyy', { locale: it })}
            {viewMode === 'week' && `${format(getVisibleDays[0], 'dd MMM', { locale: it })} - ${format(getVisibleDays[6], 'dd MMM yyyy', { locale: it })}`}
            {viewMode === 'month' && format(selectedDate, 'MMMM yyyy', { locale: it })}
          </h3>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            data-testid="button-next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
      </div>
      
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className="text-xs font-semibold text-muted-foreground p-2">Ora</div>
            {getVisibleDays.map(day => (
              <div
                key={day.toISOString()}
                className={cn(
                  "text-center p-2 rounded",
                  isSameDay(day, new Date()) && "bg-orange-100 dark:bg-orange-900"
                )}
              >
                <div className="text-xs font-semibold">
                  {format(day, 'EEE', { locale: it })}
                </div>
                <div className="text-sm">
                  {format(day, 'dd')}
                </div>
              </div>
            ))}
          </div>
          
          <div className="space-y-1">
            {HOURS.filter(h => h >= 6 && h <= 23).map(hour => (
              <div key={hour} className="grid grid-cols-8 gap-1">
                <div className="text-xs font-medium text-muted-foreground p-2">
                  {`${hour.toString().padStart(2, '0')}:00`}
                </div>
                
                {getVisibleDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const key = `${dateStr}_${hour}`;
                  const cellShifts = shiftsByDateHour.get(key) || [];
                  const coverage = getCellCoverage(dateStr, hour);
                  
                  return (
                    <div
                      key={key}
                      className={cn(
                        "min-h-[60px] p-1 rounded border transition-colors",
                        coverage === 'empty' && "bg-gray-50 dark:bg-gray-900",
                        coverage === 'optimal' && "bg-green-50 dark:bg-green-900/20",
                        coverage === 'warning' && "bg-yellow-50 dark:bg-yellow-900/20",
                        coverage === 'critical' && "bg-red-50 dark:bg-red-900/20",
                        hoveredCell?.date === dateStr && hoveredCell?.hour === hour && 
                        "ring-2 ring-orange-400 ring-offset-2"
                      )}
                      onDragOver={(e) => handleDragOver(e, dateStr, hour)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, dateStr, hour)}
                      data-testid={`cell-${dateStr}-${hour}`}
                    >
                      <div className="space-y-1">
                        {cellShifts.slice(0, 2).map(shift => renderShift(shift))}
                        {cellShifts.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{cellShifts.length - 2} altri
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {tooltip.shift && (
        <div
          className="fixed z-[9999] pointer-events-none animate-in fade-in-0 zoom-in-95 duration-100"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="bg-gray-900 text-white rounded-md px-3 py-2 shadow-xl border border-gray-700">
            <div className="space-y-1 text-xs">
              <div className="font-semibold">{tooltip.shift.name}</div>
              <div>Staff: {tooltip.shift.assignedUsers.length}/{tooltip.shift.requiredStaff}</div>
              <div>Copertura: {Math.round((tooltip.shift.assignedUsers.length / tooltip.shift.requiredStaff) * 100)}%</div>
              {tooltip.shift.breakMinutes && (
                <div className="flex items-center gap-1">
                  <Coffee className="h-3 w-3" />
                  Pausa: {tooltip.shift.breakMinutes} min
                </div>
              )}
              {tooltip.shift.skills && tooltip.shift.skills.length > 0 && (
                <div>Skills: {tooltip.shift.skills.join(', ')}</div>
              )}
              <div>Status: {tooltip.shift.status}</div>
            </div>
            <div 
              className="absolute left-1/2 -bottom-1 w-2 h-2 bg-gray-900 border-r border-b border-gray-700 transform -translate-x-1/2 rotate-45"
            />
          </div>
        </div>
      )}
    </Card>
  );
}
