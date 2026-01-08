import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  Bell,
  Calculator,
  Users,
  Shield,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  Store,
  Building,
  User,
  AtSign,
  Package,
  Function,
} from 'lucide-react';
import ClusterFormModal from './ClusterFormModal';
import VariableMappingsSection from './VariableMappingsSection';
import ValuePackagesSection from './ValuePackagesSection';
import FunctionsSection from './FunctionsSection';

interface Cluster {
  id: string;
  tenantId: string;
  name: string;
  entityType: 'RS' | 'PDV' | 'RISORSA';
  description: string | null;
  isActive: boolean;
  entitiesCount?: number;
  driversCount?: number;
  createdAt: string;
  updatedAt: string;
}

const entityTypeLabels: Record<string, { label: string; icon: typeof Building; color: string }> = {
  RS: { label: 'Ragione Sociale', icon: Building, color: 'bg-blue-100 text-blue-700' },
  PDV: { label: 'Punto Vendita', icon: Store, color: 'bg-green-100 text-green-700' },
  RISORSA: { label: 'Risorsa', icon: User, color: 'bg-purple-100 text-purple-700' },
};

export default function ImpostazioniTabContent() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);

  const { data: clusters = [], isLoading } = useQuery<Cluster[]>({
    queryKey: ['/api/commissioning/clusters'],
  });

  const filteredClusters = useMemo(() => {
    let filtered = clusters;
    if (entityTypeFilter !== 'all') {
      filtered = filtered.filter(c => c.entityType === entityTypeFilter);
    }
    return filtered;
  }, [clusters, entityTypeFilter]);

  const kpis = useMemo(() => {
    const rs = clusters.filter(c => c.entityType === 'RS').length;
    const pdv = clusters.filter(c => c.entityType === 'PDV').length;
    const risorsa = clusters.filter(c => c.entityType === 'RISORSA').length;
    const active = clusters.filter(c => c.isActive).length;
    return { rs, pdv, risorsa, active, total: clusters.length };
  }, [clusters]);

  const columns = useMemo<ColumnDef<Cluster>[]>(() => [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2 -ml-2"
          data-testid="sort-cluster-name"
        >
          Nome Cluster
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-gray-900">{row.original.name}</div>
          {row.original.description && (
            <div className="text-sm text-gray-500 truncate max-w-[200px]">{row.original.description}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'entityType',
      header: 'Tipo Entità',
      cell: ({ row }) => {
        const type = entityTypeLabels[row.original.entityType];
        const Icon = type?.icon || Layers;
        return (
          <Badge className={`${type?.color || 'bg-gray-100'} border-0 flex items-center gap-1 w-fit`}>
            <Icon className="h-3 w-3" />
            {type?.label || row.original.entityType}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'entitiesCount',
      header: 'Entità',
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-mono">
          {row.original.entitiesCount || 0}
        </Badge>
      ),
    },
    {
      accessorKey: 'driversCount',
      header: 'Driver',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono">
          {row.original.driversCount || 0}
        </Badge>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Stato',
      cell: ({ row }) => (
        <Badge className={row.original.isActive ? 'bg-green-100 text-green-700 border-0' : 'bg-gray-100 text-gray-500 border-0'}>
          {row.original.isActive ? 'Attivo' : 'Disattivato'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`actions-cluster-${row.original.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setSelectedCluster(row.original); setModalOpen(true); }} data-testid="action-view-cluster">
              <Eye className="h-4 w-4 mr-2" />
              Visualizza
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSelectedCluster(row.original); setModalOpen(true); }} data-testid="action-edit-cluster">
              <Edit className="h-4 w-4 mr-2" />
              Modifica
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" data-testid="action-delete-cluster">
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], []);

  const table = useReactTable({
    data: filteredClusters,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-600" />
            Impostazioni Commissioning
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Configurazioni generali per gare, cluster e incentivi
          </p>
        </div>
      </div>

      <Accordion type="multiple" defaultValue={['clusters']} className="space-y-4">
        <AccordionItem value="clusters" className="border rounded-lg bg-white">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Layers className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">Cluster Partecipanti</div>
                <div className="text-sm text-gray-500 font-normal">Gruppi omogenei di entità (RS, PDV, Risorse) con driver associati</div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <Card className="border border-gray-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Building className="h-4 w-4" />
                    <CardTitle className="text-sm font-medium">Ragioni Sociali</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">{kpis.rs}</p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-green-600">
                    <Store className="h-4 w-4" />
                    <CardTitle className="text-sm font-medium">Punti Vendita</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">{kpis.pdv}</p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-purple-600">
                    <User className="h-4 w-4" />
                    <CardTitle className="text-sm font-medium">Risorse</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">{kpis.risorsa}</p>
                </CardContent>
              </Card>

              <Card className="border border-gray-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Layers className="h-4 w-4" />
                    <CardTitle className="text-sm font-medium">Totale Cluster</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">{kpis.total}</p>
                  <p className="text-xs text-gray-500">{kpis.active} attivi</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cerca cluster..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-clusters"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-entity-type-filter">
                    <SelectValue placeholder="Filtra per tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i tipi</SelectItem>
                    <SelectItem value="RS">Ragione Sociale</SelectItem>
                    <SelectItem value="PDV">Punto Vendita</SelectItem>
                    <SelectItem value="RISORSA">Risorsa</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => { setSelectedCluster(null); setModalOpen(true); }}
                  className="flex items-center gap-2"
                  style={{ background: 'hsl(var(--brand-orange))' }}
                  data-testid="button-nuovo-cluster"
                >
                  <Plus className="h-4 w-4" />
                  Nuovo Cluster
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="text-gray-400">Caricamento...</div>
              </div>
            ) : filteredClusters.length === 0 ? (
              <div className="h-48 flex items-center justify-center border rounded-lg bg-gray-50">
                <div className="text-center text-gray-400">
                  <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nessun cluster configurato</p>
                  <p className="text-sm">Crea un nuovo cluster per raggruppare le entità</p>
                </div>
              </div>
            ) : (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <TableHead key={header.id}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id} data-testid={`row-cluster-${row.original.id}`}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div className="text-sm text-gray-500">
                    {table.getFilteredRowModel().rows.length} cluster totali
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                      data-testid="btn-prev-page-clusters"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-600">
                      Pagina {table.getState().pagination.pageIndex + 1} di {table.getPageCount() || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                      data-testid="btn-next-page-clusters"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="commissioning-system" className="border rounded-lg bg-white">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Calculator className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">Sistema Commissioning</div>
                <div className="text-sm text-gray-500 font-normal">Variabili, Pacchetti e Funzioni per il calcolo commissioni</div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <Tabs defaultValue="variables" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="variables" className="flex items-center gap-2" data-testid="tab-mapping-variabili">
                  <AtSign className="h-4 w-4" />
                  <span className="hidden sm:inline">Mapping Variabili</span>
                  <span className="sm:hidden">L1</span>
                </TabsTrigger>
                <TabsTrigger value="packages" className="flex items-center gap-2" data-testid="tab-pacchetto-commissioning">
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">Pacchetto Commissioning</span>
                  <span className="sm:hidden">L2</span>
                </TabsTrigger>
                <TabsTrigger value="functions" className="flex items-center gap-2" data-testid="tab-funzioni">
                  <Function className="h-4 w-4" />
                  <span className="hidden sm:inline">Funzioni</span>
                  <span className="sm:hidden">L3</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="variables">
                <VariableMappingsSection />
              </TabsContent>
              <TabsContent value="packages">
                <ValuePackagesSection />
              </TabsContent>
              <TabsContent value="functions">
                <FunctionsSection />
              </TabsContent>
            </Tabs>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="notifications" className="border rounded-lg bg-white">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Bell className="h-5 w-5 text-amber-600" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">Notifiche</div>
                <div className="text-sm text-gray-500 font-normal">Gestisci notifiche per gare e obiettivi</div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="h-32 flex items-center justify-center border rounded-lg bg-gray-50">
              <p className="text-gray-400">Configurazione in arrivo...</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="permissions" className="border rounded-lg bg-white">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <Shield className="h-5 w-5 text-red-600" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-gray-900">Permessi e Ruoli</div>
                <div className="text-sm text-gray-500 font-normal">Gestisci chi può creare e modificare gare</div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="h-32 flex items-center justify-center border rounded-lg bg-gray-50">
              <p className="text-gray-400">Configurazione in arrivo...</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <ClusterFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        cluster={selectedCluster}
      />
    </div>
  );
}
