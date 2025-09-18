import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  User, Search, Bell, Settings, Menu, ChevronDown,
  Store, LogOut, UserCircle, CheckCircle, Circle,
  AlertTriangle, AlertCircle, Info, Users, BarChart3
} from 'lucide-react';
import { oauth2Client } from '../../services/OAuth2Client';
import { queryClient } from '../../lib/queryClient';
import { apiService } from '../../services/ApiService';
import { useUserAvatar } from '../../hooks/useUserAvatar';

// Palette colori W3 Suite - Consistent con Layout
const COLORS = {
  primary: {
    orange: '#FF6900',
    orangeLight: '#ff8533',
    purple: '#7B2CBF',
    purpleLight: '#9747ff',
  }
};

interface HeaderProps {
  isMobile?: boolean;
  isTablet?: boolean;
  onMenuToggle?: () => void;
  selectedStore?: any;
  stores?: any[];
  onStoreSelect?: (store: any) => void;
  searchPlaceholder?: string;
}

export default function Header({ 
  isMobile = false, 
  isTablet = false,
  onMenuToggle,
  selectedStore,
  stores = [],
  onStoreSelect,
  searchPlaceholder = "Cerca clienti, contratti, fatture..."
}: HeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  
  const { data: user } = useQuery({ queryKey: ["/api/auth/session"] });
  
  // Use avatar hook for enhanced avatar functionality
  const userAvatar = useUserAvatar(user, {
    size: isMobile ? 28 : 32,
    enabled: !!user
  });

  // Notification queries
  const { data: unreadCountData, refetch: refetchUnreadCount } = useQuery({
    queryKey: ['/api/notifications/unread-count'],
    queryFn: async () => {
      const response = await apiService.getUnreadNotificationCount();
      return response.success ? response.data : { unreadCount: 0 };
    },
    refetchInterval: 15000, // Poll every 15 seconds
    enabled: !!user
  });

  const { data: notificationsData, refetch: refetchNotifications } = useQuery({
    queryKey: ['/api/notifications', { status: 'unread', limit: 10 }],
    queryFn: async () => {
      const response = await apiService.getNotifications({ 
        status: 'unread', 
        limit: 10,
        page: 1 
      });
      return response.success ? response.data : { notifications: [], unreadCount: 0, metadata: {} };
    },
    enabled: !!user && notificationMenuOpen
  });

  // Mark notification as read mutation
  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) => apiService.markNotificationRead(notificationId),
    onSuccess: () => {
      // Refetch both queries to update the UI
      refetchUnreadCount();
      refetchNotifications();
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    }
  });

  const unreadCount = unreadCountData?.unreadCount || 0;
  const notifications = notificationsData?.notifications || [];

  // Utility functions for notifications
  const getNotificationIcon = (type: string, priority: string) => {
    if (priority === 'critical' || type === 'security') {
      return <AlertTriangle size={16} style={{ color: '#ef4444' }} />;
    }
    if (priority === 'high') {
      return <AlertCircle size={16} style={{ color: '#f59e0b' }} />;
    }
    return <Info size={16} style={{ color: '#3b82f6' }} />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Ora';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min fa`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ore fa`;
    return `${Math.floor(diffInSeconds / 86400)} giorni fa`;
  };

  const handleNotificationClick = async (notification: any) => {
    if (notification.status === 'unread') {
      try {
        await markReadMutation.mutateAsync(notification.id);
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
    
    // Navigate to URL if provided
    if (notification.url) {
      window.location.href = notification.url;
    }
  };

  // Chiudi menu quando clicchi fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-user-menu]')) {
        setUserMenuOpen(false);
      }
      if (!target.closest('[data-store-menu]')) {
        setStoreMenuOpen(false);
      }
      if (!target.closest('[data-notification-menu]')) {
        setNotificationMenuOpen(false);
      }
    };

    if (userMenuOpen || storeMenuOpen || notificationMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [userMenuOpen, storeMenuOpen, notificationMenuOpen]);

  const handleLogout = async () => {
    try {
      console.log('🚪 Logging out via OAuth2...');
      await oauth2Client.logout();
      queryClient.removeQueries({ queryKey: ['/api/auth/session'] });
      queryClient.clear();
      console.log('✅ OAuth2 logout completed');
      window.location.href = '/brandinterface/login';
    } catch (error) {
      console.error('❌ Logout error:', error);
      await oauth2Client.logout();
      queryClient.clear();
      window.location.href = '/brandinterface/login';
    }
  };

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: isMobile ? '56px' : '64px',
      background: 'hsla(255, 255, 255, 0.15)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderBottom: '1px solid hsla(255, 255, 255, 0.25)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? '0 16px' : '0 24px',
      zIndex: 50,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
      borderRadius: '0 0 20px 20px'
    }}>
      {/* Logo e Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Mobile Menu Button */}
        {isMobile && onMenuToggle && (
          <button
            onClick={onMenuToggle}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              borderRadius: '8px',
              marginRight: '8px'
            }}
          >
            <Menu size={20} />
          </button>
        )}
        
        <div style={{
          width: '32px',
          height: '32px',
          background: `linear-gradient(135deg, ${COLORS.primary.orange}, ${COLORS.primary.orangeLight})`,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '16px'
        }}>W</div>
        <div>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937', margin: 0, lineHeight: 1 }}>
            WindTre Suite
          </p>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, lineHeight: 1 }}>
            Multitenant Dashboard
          </p>
        </div>
      </div>

      {/* Barra di ricerca centrale - Hidden on mobile */}
      {!isMobile && (
        <div style={{ flex: 1, maxWidth: '400px', margin: '0 32px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: '#6b7280' 
            }} />
            <input
              placeholder={searchPlaceholder}
              style={{
                width: '100%',
                padding: '8px 12px 8px 40px',
                background: 'hsla(0, 0%, 100%, 0.25)',
                backdropFilter: 'blur(16px)',
                border: '1px solid hsla(0, 0%, 100%, 0.18)',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
        </div>
      )}
      
      {/* Mobile search button */}
      {isMobile && (
        <button style={{
          background: 'transparent',
          border: 'none',
          padding: '8px',
          cursor: 'pointer',
          borderRadius: '8px'
        }}>
          <Search size={20} />
        </button>
      )}

      {/* Sezione destra - Responsive */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px' }}>
        {/* Selettore Punto Vendita - Hidden on mobile */}
        {!isMobile && stores.length > 0 && (
          <div style={{ position: 'relative' }} data-store-menu>
            <button
              onClick={() => setStoreMenuOpen(!storeMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'hsla(0, 0%, 100%, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid hsla(0, 0%, 100%, 0.15)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                color: 'inherit'
              }}
            >
              <Store size={16} style={{ color: '#6b7280' }} />
              <span style={{ fontWeight: 400 }}>
                {selectedStore?.nome || selectedStore?.name || 'Seleziona Punto Vendita'}
              </span>
              <ChevronDown size={14} style={{ 
                transform: storeMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }} />
            </button>

            {/* Dropdown Menu Punti Vendita */}
            {storeMenuOpen && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: '8px',
                width: '280px',
                maxHeight: '300px',
                overflowY: 'auto',
                background: 'hsla(0, 0%, 100%, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid hsla(0, 0%, 100%, 0.2)',
                borderRadius: '12px',
                boxShadow: '0 16px 48px rgba(0, 0, 0, 0.1)',
                zIndex: 1000
              }}>
                {stores.map((store, index) => (
                  <button
                    key={store.id}
                    onClick={() => {
                      onStoreSelect?.(store);
                      setStoreMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: index < stores.length - 1 ? '1px solid hsla(0, 0%, 0%, 0.05)' : 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(0, 0%, 0%, 0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#1f2937', marginBottom: '2px' }}>
                      {store.nome || store.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {store.codice || store.code} • {store.citta || store.city}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notifiche */}
        <div style={{ position: 'relative' }} data-notification-menu>
          <button
            onClick={() => setNotificationMenuOpen(!notificationMenuOpen)}
            style={{
              position: 'relative',
              background: 'hsla(0, 0%, 100%, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid hsla(0, 0%, 100%, 0.15)',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Bell size={isMobile ? 18 : 20} />
            {/* Dynamic notification badge */}
            {unreadCount > 0 && (
              <div style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                minWidth: unreadCount > 9 ? '18px' : '16px',
                height: '16px',
                background: '#ef4444',
                borderRadius: '8px',
                border: '2px solid white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 600,
                color: 'white',
                padding: unreadCount > 9 ? '0 4px' : '0'
              }}
              data-testid="notification-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </div>
            )}
          </button>

          {/* Enhanced Notification Menu */}
          {notificationMenuOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '8px',
              width: isMobile ? '300px' : '360px',
              maxHeight: '400px',
              background: 'hsla(0, 0%, 100%, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid hsla(0, 0%, 100%, 0.2)',
              borderRadius: '12px',
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
              overflow: 'hidden'
            }} data-testid="notification-dropdown">
              {/* Header */}
              <div style={{
                padding: '16px 16px 12px',
                borderBottom: '1px solid hsla(0, 0%, 0%, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
                  Notifiche {unreadCount > 0 && `(${unreadCount})`}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={async () => {
                      try {
                        const unreadIds = notifications.filter(n => n.status === 'unread').map(n => n.id);
                        if (unreadIds.length > 0) {
                          await apiService.bulkMarkNotificationsRead(unreadIds);
                          refetchUnreadCount();
                          refetchNotifications();
                        }
                      } catch (error) {
                        console.error('Failed to mark all as read:', error);
                      }
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#3b82f6',
                      fontSize: '12px',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}
                    data-testid="mark-all-read-button"
                  >
                    Segna tutte come lette
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div style={{ 
                maxHeight: '320px',
                overflowY: 'auto',
                padding: notifications.length === 0 ? '20px' : '0'
              }}>
                {notifications.length === 0 ? (
                  <div style={{ 
                    fontSize: '13px', 
                    color: '#6b7280', 
                    textAlign: 'center',
                    padding: '20px'
                  }}>
                    {notificationsData ? 'Nessuna notifica non letta' : 'Caricamento notifiche...'}
                  </div>
                ) : (
                  notifications.map((notification: any, index: number) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: index < notifications.length - 1 ? '1px solid hsla(0, 0%, 0%, 0.05)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: notification.status === 'unread' ? 'hsla(59, 100%, 96%, 0.5)' : 'transparent',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = notification.status === 'unread' 
                          ? 'hsla(59, 100%, 94%, 0.8)' 
                          : 'hsla(0, 0%, 0%, 0.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = notification.status === 'unread' 
                          ? 'hsla(59, 100%, 96%, 0.5)' 
                          : 'transparent';
                      }}
                      data-testid={`notification-item-${notification.id}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        {/* Icon */}
                        <div style={{ 
                          marginTop: '2px',
                          flexShrink: 0
                        }}>
                          {getNotificationIcon(notification.type, notification.priority)}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '4px'
                          }}>
                            <div style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#1f2937',
                              lineHeight: 1.2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1
                            }}>
                              {notification.title}
                            </div>
                            <div style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: getPriorityColor(notification.priority),
                              flexShrink: 0
                            }} />
                          </div>
                          
                          <div style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            lineHeight: 1.3,
                            marginBottom: '6px',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {notification.message}
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <div style={{
                              fontSize: '11px',
                              color: '#9ca3af'
                            }}>
                              {formatRelativeTime(notification.createdAt)}
                            </div>
                            
                            {notification.status === 'unread' && (
                              <div style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#3b82f6'
                              }} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div style={{
                  padding: '12px 16px',
                  borderTop: '1px solid hsla(0, 0%, 0%, 0.05)',
                  textAlign: 'center'
                }}>
                  <button
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#3b82f6',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 500
                    }}
                    data-testid="view-all-notifications-button"
                  >
                    Vedi tutte le notifiche
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Menu */}
        <div style={{ position: 'relative' }} data-user-menu>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '0' : '8px',
              padding: '6px',
              background: 'hsla(0, 0%, 100%, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid hsla(0, 0%, 100%, 0.15)',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {/* Enhanced User Avatar with API Integration */}
            <div 
              style={{
                width: isMobile ? '28px' : '32px',
                height: isMobile ? '28px' : '32px',
                background: userAvatar.hasImage 
                  ? `url(${userAvatar.avatarUrl}) center/cover`
                  : userAvatar.gradient,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: isMobile ? '12px' : '13px',
                fontWeight: 600,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
                textShadow: userAvatar.hasImage ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.3)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                border: userAvatar.hasImage ? '1px solid hsla(255, 255, 255, 0.2)' : 'none',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              data-testid="header-user-avatar"
              title={user?.firstName && user?.lastName 
                ? `${(user as any)?.firstName} ${(user as any)?.lastName}` 
                : (user as any)?.email || 'User Avatar'}
            >
              {/* Loading overlay */}
              {userAvatar.isLoading && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px'
                }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    border: '1.5px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '1.5px solid white',
                    borderRadius: '50%',
                    animation: 'rotate 1s linear infinite'
                  }} />
                </div>
              )}
              
              {/* Show initials when no image */}
              {!userAvatar.hasImage && !userAvatar.isLoading && (
                <span style={{
                  fontSize: 'inherit',
                  fontWeight: 'inherit',
                  textShadow: 'inherit'
                }}>
                  {userAvatar.initials}
                </span>
              )}
            </div>
            {!isMobile && (
              <>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#1f2937' }}>
                  {(user && typeof user === 'object' && 'firstName' in user ? user.firstName : null) || (user && typeof user === 'object' && 'email' in user ? (user as any).email?.split('@')[0] : null) || 'Utente'}
                </div>
                <ChevronDown size={14} style={{ 
                  transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }} />
              </>
            )}
          </button>

          {/* User Dropdown */}
          {userMenuOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '8px',
              width: '200px',
              background: 'hsla(0, 0%, 100%, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid hsla(0, 0%, 100%, 0.2)',
              borderRadius: '12px',
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
              overflow: 'hidden'
            }}>
              <button
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid hsla(0, 0%, 0%, 0.05)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(0, 0%, 0%, 0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <UserCircle size={16} />
                <span style={{ fontSize: '14px', color: '#1f2937' }}>Profilo</span>
              </button>
              <button
                onClick={() => {
                  const tenant = localStorage.getItem('currentTenant') || 'staging';
                  window.location.href = `/${tenant}/hr`;
                  setUserMenuOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid hsla(0, 0%, 0%, 0.05)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(255, 105, 0, 0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Users size={16} style={{ color: '#FF6900' }} />
                <span style={{ fontSize: '14px', color: '#1f2937' }}>Portale HR</span>
              </button>
              <button
                onClick={() => {
                  const tenant = localStorage.getItem('currentTenant') || 'staging';
                  window.location.href = `/${tenant}/employee/dashboard`;
                  setUserMenuOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid hsla(0, 0%, 0%, 0.05)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(123, 47%, 50%, 0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <BarChart3 size={16} style={{ color: '#10B981' }} />
                <span style={{ fontSize: '14px', color: '#1f2937' }}>Dashboard Dipendente</span>
              </button>
              <button
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid hsla(0, 0%, 0%, 0.05)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(0, 0%, 0%, 0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <Settings size={16} />
                <span style={{ fontSize: '14px', color: '#1f2937' }}>Impostazioni</span>
              </button>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'background 0.2s ease',
                  color: '#ef4444'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(239, 68%, 68%, 0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={16} />
                <span style={{ fontSize: '14px' }}>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}