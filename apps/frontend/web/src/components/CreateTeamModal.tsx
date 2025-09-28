/**
 * 👥 CREATE TEAM MODAL - WindTre Design System
 * 
 * Modal completo per creazione team con assegnazione dipartimenti,
 * membri ibridi, supervisori e validation enterprise
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Building2, 
  DollarSign, 
  HeadphonesIcon, 
  Settings,
  Plus,
  X,
  Info,
  Save,
  UserCheck
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
  'functional': { label: 'Functional', description: 'Department-specific teams' },
  'cross_functional': { label: 'Cross-Functional', description: 'Multi-department teams' },
  'project': { label: 'Project', description: 'Temporary project teams' },
  'temporary': { label: 'Temporary', description: 'Short-term teams' },
  'specialized': { label: 'Specialized', description: 'Expert/specialist teams' }
};

// 🎯 Form validation schema
const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(200, 'Name too long'),
  description: z.string().optional(),
  teamType: z.enum(['functional', 'cross_functional', 'project', 'temporary', 'specialized']),
  assignedDepartments: z.array(z.enum(['hr', 'finance', 'sales', 'operations', 'support', 'crm'])).min(1, 'At least one department is required'),
  userMembers: z.array(z.string()).default([]),
  roleMembers: z.array(z.string()).default([]),
  primarySupervisor: z.string().optional(),
  secondarySupervisors: z.array(z.string()).default([]),
  isActive: z.boolean().default(true)
});

type CreateTeamData = z.infer<typeof createTeamSchema>;

// 🎯 Real data loaded via useQuery - no more mock data!

interface CreateTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateTeamModal({ open, onOpenChange }: CreateTeamModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);

  // 🎯 Form setup
  const form = useForm<CreateTeamData>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: '',
      description: '',
      teamType: 'functional',
      assignedDepartments: [],
      userMembers: [],
      roleMembers: [],
      primarySupervisor: '',
      secondarySupervisors: [],
      isActive: true
    }
  });

  // 🎯 Load real data from API with proper typing
  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({ 
    queryKey: ['/api/users'],
    enabled: open 
  });
  
  const { data: roles = [], isLoading: rolesLoading } = useQuery<any[]>({ 
    queryKey: ['/api/roles'],
    enabled: open 
  });

  // 🎯 Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: async (teamData: CreateTeamData) => {
      return await apiRequest('/api/teams', {
        method: 'POST',
        body: JSON.stringify(teamData)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      toast({
        title: 'Team Created',
        description: 'New team created successfully',
      });
      onOpenChange(false);
      form.reset();
      setCurrentStep(1);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create team',
        variant: 'destructive'
      });
    }
  });

  // 🎯 Handle form submission
  const onSubmit = (data: CreateTeamData) => {
    createTeamMutation.mutate(data);
  };

  // 🎯 Department selection helpers
  const selectedDepartments = form.watch('assignedDepartments');
  const toggleDepartment = (department: keyof typeof DEPARTMENTS) => {
    const current = selectedDepartments;
    const updated = current.includes(department)
      ? current.filter(d => d !== department)
      : [...current, department];
    form.setValue('assignedDepartments', updated);
  };

  // 🎯 Member selection helpers
  const selectedUserMembers = form.watch('userMembers');
  const selectedRoleMembers = form.watch('roleMembers');

  const toggleUserMember = (userId: string) => {
    const current = selectedUserMembers;
    const updated = current.includes(userId)
      ? current.filter(id => id !== userId)
      : [...current, userId];
    form.setValue('userMembers', updated);
  };

  const toggleRoleMember = (roleId: string) => {
    const current = selectedRoleMembers;
    const updated = current.includes(roleId)
      ? current.filter(id => id !== roleId)
      : [...current, roleId];
    form.setValue('roleMembers', updated);
  };

  // 🎯 Step navigation
  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // 🎯 Step validation
  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return form.watch('name') && form.watch('teamType');
      case 2:
        return selectedDepartments.length > 0;
      case 3:
        return true; // Optional step
      case 4:
        return true; // Final step
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-modal max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-windtre-orange" />
            Create New Team
          </DialogTitle>
          <DialogDescription>
            Create a new team and assign it to departments for workflow management
          </DialogDescription>
        </DialogHeader>

        {/* 🎯 Step Indicator */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center space-x-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === currentStep 
                    ? 'bg-windtre-orange text-white' 
                    : step < currentStep 
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                }`}>
                  {step < currentStep ? '✓' : step}
                </div>
                {step < 4 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <ScrollArea className="max-h-[60vh] pr-4">
              
              {/* 🎯 STEP 1: Basic Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="w-5 h-5 text-windtre-purple" />
                    <h3 className="text-lg font-semibold">Basic Information</h3>
                  </div>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter team name" 
                            {...field} 
                            data-testid="input-team-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the team's purpose and responsibilities" 
                            {...field} 
                            data-testid="textarea-team-description"
                          />
                        </FormControl>
                        <FormDescription>
                          Optional description of team's purpose and goals
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="teamType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Type *</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger data-testid="select-team-type">
                              <SelectValue placeholder="Select team type" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(TEAM_TYPES).map(([key, type]) => (
                                <SelectItem key={key} value={key}>
                                  <div>
                                    <div className="font-medium">{type.label}</div>
                                    <div className="text-sm text-gray-500">{type.description}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* 🎯 STEP 2: Department Assignment */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-5 h-5 text-windtre-orange" />
                    <h3 className="text-lg font-semibold">Department Assignment</h3>
                  </div>

                  <FormField
                    control={form.control}
                    name="assignedDepartments"
                    render={() => (
                      <FormItem>
                        <FormLabel>Assigned Departments *</FormLabel>
                        <FormDescription>
                          Select which departments this team will handle workflows for
                        </FormDescription>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                          {Object.entries(DEPARTMENTS).map(([key, dept]) => {
                            const Icon = dept.icon;
                            const isSelected = selectedDepartments.includes(key as keyof typeof DEPARTMENTS);
                            
                            return (
                              <div
                                key={key}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                  isSelected
                                    ? `${dept.color} ${dept.borderColor} ring-2 ring-offset-2 ring-windtre-orange/50`
                                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                }`}
                                onClick={() => toggleDepartment(key as keyof typeof DEPARTMENTS)}
                                data-testid={`department-${key}`}
                              >
                                <div className="flex items-center space-x-3">
                                  <Icon className={`w-6 h-6 ${isSelected ? dept.textColor : 'text-gray-500'}`} />
                                  <div>
                                    <div className={`font-medium ${isSelected ? dept.textColor : 'text-gray-700'}`}>
                                      {dept.label}
                                    </div>
                                    {isSelected && (
                                      <div className="text-sm text-green-600">✓ Selected</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {selectedDepartments.length > 0 && (
                          <div className="mt-4">
                            <div className="text-sm font-medium text-gray-700 mb-2">Selected Departments:</div>
                            <div className="flex flex-wrap gap-2">
                              {selectedDepartments.map((dept) => (
                                <Badge 
                                  key={dept} 
                                  className={`${DEPARTMENTS[dept].color} ${DEPARTMENTS[dept].textColor}`}
                                  data-testid={`selected-department-${dept}`}
                                >
                                  {DEPARTMENTS[dept].label}
                                  <X 
                                    className="w-3 h-3 ml-1 cursor-pointer" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleDepartment(dept);
                                    }}
                                  />
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* 🎯 STEP 3: Team Members */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-windtre-purple" />
                    <h3 className="text-lg font-semibold">Team Members</h3>
                  </div>

                  {/* User Members */}
                  <div>
                    <h4 className="text-md font-medium mb-3">Individual Users</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {users.map((user: any) => {
                        const isSelected = selectedUserMembers.includes(user.id);
                        return (
                          <div
                            key={user.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-windtre-purple/10 border-windtre-purple text-windtre-purple'
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            }`}
                            onClick={() => toggleUserMember(user.id)}
                            data-testid={`user-member-${user.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{DEPARTMENTS[user.department as keyof typeof DEPARTMENTS]?.label}</Badge>
                                {isSelected && <UserCheck className="w-4 h-4 text-green-600" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Role Members */}
                  <div>
                    <h4 className="text-md font-medium mb-3">Role-Based Members</h4>
                    <div className="space-y-2">
                      {roles.map((role: any) => {
                        const isSelected = selectedRoleMembers.includes(role.id);
                        return (
                          <div
                            key={role.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-windtre-orange/10 border-windtre-orange text-windtre-orange'
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            }`}
                            onClick={() => toggleRoleMember(role.id)}
                            data-testid={`role-member-${role.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{role.name}</div>
                                <div className="text-sm text-gray-500">{role.description}</div>
                              </div>
                              {isSelected && <Shield className="w-4 h-4 text-green-600" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* 🎯 STEP 4: Supervisors */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-windtre-orange" />
                    <h3 className="text-lg font-semibold">Supervisors</h3>
                  </div>

                  <FormField
                    control={form.control}
                    name="primarySupervisor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Supervisor</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger data-testid="select-primary-supervisor">
                              <SelectValue placeholder="Select primary supervisor" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No supervisor</SelectItem>
                              {users.map((user: any) => (
                                <SelectItem key={user.id} value={user.id}>
                                  <div className="flex items-center justify-between w-full">
                                    <span>{user.name}</span>
                                    <Badge variant="outline" className="ml-2">
                                      {DEPARTMENTS[user.department as keyof typeof DEPARTMENTS]?.label}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          Main supervisor responsible for team oversight
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <h4 className="text-md font-medium mb-3">Secondary Supervisors</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Additional supervisors who can support team management
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {users.map((user: any) => {
                        const secondarySupervisors = form.watch('secondarySupervisors');
                        const isSelected = secondarySupervisors.includes(user.id);
                        const isPrimary = form.watch('primarySupervisor') === user.id;
                        
                        return (
                          <div
                            key={user.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              isPrimary
                                ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
                                : isSelected
                                  ? 'bg-windtre-orange/10 border-windtre-orange text-windtre-orange'
                                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            }`}
                            onClick={() => {
                              if (!isPrimary) {
                                const current = secondarySupervisors;
                                const updated = current.includes(user.id)
                                  ? current.filter(id => id !== user.id)
                                  : [...current, user.id];
                                form.setValue('secondarySupervisors', updated);
                              }
                            }}
                            data-testid={`secondary-supervisor-${user.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{DEPARTMENTS[user.department as keyof typeof DEPARTMENTS]?.label}</Badge>
                                {isPrimary && <Badge className="bg-blue-100 text-blue-800">Primary</Badge>}
                                {isSelected && !isPrimary && <Shield className="w-4 h-4 text-green-600" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

            </ScrollArea>

            {/* 🎯 Footer Actions */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                data-testid="button-previous-step"
              >
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {currentStep < 4 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={!canProceedToNextStep()}
                    className="bg-windtre-orange hover:bg-windtre-orange/90"
                    data-testid="button-next-step"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={createTeamMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="button-create-team"
                  >
                    {createTeamMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Create Team
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}