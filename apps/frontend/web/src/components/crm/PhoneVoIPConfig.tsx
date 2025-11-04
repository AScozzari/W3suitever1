import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { LoadingState } from '@w3suite/frontend-kit/components/blocks';
import { useRequiredTenantId } from '@/hooks/useTenantSafety';
import { 
  Phone, 
  Plus,
  Server,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Copy,
  RefreshCw,
  Key,
  Shield,
  Pencil,
  Trash2,
  Bot
} from 'lucide-react';
import { TrunkAIConfigDialog } from './TrunkAIConfigDialog';

interface PhoneVoIPConfigProps {
  visible: boolean;
  onClose: () => void;
}

const extensionFormSchema = z.object({
  userId: z.string().min(1, "Seleziona un utente"),
  extension: z.string().min(1, "Numero interno obbligatorio").max(20),
  sipUsername: z.string().min(1, "Username SIP obbligatorio").max(100),
  displayName: z.string().optional(),
  email: z.string().email().optional(),
  // Advanced SIP Configuration (optional)
  sipServer: z.string().optional(),
  sipPort: z.coerce.number().int().min(1).max(65535).optional(),
  wsPort: z.coerce.number().int().min(1).max(65535).optional(),
  transport: z.enum(['udp', 'tcp', 'tls', 'wss']).optional(),
  callerIdName: z.string().optional(),
  callerIdNumber: z.string().optional(),
  allowedCodecs: z.string().optional(),
  authRealm: z.string().optional(),
  // Features
  voicemailEnabled: z.boolean().default(true),
  voicemailEmail: z.string().email().optional(),
  voicemailPin: z.string().optional(),
  recordingEnabled: z.boolean().default(false),
  dndEnabled: z.boolean().default(false),
  callForwardEnabled: z.boolean().default(false),
  callForwardNumber: z.string().optional(),
  // Limits & Security
  maxConcurrentCalls: z.coerce.number().int().min(1).max(10).optional(),
  registrationExpiry: z.coerce.number().int().min(60).max(7200).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
});

type ExtensionFormValues = z.infer<typeof extensionFormSchema>;

export function PhoneVoIPConfig({ visible, onClose }: PhoneVoIPConfigProps) {
  const { toast } = useToast();
  const tenantId = useRequiredTenantId();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'trunks' | 'extensions'>('dashboard');
  const [editingExtension, setEditingExtension] = useState<string | null>(null);
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [showAdvancedSIP, setShowAdvancedSIP] = useState(false);
  const [sipCredentials, setSipCredentials] = useState<{
    extension: string;
    sipUsername: string;
    sipPassword: string;
    sipServer: string;
    sipPort: number;
    wsPort?: number;
  } | null>(null);
  const [trunkAIConfig, setTrunkAIConfig] = useState<any | null>(null);
  const [showTrunkAIConfig, setShowTrunkAIConfig] = useState(false);

  const { data: trunks = [], isLoading: trunksLoading, refetch: refetchTrunks } = useQuery<any[]>({
    queryKey: ['/api/voip/trunks'],
    enabled: visible,
    refetchOnMount: true,
    staleTime: 0,
  });

  // Force refetch when modal opens
  useEffect(() => {
    if (visible) {
      refetchTrunks();
    }
  }, [visible, refetchTrunks]);

  const { data: extensions = [], isLoading: extensionsLoading } = useQuery<any[]>({
    queryKey: ['/api/voip/extensions'],
    enabled: visible,
    refetchOnMount: true,
    staleTime: 0,
  });

  const { data: stores = [] } = useQuery<any[]>({
    queryKey: ['/api/stores'],
    enabled: visible,
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
    enabled: visible,
  });

  const { data: connectionStatus, isLoading: connectionLoading } = useQuery<any>({
    queryKey: ['/api/voip/connection-status'],
    enabled: visible && activeTab === 'dashboard',
    refetchInterval: 30000,
  });

  const extensionForm = useForm<ExtensionFormValues>({
    resolver: zodResolver(extensionFormSchema),
    defaultValues: {
      userId: '',
      extension: '',
      sipUsername: '',
      displayName: '',
      email: '',
      voicemailEnabled: true,
      voicemailEmail: '',
      recordingEnabled: false,
      dndEnabled: false,
      status: 'active',
    },
  });

  const extensionMutation = useMutation({
    mutationFn: async (data: ExtensionFormValues) => {
      if (editingExtension) {
        return apiRequest('PATCH', `/api/voip/extensions/${editingExtension}`, data);
      }
      return apiRequest('POST', '/api/voip/extensions', data);
    },
    onSuccess: (response: any) => {
      toast({
        title: editingExtension ? "Extension aggiornata" : "Extension creata",
        description: "Configurazione salvata con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/voip/extensions'] });
      
      // If creating new extension, show SIP credentials dialog (plaintext password available only on creation)
      if (!editingExtension && response?.data?.plaintextPassword) {
        setSipCredentials({
          extension: response.data.extension.extension,
          sipUsername: response.data.extension.sipUsername,
          sipPassword: response.data.plaintextPassword,
          sipServer: response.data.extension.sipServer || 'sip.edgvoip.com',
          sipPort: response.data.extension.sipPort || 5060,
          wsPort: response.data.extension.wsPort,
        });
      }
      
      setShowExtensionForm(false);
      setEditingExtension(null);
      extensionForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile salvare extension",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (extensionId: string) => {
      return apiRequest('PATCH', `/api/voip/extensions/${extensionId}/reset-password`, null);
    },
    onSuccess: (response: any) => {
      toast({
        title: "Password resettata",
        description: "Nuova password generata con successo",
      });
      
      // Show new credentials
      if (response?.data?.plaintextPassword) {
        setSipCredentials({
          extension: response.data.extension.extension,
          sipUsername: response.data.extension.sipUsername,
          sipPassword: response.data.plaintextPassword,
          sipServer: response.data.extension.sipServer || 'sip.edgvoip.com',
          sipPort: response.data.extension.sipPort || 5060,
          wsPort: response.data.extension.wsPort,
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/voip/extensions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile resettare password",
        variant: "destructive",
      });
    },
  });

  const syncExtensionMutation = useMutation({
    mutationFn: async (extensionId: string) => {
      return apiRequest('POST', `/api/voip/extensions/${extensionId}/sync`, null);
    },
    onSuccess: () => {
      toast({
        title: "Sincronizzazione completata",
        description: "Extension sincronizzata con edgvoip",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/voip/extensions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore sincronizzazione",
        description: error.message || "Impossibile sincronizzare con edgvoip",
        variant: "destructive",
      });
    },
  });

  const deleteExtensionMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/voip/extensions/${id}`, null);
    },
    onSuccess: () => {
      toast({
        title: "Extension eliminata",
        description: "Extension rimossa con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/voip/extensions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile eliminare extension",
        variant: "destructive",
      });
    },
  });

  const handleSubmitExtension = (data: ExtensionFormValues) => {
    extensionMutation.mutate(data);
  };

  if (!visible) return null;

  return (
    <div className="mt-8 bg-white/90 backdrop-blur-xl rounded-xl border border-gray-200 shadow-lg p-6">
      <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Phone className="w-6 h-6 text-orange-500" />
          <div>
            <h2 className="text-xl font-semibold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
              Phone / VoIP Configuration
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Visualizza trunks SIP sincronizzati da edgvoip e gestisci extensions per il sistema telefonico enterprise
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="hover:bg-gray-100"
          data-testid="button-close-voip-config"
        >
          <X className="w-5 h-5 text-gray-500" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100/80 backdrop-blur-sm border border-gray-200">
          <TabsTrigger 
            value="dashboard" 
            data-testid="tab-dashboard" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-orange-600"
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger 
            value="trunks" 
            data-testid="tab-trunks" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-orange-600"
          >
            <Server className="w-4 h-4 mr-2" />
            Trunks (Read-Only)
          </TabsTrigger>
          <TabsTrigger 
            value="extensions" 
            data-testid="tab-extensions" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-purple-600"
          >
            <User className="w-4 h-4 mr-2" />
            Extensions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6 mt-6">
          {connectionLoading ? (
            <LoadingState />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200 backdrop-blur-sm" data-testid="card-trunks-stats">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Trunks Attivi</p>
                      <p className="text-3xl font-bold text-orange-600 mt-2">
                        {connectionStatus?.stats?.trunksActive || 0} / {connectionStatus?.stats?.trunksTotal || 0}
                      </p>
                    </div>
                    <Server className="w-12 h-12 text-orange-400/50" />
                  </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200 backdrop-blur-sm" data-testid="card-extensions-stats">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Extensions Configurate</p>
                      <p className="text-3xl font-bold text-purple-600 mt-2">
                        {connectionStatus?.stats?.extensionsTotal || 0}
                      </p>
                    </div>
                    <User className="w-12 h-12 text-purple-400/50" />
                  </div>
                </Card>
              </div>

              <Card className="p-6 bg-white/50 border-gray-200 backdrop-blur-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Server className="w-5 h-5 text-orange-500" />
                  Riepilogo Trunks (Tutti gli Store)
                </h3>
                {trunksLoading ? (
                  <LoadingState />
                ) : trunks.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">Nessun trunk configurato</p>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="font-semibold text-gray-700">Store</TableHead>
                            <TableHead className="font-semibold text-gray-700">Trunk Name</TableHead>
                            <TableHead className="font-semibold text-gray-700">Status</TableHead>
                            <TableHead className="font-semibold text-gray-700">AI Agent</TableHead>
                            <TableHead className="font-semibold text-gray-700 text-center">Extensions</TableHead>
                            <TableHead className="font-semibold text-gray-700">Sync Source</TableHead>
                            <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trunks.map((trunk: any) => (
                            <TableRow 
                              key={trunk.trunk.id} 
                              className="hover:bg-gray-50/50 transition-colors border-gray-200"
                              data-testid={`table-row-trunk-${trunk.trunk.id}`}
                            >
                              <TableCell className="font-medium text-gray-800">
                                {trunk.storeName || 'N/A'}
                              </TableCell>
                              <TableCell className="text-gray-700">
                                {trunk.trunk.name}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={trunk.trunk.status === 'active' ? 'default' : 'secondary'} 
                                  className={
                                    trunk.trunk.status === 'active' 
                                      ? 'bg-green-100 text-green-700 border-green-300' 
                                      : 'bg-red-100 text-red-700 border-red-300'
                                  }
                                >
                                  {trunk.trunk.status === 'active' ? (
                                    <><CheckCircle2 className="w-3 h-3 mr-1" /> Active</>
                                  ) : (
                                    <><XCircle className="w-3 h-3 mr-1" /> Inactive</>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant="secondary"
                                  className={
                                    trunk.trunk.aiAgentEnabled 
                                      ? 'bg-green-100 text-green-700 border-green-300' 
                                      : 'bg-gray-100 text-gray-600 border-gray-300'
                                  }
                                >
                                  {trunk.trunk.aiAgentEnabled ? (
                                    <><CheckCircle2 className="w-3 h-3 mr-1" /> Enabled</>
                                  ) : (
                                    <><XCircle className="w-3 h-3 mr-1" /> Disabled</>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center text-gray-700 font-medium">
                                {trunk.trunk.extensionsCount || 0}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                  {trunk.trunk.syncSource || 'edgvoip'}
                                </Badge>
                                {trunk.trunk.lastSyncAt && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(trunk.trunk.lastSyncAt).toLocaleDateString()}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setTrunkAIConfig(trunk.trunk);
                                    setShowTrunkAIConfig(true);
                                  }}
                                  data-testid={`button-config-ai-${trunk.trunk.id}`}
                                >
                                  <Bot className="h-4 w-4 mr-2" />
                                  Configure AI
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                      {trunks.map((trunk: any) => (
                        <div 
                          key={trunk.trunk.id} 
                          className="p-4 bg-gray-50/80 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                          data-testid={`card-trunk-mobile-${trunk.trunk.id}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-800 mb-1">{trunk.trunk.name}</h4>
                              <p className="text-sm text-gray-600">{trunk.storeName || 'N/A'}</p>
                            </div>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                              {trunk.trunk.syncSource || 'edgvoip'}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-2">
                            <Badge 
                              variant={trunk.trunk.status === 'active' ? 'default' : 'secondary'} 
                              className={
                                trunk.trunk.status === 'active' 
                                  ? 'bg-green-100 text-green-700 border-green-300' 
                                  : 'bg-red-100 text-red-700 border-red-300'
                              }
                            >
                              {trunk.trunk.status === 'active' ? (
                                <><CheckCircle2 className="w-3 h-3 mr-1" /> Active</>
                              ) : (
                                <><XCircle className="w-3 h-3 mr-1" /> Inactive</>
                              )}
                            </Badge>
                            <Badge 
                              variant="secondary"
                              className={
                                trunk.trunk.aiAgentEnabled 
                                  ? 'bg-green-100 text-green-700 border-green-300' 
                                  : 'bg-gray-100 text-gray-600 border-gray-300'
                              }
                            >
                              AI: {trunk.trunk.aiAgentEnabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Extensions:</span> {trunk.trunk.extensionsCount || 0}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Card>

              <Card className="p-6 bg-white/50 border-gray-200 backdrop-blur-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-500" />
                  Extensions
                </h3>
                {connectionStatus?.extensions?.length > 0 ? (
                  <div className="space-y-2">
                    {connectionStatus.extensions.map((ext: any) => (
                      <div key={ext.id} className="flex items-center justify-between p-3 bg-gray-50/80 rounded-lg border border-gray-200" data-testid={`extension-status-${ext.id}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-medium text-gray-800">Interno {ext.extension}</h4>
                            <Badge variant={ext.dbStatus === 'active' ? 'default' : 'secondary'} className={
                              ext.dbStatus === 'active' 
                                ? 'bg-blue-100 text-blue-700 border-blue-300' 
                                : ext.dbStatus === 'suspended'
                                ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                                : 'bg-gray-100 text-gray-700 border-gray-300'
                            }>
                              {ext.dbStatus === 'active' ? (
                                <><CheckCircle2 className="w-3 h-3 mr-1" /> Attivo</>
                              ) : ext.dbStatus === 'suspended' ? (
                                <><AlertCircle className="w-3 h-3 mr-1" /> Sospeso</>
                              ) : (
                                <><XCircle className="w-3 h-3 mr-1" /> Inattivo</>
                              )}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">{ext.displayName}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Nessuna extension configurata</p>
                )}
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="trunks" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">
                {trunks.length} trunk{trunks.length !== 1 ? 's' : ''} sincronizzati da edgvoip
              </p>
              <p className="text-xs text-gray-500 mt-1">
                I trunks sono gestiti centralmente da edgvoip PBX. Modifiche solo via webhook.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await queryClient.invalidateQueries({ queryKey: ['/api/voip/trunks'] });
                  toast({
                    title: "✅ Trunks aggiornati",
                    description: "Dati ricaricati dal database. I trunks vengono sincronizzati automaticamente da edgvoip via webhook.",
                  });
                }}
                disabled={trunksLoading}
                data-testid="button-refresh-trunks"
                className="hover:bg-gray-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${trunksLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Read-Only
              </Badge>
            </div>
          </div>

          {trunksLoading ? (
            <LoadingState />
          ) : trunks.length === 0 ? (
            <Card className="p-8 text-center bg-gray-50/50 border-gray-200">
              <Server className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Nessun trunk sincronizzato</p>
              <p className="text-sm text-gray-500 mt-2">
                I trunks verranno sincronizzati automaticamente da edgvoip via webhook
              </p>
            </Card>
          ) : (
            <>
              {/* Desktop Table View - Already rendered in dashboard section above */}
              {/* Mobile/Tablet Card View */}
              <div className="md:hidden space-y-3">{trunks.map((trunk: any) => (
                <Card key={trunk.trunk.id} className="p-4 bg-gray-50/80 rounded-lg border border-gray-200" data-testid={`card-trunk-mobile-${trunk.trunk.id}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 mb-1">{trunk.trunk.name}</h4>
                      <p className="text-sm text-gray-600">{trunk.storeName || 'N/A'}</p>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                      {trunk.trunk.syncSource || 'edgvoip'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge 
                      variant={trunk.trunk.status === 'active' ? 'default' : 'secondary'} 
                      className={
                        trunk.trunk.status === 'active' 
                          ? 'bg-green-100 text-green-700 border-green-300' 
                          : 'bg-red-100 text-red-700 border-red-300'
                      }
                    >
                      {trunk.trunk.status === 'active' ? (
                        <><CheckCircle2 className="w-3 h-3 mr-1" /> Active</>
                      ) : (
                        <><XCircle className="w-3 h-3 mr-1" /> Inactive</>
                      )}
                    </Badge>
                    <Badge 
                      variant="secondary"
                      className={
                        trunk.trunk.aiAgentEnabled 
                          ? 'bg-green-100 text-green-700 border-green-300' 
                          : 'bg-gray-100 text-gray-600 border-gray-300'
                      }
                    >
                      AI: {trunk.trunk.aiAgentEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Host:</span> {trunk.trunk.host}:{trunk.trunk.port}</p>
                    <p><span className="font-medium">Provider:</span> {trunk.trunk.provider || 'N/A'}</p>
                    <p><span className="font-medium">Extensions:</span> {trunk.trunk.extensionsCount || 0}</p>
                    {trunk.trunk.lastSyncAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Last sync: {new Date(trunk.trunk.lastSyncAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </Card>
              ))}</div>
              
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="font-semibold text-gray-700">Store</TableHead>
                      <TableHead className="font-semibold text-gray-700">Trunk Name</TableHead>
                      <TableHead className="font-semibold text-gray-700">Provider</TableHead>
                      <TableHead className="font-semibold text-gray-700">Host:Port</TableHead>
                      <TableHead className="font-semibold text-gray-700">Status</TableHead>
                      <TableHead className="font-semibold text-gray-700">AI Agent</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">Extensions</TableHead>
                      <TableHead className="font-semibold text-gray-700">Last Sync</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trunks.map((trunk: any) => (
                      <TableRow 
                        key={trunk.trunk.id} 
                        className="hover:bg-gray-50/50 transition-colors border-gray-200"
                        data-testid={`table-row-trunk-${trunk.trunk.id}`}
                      >
                        <TableCell className="font-medium text-gray-800">
                          {trunk.storeName || 'N/A'}
                        </TableCell>
                        <TableCell className="text-gray-700 font-medium">
                          {trunk.trunk.name}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {trunk.trunk.provider || 'N/A'}
                        </TableCell>
                        <TableCell className="text-gray-600 font-mono text-sm">
                          {trunk.trunk.host}:{trunk.trunk.port}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={trunk.trunk.status === 'active' ? 'default' : 'secondary'} 
                            className={
                              trunk.trunk.status === 'active' 
                                ? 'bg-green-100 text-green-700 border-green-300' 
                                : 'bg-red-100 text-red-700 border-red-300'
                            }
                          >
                            {trunk.trunk.status === 'active' ? (
                              <><CheckCircle2 className="w-3 h-3 mr-1" /> Active</>
                            ) : (
                              <><XCircle className="w-3 h-3 mr-1" /> Inactive</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary"
                            className={
                              trunk.trunk.aiAgentEnabled 
                                ? 'bg-green-100 text-green-700 border-green-300' 
                                : 'bg-gray-100 text-gray-600 border-gray-300'
                            }
                          >
                            {trunk.trunk.aiAgentEnabled ? (
                              <><CheckCircle2 className="w-3 h-3 mr-1" /> Enabled</>
                            ) : (
                              <><XCircle className="w-3 h-3 mr-1" /> Disabled</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-gray-700 font-medium">
                          {trunk.trunk.extensionsCount || 0}
                        </TableCell>
                        <TableCell>
                          {trunk.trunk.lastSyncAt && (
                            <p className="text-xs text-gray-500">
                              {new Date(trunk.trunk.lastSyncAt).toLocaleDateString('it-IT', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="extensions" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {extensions.length} extension{extensions.length !== 1 ? 's' : ''} configurate
            </p>
            <Button 
              onClick={() => {
                setShowExtensionForm(true);
                setEditingExtension(null);
                extensionForm.reset();
              }}
              data-testid="button-add-extension"
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Extension
            </Button>
          </div>

          {extensionsLoading ? (
            <LoadingState />
          ) : showExtensionForm ? (
            <Card className="p-6 bg-gray-50/50 border-gray-200">
              <Form {...extensionForm}>
                <form onSubmit={extensionForm.handleSubmit(handleSubmitExtension)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={extensionForm.control}
                      name="userId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Utente *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-extension-user" className="bg-white">
                                <SelectValue placeholder="Seleziona utente" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {users.map((user: any) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.firstName} {user.lastName} ({user.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={extensionForm.control}
                      name="extension"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Numero Interno *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="es: 100, 101, 200" data-testid="input-extension-number" className="bg-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={extensionForm.control}
                      name="sipUsername"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Username SIP *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="es: user100" data-testid="input-extension-sip-username" className="bg-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={extensionForm.control}
                      name="sipServer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">SIP Server</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder="es: demo.edgvoip.it" data-testid="input-extension-sip-server" className="bg-white" />
                          </FormControl>
                          <FormDescription className="text-xs text-gray-500">
                            Server SIP per la registrazione (default: sip.edgvoip.com)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Password SIP auto-generated info */}
                    <div className="col-span-2">
                      <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                        <div className="flex items-start gap-3">
                          <Key className="w-5 h-5 text-green-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-green-900">🔐 Password SIP Auto-Generata</h4>
                            <p className="text-sm text-green-700 mt-1">
                              Il sistema genererà automaticamente una password SIP sicura (20 caratteri) al salvataggio. 
                              La password verrà mostrata <strong>SOLO UNA VOLTA</strong> dopo la creazione.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <FormField
                      control={extensionForm.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Nome Visualizzato</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder="es: Mario Rossi" className="bg-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={extensionForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} value={field.value || ''} placeholder="utente@azienda.it" className="bg-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={extensionForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="suspended">Suspended</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={extensionForm.control}
                      name="voicemailEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-gray-700">Casella Vocale</FormLabel>
                            <FormDescription className="text-xs text-gray-500">
                              Abilita voicemail
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-voicemail-enabled"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={extensionForm.control}
                      name="recordingEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-gray-700">Registrazione</FormLabel>
                            <FormDescription className="text-xs text-gray-500">
                              Registrazione automatica
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-recording-enabled"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={extensionForm.control}
                      name="dndEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-gray-700">Do Not Disturb</FormLabel>
                            <FormDescription className="text-xs text-gray-500">
                              Non disturbare
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-dnd-enabled"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {extensionForm.watch('voicemailEnabled') && (
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <h3 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-purple-500" />
                        Configurazione Voicemail
                      </h3>
                      
                      <FormField
                        control={extensionForm.control}
                        name="voicemailEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">Email Notifiche Voicemail</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                {...field} 
                                value={field.value || ''} 
                                placeholder="notifiche@azienda.it" 
                                data-testid="input-voicemail-email"
                                className="bg-white"
                              />
                            </FormControl>
                            <FormDescription className="text-xs text-gray-500">
                              Email per ricevere notifiche dei messaggi in casella vocale
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={extensionMutation.isPending}
                      data-testid="button-save-extension"
                      className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white"
                    >
                      {extensionMutation.isPending ? 'Salvataggio...' : 'Salva Extension'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowExtensionForm(false);
                        setEditingExtension(null);
                        extensionForm.reset();
                      }}
                      data-testid="button-cancel-extension"
                    >
                      Annulla
                    </Button>
                  </div>
                </form>
              </Form>
            </Card>
          ) : (
            <div className="space-y-3">
              {extensions.length === 0 ? (
                <Card className="p-8 text-center bg-gray-50/50 border-gray-200">
                  <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">Nessuna extension configurata</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Aggiungi la tua prima extension per gli utenti
                  </p>
                </Card>
              ) : (
                extensions.map((ext: any) => (
                  <Card key={ext.extension.id} className="p-4 bg-white/50 border-gray-200" data-testid={`card-extension-${ext.extension.id}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-800">{ext.extension.extension}</h4>
                          <Badge variant={ext.extension.status === 'active' ? 'default' : 'secondary'} className={
                            ext.extension.status === 'active' 
                              ? 'bg-green-100 text-green-700 border-green-300' 
                              : 'bg-gray-100 text-gray-700 border-gray-300'
                          }>
                            {ext.extension.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>User: {ext.userName} ({ext.userEmail})</p>
                          <p>SIP: {ext.extension.sipUsername}@{ext.domainFqdn}</p>
                          <p>Display Name: {ext.extension.displayName || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              if (confirm('Generare nuova password SIP? La password attuale sarà invalidata.')) {
                                resetPasswordMutation.mutate(ext.extension.id);
                              }
                            }}
                            disabled={resetPasswordMutation.isPending}
                            data-testid={`button-reset-password-${ext.extension.id}`}
                            className="hover:bg-orange-50"
                            title="Reset Password SIP"
                          >
                            <Key className="w-4 h-4 text-orange-600" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => syncExtensionMutation.mutate(ext.extension.id)}
                            disabled={syncExtensionMutation.isPending}
                            data-testid={`button-sync-extension-${ext.extension.id}`}
                            className="hover:bg-blue-50"
                            title="Sync con edgvoip"
                          >
                            <RefreshCw className="w-4 h-4 text-blue-600" />
                          </Button>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              setEditingExtension(ext.extension.id);
                              setShowExtensionForm(true);
                              extensionForm.reset({
                                userId: ext.extension.userId,
                                extension: ext.extension.extension,
                                sipUsername: ext.extension.sipUsername,
                                displayName: ext.extension.displayName || '',
                                email: ext.extension.email || '',
                                voicemailEnabled: ext.extension.voicemailEnabled,
                                voicemailEmail: ext.extension.voicemailEmail || '',
                                recordingEnabled: ext.extension.recordingEnabled,
                                dndEnabled: ext.extension.dndEnabled,
                                status: ext.extension.status,
                              });
                            }}
                            data-testid={`button-edit-extension-${ext.extension.id}`}
                            className="hover:bg-gray-100"
                            title="Modifica extension"
                          >
                            <Pencil className="w-4 h-4 text-gray-600" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              if (confirm('Sei sicuro di voler eliminare questa extension?')) {
                                deleteExtensionMutation.mutate(ext.extension.id);
                              }
                            }}
                            data-testid={`button-delete-extension-${ext.extension.id}`}
                            className="hover:bg-red-50"
                            title="Elimina extension"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* SIP Credentials Dialog - Shows ONLY on creation/reset */}
      <Dialog open={!!sipCredentials} onOpenChange={() => setSipCredentials(null)}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Shield className="w-6 h-6 text-green-500" />
              Credenziali SIP - Extension {sipCredentials?.extension}
            </DialogTitle>
            <DialogDescription>
              <strong className="text-orange-600">⚠️ ATTENZIONE:</strong> La password SIP viene mostrata <strong>SOLO UNA VOLTA</strong>. 
              Salvala in un luogo sicuro prima di chiudere questa finestra!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Extension</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm font-mono bg-white px-3 py-2 rounded border flex-1">{sipCredentials?.extension}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(sipCredentials?.extension || '');
                        toast({ title: "Copiato!", description: "Extension copiata negli appunti" });
                      }}
                      data-testid="button-copy-extension"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Username SIP</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm font-mono bg-white px-3 py-2 rounded border flex-1">{sipCredentials?.sipUsername}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(sipCredentials?.sipUsername || '');
                        toast({ title: "Copiato!", description: "Username copiato negli appunti" });
                      }}
                      data-testid="button-copy-username"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-medium text-red-600 uppercase">🔑 Password SIP (Mostra SOLO ADESSO)</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm font-mono bg-red-50 text-red-700 px-3 py-2 rounded border border-red-300 flex-1 select-all">
                      {sipCredentials?.sipPassword}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(sipCredentials?.sipPassword || '');
                        toast({ 
                          title: "Password copiata!", 
                          description: "Salvala subito in un luogo sicuro",
                          variant: "default"
                        });
                      }}
                      data-testid="button-copy-password"
                      className="bg-red-100 hover:bg-red-200"
                    >
                      <Copy className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">SIP Server</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm font-mono bg-white px-3 py-2 rounded border flex-1">{sipCredentials?.sipServer}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(sipCredentials?.sipServer || '');
                        toast({ title: "Copiato!", description: "Server copiato negli appunti" });
                      }}
                      data-testid="button-copy-server"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Porta SIP</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm font-mono bg-white px-3 py-2 rounded border flex-1">{sipCredentials?.sipPort}</code>
                    {sipCredentials?.wsPort && (
                      <span className="text-xs text-gray-500">WebSocket: {sipCredentials.wsPort}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Come usare queste credenziali
              </h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Configura il tuo softphone con questi dati</li>
                <li>Il softphone nella dashboard si registrerà automaticamente</li>
                <li>La password è crittografata nel database (non recuperabile)</li>
                <li>Usa "Reset Password" se la dimentichi</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setSipCredentials(null)}
              className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white"
              data-testid="button-close-credentials"
            >
              Ho salvato le credenziali
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trunk AI Configuration Dialog */}
      <TrunkAIConfigDialog
        trunk={trunkAIConfig}
        extensions={extensions}
        open={showTrunkAIConfig}
        onOpenChange={setShowTrunkAIConfig}
      />
    </div>
  );
}
