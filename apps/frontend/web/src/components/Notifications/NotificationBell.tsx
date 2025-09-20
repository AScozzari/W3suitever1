import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCircle, Clock, AlertTriangle, Info, ExternalLink } from 'lucide-react';
import { useNotifications, useUnreadNotificationCount, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useNotifications';
import { Notification } from '@/types';
import { useLocation, useParams } from 'wouter';
import { formatDistanceToNow } from 'date-fns';
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
  glass: {
    white: 'rgba(255, 255, 255, 0.08)',
    whiteMedium: 'rgba(255, 255, 255, 0.12)',
  }
};

interface NotificationBellProps {
  isMobile?: boolean;
}

export default function NotificationBell({ isMobile = false }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [, navigate] = useLocation();
  const params = useParams();
  const currentTenant = (params as any).tenant || 'staging'; // fallback for safety
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications and unread count
  const { data: unreadCountData } = useUnreadNotificationCount();
  const unreadCount = typeof unreadCountData === 'number' ? unreadCountData : (unreadCountData as any)?.count || 0;
  const { data: notifications = [], isLoading } = useNotifications({ 
    status: 'unread', 
    limit: 5 
  });

  // Mutations
  const markAsReadMutation = useMarkNotificationRead();
  const markAllAsReadMutation = useMarkAllNotificationsRead();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get notification icon based on type and priority
  const getNotificationIcon = (notification: Notification) => {
    if (notification.priority === 'critical') {
      return <AlertTriangle size={16} style={{ color: COLORS.semantic.error }} />;
    }
    if (notification.type === 'hr_request') {
      return <Clock size={16} style={{ color: COLORS.primary.orange }} />;
    }
    if (notification.priority === 'high') {
      return <AlertTriangle size={16} style={{ color: COLORS.semantic.warning }} />;
    }
    return <Info size={16} style={{ color: COLORS.semantic.info }} />;
  };

  // Get notification color based on priority
  const getNotificationColor = (notification: Notification) => {
    switch (notification.priority) {
      case 'critical': return COLORS.semantic.error;
      case 'high': return COLORS.semantic.warning;
      case 'medium': return COLORS.primary.orange;
      default: return COLORS.semantic.info;
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (notification.status === 'unread') {
      await markAsReadMutation.mutateAsync(notification.id);
    }

    // Navigate to URL if provided
    if (notification.url) {
      navigate(notification.url);
    }

    setIsOpen(false);
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    await markAllAsReadMutation.mutateAsync();
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: 'hsla(0, 0%, 100%, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid hsla(0, 0%, 100%, 0.15)',
          borderRadius: '8px',
          padding: isMobile ? '6px' : '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.15)';
          e.currentTarget.style.borderColor = 'hsla(0, 0%, 100%, 0.25)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'hsla(0, 0%, 100%, 0.1)';
          e.currentTarget.style.borderColor = 'hsla(0, 0%, 100%, 0.15)';
        }}
        data-testid="notification-bell"
      >
        <Bell size={isMobile ? 18 : 20} style={{ color: '#6b7280' }} />
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: `linear-gradient(135deg, ${COLORS.semantic.error}, #dc2626)`,
              color: 'white',
              borderRadius: '10px',
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 'bold',
              padding: '0 4px',
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            data-testid="notification-badge"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: '8px',
            width: isMobile ? '280px' : '360px',
            maxHeight: '400px',
            background: 'hsla(0, 0%, 100%, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid hsla(0, 0%, 100%, 0.2)',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            zIndex: 1000,
            overflow: 'hidden'
          }}
          data-testid="notification-dropdown"
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              borderBottom: '1px solid hsla(0, 0%, 100%, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <h3 style={{ 
              margin: 0, 
              fontSize: '16px', 
              fontWeight: 600, 
              color: '#1f2937' 
            }}>
              Notifiche
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsReadMutation.isPending}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: COLORS.primary.orange,
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    transition: 'background 0.2s ease',
                    opacity: markAllAsReadMutation.isPending ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 105, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                  }}
                  data-testid="mark-all-read"
                >
                  {markAllAsReadMutation.isPending ? 'Marcando...' : 'Segna tutte'}
                </button>
              )}
              
              <button
                onClick={() => navigate(`/${currentTenant}/notification-center`)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(107, 114, 128, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none';
                }}
                data-testid="view-all-notifications"
              >
                Vedi tutte
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                Caricamento notifiche...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ 
                padding: '32px 24px', 
                textAlign: 'center', 
                color: '#6b7280' 
              }}>
                <CheckCircle size={32} style={{ 
                  color: COLORS.semantic.success, 
                  marginBottom: '12px', 
                  margin: '0 auto 12px' 
                }} />
                <p style={{ margin: 0, fontSize: '14px' }}>
                  Nessuna notifica non letta
                </p>
              </div>
            ) : (
              notifications.map((notification, index) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: index < notifications.length - 1 ? '1px solid hsla(0, 0%, 100%, 0.1)' : 'none',
                    cursor: notification.url ? 'pointer' : 'default',
                    transition: 'background 0.2s ease',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start'
                  }}
                  onMouseEnter={(e) => {
                    if (notification.url) {
                      e.currentTarget.style.background = 'rgba(255, 105, 0, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                  data-testid={`notification-${notification.id}`}
                >
                  {/* Icon */}
                  <div style={{ flexShrink: 0, marginTop: '2px' }}>
                    {getNotificationIcon(notification)}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#1f2937',
                      marginBottom: '4px',
                      lineHeight: 1.4
                    }}>
                      {notification.title}
                    </div>
                    
                    <div style={{
                      fontSize: '13px',
                      color: '#6b7280',
                      lineHeight: 1.4,
                      marginBottom: '6px'
                    }}>
                      {notification.message}
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}>
                      <span style={{
                        fontSize: '11px',
                        color: '#9ca3af',
                        fontWeight: 500
                      }}>
                        {formatDistanceToNow(new Date(notification.createdAt), { 
                          addSuffix: true, 
                          locale: it 
                        })}
                      </span>

                      {notification.url && (
                        <ExternalLink size={12} style={{ color: '#9ca3af' }} />
                      )}
                    </div>
                  </div>

                  {/* Priority Indicator */}
                  <div
                    style={{
                      width: '3px',
                      height: '100%',
                      background: getNotificationColor(notification),
                      borderRadius: '2px',
                      flexShrink: 0,
                      marginLeft: '8px'
                    }}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}