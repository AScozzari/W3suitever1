import React from 'react';
import { SettingsPageTemplate, SettingsSection } from '@w3suite/frontend-kit/templates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import WorkflowBuilder from '@/components/WorkflowBuilder';
import PositionsManager from '@/components/PositionsManager';
import ActionLibrary from '@/components/ActionLibrary';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { 
  Settings, 
  Users, 
  FileText, 
  Activity, 
  Workflow,
  Play,
  Plus,
  CheckCircle,
  AlertCircle,
  Clock,
  Target,
  BarChart3
} from 'lucide-react';

export default function WorkflowManagementPage() {
  // Refs for connecting UI buttons to builder functions
  const workflowBuilderRef = React.useRef<any>(null);
  // React Query hooks using default fetcher (handles auth + tenant automatically)
  const { data: workflowActions, isLoading: actionsLoading } = useQuery({
    queryKey: ['/api/workflow-actions']
  });

  const { data: workflowTemplates, isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/workflow-templates']
  });

  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ['/api/teams']
  });

  const { data: teamAssignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['/api/team-assignments'] // Backend endpoint confirmed in routes.ts
  });

  const { data: workflowInstances, isLoading: instancesLoading } = useQuery({
    queryKey: ['/api/workflow-instances']
  });

  // Mutations using apiRequest with proper auth/tenant handling
  const saveTemplateMutation = useMutation({
    mutationFn: async (template: any) => {
      return apiRequest('/api/workflow-templates', {
        method: 'POST',
        body: JSON.stringify(template)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflow-templates'] });
    }
  });

  const executeWorkflowMutation = useMutation({
    mutationFn: async ({ templateId, instanceData }: { templateId: string; instanceData: any }) => {
      return apiRequest('/api/workflow-instances', {
        method: 'POST',
        body: JSON.stringify({ templateId, instanceData })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflow-instances'] });
    }
  });

  // Settings sections configuration
  const sections: SettingsSection[] = [
    {
      id: 'builder',
      title: 'Workflow Builder',
      description: 'Create and edit visual workflows with drag-and-drop interface',
      icon: <Workflow className="w-5 h-5" />,
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Main Workflow Canvas */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-orange-500" />
                  Visual Workflow Designer
                </CardTitle>
                <CardDescription>
                  Drag actions from the library to create approval workflows
                </CardDescription>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => {
                      // Trigger save via builder ref
                      if (workflowBuilderRef.current?.save) {
                        workflowBuilderRef.current.save();
                      } else {
                        console.warn('WorkflowBuilder save method not available via ref');
                      }
                    }}
                    disabled={saveTemplateMutation.isPending}
                    data-testid="button-save-workflow"
                  >
                    {saveTemplateMutation.isPending ? (
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Save Template
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      // Trigger test run via builder ref
                      if (workflowBuilderRef.current?.run) {
                        workflowBuilderRef.current.run();
                      } else {
                        console.warn('WorkflowBuilder run method not available via ref');
                      }
                    }}
                    disabled={executeWorkflowMutation.isPending}
                    data-testid="button-execute-workflow"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Test Run
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="h-[500px] p-0">
                <WorkflowBuilder
                  ref={workflowBuilderRef}
                  onSave={(nodes, edges) => {
                    // Map React Flow nodes/edges to backend workflowSteps format with proper ordering
                    console.log('Mapping React Flow to backend workflowSteps...');
                    console.log('Input nodes:', nodes.length, 'edges:', edges.length);
                    
                    // Create template with React Flow structure (backend expects nodes/edges)
                    const template = {
                      name: `Workflow ${new Date().toISOString().split('T')[0]}`,
                      description: 'Visual workflow created via builder',
                      category: 'hr', // TODO: Make configurable based on selected actions
                      templateType: 'custom',
                      nodes: nodes, // React Flow nodes (backend will process for workflowSteps)
                      edges: edges, // React Flow edges (backend will process for step transitions)  
                      viewport: { x: 0, y: 0, zoom: 1 }, // Canvas state
                      isActive: true,
                      version: 1
                    };
                    
                    // Backend mapping logic (to be implemented in backend API):
                    // 1. For each node: create workflowStep with actionId from node.data.action?.id
                    // 2. Order by topological sort of nodes via edges
                    // 3. Map approver logic from node.data.approver or teamAssignments  
                    // 4. Convert edge conditions to step.conditions
                    // 5. Validate against insertWorkflowStepSchema
                    
                    console.log('Template structure prepared for backend processing:', {
                      name: template.name,
                      nodesCount: nodes.length,
                      edgesCount: edges.length,
                      category: template.category
                    });
                    
                    saveTemplateMutation.mutate(template);
                  }}
                  onRun={(nodes, edges, instanceData) => {
                    // First create a temporary template, then execute it
                    const tempTemplate = {
                      name: `Test Run ${Date.now()}`,
                      description: 'Temporary template for test execution', 
                      category: 'hr',
                      templateType: 'test',
                      nodes: nodes,
                      edges: edges,
                      viewport: { x: 0, y: 0, zoom: 1 },
                      isActive: true,
                      version: 1
                    };
                    
                    // Save template first, then execute
                    console.log('Creating temporary template for execution:', tempTemplate);
                    console.log('Instance data:', instanceData || { testRun: true });
                    
                    saveTemplateMutation.mutate(tempTemplate, {
                      onSuccess: (savedTemplate: any) => {
                        console.log('Template saved, now executing workflow...');
                        // Execute the workflow with the saved template ID
                        executeWorkflowMutation.mutate({
                          templateId: savedTemplate.id,
                          instanceData: instanceData || { 
                            testRun: true, 
                            startedAt: new Date().toISOString(),
                            priority: 'normal'
                          }
                        });
                      }
                    });
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Action Library Sidebar */}
          <div className="space-y-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">Action Library</CardTitle>
                <CardDescription>
                  Drag actions into your workflow
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 h-[500px] overflow-y-auto">
                <ActionLibrary
                  actions={workflowActions || []}
                  isLoading={actionsLoading}
                  onActionDrag={(action) => {
                    console.log('Action dragged from library:', action);
                    // TODO: Integrate with WorkflowBuilder drag-and-drop
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )
    },
    {
      id: 'teams',
      title: 'Team Management',
      description: 'Manage teams and assign workflow responsibilities',
      icon: <Users className="w-5 h-5" />,
      content: (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Teams & Positions
            </CardTitle>
            <CardDescription>
              Manage teams with hybrid composition (users + roles) and RBAC-validated supervisors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PositionsManager
              teams={teams || []}
              isLoading={teamsLoading}
              onPositionSelect={(position) => {
                console.log('Position selected for workflow assignment:', position);
                // TODO: Integrate with workflow builder for node assignment
              }}
            />
          </CardContent>
        </Card>
      )
    },
    {
      id: 'templates',
      title: 'Template Library',
      description: 'Browse and manage pre-built workflow templates',
      icon: <FileText className="w-5 h-5" />,
      content: (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-500" />
              Workflow Templates
            </CardTitle>
            <CardDescription>
              Pre-built templates for HR, Finance, Operations, Legal, CRM, Support, and Sales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templatesLoading ? (
                // Loading skeletons
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
                ))
              ) : workflowTemplates && workflowTemplates.length > 0 ? (
                workflowTemplates.map((template: any) => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">{template.name}</CardTitle>
                        <span className="text-xs text-gray-500 capitalize">{template.category}</span>
                      </div>
                      {template.description && (
                        <CardDescription className="text-xs">{template.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Usage: {template.usageCount || 0}</span>
                        <span>v{template.version}</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full mt-2"
                        onClick={() => {
                          console.log('Loading template:', template);
                          // TODO: Load template into workflow builder
                        }}
                        data-testid={`button-load-template-${template.id}`}
                      >
                        Load Template
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center text-gray-500 py-8">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No templates available</p>
                  <Button 
                    size="sm" 
                    className="mt-2"
                    onClick={() => {
                      // TODO: Create new template
                      console.log('Creating new template...');
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Template
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )
    },
    {
      id: 'monitor',
      title: 'Execution Monitor',
      description: 'Monitor workflow executions and performance metrics',
      icon: <Activity className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
                <Activity className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {instancesLoading ? '...' : workflowInstances?.filter((w: any) => w.currentStatus === 'running').length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Currently running</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {instancesLoading ? '...' : workflowInstances?.filter((w: any) => w.currentStatus === 'waiting_approval').length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Awaiting approval</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {instancesLoading ? '...' : workflowInstances?.filter((w: any) => w.currentStatus === 'completed').length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Successful completions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed Executions</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {instancesLoading ? '...' : workflowInstances?.filter((w: any) => w.currentStatus === 'failed').length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Require attention</p>
              </CardContent>
            </Card>
          </div>

          {/* Execution List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                Recent Executions
              </CardTitle>
              <CardDescription>
                Monitor workflow execution status and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {instancesLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
              ) : workflowInstances && workflowInstances.length > 0 ? (
                <div className="space-y-4">
                  {workflowInstances.slice(0, 10).map((instance: any) => (
                    <div key={instance.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${
                          instance.currentStatus === 'running' ? 'bg-blue-500' :
                          instance.currentStatus === 'waiting_approval' ? 'bg-orange-500' :
                          instance.currentStatus === 'completed' ? 'bg-green-500' :
                          instance.currentStatus === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                        }`} />
                        <div>
                          <p className="font-medium">{instance.instanceName || `Workflow ${instance.id.slice(0, 8)}`}</p>
                          <p className="text-sm text-gray-500">Requester: {instance.requesterId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          instance.currentStatus === 'running' ? 'bg-blue-100 text-blue-800' :
                          instance.currentStatus === 'waiting_approval' ? 'bg-orange-100 text-orange-800' :
                          instance.currentStatus === 'completed' ? 'bg-green-100 text-green-800' :
                          instance.currentStatus === 'failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {instance.currentStatus.replace('_', ' ')}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(instance.startedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No workflow executions yet</p>
                  <p className="text-sm">Start by creating and running a workflow</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }
  ];

  return (
    <SettingsPageTemplate
      title="Workflow Management"
      subtitle="Create, manage, and monitor approval workflows for your organization"
      breadcrumbs={[
        { label: 'Dashboard', href: '/' },
        { label: 'Settings', href: '/settings' },
        { label: 'Workflows' }
      ]}
      sections={sections}
      variant="sidebar"
      defaultSection="builder"
      className="workflow-management-page"
    />
  );
}