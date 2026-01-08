import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Copy, Edit, Trash2, Package, Calendar, Tag, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ValuePackage {
  id: string;
  code: string;
  name: string;
  description: string | null;
  list_type: 'standard' | 'promo' | 'canvas' | 'device_canvas';
  operator_id: string | null;
  operator_name: string | null;
  valid_from: string;
  valid_to: string | null;
  status: 'draft' | 'active' | 'expired' | 'archived';
  version: number;
  items_count: number;
  created_at: string;
}

const listTypeLabels: Record<string, { label: string; color: string }> = {
  standard: { label: 'Standard', color: 'bg-blue-100 text-blue-700' },
  promo: { label: 'Promo', color: 'bg-green-100 text-green-700' },
  canvas: { label: 'Canvas', color: 'bg-purple-100 text-purple-700' },
  device_canvas: { label: 'Device Canvas', color: 'bg-amber-100 text-amber-700' },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: 'Bozza', color: 'bg-gray-100 text-gray-600' },
  active: { label: 'Attivo', color: 'bg-green-100 text-green-700' },
  expired: { label: 'Scaduto', color: 'bg-red-100 text-red-600' },
  archived: { label: 'Archiviato', color: 'bg-gray-100 text-gray-500' },
};

export default function ValuePackagesSection() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ValuePackage | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    listType: 'standard' as string,
    operatorId: '',
    validFrom: format(new Date(), 'yyyy-MM-dd'),
    validTo: '',
    status: 'draft' as string,
  });

  const { data: packages = [], isLoading } = useQuery<ValuePackage[]>({
    queryKey: ['/api/commissioning/value-packages'],
  });

  const { data: operators = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/api/operators'],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/commissioning/value-packages', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commissioning/value-packages'] });
      setModalOpen(false);
      resetForm();
      toast({ title: 'Pacchetto creato', description: 'Il pacchetto commissioning è stato creato' });
    },
    onError: () => toast({ title: 'Errore', description: 'Impossibile creare il pacchetto', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest(`/api/commissioning/value-packages/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commissioning/value-packages'] });
      setModalOpen(false);
      resetForm();
      toast({ title: 'Pacchetto aggiornato' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/commissioning/value-packages/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commissioning/value-packages'] });
      toast({ title: 'Pacchetto eliminato' });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/commissioning/value-packages/${id}/duplicate`, { method: 'POST', body: JSON.stringify({ newName: null }), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commissioning/value-packages'] });
      toast({ title: 'Pacchetto duplicato', description: 'Una copia del pacchetto è stata creata' });
    },
  });

  const resetForm = () => {
    setEditingPackage(null);
    setFormData({ code: '', name: '', description: '', listType: 'standard', operatorId: '', validFrom: format(new Date(), 'yyyy-MM-dd'), validTo: '', status: 'draft' });
  };

  const openEdit = (pkg: ValuePackage) => {
    setEditingPackage(pkg);
    setFormData({
      code: pkg.code,
      name: pkg.name,
      description: pkg.description || '',
      listType: pkg.list_type,
      operatorId: pkg.operator_id || '',
      validFrom: pkg.valid_from?.split('T')[0] || '',
      validTo: pkg.valid_to?.split('T')[0] || '',
      status: pkg.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.code || !formData.name || !formData.validFrom) {
      toast({ title: 'Errore', description: 'Codice, nome e data inizio sono obbligatori', variant: 'destructive' });
      return;
    }
    if (editingPackage) {
      updateMutation.mutate({ id: editingPackage.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredPackages = useMemo(() => {
    if (!searchTerm) return packages;
    const lower = searchTerm.toLowerCase();
    return packages.filter(p => p.name.toLowerCase().includes(lower) || p.code.toLowerCase().includes(lower));
  }, [packages, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Cerca pacchetti..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" data-testid="input-search-packages" />
        </div>
        <Button onClick={() => { resetForm(); setModalOpen(true); }} className="flex items-center gap-2" style={{ background: 'hsl(var(--brand-orange))' }} data-testid="button-nuovo-pacchetto">
          <Plus className="h-4 w-4" /> Nuovo Pacchetto
        </Button>
      </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-gray-400">Caricamento...</div>
      ) : filteredPackages.length === 0 ? (
        <div className="h-48 flex items-center justify-center border rounded-lg bg-gray-50">
          <div className="text-center text-gray-400">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nessun pacchetto commissioning</p>
            <p className="text-sm">Crea un pacchetto per definire valenze e gettoni per prodotti</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPackages.map((pkg) => {
            const listType = listTypeLabels[pkg.list_type];
            const status = statusLabels[pkg.status];
            return (
              <Card key={pkg.id} className="border hover:border-gray-300 transition-colors" data-testid={`card-package-${pkg.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-gray-400" />
                      <code className="text-xs font-mono text-gray-500">{pkg.code}</code>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`actions-package-${pkg.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(pkg)} data-testid="action-edit-package">
                          <Edit className="h-4 w-4 mr-2" /> Modifica
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateMutation.mutate(pkg.id)} data-testid="action-duplicate-package">
                          <Copy className="h-4 w-4 mr-2" /> Duplica
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(pkg.id)} data-testid="action-delete-package">
                          <Trash2 className="h-4 w-4 mr-2" /> Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{pkg.name}</h3>
                  {pkg.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{pkg.description}</p>}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className={`${listType?.color || 'bg-gray-100'} border-0 text-xs`}>{listType?.label}</Badge>
                    <Badge className={`${status?.color || 'bg-gray-100'} border-0 text-xs`}>{status?.label}</Badge>
                    {pkg.operator_name && <Badge variant="outline" className="text-xs">{pkg.operator_name}</Badge>}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{pkg.valid_from?.split('T')[0]}</span>
                      {pkg.valid_to && <span>→ {pkg.valid_to.split('T')[0]}</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      <span>{pkg.items_count || 0} prodotti</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPackage ? 'Modifica Pacchetto' : 'Nuovo Pacchetto Commissioning'}</DialogTitle>
            <DialogDescription>Gestisci i pacchetti di valori per il calcolo delle commissioni</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Codice *</Label>
                <Input value={formData.code} onChange={(e) => setFormData(f => ({ ...f, code: e.target.value }))} placeholder="PKG_001" data-testid="input-package-code" />
              </div>
              <div>
                <Label>Tipologia</Label>
                <Select value={formData.listType} onValueChange={(v) => setFormData(f => ({ ...f, listType: v }))}>
                  <SelectTrigger data-testid="select-list-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="promo">Promo</SelectItem>
                    <SelectItem value="canvas">Canvas</SelectItem>
                    <SelectItem value="device_canvas">Device Canvas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Nome *</Label>
              <Input value={formData.name} onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="Listino Q1 2026" data-testid="input-package-name" />
            </div>
            <div>
              <Label>Descrizione</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))} rows={2} data-testid="input-package-desc" />
            </div>
            <div>
              <Label>Operatore</Label>
              <Select value={formData.operatorId} onValueChange={(v) => setFormData(f => ({ ...f, operatorId: v }))}>
                <SelectTrigger data-testid="select-operator">
                  <SelectValue placeholder="Seleziona operatore..." />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op) => <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valido Dal *</Label>
                <Input type="date" value={formData.validFrom} onChange={(e) => setFormData(f => ({ ...f, validFrom: e.target.value }))} data-testid="input-valid-from" />
              </div>
              <div>
                <Label>Valido Al</Label>
                <Input type="date" value={formData.validTo} onChange={(e) => setFormData(f => ({ ...f, validTo: e.target.value }))} data-testid="input-valid-to" />
              </div>
            </div>
            <div>
              <Label>Stato</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData(f => ({ ...f, status: v }))}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Bozza</SelectItem>
                  <SelectItem value="active">Attivo</SelectItem>
                  <SelectItem value="expired">Scaduto</SelectItem>
                  <SelectItem value="archived">Archiviato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} style={{ background: 'hsl(var(--brand-orange))' }} data-testid="button-save-package">
              {(createMutation.isPending || updateMutation.isPending) ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
