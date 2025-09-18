import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Types based on backend schema
export interface HRRequest {
  id: string;
  tenantId: string;
  requesterId: string;
  category: 'leave' | 'schedule' | 'other';
  type: 'vacation' | 'sick' | 'fmla' | 'parental' | 'bereavement' | 'personal' | 'religious' | 'military' | 
        'jury_duty' | 'medical_appt' | 'emergency' | 'shift_swap' | 'time_change' | 'flex_hours' | 'wfh' | 'overtime';
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  priority: 'normal' | 'high' | 'urgent';
  payload?: Record<string, any>;
  attachments?: string[];
  currentApproverId?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HRRequestComment {
  id: string;
  requestId: string;
  authorId: string;
  comment: string;
  isInternal: boolean;
  createdAt: string;
  author?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface HRRequestStatusHistory {
  id: string;
  requestId: string;
  fromStatus?: string;
  toStatus: string;
  reason?: string;
  changedBy: string;
  createdAt: string;
  changer?: {
    firstName: string;
    lastName: string;
  };
}

export interface HRRequestFilters {
  status?: string;
  category?: string;
  type?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'created' | 'updated' | 'priority' | 'startDate';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateHRRequestData {
  category: string;
  type: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  priority?: 'normal' | 'high' | 'urgent';
  payload?: Record<string, any>;
  attachments?: string[];
}

// Hook to get HR requests with filters and pagination
export function useHRRequests(filters?: HRRequestFilters) {
  const params = new URLSearchParams();
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }
  
  const queryString = params.toString();
  const url = queryString ? `/api/hr/requests?${queryString}` : '/api/hr/requests';
  
  return useQuery({
    queryKey: [url],
    // Use default queryFn - no custom queryFn needed
    staleTime: 30000, // 30 seconds
  });
}

// Hook to get a single HR request by ID
export function useHRRequest(id: string) {
  return useQuery({
    queryKey: [`/api/hr/requests/${id}`],
    // Use default queryFn - no custom queryFn needed
    enabled: !!id,
  });
}

// Hook to get HR request comments
export function useHRRequestComments(requestId: string) {
  return useQuery({
    queryKey: [`/api/hr/requests/${requestId}/comments`],
    // Use default queryFn - no custom queryFn needed
    enabled: !!requestId,
  });
}

// Hook to get HR request status history
export function useHRRequestHistory(requestId: string) {
  return useQuery({
    queryKey: [`/api/hr/requests/${requestId}/history`],
    // Use default queryFn - no custom queryFn needed
    enabled: !!requestId,
  });
}

// Hook to create a new HR request
export function useCreateHRRequest() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: CreateHRRequestData) => {
      return await apiRequest('/api/hr/requests', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      // Hierarchical cache invalidation
      queryClient.invalidateQueries({ queryKey: ['/api/hr/requests'] });
      
      toast({
        title: "Richiesta creata",
        description: "La tua richiesta HR è stata creata con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook to add a comment to HR request
export function useAddHRRequestComment() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ requestId, comment, isInternal }: { 
      requestId: string; 
      comment: string; 
      isInternal?: boolean; 
    }) => {
      return await apiRequest(`/api/hr/requests/${requestId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ comment, isInternal }),
      });
    },
    onSuccess: (data, { requestId }) => {
      // Hierarchical cache invalidation
      queryClient.invalidateQueries({ 
        queryKey: [`/api/hr/requests/${requestId}/comments`] 
      });
      // Also invalidate the main request to update comment count
      queryClient.invalidateQueries({ 
        queryKey: [`/api/hr/requests/${requestId}`] 
      });
      
      toast({
        title: "Commento aggiunto",
        description: "Il commento è stato aggiunto alla richiesta",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook to cancel HR request
export function useCancelHRRequest() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason?: string }) => {
      return await apiRequest(`/api/hr/requests/${requestId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: (data, { requestId }) => {
      // Hierarchical cache invalidation
      queryClient.invalidateQueries({ queryKey: ['/api/hr/requests'] });
      queryClient.invalidateQueries({ queryKey: [`/api/hr/requests/${requestId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/hr/requests/${requestId}/history`] });
      
      toast({
        title: "Richiesta annullata",
        description: "La richiesta è stata annullata con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook for infinite scroll/pagination of HR requests
export function useInfiniteHRRequests(filters?: HRRequestFilters) {
  return useInfiniteQuery({
    queryKey: ['/api/hr/requests', 'infinite', filters],
    queryFn: async ({ queryKey, pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: '10',
      });
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '' && key !== 'page') {
            params.append(key, String(value));
          }
        });
      }
      
      // Use the default queryClient fetcher by calling it with the correct queryKey format
      const url = `/api/hr/requests?${params}`;
      return await apiRequest(url);
    },
    getNextPageParam: (lastPage, pages) => {
      const hasMore = lastPage?.requests?.length === 10;
      return hasMore ? pages.length + 1 : undefined;
    },
    initialPageParam: 1,
  });
}

// Constants for request types and categories
export const HR_REQUEST_CATEGORIES = {
  leave: 'Congedi e Permessi',
  schedule: 'Modifiche Orario',
  other: 'Altro'
} as const;

export const HR_REQUEST_TYPES = {
  // Leave types
  vacation: 'Ferie',
  sick: 'Malattia', 
  fmla: 'Congedo FMLA',
  parental: 'Congedo Parentale',
  bereavement: 'Congedo per Lutto',
  personal: 'Permesso Personale',
  religious: 'Permesso Religioso',
  military: 'Congedo Militare',
  
  // Schedule types
  shift_swap: 'Scambio Turno',
  time_change: 'Modifica Orario',
  flex_hours: 'Orario Flessibile',
  wfh: 'Lavoro da Casa',
  overtime: 'Straordinari',
  
  // Other types
  jury_duty: 'Servizio Giuria',
  medical_appt: 'Visita Medica',
  emergency: 'Emergenza'
} as const;

export const HR_REQUEST_STATUS_LABELS = {
  draft: 'Bozza',
  pending: 'In Attesa',
  approved: 'Approvata',
  rejected: 'Rifiutata',
  cancelled: 'Annullata'
} as const;

export const HR_REQUEST_PRIORITY_LABELS = {
  normal: 'Normale',
  high: 'Alta',
  urgent: 'Urgente'
} as const;