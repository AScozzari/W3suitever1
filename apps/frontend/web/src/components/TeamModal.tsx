import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Users, Shield, UserCog, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (team: Partial<Team>) => void;
  team?: Team | null;
  isLoading?: boolean;
}

interface Team {
  id?: string;
  name: string;
  description?: string;
  teamType: 'functional' | 'project' | 'department';
  userMembers: string[];
  roleMembers: string[];
  primarySupervisor?: string;
  secondarySupervisors: string[];
  isActive: boolean;
}

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

const TeamModal: React.FC<TeamModalProps> = ({
  isOpen,
  onClose,
  onSave,
  team,
  isLoading
}) => {
  const [formData, setFormData] = useState<Team>({
    name: '',
    description: '',
    teamType: 'functional',
    userMembers: [],
    roleMembers: [],
    primarySupervisor: undefined,
    secondarySupervisors: [],
    isActive: true
  });

  const [selectedTab, setSelectedTab] = useState<'users' | 'roles'>('users');
  const [searchTerm, setSearchTerm] = useState('');

  // Load users and roles
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['/api/users'],
    enabled: isOpen,
  });

  const { data: rolesData, isLoading: loadingRoles } = useQuery({
    queryKey: ['/api/roles'],
    enabled: isOpen,
  });

  useEffect(() => {
    if (team) {
      setFormData(team);
    } else {
      setFormData({
        name: '',
        description: '',
        teamType: 'functional',
        userMembers: [],
        roleMembers: [],
        primarySupervisor: undefined,
        secondarySupervisors: [],
        isActive: true
      });
    }
  }, [team]);

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('Team name is required');
      return;
    }

    if (formData.userMembers.length === 0 && formData.roleMembers.length === 0) {
      alert('At least one user or role must be added to the team');
      return;
    }

    onSave(formData);
  };

  const toggleUserMember = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      userMembers: prev.userMembers.includes(userId)
        ? prev.userMembers.filter(id => id !== userId)
        : [...prev.userMembers, userId]
    }));
  };

  const toggleRoleMember = (roleId: string) => {
    setFormData(prev => ({
      ...prev,
      roleMembers: prev.roleMembers.includes(roleId)
        ? prev.roleMembers.filter(id => id !== roleId)
        : [...prev.roleMembers, roleId]
    }));
  };

  const toggleSecondarySupervisor = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      secondarySupervisors: prev.secondarySupervisors.includes(userId)
        ? prev.secondarySupervisors.filter(id => id !== userId)
        : [...prev.secondarySupervisors, userId]
    }));
  };

  const filteredUsers = (usersData || []).filter((user: User) => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRoles = (rolesData || []).filter((role: Role) =>
    role.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-500" />
            {team ? 'Edit Team' : 'Create New Team'}
          </DialogTitle>
          <DialogDescription>
            Configure team members, roles, and supervisors with RBAC-validated permissions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Team Name*</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., HR Department, Finance Team"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the team's purpose and responsibilities"
                className="mt-1 h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="teamType">Team Type</Label>
                <Select
                  value={formData.teamType}
                  onValueChange={(value: 'functional' | 'project' | 'department') => 
                    setFormData({ ...formData, teamType: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="functional">Functional</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="department">Department</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active Status</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>
          </div>

          {/* Members Selection */}
          <div className="space-y-4">
            <div>
              <Label>Team Members</Label>
              <Alert className="mt-2 mb-3">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Teams can include both direct users and role-based members. 
                  Role members automatically include all users with that role.
                </AlertDescription>
              </Alert>

              <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as 'users' | 'roles')}>
                <TabsList className="w-full">
                  <TabsTrigger value="users" className="flex-1">
                    <Users className="h-4 w-4 mr-2" />
                    Users ({formData.userMembers.length})
                  </TabsTrigger>
                  <TabsTrigger value="roles" className="flex-1">
                    <Shield className="h-4 w-4 mr-2" />
                    Roles ({formData.roleMembers.length})
                  </TabsTrigger>
                </TabsList>

                <div className="mt-3">
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mb-3"
                  />
                </div>

                <TabsContent value="users" className="mt-3">
                  <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                    {loadingUsers ? (
                      <div className="text-center py-4 text-muted-foreground">Loading users...</div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">No users found</div>
                    ) : (
                      filteredUsers.map((user: User) => (
                        <div key={user.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded">
                          <Checkbox
                            id={`user-${user.id}`}
                            checked={formData.userMembers.includes(user.id)}
                            onCheckedChange={() => toggleUserMember(user.id)}
                          />
                          <label 
                            htmlFor={`user-${user.id}`}
                            className="flex-1 cursor-pointer text-sm"
                          >
                            <div className="font-medium">{user.email}</div>
                            {(user.firstName || user.lastName) && (
                              <div className="text-muted-foreground text-xs">
                                {user.firstName} {user.lastName}
                              </div>
                            )}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="roles" className="mt-3">
                  <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                    {loadingRoles ? (
                      <div className="text-center py-4 text-muted-foreground">Loading roles...</div>
                    ) : filteredRoles.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">No roles found</div>
                    ) : (
                      filteredRoles.map((role: Role) => (
                        <div key={role.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded">
                          <Checkbox
                            id={`role-${role.id}`}
                            checked={formData.roleMembers.includes(role.id)}
                            onCheckedChange={() => toggleRoleMember(role.id)}
                          />
                          <label 
                            htmlFor={`role-${role.id}`}
                            className="flex-1 cursor-pointer text-sm"
                          >
                            <div className="font-medium">{role.name}</div>
                            {role.description && (
                              <div className="text-muted-foreground text-xs">{role.description}</div>
                            )}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Supervisors Section */}
          <div className="space-y-4">
            <div>
              <Label className="flex items-center gap-2">
                <UserCog className="h-4 w-4" />
                Supervisors
              </Label>
              
              <Alert className="mt-2 mb-3">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Supervisors must have RBAC permissions for the workflow categories they oversee.
                  Only users with appropriate permissions can approve workflow steps.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="primarySupervisor">Primary Supervisor</Label>
                  <Select
                    value={formData.primarySupervisor || ''}
                    onValueChange={(value) => 
                      setFormData({ ...formData, primarySupervisor: value || undefined })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select primary supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {(usersData || []).map((user: User) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.email} {user.firstName && user.lastName && `(${user.firstName} ${user.lastName})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Co-Supervisors</Label>
                  <div className="mt-2 max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1">
                    {loadingUsers ? (
                      <div className="text-center py-2 text-muted-foreground text-sm">Loading...</div>
                    ) : (usersData || []).length === 0 ? (
                      <div className="text-center py-2 text-muted-foreground text-sm">No users available</div>
                    ) : (
                      (usersData || [])
                        .filter((user: User) => user.id !== formData.primarySupervisor)
                        .map((user: User) => (
                          <div key={user.id} className="flex items-center space-x-2 p-1">
                            <Checkbox
                              id={`supervisor-${user.id}`}
                              checked={formData.secondarySupervisors.includes(user.id)}
                              onCheckedChange={() => toggleSecondarySupervisor(user.id)}
                            />
                            <label 
                              htmlFor={`supervisor-${user.id}`}
                              className="flex-1 cursor-pointer text-sm"
                            >
                              {user.email}
                            </label>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="border-t pt-4">
            <div className="flex flex-wrap gap-2">
              {formData.userMembers.length > 0 && (
                <Badge variant="secondary">
                  {formData.userMembers.length} Direct User{formData.userMembers.length !== 1 ? 's' : ''}
                </Badge>
              )}
              {formData.roleMembers.length > 0 && (
                <Badge variant="secondary">
                  {formData.roleMembers.length} Role{formData.roleMembers.length !== 1 ? 's' : ''}
                </Badge>
              )}
              {formData.primarySupervisor && (
                <Badge variant="outline">Primary Supervisor Set</Badge>
              )}
              {formData.secondarySupervisors.length > 0 && (
                <Badge variant="outline">
                  {formData.secondarySupervisors.length} Co-Supervisor{formData.secondarySupervisors.length !== 1 ? 's' : ''}
                </Badge>
              )}
              {formData.isActive ? (
                <Badge className="bg-green-500">Active</Badge>
              ) : (
                <Badge variant="destructive">Inactive</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isLoading || !formData.name.trim() || 
                    (formData.userMembers.length === 0 && formData.roleMembers.length === 0)}
          >
            {isLoading ? 'Saving...' : team ? 'Update Team' : 'Create Team'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeamModal;