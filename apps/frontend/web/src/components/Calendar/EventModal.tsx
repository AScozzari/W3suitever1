import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { calendarService, CalendarEvent } from '@/services/calendarService';
import { useCalendarPermissions } from '@/hooks/useCalendarPermissions';

// Define EventVisibility type
type EventVisibility = 'private' | 'team' | 'store' | 'area' | 'tenant';

// Define as enum-like object for comparisons
const EventVisibilityValues = {
  PRIVATE: 'private' as EventVisibility,
  TEAM: 'team' as EventVisibility,
  STORE: 'store' as EventVisibility,
  AREA: 'area' as EventVisibility,
  TENANT: 'tenant' as EventVisibility,
};
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  X, Calendar, Clock, MapPin, Users, Eye, 
  AlertCircle, Save, Trash, Plus, Minus,
  ChevronDown, FileText, Repeat
} from 'lucide-react';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { it } from 'date-fns/locale';

// Colors
const COLORS = {
  primary: {
    orange: '#FF6900',
    orangeLight: '#ff8533',
    purple: '#7B2CBF',
    purpleLight: '#9747ff',
  },
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  neutral: {
    dark: '#1f2937',
    medium: '#6b7280',
    light: '#9ca3af',
    lighter: '#e5e7eb',
    lightest: '#f9fafb',
  },
  glass: {
    white: 'rgba(255, 255, 255, 0.95)',
    whiteLight: 'rgba(255, 255, 255, 0.08)',
    whiteMedium: 'rgba(255, 255, 255, 0.25)',
  }
};

// Event types
const EVENT_TYPES = [
  { value: 'meeting', label: 'Riunione', icon: Users },
  { value: 'shift', label: 'Turno', icon: Clock },
  { value: 'time_off', label: 'Ferie/Permesso', icon: Calendar },
  { value: 'training', label: 'Formazione', icon: FileText },
  { value: 'deadline', label: 'Scadenza', icon: AlertCircle },
  { value: 'other', label: 'Altro', icon: Calendar }
];

// Validation schema
const eventSchema = z.object({
  title: z.string().min(1, 'Il titolo è obbligatorio').max(255),
  description: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string(),
  startTime: z.string(),
  endDate: z.string(),
  endTime: z.string(),
  allDay: z.boolean(),
  type: z.enum(['meeting', 'shift', 'time_off', 'overtime', 'training', 'deadline', 'other']),
  visibility: z.enum(['private', 'team', 'store', 'area', 'tenant']),
  status: z.enum(['tentative', 'confirmed', 'cancelled']),
  hrSensitive: z.boolean(),
  color: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  recurring: z.object({
    enabled: z.boolean(),
    pattern: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
    interval: z.number().min(1).optional(),
    daysOfWeek: z.array(z.number()).optional(),
    endDate: z.string().optional(),
  }).optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

interface EventModalProps {
  event?: CalendarEvent | null;
  selectedDate?: Date | null;
  onClose: () => void;
  onSave: () => void;
}

export default function EventModal({ event, selectedDate, onClose, onSave }: EventModalProps) {
  const [showRecurring, setShowRecurring] = useState(false);
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  
  const { permissions, helpers, user } = useCalendarPermissions();
  
  // Fetch users for attendees picker
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
    enabled: true,
  });
  
  // Form setup
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: event?.title || '',
      description: event?.description || '',
      location: event?.location || '',
      startDate: event ? format(new Date(event.startDate), 'yyyy-MM-dd') : 
                (selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')),
      startTime: event ? format(new Date(event.startDate), 'HH:mm') : '09:00',
      endDate: event ? format(new Date(event.endDate), 'yyyy-MM-dd') : 
               (selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')),
      endTime: event ? format(new Date(event.endDate), 'HH:mm') : '10:00',
      allDay: event?.allDay || false,
      type: event?.type || 'meeting',
      visibility: event?.visibility || 'private',
      status: event?.status || 'confirmed',
      hrSensitive: event?.hrSensitive || false,
      color: event?.color || '',
      attendees: event?.attendees?.map(a => a.userId) || [],
      recurring: {
        enabled: !!event?.recurring,
        pattern: event?.recurring?.pattern,
        interval: event?.recurring?.interval,
        daysOfWeek: event?.recurring?.daysOfWeek,
        endDate: event?.recurring?.endDate,
      }
    }
  });
  
  const watchAllDay = watch('allDay');
  const watchType = watch('type');
  const watchVisibility = watch('visibility');
  
  // Create/Update mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<CalendarEvent>) => calendarService.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/calendar/events'] });
      onSave();
    }
  });
  
  const updateMutation = useMutation({
    mutationFn: (data: Partial<CalendarEvent>) => calendarService.updateEvent(event!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/calendar/events'] });
      onSave();
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: () => calendarService.deleteEvent(event!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/calendar/events'] });
      onSave();
    }
  });
  
  // Form submit handler
  const onSubmit = async (data: EventFormData) => {
    try {
      // Combine date and time
      const startDateTime = new Date(`${data.startDate}T${data.allDay ? '00:00' : data.startTime}`);
      const endDateTime = new Date(`${data.endDate}T${data.allDay ? '23:59' : data.endTime}`);
      
      // Validate dates
      if (endDateTime < startDateTime) {
        alert('La data di fine deve essere successiva alla data di inizio');
        return;
      }
      
      const eventData: Partial<CalendarEvent> = {
        title: data.title,
        description: data.description,
        location: data.location,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        allDay: data.allDay,
        type: data.type,
        visibility: data.visibility,
        status: data.status,
        hrSensitive: data.hrSensitive,
        color: data.color,
        ownerId: user?.id,
        attendees: selectedAttendees.map(userId => ({
          userId,
          status: 'pending',
          responseTime: undefined
        })),
        recurring: showRecurring && data.recurring?.enabled ? {
          pattern: data.recurring.pattern!,
          interval: data.recurring.interval || 1,
          daysOfWeek: data.recurring.daysOfWeek,
          endDate: data.recurring.endDate,
          exceptions: []
        } : undefined,
      };
      
      if (event) {
        await updateMutation.mutateAsync(eventData);
      } else {
        await createMutation.mutateAsync(eventData);
      }
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };
  
  // Get visibility options based on permissions
  const visibilityOptions = helpers?.getVisibilityOptions() || ['private' as EventVisibility];
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        background: COLORS.glass.white,
        backdropFilter: 'blur(24px) saturate(140%)',
        WebkitBackdropFilter: 'blur(24px) saturate(140%)',
        border: `1px solid ${COLORS.glass.whiteMedium}`,
        borderRadius: '16px',
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${COLORS.neutral.lighter}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: COLORS.neutral.dark,
          }}>
            {event ? 'Modifica Evento' : 'Nuovo Evento'}
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            data-testid="button-close-modal"
          >
            <X size={20} color={COLORS.neutral.medium} />
          </button>
        </div>
        
        {/* Content */}
        <form onSubmit={handleSubmit(onSubmit)} style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px',
        }}>
          {/* Event Type */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: COLORS.neutral.dark,
              marginBottom: '8px',
            }}>
              Tipo di Evento
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
            }}>
              {EVENT_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setValue('type', type.value as any)}
                  style={{
                    padding: '8px',
                    background: watchType === type.value ? COLORS.primary.orange : COLORS.glass.whiteLight,
                    color: watchType === type.value ? 'white' : COLORS.neutral.medium,
                    border: `1px solid ${watchType === type.value ? COLORS.primary.orange : COLORS.neutral.lighter}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                  }}
                  data-testid={`event-type-${type.value}`}
                >
                  <type.icon size={14} />
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Title */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: COLORS.neutral.dark,
              marginBottom: '6px',
            }}>
              Titolo *
            </label>
            <input
              {...register('title')}
              placeholder="Inserisci il titolo dell'evento"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'white',
                border: `1px solid ${errors.title ? COLORS.semantic.error : COLORS.neutral.lighter}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s ease',
              }}
              data-testid="input-title"
            />
            {errors.title && (
              <span style={{
                fontSize: '12px',
                color: COLORS.semantic.error,
                marginTop: '4px',
                display: 'block',
              }}>
                {errors.title.message}
              </span>
            )}
          </div>
          
          {/* Description */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: COLORS.neutral.dark,
              marginBottom: '6px',
            }}>
              Descrizione
            </label>
            <textarea
              {...register('description')}
              placeholder="Aggiungi una descrizione..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'white',
                border: `1px solid ${COLORS.neutral.lighter}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                resize: 'vertical',
                transition: 'all 0.2s ease',
              }}
              data-testid="textarea-description"
            />
          </div>
          
          {/* Date & Time */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}>
              <label style={{
                fontSize: '13px',
                fontWeight: '500',
                color: COLORS.neutral.dark,
              }}>
                Data e Ora
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                color: COLORS.neutral.medium,
              }}>
                <input
                  type="checkbox"
                  {...register('allDay')}
                  style={{ cursor: 'pointer' }}
                  data-testid="checkbox-allday"
                />
                Tutto il giorno
              </label>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: watchAllDay ? '1fr 1fr' : '1fr 1fr 1fr 1fr',
              gap: '8px',
            }}>
              <input
                type="date"
                {...register('startDate')}
                style={{
                  padding: '10px 12px',
                  background: 'white',
                  border: `1px solid ${COLORS.neutral.lighter}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                }}
                data-testid="input-start-date"
              />
              {!watchAllDay && (
                <input
                  type="time"
                  {...register('startTime')}
                  style={{
                    padding: '10px 12px',
                    background: 'white',
                    border: `1px solid ${COLORS.neutral.lighter}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                  data-testid="input-start-time"
                />
              )}
              <input
                type="date"
                {...register('endDate')}
                style={{
                  padding: '10px 12px',
                  background: 'white',
                  border: `1px solid ${COLORS.neutral.lighter}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                }}
                data-testid="input-end-date"
              />
              {!watchAllDay && (
                <input
                  type="time"
                  {...register('endTime')}
                  style={{
                    padding: '10px 12px',
                    background: 'white',
                    border: `1px solid ${COLORS.neutral.lighter}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                  data-testid="input-end-time"
                />
              )}
            </div>
          </div>
          
          {/* Location */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: COLORS.neutral.dark,
              marginBottom: '6px',
            }}>
              <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Luogo
            </label>
            <input
              {...register('location')}
              placeholder="Aggiungi un luogo..."
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'white',
                border: `1px solid ${COLORS.neutral.lighter}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
              }}
              data-testid="input-location"
            />
          </div>
          
          {/* Visibility */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '500',
              color: COLORS.neutral.dark,
              marginBottom: '6px',
            }}>
              <Eye size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Visibilità
            </label>
            <select
              {...register('visibility')}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'white',
                border: `1px solid ${COLORS.neutral.lighter}`,
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer',
              }}
              data-testid="select-visibility"
            >
              {visibilityOptions.includes(EventVisibilityValues.PRIVATE) && (
                <option value="private">Privato - Solo io</option>
              )}
              {visibilityOptions.includes(EventVisibilityValues.TEAM) && (
                <option value="team">Team - Il mio team</option>
              )}
              {visibilityOptions.includes(EventVisibilityValues.STORE) && (
                <option value="store">Store - Tutto il negozio</option>
              )}
              {visibilityOptions.includes(EventVisibilityValues.AREA) && (
                <option value="area">Area - Tutta l'area</option>
              )}
              {visibilityOptions.includes(EventVisibilityValues.TENANT) && (
                <option value="tenant">Azienda - Tutta l'azienda</option>
              )}
            </select>
          </div>
          
          {/* Attendees (if not private) */}
          {watchVisibility !== 'private' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '500',
                color: COLORS.neutral.dark,
                marginBottom: '6px',
              }}>
                <Users size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Partecipanti
              </label>
              <div style={{
                padding: '8px',
                background: 'white',
                border: `1px solid ${COLORS.neutral.lighter}`,
                borderRadius: '8px',
                maxHeight: '120px',
                overflowY: 'auto',
              }}>
                {users.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    color: COLORS.neutral.medium,
                    padding: '16px',
                    fontSize: '13px',
                  }}>
                    Nessun utente disponibile
                  </div>
                ) : (
                  users.map((u: any) => (
                    <label
                      key={u.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '4px',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = COLORS.neutral.lightest;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAttendees.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAttendees([...selectedAttendees, u.id]);
                          } else {
                            setSelectedAttendees(selectedAttendees.filter(id => id !== u.id));
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{
                        fontSize: '13px',
                        color: COLORS.neutral.dark,
                      }}>
                        {u.firstName} {u.lastName} ({u.email})
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
          
          {/* HR Sensitive flag (if has permission) */}
          {permissions.canViewHrSensitive && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                color: COLORS.neutral.medium,
              }}>
                <input
                  type="checkbox"
                  {...register('hrSensitive')}
                  style={{ cursor: 'pointer' }}
                  data-testid="checkbox-hr-sensitive"
                />
                <AlertCircle size={14} color={COLORS.semantic.warning} />
                Evento HR Sensibile (visibile solo a HR e management)
              </label>
            </div>
          )}
        </form>
        
        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${COLORS.neutral.lighter}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div>
            {event && helpers?.canDeleteEvent(event) && (
              <button
                onClick={() => {
                  if (confirm('Sei sicuro di voler eliminare questo evento?')) {
                    deleteMutation.mutate();
                  }
                }}
                style={{
                  padding: '10px 16px',
                  background: COLORS.semantic.error,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                }}
                disabled={deleteMutation.isPending}
                data-testid="button-delete-event"
              >
                <Trash size={14} />
                Elimina
              </button>
            )}
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: COLORS.glass.whiteLight,
                color: COLORS.neutral.dark,
                border: `1px solid ${COLORS.neutral.lighter}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
              }}
              data-testid="button-cancel"
            >
              Annulla
            </button>
            
            <button
              onClick={handleSubmit(onSubmit)}
              style={{
                padding: '10px 20px',
                background: COLORS.primary.orange,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(255, 105, 0, 0.3)',
                opacity: isSubmitting ? 0.7 : 1,
              }}
              disabled={isSubmitting}
              data-testid="button-save"
            >
              <Save size={14} />
              {isSubmitting ? 'Salvataggio...' : (event ? 'Salva Modifiche' : 'Crea Evento')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}