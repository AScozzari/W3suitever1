import { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  ChevronRight, 
  Save, 
  Copy,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface ApprovalStep {
  id?: string;
  order: number;
  name: string;
  description?: string;
  approverType: 'role' | 'position' | 'user' | 'dynamic';
  approverId?: string;
  conditions?: {
    field: string;
    operator: string;
    value: any;
  }[];
  escalationTimeout?: number;
  escalationTarget?: string;
  canSkip?: boolean;
  requireAllApprovers?: boolean;
}

interface WorkflowConfig {
  id?: string;
  name: string;
  description?: string;
  serviceType: string;
  requestTypes: string[];
  steps: ApprovalStep[];
  isActive: boolean;
  priority: number;
  conditions?: any;
}

interface WorkflowConfiguratorProps {
  serviceType: string;
  serviceName: string;
  serviceColor: string;
  workflows: WorkflowConfig[];
  onSave: (workflow: WorkflowConfig) => Promise<void>;
  onDelete: (workflowId: string) => Promise<void>;
  availableRoles?: Array<{ id: string; name: string }>;
  availablePositions?: Array<{ id: string; name: string }>;
}

export function WorkflowConfigurator({
  serviceType,
  serviceName,
  serviceColor,
  workflows = [],
  onSave,
  onDelete,
  availableRoles = [],
  availablePositions = []
}: WorkflowConfiguratorProps) {
  const { toast } = useToast();
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowConfig | null>(null);
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);

  // Request types per service
  const requestTypesByService: Record<string, Array<{ id: string; name: string }>> = {
    hr: [
      { id: 'vacation', name: 'Ferie' },
      { id: 'sick_leave', name: 'Malattia' },
      { id: 'permit', name: 'Permesso' },
      { id: 'training', name: 'Formazione' },
      { id: 'expense', name: 'Nota Spese' }
    ],
    finance: [
      { id: 'purchase_order', name: 'Ordine di Acquisto' },
      { id: 'invoice_approval', name: 'Approvazione Fattura' },
      { id: 'budget_request', name: 'Richiesta Budget' },
      { id: 'payment_auth', name: 'Autorizzazione Pagamento' }
    ],
    operations: [
      { id: 'maintenance', name: 'Manutenzione' },
      { id: 'supply_request', name: 'Richiesta Forniture' },
      { id: 'access_control', name: 'Controllo Accessi' },
      { id: 'safety_report', name: 'Report Sicurezza' }
    ],
    it: [
      { id: 'software_request', name: 'Richiesta Software' },
      { id: 'hardware_request', name: 'Richiesta Hardware' },
      { id: 'access_request', name: 'Richiesta Accessi' },
      { id: 'incident', name: 'Segnalazione Incidente' }
    ],
    sales: [
      { id: 'discount_approval', name: 'Approvazione Sconto' },
      { id: 'contract_approval', name: 'Approvazione Contratto' },
      { id: 'commission_adjustment', name: 'Modifica Commissioni' },
      { id: 'territory_change', name: 'Cambio Territorio' }
    ]
  };

  const requestTypes = requestTypesByService[serviceType] || [];

  const createNewWorkflow = (): WorkflowConfig => ({
    name: `Nuovo Workflow ${serviceName}`,
    description: '',
    serviceType,
    requestTypes: [],
    steps: [
      {
        order: 1,
        name: 'Approvazione Manager',
        approverType: 'position',
        canSkip: false
      }
    ],
    isActive: true,
    priority: workflows.length + 1,
    conditions: {}
  });

  const addStep = () => {
    if (!editingWorkflow) return;
    
    const newStep: ApprovalStep = {
      order: editingWorkflow.steps.length + 1,
      name: `Step ${editingWorkflow.steps.length + 1}`,
      approverType: 'role',
      canSkip: false
    };
    
    setEditingWorkflow({
      ...editingWorkflow,
      steps: [...editingWorkflow.steps, newStep]
    });
  };

  const removeStep = (index: number) => {
    if (!editingWorkflow) return;
    
    const updatedSteps = editingWorkflow.steps.filter((_, i) => i !== index);
    // Reorder steps
    updatedSteps.forEach((step, i) => {
      step.order = i + 1;
    });
    
    setEditingWorkflow({
      ...editingWorkflow,
      steps: updatedSteps
    });
  };

  const updateStep = (index: number, updates: Partial<ApprovalStep>) => {
    if (!editingWorkflow) return;
    
    const updatedSteps = [...editingWorkflow.steps];
    updatedSteps[index] = { ...updatedSteps[index], ...updates };
    
    setEditingWorkflow({
      ...editingWorkflow,
      steps: updatedSteps
    });
  };

  const saveWorkflow = async () => {
    if (!editingWorkflow) return;
    
    if (!editingWorkflow.name.trim()) {
      toast({
        title: 'Errore',
        description: 'Il nome del workflow è obbligatorio',
        variant: 'destructive'
      });
      return;
    }
    
    if (editingWorkflow.requestTypes.length === 0) {
      toast({
        title: 'Errore',
        description: 'Seleziona almeno un tipo di richiesta',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      await onSave(editingWorkflow);
      toast({
        title: 'Successo',
        description: 'Workflow salvato correttamente'
      });
      setEditingWorkflow(null);
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile salvare il workflow',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Lista Workflow Esistenti */}
      <div className="space-y-4">
        {workflows.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Nessun workflow configurato per {serviceName}</p>
              <Button
                onClick={() => setEditingWorkflow(createNewWorkflow())}
                className="mt-4"
                style={{ background: `linear-gradient(135deg, ${serviceColor}, ${serviceColor}88)` }}
                data-testid={`workflow-create-${serviceType}`}
              >
                <Plus size={16} className="mr-2" />
                Crea Primo Workflow
              </Button>
            </CardContent>
          </Card>
        ) : (
          workflows.map((workflow) => (
            <Card key={workflow.id} className="overflow-hidden">
              <CardHeader 
                className="cursor-pointer"
                onClick={() => setExpandedWorkflow(
                  expandedWorkflow === workflow.id ? null : workflow.id
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ChevronRight 
                      size={20} 
                      className={`transition-transform ${
                        expandedWorkflow === workflow.id ? 'rotate-90' : ''
                      }`}
                    />
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {workflow.name}
                        {workflow.isActive ? (
                          <Badge variant="success" className="text-xs">
                            <CheckCircle size={12} className="mr-1" />
                            Attivo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Inattivo
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {workflow.steps.length} step di approvazione • 
                        {workflow.requestTypes.length} tipi di richiesta
                      </CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingWorkflow(workflow);
                      }}
                      data-testid={`workflow-edit-${workflow.id}`}
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newWorkflow = { ...workflow, id: undefined, name: `${workflow.name} (Copia)` };
                        setEditingWorkflow(newWorkflow);
                      }}
                      data-testid={`workflow-duplicate-${workflow.id}`}
                    >
                      <Copy size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm('Sei sicuro di voler eliminare questo workflow?')) {
                          await onDelete(workflow.id!);
                        }
                      }}
                      data-testid={`workflow-delete-${workflow.id}`}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {expandedWorkflow === workflow.id && (
                <CardContent className="border-t">
                  <div className="space-y-4 mt-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Tipi di Richiesta:</p>
                      <div className="flex flex-wrap gap-2">
                        {workflow.requestTypes.map((typeId) => {
                          const type = requestTypes.find(t => t.id === typeId);
                          return (
                            <Badge key={typeId} variant="outline">
                              {type?.name || typeId}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-2">Step di Approvazione:</p>
                      <div className="space-y-2">
                        {workflow.steps.map((step, index) => (
                          <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                            <Badge className="w-8 h-8 rounded-full p-0 flex items-center justify-center">
                              {step.order}
                            </Badge>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{step.name}</p>
                              <p className="text-xs text-gray-500">
                                Tipo: {step.approverType === 'role' ? 'Ruolo' : 
                                       step.approverType === 'position' ? 'Posizione' :
                                       step.approverType === 'user' ? 'Utente' : 'Dinamico'}
                              </p>
                            </div>
                            {step.canSkip && (
                              <Badge variant="secondary" className="text-xs">
                                Opzionale
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Pulsante Nuovo Workflow */}
      {workflows.length > 0 && !editingWorkflow && (
        <Button
          onClick={() => setEditingWorkflow(createNewWorkflow())}
          style={{ background: `linear-gradient(135deg, ${serviceColor}, ${serviceColor}88)` }}
          data-testid={`workflow-add-${serviceType}`}
        >
          <Plus size={16} className="mr-2" />
          Aggiungi Workflow
        </Button>
      )}

      {/* Editor Workflow */}
      {editingWorkflow && (
        <Card className="border-2" style={{ borderColor: serviceColor }}>
          <CardHeader>
            <CardTitle>
              {editingWorkflow.id ? 'Modifica Workflow' : 'Nuovo Workflow'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="workflow-name">Nome Workflow</Label>
                <Input
                  id="workflow-name"
                  value={editingWorkflow.name}
                  onChange={(e) => setEditingWorkflow({ ...editingWorkflow, name: e.target.value })}
                  placeholder="es. Approvazione Ferie Standard"
                  data-testid="workflow-name-input"
                />
              </div>
              
              <div>
                <Label htmlFor="workflow-description">Descrizione</Label>
                <Textarea
                  id="workflow-description"
                  value={editingWorkflow.description || ''}
                  onChange={(e) => setEditingWorkflow({ ...editingWorkflow, description: e.target.value })}
                  placeholder="Descrizione del workflow..."
                  rows={3}
                  data-testid="workflow-description-input"
                />
              </div>

              <div>
                <Label>Tipi di Richiesta</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {requestTypes.map((type) => (
                    <label key={type.id} className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={editingWorkflow.requestTypes.includes(type.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingWorkflow({
                              ...editingWorkflow,
                              requestTypes: [...editingWorkflow.requestTypes, type.id]
                            });
                          } else {
                            setEditingWorkflow({
                              ...editingWorkflow,
                              requestTypes: editingWorkflow.requestTypes.filter(t => t !== type.id)
                            });
                          }
                        }}
                        data-testid={`workflow-type-${type.id}`}
                      />
                      <Badge variant="outline">{type.name}</Badge>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="workflow-active"
                    checked={editingWorkflow.isActive}
                    onCheckedChange={(checked) => setEditingWorkflow({ ...editingWorkflow, isActive: checked })}
                    data-testid="workflow-active-switch"
                  />
                  <Label htmlFor="workflow-active">Workflow Attivo</Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Label htmlFor="workflow-priority">Priorità</Label>
                  <Input
                    id="workflow-priority"
                    type="number"
                    min="1"
                    className="w-20"
                    value={editingWorkflow.priority}
                    onChange={(e) => setEditingWorkflow({ 
                      ...editingWorkflow, 
                      priority: parseInt(e.target.value) || 1 
                    })}
                    data-testid="workflow-priority-input"
                  />
                </div>
              </div>
            </div>

            {/* Step di Approvazione */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label>Step di Approvazione</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addStep}
                  data-testid="workflow-add-step"
                >
                  <Plus size={16} className="mr-2" />
                  Aggiungi Step
                </Button>
              </div>
              
              <div className="space-y-4">
                {editingWorkflow.steps.map((step, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <Badge className="mt-1">{step.order}</Badge>
                        
                        <div className="flex-1 space-y-3">
                          <Input
                            value={step.name}
                            onChange={(e) => updateStep(index, { name: e.target.value })}
                            placeholder="Nome dello step"
                            data-testid={`step-name-${index}`}
                          />
                          
                          <div className="grid grid-cols-2 gap-3">
                            <Select
                              value={step.approverType}
                              onValueChange={(value) => updateStep(index, { 
                                approverType: value as any,
                                approverId: undefined 
                              })}
                            >
                              <SelectTrigger data-testid={`step-type-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="role">Ruolo</SelectItem>
                                <SelectItem value="position">Posizione</SelectItem>
                                <SelectItem value="user">Utente Specifico</SelectItem>
                                <SelectItem value="dynamic">Dinamico</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            {step.approverType === 'role' && (
                              <Select
                                value={step.approverId || ''}
                                onValueChange={(value) => updateStep(index, { approverId: value })}
                              >
                                <SelectTrigger data-testid={`step-approver-${index}`}>
                                  <SelectValue placeholder="Seleziona ruolo" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableRoles.map(role => (
                                    <SelectItem key={role.id} value={role.id}>
                                      {role.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            
                            {step.approverType === 'position' && (
                              <Select
                                value={step.approverId || ''}
                                onValueChange={(value) => updateStep(index, { approverId: value })}
                              >
                                <SelectTrigger data-testid={`step-approver-${index}`}>
                                  <SelectValue placeholder="Seleziona posizione" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availablePositions.map(pos => (
                                    <SelectItem key={pos.id} value={pos.id}>
                                      {pos.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={step.canSkip || false}
                                onChange={(e) => updateStep(index, { canSkip: e.target.checked })}
                                data-testid={`step-optional-${index}`}
                              />
                              <span className="text-sm">Step Opzionale</span>
                            </label>
                            
                            {step.approverType === 'role' && (
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={step.requireAllApprovers || false}
                                  onChange={(e) => updateStep(index, { requireAllApprovers: e.target.checked })}
                                  data-testid={`step-require-all-${index}`}
                                />
                                <span className="text-sm">Richiedi tutti gli approvatori</span>
                              </label>
                            )}
                          </div>
                        </div>
                        
                        {editingWorkflow.steps.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => removeStep(index)}
                            data-testid={`step-delete-${index}`}
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Azioni */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setEditingWorkflow(null)}
                data-testid="workflow-cancel"
              >
                Annulla
              </Button>
              <Button
                onClick={saveWorkflow}
                style={{ background: `linear-gradient(135deg, ${serviceColor}, ${serviceColor}88)` }}
                data-testid="workflow-save"
              >
                <Save size={16} className="mr-2" />
                Salva Workflow
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default WorkflowConfigurator;