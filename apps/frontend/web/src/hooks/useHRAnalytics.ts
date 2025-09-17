// HR Analytics Hooks - Enterprise Analytics Data Management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrAnalyticsService } from '@/services/hrAnalyticsService';
import { toast } from './use-toast';

// Dashboard Metrics Hook
export function useDashboardMetrics(period: string = 'month', filters?: any) {
  return useQuery({
    queryKey: ['hr-analytics', 'dashboard', period, filters],
    queryFn: () => hrAnalyticsService.getDashboardMetrics(period, filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Refresh every 5 minutes
  });
}

// Attendance Analytics Hook
export function useAttendanceAnalytics(period: string = 'month', storeId?: string) {
  return useQuery({
    queryKey: ['hr-analytics', 'attendance', period, storeId],
    queryFn: () => hrAnalyticsService.getAttendanceAnalytics(period, storeId),
    staleTime: 1000 * 60 * 5,
  });
}

// Leave Analytics Hook
export function useLeaveAnalytics(period: string = 'month', departmentId?: string) {
  return useQuery({
    queryKey: ['hr-analytics', 'leave', period, departmentId],
    queryFn: () => hrAnalyticsService.getLeaveAnalytics(period, departmentId),
    staleTime: 1000 * 60 * 5,
  });
}

// Labor Cost Analytics Hook
export function useLaborCostAnalytics(period: string = 'month', filters?: any) {
  return useQuery({
    queryKey: ['hr-analytics', 'labor-cost', period, filters],
    queryFn: () => hrAnalyticsService.getLaborCostAnalytics(period, filters),
    staleTime: 1000 * 60 * 10, // 10 minutes (less frequent updates)
  });
}

// Shift Analytics Hook
export function useShiftAnalytics(period: string = 'month', storeId?: string) {
  return useQuery({
    queryKey: ['hr-analytics', 'shifts', period, storeId],
    queryFn: () => hrAnalyticsService.getShiftAnalytics(period, storeId),
    staleTime: 1000 * 60 * 5,
  });
}

// Employee Demographics Hook
export function useEmployeeDemographics(filters?: any) {
  return useQuery({
    queryKey: ['hr-analytics', 'demographics', filters],
    queryFn: () => hrAnalyticsService.getEmployeeDemographics(filters),
    staleTime: 1000 * 60 * 30, // 30 minutes (demographics change less frequently)
  });
}

// Compliance Metrics Hook
export function useComplianceMetrics() {
  return useQuery({
    queryKey: ['hr-analytics', 'compliance'],
    queryFn: () => hrAnalyticsService.getComplianceMetrics(),
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}

// Export Dashboard Hook
export function useExportDashboard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ format, period, filters }: { format: 'pdf' | 'excel' | 'csv'; period: string; filters?: any }) => 
      hrAnalyticsService.exportDashboard(format, period, filters),
    onSuccess: (data, variables) => {
      // Create download link
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `hr-analytics-${variables.period}.${variables.format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Export completato',
        description: `Report esportato in formato ${variables.format.toUpperCase()}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore export',
        description: 'Impossibile esportare il report. Riprova più tardi.',
        variant: 'destructive',
      });
    },
  });
}

// Real-time Hooks
export function useCurrentAttendance(storeId?: string) {
  return useQuery({
    queryKey: ['hr-analytics', 'attendance', 'current', storeId],
    queryFn: () => hrAnalyticsService.getCurrentAttendance(storeId),
    refetchInterval: 1000 * 30, // Refresh every 30 seconds for real-time data
  });
}

export function useActiveShifts(storeId?: string) {
  return useQuery({
    queryKey: ['hr-analytics', 'shifts', 'active', storeId],
    queryFn: () => hrAnalyticsService.getActiveShifts(storeId),
    refetchInterval: 1000 * 60, // Refresh every minute
  });
}

export function useUpcomingEvents(days: number = 7) {
  return useQuery({
    queryKey: ['hr-analytics', 'events', 'upcoming', days],
    queryFn: () => hrAnalyticsService.getUpcomingEvents(days),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Historical Trends Hook
export function useHistoricalTrends(metric: string, period: string = 'year') {
  return useQuery({
    queryKey: ['hr-analytics', 'trends', metric, period],
    queryFn: () => hrAnalyticsService.getHistoricalTrends(metric, period),
    staleTime: 1000 * 60 * 60, // 1 hour (historical data doesn't change frequently)
    enabled: !!metric,
  });
}

// Predictive Analytics Hook
export function usePredictions(type: 'attendance' | 'labor-cost' | 'turnover', horizon: number = 30) {
  return useQuery({
    queryKey: ['hr-analytics', 'predictions', type, horizon],
    queryFn: () => hrAnalyticsService.getPredictions(type, horizon),
    staleTime: 1000 * 60 * 60 * 6, // 6 hours (predictions are computationally expensive)
    enabled: !!type,
  });
}

// Anomaly Detection Hook
export function useAnomalies(type: 'attendance' | 'overtime' | 'costs') {
  return useQuery({
    queryKey: ['hr-analytics', 'anomalies', type],
    queryFn: () => hrAnalyticsService.getAnomalies(type),
    staleTime: 1000 * 60 * 30, // 30 minutes
    enabled: !!type,
  });
}

// Benchmarking Hook
export function useBenchmarks(metric: string) {
  return useQuery({
    queryKey: ['hr-analytics', 'benchmarks', metric],
    queryFn: () => hrAnalyticsService.getBenchmarks(metric),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours (benchmarks update daily)
    enabled: !!metric,
  });
}

// Custom Report Generation Hook
export function useGenerateCustomReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (config: any) => hrAnalyticsService.generateCustomReport(config),
    onSuccess: (data) => {
      toast({
        title: 'Report generato',
        description: 'Il report personalizzato è stato generato con successo',
      });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['hr-analytics', 'custom-reports'] });
    },
    onError: (error) => {
      toast({
        title: 'Errore generazione report',
        description: 'Impossibile generare il report personalizzato',
        variant: 'destructive',
      });
    },
  });
}

// Report Templates Hooks
export function useReportTemplates() {
  return useQuery({
    queryKey: ['hr-analytics', 'report-templates'],
    queryFn: () => hrAnalyticsService.getReportTemplates(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useSaveReportTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (template: any) => hrAnalyticsService.saveReportTemplate(template),
    onSuccess: () => {
      toast({
        title: 'Template salvato',
        description: 'Il template del report è stato salvato con successo',
      });
      
      queryClient.invalidateQueries({ queryKey: ['hr-analytics', 'report-templates'] });
    },
    onError: (error) => {
      toast({
        title: 'Errore salvataggio',
        description: 'Impossibile salvare il template del report',
        variant: 'destructive',
      });
    },
  });
}

// Utility hook to refresh all analytics data
export function useRefreshAnalytics() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: ['hr-analytics'] });
    
    toast({
      title: 'Aggiornamento dati',
      description: 'I dati analytics sono stati aggiornati',
    });
  };
}

// Combined dashboard data hook (for main dashboard page)
export function useDashboardData(period: string = 'month', filters?: any) {
  const metrics = useDashboardMetrics(period, filters);
  const attendance = useCurrentAttendance(filters?.storeId);
  const activeShifts = useActiveShifts(filters?.storeId);
  const upcomingEvents = useUpcomingEvents(7);
  const compliance = useComplianceMetrics();

  return {
    metrics: metrics.data,
    attendance: attendance.data,
    activeShifts: activeShifts.data,
    upcomingEvents: upcomingEvents.data,
    compliance: compliance.data,
    isLoading: metrics.isLoading || attendance.isLoading || activeShifts.isLoading || upcomingEvents.isLoading || compliance.isLoading,
    error: metrics.error || attendance.error || activeShifts.error || upcomingEvents.error || compliance.error,
  };
}

// Analytics comparison hook (for comparing periods)
export function useAnalyticsComparison(metric: string, currentPeriod: string, previousPeriod: string) {
  const current = useQuery({
    queryKey: ['hr-analytics', 'comparison', metric, 'current', currentPeriod],
    queryFn: () => hrAnalyticsService.getHistoricalTrends(metric, currentPeriod),
    enabled: !!metric && !!currentPeriod,
  });

  const previous = useQuery({
    queryKey: ['hr-analytics', 'comparison', metric, 'previous', previousPeriod],
    queryFn: () => hrAnalyticsService.getHistoricalTrends(metric, previousPeriod),
    enabled: !!metric && !!previousPeriod,
  });

  return {
    current: current.data,
    previous: previous.data,
    isLoading: current.isLoading || previous.isLoading,
    error: current.error || previous.error,
    comparison: current.data && previous.data ? {
      value: current.data.value - previous.data.value,
      percentage: ((current.data.value - previous.data.value) / previous.data.value) * 100,
      trend: current.data.value > previous.data.value ? 'up' : current.data.value < previous.data.value ? 'down' : 'stable',
    } : null,
  };
}