/**
 * 🪝 BRAND TEMPLATES REACT QUERY HOOKS
 * TanStack Query integration for Master Catalog Templates (JSON-based)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BRAND_API_BASE } from '../config/api';

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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    credentials: 'include'
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to delete ${type} template`);
  }
}

// ==================== REACT QUERY HOOKS ====================

/**
 * Fetch all templates of a specific type
 */
export function useBrandTemplates(type: TemplateType) {
  return useQuery({
    queryKey: ['brand-templates', type],
    queryFn: () => fetchTemplates(type),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch all templates (cross-type)
 */
export function useAllBrandTemplates() {
  return useQuery({
    queryKey: ['brand-templates'],
    queryFn: fetchAllTemplates,
    staleTime: 30000,
  });
}

/**
 * Fetch single template
 */
export function useBrandTemplate(type: TemplateType, id: string | undefined) {
  return useQuery({
    queryKey: ['brand-templates', type, id],
    queryFn: () => fetchTemplate(type, id!),
    enabled: !!id, // Only run if ID exists
    staleTime: 30000,
  });
}

/**
 * Create new template
 */
export function useCreateBrandTemplate(type: TemplateType) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateTemplateData) => createTemplate(type, data),
    onSuccess: () => {
      // Invalidate both type-specific and all-templates queries
      queryClient.invalidateQueries({ queryKey: ['brand-templates', type] });
      queryClient.invalidateQueries({ queryKey: ['brand-templates'] });
    },
  });
}

/**
 * Update existing template
 */
export function useUpdateBrandTemplate(type: TemplateType) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateTemplateData> }) =>
      updateTemplate(type, id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['brand-templates', type] });
      queryClient.invalidateQueries({ queryKey: ['brand-templates', type, variables.id] });
      queryClient.invalidateQueries({ queryKey: ['brand-templates'] });
    },
  });
}

/**
 * Toggle template active state
 */
export function useToggleBrandTemplate(type: TemplateType) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => toggleTemplate(type, id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['brand-templates', type] });
      queryClient.invalidateQueries({ queryKey: ['brand-templates', type, id] });
      queryClient.invalidateQueries({ queryKey: ['brand-templates'] });
    },
  });
}

/**
 * Delete template
 */
export function useDeleteBrandTemplate(type: TemplateType) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => deleteTemplate(type, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-templates', type] });
      queryClient.invalidateQueries({ queryKey: ['brand-templates'] });
    },
  });
}
