import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

export interface ReadReceipt {
  userId: string;
  readAt: string;
}

export interface PinnedMessage {
  pinnedAt: string;
  pinnedByUserId: string;
  message: {
    id: string;
    content: string;
    userId: string;
    createdAt: string;
  };
}

export interface SavedReply {
  id: string;
  title: string;
  content: string;
  shortcut?: string;
  isPersonal: boolean;
  teamId?: string;
  usageCount: number;
}

export function useReadReceipts(messageId: string) {
  return useQuery<ReadReceipt[]>({
    queryKey: ['/api/chat/messages', messageId, 'read-receipts'],
    queryFn: async () => {
      try {
        const res = await apiRequest(`/api/chat/messages/${messageId}/read-receipts`, { method: 'GET' });
        return res as ReadReceipt[];
      } catch {
        return [];
      }
    },
    enabled: !!messageId,
    staleTime: 30000
  });
}

export function useMarkMessageAsRead(channelId: string) {
  return useMutation({
    mutationFn: (messageId: string) =>
      apiRequest(`/api/chat/messages/${messageId}/read`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/channels'] });
    }
  });
}

export function useMarkChannelAsRead() {
  return useMutation({
    mutationFn: (channelId: string) =>
      apiRequest(`/api/chat/channels/${channelId}/read-all`, { method: 'POST' }),
    onSuccess: (_, channelId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/channels'] });
      queryClient.invalidateQueries({ queryKey: [`/api/chat/channels/${channelId}/messages`] });
    }
  });
}

export function usePinnedMessages(channelId: string) {
  return useQuery<PinnedMessage[]>({
    queryKey: ['/api/chat/channels', channelId, 'pinned'],
    queryFn: async () => {
      try {
        const res = await apiRequest(`/api/chat/channels/${channelId}/pinned`, { method: 'GET' });
        return res as PinnedMessage[];
      } catch {
        return [];
      }
    },
    enabled: !!channelId,
    staleTime: 30000
  });
}

export function usePinMessage(channelId: string) {
  return useMutation({
    mutationFn: (messageId: string) =>
      apiRequest(`/api/chat/channels/${channelId}/pin/${messageId}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/channels', channelId, 'pinned'] });
    }
  });
}

export function useUnpinMessage(channelId: string) {
  return useMutation({
    mutationFn: (messageId: string) =>
      apiRequest(`/api/chat/channels/${channelId}/pin/${messageId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/channels', channelId, 'pinned'] });
    }
  });
}

export function useSavedReplies() {
  return useQuery<SavedReply[]>({
    queryKey: ['/api/chat/saved-replies'],
    staleTime: 60000
  });
}

export function useCreateSavedReply() {
  return useMutation({
    mutationFn: (data: { title: string; content: string; shortcut?: string }) =>
      apiRequest('/api/chat/saved-replies', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/saved-replies'] });
    }
  });
}

export function useDeleteSavedReply() {
  return useMutation({
    mutationFn: (replyId: string) =>
      apiRequest(`/api/chat/saved-replies/${replyId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/saved-replies'] });
    }
  });
}

export function useIncrementSavedReplyUsage() {
  return useMutation({
    mutationFn: (replyId: string) =>
      apiRequest(`/api/chat/saved-replies/${replyId}/use`, { method: 'POST' })
  });
}

export function useSearchMessages(query: string, filters?: {
  channelId?: string;
  fromUserId?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const params = new URLSearchParams({ q: query });
  if (filters?.channelId) params.set('channelId', filters.channelId);
  if (filters?.fromUserId) params.set('fromUserId', filters.fromUserId);
  if (filters?.fromDate) params.set('fromDate', filters.fromDate);
  if (filters?.toDate) params.set('toDate', filters.toDate);

  return useQuery({
    queryKey: ['/api/chat/search', query, filters],
    queryFn: async () => {
      try {
        const res = await apiRequest(`/api/chat/search?${params.toString()}`, { method: 'GET' });
        return res;
      } catch {
        return [];
      }
    },
    enabled: query.length >= 2,
    staleTime: 30000
  });
}

export function useEditMessage(channelId: string) {
  return useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) =>
      apiRequest(`/api/chat/messages/${messageId}`, {
        method: 'PUT',
        body: JSON.stringify({ content })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/channels/${channelId}/messages`] });
    }
  });
}

export function useDeleteMessage(channelId: string) {
  return useMutation({
    mutationFn: (messageId: string) =>
      apiRequest(`/api/chat/messages/${messageId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/channels/${channelId}/messages`] });
    }
  });
}

export type ReadStatus = 'sent' | 'delivered' | 'read';

export function getReadStatus(
  message: { userId: string; createdAt: string },
  currentUserId: string,
  readReceipts: ReadReceipt[],
  totalMembers: number
): ReadStatus {
  if (message.userId !== currentUserId) return 'read';
  
  if (readReceipts.length === 0) return 'sent';
  
  const othersRead = readReceipts.filter(r => r.userId !== currentUserId);
  if (othersRead.length >= totalMembers - 1) return 'read';
  if (othersRead.length > 0) return 'delivered';
  
  return 'sent';
}
