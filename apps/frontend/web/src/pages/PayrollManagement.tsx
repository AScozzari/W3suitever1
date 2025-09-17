import { useState } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  FileText,
  Download,
  Upload,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  Calculator,
  PieChart,
  BarChart3,
  Receipt,
  Wallet,
  BanknoteIcon,
  Euro,
  Search,
  Filter,
  Plus,
  Edit,
  Eye
} from 'lucide-react';

interface PayrollRecord {
  id: string;
  employeeName: string;
  employeeId: string;
  period: string;
  baseSalary: number;
  bonuses: number;
  overtime: number;
  deductions: number;
  netPay: number;
  status: 'draft' | 'processed' | 'paid' | 'error';
  payDate: string;
  department: string;
}

interface PayrollSummary {
  totalEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  averageSalary: number;
  period: string;
}

const payrollData: PayrollRecord[] = [
  {
    id: '1',
    employeeName: 'Mario Rossi',
    employeeId: 'EMP001',
    period: 'December 2024',
    baseSalary: 3750,
    bonuses: 500,
    overtime: 320,
    deductions: 850,
    netPay: 3720,
    status: 'paid',
    payDate: '2024-12-31',
    department: 'Sales'
  },
  {
    id: '2',
    employeeName: 'Laura Bianchi',
    employeeId: 'EMP002',
    period: 'December 2024',
    baseSalary: 2917,
    bonuses: 300,
    overtime: 180,
    deductions: 650,
    netPay: 2747,
    status: 'paid',
    payDate: '2024-12-31',
    department: 'Sales'
  },
  {
    id: '3',
    employeeName: 'Giuseppe Verde',
    employeeId: 'EMP003',
    period: 'December 2024',
    baseSalary: 2667,
    bonuses: 0,
    overtime: 120,
    deductions: 580,
    netPay: 2207,
    status: 'processed',
    payDate: '2024-12-31',
    department: 'Customer Service'
  },
  {
    id: '4',
    employeeName: 'Anna Ferretti',
    employeeId: 'EMP004',
    period: 'December 2024',
    baseSalary: 4583,
    bonuses: 1000,
    overtime: 0,
    deductions: 1120,
    netPay: 4463,
    status: 'paid',
    payDate: '2024-12-31',
    department: 'Management'
  },
  {
    id: '5',
    employeeName: 'Francesco Neri',
    employeeId: 'EMP005',
    period: 'December 2024',
    baseSalary: 4000,
    bonuses: 750,
    overtime: 240,
    deductions: 950,
    netPay: 4040,
    status: 'draft',
    payDate: '2024-12-31',
    department: 'Operations'
  }
];

const currentSummary: PayrollSummary = {
  totalEmployees: payrollData.length,
  totalGrossPay: payrollData.reduce((sum, record) => sum + record.baseSalary + record.bonuses + record.overtime, 0),
  totalDeductions: payrollData.reduce((sum, record) => sum + record.deductions, 0),
  totalNetPay: payrollData.reduce((sum, record) => sum + record.netPay, 0),
  averageSalary: payrollData.reduce((sum, record) => sum + record.netPay, 0) / payrollData.length,
  period: 'December 2024'
};

const benefitsData = [
  { name: 'Health Insurance', employees: 1247, cost: 156000, coverage: '100%' },
  { name: 'Dental Coverage', employees: 1180, cost: 42000, coverage: '95%' },
  { name: 'Pension Plan', employees: 1247, cost: 78000, coverage: '100%' },
  { name: 'Life Insurance', employees: 1150, cost: 28000, coverage: '92%' },
  { name: 'Meal Vouchers', employees: 1200, cost: 36000, coverage: '96%' }
];

export default function PayrollManagement() {
  const [currentModule, setCurrentModule] = useState<string>('payroll-management');
  const [activeTab, setActiveTab] = useState('payroll');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('December 2024');

  const filteredPayroll = payrollData.filter(record => {
    const matchesSearch = record.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || record.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'processed': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto" data-testid="payroll-management-page">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-md rounded-xl shadow-xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent mb-2">
                Payroll Management
              </h1>
              <p className="text-gray-600">
                Comprehensive payroll processing and benefits administration
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="bg-white/60 backdrop-blur border-white/30" data-testid="button-import">
                <Upload className="h-4 w-4 mr-2" />
                Import Data
              </Button>
              <Button variant="outline" className="bg-white/60 backdrop-blur border-white/30" data-testid="button-export">
                <Download className="h-4 w-4 mr-2" />
                Export Reports
              </Button>
              <Button className="bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-lg" data-testid="button-process-payroll">
                <Calculator className="h-4 w-4 mr-2" />
                Process Payroll
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Payroll Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Gross Pay</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(currentSummary.totalGrossPay)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">+2.5%</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Deductions</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(currentSummary.totalDeductions)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-600">+1.2%</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600">
                  <Receipt className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Net Pay</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(currentSummary.totalNetPay)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-600">+3.1%</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Salary</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(currentSummary.averageSalary)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    <span className="text-sm text-purple-600">+1.8%</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600">
                  <Euro className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-md border-white/20 shadow-lg grid w-full grid-cols-4">
            <TabsTrigger value="payroll" data-testid="tab-payroll">
              <DollarSign className="h-4 w-4 mr-2" />
              Payroll
            </TabsTrigger>
            <TabsTrigger value="benefits" data-testid="tab-benefits">
              <CreditCard className="h-4 w-4 mr-2" />
              Benefits
            </TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports">
              <BarChart3 className="h-4 w-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="taxes" data-testid="tab-taxes">
              <FileText className="h-4 w-4 mr-2" />
              Tax & Compliance
            </TabsTrigger>
          </TabsList>

          {/* Payroll Tab */}
          <TabsContent value="payroll">
            <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Payroll Records - {selectedPeriod}</CardTitle>
                    <CardDescription>Employee payroll data and processing status</CardDescription>
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
                        data-testid="input-search"
                      />
                    </div>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg bg-white/50 backdrop-blur"
                      data-testid="select-status"
                    >
                      <option value="all">All Status</option>
                      <option value="paid">Paid</option>
                      <option value="processed">Processed</option>
                      <option value="draft">Draft</option>
                      <option value="error">Error</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Employee</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Base Salary</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Bonuses</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Overtime</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Deductions</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Net Pay</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayroll.map((record) => (
                        <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50/50" data-testid={`payroll-row-${record.id}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {record.employeeName.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{record.employeeName}</p>
                                <p className="text-sm text-gray-500">{record.department}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium">{formatCurrency(record.baseSalary)}</td>
                          <td className="py-3 px-4 text-green-600 font-medium">{formatCurrency(record.bonuses)}</td>
                          <td className="py-3 px-4 text-blue-600 font-medium">{formatCurrency(record.overtime)}</td>
                          <td className="py-3 px-4 text-red-600 font-medium">{formatCurrency(record.deductions)}</td>
                          <td className="py-3 px-4 font-bold text-gray-900">{formatCurrency(record.netPay)}</td>
                          <td className="py-3 px-4">
                            <Badge className={getStatusColor(record.status)}>
                              {record.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" data-testid={`button-view-${record.id}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`button-edit-${record.id}`}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Benefits Tab */}
          <TabsContent value="benefits">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-purple-600" />
                    Employee Benefits Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {benefitsData.map((benefit, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg bg-white/50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{benefit.name}</h4>
                          <Badge variant="outline" className="bg-blue-50">
                            {benefit.coverage}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Enrolled:</span>
                            <span className="ml-2 font-medium">{benefit.employees} employees</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Monthly Cost:</span>
                            <span className="ml-2 font-medium">{formatCurrency(benefit.cost)}</span>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Coverage Rate</span>
                            <span>{benefit.coverage}</span>
                          </div>
                          <Progress value={parseInt(benefit.coverage)} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-orange-600" />
                    Benefits Cost Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{formatCurrency(340000)}</p>
                        <p className="text-sm text-gray-600">Total Monthly Cost</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(273)}</p>
                        <p className="text-sm text-gray-600">Cost per Employee</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Health Insurance</span>
                        <span className="text-sm font-bold">46%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Pension Plan</span>
                        <span className="text-sm font-bold">23%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Dental Coverage</span>
                        <span className="text-sm font-bold">12%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Meal Vouchers</span>
                        <span className="text-sm font-bold">11%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Life Insurance</span>
                        <span className="text-sm font-bold">8%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    Payroll Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">€847K</p>
                        <p className="text-sm text-gray-600">Monthly Payroll</p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-600">1,247</p>
                        <p className="text-sm text-gray-600">Employees Paid</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Department Costs</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Sales</span>
                          <span className="text-sm font-medium">€312K</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Operations</span>
                          <span className="text-sm font-medium">€245K</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Customer Service</span>
                          <span className="text-sm font-medium">€156K</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Management</span>
                          <span className="text-sm font-medium">€134K</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Payroll Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">+2.8%</p>
                        <p className="text-sm text-gray-600">YoY Growth</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">€2,789</p>
                        <p className="text-sm text-gray-600">Avg Net Pay</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Quarterly Comparison</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Q4 2024</span>
                          <span className="text-sm font-medium text-green-600">€847K (+2.8%)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Q3 2024</span>
                          <span className="text-sm font-medium">€824K</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Q2 2024</span>
                          <span className="text-sm font-medium">€798K</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Q1 2024</span>
                          <span className="text-sm font-medium">€756K</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tax & Compliance Tab */}
          <TabsContent value="taxes">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-orange-600" />
                    Tax Compliance Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-800">Tax Filing Up to Date</span>
                      </div>
                      <p className="text-sm text-green-700">All monthly tax obligations have been filed correctly.</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">IRPEF Withholdings</span>
                        <Badge className="bg-green-100 text-green-800">Current</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">INPS Contributions</span>
                        <Badge className="bg-green-100 text-green-800">Current</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">INAIL Premiums</span>
                        <Badge className="bg-green-100 text-green-800">Current</Badge>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium">Regional Tax</span>
                        <Badge className="bg-yellow-100 text-yellow-800">Due Jan 16</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-purple-600" />
                    Monthly Tax Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">€234K</p>
                        <p className="text-sm text-gray-600">Total Tax Liability</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">€156K</p>
                        <p className="text-sm text-gray-600">Social Contributions</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Tax Breakdown</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Income Tax (IRPEF)</span>
                          <span className="text-sm font-medium">€145K</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Regional Tax (IRAP)</span>
                          <span className="text-sm font-medium">€34K</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Municipal Tax</span>
                          <span className="text-sm font-medium">€12K</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Other Taxes</span>
                          <span className="text-sm font-medium">€8K</span>
                        </div>
                      </div>
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