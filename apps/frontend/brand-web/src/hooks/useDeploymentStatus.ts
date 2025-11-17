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
  tenantSlug: string;
  storeCode: string | null;
  status: 'ready' | 'in_progress' | 'deployed' | 'failed' | 'archived';
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  // Commit data
  commitId: string;
  commitName: string;
  commitVersion: string;
  tool: 'wms' | 'crm' | 'pos' | 'analytics' | 'hr';
  resourceType: 'supplier' | 'product' | 'product_type' | 'campaign' | 'pipeline' | 'funnel' | 'workflow' | 'task';
}

export interface DeploymentStatusFilters {
  deploymentId?: string;
  branchId?: string;
  status?: string;
  tool?: string;
  tenantSlug?: string;
  storeCode?: string;
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
  if (filters.tool) queryParams.append('tool', filters.tool);
  if (filters.tenantSlug) queryParams.append('tenantSlug', filters.tenantSlug);
  if (filters.storeCode) queryParams.append('storeCode', filters.storeCode);
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
    ready: statuses?.filter(s => s.status === 'ready').length || 0,
    inProgress: statuses?.filter(s => s.status === 'in_progress').length || 0,
    deployed: statuses?.filter(s => s.status === 'deployed').length || 0,
    failed: statuses?.filter(s => s.status === 'failed').length || 0,
    archived: statuses?.filter(s => s.status === 'archived').length || 0,
  };
  
  return {
    ...rest,
    data: summary
  };
}
