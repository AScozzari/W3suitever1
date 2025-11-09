import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { 
  Settings2, 
  Workflow, 
  Plus, 
  Trash2, 
  Zap,
  Info,
  GitBranch,
  Brain,
  Save,
  FileText
} from 'lucide-react';
import { LoadingState } from '@w3suite/frontend-kit/components/blocks';

const updateFunnelSchema = z.object({
  name: z.string().min(3, 'Il nome deve contenere almeno 3 caratteri').max(255),
  description: z.string().optional(),
  aiOrchestrationEnabled: z.boolean().default(false)
});

interface FunnelSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  funnelId: string;
  funnelName: string;
}

export function FunnelSettingsDialog({ open, onClose, funnelId, funnelName }: FunnelSettingsDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedExecutionMode, setSelectedExecutionMode] = useState<'automatic' | 'manual'>('manual');

  // Fetch funnel details
  const { data: funnel, isLoading: funnelLoading } = useQuery({
    queryKey: [`/api/crm/funnels/${funnelId}`],
    enabled: open && !!funnelId,
  });

  // Form for general settings
  const form = useForm({
    resolver: zodResolver(updateFunnelSchema),
    defaultValues: {
      name: funnel?.name || '',
      description: funnel?.description || '',
      aiOrchestrationEnabled: funnel?.aiOrchestrationEnabled || false
    },
    values: {
      name: funnel?.name || '',
      description: funnel?.description || '',
      aiOrchestrationEnabled: funnel?.aiOrchestrationEnabled || false
    }
  });

  // Fetch assigned workflows
  const { data: assignedWorkflows = [], isLoading: workflowsLoading } = useQuery({
    queryKey: [`/api/crm/funnels/${funnelId}/workflows`],
    enabled: open && !!funnelId,
  });

  // Fetch available workflow templates (CRM only)
  const { data: availableTemplates = [] } = useQuery({
    queryKey: ['/api/workflows/templates', { category: 'crm' }],
    enabled: open,
  });

  // Filter templates to show only those with funnel orchestration nodes
  const funnelOrchestrationTemplates = availableTemplates.filter((template: any) => {
    const nodes = template.workflow?.nodes || [];
    const orchestrationNodeTypes = [
      'funnel-stage-transition',
      'funnel-pipeline-transition',
      'ai-funnel-orchestrator',
      'funnel-exit',
      'deal-stage-webhook-trigger'
    ];
    return nodes.some((node: any) => orchestrationNodeTypes.includes(node.type));
  });

  // Workflow assignment mutation
  const assignWorkflowMutation = useMutation({
    mutationFn: async ({ templateId, executionMode }: { templateId: string; executionMode: 'automatic' | 'manual' }) => {
      return apiRequest(`/api/crm/funnels/${funnelId}/workflows`, {
        method: 'POST',
        body: JSON.stringify({
          workflowTemplateId: templateId,
          executionMode,
          isActive: true,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crm/funnels/${funnelId}/workflows`] });
      setSelectedTemplate('');
      setSelectedExecutionMode('manual');
      toast({
        title: '✅ Workflow assegnato',
        description: 'Il workflow di orchestration è stato assegnato con successo al funnel',
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
      return apiRequest(`/api/crm/funnels/${funnelId}/workflows/${workflowId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crm/funnels/${funnelId}/workflows`] });
      toast({
        title: 'Workflow rimosso',
        description: 'Il workflow è stato rimosso dal funnel',
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

  // Update workflow execution mode mutation
  const updateExecutionModeMutation = useMutation({
    mutationFn: async ({ workflowId, executionMode }: { workflowId: string; executionMode: 'automatic' | 'manual' }) => {
      return apiRequest(`/api/crm/funnels/${funnelId}/workflows/${workflowId}`, {
        method: 'PATCH',
        body: JSON.stringify({ executionMode }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crm/funnels/${funnelId}/workflows`] });
      toast({
        title: '✅ Modalità aggiornata',
        description: 'La modalità di esecuzione del workflow è stata aggiornata',
        className: "bg-green-50 border-green-200",
        duration: 2000,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile aggiornare la modalità',
        variant: 'destructive',
      });
    },
  });

  // Update funnel general settings mutation
  const updateFunnelMutation = useMutation({
    mutationFn: async (data: z.infer<typeof updateFunnelSchema>) => {
      return apiRequest(`/api/crm/funnels/${funnelId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crm/funnels/${funnelId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/funnels'] });
      toast({
        title: '✅ Impostazioni salvate',
        description: 'Le impostazioni del funnel sono state aggiornate con successo',
        className: "bg-green-50 border-green-200",
        duration: 3000,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile salvare le impostazioni',
        variant: 'destructive',
      });
    },
  });

  const handleAssignWorkflow = () => {
    if (!selectedTemplate) {
      toast({
        title: 'Attenzione',
        description: 'Seleziona un workflow template',
        variant: 'destructive',
      });
      return;
    }

    assignWorkflowMutation.mutate({
      templateId: selectedTemplate,
      executionMode: selectedExecutionMode,
    });
  };

  const handleRemoveWorkflow = (workflowId: string) => {
    removeWorkflowMutation.mutate(workflowId);
  };

  const handleToggleExecutionMode = (workflowId: string, currentMode: string) => {
    const newMode = currentMode === 'automatic' ? 'manual' : 'automatic';
    updateExecutionModeMutation.mutate({
      workflowId,
      executionMode: newMode,
    });
  };

  if (funnelLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
          <LoadingState message="Caricamento impostazioni funnel..." />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-windtre-orange" />
            Impostazioni Funnel: {funnelName}
          </DialogTitle>
          <DialogDescription>
            Configura i workflow di AI orchestration per gestire transizioni tra pipeline
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general" className="flex items-center gap-2" data-testid="tab-general">
              <FileText className="w-4 h-4" />
              Generale
            </TabsTrigger>
            <TabsTrigger value="workflows" className="flex items-center gap-2" data-testid="tab-workflows">
              <Workflow className="w-4 h-4" />
              Workflows
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="flex-1 overflow-y-auto space-y-6 p-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => updateFunnelMutation.mutate(data))} className="space-y-6">
                <Card className="windtre-glass-panel p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-windtre-orange" />
                    Informazioni Generali
                  </h3>
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Funnel *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="es. Lead to Customer Journey" 
                              {...field} 
                              data-testid="input-funnel-name-settings"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrizione</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Descrivi il customer journey..." 
                              {...field} 
                              data-testid="input-funnel-description-settings"
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="aiOrchestrationEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">AI Orchestration</FormLabel>
                            <FormDescription>
                              Abilita l'intelligenza artificiale per ottimizzare il customer journey
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-ai-orchestration-settings"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end mt-6">
                    <Button
                      type="submit"
                      disabled={updateFunnelMutation.isPending || !form.formState.isDirty}
                      className="bg-windtre-orange hover:bg-windtre-orange/90 text-white"
                      data-testid="button-save-funnel-settings"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateFunnelMutation.isPending ? 'Salvataggio...' : 'Salva Modifiche'}
                    </Button>
                  </div>
                </Card>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="workflows" className="flex-1 overflow-y-auto space-y-6 p-4">
            {/* Info Banner */}
            <Card className="windtre-glass-panel p-4 border-l-4 border-windtre-orange">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-windtre-orange mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">Workflow di Funnel Orchestration</p>
                  <p className="text-xs text-gray-600">
                    I workflow a livello di funnel gestiscono transizioni intelligenti tra pipeline (es: da Lead Pipeline a Sales Pipeline).
                    Utilizzano i nodi speciali: AI Funnel Orchestrator, Funnel Stage Transition, Funnel Pipeline Transition, Funnel Exit, Deal Stage Webhook.
                  </p>
                </div>
              </div>
            </Card>

            {/* Add Workflow Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-windtre-orange" />
                Assegna Nuovo Workflow
              </h3>
              
              <Card className="windtre-glass-panel p-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-700 mb-2 block">
                      Workflow Template
                    </label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger data-testid="select-workflow-template">
                        <SelectValue placeholder="Seleziona un workflow template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {funnelOrchestrationTemplates.length === 0 ? (
                          <div className="p-4 text-sm text-gray-500 text-center">
                            Nessun workflow con nodi di funnel orchestration disponibile
                          </div>
                        ) : (
                          funnelOrchestrationTemplates.map((template: any) => (
                            <SelectItem key={template.id} value={template.id}>
                              <div className="flex items-center gap-2">
                                <Brain className="w-3 h-3 text-purple-600" />
                                {template.name}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-2 block">
                      Modalità Esecuzione
                    </label>
                    <Select value={selectedExecutionMode} onValueChange={(v) => setSelectedExecutionMode(v as 'automatic' | 'manual')}>
                      <SelectTrigger data-testid="select-execution-mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">
                          <div className="flex items-center gap-2">
                            Manuale
                          </div>
                        </SelectItem>
                        <SelectItem value="automatic">
                          <div className="flex items-center gap-2">
                            <Zap className="w-3 h-3 text-yellow-600" />
                            Automatico
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleAssignWorkflow}
                  disabled={!selectedTemplate || assignWorkflowMutation.isPending}
                  className="mt-4 bg-windtre-orange hover:bg-windtre-orange/90 text-white"
                  data-testid="button-assign-workflow"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {assignWorkflowMutation.isPending ? 'Assegnazione...' : 'Assegna Workflow'}
                </Button>
              </Card>
            </div>

            {/* Assigned Workflows List */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-windtre-purple" />
                Workflows Assegnati ({assignedWorkflows.length})
              </h3>

              {workflowsLoading ? (
                <LoadingState message="Caricamento workflows..." />
              ) : assignedWorkflows.length === 0 ? (
                <Card className="windtre-glass-panel p-8">
                  <div className="text-center">
                    <Workflow className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">Nessun workflow assegnato</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Assegna workflow per automatizzare l'orchestration tra pipeline
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-3">
                  {assignedWorkflows.map((workflow: any) => (
                    <Card 
                      key={workflow.id} 
                      className="windtre-glass-panel p-4 hover:shadow-md transition-shadow"
                      data-testid={`workflow-card-${workflow.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Brain className="w-5 h-5 text-purple-600" />
                            <h4 className="font-medium text-gray-900">{workflow.workflowTemplate?.name || 'Workflow Template'}</h4>
                            {workflow.executionMode === 'automatic' && (
                              <Badge className="bg-yellow-100 text-yellow-700">
                                <Zap className="w-3 h-3 mr-1" />
                                Automatico
                              </Badge>
                            )}
                            {!workflow.isActive && (
                              <Badge variant="secondary">Inattivo</Badge>
                            )}
                          </div>
                          
                          {workflow.workflowTemplate?.description && (
                            <p className="text-xs text-gray-600 mb-3">{workflow.workflowTemplate.description}</p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Assegnato da: {workflow.assignedBy || 'N/A'}</span>
                            {workflow.assignedAt && (
                              <span>il {new Date(workflow.assignedAt).toLocaleDateString('it-IT')}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleExecutionMode(workflow.id, workflow.executionMode)}
                            disabled={updateExecutionModeMutation.isPending}
                            data-testid={`button-toggle-mode-${workflow.id}`}
                            title={workflow.executionMode === 'automatic' ? 'Cambia a Manuale' : 'Cambia ad Automatico'}
                          >
                            {workflow.executionMode === 'automatic' ? 'Manuale' : 'Automatico'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveWorkflow(workflow.id)}
                            disabled={removeWorkflowMutation.isPending}
                            data-testid={`button-remove-workflow-${workflow.id}`}
                            title="Rimuovi workflow"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
