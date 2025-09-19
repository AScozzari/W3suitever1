import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Types based on backend schema
export interface HRRequest {
  id: string;
  tenantId: string;
  requesterId: string;
  category: 'leave' | 'schedule' | 'other' | 'italian_legal' | 'family' | 'professional_development' | 
           'wellness_health' | 'remote_work' | 'technology_support';
  type: 'vacation' | 'sick' | 'fmla' | 'parental' | 'bereavement' | 'personal' | 'religious' | 'military' | 
        'jury_duty' | 'medical_appt' | 'emergency' | 'shift_swap' | 'time_change' | 'flex_hours' | 'wfh' | 'overtime' |
        // Italian-Specific Request Types
        'marriage_leave' | 'maternity_leave' | 'paternity_leave' | 'parental_leave' | 'breastfeeding_leave' |
        'law_104_leave' | 'study_leave' | 'rol_leave' | 'electoral_leave' | 'bereavement_extended' |
        // Modern 2024 Request Types
        'remote_work_request' | 'equipment_request' | 'training_request' | 'certification_request' |
        'sabbatical_request' | 'sabbatical_unpaid' | 'wellness_program' | 'mental_health_support' |
        'gym_membership' | 'financial_counseling' | 'pet_insurance' | 'ergonomic_assessment' |
        'vpn_access' | 'internet_stipend' | 'mobile_allowance' | 'conference_attendance' |
        'mentorship_request' | 'skill_assessment' | 'career_development' | 'experience_rewards' |
        'volunteer_leave' | 'donation_leave';
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
  italian_legal: 'Permessi Italiani',
  family: 'Congedi Familiari',
  professional_development: 'Sviluppo Professionale',
  wellness_health: 'Benessere e Salute',
  remote_work: 'Lavoro Remoto',
  technology_support: 'Supporto Tecnologico',
  leave: 'Congedi Standard',
  schedule: 'Modifiche Orario',
  other: 'Altre Richieste'
} as const;

export const HR_REQUEST_TYPES = {
  // Original types
  vacation: 'Ferie',
  sick: 'Malattia', 
  fmla: 'Congedo FMLA',
  parental: 'Congedo Parentale',
  bereavement: 'Congedo per Lutto',
  personal: 'Permesso Personale',
  religious: 'Permesso Religioso',
  military: 'Congedo Militare',
  shift_swap: 'Scambio Turno',
  time_change: 'Modifica Orario',
  flex_hours: 'Orario Flessibile',
  wfh: 'Lavoro da Casa',
  overtime: 'Straordinari',
  jury_duty: 'Servizio Giuria',
  medical_appt: 'Visita Medica',
  emergency: 'Emergenza',
  
  // Italian-Specific Request Types
  marriage_leave: 'Congedo Matrimoniale',
  maternity_leave: 'Congedo Maternità',
  paternity_leave: 'Congedo Paternità',
  parental_leave: 'Congedo Parentale',
  breastfeeding_leave: 'Permessi Allattamento',
  law_104_leave: 'Legge 104 - Assistenza Disabili',
  study_leave: 'Diritto allo Studio',
  rol_leave: 'ROL - Riposi Obbligatori Lavorativi',
  electoral_leave: 'Permessi Elettorali',
  bereavement_extended: 'Lutto Familiare Esteso',
  
  // Modern 2024 Request Types
  remote_work_request: 'Richiesta Lavoro Remoto',
  equipment_request: 'Richiesta Attrezzature',
  training_request: 'Richiesta Formazione',
  certification_request: 'Richiesta Certificazioni',
  sabbatical_request: 'Periodo Sabbatico',
  sabbatical_unpaid: 'Congedo Sabbatico Non Retribuito',
  wellness_program: 'Programmi Benessere',
  mental_health_support: 'Supporto Salute Mentale',
  gym_membership: 'Rimborso Palestra',
  financial_counseling: 'Consulenza Finanziaria',
  pet_insurance: 'Assicurazione Animali',
  ergonomic_assessment: 'Valutazione Ergonomica',
  vpn_access: 'Accesso VPN',
  internet_stipend: 'Rimborso Internet',
  mobile_allowance: 'Allowance Dispositivo Mobile',
  conference_attendance: 'Partecipazione Conferenze',
  mentorship_request: 'Programmi Mentorship',
  skill_assessment: 'Valutazione Competenze',
  career_development: 'Sviluppo Carriera',
  experience_rewards: 'Premi Esperienziali',
  volunteer_leave: 'Permessi Volontariato',
  donation_leave: 'Permessi Donazione'
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

// =============================================================================
// MANAGER-SPECIFIC HOOKS
// =============================================================================

export interface ManagerFilters extends HRRequestFilters {
  manager?: boolean;
  teamOnly?: boolean;
  employeeId?: string;
  urgent?: boolean;
  longPending?: boolean;
}

export interface ApproveRequestData {
  requestId: string;
  comment?: string;
  nextApproverId?: string;
}

export interface RejectRequestData {
  requestId: string;
  reason: string;
  comment?: string;
}

export interface BulkApprovalData {
  requestIds: string[];
  comment?: string;
}

export interface BulkRejectionData {
  requestIds: string[];
  reason: string;
  comment?: string;
}

export interface ManagerDashboardStats {
  totalPending: number;
  urgentRequests: number;
  approvedToday: number;
  rejectedToday: number;
  avgResponseTime: number;
  teamRequestsCount: number;
}

// Hook to get manager's team HR requests
export function useManagerHRRequests(filters?: ManagerFilters) {
  const params = new URLSearchParams();
  
  // Add manager=true to get team requests
  params.append('manager', 'true');
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }
  
  const queryString = params.toString();
  const url = `/api/hr/requests?${queryString}`;
  
  return useQuery({
    queryKey: [url],
    staleTime: 30000, // 30 seconds
  });
}

// Hook to get manager's pending approval queue
export function useManagerApprovalQueue(filters?: ManagerFilters) {
  const queueFilters = {
    ...filters,
    manager: true,
    status: 'pending'
  };
  
  return useManagerHRRequests(queueFilters);
}

// Hook to get manager dashboard statistics
export function useManagerDashboardStats() {
  return useQuery({
    queryKey: ['/api/hr/requests/manager/stats'],
    staleTime: 60000, // 1 minute
  });
}

// Hook to approve HR request
export function useApproveHRRequest() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ requestId, comment, nextApproverId }: ApproveRequestData) => {
      return await apiRequest(`/api/hr/requests/${requestId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ comment, nextApproverId }),
      });
    },
    onSuccess: (data, { requestId }) => {
      // Hierarchical cache invalidation
      queryClient.invalidateQueries({ queryKey: ['/api/hr/requests'] });
      queryClient.invalidateQueries({ queryKey: [`/api/hr/requests/${requestId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/hr/requests/${requestId}/history`] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/requests/manager/stats'] });
      
      toast({
        title: "Richiesta approvata",
        description: "La richiesta è stata approvata con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore di approvazione",
        description: error.message || "Impossibile approvare la richiesta",
        variant: "destructive",
      });
    },
  });
}

// Hook to reject HR request
export function useRejectHRRequest() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ requestId, reason, comment }: RejectRequestData) => {
      return await apiRequest(`/api/hr/requests/${requestId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason, comment }),
      });
    },
    onSuccess: (data, { requestId }) => {
      // Hierarchical cache invalidation
      queryClient.invalidateQueries({ queryKey: ['/api/hr/requests'] });
      queryClient.invalidateQueries({ queryKey: [`/api/hr/requests/${requestId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/hr/requests/${requestId}/history`] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/requests/manager/stats'] });
      
      toast({
        title: "Richiesta rifiutata",
        description: "La richiesta è stata rifiutata",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore di rifiuto",
        description: error.message || "Impossibile rifiutare la richiesta",
        variant: "destructive",
      });
    },
  });
}

// Hook for bulk approval
export function useBulkApproveHRRequests() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ requestIds, comment }: BulkApprovalData) => {
      return await apiRequest('/api/hr/requests/bulk/approve', {
        method: 'POST',
        body: JSON.stringify({ requestIds, comment }),
      });
    },
    onSuccess: (data, { requestIds }) => {
      // Hierarchical cache invalidation
      queryClient.invalidateQueries({ queryKey: ['/api/hr/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/requests/manager/stats'] });
      
      // Invalidate individual requests
      requestIds.forEach(requestId => {
        queryClient.invalidateQueries({ queryKey: [`/api/hr/requests/${requestId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/hr/requests/${requestId}/history`] });
      });
      
      toast({
        title: "Richieste approvate",
        description: `${requestIds.length} richieste sono state approvate con successo`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore di approvazione multipla",
        description: error.message || "Impossibile approvare le richieste selezionate",
        variant: "destructive",
      });
    },
  });
}

// Hook for bulk rejection
export function useBulkRejectHRRequests() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ requestIds, reason, comment }: BulkRejectionData) => {
      return await apiRequest('/api/hr/requests/bulk/reject', {
        method: 'POST',
        body: JSON.stringify({ requestIds, reason, comment }),
      });
    },
    onSuccess: (data, { requestIds }) => {
      // Hierarchical cache invalidation
      queryClient.invalidateQueries({ queryKey: ['/api/hr/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/requests/manager/stats'] });
      
      // Invalidate individual requests
      requestIds.forEach(requestId => {
        queryClient.invalidateQueries({ queryKey: [`/api/hr/requests/${requestId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/hr/requests/${requestId}/history`] });
      });
      
      toast({
        title: "Richieste rifiutate",
        description: `${requestIds.length} richieste sono state rifiutate`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore di rifiuto multiplo",
        description: error.message || "Impossibile rifiutare le richieste selezionate",
        variant: "destructive",
      });
    },
  });
}

// Hook for manager's team members
export function useManagerTeamMembers() {
  return useQuery({
    queryKey: ['/api/hr/manager/team-members'],
    staleTime: 300000, // 5 minutes
  });
}

// Hook to get manager's approval history
export function useManagerApprovalHistory(filters?: { startDate?: string; endDate?: string; limit?: number }) {
  const params = new URLSearchParams();
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }
  
  const queryString = params.toString();
  const url = queryString ? `/api/hr/requests/manager/history?${queryString}` : '/api/hr/requests/manager/history';
  
  return useQuery({
    queryKey: [url],
    staleTime: 60000, // 1 minute
  });
}