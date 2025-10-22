import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { LoadingState } from '@w3suite/frontend-kit/components/blocks';
import { useRequiredTenantId } from '@/hooks/useTenantSafety';
import { useCampaignCreationMode } from '@/hooks/useCampaignCreationMode';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Store,
  Route,
  TrendingUp,
  Eye,
  AlertCircle,
  Sparkles,
  Shield,
  Zap,
  RefreshCw,
  Info,
  Workflow,
  Users,
  Bell
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface CampaignWizardProps {
  open: boolean;
  onClose: () => void;
  campaignId?: string | null;
  mode: 'create' | 'edit';
}

// Form schema matching CampaignSettingsDialog
const routingModes = ['automatic', 'manual'] as const;
type RoutingMode = typeof routingModes[number];

const leadSources = ['manual', 'web_form', 'powerful_api', 'landing_page', 'csv_import'] as const;
type LeadSource = typeof leadSources[number];

const campaignFormSchema = z.object({
  name: z.string().min(1, "Nome campagna obbligatorio").max(255),
  description: z.string().optional(),
  objective: z.string().optional(),
  storeId: z.string().uuid("Seleziona un negozio valido"),
  legalEntityId: z.string().uuid().optional(),
  
  // Routing & Workflows Unificato
  routingMode: z.enum(['automatic', 'manual']).optional().nullable(),
  
  // Automatic Mode
  workflowId: z.string().uuid().optional().nullable(),
  fallbackTimeoutSeconds: z.number().int().min(30).max(3600).optional().nullable(),
  fallbackPipelineId1: z.string().uuid().optional().nullable(),
  fallbackPipelineId2: z.string().uuid().optional().nullable(),
  
  // Manual Mode  
  manualPipelineId1: z.string().uuid().optional().nullable(),
  manualPipelineId2: z.string().uuid().optional().nullable(),
  
  // Notifiche
  notifyTeamId: z.string().uuid().optional().nullable(),
  notifyUserIds: z.array(z.string().uuid()).optional().default([]),
  
  // Lead Source & Marketing Channels
  defaultLeadSource: z.enum(leadSources).optional().nullable(),
  landingPageUrl: z.string().url().optional().nullable().or(z.literal('')),
  marketingChannels: z.array(z.string()).optional().default([]),
  
  // UTM Parameters
  utmCampaign: z.string().optional().nullable(),
  
  // Budget & Tracking
  budget: z.number().optional().nullable(),
  
  // Tracking Pixels
  ga4MeasurementId: z.string().max(50).optional().nullable(),
  googleAdsConversionId: z.string().max(50).optional().nullable(),
  facebookPixelId: z.string().max(50).optional().nullable(),
  
  // Dates
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  
  // Status
  isActive: z.boolean().default(true),
  
  // GDPR Consents
  requiredConsents: z.object({
    privacy_policy: z.boolean().default(false),
    marketing: z.boolean().default(false),
    profiling: z.boolean().default(false),
    third_party: z.boolean().default(false),
  }).optional().default({
    privacy_policy: false,
    marketing: false,
    profiling: false,
    third_party: false,
  }),
}).refine(data => {
  if (data.defaultLeadSource === 'landing_page' && !data.landingPageUrl) {
    return false;
  }
  return true;
}, {
  message: "Landing Page URL obbligatorio quando Lead Source è 'Landing Page'",
  path: ['landingPageUrl']
}).refine(data => {
  if (data.routingMode === 'automatic' && !data.workflowId) {
    return false;
  }
  if (data.routingMode === 'manual' && !data.manualPipelineId1) {
    return false;
  }
  return true;
}, {
  message: "Configurazione routing non valida",
  path: ['routingMode']
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

// Stepper Component
function StepIndicator({ 
  currentStep, 
  totalSteps, 
  onStepClick 
}: { 
  currentStep: number; 
  totalSteps: number;
  onStepClick: (step: number) => void;
}) {
  const steps = [
    { number: 1, label: 'Info Base', icon: Store },
    { number: 2, label: 'Routing & Workflows', icon: Workflow },
    { number: 3, label: 'Marketing', icon: TrendingUp },
    { number: 4, label: 'Revisione', icon: Eye }
  ];

  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => {
        const isActive = currentStep === step.number;
        const isCompleted = currentStep > step.number;
        const Icon = step.icon;
        
        return (
          <div key={step.number} className="flex items-center flex-1">
            <button
              onClick={() => onStepClick(step.number)}
              data-testid={`wizard-step-${step.number}`}
              className={`
                flex items-center gap-3 transition-all duration-200
                ${isActive || isCompleted ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
              `}
              disabled={!isActive && !isCompleted}
            >
              <div className={`
                relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                ${isCompleted ? 'bg-gradient-to-br from-windtre-orange to-windtre-purple border-windtre-orange' : ''}
                ${isActive ? 'bg-white dark:bg-gray-800 border-windtre-orange shadow-lg' : ''}
                ${!isActive && !isCompleted ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600' : ''}
              `}>
                {isCompleted ? (
                  <Check className="h-5 w-5 text-white" />
                ) : (
                  <Icon className={`h-5 w-5 ${isActive ? 'text-windtre-orange' : 'text-gray-400'}`} />
                )}
              </div>
              <div className="hidden md:block">
                <div className={`text-xs font-medium ${isActive ? 'text-windtre-orange' : 'text-gray-500 dark:text-gray-400'}`}>
                  Step {step.number}
                </div>
                <div className={`text-sm font-semibold ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                  {step.label}
                </div>
              </div>
            </button>
            {index < steps.length - 1 && (
              <div className={`
                flex-1 h-0.5 mx-2
                ${isCompleted ? 'bg-gradient-to-r from-windtre-orange to-windtre-purple' : 'bg-gray-200 dark:bg-gray-700'}
              `} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CampaignWizard({ open, onClose, campaignId, mode }: CampaignWizardProps) {
  const { toast } = useToast();
  const tenantId = useRequiredTenantId();
  const { currentStep, nextStep, prevStep, goToStep, isFirstStep, isLastStep, totalSteps } = useCampaignCreationMode();

  // Fetch dependencies
  const { data: storesData, isLoading: isLoadingStores } = useQuery({
    queryKey: ['/api/stores'],
    enabled: open,
  });

  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/users'],
    enabled: open,
  });

  const { data: legalEntitiesData } = useQuery({
    queryKey: ['/api/legal-entities'],
    enabled: open,
  });

  const { data: pipelinesData } = useQuery({
    queryKey: ['/api/crm/pipelines'],
    enabled: open,
  });

  const { data: workflowsData } = useQuery({
    queryKey: ['/api/workflows/templates?category=crm'],
    enabled: open,
  });

  const { data: teamsData } = useQuery({
    queryKey: ['/api/teams'],
    enabled: open,
  });

  const { data: marketingChannelsData } = useQuery({
    queryKey: ['/api/crm/marketing-channels'],
    enabled: open,
  });

  // Fetch campaign data if editing
  const { data: campaignData, isLoading: isLoadingCampaign } = useQuery({
    queryKey: [`/api/crm/campaigns/${campaignId}`],
    enabled: mode === 'edit' && !!campaignId && open,
  });

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: '',
      description: '',
      objective: '',
      storeId: '',
      legalEntityId: '',
      routingMode: 'automatic',
      workflowId: null,
      fallbackTimeoutSeconds: 300,
      fallbackPipelineId1: null,
      fallbackPipelineId2: null,
      manualPipelineId1: null,
      manualPipelineId2: null,
      notifyTeamId: null,
      notifyUserIds: [],
      defaultLeadSource: 'web_form',
      landingPageUrl: '',
      marketingChannels: [],
      utmCampaign: '',
      budget: null,
      ga4MeasurementId: null,
      googleAdsConversionId: null,
      facebookPixelId: null,
      startDate: null,
      endDate: null,
      isActive: true,
      requiredConsents: {
        privacy_policy: false,
        marketing: false,
        profiling: false,
        third_party: false,
      },
    },
  });

  // Load campaign data into form when editing
  useEffect(() => {
    if (mode === 'edit' && campaignData?.data) {
      const campaign = campaignData.data;
      form.reset({
        name: campaign.name || '',
        description: campaign.description || '',
        objective: campaign.objective || '',
        storeId: campaign.storeId || '',
        legalEntityId: campaign.legalEntityId || '',
        defaultLeadSource: campaign.defaultLeadSource || 'web_form',
        landingPageUrl: campaign.landingPageUrl || '',
        marketingChannels: campaign.marketingChannels || [],
        utmCampaign: campaign.utmCampaign || '',
        budget: campaign.budget,
        ga4MeasurementId: campaign.ga4MeasurementId,
        googleAdsConversionId: campaign.googleAdsConversionId,
        facebookPixelId: campaign.facebookPixelId,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        isActive: campaign.isActive ?? true,
        requiredConsents: campaign.requiredConsents || {
          privacy_policy: false,
          marketing: false,
          profiling: false,
          third_party: false,
        },
      });
    }
  }, [mode, campaignData, form]);

  // Mutation for creating/updating campaign
  const saveMutation = useMutation({
    mutationFn: async (values: CampaignFormValues) => {
      const endpoint = mode === 'create' 
        ? `/api/crm/${tenantId}/campaigns`
        : `/api/crm/${tenantId}/campaigns/${campaignId}`;
      
      const method = mode === 'create' ? 'POST' : 'PATCH';
      
      return apiRequest(endpoint, {
        method,
        body: JSON.stringify(values),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/campaigns'] });
      toast({
        title: "✅ Successo!",
        description: mode === 'create' 
          ? "Campagna creata con successo" 
          : "Campagna aggiornata con successo",
      });
      onClose();
      form.reset();
      goToStep(1);
    },
    onError: (error: any) => {
      toast({
        title: "❌ Errore",
        description: error?.message || "Impossibile salvare la campagna",
        variant: "destructive",
      });
    },
  });

  const handleNext = async () => {
    // Validate current step before proceeding
    let fieldsToValidate: (keyof CampaignFormValues)[] = [];
    
    switch (currentStep) {
      case 1: // Info Base
        fieldsToValidate = ['name', 'storeId'];
        break;
      case 2: // Routing & Workflows
        fieldsToValidate = ['routingMode'];
        const routingMode = form.getValues('routingMode');
        if (routingMode === 'automatic') {
          fieldsToValidate.push('workflowId');
        } else if (routingMode === 'manual') {
          fieldsToValidate.push('manualPipelineId1');
        }
        break;
      case 3: // Marketing
        fieldsToValidate = ['landingPageUrl', 'marketingChannels'];
        break;
    }

    const isValid = await form.trigger(fieldsToValidate as any);
    
    if (isValid) {
      nextStep();
    } else {
      toast({
        title: "⚠️ Validazione fallita",
        description: "Completa tutti i campi obbligatori prima di continuare",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = form.handleSubmit((values) => {
    saveMutation.mutate(values);
  });

  const stores = storesData?.data || [];
  const users = usersData?.data || [];
  const legalEntities = legalEntitiesData?.data || [];
  const pipelines = pipelinesData?.data || [];
  const workflows = workflowsData?.data || [];
  const teams = teamsData?.data || [];
  const marketingChannels = marketingChannelsData?.data || [];

  // Get selected store for pixel inheritance
  const selectedStoreId = form.watch('storeId');
  const selectedStore = stores.find((s: any) => s.id === selectedStoreId);

  if (isLoadingStores || isLoadingUsers || (mode === 'edit' && isLoadingCampaign)) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <LoadingState message="Caricamento..." />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="campaign-wizard-dialog">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-windtre-orange" />
            <DialogTitle>
              {mode === 'create' ? 'Crea Nuova Campagna' : 'Modifica Campagna'}
            </DialogTitle>
          </div>
          <DialogDescription>
            Guidato passo-passo per creare la tua campagna marketing
          </DialogDescription>
        </DialogHeader>

        <StepIndicator 
          currentStep={currentStep} 
          totalSteps={totalSteps}
          onStepClick={goToStep}
        />

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Info Base */}
            {currentStep === 1 && (
              <div className="space-y-6" data-testid="wizard-step-info">
                <div className="rounded-lg bg-gradient-to-br from-orange-50 to-purple-50 dark:from-orange-950 dark:to-purple-950 p-4 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-windtre-orange flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Informazioni Base</h4>
                      <p className="text-xs text-muted-foreground">
                        Definisci il nome, negozio di riferimento, e periodo della campagna
                      </p>
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Campagna *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="es. Black Friday 2025" 
                          data-testid="input-campaign-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrizione</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Descrivi gli obiettivi della campagna..."
                          rows={3}
                          data-testid="input-campaign-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="storeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Negozio *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-store">
                            <SelectValue placeholder="Seleziona negozio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stores.map((store: any) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.name} - {store.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Il negozio determinerà i tracking pixel ereditati di default
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Inizio</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value || ''}
                            data-testid="input-start-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Fine</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value || ''}
                            data-testid="input-end-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="0.00"
                          data-testid="input-budget"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 2: Routing & Workflows */}
            {currentStep === 2 && (
              <div className="space-y-6" data-testid="wizard-step-routing">
                <div className="rounded-lg bg-gradient-to-br from-orange-50 to-purple-50 dark:from-orange-950 dark:to-purple-950 p-4 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-start gap-3">
                    <Workflow className="h-5 w-5 text-windtre-orange flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Routing & Workflows</h4>
                      <p className="text-xs text-muted-foreground">
                        Configura come i lead vengono gestiti e instradati
                      </p>
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="routingMode"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Modalità di Routing *</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value || 'automatic'}
                          className="flex flex-col space-y-1"
                        >
                          <div className="flex items-center space-x-3 space-y-0 rounded-md border p-4 cursor-pointer hover:border-windtre-orange">
                            <RadioGroupItem value="automatic" data-testid="radio-routing-automatic" />
                            <div className="space-y-1 leading-none">
                              <FormLabel className="cursor-pointer font-medium">
                                Automatico
                              </FormLabel>
                              <FormDescription>
                                I lead vengono assegnati automaticamente tramite workflow
                              </FormDescription>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 space-y-0 rounded-md border p-4 cursor-pointer hover:border-windtre-orange">
                            <RadioGroupItem value="manual" data-testid="radio-routing-manual" />
                            <div className="space-y-1 leading-none">
                              <FormLabel className="cursor-pointer font-medium">
                                Manuale
                              </FormLabel>
                              <FormDescription>
                                I lead vanno in pipeline per gestione manuale
                              </FormDescription>
                            </div>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Automatic Mode Fields */}
                {form.watch('routingMode') === 'automatic' && (
                  <>
                    <FormField
                      control={form.control}
                      name="workflowId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Workflow *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger data-testid="select-workflow">
                                <SelectValue placeholder="Seleziona workflow" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {workflows.map((wf: any) => (
                                <SelectItem key={wf.id} value={wf.id}>
                                  {wf.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Il workflow che gestirà i lead automaticamente
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fallbackTimeoutSeconds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timeout Fallback (secondi)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field}
                              value={field.value || 300}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 300)}
                              min={30}
                              max={3600}
                              data-testid="input-fallback-timeout"
                            />
                          </FormControl>
                          <FormDescription>
                            Tempo di attesa prima di passare alla pipeline fallback (default: 300s)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fallbackPipelineId1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pipeline Fallback 1</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger data-testid="select-fallback-pipeline-1">
                                <SelectValue placeholder="Seleziona pipeline fallback" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">Nessuna</SelectItem>
                              {pipelines.map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Pipeline di backup se il workflow fallisce
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fallbackPipelineId2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pipeline Fallback 2 (opzionale)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger data-testid="select-fallback-pipeline-2">
                                <SelectValue placeholder="Seleziona seconda pipeline fallback" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">Nessuna</SelectItem>
                              {pipelines.map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Seconda pipeline di backup (opzionale)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* Manual Mode Fields */}
                {form.watch('routingMode') === 'manual' && (
                  <>
                    <FormField
                      control={form.control}
                      name="manualPipelineId1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pipeline 1 *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger data-testid="select-manual-pipeline-1">
                                <SelectValue placeholder="Seleziona pipeline principale" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {pipelines.map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Pipeline principale per i lead in gestione manuale
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="manualPipelineId2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pipeline 2 (opzionale)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger data-testid="select-manual-pipeline-2">
                                <SelectValue placeholder="Seleziona seconda pipeline" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">Nessuna</SelectItem>
                              {pipelines.map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Seconda pipeline per segregare i lead (opzionale)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* Notifications (both modes) */}
                <div className="space-y-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Bell className="h-4 w-4 text-windtre-orange" />
                    Notifiche
                  </h4>

                  <FormField
                    control={form.control}
                    name="notifyTeamId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team da Notificare</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-notify-team">
                              <SelectValue placeholder="Seleziona team" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Nessuno</SelectItem>
                            {teams.map((t: any) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Il team riceverà notifiche per nuovi lead
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Marketing & Tracking */}
            {currentStep === 3 && (
              <div className="space-y-6" data-testid="wizard-step-marketing">
                <div className="rounded-lg bg-gradient-to-br from-orange-50 to-purple-50 dark:from-orange-950 dark:to-purple-950 p-4 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-windtre-orange flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Marketing & Tracking</h4>
                      <p className="text-xs text-muted-foreground">
                        Configura origine lead, canali marketing e tracking pixels
                      </p>
                    </div>
                  </div>
                </div>

                <TooltipProvider>
                  <FormField
                    control={form.control}
                    name="defaultLeadSource"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Origine Lead
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Categoria del canale da cui provengono i lead</p>
                            </TooltipContent>
                          </Tooltip>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-lead-source">
                              <SelectValue placeholder="Seleziona origine lead" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="manual">Manuale</SelectItem>
                            <SelectItem value="web_form">Form Web</SelectItem>
                            <SelectItem value="powerful_api">API Powerful</SelectItem>
                            <SelectItem value="landing_page">Landing Page</SelectItem>
                            <SelectItem value="csv_import">Importazione CSV</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TooltipProvider>

                <FormField
                  control={form.control}
                  name="landingPageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Landing Page URL</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ''}
                          placeholder="https://esempio.com/promo"
                          data-testid="input-landing-url"
                        />
                      </FormControl>
                      <FormDescription>
                        URL dove verranno indirizzati i tuoi lead
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <TooltipProvider>
                  <FormField
                    control={form.control}
                    name="marketingChannels"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Canali Marketing
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Canali specifici con tracking UTM attivo</p>
                            </TooltipContent>
                          </Tooltip>
                        </FormLabel>
                        <FormControl>
                          <div className="flex flex-wrap gap-2">
                            {marketingChannels.map((ch: any) => (
                              <label key={ch.id} className="flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:border-windtre-orange">
                                <input
                                  type="checkbox"
                                  checked={(field.value || []).includes(ch.id)}
                                  onChange={(e) => {
                                    const current = field.value || [];
                                    if (e.target.checked) {
                                      field.onChange([...current, ch.id]);
                                    } else {
                                      field.onChange(current.filter((id: string) => id !== ch.id));
                                    }
                                  }}
                                  className="rounded"
                                />
                                <span className="text-sm">{ch.name}</span>
                              </label>
                            ))}
                          </div>
                        </FormControl>
                        <FormDescription>
                          Seleziona i canali marketing da tracciare
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TooltipProvider>

                <FormField
                  control={form.control}
                  name="utmCampaign"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UTM Campaign</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ''}
                          placeholder="black_friday_2025"
                          data-testid="input-utm-campaign"
                        />
                      </FormControl>
                      <FormDescription>
                        Identificativo per tracking UTM automatico
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tracking Pixels with Inheritance */}
                <div className="space-y-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-windtre-orange" />
                    Tracking Pixels
                  </h4>

                  <FormField
                    control={form.control}
                    name="ga4MeasurementId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Google Analytics 4
                          {!field.value && selectedStore?.ga4MeasurementId && (
                            <Badge variant="secondary" className="text-xs">
                              Ereditato da Store
                            </Badge>
                          )}
                        </FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input 
                              {...field} 
                              value={field.value || ''}
                              placeholder={selectedStore?.ga4MeasurementId || "G-XXXXXXXXXX"}
                              data-testid="input-ga4"
                            />
                            {!field.value && selectedStore?.ga4MeasurementId && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => field.onChange(null)}
                                data-testid="button-restore-ga4"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </FormControl>
                        <FormDescription>
                          {!field.value && selectedStore?.ga4MeasurementId 
                            ? `Valore ereditato: ${selectedStore.ga4MeasurementId}`
                            : "Lascia vuoto per ereditare dal negozio"
                          }
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="googleAdsConversionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Google Ads Conversion
                          {!field.value && selectedStore?.googleAdsConversionId && (
                            <Badge variant="secondary" className="text-xs">
                              Ereditato da Store
                            </Badge>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''}
                            placeholder={selectedStore?.googleAdsConversionId || "AW-XXXXXXXXX"}
                            data-testid="input-google-ads"
                          />
                        </FormControl>
                        <FormDescription>
                          {!field.value && selectedStore?.googleAdsConversionId 
                            ? `Valore ereditato: ${selectedStore.googleAdsConversionId}`
                            : "Lascia vuoto per ereditare dal negozio"
                          }
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="facebookPixelId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Facebook Pixel
                          {!field.value && selectedStore?.facebookPixelId && (
                            <Badge variant="secondary" className="text-xs">
                              Ereditato da Store
                            </Badge>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''}
                            placeholder={selectedStore?.facebookPixelId || "XXXXXXXXXXXXXXX"}
                            data-testid="input-facebook-pixel"
                          />
                        </FormControl>
                        <FormDescription>
                          {!field.value && selectedStore?.facebookPixelId 
                            ? `Valore ereditato: ${selectedStore.facebookPixelId}`
                            : "Lascia vuoto per ereditare dal negozio"
                          }
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* GDPR Consents */}
                <div className="space-y-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-500" />
                    Consensi GDPR Richiesti
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Seleziona i consensi che verranno richiesti ai lead di questa campagna
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="requiredConsents.privacy_policy"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-consent-privacy"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0 cursor-pointer">
                            Privacy Policy
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="requiredConsents.marketing"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-consent-marketing"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0 cursor-pointer">
                            Marketing
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="requiredConsents.profiling"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-consent-profiling"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0 cursor-pointer">
                            Profilazione
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="requiredConsents.third_party"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-consent-third-party"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0 cursor-pointer">
                            Terze Parti
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-6" data-testid="wizard-step-review">
                <div className="rounded-lg bg-gradient-to-br from-orange-50 to-purple-50 dark:from-orange-950 dark:to-purple-950 p-4 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-start gap-3">
                    <Eye className="h-5 w-5 text-windtre-orange flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Revisione Finale</h4>
                      <p className="text-xs text-muted-foreground">
                        Controlla i dati e conferma per creare la campagna
                      </p>
                    </div>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="space-y-4">
                  {/* Info Base */}
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Store className="h-4 w-4 text-windtre-orange" />
                      Informazioni Base
                    </h4>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Nome</dt>
                        <dd className="font-medium">{form.watch('name') || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Negozio</dt>
                        <dd className="font-medium">
                          {stores.find((s: any) => s.id === form.watch('storeId'))?.name || '-'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Data Inizio</dt>
                        <dd className="font-medium">{form.watch('startDate') || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Budget</dt>
                        <dd className="font-medium">
                          {form.watch('budget') ? `€${form.watch('budget')}` : '-'}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Routing */}
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Route className="h-4 w-4 text-windtre-purple" />
                      Gestione Lead
                    </h4>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Modalità</dt>
                        <dd className="font-medium">
                          {form.watch('routingMode') === 'automatic' ? 'Automatico' : 'Manuale'}
                        </dd>
                      </div>
                      {form.watch('routingMode') === 'automatic' && form.watch('autoAssignmentUserId') && (
                        <div>
                          <dt className="text-muted-foreground">Assegnato a</dt>
                          <dd className="font-medium">
                            {users.find((u: any) => u.id === form.watch('autoAssignmentUserId'))?.fullName || '-'}
                          </dd>
                        </div>
                      )}
                      {hasManualFallback && (
                        <div>
                          <dt className="text-muted-foreground">Fallback Timeout</dt>
                          <dd className="font-medium">
                            {form.watch('manualReviewTimeoutHours')} ore
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Marketing */}
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Marketing & Tracking
                    </h4>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Landing Page</dt>
                        <dd className="font-medium break-all">{form.watch('landingPageUrl') || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">UTM Campaign</dt>
                        <dd className="font-medium">{form.watch('utmCampaign') || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Tracking Pixels</dt>
                        <dd className="font-medium">
                          {form.watch('ga4MeasurementId') && <Badge variant="outline" className="mr-1">GA4</Badge>}
                          {form.watch('googleAdsConversionId') && <Badge variant="outline" className="mr-1">Google Ads</Badge>}
                          {form.watch('facebookPixelId') && <Badge variant="outline">Facebook</Badge>}
                          {!form.watch('ga4MeasurementId') && !form.watch('googleAdsConversionId') && !form.watch('facebookPixelId') && '-'}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* GDPR */}
                  {Object.values(form.watch('requiredConsents') || {}).some(Boolean) && (
                    <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-4">
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-500" />
                        Consensi GDPR Richiesti
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {form.watch('requiredConsents')?.privacy_policy && (
                          <Badge variant="outline" className="bg-white dark:bg-gray-800">
                            <Check className="h-3 w-3 mr-1 text-green-500" />
                            Privacy Policy
                          </Badge>
                        )}
                        {form.watch('requiredConsents')?.marketing && (
                          <Badge variant="outline" className="bg-white dark:bg-gray-800">
                            <Check className="h-3 w-3 mr-1 text-green-500" />
                            Marketing
                          </Badge>
                        )}
                        {form.watch('requiredConsents')?.profiling && (
                          <Badge variant="outline" className="bg-white dark:bg-gray-800">
                            <Check className="h-3 w-3 mr-1 text-green-500" />
                            Profilazione
                          </Badge>
                        )}
                        {form.watch('requiredConsents')?.third_party && (
                          <Badge variant="outline" className="bg-white dark:bg-gray-800">
                            <Check className="h-3 w-3 mr-1 text-green-500" />
                            Terze Parti
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {saveMutation.isError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {(saveMutation.error as any)?.message || 'Errore durante il salvataggio'}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={isFirstStep || saveMutation.isPending}
                data-testid="button-wizard-prev"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Indietro
              </Button>

              {!isLastStep ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={saveMutation.isPending}
                  data-testid="button-wizard-next"
                >
                  Avanti
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  data-testid="button-wizard-submit"
                  className="bg-gradient-to-r from-windtre-orange to-windtre-purple text-white"
                >
                  {saveMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {mode === 'create' ? 'Crea Campagna' : 'Salva Modifiche'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
