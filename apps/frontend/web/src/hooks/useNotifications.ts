import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface Notification {
  id: string;
  tenantId: string;
  targetUserId: string;
  type: 'hr_request' | 'system' | 'custom';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  url?: string;
  status: 'read' | 'unread';
  data: Record<string, any>;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreference {
  id: string;
  tenantId: string;
  userId: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  minPriorityInApp: 'low' | 'medium' | 'high' | 'critical';
  minPriorityEmail: 'low' | 'medium' | 'high' | 'critical';
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  dailyDigestEnabled: boolean;
  weeklyDigestEnabled: boolean;
  digestDeliveryTime: string;
  categoryPreferences: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Hook for fetching user notifications
export function useNotifications(filters?: {
  status?: 'read' | 'unread';
  type?: string;
  priority?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['/api/notifications', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.priority) params.append('priority', filters.priority);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const url = `/api/notifications${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'X-Tenant-ID': localStorage.getItem('currentTenantId') || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      return response.json() as Promise<Notification[]>;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Hook for fetching unread notification count
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['/api/notifications/unread-count'],
    queryFn: async () => {
      const response = await fetch('/api/notifications/unread-count', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'X-Tenant-ID': localStorage.getItem('currentTenantId') || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch unread count');
      }

      const data = await response.json();
      return data.count as number;
    },
    refetchInterval: 15000, // Refetch every 15 seconds for real-time updates
  });
}

// Hook for marking notification as read
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      // Invalidate and refetch notification queries
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });
}

// Hook for marking all notifications as read
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiRequest('/api/notifications/mark-all-read', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      // Invalidate and refetch notification queries
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });
}

// Hook for fetching notification preferences
export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['/api/notification-preferences'],
    queryFn: async () => {
      const response = await fetch('/api/notification-preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'X-Tenant-ID': localStorage.getItem('currentTenantId') || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notification preferences');
      }

      return response.json() as Promise<NotificationPreference>;
    },
  });
}

// Hook for updating notification preferences
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: Partial<NotificationPreference>) => {
      return await apiRequest('/api/notification-preferences', {
        method: 'PATCH',
        body: JSON.stringify(preferences),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notification-preferences'] });
    },
  });
}