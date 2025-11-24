import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  ArrowUpDown,
  MoreHorizontal,
  Search,
  Filter,
  Eye,
  Edit,
  Trash,
  MoveRight,
  Clock,
  Euro,
  TrendingUp,
  User,
  Building,
  Globe,
  Handshake,
  Mail,
  Phone,
  Linkedin,
  Target,
  Users,
  ChevronLeft,
  ChevronRight,
  Copy,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface Deal {
  id: string;
  tenantId: string;
  legalEntityId?: string | null;
  storeId: string;
  ownerUserId: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
  assignedTeamId?: string | null;
  pipelineId: string;
  stage: string;
  status: 'open' | 'won' | 'lost';
  leadId?: string | null;
  campaignId?: string | null;
  sourceChannel?: string | null;
  personId: string;
  customerId?: string | null;
  estimatedValue?: number | null;
  probability?: number | null;
  driverId?: string | null;
  agingDays?: number | null;
  wonAt?: string | null;
  lostAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // Campi restituiti dal backend con JOIN
  customerName?: string | null;
  customerCompanyName?: string | null;
  customerType?: 'b2b' | 'b2c' | null;
}

interface DealsDataTableProps {
  pipelineId: string;
}

// Helper: Get avatar color from name hash
const getAvatarColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 55%)`;
};

// Helper: Get initials from name
const getInitials = (name: string): string => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// Helper: Get channel icon
const getChannelIcon = (channel?: string | null) => {
  if (!channel) return Users;
  const ch = channel.toLowerCase();
  if (ch.includes('web') || ch.includes('inbound')) return Globe;
  if (ch.includes('partner') || ch.includes('referral')) return Handshake;
  if (ch.includes('email') || ch.includes('campaign')) return Mail;
  if (ch.includes('call') || ch.includes('cold')) return Phone;
  if (ch.includes('linkedin')) return Linkedin;
  if (ch.includes('event')) return Target;
  return Users;
};

// Helper: Get aging color
const getAgingColor = (days?: number | null): string => {
  if (!days) return 'hsl(var(--muted))';
  if (days < 30) return '#10b981'; // green
  if (days < 60) return '#f59e0b'; // amber
  return '#ef4444'; // red
};

// Helper: Format currency
const formatCurrency = (value?: number | null): string => {
  if (!value) return '€0';
  if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `€${(value / 1000).toFixed(0)}k`;
  return `€${value.toFixed(0)}`;
};

export default function DealsDataTable({ pipelineId }: DealsDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'wonAt', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch deals
  const { data: dealsResponse, isLoading } = useQuery<Deal[]>({
    queryKey: [`/api/crm/deals?pipelineId=${pipelineId}`],
  });

  // Fetch teams for Team column lookup
  const { data: allTeams = [] } = useQuery<Array<{ id: string; name: string; teamType: string }>>({
    queryKey: ['/api/teams'],
  });

  const deals = dealsResponse || [];

  // Duplicate deal mutation
  const duplicateMutation = useMutation({
    mutationFn: async (dealId: string) => {
      return apiRequest(`/api/crm/deals/${dealId}/duplicate`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crm/deals?pipelineId=${pipelineId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/analytics'] });
      toast({
        title: 'Deal duplicata',
        description: 'La deal è stata duplicata con successo.',
      });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: 'Impossibile duplicare la deal.',
        variant: 'destructive',
      });
    },
  });

  // Delete deal mutation
  const deleteMutation = useMutation({
    mutationFn: async (dealId: string) => {
      return apiRequest(`/api/crm/deals/${dealId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/crm/deals?pipelineId=${pipelineId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/analytics'] });
      toast({
        title: 'Deal eliminata',
        description: 'La deal è stata eliminata con successo.',
      });
      setDeleteDialogOpen(false);
      setDealToDelete(null);
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare la deal.',
        variant: 'destructive',
      });
    },
  });

  // Handlers
  const handleDuplicate = (dealId: string) => {
    duplicateMutation.mutate(dealId);
  };

  const handleDeleteClick = (dealId: string) => {
    setDealToDelete(dealId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (dealToDelete) {
      deleteMutation.mutate(dealToDelete);
    }
  };

  const handleEdit = () => {
    toast({
      title: 'Funzionalità in arrivo',
      description: 'La modifica della deal sarà disponibile a breve.',
    });
  };

  // Column definitions
  const columns = useMemo<ColumnDef<Deal>[]>(
    () => [
      {
        accessorKey: 'customerName',
        header: 'Cliente',
        cell: ({ row }) => {
          const customerName = row.original.customerName || 'Non definito';
          const companyName = row.original.customerCompanyName;
          const isB2B = row.original.customerType === 'b2b';
          
          return (
            <div className="flex items-center gap-2 min-w-[200px]">
              {isB2B ? (
                <Building className="h-4 w-4 text-windtre-purple flex-shrink-0" />
              ) : (
                <User className="h-4 w-4 text-windtre-orange flex-shrink-0" />
              )}
              <div className="flex flex-col">
                <span className="font-medium text-sm truncate max-w-[180px]" title={customerName}>
                  {customerName}
                </span>
                {isB2B && companyName && (
                  <span className="text-xs text-muted-foreground truncate max-w-[180px]" title={companyName}>
                    {companyName}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'ownerUserId',
        header: 'Assegnato',
        cell: ({ row }) => {
          const ownerName = row.original.ownerName || 'Non assegnato';
          const ownerEmail = row.original.ownerEmail || '';
          const avatarColor = getAvatarColor(ownerName);
          const initials = getInitials(ownerName);
          
          return (
            <div className="flex items-center gap-2">
              <div
                className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
                style={{ background: avatarColor }}
                title={ownerEmail}
              >
                {initials}
              </div>
              <span className="text-sm truncate max-w-[100px]" title={ownerEmail}>
                {ownerName}
              </span>
            </div>
          );
        },
        filterFn: 'includesString',
      },
      {
        accessorKey: 'assignedTeamId',
        header: 'Team Assegnato',
        cell: ({ row }) => {
          const teamId = row.original.assignedTeamId;
          
          if (!teamId) {
            return <span className="text-muted-foreground text-sm">-</span>;
          }
          
          // Lookup team from allTeams
          const team = allTeams.find((t: any) => t.id === teamId);
          
          if (!team) {
            return <span className="text-muted-foreground text-sm">Non assegnato</span>;
          }
          
          // Determine badge color based on team type
          const isCRM = team.teamType === 'crm';
          const badgeColor = isCRM 
            ? 'bg-blue-50 text-blue-700 border-blue-200' 
            : 'bg-purple-50 text-purple-700 border-purple-200';
          
          return (
            <Badge 
              variant="secondary" 
              className={`font-medium ${badgeColor}`}
            >
              <Users className="h-3 w-3 mr-1" />
              {team.name}
              <span className="ml-1 text-[10px] opacity-70">
                ({isCRM ? 'CRM' : 'Vendite'})
              </span>
            </Badge>
          );
        },
        filterFn: (row, id, value) => {
          return !!row.getValue(id) === value;
        },
      },
      {
        accessorKey: 'stage',
        header: 'Stato',
        cell: ({ row }) => (
          <Badge variant="outline" className="font-medium">
            {row.original.stage}
          </Badge>
        ),
        filterFn: 'includesString',
      },
      {
        accessorKey: 'agingDays',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-transparent p-0 whitespace-nowrap"
          >
            Giorni nello stato
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => {
          const days = row.original.agingDays || 0;
          const color = getAgingColor(days);
          return (
            <div
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
              style={{ background: `${color}20`, color }}
            >
              <TrendingUp className="h-3 w-3" />
              {days} giorni
            </div>
          );
        },
      },
      {
        accessorKey: 'wonAt',
        header: 'Data Chiusura',
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-sm">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {row.original.wonAt ? (
              <span>{new Date(row.original.wonAt).toLocaleDateString('it-IT')}</span>
            ) : (
              <span className="text-muted-foreground italic">In corso</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'sourceChannel',
        header: 'Fonte',
        cell: ({ row }) => {
          const ChannelIcon = getChannelIcon(row.original.sourceChannel);
          return (
            <div className="flex items-center gap-2">
              <ChannelIcon className="h-4 w-4 text-windtre-purple" />
              <span className="text-sm truncate max-w-[100px]" title={row.original.sourceChannel || 'Unknown'}>
                {row.original.sourceChannel || 'Unknown'}
              </span>
            </div>
          );
        },
        filterFn: 'includesString',
      },
      {
        id: 'actions',
        header: 'Azioni',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="h-8 w-8 p-0 flex items-center justify-center rounded hover:bg-accent transition-colors"
                data-testid={`button-actions-${row.original.id}`}
              >
                <MoreHorizontal className="h-4 w-4 text-foreground opacity-70 hover:opacity-100" />
                <span className="sr-only">Apri menu</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem data-testid={`action-view-${row.original.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                Visualizza Dettagli
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleEdit}
                data-testid={`action-edit-${row.original.id}`}
              >
                <Edit className="mr-2 h-4 w-4" />
                Modifica Deal
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDuplicate(row.original.id)}
                disabled={duplicateMutation.isPending}
                data-testid={`action-duplicate-${row.original.id}`}
              >
                <Copy className="mr-2 h-4 w-4" />
                {duplicateMutation.isPending ? 'Duplicazione...' : 'Duplica Deal'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive" 
                onClick={() => handleDeleteClick(row.original.id)}
                disabled={deleteMutation.isPending}
                data-testid={`action-delete-${row.original.id}`}
              >
                <Trash className="mr-2 h-4 w-4" />
                Elimina Deal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [allTeams, duplicateMutation.isPending, deleteMutation.isPending, handleDuplicate, handleDeleteClick, handleEdit]
  );

  const table = useReactTable({
    data: deals,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Quick filters
  const applyQuickFilter = (filterType: 'aging' | 'highValue' | 'closingSoon') => {
    setColumnFilters([]);
    if (filterType === 'aging') {
      setColumnFilters([{ id: 'agingDays', value: { min: 60 } }]);
    } else if (filterType === 'highValue') {
      setColumnFilters([{ id: 'estimatedValue', value: { min: 100000 } }]);
    } else if (filterType === 'closingSoon') {
      // Would need close date field - skip for now
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">Caricamento deals...</div>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Filters & Search */}
        <Card className="p-4 glass-card border-0">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Global Search */}
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca deal..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10"
              data-testid="input-search-deals"
            />
          </div>

          {/* Stage Filter */}
          <Select
            value={(columnFilters.find((f) => f.id === 'stage')?.value as string) || ''}
            onValueChange={(value) => setColumnFilters([{ id: 'stage', value }])}
          >
            <SelectTrigger className="w-[150px]" data-testid="select-stage-filter">
              <SelectValue placeholder="Filtra Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">Tutti</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="progress">In Corso</SelectItem>
              <SelectItem value="pending">In Attesa</SelectItem>
            </SelectContent>
          </Select>

          {/* Quick Filters */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyQuickFilter('aging')}
              data-testid="button-quick-filter-aging"
            >
              <Filter className="mr-1 h-3 w-3" />
              Aging &gt;60d
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyQuickFilter('highValue')}
              data-testid="button-quick-filter-value"
            >
              <Filter className="mr-1 h-3 w-3" />
              High Value
            </Button>
          </div>
        </div>
      </Card>

      {/* Data Table */}
      <Card className="glass-card border-0">
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
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                  data-testid={`row-deal-${row.original.id}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </motion.tr>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  Nessun deal trovato.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Mostrando {table.getRowModel().rows.length} di {deals.length} deal
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Pagina {table.getState().pagination.pageIndex + 1} di {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            data-testid="button-next-page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sei sicuro di voler eliminare questa deal?</AlertDialogTitle>
          <AlertDialogDescription>
            Questa azione non può essere annullata. La deal verrà eliminata permanentemente dal sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setDealToDelete(null)}>
            Annulla
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Eliminazione...' : 'Elimina'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
