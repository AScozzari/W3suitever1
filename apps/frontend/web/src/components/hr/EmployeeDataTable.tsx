import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { apiRequest } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  MoreHorizontal,
  ArrowUpDown,
  Eye,
  Edit,
  Shield,
  Trash2,
  Users as UsersIcon,
  Mail,
  Briefcase,
  Building2,
  UserCog,
} from 'lucide-react';

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  position?: string;
  department?: string;
  avatarUrl?: string;
  status?: string;
}

interface Assignment {
  userId: string;
  roleId: string;
  roleName: string;
  roleDescription?: string;
  scopeType: 'tenant' | 'legal_entity' | 'store';
  scopeId: string;
  scopeDetails?: {
    id: string;
    name: string;
    code?: string;
  };
}

interface Team {
  id: string;
  name: string;
  department?: string;
  userMembers?: string[];
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface Store {
  id: string;
  code: string;
  nome: string;
  legalEntityId: string;
}

interface EmployeeRow extends User {
  fullName: string;
  initials: string;
  primaryRole: string;
  rolesCount: number;
  primaryStore: string;
  teamsCount: number;
  assignments?: Assignment[];
}

interface EmployeeDataTableProps {
  onEmployeeClick?: (userId: string) => void;
  onEditEmployee?: (userId: string) => void;
  currentUserRole?: string;
}

export function EmployeeDataTable({ onEmployeeClick, onEditEmployee, currentUserRole }: EmployeeDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');

  // Fetch data
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users']
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['/api/teams']
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['/api/roles']
  });

  const { data: stores = [] } = useQuery<Store[]>({
    queryKey: ['/api/stores']
  });

  // Fetch assignments for all users
  const assignmentQueries = useQuery({
    queryKey: ['/api/users/assignments-all', users.map(u => u.id)],
    queryFn: async () => {
      if (users.length === 0) return {};
      
      const results = await Promise.all(
        users.map(async (user) => {
          try {
            const response = await apiRequest(`/api/users/${user.id}/assignments`);
            const assignments = response?.data ?? response;
            return { userId: user.id, assignments: Array.isArray(assignments) ? assignments : [] };
          } catch (error) {
            return { userId: user.id, assignments: [] };
          }
        })
      );
      
      return results.reduce((acc, curr) => {
        acc[curr.userId] = curr.assignments;
        return acc;
      }, {} as Record<string, Assignment[]>);
    },
    enabled: users.length > 0
  });

  const assignmentsByUser = assignmentQueries.data || {};

  // Transform users to table rows
  const tableData = useMemo<EmployeeRow[]>(() => {
    return users.map(user => {
      const assignments = assignmentsByUser[user.id] || [];
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utente';
      const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U';
      
      // Get primary role (first assignment or position)
      const primaryRole = assignments[0]?.roleName || user.position || 'N/D';
      const rolesCount = new Set(assignments.map(a => a.roleId)).size;
      
      // Get primary store
      const storeAssignment = assignments.find(a => a.scopeType === 'store');
      const primaryStore = storeAssignment?.scopeDetails?.name || 'N/D';
      
      // Count teams
      const teamsCount = teams.filter(t => t.userMembers?.includes(user.id)).length;

      return {
        ...user,
        fullName,
        initials,
        primaryRole,
        rolesCount,
        primaryStore,
        teamsCount,
        assignments,
      };
    });
  }, [users, assignmentsByUser, teams]);

  // Filter data based on advanced filters
  const filteredData = useMemo(() => {
    return tableData.filter(row => {
      const matchesRole = roleFilter === 'all' || 
        row.assignments?.some(a => a.roleId === roleFilter);
      
      const matchesStore = storeFilter === 'all' || 
        row.assignments?.some(a => a.scopeType === 'store' && a.scopeId === storeFilter);
      
      const matchesTeam = teamFilter === 'all' || 
        teams.some(t => t.id === teamFilter && t.userMembers?.includes(row.id));

      return matchesRole && matchesStore && matchesTeam;
    });
  }, [tableData, roleFilter, storeFilter, teamFilter, teams]);

  // Define columns
  const columns = useMemo<ColumnDef<EmployeeRow>[]>(
    () => [
      {
        accessorKey: 'fullName',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-orange-500/10 hover:text-orange-600"
            data-testid="header-name"
          >
            Dipendente
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 shadow-sm">
              <AvatarImage src={row.original.avatarUrl} alt={row.original.fullName} />
              <AvatarFallback className="bg-gradient-to-br from-orange-100 to-orange-50 text-orange-700 font-semibold text-xs">
                {row.original.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-gray-900" data-testid={`text-name-${row.original.id}`}>
                {row.original.fullName}
              </p>
              <p className="text-xs text-gray-500">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => (
          <a
            href={`mailto:${row.original.email}`}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-orange-600 transition-colors"
            data-testid={`link-email-${row.original.id}`}
          >
            <Mail className="h-3.5 w-3.5" />
            {row.original.email}
          </a>
        ),
      },
      {
        accessorKey: 'primaryRole',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="hover:bg-orange-500/10 hover:text-orange-600"
            data-testid="header-role"
          >
            Posizione
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Briefcase className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-sm font-medium" data-testid={`text-role-${row.original.id}`}>
              {row.original.primaryRole}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'rolesCount',
        header: 'Ruoli',
        cell: ({ row }) => (
          <Badge 
            variant="outline" 
            className="border-purple-200 bg-purple-50 text-purple-700"
            data-testid={`badge-roles-${row.original.id}`}
          >
            {row.original.rolesCount} {row.original.rolesCount === 1 ? 'ruolo' : 'ruoli'}
          </Badge>
        ),
      },
      {
        accessorKey: 'primaryStore',
        header: 'Store',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-sm" data-testid={`text-store-${row.original.id}`}>
              {row.original.primaryStore}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'teamsCount',
        header: 'Team',
        cell: ({ row }) => (
          <Badge 
            variant="outline" 
            className="border-emerald-200 bg-emerald-50 text-emerald-700"
            data-testid={`badge-teams-${row.original.id}`}
          >
            {row.original.teamsCount} {row.original.teamsCount === 1 ? 'team' : 'team'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Azioni</div>,
        cell: ({ row }) => (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-orange-500/10"
                  data-testid={`button-actions-${row.original.id}`}
                >
                  <span className="sr-only">Apri menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onEmployeeClick?.(row.original.id)}
                  className="cursor-pointer"
                  data-testid={`action-view-${row.original.id}`}
                >
                  <Eye className="mr-2 h-4 w-4 text-blue-500" />
                  Visualizza dettagli
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onEditEmployee?.(row.original.id)}
                  className="cursor-pointer"
                  data-testid={`action-edit-${row.original.id}`}
                >
                  <Edit className="mr-2 h-4 w-4 text-orange-500" />
                  Modifica dipendente
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {/* TODO: Implement permissions */}}
                  className="cursor-pointer"
                  data-testid={`action-permissions-${row.original.id}`}
                >
                  <Shield className="mr-2 h-4 w-4 text-purple-500" />
                  Gestisci permessi
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {/* TODO: Implement remove */}}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                  data-testid={`action-remove-${row.original.id}`}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Rimuovi
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [onEmployeeClick, onEditEmployee]
  );

  // Initialize table
  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

  if (usersLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cerca dipendente..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 backdrop-blur-md bg-white/50 border-white/20"
            data-testid="input-search-global"
          />
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[180px] backdrop-blur-md bg-white/50 border-white/20" data-testid="select-filter-role">
            <SelectValue placeholder="Tutti i ruoli" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i ruoli</SelectItem>
            {roles.map(role => (
              <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="w-full sm:w-[180px] backdrop-blur-md bg-white/50 border-white/20" data-testid="select-filter-store">
            <SelectValue placeholder="Tutti gli store" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli store</SelectItem>
            {stores.map(store => (
              <SelectItem key={store.id} value={store.id}>{store.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-full sm:w-[180px] backdrop-blur-md bg-white/50 border-white/20" data-testid="select-filter-team">
            <SelectValue placeholder="Tutti i team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i team</SelectItem>
            {teams.map(team => (
              <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <UsersIcon className="h-4 w-4 text-orange-500" />
          <span data-testid="text-total-count">
            {table.getFilteredRowModel().rows.length} dipendenti
            {(globalFilter || roleFilter !== 'all' || storeFilter !== 'all' || teamFilter !== 'all') && 
              ` (da ${users.length} totali)`}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/20 backdrop-blur-md bg-white/30 overflow-hidden shadow-xl">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-white/20 bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-orange-500/10">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="font-semibold text-gray-900">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </tr>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-b border-white/10 hover:bg-orange-500/5 transition-colors"
                  data-testid={`row-employee-${row.original.id}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <UsersIcon className="h-8 w-8 opacity-30" />
                    <p>Nessun dipendente trovato</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
