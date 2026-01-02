/**
 * Action Builder Tab - Visual wizard for creating custom MCP actions
 * 4-step process: Info (Nome/Desc/Categoria) → Dipartimento → Template → Variabili
 * Struttura gerarchica: Dipartimento → Templates (figli) → Variabili (figlie del template)
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { DEPARTMENT_STYLES, getDepartmentStyle } from '@/lib/constants/departments';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  MoreHorizontal,
  Search,
  X
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
  const [actionCategory, setActionCategory] = useState<'operative' | 'query'>('query');
  const [editingAction, setEditingAction] = useState<CustomAction | null>(null);
  
  // Filtri per la lista azioni
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: customActions = [], isLoading: isLoadingActions } = useQuery<CustomAction[]>({
    queryKey: ['/api/mcp-gateway/custom-actions?showAll=true'],
    select: (response: any) => {
      const rawActions = response?.data || response || [];
      return rawActions.map((action: any) => ({
        ...action,
        code: action.actionId || action.code,
        name: action.actionName || action.name,
      }));
    }
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
      queryClient.invalidateQueries({ queryKey: ['/api/mcp-gateway/custom-actions?showAll=true'] });
      toast({ title: 'Azione creata', description: 'La nuova azione custom è stata creata con successo.' });
      resetWizard();
    },
    onError: (error: any) => {
      toast({ title: 'Errore', description: error.message || 'Impossibile creare l\'azione.', variant: 'destructive' });
    }
  });

  const updateActionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest(`/api/mcp-gateway/custom-actions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp-gateway/custom-actions?showAll=true'] });
      toast({ title: 'Azione aggiornata', description: 'L\'azione è stata modificata con successo.' });
      resetWizard();
    },
    onError: (error: any) => {
      toast({ title: 'Errore', description: error.message || 'Impossibile aggiornare l\'azione.', variant: 'destructive' });
    }
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedActionForAction, setSelectedActionForAction] = useState<CustomAction | null>(null);

  const archiveActionMutation = useMutation({
    mutationFn: (actionId: string) => apiRequest(`/api/mcp-gateway/custom-actions/${actionId}`, { 
      method: 'PATCH', 
      body: JSON.stringify({ isActive: false }) 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp-gateway/custom-actions?showAll=true'] });
      toast({ title: 'Azione archiviata', description: 'L\'azione è stata archiviata con successo.' });
      setArchiveDialogOpen(false);
    }
  });

  const deleteActionMutation = useMutation({
    mutationFn: (actionId: string) => apiRequest(`/api/mcp-gateway/custom-actions/${actionId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/mcp-gateway/custom-actions?showAll=true'] });
      toast({ title: 'Azione eliminata', description: 'L\'azione è stata eliminata definitivamente.' });
      setDeleteDialogOpen(false);
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
    setActionCategory('query');
    setEditingAction(null);
  };

  const openEditWizard = (action: CustomAction) => {
    setEditingAction(action);
    setActionCode(action.code || '');
    setActionName(action.name || '');
    setActionDescription(action.mcpDescription || '');
    setActionCategory((action as any).actionCategory === 'operative' ? 'operative' : 'query');
    setSelectedDepartment(action.department || '');
    setSelectedActionType(action.mcpActionType || '');
    
    // Extract variables from inputSchema
    const inputProps = action.mcpInputSchema?.properties || {};
    const varIds = Object.keys(inputProps);
    setSelectedVariables(varIds);
    
    const required = action.mcpInputSchema?.required || [];
    setRequiredVariables(required);
    
    // Find matching template if possible
    const matchingTemplate = queryTemplates.find(t => t.department === action.department);
    setSelectedTemplate(matchingTemplate || null);
    
    setStep(1);
    setWizardOpen(true);
  };

  // Filtra templates per dipartimento (struttura gerarchica)
  const filteredTemplates = queryTemplates.filter(t => t.department === selectedDepartment);
  
  // Estrai dipartimenti che hanno almeno un template disponibile
  const availableDepartments = [...new Set(queryTemplates.map(t => t.department))];

  const handleSaveAction = () => {
    if (!actionCode || !actionName) {
      toast({ title: 'Campi obbligatori mancanti', variant: 'destructive' });
      return;
    }
    
    const actionData = {
      code: actionCode.toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
      name: actionName,
      description: actionDescription,
      department: selectedDepartment,
      actionType: selectedActionType,
      actionCategory,
      queryTemplateId: selectedTemplate?.id,
      selectedVariables,
      requiredVariables,
    };

    if (editingAction) {
      updateActionMutation.mutate({ id: editingAction.id, data: actionData });
    } else {
      if (!selectedTemplate) {
        toast({ title: 'Seleziona un template', variant: 'destructive' });
        return;
      }
      createActionMutation.mutate(actionData);
    }
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

  // Filtra le azioni custom in base ai filtri attivi
  const filteredActions = customActions.filter((action) => {
    // Ricerca libera (codice, nome, descrizione)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        action.code?.toLowerCase().includes(query) ||
        action.name?.toLowerCase().includes(query) ||
        action.description?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    // Filtro dipartimento
    if (filterDepartment !== 'all' && action.department !== filterDepartment) return false;
    // Filtro tipo azione
    if (filterType !== 'all' && action.mcpActionType !== filterType) return false;
    // Filtro categoria
    if (filterCategory !== 'all') {
      const category = (action as any).actionCategory || 'query';
      if (category !== filterCategory) return false;
    }
    // Filtro stato
    if (filterStatus !== 'all') {
      const isActive = action.isActive;
      if (filterStatus === 'active' && !isActive) return false;
      if (filterStatus === 'archived' && isActive) return false;
    }
    return true;
  });

  const hasActiveFilters = searchQuery || filterDepartment !== 'all' || filterType !== 'all' || filterCategory !== 'all' || filterStatus !== 'all';
  
  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterDepartment('all');
    setFilterType('all');
    setFilterCategory('all');
    setFilterStatus('all');
  };

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Azioni Custom</CardTitle>
              <CardDescription>Azioni create con Action Builder esposte via MCP Gateway</CardDescription>
            </div>
            <div className="text-sm text-gray-500">
              {filteredActions.length} di {customActions.length} azioni
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtri */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Ricerca libera */}
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cerca per codice, nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-actions"
              />
            </div>
            
            {/* Filtro Dipartimento */}
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-[150px]" data-testid="select-filter-department">
                <SelectValue placeholder="Dipartimento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i Dipartimenti</SelectItem>
                {Object.entries(DEPARTMENT_STYLES).map(([key, style]) => (
                  <SelectItem key={key} value={key}>{style.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Filtro Tipo */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[120px]" data-testid="select-filter-type">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i Tipi</SelectItem>
                <SelectItem value="read">READ</SelectItem>
                <SelectItem value="create">CREATE</SelectItem>
                <SelectItem value="update">UPDATE</SelectItem>
                <SelectItem value="delete">DELETE</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Filtro Categoria */}
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[140px]" data-testid="select-filter-category">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le Categorie</SelectItem>
                <SelectItem value="operative">Operativa</SelectItem>
                <SelectItem value="query">MCP Query</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Filtro Stato */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[120px]" data-testid="select-filter-status">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli Stati</SelectItem>
                <SelectItem value="active">Attiva</SelectItem>
                <SelectItem value="archived">Archiviata</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Pulsante reset filtri */}
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllFilters}
                className="text-gray-500 hover:text-gray-700"
                data-testid="btn-clear-filters"
              >
                <X className="h-4 w-4 mr-1" />
                Pulisci filtri
              </Button>
            )}
          </div>

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
          ) : filteredActions.length === 0 && hasActiveFilters ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">Nessuna azione corrisponde ai filtri selezionati</p>
              <Button variant="outline" onClick={clearAllFilters} className="gap-2">
                <X className="h-4 w-4" />
                Pulisci filtri
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
                  <TableHead>Categoria</TableHead>
                  <TableHead>Variabili</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActions.map((action) => {
                  const deptStyle = getDepartmentStyle(action.department);
                  const typeConfig = ACTION_TYPE_CONFIG[action.mcpActionType as keyof typeof ACTION_TYPE_CONFIG];
                  const variablesCount = action.mcpInputSchema?.properties ? Object.keys(action.mcpInputSchema.properties).length : 0;
                  
                  return (
                    <TableRow key={action.id} data-testid={`row-action-${action.id}`}>
                      <TableCell className="font-mono text-sm">{action.code}</TableCell>
                      <TableCell className="font-medium">{action.name}</TableCell>
                      <TableCell>
                        <Badge className={`${deptStyle.color} ${deptStyle.textColor} border-0`}>
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
                        <Badge className={`${(action as any).actionCategory === 'operative' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'} border-0`}>
                          {(action as any).actionCategory === 'operative' ? 'Operativa' : 'MCP Query'}
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
                                  onClick={() => openEditWizard(action)}
                                  data-testid={`btn-edit-${action.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Modifica</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                                  onClick={() => { setSelectedActionForAction(action); setArchiveDialogOpen(true); }}
                                  data-testid={`btn-archive-${action.id}`}
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Archivia</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => { setSelectedActionForAction(action); setDeleteDialogOpen(true); }}
                                  data-testid={`btn-delete-${action.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Elimina</TooltipContent>
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
              {editingAction ? 'Modifica Azione' : 'Action Builder'}
            </DialogTitle>
            <DialogDescription>
              Crea una nuova azione custom in {4 - step + 1} passaggi
            </DialogDescription>
          </DialogHeader>

          {/* Progress Steps - Nuovo ordine: Info → Dipartimento → Template → Variabili */}
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
                  {s === 1 && 'Info Azione'}
                  {s === 2 && 'Dipartimento'}
                  {s === 3 && 'Template'}
                  {s === 4 && 'Variabili'}
                </span>
                {s < 4 && <ArrowRight className="h-4 w-4 mx-4 text-gray-300" />}
              </div>
            ))}
          </div>

          <ScrollArea className="flex-1 py-4">
            <AnimatePresence mode="wait">
              {/* Step 1: Info Azione (Nome, Descrizione, Categoria) */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6 p-4"
                >
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
                      <p className="text-xs text-gray-400 mt-1">Identificativo univoco per MCP</p>
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
                      <p className="text-xs text-gray-400 mt-1">Nome descrittivo per l'interfaccia</p>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="actionDescription">Descrizione</Label>
                    <Textarea
                      id="actionDescription"
                      value={actionDescription}
                      onChange={(e) => setActionDescription(e.target.value)}
                      placeholder="Descrizione dettagliata di cosa fa questa azione..."
                      rows={3}
                      data-testid="input-action-description"
                    />
                  </div>

                  {/* Categoria Azione */}
                  <div>
                    <Label className="mb-3 block">Categoria Azione *</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <Card 
                        className={`cursor-pointer transition-all ${actionCategory === 'operative' ? 'ring-2 ring-orange-500 bg-orange-50' : 'hover:bg-gray-50'}`}
                        onClick={() => setActionCategory('operative')}
                        data-testid="btn-category-operative"
                      >
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${actionCategory === 'operative' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            <Users className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">Operativa</p>
                            <p className="text-xs text-gray-500">Assegnabile a Team + Workflow</p>
                          </div>
                          {actionCategory === 'operative' && <Check className="h-5 w-5 text-orange-500" />}
                        </CardContent>
                      </Card>
                      <Card 
                        className={`cursor-pointer transition-all ${actionCategory === 'query' ? 'ring-2 ring-purple-500 bg-purple-50' : 'hover:bg-gray-50'}`}
                        onClick={() => setActionCategory('query')}
                        data-testid="btn-category-query"
                      >
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${actionCategory === 'query' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            <Database className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">MCP Query</p>
                            <p className="text-xs text-gray-500">Solo interrogazione dati</p>
                          </div>
                          {actionCategory === 'query' && <Check className="h-5 w-5 text-purple-500" />}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Dipartimento (solo quelli con templates) */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4 p-4"
                >
                  <p className="text-sm text-gray-600 mb-4">
                    Seleziona il dipartimento per cui creare l'azione. Verranno mostrati solo i dipartimenti con template disponibili.
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    {availableDepartments.map((deptKey) => {
                      const style = getDepartmentStyle(deptKey);
                      const templateCount = queryTemplates.filter(t => t.department === deptKey).length;
                      return (
                        <Card 
                          key={deptKey}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            selectedDepartment === deptKey ? 'ring-2 ring-orange-500 shadow-md' : ''
                          }`}
                          onClick={() => setSelectedDepartment(deptKey)}
                          data-testid={`dept-${deptKey}`}
                        >
                          <CardContent className="p-4 flex flex-col items-center text-center">
                            <div className={`w-12 h-12 rounded-xl ${style.color} flex items-center justify-center mb-3`}>
                              <style.icon className={`h-6 w-6 ${style.textColor}`} />
                            </div>
                            <h3 className="font-medium text-gray-900">{style.label}</h3>
                            <Badge variant="outline" className="text-xs mt-2">
                              {templateCount} template{templateCount !== 1 ? 's' : ''}
                            </Badge>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  {availableDepartments.length === 0 && (
                    <div className="text-center py-12">
                      <Database className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">Nessun template disponibile nel sistema</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 3: Template Selection (figli del dipartimento) */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col p-4"
                >
                  <p className="text-sm text-gray-600 mb-4">
                    Templates disponibili per <strong>{getDepartmentStyle(selectedDepartment).label}</strong>
                  </p>
                  {filteredTemplates.length === 0 ? (
                    <div className="text-center py-12">
                      <Database className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">
                        Nessun template disponibile per {getDepartmentStyle(selectedDepartment).label}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {filteredTemplates.map((template) => {
                      const typeConfig = ACTION_TYPE_CONFIG[template.actionType as keyof typeof ACTION_TYPE_CONFIG];
                      return (
                        <Card 
                          key={template.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            selectedTemplate?.id === template.id ? 'ring-2 ring-orange-500 shadow-md' : ''
                          }`}
                          onClick={() => {
                            setSelectedTemplate(template);
                            setSelectedActionType(template.actionType);
                            setSelectedVariables([...template.requiredVariables]);
                            setRequiredVariables([...template.requiredVariables]);
                          }}
                          data-testid={`template-${template.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                                  {typeConfig && (
                                    <Badge className={`${typeConfig.color} text-white text-xs`}>
                                      {typeConfig.label}
                                    </Badge>
                                  )}
                                  <TooltipProvider delayDuration={100}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button className="text-gray-400 hover:text-orange-500 transition-colors">
                                          <Info className="h-4 w-4" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="right" className="max-w-md p-4 bg-white shadow-lg border">
                                        <div className="space-y-2">
                                          <p className="font-semibold text-gray-900">{template.name}</p>
                                          <p className="text-sm text-gray-600">{template.description}</p>
                                          {template.involvedTables && template.involvedTables.length > 0 && (
                                            <div className="pt-2 border-t">
                                              <p className="text-xs font-medium text-gray-500">Tabelle coinvolte:</p>
                                              <div className="flex flex-wrap gap-1 mt-1">
                                                {template.involvedTables.map(t => (
                                                  <Badge key={t} variant="outline" className="text-xs font-mono">
                                                    {t}
                                                  </Badge>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                          <div className="pt-2 border-t">
                                            <p className="text-xs text-gray-400">
                                              {template.availableVariables.length} variabili disponibili, {template.requiredVariables.length} obbligatorie
                                            </p>
                                          </div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <p className="text-sm text-gray-500">{template.description}</p>
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
                      );
                    })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 4: Variabili (figlie del template) */}
              {step === 4 && selectedTemplate && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6 p-4"
                >
                  {/* Riepilogo azione */}
                  <div className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{actionName || 'Nuova Azione'}</h4>
                      <Badge className={`${actionCategory === 'operative' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'} border-0`}>
                        {actionCategory === 'operative' ? 'Operativa' : 'MCP Query'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 font-mono">{actionCode || 'CODICE_AZIONE'}</p>
                    <p className="text-sm text-gray-600 mt-1">{selectedTemplate.name} - {getDepartmentStyle(selectedDepartment).label}</p>
                  </div>

                  {/* Variable Selection con tooltip */}
                  <div>
                    <Label className="mb-3 block">Seleziona Variabili per l'Azione</Label>
                    <p className="text-sm text-gray-500 mb-4">
                      Le variabili definiscono i parametri che l'azione accetta. Quelle obbligatorie devono essere fornite ad ogni chiamata.
                    </p>
                    <div className="border rounded-lg divide-y max-h-[350px] overflow-y-auto">
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
                                <span className="font-mono text-sm text-gray-900">{variable?.name || varId}</span>
                                {variable && (
                                  <TooltipProvider delayDuration={100}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button className="text-gray-400 hover:text-orange-500 transition-colors">
                                          <Info className="h-4 w-4" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="right" className="max-w-sm p-3 bg-white shadow-lg border">
                                        <div className="space-y-2">
                                          <p className="font-semibold text-gray-900">{variable.name}</p>
                                          <p className="text-sm text-gray-600">{variable.tooltip}</p>
                                          {variable.table && (
                                            <div className="pt-2 border-t">
                                              <p className="text-xs text-gray-500">
                                                📍 Tabella: <code className="bg-gray-100 px-1 rounded">{variable.table}.{variable.column}</code>
                                              </p>
                                            </div>
                                          )}
                                          {variable.example && (
                                            <p className="text-xs text-gray-500">
                                              💡 Esempio: <code className="bg-gray-100 px-1 rounded">{variable.example}</code>
                                            </p>
                                          )}
                                          {variable.type && (
                                            <p className="text-xs text-gray-400">
                                              Tipo: {variable.type}
                                            </p>
                                          )}
                                        </div>
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
                    handleSaveAction();
                  }
                }}
                disabled={
                  (step === 1 && (!actionCode || !actionName)) ||
                  (step === 2 && !selectedDepartment) ||
                  (step === 3 && !selectedTemplate && !editingAction) ||
                  (step === 4 && selectedVariables.length === 0)
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
                    {editingAction ? 'Salva Modifiche' : 'Crea Azione'}
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiviare questa azione?</AlertDialogTitle>
            <AlertDialogDescription>
              L'azione "{selectedActionForAction?.name}" verrà archiviata e non sarà più visibile nel catalogo MCP. 
              Potrai riattivarla in qualsiasi momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedActionForAction && archiveActionMutation.mutate(selectedActionForAction.id)}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Archivia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare definitivamente questa azione?</AlertDialogTitle>
            <AlertDialogDescription>
              L'azione "{selectedActionForAction?.name}" verrà eliminata definitivamente. 
              Questa operazione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedActionForAction && deleteActionMutation.mutate(selectedActionForAction.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
