/**
 * 👥 CREATE TEAM MODAL - WindTre Design System
 * 
 * Modal completo per creazione team con assegnazione dipartimenti,
 * membri ibridi, supervisori e validation enterprise
 */

import React, { useState } from 'react';
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
  UserCheck,
  AlertTriangle,
  MapPin
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// 🎯 WindTre department mapping - VERI dipartimenti dal sistema
const DEPARTMENTS = {
  'hr': { icon: Users, label: 'HR', color: 'bg-windtre-purple/10', textColor: 'text-windtre-purple', borderColor: 'border-windtre-purple/20' },
  'finance': { icon: DollarSign, label: 'Finance', color: 'bg-windtre-orange/10', textColor: 'text-windtre-orange', borderColor: 'border-windtre-orange/20' },
  'sales': { icon: Building2, label: 'Sales', color: 'bg-windtre-purple/10', textColor: 'text-windtre-purple', borderColor: 'border-windtre-purple/20' },
  'operations': { icon: Settings, label: 'Operations', color: 'bg-windtre-orange/10', textColor: 'text-windtre-orange', borderColor: 'border-windtre-orange/20' },
  'support': { icon: HeadphonesIcon, label: 'Support', color: 'bg-windtre-purple/10', textColor: 'text-windtre-purple', borderColor: 'border-windtre-purple/20' },
  'crm': { icon: Users, label: 'CRM', color: 'bg-windtre-orange/10', textColor: 'text-windtre-orange', borderColor: 'border-windtre-orange/20' }
};

// 🎯 Team types mapping with exclusivity rules
// FUNCTIONAL teams: 1 user = max 1 team per department (primary/exclusive)
// Other team types: Allow multiple memberships per department (flexible)
const TEAM_TYPES = {
  'functional': { 
    label: 'Funzionale', 
    description: '🔒 Team primario per dipartimento',
    exclusive: true,
    warning: 'Un utente può appartenere a max 1 team funzionale per dipartimento',
    icon: '🔒'
  },
  'cross_functional': { 
    label: 'Cross-Funzionale', 
    description: 'Team multi-dipartimento',
    exclusive: false,
    icon: '🔗'
  },
  'project': { 
    label: 'Progetto', 
    description: 'Team temporanei per progetto specifico',
    exclusive: false,
    icon: '📋'
  },
  'temporary': { 
    label: 'Temporaneo', 
    description: '⏰ Membership multipla consentita',
    exclusive: false,
    icon: '⏰'
  },
  'specialized': { 
    label: 'Specializzato', 
    description: 'Team di esperti/specialisti',
    exclusive: false,
    icon: '⭐'
  }
};

// 🎯 Form validation schema - REFACTORED for user-based team management
// Members are now managed via user_teams API, not stored in form directly
const createTeamSchema = z.object({
  name: z.string().min(1, 'Il nome del team è obbligatorio').max(200, 'Nome troppo lungo'),
  description: z.string().optional(),
  teamType: z.enum(['functional', 'cross_functional', 'project', 'temporary', 'specialized']),
  assignedDepartments: z.array(z.enum(['hr', 'finance', 'sales', 'operations', 'support', 'crm'])).min(1, 'È richiesto almeno un dipartimento'),
  // Members and observers are managed via separate API calls after team creation
  // Stored locally in form only for UI state, not sent to backend
  selectedMembers: z.array(z.string()).default([]), // User IDs to add as members
  selectedObservers: z.array(z.string()).default([]), // User IDs to add as observers
  // Supervisors - user-based only (no more role-based)
  primarySupervisorUser: z.string().nullable().optional(),
  secondarySupervisorUser: z.string().nullable().optional(),
  workflowAssignments: z.array(z.object({
    department: z.enum(['hr', 'finance', 'sales', 'operations', 'support', 'crm']),
    templateId: z.string(),
    autoAssign: z.boolean().default(true)
  })).default([]),
  isActive: z.boolean().default(true)
}).refine((data) => {
  // ✅ Validation: Primary and secondary supervisors cannot be the same user
  const primarySup = data.primarySupervisorUser;
  const secondarySup = data.secondarySupervisorUser;
  
  if (primarySup && secondarySup && primarySup === secondarySup) {
    return false;
  }
  
  return true;
}, {
  message: "Il supervisore principale e il secondo supervisore non possono essere la stessa persona",
  path: ["secondarySupervisorUser"]
});

type CreateTeamData = z.infer<typeof createTeamSchema>;

// 🎯 Real data loaded via useQuery - no more mock data!

interface CreateTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTeam?: any; // Team to edit, if provided
}

export default function CreateTeamModal({ open, onOpenChange, editTeam }: CreateTeamModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState<string | null>(null);
  const [primarySupSearchQuery, setPrimarySupSearchQuery] = useState('');
  const [primarySupRoleFilter, setPrimarySupRoleFilter] = useState<string | null>(null);
  const [secondarySupSearchQuery, setSecondarySupSearchQuery] = useState('');
  const [secondarySupRoleFilter, setSecondarySupRoleFilter] = useState<string | null>(null);

  // 🎯 Fixed form setup - prevent re-initialization issues
  const defaultValues: CreateTeamData = {
    name: '',
    description: '',
    teamType: 'functional',
    assignedDepartments: [],
    selectedMembers: [],
    selectedObservers: [],
    primarySupervisorUser: null,
    secondarySupervisorUser: null,
    workflowAssignments: [],
    isActive: true
  };

  const form = useForm<CreateTeamData>({
    resolver: zodResolver(createTeamSchema),
    defaultValues,
    mode: 'onChange' // Enable real-time validation
  });

  // 🎯 Reset form when editTeam changes or modal opens
  React.useEffect(() => {
    if (open) {
      if (editTeam) {
        const formData = {
          name: editTeam.name || '',
          description: editTeam.description || '',
          teamType: editTeam.teamType || 'functional',
          assignedDepartments: editTeam.assignedDepartments || [],
          selectedMembers: [], // Will be loaded from API when editing
          selectedObservers: [], // Will be loaded from API when editing
          primarySupervisorUser: editTeam.primarySupervisorUser || null,
          secondarySupervisorUser: editTeam.secondarySupervisorUser || 
            (editTeam.secondarySupervisorUsers && editTeam.secondarySupervisorUsers[0]) || null,
          workflowAssignments: editTeam.workflowAssignments || [],
          isActive: editTeam.isActive !== undefined ? editTeam.isActive : true
        };
        form.reset(formData);
      } else {
        form.reset(defaultValues);
      }
      setCurrentStep(1);
    }
  }, [open, editTeam]);

  // 🎯 Load real data from API with proper typing - prevent query refresh issues
  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({ 
    queryKey: ['/api/users'],
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });
  
  // Helper function per ottenere il display name dell'utente
  const getUserDisplayName = (user: any) => {
    if (!user) return '';
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return fullName || user.email || '';
  };
  
  const { data: roles = [], isLoading: rolesLoading } = useQuery<any[]>({ 
    queryKey: ['/api/roles'],
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  // 🎯 Load workflow templates for department assignment
  const { data: workflowTemplates = [], isLoading: templatesLoading } = useQuery<any[]>({ 
    queryKey: ['/api/workflow-templates'],
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  // 🎯 Load stores for area mismatch validation
  const { data: stores = [] } = useQuery<any[]>({ 
    queryKey: ['/api/stores'],
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  // 🎯 Load commercial areas for area name display
  const { data: commercialAreas = [] } = useQuery<any[]>({ 
    queryKey: ['/api/commercial-areas'],
    staleTime: 10 * 60 * 1000 // Cache for 10 minutes
  });

  // 🎯 AREA MISMATCH VALIDATION HELPERS
  // Get user's commercial area via their store assignment
  const getUserAreaId = (userId: string): string | null => {
    const user = users.find((u: any) => u.id === userId);
    if (!user?.storeId) return null;
    const store = stores.find((s: any) => s.id === user.storeId);
    return store?.commercialAreaId || null;
  };

  // Get commercial area name by ID
  const getAreaName = (areaId: string | null): string => {
    if (!areaId) return 'Nessuna area';
    const area = commercialAreas.find((a: any) => a.id === areaId);
    return area?.name || area?.nome || 'Area sconosciuta';
  };

  // Check if supervisor has area mismatch with any team member
  const checkAreaMismatch = (supervisorId: string | null): { hasMismatch: boolean; mismatchDetails: { memberId: string; memberName: string; memberArea: string; supervisorArea: string }[] } => {
    if (!supervisorId) return { hasMismatch: false, mismatchDetails: [] };
    
    const supervisorAreaId = getUserAreaId(supervisorId);
    const selectedMemberIds = form.watch('selectedMembers');
    const mismatchDetails: { memberId: string; memberName: string; memberArea: string; supervisorArea: string }[] = [];
    
    for (const memberId of selectedMemberIds) {
      const memberAreaId = getUserAreaId(memberId);
      // Both must have areas assigned for comparison
      if (supervisorAreaId && memberAreaId && supervisorAreaId !== memberAreaId) {
        const member = users.find((u: any) => u.id === memberId);
        mismatchDetails.push({
          memberId,
          memberName: member?.name || member?.email || 'Utente',
          memberArea: getAreaName(memberAreaId),
          supervisorArea: getAreaName(supervisorAreaId)
        });
      }
    }
    
    return { hasMismatch: mismatchDetails.length > 0, mismatchDetails };
  };

  // 🎯 Create team mutation - also adds members and observers
  const createTeamMutation = useMutation({
    mutationFn: async (teamData: CreateTeamData) => {
      // Extract members/observers from form (not sent to team endpoint)
      const { selectedMembers, selectedObservers, ...teamPayload } = teamData;
      
      // 1. Create the team
      const createdTeam = await apiRequest('/api/teams', {
        method: 'POST',
        body: JSON.stringify({
          ...teamPayload,
          primarySupervisorUser: teamPayload.primarySupervisorUser || undefined,
          secondarySupervisorUser: teamPayload.secondarySupervisorUser || undefined
        })
      });
      
      // 2. Add members if any
      if (selectedMembers.length > 0 && createdTeam?.id) {
        await apiRequest(`/api/teams/${createdTeam.id}/members`, {
          method: 'POST',
          body: JSON.stringify({ userIds: selectedMembers, isPrimaryTeam: true })
        });
      }
      
      // 3. Add observers if any
      if (selectedObservers.length > 0 && createdTeam?.id) {
        await apiRequest(`/api/teams/${createdTeam.id}/observers`, {
          method: 'POST',
          body: JSON.stringify({ userIds: selectedObservers, canApprove: true })
        });
      }
      
      return createdTeam;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      toast({
        title: 'Team Creato',
        description: 'Nuovo team creato con successo',
      });
      onOpenChange(false);
      form.reset();
      setCurrentStep(1);
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error?.message || 'Creazione del team fallita',
        variant: 'destructive'
      });
    }
  });

  // 🎯 Update team mutation
  const updateTeamMutation = useMutation({
    mutationFn: async (teamData: CreateTeamData) => {
      const { selectedMembers, selectedObservers, ...teamPayload } = teamData;
      
      return await apiRequest(`/api/teams/${editTeam.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...teamPayload,
          primarySupervisorUser: teamPayload.primarySupervisorUser || undefined,
          secondarySupervisorUser: teamPayload.secondarySupervisorUser || undefined
        })
      });
      // Note: For updates, members/observers are managed separately via dedicated APIs
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      toast({
        title: 'Team Aggiornato',
        description: 'Team aggiornato con successo',
      });
      onOpenChange(false);
      form.reset();
      setCurrentStep(1);
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: 'Aggiornamento del team fallito',
        variant: 'destructive'
      });
    }
  });

  // 🎯 Handle form submission
  const onSubmit = (data: CreateTeamData) => {
    if (editTeam) {
      updateTeamMutation.mutate(data);
    } else {
      createTeamMutation.mutate(data);
    }
  };

  // 🎯 Handle form errors
  const onFormError = (errors: any) => {
    toast({
      title: 'Errore di Validazione',
      description: 'Controlla tutti i campi obbligatori',
      variant: 'destructive'
    });
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
  const selectedUserMembers = form.watch('selectedMembers');
  const selectedObserverUsers = form.watch('selectedObservers');

  const toggleUserMember = (userId: string) => {
    const current = selectedUserMembers;
    const updated = current.includes(userId)
      ? current.filter(id => id !== userId)
      : [...current, userId];
    form.setValue('selectedMembers', updated);
  };

  const toggleObserverUser = (userId: string) => {
    const current = selectedObserverUsers;
    const updated = current.includes(userId)
      ? current.filter(id => id !== userId)
      : [...current, userId];
    form.setValue('selectedObservers', updated);
  };

  // 🎯 Workflow assignment helpers
  const selectedAssignments = form.watch('workflowAssignments');
  
  const addWorkflowAssignment = (department: 'hr' | 'finance' | 'sales' | 'operations' | 'support' | 'crm', templateId: string) => {
    const current = selectedAssignments;
    const exists = current.find(a => a.department === department && a.templateId === templateId);
    if (!exists) {
      const updated = [...current, { department, templateId, autoAssign: true }];
      form.setValue('workflowAssignments', updated);
    }
  };

  const removeWorkflowAssignment = (department: 'hr' | 'finance' | 'sales' | 'operations' | 'support' | 'crm', templateId: string) => {
    const current = selectedAssignments;
    const updated = current.filter(a => !(a.department === department && a.templateId === templateId));
    form.setValue('workflowAssignments', updated);
  };

  const toggleAutoAssign = (department: 'hr' | 'finance' | 'sales' | 'operations' | 'support' | 'crm', templateId: string) => {
    const current = selectedAssignments;
    const updated = current.map(a => 
      a.department === department && a.templateId === templateId
        ? { ...a, autoAssign: !a.autoAssign }
        : a
    );
    form.setValue('workflowAssignments', updated);
  };

  // 🎯 Step navigation
  const nextStep = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
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
        return true; // Optional step
      case 5:
        return true; // Final step
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`glass-modal max-w-4xl transition-all duration-300 ${
        currentStep <= 2 
          ? 'max-h-[60vh] h-auto' 
          : 'max-h-[95vh] h-[85vh]'
      }`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-windtre-orange" />
            {editTeam ? 'Modifica Team' : 'Crea Nuovo Team'}
          </DialogTitle>
          <DialogDescription>
            {editTeam ? 'Modifica i dettagli del team e aggiorna le assegnazioni' : 'Crea un nuovo team e assegnalo ai dipartimenti per la gestione dei workflow'}
          </DialogDescription>
        </DialogHeader>

        {/* 🎯 Step Indicator */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center space-x-4">
            {[1, 2, 3, 4, 5].map((step) => (
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
                {step < 5 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onFormError)} className="space-y-6">
            <ScrollArea className="max-h-[60vh] pr-4">
              
              {/* 🎯 STEP 1: Basic Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="w-5 h-5 text-windtre-purple" />
                    <h3 className="text-lg font-semibold">Informazioni di Base</h3>
                  </div>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Team *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Inserisci nome team" 
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
                        <FormLabel>Descrizione</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descrivi lo scopo e le responsabilità del team" 
                            {...field} 
                            data-testid="textarea-team-description"
                          />
                        </FormControl>
                        <FormDescription>
                          Descrizione opzionale dello scopo e degli obiettivi del team
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="teamType"
                    render={({ field }) => (
                      <FormItem className="relative z-10">
                        <FormLabel>Tipo Team *</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger data-testid="select-team-type">
                              <SelectValue placeholder="Seleziona tipo team" />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                              {Object.entries(TEAM_TYPES).map(([key, type]) => (
                                <SelectItem key={key} value={key}>
                                  <div className="flex items-start gap-2">
                                    <span className="text-lg">{type.icon}</span>
                                    <div>
                                      <div className="font-medium">{type.label}</div>
                                      <div className="text-sm text-gray-500">{type.description}</div>
                                    </div>
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

                  {/* Alert for functional teams - MOVED OUTSIDE FormField to prevent overlay issues */}
                  {form.watch('teamType') === 'functional' && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <span className="text-yellow-600">⚠️</span>
                        <div className="text-sm text-yellow-800">
                          <strong>Team Funzionale (Primario)</strong>
                          <p className="mt-1">
                            Un utente può appartenere a max <strong>1 team funzionale</strong> per ogni dipartimento.
                            Le richieste saranno gestite prima dal supervisore di questo team.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {form.watch('teamType') === 'temporary' && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <span className="text-blue-600">ℹ️</span>
                        <div className="text-sm text-blue-800">
                          <strong>Team Temporaneo (Flessibile)</strong>
                          <p className="mt-1">
                            Un utente può appartenere a <strong>più team temporanei</strong> dello stesso dipartimento.
                            Il primo supervisore che gestisce la richiesta diventa responsabile (First Wins).
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 🎯 STEP 2: Department Assignment */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Building2 className="w-5 h-5 text-windtre-orange" />
                    <h3 className="text-lg font-semibold">Assegnazione Dipartimento</h3>
                  </div>

                  <FormField
                    control={form.control}
                    name="assignedDepartments"
                    render={() => (
                      <FormItem>
                        <FormLabel>Dipartimenti Assegnati *</FormLabel>
                        <FormDescription>
                          Seleziona i dipartimenti per cui questo team gestirà i workflow
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
                                      <div className="text-sm text-green-600">✓ Selezionato</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {selectedDepartments.length > 0 && (
                          <div className="mt-4">
                            <div className="text-sm font-medium text-gray-700 mb-2">Dipartimenti Selezionati:</div>
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
                    <h3 className="text-lg font-semibold">Membri del Team</h3>
                  </div>

                  {/* 🎯 Membri Selezionati - Rimovibili */}
                  {selectedUserMembers.length > 0 && (
                    <div className="p-4 bg-gradient-to-r from-windtre-purple/5 to-windtre-orange/5 rounded-lg border border-windtre-purple/20">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-windtre-purple">Membri Selezionati ({selectedUserMembers.length})</h4>
                        <span className="text-xs text-gray-500">Clicca sulla X per rimuovere</span>
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                        {selectedUserMembers.map(userId => {
                          const user = users.find((u: any) => u.id === userId);
                          return user ? (
                            <Badge 
                              key={userId} 
                              className="bg-windtre-purple/20 text-windtre-purple hover:bg-windtre-purple/30 cursor-pointer flex items-center gap-1 pr-1"
                            >
                              {getUserDisplayName(user)}
                              <X 
                                className="w-3 h-3 ml-1 hover:text-red-600" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleUserMember(userId);
                                }}
                              />
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {/* User Members */}
                  <div>
                    <h4 className="text-md font-medium mb-1">Seleziona Utenti</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Aggiungi utenti specifici al team. Usa i filtri per trovare rapidamente gli utenti.
                    </p>
                    
                    {/* Filtri: Ricerca + Ruolo */}
                    <div className="flex gap-3 mb-4">
                      <div className="flex-1">
                        <Input
                          placeholder="Cerca per nome o cognome..."
                          value={memberSearchQuery}
                          onChange={(e) => setMemberSearchQuery(e.target.value)}
                          className="w-full"
                          data-testid="member-search-input"
                        />
                      </div>
                      <Select
                        value={memberRoleFilter || 'all'}
                        onValueChange={(value) => setMemberRoleFilter(value === 'all' ? null : value)}
                      >
                        <SelectTrigger className="w-[180px]" data-testid="member-role-filter">
                          <SelectValue placeholder="Filtra per ruolo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tutti i ruoli</SelectItem>
                          {roles.map((role: any) => (
                            <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2 max-h-[450px] overflow-y-auto">
                      {users
                        .filter((user: any) => {
                          const searchLower = memberSearchQuery.toLowerCase();
                          const fullName = getUserDisplayName(user).toLowerCase();
                          const matchesSearch = !memberSearchQuery || 
                            fullName.includes(searchLower) ||
                            user.email?.toLowerCase().includes(searchLower);
                          const matchesRole = !memberRoleFilter || user.roleId === memberRoleFilter;
                          return matchesSearch && matchesRole;
                        })
                        .map((user: any) => {
                          const isSelected = selectedUserMembers.includes(user.id);
                          const userRole = roles.find((r: any) => r.id === user.roleId);
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
                                  <div className="font-medium">{getUserDisplayName(user)}</div>
                                  <div className="text-sm text-gray-500">{user.email}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {userRole && <Badge variant="secondary" className="text-xs">{userRole.name}</Badge>}
                                  <Badge variant="outline">{user.department && DEPARTMENTS[user.department as keyof typeof DEPARTMENTS] ? DEPARTMENTS[user.department as keyof typeof DEPARTMENTS].label : 'No Dept'}</Badge>
                                  {isSelected && <UserCheck className="w-4 h-4 text-green-600" />}
                                </div>
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
                    <h3 className="text-lg font-semibold">Supervisori</h3>
                  </div>

                  {/* 🎯 PRIMARY SUPERVISOR SECTION */}
                  <div className="p-4 bg-gradient-to-r from-windtre-purple/5 to-windtre-orange/5 rounded-lg border border-windtre-purple/20">
                    <h4 className="text-sm font-medium text-windtre-purple mb-2">🎯 Primary Supervisor</h4>
                    <p className="text-xs text-gray-600">
                      Main supervisor responsible for team oversight
                    </p>
                  </div>

                  {/* Primary Supervisor - User */}
                  <div>
                    <h4 className="text-md font-medium mb-1">Supervisore Principale</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Seleziona un utente specifico come supervisore principale
                    </p>
                    
                    {/* Filtri: Ricerca + Ruolo */}
                    <div className="flex gap-3 mb-4">
                      <div className="flex-1">
                        <Input
                          placeholder="Cerca per nome o cognome..."
                          value={primarySupSearchQuery}
                          onChange={(e) => setPrimarySupSearchQuery(e.target.value)}
                          className="w-full"
                          data-testid="primary-sup-search-input"
                        />
                      </div>
                      <Select
                        value={primarySupRoleFilter || 'all'}
                        onValueChange={(value) => setPrimarySupRoleFilter(value === 'all' ? null : value)}
                      >
                        <SelectTrigger className="w-[180px]" data-testid="primary-sup-role-filter">
                          <SelectValue placeholder="Filtra per ruolo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tutti i ruoli</SelectItem>
                          {roles.map((role: any) => (
                            <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2 max-h-[250px] overflow-y-auto">
                      {users
                        .filter((user: any) => {
                          const searchLower = primarySupSearchQuery.toLowerCase();
                          const fullName = getUserDisplayName(user).toLowerCase();
                          const matchesSearch = !primarySupSearchQuery || 
                            fullName.includes(searchLower) ||
                            user.email?.toLowerCase().includes(searchLower);
                          const matchesRole = !primarySupRoleFilter || user.roleId === primarySupRoleFilter;
                          return matchesSearch && matchesRole;
                        })
                        .map((user: any) => {
                          const primaryUser = form.watch('primarySupervisorUser');
                          const membersList = form.watch('selectedMembers');
                          const isSelected = primaryUser === user.id;
                          const isMember = membersList.includes(user.id);
                          const isDisabled = isMember;
                          const userRole = roles.find((r: any) => r.id === user.roleId);
                          
                          return (
                            <div
                              key={user.id}
                              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                isDisabled
                                  ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
                                  : isSelected
                                    ? 'bg-windtre-purple/10 border-windtre-purple text-windtre-purple'
                                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                              }`}
                              onClick={() => {
                                if (!isDisabled) {
                                  form.setValue('primarySupervisorUser', isSelected ? null : user.id);
                                } else if (isMember) {
                                  toast({
                                    title: 'Conflitto Rilevato',
                                    description: `${getUserDisplayName(user)} è già un membro del team e non può essere supervisore dello stesso team.`,
                                    variant: 'destructive'
                                  });
                                }
                              }}
                              data-testid={`primary-supervisor-user-${user.id}`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{getUserDisplayName(user)}</div>
                                  <div className="text-sm text-gray-500">{user.email}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {userRole && <Badge variant="secondary" className="text-xs">{userRole.name}</Badge>}
                                  <Badge variant="outline">
                                    {user.department && DEPARTMENTS[user.department as keyof typeof DEPARTMENTS] 
                                      ? DEPARTMENTS[user.department as keyof typeof DEPARTMENTS].label 
                                      : 'No Dept'}
                                  </Badge>
                                  {isMember && <Badge className="bg-yellow-100 text-yellow-800">Membro</Badge>}
                                  {isSelected && <UserCheck className="w-4 h-4 text-green-600" />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    
                    {/* 🚨 AREA MISMATCH WARNING - Primary Supervisor */}
                    {(() => {
                      const primarySup = form.watch('primarySupervisorUser');
                      const mismatchInfo = checkAreaMismatch(primarySup);
                      if (mismatchInfo.hasMismatch && primarySup) {
                        const supervisor = users.find((u: any) => u.id === primarySup);
                        return (
                          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                              <div className="text-sm">
                                <div className="font-medium text-yellow-800 flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  Attenzione: Mismatch Area Territoriale
                                </div>
                                <p className="text-yellow-700 mt-1">
                                  Il supervisore <strong>{getUserDisplayName(supervisor) || supervisor?.email}</strong> ({mismatchInfo.mismatchDetails[0]?.supervisorArea}) 
                                  appartiene a un'area diversa rispetto ad alcuni membri del team:
                                </p>
                                <ul className="mt-2 text-xs text-yellow-600 list-disc list-inside">
                                  {mismatchInfo.mismatchDetails.slice(0, 3).map((detail) => (
                                    <li key={detail.memberId}>
                                      {detail.memberName} → {detail.memberArea}
                                    </li>
                                  ))}
                                  {mismatchInfo.mismatchDetails.length > 3 && (
                                    <li>...e altri {mismatchInfo.mismatchDetails.length - 3} membri</li>
                                  )}
                                </ul>
                                <p className="text-xs text-yellow-600 mt-2 italic">
                                  💡 È possibile procedere, ma le richieste potrebbero richiedere più tempo per essere gestite.
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <Separator className="my-8" />

                  {/* 🎯 SECONDARY SUPERVISOR SECTION - Single User Only (Optional) */}
                  <div className="p-4 bg-gradient-to-r from-windtre-purple/5 to-windtre-orange/5 rounded-lg border border-windtre-purple/20">
                    <h4 className="text-sm font-medium text-windtre-purple mb-2">🎯 Secondo Supervisore (Opzionale)</h4>
                    <p className="text-xs text-gray-600">
                      Seleziona un ulteriore utente come supervisore di supporto per questo team
                    </p>
                  </div>

                  {/* Secondary Supervisor - Single User */}
                  <div>
                    <h4 className="text-md font-medium mb-1">Secondo Supervisore</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Seleziona un utente specifico come secondo supervisore (opzionale)
                    </p>
                    
                    {/* Filtri: Ricerca + Ruolo */}
                    <div className="flex gap-3 mb-4">
                      <div className="flex-1">
                        <Input
                          placeholder="Cerca per nome o cognome..."
                          value={secondarySupSearchQuery}
                          onChange={(e) => setSecondarySupSearchQuery(e.target.value)}
                          className="w-full"
                          data-testid="secondary-sup-search-input"
                        />
                      </div>
                      <Select
                        value={secondarySupRoleFilter || 'all'}
                        onValueChange={(value) => setSecondarySupRoleFilter(value === 'all' ? null : value)}
                      >
                        <SelectTrigger className="w-[180px]" data-testid="secondary-sup-role-filter">
                          <SelectValue placeholder="Filtra per ruolo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tutti i ruoli</SelectItem>
                          {roles.map((role: any) => (
                            <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2 max-h-[250px] overflow-y-auto">
                      {users
                        .filter((user: any) => {
                          const searchLower = secondarySupSearchQuery.toLowerCase();
                          const fullName = getUserDisplayName(user).toLowerCase();
                          const matchesSearch = !secondarySupSearchQuery || 
                            fullName.includes(searchLower) ||
                            user.email?.toLowerCase().includes(searchLower);
                          const matchesRole = !secondarySupRoleFilter || user.roleId === secondarySupRoleFilter;
                          return matchesSearch && matchesRole;
                        })
                        .map((user: any) => {
                          const secondaryUser = form.watch('secondarySupervisorUser');
                          const primaryUser = form.watch('primarySupervisorUser');
                          const membersList = form.watch('selectedMembers');
                          const isSelected = secondaryUser === user.id;
                          const isPrimary = primaryUser === user.id;
                          const isMember = membersList.includes(user.id);
                          const userRole = roles.find((r: any) => r.id === user.roleId);
                          
                          return (
                            <div
                              key={user.id}
                              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                (isPrimary || isMember)
                                  ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
                                  : isSelected
                                    ? 'bg-windtre-purple/10 border-windtre-purple text-windtre-purple'
                                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                              }`}
                              onClick={() => {
                                if (!isPrimary && !isMember) {
                                  form.setValue('secondarySupervisorUser', isSelected ? null : user.id);
                                } else if (isMember) {
                                  toast({
                                    title: 'Conflitto Rilevato',
                                    description: `${getUserDisplayName(user)} è già un membro del team e non può essere supervisore dello stesso team.`,
                                    variant: 'destructive'
                                  });
                                }
                              }}
                              data-testid={`secondary-supervisor-user-${user.id}`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{getUserDisplayName(user)}</div>
                                  <div className="text-sm text-gray-500">{user.email}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {userRole && <Badge variant="secondary" className="text-xs">{userRole.name}</Badge>}
                                  <Badge variant="outline">
                                    {user.department && DEPARTMENTS[user.department as keyof typeof DEPARTMENTS] 
                                      ? DEPARTMENTS[user.department as keyof typeof DEPARTMENTS].label 
                                      : 'No Dept'}
                                  </Badge>
                                  {isPrimary && <Badge className="bg-blue-100 text-blue-800">Primario</Badge>}
                                  {isMember && <Badge className="bg-yellow-100 text-yellow-800">Membro</Badge>}
                                  {isSelected && !isPrimary && !isMember && <UserCheck className="w-4 h-4 text-green-600" />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    
                    {/* 🚨 AREA MISMATCH WARNING - Secondary Supervisor */}
                    {(() => {
                      const secondarySup = form.watch('secondarySupervisorUser');
                      const mismatchInfo = checkAreaMismatch(secondarySup);
                      if (mismatchInfo.hasMismatch && secondarySup) {
                        const supervisor = users.find((u: any) => u.id === secondarySup);
                        return (
                          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                              <div className="text-sm">
                                <div className="font-medium text-yellow-800 flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  Attenzione: Mismatch Area (Secondo Supervisore)
                                </div>
                                <p className="text-yellow-700 mt-1">
                                  Il secondo supervisore <strong>{getUserDisplayName(supervisor) || supervisor?.email}</strong> ({mismatchInfo.mismatchDetails[0]?.supervisorArea}) 
                                  appartiene a un'area diversa rispetto ad alcuni membri del team.
                                </p>
                                <ul className="mt-2 text-xs text-yellow-600 list-disc list-inside">
                                  {mismatchInfo.mismatchDetails.slice(0, 3).map((detail) => (
                                    <li key={detail.memberId}>
                                      {detail.memberName} → {detail.memberArea}
                                    </li>
                                  ))}
                                  {mismatchInfo.mismatchDetails.length > 3 && (
                                    <li>...e altri {mismatchInfo.mismatchDetails.length - 3} membri</li>
                                  )}
                                </ul>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              )}

              {/* 🎯 STEP 5: Workflow Template Assignment */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Settings className="w-5 h-5 text-windtre-orange" />
                    <h3 className="text-lg font-semibold">Assegnazione Template Workflow</h3>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-windtre-purple/5 to-windtre-orange/5 rounded-lg border border-windtre-purple/20">
                    <h4 className="text-sm font-medium text-windtre-purple mb-2">🎯 Department-Specific Workflows</h4>
                    <p className="text-xs text-gray-600">
                      Assign workflow templates to each department. When a request comes from these departments, the team will automatically handle it using the assigned templates.
                    </p>
                  </div>

                  {selectedDepartments.length === 0 ? (
                    <div className="text-center p-8 bg-gray-50 rounded-lg">
                      <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">Please select departments in Step 2 first</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {selectedDepartments.map((department) => {
                        const departmentTemplates = workflowTemplates.filter(
                          (template: any) => template.category === department || !template.category
                        );
                        const assignedTemplates = selectedAssignments.filter(a => a.department === department);
                        
                        return (
                          <div key={department} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-4">
                              {React.createElement(DEPARTMENTS[department].icon, { 
                                className: `w-6 h-6 ${DEPARTMENTS[department].textColor}` 
                              })}
                              <h4 className="text-lg font-semibold">{DEPARTMENTS[department].label} Department</h4>
                              <Badge className={`${DEPARTMENTS[department].color} ${DEPARTMENTS[department].textColor}`}>
                                {assignedTemplates.length} templates assigned
                              </Badge>
                            </div>

                            {/* Template Selection */}
                            <div className="space-y-3">
                              <h5 className="text-md font-medium">Available Workflow Templates</h5>
                              {departmentTemplates.length === 0 ? (
                                <p className="text-sm text-gray-500 p-4 bg-gray-50 rounded">
                                  No templates available for {DEPARTMENTS[department].label} department
                                </p>
                              ) : (
                                <div className="grid grid-cols-1 gap-3">
                                  {departmentTemplates.map((template: any) => {
                                    const isAssigned = assignedTemplates.some(a => a.templateId === template.id);
                                    const assignment = assignedTemplates.find(a => a.templateId === template.id);
                                    
                                    return (
                                      <div
                                        key={template.id}
                                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                          isAssigned
                                            ? 'bg-green-50 border-green-200'
                                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                        }`}
                                        onClick={() => {
                                          if (isAssigned) {
                                            removeWorkflowAssignment(department, template.id);
                                          } else {
                                            addWorkflowAssignment(department, template.id);
                                          }
                                        }}
                                        data-testid={`template-${department}-${template.id}`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <div className="font-medium">{template.name}</div>
                                            <div className="text-sm text-gray-600">{template.description}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                              <Badge variant="outline" className="text-xs">
                                                {template.templateType || 'workflow'}
                                              </Badge>
                                              {template.category && (
                                                <Badge variant="outline" className="text-xs">
                                                  {template.category}
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {isAssigned && assignment && (
                                              <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1">
                                                  <Checkbox
                                                    checked={assignment.autoAssign}
                                                    onCheckedChange={() => toggleAutoAssign(department, template.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                  />
                                                  <span className="text-xs text-gray-600">Auto-assign</span>
                                                </div>
                                              </div>
                                            )}
                                            <div className={`w-4 h-4 rounded-full ${
                                              isAssigned ? 'bg-green-500' : 'bg-gray-300'
                                            }`} />
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Assignment Summary */}
                            {assignedTemplates.length > 0 && (
                              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                                <h6 className="text-sm font-medium text-green-800 mb-2">Assigned Templates</h6>
                                <div className="space-y-1">
                                  {assignedTemplates.map((assignment) => {
                                    const template = workflowTemplates.find((t: any) => t.id === assignment.templateId);
                                    return template ? (
                                      <div key={assignment.templateId} className="flex items-center justify-between text-sm">
                                        <span className="text-green-700">✓ {template.name}</span>
                                        <Badge variant={assignment.autoAssign ? 'default' : 'secondary'} className="text-xs">
                                          {assignment.autoAssign ? 'Auto-assign' : 'Manual'}
                                        </Badge>
                                      </div>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                Indietro
              </Button>

              <div className="flex items-center gap-2">
                {currentStep < 5 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={!canProceedToNextStep()}
                    className="bg-windtre-orange hover:bg-windtre-orange/90"
                    data-testid="button-next-step"
                  >
                    Avanti
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={createTeamMutation.isPending || updateTeamMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="button-create-team"
                  >
                    {(createTeamMutation.isPending || updateTeamMutation.isPending) ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {editTeam ? 'Aggiornamento...' : 'Creazione...'}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {editTeam ? 'Aggiorna Team' : 'Crea Team'}
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