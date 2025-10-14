import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Plus, Save, Loader2 } from 'lucide-react';

interface CreatePipelineDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreatePipelineDialog({ open, onClose }: CreatePipelineDialogProps) {
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [driverId, setDriverId] = useState<string>('');
  const [autoAssign, setAutoAssign] = useState(false);

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
          autoAssign,
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
    setAutoAssign(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPipelineMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        style={{
          background: 'white',
          border: '1px solid rgba(0, 0, 0, 0.1)'
        }}
      >
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 rounded-lg" style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}>
              <Plus className="h-6 w-6" />
            </div>
            <div>
              <div style={{ color: '#1f2937' }}>Nuova Pipeline</div>
              <div className="text-sm font-normal text-gray-500 mt-1">
                Configura nome, descrizione, driver e impostazioni di base per questa nuova pipeline
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Crea una nuova pipeline CRM inserendo nome, descrizione, driver e opzioni di auto-assegnazione
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 py-6">
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Informazioni Base</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pipeline-name" className="text-gray-700">Nome Pipeline *</Label>
                <Input
                  id="pipeline-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="es. Pipeline Vendite Fibra"
                  className="bg-white border-gray-300"
                  data-testid="input-pipeline-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pipeline-description" className="text-gray-700">Descrizione</Label>
                <Textarea
                  id="pipeline-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrivi lo scopo e l'utilizzo di questa pipeline..."
                  rows={3}
                  className="bg-white border-gray-300"
                  data-testid="input-pipeline-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pipeline-driver" className="text-gray-700">Driver Tecnologico</Label>
                <Select value={driverId} onValueChange={setDriverId} disabled={driversLoading}>
                  <SelectTrigger id="pipeline-driver" className="bg-white border-gray-300" data-testid="select-driver">
                    <SelectValue placeholder={driversLoading ? "Caricamento..." : "Seleziona driver"} />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((driver: any) => (
                      <SelectItem key={driver.code} value={driver.code}>
                        {driver.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Assegnazione Automatica</h3>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-gray-700">Auto-assegnazione lead</Label>
                <p className="text-sm text-gray-500">
                  Assegna automaticamente i nuovi lead agli agenti disponibili
                </p>
              </div>
              <Switch
                checked={autoAssign}
                onCheckedChange={setAutoAssign}
                data-testid="switch-auto-assign"
              />
            </div>
          </Card>

          <div className="flex justify-end gap-3 pt-4 border-t">
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
              style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}
              data-testid="button-submit-pipeline"
            >
              {createPipelineMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creazione...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
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
