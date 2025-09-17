import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/table';
import {
  Calendar,
  Clock,
  Users,
  FileText,
  DollarSign,
  BarChart3,
  Settings,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  UserCheck,
  Timer,
  Briefcase,
  Download,
  RefreshCw,
  Plus,
  Award,
  Target,
  Shield,
  BookOpen,
  Activity,
  AlertTriangle,
  Filter,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  UserPlus,
  Coffee,
  Home,
  MapPin,
  Building,
  ChevronDown,
  ChevronLeft,
  ChevronRight
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

// Professional KPI Data Model
interface KPIMetric {
  id: string;
  label: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'stable';
  icon: React.ComponentType<any>;
  color: keyof typeof COLORS.primary | keyof typeof COLORS.semantic;
  description?: string;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  status: 'active' | 'onLeave' | 'absent';
  attendance: 'present' | 'absent' | 'late' | 'onLeave';
  shiftTime: string;
  email: string;
  phone: string;
  location: string;
  avatar?: string;
}

interface LeaveRequest {
  id: string;
  employeeName: string;
  employeeId: string;
  type: 'vacation' | 'sick' | 'personal' | 'maternity';
  startDate: string;
  endDate: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  requestDate: string;
  approver?: string;
}

interface Activity {
  id: string;
  type: 'attendance' | 'leave' | 'performance' | 'payroll' | 'training';
  message: string;
  timestamp: string;
  employee: string;
  priority: 'low' | 'medium' | 'high';
  icon: React.ComponentType<any>;
}

// Professional Enterprise KPI Metrics
const professionalKPIData: KPIMetric[] = [
  {
    id: 'total-employees',
    label: 'Total Employees',
    value: 1247,
    change: '+3.2%',
    trend: 'up',
    icon: Users,
    color: 'info',
    description: 'Active employees across all locations'
  },
  {
    id: 'attendance-rate',
    label: 'Attendance Rate',
    value: '94.7%',
    change: '+1.2%',
    trend: 'up',
    icon: UserCheck,
    color: 'success',
    description: 'Daily attendance average'
  },
  {
    id: 'employee-satisfaction',
    label: 'Employee Satisfaction',
    value: '4.6/5',
    change: '+0.3',
    trend: 'up',
    icon: Award,
    color: 'purple',
    description: 'Latest satisfaction survey'
  },
  {
    id: 'pending-leaves',
    label: 'Pending Leaves',
    value: 23,
    change: '-8',
    trend: 'down',
    icon: CalendarDays,
    color: 'warning',
    description: 'Awaiting approval'
  },
  {
    id: 'monthly-payroll',
    label: 'Monthly Payroll',
    value: '€847K',
    change: '+2.8%',
    trend: 'up',
    icon: DollarSign,
    color: 'orange',
    description: 'Total monthly cost'
  },
  {
    id: 'training-completion',
    label: 'Training Completion',
    value: '89%',
    change: '+7%',
    trend: 'up',
    icon: BookOpen,
    color: 'purple',
    description: 'Mandatory training programs'
  },
  {
    id: 'overtime-hours',
    label: 'Overtime Hours',
    value: '1,247h',
    change: '+12%',
    trend: 'up',
    icon: Timer,
    color: 'warning',
    description: 'This month total'
  },
  {
    id: 'compliance-score',
    label: 'Compliance Score',
    value: '98.5%',
    change: '+0.5%',
    trend: 'up',
    icon: Shield,
    color: 'success',
    description: 'Overall compliance rating'
  }
];

// Recent Activities Data
const recentActivities: Activity[] = [
  {
    id: '1',
    type: 'attendance',
    message: 'Mario Rossi checked in at Milano Centro',
    timestamp: '2 minutes ago',
    employee: 'Mario Rossi',
    priority: 'low',
    icon: CheckCircle
  },
  {
    id: '2',
    type: 'leave',
    message: 'New leave request from Laura Bianchi',
    timestamp: '15 minutes ago',
    employee: 'Laura Bianchi',
    priority: 'medium',
    icon: CalendarDays
  },
  {
    id: '3',
    type: 'performance',
    message: 'Performance review due for Giuseppe Verde',
    timestamp: '1 hour ago',
    employee: 'Giuseppe Verde',
    priority: 'high',
    icon: Target
  },
  {
    id: '4',
    type: 'training',
    message: 'Anna Ferretti completed Safety Training',
    timestamp: '2 hours ago',
    employee: 'Anna Ferretti',
    priority: 'low',
    icon: BookOpen
  },
  {
    id: '5',
    type: 'payroll',
    message: 'Payroll processing completed for December',
    timestamp: '3 hours ago',
    employee: 'System',
    priority: 'medium',
    icon: DollarSign
  }
];

// Sample Employees Data
const employeesData: Employee[] = [
  {
    id: '1',
    name: 'Mario Rossi',
    role: 'Store Manager',
    department: 'Retail Operations',
    status: 'active',
    attendance: 'present',
    shiftTime: '09:00 - 18:00',
    email: 'mario.rossi@windtre.it',
    phone: '+39 335 123 4567',
    location: 'Milano Centro'
  },
  {
    id: '2',
    name: 'Laura Bianchi',
    role: 'Sales Specialist',
    department: 'Sales',
    status: 'active',
    attendance: 'present',
    shiftTime: '10:00 - 19:00',
    email: 'laura.bianchi@windtre.it',
    phone: '+39 347 987 6543',
    location: 'Roma EUR'
  },
  {
    id: '3',
    name: 'Giuseppe Verde',
    role: 'Technical Support',
    department: 'Customer Service',
    status: 'active',
    attendance: 'late',
    shiftTime: '08:30 - 17:30',
    email: 'giuseppe.verde@windtre.it',
    phone: '+39 328 456 7890',
    location: 'Napoli Centro'
  },
  {
    id: '4',
    name: 'Anna Ferretti',
    role: 'Area Manager',
    department: 'Management',
    status: 'active',
    attendance: 'present',
    shiftTime: '08:00 - 17:00',
    email: 'anna.ferretti@windtre.it',
    phone: '+39 366 234 5678',
    location: 'Torino'
  },
  {
    id: '5',
    name: 'Francesco Neri',
    role: 'Inventory Manager',
    department: 'Operations',
    status: 'onLeave',
    attendance: 'onLeave',
    shiftTime: '-',
    email: 'francesco.neri@windtre.it',
    phone: '+39 333 876 5432',
    location: 'Firenze'
  }
];

// Department Performance Data
const departmentStats = [
  { name: 'Sales', employees: 342, attendance: 96.2, performance: 4.7, color: COLORS.primary.orange },
  { name: 'Customer Service', employees: 189, attendance: 94.8, performance: 4.5, color: COLORS.primary.purple },
  { name: 'Operations', employees: 234, attendance: 93.1, performance: 4.3, color: COLORS.semantic.info },
  { name: 'Management', employees: 67, attendance: 98.5, performance: 4.8, color: COLORS.semantic.success },
  { name: 'IT & Technology', employees: 123, attendance: 91.7, performance: 4.6, color: COLORS.semantic.warning }
];

// KPI Card Component
function ProfessionalKPICard({ metric }: { metric: KPIMetric }) {
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
      data-testid={`kpi-card-${metric.id}`}
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

// Department Card Component
function DepartmentCard({ dept }: { dept: typeof departmentStats[0] }) {
  return (
    <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-lg hover:shadow-xl transition-all">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900">{dept.name}</h4>
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: dept.color }}
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Employees</span>
            <span className="font-medium">{dept.employees}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Attendance</span>
            <span className="font-medium">{dept.attendance}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Performance</span>
            <span className="font-medium">{dept.performance}/5</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Activity Item Component
function ActivityItem({ activity }: { activity: Activity }) {
  const Icon = activity.icon;
  const priorityColors = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-blue-100 text-blue-600',
    high: 'bg-red-100 text-red-600'
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-all">
      <div className={cn("p-2 rounded-lg", priorityColors[activity.priority])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 mb-1">
          {activity.message}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{activity.timestamp}</span>
          <span>•</span>
          <span>{activity.employee}</span>
        </div>
      </div>
    </div>
  );
}

export default function HRDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentModule, setCurrentModule] = useState<string>('hr');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  
  // Filter employees based on search and department
  const filteredEmployees = employeesData.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || employee.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const getAttendanceColor = (attendance: string) => {
    switch (attendance) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'onLeave': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'onLeave': return 'bg-blue-100 text-blue-800';
      case 'absent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto" data-testid="hr-dashboard-page">
        {/* Professional Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-md rounded-xl shadow-xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent mb-2">
                Human Resources Dashboard
              </h1>
              <p className="text-gray-600">
                Enterprise-grade workforce management and analytics
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
              <Button className="bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-lg" data-testid="button-add-employee">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Professional KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {professionalKPIData.map((metric) => (
            <ProfessionalKPICard key={metric.id} metric={metric} />
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-md border-white/20 shadow-lg grid w-full grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="employees" data-testid="tab-employees">
              <Users className="h-4 w-4 mr-2" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="departments" data-testid="tab-departments">
              <Building className="h-4 w-4 mr-2" />
              Departments
            </TabsTrigger>
            <TabsTrigger value="activities" data-testid="tab-activities">
              <Activity className="h-4 w-4 mr-2" />
              Activities
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Activities */}
              <Card className="lg:col-span-2 bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-600" />
                    Recent Activities
                  </CardTitle>
                  <CardDescription>Latest HR system activities and notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentActivities.slice(0, 5).map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                  <Button variant="outline" className="w-full mt-4" data-testid="button-view-all-activities">
                    View All Activities
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-orange-600" />
                    Quick Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Today's Attendance</span>
                    <Badge className="bg-green-100 text-green-800">94.7%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Pending Reviews</span>
                    <Badge className="bg-orange-100 text-orange-800">12</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Training Due</span>
                    <Badge className="bg-blue-100 text-blue-800">34</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">New Hires (30d)</span>
                    <Badge className="bg-purple-100 text-purple-800">8</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Open Positions</span>
                    <Badge className="bg-red-100 text-red-800">15</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Department Performance */}
            <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="h-5 w-5 text-purple-600" />
                  Department Performance Overview
                </CardTitle>
                <CardDescription>Key metrics across all departments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {departmentStats.map((dept) => (
                    <DepartmentCard key={dept.name} dept={dept} />
                  ))}
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
                    <CardTitle className="text-lg">Employee Management</CardTitle>
                    <CardDescription>Comprehensive employee directory and management</CardDescription>
                  </div>
                  <div className="flex gap-3">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search employees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-orange-500"
                        data-testid="input-search-employees"
                      />
                    </div>
                    <Button variant="outline" size="sm" data-testid="button-filter-employees">
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
                        <TableHead>Employee</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Attendance</TableHead>
                        <TableHead>Shift</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((employee) => (
                        <TableRow key={employee.id} className="hover:bg-gray-50/50" data-testid={`employee-row-${employee.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {employee.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{employee.name}</p>
                                <p className="text-sm text-gray-500">{employee.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{employee.role}</Badge>
                          </TableCell>
                          <TableCell>{employee.department}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(employee.status)}>
                              {employee.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getAttendanceColor(employee.attendance)}>
                              {employee.attendance}
                            </Badge>
                          </TableCell>
                          <TableCell>{employee.shiftTime}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              <span className="text-sm">{employee.location}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" data-testid={`button-view-${employee.id}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`button-edit-${employee.id}`}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-600" data-testid={`button-delete-${employee.id}`}>
                                <Trash2 className="h-4 w-4" />
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

          {/* Departments Tab */}
          <TabsContent value="departments">
            <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="h-5 w-5 text-purple-600" />
                  Department Analytics
                </CardTitle>
                <CardDescription>Detailed performance metrics by department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {departmentStats.map((dept) => (
                    <motion.div
                      key={dept.name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <Card className="bg-white/60 backdrop-blur border-white/20 hover:shadow-lg transition-all">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">{dept.name}</h3>
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: dept.color }}
                            />
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Employees</span>
                              <span className="font-semibold">{dept.employees}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Attendance Rate</span>
                              <span className="font-semibold">{dept.attendance}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Performance Score</span>
                              <span className="font-semibold">{dept.performance}/5</span>
                            </div>
                            <div className="pt-3 border-t border-gray-200">
                              <Button variant="outline" size="sm" className="w-full">
                                <BarChart3 className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities">
            <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-orange-600" />
                  System Activities
                </CardTitle>
                <CardDescription>Complete activity log and system events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
                <div className="flex justify-center pt-4">
                  <Button variant="outline" data-testid="button-load-more-activities">
                    Load More Activities
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Real-time Status Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed bottom-6 right-6"
        >
          <div className="flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-white/20">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-gray-600">
              System Online
            </span>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}