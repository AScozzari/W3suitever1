import { useQuery } from '@tanstack/react-query';

// Types for Timeline API responses
export interface TimelineEntry {
  instanceId: string;
  instanceName?: string;
  templateName: string;
  templateCategory: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string | null;
  completedAt?: string | null;
  currentStep?: string;
  assignee?: string;
  referenceId?: string;
  escalationLevel: number;
}

export interface TimelinePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface TimelineData {
  entries: TimelineEntry[];
  pagination: TimelinePagination;
  summary: {
    totalEntries: number;
    activeInstances: number;
    completedToday: number;
  };
}

/**
 * Hook per gestire i dati della timeline workflow
 * Recupera la cronologia delle esecuzioni workflow dal database
 */
export function useWorkflowTimeline(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['/api/workflows/timeline', page, limit],
    queryFn: async (): Promise<TimelineData> => {
      const response = await fetch(`/api/workflows/timeline?page=${page}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`Timeline fetch failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Validate response structure
      if (!data.entries || !Array.isArray(data.entries)) {
        throw new Error('Invalid timeline response format: missing entries array');
      }
      
      return data;
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute for real-time updates
  });
}