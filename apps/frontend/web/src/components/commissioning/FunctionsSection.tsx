import { useState, useMemo } from 'react';
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
import { Plus, Search, Edit, Trash2, MoreHorizontal, Zap, GitBranch, Layers, FunctionSquare, Pause, Play, Archive, AlertTriangle, Calendar } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface CommissioningFunction {
  id: string;
  code: string;
  name: string;
  description: string | null;
  evaluation_mode: 'first_match' | 'accumulate' | 'weighted_average';
  target_variable: string;
  rule_bundle: Record<string, any>;
  depends_on: string[] | null;
  is_active: boolean;
  status: 'active' | 'suspended' | 'archived';
  sort_order: number;
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
    evaluationMode: 'first_match' as string,
    targetVariable: '',
    ruleBundle: {} as Record<string, any>,
    sortOrder: 0,
    isActive: true,
  });

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
    return params.toString();
  }, [searchTerm, dateFrom, dateTo, statusFilter]);

  const { data: functions = [], isLoading } = useQuery<CommissioningFunction[]>({
    queryKey: ['/api/commissioning/functions', queryParams],
    queryFn: async () => {
      const url = queryParams ? `/api/commissioning/functions?${queryParams}` : '/api/commissioning/functions';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch functions');
      return res.json();
    },
  });

  const { data: targetVariables = [] } = useQuery<TargetVariable[]>({
    queryKey: ['/api/commissioning/functions/target-variables'],
  });

  const { data: variableMappings = [] } = useQuery<{ code: string; name: string }[]>({
    queryKey: ['/api/commissioning/variable-mappings'],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/commissioning/functions', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commissioning/functions'] });
      setModalOpen(false);
      resetForm();
      toast({ title: 'Funzione creata', description: 'La funzione commissioning è stata creata' });
    },
    onError: () => toast({ title: 'Errore', description: 'Impossibile creare la funzione', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest(`/api/commissioning/functions/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commissioning/functions'] });
      setModalOpen(false);
      resetForm();
      toast({ title: 'Funzione aggiornata' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/commissioning/functions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commissioning/functions'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/commissioning/functions'] });
      const actionLabels = { activate: 'attivata', suspend: 'sospesa', archive: 'archiviata' };
      toast({ title: `Funzione ${actionLabels[action]}` });
    },
    onError: () => toast({ title: 'Errore', description: 'Impossibile aggiornare lo stato', variant: 'destructive' }),
  });

  const resetForm = () => {
    setEditingFunction(null);
    setFormData({ code: '', name: '', description: '', evaluationMode: 'first_match', targetVariable: '', ruleBundle: {}, sortOrder: 0, isActive: true });
  };

  const openEdit = (fn: CommissioningFunction) => {
    setEditingFunction(fn);
    setFormData({
      code: fn.code,
      name: fn.name,
      description: fn.description || '',
      evaluationMode: fn.evaluation_mode,
      targetVariable: fn.target_variable,
      ruleBundle: fn.rule_bundle || {},
      sortOrder: fn.sort_order,
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
    if (!formData.code || !formData.name || !formData.targetVariable) {
      toast({ title: 'Errore', description: 'Codice, nome e variabile target sono obbligatori', variant: 'destructive' });
      return;
    }
    if (editingFunction) {
      updateMutation.mutate({ id: editingFunction.id, data: formData });
    } else {
      createMutation.mutate(formData);
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
                <Input value={formData.code} onChange={(e) => setFormData(f => ({ ...f, code: e.target.value }))} placeholder="FN_BONUS_BRAND" data-testid="input-function-code" />
              </div>
              <div>
                <Label>Ordine Esecuzione</Label>
                <Input type="number" value={formData.sortOrder} onChange={(e) => setFormData(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} data-testid="input-sort-order" />
              </div>
            </div>
            <div>
              <Label>Nome *</Label>
              <Input value={formData.name} onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="Bonus per Brand Premium" data-testid="input-function-name" />
            </div>
            <div>
              <Label>Descrizione</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))} rows={2} data-testid="input-function-desc" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Variabile Target (L2) *</Label>
                <Select value={formData.targetVariable} onValueChange={(v) => setFormData(f => ({ ...f, targetVariable: v }))}>
                  <SelectTrigger data-testid="select-target-variable">
                    <SelectValue placeholder="Seleziona variabile..." />
                  </SelectTrigger>
                  <SelectContent>
                    {targetVariables.map((tv) => (
                      <SelectItem key={tv.code} value={tv.code}>{tv.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Modalità Valutazione</Label>
                <Select value={formData.evaluationMode} onValueChange={(v) => setFormData(f => ({ ...f, evaluationMode: v }))}>
                  <SelectTrigger data-testid="select-eval-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first_match">Prima Corrispondenza</SelectItem>
                    <SelectItem value="accumulate">Accumula Tutte</SelectItem>
                    <SelectItem value="weighted_average">Media Ponderata</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border-t pt-4">
              <Label className="text-base font-medium">Regole (Rule Builder)</Label>
              <p className="text-sm text-gray-500 mb-3">Definisci condizioni IF/THEN usando variabili L1 (@placeholder)</p>
              <div className="bg-gray-50 border rounded-lg p-4 min-h-[7.5rem] flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Rule Builder visuale in sviluppo</p>
                  <p className="text-xs">Usa operatori: IF, THEN, &gt;, &lt;, =, ×, +%, -%, AND, OR</p>
                </div>
              </div>
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
