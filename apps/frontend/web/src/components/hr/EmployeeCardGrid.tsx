import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Users as UsersIcon, Mail, Briefcase } from 'lucide-react';

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  position?: string;
  department?: string;
  avatarUrl?: string;
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
  memberIds?: string[];
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface LegalEntity {
  id: string;
  codice: string;
  nome: string;
}

interface Store {
  id: string;
  codice: string;
  nome: string;
  legalEntityId: string;
}

interface EmployeeCardGridProps {
  onEmployeeClick?: (userId: string) => void;
  currentUserRole?: string;
}

export function EmployeeCardGrid({ onEmployeeClick, currentUserRole }: EmployeeCardGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [legalEntityFilter, setLegalEntityFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users']
  });

  // Fetch teams
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['/api/teams']
  });

  // Fetch roles
  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['/api/roles']
  });

  // Fetch legal entities
  const { data: legalEntities = [] } = useQuery<LegalEntity[]>({
    queryKey: ['/api/legal-entities']
  });

  // Fetch stores
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
            console.warn(`Failed to fetch assignments for user ${user.id}:`, error);
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

  // Filter stores based on selected legal entity
  const filteredStores = useMemo(() => {
    if (legalEntityFilter === 'all') return stores;
    return stores.filter(store => store.legalEntityId === legalEntityFilter);
  }, [stores, legalEntityFilter]);

  // Filter and search logic
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.position?.toLowerCase().includes(searchLower)) ||
        (user.department?.toLowerCase().includes(searchLower));

      const userAssignments = assignmentsByUser[user.id] || [];

      const matchesRole = roleFilter === 'all' || 
        userAssignments.some(assignment => assignment.roleId === roleFilter);

      const matchesLegalEntity = legalEntityFilter === 'all' || 
        userAssignments.some(assignment => 
          assignment.scopeType === 'legal_entity' && assignment.scopeId === legalEntityFilter
        );

      const matchesStore = storeFilter === 'all' || 
        userAssignments.some(assignment => 
          assignment.scopeType === 'store' && assignment.scopeId === storeFilter
        );

      const matchesTeam = teamFilter === 'all' || 
        teams.some(team => team.id === teamFilter && team.memberIds?.includes(user.id));

      return matchesSearch && matchesRole && matchesLegalEntity && matchesStore && matchesTeam;
    });
  }, [users, searchTerm, roleFilter, legalEntityFilter, storeFilter, teamFilter, teams, assignmentsByUser]);

  if (usersLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-[200px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-[160px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cerca dipendente per nome, email o ruolo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-employee"
          />
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {/* Role Filter */}
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-filter-role">
              <SelectValue placeholder="Tutti i ruoli" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i ruoli</SelectItem>
              {roles.map(role => (
                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Legal Entity Filter */}
          <Select value={legalEntityFilter} onValueChange={(value) => {
            setLegalEntityFilter(value);
            if (value !== legalEntityFilter) setStoreFilter('all');
          }}>
            <SelectTrigger className="w-[180px]" data-testid="select-filter-legal-entity">
              <SelectValue placeholder="Tutte le RS" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le RS</SelectItem>
              {legalEntities.map(le => (
                <SelectItem key={le.id} value={le.id}>{le.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Store Filter */}
          <Select value={storeFilter} onValueChange={setStoreFilter} disabled={legalEntityFilter === 'all' && filteredStores.length === stores.length}>
            <SelectTrigger className="w-[180px]" data-testid="select-filter-store">
              <SelectValue placeholder="Tutti gli store" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli store</SelectItem>
              {filteredStores.map(store => (
                <SelectItem key={store.id} value={store.id}>{store.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Team Filter */}
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-filter-team">
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
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <UsersIcon className="h-4 w-4" />
          <span>
            {filteredUsers.length} {filteredUsers.length === 1 ? 'dipendente' : 'dipendenti'}
            {searchTerm || roleFilter !== 'all' || legalEntityFilter !== 'all' || storeFilter !== 'all' || teamFilter !== 'all' ? ` (filtrati da ${users.length})` : ''}
          </span>
        </div>
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredUsers.map(user => {
          const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U';
          const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utente';

          return (
            <Card 
              key={user.id}
              className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border-2 border-gray-200 hover:border-orange-500 bg-white relative overflow-hidden"
              onClick={() => onEmployeeClick?.(user.id)}
              data-testid={`card-employee-${user.id}`}
            >
              {/* Orange accent bar on hover */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-orange-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  {/* Avatar - Centrally aligned */}
                  <Avatar className="h-16 w-16 flex-shrink-0 border-2 border-orange-500 shadow-md ring-2 ring-orange-100 group-hover:ring-orange-200 transition-all duration-300">
                    <AvatarImage src={user.avatarUrl} alt={fullName} />
                    <AvatarFallback className="bg-gradient-to-br from-orange-100 to-orange-50 text-orange-700 font-bold text-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Name */}
                    <div>
                      <h3 
                        className="font-semibold text-gray-900 text-base leading-tight truncate group-hover:text-orange-600 transition-colors duration-200" 
                        data-testid={`text-name-${user.id}`}
                      >
                        {fullName}
                      </h3>
                      
                      {/* Position */}
                      {user.position && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Briefcase className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
                          <p 
                            className="text-sm text-gray-600 truncate font-medium" 
                            data-testid={`badge-position-${user.id}`}
                          >
                            {user.position}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Email */}
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span 
                        className="text-sm text-gray-500 truncate" 
                        data-testid={`text-email-${user.id}`}
                      >
                        {user.email}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <UsersIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nessun dipendente trovato
          </h3>
          <p className="text-sm text-gray-500">
            Prova a modificare i filtri di ricerca
          </p>
        </div>
      )}
    </div>
  );
}
