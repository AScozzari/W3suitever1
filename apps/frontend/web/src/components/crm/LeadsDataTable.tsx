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
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Card } from '@/components/ui/card';
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
  ArrowUpDown,
  MoreHorizontal,
  Search,
  Filter,
  Eye,
  Edit,
  Trash,
  Phone as PhoneIcon,
  Mail,
  Building,
  User,
  Globe,
  Handshake,
  Linkedin,
  Target,
  Users,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Lead {
  id: string;
  tenantId: string;
  legalEntityId?: string | null;
  storeId: string;
  personId: string;
  ownerUserId?: string | null;
  campaignId?: string | null;
  sourceChannel?: string | null;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  leadScore?: number | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  productInterest?: string | null;
  driverId?: string | null;
  createdAt: string;
  updatedAt: string;
  ownerFirstName?: string | null;
  ownerLastName?: string | null;
}

interface LeadsDataTableProps {
  campaignId: string;
}

// Helper: Get channel icon
const getChannelIcon = (channel?: string | null) => {
  if (!channel) return Users;
  const ch = channel.toLowerCase();
  if (ch.includes('web') || ch.includes('landing')) return Globe;
  if (ch.includes('partner') || ch.includes('referral')) return Handshake;
  if (ch.includes('email') || ch.includes('campaign')) return Mail;
  if (ch.includes('call') || ch.includes('cold')) return PhoneIcon;
  if (ch.includes('linkedin')) return Linkedin;
  if (ch.includes('event')) return Target;
  return Users;
};

// Helper: Get status color and label
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'new':
      return { color: 'hsl(var(--brand-orange))', label: 'Nuovo' };
    case 'contacted':
      return { color: '#3b82f6', label: 'Contattato' };
    case 'qualified':
      return { color: '#8b5cf6', label: 'Qualificato' };
    case 'converted':
      return { color: '#10b981', label: 'Convertito' };
    case 'lost':
      return { color: '#ef4444', label: 'Perso' };
    default:
      return { color: 'hsl(var(--muted))', label: status };
  }
};

// Helper: Get lead score color
const getLeadScoreColor = (score?: number | null): string => {
  if (!score) return 'hsl(var(--muted))';
  if (score >= 80) return '#10b981'; // green - hot
  if (score >= 60) return '#3b82f6'; // blue - warm
  if (score >= 40) return '#f59e0b'; // amber - lukewarm
  return '#6b7280'; // gray - cold
};

export default function LeadsDataTable({ campaignId }: LeadsDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Fetch leads with campaign filter
  const { data: leadsData, isLoading } = useQuery<Lead[]>({
    queryKey: [`/api/crm/leads?campaign=${campaignId}`],
  });

  const leads = leadsData || [];

  // Define columns
  const columns = useMemo<ColumnDef<Lead>[]>(
    () => [
      {
        accessorFn: (row) => `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'N/A',
        id: 'fullName',
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 font-semibold hover:text-windtre-orange transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            data-testid="sort-fullname"
          >
            <User className="h-4 w-4" />
            Nome Lead
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => {
          const fullName = `${row.original.firstName || ''} ${row.original.lastName || ''}`.trim();
          return (
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {fullName || 'N/A'}
            </div>
          );
        },
      },
      {
        accessorKey: 'email',
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 font-semibold hover:text-windtre-orange transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            data-testid="sort-email"
          >
            <Mail className="h-4 w-4" />
            Email
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {row.original.email || 'N/A'}
          </div>
        ),
      },
      {
        accessorKey: 'phone',
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 font-semibold hover:text-windtre-orange transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            data-testid="sort-phone"
          >
            <PhoneIcon className="h-4 w-4" />
            Telefono
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {row.original.phone || 'N/A'}
          </div>
        ),
      },
      {
        accessorKey: 'companyName',
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 font-semibold hover:text-windtre-orange transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            data-testid="sort-company"
          >
            <Building className="h-4 w-4" />
            Azienda
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {row.original.companyName || 'N/A'}
          </div>
        ),
      },
      {
        accessorKey: 'sourceChannel',
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 font-semibold hover:text-windtre-orange transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            data-testid="sort-source"
          >
            <Globe className="h-4 w-4" />
            Canale
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => {
          const channel = row.original.sourceChannel;
          const ChannelIcon = getChannelIcon(channel);
          return (
            <div className="flex items-center gap-2">
              <ChannelIcon className="h-4 w-4" style={{ color: 'hsl(var(--success))' }} />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {channel || 'N/A'}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'leadScore',
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 font-semibold hover:text-windtre-orange transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            data-testid="sort-score"
          >
            <TrendingUp className="h-4 w-4" />
            Score
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => {
          const score = row.original.leadScore || 0;
          return (
            <div className="flex items-center gap-2">
              <div 
                className="px-2 py-1 rounded-md text-xs font-semibold"
                style={{ 
                  background: `${getLeadScoreColor(score)}20`,
                  color: getLeadScoreColor(score)
                }}
              >
                {score}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 font-semibold hover:text-windtre-orange transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            data-testid="sort-status"
          >
            Stato
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => {
          const { color, label } = getStatusConfig(row.original.status);
          return (
            <Badge 
              variant="outline" 
              className="text-xs"
              style={{ borderColor: color, color, background: `${color}10` }}
            >
              {label}
            </Badge>
          );
        },
      },
      {
        accessorFn: (row) => 
          row.ownerFirstName && row.ownerLastName 
            ? `${row.ownerFirstName} ${row.ownerLastName}`
            : 'Non assegnato',
        id: 'owner',
        header: ({ column }) => (
          <button
            className="flex items-center gap-2 font-semibold hover:text-windtre-orange transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            data-testid="sort-owner"
          >
            <User className="h-4 w-4" />
            Owner
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => {
          const owner = row.ownerFirstName && row.ownerLastName 
            ? `${row.ownerFirstName} ${row.ownerLastName}`
            : 'Non assegnato';
          return (
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {owner}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Azioni',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" data-testid={`actions-lead-${row.original.id}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem data-testid="action-view-lead">
                <Eye className="h-4 w-4 mr-2" />
                Visualizza
              </DropdownMenuItem>
              <DropdownMenuItem data-testid="action-edit-lead">
                <Edit className="h-4 w-4 mr-2" />
                Modifica
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" data-testid="action-delete-lead">
                <Trash className="h-4 w-4 mr-2" />
                Elimina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: leads,
    columns,
    state: { sorting, columnFilters, globalFilter, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (isLoading) {
    return (
      <Card className="p-6" style={{ background: 'var(--glass-bg-heavy)', border: '1px solid var(--glass-card-border)' }}>
        <div className="text-center" style={{ color: 'var(--text-secondary)' }}>
          Caricamento leads...
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
          <Input
            placeholder="Cerca lead per nome, email, azienda..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10"
            style={{ 
              background: 'var(--glass-bg-heavy)',
              border: '1px solid var(--glass-card-border)'
            }}
            data-testid="input-search-leads"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select 
            value={(table.getColumn('status')?.getFilterValue() as string) ?? 'all'}
            onValueChange={(value) => 
              table.getColumn('status')?.setFilterValue(value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger className="w-[180px]" data-testid="filter-status">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtra per stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="new">Nuovo</SelectItem>
              <SelectItem value="contacted">Contattato</SelectItem>
              <SelectItem value="qualified">Qualificato</SelectItem>
              <SelectItem value="converted">Convertito</SelectItem>
              <SelectItem value="lost">Perso</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card 
        className="overflow-hidden"
        style={{ 
          background: 'var(--glass-bg-heavy)',
          border: '1px solid var(--glass-card-border)'
        }}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} style={{ borderColor: 'var(--glass-card-border)' }}>
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
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ borderColor: 'var(--glass-card-border)' }}
                  data-testid={`row-lead-${row.original.id}`}
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
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <p style={{ color: 'var(--text-secondary)' }}>Nessun lead trovato</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Mostrando {table.getRowModel().rows.length} di {leads.length} lead
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            data-testid="pagination-prev"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Pagina {table.getState().pagination.pageIndex + 1} di {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            data-testid="pagination-next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
