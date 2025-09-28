/**
 * 🎯 WORKFLOW DASHBOARD HOOKS
 * Hooks per recuperare dati reali dashboard, timeline e analytics
 */

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// ==================== DASHBOARD METRICS ====================

export interface DashboardSummary {
  totalTemplates: number;
  activeTemplates: number;
  totalInstances: number;
  runningInstances: number;
  completedInstances: number;
  pendingInstances: number;
  failedInstances: number;
}

export interface TemplateByCategory {
  total: number;
  active: number;
  category: string;
}

export interface TopTemplate {
  id: string;
  name: string;
  category: string;
  usageCount: number;
  instanceCount: number;
}

export interface RecentActivity {
  date: string;
  templatesCreated: number;
  instancesStarted: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  templatesByCategory: TemplateByCategory[];
  instancesStatus: {
    total: number;
    running: number;
    completed: number;
    pending: number;
    failed: number;
  };
  topTemplates: TopTemplate[];
  recentActivity: RecentActivity[];
}

/**
 * Hook per recuperare metriche dashboard workflow
 */
export function useWorkflowDashboardMetrics() {
  return useQuery<DashboardData>({
    queryKey: ['/api/workflows/dashboard/metrics'],
    queryFn: async () => {
      const response = await apiRequest('/api/workflows/dashboard/metrics');
      return response.data;
    },
    refetchInterval: 30000, // Aggiorna ogni 30 secondi
    staleTime: 10000, // Considera stale dopo 10 secondi
  });
}

// ==================== TIMELINE ====================

export interface TimelineEntry {
  instanceId: string;
  instanceName: string;
  templateName: string;
  templateCategory: string;
  status: string;
  currentStep: string | null;
  assignee: string | null;
  startedAt: string | null;
  completedAt: string | null;
  lastActivityAt: string | null;
  escalationLevel: number;
  referenceId: string | null;
}

export interface TimelineData {
  entries: TimelineEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface TimelineFilters {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  category?: string;
}

/**
 * Hook per recuperare timeline workflow
 */
export function useWorkflowTimeline(filters: TimelineFilters = {}) {
  const searchParams = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value.toString());
    }
  });

  const queryString = searchParams.toString();
  const url = `/api/workflows/timeline${queryString ? `?${queryString}` : ''}`;

  return useQuery<TimelineData>({
    queryKey: ['/api/workflows/timeline', filters],
    queryFn: async () => {
      const response = await apiRequest(url);
      return response.data;
    },
    refetchInterval: 15000, // Aggiorna ogni 15 secondi per timeline real-time
    staleTime: 5000,
  });
}

// ==================== ANALYTICS ====================

export interface PerformanceData {
  date: string;
  executions: number;
  avg_duration: number;
  min_duration: number;
  max_duration: number;
  successful: number;
  failed: number;
}

export interface CategoryStats {
  category: string;
  total_instances: number;
  completed: number;
  running: number;
  failed: number;
  avg_completion_time: number;
}

export interface ActiveTemplate {
  name: string;
  category: string;
  instances_count: number;
  avg_duration: number;
  last_used: string;
}

export interface HourlyDistribution {
  hour: number;
  instances_started: number;
}

export interface AnalyticsData {
  performance: PerformanceData[];
  categoryStats: CategoryStats[];
  activeTemplates: ActiveTemplate[];
  hourlyDistribution: HourlyDistribution[];
  period: number;
  generatedAt: string;
}

export interface AnalyticsFilters {
  period?: number; // days
  category?: string;
}

/**
 * Hook per recuperare analytics workflow
 */
export function useWorkflowAnalytics(filters: AnalyticsFilters = {}) {
  const searchParams = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value.toString());
    }
  });

  const queryString = searchParams.toString();
  const url = `/api/workflows/analytics${queryString ? `?${queryString}` : ''}`;

  return useQuery<AnalyticsData>({
    queryKey: ['/api/workflows/analytics', filters],
    queryFn: async () => {
      const response = await apiRequest(url);
      return response.data;
    },
    refetchInterval: 60000, // Aggiorna ogni minuto per analytics
    staleTime: 30000,
  });
}