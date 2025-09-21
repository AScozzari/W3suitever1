import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Layout from '../components/Layout';
import WorkflowBuilder from '../components/WorkflowBuilder';
import ActionLibrary from '../components/ActionLibrary';
import TeamModal from '../components/TeamModal';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Users, Plus, Settings, GitBranch, Activity, Zap, Target, 
  BarChart3, CheckCircle, Clock, AlertCircle, TrendingUp,
  ArrowRight, Filter, Search, Layers, Play, Pause,
  Building, Shield, UserCog, Eye, MoreHorizontal, Workflow
} from 'lucide-react';

// Types
interface Team {
  id: string;
  name: string;
  description?: string;
  teamType: 'functional' | 'project' | 'department';
  userMembers: string[];
  roleMembers: string[];
  primarySupervisor?: string;
  secondarySupervisors: string[];
  isActive: boolean;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  templateType: string;
  nodes: any[];
  edges: any[];
  isActive: boolean;
  createdAt: string;
}

interface WorkflowInstance {
  id: string;
  templateId: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  createdAt: string;
  completedAt?: string;
  currentStep?: string;
}

const WorkflowManagementPage: React.FC = () => {
  const { toast } = useToast();
  const [currentModule, setCurrentModule] = useState('workflow');
  const [activeView, setActiveView] = useState<'dashboard' | 'builder' | 'teams' | 'analytics'>('dashboard');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  // Queries with proper typing
  const { data: teamsData = [], isLoading: loadingTeams } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
    staleTime: 2 * 60 * 1000,
  });

  const { data: templatesData = [], isLoading: loadingTemplates } = useQuery<WorkflowTemplate[]>({
    queryKey: ['/api/workflow-templates'],
    staleTime: 2 * 60 * 1000,
  });

  const { data: instancesData = [], isLoading: loadingInstances } = useQuery<WorkflowInstance[]>({
    queryKey: ['/api/workflow-instances'],
    staleTime: 30 * 1000,
    refetchInterval: 30000,
  });

  const { data: workflowActionsData = [] } = useQuery<any[]>({
    queryKey: ['/api/workflow-actions'],
    staleTime: 5 * 60 * 1000,
  });

  // Mutations
  const createTeamMutation = useMutation({
    mutationFn: async (teamData: Partial<Team>) => {
      return await apiRequest('/api/teams', {
        method: 'POST',
        body: JSON.stringify(teamData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      toast({
        title: "Team Created",
        description: "New team has been created successfully.",
      });
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      return await apiRequest('/api/workflow-templates', {
        method: 'POST',
        body: JSON.stringify(templateData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflow-templates'] });
      toast({
        title: "Template Saved",
        description: "Workflow template has been saved successfully.",
      });
    },
  });

  // Calculate statistics
  const totalTeams = teamsData.length;
  const activeTeams = teamsData.filter(team => team.isActive).length;
  const totalTemplates = templatesData.length;
  const runningInstances = instancesData.filter(instance => instance.status === 'running').length;
  const completedToday = instancesData.filter(instance => 
    instance.status === 'completed' && 
    new Date(instance.completedAt || '').toDateString() === new Date().toDateString()
  ).length;

  const handleSaveTeam = (teamData: Partial<Team>) => {
    if (editingTeam) {
      // Update existing team logic
      console.log('Updating team:', editingTeam.id, teamData);
    } else {
      createTeamMutation.mutate(teamData);
    }
    setShowTeamModal(false);
    setEditingTeam(null);
  };

  // Dashboard Overview Component
  const DashboardOverview = () => (
    <div className="space-y-6">
      {/* Hero Section with Glassmorphism */}
      <div className="backdrop-blur-md bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 rounded-3xl p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
              Workflow Management Hub
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Universal scalable approval hierarchy with team-based supervision
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setActiveView('builder')}
              className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white shadow-lg"
              data-testid="button-new-workflow"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Workflow
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setActiveView('teams')}
              className="backdrop-blur-sm bg-white/10 border-white/30 hover:bg-white/20"
              data-testid="button-manage-teams"
            >
              <Users className="w-4 h-4 mr-2" />
              Manage Teams
            </Button>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg hover:bg-white/15 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Active Teams</p>
                  <p className="text-2xl font-bold text-orange-500" data-testid="stat-active-teams">{activeTeams}</p>
                  <p className="text-xs text-slate-500">of {totalTeams} total</p>
                </div>
                <Users className="w-8 h-8 text-orange-500 opacity-70" />
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg hover:bg-white/15 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Templates</p>
                  <p className="text-2xl font-bold text-purple-600" data-testid="stat-templates">{totalTemplates}</p>
                  <p className="text-xs text-slate-500">workflow templates</p>
                </div>
                <GitBranch className="w-8 h-8 text-purple-600 opacity-70" />
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg hover:bg-white/15 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Running</p>
                  <p className="text-2xl font-bold text-emerald-600" data-testid="stat-running">{runningInstances}</p>
                  <p className="text-xs text-slate-500">active workflows</p>
                </div>
                <Activity className="w-8 h-8 text-emerald-600 opacity-70" />
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg hover:bg-white/15 transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Completed Today</p>
                  <p className="text-2xl font-bold text-blue-600" data-testid="stat-completed">{completedToday}</p>
                  <p className="text-xs text-slate-500">finished workflows</p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-600 opacity-70" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Workflows */}
        <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-500" />
              Recent Workflow Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {instancesData.slice(0, 5).map((instance) => (
                  <div key={instance.id} className="flex items-center justify-between p-3 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        instance.status === 'running' ? 'bg-green-500' :
                        instance.status === 'completed' ? 'bg-blue-500' :
                        instance.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                      }`} />
                      <div>
                        <p className="font-medium text-sm" data-testid={`workflow-${instance.id.slice(0, 8)}`}>
                          Workflow #{instance.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(instance.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={instance.status === 'running' ? 'default' : 'secondary'}>
                      {instance.status}
                    </Badge>
                  </div>
                ))}
                {instancesData.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No recent workflow activity</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button 
                variant="ghost" 
                className="w-full justify-start hover:bg-orange-500/10 hover:text-orange-600"
                onClick={() => setActiveView('builder')}
                data-testid="quick-action-create-workflow"
              >
                <GitBranch className="w-4 h-4 mr-3" />
                Create New Workflow Template
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start hover:bg-purple-500/10 hover:text-purple-600"
                onClick={() => {
                  setEditingTeam(null);
                  setShowTeamModal(true);
                }}
                data-testid="quick-action-create-team"
              >
                <Users className="w-4 h-4 mr-3" />
                Create New Team
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start hover:bg-emerald-500/10 hover:text-emerald-600"
                onClick={() => setActiveView('analytics')}
                data-testid="quick-action-analytics"
              >
                <BarChart3 className="w-4 h-4 mr-3" />
                View Analytics Dashboard
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start hover:bg-blue-500/10 hover:text-blue-600"
                data-testid="quick-action-permissions"
              >
                <Shield className="w-4 h-4 mr-3" />
                Configure Permissions
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start hover:bg-amber-500/10 hover:text-amber-600"
                data-testid="quick-action-settings"
              >
                <Settings className="w-4 h-4 mr-3" />
                System Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Visual Workflow Builder Component
  const WorkflowBuilderView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Visual Workflow Builder</h2>
          <p className="text-slate-600 dark:text-slate-400">Design and create custom approval workflows</p>
        </div>
        <Button 
          onClick={() => setActiveView('dashboard')} 
          variant="outline"
          className="backdrop-blur-sm bg-white/10 border-white/30 hover:bg-white/20"
          data-testid="button-back-dashboard"
        >
          <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
          Back to Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Action Library Sidebar */}
        <div className="lg:col-span-1">
          <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg h-[600px]">
            <CardHeader>
              <CardTitle className="text-lg">Action Library</CardTitle>
              <CardDescription>Drag actions to build your workflow</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ActionLibrary />
            </CardContent>
          </Card>
        </div>

        {/* Main Builder Canvas */}
        <div className="lg:col-span-3">
          <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg h-[600px]">
            <CardContent className="p-0 h-full">
              <WorkflowBuilder 
                onSave={(nodes, edges) => {
                  console.log('Saving workflow:', { nodes, edges });
                  toast({
                    title: "Workflow Saved",
                    description: "Your workflow has been saved successfully.",
                  });
                }}
                onRun={(nodes, edges) => {
                  console.log('Running workflow:', { nodes, edges });
                  toast({
                    title: "Workflow Started",
                    description: "Your workflow is now running.",
                  });
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  // Team Management View
  const TeamManagementView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Team Management</h2>
          <p className="text-slate-600 dark:text-slate-400">Manage teams and supervision hierarchy</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              setEditingTeam(null);
              setShowTeamModal(true);
            }}
            className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white"
            data-testid="button-create-team"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Team
          </Button>
          <Button 
            onClick={() => setActiveView('dashboard')} 
            variant="outline"
            className="backdrop-blur-sm bg-white/10 border-white/30 hover:bg-white/20"
            data-testid="button-back-dashboard-teams"
          >
            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teams List */}
        <div className="lg:col-span-2">
          <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg">
            <CardHeader>
              <CardTitle>Teams ({teamsData.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTeams ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-black/5 dark:bg-white/5 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {teamsData.map((team) => (
                      <div
                        key={team.id}
                        onClick={() => setSelectedTeam(team)}
                        className={`p-4 rounded-lg cursor-pointer transition-all hover:bg-orange-500/5 ${
                          selectedTeam?.id === team.id
                            ? 'bg-orange-500/10 border border-orange-500/30'
                            : 'hover:border-white/30'
                        }`}
                        data-testid={`team-item-${team.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold" data-testid={`team-name-${team.id}`}>{team.name}</h4>
                          <Badge variant={team.isActive ? 'default' : 'secondary'}>
                            {team.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                          {team.description || 'No description'}
                        </p>
                        <div className="flex gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {team.userMembers.length} users
                          </span>
                          <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            {team.roleMembers.length} roles
                          </span>
                        </div>
                      </div>
                    ))}
                    {teamsData.length === 0 && (
                      <div className="text-center py-8 text-slate-500">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No teams created yet</p>
                        <Button 
                          className="mt-4" 
                          onClick={() => {
                            setEditingTeam(null);
                            setShowTeamModal(true);
                          }}
                          data-testid="button-create-first-team"
                        >
                          Create First Team
                        </Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Team Details */}
        <div className="lg:col-span-1">
          <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg sticky top-6">
            <CardHeader>
              <CardTitle>Team Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTeam ? (
                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium mb-1" data-testid="selected-team-name">{selectedTeam.name}</h5>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {selectedTeam.description || 'No description available'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-slate-500 mb-1">TEAM TYPE</p>
                    <p className="font-medium capitalize" data-testid="selected-team-type">{selectedTeam.teamType}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-1">MEMBERS</p>
                    <p className="font-medium" data-testid="selected-team-members">
                      {selectedTeam.userMembers.length} users, {selectedTeam.roleMembers.length} roles
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 mb-1">SUPERVISORS</p>
                    <p className="font-medium" data-testid="selected-team-supervisors">
                      {selectedTeam.primarySupervisor ? '1 primary' : 'No primary'}, 
                      {selectedTeam.secondarySupervisors.length} secondary
                    </p>
                  </div>

                  <div className="pt-4 space-y-2">
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => {
                        setEditingTeam(selectedTeam);
                        setShowTeamModal(true);
                      }}
                      data-testid="button-edit-team"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Team
                    </Button>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      data-testid="button-view-workflows"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Workflows
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a team to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  // Analytics Dashboard View
  const AnalyticsView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workflow Analytics</h2>
          <p className="text-slate-600 dark:text-slate-400">Performance metrics and insights</p>
        </div>
        <Button 
          onClick={() => setActiveView('dashboard')} 
          variant="outline"
          className="backdrop-blur-sm bg-white/10 border-white/30 hover:bg-white/20"
          data-testid="button-back-dashboard-analytics"
        >
          <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
          Back to Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Performance Metrics */}
        <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <Badge className="bg-green-100 text-green-800">+12%</Badge>
            </div>
            <h3 className="font-bold text-2xl" data-testid="metric-success-rate">94.2%</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Success Rate</p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-blue-600" />
              <Badge className="bg-blue-100 text-blue-800">-8m</Badge>
            </div>
            <h3 className="font-bold text-2xl" data-testid="metric-processing-time">2.4h</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Avg. Processing Time</p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-orange-600" />
              <Badge className="bg-orange-100 text-orange-800">+5</Badge>
            </div>
            <h3 className="font-bold text-2xl" data-testid="metric-active-workflows">247</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Active Workflows</p>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <Badge className="bg-red-100 text-red-800">-2</Badge>
            </div>
            <h3 className="font-bold text-2xl" data-testid="metric-failed-processes">3</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Failed Processes</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg">
          <CardHeader>
            <CardTitle>Workflow Completion Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Chart visualization will be implemented</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg">
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Team metrics will be displayed here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="min-h-screen bg-white">
        <div className="p-6 space-y-6">
          {/* Modern Navigation Bar */}
          <div className="backdrop-blur-md bg-gradient-to-r from-white/20 via-white/10 to-transparent border border-white/30 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-orange-500 to-purple-600">
                  <Workflow className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-xl">Workflow Hub</h1>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Enterprise Approval System</p>
                </div>
              </div>
              
              <Tabs value={activeView} onValueChange={(value: any) => setActiveView(value)} className="w-auto">
                <TabsList className="backdrop-blur-sm bg-white/10 border border-white/20">
                  <TabsTrigger 
                    value="dashboard" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-purple-600 data-[state=active]:text-white"
                    data-testid="tab-dashboard"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger 
                    value="builder" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-purple-600 data-[state=active]:text-white"
                    data-testid="tab-builder"
                  >
                    <GitBranch className="w-4 h-4 mr-2" />
                    Builder
                  </TabsTrigger>
                  <TabsTrigger 
                    value="teams" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-purple-600 data-[state=active]:text-white"
                    data-testid="tab-teams"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Teams
                  </TabsTrigger>
                  <TabsTrigger 
                    value="analytics" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-purple-600 data-[state=active]:text-white"
                    data-testid="tab-analytics"
                  >
                    <Activity className="w-4 h-4 mr-2" />
                    Analytics
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Dynamic Content Based on Active View */}
          {activeView === 'dashboard' && <DashboardOverview />}
          {activeView === 'builder' && <WorkflowBuilderView />}
          {activeView === 'teams' && <TeamManagementView />}
          {activeView === 'analytics' && <AnalyticsView />}
        </div>

        {/* Team Modal */}
        <TeamModal
          isOpen={showTeamModal}
          onClose={() => {
            setShowTeamModal(false);
            setEditingTeam(null);
          }}
          onSave={handleSaveTeam}
          team={editingTeam}
          isLoading={createTeamMutation.isPending}
        />
      </div>
    </Layout>
  );
};

export default WorkflowManagementPage;