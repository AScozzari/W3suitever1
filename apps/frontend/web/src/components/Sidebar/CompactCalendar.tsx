// Compact Calendar Widget for Sidebar
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { it } from 'date-fns/locale';

// Color palette WindTre + Calendar Event Types
const COLORS = {
  primary: {
    orange: '#FF6900',
    purple: '#7B2CBF',
  },
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  glass: {
    white: 'rgba(255, 255, 255, 0.15)',
    whiteLight: 'rgba(255, 255, 255, 0.08)',
  }
};

// Event type colors matching main calendar
const EVENT_TYPE_COLORS = {
  meeting: COLORS.semantic.info,     // Blue
  shift: COLORS.primary.orange,      // Orange
  time_off: COLORS.semantic.success, // Green
  training: COLORS.primary.purple,   // Purple
  deadline: COLORS.semantic.error,   // Red
  other: '#6B7280',                  // Gray
};

interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  type: 'meeting' | 'shift' | 'time_off' | 'training' | 'deadline' | 'other' | 'overtime';
  allDay: boolean;
  color?: string;
  location?: string;
  visibility?: 'private' | 'team' | 'store' | 'area' | 'tenant';
}

interface CompactCalendarProps {
  collapsed?: boolean;
  className?: string;
}

export default function CompactCalendar({ collapsed = false, className = '' }: CompactCalendarProps) {
  console.log('🗓️ [COMPACT-CALENDAR] Component mounted! collapsed:', collapsed);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // CRITICAL FIX: Fetch events for current month - ALWAYS execute regardless of collapsed state
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['/api/hr/calendar/events', format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      // Fix: Use ISO datetime format instead of date-only
      const start = startOfMonth(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = endOfMonth(currentDate);
      end.setHours(23, 59, 59, 999);
      
      const startDate = start.toISOString();
      const endDate = end.toISOString();
      
      console.log('🗓️ [COMPACT-CALENDAR] Fetching events:', { startDate, endDate, collapsed });
      
      const response = await fetch(`/api/hr/calendar/events?startDate=${startDate}&endDate=${endDate}`, {
        headers: {
          'X-Tenant-ID': '00000000-0000-0000-0000-000000000001',
          'X-Auth-Session': 'authenticated'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.warn('🗓️ [COMPACT-CALENDAR] API Error:', response.status, errorText);
        throw new Error(`API Error: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('🗓️ [COMPACT-CALENDAR] Events received:', result.data?.length || 0, 'collapsed:', collapsed);
      return result.data || [];  // HR API returns { success: true, data: [...] }
    },
    staleTime: 30000, // 30 seconds
    retry: 2, // Retry failed requests
  });

  // Generate calendar days
  const days = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    
    // Get complete week view
    const calendarStart = startOfWeek(start, { weekStartsOn: 1 }); // Monday start
    const calendarEnd = endOfWeek(end, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // FIXED: Get events for a specific day using proper date comparisons
  const getEventsForDay = (date: Date) => {
    if (!events || events.length === 0) return [];
    
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0); // Normalize to start of day
    
    return events.filter((event: CalendarEvent) => {
      try {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        
        // Normalize event dates to avoid timezone issues
        eventStart.setHours(0, 0, 0, 0);
        eventEnd.setHours(23, 59, 59, 999);
        
        // Check if target date is within event date range
        return targetDate >= eventStart && targetDate <= eventEnd;
      } catch (error) {
        console.warn('🗓️ [COMPACT-CALENDAR] Invalid event date:', event);
        return false;
      }
    });
  };

  // FIXED: Handle navigation with proper callbacks and logging
  const goToPreviousMonth = () => {
    const newDate = subMonths(currentDate, 1);
    console.log('🗓️ [COMPACT-CALENDAR] Navigation: Previous month', format(newDate, 'yyyy-MM'));
    setCurrentDate(newDate);
  };
  
  const goToNextMonth = () => {
    const newDate = addMonths(currentDate, 1);
    console.log('🗓️ [COMPACT-CALENDAR] Navigation: Next month', format(newDate, 'yyyy-MM'));
    setCurrentDate(newDate);
  };
  
  const goToToday = () => {
    const newDate = new Date();
    console.log('🗓️ [COMPACT-CALENDAR] Navigation: Go to today', format(newDate, 'yyyy-MM-dd'));
    setCurrentDate(newDate);
  };

  if (collapsed) {
    // Ultra-compact view when sidebar is collapsed
    return (
      <div className={`calendar-compact-collapsed ${className}`} style={{
        padding: '8px 4px',
        textAlign: 'center'
      }}>
        <div style={{
          backgroundColor: COLORS.glass.white,
          borderRadius: '8px',
          padding: '6px',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        }}>
          <Calendar size={16} style={{ color: COLORS.primary.orange, marginBottom: '4px' }} />
          <div style={{
            fontSize: '10px',
            fontWeight: 600,
            color: '#1f2937'
          }}>
            {format(new Date(), 'dd')}
          </div>
          <div style={{
            fontSize: '8px',
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {format(new Date(), 'MMM', { locale: it })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`calendar-compact ${className}`} style={{
      backgroundColor: COLORS.glass.white,
      borderRadius: '12px',
      padding: '12px',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.18)',
      margin: '8px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <button
          onClick={goToPreviousMonth}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '4px',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: '#6b7280'
          }}
        >
          <ChevronLeft size={14} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#1f2937',
            lineHeight: 1
          }}>
            {format(currentDate, 'MMMM yyyy', { locale: it })}
          </div>
          <button
            onClick={goToToday}
            style={{
              fontSize: '9px',
              color: COLORS.primary.orange,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: '2px'
            }}
          >
            Oggi
          </button>
        </div>

        <button
          onClick={goToNextMonth}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '4px',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: '#6b7280'
          }}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Weekday headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '2px',
        marginBottom: '6px'
      }}>
        {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, index) => (
          <div
            key={index}
            style={{
              fontSize: '9px',
              fontWeight: 500,
              color: '#9ca3af',
              textAlign: 'center',
              padding: '2px',
              textTransform: 'uppercase'
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '1px'
      }}>
        {days.map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isDayToday = isToday(day);

          return (
            <button
              key={index}
              onClick={() => setSelectedDate(day)}
              style={{
                position: 'relative',
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: isDayToday ? 600 : 400,
                backgroundColor: isSelected 
                  ? COLORS.primary.orange 
                  : isDayToday 
                    ? 'rgba(255, 105, 0, 0.1)' 
                    : 'transparent',
                color: isSelected 
                  ? 'white' 
                  : isDayToday 
                    ? COLORS.primary.orange 
                    : isCurrentMonth 
                      ? '#1f2937' 
                      : '#d1d5db',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                minHeight: '20px'
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = isDayToday ? 'rgba(255, 105, 0, 0.1)' : 'transparent';
                }
              }}
            >
              {format(day, 'd')}
              
              {/* Event indicators */}
              {dayEvents.length > 0 && (
                <div style={{
                  position: 'absolute',
                  bottom: '1px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: '1px'
                }}>
                  {dayEvents.slice(0, 3).map((event, eventIndex) => (
                    <div
                      key={eventIndex}
                      style={{
                        width: '3px',
                        height: '3px',
                        borderRadius: '50%',
                        backgroundColor: event.color || EVENT_TYPE_COLORS[event.type] || '#6b7280'
                      }}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <div style={{
                      fontSize: '6px',
                      color: '#6b7280',
                      fontWeight: 500
                    }}>
                      +{dayEvents.length - 3}
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date events */}
      {selectedDate && (
        <div style={{
          marginTop: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.18)',
          paddingTop: '8px'
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#1f2937',
            marginBottom: '6px'
          }}>
            {format(selectedDate, 'dd MMMM', { locale: it })}
          </div>
          
          {getEventsForDay(selectedDate).length === 0 ? (
            <div style={{
              fontSize: '9px',
              color: '#9ca3af',
              fontStyle: 'italic'
            }}>
              Nessun evento
            </div>
          ) : (
            <div style={{ maxHeight: '100px', overflowY: 'auto' }}>
              {getEventsForDay(selectedDate).slice(0, 3).map((event, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 0',
                    borderBottom: index < getEventsForDay(selectedDate).length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
                  }}
                >
                  <div
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: event.color || EVENT_TYPE_COLORS[event.type] || '#6b7280',
                      flexShrink: 0
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '9px',
                      fontWeight: 500,
                      color: '#1f2937',
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {event.title}
                    </div>
                    {!event.allDay && (
                      <div style={{
                        fontSize: '8px',
                        color: '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}>
                        <Clock size={8} />
                        {format(new Date(event.startDate), 'HH:mm')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {getEventsForDay(selectedDate).length > 3 && (
                <div style={{
                  fontSize: '8px',
                  color: '#9ca3af',
                  textAlign: 'center',
                  marginTop: '4px'
                }}>
                  +{getEventsForDay(selectedDate).length - 3} altri eventi
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          width: '12px',
          height: '12px',
          border: '2px solid #e5e7eb',
          borderTop: '2px solid #ff6900',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      )}

      {/* CSS for spinning animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}