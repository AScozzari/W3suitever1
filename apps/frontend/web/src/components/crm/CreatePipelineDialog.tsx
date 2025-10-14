import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Plus, Loader2 } from 'lucide-react';

interface CreatePipelineDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreatePipelineDialog({ open, onClose }: CreatePipelineDialogProps) {
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [driverId, setDriverId] = useState<string>('');

  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['/api/drivers'],
    enabled: open,
  });

  const createPipelineMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) {
        throw new Error('Il nome della pipeline è obbligatorio');
      }
      if (!driverId) {
        throw new Error('Seleziona un driver per la pipeline');
      }

      return apiRequest('/api/crm/pipelines', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          domain: 'crm',
          driverId,
          isActive: true,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/pipelines'] });
      toast({
        title: 'Pipeline creata',
        description: `La pipeline "${name}" è stata creata con successo`,
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile creare la pipeline',
        variant: 'destructive',
      });
    },
  });

  const handleClose = () => {
    setName('');
    setDescription('');
    setDriverId('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPipelineMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-[500px]"
        style={{
          background: 'var(--glass-card-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--glass-card-border)',
          boxShadow: 'var(--shadow-glass-lg)'
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--text-primary)' }}>
            Nuova Pipeline
          </DialogTitle>
          <DialogDescription style={{ color: 'var(--text-secondary)' }}>
            Crea una nuova pipeline CRM per gestire le tue opportunità di vendita
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="pipeline-name" style={{ color: 'var(--text-primary)' }}>
              Nome Pipeline <span className="text-red-500">*</span>
            </Label>
            <Input
              id="pipeline-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. Pipeline Fisso Business"
              required
              style={{
                background: 'var(--glass-bg-light)',
                border: '1px solid var(--glass-card-border)',
                color: 'var(--text-primary)'
              }}
              data-testid="input-pipeline-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pipeline-description" style={{ color: 'var(--text-primary)' }}>
              Descrizione
            </Label>
            <Textarea
              id="pipeline-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrizione della pipeline (opzionale)"
              rows={3}
              style={{
                background: 'var(--glass-bg-light)',
                border: '1px solid var(--glass-card-border)',
                color: 'var(--text-primary)'
              }}
              data-testid="textarea-pipeline-description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pipeline-driver" style={{ color: 'var(--text-primary)' }}>
              Driver <span className="text-red-500">*</span>
            </Label>
            <Select value={driverId} onValueChange={setDriverId} required>
              <SelectTrigger
                id="pipeline-driver"
                style={{
                  background: 'var(--glass-bg-light)',
                  border: '1px solid var(--glass-card-border)',
                  color: 'var(--text-primary)'
                }}
                data-testid="select-pipeline-driver"
              >
                <SelectValue placeholder="Seleziona un driver" />
              </SelectTrigger>
              <SelectContent>
                {driversLoading ? (
                  <SelectItem value="loading" disabled>Caricamento...</SelectItem>
                ) : drivers.length === 0 ? (
                  <SelectItem value="empty" disabled>Nessun driver disponibile</SelectItem>
                ) : (
                  drivers.map((driver: any) => (
                    <SelectItem key={driver.code} value={driver.code}>
                      {driver.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createPipelineMutation.isPending}
              data-testid="button-cancel-pipeline"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={createPipelineMutation.isPending || !name.trim() || !driverId}
              style={{ background: 'hsl(var(--brand-orange))' }}
              className="text-white"
              data-testid="button-submit-pipeline"
            >
              {createPipelineMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creazione...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Crea Pipeline
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
