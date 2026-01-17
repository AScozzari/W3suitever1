import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Globe, 
  Building2, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Save,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const COLORS = {
  primary: { orange: '#FF6900', orangeLight: '#ff8533', purple: '#7B2CBF' },
  semantic: { success: '#10b981', warning: '#f59e0b', error: '#ef4444' },
  neutral: { dark: '#1f2937', medium: '#6b7280', light: '#9ca3af', lighter: '#e5e7eb', lightest: '#f9fafb', white: '#ffffff' },
};

interface GlobalGTMConfig {
  id: string;
  containerId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TenantGTMConfig {
  id: string;
  tenantId: string;
  ga4MeasurementId: string | null;
  hasApiSecret: boolean;
  isActive: boolean;
  tenantName: string | null;
  tenantSlug: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function GTMConfigTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [containerId, setContainerId] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [tenantForm, setTenantForm] = useState({
    ga4MeasurementId: '',
    ga4ApiSecret: '',
    isActive: true
  });
  const [showSecret, setShowSecret] = useState(false);

  const { data: globalConfig, isLoading: loadingGlobal } = useQuery<{ success: boolean; data: GlobalGTMConfig | null }>({
    queryKey: ['/brand-api/gtm/global']
  });

  const { data: tenantConfigs, isLoading: loadingTenants } = useQuery<{ success: boolean; data: TenantGTMConfig[] }>({
    queryKey: ['/brand-api/gtm/tenants']
  });

  const { data: tenantsData } = useQuery<{ organizations: Array<{ id: string; name: string; slug: string }> }>({
    queryKey: ['/brand-api/organizations']
  });

  const saveGlobalMutation = useMutation({
    mutationFn: async (data: { containerId: string }) => {
      return apiRequest('/brand-api/gtm/global', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/gtm/global'] });
      toast({
        title: "Salvato",
        description: "Container ID GTM salvato con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile salvare la configurazione",
        variant: "destructive"
      });
    }
  });

  const saveTenantMutation = useMutation({
    mutationFn: async ({ tenantId, data }: { tenantId: string; data: typeof tenantForm }) => {
      return apiRequest(`/brand-api/gtm/tenants/${tenantId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/gtm/tenants'] });
      setSelectedTenant(null);
      setTenantForm({ ga4MeasurementId: '', ga4ApiSecret: '', isActive: true });
      toast({
        title: "Salvato",
        description: "Configurazione tenant salvata con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile salvare la configurazione",
        variant: "destructive"
      });
    }
  });

  const handleSaveGlobal = () => {
    if (!containerId.match(/^GTM-[A-Z0-9]+$/)) {
      toast({
        title: "Formato non valido",
        description: "Il Container ID deve essere nel formato GTM-XXXXXXX",
        variant: "destructive"
      });
      return;
    }
    saveGlobalMutation.mutate({ containerId });
  };

  const handleSaveTenant = () => {
    if (!selectedTenant) return;
    saveTenantMutation.mutate({
      tenantId: selectedTenant,
      data: tenantForm
    });
  };

  const handleSelectTenantForEdit = (tenantId: string) => {
    setSelectedTenant(tenantId);
    const existing = tenantConfigs?.data?.find(c => c.tenantId === tenantId);
    if (existing) {
      setTenantForm({
        ga4MeasurementId: existing.ga4MeasurementId || '',
        ga4ApiSecret: '',
        isActive: existing.isActive
      });
    } else {
      setTenantForm({ ga4MeasurementId: '', ga4ApiSecret: '', isActive: true });
    }
  };

  const allTenants = tenantsData?.organizations || [];
  const configuredTenantIds = new Set(tenantConfigs?.data?.map(c => c.tenantId) || []);

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: COLORS.neutral.dark, marginBottom: '0.5rem' }}>
          Configurazione Google Tag Manager
        </h2>
        <p style={{ color: COLORS.neutral.medium }}>
          Gestisci il Container ID globale e le configurazioni API per ogni tenant
        </p>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                width: '2.5rem', 
                height: '2.5rem', 
                borderRadius: '0.5rem', 
                background: `linear-gradient(135deg, ${COLORS.primary.orange}, ${COLORS.primary.orangeLight})`,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <Globe size={20} color="white" />
              </div>
              <div>
                <CardTitle>Container ID Globale</CardTitle>
                <CardDescription>
                  Questo ID sarà usato per generare gli snippet GTM per tutti i tenant
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingGlobal ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: COLORS.neutral.medium }}>
                <Loader2 size={16} className="animate-spin" />
                Caricamento...
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <Label htmlFor="containerId">Container ID</Label>
                  <Input
                    id="containerId"
                    placeholder="GTM-XXXXXXX"
                    value={containerId || globalConfig?.data?.containerId || ''}
                    onChange={(e) => setContainerId(e.target.value.toUpperCase())}
                    style={{ marginTop: '0.5rem' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: COLORS.neutral.light, marginTop: '0.25rem' }}>
                    Formato: GTM-XXXXXXX (es. GTM-ABC123)
                  </p>
                </div>
                <Button 
                  onClick={handleSaveGlobal}
                  disabled={saveGlobalMutation.isPending}
                  style={{ 
                    background: COLORS.primary.orange,
                    color: 'white'
                  }}
                >
                  {saveGlobalMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  <span style={{ marginLeft: '0.5rem' }}>Salva</span>
                </Button>
              </div>
            )}

            {globalConfig?.data && (
              <div style={{ 
                marginTop: '1rem', 
                padding: '0.75rem', 
                background: COLORS.neutral.lightest,
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckCircle size={16} color={COLORS.semantic.success} />
                <span style={{ color: COLORS.neutral.dark }}>
                  Container attivo: <strong>{globalConfig.data.containerId}</strong>
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                width: '2.5rem', 
                height: '2.5rem', 
                borderRadius: '0.5rem', 
                background: `linear-gradient(135deg, ${COLORS.primary.purple}, #9b4de0)`,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <Building2 size={20} color="white" />
              </div>
              <div>
                <CardTitle>Configurazioni Tenant</CardTitle>
                <CardDescription>
                  Configura le API Secret GA4 per il Measurement Protocol di ogni tenant
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingTenants ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: COLORS.neutral.medium }}>
                <Loader2 size={16} className="animate-spin" />
                Caricamento tenant...
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(15rem, 1fr))',
                  gap: '0.75rem'
                }}>
                  {allTenants.map((tenant) => {
                    const config = tenantConfigs?.data?.find(c => c.tenantId === tenant.id);
                    const isConfigured = !!config;
                    const isSelected = selectedTenant === tenant.id;

                    return (
                      <div
                        key={tenant.id}
                        onClick={() => handleSelectTenantForEdit(tenant.id)}
                        style={{
                          padding: '1rem',
                          borderRadius: '0.5rem',
                          border: isSelected 
                            ? `2px solid ${COLORS.primary.orange}` 
                            : `1px solid ${COLORS.neutral.lighter}`,
                          background: isSelected ? COLORS.neutral.lightest : 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h4 style={{ fontWeight: 500, color: COLORS.neutral.dark }}>{tenant.name}</h4>
                            <p style={{ fontSize: '0.75rem', color: COLORS.neutral.light }}>{tenant.slug}</p>
                          </div>
                          {isConfigured ? (
                            <Badge style={{ 
                              background: config.isActive ? COLORS.semantic.success : COLORS.neutral.light,
                              color: 'white'
                            }}>
                              {config.isActive ? 'Attivo' : 'Disattivo'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" style={{ color: COLORS.neutral.light }}>
                              Non configurato
                            </Badge>
                          )}
                        </div>
                        {isConfigured && config.ga4MeasurementId && (
                          <p style={{ 
                            fontSize: '0.75rem', 
                            color: COLORS.neutral.medium, 
                            marginTop: '0.5rem' 
                          }}>
                            GA4: {config.ga4MeasurementId}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {selectedTenant && (
                  <div style={{ 
                    marginTop: '1rem',
                    padding: '1.5rem',
                    background: COLORS.neutral.lightest,
                    borderRadius: '0.75rem',
                    border: `1px solid ${COLORS.neutral.lighter}`
                  }}>
                    <h4 style={{ fontWeight: 600, marginBottom: '1rem', color: COLORS.neutral.dark }}>
                      Configura: {allTenants.find(t => t.id === selectedTenant)?.name}
                    </h4>
                    
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      <div>
                        <Label htmlFor="ga4MeasurementId">GA4 Measurement ID (Default Tenant)</Label>
                        <Input
                          id="ga4MeasurementId"
                          placeholder="G-XXXXXXXXXX"
                          value={tenantForm.ga4MeasurementId}
                          onChange={(e) => setTenantForm(prev => ({ 
                            ...prev, 
                            ga4MeasurementId: e.target.value.toUpperCase() 
                          }))}
                          style={{ marginTop: '0.5rem' }}
                        />
                        <p style={{ fontSize: '0.75rem', color: COLORS.neutral.light, marginTop: '0.25rem' }}>
                          Usato come fallback se gli store non hanno un proprio ID
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="ga4ApiSecret">GA4 API Secret (Measurement Protocol)</Label>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <Input
                              id="ga4ApiSecret"
                              type={showSecret ? 'text' : 'password'}
                              placeholder="Inserisci API Secret"
                              value={tenantForm.ga4ApiSecret}
                              onChange={(e) => setTenantForm(prev => ({ 
                                ...prev, 
                                ga4ApiSecret: e.target.value 
                              }))}
                            />
                            <button
                              type="button"
                              onClick={() => setShowSecret(!showSecret)}
                              style={{
                                position: 'absolute',
                                right: '0.75rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: COLORS.neutral.medium
                              }}
                            >
                              {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: COLORS.neutral.light, marginTop: '0.25rem' }}>
                          Lascia vuoto per mantenere il secret esistente. Verrà criptato con AES-256-GCM.
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Switch
                          checked={tenantForm.isActive}
                          onCheckedChange={(checked) => setTenantForm(prev => ({ ...prev, isActive: checked }))}
                        />
                        <Label>Configurazione attiva</Label>
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <Button
                          onClick={handleSaveTenant}
                          disabled={saveTenantMutation.isPending}
                          style={{ background: COLORS.primary.orange, color: 'white' }}
                        >
                          {saveTenantMutation.isPending ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Save size={16} />
                          )}
                          <span style={{ marginLeft: '0.5rem' }}>Salva Configurazione</span>
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedTenant(null);
                            setTenantForm({ ga4MeasurementId: '', ga4ApiSecret: '', isActive: true });
                          }}
                        >
                          Annulla
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                width: '2.5rem', 
                height: '2.5rem', 
                borderRadius: '0.5rem', 
                background: COLORS.neutral.lighter,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <Settings size={20} color={COLORS.neutral.medium} />
              </div>
              <div>
                <CardTitle>Architettura GTM</CardTitle>
                <CardDescription>
                  Come funziona la configurazione centralizzata
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
              gap: '1rem'
            }}>
              <div style={{ 
                padding: '1rem', 
                background: COLORS.neutral.lightest, 
                borderRadius: '0.5rem',
                borderLeft: `4px solid ${COLORS.primary.orange}`
              }}>
                <h5 style={{ fontWeight: 600, marginBottom: '0.5rem', color: COLORS.neutral.dark }}>
                  1. Container ID (Globale)
                </h5>
                <p style={{ fontSize: '0.875rem', color: COLORS.neutral.medium }}>
                  Un unico Container GTM per tutti i tenant. Configurato qui.
                </p>
              </div>
              <div style={{ 
                padding: '1rem', 
                background: COLORS.neutral.lightest, 
                borderRadius: '0.5rem',
                borderLeft: `4px solid ${COLORS.primary.purple}`
              }}>
                <h5 style={{ fontWeight: 600, marginBottom: '0.5rem', color: COLORS.neutral.dark }}>
                  2. API Secrets (Per Tenant)
                </h5>
                <p style={{ fontSize: '0.875rem', color: COLORS.neutral.medium }}>
                  Ogni tenant ha la propria API Secret criptata per il Measurement Protocol.
                </p>
              </div>
              <div style={{ 
                padding: '1rem', 
                background: COLORS.neutral.lightest, 
                borderRadius: '0.5rem',
                borderLeft: `4px solid ${COLORS.semantic.success}`
              }}>
                <h5 style={{ fontWeight: 600, marginBottom: '0.5rem', color: COLORS.neutral.dark }}>
                  3. Tracking IDs (Per Store)
                </h5>
                <p style={{ fontSize: '0.875rem', color: COLORS.neutral.medium }}>
                  Ogni store configura i propri GA4, Google Ads, Facebook e TikTok IDs.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
