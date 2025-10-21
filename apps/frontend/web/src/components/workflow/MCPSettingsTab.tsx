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

import { useState, useEffect } from 'react';
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
  Info,
  Users,
  Unlink,
  Circle,
  Clock,
  Save,
  Plus,
  Settings
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  credentialType: 'api_key' | 'oauth2_user' | 'service_account' | null;
  status: 'active' | 'expired' | 'revoked';
  scope?: string;
  expiresAt?: string;
  connectedAt: string;
  lastUpdated: string;
  accountEmail?: string;
  accountName?: string;
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
  const [gtmForm, setGtmForm] = useState({ 
    containerId: '', 
    accountId: '', 
    workspaceId: '', 
    serviceAccountJson: '' 
  });

  // 🔧 Google-specific state for email detection & assignment
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleAccountType, setGoogleAccountType] = useState<'consumer' | 'workspace' | null>(null);
  const [googleAuthMode, setGoogleAuthMode] = useState<'oauth2' | 'service_account'>('oauth2');
  const [googleEmailDetecting, setGoogleEmailDetecting] = useState(false);
  const [googleOAuthConfigSaved, setGoogleOAuthConfigSaved] = useState(false);
  const [googleAccountConnected, setGoogleAccountConnected] = useState<MCPCredential | null>(null);
  const [googleConnectedAccounts, setGoogleConnectedAccounts] = useState<MCPCredential[]>([]); // 🆕 Multi-account support
  const [selectedMetaAccount, setSelectedMetaAccount] = useState<string>('');
  const [assignToUserId, setAssignToUserId] = useState<string>(currentUser?.id || '');
  
  // 🔄 Meta 3-Phase Flow States
  const [metaPhase1Complete, setMetaPhase1Complete] = useState(false);
  const [metaPhase2Complete, setMetaPhase2Complete] = useState(false);

  // 🔐 RBAC: Check if current user is admin
  const isAdmin = currentUser?.roles?.some(role => 
    role === 'admin' || role === 'super_admin' || role === 'tenant_admin'
  ) || false;

  // 🔄 Fetch Tenant Users (for admin dropdown)
  const { data: tenantUsers } = useQuery<{ id: string; email: string; name: string }[]>({
    queryKey: ['/api/users'],
    enabled: isAdmin, // Only fetch if admin
  });

  // 🔄 Fetch MCP Servers
  const { data: servers, isLoading: serversLoading } = useQuery<MCPServer[]>({
    queryKey: ['/api/mcp/servers'],
  });

  // 🎯 Google Email Detection Helper
  const detectGoogleAccountType = (email: string): 'consumer' | 'workspace' | null => {
    if (!email) return null;
    const domain = email.split('@')[1];
    if (!domain) return null;
    
    // Consumer Gmail
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      return 'consumer';
    }
    
    // Workspace (custom domain)
    return 'workspace';
  };

  // 🎯 Handle Google Email Blur Event
  const handleGoogleEmailBlur = () => {
    if (!googleEmail || !googleEmail.includes('@')) {
      setGoogleAccountType(null);
      return;
    }

    // Show loading feedback
    setGoogleEmailDetecting(true);
    
    // Simulate brief processing for UX feedback (detection is instant)
    setTimeout(() => {
      const detected = detectGoogleAccountType(googleEmail);
      setGoogleAccountType(detected);
      setGoogleEmailDetecting(false);
      
      // If consumer, force OAuth2 (no Service Account option)
      if (detected === 'consumer') {
        setGoogleAuthMode('oauth2');
      }
    }, 300);
  };

  // 🔄 Fetch User's OAuth Credentials
  const { data: credentials, isLoading: credentialsLoading } = useQuery<MCPCredential[]>({
    queryKey: ['/api/mcp/my-credentials'],
  });

  // 🔄 Sync googleOAuthConfigSaved from fetched credentials
  // This ensures the flag reflects server state after page reloads
  // ✅ CRITICAL: Only check for api_key credentials (OAuth config), NOT user accounts
  useEffect(() => {
    if (credentials) {
      const hasGoogleConfig = credentials.some(
        c => c.provider === 'google' && 
            c.status === 'active' && 
            c.credentialType === 'api_key' // ← Only OAuth config, not user accounts
      );
      setGoogleOAuthConfigSaved(hasGoogleConfig);
    }
  }, [credentials]);

  // 🔄 Sync googleAccountConnected from fetched credentials
  // ✅ CRITICAL: Only check for oauth2_user credentials (real connected accounts)
  useEffect(() => {
    if (credentials) {
      const connectedAccount = credentials.find(
        c => c.provider === 'google' && 
            c.status === 'active' && 
            c.credentialType === 'oauth2_user' // ← Only user OAuth accounts
      );
      setGoogleAccountConnected(connectedAccount || null);
    }
  }, [credentials]);

  // 🔄 Sync googleConnectedAccounts - ALL oauth2_user credentials for multi-account display
  useEffect(() => {
    if (credentials) {
      const allConnectedAccounts = credentials.filter(
        c => c.provider === 'google' && 
            c.status === 'active' && 
            c.credentialType === 'oauth2_user' // ← Get ALL user OAuth accounts
      );
      setGoogleConnectedAccounts(allConnectedAccounts);
    }
  }, [credentials]);

  // 🔄 Sync Meta Phase 1 state from credentials
  useEffect(() => {
    if (credentials) {
      // FASE 1: Check if Meta App config exists
      const hasMetaConfig = credentials.some(
        c => c.provider === 'meta' && c.serverName === 'meta-instagram-oauth-config' && c.status === 'active'
      );
      setMetaPhase1Complete(hasMetaConfig);
    }
  }, [credentials]);

  // 🔄 Fetch Connected Accounts for Meta/Instagram
  const metaServer = servers?.find(s => s.name === 'meta-instagram');
  const { data: connectedAccounts, isLoading: accountsLoading } = useQuery<{ success: boolean; accounts: ConnectedAccount[] }>({
    queryKey: ['/api/mcp/credentials/connected-accounts', metaServer?.id],
    enabled: !!metaServer,
  });

  // 🔄 Sync Meta Phase 2 state from connected accounts
  useEffect(() => {
    if (connectedAccounts?.accounts) {
      // FASE 2: Check if at least one account is connected
      setMetaPhase2Complete(connectedAccounts.accounts.length > 0);
    }
  }, [connectedAccounts]);

  const isLoading = serversLoading || credentialsLoading;

  // 🔄 Revoke Credential Mutation (soft delete - disconnect)
  const revokeCredentialMutation = useMutation({
    mutationFn: async (params: { provider: string; credentialId: string }) => {
      return apiRequest(`/api/mcp/credentials/${params.provider}/${params.credentialId}/revoke`, {
        method: 'PATCH'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp/my-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mcp/servers'] });
      toast({
        title: 'Account Revocato',
        description: 'Account disconnesso con successo. Puoi riconnetterlo in futuro.',
      });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: 'Impossibile revocare la credenziale',
        variant: 'destructive'
      });
    }
  });

  // 🗑️ Delete Credential Mutation (hard delete - permanent removal)
  const deleteCredentialMutation = useMutation({
    mutationFn: async (params: { provider: string; credentialId: string }) => {
      return apiRequest(`/api/mcp/credentials/${params.provider}/${params.credentialId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp/my-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mcp/servers'] });
      toast({
        title: 'Account Eliminato',
        description: 'Credenziale eliminata permanentemente dal database',
      });
    },
    onError: (error: any) => {
      const is409 = error?.response?.status === 409;
      toast({
        title: is409 ? 'Account in Uso' : 'Errore',
        description: is409 
          ? 'Impossibile eliminare: alcuni workflow usano questo account. Revocalo prima o modifica i workflow.'
          : 'Impossibile eliminare la credenziale',
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
      setGoogleOAuthConfigSaved(true); // Mark config as saved
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

  // 🔄 Save GTM Configuration Mutation
  const saveGTMMutation = useMutation({
    mutationFn: async (data: { containerId: string; accountId: string; workspaceId: string; serviceAccountJson: string }) => {
      // Validate JSON before sending (if provided)
      if (data.serviceAccountJson) {
        try {
          JSON.parse(data.serviceAccountJson);
        } catch {
          throw new Error('JSON Service Account non valido');
        }
      }
      
      return apiRequest('/api/mcp/credentials/gtm', {
        method: 'POST',
        body: JSON.stringify({
          containerId: data.containerId,
          accountId: data.accountId,
          workspaceId: data.workspaceId,
          serviceAccountJson: data.serviceAccountJson,
          metadata: { provider: 'gtm' }
        }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp/credentials'] });
      setGtmForm({ containerId: '', accountId: '', workspaceId: '', serviceAccountJson: '' }); // Clear form
      toast({
        title: 'GTM Configurazione Salvata',
        description: 'Configurazione GTM salvata con successo',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore GTM',
        description: error instanceof Error ? error.message : 'Impossibile salvare configurazione GTM',
        variant: 'destructive'
      });
    }
  });

  // 🔄 Create or Get MCP Server Mutation
  const createServerMutation = useMutation({
    mutationFn: async (params: { name: string; displayName: string; description: string }) => {
      return apiRequest('/api/mcp/servers', {
        method: 'POST',
        body: {
          name: params.name,
          displayName: params.displayName,
          description: params.description,
          transport: 'stdio', // Default transport
          config: {}, // Server-specific configuration
          status: 'configuring' // Will be activated after OAuth
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
        const displayNameMap = {
          google: 'Google Workspace',
          microsoft: 'Microsoft 365',
          meta: 'Meta/Instagram'
        };
        
        const descriptionMap = {
          google: 'Google Workspace OAuth Integration (Gmail, Drive, Calendar, Sheets)',
          microsoft: 'Microsoft 365 OAuth Integration (Outlook, OneDrive, Teams)',
          meta: 'Meta/Instagram OAuth Integration (Posts, Stories, Messages)'
        };
        
        server = await createServerMutation.mutateAsync({
          name: serverName,
          displayName: displayNameMap[provider],
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

      // 🎯 RBAC: Admin can assign OAuth account to another user
      let oauthUrl = `/api/mcp/oauth/${provider}/start/${server.id}?tenantId=${tenantId}&userId=${userId}`;
      
      // Only append assignTo if admin is assigning to a different user
      if (isAdmin && assignToUserId && assignToUserId !== userId) {
        oauthUrl += `&assignTo=${assignToUserId}`;
      }
      
      window.location.href = oauthUrl;
      
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

    // 🆕 CRITICAL FIX: Check if this is OAuth config (api_key) vs user account (oauth2_user)
    const isOAuthConfig = credential.credentialType === 'api_key';
    const isUserAccount = credential.credentialType === 'oauth2_user';

    // 🔑 For OAuth Config (Client ID/Secret saved) - Show "Connect Account" button
    if (isOAuthConfig) {
      return (
        <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-sm text-blue-900">OAuth Configurato</span>
            </div>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCredentialMutation.mutate({ 
                        provider, 
                        credentialId: credential.id 
                      })}
                      disabled={deleteCredentialMutation.isPending}
                      data-testid={`button-delete-${provider}`}
                      className="h-10 w-10 p-0 hover:bg-red-50"
                    >
                      <Trash2 className="h-6 w-6 text-red-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs font-semibold">Elimina configurazione OAuth</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          <div className="text-xs space-y-1 text-blue-800">
            <p>✅ Client ID e Secret salvati</p>
            <p className="text-blue-600">⚠️ Nessun account Google connesso</p>
          </div>

          {/* 🚀 CONNECT ACCOUNT BUTTON */}
          <Button 
            onClick={() => handleOAuthInitiate(provider as any)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={connectingProvider === provider}
            data-testid={`button-oauth-connect-${provider}`}
          >
            {connectingProvider === provider ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Connessione in corso...
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Sign in with {provider.charAt(0).toUpperCase() + provider.slice(1)}
              </>
            )}
          </Button>
        </div>
      );
    }

    // 👤 For User Account (oauth2_user) - Show account details
    const statusConfig = {
      active: {
        color: 'text-green-600 bg-green-50 border-green-200',
        badgeColor: 'bg-green-500',
        icon: CheckCircle,
        label: 'Account Connesso'
      },
      expired: {
        color: 'text-red-600 bg-red-50 border-red-200',
        badgeColor: 'bg-red-500',
        icon: XCircle,
        label: 'Scaduto'
      },
      revoked: {
        color: 'text-gray-600 bg-gray-50 border-gray-300',
        badgeColor: 'bg-gray-500',
        icon: AlertCircle,
        label: 'Revocato'
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
          <div className="flex items-center gap-1">
            {/* Revoke Button (soft delete - disconnect) */}
            {credential.status !== 'revoked' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeCredentialMutation.mutate({ 
                        provider, 
                        credentialId: credential.id 
                      })}
                      disabled={revokeCredentialMutation.isPending}
                      data-testid={`button-revoke-${provider}`}
                      className="h-10 w-10 p-0 hover:bg-orange-50"
                    >
                      <Unlink className="h-6 w-6 text-orange-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Disconnetti account (revoca)</p>
                    <p className="text-xs text-gray-400">Puoi riconnetterlo in futuro</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Delete Button (hard delete - permanent removal) */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCredentialMutation.mutate({ 
                      provider, 
                      credentialId: credential.id 
                    })}
                    disabled={deleteCredentialMutation.isPending}
                    data-testid={`button-delete-${provider}`}
                    className="h-10 w-10 p-0 hover:bg-red-50"
                  >
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-semibold">Elimina permanentemente</p>
                  <p className="text-xs text-gray-400">Rimozione completa dal database</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <div className="text-xs space-y-1 pl-6">
          {credential.accountEmail && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Email:</span>
              <span className="font-semibold text-gray-900">{credential.accountEmail}</span>
            </div>
          )}
          
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

        {/* 🔵 GOOGLE WORKSPACE - New Implementation with Email Detection & RBAC */}
        <TabsContent value="google">
          <Card className="windtre-glass-panel border-white/20">
            <CardHeader>
              <CardTitle>🔵 Google Workspace</CardTitle>
              <CardDescription>
                Connetti Gmail, Drive, Calendar, Sheets per automazioni workflow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Email Input with Auto-Detection */}
              <div className="space-y-3">
                <Label htmlFor="google-email">Email Google *</Label>
                <Input 
                  id="google-email"
                  type="email"
                  placeholder="user@company.com o user@gmail.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  onBlur={handleGoogleEmailBlur}
                  data-testid="input-google-email"
                  className="text-base"
                />
                
                {/* Detection Loading */}
                {googleEmailDetecting && (
                  <Alert className="bg-gray-50 border-gray-200">
                    <RefreshCw className="h-4 w-4 text-gray-600 animate-spin" />
                    <AlertTitle className="text-gray-900">Analisi in corso...</AlertTitle>
                    <AlertDescription className="text-sm text-gray-700">
                      Rilevamento tipo account Google
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Detection Result */}
                {!googleEmailDetecting && googleAccountType === 'consumer' && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-900">Gmail Consumer rilevato</AlertTitle>
                    <AlertDescription className="text-sm text-blue-800">
                      Procederemo con OAuth2 standard (setup ~5 minuti)
                    </AlertDescription>
                  </Alert>
                )}
                
                {!googleEmailDetecting && googleAccountType === 'workspace' && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-900">Google Workspace rilevato</AlertTitle>
                    <AlertDescription className="text-sm text-green-800">
                      Scegli la modalità di autenticazione qui sotto
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Step 2: Admin Assignment (only visible for admins) */}
              {isAdmin && googleEmail && googleAccountType && (
                <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 text-purple-900 font-medium">
                    <Users className="h-4 w-4" />
                    <span>Assegna Account (solo Admin)</span>
                  </div>
                  <Label htmlFor="assign-to-user">Configura account per utente:</Label>
                  <Select value={assignToUserId} onValueChange={setAssignToUserId}>
                    <SelectTrigger id="assign-to-user" data-testid="select-assign-user">
                      <SelectValue placeholder="Seleziona utente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={currentUser?.id || ''}>
                        {currentUser?.name || currentUser?.email} (Tu)
                      </SelectItem>
                      {tenantUsers?.filter(u => u.id !== currentUser?.id).map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-purple-700">
                    💡 L'account Google {googleEmail} sarà assegnato all'utente selezionato
                  </p>
                </div>
              )}

              {/* Step 3: Auth Mode Selection (only for Workspace) */}
              {googleAccountType === 'workspace' && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                  <Label className="text-base font-semibold">Modalità di Autenticazione</Label>
                  <RadioGroup value={googleAuthMode} onValueChange={(v) => setGoogleAuthMode(v as 'oauth2' | 'service_account')}>
                    {/* OAuth2 Simple Mode */}
                    <div className="flex items-start space-x-3 p-3 rounded-lg border-2 border-blue-200 bg-blue-50">
                      <RadioGroupItem value="oauth2" id="mode-oauth2" />
                      <div className="flex-1">
                        <Label htmlFor="mode-oauth2" className="text-sm font-semibold text-blue-900 cursor-pointer">
                          ● Standard (OAuth2) - Consigliato ⭐
                        </Label>
                        <ul className="text-xs text-blue-800 space-y-1 mt-2">
                          <li>✓ Ogni utente autorizza il proprio account</li>
                          <li>✓ Setup 5 minuti</li>
                          <li>✓ Sicuro e affidabile</li>
                        </ul>
                      </div>
                    </div>

                    {/* Service Account Advanced Mode */}
                    <div className="flex items-start space-x-3 p-3 rounded-lg border-2 border-orange-200 bg-orange-50">
                      <RadioGroupItem value="service_account" id="mode-service-account" />
                      <div className="flex-1">
                        <Label htmlFor="mode-service-account" className="text-sm font-semibold text-orange-900 cursor-pointer flex items-center gap-2">
                          ○ Avanzata (Service Account)
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-4 w-4 text-orange-600" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <p className="font-semibold">Solo per casi avanzati</p>
                                <p className="text-xs mt-1">Richiede Super Admin Workspace e domain-wide delegation. Google sconsiglia per Gmail per comportamento inconsistente.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <ul className="text-xs text-orange-800 space-y-1 mt-2">
                          <li>⚠️ Solo se sei Super Admin Workspace</li>
                          <li>⚠️ Setup complesso (15-30 min)</li>
                          <li>⚠️ Google lo sconsiglia per Gmail</li>
                        </ul>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Step 4: OAuth Configuration (shown when consumer or workspace with oauth2 selected) */}
              {googleEmail && googleAccountType && (googleAccountType === 'consumer' || googleAuthMode === 'oauth2') && (
                <div className="pt-4 border-t space-y-4">
                  <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-800 space-y-1">
                      <p><strong>Setup OAuth2:</strong></p>
                      <ol className="list-decimal list-inside space-y-0.5">
                        <li>Crea OAuth Client in Google Cloud Console</li>
                        <li>Aggiungi redirect URI: <code className="bg-white px-1 rounded">{window.location.origin}/api/mcp/oauth/google/callback</code></li>
                        <li>Incolla Client ID e Secret qui sotto</li>
                        <li>Clicca "Salva Configurazione OAuth"</li>
                        <li>Poi potrai cliccare "Sign in with Google"</li>
                      </ol>
                    </div>
                  </div>

                  {/* Client ID & Secret Form */}
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="google-client-id">Client ID *</Label>
                      <Input
                        id="google-client-id"
                        type="text"
                        placeholder="123456789-abc.apps.googleusercontent.com"
                        value={googleForm.clientId}
                        onChange={(e) => setGoogleForm({ ...googleForm, clientId: e.target.value })}
                        data-testid="input-google-client-id"
                        className={`${googleForm.clientId && googleForm.clientId.length > 20 ? 'border-green-500' : ''}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="google-client-secret">Client Secret *</Label>
                      <Input
                        id="google-client-secret"
                        type="password"
                        placeholder="GOCSPX-..."
                        value={googleForm.clientSecret}
                        onChange={(e) => setGoogleForm({ ...googleForm, clientSecret: e.target.value })}
                        data-testid="input-google-client-secret"
                        className={`${googleForm.clientSecret && googleForm.clientSecret.length > 20 ? 'border-green-500' : ''}`}
                      />
                    </div>

                    {/* Save OAuth Config Button */}
                    <Button
                      onClick={() => saveGoogleCredentialsMutation.mutate({
                        clientId: googleForm.clientId,
                        clientSecret: googleForm.clientSecret
                      })}
                      disabled={!googleForm.clientId || !googleForm.clientSecret || saveGoogleCredentialsMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white w-full"
                      data-testid="button-save-google-config"
                    >
                      {saveGoogleCredentialsMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Salvataggio...
                        </>
                      ) : (
                        <>
                          <Key className="h-4 w-4 mr-2" />
                          Salva Configurazione OAuth
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Sign in with Google - Only visible after config saved */}
                  {googleOAuthConfigSaved && (
                    <div className="space-y-3 pt-4 border-t">
                      {googleAccountConnected ? (
                        // ✅ Account Connected - Show details + "Connect Another Account" button
                        <div className="space-y-3">
                          <Alert className="bg-green-50 border-green-200">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-900">Account Google Connesso ✓</AlertTitle>
                            <AlertDescription className="text-sm text-green-800 space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-xs font-semibold text-gray-600">Email</p>
                                  <p className="font-medium">{googleAccountConnected.accountEmail || 'N/A'}</p>
                                </div>
                                {googleAccountConnected.accountName && (
                                  <div>
                                    <p className="text-xs font-semibold text-gray-600">Nome</p>
                                    <p className="font-medium">{googleAccountConnected.accountName}</p>
                                  </div>
                                )}
                              </div>
                              {googleAccountConnected.scope && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-600">Permessi Concessi</p>
                                  <p className="text-xs">{googleAccountConnected.scope.split(' ').length} scope: {googleAccountConnected.scope.split(' ').slice(0, 3).join(', ')}{googleAccountConnected.scope.split(' ').length > 3 ? '...' : ''}</p>
                                </div>
                              )}
                              {googleAccountConnected.expiresAt && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-600">Scadenza Token</p>
                                  <p className="text-xs">{new Date(googleAccountConnected.expiresAt).toLocaleString('it-IT')}</p>
                                </div>
                              )}
                            </AlertDescription>
                          </Alert>

                          {/* Connect Another Account Button */}
                          <Button 
                            onClick={() => handleOAuthInitiate('google')}
                            variant="outline"
                            className="w-full border-blue-200 hover:bg-blue-50"
                            disabled={connectingProvider === 'google' || isLoading}
                            data-testid="button-oauth-google-another"
                          >
                            {connectingProvider === 'google' ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Connessione in corso...
                              </>
                            ) : (
                              <>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Connetti Altro Account Google
                              </>
                            )}
                          </Button>
                        </div>
                      ) : (
                        // ⚠️ Config Saved but No Account - First Sign In
                        <>
                          <Alert className="bg-yellow-50 border-yellow-200">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <AlertTitle className="text-yellow-900">Configurazione OAuth Salvata</AlertTitle>
                            <AlertDescription className="text-sm text-yellow-800">
                              Clicca il pulsante qui sotto per autorizzare il tuo account Google
                            </AlertDescription>
                          </Alert>

                          <Button 
                            onClick={() => handleOAuthInitiate('google')}
                            className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                            disabled={connectingProvider === 'google' || isLoading || !googleEmail}
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
                                Sign in with Google
                              </>
                            )}
                          </Button>
                          <p className="text-xs text-gray-500 text-center">
                            💡 Sarai reindirizzato alla pagina di autorizzazione Google
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Service Account Configuration (shown only when workspace + service_account) */}
              {googleEmail && googleAccountType === 'workspace' && googleAuthMode === 'service_account' && (
                <div className="pt-4 border-t space-y-4">
                  <Alert className="bg-orange-50 border-orange-300">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertTitle className="text-orange-900">Modalità Avanzata</AlertTitle>
                    <AlertDescription className="text-sm text-orange-800 space-y-2">
                      <p>Requisiti per Service Account:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Super Admin Google Workspace</li>
                        <li>Domain-wide delegation configurato</li>
                        <li>Service Account JSON key</li>
                      </ul>
                      <p className="text-xs font-semibold">⚠️ Google sconsiglia Service Account per Gmail (comportamento instabile)</p>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <Label htmlFor="service-account-json">Service Account JSON *</Label>
                    <textarea
                      id="service-account-json"
                      className="w-full min-h-[120px] p-2 border rounded text-xs font-mono"
                      placeholder='{"type": "service_account", ...}'
                      data-testid="textarea-service-account"
                    />
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white w-full">
                      <Key className="h-4 w-4 mr-2" />
                      Salva Service Account
                    </Button>
                  </div>
                </div>
              )}

              {/* 🆕 Connected Accounts Section - Multi-Account Display */}
              {googleConnectedAccounts.length > 0 && (
                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Account Connessi ({googleConnectedAccounts.length})</h4>
                    <Button 
                      onClick={() => handleOAuthInitiate('google')}
                      variant="outline"
                      size="sm"
                      className="border-blue-200 hover:bg-blue-50"
                      disabled={connectingProvider === 'google' || isLoading}
                      data-testid="button-connect-another-google"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Connetti Nuovo Account
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {googleConnectedAccounts.map((account) => (
                      <Card key={account.id} className="bg-green-50/50 border-green-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="font-semibold text-green-900">{account.accountEmail || 'Account Google'}</span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                {account.accountName && (
                                  <div>
                                    <p className="text-gray-600 font-semibold">Nome</p>
                                    <p className="text-gray-900">{account.accountName}</p>
                                  </div>
                                )}
                                {account.scope && (
                                  <div>
                                    <p className="text-gray-600 font-semibold">Permessi</p>
                                    <p className="text-gray-900">{account.scope.split(' ').length} scope concessi</p>
                                  </div>
                                )}
                                {account.expiresAt && (
                                  <div>
                                    <p className="text-gray-600 font-semibold">Scadenza Token</p>
                                    <p className="text-gray-900">{new Date(account.expiresAt).toLocaleDateString('it-IT')}</p>
                                  </div>
                                )}
                                {account.userId && (
                                  <div>
                                    <p className="text-gray-600 font-semibold">Assegnato a</p>
                                    <p className="text-gray-900 truncate">{account.userId}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              className="ml-4 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => {
                                if (confirm(`Revocare l'accesso per ${account.accountEmail}?`)) {
                                  revokeCredentialMutation.mutate(account.id);
                                }
                              }}
                              disabled={revokeCredentialMutation.isPending}
                              data-testid={`button-revoke-google-${account.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Existing Credentials Status (Legacy - shows config) */}
              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold mb-3">Account Configurati</h4>
                {renderCredentialStatus('google')}
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

        {/* 🔴 META/INSTAGRAM - 3 PHASE VERTICAL FLOW */}
        <TabsContent value="meta">
          <div className="space-y-6">
            {/* HEADER */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Meta/Instagram OAuth2</h2>
              <p className="text-sm text-gray-600 mt-1">
                Gestisci Instagram Posts, Stories, Comments, Direct Messages
              </p>
            </div>

            {/* ✅ FASE 1: Configurazione App Meta */}
            <Card className={`windtre-glass-panel ${metaPhase1Complete ? 'border-green-500' : 'border-pink-300'}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {metaPhase1Complete ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400" />
                    )}
                    FASE 1: Configurazione App Meta
                  </CardTitle>
                  {metaPhase1Complete && (
                    <Badge className="bg-green-100 text-green-800">✓ Completata</Badge>
                  )}
                </div>
                <CardDescription>
                  Configura App ID e Secret della tua Meta App
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Instructions */}
                <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-pink-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-semibold text-pink-900">Setup Meta Developer App:</p>
                      <ol className="text-xs text-pink-800 space-y-1 list-decimal list-inside">
                        <li>Vai su <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="underline font-semibold">developers.facebook.com/apps</a></li>
                        <li>Crea App → Business → Abilita Instagram Graph API</li>
                        <li>In Settings → Basic, copia App ID e App Secret</li>
                        <li>Aggiungi questo Redirect URI in Valid OAuth Redirect URIs:</li>
                      </ol>
                      <code className="text-xs bg-white px-2 py-1 rounded border border-pink-300 block break-all">
                        {window.location.origin}/api/mcp/oauth/meta/callback
                      </code>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="meta-app-id">App ID *</Label>
                    <Input 
                      id="meta-app-id" 
                      type="text" 
                      placeholder="1234567890123456"
                      value={metaForm.appId}
                      onChange={(e) => setMetaForm({ ...metaForm, appId: e.target.value })}
                      data-testid="input-meta-app-id"
                      className={`${metaForm.appId && metaForm.appId.length > 10 ? 'border-green-500' : ''}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meta-app-secret">App Secret *</Label>
                    <Input 
                      id="meta-app-secret" 
                      type="password" 
                      placeholder="••••••••"
                      value={metaForm.appSecret}
                      onChange={(e) => setMetaForm({ ...metaForm, appSecret: e.target.value })}
                      data-testid="input-meta-app-secret"
                      className={`${metaForm.appSecret && metaForm.appSecret.length > 20 ? 'border-green-500' : ''}`}
                    />
                  </div>
                  
                  <Button
                    onClick={() => {
                      if (!metaForm.appId || !metaForm.appSecret) {
                        toast({
                          title: 'Campi Obbligatori',
                          description: 'Inserisci App ID e App Secret',
                          variant: 'destructive'
                        });
                        return;
                      }
                      saveMetaCredentialsMutation.mutate(metaForm);
                    }}
                    disabled={!metaForm.appId || !metaForm.appSecret || saveMetaCredentialsMutation.isPending}
                    className="bg-pink-600 hover:bg-pink-700 text-white w-full"
                    data-testid="button-save-meta-config"
                  >
                    {saveMetaCredentialsMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Salva Configurazione App
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* ⏳ FASE 2: Account Meta Connessi */}
            <Card className={`windtre-glass-panel ${!metaPhase1Complete ? 'opacity-50' : metaPhase2Complete ? 'border-green-500' : 'border-orange-300'}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {!metaPhase1Complete ? (
                      <Circle className="h-5 w-5 text-gray-400" />
                    ) : metaPhase2Complete ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-orange-500" />
                    )}
                    FASE 2: Account Meta Connessi
                  </CardTitle>
                  {metaPhase2Complete && (
                    <Badge className="bg-green-100 text-green-800">✓ {connectedAccounts?.accounts?.length || 0} account</Badge>
                  )}
                  {!metaPhase1Complete && (
                    <Badge className="bg-gray-100 text-gray-600">Bloccata</Badge>
                  )}
                </div>
                <CardDescription>
                  Connetti uno o più account Facebook/Instagram
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!metaPhase1Complete ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Completa prima la FASE 1 per sbloccare questa sezione
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {/* Connected Accounts List */}
                    {accountsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                        <span className="ml-2 text-sm text-gray-500">Caricamento account...</span>
                      </div>
                    ) : connectedAccounts?.accounts && connectedAccounts.accounts.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-700">Account Connessi ({connectedAccounts.accounts.length})</h4>
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
                                    if (confirm(`Rimuovere "${account.accountName}"?`)) {
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
                      <div className="text-center py-6 text-sm text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                        Nessun account connesso. Clicca il bottone qui sotto per iniziare.
                      </div>
                    )}

                    {/* Connect New Account Button */}
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
                          <Plus className="h-4 w-4 mr-2" />
                          Connetti Nuovo Account Meta
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 text-center">
                      💡 Puoi connettere più account Facebook/Instagram
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* ⏳ FASE 3: Selezione Pagine per Workflow */}
            <Card className={`windtre-glass-panel ${!metaPhase2Complete ? 'opacity-50' : 'border-blue-300'}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {!metaPhase2Complete ? (
                      <Circle className="h-5 w-5 text-gray-400" />
                    ) : selectedMetaAccount ? (
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Settings className="h-5 w-5 text-blue-500" />
                    )}
                    FASE 3: Selezione Pagine per Workflow
                  </CardTitle>
                  {!metaPhase2Complete && (
                    <Badge className="bg-gray-100 text-gray-600">Bloccata</Badge>
                  )}
                </div>
                <CardDescription>
                  Scegli quale account usare nei nodi workflow
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!metaPhase2Complete ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Connetti almeno un account nella FASE 2 per continuare
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="meta-account-select">Seleziona Account *</Label>
                      <Select value={selectedMetaAccount} onValueChange={setSelectedMetaAccount}>
                        <SelectTrigger id="meta-account-select" data-testid="select-meta-account">
                          <SelectValue placeholder="Scegli un account..." />
                        </SelectTrigger>
                        <SelectContent>
                          {connectedAccounts?.accounts?.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.accountName}
                              {account.instagramAccountName && ` • IG: ${account.instagramAccountName}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-blue-700">
                        🎯 I nodi workflow Meta/Instagram useranno questo account
                      </p>
                    </div>

                    {selectedMetaAccount && (
                      <Alert className="bg-green-50 border-green-200">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-xs text-green-800">
                          Account selezionato! Ora puoi usare i nodi Meta/Instagram nei workflow.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
              <CardTitle>Google Tag Manager Configuration</CardTitle>
              <CardDescription>
                Configura GTM Container per auto-creazione tag e trigger nel sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderCredentialStatus('gtm')}
              
              {/* Info Tooltip */}
              <TooltipProvider>
                <div className="flex items-start gap-2 bg-green-50 p-4 rounded-lg border border-green-200">
                  <Info className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-semibold text-green-900">🟢 Come trovare i dati GTM:</p>
                    <ol className="text-xs text-green-800 space-y-1 list-decimal list-inside">
                      <li>Accedi a <strong>Google Tag Manager Console</strong></li>
                      <li><strong>Container ID</strong>: Visibile in alto (es. GTM-XXXXXX)</li>
                      <li><strong>Account ID</strong>: Vai su Admin → Account Settings (numero a 10 cifre)</li>
                      <li><strong>Workspace ID</strong>: Workspace attuale (numero a 10 cifre)</li>
                      <li><strong>Service Account JSON</strong>: (Opzionale) Scarica da Google Cloud Console per API access</li>
                    </ol>
                  </div>
                </div>
              </TooltipProvider>
              
              <form className="space-y-4" onSubmit={(e) => {
                e.preventDefault();
                if (!gtmForm.containerId || !gtmForm.accountId || !gtmForm.workspaceId) {
                  toast({
                    title: 'Campi Obbligatori',
                    description: 'Container ID, Account ID e Workspace ID sono obbligatori',
                    variant: 'destructive'
                  });
                  return;
                }
                saveGTMMutation.mutate(gtmForm);
              }}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gtm-container-id">Container ID *</Label>
                    <Input 
                      id="gtm-container-id" 
                      type="text" 
                      placeholder="GTM-XXXXXX"
                      value={gtmForm.containerId}
                      onChange={(e) => setGtmForm({ ...gtmForm, containerId: e.target.value })}
                      data-testid="input-gtm-container-id"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="gtm-account-id">Account ID *</Label>
                    <Input 
                      id="gtm-account-id" 
                      type="text" 
                      placeholder="1234567890"
                      value={gtmForm.accountId}
                      onChange={(e) => setGtmForm({ ...gtmForm, accountId: e.target.value })}
                      data-testid="input-gtm-account-id"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="gtm-workspace-id">Workspace ID *</Label>
                  <Input 
                    id="gtm-workspace-id" 
                    type="text" 
                    placeholder="1234567890"
                    value={gtmForm.workspaceId}
                    onChange={(e) => setGtmForm({ ...gtmForm, workspaceId: e.target.value })}
                    data-testid="input-gtm-workspace-id"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="gtm-service-account">Service Account JSON (Opzionale)</Label>
                  <textarea
                    id="gtm-service-account"
                    className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder='{"type":"service_account","project_id":"...","private_key":"..."}'
                    value={gtmForm.serviceAccountJson}
                    onChange={(e) => setGtmForm({ ...gtmForm, serviceAccountJson: e.target.value })}
                    data-testid="input-gtm-service-account"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Solo per accesso API programmatico (opzionale per auto-config)
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="bg-green-600 hover:bg-green-700 text-white w-full"
                  disabled={saveGTMMutation.isPending}
                  data-testid="button-save-gtm"
                >
                  <Key className="h-4 w-4 mr-2" />
                  {saveGTMMutation.isPending ? 'Salvando...' : 'Salva Configurazione GTM'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 🔧 Debug Info (Development Only) */}
      {import.meta.env.DEV && (
        <Card className="border-dashed border-gray-300">
          <CardHeader>
            <CardTitle className="text-sm text-gray-600 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Debug: Credentials Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-600 font-medium">Configurazioni OAuth</p>
                <p className="text-2xl font-bold text-blue-900">
                  {credentials?.filter(c => c.credentialType === 'api_key').length || 0}
                </p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <p className="text-xs text-green-600 font-medium">Account Connessi</p>
                <p className="text-2xl font-bold text-green-900">
                  {credentials?.filter(c => c.credentialType === 'oauth2_user').length || 0}
                </p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                <p className="text-xs text-purple-600 font-medium">Totale Credenziali</p>
                <p className="text-2xl font-bold text-purple-900">
                  {credentials?.length || 0}
                </p>
              </div>
            </div>

            {/* Detailed Credentials Table */}
            {credentials && credentials.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">Credenziali Dettagliate</h4>
                {credentials.map((cred) => (
                  <div 
                    key={cred.id} 
                    className={`p-3 rounded-lg border-2 ${
                      cred.credentialType === 'oauth2_user' 
                        ? 'bg-green-50 border-green-300' 
                        : 'bg-blue-50 border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Badge className={`text-xs ${
                          cred.credentialType === 'oauth2_user' 
                            ? 'bg-green-600' 
                            : 'bg-blue-600'
                        }`}>
                          {cred.credentialType || 'unknown'}
                        </Badge>
                        <Badge className="ml-2 text-xs bg-gray-600">
                          {cred.provider || 'N/A'}
                        </Badge>
                      </div>
                      <Badge variant={cred.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {cred.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-gray-600">Server:</span>
                          <p className="font-mono text-gray-900 truncate">{cred.serverName}</p>
                        </div>
                        {cred.accountEmail && (
                          <div>
                            <span className="text-gray-600">Email:</span>
                            <p className="font-mono text-gray-900 truncate">{cred.accountEmail}</p>
                          </div>
                        )}
                        {cred.scope && (
                          <div>
                            <span className="text-gray-600">Scopes:</span>
                            <p className="font-mono text-gray-900">{cred.scope.split(' ').length} permessi</p>
                          </div>
                        )}
                        {cred.expiresAt && (
                          <div>
                            <span className="text-gray-600">Scadenza:</span>
                            <p className="font-mono text-gray-900">
                              {new Date(cred.expiresAt).toLocaleDateString('it-IT', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-600">Creata:</span>
                          <p className="font-mono text-gray-900">
                            {new Date(cred.connectedAt).toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: '2-digit', 
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Nessuna credenziale trovata. Configura le tue prime credenziali OAuth.
                </AlertDescription>
              </Alert>
            )}

            {/* Raw JSON (collapsible) */}
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-600 hover:text-gray-900 font-medium">
                Mostra JSON completo
              </summary>
              <pre className="mt-2 bg-gray-50 p-3 rounded overflow-auto max-h-64 border">
                {JSON.stringify(credentials || [], null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
