import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { LoadingState } from '@w3suite/frontend-kit/components/blocks';
import {
  Settings,
  Key,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PlayCircle,
  Loader2,
  Activity,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Clock,
  Server,
  Wifi,
  WifiOff
} from 'lucide-react';

interface VoIPSettingsResponse {
  configured: boolean;
  config: {
    id: string;
    tenantExternalId: string;
    apiKeyLastFour: string;
    apiBaseUrl: string;
    scopes: string[];
    enabled: boolean;
    connectionStatus: string;
    lastConnectionTest: string | null;
    connectionError: string | null;
    hasApiKey: boolean;
  } | null;
}

interface VoIPLogEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  status: string;
  detailsJson: any;
  createdAt: string;
}

const settingsFormSchema = z.object({
  tenantExternalId: z.string().min(1, "ID esterno tenant obbligatorio"),
  apiKey: z.string().optional(),
  webhookSecret: z.string().optional(),
  apiBaseUrl: z.string().url("URL API non valido").optional(),
  enabled: z.boolean().default(true)
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export function VoIPIntegrationSettings() {
  const { toast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'config' | 'logs'>('config');
  const [showApiKey, setShowApiKey] = useState(false);
  const [logFilter, setLogFilter] = useState<string>('all');

  const { data: settingsData, isLoading: settingsLoading, refetch: refetchSettings } = useQuery<{ data: VoIPSettingsResponse }>({
    queryKey: ['/api/voip/settings'],
    staleTime: 30000
  });

  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery<{ data: { logs: VoIPLogEntry[], pagination: any } }>({
    queryKey: ['/api/voip/logs', logFilter !== 'all' ? { action: logFilter } : {}],
    enabled: activeSubTab === 'logs',
    staleTime: 10000
  });

  const { data: statsData, isLoading: statsLoading } = useQuery<{ data: any }>({
    queryKey: ['/api/voip/logs/stats'],
    enabled: activeSubTab === 'logs',
    staleTime: 60000
  });

  const config = settingsData?.data?.config;
  const isConfigured = settingsData?.data?.configured;

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      tenantExternalId: config?.tenantExternalId || '',
      apiKey: '',
      webhookSecret: '',
      apiBaseUrl: config?.apiBaseUrl || 'https://edgvoip.it/api/v2/voip',
      enabled: config?.enabled ?? true
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: SettingsFormValues) => {
      const payload: any = {
        tenantExternalId: data.tenantExternalId,
        enabled: data.enabled
      };
      if (data.apiKey) payload.apiKey = data.apiKey;
      if (data.webhookSecret) payload.webhookSecret = data.webhookSecret;
      if (data.apiBaseUrl) payload.apiBaseUrl = data.apiBaseUrl;
      
      return apiRequest('PUT', '/api/voip/settings', payload);
    },
    onSuccess: () => {
      toast({
        title: "Configurazione salvata",
        description: "Le impostazioni VoIP sono state aggiornate"
      });
      form.reset({ ...form.getValues(), apiKey: '' });
      queryClient.invalidateQueries({ queryKey: ['/api/voip/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile salvare la configurazione",
        variant: "destructive"
      });
    }
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/voip/settings/test', null);
    },
    onSuccess: (response: any) => {
      const isConnected = response?.data?.connected;
      toast({
        title: isConnected ? "Connessione riuscita" : "Connessione fallita",
        description: isConnected 
          ? "La connessione con EDGVoIP è attiva" 
          : response?.data?.error || "Impossibile connettersi a EDGVoIP",
        variant: isConnected ? "default" : "destructive"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/voip/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore test connessione",
        description: error.message || "Errore durante il test di connessione",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: SettingsFormValues) => {
    saveMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Connesso</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Errore</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800"><AlertCircle className="w-3 h-3 mr-1" /> Sconosciuto</Badge>;
    }
  };

  const getLogStatusBadge = (status: string) => {
    return status === 'ok' 
      ? <Badge className="bg-green-100 text-green-700">OK</Badge>
      : <Badge className="bg-red-100 text-red-700">FAIL</Badge>;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (settingsLoading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/90 backdrop-blur-xl border-gray-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Integrazione EDGVoIP API v2</CardTitle>
                <CardDescription>Gestisci la connessione con il sistema telefonico</CardDescription>
              </div>
            </div>
            {isConfigured && (
              <div className="flex items-center gap-3">
                {getStatusBadge(config?.connectionStatus || 'unknown')}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending}
                  data-testid="button-test-connection"
                >
                  {testMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <PlayCircle className="w-4 h-4 mr-2" />
                  )}
                  Test Connessione
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as any)}>
            <TabsList className="mb-6 bg-gray-100/50">
              <TabsTrigger value="config" data-testid="subtab-config">
                <Key className="w-4 h-4 mr-2" />
                Configurazione API
              </TabsTrigger>
              <TabsTrigger value="logs" data-testid="subtab-logs">
                <Activity className="w-4 h-4 mr-2" />
                Log Attività
              </TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-6">
              {!isConfigured && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">VoIP non configurato</p>
                    <p className="text-sm text-amber-700">Inserisci le credenziali API per attivare l'integrazione con EDGVoIP</p>
                  </div>
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="tenantExternalId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tenant ID Esterno *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="es: tenant_abc123" 
                              {...field}
                              data-testid="input-tenant-external-id"
                            />
                          </FormControl>
                          <FormDescription>
                            Identificativo univoco assegnato da EDGVoIP
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="apiBaseUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL Base API</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://edgvoip.it/api/v2/voip" 
                              {...field}
                              data-testid="input-api-base-url"
                            />
                          </FormControl>
                          <FormDescription>
                            Lascia vuoto per usare l'URL di default
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="apiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Chiave API {isConfigured ? '(lascia vuoto per mantenere)' : '*'}
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showApiKey ? 'text' : 'password'}
                                placeholder={isConfigured ? `●●●●●●●●${config?.apiKeyLastFour || ''}` : 'sk_live_...'}
                                {...field}
                                data-testid="input-api-key"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => setShowApiKey(!showApiKey)}
                                data-testid="button-toggle-api-key"
                              >
                                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormDescription>
                            La chiave viene crittografata prima del salvataggio
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="webhookSecret"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Webhook Secret</FormLabel>
                          <FormControl>
                            <Input 
                              type="password"
                              placeholder="whsec_..." 
                              {...field}
                              data-testid="input-webhook-secret"
                            />
                          </FormControl>
                          <FormDescription>
                            Usato per verificare le firme HMAC dei webhook
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                        <div>
                          <FormLabel className="text-base">Integrazione attiva</FormLabel>
                          <FormDescription>
                            Abilita o disabilita la sincronizzazione con EDGVoIP
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-enabled"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {isConfigured && config?.lastConnectionTest && (
                    <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        Ultimo test: {formatDate(config.lastConnectionTest)}
                      </div>
                      {config.connectionError && (
                        <div className="text-sm text-red-600 flex items-center gap-1">
                          <XCircle className="w-4 h-4" />
                          {config.connectionError}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => refetchSettings()}
                      data-testid="button-refresh"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Aggiorna
                    </Button>
                    <Button
                      type="submit"
                      disabled={saveMutation.isPending}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      data-testid="button-save-settings"
                    >
                      {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Salva Configurazione
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="logs" className="space-y-6">
              {statsLoading ? (
                <LoadingState />
              ) : statsData?.data && (
                <div className="grid grid-cols-4 gap-4">
                  <Card className="p-4 bg-green-50 border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm text-green-800">Operazioni OK</p>
                        <p className="text-2xl font-bold text-green-700">
                          {statsData.data.byStatus?.find((s: any) => s.status === 'ok')?.count || 0}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 bg-red-50 border-red-200">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <div>
                        <p className="text-sm text-red-800">Errori</p>
                        <p className="text-2xl font-bold text-red-700">
                          {statsData.data.byStatus?.find((s: any) => s.status === 'fail')?.count || 0}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 bg-blue-50 border-blue-200">
                    <div className="flex items-center gap-2">
                      <Server className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-blue-800">Sync Trunks</p>
                        <p className="text-2xl font-bold text-blue-700">
                          {statsData.data.byTargetType?.find((s: any) => s.targetType === 'trunk')?.count || 0}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 bg-purple-50 border-purple-200">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="text-sm text-purple-800">Sync Extensions</p>
                        <p className="text-2xl font-bold text-purple-700">
                          {statsData.data.byTargetType?.find((s: any) => s.targetType === 'ext')?.count || 0}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Select value={logFilter} onValueChange={setLogFilter}>
                    <SelectTrigger className="w-48" data-testid="select-log-filter">
                      <SelectValue placeholder="Filtra per tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i log</SelectItem>
                      <SelectItem value="trunk">Trunks</SelectItem>
                      <SelectItem value="ext">Extensions</SelectItem>
                      <SelectItem value="cdr">CDR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchLogs()}
                  data-testid="button-refresh-logs"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Aggiorna Log
                </Button>
              </div>

              {logsLoading ? (
                <LoadingState />
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Data</TableHead>
                        <TableHead>Azione</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Target ID</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead>Dettagli</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsData?.data?.logs?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                            Nessun log disponibile
                          </TableCell>
                        </TableRow>
                      ) : (
                        logsData?.data?.logs?.map((log) => (
                          <TableRow key={log.id} data-testid={`table-row-log-${log.id}`}>
                            <TableCell className="text-sm text-gray-600">
                              {formatDate(log.createdAt)}
                            </TableCell>
                            <TableCell className="font-medium">{log.action}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {log.targetType}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-gray-600">
                              {log.targetId?.substring(0, 8)}...
                            </TableCell>
                            <TableCell>
                              {getLogStatusBadge(log.status)}
                            </TableCell>
                            <TableCell className="max-w-48 truncate text-xs text-gray-500">
                              {log.detailsJson ? JSON.stringify(log.detailsJson).substring(0, 50) + '...' : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {logsData?.data?.pagination && (
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>
                    Mostrando {logsData.data.logs?.length || 0} di {logsData.data.pagination.total} log
                  </span>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
