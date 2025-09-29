// ShiftsCalendar.tsx - Calendario turni con view mese/giorno/settimana
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useHRQueryReadiness } from '@/hooks/useAuthReadiness';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  Eye,
  MapPin,
  Clock,
  User,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Shift {
  id: string;
  date: Date | string;
  startTime: string;
  endTime: string;
  storeId: string;
  storeName: string;
  storeAddress?: string;
  role: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  title?: string;
  description?: string;
  breakMinutes?: number;
  assignmentId?: string;
  assignedAt?: Date | string;
  requiredStaff?: number;
}

type CalendarView = 'month' | 'week' | 'day';

interface ShiftsCalendarProps {
  userId: string;
  className?: string;
}

export default function ShiftsCalendar({ userId, className }: ShiftsCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<CalendarView>('month');
  
  // ✅ HR Authentication Readiness Hook
  const { enabled: hrQueriesEnabled, loading: hrAuthLoading } = useHRQueryReadiness();
  
  // ✅ API Query for Employee Shifts - INVISIBLE INTEGRATION 
  const { data: shiftsData, isLoading: shiftsLoading, error: shiftsError, refetch } = useQuery<{
    success: boolean;
    shifts: Shift[];
    total: number;
    employee: { id: string; tenantId: string };
    filters: { startDate: string; endDate: string; storeId: string };
  }>({
    queryKey: ['/api/employee/my-shifts', { 
      startDate: subMonths(selectedDate, 1).toISOString(), 
      endDate: addMonths(selectedDate, 1).toISOString() 
    }],
    queryFn: () => {
      const params = new URLSearchParams({
        startDate: subMonths(selectedDate, 1).toISOString().split('T')[0],
        endDate: addMonths(selectedDate, 1).toISOString().split('T')[0]
      });
      return apiRequest(`/api/employee/my-shifts?${params}`);
    },
    enabled: !!hrQueriesEnabled && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes - shifts change less frequently
    refetchOnWindowFocus: false,
  });

  // Transform API data to component format
  const shifts: Shift[] = useMemo(() => {
    if (!shiftsData?.shifts) return [];
    
    return shiftsData.shifts.map(shift => ({
      ...shift,
      date: new Date(shift.date) // Ensure date is Date object
    }));
  }, [shiftsData]);

  // Loading and error states
  const isLoading = hrAuthLoading || shiftsLoading;
  const hasError = !!shiftsError;

  // Helper per ottenere turni per una data specifica
  const getShiftsForDate = (date: Date): Shift[] => {
    return shifts.filter(shift => isSameDay(shift.date, date));
  };

  // Helper per ottenere range di date basato sulla view
  const getDateRange = (): Date[] => {
    switch (currentView) {
      case 'day':
        return [selectedDate];
      case 'week':
        const weekStart = startOfWeek(selectedDate, { locale: it });
        const weekEnd = endOfWeek(selectedDate, { locale: it });
        return eachDayOfInterval({ start: weekStart, end: weekEnd });
      case 'month':
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        return eachDayOfInterval({ start: monthStart, end: monthEnd });
      default:
        return [selectedDate];
    }
  };

  // Helper per navigazione date
  const navigateDate = (direction: 'prev' | 'next') => {
    const amount = currentView === 'day' ? 1 : currentView === 'week' ? 7 : 30;
    const multiplier = direction === 'next' ? 1 : -1;
    setSelectedDate(addDays(selectedDate, amount * multiplier));
  };

  // Helper per status badge
  const getStatusBadge = (status: Shift['status']) => {
    const variants = {
      scheduled: { variant: 'outline' as const, color: 'text-blue-600 border-blue-300', label: 'Programmato' },
      confirmed: { variant: 'default' as const, color: 'bg-green-600', label: 'Confermato' },
      completed: { variant: 'secondary' as const, color: 'bg-gray-600', label: 'Completato' },
      cancelled: { variant: 'destructive' as const, color: 'bg-red-600', label: 'Annullato' }
    };
    const config = variants[status];
    return (
      <Badge variant={config.variant} className={cn('text-xs', config.color)}>
        {config.label}
      </Badge>
    );
  };

  // Render turno singolo
  const renderShift = (shift: Shift, compact = false) => (
    <div
      key={shift.id}
      className={cn(
        "p-2 rounded-lg border transition-colors hover:bg-gray-50",
        compact ? "space-y-1" : "space-y-2"
      )}
      data-testid={`shift-${shift.id}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3 text-gray-500" />
          <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
            {shift.startTime} - {shift.endTime}
          </span>
        </div>
        {getStatusBadge(shift.status)}
      </div>
      
      {!compact && (
        <>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{shift.storeName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="h-3 w-3" />
            <span>{shift.role}</span>
          </div>
        </>
      )}
    </div>
  );

  return (
    <Card className={cn("glass-card", className)} data-testid="shifts-calendar">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-purple-500" />
            <span>Calendario Turni</span>
          </div>
          
          {/* View Selector */}
          <div className="flex items-center gap-2">
            <Select value={currentView} onValueChange={(value: CalendarView) => setCurrentView(value)}>
              <SelectTrigger className="w-32" data-testid="select-calendar-view">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day" data-testid="option-day-view">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Giorno
                  </div>
                </SelectItem>
                <SelectItem value="week" data-testid="option-week-view">
                  <div className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    Settimana
                  </div>
                </SelectItem>
                <SelectItem value="month" data-testid="option-month-view">
                  <div className="flex items-center gap-2">
                    <Grid3X3 className="h-4 w-4" />
                    Mese
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-24" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-64 w-full" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {hasError && !isLoading && (
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-medium mb-2 text-gray-900">Errore nel caricamento turni</h3>
            <p className="text-gray-500 mb-4">
              Non è stato possibile caricare i tuoi turni. Riprova più tardi.
            </p>
            <Button 
              onClick={() => refetch()} 
              variant="outline"
              className="gap-2"
              data-testid="button-retry-shifts"
            >
              <RefreshCw className="h-4 w-4" />
              Riprova
            </Button>
          </div>
        )}
        
        {/* Normal Content */}
        {!isLoading && !hasError && (
        <div className="space-y-4">
          
          {/* Navigation Header */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('prev')}
              data-testid="button-prev-period"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold" data-testid="text-current-period">
                {currentView === 'day' && format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: it })}
                {currentView === 'week' && `Settimana ${format(startOfWeek(selectedDate, { locale: it }), 'dd MMM', { locale: it })} - ${format(endOfWeek(selectedDate, { locale: it }), 'dd MMM yyyy', { locale: it })}`}
                {currentView === 'month' && format(selectedDate, 'MMMM yyyy', { locale: it })}
              </h3>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('next')}
              data-testid="button-next-period"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar Content */}
          {currentView === 'month' && (
            <div className="space-y-4">
              {/* Mini Calendar */}
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={it}
                  className="rounded-md border"
                  modifiers={{
                    hasShift: (date) => getShiftsForDate(date).length > 0
                  }}
                  modifiersStyles={{
                    hasShift: { 
                      backgroundColor: 'rgb(168 85 247 / 0.1)', 
                      color: 'rgb(147 51 234)',
                      fontWeight: 'bold'
                    }
                  }}
                />
              </div>
              
              {/* Turni del giorno selezionato */}
              <div>
                <h4 className="font-semibold mb-3" data-testid="text-selected-date-shifts">
                  Turni per {format(selectedDate, 'dd MMMM yyyy', { locale: it })}
                </h4>
                <div className="space-y-3">
                  {getShiftsForDate(selectedDate).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CalendarIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>Nessun turno programmato</p>
                    </div>
                  ) : (
                    getShiftsForDate(selectedDate).map(shift => renderShift(shift))
                  )}
                </div>
              </div>
            </div>
          )}

          {currentView === 'week' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {getDateRange().map(date => {
                  const dayShifts = getShiftsForDate(date);
                  const isToday = isSameDay(date, new Date());
                  
                  return (
                    <div
                      key={date.toISOString()}
                      className={cn(
                        "p-3 rounded-lg border",
                        isToday ? "bg-orange-50 border-orange-200" : "bg-gray-50"
                      )}
                      data-testid={`day-${format(date, 'yyyy-MM-dd')}`}
                    >
                      <div className="text-center mb-2">
                        <div className="text-xs text-gray-500">
                          {format(date, 'EEE', { locale: it })}
                        </div>
                        <div className={cn(
                          "text-lg font-semibold",
                          isToday ? "text-orange-600" : "text-gray-900"
                        )}>
                          {format(date, 'dd')}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        {dayShifts.length === 0 ? (
                          <div className="text-xs text-gray-400 text-center py-2">
                            Riposo
                          </div>
                        ) : (
                          dayShifts.map(shift => renderShift(shift, true))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentView === 'day' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {getShiftsForDate(selectedDate).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">Giorno di riposo</h3>
                    <p>Non hai turni programmati per oggi</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">
                      Turni per {format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: it })}
                    </h4>
                    {getShiftsForDate(selectedDate).map(shift => (
                      <Card key={shift.id} className="p-4">
                        {renderShift(shift)}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stats Footer */}
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {shifts.filter(s => s.status === 'scheduled').length}
                </div>
                <div className="text-xs text-gray-600">Programmati</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {shifts.filter(s => s.status === 'confirmed').length}
                </div>
                <div className="text-xs text-gray-600">Confermati</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {shifts.filter(s => s.status === 'completed').length}
                </div>
                <div className="text-xs text-gray-600">Completati</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {shifts.reduce((acc, shift) => {
                    const start = new Date(`2000-01-01 ${shift.startTime}`);
                    const end = new Date(`2000-01-01 ${shift.endTime}`);
                    return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                  }, 0)}h
                </div>
                <div className="text-xs text-gray-600">Ore Totali</div>
              </div>
            </div>
          </div>
        </div>
        )}
      </CardContent>
    </Card>
  );
}