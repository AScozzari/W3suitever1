import { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { LoadingState } from '@w3suite/frontend-kit/components/blocks';
import { useRequiredTenantId } from '@/hooks/useTenantSafety';
import { 
  Phone, 
  Plus,
  Pencil,
  Trash2,
  Server,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X
} from 'lucide-react';

interface PhoneVoIPConfigProps {
  visible: boolean;
  onClose: () => void;
}

const trunkFormSchema = z.object({
  name: z.string().min(1, "Nome trunk obbligatorio").max(255),
  storeId: z.string().uuid("Seleziona un negozio valido"),
  provider: z.string().optional(),
  host: z.string().min(1, "Host SIP obbligatorio"),
  port: z.number().int().min(1).max(65535).default(5060),
  protocol: z.enum(['udp', 'tcp', 'tls', 'wss']).default('udp'),
  username: z.string().optional(),
  password: z.string().optional(),
  authUsername: z.string().optional(),
  fromUser: z.string().optional(),
  fromDomain: z.string().optional(),
  codec: z.string().default('PCMU,PCMA,opus'),
  maxChannels: z.number().int().min(1).max(100).default(10),
  status: z.enum(['active', 'inactive', 'error']).default('active'),
  recordingEnabled: z.boolean().default(false),
  // AI Voice Agent Configuration
  aiAgentEnabled: z.boolean().default(false),
  aiAgentRef: z.string().optional(),
  aiTimePolicy: z.any().optional(), // JSON object for business hours
  aiFailoverExtension: z.string().optional(),
});

type TrunkFormValues = z.infer<typeof trunkFormSchema>;

const extensionFormSchema = z.object({
  userId: z.string().min(1, "Seleziona un utente"),
  extension: z.string().min(1, "Numero interno obbligatorio").max(20),
  sipUsername: z.string().min(1, "Username SIP obbligatorio").max(100),
  sipPassword: z.string().min(12, "Password deve essere almeno 12 caratteri"),
  displayName: z.string().optional(),
  email: z.string().email().optional(),
  voicemailEnabled: z.boolean().default(true),
  voicemailEmail: z.string().email().optional(),
  recordingEnabled: z.boolean().default(false),
  dndEnabled: z.boolean().default(false),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
});

type ExtensionFormValues = z.infer<typeof extensionFormSchema>;

export function PhoneVoIPConfig({ visible, onClose }: PhoneVoIPConfigProps) {
  const { toast } = useToast();
  const tenantId = useRequiredTenantId();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'trunks' | 'dids' | 'extensions'>('dashboard');
  const [editingTrunk, setEditingTrunk] = useState<string | null>(null);
  const [editingExtension, setEditingExtension] = useState<string | null>(null);
  const [showTrunkForm, setShowTrunkForm] = useState(false);
  const [showExtensionForm, setShowExtensionForm] = useState(false);

  const { data: trunksResponse, isLoading: trunksLoading } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['/api/voip/trunks'],
    enabled: visible,
  });
  const trunks = trunksResponse?.data || [];

  const { data: extensionsResponse, isLoading: extensionsLoading } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['/api/voip/extensions'],
    enabled: visible,
  });
  const extensions = extensionsResponse?.data || [];

  const { data: storesResponse } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['/api/stores'],
    enabled: visible,
  });
  const stores = storesResponse?.data || [];

  const { data: usersResponse } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['/api/users'],
    enabled: visible,
  });
  const users = usersResponse?.data || [];

  const { data: connectionStatus, isLoading: connectionLoading } = useQuery<any>({
    queryKey: ['/api/voip/connection-status'],
    enabled: visible && activeTab === 'dashboard',
    refetchInterval: 30000,
  });

  const trunkForm = useForm<TrunkFormValues>({
    resolver: zodResolver(trunkFormSchema),
    defaultValues: {
      port: 5060,
      protocol: 'udp',
      codec: 'PCMU,PCMA,opus',
      maxChannels: 10,
      status: 'active',
      recordingEnabled: false,
      aiAgentEnabled: false,
      aiAgentRef: '',
      aiTimePolicy: null,
      aiFailoverExtension: '',
    },
  });

  const extensionForm = useForm<ExtensionFormValues>({
    resolver: zodResolver(extensionFormSchema),
    defaultValues: {
      voicemailEnabled: true,
      recordingEnabled: false,
      dndEnabled: false,
      status: 'active',
    },
  });

  const trunkMutation = useMutation({
    mutationFn: async (data: TrunkFormValues) => {
      if (editingTrunk) {
        return apiRequest('PATCH', `/api/voip/trunks/${editingTrunk}`, data);
      }
      return apiRequest('POST', '/api/voip/trunks', data);
    },
    onSuccess: () => {
      toast({
        title: editingTrunk ? "Trunk aggiornato" : "Trunk creato",
        description: "Configurazione salvata con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/voip/trunks'] });
      setShowTrunkForm(false);
      setEditingTrunk(null);
      trunkForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile salvare trunk",
        variant: "destructive",
      });
    },
  });

  const extensionMutation = useMutation({
    mutationFn: async (data: ExtensionFormValues) => {
      if (editingExtension) {
        return apiRequest('PATCH', `/api/voip/extensions/${editingExtension}`, data);
      }
      return apiRequest('POST', '/api/voip/extensions', data);
    },
    onSuccess: () => {
      toast({
        title: editingExtension ? "Extension aggiornata" : "Extension creata",
        description: "Configurazione salvata con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/voip/extensions'] });
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

  const deleteTrunkMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/voip/trunks/${id}`, null);
    },
    onSuccess: () => {
      toast({
        title: "Trunk eliminato",
        description: "Trunk rimosso con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/voip/trunks'] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile eliminare trunk",
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

  const handleSubmitTrunk = (data: TrunkFormValues) => {
    trunkMutation.mutate(data);
  };

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
              Gestisci trunks SIP, DIDs e extensions per il sistema telefonico enterprise
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
        <TabsList className="grid w-full grid-cols-4 bg-gray-100/80 backdrop-blur-sm border border-gray-200">
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
            Trunks
          </TabsTrigger>
          <TabsTrigger 
            value="dids" 
            data-testid="tab-dids" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-orange-600"
          >
            <Phone className="w-4 h-4 mr-2" />
            DIDs
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
                      <p className="text-sm text-gray-600 font-medium">Extensions Registrate</p>
                      <p className="text-3xl font-bold text-purple-600 mt-2">
                        {connectionStatus?.stats?.extensionsRegistered || 0} / {connectionStatus?.stats?.extensionsTotal || 0}
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
                              <TableCell className="text-right">
                                <div className="flex gap-1 justify-end">
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingTrunk(trunk.trunk.id);
                                      setShowTrunkForm(true);
                                      setActiveTab('trunks');
                                      trunkForm.reset(trunk.trunk);
                                    }}
                                    data-testid={`button-edit-trunk-table-${trunk.trunk.id}`}
                                    className="h-8 w-8 p-0 hover:bg-gray-100"
                                    title="Modifica trunk"
                                  >
                                    <Pencil className="w-4 h-4 text-gray-600" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => {
                                      if (confirm('Sei sicuro di voler eliminare questo trunk?')) {
                                        deleteTrunkMutation.mutate(trunk.trunk.id);
                                      }
                                    }}
                                    data-testid={`button-delete-trunk-table-${trunk.trunk.id}`}
                                    className="h-8 w-8 p-0 hover:bg-red-50"
                                    title="Elimina trunk"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
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
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => {
                                  setEditingTrunk(trunk.trunk.id);
                                  setShowTrunkForm(true);
                                  setActiveTab('trunks');
                                  trunkForm.reset(trunk.trunk);
                                }}
                                className="h-8 w-8 p-0 hover:bg-white"
                              >
                                <Pencil className="w-4 h-4 text-gray-600" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => {
                                  if (confirm('Sei sicuro di voler eliminare questo trunk?')) {
                                    deleteTrunkMutation.mutate(trunk.trunk.id);
                                  }
                                }}
                                className="h-8 w-8 p-0 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
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
                            <Badge variant={ext.sipStatus === 'registered' ? 'default' : 'secondary'} className={
                              ext.sipStatus === 'registered' 
                                ? 'bg-green-100 text-green-700 border-green-300' 
                                : 'bg-gray-100 text-gray-700 border-gray-300'
                            }>
                              {ext.sipStatus === 'registered' ? (
                                <><CheckCircle2 className="w-3 h-3 mr-1" /> Registered</>
                              ) : (
                                <><XCircle className="w-3 h-3 mr-1" /> Unregistered</>
                              )}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">{ext.displayName}</div>
                        </div>
                        {ext.lastRegistered && (
                          <div className="text-xs text-gray-500">
                            Last registered: {new Date(ext.lastRegistered).toLocaleTimeString()}
                          </div>
                        )}
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

        <TabsContent value="dids" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Gestisci i numeri DID (Direct Inward Dialing)
            </p>
            <Button 
              onClick={() => toast({ title: "Coming soon", description: "DID management sarà disponibile a breve" })}
              data-testid="button-add-did"
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi DID
            </Button>
          </div>

          <Card className="p-8 text-center bg-gray-50/50 border-gray-200 backdrop-blur-sm">
            <Phone className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">DID management coming soon</p>
            <p className="text-sm text-gray-500 mt-2">
              Configura numeri telefonici in entrata per i tuoi store
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="trunks" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {trunks.length} trunk{trunks.length !== 1 ? 's' : ''} configurati
            </p>
            <Button 
              onClick={() => {
                setShowTrunkForm(true);
                setEditingTrunk(null);
                trunkForm.reset();
              }}
              data-testid="button-add-trunk"
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Trunk
            </Button>
          </div>

          {trunksLoading ? (
            <LoadingState />
          ) : showTrunkForm ? (
            <Card className="p-6 bg-gray-50/50 border-gray-200">
              <Form {...trunkForm}>
                <form onSubmit={trunkForm.handleSubmit(handleSubmitTrunk)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={trunkForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Nome Trunk *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="es: WindTre Main" data-testid="input-trunk-name" className="bg-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={trunkForm.control}
                      name="storeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Negozio *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-trunk-store" className="bg-white">
                                <SelectValue placeholder="Seleziona negozio" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {stores.map((store: any) => (
                                <SelectItem key={store.id} value={store.id}>
                                  {store.businessName || store.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={trunkForm.control}
                      name="provider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Provider SIP</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder="es: WindTre VoIP" className="bg-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={trunkForm.control}
                      name="host"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Host *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="sip.provider.com" data-testid="input-trunk-host" className="bg-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={trunkForm.control}
                      name="port"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Porta</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              value={field.value}
                              className="bg-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={trunkForm.control}
                      name="protocol"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Protocollo</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-white">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="udp">UDP</SelectItem>
                              <SelectItem value="tcp">TCP</SelectItem>
                              <SelectItem value="tls">TLS</SelectItem>
                              <SelectItem value="wss">WSS (WebRTC)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={trunkForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Username</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} className="bg-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={trunkForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} value={field.value || ''} className="bg-white" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={trunkForm.control}
                      name="maxChannels"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Max Canali</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              value={field.value}
                              className="bg-white"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={trunkForm.control}
                      name="recordingEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-gray-700">Registrazione chiamate</FormLabel>
                            <FormDescription className="text-xs text-gray-500">
                              Abilita registrazione automatica
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* AI Voice Agent Configuration Section */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h3 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-purple-500" />
                      AI Voice Agent Configuration
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={trunkForm.control}
                        name="aiAgentEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-purple-200 bg-purple-50/50 p-4 col-span-2">
                            <div className="space-y-0.5">
                              <FormLabel className="text-gray-800 font-semibold">Enable AI Voice Agent</FormLabel>
                              <FormDescription className="text-xs text-gray-600">
                                Attiva l'assistente vocale AI per gestire automaticamente le chiamate in entrata su questo trunk
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-ai-agent-enabled"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={trunkForm.control}
                        name="aiAgentRef"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">AI Agent Reference</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                value={field.value || ''} 
                                placeholder="es: customer-care-voice" 
                                className="bg-white"
                                data-testid="input-ai-agent-ref"
                                disabled={!trunkForm.watch('aiAgentEnabled')}
                              />
                            </FormControl>
                            <FormDescription className="text-xs text-gray-500">
                              Riferimento all'agente AI configurato in Brand Interface
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={trunkForm.control}
                        name="aiFailoverExtension"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700">Failover Extension</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                value={field.value || ''} 
                                placeholder="es: 100" 
                                className="bg-white"
                                data-testid="input-ai-failover-extension"
                                disabled={!trunkForm.watch('aiAgentEnabled')}
                              />
                            </FormControl>
                            <FormDescription className="text-xs text-gray-500">
                              Extension per trasferimento umano quando AI non può gestire la richiesta
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-gray-700">
                          <strong>Time Policy:</strong> Business hours e routing temporale saranno configurabili a breve. 
                          Per ora l'AI Voice Agent sarà attivo 24/7.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={trunkMutation.isPending}
                      data-testid="button-save-trunk"
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {trunkMutation.isPending ? 'Salvataggio...' : 'Salva Trunk'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowTrunkForm(false);
                        setEditingTrunk(null);
                        trunkForm.reset();
                      }}
                      data-testid="button-cancel-trunk"
                    >
                      Annulla
                    </Button>
                  </div>
                </form>
              </Form>
            </Card>
          ) : (
            <div className="space-y-3">
              {trunks.length === 0 ? (
                <Card className="p-8 text-center bg-gray-50/50 border-gray-200">
                  <Server className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">Nessun trunk configurato</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Aggiungi il tuo primo trunk SIP per iniziare
                  </p>
                </Card>
              ) : (
                trunks.map((trunk: any) => (
                  <Card key={trunk.trunk.id} className="p-4 bg-white/50 border-gray-200" data-testid={`card-trunk-${trunk.trunk.id}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-800">{trunk.trunk.name}</h4>
                          <Badge variant={trunk.trunk.status === 'active' ? 'default' : 'secondary'} className={
                            trunk.trunk.status === 'active' 
                              ? 'bg-green-100 text-green-700 border-green-300' 
                              : 'bg-gray-100 text-gray-700 border-gray-300'
                          }>
                            {trunk.trunk.status === 'active' ? (
                              <><CheckCircle2 className="w-3 h-3 mr-1" /> Attivo</>
                            ) : (
                              <><XCircle className="w-3 h-3 mr-1" /> Inattivo</>
                            )}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Store: {trunk.storeName}</p>
                          <p>Host: {trunk.trunk.host}:{trunk.trunk.port} ({trunk.trunk.protocol.toUpperCase()})</p>
                          <p>Provider: {trunk.trunk.provider || 'N/A'}</p>
                          <p>Canali: {trunk.trunk.currentChannels}/{trunk.trunk.maxChannels}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setEditingTrunk(trunk.trunk.id);
                            setShowTrunkForm(true);
                            trunkForm.reset(trunk.trunk);
                          }}
                          data-testid={`button-edit-trunk-${trunk.trunk.id}`}
                          className="hover:bg-gray-100"
                        >
                          <Pencil className="w-4 h-4 text-gray-600" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            if (confirm('Sei sicuro di voler eliminare questo trunk?')) {
                              deleteTrunkMutation.mutate(trunk.trunk.id);
                            }
                          }}
                          data-testid={`button-delete-trunk-${trunk.trunk.id}`}
                          className="hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
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
                                  {user.name} ({user.email})
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
                      name="sipPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700">Password SIP *</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input 
                                type="password" 
                                {...field} 
                                placeholder="Min 12 caratteri" 
                                data-testid="input-extension-sip-password" 
                                className="bg-white flex-1"
                              />
                            </FormControl>
                            <Button 
                              type="button" 
                              variant="outline"
                              onClick={() => {
                                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
                                const password = Array.from({ length: 16 }, () => 
                                  chars.charAt(Math.floor(Math.random() * chars.length))
                                ).join('');
                                field.onChange(password);
                                toast({
                                  title: "Password generata",
                                  description: "Password sicura generata automaticamente",
                                });
                              }}
                              data-testid="button-generate-password"
                              className="whitespace-nowrap"
                            >
                              Generate
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                      <div className="flex gap-2">
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
                              sipPassword: ext.extension.sipPassword,
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
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
