import { useState, useEffect } from 'react';
import { useTabRouter } from '@/hooks/useTabRouter';
import { useTenant } from '@/contexts/TenantContext';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, Users, Calendar as CalendarIcon, FileText, Settings, Clock, Target, GraduationCap, TrendingUp,
  Download, Plus, Eye, Edit3, Search, Filter, MoreVertical, CheckCircle, XCircle, AlertTriangle,
  UserPlus, UserCheck, UserX, Mail, Phone, MapPin, Building, Activity, Zap, Shield, Award,
  MessageSquare, Bell, Home, ChevronRight, Star, ThumbsUp, ThumbsDown, Send, Trash2, Save,
  RefreshCw, ExternalLink, Copy, Info, HelpCircle, BrainCircle, FileCheck, Briefcase,
  DollarSign, PieChart, LineChart, Timer, Coffee, Heart, Baby, Umbrella, Stethoscope
} from 'lucide-react';
import { format, addDays, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import { Link } from 'wouter';
import { motion } from 'framer-motion';

// Import existing HR components
import ManagerApprovalQueue from '@/components/HR/ManagerApprovalQueue';
import HRRequestWizard from '@/components/HR/HRRequestWizard';
import HRRequestDetails from '@/components/HR/HRRequestDetails';
import AttendanceAnalytics from '@/components/Analytics/AttendanceAnalytics';
import LeaveAnalytics from '@/components/Analytics/LeaveAnalytics';
import LaborCostAnalytics from '@/components/Analytics/LaborCostAnalytics';
import ShiftAnalytics from '@/components/Analytics/ShiftAnalytics';
import ComplianceDashboard from '@/components/Analytics/ComplianceDashboard';

// Tab configuration for HR Dashboard - EXACT same structure as Employee Dashboard
const HR_TABS = [
  {
    id: 'overview',
    name: 'Dashboard Overview',
    icon: BarChart3,
    description: 'Metriche HR e panoramica generale'
  },
  {
    id: 'employees',
    name: 'Employee Management', 
    icon: Users,
    description: 'Gestione dipendenti e directory'
  },
  {
    id: 'time-management',
    name: 'Time & Schedules',
    icon: Clock,
    description: 'Gestione turni e orari'
  },
  {
    id: 'leave-management',
    name: 'Leave Management',
    icon: CalendarIcon,
    description: 'Gestione ferie e permessi'
  },
  {
    id: 'documents',
    name: 'Document Management',
    icon: FileText,
    description: 'Documenti e policy aziendali'
  },
  {
    id: 'performance',
    name: 'Performance Management',
    icon: Target,
    description: 'Valutazioni e obiettivi'
  },
  {
    id: 'training',
    name: 'Training Management',
    icon: GraduationCap,
    description: 'Formazione e certificazioni'
  },
  {
    id: 'analytics',
    name: 'Analytics & Reports',
    icon: TrendingUp,
    description: 'Report e analisi avanzate'
  },
  {
    id: 'settings',
    name: 'HR Settings',
    icon: Settings,
    description: 'Configurazioni e impostazioni'
  }
];

export default function HRDashboard() {
  // Tab Router Hook - exact same pattern as EmployeeDashboard
  const { activeTab, setTab, getTabUrl } = useTabRouter({
    defaultTab: 'overview'
  });

  // Use proper tenant context instead of URL parsing
  const { currentTenant } = useTenant();
  
  // Modal states with proper types - exact same discriminated union pattern
  type ModalState = 
    | { open: false; data: null }
    | { open: true; data: Record<string, unknown> };
  const [employeeModal, setEmployeeModal] = useState<ModalState>({ open: false, data: null });
  const [requestModal, setRequestModal] = useState<ModalState>({ open: false, data: null });
  const [documentModal, setDocumentModal] = useState<ModalState>({ open: false, data: null });
  const [reportModal, setReportModal] = useState<ModalState>({ open: false, data: null });
  
  // Main states
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  
  // HR Dashboard data - HR-focused instead of employee-focused
  const hrData = {
    id: 'hr-001',
    nome: 'Sistema',
    cognome: 'HR',
    email: 'hr@windtre.it',
    telefono: '+39 800 123 456',
    ruolo: 'HR Management Dashboard',
    reparto: 'Risorse Umane',
    store: 'Sede Centrale Milano'
  };

  // HR Metrics - HR management focused
  const hrMetrics = {
    totalEmployees: 127,
    activeEmployees: 119,
    onLeave: 8,
    pendingApprovals: 15,
    attendanceRate: 94.2,
    turnoverRate: 8.5,
    newHires: 3,
    performanceReviews: 45,
    trainingCompliance: 87.3,
    avgSalary: 52000
  };

  // Mock data for HR management
  const [hrNotifications] = useState([
    {
      id: 1,
      tipo: 'urgent',
      titolo: 'Richieste in sospeso',
      messaggio: '15 richieste di ferie richiedono approvazione immediata',
      data: new Date(),
      letto: false
    },
    {
      id: 2,
      tipo: 'info',
      titolo: 'Nuovo dipendente',
      messaggio: 'Marco Bianchi inizierà lunedì nel reparto Marketing',
      data: addDays(new Date(), -1),
      letto: false
    },
    {
      id: 3,
      tipo: 'warning',
      titolo: 'Compliance scadenza',
      messaggio: '5 certificazioni SSL scadranno nei prossimi 30 giorni',
      data: addDays(new Date(), -2),
      letto: true
    }
  ]);

  const [employeeData] = useState([
    {
      id: 'emp-001',
      nome: 'Mario Rossi',
      cognome: 'Rossi',
      ruolo: 'Senior Developer',
      reparto: 'IT',
      stato: 'active',
      email: 'mario.rossi@windtre.it',
      dataAssunzione: '2020-03-15',
      performance: 92,
      salario: 58000
    },
    {
      id: 'emp-002',
      nome: 'Giulia Bianchi',
      cognome: 'Bianchi',
      ruolo: 'Marketing Manager',
      reparto: 'Marketing',
      stato: 'active',
      email: 'giulia.bianchi@windtre.it',
      dataAssunzione: '2019-07-20',
      performance: 88,
      salario: 62000
    },
    {
      id: 'emp-003',
      nome: 'Luca Verde',
      cognome: 'Verde',
      ruolo: 'Sales Representative',
      reparto: 'Vendite',
      stato: 'leave',
      email: 'luca.verde@windtre.it',
      dataAssunzione: '2021-11-10',
      performance: 85,
      salario: 45000
    }
  ]);

  const [pendingApprovals] = useState([
    {
      id: 'req-001',
      dipendente: 'Luca Verde',
      tipo: 'Ferie',
      dataRichiesta: '2024-12-18',
      periodo: '23-27 Dic 2024',
      giorni: 5,
      stato: 'pending',
      motivo: 'Vacanze natalizie'
    },
    {
      id: 'req-002',
      dipendente: 'Anna Neri',
      tipo: 'Permesso',
      dataRichiesta: '2024-12-19',
      periodo: '20 Dic 2024',
      giorni: 1,
      stato: 'pending',
      motivo: 'Visita medica'
    }
  ]);

  // Update current time - same as EmployeeDashboard
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time utility - same as EmployeeDashboard
  const formatTime = (date: Date) => {
    return format(date, 'HH:mm:ss');
  };

  // Get status color - same as EmployeeDashboard
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'rejected': return 'bg-red-500';
      case 'active': return 'bg-green-500';
      case 'leave': return 'bg-orange-500';
      case 'inactive': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  // Handle modal functions
  const handleEmployeeSuccess = () => {
    setEmployeeModal({ open: false, data: null });
  };

  const handleRequestSuccess = () => {
    setRequestModal({ open: false, data: null });
  };

  // Tab content render functions
  const renderOverview = () => (
    <div className="space-y-6">
      {/* HR Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employees Card */}
        <motion.div
          whileHover={{ 
            scale: 1.02, 
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
            borderColor: '#FF6900'
          }}
          transition={{ 
            type: "spring", 
            stiffness: 300,
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1]
          }}
          className="cursor-pointer"
        >
          <Card className="relative overflow-hidden backdrop-blur-xl bg-white/80 border-white/20 hover:border-orange-500 transition-all duration-300 group hover:bg-gradient-to-br hover:from-orange-50 hover:to-white" data-testid="hr-card-total-employees">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent group-hover:from-orange-500/20 transition-all duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-6">
              <CardTitle className="text-sm font-medium">Dipendenti Totali</CardTitle>
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 group-hover:from-orange-200 group-hover:to-orange-300 transition-all duration-300 shadow-sm"
              >
                <Users className="h-6 w-6 text-orange-600 group-hover:text-orange-700 transition-colors duration-300" />
              </motion.div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent" data-testid="hr-text-total-employees">
                {hrMetrics.totalEmployees}
              </div>
              <p className="text-xs text-muted-foreground">
                {hrMetrics.activeEmployees} attivi, {hrMetrics.onLeave} in ferie
              </p>
              <Progress value={94} className="mt-3 h-2" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Pending Approvals Card */}
        <motion.div
          whileHover={{ 
            scale: 1.02, 
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
            borderColor: '#7B2CBF'
          }}
          transition={{ 
            type: "spring", 
            stiffness: 300,
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1]
          }}
          className="cursor-pointer"
        >
          <Card className="relative overflow-hidden backdrop-blur-xl bg-white/80 border-white/20 hover:border-purple-500 transition-all duration-300 group hover:bg-gradient-to-br hover:from-purple-50 hover:to-white" data-testid="hr-card-pending-approvals">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent group-hover:from-purple-500/20 transition-all duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-6">
              <CardTitle className="text-sm font-medium">Approvazioni Pending</CardTitle>
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 group-hover:from-purple-200 group-hover:to-purple-300 transition-all duration-300 shadow-sm"
              >
                <Clock className="h-6 w-6 text-purple-600 group-hover:text-purple-700 transition-colors duration-300" />
              </motion.div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent" data-testid="hr-text-pending-approvals">
                {hrMetrics.pendingApprovals}
              </div>
              <p className="text-xs text-muted-foreground">
                Richieste in attesa di approvazione
              </p>
              <Progress value={75} className="mt-3 h-2" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Attendance Rate Card */}
        <motion.div
          whileHover={{ 
            scale: 1.02, 
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
            borderColor: '#10B981'
          }}
          transition={{ 
            type: "spring", 
            stiffness: 300,
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1]
          }}
          className="cursor-pointer"
        >
          <Card className="relative overflow-hidden backdrop-blur-xl bg-white/80 border-white/20 hover:border-green-500 transition-all duration-300 group hover:bg-gradient-to-br hover:from-green-50 hover:to-white" data-testid="hr-card-attendance-rate">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent group-hover:from-green-500/20 transition-all duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-6">
              <CardTitle className="text-sm font-medium">Tasso Presenza</CardTitle>
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-green-100 to-green-200 group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300 shadow-sm"
              >
                <CheckCircle className="h-6 w-6 text-green-600 group-hover:text-green-700 transition-colors duration-300" />
              </motion.div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent" data-testid="hr-text-attendance-rate">
                {hrMetrics.attendanceRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                Media mensile presente
              </p>
              <Progress value={hrMetrics.attendanceRate} className="mt-3 h-2" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Turnover Rate Card */}
        <motion.div
          whileHover={{ 
            scale: 1.02, 
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
            borderColor: '#F59E0B'
          }}
          transition={{ 
            type: "spring", 
            stiffness: 300,
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1]
          }}
          className="cursor-pointer"
        >
          <Card className="relative overflow-hidden backdrop-blur-xl bg-white/80 border-white/20 hover:border-amber-500 transition-all duration-300 group hover:bg-gradient-to-br hover:from-amber-50 hover:to-white" data-testid="hr-card-turnover-rate">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent group-hover:from-amber-500/20 transition-all duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-6">
              <CardTitle className="text-sm font-medium">Turnover Rate</CardTitle>
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 group-hover:from-amber-200 group-hover:to-amber-300 transition-all duration-300 shadow-sm"
              >
                <TrendingUp className="h-6 w-6 text-amber-600 group-hover:text-amber-700 transition-colors duration-300" />
              </motion.div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent" data-testid="hr-text-turnover-rate">
                {hrMetrics.turnoverRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                Annualizzato - target 7%
              </p>
              <Progress value={hrMetrics.turnoverRate * 10} className="mt-3 h-2" />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-recent-activity">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-600" />
              Attività Recenti
            </CardTitle>
            <CardDescription>Ultime azioni HR</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-4">
                {hrNotifications.map((notification) => (
                  <div key={notification.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/50 hover:bg-white/70 transition-colors" data-testid={`hr-notification-${notification.id}`}>
                    <div className={`w-2 h-2 rounded-full mt-2 ${notification.tipo === 'urgent' ? 'bg-red-500' : notification.tipo === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{notification.titolo}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{notification.messaggio}</p>
                      <p className="text-xs text-muted-foreground mt-2">{format(notification.data, 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-quick-actions">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-600" />
              Azioni Rapide
            </CardTitle>
            <CardDescription>Operazioni frequenti</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center gap-2 hover:bg-orange-50 hover:border-orange-200"
                data-testid="hr-button-approve-requests"
                onClick={() => setTab('leave-management')}
              >
                <CheckCircle className="h-6 w-6 text-green-600" />
                <span className="text-xs">Approva Richieste</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center gap-2 hover:bg-purple-50 hover:border-purple-200"
                data-testid="hr-button-add-employee"
                onClick={() => setEmployeeModal({ open: true, data: {} })}
              >
                <UserPlus className="h-6 w-6 text-purple-600" />
                <span className="text-xs">Nuovo Dipendente</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center gap-2 hover:bg-blue-50 hover:border-blue-200"
                data-testid="hr-button-export-reports"
                onClick={() => setReportModal({ open: true, data: {} })}
              >
                <Download className="h-6 w-6 text-blue-600" />
                <span className="text-xs">Export Report</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center gap-2 hover:bg-green-50 hover:border-green-200"
                data-testid="hr-button-view-analytics"
                onClick={() => setTab('analytics')}
              >
                <BarChart3 className="h-6 w-6 text-green-600" />
                <span className="text-xs">View Analytics</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      <div className="space-y-4">
        <Alert className="border-yellow-200 bg-yellow-50" data-testid="hr-alert-pending-actions">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle>Azioni Richieste</AlertTitle>
          <AlertDescription>
            Ci sono {hrMetrics.pendingApprovals} richieste di ferie in attesa di approvazione e {hrMetrics.performanceReviews} valutazioni da completare.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );

  const renderEmployees = () => (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-employee-filters">
        <CardHeader>
          <CardTitle>Employee Management</CardTitle>
          <CardDescription>Gestisci dipendenti e directory aziendale</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Cerca dipendenti..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                data-testid="hr-input-search-employees"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48" data-testid="hr-select-filter-status">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="active">Attivi</SelectItem>
                <SelectItem value="leave">In ferie</SelectItem>
                <SelectItem value="inactive">Inattivi</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-full md:w-48" data-testid="hr-select-filter-department">
                <SelectValue placeholder="Reparto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i reparti</SelectItem>
                <SelectItem value="IT">IT</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Vendite">Vendite</SelectItem>
                <SelectItem value="HR">HR</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              data-testid="hr-button-add-employee-top"
              onClick={() => setEmployeeModal({ open: true, data: {} })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Dipendente
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Employee Directory */}
      <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-employee-directory">
        <CardHeader>
          <CardTitle>Directory Dipendenti</CardTitle>
          <CardDescription>{employeeData.length} dipendenti totali</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {employeeData.map((employee) => (
              <div 
                key={employee.id} 
                className="flex items-center justify-between p-4 rounded-lg bg-white/50 hover:bg-white/70 transition-colors border border-white/20"
                data-testid={`hr-employee-${employee.id}`}
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback className="bg-gradient-to-br from-orange-100 to-purple-100 text-gray-700">
                      {employee.nome.charAt(0)}{employee.cognome.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{employee.nome} {employee.cognome}</h3>
                    <p className="text-sm text-muted-foreground">{employee.ruolo} • {employee.reparto}</p>
                    <p className="text-xs text-muted-foreground">{employee.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={getStatusColor(employee.stato) + ' text-white'}>
                    {employee.stato}
                  </Badge>
                  <div className="text-right">
                    <p className="text-sm font-medium">€{employee.salario.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Performance: {employee.performance}%</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    data-testid={`hr-button-edit-employee-${employee.id}`}
                    onClick={() => setEmployeeModal({ open: true, data: employee })}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTimeManagement = () => (
    <div className="space-y-6">
      <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-time-management">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Time & Schedule Management
          </CardTitle>
          <CardDescription>Gestione turni, orari e pianificazione</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shift Overview */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Turni Oggi
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200" data-testid="hr-shift-morning">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Turno Mattina</span>
                    <Badge variant="secondary">08:00 - 14:00</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">5 dipendenti assegnati</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 border border-green-200" data-testid="hr-shift-afternoon">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Turno Pomeriggio</span>
                    <Badge variant="secondary">14:00 - 20:00</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">7 dipendenti assegnati</p>
                </div>
              </div>
            </div>

            {/* Time Analytics Preview */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Analytics Rapide
              </h3>
              <ShiftAnalytics period="week" storeId="all" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderLeaveManagement = () => (
    <div className="space-y-6">
      <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-leave-management">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-green-600" />
            Leave & Request Management
          </CardTitle>
          <CardDescription>Gestione ferie, permessi e richieste</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Manager Approval Queue Integration */}
          <ManagerApprovalQueue />
        </CardContent>
      </Card>

      {/* Leave Analytics */}
      <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-leave-analytics">
        <CardHeader>
          <CardTitle>Leave Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <LeaveAnalytics />
        </CardContent>
      </Card>
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-6">
      <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-document-management">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Document Management
          </CardTitle>
          <CardDescription>Gestione documenti aziendali e policy</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-white/50 border border-white/20 hover:bg-white/70 transition-colors" data-testid="hr-document-policies">
              <FileText className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-medium">Policy Aziendali</h3>
              <p className="text-sm text-muted-foreground mt-1">Regolamenti e procedure</p>
              <Button variant="outline" size="sm" className="mt-3 w-full" data-testid="hr-button-view-policies">
                Visualizza
              </Button>
            </div>
            <div className="p-4 rounded-lg bg-white/50 border border-white/20 hover:bg-white/70 transition-colors" data-testid="hr-document-contracts">
              <Briefcase className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="font-medium">Contratti</h3>
              <p className="text-sm text-muted-foreground mt-1">Gestione contratti dipendenti</p>
              <Button variant="outline" size="sm" className="mt-3 w-full" data-testid="hr-button-view-contracts">
                Gestisci
              </Button>
            </div>
            <div className="p-4 rounded-lg bg-white/50 border border-white/20 hover:bg-white/70 transition-colors" data-testid="hr-document-compliance">
              <Shield className="h-8 w-8 text-orange-600 mb-3" />
              <h3 className="font-medium">Compliance</h3>
              <p className="text-sm text-muted-foreground mt-1">Documenti di conformità</p>
              <Button variant="outline" size="sm" className="mt-3 w-full" data-testid="hr-button-view-compliance">
                Controlla
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Dashboard Integration */}
      <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-compliance-dashboard">
        <CardHeader>
          <CardTitle>Compliance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ComplianceDashboard showDetails={true} />
        </CardContent>
      </Card>
    </div>
  );

  const renderPerformance = () => (
    <div className="space-y-6">
      <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-performance-management">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-red-600" />
            Performance Management
          </CardTitle>
          <CardDescription>Gestione performance e valutazioni</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Performance Overview */}
            <div className="space-y-4">
              <h3 className="font-medium">Valutazioni in Corso</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200" data-testid="hr-performance-review-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Q4 2024 Reviews</span>
                    <Badge variant="secondary">45 di 127</Badge>
                  </div>
                  <Progress value={35} className="mt-2" />
                </div>
                <div className="p-3 rounded-lg bg-green-50 border border-green-200" data-testid="hr-performance-review-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">360° Feedback</span>
                    <Badge variant="secondary">12 di 25</Badge>
                  </div>
                  <Progress value={48} className="mt-2" />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <h3 className="font-medium">Azioni Rapide</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" data-testid="hr-button-create-review-cycle">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Ciclo Valutazione
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="hr-button-view-reports">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Report Performance
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="hr-button-manage-goals">
                  <Target className="h-4 w-4 mr-2" />
                  Gestisci Obiettivi
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTraining = () => (
    <div className="space-y-6">
      <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-training-management">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            Training Management
          </CardTitle>
          <CardDescription>Gestione formazione e certificazioni</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Training Stats */}
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-200" data-testid="hr-training-stat-completion">
                  <div className="flex items-center gap-3">
                    <Award className="h-8 w-8 text-indigo-600" />
                    <div>
                      <p className="text-2xl font-bold text-indigo-600">{hrMetrics.trainingCompliance}%</p>
                      <p className="text-sm text-indigo-700">Compliance Rate</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-green-50 border border-green-200" data-testid="hr-training-stat-certificates">
                  <div className="flex items-center gap-3">
                    <FileCheck className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold text-green-600">156</p>
                      <p className="text-sm text-green-700">Certificazioni Attive</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Training Programs */}
              <div className="space-y-3">
                <h3 className="font-medium">Programmi Attivi</h3>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-white/50 border border-white/20" data-testid="hr-training-program-1">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Sicurezza sul Lavoro</span>
                      <Badge>Obbligatorio</Badge>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <Progress value={92} className="flex-1 mr-3" />
                      <span className="text-sm text-muted-foreground">92%</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/50 border border-white/20" data-testid="hr-training-program-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Digital Skills</span>
                      <Badge variant="secondary">Volontario</Badge>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <Progress value={67} className="flex-1 mr-3" />
                      <span className="text-sm text-muted-foreground">67%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <h3 className="font-medium">Azioni</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" data-testid="hr-button-new-training">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Corso
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="hr-button-assign-training">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assegna Formazione
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="hr-button-view-certificates">
                  <Award className="h-4 w-4 mr-2" />
                  Certificazioni
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="hr-button-training-reports">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Report Formazione
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-analytics-reports">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Analytics & Reports
          </CardTitle>
          <CardDescription>Report completi e analisi HR</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Button 
              variant="outline" 
              className="h-24 flex flex-col items-center gap-2 hover:bg-blue-50 hover:border-blue-200"
              data-testid="hr-button-attendance-analytics"
            >
              <Clock className="h-8 w-8 text-blue-600" />
              <span className="text-sm">Attendance Analytics</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-24 flex flex-col items-center gap-2 hover:bg-green-50 hover:border-green-200"
              data-testid="hr-button-leave-analytics"
            >
              <CalendarIcon className="h-8 w-8 text-green-600" />
              <span className="text-sm">Leave Analytics</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-24 flex flex-col items-center gap-2 hover:bg-purple-50 hover:border-purple-200"
              data-testid="hr-button-cost-analytics"
            >
              <DollarSign className="h-8 w-8 text-purple-600" />
              <span className="text-sm">Labor Cost Analytics</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integrated Analytics Components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-attendance-analytics-preview">
          <CardHeader>
            <CardTitle className="text-lg">Attendance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceAnalytics period="month" compact={true} />
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-labor-cost-analytics-preview">
          <CardHeader>
            <CardTitle className="text-lg">Labor Cost Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <LaborCostAnalytics period="month" compact={true} />
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-hr-settings">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-600" />
            HR Settings & Configuration
          </CardTitle>
          <CardDescription>Configurazioni sistema HR</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-white/50 border border-white/20 hover:bg-white/70 transition-colors" data-testid="hr-setting-policies">
              <Shield className="h-8 w-8 text-blue-600 mb-3" />
              <h3 className="font-medium">Policy HR</h3>
              <p className="text-sm text-muted-foreground mt-1">Gestisci regolamenti e procedure</p>
              <Button variant="outline" size="sm" className="mt-3 w-full" data-testid="hr-button-manage-policies">
                Configura
              </Button>
            </div>
            <div className="p-4 rounded-lg bg-white/50 border border-white/20 hover:bg-white/70 transition-colors" data-testid="hr-setting-workflows">
              <Activity className="h-8 w-8 text-green-600 mb-3" />
              <h3 className="font-medium">Workflow Approvazioni</h3>
              <p className="text-sm text-muted-foreground mt-1">Configura flussi di approvazione</p>
              <Button variant="outline" size="sm" className="mt-3 w-full" data-testid="hr-button-manage-workflows">
                Gestisci
              </Button>
            </div>
            <div className="p-4 rounded-lg bg-white/50 border border-white/20 hover:bg-white/70 transition-colors" data-testid="hr-setting-integrations">
              <Zap className="h-8 w-8 text-purple-600 mb-3" />
              <h3 className="font-medium">Integrazioni</h3>
              <p className="text-sm text-muted-foreground mt-1">Configura sistemi esterni</p>
              <Button variant="outline" size="sm" className="mt-3 w-full" data-testid="hr-button-manage-integrations">
                Imposta
              </Button>
            </div>
            <div className="p-4 rounded-lg bg-white/50 border border-white/20 hover:bg-white/70 transition-colors" data-testid="hr-setting-permissions">
              <UserCheck className="h-8 w-8 text-orange-600 mb-3" />
              <h3 className="font-medium">Permessi & Ruoli</h3>
              <p className="text-sm text-muted-foreground mt-1">Gestisci accessi e autorizzazioni</p>
              <Button variant="outline" size="sm" className="mt-3 w-full" data-testid="hr-button-manage-permissions">
                Modifica
              </Button>
            </div>
            <div className="p-4 rounded-lg bg-white/50 border border-white/20 hover:bg-white/70 transition-colors" data-testid="hr-setting-notifications">
              <Bell className="h-8 w-8 text-red-600 mb-3" />
              <h3 className="font-medium">Notifiche</h3>
              <p className="text-sm text-muted-foreground mt-1">Configura alert e comunicazioni</p>
              <Button variant="outline" size="sm" className="mt-3 w-full" data-testid="hr-button-manage-notifications">
                Configura
              </Button>
            </div>
            <div className="p-4 rounded-lg bg-white/50 border border-white/20 hover:bg-white/70 transition-colors" data-testid="hr-setting-backup">
              <Save className="h-8 w-8 text-indigo-600 mb-3" />
              <h3 className="font-medium">Backup & Export</h3>
              <p className="text-sm text-muted-foreground mt-1">Gestisci backup dati HR</p>
              <Button variant="outline" size="sm" className="mt-3 w-full" data-testid="hr-button-manage-backup">
                Gestisci
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );


  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-purple-50 to-indigo-50">
        {/* Header - EXACT same pattern as EmployeeDashboard */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900" data-testid="hr-text-dashboard-title">HR Management Dashboard</h1>
                <p className="text-gray-600 mt-1" data-testid="hr-text-dashboard-subtitle">
                  Sistema di gestione risorse umane • {hrData.store}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900" data-testid="hr-text-current-time">{formatTime(currentTime)}</p>
                  <p className="text-xs text-gray-600" data-testid="hr-text-current-date">{format(currentTime, 'EEEE, dd MMMM yyyy', { locale: it })}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/50 hover:bg-white/70 backdrop-blur-sm"
                  data-testid="hr-button-refresh"
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Aggiorna
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation - IDENTICO a EmployeeDashboard */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 border-b border-white/20 mb-6 overflow-x-auto">
            {HR_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={getTabUrl(tab.id)}
                  onClick={() => setTab(tab.id)}
                  data-testid={`hr-tab-${tab.id}`}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-t-lg transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-lg'
                      : 'bg-white/10 backdrop-blur-sm text-gray-700 hover:bg-white/20'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {activeTab === 'overview' && (
              <div className="space-y-6" data-testid="hr-section-overview">
                {renderOverview()}
              </div>
            )}

            {activeTab === 'employees' && (
              <div className="space-y-6" data-testid="hr-section-employees">
                {renderEmployees()}
              </div>
            )}

            {activeTab === 'time-management' && (
              <div className="space-y-6" data-testid="hr-section-time-management">
                {renderTimeManagement()}
              </div>
            )}

            {activeTab === 'leave-management' && (
              <div className="space-y-6" data-testid="hr-section-leave-management">
                {renderLeaveManagement()}
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-6" data-testid="hr-section-documents">
                {renderDocuments()}
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="space-y-6" data-testid="hr-section-performance">
                {renderPerformance()}
              </div>
            )}

            {activeTab === 'training' && (
              <div className="space-y-6" data-testid="hr-section-training">
                {renderTraining()}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6" data-testid="hr-section-analytics">
                {renderAnalytics()}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6" data-testid="hr-section-settings">
                {renderSettings()}
              </div>
            )}
          </div>
        </div>

        {/* Modals - Same pattern as EmployeeDashboard */}
        {/* Employee Modal */}
        <Dialog open={employeeModal.open} onOpenChange={(open) => !open && setEmployeeModal({ open: false, data: null })}>
          <DialogContent className="sm:max-w-[600px]" data-testid="hr-modal-employee">
            <DialogHeader>
              <DialogTitle>
                {employeeModal.data && employeeModal.open && 'id' in employeeModal.data ? 'Modifica Dipendente' : 'Nuovo Dipendente'}
              </DialogTitle>
              <DialogDescription>
                Gestisci le informazioni del dipendente
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome">Nome</Label>
                  <Input id="nome" defaultValue={employeeModal.data && employeeModal.open && 'nome' in employeeModal.data ? String(employeeModal.data.nome) : ''} data-testid="hr-input-employee-nome" />
                </div>
                <div>
                  <Label htmlFor="cognome">Cognome</Label>
                  <Input id="cognome" defaultValue={employeeModal.data && employeeModal.open && 'cognome' in employeeModal.data ? String(employeeModal.data.cognome) : ''} data-testid="hr-input-employee-cognome" />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={employeeModal.data && employeeModal.open && 'email' in employeeModal.data ? String(employeeModal.data.email) : ''} data-testid="hr-input-employee-email" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ruolo">Ruolo</Label>
                  <Input id="ruolo" defaultValue={employeeModal.data && employeeModal.open && 'ruolo' in employeeModal.data ? String(employeeModal.data.ruolo) : ''} data-testid="hr-input-employee-ruolo" />
                </div>
                <div>
                  <Label htmlFor="reparto">Reparto</Label>
                  <Select>
                    <SelectTrigger data-testid="hr-select-employee-reparto">
                      <SelectValue placeholder="Seleziona reparto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Vendite">Vendite</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEmployeeModal({ open: false, data: null })} data-testid="hr-button-employee-cancel">
                Annulla
              </Button>
              <Button onClick={handleEmployeeSuccess} data-testid="hr-button-employee-save">
                Salva
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* HR Request Modal */}
        <Dialog open={requestModal.open} onOpenChange={(open) => !open && setRequestModal({ open: false, data: null })}>
          <DialogContent className="sm:max-w-[800px]" data-testid="hr-modal-request">
            <DialogHeader>
              <DialogTitle>Nuova Richiesta HR</DialogTitle>
              <DialogDescription>
                Crea una nuova richiesta per un dipendente
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <HRRequestWizard onSuccess={handleRequestSuccess} />
            </div>
          </DialogContent>
        </Dialog>

        {/* Report Export Modal */}
        <Dialog open={reportModal.open} onOpenChange={(open) => !open && setReportModal({ open: false, data: null })}>
          <DialogContent className="sm:max-w-[500px]" data-testid="hr-modal-report">
            <DialogHeader>
              <DialogTitle>Export Report</DialogTitle>
              <DialogDescription>
                Seleziona il tipo di report da esportare
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start" data-testid="hr-button-export-attendance">
                  <Clock className="h-4 w-4 mr-2" />
                  Report Presenze
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="hr-button-export-leave">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Report Ferie
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="hr-button-export-payroll">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Report Payroll
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="hr-button-export-performance">
                  <Target className="h-4 w-4 mr-2" />
                  Report Performance
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReportModal({ open: false, data: null })} data-testid="hr-button-report-cancel">
                Chiudi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}