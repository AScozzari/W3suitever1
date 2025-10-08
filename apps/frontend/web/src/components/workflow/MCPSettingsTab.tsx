/**
 * 🔧 MCP SETTINGS TAB - Model Context Protocol Integration
 * 
 * Gestisce configurazione credentials per 6 ecosistemi:
 * - Google Workspace (OAuth2)
 * - AWS (IAM Credentials)
 * - Meta/Instagram (OAuth2)
 * - Microsoft 365 (OAuth2)
 * - Stripe (API Key)
 * - GTM/Analytics (Service Account)
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Key, 
  Shield,
  AlertCircle,
  ExternalLink,
  Trash2
} from 'lucide-react';

// 🎯 Ecosystem Configurations
const MCP_ECOSYSTEMS = {
  google: {
    id: 'google',
    name: 'Google Workspace',
    badge: '[G]',
    badgeColor: 'bg-blue-100 text-blue-800',
    authType: 'OAuth2',
    description: 'Gmail, Drive, Calendar, Sheets, Docs',
    requiredFields: ['client_id', 'client_secret'],
    icon: '🔵'
  },
  aws: {
    id: 'aws',
    name: 'AWS Services',
    badge: '[AWS]',
    badgeColor: 'bg-orange-100 text-orange-800',
    authType: 'IAM Credentials',
    description: 'S3, Lambda, SQS, SNS, DynamoDB',
    requiredFields: ['access_key_id', 'secret_access_key', 'region'],
    icon: '🟠'
  },
  meta: {
    id: 'meta',
    name: 'Meta/Instagram',
    badge: '[META]',
    badgeColor: 'bg-pink-100 text-pink-800',
    authType: 'OAuth2',
    description: 'Instagram Posts, Stories, Comments, Messages',
    requiredFields: ['app_id', 'app_secret'],
    icon: '🔴'
  },
  microsoft: {
    id: 'microsoft',
    name: 'Microsoft 365',
    badge: '[MS]',
    badgeColor: 'bg-purple-100 text-purple-800',
    authType: 'OAuth2',
    description: 'Outlook, OneDrive, Teams, SharePoint',
    requiredFields: ['client_id', 'client_secret', 'tenant_id'],
    icon: '🟣'
  },
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    badge: '[STRIPE]',
    badgeColor: 'bg-violet-100 text-violet-800',
    authType: 'API Key',
    description: 'Payments, Subscriptions, Invoices',
    requiredFields: ['api_key'],
    icon: '🟪'
  },
  gtm: {
    id: 'gtm',
    name: 'GTM/Analytics',
    badge: '[GTM]',
    badgeColor: 'bg-green-100 text-green-800',
    authType: 'Service Account',
    description: 'Google Tag Manager, Analytics Events',
    requiredFields: ['service_account_json'],
    icon: '🟢'
  }
};

interface MCPCredential {
  id: string;
  provider: string;
  status: 'active' | 'expired' | 'pending';
  createdAt: string;
  expiresAt?: string;
}

export default function MCPSettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeEcosystem, setActiveEcosystem] = useState('google');
  
  // 🔧 Form state
  const [awsForm, setAwsForm] = useState({ accessKeyId: '', secretAccessKey: '', region: 'eu-west-1' });
  const [stripeForm, setStripeForm] = useState({ apiKey: '' });
  const [gtmForm, setGtmForm] = useState({ serviceAccountJson: '' });

  // 🔄 Fetch MCP Credentials
  const { data: credentials, isLoading } = useQuery<MCPCredential[]>({
    queryKey: ['/api/mcp/credentials'],
  });

  // 🔄 Delete Credential Mutation
  const deleteCredentialMutation = useMutation({
    mutationFn: async (params: { provider: string; credentialId: string }) => {
      return apiRequest(`/api/mcp/credentials/${params.provider}/${params.credentialId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp/credentials'] });
      toast({
        title: 'Credential Rimossa',
        description: 'Credenziale eliminata con successo',
      });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare la credenziale',
        variant: 'destructive'
      });
    }
  });

  // 🔄 Save AWS Credentials Mutation
  const saveAWSMutation = useMutation({
    mutationFn: async (data: { accessKeyId: string; secretAccessKey: string; region: string }) => {
      return apiRequest('/api/mcp/credentials/aws', {
        method: 'POST',
        body: JSON.stringify({
          accessKeyId: data.accessKeyId,
          secretAccessKey: data.secretAccessKey,
          region: data.region,
          metadata: { provider: 'aws' }
        }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp/credentials'] });
      setAwsForm({ accessKeyId: '', secretAccessKey: '', region: 'eu-west-1' }); // Clear form
      toast({
        title: 'AWS Credential Salvata',
        description: 'Credenziali AWS salvate con successo',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore AWS',
        description: error instanceof Error ? error.message : 'Impossibile salvare credenziali AWS',
        variant: 'destructive'
      });
    }
  });

  // 🔄 Save Stripe API Key Mutation
  const saveStripeMutation = useMutation({
    mutationFn: async (data: { apiKey: string }) => {
      return apiRequest('/api/mcp/credentials/stripe', {
        method: 'POST',
        body: JSON.stringify({
          apiKey: data.apiKey,
          metadata: { provider: 'stripe' }
        }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp/credentials'] });
      setStripeForm({ apiKey: '' }); // Clear form
      toast({
        title: 'Stripe API Key Salvata',
        description: 'API Key Stripe salvata con successo',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore Stripe',
        description: error instanceof Error ? error.message : 'Impossibile salvare API Key Stripe',
        variant: 'destructive'
      });
    }
  });

  // 🔄 Save GTM Service Account Mutation
  const saveGTMMutation = useMutation({
    mutationFn: async (data: { serviceAccountJson: string }) => {
      // Validate JSON before sending
      try {
        JSON.parse(data.serviceAccountJson);
      } catch {
        throw new Error('JSON Service Account non valido');
      }
      
      return apiRequest('/api/mcp/credentials/gtm', {
        method: 'POST',
        body: JSON.stringify({
          serviceAccountJson: data.serviceAccountJson,
          metadata: { provider: 'gtm' }
        }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp/credentials'] });
      setGtmForm({ serviceAccountJson: '' }); // Clear form
      toast({
        title: 'GTM Service Account Salvato',
        description: 'Service Account GTM salvato con successo',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore GTM',
        description: error instanceof Error ? error.message : 'Impossibile salvare Service Account GTM',
        variant: 'destructive'
      });
    }
  });

  // 🎯 OAuth2 Initiation
  const handleOAuthInitiate = (provider: string) => {
    // Redirect to OAuth2 flow
    window.location.href = `/api/mcp/oauth/${provider}/authorize`;
  };

  // 🎯 Render Credential Status
  const renderCredentialStatus = (provider: string) => {
    const credential = credentials?.find(c => c.provider === provider);
    
    if (!credential) {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <XCircle className="h-4 w-4 text-gray-400" />
          <span>Non configurato</span>
        </div>
      );
    }

    const isExpired = credential.expiresAt && new Date(credential.expiresAt) < new Date();
    const statusColor = credential.status === 'active' 
      ? 'text-green-600' 
      : isExpired 
      ? 'text-red-600' 
      : 'text-yellow-600';
    const statusIcon = credential.status === 'active' 
      ? CheckCircle 
      : isExpired 
      ? XCircle 
      : AlertCircle;
    const StatusIcon = statusIcon;

    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <StatusIcon className={`h-4 w-4 ${statusColor}`} />
          <span className={statusColor}>
            {credential.status === 'active' ? 'Attiva' : isExpired ? 'Scaduta' : 'In attesa'}
          </span>
          {credential.expiresAt && (
            <span className="text-xs text-gray-500">
              (Scade: {new Date(credential.expiresAt).toLocaleDateString()})
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => deleteCredentialMutation.mutate({ 
            provider, 
            credentialId: credential.id 
          })}
          data-testid={`button-delete-${provider}`}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 🎯 Header */}
      <Card className="windtre-glass-panel border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-windtre-purple">
            <Shield className="h-5 w-5" />
            MCP Integration Settings
          </CardTitle>
          <CardDescription>
            Configura le credenziali per integrazioni esterne nei workflow
          </CardDescription>
        </CardHeader>
      </Card>

      {/* 🎯 Ecosystems Tabs */}
      <Tabs value={activeEcosystem} onValueChange={setActiveEcosystem}>
        <TabsList className="grid grid-cols-6 gap-2 bg-white/50 p-2">
          {Object.values(MCP_ECOSYSTEMS).map((eco) => (
            <TabsTrigger 
              key={eco.id} 
              value={eco.id}
              className="flex items-center gap-1"
              data-testid={`tab-${eco.id}`}
            >
              <span>{eco.icon}</span>
              <Badge variant="outline" className={`text-xs ${eco.badgeColor}`}>
                {eco.badge}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* 🔵 GOOGLE WORKSPACE */}
        <TabsContent value="google">
          <Card className="windtre-glass-panel border-white/20">
            <CardHeader>
              <CardTitle>Google Workspace OAuth2</CardTitle>
              <CardDescription>
                Connetti Gmail, Drive, Calendar, Sheets per automazioni workflow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderCredentialStatus('google')}
              
              <div className="pt-4 border-t">
                <Button 
                  onClick={() => handleOAuthInitiate('google')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="button-oauth-google"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connetti Google Workspace
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Sarai reindirizzato alla pagina di autorizzazione Google
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 🟠 AWS SERVICES */}
        <TabsContent value="aws">
          <Card className="windtre-glass-panel border-white/20">
            <CardHeader>
              <CardTitle>AWS IAM Credentials</CardTitle>
              <CardDescription>
                Configura accesso a S3, Lambda, SQS, SNS, DynamoDB
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderCredentialStatus('aws')}
              
              <form className="space-y-3" onSubmit={(e) => {
                e.preventDefault();
                if (!awsForm.accessKeyId || !awsForm.secretAccessKey || !awsForm.region) {
                  toast({
                    title: 'Campi Obbligatori',
                    description: 'Compila tutti i campi AWS',
                    variant: 'destructive'
                  });
                  return;
                }
                saveAWSMutation.mutate(awsForm);
              }}>
                <div>
                  <Label htmlFor="aws-access-key">Access Key ID *</Label>
                  <Input 
                    id="aws-access-key" 
                    type="text" 
                    placeholder="AKIA..."
                    value={awsForm.accessKeyId}
                    onChange={(e) => setAwsForm({ ...awsForm, accessKeyId: e.target.value })}
                    data-testid="input-aws-access-key"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="aws-secret-key">Secret Access Key *</Label>
                  <Input 
                    id="aws-secret-key" 
                    type="password" 
                    placeholder="••••••••"
                    value={awsForm.secretAccessKey}
                    onChange={(e) => setAwsForm({ ...awsForm, secretAccessKey: e.target.value })}
                    data-testid="input-aws-secret-key"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="aws-region">Region *</Label>
                  <Input 
                    id="aws-region" 
                    type="text" 
                    placeholder="eu-west-1"
                    value={awsForm.region}
                    onChange={(e) => setAwsForm({ ...awsForm, region: e.target.value })}
                    data-testid="input-aws-region"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  disabled={saveAWSMutation.isPending}
                  data-testid="button-save-aws"
                >
                  <Key className="h-4 w-4 mr-2" />
                  {saveAWSMutation.isPending ? 'Salvando...' : 'Salva Credenziali AWS'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 🔴 META/INSTAGRAM */}
        <TabsContent value="meta">
          <Card className="windtre-glass-panel border-white/20">
            <CardHeader>
              <CardTitle>Meta/Instagram OAuth2</CardTitle>
              <CardDescription>
                Gestisci Instagram Posts, Stories, Comments, Direct Messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderCredentialStatus('meta')}
              
              <div className="pt-4 border-t">
                <Button 
                  onClick={() => handleOAuthInitiate('meta')}
                  className="bg-pink-600 hover:bg-pink-700 text-white"
                  data-testid="button-oauth-meta"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connetti Instagram
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Richiede Meta App configurata con Instagram Graph API
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 🟣 MICROSOFT 365 */}
        <TabsContent value="microsoft">
          <Card className="windtre-glass-panel border-white/20">
            <CardHeader>
              <CardTitle>Microsoft 365 OAuth2</CardTitle>
              <CardDescription>
                Integra Outlook, OneDrive, Teams, SharePoint
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderCredentialStatus('microsoft')}
              
              <div className="pt-4 border-t">
                <Button 
                  onClick={() => handleOAuthInitiate('microsoft')}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  data-testid="button-oauth-microsoft"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connetti Microsoft 365
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Azure AD App Registration richiesta
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 🟪 STRIPE */}
        <TabsContent value="stripe">
          <Card className="windtre-glass-panel border-white/20">
            <CardHeader>
              <CardTitle>Stripe API Key</CardTitle>
              <CardDescription>
                Gestisci Payments, Subscriptions, Invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderCredentialStatus('stripe')}
              
              <form className="space-y-3" onSubmit={(e) => {
                e.preventDefault();
                if (!stripeForm.apiKey) {
                  toast({
                    title: 'Campo Obbligatorio',
                    description: 'Inserisci la Stripe Secret Key',
                    variant: 'destructive'
                  });
                  return;
                }
                saveStripeMutation.mutate(stripeForm);
              }}>
                <div>
                  <Label htmlFor="stripe-api-key">Secret Key *</Label>
                  <Input 
                    id="stripe-api-key" 
                    type="password" 
                    placeholder="sk_live_... o sk_test_..."
                    value={stripeForm.apiKey}
                    onChange={(e) => setStripeForm({ apiKey: e.target.value })}
                    data-testid="input-stripe-api-key"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                  disabled={saveStripeMutation.isPending}
                  data-testid="button-save-stripe"
                >
                  <Key className="h-4 w-4 mr-2" />
                  {saveStripeMutation.isPending ? 'Salvando...' : 'Salva API Key Stripe'}
                </Button>
                <p className="text-xs text-gray-500">
                  💡 Usa la Secret Key (sk_live_ o sk_test_)
                </p>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 🟢 GTM/ANALYTICS */}
        <TabsContent value="gtm">
          <Card className="windtre-glass-panel border-white/20">
            <CardHeader>
              <CardTitle>GTM/Analytics Service Account</CardTitle>
              <CardDescription>
                Invia eventi a Google Tag Manager e Google Analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderCredentialStatus('gtm')}
              
              <form className="space-y-3" onSubmit={(e) => {
                e.preventDefault();
                if (!gtmForm.serviceAccountJson) {
                  toast({
                    title: 'Campo Obbligatorio',
                    description: 'Inserisci il Service Account JSON',
                    variant: 'destructive'
                  });
                  return;
                }
                saveGTMMutation.mutate(gtmForm);
              }}>
                <div>
                  <Label htmlFor="gtm-service-account">Service Account JSON *</Label>
                  <textarea
                    id="gtm-service-account"
                    className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder='{"type":"service_account","project_id":"...","private_key":"..."}'
                    value={gtmForm.serviceAccountJson}
                    onChange={(e) => setGtmForm({ serviceAccountJson: e.target.value })}
                    data-testid="input-gtm-service-account"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={saveGTMMutation.isPending}
                  data-testid="button-save-gtm"
                >
                  <Key className="h-4 w-4 mr-2" />
                  {saveGTMMutation.isPending ? 'Salvando...' : 'Salva Service Account'}
                </Button>
                <p className="text-xs text-gray-500">
                  💡 Scarica il JSON dalla Console Google Cloud
                </p>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 🔧 Debug Info (Development Only) */}
      {import.meta.env.DEV && (
        <Card className="border-dashed border-gray-300">
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">Debug: Credentials Status</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">
              {JSON.stringify(credentials || [], null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
