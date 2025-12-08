import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Settings,
  Package,
  Phone,
  Users,
  Target,
  Bell,
  Save,
  RotateCcw,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRightLeft,
  ShoppingCart,
  Undo2,
  Truck,
  AlertTriangle,
  Gift,
  Wrench,
  FileWarning,
  PackageX,
  ClipboardCheck,
  FileCheck,
  Shield,
  ChevronDown,
  ChevronUp,
  Workflow,
  Info
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';

const STAGING_TENANT_ID = '00000000-0000-0000-0000-000000000001';

interface MovementTypeConfig {
  id: string;
  tenant_id: string;
  movement_type: string;
  movement_direction: 'inbound' | 'outbound' | 'internal';
  label_it: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_enabled: boolean;
  requires_approval: boolean;
  workflow_template_id: string | null;
  required_documents: string[];
  display_order: number;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
}

const DEFAULT_MOVEMENT_TYPES: Omit<MovementTypeConfig, 'id' | 'tenant_id'>[] = [
  { movement_type: 'purchase', movement_direction: 'inbound', label_it: 'Acquisto', description: 'Merce ricevuta da fornitore', icon: 'Truck', color: '#10b981', is_enabled: true, requires_approval: false, workflow_template_id: null, required_documents: ['ddt', 'invoice'], display_order: 1 },
  { movement_type: 'customer_return', movement_direction: 'inbound', label_it: 'Reso Cliente', description: 'Prodotto restituito dal cliente', icon: 'Undo2', color: '#3b82f6', is_enabled: true, requires_approval: false, workflow_template_id: null, required_documents: ['return_form'], display_order: 2 },
  { movement_type: 'transfer_in', movement_direction: 'inbound', label_it: 'Trasferimento Entrata', description: 'Merce ricevuta da altro punto vendita', icon: 'ArrowDownToLine', color: '#8b5cf6', is_enabled: true, requires_approval: true, workflow_template_id: null, required_documents: ['ddt', 'transfer_note'], display_order: 3 },
  { movement_type: 'warranty_return', movement_direction: 'inbound', label_it: 'Rientro Garanzia', description: 'Prodotto rientrato da riparazione/garanzia', icon: 'Wrench', color: '#f59e0b', is_enabled: true, requires_approval: false, workflow_template_id: null, required_documents: ['warranty_certificate'], display_order: 4 },
  { movement_type: 'trade_in', movement_direction: 'inbound', label_it: 'Permuta (Trade-in)', description: 'Dispositivo usato acquisito dal cliente', icon: 'Gift', color: '#06b6d4', is_enabled: true, requires_approval: true, workflow_template_id: null, required_documents: ['tradein_form', 'photo'], display_order: 5 },
  
  { movement_type: 'sale', movement_direction: 'outbound', label_it: 'Vendita', description: 'Vendita al cliente finale', icon: 'ShoppingCart', color: '#22c55e', is_enabled: true, requires_approval: false, workflow_template_id: null, required_documents: ['receipt'], display_order: 10 },
  { movement_type: 'supplier_return', movement_direction: 'outbound', label_it: 'Reso a Fornitore', description: 'Merce restituita al fornitore', icon: 'Truck', color: '#ef4444', is_enabled: true, requires_approval: true, workflow_template_id: null, required_documents: ['ddt', 'credit_note'], display_order: 11 },
  { movement_type: 'transfer_out', movement_direction: 'outbound', label_it: 'Trasferimento Uscita', description: 'Merce inviata ad altro punto vendita', icon: 'ArrowUpFromLine', color: '#8b5cf6', is_enabled: true, requires_approval: true, workflow_template_id: null, required_documents: ['ddt', 'transfer_note'], display_order: 12 },
  { movement_type: 'doa', movement_direction: 'outbound', label_it: 'DOA (Dead on Arrival)', description: 'Prodotto difettoso alla consegna', icon: 'FileWarning', color: '#dc2626', is_enabled: true, requires_approval: true, workflow_template_id: null, required_documents: ['doa_report', 'photo'], display_order: 13 },
  { movement_type: 'pullback', movement_direction: 'outbound', label_it: 'Pullback', description: 'Ritiro merce per ordine sede/brand', icon: 'PackageX', color: '#9333ea', is_enabled: true, requires_approval: true, workflow_template_id: null, required_documents: ['ddt'], display_order: 14 },
  { movement_type: 'loan', movement_direction: 'outbound', label_it: 'Comodato d\'uso', description: 'Prodotto in prestito temporaneo', icon: 'ClipboardCheck', color: '#0ea5e9', is_enabled: true, requires_approval: true, workflow_template_id: null, required_documents: ['loan_contract'], display_order: 15 },
  
  { movement_type: 'adjustment', movement_direction: 'internal', label_it: 'Rettifica Inventario', description: 'Correzione quantità dopo inventario', icon: 'FileCheck', color: '#64748b', is_enabled: true, requires_approval: false, workflow_template_id: null, required_documents: ['adjustment_report'], display_order: 20 },
  { movement_type: 'damage', movement_direction: 'internal', label_it: 'Danneggiamento', description: 'Prodotto danneggiato in negozio', icon: 'AlertTriangle', color: '#f97316', is_enabled: true, requires_approval: false, workflow_template_id: null, required_documents: ['photo', 'adjustment_report'], display_order: 21 },
  { movement_type: 'demo', movement_direction: 'internal', label_it: 'Uso Demo', description: 'Prodotto destinato a esposizione', icon: 'Target', color: '#a855f7', is_enabled: true, requires_approval: false, workflow_template_id: null, required_documents: [], display_order: 22 },
  { movement_type: 'internal_use', movement_direction: 'internal', label_it: 'Uso Interno', description: 'Consumo interno aziendale', icon: 'Users', color: '#6366f1', is_enabled: true, requires_approval: true, workflow_template_id: null, required_documents: [], display_order: 23 },
];

const DIRECTION_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  inbound: { label: 'Entrata', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: ArrowDownToLine },
  outbound: { label: 'Uscita', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: ArrowUpFromLine },
  internal: { label: 'Interno', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: ArrowRightLeft },
};

const ICON_MAP: Record<string, any> = {
  Truck, Undo2, ArrowDownToLine, Wrench, Gift, ShoppingCart, ArrowUpFromLine,
  FileWarning, PackageX, ClipboardCheck, FileCheck, AlertTriangle, Target, Users
};

function getIcon(iconName: string | null) {
  if (!iconName) return Package;
  return ICON_MAP[iconName] || Package;
}

function WMSMovementsTab() {
  const { toast } = useToast();
  const [localConfigs, setLocalConfigs] = useState<MovementTypeConfig[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['inbound', 'outbound', 'internal']));

  const { data: configs, isLoading: configsLoading, refetch: refetchConfigs } = useQuery<MovementTypeConfig[]>({
    queryKey: ['/api/wms/movement-type-configs', STAGING_TENANT_ID],
  });

  const { data: workflows } = useQuery<WorkflowTemplate[]>({
    queryKey: ['/api/workflow-templates', STAGING_TENANT_ID],
  });

  useEffect(() => {
    if (configs && configs.length > 0) {
      setLocalConfigs(configs);
    } else if (!configsLoading) {
      const defaultWithIds = DEFAULT_MOVEMENT_TYPES.map((mt, idx) => ({
        ...mt,
        id: `temp-${idx}`,
        tenant_id: STAGING_TENANT_ID,
      }));
      setLocalConfigs(defaultWithIds);
    }
  }, [configs, configsLoading]);

  const saveMutation = useMutation({
    mutationFn: async (configsToSave: MovementTypeConfig[]) => {
      return apiRequest('POST', '/api/wms/movement-type-configs/bulk', {
        tenant_id: STAGING_TENANT_ID,
        configs: configsToSave,
      });
    },
    onSuccess: () => {
      toast({ title: 'Configurazione salvata', description: 'Le impostazioni dei movimenti sono state aggiornate.' });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/wms/movement-type-configs', STAGING_TENANT_ID] });
    },
    onError: (error: any) => {
      toast({ title: 'Errore', description: error.message || 'Impossibile salvare la configurazione.', variant: 'destructive' });
    },
  });

  const handleToggleEnabled = (movementType: string, enabled: boolean) => {
    setLocalConfigs(prev => prev.map(c => 
      c.movement_type === movementType ? { ...c, is_enabled: enabled } : c
    ));
    setHasChanges(true);
  };

  const handleToggleApproval = (movementType: string, requires: boolean) => {
    setLocalConfigs(prev => prev.map(c => 
      c.movement_type === movementType ? { ...c, requires_approval: requires } : c
    ));
    setHasChanges(true);
  };

  const handleWorkflowChange = (movementType: string, workflowId: string | null) => {
    setLocalConfigs(prev => prev.map(c => 
      c.movement_type === movementType ? { ...c, workflow_template_id: workflowId } : c
    ));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(localConfigs);
  };

  const handleReset = () => {
    if (configs) {
      setLocalConfigs(configs);
    }
    setHasChanges(false);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const groupedConfigs = {
    inbound: localConfigs.filter(c => c.movement_direction === 'inbound').sort((a, b) => a.display_order - b.display_order),
    outbound: localConfigs.filter(c => c.movement_direction === 'outbound').sort((a, b) => a.display_order - b.display_order),
    internal: localConfigs.filter(c => c.movement_direction === 'internal').sort((a, b) => a.display_order - b.display_order),
  };

  if (configsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Configurazione Tipi Movimento</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Abilita/disabilita tipi di movimento, configura approvazioni e collega workflow
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
              Modifiche non salvate
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleReset} disabled={!hasChanges}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Annulla
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || saveMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? 'Salvataggio...' : 'Salva'}
          </Button>
        </div>
      </div>

      {(['inbound', 'outbound', 'internal'] as const).map((direction) => {
        const dirInfo = DIRECTION_LABELS[direction];
        const DirIcon = dirInfo.icon;
        const items = groupedConfigs[direction];
        const isExpanded = expandedSections.has(direction);

        return (
          <Collapsible key={direction} open={isExpanded} onOpenChange={() => toggleSection(direction)}>
            <Card className="border border-gray-200 dark:border-gray-700">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="pb-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${direction === 'inbound' ? 'bg-green-100 dark:bg-green-900' : direction === 'outbound' ? 'bg-red-100 dark:bg-red-900' : 'bg-blue-100 dark:bg-blue-900'}`}>
                        <DirIcon className={`w-5 h-5 ${direction === 'inbound' ? 'text-green-600' : direction === 'outbound' ? 'text-red-600' : 'text-blue-600'}`} />
                      </div>
                      <div className="text-left">
                        <CardTitle className="text-base font-semibold">
                          Movimenti {dirInfo.label}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {items.filter(i => i.is_enabled).length}/{items.length} abilitati
                        </CardDescription>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {items.map((config) => {
                      const IconComponent = getIcon(config.icon);
                      return (
                        <div
                          key={config.movement_type}
                          className={`p-4 rounded-lg border transition-all ${
                            config.is_enabled 
                              ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' 
                              : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <div 
                                className="p-2 rounded-lg flex-shrink-0"
                                style={{ backgroundColor: `${config.color}20` }}
                              >
                                <IconComponent className="w-5 h-5" style={{ color: config.color || '#64748b' }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-gray-900 dark:text-white">{config.label_it}</span>
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {config.movement_type}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                  {config.description}
                                </p>
                                {config.required_documents && config.required_documents.length > 0 && (
                                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                                    <span className="text-[10px] text-gray-400">Doc:</span>
                                    {config.required_documents.map(doc => (
                                      <Badge key={doc} variant="outline" className="text-[10px] px-1 py-0">
                                        {doc}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                              <div className="flex flex-col items-center gap-1">
                                <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Abilitato</Label>
                                <Switch
                                  checked={config.is_enabled}
                                  onCheckedChange={(checked) => handleToggleEnabled(config.movement_type, checked)}
                                  data-testid={`switch-enabled-${config.movement_type}`}
                                />
                              </div>
                              
                              <div className="flex flex-col items-center gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Label className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1 cursor-help">
                                        Approvazione
                                        <Info className="w-3 h-3" />
                                      </Label>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs max-w-xs">Richiede approvazione prima di completare il movimento</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <Switch
                                  checked={config.requires_approval}
                                  onCheckedChange={(checked) => handleToggleApproval(config.movement_type, checked)}
                                  disabled={!config.is_enabled}
                                  data-testid={`switch-approval-${config.movement_type}`}
                                />
                              </div>
                              
                              <div className="flex flex-col gap-1 min-w-[180px]">
                                <Label className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                  <Workflow className="w-3 h-3" />
                                  Workflow Template
                                </Label>
                                <Select
                                  value={config.workflow_template_id || 'none'}
                                  onValueChange={(val) => handleWorkflowChange(config.movement_type, val === 'none' ? null : val)}
                                  disabled={!config.is_enabled || !config.requires_approval}
                                >
                                  <SelectTrigger className="h-8 text-xs" data-testid={`select-workflow-${config.movement_type}`}>
                                    <SelectValue placeholder="Nessun workflow" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Nessun workflow</SelectItem>
                                    {workflows?.map((wf) => (
                                      <SelectItem key={wf.id} value={wf.id}>
                                        {wf.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      <Card className="border-dashed border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <CardContent className="py-4">
          <div className="flex items-center gap-3 text-gray-500">
            <Shield className="w-5 h-5" />
            <div className="text-sm">
              <span className="font-medium">RBAC:</span> Solo gli utenti con ruolo <Badge variant="secondary">Amministratore</Badge> possono modificare queste impostazioni.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SystemConfigPage() {
  const [activeTab, setActiveTab] = useState('wms');

  return (
    <Layout
      module="settings"
      title="Configurazione Sistema"
      subtitle="Impostazioni avanzate per moduli e integrazioni"
      showModuleBar={false}
    >
      <div className="p-6 max-w-6xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <TabsTrigger 
              value="wms" 
              className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              data-testid="tab-wms"
            >
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">WMS</span>
            </TabsTrigger>
            <TabsTrigger 
              value="voip" 
              className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              data-testid="tab-voip"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">VoIP</span>
            </TabsTrigger>
            <TabsTrigger 
              value="hr" 
              className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              data-testid="tab-hr"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">HR</span>
            </TabsTrigger>
            <TabsTrigger 
              value="crm" 
              className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              data-testid="tab-crm"
            >
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">CRM</span>
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              data-testid="tab-notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifiche</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wms" className="mt-6">
            <WMSMovementsTab />
          </TabsContent>

          <TabsContent value="voip" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-green-600" />
                  Configurazione VoIP
                </CardTitle>
                <CardDescription>Impostazioni telefonia WebRTC e SIP</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-sm">Configurazione VoIP disponibile nella sezione Canali delle Impostazioni.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hr" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Configurazione HR
                </CardTitle>
                <CardDescription>Impostazioni risorse umane e gestione personale</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-sm">Configurazione HR in arrivo.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="crm" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Configurazione CRM
                </CardTitle>
                <CardDescription>Impostazioni pipeline, lead e campagne</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-sm">Configurazione CRM in arrivo.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-600" />
                  Configurazione Notifiche
                </CardTitle>
                <CardDescription>Canali, preferenze e regole di notifica</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-sm">Configurazione notifiche in arrivo.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
