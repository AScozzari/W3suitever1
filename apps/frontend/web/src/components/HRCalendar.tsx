import { useState, useRef, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
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
  shiftType: z.enum(['mattina', 'pomeriggio', 'notte', 'spezzato']),
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
      shiftType: 'mattina',
      notes: '',
    },
  });

  // Query per dipendenti
  const { data: employees = [], error: employeesError } = useQuery({
    queryKey: ['/api/users'],
    enabled: hrQueryReadiness.enabled,
  });

  // Query per eventi turni
  const { data: shifts = [], isLoading: shiftsLoading, error: shiftsError } = useQuery({
    queryKey: ['/api/hr/shifts'],
    enabled: hrQueryReadiness.enabled,
  });

  // Query per richieste ferie
  const { data: requests = [], error: requestsError } = useQuery({
    queryKey: ['/api/hr/requests'],
    enabled: hrQueryReadiness.enabled,
  });

  // Mutation per creare/modificare turni
  const createShiftMutation = useMutation({
    mutationFn: (data: ShiftEventForm) => apiRequest('/api/hr/shifts', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        startTime: data.start,
        endTime: data.end,
        assignedTo: data.employeeId,
        status: 'active',
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts'] });
      toast({ title: 'Turno creato con successo!' });
      setShowEventModal(false);
      form.reset();
    },
    onError: () => {
      toast({ title: 'Errore nella creazione del turno', variant: 'destructive' });
    },
  });

  // Trasforma i dati in formato FullCalendar (memoizzato per performance)
  const calendarEvents = useMemo(() => [
    // Eventi turni
    ...(shifts as any[]).map((shift: any) => ({
      id: `shift-${shift.id}`,
      title: `${shift.title} - ${shift.shiftType}`,
      start: shift.startTime,
      end: shift.endTime,
      resourceId: shift.assignedTo, // CRITICO: Necessario per viste resource
      backgroundColor: getShiftColor(shift.shiftType),
      borderColor: getShiftColor(shift.shiftType),
      extendedProps: {
        type: 'shift',
        employeeId: shift.assignedTo,
        shiftType: shift.shiftType,
        notes: shift.notes,
      },
    })),
    // Eventi richieste ferie
    ...(requests as any[])
      .filter((req: any) => req.type === 'ferie' && req.status === 'approved')
      .map((request: any) => ({
        id: `leave-${request.id}`,
        title: `Ferie - ${request.employeeName || 'Dipendente'}`,
        start: request.startDate,
        end: request.endDate,
        resourceId: request.employeeId, // CRITICO: Necessario per viste resource
        backgroundColor: 'hsl(var(--warning))',
        borderColor: 'hsl(var(--warning))',
        display: 'background',
        extendedProps: {
          type: 'leave',
          employeeId: request.employeeId,
          reason: request.reason,
        },
      })),
  ], [shifts, requests]);

  // Risorse per le viste resource (memoizzato per performance)
  const calendarResources = useMemo(() => (employees as any[]).map((emp: any) => ({
    id: emp.id,
    title: `${emp.firstName} ${emp.lastName}`,
    department: emp.department || 'N/A',
  })), [employees]);

  // Colori per i tipi di turno (usa CSS variables del design system)
  function getShiftColor(shiftType: string) {
    switch (shiftType) {
      case 'mattina': return 'hsl(var(--success))'; // Verde
      case 'pomeriggio': return 'hsl(var(--warning))'; // Arancione  
      case 'notte': return 'hsl(var(--primary))'; // Brand primary
      case 'spezzato': return 'hsl(var(--destructive))'; // Rosso
      default: return 'hsl(var(--muted))'; // Grigio
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

  // Gestione click su evento
  const handleEventClick = useCallback((arg: any) => {
    const event = arg.event;
    if (event.extendedProps.type === 'shift') {
      form.setValue('title', event.title.split(' - ')[0]);
      form.setValue('start', event.start.toISOString().slice(0, 16));
      form.setValue('end', event.end.toISOString().slice(0, 16));
      form.setValue('employeeId', event.extendedProps.employeeId);
      form.setValue('shiftType', event.extendedProps.shiftType);
      form.setValue('notes', event.extendedProps.notes || '');
      
      setSelectedEvent(event);
      setEventModalMode('edit');
      setShowEventModal(true);
    }
  }, [form]);

  // Drag & Drop eventi (gestisce tempo E risorse)
  const handleEventDrop = useCallback((arg: any) => {
    const event = arg.event;
    if (event.extendedProps.type === 'shift') {
      const shiftId = event.id.replace('shift-', '');
      const newResource = event.getResources()[0]?.id;
      const oldEmployeeId = event.extendedProps.employeeId;
      
      // Costruisci payload di aggiornamento
      const updatePayload: any = {
        startTime: event.start.toISOString(),
        endTime: event.end.toISOString(),
      };
      
      // Se la risorsa è cambiata, aggiorna anche l'assegnazione
      if (newResource && newResource !== oldEmployeeId) {
        updatePayload.assignedTo = newResource;
        event.setExtendedProp('employeeId', newResource);
      }
      
      // Aggiorna il turno nel backend
      apiRequest(`/api/hr/shifts/${shiftId}`, {
        method: 'PATCH',
        body: JSON.stringify(updatePayload),
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts'] });
        const changeType = newResource !== oldEmployeeId ? 'assegnato e spostato' : 'spostato';
        toast({ title: `Turno ${changeType} con successo!` });
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

  // Submit form
  const onSubmit = (data: ShiftEventForm) => {
    createShiftMutation.mutate(data);
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
                <Button
                  variant={currentView === 'resourceTimeGridWeek' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => changeView('resourceTimeGridWeek')}
                  className="rounded-none"
                  data-testid="view-resources"
                >
                  Risorse
                </Button>
              </div>
            </div>

            {/* Legenda */}
            <div className="flex items-center space-x-3">
              <Badge className="bg-green-500 text-white hover:bg-green-600">Mattina</Badge>
              <Badge className="bg-orange-500 text-white hover:bg-orange-600">Pomeriggio</Badge>
              <Badge className="bg-blue-500 text-white hover:bg-blue-600">Notte</Badge>
              <Badge className="bg-red-500 text-white hover:bg-red-600">Spezzato</Badge>
            </div>
          </div>

          {/* Calendario FullCalendar */}
          <div className="calendar-container bg-white dark:bg-slate-900 rounded-lg p-4 shadow-sm">
            {shiftsLoading ? (
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
                  resourceTimeGridPlugin,
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
                resources={calendarResources}
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
                views={{
                  resourceTimeGridWeek: {
                    type: 'resourceTimeGrid',
                    duration: { weeks: 1 },
                    buttonText: 'Risorse Settimana',
                  },
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
                        <SelectItem value="mattina">Mattina (06:00-14:00)</SelectItem>
                        <SelectItem value="pomeriggio">Pomeriggio (14:00-22:00)</SelectItem>
                        <SelectItem value="notte">Notte (22:00-06:00)</SelectItem>
                        <SelectItem value="spezzato">Spezzato</SelectItem>
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
                  disabled={createShiftMutation.isPending}
                  className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                  data-testid="button-save-shift"
                >
                  {createShiftMutation.isPending ? 'Salvando...' : 
                   eventModalMode === 'create' ? 'Crea Turno' : 'Salva Modifiche'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}