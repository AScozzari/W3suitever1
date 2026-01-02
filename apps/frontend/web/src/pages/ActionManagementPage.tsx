/**
 * 🎯 ACTION MANAGEMENT DASHBOARD
 * 
 * Pagina centralizzata per configurare le azioni per dipartimento.
 * - Configura quali azioni richiedono approvazione
 * - Abbina workflow o usa flusso default (notifica supervisori)
 * - Gestisce scope team (tutti o specifici)
 * - Visualizza coverage delle azioni per dipartimento
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Check, ChevronsUpDown } from 'lucide-react';
import { 
  Plus, 
  Search, 
  Filter,
  Users,
  Settings,
  Workflow,
  DollarSign,
  HeadphonesIcon,
  Edit,
  Trash2,
  MoreHorizontal,
  TrendingUp,
  Megaphone,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  Shield,
  AlertTriangle,
  Save,
  X,
  Loader2,
  GitBranch
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Wand2 } from 'lucide-react';
import { ActionBuilderTab } from '@/components/settings/ActionBuilderTab';

const DEPARTMENTS = {
  'hr': { icon: Users, label: 'Human Resources', color: 'bg-purple-500', textColor: 'text-purple-700', description: 'Ferie, permessi, congedi' },
  'finance': { icon: DollarSign, label: 'Finance', color: 'bg-green-500', textColor: 'text-green-700', description: 'Spese, budget, pagamenti' },
  'sales': { icon: TrendingUp, label: 'Sales', color: 'bg-blue-500', textColor: 'text-blue-700', description: 'Sconti, contratti' },
  'operations': { icon: Settings, label: 'Operations', color: 'bg-orange-500', textColor: 'text-orange-700', description: 'Manutenzione, logistica' },
  'support': { icon: HeadphonesIcon, label: 'Support IT', color: 'bg-cyan-500', textColor: 'text-cyan-700', description: 'Accessi, hardware, software' },
  'crm': { icon: Users, label: 'CRM', color: 'bg-pink-500', textColor: 'text-pink-700', description: 'Clienti, reclami, escalation' },
  'marketing': { icon: Megaphone, label: 'Marketing', color: 'bg-violet-500', textColor: 'text-violet-700', description: 'Campagne, contenuti' },
  'customer_service': { icon: HeadphonesIcon, label: 'Assistenza Clienti', color: 'bg-teal-500', textColor: 'text-teal-700', description: 'Ticket, reclami, assistenza' },
  'it': { icon: Settings, label: 'IT', color: 'bg-slate-500', textColor: 'text-slate-700', description: 'Sistemi, hardware, software' },
  'wms': { icon: Package, label: 'WMS', color: 'bg-amber-500', textColor: 'text-amber-700', description: 'Magazzino, movimenti, inventario' }
};

const FLOW_TYPES = {
  'none': { label: 'Nessuna Approvazione', color: 'bg-gray-100 text-gray-700', icon: XCircle },
  'default': { label: 'Flusso Default', color: 'bg-blue-100 text-blue-700', icon: Users },
  'workflow': { label: 'Workflow', color: 'bg-purple-100 text-purple-700', icon: Workflow }
};

interface ActionDefinition {
  id: string;
  department: string;
  actionId: string;
  actionName: string;
  actionCategory: string;
  description?: string;
  icon?: string;
  color?: string;
  direction?: 'inbound' | 'outbound' | 'internal';
  isEvergreen: boolean;
  requiresImplementation: boolean;
  defaultRequiresApproval: boolean;
  defaultFlowType: 'none' | 'default' | 'workflow';
  displayOrder: number;
  isActive: boolean;
}

interface ActionConfiguration {
  id: string;
  tenantId: string;
  department: keyof typeof DEPARTMENTS;
  actionId: string;
  actionName: string;
  description?: string;
  requiresApproval: boolean;
  isActive: boolean;
  flowType?: 'none' | 'default' | 'workflow';
  workflowTemplateId?: string;
  teamScope?: 'all' | 'specific';
  specificTeamIds?: string[];
  defaultTeamIds?: string[];
  workflowConfigs?: Array<{
    id: string;
    teamId: string;
    workflowId: string;
  }>;
  slaHours: number;
  escalationEnabled: boolean;
  priority: number;
  workflowTemplate?: {
    id: string;
    name: string;
    category: string;
  };
}

interface MergedAction {
  definition: ActionDefinition;
  configuration?: ActionConfiguration;
  isConfigured: boolean;
}

interface CoverageStats {
  coverage: Record<string, {
    total: number;
    withWorkflow: number;
    withDefaultFlow: number;
    noApproval: number;
    workflowCoveragePercent: number;
  }>;
  totalActions: number;
  totalWithWorkflow: number;
  totalWithDefaultFlow: number;
}

export function ActionManagementContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionConfiguration | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const { data: definitionsData, isLoading: definitionsLoading } = useQuery({
    queryKey: ['/api/action-definitions', selectedDepartment],
    queryFn: async () => {
      const params = selectedDepartment !== 'all' ? `?department=${selectedDepartment}` : '';
      return await apiRequest(`/api/action-definitions${params}`);
    }
  });

  const { data: actionsData, isLoading: actionsLoading } = useQuery({
    queryKey: ['/api/action-configurations', selectedDepartment, 'operative'],
    queryFn: async () => {
      // Action Management mostra SOLO azioni operative (team+workflow)
      const baseParams = 'actionCategory=operative';
      const deptParams = selectedDepartment !== 'all' ? `&department=${selectedDepartment}` : '';
      return await apiRequest(`/api/action-configurations?${baseParams}${deptParams}`);
    }
  });

  const { data: coverageData } = useQuery({
    queryKey: ['/api/action-configurations/stats/coverage'],
    queryFn: async () => {
      return await apiRequest('/api/action-configurations/stats/coverage') as CoverageStats;
    }
  });

  const { data: departmentsData } = useQuery({
    queryKey: ['/api/action-configurations/meta/departments'],
    queryFn: async () => {
      return await apiRequest('/api/action-configurations/meta/departments');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/action-configurations/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/action-configurations'] });
      toast({ title: 'Azione eliminata con successo' });
      setShowDeleteConfirm(null);
    },
    onError: () => {
      toast({ title: 'Errore durante l\'eliminazione', variant: 'destructive' });
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ department, actionId, isActive }: { department: string; actionId: string; isActive: boolean }) => {
      return await apiRequest(`/api/action-configurations/toggle/${department}/${actionId}`, { 
        method: 'PATCH',
        body: JSON.stringify({ isActive })
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/action-configurations'] });
      toast({ 
        title: variables.isActive ? 'Azione abilitata' : 'Azione disabilitata',
        description: `L'azione è ora ${variables.isActive ? 'attiva' : 'disattivata'}`
      });
    },
    onError: () => {
      toast({ title: 'Errore durante l\'aggiornamento', variant: 'destructive' });
    }
  });

  const definitions: ActionDefinition[] = definitionsData?.actions || [];
  const configurations: ActionConfiguration[] = actionsData?.actions || [];

  // Computed stats from configurations
  const computedStats = {
    totalActions: configurations.length,
    requiresApproval: configurations.filter(c => c.flowType !== 'none').length,
    withWorkflow: configurations.filter(c => c.flowType === 'workflow').length,
    withDefault: configurations.filter(c => c.flowType === 'default').length,
    avgSla: configurations.length > 0 
      ? Math.round(configurations.reduce((sum, c) => sum + (c.slaHours || 24), 0) / configurations.length)
      : 24
  };
  
  const mergedActions: MergedAction[] = definitions.map(def => {
    const config = configurations.find(c => 
      c.department === def.department && c.actionId === def.actionId
    );
    return {
      definition: def,
      configuration: config,
      isConfigured: !!config
    };
  }).sort((a, b) => a.definition.displayOrder - b.definition.displayOrder);

  const filteredActions = mergedActions.filter(action => 
    (action.definition.actionName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (action.definition.actionId || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLoading = definitionsLoading || actionsLoading;

  const getFlowTypeBadge = (action: ActionConfiguration) => {
    const flowConfig = FLOW_TYPES[action.flowType];
    const Icon = flowConfig.icon;
    return (
      <Badge className={`${flowConfig.color} gap-1`} variant="secondary">
        <Icon className="h-3 w-3" />
        {flowConfig.label}
      </Badge>
    );
  };

  return (
    <>
      <div className="min-h-screen bg-white p-6">
        <div className="w-full space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Action Management</h1>
              <p className="text-gray-500 mt-1">
                Configura le azioni per dipartimento e i relativi flussi operativi
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1">
                {definitions.length} azioni globali
              </Badge>
              <Badge variant="secondary" className="px-3 py-1 bg-green-100 text-green-700">
                {configurations.length} configurate
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Settings className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{definitions.length}</p>
                    <p className="text-sm text-gray-500">Azioni Definite</p>
                    <p className="text-xs text-gray-400">{computedStats.totalActions} configurate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{computedStats.requiresApproval}</p>
                    <p className="text-sm text-gray-500">Con Flusso</p>
                    <p className="text-xs text-gray-400">{computedStats.withWorkflow} workflow, {computedStats.withDefault} default</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <GitBranch className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{computedStats.withWorkflow}</p>
                    <p className="text-sm text-gray-500">Con Workflow</p>
                    <p className="text-xs text-gray-400">Flusso automatizzato</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{computedStats.avgSla}h</p>
                    <p className="text-sm text-gray-500">SLA Medio</p>
                    <p className="text-xs text-gray-400">Tempo di approvazione</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Coverage per Dipartimento</CardTitle>
              <CardDescription>Clicca su un dipartimento per filtrare le azioni</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(DEPARTMENTS).map(([deptKey, dept]) => {
                  const deptDefs = definitions.filter(d => d.department === deptKey);
                  const deptConfigs = configurations.filter(c => c.department === deptKey);
                  const withApproval = deptConfigs.filter(c => c.flowType !== 'none').length;
                  const withWorkflow = deptConfigs.filter(c => c.flowType === 'workflow').length;
                  const approvalPercent = deptDefs.length > 0 
                    ? Math.round((withApproval / deptDefs.length) * 100) 
                    : 0;
                  const Icon = dept.icon;
                  const isSelected = selectedDepartment === deptKey;
                  
                  return (
                    <button
                      key={deptKey}
                      type="button"
                      onClick={() => setSelectedDepartment(isSelected ? 'all' : deptKey)}
                      className={`p-3 border rounded-lg text-left transition-all hover:shadow-md ${
                        isSelected 
                          ? 'ring-2 ring-offset-1 ring-windtre-orange border-windtre-orange bg-orange-50' 
                          : 'hover:border-gray-300'
                      }`}
                      data-testid={`button-dept-${deptKey}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 ${dept.color} rounded`}>
                          <Icon className="h-3 w-3 text-white" />
                        </div>
                        <span className="font-medium text-xs truncate">{dept.label}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Flusso</span>
                          <span className={approvalPercent > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                            {approvalPercent}%
                          </span>
                        </div>
                        <Progress value={approvalPercent} className="h-1.5" />
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>{deptDefs.length} def.</span>
                          <span>{withWorkflow > 0 ? `${withWorkflow} wf` : ''}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Configurazione Azioni</CardTitle>
                  <CardDescription>Gestisci le azioni e i flussi operativi per ogni dipartimento</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Cerca azioni..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64"
                      data-testid="input-search-actions"
                    />
                  </div>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger className="w-48" data-testid="select-department-filter">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Tutti i dipartimenti" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[9999]">
                      <SelectItem value="all">Tutti i dipartimenti</SelectItem>
                      {Object.entries(DEPARTMENTS).map(([key, dept]) => (
                        <SelectItem key={key} value={key}>{dept.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin h-8 w-8 border-4 border-windtre-orange border-t-transparent rounded-full" />
                </div>
              ) : filteredActions.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <Settings className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Nessuna azione disponibile per questo dipartimento</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dipartimento</TableHead>
                      <TableHead>Azione</TableHead>
                      <TableHead>Direzione</TableHead>
                      <TableHead>Flusso</TableHead>
                      <TableHead>Workflow</TableHead>
                      <TableHead>SLA</TableHead>
                      <TableHead>Abilitato</TableHead>
                      <TableHead className="text-right">Configura</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActions.map((merged) => {
                      const { definition, configuration, isConfigured } = merged;
                      const dept = DEPARTMENTS[definition.department as keyof typeof DEPARTMENTS];
                      const Icon = dept?.icon || Settings;
                      const flowType = configuration?.flowType || definition.defaultFlowType;
                      const flowConfig = FLOW_TYPES[flowType];
                      const FlowIcon = flowConfig.icon;
                      
                      return (
                        <TableRow 
                          key={definition.id} 
                          data-testid={`row-action-${definition.actionId}`}
                          className={!isConfigured ? 'bg-gray-50/50' : ''}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 ${dept?.color || 'bg-gray-500'} rounded`}>
                                <Icon className="h-4 w-4 text-white" />
                              </div>
                              <span className="font-medium">{dept?.label || definition.department}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{definition.actionName}</p>
                              <p className="text-xs text-gray-500">{definition.actionId}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {definition.direction && (
                              <Badge 
                                variant="outline" 
                                className={
                                  definition.direction === 'inbound' ? 'border-green-300 text-green-700' :
                                  definition.direction === 'outbound' ? 'border-red-300 text-red-700' :
                                  'border-gray-300 text-gray-700'
                                }
                              >
                                {definition.direction === 'inbound' ? '↓ Entrata' :
                                 definition.direction === 'outbound' ? '↑ Uscita' :
                                 '⟳ Interno'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${flowConfig.color} gap-1`} variant="secondary">
                              <FlowIcon className="h-3 w-3" />
                              {flowConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {configuration?.workflowTemplate ? (
                              <Badge variant="outline" className="gap-1">
                                <Workflow className="h-3 w-3" />
                                {configuration.workflowTemplate.name}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3 text-gray-400" />
                              {configuration?.slaHours || 24}h
                              {configuration?.escalationEnabled && (
                                <span title="Escalation attiva">
                                  <AlertTriangle className="h-3 w-3 text-amber-500 ml-1" />
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={configuration?.isActive !== false}
                                onCheckedChange={(checked) => {
                                  toggleMutation.mutate({
                                    department: definition.department,
                                    actionId: definition.actionId,
                                    isActive: checked
                                  });
                                }}
                                disabled={toggleMutation.isPending}
                                data-testid={`switch-toggle-${definition.actionId}`}
                              />
                              <span className={`text-xs ${configuration?.isActive !== false ? 'text-green-600' : 'text-gray-400'}`}>
                                {configuration?.isActive !== false ? 'Attivo' : 'Disattivato'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                if (configuration) {
                                  setEditingAction(configuration);
                                } else {
                                  setEditingAction({
                                    id: '',
                                    tenantId: '',
                                    department: definition.department as keyof typeof DEPARTMENTS,
                                    actionId: definition.actionId,
                                    actionName: definition.actionName,
                                    description: definition.description || '',
                                    requiresApproval: definition.defaultRequiresApproval,
                                    flowType: definition.defaultFlowType,
                                    teamScope: 'all',
                                    slaHours: 24,
                                    escalationEnabled: true,
                                    priority: definition.displayOrder,
                                    isActive: true
                                  });
                                }
                              }}
                              data-testid={`button-configure-${definition.actionId}`}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              {isConfigured ? 'Modifica' : 'Configura'}
                            </Button>
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
      </div>

      <ActionFormModal 
        open={showCreateModal || !!editingAction}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateModal(false);
            setEditingAction(null);
          }
        }}
        action={editingAction}
        onSuccess={() => {
          setShowCreateModal(false);
          setEditingAction(null);
          queryClient.invalidateQueries({ queryKey: ['/api/action-configurations'] });
        }}
      />

      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma Eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare questa configurazione azione? L'operazione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Annulla
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => showDeleteConfirm && deleteMutation.mutate(showDeleteConfirm)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminazione...' : 'Elimina'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Configurazione workflow per team (semplificato)
interface WorkflowConfig {
  id: string;
  teamId: string;
  workflowId: string;
}

interface ActionFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: ActionConfiguration | null;
  onSuccess: () => void;
}

function ActionFormModal({ open, onOpenChange, action, onSuccess }: ActionFormModalProps) {
  const { toast } = useToast();
  const isEditing = !!action;
  
  // Form state semplificato
  const [formData, setFormData] = useState({
    department: action?.department || 'hr',
    actionId: action?.actionId || '',
    actionName: action?.actionName || '',
    description: action?.description || '',
    requiresFlow: false,
    defaultScope: 'all' as 'all' | 'specific',
    defaultTeamIds: [] as string[],
    slaHours: action?.slaHours || 24,
    escalationEnabled: action?.escalationEnabled ?? true,
    priority: action?.priority || 100
  });

  // Configurazioni workflow (team + workflow)
  const [workflowConfigs, setWorkflowConfigs] = useState<WorkflowConfig[]>([]);

  // Update form when action changes
  useEffect(() => {
    if (action) {
      const hasWorkflowConfigs = action.workflowConfigs && action.workflowConfigs.length > 0;
      const hasDefaultTeams = action.defaultTeamIds && action.defaultTeamIds.length > 0;
      const requiresFlow = action.requiresApproval || action.flowType !== 'none';
      
      setFormData({
        department: action.department || 'hr',
        actionId: action.actionId || '',
        actionName: action.actionName || '',
        description: action.description || '',
        requiresFlow,
        defaultScope: hasDefaultTeams ? 'specific' : 'all',
        defaultTeamIds: action.defaultTeamIds || [],
        slaHours: action.slaHours || 24,
        escalationEnabled: action.escalationEnabled ?? true,
        priority: action.priority || 100
      });
      setWorkflowConfigs(action.workflowConfigs || []);
    } else {
      setFormData({
        department: 'hr',
        actionId: '',
        actionName: '',
        description: '',
        requiresFlow: false,
        defaultScope: 'all',
        defaultTeamIds: [],
        slaHours: 24,
        escalationEnabled: true,
        priority: 100
      });
      setWorkflowConfigs([]);
    }
  }, [action, open]);

  // Fetch workflows per dipartimento - sempre caricati quando modal aperto
  const { data: workflowsData, isLoading: workflowsLoading } = useQuery({
    queryKey: ['/api/action-configurations/meta/workflows', formData.department],
    queryFn: async () => {
      return await apiRequest(`/api/action-configurations/meta/workflows/${formData.department}`);
    },
    enabled: open && !!formData.department
  });

  // Fetch teams per dipartimento - sempre caricati quando modal aperto
  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ['/api/action-configurations/meta/teams', formData.department],
    queryFn: async () => {
      return await apiRequest(`/api/action-configurations/meta/teams/${formData.department}`);
    },
    enabled: open && !!formData.department
  });

  // Teams già usati in workflow configs (non selezionabili per altri)
  const usedTeamIds = workflowConfigs.map(c => c.teamId);
  const availableTeamsForWorkflow = teamsData?.teams?.filter((t: any) => !usedTeamIds.includes(t.id)) || [];

  // Aggiungi configurazione workflow
  const addWorkflowConfig = (teamId: string, workflowId: string) => {
    if (!teamId || !workflowId) return;
    setWorkflowConfigs([...workflowConfigs, {
      id: crypto.randomUUID(),
      teamId,
      workflowId
    }]);
  };

  // Rimuovi configurazione workflow
  const removeWorkflowConfig = (id: string) => {
    setWorkflowConfigs(workflowConfigs.filter(c => c.id !== id));
  };

  // Toggle team nella selezione default
  const toggleDefaultTeam = (teamId: string) => {
    const newIds = formData.defaultTeamIds.includes(teamId)
      ? formData.defaultTeamIds.filter(id => id !== teamId)
      : [...formData.defaultTeamIds, teamId];
    setFormData({ ...formData, defaultTeamIds: newIds });
  };

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = isEditing 
        ? `/api/action-configurations/${action?.id}` 
        : '/api/action-configurations';
      const method = isEditing ? 'PUT' : 'POST';
      return await apiRequest(url, { method, body: data });
    },
    onSuccess: () => {
      toast({ title: isEditing ? 'Azione aggiornata' : 'Azione creata con successo' });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: 'destructive' });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      department: formData.department,
      actionId: formData.actionId,
      actionName: formData.actionName,
      description: formData.description,
      requiresApproval: formData.requiresFlow,
      flowType: formData.requiresFlow ? 'default' : 'none',
      defaultScope: formData.defaultScope,
      defaultTeamIds: formData.defaultScope === 'specific' ? formData.defaultTeamIds : [],
      workflowConfigs,
      slaHours: formData.slaHours,
      escalationEnabled: formData.escalationEnabled,
      priority: formData.priority
    });
  };

  // State per nuovo workflow config
  const [newConfig, setNewConfig] = useState({ teamId: '', workflowId: '' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifica Configurazione Azione' : 'Nuova Configurazione Azione'}
          </DialogTitle>
          <DialogDescription>
            Configura i parametri dell'azione e il flusso di approvazione
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dipartimento *</Label>
              <Select 
                value={formData.department} 
                onValueChange={(v) => setFormData({...formData, department: v as any})}
                disabled={isEditing}
              >
                <SelectTrigger data-testid="select-form-department">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[9999]">
                  {Object.entries(DEPARTMENTS).map(([key, dept]) => (
                    <SelectItem key={key} value={key}>{dept.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>ID Azione *</Label>
              <Input 
                value={formData.actionId}
                onChange={(e) => setFormData({...formData, actionId: e.target.value})}
                placeholder="es. approve_vacation"
                disabled={isEditing}
                data-testid="input-form-actionId"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nome Azione *</Label>
            <Input 
              value={formData.actionName}
              onChange={(e) => setFormData({...formData, actionName: e.target.value})}
              placeholder="es. Approvazione Ferie"
              data-testid="input-form-actionName"
            />
          </div>

          <div className="space-y-2">
            <Label>Descrizione</Label>
            <Textarea 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Descrizione dell'azione..."
              rows={2}
              data-testid="textarea-form-description"
            />
          </div>

          {/* Toggle Richiede Flusso */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Label className="font-medium">Richiede Flusso</Label>
              <p className="text-sm text-gray-500">Attiva per richiedere approvazione</p>
            </div>
            <Switch 
              checked={formData.requiresFlow}
              onCheckedChange={(checked) => setFormData({ ...formData, requiresFlow: checked })}
              data-testid="switch-requires-flow"
            />
          </div>

          {formData.requiresFlow && (
            <>
              {/* SEZIONE 1: Flusso Default */}
              <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <Label className="font-medium text-blue-900">Flusso Default (Supervisori)</Label>
                </div>
                <p className="text-xs text-blue-700">
                  Team che usano il flusso default con approvazione supervisore
                </p>
                
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="defaultScope" 
                      checked={formData.defaultScope === 'all'}
                      onChange={() => setFormData({ ...formData, defaultScope: 'all', defaultTeamIds: [] })}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Tutti i team</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="defaultScope" 
                      checked={formData.defaultScope === 'specific'}
                      onChange={() => setFormData({ ...formData, defaultScope: 'specific' })}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Team specifici</span>
                  </label>
                </div>

                {formData.defaultScope === 'specific' && (
                  <div className="space-y-2 pt-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between h-9 text-left font-normal"
                          data-testid="multiselect-default-teams"
                        >
                          {formData.defaultTeamIds.length === 0
                            ? "Seleziona team..."
                            : `${formData.defaultTeamIds.length} team selezionati`}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0 z-[9999]" align="start">
                        <Command>
                          <CommandInput placeholder="Cerca team..." />
                          <CommandList>
                            <CommandEmpty>Nessun team trovato</CommandEmpty>
                            <CommandGroup>
                              {teamsLoading ? (
                                <CommandItem disabled>Caricamento...</CommandItem>
                              ) : teamsData?.teams?.map((team: any) => (
                                <CommandItem
                                  key={team.id}
                                  value={team.name}
                                  onSelect={() => toggleDefaultTeam(team.id)}
                                  className="cursor-pointer"
                                >
                                  <Checkbox
                                    checked={formData.defaultTeamIds.includes(team.id)}
                                    className="mr-2"
                                  />
                                  {team.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    
                    {formData.defaultTeamIds.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {formData.defaultTeamIds.map(teamId => {
                          const team = teamsData?.teams?.find((t: any) => t.id === teamId);
                          return team ? (
                            <Badge key={teamId} variant="secondary" className="text-xs">
                              {team.name}
                              <button
                                type="button"
                                onClick={() => toggleDefaultTeam(teamId)}
                                className="ml-1 hover:text-red-500"
                              >
                                ×
                              </button>
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SEZIONE 2: Configurazioni Workflow (Override) */}
              <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Workflow className="h-4 w-4 text-purple-600" />
                    <Label className="font-medium text-purple-900">Workflow Personalizzati</Label>
                  </div>
                  <Badge variant="outline" className="text-purple-700 border-purple-300">
                    {workflowConfigs.length} configurazioni
                  </Badge>
                </div>
                <p className="text-xs text-purple-700">
                  Team con workflow dedicato (override del flusso default)
                </p>

                {/* Lista configurazioni esistenti */}
                {workflowConfigs.length > 0 && (
                  <div className="space-y-2">
                    {workflowConfigs.map((config) => {
                      const team = teamsData?.teams?.find((t: any) => t.id === config.teamId);
                      const workflow = workflowsData?.templates?.find((w: any) => w.id === config.workflowId);
                      return (
                        <div key={config.id} className="flex items-center justify-between p-2 bg-white rounded border border-purple-100">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">{team?.name || config.teamId}</span>
                            <span className="text-gray-400">→</span>
                            <Badge variant="secondary" className="text-xs">
                              {workflow?.name || config.workflowId}
                            </Badge>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeWorkflowConfig(config.id)}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Aggiungi nuova configurazione */}
                <div className="flex gap-2 items-end pt-2">
                  <div className="flex-1">
                    <Label className="text-xs text-purple-700">Team</Label>
                    <Select 
                      value={newConfig.teamId} 
                      onValueChange={(v) => setNewConfig({ ...newConfig, teamId: v })}
                    >
                      <SelectTrigger className="h-9" data-testid="select-new-workflow-team">
                        <SelectValue placeholder="Seleziona team..." />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[9999]">
                        {availableTeamsForWorkflow.length === 0 ? (
                          <SelectItem value="__none__" disabled>Tutti i team già configurati</SelectItem>
                        ) : (
                          availableTeamsForWorkflow.map((team: any) => (
                            <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-purple-700">Workflow</Label>
                    <Select 
                      value={newConfig.workflowId} 
                      onValueChange={(v) => setNewConfig({ ...newConfig, workflowId: v })}
                    >
                      <SelectTrigger className="h-9" data-testid="select-new-workflow-template">
                        <SelectValue placeholder="Seleziona workflow..." />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[9999]">
                        {workflowsLoading ? (
                          <SelectItem value="__loading__" disabled>Caricamento...</SelectItem>
                        ) : workflowsData?.templates?.length > 0 ? (
                          workflowsData.templates.map((wf: any) => (
                            <SelectItem key={wf.id} value={wf.id}>{wf.name}</SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__empty__" disabled>Nessun workflow</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      addWorkflowConfig(newConfig.teamId, newConfig.workflowId);
                      setNewConfig({ teamId: '', workflowId: '' });
                    }}
                    disabled={!newConfig.teamId || !newConfig.workflowId}
                    className="bg-purple-600 hover:bg-purple-700"
                    data-testid="button-add-workflow-config"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* SLA and Escalation settings */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>SLA (ore)</Label>
                  <Input 
                    type="number"
                    value={formData.slaHours}
                    onChange={(e) => setFormData({...formData, slaHours: parseInt(e.target.value) || 24})}
                    min={1}
                    max={168}
                    data-testid="input-form-slaHours"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div>
                    <Label className="font-medium flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      Escalation
                    </Label>
                    <p className="text-xs text-gray-500">
                      Dopo {formData.slaHours}h, observers approvano
                    </p>
                  </div>
                  <Switch 
                    checked={formData.escalationEnabled}
                    onCheckedChange={(checked) => setFormData({...formData, escalationEnabled: checked})}
                    data-testid="switch-escalation"
                  />
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              Annulla
            </Button>
            <Button 
              type="submit" 
              className="bg-windtre-orange hover:bg-windtre-orange/90"
              disabled={saveMutation.isPending || !formData.actionId || !formData.actionName}
              data-testid="button-save-action"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? 'Salvataggio...' : (isEditing ? 'Aggiorna' : 'Crea')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ActionManagementPage() {
  return <ActionManagementContent />;
}
