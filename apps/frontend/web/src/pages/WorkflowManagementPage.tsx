/**
 * 🏗️ WORKFLOW MANAGEMENT PAGE - WindTre Design System
 * 
 * Enterprise workflow automation with WindTre glassmorphism design
 * Follows project design standards and UI consistency
 */

import { useState } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useWorkflowTemplates, useCreateTemplate, WorkflowTemplate } from '../hooks/useWorkflowTemplates';
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
  FileText
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
  
  // 🎯 State management
  const [currentModule, setCurrentModule] = useState('workflow');
  const [activeView, setActiveView] = useState<'dashboard' | 'builder' | 'timeline' | 'teams' | 'analytics'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  
  // 🎯 Real API hooks - ABILITATI
  const { data: templates = [], isLoading: templatesLoading, error: templatesError } = useWorkflowTemplates();
  const createTemplateMutation = useCreateTemplate();

  // 🎯 Filter actions by search and department
  const filteredActions = WORKFLOW_ACTIONS.filter(action => {
    const matchesSearch = !searchTerm || 
      action.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = !selectedDepartment || action.department === selectedDepartment;
    
    return matchesSearch && matchesDepartment;
  });

  // 🎯 Create new template
  const handleCreateTemplate = async () => {
    try {
      await createTemplateMutation.mutateAsync({
        name: 'New Workflow Template',
        description: 'Custom workflow template',
        category: 'operations',
        definition: {
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 }
        }
      });
      
      toast({
        title: 'Template Created (Mock)',
        description: 'Mock template creation - API integration coming soon.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create template. Please try again.',
        variant: 'destructive',
      });
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
            
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleCreateTemplate}
                disabled={createTemplateMutation.isPending}
                className="bg-windtre-orange hover:bg-windtre-orange-dark text-white"
                data-testid="button-create-template"
              >
                <Plus className="h-4 w-4 mr-2" />
                {createTemplateMutation.isPending ? 'Creating...' : 'Create Template'}
              </Button>
            </div>
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
                onClick={() => setActiveView(tab.id as any)}
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
        {/* 🎯 WindTre Action Library Sidebar - ONLY for Builder */}
        {activeView === 'builder' && (
          <div className="w-80 border-r border-white/20 windtre-glass-panel">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Action Library</h3>
            
            {/* 🎯 Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search actions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-actions"
              />
            </div>
            
            {/* 🎯 Department Filter - Professional Select */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Filter by Department</h4>
              <Select 
                value={selectedDepartment || 'all'} 
                onValueChange={(value) => setSelectedDepartment(value === 'all' ? null : value)}
              >
                <SelectTrigger className="w-full windtre-glass-panel border-white/20" data-testid="select-department-filter">
                  <SelectValue placeholder="Select department..." />
                </SelectTrigger>
                <SelectContent className="windtre-glass-panel border-white/20">
                  <SelectItem value="all" data-testid="option-all-departments">
                    All Departments
                  </SelectItem>
                  {Object.entries(DEPARTMENTS).map(([key, dept]) => (
                    <SelectItem 
                      key={key} 
                      value={key}
                      data-testid={`option-department-${key}`}
                    >
                      <div className="flex items-center gap-2">
                        <dept.icon className={`h-4 w-4 ${dept.textColor}`} />
                        {dept.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* 🎯 Actions List with ScrollArea */}
            <ScrollArea className="h-[calc(100vh-320px)]">
              <div className="space-y-2">
                {filteredActions.map((action) => {
                  const dept = DEPARTMENTS[action.department as keyof typeof DEPARTMENTS];
                  return (
                    <Card 
                      key={action.id} 
                      className="windtre-glass-panel cursor-pointer hover:bg-white/20 transition-all duration-200 border-white/20"
                      data-testid={`action-card-${action.id}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm text-gray-900">{action.name}</h4>
                            <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                          </div>
                          <dept.icon className={`h-4 w-4 ml-2 flex-shrink-0 ${dept.textColor}`} />
                        </div>
                        <Badge 
                          variant="secondary" 
                          className={`mt-2 text-xs ${dept.color} text-white border-0`}
                        >
                          {dept.label}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
          </div>
        )}

        {/* 🎯 Main Content Area - Full width when no sidebar */}
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
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Workflow className="h-6 w-6 text-windtre-orange" />
                Workflow Builder
              </h2>
              <Card className="h-96 windtre-glass-panel border-white/20">
                <CardContent className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Workflow className="h-12 w-12 text-windtre-orange mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">React Flow Canvas</h3>
                    <p className="text-gray-600 mb-4">Drag actions from the sidebar to build workflows</p>
                    <div className="windtre-glass-panel p-4 rounded-lg border-2 border-dashed border-windtre-orange/30">
                      <p className="text-sm text-gray-500">
                        ✅ <span className="text-windtre-orange">React Flow</span> will be integrated here<br/>
                        ✅ <span className="text-windtre-purple">Drag & drop</span> from Action Library<br/>
                        ✅ <span className="text-windtre-orange">Connect nodes</span> with edges<br/>
                        ✅ <span className="text-windtre-purple">Save workflow</span> definitions
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Users className="h-6 w-6 text-windtre-purple" />
                Team Management
              </h2>
              <Card className="windtre-glass-panel border-white/20">
                <CardContent className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Users className="h-12 w-12 text-windtre-purple mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">Team Management</h3>
                    <p className="text-gray-600">Manage workflow teams and permissions</p>
                  </div>
                </CardContent>
              </Card>
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