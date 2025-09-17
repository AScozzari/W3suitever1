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
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Receipt,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  BookOpen,
  UserPlus,
  Award,
  Download,
  RefreshCw,
  Filter,
  Search,
  Settings,
  Plus,
  Edit,
  Eye,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Building,
  Target,
  FileText,
  CreditCard,
  PieChart,
  BarChart3,
  Activity,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  GraduationCap,
  Heart,
  Car,
  Coffee
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

interface ExpenseMetric {
  id: string;
  label: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'stable';
  icon: React.ComponentType<any>;
  color: keyof typeof COLORS.primary | keyof typeof COLORS.semantic;
  description?: string;
}

interface HRExpense {
  id: string;
  description: string;
  category: 'training' | 'recruitment' | 'benefits' | 'equipment' | 'travel' | 'events' | 'software';
  amount: number;
  date: string;
  status: 'approved' | 'pending' | 'rejected' | 'draft';
  submittedBy: string;
  department: 'HR' | 'Training' | 'Recruitment';
  approver?: string;
  approvalDate?: string;
  vendor: string;
  budgetCategory: string;
  notes?: string;
  attachments: number;
}

interface BudgetCategory {
  id: string;
  name: string;
  totalBudget: number;
  spent: number;
  remaining: number;
  utilization: number;
  expenses: number;
  lastUpdated: string;
  trend: 'up' | 'down' | 'stable';
}

interface ExpenseApproval {
  id: string;
  expenseId: string;
  description: string;
  amount: number;
  submittedBy: string;
  submitDate: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  daysOverdue: number;
}

// Professional KPI Metrics
const expenseKPIs: ExpenseMetric[] = [
  {
    id: 'total-hr-budget',
    label: 'Total HR Budget',
    value: '€485K',
    change: '+8.2%',
    trend: 'up',
    icon: DollarSign,
    color: 'info',
    description: 'Annual HR budget'
  },
  {
    id: 'budget-utilized',
    label: 'Budget Utilized',
    value: '€347K',
    change: '+12.5%',
    trend: 'up',
    icon: Target,
    color: 'warning',
    description: '71.5% of total budget'
  },
  {
    id: 'pending-approvals',
    label: 'Pending Approvals',
    value: 23,
    change: '-5',
    trend: 'down',
    icon: Clock,
    color: 'warning',
    description: 'Awaiting approval'
  },
  {
    id: 'training-expenses',
    label: 'Training Costs',
    value: '€127K',
    change: '+18.3%',
    trend: 'up',
    icon: BookOpen,
    color: 'purple',
    description: 'Employee development'
  },
  {
    id: 'recruitment-costs',
    label: 'Recruitment Costs',
    value: '€89K',
    change: '+7.1%',
    trend: 'up',
    icon: UserPlus,
    color: 'success',
    description: 'Hiring and onboarding'
  },
  {
    id: 'avg-expense',
    label: 'Avg Expense Amount',
    value: '€2,340',
    change: '-3.2%',
    trend: 'down',
    icon: Receipt,
    color: 'info',
    description: 'Per expense request'
  }
];

// HR Expenses Data
const hrExpenses: HRExpense[] = [
  {
    id: '1',
    description: 'Advanced Leadership Training Program',
    category: 'training',
    amount: 12500,
    date: '2024-12-15',
    status: 'approved',
    submittedBy: 'Anna Ferretti',
    department: 'Training',
    approver: 'Roberto Conti',
    approvalDate: '2024-12-16',
    vendor: 'Executive Training Institute',
    budgetCategory: 'Leadership Development',
    notes: 'For senior management team - 20 participants',
    attachments: 3
  },
  {
    id: '2',
    description: 'LinkedIn Talent Solutions - Premium Recruitment',
    category: 'recruitment',
    amount: 8900,
    date: '2024-12-14',
    status: 'pending',
    submittedBy: 'Marco Verde',
    department: 'Recruitment',
    vendor: 'LinkedIn Corporation',
    budgetCategory: 'Recruitment Tools',
    notes: 'Annual subscription for premium recruiting features',
    attachments: 2
  },
  {
    id: '3',
    description: 'Employee Wellness Program - Q1 2025',
    category: 'benefits',
    amount: 15800,
    date: '2024-12-13',
    status: 'approved',
    submittedBy: 'Laura Rossi',
    department: 'HR',
    approver: 'Anna Ferretti',
    approvalDate: '2024-12-14',
    vendor: 'WellCare Solutions',
    budgetCategory: 'Employee Benefits',
    notes: 'Mental health and fitness programs for all employees',
    attachments: 4
  },
  {
    id: '4',
    description: 'HR Management Software - Workday License',
    category: 'software',
    amount: 18600,
    date: '2024-12-12',
    status: 'approved',
    submittedBy: 'Giuseppe Bianchi',
    department: 'HR',
    approver: 'Roberto Conti',
    approvalDate: '2024-12-13',
    vendor: 'Workday Inc.',
    budgetCategory: 'HR Technology',
    notes: 'Annual license renewal for HR management system',
    attachments: 1
  },
  {
    id: '5',
    description: 'Team Building Retreat - Management',
    category: 'events',
    amount: 7400,
    date: '2024-12-11',
    status: 'rejected',
    submittedBy: 'Francesco Neri',
    department: 'HR',
    vendor: 'Event Planning Solutions',
    budgetCategory: 'Team Building',
    notes: 'Budget exceeded for Q4. Reschedule for Q1 2025.',
    attachments: 2
  },
  {
    id: '6',
    description: 'Ergonomic Office Equipment - Standing Desks',
    category: 'equipment',
    amount: 4200,
    date: '2024-12-10',
    status: 'pending',
    submittedBy: 'Maria Gialli',
    department: 'HR',
    vendor: 'Office Solutions Italia',
    budgetCategory: 'Office Equipment',
    notes: '15 adjustable standing desks for Milan office',
    attachments: 3
  }
];

// Budget Categories Data
const budgetCategories: BudgetCategory[] = [
  {
    id: '1',
    name: 'Employee Training & Development',
    totalBudget: 150000,
    spent: 127400,
    remaining: 22600,
    utilization: 84.9,
    expenses: 28,
    lastUpdated: '2024-12-16',
    trend: 'up'
  },
  {
    id: '2',
    name: 'Recruitment & Onboarding',
    totalBudget: 120000,
    spent: 89200,
    remaining: 30800,
    utilization: 74.3,
    expenses: 15,
    lastUpdated: '2024-12-16',
    trend: 'up'
  },
  {
    id: '3',
    name: 'Employee Benefits & Wellness',
    totalBudget: 100000,
    spent: 71800,
    remaining: 28200,
    utilization: 71.8,
    expenses: 12,
    lastUpdated: '2024-12-15',
    trend: 'stable'
  },
  {
    id: '4',
    name: 'HR Technology & Software',
    totalBudget: 80000,
    spent: 42600,
    remaining: 37400,
    utilization: 53.3,
    expenses: 8,
    lastUpdated: '2024-12-14',
    trend: 'down'
  },
  {
    id: '5',
    name: 'Office Equipment & Supplies',
    totalBudget: 35000,
    spent: 16200,
    remaining: 18800,
    utilization: 46.3,
    expenses: 22,
    lastUpdated: '2024-12-13',
    trend: 'stable'
  }
];

// Expense Approvals Data
const expenseApprovals: ExpenseApproval[] = [
  {
    id: '1',
    expenseId: '2',
    description: 'LinkedIn Talent Solutions - Premium Recruitment',
    amount: 8900,
    submittedBy: 'Marco Verde',
    submitDate: '2024-12-14',
    category: 'recruitment',
    priority: 'high',
    daysOverdue: 0
  },
  {
    id: '2',
    expenseId: '6',
    description: 'Ergonomic Office Equipment - Standing Desks',
    amount: 4200,
    submittedBy: 'Maria Gialli',
    submitDate: '2024-12-10',
    category: 'equipment',
    priority: 'medium',
    daysOverdue: 6
  },
  {
    id: '3',
    expenseId: '7',
    description: 'Digital Marketing Training Course',
    amount: 3500,
    submittedBy: 'Alessandro Rossi',
    submitDate: '2024-12-08',
    category: 'training',
    priority: 'low',
    daysOverdue: 8
  }
];

// Professional KPI Card Component
function HRExpenseKPICard({ metric }: { metric: ExpenseMetric }) {
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
      data-testid={`hr-expense-kpi-card-${metric.id}`}
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

export default function HRExpense() {
  const [currentModule, setCurrentModule] = useState<string>('hr-expense');
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'training': return 'bg-purple-100 text-purple-800';
      case 'recruitment': return 'bg-blue-100 text-blue-800';
      case 'benefits': return 'bg-green-100 text-green-800';
      case 'equipment': return 'bg-orange-100 text-orange-800';
      case 'travel': return 'bg-cyan-100 text-cyan-800';
      case 'events': return 'bg-pink-100 text-pink-800';
      case 'software': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'training': return BookOpen;
      case 'recruitment': return UserPlus;
      case 'benefits': return Heart;
      case 'equipment': return Briefcase;
      case 'travel': return Car;
      case 'events': return Coffee;
      case 'software': return Settings;
      default: return Receipt;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredExpenses = hrExpenses.filter(expense => {
    const matchesSearch = 
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.submittedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || expense.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || expense.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto" data-testid="hr-expense-page">
        {/* Professional Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-md rounded-xl shadow-xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent mb-2">
                HR Expense Management
              </h1>
              <p className="text-gray-600">
                HR department expense tracking, budget management and approval workflows
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
              <Button className="bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-lg" data-testid="button-new-expense">
                <Plus className="h-4 w-4 mr-2" />
                Submit Expense
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Professional KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {expenseKPIs.map((metric) => (
            <HRExpenseKPICard key={metric.id} metric={metric} />
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-md border-white/20 shadow-lg grid w-full grid-cols-5">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="expenses" data-testid="tab-expenses">
              <Receipt className="h-4 w-4 mr-2" />
              Expenses
            </TabsTrigger>
            <TabsTrigger value="budgets" data-testid="tab-budgets">
              <Target className="h-4 w-4 mr-2" />
              Budgets
            </TabsTrigger>
            <TabsTrigger value="approvals" data-testid="tab-approvals">
              <CheckCircle className="h-4 w-4 mr-2" />
              Approvals
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <PieChart className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Budget Summary */}
              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    Budget Utilization Summary
                  </CardTitle>
                  <CardDescription>Current budget status across all HR categories</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm font-medium mb-1">
                        <span>Training & Development</span>
                        <span>€127K / €150K</span>
                      </div>
                      <Progress value={84.9} className="h-2" />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>84.9% utilized</span>
                        <span className="text-orange-600">High utilization</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm font-medium mb-1">
                        <span>Recruitment & Onboarding</span>
                        <span>€89K / €120K</span>
                      </div>
                      <Progress value={74.3} className="h-2" />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>74.3% utilized</span>
                        <span className="text-blue-600">On track</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm font-medium mb-1">
                        <span>Employee Benefits</span>
                        <span>€72K / €100K</span>
                      </div>
                      <Progress value={71.8} className="h-2" />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>71.8% utilized</span>
                        <span className="text-green-600">Under budget</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm font-medium mb-1">
                        <span>HR Technology</span>
                        <span>€43K / €80K</span>
                      </div>
                      <Progress value={53.3} className="h-2" />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>53.3% utilized</span>
                        <span className="text-green-600">Under budget</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Expense Activities */}
              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-orange-600" />
                    Recent Expense Activities
                  </CardTitle>
                  <CardDescription>Latest HR expense activities and approvals</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50/50">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          Leadership Training Program Approved
                        </p>
                        <p className="text-xs text-gray-500">€12,500 • 2 hours ago • Anna Ferretti</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50/50">
                      <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          LinkedIn Recruitment Tools Pending
                        </p>
                        <p className="text-xs text-gray-500">€8,900 • 1 day ago • Marco Verde</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50/50">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          Wellness Program Approved
                        </p>
                        <p className="text-xs text-gray-500">€15,800 • 2 days ago • Laura Rossi</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50/50">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          Team Building Retreat Rejected
                        </p>
                        <p className="text-xs text-gray-500">€7,400 • 3 days ago • Francesco Neri</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Expense Categories Overview */}
            <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-purple-600" />
                  Expense Categories Overview
                </CardTitle>
                <CardDescription>Breakdown of HR expenses by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 border border-purple-200 rounded-lg bg-purple-50/50">
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="h-5 w-5 text-purple-600" />
                      <span className="font-medium text-purple-800">Training</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">€127K</p>
                    <p className="text-sm text-gray-600">36.5% of budget</p>
                  </div>
                  
                  <div className="p-4 border border-blue-200 rounded-lg bg-blue-50/50">
                    <div className="flex items-center gap-2 mb-2">
                      <UserPlus className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-800">Recruitment</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">€89K</p>
                    <p className="text-sm text-gray-600">25.6% of budget</p>
                  </div>
                  
                  <div className="p-4 border border-green-200 rounded-lg bg-green-50/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">Benefits</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">€72K</p>
                    <p className="text-sm text-gray-600">20.7% of budget</p>
                  </div>
                  
                  <div className="p-4 border border-orange-200 rounded-lg bg-orange-50/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Settings className="h-5 w-5 text-orange-600" />
                      <span className="font-medium text-orange-800">Technology</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">€59K</p>
                    <p className="text-sm text-gray-600">17.0% of budget</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses">
            <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">HR Expense Management</CardTitle>
                    <CardDescription>Track and manage all HR-related expenses</CardDescription>
                  </div>
                  <div className="flex gap-3">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search expenses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64 bg-white/50 backdrop-blur"
                        data-testid="input-search-expenses"
                      />
                    </div>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg bg-white/50 backdrop-blur"
                      data-testid="select-category"
                    >
                      <option value="all">All Categories</option>
                      <option value="training">Training</option>
                      <option value="recruitment">Recruitment</option>
                      <option value="benefits">Benefits</option>
                      <option value="equipment">Equipment</option>
                      <option value="travel">Travel</option>
                      <option value="events">Events</option>
                      <option value="software">Software</option>
                    </select>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg bg-white/50 backdrop-blur"
                      data-testid="select-status"
                    >
                      <option value="all">All Status</option>
                      <option value="approved">Approved</option>
                      <option value="pending">Pending</option>
                      <option value="rejected">Rejected</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Submitted By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenses.map((expense) => {
                        const CategoryIcon = getCategoryIcon(expense.category);
                        return (
                          <TableRow key={expense.id} className="hover:bg-gray-50/50" data-testid={`expense-row-${expense.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600">
                                  <CategoryIcon className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{expense.description}</p>
                                  {expense.notes && (
                                    <p className="text-sm text-gray-500">{expense.notes.substring(0, 50)}...</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getCategoryColor(expense.category)}>
                                {expense.category}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-gray-900">
                                €{expense.amount.toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                  {expense.submittedBy.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{expense.submittedBy}</p>
                                  <p className="text-xs text-gray-500">{expense.department}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="text-sm">{expense.date}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(expense.status)}>
                                {expense.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{expense.vendor}</span>
                              {expense.attachments > 0 && (
                                <div className="flex items-center gap-1 mt-1">
                                  <FileText className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">{expense.attachments} files</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" data-testid={`button-view-expense-${expense.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" data-testid={`button-edit-expense-${expense.id}`}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Budgets Tab */}
          <TabsContent value="budgets">
            <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-orange-600" />
                  Budget Management
                </CardTitle>
                <CardDescription>Monitor budget utilization across HR categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {budgetCategories.map((budget) => (
                    <motion.div
                      key={budget.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 border border-gray-200 rounded-lg bg-white/50 backdrop-blur hover:shadow-lg transition-all"
                      data-testid={`budget-card-${budget.id}`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{budget.name}</h3>
                          <p className="text-sm text-gray-500">
                            {budget.expenses} expenses • Last updated: {budget.lastUpdated}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {budget.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
                          {budget.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-600" />}
                          {budget.trend === 'stable' && <div className="h-4 w-4 border-b-2 border-gray-600" />}
                          <span className={`text-sm font-medium ${budget.trend === 'up' ? 'text-green-600' : budget.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                            {budget.trend}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <p className="text-xl font-bold text-blue-600">€{(budget.totalBudget / 1000).toFixed(0)}K</p>
                          <p className="text-sm text-gray-600">Total Budget</p>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <p className="text-xl font-bold text-orange-600">€{(budget.spent / 1000).toFixed(0)}K</p>
                          <p className="text-sm text-gray-600">Spent</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-xl font-bold text-green-600">€{(budget.remaining / 1000).toFixed(0)}K</p>
                          <p className="text-sm text-gray-600">Remaining</p>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <p className="text-xl font-bold text-purple-600">{budget.utilization.toFixed(1)}%</p>
                          <p className="text-sm text-gray-600">Utilized</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Budget Utilization</span>
                          <span>{budget.utilization.toFixed(1)}%</span>
                        </div>
                        <Progress value={budget.utilization} />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>€{budget.spent.toLocaleString()} of €{budget.totalBudget.toLocaleString()}</span>
                          <span className={budget.utilization >= 90 ? 'text-red-600 font-medium' : budget.utilization >= 80 ? 'text-yellow-600' : 'text-green-600'}>
                            {budget.utilization >= 90 ? 'Over budget risk' : budget.utilization >= 80 ? 'High utilization' : 'On track'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals">
            <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Expense Approvals Queue
                </CardTitle>
                <CardDescription>Pending expense approvals requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {expenseApprovals.map((approval) => (
                    <motion.div
                      key={approval.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 border border-gray-200 rounded-lg bg-white/50 backdrop-blur hover:shadow-lg transition-all"
                      data-testid={`approval-card-${approval.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600">
                            <Receipt className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{approval.description}</h3>
                            <div className="flex items-center gap-4 mt-1">
                              <Badge className={getCategoryColor(approval.category)}>
                                {approval.category.toUpperCase()}
                              </Badge>
                              <Badge className={getPriorityColor(approval.priority)}>
                                {approval.priority}
                              </Badge>
                              <span className="text-sm text-gray-500">Submitted by {approval.submittedBy}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">
                              €{approval.amount.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-500">
                              {approval.daysOverdue > 0 ? (
                                <span className="text-red-600 font-medium">
                                  {approval.daysOverdue} days overdue
                                </span>
                              ) : (
                                `Submitted ${approval.submitDate}`
                              )}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100" data-testid={`button-reject-${approval.id}`}>
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                            <Button className="bg-gradient-to-r from-green-500 to-green-600 text-white" data-testid={`button-approve-${approval.id}`}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    Expense Trends
                  </CardTitle>
                  <CardDescription>Monthly expense patterns and forecasting</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">+15.3%</p>
                        <p className="text-sm text-gray-600">Monthly Growth</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">€2,340</p>
                        <p className="text-sm text-gray-600">Avg Expense</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-600">127</p>
                        <p className="text-sm text-gray-600">This Month</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">92.5%</p>
                        <p className="text-sm text-gray-600">Approval Rate</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="h-5 w-5 text-orange-600" />
                    Top Expense Categories
                  </CardTitle>
                  <CardDescription>Highest spending categories this quarter</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-purple-600" />
                        <span className="font-medium">Training & Development</span>
                      </div>
                      <span className="font-bold text-purple-600">€127K</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">Recruitment</span>
                      </div>
                      <span className="font-bold text-blue-600">€89K</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Employee Benefits</span>
                      </div>
                      <span className="font-bold text-green-600">€72K</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-orange-600" />
                        <span className="font-medium">HR Technology</span>
                      </div>
                      <span className="font-bold text-orange-600">€59K</span>
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