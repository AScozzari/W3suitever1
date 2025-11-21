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
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// TypeScript interfaces for API responses
interface Pipeline {
  id: string;
  name: string;
  driver: string;
  stages: Array<{ id: string; name: string; order: number }>;
  storeId?: string;
}

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  personId: string;
}

interface Driver {
  id: string;
  name: string;
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
  ownerUserId: z.string().min(1, 'Owner richiesto'),
  leadId: z.string().optional(),
  personId: z.string().optional(),
  estimatedValue: z.string().min(1, 'Valore stimato richiesto'),
  probability: z.string().min(0).max(100).default('50'),
  driverId: z.string().optional(),
});

type DealFormData = z.infer<typeof dealFormSchema>;

interface CreateDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedLeadId?: string;
  preselectedPipelineId?: string;
  inheritedStoreId?: string;
  defaultOwnerId?: string;
}

export function CreateDealDialog({ 
  open, 
  onOpenChange, 
  preselectedLeadId,
  preselectedPipelineId,
  inheritedStoreId,
  defaultOwnerId
}: CreateDealDialogProps) {
  const { toast } = useToast();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');

  const form = useForm<DealFormData>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      pipelineId: '',
      stage: '',
      storeId: inheritedStoreId || '',
      ownerUserId: defaultOwnerId || '',
      leadId: preselectedLeadId || '',
      personId: '',
      estimatedValue: '',
      probability: '50',
      driverId: '',
    },
  });

  // Fetch pipelines
  const { data: pipelines } = useQuery<ApiResponse<Pipeline[]>>({
    queryKey: ['/api/crm/pipelines'],
    enabled: open,
  });

  // Fetch leads for selection
  const { data: leads } = useQuery<ApiResponse<Lead[]>>({
    queryKey: ['/api/crm/leads'],
    enabled: open,
  });

  // Fetch drivers
  const { data: drivers } = useQuery<ApiResponse<Driver[]>>({
    queryKey: ['/api/drivers'],
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
  const selectedPipeline = pipelines?.data?.find(p => p.id === selectedPipelineId);
  const stages = selectedPipeline?.stages || [];

  // Auto-populate context values from parent view
  useEffect(() => {
    if (preselectedLeadId) {
      form.setValue('leadId', preselectedLeadId);
    }
    if (preselectedPipelineId) {
      form.setValue('pipelineId', preselectedPipelineId);
      setSelectedPipelineId(preselectedPipelineId);
    }
    if (inheritedStoreId) {
      form.setValue('storeId', inheritedStoreId);
    }
    if (defaultOwnerId) {
      form.setValue('ownerUserId', defaultOwnerId);
    }
  }, [preselectedLeadId, preselectedPipelineId, inheritedStoreId, defaultOwnerId, form]);

  // Create deal mutation
  const createDealMutation = useMutation({
    mutationFn: async (data: DealFormData) => {
      // Convert "none" to null for optional fields
      const leadId = data.leadId === 'none' ? null : data.leadId;
      const driverId = data.driverId === 'none' ? null : data.driverId;
      
      // If personId is provided, use it; otherwise backend will get it from lead
      const payload: any = {
        ...data,
        leadId,
        driverId,
        estimatedValue: parseFloat(data.estimatedValue),
        probability: parseInt(data.probability),
        status: 'open',
        dealCreationSource: 'manual',
        storeId: inheritedStoreId || data.storeId,
        ownerUserId: defaultOwnerId || data.ownerUserId,
      };
      
      // Include personId if provided (for manual creation without lead)
      if (data.personId) {
        payload.personId = data.personId;
      }
      
      return await apiRequest('/api/crm/deals', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/deals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/pipeline'] });
      toast({
        title: 'Deal creato',
        description: 'Il deal è stato creato con successo.',
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error.message || 'Impossibile creare il deal.',
      });
    },
  });

  const onSubmit = (data: DealFormData) => {
    createDealMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Crea Nuovo Deal</DialogTitle>
          <DialogDescription>
            Inserisci i dati del nuovo deal. Seleziona pipeline e stage.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Pipeline Selection */}
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
                      form.setValue('stage', ''); // Reset stage when pipeline changes
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-pipeline">
                        <SelectValue placeholder="Seleziona pipeline" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      {pipelines?.data?.map(pipeline => (
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

            {/* Stage Selection */}
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
                      <SelectTrigger data-testid="select-stage">
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-store">
                        <SelectValue placeholder="Seleziona store" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      {stores?.data?.map(store => (
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

            {/* Owner Selection */}
            <FormField
              control={form.control}
              name="ownerUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-owner">
                        <SelectValue placeholder="Seleziona owner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      {users?.data?.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.firstName} {user.lastName} - {user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Lead Association */}
            <FormField
              control={form.control}
              name="leadId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead Associato</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-lead">
                        <SelectValue placeholder="Seleziona lead (opzionale)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      <SelectItem value="none">Nessun lead</SelectItem>
                      {leads?.data?.map(lead => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.firstName} {lead.lastName} - {lead.companyName || 'Privato'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder="1000.00"
                        data-testid="input-value"
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
                    <FormLabel>Probabilità (%)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        max="100"
                        placeholder="50"
                        data-testid="input-probability"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Driver */}
            <FormField
              control={form.control}
              name="driverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Driver (Opzionale)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-driver">
                        <SelectValue placeholder="Seleziona driver" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      <SelectItem value="none">Nessun driver</SelectItem>
                      {drivers?.data?.map(driver => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createDealMutation.isPending}
                data-testid="button-cancel"
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={createDealMutation.isPending}
                style={{ background: 'hsl(var(--brand-orange))' }}
                data-testid="button-submit"
              >
                {createDealMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Crea Deal
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
