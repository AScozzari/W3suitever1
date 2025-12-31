/**
 * 🔌 MCP ACTION GATEWAY - External Integration Manager
 * 
 * Manages API Keys, Tool permissions, and analytics for external integrations
 * (n8n, Claude AI, Zapier, custom integrations)
 * 
 * @author W3 Suite Team
 * @date 2025-12-31
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { 
  Key, 
  Plus, 
  Search,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  Clock,
  Activity,
  Code,
  FileText,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Server,
  Zap,
  ExternalLink,
  Download,
  Globe,
  Lock,
  Settings
} from 'lucide-react';
import { DEPARTMENT_STYLES, getDepartmentStyle } from '@/lib/constants/departments';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';

const ACTION_DESCRIPTIONS: Record<string, { purpose: string; details: string }> = {
  CRM_CREATE_LEAD: { 
    purpose: 'Crea un nuovo lead nel CRM',
    details: 'Inserisce un potenziale cliente con nome, email, telefono e fonte di acquisizione. Attiva notifica al team sales.'
  },
  CRM_UPDATE_LEAD: { 
    purpose: 'Aggiorna i dati di un lead',
    details: 'Modifica informazioni esistenti di un lead: contatti, stato, note, assegnazione agente.'
  },
  CRM_CONVERT_LEAD: { 
    purpose: 'Converte lead in opportunità',
    details: 'Trasforma un lead qualificato in opportunità commerciale, creando il record cliente associato.'
  },
  CRM_CREATE_DEAL: { 
    purpose: 'Crea una nuova trattativa',
    details: 'Registra una nuova opportunità di vendita con valore, prodotti interessati e probabilità di chiusura.'
  },
  CRM_UPDATE_DEAL: { 
    purpose: 'Aggiorna stato trattativa',
    details: 'Modifica fase pipeline, valore, scadenza o assegnazione di una trattativa esistente.'
  },
  CRM_CLOSE_DEAL: { 
    purpose: 'Chiude una trattativa',
    details: 'Segna come vinta o persa una trattativa, registrando motivo e note di chiusura.'
  },
  WMS_CREATE_MOVEMENT: { 
    purpose: 'Crea movimento magazzino',
    details: 'Registra entrata, uscita o trasferimento di prodotti tra ubicazioni con tracciabilità completa.'
  },
  WMS_UPDATE_STOCK: { 
    purpose: 'Aggiorna giacenza prodotto',
    details: 'Modifica la quantità disponibile di un prodotto in una specifica ubicazione.'
  },
  WMS_CREATE_SHIPMENT: { 
    purpose: 'Crea spedizione',
    details: 'Prepara una spedizione con prodotti, destinatario, corriere e tracking number.'
  },
  WMS_RECEIVE_GOODS: { 
    purpose: 'Riceve merce in entrata',
    details: 'Registra l\'arrivo di prodotti da fornitore con controllo qualità e allocazione a ubicazione.'
  },
  WMS_INVENTORY_CHECK: { 
    purpose: 'Controllo inventario',
    details: 'Avvia verifica giacenze fisiche vs sistema per una o più ubicazioni.'
  },
  POS_CREATE_SALE: { 
    purpose: 'Registra vendita',
    details: 'Crea transazione di vendita con prodotti, pagamento e generazione scontrino/fattura.'
  },
  POS_VOID_SALE: { 
    purpose: 'Annulla vendita',
    details: 'Storna una transazione di vendita precedente con gestione reso prodotti e rimborso.'
  },
  POS_APPLY_DISCOUNT: { 
    purpose: 'Applica sconto',
    details: 'Aggiunge sconto percentuale o fisso a una transazione in corso.'
  },
  POS_CLOSE_REGISTER: { 
    purpose: 'Chiusura cassa',
    details: 'Esegue chiusura giornaliera con conteggio contanti e riconciliazione transazioni.'
  },
  HR_CREATE_EMPLOYEE: { 
    purpose: 'Crea dipendente',
    details: 'Registra nuovo dipendente con dati anagrafici, contratto, reparto e credenziali accesso.'
  },
  HR_UPDATE_EMPLOYEE: { 
    purpose: 'Aggiorna dipendente',
    details: 'Modifica dati personali, ruolo, reparto o stato contrattuale di un dipendente.'
  },
  HR_REQUEST_LEAVE: { 
    purpose: 'Richiesta ferie/permesso',
    details: 'Invia richiesta di assenza con tipo, date e motivazione per approvazione supervisore.'
  },
  HR_APPROVE_LEAVE: { 
    purpose: 'Approva ferie/permesso',
    details: 'Autorizza o rifiuta una richiesta di assenza di un dipendente del team.'
  },
  HR_CLOCK_IN: { 
    purpose: 'Registra entrata',
    details: 'Timbra ingresso lavoro con orario, ubicazione e note opzionali.'
  },
  HR_CLOCK_OUT: { 
    purpose: 'Registra uscita',
    details: 'Timbra uscita lavoro con calcolo automatico ore lavorate.'
  },
  ANALYTICS_GENERATE_REPORT: { 
    purpose: 'Genera report',
    details: 'Crea report personalizzato con metriche selezionate, periodo e formato output.'
  },
  ANALYTICS_EXPORT_DATA: { 
    purpose: 'Esporta dati',
    details: 'Esporta dataset in formato CSV, Excel o JSON per analisi esterne.'
  },
  CMS_CREATE_CONTENT: { 
    purpose: 'Crea contenuto',
    details: 'Pubblica nuovo articolo, pagina o elemento multimediale nel CMS.'
  },
  CMS_UPDATE_CONTENT: { 
    purpose: 'Aggiorna contenuto',
    details: 'Modifica testo, immagini o metadati di un contenuto esistente.'
  },
  CMS_PUBLISH_CONTENT: { 
    purpose: 'Pubblica contenuto',
    details: 'Rende visibile al pubblico un contenuto in stato bozza.'
  },
  VOIP_MAKE_CALL: { 
    purpose: 'Avvia chiamata',
    details: 'Inizia chiamata VoIP verso numero destinatario con registrazione opzionale.'
  },
  VOIP_TRANSFER_CALL: { 
    purpose: 'Trasferisci chiamata',
    details: 'Inoltra chiamata in corso a altro operatore o reparto.'
  },
  VOIP_END_CALL: { 
    purpose: 'Termina chiamata',
    details: 'Chiude chiamata attiva con salvataggio durata e note.'
  },
  WORKFLOW_START: { 
    purpose: 'Avvia workflow',
    details: 'Inizia esecuzione di un flusso automatizzato con parametri specifici.'
  },
  WORKFLOW_APPROVE: { 
    purpose: 'Approva step workflow',
    details: 'Autorizza avanzamento di un workflow in attesa di approvazione.'
  },
  WORKFLOW_REJECT: { 
    purpose: 'Rifiuta step workflow',
    details: 'Blocca avanzamento workflow con motivazione del rifiuto.'
  },
  NOTIFICATION_SEND: { 
    purpose: 'Invia notifica',
    details: 'Spedisce notifica push, email o SMS a utenti selezionati.'
  },
  TASK_CREATE: { 
    purpose: 'Crea task',
    details: 'Assegna nuovo compito a utente con scadenza, priorità e descrizione.'
  },
  TASK_COMPLETE: { 
    purpose: 'Completa task',
    details: 'Segna un task come completato con note di chiusura.'
  },
};

const getActionDescription = (actionCode: string): { purpose: string; details: string } => {
  if (ACTION_DESCRIPTIONS[actionCode]) {
    return ACTION_DESCRIPTIONS[actionCode];
  }
  const parts = actionCode.split('_');
  const module = parts[0] || 'SYSTEM';
  const action = parts.slice(1).join(' ').toLowerCase();
  return {
    purpose: `${action || 'Azione'} ${module}`,
    details: `Esegue l'operazione ${actionCode} nel modulo ${module}. Contatta l'amministratore per dettagli specifici.`
  };
};

interface MCPApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  description?: string;
  allowedDepartments: string[];
  allowedIps: string[];
  rateLimitPerMinute: number;
  dailyQuota: number;
  totalCalls: number;
  enabledTools: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
  lastUsedAt?: string;
}

interface MCPToolPermission {
  apiKeyId: string;
  actionConfigId: string;
  canExecute: boolean;
  customParameters?: Record<string, any>;
}

interface MCPUsageLog {
  id: string;
  apiKeyId: string;
  actionCode: string;
  success: boolean;
  responseTime: number;
  errorMessage?: string;
  timestamp: string;
  ipAddress: string;
}

interface ActionConfiguration {
  id: string;
  actionCode: string;
  actionName: string;
  departmentId: string;
  flowType: 'none' | 'default' | 'workflow';
  isActive: boolean;
  mcpExposed: boolean;
}

interface GatewayStats {
  totalCalls: number;
  successRate: number;
  avgResponseTime: number;
  activeKeys: number;
  exposedTools: number;
  callsToday: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function MCPActionGatewayPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('keys');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [createKeyDialogOpen, setCreateKeyDialogOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const { data: apiKeys = [], isLoading: isLoadingKeys } = useQuery<MCPApiKey[]>({
    queryKey: ['/api/mcp-gateway/keys'],
  });

  const { data: actions = [], isLoading: isLoadingActions } = useQuery<ActionConfiguration[]>({
    queryKey: ['/api/mcp-gateway/tools'],
  });

  const { data: stats } = useQuery<GatewayStats>({
    queryKey: ['/api/mcp-gateway/stats'],
  });

  const { data: usageLogs = [] } = useQuery<MCPUsageLog[]>({
    queryKey: ['/api/mcp-gateway/usage-logs'],
  });

  const activeKeys = apiKeys.filter(k => k.isActive).length;
  const exposedTools = actions.filter(a => a.mcpExposed).length;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#FF6900]/10 to-[#7B2CBF]/10 border border-[#FF6900]/20">
                  <Server className="h-6 w-6 text-[#FF6900]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    MCP Action Gateway
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Esponi le azioni del tenant come tool per integrazioni esterne
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200">
                <Key className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">{activeKeys} API Keys</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200">
                <Zap className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">{exposedTools} Tools</span>
              </div>
              {stats && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-200">
                  <Activity className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">{stats.callsToday} calls today</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 bg-gray-100/80">
            <TabsTrigger value="keys" className="gap-2" data-testid="tab-api-keys">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="tools" className="gap-2" data-testid="tab-tools">
              <Code className="h-4 w-4" />
              Tools Catalog
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2" data-testid="tab-permissions">
              <Shield className="h-4 w-4" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-2" data-testid="tab-documentation">
              <FileText className="h-4 w-4" />
              Documentation
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2" data-testid="tab-analytics">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* API Keys Tab */}
          <TabsContent value="keys" className="space-y-6">
            <ApiKeysTab 
              apiKeys={apiKeys}
              isLoading={isLoadingKeys}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onCreateKey={() => setCreateKeyDialogOpen(true)}
              newApiKey={newApiKey}
              setNewApiKey={setNewApiKey}
            />
          </TabsContent>

          {/* Tools Catalog Tab */}
          <TabsContent value="tools" className="space-y-6">
            <ToolsCatalogTab 
              actions={actions}
              isLoading={isLoadingActions}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              departmentFilter={departmentFilter}
              setDepartmentFilter={setDepartmentFilter}
            />
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-6">
            <PermissionsMatrixTab 
              apiKeys={apiKeys}
              actions={actions}
            />
          </TabsContent>

          {/* Documentation Tab */}
          <TabsContent value="docs" className="space-y-6">
            <DocumentationTab actions={actions.filter(a => a.mcpExposed)} />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsTab 
              stats={stats}
              usageLogs={usageLogs}
              apiKeys={apiKeys}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create API Key Dialog */}
      <CreateApiKeyDialog 
        open={createKeyDialogOpen}
        onClose={() => setCreateKeyDialogOpen(false)}
        onKeyCreated={(key) => {
          setNewApiKey(key);
          queryClient.invalidateQueries({ queryKey: ['/api/mcp-gateway/keys'] });
        }}
      />
    </div>
  );
}

function ApiKeysTab({ 
  apiKeys, 
  isLoading, 
  searchQuery, 
  setSearchQuery,
  onCreateKey,
  newApiKey,
  setNewApiKey
}: {
  apiKeys: MCPApiKey[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onCreateKey: () => void;
  newApiKey: string | null;
  setNewApiKey: (key: string | null) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showKey, setShowKey] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (keyId: string) => apiRequest(`/api/mcp-gateway/keys/${keyId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp-gateway/keys'] });
      toast({ title: 'API Key eliminata', description: 'La chiave è stata revocata con successo' });
    }
  });

  const toggleMutation = useMutation({
    mutationFn: ({ keyId, isActive }: { keyId: string; isActive: boolean }) => 
      apiRequest(`/api/mcp-gateway/keys/${keyId}`, { method: 'PATCH', body: { isActive } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp-gateway/keys'] });
    }
  });

  const filteredKeys = apiKeys.filter(key =>
    key.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    key.keyPrefix.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiato!', description: 'API Key copiata negli appunti' });
  };

  return (
    <>
      {/* New Key Alert */}
      {newApiKey && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-amber-800">Salva questa chiave!</h4>
              <p className="text-sm text-amber-700 mt-1">
                Questa è l'unica volta che vedrai la chiave completa. Copiala ora.
              </p>
              <div className="mt-3 flex items-center gap-2 p-2 rounded-md bg-white border border-amber-300">
                <code className="flex-1 text-sm font-mono break-all">
                  {showKey ? newApiKey : '•'.repeat(40)}
                </code>
                <Button variant="ghost" size="sm" onClick={() => setShowKey(!showKey)}>
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(newApiKey)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3" 
                onClick={() => setNewApiKey(null)}
              >
                Ho salvato la chiave
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Cerca API keys..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-keys"
            />
          </div>
        </div>
        <Button 
          onClick={onCreateKey}
          className="bg-gradient-to-r from-[#FF6900] to-[#7B2CBF] text-white"
          data-testid="button-create-key"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuova API Key
        </Button>
      </div>

      {/* Keys Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : filteredKeys.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#FF6900]/10 to-[#7B2CBF]/10 mb-4">
            <Key className="h-8 w-8 text-[#FF6900]" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nessuna API Key
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Crea una API Key per permettere integrazioni esterne
          </p>
          <Button 
            className="bg-gradient-to-r from-[#FF6900] to-[#7B2CBF]"
            onClick={onCreateKey}
            data-testid="button-create-first-key"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crea API Key
          </Button>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Prefisso</TableHead>
                <TableHead>Dipartimenti</TableHead>
                <TableHead>Rate Limit</TableHead>
                <TableHead>Utilizzo</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Ultimo uso</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{key.name}</div>
                      {key.description && (
                        <div className="text-xs text-gray-500">{key.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">{key.keyPrefix}...</code>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(!key.allowedDepartments || key.allowedDepartments.length === 0) ? (
                        <Badge variant="outline" className="text-xs">Tutti</Badge>
                      ) : (
                        key.allowedDepartments.slice(0, 2).map(dept => {
                          const style = getDepartmentStyle(dept);
                          return (
                            <Badge key={dept} variant="outline" className="text-xs" style={{ borderColor: style.color, color: style.color }}>
                              {style.label}
                            </Badge>
                          );
                        })
                      )}
                      {(key.allowedDepartments?.length || 0) > 2 && (
                        <Badge variant="outline" className="text-xs">+{key.allowedDepartments!.length - 2}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {key.rateLimitPerMinute}/min
                    </div>
                    <div className="text-xs text-gray-500">
                      {key.dailyQuota}/day
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{key.totalCalls.toLocaleString()}</div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={key.isActive}
                      onCheckedChange={(checked) => toggleMutation.mutate({ keyId: key.id, isActive: checked })}
                      data-testid={`switch-key-${key.id}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-500">
                      {key.lastUsedAt ? format(new Date(key.lastUsedAt), 'dd/MM/yyyy HH:mm') : 'Mai'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(key.id)}
                      data-testid={`button-delete-key-${key.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}

function ToolsCatalogTab({
  actions,
  isLoading,
  searchQuery,
  setSearchQuery,
  departmentFilter,
  setDepartmentFilter
}: {
  actions: ActionConfiguration[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  departmentFilter: string;
  setDepartmentFilter: (d: string) => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggleMutation = useMutation({
    mutationFn: ({ actionId, mcpExposed }: { actionId: string; mcpExposed: boolean }) => 
      apiRequest(`/api/mcp-gateway/tools/${actionId}`, { method: 'PATCH', body: { mcpExposed } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp-gateway/tools'] });
      toast({ title: 'Tool aggiornato', description: 'Visibilità MCP modificata' });
    }
  });

  const filteredActions = actions.filter(action => {
    const matchesSearch = action.actionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          action.actionCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = departmentFilter === 'all' || action.departmentId === departmentFilter;
    return matchesSearch && matchesDept;
  });

  const groupedByDepartment = filteredActions.reduce((acc, action) => {
    const dept = action.departmentId || 'other';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(action);
    return acc;
  }, {} as Record<string, ActionConfiguration[]>);

  return (
    <>
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cerca azioni..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-tools"
          />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-48" data-testid="select-department-filter">
            <SelectValue placeholder="Tutti i dipartimenti" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i dipartimenti</SelectItem>
            {Object.entries(DEPARTMENT_STYLES).map(([key, style]) => (
              <SelectItem key={key} value={key}>{style.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {Object.entries(groupedByDepartment).map(([deptId, deptActions]) => {
            const style = getDepartmentStyle(deptId);
            return (
              <motion.div key={deptId} variants={itemVariants}>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${style.color}15` }}
                      >
                        <Zap className="h-5 w-5" style={{ color: style.color }} />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{style.label}</CardTitle>
                        <CardDescription>{deptActions.length} azioni disponibili</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {deptActions.map((action) => (
                        <div 
                          key={action.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                              {action.actionCode}
                            </code>
                            <span className="text-sm font-medium">{action.actionName}</span>
                            {action.flowType !== 'none' && (
                              <Badge variant="outline" className="text-xs">
                                {action.flowType === 'workflow' ? 'Workflow' : 'Approvazione'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500">
                              {action.mcpExposed ? 'Esposto' : 'Nascosto'}
                            </span>
                            <Switch
                              checked={action.mcpExposed}
                              onCheckedChange={(checked) => toggleMutation.mutate({ actionId: action.id, mcpExposed: checked })}
                              data-testid={`switch-tool-${action.actionCode}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </>
  );
}

function PermissionsMatrixTab({
  apiKeys,
  actions
}: {
  apiKeys: MCPApiKey[];
  actions: ActionConfiguration[];
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const exposedActions = actions.filter(a => a.mcpExposed);
  const activeKeys = apiKeys.filter(k => k.isActive);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
  
  const toggleDept = (deptCode: string) => {
    setExpandedDepts(prev => ({ ...prev, [deptCode]: !prev[deptCode] }));
  };
  
  const { data: keyPermissions = [], isLoading: loadingPermissions } = useQuery<ToolPermission[]>({
    queryKey: ['/api/mcp-gateway/keys', selectedKeyId, 'permissions'],
    queryFn: async () => {
      return await apiRequest(`/api/mcp-gateway/keys/${selectedKeyId}/permissions`);
    },
    enabled: !!selectedKeyId,
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ keyId, permissions }: { keyId: string; permissions: ToolPermission[] }) => {
      await apiRequest(`/api/mcp-gateway/keys/${keyId}/permissions`, { method: 'PUT', body: { permissions } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp-gateway/keys', selectedKeyId, 'permissions'] });
      toast({ title: 'Permessi aggiornati', description: 'Le modifiche sono state salvate' });
    },
    onError: () => {
      toast({ title: 'Errore', description: 'Impossibile salvare i permessi', variant: 'destructive' });
    }
  });

  const toggleToolPermission = (actionConfigId: string, currentlyEnabled: boolean) => {
    if (!selectedKeyId) return;
    
    const existingPerm = keyPermissions.find(p => p.actionConfigId === actionConfigId);
    const newPermissions = existingPerm
      ? keyPermissions.map(p => 
          p.actionConfigId === actionConfigId ? { ...p, isEnabled: !currentlyEnabled } : p
        )
      : [...keyPermissions, { actionConfigId, isEnabled: true, rateLimitOverride: null }];
    
    updatePermissionMutation.mutate({ keyId: selectedKeyId, permissions: newPermissions });
  };

  if (activeKeys.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#FF6900]/10 to-[#7B2CBF]/10 mb-4">
          <Shield className="h-8 w-8 text-[#FF6900]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Matrice Permessi
        </h3>
        <p className="text-sm text-gray-500">
          Crea almeno una API Key attiva dalla tab API Keys
        </p>
      </Card>
    );
  }

  const allDepartments = Object.keys(DEPARTMENT_STYLES);
  
  const groupedByDepartment = allDepartments.reduce((acc, dept) => {
    acc[dept] = exposedActions.filter(a => a.departmentId === dept);
    return acc;
  }, {} as Record<string, ActionConfiguration[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-[#FF6900]" />
            API Keys
          </CardTitle>
          <CardDescription>
            Seleziona una API Key per configurare i permessi sui tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Nome</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead className="w-[150px]">API Key</TableHead>
                <TableHead className="w-[100px]">Tools</TableHead>
                <TableHead className="w-[120px] text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeKeys.map(key => (
                <TableRow 
                  key={key.id} 
                  className={`cursor-pointer transition-colors ${selectedKeyId === key.id ? 'bg-[#FF6900]/5 border-l-2 border-l-[#FF6900]' : 'hover:bg-gray-50'}`}
                  onClick={() => setSelectedKeyId(key.id)}
                  data-testid={`row-key-${key.id}`}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {selectedKeyId === key.id && (
                        <div className="w-2 h-2 rounded-full bg-[#FF6900]" />
                      )}
                      {key.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {key.description || '-'}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                      {key.keyPrefix}***
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {key.enabledTools} abilitati
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={(e) => { e.stopPropagation(); setSelectedKeyId(key.id); }}
                              data-testid={`btn-config-${key.id}`}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Configura permessi</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedKeyId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#FF6900]" />
              Tool Catalog per "{activeKeys.find(k => k.id === selectedKeyId)?.name}"
            </CardTitle>
            <CardDescription>
              Clicca su un dipartimento per espandere e configurare i permessi dei singoli tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPermissions ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-2">
                {allDepartments.map(dept => {
                  const style = DEPARTMENT_STYLES[dept] || { label: dept, color: '#666' };
                  const deptActions = groupedByDepartment[dept] || [];
                  const enabledCount = deptActions.filter(a => {
                    const perm = keyPermissions.find(p => p.actionConfigId === a.id);
                    return perm?.isEnabled;
                  }).length;
                  const isExpanded = expandedDepts[dept];
                  
                  return (
                    <div key={dept} className="rounded-lg border border-gray-200 overflow-hidden">
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleDept(dept)}
                        data-testid={`dept-row-${dept}`}
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-gray-500 transition-transform" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-500 transition-transform" />
                          )}
                          <Badge style={{ backgroundColor: style.color }} className="text-white">
                            {style.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm text-gray-500">
                            <span className="font-medium text-gray-900">{deptActions.length}</span> azioni
                          </div>
                          <div className="text-sm">
                            <span className={`font-medium ${enabledCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                              {enabledCount}
                            </span>
                            <span className="text-gray-400"> attive</span>
                          </div>
                          {deptActions.length > 0 && (
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500 transition-all"
                                style={{ width: `${deptActions.length > 0 ? (enabledCount / deptActions.length) * 100 : 0}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="border-t border-gray-200 bg-gray-50 p-4 max-h-80 overflow-y-auto">
                          {deptActions.length === 0 ? (
                            <div className="text-center py-6 text-gray-500 text-sm">
                              Nessuna azione esposta per questo dipartimento
                            </div>
                          ) : (
                            <div className="grid gap-2">
                              {deptActions.map(action => {
                                const permission = keyPermissions.find(p => p.actionConfigId === action.id);
                                const isEnabled = permission?.isEnabled ?? false;
                                return (
                                  <div
                                    key={action.id}
                                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                      isEnabled 
                                        ? 'bg-green-50 border-green-200' 
                                        : 'bg-white border-gray-200 hover:border-gray-300'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <code className="text-sm font-mono text-gray-700">{action.actionCode}</code>
                                          <TooltipProvider delayDuration={100}>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <button className="text-gray-400 hover:text-[#FF6900] transition-colors p-0.5 rounded hover:bg-[#FF6900]/10">
                                                  <Info className="h-4 w-4" />
                                                </button>
                                              </TooltipTrigger>
                                              <TooltipContent side="right" className="max-w-sm p-3 bg-white shadow-lg border">
                                                <div className="space-y-2">
                                                  <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-[#FF6900]" />
                                                    <p className="font-semibold text-gray-900">{getActionDescription(action.actionCode).purpose}</p>
                                                  </div>
                                                  <p className="text-sm text-gray-600 leading-relaxed">
                                                    {getActionDescription(action.actionCode).details}
                                                  </p>
                                                  <div className="pt-1 border-t border-gray-100">
                                                    <p className="text-xs text-gray-400">
                                                      {action.flowType === 'workflow' 
                                                        ? '⚙️ Richiede workflow di approvazione'
                                                        : action.flowType === 'default'
                                                          ? '✅ Richiede approvazione supervisore'
                                                          : '⚡ Esecuzione immediata'
                                                      }
                                                    </p>
                                                  </div>
                                                </div>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                          {action.flowType !== 'none' && (
                                            <Badge variant="outline" className="text-xs">
                                              {action.flowType === 'workflow' ? 'Workflow' : 'Approvazione'}
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-sm text-gray-500 mt-0.5">{action.actionName}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className={`text-xs ${isEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                                        {isEnabled ? 'Abilitato' : 'Disabilitato'}
                                      </span>
                                      <Switch
                                        checked={isEnabled}
                                        onCheckedChange={() => toggleToolPermission(action.id, isEnabled)}
                                        disabled={updatePermissionMutation.isPending}
                                        data-testid={`switch-perm-${action.actionCode}`}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface ToolPermission {
  id?: string;
  actionConfigId: string;
  isEnabled: boolean;
  rateLimitOverride?: number | null;
}

function DocumentationTab({ actions }: { actions: ActionConfiguration[] }) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  
  const copyCode = (code: string, section: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const apiUrl = `${baseUrl}/api/mcp-public`;

  const curlExample = `curl -X POST "${apiUrl}/execute/CRM_CREATE_LEAD" \\
  -H "Authorization: Bearer sk_live_staging_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "parameters": {
      "name": "Mario Rossi",
      "email": "mario@example.com",
      "source": "website"
    }
  }'`;

  const n8nExample = `{
  "nodes": [
    {
      "name": "W3 Suite MCP",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "${apiUrl}/execute/{{$json.actionCode}}",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth",
        "options": {},
        "jsonParameters": true,
        "bodyParametersJson": "={{ JSON.stringify({ parameters: $json.params }) }}"
      }
    }
  ]
}`;

  const claudeConfig = `{
  "mcpServers": {
    "w3suite": {
      "url": "${apiUrl}/mcp",
      "apiKey": "sk_live_staging_xxxxxxxxxxxx"
    }
  }
}`;

  return (
    <div className="space-y-6">
      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#FF6900]" />
            Quick Start
          </CardTitle>
          <CardDescription>
            Integra W3 Suite con i tuoi sistemi esterni in pochi minuti
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-gray-200 hover:border-[#FF6900]/30 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-5 w-5 text-gray-600" />
                <span className="font-medium">REST API</span>
              </div>
              <p className="text-sm text-gray-500">
                Chiamate HTTP standard con autenticazione Bearer token
              </p>
            </div>
            <div className="p-4 rounded-lg border border-gray-200 hover:border-[#FF6900]/30 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Code className="h-5 w-5 text-gray-600" />
                <span className="font-medium">MCP Protocol</span>
              </div>
              <p className="text-sm text-gray-500">
                Compatibile con Claude AI e altri client MCP
              </p>
            </div>
            <div className="p-4 rounded-lg border border-gray-200 hover:border-[#FF6900]/30 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-gray-600" />
                <span className="font-medium">Webhooks</span>
              </div>
              <p className="text-sm text-gray-500">
                Notifiche push per eventi e risultati workflow
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>API Endpoints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-700">GET</Badge>
                <code className="text-sm font-mono">/api/mcp-public/tools</code>
              </div>
            </div>
            <p className="text-sm text-gray-600">Lista tutti i tools disponibili per la tua API key</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-700">POST</Badge>
                <code className="text-sm font-mono">/api/mcp-public/execute/:actionCode</code>
              </div>
            </div>
            <p className="text-sm text-gray-600">Esegui un'azione specifica con parametri</p>
          </div>
        </CardContent>
      </Card>

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Esempi di Integrazione</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="curl">
            <TabsList className="mb-4">
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="n8n">n8n</TabsTrigger>
              <TabsTrigger value="claude">Claude AI</TabsTrigger>
            </TabsList>

            <TabsContent value="curl">
              <div className="relative">
                <pre className="p-4 rounded-lg bg-gray-900 text-gray-100 text-sm overflow-x-auto">
                  <code>{curlExample}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 text-gray-400 hover:text-white"
                  onClick={() => copyCode(curlExample, 'curl')}
                  data-testid="button-copy-curl"
                >
                  {copiedSection === 'curl' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="n8n">
              <div className="relative">
                <pre className="p-4 rounded-lg bg-gray-900 text-gray-100 text-sm overflow-x-auto">
                  <code>{n8nExample}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 text-gray-400 hover:text-white"
                  onClick={() => copyCode(n8nExample, 'n8n')}
                  data-testid="button-copy-n8n"
                >
                  {copiedSection === 'n8n' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="claude">
              <div className="relative">
                <pre className="p-4 rounded-lg bg-gray-900 text-gray-100 text-sm overflow-x-auto">
                  <code>{claudeConfig}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 text-gray-400 hover:text-white"
                  onClick={() => copyCode(claudeConfig, 'claude')}
                  data-testid="button-copy-claude"
                >
                  {copiedSection === 'claude' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Available Tools */}
      <Card>
        <CardHeader>
          <CardTitle>Tools Disponibili ({actions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {actions.map(action => (
                <div key={action.id} className="p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <code className="text-sm font-mono font-medium">{action.actionCode}</code>
                      <p className="text-sm text-gray-500 mt-1">{action.actionName}</p>
                    </div>
                    <Badge variant="outline">
                      {getDepartmentStyle(action.departmentId).label}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function AnalyticsTab({
  stats,
  usageLogs,
  apiKeys
}: {
  stats?: GatewayStats;
  usageLogs: MCPUsageLog[];
  apiKeys: MCPApiKey[];
}) {
  const recentLogs = usageLogs.slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats?.totalCalls?.toLocaleString() || 0}</div>
              <div className="text-sm text-gray-500">Chiamate totali</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats?.successRate?.toFixed(1) || 0}%</div>
              <div className="text-sm text-gray-500">Success rate</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats?.avgResponseTime?.toFixed(0) || 0}ms</div>
              <div className="text-sm text-gray-500">Tempo medio</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100">
              <Zap className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats?.callsToday || 0}</div>
              <div className="text-sm text-gray-500">Chiamate oggi</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Attività Recente</CardTitle>
          <CardDescription>Ultime 20 chiamate API</CardDescription>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nessuna attività registrata
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Tempo</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLogs.map((log) => {
                  const apiKey = apiKeys.find(k => k.id === log.apiKeyId);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.timestamp), 'dd/MM HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {apiKey?.keyPrefix || log.apiKeyId.slice(0, 8)}...
                        </code>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">{log.actionCode}</code>
                      </TableCell>
                      <TableCell>
                        {log.success ? (
                          <Badge className="bg-green-100 text-green-700">OK</Badge>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge className="bg-red-100 text-red-700">Error</Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{log.errorMessage}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {log.responseTime}ms
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {log.ipAddress}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreateApiKeyDialog({
  open,
  onClose,
  onKeyCreated
}: {
  open: boolean;
  onClose: () => void;
  onKeyCreated: (key: string) => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState('60');
  const [dailyQuota, setDailyQuota] = useState('10000');
  const [ipRestrictionEnabled, setIpRestrictionEnabled] = useState(false);
  const [allowedIps, setAllowedIps] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: 'Errore', description: 'Il nome è obbligatorio', variant: 'destructive' });
      return;
    }

    if (ipRestrictionEnabled && !allowedIps.trim()) {
      toast({ title: 'Errore', description: 'Inserisci almeno un indirizzo IP', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await apiRequest('/api/mcp-gateway/keys', {
        method: 'POST',
        body: {
          name: name.trim(),
          description: description.trim() || undefined,
          rateLimitPerMinute: parseInt(rateLimitPerMinute),
          dailyQuota: parseInt(dailyQuota),
          ipRestrictionEnabled,
          allowedIps: ipRestrictionEnabled ? allowedIps.split('\n').filter(ip => ip.trim()) : []
        }
      });

      onKeyCreated(data.apiKey);
      onClose();
      setName('');
      setDescription('');
      setRateLimitPerMinute('60');
      setDailyQuota('10000');
      setIpRestrictionEnabled(false);
      setAllowedIps('');
    } catch (error: any) {
      toast({ 
        title: 'Errore', 
        description: error.message || 'Impossibile creare la API key', 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuova API Key</DialogTitle>
          <DialogDescription>
            Crea una nuova chiave per integrazioni esterne. Dopo la creazione, potrai abilitare i singoli tool dalla tab Permessi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. n8n Production"
              data-testid="input-key-name"
            />
          </div>

          <div>
            <Label htmlFor="description">Descrizione</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="es. Automazioni workflow HR"
              data-testid="input-key-description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rateLimit">Rate limit/min</Label>
              <Input
                id="rateLimit"
                type="number"
                value={rateLimitPerMinute}
                onChange={(e) => setRateLimitPerMinute(e.target.value)}
                data-testid="input-rate-limit"
              />
            </div>
            <div>
              <Label htmlFor="dailyQuota">Quota giornaliera</Label>
              <Input
                id="dailyQuota"
                type="number"
                value={dailyQuota}
                onChange={(e) => setDailyQuota(e.target.value)}
                data-testid="input-daily-quota"
              />
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ipRestriction" className="text-sm font-medium">
                  Limita accesso a IP specifici
                </Label>
                <p className="text-xs text-gray-500">
                  Se disattivo, la chiave funziona da qualsiasi IP
                </p>
              </div>
              <Switch
                id="ipRestriction"
                checked={ipRestrictionEnabled}
                onCheckedChange={setIpRestrictionEnabled}
                data-testid="switch-ip-restriction"
              />
            </div>
            
            {ipRestrictionEnabled && (
              <div>
                <Label htmlFor="allowedIps">IP Whitelist (uno per riga)</Label>
                <Textarea
                  id="allowedIps"
                  value={allowedIps}
                  onChange={(e) => setAllowedIps(e.target.value)}
                  placeholder="192.168.1.1&#10;10.0.0.0/24&#10;203.0.113.50"
                  rows={3}
                  className="mt-1"
                  data-testid="textarea-ip-whitelist"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Inserisci gli IP dei tuoi server n8n, Zapier o altre automazioni
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-[#FF6900] to-[#7B2CBF]"
            data-testid="button-submit-key"
          >
            {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Crea API Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
