import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScopeBadge } from '@/components/ui/scope-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, Users as UsersIcon, UserCog, Mail, Briefcase, Building2, Shield } from 'lucide-react';

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

  // Fetch users - queryClient default fetcher returns unwrapped data (data.data ?? data)
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

  // Fetch assignments for all users - using apiRequest for auth headers
  const assignmentQueries = useQuery({
    queryKey: ['/api/users/assignments-all', users.map(u => u.id)],
    queryFn: async () => {
      if (users.length === 0) return {};
      
      const results = await Promise.all(
        users.map(async (user) => {
          try {
            // Use apiRequest which adds auth headers automatically
            const response = await apiRequest(`/api/users/${user.id}/assignments`);
            // apiRequest returns {data: [...]} or raw array, unwrap if needed
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

  // Filter and search logic with real data
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.position?.toLowerCase().includes(searchLower)) ||
        (user.department?.toLowerCase().includes(searchLower));

      // Get user assignments
      const userAssignments = assignmentsByUser[user.id] || [];

      // Role filter (based on actual role assignments)
      const matchesRole = roleFilter === 'all' || 
        userAssignments.some(assignment => assignment.roleId === roleFilter);

      // Legal Entity filter (check if user has assignment to this LE)
      const matchesLegalEntity = legalEntityFilter === 'all' || 
        userAssignments.some(assignment => 
          assignment.scopeType === 'legal_entity' && assignment.scopeId === legalEntityFilter
        );

      // Store filter (check if user has assignment to this store)
      const matchesStore = storeFilter === 'all' || 
        userAssignments.some(assignment => 
          assignment.scopeType === 'store' && assignment.scopeId === storeFilter
        );

      // Team filter
      const matchesTeam = teamFilter === 'all' || 
        teams.some(team => team.id === teamFilter && team.memberIds?.includes(user.id));

      return matchesSearch && matchesRole && matchesLegalEntity && matchesStore && matchesTeam;
    });
  }, [users, searchTerm, roleFilter, legalEntityFilter, storeFilter, teamFilter, teams, assignmentsByUser]);

  // Helper to get user team
  const getUserTeam = (userId: string) => {
    return teams.find(team => team.memberIds?.includes(userId));
  };

  if (usersLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-[200px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-[200px]" />
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
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca employee per nome, email, ruolo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50"
            data-testid="input-search-employee"
          />
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {/* Role Filter */}
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px] bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm" data-testid="select-filter-role">
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
            // Reset store filter when LE changes
            if (value !== legalEntityFilter) setStoreFilter('all');
          }}>
            <SelectTrigger className="w-[180px] bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm" data-testid="select-filter-legal-entity">
              <SelectValue placeholder="Tutte le RS" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le RS</SelectItem>
              {legalEntities.map(le => (
                <SelectItem key={le.id} value={le.id}>{le.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Store Filter - filtered by selected LE */}
          <Select value={storeFilter} onValueChange={setStoreFilter} disabled={legalEntityFilter === 'all' && filteredStores.length === stores.length}>
            <SelectTrigger className="w-[180px] bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm" data-testid="select-filter-store">
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
            <SelectTrigger className="w-[180px] bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm" data-testid="select-filter-team">
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UsersIcon className="h-4 w-4" />
          <span>
            {filteredUsers.length} {filteredUsers.length === 1 ? 'employee' : 'employees'}
            {searchTerm || roleFilter !== 'all' || legalEntityFilter !== 'all' || storeFilter !== 'all' || teamFilter !== 'all' ? ` (filtrati da ${users.length})` : ''}
          </span>
        </div>
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredUsers.map(user => {
          const userTeam = getUserTeam(user.id);
          const userAssignments = assignmentsByUser[user.id] || [];
          const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U';
          
          // Get unique scope badges from assignments
          const scopeBadges = userAssignments.reduce((acc, assignment) => {
            const key = `${assignment.scopeType}-${assignment.scopeId}`;
            if (!acc.find(item => item.key === key)) {
              acc.push({
                key,
                scopeType: assignment.scopeType,
                scopeName: assignment.scopeDetails?.name || assignment.scopeType
              });
            }
            return acc;
          }, [] as Array<{ key: string; scopeType: 'tenant' | 'legal_entity' | 'store'; scopeName: string }>);

          return (
            <Card 
              key={user.id}
              className="group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/20 hover:-translate-y-1 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-2 border-transparent hover:border-orange-500/30 relative overflow-hidden"
              onClick={() => onEmployeeClick?.(user.id)}
              data-testid={`card-employee-${user.id}`}
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              }}
            >
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <CardContent className="p-6 relative z-10">
                <div className="flex flex-col space-y-4">
                  {/* Header: Avatar + Name */}
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14 border-2 border-white shadow-lg ring-2 ring-orange-500/20 group-hover:ring-orange-500/50 transition-all">
                      <AvatarImage src={user.avatarUrl} alt={`${user.firstName || ''} ${user.lastName || ''}`} />
                      <AvatarFallback className="bg-gradient-to-br from-orange-500 to-purple-600 text-white font-bold text-lg">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 truncate" data-testid={`text-name-${user.id}`}>
                        {user.firstName || 'Utente'} {user.lastName || ''}
                      </h3>
                      {user.position && (
                        <p className="text-sm font-medium text-orange-600 dark:text-orange-400 truncate" data-testid={`badge-position-${user.id}`}>
                          {user.position}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Info List */}
                  <div className="space-y-2 text-sm">
                    {/* Email */}
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Mail className="h-4 w-4 flex-shrink-0 text-gray-400" />
                      <span className="truncate" data-testid={`text-email-${user.id}`}>{user.email}</span>
                    </div>

                    {/* Department */}
                    {user.department && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Building2 className="h-4 w-4 flex-shrink-0 text-gray-400" />
                        <span className="truncate" data-testid={`text-department-${user.id}`}>{user.department}</span>
                      </div>
                    )}

                    {/* Team */}
                    {userTeam && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <UsersIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
                        <span className="truncate" data-testid={`badge-team-${user.id}`}>{userTeam.name}</span>
                      </div>
                    )}

                    {/* Roles Count */}
                    {userAssignments.length > 0 && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Shield className="h-4 w-4 flex-shrink-0 text-gray-400" />
                        <span className="text-xs">
                          {userAssignments.length} {userAssignments.length === 1 ? 'ruolo assegnato' : 'ruoli assegnati'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Scope Badges */}
                  {scopeBadges.length > 0 && (
                    <div className="pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                      <div className="flex flex-wrap gap-1">
                        {scopeBadges.slice(0, 3).map(badge => (
                          <ScopeBadge 
                            key={badge.key}
                            scopeType={badge.scopeType} 
                            scopeName={badge.scopeName} 
                          />
                        ))}
                        {scopeBadges.length > 3 && (
                          <Badge variant="outline" className="text-xs bg-gray-100/50 dark:bg-gray-800/50">
                            +{scopeBadges.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Nessun employee trovato
          </h3>
          <p className="text-sm text-muted-foreground">
            Prova a modificare i filtri di ricerca
          </p>
        </div>
      )}
    </div>
  );
}
