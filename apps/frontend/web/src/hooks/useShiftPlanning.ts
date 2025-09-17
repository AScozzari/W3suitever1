import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Shift {
  id: string;
  tenantId: string;
  storeId: string;
  name: string;
  date: string;
  startTime: Date;
  endTime: Date;
  requiredStaff: number;
  assignedUsers: string[];
  shiftType: 'morning' | 'afternoon' | 'night';
  status: 'draft' | 'published' | 'locked';
  breakMinutes?: number;
  skills?: string[];
  notes?: string;
  templateId?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
}

interface ShiftTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  pattern: 'daily' | 'weekly' | 'monthly' | 'custom';
  defaultStartTime: string;
  defaultEndTime: string;
  defaultRequiredStaff: number;
  defaultBreakMinutes?: number;
  defaultSkills?: string[];
  rules?: {
    daysOfWeek?: number[];
    datesOfMonth?: number[];
    customPattern?: string;
  };
  isActive: boolean;
}

interface StaffAvailability {
  userId: string;
  userName: string;
  date: string;
  available: boolean;
  reason?: string;
  currentShifts: number;
}

interface ShiftConflict {
  type: 'double_booking' | 'insufficient_rest' | 'understaffed' | 'leave_conflict';
  userId?: string;
  shiftId?: string;
  shiftIds?: string[];
  message: string;
  severity: 'error' | 'warning';
}

interface CoverageAnalysis {
  date: string;
  hour: number;
  requiredStaff: number;
  scheduledStaff: number;
  coverage: number;
  status: 'understaffed' | 'optimal' | 'overstaffed';
}

// Hook for managing shifts
export function useShifts(storeId: string, startDate: Date, endDate: Date) {
  const { toast } = useToast();
  
  const queryKey = [
    '/api/hr/shifts',
    storeId,
    format(startDate, 'yyyy-MM-dd'),
    format(endDate, 'yyyy-MM-dd')
  ];
  
  const { data: shifts, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        storeId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      const response = await fetch(`/api/hr/shifts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch shifts');
      return response.json();
    },
    enabled: !!storeId
  });
  
  const createShiftMutation = useMutation({
    mutationFn: async (data: Partial<Shift>) => {
      return apiRequest('/api/hr/shifts', {
        method: 'POST',
        body: JSON.stringify({ ...data, storeId })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts'] });
      toast({ title: 'Turno creato con successo' });
    },
    onError: (error) => {
      toast({ 
        title: 'Errore nella creazione del turno',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  const updateShiftMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Shift> }) => {
      return apiRequest(`/api/hr/shifts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts'] });
      toast({ title: 'Turno aggiornato' });
    },
    onError: (error) => {
      toast({ 
        title: 'Errore nell\'aggiornamento',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  const deleteShiftMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/hr/shifts/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts'] });
      toast({ title: 'Turno eliminato' });
    }
  });
  
  const assignUserMutation = useMutation({
    mutationFn: async ({ shiftId, userId }: { shiftId: string; userId: string }) => {
      return apiRequest(`/api/hr/shifts/${shiftId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ userId })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts'] });
    }
  });
  
  const unassignUserMutation = useMutation({
    mutationFn: async ({ shiftId, userId }: { shiftId: string; userId: string }) => {
      return apiRequest(`/api/hr/shifts/${shiftId}/unassign`, {
        method: 'POST',
        body: JSON.stringify({ userId })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts'] });
    }
  });
  
  const bulkCreateShiftsMutation = useMutation({
    mutationFn: async (shiftsData: Partial<Shift>[]) => {
      return apiRequest('/api/hr/shifts/bulk', {
        method: 'POST',
        body: JSON.stringify({ shifts: shiftsData })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts'] });
      toast({ title: 'Turni creati con successo' });
    }
  });
  
  return {
    shifts: shifts || [],
    isLoading,
    error,
    createShift: createShiftMutation.mutate,
    updateShift: (id: string, data: Partial<Shift>) => updateShiftMutation.mutate({ id, data }),
    deleteShift: deleteShiftMutation.mutate,
    assignUser: (shiftId: string, userId: string) => assignUserMutation.mutate({ shiftId, userId }),
    unassignUser: (shiftId: string, userId: string) => unassignUserMutation.mutate({ shiftId, userId }),
    bulkCreateShifts: bulkCreateShiftsMutation.mutate
  };
}

// Hook for managing shift templates
export function useShiftTemplates() {
  const { toast } = useToast();
  
  const { data: templates, isLoading } = useQuery({
    queryKey: ['/api/hr/shift-templates'],
    queryFn: async () => {
      const response = await fetch('/api/hr/shift-templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    }
  });
  
  const createTemplateMutation = useMutation({
    mutationFn: async (data: Partial<ShiftTemplate>) => {
      return apiRequest('/api/hr/shift-templates', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shift-templates'] });
      toast({ title: 'Template creato' });
    }
  });
  
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ShiftTemplate> }) => {
      return apiRequest(`/api/hr/shift-templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shift-templates'] });
      toast({ title: 'Template aggiornato' });
    }
  });
  
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/hr/shift-templates/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shift-templates'] });
      toast({ title: 'Template eliminato' });
    }
  });
  
  const applyTemplateMutation = useMutation({
    mutationFn: async ({ 
      templateId, 
      storeId, 
      startDate, 
      endDate 
    }: { 
      templateId: string; 
      storeId: string; 
      startDate: Date; 
      endDate: Date;
    }) => {
      return apiRequest('/api/hr/shifts/apply-template', {
        method: 'POST',
        body: JSON.stringify({
          templateId,
          storeId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts'] });
      toast({ title: 'Template applicato con successo' });
    },
    onError: (error) => {
      toast({ 
        title: 'Errore nell\'applicazione del template',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  return {
    templates: templates || [],
    isLoading,
    createTemplate: createTemplateMutation.mutate,
    updateTemplate: (id: string, data: Partial<ShiftTemplate>) => 
      updateTemplateMutation.mutate({ id, data }),
    deleteTemplate: deleteTemplateMutation.mutate,
    applyTemplate: (templateId: string, storeId: string, startDate: Date, endDate: Date) =>
      applyTemplateMutation.mutate({ templateId, storeId, startDate, endDate })
  };
}

// Hook for staff availability
export function useStaffAvailability(storeId: string, startDate: Date, endDate: Date) {
  const queryKey = [
    '/api/hr/shifts/staff-availability',
    storeId,
    format(startDate, 'yyyy-MM-dd'),
    format(endDate, 'yyyy-MM-dd')
  ];
  
  const { data: availability, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        storeId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      const response = await fetch(`/api/hr/shifts/staff-availability?${params}`);
      if (!response.ok) throw new Error('Failed to fetch availability');
      return response.json();
    },
    enabled: !!storeId
  });
  
  return {
    availability: availability || [],
    isLoading
  };
}

// Hook for conflict detection
export function useShiftConflicts(storeId: string, userId?: string) {
  const queryKey = ['/api/hr/shifts/conflicts', storeId, userId];
  
  const { data: conflicts, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ storeId });
      if (userId) params.append('userId', userId);
      
      const response = await fetch(`/api/hr/shifts/conflicts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch conflicts');
      return response.json();
    },
    enabled: !!storeId,
    refetchInterval: 30000 // Refresh every 30 seconds
  });
  
  return {
    conflicts: conflicts || [],
    isLoading,
    hasConflicts: (conflicts?.length || 0) > 0,
    errorCount: conflicts?.filter((c: ShiftConflict) => c.severity === 'error').length || 0,
    warningCount: conflicts?.filter((c: ShiftConflict) => c.severity === 'warning').length || 0
  };
}

// Hook for coverage analysis
export function useCoverageAnalysis(storeId: string, startDate: Date, endDate: Date) {
  const queryKey = [
    '/api/hr/shifts/coverage-analysis',
    storeId,
    format(startDate, 'yyyy-MM-dd'),
    format(endDate, 'yyyy-MM-dd')
  ];
  
  const { data: analysis, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        storeId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      const response = await fetch(`/api/hr/shifts/coverage-analysis?${params}`);
      if (!response.ok) throw new Error('Failed to fetch coverage analysis');
      return response.json();
    },
    enabled: !!storeId
  });
  
  const avgCoverage = analysis?.reduce((sum: number, item: CoverageAnalysis) => 
    sum + item.coverage, 0) / (analysis?.length || 1);
  
  const understaffedHours = analysis?.filter((item: CoverageAnalysis) => 
    item.status === 'understaffed').length || 0;
  
  return {
    analysis: analysis || [],
    isLoading,
    avgCoverage: Math.round(avgCoverage || 100),
    understaffedHours,
    criticalHours: analysis?.filter((item: CoverageAnalysis) => 
      item.coverage < 60).length || 0
  };
}

// Hook for auto-scheduling
export function useAutoSchedule() {
  const { toast } = useToast();
  
  const autoScheduleMutation = useMutation({
    mutationFn: async ({
      storeId,
      startDate,
      endDate,
      constraints
    }: {
      storeId: string;
      startDate: Date;
      endDate: Date;
      constraints?: any;
    }) => {
      return apiRequest('/api/hr/shifts/auto-schedule', {
        method: 'POST',
        body: JSON.stringify({
          storeId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          constraints
        })
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts'] });
      toast({ 
        title: 'Auto-scheduling completato',
        description: `${data.shifts.length} turni ottimizzati`
      });
    },
    onError: (error) => {
      toast({ 
        title: 'Auto-scheduling fallito',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  return {
    autoSchedule: autoScheduleMutation.mutate,
    isScheduling: autoScheduleMutation.isPending
  };
}

// Hook for shift statistics
export function useShiftStats(storeId: string, startDate: Date, endDate: Date) {
  const queryKey = [
    '/api/hr/shifts/stats',
    storeId,
    format(startDate, 'yyyy-MM-dd'),
    format(endDate, 'yyyy-MM-dd')
  ];
  
  const { data: stats, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        storeId,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd')
      });
      const response = await fetch(`/api/hr/shifts/stats?${params}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: !!storeId
  });
  
  return {
    stats: stats || {
      totalShifts: 0,
      totalHours: 0,
      averageStaffPerShift: 0,
      coverageRate: 100,
      overtimeHours: 0
    },
    isLoading
  };
}