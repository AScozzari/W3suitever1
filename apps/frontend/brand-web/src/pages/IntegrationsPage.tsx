import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import BrandLayout from '../components/BrandLayout';
import { 
  Plug, Settings, Check, X, Loader2, AlertTriangle, RefreshCw,
  Shield, Lock, Eye, EyeOff, Save, TestTube, Building2, Globe
} from 'lucide-react';
import { apiRequest } from '../lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { useToast } from '../hooks/use-toast';

interface GlobalGTMConfig {
  id: string;
  containerId: string | null;
  isActive: boolean;
}

interface TenantGTMConfig {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  ga4MeasurementId: string | null;
  hasApiSecret: boolean;
  isActive: boolean;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState('gtm');
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [containerId, setContainerId] = useState('');
  const [globalActive, setGlobalActive] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [ga4MeasurementId, setGa4MeasurementId] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [tenantActive, setTenantActive] = useState(true);

  const { data: globalConfigData, isLoading: globalLoading } = useQuery({
    queryKey: ['/brand-api/gtm/global'],
  });

  const { data: tenantsConfigData, isLoading: tenantsLoading } = useQuery({
    queryKey: ['/brand-api/gtm/tenants'],
  });

  const { data: tenantsListData } = useQuery({
    queryKey: ['/brand-api/organizations'],
  });

  const globalConfig: GlobalGTMConfig | null = globalConfigData?.data || null;
  const tenantsConfig: TenantGTMConfig[] = tenantsConfigData?.data || [];
  const tenantsList: Tenant[] = tenantsListData?.organizations || [];

  useState(() => {
    if (globalConfig) {
      setContainerId(globalConfig.containerId || '');
      setGlobalActive(globalConfig.isActive);
    }
  });

  const saveGlobalMutation = useMutation({
    mutationFn: async (data: { containerId: string; isActive: boolean }) => {
      return apiRequest('/brand-api/gtm/global', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/gtm/global'] });
      toast({
        title: 'Configurazione salvata',
        description: 'Container ID GTM aggiornato con successo',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile salvare la configurazione',
        variant: 'destructive',
      });
    },
  });

  const saveTenantMutation = useMutation({
    mutationFn: async (data: { tenantId: string; ga4MeasurementId?: string; ga4ApiSecret?: string; isActive: boolean }) => {
      const { tenantId, ...body } = data;
      return apiRequest(`/brand-api/gtm/tenants/${tenantId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/gtm/tenants'] });
      setApiSecret('');
      setShowApiSecret(false);
      toast({
        title: 'Configurazione tenant salvata',
        description: 'API Secret GA4 aggiornato con successo',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile salvare la configurazione tenant',
        variant: 'destructive',
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      return apiRequest(`/brand-api/gtm/tenants/${tenantId}/test`, {
        method: 'POST',
      });
    },
    onSuccess: (data) => {
      toast({
        title: data?.success ? 'Connessione OK' : 'Connessione fallita',
        description: data?.message || 'Test completato',
        variant: data?.success ? 'default' : 'destructive',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore test',
        description: error.message || 'Test connessione fallito',
        variant: 'destructive',
      });
    },
  });

  const handleSaveGlobal = () => {
    if (!containerId.match(/^GTM-[A-Z0-9]+$/)) {
      toast({
        title: 'Formato non valido',
        description: 'Il Container ID deve essere nel formato GTM-XXXXXXX',
        variant: 'destructive',
      });
      return;
    }
    saveGlobalMutation.mutate({ containerId, isActive: globalActive });
  };

  const handleSaveTenant = () => {
    if (!selectedTenantId) {
      toast({
        title: 'Seleziona un tenant',
        description: 'Devi selezionare un tenant prima di salvare',
        variant: 'destructive',
      });
      return;
    }
    saveTenantMutation.mutate({
      tenantId: selectedTenantId,
      ga4MeasurementId: ga4MeasurementId || undefined,
      ga4ApiSecret: apiSecret || undefined,
      isActive: tenantActive,
    });
  };

  const handleTenantSelect = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    const existingConfig = tenantsConfig.find(t => t.tenantId === tenantId);
    if (existingConfig) {
      setGa4MeasurementId(existingConfig.ga4MeasurementId || '');
      setTenantActive(existingConfig.isActive);
    } else {
      setGa4MeasurementId('');
      setTenantActive(true);
    }
    setApiSecret('');
    setShowApiSecret(false);
  };

  const selectedTenantConfig = tenantsConfig.find(t => t.tenantId === selectedTenantId);

  return (
    <BrandLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
              <Plug className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Integrazioni</h1>
              <p className="text-gray-500">Configurazione GTM, Analytics e API esterne</p>
            </div>
          </div>
          {globalConfig?.isActive && (
            <Badge className="bg-green-100 text-green-700">
              <Check className="w-3 h-3 mr-1" />
              GTM Attivo
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="gtm" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Google Tag Manager
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gtm" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-500" />
                    Configurazione Globale
                  </CardTitle>
                  <CardDescription>
                    Container ID GTM condiviso da tutti i tenant
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {globalLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="containerId">Container ID</Label>
                        <Input
                          id="containerId"
                          placeholder="GTM-XXXXXXX"
                          value={containerId || globalConfig?.containerId || ''}
                          onChange={(e) => setContainerId(e.target.value.toUpperCase())}
                          className="font-mono"
                        />
                        <p className="text-xs text-gray-500">
                          Formato: GTM-XXXXXXX (es: GTM-ABC123D)
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>GTM Attivo</Label>
                          <p className="text-xs text-gray-500">Abilita/disabilita tracking globale</p>
                        </div>
                        <Switch
                          checked={globalActive}
                          onCheckedChange={setGlobalActive}
                        />
                      </div>

                      <Separator />

                      <Button 
                        onClick={handleSaveGlobal}
                        disabled={saveGlobalMutation.isPending}
                        className="w-full"
                      >
                        {saveGlobalMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Salva Container ID
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-purple-500" />
                    Configurazione per Tenant
                  </CardTitle>
                  <CardDescription>
                    API Secret GA4 per Measurement Protocol (server-side)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Seleziona Tenant</Label>
                    <Select value={selectedTenantId} onValueChange={handleTenantSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Scegli un tenant..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tenantsList.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.name} ({tenant.slug})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTenantId && (
                    <>
                      <Separator />

                      {selectedTenantConfig?.hasApiSecret && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-green-700 text-sm">
                          <Shield className="w-4 h-4" />
                          API Secret già configurato (criptato)
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="ga4MeasurementId">GA4 Measurement ID</Label>
                        <Input
                          id="ga4MeasurementId"
                          placeholder="G-XXXXXXXXXX"
                          value={ga4MeasurementId}
                          onChange={(e) => setGa4MeasurementId(e.target.value.toUpperCase())}
                          className="font-mono"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="apiSecret">
                          API Secret GA4
                          {selectedTenantConfig?.hasApiSecret && (
                            <span className="text-xs text-gray-500 ml-2">(lascia vuoto per mantenere)</span>
                          )}
                        </Label>
                        <div className="relative">
                          <Input
                            id="apiSecret"
                            type={showApiSecret ? 'text' : 'password'}
                            placeholder={selectedTenantConfig?.hasApiSecret ? '••••••••••••' : 'Inserisci API Secret'}
                            value={apiSecret}
                            onChange={(e) => setApiSecret(e.target.value)}
                            className="font-mono pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiSecret(!showApiSecret)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showApiSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">
                          L'API Secret viene criptato prima del salvataggio e non è mai visibile dopo
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Tracking Attivo</Label>
                          <p className="text-xs text-gray-500">Abilita per questo tenant</p>
                        </div>
                        <Switch
                          checked={tenantActive}
                          onCheckedChange={setTenantActive}
                        />
                      </div>

                      <Separator />

                      <div className="flex gap-2">
                        <Button 
                          onClick={handleSaveTenant}
                          disabled={saveTenantMutation.isPending}
                          className="flex-1"
                        >
                          {saveTenantMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          Salva Configurazione
                        </Button>
                        {selectedTenantConfig?.hasApiSecret && (
                          <Button
                            variant="outline"
                            onClick={() => testConnectionMutation.mutate(selectedTenantId)}
                            disabled={testConnectionMutation.isPending}
                          >
                            {testConnectionMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <TestTube className="w-4 h-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {tenantsConfig.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Tenant Configurati
                  </CardTitle>
                  <CardDescription>
                    Elenco dei tenant con configurazione GTM attiva
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {tenantsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <div className="divide-y">
                      {tenantsConfig.map((config) => (
                        <div 
                          key={config.id} 
                          className="flex items-center justify-between py-3 hover:bg-gray-50 px-2 rounded cursor-pointer"
                          onClick={() => handleTenantSelect(config.tenantId)}
                        >
                          <div className="flex items-center gap-3">
                            <Building2 className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="font-medium">{config.tenantName}</p>
                              <p className="text-sm text-gray-500">{config.tenantSlug}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {config.ga4MeasurementId && (
                              <Badge variant="outline" className="font-mono text-xs">
                                {config.ga4MeasurementId}
                              </Badge>
                            )}
                            {config.hasApiSecret && (
                              <Badge className="bg-green-100 text-green-700">
                                <Lock className="w-3 h-3 mr-1" />
                                Secret
                              </Badge>
                            )}
                            {config.isActive ? (
                              <Badge className="bg-blue-100 text-blue-700">Attivo</Badge>
                            ) : (
                              <Badge variant="secondary">Disattivo</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </BrandLayout>
  );
}
