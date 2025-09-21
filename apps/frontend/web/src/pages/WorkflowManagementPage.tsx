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
import { apiRequest, queryClient } from '@/lib/queryClient';
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
      refetchTeams();
      setShowTeamModal(false);
      setEditingTeam(null);
    }
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({ id, ...team }: Team) => apiRequest(`/api/teams/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(team)
    }),
    onSuccess: () => {
      refetchTeams();
      setShowTeamModal(false);
      setEditingTeam(null);
    }
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/teams/${id}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      refetchTeams();
      setSelectedTeam(null);
    }
  });

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
    <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 200px)' }}>
      {/* Team List */}
      <div style={{
        flex: '0 0 35%',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        padding: '24px',
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>
            Teams
          </h3>
          <button
            onClick={() => setShowTeamModal(true)}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #FF6900, #7B2CBF)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            data-testid="add-team"
          >
            <Plus size={16} />
            Create Team
          </button>
        </div>

        {loadingTeams ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: '12px' }}>Loading teams...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(teamsData || []).map((team: Team) => (
              <div
                key={team.id}
                onClick={() => setSelectedTeam(team)}
                style={{
                  padding: '16px',
                  background: selectedTeam?.id === team.id ? 'rgba(255, 105, 0, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                  border: selectedTeam?.id === team.id ? '2px solid #FF6900' : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>
                    {team.name}
                  </h4>
                  <span style={{
                    padding: '2px 8px',
                    background: team.isActive ? '#10b981' : '#ef4444',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '600'
                  }}>
                    {team.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px' }}>
                  {team.description || 'No description'}
                </p>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#9ca3af' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={12} />
                    {team.userMembers.length} users
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Shield size={12} />
                    {team.roleMembers.length} roles
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Team Details */}
      <div style={{
        flex: 1,
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        padding: '24px',
        overflowY: 'auto'
      }}>
        {selectedTeam ? (
          <>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px'
            }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: '0 0 4px' }}>
                  {selectedTeam.name}
                </h3>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
                  {selectedTeam.description}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    setEditingTeam(selectedTeam);
                    setShowTeamModal(true);
                  }}
                  style={{
                    padding: '8px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '8px',
                    color: '#3b82f6',
                    cursor: 'pointer'
                  }}
                  data-testid="edit-team"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this team?')) {
                      deleteTeamMutation.mutate(selectedTeam.id);
                    }
                  }}
                  style={{
                    padding: '8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '8px',
                    color: '#ef4444',
                    cursor: 'pointer'
                  }}
                  data-testid="delete-team"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Team Members Section */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: '0 0 16px' }}>
                Members
              </h4>
              
              {/* Users */}
              <div style={{ marginBottom: '16px' }}>
                <h5 style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', margin: '0 0 8px' }}>
                  Direct Users ({selectedTeam.userMembers.length})
                </h5>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  {selectedTeam.userMembers.map(userId => (
                    <span key={userId} style={{
                      padding: '4px 12px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      borderRadius: '16px',
                      fontSize: '12px',
                      color: '#3b82f6'
                    }}>
                      {userId}
                    </span>
                  ))}
                </div>
              </div>

              {/* Roles */}
              <div>
                <h5 style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', margin: '0 0 8px' }}>
                  Role Members ({selectedTeam.roleMembers.length})
                </h5>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  {selectedTeam.roleMembers.map(roleId => (
                    <span key={roleId} style={{
                      padding: '4px 12px',
                      background: 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                      borderRadius: '16px',
                      fontSize: '12px',
                      color: '#8b5cf6'
                    }}>
                      {roleId}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Supervisors Section */}
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: '0 0 16px' }}>
                Supervisors
              </h4>
              <div style={{
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                    Primary Supervisor
                  </label>
                  <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                    {selectedTeam.primarySupervisor || 'Not assigned'}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                    Co-Supervisors
                  </label>
                  <div style={{ fontSize: '14px', color: '#111827' }}>
                    {selectedTeam.secondarySupervisors.length > 0
                      ? selectedTeam.secondarySupervisors.join(', ')
                      : 'None assigned'}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#6b7280'
          }}>
            <Users size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <p>Select a team to view details</p>
          </div>
        )}
      </div>
    </div>
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

        {/* Modals */}
        {renderTeamModal()}
      </div>
    </Layout>
  );
};

export default WorkflowManagementPage;