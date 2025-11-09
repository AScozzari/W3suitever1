import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { 
  Settings2, 
  Workflow, 
  ListOrdered, 
  Plus, 
  Trash2, 
  Save,
  Zap,
  Bell,
  Shield,
  Clock,
  AlertTriangle,
  TrendingUp,
  Info,
  UserPlus
} from 'lucide-react';
import { LoadingState } from '@w3suite/frontend-kit/components/blocks';
import { TeamUserAssignmentDialog } from './TeamUserAssignmentDialog';

interface PipelineSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  pipelineId: string;
}

type StageCategory = 'starter' | 'progress' | 'pending' | 'purchase' | 'finalized' | 'archive' | 'ko';

const stageCategoryConfig: Record<StageCategory, { label: string; color: string }> = {
  starter: { label: 'Iniziale', color: 'hsl(210, 100%, 60%)' },
  progress: { label: 'In Progress', color: 'hsl(200, 100%, 50%)' },
  pending: { label: 'In Attesa', color: 'hsl(40, 95%, 55%)' },
  purchase: { label: 'Acquisto', color: 'hsl(280, 65%, 60%)' },
  finalized: { label: 'Finalizzato', color: 'hsl(140, 60%, 50%)' },
  archive: { label: 'Archiviato', color: 'hsl(210, 15%, 50%)' },
  ko: { label: 'Perso/KO', color: 'hsl(0, 70%, 55%)' }
};

export function PipelineSettingsDialog({ open, onClose, pipelineId }: PipelineSettingsDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');

  // Fetch pipeline details
  const { data: pipeline, isLoading: pipelineLoading } = useQuery({
    queryKey: [`/api/crm/pipelines/${pipelineId}`],
    enabled: open && !!pipelineId,
  });

  // Fetch assigned workflows
  const { data: assignedWorkflows = [], isLoading: workflowsLoading } = useQuery({
    queryKey: [`/api/crm/pipelines/${pipelineId}/workflows`],
    enabled: open && !!pipelineId,
  });

  // Fetch pipeline stages
  const { data: stages = [], isLoading: stagesLoading } = useQuery({
    queryKey: [`/api/crm/pipelines/${pipelineId}/stages`],
    enabled: open && !!pipelineId,
  });

  // Fetch pipeline settings
  const { data: pipelineSettings } = useQuery({
    queryKey: [`/api/crm/pipelines/${pipelineId}/settings`],
    enabled: open && !!pipelineId,
  });

  // Fetch available workflow templates (CRM only)
  const { data: availableTemplates = [] } = useQuery({
    queryKey: ['/api/workflows/templates', { category: 'crm' }],
    enabled: open,
  });

  // Fetch CRM/Sales teams (teams with teamType 'crm' or 'sales')
  const { data: allTeams = [] } = useQuery({
    queryKey: ['/api/teams'],
    enabled: open,
  });

  // Filter teams with CRM/Sales type
  const crmTeams = allTeams.filter((team: any) => 
    team.teamType === 'crm' || team.teamType === 'sales'
  );

  // Fetch drivers from public schema
  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['/api/drivers'],
    enabled: open,
  });

  // General settings state
  const [pipelineName, setPipelineName] = useState('');
  const [pipelineDescription, setPipelineDescription] = useState('');
  const [pipelineDriver, setPipelineDriver] = useState<string>('');
  const [autoAssign, setAutoAssign] = useState(false);
  const [rottenDays, setRottenDays] = useState('30');
  const [staleDays, setStaleDays] = useState('14');

  // Team & User assignments state
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
  const [dealManagers, setDealManagers] = useState<string[]>([]);
  const [pipelineAdmins, setPipelineAdmins] = useState<string[]>([]);
  
  // Operational permissions (mode-based)
  const [dealCreationMode, setDealCreationMode] = useState<'all' | 'deal_managers' | 'pipeline_admins' | 'supervisor_only' | 'custom' | 'none'>('all');
  const [stateModificationMode, setStateModificationMode] = useState<'all' | 'deal_managers' | 'pipeline_admins' | 'supervisor_only' | 'custom' | 'none'>('all');
  const [dealDeletionMode, setDealDeletionMode] = useState<'pipeline_admins' | 'supervisor_only' | 'custom' | 'none'>('pipeline_admins');
  
  // Custom users lists for each permission type
  const [customCreateUsers, setCustomCreateUsers] = useState<string[]>([]);
  const [customModifyUsers, setCustomModifyUsers] = useState<string[]>([]);
  const [customDeleteUsers, setCustomDeleteUsers] = useState<string[]>([]);

  // Modal state for user assignments
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [assignmentType, setAssignmentType] = useState<'deal' | 'admin' | 'custom_create' | 'custom_modify' | 'custom_delete'>('deal');

  // Stage form state
  const [newStageName, setNewStageName] = useState('');
  const [newStageCategory, setNewStageCategory] = useState<StageCategory>('starter');
  const [newStageOrder, setNewStageOrder] = useState('');
  const [newStageProbability, setNewStageProbability] = useState('50');

  // Automation settings
  const [autoMoveEnabled, setAutoMoveEnabled] = useState(false);
  const [autoNotifyEnabled, setAutoNotifyEnabled] = useState(true);
  const [duplicateCheckEnabled, setDuplicateCheckEnabled] = useState(true);

  // Notification settings
  const [notifyOnStageChange, setNotifyOnStageChange] = useState(true);
  const [notifyOnDealRotten, setNotifyOnDealRotten] = useState(true);
  const [notifyOnDealWon, setNotifyOnDealWon] = useState(true);
  const [notifyOnDealLost, setNotifyOnDealLost] = useState(true);

  // Workflow execution mode state (per template)
  const [workflowExecutionModes, setWorkflowExecutionModes] = useState<Record<string, 'automatic' | 'manual'>>({});

  // Update pipeline general settings
  const updatePipelineMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/crm/pipelines/${pipelineId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crm/pipelines/${pipelineId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/pipelines'] });
      toast({
        title: '✅ Impostazioni salvate con successo',
        description: 'Le impostazioni generali della pipeline sono state aggiornate',
        className: "bg-green-50 border-green-200",
        duration: 3000,
      });
      // Chiudi il dialog dopo aver mostrato il toast
      setTimeout(() => onClose(), 500);
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile salvare le impostazioni',
        variant: 'destructive',
      });
    },
  });

  // Workflow assignment mutation
  const assignWorkflowMutation = useMutation({
    mutationFn: async ({ templateId, executionMode }: { templateId: string; executionMode: 'automatic' | 'manual' }) => {
      return apiRequest(`/api/crm/pipelines/${pipelineId}/workflows`, {
        method: 'POST',
        body: JSON.stringify({
          workflowTemplateId: templateId,
          executionMode,
          isActive: true,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crm/pipelines/${pipelineId}/workflows`] });
      toast({
        title: '✅ Workflow assegnato',
        description: 'Il workflow è stato assegnato con successo alla pipeline',
        className: "bg-green-50 border-green-200",
        duration: 3000,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile assegnare il workflow',
        variant: 'destructive',
      });
    },
  });

  // Workflow removal mutation
  const removeWorkflowMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      return apiRequest(`/api/crm/pipelines/${pipelineId}/workflows/${workflowId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crm/pipelines/${pipelineId}/workflows`] });
      toast({
        title: 'Workflow rimosso',
        description: 'Il workflow è stato rimosso dalla pipeline',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile rimuovere il workflow',
        variant: 'destructive',
      });
    },
  });

  // Stage creation mutation
  const createStageMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/crm/pipelines/${pipelineId}/stages`, {
        method: 'POST',
        body: JSON.stringify({
          name: newStageName,
          category: newStageCategory,
          orderIndex: parseInt(newStageOrder) || 0,
          probability: parseInt(newStageProbability) || 50,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crm/pipelines/${pipelineId}/stages`] });
      setNewStageName('');
      setNewStageCategory('starter');
      setNewStageOrder('');
      setNewStageProbability('50');
      toast({
        title: '✅ Stato creato con successo',
        description: `Lo stato "${newStageName}" è stato aggiunto alla pipeline`,
        className: "bg-green-50 border-green-200",
        duration: 3000,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile creare lo stato',
        variant: 'destructive',
      });
    },
  });

  // Stage deletion mutation
  const deleteStageMutation = useMutation({
    mutationFn: async (stageId: string) => {
      return apiRequest(`/api/crm/pipelines/${pipelineId}/stages/${stageId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crm/pipelines/${pipelineId}/stages`] });
      toast({
        title: '⚠️ Stato eliminato',
        description: 'Lo stato è stato rimosso dalla pipeline',
        className: "bg-yellow-50 border-yellow-200",
        duration: 3000,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile eliminare lo stato',
        variant: 'destructive',
      });
    },
  });

  // Pipeline settings mutation (team/user assignments)
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      return apiRequest(`/api/crm/pipelines/${pipelineId}/settings`, {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crm/pipelines/${pipelineId}`] });
      toast({
        title: '✅ Assegnazioni salvate',
        description: 'Le assegnazioni team/utenti sono state aggiornate con successo',
        className: "bg-green-50 border-green-200",
        duration: 3000,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile salvare le assegnazioni',
        variant: 'destructive',
      });
    },
  });

  const handleSaveGeneral = () => {
    // Save pipeline basic info
    updatePipelineMutation.mutate({
      name: pipelineName || pipeline?.name,
      description: pipelineDescription || pipeline?.description,
      driverId: pipelineDriver || pipeline?.driverId,
      autoAssign,
      rottenDaysThreshold: parseInt(rottenDays) || 30,
      staleDaysThreshold: parseInt(staleDays) || 14,
    });

    // Save settings (assignments) separately
    updateSettingsMutation.mutate({
      assignedTeams: selectedTeams,
      assignedUsers,
      pipelineAdmins,
      dealManagementMode: 'custom',
      dealManagementUsers: dealManagers,
      dealCreationMode,
      stateModificationMode,
      dealDeletionMode,
    });
  };

  const handleAssignWorkflow = (templateId: string) => {
    const executionMode = workflowExecutionModes[templateId] || 'manual';
    assignWorkflowMutation.mutate({ templateId, executionMode });
  };

  const handleRemoveWorkflow = (workflowId: string) => {
    removeWorkflowMutation.mutate(workflowId);
  };

  const handleCreateStage = () => {
    if (!newStageName.trim()) {
      toast({
        title: 'Errore',
        description: 'Inserisci un nome per lo stato',
        variant: 'destructive',
      });
      return;
    }
    createStageMutation.mutate();
  };

  const handleDeleteStage = (stageId: string) => {
    deleteStageMutation.mutate(stageId);
  };

  // Load pipeline data into form when pipeline changes
  useEffect(() => {
    if (pipeline) {
      setPipelineName(pipeline.name || '');
      setPipelineDescription(pipeline.description || '');
      setPipelineDriver(pipeline.driverId || '');
      setAutoAssign(pipeline.autoAssign || false);
      setRottenDays(String(pipeline.rottenDaysThreshold || 30));
      setStaleDays(String(pipeline.staleDaysThreshold || 14));
    }
  }, [pipeline]);

  // Load pipeline settings into form when settings change
  useEffect(() => {
    if (pipelineSettings) {
      setSelectedTeams(pipelineSettings.assignedTeams || []);
      setAssignedUsers(pipelineSettings.assignedUsers || []);
      setDealManagers(pipelineSettings.dealManagementUsers || []);
      setPipelineAdmins(pipelineSettings.pipelineAdmins || []);
      setDealCreationMode(pipelineSettings.dealCreationMode || 'all');
      setStateModificationMode(pipelineSettings.stateModificationMode || 'all');
      setDealDeletionMode(pipelineSettings.dealDeletionMode || 'admins');
    }
  }, [pipelineSettings]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col"
        style={{
          background: 'white',
          border: '1px solid rgba(0, 0, 0, 0.1)'
        }}
      >
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 rounded-lg" style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}>
              <Settings2 className="h-6 w-6" />
            </div>
            <div>
              <div style={{ color: '#1f2937' }}>Impostazioni Pipeline</div>
              <div className="text-sm font-normal text-gray-500 mt-1">
                {pipeline?.name || 'Caricamento...'}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configura impostazioni generali, stage, workflow e notifiche per questa pipeline CRM
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-7 bg-gray-50 p-1 rounded-lg">
            <TabsTrigger 
              value="general" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
              data-testid="tab-general"
            >
              <Info className="h-4 w-4 mr-2" />
              Generale
            </TabsTrigger>
            <TabsTrigger 
              value="stages" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
              data-testid="tab-stages"
            >
              <ListOrdered className="h-4 w-4 mr-2" />
              Stati
            </TabsTrigger>
            <TabsTrigger 
              value="workflows" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
              data-testid="tab-workflows"
            >
              <Workflow className="h-4 w-4 mr-2" />
              Workflow
            </TabsTrigger>
            <TabsTrigger 
              value="automation" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
              data-testid="tab-automation"
            >
              <Zap className="h-4 w-4 mr-2" />
              Automazioni
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
              data-testid="tab-notifications"
            >
              <Bell className="h-4 w-4 mr-2" />
              Notifiche
            </TabsTrigger>
            <TabsTrigger 
              value="permissions" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
              data-testid="tab-permissions"
            >
              <Shield className="h-4 w-4 mr-2" />
              Permessi
            </TabsTrigger>
            <TabsTrigger 
              value="advanced" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
              data-testid="tab-advanced"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Avanzate
            </TabsTrigger>
          </TabsList>

          {/* Tab: Generale */}
          <TabsContent value="general" className="flex-1 overflow-y-auto space-y-6 py-6">
            {pipelineLoading ? (
              <LoadingState />
            ) : (
              <>
                <Card className="p-6 bg-white border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Informazioni Base</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="pipeline-name" className="text-gray-700">Nome Pipeline *</Label>
                      <Input
                        id="pipeline-name"
                        value={pipelineName}
                        onChange={(e) => setPipelineName(e.target.value)}
                        placeholder="es. Pipeline Vendite Fibra"
                        className="bg-white border-gray-300"
                        data-testid="input-pipeline-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pipeline-description" className="text-gray-700">Descrizione</Label>
                      <Textarea
                        id="pipeline-description"
                        value={pipelineDescription}
                        onChange={(e) => setPipelineDescription(e.target.value)}
                        placeholder="Descrivi lo scopo e l'utilizzo di questa pipeline..."
                        rows={3}
                        className="bg-white border-gray-300"
                        data-testid="input-pipeline-description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pipeline-driver" className="text-gray-700">Driver Tecnologico</Label>
                      <Select value={pipelineDriver} onValueChange={setPipelineDriver} disabled={driversLoading}>
                        <SelectTrigger id="pipeline-driver" className="bg-white border-gray-300" data-testid="select-driver">
                          <SelectValue placeholder={driversLoading ? "Caricamento..." : "Seleziona driver"} />
                        </SelectTrigger>
                        <SelectContent>
                          {drivers.map((driver: any) => (
                            <SelectItem key={driver.id} value={driver.id}>
                              {driver.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-white border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Assegnazione Automatica</h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-gray-700">Auto-assegnazione lead</Label>
                      <p className="text-sm text-gray-500">
                        Assegna automaticamente i nuovi lead agli agenti disponibili
                      </p>
                    </div>
                    <Switch
                      checked={autoAssign}
                      onCheckedChange={setAutoAssign}
                      data-testid="switch-auto-assign"
                    />
                  </div>
                </Card>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    data-testid="button-cancel-general"
                  >
                    Annulla
                  </Button>
                  <Button
                    onClick={handleSaveGeneral}
                    disabled={updatePipelineMutation.isPending}
                    style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}
                    data-testid="button-save-general"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Salva Modifiche
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* Tab: Stati Pipeline */}
          <TabsContent value="stages" className="flex-1 overflow-y-auto space-y-6 py-6">
            {stagesLoading ? (
              <LoadingState />
            ) : (
              <>
                <Card className="p-6 bg-white border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Crea Nuovo Stato</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="stage-name" className="text-gray-700">Nome Stato *</Label>
                      <Input
                        id="stage-name"
                        value={newStageName}
                        onChange={(e) => setNewStageName(e.target.value)}
                        placeholder="es. Contatto Iniziale"
                        className="bg-white border-gray-300"
                        data-testid="input-stage-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stage-category" className="text-gray-700">Categoria *</Label>
                      <Select value={newStageCategory} onValueChange={(val) => setNewStageCategory(val as StageCategory)}>
                        <SelectTrigger id="stage-category" className="bg-white border-gray-300" data-testid="select-stage-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(stageCategoryConfig).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded" style={{ background: config.color }} />
                                {config.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stage-order" className="text-gray-700">Ordine</Label>
                      <Input
                        id="stage-order"
                        type="number"
                        value={newStageOrder}
                        onChange={(e) => setNewStageOrder(e.target.value)}
                        placeholder="0"
                        className="bg-white border-gray-300"
                        data-testid="input-stage-order"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stage-probability" className="text-gray-700">Probabilità (%)</Label>
                      <Input
                        id="stage-probability"
                        type="number"
                        min="0"
                        max="100"
                        value={newStageProbability}
                        onChange={(e) => setNewStageProbability(e.target.value)}
                        placeholder="50"
                        className="bg-white border-gray-300"
                        data-testid="input-stage-probability"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleCreateStage}
                    disabled={createStageMutation.isPending}
                    style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}
                    data-testid="button-create-stage"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi Stato
                  </Button>
                </Card>

                <Card className="p-6 bg-white border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">
                    Stati Personalizzati ({stages.length})
                  </h3>
                  {stages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Nessuno stato personalizzato creato
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {stages.map((stage: any) => (
                        <div
                          key={stage.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                          data-testid={`stage-${stage.id}`}
                        >
                          <div className="flex items-center gap-4">
                            <div 
                              className="w-1 h-12 rounded"
                              style={{ background: stageCategoryConfig[stage.category as StageCategory]?.color || '#6b7280' }}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">{stage.name}</span>
                                {!stage.isActive && (
                                  <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-600">
                                    Archiviato
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <Badge 
                                  variant="outline"
                                  className="text-xs"
                                  style={{
                                    borderColor: stageCategoryConfig[stage.category as StageCategory]?.color,
                                    color: stageCategoryConfig[stage.category as StageCategory]?.color,
                                  }}
                                >
                                  {stageCategoryConfig[stage.category as StageCategory]?.label}
                                </Badge>
                                <span className="text-xs text-gray-500">Ordine: {stage.orderIndex}</span>
                                <span className="text-xs text-gray-500">• Probabilità: {stage.probability}%</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStage(stage.id)}
                            disabled={deleteStageMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`button-delete-stage-${stage.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Pulsante Salva per gli Stati */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    data-testid="button-cancel-stages"
                  >
                    Chiudi
                  </Button>
                  <Button
                    onClick={() => {
                      toast({
                        title: "✅ Stati della Pipeline Salvati",
                        description: "Tutte le modifiche agli stati sono state salvate con successo",
                        className: "bg-green-50 border-green-200",
                      });
                    }}
                    style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}
                    data-testid="button-save-stages"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Salva Stati Pipeline
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* Tab: Workflow Abbinati */}
          <TabsContent value="workflows" className="flex-1 overflow-y-auto space-y-6 py-6">
            {workflowsLoading ? (
              <LoadingState />
            ) : (
              <>
                <Card className="p-6 bg-white border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">
                    Workflow Assegnati ({assignedWorkflows.length})
                  </h3>
                  {assignedWorkflows.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Nessun workflow assegnato a questa pipeline
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {assignedWorkflows.map((workflow: any) => (
                        <div
                          key={workflow.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                          data-testid={`workflow-assigned-${workflow.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg" style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}>
                              <Workflow className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">{workflow.workflowName}</div>
                              <div className="text-sm text-gray-500 flex items-center gap-2">
                                <span>{workflow.workflowCategory} • {workflow.workflowType}</span>
                                {workflow.executionMode && (
                                  <>
                                    <span>•</span>
                                    <Badge 
                                      variant={workflow.executionMode === 'automatic' ? 'default' : 'secondary'}
                                      className="flex items-center gap-1"
                                    >
                                      {workflow.executionMode === 'automatic' ? (
                                        <>
                                          <Zap className="h-3 w-3" />
                                          <span>Automatico</span>
                                        </>
                                      ) : (
                                        <>
                                          <Clock className="h-3 w-3" />
                                          <span>Manuale</span>
                                        </>
                                      )}
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveWorkflow(workflow.id)}
                            disabled={removeWorkflowMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`button-remove-workflow-${workflow.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="p-6 bg-white border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Workflow Disponibili</h3>
                  <div className="space-y-3">
                    {availableTemplates
                      .filter((template: any) => !assignedWorkflows.find((w: any) => w.workflowTemplateId === template.id))
                      .map((template: any) => (
                        <div
                          key={template.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                          data-testid={`workflow-available-${template.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gray-200">
                              <Workflow className="h-5 w-5 text-gray-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{template.name}</div>
                              <div className="text-sm text-gray-500">
                                {template.category} • {template.templateType}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col gap-1">
                              <Label className="text-xs text-gray-600">Modalità Esecuzione</Label>
                              <Select
                                value={workflowExecutionModes[template.id] || 'manual'}
                                onValueChange={(value: 'automatic' | 'manual') => {
                                  setWorkflowExecutionModes(prev => ({ ...prev, [template.id]: value }));
                                }}
                                data-testid={`select-execution-mode-${template.id}`}
                              >
                                <SelectTrigger className="w-40 h-9">
                                  <SelectValue placeholder="Seleziona modalità" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="manual">
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4" />
                                      <span>Manuale</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="automatic">
                                    <div className="flex items-center gap-2">
                                      <Zap className="h-4 w-4" />
                                      <span>Automatico</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAssignWorkflow(template.id)}
                              disabled={assignWorkflowMutation.isPending}
                              data-testid={`button-assign-workflow-${template.id}`}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Assegna
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Tab: Automazioni */}
          <TabsContent value="automation" className="flex-1 overflow-y-auto space-y-6 py-6">
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Regole di Automazione</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-gray-900">Avanzamento Automatico</Label>
                    <p className="text-sm text-gray-500">
                      Sposta automaticamente le trattative tra gli stati in base a condizioni predefinite
                    </p>
                  </div>
                  <Switch
                    checked={autoMoveEnabled}
                    onCheckedChange={setAutoMoveEnabled}
                    data-testid="switch-auto-move"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-gray-900">Notifiche Automatiche</Label>
                    <p className="text-sm text-gray-500">
                      Invia notifiche automatiche quando si verificano eventi importanti
                    </p>
                  </div>
                  <Switch
                    checked={autoNotifyEnabled}
                    onCheckedChange={setAutoNotifyEnabled}
                    data-testid="switch-auto-notify"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-gray-900">Controllo Duplicati</Label>
                    <p className="text-sm text-gray-500">
                      Verifica automaticamente la presenza di lead/clienti duplicati prima della creazione
                    </p>
                  </div>
                  <Switch
                    checked={duplicateCheckEnabled}
                    onCheckedChange={setDuplicateCheckEnabled}
                    data-testid="switch-duplicate-check"
                  />
                </div>
              </div>
            </Card>

            {/* Pulsante Salva per le Automazioni */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel-automation"
              >
                Chiudi
              </Button>
              <Button
                onClick={() => {
                  // Salva le impostazioni di automazione
                  updatePipelineMutation.mutate({
                    autoMoveEnabled,
                    autoNotifyEnabled,
                    duplicateCheckEnabled,
                  });
                }}
                disabled={updatePipelineMutation.isPending}
                style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}
                data-testid="button-save-automation"
              >
                <Save className="h-4 w-4 mr-2" />
                Salva Automazioni
              </Button>
            </div>
          </TabsContent>

          {/* Tab: Notifiche */}
          <TabsContent value="notifications" className="flex-1 overflow-y-auto space-y-6 py-6">
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Preferenze Notifiche</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-gray-900">Cambio di Stato</Label>
                    <p className="text-sm text-gray-500">
                      Ricevi notifiche quando una trattativa cambia stato
                    </p>
                  </div>
                  <Switch
                    checked={notifyOnStageChange}
                    onCheckedChange={setNotifyOnStageChange}
                    data-testid="switch-notify-stage-change"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-gray-900">Trattativa Stagnante</Label>
                    <p className="text-sm text-gray-500">
                      Ricevi notifiche quando una trattativa diventa stagnante
                    </p>
                  </div>
                  <Switch
                    checked={notifyOnDealRotten}
                    onCheckedChange={setNotifyOnDealRotten}
                    data-testid="switch-notify-rotten"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-gray-900">Trattativa Vinta</Label>
                    <p className="text-sm text-gray-500">
                      Ricevi notifiche quando una trattativa viene vinta
                    </p>
                  </div>
                  <Switch
                    checked={notifyOnDealWon}
                    onCheckedChange={setNotifyOnDealWon}
                    data-testid="switch-notify-won"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-gray-900">Trattativa Persa</Label>
                    <p className="text-sm text-gray-500">
                      Ricevi notifiche quando una trattativa viene persa
                    </p>
                  </div>
                  <Switch
                    checked={notifyOnDealLost}
                    onCheckedChange={setNotifyOnDealLost}
                    data-testid="switch-notify-lost"
                  />
                </div>
              </div>
            </Card>

            {/* Pulsante Salva per le Notifiche */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel-notifications"
              >
                Chiudi
              </Button>
              <Button
                onClick={() => {
                  // Salva le impostazioni delle notifiche
                  updatePipelineMutation.mutate({
                    notifyOnStageChange,
                    notifyOnDealRotten,
                    notifyOnDealWon,
                    notifyOnDealLost,
                  });
                }}
                disabled={updatePipelineMutation.isPending}
                style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}
                data-testid="button-save-notifications"
              >
                <Save className="h-4 w-4 mr-2" />
                Salva Notifiche
              </Button>
            </div>
          </TabsContent>

          {/* Tab: Permessi */}
          <TabsContent value="permissions" className="flex-1 overflow-y-auto space-y-6 py-6 pr-2">
            <div className="space-y-6">
              <Card className="p-6 bg-white border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Visibilità e Accesso</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Label className="text-gray-700 cursor-help flex items-center gap-1">
                            Team Assegnati alla Pipeline
                            <Info className="h-4 w-4 text-gray-400" />
                          </Label>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Vengono mostrati solo team di tipo CRM o Sales</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Select 
                      value={selectedTeams[0] || ''} 
                      onValueChange={(value) => setSelectedTeams([value])}
                    >
                      <SelectTrigger className="bg-white border-gray-300" data-testid="select-team">
                        <SelectValue placeholder="Seleziona un team CRM o Sales" />
                      </SelectTrigger>
                      <SelectContent>
                        {crmTeams.length === 0 ? (
                          <SelectItem value="_none" disabled>Nessun team CRM/Sales disponibile</SelectItem>
                        ) : (
                          crmTeams.map((team: any) => (
                            <SelectItem key={team.id} value={team.id}>
                              👥 {team.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500">
                      I membri del team selezionato avranno accesso a questa pipeline
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Assegnazioni Utenti</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-gray-900">Gestione Deal</Label>
                      <p className="text-sm text-gray-500">
                        Utenti che possono creare e gestire deal in questa pipeline
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAssignmentType('deal');
                        setAssignmentModalOpen(true);
                      }}
                      disabled={selectedTeams.length === 0}
                      data-testid="button-assign-deal-managers"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assegna ({dealManagers.length})
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-gray-900">Amministratori Pipeline</Label>
                      <p className="text-sm text-gray-500">
                        Utenti con accesso completo alle impostazioni della pipeline
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAssignmentType('admin');
                        setAssignmentModalOpen(true);
                      }}
                      disabled={selectedTeams.length === 0}
                      data-testid="button-assign-admins"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assegna ({pipelineAdmins.length})
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white border border-gray-200">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Permessi Operativi</h3>
                
                {selectedTeams.length === 0 && (
                  <div className="flex items-start gap-3 p-4 mb-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-1">Seleziona prima un team</p>
                      <p className="text-blue-700">
                        I permessi operativi possono essere configurati solo dopo aver assegnato un team alla pipeline nella sezione "Visibilità e Accesso".
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Creazione Deal */}
                  <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-gray-900">Creazione Deal</Label>
                        <p className="text-sm text-gray-500">
                          Chi può creare nuovi deal in questa pipeline
                        </p>
                      </div>
                      <Select 
                        value={dealCreationMode} 
                        onValueChange={(v: any) => setDealCreationMode(v)}
                        disabled={selectedTeams.length === 0}
                      >
                        <SelectTrigger className="w-48 bg-white border-gray-300" data-testid="select-create-deal">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tutti membri team</SelectItem>
                          <SelectItem value="deal_managers">Solo gestori deal</SelectItem>
                          <SelectItem value="pipeline_admins">Solo admin pipeline</SelectItem>
                          <SelectItem value="supervisor_only">Solo supervisor</SelectItem>
                          <SelectItem value="custom">Custom Users</SelectItem>
                          <SelectItem value="none">Nessuno</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {dealCreationMode === 'custom' && (
                      <div className="flex items-center justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAssignmentType('custom_create');
                            setAssignmentModalOpen(true);
                          }}
                          className="bg-white border-gray-300"
                          data-testid="button-select-custom-create"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Seleziona Utenti ({customCreateUsers.length})
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Modifica Stati */}
                  <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-gray-900">Modifica Stati</Label>
                        <p className="text-sm text-gray-500">
                          Chi può modificare gli stati della pipeline
                        </p>
                      </div>
                      <Select 
                        value={stateModificationMode} 
                        onValueChange={(v: any) => setStateModificationMode(v)}
                        disabled={selectedTeams.length === 0}
                      >
                        <SelectTrigger className="w-48 bg-white border-gray-300" data-testid="select-edit-stages">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tutti membri team</SelectItem>
                          <SelectItem value="deal_managers">Solo gestori deal</SelectItem>
                          <SelectItem value="pipeline_admins">Solo admin pipeline</SelectItem>
                          <SelectItem value="supervisor_only">Solo supervisor</SelectItem>
                          <SelectItem value="custom">Custom Users</SelectItem>
                          <SelectItem value="none">Nessuno</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {stateModificationMode === 'custom' && (
                      <div className="flex items-center justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAssignmentType('custom_modify');
                            setAssignmentModalOpen(true);
                          }}
                          className="bg-white border-gray-300"
                          data-testid="button-select-custom-modify"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Seleziona Utenti ({customModifyUsers.length})
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Eliminazione Deal */}
                  <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-gray-900">Eliminazione Deal</Label>
                        <p className="text-sm text-gray-500">
                          Chi può eliminare deal dalla pipeline
                        </p>
                      </div>
                      <Select 
                        value={dealDeletionMode} 
                        onValueChange={(v: any) => setDealDeletionMode(v)}
                        disabled={selectedTeams.length === 0}
                      >
                        <SelectTrigger className="w-48 bg-white border-gray-300" data-testid="select-delete-deals">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pipeline_admins">Solo admin pipeline</SelectItem>
                          <SelectItem value="supervisor_only">Solo supervisor</SelectItem>
                          <SelectItem value="custom">Custom Users</SelectItem>
                          <SelectItem value="none">Nessuno</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {dealDeletionMode === 'custom' && (
                      <div className="flex items-center justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAssignmentType('custom_delete');
                            setAssignmentModalOpen(true);
                          }}
                          className="bg-white border-gray-300"
                          data-testid="button-select-custom-delete"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Seleziona Utenti ({customDeleteUsers.length})
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Avanzate */}
          <TabsContent value="advanced" className="flex-1 overflow-y-auto space-y-6 py-6">
            <Card className="p-6 bg-white border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Configurazioni Avanzate</h3>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <Label className="text-gray-900 text-base">Soglie Temporali (SLA)</Label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rotten-days" className="text-gray-700">
                        Giorni per Trattativa Stagnante
                      </Label>
                      <Input
                        id="rotten-days"
                        type="number"
                        value={rottenDays}
                        onChange={(e) => setRottenDays(e.target.value)}
                        placeholder="30"
                        className="bg-white border-gray-300"
                        data-testid="input-rotten-days"
                      />
                      <p className="text-xs text-gray-500">
                        Giorni senza attività prima che la trattativa sia considerata stagnante
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stale-days" className="text-gray-700">
                        Giorni per Alert Inattività
                      </Label>
                      <Input
                        id="stale-days"
                        type="number"
                        value={staleDays}
                        onChange={(e) => setStaleDays(e.target.value)}
                        placeholder="14"
                        className="bg-white border-gray-300"
                        data-testid="input-stale-days"
                      />
                      <p className="text-xs text-gray-500">
                        Giorni senza attività prima di ricevere un alert
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                    <Label className="text-gray-900 text-base">Forecast & Win/Loss</Label>
                  </div>
                  <p className="text-sm text-gray-500 bg-blue-50 p-4 rounded-lg border border-blue-200">
                    Le funzionalità di forecast automatico e analisi win/loss saranno disponibili prossimamente.
                    Potrai configurare regole per calcoli di probabilità automatici e tracciare motivi di vittoria/perdita.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Team User Assignment Modal */}
      <TeamUserAssignmentDialog
        open={assignmentModalOpen}
        onClose={() => setAssignmentModalOpen(false)}
        teamIds={selectedTeams}
        currentAssignedUsers={
          assignmentType === 'deal' 
            ? dealManagers 
            : assignmentType === 'admin'
            ? pipelineAdmins
            : assignmentType === 'custom_create'
            ? customCreateUsers
            : assignmentType === 'custom_modify'
            ? customModifyUsers
            : customDeleteUsers
        }
        onSave={(selectedUserIds) => {
          if (assignmentType === 'deal') {
            setDealManagers(selectedUserIds);
          } else if (assignmentType === 'admin') {
            setPipelineAdmins(selectedUserIds);
          } else if (assignmentType === 'custom_create') {
            setCustomCreateUsers(selectedUserIds);
          } else if (assignmentType === 'custom_modify') {
            setCustomModifyUsers(selectedUserIds);
          } else if (assignmentType === 'custom_delete') {
            setCustomDeleteUsers(selectedUserIds);
          }
          toast({
            title: 'Assegnazioni salvate',
            description: `${selectedUserIds.length} utenti assegnati correttamente`,
          });
        }}
        title={
          assignmentType === 'deal' 
            ? 'Assegna Gestori Deal' 
            : assignmentType === 'admin'
            ? 'Assegna Amministratori Pipeline'
            : assignmentType === 'custom_create'
            ? 'Utenti Custom - Creazione Deal'
            : assignmentType === 'custom_modify'
            ? 'Utenti Custom - Modifica Stati'
            : 'Utenti Custom - Eliminazione Deal'
        }
        description={
          assignmentType === 'deal' 
            ? 'Seleziona gli utenti che possono creare e gestire deal' 
            : assignmentType === 'admin'
            ? 'Seleziona gli utenti con accesso completo alle impostazioni'
            : assignmentType === 'custom_create'
            ? 'Seleziona gli utenti che possono creare nuovi deal in questa pipeline'
            : assignmentType === 'custom_modify'
            ? 'Seleziona gli utenti che possono modificare gli stati dei deal'
            : 'Seleziona gli utenti che possono eliminare deal dalla pipeline'
        }
      />
    </Dialog>
  );
}
