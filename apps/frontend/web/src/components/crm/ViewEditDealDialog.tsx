import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit2, Eye } from 'lucide-react';

interface Deal {
  id: string;
  tenantId: string;
  legalEntityId?: string | null;
  storeId: string;
  ownerUserId: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
  assignedTeamId?: string | null;
  pipelineId: string;
  stage: string;
  status: 'open' | 'won' | 'lost';
  leadId?: string | null;
  campaignId?: string | null;
  sourceChannel?: string | null;
  personId: string;
  customerId?: string | null;
  estimatedValue?: number | null;
  probability?: number | null;
  driverId?: string | null;
  agingDays?: number | null;
  wonAt?: string | null;
  lostAt?: string | null;
  createdAt: string;
  updatedAt: string;
  customerName?: string | null;
  customerCompanyName?: string | null;
  customerType?: 'b2b' | 'b2c' | null;
  notes?: string | null;
}

interface Pipeline {
  id: string;
  name: string;
  driver: string;
  stages: Array<{ id: string; name: string; order: number }>;
}

interface Store {
  id: string;
  name: string;
  code: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const dealFormSchema = z.object({
  pipelineId: z.string().min(1, 'Pipeline richiesta'),
  stage: z.string().min(1, 'Stage richiesto'),
  storeId: z.string().min(1, 'Store richiesto'),
  ownerUserId: z.string().min(1, 'Assegnato richiesto'),
  estimatedValue: z.string().min(1, 'Valore richiesto'),
  probability: z.string().min(1, 'Probabilità richiesta'),
  notes: z.string().optional(),
});

type DealFormData = z.infer<typeof dealFormSchema>;

interface ViewEditDealDialogProps {
  deal: Deal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
}

export function ViewEditDealDialog({
  deal,
  open,
  onOpenChange,
  pipelineId,
}: ViewEditDealDialogProps) {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');

  const form = useForm<DealFormData>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      pipelineId: '',
      stage: '',
      storeId: '',
      ownerUserId: '',
      estimatedValue: '',
      probability: '50',
      notes: '',
    },
  });

  // Fetch data
  const { data: pipelines } = useQuery<Pipeline[]>({
    queryKey: ['/api/crm/pipelines'],
    enabled: open,
  });

  const { data: stores } = useQuery<Store[]>({
    queryKey: ['/api/stores'],
    enabled: open,
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: open,
  });

  const selectedPipeline = pipelines?.find(p => p.id === selectedPipelineId);
  const stages = selectedPipeline?.stages || [];

  useEffect(() => {
    if (deal && open) {
      form.reset({
        pipelineId: deal.pipelineId,
        stage: deal.stage,
        storeId: deal.storeId,
        ownerUserId: deal.ownerUserId,
        estimatedValue: deal.estimatedValue?.toString() || '',
        probability: deal.probability?.toString() || '50',
        notes: deal.notes || '',
      });
      setSelectedPipelineId(deal.pipelineId);
      setEditMode(false);
    }
  }, [deal, open, form]);

  const updateDealMutation = useMutation({
    mutationFn: async (data: DealFormData) => {
      if (!deal) return;
      
      const payload = {
        ...data,
        estimatedValue: parseFloat(data.estimatedValue),
        probability: parseInt(data.probability),
      };
      
      return await apiRequest(`/api/crm/deals/${deal.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crm/deals?pipelineId=${pipelineId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/dashboard'] });
      toast({
        title: 'Deal aggiornata',
        description: 'La deal è stata aggiornata con successo.',
      });
      setEditMode(false);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error.message || 'Impossibile aggiornare la deal.',
      });
    },
  });

  const onSubmit = (data: DealFormData) => {
    updateDealMutation.mutate(data);
  };

  const toggleEditMode = () => {
    if (editMode && deal) {
      form.reset({
        pipelineId: deal.pipelineId,
        stage: deal.stage,
        storeId: deal.storeId,
        ownerUserId: deal.ownerUserId,
        estimatedValue: deal.estimatedValue?.toString() || '',
        probability: deal.probability?.toString() || '50',
        notes: deal.notes || '',
      });
    }
    setEditMode(!editMode);
  };

  if (!deal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                {editMode ? 'Modifica Deal' : 'Dettagli Deal'}
              </DialogTitle>
              <DialogDescription>
                {editMode 
                  ? 'Modifica i campi e salva le modifiche.' 
                  : 'Visualizza i dettagli della deal.'}
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleEditMode}
              disabled={updateDealMutation.isPending}
              data-testid="button-toggle-edit"
            >
              {editMode ? (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizza
                </>
              ) : (
                <>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Modifica
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        {!editMode ? (
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-sm">Cliente</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Nome:</span>{' '}
                  <span className="font-medium">{deal.customerName || 'N/A'}</span>
                </div>
                {deal.customerType === 'b2b' && deal.customerCompanyName && (
                  <div>
                    <span className="text-muted-foreground">Azienda:</span>{' '}
                    <span className="font-medium">{deal.customerCompanyName}</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Tipo:</span>{' '}
                  <Badge variant="outline" className="ml-1">
                    {deal.customerType === 'b2b' ? 'B2B' : 'B2C'}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Stato:</span>{' '}
                  <Badge 
                    variant={deal.status === 'open' ? 'default' : deal.status === 'won' ? 'default' : 'destructive'}
                    className="ml-1"
                  >
                    {deal.status === 'open' ? 'Aperta' : deal.status === 'won' ? 'Vinta' : 'Persa'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Pipeline</label>
                <div className="text-sm font-medium p-2 bg-muted rounded-md mt-1">
                  {pipelines?.find(p => p.id === deal.pipelineId)?.name || 'N/A'}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Stage</label>
                <div className="text-sm font-medium p-2 bg-muted rounded-md mt-1">
                  {deal.stage}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Store</label>
                <div className="text-sm font-medium p-2 bg-muted rounded-md mt-1">
                  {stores?.find(s => s.id === deal.storeId)?.name || 'N/A'}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Assegnato</label>
                <div className="text-sm font-medium p-2 bg-muted rounded-md mt-1">
                  {deal.ownerName || 'Non assegnato'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Valore Stimato</label>
                  <div className="text-sm font-medium p-2 bg-muted rounded-md mt-1">
                    €{parseFloat(deal.estimatedValue?.toString() || '0').toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Probabilità</label>
                  <div className="text-sm font-medium p-2 bg-muted rounded-md mt-1">
                    {deal.probability}%
                  </div>
                </div>
              </div>

              {deal.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Note</label>
                  <div className="text-sm p-2 bg-muted rounded-md mt-1 whitespace-pre-wrap">
                    {deal.notes}
                  </div>
                </div>
              )}

              <div className="bg-muted/30 p-3 rounded-lg space-y-1 text-xs">
                <div>
                  <span className="text-muted-foreground">Creata il:</span>{' '}
                  <span className="font-medium">
                    {new Date(deal.createdAt).toLocaleDateString('it-IT')}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Ultima modifica:</span>{' '}
                  <span className="font-medium">
                    {new Date(deal.updatedAt).toLocaleDateString('it-IT')}
                  </span>
                </div>
                {deal.agingDays !== null && (
                  <div>
                    <span className="text-muted-foreground">Giorni nello stage:</span>{' '}
                    <span className="font-medium">{deal.agingDays}</span>
                  </div>
                )}
                {deal.sourceChannel && (
                  <div>
                    <span className="text-muted-foreground">Canale:</span>{' '}
                    <span className="font-medium">{deal.sourceChannel}</span>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-close"
              >
                Chiudi
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h3 className="font-semibold text-sm">Cliente</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nome:</span>{' '}
                    <span className="font-medium">{deal.customerName || 'N/A'}</span>
                  </div>
                  {deal.customerType === 'b2b' && deal.customerCompanyName && (
                    <div>
                      <span className="text-muted-foreground">Azienda:</span>{' '}
                      <span className="font-medium">{deal.customerCompanyName}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>{' '}
                    <Badge variant="outline" className="ml-1">
                      {deal.customerType === 'b2b' ? 'B2B' : 'B2C'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Stato:</span>{' '}
                    <Badge 
                      variant={deal.status === 'open' ? 'default' : deal.status === 'won' ? 'default' : 'destructive'}
                      className="ml-1"
                    >
                      {deal.status === 'open' ? 'Aperta' : deal.status === 'won' ? 'Vinta' : 'Persa'}
                    </Badge>
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="pipelineId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pipeline *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedPipelineId(value);
                        form.setValue('stage', '');
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona pipeline" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pipelines?.map(pipeline => (
                          <SelectItem key={pipeline.id} value={pipeline.id}>
                            {pipeline.name} ({pipeline.driver})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedPipelineId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona stage" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="storeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona store" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stores?.map(store => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name} ({store.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ownerUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assegnato *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona assegnato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users?.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="estimatedValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valore Stimato (€) *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="1000.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="probability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Probabilità (%) *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          max="100"
                          placeholder="50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Note aggiuntive sulla deal..."
                        className="resize-none"
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={updateDealMutation.isPending}
                  data-testid="button-close"
                >
                  Chiudi
                </Button>
                <Button
                  type="submit"
                  disabled={updateDealMutation.isPending}
                  style={{ background: 'hsl(var(--brand-orange))' }}
                  data-testid="button-save"
                >
                  {updateDealMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salva Modifiche
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
