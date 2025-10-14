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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Search,
  ArrowUpDown,
  Eye,
  Edit3,
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

interface ScopeInfo {
  type: 'tenant' | 'legal_entity' | 'store' | 'multiple' | 'none';
  displayName: string;
  items?: string[];  // For tooltip when multiple
}

interface EmployeeRow extends User {
  fullName: string;
  initials: string;
  primaryRole: string;
  rolesCount: number;
  scopeInfo: ScopeInfo;
  teamsCount: number;
  teamsList?: string[];  // For tooltip
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
      
      // Build scope info
      let scopeInfo: ScopeInfo;
      const tenantAssignment = assignments.find(a => a.scopeType === 'tenant');
      const legalEntityAssignment = assignments.find(a => a.scopeType === 'legal_entity');
      const storeAssignments = assignments.filter(a => a.scopeType === 'store');
      
      if (tenantAssignment) {
        scopeInfo = { type: 'tenant', displayName: 'Organizzazione' };
      } else if (legalEntityAssignment) {
        scopeInfo = { 
          type: 'legal_entity', 
          displayName: legalEntityAssignment.scopeDetails?.name || 'Ragione Sociale' 
        };
      } else if (storeAssignments.length > 1) {
        scopeInfo = {
          type: 'multiple',
          displayName: `${storeAssignments.length} PDV`,
          items: storeAssignments.map(a => a.scopeDetails?.name || 'PDV').filter(Boolean)
        };
      } else if (storeAssignments.length === 1) {
        scopeInfo = { 
          type: 'store', 
          displayName: storeAssignments[0].scopeDetails?.name || 'PDV' 
        };
      } else {
        scopeInfo = { type: 'none', displayName: 'N/D' };
      }
      
      // Get teams info
      const userTeams = teams.filter(t => t.userMembers?.includes(user.id));
      const teamsCount = userTeams.length;
      const teamsList = userTeams.map(t => t.name);

      return {
        ...user,
        fullName,
        initials,
        primaryRole,
        rolesCount,
        scopeInfo,
        teamsCount,
        teamsList,
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
            className="hover:bg-orange-500/10 hover:text-orange-600 -ml-4"
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
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate" data-testid={`text-name-${row.original.id}`}>
                {row.original.fullName}
              </p>
              <a
                href={`mailto:${row.original.email}`}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-600 transition-colors truncate"
                data-testid={`link-email-${row.original.id}`}
              >
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{row.original.email}</span>
              </a>
            </div>
          </div>
        ),
        size: 300,
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
        size: 180,
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
        size: 120,
      },
      {
        accessorKey: 'scopeInfo',
        header: 'Scope',
        cell: ({ row }) => {
          const scopeInfo = row.original.scopeInfo;
          
          // Render based on scope type
          if (scopeInfo.type === 'tenant') {
            return (
              <Badge 
                variant="outline" 
                className="border-orange-200 bg-orange-50 text-orange-700"
                data-testid={`badge-scope-${row.original.id}`}
              >
                🏢 Organizzazione
              </Badge>
            );
          }
          
          if (scopeInfo.type === 'legal_entity') {
            return (
              <Badge 
                variant="outline" 
                className="border-blue-200 bg-blue-50 text-blue-700"
                data-testid={`badge-scope-${row.original.id}`}
              >
                {scopeInfo.displayName}
              </Badge>
            );
          }
          
          if (scopeInfo.type === 'multiple' && scopeInfo.items) {
            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className="border-purple-200 bg-purple-50 text-purple-700 cursor-help"
                      data-testid={`badge-scope-${row.original.id}`}
                    >
                      🏪 {scopeInfo.displayName}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs backdrop-blur-md bg-white/95 border-white/20">
                    <div className="text-sm">
                      <p className="font-semibold mb-2">Punti Vendita:</p>
                      <ul className="space-y-1">
                        {scopeInfo.items.map((item, idx) => (
                          <li key={idx} className="text-gray-700">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
          
          if (scopeInfo.type === 'store') {
            return (
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-sm" data-testid={`text-scope-${row.original.id}`}>
                  {scopeInfo.displayName}
                </span>
              </div>
            );
          }
          
          return <span className="text-sm text-gray-400">N/D</span>;
        },
        size: 180,
      },
      {
        accessorKey: 'teamsCount',
        header: 'Team',
        cell: ({ row }) => {
          if (row.original.teamsCount === 0) {
            return <span className="text-sm text-gray-400">Nessun team</span>;
          }
          
          if (row.original.teamsList && row.original.teamsList.length > 0) {
            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className="border-emerald-200 bg-emerald-50 text-emerald-700 cursor-help"
                      data-testid={`badge-teams-${row.original.id}`}
                    >
                      {row.original.teamsCount} {row.original.teamsCount === 1 ? 'team' : 'team'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs backdrop-blur-md bg-white/95 border-white/20">
                    <div className="text-sm">
                      <p className="font-semibold mb-2">Team:</p>
                      <ul className="space-y-1">
                        {row.original.teamsList.map((team, idx) => (
                          <li key={idx} className="text-gray-700">• {team}</li>
                        ))}
                      </ul>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
          
          return (
            <Badge 
              variant="outline" 
              className="border-emerald-200 bg-emerald-50 text-emerald-700"
              data-testid={`badge-teams-${row.original.id}`}
            >
              {row.original.teamsCount} {row.original.teamsCount === 1 ? 'team' : 'team'}
            </Badge>
          );
        },
        size: 120,
      },
      {
        id: 'actions',
        header: () => <div className="text-center">Azioni</div>,
        cell: ({ row }) => (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => onEmployeeClick?.(row.original.id)}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 transition-colors"
              title="Visualizza dettagli"
              data-testid={`action-view-${row.original.id}`}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgb(239, 246, 255)';
                e.currentTarget.style.borderColor = 'rgb(147, 197, 253)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <Eye size={14} style={{ color: '#3b82f6' }} />
            </button>
            <button
              onClick={() => onEditEmployee?.(row.original.id)}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors"
              title="Modifica dipendente"
              data-testid={`action-edit-${row.original.id}`}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgb(249, 250, 251)';
                e.currentTarget.style.borderColor = 'rgb(209, 213, 219)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <Edit3 size={14} style={{ color: '#6b7280' }} />
            </button>
            <button
              onClick={() => {
                console.log('Gestisci permessi per:', row.original.id);
              }}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-gray-200 bg-white hover:bg-purple-50 hover:border-purple-300 transition-colors"
              title="Gestisci permessi"
              data-testid={`action-permissions-${row.original.id}`}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgb(250, 245, 255)';
                e.currentTarget.style.borderColor = 'rgb(216, 180, 254)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <Shield size={14} style={{ color: '#a855f7' }} />
            </button>
            <button
              onClick={() => {
                console.log('Rimuovi dipendente:', row.original.id);
              }}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-gray-200 bg-white hover:bg-red-50 hover:border-red-300 transition-colors"
              title="Rimuovi"
              data-testid={`action-remove-${row.original.id}`}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgb(254, 242, 242)';
                e.currentTarget.style.borderColor = 'rgb(252, 165, 165)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <Trash2 size={14} style={{ color: '#ef4444' }} />
            </button>
          </div>
        ),
        size: 160,
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
      <div className="rounded-xl border border-white/20 backdrop-blur-md bg-white/30 overflow-x-auto shadow-xl">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-white/20 bg-gradient-to-r from-orange-500/10 via-purple-500/10 to-orange-500/10">
                {headerGroup.headers.map((header) => (
                  <TableHead 
                    key={header.id} 
                    className="font-semibold text-gray-900"
                    style={{ width: header.getSize() }}
                  >
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
                    <TableCell 
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                    >
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
