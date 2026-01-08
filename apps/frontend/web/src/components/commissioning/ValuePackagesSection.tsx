import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { 
  Plus, Search, Copy, Edit, Trash2, Package, Calendar as CalendarIcon, 
  MoreHorizontal, Archive, ArchiveRestore, ChevronUp, ChevronDown, ArrowUpDown, X, Filter
} from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import ValuePackageWizard from './ValuePackageWizard';

interface ValuePackage {
  id: string;
  code: string;
  name: string;
  description: string | null;
  listType: string;
  operatorId: string | null;
  operatorName: string | null;
  validFrom: string;
  validTo: string | null;
  status: string;
  computedStatus: string;
  version: number;
  itemsCount: number;
  priceListsCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ValuePackageForWizard {
  id: string;
  code: string;
  name: string;
  description: string | null;
  list_type: string;
  operator_id: string | null;
  valid_from: string;
  valid_to: string | null;
  status: string;
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

type SortField = 'name' | 'code' | 'listType' | 'status' | 'createdAt' | 'validFrom' | 'itemsCount';
type SortDirection = 'asc' | 'desc';

export default function ValuePackagesSection() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ValuePackageForWizard | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<ValuePackage | null>(null);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (dateFrom) params.append('dateFrom', format(dateFrom, 'yyyy-MM-dd'));
    if (dateTo) params.append('dateTo', format(dateTo, 'yyyy-MM-dd'));
    return params.toString();
  }, [statusFilter, dateFrom, dateTo]);

  const { data: packages = [], isLoading, refetch } = useQuery<ValuePackage[]>({
    queryKey: ['/api/commissioning/value-packages', queryParams],
    queryFn: async () => {
      const url = queryParams 
        ? `/api/commissioning/value-packages?${queryParams}` 
        : '/api/commissioning/value-packages';
      return apiRequest(url);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/commissioning/value-packages/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commissioning/value-packages'] });
      toast({ title: 'Pacchetto eliminato', description: 'Il pacchetto è stato eliminato definitivamente' });
      setDeleteDialogOpen(false);
      setPackageToDelete(null);
    },
    onError: () => {
      toast({ title: 'Errore', description: 'Impossibile eliminare il pacchetto', variant: 'destructive' });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/commissioning/value-packages/${id}/duplicate`, { 
      method: 'POST', 
      body: JSON.stringify({ newName: null }), 
      headers: { 'Content-Type': 'application/json' } 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commissioning/value-packages'] });
      toast({ title: 'Pacchetto duplicato', description: 'Una copia del pacchetto è stata creata' });
    },
    onError: () => {
      toast({ title: 'Errore', description: 'Impossibile duplicare il pacchetto', variant: 'destructive' });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => 
      apiRequest(`/api/commissioning/value-packages/${id}/archive`, { 
        method: 'PATCH', 
        body: JSON.stringify({ archived }), 
        headers: { 'Content-Type': 'application/json' } 
      }),
    onSuccess: (_, { archived }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/commissioning/value-packages'] });
      toast({ 
        title: archived ? 'Pacchetto archiviato' : 'Pacchetto ripristinato', 
        description: archived ? 'Il pacchetto è stato archiviato' : 'Il pacchetto è stato ripristinato come bozza'
      });
    },
    onError: () => {
      toast({ title: 'Errore', description: 'Operazione non riuscita', variant: 'destructive' });
    },
  });

  const openCreate = () => {
    setEditingPackage(null);
    setWizardOpen(true);
  };

  const openEdit = (pkg: ValuePackage) => {
    const wizardPkg: ValuePackageForWizard = {
      id: pkg.id,
      code: pkg.code,
      name: pkg.name,
      description: pkg.description,
      list_type: pkg.listType,
      operator_id: pkg.operatorId,
      valid_from: pkg.validFrom,
      valid_to: pkg.validTo,
      status: pkg.status,
    };
    setEditingPackage(wizardPkg);
    setWizardOpen(true);
  };

  const handleWizardSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/commissioning/value-packages'] });
    setEditingPackage(null);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-40" />;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />;
  };

  const sortedAndFilteredPackages = useMemo(() => {
    let result = [...packages];
    
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(lower) || 
        p.code.toLowerCase().includes(lower) ||
        (p.operatorName?.toLowerCase().includes(lower))
      );
    }

    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'name': aVal = a.name; bVal = b.name; break;
        case 'code': aVal = a.code; bVal = b.code; break;
        case 'listType': aVal = a.listType; bVal = b.listType; break;
        case 'status': aVal = a.computedStatus; bVal = b.computedStatus; break;
        case 'createdAt': aVal = new Date(a.createdAt); bVal = new Date(b.createdAt); break;
        case 'validFrom': aVal = a.validFrom ? new Date(a.validFrom) : null; bVal = b.validFrom ? new Date(b.validFrom) : null; break;
        case 'itemsCount': aVal = a.itemsCount; bVal = b.itemsCount; break;
        default: aVal = a.createdAt; bVal = b.createdAt;
      }
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [packages, searchTerm, sortField, sortDirection]);

  const statusCounts = useMemo(() => {
    const counts = { all: packages.length, draft: 0, active: 0, expired: 0, archived: 0 };
    packages.forEach(p => {
      const status = p.computedStatus as keyof typeof counts;
      if (status in counts) counts[status]++;
    });
    return counts;
  }, [packages]);

  const clearDateFilter = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const confirmDelete = (pkg: ValuePackage) => {
    setPackageToDelete(pkg);
    setDeleteDialogOpen(true);
  };

  const hasActiveFilters = statusFilter !== 'all' || dateFrom || dateTo || searchTerm;

  return (
    <div className="flex gap-6">
      {/* Sidebar Filtri */}
      <div className="w-64 shrink-0 space-y-5 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Filter className="h-4 w-4" />
            Filtri
          </div>
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setStatusFilter('all'); setDateFrom(undefined); setDateTo(undefined); setSearchTerm(''); }}
              className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
              data-testid="button-clear-all-filters"
            >
              Pulisci tutto
            </Button>
          )}
        </div>

        {/* Ricerca */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-500 uppercase tracking-wide">Cerca</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Nome, codice..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="pl-9 h-9 text-sm" 
              data-testid="input-search-packages" 
            />
          </div>
        </div>

        {/* Stato */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-500 uppercase tracking-wide">Stato</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9" data-testid="select-status-filter">
              <SelectValue placeholder="Seleziona stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti ({statusCounts.all})</SelectItem>
              <SelectItem value="draft">Bozze ({statusCounts.draft})</SelectItem>
              <SelectItem value="active">Attivi ({statusCounts.active})</SelectItem>
              <SelectItem value="expired">Scaduti ({statusCounts.expired})</SelectItem>
              <SelectItem value="archived">Archiviati ({statusCounts.archived})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-gray-500 uppercase tracking-wide">Periodo</Label>
            {(dateFrom || dateTo) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearDateFilter} 
                className="h-5 px-1 text-xs text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          <div className="space-y-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-9 text-sm font-normal"
                  data-testid="button-date-from"
                >
                  <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                  {dateFrom ? format(dateFrom, 'dd/MM/yyyy', { locale: it }) : 'Data inizio'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  locale={it}
                  className="rounded-md border"
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-9 text-sm font-normal"
                  data-testid="button-date-to"
                >
                  <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                  {dateTo ? format(dateTo, 'dd/MM/yyyy', { locale: it }) : 'Data fine'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  locale={it}
                  className="rounded-md border"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Riepilogo filtri attivi */}
        {hasActiveFilters && (
          <div className="pt-3 border-t">
            <p className="text-xs text-gray-500 mb-2">Filtri attivi:</p>
            <div className="flex flex-wrap gap-1">
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  {statusLabels[statusFilter]?.label}
                </Badge>
              )}
              {searchTerm && (
                <Badge variant="secondary" className="text-xs">
                  "{searchTerm}"
                </Badge>
              )}
              {(dateFrom || dateTo) && (
                <Badge variant="secondary" className="text-xs">
                  {dateFrom ? format(dateFrom, 'dd/MM', { locale: it }) : '...'}
                  {' → '}
                  {dateTo ? format(dateTo, 'dd/MM', { locale: it }) : '...'}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-4">
        {/* Header con bottone nuovo */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {sortedAndFilteredPackages.length} pacchett{sortedAndFilteredPackages.length === 1 ? 'o' : 'i'}
            {hasActiveFilters && ' (filtrati)'}
          </div>
          <Button 
            onClick={openCreate} 
            className="flex items-center gap-2" 
            style={{ background: 'hsl(var(--brand-orange))' }} 
            data-testid="button-nuovo-pacchetto"
          >
            <Plus className="h-4 w-4" /> 
            Nuovo Pacchetto
          </Button>
        </div>

      {isLoading ? (
        <div className="h-48 flex items-center justify-center text-gray-400">Caricamento...</div>
      ) : sortedAndFilteredPackages.length === 0 ? (
        <div className="h-48 flex items-center justify-center border rounded-lg bg-gray-50">
          <div className="text-center text-gray-400">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nessun pacchetto trovato</p>
            <p className="text-sm">
              {searchTerm || statusFilter !== 'all' || dateFrom || dateTo
                ? 'Prova a modificare i filtri'
                : 'Crea un pacchetto per definire valenze e gettoni per prodotti'
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100 whitespace-nowrap" 
                  onClick={() => handleSort('code')}
                >
                  <div className="flex items-center">Codice <SortIcon field="code" /></div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100" 
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center">Nome <SortIcon field="name" /></div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100 whitespace-nowrap" 
                  onClick={() => handleSort('listType')}
                >
                  <div className="flex items-center">Tipo <SortIcon field="listType" /></div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100 whitespace-nowrap" 
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">Stato <SortIcon field="status" /></div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100 whitespace-nowrap" 
                  onClick={() => handleSort('validFrom')}
                >
                  <div className="flex items-center">Validità <SortIcon field="validFrom" /></div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100 text-center whitespace-nowrap" 
                  onClick={() => handleSort('itemsCount')}
                >
                  <div className="flex items-center justify-center">Prodotti <SortIcon field="itemsCount" /></div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-gray-100 whitespace-nowrap" 
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center">Creato il <SortIcon field="createdAt" /></div>
                </TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredPackages.map((pkg) => {
                const listType = listTypeLabels[pkg.listType];
                const status = statusLabels[pkg.computedStatus];
                const isArchived = pkg.computedStatus === 'archived';
                
                return (
                  <TableRow 
                    key={pkg.id} 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => openEdit(pkg)}
                    data-testid={`row-package-${pkg.id}`}
                  >
                    <TableCell className="font-mono text-sm text-gray-600">{pkg.code}</TableCell>
                    <TableCell>
                      <div className="font-medium">{pkg.name}</div>
                      {pkg.operatorName && (
                        <div className="text-xs text-gray-500">{pkg.operatorName}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${listType?.color || 'bg-gray-100'} border-0 text-xs`}>
                        {listType?.label || pkg.listType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${status?.color || 'bg-gray-100'} border-0 text-xs`}>
                        {status?.label || pkg.computedStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                      {pkg.validFrom ? format(new Date(pkg.validFrom), 'dd/MM/yyyy') : '-'}
                      {pkg.validTo && (
                        <span className="text-gray-400"> → {format(new Date(pkg.validTo), 'dd/MM/yyyy')}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {pkg.itemsCount}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                      {pkg.createdAt ? format(new Date(pkg.createdAt), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                          {isArchived ? (
                            <DropdownMenuItem onClick={() => archiveMutation.mutate({ id: pkg.id, archived: false })} data-testid="action-unarchive-package">
                              <ArchiveRestore className="h-4 w-4 mr-2" /> Ripristina
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => archiveMutation.mutate({ id: pkg.id, archived: true })} data-testid="action-archive-package">
                              <Archive className="h-4 w-4 mr-2" /> Archivia
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600" 
                            onClick={() => confirmDelete(pkg)} 
                            data-testid="action-delete-package"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      </div>

      <ValuePackageWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        editingPackage={editingPackage}
        onSuccess={handleWizardSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo pacchetto?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare definitivamente il pacchetto <strong>{packageToDelete?.name}</strong>.
              <br />
              Questa azione non può essere annullata. Tutti i dati associati verranno persi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => packageToDelete && deleteMutation.mutate(packageToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              Elimina definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
