import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Settings2, Workflow, ListOrdered, Plus, Trash2, Save } from 'lucide-react';
import { LoadingState } from '@w3suite/frontend-kit/components/blocks';

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
  const [activeTab, setActiveTab] = useState('workflows');

  // Fetch assigned workflows
  const { data: workflowsResponse, isLoading: workflowsLoading } = useQuery({
    queryKey: ['/api/crm/pipelines', pipelineId, 'workflows'],
    enabled: open && !!pipelineId,
  });

  const assignedWorkflows = workflowsResponse?.data || [];

  // Fetch pipeline stages
  const { data: stagesResponse, isLoading: stagesLoading } = useQuery({
    queryKey: ['/api/crm/pipelines', pipelineId, 'stages'],
    enabled: open && !!pipelineId,
  });

  const stages = stagesResponse?.data || [];

  // Fetch available workflow templates
  const { data: templatesResponse } = useQuery({
    queryKey: ['/api/workflows/templates'],
    enabled: open,
  });

  const availableTemplates = templatesResponse?.data || [];

  // Stage form state
  const [newStageName, setNewStageName] = useState('');
  const [newStageCategory, setNewStageCategory] = useState<StageCategory>('starter');
  const [newStageOrder, setNewStageOrder] = useState('');

  // Workflow assignment mutation
  const assignWorkflowMutation = useMutation({
    mutationFn: async (workflowTemplateId: string) => {
      return apiRequest(`/api/crm/pipelines/${pipelineId}/workflows`, {
        method: 'POST',
        body: JSON.stringify({
          workflowTemplateId,
          isActive: true,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/pipelines', pipelineId, 'workflows'] });
      toast({
        title: 'Workflow assegnato',
        description: 'Il workflow è stato assegnato con successo alla pipeline',
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
      queryClient.invalidateQueries({ queryKey: ['/api/crm/pipelines', pipelineId, 'workflows'] });
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
          probability: 50,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/pipelines', pipelineId, 'stages'] });
      setNewStageName('');
      setNewStageCategory('starter');
      setNewStageOrder('');
      toast({
        title: 'Stato creato',
        description: 'Il nuovo stato è stato aggiunto alla pipeline',
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
      queryClient.invalidateQueries({ queryKey: ['/api/crm/pipelines', pipelineId, 'stages'] });
      toast({
        title: 'Stato eliminato',
        description: 'Lo stato è stato rimosso dalla pipeline',
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

  const handleAssignWorkflow = (templateId: string) => {
    assignWorkflowMutation.mutate(templateId);
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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
        style={{
          background: 'var(--glass-bg-light)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--glass-border)'
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ color: 'hsl(var(--brand-orange))' }}>
            <Settings2 className="h-5 w-5" />
            Impostazioni Pipeline
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3" style={{ background: 'var(--glass-bg-heavy)' }}>
            <TabsTrigger value="rules" data-testid="tab-contact-rules">
              <Settings2 className="h-4 w-4 mr-2" />
              Regole Contatto
            </TabsTrigger>
            <TabsTrigger value="workflows" data-testid="tab-workflows">
              <Workflow className="h-4 w-4 mr-2" />
              Workflow Abbinati
            </TabsTrigger>
            <TabsTrigger value="stages" data-testid="tab-stages">
              <ListOrdered className="h-4 w-4 mr-2" />
              Stati Pipeline
            </TabsTrigger>
          </TabsList>

          {/* Tab: Regole Contatto */}
          <TabsContent value="rules" className="flex-1 overflow-auto space-y-4 py-4">
            <Card 
              className="p-6"
              style={{
                background: 'var(--glass-bg-heavy)',
                border: '1px solid var(--glass-border)'
              }}
            >
              <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                Regole di Contatto
              </h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                Configurazione regole di validazione e contatto per questa pipeline (in arrivo)
              </p>
            </Card>
          </TabsContent>

          {/* Tab: Workflow Abbinati */}
          <TabsContent value="workflows" className="flex-1 overflow-auto space-y-4 py-4">
            {workflowsLoading ? (
              <LoadingState />
            ) : (
              <>
                {/* Assigned Workflows */}
                <div className="space-y-2">
                  <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                    Workflow Assegnati ({assignedWorkflows.length})
                  </h3>
                  {assignedWorkflows.length === 0 ? (
                    <Card 
                      className="p-6 text-center"
                      style={{
                        background: 'var(--glass-bg-heavy)',
                        border: '1px solid var(--glass-border)'
                      }}
                    >
                      <p style={{ color: 'var(--text-secondary)' }}>
                        Nessun workflow assegnato a questa pipeline
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {assignedWorkflows.map((workflow: any) => (
                        <Card
                          key={workflow.id}
                          className="p-4 flex items-center justify-between"
                          style={{
                            background: 'var(--glass-bg-heavy)',
                            border: '1px solid var(--glass-border)'
                          }}
                          data-testid={`workflow-assigned-${workflow.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <Workflow className="h-5 w-5" style={{ color: 'hsl(var(--brand-orange))' }} />
                            <div>
                              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                {workflow.workflowName}
                              </div>
                              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                {workflow.workflowCategory} • {workflow.workflowType}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveWorkflow(workflow.id)}
                            disabled={removeWorkflowMutation.isPending}
                            data-testid={`button-remove-workflow-${workflow.id}`}
                          >
                            <Trash2 className="h-4 w-4" style={{ color: 'hsl(var(--destructive))' }} />
                          </Button>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Available Workflows */}
                <div className="space-y-2">
                  <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                    Workflow Disponibili
                  </h3>
                  <div className="space-y-2">
                    {availableTemplates
                      .filter((template: any) => !assignedWorkflows.find((w: any) => w.workflowTemplateId === template.id))
                      .map((template: any) => (
                        <Card
                          key={template.id}
                          className="p-4 flex items-center justify-between"
                          style={{
                            background: 'var(--glass-bg-heavy)',
                            border: '1px solid var(--glass-border)'
                          }}
                          data-testid={`workflow-available-${template.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <Workflow className="h-5 w-5" style={{ color: 'var(--text-tertiary)' }} />
                            <div>
                              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                {template.name}
                              </div>
                              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                {template.category} • {template.templateType}
                              </div>
                            </div>
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
                        </Card>
                      ))}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Tab: Stati Pipeline */}
          <TabsContent value="stages" className="flex-1 overflow-auto space-y-4 py-4">
            {stagesLoading ? (
              <LoadingState />
            ) : (
              <>
                {/* Create New Stage Form */}
                <Card 
                  className="p-4 space-y-4"
                  style={{
                    background: 'var(--glass-bg-heavy)',
                    border: '1px solid var(--glass-border)'
                  }}
                >
                  <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                    Crea Nuovo Stato
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stage-name">Nome Stato</Label>
                      <Input
                        id="stage-name"
                        value={newStageName}
                        onChange={(e) => setNewStageName(e.target.value)}
                        placeholder="es. Contatto Iniziale"
                        style={{
                          background: 'var(--glass-bg-light)',
                          border: '1px solid var(--glass-border)'
                        }}
                        data-testid="input-stage-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stage-category">Categoria</Label>
                      <Select value={newStageCategory} onValueChange={(val) => setNewStageCategory(val as StageCategory)}>
                        <SelectTrigger 
                          id="stage-category"
                          style={{
                            background: 'var(--glass-bg-light)',
                            border: '1px solid var(--glass-border)'
                          }}
                          data-testid="select-stage-category"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(stageCategoryConfig).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stage-order">Ordine</Label>
                      <Input
                        id="stage-order"
                        type="number"
                        value={newStageOrder}
                        onChange={(e) => setNewStageOrder(e.target.value)}
                        placeholder="0"
                        style={{
                          background: 'var(--glass-bg-light)',
                          border: '1px solid var(--glass-border)'
                        }}
                        data-testid="input-stage-order"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleCreateStage}
                    disabled={createStageMutation.isPending}
                    style={{ background: 'hsl(var(--brand-orange))', color: 'white' }}
                    data-testid="button-create-stage"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Crea Stato
                  </Button>
                </Card>

                {/* Existing Stages */}
                <div className="space-y-2">
                  <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                    Stati Personalizzati ({stages.length})
                  </h3>
                  {stages.length === 0 ? (
                    <Card 
                      className="p-6 text-center"
                      style={{
                        background: 'var(--glass-bg-heavy)',
                        border: '1px solid var(--glass-border)'
                      }}
                    >
                      <p style={{ color: 'var(--text-secondary)' }}>
                        Nessuno stato personalizzato creato
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {stages.map((stage: any) => (
                        <Card
                          key={stage.id}
                          className="p-4 flex items-center justify-between"
                          style={{
                            background: 'var(--glass-bg-heavy)',
                            border: '1px solid var(--glass-border)'
                          }}
                          data-testid={`stage-${stage.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-2 h-8 rounded"
                              style={{ background: stageCategoryConfig[stage.category as StageCategory]?.color || 'var(--text-tertiary)' }}
                            />
                            <div>
                              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                {stage.name}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge 
                                  variant="outline"
                                  style={{
                                    borderColor: stageCategoryConfig[stage.category as StageCategory]?.color,
                                    color: stageCategoryConfig[stage.category as StageCategory]?.color,
                                    background: 'var(--glass-bg-light)'
                                  }}
                                >
                                  {stageCategoryConfig[stage.category as StageCategory]?.label}
                                </Badge>
                                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                                  Ordine: {stage.orderIndex}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStage(stage.id)}
                            disabled={deleteStageMutation.isPending}
                            data-testid={`button-delete-stage-${stage.id}`}
                          >
                            <Trash2 className="h-4 w-4" style={{ color: 'hsl(var(--destructive))' }} />
                          </Button>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
