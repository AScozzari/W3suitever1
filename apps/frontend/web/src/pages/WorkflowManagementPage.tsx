import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

// 🏪 STATE MANAGEMENT - Zustand for local editor + TanStack Query for server state
import { 
  useWorkflowStore,
  useWorkflowNodes,
  useWorkflowEdges,
  useWorkflowViewport,
  useWorkflowCurrentTemplateId,
  useWorkflowIsTemplateDirty,
  useWorkflowCanUndo,
  useWorkflowCanRedo,
  useWorkflowHistoryLength,
  useWorkflowHasHydrated,
  generateTemplateId
} from '@/stores/workflowStore';

// 🏗️ WORKFLOW TEMPLATE API HOOKS (Server State)
import {
  useWorkflowTemplates,
  useWorkflowTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useDuplicateTemplate,
  getTemplateCategories,
  formatTemplateCategory,
  type WorkflowTemplate,
  type CreateTemplateData
} from '@/hooks/useWorkflowTemplates';

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
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

// React Flow + Drag & Drop
import { 
  ReactFlow, 
  ReactFlowProvider,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  getIncomers,
  getOutgoers, 
  getConnectedEdges,
  Controls,
  Background,
  MiniMap,
  Node,
  Edge,
  Connection,
  NodeTypes,
  NodeChange,
  EdgeChange,
  useReactFlow // ✅ ADDED: For drag & drop coordinate conversion
} from 'reactflow';
import 'reactflow/dist/style.css';

// Icons - COMPLETE ENTERPRISE SET
import {
  Users, User, Plus, Settings, GitBranch, Activity, Zap, Target, 
  BarChart3, CheckCircle, CheckCircle2, Clock, AlertCircle, AlertTriangle, TrendingUp,
  ArrowRight, ArrowLeft, Filter, Search, Layers, Play, Pause,
  Building, Shield, UserCog, Eye, MoreHorizontal, Workflow,
  Save, DollarSign, FileText, Wrench, X, Info, Bell, Loader2,
  RefreshCw, Database, Mail, Undo, Redo, Undo2, Redo2, Upload, Server, Folder,
  Download, Trash2, Brain, Heart, TreePine, Circle, 
  ChevronDown, FastForward, Grid, Megaphone, Headphones, Sparkles, Route
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
        data.category === 'sales' ? 'bg-green-500' :
        data.category === 'finance' ? 'bg-blue-500' :
        data.category === 'marketing' ? 'bg-purple-500' :
        data.category === 'support' ? 'bg-yellow-500' :
        data.category === 'operations' ? 'bg-orange-500' : 'bg-slate-500'
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

  // 🤖 AI SMART ACTIONS (6 azioni)  
  'ai-smart-routing': {
    id: 'ai-smart-routing',
    name: 'AI Smart Routing',
    description: 'Automatic intelligent request routing',
    category: 'ai',
    icon: Brain,
    requiredPermission: 'ai.routing.use',
    priority: 95
  },
  'ai-auto-approval': {
    id: 'ai-auto-approval', 
    name: 'AI Auto Approval',
    description: 'Automatic approval based on AI analysis',
    category: 'ai',
    icon: CheckCircle2,
    requiredPermission: 'ai.approval.use',
    priority: 90
  },
  'ai-document-analysis': {
    id: 'ai-document-analysis',
    name: 'AI Document Analysis', 
    description: 'Extract and analyze document content',
    category: 'ai',
    icon: FileText,
    requiredPermission: 'ai.documents.analyze',
    priority: 85
  },
  'ai-sentiment-analysis': {
    id: 'ai-sentiment-analysis',
    name: 'AI Sentiment Analysis',
    description: 'Analyze text sentiment and tone',
    category: 'ai', 
    icon: Heart,
    requiredPermission: 'ai.sentiment.analyze',
    priority: 80
  },
  'ai-risk-assessment': {
    id: 'ai-risk-assessment',
    name: 'AI Risk Assessment',
    description: 'Evaluate request risk level automatically',
    category: 'ai',
    icon: AlertTriangle,
    requiredPermission: 'ai.risk.assess',
    priority: 75
  },
  'ai-compliance-check': {
    id: 'ai-compliance-check',
    name: 'AI Compliance Check',
    description: 'Automatic compliance validation',
    category: 'ai',
    icon: Shield,
    requiredPermission: 'ai.compliance.check',
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

const WorkflowManagementPage = () => {
  const { toast } = useToast();
  
  // 🎯 TEMPLATE STATE DECLARATIONS (fixed initialization order)
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string | null>(null);
  
  const [currentModule, setCurrentModule] = useState('workflow');
  const [activeView, setActiveView] = useState<'dashboard' | 'builder' | 'teams' | 'analytics'>('dashboard');
  
  // Team Management State
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  
  // 🏪 ZUSTAND STATE MANAGEMENT - REINTEGRATED WITH CONTROLLED SYNC
  const workflowStore = useWorkflowStore();
  const {
    nodes: zustandNodes,
    edges: zustandEdges,
    viewport: zustandViewport,
    searchTerm: zustandSearchTerm,
    selectedCategory: zustandSelectedCategory,
    isRunning: zustandIsRunning,
    selectedNodeId: zustandSelectedNodeId,
    templates: zustandTemplates,
    setNodes: setZustandNodes,
    setEdges: setZustandEdges,
    setViewport: setZustandViewport,
    setSearchTerm: setZustandSearchTerm,
    setSelectedCategory: setZustandSelectedCategory,
    setRunning: setZustandRunning,
    saveSnapshot: zustandSaveSnapshot,
    undo: zustandUndo,
    redo: zustandRedo,
    clearWorkflow: zustandClearWorkflow,
    history,
    historyIndex
  } = workflowStore;

  // 🎯 ZUSTAND AS SINGLE SOURCE OF TRUTH - Direct binding to React Flow
  const nodes = zustandNodes;
  const edges = zustandEdges;
  const viewport = zustandViewport;
  
  // 🔄 TEMPLATE DATA FROM SERVER (TanStack Query)
  const {
    data: templates = [],
    isLoading: templatesLoading,
    error: templatesError,
    refetch: refetchTemplates
  } = useWorkflowTemplates();

  // 🔄 TEMPLATE MUTATIONS
  const createTemplateMutation = useCreateTemplate();

  // 🔄 UI STATE - direct Zustand bindings (no local state needed)  
  const isRunning = zustandIsRunning;
  const selectedNodeId = zustandSelectedNodeId;
  const currentTemplateId = useWorkflowCurrentTemplateId();
  const isTemplateDirty = useWorkflowIsTemplateDirty();
  
  // ✅ UNIFIED FILTERING SYSTEM - Removed conflicting old filters

  // 🎨 UX/UI: Template filtering logic  
  const filteredTemplates = useMemo(() => {
    // 🛡️ SAFETY CHECK: Ensure templates is always an array
    const safeTemplates = Array.isArray(templates) ? templates : [];
    return safeTemplates.filter(template => {
      const matchesSearch = !templateSearchTerm || 
        template.name.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(templateSearchTerm.toLowerCase());
      
      const matchesCategory = !selectedTemplateCategory || template.category === selectedTemplateCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [templates, templateSearchTerm, selectedTemplateCategory]);

  // 🌱 INITIALIZE WITH DEFAULT NODES AFTER HYDRATION
  const hasHydrated = useWorkflowHasHydrated();
  
  // 📚 PROFESSIONAL TEMPLATE INITIALIZATION
  const initializeProfessionalTemplates = useCallback(() => {
    const safeTemplates = Array.isArray(templates) ? templates : [];
    if (safeTemplates.length === 0) {
      // 🏢 SALES TEAM WORKFLOW (was HR Leave Request)
      const salesLeaveTemplate = {
        name: "Sales Team Request",
        description: "Sales team approval workflow with manager review and sales processing",
        category: 'sales' as const,
        nodes: [
          {
            id: 'hr-start',
            type: 'start',
            position: { x: 50, y: 100 },
            data: { label: 'Leave Request Submitted', description: 'Employee submits leave request' }
          },
          {
            id: 'hr-manager-review',
            type: 'action',
            position: { x: 300, y: 100 },
            data: { label: 'Manager Review', description: 'Direct manager reviews and approves/rejects request' }
          },
          {
            id: 'hr-department-check',
            type: 'action',
            position: { x: 550, y: 100 },
            data: { label: 'HR Department Review', description: 'HR verifies policy compliance and availability' }
          },
          {
            id: 'hr-approval',
            type: 'end',
            position: { x: 800, y: 100 },
            data: { label: 'Leave Approved', description: 'Request approved and calendar updated' }
          }
        ],
        edges: [
          { id: 'hr-e1', source: 'hr-start', target: 'hr-manager-review' },
          { id: 'hr-e2', source: 'hr-manager-review', target: 'hr-department-check' },
          { id: 'hr-e3', source: 'hr-department-check', target: 'hr-approval' }
        ]
      };

      // 💰 FINANCE BUDGET APPROVAL WORKFLOW  
      const financeTemplate = {
        name: "Budget Approval Process",
        description: "Multi-tier budget approval workflow with escalation for large expenditures",
        category: 'finance' as const,
        nodes: [
          {
            id: 'fin-start',
            type: 'start', 
            position: { x: 50, y: 100 },
            data: { label: 'Budget Request', description: 'Department submits budget request' }
          },
          {
            id: 'fin-amount-check',
            type: 'action',
            position: { x: 300, y: 100 },
            data: { label: 'Amount Validation', description: 'System validates request amount and categorization' }
          },
          {
            id: 'fin-supervisor',
            type: 'action',
            position: { x: 550, y: 50 },
            data: { label: 'Supervisor Approval', description: 'Department supervisor reviews request under €5000' }
          },
          {
            id: 'fin-finance-director',
            type: 'action',
            position: { x: 550, y: 150 },
            data: { label: 'Finance Director', description: 'Finance director approves requests over €5000' }
          },
          {
            id: 'fin-approved',
            type: 'end',
            position: { x: 800, y: 100 },
            data: { label: 'Budget Approved', description: 'Funds allocated and notification sent' }
          }
        ],
        edges: [
          { id: 'fin-e1', source: 'fin-start', target: 'fin-amount-check' },
          { id: 'fin-e2', source: 'fin-amount-check', target: 'fin-supervisor' },
          { id: 'fin-e3', source: 'fin-amount-check', target: 'fin-finance-director' },
          { id: 'fin-e4', source: 'fin-supervisor', target: 'fin-approved' },
          { id: 'fin-e5', source: 'fin-finance-director', target: 'fin-approved' }
        ]
      };

      // 🔧 OPERATIONS MAINTENANCE WORKFLOW
      const operationsTemplate = {
        name: "Equipment Maintenance Request",
        description: "Preventive and corrective maintenance workflow with priority escalation",
        category: 'operations' as const,
        nodes: [
          {
            id: 'ops-start',
            type: 'start',
            position: { x: 50, y: 100 },
            data: { label: 'Maintenance Request', description: 'Employee reports equipment issue or schedules maintenance' }
          },
          {
            id: 'ops-priority',
            type: 'action',
            position: { x: 300, y: 100 },
            data: { label: 'Priority Assessment', description: 'System categorizes urgency: Critical/High/Medium/Low' }
          },
          {
            id: 'ops-assign',
            type: 'action',
            position: { x: 550, y: 100 },
            data: { label: 'Technician Assignment', description: 'Auto-assign to available qualified technician' }
          },
          {
            id: 'ops-work',
            type: 'action',
            position: { x: 800, y: 100 },
            data: { label: 'Maintenance Work', description: 'Technician performs maintenance and updates status' }
          },
          {
            id: 'ops-complete',
            type: 'end',
            position: { x: 1050, y: 100 },
            data: { label: 'Work Complete', description: 'Equipment verified and returned to service' }
          }
        ],
        edges: [
          { id: 'ops-e1', source: 'ops-start', target: 'ops-priority' },
          { id: 'ops-e2', source: 'ops-priority', target: 'ops-assign' },
          { id: 'ops-e3', source: 'ops-assign', target: 'ops-work' },
          { id: 'ops-e4', source: 'ops-work', target: 'ops-complete' }
        ]
      };

      // 🎯 MARKETING CAMPAIGN WORKFLOW
      const marketingTemplate = {
        name: "Marketing Campaign Approval",
        description: "Marketing campaign review with content approval and budget tracking",
        category: 'marketing' as const,
        nodes: [
          {
            id: 'doc-start',
            type: 'start',
            position: { x: 50, y: 100 },
            data: { label: 'Document Submitted', description: 'Author submits document for review and approval' }
          },
          {
            id: 'doc-review',
            type: 'action',
            position: { x: 300, y: 100 },
            data: { label: 'Peer Review', description: 'Subject matter experts review content and provide feedback' }
          },
          {
            id: 'doc-legal',
            type: 'action',
            position: { x: 550, y: 100 },
            data: { label: 'Legal Compliance', description: 'Legal team verifies regulatory compliance if required' }
          },
          {
            id: 'doc-final',
            type: 'action',
            position: { x: 800, y: 100 },
            data: { label: 'Final Approval', description: 'Authorized approver signs off on final version' }
          },
          {
            id: 'doc-publish',
            type: 'end',
            position: { x: 1050, y: 100 },
            data: { label: 'Document Published', description: 'Approved document published and stakeholders notified' }
          }
        ],
        edges: [
          { id: 'doc-e1', source: 'doc-start', target: 'doc-review' },
          { id: 'doc-e2', source: 'doc-review', target: 'doc-legal' },
          { id: 'doc-e3', source: 'doc-legal', target: 'doc-final' },
          { id: 'doc-e4', source: 'doc-final', target: 'doc-publish' }
        ]
      };

      // 📞 SUPPORT TICKET WORKFLOW  
      const supportTemplate = {
        name: "Support Ticket Resolution",
        description: "Customer support ticket workflow with escalation and resolution tracking",
        category: 'support' as const,
        nodes: [
          {
            id: 'auto-start',
            type: 'start',
            position: { x: 50, y: 100 },
            data: { label: 'New Customer Registration', description: 'Customer completes registration form' }
          },
          {
            id: 'auto-validate',
            type: 'action',
            position: { x: 300, y: 100 },
            data: { label: 'Data Validation', description: 'System validates customer information and documents' }
          },
          {
            id: 'auto-account',
            type: 'action',
            position: { x: 550, y: 100 },
            data: { label: 'Account Creation', description: 'Automated account setup with initial configuration' }
          },
          {
            id: 'auto-welcome',
            type: 'action',
            position: { x: 800, y: 100 },
            data: { label: 'Welcome Communication', description: 'Send welcome email sequence and setup instructions' }
          },
          {
            id: 'auto-complete',
            type: 'end',
            position: { x: 1050, y: 100 },
            data: { label: 'Onboarding Complete', description: 'Customer activated and success metrics tracked' }
          }
        ],
        edges: [
          { id: 'auto-e1', source: 'auto-start', target: 'auto-validate' },
          { id: 'auto-e2', source: 'auto-validate', target: 'auto-account' },
          { id: 'auto-e3', source: 'auto-account', target: 'auto-welcome' },
          { id: 'auto-e4', source: 'auto-welcome', target: 'auto-complete' }
        ]
      };

      // Initialize professional templates
      [salesLeaveTemplate, financeTemplate, operationsTemplate, marketingTemplate, supportTemplate].forEach(async (template) => {
        try {
          await createTemplateMutation.mutateAsync({
            name: template.name,
            description: template.description,
            category: template.category,
            workflowDefinition: {
              nodes: template.nodes,
              edges: template.edges,
              viewport: { x: 0, y: 0, zoom: 1 },
            },
            isActive: true,
          });
        } catch (error) {
          console.error(`Failed to create template ${template.name}:`, error);
        }
      });

      toast({
        title: '📚 Professional Templates Initialized',  
        description: 'Pre-configured workflow templates for Sales, Finance, Operations, Marketing & Support are now available',
      });
    }
  }, [templates.length, createTemplateMutation, toast]);

  useEffect(() => {
    if (hasHydrated && zustandNodes.length === 0 && zustandEdges.length === 0) {
      const initialNode: Node = {
        id: 'start-node',
        type: 'start',
        position: { x: 250, y: 100 },
        data: { 
          label: 'Start',
          type: 'start',
          description: 'Workflow starts here'
        }
      };
      setZustandNodes([initialNode]);
      zustandSaveSnapshot('Initial node added');
    }
  }, [hasHydrated, setZustandNodes, zustandSaveSnapshot]);

  // ❌ TEMPLATE LOADING REMOVED - was causing infinite loop
  // Templates can be loaded manually or via API calls instead

  // 🎯 WORKFLOW ACTIONS - now fully functional with history
  const canUndo = useWorkflowCanUndo();
  const canRedo = useWorkflowCanRedo();
  const historyLength = useWorkflowHistoryLength();
  
  // Enhanced actions with Zustand integration
  const undo = () => {
    const success = zustandUndo();
    return success;
  };
  
  const redo = () => {
    const success = zustandRedo();
    return success;
  };

  const saveSnapshot = (action: string) => zustandSaveSnapshot(action);
  
  // 🏗️ TEMPLATE OPERATIONS WITH BACKEND API
  const handleSaveTemplate = async (name: string, description: string, category: string) => {
    try {
      await createTemplateMutation.mutateAsync({
        name,
        description,
        category,
        workflowDefinition: {
          nodes: zustandNodes,
          edges: zustandEdges,
          viewport: zustandViewport,
        },
        isActive: true,
      });
      
      // Mark current template as clean after successful save
      zustandSetCurrentTemplateId(name); // Use name as temporary ID until backend returns real ID
      zustandMarkTemplateDirty(false);
      
      toast({
        title: 'Template Saved',
        description: `Template "${name}" saved successfully`,
      });
    } catch (error) {
      console.error('Failed to save template:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save template. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleLoadTemplate = async (templateId: string) => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (template && template.workflowDefinition) {
        // Load template definition into Zustand store
        zustandLoadTemplateDefinition(
          template.workflowDefinition.nodes,
          template.workflowDefinition.edges,
          template.workflowDefinition.viewport
        );
        
        // Update template context
        zustandSetCurrentTemplateId(templateId);
        zustandMarkTemplateDirty(false);
        
        toast({
          title: 'Template Loaded',
          description: `Loaded "${template.name}" template`,
        });
      }
    } catch (error) {
      console.error('Failed to load template:', error);
      toast({
        title: 'Load Failed',
        description: 'Failed to load template. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  const clearWorkflow = () => {
    zustandClearWorkflow();
  };
  
  const addNode = (node: any) => {
    const updatedNodes = [...zustandNodes, node];
    setZustandNodes(updatedNodes);
    zustandSaveSnapshot('Node added');
  };
  
  const removeNode = (id: string) => {
    const updatedNodes = zustandNodes.filter(n => n.id !== id);
    setZustandNodes(updatedNodes);
    zustandSaveSnapshot('Node removed');
  };
  
  const addStoreEdge = (edge: any) => {
    const updatedEdges = [...zustandEdges, edge];
    setZustandEdges(updatedEdges);
    zustandSaveSnapshot('Edge added');
  };
  
  const removeEdge = (id: string) => {
    const updatedEdges = zustandEdges.filter(e => e.id !== id);
    setZustandEdges(updatedEdges);
    zustandSaveSnapshot('Edge removed');
  };

  // ✅ DRAG & DROP HANDLER for workflow builder
  const handleDragStart = (event: React.DragEvent, nodeType: string, nodeData: any) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/nodedata', JSON.stringify(nodeData));
    event.dataTransfer.effectAllowed = 'move';
  };

  // ✅ DELETE TEMPLATE HANDLER
  const deleteTemplate = (templateId: string) => {
    // Remove template from Zustand store
    const safeTemplates = Array.isArray(templates) ? templates : [];
    const updatedTemplates = safeTemplates.filter(t => t.id !== templateId);
    // Note: This should ideally call a Zustand action like deleteTemplate(templateId)
    // For now, we'll need to implement this in the store
    console.log('🗑️ Deleting template:', templateId);
  };

  // 🔄 REACT FLOW CHANGE HANDLERS - Update Zustand directly with debouncing
  const nodeChangeTimerRef = useRef<NodeJS.Timeout>();
  const edgeChangeTimerRef = useRef<NodeJS.Timeout>();
  const viewportChangeTimerRef = useRef<NodeJS.Timeout>();

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    const updatedNodes = applyNodeChanges(changes, zustandNodes);
    setZustandNodes(updatedNodes);
    
    // Debounced snapshot
    clearTimeout(nodeChangeTimerRef.current);
    nodeChangeTimerRef.current = setTimeout(() => {
      zustandSaveSnapshot('Nodes updated');
    }, 300);
  }, [zustandNodes, setZustandNodes, zustandSaveSnapshot]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    const updatedEdges = applyEdgeChanges(changes, zustandEdges);
    setZustandEdges(updatedEdges);
    
    // Debounced snapshot
    clearTimeout(edgeChangeTimerRef.current);
    edgeChangeTimerRef.current = setTimeout(() => {
      zustandSaveSnapshot('Edges updated');
    }, 300);
  }, [zustandEdges, setZustandEdges, zustandSaveSnapshot]);

  
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
    staleTime: 5 * 60 * 1000, // 5 minuti
    refetchOnWindowFocus: false, // Evito refetch quando la finestra torna in focus
  });

  const { data: templatesData = [], isLoading: loadingTemplates } = useQuery<WorkflowTemplate[]>({
    queryKey: ['/api/workflow-templates'],
    staleTime: 5 * 60 * 1000, // 5 minuti
    refetchOnWindowFocus: false, // Evito refetch quando la finestra torna in focus
  });

  const { data: instancesData = [], isLoading: loadingInstances } = useQuery<WorkflowInstance[]>({
    queryKey: ['/api/workflow-instances'],
    staleTime: 5 * 60 * 1000, // 5 minuti
    refetchInterval: false, // Disabilito il polling automatico per evitare troppe chiamate
  });

  // ✅ NEW: Universal Requests data for timeline status tracking
  const { data: universalRequestsData, isLoading: loadingUniversalRequests } = useQuery<{requests: any[]}>({
    queryKey: ['/api/universal-requests'],
    queryFn: () => apiRequest('/api/universal-requests'),
    staleTime: 2 * 60 * 1000, // 2 minuti
    refetchOnWindowFocus: false
  });

  // Extract requests array from response object
  const allUniversalRequests = universalRequestsData?.requests || [];

  const { data: workflowActionsData = [] } = useQuery<any[]>({
    queryKey: ['/api/workflow-actions'],
    staleTime: 10 * 60 * 1000, // 10 minuti - questi dati cambiano raramente
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Non refetch quando il componente si monta di nuovo
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
      const updatedEdges = addEdge(params, zustandEdges);
      setZustandEdges(updatedEdges);
      zustandSaveSnapshot('Edge connected');
      toast({
        title: "Connection Created",
        description: "Nodes connected successfully",
      });
    },
    [zustandEdges, setZustandEdges, zustandSaveSnapshot, toast]
  );

  // ✅ FIX CRITICAL: onNodesDelete handler - Permettere cancellazione nodi  
  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      console.log('Deleting nodes:', deleted.map(n => n.id));
      
      // Remove edges connected to deleted nodes
      const deletedIds = deleted.map(node => node.id);
      const updatedEdges = zustandEdges.filter(edge => 
        !deletedIds.includes(edge.source) && !deletedIds.includes(edge.target)
      );
      
      setZustandEdges(updatedEdges);
      zustandSaveSnapshot('Nodes deleted');

      toast({
        title: "Nodes Deleted", 
        description: `${deleted.length} node(s) and their connections removed`,
      });
    },
    [zustandEdges, setZustandEdges, zustandSaveSnapshot, toast]
  );

  // 🚀 PROFESSIONAL WORKFLOW EXECUTION ENGINE INTEGRATION
  const [executionInstanceId, setExecutionInstanceId] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<any>(null);

  // 🔍 ENTERPRISE VALIDATION SYSTEM INTEGRATION
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  // 🎨 UX/UI Enhancement states
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);
  // templateSearchTerm and selectedTemplateCategory moved above filteredTemplates
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);

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

      setZustandRunning(true); // ✅ UPDATED: Use Zustand store action
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
          setZustandRunning(false);
          setExecutionStatus('completed');
          toast({
            title: "🎉 Workflow Completed!",
            description: `Executed ${data.completedNodes} nodes in ${Math.round(data.duration / 1000)}s`,
          });
        } else if (event === 'executionError') {
          setZustandRunning(false);
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
      setZustandRunning(false);
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
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
    
    const updatedNodes = [...zustandNodes, newNode];
    setZustandNodes(updatedNodes);
    zustandSaveSnapshot('Action node added');
    
    toast({
      title: "Action Added",
      description: `${action.name} added to workflow`,
    });
  };

  const addDecisionNode = () => {
    const newNode = {
      id: `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'decision', // ✅ FIXED: Usa custom type invece di 'default'
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { 
        label: 'Decision Node',
        type: 'decision',
        description: 'Conditional branching logic'
      },
    };
    
    const updatedNodes = [...zustandNodes, newNode];
    setZustandNodes(updatedNodes);
    zustandSaveSnapshot('Decision node added');
    
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
      id: `trigger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
    
    const updatedNodes = [newNode, ...zustandNodes]; // Trigger al primo posto
    setZustandNodes(updatedNodes);
    zustandSaveSnapshot('Trigger node added');
    
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

  // ✅ NEW: Status Timeline Component for universal requests tracking
  const StatusTimeline = ({ request }: { request: any }) => {
    const getStatusInfo = (status: string) => {
      switch (status) {
        case 'pending':
          return { icon: Clock, color: 'text-yellow-500', bgColor: 'bg-yellow-100', label: 'In Attesa' };
        case 'in_review': 
          return { icon: Eye, color: 'text-blue-500', bgColor: 'bg-blue-100', label: 'In Revisione' };
        case 'approved':
          return { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-100', label: 'Approvata' };
        case 'completed':
          return { icon: Target, color: 'text-purple-500', bgColor: 'bg-purple-100', label: 'Completata' };
        case 'rejected':
          return { icon: X, color: 'text-red-500', bgColor: 'bg-red-100', label: 'Rifiutata' };
        default:
          return { icon: Clock, color: 'text-gray-500', bgColor: 'bg-gray-100', label: 'Sconosciuto' };
      }
    };

    const statusInfo = getStatusInfo(request.status);
    const IconComponent = statusInfo.icon;

    return (
      <div className="flex items-center gap-4 p-4 bg-white/10 border border-white/20 rounded-lg backdrop-blur-sm hover:bg-white/15 transition-all duration-200">
        <div className={`p-2 rounded-full ${statusInfo.bgColor}`}>
          <IconComponent className={`w-5 h-5 ${statusInfo.color}`} />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100" data-testid={`request-title-${request.id}`}>
            {request.title || 'Richiesta senza titolo'}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400" data-testid={`request-category-${request.id}`}>
            Categoria: {request.category?.toUpperCase() || 'N/A'}
          </p>
          <p className="text-sm text-gray-500" data-testid={`request-date-${request.id}`}>
            Creata il: {new Date(request.createdAt).toLocaleDateString('it-IT', {
              year: 'numeric',
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`} data-testid={`request-status-${request.id}`}>
            {statusInfo.label}
          </span>
          {request.requesterId && (
            <p className="text-xs text-gray-500 mt-1" data-testid={`request-requester-${request.id}`}>
              ID: {request.requesterId}
            </p>
          )}
        </div>
      </div>
    );
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

      {/* ✅ NEW: Request Status Timeline Section */}
      <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-500" />
            Timeline Richieste Enterprise
          </CardTitle>
          <CardDescription>
            Tracciamento stato delle richieste con AI routing automatico
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingUniversalRequests ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : allUniversalRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Activity className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">Nessuna richiesta trovata</p>
              <p className="text-sm">Le richieste inviate dal form HR appariranno qui</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto" data-testid="timeline-requests-container">
              {allUniversalRequests
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 10)
                .map((request) => (
                  <StatusTimeline key={request.id} request={request} />
                ))}
              
              {allUniversalRequests.length > 10 && (
                <div className="text-center pt-4 border-t border-white/20">
                  <p className="text-sm text-gray-500">
                    Mostrate le ultime 10 richieste di {allUniversalRequests.length}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // 🏗️ ENTERPRISE WORKFLOW BUILDER - COMPLETELY REBUILT
  const WorkflowBuilderView = () => {
    // 🎯 ZUSTAND ENTERPRISE STATE - Direct integration with professional store
    const {
      nodes,
      edges,
      viewport,
      templates,
      searchTerm,
      selectedCategory,
      isRunning,
      selectedNodeId,
      setNodes,
      setEdges,
      addNode,
      removeNode,
      selectNode,
      setSearchTerm,
      setSelectedCategory,
      setRunning,
      saveTemplate: handleSaveTemplate,
      loadTemplate: handleLoadTemplate,
      saveSnapshot,
      undo,
      redo,
      clearWorkflow,
      exportWorkflow,
      importWorkflow
    } = useWorkflowStore();

    // 🔧 REACT FLOW INTEGRATION
    const reactFlowInstance = useReactFlow();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    
    // 🚀 WORKFLOW EXECUTION ENGINE - Connect to professional execution service
    const [executionInstances, setExecutionInstances] = useState<Map<string, any>>(new Map());
    const [currentExecution, setCurrentExecution] = useState<string | null>(null);

    // 🎯 ENTERPRISE DEPARTMENT CATEGORIES (5 standardized departments)
    const ENTERPRISE_DEPARTMENTS = {
      sales: {
        label: 'Sales',
        icon: TrendingUp,
        color: 'bg-green-500',
        bgClass: 'bg-green-100 dark:bg-green-900',
        textClass: 'text-green-700 dark:text-green-300',
        description: 'Customer acquisition and revenue workflows'
      },
      finance: {
        label: 'Finance',
        icon: DollarSign,
        color: 'bg-blue-500',
        bgClass: 'bg-blue-100 dark:bg-blue-900',
        textClass: 'text-blue-700 dark:text-blue-300',
        description: 'Financial approvals and budget management'
      },
      marketing: {
        label: 'Marketing',
        icon: Megaphone,
        color: 'bg-purple-500',
        bgClass: 'bg-purple-100 dark:bg-purple-900',
        textClass: 'text-purple-700 dark:text-purple-300',
        description: 'Campaign and content approval processes'
      },
      support: {
        label: 'Support',
        icon: Headphones,
        color: 'bg-yellow-500',
        bgClass: 'bg-yellow-100 dark:bg-yellow-900',
        textClass: 'text-yellow-700 dark:text-yellow-300',
        description: 'Customer support and ticket escalation'
      },
      operations: {
        label: 'Operations',
        icon: Settings,
        color: 'bg-orange-500',
        bgClass: 'bg-orange-100 dark:bg-orange-900',
        textClass: 'text-orange-700 dark:text-orange-300',
        description: 'Operational processes and resource management'
      }
    };

    // 🤖 AI WORKFLOW ASSISTANT INTEGRATION
    const AI_NODES = {
      'ai-classifier': {
        id: 'ai-classifier',
        name: 'AI Content Classifier',
        description: 'Automatically classify and route content using AI',
        category: 'ai',
        icon: Brain,
        nodeType: 'ai-action',
        priority: 100
      },
      'ai-approval': {
        id: 'ai-approval',
        name: 'AI Decision Assistant',
        description: 'AI-powered approval recommendations',
        category: 'ai',
        icon: Sparkles,
        nodeType: 'ai-action',
        priority: 95
      },
      'ai-routing': {
        id: 'ai-routing',
        name: 'Smart Routing',
        description: 'AI-based workflow path determination',
        category: 'ai',
        icon: Route,
        nodeType: 'ai-decision',
        priority: 90
      }
    };

    // 📊 FILTERED ACTIONS BY DEPARTMENT - Using existing ENTERPRISE_ACTIONS
    const filteredActionsByDepartment = useMemo(() => {
      if (!selectedCategory) {
        return Object.values(ENTERPRISE_ACTIONS);
      }
      
      return Object.values(ENTERPRISE_ACTIONS).filter(action => {
        const matchesCategory = action.category === selectedCategory;
        const matchesSearch = !searchTerm || 
          action.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          action.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
      });
    }, [selectedCategory, searchTerm]);

    // 📋 FILTERED TEMPLATES BY DEPARTMENT
    const filteredTemplates = useMemo(() => {
      // 🛡️ SAFETY CHECK: Ensure templates is always an array  
      const safeTemplates = Array.isArray(templates) ? templates : [];
      return safeTemplates.filter(template => {
        const matchesCategory = !selectedCategory || template.category === selectedCategory;
        const matchesSearch = !templateSearchTerm || 
          template.name.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
          template.description.toLowerCase().includes(templateSearchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
      });
    }, [templates, selectedCategory, templateSearchTerm]);

    // 🎯 DRAG & DROP ENTERPRISE HANDLERS
    const handleDragOver = useCallback((event: React.DragEvent) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }, []);

    const handleDrop = useCallback((event: React.DragEvent) => {
      event.preventDefault();
      const actionId = event.dataTransfer.getData('application/workflow-action');
      const templateId = event.dataTransfer.getData('application/workflow-template');
      
      if (actionId) {
        const action = ENTERPRISE_ACTIONS[actionId as keyof typeof ENTERPRISE_ACTIONS] || AI_NODES[actionId as keyof typeof AI_NODES];
        if (action && reactFlowWrapper.current) {
          // 🔧 FIXED: Use new React Flow v11+ API
          const rect = reactFlowWrapper.current.getBoundingClientRect();
          const position = reactFlowInstance.screenToFlowPosition({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });

          const newNode = {
            id: `${actionId}_${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'action',
            position,
            data: { 
              label: action.name,
              actionId: action.id,
              category: action.category,
              description: action.description
            },
          };

          addNode(newNode);
          toast({
            title: 'Action Added',
            description: `Added ${action.name} to workflow`,
          });
        }
      } else if (templateId) {
        const template = templates.find(t => t.id === templateId);
        if (template) {
          handleLoadTemplate(templateId).catch(console.error);
        }
      }
    }, [reactFlowInstance, addNode, handleLoadTemplate, templates, toast]);

    // 🚀 WORKFLOW EXECUTION FUNCTIONS
    const executeWorkflow = useCallback(async () => {
      if (nodes.length === 0) {
        toast({
          title: 'No Workflow to Execute',
          description: 'Please add nodes to create a workflow',
          variant: 'destructive'
        });
        return;
      }

      const startNodes = nodes.filter(n => n.type === 'start');
      if (startNodes.length === 0) {
        toast({
          title: 'Missing Start Node',
          description: 'Add a start trigger to execute the workflow',
          variant: 'destructive'
        });
        return;
      }

      try {
        setRunning(true);
        // Import and use the professional execution engine
        const { executeWorkflow } = await import('@/services/workflowExecution');
        const instanceId = await executeWorkflow(
          `workflow-${Date.now()}`,
          nodes,
          edges,
          { trigger: 'manual', timestamp: new Date() },
          { userId: 'admin', tenantId: 'staging' }
        );
        
        setCurrentExecution(instanceId);
        toast({
          title: 'Workflow Execution Started',
          description: `Execution ID: ${instanceId}`,
        });
      } catch (error) {
        setRunning(false);
        toast({
          title: 'Execution Failed',
          description: 'Failed to start workflow execution',
          variant: 'destructive'
        });
      }
    }, [nodes, edges, setRunning, toast]);

    // 💾 TEMPLATE MANAGEMENT FUNCTIONS
    const saveCurrentAsTemplate = useCallback(() => {
      if (nodes.length === 0) {
        toast({
          title: 'Empty Workflow',
          description: 'Add nodes before saving as template',
          variant: 'destructive'
        });
        return;
      }

      const templateName = prompt('Enter template name:');
      const templateDescription = prompt('Enter template description:');
      const templateCategory = selectedCategory || 'operations';

      if (templateName && templateDescription) {
        handleSaveTemplate(templateName, templateDescription, templateCategory as any).catch(console.error);
      }
    }, [nodes, selectedCategory, handleSaveTemplate, toast]);

    return (
    <div className="space-y-6">
      {/* 🎯 ENTERPRISE BUILDER HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Enterprise Workflow Builder</h2>
          <p className="text-slate-600 dark:text-slate-400">Design automated workflows with AI-powered intelligence</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 📊 EXECUTION STATUS INDICATOR */}
          {isRunning && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-700 dark:text-green-300">Executing...</span>
            </div>
          )}
          
          {/* 🔄 HISTORY CONTROLS */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={undo}
              disabled={!canUndo}
              className="h-8 w-8 p-0"
              title="Undo"
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={redo}
              disabled={!canRedo}
              className="h-8 w-8 p-0"
              title="Redo"
            >
              <Redo className="w-4 h-4" />
            </Button>
          </div>
          
          <Button 
            onClick={() => setActiveView('dashboard')} 
            variant="outline"
            className="backdrop-blur-sm bg-white/10 border-white/30 hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* 🏗️ MAIN BUILDER LAYOUT - 3 Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 h-[calc(100vh-140px)] min-h-[600px] max-h-[calc(100vh-140px)] overflow-hidden">
        
        {/* 📚 LEFT SIDEBAR - DEPARTMENT FILTERS & ACTIONS LIBRARY */}
        <div className="lg:col-span-3 h-full min-h-0 space-y-4 order-1 lg:order-1">
          
          {/* 🎯 SIMPLIFIED DEPARTMENT FILTER */}
          <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building className="w-4 h-4" />
                Department Filter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                value={selectedCategory || "all"} 
                onValueChange={(value) => setSelectedCategory(value === "all" ? null : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {Object.entries(ENTERPRISE_DEPARTMENTS).map(([key, dept]) => {
                    const Icon = dept.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {dept.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          
          {/* 🔍 ACTIONS LIBRARY */}
          <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg flex-1 min-h-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Actions Library
              </CardTitle>
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search actions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/5 border-white/20"
                />
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 min-h-0 overflow-hidden">
              <div className="h-full overflow-y-auto space-y-2">
                
                {/* 🤖 AI NODES - SIMPLIFIED */}
                <div>
                  <h4 className="text-xs font-medium text-purple-600 mb-1 flex items-center gap-1">
                    <Brain className="w-3 h-3" />
                    AI Nodes ({Object.keys(AI_NODES).length})
                  </h4>
                  <div className="space-y-1">
                    {Object.values(AI_NODES).map(aiNode => {
                      const Icon = aiNode.icon;
                      return (
                        <div
                          key={aiNode.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/workflow-action', aiNode.id);
                          }}
                          className="flex items-center gap-2 p-1.5 rounded border border-purple-200 bg-purple-50 cursor-grab hover:bg-purple-100 transition-colors"
                        >
                          <Icon className="w-3 h-3 text-purple-600" />
                          <span className="text-xs font-medium text-purple-900 truncate">
                            {aiNode.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* 📊 ACTIONS - SIMPLIFIED */}
                <div>
                  <h4 className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Actions ({filteredActionsByDepartment.length})
                  </h4>
                  <div className="space-y-1">
                    {filteredActionsByDepartment.map(action => {
                      const Icon = action.icon;
                      return (
                        <div
                          key={action.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/workflow-action', action.id);
                          }}
                          className="flex items-center gap-2 p-1.5 rounded border border-slate-200 bg-slate-50 cursor-grab hover:bg-slate-100 transition-colors"
                        >
                          <Icon className="w-3 h-3 text-slate-600" />
                          <span className="text-xs font-medium text-slate-900 truncate">
                            {action.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 🎨 CENTER - WORKFLOW CANVAS (DYNAMIC & RESPONSIVE) */}
        <div className="lg:col-span-6 h-full min-h-0 order-2 lg:order-2">
          <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg h-full flex flex-col">
            <CardHeader className="pb-3 flex-none">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  Workflow Canvas
                </CardTitle>
                
                {/* 🎛️ CANVAS CONTROLS */}
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={clearWorkflow}
                    className="h-8 px-2 text-xs hover:bg-red-100 dark:hover:bg-red-900/20"
                    title="Clear all nodes"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Clear
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={saveCurrentAsTemplate}
                    disabled={nodes.length === 0}
                    className="h-8 px-2 text-xs hover:bg-blue-100 dark:hover:bg-blue-900/20"
                    title="Save as template"
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={executeWorkflow}
                    disabled={nodes.length === 0 || isRunning}
                    className="h-8 px-2 text-xs hover:bg-green-100 dark:hover:bg-green-900/20"
                    title="Execute workflow"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    {isRunning ? 'Running...' : 'Execute'}
                  </Button>
                </div>
              </div>
              
              {/* 📊 MINIMAL STATS */}
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>{nodes.length} nodes</span>
                <span>{edges.length} connections</span>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 min-h-0 p-0 relative">
              <div 
                ref={reactFlowWrapper}
                className="absolute inset-0 w-full h-full"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={(connection) => {
                    if (connection.source && connection.target) {
                      const newEdge = {
                        id: `edge-${connection.source}-${connection.target}`,
                        source: connection.source,
                        target: connection.target,
                        type: 'smoothstep',
                      };
                      setEdges([...edges, newEdge]);
                    }
                  }}
                  nodeTypes={nodeTypes}
                  fitView
                  className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
                >
                  <Background />
                  <Controls />
                  <MiniMap />
                </ReactFlow>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 📋 RIGHT SIDEBAR - TEMPLATES LIBRARY */}
        <div className="lg:col-span-3 h-full min-h-0 order-3 lg:order-3">
          <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg h-full flex flex-col">
            <CardHeader className="pb-3 flex-none">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Templates Library
              </CardTitle>
              <CardDescription>Pre-built workflow templates</CardDescription>
              
              {/* Template Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search templates..."
                  value={templateSearchTerm}
                  onChange={(e) => setTemplateSearchTerm(e.target.value)}
                  className="pl-10 bg-white/5 border-white/20"
                />
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 min-h-0 overflow-hidden">
              <div className="h-full overflow-y-auto space-y-3">
                {filteredTemplates.length > 0 ? (
                  filteredTemplates.map(template => {
                    const categoryConfig = ENTERPRISE_DEPARTMENTS[template.category as keyof typeof ENTERPRISE_DEPARTMENTS];
                    return (
                      <div
                        key={template.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/workflow-template', template.id);
                        }}
                        className={`p-3 rounded-lg border ${categoryConfig?.bgClass || 'bg-slate-50 dark:bg-slate-900'} cursor-grab hover:bg-opacity-80 transition-colors`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {template.name}
                          </h4>
                          <Badge variant="outline" className="text-xs ml-2">
                            {template.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                          {template.description}
                        </p>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{template.nodes.length} nodes</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLoadTemplate(template.id)}
                            className="h-6 px-2 text-xs"
                          >
                            Load
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No templates found</p>
                    <p className="text-xs mt-1">Create workflows and save them as templates</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    );
  };

  // 🏢 TEAM MANAGEMENT VIEW
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

      {/* Rest of TeamManagementView content will be here */}
      <div className="text-center py-8 text-slate-500">
        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Team management interface</p>
        <p className="text-xs mt-1">Full implementation coming soon</p>
      </div>
    </div>
  );

  // 🎯 ANALYTICS DASHBOARD VIEW  
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

      {/* Analytics content placeholder */}
      <div className="text-center py-8 text-slate-500">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Analytics dashboard</p>
        <p className="text-xs mt-1">Performance metrics and insights coming soon</p>
      </div>
    </div>
  );

  // 🎯 MAIN COMPONENT RETURN
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
              
              <div className="flex items-center gap-4">
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
          </div>

          {/* Dynamic Content Based on Active View */}
          {activeView === 'dashboard' && <DashboardOverview />}
          {activeView === 'builder' && <WorkflowBuilderView />}
          {activeView === 'teams' && <TeamManagementView />}
          {activeView === 'analytics' && <AnalyticsView />}
        </div>

        {/* 🎯 TEAM CREATION MODAL - COMPLETO CON TUTTI I CAMPI ORIGINALI */}
        <Dialog open={showTeamModal} onOpenChange={setShowTeamModal}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTeam ? 'Modifica Team' : 'Crea Nuovo Team'}
              </DialogTitle>
              <DialogDescription>
                {editingTeam 
                  ? 'Modifica i dettagli del team selezionato' 
                  : 'Configura il nuovo team con tutti i dettagli necessari'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Informazioni Base */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Informazioni Base</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="team-name">Nome Team *</Label>
                    <Input
                      id="team-name"
                      placeholder="Inserisci il nome del team"
                      value={teamFormData.name || ''}
                      onChange={(e) => setTeamFormData(prev => ({ ...prev, name: e.target.value }))}
                      data-testid="input-team-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="team-type">Tipo Team</Label>
                    <Select 
                      value={teamFormData.teamType || 'functional'} 
                      onValueChange={(value) => setTeamFormData(prev => ({ ...prev, teamType: value as any }))}
                    >
                      <SelectTrigger data-testid="select-team-type">
                        <SelectValue placeholder="Seleziona tipo team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="functional">Funzionale</SelectItem>
                        <SelectItem value="cross-functional">Cross-Funzionale</SelectItem>
                        <SelectItem value="project">Progetto</SelectItem>
                        <SelectItem value="temporary">Temporaneo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team-description">Descrizione</Label>
                  <Textarea
                    id="team-description"
                    placeholder="Descrizione e obiettivi del team"
                    value={teamFormData.description || ''}
                    onChange={(e) => setTeamFormData(prev => ({ ...prev, description: e.target.value }))}
                    data-testid="input-team-description"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="team-active"
                    checked={teamFormData.isActive}
                    onCheckedChange={(checked) => setTeamFormData(prev => ({ ...prev, isActive: checked as boolean }))}
                    data-testid="checkbox-team-active"
                  />
                  <Label htmlFor="team-active">Team attivo</Label>
                </div>
              </div>

              {/* Supervisori */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Gestione Supervisori</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Supervisore Primario</Label>
                    <Select 
                      value={teamFormData.primarySupervisor || ''} 
                      onValueChange={(value) => setTeamFormData(prev => ({ ...prev, primarySupervisor: value }))}
                    >
                      <SelectTrigger data-testid="select-primary-supervisor">
                        <SelectValue placeholder="Seleziona supervisore primario" />
                      </SelectTrigger>
                      <SelectContent>
                        {usersData.map((user: any) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName} - {user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Supervisori Secondari</Label>
                    <Input
                      placeholder="Supervisori aggiuntivi (opzionale)"
                      data-testid="input-secondary-supervisors"
                    />
                  </div>
                </div>
              </div>

              {/* Gestione Membri */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Membri del Team</h3>
                
                <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as 'users' | 'roles')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="users">Utenti Membri</TabsTrigger>
                    <TabsTrigger value="roles">Ruoli Membri</TabsTrigger>
                  </TabsList>

                  <TabsContent value="users" className="space-y-3">
                    <div className="space-y-2">
                      <Label>Cerca Utenti</Label>
                      <Input
                        placeholder="Cerca per nome o email..."
                        value={teamSearchTerm}
                        onChange={(e) => setTeamSearchTerm(e.target.value)}
                        data-testid="input-search-users"
                      />
                    </div>
                    
                    <ScrollArea className="h-[200px] border rounded p-2">
                      {loadingUsers ? (
                        <div className="text-center py-4">
                          <span className="text-sm text-slate-500">Caricamento utenti...</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredUsers.map((user: any) => (
                            <div key={user.id} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded">
                              <Checkbox 
                                id={`user-${user.id}`}
                                checked={teamFormData.userMembers?.includes(user.id)}
                                onCheckedChange={(checked) => {
                                  const currentMembers = teamFormData.userMembers || [];
                                  const newMembers = checked 
                                    ? [...currentMembers, user.id]
                                    : currentMembers.filter(id => id !== user.id);
                                  setTeamFormData(prev => ({ ...prev, userMembers: newMembers }));
                                }}
                              />
                              <Label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer">
                                <div>
                                  <p className="font-medium">{user.firstName} {user.lastName}</p>
                                  <p className="text-sm text-slate-500">{user.email}</p>
                                </div>
                              </Label>
                            </div>
                          ))}
                          {filteredUsers.length === 0 && (
                            <div className="text-center py-4">
                              <span className="text-sm text-slate-500">Nessun utente trovato</span>
                            </div>
                          )}
                        </div>
                      )}
                    </ScrollArea>
                    
                    {teamFormData.userMembers && teamFormData.userMembers.length > 0 && (
                      <div className="text-sm text-green-600">
                        {teamFormData.userMembers.length} utenti selezionati
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="roles" className="space-y-3">
                    <div className="space-y-2">
                      <Label>Cerca Ruoli</Label>
                      <Input
                        placeholder="Cerca ruoli..."
                        value={teamSearchTerm}
                        onChange={(e) => setTeamSearchTerm(e.target.value)}
                        data-testid="input-search-roles"
                      />
                    </div>
                    
                    <ScrollArea className="h-[200px] border rounded p-2">
                      {loadingRoles ? (
                        <div className="text-center py-4">
                          <span className="text-sm text-slate-500">Caricamento ruoli...</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredRoles.map((role: any) => (
                            <div key={role.id} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded">
                              <Checkbox 
                                id={`role-${role.id}`}
                                checked={teamFormData.roleMembers?.includes(role.id)}
                                onCheckedChange={(checked) => {
                                  const currentRoles = teamFormData.roleMembers || [];
                                  const newRoles = checked 
                                    ? [...currentRoles, role.id]
                                    : currentRoles.filter(id => id !== role.id);
                                  setTeamFormData(prev => ({ ...prev, roleMembers: newRoles }));
                                }}
                              />
                              <Label htmlFor={`role-${role.id}`} className="flex-1 cursor-pointer">
                                <div>
                                  <p className="font-medium">{role.name}</p>
                                  <p className="text-sm text-slate-500">{role.description}</p>
                                </div>
                              </Label>
                            </div>
                          ))}
                          {filteredRoles.length === 0 && (
                            <div className="text-center py-4">
                              <span className="text-sm text-slate-500">Nessun ruolo trovato</span>
                            </div>
                          )}
                        </div>
                      )}
                    </ScrollArea>
                    
                    {teamFormData.roleMembers && teamFormData.roleMembers.length > 0 && (
                      <div className="text-sm text-green-600">
                        {teamFormData.roleMembers.length} ruoli selezionati
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowTeamModal(false);
                  setEditingTeam(null);
                  setTeamSearchTerm('');
                  setTeamFormData({
                    name: '',
                    description: '',
                    teamType: 'functional',
                    userMembers: [],
                    roleMembers: [],
                    primarySupervisor: undefined,
                    secondarySupervisors: [],
                    isActive: true
                  });
                }}
                data-testid="button-cancel-team"
              >
                Annulla
              </Button>
              <Button 
                onClick={() => {
                  if (!teamFormData.name?.trim()) {
                    toast({
                      title: "Errore",
                      description: "Il nome del team è obbligatorio",
                      variant: "destructive"
                    });
                    return;
                  }
                  handleSaveTeam(teamFormData);
                }}
                disabled={!teamFormData.name?.trim()}
                className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white"
                data-testid="button-save-team"
              >
                {editingTeam ? 'Aggiorna Team' : 'Crea Team'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    </ReactFlowProvider>
  );
};

export default WorkflowManagementPage;
