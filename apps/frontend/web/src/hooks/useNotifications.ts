import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Notification, QueryResult } from '@/types';

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
}): QueryResult<Notification[]> {
  const queryParams = { 
    status: filters?.status, 
    type: filters?.type, 
    priority: filters?.priority, 
    limit: filters?.limit, 
    offset: filters?.offset 
  };
  
  return useQuery<Notification[]>({
    queryKey: ['/api/notifications', queryParams],
    // Use default queryFn from queryClient - no custom queryFn needed
    refetchInterval: 30000, // Refetch every 30 seconds
  }) as QueryResult<Notification[]>;
}

// Hook for fetching unread notification count
export function useUnreadNotificationCount(): QueryResult<{count: number}> {
  return useQuery<{count: number}>({
    queryKey: ['/api/notifications/unread-count'],
    // Use default queryFn from queryClient - no custom queryFn needed
    refetchInterval: 15000, // Refetch every 15 seconds for real-time updates
  }) as QueryResult<{count: number}>;
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
    // Use default queryFn from queryClient - no custom queryFn needed
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