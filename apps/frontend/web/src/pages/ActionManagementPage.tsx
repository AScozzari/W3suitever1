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
import { useToast } from '@/hooks/use-toast';
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
  X
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

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
  name: string;
  nameEn: string;
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
  // Legacy fields (for backward compatibility)
  flowType?: 'none' | 'default' | 'workflow';
  workflowTemplateId?: string;
  teamScope?: 'all' | 'specific';
  specificTeamIds?: string[];
  // New: Multiple assignments per action
  assignments?: Array<{
    id: string;
    flowType: 'default' | 'workflow';
    workflowTemplateId: string;
    teamScope: 'all' | 'specific';
    teamIds: string[];
  }>;
  slaHours: number;
  escalationEnabled: boolean;
  priority: number;
  isActive: boolean;
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
    queryKey: ['/api/action-configurations', selectedDepartment],
    queryFn: async () => {
      const params = selectedDepartment !== 'all' ? `?department=${selectedDepartment}` : '';
      return await apiRequest(`/api/action-configurations${params}`);
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

  const definitions: ActionDefinition[] = definitionsData?.actions || [];
  const configurations: ActionConfiguration[] = actionsData?.actions || [];
  
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
    action.definition.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    action.definition.actionId.toLowerCase().includes(searchQuery.toLowerCase())
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
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Action Management</h1>
              <p className="text-gray-500 mt-1">
                Configura le azioni per dipartimento e i flussi di approvazione
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
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Settings className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{coverageData?.totalActions || 0}</p>
                    <p className="text-sm text-gray-500">Azioni Totali</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Workflow className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{coverageData?.totalWithWorkflow || 0}</p>
                    <p className="text-sm text-gray-500">Con Workflow</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{coverageData?.totalWithDefaultFlow || 0}</p>
                    <p className="text-sm text-gray-500">Flusso Default</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <XCircle className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {(coverageData?.totalActions || 0) - (coverageData?.totalWithWorkflow || 0) - (coverageData?.totalWithDefaultFlow || 0)}
                    </p>
                    <p className="text-sm text-gray-500">Senza Approvazione</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Coverage per Dipartimento</CardTitle>
              <CardDescription>Percentuale di azioni con workflow assegnato</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(DEPARTMENTS).map(([deptKey, dept]) => {
                  const stats = coverageData?.coverage?.[deptKey];
                  const Icon = dept.icon;
                  return (
                    <div key={deptKey} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 ${dept.color} rounded`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <span className="font-medium text-sm">{dept.label}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Workflow</span>
                          <span>{stats?.workflowCoveragePercent || 0}%</span>
                        </div>
                        <Progress value={stats?.workflowCoveragePercent || 0} className="h-2" />
                        <p className="text-xs text-gray-400">{stats?.total || 0} azioni configurate</p>
                      </div>
                    </div>
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
                  <CardDescription>Gestisci le azioni e i flussi di approvazione per ogni dipartimento</CardDescription>
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
                      <TableHead>Stato</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
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
                              <p className="font-medium">{definition.name}</p>
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
                                <AlertTriangle className="h-3 w-3 text-amber-500 ml-1" title="Escalation attiva" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {isConfigured ? (
                              <Badge className="bg-green-100 text-green-700">Configurato</Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-500">Default</Badge>
                            )}
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
                                    actionName: definition.name,
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

// 🎯 Assignment structure: each action can have multiple workflow-team pairs
interface ActionAssignment {
  id: string;
  flowType: 'default' | 'workflow';
  workflowTemplateId: string;
  teamScope: 'all' | 'specific';
  teamIds: string[];
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
  
  // Base action data (name, description, etc.)
  const [formData, setFormData] = useState({
    department: action?.department || 'hr',
    actionId: action?.actionId || '',
    actionName: action?.actionName || '',
    description: action?.description || '',
    requiresApproval: action?.requiresApproval ?? false,
    slaHours: action?.slaHours || 24,
    escalationEnabled: action?.escalationEnabled ?? true,
    priority: action?.priority || 100
  });

  // Multiple assignments for this action
  const [assignments, setAssignments] = useState<ActionAssignment[]>([]);

  // Update formData when action changes
  useEffect(() => {
    if (action) {
      setFormData({
        department: action.department || 'hr',
        actionId: action.actionId || '',
        actionName: action.actionName || '',
        description: action.description || '',
        requiresApproval: action.requiresApproval ?? false,
        slaHours: action.slaHours || 24,
        escalationEnabled: action.escalationEnabled ?? true,
        priority: action.priority || 100
      });
      // Load existing assignments or convert legacy format
      if (action.assignments && action.assignments.length > 0) {
        setAssignments(action.assignments);
      } else if (action.flowType && action.flowType !== 'none') {
        // Convert legacy single assignment to array
        setAssignments([{
          id: crypto.randomUUID(),
          flowType: action.flowType as 'default' | 'workflow',
          workflowTemplateId: action.workflowTemplateId || '',
          teamScope: action.teamScope || 'all',
          teamIds: action.specificTeamIds || []
        }]);
      } else {
        setAssignments([]);
      }
    } else {
      setFormData({
        department: 'hr',
        actionId: '',
        actionName: '',
        description: '',
        requiresApproval: false,
        slaHours: 24,
        escalationEnabled: true,
        priority: 100
      });
      setAssignments([]);
    }
  }, [action, open]);

  // Always fetch workflows for the selected department
  const { data: workflowsData, isLoading: workflowsLoading } = useQuery({
    queryKey: ['/api/action-configurations/meta/workflows', formData.department],
    queryFn: async () => {
      return await apiRequest(`/api/action-configurations/meta/workflows/${formData.department}`);
    },
    enabled: open && formData.requiresApproval
  });

  // Always fetch teams for the selected department
  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ['/api/action-configurations/meta/teams', formData.department],
    queryFn: async () => {
      return await apiRequest(`/api/action-configurations/meta/teams/${formData.department}`);
    },
    enabled: open && formData.requiresApproval
  });

  // Add a new assignment
  const addAssignment = () => {
    setAssignments([...assignments, {
      id: crypto.randomUUID(),
      flowType: 'default',
      workflowTemplateId: '',
      teamScope: 'all',
      teamIds: []
    }]);
  };

  // Update an assignment
  const updateAssignment = (id: string, updates: Partial<ActionAssignment>) => {
    setAssignments(assignments.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  // Remove an assignment
  const removeAssignment = (id: string) => {
    setAssignments(assignments.filter(a => a.id !== id));
  };

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { assignments: ActionAssignment[] }) => {
      const url = isEditing 
        ? `/api/action-configurations/${action.id}` 
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
    // Combine formData with assignments
    saveMutation.mutate({
      ...formData,
      // If requiresApproval is off, clear assignments
      assignments: formData.requiresApproval ? assignments : []
    });
  };

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
                onValueChange={(v) => setFormData({...formData, department: v as any, workflowTemplateId: ''})}
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

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Label className="font-medium">Richiede Approvazione</Label>
              <p className="text-sm text-gray-500">Attiva per richiedere approvazione supervisore</p>
            </div>
            <Switch 
              checked={formData.requiresApproval}
              onCheckedChange={(checked) => setFormData({
                ...formData, 
                requiresApproval: checked,
                flowType: checked ? 'default' : 'none'
              })}
              data-testid="switch-requires-approval"
            />
          </div>

          {formData.requiresApproval && (
            <>
              {/* 🎯 ASSIGNMENTS SECTION - Multiple workflow-team pairs */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Configurazioni Workflow</Label>
                    <p className="text-xs text-gray-500">
                      Puoi assegnare workflow diversi a team diversi
                    </p>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={addAssignment}
                    data-testid="button-add-assignment"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Aggiungi Configurazione
                  </Button>
                </div>

                {assignments.length === 0 && (
                  <div className="p-6 border-2 border-dashed border-gray-200 rounded-lg text-center">
                    <Workflow className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 mb-2">
                      Nessuna configurazione workflow definita
                    </p>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={addAssignment}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Aggiungi prima configurazione
                    </Button>
                  </div>
                )}

                {/* Render each assignment */}
                {assignments.map((assignment, index) => (
                  <Card key={assignment.id} className="border-l-4 border-l-windtre-orange">
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">
                          Configurazione #{index + 1}
                        </CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAssignment(assignment.id)}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                          data-testid={`button-remove-assignment-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="py-3 px-4 space-y-4">
                      {/* Row 1: Flow Type + Workflow */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Tipo Flusso</Label>
                          <Select 
                            value={assignment.flowType} 
                            onValueChange={(v) => updateAssignment(assignment.id, { 
                              flowType: v as 'default' | 'workflow',
                              workflowTemplateId: v === 'default' ? '' : assignment.workflowTemplateId
                            })}
                          >
                            <SelectTrigger className="h-9" data-testid={`select-flowType-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent position="popper" className="z-[9999]">
                              <SelectItem value="default">
                                <div className="flex items-center gap-2">
                                  <Users className="h-3 w-3" />
                                  Default (Supervisori)
                                </div>
                              </SelectItem>
                              <SelectItem value="workflow">
                                <div className="flex items-center gap-2">
                                  <Workflow className="h-3 w-3" />
                                  Workflow Personalizzato
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {assignment.flowType === 'workflow' && (
                          <div className="space-y-1">
                            <Label className="text-xs">Workflow Template</Label>
                            <Select 
                              value={assignment.workflowTemplateId} 
                              onValueChange={(v) => updateAssignment(assignment.id, { workflowTemplateId: v })}
                            >
                              <SelectTrigger className="h-9" data-testid={`select-workflow-${index}`}>
                                <SelectValue placeholder="Seleziona..." />
                              </SelectTrigger>
                              <SelectContent position="popper" className="z-[9999]">
                                {workflowsLoading ? (
                                  <SelectItem value="" disabled>Caricamento...</SelectItem>
                                ) : workflowsData?.templates?.length > 0 ? (
                                  workflowsData.templates.map((wf: any) => (
                                    <SelectItem key={wf.id} value={wf.id}>{wf.name}</SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="" disabled>Nessun workflow disponibile</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      {/* Row 2: Team Scope + Team Selection */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Scope Team</Label>
                          <Select 
                            value={assignment.teamScope} 
                            onValueChange={(v) => updateAssignment(assignment.id, { 
                              teamScope: v as 'all' | 'specific',
                              teamIds: v === 'all' ? [] : assignment.teamIds
                            })}
                          >
                            <SelectTrigger className="h-9" data-testid={`select-teamScope-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent position="popper" className="z-[9999]">
                              <SelectItem value="all">Tutti i Team</SelectItem>
                              <SelectItem value="specific">Team Specifici</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {assignment.teamScope === 'specific' && (
                          <div className="space-y-1">
                            <Label className="text-xs">Team Selezionati ({assignment.teamIds.length})</Label>
                            <Select 
                              value={assignment.teamIds[0] || ''} 
                              onValueChange={(v) => {
                                // Toggle team selection (multi-select emulation)
                                const newTeamIds = assignment.teamIds.includes(v)
                                  ? assignment.teamIds.filter(t => t !== v)
                                  : [...assignment.teamIds, v];
                                updateAssignment(assignment.id, { teamIds: newTeamIds });
                              }}
                            >
                              <SelectTrigger className="h-9" data-testid={`select-teams-${index}`}>
                                <SelectValue placeholder={`${assignment.teamIds.length} team selezionati`} />
                              </SelectTrigger>
                              <SelectContent position="popper" className="z-[9999]">
                                {teamsLoading ? (
                                  <SelectItem value="" disabled>Caricamento...</SelectItem>
                                ) : teamsData?.teams?.length > 0 ? (
                                  teamsData.teams.map((team: any) => (
                                    <SelectItem key={team.id} value={team.id}>
                                      <div className="flex items-center gap-2">
                                        {assignment.teamIds.includes(team.id) && (
                                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                                        )}
                                        {team.name}
                                      </div>
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="" disabled>Nessun team disponibile</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      {/* Show selected teams as badges */}
                      {assignment.teamScope === 'specific' && assignment.teamIds.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {assignment.teamIds.map(teamId => {
                            const team = teamsData?.teams?.find((t: any) => t.id === teamId);
                            return team ? (
                              <Badge key={teamId} variant="secondary" className="text-xs">
                                {team.name}
                                <button
                                  type="button"
                                  onClick={() => updateAssignment(assignment.id, { 
                                    teamIds: assignment.teamIds.filter(t => t !== teamId) 
                                  })}
                                  className="ml-1 hover:text-red-500"
                                >
                                  ×
                                </button>
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
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
