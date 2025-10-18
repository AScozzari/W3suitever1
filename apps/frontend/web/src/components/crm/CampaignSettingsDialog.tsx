import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { LeadStatusSettingsDialog } from './LeadStatusSettingsDialog';
import { 
  Settings2, 
  Target, 
  Route, 
  Workflow, 
  TrendingUp, 
  Wrench,
  Save,
  AlertCircle,
  Shield,
  ListTodo
} from 'lucide-react';

interface CampaignSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  campaignId?: string | null;
  mode: 'create' | 'edit';
}

// Campaign routing mode enum
const routingModes = ['automatic', 'manual', 'hybrid'] as const;
type RoutingMode = typeof routingModes[number];

// Lead source enum (matches backend)
const leadSources = ['manual', 'web_form', 'powerful_api', 'landing_page', 'csv_import'] as const;
type LeadSource = typeof leadSources[number];

// Form schema with validation
const campaignFormSchema = z.object({
  name: z.string().min(1, "Nome campagna obbligatorio").max(255),
  description: z.string().optional(),
  objective: z.string().optional(),
  storeId: z.string().uuid("Seleziona un negozio valido"),
  legalEntityId: z.string().uuid().optional(),
  driverIds: z.array(z.string().uuid()).optional().default([]),
  
  // Routing settings
  routingMode: z.enum(routingModes),
  autoAssignmentUserId: z.string().uuid().optional().nullable(),
  autoAssignmentTeamId: z.string().uuid().optional().nullable(),
  manualReviewTimeoutHours: z.number().int().min(1).max(168).optional().nullable(),
  
  // Workflow & Pipelines
  workflowId: z.string().uuid().optional().nullable(),
  primaryPipelineId: z.string().uuid().optional().nullable(),
  secondaryPipelineId: z.string().uuid().optional().nullable(),
  
  // Lead Source & Marketing Channels
  defaultLeadSource: z.enum(leadSources).optional().nullable(),
  landingPageUrl: z.string().url().optional().nullable().or(z.literal('')),
  marketingChannels: z.array(z.string()).optional().default([]),
  
  // UTM Parameters
  utmCampaign: z.string().optional().nullable(),
  
  // Budget & Tracking
  budget: z.number().optional().nullable(),
  actualSpent: z.number().optional().nullable(),
  
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
  // If routing mode is automatic, require either user or team assignment
  if (data.routingMode === 'automatic' && !data.autoAssignmentUserId && !data.autoAssignmentTeamId) {
    return false;
  }
  return true;
}, {
  message: "Modalità automatica richiede assegnazione a utente o team",
  path: ['autoAssignmentUserId']
}).refine(data => {
  // If routing mode is hybrid, timeout is required
  if (data.routingMode === 'hybrid' && !data.manualReviewTimeoutHours) {
    return false;
  }
  return true;
}, {
  message: "Modalità ibrida richiede timeout per revisione manuale",
  path: ['manualReviewTimeoutHours']
}).refine(data => {
  // If lead source is landing_page, URL is required
  if (data.defaultLeadSource === 'landing_page' && !data.landingPageUrl) {
    return false;
  }
  return true;
}, {
  message: "Landing Page URL obbligatorio quando Lead Source è 'Landing Page'",
  path: ['landingPageUrl']
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

// WindTre Driver Colors Mapping (8 drivers esatti del sistema)
const DRIVER_COLORS: Record<string, string> = {
  'FISSO': 'hsl(24, 100%, 52%)',          // WindTre Orange
  'MOBILE': 'hsl(271, 56%, 46%)',         // WindTre Purple  
  'DEVICE': 'hsl(200, 70%, 50%)',         // Blue
  'ACCESSORI': 'hsl(142, 76%, 36%)',      // Green
  'ASSICURAZIONE': 'hsl(45, 100%, 51%)',  // Gold
  'PROTEZIONE': 'hsl(0, 84%, 60%)',       // Red
  'ENERGIA': 'hsl(280, 65%, 60%)',        // Light Purple
  'CUSTOMER_BASE': 'hsl(220, 90%, 56%)',  // Sky Blue
};

export function CampaignSettingsDialog({ open, onClose, campaignId, mode }: CampaignSettingsDialogProps) {
  const { toast } = useToast();
  const tenantId = useRequiredTenantId();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  // Reset nested dialog when parent closes
  useEffect(() => {
    if (!open) {
      setStatusDialogOpen(false);
    }
  }, [open]);

  // Fetch campaign data (edit mode only)
  const { data: campaign, isLoading: campaignLoading } = useQuery({
    queryKey: [`/api/crm/campaigns/${campaignId}`],
    enabled: open && mode === 'edit' && !!campaignId,
  });

  // Fetch dropdown data
  const { data: stores = [] } = useQuery({
    queryKey: ['/api/stores'],
    enabled: open,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['/api/drivers'],
    enabled: open,
  });

  const { data: pipelines = [] } = useQuery({
    queryKey: ['/api/crm/pipelines'],
    enabled: open,
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ['/api/workflows/templates?category=crm'],
    enabled: open,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: open,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['/api/teams'],
    enabled: open,
  });

  // Load marketing channels from DB
  const { data: marketingChannels = [] } = useQuery({
    queryKey: ['/api/crm/marketing-channels'],
    enabled: open,
  });

  const { data: utmMappings = [] } = useQuery({
    queryKey: ['/api/crm/marketing-channels/utm-mappings'],
    enabled: open,
  });

  // Initialize form
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: '',
      description: '',
      objective: '',
      storeId: '',
      legalEntityId: undefined,
      driverIds: [],
      routingMode: 'manual',
      autoAssignmentUserId: null,
      autoAssignmentTeamId: null,
      manualReviewTimeoutHours: 24,
      workflowId: null,
      primaryPipelineId: null,
      secondaryPipelineId: null,
      defaultLeadSource: null,
      landingPageUrl: '',
      utmCampaign: null,
      marketingChannels: [],
      budget: null,
      actualSpent: null,
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

  // Calculate suggested UTM values based on selected marketing channels
  const selectedChannelCodes = form.watch('marketingChannels') || [];
  const suggestedUtmValues = selectedChannelCodes.length > 0
    ? (() => {
        // Find first channel with UTM generation enabled
        const firstCode = selectedChannelCodes[0];
        const channel = (marketingChannels as any[]).find((ch: any) => ch.code === firstCode && ch.generatesUtm);
        if (channel) {
          const mapping = (utmMappings as any[]).find((m: any) => m.marketingChannelId === channel.id);
          if (mapping) {
            return {
              source: mapping.suggestedUtmSource,
              medium: mapping.suggestedUtmMedium,
            };
          }
        }
        return null;
      })()
    : null;

  // Update form when campaign data loads (edit mode)
  useEffect(() => {
    if (campaign && mode === 'edit') {
      form.reset({
        name: campaign.name || '',
        description: campaign.description || '',
        objective: campaign.objective || '',
        storeId: campaign.storeId || '',
        legalEntityId: campaign.legalEntityId || undefined,
        driverIds: campaign.driverIds || [],
        routingMode: campaign.routingMode || 'manual',
        autoAssignmentUserId: campaign.autoAssignmentUserId || null,
        autoAssignmentTeamId: campaign.autoAssignmentTeamId || null,
        manualReviewTimeoutHours: campaign.manualReviewTimeoutHours || 24,
        workflowId: campaign.workflowId || null,
        primaryPipelineId: campaign.primaryPipelineId || null,
        secondaryPipelineId: campaign.secondaryPipelineId || null,
        defaultLeadSource: campaign.defaultLeadSource || null,
        landingPageUrl: campaign.landingPageUrl || '',
        utmCampaign: campaign.utmCampaign || null,
        marketingChannels: campaign.marketingChannels || [],
        budget: campaign.budget || null,
        actualSpent: campaign.actualSpent || null,
        startDate: campaign.startDate ? campaign.startDate.split('T')[0] : null,
        endDate: campaign.endDate ? campaign.endDate.split('T')[0] : null,
        isActive: campaign.isActive ?? true,
        requiredConsents: campaign.requiredConsents || {
          privacy_policy: false,
          marketing: false,
          profiling: false,
          third_party: false,
        },
      });
    }
  }, [campaign, mode, form]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CampaignFormValues) => {
      // Get legalEntityId from selected store
      const store = stores.find((s: any) => s.id === data.storeId);
      const payload = {
        ...data,
        legalEntityId: store?.legalEntityId,
        tenantId: store?.tenantId,
      };
      return apiRequest('/api/crm/campaigns', {
        method: 'POST',
        body: payload,
      });
    },
    onSuccess: () => {
      toast({
        title: "Campagna creata",
        description: "La campagna è stata creata con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/campaigns'] });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error?.message || "Impossibile creare la campagna",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: CampaignFormValues) => {
      return apiRequest(`/api/crm/campaigns/${campaignId}`, {
        method: 'PATCH',
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Campagna aggiornata",
        description: "Le modifiche sono state salvate con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/campaigns'] });
      queryClient.invalidateQueries({ queryKey: [`/api/crm/campaigns/${campaignId}`] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error?.message || "Impossibile aggiornare la campagna",
        variant: "destructive",
      });
    },
  });

  // Form submit
  const onSubmit = (data: CampaignFormValues) => {
    if (mode === 'create') {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  const isLoading = campaignLoading || createMutation.isPending || updateMutation.isPending;
  const selectedRoutingMode = form.watch('routingMode');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {mode === 'create' ? 'Nuova Campagna' : 'Modifica Campagna'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Configura una nuova campagna marketing con routing automatico e workflow integrati'
              : 'Modifica le impostazioni della campagna marketing'}
          </DialogDescription>
        </DialogHeader>

        {campaignLoading && mode === 'edit' ? (
          <LoadingState message="Caricamento campagna..." />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid grid-cols-8 w-full">
                  <TabsTrigger value="general" data-testid="tab-general">
                    <Settings2 className="h-4 w-4 mr-1" />
                    Generale
                  </TabsTrigger>
                  <TabsTrigger value="targeting" data-testid="tab-targeting">
                    <Target className="h-4 w-4 mr-1" />
                    Tracking
                  </TabsTrigger>
                  <TabsTrigger value="routing" data-testid="tab-routing">
                    <Route className="h-4 w-4 mr-1" />
                    Routing
                  </TabsTrigger>
                  <TabsTrigger value="workflow" data-testid="tab-workflow">
                    <Workflow className="h-4 w-4 mr-1" />
                    Workflow
                  </TabsTrigger>
                  <TabsTrigger value="lead-statuses" data-testid="tab-lead-statuses" disabled={mode === 'create'}>
                    <ListTodo className="h-4 w-4 mr-1" />
                    Stati Lead
                  </TabsTrigger>
                  <TabsTrigger value="privacy" data-testid="tab-privacy">
                    <Shield className="h-4 w-4 mr-1" />
                    Privacy
                  </TabsTrigger>
                  <TabsTrigger value="tracking" data-testid="tab-tracking">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Obiettivi
                  </TabsTrigger>
                  <TabsTrigger value="advanced" data-testid="tab-advanced">
                    <Wrench className="h-4 w-4 mr-1" />
                    Avanzate
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: GENERALE */}
                <TabsContent value="general" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Campagna *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Es: Promo Black Friday 2025" data-testid="input-campaign-name" />
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
                          <Textarea {...field} rows={3} placeholder="Descrizione della campagna..." data-testid="textarea-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="objective"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Obiettivo</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Es: Acquisizione lead" data-testid="input-objective" />
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
                        <Select onValueChange={field.onChange} value={field.value} disabled={mode === 'edit'}>
                          <FormControl>
                            <SelectTrigger data-testid="select-store">
                              <SelectValue placeholder="Seleziona negozio" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {stores.map((store: any) => (
                              <SelectItem key={store.id} value={store.id}>
                                {store.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {mode === 'create' && <AlertCircle className="inline h-3 w-3 mr-1" />}
                          Tutte le campagne sono store-scoped
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="driverIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Driver Target (Multi-selezione)</FormLabel>
                        <FormDescription className="mb-3">
                          Seleziona uno o più driver per questa campagna
                        </FormDescription>
                        <div className="grid grid-cols-2 gap-3">
                          {drivers.map((driver: any) => {
                            const isChecked = field.value?.includes(driver.id) || false;
                            const driverColor = DRIVER_COLORS[driver.name] || 'hsl(var(--brand-orange))';
                            
                            return (
                              <div
                                key={driver.id}
                                className="flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer"
                                style={{
                                  background: isChecked ? 'var(--glass-card-bg)' : 'transparent',
                                  borderColor: isChecked ? driverColor : 'var(--glass-card-border)',
                                  borderWidth: isChecked ? '2px' : '1px'
                                }}
                                onClick={() => {
                                  const currentValue = field.value || [];
                                  const newValue = isChecked
                                    ? currentValue.filter((id: string) => id !== driver.id)
                                    : [...currentValue, driver.id];
                                  field.onChange(newValue);
                                }}
                                data-testid={`checkbox-driver-${driver.name.toLowerCase()}`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    const newValue = checked
                                      ? [...currentValue, driver.id]
                                      : currentValue.filter((id: string) => id !== driver.id);
                                    field.onChange(newValue);
                                  }}
                                  style={{ borderColor: driverColor }}
                                />
                                <div className="flex items-center gap-2 flex-1">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: driverColor }}
                                  />
                                  <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                    {driver.name}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Campagna Attiva</FormLabel>
                          <FormDescription>
                            Attiva o disattiva la campagna
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-is-active"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* TAB 2: TARGETING */}
                <TabsContent value="targeting" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="defaultLeadSource"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lead Source (Origine Lead Predefinita)</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || undefined}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-default-lead-source">
                              <SelectValue placeholder="Seleziona l'origine dei lead" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="manual">Manuale</SelectItem>
                            <SelectItem value="web_form">Form Web</SelectItem>
                            <SelectItem value="landing_page">Landing Page</SelectItem>
                            <SelectItem value="powerful_api">Powerful API</SelectItem>
                            <SelectItem value="csv_import">Import CSV</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Origine predefinita dei lead acquisiti da questa campagna
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                            placeholder="https://esempio.com/landing" 
                            data-testid="input-landing-page-url" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
                    <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Canali Marketing & UTM Tracking
                    </h4>
                    <p className="text-xs text-orange-700 dark:text-orange-300 mb-4">
                      Seleziona i canali marketing da attivare. Il sistema genererà automaticamente link UTM per ogni canale.
                    </p>

                    <FormField
                      control={form.control}
                      name="marketingChannels"
                      render={({ field }) => {
                        const digitalChannels = (marketingChannels as any[]).filter(ch => ch.category === 'digital' && ch.active);
                        const traditionalChannels = (marketingChannels as any[]).filter(ch => ch.category === 'traditional' && ch.active);
                        const directChannels = (marketingChannels as any[]).filter(ch => ch.category === 'direct' && ch.active);
                        
                        return (
                          <FormItem>
                            <FormLabel>Canali Marketing Attivi *</FormLabel>
                            
                            {/* Digital Channels (con generazione UTM) */}
                            {digitalChannels.length > 0 && (
                              <div className="mb-4">
                                <h5 className="text-sm font-semibold text-orange-700 dark:text-orange-300 mb-2 flex items-center gap-2">
                                  🌐 Canali Digitali (con UTM)
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {digitalChannels.map((channel: any) => (
                                    <div key={channel.code} className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={field.value?.includes(channel.code)}
                                        onCheckedChange={(checked) => {
                                          const current = field.value || [];
                                          const updated = checked
                                            ? [...current, channel.code]
                                            : current.filter((code: string) => code !== channel.code);
                                          field.onChange(updated);
                                        }}
                                        data-testid={`checkbox-channel-${channel.code}`}
                                      />
                                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {channel.name}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Traditional Channels (tracking only) */}
                            {traditionalChannels.length > 0 && (
                              <div className="mb-4">
                                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                  📺 Canali Tradizionali (tracking)
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {traditionalChannels.map((channel: any) => (
                                    <div key={channel.code} className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={field.value?.includes(channel.code)}
                                        onCheckedChange={(checked) => {
                                          const current = field.value || [];
                                          const updated = checked
                                            ? [...current, channel.code]
                                            : current.filter((code: string) => code !== channel.code);
                                          field.onChange(updated);
                                        }}
                                        data-testid={`checkbox-channel-${channel.code}`}
                                      />
                                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {channel.name}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Direct Channels (tracking only) */}
                            {directChannels.length > 0 && (
                              <div className="mb-4">
                                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                  🤝 Canali Diretti (tracking)
                                </h5>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {directChannels.map((channel: any) => (
                                    <div key={channel.code} className="flex items-center space-x-2">
                                      <Checkbox
                                        checked={field.value?.includes(channel.code)}
                                        onCheckedChange={(checked) => {
                                          const current = field.value || [];
                                          const updated = checked
                                            ? [...current, channel.code]
                                            : current.filter((code: string) => code !== channel.code);
                                          field.onChange(updated);
                                        }}
                                        data-testid={`checkbox-channel-${channel.code}`}
                                      />
                                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {channel.name}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <FormDescription className="text-xs mt-2">
                              {field.value && field.value.length > 0 ? (
                                <span className="text-orange-600 dark:text-orange-400 font-medium">
                                  ✅ {field.value.length} canale{field.value.length > 1 ? 'i' : ''} selezionato{field.value.length > 1 ? 'i' : ''} - Link UTM saranno generati dopo il salvataggio per i canali digitali
                                </span>
                              ) : (
                                "Seleziona almeno un canale marketing per questa campagna"
                              )}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />

                    <FormField
                      control={form.control}
                      name="utmCampaign"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Nome Campagna UTM *</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value || ''} 
                              placeholder="promo_black_friday_2025" 
                              data-testid="input-utm-campaign" 
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Nome univoco per identificare questa campagna (usato in tutti i canali)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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
                </TabsContent>

                {/* TAB 3: ROUTING */}
                <TabsContent value="routing" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="routingMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modalità Routing *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-routing-mode">
                              <SelectValue placeholder="Seleziona modalità" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="automatic">Automatico - Assegnazione immediata</SelectItem>
                            <SelectItem value="manual">Manuale - Revisione completa</SelectItem>
                            <SelectItem value="hybrid">Ibrido - Auto con fallback manuale</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Determina come i lead vengono assegnati ai team/utenti
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {(selectedRoutingMode === 'automatic' || selectedRoutingMode === 'hybrid') && (
                    <>
                      <FormField
                        control={form.control}
                        name="autoAssignmentUserId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assegna a Utente</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger data-testid="select-auto-assign-user">
                                  <SelectValue placeholder="Seleziona utente" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">Nessuno</SelectItem>
                                {users.map((user: any) => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.displayName || user.email}
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
                        name="autoAssignmentTeamId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assegna a Team</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger data-testid="select-auto-assign-team">
                                  <SelectValue placeholder="Seleziona team" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">Nessuno</SelectItem>
                                {teams
                                  .filter((team: any) => team.assignedDepartments?.includes('crm'))
                                  .map((team: any) => (
                                    <SelectItem key={team.id} value={team.id}>
                                      {team.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {selectedRoutingMode === 'hybrid' && (
                    <FormField
                      control={form.control}
                      name="manualReviewTimeoutHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timeout Revisione Manuale (ore) *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              value={field.value || ''} 
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                              min={1}
                              max={168}
                              data-testid="input-timeout-hours" 
                            />
                          </FormControl>
                          <FormDescription>
                            Se un lead non viene gestito entro queste ore, viene assegnato automaticamente
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </TabsContent>

                {/* TAB 4: WORKFLOW */}
                <TabsContent value="workflow" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="workflowId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Workflow Automazione</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-workflow">
                              <SelectValue placeholder="Seleziona workflow" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nessuno</SelectItem>
                            {workflows.map((workflow: any) => (
                              <SelectItem key={workflow.id} value={workflow.id}>
                                {workflow.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Workflow che gestisce automaticamente i lead in ingresso
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="primaryPipelineId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pipeline Primaria</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-primary-pipeline">
                              <SelectValue placeholder="Seleziona pipeline" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nessuna</SelectItem>
                            {pipelines.map((pipeline: any) => (
                              <SelectItem key={pipeline.id} value={pipeline.id}>
                                {pipeline.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Pipeline principale per i lead di questa campagna
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="secondaryPipelineId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pipeline Secondaria</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-secondary-pipeline">
                              <SelectValue placeholder="Seleziona pipeline" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nessuna</SelectItem>
                            {pipelines.map((pipeline: any) => (
                              <SelectItem key={pipeline.id} value={pipeline.id}>
                                {pipeline.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Pipeline alternativa per routing avanzato
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* TAB 5: PRIVACY & GDPR */}
                <TabsContent value="privacy" className="space-y-4 mt-4">
                  <div className="space-y-1 mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Shield className="h-5 w-5 text-green-600" />
                      Consensi GDPR Richiesti
                    </h3>
                    <p className="text-sm text-gray-600">
                      Configura quali consensi privacy sono richiesti per i lead di questa campagna
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="requiredConsents.privacy_policy"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-semibold">
                            Informativa Privacy
                          </FormLabel>
                          <FormDescription>
                            Consenso obbligatorio al trattamento dati personali secondo GDPR Art. 13
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-consent-privacy-policy"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requiredConsents.marketing"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-semibold">
                            Consenso Marketing
                          </FormLabel>
                          <FormDescription>
                            Consenso per attività di marketing e comunicazioni promozionali
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-consent-marketing"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requiredConsents.profiling"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-semibold">
                            Consenso Profilazione
                          </FormLabel>
                          <FormDescription>
                            Consenso per profilazione e analisi comportamentale degli utenti
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-consent-profiling"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requiredConsents.third_party"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-semibold">
                            Consenso Terze Parti
                          </FormLabel>
                          <FormDescription>
                            Consenso per condivisione dati con partner e fornitori terzi
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-consent-third-party"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Nota:</strong> I consensi selezionati saranno richiesti durante la creazione di nuovi lead. 
                      I lead senza consensi richiesti potrebbero essere soggetti a restrizioni nel trattamento.
                    </p>
                  </div>
                </TabsContent>

                {/* TAB 6: TRACKING */}
                <TabsContent value="tracking" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget (€)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            value={field.value || ''} 
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            step="0.01"
                            min={0}
                            placeholder="0.00"
                            data-testid="input-budget" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="actualSpent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Spesa Effettiva (€)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            value={field.value || ''} 
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            step="0.01"
                            min={0}
                            placeholder="0.00"
                            data-testid="input-actual-spent" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="rounded-lg border p-4 bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      Le metriche lead, deal e revenue vengono calcolate automaticamente dal sistema.
                    </p>
                  </div>
                </TabsContent>

                {/* TAB 6: AVANZATE */}
                <TabsContent value="advanced" className="space-y-4 mt-4">
                  <div className="rounded-lg border p-4">
                    <h4 className="font-medium mb-2">Regole RBAC</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Le campagne sono sempre store-scoped. Solo gli utenti con accesso al negozio selezionato possono gestire questa campagna.
                    </p>
                    
                    <h4 className="font-medium mb-2">Workflow Executors</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li><code>campaign-lead-intake-executor</code>: Gestisce intake lead con routing ibrido</li>
                      <li><code>pipeline-assignment-executor</code>: Assegna lead a pipeline basato su regole</li>
                    </ul>
                  </div>

                  {mode === 'edit' && campaign && (
                    <div className="rounded-lg border p-4 bg-muted/50">
                      <h4 className="font-medium mb-2">Statistiche Campagna</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Lead Totali</p>
                          <p className="text-lg font-semibold">{campaign.totalLeads || 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Deal Totali</p>
                          <p className="text-lg font-semibold">{campaign.totalDeals || 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Revenue Totale</p>
                          <p className="text-lg font-semibold">€{campaign.totalRevenue?.toFixed(2) || '0.00'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* TAB 7: STATI LEAD */}
                <TabsContent value="lead-statuses" className="space-y-4 mt-4">
                  <div className="rounded-lg border p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <ListTodo className="h-5 w-5 text-windtre-orange mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">Gestione Stati Lead</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {mode === 'create' 
                            ? 'La gestione stati sarà disponibile dopo aver creato la campagna. Ogni campagna ha stati personalizzabili organizzati in categorie fisse.'
                            : 'Personalizza gli stati del ciclo di vita dei lead per questa campagna. Gli stati sono organizzati in categorie fisse (Nuovo, In Lavorazione, Qualificato, Convertito, Non Qualificato, In Attesa), ma puoi creare stati custom con nomi personalizzati.'}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={() => setStatusDialogOpen(true)}
                      className="w-full"
                      disabled={mode === 'create'}
                      data-testid="button-open-lead-statuses"
                    >
                      <Settings2 className="h-4 w-4 mr-2" />
                      {mode === 'create' ? 'Disponibile dopo creazione campagna' : 'Apri Gestione Stati Lead'}
                    </Button>

                    {mode === 'edit' && (
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          <strong>Nota:</strong> Gli stati default (uno per categoria) sono protetti e non possono essere eliminati. Puoi creare stati aggiuntivi custom per ogni categoria e personalizzare colori e nomi visualizzati.
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                  data-testid="button-cancel"
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  data-testid="button-save"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Salvataggio...' : mode === 'create' ? 'Crea Campagna' : 'Salva Modifiche'}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* Lead Status Settings Dialog */}
        {campaignId && (
          <LeadStatusSettingsDialog 
            open={statusDialogOpen} 
            onClose={() => setStatusDialogOpen(false)} 
            campaignId={campaignId} 
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
