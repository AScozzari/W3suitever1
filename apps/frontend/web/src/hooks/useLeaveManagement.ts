// Leave Management Hook - Custom hooks for leave operations
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { leaveService, LeaveRequest, LeaveBalance, LeavePolicies, TeamCalendarEvent, LeaveStatistics } from '@/services/leaveService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect, useMemo } from 'react';

// Hook for leave balance
export function useLeaveBalance(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || (user && typeof user === 'object' && 'id' in user ? (user as any).id : undefined);
  
  return useQuery({
    queryKey: ['/api/hr/leave/balance', targetUserId],
    queryFn: () => leaveService.getBalance(targetUserId!),
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

// Hook for leave requests
export function useLeaveRequests(filters?: {
  userId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  leaveType?: string;
  storeId?: string;
}) {
  const [localFilters, setLocalFilters] = useState(filters);
  
  const query = useQuery({
    queryKey: ['/api/hr/leave/requests', localFilters],
    queryFn: () => leaveService.getRequests(localFilters)
  });
  
  return {
    ...query,
    filters: localFilters,
    setFilters: setLocalFilters
  };
}

// Hook for single leave request
export function useLeaveRequest(id: string) {
  return useQuery({
    queryKey: ['/api/hr/leave/requests', id],
    queryFn: () => leaveService.getRequestById(id),
    enabled: !!id
  });
}

// Hook for creating leave request
export function useCreateLeaveRequest() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (request: Partial<LeaveRequest>) => leaveService.createRequest(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/leave/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/leave/balance'] });
      toast({
        title: "Richiesta creata",
        description: "La richiesta di ferie è stata creata con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile creare la richiesta",
        variant: "destructive",
      });
    }
  });
}

// Hook for updating leave request
export function useUpdateLeaveRequest() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<LeaveRequest> }) => 
      leaveService.updateRequest(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/leave/requests'] });
      toast({
        title: "Richiesta aggiornata",
        description: "La richiesta è stata aggiornata con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiornare la richiesta",
        variant: "destructive",
      });
    }
  });
}

// Hook for deleting leave request
export function useDeleteLeaveRequest() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (id: string) => leaveService.deleteRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/leave/requests'] });
      toast({
        title: "Richiesta eliminata",
        description: "La richiesta è stata eliminata con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile eliminare la richiesta",
        variant: "destructive",
      });
    }
  });
}

// Hook for approving leave request
export function useApproveLeaveRequest() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ id, comments }: { id: string; comments?: string }) => 
      leaveService.approveRequest(id, comments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/leave/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/leave/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar'] });
      toast({
        title: "Richiesta approvata",
        description: "La richiesta è stata approvata con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile approvare la richiesta",
        variant: "destructive",
      });
    }
  });
}

// Hook for rejecting leave request
export function useRejectLeaveRequest() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      leaveService.rejectRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/leave/requests'] });
      toast({
        title: "Richiesta rifiutata",
        description: "La richiesta è stata rifiutata",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile rifiutare la richiesta",
        variant: "destructive",
      });
    }
  });
}

// Hook for leave policies
export function useLeavePolicies() {
  return useQuery({
    queryKey: ['/api/hr/leave/policies'],
    queryFn: () => leaveService.getPolicies(),
    staleTime: 10 * 60 * 1000 // 10 minutes
  });
}

// Hook for updating leave policies
export function useUpdateLeavePolicies() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (policies: Partial<LeavePolicies>) => leaveService.updatePolicies(policies),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/leave/policies'] });
      toast({
        title: "Policy aggiornate",
        description: "Le policy ferie sono state aggiornate con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiornare le policy",
        variant: "destructive",
      });
    }
  });
}

// Hook for team calendar
export function useTeamCalendar(filters?: {
  startDate?: string;
  endDate?: string;
  storeId?: string;
  teamId?: string;
}) {
  const [localFilters, setLocalFilters] = useState(filters);
  
  const query = useQuery({
    queryKey: ['/api/hr/leave/team-calendar', localFilters],
    queryFn: () => leaveService.getTeamCalendar(localFilters)
  });
  
  return {
    ...query,
    filters: localFilters,
    setFilters: setLocalFilters
  };
}

// Hook for approval queue
export function useApprovalQueue() {
  const { user } = useAuth() as { user: any };
  
  const { data: requests = [], ...query } = useQuery({
    queryKey: ['/api/hr/leave/requests', { status: 'pending' }],
    queryFn: () => leaveService.getRequests({ status: 'pending' }),
    enabled: !!user && (user.role === 'TEAM_LEADER' || user.role === 'HR_MANAGER' || user.role === 'ADMIN')
  });
  
  const pendingCount = requests.length;
  const urgentCount = requests.filter(r => {
    const daysAgo = Math.floor((Date.now() - new Date(r.submittedAt || r.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return daysAgo > 2; // Urgent if pending more than 2 days
  }).length;
  
  return {
    requests,
    pendingCount,
    urgentCount,
    ...query
  };
}

// Hook for holidays
export function useHolidays() {
  const { data: policies } = useLeavePolicies();
  
  return useMemo(() => {
    if (!policies) return [];
    
    return policies.publicHolidays.map(date => {
      const d = new Date(date);
      return {
        date,
        name: getHolidayName(d),
        dayOfWeek: d.toLocaleDateString('it-IT', { weekday: 'long' })
      };
    });
  }, [policies]);
}

// Helper function to get Italian holiday names
function getHolidayName(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  const holidays: { [key: string]: string } = {
    '1-1': 'Capodanno',
    '1-6': 'Epifania',
    '4-21': 'Pasqua',
    '4-25': 'Festa della Liberazione',
    '5-1': 'Festa dei Lavoratori',
    '6-2': 'Festa della Repubblica',
    '8-15': 'Ferragosto',
    '11-1': 'Ognissanti',
    '12-8': 'Immacolata Concezione',
    '12-25': 'Natale',
    '12-26': 'Santo Stefano'
  };
  
  return holidays[`${month}-${day}`] || 'Festività';
}

// Hook for leave statistics
export function useLeaveStatistics(filters?: {
  startDate?: string;
  endDate?: string;
  storeId?: string;
}) {
  return useQuery({
    queryKey: ['/api/hr/leave/statistics', filters],
    queryFn: () => leaveService.getStatistics(filters),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

// Hook for leave validation
export function useLeaveValidation() {
  const { data: balance } = useLeaveBalance();
  const { data: policies } = useLeavePolicies();
  
  const validateRequest = (request: Partial<LeaveRequest>) => {
    if (!balance || !policies) {
      return { valid: false, errors: ['Dati non disponibili'] };
    }
    
    return leaveService.validateRequest(request, balance, policies);
  };
  
  const calculateBusinessDays = (startDate: Date, endDate: Date) => {
    if (!policies) return 0;
    return leaveService.calculateBusinessDays(startDate, endDate, policies.publicHolidays);
  };
  
  return {
    validateRequest,
    calculateBusinessDays,
    isLoading: !balance || !policies
  };
}

// Hook for team coverage analysis
export function useTeamCoverage(storeId?: string) {
  const { data: calendar } = useTeamCalendar({ storeId });
  
  const getCoverageForDate = (date: Date) => {
    if (!calendar) return { count: 0, users: [] };
    
    const dateStr = date.toISOString().split('T')[0];
    const absent = calendar.filter(event => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const checkDate = new Date(dateStr);
      return start <= checkDate && end >= checkDate;
    });
    
    return {
      count: absent.length,
      users: absent.map(e => ({ id: e.userId, name: e.userName, type: e.leaveType }))
    };
  };
  
  const getConflicts = (startDate: Date, endDate: Date) => {
    const conflicts: Array<{ date: string; count: number }> = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const coverage = getCoverageForDate(current);
      if (coverage.count > 2) { // Max 2 people absent
        conflicts.push({
          date: current.toISOString().split('T')[0],
          count: coverage.count
        });
      }
      current.setDate(current.getDate() + 1);
    }
    
    return conflicts;
  };
  
  return {
    calendar,
    getCoverageForDate,
    getConflicts
  };
}