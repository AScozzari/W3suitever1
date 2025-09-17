import { useState } from 'react';
import { motion } from 'framer-motion';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Users,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Download,
  Upload,
  RefreshCw,
  Settings,
  MoreHorizontal,
  Award,
  Clock,
  Building,
  Target,
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle,
  Star
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  location: string;
  status: 'active' | 'inactive' | 'onLeave' | 'terminated';
  hireDate: string;
  salary: number;
  manager: string;
  performance: number;
  attendanceRate: number;
  skills: string[];
  certifications: string[];
  lastReview: string;
}

const employeesData: Employee[] = [
  {
    id: '1',
    name: 'Mario Rossi',
    email: 'mario.rossi@windtre.it',
    phone: '+39 335 123 4567',
    role: 'Store Manager',
    department: 'Retail Operations',
    location: 'Milano Centro',
    status: 'active',
    hireDate: '2019-03-15',
    salary: 45000,
    manager: 'Anna Ferretti',
    performance: 4.7,
    attendanceRate: 96.2,
    skills: ['Leadership', 'Sales', 'Customer Service'],
    certifications: ['Retail Management', 'Safety Training'],
    lastReview: '2024-12-01'
  },
  {
    id: '2',
    name: 'Laura Bianchi',
    email: 'laura.bianchi@windtre.it',
    phone: '+39 347 987 6543',
    role: 'Sales Specialist',
    department: 'Sales',
    location: 'Roma EUR',
    status: 'active',
    hireDate: '2020-07-20',
    salary: 35000,
    manager: 'Mario Rossi',
    performance: 4.5,
    attendanceRate: 94.8,
    skills: ['Sales', 'Communication', 'Product Knowledge'],
    certifications: ['Sales Excellence', 'Customer Relations'],
    lastReview: '2024-11-15'
  },
  {
    id: '3',
    name: 'Giuseppe Verde',
    email: 'giuseppe.verde@windtre.it',
    phone: '+39 328 456 7890',
    role: 'Technical Support',
    department: 'Customer Service',
    location: 'Napoli Centro',
    status: 'active',
    hireDate: '2021-01-10',
    salary: 32000,
    manager: 'Francesco Neri',
    performance: 4.3,
    attendanceRate: 91.5,
    skills: ['Technical Support', 'Problem Solving', 'Communication'],
    certifications: ['Technical Certification', 'ITIL Foundation'],
    lastReview: '2024-10-30'
  },
  {
    id: '4',
    name: 'Anna Ferretti',
    email: 'anna.ferretti@windtre.it',
    phone: '+39 366 234 5678',
    role: 'Area Manager',
    department: 'Management',
    location: 'Torino',
    status: 'active',
    hireDate: '2018-05-12',
    salary: 55000,
    manager: 'Roberto Conti',
    performance: 4.8,
    attendanceRate: 98.1,
    skills: ['Leadership', 'Strategic Planning', 'Team Management'],
    certifications: ['Management Excellence', 'Leadership Development'],
    lastReview: '2024-12-10'
  },
  {
    id: '5',
    name: 'Francesco Neri',
    email: 'francesco.neri@windtre.it',
    phone: '+39 333 876 5432',
    role: 'Operations Manager',
    department: 'Operations',
    location: 'Firenze',
    status: 'onLeave',
    hireDate: '2019-09-08',
    salary: 48000,
    manager: 'Anna Ferretti',
    performance: 4.6,
    attendanceRate: 95.3,
    skills: ['Operations', 'Process Improvement', 'Analytics'],
    certifications: ['Operations Management', 'Six Sigma Green Belt'],
    lastReview: '2024-11-20'
  }
];

export default function EmployeeManagement() {
  const [currentModule, setCurrentModule] = useState<string>('employee-management');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('list');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Filter employees
  const filteredEmployees = employeesData.filter(employee => {
    const matchesSearch = 
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || employee.department === selectedDepartment;
    const matchesStatus = selectedStatus === 'all' || employee.status === selectedStatus;
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'onLeave': return 'bg-blue-100 text-blue-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 4.0) return 'text-blue-600';
    if (score >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const departments = [...new Set(employeesData.map(emp => emp.department))];

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto" data-testid="employee-management-page">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-md rounded-xl shadow-xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent mb-2">
                Employee Management
              </h1>
              <p className="text-gray-600">
                Comprehensive employee directory and profile management
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="bg-white/60 backdrop-blur border-white/30" data-testid="button-import">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" className="bg-white/60 backdrop-blur border-white/30" data-testid="button-export">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button className="bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-lg" data-testid="button-add-employee">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Employees</p>
                  <p className="text-2xl font-bold text-gray-900">{employeesData.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {employeesData.filter(emp => emp.status === 'active').length}
                  </p>
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
                  <p className="text-sm font-medium text-gray-600">On Leave</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {employeesData.filter(emp => emp.status === 'onLeave').length}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Performance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(employeesData.reduce((sum, emp) => sum + emp.performance, 0) / employeesData.length).toFixed(1)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600">
                  <Star className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Employee Directory</CardTitle>
                <CardDescription>Manage and view employee profiles</CardDescription>
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
                    data-testid="input-search"
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
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg bg-white/50 backdrop-blur"
                  data-testid="select-status"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="onLeave">On Leave</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role & Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Last Review</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id} className="hover:bg-gray-50/50" data-testid={`employee-row-${employee.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {employee.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{employee.name}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Mail className="h-3 w-3" />
                              <span>{employee.email}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{employee.role}</p>
                          <p className="text-sm text-gray-500">{employee.department}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(employee.status)}>
                          {employee.status}
                        </Badge>
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
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{employee.attendanceRate.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{employee.location}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{employee.lastReview}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setIsProfileOpen(true);
                            }}
                            data-testid={`button-view-${employee.id}`}
                          >
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

        {/* Employee Profile Modal */}
        <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
          <DialogContent className="max-w-4xl bg-white/95 backdrop-blur-lg border-white/20">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
                Employee Profile
              </DialogTitle>
            </DialogHeader>
            {selectedEmployee && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="flex items-start gap-6">
                  <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedEmployee.name}</h2>
                    <p className="text-lg text-gray-600">{selectedEmployee.role}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge className={getStatusColor(selectedEmployee.status)}>
                        {selectedEmployee.status}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Hired: {selectedEmployee.hireDate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-white/60 backdrop-blur border-white/20">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building className="h-5 w-5 text-purple-600" />
                        Work Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Department</label>
                        <p className="text-gray-900">{selectedEmployee.department}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Manager</label>
                        <p className="text-gray-900">{selectedEmployee.manager}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Location</label>
                        <p className="text-gray-900 flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {selectedEmployee.location}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Salary</label>
                        <p className="text-gray-900">€{selectedEmployee.salary.toLocaleString()}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/60 backdrop-blur border-white/20">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="h-5 w-5 text-orange-600" />
                        Performance Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Performance Rating</label>
                        <div className="flex items-center gap-2">
                          <Star className={`h-5 w-5 ${getPerformanceColor(selectedEmployee.performance)}`} />
                          <span className={`text-lg font-medium ${getPerformanceColor(selectedEmployee.performance)}`}>
                            {selectedEmployee.performance.toFixed(1)}/5.0
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Attendance Rate</label>
                        <p className="text-gray-900">{selectedEmployee.attendanceRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Last Review</label>
                        <p className="text-gray-900">{selectedEmployee.lastReview}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/60 backdrop-blur border-white/20">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Award className="h-5 w-5 text-purple-600" />
                        Skills & Certifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Skills</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedEmployee.skills.map((skill, idx) => (
                            <Badge key={idx} variant="outline" className="bg-blue-50">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Certifications</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedEmployee.certifications.map((cert, idx) => (
                            <Badge key={idx} variant="outline" className="bg-green-50">
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/60 backdrop-blur border-white/20">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Phone className="h-5 w-5 text-orange-600" />
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Email</label>
                        <p className="text-gray-900 flex items-center gap-1">
                          <Mail className="h-4 w-4 text-gray-400" />
                          {selectedEmployee.email}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Phone</label>
                        <p className="text-gray-900 flex items-center gap-1">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {selectedEmployee.phone}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <Button variant="outline" onClick={() => setIsProfileOpen(false)}>
                    Close
                  </Button>
                  <Button variant="outline" className="bg-blue-50">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                  <Button className="bg-gradient-to-r from-orange-500 to-purple-600 text-white">
                    <Award className="h-4 w-4 mr-2" />
                    Performance Review
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}