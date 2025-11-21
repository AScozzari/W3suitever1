import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useUTMTracking } from '@/hooks/useUTMTracking';
import { pushLeadEvent } from '@/lib/gtm';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// Lead source enum (matches backend)
const leadSources = ['manual', 'web_form', 'powerful_api', 'landing_page', 'csv_import'] as const;

const leadFormSchema = z.object({
  firstName: z.string().min(2, 'Nome richiesto (min 2 caratteri)'),
  lastName: z.string().min(2, 'Cognome richiesto (min 2 caratteri)'),
  email: z.string().email('Email non valida').optional().or(z.literal('')),
  phone: z.string().min(8, 'Telefono richiesto').optional().or(z.literal('')),
  companyName: z.string().optional(),
  productInterest: z.string().optional(),
  campaignId: z.string().optional(),
  leadSource: z.enum(leadSources).optional(),
  landingPageUrl: z.string().url().optional().nullable().or(z.literal('')),
  notes: z.string().optional(),
  privacyPolicyAccepted: z.boolean().refine((val) => val === true, {
    message: 'Devi accettare la privacy policy',
  }),
  marketingConsent: z.boolean().default(false),
  profilingConsent: z.boolean().default(false),
}).refine(data => {
  // If lead source is landing_page, URL is required
  if (data.leadSource === 'landing_page' && !data.landingPageUrl) {
    return false;
  }
  return true;
}, {
  message: "Landing Page URL obbligatorio quando Lead Source è 'Landing Page'",
  path: ['landingPageUrl']
});

type LeadFormData = z.infer<typeof leadFormSchema>;

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedCampaignId?: string;
  inheritedStoreId?: string;
}

export function CreateLeadDialog({ 
  open, 
  onOpenChange, 
  preselectedCampaignId,
  inheritedStoreId
}: CreateLeadDialogProps) {
  const { toast } = useToast();
  const { getStoredUTM } = useUTMTracking();
  
  // State for UTM parameters inherited from selected campaign
  const [inheritedUTM, setInheritedUTM] = useState<{
    utmSourceId: string | null;
    utmMediumId: string | null;
    utmCampaign: string | null;
  }>({
    utmSourceId: null,
    utmMediumId: null,
    utmCampaign: null,
  });

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      companyName: '',
      productInterest: '',
      campaignId: '',
      leadSource: 'manual',
      landingPageUrl: '',
      notes: '',
      privacyPolicyAccepted: false,
      marketingConsent: false,
      profilingConsent: false,
    },
  });

  // Fetch campaigns for selection
  const { data: campaignsResponse } = useQuery<any>({
    queryKey: ['/api/crm/campaigns'],
    enabled: open,
  });
  
  const campaigns = useMemo(() => campaignsResponse?.data || [], [campaignsResponse?.data]);
  
  // Auto-populate campaign from parent view context
  useEffect(() => {
    if (preselectedCampaignId) {
      form.setValue('campaignId', preselectedCampaignId);
    }
  }, [preselectedCampaignId, form]);
  
  // Watch for campaign selection changes to inherit UTM parameters
  const selectedCampaignId = form.watch('campaignId');
  
  useEffect(() => {
    if (selectedCampaignId && campaigns.length > 0) {
      const selectedCampaign = campaigns.find((c: any) => c.id === selectedCampaignId);
      if (selectedCampaign) {
        // Inherit UTM parameters from campaign
        setInheritedUTM({
          utmSourceId: selectedCampaign.utmSourceId || null,
          utmMediumId: selectedCampaign.utmMediumId || null,
          utmCampaign: selectedCampaign.utmCampaign || null,
        });
      }
    } else {
      // Clear inherited UTM when no campaign selected
      setInheritedUTM({
        utmSourceId: null,
        utmMediumId: null,
        utmCampaign: null,
      });
    }
  }, [selectedCampaignId, campaigns]);

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: async (data: LeadFormData) => {
      // Get UTM data from localStorage
      const storedUTM = getStoredUTM();
      
      return await apiRequest('/api/crm/leads', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          status: 'new',
          leadScore: 50,
          consentTimestamp: new Date().toISOString(),
          consentSource: 'crm_manual_entry',
          storeId: inheritedStoreId,
          // Send UTM parameters (prioritize stored UTM from URL over campaign UTM)
          utmSource: storedUTM?.utm_source || undefined,
          utmMedium: storedUTM?.utm_medium || undefined,
          utmCampaign: storedUTM?.utm_campaign || inheritedUTM.utmCampaign || undefined,
          utmContent: storedUTM?.utm_content || undefined,
          utmTerm: storedUTM?.utm_term || undefined,
          // Fallback to campaign inherited IDs if no stored UTM
          utmSourceId: storedUTM?.utm_source ? undefined : inheritedUTM.utmSourceId,
          utmMediumId: storedUTM?.utm_medium ? undefined : inheritedUTM.utmMediumId,
        }),
      });
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/dashboard/stats'] });
      
      // Push generate_lead event to GTM Data Layer
      const storedUTM = getStoredUTM();
      pushLeadEvent({
        email: variables.email || '',
        phone: variables.phone || '',
        utm_source: storedUTM?.utm_source,
        utm_medium: storedUTM?.utm_medium,
        utm_campaign: storedUTM?.utm_campaign,
        utm_content: storedUTM?.utm_content,
        utm_term: storedUTM?.utm_term,
      });
      
      toast({
        title: 'Lead creato',
        description: 'Il lead è stato creato con successo.',
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: error.message || 'Impossibile creare il lead.',
      });
    },
  });

  const onSubmit = (data: LeadFormData) => {
    createLeadMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crea Nuovo Lead</DialogTitle>
          <DialogDescription>
            Inserisci i dati del nuovo lead. I campi contrassegnati con * sono obbligatori.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Mario" data-testid="input-first-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cognome *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Rossi" data-testid="input-last-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="mario.rossi@example.com" data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefono</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+39 333 1234567" data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Company & Interest */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Azienda</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome azienda" data-testid="input-company" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="productInterest"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interesse Prodotto</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="es. Fibra 1000, Mobile 5G" data-testid="input-product-interest" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Campaign & Source */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="campaignId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campagna di Origine</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-campaign">
                          <SelectValue placeholder="Seleziona campagna" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nessuna campagna</SelectItem>
                        {(campaigns || [])?.map((campaign: any) => (
                          <SelectItem key={campaign.id} value={campaign.id}>
                            {campaign.name}
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
                name="leadSource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Source (Origine Lead)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-lead-source">
                          <SelectValue placeholder="Seleziona origine" />
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Landing Page URL (conditional - shown only if leadSource is landing_page) */}
            {form.watch('leadSource') === 'landing_page' && (
              <FormField
                control={form.control}
                name="landingPageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Landing Page URL *</FormLabel>
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
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Aggiungi note o dettagli sul lead..."
                      rows={3}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* GDPR Consents */}
            <div className="space-y-3 p-4 rounded-lg border">
              <div className="font-medium text-sm">Consensi GDPR</div>
              
              <FormField
                control={form.control}
                name="privacyPolicyAccepted"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-privacy"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal">
                        Accetto la Privacy Policy *
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="marketingConsent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-marketing"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal">
                        Consenso a ricevere comunicazioni marketing
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="profilingConsent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-profiling"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal">
                        Consenso alla profilazione
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createLeadMutation.isPending}
                data-testid="button-cancel"
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={createLeadMutation.isPending}
                style={{ background: 'hsl(var(--brand-orange))' }}
                data-testid="button-submit"
              >
                {createLeadMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Crea Lead
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
