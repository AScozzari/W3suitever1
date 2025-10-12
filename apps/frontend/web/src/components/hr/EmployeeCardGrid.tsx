import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScopeBadge } from '@/components/ui/scope-badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Filter, Users as UsersIcon, UserCog } from 'lucide-react';

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

interface EmployeeCardGridProps {
  onEmployeeClick?: (userId: string) => void;
  currentUserRole?: string;
}

export function EmployeeCardGrid({ onEmployeeClick, currentUserRole }: EmployeeCardGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');

  // Fetch users - queryClient default fetcher returns unwrapped data (data.data ?? data)
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/users']
  });

  // Fetch teams - queryClient default fetcher returns unwrapped data (data.data ?? data)
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['/api/teams']
  });

  // Fetch assignments for all users
  const assignmentQueries = useQuery({
    queryKey: ['/api/users/assignments-all', users.map(u => u.id)],
    queryFn: async () => {
      if (users.length === 0) return {};
      
      const results = await Promise.all(
        users.map(async (user) => {
          try {
            const response = await fetch(`/api/users/${user.id}/assignments`, {
              headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) return { userId: user.id, assignments: [] };
            const data = await response.json();
            return { userId: user.id, assignments: data.data || [] };
          } catch {
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

  // Get unique roles from all users (simplified - in real app would query roles table)
  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>();
    // This is simplified - would need to fetch actual role assignments
    users.forEach(user => {
      if (user.position) roles.add(user.position);
    });
    return Array.from(roles);
  }, [users]);

  // Filter and search logic
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.position?.toLowerCase().includes(searchLower)) ||
        (user.department?.toLowerCase().includes(searchLower));

      // Role filter
      const matchesRole = roleFilter === 'all' || user.position === roleFilter;

      // Scope filter (check user's assignments)
      const userAssignments = assignmentsByUser[user.id] || [];
      const matchesScope = scopeFilter === 'all' || 
        userAssignments.some(assignment => assignment.scopeType === scopeFilter);

      // Team filter
      const matchesTeam = teamFilter === 'all' || 
        teams.some(team => team.id === teamFilter && team.memberIds?.includes(user.id));

      return matchesSearch && matchesRole && matchesScope && matchesTeam;
    });
  }, [users, searchTerm, roleFilter, scopeFilter, teamFilter, teams, assignmentsByUser]);

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
        
        <div className="flex gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[160px] bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm" data-testid="select-filter-role">
              <SelectValue placeholder="Tutti i ruoli" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i ruoli</SelectItem>
              {uniqueRoles.map(role => (
                <SelectItem key={role} value={role}>{role}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={scopeFilter} onValueChange={setScopeFilter}>
            <SelectTrigger className="w-[160px] bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm" data-testid="select-filter-scope">
              <SelectValue placeholder="Tutti gli scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli scope</SelectItem>
              <SelectItem value="tenant">Tenant</SelectItem>
              <SelectItem value="legal_entity">Legal Entity</SelectItem>
              <SelectItem value="store">Store</SelectItem>
            </SelectContent>
          </Select>

          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-[160px] bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm" data-testid="select-filter-team">
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
            {searchTerm || roleFilter !== 'all' || teamFilter !== 'all' ? ` (filtrati da ${users.length})` : ''}
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
              className="group cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50"
              onClick={() => onEmployeeClick?.(user.id)}
              data-testid={`card-employee-${user.id}`}
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  {/* Avatar */}
                  <Avatar className="h-16 w-16 border-2 border-gray-200 dark:border-gray-700">
                    <AvatarImage src={user.avatarUrl} alt={`${user.firstName || ''} ${user.lastName || ''}`} />
                    <AvatarFallback className="bg-gradient-to-br from-orange-500 to-purple-600 text-white font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name */}
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100" data-testid={`text-name-${user.id}`}>
                      {user.firstName || 'Utente'} {user.lastName || ''}
                    </h3>
                    <p className="text-sm text-muted-foreground" data-testid={`text-email-${user.id}`}>
                      {user.email}
                    </p>
                  </div>

                  {/* Position/Role Badge */}
                  {user.position && (
                    <Badge variant="secondary" className="gap-1" data-testid={`badge-position-${user.id}`}>
                      <UserCog className="h-3 w-3" />
                      {user.position}
                    </Badge>
                  )}

                  {/* Scope Badges - Real data from assignments */}
                  {scopeBadges.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center">
                      {scopeBadges.map(badge => (
                        <ScopeBadge 
                          key={badge.key}
                          scopeType={badge.scopeType} 
                          scopeName={badge.scopeName} 
                        />
                      ))}
                    </div>
                  )}

                  {/* Team Badge */}
                  {userTeam && (
                    <Badge variant="outline" className="gap-1 bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300/50" data-testid={`badge-team-${user.id}`}>
                      <UsersIcon className="h-3 w-3" />
                      {userTeam.name}
                    </Badge>
                  )}

                  {/* Department */}
                  {user.department && (
                    <p className="text-xs text-muted-foreground" data-testid={`text-department-${user.id}`}>
                      {user.department}
                    </p>
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
