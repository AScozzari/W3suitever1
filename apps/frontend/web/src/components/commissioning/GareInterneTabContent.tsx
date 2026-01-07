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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Building2,
  Plus,
  Users,
  Award,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Copy,
  Calendar,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import RaceFormModal from './RaceFormModal';

interface Race {
  id: string;
  tenantId: string | null;
  raceType: 'operatore' | 'interna';
  name: string;
  description: string | null;
  validFrom: string;
  validTo: string | null;
  isEvergreen: boolean;
  operatorId: string | null;
  channelId: string | null;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  configuratorsCount?: number;
  createdAt: string;
  updatedAt: string;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: 'Bozza', color: 'bg-gray-100 text-gray-700' },
  active: { label: 'Attiva', color: 'bg-green-100 text-green-700' },
  completed: { label: 'Completata', color: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Annullata', color: 'bg-red-100 text-red-700' },
};

const scopeLabels: Record<string, string> = {
  PDV: 'Punto Vendita',
  RS: 'Ragione Sociale',
  MULTI_RS: 'Multi Ragione Sociale',
  USER: 'Utente',
  MULTI_USER: 'Multi Utente',
};

export default function GareInterneTabContent() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'validFrom', desc: true }]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);

  const { data: races = [], isLoading } = useQuery<Race[]>({
    queryKey: ['/api/commissioning/races', { type: 'interna' }],
  });

  const filteredRaces = useMemo(() => {
    let filtered = races;
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }
    return filtered;
  }, [races, statusFilter]);

  const kpis = useMemo(() => {
    const active = races.filter(r => r.status === 'active').length;
    const totalParticipants = races.reduce((acc, r) => acc + (r.configuratorsCount || 0), 0);
    const expiringSoon = races.filter(r => {
      if (!r.validTo || r.isEvergreen) return false;
      const daysLeft = Math.ceil((new Date(r.validTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysLeft > 0 && daysLeft <= 30;
    }).length;
    return { active, totalParticipants, expiringSoon, total: races.length };
  }, [races]);

  const columns = useMemo<ColumnDef<Race>[]>(() => [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2 -ml-2"
          data-testid="sort-name"
        >
          Gara
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
      accessorKey: 'validFrom',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2 -ml-2"
          data-testid="sort-validFrom"
        >
          Validità
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const from = format(new Date(row.original.validFrom), 'dd MMM yyyy', { locale: it });
        const to = row.original.validTo 
          ? format(new Date(row.original.validTo), 'dd MMM yyyy', { locale: it })
          : 'Evergreen';
        return (
          <div className="text-sm">
            <span className="text-gray-700">{from}</span>
            <span className="text-gray-400 mx-1">→</span>
            <span className={row.original.isEvergreen ? 'text-green-600 font-medium' : 'text-gray-700'}>{to}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'configuratorsCount',
      header: 'Configuratori',
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-mono">
          {row.original.configuratorsCount || 0}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Stato',
      cell: ({ row }) => {
        const status = statusLabels[row.original.status] || statusLabels.draft;
        return (
          <Badge className={`${status.color} border-0`}>
            {status.label}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`actions-race-${row.original.id}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setSelectedRace(row.original); setModalOpen(true); }} data-testid="action-view">
              <Eye className="h-4 w-4 mr-2" />
              Visualizza
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setSelectedRace(row.original); setModalOpen(true); }} data-testid="action-edit">
              <Edit className="h-4 w-4 mr-2" />
              Modifica
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { /* Clone logic */ }} data-testid="action-clone">
              <Copy className="h-4 w-4 mr-2" />
              Duplica
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], []);

  const table = useReactTable({
    data: filteredRaces,
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
            <Building2 className="h-5 w-5 text-blue-500" />
            Gare Interne
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Gestione gare e incentivi interni aziendali (Dealer → Team/Agenti)
          </p>
        </div>
        <Button 
          onClick={() => { setSelectedRace(null); setModalOpen(true); }}
          className="flex items-center gap-2"
          style={{ background: 'hsl(var(--brand-orange))' }}
          data-testid="button-nuova-gara-interna"
        >
          <Plus className="h-4 w-4" />
          Nuova Gara Interna
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-gray-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-green-600">
              <TrendingUp className="h-5 w-5" />
              <CardTitle className="text-sm font-medium">Gare Attive</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{kpis.active}</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-blue-600">
              <Award className="h-5 w-5" />
              <CardTitle className="text-sm font-medium">Totale Gare</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{kpis.total}</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-purple-600">
              <Users className="h-5 w-5" />
              <CardTitle className="text-sm font-medium">Configuratori</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{kpis.totalParticipants}</p>
            <p className="text-xs text-gray-500">In tutte le gare</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-amber-600">
              <Calendar className="h-5 w-5" />
              <CardTitle className="text-sm font-medium">In Scadenza</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{kpis.expiringSoon}</p>
            <p className="text-xs text-gray-500">Prossimi 30 giorni</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cerca gare interne..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10"
                data-testid="input-search-races-interne"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter-interne">
                <SelectValue placeholder="Filtra per stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="active">Attive</SelectItem>
                <SelectItem value="draft">Bozze</SelectItem>
                <SelectItem value="completed">Completate</SelectItem>
                <SelectItem value="cancelled">Annullate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="text-gray-400">Caricamento...</div>
            </div>
          ) : filteredRaces.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Building2 className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Nessuna gara interna configurata</p>
                <p className="text-sm">Crea una nuova gara interna per i tuoi team e agenti</p>
              </div>
            </div>
          ) : (
            <>
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
                    <TableRow key={row.id} data-testid={`row-race-interna-${row.original.id}`}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-gray-500">
                  {table.getFilteredRowModel().rows.length} gare totali
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    data-testid="btn-prev-page-interne"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-600">
                    Pagina {table.getState().pagination.pageIndex + 1} di {table.getPageCount()}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    data-testid="btn-next-page-interne"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <RaceFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        race={selectedRace}
        raceType="interna"
      />
    </div>
  );
}
