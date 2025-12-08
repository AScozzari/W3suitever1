/**
 * 🏗️ WORKFLOW TEMPLATE API HOOKS
 * 
 * TanStack Query hooks for workflow template CRUD operations
 * Replaces Zustand persistence with server synchronization
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Node, Edge, Viewport } from '@xyflow/react';

// 🎯 TEMPLATE TYPES (matches backend schema)
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sales' | 'finance' | 'marketing' | 'support' | 'operations' | 'hr' | 'it' | 'legal' | 'crm';
  definition: {
    nodes: Node[];
    edges: Edge[];
    viewport: Viewport;
  };
  isActive: boolean;
  tags: string[];
  actionTags: string[]; // Action tags to identify what the workflow DOES
  customAction: string | null; // Custom action description for non-standard workflows
  metadata: Record<string, any>;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  tenantId: string;
}

export interface CreateTemplateData {
  name: string;
  description: string;
  category: WorkflowTemplate['category'];
  definition: {
    nodes: Node[];
    edges: Edge[];
    viewport: Viewport;
  };
  tags?: string[];
  actionTags?: string[]; // Action tags for this workflow
  customAction?: string; // Custom action description
  metadata?: Record<string, any>;
}

export interface UpdateTemplateData extends Partial<CreateTemplateData> {
  id: string;
}

// 🎯 QUERY KEYS
const TEMPLATE_QUERY_KEYS = {
  all: ['workflows', 'templates'] as const,
  lists: () => [...TEMPLATE_QUERY_KEYS.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...TEMPLATE_QUERY_KEYS.lists(), filters] as const,
  details: () => [...TEMPLATE_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...TEMPLATE_QUERY_KEYS.details(), id] as const,
};

// 🎯 HOOKS FOR TEMPLATE MANAGEMENT

/**
 * Get all workflow templates with optional filtering
 */
export function useWorkflowTemplates(params?: {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: TEMPLATE_QUERY_KEYS.list(params || {}),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.set('category', params.category);
      if (params?.search) searchParams.set('search', params.search);
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      
      const url = `/api/workflows/templates${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
      const response = await apiRequest(url);
      
      // API returns { success: true, data: [...], pagination: {...} }
      // Extract just the templates array
      return response?.data || [];
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get a single workflow template by ID
 */
export function useWorkflowTemplate(templateId: string | null) {
  return useQuery({
    queryKey: TEMPLATE_QUERY_KEYS.detail(templateId || ''),
    queryFn: async () => {
      if (!templateId) throw new Error('Template ID is required');
      const response = await apiRequest(`/api/workflows/templates/${templateId}`);
      // API returns { success: true, data: {...} }
      // Extract just the template object
      return response?.data || null;
    },
    enabled: !!templateId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Create a new workflow template
 */
export function useCreateTemplate() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateTemplateData): Promise<WorkflowTemplate> => {
      return apiRequest('/api/workflows/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      // Invalidate and refetch templates list
      queryClient.invalidateQueries({ queryKey: TEMPLATE_QUERY_KEYS.lists() });
      
      toast({
        title: 'Template Saved',
        description: `Workflow template "${data.name}" was created successfully.`,
      });
    },
    onError: (error: any) => {
      console.error('Error creating template:', error);
      toast({
        title: 'Save Failed',
        description: error?.message || 'Failed to save workflow template. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update an existing workflow template
 */
export function useUpdateTemplate() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UpdateTemplateData): Promise<WorkflowTemplate> => {
      const { id, ...updateData } = data;
      return apiRequest(`/api/workflows/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: TEMPLATE_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: TEMPLATE_QUERY_KEYS.detail(data.id) });
      
      toast({
        title: 'Template Updated',
        description: `Workflow template "${data.name}" was updated successfully.`,
      });
    },
    onError: (error: any) => {
      console.error('Error updating template:', error);
      toast({
        title: 'Update Failed',
        description: error?.message || 'Failed to update workflow template. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete a workflow template
 */
export function useDeleteTemplate() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (templateId: string): Promise<void> => {
      return apiRequest(`/api/workflows/templates/${templateId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (_, templateId) => {
      // Invalidate and remove from cache
      queryClient.invalidateQueries({ queryKey: TEMPLATE_QUERY_KEYS.lists() });
      queryClient.removeQueries({ queryKey: TEMPLATE_QUERY_KEYS.detail(templateId) });
      
      toast({
        title: 'Template Deleted',
        description: 'Workflow template was deleted successfully.',
      });
    },
    onError: (error: any) => {
      console.error('Error deleting template:', error);
      toast({
        title: 'Delete Failed',
        description: error?.message || 'Failed to delete workflow template. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Duplicate a workflow template
 */
export function useDuplicateTemplate() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (templateId: string): Promise<WorkflowTemplate> => {
      // First get the template data
      const template = await apiRequest(`/api/workflows/templates/${templateId}`);
      
      // Create a duplicate with modified name
      const duplicateData: CreateTemplateData = {
        name: `${template.name} (Copy)`,
        description: template.description,
        category: template.category,
        definition: template.definition,
        tags: template.tags || [],
        metadata: template.metadata || {},
      };
      
      return apiRequest('/api/workflows/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateData),
      });
    },
    onSuccess: (data) => {
      // Invalidate templates list
      queryClient.invalidateQueries({ queryKey: TEMPLATE_QUERY_KEYS.lists() });
      
      toast({
        title: 'Template Duplicated',
        description: `Workflow template "${data.name}" was created successfully.`,
      });
    },
    onError: (error: any) => {
      console.error('Error duplicating template:', error);
      toast({
        title: 'Duplicate Failed',
        description: error?.message || 'Failed to duplicate workflow template. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Utility function to get template categories
 */
export function getTemplateCategories(): WorkflowTemplate['category'][] {
  return ['sales', 'finance', 'marketing', 'support', 'operations', 'hr', 'it', 'legal'];
}

/**
 * Utility function to format template category for display
 */
export function formatTemplateCategory(category: WorkflowTemplate['category']): string {
  const categoryMap: Record<WorkflowTemplate['category'], string> = {
    sales: 'Sales',
    finance: 'Finance',
    marketing: 'Marketing',
    support: 'Support',
    operations: 'Operations',
    hr: 'HR',
    it: 'IT',
    legal: 'Legal',
  };
  return categoryMap[category] || category;
}