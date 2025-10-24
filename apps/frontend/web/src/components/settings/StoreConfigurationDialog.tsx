import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { LoadingState } from '@w3suite/frontend-kit/components/blocks';
import { useRequiredTenantId } from '@/hooks/useTenantSafety';
import { 
  MapPin, 
  Share2, 
  TrendingUp, 
  MessageCircle,
  Save,
  Loader2,
  Navigation,
  CheckCircle2,
  Mail,
  Phone,
  Copy,
  Code
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface StoreConfigurationDialogProps {
  storeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// GPS Tab Schema
const gpsFormSchema = z.object({
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

// Marketing Tab Schema (includes Tracking IDs, Enhanced Conversions, Social Media)
const marketingFormSchema = z.object({
  // Tracking IDs
  ga4MeasurementId: z.string().regex(/^G-[A-Z0-9]+$/, 'Formato GA4 non valido (es. G-XXXXXXXXX)').optional().or(z.literal('')),
  googleAdsConversionId: z.string().regex(/^AW-[0-9]+$/, 'Formato Google Ads non valido (es. AW-XXXXXXXX)').optional().or(z.literal('')),
  facebookPixelId: z.string().regex(/^[0-9]+$/, 'Facebook Pixel deve essere numerico').optional().or(z.literal('')),
  tiktokPixelId: z.string().optional().or(z.literal('')),
  // Enhanced Conversions Data
  facebook: z.string().url('URL Facebook non valido').optional().or(z.literal('')),
  instagram: z.string().optional().or(z.literal('')),
  // Social Media (altri canali)
  linkedin: z.string().url('URL LinkedIn non valido').optional().or(z.literal('')),
  tiktok: z.string().optional().or(z.literal('')),
});

// WhatsApp Tab Schema
const whatsappFormSchema = z.object({
  whatsapp1: z.string().regex(/^\+39\s?\d{9,10}$/, 'Formato non valido (+39 seguito da 9-10 cifre)').optional().or(z.literal('')),
  whatsapp2: z.string().regex(/^\+39\s?\d{9,10}$/, 'Formato non valido (+39 seguito da 9-10 cifre)').optional().or(z.literal('')),
});

// Contatti Tab Schema
const contattiFormSchema = z.object({
  email: z.string().email('Email non valida').optional().or(z.literal('')),
  googleMapsUrl: z.string().url('URL Google Maps non valido').optional().or(z.literal('')),
  telegram: z.string().optional().or(z.literal('')),
});

// Telefono Tab Schema
const telefonoFormSchema = z.object({
  phone: z.string().regex(/^\+39\s?\d{9,11}$/, 'Formato non valido (+39 seguito da 9-11 cifre)').optional().or(z.literal('')),
});

type GPSFormData = z.infer<typeof gpsFormSchema>;
type MarketingFormData = z.infer<typeof marketingFormSchema>;
type WhatsAppFormData = z.infer<typeof whatsappFormSchema>;
type ContattiFormData = z.infer<typeof contattiFormSchema>;
type TelefonoFormData = z.infer<typeof telefonoFormSchema>;

export function StoreConfigurationDialog({ storeId, open, onOpenChange }: StoreConfigurationDialogProps) {
  const { toast } = useToast();
  const tenantId = useRequiredTenantId();
  const [activeTab, setActiveTab] = useState('gps');
  const [isConfiguringGTM, setIsConfiguringGTM] = useState(false);

  // Fetch store data
  const { data: store, isLoading: isLoadingStore } = useQuery({
    queryKey: ['/api/stores', storeId],
    enabled: open && !!storeId,
  });

  // Fetch tracking config
  const { data: trackingConfig, isLoading: isLoadingTracking } = useQuery({
    queryKey: ['/api/stores', storeId, 'tracking-config'],
    queryFn: async () => {
      const response = await fetch(`/api/stores/${storeId}/tracking-config`, {
        headers: {
          'X-Tenant-ID': tenantId,
          'X-Auth-Session': 'authenticated',
          'X-Demo-User': 'admin-user',
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch tracking config');
      }
      const json = await response.json();
      return json.data;
    },
    enabled: open && !!storeId,
  });

  // Fetch GTM snippet
  const { data: gtmSnippet, isLoading: isLoadingSnippet } = useQuery({
    queryKey: ['/api/stores', storeId, 'gtm-snippet'],
    queryFn: async () => {
      const response = await fetch(`/api/stores/${storeId}/gtm-snippet`, {
        headers: {
          'X-Tenant-ID': tenantId,
          'X-Auth-Session': 'authenticated',
          'X-Demo-User': 'admin-user',
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch GTM snippet');
      }
      const json = await response.json();
      return json.data;
    },
    enabled: open && !!storeId && !!trackingConfig, // Only fetch if tracking config exists
  });

  // GPS Form
  const gpsForm = useForm<GPSFormData>({
    resolver: zodResolver(gpsFormSchema),
    values: {
      latitude: store?.geo?.latitude || null,
      longitude: store?.geo?.longitude || null,
    },
  });

  // Marketing Form
  const marketingForm = useForm<MarketingFormData>({
    resolver: zodResolver(marketingFormSchema),
    values: {
      ga4MeasurementId: trackingConfig?.ga4MeasurementId || '',
      googleAdsConversionId: trackingConfig?.googleAdsConversionId || '',
      facebookPixelId: trackingConfig?.facebookPixelId || '',
      tiktokPixelId: trackingConfig?.tiktokPixelId || '',
      facebook: store?.facebook || '',
      instagram: store?.instagram || '',
      linkedin: store?.linkedin || '',
      tiktok: store?.tiktok || '',
    },
  });

  // WhatsApp Form
  const whatsappForm = useForm<WhatsAppFormData>({
    resolver: zodResolver(whatsappFormSchema),
    values: {
      whatsapp1: store?.whatsapp1 || '',
      whatsapp2: store?.whatsapp2 || '',
    },
  });

  // Contatti Form
  const contattiForm = useForm<ContattiFormData>({
    resolver: zodResolver(contattiFormSchema),
    values: {
      email: store?.email || '',
      googleMapsUrl: store?.googleMapsUrl || '',
      telegram: store?.telegram || '',
    },
  });

  // Telefono Form
  const telefonoForm = useForm<TelefonoFormData>({
    resolver: zodResolver(telefonoFormSchema),
    values: {
      phone: store?.phone || '',
    },
  });

  // Update store mutation (for GPS, Social, WhatsApp, Contatti, Telefono)
  const updateStoreMutation = useMutation({
    mutationFn: async (data: Partial<any>) => {
      return apiRequest(`/api/stores/${storeId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores', storeId] });
      toast({
        title: 'Salvato',
        description: 'Configurazione aggiornata con successo',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Configure GTM mutation
  const configureGTMMutation = useMutation({
    mutationFn: async (data: MarketingFormData) => {
      return apiRequest(`/api/stores/${storeId}/tracking-config`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores', storeId, 'tracking-config'] });
      queryClient.invalidateQueries({ queryKey: [`/api/stores/${storeId}/gtm-snippet`] }); // Invalidate snippet cache (exact format)
      queryClient.invalidateQueries({ queryKey: ['/api/stores'] });
      toast({
        title: 'GTM Configurato!',
        description: 'Tag e trigger creati con successo. Snippet GTM generato e pronto per essere copiato.',
      });
      setIsConfiguringGTM(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Errore GTM',
        description: error.message,
        variant: 'destructive',
      });
      setIsConfiguringGTM(false);
    },
  });

  // Handle GPS auto-detect
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Non supportato',
        description: 'Il tuo browser non supporta la geolocalizzazione',
        variant: 'destructive',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        gpsForm.setValue('latitude', position.coords.latitude);
        gpsForm.setValue('longitude', position.coords.longitude);
        toast({
          title: 'Posizione rilevata',
          description: 'Coordinate GPS aggiornate con successo',
        });
      },
      (error) => {
        toast({
          title: 'Errore',
          description: 'Impossibile rilevare la posizione: ' + error.message,
          variant: 'destructive',
        });
      }
    );
  };

  // Handle GPS save
  const handleGPSSave = (data: GPSFormData) => {
    updateStoreMutation.mutate({
      geo: data.latitude && data.longitude ? {
        latitude: data.latitude,
        longitude: data.longitude,
      } : null,
    });
  };

  // Handle Marketing save & GTM config
  const handleMarketingConfigure = async (data: MarketingFormData) => {
    setIsConfiguringGTM(true);
    
    // Save social data (facebook, instagram, linkedin, tiktok) to store first
    const socialData = {
      facebook: data.facebook,
      instagram: data.instagram,
      linkedin: data.linkedin,
      tiktok: data.tiktok,
    };
    
    try {
      await apiRequest(`/api/stores/${storeId}`, {
        method: 'PATCH',
        body: JSON.stringify(socialData),
      });
      
      // Then configure GTM with tracking IDs
      const trackingData = {
        ga4MeasurementId: data.ga4MeasurementId,
        googleAdsConversionId: data.googleAdsConversionId,
        facebookPixelId: data.facebookPixelId,
        tiktokPixelId: data.tiktokPixelId,
      };
      
      configureGTMMutation.mutate(trackingData);
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile salvare i dati social',
        variant: 'destructive',
      });
      setIsConfiguringGTM(false);
    }
  };

  // Handle WhatsApp save
  const handleWhatsAppSave = (data: WhatsAppFormData) => {
    updateStoreMutation.mutate(data);
  };

  // Handle Contatti save
  const handleContattiSave = (data: ContattiFormData) => {
    updateStoreMutation.mutate(data);
  };

  // Handle Telefono save
  const handleTelefonoSave = (data: TelefonoFormData) => {
    updateStoreMutation.mutate(data);
  };

  // Handle Copy GTM Snippet to clipboard
  const handleCopySnippet = async () => {
    if (!gtmSnippet?.snippet) return;

    try {
      await navigator.clipboard.writeText(gtmSnippet.snippet);
      toast({
        title: 'Copiato!',
        description: 'Snippet GTM copiato negli appunti',
      });
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile copiare negli appunti',
        variant: 'destructive',
      });
    }
  };

  if (isLoadingStore || isLoadingTracking) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Configurazione Store</DialogTitle>
            <DialogDescription>Caricamento dati in corso...</DialogDescription>
          </DialogHeader>
          <LoadingState message="Caricamento configurazione..." />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Configurazione Store: {store?.nome}</span>
          </DialogTitle>
          <DialogDescription>
            Configura GPS, Social, Marketing, WhatsApp, Contatti e Telefono per questo punto vendita
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="gps" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              GPS
            </TabsTrigger>
            <TabsTrigger value="marketing" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Marketing
              {trackingConfig?.gtmConfigured && (
                <Badge variant="default" className="ml-2 bg-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="contatti" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Contatti
            </TabsTrigger>
            <TabsTrigger value="telefono" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Telefono
            </TabsTrigger>
          </TabsList>

          {/* GPS TAB */}
          <TabsContent value="gps" className="mt-6">
            <Form {...gpsForm}>
              <form onSubmit={gpsForm.handleSubmit(handleGPSSave)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={gpsForm.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitudine</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.000001"
                            placeholder="es. 45.464664"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            data-testid="input-latitude"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={gpsForm.control}
                    name="longitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitudine</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.000001"
                            placeholder="es. 9.188540"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            data-testid="input-longitude"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDetectLocation}
                    data-testid="button-detect-location"
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Rileva Posizione Automatica
                  </Button>

                  <Button 
                    type="submit" 
                    disabled={updateStoreMutation.isPending || !gpsForm.formState.isValid}
                    data-testid="button-save-gps"
                  >
                    {updateStoreMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salva GPS
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          {/* MARKETING TAB */}
          <TabsContent value="marketing" className="mt-6">
            <Form {...marketingForm}>
              <form onSubmit={marketingForm.handleSubmit(handleMarketingConfigure)} className="space-y-8">
                {trackingConfig?.gtmConfigured && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">GTM Configurato con successo!</span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      Trigger ID: {trackingConfig.gtmTriggerId}
                    </p>
                  </div>
                )}

                {/* SEZIONE 1: Tracking IDs */}
                <div className="border rounded-lg p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                    <h3 className="text-lg font-semibold">Tracking IDs</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Inserisci gli ID di tracking per Google Analytics, Google Ads, Facebook e TikTok
                  </p>

                  <FormField
                    control={marketingForm.control}
                    name="ga4MeasurementId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GA4 Measurement ID</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="G-XXXXXXXXX" data-testid="input-ga4" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={marketingForm.control}
                    name="googleAdsConversionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Google Ads Conversion ID</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="AW-XXXXXXXX" data-testid="input-google-ads" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={marketingForm.control}
                    name="facebookPixelId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facebook Pixel ID</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="123456789" data-testid="input-facebook-pixel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={marketingForm.control}
                    name="tiktokPixelId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>TikTok Pixel ID (opzionale)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="C9XXXXXXXXXXXXXXXX" data-testid="input-tiktok-pixel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* SEZIONE 2: Enhanced Conversions Data */}
                <div className="border rounded-lg p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Share2 className="h-5 w-5 text-orange-600" />
                    <h3 className="text-lg font-semibold">Enhanced Conversions Data</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Dati per il matching cross-device di Google Ads e Facebook (Enhanced Conversions)
                  </p>

                  <FormField
                    control={marketingForm.control}
                    name="facebook"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facebook Page URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://facebook.com/nomepagina" data-testid="input-facebook-page" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={marketingForm.control}
                    name="instagram"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram Username</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="@username" data-testid="input-instagram-handle" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={marketingForm.control}
                    name="linkedin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LinkedIn URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://linkedin.com/company/..." data-testid="input-linkedin" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={marketingForm.control}
                    name="tiktok"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>TikTok Username</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="@username" data-testid="input-tiktok" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Display email/phone from store (read-only) */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Dati store utilizzati per Enhanced Conversions:</p>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span>Email: {store?.email || 'Non configurata'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>Telefono: {store?.phone || 'Non configurato'}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Questi dati vengono inviati come hash SHA-256 a Google/Facebook per il matching utenti
                    </p>
                  </div>
                </div>

                {/* SEZIONE 3: GTM Snippet */}
                {trackingConfig && (
                  <div className="border rounded-lg p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Code className="h-5 w-5 text-orange-600" />
                      <h3 className="text-lg font-semibold">GTM Snippet</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Copia questo snippet e incollalo nel <code className="bg-gray-100 px-2 py-1 rounded">&lt;head&gt;</code> delle tue landing page
                    </p>

                    {isLoadingSnippet ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
                        <span className="ml-2 text-sm text-gray-600">Generazione snippet in corso...</span>
                      </div>
                    ) : gtmSnippet?.snippet ? (
                      <>
                        <Textarea
                          value={gtmSnippet.snippet}
                          readOnly
                          className="font-mono text-xs h-48 resize-none"
                          data-testid="textarea-gtm-snippet"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCopySnippet}
                          className="w-full"
                          data-testid="button-copy-snippet"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copia Snippet
                        </Button>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                          <p className="text-sm text-blue-800">
                            💡 <strong>Come usare:</strong>
                          </p>
                          <ol className="text-xs text-blue-700 mt-2 ml-4 space-y-1 list-decimal">
                            <li>Copia lo snippet sopra</li>
                            <li>Incolla nella sezione <code className="bg-blue-100 px-1 rounded">&lt;head&gt;</code> della tua landing page</li>
                            <li>Gli UTM parameters vengono letti automaticamente dall'URL</li>
                            <li>Il dataLayer è precompilato con tenant_id, store_id e tracking IDs</li>
                          </ol>
                        </div>
                      </>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                        <Code className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-600">
                          Configura prima i tracking IDs per generare lo snippet
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={isConfiguringGTM || !marketingForm.formState.isValid}
                  className="bg-orange-600 hover:bg-orange-700"
                  data-testid="button-configure-gtm"
                >
                  {isConfiguringGTM ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <TrendingUp className="h-4 w-4 mr-2" />
                  )}
                  Configura GTM e Genera Snippet
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* WHATSAPP TAB */}
          <TabsContent value="whatsapp" className="mt-6">
            <Form {...whatsappForm}>
              <form onSubmit={whatsappForm.handleSubmit(handleWhatsAppSave)} className="space-y-6">
                <FormField
                  control={whatsappForm.control}
                  name="whatsapp1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numero WhatsApp Business Principale</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+39 3XX XXXXXXX" data-testid="input-whatsapp1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={whatsappForm.control}
                  name="whatsapp2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numero WhatsApp Business Secondario (opzionale)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+39 3XX XXXXXXX" data-testid="input-whatsapp2" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  disabled={updateStoreMutation.isPending || !whatsappForm.formState.isValid}
                  data-testid="button-save-whatsapp"
                >
                  {updateStoreMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salva WhatsApp
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* CONTATTI TAB */}
          <TabsContent value="contatti" className="mt-6">
            <Form {...contattiForm}>
              <form onSubmit={contattiForm.handleSubmit(handleContattiSave)} className="space-y-6">
                <FormField
                  control={contattiForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Punto Vendita</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="punto.vendita@windtre.it" data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={contattiForm.control}
                  name="googleMapsUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Google Maps URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://maps.google.com/..." data-testid="input-google-maps" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={contattiForm.control}
                  name="telegram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telegram (Username o Link)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="@windtre_store o https://t.me/..." data-testid="input-telegram" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  disabled={updateStoreMutation.isPending || !contattiForm.formState.isValid}
                  data-testid="button-save-contatti"
                >
                  {updateStoreMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salva Contatti
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* TELEFONO TAB */}
          <TabsContent value="telefono" className="mt-6">
            <Form {...telefonoForm}>
              <form onSubmit={telefonoForm.handleSubmit(handleTelefonoSave)} className="space-y-6">
                <FormField
                  control={telefonoForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numero Telefono</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+39 02 1234567" data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    💡 <strong>Future Configurazioni:</strong> In futuro sarà possibile configurare impostazioni avanzate del telefono come:
                  </p>
                  <ul className="mt-2 ml-4 text-sm text-blue-600 dark:text-blue-400 list-disc">
                    <li>Orari di disponibilità</li>
                    <li>Inoltro chiamate automatico</li>
                    <li>Messaggi di risposta automatica</li>
                    <li>Integrazione con sistemi telefonici</li>
                  </ul>
                </div>

                <Button 
                  type="submit" 
                  disabled={updateStoreMutation.isPending || !telefonoForm.formState.isValid}
                  data-testid="button-save-telefono"
                >
                  {updateStoreMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salva Telefono
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
