import { useState, useRef, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useHRQueryReadiness } from '@/hooks/useAuthReadiness';
import { Calendar, Clock, Users, Filter, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';

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
}

export default function HRCalendar({ className }: HRCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventModalMode, setEventModalMode] = useState<'create' | 'edit'>('create');

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const hrQueryReadiness = useHRQueryReadiness();

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

  // ✅ FASE 1.2: Unifica queries per usare calendar endpoint come altri calendari
  const { data: backendEvents = [], isLoading: calendarLoading, error: calendarError } = useQuery({
    queryKey: ['/api/hr/calendar/events'],
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
    
    const mapped = eventsArray.map((event: any) => ({
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
    
    return mapped;
  }, [backendEvents]);


  // ✅ FASE 1.2: Colori per tutti i tipi di evento del calendario unificato
  function getEventColor(eventType: string) {
    switch (eventType) {
      case 'meeting': return 'hsl(var(--primary))'; // Brand primary
      case 'shift': return 'hsl(var(--success))'; // Verde per turni  
      case 'time_off': return 'hsl(var(--warning))'; // Arancione per ferie
      case 'overtime': return 'hsl(var(--destructive))'; // Rosso per straordinari
      case 'training': return 'hsl(212, 100%, 50%)'; // Blu per formazione
      case 'deadline': return 'hsl(0, 84%, 60%)'; // Rosso urgente per scadenze
      case 'other': return 'hsl(var(--muted))'; // Grigio per altro
      default: return 'hsl(var(--muted))';
    }
  }

  // Gestione click su data (con arrotondamento orari)
  const handleDateClick = useCallback((arg: any) => {
    const startDate = new Date(arg.date);
    
    // Arrotonda all'ora più vicina
    const minutes = startDate.getMinutes();
    if (minutes < 30) {
      startDate.setMinutes(0, 0, 0);
    } else {
      startDate.setMinutes(0, 0, 0);
      startDate.setHours(startDate.getHours() + 1);
    }
    
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 8); // Turno di default 8 ore

    form.setValue('start', startDate.toISOString().slice(0, 16));
    form.setValue('end', endDate.toISOString().slice(0, 16));
    setEventModalMode('create');
    setSelectedEvent(null);
    setShowEventModal(true);
  }, [form]);

  // ✅ FASE 1.2 FIX: Gestione click su evento - legge dalla struttura unificata
  const handleEventClick = useCallback((arg: any) => {
    const event = arg.event;
    if (event.extendedProps.type === 'shift') {
      form.setValue('title', event.title);
      form.setValue('start', event.start.toISOString().slice(0, 16));
      form.setValue('end', event.end.toISOString().slice(0, 16));
      form.setValue('employeeId', event.extendedProps.metadata?.employeeId || '');
      form.setValue('shiftType', event.extendedProps.metadata?.shiftType || 'full_time');
      form.setValue('notes', event.extendedProps.description || '');
      
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
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  form.reset();
                  setEventModalMode('create');
                  setSelectedEvent(null);
                  setShowEventModal(true);
                }}
                data-testid="button-create-shift"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuovo Turno
              </Button>
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
            {calendarLoading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-slate-400 animate-spin" />
                  <p className="text-slate-600 dark:text-slate-400">Caricamento calendario...</p>
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
    </div>
  );
}