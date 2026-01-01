/**
 * Action Builder Tab - Visual wizard for creating custom MCP actions
 * 4-step process: Department → Action Type → Template → Variables
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { DEPARTMENT_STYLES, getDepartmentStyle } from '@/lib/constants/departments';
import { 
  Plus, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Info,
  Sparkles,
  Database,
  FileSearch,
  FilePlus,
  FileEdit,
  FileX,
  Calendar,
  Users,
  MapPin,
  Package,
  Flag,
  Hash,
  DollarSign,
  BarChart3,
  FileOutput,
  GitCompare,
  Copy,
  Pencil,
  Archive,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { format } from 'date-fns';

interface Variable {
  id: string;
  name: string;
  description: string;
  tooltip: string;
  type: string;
  table?: string;
  column?: string;
  example?: string;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}

interface VariableCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  variables: Variable[];
}

interface QueryTemplate {
  id: string;
  code: string;
  name: string;
  description: string;
  department: string;
  actionType: string;
  sqlTemplate: string;
  availableVariables: string[];
  requiredVariables: string[];
  involvedTables: string[];
}

interface CustomAction {
  id: string;
  code: string;
  name: string;
  description: string;
  department: string;
  mcpActionType: string;
  queryTemplateId: string;
  mcpInputSchema: any;
  isActive: boolean;
  createdAt: string;
}

const ACTION_TYPE_CONFIG = {
  read: { 
    label: 'READ', 
    description: 'Interroga dati dal database',
    icon: FileSearch, 
    color: 'bg-blue-500' 
  },
  create: { 
    label: 'CREATE', 
    description: 'Inserisce nuovi record',
    icon: FilePlus, 
    color: 'bg-green-500' 
  },
  update: { 
    label: 'UPDATE', 
    description: 'Modifica record esistenti',
    icon: FileEdit, 
    color: 'bg-yellow-500' 
  },
  delete: { 
    label: 'DELETE', 
    description: 'Archivia o elimina record',
    icon: FileX, 
    color: 'bg-red-500' 
  },
};

const CATEGORY_ICONS: Record<string, any> = {
  temporal: Calendar,
  people: Users,
  location: MapPin,
  products: Package,
  states: Flag,
  quantity: Hash,
  values: DollarSign,
  aggregation: BarChart3,
  output: FileOutput,
  comparison: GitCompare,
};

export function ActionBuilderTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedActionType, setSelectedActionType] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<QueryTemplate | null>(null);
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [requiredVariables, setRequiredVariables] = useState<string[]>([]);
  const [actionName, setActionName] = useState('');
  const [actionCode, setActionCode] = useState('');
  const [actionDescription, setActionDescription] = useState('');

  const { data: customActions = [], isLoading: isLoadingActions } = useQuery<CustomAction[]>({
    queryKey: ['/api/mcp-gateway/custom-actions'],
  });

  const { data: variableCategories = [] } = useQuery<VariableCategory[]>({
    queryKey: ['/api/mcp-gateway/variable-categories'],
  });

  const { data: queryTemplates = [] } = useQuery<QueryTemplate[]>({
    queryKey: ['/api/mcp-gateway/query-templates'],
  });

  const createActionMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/mcp-gateway/custom-actions', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp-gateway/custom-actions'] });
      toast({ title: 'Azione creata', description: 'La nuova azione custom è stata creata con successo.' });
      resetWizard();
    },
    onError: (error: any) => {
      toast({ title: 'Errore', description: error.message || 'Impossibile creare l\'azione.', variant: 'destructive' });
    }
  });

  const duplicateActionMutation = useMutation({
    mutationFn: (actionId: string) => apiRequest(`/api/mcp-gateway/custom-actions/${actionId}/duplicate`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp-gateway/custom-actions'] });
      toast({ title: 'Azione duplicata', description: 'L\'azione è stata duplicata con successo.' });
    }
  });

  const deleteActionMutation = useMutation({
    mutationFn: (actionId: string) => apiRequest(`/api/mcp-gateway/custom-actions/${actionId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp-gateway/custom-actions'] });
      toast({ title: 'Azione archiviata', description: 'L\'azione è stata archiviata con successo.' });
    }
  });

  const resetWizard = () => {
    setWizardOpen(false);
    setStep(1);
    setSelectedDepartment('');
    setSelectedActionType('');
    setSelectedTemplate(null);
    setSelectedVariables([]);
    setRequiredVariables([]);
    setActionName('');
    setActionCode('');
    setActionDescription('');
  };

  const filteredTemplates = queryTemplates.filter(t => 
    t.department === selectedDepartment && t.actionType === selectedActionType
  );

  const handleCreateAction = () => {
    if (!actionCode || !actionName || !selectedTemplate) {
      toast({ title: 'Campi obbligatori mancanti', variant: 'destructive' });
      return;
    }
    createActionMutation.mutate({
      code: actionCode.toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
      name: actionName,
      description: actionDescription,
      department: selectedDepartment,
      actionType: selectedActionType,
      queryTemplateId: selectedTemplate.id,
      selectedVariables,
      requiredVariables,
    });
  };

  const toggleVariable = (varId: string) => {
    if (selectedVariables.includes(varId)) {
      setSelectedVariables(selectedVariables.filter(v => v !== varId));
      setRequiredVariables(requiredVariables.filter(v => v !== varId));
    } else {
      setSelectedVariables([...selectedVariables, varId]);
    }
  };

  const toggleRequired = (varId: string) => {
    if (requiredVariables.includes(varId)) {
      setRequiredVariables(requiredVariables.filter(v => v !== varId));
    } else {
      setRequiredVariables([...requiredVariables, varId]);
    }
  };

  const getVariableDetails = (varId: string): Variable | undefined => {
    for (const cat of variableCategories) {
      const v = cat.variables.find(v => v.id === varId);
      if (v) return v;
    }
    return undefined;
  };

  const departments = Object.entries(DEPARTMENT_STYLES);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Action Builder</h2>
          <p className="text-sm text-gray-500 mt-1">
            Crea azioni personalizzate esposte via MCP per integrazioni esterne
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)} className="gap-2" data-testid="btn-create-custom-action">
          <Plus className="h-4 w-4" />
          Nuova Azione Custom
        </Button>
      </div>

      {/* Custom Actions List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Azioni Custom Attive</CardTitle>
          <CardDescription>Azioni create con Action Builder esposte via MCP Gateway</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingActions ? (
            <div className="text-center py-8 text-gray-500">Caricamento...</div>
          ) : customActions.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">Nessuna azione custom creata</p>
              <Button variant="outline" onClick={() => setWizardOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Crea la tua prima azione
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codice</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Dipartimento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Variabili</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customActions.map((action) => {
                  const deptStyle = getDepartmentStyle(action.department);
                  const typeConfig = ACTION_TYPE_CONFIG[action.mcpActionType as keyof typeof ACTION_TYPE_CONFIG];
                  const variablesCount = action.mcpInputSchema?.properties ? Object.keys(action.mcpInputSchema.properties).length : 0;
                  
                  return (
                    <TableRow key={action.id} data-testid={`row-action-${action.id}`}>
                      <TableCell className="font-mono text-sm">{action.code}</TableCell>
                      <TableCell className="font-medium">{action.name}</TableCell>
                      <TableCell>
                        <Badge className={`${deptStyle.bgColor} ${deptStyle.textColor} border-0`}>
                          {deptStyle.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {typeConfig?.icon && <typeConfig.icon className="h-3 w-3" />}
                          {typeConfig?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{variablesCount} parametri</span>
                      </TableCell>
                      <TableCell>
                        {action.isActive ? (
                          <Badge className="bg-green-100 text-green-700 border-0">Attiva</Badge>
                        ) : (
                          <Badge variant="secondary">Archiviata</Badge>
                        )}
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
                                  onClick={() => duplicateActionMutation.mutate(action.id)}
                                  data-testid={`btn-duplicate-${action.id}`}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Duplica</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => deleteActionMutation.mutate(action.id)}
                                  data-testid={`btn-delete-${action.id}`}
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Archivia</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Wizard Dialog */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-500" />
              Action Builder
            </DialogTitle>
            <DialogDescription>
              Crea una nuova azione custom in {4 - step + 1} passaggi
            </DialogDescription>
          </DialogHeader>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 py-4 border-b">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  s < step ? 'bg-green-500 text-white' :
                  s === step ? 'bg-orange-500 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {s < step ? <Check className="h-4 w-4" /> : s}
                </div>
                <span className={`ml-2 text-sm ${s === step ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                  {s === 1 && 'Dipartimento'}
                  {s === 2 && 'Tipo Azione'}
                  {s === 3 && 'Template'}
                  {s === 4 && 'Variabili'}
                </span>
                {s < 4 && <ArrowRight className="h-4 w-4 mx-4 text-gray-300" />}
              </div>
            ))}
          </div>

          <ScrollArea className="flex-1 py-4">
            <AnimatePresence mode="wait">
              {/* Step 1: Department Selection */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="grid grid-cols-3 gap-4 p-4"
                >
                  {departments.map(([key, style]) => (
                    <Card 
                      key={key}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedDepartment === key ? 'ring-2 ring-orange-500 shadow-md' : ''
                      }`}
                      onClick={() => setSelectedDepartment(key)}
                      data-testid={`dept-${key}`}
                    >
                      <CardContent className="p-4 flex flex-col items-center text-center">
                        <div className={`w-12 h-12 rounded-xl ${style.bgColor} flex items-center justify-center mb-3`}>
                          <style.icon className={`h-6 w-6 ${style.textColor}`} />
                        </div>
                        <h3 className="font-medium text-gray-900">{style.label}</h3>
                        <p className="text-xs text-gray-500 mt-1">{style.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </motion.div>
              )}

              {/* Step 2: Action Type Selection */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="grid grid-cols-2 gap-4 p-4"
                >
                  {Object.entries(ACTION_TYPE_CONFIG).map(([key, config]) => (
                    <Card 
                      key={key}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedActionType === key ? 'ring-2 ring-orange-500 shadow-md' : ''
                      }`}
                      onClick={() => setSelectedActionType(key)}
                      data-testid={`type-${key}`}
                    >
                      <CardContent className="p-6 flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl ${config.color} flex items-center justify-center`}>
                          <config.icon className="h-7 w-7 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{config.label}</h3>
                          <p className="text-sm text-gray-500">{config.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </motion.div>
              )}

              {/* Step 3: Template Selection */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4 p-4"
                >
                  {filteredTemplates.length === 0 ? (
                    <div className="text-center py-12">
                      <Database className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">
                        Nessun template disponibile per {getDepartmentStyle(selectedDepartment).label} - {selectedActionType.toUpperCase()}
                      </p>
                    </div>
                  ) : (
                    filteredTemplates.map((template) => (
                      <Card 
                        key={template.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedTemplate?.id === template.id ? 'ring-2 ring-orange-500 shadow-md' : ''
                        }`}
                        onClick={() => {
                          setSelectedTemplate(template);
                          setSelectedVariables([...template.requiredVariables]);
                          setRequiredVariables([...template.requiredVariables]);
                        }}
                        data-testid={`template-${template.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-gray-900">{template.name}</h3>
                              <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                              <div className="flex items-center gap-2 mt-3">
                                <Badge variant="outline" className="text-xs">
                                  {template.availableVariables.length} variabili
                                </Badge>
                                {template.requiredVariables.length > 0 && (
                                  <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                                    {template.requiredVariables.length} obbligatorie
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {selectedTemplate?.id === template.id && (
                              <Check className="h-5 w-5 text-orange-500" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </motion.div>
              )}

              {/* Step 4: Variable Configuration */}
              {step === 4 && selectedTemplate && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6 p-4"
                >
                  {/* Action Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="actionCode">Codice Azione *</Label>
                      <Input
                        id="actionCode"
                        value={actionCode}
                        onChange={(e) => setActionCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                        placeholder="ES. HR_VERIFICA_FERIE"
                        className="font-mono"
                        data-testid="input-action-code"
                      />
                    </div>
                    <div>
                      <Label htmlFor="actionName">Nome Azione *</Label>
                      <Input
                        id="actionName"
                        value={actionName}
                        onChange={(e) => setActionName(e.target.value)}
                        placeholder="Es. Verifica Saldo Ferie"
                        data-testid="input-action-name"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="actionDescription">Descrizione</Label>
                    <Textarea
                      id="actionDescription"
                      value={actionDescription}
                      onChange={(e) => setActionDescription(e.target.value)}
                      placeholder="Descrizione opzionale dell'azione..."
                      rows={2}
                      data-testid="input-action-description"
                    />
                  </div>

                  {/* Variable Selection */}
                  <div>
                    <Label className="mb-3 block">Seleziona Variabili</Label>
                    <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                      {selectedTemplate.availableVariables.map((varId) => {
                        const variable = getVariableDetails(varId);
                        const isSelected = selectedVariables.includes(varId);
                        const isRequired = requiredVariables.includes(varId);
                        const isTemplateRequired = selectedTemplate.requiredVariables.includes(varId);
                        
                        return (
                          <div key={varId} className={`p-3 flex items-center gap-4 ${isSelected ? 'bg-orange-50' : ''}`}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleVariable(varId)}
                              disabled={isTemplateRequired}
                              data-testid={`var-${varId}`}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm text-gray-900">{varId}</span>
                                {variable && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Info className="h-4 w-4 text-gray-400" />
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs">
                                        <p className="font-medium">{variable.name}</p>
                                        <p className="text-sm text-gray-400 mt-1">{variable.tooltip}</p>
                                        {variable.table && (
                                          <p className="text-xs text-gray-500 mt-2">
                                            📍 {variable.table}.{variable.column}
                                          </p>
                                        )}
                                        {variable.example && (
                                          <p className="text-xs text-gray-500">
                                            Esempio: {variable.example}
                                          </p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {isTemplateRequired && (
                                  <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                                    obbligatoria
                                  </Badge>
                                )}
                              </div>
                              {variable && (
                                <p className="text-xs text-gray-500 mt-0.5">{variable.description}</p>
                              )}
                            </div>
                            {isSelected && !isTemplateRequired && (
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={isRequired}
                                  onCheckedChange={() => toggleRequired(varId)}
                                  data-testid={`var-required-${varId}`}
                                />
                                <span className="text-xs text-gray-500">Obbligatoria</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </ScrollArea>

          <DialogFooter className="border-t pt-4">
            <div className="flex justify-between w-full">
              <Button
                variant="outline"
                onClick={() => step > 1 ? setStep(step - 1) : resetWizard()}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {step > 1 ? 'Indietro' : 'Annulla'}
              </Button>
              <Button
                onClick={() => {
                  if (step < 4) {
                    setStep(step + 1);
                  } else {
                    handleCreateAction();
                  }
                }}
                disabled={
                  (step === 1 && !selectedDepartment) ||
                  (step === 2 && !selectedActionType) ||
                  (step === 3 && !selectedTemplate) ||
                  (step === 4 && (!actionCode || !actionName))
                }
                className="gap-2"
                data-testid="btn-wizard-next"
              >
                {step < 4 ? (
                  <>
                    Avanti
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Crea Azione
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
