import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { calendarService, CalendarEvent, LeaveRequest, Shift } from '@/services/calendarService';
import { useCalendarPermissions, EventVisibility } from '@/hooks/useCalendarPermissions';
import EventModal from './EventModal';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Plus, Filter, Download, Grid3x3, List, Clock,
  Users, Building, MapPin, Eye, EyeOff, Edit, Trash,
  CheckCircle, XCircle, AlertCircle, CalendarDays,
  ChevronDown, MoreHorizontal
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
         eachDayOfInterval, isSameMonth, isSameDay, isToday,
         addMonths, subMonths, addWeeks, subWeeks, startOfDay, endOfDay } from 'date-fns';
import { it } from 'date-fns/locale';

// Palette colori WindTre
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
    white: 'rgba(255, 255, 255, 0.15)',
    whiteLight: 'rgba(255, 255, 255, 0.08)',
    whiteMedium: 'rgba(255, 255, 255, 0.25)',
  }
};

// Event type colors
const EVENT_TYPE_COLORS = {
  meeting: COLORS.semantic.info,
  shift: COLORS.primary.orange,
  time_off: COLORS.semantic.success,
  overtime: COLORS.semantic.warning,
  training: COLORS.primary.purple,
  deadline: COLORS.semantic.error,
  other: COLORS.neutral.medium,
};

// View types
type ViewType = 'month' | 'week' | 'day' | 'list';

interface CalendarProps {
  selectedStore?: any;
  filters?: {
    type?: string[];
    visibility?: string[];
    ownerId?: string;
  };
  onEventClick?: (event: CalendarEvent) => void;
  compactMode?: boolean;
}

export default function Calendar({ 
  selectedStore, 
  filters,
  onEventClick,
  compactMode = false 
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('month');
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; event: CalendarEvent } | null>(null);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    types: [] as string[],
    visibility: [] as string[],
    showHrSensitive: true,
  });
  
  // Permission hook
  const { permissions, helpers, pendingApprovals, user } = useCalendarPermissions();
  
  // Calculate date range for current view
  const dateRange = useMemo(() => {
    let start: Date, end: Date;
    
    switch (viewType) {
      case 'month':
        start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
        end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
        break;
      case 'week':
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
        break;
      case 'day':
        start = startOfDay(currentDate);
        end = endOfDay(currentDate);
        break;
      case 'list':
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
        break;
      default:
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
    }
    
    return { start, end };
  }, [currentDate, viewType]);
  
  // Fetch calendar events
  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['/api/hr/calendar/events', dateRange, activeFilters, selectedStore?.id],
    queryFn: () => calendarService.getEvents({
      startDate: dateRange.start,
      endDate: dateRange.end,
      type: activeFilters.types.length > 0 ? activeFilters.types : undefined,
      visibility: activeFilters.visibility.length > 0 ? activeFilters.visibility : undefined,
      storeId: selectedStore?.id,
    }),
    enabled: !!user,
  });
  
  // Fetch shifts if user has permission
  const { data: shifts = [] } = useQuery({
    queryKey: ['/api/hr/shifts', dateRange, selectedStore?.id],
    queryFn: () => calendarService.getShifts({
      startDate: dateRange.start,
      endDate: dateRange.end,
      storeId: selectedStore?.id,
    }),
    enabled: !!user && permissions.canManageShifts && !!selectedStore?.id,
  });
  
  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: (eventId: string) => calendarService.deleteEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/calendar/events'] });
      setContextMenu(null);
    },
  });
  
  // Generate calendar days
  const calendarDays = useMemo(() => {
    if (viewType !== 'month') return [];
    
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start, end });
  }, [currentDate, viewType]);
  
  // Filter events for a specific day
  const getEventsForDay = (date: Date) => {
    return events.filter((event: CalendarEvent) => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      return (eventStart >= dayStart && eventStart <= dayEnd) ||
             (eventEnd >= dayStart && eventEnd <= dayEnd) ||
             (eventStart <= dayStart && eventEnd >= dayEnd);
    });
  };
  
  // Navigation functions
  const navigatePrevious = () => {
    switch (viewType) {
      case 'month':
        setCurrentDate(subMonths(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case 'day':
        setCurrentDate(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000));
        break;
    }
  };
  
  const navigateNext = () => {
    switch (viewType) {
      case 'month':
        setCurrentDate(addMonths(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case 'day':
        setCurrentDate(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000));
        break;
    }
  };
  
  const navigateToday = () => {
    setCurrentDate(new Date());
  };
  
  // Handle event click
  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (onEventClick) {
      onEventClick(event);
    } else {
      setSelectedEvent(event);
      setShowEventModal(true);
    }
  };
  
  // Handle context menu
  const handleContextMenu = (event: CalendarEvent, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (helpers?.canEditEvent(event) || helpers?.canDeleteEvent(event)) {
      setContextMenu({ x: e.clientX, y: e.clientY, event });
    }
  };
  
  // Handle day click
  const handleDayClick = (date: Date) => {
    if (permissions.canCreateScopes.length > 0) {
      setSelectedDate(date);
      setSelectedEvent(null);
      setShowEventModal(true);
    }
  };
  
  // Close context menu
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);
  
  return (
    <div style={{
      width: '100%',
      height: compactMode ? '400px' : '100%',
      minHeight: compactMode ? '400px' : '600px',
      background: COLORS.glass.white,
      backdropFilter: 'blur(24px) saturate(140%)',
      WebkitBackdropFilter: 'blur(24px) saturate(140%)',
      border: `1px solid ${COLORS.glass.whiteMedium}`,
      borderRadius: '16px',
      padding: compactMode ? '16px' : '24px',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        {/* Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <button
            onClick={navigatePrevious}
            style={{
              padding: '8px',
              background: COLORS.glass.whiteLight,
              border: `1px solid ${COLORS.glass.whiteMedium}`,
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            data-testid="button-calendar-prev"
          >
            <ChevronLeft size={18} />
          </button>
          
          <button
            onClick={navigateToday}
            style={{
              padding: '8px 16px',
              background: COLORS.glass.whiteLight,
              border: `1px solid ${COLORS.glass.whiteMedium}`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
            }}
            data-testid="button-calendar-today"
          >
            Oggi
          </button>
          
          <button
            onClick={navigateNext}
            style={{
              padding: '8px',
              background: COLORS.glass.whiteLight,
              border: `1px solid ${COLORS.glass.whiteMedium}`,
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            data-testid="button-calendar-next"
          >
            <ChevronRight size={18} />
          </button>
          
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: COLORS.neutral.dark,
            marginLeft: '12px',
          }}>
            {format(currentDate, viewType === 'day' ? 'd MMMM yyyy' : 'MMMM yyyy', { locale: it })}
          </h2>
        </div>
        
        {/* Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          {/* View type selector */}
          <div style={{
            display: 'flex',
            background: COLORS.glass.whiteLight,
            border: `1px solid ${COLORS.glass.whiteMedium}`,
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
            <button
              onClick={() => setViewType('month')}
              style={{
                padding: '8px 12px',
                background: viewType === 'month' ? COLORS.primary.orange : 'transparent',
                color: viewType === 'month' ? 'white' : COLORS.neutral.medium,
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
              }}
              data-testid="button-view-month"
            >
              <Grid3x3 size={14} />
            </button>
            <button
              onClick={() => setViewType('week')}
              style={{
                padding: '8px 12px',
                background: viewType === 'week' ? COLORS.primary.orange : 'transparent',
                color: viewType === 'week' ? 'white' : COLORS.neutral.medium,
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
              }}
              data-testid="button-view-week"
            >
              <CalendarDays size={14} />
            </button>
            <button
              onClick={() => setViewType('day')}
              style={{
                padding: '8px 12px',
                background: viewType === 'day' ? COLORS.primary.orange : 'transparent',
                color: viewType === 'day' ? 'white' : COLORS.neutral.medium,
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
              }}
              data-testid="button-view-day"
            >
              <Clock size={14} />
            </button>
            <button
              onClick={() => setViewType('list')}
              style={{
                padding: '8px 12px',
                background: viewType === 'list' ? COLORS.primary.orange : 'transparent',
                color: viewType === 'list' ? 'white' : COLORS.neutral.medium,
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
              }}
              data-testid="button-view-list"
            >
              <List size={14} />
            </button>
          </div>
          
          {/* Filter button */}
          <button
            onClick={() => setFilterMenuOpen(!filterMenuOpen)}
            style={{
              padding: '8px 12px',
              background: COLORS.glass.whiteLight,
              border: `1px solid ${COLORS.glass.whiteMedium}`,
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: '500',
              color: COLORS.neutral.medium,
              transition: 'all 0.2s ease',
              position: 'relative',
            }}
            data-testid="button-filter"
          >
            <Filter size={14} />
            Filtri
            {(activeFilters.types.length > 0 || activeFilters.visibility.length > 0) && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: COLORS.primary.orange,
              }} />
            )}
          </button>
          
          {/* Add event button */}
          {permissions.canCreateScopes.length > 0 && (
            <button
              onClick={() => {
                setSelectedEvent(null);
                setSelectedDate(new Date());
                setShowEventModal(true);
              }}
              style={{
                padding: '8px 16px',
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
              }}
              data-testid="button-add-event"
            >
              <Plus size={16} />
              Nuovo Evento
            </button>
          )}
          
          {/* Pending approvals badge */}
          {pendingApprovals > 0 && permissions.canApproveLeave && (
            <div style={{
              padding: '8px 12px',
              background: COLORS.semantic.warning,
              color: 'white',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <AlertCircle size={14} />
              {pendingApprovals} approvazioni
            </div>
          )}
        </div>
      </div>
      
      {/* Calendar content based on view type */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        position: 'relative',
      }}>
        {eventsLoading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: COLORS.neutral.medium,
          }}>
            Caricamento eventi...
          </div>
        ) : viewType === 'month' ? (
          /* Month view */
          <div>
            {/* Weekday headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              marginBottom: '8px',
              borderBottom: `1px solid ${COLORS.neutral.lighter}`,
              paddingBottom: '8px',
            }}>
              {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                <div key={day} style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: COLORS.neutral.medium,
                  textAlign: 'center',
                }}>
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '1px',
              background: COLORS.neutral.lighter,
            }}>
              {calendarDays.map((day, index) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isCurrentDay = isToday(day);
                
                return (
                  <div
                    key={index}
                    onClick={() => handleDayClick(day)}
                    style={{
                      background: isCurrentMonth ? 'white' : COLORS.neutral.lightest,
                      minHeight: compactMode ? '60px' : '100px',
                      padding: '8px',
                      cursor: permissions.canCreateScopes.length > 0 ? 'pointer' : 'default',
                      position: 'relative',
                      transition: 'all 0.2s ease',
                    }}
                    data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
                    onMouseEnter={(e) => {
                      if (permissions.canCreateScopes.length > 0) {
                        e.currentTarget.style.background = COLORS.glass.whiteLight;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = isCurrentMonth ? 'white' : COLORS.neutral.lightest;
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '4px',
                    }}>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: isCurrentDay ? '600' : '400',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: isCurrentDay ? COLORS.primary.orange : 'transparent',
                        color: isCurrentDay ? 'white' : (isCurrentMonth ? COLORS.neutral.dark : COLORS.neutral.light),
                      }}>
                        {format(day, 'd')}
                      </span>
                      {dayEvents.length > 0 && (
                        <span style={{
                          fontSize: '11px',
                          color: COLORS.neutral.medium,
                        }}>
                          {dayEvents.length}
                        </span>
                      )}
                    </div>
                    
                    {/* Events list */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      maxHeight: compactMode ? '30px' : '60px',
                      overflow: 'hidden',
                    }}>
                      {dayEvents.slice(0, compactMode ? 1 : 3).map((event, eventIndex) => (
                        <div
                          key={event.id}
                          onClick={(e) => handleEventClick(event, e)}
                          onContextMenu={(e) => handleContextMenu(event, e)}
                          style={{
                            fontSize: '11px',
                            padding: '2px 4px',
                            borderRadius: '3px',
                            background: EVENT_TYPE_COLORS[event.type as keyof typeof EVENT_TYPE_COLORS],
                            color: 'white',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            opacity: event.status === 'cancelled' ? 0.5 : 1,
                            textDecoration: event.status === 'cancelled' ? 'line-through' : 'none',
                          }}
                          data-testid={`event-${event.id}`}
                        >
                          {format(new Date(event.startDate), 'HH:mm')} {event.title}
                        </div>
                      ))}
                      {dayEvents.length > (compactMode ? 1 : 3) && (
                        <div style={{
                          fontSize: '10px',
                          color: COLORS.neutral.medium,
                          textAlign: 'center',
                        }}>
                          +{dayEvents.length - (compactMode ? 1 : 3)} altri
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewType === 'list' ? (
          /* List view */
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            {events.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: COLORS.neutral.medium,
                padding: '32px',
              }}>
                Nessun evento per questo periodo
              </div>
            ) : (
              events.map((event: CalendarEvent) => (
                <div
                  key={event.id}
                  onClick={(e) => handleEventClick(event, e)}
                  onContextMenu={(e) => handleContextMenu(event, e)}
                  style={{
                    padding: '12px 16px',
                    background: 'white',
                    border: `1px solid ${COLORS.neutral.lighter}`,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: event.status === 'cancelled' ? 0.5 : 1,
                  }}
                  data-testid={`event-list-${event.id}`}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = COLORS.neutral.lightest;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                  }}
                >
                  <div style={{
                    width: '4px',
                    height: '40px',
                    borderRadius: '2px',
                    background: EVENT_TYPE_COLORS[event.type as keyof typeof EVENT_TYPE_COLORS],
                  }} />
                  
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: COLORS.neutral.dark,
                      marginBottom: '4px',
                      textDecoration: event.status === 'cancelled' ? 'line-through' : 'none',
                    }}>
                      {event.title}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      fontSize: '12px',
                      color: COLORS.neutral.medium,
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        {format(new Date(event.startDate), 'HH:mm')} - {format(new Date(event.endDate), 'HH:mm')}
                      </span>
                      {event.location && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} />
                          {event.location}
                        </span>
                      )}
                      {event.attendees && event.attendees.length > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Users size={12} />
                          {event.attendees.length} partecipanti
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    {event.hrSensitive && permissions.canViewHrSensitive && (
                      <Eye size={16} color={COLORS.neutral.medium} />
                    )}
                    {helpers?.canEditEvent(event) && (
                      <Edit size={16} color={COLORS.neutral.medium} />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Week/Day view placeholder */
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: COLORS.neutral.medium,
          }}>
            Vista {viewType === 'week' ? 'settimanale' : 'giornaliera'} in sviluppo
          </div>
        )}
      </div>
      
      {/* Context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'white',
            border: `1px solid ${COLORS.neutral.lighter}`,
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
            padding: '4px',
            zIndex: 1000,
            minWidth: '160px',
          }}
        >
          {helpers?.canEditEvent(contextMenu.event) && (
            <button
              onClick={() => {
                setSelectedEvent(contextMenu.event);
                setShowEventModal(true);
                setContextMenu(null);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: COLORS.neutral.dark,
                textAlign: 'left',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = COLORS.neutral.lightest;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              data-testid="context-edit"
            >
              <Edit size={14} />
              Modifica
            </button>
          )}
          {helpers?.canDeleteEvent(contextMenu.event) && (
            <button
              onClick={() => {
                if (confirm('Sei sicuro di voler eliminare questo evento?')) {
                  deleteEventMutation.mutate(contextMenu.event.id);
                }
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: COLORS.semantic.error,
                textAlign: 'left',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = COLORS.neutral.lightest;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              data-testid="context-delete"
            >
              <Trash size={14} />
              Elimina
            </button>
          )}
        </div>
      )}
      
      {/* Event Modal */}
      {showEventModal && (
        <EventModal
          event={selectedEvent}
          selectedDate={selectedDate}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
            setSelectedDate(null);
          }}
          onSave={() => {
            refetchEvents();
            setShowEventModal(false);
            setSelectedEvent(null);
            setSelectedDate(null);
          }}
        />
      )}
    </div>
  );
}