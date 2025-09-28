/**
 * 🏗️ WORKFLOW MANAGEMENT PAGE - WindTre Design System
 * 
 * Enterprise workflow automation with WindTre glassmorphism design
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useWorkflowTemplates, useCreateTemplate, WorkflowTemplate } from '../hooks/useWorkflowTemplates';
import WorkflowBuilder from '../components/WorkflowBuilder';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CreateTeamModal from '../components/CreateTeamModal';
import '../styles/workflow-builder.css';
import { 
  Play, 
  Plus, 
  Search, 
  Filter,
  Users,
  BarChart3,
  Settings,
  Workflow,
  Building2,
  DollarSign,
  HeadphonesIcon,
  FileText,
  Edit,
  Trash2,
  MoreHorizontal,
  ArrowLeft,
  Archive,
  UserPlus,
  Shield,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';

// 🎯 WindTre department mapping - VERI dipartimenti dal sistema
const DEPARTMENTS = {
  'hr': { icon: Users, label: 'HR', color: 'bg-windtre-purple', textColor: 'text-windtre-purple' },
  'finance': { icon: DollarSign, label: 'Finance', color: 'bg-windtre-orange', textColor: 'text-windtre-orange' },
  'sales': { icon: Building2, label: 'Sales', color: 'bg-windtre-purple', textColor: 'text-windtre-purple' },
  'operations': { icon: Settings, label: 'Operations', color: 'bg-windtre-orange', textColor: 'text-windtre-orange' },
  'support': { icon: HeadphonesIcon, label: 'Support', color: 'bg-windtre-purple', textColor: 'text-windtre-purple' },
  'crm': { icon: Users, label: 'CRM', color: 'bg-windtre-orange', textColor: 'text-windtre-orange' }
};

// 🎯 Team types mapping
const TEAM_TYPES = {
  'functional': { label: 'Functional', color: 'bg-blue-100 text-blue-800' },
  'cross_functional': { label: 'Cross-Functional', color: 'bg-green-100 text-green-800' },
  'project': { label: 'Project', color: 'bg-purple-100 text-purple-800' },
  'temporary': { label: 'Temporary', color: 'bg-yellow-100 text-yellow-800' },
  'specialized': { label: 'Specialized', color: 'bg-orange-100 text-orange-800' }
};

// 🎯 TypeScript interfaces for teams
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

// 🎯 Sample workflow actions for Action Library
const WORKFLOW_ACTIONS = [
  { id: 'send-email', name: 'Send Email', description: 'Send notification email', department: 'support' },
  { id: 'approve-request', name: 'Approve Request', description: 'Approve pending request', department: 'hr' },
  { id: 'create-ticket', name: 'Create Ticket', description: 'Create support ticket', department: 'support' },
  { id: 'assign-task', name: 'Assign Task', description: 'Assign task to user', department: 'operations' },
  { id: 'send-sms', name: 'Send SMS', description: 'Send SMS notification', department: 'support' },
  { id: 'calculate-commission', name: 'Calculate Commission', description: 'Calculate sales commission', department: 'finance' },
  { id: 'schedule-meeting', name: 'Schedule Meeting', description: 'Schedule calendar meeting', department: 'hr' },
  { id: 'generate-report', name: 'Generate Report', description: 'Generate analytics report', department: 'operations' },
  { id: 'update-inventory', name: 'Update Inventory', description: 'Update stock levels', department: 'operations' },
  { id: 'process-payment', name: 'Process Payment', description: 'Process financial transaction', department: 'finance' },
  { id: 'validate-data', name: 'Validate Data', description: 'Validate input data', department: 'operations' },
  { id: 'backup-system', name: 'Backup System', description: 'Create system backup', department: 'operations' },
  { id: 'manage-leads', name: 'Manage Leads', description: 'Lead qualification process', department: 'crm' },
  { id: 'update-customer', name: 'Update Customer', description: 'Update customer information', department: 'crm' },
  { id: 'launch-campaign', name: 'Launch Campaign', description: 'Start marketing campaign', department: 'sales' },
  { id: 'analyze-performance', name: 'Analyze Performance', description: 'Performance analytics', department: 'sales' }
];

export default function WorkflowManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // 🎯 State management
  const [currentModule, setCurrentModule] = useState('workflow');
  const [activeView, setActiveView] = useState<'dashboard' | 'builder' | 'timeline' | 'teams' | 'analytics'>('dashboard');
  const [showDepartmentDialog, setShowDepartmentDialog] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<keyof typeof DEPARTMENTS | null>(null);
  const [builderView, setBuilderView] = useState<'dashboard' | 'editor'>('dashboard'); // NEW: Builder sub-view
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  
  // 🎯 Teams state management  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeamDepartment, setSelectedTeamDepartment] = useState<string>('all');
  const [selectedTeamType, setSelectedTeamType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  
  // 🎯 Real API hooks - ABILITATI
  const { data: templates = [], isLoading: templatesLoading, error: templatesError } = useWorkflowTemplates();
  const createTemplateMutation = useCreateTemplate();

  // 🎯 Teams API hooks
  const { 
    data: teams = [], 
    isLoading: teamsLoading, 
    error: teamsError 
  } = useQuery<Team[]>({
    queryKey: ['/api/teams']
  });

  // 🎯 Archive team mutation
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

  // 🎯 Teams helper functions
  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         team.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedTeamDepartment === 'all' || 
                             team.assignedDepartments.includes(selectedTeamDepartment as keyof typeof DEPARTMENTS);
    
    const matchesTeamType = selectedTeamType === 'all' || team.teamType === selectedTeamType;
    
    const matchesStatus = selectedStatus === 'all' || 
                         (selectedStatus === 'active' && team.isActive) ||
                         (selectedStatus === 'inactive' && !team.isActive);

    return matchesSearch && matchesDepartment && matchesTeamType && matchesStatus;
  });

  const handleArchiveTeam = (team: Team) => {
    archiveTeamMutation.mutate({ 
      teamId: team.id, 
      isActive: !team.isActive 
    });
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setShowCreateTeamDialog(true);
  };

  const handleCreateTeam = () => {
    setEditingTeam(null); // Reset editing state for create mode
    setShowCreateTeamDialog(true);
  };

  const handleCloseTeamModal = (open: boolean) => {
    setShowCreateTeamDialog(open);
    if (!open) {
      setEditingTeam(null); // Reset editing state when closing
    }
  };

  const formatTeamMembersCount = (team: Team) => {
    return (team.userMembers || []).length + (team.roleMembers || []).length;
  };

  // 🎯 Create new template with department selection
  const handleCreateTemplate = () => {
    setShowDepartmentDialog(true);
  };

  // 🎯 Handle department selection and proceed to builder
  const handleDepartmentSelected = async (department: keyof typeof DEPARTMENTS) => {
    setSelectedDepartment(department);
    setShowDepartmentDialog(false);
    
    // Switch to builder view with editor mode and pre-selected category
    setActiveView('builder');
    setBuilderView('editor');
    setEditingTemplateId(null); // New workflow
    
    toast({
      title: 'Department Selected',
      description: `Creating ${DEPARTMENTS[department].label} workflow template`,
    });
  };
  
  // 🎯 Handle editing existing workflow
  const handleEditWorkflow = (templateId: string) => {
    setEditingTemplateId(templateId);
    setActiveView('builder');
    setBuilderView('editor');
    
    toast({
      title: 'Opening Workflow',
      description: 'Loading workflow for editing...',
    });
  };
  
  // 🎯 Handle deleting workflow
  const handleDeleteWorkflow = (templateId: string) => {
    // TODO: Implement delete mutation
    toast({
      title: 'Delete Workflow',
      description: 'Delete functionality coming soon...',
      variant: 'destructive'
    });
  };
  
  // 🎯 Handle running workflow
  const handleRunWorkflow = (templateId: string) => {
    // TODO: Implement run workflow
    toast({
      title: 'Run Workflow',
      description: 'Workflow execution coming soon...',
    });
  };

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="h-full flex flex-col">
        {/* 🎯 WindTre Glassmorphism Header */}
        <div className="windtre-glass-panel border-b border-white/20 mb-6">
          <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Workflow className="h-6 w-6 text-windtre-orange" />
                Workflow Management
              </h1>
              <p className="text-gray-600 mt-1">Enterprise workflow automation and management</p>
            </div>
            
            {/* Actions only for main dashboard, builder has its own header */}
            {activeView !== 'builder' && (
              <div className="flex items-center gap-3">
                <Dialog open={showDepartmentDialog} onOpenChange={setShowDepartmentDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={handleCreateTemplate}
                      className="bg-windtre-orange hover:bg-windtre-orange-dark text-white"
                      data-testid="button-create-template"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Workflow
                    </Button>
                  </DialogTrigger>
                <DialogContent className="windtre-glass-panel border-white/20 max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-gray-900">
                      <Workflow className="h-5 w-5 text-windtre-orange" />
                      Select Department
                    </DialogTitle>
                    <DialogDescription className="text-gray-600">
                      Choose the department for your new workflow template. This will pre-configure the appropriate actions and triggers.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {/* Department Selection Grid */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {Object.entries(DEPARTMENTS).map(([key, dept]) => {
                      const Icon = dept.icon;
                      return (
                        <Button
                          key={key}
                          variant="outline"
                          onClick={() => handleDepartmentSelected(key as keyof typeof DEPARTMENTS)}
                          className={`h-20 flex flex-col items-center gap-2 border-white/20 hover:border-windtre-orange/50 hover:bg-white/10 transition-all duration-200`}
                          data-testid={`button-department-${key}`}
                        >
                          <Icon className={`h-6 w-6 ${dept.textColor}`} />
                          <span className="text-sm font-medium text-gray-900">{dept.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                  
                  <div className="mt-4 text-xs text-gray-500 text-center">
                    💡 You can change the department and customize actions later in the workflow builder
                  </div>
                </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
          
          {/* 🎯 Navigation Tabs */}
          <div className="flex gap-1 mt-4">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'builder', label: 'Workflow Builder', icon: Workflow },
              { id: 'timeline', label: 'Timeline', icon: FileText },
              { id: 'teams', label: 'Teams', icon: Users },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 }
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeView === tab.id ? 'default' : 'ghost'}
                onClick={() => {
                  console.log(`🔍 DEBUG: Clicking tab "${tab.id}", current activeView: "${activeView}"`);
                  setActiveView(tab.id as any);
                  console.log(`🔍 DEBUG: After click, activeView should be: "${tab.id}"`);
                }}
                className="flex items-center gap-2"
                data-testid={`button-tab-${tab.id}`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
        </div>

      {/* 🎯 Main Content */}
      <div className="flex-1 flex">
        {/* 🎯 Main Content Area - Full width */}
        <div className="flex-1 p-6">
          {activeView === 'dashboard' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Workflow Dashboard</h2>
              
              {/* 🎯 WindTre Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="windtre-glass-panel border-white/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-windtre-orange" />
                      Total Templates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-windtre-orange" data-testid="stat-total-templates">
                      {templatesLoading ? '...' : templates.length}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="windtre-glass-panel border-white/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Play className="h-4 w-4 text-windtre-purple" />
                      Active Workflows
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-windtre-purple" data-testid="stat-active-workflows">
                      {templatesLoading ? '...' : templates.filter((t: WorkflowTemplate) => t.isActive).length}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="windtre-glass-panel border-white/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Settings className="h-4 w-4 text-windtre-orange" />
                      Available Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-windtre-orange" data-testid="stat-available-actions">
                      {WORKFLOW_ACTIONS.length}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 🎯 WindTre Recent Templates */}
              <Card className="windtre-glass-panel border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-windtre-orange">
                    <Workflow className="h-5 w-5" />
                    Recent Templates
                  </CardTitle>
                  <CardDescription>Your recently created workflow templates</CardDescription>
                </CardHeader>
                <CardContent>
                  {templatesLoading ? (
                    <div className="text-center py-8">
                      <div className="text-gray-500">Loading templates...</div>
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-gray-500">No templates created yet</div>
                      <Button 
                        onClick={handleCreateTemplate}
                        className="mt-4 bg-windtre-orange hover:bg-windtre-orange-dark text-white"
                        data-testid="button-create-first-template"
                      >
                        Create Your First Template
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {templates.slice(0, 5).map((template: any) => (
                        <div 
                          key={template.id}
                          className="flex items-center justify-between p-3 windtre-glass-panel rounded-lg border-white/20"
                          data-testid={`template-item-${template.id}`}
                        >
                          <div>
                            <h4 className="font-medium text-gray-900">{template.name}</h4>
                            <p className="text-sm text-gray-600">{template.description}</p>
                          </div>
                          <Badge variant="outline">
                            {DEPARTMENTS[template.category as keyof typeof DEPARTMENTS]?.label || template.category}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeView === 'builder' && (
            <div className="h-[calc(100vh-200px)]">
              {builderView === 'dashboard' ? (
                // 🎯 NEW: Workflow Builder Dashboard
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Workflow className="h-6 w-6 text-windtre-orange" />
                        Workflow Templates
                      </h2>
                      <p className="text-gray-600 mt-1">Manage and edit your workflow automation templates</p>
                    </div>
                    
                    <Dialog open={showDepartmentDialog} onOpenChange={setShowDepartmentDialog}>
                      <DialogTrigger asChild>
                        <Button 
                          onClick={handleCreateTemplate}
                          className="bg-windtre-orange hover:bg-windtre-orange-dark text-white"
                          data-testid="button-create-new-workflow"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create New Workflow
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="windtre-glass-panel border-white/20 max-w-lg">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2 text-gray-900">
                            <Workflow className="h-5 w-5 text-windtre-orange" />
                            Select Department
                          </DialogTitle>
                          <DialogDescription className="text-gray-600">
                            Choose the department for your new workflow template. This will pre-configure the appropriate actions and triggers.
                          </DialogDescription>
                        </DialogHeader>
                        
                        {/* Department Selection Grid */}
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          {Object.entries(DEPARTMENTS).map(([key, dept]) => {
                            const Icon = dept.icon;
                            return (
                              <Button
                                key={key}
                                variant="outline"
                                onClick={() => handleDepartmentSelected(key as keyof typeof DEPARTMENTS)}
                                className={`h-20 flex flex-col items-center gap-2 border-white/20 hover:border-windtre-orange/50 hover:bg-white/10 transition-all duration-200`}
                                data-testid={`button-department-${key}`}
                              >
                                <Icon className={`h-6 w-6 ${dept.textColor}`} />
                                <span className="text-sm font-medium text-gray-900">{dept.label}</span>
                              </Button>
                            );
                          })}
                        </div>
                        
                        <div className="mt-4 text-xs text-gray-500 text-center">
                          💡 You can change the department and customize actions later in the workflow builder
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {/* 🎯 Workflow Templates Data Table */}
                  <Card className="windtre-glass-panel border-white/20">
                    <CardContent className="p-0">
                      {templatesLoading ? (
                        <div className="flex items-center justify-center h-48">
                          <div className="text-gray-500">Loading workflows...</div>
                        </div>
                      ) : templates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48">
                          <Workflow className="h-12 w-12 text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows yet</h3>
                          <p className="text-gray-600 mb-4">Create your first workflow to get started</p>
                          <Button 
                            onClick={handleCreateTemplate}
                            className="bg-windtre-orange hover:bg-windtre-orange-dark text-white"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create First Workflow
                          </Button>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="border-gray-200">
                              <TableHead className="font-semibold text-gray-900">Name</TableHead>
                              <TableHead className="font-semibold text-gray-900">Department</TableHead>
                              <TableHead className="font-semibold text-gray-900">Created By</TableHead>
                              <TableHead className="font-semibold text-gray-900">Created Date</TableHead>
                              <TableHead className="font-semibold text-gray-900">Status</TableHead>
                              <TableHead className="font-semibold text-gray-900 w-24">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {templates.map((template: any) => {
                              const dept = DEPARTMENTS[template.category as keyof typeof DEPARTMENTS];
                              return (
                                <TableRow key={template.id} className="border-gray-100 hover:bg-gray-50/50">
                                  <TableCell>
                                    <div>
                                      <div className="font-medium text-gray-900">{template.name}</div>
                                      <div className="text-sm text-gray-600">{template.description}</div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant="outline" 
                                      className={`${dept?.textColor} border-current`}
                                    >
                                      {dept?.label || template.category}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-gray-600">
                                    {template.createdBy || 'System'}
                                  </TableCell>
                                  <TableCell className="text-gray-600">
                                    {new Date(template.createdAt || Date.now()).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={template.isActive ? 'default' : 'secondary'}>
                                      {template.isActive ? 'Active' : 'Draft'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditWorkflow(template.id)}
                                        data-testid={`button-edit-${template.id}`}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRunWorkflow(template.id)}
                                        data-testid={`button-run-${template.id}`}
                                      >
                                        <Play className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteWorkflow(template.id)}
                                        data-testid={`button-delete-${template.id}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                // 🎯 EXISTING: Workflow Builder Editor
                <div className="h-full">
                  {/* Editor Header */}
                  <div className="flex items-center justify-between mb-4 px-6 py-3 bg-white border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setBuilderView('dashboard');
                          setEditingTemplateId(null);
                          setSelectedDepartment(null);
                        }}
                        data-testid="button-back-to-dashboard"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Workflows
                      </Button>
                      <div className="h-4 w-px bg-gray-300" />
                      <h3 className="font-semibold text-gray-900">
                        {editingTemplateId ? 'Edit Workflow' : 'New Workflow'}
                      </h3>
                    </div>
                  </div>
                  
                  <WorkflowBuilder
                    templateId={editingTemplateId || undefined}
                    initialCategory={selectedDepartment || undefined}
                    onSave={(workflow) => {
                      console.log('Workflow saved:', workflow);
                      toast({
                        title: 'Workflow Saved',
                        description: `Workflow with ${workflow.nodes.length} nodes saved successfully.`,
                      });
                      // Return to dashboard after save
                      setBuilderView('dashboard');
                      setEditingTemplateId(null);
                      setSelectedDepartment(null);
                    }}
                    onClose={() => {
                      setBuilderView('dashboard');
                      setEditingTemplateId(null);
                      setSelectedDepartment(null);
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {activeView === 'timeline' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <FileText className="h-6 w-6 text-windtre-orange" />
                Workflow Timeline
              </h2>
              
              {/* Timeline with real workflow execution history */}
              <div className="space-y-6">
                {/* Timeline Header */}
                <Card className="windtre-glass-panel border-white/20">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-windtre-orange" />
                        Execution History
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Filter
                        </Button>
                        <Button variant="outline" size="sm">
                          Export
                        </Button>
                      </div>
                    </CardTitle>
                    <CardDescription>Real-time workflow execution timeline and activity feed</CardDescription>
                  </CardHeader>
                </Card>

                {/* Timeline Content */}
                <Card className="windtre-glass-panel border-white/20">
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {/* Sample timeline entries - Connect to real data later */}
                      {[
                        {
                          id: '1',
                          time: '2 hours ago',
                          type: 'template_created',
                          title: 'New Template Created',
                          description: 'Sales approval workflow template created by Admin User',
                          department: 'sales',
                          status: 'completed'
                        },
                        {
                          id: '2', 
                          time: '4 hours ago',
                          type: 'workflow_executed',
                          title: 'Workflow Execution Started',
                          description: 'Employee onboarding workflow triggered for new hire',
                          department: 'hr',
                          status: 'running'
                        },
                        {
                          id: '3',
                          time: '6 hours ago', 
                          type: 'approval_pending',
                          title: 'Approval Required',
                          description: 'Purchase order exceeds threshold, requires manager approval',
                          department: 'finance',
                          status: 'pending'
                        },
                        {
                          id: '4',
                          time: '1 day ago',
                          type: 'workflow_completed',
                          title: 'Workflow Completed',
                          description: 'Customer support ticket resolution workflow finished',
                          department: 'support',
                          status: 'completed'
                        }
                      ].map((entry) => {
                        const dept = DEPARTMENTS[entry.department as keyof typeof DEPARTMENTS];
                        return (
                          <div key={entry.id} className="flex gap-4" data-testid={`timeline-entry-${entry.id}`}>
                            {/* Timeline dot */}
                            <div className="flex flex-col items-center">
                              <div className={`w-3 h-3 rounded-full ${
                                entry.status === 'completed' ? 'bg-green-500' :
                                entry.status === 'running' ? 'bg-windtre-orange' :
                                entry.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-300'
                              }`} />
                              <div className="w-0.5 h-12 bg-gray-200" />
                            </div>
                            
                            {/* Timeline content */}
                            <div className="flex-1 windtre-glass-panel p-4 rounded-lg border-white/20">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-medium text-gray-900">{entry.title}</h4>
                                    <Badge variant="outline" className={`text-xs ${dept.textColor}`}>
                                      {dept.label}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">{entry.description}</p>
                                  <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span>{entry.time}</span>
                                    <span className={`font-medium ${
                                      entry.status === 'completed' ? 'text-green-600' :
                                      entry.status === 'running' ? 'text-windtre-orange' :
                                      entry.status === 'pending' ? 'text-yellow-600' : 'text-gray-500'
                                    }`}>
                                      {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                                    </span>
                                  </div>
                                </div>
                                <dept.icon className={`h-5 w-5 ${dept.textColor}`} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Live Activity Feed */}
                <Card className="windtre-glass-panel border-white/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Live Activity Feed
                    </CardTitle>
                    <CardDescription>Real-time workflow system activity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {[
                          'System health check completed successfully',
                          'Template validation passed for "Customer Onboarding"',
                          'AI routing engine synchronized with latest rules',
                          'Notification service processed 24 messages',
                          'Database connection pool optimized'
                        ].map((activity, index) => (
                          <div key={index} className="flex items-center gap-3 text-sm">
                            <div className="w-1.5 h-1.5 bg-windtre-orange rounded-full" />
                            <span className="text-gray-600">{activity}</span>
                            <span className="text-xs text-gray-400 ml-auto">
                              {Math.floor(Math.random() * 5) + 1}m ago
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeView === 'teams' && (
            <div>
              {/* 🎯 Teams Page Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="h-6 w-6 text-windtre-purple" />
                    Team Management
                  </h2>
                  <p className="text-gray-600 mt-1">Manage enterprise teams and workflow assignments</p>
                </div>
                
                <Button 
                  onClick={handleCreateTeam}
                  className="bg-windtre-orange hover:bg-windtre-orange-dark text-white"
                  data-testid="button-create-team"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Team
                </Button>
              </div>

              {/* 🎯 Teams Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <Card className="windtre-glass-panel border-white/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Users className="h-4 w-4 text-windtre-purple" />
                      Total Teams
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-windtre-purple" data-testid="stat-total-teams">
                      {teamsLoading ? '...' : teams.length}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="windtre-glass-panel border-white/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Active Teams
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600" data-testid="stat-active-teams">
                      {teamsLoading ? '...' : teams.filter(t => t.isActive).length}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="windtre-glass-panel border-white/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-windtre-orange" />
                      Total Members
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-windtre-orange" data-testid="stat-total-members">
                      {teamsLoading ? '...' : teams.reduce((acc, team) => acc + formatTeamMembersCount(team), 0)}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="windtre-glass-panel border-white/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-windtre-purple" />
                      Departments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-windtre-purple" data-testid="stat-departments">
                      {Object.keys(DEPARTMENTS).length}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 🎯 Teams Filters */}
              <Card className="windtre-glass-panel border-white/20 mb-6">
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-64">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="Search teams by name or description..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                          data-testid="input-search-teams"
                        />
                      </div>
                    </div>
                    
                    {/* Department Filter */}
                    <Select value={selectedTeamDepartment} onValueChange={setSelectedTeamDepartment}>
                      <SelectTrigger className="w-48" data-testid="select-department-filter">
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {Object.entries(DEPARTMENTS).map(([key, dept]) => (
                          <SelectItem key={key} value={key}>
                            {dept.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Team Type Filter */}
                    <Select value={selectedTeamType} onValueChange={setSelectedTeamType}>
                      <SelectTrigger className="w-48" data-testid="select-team-type-filter">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {Object.entries(TEAM_TYPES).map(([key, type]) => (
                          <SelectItem key={key} value={key}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Status Filter */}
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="w-32" data-testid="select-status-filter">
                        <SelectValue placeholder="All Status" />
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

              {/* 🎯 Teams Data Table */}
              <Card className="windtre-glass-panel border-white/20">
                <CardContent className="p-0">
                  {teamsLoading ? (
                    <div className="flex items-center justify-center h-48">
                      <div className="text-gray-500">Loading teams...</div>
                    </div>
                  ) : teams.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48">
                      <Users className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No teams yet</h3>
                      <p className="text-gray-600 mb-4">Create your first team to get started</p>
                      <Button 
                        onClick={handleCreateTeam}
                        className="bg-windtre-orange hover:bg-windtre-orange-dark text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Team
                      </Button>
                    </div>
                  ) : filteredTeams.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48">
                      <Filter className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No teams match your filters</h3>
                      <p className="text-gray-600">Try adjusting your search criteria</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-200">
                          <TableHead className="font-semibold text-gray-900">Team</TableHead>
                          <TableHead className="font-semibold text-gray-900">Type</TableHead>
                          <TableHead className="font-semibold text-gray-900">Departments</TableHead>
                          <TableHead className="font-semibold text-gray-900">Members</TableHead>
                          <TableHead className="font-semibold text-gray-900">Supervisor</TableHead>
                          <TableHead className="font-semibold text-gray-900">Status</TableHead>
                          <TableHead className="font-semibold text-gray-900 w-24">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTeams.map((team) => (
                          <TableRow key={team.id} className="border-gray-100 hover:bg-gray-50/50" data-testid={`team-row-${team.id}`}>
                            <TableCell>
                              <div>
                                <div className="font-medium text-gray-900">{team.name}</div>
                                <div className="text-sm text-gray-600">{team.description}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={TEAM_TYPES[team.teamType]?.color}>
                                {TEAM_TYPES[team.teamType]?.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(team.assignedDepartments || []).map((dept) => {
                                  const deptInfo = DEPARTMENTS[dept];
                                  return (
                                    <Badge 
                                      key={dept} 
                                      variant="outline" 
                                      className={`text-xs ${deptInfo?.textColor} border-current`}
                                    >
                                      {deptInfo?.label}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <UserPlus className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                  {formatTeamMembersCount(team)} members
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {team.primarySupervisor ? (
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4 text-windtre-purple" />
                                  <span className="text-sm text-gray-600">
                                    {team.primarySupervisor}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">No supervisor</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={team.isActive ? 'default' : 'secondary'}>
                                {team.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditTeam(team)}
                                  data-testid={`button-edit-team-${team.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleArchiveTeam(team)}
                                  data-testid={`button-archive-team-${team.id}`}
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* 🎯 Create/Edit Team Modal */}
              <CreateTeamModal 
                open={showCreateTeamDialog}
                onOpenChange={handleCloseTeamModal}
                editTeam={editingTeam}
              />
            </div>
          )}

          {activeView === 'analytics' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-windtre-orange" />
                Workflow Analytics
              </h2>
              <Card className="windtre-glass-panel border-white/20">
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-windtre-orange mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">Analytics Dashboard</h3>
                    <p className="text-gray-600">View workflow performance metrics</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
      </div>
    </Layout>
  );
}