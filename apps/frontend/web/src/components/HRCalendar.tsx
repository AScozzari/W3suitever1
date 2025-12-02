import { useState, useRef, useCallback, useMemo, useEffect, memo, useDeferredValue } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useHRQueryReadiness } from '@/hooks/useAuthReadiness';
import { 
  Calendar, Clock, Users, Filter, ChevronLeft, ChevronRight, Plus, 
  ArrowLeftRight, Trash2, Edit, AlertTriangle, CheckCircle2, Store as StoreIcon,
  RefreshCw
} from 'lucide-react';
import { DayCellIndicators } from '@/components/hr/CalendarEventIndicator';
import { CALENDAR_EVENT_TYPES, mapBackendEventToType, getEventTypeConfig } from '@/lib/calendar-event-types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { useShiftPlanningStore, type ResourceAssignment, type CoverageSlot } from '@/stores/shiftPlanningStore';
import { formatShiftTime, formatTimeRange, getShiftStatusColor, getShiftStatusLabel } from '@/utils/formatters';
import StoreCoverageView from '@/components/HR/StoreCoverageView';

// Schema per eventi turno
const shiftEventSchema = z.object({
  title: z.string().min(1, 'Titolo richiesto'),
  start: z.string(),
  end: z.string(),
  employeeId: z.string().min(1, 'Dipendente richiesto'),
  shiftType: z.enum(['full_time', 'part_time_4h', 'part_time_6h', 'flexible', 'overtime', 'custom']),
  notes: z.string().optional(),
});

type ShiftEventForm = z.infer<typeof shiftEventSchema>;

interface HRCalendarProps {
  className?: string;
  storeId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

function HRCalendarComponent({ className, storeId, startDate, endDate }: HRCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const isMountedRef = useRef(true);
  const [currentView, setCurrentView] = useState('dayGridMonth');
  
  // ✅ FIX: Guard against React.StrictMode double-mount/unmount cycle
  // This prevents FullCalendar DOM cleanup errors when React unmounts/remounts the component
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Delay cleanup to allow React to finish its cycle before FullCalendar cleanup
      if (calendarRef.current) {
        const api = calendarRef.current.getApi();
        // Use setTimeout to defer destruction, preventing race with React's DOM cleanup
        setTimeout(() => {
          try {
            if (!isMountedRef.current) {
              api.destroy();
            }
          } catch (e) {
            // Silently handle cleanup errors from StrictMode double-mount
          }
        }, 0);
      }
    };
  }, []);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventModalMode, setEventModalMode] = useState<'create' | 'edit'>('create');
  
  // ✅ Task 13: State for day detail modal
  const [showDayDetailModal, setShowDayDetailModal] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);
  const [dayDetailStoreFilter, setDayDetailStoreFilter] = useState<string>('all');
  
  // FASE 4: Multi-select stores and resources + event type filter
  const [selectedStoreFilters, setSelectedStoreFilters] = useState<string[]>([]);
  const [selectedResourceFilters, setSelectedResourceFilters] = useState<string[]>([]);
  const [selectedEventTypeFilter, setSelectedEventTypeFilter] = useState<string | null>(null);
  
  // FASE 5: Segment action modal
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionTarget, setActionTarget] = useState<{
    id: string;
    employeeId: string;
    employeeName: string;
    startTime: string;
    endTime: string;
    storeId?: string;
    storeName?: string;
    title: string;
  } | null>(null);
  const [actionType, setActionType] = useState<'reassign' | 'remove' | 'change_time' | null>(null);
  const [newAssigneeId, setNewAssigneeId] = useState<string>('');
  const [newStartTime, setNewStartTime] = useState<string>('');
  const [newEndTime, setNewEndTime] = useState<string>('');
  
  // FASE 6: Resource context panel state
  const [selectedResourceForContext, setSelectedResourceForContext] = useState<string | null>(null);
  
  // FASE 7: Dual-view modal state (store timeline vs resource detail)
  const [dayModalView, setDayModalView] = useState<'store' | 'resource'>('store');

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const hrQueryReadiness = useHRQueryReadiness();
  
  // FASE 4: Collegamento allo store di pianificazione turni
  const { 
    resourceAssignments, 
    coveragePreview,
    templateSelections 
  } = useShiftPlanningStore();

  // Form per eventi
  const form = useForm<ShiftEventForm>({
    resolver: zodResolver(shiftEventSchema),
    defaultValues: {
      title: '',
      start: '',
      end: '',
      employeeId: '',
      shiftType: 'full_time',
      notes: '',
    },
  });

  // Query per dipendenti
  const { data: employees = [], error: employeesError } = useQuery({
    queryKey: ['/api/users'],
    enabled: hrQueryReadiness.enabled,
  });

  // ✅ Task 13: Query per stores (per filtro nel modal)
  const { data: stores = [] } = useQuery({
    queryKey: ['/api/stores'],
    enabled: hrQueryReadiness.enabled,
  });

  // ✅ FASE 1.2: Unifica queries per usare calendar endpoint come altri calendari
  const { data: backendEvents = [], isLoading: calendarLoading, error: calendarError } = useQuery({
    queryKey: ['/api/hr/calendar/events'],
    enabled: hrQueryReadiness.enabled,
  });

  // ✅ Task 8: Query shift assignments - carica TUTTI i turni per mostrare pallini nel calendario globale
  // NON filtrare per storeId nel calendario principale - mostra tutti i negozi
  // ENHANCED: Include template version data for historical accuracy
  // NORMALIZED: Convert snake_case API response to camelCase for consistent frontend usage
  const { data: rawShiftAssignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['/api/hr/shift-assignments', { startDate, endDate }], // Rimuovo storeId dalla key
    queryFn: async () => {
      const params = new URLSearchParams();
      // NON passare storeId - vogliamo vedere TUTTI i turni di tutti i negozi
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const url = `/api/hr/shift-assignments${params.toString() ? `?${params.toString()}` : ''}`;
      console.log('[HRCalendar] Fetching ALL shift assignments:', url);
      const response = await apiRequest(url);
      // API returns { items: [...], total: ..., ... } - extract items array
      const items = response?.items || response || [];
      
      // Normalize API response - support both flat and nested formats
      // API currently returns FLAT format: { shiftDate, employeeId, employee: {...}, store: {...} }
      // But could also return nested format: { shift: { date, ... }, user: {...}, template_version: {...} }
      const normalized = items.map((item: any) => ({
        // Assignment fields - support both flat and snake_case
        id: item.id,
        shiftId: item.shiftId || item.shift_id,
        userId: item.employeeId || item.user_id || item.userId,
        employeeId: item.employeeId || item.user_id || item.userId, // Primary key for filtering
        tenantId: item.tenantId || item.tenant_id,
        status: item.status,
        assignedAt: item.assignedAt || item.assigned_at,
        
        // Shift data - FLAT format first (current API), then nested fallback
        shiftDate: item.shiftDate || item.shift?.date,
        startTime: item.startTime || item.shift?.startTime,
        endTime: item.endTime || item.shift?.endTime,
        shiftType: item.shiftType || item.shift?.shiftType,
        storeId: item.storeId || item.shift?.storeId,
        shiftStatus: item.shiftStatus || item.shift?.status,
        templateId: item.templateId || item.shift?.templateId,
        templateVersionId: item.templateVersionId || item.shift?.templateVersionId,
        shiftName: item.shiftName,
        
        // Employee data - FLAT format (current API)
        employee: item.employee ? {
          id: item.employee.id,
          email: item.employee.email,
          firstName: item.employee.firstName,
          lastName: item.employee.lastName,
        } : (item.user ? {
          id: item.user.id,
          email: item.user.email,
          firstName: item.user.firstName,
          lastName: item.user.lastName,
        } : null),
        
        // Store data - FLAT format (current API)
        store: item.store ? {
          id: item.store.id,
          nome: item.store.nome || item.store.name,
          name: item.store.name || item.store.nome,
          code: item.store.code,
        } : null,
        
        // Template version data for historical accuracy (nested format)
        templateVersion: item.template_version ? {
          id: item.template_version.id,
          templateId: item.template_version.templateId,
          versionNumber: item.template_version.versionNumber,
          name: item.template_version.name,
          timeSlotsSnapshot: item.template_version.timeSlotsSnapshot || [],
          effectiveFrom: item.template_version.effectiveFrom,
          effectiveUntil: item.template_version.effectiveUntil,
        } : null,
        
        // Preserve raw data for debugging
        _raw: item,
      }));
      
      console.log('[HRCalendar] Normalized assignments:', normalized?.length, 
        'with templateVersion:', normalized?.[0]?.templateVersion ? 'yes' : 'no',
        'sample:', normalized?.[0]);
      return normalized;
    },
    enabled: hrQueryReadiness.enabled,
  });
  
  // ✅ FIX: Use useDeferredValue to prevent FullCalendar re-render conflicts with Portal transitions
  // This defers the update so React can prioritize Portal DOM operations before calendar updates
  const shiftAssignments = useDeferredValue(rawShiftAssignments);

  // ✅ CROSS-STORE: Query per turni pianificati - storeId opzionale
  // Se storeId non è passato, carica TUTTI i turni di tutti i negozi
  const { data: plannedShifts = [] } = useQuery({
    queryKey: ['/api/hr/shifts', { storeId: storeId || 'all', startDate, endDate }],
    queryFn: async () => {
      const params = new URLSearchParams();
      // ✅ NON passare storeId se è null/undefined - carica cross-store
      if (storeId) params.append('storeId', storeId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const url = `/api/hr/shifts${params.toString() ? `?${params.toString()}` : ''}`;
      console.log('[HRCalendar] Fetching shifts:', url, 'cross-store:', !storeId);
      const response = await apiRequest(url);
      return response;
    },
    enabled: hrQueryReadiness.enabled,
  });

  // FASE 6: Query per contesto risorsa selezionata - ore lavorate, conflitti, storia
  const { data: resourceContext, isLoading: resourceContextLoading } = useQuery({
    queryKey: ['/api/hr/employees', selectedResourceForContext, 'availability'],
    queryFn: async () => {
      if (!selectedResourceForContext) return null;
      const url = `/api/hr/employees/${selectedResourceForContext}/availability`;
      const response = await apiRequest(url);
      return response;
    },
    enabled: hrQueryReadiness.enabled && !!selectedResourceForContext,
  });

  // ✅ FASE 1.2: Mutation per creare eventi usando l'API unificata
  const createEventMutation = useMutation({
    mutationFn: (data: ShiftEventForm) => apiRequest('/api/hr/calendar/events', {
      method: 'POST',
      body: JSON.stringify({
        title: data.title,
        // ✅ FIX: Convert datetime-local to ISO strings for RFC3339 compliance  
        startDate: new Date(data.start).toISOString(),
        endDate: new Date(data.end).toISOString(),
        type: 'shift',
        visibility: 'team',
        category: 'hr',
        description: data.notes || '',
        metadata: {
          employeeId: data.employeeId,
          shiftType: data.shiftType,
        }
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/calendar/events'] });
      toast({ title: 'Evento creato con successo!' });
      setShowEventModal(false);
      form.reset();
    },
    onError: () => {
      toast({ title: 'Errore nella creazione dell\'evento', variant: 'destructive' });
    },
  });

  // ✅ FIX: Implement updateEventMutation for edit mode
  const updateEventMutation = useMutation({
    mutationFn: (data: ShiftEventForm) => {
      if (!selectedEvent) throw new Error('No event selected for update');
      
      return apiRequest(`/api/hr/calendar/events/${selectedEvent.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: data.title,
          // ✅ FIX: Convert datetime-local to ISO strings for RFC3339 compliance
          startDate: new Date(data.start).toISOString(),
          endDate: new Date(data.end).toISOString(),
          description: data.notes || '',
          metadata: {
            employeeId: data.employeeId,
            shiftType: data.shiftType,
          }
        }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/calendar/events'] });
      toast({ title: 'Evento aggiornato con successo!' });
      setShowEventModal(false);
      form.reset();
    },
    onError: () => {
      toast({ title: 'Errore nell\'aggiornamento dell\'evento', variant: 'destructive' });
    },
  });

  // ✅ FASE 1.2: Trasforma eventi unificati dal backend in formato FullCalendar
  const calendarEvents = useMemo(() => {
    // ✅ FIX: Assicurati che backendEvents sia sempre un array
    const eventsArray = Array.isArray(backendEvents) ? backendEvents : [];
    
    const calendarEventsFromBackend = eventsArray.map((event: any) => ({
      id: event.id,
      title: event.title,
      start: event.startDate,
      end: event.endDate,
      resourceId: event.metadata?.employeeId || event.ownerId,
      backgroundColor: getEventColor(event.type),
      borderColor: getEventColor(event.type),
      extendedProps: {
        type: event.type,
        visibility: event.visibility,
        description: event.description,
        location: event.location,
        metadata: event.metadata,
      },
    }));

    // ✅ Task 8: Trasforma shift assignments in eventi calendario
    const assignmentsArray = Array.isArray(shiftAssignments) ? shiftAssignments : [];
    const shiftAssignmentEvents = assignmentsArray.map((assignment: any) => ({
      id: `assignment-${assignment.id}`,
      title: assignment.template?.name || `Turno ${assignment.employee?.firstName || 'Risorsa'}`,
      start: assignment.shiftDate,
      end: assignment.shiftDate,
      resourceId: assignment.employeeId,
      backgroundColor: assignment.hasConflict ? 'hsl(0, 84%, 60%)' : 'hsl(142, 76%, 36%)',
      borderColor: assignment.hasConflict ? 'hsl(0, 84%, 60%)' : 'hsl(142, 76%, 36%)',
      extendedProps: {
        type: 'shift_assignment',
        assignmentId: assignment.id,
        template: assignment.template,
        employee: assignment.employee,
        store: assignment.store,
        hasConflict: assignment.hasConflict,
        metadata: {
          templateId: assignment.templateId,
          storeId: assignment.storeId,
        },
      },
    }));

    // ✅ Turni pianificati (bulk-planning)
    const shiftsArray = Array.isArray(plannedShifts) ? plannedShifts : [];
    const plannedShiftEvents = shiftsArray.map((shift: any) => ({
      id: `shift-${shift.id}`,
      title: shift.name || 'Turno Pianificato',
      start: shift.startTime,
      end: shift.endTime,
      resourceId: shift.storeId,
      backgroundColor: 'hsl(280, 70%, 50%)',
      borderColor: 'hsl(280, 70%, 50%)',
      extendedProps: {
        type: 'planned_shift',
        shiftId: shift.id,
        storeId: shift.storeId,
        templateId: shift.templateId,
        requiredStaff: shift.requiredStaff,
        status: shift.status,
        metadata: {
          date: shift.date,
          storeId: shift.storeId,
        },
      },
    }));
    
    // ✅ FASE 4: Eventi dallo store Zustand (resourceAssignments)
    const storeAssignmentEvents = resourceAssignments.map((ra: ResourceAssignment) => {
      // Trova il template per ottenere il colore
      const template = templateSelections.find(ts => ts.templateId === ra.templateId)?.template;
      const bgColor = template?.color || 'hsl(142, 76%, 36%)';
      
      // Crea datetime completo combinando giorno + orario
      const startDateTime = `${ra.day}T${ra.startTime || '09:00'}:00`;
      const endDateTime = `${ra.day}T${ra.endTime || '18:00'}:00`;
      
      return {
        id: `store-${ra.resourceId}-${ra.templateId}-${ra.slotId}-${ra.day}`,
        title: ra.resourceName || 'Risorsa',
        start: startDateTime,
        end: endDateTime,
        resourceId: ra.resourceId,
        backgroundColor: bgColor,
        borderColor: bgColor,
        extendedProps: {
          type: 'store_assignment',
          resourceId: ra.resourceId,
          resourceName: ra.resourceName,
          templateId: ra.templateId,
          slotId: ra.slotId,
          storeId: ra.storeId,
          storeName: ra.storeName,
          metadata: {
            storeId: ra.storeId,
            employeeId: ra.resourceId,
          },
        },
      };
    });
    
    return [...calendarEventsFromBackend, ...shiftAssignmentEvents, ...plannedShiftEvents, ...storeAssignmentEvents];
  }, [backendEvents, shiftAssignments, plannedShifts, resourceAssignments, templateSelections]);


  // ✅ FASE 1.2: Colori per tutti i tipi di evento del calendario unificato
  function getEventColor(eventType: string) {
    switch (eventType) {
      case 'meeting': return 'hsl(var(--primary))'; // Brand primary
      case 'shift': return 'hsl(var(--success))'; // Verde per turni  
      case 'shift_assignment': return 'hsl(142, 76%, 36%)'; // Verde per turni assegnati (Task 8)
      case 'planned_shift': return 'hsl(280, 70%, 50%)'; // Viola per turni pianificati
      case 'time_off': return 'hsl(var(--warning))'; // Arancione per ferie
      case 'overtime': return 'hsl(var(--destructive))'; // Rosso per straordinari
      case 'training': return 'hsl(212, 100%, 50%)'; // Blu per formazione
      case 'deadline': return 'hsl(0, 84%, 60%)'; // Rosso urgente per scadenze
      case 'other': return 'hsl(var(--muted))'; // Grigio per altro
      default: return 'hsl(var(--muted))';
    }
  }

  // ✅ Task 13: Gestione click su data - apre modal dettaglio giorno
  const handleDateClick = useCallback((arg: any) => {
    setSelectedDayDate(new Date(arg.date));
    setDayDetailStoreFilter('all');
    setSelectedEventTypeFilter(null); // Reset filter
    setShowDayDetailModal(true);
  }, []);
  
  // Handler per click su icona tipo evento nella cella
  const handleEventTypeClick = useCallback((date: Date, eventType: string) => {
    setSelectedDayDate(date);
    setDayDetailStoreFilter('all');
    setSelectedStoreFilters([]);
    setSelectedResourceFilters([]);
    setSelectedEventTypeFilter(eventType); // Pre-filtra per tipo evento
    setShowDayDetailModal(true);
  }, []);

  // ✅ FASE 1.2 FIX: Gestione click su evento - legge dalla struttura unificata
  const handleEventClick = useCallback((arg: any) => {
    const event = arg.event;
    const eventType = event.extendedProps.type;
    
    if (eventType === 'shift') {
      form.setValue('title', event.title);
      form.setValue('start', event.start.toISOString().slice(0, 16));
      form.setValue('end', event.end.toISOString().slice(0, 16));
      form.setValue('employeeId', event.extendedProps.metadata?.employeeId || '');
      form.setValue('shiftType', event.extendedProps.metadata?.shiftType || 'full_time');
      form.setValue('notes', event.extendedProps.description || '');
      
      setSelectedEvent(event);
      setEventModalMode('edit');
      setShowEventModal(true);
    } else if (eventType === 'planned_shift') {
      form.setValue('title', event.title || 'Turno Pianificato');
      form.setValue('start', event.start?.toISOString().slice(0, 16) || '');
      form.setValue('end', event.end?.toISOString().slice(0, 16) || '');
      form.setValue('employeeId', '');
      form.setValue('shiftType', 'full_time');
      form.setValue('notes', `Turno pianificato - Staff richiesto: ${event.extendedProps.requiredStaff || 1}`);
      
      setSelectedEvent(event);
      setEventModalMode('edit');
      setShowEventModal(true);
    } else if (eventType === 'shift_assignment') {
      const assignment = event.extendedProps;
      form.setValue('title', event.title || 'Turno Assegnato');
      form.setValue('start', event.start?.toISOString?.()?.slice(0, 16) || '');
      form.setValue('end', event.end?.toISOString?.()?.slice(0, 16) || '');
      form.setValue('employeeId', assignment.employee?.id || '');
      form.setValue('shiftType', 'full_time');
      form.setValue('notes', assignment.hasConflict ? 'ATTENZIONE: Questo turno ha conflitti!' : '');
      
      setSelectedEvent(event);
      setEventModalMode('edit');
      setShowEventModal(true);
    }
  }, [form]);

  // ✅ FASE 1.2 FIX: Drag & Drop eventi - gestisce struttura unificata
  const handleEventDrop = useCallback((arg: any) => {
    const event = arg.event;
    if (event.extendedProps.type === 'shift') {
      const eventId = event.id; // No more 'shift-' prefix removal needed
      const newResource = event.getResources()[0]?.id;
      const oldEmployeeId = event.extendedProps.metadata?.employeeId;
      
      // ✅ FIX: Use ISO strings for dates and proper metadata structure  
      const updatedMetadata = {
        ...event.extendedProps.metadata,
        employeeId: newResource || oldEmployeeId
      };
      
      // ✅ FIX: Use setExtendedProp instead of direct mutation for better rerender behavior
      if (newResource && newResource !== oldEmployeeId) {
        event.setExtendedProp('metadata', updatedMetadata);
      }
      
      // ✅ FASE 1.2 FIX: Aggiorna evento con ISO strings e metadata corretta
      apiRequest(`/api/hr/calendar/events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          startDate: event.start.toISOString(), // ✅ FIX: ISO string, not Date object
          endDate: event.end.toISOString(),     // ✅ FIX: ISO string, not Date object
          metadata: updatedMetadata
        }),
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/hr/calendar/events'] });
        const changeType = newResource && newResource !== oldEmployeeId ? 'assegnato e spostato' : 'spostato';
        toast({ title: `Evento ${changeType} con successo!` });
      }).catch(() => {
        arg.revert(); // Annulla il movimento
        toast({ title: 'Errore nello spostamento del turno', variant: 'destructive' });
      });
    }
  }, [queryClient, toast]);

  // Navigazione calendario
  const goToPrevious = () => {
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.prev();
  };

  const goToNext = () => {
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.next();
  };

  const goToToday = () => {
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.today();
  };

  // Cambio vista
  const changeView = (view: string) => {
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.changeView(view);
    setCurrentView(view);
  };

  // ✅ FIX: Submit form - distinguish between create and edit modes
  const onSubmit = (data: ShiftEventForm) => {
    if (eventModalMode === 'edit' && selectedEvent) {
      updateEventMutation.mutate(data);
    } else {
      createEventMutation.mutate(data);
    }
  };

  // FASE 5: Mutations per azioni sui turni - ENDPOINT CORRETTI
  const reassignShiftMutation = useMutation({
    mutationFn: async ({ assignmentId, newEmployeeId }: { assignmentId: string; newEmployeeId: string }) => {
      return apiRequest(`/api/hr/shifts/assignments/${assignmentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          employeeId: newEmployeeId
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shift-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/calendar/events'] });
      toast({ title: 'Turno riassegnato con successo!', description: 'La risorsa è stata aggiornata' });
      setShowActionModal(false);
      setActionTarget(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Errore nella riassegnazione', 
        description: error?.message || 'Impossibile riassegnare il turno',
        variant: 'destructive' 
      });
    },
  });

  const removeShiftMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      return apiRequest(`/api/hr/shifts/assignments/${assignmentId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shift-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/calendar/events'] });
      toast({ title: 'Turno rimosso con successo!', description: 'L\'assegnazione è stata eliminata' });
      setShowActionModal(false);
      setActionTarget(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Errore nella rimozione', 
        description: error?.message || 'Impossibile rimuovere il turno',
        variant: 'destructive' 
      });
    },
  });

  const changeTimeShiftMutation = useMutation({
    mutationFn: async ({ assignmentId, startTime, endTime }: { assignmentId: string; startTime: string; endTime: string }) => {
      return apiRequest(`/api/hr/shifts/assignments/${assignmentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          startTime: startTime,
          endTime: endTime,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shift-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/calendar/events'] });
      toast({ title: 'Orario modificato con successo!', description: 'L\'orario del turno è stato aggiornato' });
      setShowActionModal(false);
      setActionTarget(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Errore nella modifica orario', 
        description: error?.message || 'Impossibile modificare l\'orario',
        variant: 'destructive' 
      });
    },
  });

  // FASE 5: Handler per aprire modal azioni
  const handleOpenActionModal = useCallback((resource: any, action: 'reassign' | 'remove' | 'change_time') => {
    setActionTarget({
      id: resource.id,
      employeeId: resource.employeeId,
      employeeName: resource.employeeName,
      startTime: resource.startTime,
      endTime: resource.endTime,
      storeId: resource.storeId,
      storeName: resource.storeName,
      title: resource.title,
    });
    setActionType(action);
    setNewAssigneeId('');
    setNewStartTime(resource.startTime);
    setNewEndTime(resource.endTime);
    setShowActionModal(true);
  }, []);

  // FASE 5: Handler per eseguire azione - USA assignmentId
  const handleExecuteAction = useCallback(() => {
    if (!actionTarget || !actionType) return;

    console.log('[HR-ACTION] Esecuzione azione:', { actionType, assignmentId: actionTarget.id, target: actionTarget });

    switch (actionType) {
      case 'reassign':
        if (newAssigneeId) {
          reassignShiftMutation.mutate({ assignmentId: actionTarget.id, newEmployeeId: newAssigneeId });
        }
        break;
      case 'remove':
        removeShiftMutation.mutate(actionTarget.id);
        break;
      case 'change_time':
        if (newStartTime && newEndTime) {
          changeTimeShiftMutation.mutate({ 
            assignmentId: actionTarget.id, 
            startTime: newStartTime, 
            endTime: newEndTime 
          });
        }
        break;
    }
  }, [actionTarget, actionType, newAssigneeId, newStartTime, newEndTime, reassignShiftMutation, removeShiftMutation, changeTimeShiftMutation]);

  // ✅ FASE 4/5: Calcola risorse in turno per il giorno selezionato DAI DATI BACKEND
  // NORMALIZED: Data is already normalized in queryFn, using camelCase properties
  const dayDetailResources = useMemo(() => {
    if (!selectedDayDate) return [];
    
    const dayStr = selectedDayDate.toISOString().split('T')[0];
    const now = new Date();
    
    // USA DATI BACKEND (shiftAssignments) come fonte primaria - già normalizzati
    const assignmentsArray = Array.isArray(shiftAssignments) ? shiftAssignments : [];
    
    // Filtra assignment per il giorno corrente (usa campo normalizzato shiftDate)
    let dayAssignments = assignmentsArray.filter((sa: any) => {
      const shiftDate = sa.shiftDate?.split('T')[0];
      return shiftDate === dayStr;
    });
    
    // FASE 4: Filtra per stores multi-select (usa campo normalizzato storeId)
    if (selectedStoreFilters.length > 0) {
      dayAssignments = dayAssignments.filter((sa: any) => 
        sa.storeId && selectedStoreFilters.includes(sa.storeId)
      );
    } else if (dayDetailStoreFilter !== 'all') {
      dayAssignments = dayAssignments.filter((sa: any) => 
        sa.storeId === dayDetailStoreFilter
      );
    }
    
    // FASE 4: Filtra per risorse multi-select (usa campo normalizzato employeeId)
    if (selectedResourceFilters.length > 0) {
      dayAssignments = dayAssignments.filter((sa: any) => 
        selectedResourceFilters.includes(sa.employeeId)
      );
    }
    
    // Mappa a struttura risorsa con status usando dati normalizzati
    return dayAssignments.map((sa: any) => {
      const shiftDate = new Date(sa.shiftDate);
      
      let status: 'past' | 'present' | 'future' = 'future';
      if (shiftDate < now) {
        status = 'past';
      } else if (shiftDate.toDateString() === now.toDateString()) {
        status = 'present';
      }
      
      // Use normalized employee data
      const employeeName = sa.employee 
        ? `${sa.employee.firstName} ${sa.employee.lastName}` 
        : 'Risorsa';
      
      // Extract time slots from template version (already normalized)
      const templateVersion = sa.templateVersion;
      const timeSlotsSnapshot = templateVersion?.timeSlotsSnapshot || [];
      
      // Use shift times (already normalized and flattened)
      let shiftStartTime = sa.startTime;
      let shiftEndTime = sa.endTime;
      
      // If times are ISO timestamps, extract just the time part
      if (shiftStartTime && shiftStartTime.includes('T')) {
        shiftStartTime = shiftStartTime.split('T')[1]?.substring(0, 5) || shiftStartTime;
      }
      if (shiftEndTime && shiftEndTime.includes('T')) {
        shiftEndTime = shiftEndTime.split('T')[1]?.substring(0, 5) || shiftEndTime;
      }
      
      // Fallback to first time slot from version snapshot if shift times not available
      if (!shiftStartTime && timeSlotsSnapshot.length > 0) {
        shiftStartTime = timeSlotsSnapshot[0]?.startTime?.substring(0, 5) || '09:00';
      }
      if (!shiftEndTime && timeSlotsSnapshot.length > 0) {
        shiftEndTime = timeSlotsSnapshot[0]?.endTime?.substring(0, 5) || '18:00';
      }
      
      return {
        id: sa.id,
        employeeId: sa.employeeId,
        title: templateVersion?.name || 'Turno',
        employeeName,
        storeName: sa.store?.name || sa.store?.nome || 'N/A',
        storeId: sa.storeId,
        startTime: shiftStartTime || '09:00',
        endTime: shiftEndTime || '18:00',
        status,
        type: 'shift',
        templateId: sa.templateId,
        templateVersionId: sa.templateVersionId || templateVersion?.id,
        versionNumber: templateVersion?.versionNumber,
        timeSlotsSnapshot,
        hasConflict: sa.hasConflict,
      };
    });
  }, [selectedDayDate, shiftAssignments, dayDetailStoreFilter, selectedStoreFilters, selectedResourceFilters]);

  // FASE 4: Calcola statistiche copertura per ogni giorno DAI DATI BACKEND + conteggio per tipo evento
  // NORMALIZED: Data is already normalized in queryFn, using camelCase properties
  const getDayCoverageInfo = useCallback((date: Date) => {
    const dayStr = date.toISOString().split('T')[0];
    
    // USA DATI BACKEND (shiftAssignments) come fonte primaria - già normalizzati
    const assignmentsArray = Array.isArray(shiftAssignments) ? shiftAssignments : [];
    
    // Filtra assignment per il giorno corrente (usa campo normalizzato shiftDate)
    const dayAssignments = assignmentsArray.filter((sa: any) => {
      const shiftDate = sa.shiftDate?.split('T')[0];
      return shiftDate === dayStr;
    });
    
    // Trova le risorse uniche assegnate in questo giorno (usa campi normalizzati)
    const resourceIds = new Set(dayAssignments.map((sa: any) => sa.employeeId));
    const storeIds = new Set(dayAssignments.map((sa: any) => sa.storeId).filter(Boolean));
    
    // Conteggio per tipo evento
    const eventCounts: Record<string, number> = {
      shift_planning: dayAssignments.length,
      leave: 0,
      training: 0,
      deadline: 0,
      meeting: 0,
      overtime: 0,
    };
    
    // Conta eventi dal calendario backend (leave, training, ecc.)
    const eventsArray = Array.isArray(backendEvents) ? backendEvents : [];
    eventsArray.forEach((event: any) => {
      const eventDate = event.startDate?.split('T')[0] || event.date?.split('T')[0];
      if (eventDate === dayStr) {
        const eventType = mapBackendEventToType(event.type);
        if (eventCounts[eventType] !== undefined) {
          eventCounts[eventType]++;
        }
      }
    });
    
    return {
      totalShifts: dayAssignments.length,
      resourceCount: resourceIds.size,
      storeCount: storeIds.size,
      eventCounts,
      assignments: dayAssignments,
    };
  }, [shiftAssignments, backendEvents]);
  
  // FASE 4: Lista risorse uniche nel giorno per filtro DAI DATI BACKEND
  // NORMALIZED: Data is already normalized in queryFn, using camelCase properties
  const dayResourcesForFilter = useMemo(() => {
    if (!selectedDayDate) return [];
    
    const dayStr = selectedDayDate.toISOString().split('T')[0];
    const assignmentsArray = Array.isArray(shiftAssignments) ? shiftAssignments : [];
    
    // Filtra assignment per il giorno corrente (usa campo normalizzato shiftDate)
    const dayAssignments = assignmentsArray.filter((sa: any) => {
      const shiftDate = sa.shiftDate?.split('T')[0];
      return shiftDate === dayStr;
    });
    
    const uniqueResources = new Map();
    dayAssignments.forEach((sa: any) => {
      if (sa.employeeId && !uniqueResources.has(sa.employeeId)) {
        const name = sa.employee 
          ? `${sa.employee.firstName} ${sa.employee.lastName}` 
          : 'Risorsa';
        uniqueResources.set(sa.employeeId, {
          id: sa.employeeId,
          name,
        });
      }
    });
    
    return Array.from(uniqueResources.values());
  }, [selectedDayDate, shiftAssignments]);

  // FASE 4: Lista stores unici nel giorno per filtro DAI DATI BACKEND
  // NORMALIZED: Data is already normalized in queryFn, using camelCase properties
  const dayStoresForFilter = useMemo(() => {
    if (!selectedDayDate) return [];
    
    const dayStr = selectedDayDate.toISOString().split('T')[0];
    const assignmentsArray = Array.isArray(shiftAssignments) ? shiftAssignments : [];
    
    // Filtra assignment per il giorno corrente (usa campo normalizzato shiftDate)
    const dayAssignments = assignmentsArray.filter((sa: any) => {
      const shiftDate = sa.shiftDate?.split('T')[0];
      return shiftDate === dayStr;
    });
    
    const uniqueStores = new Map();
    dayAssignments.forEach((sa: any) => {
      if (sa.storeId && !uniqueStores.has(sa.storeId)) {
        uniqueStores.set(sa.storeId, {
          id: sa.storeId,
          name: sa.store?.name || sa.store?.nome || 'N/A',
        });
      }
    });
    
    return Array.from(uniqueStores.values());
  }, [selectedDayDate, shiftAssignments]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header con controlli */}
      <Card className="backdrop-blur-md bg-white/10 border-white/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Calendar className="w-6 h-6 text-orange-500" />
              <div>
                <CardTitle className="text-xl">Calendario Turni e Risorse</CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Vista professionale con gestione completa
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Controlli navigazione e vista */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            {/* Navigazione */}
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={goToPrevious} data-testid="button-prev">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday} data-testid="button-today">
                Oggi
              </Button>
              <Button variant="outline" size="sm" onClick={goToNext} data-testid="button-next">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Selezione vista */}
            <div className="flex items-center space-x-2">
              <div className="flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden">
                <Button
                  variant={currentView === 'dayGridMonth' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => changeView('dayGridMonth')}
                  className="rounded-none"
                  data-testid="view-month"
                >
                  Mese
                </Button>
                <Button
                  variant={currentView === 'timeGridWeek' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => changeView('timeGridWeek')}
                  className="rounded-none"
                  data-testid="view-week"
                >
                  Settimana
                </Button>
                <Button
                  variant={currentView === 'timeGridDay' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => changeView('timeGridDay')}
                  className="rounded-none"
                  data-testid="view-day"
                >
                  Giorno
                </Button>
              </div>
            </div>

            {/* Professional Shift Legend */}
            <div className="flex items-center space-x-3">
            </div>
          </div>

          {/* Calendario FullCalendar */}
          <div className="calendar-container bg-white dark:bg-slate-900 rounded-lg p-4 shadow-sm relative">
            {/* Loading overlay - shown on top of calendar instead of replacing it */}
            {(calendarLoading || assignmentsLoading) && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 rounded-lg">
                <div className="text-center">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-slate-400 animate-spin" />
                  <p className="text-slate-600 dark:text-slate-400">
                    Caricamento {assignmentsLoading ? 'turni assegnati' : 'calendario'}...
                  </p>
                </div>
              </div>
            )}
            {/* FullCalendar always mounted to prevent DOM cleanup errors */}
            <FullCalendar
                ref={calendarRef}
                plugins={[
                  dayGridPlugin,
                  timeGridPlugin,
                  interactionPlugin,
                  listPlugin,
                ]}
                initialView="dayGridMonth"
                headerToolbar={false} // Usiamo i nostri controlli custom
                height="auto"
                locale="it"
                firstDay={1} // Lunedì
                slotMinTime="06:00:00"
                slotMaxTime="24:00:00"
                slotDuration="01:00:00"
                slotLabelInterval="02:00:00"
                allDaySlot={false}
                weekNumbers={true}
                weekNumberFormat={{ week: 'numeric' }}
                events={[]}
                editable={false}
                droppable={false}
                selectable={true}
                selectMirror={false}
                nowIndicator={true}
                businessHours={{
                  daysOfWeek: [1, 2, 3, 4, 5, 6], // Lunedì-Sabato
                  startTime: '06:00',
                  endTime: '22:00',
                }}
                dateClick={handleDateClick}
                dayCellContent={(arg) => {
                  const coverageInfo = getDayCoverageInfo(arg.date);
                  const hasEvents = Object.values(coverageInfo.eventCounts).some(count => count > 0);
                  
                  return (
                    <div className="relative w-full h-full min-h-[60px]">
                      <div className="text-right p-1">
                        {arg.dayNumberText}
                      </div>
                      {/* Icone eventi per tipo con badge contatore e tooltip */}
                      {hasEvents && (
                        <div className="absolute bottom-1 left-1 right-1">
                          <DayCellIndicators 
                            eventCounts={coverageInfo.eventCounts}
                            onEventTypeClick={(eventType) => handleEventTypeClick(arg.date, eventType)}
                          />
                        </div>
                      )}
                    </div>
                  );
                }}
              />
          </div>
        </CardContent>
      </Card>

      {/* Modal creazione/modifica turno */}
      <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {eventModalMode === 'create' ? 'Nuovo Turno' : 'Modifica Turno'}
            </DialogTitle>
            <DialogDescription>
              {eventModalMode === 'create' 
                ? 'Crea un nuovo turno assegnando un dipendente a una fascia oraria' 
                : 'Modifica i dettagli del turno selezionato'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titolo Turno</FormLabel>
                    <FormControl>
                      <Input placeholder="Es: Turno Cassa Mattino" {...field} data-testid="input-shift-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inizio</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} data-testid="input-shift-start" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fine</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} data-testid="input-shift-end" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dipendente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-employee">
                          <SelectValue placeholder="Seleziona dipendente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent container={null}>
                        {(employees as any[]).map((emp: any) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName} - {emp.role || 'Dipendente'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="shiftType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo Turno</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-shift-type">
                          <SelectValue placeholder="Seleziona tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent container={null}>
                        <SelectItem value="full_time">Standard Full-Time (8h)</SelectItem>
                        <SelectItem value="part_time_4h">Part-Time (4h)</SelectItem>
                        <SelectItem value="part_time_6h">Part-Time (6h)</SelectItem>
                        <SelectItem value="flexible">Flessibile</SelectItem>
                        <SelectItem value="overtime">Straordinario</SelectItem>
                        <SelectItem value="custom">Personalizzato</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note (opzionale)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Note aggiuntive per il turno..."
                        rows={3}
                        {...field}
                        data-testid="textarea-shift-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowEventModal(false)}
                  data-testid="button-cancel"
                >
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={createEventMutation.isPending || updateEventMutation.isPending}
                  className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                  data-testid="button-save-event"
                >
                  {(createEventMutation.isPending || updateEventMutation.isPending) ? 'Salvando...' : 
                   eventModalMode === 'create' ? 'Crea Evento' : 'Salva Modifiche'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ✅ Task 13 + FASE 4/5/7: Modal Dettaglio Giorno - Dual View (Store Timeline + Risorse) */}
      <Dialog open={showDayDetailModal} onOpenChange={(open) => {
        setShowDayDetailModal(open);
        if (!open) {
          setSelectedStoreFilters([]);
          setSelectedResourceFilters([]);
          setSelectedEventTypeFilter(null);
          setDayModalView('store');
        }
      }}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-orange-500" />
              <span>
                Pianificazione - {selectedDayDate?.toLocaleDateString('it-IT', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </DialogTitle>
            <DialogDescription>
              Visualizza la copertura del negozio o i dettagli delle risorse assegnate
            </DialogDescription>
          </DialogHeader>

          {/* FASE 7: Tabs per vista Store Timeline vs Dettaglio Risorse */}
          <Tabs value={dayModalView} onValueChange={(v) => setDayModalView(v as 'store' | 'resource')} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="store" className="flex items-center gap-2" data-testid="tab-store-view">
                <StoreIcon className="w-4 h-4" />
                Copertura Store
              </TabsTrigger>
              <TabsTrigger value="resource" className="flex items-center gap-2" data-testid="tab-resource-view">
                <Users className="w-4 h-4" />
                Dettaglio Risorse
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Vista Store Timeline (Enhanced StoreCoverageView) */}
            <TabsContent value="store" className="flex-1 overflow-auto mt-4">
              <StoreCoverageView
                selectedDate={selectedDayDate || new Date()}
                resources={dayDetailResources.map((r: any) => ({
                  id: r.id,
                  employeeId: r.employeeId,
                  employeeName: r.employeeName,
                  startTime: r.startTime,
                  endTime: r.endTime,
                  status: r.status,
                  storeName: r.storeName,
                  storeId: r.storeId,
                  title: r.title,
                  versionNumber: r.versionNumber,
                  templateVersion: r.templateVersion ? {
                    versionNumber: r.templateVersion.versionNumber || r.versionNumber,
                    name: r.templateVersion.name || r.title,
                    timeSlotsSnapshot: r.timeSlotsSnapshot || r.templateVersion.timeSlotsSnapshot,
                  } : undefined,
                }))}
                stores={dayStoresForFilter.map((s: any) => ({
                  id: s.id,
                  name: s.name,
                  openingTime: s.openingTime || '09:00',
                  closingTime: s.closingTime || '20:00',
                }))}
                selectedStoreId={selectedStoreFilters.length > 0 ? selectedStoreFilters[0] : null}
                onStoreSelect={(storeId) => setSelectedStoreFilters([storeId])}
                onResourceClick={(resource) => {
                  setSelectedResourceForContext(resource.employeeId);
                  setDayModalView('resource');
                  setSelectedResourceFilters([resource.employeeId]);
                }}
              />
            </TabsContent>

            {/* TAB 2: Vista Dettaglio Risorse (lista esistente) */}
            <TabsContent value="resource" className="flex-1 overflow-auto mt-4">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                  {/* FASE 4: Multi-select PDV */}
                  <div className="bg-gray-50 rounded-lg p-3 space-y-3">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      Filtra per Punto Vendita
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={selectedStoreFilters.length === 0 ? "default" : "outline"}
                        className="h-7 text-xs"
                        onClick={() => setSelectedStoreFilters([])}
                        data-testid="btn-all-stores"
                      >
                        Tutti ({dayStoresForFilter.length})
                      </Button>
                      {dayStoresForFilter.map((store: any) => (
                        <Button
                          key={store.id}
                          size="sm"
                          variant={selectedStoreFilters.includes(store.id) ? "default" : "outline"}
                          className="h-7 text-xs"
                          onClick={() => {
                            setSelectedStoreFilters(prev => 
                              prev.includes(store.id) 
                                ? prev.filter(id => id !== store.id)
                                : [...prev, store.id]
                            );
                          }}
                          data-testid={`btn-store-filter-${store.id}`}
                        >
                          <StoreIcon className="w-3 h-3 mr-1" />
                          {store.name}
                        </Button>
                      ))}
                </div>
              </div>

              {/* FASE 4: Multi-select Risorse */}
              <div className="bg-gray-50 rounded-lg p-3 space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Filtra per Risorsa
                </h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={selectedResourceFilters.length === 0 ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => setSelectedResourceFilters([])}
                    data-testid="btn-all-resources"
                  >
                    Tutte ({dayResourcesForFilter.length})
                  </Button>
                  {dayResourcesForFilter.map((resource: any) => (
                    <Button
                      key={resource.id}
                      size="sm"
                      variant={selectedResourceFilters.includes(resource.id) ? "default" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => {
                        setSelectedResourceFilters(prev => 
                          prev.includes(resource.id) 
                            ? prev.filter(id => id !== resource.id)
                            : [...prev, resource.id]
                        );
                      }}
                      data-testid={`btn-resource-filter-${resource.id}`}
                    >
                      {resource.name}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Lista Risorse con azioni FASE 5 */}
              {dayDetailResources.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nessuna risorsa in turno per questo giorno</p>
                  {(selectedStoreFilters.length > 0 || selectedResourceFilters.length > 0) && (
                    <p className="text-sm mt-2">Prova a rimuovere i filtri</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Trovate {dayDetailResources.length} risorse in turno
                  </p>
                  {dayDetailResources.map((resource: any) => (
                    <Card key={resource.id} className="border-l-4" style={{
                      borderLeftColor: 
                        resource.status === 'past' ? 'hsl(var(--muted))' :
                        resource.status === 'present' ? 'hsl(142, 76%, 36%)' :
                        'hsl(217, 91%, 60%)'
                    }}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              <button
                                className={cn(
                                  "font-semibold text-left hover:text-blue-600 transition-colors",
                                  selectedResourceForContext === resource.employeeId && "text-blue-600 underline"
                                )}
                                onClick={() => setSelectedResourceForContext(
                                  selectedResourceForContext === resource.employeeId ? null : resource.employeeId
                                )}
                                data-testid={`btn-resource-context-${resource.id}`}
                              >
                                {resource.employeeName}
                              </button>
                              {(() => {
                                const statusColors = getShiftStatusColor(resource.status);
                                return (
                                  <Badge 
                                    className={cn(statusColors.bg, statusColors.text, 'border', statusColors.border)}
                                    data-testid={`badge-status-${resource.status}`}
                                  >
                                    {getShiftStatusLabel(resource.status)}
                                  </Badge>
                                );
                              })()}
                            </div>
                            <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-blue-500" />
                                <span className="font-medium">{formatTimeRange(resource.startTime, resource.endTime)}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <StoreIcon className="w-4 h-4 text-orange-500" />
                                <span>{resource.storeName}</span>
                              </div>
                            </div>
                            
                            {/* FASE 6: Contesto Risorsa inline */}
                            {selectedResourceForContext === resource.employeeId && resourceContext && (
                              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs">
                                <div className="flex items-center gap-2 mb-2">
                                  <Users className="w-4 h-4 text-blue-600" />
                                  <span className="font-medium text-blue-800">Contesto Risorsa</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-slate-700">
                                  <div>
                                    <span className="text-slate-500">Ore Settimana:</span>{' '}
                                    <strong>{resourceContext.hours?.weeklyHours || 0}h</strong>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Ore Mese:</span>{' '}
                                    <strong>{resourceContext.hours?.monthlyHours || 0}h</strong>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Turni Settimana:</span>{' '}
                                    <strong>{resourceContext.assignments?.thisWeek || 0}</strong>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Turni Mese:</span>{' '}
                                    <strong>{resourceContext.assignments?.thisMonth || 0}</strong>
                                  </div>
                                </div>
                                {resourceContext.conflicts && resourceContext.conflicts.length > 0 && (
                                  <div className="mt-2 p-2 bg-red-100 rounded text-red-700 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>{resourceContext.conflicts.length} conflitti rilevati</span>
                                  </div>
                                )}
                                {resourceContext.storeHistory && resourceContext.storeHistory.length > 1 && (
                                  <div className="mt-2 text-slate-600">
                                    <span className="text-slate-500">Negozi:</span>{' '}
                                    {resourceContext.storeHistory.map((s: any) => s.storeName).join(', ')}
                                  </div>
                                )}
                              </div>
                            )}
                            {selectedResourceForContext === resource.employeeId && resourceContextLoading && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg animate-pulse text-xs text-gray-500">
                                Caricamento contesto...
                              </div>
                            )}
                          </div>
                          
                          {/* FASE 5: Azioni sul turno - PULSANTI COMPATTI */}
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-xs font-medium border-blue-200 hover:bg-blue-50"
                              onClick={() => handleOpenActionModal(resource, 'reassign')}
                              data-testid={`btn-reassign-${resource.id}`}
                            >
                              <ArrowLeftRight className="w-3.5 h-3.5 mr-1 text-blue-600" />
                              Riassegna
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2 text-xs font-medium border-red-200 hover:bg-red-50 text-red-600"
                              onClick={() => handleOpenActionModal(resource, 'remove')}
                              data-testid={`btn-remove-${resource.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              Elimina
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowDayDetailModal(false)}
              data-testid="button-close-day-detail"
            >
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FASE 5: Modal Azioni Turno */}
      <Dialog open={showActionModal} onOpenChange={setShowActionModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'reassign' && <ArrowLeftRight className="w-5 h-5 text-blue-500" />}
              {actionType === 'remove' && <Trash2 className="w-5 h-5 text-red-500" />}
              {actionType === 'change_time' && <Clock className="w-5 h-5 text-orange-500" />}
              {actionType === 'reassign' && 'Riassegna Turno'}
              {actionType === 'remove' && 'Rimuovi Turno'}
              {actionType === 'change_time' && 'Cambia Orario'}
            </DialogTitle>
            <DialogDescription>
              {actionTarget && (
                <span>
                  Turno di <strong>{actionTarget.employeeName}</strong> ({formatTimeRange(actionTarget.startTime, actionTarget.endTime)})
                  {actionTarget.storeName && <> presso <strong>{actionTarget.storeName}</strong></>}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Riassegna con badge disponibilità */}
            {actionType === 'reassign' && (
              <div className="space-y-3">
                <label className="text-sm font-medium">Seleziona Nuova Risorsa</label>
                <p className="text-xs text-slate-500">
                  Fascia oraria: {actionTarget?.startTime} - {actionTarget?.endTime}
                </p>
                
                {/* Lista risorse con indicatori disponibilità */}
                <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-2">
                  {(employees as any[])
                    .filter((e: any) => e.id !== actionTarget?.employeeId)
                    .map((emp: any) => {
                      // Verifica se la risorsa ha turni sovrapposti nella stessa fascia
                      const hasConflict = dayDetailResources.some((r: any) => 
                        r.employeeId === emp.id && 
                        r.id !== actionTarget?.id &&
                        !(r.endTime <= (actionTarget?.startTime || '') || 
                          r.startTime >= (actionTarget?.endTime || ''))
                      );
                      
                      return (
                        <button
                          key={emp.id}
                          type="button"
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-lg border transition-colors",
                            newAssigneeId === emp.id 
                              ? "border-blue-500 bg-blue-50" 
                              : hasConflict 
                                ? "border-red-200 bg-red-50 hover:bg-red-100" 
                                : "border-green-200 bg-green-50 hover:bg-green-100"
                          )}
                          onClick={() => setNewAssigneeId(emp.id)}
                          data-testid={`btn-select-resource-${emp.id}`}
                        >
                          <div className="flex items-center gap-2">
                            <Users className={cn(
                              "w-4 h-4",
                              hasConflict ? "text-red-500" : "text-green-600"
                            )} />
                            <span className="font-medium text-sm">
                              {emp.firstName} {emp.lastName}
                            </span>
                          </div>
                          <Badge 
                            variant={hasConflict ? "destructive" : "default"}
                            className={cn(
                              "text-xs",
                              hasConflict 
                                ? "bg-red-100 text-red-700 border-red-300" 
                                : "bg-green-100 text-green-700 border-green-300"
                            )}
                          >
                            {hasConflict ? (
                              <><AlertTriangle className="w-3 h-3 mr-1" /> Occupato</>
                            ) : (
                              <><CheckCircle2 className="w-3 h-3 mr-1" /> Libero</>
                            )}
                          </Badge>
                        </button>
                      );
                    })}
                </div>
                
                {newAssigneeId && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-800">
                      Selezionato: {
                        (employees as any[]).find((e: any) => e.id === newAssigneeId)?.firstName
                      } {
                        (employees as any[]).find((e: any) => e.id === newAssigneeId)?.lastName
                      }
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Rimuovi - conferma */}
            {actionType === 'remove' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Conferma rimozione</p>
                    <p className="text-sm text-red-600 mt-1">
                      Sei sicuro di voler rimuovere questo turno? L'azione non può essere annullata.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Cambia orario */}
            {actionType === 'change_time' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Inizio</label>
                  <Input 
                    type="time" 
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    data-testid="input-new-start-time"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fine</label>
                  <Input 
                    type="time" 
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    data-testid="input-new-end-time"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowActionModal(false);
                setActionTarget(null);
              }}
            >
              Annulla
            </Button>
            <Button 
              onClick={handleExecuteAction}
              disabled={
                (actionType === 'reassign' && !newAssigneeId) ||
                (actionType === 'change_time' && (!newStartTime || !newEndTime)) ||
                reassignShiftMutation.isPending ||
                removeShiftMutation.isPending ||
                changeTimeShiftMutation.isPending
              }
              variant={actionType === 'remove' ? 'destructive' : 'default'}
              data-testid="btn-confirm-action"
            >
              {(reassignShiftMutation.isPending || removeShiftMutation.isPending || changeTimeShiftMutation.isPending) 
                ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Elaborazione...</>
                : actionType === 'reassign' ? 'Riassegna'
                : actionType === 'remove' ? 'Rimuovi'
                : 'Salva'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ✅ FIX: Wrap with React.memo to prevent unnecessary re-renders that trigger FullCalendar remount
// This combined with the useEffect cleanup guard protects against React.StrictMode double-mount errors
const HRCalendar = memo(HRCalendarComponent);
export default HRCalendar;