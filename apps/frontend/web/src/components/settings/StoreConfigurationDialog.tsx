import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  CheckCircle2
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

// Social Tab Schema
const socialFormSchema = z.object({
  facebook: z.string().url('URL Facebook non valido').optional().or(z.literal('')),
  instagram: z.string().optional().or(z.literal('')),
  linkedin: z.string().url('URL LinkedIn non valido').optional().or(z.literal('')),
  tiktok: z.string().optional().or(z.literal('')),
});

// Marketing Tab Schema
const marketingFormSchema = z.object({
  ga4MeasurementId: z.string().regex(/^G-[A-Z0-9]+$/, 'Formato GA4 non valido (es. G-XXXXXXXXX)').optional().or(z.literal('')),
  googleAdsConversionId: z.string().regex(/^AW-[0-9]+$/, 'Formato Google Ads non valido (es. AW-XXXXXXXX)').optional().or(z.literal('')),
  facebookPixelId: z.string().regex(/^[0-9]+$/, 'Facebook Pixel deve essere numerico').optional().or(z.literal('')),
  tiktokPixelId: z.string().optional().or(z.literal('')),
});

// WhatsApp Tab Schema
const whatsappFormSchema = z.object({
  whatsapp1: z.string().regex(/^\+39\s?\d{9,10}$/, 'Formato non valido (+39 seguito da 9-10 cifre)').optional().or(z.literal('')),
  whatsapp2: z.string().regex(/^\+39\s?\d{9,10}$/, 'Formato non valido (+39 seguito da 9-10 cifre)').optional().or(z.literal('')),
});

type GPSFormData = z.infer<typeof gpsFormSchema>;
type SocialFormData = z.infer<typeof socialFormSchema>;
type MarketingFormData = z.infer<typeof marketingFormSchema>;
type WhatsAppFormData = z.infer<typeof whatsappFormSchema>;

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
      const response = await fetch(`/api/stores/${storeId}/tracking-config`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch tracking config');
      }
      const json = await response.json();
      return json.data;
    },
    enabled: open && !!storeId,
  });

  // GPS Form
  const gpsForm = useForm<GPSFormData>({
    resolver: zodResolver(gpsFormSchema),
    values: {
      latitude: store?.geo?.latitude || null,
      longitude: store?.geo?.longitude || null,
    },
  });

  // Social Form
  const socialForm = useForm<SocialFormData>({
    resolver: zodResolver(socialFormSchema),
    values: {
      facebook: store?.facebook || '',
      instagram: store?.instagram || '',
      linkedin: store?.linkedin || '',
      tiktok: store?.tiktok || '',
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

  // Update store mutation (for GPS, Social, WhatsApp)
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
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores', storeId, 'tracking-config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stores'] });
      toast({
        title: 'GTM Configurato!',
        description: 'Tag e trigger creati con successo. Pubblica il container GTM per attivare il tracking.',
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

  // Handle Social save
  const handleSocialSave = (data: SocialFormData) => {
    updateStoreMutation.mutate(data);
  };

  // Handle Marketing save & GTM config
  const handleMarketingConfigure = (data: MarketingFormData) => {
    setIsConfiguringGTM(true);
    configureGTMMutation.mutate(data);
  };

  // Handle WhatsApp save
  const handleWhatsAppSave = (data: WhatsAppFormData) => {
    updateStoreMutation.mutate(data);
  };

  if (isLoadingStore || isLoadingTracking) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
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
            Configura GPS, Social, Marketing e WhatsApp per questo punto vendita
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="gps" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              GPS
            </TabsTrigger>
            <TabsTrigger value="social" className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Social
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

          {/* SOCIAL TAB */}
          <TabsContent value="social" className="mt-6">
            <Form {...socialForm}>
              <form onSubmit={socialForm.handleSubmit(handleSocialSave)} className="space-y-6">
                <FormField
                  control={socialForm.control}
                  name="facebook"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facebook Page URL</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://facebook.com/nomepagina" data-testid="input-facebook" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={socialForm.control}
                  name="instagram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram Username</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="@username" data-testid="input-instagram" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={socialForm.control}
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
                  control={socialForm.control}
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

                <Button 
                  type="submit" 
                  disabled={updateStoreMutation.isPending || !socialForm.formState.isValid}
                  data-testid="button-save-social"
                >
                  {updateStoreMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salva Social
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* MARKETING TAB */}
          <TabsContent value="marketing" className="mt-6">
            <Form {...marketingForm}>
              <form onSubmit={marketingForm.handleSubmit(handleMarketingConfigure)} className="space-y-6">
                {trackingConfig?.gtmConfigured && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">GTM Configurato con successo!</span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      Trigger ID: {trackingConfig.gtmTriggerId}
                    </p>
                  </div>
                )}

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
                  Configura GTM Automaticamente
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
