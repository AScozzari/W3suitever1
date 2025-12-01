import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { 
  Server, 
  Phone, 
  Shield, 
  FileText, 
  Loader2,
  Settings,
  Save
} from 'lucide-react';

const sipConfigSchema = z.object({
  host: z.string().min(1, "Host obbligatorio"),
  port: z.number().min(1, "Porta obbligatoria").max(65535),
  transport: z.enum(['udp', 'tcp', 'tls']),
  username: z.string().min(1, "Username obbligatorio"),
  password: z.string().optional(),
  realm: z.string().optional(),
  from_user: z.string().optional(),
  from_domain: z.string().optional(),
  register: z.boolean().default(true),
  register_proxy: z.string().optional(),
  retry_seconds: z.number().min(0).default(30),
  caller_id_in_from: z.boolean().default(true),
  ping: z.boolean().default(true),
  ping_time: z.number().min(0).default(60)
});

const didConfigSchema = z.object({
  number: z.string().min(1, "Numero DID obbligatorio"),
  country_code: z.string().min(1, "Prefisso paese obbligatorio").default('+39'),
  area_code: z.string().optional(),
  local_number: z.string().min(1, "Numero locale obbligatorio"),
  provider_did: z.string().optional(),
  inbound_route: z.string().optional()
});

const securitySchema = z.object({
  encryption: z.enum(['none', 'tls', 'srtp']).default('none'),
  authentication: z.enum(['none', 'digest', 'tls']).default('digest'),
  acl: z.string().optional(),
  rate_limit_enabled: z.boolean().default(false),
  calls_per_minute: z.number().min(0).optional(),
  calls_per_hour: z.number().min(0).optional()
});

const gdprSchema = z.object({
  data_retention_days: z.number().min(1).max(3650).default(365),
  recording_consent_required: z.boolean().default(true),
  data_processing_purpose: z.string().optional(),
  lawful_basis: z.enum(['consent', 'contract', 'legitimate_interest']).default('contract'),
  data_controller: z.string().optional(),
  dpo_contact: z.string().optional()
});

const trunkFormSchema = z.object({
  name: z.string().min(1, "Nome trunk obbligatorio"),
  provider: z.string().optional(),
  storeId: z.string().min(1, "Store obbligatorio"),
  sipConfig: sipConfigSchema,
  didConfig: didConfigSchema,
  security: securitySchema,
  gdpr: gdprSchema,
  codecPreferences: z.string().optional()
});

type TrunkFormValues = z.infer<typeof trunkFormSchema>;

interface TrunkFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trunk?: any;
  onSuccess?: () => void;
}

export function TrunkFormModal({ open, onOpenChange, trunk, onSuccess }: TrunkFormModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('basic');
  const isEditing = !!trunk;

  const { data: storesData, isLoading: storesLoading } = useQuery<{ data: any[] }>({
    queryKey: ['/api/stores'],
    enabled: open
  });

  const stores = storesData?.data || [];
  
  // Find current store name for display when editing
  const currentStoreName = trunk?.storeId 
    ? stores.find(s => s.id === trunk.storeId)?.name || trunk.storeName || 'Store selezionato'
    : null;

  const defaultValues: TrunkFormValues = {
    name: '',
    provider: '',
    storeId: '',
    sipConfig: {
      host: '',
      port: 5060,
      transport: 'udp',
      username: '',
      password: '',
      realm: '',
      from_user: '',
      from_domain: '',
      register: true,
      register_proxy: '',
      retry_seconds: 30,
      caller_id_in_from: true,
      ping: true,
      ping_time: 60
    },
    didConfig: {
      number: '',
      country_code: '+39',
      area_code: '',
      local_number: '',
      provider_did: '',
      inbound_route: ''
    },
    security: {
      encryption: 'none',
      authentication: 'digest',
      acl: '',
      rate_limit_enabled: false,
      calls_per_minute: 60,
      calls_per_hour: 500
    },
    gdpr: {
      data_retention_days: 365,
      recording_consent_required: true,
      data_processing_purpose: 'Business communications',
      lawful_basis: 'contract',
      data_controller: '',
      dpo_contact: ''
    },
    codecPreferences: 'G.711,G.729,Opus'
  };

  const form = useForm<TrunkFormValues>({
    resolver: zodResolver(trunkFormSchema),
    defaultValues
  });

  useEffect(() => {
    if (trunk && open && !storesLoading) {
      form.reset({
        name: trunk.name || '',
        provider: trunk.provider || '',
        storeId: trunk.storeId || '',
        sipConfig: {
          host: trunk.sipConfig?.host || trunk.host || '',
          port: trunk.sipConfig?.port || trunk.port || 5060,
          transport: trunk.sipConfig?.transport || 'udp',
          username: trunk.sipConfig?.username || trunk.username || '',
          password: '',
          realm: trunk.sipConfig?.realm || '',
          from_user: trunk.sipConfig?.from_user || '',
          from_domain: trunk.sipConfig?.from_domain || '',
          register: trunk.sipConfig?.register ?? true,
          register_proxy: trunk.sipConfig?.register_proxy || '',
          retry_seconds: trunk.sipConfig?.retry_seconds || 30,
          caller_id_in_from: trunk.sipConfig?.caller_id_in_from ?? true,
          ping: trunk.sipConfig?.ping ?? true,
          ping_time: trunk.sipConfig?.ping_time || 60
        },
        didConfig: {
          number: trunk.didConfig?.number || '',
          country_code: trunk.didConfig?.country_code || '+39',
          area_code: trunk.didConfig?.area_code || '',
          local_number: trunk.didConfig?.local_number || '',
          provider_did: trunk.didConfig?.provider_did || '',
          inbound_route: trunk.didConfig?.inbound_route || ''
        },
        security: {
          encryption: trunk.security?.encryption || 'none',
          authentication: trunk.security?.authentication || 'digest',
          acl: trunk.security?.acl?.join(', ') || '',
          rate_limit_enabled: trunk.security?.rate_limit?.enabled || false,
          calls_per_minute: trunk.security?.rate_limit?.calls_per_minute || 60,
          calls_per_hour: trunk.security?.rate_limit?.calls_per_hour || 500
        },
        gdpr: {
          data_retention_days: trunk.gdpr?.data_retention_days || 365,
          recording_consent_required: trunk.gdpr?.recording_consent_required ?? true,
          data_processing_purpose: trunk.gdpr?.data_processing_purpose || 'Business communications',
          lawful_basis: trunk.gdpr?.lawful_basis || 'contract',
          data_controller: trunk.gdpr?.data_controller || '',
          dpo_contact: trunk.gdpr?.dpo_contact || ''
        },
        codecPreferences: trunk.codecPreferences?.join(',') || 'G.711,G.729,Opus'
      });
    } else if (!trunk && open && !storesLoading) {
      form.reset(defaultValues);
    }
  }, [trunk, open, form, storesLoading]);

  const saveMutation = useMutation({
    mutationFn: async (data: TrunkFormValues) => {
      const payload = {
        name: data.name,
        provider: data.provider,
        storeId: data.storeId,
        sipConfig: data.sipConfig,
        didConfig: data.didConfig,
        security: {
          encryption: data.security.encryption,
          authentication: data.security.authentication,
          acl: data.security.acl ? data.security.acl.split(',').map(s => s.trim()) : [],
          rate_limit: data.security.rate_limit_enabled ? {
            enabled: true,
            calls_per_minute: data.security.calls_per_minute,
            calls_per_hour: data.security.calls_per_hour
          } : undefined
        },
        gdpr: data.gdpr,
        codecPreferences: data.codecPreferences?.split(',').map(s => s.trim()) || []
      };

      if (isEditing) {
        return apiRequest('PUT', `/api/voip/trunks/${trunk.id}`, payload);
      } else {
        return apiRequest('POST', '/api/voip/trunks', payload);
      }
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Trunk aggiornato" : "Trunk creato",
        description: isEditing ? "Le modifiche sono state salvate" : "Il nuovo trunk è stato configurato"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/voip/trunks'] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile salvare il trunk",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: TrunkFormValues) => {
    saveMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Server className="w-5 h-5 text-orange-600" />
            {isEditing ? 'Modifica Trunk' : 'Nuovo Trunk SIP'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifica la configurazione del trunk VoIP' : 'Configura un nuovo trunk SIP per le chiamate VoIP'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 bg-gray-100/80">
                <TabsTrigger value="basic" className="data-[state=active]:bg-white">
                  <Settings className="w-4 h-4 mr-2" />
                  Base
                </TabsTrigger>
                <TabsTrigger value="sip" className="data-[state=active]:bg-white">
                  <Phone className="w-4 h-4 mr-2" />
                  SIP
                </TabsTrigger>
                <TabsTrigger value="security" className="data-[state=active]:bg-white">
                  <Shield className="w-4 h-4 mr-2" />
                  Sicurezza
                </TabsTrigger>
                <TabsTrigger value="gdpr" className="data-[state=active]:bg-white">
                  <FileText className="w-4 h-4 mr-2" />
                  GDPR
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <Card className="p-4 bg-gray-50/50">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Trunk *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="es: Trunk Milano Principale" 
                              {...field}
                              data-testid="input-trunk-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="provider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provider</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="es: EDGVoIP, VoIPVoice, Messagenet" 
                              {...field}
                              data-testid="input-trunk-provider"
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
                        <FormItem className="col-span-2">
                          <FormLabel>Store Associato *</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={storesLoading}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-trunk-store">
                                <SelectValue placeholder={storesLoading ? "Caricamento stores..." : "Seleziona uno store"}>
                                  {field.value && (stores.find(s => s.id === field.value)?.name || currentStoreName)}
                                </SelectValue>
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
                            Lo store a cui sarà associato questo trunk
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="codecPreferences"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Codec (separati da virgola)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="G.711,G.729,Opus" 
                              {...field}
                              data-testid="input-trunk-codecs"
                            />
                          </FormControl>
                          <FormDescription>
                            Ordine di preferenza dei codec audio
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>

                <Card className="p-4 bg-blue-50/50 border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-3">Configurazione DID</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="didConfig.country_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prefisso Paese</FormLabel>
                          <FormControl>
                            <Input placeholder="+39" {...field} data-testid="input-did-country" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="didConfig.area_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prefisso Area</FormLabel>
                          <FormControl>
                            <Input placeholder="02" {...field} data-testid="input-did-area" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="didConfig.local_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Numero Locale *</FormLabel>
                          <FormControl>
                            <Input placeholder="12345678" {...field} data-testid="input-did-local" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="didConfig.number"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Numero DID Completo *</FormLabel>
                          <FormControl>
                            <Input placeholder="+39 02 12345678" {...field} data-testid="input-did-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="didConfig.inbound_route"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Inbound Route</FormLabel>
                          <FormControl>
                            <Input placeholder="default" {...field} data-testid="input-did-route" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="sip" className="space-y-4 mt-4">
                <Card className="p-4 bg-gray-50/50">
                  <h4 className="font-medium text-gray-900 mb-3">Configurazione SIP</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="sipConfig.host"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Host SIP *</FormLabel>
                          <FormControl>
                            <Input placeholder="sip.edgvoip.it" {...field} data-testid="input-sip-host" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sipConfig.port"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Porta *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={e => field.onChange(parseInt(e.target.value) || 5060)}
                              data-testid="input-sip-port" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sipConfig.transport"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trasporto</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-sip-transport">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="udp">UDP</SelectItem>
                              <SelectItem value="tcp">TCP</SelectItem>
                              <SelectItem value="tls">TLS</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sipConfig.username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-sip-username" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sipConfig.password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password {isEditing ? '(lascia vuoto per mantenere)' : '*'}</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} data-testid="input-sip-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>

                <Card className="p-4 bg-gray-50/50">
                  <h4 className="font-medium text-gray-900 mb-3">Opzioni Registrazione</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="sipConfig.register"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-3 bg-white rounded-lg border">
                          <div>
                            <FormLabel>Registrazione SIP</FormLabel>
                            <FormDescription>Abilita registrazione al server SIP</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-sip-register" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sipConfig.caller_id_in_from"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-3 bg-white rounded-lg border">
                          <div>
                            <FormLabel>Caller ID in From</FormLabel>
                            <FormDescription>Usa caller ID nel campo From</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-sip-callerid" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sipConfig.ping"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-3 bg-white rounded-lg border">
                          <div>
                            <FormLabel>Keepalive Ping</FormLabel>
                            <FormDescription>Invia ping per mantenere la connessione</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-sip-ping" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sipConfig.retry_seconds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Retry Seconds</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={e => field.onChange(parseInt(e.target.value) || 30)}
                              data-testid="input-sip-retry" 
                            />
                          </FormControl>
                          <FormDescription>Secondi tra tentativi di riconnessione</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-4 mt-4">
                <Card className="p-4 bg-gray-50/50">
                  <h4 className="font-medium text-gray-900 mb-3">Crittografia e Autenticazione</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="security.encryption"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Crittografia</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-security-encryption">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Nessuna</SelectItem>
                              <SelectItem value="tls">TLS</SelectItem>
                              <SelectItem value="srtp">SRTP</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="security.authentication"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Autenticazione</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-security-auth">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Nessuna</SelectItem>
                              <SelectItem value="digest">Digest</SelectItem>
                              <SelectItem value="tls">TLS Client</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="security.acl"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>ACL (IP autorizzati)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="192.168.1.0/24, 10.0.0.1" 
                              {...field} 
                              data-testid="input-security-acl" 
                            />
                          </FormControl>
                          <FormDescription>Indirizzi IP o CIDR separati da virgola</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>

                <Card className="p-4 bg-amber-50/50 border-amber-200">
                  <h4 className="font-medium text-amber-900 mb-3">Rate Limiting</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="security.rate_limit_enabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-3 bg-white rounded-lg border col-span-3">
                          <div>
                            <FormLabel>Abilita Rate Limiting</FormLabel>
                            <FormDescription>Limita il numero di chiamate per prevenire abusi</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-rate-limit" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch('security.rate_limit_enabled') && (
                      <>
                        <FormField
                          control={form.control}
                          name="security.calls_per_minute"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Chiamate/Minuto</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                  data-testid="input-rate-per-minute" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="security.calls_per_hour"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Chiamate/Ora</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                  data-testid="input-rate-per-hour" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="gdpr" className="space-y-4 mt-4">
                <Card className="p-4 bg-green-50/50 border-green-200">
                  <h4 className="font-medium text-green-900 mb-3">Conformità GDPR</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="gdpr.data_retention_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Retention Dati (giorni)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={e => field.onChange(parseInt(e.target.value) || 365)}
                              data-testid="input-gdpr-retention" 
                            />
                          </FormControl>
                          <FormDescription>Giorni di conservazione CDR e registrazioni</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gdpr.lawful_basis"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Giuridica</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-gdpr-basis">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="consent">Consenso</SelectItem>
                              <SelectItem value="contract">Esecuzione Contratto</SelectItem>
                              <SelectItem value="legitimate_interest">Interesse Legittimo</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gdpr.recording_consent_required"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-3 bg-white rounded-lg border col-span-2">
                          <div>
                            <FormLabel>Consenso Registrazione Obbligatorio</FormLabel>
                            <FormDescription>Richiedi consenso prima di registrare le chiamate</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-gdpr-consent" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gdpr.data_processing_purpose"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Finalità Trattamento</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Comunicazioni aziendali e assistenza clienti" 
                              {...field} 
                              data-testid="input-gdpr-purpose" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gdpr.data_controller"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Titolare Trattamento</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Nome Azienda S.r.l." 
                              {...field} 
                              data-testid="input-gdpr-controller" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gdpr.dpo_contact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contatto DPO</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="dpo@azienda.it" 
                              {...field} 
                              data-testid="input-gdpr-dpo" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-trunk-cancel"
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                data-testid="button-trunk-save"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isEditing ? 'Salva Modifiche' : 'Crea Trunk'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
