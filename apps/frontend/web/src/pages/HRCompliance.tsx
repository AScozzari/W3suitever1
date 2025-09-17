import { useState } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/table';
import {
  Shield,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Users,
  BookOpen,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  BarChart3,
  Settings,
  Clock,
  Building,
  Target,
  Award,
  TrendingUp,
  TrendingDown,
  Activity,
  FileText,
  UserCheck,
  Lock,
  Zap,
  Globe,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

// WindTre Color Palette - Professional Enterprise
const COLORS = {
  primary: {
    orange: '#FF6900',
    orangeLight: '#ff8533',
    purple: '#7B2CBF',
    purpleLight: '#9747ff',
  },
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  neutral: {
    dark: '#1f2937',
    medium: '#6b7280',
    light: '#9ca3af',
    lighter: '#e5e7eb',
    lightest: '#f9fafb',
  }
};

interface ComplianceMetric {
  id: string;
  label: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'stable';
  icon: React.ComponentType<any>;
  color: keyof typeof COLORS.primary | keyof typeof COLORS.semantic;
  description?: string;
}

interface AuditRecord {
  id: string;
  type: 'gdpr' | 'safety' | 'training' | 'policy' | 'financial';
  title: string;
  department: string;
  auditor: string;
  status: 'completed' | 'in_progress' | 'scheduled' | 'overdue';
  complianceScore: number;
  lastAudit: string;
  nextAudit: string;
  issues: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface PolicyDocument {
  id: string;
  title: string;
  category: 'gdpr' | 'safety' | 'hr' | 'it' | 'finance';
  version: string;
  status: 'active' | 'draft' | 'under_review' | 'expired';
  lastUpdated: string;
  nextReview: string;
  owner: string;
  acknowledgments: number;
  totalEmployees: number;
}

interface TrainingCompliance {
  id: string;
  trainingName: string;
  category: 'safety' | 'gdpr' | 'security' | 'compliance' | 'ethics';
  required: boolean;
  deadline: string;
  completed: number;
  total: number;
  overdue: number;
  status: 'on_track' | 'at_risk' | 'overdue';
}

// Professional KPI Metrics
const complianceKPIs: ComplianceMetric[] = [
  {
    id: 'overall-compliance',
    label: 'Overall Compliance',
    value: '96.8%',
    change: '+2.3%',
    trend: 'up',
    icon: Shield,
    color: 'success',
    description: 'Company-wide compliance score'
  },
  {
    id: 'active-policies',
    label: 'Active Policies',
    value: 127,
    change: '+8',
    trend: 'up',
    icon: FileCheck,
    color: 'info',
    description: 'Current active policies'
  },
  {
    id: 'pending-audits',
    label: 'Pending Audits',
    value: 12,
    change: '-3',
    trend: 'down',
    icon: AlertTriangle,
    color: 'warning',
    description: 'Scheduled and overdue audits'
  },
  {
    id: 'training-completion',
    label: 'Training Completion',
    value: '94.2%',
    change: '+5.1%',
    trend: 'up',
    icon: BookOpen,
    color: 'purple',
    description: 'Mandatory training completion rate'
  },
  {
    id: 'gdpr-compliance',
    label: 'GDPR Compliance',
    value: '98.5%',
    change: '+1.2%',
    trend: 'up',
    icon: Lock,
    color: 'success',
    description: 'Data protection compliance'
  },
  {
    id: 'safety-incidents',
    label: 'Safety Incidents',
    value: 3,
    change: '-7',
    trend: 'down',
    icon: AlertTriangle,
    color: 'success',
    description: 'This month incidents'
  }
];

// Audit Records Data
const auditRecords: AuditRecord[] = [
  {
    id: '1',
    type: 'gdpr',
    title: 'GDPR Data Protection Audit',
    department: 'IT & Security',
    auditor: 'External Auditor - PwC',
    status: 'completed',
    complianceScore: 98.5,
    lastAudit: '2024-11-15',
    nextAudit: '2025-11-15',
    issues: 2,
    priority: 'low'
  },
  {
    id: '2',
    type: 'safety',
    title: 'Workplace Safety Inspection',
    department: 'Operations',
    auditor: 'Safety Inspector - Marco Verdi',
    status: 'in_progress',
    complianceScore: 92.3,
    lastAudit: '2024-06-10',
    nextAudit: '2024-12-20',
    issues: 5,
    priority: 'medium'
  },
  {
    id: '3',
    type: 'training',
    title: 'Mandatory Training Compliance',
    department: 'Human Resources',
    auditor: 'HR Manager - Anna Ferretti',
    status: 'scheduled',
    complianceScore: 94.2,
    lastAudit: '2024-09-01',
    nextAudit: '2024-12-25',
    issues: 8,
    priority: 'medium'
  },
  {
    id: '4',
    type: 'financial',
    title: 'Financial Compliance Review',
    department: 'Finance',
    auditor: 'External Auditor - KPMG',
    status: 'overdue',
    complianceScore: 89.7,
    lastAudit: '2024-03-15',
    nextAudit: '2024-12-15',
    issues: 12,
    priority: 'high'
  }
];

// Policy Documents Data
const policyDocuments: PolicyDocument[] = [
  {
    id: '1',
    title: 'Data Protection and Privacy Policy',
    category: 'gdpr',
    version: '3.2',
    status: 'active',
    lastUpdated: '2024-10-15',
    nextReview: '2025-10-15',
    owner: 'Data Protection Officer',
    acknowledgments: 1189,
    totalEmployees: 1247
  },
  {
    id: '2',
    title: 'Workplace Safety Guidelines',
    category: 'safety',
    version: '2.8',
    status: 'active',
    lastUpdated: '2024-09-20',
    nextReview: '2025-03-20',
    owner: 'Safety Manager',
    acknowledgments: 1156,
    totalEmployees: 1247
  },
  {
    id: '3',
    title: 'Employee Code of Conduct',
    category: 'hr',
    version: '4.1',
    status: 'under_review',
    lastUpdated: '2024-11-30',
    nextReview: '2025-05-30',
    owner: 'HR Director',
    acknowledgments: 1098,
    totalEmployees: 1247
  },
  {
    id: '4',
    title: 'IT Security Policy',
    category: 'it',
    version: '5.3',
    status: 'active',
    lastUpdated: '2024-12-01',
    nextReview: '2025-06-01',
    owner: 'IT Security Manager',
    acknowledgments: 1203,
    totalEmployees: 1247
  }
];

// Training Compliance Data
const trainingCompliance: TrainingCompliance[] = [
  {
    id: '1',
    trainingName: 'GDPR Data Protection Training',
    category: 'gdpr',
    required: true,
    deadline: '2024-12-31',
    completed: 1156,
    total: 1247,
    overdue: 23,
    status: 'on_track'
  },
  {
    id: '2',
    trainingName: 'Workplace Safety Certification',
    category: 'safety',
    required: true,
    deadline: '2024-12-20',
    completed: 1089,
    total: 1247,
    overdue: 45,
    status: 'at_risk'
  },
  {
    id: '3',
    trainingName: 'Information Security Awareness',
    category: 'security',
    required: true,
    deadline: '2025-01-15',
    completed: 967,
    total: 1247,
    overdue: 8,
    status: 'on_track'
  },
  {
    id: '4',
    trainingName: 'Anti-Harassment Training',
    category: 'ethics',
    required: true,
    deadline: '2024-12-15',
    completed: 892,
    total: 1247,
    overdue: 178,
    status: 'overdue'
  }
];

// Professional KPI Card Component
function ComplianceKPICard({ metric }: { metric: ComplianceMetric }) {
  const Icon = metric.icon;
  const isPositive = metric.trend === 'up';
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  
  const getGradientColor = (color: string) => {
    switch (color) {
      case 'orange': return `linear-gradient(135deg, ${COLORS.primary.orange}, ${COLORS.primary.orangeLight})`;
      case 'purple': return `linear-gradient(135deg, ${COLORS.primary.purple}, ${COLORS.primary.purpleLight})`;
      case 'success': return `linear-gradient(135deg, ${COLORS.semantic.success}, #059669)`;
      case 'warning': return `linear-gradient(135deg, ${COLORS.semantic.warning}, #d97706)`;
      case 'error': return `linear-gradient(135deg, ${COLORS.semantic.error}, #dc2626)`;
      case 'info': return `linear-gradient(135deg, ${COLORS.semantic.info}, #2563eb)`;
      default: return `linear-gradient(135deg, ${COLORS.primary.orange}, ${COLORS.primary.orangeLight})`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      data-testid={`compliance-kpi-card-${metric.id}`}
    >
      <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">
                {metric.label}
              </p>
              <p className="text-2xl font-bold text-gray-900 mb-2">
                {metric.value}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <TrendIcon className={cn("h-4 w-4", isPositive ? "text-green-600" : "text-red-600")} />
                  <span className={cn("text-sm font-medium", isPositive ? "text-green-600" : "text-red-600")}>
                    {metric.change}
                  </span>
                </div>
                {metric.description && (
                  <span className="text-xs text-gray-500">
                    {metric.description}
                  </span>
                )}
              </div>
            </div>
            <div 
              className="p-3 rounded-xl"
              style={{ background: getGradientColor(metric.color) }}
            >
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function HRCompliance() {
  const [currentModule, setCurrentModule] = useState<string>('hr-compliance');
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': case 'active': return 'bg-green-100 text-green-800';
      case 'in_progress': case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'scheduled': case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': case 'expired': return 'bg-red-100 text-red-800';
      case 'on_track': return 'bg-green-100 text-green-800';
      case 'at_risk': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'gdpr': return 'bg-purple-100 text-purple-800';
      case 'safety': return 'bg-orange-100 text-orange-800';
      case 'hr': return 'bg-blue-100 text-blue-800';
      case 'it': return 'bg-green-100 text-green-800';
      case 'finance': return 'bg-red-100 text-red-800';
      case 'security': return 'bg-gray-100 text-gray-800';
      case 'ethics': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto" data-testid="hr-compliance-page">
        {/* Professional Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-md rounded-xl shadow-xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent mb-2">
                HR Compliance Center
              </h1>
              <p className="text-gray-600">
                Enterprise compliance management, audits, and regulatory tracking
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="bg-white/60 backdrop-blur border-white/30" data-testid="button-refresh">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
              <Button variant="outline" className="bg-white/60 backdrop-blur border-white/30" data-testid="button-export">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button className="bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-lg" data-testid="button-new-audit">
                <Plus className="h-4 w-4 mr-2" />
                Schedule Audit
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Professional KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {complianceKPIs.map((metric) => (
            <ComplianceKPICard key={metric.id} metric={metric} />
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-md border-white/20 shadow-lg grid w-full grid-cols-5">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="audits" data-testid="tab-audits">
              <FileCheck className="h-4 w-4 mr-2" />
              Audits
            </TabsTrigger>
            <TabsTrigger value="policies" data-testid="tab-policies">
              <Shield className="h-4 w-4 mr-2" />
              Policies
            </TabsTrigger>
            <TabsTrigger value="training" data-testid="tab-training">
              <BookOpen className="h-4 w-4 mr-2" />
              Training
            </TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports">
              <FileText className="h-4 w-4 mr-2" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Compliance Score Breakdown */}
              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-600" />
                    Compliance Score Breakdown
                  </CardTitle>
                  <CardDescription>Current compliance status across all areas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm font-medium mb-1">
                        <span>GDPR Compliance</span>
                        <span>98.5%</span>
                      </div>
                      <Progress value={98.5} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm font-medium mb-1">
                        <span>Safety Compliance</span>
                        <span>94.2%</span>
                      </div>
                      <Progress value={94.2} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm font-medium mb-1">
                        <span>Training Compliance</span>
                        <span>92.8%</span>
                      </div>
                      <Progress value={92.8} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm font-medium mb-1">
                        <span>Policy Acknowledgment</span>
                        <span>96.1%</span>
                      </div>
                      <Progress value={96.1} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Compliance Activities */}
              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-orange-600" />
                    Recent Compliance Activities
                  </CardTitle>
                  <CardDescription>Latest compliance-related events</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50/50">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          GDPR Audit Completed
                        </p>
                        <p className="text-xs text-gray-500">2 hours ago • External Auditor</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50/50">
                      <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          Safety Training Module Updated
                        </p>
                        <p className="text-xs text-gray-500">1 day ago • Safety Manager</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50/50">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          Policy Review Due
                        </p>
                        <p className="text-xs text-gray-500">2 days ago • HR Director</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Deadlines */}
            <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  Upcoming Compliance Deadlines
                </CardTitle>
                <CardDescription>Critical deadlines requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 border border-red-200 rounded-lg bg-red-50/50">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">Critical</span>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">Anti-Harassment Training</h4>
                    <p className="text-sm text-gray-600">Due: Dec 15, 2024</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Completion</span>
                        <span>71.6%</span>
                      </div>
                      <Progress value={71.6} className="h-1" />
                    </div>
                  </div>
                  
                  <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">Approaching</span>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">Safety Certification</h4>
                    <p className="text-sm text-gray-600">Due: Dec 20, 2024</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Completion</span>
                        <span>87.3%</span>
                      </div>
                      <Progress value={87.3} className="h-1" />
                    </div>
                  </div>
                  
                  <div className="p-4 border border-green-200 rounded-lg bg-green-50/50">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">On Track</span>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">GDPR Training</h4>
                    <p className="text-sm text-gray-600">Due: Dec 31, 2024</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Completion</span>
                        <span>92.7%</span>
                      </div>
                      <Progress value={92.7} className="h-1" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audits Tab */}
          <TabsContent value="audits">
            <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Compliance Audits</CardTitle>
                    <CardDescription>Audit schedule and compliance tracking</CardDescription>
                  </div>
                  <div className="flex gap-3">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search audits..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-orange-500"
                        data-testid="input-search-audits"
                      />
                    </div>
                    <Button variant="outline" size="sm" data-testid="button-filter-audits">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Audit</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Auditor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Issues</TableHead>
                        <TableHead>Next Audit</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditRecords.map((audit) => (
                        <TableRow key={audit.id} className="hover:bg-gray-50/50" data-testid={`audit-row-${audit.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div 
                                className="p-2 rounded-lg"
                                style={{
                                  background: audit.type === 'gdpr' ? 'linear-gradient(135deg, #7B2CBF, #9747ff)' :
                                           audit.type === 'safety' ? 'linear-gradient(135deg, #FF6900, #ff8533)' :
                                           audit.type === 'training' ? 'linear-gradient(135deg, #10b981, #059669)' :
                                           'linear-gradient(135deg, #3b82f6, #2563eb)'
                                }}
                              >
                                {audit.type === 'gdpr' && <Lock className="h-4 w-4 text-white" />}
                                {audit.type === 'safety' && <Shield className="h-4 w-4 text-white" />}
                                {audit.type === 'training' && <BookOpen className="h-4 w-4 text-white" />}
                                {audit.type === 'financial' && <Target className="h-4 w-4 text-white" />}
                                {audit.type === 'policy' && <FileCheck className="h-4 w-4 text-white" />}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{audit.title}</p>
                                <p className="text-sm text-gray-500">{audit.type.toUpperCase()}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Building className="h-4 w-4 text-gray-400" />
                              <span>{audit.department}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{audit.auditor}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(audit.status)}>
                              {audit.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Star className={`h-4 w-4 ${audit.complianceScore >= 95 ? 'text-green-600' : audit.complianceScore >= 90 ? 'text-blue-600' : audit.complianceScore >= 80 ? 'text-yellow-600' : 'text-red-600'}`} />
                              <span className={`font-medium ${audit.complianceScore >= 95 ? 'text-green-600' : audit.complianceScore >= 90 ? 'text-blue-600' : audit.complianceScore >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {audit.complianceScore.toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPriorityColor(audit.priority)} variant="outline">
                              {audit.issues} issues
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">{audit.nextAudit}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" data-testid={`button-view-audit-${audit.id}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`button-edit-audit-${audit.id}`}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies">
            <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Policy Management</CardTitle>
                    <CardDescription>Company policies and employee acknowledgments</CardDescription>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="bg-white/60 backdrop-blur border-white/30" data-testid="button-upload-policy">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Policy
                    </Button>
                    <Button className="bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-lg" data-testid="button-new-policy">
                      <Plus className="h-4 w-4 mr-2" />
                      New Policy
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {policyDocuments.map((policy) => (
                    <motion.div
                      key={policy.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 border border-gray-200 rounded-lg bg-white/50 backdrop-blur hover:shadow-lg transition-all"
                      data-testid={`policy-card-${policy.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600">
                            <FileCheck className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{policy.title}</h3>
                            <div className="flex items-center gap-4 mt-1">
                              <Badge className={getCategoryColor(policy.category)}>
                                {policy.category.toUpperCase()}
                              </Badge>
                              <span className="text-sm text-gray-500">Version {policy.version}</span>
                              <span className="text-sm text-gray-500">Owner: {policy.owner}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge className={getStatusColor(policy.status)}>
                            {policy.status.replace('_', ' ')}
                          </Badge>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" data-testid={`button-view-policy-${policy.id}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" data-testid={`button-edit-policy-${policy.id}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Acknowledgment Progress */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Employee Acknowledgments</span>
                          <span className="text-sm text-gray-500">
                            {policy.acknowledgments} of {policy.totalEmployees} ({((policy.acknowledgments / policy.totalEmployees) * 100).toFixed(1)}%)
                          </span>
                        </div>
                        <Progress value={(policy.acknowledgments / policy.totalEmployees) * 100} className="h-2" />
                      </div>

                      {/* Dates */}
                      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                        <span>Last updated: {policy.lastUpdated}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Next review: {policy.nextReview}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Training Tab */}
          <TabsContent value="training">
            <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                  Training Compliance Tracking
                </CardTitle>
                <CardDescription>Mandatory training completion and compliance status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {trainingCompliance.map((training) => (
                    <motion.div
                      key={training.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 border border-gray-200 rounded-lg bg-white/50 backdrop-blur"
                      data-testid={`training-card-${training.id}`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${training.required ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}>
                            <BookOpen className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{training.trainingName}</h3>
                            <div className="flex items-center gap-4 mt-1">
                              <Badge className={getCategoryColor(training.category)}>
                                {training.category.toUpperCase()}
                              </Badge>
                              {training.required && (
                                <Badge className="bg-red-100 text-red-800">Required</Badge>
                              )}
                              <span className="text-sm text-gray-500">Due: {training.deadline}</span>
                            </div>
                          </div>
                        </div>
                        <Badge className={getStatusColor(training.status)}>
                          {training.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      {/* Progress Statistics */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">{training.completed}</p>
                          <p className="text-sm text-gray-600">Completed</p>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">{training.total - training.completed - training.overdue}</p>
                          <p className="text-sm text-gray-600">In Progress</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <p className="text-2xl font-bold text-red-600">{training.overdue}</p>
                          <p className="text-sm text-gray-600">Overdue</p>
                        </div>
                      </div>

                      {/* Completion Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Overall Completion</span>
                          <span>{((training.completed / training.total) * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={(training.completed / training.total) * 100} />
                        {training.overdue > 0 && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            {training.overdue} employees overdue
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-orange-600" />
                    Compliance Reports
                  </CardTitle>
                  <CardDescription>Generate detailed compliance reports</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <Button variant="outline" className="justify-start" data-testid="button-audit-report">
                      <FileCheck className="h-4 w-4 mr-2" />
                      Audit Summary Report
                    </Button>
                    <Button variant="outline" className="justify-start" data-testid="button-policy-report">
                      <Shield className="h-4 w-4 mr-2" />
                      Policy Compliance Report
                    </Button>
                    <Button variant="outline" className="justify-start" data-testid="button-training-report">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Training Compliance Report
                    </Button>
                    <Button variant="outline" className="justify-start" data-testid="button-gdpr-report">
                      <Lock className="h-4 w-4 mr-2" />
                      GDPR Compliance Report
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Download className="h-5 w-5 text-purple-600" />
                    Export Options
                  </CardTitle>
                  <CardDescription>Download reports in various formats</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                      <span className="font-medium">PDF Report</span>
                      <Button variant="outline" size="sm" data-testid="button-export-pdf">
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    </div>
                    <div className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                      <span className="font-medium">Excel Spreadsheet</span>
                      <Button variant="outline" size="sm" data-testid="button-export-excel">
                        <Download className="h-4 w-4 mr-1" />
                        Excel
                      </Button>
                    </div>
                    <div className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                      <span className="font-medium">CSV Data</span>
                      <Button variant="outline" size="sm" data-testid="button-export-csv">
                        <Download className="h-4 w-4 mr-1" />
                        CSV
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}