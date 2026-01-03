import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useIdleDetection } from '@/contexts/IdleDetectionContext';

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

export interface UserPresence {
  userId: string;
  tenantId: string;
  status: PresenceStatus;
  lastSeenAt: string;
  lastHeartbeatAt: string;
  customStatus?: string;
  customStatusEmoji?: string;
  customStatusExpiresAt?: string;
}

const HEARTBEAT_INTERVAL = 30000;
const PRESENCE_STALE_TIME = 60000;

export function useChatPresence() {
  const { isIdle } = useIdleDetection();

  const heartbeatMutation = useMutation({
    mutationFn: () => apiRequest('/api/chat/presence/heartbeat', { method: 'POST' })
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: PresenceStatus) => 
      apiRequest('/api/chat/presence/status', { 
        method: 'PUT',
        body: JSON.stringify({ status })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/presence'] });
    }
  });

  const setCustomStatusMutation = useMutation({
    mutationFn: (data: { customStatus: string; emoji?: string; expiresAt?: string }) =>
      apiRequest('/api/chat/presence/custom-status', {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/presence'] });
    }
  });

  useEffect(() => {
    if (isIdle) {
      updateStatusMutation.mutate('away');
      return;
    }

    heartbeatMutation.mutate();
    const interval = setInterval(() => {
      heartbeatMutation.mutate();
    }, HEARTBEAT_INTERVAL);

    return () => clearInterval(interval);
  }, [isIdle]);

  return {
    updateStatus: updateStatusMutation.mutate,
    setCustomStatus: setCustomStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending
  };
}

export function useUserPresence(userId: string) {
  return useQuery<UserPresence | { status: 'offline' }>({
    queryKey: ['/api/chat/presence', userId],
    queryFn: async () => {
      try {
        const res = await apiRequest(`/api/chat/presence/${userId}`, { method: 'GET' });
        return res as UserPresence;
      } catch {
        return { status: 'offline' as const };
      }
    },
    enabled: !!userId,
    staleTime: PRESENCE_STALE_TIME,
    refetchInterval: PRESENCE_STALE_TIME
  });
}

export function useMultipleUserPresence(userIds: string[]) {
  return useQuery<UserPresence[]>({
    queryKey: ['/api/chat/presence/bulk', userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const res = await apiRequest('/api/chat/presence/bulk', {
        method: 'POST',
        body: JSON.stringify({ userIds })
      });
      return res as UserPresence[];
    },
    enabled: userIds.length > 0,
    staleTime: PRESENCE_STALE_TIME,
    refetchInterval: PRESENCE_STALE_TIME
  });
}

export function getPresenceColor(status: PresenceStatus): string {
  switch (status) {
    case 'online': return '#10b981';
    case 'away': return '#f59e0b';
    case 'busy': return '#ef4444';
    case 'offline': return '#9ca3af';
    default: return '#9ca3af';
  }
}

export function getPresenceLabel(status: PresenceStatus): string {
  switch (status) {
    case 'online': return 'Online';
    case 'away': return 'Assente';
    case 'busy': return 'Occupato';
    case 'offline': return 'Offline';
    default: return 'Offline';
  }
}
