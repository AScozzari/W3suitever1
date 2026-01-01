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
import { ChevronDown, ChevronRight, Info, Sparkles, Workflow, BookOpen, FileJson, AlertCircle, Wand2 } from 'lucide-react';
import { ActionBuilderTab } from '@/components/settings/ActionBuilderTab';

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
            <TabsTrigger value="builder" className="gap-2" data-testid="tab-action-builder">
              <Wand2 className="h-4 w-4" />
              Action Builder
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

          {/* Action Builder Tab */}
          <TabsContent value="builder" className="space-y-6">
            <ActionBuilderTab />
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
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});

  const toggleDept = (deptCode: string) => {
    setExpandedDepts(prev => ({ ...prev, [deptCode]: !prev[deptCode] }));
  };

  const toggleMutation = useMutation({
    mutationFn: ({ actionId, mcpExposed }: { actionId: string; mcpExposed: boolean }) => 
      apiRequest(`/api/mcp-gateway/tools/${actionId}`, { method: 'PATCH', body: { mcpExposed } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp-gateway/tools'] });
      toast({ title: 'Tool aggiornato', description: 'Visibilità MCP modificata' });
    }
  });

  const filteredActions = actions.filter(action => {
    const matchesSearch = searchQuery === '' || 
                          action.actionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          action.actionCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = departmentFilter === 'all' || action.departmentId === departmentFilter;
    return matchesSearch && matchesDept;
  });

  const allDepartments = Object.keys(DEPARTMENT_STYLES);
  
  const groupedByDepartment = allDepartments.reduce((acc, dept) => {
    acc[dept] = filteredActions.filter(a => a.departmentId === dept);
    return acc;
  }, {} as Record<string, ActionConfiguration[]>);

  const totalActions = actions.length;
  const exposedActions = actions.filter(a => a.mcpExposed).length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-[#FF6900]" />
                Catalogo Tools MCP
              </CardTitle>
              <CardDescription>
                Gestisci quali azioni sono esposte via MCP Gateway
              </CardDescription>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="px-3 py-1.5 rounded-lg bg-gray-100">
                <span className="text-gray-500">Totale:</span>
                <span className="ml-1 font-semibold text-gray-900">{totalActions}</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-green-50">
                <span className="text-green-600">Esposti:</span>
                <span className="ml-1 font-semibold text-green-700">{exposedActions}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <div className="space-y-2">
              {allDepartments.map(dept => {
                const style = DEPARTMENT_STYLES[dept] || { label: dept, color: '#666' };
                const deptActions = groupedByDepartment[dept] || [];
                const exposedCount = deptActions.filter(a => a.mcpExposed).length;
                const isExpanded = expandedDepts[dept];
                
                return (
                  <div key={dept} className="rounded-lg border border-gray-200 overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleDept(dept)}
                      data-testid={`dept-catalog-${dept}`}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${style.color}15` }}
                        >
                          <Zap className="h-5 w-5" style={{ color: style.color }} />
                        </div>
                        <span className="text-lg font-bold text-gray-900">{style.label}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-500">
                          <span className="font-medium text-gray-900">{deptActions.length}</span> azioni
                        </div>
                        <div className="text-sm">
                          <span className={`font-medium ${exposedCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            {exposedCount}
                          </span>
                          <span className="text-gray-400"> esposte</span>
                        </div>
                        {deptActions.length > 0 && (
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all"
                              style={{ width: `${(exposedCount / deptActions.length) * 100}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4 max-h-96 overflow-y-auto">
                        {deptActions.length === 0 ? (
                          <div className="text-center py-6 text-gray-500 text-sm">
                            Nessuna azione disponibile per questo dipartimento
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {deptActions.map(action => (
                              <div
                                key={action.id}
                                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                  action.mcpExposed 
                                    ? 'bg-green-50 border-green-200' 
                                    : 'bg-white border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">
                                    {action.actionCode}
                                  </code>
                                  <span className="text-sm font-medium text-gray-900">{action.actionName}</span>
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
                                <div className="flex items-center gap-3">
                                  <span className={`text-xs ${action.mcpExposed ? 'text-green-600' : 'text-gray-400'}`}>
                                    {action.mcpExposed ? 'Esposto' : 'Nascosto'}
                                  </span>
                                  <Switch
                                    checked={action.mcpExposed}
                                    onCheckedChange={(checked) => toggleMutation.mutate({ actionId: action.id, mcpExposed: checked })}
                                    disabled={toggleMutation.isPending}
                                    data-testid={`switch-tool-${action.actionCode}`}
                                  />
                                </div>
                              </div>
                            ))}
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
  const [localPermissions, setLocalPermissions] = useState<ToolPermission[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  
  const toggleDept = (deptCode: string) => {
    setExpandedDepts(prev => ({ ...prev, [deptCode]: !prev[deptCode] }));
  };
  
  const { data: keyPermissions = [], isLoading: loadingPermissions, refetch: refetchPermissions } = useQuery<ToolPermission[]>({
    queryKey: ['/api/mcp-gateway/keys', selectedKeyId, 'permissions'],
    queryFn: async () => {
      return await apiRequest(`/api/mcp-gateway/keys/${selectedKeyId}/permissions`);
    },
    enabled: !!selectedKeyId && isModalOpen,
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ keyId, permissions }: { keyId: string; permissions: ToolPermission[] }) => {
      await apiRequest(`/api/mcp-gateway/keys/${keyId}/permissions`, { method: 'PUT', body: { permissions } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp-gateway/keys', selectedKeyId, 'permissions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mcp-gateway/keys'] });
      toast({ title: 'Permessi salvati', description: 'Le modifiche sono state applicate con successo' });
      setIsModalOpen(false);
      setHasChanges(false);
    },
    onError: () => {
      toast({ title: 'Errore', description: 'Impossibile salvare i permessi', variant: 'destructive' });
    }
  });

  const openModal = (keyId: string) => {
    setSelectedKeyId(keyId);
    setIsModalOpen(true);
    setExpandedDepts({});
    setHasChanges(false);
  };

  const closeModal = () => {
    if (hasChanges) {
      if (!confirm('Hai modifiche non salvate. Vuoi chiudere senza salvare?')) return;
    }
    setIsModalOpen(false);
    setSelectedKeyId(null);
    setLocalPermissions([]);
    setHasChanges(false);
  };

  const handleSave = () => {
    if (!selectedKeyId) return;
    updatePermissionMutation.mutate({ keyId: selectedKeyId, permissions: localPermissions });
  };

  const toggleLocalPermission = (actionConfigId: string, currentlyEnabled: boolean) => {
    const existingPerm = localPermissions.find(p => p.actionConfigId === actionConfigId);
    const newPermissions = existingPerm
      ? localPermissions.map(p => 
          p.actionConfigId === actionConfigId ? { ...p, isEnabled: !currentlyEnabled } : p
        )
      : [...localPermissions, { actionConfigId, isEnabled: true, rateLimitOverride: null }];
    
    setLocalPermissions(newPermissions);
    setHasChanges(true);
  };

  // Sync server permissions to local state when modal opens
  if (isModalOpen && keyPermissions.length > 0 && localPermissions.length === 0 && !hasChanges) {
    setLocalPermissions([...keyPermissions]);
  }

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

  const selectedKey = activeKeys.find(k => k.id === selectedKeyId);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-[#FF6900]" />
            Gestione Permessi API Keys
          </CardTitle>
          <CardDescription>
            Clicca su una riga per configurare quali tools può utilizzare ogni API Key
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Nome</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead className="w-[150px]">API Key</TableHead>
                <TableHead className="w-[80px] text-center">Tools</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeKeys.map(key => (
                <TableRow 
                  key={key.id} 
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                  onClick={() => openModal(key.id)}
                  data-testid={`row-key-${key.id}`}
                >
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {key.description || '-'}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                      {key.keyPrefix}***
                    </code>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-semibold ${key.enabledTools > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {key.enabledTools}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#FF6900]" />
              Permessi Tool - {selectedKey?.name}
            </DialogTitle>
            <DialogDescription>
              Abilita o disabilita i singoli tools per questa API Key. Clicca su un dipartimento per espandere.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4">
            {loadingPermissions ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-2">
                {allDepartments.map(dept => {
                  const style = DEPARTMENT_STYLES[dept] || { label: dept, color: '#666' };
                  const deptActions = groupedByDepartment[dept] || [];
                  const enabledCount = deptActions.filter(a => {
                    const perm = localPermissions.find(p => p.actionConfigId === a.id);
                    return perm?.isEnabled;
                  }).length;
                  const isExpanded = expandedDepts[dept];
                  
                  return (
                    <div key={dept} className="rounded-lg border border-gray-200 overflow-hidden hover:border-[#FF6900]/50 transition-all group">
                      <div 
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-[#FF6900]/5 transition-colors"
                        onClick={() => toggleDept(dept)}
                        data-testid={`dept-row-${dept}`}
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-[#FF6900]" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-[#FF6900] transition-colors" />
                          )}
                          <span className="font-semibold text-gray-900">{style.label}</span>
                          <span className="text-xs text-gray-400 group-hover:text-[#FF6900] transition-colors">
                            clicca per espandere
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-gray-500">{deptActions.length} azioni</span>
                          <span className={`font-medium ${enabledCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            {enabledCount} attive
                          </span>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="border-t border-gray-200 bg-gray-50 p-3 max-h-60 overflow-y-auto">
                          {deptActions.length === 0 ? (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              Nessuna azione esposta
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {deptActions.map(action => {
                                const permission = localPermissions.find(p => p.actionConfigId === action.id);
                                const isEnabled = permission?.isEnabled ?? false;
                                return (
                                  <div
                                    key={action.id}
                                    className={`flex items-center justify-between p-2 rounded border transition-colors ${
                                      isEnabled 
                                        ? 'bg-green-50 border-green-200' 
                                        : 'bg-white border-gray-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 flex-1">
                                      <code className="text-xs font-mono text-gray-700">{action.actionCode}</code>
                                      <TooltipProvider delayDuration={100}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button className="text-gray-400 hover:text-[#FF6900] transition-colors">
                                              <Info className="h-3.5 w-3.5" />
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent side="right" className="max-w-sm p-3 bg-white shadow-lg border">
                                            <div className="space-y-2">
                                              <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-[#FF6900]" />
                                                <p className="font-semibold text-gray-900">{getActionDescription(action.actionCode).purpose}</p>
                                              </div>
                                              <p className="text-sm text-gray-600">
                                                {getActionDescription(action.actionCode).details}
                                              </p>
                                              <div className="pt-1 border-t border-gray-100">
                                                <p className="text-xs text-gray-400">
                                                  {action.flowType === 'workflow' 
                                                    ? '⚙️ Workflow approvazione'
                                                    : action.flowType === 'default'
                                                      ? '✅ Approvazione supervisore'
                                                      : '⚡ Esecuzione immediata'
                                                  }
                                                </p>
                                              </div>
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                    <Switch
                                      checked={isEnabled}
                                      onCheckedChange={() => toggleLocalPermission(action.id, isEnabled)}
                                      data-testid={`switch-perm-${action.actionCode}`}
                                    />
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
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={closeModal} data-testid="btn-cancel-permissions">
              Annulla
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || updatePermissionMutation.isPending}
              className="bg-[#FF6900] hover:bg-[#FF6900]/90"
              data-testid="btn-save-permissions"
            >
              {updatePermissionMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                'Salva modifiche'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
  const [activeSection, setActiveSection] = useState<'overview' | 'auth' | 'endpoints' | 'examples' | 'claude' | 'n8n' | 'zapier' | 'errors' | 'downloads'>('overview');
  
  const copyCode = (code: string, section: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const apiUrl = `${baseUrl}/api/mcp-public-gateway`;

  const downloadFile = (content: string, filename: string, type: string = 'application/json') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateOpenAPISpec = () => {
    const spec = {
      openapi: '3.0.0',
      info: {
        title: 'W3 Suite MCP Gateway API',
        version: '1.0.0',
        description: 'API per integrare W3 Suite con sistemi esterni via MCP Protocol'
      },
      servers: [{ url: apiUrl }],
      security: [{ bearerAuth: [] }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', description: 'API Key generata dal pannello MCP Gateway' }
        }
      },
      paths: {
        '/tools': {
          get: {
            summary: 'Lista tools disponibili',
            description: 'Restituisce tutti i tools abilitati per la tua API Key',
            responses: { '200': { description: 'Lista tools' } }
          }
        },
        '/actions/{actionCode}/execute': {
          post: {
            summary: 'Esegui azione',
            description: 'Esegue un\'azione specifica con i parametri forniti',
            parameters: [{ name: 'actionCode', in: 'path', required: true, schema: { type: 'string' } }],
            requestBody: {
              content: { 'application/json': { schema: { type: 'object', properties: { parameters: { type: 'object' } } } } }
            },
            responses: { '200': { description: 'Risultato esecuzione' }, '401': { description: 'Non autorizzato' }, '403': { description: 'Tool non abilitato' }, '429': { description: 'Rate limit superato' } }
          }
        }
      }
    };
    return JSON.stringify(spec, null, 2);
  };

  const generatePostmanCollection = () => {
    const collection = {
      info: { name: 'W3 Suite MCP Gateway', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
      auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{API_KEY}}', type: 'string' }] },
      variable: [{ key: 'API_KEY', value: 'sk_live_staging_xxxxxxxxxxxx' }, { key: 'BASE_URL', value: apiUrl }],
      item: [
        {
          name: 'Lista Tools',
          request: { method: 'GET', url: '{{BASE_URL}}/tools', header: [{ key: 'Authorization', value: 'Bearer {{API_KEY}}' }] }
        },
        {
          name: 'Esegui Azione',
          request: {
            method: 'POST',
            url: '{{BASE_URL}}/actions/CRM_CREATE_LEAD/execute',
            header: [{ key: 'Authorization', value: 'Bearer {{API_KEY}}' }, { key: 'Content-Type', value: 'application/json' }],
            body: { mode: 'raw', raw: JSON.stringify({ parameters: { name: 'Mario Rossi', email: 'mario@example.com' } }, null, 2) }
          }
        }
      ]
    };
    return JSON.stringify(collection, null, 2);
  };

  const generateClaudeDesktopConfig = () => {
    const config = {
      mcpServers: {
        'w3suite-gateway': {
          command: 'node',
          args: ['w3suite-mcp-proxy.js'],
          env: {
            W3SUITE_API_URL: apiUrl,
            W3SUITE_API_KEY: 'INSERISCI_LA_TUA_API_KEY_QUI'
          }
        }
      }
    };
    return JSON.stringify(config, null, 2);
  };

  const generateClaudeProxyScript = () => {
    return `#!/usr/bin/env node
/**
 * W3 Suite MCP Proxy per Claude Desktop
 * Questo script fa da bridge tra Claude Desktop e il tuo W3 Suite MCP Gateway
 * 
 * INSTALLAZIONE:
 * 1. Salva questo file come w3suite-mcp-proxy.js
 * 2. Copia il file claude_desktop_config.json nella cartella di Claude Desktop
 * 3. Modifica l'API Key nel file di configurazione
 * 4. Riavvia Claude Desktop
 */

const https = require('https');
const http = require('http');

const API_URL = process.env.W3SUITE_API_URL || '${apiUrl}';
const API_KEY = process.env.W3SUITE_API_KEY || '';

if (!API_KEY || API_KEY === 'INSERISCI_LA_TUA_API_KEY_QUI') {
  console.error('ERRORE: Devi configurare la tua API Key nel file claude_desktop_config.json');
  process.exit(1);
}

// MCP Server implementation
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });

async function callW3SuiteAPI(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      }
    };
    
    const protocol = url.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data });
        }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function handleRequest(request) {
  const { method, params, id } = request;
  
  try {
    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'W3 Suite MCP Gateway', version: '1.0.0' }
          }
        };
        
      case 'tools/list':
        const tools = await callW3SuiteAPI('/tools');
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: (tools.data || []).map(t => ({
              name: t.actionCode,
              description: t.actionName,
              inputSchema: { type: 'object', properties: { parameters: { type: 'object' } } }
            }))
          }
        };
        
      case 'tools/call':
        const { name, arguments: args } = params;
        const result = await callW3SuiteAPI(\`/actions/\${name}/execute\`, 'POST', args);
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
        };
        
      default:
        return { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } };
    }
  } catch (error) {
    return { jsonrpc: '2.0', id, error: { code: -32000, message: error.message } };
  }
}

rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);
    const response = await handleRequest(request);
    console.log(JSON.stringify(response));
  } catch (e) {
    console.log(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } }));
  }
});

console.error('W3 Suite MCP Proxy avviato. In attesa di comandi da Claude Desktop...');
`;
  };

  const curlExample = `# Lista tutti i tools disponibili
curl -X GET "${apiUrl}/tools" \\
  -H "Authorization: Bearer sk_live_staging_xxxxxxxxxxxx"

# Esegui un'azione CRM
curl -X POST "${apiUrl}/actions/CRM_CREATE_LEAD/execute" \\
  -H "Authorization: Bearer sk_live_staging_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "parameters": {
      "name": "Mario Rossi",
      "email": "mario@example.com",
      "phone": "+39 333 1234567",
      "source": "website"
    }
  }'`;

  const jsExample = `// JavaScript / Node.js
const API_KEY = 'sk_live_staging_xxxxxxxxxxxx';
const BASE_URL = '${apiUrl}';

// Lista tools disponibili
async function getTools() {
  const response = await fetch(\`\${BASE_URL}/tools\`, {
    headers: { 'Authorization': \`Bearer \${API_KEY}\` }
  });
  return response.json();
}

// Esegui un'azione
async function executeAction(actionCode, parameters) {
  const response = await fetch(\`\${BASE_URL}/actions/\${actionCode}/execute\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ parameters })
  });
  return response.json();
}

// Esempio: crea un lead CRM
const result = await executeAction('CRM_CREATE_LEAD', {
  name: 'Mario Rossi',
  email: 'mario@example.com'
});
console.log(result);`;

  const pythonExample = `# Python
import requests

API_KEY = 'sk_live_staging_xxxxxxxxxxxx'
BASE_URL = '${apiUrl}'
HEADERS = {'Authorization': f'Bearer {API_KEY}'}

# Lista tools disponibili
def get_tools():
    response = requests.get(f'{BASE_URL}/tools', headers=HEADERS)
    return response.json()

# Esegui un'azione
def execute_action(action_code: str, parameters: dict):
    response = requests.post(
        f'{BASE_URL}/actions/{action_code}/execute',
        headers={**HEADERS, 'Content-Type': 'application/json'},
        json={'parameters': parameters}
    )
    return response.json()

# Esempio: crea un lead CRM
result = execute_action('CRM_CREATE_LEAD', {
    'name': 'Mario Rossi',
    'email': 'mario@example.com'
})
print(result)`;

  const n8nWorkflow = `{
  "name": "W3 Suite MCP Integration",
  "nodes": [
    {
      "name": "W3 Suite API",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "${apiUrl}/actions/{{$json.actionCode}}/execute",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Content-Type", "value": "application/json" }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            { "name": "parameters", "value": "={{ $json.params }}" }
          ]
        }
      },
      "credentials": {
        "httpHeaderAuth": {
          "name": "W3 Suite API Key",
          "headerName": "Authorization",
          "headerValue": "Bearer sk_live_staging_xxxxxxxxxxxx"
        }
      }
    }
  ]
}`;

  const zapierConfig = `CONFIGURAZIONE ZAPIER - Webhook Personalizzato

1. Crea un nuovo Zap
2. Scegli "Webhooks by Zapier" come trigger o action
3. Seleziona "Custom Request"

CONFIGURAZIONE REQUEST:
━━━━━━━━━━━━━━━━━━━━━
Method: POST
URL: ${apiUrl}/actions/[ACTION_CODE]/execute

Headers:
  Authorization: Bearer sk_live_staging_xxxxxxxxxxxx
  Content-Type: application/json

Body (JSON):
{
  "parameters": {
    "campo1": "valore1",
    "campo2": "valore2"
  }
}

ESEMPI ACTION_CODE:
━━━━━━━━━━━━━━━━━━
- CRM_CREATE_LEAD
- WMS_PURCHASE
- POS_CREATE_ORDER
- HR_CREATE_EMPLOYEE`;

  const sections = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'auth', label: 'Autenticazione', icon: Shield },
    { id: 'endpoints', label: 'Endpoints', icon: Globe },
    { id: 'examples', label: 'Esempi Codice', icon: Code },
    { id: 'claude', label: 'Claude Desktop', icon: Sparkles },
    { id: 'n8n', label: 'n8n', icon: Workflow },
    { id: 'zapier', label: 'Zapier', icon: Zap },
    { id: 'errors', label: 'Errori', icon: AlertCircle },
    { id: 'downloads', label: 'Downloads', icon: Download }
  ];

  return (
    <div className="flex gap-6">
      {/* Sidebar Navigation */}
      <div className="w-48 flex-shrink-0">
        <nav className="sticky top-4 space-y-1">
          {sections.map(section => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as typeof activeSection)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                  activeSection === section.id 
                    ? 'bg-[#FF6900]/10 text-[#FF6900] font-medium' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                data-testid={`btn-section-${section.id}`}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-6">
        {/* Overview Section */}
        {activeSection === 'overview' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#FF6900]" />
                MCP Gateway - Overview
              </CardTitle>
              <CardDescription>
                Integra W3 Suite con sistemi esterni tramite API REST o protocollo MCP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold">REST API</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Chiamate HTTP standard. Perfetto per integrazioni custom, script, e automazioni.
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-gray-200 bg-gradient-to-br from-purple-50 to-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <span className="font-semibold">Claude Desktop</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Integrazione nativa con Claude AI. Permetti a Claude di eseguire azioni W3 Suite.
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-gray-200 bg-gradient-to-br from-orange-50 to-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Workflow className="h-5 w-5 text-orange-600" />
                    <span className="font-semibold">Automazioni</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Compatibile con n8n, Zapier, Make e altri strumenti di automazione.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[#FF6900]/5 border border-[#FF6900]/20">
                <h4 className="font-semibold text-gray-900 mb-2">Come funziona</h4>
                <ol className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#FF6900] text-white flex items-center justify-center text-xs font-bold">1</span>
                    <span><strong>Crea una API Key</strong> dalla tab "API Keys" con i permessi necessari</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#FF6900] text-white flex items-center justify-center text-xs font-bold">2</span>
                    <span><strong>Configura i permessi</strong> per abilitare solo i tools necessari</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#FF6900] text-white flex items-center justify-center text-xs font-bold">3</span>
                    <span><strong>Integra</strong> usando REST API, Claude Desktop, o altri strumenti</span>
                  </li>
                </ol>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#FF6900]">{actions.length}</div>
                  <div className="text-xs text-gray-500">Tools Esposti</div>
                </div>
                <div className="h-8 w-px bg-gray-200" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">REST + MCP</div>
                  <div className="text-xs text-gray-500">Protocolli</div>
                </div>
                <div className="h-8 w-px bg-gray-200" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">Multi-tenant</div>
                  <div className="text-xs text-gray-500">Isolamento</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Authentication Section */}
        {activeSection === 'auth' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#FF6900]" />
                Autenticazione
              </CardTitle>
              <CardDescription>
                Tutte le richieste richiedono autenticazione via Bearer Token
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-gray-900 text-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">Header richiesto</span>
                  <Button variant="ghost" size="sm" className="h-6 text-gray-400 hover:text-white" onClick={() => copyCode('Authorization: Bearer sk_live_staging_xxxxxxxxxxxx', 'auth')}>
                    {copiedSection === 'auth' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <code className="text-sm">Authorization: Bearer sk_live_staging_xxxxxxxxxxxx</code>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Formato API Key</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border border-gray-200">
                    <code className="text-sm text-green-600">sk_live_staging_...</code>
                    <p className="text-xs text-gray-500 mt-1">Chiave produzione per tenant "staging"</p>
                  </div>
                  <div className="p-3 rounded-lg border border-gray-200">
                    <code className="text-sm text-yellow-600">sk_test_staging_...</code>
                    <p className="text-xs text-gray-500 mt-1">Chiave di test (ambiente sandbox)</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Rate Limiting</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg border border-gray-200 text-center">
                    <div className="text-xl font-bold text-gray-900">60</div>
                    <div className="text-xs text-gray-500">richieste/minuto</div>
                  </div>
                  <div className="p-3 rounded-lg border border-gray-200 text-center">
                    <div className="text-xl font-bold text-gray-900">10.000</div>
                    <div className="text-xs text-gray-500">richieste/giorno</div>
                  </div>
                  <div className="p-3 rounded-lg border border-gray-200 text-center">
                    <div className="text-xl font-bold text-gray-900">IP Whitelist</div>
                    <div className="text-xs text-gray-500">opzionale</div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-yellow-800">Sicurezza</h5>
                    <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                      <li>• Non condividere mai la tua API Key in codice pubblico</li>
                      <li>• Usa variabili d'ambiente per memorizzare le chiavi</li>
                      <li>• Ruota le chiavi periodicamente dalla tab API Keys</li>
                      <li>• Abilita IP Whitelist per ambienti di produzione</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Endpoints Section */}
        {activeSection === 'endpoints' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-[#FF6900]" />
                API Endpoints
              </CardTitle>
              <CardDescription>
                Base URL: <code className="bg-gray-100 px-2 py-0.5 rounded text-sm">{apiUrl}</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-100 text-green-700">GET</Badge>
                  <code className="text-sm font-mono font-medium">/tools</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">Restituisce la lista di tutti i tools abilitati per la tua API Key</p>
                <div className="text-xs text-gray-500">
                  <strong>Response:</strong> <code>{'{ "data": [{ "actionCode": "...", "actionName": "...", "departmentId": "..." }] }'}</code>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-blue-100 text-blue-700">POST</Badge>
                  <code className="text-sm font-mono font-medium">/actions/:actionCode/execute</code>
                </div>
                <p className="text-sm text-gray-600 mb-3">Esegue un'azione specifica con i parametri forniti</p>
                <div className="space-y-2 text-xs">
                  <div><strong>Path param:</strong> <code>actionCode</code> - Codice dell'azione (es. CRM_CREATE_LEAD)</div>
                  <div><strong>Body:</strong> <code>{'{ "parameters": { ... } }'}</code></div>
                  <div><strong>Response:</strong> <code>{'{ "success": true, "data": { ... }, "executionTime": 123 }'}</code></div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-purple-100 text-purple-700">GET</Badge>
                  <code className="text-sm font-mono font-medium">/health</code>
                </div>
                <p className="text-sm text-gray-600">Verifica lo stato del gateway (non richiede autenticazione)</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Code Examples Section */}
        {activeSection === 'examples' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-[#FF6900]" />
                Esempi di Codice
              </CardTitle>
              <CardDescription>
                Copia e incolla questi esempi per iniziare rapidamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="curl">
                <TabsList className="mb-4">
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                  <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                </TabsList>

                <TabsContent value="curl">
                  <div className="relative">
                    <pre className="p-4 rounded-lg bg-gray-900 text-gray-100 text-sm overflow-x-auto max-h-96">
                      <code>{curlExample}</code>
                    </pre>
                    <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-gray-400 hover:text-white" onClick={() => copyCode(curlExample, 'curl')} data-testid="button-copy-curl">
                      {copiedSection === 'curl' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="javascript">
                  <div className="relative">
                    <pre className="p-4 rounded-lg bg-gray-900 text-gray-100 text-sm overflow-x-auto max-h-96">
                      <code>{jsExample}</code>
                    </pre>
                    <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-gray-400 hover:text-white" onClick={() => copyCode(jsExample, 'js')} data-testid="button-copy-js">
                      {copiedSection === 'js' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="python">
                  <div className="relative">
                    <pre className="p-4 rounded-lg bg-gray-900 text-gray-100 text-sm overflow-x-auto max-h-96">
                      <code>{pythonExample}</code>
                    </pre>
                    <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-gray-400 hover:text-white" onClick={() => copyCode(pythonExample, 'python')} data-testid="button-copy-python">
                      {copiedSection === 'python' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Claude Desktop Section */}
        {activeSection === 'claude' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#FF6900]" />
                  Integrazione Claude Desktop
                </CardTitle>
                <CardDescription>
                  Permetti a Claude AI di eseguire azioni W3 Suite direttamente dalla chat
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100">
                  <h4 className="font-semibold text-gray-900 mb-3">Guida passo-passo</h4>
                  <ol className="space-y-4">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#FF6900] text-white flex items-center justify-center text-sm font-bold">1</span>
                      <div>
                        <strong>Scarica i file</strong>
                        <p className="text-sm text-gray-600 mt-1">Clicca sui bottoni qui sotto per scaricare lo script proxy e il file di configurazione</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#FF6900] text-white flex items-center justify-center text-sm font-bold">2</span>
                      <div>
                        <strong>Trova la cartella di Claude Desktop</strong>
                        <p className="text-sm text-gray-600 mt-1">
                          <strong>Windows:</strong> <code className="bg-gray-100 px-1 rounded">%APPDATA%\Claude\</code><br />
                          <strong>macOS:</strong> <code className="bg-gray-100 px-1 rounded">~/Library/Application Support/Claude/</code>
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#FF6900] text-white flex items-center justify-center text-sm font-bold">3</span>
                      <div>
                        <strong>Copia i file nella cartella</strong>
                        <p className="text-sm text-gray-600 mt-1">Metti entrambi i file (<code>w3suite-mcp-proxy.js</code> e <code>claude_desktop_config.json</code>) nella cartella di Claude</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#FF6900] text-white flex items-center justify-center text-sm font-bold">4</span>
                      <div>
                        <strong>Inserisci la tua API Key</strong>
                        <p className="text-sm text-gray-600 mt-1">Apri <code>claude_desktop_config.json</code> e sostituisci <code>INSERISCI_LA_TUA_API_KEY_QUI</code> con la tua chiave</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#FF6900] text-white flex items-center justify-center text-sm font-bold">5</span>
                      <div>
                        <strong>Riavvia Claude Desktop</strong>
                        <p className="text-sm text-gray-600 mt-1">Chiudi completamente Claude Desktop e riaprilo. Il server MCP sarà caricato automaticamente.</p>
                      </div>
                    </li>
                  </ol>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => downloadFile(generateClaudeProxyScript(), 'w3suite-mcp-proxy.js', 'application/javascript')}
                    className="bg-[#FF6900] hover:bg-[#FF6900]/90"
                    data-testid="btn-download-claude-script"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Scarica w3suite-mcp-proxy.js
                  </Button>
                  <Button
                    onClick={() => downloadFile(generateClaudeDesktopConfig(), 'claude_desktop_config.json')}
                    variant="outline"
                    data-testid="btn-download-claude-config"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Scarica claude_desktop_config.json
                  </Button>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Anteprima configurazione</h4>
                  <div className="relative">
                    <pre className="p-4 rounded-lg bg-gray-900 text-gray-100 text-sm overflow-x-auto">
                      <code>{generateClaudeDesktopConfig()}</code>
                    </pre>
                    <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-gray-400 hover:text-white" onClick={() => copyCode(generateClaudeDesktopConfig(), 'claudeConfig')} data-testid="button-copy-claude-config">
                      {copiedSection === 'claudeConfig' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-semibold text-blue-800">Nota</h5>
                      <p className="text-sm text-blue-700 mt-1">
                        Lo script proxy richiede Node.js installato sul tuo computer. Se non lo hai, scaricalo da <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer" className="underline">nodejs.org</a>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* n8n Section */}
        {activeSection === 'n8n' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5 text-[#FF6900]" />
                Integrazione n8n
              </CardTitle>
              <CardDescription>
                Usa W3 Suite come nodo HTTP in n8n per automazioni avanzate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <h4 className="font-semibold mb-3">Configurazione credenziali</h4>
                <ol className="space-y-2 text-sm text-gray-600">
                  <li>1. In n8n, vai su <strong>Settings → Credentials</strong></li>
                  <li>2. Crea nuova credenziale di tipo <strong>Header Auth</strong></li>
                  <li>3. Nome header: <code className="bg-gray-100 px-1 rounded">Authorization</code></li>
                  <li>4. Valore: <code className="bg-gray-100 px-1 rounded">Bearer sk_live_staging_xxxxxxxxxxxx</code></li>
                </ol>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Esempio workflow</h4>
                  <Button variant="outline" size="sm" onClick={() => downloadFile(n8nWorkflow, 'w3suite-n8n-workflow.json')} data-testid="btn-download-n8n">
                    <Download className="h-4 w-4 mr-2" />
                    Scarica workflow
                  </Button>
                </div>
                <div className="relative">
                  <pre className="p-4 rounded-lg bg-gray-900 text-gray-100 text-sm overflow-x-auto max-h-80">
                    <code>{n8nWorkflow}</code>
                  </pre>
                  <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-gray-400 hover:text-white" onClick={() => copyCode(n8nWorkflow, 'n8n')} data-testid="button-copy-n8n">
                    {copiedSection === 'n8n' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Zapier Section */}
        {activeSection === 'zapier' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#FF6900]" />
                Integrazione Zapier
              </CardTitle>
              <CardDescription>
                Usa Webhooks by Zapier per connettere W3 Suite ai tuoi Zaps
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="relative">
                <pre className="p-4 rounded-lg bg-gray-900 text-gray-100 text-sm overflow-x-auto whitespace-pre-wrap">
                  <code>{zapierConfig}</code>
                </pre>
                <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-gray-400 hover:text-white" onClick={() => copyCode(zapierConfig, 'zapier')} data-testid="button-copy-zapier">
                  {copiedSection === 'zapier' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-yellow-800">Tip</h5>
                    <p className="text-sm text-yellow-700 mt-1">
                      Per vedere la lista completa degli ACTION_CODE disponibili, vai alla tab "Catalogo Tools" o usa l'endpoint GET /tools
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Errors Section */}
        {activeSection === 'errors' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-[#FF6900]" />
                Codici di Errore
              </CardTitle>
              <CardDescription>
                Riferimento completo per gestire gli errori API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Codice</TableHead>
                    <TableHead className="w-40">Nome</TableHead>
                    <TableHead>Descrizione</TableHead>
                    <TableHead className="w-48">Soluzione</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell><Badge className="bg-yellow-100 text-yellow-700">400</Badge></TableCell>
                    <TableCell className="font-medium">Bad Request</TableCell>
                    <TableCell className="text-sm text-gray-600">Parametri mancanti o non validi</TableCell>
                    <TableCell className="text-sm text-gray-500">Verifica il body della richiesta</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Badge className="bg-red-100 text-red-700">401</Badge></TableCell>
                    <TableCell className="font-medium">Unauthorized</TableCell>
                    <TableCell className="text-sm text-gray-600">API Key mancante o non valida</TableCell>
                    <TableCell className="text-sm text-gray-500">Verifica l'header Authorization</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Badge className="bg-red-100 text-red-700">403</Badge></TableCell>
                    <TableCell className="font-medium">Forbidden</TableCell>
                    <TableCell className="text-sm text-gray-600">Tool non abilitato per questa API Key</TableCell>
                    <TableCell className="text-sm text-gray-500">Abilita il tool dalla tab Permessi</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Badge className="bg-gray-100 text-gray-700">404</Badge></TableCell>
                    <TableCell className="font-medium">Not Found</TableCell>
                    <TableCell className="text-sm text-gray-600">Action code non esistente</TableCell>
                    <TableCell className="text-sm text-gray-500">Verifica il codice azione</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Badge className="bg-orange-100 text-orange-700">429</Badge></TableCell>
                    <TableCell className="font-medium">Rate Limited</TableCell>
                    <TableCell className="text-sm text-gray-600">Superato il limite di richieste</TableCell>
                    <TableCell className="text-sm text-gray-500">Attendi e riprova dopo</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Badge className="bg-red-100 text-red-700">500</Badge></TableCell>
                    <TableCell className="font-medium">Server Error</TableCell>
                    <TableCell className="text-sm text-gray-600">Errore interno del server</TableCell>
                    <TableCell className="text-sm text-gray-500">Contatta il supporto</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <div className="mt-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
                <h4 className="font-semibold mb-2">Formato risposta errore</h4>
                <pre className="text-sm bg-gray-900 text-gray-100 p-3 rounded-lg">
{`{
  "success": false,
  "error": {
    "code": "TOOL_NOT_ENABLED",
    "message": "Il tool CRM_CREATE_LEAD non è abilitato per questa API Key",
    "details": { ... }
  }
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Downloads Section */}
        {activeSection === 'downloads' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-[#FF6900]" />
                Downloads
              </CardTitle>
              <CardDescription>
                File pronti all'uso pre-configurati con il tuo endpoint
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-gray-200 hover:border-[#FF6900]/30 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <FileJson className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">OpenAPI Spec</h4>
                      <p className="text-xs text-gray-500">openapi.json</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Specifica OpenAPI 3.0 per generare client SDK</p>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => downloadFile(generateOpenAPISpec(), 'w3suite-openapi.json')} data-testid="btn-download-openapi">
                    <Download className="h-4 w-4 mr-2" />
                    Scarica OpenAPI
                  </Button>
                </div>

                <div className="p-4 rounded-lg border border-gray-200 hover:border-[#FF6900]/30 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <FileJson className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Postman Collection</h4>
                      <p className="text-xs text-gray-500">postman_collection.json</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Importa in Postman per testare subito le API</p>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => downloadFile(generatePostmanCollection(), 'w3suite-postman-collection.json')} data-testid="btn-download-postman">
                    <Download className="h-4 w-4 mr-2" />
                    Scarica Collection
                  </Button>
                </div>

                <div className="p-4 rounded-lg border border-gray-200 hover:border-[#FF6900]/30 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-purple-100">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Claude Desktop Config</h4>
                      <p className="text-xs text-gray-500">claude_desktop_config.json</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Configurazione per Claude Desktop MCP</p>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => downloadFile(generateClaudeDesktopConfig(), 'claude_desktop_config.json')} data-testid="btn-download-claude-config-2">
                    <Download className="h-4 w-4 mr-2" />
                    Scarica Config
                  </Button>
                </div>

                <div className="p-4 rounded-lg border border-gray-200 hover:border-[#FF6900]/30 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-green-100">
                      <Code className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">MCP Proxy Script</h4>
                      <p className="text-xs text-gray-500">w3suite-mcp-proxy.js</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Script Node.js per Claude Desktop</p>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => downloadFile(generateClaudeProxyScript(), 'w3suite-mcp-proxy.js', 'application/javascript')} data-testid="btn-download-proxy">
                    <Download className="h-4 w-4 mr-2" />
                    Scarica Proxy
                  </Button>
                </div>
              </div>

              {/* Tools List */}
              <div className="mt-6">
                <h4 className="font-semibold mb-3">Tools Esposti ({actions.length})</h4>
                <ScrollArea className="h-[200px] border rounded-lg">
                  <div className="p-4 space-y-2">
                    {actions.map(action => (
                      <div key={action.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{action.actionCode}</code>
                          <span className="text-sm text-gray-600">{action.actionName}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {getDepartmentStyle(action.departmentId).label}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
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
