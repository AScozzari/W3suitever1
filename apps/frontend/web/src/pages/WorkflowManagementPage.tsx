import React, { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Controls,
  Background,
  MiniMap
} from 'reactflow';
import 'reactflow/dist/style.css';
import Layout from '../components/Layout';
import TeamModal from '../components/TeamModal';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, Plus, Settings, Search, Filter, Check, X, Edit3, Trash2,
  Zap, Play, Calendar, Shield, ChevronRight, Save, RefreshCw,
  Activity, Clock, AlertCircle, MoreVertical, UserPlus,
  BarChart3, TrendingUp, Eye, ArrowRight, ArrowLeft,
  Layers, GitBranch, Target, DollarSign, Package, User, UserCog
} from 'lucide-react';

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
}

interface TeamWorkflowAssignment {
  id: string;
  teamId: string;
  templateId: string;
  autoAssign: boolean;
  priority: number;
  conditions: any;
  isActive: boolean;
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
  const [activeTab, setActiveTab] = useState<'teams' | 'builder' | 'assignment' | 'monitor'>('teams');
  const [selectedCategory, setSelectedCategory] = useState('hr');
  
  // Teams Tab State
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  
  // Builder Tab State
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  
  // Assignment Tab State
  const [assignmentMatrix, setAssignmentMatrix] = useState<Map<string, Map<string, boolean>>>(new Map());
  
  // Monitor Tab State
  const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'completed' | 'failed'>('all');

  // Queries
  const { data: teamsData, isLoading: loadingTeams, refetch: refetchTeams } = useQuery({
    queryKey: ['/api/teams'],
    enabled: true,
  });

  const { data: templatesData, isLoading: loadingTemplates, refetch: refetchTemplates } = useQuery({
    queryKey: ['/api/workflow-templates', selectedCategory],
    enabled: !!selectedCategory,
  });

  const { data: assignmentsData, isLoading: loadingAssignments, refetch: refetchAssignments } = useQuery({
    queryKey: ['/api/team-workflow-assignments'],
    enabled: true,
  });

  const { data: instancesData, isLoading: loadingInstances, refetch: refetchInstances } = useQuery({
    queryKey: ['/api/workflow-instances'],
    enabled: activeTab === 'monitor',
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['/api/users'],
    enabled: activeTab === 'teams' || showTeamModal,
  });

  const { data: rolesData, isLoading: loadingRoles } = useQuery({
    queryKey: ['/api/roles'],
    enabled: activeTab === 'teams' || showTeamModal,
  });

  const { data: workflowActionsData } = useQuery({
    queryKey: ['/api/workflow-actions', selectedCategory],
    enabled: activeTab === 'builder' && !!selectedCategory,
  });

  const { data: workflowTriggersData } = useQuery({
    queryKey: ['/api/workflow-triggers', selectedCategory],
    enabled: activeTab === 'builder' && !!selectedCategory,
  });

  // Mutations
  const createTeamMutation = useMutation({
    mutationFn: (team: Partial<Team>) => apiRequest('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(team)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      setShowTeamModal(false);
      setEditingTeam(null);
      toast({
        title: 'Team created',
        description: 'The team has been created successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating team',
        description: error.message || 'Failed to create team. Please try again.',
        variant: 'destructive',
      });
    }
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({ id, ...team }: Team) => apiRequest(`/api/teams/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(team)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      setShowTeamModal(false);
      setEditingTeam(null);
      toast({
        title: 'Team updated',
        description: 'The team has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating team',
        description: error.message || 'Failed to update team. Please try again.',
        variant: 'destructive',
      });
    }
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/teams/${id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      setSelectedTeam(null);
      toast({
        title: 'Team deleted',
        description: 'The team has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting team',
        description: error.message || 'Failed to delete team. Please try again.',
        variant: 'destructive',
      });
    }
  });

  const handleSaveTeam = (team: Partial<Team>) => {
    if (editingTeam?.id) {
      updateTeamMutation.mutate({ ...team, id: editingTeam.id } as Team);
    } else {
      createTeamMutation.mutate(team);
    }
  };

  const saveTemplateMutation = useMutation({
    mutationFn: (template: Partial<WorkflowTemplate>) => apiRequest('/api/workflow-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template)
    }),
    onSuccess: () => {
      refetchTemplates();
    }
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: (assignment: Partial<TeamWorkflowAssignment>) => apiRequest('/api/team-workflow-assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assignment)
    }),
    onSuccess: () => {
      refetchAssignments();
    }
  });

  // React Flow handlers
  const onConnect = useCallback((params: Connection | Edge) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    const position = { x: event.clientX - 250, y: event.clientY - 100 };
    
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type,
      position,
      data: { label: type }
    };
    
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Render Teams Tab
  const renderTeamsTab = () => (
    <>
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* Team List */}
        <div className="col-span-4">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base font-semibold">Teams</CardTitle>
              <Button
                onClick={() => {
                  setEditingTeam(null);
                  setShowTeamModal(true);
                }}
                size="sm"
                className="bg-gradient-to-r from-orange-500 to-purple-600"
                data-testid="add-team"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Team
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-320px)]">
                {loadingTeams ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(teamsData || []).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="mx-auto h-12 w-12 mb-3 opacity-30" />
                        <p className="text-sm">No teams created yet</p>
                        <p className="text-xs mt-1">Click "Create Team" to get started</p>
                      </div>
                    ) : (
                      (teamsData || []).map((team: Team) => (
                        <div
                          key={team.id}
                          onClick={() => setSelectedTeam(team)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all ${
                            selectedTeam?.id === team.id
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20'
                              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 hover:dark:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold">{team.name}</h4>
                            <Badge variant={team.isActive ? 'default' : 'destructive'}>
                              {team.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {team.description || 'No description'}
                          </p>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {team.userMembers.length} users
                            </span>
                            <span className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              {team.roleMembers.length} roles
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Team Details */}
        <div className="col-span-8">
          <Card className="h-full">
            <CardContent className="p-6">
              {selectedTeam ? (
                <>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold">{selectedTeam.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedTeam.description || 'No description provided'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setEditingTeam(selectedTeam);
                          setShowTeamModal(true);
                        }}
                        size="sm"
                        variant="outline"
                        data-testid="edit-team"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this team?')) {
                            deleteTeamMutation.mutate(selectedTeam.id);
                          }
                        }}
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        data-testid="delete-team"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Team Members Section */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-base font-semibold mb-4">Members</h4>
                      
                      {/* Users */}
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-muted-foreground mb-2">
                          Direct Users ({selectedTeam.userMembers.length})
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {selectedTeam.userMembers.length === 0 ? (
                            <span className="text-xs text-muted-foreground">No direct users assigned</span>
                          ) : (
                            selectedTeam.userMembers.map(userId => {
                              const user = (usersData || []).find((u: any) => u.id === userId);
                              return (
                                <Badge key={userId} variant="secondary">
                                  {user?.email || userId}
                                </Badge>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Roles */}
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground mb-2">
                          Role Members ({selectedTeam.roleMembers.length})
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {selectedTeam.roleMembers.length === 0 ? (
                            <span className="text-xs text-muted-foreground">No roles assigned</span>
                          ) : (
                            selectedTeam.roleMembers.map(roleId => {
                              const role = (rolesData || []).find((r: any) => r.id === roleId);
                              return (
                                <Badge key={roleId} variant="outline">
                                  <Shield className="mr-1 h-3 w-3" />
                                  {role?.name || roleId}
                                </Badge>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Supervisors Section */}
                    <div>
                      <h4 className="text-base font-semibold mb-4">Supervisors</h4>
                      <Card className="bg-muted/30">
                        <CardContent className="pt-4">
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">
                                Primary Supervisor
                              </label>
                              <div className="mt-1 text-sm font-medium">
                                {selectedTeam.primarySupervisor ? (
                                  <Badge variant="default">
                                    <UserCog className="mr-1 h-3 w-3" />
                                    {(usersData || []).find((u: any) => u.id === selectedTeam.primarySupervisor)?.email || selectedTeam.primarySupervisor}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">Not assigned</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">
                                Co-Supervisors
                              </label>
                              <div className="mt-1 flex flex-wrap gap-2">
                                {selectedTeam.secondarySupervisors.length > 0 ? (
                                  selectedTeam.secondarySupervisors.map(supervisorId => {
                                    const user = (usersData || []).find((u: any) => u.id === supervisorId);
                                    return (
                                      <Badge key={supervisorId} variant="outline">
                                        <UserCog className="mr-1 h-3 w-3" />
                                        {user?.email || supervisorId}
                                      </Badge>
                                    );
                                  })
                                ) : (
                                  <span className="text-sm text-muted-foreground">None assigned</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Users className="h-12 w-12 mb-4 opacity-30" />
                  <p className="text-sm">Select a team to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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
        isLoading={createTeamMutation.isPending || updateTeamMutation.isPending}
      />
    </>
  );

  // Render Builder Tab
  const renderBuilderTab = () => (
    <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 200px)' }}>
      {/* Action Library */}
      <div style={{
        flex: '0 0 250px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        padding: '16px',
        overflowY: 'auto'
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: '0 0 16px' }}>
          Actions Library
        </h3>
        
        {/* Category Selector */}
        <div style={{ marginBottom: '16px' }}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#111827',
              fontSize: '12px'
            }}
          >
            <option value="hr">HR</option>
            <option value="finance">Finance</option>
            <option value="operations">Operations</option>
            <option value="crm">CRM</option>
            <option value="support">Support</option>
            <option value="sales">Sales</option>
          </select>
        </div>

        {/* Actions */}
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', margin: '0 0 8px' }}>
            Actions
          </h4>
          {(workflowActionsData || []).map((action: any) => (
            <div
              key={action.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', 'action');
                e.dataTransfer.setData('actionData', JSON.stringify(action));
              }}
              style={{
                padding: '8px 12px',
                background: 'rgba(255, 105, 0, 0.1)',
                border: '1px solid rgba(255, 105, 0, 0.2)',
                borderRadius: '8px',
                marginBottom: '8px',
                cursor: 'move',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Zap size={14} />
              {action.name}
            </div>
          ))}
        </div>

        {/* Triggers */}
        <div>
          <h4 style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', margin: '0 0 8px' }}>
            Triggers
          </h4>
          {(workflowTriggersData || []).map((trigger: any) => (
            <div
              key={trigger.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', 'trigger');
                e.dataTransfer.setData('triggerData', JSON.stringify(trigger));
              }}
              style={{
                padding: '8px 12px',
                background: 'rgba(123, 44, 191, 0.1)',
                border: '1px solid rgba(123, 44, 191, 0.2)',
                borderRadius: '8px',
                marginBottom: '8px',
                cursor: 'move',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Play size={14} />
              {trigger.name}
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div style={{
        flex: 1,
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>
        
        {/* Save Button */}
        <button
          onClick={() => {
            const template = {
              name: `Template ${Date.now()}`,
              category: selectedCategory,
              templateType: 'custom',
              nodes,
              edges,
              isActive: true
            };
            saveTemplateMutation.mutate(template);
          }}
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
          }}
          data-testid="save-workflow"
        >
          <Save size={16} />
          Save Workflow
        </button>
      </div>

      {/* Properties Panel */}
      {selectedNode && (
        <div style={{
          flex: '0 0 300px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          padding: '16px',
          overflowY: 'auto'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>
              Node Properties
            </h3>
            <button
              onClick={() => setSelectedNode(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                Node ID
              </label>
              <input
                type="text"
                value={selectedNode.id}
                disabled
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '6px',
                  color: '#6b7280',
                  fontSize: '12px'
                }}
              />
            </div>
            
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                Team Assignment
              </label>
              <select
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: '#111827',
                  fontSize: '12px'
                }}
              >
                <option value="">Auto-assign</option>
                {(teamsData || []).map((team: Team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                SLA (hours)
              </label>
              <input
                type="number"
                placeholder="24"
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: '#111827',
                  fontSize: '12px'
                }}
              />
            </div>
            
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                Conditions
              </label>
              <textarea
                placeholder="JSON conditions..."
                style={{
                  width: '100%',
                  padding: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  color: '#111827',
                  fontSize: '12px',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render Assignment Tab
  const renderAssignmentTab = () => {
    const teams = teamsData || [];
    const templates = templatesData || [];

    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        padding: '24px',
        height: 'calc(100vh - 200px)',
        overflowY: 'auto'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 20px' }}>
          Team-Workflow Assignment Matrix
        </h3>

        {loadingTeams || loadingTemplates || loadingAssignments ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '12px' }}>Loading assignment matrix...</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <thead>
                <tr style={{ background: 'rgba(255, 105, 0, 0.1)' }}>
                  <th style={{
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#111827',
                    borderBottom: '2px solid rgba(255, 105, 0, 0.2)'
                  }}>
                    Team / Workflow
                  </th>
                  {templates.map((template: WorkflowTemplate) => (
                    <th key={template.id} style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#374151',
                      borderBottom: '2px solid rgba(255, 105, 0, 0.2)',
                      minWidth: '120px'
                    }}>
                      {template.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teams.map((team: Team) => (
                  <tr key={team.id}>
                    <td style={{
                      padding: '12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#111827',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      {team.name}
                    </td>
                    {templates.map((template: WorkflowTemplate) => {
                      const assignment = (assignmentsData || []).find(
                        (a: TeamWorkflowAssignment) => a.teamId === team.id && a.templateId === template.id
                      );
                      return (
                        <td key={template.id} style={{
                          padding: '12px',
                          textAlign: 'center',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                          <button
                            onClick={() => {
                              if (assignment) {
                                // Remove assignment
                                updateAssignmentMutation.mutate({
                                  ...assignment,
                                  isActive: false
                                });
                              } else {
                                // Create assignment
                                updateAssignmentMutation.mutate({
                                  teamId: team.id,
                                  templateId: template.id,
                                  autoAssign: true,
                                  priority: 100,
                                  isActive: true,
                                  conditions: {}
                                });
                              }
                            }}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              border: assignment ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.2)',
                              background: assignment ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                              color: assignment ? '#10b981' : '#6b7280',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            data-testid={`assign-${team.id}-${template.id}`}
                          >
                            {assignment && <Check size={16} />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // Render Monitor Tab
  const renderMonitorTab = () => {
    const instances = (instancesData || []).filter((instance: WorkflowInstance) => 
      statusFilter === 'all' || instance.status === statusFilter
    );

    return (
      <div style={{ height: 'calc(100vh - 200px)' }}>
        {/* KPI Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {[
            { label: 'Running', count: instances.filter((i: WorkflowInstance) => i.status === 'running').length, color: '#3b82f6', icon: Activity },
            { label: 'Pending', count: instances.filter((i: WorkflowInstance) => i.status === 'pending').length, color: '#f59e0b', icon: Clock },
            { label: 'Completed', count: instances.filter((i: WorkflowInstance) => i.status === 'completed').length, color: '#10b981', icon: Check },
            { label: 'Failed', count: instances.filter((i: WorkflowInstance) => i.status === 'failed').length, color: '#ef4444', icon: AlertCircle }
          ].map(stat => (
            <div key={stat.label} style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: `${stat.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <stat.icon size={20} style={{ color: stat.color }} />
                </div>
                <span style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#111827'
                }}>
                  {stat.count}
                </span>
              </div>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: 0
              }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Instances Table */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '16px',
          padding: '24px',
          height: 'calc(100% - 150px)',
          overflowY: 'auto'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
              Workflow Instances
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['all', 'running', 'completed', 'failed'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status as any)}
                  style={{
                    padding: '6px 12px',
                    background: statusFilter === status ? 'rgba(255, 105, 0, 0.1)' : 'transparent',
                    border: statusFilter === status ? '1px solid #FF6900' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: statusFilter === status ? '#FF6900' : '#6b7280',
                    fontSize: '12px',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {loadingInstances ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ marginTop: '12px' }}>Loading instances...</p>
            </div>
          ) : instances.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px',
              color: '#6b7280'
            }}>
              <Activity size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <p>No workflow instances found</p>
            </div>
          ) : (
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    ID
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    Template
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    Status
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    Created
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {instances.map((instance: WorkflowInstance) => (
                  <tr key={instance.id}>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#111827', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      {instance.id.slice(0, 8)}...
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#111827', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      {instance.templateId}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: instance.status === 'running' ? 'rgba(59, 130, 246, 0.1)' :
                                   instance.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' :
                                   instance.status === 'failed' ? 'rgba(239, 68, 68, 0.1)' :
                                   'rgba(245, 158, 11, 0.1)',
                        color: instance.status === 'running' ? '#3b82f6' :
                               instance.status === 'completed' ? '#10b981' :
                               instance.status === 'failed' ? '#ef4444' :
                               '#f59e0b'
                      }}>
                        {instance.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', color: '#6b7280', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      {new Date(instance.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <button
                        onClick={() => setSelectedInstance(instance)}
                        style={{
                          padding: '6px',
                          background: 'transparent',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '4px',
                          color: '#6b7280',
                          cursor: 'pointer'
                        }}
                        data-testid={`view-instance-${instance.id}`}
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  // Team Modal
  const renderTeamModal = () => {
    if (!showTeamModal) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          width: '600px',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827',
            margin: '0 0 24px'
          }}>
            {editingTeam ? 'Edit Team' : 'Create Team'}
          </h3>

          {/* Team form would go here */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button
              onClick={() => {
                setShowTeamModal(false);
                setEditingTeam(null);
              }}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                color: '#6b7280',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Save team logic
                setShowTeamModal(false);
                setEditingTeam(null);
              }}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #FF6900, #7B2CBF)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              {editingTeam ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#111827',
            margin: '0 0 8px'
          }}>
            Workflow Management System
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: 0
          }}>
            Universal scalable approval hierarchy with team-based supervision
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          padding: '4px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px'
        }}>
          {[
            { id: 'teams', label: 'Teams', icon: Users },
            { id: 'builder', label: 'Builder', icon: GitBranch },
            { id: 'assignment', label: 'Assignment', icon: Layers },
            { id: 'monitor', label: 'Monitor', icon: Activity }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                flex: 1,
                padding: '12px',
                background: activeTab === tab.id ? 'linear-gradient(135deg, #FF6900, #7B2CBF)' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#6b7280',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'teams' && renderTeamsTab()}
        {activeTab === 'builder' && renderBuilderTab()}
        {activeTab === 'assignment' && renderAssignmentTab()}
        {activeTab === 'monitor' && renderMonitorTab()}
      </div>
    </Layout>
  );
};

export default WorkflowManagementPage;