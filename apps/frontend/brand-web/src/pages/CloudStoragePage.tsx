import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import BrandLayout from '../components/BrandLayout';
import { 
  Cloud, Settings, Database, BarChart3, FolderOpen,
  Check, X, Loader2, AlertTriangle, RefreshCw,
  HardDrive, Shield, Lock, Globe, Zap, Server,
  Upload, Download, Trash2, Eye, Plus, Edit,
  Users, Building2, Package, FileText, Image,
  Video, Music, Archive, Clock, TrendingUp
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
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { useToast } from '../hooks/use-toast';

interface StorageConfig {
  id: string;
  provider: string;
  bucketName: string | null;
  region: string | null;
  versioningEnabled: boolean;
  encryptionEnabled: boolean;
  encryptionType: string | null;
  corsEnabled: boolean;
  corsAllowedOrigins: string[] | null;
  signedUrlExpiryHours: number | null;
  maxUploadSizeMb: number | null;
  totalAllocatedBytes: number | null;
  connectionStatus: string | null;
  connectionError: string | null;
  lastConnectionTestAt: string | null;
  hasCredentials: boolean;
}

interface TenantAllocation {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string | null;
  quotaBytes: number;
  usedBytes: number;
  objectCount: number;
  alertThresholdPercent: number;
  suspended: boolean;
  suspendReason: string | null;
}

interface AnalyticsSummary {
  totalQuotaBytes: number;
  totalUsedBytes: number;
  totalObjectCount: number;
  usagePercent: number;
  tenantCount: number;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function CloudStoragePage() {
  const [activeTab, setActiveTab] = useState('config');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ['/brand-api/storage/config'],
  });

  const { data: allocationsData, isLoading: allocationsLoading } = useQuery({
    queryKey: ['/brand-api/storage/allocations'],
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/brand-api/storage/analytics'],
  });

  const config: StorageConfig | null = configData?.data || null;
  const allocations: TenantAllocation[] = allocationsData?.data || [];
  const analytics = analyticsData?.data || null;

  return (
    <BrandLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cloud Storage</h1>
              <p className="text-gray-500">Gestione centralizzata AWS S3 per tutti i tenant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config?.connectionStatus === 'connected' && (
              <Badge className="bg-green-100 text-green-700">
                <Check className="w-3 h-3 mr-1" />
                Connesso
              </Badge>
            )}
            {config?.connectionStatus === 'error' && (
              <Badge variant="destructive">
                <X className="w-3 h-3 mr-1" />
                Errore
              </Badge>
            )}
            {(!config || config.connectionStatus === 'not_tested') && (
              <Badge variant="secondary">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Non testato
              </Badge>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="config" className="flex items-center gap-2" data-testid="tab-config">
              <Settings className="w-4 h-4" />
              Configurazione AWS
            </TabsTrigger>
            <TabsTrigger value="bucket" className="flex items-center gap-2" data-testid="tab-bucket">
              <Database className="w-4 h-4" />
              Bucket
            </TabsTrigger>
            <TabsTrigger value="allocations" className="flex items-center gap-2" data-testid="tab-allocations">
              <Users className="w-4 h-4" />
              Quote Tenant
            </TabsTrigger>
            <TabsTrigger value="assets" className="flex items-center gap-2" data-testid="tab-assets">
              <Package className="w-4 h-4" />
              Brand Assets
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2" data-testid="tab-analytics">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="mt-6">
            <AWSConfigTab config={config} isLoading={configLoading} />
          </TabsContent>

          <TabsContent value="bucket" className="mt-6">
            <BucketManagementTab config={config} />
          </TabsContent>

          <TabsContent value="allocations" className="mt-6">
            <TenantAllocationsTab 
              allocations={allocations} 
              isLoading={allocationsLoading}
              config={config}
            />
          </TabsContent>

          <TabsContent value="assets" className="mt-6">
            <BrandAssetsTab 
              allocations={allocations}
              config={config}
            />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <AnalyticsTab 
              analytics={analytics}
              allocations={allocations}
              isLoading={analyticsLoading}
            />
          </TabsContent>
        </Tabs>
      </div>
    </BrandLayout>
  );
}

function AWSConfigTab({ config, isLoading }: { config: StorageConfig | null; isLoading: boolean }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [connectionTestResult, setConnectionTestResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    provider: config?.provider || 'aws_s3',
    accessKey: '',
    secretKey: '',
    bucketName: config?.bucketName || '',
    region: config?.region || 'eu-central-1',
    versioningEnabled: config?.versioningEnabled ?? true,
    encryptionEnabled: config?.encryptionEnabled ?? true,
    encryptionType: config?.encryptionType || 'AES256',
    corsEnabled: config?.corsEnabled ?? true,
    signedUrlExpiryHours: config?.signedUrlExpiryHours || 24,
    maxUploadSizeMb: config?.maxUploadSizeMb || 100
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/brand-api/storage/config', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/storage/config'] });
      toast({
        title: "Configurazione salvata",
        description: "Le impostazioni sono state salvate con successo"
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

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/brand-api/storage/test-connection', {
        method: 'POST'
      });
    },
    onSuccess: (data: any) => {
      setConnectionTestResult('success');
      queryClient.invalidateQueries({ queryKey: ['/brand-api/storage/config'] });
      toast({
        title: "✅ Connessione riuscita!",
        description: `Bucket "${data.data?.bucket || formData.bucketName}" raggiungibile nella regione ${data.data?.region || formData.region}`,
        duration: 5000
      });
    },
    onError: (error: any) => {
      setConnectionTestResult('error');
      toast({
        title: "❌ Connessione fallita",
        description: error.message || "Impossibile connettersi al bucket S3. Verifica le credenziali e riprova.",
        variant: "destructive",
        duration: 8000
      });
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/brand-api/storage/disconnect', {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      setConnectionTestResult('idle');
      setFormData({ ...formData, accessKey: '', secretKey: '' });
      queryClient.invalidateQueries({ queryKey: ['/brand-api/storage/config'] });
      toast({
        title: "Disconnesso",
        description: "Le credenziali AWS S3 sono state rimosse con successo"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile disconnettere",
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-orange-500" />
            Credenziali AWS
          </CardTitle>
          <CardDescription>
            Inserisci le credenziali IAM per accedere al bucket S3
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select 
              value={formData.provider} 
              onValueChange={(v) => setFormData({ ...formData, provider: v })}
            >
              <SelectTrigger data-testid="select-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aws_s3">Amazon S3</SelectItem>
                <SelectItem value="minio">MinIO</SelectItem>
                <SelectItem value="google_cloud_storage">Google Cloud Storage</SelectItem>
                <SelectItem value="azure_blob">Azure Blob Storage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Access Key ID</Label>
            <Input
              type="password"
              placeholder={config?.hasCredentials ? "••••••••••••••••••••" : "es: AKIA3EXAMPLEKEYID"}
              value={formData.accessKey}
              onChange={(e) => setFormData({ ...formData, accessKey: e.target.value })}
              data-testid="input-access-key"
            />
            <p className="text-xs text-gray-400">Formato: AKIA + 16 caratteri alfanumerici</p>
          </div>

          <div className="space-y-2">
            <Label>Secret Access Key</Label>
            <Input
              type="password"
              placeholder={config?.hasCredentials ? "••••••••••••••••••••••••••••••••••••••••" : "es: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLE"}
              value={formData.secretKey}
              onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
              data-testid="input-secret-key"
            />
            <p className="text-xs text-gray-400">Chiave segreta di 40 caratteri</p>
          </div>

          <div className="space-y-2">
            <Label>Nome Bucket</Label>
            <Input
              placeholder="w3suite-production-bucket"
              value={formData.bucketName}
              onChange={(e) => setFormData({ ...formData, bucketName: e.target.value })}
              data-testid="input-bucket-name"
            />
          </div>

          <div className="space-y-2">
            <Label>Regione</Label>
            <Select 
              value={formData.region} 
              onValueChange={(v) => setFormData({ ...formData, region: v })}
            >
              <SelectTrigger data-testid="select-region">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eu-central-1">EU (Frankfurt)</SelectItem>
                <SelectItem value="eu-west-1">EU (Ireland)</SelectItem>
                <SelectItem value="eu-west-2">EU (London)</SelectItem>
                <SelectItem value="eu-south-1">EU (Milan)</SelectItem>
                <SelectItem value="eu-north-1">EU (Stockholm)</SelectItem>
                <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Per GDPR, usa regioni EU
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-4 items-center">
            <Button 
              onClick={() => saveConfigMutation.mutate(formData)}
              disabled={saveConfigMutation.isPending}
              data-testid="btn-save-config"
            >
              {saveConfigMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Salva Configurazione
            </Button>
            <Button 
              variant="outline"
              onClick={() => testConnectionMutation.mutate()}
              disabled={testConnectionMutation.isPending || !config?.hasCredentials}
              data-testid="btn-test-connection"
            >
              {testConnectionMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Test Connessione
            </Button>
            {config?.hasCredentials && (
              <Button 
                variant="destructive"
                onClick={() => {
                  if (confirm('Sei sicuro di voler disconnettere AWS S3? Le credenziali verranno rimosse.')) {
                    disconnectMutation.mutate();
                  }
                }}
                disabled={disconnectMutation.isPending}
                data-testid="btn-disconnect"
              >
                {disconnectMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <X className="w-4 h-4 mr-2" />
                )}
                Disconnetti
              </Button>
            )}
            {connectionTestResult === 'success' && (
              <div className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Connesso</span>
              </div>
            )}
            {connectionTestResult === 'error' && (
              <div className="flex items-center gap-1 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                <X className="w-4 h-4" />
                <span className="text-sm font-medium">Errore</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-500" />
            Opzioni Bucket
          </CardTitle>
          <CardDescription>
            Configurazione versioning, encryption e CORS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Versioning</Label>
              <p className="text-sm text-gray-500">Mantieni cronologia delle versioni dei file</p>
            </div>
            <Switch
              checked={formData.versioningEnabled}
              onCheckedChange={(v) => setFormData({ ...formData, versioningEnabled: v })}
              data-testid="switch-versioning"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Encryption at Rest</Label>
              <p className="text-sm text-gray-500">Crittografia dei file salvati</p>
            </div>
            <Switch
              checked={formData.encryptionEnabled}
              onCheckedChange={(v) => setFormData({ ...formData, encryptionEnabled: v })}
              data-testid="switch-encryption"
            />
          </div>

          {formData.encryptionEnabled && (
            <div className="space-y-2 pl-4 border-l-2 border-gray-100">
              <Label>Tipo Encryption</Label>
              <Select 
                value={formData.encryptionType} 
                onValueChange={(v) => setFormData({ ...formData, encryptionType: v })}
              >
                <SelectTrigger data-testid="select-encryption-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AES256">AES-256 (SSE-S3)</SelectItem>
                  <SelectItem value="aws:kms">AWS KMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>CORS</Label>
              <p className="text-sm text-gray-500">Abilita upload diretto dal browser</p>
            </div>
            <Switch
              checked={formData.corsEnabled}
              onCheckedChange={(v) => setFormData({ ...formData, corsEnabled: v })}
              data-testid="switch-cors"
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Scadenza Signed URL (ore)</Label>
              <Input
                type="number"
                min={1}
                max={168}
                value={formData.signedUrlExpiryHours}
                onChange={(e) => setFormData({ ...formData, signedUrlExpiryHours: parseInt(e.target.value) || 24 })}
                data-testid="input-url-expiry"
              />
            </div>
            <div className="space-y-2">
              <Label>Max Upload Size (MB)</Label>
              <Input
                type="number"
                min={1}
                max={5000}
                value={formData.maxUploadSizeMb}
                onChange={(e) => setFormData({ ...formData, maxUploadSizeMb: parseInt(e.target.value) || 100 })}
                data-testid="input-max-upload"
              />
            </div>
          </div>

          {config?.lastConnectionTestAt && (
            <div className="pt-4 text-sm text-gray-500 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Ultimo test: {new Date(config.lastConnectionTestAt).toLocaleString('it-IT')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BucketManagementTab({ config }: { config: StorageConfig | null }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-blue-500" />
            Lifecycle Rules
          </CardTitle>
          <CardDescription>
            Regole per archiviazione automatica e pulizia
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Move to Glacier</span>
              <Badge variant="secondary">90 giorni</Badge>
            </div>
            <p className="text-sm text-gray-500">
              File non acceduti per 90 giorni vengono spostati su Glacier
            </p>
          </div>

          <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Delete Old Versions</span>
              <Badge variant="secondary">365 giorni</Badge>
            </div>
            <p className="text-sm text-gray-500">
              Versioni precedenti eliminate dopo 1 anno
            </p>
          </div>

          <Button variant="outline" className="w-full" data-testid="btn-add-lifecycle">
            <Plus className="w-4 h-4 mr-2" />
            Aggiungi Regola
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-green-500" />
            CORS Configuration
          </CardTitle>
          <CardDescription>
            Domini autorizzati per upload diretto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Allowed Origins</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="flex-1 font-mono text-sm">https://w3suite.it</span>
                <Button variant="ghost" size="sm">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="flex-1 font-mono text-sm">https://*.replit.dev</span>
                <Button variant="ghost" size="sm">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Input placeholder="https://example.com" data-testid="input-cors-origin" />
            <Button variant="outline" data-testid="btn-add-cors">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Allowed Methods</Label>
            <div className="flex flex-wrap gap-2">
              <Badge>GET</Badge>
              <Badge>PUT</Badge>
              <Badge>POST</Badge>
              <Badge variant="outline">DELETE</Badge>
              <Badge variant="outline">HEAD</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-amber-500" />
            Struttura Prefissi
          </CardTitle>
          <CardDescription>
            Organizzazione dei file nel bucket
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                <span className="font-medium">/tenants/{'{tenant_id}'}/ </span>
              </div>
              <p className="text-sm text-gray-500">
                File specifici per ogni tenant con isolamento RLS
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-purple-500" />
                <span className="font-medium">/brand/shared-assets/</span>
              </div>
              <p className="text-sm text-gray-500">
                Asset condivisi pushati dal Brand a tutti i tenant
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Archive className="w-5 h-5 text-amber-500" />
                <span className="font-medium">/brand/catalog/</span>
              </div>
              <p className="text-sm text-gray-500">
                Master catalog e listini versioned
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TenantAllocationsTab({ 
  allocations, 
  isLoading,
  config 
}: { 
  allocations: TenantAllocation[]; 
  isLoading: boolean;
  config: StorageConfig | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedTenant, setSelectedTenant] = useState<TenantAllocation | null>(null);
  const [newQuotaGb, setNewQuotaGb] = useState('');

  const updateAllocationMutation = useMutation({
    mutationFn: async ({ tenantId, tenantName, quotaBytes }: any) => {
      return apiRequest('/brand-api/storage/allocations', {
        method: 'POST',
        body: JSON.stringify({ tenantId, tenantName, quotaBytes })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/storage/allocations'] });
      setSelectedTenant(null);
      toast({ title: "Quota aggiornata", description: "La quota del tenant è stata modificata" });
    }
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ tenantId, suspended, reason }: any) => {
      return apiRequest(`/brand-api/storage/allocations/${tenantId}/suspend`, {
        method: 'PATCH',
        body: JSON.stringify({ suspended, reason })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/storage/allocations'] });
      toast({ title: "Stato aggiornato" });
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  const totalAllocated = allocations.reduce((sum, a) => sum + a.quotaBytes, 0);
  const totalUsed = allocations.reduce((sum, a) => sum + a.usedBytes, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tenant</p>
                <p className="text-2xl font-bold">{allocations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <HardDrive className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Allocato</p>
                <p className="text-2xl font-bold">{formatBytes(totalAllocated)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Database className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">In Uso</p>
                <p className="text-2xl font-bold">{formatBytes(totalUsed)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Utilizzo %</p>
                <p className="text-2xl font-bold">
                  {totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Quote Tenant</CardTitle>
              <CardDescription>Gestione dello spazio assegnato a ogni tenant (caricamento automatico da W3 Suite)</CardDescription>
            </div>
            <Button 
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/brand-api/storage/allocations'] })}
              data-testid="btn-refresh-allocations"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Aggiorna
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {allocations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <HardDrive className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Nessun tenant configurato</p>
              <p className="text-sm">Aggiungi un tenant per allocare spazio storage</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allocations.map((allocation) => {
                const usagePercent = allocation.quotaBytes > 0 
                  ? Math.round((allocation.usedBytes / allocation.quotaBytes) * 100) 
                  : 0;
                const isWarning = usagePercent >= allocation.alertThresholdPercent;
                
                return (
                  <div 
                    key={allocation.id}
                    className={`p-4 border rounded-lg ${allocation.suspended ? 'bg-red-50 border-red-200' : 'hover:bg-gray-50'}`}
                    data-testid={`tenant-allocation-${allocation.tenantId}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{allocation.tenantName}</p>
                          {allocation.tenantSlug && (
                            <p className="text-sm text-gray-500">{allocation.tenantSlug}</p>
                          )}
                        </div>
                        {allocation.suspended && (
                          <Badge variant="destructive">Sospeso</Badge>
                        )}
                        {isWarning && !allocation.suspended && (
                          <Badge className="bg-amber-100 text-amber-700">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {usagePercent}%
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {formatBytes(allocation.usedBytes)} / {formatBytes(allocation.quotaBytes)}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedTenant(allocation);
                            setNewQuotaGb((allocation.quotaBytes / (1024 * 1024 * 1024)).toString());
                          }}
                          data-testid={`btn-edit-${allocation.tenantId}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => suspendMutation.mutate({
                            tenantId: allocation.tenantId,
                            suspended: !allocation.suspended,
                            reason: allocation.suspended ? null : 'Sospeso manualmente'
                          })}
                          data-testid={`btn-suspend-${allocation.tenantId}`}
                        >
                          {allocation.suspended ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <X className="w-4 h-4 text-red-600" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Progress 
                      value={usagePercent} 
                      className={`h-2 ${isWarning ? '[&>div]:bg-amber-500' : ''}`}
                    />
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>{allocation.objectCount.toLocaleString()} oggetti</span>
                      <span>Alert a {allocation.alertThresholdPercent}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTenant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Modifica Quota - {selectedTenant.tenantName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Quota (GB)</Label>
                <Input
                  type="number"
                  value={newQuotaGb}
                  onChange={(e) => setNewQuotaGb(e.target.value)}
                  data-testid="input-new-quota"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedTenant(null)}>
                  Annulla
                </Button>
                <Button 
                  onClick={() => updateAllocationMutation.mutate({
                    tenantId: selectedTenant.tenantId,
                    tenantName: selectedTenant.tenantName,
                    quotaBytes: parseFloat(newQuotaGb) * 1024 * 1024 * 1024
                  })}
                  disabled={updateAllocationMutation.isPending}
                  data-testid="btn-save-quota"
                >
                  {updateAllocationMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  )}
                  Salva
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function AnalyticsTab({ 
  analytics, 
  allocations,
  isLoading 
}: { 
  analytics: any;
  allocations: TenantAllocation[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  const summary: AnalyticsSummary = analytics?.summary || {
    totalQuotaBytes: 0,
    totalUsedBytes: 0,
    totalObjectCount: 0,
    usagePercent: 0,
    tenantCount: 0
  };

  const tenantsByUsage = [...allocations]
    .sort((a, b) => b.usedBytes - a.usedBytes)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <HardDrive className="w-10 h-10 mx-auto mb-2 text-blue-500" />
              <p className="text-3xl font-bold">{formatBytes(summary.totalUsedBytes)}</p>
              <p className="text-sm text-gray-500">Spazio Utilizzato</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Database className="w-10 h-10 mx-auto mb-2 text-purple-500" />
              <p className="text-3xl font-bold">{summary.totalObjectCount.toLocaleString()}</p>
              <p className="text-sm text-gray-500">File Totali</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Building2 className="w-10 h-10 mx-auto mb-2 text-green-500" />
              <p className="text-3xl font-bold">{summary.tenantCount}</p>
              <p className="text-sm text-gray-500">Tenant Attivi</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <TrendingUp className="w-10 h-10 mx-auto mb-2 text-amber-500" />
              <p className="text-3xl font-bold">{summary.usagePercent}%</p>
              <p className="text-sm text-gray-500">Utilizzo Globale</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Top 5 Tenant per Utilizzo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tenantsByUsage.map((tenant, index) => {
                const usagePercent = tenant.quotaBytes > 0 
                  ? Math.round((tenant.usedBytes / tenant.quotaBytes) * 100)
                  : 0;
                return (
                  <div key={tenant.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full text-sm font-medium">
                          {index + 1}
                        </span>
                        <span className="font-medium">{tenant.tenantName}</span>
                      </div>
                      <span className="text-sm text-gray-500">{formatBytes(tenant.usedBytes)}</span>
                    </div>
                    <Progress value={usagePercent} className="h-2" />
                  </div>
                );
              })}
              {tenantsByUsage.length === 0 && (
                <p className="text-center text-gray-500 py-4">Nessun dato disponibile</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-500" />
              Distribuzione per Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.fileDistribution && Object.keys(analytics.fileDistribution).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(analytics.fileDistribution as Record<string, number>).map(([type, percent]) => (
                  <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {type === 'images' && <Image className="w-5 h-5 text-green-500" />}
                      {type === 'documents' && <FileText className="w-5 h-5 text-blue-500" />}
                      {type === 'videos' && <Video className="w-5 h-5 text-red-500" />}
                      {type === 'audio' && <Music className="w-5 h-5 text-purple-500" />}
                      {!['images', 'documents', 'videos', 'audio'].includes(type) && <Archive className="w-5 h-5 text-amber-500" />}
                      <span className="capitalize">{type === 'images' ? 'Immagini' : type === 'documents' ? 'Documenti' : type === 'videos' ? 'Video' : type === 'audio' ? 'Audio' : 'Altro'}</span>
                    </div>
                    <span className="font-medium">{percent}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Archive className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Nessun file caricato</p>
                <p className="text-xs text-gray-400">La distribuzione sarà calcolata quando verranno caricati file nello storage</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Stima Costi AWS
          </CardTitle>
          <CardDescription>
            Basata su pricing S3 Standard {analytics?.costs?.pricing?.region || 'Frankfurt (eu-central-1)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 border rounded-lg text-center">
              <p className="text-sm text-gray-500 mb-1">Storage</p>
              <p className="text-2xl font-bold text-blue-600">
                ${analytics?.costs?.estimatedMonthly?.storage?.toFixed(2) || '0.00'}
              </p>
              <p className="text-xs text-gray-400">${analytics?.costs?.pricing?.storagePerGbMonth || '0.023'}/GB/mese</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <p className="text-sm text-gray-500 mb-1">PUT/POST/LIST</p>
              <p className="text-2xl font-bold text-purple-600">
                ${analytics?.costs?.estimatedMonthly?.putPostList?.toFixed(2) || '0.00'}
              </p>
              <p className="text-xs text-gray-400">${analytics?.costs?.pricing?.putPostListPer1k || '0.0054'}/1K richieste</p>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <p className="text-sm text-gray-500 mb-1">GET/SELECT</p>
              <p className="text-2xl font-bold text-green-600">
                ${analytics?.costs?.estimatedMonthly?.getSelect?.toFixed(2) || '0.00'}
              </p>
              <p className="text-xs text-gray-400">${analytics?.costs?.pricing?.getSelectPer1k || '0.00043'}/1K richieste</p>
            </div>
            <div className="p-4 border rounded-lg text-center bg-gradient-to-br from-amber-50 to-orange-50">
              <p className="text-sm text-gray-600 mb-1 font-medium">Totale Stimato</p>
              <p className="text-2xl font-bold text-amber-600">
                ${analytics?.costs?.estimatedMonthly?.total?.toFixed(2) || '0.00'}
              </p>
              <p className="text-xs text-gray-500">/mese</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface BrandAsset {
  id: string;
  name: string;
  description: string | null;
  objectKey: string;
  mimeType: string | null;
  sizeBytes: number;
  category: string | null;
  tags: string[] | null;
  isActive: boolean;
  version: number;
  pushedToTenants: string[] | null;
  lastPushedAt: string | null;
  createdBy: string | null;
  createdAt: string;
}

function BrandAssetsTab({ allocations, config }: { allocations: TenantAllocation[]; config: StorageConfig | null }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedAsset, setSelectedAsset] = useState<BrandAsset | null>(null);
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [pushProgress, setPushProgress] = useState<{ current: number; total: number; status: string } | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState('shared-assets');
  const [uploadName, setUploadName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');

  const { data: assetsData, isLoading } = useQuery({
    queryKey: ['/brand-api/storage/assets'],
  });

  const assets: BrandAsset[] = assetsData?.data || [];

  const uploadAssetMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/brand-api/storage/assets/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/storage/assets'] });
      toast({ title: "Asset caricato", description: "L'asset è stato caricato con successo" });
      setUploadFile(null);
      setUploadName('');
      setUploadDescription('');
    },
    onError: (error: any) => {
      toast({ title: "Errore upload", description: error.message, variant: "destructive" });
    }
  });

  const pushAssetMutation = useMutation({
    mutationFn: async ({ assetId, tenantIds }: { assetId: string; tenantIds: string[] }) => {
      setPushProgress({ current: 0, total: tenantIds.length, status: 'Inizializzazione...' });
      
      const response = await apiRequest(`/brand-api/storage/assets/${assetId}/push`, {
        method: 'POST',
        body: JSON.stringify({ tenantIds }),
      });
      
      for (let i = 0; i < tenantIds.length; i++) {
        setPushProgress({ 
          current: i + 1, 
          total: tenantIds.length, 
          status: `Copiando verso tenant ${i + 1}/${tenantIds.length}...` 
        });
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/storage/assets'] });
      toast({ title: "Asset pushato", description: "L'asset è stato copiato ai tenant selezionati" });
      setSelectedAsset(null);
      setSelectedTenants([]);
      setPushProgress(null);
    },
    onError: (error: any) => {
      toast({ title: "Errore push", description: error.message, variant: "destructive" });
      setPushProgress(null);
    }
  });

  const handleUpload = () => {
    if (!uploadFile || !uploadName) {
      toast({ title: "Errore", description: "Nome e file sono obbligatori", variant: "destructive" });
      return;
    }
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('name', uploadName);
    formData.append('description', uploadDescription);
    formData.append('category', uploadCategory);
    uploadAssetMutation.mutate(formData);
  };

  const handlePush = () => {
    if (!selectedAsset || selectedTenants.length === 0) {
      toast({ title: "Errore", description: "Seleziona almeno un tenant", variant: "destructive" });
      return;
    }
    pushAssetMutation.mutate({ assetId: selectedAsset.id, tenantIds: selectedTenants });
  };

  const toggleTenantSelection = (tenantId: string) => {
    setSelectedTenants(prev => 
      prev.includes(tenantId) 
        ? prev.filter(id => id !== tenantId)
        : [...prev, tenantId]
    );
  };

  const selectAllTenants = () => {
    setSelectedTenants(allocations.map(a => a.tenantId));
  };

  const deselectAllTenants = () => {
    setSelectedTenants([]);
  };

  const getCategoryIcon = (category: string | null) => {
    switch (category) {
      case 'logo': return <Image className="w-4 h-4 text-blue-500" />;
      case 'template': return <FileText className="w-4 h-4 text-green-500" />;
      case 'catalog': return <Package className="w-4 h-4 text-purple-500" />;
      case 'media': return <Video className="w-4 h-4 text-red-500" />;
      default: return <FolderOpen className="w-4 h-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-500" />
            Carica Nuovo Asset
          </CardTitle>
          <CardDescription>
            Carica asset del brand che possono essere pushati ai tenant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome Asset *</Label>
              <Input 
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Es. Logo aziendale 2024"
                data-testid="input-asset-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shared-assets">Asset Condivisi</SelectItem>
                  <SelectItem value="logo">Loghi</SelectItem>
                  <SelectItem value="template">Template</SelectItem>
                  <SelectItem value="catalog">Catalogo</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrizione</Label>
            <Input 
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              placeholder="Descrizione opzionale dell'asset"
              data-testid="input-asset-description"
            />
          </div>
          <div className="space-y-2">
            <Label>File *</Label>
            <div className="flex items-center gap-4">
              <Input 
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="flex-1"
                data-testid="input-asset-file"
              />
              {uploadFile && (
                <Badge variant="secondary">
                  {formatBytes(uploadFile.size)}
                </Badge>
              )}
            </div>
          </div>
          <Button 
            onClick={handleUpload}
            disabled={!uploadFile || !uploadName || uploadAssetMutation.isPending}
            className="w-full"
            data-testid="btn-upload-asset"
          >
            {uploadAssetMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Caricamento...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Carica Asset</>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-500" />
              Asset del Brand ({assets.length})
            </CardTitle>
            <CardDescription>
              Seleziona un asset per pusharlo ai tenant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedAsset?.id === asset.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  data-testid={`asset-item-${asset.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getCategoryIcon(asset.category)}
                      <div>
                        <p className="font-medium">{asset.name}</p>
                        <p className="text-xs text-gray-500">{asset.objectKey}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {formatBytes(asset.sizeBytes)}
                      </Badge>
                      {asset.pushedToTenants && asset.pushedToTenants.length > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          Pushato a {asset.pushedToTenants.length} tenant
                        </p>
                      )}
                    </div>
                  </div>
                  {asset.description && (
                    <p className="text-sm text-gray-500 mt-2">{asset.description}</p>
                  )}
                </div>
              ))}
              {assets.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nessun asset caricato</p>
                  <p className="text-sm">Carica il primo asset del brand</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              Push a Tenant
            </CardTitle>
            <CardDescription>
              {selectedAsset 
                ? `Seleziona i tenant per: ${selectedAsset.name}`
                : 'Seleziona prima un asset dalla lista'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedAsset ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={selectAllTenants}
                    data-testid="btn-select-all"
                  >
                    Seleziona Tutti
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={deselectAllTenants}
                    data-testid="btn-deselect-all"
                  >
                    Deseleziona Tutti
                  </Button>
                  <Badge variant="secondary">
                    {selectedTenants.length} selezionati
                  </Badge>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allocations.map((tenant) => {
                    const isSelected = selectedTenants.includes(tenant.tenantId);
                    const alreadyPushed = selectedAsset.pushedToTenants?.includes(tenant.tenantId);
                    
                    return (
                      <div
                        key={tenant.tenantId}
                        onClick={() => toggleTenantSelection(tenant.tenantId)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        data-testid={`tenant-select-${tenant.tenantId}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                            isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div>
                            <p className="font-medium">{tenant.tenantName}</p>
                            <p className="text-xs text-gray-500">{tenant.tenantSlug}</p>
                          </div>
                        </div>
                        {alreadyPushed && (
                          <Badge className="bg-green-100 text-green-700">
                            <Check className="w-3 h-3 mr-1" />
                            Già pushato
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>

                {pushProgress && (
                  <div className="space-y-2 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span>{pushProgress.status}</span>
                      <span>{pushProgress.current}/{pushProgress.total}</span>
                    </div>
                    <Progress 
                      value={(pushProgress.current / pushProgress.total) * 100} 
                      className="h-2"
                    />
                  </div>
                )}

                <Button 
                  onClick={handlePush}
                  disabled={selectedTenants.length === 0 || pushAssetMutation.isPending}
                  className="w-full"
                  data-testid="btn-push-asset"
                >
                  {pushAssetMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Pushing...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" /> Push a {selectedTenants.length} Tenant</>
                  )}
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Seleziona un asset</p>
                <p className="text-sm">dalla lista a sinistra</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5 text-gray-500" />
            Prefissi Storage Brand
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Asset Condivisi</p>
              <p className="font-mono text-sm">/brand/shared-assets/</p>
              <p className="text-xs text-gray-400 mt-1">Read-only per tutti i tenant</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Catalogo Prodotti</p>
              <p className="font-mono text-sm">/brand/catalog/</p>
              <p className="text-xs text-gray-400 mt-1">Master catalog condiviso</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
