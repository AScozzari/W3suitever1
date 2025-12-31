/**
 * 🏗️ WORKFLOW MANAGEMENT PAGE - WindTre Design System
 * 
 * Enterprise workflow automation with WindTre glassmorphism design
 * Follows project design standards and UI consistency
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useTenant } from '@/contexts/TenantContext';
import { useTenantNavigation } from '@/hooks/useTenantNavigation';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useWorkflowTemplates, useCreateTemplate, WorkflowTemplate } from '../hooks/useWorkflowTemplates';
import { useWorkflowDashboardMetrics, useWorkflowTimeline, useWorkflowAnalytics } from '../hooks/useWorkflowDashboard';
import WorkflowBuilder from '../components/WorkflowBuilder';
import { QueueMetricsPanel, WorkflowExecutionDrawer, WorkflowAnalyticsDashboard } from '@/components/workflow';
import MCPSettingsDashboard from './settings/MCPSettingsDashboard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CreateTeamModal from '../components/CreateTeamModal';
import { WorkflowTestResultDialog } from '../components/WorkflowTestResultDialog';
import { getActionTagLabel } from '@/lib/action-tags';
import '../styles/workflow-builder.css';
import { ActionManagementContent } from './ActionManagementPage';
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
  XCircle,
  Activity,
  AlertTriangle,
  Tags,
  Info,
  Eye
} from 'lucide-react';
import { DEPARTMENT_STYLES, TEAM_TYPES, getDepartmentStyle } from '@/lib/constants/departments';

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
  assignedDepartments: (keyof typeof DEPARTMENT_STYLES)[];
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  // Enriched fields from API
  memberCount?: number;
  primarySupervisorName?: string;
  secondarySupervisorName?: string;
  departments?: Array<{ id: string; name: string; code: string }>;
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

interface WorkflowManagementPageProps {
  defaultView?: 'dashboard' | 'builder' | 'timeline' | 'teams' | 'analytics' | 'settings';
}

export default function WorkflowManagementPage({ defaultView = 'dashboard' }: WorkflowManagementPageProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  const { navigateTo } = useTenantNavigation();
  
  // 🎯 State management
  const [currentModule, setCurrentModule] = useState('workflow');
  const [activeView, setActiveView] = useState<'dashboard' | 'builder' | 'timeline' | 'teams' | 'analytics' | 'queue' | 'settings'>(defaultView);
  const [showDepartmentDialog, setShowDepartmentDialog] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<keyof typeof DEPARTMENT_STYLES | null>(null);
  const [builderView, setBuilderView] = useState<'dashboard' | 'editor'>('dashboard'); // NEW: Builder sub-view
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  
  // 🔄 Queue monitoring state
  const [showExecutionDrawer, setShowExecutionDrawer] = useState(false);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [selectedInstanceName, setSelectedInstanceName] = useState<string>('');
  
  // 🎯 Teams state management  
  const [teamsSubView, setTeamsSubView] = useState<'list' | 'coverage' | 'actions'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeamDepartment, setSelectedTeamDepartment] = useState<string>('all');
  const [selectedTeamType, setSelectedTeamType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [selectedTeamForWorkflows, setSelectedTeamForWorkflows] = useState<Team | null>(null);
  
  // 🧪 Workflow test state
  const [testRunResult, setTestRunResult] = useState<any | null>(null);
  const [isRunningTest, setIsRunningTest] = useState(false);
  
  // 🎯 Real API hooks - ABILITATI
  const { data: templates = [], isLoading: templatesLoading, error: templatesError } = useWorkflowTemplates();
  const createTemplateMutation = useCreateTemplate();

  // 🎯 Dashboard, Timeline & Analytics hooks - DATI REALI
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError } = useWorkflowDashboardMetrics();
  const { data: timelineData, isLoading: timelineLoading, error: timelineError } = useWorkflowTimeline({ limit: 20 });
  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError } = useWorkflowAnalytics({ period: 30 });

  // 🎯 Teams API hooks
  const { 
    data: teams = [], 
    isLoading: teamsLoading, 
    error: teamsError 
  } = useQuery<Team[]>({
    queryKey: ['/api/teams']
  });

  // 🎯 Coverage Dashboard API hooks - NEW 3-LEVEL STRUCTURE
  // Note: queryClient auto-unwraps response.data, so we type the inner data directly
  const { 
    data: coverageData, 
    isLoading: coverageLoading,
    refetch: refetchCoverage 
  } = useQuery<{
    summary: {
      overallHealth: 'critical' | 'warning' | 'healthy';
      level1: {
        name: string;
        description: string;
        totalDepartments: number;
        coveredDepartments: number;
        uncoveredDepartments: number;
        status: 'ok' | 'warning' | 'critical';
      };
      level2: {
        name: string;
        description: string;
        totalDepartments: number;
        fullyConfigured: number;
        partiallyConfigured: number;
        notConfigured: number;
        status: 'ok' | 'warning' | 'critical';
      };
      level3: {
        name: string;
        description: string;
        totalUsers: number;
        usersWithIssues: number;
        usersOk: number;
        status: 'ok' | 'warning' | 'critical';
      };
    };
    level1: Array<{
      department: string;
      departmentLabel: string;
      hasTeams: boolean;
      teamCount: number;
      teams: Array<{ id: string; name: string; memberCount: number }>;
      status: 'ok' | 'warning' | 'critical';
    }>;
    level2: Array<{
      department: string;
      departmentLabel: string;
      hasWorkflows: boolean;
      workflowCount: number;
      workflows: Array<{
        id: string;
        name: string;
        actionTags: Array<{ value: string; label: string }>;
        customAction?: string;
      }>;
      actionTags: {
        expected: Array<{ value: string; label: string }>;
        covered: Array<{ value: string; label: string }>;
        missing: Array<{ value: string; label: string }>;
        customActions: string[];
        coveragePercent: number;
      };
      status: 'ok' | 'warning' | 'critical';
    }>;
    level3: {
      totalUsers: number;
      usersWithFullCoverage: number;
      usersWithPartialCoverage: number;
      orphanUsers: Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        coveredDepartments: string[];
        missingDepartments: string[];
      }>;
      departmentBreakdown: Array<{
        department: string;
        departmentLabel: string;
        usersWithCoverage: number;
        usersWithoutCoverage: number;
        coveragePercent: number;
        isCritical: boolean;
      }>;
    };
  }>({
    queryKey: ['/api/admin/coverage-dashboard'],
    enabled: activeView === 'teams' && teamsSubView === 'coverage'
  });

  // 🎯 Orphan Users API hooks
  const { 
    data: orphanUsersData, 
    isLoading: orphanUsersLoading 
  } = useQuery<{
    success: boolean;
    data: {
      summary: {
        totalUsers: number;
        orphanUsers: number;
        usersWithMissingCritical: number;
      };
      orphanUsers: Array<{ id: string; name: string; email: string; role: string }>;
      usersWithMissingCoverage: Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        coveredDepartments: string[];
        missingCriticalDepartments: string[];
        isOrphan: boolean;
      }>;
      departmentBreakdown: Array<{
        department: string;
        departmentLabel: string;
        coveredUsersCount: number;
        uncoveredUsersCount: number;
        coveragePercent: number;
        isCritical: boolean;
      }>;
    };
  }>({
    queryKey: ['/api/admin/orphan-users'],
    enabled: activeView === 'teams' && teamsSubView === 'coverage'
  });

  // 🎯 Team Workflow Assignments - carica gli assignments esistenti per il team selezionato
  const { 
    data: teamAssignments = [], 
    isLoading: assignmentsLoading 
  } = useQuery<Array<{
    id: string;
    teamId: string;
    templateId: string;
    forDepartment: string;
    autoAssign: boolean;
    priority: number;
    conditions: Record<string, any>;
    isActive: boolean;
  }>>({
    queryKey: ['/api/team-workflow-assignments', { tenantId: currentTenant?.id }],
    enabled: showWorkflowModal && !!selectedTeamForWorkflows && !!currentTenant?.id
  });

  // 🎯 Calcola gli actionTags già coperti per il team selezionato per ogni dipartimento
  const getCoveredActionTagsForDepartment = (department: string): { templateId: string; templateName: string; actionTags: string[] }[] => {
    if (!selectedTeamForWorkflows || !teamAssignments.length) return [];
    
    // Filtra gli assignments per questo team e dipartimento
    const deptAssignments = teamAssignments.filter(a => 
      a.teamId === selectedTeamForWorkflows.id && 
      a.forDepartment === department &&
      a.isActive
    );
    
    // Per ogni assignment, trova il template e i suoi actionTags
    return deptAssignments.map(assignment => {
      const template = templates.find((t: any) => t.id === assignment.templateId);
      return {
        templateId: assignment.templateId,
        templateName: template?.name || 'Unknown',
        actionTags: template?.actionTags || []
      };
    }).filter(item => item.actionTags.length > 0);
  };

  // 🎯 Verifica se un workflow è già assegnato al team per quel dipartimento
  const isWorkflowAssigned = (templateId: string, department: string): boolean => {
    if (!selectedTeamForWorkflows || !teamAssignments.length) return false;
    return teamAssignments.some(a => 
      a.teamId === selectedTeamForWorkflows.id && 
      a.templateId === templateId &&
      a.forDepartment === department &&
      a.isActive
    );
  };

  // 🎯 Trova conflitti di actionTags per un workflow
  const findActionTagConflicts = (templateActionTags: string[], department: string, excludeTemplateId?: string): { 
    hasConflict: boolean; 
    conflicts: Array<{ tag: string; conflictingTemplate: string }> 
  } => {
    const coveredTemplates = getCoveredActionTagsForDepartment(department);
    const conflicts: Array<{ tag: string; conflictingTemplate: string }> = [];
    
    for (const templateAction of templateActionTags) {
      for (const covered of coveredTemplates) {
        if (excludeTemplateId && covered.templateId === excludeTemplateId) continue;
        if (covered.actionTags.includes(templateAction)) {
          conflicts.push({
            tag: templateAction,
            conflictingTemplate: covered.templateName
          });
        }
      }
    }
    
    return {
      hasConflict: conflicts.length > 0,
      conflicts
    };
  };

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
                             team.assignedDepartments.includes(selectedTeamDepartment as keyof typeof DEPARTMENT_STYLES);
    
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

  const handleManageWorkflows = (team: Team) => {
    setSelectedTeamForWorkflows(team);
    setShowWorkflowModal(true);
  };

  const handleCloseWorkflowModal = () => {
    setShowWorkflowModal(false);
    setSelectedTeamForWorkflows(null);
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
    // Use memberCount from API, fallback to legacy calculation
    return team.memberCount ?? ((team.userMembers || []).length + (team.roleMembers || []).length);
  };

  // 🎯 Create new template with department selection
  const handleCreateTemplate = () => {
    setShowDepartmentDialog(true);
  };

  // 🎯 Handle department selection and proceed to builder
  const handleDepartmentSelected = async (department: keyof typeof DEPARTMENT_STYLES) => {
    setSelectedDepartment(department);
    setShowDepartmentDialog(false);
    
    // Switch to builder view with editor mode and pre-selected category
    setActiveView('builder');
    setBuilderView('editor');
    setEditingTemplateId(null); // New workflow
    
    toast({
      title: 'Department Selected',
      description: `Creating ${DEPARTMENT_STYLES[department].label} workflow template`,
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
  
  // 🎯 Handle running workflow test
  const handleRunWorkflow = async (templateId: string) => {
    console.log('🎯 handleRunWorkflow called with templateId:', templateId);
    setIsRunningTest(true);
    setTestRunResult(null);

    try {
      // Get template data
      const template = templates.find((t: WorkflowTemplate) => t.id === templateId);
      if (!template) {
        console.error('❌ Template not found:', templateId);
        toast({
          title: 'Error',
          description: 'Template not found',
          variant: 'destructive',
        });
        setIsRunningTest(false);
        return;
      }

      // Get workflow data - templates have nodes/edges directly from database
      const nodes = template.nodes || [];
      const edges = template.edges || [];
      
      console.log('📊 Workflow data:', { nodes: nodes.length, edges: edges.length, template });

      // Call test-run endpoint
      const response = await fetch('/api/workflows/test-run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': currentTenant?.id || '',
          'X-Auth-Session': 'authenticated',
        },
        credentials: 'include',
        body: JSON.stringify({
          nodes: nodes,
          edges: edges,
          testName: template.name
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Test run completed:', result);
        setTestRunResult(result);
      } else {
        console.error('❌ Test run failed:', result);
        setTestRunResult({ 
          success: false, 
          error: result.error || 'Test run failed',
          message: result.message,
          data: result.data || {}
        });
      }
    } catch (error: any) {
      console.error('❌ Test run request failed:', error);
      setTestRunResult({ 
        success: false, 
        error: 'Network error',
        message: error.message || 'Failed to connect to server',
        data: {}
      });
    } finally {
      setIsRunningTest(false);
    }
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
                <DialogContent className="department-selection-modal windtre-glass-panel border-white/20 max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-gray-900">
                      <Workflow className="h-5 w-5 text-windtre-orange" />
                      Seleziona Dipartimento
                    </DialogTitle>
                    <DialogDescription className="text-gray-600">
                      Scegli il dipartimento per il tuo nuovo template workflow. Questo preconfigurerà le azioni e trigger appropriati.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {/* Department Selection Grid */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {Object.entries(DEPARTMENT_STYLES).map(([key, dept]) => {
                      const Icon = dept.icon;
                      return (
                        <Button
                          key={key}
                          variant="outline"
                          onClick={() => handleDepartmentSelected(key as keyof typeof DEPARTMENT_STYLES)}
                          className={`h-20 flex flex-col items-center gap-2 transition-all duration-200 pointer-events-auto ${
                            key === 'hr' || key === 'sales' || key === 'support'
                              ? 'bg-windtre-purple/10 border-windtre-purple/30 hover:bg-windtre-purple/20 hover:border-windtre-purple/50'
                              : 'bg-windtre-orange/10 border-windtre-orange/30 hover:bg-windtre-orange/20 hover:border-windtre-orange/50'
                          }`}
                          data-testid={`button-department-${key}`}
                        >
                          <Icon className={`h-6 w-6 ${dept.textColor}`} />
                          <span className="text-sm font-medium text-gray-900">{dept.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                  
                  <div className="mt-4 text-xs text-gray-500 text-center">
                    💡 Puoi cambiare il dipartimento e personalizzare le azioni successivamente nel workflow builder
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
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              { id: 'queue', label: 'Queue Monitor', icon: Activity },
              { id: 'settings', label: 'MCP Settings', icon: Settings }
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeView === tab.id ? 'default' : 'ghost'}
                onClick={() => {
                  setActiveView(tab.id as any);
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
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Dashboard Workflow</h2>
              
              {dashboardError && (
                <Card className="mb-6 border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="text-red-800">
                      Errore nel caricamento dei dati dashboard. Verifica la connessione al server.
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* 🎯 Metriche Principali - Dati Reali dal Database */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card className="windtre-glass-panel border-white/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-windtre-orange" />
                      Templates Totali
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-windtre-orange" data-testid="stat-total-templates">
                      {dashboardLoading ? '...' : dashboardData?.summary.totalTemplates || 0}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Attivi: {dashboardLoading ? '...' : dashboardData?.summary.activeTemplates || 0}
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="windtre-glass-panel border-white/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Play className="h-4 w-4 text-windtre-purple" />
                      Istanze Totali
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-windtre-purple" data-testid="stat-total-instances">
                      {dashboardLoading ? '...' : dashboardData?.summary.totalInstances || 0}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      In esecuzione: {dashboardLoading ? '...' : dashboardData?.summary.runningInstances || 0}
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="windtre-glass-panel border-white/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Completate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600" data-testid="stat-completed-instances">
                      {dashboardLoading ? '...' : dashboardData?.summary.completedInstances || 0}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Successi workflow
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="windtre-glass-panel border-white/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      Fallite
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600" data-testid="stat-failed-instances">
                      {dashboardLoading ? '...' : dashboardData?.summary.failedInstances || 0}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Errori da risolvere
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* 🎯 Templates per Categoria e Top Templates */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                
                {/* Templates per Categoria */}
                <Card className="windtre-glass-panel border-white/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-windtre-orange">
                      <BarChart3 className="h-5 w-5" />
                      Templates per Dipartimento
                    </CardTitle>
                    <CardDescription>Distribuzione per categoria aziendale</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dashboardLoading ? (
                      <div className="text-center py-8">
                        <div className="text-gray-500">Caricamento statistiche...</div>
                      </div>
                    ) : dashboardData?.templatesByCategory && dashboardData.templatesByCategory.length > 0 ? (
                      <div className="space-y-3">
                        {dashboardData.templatesByCategory.map((categoryData, index) => (
                          <div 
                            key={categoryData.category}
                            className="flex items-center justify-between p-3 windtre-glass-panel rounded-lg border-white/20"
                            data-testid={`category-stat-${categoryData.category}`}
                          >
                            <div className="flex items-center gap-3">
                              {DEPARTMENT_STYLES[categoryData.category as keyof typeof DEPARTMENT_STYLES] && (() => {
                                const dept = DEPARTMENT_STYLES[categoryData.category as keyof typeof DEPARTMENT_STYLES];
                                const Icon = dept.icon;
                                return (
                                  <div className={`p-2 rounded-lg ${dept.color} opacity-20`}>
                                    <Icon className={`h-4 w-4 ${dept.textColor}`} />
                                  </div>
                                );
                              })()}
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {DEPARTMENT_STYLES[categoryData.category as keyof typeof DEPARTMENT_STYLES]?.label || categoryData.category}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {categoryData.active} attivi di {categoryData.total} totali
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="font-bold">
                              {categoryData.total}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-500">Nessun template per categoria trovato</div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Top Templates */}
                <Card className="windtre-glass-panel border-white/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-windtre-purple">
                      <Workflow className="h-5 w-5" />
                      Templates Più Utilizzati
                    </CardTitle>
                    <CardDescription>Ordinati per numero di istanze create</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dashboardLoading ? (
                      <div className="text-center py-8">
                        <div className="text-gray-500">Caricamento templates...</div>
                      </div>
                    ) : dashboardData?.topTemplates && dashboardData.topTemplates.length > 0 ? (
                      <div className="space-y-3">
                        {dashboardData.topTemplates.slice(0, 5).map((template, index) => (
                          <div 
                            key={template.id}
                            className="flex items-center justify-between p-3 windtre-glass-panel rounded-lg border-white/20"
                            data-testid={`top-template-${template.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 bg-windtre-orange bg-opacity-20 rounded-full">
                                <span className="text-sm font-bold text-windtre-orange">#{index + 1}</span>
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{template.name}</h4>
                                <p className="text-sm text-gray-600">
                                  {template.instanceCount} istanze • {DEPARTMENT_STYLES[template.category as keyof typeof DEPARTMENT_STYLES]?.label || template.category}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline">
                              {template.usageCount} usi
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-500">Nessun template utilizzato ancora</div>
                        <Button 
                          onClick={handleCreateTemplate}
                          className="mt-4 bg-windtre-orange hover:bg-windtre-orange-dark text-white"
                          data-testid="button-create-first-template"
                        >
                          Crea il Primo Template
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* 🎯 Attività Recente */}
              <Card className="windtre-glass-panel border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-windtre-orange">
                    <Calendar className="h-5 w-5" />
                    Attività Recente (Ultimi 7 giorni)
                  </CardTitle>
                  <CardDescription>Istanze di workflow avviate recentemente</CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboardLoading ? (
                    <div className="text-center py-8">
                      <div className="text-gray-500">Caricamento attività...</div>
                    </div>
                  ) : dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 ? (
                    <div className="space-y-3">
                      {dashboardData.recentActivity.map((activity, index) => (
                        <div 
                          key={activity.date}
                          className="flex items-center justify-between p-3 windtre-glass-panel rounded-lg border-white/20"
                          data-testid={`recent-activity-${activity.date}`}
                        >
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {new Date(activity.date).toLocaleDateString('it-IT', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {activity.instancesStarted} istanze avviate
                            </p>
                          </div>
                          <Badge variant="outline">
                            {activity.instancesStarted}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-500">Nessuna attività recente</div>
                      <p className="text-sm text-gray-400 mt-1">Le nuove istanze di workflow appariranno qui</p>
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
                      <DialogContent className="department-selection-modal windtre-glass-panel border-white/20 max-w-lg">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2 text-gray-900">
                            <Workflow className="h-5 w-5 text-windtre-orange" />
                            Seleziona Dipartimento
                          </DialogTitle>
                          <DialogDescription className="text-gray-600">
                            Scegli il dipartimento per il tuo nuovo template workflow. Questo preconfigurerà le azioni e trigger appropriati.
                          </DialogDescription>
                        </DialogHeader>
                        
                        {/* Department Selection Grid */}
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          {Object.entries(DEPARTMENT_STYLES).map(([key, dept]) => {
                            const Icon = dept.icon;
                            return (
                              <Button
                                key={key}
                                variant="outline"
                                onClick={() => handleDepartmentSelected(key as keyof typeof DEPARTMENT_STYLES)}
                                className={`h-20 flex flex-col items-center gap-2 transition-all duration-200 pointer-events-auto ${
                            key === 'hr' || key === 'sales' || key === 'support'
                              ? 'bg-windtre-purple/10 border-windtre-purple/30 hover:bg-windtre-purple/20 hover:border-windtre-purple/50'
                              : 'bg-windtre-orange/10 border-windtre-orange/30 hover:bg-windtre-orange/20 hover:border-windtre-orange/50'
                          }`}
                                data-testid={`button-department-${key}`}
                              >
                                <Icon className={`h-6 w-6 ${dept.textColor}`} />
                                <span className="text-sm font-medium text-gray-900">{dept.label}</span>
                              </Button>
                            );
                          })}
                        </div>
                        
                        <div className="mt-4 text-xs text-gray-500 text-center">
                          💡 Puoi cambiare il dipartimento e personalizzare le azioni successivamente nel workflow builder
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
                              <TableHead className="font-semibold text-gray-900">Nome</TableHead>
                              <TableHead className="font-semibold text-gray-900">Categoria</TableHead>
                              <TableHead className="font-semibold text-gray-900">Dipartimento</TableHead>
                              <TableHead className="font-semibold text-gray-900">Creato Da</TableHead>
                              <TableHead className="font-semibold text-gray-900">Data Creazione</TableHead>
                              <TableHead className="font-semibold text-gray-900">Stato</TableHead>
                              <TableHead className="font-semibold text-gray-900 w-24">Azioni</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {templates.map((template: any) => {
                              // 🎯 Map categoria a colore
                              const getCategoryColor = (category: string) => {
                                const colors = {
                                  'approval': 'text-blue-600 bg-blue-50 border-blue-200',
                                  'automation': 'text-green-600 bg-green-50 border-green-200',
                                  'hr': 'text-purple-600 bg-purple-50 border-purple-200',
                                  'sales': 'text-orange-600 bg-orange-50 border-orange-200',
                                  'support': 'text-red-600 bg-red-50 border-red-200',
                                  'test': 'text-gray-600 bg-gray-50 border-gray-200'
                                };
                                return colors[category as keyof typeof colors] || 'text-gray-600 bg-gray-50 border-gray-200';
                              };
                              
                              // 🎯 Map dipartimento reale dal database (for_department o fallback)
                              const getDepartmentLabel = (forDepartment: string, category: string) => {
                                if (forDepartment) return forDepartment;
                                // Fallback ai dipartimenti mappati dalle categorie
                                const dept = DEPARTMENT_STYLES[category as keyof typeof DEPARTMENT_STYLES];
                                return dept?.label || 'Non Assegnato';
                              };
                              
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
                                      className={getCategoryColor(template.category)}
                                    >
                                      {template.category.toUpperCase()}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant="outline" 
                                      className="text-windtre-orange border-windtre-orange/30 bg-windtre-orange/5"
                                    >
                                      {getDepartmentLabel(template.forDepartment, template.category)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-gray-600">
                                    {template.createdBy || 'Sistema'}
                                  </TableCell>
                                  <TableCell className="text-gray-600">
                                    {new Date(template.createdAt || Date.now()).toLocaleDateString('it-IT')}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={template.isActive ? 'default' : 'secondary'}>
                                      {template.isActive ? 'Attivo' : 'Bozza'}
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
                                        className="hover:bg-green-50"
                                        data-testid={`button-run-${template.id}`}
                                      >
                                        <Play className="h-4 w-4 text-green-600" />
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
                Cronologia Workflow
              </h2>
              
              {timelineError && (
                <Card className="mb-6 border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="text-red-800">
                      Errore nel caricamento della cronologia. Verifica la connessione al server.
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Timeline with real workflow execution history */}
              <div className="space-y-6">
                {/* Timeline Header */}
                <Card className="windtre-glass-panel border-white/20">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-windtre-orange" />
                        Cronologia Esecuzioni
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Filter className="h-4 w-4 mr-2" />
                          Filtra
                        </Button>
                        <Button variant="outline" size="sm">
                          <Archive className="h-4 w-4 mr-2" />
                          Esporta
                        </Button>
                      </div>
                    </CardTitle>
                    <CardDescription>Cronologia in tempo reale delle esecuzioni workflow e feed attività</CardDescription>
                  </CardHeader>
                </Card>

                {/* Timeline Content - DATI REALI DAL DATABASE */}
                <Card className="windtre-glass-panel border-white/20">
                  <CardContent className="p-6">
                    {timelineLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-gray-500">Caricamento cronologia...</div>
                      </div>
                    ) : timelineData?.entries && timelineData.entries.length > 0 ? (
                      <>
                        <div className="space-y-6">
                          {timelineData.entries.map((entry, index) => {
                            const dept = DEPARTMENT_STYLES[entry.templateCategory as keyof typeof DEPARTMENT_STYLES];
                            const isLast = index === timelineData.entries.length - 1;
                            
                            // Calcola tempo relativo
                            const getRelativeTime = (dateString: string | null) => {
                              if (!dateString) return 'Data non disponibile';
                              const date = new Date(dateString);
                              const now = new Date();
                              const diffMs = now.getTime() - date.getTime();
                              const diffMinutes = Math.floor(diffMs / (1000 * 60));
                              const diffHours = Math.floor(diffMinutes / 60);
                              const diffDays = Math.floor(diffHours / 24);
                              
                              if (diffMinutes < 60) return `${diffMinutes} minuti fa`;
                              if (diffHours < 24) return `${diffHours} ore fa`;
                              return `${diffDays} giorni fa`;
                            };

                            return (
                              <div key={entry.instanceId} className="flex gap-4" data-testid={`timeline-entry-${entry.instanceId}`}>
                                {/* Timeline dot */}
                                <div className="flex flex-col items-center">
                                  <div className={`w-3 h-3 rounded-full ${
                                    entry.status === 'completed' ? 'bg-green-500' :
                                    entry.status === 'running' ? 'bg-windtre-orange' :
                                    entry.status === 'pending' ? 'bg-yellow-500' :
                                    entry.status === 'failed' ? 'bg-red-500' : 'bg-gray-300'
                                  }`} />
                                  {!isLast && <div className="w-0.5 h-12 bg-gray-200" />}
                                </div>
                                
                                {/* Timeline content */}
                                <div className="flex-1 windtre-glass-panel p-4 rounded-lg border-white/20">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-medium text-gray-900">
                                          {entry.instanceName || entry.templateName}
                                        </h4>
                                        {dept && (
                                          <Badge variant="outline" className={`text-xs ${dept.textColor}`}>
                                            {dept.label}
                                          </Badge>
                                        )}
                                        <Badge variant="outline" className={`text-xs ${
                                          entry.status === 'completed' ? 'text-green-600' :
                                          entry.status === 'running' ? 'text-windtre-orange' :
                                          entry.status === 'pending' ? 'text-yellow-600' :
                                          entry.status === 'failed' ? 'text-red-600' : 'text-gray-500'
                                        }`}>
                                          {entry.status === 'running' ? 'In Esecuzione' :
                                           entry.status === 'completed' ? 'Completato' :
                                           entry.status === 'pending' ? 'In Attesa' :
                                           entry.status === 'failed' ? 'Fallito' : entry.status}
                                        </Badge>
                                      </div>
                                      
                                      <p className="text-sm text-gray-600 mb-2">
                                        Template: <span className="font-medium">{entry.templateName}</span>
                                        {entry.referenceId && (
                                          <span className="ml-2 text-gray-500">• ID Riferimento: {entry.referenceId}</span>
                                        )}
                                      </p>
                                      
                                      {entry.currentStep && (
                                        <p className="text-xs text-gray-500 mb-2">
                                          Step Corrente: <span className="font-medium">{entry.currentStep}</span>
                                          {entry.assignee && (
                                            <span className="ml-2">• Assegnato a: {entry.assignee}</span>
                                          )}
                                        </p>
                                      )}
                                      
                                      <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span>
                                          Avviato: {getRelativeTime(entry.startedAt)}
                                        </span>
                                        {entry.completedAt && (
                                          <span>
                                            Completato: {getRelativeTime(entry.completedAt)}
                                          </span>
                                        )}
                                        {entry.escalationLevel > 0 && (
                                          <span className="text-orange-600 font-medium">
                                            Escalation Livello {entry.escalationLevel}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {dept && <dept.icon className={`h-5 w-5 ${dept.textColor}`} />}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Pagination */}
                        {timelineData.pagination && timelineData.pagination.totalPages > 1 && (
                          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                            <div className="text-sm text-gray-600">
                              Mostra {timelineData.entries.length} di {timelineData.pagination.total} risultati
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                disabled={!timelineData.pagination.hasPrev}
                                data-testid="button-timeline-prev"
                              >
                                Precedente
                              </Button>
                              <span className="flex items-center px-3 text-sm text-gray-600">
                                Pagina {timelineData.pagination.page} di {timelineData.pagination.totalPages}
                              </span>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                disabled={!timelineData.pagination.hasNext}
                                data-testid="button-timeline-next"
                              >
                                Successiva
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna Attività</h3>
                        <p className="text-gray-600 mb-4">Non ci sono esecuzioni workflow da mostrare</p>
                        <Button 
                          onClick={() => setActiveView('builder')}
                          className="bg-windtre-orange hover:bg-windtre-orange-dark text-white"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Avvia Primo Workflow
                        </Button>
                      </div>
                    )}
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
                    <Popover>
                      <PopoverTrigger asChild>
                        <button 
                          className="ml-1 p-1 rounded-full hover:bg-gray-100 transition-colors"
                          data-testid="button-team-info"
                        >
                          <Info className="h-4 w-4 text-gray-400 hover:text-windtre-purple" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-96 p-4" align="start">
                        <div className="space-y-4 text-sm">
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Info className="h-4 w-4 text-windtre-purple" />
                            Sistema Gerarchico e Gestione Richieste
                          </h3>
                          
                          <div className="space-y-3">
                            <div>
                              <p className="font-medium text-gray-800 mb-1">📊 Gerarchia Organizzativa</p>
                              <p className="text-gray-600 text-xs">Area Commerciale → Entità Legale → Negozio → Dipartimento → Team → Utente</p>
                            </div>
                            
                            <div>
                              <p className="font-medium text-gray-800 mb-1">👥 Tipologie Team</p>
                              <p className="text-gray-600 text-xs">
                                <span className="font-medium">Funzionale:</span> 1 solo per dipartimento per utente (team principale)<br/>
                                <span className="font-medium">Temporaneo/Progetto:</span> Senza limiti, membership multipla
                              </p>
                            </div>
                            
                            <div>
                              <p className="font-medium text-gray-800 mb-1">🔀 Routing Richieste</p>
                              <p className="text-gray-600 text-xs">
                                • Prima si cerca un team funzionale → va al suo supervisore<br/>
                                • Se non esiste → notifica TUTTI i supervisori dei team temporanei<br/>
                                • <span className="font-medium">First Wins:</span> Il primo che risponde gestisce la richiesta
                              </p>
                            </div>
                            
                            <div>
                              <p className="font-medium text-gray-800 mb-1">🔒 Anti Self-Approval</p>
                              <p className="text-gray-600 text-xs">Un supervisore NON può essere membro dello stesso team che supervisiona</p>
                            </div>
                            
                            <div>
                              <p className="font-medium text-gray-800 mb-1">🏪 Routing Basato su Turno</p>
                              <p className="text-gray-600 text-xs">
                                <span className="font-medium">Amministrative</span> (ferie, permessi): sempre al supervisore sede anagrafica<br/>
                                <span className="font-medium">Operative</span> (cambio turno, straordinari): se turno attivo in altro negozio, vanno al supervisore di quel negozio
                              </p>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </h2>
                  <p className="text-gray-600 mt-1">Manage enterprise teams and workflow assignments</p>
                </div>
                
                {teamsSubView === 'list' && (
                  <Button 
                    onClick={handleCreateTeam}
                    className="bg-windtre-orange hover:bg-windtre-orange-dark text-white"
                    data-testid="button-create-team"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Team
                  </Button>
                )}
              </div>

              {/* 🎯 Teams Sub-Navigation */}
              <div className="flex gap-2 mb-6">
                <Button
                  variant={teamsSubView === 'list' ? 'default' : 'outline'}
                  onClick={() => setTeamsSubView('list')}
                  className={teamsSubView === 'list' 
                    ? 'bg-windtre-orange hover:bg-windtre-orange-dark text-white' 
                    : 'hover:bg-gray-100'}
                  data-testid="tab-teams-list"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Teams List
                </Button>
                <Button
                  variant={teamsSubView === 'coverage' ? 'default' : 'outline'}
                  onClick={() => setTeamsSubView('coverage')}
                  className={teamsSubView === 'coverage' 
                    ? 'bg-windtre-purple hover:bg-windtre-purple/90 text-white' 
                    : 'hover:bg-gray-100'}
                  data-testid="tab-coverage-dashboard"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Coverage Dashboard
                  {coverageData?.data?.summary?.criticalCount && coverageData.data.summary.criticalCount > 0 && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      {coverageData.data.summary.criticalCount}
                    </Badge>
                  )}
                </Button>
                <Button
                  variant={teamsSubView === 'actions' ? 'default' : 'outline'}
                  onClick={() => setTeamsSubView('actions')}
                  className={teamsSubView === 'actions' 
                    ? 'bg-windtre-orange hover:bg-windtre-orange-dark text-white' 
                    : 'hover:bg-gray-100'}
                  data-testid="tab-action-management"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Action Management
                </Button>
              </div>

              {/* 🎯 Teams List View */}
              {teamsSubView === 'list' && (
                <>
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
                      {Object.keys(DEPARTMENT_STYLES).length}
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
                        {Object.entries(DEPARTMENT_STYLES).map(([key, dept]) => (
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
                          <TableHead className="font-semibold text-gray-900">Supervisors</TableHead>
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
                              {(() => {
                                const typeKey = team.teamType && TEAM_TYPES[team.teamType] ? team.teamType : 'functional';
                                const typeInfo = TEAM_TYPES[typeKey];
                                return (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex">
                                          <Badge className={`${typeInfo.color} cursor-help`}>
                                            <span className="mr-1">{typeInfo.icon}</span>
                                            {typeInfo.label}
                                          </Badge>
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="right" className="max-w-xs">
                                        <div className="text-sm">
                                          <p className="font-semibold mb-1">
                                            {typeInfo.exclusive ? '🔒 Team Primario' : '🔓 Team Flessibile'}
                                          </p>
                                          <p>{typeInfo.description}</p>
                                          {typeInfo.exclusive && (
                                            <p className="text-yellow-600 mt-1 text-xs">
                                              Un utente può appartenere a max 1 team funzionale per dipartimento
                                            </p>
                                          )}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(team.assignedDepartments || []).map((dept) => {
                                  const deptInfo = DEPARTMENT_STYLES[dept];
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
                              <div className="space-y-1">
                                {team.primarySupervisorName ? (
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-windtre-purple" />
                                    <span className="text-sm text-gray-700 font-medium">
                                      {team.primarySupervisorName}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-400">No primary supervisor</span>
                                )}
                                {team.secondarySupervisorName && (
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-3 w-3 text-gray-400" />
                                    <span className="text-xs text-gray-500">
                                      {team.secondarySupervisorName}
                                    </span>
                                  </div>
                                )}
                              </div>
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
                                  onClick={() => handleManageWorkflows(team)}
                                  className="text-windtre-orange hover:bg-windtre-orange/10"
                                  title="View Workflow Assignments"
                                  data-testid={`button-workflows-team-${team.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
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
                </>
              )}

              {/* 🎯 Coverage Dashboard View - NEW 3-LEVEL STRUCTURE */}
              {teamsSubView === 'coverage' && (
                <div className="space-y-6">
                  {/* Overall Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className={`windtre-glass-panel border-l-4 ${
                      coverageData?.summary?.overallHealth === 'critical' ? 'border-l-red-500' :
                      coverageData?.summary?.overallHealth === 'warning' ? 'border-l-yellow-500' :
                      'border-l-green-500'
                    }`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">
                          Stato Generale
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${
                          coverageData?.summary?.overallHealth === 'critical' ? 'text-red-600' :
                          coverageData?.summary?.overallHealth === 'warning' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {coverageLoading ? '...' : 
                            coverageData?.summary?.overallHealth === 'critical' ? 'Critico' :
                            coverageData?.summary?.overallHealth === 'warning' ? 'Attenzione' :
                            'OK'
                          }
                        </div>
                      </CardContent>
                    </Card>

                    <Card className={`windtre-glass-panel border-l-4 ${
                      coverageData?.summary?.level1?.status === 'critical' ? 'border-l-red-500' :
                      coverageData?.summary?.level1?.status === 'warning' ? 'border-l-yellow-500' :
                      'border-l-green-500'
                    }`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Livello 1
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {coverageLoading ? '...' : `${coverageData?.summary?.level1?.coveredDepartments || 0}/${coverageData?.summary?.level1?.totalDepartments || 0}`}
                        </div>
                        <p className="text-xs text-gray-500">Dipartimenti con Team</p>
                      </CardContent>
                    </Card>

                    <Card className={`windtre-glass-panel border-l-4 ${
                      coverageData?.summary?.level2?.status === 'critical' ? 'border-l-red-500' :
                      coverageData?.summary?.level2?.status === 'warning' ? 'border-l-yellow-500' :
                      'border-l-green-500'
                    }`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Livello 2
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {coverageLoading ? '...' : `${coverageData?.summary?.level2?.fullyConfigured || 0}/${coverageData?.summary?.level2?.totalDepartments || 0}`}
                        </div>
                        <p className="text-xs text-gray-500">Dipartimenti con Workflow</p>
                      </CardContent>
                    </Card>

                    <Card className={`windtre-glass-panel border-l-4 ${
                      coverageData?.summary?.level3?.status === 'critical' ? 'border-l-red-500' :
                      coverageData?.summary?.level3?.status === 'warning' ? 'border-l-yellow-500' :
                      'border-l-green-500'
                    }`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Livello 3
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {coverageLoading ? '...' : `${coverageData?.summary?.level3?.usersOk || 0}/${coverageData?.summary?.level3?.totalUsers || 0}`}
                        </div>
                        <p className="text-xs text-gray-500">Utenti OK</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* LEVEL 1: Departments → Teams */}
                  <Card className="windtre-glass-panel border-white/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-windtre-purple" />
                        Livello 1: Dipartimenti → Team
                      </CardTitle>
                      <CardDescription>
                        {coverageData?.summary?.level1?.description || 'Ogni dipartimento deve avere almeno un team assegnato'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {coverageLoading ? (
                        <div className="text-center py-8 text-gray-500">Caricamento...</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {coverageData?.level1?.map((dept) => (
                            <div 
                              key={dept.department}
                              className={`p-4 rounded-lg border-2 ${
                                dept.status === 'critical' ? 'border-red-300 bg-red-50' :
                                dept.status === 'warning' ? 'border-yellow-300 bg-yellow-50' :
                                'border-green-300 bg-green-50'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-gray-900">{dept.departmentLabel}</h4>
                                <Badge variant={
                                  dept.status === 'critical' ? 'destructive' :
                                  dept.status === 'warning' ? 'secondary' : 'default'
                                }>
                                  {dept.status === 'critical' ? 'Critico' :
                                   dept.status === 'warning' ? 'Attenzione' : 'OK'}
                                </Badge>
                              </div>
                              
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-600">Team assegnati:</span>
                                  <span className={`font-medium ${dept.teamCount === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                    {dept.teamCount}
                                  </span>
                                </div>
                              </div>

                              {/* Teams List */}
                              {dept.teams && dept.teams.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <p className="text-xs font-medium text-gray-600 mb-2">Team:</p>
                                  <div className="space-y-1">
                                    {dept.teams.map((team) => (
                                      <div key={team.id} className="flex items-center gap-2 text-xs">
                                        <Users className="h-3 w-3 text-gray-400" />
                                        <span>{team.name}</span>
                                        <span className="text-gray-400">({team.memberCount} membri)</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Uncovered Departments Alert */}
                      {coverageData?.level1?.filter(d => d.status === 'critical')?.length > 0 && (
                        <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                          <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                            <XCircle className="h-4 w-4" />
                            Dipartimenti senza Team
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {coverageData.level1.filter(d => d.status === 'critical').map((dept) => (
                              <Badge key={dept.department} variant="destructive">{dept.departmentLabel}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* LEVEL 2: Departments → Workflows + Action Tags */}
                  <Card className="windtre-glass-panel border-white/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-windtre-orange" />
                        Livello 2: Dipartimenti → Workflow con Action Tags
                      </CardTitle>
                      <CardDescription>
                        {coverageData?.summary?.level2?.description || 'Ogni dipartimento deve avere workflow configurati con action tags'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {coverageLoading ? (
                        <div className="text-center py-8 text-gray-500">Caricamento...</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {coverageData?.level2?.map((dept) => (
                            <div 
                              key={dept.department}
                              className={`p-4 rounded-lg border-2 ${
                                dept.status === 'critical' ? 'border-red-300 bg-red-50' :
                                dept.status === 'warning' ? 'border-yellow-300 bg-yellow-50' :
                                'border-green-300 bg-green-50'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-gray-900">{dept.departmentLabel}</h4>
                                <div className="text-right">
                                  <Badge variant={
                                    dept.status === 'critical' ? 'destructive' :
                                    dept.status === 'warning' ? 'secondary' : 'default'
                                  }>
                                    {dept.actionTags?.coveragePercent || 0}%
                                  </Badge>
                                  <p className="text-xs text-gray-500 mt-1">{dept.workflowCount} workflow</p>
                                </div>
                              </div>
                              
                              {/* Workflow List */}
                              {dept.workflows && dept.workflows.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-xs font-medium text-gray-600 mb-1">Workflow:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {dept.workflows.map((wf) => (
                                      <Badge key={wf.id} variant="outline" className="text-xs">
                                        {wf.name}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Covered Action Tags */}
                              {dept.actionTags?.covered && dept.actionTags.covered.length > 0 && (
                                <div className="mb-2">
                                  <p className="text-xs font-medium text-gray-600 mb-1">Azioni coperte:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {dept.actionTags.covered.map((tag) => (
                                      <Badge key={tag.value} variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                                        {tag.label}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Missing Action Tags - Enhanced visibility */}
                              {dept.actionTags?.missing && dept.actionTags.missing.length > 0 && (
                                <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                                  <p className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1">
                                    <AlertTriangle className="h-4 w-4" />
                                    Azioni mancanti ({dept.actionTags.missing.length}):
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {dept.actionTags.missing.map((tag) => (
                                      <Badge 
                                        key={tag.value} 
                                        className="text-sm px-3 py-1 bg-red-200 text-gray-900 border border-red-300 font-medium"
                                      >
                                        {tag.label}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* LEVEL 3: Users → Teams per Department */}
                  <Card className="windtre-glass-panel border-white/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-windtre-green" />
                        Livello 3: Utenti → Copertura per Dipartimento
                      </CardTitle>
                      <CardDescription>
                        {coverageData?.summary?.level3?.description || 'Ogni utente deve avere accesso ai dipartimenti critici (HR)'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {coverageLoading ? (
                        <div className="text-center py-8 text-gray-500">Caricamento...</div>
                      ) : (
                        <>
                          {/* Summary Stats */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-600">Utenti Totali</p>
                              <p className="text-2xl font-bold text-gray-900">
                                {coverageData?.level3?.totalUsers || 0}
                              </p>
                            </div>
                            <div className={`p-4 rounded-lg ${
                              (coverageData?.level3?.orphanUsers?.length || 0) > 0 ? 'bg-red-50' : 'bg-green-50'
                            }`}>
                              <p className="text-sm text-gray-600">Utenti con Problemi</p>
                              <p className={`text-2xl font-bold ${
                                (coverageData?.level3?.orphanUsers?.length || 0) > 0 ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {coverageData?.level3?.orphanUsers?.length || 0}
                              </p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg">
                              <p className="text-sm text-gray-600">Copertura Completa</p>
                              <p className="text-2xl font-bold text-green-600">
                                {coverageData?.level3?.usersWithFullCoverage || 0}
                              </p>
                            </div>
                          </div>

                          {/* Department Breakdown */}
                          {coverageData?.level3?.departmentBreakdown && (
                            <div className="mb-6">
                              <h4 className="font-medium text-gray-700 mb-3">Copertura per Dipartimento</h4>
                              <div className="space-y-3">
                                {coverageData.level3.departmentBreakdown.map((dept) => (
                                  <div 
                                    key={dept.department} 
                                    className={`flex items-center gap-4 p-2 rounded-lg ${
                                      dept.coveragePercent === 0 ? 'bg-red-50 border border-red-200' : ''
                                    }`}
                                  >
                                    <div className="w-32 text-sm font-medium text-gray-700 flex items-center gap-1">
                                      {dept.departmentLabel}
                                      {dept.isCritical && (
                                        <Badge variant="outline" className="ml-1 text-xs text-red-600 border-red-300">
                                          Critico
                                        </Badge>
                                      )}
                                      {dept.coveragePercent === 0 && !dept.isCritical && (
                                        <Badge className="ml-1 text-xs bg-orange-100 text-orange-700 border border-orange-300">
                                          Vuoto
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <div className={`h-4 rounded-full overflow-hidden ${
                                        dept.coveragePercent === 0 ? 'bg-red-200' : 'bg-gray-200'
                                      }`}>
                                        <div 
                                          className={`h-full rounded-full ${
                                            dept.coveragePercent === 100 ? 'bg-green-500' :
                                            dept.coveragePercent >= 50 ? 'bg-yellow-500' : 
                                            dept.coveragePercent > 0 ? 'bg-red-500' : 'bg-red-300'
                                          }`}
                                          style={{ width: `${Math.max(dept.coveragePercent, dept.coveragePercent === 0 ? 100 : 0)}%` }}
                                        />
                                      </div>
                                    </div>
                                    <div className="w-24 text-sm text-right">
                                      <span className={`font-medium ${dept.coveragePercent === 0 ? 'text-red-600' : ''}`}>
                                        {dept.usersWithCoverage}
                                      </span>
                                      <span className="text-gray-400"> / {dept.usersWithCoverage + dept.usersWithoutCoverage}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Alert for Zero Coverage Departments */}
                          {coverageData?.level3?.departmentBreakdown?.filter(d => d.coveragePercent === 0)?.length > 0 && (
                            <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                              <h4 className="font-medium text-orange-700 mb-2 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                Dipartimenti senza Copertura Utenti ({coverageData.level3.departmentBreakdown.filter(d => d.coveragePercent === 0).length})
                              </h4>
                              <p className="text-sm text-orange-600 mb-3">
                                Nessun utente ha accesso a questi dipartimenti tramite team assegnati:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {coverageData.level3.departmentBreakdown.filter(d => d.coveragePercent === 0).map((dept) => (
                                  <Badge 
                                    key={dept.department} 
                                    className={`text-sm px-3 py-1 ${
                                      dept.isCritical 
                                        ? 'bg-red-200 text-red-800 border border-red-400' 
                                        : 'bg-orange-200 text-orange-800 border border-orange-400'
                                    }`}
                                  >
                                    {dept.departmentLabel}
                                    {dept.isCritical && ' (Critico)'}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Orphan Users - Users missing critical department coverage */}
                          {coverageData?.level3?.orphanUsers?.length > 0 && (
                            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                              <h4 className="font-medium text-red-700 mb-3 flex items-center gap-2">
                                <XCircle className="h-4 w-4" />
                                Utenti con Dipartimenti Critici Mancanti ({coverageData.level3.orphanUsers.length})
                              </h4>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {coverageData.level3.orphanUsers.map((user) => (
                                  <div key={user.id} className="flex items-center justify-between p-2 bg-white rounded border border-red-100">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                                        <span className="text-sm font-medium text-red-600">
                                          {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
                                        </span>
                                      </div>
                                      <div className="flex-1">
                                        <p className="font-medium text-gray-900 text-sm">{user.name || 'N/A'}</p>
                                        <p className="text-xs text-gray-500">{user.email}</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <Badge variant="outline" className="text-xs mb-1">{user.role}</Badge>
                                      {user.missingDepartments?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 justify-end">
                                          {user.missingDepartments.map((dept) => (
                                            <Badge key={dept} variant="destructive" className="text-xs">
                                              {dept}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* 🎯 Action Management View */}
              {teamsSubView === 'actions' && (
                <ActionManagementContent />
              )}

              {/* 🎯 Create/Edit Team Modal */}
              <CreateTeamModal 
                open={showCreateTeamDialog}
                onOpenChange={handleCloseTeamModal}
                editTeam={editingTeam}
              />

              {/* 🎯 Workflow Assignment Modal */}
              <Dialog open={showWorkflowModal} onOpenChange={setShowWorkflowModal}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-windtre-orange">
                      <Settings className="w-5 h-5" />
                      Manage Workflow Assignments
                    </DialogTitle>
                    <DialogDescription>
                      Configure workflow templates for <strong>{selectedTeamForWorkflows?.name}</strong> team departments
                    </DialogDescription>
                  </DialogHeader>

                  {selectedTeamForWorkflows && (
                    <div className="space-y-6">
                      {/* Team Info */}
                      <div className="p-4 bg-gradient-to-r from-windtre-purple/5 to-windtre-orange/5 rounded-lg border border-windtre-purple/20">
                        <h4 className="text-sm font-medium text-windtre-purple mb-2">👥 Team Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Team Name</p>
                            <p className="font-medium">{selectedTeamForWorkflows.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Team Type</p>
                            <Badge className={TEAM_TYPES[selectedTeamForWorkflows.teamType]?.color}>
                              {TEAM_TYPES[selectedTeamForWorkflows.teamType]?.label}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-3">
                          <p className="text-sm text-gray-600 mb-2">Assigned Departments</p>
                          <div className="flex flex-wrap gap-1">
                            {(selectedTeamForWorkflows.assignedDepartments || []).map((dept) => {
                              const deptInfo = DEPARTMENT_STYLES[dept];
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
                        </div>
                      </div>

                      {/* Department Workflow Assignments */}
                      {(selectedTeamForWorkflows.assignedDepartments || []).length === 0 ? (
                        <div className="text-center p-8 bg-gray-50 rounded-lg">
                          <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                          <p className="text-gray-500">No departments assigned to this team</p>
                          <p className="text-sm text-gray-400 mt-1">Edit the team to assign departments first</p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <h4 className="text-lg font-semibold flex items-center gap-2">
                            <Workflow className="w-5 h-5 text-windtre-orange" />
                            Workflow Template Assignments
                          </h4>
                          
                          {(selectedTeamForWorkflows.assignedDepartments || []).map((department) => {
                            const deptInfo = DEPARTMENT_STYLES[department];
                            // Filter templates by department category AND manual team routing
                            const departmentTemplates = templates.filter(
                              (template: any) => 
                                (template.category === department || !template.category) &&
                                template.routingInfo?.teams?.hasManualRouting === true
                            );
                            
                            return (
                              <div key={department} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-4">
                                  {deptInfo && (
                                    <div className={`p-2 rounded-lg ${deptInfo.color} opacity-20`}>
                                      <deptInfo.icon className={`h-5 w-5 ${deptInfo.textColor}`} />
                                    </div>
                                  )}
                                  <h5 className="text-lg font-semibold">{deptInfo?.label} Department</h5>
                                  <Badge variant="outline" className="text-xs">
                                    {departmentTemplates.length} templates available
                                  </Badge>
                                </div>

                                {departmentTemplates.length === 0 ? (
                                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                                    <p className="text-sm text-gray-500">
                                      No workflow templates available for {deptInfo?.label} department
                                    </p>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="mt-2"
                                      onClick={() => setActiveView('builder')}
                                    >
                                      <Plus className="w-4 h-4 mr-2" />
                                      Create Template
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <p className="text-sm text-gray-600">
                                      Select templates that this team should handle automatically for {deptInfo?.label} department requests:
                                    </p>
                                    <div className="grid grid-cols-1 gap-3">
                                      {departmentTemplates.map((template: any) => {
                                        const templateActionTags = template.actionTags || [];
                                        const hasActionTags = templateActionTags.length > 0 || template.customAction;
                                        const alreadyAssigned = isWorkflowAssigned(template.id, department);
                                        const conflictInfo = !alreadyAssigned ? findActionTagConflicts(templateActionTags, department) : { hasConflict: false, conflicts: [] };
                                        
                                        return (
                                          <div
                                            key={template.id}
                                            className={`p-3 rounded-lg border transition-colors ${
                                              alreadyAssigned 
                                                ? 'border-green-300 bg-green-50' 
                                                : conflictInfo.hasConflict 
                                                  ? 'border-yellow-300 bg-yellow-50' 
                                                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                                            }`}
                                          >
                                            <div className="flex items-center justify-between">
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                  <div className="font-medium">{template.name}</div>
                                                  {alreadyAssigned && (
                                                    <Badge className="text-xs bg-green-600 text-white">
                                                      <CheckCircle className="w-3 h-3 mr-1" />
                                                      Assegnato
                                                    </Badge>
                                                  )}
                                                </div>
                                                <div className="text-sm text-gray-600">{template.description}</div>
                                                
                                                {/* Action Tags (Scopo del Workflow) */}
                                                {hasActionTags && (
                                                  <div className="mt-2">
                                                    <div className="flex items-center gap-1 mb-1">
                                                      <Tags className="w-3 h-3 text-gray-500" />
                                                      <span className="text-xs text-gray-500 font-medium">Scopo:</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                      {templateActionTags.map((tagValue: string) => {
                                                        const isConflicting = conflictInfo.conflicts.some(c => c.tag === tagValue);
                                                        return (
                                                          <TooltipProvider key={tagValue}>
                                                            <Tooltip>
                                                              <TooltipTrigger asChild>
                                                                <span className="inline-flex">
                                                                  <Badge 
                                                                    variant="secondary"
                                                                    className={`text-xs ${
                                                                      isConflicting 
                                                                        ? 'bg-yellow-200 text-yellow-900 border border-yellow-400' 
                                                                        : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                                                                    }`}
                                                                  >
                                                                    {isConflicting && <AlertTriangle className="w-3 h-3 mr-1" />}
                                                                    {getActionTagLabel(tagValue, department)}
                                                                  </Badge>
                                                                </span>
                                                              </TooltipTrigger>
                                                              <TooltipContent>
                                                                {isConflicting ? (
                                                                  <p className="text-yellow-800">
                                                                    ⚠️ Conflitto: già coperto da "{conflictInfo.conflicts.find(c => c.tag === tagValue)?.conflictingTemplate}"
                                                                  </p>
                                                                ) : (
                                                                  <p>Questo workflow gestisce: {getActionTagLabel(tagValue, department)}</p>
                                                                )}
                                                              </TooltipContent>
                                                            </Tooltip>
                                                          </TooltipProvider>
                                                        );
                                                      })}
                                                      {template.customAction && (
                                                        <TooltipProvider>
                                                          <Tooltip>
                                                            <TooltipTrigger asChild>
                                                              <span className="inline-flex">
                                                                <Badge 
                                                                  variant="outline"
                                                                  className="text-xs bg-purple-50 text-purple-700 border-purple-200"
                                                                >
                                                                  {template.customAction}
                                                                </Badge>
                                                              </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                              <p>Azione personalizzata: {template.customAction}</p>
                                                            </TooltipContent>
                                                          </Tooltip>
                                                        </TooltipProvider>
                                                      )}
                                                    </div>
                                                  </div>
                                                )}
                                                
                                                {!hasActionTags && (
                                                  <div className="mt-2">
                                                    <Badge variant="outline" className="text-xs text-gray-400 border-gray-300">
                                                      Nessuno scopo definito
                                                    </Badge>
                                                  </div>
                                                )}

                                                {/* Alert conflitto */}
                                                {conflictInfo.hasConflict && !alreadyAssigned && (
                                                  <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded-md">
                                                    <div className="flex items-start gap-2">
                                                      <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                                      <div className="text-xs text-yellow-800">
                                                        <span className="font-medium">Attenzione:</span> Alcune azioni sono già coperte da altri workflow assegnati:
                                                        <ul className="mt-1 list-disc list-inside">
                                                          {conflictInfo.conflicts.map((conflict, idx) => (
                                                            <li key={idx}>
                                                              "{getActionTagLabel(conflict.tag, department)}" → {conflict.conflictingTemplate}
                                                            </li>
                                                          ))}
                                                        </ul>
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                                
                                                <div className="flex items-center gap-2 mt-2">
                                                  <Badge variant="outline" className="text-xs">
                                                    {template.templateType || 'workflow'}
                                                  </Badge>
                                                  <Badge variant="outline" className="text-xs text-blue-600">
                                                    {template.instanceCount || 0} instances
                                                  </Badge>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                {alreadyAssigned ? (
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-600 border-red-300 hover:bg-red-50"
                                                    data-testid={`button-unassign-workflow-${template.id}`}
                                                  >
                                                    <XCircle className="w-4 h-4 mr-1" />
                                                    Rimuovi
                                                  </Button>
                                                ) : (
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className={conflictInfo.hasConflict 
                                                      ? "text-yellow-700 border-yellow-400 hover:bg-yellow-100" 
                                                      : "text-windtre-orange border-windtre-orange hover:bg-windtre-orange/10"
                                                    }
                                                    data-testid={`button-assign-workflow-${template.id}`}
                                                  >
                                                    <Plus className="w-4 h-4 mr-1" />
                                                    {conflictInfo.hasConflict ? 'Assegna comunque' : 'Assegna'}
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Action Buttons */}
                          <div className="flex justify-between pt-4 border-t">
                            <Button
                              variant="outline"
                              onClick={handleCloseWorkflowModal}
                              data-testid="button-cancel-workflow-assignments"
                            >
                              Close
                            </Button>
                            <Button
                              className="bg-windtre-orange hover:bg-windtre-orange/90"
                              data-testid="button-save-workflow-assignments"
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              Save Assignments
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          )}

          {activeView === 'analytics' && (
            <WorkflowAnalyticsDashboard />
          )}

          {/* 🔄 QUEUE MONITOR VIEW - Async Workflow Execution */}
          {activeView === 'queue' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Activity className="h-6 w-6 text-windtre-orange" />
                Queue Monitor - Async Execution
              </h2>

              {/* Queue Metrics Panel */}
              <div className="mb-6">
                <QueueMetricsPanel />
              </div>

              {/* Recent Workflow Instances with Execution Tracking */}
              <Card className="windtre-glass-panel border-white/20">
                <CardHeader>
                  <CardTitle className="text-windtre-purple">Recent Workflow Instances</CardTitle>
                  <CardDescription>Click on any instance to view step executions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-windtre-orange mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Queue Monitoring Active</h3>
                    <p className="text-gray-600 mb-4">
                      Use the Queue Metrics above to monitor async workflow execution in real-time
                    </p>
                    <p className="text-sm text-gray-500">
                      💡 To view step executions for a specific workflow instance, use the API endpoint:<br />
                      <code className="bg-gray-100 px-2 py-1 rounded mt-2 inline-block">
                        GET /api/workflows/instances/:id/executions
                      </code>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 🔧 MCP SETTINGS VIEW - MCP Server Management Dashboard */}
          {activeView === 'settings' && <MCPSettingsDashboard />}
        </div>
      </div>

      {/* 🔄 Workflow Execution Drawer */}
      <WorkflowExecutionDrawer
        open={showExecutionDrawer}
        onOpenChange={setShowExecutionDrawer}
        instanceId={selectedInstanceId}
        instanceName={selectedInstanceName}
      />

      {/* 🧪 Workflow Test Result Dialog */}
      <WorkflowTestResultDialog
        result={testRunResult}
        open={testRunResult !== null}
        onOpenChange={(open) => !open && setTestRunResult(null)}
      />
      </div>
    </Layout>
  );
}