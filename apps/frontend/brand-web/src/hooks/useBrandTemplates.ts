/**
 * 🪝 BRAND TEMPLATES REACT QUERY HOOKS
 * TanStack Query integration for Master Catalog Templates (JSON-based)
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

export type TemplateType = 'campaign' | 'pipeline' | 'funnel';
export type TemplateStatus = 'active' | 'draft' | 'archived';

export interface BrandTemplate {
  id: string;
  type: TemplateType;
  code: string;
  name: string;
  description?: string;
  status: TemplateStatus;
  isActive: boolean;
  version: string;
  linkedItems?: Array<{ id: string; name: string; type: TemplateType }>;
  metadata?: Record<string, any>;
  templateData: Record<string, any>; // Wizard form data
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export interface CreateTemplateData {
  code: string;
  name: string;
  description?: string;
  status?: TemplateStatus;
  isActive?: boolean;
  version?: string;
  linkedItems?: Array<{ id: string; name: string; type: TemplateType }>;
  metadata?: Record<string, any>;
  templateData: Record<string, any>;
}

// ==================== API FUNCTIONS ====================

async function fetchTemplates(type: TemplateType): Promise<BrandTemplate[]> {
  const response = await fetch(`${BRAND_API_BASE}/templates/${type}`, {
    headers: getAuthHeaders(),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ${type} templates`);
  }
  
  const result = await response.json();
  return result.data || [];
}

async function fetchAllTemplates(): Promise<BrandTemplate[]> {
  const response = await fetch(`${BRAND_API_BASE}/templates`, {
    headers: getAuthHeaders(),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch templates');
  }
  
  const result = await response.json();
  return result.data || [];
}

async function fetchTemplate(type: TemplateType, id: string): Promise<BrandTemplate> {
  const response = await fetch(`${BRAND_API_BASE}/templates/${type}/${id}`, {
    headers: getAuthHeaders(),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch template ${id}`);
  }
  
  const result = await response.json();
  return result.data;
}

async function createTemplate(type: TemplateType, data: CreateTemplateData): Promise<BrandTemplate> {
  const response = await fetch(`${BRAND_API_BASE}/templates/${type}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to create ${type} template`);
  }
  
  const result = await response.json();
  return result.data;
}

async function updateTemplate(
  type: TemplateType, 
  id: string, 
  updates: Partial<CreateTemplateData>
): Promise<BrandTemplate> {
  const response = await fetch(`${BRAND_API_BASE}/templates/${type}/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to update ${type} template`);
  }
  
  const result = await response.json();
  return result.data;
}

async function toggleTemplate(type: TemplateType, id: string): Promise<BrandTemplate> {
  const response = await fetch(`${BRAND_API_BASE}/templates/${type}/${id}/toggle`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include'
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to toggle ${type} template`);
  }
  
  const result = await response.json();
  return result.data;
}

async function deleteTemplate(type: TemplateType, id: string): Promise<void> {
  const response = await fetch(`${BRAND_API_BASE}/templates/${type}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include'
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to delete ${type} template`);
  }
}

async function duplicateTemplate(type: TemplateType, id: string): Promise<BrandTemplate> {
  const response = await fetch(`${BRAND_API_BASE}/templates/${type}/${id}/duplicate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include'
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to duplicate ${type} template`);
  }
  
  const result = await response.json();
  return result.data;
}

async function archiveTemplate(type: TemplateType, id: string): Promise<BrandTemplate> {
  const response = await fetch(`${BRAND_API_BASE}/templates/${type}/${id}/archive`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include'
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to archive ${type} template`);
  }
  
  const result = await response.json();
  return result.data;
}

// ==================== REACT QUERY HOOKS ====================

export function useBrandTemplates(type: TemplateType) {
  return useQuery({
    queryKey: ['/brand-api/templates', type],
    queryFn: () => fetchTemplates(type)
  });
}

export function useAllBrandTemplates() {
  return useQuery({
    queryKey: ['/brand-api/templates'],
    queryFn: fetchAllTemplates
  });
}

export function useBrandTemplate(type: TemplateType, id: string) {
  return useQuery({
    queryKey: ['/brand-api/templates', type, id],
    queryFn: () => fetchTemplate(type, id),
    enabled: !!id
  });
}

export function useCreateBrandTemplate(type: TemplateType) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateTemplateData) => createTemplate(type, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/templates', type] });
      queryClient.invalidateQueries({ queryKey: ['/brand-api/templates'] });
    }
  });
}

export function useUpdateBrandTemplate(type: TemplateType) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateTemplateData> }) => 
      updateTemplate(type, id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/templates', type] });
      queryClient.invalidateQueries({ queryKey: ['/brand-api/templates', type, id] });
      queryClient.invalidateQueries({ queryKey: ['/brand-api/templates'] });
    }
  });
}

export function useToggleBrandTemplate(type: TemplateType) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => toggleTemplate(type, id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/templates', type] });
      queryClient.invalidateQueries({ queryKey: ['/brand-api/templates', type, id] });
      queryClient.invalidateQueries({ queryKey: ['/brand-api/templates'] });
    }
  });
}

export function useDeleteBrandTemplate(type: TemplateType) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => deleteTemplate(type, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/templates', type] });
      queryClient.invalidateQueries({ queryKey: ['/brand-api/templates'] });
    }
  });
}

export function useDuplicateBrandTemplate(type: TemplateType) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => duplicateTemplate(type, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/templates', type] });
      queryClient.invalidateQueries({ queryKey: ['/brand-api/templates'] });
    }
  });
}

export function useArchiveBrandTemplate(type: TemplateType) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => archiveTemplate(type, id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/templates', type] });
      queryClient.invalidateQueries({ queryKey: ['/brand-api/templates', type, id] });
      queryClient.invalidateQueries({ queryKey: ['/brand-api/templates'] });
    }
  });
}
