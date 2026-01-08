import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Copy, Edit, Trash2, Package, Calendar, Tag, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import ValuePackageWizard from './ValuePackageWizard';

interface ValuePackage {
  id: string;
  code: string;
  name: string;
  description: string | null;
  list_type: string;
  operator_id: string | null;
  operator_name: string | null;
  valid_from: string;
  valid_to: string | null;
  status: string;
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
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ValuePackage | null>(null);

  const { data: packages = [], isLoading } = useQuery<ValuePackage[]>({
    queryKey: ['/api/commissioning/value-packages'],
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

  const openCreate = () => {
    setEditingPackage(null);
    setWizardOpen(true);
  };

  const openEdit = (pkg: ValuePackage) => {
    setEditingPackage(pkg);
    setWizardOpen(true);
  };

  const handleWizardSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/commissioning/value-packages'] });
    setEditingPackage(null);
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
        <Button onClick={openCreate} className="flex items-center gap-2" style={{ background: 'hsl(var(--brand-orange))' }} data-testid="button-nuovo-pacchetto">
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
              <Card key={pkg.id} className="border hover:border-gray-300 transition-colors cursor-pointer" onClick={() => openEdit(pkg)} data-testid={`card-package-${pkg.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-gray-400" />
                      <code className="text-xs font-mono text-gray-500">{pkg.code}</code>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`actions-package-${pkg.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(pkg); }} data-testid="action-edit-package">
                          <Edit className="h-4 w-4 mr-2" /> Modifica
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); duplicateMutation.mutate(pkg.id); }} data-testid="action-duplicate-package">
                          <Copy className="h-4 w-4 mr-2" /> Duplica
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(pkg.id); }} data-testid="action-delete-package">
                          <Trash2 className="h-4 w-4 mr-2" /> Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{pkg.name}</h3>
                  {pkg.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{pkg.description}</p>}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className={`${listType?.color || 'bg-gray-100'} border-0 text-xs`}>{listType?.label || pkg.list_type}</Badge>
                    <Badge className={`${status?.color || 'bg-gray-100'} border-0 text-xs`}>{status?.label || pkg.status}</Badge>
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

      <ValuePackageWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        editingPackage={editingPackage}
        onSuccess={handleWizardSuccess}
      />
    </div>
  );
}
