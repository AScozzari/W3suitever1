import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  FileText, 
  DollarSign, 
  Settings,
  UserPlus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  Building,
  MapPin,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

export default function HRDashboard() {
  // State per real-time updates
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');

  // Mock real-time data con updates ogni 30 secondi
  const [stats, setStats] = useState({
    totalEmployees: 127,
    activeEmployees: 119,
    onLeave: 8,
    pendingRequests: 15,
    attendanceRate: 94.2,
    turnoverRate: 8.5,
    newHires: 3,
    totalPayroll: 847650
  });

  // Mock real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        activeEmployees: Math.max(110, Math.min(127, prev.activeEmployees + Math.floor(Math.random() * 3) - 1)),
        attendanceRate: Math.max(85, Math.min(98, prev.attendanceRate + (Math.random() - 0.5) * 2)),
        pendingRequests: Math.max(0, Math.min(25, prev.pendingRequests + Math.floor(Math.random() * 3) - 1))
      }));
      setLastUpdate(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Employee data espanso per la tabella
  const [employees] = useState([
    {
      id: 'emp-001',
      name: 'Mario Rossi',
      role: 'HR Manager',
      department: 'Risorse Umane',
      status: 'active',
      email: 'mario.rossi@w3suite.com',
      phone: '+39 335 123 4567',
      location: 'Milano',
      salary: 65000,
      startDate: '2020-03-15',
      lastLogin: '2 ore fa'
    },
    {
      id: 'emp-002', 
      name: 'Giulia Bianchi',
      role: 'Software Engineer',
      department: 'Sviluppo',
      status: 'active',
      email: 'giulia.bianchi@w3suite.com',
      phone: '+39 347 987 6543',
      location: 'Roma',
      salary: 55000,
      startDate: '2021-01-10',
      lastLogin: '1 ora fa'
    },
    {
      id: 'emp-003',
      name: 'Luca Verdi',
      role: 'Sales Manager',
      department: 'Vendite',
      status: 'leave',
      email: 'luca.verdi@w3suite.com', 
      phone: '+39 329 456 7890',
      location: 'Napoli',
      salary: 58000,
      startDate: '2019-08-22',
      lastLogin: '1 giorno fa'
    },
    {
      id: 'emp-004',
      name: 'Anna Neri',
      role: 'Marketing Specialist',
      department: 'Marketing',
      status: 'active',
      email: 'anna.neri@w3suite.com',
      phone: '+39 333 234 5678',
      location: 'Torino',
      salary: 48000,
      startDate: '2022-02-01',
      lastLogin: '30 min fa'
    },
    {
      id: 'emp-005',
      name: 'Francesco Blu',
      role: 'DevOps Engineer',
      department: 'Sviluppo',
      status: 'active',
      email: 'francesco.blu@w3suite.com',
      phone: '+39 340 567 8901',
      location: 'Bologna',
      salary: 62000,
      startDate: '2021-06-15',
      lastLogin: '15 min fa'
    }
  ]);

  // Charts data
  const attendanceData = [
    { month: 'Gen', attendance: 92.5, target: 95 },
    { month: 'Feb', attendance: 94.2, target: 95 },
    { month: 'Mar', attendance: 91.8, target: 95 },
    { month: 'Apr', attendance: 95.1, target: 95 },
    { month: 'Mag', attendance: 93.7, target: 95 },
    { month: 'Giu', attendance: 94.2, target: 95 }
  ];

  const departmentData = [
    { name: 'Sviluppo', value: 42, color: '#3B82F6' },
    { name: 'Vendite', value: 28, color: '#FF6900' },
    { name: 'Marketing', value: 19, color: '#7B2CBF' },
    { name: 'HR', value: 15, color: '#10B981' },
    { name: 'Amministrazione', value: 23, color: '#F59E0B' }
  ];

  const turnoverData = [
    { month: 'Gen', turnover: 8.2, hires: 5, departures: 3 },
    { month: 'Feb', turnover: 7.8, hires: 4, departures: 2 },
    { month: 'Mar', turnover: 9.1, hires: 3, departures: 4 },
    { month: 'Apr', turnover: 7.5, hires: 6, departures: 2 },
    { month: 'Mag', turnover: 8.8, hires: 4, departures: 3 },
    { month: 'Giu', turnover: 8.5, hires: 3, departures: 3 }
  ];

  // Filtered employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || emp.status === filterStatus;
    const matchesDepartment = filterDepartment === 'all' || emp.department === filterDepartment;
    
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const departments = [...new Set(employees.map(emp => emp.department))];

  return (
    <Layout currentModule="hr" setCurrentModule={() => {}}>
      <div className="min-h-screen p-6 space-y-8" style={{background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'}}>
        
        {/* Header con real-time indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2" data-testid="text-page-title">
                Dashboard HR Enterprise
              </h1>
              <p className="text-lg text-gray-600">
                Gestione completa delle risorse umane per W3 Suite Enterprise
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Activity className="h-4 w-4 text-green-500" />
              <span>Ultimo aggiornamento: {lastUpdate.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Stats Cards Grid - shadcn/ui Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          
          {/* Total Employees */}
          <Card className="border-white/20 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl" 
                style={{background: 'rgba(255, 255, 255, 0.7)'}} data-testid="card-total-employees">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" 
                     style={{background: 'rgba(59, 130, 246, 0.1)'}}>
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Dipendenti Totali</p>
                  <p className="text-3xl font-bold text-gray-800" data-testid="text-total-employees">{stats.totalEmployees}</p>
                  <div className="flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-xs text-green-600">+2.3% vs mese scorso</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Employees */}
          <Card className="border-white/20 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl" 
                style={{background: 'rgba(255, 255, 255, 0.7)'}} data-testid="card-active-employees">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" 
                     style={{background: 'rgba(34, 197, 94, 0.1)'}}>
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Presenti Oggi</p>
                  <p className="text-3xl font-bold text-gray-800" data-testid="text-active-employees">{stats.activeEmployees}</p>
                  <Badge variant="success" className="mt-1">Real-time</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* On Leave */}
          <Card className="border-white/20 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl" 
                style={{background: 'rgba(255, 255, 255, 0.7)'}} data-testid="card-on-leave">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" 
                     style={{background: 'rgba(255, 105, 0, 0.1)'}}>
                  <Calendar className="h-6 w-6" style={{color: '#FF6900'}} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">In Ferie</p>
                  <p className="text-3xl font-bold text-gray-800" data-testid="text-on-leave">{stats.onLeave}</p>
                  <div className="flex items-center mt-1">
                    <Clock className="h-3 w-3 text-orange-500 mr-1" />
                    <span className="text-xs text-orange-600">6.3% del totale</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Requests */}
          <Card className="border-white/20 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl" 
                style={{background: 'rgba(255, 255, 255, 0.7)'}} data-testid="card-pending-requests">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" 
                     style={{background: 'rgba(239, 68, 68, 0.1)'}}>
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Richieste Pendenti</p>
                  <p className="text-3xl font-bold text-gray-800" data-testid="text-pending-requests">{stats.pendingRequests}</p>
                  <Badge variant="warning" className="mt-1">Richiede azione</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics Row */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Attendance Rate with Progress */}
          <Card className="border-white/20 shadow-lg backdrop-blur-sm" 
                style={{background: 'rgba(255, 255, 255, 0.7)'}} data-testid="card-attendance-rate">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" style={{color: '#FF6900'}} />
                Tasso di Presenza
              </CardTitle>
              <CardDescription>Performance mensile e obiettivi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-gray-800">{stats.attendanceRate.toFixed(1)}%</span>
                  <Badge variant="success">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +2.3%
                  </Badge>
                </div>
                <Progress value={stats.attendanceRate} className="h-3" />
                <p className="text-sm text-gray-600">
                  Rispetto al mese precedente. Obiettivo: 95%
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Turnover Rate */}
          <Card className="border-white/20 shadow-lg backdrop-blur-sm" 
                style={{background: 'rgba(255, 255, 255, 0.7)'}} data-testid="card-turnover-rate">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingDown className="h-5 w-5 mr-2" style={{color: '#7B2CBF'}} />
                Tasso di Turnover
              </CardTitle>
              <CardDescription>Stabilità del team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold text-gray-800">{stats.turnoverRate}%</span>
                  <Badge variant="success">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    -1.2%
                  </Badge>
                </div>
                <Progress value={100 - stats.turnoverRate} className="h-3" />
                <p className="text-sm text-gray-600">
                  In diminuzione. Obiettivo annuale: &lt; 10%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row - Recharts Integration */}
        <div className="grid gap-6 lg:grid-cols-2">
          
          {/* Attendance Trends Chart */}
          <Card className="border-white/20 shadow-lg backdrop-blur-sm" 
                style={{background: 'rgba(255, 255, 255, 0.7)'}} data-testid="card-attendance-chart">
            <CardHeader>
              <CardTitle>Tendenze Presenza</CardTitle>
              <CardDescription>Andamento mensile presenza vs obiettivo</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                  <XAxis dataKey="month" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="attendance" stroke="#FF6900" strokeWidth={3} name="Presenza %" />
                  <Line type="monotone" dataKey="target" stroke="#7B2CBF" strokeDasharray="5 5" name="Obiettivo %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Department Distribution */}
          <Card className="border-white/20 shadow-lg backdrop-blur-sm" 
                style={{background: 'rgba(255, 255, 255, 0.7)'}} data-testid="card-department-chart">
            <CardHeader>
              <CardTitle>Distribuzione Dipartimenti</CardTitle>
              <CardDescription>Allocazione risorse per area</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Employee Management Section */}
        <Card className="border-white/20 shadow-lg backdrop-blur-sm" 
              style={{background: 'rgba(255, 255, 255, 0.7)'}} data-testid="card-employee-management">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Gestione Dipendenti</CardTitle>
                <CardDescription>Lista completa con azioni CRUD</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button size="sm" data-testid="button-add-employee">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Aggiungi
                </Button>
                <Button variant="outline" size="sm" data-testid="button-export-employees">
                  <Download className="h-4 w-4 mr-2" />
                  Esporta
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            
            {/* Search and Filters */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca dipendenti..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-employees"
                />
              </div>
              <select
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                data-testid="select-filter-status"
              >
                <option value="all">Tutti gli stati</option>
                <option value="active">Attivi</option>
                <option value="leave">In ferie</option>
              </select>
              <select
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                data-testid="select-filter-department"
              >
                <option value="all">Tutti i dipartimenti</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Employee Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dipendente</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead>Dipartimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ultimo Accesso</TableHead>
                    <TableHead>Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id} data-testid={`row-employee-${employee.id}`}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div 
                            className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold"
                            style={{background: 'linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)'}}
                          >
                            {employee.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-semibold" data-testid={`text-employee-name-${employee.id}`}>
                              {employee.name}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {employee.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{employee.role}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Building className="h-4 w-4 mr-2 text-gray-400" />
                          {employee.department}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={employee.status === 'active' ? 'success' : 'warning'}
                          data-testid={`badge-status-${employee.id}`}
                        >
                          {employee.status === 'active' ? 'Attivo' : 'In Ferie'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{employee.lastLogin}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedEmployee(employee)}
                                data-testid={`button-view-employee-${employee.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Dettagli Dipendente</DialogTitle>
                                <DialogDescription>
                                  Informazioni complete su {employee.name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-6 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">Nome Completo</label>
                                    <p className="text-lg font-semibold">{employee.name}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">Ruolo</label>
                                    <p className="text-lg">{employee.role}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">Dipartimento</label>
                                    <p className="text-lg">{employee.department}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-500">Status</label>
                                    <Badge variant={employee.status === 'active' ? 'success' : 'warning'}>
                                      {employee.status === 'active' ? 'Attivo' : 'In Ferie'}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium text-gray-500 flex items-center">
                                      <Mail className="h-4 w-4 mr-1" />
                                      Email
                                    </label>
                                    <p>{employee.email}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-500 flex items-center">
                                      <Phone className="h-4 w-4 mr-1" />
                                      Telefono
                                    </label>
                                    <p>{employee.phone}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-500 flex items-center">
                                      <MapPin className="h-4 w-4 mr-1" />
                                      Località
                                    </label>
                                    <p>{employee.location}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-500 flex items-center">
                                      <DollarSign className="h-4 w-4 mr-1" />
                                      Stipendio
                                    </label>
                                    <p>€{employee.salary.toLocaleString()}</p>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-gray-500">Data Assunzione</label>
                                  <p>{new Date(employee.startDate).toLocaleDateString('it-IT')}</p>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button variant="outline" size="sm" data-testid={`button-edit-employee-${employee.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" data-testid={`button-delete-employee-${employee.id}`}>
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

        {/* Quick Actions Grid */}
        <Card className="border-white/20 shadow-lg backdrop-blur-sm" 
              style={{background: 'rgba(255, 255, 255, 0.7)'}} data-testid="card-quick-actions">
          <CardHeader>
            <CardTitle>Azioni Rapide</CardTitle>
            <CardDescription>Operazioni frequenti per HR</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              
              <Button 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                style={{
                  background: 'rgba(59, 130, 246, 0.05)',
                  borderColor: 'rgba(59, 130, 246, 0.2)',
                  color: '#374151'
                }}
                variant="outline"
                data-testid="button-add-employee-quick"
              >
                <UserPlus className="h-6 w-6" />
                <span className="text-sm font-medium">Aggiungi Dipendente</span>
              </Button>

              <Button 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                style={{
                  background: 'rgba(34, 197, 94, 0.05)',
                  borderColor: 'rgba(34, 197, 94, 0.2)',
                  color: '#374151'
                }}
                variant="outline"
                data-testid="button-approve-leaves"
              >
                <Calendar className="h-6 w-6" />
                <span className="text-sm font-medium">Approva Ferie</span>
              </Button>

              <Button 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                style={{
                  background: 'rgba(255, 105, 0, 0.05)',
                  borderColor: 'rgba(255, 105, 0, 0.2)',
                  color: '#374151'
                }}
                variant="outline"
                data-testid="button-review-expenses"
              >
                <DollarSign className="h-6 w-6" />
                <span className="text-sm font-medium">Review Spese</span>
              </Button>

              <Button 
                className="h-20 flex flex-col items-center justify-center space-y-2"
                style={{
                  background: 'rgba(123, 44, 191, 0.05)',
                  borderColor: 'rgba(123, 44, 191, 0.2)',
                  color: '#374151'
                }}
                variant="outline"
                data-testid="button-generate-report"
              >
                <FileText className="h-6 w-6" />
                <span className="text-sm font-medium">Genera Report</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Turnover Analytics Chart */}
        <Card className="border-white/20 shadow-lg backdrop-blur-sm" 
              style={{background: 'rgba(255, 255, 255, 0.7)'}} data-testid="card-turnover-analytics">
          <CardHeader>
            <CardTitle>Analisi Turnover</CardTitle>
            <CardDescription>Assunzioni vs Dimissioni</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={turnoverData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                <XAxis dataKey="month" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip />
                <Legend />
                <Bar dataKey="hires" fill="#10B981" name="Assunzioni" />
                <Bar dataKey="departures" fill="#EF4444" name="Dimissioni" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
}