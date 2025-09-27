import React, { useState } from 'react';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, type Notification } from '@/hooks/useNotifications';
import { 
  Bell, Filter, Check, CheckCheck, Clock, AlertTriangle, Info, 
  ExternalLink, ChevronDown, Search, ArrowLeft, Calendar
} from 'lucide-react';
import { useLocation } from 'wouter';
import { formatDistanceToNow, format } from 'date-fns';
import { it } from 'date-fns/locale';

// WindTre color palette
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
    white: 'rgba(255, 255, 255, 0.08)',
    whiteMedium: 'rgba(255, 255, 255, 0.12)',
  }
};

export default function NotificationCenter() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'support_request' | 'system' | 'custom'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Build filters object for API
  const filters = {
    ...(statusFilter !== 'all' && { status: statusFilter as 'read' | 'unread' }),
    ...(typeFilter !== 'all' && { type: typeFilter }),
    ...(priorityFilter !== 'all' && { priority: priorityFilter }),
    limit: 50
  };

  // Fetch notifications
  const { data: notifications = [], isLoading, refetch } = useNotifications(filters);

  // Mutations
  const markAsReadMutation = useMarkNotificationRead();
  const markAllAsReadMutation = useMarkAllNotificationsRead();

  // Filter notifications by search term
  const filteredNotifications = notifications.filter(notification => 
    notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notification.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get notification icon
  const getNotificationIcon = (notification: Notification) => {
    if (notification.priority === 'critical') {
      return <AlertTriangle size={20} style={{ color: COLORS.semantic.error }} />;
    }
    if (notification.type === 'support_request') {
      return <Clock size={20} style={{ color: COLORS.primary.orange }} />;
    }
    if (notification.priority === 'high') {
      return <AlertTriangle size={20} style={{ color: COLORS.semantic.warning }} />;
    }
    return <Info size={20} style={{ color: COLORS.semantic.info }} />;
  };

  // Get notification color
  const getNotificationColor = (notification: Notification) => {
    switch (notification.priority) {
      case 'critical': return COLORS.semantic.error;
      case 'high': return COLORS.semantic.warning;
      case 'medium': return COLORS.primary.orange;
      default: return COLORS.semantic.info;
    }
  };

  // Get type label
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'hr_request': return 'Richiesta HR';
      case 'system': return 'Sistema';
      case 'custom': return 'Personalizzato';
      default: return type;
    }
  };

  // Get priority label
  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'critical': return 'Critico';
      case 'high': return 'Alto';
      case 'medium': return 'Medio';
      case 'low': return 'Basso';
      default: return priority;
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (notification.status === 'unread') {
      await markAsReadMutation.mutateAsync(notification.id);
    }

    if (notification.url) {
      navigate(notification.url);
    }
  };

  const unreadCount = filteredNotifications.filter(n => n.status === 'unread').length;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, hsl(210, 20%, 98%), hsl(210, 25%, 96%))',
      padding: '24px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'hsla(0, 0%, 100%, 0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid hsla(0, 0%, 100%, 0.2)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => navigate(-1)}
                style={{
                  background: 'hsla(0, 0%, 100%, 0.3)',
                  border: '1px solid hsla(0, 0%, 100%, 0.2)',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.3)';
                }}
                data-testid="back-button"
              >
                <ArrowLeft size={20} style={{ color: COLORS.neutral.medium }} />
              </button>
              
              <div>
                <h1 style={{ 
                  margin: 0, 
                  fontSize: '24px', 
                  fontWeight: 700, 
                  color: COLORS.neutral.dark,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <Bell size={24} style={{ color: COLORS.primary.orange }} />
                  Centro Notifiche
                </h1>
                <p style={{ 
                  margin: '4px 0 0 0', 
                  fontSize: '14px', 
                  color: COLORS.neutral.medium 
                }}>
                  Gestisci tutte le tue notifiche in un unico posto
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                style={{
                  background: `linear-gradient(135deg, ${COLORS.primary.orange}, ${COLORS.primary.orangeLight})`,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  opacity: markAllAsReadMutation.isPending ? 0.7 : 1,
                  boxShadow: '0 4px 12px rgba(255, 105, 0, 0.3)'
                }}
                onMouseEnter={(e) => {
                  if (!markAllAsReadMutation.isPending) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 105, 0, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 105, 0, 0.3)';
                }}
                data-testid="mark-all-read-button"
              >
                <CheckCheck size={16} />
                {markAllAsReadMutation.isPending ? 'Marcando...' : `Segna ${unreadCount} come lette`}
              </button>
            )}
          </div>

          {/* Search and Filters */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
              <Search size={16} style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: COLORS.neutral.medium 
              }} />
              <input
                type="text"
                placeholder="Cerca nelle notifiche..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  background: 'hsla(0, 0%, 100%, 0.6)',
                  border: '1px solid hsla(0, 0%, 100%, 0.3)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.9)';
                  e.currentTarget.style.borderColor = COLORS.primary.orange;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.6)';
                  e.currentTarget.style.borderColor = 'hsla(0, 0%, 100%, 0.3)';
                }}
                data-testid="search-input"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                background: showFilters ? COLORS.primary.orange : 'hsla(0, 0%, 100%, 0.6)',
                color: showFilters ? 'white' : COLORS.neutral.medium,
                border: '1px solid hsla(0, 0%, 100%, 0.3)',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              data-testid="filter-toggle"
            >
              <Filter size={16} />
              Filtri
              <ChevronDown size={14} style={{ 
                transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }} />
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div style={{
              marginTop: '16px',
              padding: '16px',
              background: 'hsla(0, 0%, 100%, 0.4)',
              borderRadius: '8px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              {/* Status Filter */}
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: COLORS.neutral.dark,
                  marginBottom: '6px'
                }}>
                  Stato
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'white',
                    border: '1px solid hsla(0, 0%, 100%, 0.3)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  data-testid="status-filter"
                >
                  <option value="all">Tutte</option>
                  <option value="unread">Non lette</option>
                  <option value="read">Lette</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: COLORS.neutral.dark,
                  marginBottom: '6px'
                }}>
                  Tipo
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'white',
                    border: '1px solid hsla(0, 0%, 100%, 0.3)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  data-testid="type-filter"
                >
                  <option value="all">Tutti i tipi</option>
                  <option value="support_request">Richieste Support</option>
                  <option value="system">Sistema</option>
                  <option value="custom">Personalizzato</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: COLORS.neutral.dark,
                  marginBottom: '6px'
                }}>
                  Priorità
                </label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'white',
                    border: '1px solid hsla(0, 0%, 100%, 0.3)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  data-testid="priority-filter"
                >
                  <option value="all">Tutte le priorità</option>
                  <option value="critical">Critica</option>
                  <option value="high">Alta</option>
                  <option value="medium">Media</option>
                  <option value="low">Bassa</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Notifications List */}
        <div style={{
          background: 'hsla(0, 0%, 100%, 0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid hsla(0, 0%, 100%, 0.2)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)'
        }}>
          {isLoading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: COLORS.neutral.medium }}>
              Caricamento notifiche...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div style={{ 
              padding: '48px', 
              textAlign: 'center', 
              color: COLORS.neutral.medium 
            }}>
              <Bell size={48} style={{ color: COLORS.neutral.light, marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>
                Nessuna notifica trovata
              </h3>
              <p style={{ margin: 0, fontSize: '14px' }}>
                Non ci sono notifiche che corrispondono ai filtri selezionati.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification, index) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                style={{
                  padding: '20px 24px',
                  borderBottom: index < filteredNotifications.length - 1 ? '1px solid hsla(0, 0%, 100%, 0.15)' : 'none',
                  cursor: notification.url ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'flex-start',
                  opacity: notification.status === 'read' ? 0.7 : 1,
                  background: notification.status === 'unread' ? 'hsla(255, 105, 0, 0.02)' : 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (notification.url) {
                    e.currentTarget.style.background = notification.status === 'unread' 
                      ? 'hsla(255, 105, 0, 0.05)' 
                      : 'hsla(0, 0%, 100%, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = notification.status === 'unread' 
                    ? 'hsla(255, 105, 0, 0.02)' 
                    : 'transparent';
                }}
                data-testid={`notification-item-${notification.id}`}
              >
                {/* Icon */}
                <div style={{ flexShrink: 0, marginTop: '2px' }}>
                  {getNotificationIcon(notification)}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: notification.status === 'unread' ? 700 : 600,
                        color: COLORS.neutral.dark,
                        marginBottom: '6px',
                        lineHeight: 1.4
                      }}>
                        {notification.title}
                      </div>
                      
                      <div style={{
                        fontSize: '14px',
                        color: COLORS.neutral.medium,
                        lineHeight: 1.4,
                        marginBottom: '12px'
                      }}>
                        {notification.message}
                      </div>

                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '16px',
                        flexWrap: 'wrap'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={12} style={{ color: COLORS.neutral.light }} />
                          <span style={{
                            fontSize: '12px',
                            color: COLORS.neutral.light,
                            fontWeight: 500
                          }}>
                            {format(new Date(notification.createdAt), 'dd MMM yyyy HH:mm', { locale: it })}
                          </span>
                        </div>

                        <div style={{
                          background: getNotificationColor(notification),
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 600,
                          textTransform: 'uppercase'
                        }}>
                          {getPriorityLabel(notification.priority)}
                        </div>

                        <div style={{
                          background: COLORS.neutral.lighter,
                          color: COLORS.neutral.medium,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 600
                        }}>
                          {getTypeLabel(notification.type)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {notification.status === 'unread' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsReadMutation.mutate(notification.id);
                          }}
                          style={{
                            background: 'none',
                            border: `1px solid ${COLORS.semantic.success}`,
                            color: COLORS.semantic.success,
                            borderRadius: '6px',
                            padding: '6px 8px',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = COLORS.semantic.success;
                            e.currentTarget.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none';
                            e.currentTarget.style.color = COLORS.semantic.success;
                          }}
                          data-testid={`mark-read-${notification.id}`}
                        >
                          <Check size={12} />
                          Segna
                        </button>
                      )}

                      {notification.url && (
                        <ExternalLink size={16} style={{ color: COLORS.neutral.light }} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Priority Indicator */}
                <div
                  style={{
                    width: '4px',
                    height: '100%',
                    minHeight: '40px',
                    background: getNotificationColor(notification),
                    borderRadius: '2px',
                    flexShrink: 0
                  }}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}