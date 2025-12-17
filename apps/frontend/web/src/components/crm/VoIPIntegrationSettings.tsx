import { useState, useEffect } from 'react';
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
  Copy,
  Clock,
  Server,
  Wifi,
  WifiOff,
  FlaskConical,
  Zap
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

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
    hasWebhookSecret: boolean;
  } | null;
}

interface VoIPLogEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  status: string;
  detailsJson: any;
  ts: string;
}

interface APITestResult {
  name: string;
  endpoint: string;
  description: string;
  success: boolean;
  status: number | null;
  responseTime: number;
  error: string | null;
  data?: { count?: number };
}

interface APITestResponse {
  summary: {
    passed: number;
    failed: number;
    total: number;
    allPassed: boolean;
    testedAt: string;
  };
  results: APITestResult[];
}

interface WebhookTestResult {
  success: boolean;
  diagnostics: {
    secretConfigured: boolean;
    endpointReachable: boolean;
    signatureValid: boolean;
    tenantRecognized: boolean;
    responseTime: number;
  };
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: any;
  };
  response: {
    status: number;
    statusText: string;
    body: any;
  };
  error?: string;
}

const WEBHOOK_EVENT_TYPES = [
  { value: 'trunk.status', label: 'Trunk Status', description: 'Cambio stato registrazione trunk', color: 'bg-purple-500' },
  { value: 'extension.status', label: 'Extension Status', description: 'Cambio stato estensione', color: 'bg-indigo-500' },
  { value: 'call.started', label: 'Call Started', description: 'Chiamata iniziata', color: 'bg-green-500' },
  { value: 'call.answered', label: 'Call Answered', description: 'Chiamata risposta', color: 'bg-blue-500' },
  { value: 'call.ended', label: 'Call Ended', description: 'Chiamata terminata', color: 'bg-red-500' },
  { value: 'cdr.created', label: 'CDR Created', description: 'CDR generato', color: 'bg-orange-500' },
];

function WebhookTestPanel({ config, onTestComplete }: { 
  config: VoIPSettingsResponse['config'];
  onTestComplete: () => void;
}) {
  const { toast } = useToast();
  const [selectedEvent, setSelectedEvent] = useState('trunk.status');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<WebhookTestResult | null>(null);
  const [showPayload, setShowPayload] = useState(false);

  const runWebhookTest = async () => {
    setIsLoading(true);
    setTestResult(null);
    try {
      const response = await apiRequest('/api/voip/webhooks/test-advanced', { 
        method: 'POST',
        body: JSON.stringify({ eventType: selectedEvent })
      });
      
      if (response.success) {
        setTestResult(response.data);
        toast({
          title: response.data.success ? 'Test completato con successo' : 'Test completato con errori',
          description: response.data.success 
            ? `Evento ${selectedEvent} processato in ${response.data.diagnostics?.responseTime || 0}ms`
            : response.data.error || 'Verifica i dettagli del test',
          variant: response.data.success ? 'default' : 'destructive'
        });
        onTestComplete();
      } else {
        toast({
          title: 'Errore test webhook',
          description: response.error || 'Test fallito',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile eseguire il test webhook',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!config?.hasWebhookSecret) {
    return (
      <div className="text-center py-8 text-gray-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="font-medium">Webhook Secret non configurato</p>
        <p className="text-sm mt-2">
          Vai alla tab "Configurazione API" e inserisci il Webhook Secret
          per abilitare i test webhook.
        </p>
      </div>
    );
  }

  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/webhooks/edgvoip`
    : '/api/webhooks/edgvoip';

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-blue-800">Test Avanzato Webhook Bidirezionale</p>
          <p className="text-sm text-blue-700">
            Simula eventi webhook da EDGVoIP per verificare firma HMAC, connettività endpoint e processamento eventi.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 border-green-200 bg-green-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Webhook Secret</p>
              <p className="font-medium text-green-700">Configurato</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Server className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-600">Endpoint URL</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded truncate block">
                  {webhookUrl}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    toast({ title: 'URL copiato!' });
                  }}
                  data-testid="button-copy-webhook-url"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h4 className="font-medium mb-4 flex items-center gap-2">
          <FlaskConical className="w-4 h-4" />
          Simulatore Eventi
        </h4>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Tipo Evento da Simulare</label>
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
              <SelectTrigger className="w-full" data-testid="select-webhook-event-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEBHOOK_EVENT_TYPES.map((event) => (
                  <SelectItem key={event.value} value={event.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${event.color}`} />
                      <span>{event.label}</span>
                      <span className="text-xs text-gray-500">- {event.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={runWebhookTest}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            data-testid="button-run-webhook-test"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Esecuzione test...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Esegui Test Webhook
              </>
            )}
          </Button>
        </div>
      </Card>

      {testResult && (
        <>
          <Card className={`p-4 ${testResult.success ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
            <div className="flex items-center gap-3 mb-4">
              {testResult.success ? (
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600" />
              )}
              <div>
                <p className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {testResult.success ? 'Test Superato' : 'Test Fallito'}
                </p>
                {testResult.error && (
                  <p className="text-sm text-red-600">{testResult.error}</p>
                )}
              </div>
              {testResult.diagnostics?.responseTime && (
                <Badge className="ml-auto bg-gray-100 text-gray-700">
                  <Clock className="w-3 h-3 mr-1" />
                  {testResult.diagnostics.responseTime}ms
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-4 gap-3">
              <DiagnosticItem 
                label="Secret" 
                passed={testResult.diagnostics?.secretConfigured} 
              />
              <DiagnosticItem 
                label="Endpoint" 
                passed={testResult.diagnostics?.endpointReachable} 
              />
              <DiagnosticItem 
                label="Firma HMAC" 
                passed={testResult.diagnostics?.signatureValid} 
              />
              <DiagnosticItem 
                label="Tenant" 
                passed={testResult.diagnostics?.tenantRecognized} 
              />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Dettagli Request/Response
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPayload(!showPayload)}
                data-testid="button-toggle-payload"
              >
                {showPayload ? 'Nascondi' : 'Mostra'} Payload
              </Button>
            </div>

            {showPayload && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">REQUEST</p>
                  <div className="bg-gray-900 text-green-400 rounded p-3 text-xs font-mono overflow-x-auto">
                    <div className="text-gray-400">
                      {testResult.request?.method} {testResult.request?.url}
                    </div>
                    {testResult.request?.headers && (
                      <div className="mt-2 text-gray-500">
                        {Object.entries(testResult.request.headers).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-blue-400">{key}:</span> {String(value).substring(0, 50)}...
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 text-white whitespace-pre-wrap">
                      {JSON.stringify(testResult.request?.body, null, 2)}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">RESPONSE</p>
                  <div className="bg-gray-900 text-green-400 rounded p-3 text-xs font-mono overflow-x-auto">
                    <div className={testResult.response?.status >= 200 && testResult.response?.status < 300 ? 'text-green-400' : 'text-red-400'}>
                      HTTP {testResult.response?.status} {testResult.response?.statusText}
                    </div>
                    <div className="mt-2 text-white whitespace-pre-wrap">
                      {JSON.stringify(testResult.response?.body, null, 2)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      <Card className="p-4 bg-gray-50">
        <h4 className="font-medium mb-3">Eventi Webhook Supportati</h4>
        <div className="grid grid-cols-3 gap-2 text-sm">
          {WEBHOOK_EVENT_TYPES.map((event) => (
            <div key={event.value} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${event.color}`} />
              <span className="font-mono text-xs">{event.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function DiagnosticItem({ label, passed }: { label: string; passed?: boolean }) {
  return (
    <div className={`p-2 rounded text-center ${passed ? 'bg-green-100' : 'bg-red-100'}`}>
      <div className="flex justify-center mb-1">
        {passed ? (
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        ) : (
          <XCircle className="w-4 h-4 text-red-600" />
        )}
      </div>
      <p className={`text-xs font-medium ${passed ? 'text-green-700' : 'text-red-700'}`}>
        {label}
      </p>
    </div>
  );
}

const settingsFormSchema = z.object({
  tenantExternalId: z.string().min(1, "ID esterno tenant obbligatorio"),
  apiKey: z.string().optional(),
  webhookSecret: z.string().optional(),
  apiBaseUrl: z.string().optional().refine(
    (val) => !val || val === '' || /^https?:\/\/.+/.test(val),
    "URL API non valido"
  ),
  enabled: z.boolean().default(true)
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export function VoIPIntegrationSettings() {
  const { toast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'config' | 'logs' | 'test' | 'webhook'>('config');
  const [logFilter, setLogFilter] = useState<string>('all');
  const [testResults, setTestResults] = useState<APITestResponse | null>(null);
  const [webhookTestLoading, setWebhookTestLoading] = useState(false);

  const { data: settingsData, isLoading: settingsLoading, refetch: refetchSettings } = useQuery<VoIPSettingsResponse>({
    queryKey: ['/api/voip/settings'],
    staleTime: 30000
  });

  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery<{ logs: VoIPLogEntry[], pagination: any }>({
    queryKey: ['/api/voip/logs', logFilter !== 'all' ? { action: logFilter } : {}],
    enabled: activeSubTab === 'logs',
    staleTime: 10000
  });

  const { data: statsData, isLoading: statsLoading } = useQuery<any>({
    queryKey: ['/api/voip/logs/stats'],
    enabled: activeSubTab === 'logs',
    staleTime: 60000
  });

  const config = settingsData?.config;
  const isConfigured = settingsData?.configured;

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      tenantExternalId: '',
      apiKey: '',
      webhookSecret: '',
      apiBaseUrl: 'https://edgvoip.it/api/v2/voip',
      enabled: true
    }
  });

  // Update form when config data is loaded
  useEffect(() => {
    if (config) {
      form.reset({
        tenantExternalId: config.tenantExternalId || '',
        apiKey: '',
        webhookSecret: '',
        apiBaseUrl: config.apiBaseUrl || 'https://edgvoip.it/api/v2/voip',
        enabled: config.enabled ?? true
      });
    }
  }, [config, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: SettingsFormValues) => {
      const payload: any = {
        tenantExternalId: data.tenantExternalId,
        enabled: data.enabled
      };
      if (data.apiKey) payload.apiKey = data.apiKey;
      if (data.webhookSecret) payload.webhookSecret = data.webhookSecret;
      if (data.apiBaseUrl) payload.apiBaseUrl = data.apiBaseUrl;
      
      return apiRequest('/api/voip/settings', { method: 'PUT', body: payload });
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
      return apiRequest('/api/voip/settings/test', { method: 'POST' });
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

  const testAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/voip/settings/test-all', { method: 'POST' });
    },
    onSuccess: (response: any) => {
      const data = response?.data as APITestResponse;
      setTestResults(data);
      const allPassed = data?.summary?.allPassed;
      toast({
        title: allPassed ? "Tutti i test superati!" : "Alcuni test falliti",
        description: `${data?.summary?.passed}/${data?.summary?.total} endpoint funzionanti`,
        variant: allPassed ? "default" : "destructive"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/voip/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore test API",
        description: error.message || "Errore durante il test delle API",
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
    const isSuccess = status === 'ok' || status === 'success';
    return isSuccess 
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

  const hasMissingCredentials = isConfigured && (!config?.hasApiKey || !config?.hasWebhookSecret);
  const hasApiKeyIssue = isConfigured && !config?.hasApiKey;
  const hasWebhookIssue = isConfigured && !config?.hasWebhookSecret;
  const hasConnectionError = config?.connectionStatus === 'error';

  const getCredentialStatusBadge = (hasCredential: boolean | undefined, label: string) => {
    if (hasCredential) {
      return (
        <Badge className="bg-green-100 text-green-800 border border-green-300">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          {label}
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-800 border border-red-300">
        <XCircle className="w-3 h-3 mr-1" />
        {label} mancante
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {hasMissingCredentials && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 flex items-start gap-3 shadow-sm" data-testid="alert-missing-credentials">
          <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-red-800 text-base">Credenziali Incomplete</p>
            <p className="text-sm text-red-700 mt-1">
              {hasApiKeyIssue && hasWebhookIssue 
                ? "La chiave API e il Webhook Secret non sono configurati. La sincronizzazione con EDGVoIP non funzionerà."
                : hasApiKeyIssue 
                  ? "La chiave API non è configurata. La sincronizzazione con EDGVoIP non funzionerà."
                  : "Il Webhook Secret non è configurato. Le notifiche in tempo reale da EDGVoIP non funzioneranno."}
            </p>
            <div className="flex gap-2 mt-3">
              {getCredentialStatusBadge(config?.hasApiKey, 'API Key')}
              {getCredentialStatusBadge(config?.hasWebhookSecret, 'Webhook Secret')}
            </div>
          </div>
        </div>
      )}

      {hasConnectionError && config?.connectionError && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 flex items-start gap-3 shadow-sm" data-testid="alert-connection-error">
          <WifiOff className="w-6 h-6 text-orange-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-orange-800 text-base">Errore di Connessione</p>
            <p className="text-sm text-orange-700 mt-1">{config.connectionError}</p>
            <p className="text-xs text-orange-600 mt-2">
              Ultimo tentativo: {config.lastConnectionTest ? formatDate(config.lastConnectionTest) : 'Mai'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            className="border-orange-400 text-orange-700 hover:bg-orange-100"
            data-testid="button-retry-connection"
          >
            {testMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Riprova
          </Button>
        </div>
      )}

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
                {getCredentialStatusBadge(config?.hasApiKey, 'API Key')}
                {getCredentialStatusBadge(config?.hasWebhookSecret, 'Webhook')}
                {getStatusBadge(config?.connectionStatus || 'unknown')}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testMutation.mutate()}
                  disabled={testMutation.isPending || !config?.hasApiKey}
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
              <TabsTrigger value="test" data-testid="subtab-test" disabled={!isConfigured}>
                <FlaskConical className="w-4 h-4 mr-2" />
                Test API
              </TabsTrigger>
              <TabsTrigger value="webhook" data-testid="subtab-webhook" disabled={!isConfigured || !config?.hasWebhookSecret}>
                <Zap className="w-4 h-4 mr-2" />
                Test Webhook
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
                            <Input 
                              type="password"
                              placeholder={isConfigured ? `●●●●●●●●${config?.apiKeyLastFour || ''}` : 'sk_live_...'}
                              {...field}
                              data-testid="input-api-key"
                            />
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
                          <FormLabel>
                            Webhook Secret {config?.hasWebhookSecret ? '(lascia vuoto per mantenere)' : ''}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="password"
                              placeholder={config?.hasWebhookSecret ? '●●●●●●●● (configurato)' : 'whsec_...'} 
                              {...field}
                              data-testid="input-webhook-secret"
                            />
                          </FormControl>
                          <FormDescription>
                            {config?.hasWebhookSecret 
                              ? <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Webhook secret configurato</span>
                              : 'Usato per verificare le firme HMAC dei webhook'}
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
                      type="button"
                      disabled={saveMutation.isPending}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      data-testid="button-save-settings"
                      onClick={() => {
                        form.handleSubmit(onSubmit)();
                      }}
                    >
                      {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Salva Configurazione
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="test" className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <FlaskConical className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-blue-800">Test Completo API EDGVoIP</p>
                  <p className="text-sm text-blue-700">Verifica la connettività e le autorizzazioni per ogni endpoint API disponibile</p>
                </div>
                <Button
                  onClick={() => testAllMutation.mutate()}
                  disabled={testAllMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-test-all-apis"
                >
                  {testAllMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Esegui Test Completo
                    </>
                  )}
                </Button>
              </div>

              {testResults && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <Card className={`p-4 ${testResults.summary.allPassed ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-center gap-3">
                        {testResults.summary.allPassed ? (
                          <CheckCircle2 className="w-8 h-8 text-green-600" />
                        ) : (
                          <AlertCircle className="w-8 h-8 text-amber-600" />
                        )}
                        <div>
                          <p className="text-sm text-gray-600">Stato Generale</p>
                          <p className={`text-lg font-bold ${testResults.summary.allPassed ? 'text-green-700' : 'text-amber-700'}`}>
                            {testResults.summary.allPassed ? 'Tutti OK' : 'Attenzione'}
                          </p>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 bg-green-50 border-green-200">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                        <div>
                          <p className="text-sm text-gray-600">Test Superati</p>
                          <p className="text-2xl font-bold text-green-700">
                            {testResults.summary.passed}/{testResults.summary.total}
                          </p>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 bg-red-50 border-red-200">
                      <div className="flex items-center gap-3">
                        <XCircle className="w-8 h-8 text-red-600" />
                        <div>
                          <p className="text-sm text-gray-600">Test Falliti</p>
                          <p className="text-2xl font-bold text-red-700">
                            {testResults.summary.failed}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <Card className="p-0 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="w-10">Stato</TableHead>
                          <TableHead>Endpoint</TableHead>
                          <TableHead>Descrizione</TableHead>
                          <TableHead className="w-24">HTTP Status</TableHead>
                          <TableHead className="w-24">Tempo (ms)</TableHead>
                          <TableHead>Risultato</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {testResults.results.map((result, idx) => (
                          <TableRow key={idx} data-testid={`test-result-row-${idx}`}>
                            <TableCell>
                              {result.success ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600" />
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{result.name}</p>
                                <p className="text-xs text-gray-500 font-mono">{result.endpoint}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {result.description}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={result.success 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                                }
                              >
                                {result.status || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {result.responseTime}ms
                            </TableCell>
                            <TableCell>
                              {result.success ? (
                                result.data?.count !== undefined ? (
                                  <span className="text-sm text-green-700">
                                    {result.data.count} elementi
                                  </span>
                                ) : (
                                  <span className="text-sm text-green-700">OK</span>
                                )
                              ) : (
                                <span className="text-sm text-red-600" title={result.error || ''}>
                                  {result.error?.substring(0, 30)}...
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>

                  <p className="text-xs text-gray-500 text-right">
                    Ultimo test: {new Date(testResults.summary.testedAt).toLocaleString('it-IT')}
                  </p>
                </>
              )}

              {!testResults && !testAllMutation.isPending && (
                <div className="text-center py-12 text-gray-500">
                  <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Clicca "Esegui Test Completo" per verificare tutti gli endpoint API</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="webhook" className="space-y-6">
              <WebhookTestPanel 
                config={config ?? null} 
                onTestComplete={() => refetchLogs()}
              />
            </TabsContent>

            <TabsContent value="logs" className="space-y-6">
              {statsLoading ? (
                <LoadingState />
              ) : statsData && (
                <div className="grid grid-cols-4 gap-4">
                  <Card className="p-4 bg-green-50 border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm text-green-800">Operazioni OK</p>
                        <p className="text-2xl font-bold text-green-700">
                          {statsData.byStatus?.find((s: any) => s.status === 'ok')?.count || 0}
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
                          {statsData.byStatus?.find((s: any) => s.status === 'fail')?.count || 0}
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
                          {statsData.byTargetType?.find((s: any) => s.targetType === 'trunk')?.count || 0}
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
                          {statsData.byTargetType?.find((s: any) => s.targetType === 'ext')?.count || 0}
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
                      {logsData?.logs?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                            Nessun log disponibile
                          </TableCell>
                        </TableRow>
                      ) : (
                        logsData?.logs?.map((log) => (
                          <TableRow key={log.id} data-testid={`table-row-log-${log.id}`}>
                            <TableCell className="text-sm text-gray-600">
                              {formatDate(log.ts)}
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

              {logsData?.pagination && (
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>
                    Mostrando {logsData.logs?.length || 0} di {logsData.pagination.total} log
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
