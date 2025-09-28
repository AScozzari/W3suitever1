/**
 * 👥 TEAM MANAGEMENT PAGE - WindTre Design System
 * 
 * Enterprise team management with department assignments and workflow integration
 * Follows project design standards and UI consistency
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CreateTeamModal from '../components/CreateTeamModal';
import { 
  Users, 
  Plus, 
  Search, 
  Filter,
  Settings,
  Building2,
  DollarSign,
  HeadphonesIcon,
  Edit,
  Archive,
  MoreHorizontal,
  UserPlus,
  Shield,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';

// 🎯 WindTre department mapping - VERI dipartimenti dal sistema
const DEPARTMENTS = {
  'hr': { icon: Users, label: 'HR', color: 'bg-windtre-purple/10', textColor: 'text-windtre-purple', borderColor: 'border-windtre-purple/20' },
  'finance': { icon: DollarSign, label: 'Finance', color: 'bg-windtre-orange/10', textColor: 'text-windtre-orange', borderColor: 'border-windtre-orange/20' },
  'sales': { icon: Building2, label: 'Sales', color: 'bg-windtre-purple/10', textColor: 'text-windtre-purple', borderColor: 'border-windtre-purple/20' },
  'operations': { icon: Settings, label: 'Operations', color: 'bg-windtre-orange/10', textColor: 'text-windtre-orange', borderColor: 'border-windtre-orange/20' },
  'support': { icon: HeadphonesIcon, label: 'Support', color: 'bg-windtre-purple/10', textColor: 'text-windtre-purple', borderColor: 'border-windtre-purple/20' },
  'crm': { icon: Users, label: 'CRM', color: 'bg-windtre-orange/10', textColor: 'text-windtre-orange', borderColor: 'border-windtre-orange/20' }
};

// 🎯 Team types mapping
const TEAM_TYPES = {
  'functional': { label: 'Functional', color: 'bg-blue-100 text-blue-800' },
  'cross_functional': { label: 'Cross-Functional', color: 'bg-green-100 text-green-800' },
  'project': { label: 'Project', color: 'bg-purple-100 text-purple-800' },
  'temporary': { label: 'Temporary', color: 'bg-yellow-100 text-yellow-800' },
  'specialized': { label: 'Specialized', color: 'bg-orange-100 text-orange-800' }
};

// 🎯 TypeScript interfaces
interface Team {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  teamType: keyof typeof TEAM_TYPES;
  userMembers: string[];
  roleMembers: string[];
  primarySupervisor?: string;
  secondarySupervisors: string[];
  assignedDepartments: (keyof typeof DEPARTMENTS)[];
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export default function TeamManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // 🎯 State management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedTeamType, setSelectedTeamType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // 🎯 API hooks for teams data - FIXED AUTH
  const { 
    data: teams = [], 
    isLoading: teamsLoading, 
    error: teamsError 
  } = useQuery<Team[]>({
    queryKey: ['/api/teams']
  });

  // 🎯 Archive team mutation - FIXED AUTH
  const archiveTeamMutation = useMutation({
    mutationFn: async ({ teamId, isActive }: { teamId: string; isActive: boolean }) => {
      return await apiRequest(`/api/teams/${teamId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      toast({
        title: 'Team Updated',
        description: 'Team status updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update team status',
        variant: 'destructive'
      });
    }
  });

  // 🎯 Filter teams based on search and filters
  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         team.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'all' || 
                             team.assignedDepartments.includes(selectedDepartment as keyof typeof DEPARTMENTS);
    
    const matchesTeamType = selectedTeamType === 'all' || team.teamType === selectedTeamType;
    
    const matchesStatus = selectedStatus === 'all' || 
                         (selectedStatus === 'active' && team.isActive) ||
                         (selectedStatus === 'inactive' && !team.isActive);

    return matchesSearch && matchesDepartment && matchesTeamType && matchesStatus;
  });

  // 🎯 Handle team archiving
  const handleArchiveTeam = (team: Team) => {
    archiveTeamMutation.mutate({ 
      teamId: team.id, 
      isActive: !team.isActive 
    });
  };

  // 🎯 Handle team editing
  const handleEditTeam = (team: Team) => {
    toast({
      title: 'Edit Team',
      description: 'Team editing modal coming soon...',
    });
  };

  // 🎯 Create new team handler
  const handleCreateTeam = () => {
    setShowCreateDialog(true);
  };

  // 🎯 Format team members count
  const getTeamMembersCount = (team: Team) => {
    return team.userMembers.length + team.roleMembers.length;
  };

  return (
    <Layout currentModule="teams" setCurrentModule={() => {}}>
      <div className="space-y-6 p-6">
        {/* 🎯 Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="page-title">
              Team Management
            </h1>
            <p className="text-gray-600 mt-1" data-testid="page-description">
              Manage teams, assignments, and department workflows
            </p>
          </div>
          <Button 
            onClick={handleCreateTeam}
            className="bg-windtre-orange hover:bg-windtre-orange/90 text-white"
            data-testid="button-create-team"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create Team
          </Button>
        </div>

        {/* 🎯 Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-windtre-purple" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Teams</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="stat-total-teams">
                    {teams.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Teams</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="stat-active-teams">
                    {teams.filter(t => t.isActive).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-windtre-orange" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Departments</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="stat-departments">
                    {Object.keys(DEPARTMENTS).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-windtre-purple" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Members</p>
                  <p className="text-2xl font-bold text-gray-900" data-testid="stat-avg-members">
                    {teams.length > 0 ? Math.round(teams.reduce((acc, t) => acc + getTeamMembersCount(t), 0) / teams.length) : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 🎯 Filters and Search */}
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search teams..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-teams"
                  />
                </div>
              </div>
              
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-full lg:w-48" data-testid="select-department-filter">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {Object.entries(DEPARTMENTS).map(([key, dept]) => (
                    <SelectItem key={key} value={key}>{dept.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedTeamType} onValueChange={setSelectedTeamType}>
                <SelectTrigger className="w-full lg:w-48" data-testid="select-team-type-filter">
                  <SelectValue placeholder="Team Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(TEAM_TYPES).map(([key, type]) => (
                    <SelectItem key={key} value={key}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full lg:w-48" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 🎯 Teams Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Teams ({filteredTeams.length})
            </CardTitle>
            <CardDescription>
              Manage your organization's teams and their department assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teamsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-windtre-orange"></div>
              </div>
            ) : teamsError ? (
              <div className="text-center py-8 text-red-600">
                Error loading teams. Please try again.
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm || selectedDepartment !== 'all' || selectedTeamType !== 'all' || selectedStatus !== 'all' 
                  ? 'No teams match your filters' 
                  : 'No teams found. Create your first team to get started.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Departments</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Supervisor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTeams.map((team) => (
                      <TableRow key={team.id} data-testid={`row-team-${team.id}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900" data-testid={`text-team-name-${team.id}`}>
                              {team.name}
                            </div>
                            {team.description && (
                              <div className="text-sm text-gray-500 mt-1" data-testid={`text-team-description-${team.id}`}>
                                {team.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Badge className={TEAM_TYPES[team.teamType]?.color} data-testid={`badge-team-type-${team.id}`}>
                            {TEAM_TYPES[team.teamType]?.label}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {team.assignedDepartments.map((dept) => (
                              <Badge 
                                key={dept} 
                                variant="outline"
                                className={`${DEPARTMENTS[dept]?.color} ${DEPARTMENTS[dept]?.textColor} ${DEPARTMENTS[dept]?.borderColor}`}
                                data-testid={`badge-department-${dept}-${team.id}`}
                              >
                                {DEPARTMENTS[dept]?.label}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <span className="text-sm text-gray-600" data-testid={`text-members-count-${team.id}`}>
                            {getTeamMembersCount(team)} member{getTeamMembersCount(team) !== 1 ? 's' : ''}
                          </span>
                        </TableCell>
                        
                        <TableCell>
                          {team.primarySupervisor ? (
                            <span className="text-sm text-gray-600" data-testid={`text-supervisor-${team.id}`}>
                              {team.primarySupervisor}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400" data-testid={`text-no-supervisor-${team.id}`}>
                              No supervisor
                            </span>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <Badge 
                            variant={team.isActive ? "default" : "secondary"}
                            className={team.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                            data-testid={`status-${team.isActive ? 'active' : 'inactive'}-${team.id}`}
                          >
                            {team.isActive ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 mr-1" />
                                Inactive
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTeam(team)}
                              data-testid={`button-edit-${team.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleArchiveTeam(team)}
                              disabled={archiveTeamMutation.isPending}
                              data-testid={`button-archive-${team.id}`}
                            >
                              <Archive className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 🎯 Create Team Modal - Enterprise Complete */}
        <CreateTeamModal 
          open={showCreateDialog} 
          onOpenChange={setShowCreateDialog}
        />
      </div>
    </Layout>
  );
}