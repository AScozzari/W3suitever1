/**
 * 🪝 BRAND WORKFLOWS REACT QUERY HOOKS
 * TanStack Query integration for Master Workflow Templates (DB-based)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BRAND_API_BASE } from '../config/api';

// ==================== TYPES ====================

export type WorkflowCategory = 'crm' | 'wms' | 'hr' | 'analytics' | 'generic';
export type WorkflowStatus = 'draft' | 'active' | 'archived' | 'deprecated';
export type WorkflowExecutionMode = 'automatic' | 'manual';

export interface BrandWorkflow {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: WorkflowCategory;
  tags: string[];
  version: string;
  status: WorkflowStatus;
  dslJson: Record<string, any>; // ReactFlow DSL
  checksum: string;
  targetModules?: string[];
  placeholders?: Record<string, any>;
  executionMode?: WorkflowExecutionMode;
  enabledForDeployment?: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowData {
  code: string;
  name: string;
  description?: string;
  category?: WorkflowCategory;
  tags?: string[];
  version?: string;
  status?: WorkflowStatus;
  dslJson: Record<string, any>;
  targetModules?: string[];
  placeholders?: Record<string, any>;
  executionMode?: WorkflowExecutionMode;
  enabledForDeployment?: boolean;
}

export interface WorkflowFilters {
  category?: WorkflowCategory;
  status?: WorkflowStatus;
}

// ==================== API FUNCTIONS ====================

async function fetchWorkflows(filters?: WorkflowFilters): Promise<BrandWorkflow[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.append('category', filters.category);
  if (filters?.status) params.append('status', filters.status);
  
  const url = `${BRAND_API_BASE}/workflows${params.toString() ? `?${params}` : ''}`;
  
  const response = await fetch(url, {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch workflows');
  }
  
  const result = await response.json();
  return result.data || [];
}

async function fetchWorkflow(id: string): Promise<BrandWorkflow> {
  const response = await fetch(`${BRAND_API_BASE}/workflows/${id}`, {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch workflow ${id}`);
  }
  
  const result = await response.json();
  return result.data;
}

async function createWorkflow(data: CreateWorkflowData): Promise<BrandWorkflow> {
  const response = await fetch(`${BRAND_API_BASE}/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create workflow');
  }
  
  const result = await response.json();
  return result.data;
}

async function updateWorkflow(
  id: string, 
  updates: Partial<CreateWorkflowData>
): Promise<BrandWorkflow> {
  const response = await fetch(`${BRAND_API_BASE}/workflows/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update workflow');
  }
  
  const result = await response.json();
  return result.data;
}

async function deleteWorkflow(id: string): Promise<void> {
  const response = await fetch(`${BRAND_API_BASE}/workflows/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete workflow');
  }
}

// ==================== REACT QUERY HOOKS ====================

/**
 * Fetch all workflows with optional filters
 */
export function useBrandWorkflows(filters?: WorkflowFilters) {
  return useQuery({
    queryKey: ['brand-workflows', filters],
    queryFn: () => fetchWorkflows(filters),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch single workflow
 */
export function useBrandWorkflow(id: string | undefined) {
  return useQuery({
    queryKey: ['brand-workflows', id],
    queryFn: () => fetchWorkflow(id!),
    enabled: !!id, // Only run if ID exists
    staleTime: 30000,
  });
}

/**
 * Create new workflow
 */
export function useCreateBrandWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateWorkflowData) => createWorkflow(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-workflows'] });
    },
  });
}

/**
 * Update existing workflow
 */
export function useUpdateBrandWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateWorkflowData> }) =>
      updateWorkflow(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['brand-workflows'] });
      queryClient.invalidateQueries({ queryKey: ['brand-workflows', variables.id] });
    },
  });
}

/**
 * Delete workflow
 */
export function useDeleteBrandWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => deleteWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-workflows'] });
    },
  });
}
