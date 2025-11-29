import { useState, useRef, useCallback, useMemo } from 'react';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { useShiftPlanningStore, type ResourceAssignment, type CoverageSlot } from '@/stores/shiftPlanningStore';

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

export default function HRCalendar({ className, storeId, startDate, endDate }: HRCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventModalMode, setEventModalMode] = useState<'create' | 'edit'>('create');
  
  // ✅ Task 13: State for day detail modal
  const [showDayDetailModal, setShowDayDetailModal] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);
  const [dayDetailStoreFilter, setDayDetailStoreFilter] = useState<string>('all');
  
  // FASE 4: Multi-select stores and resources
  const [selectedStoreFilters, setSelectedStoreFilters] = useState<string[]>([]);
  const [selectedResourceFilters, setSelectedResourceFilters] = useState<string[]>([]);
  
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

  // ✅ Task 8: Query shift assignments con filtri globali
  const { data: shiftAssignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ['/api/hr/shift-assignments', { storeId, startDate, endDate }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (storeId) params.append('storeId', storeId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const url = `/api/hr/shift-assignments${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiRequest(url);
      return response;
    },
    enabled: hrQueryReadiness.enabled && Boolean(storeId),
  });

  // ✅ Query per turni pianificati (bulk-planning)
  const { data: plannedShifts = [] } = useQuery({
    queryKey: ['/api/hr/shifts', { storeId, startDate, endDate }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (storeId) params.append('storeId', storeId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const url = `/api/hr/shifts${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiRequest(url);
      return response;
    },
    enabled: hrQueryReadiness.enabled,
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

  // FASE 5: Mutations per azioni sui turni
  const reassignShiftMutation = useMutation({
    mutationFn: async ({ eventId, newEmployeeId }: { eventId: string; newEmployeeId: string }) => {
      return apiRequest(`/api/hr/calendar/events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          metadata: { employeeId: newEmployeeId }
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/calendar/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shift-assignments'] });
      toast({ title: 'Turno riassegnato con successo!' });
      setShowActionModal(false);
      setActionTarget(null);
    },
    onError: () => {
      toast({ title: 'Errore nella riassegnazione', variant: 'destructive' });
    },
  });

  const removeShiftMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return apiRequest(`/api/hr/calendar/events/${eventId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/calendar/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shift-assignments'] });
      toast({ title: 'Turno rimosso con successo!' });
      setShowActionModal(false);
      setActionTarget(null);
    },
    onError: () => {
      toast({ title: 'Errore nella rimozione', variant: 'destructive' });
    },
  });

  const changeTimeShiftMutation = useMutation({
    mutationFn: async ({ eventId, startTime, endTime }: { eventId: string; startTime: string; endTime: string }) => {
      return apiRequest(`/api/hr/calendar/events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          startDate: startTime,
          endDate: endTime,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/calendar/events'] });
      toast({ title: 'Orario modificato con successo!' });
      setShowActionModal(false);
      setActionTarget(null);
    },
    onError: () => {
      toast({ title: 'Errore nella modifica orario', variant: 'destructive' });
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

  // FASE 5: Handler per eseguire azione
  const handleExecuteAction = useCallback(() => {
    if (!actionTarget || !actionType) return;

    switch (actionType) {
      case 'reassign':
        if (newAssigneeId) {
          reassignShiftMutation.mutate({ eventId: actionTarget.id, newEmployeeId: newAssigneeId });
        }
        break;
      case 'remove':
        removeShiftMutation.mutate(actionTarget.id);
        break;
      case 'change_time':
        if (newStartTime && newEndTime) {
          changeTimeShiftMutation.mutate({ 
            eventId: actionTarget.id, 
            startTime: newStartTime, 
            endTime: newEndTime 
          });
        }
        break;
    }
  }, [actionTarget, actionType, newAssigneeId, newStartTime, newEndTime, reassignShiftMutation, removeShiftMutation, changeTimeShiftMutation]);

  // ✅ FASE 4/5: Calcola risorse in turno per il giorno selezionato DALLO STORE ZUSTAND
  const dayDetailResources = useMemo(() => {
    if (!selectedDayDate) return [];
    
    const dayStr = selectedDayDate.toISOString().split('T')[0];
    const now = new Date();
    
    // Filtra assignment per il giorno corrente dallo store Zustand
    let dayAssignments = resourceAssignments.filter((ra: ResourceAssignment) => ra.day === dayStr);
    
    // FASE 4: Filtra per stores multi-select
    if (selectedStoreFilters.length > 0) {
      dayAssignments = dayAssignments.filter((ra: ResourceAssignment) => 
        ra.storeId && selectedStoreFilters.includes(ra.storeId)
      );
    } else if (dayDetailStoreFilter !== 'all') {
      dayAssignments = dayAssignments.filter((ra: ResourceAssignment) => 
        ra.storeId === dayDetailStoreFilter
      );
    }
    
    // FASE 4: Filtra per risorse multi-select
    if (selectedResourceFilters.length > 0) {
      dayAssignments = dayAssignments.filter((ra: ResourceAssignment) => 
        selectedResourceFilters.includes(ra.resourceId)
      );
    }
    
    // Mappa a struttura risorsa con status
    return dayAssignments.map((ra: ResourceAssignment) => {
      // Parse time to check status
      const [startH, startM] = (ra.startTime || '00:00').split(':').map(Number);
      const [endH, endM] = (ra.endTime || '23:59').split(':').map(Number);
      
      const startDate = new Date(ra.day);
      startDate.setHours(startH, startM, 0, 0);
      const endDate = new Date(ra.day);
      endDate.setHours(endH, endM, 0, 0);
      
      let status: 'past' | 'present' | 'future' = 'future';
      if (endDate < now) {
        status = 'past';
      } else if (startDate <= now && endDate >= now) {
        status = 'present';
      }
      
      // Trova template per il nome
      const template = templateSelections.find(ts => ts.templateId === ra.templateId)?.template;
      
      return {
        id: `${ra.resourceId}-${ra.templateId}-${ra.slotId}-${ra.day}`,
        employeeId: ra.resourceId,
        title: template?.name || 'Turno',
        employeeName: ra.resourceName,
        storeName: ra.storeName || 'N/A',
        storeId: ra.storeId,
        startTime: ra.startTime || '00:00',
        endTime: ra.endTime || '23:59',
        status,
        type: 'shift',
        templateId: ra.templateId,
        slotId: ra.slotId,
      };
    });
  }, [selectedDayDate, resourceAssignments, dayDetailStoreFilter, selectedStoreFilters, selectedResourceFilters, templateSelections]);

  // FASE 4: Calcola statistiche copertura per ogni giorno DALLO STORE ZUSTAND
  const getDayCoverageInfo = useCallback((date: Date) => {
    const dayStr = date.toISOString().split('T')[0];
    
    // Filtra assignment per il giorno corrente dallo store Zustand
    const dayAssignments = resourceAssignments.filter((ra: ResourceAssignment) => ra.day === dayStr);
    
    // Trova le risorse uniche assegnate in questo giorno
    const resourceIds = new Set(dayAssignments.map((ra: ResourceAssignment) => ra.resourceId));
    const storeIds = new Set(dayAssignments.map((ra: ResourceAssignment) => ra.storeId).filter(Boolean));
    
    // Genera colori unici per ogni risorsa
    const colors = ['#22c55e', '#3b82f6', '#f97316', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'];
    const resourceColors = dayAssignments.map((_, i) => colors[i % colors.length]);
    
    return {
      totalShifts: dayAssignments.length,
      resourceCount: resourceIds.size,
      storeCount: storeIds.size,
      resourceColors,
      assignments: dayAssignments,
    };
  }, [resourceAssignments]);
  
  // FASE 4: Lista risorse uniche nel giorno per filtro DALLO STORE ZUSTAND
  const dayResourcesForFilter = useMemo(() => {
    if (!selectedDayDate) return [];
    
    const dayStr = selectedDayDate.toISOString().split('T')[0];
    const dayAssignments = resourceAssignments.filter((ra: ResourceAssignment) => ra.day === dayStr);
    
    const uniqueResources = new Map();
    dayAssignments.forEach((ra: ResourceAssignment) => {
      if (!uniqueResources.has(ra.resourceId)) {
        uniqueResources.set(ra.resourceId, {
          id: ra.resourceId,
          name: ra.resourceName,
        });
      }
    });
    
    return Array.from(uniqueResources.values());
  }, [selectedDayDate, resourceAssignments]);

  // FASE 4: Lista stores unici nel giorno per filtro DALLO STORE ZUSTAND
  const dayStoresForFilter = useMemo(() => {
    if (!selectedDayDate) return [];
    
    const dayStr = selectedDayDate.toISOString().split('T')[0];
    const dayAssignments = resourceAssignments.filter((ra: ResourceAssignment) => ra.day === dayStr);
    
    const uniqueStores = new Map();
    dayAssignments.forEach((ra: ResourceAssignment) => {
      if (ra.storeId && !uniqueStores.has(ra.storeId)) {
        uniqueStores.set(ra.storeId, {
          id: ra.storeId,
          name: ra.storeName || 'N/A',
        });
      }
    });
    
    return Array.from(uniqueStores.values());
  }, [selectedDayDate, resourceAssignments]);

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
          <div className="calendar-container bg-white dark:bg-slate-900 rounded-lg p-4 shadow-sm">
            {(calendarLoading || assignmentsLoading) ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-slate-400 animate-spin" />
                  <p className="text-slate-600 dark:text-slate-400">
                    Caricamento {assignmentsLoading ? 'turni assegnati' : 'calendario'}...
                  </p>
                </div>
              </div>
            ) : (
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
                events={calendarEvents}
                editable={true}
                droppable={true}
                selectable={true}
                selectMirror={true}
                nowIndicator={true}
                eventResizableFromStart={true}
                eventDurationEditable={true}
                eventStartEditable={true}
                businessHours={{
                  daysOfWeek: [1, 2, 3, 4, 5, 6], // Lunedì-Sabato
                  startTime: '06:00',
                  endTime: '22:00',
                }}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
                eventDrop={handleEventDrop}
                eventResize={handleEventDrop}
                dayCellContent={(arg) => {
                  const coverageInfo = getDayCoverageInfo(arg.date);
                  return (
                    <div className="relative w-full h-full">
                      <div className="text-right p-1">
                        {arg.dayNumberText}
                      </div>
                      {/* FASE 4: Pallini colorati per risorse pianificate */}
                      {coverageInfo.resourceCount > 0 && (
                        <div className="absolute bottom-1 left-1 flex items-center gap-0.5">
                          {coverageInfo.resourceColors.slice(0, 4).map((color, i) => (
                            <div 
                              key={i}
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: color }}
                              title={`Risorsa ${i + 1}`}
                            />
                          ))}
                          {coverageInfo.resourceCount > 4 && (
                            <span className="text-[9px] text-gray-500 ml-0.5">
                              +{coverageInfo.resourceCount - 4}
                            </span>
                          )}
                          {coverageInfo.storeCount > 0 && (
                            <div className="flex items-center ml-1">
                              <StoreIcon className="w-2.5 h-2.5 text-gray-400" />
                              <span className="text-[9px] text-gray-500">{coverageInfo.storeCount}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }}
                eventContent={(arg) => {
                  const event = arg.event;
                  return (
                    <div className="p-1 text-xs">
                      <div className="font-medium truncate">{event.title}</div>
                      {event.extendedProps.type === 'shift' && (
                        <div className="text-xs opacity-75">
                          {event.start?.toLocaleTimeString('it-IT', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })} - {event.end?.toLocaleTimeString('it-IT', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      )}
                    </div>
                  );
                }}
              />
            )}
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
                      <SelectContent>
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
                      <SelectContent>
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

      {/* ✅ Task 13 + FASE 4/5: Modal Dettaglio Giorno - Risorse in Turno */}
      <Dialog open={showDayDetailModal} onOpenChange={(open) => {
        setShowDayDetailModal(open);
        if (!open) {
          setSelectedStoreFilters([]);
          setSelectedResourceFilters([]);
        }
      }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-orange-500" />
              <span>
                Risorse in Turno - {selectedDayDate?.toLocaleDateString('it-IT', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </DialogTitle>
            <DialogDescription>
              Visualizza e gestisci i turni per questa giornata
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 mt-4">
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
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="font-semibold">{resource.employeeName}</h4>
                              <Badge variant={
                                resource.status === 'past' ? 'secondary' :
                                resource.status === 'present' ? 'default' :
                                'outline'
                              } data-testid={`badge-status-${resource.status}`}>
                                {resource.status === 'past' ? 'Passato' :
                                 resource.status === 'present' ? 'In Corso' :
                                 'Futuro'}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4" />
                                <span>{resource.startTime} - {resource.endTime}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <StoreIcon className="w-4 h-4" />
                                <span>{resource.storeName}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* FASE 5: Azioni sul turno */}
                          <div className="flex items-center gap-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  data-testid={`btn-actions-${resource.id}`}
                                >
                                  <Edit className="w-4 h-4 text-gray-500" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent side="left" className="w-48 p-2">
                                <div className="space-y-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="w-full justify-start h-8 text-xs"
                                    onClick={() => handleOpenActionModal(resource, 'reassign')}
                                    data-testid={`btn-reassign-${resource.id}`}
                                  >
                                    <ArrowLeftRight className="w-3.5 h-3.5 mr-2 text-blue-500" />
                                    Riassegna
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="w-full justify-start h-8 text-xs"
                                    onClick={() => handleOpenActionModal(resource, 'change_time')}
                                    data-testid={`btn-change-time-${resource.id}`}
                                  >
                                    <Clock className="w-3.5 h-3.5 mr-2 text-orange-500" />
                                    Cambia Orario
                                  </Button>
                                  <Separator className="my-1" />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="w-full justify-start h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleOpenActionModal(resource, 'remove')}
                                    data-testid={`btn-remove-${resource.id}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                                    Rimuovi Turno
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

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
                  Turno di <strong>{actionTarget.employeeName}</strong> ({actionTarget.startTime} - {actionTarget.endTime})
                  {actionTarget.storeName && <> presso <strong>{actionTarget.storeName}</strong></>}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Riassegna */}
            {actionType === 'reassign' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Nuova Risorsa</label>
                <Select value={newAssigneeId} onValueChange={setNewAssigneeId}>
                  <SelectTrigger data-testid="select-new-assignee">
                    <SelectValue placeholder="Seleziona risorsa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(employees as any[])
                      .filter((e: any) => e.id !== actionTarget?.employeeId)
                      .map((emp: any) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
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