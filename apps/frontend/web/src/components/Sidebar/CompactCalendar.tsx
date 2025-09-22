import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useHRQueryReadiness } from '@/hooks/useAuthReadiness';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CompactCalendarProps {
  collapsed?: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  type: string;
  location?: string;
  color?: string;
}

export default function CompactCalendar({ collapsed = false }: CompactCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const hrQueryReadiness = useHRQueryReadiness();

  // ✅ Connessione database - stessa API di HRCalendar
  const { data: backendEvents = [], isLoading } = useQuery({
    queryKey: ['/api/hr/calendar/events'],
    enabled: hrQueryReadiness.enabled,
    staleTime: 5 * 60 * 1000, // 5 minuti cache
  });

  // ✅ Trasforma eventi dal backend
  const calendarEvents = useMemo(() => 
    (backendEvents as CalendarEvent[]).map(event => ({
      ...event,
      date: new Date(event.startDate),
      time: format(new Date(event.startDate), 'HH:mm', { locale: it }),
    })),
  [backendEvents]);

  // Helper per ottenere eventi di un giorno
  const getEventsForDate = (date: Date) => {
    return calendarEvents.filter(event => 
      isSameDay(event.date, date)
    );
  };

  // Helper per colori evento
  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'meeting': return 'bg-blue-500';
      case 'shift': return 'bg-green-500';  
      case 'time_off': return 'bg-orange-500';
      case 'training': return 'bg-purple-500';
      case 'deadline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // ✅ Navigazione mesi richiesta dall'utente
  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Genera giorni del mese
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Se collapsed, mostra solo header compatto
  if (collapsed) {
    return (
      <div className="px-2 py-3">
        <div className="flex items-center justify-center">
          <Calendar className="h-5 w-5 text-purple-500" />
        </div>
        <div className="text-center mt-2">
          <div className="text-xs font-semibold text-gray-900">
            {format(new Date(), 'dd')}
          </div>
          <div className="text-xs text-gray-500">
            {format(new Date(), 'MMM', { locale: it })}
          </div>
        </div>
        {/* Indicatore eventi oggi */}
        {getEventsForDate(new Date()).length > 0 && (
          <div className="flex justify-center mt-1">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-500" />
            <CardTitle className="text-sm">Calendario</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToToday}
            className="text-xs h-6 px-2"
            data-testid="button-today"
          >
            Oggi
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* ✅ Navigazione mesi richiesta */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousMonth}
            className="h-6 w-6 p-0"
            data-testid="button-prev-month"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          
          <div className="text-sm font-semibold text-center flex-1">
            {format(currentDate, 'MMMM yyyy', { locale: it })}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextMonth}
            className="h-6 w-6 p-0"
            data-testid="button-next-month"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>

        {/* Griglia calendario compatta */}
        <div className="grid grid-cols-7 gap-1 text-xs">
          {/* Header giorni settimana */}
          {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, index) => (
            <div key={index} className="text-center text-gray-500 font-medium py-1">
              {day}
            </div>
          ))}
          
          {/* Giorni del mese */}
          {monthDays.map((day, index) => {
            const dayEvents = getEventsForDate(day);
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentDay = isToday(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            
            return (
              <button
                key={index}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "relative h-8 w-8 rounded text-xs font-medium transition-colors",
                  "hover:bg-gray-100 dark:hover:bg-gray-800",
                  !isCurrentMonth && "text-gray-400",
                  isSelected && "bg-purple-500 text-white hover:bg-purple-600",
                  isCurrentDay && !isSelected && "bg-orange-100 text-orange-700 font-bold",
                )}
                data-testid={`day-${format(day, 'yyyy-MM-dd')}`}
              >
                {format(day, 'd')}
                
                {/* Indicatori eventi */}
                {dayEvents.length > 0 && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                    {dayEvents.slice(0, 3).map((event, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-1 h-1 rounded-full",
                          isSelected ? "bg-white" : getEventColor(event.type)
                        )}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* ✅ Eventi del giorno selezionato con dati reali */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-700">
            {format(selectedDate, 'dd MMMM', { locale: it })}
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Clock className="h-4 w-4 text-gray-400 animate-spin" />
              <span className="ml-2 text-xs text-gray-500">Caricamento...</span>
            </div>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {getEventsForDate(selectedDate).length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-2">
                  Nessun evento
                </div>
              ) : (
                getEventsForDate(selectedDate).slice(0, 4).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-2 p-2 rounded bg-gray-50 dark:bg-gray-800/50"
                    data-testid={`event-${event.id}`}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-1 flex-shrink-0",
                      getEventColor(event.type)
                    )} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">
                        {event.title}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{event.time}</span>
                        {event.location && (
                          <>
                            <MapPin className="h-3 w-3 ml-1" />
                            <span className="truncate">{event.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {getEventsForDate(selectedDate).length > 4 && (
                <div className="text-xs text-center text-gray-500 py-1">
                  +{getEventsForDate(selectedDate).length - 4} altri eventi
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}