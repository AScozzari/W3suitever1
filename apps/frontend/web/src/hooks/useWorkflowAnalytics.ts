import { useQuery } from '@tanstack/react-query';

// Types for Analytics API responses
export interface PerformanceData {
  date: string;
  executions: number;
  successful: number;
  failed: number;
  avg_duration: number | null;
}

export interface CategoryStats {
  category: string;
  total_instances: number;
  completed: number;
  running: number;
  failed: number;
  avg_completion_time: number | null;
}

export interface ActiveTemplate {
  name: string;
  category: string;
  instances_count: number;
  avg_duration: number | null;
  last_used: string | null;
}

export interface HourlyDistribution {
  hour: number;
  instances_started: number;
}

export interface AnalyticsData {
  period: number; // Days analyzed
  performance: PerformanceData[];
  categoryStats: CategoryStats[];
  activeTemplates: ActiveTemplate[];
  hourlyDistribution: HourlyDistribution[];
  generatedAt: string;
  summary: {
    totalExecutions: number;
    averageExecutionTime: number | null;
    successRate: number;
    mostActiveCategory: string | null;
    peakHour: number | null;
  };
}

/**
 * Hook per gestire i dati analytics dei workflow
 * Recupera statistiche e metriche di performance dal database
 */
export function useWorkflowAnalytics(period = 30) {
  return useQuery<AnalyticsData>({
    queryKey: ['/api/workflows/analytics', { period }],
    select: (response: any) => response.data || response,
    staleTime: 300000,
    refetchInterval: 300000,
  });
}