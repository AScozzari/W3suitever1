// useUsers Hook - Employee/User Data Management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { User, QueryResult } from '@/types';

// Hook to fetch all users for current tenant
export function useUsers(filters?: any): QueryResult<User[]> {
  return useQuery<User[]>({
    queryKey: ['/api/users', filters],
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 10, // Refresh every 10 minutes
  }) as QueryResult<User[]>;
}

// Hook to fetch single user by ID  
export function useUser(userId: string): QueryResult<User> {
  return useQuery<User>({
    queryKey: ['/api/users', userId],
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  }) as QueryResult<User>;
}

// Hook to create a new user
export function useCreateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (userData: Partial<User>) => {
      return fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      }).then(res => {
        if (!res.ok) throw new Error('Failed to create user');
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'Dipendente creato',
        description: 'Il nuovo dipendente è stato aggiunto con successo.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: 'Impossibile creare il dipendente. Riprova più tardi.',
        variant: 'destructive',
      });
    },
  });
}

// Hook to update user
export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ userId, ...userData }: { userId: string } & Partial<User>) => {
      return fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      }).then(res => {
        if (!res.ok) throw new Error('Failed to update user');
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'Dipendente aggiornato',
        description: 'Le informazioni del dipendente sono state aggiornate.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare il dipendente. Riprova più tardi.',
        variant: 'destructive',
      });
    },
  });
}

// Hook to delete user
export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (userId: string) => {
      return fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      }).then(res => {
        if (!res.ok) throw new Error('Failed to delete user');
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'Dipendente rimosso',
        description: 'Il dipendente è stato rimosso dal sistema.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: 'Impossibile rimuovere il dipendente. Riprova più tardi.',
        variant: 'destructive',
      });
    },
  });
}

// Export User type for use in components
export type { User };