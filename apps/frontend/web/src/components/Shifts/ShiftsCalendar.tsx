// ShiftsCalendar.tsx - Calendario turni con view mese/giorno/settimana
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useHRQueryReadiness } from '@/hooks/useAuthReadiness';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Users,
  AlertCircle,
  RefreshCw,
  Store,
  CheckCircle2,
  XCircle
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
  storeName?: string;
  storeAddress?: string;
  role?: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'draft' | 'published' | 'in_progress';
  notes?: string;
  title?: string;
  name?: string;
  description?: string;
  breakMinutes?: number;
  assignmentId?: string;
  assignedAt?: Date | string;
  requiredStaff?: number;
  assignedUsers?: Array<{ userId: string; userName: string }>;
}

type CalendarView = 'month' | 'week' | 'day';
type CalendarMode = 'employee' | 'manager';

interface ShiftsCalendarProps {
  userId?: string;
  storeId?: string;
  mode?: CalendarMode;
  className?: string;
}

export default function ShiftsCalendar({ userId, storeId, mode = 'manager', className }: ShiftsCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<CalendarView>('month');
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  
  const { enabled: hrQueriesEnabled, loading: hrAuthLoading } = useHRQueryReadiness();
  
  const tenantId = localStorage.getItem('currentTenantId') || '00000000-0000-0000-0000-000000000001';
  
  // API Query - Manager mode uses /api/hr/shifts, Employee mode uses /api/employee/my-shifts
  const { data: shiftsData, isLoading: shiftsLoading, error: shiftsError, refetch } = useQuery<Shift[]>({
    queryKey: [
      mode === 'manager' ? '/api/hr/shifts' : '/api/employee/my-shifts', 
      { 
        startDate: subMonths(selectedDate, 1).toISOString().split('T')[0], 
        endDate: addMonths(selectedDate, 1).toISOString().split('T')[0],
        storeId 
      }
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: subMonths(selectedDate, 1).toISOString().split('T')[0],
        endDate: addMonths(selectedDate, 1).toISOString().split('T')[0]
      });
      if (storeId) params.set('storeId', storeId);
      
      if (mode === 'manager') {
        const response = await fetch(`/api/hr/shifts?${params}`, {
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': tenantId
          }
        });
        if (!response.ok) throw new Error('Failed to fetch shifts');
        return response.json();
      } else {
        return apiRequest(`/api/employee/my-shifts?${params}`).then(r => r.shifts || []);
      }
    },
    enabled: !!hrQueriesEnabled && (mode === 'manager' || !!userId),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Transform API data
  const shifts: Shift[] = useMemo(() => {
    if (!shiftsData) return [];
    const data = Array.isArray(shiftsData) ? shiftsData : [];
    return data.map(shift => ({
      ...shift,
      date: new Date(shift.date)
    }));
  }, [shiftsData]);

  const isLoading = hrAuthLoading || shiftsLoading;
  const hasError = !!shiftsError;

  // Helper per ottenere turni per una data specifica
  const getShiftsForDate = (date: Date): Shift[] => {
    return shifts.filter(shift => isSameDay(new Date(shift.date), date));
  };

  // Calcola copertura per un giorno
  const getCoverageForDate = (date: Date) => {
    const dayShifts = getShiftsForDate(date);
    const totalSlots = dayShifts.reduce((acc, s) => acc + (s.requiredStaff || 1), 0);
    const assignedSlots = dayShifts.reduce((acc, s) => acc + (s.assignedUsers?.length || 0), 0);
    const storeIds = [...new Set(dayShifts.map(s => s.storeId))];
    
    return {
      shifts: dayShifts.length,
      totalSlots,
      assignedSlots,
      stores: storeIds.length,
      isCovered: totalSlots > 0 && assignedSlots >= totalSlots,
      hasGaps: totalSlots > 0 && assignedSlots < totalSlots
    };
  };

  // Helper per ottenere range di date
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

  const navigateDate = (direction: 'prev' | 'next') => {
    const amount = currentView === 'day' ? 1 : currentView === 'week' ? 7 : 30;
    const multiplier = direction === 'next' ? 1 : -1;
    setSelectedDate(addDays(selectedDate, amount * multiplier));
  };

  // Handle day click - apre modal
  const handleDayClick = (date: Date) => {
    setModalDate(date);
    setDayModalOpen(true);
  };

  const getStatusBadge = (status: Shift['status']) => {
    const variants: Record<string, { variant: 'default' | 'outline' | 'secondary' | 'destructive', color: string, label: string }> = {
      scheduled: { variant: 'outline', color: 'text-blue-600 border-blue-300', label: 'Programmato' },
      confirmed: { variant: 'default', color: 'bg-green-600', label: 'Confermato' },
      completed: { variant: 'secondary', color: 'bg-gray-600', label: 'Completato' },
      cancelled: { variant: 'destructive', color: 'bg-red-600', label: 'Annullato' },
      draft: { variant: 'outline', color: 'text-gray-500 border-gray-300', label: 'Bozza' },
      published: { variant: 'default', color: 'bg-purple-600', label: 'Pubblicato' },
      in_progress: { variant: 'default', color: 'bg-orange-500', label: 'In corso' }
    };
    const config = variants[status] || variants.scheduled;
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
            {typeof shift.startTime === 'string' && shift.startTime.includes('T') 
              ? shift.startTime.split('T')[1]?.substring(0, 5) 
              : shift.startTime} - {typeof shift.endTime === 'string' && shift.endTime.includes('T') 
              ? shift.endTime.split('T')[1]?.substring(0, 5) 
              : shift.endTime}
          </span>
        </div>
        {getStatusBadge(shift.status)}
      </div>
      
      {!compact && (
        <>
          {shift.name && (
            <div className="text-sm font-medium text-gray-900">{shift.name}</div>
          )}
          {shift.storeName && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{shift.storeName}</span>
            </div>
          )}
          {shift.assignedUsers && shift.assignedUsers.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-3 w-3" />
              <span>{shift.assignedUsers.map(u => u.userName).join(', ')}</span>
            </div>
          )}
          {shift.requiredStaff && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <User className="h-3 w-3" />
              <span>Richiesti: {shift.requiredStaff} | Assegnati: {shift.assignedUsers?.length || 0}</span>
            </div>
          )}
        </>
      )}
    </div>
  );

  // Render indicatore copertura nella cella calendario
  const renderCoverageIndicator = (date: Date) => {
    const coverage = getCoverageForDate(date);
    if (coverage.shifts === 0) return null;
    
    return (
      <div className="flex items-center justify-center gap-0.5 mt-1">
        {coverage.isCovered ? (
          <div className="w-2 h-2 rounded-full bg-green-500" title="Copertura completa" />
        ) : coverage.hasGaps ? (
          <div className="w-2 h-2 rounded-full bg-amber-500" title="Copertura parziale" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-gray-300" title="Da assegnare" />
        )}
        {coverage.shifts > 0 && (
          <span className="text-[10px] text-gray-500 ml-1">{coverage.assignedSlots}/{coverage.totalSlots}</span>
        )}
      </div>
    );
  };

  return (
    <>
      <Card className={cn("glass-card", className)} data-testid="shifts-calendar">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-purple-500" />
              <span>Calendario Turni {mode === 'manager' ? '(Manager)' : ''}</span>
            </div>
            
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
          {isLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-24" />
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          )}
          
          {hasError && !isLoading && (
            <div className="text-center py-12">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-medium mb-2 text-gray-900">Errore nel caricamento turni</h3>
              <p className="text-gray-500 mb-4">
                Non è stato possibile caricare i turni. Riprova più tardi.
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

            {/* Month View with clickable days */}
            {currentView === 'month' && (
              <div className="space-y-4">
                {/* Custom Calendar Grid */}
                <div className="border rounded-lg overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-7 bg-gray-50 border-b">
                    {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                      <div key={day} className="p-2 text-center text-xs font-medium text-gray-600">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7">
                    {(() => {
                      const monthStart = startOfMonth(selectedDate);
                      const monthEnd = endOfMonth(selectedDate);
                      const calendarStart = startOfWeek(monthStart, { locale: it });
                      const calendarEnd = endOfWeek(monthEnd, { locale: it });
                      const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
                      
                      return days.map(date => {
                        const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
                        const isToday = isSameDay(date, new Date());
                        const coverage = getCoverageForDate(date);
                        const hasShifts = coverage.shifts > 0;
                        
                        return (
                          <div
                            key={date.toISOString()}
                            onClick={() => handleDayClick(date)}
                            className={cn(
                              "min-h-[80px] p-2 border-b border-r cursor-pointer transition-colors hover:bg-gray-50",
                              !isCurrentMonth && "bg-gray-50/50 text-gray-400",
                              isToday && "bg-orange-50",
                              hasShifts && isCurrentMonth && "bg-purple-50/30"
                            )}
                            data-testid={`calendar-day-${format(date, 'yyyy-MM-dd')}`}
                          >
                            <div className={cn(
                              "text-sm font-medium mb-1",
                              isToday && "text-orange-600 font-bold"
                            )}>
                              {format(date, 'd')}
                            </div>
                            
                            {hasShifts && isCurrentMonth && (
                              <div className="space-y-1">
                                {/* Indicatori turni */}
                                <div className="flex flex-wrap gap-1">
                                  {coverage.isCovered ? (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                                      <span className="text-[10px] text-green-600">{coverage.assignedSlots}</span>
                                    </div>
                                  ) : coverage.hasGaps ? (
                                    <div className="flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3 text-amber-500" />
                                      <span className="text-[10px] text-amber-600">{coverage.assignedSlots}/{coverage.totalSlots}</span>
                                    </div>
                                  ) : null}
                                </div>
                                
                                {/* Store indicators */}
                                {coverage.stores > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Store className="h-3 w-3 text-gray-400" />
                                    <span className="text-[10px] text-gray-500">{coverage.stores} PDV</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Week View */}
            {currentView === 'week' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  {getDateRange().map(date => {
                    const dayShifts = getShiftsForDate(date);
                    const isToday = isSameDay(date, new Date());
                    const coverage = getCoverageForDate(date);
                    
                    return (
                      <div
                        key={date.toISOString()}
                        onClick={() => handleDayClick(date)}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-colors hover:shadow-md",
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
                        
                        {/* Coverage indicator */}
                        {coverage.shifts > 0 && (
                          <div className="text-center mb-2">
                            <Badge variant={coverage.isCovered ? "default" : "outline"} className={cn(
                              "text-xs",
                              coverage.isCovered ? "bg-green-500" : coverage.hasGaps ? "border-amber-500 text-amber-600" : ""
                            )}>
                              {coverage.assignedSlots}/{coverage.totalSlots}
                            </Badge>
                          </div>
                        )}
                        
                        <div className="space-y-1">
                          {dayShifts.length === 0 ? (
                            <div className="text-xs text-gray-400 text-center py-2">
                              Nessun turno
                            </div>
                          ) : (
                            dayShifts.slice(0, 2).map(shift => renderShift(shift, true))
                          )}
                          {dayShifts.length > 2 && (
                            <div className="text-xs text-center text-purple-600">
                              +{dayShifts.length - 2} altri
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Day View */}
            {currentView === 'day' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {getShiftsForDate(selectedDate).length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium mb-2">Nessun turno</h3>
                      <p>Non ci sono turni programmati per questo giorno</p>
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
                  <div className="text-2xl font-bold text-purple-600">
                    {shifts.length}
                  </div>
                  <div className="text-xs text-gray-600">Turni Totali</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {shifts.filter(s => s.status === 'published' || s.status === 'confirmed').length}
                  </div>
                  <div className="text-xs text-gray-600">Pubblicati</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-600">
                    {shifts.filter(s => (s.requiredStaff || 1) > (s.assignedUsers?.length || 0)).length}
                  </div>
                  <div className="text-xs text-gray-600">Da Coprire</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {[...new Set(shifts.map(s => s.storeId))].length}
                  </div>
                  <div className="text-xs text-gray-600">Punti Vendita</div>
                </div>
              </div>
            </div>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Day Detail Modal */}
      <Dialog open={dayModalOpen} onOpenChange={setDayModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-purple-500" />
              Turni del {modalDate ? format(modalDate, 'EEEE, dd MMMM yyyy', { locale: it }) : ''}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            {modalDate && (
              <div className="space-y-4 p-4">
                {/* Coverage Summary */}
                {(() => {
                  const coverage = getCoverageForDate(modalDate);
                  return (
                    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{coverage.stores} Punti Vendita</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{coverage.assignedSlots}/{coverage.totalSlots} Risorse</span>
                      </div>
                      {coverage.isCovered ? (
                        <Badge className="bg-green-500">Copertura Completa</Badge>
                      ) : coverage.hasGaps ? (
                        <Badge variant="outline" className="border-amber-500 text-amber-600">Copertura Parziale</Badge>
                      ) : null}
                    </div>
                  );
                })()}
                
                {/* Shifts List */}
                <div className="space-y-3">
                  {getShiftsForDate(modalDate).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CalendarIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p>Nessun turno programmato per questo giorno</p>
                    </div>
                  ) : (
                    getShiftsForDate(modalDate).map(shift => (
                      <Card key={shift.id} className="p-4">
                        {renderShift(shift)}
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
