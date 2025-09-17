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
import {
  FileBarChart,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  Award,
  Download,
  RefreshCw,
  Filter,
  Search,
  Settings,
  PieChart,
  LineChart,
  Activity,
  Clock,
  Building,
  Target,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  Plus,
  Eye,
  Edit,
  FileText,
  Printer,
  Mail,
  Share,
  BookOpen,
  MapPin,
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

interface ReportMetric {
  id: string;
  label: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'stable';
  icon: React.ComponentType<any>;
  color: keyof typeof COLORS.primary | keyof typeof COLORS.semantic;
  description?: string;
}

interface EmployeeReport {
  id: string;
  name: string;
  department: string;
  role: string;
  hireDate: string;
  status: 'active' | 'inactive' | 'onLeave';
  attendance: number;
  performance: number;
  salary: number;
  overtimeHours: number;
  leaveBalance: number;
  trainingCompleted: number;
}

interface AttendanceReport {
  id: string;
  department: string;
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  onLeave: number;
  late: number;
  attendanceRate: number;
  weeklyAverage: number;
  monthlyTrend: 'up' | 'down' | 'stable';
}

interface PayrollReport {
  id: string;
  department: string;
  totalSalary: number;
  overtime: number;
  benefits: number;
  deductions: number;
  netPayroll: number;
  budgetUsed: number;
  budgetTotal: number;
  employees: number;
}

interface PerformanceReport {
  id: string;
  department: string;
  avgPerformance: number;
  topPerformers: number;
  needsImprovement: number;
  reviewsCompleted: number;
  reviewsPending: number;
  goalAchievementRate: number;
}

// Professional KPI Metrics
const reportKPIs: ReportMetric[] = [
  {
    id: 'total-reports',
    label: 'Reports Generated',
    value: 847,
    change: '+15.3%',
    trend: 'up',
    icon: FileBarChart,
    color: 'info',
    description: 'This month'
  },
  {
    id: 'active-employees',
    label: 'Active Employees',
    value: 1247,
    change: '+3.2%',
    trend: 'up',
    icon: Users,
    color: 'success',
    description: 'Company-wide'
  },
  {
    id: 'avg-attendance',
    label: 'Avg Attendance',
    value: '94.7%',
    change: '+2.1%',
    trend: 'up',
    icon: UserCheck,
    color: 'success',
    description: 'Monthly average'
  },
  {
    id: 'payroll-cost',
    label: 'Monthly Payroll',
    value: '€847K',
    change: '+2.8%',
    trend: 'up',
    icon: DollarSign,
    color: 'orange',
    description: 'Total cost'
  },
  {
    id: 'performance-avg',
    label: 'Avg Performance',
    value: '4.3/5',
    change: '+0.2',
    trend: 'up',
    icon: Award,
    color: 'purple',
    description: 'Company-wide score'
  },
  {
    id: 'training-completion',
    label: 'Training Completion',
    value: '89.2%',
    change: '+7.1%',
    trend: 'up',
    icon: BookOpen,
    color: 'success',
    description: 'Mandatory trainings'
  }
];

// Employee Reports Data
const employeeReports: EmployeeReport[] = [
  {
    id: '1',
    name: 'Mario Rossi',
    department: 'Sales',
    role: 'Store Manager',
    hireDate: '2019-03-15',
    status: 'active',
    attendance: 96.2,
    performance: 4.7,
    salary: 45000,
    overtimeHours: 12,
    leaveBalance: 18,
    trainingCompleted: 8
  },
  {
    id: '2',
    name: 'Laura Bianchi',
    department: 'Sales',
    role: 'Sales Specialist',
    hireDate: '2020-07-20',
    status: 'active',
    attendance: 94.8,
    performance: 4.5,
    salary: 35000,
    overtimeHours: 8,
    leaveBalance: 22,
    trainingCompleted: 6
  },
  {
    id: '3',
    name: 'Giuseppe Verde',
    department: 'Customer Service',
    role: 'Technical Support',
    hireDate: '2021-01-10',
    status: 'active',
    attendance: 91.5,
    performance: 4.3,
    salary: 32000,
    overtimeHours: 15,
    leaveBalance: 12,
    trainingCompleted: 4
  },
  {
    id: '4',
    name: 'Anna Ferretti',
    department: 'Management',
    role: 'Area Manager',
    hireDate: '2018-05-12',
    status: 'active',
    attendance: 98.1,
    performance: 4.8,
    salary: 55000,
    overtimeHours: 20,
    leaveBalance: 25,
    trainingCompleted: 12
  }
];

// Attendance Reports Data
const attendanceReports: AttendanceReport[] = [
  {
    id: '1',
    department: 'Sales',
    totalEmployees: 342,
    presentToday: 328,
    absentToday: 8,
    onLeave: 6,
    late: 12,
    attendanceRate: 95.9,
    weeklyAverage: 94.2,
    monthlyTrend: 'up'
  },
  {
    id: '2',
    department: 'Customer Service',
    totalEmployees: 189,
    presentToday: 179,
    absentToday: 5,
    onLeave: 3,
    late: 2,
    attendanceRate: 94.7,
    weeklyAverage: 93.1,
    monthlyTrend: 'up'
  },
  {
    id: '3',
    department: 'Operations',
    totalEmployees: 234,
    presentToday: 218,
    absentToday: 12,
    onLeave: 4,
    late: 8,
    attendanceRate: 93.2,
    weeklyAverage: 92.8,
    monthlyTrend: 'stable'
  },
  {
    id: '4',
    department: 'Management',
    totalEmployees: 67,
    presentToday: 66,
    absentToday: 1,
    onLeave: 0,
    late: 0,
    attendanceRate: 98.5,
    weeklyAverage: 97.8,
    monthlyTrend: 'up'
  }
];

// Payroll Reports Data
const payrollReports: PayrollReport[] = [
  {
    id: '1',
    department: 'Sales',
    totalSalary: 312000,
    overtime: 18400,
    benefits: 42300,
    deductions: 15600,
    netPayroll: 357100,
    budgetUsed: 89.2,
    budgetTotal: 400000,
    employees: 342
  },
  {
    id: '2',
    department: 'Customer Service',
    totalSalary: 185000,
    overtime: 8900,
    benefits: 22100,
    deductions: 9200,
    netPayroll: 206800,
    budgetUsed: 82.7,
    budgetTotal: 250000,
    employees: 189
  },
  {
    id: '3',
    department: 'Operations',
    totalSalary: 223000,
    overtime: 15600,
    benefits: 31200,
    deductions: 11800,
    netPayroll: 258000,
    budgetUsed: 86.0,
    budgetTotal: 300000,
    employees: 234
  },
  {
    id: '4',
    department: 'Management',
    totalSalary: 127000,
    overtime: 4200,
    benefits: 19800,
    deductions: 6300,
    netPayroll: 144700,
    budgetUsed: 72.4,
    budgetTotal: 200000,
    employees: 67
  }
];

// Performance Reports Data
const performanceReports: PerformanceReport[] = [
  {
    id: '1',
    department: 'Sales',
    avgPerformance: 4.5,
    topPerformers: 89,
    needsImprovement: 23,
    reviewsCompleted: 298,
    reviewsPending: 44,
    goalAchievementRate: 87.3
  },
  {
    id: '2',
    department: 'Customer Service',
    avgPerformance: 4.2,
    topPerformers: 56,
    needsImprovement: 18,
    reviewsCompleted: 167,
    reviewsPending: 22,
    goalAchievementRate: 83.1
  },
  {
    id: '3',
    department: 'Operations',
    avgPerformance: 4.3,
    topPerformers: 72,
    needsImprovement: 28,
    reviewsCompleted: 201,
    reviewsPending: 33,
    goalAchievementRate: 85.7
  },
  {
    id: '4',
    department: 'Management',
    avgPerformance: 4.7,
    topPerformers: 28,
    needsImprovement: 3,
    reviewsCompleted: 64,
    reviewsPending: 3,
    goalAchievementRate: 92.5
  }
];

// Professional KPI Card Component
function ReportKPICard({ metric }: { metric: ReportMetric }) {
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
      data-testid={`report-kpi-card-${metric.id}`}
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

export default function HRReports() {
  const [currentModule, setCurrentModule] = useState<string>('hr-reports');
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState('current_month');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'onLeave': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 4.0) return 'text-blue-600';
    if (score >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      case 'stable': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const departments = ['Sales', 'Customer Service', 'Operations', 'Management'];

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto" data-testid="hr-reports-page">
        {/* Professional Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-md rounded-xl shadow-xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent mb-2">
                HR Reports & Analytics
              </h1>
              <p className="text-gray-600">
                Comprehensive reporting system with advanced analytics and insights
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="bg-white/60 backdrop-blur border-white/30" data-testid="button-refresh">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
              <Button variant="outline" className="bg-white/60 backdrop-blur border-white/30" data-testid="button-schedule">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Report
              </Button>
              <Button className="bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-lg" data-testid="button-generate">
                <Plus className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Professional KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportKPIs.map((metric) => (
            <ReportKPICard key={metric.id} metric={metric} />
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-md border-white/20 shadow-lg grid w-full grid-cols-5">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="employees" data-testid="tab-employees">
              <Users className="h-4 w-4 mr-2" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="attendance" data-testid="tab-attendance">
              <UserCheck className="h-4 w-4 mr-2" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="payroll" data-testid="tab-payroll">
              <DollarSign className="h-4 w-4 mr-2" />
              Payroll
            </TabsTrigger>
            <TabsTrigger value="performance" data-testid="tab-performance">
              <Award className="h-4 w-4 mr-2" />
              Performance
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Report Generation */}
              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileBarChart className="h-5 w-5 text-purple-600" />
                    Quick Report Generation
                  </CardTitle>
                  <CardDescription>Generate reports with pre-configured templates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <Button variant="outline" className="justify-start h-12" data-testid="button-employee-report">
                      <Users className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Employee Summary Report</div>
                        <div className="text-sm text-gray-500">Comprehensive employee data</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="justify-start h-12" data-testid="button-attendance-report">
                      <UserCheck className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Attendance Analytics</div>
                        <div className="text-sm text-gray-500">Daily, weekly, monthly trends</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="justify-start h-12" data-testid="button-payroll-report">
                      <DollarSign className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Payroll Summary</div>
                        <div className="text-sm text-gray-500">Cost analysis and budgets</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="justify-start h-12" data-testid="button-performance-report">
                      <Award className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Performance Analytics</div>
                        <div className="text-sm text-gray-500">Goals and achievements</div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Export Options */}
              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Download className="h-5 w-5 text-orange-600" />
                    Export & Sharing Options
                  </CardTitle>
                  <CardDescription>Multiple formats and sharing capabilities</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="h-12" data-testid="button-export-pdf">
                      <FileText className="h-5 w-5 mr-2" />
                      <div className="text-left">
                        <div className="font-medium">PDF</div>
                        <div className="text-xs text-gray-500">Formatted report</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-12" data-testid="button-export-excel">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      <div className="text-left">
                        <div className="font-medium">Excel</div>
                        <div className="text-xs text-gray-500">Data analysis</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-12" data-testid="button-export-csv">
                      <Download className="h-5 w-5 mr-2" />
                      <div className="text-left">
                        <div className="font-medium">CSV</div>
                        <div className="text-xs text-gray-500">Raw data</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-12" data-testid="button-share-email">
                      <Mail className="h-5 w-5 mr-2" />
                      <div className="text-left">
                        <div className="font-medium">Email</div>
                        <div className="text-xs text-gray-500">Direct sharing</div>
                      </div>
                    </Button>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="font-medium mb-2">Automated Reports</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Weekly Summary</span>
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Monthly Analytics</span>
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Quarterly Review</span>
                        <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Reports */}
            <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-600" />
                  Recently Generated Reports
                </CardTitle>
                <CardDescription>Your latest report activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium">Employee Report - December 2024</h4>
                        <p className="text-sm text-gray-500">Generated 2 hours ago • PDF, 847 KB</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" data-testid="button-view-recent-1">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" data-testid="button-download-recent-1">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-green-600">
                        <UserCheck className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium">Attendance Analytics - November 2024</h4>
                        <p className="text-sm text-gray-500">Generated 1 day ago • Excel, 1.2 MB</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" data-testid="button-view-recent-2">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" data-testid="button-download-recent-2">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600">
                        <Award className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium">Performance Review Summary</h4>
                        <p className="text-sm text-gray-500">Generated 3 days ago • PDF, 2.1 MB</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" data-testid="button-view-recent-3">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" data-testid="button-download-recent-3">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees">
            <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Employee Reports</CardTitle>
                    <CardDescription>Detailed employee data and analytics</CardDescription>
                  </div>
                  <div className="flex gap-3">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search employees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64 bg-white/50 backdrop-blur"
                        data-testid="input-search-employees"
                      />
                    </div>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg bg-white/50 backdrop-blur"
                      data-testid="select-department"
                    >
                      <option value="all">All Departments</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                    <Button variant="outline" size="sm" data-testid="button-export-employees">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Attendance</TableHead>
                        <TableHead>Performance</TableHead>
                        <TableHead>Salary</TableHead>
                        <TableHead>Overtime</TableHead>
                        <TableHead>Leave Balance</TableHead>
                        <TableHead>Training</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeeReports
                        .filter(emp => {
                          const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
                          const matchesDepartment = selectedDepartment === 'all' || emp.department === selectedDepartment;
                          return matchesSearch && matchesDepartment;
                        })
                        .map((employee) => (
                          <TableRow key={employee.id} className="hover:bg-gray-50/50" data-testid={`employee-report-row-${employee.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                  {employee.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{employee.name}</p>
                                  <p className="text-sm text-gray-500">{employee.role}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Building className="h-4 w-4 text-gray-400" />
                                <span>{employee.department}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(employee.status)}>
                                {employee.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <UserCheck className="h-4 w-4 text-gray-400" />
                                <span className={employee.attendance >= 95 ? 'text-green-600 font-medium' : employee.attendance >= 90 ? 'text-blue-600' : 'text-red-600'}>
                                  {employee.attendance.toFixed(1)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Star className={`h-4 w-4 ${getPerformanceColor(employee.performance)}`} />
                                <span className={`font-medium ${getPerformanceColor(employee.performance)}`}>
                                  {employee.performance.toFixed(1)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">€{employee.salary.toLocaleString()}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span>{employee.overtimeHours}h</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{employee.leaveBalance} days</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <BookOpen className="h-4 w-4 text-gray-400" />
                                <span>{employee.trainingCompleted}</span>
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

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <div className="space-y-6">
              {/* Attendance Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Present Today</p>
                        <p className="text-2xl font-bold text-green-600">1,191</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600">
                        <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Absent Today</p>
                        <p className="text-2xl font-bold text-red-600">26</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600">
                        <AlertTriangle className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">On Leave</p>
                        <p className="text-2xl font-bold text-blue-600">13</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600">
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Late Today</p>
                        <p className="text-2xl font-bold text-yellow-600">22</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600">
                        <Clock className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Department Attendance Table */}
              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-purple-600" />
                    Department Attendance Overview
                  </CardTitle>
                  <CardDescription>Real-time attendance tracking by department</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Department</TableHead>
                          <TableHead>Total Staff</TableHead>
                          <TableHead>Present</TableHead>
                          <TableHead>Absent</TableHead>
                          <TableHead>On Leave</TableHead>
                          <TableHead>Late</TableHead>
                          <TableHead>Attendance Rate</TableHead>
                          <TableHead>Weekly Avg</TableHead>
                          <TableHead>Trend</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceReports.map((dept) => (
                          <TableRow key={dept.id} className="hover:bg-gray-50/50" data-testid={`attendance-row-${dept.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">{dept.department}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{dept.totalEmployees}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-green-600 font-medium">{dept.presentToday}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <span className="text-red-600">{dept.absentToday}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-blue-600" />
                                <span className="text-blue-600">{dept.onLeave}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-yellow-600" />
                                <span className="text-yellow-600">{dept.late}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-16">
                                  <Progress value={dept.attendanceRate} className="h-2" />
                                </div>
                                <span className={dept.attendanceRate >= 95 ? 'text-green-600 font-medium' : dept.attendanceRate >= 90 ? 'text-blue-600' : 'text-red-600'}>
                                  {dept.attendanceRate.toFixed(1)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-gray-600">{dept.weeklyAverage.toFixed(1)}%</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {dept.monthlyTrend === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
                                {dept.monthlyTrend === 'down' && <TrendingDown className="h-4 w-4 text-red-600" />}
                                {dept.monthlyTrend === 'stable' && <div className="h-4 w-4 border-b-2 border-gray-600" />}
                                <span className={getTrendColor(dept.monthlyTrend)}>
                                  {dept.monthlyTrend}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payroll Tab */}
          <TabsContent value="payroll">
            <div className="space-y-6">
              {/* Payroll Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Payroll</p>
                        <p className="text-2xl font-bold text-gray-900">€847K</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600">
                        <DollarSign className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Overtime Costs</p>
                        <p className="text-2xl font-bold text-orange-600">€47K</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600">
                        <Clock className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Benefits</p>
                        <p className="text-2xl font-bold text-blue-600">€115K</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600">
                        <Award className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Budget Usage</p>
                        <p className="text-2xl font-bold text-green-600">84.2%</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600">
                        <Target className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Department Payroll Table */}
              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-orange-600" />
                    Department Payroll Breakdown
                  </CardTitle>
                  <CardDescription>Monthly payroll costs and budget tracking</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Department</TableHead>
                          <TableHead>Employees</TableHead>
                          <TableHead>Base Salary</TableHead>
                          <TableHead>Overtime</TableHead>
                          <TableHead>Benefits</TableHead>
                          <TableHead>Deductions</TableHead>
                          <TableHead>Net Payroll</TableHead>
                          <TableHead>Budget Usage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payrollReports.map((dept) => (
                          <TableRow key={dept.id} className="hover:bg-gray-50/50" data-testid={`payroll-row-${dept.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">{dept.department}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4 text-gray-400" />
                                <span>{dept.employees}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">€{(dept.totalSalary / 1000).toFixed(0)}K</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-orange-600">€{(dept.overtime / 1000).toFixed(1)}K</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-blue-600">€{(dept.benefits / 1000).toFixed(1)}K</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-red-600">€{(dept.deductions / 1000).toFixed(1)}K</span>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-gray-900">€{(dept.netPayroll / 1000).toFixed(1)}K</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-16">
                                  <Progress value={dept.budgetUsed} className="h-2" />
                                </div>
                                <span className={dept.budgetUsed >= 90 ? 'text-red-600 font-medium' : dept.budgetUsed >= 80 ? 'text-yellow-600' : 'text-green-600'}>
                                  {dept.budgetUsed.toFixed(1)}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance">
            <div className="space-y-6">
              {/* Performance Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg Performance</p>
                        <p className="text-2xl font-bold text-blue-600">4.3/5</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600">
                        <Star className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Top Performers</p>
                        <p className="text-2xl font-bold text-green-600">245</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600">
                        <Award className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Reviews Completed</p>
                        <p className="text-2xl font-bold text-purple-600">730</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600">
                        <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Goal Achievement</p>
                        <p className="text-2xl font-bold text-orange-600">87.1%</p>
                      </div>
                      <div className="p-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600">
                        <Target className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Department Performance Table */}
              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="h-5 w-5 text-purple-600" />
                    Department Performance Overview
                  </CardTitle>
                  <CardDescription>Performance metrics and review status by department</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Department</TableHead>
                          <TableHead>Avg Performance</TableHead>
                          <TableHead>Top Performers</TableHead>
                          <TableHead>Needs Improvement</TableHead>
                          <TableHead>Reviews Completed</TableHead>
                          <TableHead>Reviews Pending</TableHead>
                          <TableHead>Goal Achievement</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {performanceReports.map((dept) => (
                          <TableRow key={dept.id} className="hover:bg-gray-50/50" data-testid={`performance-row-${dept.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-gray-400" />
                                <span className="font-medium">{dept.department}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Star className={`h-4 w-4 ${getPerformanceColor(dept.avgPerformance)}`} />
                                <span className={`font-medium ${getPerformanceColor(dept.avgPerformance)}`}>
                                  {dept.avgPerformance.toFixed(1)}/5
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Award className="h-4 w-4 text-green-600" />
                                <span className="text-green-600 font-medium">{dept.topPerformers}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                <span className="text-yellow-600">{dept.needsImprovement}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-green-600">{dept.reviewsCompleted}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-yellow-600" />
                                <span className="text-yellow-600">{dept.reviewsPending}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-16">
                                  <Progress value={dept.goalAchievementRate} className="h-2" />
                                </div>
                                <span className={dept.goalAchievementRate >= 90 ? 'text-green-600 font-medium' : dept.goalAchievementRate >= 80 ? 'text-blue-600' : 'text-yellow-600'}>
                                  {dept.goalAchievementRate.toFixed(1)}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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