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
import { useTenant } from '@/contexts/TenantContext';
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Key, 
  Shield,
  AlertCircle,
  ExternalLink,
  Trash2,
  Info
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  serverId: string;
  serverName: string;
  provider: 'google' | 'microsoft' | 'meta' | null;
  status: 'active' | 'expired' | 'revoked';
  scope?: string;
  expiresAt?: string;
  connectedAt: string;
  lastUpdated: string;
}

interface ConnectedAccount {
  id: string;
  accountType: 'facebook_page' | 'instagram_business';
  accountId: string;
  accountName: string;
  instagramAccountId?: string;
  instagramAccountName?: string;
  isActive: boolean;
  lastSyncedAt?: string;
  createdAt: string;
}

interface MCPServer {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'disabled';
  transport: string;
  transportConfig: any;
}

export default function MCPSettingsTab() {
  const { toast } = useToast();
  const { currentUser, currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const [activeEcosystem, setActiveEcosystem] = useState('google');
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  
  // 🔧 Form state
  const [googleForm, setGoogleForm] = useState({ clientId: '', clientSecret: '' });
  const [metaForm, setMetaForm] = useState({ appId: '', appSecret: '' });
  const [awsForm, setAwsForm] = useState({ accessKeyId: '', secretAccessKey: '', region: 'eu-west-1' });
  const [stripeForm, setStripeForm] = useState({ apiKey: '' });
  const [gtmForm, setGtmForm] = useState({ serviceAccountJson: '' });

  // 🔄 Fetch MCP Servers
  const { data: servers, isLoading: serversLoading } = useQuery<MCPServer[]>({
    queryKey: ['/api/mcp/servers'],
  });

  // 🔄 Fetch User's OAuth Credentials
  const { data: credentials, isLoading: credentialsLoading } = useQuery<MCPCredential[]>({
    queryKey: ['/api/mcp/my-credentials'],
  });

  // 🔄 Fetch Connected Accounts for Meta/Instagram
  const metaServer = servers?.find(s => s.name === 'meta-instagram');
  const { data: connectedAccounts, isLoading: accountsLoading } = useQuery<{ success: boolean; accounts: ConnectedAccount[] }>({
    queryKey: ['/api/mcp/credentials/connected-accounts', metaServer?.id],
    enabled: !!metaServer,
  });

  const isLoading = serversLoading || credentialsLoading;

  // 🔄 Delete Credential Mutation (FIXED: Correct query key invalidation)
  const deleteCredentialMutation = useMutation({
    mutationFn: async (params: { provider: string; credentialId: string }) => {
      return apiRequest(`/api/mcp/credentials/${params.provider}/${params.credentialId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      // FIXED: Invalidate correct query keys for multi-user OAuth
      queryClient.invalidateQueries({ queryKey: ['/api/mcp/my-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mcp/servers'] }); // Server status may change
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

  // 🔄 Save Google OAuth Credentials Mutation
  const saveGoogleCredentialsMutation = useMutation({
    mutationFn: async (data: { clientId: string; clientSecret: string }) => {
      return apiRequest('/api/mcp/credentials/google/oauth-config', {
        method: 'POST',
        body: JSON.stringify({
          clientId: data.clientId,
          clientSecret: data.clientSecret,
          metadata: { provider: 'google' }
        }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp/my-credentials'] });
      setGoogleForm({ clientId: '', clientSecret: '' }); // Clear form
      toast({
        title: 'Google OAuth Configurato',
        description: 'Credenziali Google OAuth salvate con successo',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore Google OAuth',
        description: error instanceof Error ? error.message : 'Impossibile salvare credenziali Google',
        variant: 'destructive'
      });
    }
  });

  // 🔄 Save Meta OAuth Credentials Mutation
  const saveMetaCredentialsMutation = useMutation({
    mutationFn: async (data: { appId: string; appSecret: string }) => {
      return apiRequest('/api/mcp/credentials/meta/oauth-config', {
        method: 'POST',
        body: JSON.stringify({
          appId: data.appId,
          appSecret: data.appSecret,
          metadata: { provider: 'meta' }
        }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp/my-credentials'] });
      setMetaForm({ appId: '', appSecret: '' }); // Clear form
      toast({
        title: 'Meta OAuth Configurato',
        description: 'Credenziali Meta OAuth salvate con successo',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore Meta OAuth',
        description: error instanceof Error ? error.message : 'Impossibile salvare credenziali Meta',
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

  // 🔄 Create or Get MCP Server Mutation
  const createServerMutation = useMutation({
    mutationFn: async (params: { name: string; description: string }) => {
      return apiRequest('/api/mcp/servers', {
        method: 'POST',
        body: {
          name: params.name,
          description: params.description,
          transport: 'stdio', // Default transport
          transportConfig: {},
          status: 'inactive' // Will be activated after OAuth
        }
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp/servers'] });
      return data;
    }
  });

  // 🔄 Remove Connected Account Mutation
  const removeAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      return apiRequest(`/api/mcp/credentials/connected-accounts/${accountId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp/credentials/connected-accounts', metaServer?.id] });
      toast({
        title: 'Account Rimosso',
        description: 'Pagina Facebook disconnessa con successo',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Impossibile rimuovere account',
        variant: 'destructive'
      });
    }
  });

  // 🔄 Sync Connected Account Mutation
  const syncAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      return apiRequest(`/api/mcp/credentials/connected-accounts/${accountId}/sync`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp/credentials/connected-accounts', metaServer?.id] });
      toast({
        title: 'Sincronizzazione Completata',
        description: 'Dati account aggiornati con successo',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore Sincronizzazione',
        description: error instanceof Error ? error.message : 'Impossibile sincronizzare account',
        variant: 'destructive'
      });
    }
  });

  // 🎯 OAuth2 Initiation with Server Creation
  const handleOAuthInitiate = async (provider: 'google' | 'microsoft' | 'meta') => {
    try {
      setConnectingProvider(provider);
      
      // Map provider to server name
      const serverNameMap = {
        google: 'google-workspace',
        microsoft: 'microsoft-365',
        meta: 'meta-instagram'
      };
      
      const serverName = serverNameMap[provider];
      
      // Find existing server or create new one
      let server = servers?.find(s => s.name === serverName);
      
      if (!server) {
        // Create MCP server for this provider
        const descriptionMap = {
          google: 'Google Workspace OAuth Integration (Gmail, Drive, Calendar, Sheets)',
          microsoft: 'Microsoft 365 OAuth Integration (Outlook, OneDrive, Teams)',
          meta: 'Meta/Instagram OAuth Integration (Posts, Stories, Messages)'
        };
        
        server = await createServerMutation.mutateAsync({
          name: serverName,
          description: descriptionMap[provider]
        });
      }
      
      // 🔧 Redirect to OAuth start flow with tenant/user context in query params
      // Note: Browser redirects can't send custom headers, so we use query parameters
      const tenantId = currentTenant?.id || localStorage.getItem('currentTenantId');
      const userId = currentUser?.id;

      // 🔒 SECURITY: Block OAuth if tenant/user context is missing
      if (!tenantId || !userId) {
        throw new Error('Tenant or user context missing. Please refresh the page and try again.');
      }
      
      window.location.href = `/api/mcp/oauth/${provider}/start/${server.id}?tenantId=${tenantId}&userId=${userId}`;
      
    } catch (error) {
      setConnectingProvider(null);
      toast({
        title: 'Errore Connessione',
        description: error instanceof Error ? error.message : 'Impossibile avviare OAuth flow',
        variant: 'destructive'
      });
    }
  };

  // 🎯 Render Credential Status (Updated for multi-user OAuth with visual indicators)
  const renderCredentialStatus = (provider: 'google' | 'microsoft' | 'meta' | 'aws' | 'stripe' | 'gtm') => {
    // Find credential by provider name or by serverName/credentialType containing the provider
    const credential = credentials?.find(c => 
      c.provider === provider || 
      c.serverName?.includes(provider) || 
      c.credentialType?.includes(provider)
    );
    
    if (!credential) {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-500 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <XCircle className="h-4 w-4 text-gray-400" />
          <span>Non configurato</span>
        </div>
      );
    }

    const statusConfig = {
      active: {
        color: 'text-green-600 bg-green-50 border-green-200',
        badgeColor: 'bg-green-500',
        icon: CheckCircle,
        label: 'Attiva'
      },
      expired: {
        color: 'text-red-600 bg-red-50 border-red-200',
        badgeColor: 'bg-red-500',
        icon: XCircle,
        label: 'Scaduta'
      },
      revoked: {
        color: 'text-gray-600 bg-gray-50 border-gray-300',
        badgeColor: 'bg-gray-500',
        icon: AlertCircle,
        label: 'Revocata'
      }
    };

    const status = statusConfig[credential.status] || statusConfig.active;
    const StatusIcon = status.icon;

    return (
      <div className={`p-3 rounded-lg border ${status.color} space-y-2`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status.badgeColor} animate-pulse`} />
            <StatusIcon className="h-4 w-4" />
            <span className="font-medium text-sm">{status.label}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteCredentialMutation.mutate({ 
              provider, 
              credentialId: credential.id 
            })}
            data-testid={`button-delete-${provider}`}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
        
        <div className="text-xs space-y-1 pl-6">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Connesso:</span>
            <span className="font-mono text-gray-800">
              {new Date(credential.connectedAt).toLocaleString('it-IT')}
            </span>
          </div>
          
          {credential.expiresAt && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Scadenza:</span>
              <span className="font-mono text-gray-800">
                {new Date(credential.expiresAt).toLocaleString('it-IT')}
              </span>
            </div>
          )}
          
          {credential.scope && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Permessi:</span>
              <Badge variant="outline" className="text-xs">
                {credential.scope.split(' ').length} scope(s)
              </Badge>
            </div>
          )}
        </div>
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
              
              <div className="pt-4 border-t space-y-4">
                {/* OAuth Configuration Form */}
                <div className="space-y-3">
                  {/* Info Tooltip */}
                  <TooltipProvider>
                    <div className="flex items-start gap-2 bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-blue-900 mb-1">🔵 In Google Cloud Console:</p>
                          <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                            <li>Vai su <strong>APIs & Services → Credentials</strong></li>
                            <li>Clicca <strong>Create Credentials → OAuth 2.0 Client ID</strong></li>
                            <li>Seleziona <strong>Web application</strong></li>
                            <li>Aggiungi questo URL nelle <strong>Authorized redirect URIs</strong>:</li>
                          </ol>
                          <code className="text-xs bg-white px-2 py-1 rounded border border-blue-300 block break-all mt-2">
                            {window.location.origin}/api/mcp/oauth/google/callback
                          </code>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-blue-900 mb-1">⚙️ In W3 Suite (qui sotto):</p>
                          <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                            <li>Copia il <strong>Client ID</strong> e <strong>Client Secret</strong> da Google Console</li>
                            <li>Incollali nei campi qui sotto e clicca <strong>Salva Configurazione OAuth</strong></li>
                            <li>Dopo il salvataggio, clicca <strong>Autorizza Accesso Google</strong></li>
                            <li>Acconsenti alle autorizzazioni richieste da Google</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </TooltipProvider>
                  
                  <form className="space-y-3" onSubmit={(e) => {
                    e.preventDefault();
                    if (!googleForm.clientId || !googleForm.clientSecret) {
                      toast({
                        title: 'Campi Obbligatori',
                        description: 'Inserisci Client ID e Client Secret',
                        variant: 'destructive'
                      });
                      return;
                    }
                    saveGoogleCredentialsMutation.mutate(googleForm);
                  }}>
                    <div>
                      <Label htmlFor="google-client-id">Client ID *</Label>
                      <Input 
                        id="google-client-id" 
                        type="text" 
                        placeholder="xxxxx.apps.googleusercontent.com"
                        value={googleForm.clientId}
                        onChange={(e) => setGoogleForm({ ...googleForm, clientId: e.target.value })}
                        data-testid="input-google-client-id"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="google-client-secret">Client Secret *</Label>
                      <Input 
                        id="google-client-secret" 
                        type="password" 
                        placeholder="••••••••"
                        value={googleForm.clientSecret}
                        onChange={(e) => setGoogleForm({ ...googleForm, clientSecret: e.target.value })}
                        data-testid="input-google-client-secret"
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={saveGoogleCredentialsMutation.isPending}
                      data-testid="button-save-google-oauth"
                    >
                      <Key className="h-4 w-4 mr-2" />
                      {saveGoogleCredentialsMutation.isPending ? 'Salvando...' : 'Salva Configurazione OAuth'}
                    </Button>
                  </form>
                </div>

                {/* OAuth Connect Button - Shows only after credentials are saved */}
                {credentials?.some(c => c.provider === 'google' && c.serverName === 'google-workspace-oauth-config') && (
                  <div className="pt-4 border-t">
                    <Button 
                      onClick={() => handleOAuthInitiate('google')}
                      className="bg-green-600 hover:bg-green-700 text-white w-full"
                      disabled={connectingProvider === 'google' || isLoading}
                      data-testid="button-oauth-google"
                    >
                      {connectingProvider === 'google' ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Connessione in corso...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Autorizza Accesso Google
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      💡 Sarai reindirizzato alla pagina di autorizzazione Google
                    </p>
                  </div>
                )}
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
              
              <div className="pt-4 border-t space-y-4">
                {/* OAuth Configuration Form */}
                <div className="space-y-3">
                  {/* Info Tooltip */}
                  <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-pink-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-pink-900 mb-1">🔴 In Meta for Developers:</p>
                          <ol className="text-xs text-pink-800 space-y-1 list-decimal list-inside">
                            <li>Vai su <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="underline font-semibold">developers.facebook.com/apps</a></li>
                            <li>Clicca <strong>Create App → Business</strong></li>
                            <li>Abilita <strong>Instagram Graph API</strong> nel Dashboard</li>
                            <li>In <strong>Settings → Basic</strong>, copia <strong>App ID</strong> e <strong>App Secret</strong></li>
                            <li>In <strong>Use Cases → Customize → Add products</strong>, aggiungi Instagram</li>
                            <li>Aggiungi questo URL nelle <strong>Valid OAuth Redirect URIs</strong>:</li>
                          </ol>
                          <code className="text-xs bg-white px-2 py-1 rounded border border-pink-300 block break-all mt-2">
                            {window.location.origin}/api/mcp/oauth/meta/callback
                          </code>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-pink-900 mb-1">⚙️ In W3 Suite (qui sotto):</p>
                          <ol className="text-xs text-pink-800 space-y-1 list-decimal list-inside">
                            <li>Copia <strong>App ID</strong> e <strong>App Secret</strong> da Meta Console</li>
                            <li>Incollali nei campi qui sotto e clicca <strong>Salva Configurazione OAuth</strong></li>
                            <li>Dopo il salvataggio, clicca <strong>Connetti Pagine Facebook</strong></li>
                            <li>Seleziona le pagine Facebook da autorizzare</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <form className="space-y-3" onSubmit={(e) => {
                    e.preventDefault();
                    if (!metaForm.appId || !metaForm.appSecret) {
                      toast({
                        title: 'Campi Obbligatori',
                        description: 'Inserisci App ID e App Secret',
                        variant: 'destructive'
                      });
                      return;
                    }
                    saveMetaCredentialsMutation.mutate(metaForm);
                  }}>
                    <div>
                      <Label htmlFor="meta-app-id">App ID *</Label>
                      <Input 
                        id="meta-app-id" 
                        type="text" 
                        placeholder="1234567890123456"
                        value={metaForm.appId}
                        onChange={(e) => setMetaForm({ ...metaForm, appId: e.target.value })}
                        data-testid="input-meta-app-id"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="meta-app-secret">App Secret *</Label>
                      <Input 
                        id="meta-app-secret" 
                        type="password" 
                        placeholder="••••••••"
                        value={metaForm.appSecret}
                        onChange={(e) => setMetaForm({ ...metaForm, appSecret: e.target.value })}
                        data-testid="input-meta-app-secret"
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="bg-pink-600 hover:bg-pink-700 text-white"
                      disabled={saveMetaCredentialsMutation.isPending}
                      data-testid="button-save-meta-oauth"
                    >
                      <Key className="h-4 w-4 mr-2" />
                      {saveMetaCredentialsMutation.isPending ? 'Salvando...' : 'Salva Configurazione OAuth'}
                    </Button>
                  </form>
                </div>

              {/* Connected Pages List */}
              {accountsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-500">Caricamento pagine...</span>
                </div>
              ) : connectedAccounts?.accounts && connectedAccounts.accounts.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-700">Pagine Connesse ({connectedAccounts.accounts.length})</h4>
                  </div>
                  
                  <div className="space-y-2">
                    {connectedAccounts.accounts.map((account) => (
                      <div 
                        key={account.id} 
                        className="flex items-start justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-pink-300 transition-colors"
                        data-testid={`connected-account-${account.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-blue-100 text-blue-800 text-xs">
                              Facebook Page
                            </Badge>
                            {account.instagramAccountId && (
                              <Badge className="bg-pink-100 text-pink-800 text-xs">
                                + Instagram
                              </Badge>
                            )}
                          </div>
                          
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {account.accountName}
                          </p>
                          
                          {account.instagramAccountName && (
                            <p className="text-xs text-gray-600 mt-1">
                              📷 Instagram: <span className="font-medium">{account.instagramAccountName}</span>
                            </p>
                          )}
                          
                          {account.lastSyncedAt && (
                            <p className="text-xs text-gray-500 mt-1">
                              🔄 Ultima sincronizzazione: {new Date(account.lastSyncedAt).toLocaleDateString('it-IT', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 ml-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => syncAccountMutation.mutate(account.id)}
                            disabled={syncAccountMutation.isPending}
                            className="text-gray-600 hover:text-pink-600"
                            data-testid={`button-sync-${account.id}`}
                          >
                            <RefreshCw className={`h-4 w-4 ${syncAccountMutation.isPending ? 'animate-spin' : ''}`} />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Rimuovere la pagina "${account.accountName}"?`)) {
                                removeAccountMutation.mutate(account.id);
                              }
                            }}
                            disabled={removeAccountMutation.isPending}
                            className="text-gray-600 hover:text-red-600"
                            data-testid={`button-remove-${account.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-gray-500">
                  Nessuna pagina Facebook connessa
                </div>
              )}

              {/* OAuth Connect Button - Shows only after credentials are saved */}
              {credentials?.some(c => c.provider === 'meta' && c.serverName === 'meta-instagram-oauth-config') && (
                <div className="pt-4 border-t">
                  <Button 
                    onClick={() => handleOAuthInitiate('meta')}
                    className="bg-green-600 hover:bg-green-700 text-white w-full"
                    disabled={connectingProvider === 'meta' || isLoading}
                    data-testid="button-oauth-meta"
                  >
                    {connectingProvider === 'meta' ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Connessione in corso...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Connetti Pagine Facebook
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    💡 Puoi connettere più pagine Facebook con Instagram Business
                  </p>
                </div>
              )}
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
                  disabled={connectingProvider === 'microsoft' || isLoading}
                  data-testid="button-oauth-microsoft"
                >
                  {connectingProvider === 'microsoft' ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Connessione in corso...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Connetti Microsoft 365
                    </>
                  )}
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
