import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
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
  Info,
  FileText,
  Hash,
  Calendar,
  RotateCw
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
  category: string;
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

  // Fetch WMS-specific workflow templates (category: wms, approval, or null)
  const { data: workflowsResponse } = useQuery<{ success: boolean; data: WorkflowTemplate[] }>({
    queryKey: ['/api/wms/workflow-templates'],
  });
  
  const workflows = workflowsResponse?.data || [];

  useEffect(() => {
    if (!configsLoading) {
      // Merge database configs with defaults - show ALL 15 types
      const dbConfigMap = new Map((configs || []).map(c => [c.movement_type, c]));
      
      const mergedConfigs = DEFAULT_MOVEMENT_TYPES.map((defaultType, idx) => {
        const dbConfig = dbConfigMap.get(defaultType.movement_type);
        if (dbConfig) {
          // Use database config if exists
          return dbConfig;
        } else {
          // Use default with temp ID (not yet saved)
          return {
            ...defaultType,
            id: `temp-${idx}`,
            tenant_id: STAGING_TENANT_ID,
          };
        }
      });
      
      setLocalConfigs(mergedConfigs);
    }
  }, [configs, configsLoading]);

  const saveMutation = useMutation({
    mutationFn: async (configsToSave: MovementTypeConfig[]) => {
      return apiRequest('/api/wms/movement-type-configs/bulk', {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: STAGING_TENANT_ID,
          configs: configsToSave,
        }),
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
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Label className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1 cursor-help">
                                        <Workflow className="w-3 h-3" />
                                        Workflow Template
                                        <Info className="w-3 h-3" />
                                      </Label>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                      <p className="text-xs">Solo workflow della categoria <strong>Operations</strong> sono disponibili per i movimenti WMS</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <Select
                                  value={config.workflow_template_id || 'none'}
                                  onValueChange={(val) => handleWorkflowChange(config.movement_type, val === 'none' ? null : val)}
                                  disabled={!config.is_enabled || !config.requires_approval}
                                >
                                  <SelectTrigger className="h-8 text-xs" data-testid={`select-workflow-${config.movement_type}`}>
                                    <SelectValue placeholder="Nessun workflow" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Nessun workflow (logica base)</SelectItem>
                                    {workflows.map((wf) => (
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

      <Separator className="my-6" />

      <WMSDocumentNumberingSection />
    </div>
  );
}

interface DocumentNumberingConfigLegacy {
  id?: string;
  tenantId?: string;
  documentType: string;
  template?: string;
  paddingLength?: number;
  resetAnnually?: boolean;
  currentCounter?: number;
  lastResetYear?: number;
}

interface DocumentNumberingConfig {
  id?: string;
  tenantId?: string;
  documentType: string;
  numberingMode: 'numeric' | 'alphanumeric';
  startNumber: number;
  startLetter: string;
  currentNumber: number;
  currentLetter: string;
  paddingLength: number;
  dateFormat: 'none' | 'day' | 'day_month' | 'day_month_year';
  prefix: string;
  separator: string;
  resetAnnually: boolean;
}

function parseLegacyConfig(legacy: DocumentNumberingConfigLegacy, defaultPrefix: string): DocumentNumberingConfig {
  const template = legacy.template || '';
  let prefix = defaultPrefix;
  let dateFormat: DocumentNumberingConfig['dateFormat'] = 'none';
  let separator = '-';
  let numberingMode: 'numeric' | 'alphanumeric' = 'numeric';
  let startLetter = 'A';
  
  const hasDay = template.includes('{DD}');
  const hasMonth = template.includes('{MM}');
  const hasYear = template.includes('{YYYY}') || template.includes('{YY}');
  
  if (hasDay && hasMonth && hasYear) {
    dateFormat = 'day_month_year';
  } else if (hasDay && hasMonth) {
    dateFormat = 'day_month';
  } else if (hasDay) {
    dateFormat = 'day';
  } else if (hasYear) {
    dateFormat = 'day_month_year';
  }
  
  const prefixMatch = template.match(/^([A-Z]+)/);
  if (prefixMatch) {
    prefix = prefixMatch[1];
  }
  
  if (template.includes('/')) separator = '/';
  else if (template.includes('-')) separator = '-';
  else if (template.includes('.')) separator = '.';
  else if (template.includes('_')) separator = '_';
  else separator = 'none';
  
  const letterMatch = template.match(/\{N\}([A-Z])/);
  if (letterMatch) {
    numberingMode = 'alphanumeric';
    startLetter = letterMatch[1];
  }
  
  return {
    id: legacy.id,
    tenantId: legacy.tenantId,
    documentType: legacy.documentType,
    numberingMode,
    startNumber: legacy.currentCounter || 1,
    startLetter,
    currentNumber: legacy.currentCounter || 1,
    currentLetter: startLetter,
    paddingLength: legacy.paddingLength || 4,
    dateFormat,
    prefix,
    separator,
    resetAnnually: legacy.resetAnnually ?? true
  };
}

function configToLegacy(config: DocumentNumberingConfig): DocumentNumberingConfigLegacy {
  const parts: string[] = [];
  
  if (config.prefix) {
    parts.push(config.prefix);
  }
  
  if (config.dateFormat === 'day_month_year') {
    parts.push('{YYYY}');
  }
  
  if (config.numberingMode === 'alphanumeric') {
    parts.push(`{N}${config.startLetter}`);
  } else {
    parts.push('{N}');
  }
  
  const actualSeparator = config.separator === 'none' ? '' : config.separator;
  return {
    id: config.id,
    tenantId: config.tenantId,
    documentType: config.documentType,
    template: parts.join(actualSeparator),
    paddingLength: config.paddingLength,
    resetAnnually: config.resetAnnually,
    currentCounter: config.currentNumber
  };
}

interface OrderApprovalConfig {
  id?: string;
  requiresApproval: boolean;
  thresholdAmount: number | null;
  thresholdQuantity: number | null;
  approverRoles: string[];
  notifyOnCreate: boolean;
  notifyOnApproval: boolean;
}

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'order', label: 'Ordine a Fornitore', icon: ClipboardCheck, defaultPrefix: 'ORD' },
  { value: 'ddt', label: 'DDT', icon: Truck, defaultPrefix: 'DDT' },
  { value: 'adjustment_report', label: 'Rapporto Rettifica', icon: FileCheck, defaultPrefix: 'RET' },
  { value: 'invoice', label: 'Fattura', icon: FileText, defaultPrefix: 'FT' },
  { value: 'credit_note', label: 'Nota di Credito', icon: FileText, defaultPrefix: 'NC' },
  { value: 'debit_note', label: 'Nota di Debito', icon: FileText, defaultPrefix: 'ND' },
];

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function WMSDocumentNumberingSection() {
  const { toast } = useToast();
  const [editingType, setEditingType] = useState<string | null>(null);
  const [localConfigs, setLocalConfigs] = useState<Record<string, DocumentNumberingConfig>>({});
  const [orderApprovalConfig, setOrderApprovalConfig] = useState<OrderApprovalConfig>({
    requiresApproval: false,
    thresholdAmount: null,
    thresholdQuantity: null,
    approverRoles: [],
    notifyOnCreate: true,
    notifyOnApproval: true
  });

  const { data: numberingConfigsLegacy, isLoading: numberingLoading } = useQuery<DocumentNumberingConfigLegacy[]>({
    queryKey: ['/api/wms/documents/numbering-config'],
  });

  const { data: approvalConfig, isLoading: approvalLoading } = useQuery<OrderApprovalConfig>({
    queryKey: ['/api/wms/documents/order-approval-config'],
  });

  useEffect(() => {
    if (approvalConfig) {
      setOrderApprovalConfig(approvalConfig);
    }
  }, [approvalConfig]);

  useEffect(() => {
    const configMap: Record<string, DocumentNumberingConfig> = {};
    
    if (numberingConfigsLegacy && numberingConfigsLegacy.length > 0) {
      numberingConfigsLegacy.forEach(legacy => {
        const docOpt = DOCUMENT_TYPE_OPTIONS.find(o => o.value === legacy.documentType);
        configMap[legacy.documentType] = parseLegacyConfig(legacy, docOpt?.defaultPrefix || legacy.documentType.toUpperCase());
      });
    }
    
    DOCUMENT_TYPE_OPTIONS.forEach(opt => {
      if (!configMap[opt.value]) {
        configMap[opt.value] = {
          documentType: opt.value,
          numberingMode: 'numeric',
          startNumber: 1,
          startLetter: 'A',
          currentNumber: 1,
          currentLetter: 'A',
          paddingLength: 4,
          dateFormat: 'none',
          prefix: opt.defaultPrefix,
          separator: '-',
          resetAnnually: true
        };
      }
    });
    
    setLocalConfigs(configMap);
  }, [numberingConfigsLegacy]);

  const saveNumberingMutation = useMutation({
    mutationFn: async (config: DocumentNumberingConfig) => {
      const legacyPayload = configToLegacy(config);
      return apiRequest('/api/wms/documents/numbering-config', {
        method: 'POST',
        body: JSON.stringify(legacyPayload),
      });
    },
    onSuccess: () => {
      toast({ title: 'Configurazione salvata', description: 'Numerazione documento aggiornata.' });
      queryClient.invalidateQueries({ queryKey: ['/api/wms/documents/numbering-config'] });
      setEditingType(null);
    },
    onError: () => {
      toast({ title: 'Errore', description: 'Impossibile salvare la configurazione.', variant: 'destructive' });
    }
  });

  const saveApprovalMutation = useMutation({
    mutationFn: async (config: OrderApprovalConfig) => {
      return apiRequest('/api/wms/documents/order-approval-config', {
        method: 'POST',
        body: JSON.stringify(config),
      });
    },
    onSuccess: () => {
      toast({ title: 'Configurazione salvata', description: 'Approvazione ordini aggiornata.' });
      queryClient.invalidateQueries({ queryKey: ['/api/wms/documents/order-approval-config'] });
    },
    onError: () => {
      toast({ title: 'Errore', description: 'Impossibile salvare la configurazione.', variant: 'destructive' });
    }
  });

  const handleConfigChange = (docType: string, field: keyof DocumentNumberingConfig, value: any) => {
    setLocalConfigs(prev => ({
      ...prev,
      [docType]: {
        ...prev[docType],
        [field]: value
      }
    }));
  };

  const generatePreview = (config: DocumentNumberingConfig) => {
    const now = new Date();
    const parts: string[] = [];
    
    if (config.prefix) {
      parts.push(config.prefix);
    }
    
    if (config.dateFormat !== 'none') {
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear());
      
      if (config.dateFormat === 'day') {
        parts.push(day);
      } else if (config.dateFormat === 'day_month') {
        parts.push(`${day}/${month}`);
      } else if (config.dateFormat === 'day_month_year') {
        parts.push(`${day}/${month}/${year}`);
      }
    }
    
    const num = String(config.startNumber).padStart(config.paddingLength, '0');
    if (config.numberingMode === 'alphanumeric') {
      parts.push(`${num}${config.startLetter}`);
    } else {
      parts.push(num);
    }
    
    const actualSeparator = config.separator === 'none' ? '' : config.separator;
    return parts.join(actualSeparator);
  };

  if (numberingLoading || approvalLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-blue-600" />
            Numerazione Documenti
          </CardTitle>
          <CardDescription>
            Configura il formato di numerazione per ogni tipo di documento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {DOCUMENT_TYPE_OPTIONS.map((docType) => {
              const config = localConfigs[docType.value];
              if (!config) return null;
              const isEditing = editingType === docType.value;
              const Icon = docType.icon;

              return (
                <div 
                  key={docType.value}
                  className={`p-4 rounded-lg border transition-all ${isEditing ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-950/30 shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                        <Icon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{docType.label}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="font-mono text-xs bg-white dark:bg-gray-800">
                            {generatePreview(config)}
                          </Badge>
                          <span className="text-[10px] text-gray-400">
                            {config.numberingMode === 'alphanumeric' ? 'Alfanumerico' : 'Numerico'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant={isEditing ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEditingType(isEditing ? null : docType.value)}
                      data-testid={`btn-edit-numbering-${docType.value}`}
                    >
                      {isEditing ? 'Chiudi' : 'Modifica'}
                    </Button>
                  </div>

                  {isEditing && (
                    <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800 space-y-5">
                      <div className="p-3 rounded-lg bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Anteprima</p>
                        <p className="text-xl font-mono font-bold text-blue-700 dark:text-blue-300">
                          {generatePreview(config)}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">1</div>
                            <Label className="text-xs font-semibold">Tipo Numerazione</Label>
                          </div>
                          <div className="space-y-2">
                            <div 
                              className={`p-2 rounded border cursor-pointer transition-all ${config.numberingMode === 'numeric' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                              onClick={() => handleConfigChange(docType.value, 'numberingMode', 'numeric')}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full border-2 ${config.numberingMode === 'numeric' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`} />
                                <span className="text-xs font-medium">Solo numeri</span>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1 ml-5">Es: 001, 002, 003...</p>
                            </div>
                            <div 
                              className={`p-2 rounded border cursor-pointer transition-all ${config.numberingMode === 'alphanumeric' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                              onClick={() => handleConfigChange(docType.value, 'numberingMode', 'alphanumeric')}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full border-2 ${config.numberingMode === 'alphanumeric' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`} />
                                <span className="text-xs font-medium">Numeri + Lettere</span>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1 ml-5">Es: 001A, 001B... 002A</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">2</div>
                            <Label className="text-xs font-semibold">Valori Iniziali</Label>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <Label className="text-[10px] text-gray-500">Inizia dal numero</Label>
                              <Input
                                type="number"
                                min={1}
                                value={config.startNumber}
                                onChange={(e) => handleConfigChange(docType.value, 'startNumber', parseInt(e.target.value) || 1)}
                                className="h-8 text-sm mt-1"
                                data-testid={`input-start-number-${docType.value}`}
                              />
                            </div>
                            {config.numberingMode === 'alphanumeric' && (
                              <div>
                                <Label className="text-[10px] text-gray-500">Inizia dalla lettera</Label>
                                <Select
                                  value={config.startLetter}
                                  onValueChange={(val) => handleConfigChange(docType.value, 'startLetter', val)}
                                >
                                  <SelectTrigger className="h-8 text-sm mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {LETTERS.map(letter => (
                                      <SelectItem key={letter} value={letter}>{letter}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div>
                              <Label className="text-[10px] text-gray-500">Cifre (padding)</Label>
                              <Select
                                value={String(config.paddingLength)}
                                onValueChange={(val) => handleConfigChange(docType.value, 'paddingLength', parseInt(val))}
                              >
                                <SelectTrigger className="h-8 text-sm mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="2">2 cifre (01)</SelectItem>
                                  <SelectItem value="3">3 cifre (001)</SelectItem>
                                  <SelectItem value="4">4 cifre (0001)</SelectItem>
                                  <SelectItem value="5">5 cifre (00001)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">3</div>
                            <Label className="text-xs font-semibold">Data Automatica</Label>
                          </div>
                          <div className="space-y-2">
                            {[
                              { value: 'none', label: 'Nessuna data', example: '' },
                              { value: 'day', label: 'Solo giorno', example: '28' },
                              { value: 'day_month', label: 'Giorno/Mese', example: '28/12' },
                              { value: 'day_month_year', label: 'Giorno/Mese/Anno', example: '28/12/2025' },
                            ].map(opt => (
                              <div 
                                key={opt.value}
                                className={`p-2 rounded border cursor-pointer transition-all ${config.dateFormat === opt.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                                onClick={() => handleConfigChange(docType.value, 'dateFormat', opt.value)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full border-2 ${config.dateFormat === opt.value ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`} />
                                    <span className="text-xs">{opt.label}</span>
                                  </div>
                                  {opt.example && <span className="text-[10px] text-gray-400 font-mono">{opt.example}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-[10px] text-gray-500">Prefisso</Label>
                          <Input
                            value={config.prefix}
                            onChange={(e) => handleConfigChange(docType.value, 'prefix', e.target.value.toUpperCase())}
                            placeholder="DDT"
                            className="h-8 text-sm mt-1 font-mono"
                            maxLength={10}
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-gray-500">Separatore</Label>
                          <Select
                            value={config.separator}
                            onValueChange={(val) => handleConfigChange(docType.value, 'separator', val)}
                          >
                            <SelectTrigger className="h-8 text-sm mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="-">Trattino (-)</SelectItem>
                              <SelectItem value="/">Barra (/)</SelectItem>
                              <SelectItem value=".">Punto (.)</SelectItem>
                              <SelectItem value="_">Underscore (_)</SelectItem>
                              <SelectItem value="none">Nessuno</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <div className="flex items-center gap-2 h-8">
                            <Switch
                              checked={config.resetAnnually}
                              onCheckedChange={(checked) => handleConfigChange(docType.value, 'resetAnnually', checked)}
                            />
                            <Label className="text-xs">Reset annuale</Label>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingType(null)}>
                          Annulla
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => saveNumberingMutation.mutate(config)}
                          disabled={saveNumberingMutation.isPending}
                          data-testid={`btn-save-numbering-${docType.value}`}
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Salva
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-amber-600" />
            Approvazione Ordini a Fornitore
          </CardTitle>
          <CardDescription>
            Configura regole di approvazione per gli ordini di acquisto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div>
              <p className="font-medium">Richiedi Approvazione</p>
              <p className="text-sm text-gray-500">Abilita il workflow di approvazione per gli ordini</p>
            </div>
            <Switch
              checked={orderApprovalConfig.requiresApproval}
              onCheckedChange={(checked) => setOrderApprovalConfig(prev => ({ ...prev, requiresApproval: checked }))}
              data-testid="switch-order-approval"
            />
          </div>

          {orderApprovalConfig.requiresApproval && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Soglia Importo (€)</Label>
                <Input
                  type="number"
                  value={orderApprovalConfig.thresholdAmount || ''}
                  onChange={(e) => setOrderApprovalConfig(prev => ({ 
                    ...prev, 
                    thresholdAmount: e.target.value ? parseFloat(e.target.value) : null 
                  }))}
                  placeholder="Nessun limite"
                  className="mt-1"
                />
                <p className="text-[10px] text-gray-400 mt-1">Approvazione solo sopra questa soglia</p>
              </div>
              <div>
                <Label className="text-xs">Soglia Quantità</Label>
                <Input
                  type="number"
                  value={orderApprovalConfig.thresholdQuantity || ''}
                  onChange={(e) => setOrderApprovalConfig(prev => ({ 
                    ...prev, 
                    thresholdQuantity: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                  placeholder="Nessun limite"
                  className="mt-1"
                />
                <p className="text-[10px] text-gray-400 mt-1">Approvazione sopra N pezzi totali</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={orderApprovalConfig.notifyOnCreate}
                onCheckedChange={(checked) => setOrderApprovalConfig(prev => ({ ...prev, notifyOnCreate: checked }))}
              />
              <Label className="text-sm">Notifica alla creazione</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={orderApprovalConfig.notifyOnApproval}
                onCheckedChange={(checked) => setOrderApprovalConfig(prev => ({ ...prev, notifyOnApproval: checked }))}
              />
              <Label className="text-sm">Notifica all'approvazione</Label>
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              onClick={() => saveApprovalMutation.mutate(orderApprovalConfig)}
              disabled={saveApprovalMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              Salva Configurazione
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SystemConfigPage() {
  const [activeTab, setActiveTab] = useState('wms');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Configurazione Sistema</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Impostazioni avanzate per moduli e integrazioni</p>
      </div>
      <div className="max-w-6xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <TabsTrigger 
              value="wms" 
              className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              data-testid="tab-wms"
            >
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">WMS</span>
            </TabsTrigger>
            <TabsTrigger 
              value="sales" 
              className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              data-testid="tab-sales"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Sales</span>
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

          <TabsContent value="sales" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                  Configurazione Sales
                </CardTitle>
                <CardDescription>Impostazioni POS, scontrini, pagamenti e promozioni</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-sm">Configurazione Sales in arrivo.</p>
              </CardContent>
            </Card>
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
    </div>
  );
}
