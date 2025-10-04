import { useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, CheckCircle, Archive, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface BulkActionsBarProps {
  selectedTaskIds: string[];
  onClearSelection: () => void;
}

export function BulkActionsBar({ selectedTaskIds, onClearSelection }: BulkActionsBarProps) {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const bulkUpdateMutation = useMutation({
    mutationFn: async (updates: any) => {
      return apiRequest('/api/tasks/bulk', {
        method: 'PATCH',
        body: JSON.stringify({
          taskIds: selectedTaskIds,
          updates,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      onClearSelection();
      toast({
        title: 'Tasks aggiornati',
        description: `${selectedTaskIds.length} task aggiornati con successo`,
      });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare i tasks',
        variant: 'destructive',
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/tasks/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ taskIds: selectedTaskIds }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      onClearSelection();
      toast({
        title: 'Tasks eliminati',
        description: `${selectedTaskIds.length} task eliminati con successo`,
      });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare i tasks',
        variant: 'destructive',
      });
    },
  });

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    bulkUpdateMutation.mutate({ status });
  };

  const handleArchive = () => {
    bulkUpdateMutation.mutate({ status: 'archived' });
  };

  const handleDelete = () => {
    if (confirm(`Sei sicuro di voler eliminare ${selectedTaskIds.length} task?`)) {
      bulkDeleteMutation.mutate();
    }
  };

  if (selectedTaskIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-lg border border-gray-200 p-4 z-50 flex items-center gap-4">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-blue-600" />
        <span className="font-medium text-gray-900">
          {selectedTaskIds.length} task selezionat{selectedTaskIds.length === 1 ? 'o' : 'i'}
        </span>
      </div>

      <div className="h-6 w-px bg-gray-300" />

      <Select value={selectedStatus} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-40" data-testid="select-bulk-status">
          <SelectValue placeholder="Cambia stato" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todo">Da fare</SelectItem>
          <SelectItem value="in_progress">In corso</SelectItem>
          <SelectItem value="review">In revisione</SelectItem>
          <SelectItem value="done">Completato</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        onClick={handleArchive}
        disabled={bulkUpdateMutation.isPending}
        data-testid="button-bulk-archive"
      >
        <Archive className="h-4 w-4 mr-2" />
        Archivia
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleDelete}
        disabled={bulkDeleteMutation.isPending}
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
        data-testid="button-bulk-delete"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Elimina
      </Button>

      <div className="h-6 w-px bg-gray-300" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        data-testid="button-clear-selection"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
