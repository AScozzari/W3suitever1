import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Users, 
  Building2, 
  Store, 
  Crown, 
  Edit, 
  Trash2,
  CheckCircle,
  Shield,
  Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Position interface per hybrid composition
interface Position {
  id: string;
  name: string;
  scope: 'tenant' | 'legal_entity' | 'store';
  level: number;
  constraints?: {
    maxAmount?: number;
    maxDays?: number;
    categories?: string[];
  };
  assignments: {
    roles: string[];
    users: string[];
  };
  isSupervisor: boolean;
  isActive: boolean;
}

// Mock data per development - da sostituire con TanStack Query + API
const mockPositions: Position[] = [
  {
    id: '1',
    name: 'HR Manager',
    scope: 'tenant',
    level: 3,
    constraints: {
      maxDays: 30,
      categories: ['hr.leave.approve', 'hr.schedule.publish']
    },
    assignments: {
      roles: ['hr_manager'],
      users: ['alice.smith', 'bob.johnson']
    },
    isSupervisor: true,
    isActive: true
  },
  {
    id: '2', 
    name: 'Finance Approver',
    scope: 'legal_entity',
    level: 4,
    constraints: {
      maxAmount: 5000,
      categories: ['finance.expense.approve', 'finance.budget.validate']
    },
    assignments: {
      roles: ['finance_manager'],
      users: ['carol.brown']
    },
    isSupervisor: true,
    isActive: true
  },
  {
    id: '3',
    name: 'Store Supervisor',
    scope: 'store',
    level: 2,
    constraints: {
      maxAmount: 1000,
      categories: ['ops.shift.publish', 'ops.inventory.update']
    },
    assignments: {
      roles: [],
      users: ['david.wilson', 'emma.davis']
    },
    isSupervisor: true,
    isActive: true
  },
  {
    id: '4',
    name: 'Legal Compliance Officer',
    scope: 'tenant',
    level: 5,
    constraints: {
      categories: ['legal.policy.ack', 'legal.privacy.validate', 'legal.gdpr.process']
    },
    assignments: {
      roles: ['legal_officer'],
      users: []
    },
    isSupervisor: false,
    isActive: true
  }
];

const mockRoles = ['hr_manager', 'finance_manager', 'legal_officer', 'store_manager', 'operations_lead'];
const mockUsers = ['alice.smith', 'bob.johnson', 'carol.brown', 'david.wilson', 'emma.davis'];

interface PositionsManagerProps {
  onPositionSelect?: (position: Position) => void;
}

export default function PositionsManager({ onPositionSelect }: PositionsManagerProps) {
  const [positions, setPositions] = useState<Position[]>(mockPositions);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    scope: 'tenant' as Position['scope'],
    level: 1,
    maxAmount: '',
    maxDays: '',
    selectedRoles: [] as string[],
    selectedUsers: [] as string[],
    isSupervisor: false
  });
  
  const { toast } = useToast();

  const handleCreatePosition = () => {
    const newPosition: Position = {
      id: Date.now().toString(),
      name: formData.name,
      scope: formData.scope,
      level: formData.level,
      constraints: {
        maxAmount: formData.maxAmount ? parseInt(formData.maxAmount) : undefined,
        maxDays: formData.maxDays ? parseInt(formData.maxDays) : undefined
      },
      assignments: {
        roles: formData.selectedRoles,
        users: formData.selectedUsers
      },
      isSupervisor: formData.isSupervisor,
      isActive: true
    };

    setPositions([...positions, newPosition]);
    setIsCreateOpen(false);
    resetForm();
    
    toast({
      title: "Position Created",
      description: `${newPosition.name} has been created successfully`,
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      scope: 'tenant',
      level: 1,
      maxAmount: '',
      maxDays: '',
      selectedRoles: [],
      selectedUsers: [],
      isSupervisor: false
    });
    setEditingPosition(null);
  };

  const handleDeletePosition = (id: string) => {
    setPositions(positions.filter(p => p.id !== id));
    toast({
      title: "Position Deleted",
      description: "Position has been removed successfully",
    });
  };

  const getScopeIcon = (scope: Position['scope']) => {
    switch (scope) {
      case 'tenant': return <Building2 className="w-4 h-4" />;
      case 'legal_entity': return <Shield className="w-4 h-4" />;
      case 'store': return <Store className="w-4 h-4" />;
    }
  };

  const getScopeColor = (scope: Position['scope']) => {
    switch (scope) {
      case 'tenant': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'legal_entity': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';  
      case 'store': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Positions Management
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Create and manage workflow approval positions with hybrid role/user assignments
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-position">
              <Plus className="w-4 h-4 mr-2" />
              Create Position
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Position</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4 py-4">
              {/* Position Name */}
              <div className="col-span-2">
                <Label htmlFor="position-name">Position Name</Label>
                <Input
                  id="position-name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Senior HR Approver"
                  data-testid="input-position-name"
                />
              </div>

              {/* Scope Selection */}
              <div>
                <Label>Scope</Label>
                <Select 
                  value={formData.scope} 
                  onValueChange={(value: Position['scope']) => setFormData({...formData, scope: value})}
                >
                  <SelectTrigger data-testid="select-scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Tenant Level
                      </div>
                    </SelectItem>
                    <SelectItem value="legal_entity">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Legal Entity
                      </div>
                    </SelectItem>
                    <SelectItem value="store">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4" />
                        Store Level
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Authority Level */}
              <div>
                <Label htmlFor="authority-level">Authority Level (1-5)</Label>
                <Input
                  id="authority-level"
                  type="number"
                  min="1"
                  max="5"
                  value={formData.level}
                  onChange={(e) => setFormData({...formData, level: parseInt(e.target.value) || 1})}
                  data-testid="input-authority-level"
                />
              </div>

              {/* Constraints */}
              <div>
                <Label htmlFor="max-amount">Max Amount (€)</Label>
                <Input
                  id="max-amount"
                  type="number"
                  value={formData.maxAmount}
                  onChange={(e) => setFormData({...formData, maxAmount: e.target.value})}
                  placeholder="e.g., 5000"
                  data-testid="input-max-amount"
                />
              </div>

              <div>
                <Label htmlFor="max-days">Max Days</Label>
                <Input
                  id="max-days"
                  type="number"
                  value={formData.maxDays}
                  onChange={(e) => setFormData({...formData, maxDays: e.target.value})}
                  placeholder="e.g., 30"
                  data-testid="input-max-days"
                />
              </div>

              {/* Role Assignment */}
              <div className="col-span-2">
                <Label>Assign Roles (Hybrid Composition)</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {mockRoles.map(role => (
                    <Badge
                      key={role}
                      variant={formData.selectedRoles.includes(role) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        const isSelected = formData.selectedRoles.includes(role);
                        setFormData({
                          ...formData,
                          selectedRoles: isSelected 
                            ? formData.selectedRoles.filter(r => r !== role)
                            : [...formData.selectedRoles, role]
                        });
                      }}
                      data-testid={`role-${role}`}
                    >
                      <Users className="w-3 h-3 mr-1" />
                      {role.replace('_', ' ').toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* User Assignment */}
              <div className="col-span-2">
                <Label>Assign Specific Users</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {mockUsers.map(user => (
                    <Badge
                      key={user}
                      variant={formData.selectedUsers.includes(user) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        const isSelected = formData.selectedUsers.includes(user);
                        setFormData({
                          ...formData,
                          selectedUsers: isSelected 
                            ? formData.selectedUsers.filter(u => u !== user)
                            : [...formData.selectedUsers, user]
                        });
                      }}
                      data-testid={`user-${user}`}
                    >
                      <Crown className="w-3 h-3 mr-1" />
                      {user}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Supervisor Flag */}
              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is-supervisor"
                  checked={formData.isSupervisor}
                  onChange={(e) => setFormData({...formData, isSupervisor: e.target.checked})}
                  data-testid="checkbox-supervisor"
                />
                <Label htmlFor="is-supervisor">This is a supervisor position</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePosition} data-testid="button-save-position">
                Create Position
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Positions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {positions.map(position => (
          <Card key={position.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    {position.isSupervisor && <Crown className="w-4 h-4 text-yellow-500" />}
                    {position.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={`${getScopeColor(position.scope)} text-xs`}>
                      {getScopeIcon(position.scope)}
                      <span className="ml-1">{position.scope.replace('_', ' ').toUpperCase()}</span>
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Level {position.level}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onPositionSelect?.(position)}
                    data-testid={`button-select-${position.id}`}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeletePosition(position.id)}
                    data-testid={`button-delete-${position.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              {/* Constraints */}
              {position.constraints && (
                <div className="space-y-1 mb-3">
                  {position.constraints.maxAmount && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      Max Amount: €{position.constraints.maxAmount.toLocaleString()}
                    </div>
                  )}
                  {position.constraints.maxDays && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      Max Days: {position.constraints.maxDays}
                    </div>
                  )}
                </div>
              )}

              {/* Assignments */}
              <div className="space-y-2">
                {position.assignments.roles.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Roles:</div>
                    <div className="flex flex-wrap gap-1">
                      {position.assignments.roles.map(role => (
                        <Badge key={role} variant="outline" className="text-xs">
                          <Users className="w-2 h-2 mr-1" />
                          {role.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {position.assignments.users.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Users:</div>
                    <div className="flex flex-wrap gap-1">
                      {position.assignments.users.map(user => (
                        <Badge key={user} variant="outline" className="text-xs">
                          <Crown className="w-2 h-2 mr-1" />
                          {user}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {positions.length === 0 && (
        <Card className="p-8 text-center">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
            No Positions Created
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            Create your first workflow position with hybrid role and user assignments
          </p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Position
          </Button>
        </Card>
      )}
    </div>
  );
}