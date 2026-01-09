import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  Layers,
  Building,
  Store,
  User,
  Copy,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TemplateWizardModal from './TemplateWizardModal';

interface ConfiguratorType {
  id: string;
  code: string;
  name: string;
  description: string;
  availableVariables: Array<{ code: string; name: string; type: string }>;
  uiComponent: string;
  calculationModes: string[];
  supportsMultipleThresholds: boolean;
}

interface ConfiguratorTemplate {
  id: string;
  tenantId: string | null;
  code: string;
  name: string;
  description: string | null;
  typeCode: string;
  typeName: string;
  primaryLayer: 'RS' | 'PDV' | 'USER';
  availableDriverIds: string[];
  typeConfig: Record<string, any>;
  thresholdMode: 'progressive' | 'regressive' | null;
  thresholdCount: number;
  status: 'draft' | 'active' | 'archived';
  sortOrder: number;
  palettiCount: number;
  capsCount: number;
  isBrandPushed: boolean;
  createdBy: string | null;
  modifiedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const layerLabels: Record<string, { label: string; icon: typeof Building; color: string }> = {
  RS: { label: 'Ragione Sociale', icon: Building, color: 'bg-blue-100 text-blue-700' },
  PDV: { label: 'Punto Vendita', icon: Store, color: 'bg-green-100 text-green-700' },
  USER: { label: 'Utente', icon: User, color: 'bg-purple-100 text-purple-700' },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: 'Bozza', color: 'bg-gray-100 text-gray-600' },
  active: { label: 'Attivo', color: 'bg-green-100 text-green-700' },
  archived: { label: 'Archiviato', color: 'bg-amber-100 text-amber-700' },
};

export default function ConfiguratoriTemplateSection() {
  const { toast } = useToast();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ConfiguratorTemplate | null>(null);

  const { data: types = [], isLoading: typesLoading } = useQuery<ConfiguratorType[]>({
    queryKey: ['/api/commissioning/configurator-types'],
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery<ConfiguratorTemplate[]>({
    queryKey: ['/api/commissioning/configurator-templates'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/commissioning/configurator-templates/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commissioning/configurator-templates'] });
      setDeleteModalOpen(false);
      setSelectedTemplate(null);
      toast({ title: 'Template eliminato', description: 'Il template è stato eliminato con successo.' });
    },
    onError: (err: any) => {
      toast({ title: 'Errore', description: err.message || 'Impossibile eliminare il template.', variant: 'destructive' });
    },
  });

  const filteredTemplates = useMemo(() => {
    let filtered = templates;
    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.typeCode === typeFilter);
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }
    return filtered;
  }, [templates, typeFilter, statusFilter]);

  const kpis = useMemo(() => {
    const brandPushed = templates.filter(t => t.isBrandPushed).length;
    const custom = templates.filter(t => !t.isBrandPushed).length;
    const active = templates.filter(t => t.status === 'active').length;
    return { brandPushed, custom, active, total: templates.length };
  }, [templates]);

  const columns = useMemo<ColumnDef<ConfiguratorTemplate>[]>(() => [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2 -ml-2"
        >
          Nome Template
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.isBrandPushed ? (
            <Lock className="h-4 w-4 text-gray-400" title="Brand-pushed (sola lettura)" />
          ) : (
            <Unlock className="h-4 w-4 text-green-500" title="Personalizzato" />
          )}
          <div>
            <div className="font-medium text-gray-900">{row.original.name}</div>
            <div className="text-xs text-gray-500 font-mono">{row.original.code}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'typeName',
      header: 'Tipo',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-normal">
          {row.original.typeName || row.original.typeCode}
        </Badge>
      ),
    },
    {
      accessorKey: 'primaryLayer',
      header: 'Layer',
      cell: ({ row }) => {
        const layer = layerLabels[row.original.primaryLayer];
        const Icon = layer?.icon || Layers;
        return (
          <Badge className={`${layer?.color || 'bg-gray-100'} border-0 flex items-center gap-1 w-fit`}>
            <Icon className="h-3 w-3" />
            {layer?.label || row.original.primaryLayer}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'palettiCount',
      header: 'Paletti',
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-mono">
          {row.original.palettiCount}
        </Badge>
      ),
    },
    {
      accessorKey: 'capsCount',
      header: 'CAP',
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-mono">
          {row.original.capsCount}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Stato',
      cell: ({ row }) => {
        const st = statusLabels[row.original.status];
        return (
          <Badge className={`${st?.color || 'bg-gray-100'} border-0`}>
            {st?.label || row.original.status}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="flex items-center gap-2">
              <Eye className="h-4 w-4" /> Visualizza
            </DropdownMenuItem>
            {!row.original.isBrandPushed && (
              <>
                <DropdownMenuItem className="flex items-center gap-2">
                  <Edit className="h-4 w-4" /> Modifica
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="flex items-center gap-2 text-red-600"
                  onClick={() => {
                    setSelectedTemplate(row.original);
                    setDeleteModalOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Elimina
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center gap-2">
              <Copy className="h-4 w-4" /> Duplica come custom
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], []);

  const table = useReactTable({
    data: filteredTemplates,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const isLoading = typesLoading || templatesLoading;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{kpis.total}</div>
            <div className="text-sm text-gray-600">Template Totali</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">{kpis.brandPushed}</div>
            <div className="text-sm text-gray-600">Brand-Pushed</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{kpis.custom}</div>
            <div className="text-sm text-gray-600">Personalizzati</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{kpis.active}</div>
            <div className="text-sm text-gray-600">Attivi</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Cerca template..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tutti i tipi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i tipi</SelectItem>
              {types.map(t => (
                <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tutti gli stati" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="draft">Bozza</SelectItem>
              <SelectItem value="active">Attivo</SelectItem>
              <SelectItem value="archived">Archiviato</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nuovo Template
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="border rounded-lg bg-white">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map(row => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-gray-500">
                    Nessun template trovato
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-gray-500">
              {table.getFilteredRowModel().rows.length} template
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600">
                Pagina {table.getState().pagination.pageIndex + 1} di {table.getPageCount() || 1}
              </span>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <TemplateWizardModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma Eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare il template "{selectedTemplate?.name}"? Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Annulla</Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedTemplate && deleteMutation.mutate(selectedTemplate.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
