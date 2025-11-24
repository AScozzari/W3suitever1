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
  estimatedValue: z.string().min(1, 'Valore stimato richiesto'),
  probability: z.string().min('0').max('100'),
});

type DealFormData = z.infer<typeof dealFormSchema>;

interface ViewEditDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal | null;
  pipelineId: string;
}

export function ViewEditDealDialog({ 
  open, 
  onOpenChange, 
  deal,
  pipelineId
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
    },
  });

  // Fetch pipelines
  const { data: pipelines } = useQuery<ApiResponse<Pipeline[]>>({
    queryKey: ['/api/crm/pipelines'],
    enabled: open,
  });

  // Fetch stores
  const { data: stores } = useQuery<ApiResponse<Store[]>>({
    queryKey: ['/api/stores'],
    enabled: open,
  });

  // Fetch users for owner selection
  const { data: users } = useQuery<ApiResponse<User[]>>({
    queryKey: ['/api/users'],
    enabled: open,
  });

  // Get stages for selected pipeline
  const selectedPipeline = pipelines?.find(p => p.id === selectedPipelineId);
  const stages = selectedPipeline?.stages || [];

  // Populate form with deal data
  useEffect(() => {
    if (deal && open) {
      form.reset({
        pipelineId: deal.pipelineId,
        stage: deal.stage,
        storeId: deal.storeId,
        ownerUserId: deal.ownerUserId,
        estimatedValue: deal.estimatedValue?.toString() || '',
        probability: deal.probability?.toString() || '50',
      });
      setSelectedPipelineId(deal.pipelineId);
      setEditMode(false);
    }
  }, [deal, open, form]);

  // Update deal mutation
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
    if (editMode) {
      // Cancel editing - reset form
      if (deal) {
        form.reset({
          pipelineId: deal.pipelineId,
          stage: deal.stage,
          storeId: deal.storeId,
          ownerUserId: deal.ownerUserId,
          estimatedValue: deal.estimatedValue?.toString() || '',
          probability: deal.probability?.toString() || '50',
        });
      }
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Customer Info (Read-only) */}
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

            {/* Pipeline Selection */}
            <FormField
              control={form.control}
              name="pipelineId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pipeline *</FormLabel>
                  {editMode ? (
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedPipelineId(value);
                        form.setValue('stage', '');
                      }}
                      value={field.value}
                      disabled={!editMode}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona pipeline" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper">
                        {pipelines?.map(pipeline => (
                          <SelectItem key={pipeline.id} value={pipeline.id}>
                            {pipeline.name} ({pipeline.driver})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm font-medium p-2 bg-muted rounded-md">
                      {pipelines?.find(p => p.id === field.value)?.name || 'N/A'}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Stage Selection */}
            <FormField
              control={form.control}
              name="stage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stage *</FormLabel>
                  {editMode ? (
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
                      <SelectContent position="popper">
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm font-medium p-2 bg-muted rounded-md">
                      {field.value}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Store Selection */}
            <FormField
              control={form.control}
              name="storeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store *</FormLabel>
                  {editMode ? (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona store" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper">
                        {stores?.map(store => (
                          <SelectItem key={store.id} value={store.id}>
                            {store.name} ({store.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm font-medium p-2 bg-muted rounded-md">
                      {stores?.find(s => s.id === field.value)?.name || 'N/A'}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Owner Selection */}
            <FormField
              control={form.control}
              name="ownerUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assegnato *</FormLabel>
                  {editMode ? (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona assegnato" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper">
                        {users?.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm font-medium p-2 bg-muted rounded-md">
                      {deal.ownerName || 'Non assegnato'}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Value & Probability */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="estimatedValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valore Stimato (€) *</FormLabel>
                    {editMode ? (
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="1000.00"
                        />
                      </FormControl>
                    ) : (
                      <div className="text-sm font-medium p-2 bg-muted rounded-md">
                        €{parseFloat(field.value || '0').toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="probability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Probabilità (%)</FormLabel>
                    {editMode ? (
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          max="100"
                          placeholder="50"
                        />
                      </FormControl>
                    ) : (
                      <div className="text-sm font-medium p-2 bg-muted rounded-md">
                        {field.value}%
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Metadata (Read-only) */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-sm">Informazioni Aggiuntive</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Creata il:</span>{' '}
                  <span className="font-medium">
                    {new Date(deal.createdAt).toLocaleDateString('it-IT')}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Aggiornata il:</span>{' '}
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
                disabled={updateDealMutation.isPending}
                data-testid="button-close"
              >
                Chiudi
              </Button>
              {editMode && (
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
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
