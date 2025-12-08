// WebSocket Hook for Real-time Notifications
import { useEffect, useRef, useState, useCallback } from 'react';
import { queryClient, getCurrentTenantId } from '@/lib/queryClient';

interface WebSocketEvent {
  type: 'new_notification' | 'notification_read' | 'notification_update' | 'connection_established' | 'pong' | 
        'hr_shift_update' | 'hr_conflicts_update' | 'hr_shifts_subscription_confirmed' | 'hr_shifts_unsubscribed';
  notification?: any;
  notificationId?: string;
  sessionId?: string;
  timestamp?: string;
  updateType?: 'assignment_created' | 'assignment_updated' | 'assignment_deleted' | 'shift_created' | 'shift_updated' | 'shift_deleted';
  data?: any;
}

interface UseWebSocketOptions {
  enabled?: boolean;
  userId?: string;
  onNotification?: (notification: any) => void;
  onConnectionChange?: (connected: boolean) => void;
  onShiftUpdate?: (update: WebSocketEvent) => void;
  onConflictUpdate?: (conflicts: any[]) => void;
}

// Global connection state to prevent multiple connections
const globalConnectionState = {
  isConnecting: false,
  lastConnectionTime: 0,
  activeConnection: null as WebSocket | null,
  connectionCount: 0,
};

const MIN_CONNECTION_INTERVAL = 2000; // Minimum 2 seconds between connections

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { enabled = true, userId, onNotification, onConnectionChange, onShiftUpdate, onConflictUpdate } = options;
  
  // Get tenant ID from current context
  const tenantId = getCurrentTenantId();
  
  // Get user ID from localStorage or use tenant-based default
  const currentUserId = userId || localStorage.getItem('demo_user') || 'admin-user';
  
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const connectionIdRef = useRef(0);

  const connect = useCallback(() => {
    // Guard: check if already connecting or connected
    if (!enabled || !tenantId) {
      return;
    }

    // Guard: prevent rapid reconnections
    const now = Date.now();
    if (now - globalConnectionState.lastConnectionTime < MIN_CONNECTION_INTERVAL) {
      console.log('🌐 [WS] Throttled: too soon since last connection');
      return;
    }

    // Guard: already connecting
    if (globalConnectionState.isConnecting) {
      console.log('🌐 [WS] Already connecting, skipping');
      return;
    }

    // Guard: already connected with same params
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('🌐 [WS] Already connected/connecting, skipping');
      return;
    }

    try {
      globalConnectionState.isConnecting = true;
      globalConnectionState.lastConnectionTime = now;
      connectionIdRef.current++;
      const thisConnectionId = connectionIdRef.current;

      // Close existing connection cleanly
      if (wsRef.current) {
        wsRef.current.close(1000, 'New connection');
        wsRef.current = null;
      }

      // Create WebSocket URL (same-origin for both dev and prod)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host; // Use same origin as current page
      const wsUrl = `${protocol}//${host}/ws/notifications?userId=${encodeURIComponent(currentUserId)}&tenantId=${encodeURIComponent(tenantId || '')}&token=dev-token`;

      console.log('🌐 [WS] Connecting to:', wsUrl, '(id:', thisConnectionId, ')');

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      globalConnectionState.activeConnection = ws;

      ws.onopen = () => {
        globalConnectionState.isConnecting = false;
        
        // Ignore if component unmounted or connection superseded
        if (!mountedRef.current || connectionIdRef.current !== thisConnectionId) {
          ws.close(1000, 'Superseded');
          return;
        }
        
        console.log('🌐 [WS] Connected successfully (id:', thisConnectionId, ')');
        setIsConnected(true);
        setReconnectAttempts(0);
        onConnectionChange?.(true);

        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Ping every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketEvent = JSON.parse(event.data);
          console.log('🌐 [WS] Message received:', data.type, data);

          switch (data.type) {
            case 'new_notification':
              if (data.notification) {
                // Invalidate notification queries to refresh data
                queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
                queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
                
                // Call notification callback
                onNotification?.(data.notification);
                
                console.log('🌐 [WS] New notification received:', data.notification.title);
              }
              break;

            case 'notification_read':
              // Invalidate queries to refresh read status
              queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
              queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
              break;

            case 'notification_update':
              // Invalidate relevant queries
              queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
              break;

            case 'connection_established':
              console.log('🌐 [WS] Session established:', data.sessionId);
              break;

            case 'pong':
              console.log('🌐 [WS] Pong received');
              break;

            case 'hr_shift_update':
              console.log('🌐 [WS] HR shift update received:', data.updateType);
              // Invalidate HR-related queries
              queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts'] });
              queryClient.invalidateQueries({ queryKey: ['/api/hr/shift-assignments'] });
              onShiftUpdate?.(data);
              break;

            case 'hr_conflicts_update':
              console.log('🌐 [WS] HR conflicts update received:', data.data?.conflicts?.length || 0, 'conflicts');
              onConflictUpdate?.(data.data?.conflicts || []);
              break;

            case 'hr_shifts_subscription_confirmed':
              console.log('🌐 [WS] HR shifts subscription confirmed:', data);
              break;

            case 'hr_shifts_unsubscribed':
              console.log('🌐 [WS] HR shifts unsubscribed');
              break;

            default:
              console.log('🌐 [WS] Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('🌐 [WS] Failed to parse message:', error);
        }
      };

      ws.onclose = (event) => {
        globalConnectionState.isConnecting = false;
        
        // Ignore if this is not the current connection
        if (connectionIdRef.current !== thisConnectionId) {
          return;
        }
        
        console.log('🌐 [WS] Connection closed:', event.code, event.reason, '(id:', thisConnectionId, ')');
        
        if (mountedRef.current) {
          setIsConnected(false);
          onConnectionChange?.(false);
        }

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Attempt reconnection only if:
        // - Not manually closed (code 1000)
        // - Component still mounted
        // - Still enabled
        // - This is still the current connection
        if (event.code !== 1000 && mountedRef.current && enabled && connectionIdRef.current === thisConnectionId) {
          scheduleReconnect();
        }
      };

      ws.onerror = (error) => {
        globalConnectionState.isConnecting = false;
        console.error('🌐 [WS] Connection error:', error, '(id:', thisConnectionId, ')');
        
        if (mountedRef.current && connectionIdRef.current === thisConnectionId) {
          setIsConnected(false);
          onConnectionChange?.(false);
        }
      };

    } catch (error) {
      globalConnectionState.isConnecting = false;
      console.error('🌐 [WS] Failed to create connection:', error);
      if (mountedRef.current) {
        scheduleReconnect();
      }
    }
  }, [enabled, tenantId, currentUserId]);

  const scheduleReconnect = useCallback(() => {
    if (!enabled || !mountedRef.current) return;

    const maxAttempts = 10;
    const baseDelay = 2000; // Increased base delay
    const maxDelay = 30000;

    if (reconnectAttempts >= maxAttempts) {
      console.error('🌐 [WS] Max reconnection attempts reached');
      return;
    }

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Exponential backoff with jitter
    const delay = Math.min(
      baseDelay * Math.pow(2, reconnectAttempts) + Math.random() * 1000,
      maxDelay
    );

    console.log(`🌐 [WS] Scheduling reconnect in ${Math.round(delay)}ms (attempt ${reconnectAttempts + 1})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setReconnectAttempts(prev => prev + 1);
        connect();
      }
    }, delay);
  }, [enabled, reconnectAttempts, connect]);

  const disconnect = () => {
    // Clear timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }

    setIsConnected(false);
    onConnectionChange?.(false);
  };

  const sendMessage = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  };

  const markNotificationRead = (notificationId: string) => {
    return sendMessage({
      type: 'mark_notification_read',
      notificationId
    });
  };

  const subscribeToCategories = (categories: string[]) => {
    return sendMessage({
      type: 'subscribe_notifications',
      categories
    });
  };

  const subscribeToHRShifts = (storeIds: string[] = []) => {
    return sendMessage({
      type: 'subscribe_hr_shifts',
      storeIds
    });
  };

  const unsubscribeFromHRShifts = () => {
    return sendMessage({
      type: 'unsubscribe_hr_shifts'
    });
  };

  // Track component mount state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Connect on mount and when enabled/tenantId changes
  useEffect(() => {
    if (enabled && tenantId) {
      // Small delay to debounce rapid mount/unmount cycles
      const timeoutId = setTimeout(() => {
        if (mountedRef.current) {
          connect();
        }
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        disconnect();
      };
    } else {
      disconnect();
    }
    
    return () => disconnect();
  }, [enabled, tenantId, connect]);

  return {
    isConnected,
    reconnectAttempts,
    connect,
    disconnect,
    sendMessage,
    markNotificationRead,
    subscribeToCategories,
    subscribeToHRShifts,
    unsubscribeFromHRShifts
  };
}