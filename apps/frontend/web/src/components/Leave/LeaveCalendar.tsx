// Leave Calendar - Calendar component for leave visualization
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Users, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useTeamCalendar } from '@/hooks/useLeaveManagement';
import { leaveService } from '@/services/leaveService';
import { motion } from 'framer-motion';

interface LeaveCalendarProps {
  compact?: boolean;
  storeId?: string;
  className?: string;
}

export function LeaveCalendar({ compact = false, storeId, className }: LeaveCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
  
  const { data: events = [], isLoading } = useTeamCalendar({
    startDate,
    endDate,
    storeId
  });
  
  // Generate calendar days
  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const interval = eachDayOfInterval({ start, end });
    
    // Add padding days from previous month
    const startDay = getDay(start);
    const paddingDays = [];
    for (let i = startDay; i > 0; i--) {
      paddingDays.push(new Date(start.getFullYear(), start.getMonth(), -i + 1));
    }
    
    return [...paddingDays, ...interval];
  }, [currentMonth]);
  
  // Get events for a specific day
  const getEventsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(event => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const checkDate = new Date(dateStr);
      return start <= checkDate && end >= checkDate;
    });
  };
  
  // Get coverage level for a day
  const getCoverageLevel = (count: number) => {
    if (count === 0) return 'none';
    if (count <= 2) return 'low';
    if (count <= 4) return 'medium';
    return 'high';
  };
  
  // Navigate months
  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());
  
  if (compact) {
    return (
      <div className="space-y-3">
        {/* Mini Month View */}
        <div className="flex items-center justify-between mb-2">
          <button onClick={goToPreviousMonth} className="p-1">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">
            {format(currentMonth, 'MMMM yyyy', { locale: it })}
          </span>
          <button onClick={goToNextMonth} className="p-1">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        
        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 text-xs">
          {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, idx) => (
            <div key={idx} className="text-center text-gray-500 font-medium">
              {day}
            </div>
          ))}
          
          {days.map((day, idx) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div
                key={idx}
                className={cn(
                  "aspect-square flex items-center justify-center rounded relative cursor-pointer",
                  !isCurrentMonth && "text-gray-300",
                  isToday && "ring-2 ring-orange-500",
                  dayEvents.length > 0 && "bg-orange-100 font-semibold",
                  "hover:bg-gray-100"
                )}
                title={dayEvents.length > 0 ? `${dayEvents.length} assenze` : undefined}
              >
                {format(day, 'd')}
                {dayEvents.length > 0 && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
                    <div className="h-1 w-1 bg-orange-500 rounded-full" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  
  return (
    <Card className={cn("backdrop-blur-sm bg-white/90", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            <span>Calendario Ferie Team</span>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="calendar">Calendario</SelectItem>
                <SelectItem value="list">Lista</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm" onClick={goToToday}>
              Oggi
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        ) : viewMode === 'calendar' ? (
          <div>
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              
              <h3 className="text-lg font-semibold">
                {format(currentMonth, 'MMMM yyyy', { locale: it })}
              </h3>
              
              <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Calendar Grid */}
            <div className="border rounded-lg overflow-hidden">
              {/* Week Days Header */}
              <div className="grid grid-cols-7 bg-gray-50">
                {['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'].map((day) => (
                  <div
                    key={day}
                    className="px-2 py-3 text-center text-sm font-medium text-gray-700 border-r last:border-r-0"
                  >
                    {day.slice(0, 3)}
                  </div>
                ))}
              </div>
              
              {/* Days Grid */}
              <div className="grid grid-cols-7">
                {days.map((day, idx) => {
                  const dayEvents = getEventsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isToday = isSameDay(day, new Date());
                  const isWeekend = getDay(day) === 0 || getDay(day) === 6;
                  const coverageLevel = getCoverageLevel(dayEvents.length);
                  
                  return (
                    <motion.div
                      key={idx}
                      className={cn(
                        "min-h-[100px] p-2 border-r border-b last:border-r-0",
                        !isCurrentMonth && "bg-gray-50",
                        isWeekend && "bg-gray-50/50",
                        isToday && "bg-orange-50",
                        selectedDate && isSameDay(day, selectedDate) && "ring-2 ring-orange-500",
                        "hover:bg-gray-50 cursor-pointer transition-colors"
                      )}
                      onClick={() => setSelectedDate(day)}
                      whileHover={{ scale: 0.98 }}
                      data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={cn(
                          "text-sm font-medium",
                          !isCurrentMonth && "text-gray-400",
                          isToday && "text-orange-600 font-bold"
                        )}>
                          {format(day, 'd')}
                        </span>
                        
                        {dayEvents.length > 0 && (
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs px-1",
                              coverageLevel === 'high' && "bg-red-100 text-red-700",
                              coverageLevel === 'medium' && "bg-orange-100 text-orange-700",
                              coverageLevel === 'low' && "bg-green-100 text-green-700"
                            )}
                          >
                            {dayEvents.length}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Event Pills */}
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map((event, eventIdx) => {
                          const typeConfig = leaveService.getLeaveTypeConfig(event.leaveType);
                          return (
                            <div
                              key={eventIdx}
                              className="text-xs px-1 py-0.5 rounded truncate"
                              style={{
                                backgroundColor: `${typeConfig.color}20`,
                                color: typeConfig.color
                              }}
                              title={`${event.userName} - ${typeConfig.label}`}
                            >
                              {event.userName?.split(' ')[0]}
                            </div>
                          );
                        })}
                        
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-gray-500">
                            +{dayEvents.length - 2} altri
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600">Legenda:</span>
                {Object.entries({
                  vacation: 'Ferie',
                  sick: 'Malattia',
                  personal: 'Personale',
                  other: 'Altro'
                }).map(([type, label]) => {
                  const config = leaveService.getLeaveTypeConfig(type);
                  return (
                    <div key={type} className="flex items-center gap-1">
                      <div
                        className="h-3 w-3 rounded"
                        style={{ backgroundColor: config.color }}
                      />
                      <span className="text-xs">{label}</span>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">
                  Totale assenze nel mese: <strong>{events.length}</strong>
                </span>
              </div>
            </div>
            
            {/* Selected Date Details */}
            {selectedDate && getEventsForDay(selectedDate).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-gray-50 rounded-lg"
              >
                <h4 className="font-medium mb-2">
                  {format(selectedDate, 'EEEE d MMMM', { locale: it })}
                </h4>
                <div className="space-y-2">
                  {getEventsForDay(selectedDate).map((event, idx) => {
                    const typeConfig = leaveService.getLeaveTypeConfig(event.leaveType);
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-white rounded"
                      >
                        <div className="flex items-center gap-3">
                          {event.userAvatar ? (
                            <img
                              src={event.userAvatar}
                              alt={event.userName}
                              className="h-8 w-8 rounded-full"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <Users className="h-4 w-4 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-sm">{event.userName}</div>
                            <div className="text-xs text-gray-500">{event.storeName}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{typeConfig.icon}</span>
                          <Badge variant="outline">{typeConfig.label}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          // List View
          <div className="space-y-2">
            {events.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nessuna assenza questo mese</p>
              </div>
            ) : (
              events.map((event, idx) => {
                const typeConfig = leaveService.getLeaveTypeConfig(event.leaveType);
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      {event.userAvatar ? (
                        <img
                          src={event.userAvatar}
                          alt={event.userName}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <Users className="h-5 w-5 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{event.userName}</div>
                        <div className="text-sm text-gray-600">
                          {leaveService.formatDateRange(event.startDate, event.endDate)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span>{typeConfig.icon}</span>
                      <Badge variant="outline">{typeConfig.label}</Badge>
                      <Badge variant={event.status === 'confirmed' ? 'default' : 'secondary'}>
                        {event.status}
                      </Badge>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}