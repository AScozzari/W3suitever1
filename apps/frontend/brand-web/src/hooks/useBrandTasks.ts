import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const BRAND_API_BASE = '/brand-api';

function getAuthHeaders(): HeadersInit {
  const token = (window as any).brandAuthToken || localStorage.getItem('brand-token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
}

// Types
export interface BrandTask {
  id: string;
  title: string;
  description?: string;
  assignee: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  category: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  brandTenantId: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  assignee: string;
  status?: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  category: string;
  metadata?: Record<string, any>;
}

// API functions
async function getAllTasks(): Promise<BrandTask[]> {
  const response = await fetch(`${BRAND_API_BASE}/tasks`, {
    headers: getAuthHeaders(),
    credentials: 'include'
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch tasks');
  }
  
  const result = await response.json();
  return result.data;
}

async function getTaskById(id: string): Promise<BrandTask> {
  const response = await fetch(`${BRAND_API_BASE}/tasks/${id}`, {
    headers: getAuthHeaders(),
    credentials: 'include'
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch task');
  }
  
  const result = await response.json();
  return result.data;
}

async function createTask(data: CreateTaskData): Promise<BrandTask> {
  const response = await fetch(`${BRAND_API_BASE}/tasks`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create task');
  }
  
  const result = await response.json();
  return result.data;
}

async function updateTask(id: string, updates: Partial<CreateTaskData>): Promise<BrandTask> {
  const response = await fetch(`${BRAND_API_BASE}/tasks/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update task');
  }
  
  const result = await response.json();
  return result.data;
}

async function deleteTask(id: string): Promise<void> {
  const response = await fetch(`${BRAND_API_BASE}/tasks/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include'
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete task');
  }
}

// React Query hooks
export function useAllBrandTasks() {
  return useQuery({
    queryKey: ['/brand-api/tasks'],
    queryFn: getAllTasks
  });
}

export function useBrandTask(id: string) {
  return useQuery({
    queryKey: ['/brand-api/tasks', id],
    queryFn: () => getTaskById(id),
    enabled: !!id
  });
}

export function useCreateBrandTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/tasks'] });
    }
  });
}

export function useUpdateBrandTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateTaskData> }) => 
      updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/tasks'] });
    }
  });
}

export function useDeleteBrandTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/tasks'] });
    }
  });
}
