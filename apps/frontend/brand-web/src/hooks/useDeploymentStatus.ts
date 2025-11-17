/**
 * 📊 DEPLOYMENT STATUS HOOKS
 * 
 * React Query hooks for real-time deployment status tracking
 * Features: Auto-refresh every 5s, filtering by deployment/branch/status
 */

import { useQuery } from '@tanstack/react-query';

export interface DeploymentStatus {
  id: string;
  deploymentId: string;
  branchId: string;
  branchName: string;
  tenantName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial';
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentStatusFilters {
  deploymentId?: string;
  branchId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

/**
 * Fetch deployment statuses with optional filters
 * Auto-refreshes every 5 seconds for real-time tracking
 */
export function useDeploymentStatuses(filters: DeploymentStatusFilters = {}) {
  const queryParams = new URLSearchParams();
  
  if (filters.deploymentId) queryParams.append('deploymentId', filters.deploymentId);
  if (filters.branchId) queryParams.append('branchId', filters.branchId);
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.limit) queryParams.append('limit', filters.limit.toString());
  if (filters.offset) queryParams.append('offset', filters.offset.toString());
  
  const queryString = queryParams.toString();
  const endpoint = `/brand-api/deploy/status${queryString ? `?${queryString}` : ''}`;
  
  return useQuery<{ data: DeploymentStatus[] }, Error, DeploymentStatus[]>({
    queryKey: [endpoint], // Use full endpoint as queryKey for default fetcher
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
    refetchIntervalInBackground: true,
    staleTime: 0, // Always consider data stale to enable refetch
    select: (response) => response.data, // Extract data array from API response
  });
}

/**
 * Fetch deployment status for a specific deployment
 * Useful for tracking deployment progress in real-time
 */
export function useDeploymentStatusById(deploymentId: string) {
  return useDeploymentStatuses({ deploymentId });
}

/**
 * Get deployment status summary (counts by status)
 */
export function useDeploymentStatusSummary(deploymentId?: string) {
  const { data: statuses, ...rest } = useDeploymentStatuses({ 
    deploymentId,
    limit: 1000 // Get all for accurate counts
  });
  
  const summary = {
    total: statuses?.length || 0,
    pending: statuses?.filter(s => s.status === 'pending').length || 0,
    inProgress: statuses?.filter(s => s.status === 'in_progress').length || 0,
    completed: statuses?.filter(s => s.status === 'completed').length || 0,
    failed: statuses?.filter(s => s.status === 'failed').length || 0,
    partial: statuses?.filter(s => s.status === 'partial').length || 0,
  };
  
  return {
    ...rest,
    data: summary
  };
}
