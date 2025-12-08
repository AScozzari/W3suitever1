/**
 * 🪝 BRAND WORKFLOWS REACT QUERY HOOKS
 * TanStack Query integration for Master Workflow Templates (DB-based)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BRAND_API_BASE } from '../config/api';

function getAuthHeaders(): HeadersInit {
  const token = (window as any).brandAuthToken || localStorage.getItem('brand-token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
}

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
    headers: getAuthHeaders(),
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
    headers: getAuthHeaders(),
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
    headers: getAuthHeaders(),
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
    headers: getAuthHeaders(),
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
    headers: getAuthHeaders(),
    credentials: 'include'
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete workflow');
  }
}

async function duplicateWorkflow(id: string): Promise<BrandWorkflow> {
  const response = await fetch(`${BRAND_API_BASE}/workflows/${id}/duplicate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include'
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to duplicate workflow');
  }
  
  const result = await response.json();
  return result.data;
}

async function exportWorkflow(id: string): Promise<Blob> {
  const response = await fetch(`${BRAND_API_BASE}/workflows/${id}/export`, {
    headers: getAuthHeaders(),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to export workflow');
  }
  
  return response.blob();
}

async function importWorkflow(file: File): Promise<BrandWorkflow> {
  const token = (window as any).brandAuthToken || localStorage.getItem('brand-token');
  const formData = new FormData();
  formData.append('workflow', file);
  
  const response = await fetch(`${BRAND_API_BASE}/workflows/import`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` })
    },
    credentials: 'include',
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to import workflow');
  }
  
  const result = await response.json();
  return result.data;
}

// ==================== REACT QUERY HOOKS ====================

export function useBrandWorkflows(filters?: WorkflowFilters) {
  return useQuery({
    queryKey: ['/brand-api/workflows', filters],
    queryFn: () => fetchWorkflows(filters)
  });
}

export function useBrandWorkflow(id: string) {
  return useQuery({
    queryKey: ['/brand-api/workflows', id],
    queryFn: () => fetchWorkflow(id),
    enabled: !!id
  });
}

export function useCreateBrandWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/workflows'] });
    }
  });
}

export function useUpdateBrandWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateWorkflowData> }) => 
      updateWorkflow(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/workflows'] });
      queryClient.invalidateQueries({ queryKey: ['/brand-api/workflows', id] });
    }
  });
}

export function useDeleteBrandWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/workflows'] });
    }
  });
}

export function useDuplicateBrandWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: duplicateWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/workflows'] });
    }
  });
}

export function useExportBrandWorkflow() {
  return useMutation({
    mutationFn: exportWorkflow
  });
}

export function useImportBrandWorkflow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: importWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/workflows'] });
    }
  });
}
