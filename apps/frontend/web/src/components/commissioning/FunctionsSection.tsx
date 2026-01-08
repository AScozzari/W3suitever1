import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit, Trash2, MoreHorizontal, Zap, GitBranch, Layers, FunctionSquare, Pause, Play, Archive, AlertTriangle, Calendar, X, GripVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// ==================== CONDITION BUILDER TYPES ====================
interface Condition {
  variable: string;
  operator: string;
  value: string | number | boolean | null;
  logic: 'AND' | 'OR';
}

interface RuleBundle {
  conditions: Condition[];
}

// Operatori disponibili per le condizioni
const CONDITION_OPERATORS = [
  { value: '>', label: 'Maggiore di (>)', symbol: '>' },
  { value: '<', label: 'Minore di (<)', symbol: '<' },
  { value: '=', label: 'Uguale a (=)', symbol: '=' },
  { value: '!=', label: 'Diverso da (≠)', symbol: '≠' },
  { value: '>=', label: 'Maggiore o uguale (≥)', symbol: '≥' },
  { value: '<=', label: 'Minore o uguale (≤)', symbol: '≤' },
  { value: '%+', label: 'Percentuale positiva (%+)', symbol: '%+' },
  { value: '%-', label: 'Percentuale negativa (%-)', symbol: '%-' },
  { value: 'contains', label: 'Contiene', symbol: '∈' },
  { value: 'startsWith', label: 'Inizia con', symbol: '^' },
  { value: 'isEmpty', label: 'È vuoto', symbol: '∅' },
  { value: 'isNotEmpty', label: 'Non è vuoto', symbol: '≠∅' },
];

// Operatori unari che non richiedono un valore
const UNARY_OPERATORS_LIST = ['isEmpty', 'isNotEmpty'];

// Helper per formattare la formula leggibile
const formatConditionFormula = (conditions: Condition[]): string => {
  if (conditions.length === 0) return 'Nessuna condizione definita';
  
  return conditions.map((c, idx) => {
    const op = CONDITION_OPERATORS.find(o => o.value === c.operator);
    const opSymbol = op?.symbol || c.operator;
    
    // Per operatori unari, non mostrare il valore
    const isUnary = UNARY_OPERATORS_LIST.includes(c.operator);
    const condStr = isUnary 
      ? `${c.variable} ${opSymbol}`
      : `${c.variable} ${opSymbol} ${c.value ?? '?'}`;
    
    if (idx === 0) return `IF ${condStr}`;
    return `${c.logic} ${condStr}`;
  }).join(' ') + ' → TRUE';
};

interface CommissioningFunction {
  id: string;
  code: string;
  name: string;
  description: string | null;
  rule_bundle: Record<string, any>;
  depends_on: string[] | null;
  is_active: boolean;
  status: 'active' | 'suspended' | 'archived';
  created_at: string;
  updated_at: string;
  usedVariables?: string[];
}

interface TargetVariable {
  code: string;
  name: string;
  type: string;
}

const evalModeLabels: Record<string, { label: string; icon: typeof Zap; color: string }> = {
  first_match: { label: 'Prima Corrispondenza', icon: Zap, color: 'bg-blue-100 text-blue-700' },
  accumulate: { label: 'Accumula', icon: Layers, color: 'bg-green-100 text-green-700' },
  weighted_average: { label: 'Media Ponderata', icon: GitBranch, color: 'bg-purple-100 text-purple-700' },
};

export default function FunctionsSection() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [functionToDelete, setFunctionToDelete] = useState<CommissioningFunction | null>(null);
  const [editingFunction, setEditingFunction] = useState<CommissioningFunction | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    ruleBundle: { conditions: [] } as RuleBundle,
    isActive: true,
  });

  // Gestione condizioni nel builder
  const addCondition = useCallback(() => {
    setFormData(f => ({
      ...f,
      ruleBundle: {
        ...f.ruleBundle,
        conditions: [
          ...f.ruleBundle.conditions,
          { variable: '', operator: '>', value: '', logic: 'AND' as const }
        ]
      }
    }));
  }, []);

  const UNARY_OPERATORS = ['isEmpty', 'isNotEmpty'];
  
  const updateCondition = useCallback((index: number, field: keyof Condition, value: any) => {
    setFormData(f => ({
      ...f,
      ruleBundle: {
        ...f.ruleBundle,
        conditions: f.ruleBundle.conditions.map((c, i) => {
          if (i !== index) return c;
          
          // Se l'operatore cambia a unario, resetta il valore a null
          if (field === 'operator' && UNARY_OPERATORS.includes(value)) {
            return { ...c, operator: value, value: null };
          }
          
          return { ...c, [field]: value };
        })
      }
    }));
  }, []);

  const removeCondition = useCallback((index: number) => {
    setFormData(f => ({
      ...f,
      ruleBundle: {
        ...f.ruleBundle,
        conditions: f.ruleBundle.conditions.filter((_, i) => i !== index)
      }
    }));
  }, []);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
    return params.toString();
  }, [searchTerm, dateFrom, dateTo, statusFilter]);

  const functionsUrl = queryParams ? `/api/commissioning/functions?${queryParams}` : '/api/commissioning/functions';
  const { data: functions = [], isLoading } = useQuery<CommissioningFunction[]>({
    queryKey: [functionsUrl],
  });

  const { data: targetVariables = [] } = useQuery<TargetVariable[]>({
    queryKey: ['/api/commissioning/functions/target-variables'],
  });

  const { data: variableMappings = [] } = useQuery<{ code: string; name: string }[]>({
    queryKey: ['/api/commissioning/variable-mappings'],
  });

  const invalidateFunctions = () => {
    // Invalidate all queries starting with /api/commissioning/functions
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/commissioning/functions');
      }
    });
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/commissioning/functions', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      invalidateFunctions();
      setModalOpen(false);
      resetForm();
      toast({ title: 'Funzione creata', description: 'La funzione commissioning è stata creata' });
    },
    onError: () => toast({ title: 'Errore', description: 'Impossibile creare la funzione', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest(`/api/commissioning/functions/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      invalidateFunctions();
      setModalOpen(false);
      resetForm();
      toast({ title: 'Funzione aggiornata' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/commissioning/functions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidateFunctions();
      setDeleteModalOpen(false);
      setDeleteConfirmText('');
      setFunctionToDelete(null);
      toast({ title: 'Funzione eliminata' });
    },
    onError: () => toast({ title: 'Errore', description: 'Impossibile eliminare la funzione', variant: 'destructive' }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'activate' | 'suspend' | 'archive' }) => 
      apiRequest(`/api/commissioning/functions/${id}/status`, { 
        method: 'PATCH', 
        body: JSON.stringify({ action }), 
        headers: { 'Content-Type': 'application/json' } 
      }),
    onSuccess: (_, { action }) => {
      invalidateFunctions();
      const actionLabels = { activate: 'attivata', suspend: 'sospesa', archive: 'archiviata' };
      toast({ title: `Funzione ${actionLabels[action]}` });
    },
    onError: () => toast({ title: 'Errore', description: 'Impossibile aggiornare lo stato', variant: 'destructive' }),
  });

  const resetForm = () => {
    setEditingFunction(null);
    setFormData({ code: '', name: '', description: '', ruleBundle: { conditions: [] }, isActive: true });
  };

  const openEdit = (fn: CommissioningFunction) => {
    setEditingFunction(fn);
    // Assicura che ruleBundle abbia la struttura corretta
    const existingBundle = fn.rule_bundle || {};
    const conditions = Array.isArray((existingBundle as any).conditions) 
      ? (existingBundle as any).conditions 
      : [];
    
    setFormData({
      code: fn.code,
      name: fn.name,
      description: fn.description || '',
      ruleBundle: { conditions },
      isActive: fn.is_active,
    });
    setModalOpen(true);
  };

  const openDeleteConfirm = (fn: CommissioningFunction) => {
    setFunctionToDelete(fn);
    setDeleteConfirmText('');
    setDeleteModalOpen(true);
  };

  const handleDelete = () => {
    if (deleteConfirmText !== 'ELIMINA' || !functionToDelete) return;
    deleteMutation.mutate(functionToDelete.id);
  };

  const handleSubmit = () => {
    if (!formData.code || !formData.name) {
      toast({ title: 'Errore', description: 'Codice e nome sono obbligatori', variant: 'destructive' });
      return;
    }
    
    // Normalizza i valori delle condizioni (converti stringhe in numeri dove appropriato)
    const normalizedConditions = formData.ruleBundle.conditions.map(c => {
      // Per operatori unari, value deve essere null
      if (UNARY_OPERATORS_LIST.includes(c.operator)) {
        return { ...c, value: null };
      }
      // Per altri operatori, prova a convertire in numero se possibile
      if (c.value !== null && c.value !== undefined && c.value !== '') {
        const numVal = parseFloat(String(c.value));
        if (!isNaN(numVal)) {
          return { ...c, value: numVal };
        }
      }
      return c;
    });
    
    const payload = {
      ...formData,
      ruleBundle: { conditions: normalizedConditions }
    };
    
    if (editingFunction) {
      updateMutation.mutate({ id: editingFunction.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('all');
  };

  const hasFilters = searchTerm || dateFrom || dateTo || statusFilter !== 'all';

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[12.5rem] max-w-[18.75rem]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Cerca codice, descrizione, variabili..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="pl-10" 
            data-testid="input-search-functions" 
          />
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2" data-testid="button-date-filter">
              <Calendar className="h-4 w-4" />
              {dateFrom || dateTo ? `${dateFrom || '...'} - ${dateTo || '...'}` : 'Filtra per data'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Data creazione da</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1" data-testid="input-date-from" />
              </div>
              <div>
                <Label className="text-xs">Data creazione a</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1" data-testid="input-date-to" />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[9.375rem]" data-testid="select-status-filter">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="active">Attive</SelectItem>
            <SelectItem value="suspended">Sospese</SelectItem>
            <SelectItem value="archived">Archiviate</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500" data-testid="button-clear-filters">
            Azzera filtri
          </Button>
        )}

        <div className="ml-auto">
          <Button onClick={() => { resetForm(); setModalOpen(true); }} className="flex items-center gap-2" style={{ background: 'hsl(var(--brand-orange))' }} data-testid="button-nuova-funzione">
            <Plus className="h-4 w-4" /> Nuova Funzione
          </Button>
        </div>
      </div>

      {/* DataTable */}
      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-gray-400">Caricamento...</div>
      ) : functions.length === 0 ? (
        <div className="h-48 flex items-center justify-center border rounded-lg bg-gray-50">
          <div className="text-center text-gray-400">
            <FunctionSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nessuna funzione trovata</p>
            <p className="text-sm">{hasFilters ? 'Prova a modificare i filtri' : 'Crea funzioni per modificare valenze e gettoni'}</p>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="w-[9.375rem]">Codice</TableHead>
                <TableHead>Descrizione</TableHead>
                <TableHead className="w-[8.125rem]">Data Creazione</TableHead>
                <TableHead className="w-[15.625rem]">Variabili Utilizzate</TableHead>
                <TableHead className="w-[6.25rem] text-center">Stato</TableHead>
                <TableHead className="w-[5rem] text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {functions.map((fn) => (
                <TableRow key={fn.id} className={fn.status !== 'active' ? 'bg-gray-50/50' : ''} data-testid={`row-function-${fn.id}`}>
                  <TableCell>
                    <code className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{fn.code}</code>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{fn.name}</div>
                      {fn.description && (
                        <div className="text-sm text-gray-500 line-clamp-1">{fn.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {fn.created_at ? format(new Date(fn.created_at), 'dd MMM yyyy', { locale: it }) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(fn.usedVariables || []).slice(0, 3).map((v) => (
                        <Badge key={v} variant="outline" className="text-xs font-mono">
                          @{v}
                        </Badge>
                      ))}
                      {(fn.usedVariables || []).length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{fn.usedVariables!.length - 3}
                        </Badge>
                      )}
                      {(!fn.usedVariables || fn.usedVariables.length === 0) && (
                        <span className="text-xs text-gray-400 italic">Nessuna variabile</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {fn.status === 'active' && (
                      <Badge className="bg-green-100 text-green-700 border-0">Attiva</Badge>
                    )}
                    {fn.status === 'suspended' && (
                      <Badge className="bg-yellow-100 text-yellow-700 border-0">Sospesa</Badge>
                    )}
                    {fn.status === 'archived' && (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">Archiviata</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`actions-function-${fn.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(fn)} data-testid="action-edit-function">
                          <Edit className="h-4 w-4 mr-2" /> Modifica
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {fn.status === 'active' && (
                          <>
                            <DropdownMenuItem onClick={() => statusMutation.mutate({ id: fn.id, action: 'suspend' })} data-testid="action-suspend-function">
                              <Pause className="h-4 w-4 mr-2" /> Sospendi
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => statusMutation.mutate({ id: fn.id, action: 'archive' })} data-testid="action-archive-function">
                              <Archive className="h-4 w-4 mr-2" /> Archivia
                            </DropdownMenuItem>
                          </>
                        )}
                        {fn.status === 'suspended' && (
                          <>
                            <DropdownMenuItem onClick={() => statusMutation.mutate({ id: fn.id, action: 'activate' })} data-testid="action-activate-function">
                              <Play className="h-4 w-4 mr-2" /> Attiva
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => statusMutation.mutate({ id: fn.id, action: 'archive' })} data-testid="action-archive-function">
                              <Archive className="h-4 w-4 mr-2" /> Archivia
                            </DropdownMenuItem>
                          </>
                        )}
                        {fn.status === 'archived' && (
                          <DropdownMenuItem onClick={() => statusMutation.mutate({ id: fn.id, action: 'activate' })} data-testid="action-activate-function">
                            <Play className="h-4 w-4 mr-2" /> Riattiva
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => openDeleteConfirm(fn)} data-testid="action-delete-function">
                          <Trash2 className="h-4 w-4 mr-2" /> Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={(open) => { if (!open) { setDeleteModalOpen(false); setDeleteConfirmText(''); setFunctionToDelete(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Conferma Eliminazione
            </DialogTitle>
            <DialogDescription>
              Stai per eliminare definitivamente la funzione <strong className="text-gray-900">{functionToDelete?.name}</strong> ({functionToDelete?.code}).
              Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-sm">Scrivi <span className="font-mono font-bold">ELIMINA</span> per confermare:</Label>
            <Input 
              value={deleteConfirmText} 
              onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())} 
              placeholder="ELIMINA"
              className="mt-2"
              data-testid="input-delete-confirm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Annulla</Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={deleteConfirmText !== 'ELIMINA' || deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? 'Eliminazione...' : 'Elimina Definitivamente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingFunction ? 'Modifica Funzione' : 'Nuova Funzione Commissioning'}</DialogTitle>
            <DialogDescription>Definisci le regole di calcolo per le commissioni</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Codice *</Label>
                <div className="flex gap-2">
                  <Input value={formData.code} onChange={(e) => setFormData(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="FN_BONUS_BRAND" className="flex-1" data-testid="input-function-code" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const timestamp = Date.now().toString(36).toUpperCase();
                      setFormData(f => ({ ...f, code: `FN_${timestamp}` }));
                    }}
                    title="Genera codice automatico"
                    data-testid="button-generate-code"
                  >
                    <Zap className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label>Nome *</Label>
                <Input value={formData.name} onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="Bonus per Brand Premium" data-testid="input-function-name" />
              </div>
            </div>
            <div>
              <Label>Descrizione</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))} rows={2} data-testid="input-function-desc" />
            </div>
            <div className="border-t pt-4">
              <div className="p-3 mb-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Nota:</strong> Questa funzione restituisce <strong>TRUE</strong> quando le condizioni sono soddisfatte. 
                  Le operazioni sui valori commissioning (×, +, −) vengono definite nei <strong>Configuratori</strong>.
                </p>
              </div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-base font-medium">Condizioni Logiche</Label>
                  <p className="text-sm text-gray-500">Definisci quando questa funzione restituisce TRUE</p>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addCondition}
                  className="flex items-center gap-1"
                  data-testid="button-add-condition"
                >
                  <Plus className="h-3 w-3" /> Aggiungi Condizione
                </Button>
              </div>

              {/* Condition Builder */}
              <div className="space-y-2 bg-gray-50 border rounded-lg p-4 min-h-[6rem]">
                {formData.ruleBundle.conditions.length === 0 ? (
                  <div className="text-center text-gray-400 py-4">
                    <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nessuna condizione definita</p>
                    <p className="text-xs">Clicca "Aggiungi Condizione" per iniziare</p>
                  </div>
                ) : (
                  formData.ruleBundle.conditions.map((condition, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white rounded-lg border p-2" data-testid={`condition-row-${idx}`}>
                      {/* Logic connector (AND/OR) - hidden for first row */}
                      {idx === 0 ? (
                        <div className="w-[4.5rem] flex-shrink-0 text-center">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">IF</Badge>
                        </div>
                      ) : (
                        <Select 
                          value={condition.logic} 
                          onValueChange={(v) => updateCondition(idx, 'logic', v)}
                        >
                          <SelectTrigger className="w-[4.5rem] h-8 text-xs" data-testid={`select-logic-${idx}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AND">AND</SelectItem>
                            <SelectItem value="OR">OR</SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      {/* Variable selector */}
                      <Select 
                        value={condition.variable} 
                        onValueChange={(v) => updateCondition(idx, 'variable', v)}
                      >
                        <SelectTrigger className="flex-1 h-8 text-xs font-mono" data-testid={`select-variable-${idx}`}>
                          <SelectValue placeholder="Variabile..." />
                        </SelectTrigger>
                        <SelectContent>
                          {variableMappings.map((vm: any) => (
                            <SelectItem key={vm.code || vm.id} value={vm.code} className="font-mono text-xs">
                              {vm.code} <span className="text-gray-400 ml-1">({vm.name})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Operator selector */}
                      <Select 
                        value={condition.operator} 
                        onValueChange={(v) => updateCondition(idx, 'operator', v)}
                      >
                        <SelectTrigger className="w-[11rem] h-8 text-xs" data-testid={`select-operator-${idx}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITION_OPERATORS.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              <span className="font-mono mr-2">{op.symbol}</span> {op.label.split('(')[0]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Value input - hidden for isEmpty/isNotEmpty */}
                      {!['isEmpty', 'isNotEmpty'].includes(condition.operator) && (
                        <Input
                          value={condition.value?.toString() || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            // Try to parse as number if it looks like one
                            const numVal = parseFloat(val);
                            updateCondition(idx, 'value', isNaN(numVal) ? val : numVal);
                          }}
                          placeholder="Valore..."
                          className="w-[6rem] h-8 text-xs"
                          data-testid={`input-value-${idx}`}
                        />
                      )}

                      {/* Remove button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCondition(idx)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                        data-testid={`button-remove-condition-${idx}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {/* Formula Preview */}
              {formData.ruleBundle.conditions.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Label className="text-xs text-blue-600 uppercase tracking-wide">Formula</Label>
                  <p className="font-mono text-sm text-blue-800 mt-1">
                    {formatConditionFormula(formData.ruleBundle.conditions)}
                  </p>
                </div>
              )}

              {/* Available Variables */}
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs text-gray-500">Variabili disponibili:</span>
                {variableMappings.slice(0, 5).map((vm: any) => (
                  <Badge key={vm.code || vm.id} variant="outline" className="text-xs font-mono">{vm.code}</Badge>
                ))}
                {variableMappings.length > 5 && (
                  <Badge variant="secondary" className="text-xs">+{variableMappings.length - 5} altre</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={formData.isActive} 
                onCheckedChange={(checked) => setFormData(f => ({ ...f, isActive: checked }))}
                data-testid="toggle-is-active"
              />
              <Label>Funzione attiva</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} style={{ background: 'hsl(var(--brand-orange))' }} data-testid="button-save-function">
              {(createMutation.isPending || updateMutation.isPending) ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
