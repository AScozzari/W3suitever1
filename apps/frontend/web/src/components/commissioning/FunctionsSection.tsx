import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Edit, Trash2, MoreHorizontal, Play, Pause, Zap, GitBranch, Layers, FunctionSquare } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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
  sort_order: number;
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
  const [modalOpen, setModalOpen] = useState(false);
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

  const { data: functions = [], isLoading } = useQuery<CommissioningFunction[]>({
    queryKey: ['/api/commissioning/functions'],
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
      toast({ title: 'Funzione eliminata' });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      apiRequest(`/api/commissioning/functions/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify({ isActive }), 
        headers: { 'Content-Type': 'application/json' } 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commissioning/functions'] });
    },
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

  const filteredFunctions = useMemo(() => {
    if (!searchTerm) return functions;
    const lower = searchTerm.toLowerCase();
    return functions.filter(f => f.name.toLowerCase().includes(lower) || f.code.toLowerCase().includes(lower));
  }, [functions, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Cerca funzioni..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" data-testid="input-search-functions" />
        </div>
        <Button onClick={() => { resetForm(); setModalOpen(true); }} className="flex items-center gap-2" style={{ background: 'hsl(var(--brand-orange))' }} data-testid="button-nuova-funzione">
          <Plus className="h-4 w-4" /> Nuova Funzione
        </Button>
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-gray-400">Caricamento...</div>
      ) : filteredFunctions.length === 0 ? (
        <div className="h-48 flex items-center justify-center border rounded-lg bg-gray-50">
          <div className="text-center text-gray-400">
            <FunctionSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nessuna funzione configurata</p>
            <p className="text-sm">Crea funzioni per modificare valenze e gettoni in base a condizioni</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFunctions.map((fn) => {
            const evalMode = evalModeLabels[fn.evaluation_mode];
            const Icon = evalMode?.icon || Zap;
            const targetVar = targetVariables.find(t => t.code === fn.target_variable);
            return (
              <Card key={fn.id} className={`border transition-colors ${fn.is_active ? 'hover:border-gray-300' : 'opacity-60 bg-gray-50'}`} data-testid={`card-function-${fn.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded ${fn.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                        <FunctionSquare className={`h-4 w-4 ${fn.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                      </div>
                      <code className="text-xs font-mono text-gray-500">{fn.code}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={fn.is_active} 
                        onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: fn.id, isActive: checked })}
                        data-testid={`toggle-function-${fn.id}`}
                      />
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
                          <DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(fn.id)} data-testid="action-delete-function">
                            <Trash2 className="h-4 w-4 mr-2" /> Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{fn.name}</h3>
                  {fn.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{fn.description}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Badge className={`${evalMode?.color || 'bg-gray-100'} border-0 text-xs flex items-center gap-1`}>
                      <Icon className="h-3 w-3" /> {evalMode?.label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Target: {targetVar?.name || fn.target_variable}
                    </Badge>
                    {fn.rule_bundle && Object.keys(fn.rule_bundle).length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {Object.keys(fn.rule_bundle).length} regole
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingFunction ? 'Modifica Funzione' : 'Nuova Funzione Commissioning'}</DialogTitle>
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
              <div className="bg-gray-50 border rounded-lg p-4 min-h-[120px] flex items-center justify-center">
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
