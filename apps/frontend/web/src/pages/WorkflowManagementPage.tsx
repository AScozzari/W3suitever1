import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// 🚀 WORKFLOW EXECUTION ENGINE
import { 
  executeWorkflow,
  getWorkflowStatus,
  pauseWorkflow,
  resumeWorkflow,
  cancelWorkflow,
  workflowEngine,
  ExecutionStatus
} from '@/services/workflowExecution';

// 🔍 WORKFLOW VALIDATION SYSTEM
import { 
  validateWorkflow,
  validateQuick,
  getValidationSummary,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion
} from '@/services/workflowValidation';

// 🏪 ZUSTAND STATE MANAGEMENT  
import { 
  useWorkflowStore,
  useWorkflowNodes,
  useWorkflowEdges,
  useWorkflowViewport,
  useWorkflowUI,
  useWorkflowHistory,
  useWorkflowTemplates
} from '@/stores/workflowStore';

// UI Components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

// React Flow + Drag & Drop
import { 
  ReactFlow, 
  ReactFlowProvider,
  useNodesState, 
  useEdgesState, 
  addEdge,
  getIncomers,
  getOutgoers, 
  getConnectedEdges,
  Controls,
  Background,
  Node,
  Edge,
  Connection,
  NodeTypes,
  useReactFlow // ✅ ADDED: For drag & drop coordinate conversion
} from 'reactflow';
import 'reactflow/dist/style.css';

// Icons
import {
  Users, User, Plus, Settings, GitBranch, Activity, Zap, Target, 
  BarChart3, CheckCircle, Clock, AlertCircle, AlertTriangle, TrendingUp,
  ArrowRight, Filter, Search, Layers, Play, Pause,
  Building, Shield, UserCog, Eye, MoreHorizontal, Workflow,
  Save, DollarSign, FileText, Wrench, X, Info, Bell, Loader2,
  RefreshCw, Database, Mail, Undo2, Redo2, Upload, Server, Folder
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

// ==================== REACT FLOW WORKFLOW BUILDER ====================

// Custom node types for workflow actions
const ActionNode = ({ data }: { data: any }) => (
  <div className="bg-white border-2 border-slate-200 rounded-lg p-4 shadow-md min-w-[200px]">
    <div className="flex items-center gap-2 mb-2">
      <div className={`w-3 h-3 rounded-full ${
        data.category === 'hr' ? 'bg-green-500' :
        data.category === 'finance' ? 'bg-blue-500' :
        data.category === 'operations' ? 'bg-orange-500' :
        data.category === 'it' ? 'bg-purple-500' :
        data.category === 'crm' ? 'bg-pink-500' :
        data.category === 'support' ? 'bg-yellow-500' : 'bg-slate-500'
      }`} />
      <span className="font-medium text-sm text-slate-700">{data.category?.toUpperCase()}</span>
    </div>
    <div className="text-sm font-semibold text-slate-900 mb-1">
      {data.label}
    </div>
    <div className="text-xs text-slate-600">
      {data.description}
    </div>
    {data.approver && (
      <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
        <Users className="w-3 h-3" />
        {data.approver}
      </div>
    )}
  </div>
);

const StartNode = ({ data }: { data: any }) => (
  <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4 shadow-md">
    <div className="flex items-center gap-2">
      <Play className="w-4 h-4" />
      <span className="font-semibold">START</span>
    </div>
    <div className="text-xs mt-1 opacity-80">
      {data.label || 'Workflow Start'}
    </div>
  </div>
);

const EndNode = ({ data }: { data: any }) => (
  <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg p-4 shadow-md">
    <div className="flex items-center gap-2">
      <CheckCircle className="w-4 h-4" />
      <span className="font-semibold">END</span>
    </div>
    <div className="text-xs mt-1 opacity-80">
      {data.label || 'Workflow End'}
    </div>
  </div>
);

const DecisionNode = ({ data }: { data: any }) => (
  <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-lg p-4 shadow-md transform rotate-45">
    <div className="flex items-center gap-2 transform -rotate-45">
      <AlertCircle className="w-4 h-4" />
      <span className="font-semibold text-xs">DECISION</span>
    </div>
  </div>
);

// Define custom node types
const nodeTypes: NodeTypes = {
  action: ActionNode,
  start: StartNode,
  end: EndNode,
  decision: DecisionNode,
};

// Initial workflow nodes
const initialNodes: Node[] = [
  {
    id: 'start',
    type: 'start',
    position: { x: 100, y: 100 },
    data: { label: 'Workflow Start' }
  },
  {
    id: 'end',
    type: 'end', 
    position: { x: 100, y: 400 },
    data: { label: 'Workflow Complete' }
  }
];

const initialEdges: Edge[] = [];

// ==================== ENTERPRISE ACTION LIBRARY ====================

// Enterprise Action Library - 15+ azioni professionali
const ENTERPRISE_ACTIONS = {
  // HR ACTIONS (8 azioni)
  'hr-approval': {
    id: 'hr-approval',
    name: 'HR Approval',
    description: 'Standard HR approval process',
    category: 'hr',
    icon: CheckCircle,
    requiredPermission: 'hr.approve',
    priority: 100
  },
  'leave-request': {
    id: 'leave-request', 
    name: 'Leave Request',
    description: 'Process employee leave requests',
    category: 'hr',
    icon: Clock,
    requiredPermission: 'hr.leave.process',
    priority: 90
  },
  'timesheet-approval': {
    id: 'timesheet-approval',
    name: 'Timesheet Approval', 
    description: 'Approve employee timesheets',
    category: 'hr',
    icon: Clock,
    requiredPermission: 'hr.timesheet.approve',
    priority: 80
  },
  'performance-review': {
    id: 'performance-review',
    name: 'Performance Review',
    description: 'Employee performance evaluation',
    category: 'hr', 
    icon: Target,
    requiredPermission: 'hr.review.conduct',
    priority: 70
  },
  'onboarding-flow': {
    id: 'onboarding-flow',
    name: 'Onboarding Process',
    description: 'New employee onboarding workflow',
    category: 'hr',
    icon: Users,
    requiredPermission: 'hr.onboarding.manage',
    priority: 85
  },
  'termination-process': {
    id: 'termination-process',
    name: 'Termination Process',
    description: 'Employee termination workflow',
    category: 'hr',
    icon: X,
    requiredPermission: 'hr.termination.process',
    priority: 95
  },
  'training-assignment': {
    id: 'training-assignment',
    name: 'Training Assignment',
    description: 'Assign training to employees',
    category: 'hr',
    icon: Users,
    requiredPermission: 'hr.training.assign',
    priority: 60
  },
  'compliance-check': {
    id: 'compliance-check',
    name: 'Compliance Check',
    description: 'HR compliance verification',
    category: 'hr',
    icon: Shield,
    requiredPermission: 'hr.compliance.check',
    priority: 75
  },

  // FINANCE ACTIONS (7 azioni)
  'expense-approval': {
    id: 'expense-approval',
    name: 'Expense Approval',
    description: 'Approve employee expenses',
    category: 'finance',
    icon: DollarSign,
    requiredPermission: 'finance.expense.approve',
    priority: 90
  },
  'invoice-processing': {
    id: 'invoice-processing',
    name: 'Invoice Processing',
    description: 'Process vendor invoices',
    category: 'finance',
    icon: FileText,
    requiredPermission: 'finance.invoice.process',
    priority: 85
  },
  'budget-check': {
    id: 'budget-check',
    name: 'Budget Verification',
    description: 'Verify budget availability',
    category: 'finance',
    icon: BarChart3,
    requiredPermission: 'finance.budget.check',
    priority: 80
  },
  'payment-authorization': {
    id: 'payment-authorization',
    name: 'Payment Authorization',
    description: 'Authorize financial payments',
    category: 'finance',
    icon: DollarSign,
    requiredPermission: 'finance.payment.authorize',
    priority: 95
  },
  'purchase-order': {
    id: 'purchase-order',
    name: 'Purchase Order',
    description: 'Create and approve purchase orders',
    category: 'finance',
    icon: FileText,
    requiredPermission: 'finance.po.create',
    priority: 75
  },
  'vendor-payment': {
    id: 'vendor-payment',
    name: 'Vendor Payment',
    description: 'Process vendor payments',
    category: 'finance',
    icon: DollarSign,
    requiredPermission: 'finance.vendor.pay',
    priority: 85
  },
  'audit-trigger': {
    id: 'audit-trigger',
    name: 'Audit Trigger',
    description: 'Trigger financial audit process',
    category: 'finance',
    icon: Shield,
    requiredPermission: 'finance.audit.trigger',
    priority: 70
  },

  // OPERATIONS ACTIONS (7 azioni)
  'email-notification': {
    id: 'email-notification',
    name: 'Send Email',
    description: 'Send email notifications',
    category: 'operations',
    icon: Bell,
    requiredPermission: 'operations.email.send',
    priority: 60
  },
  'webhook-trigger': {
    id: 'webhook-trigger',
    name: 'Webhook Call',
    description: 'Trigger external webhook',
    category: 'operations',
    icon: Zap,
    requiredPermission: 'operations.webhook.call',
    priority: 70
  },
  'database-operation': {
    id: 'database-operation',
    name: 'Database Operation',
    description: 'Execute database operations',
    category: 'operations',
    icon: Settings,
    requiredPermission: 'operations.db.execute',
    priority: 75
  },
  'api-call': {
    id: 'api-call',
    name: 'API Request',
    description: 'Make external API calls',
    category: 'operations',
    icon: Zap,
    requiredPermission: 'operations.api.call',
    priority: 65
  },
  'conditional-branch': {
    id: 'conditional-branch',
    name: 'Conditional Logic',
    description: 'If/then/else branching',
    category: 'operations',
    icon: GitBranch,
    requiredPermission: 'operations.logic.branch',
    priority: 50
  },
  'delay-timer': {
    id: 'delay-timer',
    name: 'Wait/Delay',
    description: 'Pause workflow execution',
    category: 'operations',
    icon: Clock,
    requiredPermission: 'operations.timer.set',
    priority: 40
  },
  'escalation-trigger': {
    id: 'escalation-trigger',
    name: 'Escalation Trigger',
    description: 'Escalate to supervisor',
    category: 'operations',
    icon: AlertCircle,
    requiredPermission: 'operations.escalate',
    priority: 80
  }
};

// ==================== ENTERPRISE TRIGGER LIBRARY ====================

// Enterprise Trigger Library - 8+ triggers essenziali per iniziare workflow
const ENTERPRISE_TRIGGERS = {
  // SCHEDULE TRIGGERS (3 triggers)
  'schedule-time': {
    id: 'schedule-time',
    name: 'Scheduled Time',
    description: 'Start workflow at specific time/date',
    category: 'schedule',
    icon: Clock,
    configurableFields: ['datetime', 'timezone', 'recurring'],
    priority: 95
  },
  'recurring-daily': {
    id: 'recurring-daily',
    name: 'Daily Recurring',
    description: 'Start workflow daily at specified time',
    category: 'schedule',
    icon: RefreshCw,
    configurableFields: ['time', 'timezone', 'weekdays'],
    priority: 90
  },
  'cron-expression': {
    id: 'cron-expression',
    name: 'Cron Schedule',
    description: 'Advanced cron-based scheduling',
    category: 'schedule',
    icon: Clock,
    configurableFields: ['cronExpression', 'timezone'],
    priority: 85
  },

  // EVENT TRIGGERS (3 triggers)
  'database-change': {
    id: 'database-change',
    name: 'Database Change',
    description: 'Trigger on database record changes',
    category: 'event',
    icon: Database,
    configurableFields: ['table', 'operation', 'conditions'],
    priority: 90
  },
  'email-received': {
    id: 'email-received',
    name: 'Email Received',
    description: 'Start workflow when email is received',
    category: 'event',
    icon: Mail,
    configurableFields: ['emailAddress', 'subject', 'filters'],
    priority: 85
  },
  'webhook-received': {
    id: 'webhook-received',
    name: 'Webhook Received',
    description: 'Trigger from external API webhook',
    category: 'event',
    icon: Zap,
    configurableFields: ['endpoint', 'method', 'authentication'],
    priority: 80
  },

  // USER TRIGGERS (2 triggers)
  'manual-start': {
    id: 'manual-start',
    name: 'Manual Start',
    description: 'User manually starts the workflow',
    category: 'user',
    icon: Play,
    configurableFields: ['buttonText', 'permissions', 'confirmation'],
    priority: 100
  },
  'form-submission': {
    id: 'form-submission',
    name: 'Form Submission',
    description: 'Trigger when form is submitted',
    category: 'user',
    icon: FileText,
    configurableFields: ['formId', 'requiredFields', 'validation'],
    priority: 95
  },

  // SYSTEM TRIGGERS (2 triggers)
  'file-upload': {
    id: 'file-upload',
    name: 'File Upload',
    description: 'Start workflow when file is uploaded',
    category: 'system',
    icon: Upload,
    configurableFields: ['location', 'fileTypes', 'maxSize'],
    priority: 75
  },
  'error-occurred': {
    id: 'error-occurred',
    name: 'Error/Exception',
    description: 'Trigger on system errors or exceptions',
    category: 'system',
    icon: AlertTriangle,
    configurableFields: ['errorType', 'severity', 'source'],
    priority: 70
  }
};

// Trigger Category configurations
const TRIGGER_CATEGORIES = {
  'schedule': {
    icon: Clock,
    color: 'bg-purple-500',
    bgClass: 'bg-purple-100 dark:bg-purple-900',
    textClass: 'text-purple-700 dark:text-purple-300',
    label: 'Schedule'
  },
  'event': {
    icon: Zap,
    color: 'bg-cyan-500',
    bgClass: 'bg-cyan-100 dark:bg-cyan-900',
    textClass: 'text-cyan-700 dark:text-cyan-300',
    label: 'Event'
  },
  'user': {
    icon: User,
    color: 'bg-teal-500',
    bgClass: 'bg-teal-100 dark:bg-teal-900',
    textClass: 'text-teal-700 dark:text-teal-300',
    label: 'User'
  },
  'system': {
    icon: Server,
    color: 'bg-slate-500',
    bgClass: 'bg-slate-100 dark:bg-slate-900',
    textClass: 'text-slate-700 dark:text-slate-300',
    label: 'System'
  }
};

// Category configurations with icons and colors for Action Library
const CATEGORIES = {
  'hr': {
    icon: Users,
    color: 'bg-green-500',
    bgClass: 'bg-green-100 dark:bg-green-900',
    textClass: 'text-green-700 dark:text-green-300',
    label: 'HR'
  },
  'finance': {
    icon: DollarSign,
    color: 'bg-blue-500',
    bgClass: 'bg-blue-100 dark:bg-blue-900',
    textClass: 'text-blue-700 dark:text-blue-300',
    label: 'Finance'
  },
  'operations': {
    icon: Settings,
    color: 'bg-orange-500',
    bgClass: 'bg-orange-100 dark:bg-orange-900',
    textClass: 'text-orange-700 dark:text-orange-300',
    label: 'Operations'
  },
  'legal': {
    icon: Shield,
    color: 'bg-purple-500',
    bgClass: 'bg-purple-100 dark:bg-purple-900',
    textClass: 'text-purple-700 dark:text-purple-300',
    label: 'Legal'
  },
  'procurement': {
    icon: FileText,
    color: 'bg-pink-500',
    bgClass: 'bg-pink-100 dark:bg-pink-900',
    textClass: 'text-pink-700 dark:text-pink-300',
    label: 'Procurement'
  },
  'it': {
    icon: Wrench,
    color: 'bg-cyan-500',
    bgClass: 'bg-cyan-100 dark:bg-cyan-900',
    textClass: 'text-cyan-700 dark:text-cyan-300',
    label: 'IT'
  }
};

const WorkflowManagementPage: React.FC = () => {
  const { toast } = useToast();
  const [currentModule, setCurrentModule] = useState('workflow');
  const [activeView, setActiveView] = useState<'dashboard' | 'builder' | 'teams' | 'analytics'>('dashboard');
  
  // Team Management State
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  
  // 🏪 TEMPORARY LOCAL STATE (Zustand disabled to fix infinite loop)
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isRunning, setRunning] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  
  // Temporary placeholder actions
  const canUndo = false;
  const canRedo = false;
  const historyLength = 0;
  const undo = () => {};
  const redo = () => {};
  const saveSnapshot = () => {};
  const saveTemplate = () => {};
  const loadTemplate = () => {};
  const clearWorkflow = () => {
    setNodes([]);
    setEdges([]);
  };
  const addNode = (node: any) => setNodes(prev => [...prev, node]);
  const removeNode = (id: string) => setNodes(prev => prev.filter(n => n.id !== id));
  const addStoreEdge = (edge: any) => setEdges(prev => [...prev, edge]);
  const removeEdge = (id: string) => setEdges(prev => prev.filter(e => e.id !== id));

  // React Flow change handlers (integrate with Zustand)
  const onNodesChange = useCallback((changes: any) => {
    // For now, we'll implement a simple sync - can be enhanced later
    // This maintains React Flow's built-in functionality
  }, []);

  const onEdgesChange = useCallback((changes: any) => {
    // For now, we'll implement a simple sync - can be enhanced later  
  }, []);
  
  // Team Modal State  
  const [teamFormData, setTeamFormData] = useState<Partial<Team>>({
    name: '',
    description: '',
    teamType: 'functional',
    userMembers: [],
    roleMembers: [],
    primarySupervisor: undefined,
    secondarySupervisors: [],
    isActive: true
  });
  const [selectedTab, setSelectedTab] = useState<'users' | 'roles'>('users');
  const [teamSearchTerm, setTeamSearchTerm] = useState('');

  // ==================== DATA QUERIES ====================
  
  // Teams data
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

  // Users and Roles for Team Modal
  const { data: usersData = [], isLoading: loadingUsers } = useQuery<any[]>({
    queryKey: ['/api/users'],
    enabled: showTeamModal,
  });

  const { data: rolesData = [], isLoading: loadingRoles } = useQuery<any[]>({
    queryKey: ['/api/roles'],
    enabled: showTeamModal,
  });

  // Filter functions for Team Modal
  const filteredUsers = usersData.filter((user: any) => 
    user.email?.toLowerCase().includes(teamSearchTerm.toLowerCase()) ||
    user.firstName?.toLowerCase().includes(teamSearchTerm.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(teamSearchTerm.toLowerCase())
  );

  const filteredRoles = rolesData.filter((role: any) =>
    role.name?.toLowerCase().includes(teamSearchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(teamSearchTerm.toLowerCase())
  );

  // Toggle functions for Team Modal
  const toggleUserMember = (userId: string) => {
    setTeamFormData(prev => ({
      ...prev,
      userMembers: (prev.userMembers || []).includes(userId)
        ? (prev.userMembers || []).filter(id => id !== userId)
        : [...(prev.userMembers || []), userId]
    }));
  };

  const toggleRoleMember = (roleId: string) => {
    setTeamFormData(prev => ({
      ...prev,
      roleMembers: (prev.roleMembers || []).includes(roleId)
        ? (prev.roleMembers || []).filter(id => id !== roleId)
        : [...(prev.roleMembers || []), roleId]
    }));
  };

  const toggleSecondarySupervisor = (userId: string) => {
    setTeamFormData(prev => ({
      ...prev,
      secondarySupervisors: (prev.secondarySupervisors || []).includes(userId)
        ? (prev.secondarySupervisors || []).filter(id => id !== userId)
        : [...(prev.secondarySupervisors || []), userId]
    }));
  };

  // ==================== WORKFLOW BUILDER CORE FUNCTIONS ====================
  
  // ✅ FIX CRITICAL: onConnect handler - Far funzionare le connessioni
  const onConnect = useCallback(
    (params: Connection) => {
      console.log('Creating connection:', params);
      setEdges((eds) => addEdge(params, eds));
      toast({
        title: "Connection Created",
        description: "Nodes connected successfully",
      });
    },
    [setEdges, toast]
  );

  // ✅ FIX CRITICAL: onNodesDelete handler - Permettere cancellazione nodi  
  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      console.log('Deleting nodes:', deleted.map(n => n.id));
      
      // Remove edges connected to deleted nodes
      setEdges((currentEdges) => {
        const deletedIds = deleted.map(node => node.id);
        return currentEdges.filter(edge => 
          !deletedIds.includes(edge.source) && !deletedIds.includes(edge.target)
        );
      });

      toast({
        title: "Nodes Deleted", 
        description: `${deleted.length} node(s) and their connections removed`,
      });
    },
    [setEdges, toast]
  );

  // 🚀 PROFESSIONAL WORKFLOW EXECUTION ENGINE INTEGRATION
  const [executionInstanceId, setExecutionInstanceId] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<any>(null);

  // 🔍 ENTERPRISE VALIDATION SYSTEM INTEGRATION
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // 📋 TEMPLATE MANAGEMENT SYSTEM INTEGRATION
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('general');

  // Real-time validation (debounced) - DISABLED to prevent infinite loop
  /*useEffect(() => {
    if (nodes.length === 0) {
      setValidationResult(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      setIsValidating(true);
      try {
        const result = validateWorkflow(nodes, edges);
        setValidationResult(result);
      } catch (error) {
        console.error('Validation error:', error);
      } finally {
        setIsValidating(false);
      }
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timeoutId);
  }, [nodes, edges]);*/

  // 🔄 KEYBOARD SHORTCUTS FOR UNDO/REDO - DISABLED to prevent infinite loop
  /*useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent shortcuts when typing in input fields
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return;
      }

      // Handle Ctrl+Z (Undo)
      if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (canUndo) {
          undo();
          toast({
            title: '🔄 Undo successful',
            description: 'Workflow state restored to previous version',
          });
        }
      }

      // Handle Ctrl+Y or Ctrl+Shift+Z (Redo)  
      if ((event.ctrlKey && event.key === 'y') || 
          (event.ctrlKey && event.shiftKey && event.key === 'z')) {
        event.preventDefault();
        if (canRedo) {
          redo();
          toast({
            title: '⏩ Redo successful', 
            description: 'Workflow state moved forward',
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, undo, redo, toast]);*/

  // Workflow Builder Functions
  const handleSaveWorkflow = () => {
    try {
      const workflowData = {
        name: 'New Workflow',
        description: 'Created from workflow builder',
        nodes: nodes,
        edges: edges,
        status: 'draft'
      };
      
      console.log('Saving workflow:', workflowData);
      
      toast({
        title: "Workflow Saved",
        description: "Workflow has been saved successfully",
      });
      
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast({
        title: "Error",
        description: "Failed to save workflow",
        variant: "destructive",
      });
    }
  };

  // 🚀 ENHANCED: Real Workflow Execution with Engine
  const handleRunWorkflow = async () => {
    try {
      if (nodes.length === 0) {
        toast({
          title: "Cannot Run Workflow",
          description: "Add some nodes to the workflow first",
          variant: "destructive",
        });
        return;
      }

      setRunning(true); // ✅ UPDATED: Use Zustand store action
      console.log('🚀 Starting workflow execution with nodes:', nodes);
      
      // 🌟 USE REAL EXECUTION ENGINE
      const instanceId = await executeWorkflow(
        `workflow-${Date.now()}`,
        nodes,
        edges,
        { startedBy: 'user', timestamp: new Date() },
        { userId: 'current-user', tenantId: 'current-tenant' }
      );
      
      setExecutionInstanceId(instanceId);
      
      // Listen to execution events
      workflowEngine.addEventListener(instanceId, (event: string, data: any) => {
        console.log(`📡 Workflow Event: ${event}`, data);
        
        if (event === 'workflowCompleted') {
          setRunning(false);
          setExecutionStatus('completed');
          toast({
            title: "🎉 Workflow Completed!",
            description: `Executed ${data.completedNodes} nodes in ${Math.round(data.duration / 1000)}s`,
          });
        } else if (event === 'executionError') {
          setRunning(false);
          setExecutionStatus('failed');
          toast({
            title: "❌ Workflow Failed",
            description: `Error in node: ${data.nodeId}`,
            variant: "destructive",
          });
        } else if (event === 'waitingForApproval') {
          setExecutionStatus('waiting');
          toast({
            title: "⏳ Waiting for Approval",
            description: `${data.message} from ${data.approverRole}`,
          });
        }
      });
      
      toast({
        title: "🚀 Workflow Started",
        description: `Execution ID: ${instanceId.slice(-8)}`,
      });
      
    } catch (error) {
      setRunning(false);
      setExecutionStatus('failed');
      console.error('Error running workflow:', error);
      toast({
        title: "❌ Execution Error",
        description: "Failed to start workflow execution",
        variant: "destructive",
      });
    }
  };

  // ✅ UPDATED: addActionNode con Enterprise Action Library
  const addActionNode = (actionId: string) => {
    const action = ENTERPRISE_ACTIONS[actionId as keyof typeof ENTERPRISE_ACTIONS];
    
    if (!action) {
      toast({
        title: "Error",
        description: "Unknown action type",
        variant: "destructive",
      });
      return;
    }

    const newNode = {
      id: `node-${Date.now()}`,
      type: 'action',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { 
        label: action.name,
        category: action.category,
        description: action.description,
        actionId: action.id,
        requiredPermission: action.requiredPermission,
        priority: action.priority
      },
    };
    
    setNodes((nds) => nds.concat(newNode));
    
    toast({
      title: "Action Added",
      description: `${action.name} added to workflow`,
    });
  };

  const addDecisionNode = () => {
    const newNode = {
      id: `decision-${Date.now()}`,
      type: 'decision', // ✅ FIXED: Usa custom type invece di 'default'
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { 
        label: 'Decision Node',
        type: 'decision',
        description: 'Conditional branching logic'
      },
    };
    
    setNodes((nds) => nds.concat(newNode));
    
    toast({
      title: "Decision Node Added",
      description: "Decision node added to workflow",
    });
  };

  // ✅ NEW: addTriggerNode con Enterprise Trigger Library
  const addTriggerNode = (triggerId: string) => {
    const trigger = ENTERPRISE_TRIGGERS[triggerId as keyof typeof ENTERPRISE_TRIGGERS];
    
    if (!trigger) {
      toast({
        title: "Error",
        description: "Unknown trigger type",
        variant: "destructive",
      });
      return;
    }

    // Check if there's already a trigger (start node) in the workflow
    const existingTrigger = nodes.find(node => node.type === 'start' || node.data?.nodeType === 'trigger');
    if (existingTrigger) {
      toast({
        title: "Trigger Already Exists",
        description: "Workflows can only have one trigger/start point",
        variant: "destructive",
      });
      return;
    }

    const newNode = {
      id: `trigger-${Date.now()}`,
      type: 'start', // Trigger nodes sono start nodes
      position: { x: 50, y: 50 }, // Posizione fissa per start node
      data: { 
        label: trigger.name,
        category: trigger.category,
        description: trigger.description,
        triggerId: trigger.id,
        configurableFields: trigger.configurableFields,
        priority: trigger.priority,
        nodeType: 'trigger' // Identificatore per trigger nodes
      },
    };
    
    setNodes((nds) => [newNode, ...nds]); // Trigger al primo posto
    
    toast({
      title: "Trigger Added",
      description: `${trigger.name} trigger added as workflow start point`,
    });
  };

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
            <div className="h-64 overflow-y-auto">
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
            </div>
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
        {/* ✅ ENTERPRISE ACTION LIBRARY PALETTE */}
        <div className="lg:col-span-1">
          <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg h-[600px]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="w-5 h-5" />
                Workflow Library
              </CardTitle>
              <CardDescription>Triggers, Actions & Control Flow</CardDescription>
              
              {/* Search Actions */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search actions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)} // ✅ UPDATED: Uses Zustand store action
                  className="pl-10 bg-white/5 border-white/20"
                />
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant={selectedCategory === null ? "default" : "outline"}
                  onClick={() => setSelectedCategory(null)} // ✅ UPDATED: Uses Zustand store action
                  className="h-7 px-2 text-xs"
                >
                  All
                </Button>
                {Object.entries(CATEGORIES).map(([key, category]) => {
                  const Icon = category.icon;
                  return (
                    <Button
                      key={key}
                      size="sm"
                      variant={selectedCategory === key ? "default" : "outline"}
                      onClick={() => setSelectedCategory(key)} // ✅ UPDATED: Uses Zustand store action
                      className={`h-7 px-2 text-xs ${selectedCategory === key ? category.bgClass : ''}`}
                    >
                      <Icon className="w-3 h-3 mr-1" />
                      {category.label}
                    </Button>
                  );
                })}
              </div>
            </CardHeader>
            
            <CardContent className="p-4">
              <div className="h-[350px] overflow-y-auto">
                <div className="space-y-4">
                  {/* ✅ ENTERPRISE TRIGGER LIBRARY */}
                  <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                      <Play className="w-5 h-5 text-purple-600" />
                      Workflow Triggers (10)
                    </h3>
                    
                    {/* Schedule Triggers */}
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Schedule Triggers ({Object.values(ENTERPRISE_TRIGGERS).filter(t => t.category === 'schedule').length})
                      </h4>
                      <div className="space-y-1">
                        {Object.values(ENTERPRISE_TRIGGERS)
                          .filter(trigger => trigger.category === 'schedule')
                          .filter(trigger => !searchTerm || trigger.name.toLowerCase().includes(searchTerm.toLowerCase()) || trigger.description.toLowerCase().includes(searchTerm.toLowerCase()))
                          .sort((a, b) => b.priority - a.priority)
                          .map(trigger => {
                            const Icon = trigger.icon;
                            return (
                              <Button
                                key={trigger.id}
                                variant="outline"
                                size="sm"
                                draggable // ✅ ADDED: Make draggable
                                onDragStart={(e) => handleDragStart(e, 'start', { 
                                  label: trigger.name,
                                  type: 'start',
                                  description: trigger.description,
                                  icon: trigger.icon,
                                  category: trigger.category,
                                  triggerId: trigger.id,
                                  ...trigger
                                })} // ✅ ADDED: Professional drag & drop
                                onClick={() => addTriggerNode(trigger.id)}
                                className="w-full justify-start h-auto p-3 bg-purple-50/50 hover:bg-purple-100/70 border-purple-200/50 text-left cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02]" 
                                data-testid={`trigger-${trigger.id}`}
                              >
                                <div className="flex items-start gap-2 w-full">
                                  <Icon className="w-4 h-4 mt-0.5 text-purple-600 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium text-sm text-purple-800">{trigger.name}</div>
                                    <div className="text-xs text-purple-600 mt-0.5 truncate">{trigger.description}</div>
                                  </div>
                                </div>
                              </Button>
                            );
                          })}
                      </div>
                    </div>

                    {/* Event Triggers */}
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-cyan-700 dark:text-cyan-300 mb-2 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Event Triggers ({Object.values(ENTERPRISE_TRIGGERS).filter(t => t.category === 'event').length})
                      </h4>
                      <div className="space-y-1">
                        {Object.values(ENTERPRISE_TRIGGERS)
                          .filter(trigger => trigger.category === 'event')
                          .filter(trigger => !searchTerm || trigger.name.toLowerCase().includes(searchTerm.toLowerCase()) || trigger.description.toLowerCase().includes(searchTerm.toLowerCase()))
                          .sort((a, b) => b.priority - a.priority)
                          .map(trigger => {
                            const Icon = trigger.icon;
                            return (
                              <Button
                                key={trigger.id}
                                variant="outline"
                                size="sm"
                                draggable // ✅ ADDED: Make draggable
                                onDragStart={(e) => handleDragStart(e, 'start', { 
                                  label: trigger.name,
                                  type: 'start',
                                  description: trigger.description,
                                  icon: trigger.icon,
                                  category: trigger.category,
                                  triggerId: trigger.id,
                                  ...trigger
                                })} // ✅ ADDED: Event triggers drag & drop
                                onClick={() => addTriggerNode(trigger.id)}
                                className="w-full justify-start h-auto p-3 bg-cyan-50/50 hover:bg-cyan-100/70 border-cyan-200/50 text-left cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02]"
                                data-testid={`trigger-${trigger.id}`}
                              >
                                <div className="flex items-start gap-2 w-full">
                                  <Icon className="w-4 h-4 mt-0.5 text-cyan-600 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium text-sm text-cyan-800">{trigger.name}</div>
                                    <div className="text-xs text-cyan-600 mt-0.5 truncate">{trigger.description}</div>
                                  </div>
                                </div>
                              </Button>
                            );
                          })}
                      </div>
                    </div>

                    {/* User & System Triggers */}
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-teal-700 dark:text-teal-300 mb-2 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        User & System Triggers ({Object.values(ENTERPRISE_TRIGGERS).filter(t => t.category === 'user' || t.category === 'system').length})
                      </h4>
                      <div className="space-y-1">
                        {Object.values(ENTERPRISE_TRIGGERS)
                          .filter(trigger => trigger.category === 'user' || trigger.category === 'system')
                          .filter(trigger => !searchTerm || trigger.name.toLowerCase().includes(searchTerm.toLowerCase()) || trigger.description.toLowerCase().includes(searchTerm.toLowerCase()))
                          .sort((a, b) => b.priority - a.priority)
                          .map(trigger => {
                            const Icon = trigger.icon;
                            const isUser = trigger.category === 'user';
                            return (
                              <Button
                                key={trigger.id}
                                variant="outline"
                                size="sm"
                                draggable // ✅ ADDED: Make draggable
                                onDragStart={(e) => handleDragStart(e, 'start', { 
                                  label: trigger.name,
                                  type: 'start',
                                  description: trigger.description,
                                  icon: trigger.icon,
                                  category: trigger.category,
                                  triggerId: trigger.id,
                                  ...trigger
                                })} // ✅ ADDED: User/System triggers drag & drop
                                onClick={() => addTriggerNode(trigger.id)}
                                className={`w-full justify-start h-auto p-3 ${isUser ? 'bg-teal-50/50 hover:bg-teal-100/70 border-teal-200/50' : 'bg-slate-50/50 hover:bg-slate-100/70 border-slate-200/50'} text-left cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02]`}
                                data-testid={`trigger-${trigger.id}`}
                              >
                                <div className="flex items-start gap-2 w-full">
                                  <Icon className={`w-4 h-4 mt-0.5 ${isUser ? 'text-teal-600' : 'text-slate-600'} flex-shrink-0`} />
                                  <div className="min-w-0 flex-1">
                                    <div className={`font-medium text-sm ${isUser ? 'text-teal-800' : 'text-slate-800'}`}>{trigger.name}</div>
                                    <div className={`text-xs ${isUser ? 'text-teal-600' : 'text-slate-600'} mt-0.5 truncate`}>{trigger.description}</div>
                                  </div>
                                </div>
                              </Button>
                            );
                          })}
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />
                  
                  {/* ✅ ENTERPRISE ACTION LIBRARY */}
                  <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                      <Settings className="w-5 h-5 text-orange-600" />
                      Workflow Actions (22)
                    </h3>
                    
                  {/* HR Actions */}
                  {(!selectedCategory || selectedCategory === 'hr') && (
                    <div>
                      <h4 className="text-sm font-medium text-green-700 dark:text-green-300 mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        HR Actions ({Object.values(ENTERPRISE_ACTIONS).filter(a => a.category === 'hr').length})
                      </h4>
                      <div className="space-y-1">
                        {Object.values(ENTERPRISE_ACTIONS)
                          .filter(action => action.category === 'hr')
                          .filter(action => !searchTerm || action.name.toLowerCase().includes(searchTerm.toLowerCase()) || action.description.toLowerCase().includes(searchTerm.toLowerCase()))
                          .sort((a, b) => b.priority - a.priority)
                          .map(action => {
                            const Icon = action.icon;
                            return (
                              <Button
                                key={action.id}
                                variant="outline"
                                size="sm"
                                draggable // ✅ ADDED: Make draggable
                                onDragStart={(e) => handleDragStart(e, 'action', { 
                                  label: action.name,
                                  type: 'action',
                                  description: action.description,
                                  icon: action.icon,
                                  category: action.category,
                                  actionId: action.id,
                                  ...action
                                })} // ✅ ADDED: HR actions drag & drop
                                onClick={() => addActionNode(action.id)}
                                className="w-full justify-start h-auto p-3 bg-green-50/50 hover:bg-green-100/70 border-green-200/50 text-left cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02]"
                                data-testid={`action-${action.id}`}
                              >
                                <div className="flex items-start gap-2 w-full">
                                  <Icon className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium text-sm text-green-800">{action.name}</div>
                                    <div className="text-xs text-green-600 mt-0.5 truncate">{action.description}</div>
                                  </div>
                                </div>
                              </Button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Finance Actions */}
                  {(!selectedCategory || selectedCategory === 'finance') && (
                    <div>
                      <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Finance Actions ({Object.values(ENTERPRISE_ACTIONS).filter(a => a.category === 'finance').length})
                      </h4>
                      <div className="space-y-1">
                        {Object.values(ENTERPRISE_ACTIONS)
                          .filter(action => action.category === 'finance')
                          .filter(action => !searchTerm || action.name.toLowerCase().includes(searchTerm.toLowerCase()) || action.description.toLowerCase().includes(searchTerm.toLowerCase()))
                          .sort((a, b) => b.priority - a.priority)
                          .map(action => {
                            const Icon = action.icon;
                            return (
                              <Button
                                key={action.id}
                                variant="outline"
                                size="sm"
                                draggable // ✅ ADDED: Make draggable
                                onDragStart={(e) => handleDragStart(e, 'action', { 
                                  label: action.name,
                                  type: 'action',
                                  description: action.description,
                                  icon: action.icon,
                                  category: action.category,
                                  actionId: action.id,
                                  ...action
                                })} // ✅ ADDED: Finance actions drag & drop
                                onClick={() => addActionNode(action.id)}
                                className="w-full justify-start h-auto p-3 bg-blue-50/50 hover:bg-blue-100/70 border-blue-200/50 text-left cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02]"
                                data-testid={`action-${action.id}`}
                              >
                                <div className="flex items-start gap-2 w-full">
                                  <Icon className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium text-sm text-blue-800">{action.name}</div>
                                    <div className="text-xs text-blue-600 mt-0.5 truncate">{action.description}</div>
                                  </div>
                                </div>
                              </Button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Operations Actions */}
                  {(!selectedCategory || selectedCategory === 'operations') && (
                    <div>
                      <h4 className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-2 flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Operations Actions ({Object.values(ENTERPRISE_ACTIONS).filter(a => a.category === 'operations').length})
                      </h4>
                      <div className="space-y-1">
                        {Object.values(ENTERPRISE_ACTIONS)
                          .filter(action => action.category === 'operations')
                          .filter(action => !searchTerm || action.name.toLowerCase().includes(searchTerm.toLowerCase()) || action.description.toLowerCase().includes(searchTerm.toLowerCase()))
                          .sort((a, b) => b.priority - a.priority)
                          .map(action => {
                            const Icon = action.icon;
                            return (
                              <Button
                                key={action.id}
                                variant="outline"
                                size="sm"
                                draggable // ✅ ADDED: Make draggable
                                onDragStart={(e) => handleDragStart(e, 'action', { 
                                  label: action.name,
                                  type: 'action',
                                  description: action.description,
                                  icon: action.icon,
                                  category: action.category,
                                  actionId: action.id,
                                  ...action
                                })} // ✅ ADDED: Operations actions drag & drop
                                onClick={() => addActionNode(action.id)}
                                className="w-full justify-start h-auto p-3 bg-orange-50/50 hover:bg-orange-100/70 border-orange-200/50 text-left cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02]"
                                data-testid={`action-${action.id}`}
                              >
                                <div className="flex items-start gap-2 w-full">
                                  <Icon className="w-4 h-4 mt-0.5 text-orange-600 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium text-sm text-orange-800">{action.name}</div>
                                    <div className="text-xs text-orange-600 mt-0.5 truncate">{action.description}</div>
                                  </div>
                                </div>
                              </Button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Decision Node */}
                  <div>
                    <h4 className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2 flex items-center gap-2">
                      <GitBranch className="w-4 h-4" />
                      Control Flow
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      draggable // ✅ ADDED: Make draggable
                      onDragStart={(e) => handleDragStart(e, 'decision', { 
                        label: 'Decision Node',
                        type: 'decision',
                        description: 'Conditional branching logic',
                        icon: AlertCircle,
                        category: 'control-flow'
                      })} // ✅ ADDED: Decision node drag & drop
                      onClick={addDecisionNode}
                      className="w-full justify-start h-auto p-3 bg-yellow-50/50 hover:bg-yellow-100/70 border-yellow-200/50 text-left cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02]"
                      data-testid="action-decision-node"
                    >
                      <div className="flex items-start gap-2 w-full">
                        <AlertCircle className="w-4 h-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm text-yellow-800">Decision Node</div>
                          <div className="text-xs text-yellow-600 mt-0.5">Conditional branching logic</div>
                        </div>
                      </div>
                    </Button>
                  </div>
                  
                  </div> {/* End Actions */}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Builder Canvas */}
        <div className="lg:col-span-3">
          <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg h-[600px]">
            <CardContent className="p-4 h-full">
              <div className="mb-4 flex gap-2 items-center justify-between">
                <div className="flex gap-2">
                  {/* 🔄 UNDO/REDO BUTTONS */}
                  <div className="flex gap-1 mr-2 p-1 rounded-md bg-white/5 border border-white/10">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        undo();
                        toast({
                          title: '🔄 Undo successful',
                          description: 'Workflow state restored to previous version',
                        });
                      }}
                      disabled={!canUndo}
                      className="h-8 w-8 p-0 hover:bg-white/10 disabled:opacity-30"
                      title="Undo (Ctrl+Z)"
                      data-testid="button-undo"
                    >
                      <Undo2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        redo();
                        toast({
                          title: '⏩ Redo successful',
                          description: 'Workflow state moved forward',
                        });
                      }}
                      disabled={!canRedo}
                      className="h-8 w-8 p-0 hover:bg-white/10 disabled:opacity-30"
                      title="Redo (Ctrl+Y)"
                      data-testid="button-redo"
                    >
                      <Redo2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <Button variant="outline" size="sm" onClick={handleSaveWorkflow}>
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>

                  {/* 📋 TEMPLATE MANAGEMENT BUTTONS */}
                  <div className="flex gap-1 mr-2 p-1 rounded-md bg-white/5 border border-white/10">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowSaveTemplateDialog(true)}
                      disabled={nodes.length === 0}
                      className="h-8 px-2 text-xs hover:bg-white/10 disabled:opacity-30"
                      title="Save as Template"
                      data-testid="button-save-template"
                    >
                      <Database className="w-3 h-3 mr-1" />
                      Save Template
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowTemplateLibrary(!showTemplateLibrary)}
                      className="h-8 px-2 text-xs hover:bg-white/10"
                      title="Browse Templates"
                      data-testid="button-browse-templates"
                    >
                      <Folder className="w-3 h-3 mr-1" />
                      Templates
                    </Button>
                  </div>

                  <Button 
                    size="sm" 
                    onClick={handleRunWorkflow}
                    disabled={isRunning || (validationResult && !validationResult.isValid)}
                    className="bg-gradient-to-r from-green-500 to-green-600 disabled:from-gray-400 disabled:to-gray-500"
                  >
                    {isRunning ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
                    {isRunning ? 'Running...' : 'Run'}
                  </Button>
                </div>

                {/* 🔍 VALIDATION STATUS DISPLAY */}
                {validationResult && (
                  <div className="flex items-center gap-2">
                    {isValidating ? (
                      <Badge variant="secondary" className="animate-pulse">
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        Validating...
                      </Badge>
                    ) : (
                      <>
                        <Badge 
                          variant={validationResult.isValid ? 'default' : 'destructive'}
                          className={`cursor-pointer transition-all hover:scale-105 ${
                            validationResult.isValid 
                              ? 'bg-green-500 hover:bg-green-600' 
                              : 'bg-red-500 hover:bg-red-600'
                          }`}
                          onClick={() => setShowValidation(!showValidation)}
                          data-testid="validation-status-badge"
                        >
                          {validationResult.isValid ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <AlertCircle className="w-3 h-3 mr-1" />
                          )}
                          Score: {validationResult.score}/100
                        </Badge>
                        
                        {validationResult.errors.length > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {validationResult.errors.length} errors
                          </Badge>
                        )}
                        
                        {validationResult.warnings.length > 0 && (
                          <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                            {validationResult.warnings.length} warnings  
                          </Badge>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowValidation(!showValidation)}
                          className="h-6 px-2 text-xs"
                          data-testid="toggle-validation-panel"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          {showValidation ? 'Hide' : 'Details'}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 🔍 VALIDATION DETAILS PANEL */}
              {showValidation && validationResult && (
                <div className="mb-4 p-4 rounded-lg border bg-white/5 backdrop-blur-sm">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    
                    {/* Errors Section */}
                    {validationResult.errors.length > 0 && (
                      <div>
                        <h4 className="font-medium text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Errors ({validationResult.errors.length})
                        </h4>
                        <div className="h-24 overflow-y-auto">
                          <div className="space-y-1">
                            {validationResult.errors.slice(0, 3).map((error, index) => (
                              <div key={error.id} className="text-xs p-2 rounded bg-red-50/50 border border-red-200/50">
                                <div className="font-medium text-red-800">{error.message}</div>
                                <div className="text-red-600 mt-1">{error.description}</div>
                                {error.fix && (
                                  <div className="text-red-500 mt-1 italic">💡 {error.fix.description}</div>
                                )}
                              </div>
                            ))}
                            {validationResult.errors.length > 3 && (
                              <div className="text-xs text-red-600 p-1">
                                +{validationResult.errors.length - 3} more errors...
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Warnings Section */}
                    {validationResult.warnings.length > 0 && (
                      <div>
                        <h4 className="font-medium text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Warnings ({validationResult.warnings.length})
                        </h4>
                        <div className="h-24 overflow-y-auto">
                          <div className="space-y-1">
                            {validationResult.warnings.slice(0, 3).map((warning, index) => (
                              <div key={warning.id} className="text-xs p-2 rounded bg-yellow-50/50 border border-yellow-200/50">
                                <div className="font-medium text-yellow-800">{warning.message}</div>
                                <div className="text-yellow-600 mt-1">{warning.description}</div>
                              </div>
                            ))}
                            {validationResult.warnings.length > 3 && (
                              <div className="text-xs text-yellow-600 p-1">
                                +{validationResult.warnings.length - 3} more warnings...
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Suggestions Section */}
                    {validationResult.suggestions.length > 0 && (
                      <div>
                        <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
                          <Info className="w-4 h-4" />
                          Suggestions ({validationResult.suggestions.length})
                        </h4>
                        <div className="h-24 overflow-y-auto">
                          <div className="space-y-1">
                            {validationResult.suggestions.slice(0, 3).map((suggestion, index) => (
                              <div key={suggestion.id} className="text-xs p-2 rounded bg-blue-50/50 border border-blue-200/50">
                                <div className="font-medium text-blue-800">{suggestion.message}</div>
                                <div className="text-blue-600 mt-1">{suggestion.description}</div>
                              </div>
                            ))}
                            {validationResult.suggestions.length > 3 && (
                              <div className="text-xs text-blue-600 p-1">
                                +{validationResult.suggestions.length - 3} more suggestions...
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Workflow Metadata */}
                    {validationResult.errors.length === 0 && validationResult.warnings.length === 0 && (
                      <div className="lg:col-span-3">
                        <h4 className="font-medium text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Workflow Analysis
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div className="text-center p-2 rounded bg-green-50/50">
                            <div className="font-medium text-green-800">{validationResult.metadata.totalNodes}</div>
                            <div className="text-green-600">Nodes</div>
                          </div>
                          <div className="text-center p-2 rounded bg-blue-50/50">
                            <div className="font-medium text-blue-800">{validationResult.metadata.totalEdges}</div>
                            <div className="text-blue-600">Connections</div>
                          </div>
                          <div className="text-center p-2 rounded bg-purple-50/50">
                            <div className="font-medium text-purple-800 capitalize">{validationResult.metadata.complexity}</div>
                            <div className="text-purple-600">Complexity</div>
                          </div>
                          <div className="text-center p-2 rounded bg-orange-50/50">
                            <div className="font-medium text-orange-800">{validationResult.metadata.estimatedDuration}m</div>
                            <div className="text-orange-600">Est. Duration</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 📋 SAVE TEMPLATE DIALOG */}
              <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      Save Workflow Template
                    </DialogTitle>
                    <DialogDescription>
                      Save this workflow as a reusable template for future use.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="template-name">Template Name *</Label>
                      <Input
                        id="template-name"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="e.g., Employee Onboarding Workflow"
                        className="mt-1"
                        data-testid="input-template-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="template-description">Description</Label>
                      <Textarea
                        id="template-description"
                        value={templateDescription}
                        onChange={(e) => setTemplateDescription(e.target.value)}
                        placeholder="Describe what this workflow does and when to use it..."
                        className="mt-1 h-20"
                        data-testid="input-template-description"
                      />
                    </div>
                    <div>
                      <Label htmlFor="template-category">Category</Label>
                      <Select value={templateCategory} onValueChange={setTemplateCategory}>
                        <SelectTrigger className="mt-1" data-testid="select-template-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="hr">Human Resources</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="operations">Operations</SelectItem>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="support">Customer Support</SelectItem>
                          <SelectItem value="approval">Approval Workflows</SelectItem>
                          <SelectItem value="automation">Process Automation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowSaveTemplateDialog(false);
                        setTemplateName('');
                        setTemplateDescription('');
                        setTemplateCategory('general');
                      }}
                      data-testid="button-cancel-save-template"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => {
                        if (!templateName.trim()) {
                          toast({
                            title: '❌ Template name required',
                            description: 'Please enter a name for your template',
                            variant: 'destructive'
                          });
                          return;
                        }

                        // Save template using Zustand store
                        const templateId = `template_${Date.now()}`;
                        const template = {
                          id: templateId,
                          name: templateName.trim(),
                          description: templateDescription.trim(),
                          category: templateCategory,
                          nodes: nodes,
                          edges: edges,
                          viewport: { x: 0, y: 0, zoom: 1 },
                          createdAt: new Date().toISOString(),
                          metadata: {
                            nodeCount: nodes.length,
                            edgeCount: edges.length,
                            complexity: nodes.length > 15 ? 'high' : nodes.length > 5 ? 'medium' : 'low'
                          }
                        };

                        saveTemplate(template);
                        
                        toast({
                          title: '✅ Template saved successfully',
                          description: `"${templateName}" has been added to your template library`,
                        });

                        setShowSaveTemplateDialog(false);
                        setTemplateName('');
                        setTemplateDescription('');
                        setTemplateCategory('general');
                      }}
                      disabled={!templateName.trim()}
                      className="bg-gradient-to-r from-blue-500 to-blue-600"
                      data-testid="button-confirm-save-template"
                    >
                      <Database className="w-4 h-4 mr-1" />
                      Save Template
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* 📁 TEMPLATE LIBRARY PANEL */}
              {showTemplateLibrary && (
                <div className="mb-4 p-4 rounded-lg border bg-white/5 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium flex items-center gap-2">
                      <Folder className="w-4 h-4" />
                      Template Library ({templates.length})
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTemplateLibrary(false)}
                      className="h-6 px-2"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>

                  {templates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No templates saved yet</p>
                      <p className="text-xs">Create a workflow and click "Save Template" to get started</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {templates.map((template) => (
                        <div key={template.id} className="p-3 rounded border bg-white/5 hover:bg-white/10 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm truncate">{template.name}</h4>
                              <Badge variant="secondary" className="text-xs mt-1 capitalize">
                                {template.category}
                              </Badge>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  loadTemplate(template.id);
                                  toast({
                                    title: '📁 Template loaded',
                                    description: `"${template.name}" has been loaded into the workflow builder`,
                                  });
                                  setShowTemplateLibrary(false);
                                }}
                                className="h-6 w-6 p-0"
                                title="Load Template"
                                data-testid={`button-load-template-${template.id}`}
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  deleteTemplate(template.id);
                                  toast({
                                    title: '🗑️ Template deleted',
                                    description: `"${template.name}" has been removed from your library`,
                                  });
                                }}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                                title="Delete Template"
                                data-testid={`button-delete-template-${template.id}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          {template.description && (
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {template.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              {template.metadata?.nodeCount || 0} nodes
                            </span>
                            <span className="flex items-center gap-1">
                              <ArrowRight className="w-3 h-3" />
                              {template.metadata?.edgeCount || 0} connections
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodesDelete={onNodesDelete}
                nodeTypes={nodeTypes}
                onDrop={handleDrop} // ✅ ADDED: Professional drag & drop support
                onDragOver={handleDragOver} // ✅ ADDED: Drag over handling
                className="workflow-canvas h-[450px] rounded-lg border drop-zone" 
                deleteKeyCode={['Backspace', 'Delete']}
                multiSelectionKeyCode={['Meta', 'Ctrl']}
              >
                <Controls />
                <Background />
              </ReactFlow>
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
                <div className="h-[500px] overflow-y-auto">
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
                </div>
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
    <ReactFlowProvider>
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
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

        {/* Integrated Team Modal */}
        <Dialog open={showTeamModal} onOpenChange={(open) => {
          if (!open) {
            setShowTeamModal(false);
            setEditingTeam(null);
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-orange-500" />
                {editingTeam ? 'Edit Team' : 'Create New Team'}
              </DialogTitle>
              <DialogDescription>
                Configure team members, roles, and supervisors with RBAC-validated permissions
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Team Name*</Label>
                  <Input
                    id="name"
                    value={teamFormData.name}
                    onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
                    placeholder="e.g., HR Department, Finance Team"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={teamFormData.description}
                    onChange={(e) => setTeamFormData({ ...teamFormData, description: e.target.value })}
                    placeholder="Describe the team's purpose and responsibilities"
                    className="mt-1 h-20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="teamType">Team Type</Label>
                    <Select
                      value={teamFormData.teamType}
                      onValueChange={(value: 'functional' | 'project' | 'department') => 
                        setTeamFormData({ ...teamFormData, teamType: value })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="functional">Functional</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                        <SelectItem value="department">Department</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="isActive">Active Status</Label>
                    <Switch
                      id="isActive"
                      checked={teamFormData.isActive}
                      onCheckedChange={(checked) => setTeamFormData({ ...teamFormData, isActive: checked })}
                    />
                  </div>
                </div>
              </div>

              {/* Members Selection */}
              <div className="space-y-4">
                <div>
                  <Label>Team Members</Label>
                  <Alert className="mt-2 mb-3">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Teams can include both direct users and role-based members. 
                      Role members automatically include all users with that role.
                    </AlertDescription>
                  </Alert>

                  <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as 'users' | 'roles')}>
                    <TabsList className="w-full">
                      <TabsTrigger value="users" className="flex-1">
                        <Users className="h-4 w-4 mr-2" />
                        Users ({teamFormData.userMembers.length})
                      </TabsTrigger>
                      <TabsTrigger value="roles" className="flex-1">
                        <Shield className="h-4 w-4 mr-2" />
                        Roles ({teamFormData.roleMembers.length})
                      </TabsTrigger>
                    </TabsList>

                    <div className="mt-3">
                      <Input
                        placeholder="Search..."
                        value={teamSearchTerm}
                        onChange={(e) => setTeamSearchTerm(e.target.value)}
                        className="mb-3"
                      />
                    </div>

                    <TabsContent value="users" className="mt-3">
                      <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                        {loadingUsers ? (
                          <div className="text-center py-4 text-muted-foreground">Loading users...</div>
                        ) : filteredUsers.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground">No users found</div>
                        ) : (
                          filteredUsers.map((user: any) => (
                            <div key={user.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded">
                              <Checkbox
                                id={`user-${user.id}`}
                                checked={teamFormData.userMembers.includes(user.id)}
                                onCheckedChange={() => toggleUserMember(user.id)}
                              />
                              <label 
                                htmlFor={`user-${user.id}`}
                                className="flex-1 cursor-pointer text-sm"
                              >
                                <div className="font-medium">{user.email}</div>
                                {(user.firstName || user.lastName) && (
                                  <div className="text-muted-foreground text-xs">
                                    {user.firstName} {user.lastName}
                                  </div>
                                )}
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="roles" className="mt-3">
                      <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                        {loadingRoles ? (
                          <div className="text-center py-4 text-muted-foreground">Loading roles...</div>
                        ) : filteredRoles.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground">No roles found</div>
                        ) : (
                          filteredRoles.map((role: any) => (
                            <div key={role.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded">
                              <Checkbox
                                id={`role-${role.id}`}
                                checked={teamFormData.roleMembers.includes(role.id)}
                                onCheckedChange={() => toggleRoleMember(role.id)}
                              />
                              <label 
                                htmlFor={`role-${role.id}`}
                                className="flex-1 cursor-pointer text-sm"
                              >
                                <div className="font-medium">{role.name}</div>
                                {role.description && (
                                  <div className="text-muted-foreground text-xs">{role.description}</div>
                                )}
                              </label>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              {/* Supervisors Section */}
              <div className="space-y-4">
                <div>
                  <Label className="flex items-center gap-2">
                    <UserCog className="h-4 w-4" />
                    Supervisors
                  </Label>
                  
                  <Alert className="mt-2 mb-3">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Supervisors must have RBAC permissions for the workflow categories they oversee.
                      Only users with appropriate permissions can approve workflow steps.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="primarySupervisor">Primary Supervisor</Label>
                      <Select
                        value={teamFormData.primarySupervisor || ''}
                        onValueChange={(value) => 
                          setTeamFormData({ ...teamFormData, primarySupervisor: value || undefined })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select primary supervisor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {(usersData || []).map((user: any) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.email} {user.firstName && user.lastName && `(${user.firstName} ${user.lastName})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Co-Supervisors</Label>
                      <div className="mt-2 max-h-32 overflow-y-auto border rounded-lg p-2 space-y-1">
                        {loadingUsers ? (
                          <div className="text-center py-2 text-muted-foreground text-sm">Loading...</div>
                        ) : (usersData || []).length === 0 ? (
                          <div className="text-center py-2 text-muted-foreground text-sm">No users available</div>
                        ) : (
                          (usersData || [])
                            .filter((user: any) => user.id !== teamFormData.primarySupervisor)
                            .map((user: any) => (
                              <div key={user.id} className="flex items-center space-x-2 p-1">
                                <Checkbox
                                  id={`supervisor-${user.id}`}
                                  checked={teamFormData.secondarySupervisors.includes(user.id)}
                                  onCheckedChange={() => toggleSecondarySupervisor(user.id)}
                                />
                                <label 
                                  htmlFor={`supervisor-${user.id}`}
                                  className="flex-1 cursor-pointer text-sm"
                                >
                                  {user.email}
                                </label>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="border-t pt-4">
                <div className="flex flex-wrap gap-2">
                  {teamFormData.userMembers.length > 0 && (
                    <Badge variant="secondary">
                      {teamFormData.userMembers.length} Direct User{teamFormData.userMembers.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {teamFormData.roleMembers.length > 0 && (
                    <Badge variant="secondary">
                      {teamFormData.roleMembers.length} Role{teamFormData.roleMembers.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {teamFormData.primarySupervisor && (
                    <Badge variant="outline">Primary Supervisor Set</Badge>
                  )}
                  {teamFormData.secondarySupervisors.length > 0 && (
                    <Badge variant="outline">
                      {teamFormData.secondarySupervisors.length} Co-Supervisor{teamFormData.secondarySupervisors.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {teamFormData.isActive ? (
                    <Badge className="bg-green-500">Active</Badge>
                  ) : (
                    <Badge variant="destructive">Inactive</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => {
                setShowTeamModal(false);
                setEditingTeam(null);
              }} disabled={createTeamMutation.isPending}>
                Cancel
              </Button>
              <Button 
                onClick={() => handleSaveTeam()} 
                disabled={createTeamMutation.isPending || !teamFormData.name?.trim() || 
                        ((teamFormData.userMembers || []).length === 0 && (teamFormData.roleMembers || []).length === 0)}
              >
                {createTeamMutation.isPending ? 'Saving...' : editingTeam ? 'Update Team' : 'Create Team'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Layout>
    </ReactFlowProvider>
  );
};

export default WorkflowManagementPage;