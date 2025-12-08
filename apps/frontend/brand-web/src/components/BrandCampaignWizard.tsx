import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '../components/ui/form';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Badge } from '../components/ui/badge';
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Store,
  Workflow,
  TrendingUp,
  Eye,
  Info,
  Sparkles,
  Bell,
  Zap,
  Shield,
  Database
} from 'lucide-react';

interface BrandCampaignWizardProps {
  open: boolean;
  onClose: () => void;
  onSave: (jsonTemplate: any) => void;
  template?: any | null;
  mode: 'create' | 'edit';
}

const leadSources = ['manual', 'web_form', 'powerful_api', 'landing_page', 'csv_import'] as const;

// Schema matching tenant wizard but for JSON template generation
const campaignTemplateSchema = z.object({
  // Step 1: Info Base
  name: z.string().min(1, "Nome template obbligatorio").max(255),
  description: z.string().optional(),
  templateCategory: z.string().optional().nullable(),
  
  // Routing & Workflows
  routingMode: z.enum(['automatic', 'manual']).optional().nullable(),
  workflowRef: z.string().optional().nullable().transform(val => val?.trim() || null),
  fallbackTimeoutSeconds: z.number().int().min(30).max(3600).optional().nullable(),
  
  // Lead Source & Marketing  
  defaultLeadSource: z.enum(leadSources).optional().nullable(),
  landingPageUrlPattern: z.string().optional().nullable().transform(val => val?.trim() || null),
  utmCampaignPattern: z.string().optional().nullable().transform(val => val?.trim() || null),
  budgetDefault: z.number().optional().nullable(),
  
  // Tracking Pixels Templates
  trackingPixelsTemplate: z.object({
    ga4MeasurementId: z.string().max(50).optional().nullable(),
    googleAdsConversionId: z.string().max(50).optional().nullable(),
    facebookPixelId: z.string().max(50).optional().nullable(),
  }).optional(),
  
  // GDPR Consents Default
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
  
  isActive: z.boolean().default(true),
}).superRefine((data, ctx) => {
  // Automatic routing validation: workflowRef required (min 1 char after trim)
  if (data.routingMode === 'automatic') {
    if (!data.workflowRef || data.workflowRef.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Workflow reference obbligatorio quando routing è automatico",
        path: ['workflowRef']
      });
    }
    
    // landingPageUrlPattern required with {tenant_domain}
    if (!data.landingPageUrlPattern || data.landingPageUrlPattern.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Landing page URL obbligatorio quando routing è automatico",
        path: ['landingPageUrlPattern']
      });
    } else if (!data.landingPageUrlPattern.includes('{tenant_domain}')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Landing page URL deve contenere placeholder {tenant_domain}",
        path: ['landingPageUrlPattern']
      });
    }
    
    // utmCampaignPattern required with {tenant_slug}
    if (!data.utmCampaignPattern || data.utmCampaignPattern.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "UTM Campaign pattern obbligatorio quando routing è automatico",
        path: ['utmCampaignPattern']
      });
    } else if (!data.utmCampaignPattern.includes('{tenant_slug}')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "UTM Campaign pattern deve contenere placeholder {tenant_slug}",
        path: ['utmCampaignPattern']
      });
    }
  }
  
  // Manual routing: if patterns provided, validate placeholders
  if (data.landingPageUrlPattern && data.landingPageUrlPattern.length > 0 && !data.landingPageUrlPattern.includes('{tenant_domain}')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Landing page URL deve contenere placeholder {tenant_domain}",
      path: ['landingPageUrlPattern']
    });
  }
  
  if (data.utmCampaignPattern && data.utmCampaignPattern.length > 0 && !data.utmCampaignPattern.includes('{tenant_slug}')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "UTM Campaign pattern deve contenere placeholder {tenant_slug}",
      path: ['utmCampaignPattern']
    });
  }
});

type CampaignTemplateFormValues = z.infer<typeof campaignTemplateSchema>;

function StepIndicator({ currentStep, totalSteps, onStepClick }: { 
  currentStep: number; 
  totalSteps: number;
  onStepClick: (step: number) => void;
}) {
  const steps = [
    { number: 1, label: 'Info Template', icon: Database },
    { number: 2, label: 'Routing', icon: Workflow },
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
              data-testid={`brand-wizard-step-${step.number}`}
              className={`
                flex items-center gap-3 transition-all duration-200
                ${isActive || isCompleted ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
              `}
              disabled={!isActive && !isCompleted}
            >
              <div className={`
                relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                ${isCompleted ? 'bg-gradient-to-br from-[#FF6900] to-[#7B2CBF] border-[#FF6900]' : ''}
                ${isActive ? 'bg-white border-[#FF6900] shadow-lg' : ''}
                ${!isActive && !isCompleted ? 'bg-gray-100 border-gray-300' : ''}
              `}>
                {isCompleted ? (
                  <Check className="h-5 w-5 text-white" />
                ) : (
                  <Icon className={`h-5 w-5 ${isActive ? 'text-[#FF6900]' : 'text-gray-400'}`} />
                )}
              </div>
              <div className="hidden md:block">
                <div className={`text-xs font-medium ${isActive ? 'text-[#FF6900]' : 'text-gray-500'}`}>
                  Step {step.number}
                </div>
                <div className={`text-sm font-semibold ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                  {step.label}
                </div>
              </div>
            </button>
            {index < steps.length - 1 && (
              <div className={`
                flex-1 h-0.5 mx-2
                ${isCompleted ? 'bg-gradient-to-r from-[#FF6900] to-[#7B2CBF]' : 'bg-gray-200'}
              `} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function BrandCampaignWizard({ open, onClose, onSave, template, mode }: BrandCampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const form = useForm<CampaignTemplateFormValues>({
    resolver: zodResolver(campaignTemplateSchema),
    defaultValues: {
      name: '',
      description: '',
      templateCategory: null,
      routingMode: 'automatic',
      workflowRef: null,
      fallbackTimeoutSeconds: 300,
      defaultLeadSource: 'web_form',
      landingPageUrlPattern: null,
      utmCampaignPattern: null,
      budgetDefault: null,
      trackingPixelsTemplate: {
        ga4MeasurementId: null,
        googleAdsConversionId: null,
        facebookPixelId: null,
      },
      requiredConsents: {
        privacy_policy: false,
        marketing: false,
        profiling: false,
        third_party: false,
      },
      isActive: true,
    },
  });

  const routingMode = form.watch('routingMode');

  useEffect(() => {
    if (mode === 'edit' && template) {
      form.reset(template);
    }
  }, [mode, template, form]);

  const handleNext = async () => {
    let fieldsToValidate: (keyof CampaignTemplateFormValues)[] = [];
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['name'];
        break;
      case 2:
        fieldsToValidate = ['routingMode'];
        const routingMode = form.getValues('routingMode');
        
        // Manual validation for automatic routing
        if (routingMode === 'automatic') {
          const workflowRef = form.getValues('workflowRef');
          if (!workflowRef || workflowRef.trim() === '') {
            form.setError('workflowRef', {
              type: 'manual',
              message: 'Workflow reference obbligatorio quando routing è automatico'
            });
            return;
          }
          fieldsToValidate.push('workflowRef');
        }
        break;
      case 3:
        // Manual validation for patterns when automatic routing
        const currentRoutingMode = form.getValues('routingMode');
        if (currentRoutingMode === 'automatic') {
          const landingUrl = form.getValues('landingPageUrlPattern');
          const utmPattern = form.getValues('utmCampaignPattern');
          
          let hasError = false;
          
          if (!landingUrl || landingUrl.trim() === '') {
            form.setError('landingPageUrlPattern', {
              type: 'manual',
              message: 'Landing page URL obbligatorio quando routing è automatico'
            });
            hasError = true;
          } else if (!landingUrl.includes('{tenant_domain}')) {
            form.setError('landingPageUrlPattern', {
              type: 'manual',
              message: 'Landing page URL deve contenere placeholder {tenant_domain}'
            });
            hasError = true;
          }
          
          if (!utmPattern || utmPattern.trim() === '') {
            form.setError('utmCampaignPattern', {
              type: 'manual',
              message: 'UTM Campaign pattern obbligatorio quando routing è automatico'
            });
            hasError = true;
          } else if (!utmPattern.includes('{tenant_slug}')) {
            form.setError('utmCampaignPattern', {
              type: 'manual',
              message: 'UTM Campaign pattern deve contenere placeholder {tenant_slug}'
            });
            hasError = true;
          }
          
          if (hasError) {
            return;
          }
        }
        fieldsToValidate = ['landingPageUrlPattern', 'utmCampaignPattern'];
        break;
    }

    const isValid = await form.trigger(fieldsToValidate as any);
    
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = form.handleSubmit((values) => {
    const jsonTemplate = {
      ...values,
      templateType: 'campaign',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
    };
    onSave(jsonTemplate);
    onClose();
    form.reset();
    setCurrentStep(1);
  });

  const goToStep = (step: number) => {
    if (step <= currentStep || step === 1) {
      setCurrentStep(step);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="brand-campaign-wizard-dialog">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[#FF6900]" />
            <DialogTitle>
              {mode === 'create' ? 'Nuovo Template Campagna' : 'Modifica Template Campagna'}
            </DialogTitle>
          </div>
          <DialogDescription>
            Crea un template campagna da deployare su 300+ tenant
          </DialogDescription>
        </DialogHeader>

        <StepIndicator 
          currentStep={currentStep} 
          totalSteps={totalSteps}
          onStepClick={goToStep}
        />

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Info Template */}
            {currentStep === 1 && (
              <div className="space-y-6" data-testid="brand-wizard-step-info">
                <div className="rounded-lg bg-gradient-to-br from-orange-50 to-purple-50 p-4 border border-orange-200">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-[#FF6900] flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Informazioni Template</h4>
                      <p className="text-xs text-gray-600">
                        Definisci nome, categoria e configurazione base del template
                      </p>
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Template *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="es. Black Friday Template 2025" 
                          data-testid="input-template-name"
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
                          placeholder="Descrivi il template e quando usarlo..."
                          rows={3}
                          data-testid="input-template-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="templateCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria Template</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger data-testid="select-template-category">
                            <SelectValue placeholder="Seleziona categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="seasonal">Stagionale (Black Friday, Natale)</SelectItem>
                          <SelectItem value="product-launch">Lancio Prodotto</SelectItem>
                          <SelectItem value="retention">Retention/Fidelizzazione</SelectItem>
                          <SelectItem value="acquisition">Acquisizione Nuovi Clienti</SelectItem>
                          <SelectItem value="upsell">Upsell/Cross-sell</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Categoria per organizzare i template nel catalogo
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="budgetDefault"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Raccomandato (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="es. 5000.00"
                          data-testid="input-budget-default"
                        />
                      </FormControl>
                      <FormDescription>
                        Budget suggerito per questa tipologia di campagna
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Step 2: Routing & Workflows */}
            {currentStep === 2 && (
              <div className="space-y-6" data-testid="brand-wizard-step-routing">
                <div className="rounded-lg bg-gradient-to-br from-orange-50 to-purple-50 p-4 border border-orange-200">
                  <div className="flex items-start gap-3">
                    <Workflow className="h-5 w-5 text-[#FF6900] flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Configurazione Routing</h4>
                      <p className="text-xs text-gray-600">
                        Definisci modalità di routing e workflow associato
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
                          <div className="flex items-center space-x-3 space-y-0 rounded-md border p-4 cursor-pointer hover:border-[#FF6900]">
                            <RadioGroupItem value="automatic" data-testid="radio-routing-automatic" />
                            <div className="space-y-1 leading-none">
                              <FormLabel className="cursor-pointer font-medium">
                                Automatico
                              </FormLabel>
                              <FormDescription>
                                Lead assegnati automaticamente tramite workflow
                              </FormDescription>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 space-y-0 rounded-md border p-4 cursor-pointer hover:border-[#FF6900]">
                            <RadioGroupItem value="manual" data-testid="radio-routing-manual" />
                            <div className="space-y-1 leading-none">
                              <FormLabel className="cursor-pointer font-medium">
                                Manuale
                              </FormLabel>
                              <FormDescription>
                                Lead vanno in pipeline per gestione manuale
                              </FormDescription>
                            </div>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {routingMode === 'automatic' && (
                  <>
                    <FormField
                      control={form.control}
                      name="workflowRef"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Workflow Reference</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value || ''}
                              placeholder="es. lead-scoring-v2"
                              data-testid="input-workflow-ref"
                            />
                          </FormControl>
                          <FormDescription>
                            Riferimento al workflow template da associare
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
                            Tempo di attesa prima della pipeline fallback (default: 300s)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            )}

            {/* Step 3: Marketing & Tracking */}
            {currentStep === 3 && (
              <div className="space-y-6" data-testid="brand-wizard-step-marketing">
                <div className="rounded-lg bg-gradient-to-br from-orange-50 to-purple-50 p-4 border border-orange-200">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-[#FF6900] flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Marketing & Tracking</h4>
                      <p className="text-xs text-gray-600">
                        Configura origine lead, UTM e tracking pixels predefiniti
                      </p>
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="defaultLeadSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origine Lead Default</FormLabel>
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

                <FormField
                  control={form.control}
                  name="landingPageUrlPattern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Landing Page URL Pattern</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ''}
                          placeholder="https://{tenant_domain}/promo/black-friday"
                          data-testid="input-landing-url-pattern"
                        />
                      </FormControl>
                      <FormDescription>
                        Pattern URL con placeholder {'{tenant_domain}'} per multi-tenant
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="utmCampaignPattern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UTM Campaign Pattern</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ''}
                          placeholder="black_friday_{tenant_slug}_2025"
                          data-testid="input-utm-campaign-pattern"
                        />
                      </FormControl>
                      <FormDescription>
                        Pattern UTM con placeholder per personalizzazione
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 rounded-lg border border-gray-200 p-4">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-[#FF6900]" />
                    Tracking Pixels Template
                  </h4>
                  <p className="text-xs text-gray-600">
                    Configurazione pixel predefinita (i tenant possono sovrascrivere)
                  </p>

                  <FormField
                    control={form.control}
                    name="trackingPixelsTemplate.ga4MeasurementId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Google Analytics 4</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''}
                            placeholder="G-XXXXXXXXXX"
                            data-testid="input-ga4-template"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="trackingPixelsTemplate.googleAdsConversionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Google Ads Conversion</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''}
                            placeholder="AW-XXXXXXXXX"
                            data-testid="input-google-ads-template"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="trackingPixelsTemplate.facebookPixelId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facebook Pixel</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            value={field.value || ''}
                            placeholder="XXXXXXXXXXXXXXX"
                            data-testid="input-facebook-pixel-template"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-6" data-testid="brand-wizard-step-review">
                <div className="rounded-lg bg-gradient-to-br from-orange-50 to-purple-50 p-4 border border-orange-200">
                  <div className="flex items-start gap-3">
                    <Eye className="h-5 w-5 text-[#FF6900] flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Revisione Template</h4>
                      <p className="text-xs text-gray-600">
                        Verifica la configurazione prima di salvare il template JSON
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <h5 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Database className="h-4 w-4 text-[#FF6900]" />
                      Info Template
                    </h5>
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <dt className="text-gray-600">Nome:</dt>
                      <dd className="font-medium">{form.watch('name') || '-'}</dd>
                      <dt className="text-gray-600">Categoria:</dt>
                      <dd className="font-medium">{form.watch('templateCategory') || '-'}</dd>
                      <dt className="text-gray-600">Budget:</dt>
                      <dd className="font-medium">
                        {form.watch('budgetDefault') ? `€${form.watch('budgetDefault')}` : '-'}
                      </dd>
                    </dl>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h5 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Workflow className="h-4 w-4 text-[#7B2CBF]" />
                      Routing
                    </h5>
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <dt className="text-gray-600">Modalità:</dt>
                      <dd className="font-medium capitalize">{form.watch('routingMode') || '-'}</dd>
                      {form.watch('routingMode') === 'automatic' && (
                        <>
                          <dt className="text-gray-600">Workflow:</dt>
                          <dd className="font-medium">{form.watch('workflowRef') || '-'}</dd>
                        </>
                      )}
                    </dl>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h5 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Marketing
                    </h5>
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      <dt className="text-gray-600">Lead Source:</dt>
                      <dd className="font-medium">{form.watch('defaultLeadSource') || '-'}</dd>
                      <dt className="text-gray-600">UTM Pattern:</dt>
                      <dd className="font-medium text-xs">{form.watch('utmCampaignPattern') || '-'}</dd>
                    </dl>
                  </div>

                  <div className="rounded-lg border border-[#FF6900] bg-orange-50 p-4">
                    <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-[#FF6900]" />
                      GDPR Consents
                    </h5>
                    <div className="flex gap-4 flex-wrap text-xs">
                      {form.watch('requiredConsents.privacy_policy') && (
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          ✓ Privacy Policy
                        </Badge>
                      )}
                      {form.watch('requiredConsents.marketing') && (
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          ✓ Marketing
                        </Badge>
                      )}
                      {form.watch('requiredConsents.profiling') && (
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          ✓ Profiling
                        </Badge>
                      )}
                      {form.watch('requiredConsents.third_party') && (
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          ✓ Third Party
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={currentStep === 1 ? onClose : handlePrev}
                data-testid="button-wizard-prev"
              >
                {currentStep === 1 ? (
                  'Annulla'
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Indietro
                  </>
                )}
              </Button>

              {currentStep < totalSteps ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-gradient-to-r from-[#FF6900] to-[#ff8533]"
                  data-testid="button-wizard-next"
                >
                  Avanti
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-[#7B2CBF] to-[#9747ff]"
                  data-testid="button-wizard-save"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Salva Template JSON
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
