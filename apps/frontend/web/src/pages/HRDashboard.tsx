import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, Users, Calendar as CalendarIcon, FileText, Settings, Clock, Target, GraduationCap, TrendingUp,
  Download, Plus, Eye, Edit3, Search, Filter, MoreVertical, CheckCircle, XCircle, AlertTriangle,
  UserPlus, UserCheck, UserX, Mail, Phone, MapPin, Building, Activity, Zap, Shield, Award,
  MessageSquare, Bell, Home, ChevronRight, Star, ThumbsUp, ThumbsDown, Send, Trash2, Save,
  RefreshCw, ExternalLink, Copy, Info, HelpCircle, BrainCircle, FileCheck, Briefcase,
  DollarSign, PieChart, LineChart, Timer, Coffee, Heart, Baby, Umbrella, Stethoscope,
  Upload, Archive, History, Folder, FolderOpen, Lock, Key, Database, GitBranch, Workflow,
  Signature, FileSignature, BookOpen, Calendar as CalendarView, Tag, Tags, LinkIcon, Server,
  Cloud, HardDrive, Share2, UserCog, Users2, Globe, Layers, CheckSquare, Square,
  FileImage, FilePdf, FileSpreadsheet, FileVideo, FileAudio, File, Play, Pause, RotateCcw,
  ChevronLeft, ArrowRight, LogOut, Calculator, Wand2, Lightbulb, Cpu, Monitor, Smartphone,
  Tablet, Laptop, Maximize, Minimize, FullScreen, ScanLine, Fingerprint, ShieldCheck, Scale
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
import { LeaveCalendar } from '@/components/Leave/LeaveCalendar';
import { ApprovalQueue } from '@/components/Leave/ApprovalQueue';

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

  // Real-time HR Metrics Query
  const { data: hrMetrics, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['/api/hr/metrics'],
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10   // 10 minutes
  });

  // Fallback for loading/error states
  const defaultMetrics = {
    totalEmployees: 0,
    activeEmployees: 0,
    onLeave: 0,
    pendingApprovals: 0,
    attendanceRate: 0,
    turnoverRate: 0,
    newHires: 0,
    performanceReviews: 0,
    trainingCompliance: 0,
    avgSalary: 0
  };
  const currentMetrics = hrMetrics || defaultMetrics;

  // Real-time HR Notifications Query
  const { data: hrNotifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ['/api/hr/notifications'],
    staleTime: 1000 * 30, // 30 seconds - more frequent for notifications
    gcTime: 1000 * 60 * 5  // 5 minutes
  });

  // Real-time Employee Data Query
  const { data: employeeData, isLoading: employeeLoading, error: employeeError } = useQuery({
    queryKey: ['/api/hr/employees'],
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30   // 30 minutes
  });

  // Real-time Pending Approvals Query
  const { data: pendingApprovals, isLoading: approvalsLoading, error: approvalsError } = useQuery({
    queryKey: ['/api/hr/pending-approvals'],
    staleTime: 1000 * 30, // 30 seconds - frequent updates for approvals
    gcTime: 1000 * 60 * 10 // 10 minutes
  });

  // Bulk Approval Mutation with Cache Invalidation
  const bulkApprovalMutation = useMutation({
    mutationFn: async ({ requestIds, action }: { requestIds: string[], action: 'approve' | 'reject' }) => {
      return apiRequest('/api/hr/bulk-approval', {
        method: 'POST',
        body: JSON.stringify({ requestIds, action })
      });
    },
    onSuccess: () => {
      // Invalidate multiple related caches
      queryClient.invalidateQueries({ queryKey: ['/api/hr/pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/notifications'] });
    }
  });

  // Individual Approval Mutation
  const approvalMutation = useMutation({
    mutationFn: async ({ requestId, action, comments }: { requestId: string, action: 'approve' | 'reject', comments?: string }) => {
      return apiRequest(`/api/hr/approval/${requestId}`, {
        method: 'POST',
        body: JSON.stringify({ action, comments })
      });
    },
    onSuccess: () => {
      // Hierarchical cache invalidation
      queryClient.invalidateQueries({ queryKey: ['/api/hr'] });
    }
  });

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
      {/* Real-time HR Metrics Dashboard - Enhanced */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                {metricsLoading ? <Skeleton className="h-8 w-16" /> : currentMetrics.totalEmployees}
              </div>
              <p className="text-xs text-muted-foreground">
                {metricsLoading ? <Skeleton className="h-4 w-32" /> : `${currentMetrics.activeEmployees} attivi, ${currentMetrics.onLeave} in ferie`}
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
                {metricsLoading ? <Skeleton className="h-8 w-16" /> : currentMetrics.pendingApprovals}
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
                {metricsLoading ? <Skeleton className="h-8 w-16" /> : `${currentMetrics.attendanceRate}%`}
              </div>
              <p className="text-xs text-muted-foreground">
                Media mensile presente
              </p>
              <Progress value={metricsLoading ? 0 : currentMetrics.attendanceRate} className="mt-3 h-2" />
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
                {metricsLoading ? <Skeleton className="h-8 w-16" /> : `${currentMetrics.turnoverRate}%`}
              </div>
              <p className="text-xs text-muted-foreground">
                Annualizzato - target 7%
              </p>
              <Progress value={metricsLoading ? 0 : currentMetrics.turnoverRate * 10} className="mt-3 h-2" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Training Compliance Card */}
        <motion.div
          whileHover={{ 
            scale: 1.02, 
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
            borderColor: '#8B5CF6'
          }}
          transition={{ 
            type: "spring", 
            stiffness: 300,
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1]
          }}
          className="cursor-pointer"
        >
          <Card className="relative overflow-hidden backdrop-blur-xl bg-white/80 border-white/20 hover:border-purple-500 transition-all duration-300 group hover:bg-gradient-to-br hover:from-purple-50 hover:to-white" data-testid="hr-card-training-compliance">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent group-hover:from-purple-500/20 transition-all duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-6">
              <CardTitle className="text-sm font-medium">Training Compliance</CardTitle>
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 group-hover:from-purple-200 group-hover:to-purple-300 transition-all duration-300 shadow-sm"
              >
                <GraduationCap className="h-6 w-6 text-purple-600 group-hover:text-purple-700 transition-colors duration-300" />
              </motion.div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent" data-testid="hr-text-training-compliance">
                {metricsLoading ? <Skeleton className="h-8 w-16" /> : `${currentMetrics.trainingCompliance}%`}
              </div>
              <p className="text-xs text-muted-foreground">
                Target 90% - trend positivo
              </p>
              <Progress value={metricsLoading ? 0 : currentMetrics.trainingCompliance} className="mt-3 h-2" />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Manager Approval Queue with SLA Tracking - Enhanced */}
      <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-approval-queue">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Manager Approval Queue
            <Badge variant="outline" className="ml-auto">
              {hrMetrics.pendingApprovals} Pending
            </Badge>
          </CardTitle>
          <CardDescription>Richieste in attesa con SLA tracking e azioni bulk</CardDescription>
        </CardHeader>
        <CardContent>
          <ManagerApprovalQueue className="" />
        </CardContent>
      </Card>

      {/* Advanced Analytics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Analytics */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-attendance-analytics">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-blue-600" />
              Attendance Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceAnalytics period="week" compact={true} />
          </CardContent>
        </Card>

        {/* Leave Analytics */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-leave-analytics">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarIcon className="h-5 w-5 text-green-600" />
              Leave Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LeaveAnalytics period="month" compact={true} />
          </CardContent>
        </Card>

        {/* Team Status Overview */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-team-status">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-purple-600" />
              Team Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Employee Availability Overview */}
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="text-2xl font-bold text-green-600">{hrMetrics.activeEmployees}</div>
                  <div className="text-xs text-green-700">Presenti Oggi</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-orange-50 border border-orange-200">
                  <div className="text-2xl font-bold text-orange-600">{hrMetrics.onLeave}</div>
                  <div className="text-xs text-orange-700">In Ferie</div>
                </div>
              </div>
              
              {/* Department Status */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Status per Reparto</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>IT</span>
                    <div className="flex items-center gap-2">
                      <Progress value={92} className="w-16 h-2" />
                      <span className="text-xs text-muted-foreground">12/13</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Marketing</span>
                    <div className="flex items-center gap-2">
                      <Progress value={85} className="w-16 h-2" />
                      <span className="text-xs text-muted-foreground">17/20</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Vendite</span>
                    <div className="flex items-center gap-2">
                      <Progress value={78} className="w-16 h-2" />
                      <span className="text-xs text-muted-foreground">25/32</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                data-testid="hr-button-view-team-details"
                onClick={() => setTab('employees')}
              >
                <Eye className="h-4 w-4 mr-2" />
                Dettagli Team
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts & Notification Center - Enhanced */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Alerts */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-critical-alerts">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Alert Critici
              <Badge variant="destructive" className="ml-auto">3</Badge>
            </CardTitle>
            <CardDescription>Situazioni che richiedono attenzione immediata</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Alert className="border-red-200 bg-red-50" data-testid="hr-alert-critical-1">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">SLA Breach</AlertTitle>
                <AlertDescription className="text-red-700">
                  5 richieste di ferie superano le 72h di attesa. Azione richiesta.
                </AlertDescription>
              </Alert>
              <Alert className="border-yellow-200 bg-yellow-50" data-testid="hr-alert-critical-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800">Compliance Scadenza</AlertTitle>
                <AlertDescription className="text-yellow-700">
                  12 certificazioni scadranno nei prossimi 15 giorni.
                </AlertDescription>
              </Alert>
              <Alert className="border-orange-200 bg-orange-50" data-testid="hr-alert-critical-3">
                <Users className="h-4 w-4 text-orange-600" />
                <AlertTitle className="text-orange-800">Staffing Shortage</AlertTitle>
                <AlertDescription className="text-orange-700">
                  Reparto Vendite sotto il 80% di copertura questa settimana.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Quick Actions */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-advanced-actions">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-600" />
              Azioni HR Avanzate
            </CardTitle>
            <CardDescription>Operazioni frequenti e workflow automation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center gap-2 hover:bg-green-50 hover:border-green-200"
                data-testid="hr-button-bulk-approve"
                onClick={() => setTab('leave-management')}
              >
                <CheckCircle className="h-6 w-6 text-green-600" />
                <span className="text-xs text-center">Bulk Approve ({hrMetrics.pendingApprovals})</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center gap-2 hover:bg-blue-50 hover:border-blue-200"
                data-testid="hr-button-performance-cycle"
                onClick={() => setTab('performance')}
              >
                <Target className="h-6 w-6 text-blue-600" />
                <span className="text-xs text-center">Performance Cycle</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center gap-2 hover:bg-purple-50 hover:border-purple-200"
                data-testid="hr-button-new-employee"
                onClick={() => setEmployeeModal({ open: true, data: {} })}
              >
                <UserPlus className="h-6 w-6 text-purple-600" />
                <span className="text-xs text-center">Add Employee</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center gap-2 hover:bg-orange-50 hover:border-orange-200"
                data-testid="hr-button-compliance-check"
                onClick={() => setTab('documents')}
              >
                <Shield className="h-6 w-6 text-orange-600" />
                <span className="text-xs text-center">Compliance Check</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center gap-2 hover:bg-indigo-50 hover:border-indigo-200"
                data-testid="hr-button-training-assign"
                onClick={() => setTab('training')}
              >
                <GraduationCap className="h-6 w-6 text-indigo-600" />
                <span className="text-xs text-center">Assign Training</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center gap-2 hover:bg-teal-50 hover:border-teal-200"
                data-testid="hr-button-analytics-report"
                onClick={() => setReportModal({ open: true, data: {} })}
              >
                <BarChart3 className="h-6 w-6 text-teal-600" />
                <span className="text-xs text-center">Analytics Report</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Mini Calendar & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave Calendar Preview */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-leave-calendar">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-green-600" />
              Calendar Overview
            </CardTitle>
            <CardDescription>Ferie e permessi programmati</CardDescription>
          </CardHeader>
          <CardContent>
            <LeaveCalendar compact={true} />
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-activity-feed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-600" />
              Recent Activity
            </CardTitle>
            <CardDescription>Ultime azioni e aggiornamenti HR</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-4">
                {hrNotifications.map((notification, index) => (
                  <motion.div 
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-white/50 hover:bg-white/70 transition-colors" 
                    data-testid={`hr-notification-${notification.id}`}
                  >
                    <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                      notification.tipo === 'urgent' ? 'bg-red-500 animate-pulse' : 
                      notification.tipo === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-gray-900">{notification.titolo}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notification.messaggio}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted-foreground">{format(notification.data, 'dd/MM/yyyy HH:mm')}</p>
                        {!notification.letto && (
                          <Badge variant="secondary" className="text-xs">Nuovo</Badge>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
            <div className="mt-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                data-testid="hr-button-view-all-notifications"
              >
                <Bell className="h-4 w-4 mr-2" />
                Visualizza Tutte le Notifiche
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderEmployees = () => (
    <div className="space-y-6">
      {/* Enhanced Search and Management Bar */}
      <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-employee-management">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Employee Management
            <Badge variant="outline" className="ml-auto">
              {employeeData.length} Dipendenti
            </Badge>
          </CardTitle>
          <CardDescription>Directory completa con lifecycle management e operazioni bulk</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Primary Search and Filter Row */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Cerca per nome, email, ruolo o reparto..."
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
                  <SelectItem value="onboarding">In Onboarding</SelectItem>
                  <SelectItem value="leave">In ferie</SelectItem>
                  <SelectItem value="offboarding">In Uscita</SelectItem>
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
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Advanced Actions and Bulk Operations */}
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="flex flex-wrap gap-2">
                <Button 
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  data-testid="hr-button-add-employee"
                  onClick={() => setEmployeeModal({ open: true, data: {} })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Dipendente
                </Button>
                <Button 
                  variant="outline" 
                  className="hover:bg-green-50 hover:border-green-200"
                  data-testid="hr-button-onboarding-wizard"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Onboarding Wizard
                </Button>
                <Button 
                  variant="outline" 
                  className="hover:bg-purple-50 hover:border-purple-200"
                  data-testid="hr-button-org-chart"
                >
                  <GitBranch className="h-4 w-4 mr-2" />
                  Organigramma
                </Button>
                <Button 
                  variant="outline" 
                  className="hover:bg-blue-50 hover:border-blue-200"
                  data-testid="hr-button-bulk-operations"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Operazioni Bulk
                </Button>
              </div>
              
              <div className="flex gap-2 ml-auto">
                <Button 
                  variant="outline" 
                  size="sm"
                  data-testid="hr-button-export-employees"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  data-testid="hr-button-employee-reports"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Report
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Lifecycle Management Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Lifecycle Status Cards */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-onboarding">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-green-600" />
              Onboarding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">5</div>
                <div className="text-xs text-muted-foreground">Nuovi Assunti</div>
              </div>
              <Progress value={75} className="h-2" />
              <div className="text-xs text-center text-muted-foreground">75% Completamento</div>
              <Button size="sm" variant="outline" className="w-full" data-testid="hr-button-manage-onboarding">
                <Settings className="h-4 w-4 mr-2" />
                Gestisci
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-transfers">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shuffle className="h-5 w-5 text-blue-600" />
              Transfers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">3</div>
                <div className="text-xs text-muted-foreground">In Corso</div>
              </div>
              <Progress value={60} className="h-2" />
              <div className="text-xs text-center text-muted-foreground">60% Completamento</div>
              <Button size="sm" variant="outline" className="w-full" data-testid="hr-button-manage-transfers">
                <ArrowRight className="h-4 w-4 mr-2" />
                Gestisci
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-offboarding">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserMinus className="h-5 w-5 text-orange-600" />
              Offboarding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">2</div>
                <div className="text-xs text-muted-foreground">In Uscita</div>
              </div>
              <Progress value={40} className="h-2" />
              <div className="text-xs text-center text-muted-foreground">40% Completamento</div>
              <Button size="sm" variant="outline" className="w-full" data-testid="hr-button-manage-offboarding">
                <LogOut className="h-4 w-4 mr-2" />
                Gestisci
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-org-overview">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-purple-600" />
              Organigramma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">7</div>
                <div className="text-xs text-muted-foreground">Reparti</div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Manager</span>
                  <span className="font-medium">12</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Team Leader</span>
                  <span className="font-medium">24</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Junior</span>
                  <span className="font-medium">89</span>
                </div>
              </div>
              <Button size="sm" variant="outline" className="w-full" data-testid="hr-button-view-org-chart">
                <Eye className="h-4 w-4 mr-2" />
                Visualizza
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Employee Directory */}
      <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-employee-directory">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Directory Dipendenti
            <Badge variant="outline" className="ml-auto">
              {employeeData.length} dipendenti
            </Badge>
          </CardTitle>
          <CardDescription>Gestione completa profili, ruoli e permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {employeeData.map((employee, index) => (
              <motion.div
                key={employee.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 rounded-lg bg-white/50 hover:bg-white/70 transition-all duration-300 border border-white/20 hover:border-orange-200 hover:shadow-md"
                data-testid={`hr-employee-${employee.id}`}
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-gradient-to-br from-orange-100 to-purple-100 text-gray-700 font-medium">
                      {employee.nome.charAt(0)}{employee.cognome.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-lg">{employee.nome} {employee.cognome}</h3>
                      {employee.stato === 'onboarding' && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          <UserPlus className="h-3 w-3 mr-1" />
                          Onboarding
                        </Badge>
                      )}
                      {employee.stato === 'offboarding' && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                          <LogOut className="h-3 w-3 mr-1" />
                          Uscita
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {employee.ruolo} • {employee.reparto}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {employee.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1">
                        <div className="text-xs text-muted-foreground">Performance:</div>
                        <Progress value={employee.performance} className="w-16 h-1" />
                        <div className="text-xs font-medium">{employee.performance}%</div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Assunto: {format(new Date(2023, 0, 15), 'dd/MM/yyyy')}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <Badge className={getStatusColor(employee.stato) + ' text-white mb-2'}>
                      {employee.stato}
                    </Badge>
                    <p className="text-sm font-medium">€{employee.salario.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Lv. {Math.floor(employee.performance / 20) + 1}</p>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 px-2 hover:bg-blue-50"
                      data-testid={`hr-button-view-employee-${employee.id}`}
                      onClick={() => setEmployeeModal({ open: true, data: employee })}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 px-2 hover:bg-green-50"
                      data-testid={`hr-button-edit-employee-${employee.id}`}
                      onClick={() => setEmployeeModal({ open: true, data: employee })}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 px-2 hover:bg-purple-50"
                      data-testid={`hr-button-permissions-${employee.id}`}
                    >
                      <Shield className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Pagination and Bulk Actions */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/20">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Visualizzati {employeeData.length} di {employeeData.length} dipendenti
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <label className="text-sm text-muted-foreground">Seleziona tutti</label>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" data-testid="hr-button-bulk-edit">
                <Edit3 className="h-4 w-4 mr-2" />
                Modifica Selezionati
              </Button>
              <Button variant="outline" size="sm" data-testid="hr-button-bulk-transfer">
                <ArrowRight className="h-4 w-4 mr-2" />
                Trasferisci
              </Button>
              <Button variant="outline" size="sm" data-testid="hr-button-bulk-export">
                <Download className="h-4 w-4 mr-2" />
                Esporta
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTimeManagement = () => (
    <div className="space-y-6">
      {/* Enhanced Time Management Header */}
      <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-time-management-header">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Advanced Time & Schedule Management
            <Badge variant="outline" className="ml-auto">
              Real-time Monitoring
            </Badge>
          </CardTitle>
          <CardDescription>Scheduling avanzato, time tracking e anomaly detection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
              data-testid="hr-button-schedule-builder"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Builder
            </Button>
            <Button 
              variant="outline" 
              className="hover:bg-green-50 hover:border-green-200"
              data-testid="hr-button-time-tracking"
            >
              <Clock className="h-4 w-4 mr-2" />
              Time Tracking
            </Button>
            <Button 
              variant="outline" 
              className="hover:bg-purple-50 hover:border-purple-200"
              data-testid="hr-button-overtime-management"
            >
              <Timer className="h-4 w-4 mr-2" />
              Overtime Management
            </Button>
            <Button 
              variant="outline" 
              className="hover:bg-orange-50 hover:border-orange-200"
              data-testid="hr-button-schedule-templates"
            >
              <Copy className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <Button 
              variant="outline" 
              className="hover:bg-red-50 hover:border-red-200"
              data-testid="hr-button-anomaly-detection"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Anomaly Detection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Time Tracking Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Live Attendance Status */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-live-attendance">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Live Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">87</div>
                <div className="text-xs text-muted-foreground">Presenti Ora</div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600">Live</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    In Sede
                  </span>
                  <span className="font-medium">64</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Remote
                  </span>
                  <span className="font-medium">23</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    In Pausa
                  </span>
                  <span className="font-medium">8</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    Assenti
                  </span>
                  <span className="font-medium">12</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overtime Monitoring */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-overtime-monitoring">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Timer className="h-5 w-5 text-orange-600" />
              Overtime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">156h</div>
                <div className="text-xs text-muted-foreground">Questa Settimana</div>
                <Progress value={78} className="mt-2" />
                <div className="text-xs text-muted-foreground mt-1">78% del budget</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>Pending Approval</span>
                  <Badge variant="outline" className="text-xs">23h</Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Auto-approved</span>
                  <Badge variant="secondary" className="text-xs">133h</Badge>
                </div>
              </div>
              
              <Button size="sm" variant="outline" className="w-full" data-testid="hr-button-approve-overtime">
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Pending
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Conflicts */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-schedule-conflicts">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Conflicts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">5</div>
                <div className="text-xs text-muted-foreground">Conflicts Detected</div>
              </div>
              
              <div className="space-y-2">
                <Alert className="p-2 border-red-200 bg-red-50">
                  <AlertTriangle className="h-3 w-3 text-red-600" />
                  <AlertDescription className="text-xs text-red-800">
                    Double booking: Marco R. oggi 14:00-18:00
                  </AlertDescription>
                </Alert>
                <Alert className="p-2 border-yellow-200 bg-yellow-50">
                  <Clock className="h-3 w-3 text-yellow-600" />
                  <AlertDescription className="text-xs text-yellow-800">
                    Understaffed: Vendite domani mattina
                  </AlertDescription>
                </Alert>
              </div>
              
              <Button size="sm" variant="destructive" className="w-full" data-testid="hr-button-resolve-conflicts">
                <Settings className="h-4 w-4 mr-2" />
                Resolve All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payroll Integration */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-payroll-integration">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Payroll Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">97%</div>
                <div className="text-xs text-muted-foreground">Sync Accuracy</div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-green-600">Connected</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>Hours Processed</span>
                  <span className="font-medium">2,847h</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Pending Review</span>
                  <Badge variant="outline" className="text-xs">47h</Badge>
                </div>
              </div>
              
              <Button size="sm" variant="outline" className="w-full" data-testid="hr-button-payroll-export">
                <Download className="h-4 w-4 mr-2" />
                Export Payroll
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Shift Scheduling with Drag & Drop Interface */}
      <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-advanced-scheduling">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Advanced Shift Scheduling
            <Badge variant="secondary" className="ml-auto">Drag & Drop</Badge>
          </CardTitle>
          <CardDescription>Schedule builder con conflict detection e template management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Schedule Template Bar */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-sm">Templates:</h4>
              <div className="flex gap-2">
                <Badge variant="outline" className="cursor-pointer hover:bg-blue-50" data-testid="hr-template-standard">
                  Standard Week
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-green-50" data-testid="hr-template-holiday">
                  Holiday Schedule
                </Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-purple-50" data-testid="hr-template-peak">
                  Peak Hours
                </Badge>
                <Button size="sm" variant="ghost" data-testid="hr-button-create-template">
                  <Plus className="h-4 w-4 mr-1" />
                  Create
                </Button>
              </div>
            </div>

            {/* Weekly Schedule Grid */}
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-8 bg-gray-50">
                <div className="p-3 font-medium text-sm border-r">Time</div>
                {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                  <div key={day} className="p-3 font-medium text-sm text-center border-r last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Time Slots */}
              {['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'].map((time, timeIdx) => (
                <div key={time} className="grid grid-cols-8 border-b last:border-b-0">
                  <div className="p-3 text-sm font-medium bg-gray-50 border-r">{time}</div>
                  {Array.from({length: 7}).map((_, dayIdx) => (
                    <div 
                      key={dayIdx} 
                      className="p-2 border-r last:border-r-0 min-h-[60px] relative group hover:bg-blue-50 cursor-pointer transition-colors"
                      data-testid={`hr-schedule-slot-${timeIdx}-${dayIdx}`}
                    >
                      {/* Sample shift assignments */}
                      {(timeIdx === 0 && dayIdx < 5) && (
                        <div className="bg-blue-100 border border-blue-200 rounded p-1 text-xs mb-1 hover:bg-blue-200 transition-colors cursor-move" data-testid="hr-shift-assignment">
                          <div className="font-medium">Marco R.</div>
                          <div className="text-blue-600">8h shift</div>
                        </div>
                      )}
                      {(timeIdx === 2 && dayIdx < 5) && (
                        <div className="bg-green-100 border border-green-200 rounded p-1 text-xs mb-1 hover:bg-green-200 transition-colors cursor-move" data-testid="hr-shift-assignment">
                          <div className="font-medium">Lisa M.</div>
                          <div className="text-green-600">6h shift</div>
                        </div>
                      )}
                      {/* Hover overlay for adding shifts */}
                      <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Plus className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Schedule Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Settimana: 16-22 Settembre 2024
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">127 ore totali</Badge>
                  <Badge variant="outline">5 conflitti risolti</Badge>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" size="sm" data-testid="hr-button-previous-week">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" data-testid="hr-button-next-week">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button size="sm" data-testid="hr-button-save-schedule">
                  <Save className="h-4 w-4 mr-2" />
                  Save Schedule
                </Button>
                <Button variant="outline" size="sm" data-testid="hr-button-publish-schedule">
                  <Send className="h-4 w-4 mr-2" />
                  Publish
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Analytics & Anomaly Detection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Attendance Analytics */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-attendance-analytics">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              Attendance Pattern Analysis
            </CardTitle>
            <CardDescription>Real-time attendance trends e predictive insights</CardDescription>
          </CardHeader>
          <CardContent>
            <AttendanceAnalytics period="month" compact={false} />
            
            {/* Additional Insights */}
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-sm text-green-800 mb-2">Key Insights</h4>
              <div className="space-y-1 text-xs text-green-700">
                <div>• Attendance rate: 94.2% (+2.1% vs last month)</div>
                <div>• Peak attendance: Martedì 10:00-11:00</div>
                <div>• Lowest attendance: Venerdì pomeriggio</div>
                <div>• Predicted sick days this week: 8-12</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Anomaly Detection Dashboard */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-anomaly-detection">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Anomaly Detection
              <Badge variant="destructive" className="ml-auto">3 Alerts</Badge>
            </CardTitle>
            <CardDescription>AI-powered pattern recognition per early warning</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Alert className="border-red-200 bg-red-50" data-testid="hr-anomaly-1">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">Unusual Absence Pattern</AlertTitle>
                <AlertDescription className="text-red-700 text-sm">
                  Marco Rossi: 3 assenze consecutive venerdì (+200% vs baseline)
                  <div className="mt-2">
                    <Button size="sm" variant="outline" className="mr-2" data-testid="hr-button-investigate">
                      <Search className="h-3 w-3 mr-1" />
                      Investigate
                    </Button>
                    <Button size="sm" variant="outline" data-testid="hr-button-dismiss">
                      <X className="h-3 w-3 mr-1" />
                      Dismiss
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
              
              <Alert className="border-yellow-200 bg-yellow-50" data-testid="hr-anomaly-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800">Late Arrivals Spike</AlertTitle>
                <AlertDescription className="text-yellow-700 text-sm">
                  Reparto IT: +45% ritardi questa settimana (possibile traffic issue)
                  <div className="mt-2">
                    <Button size="sm" variant="outline" className="mr-2" data-testid="hr-button-analyze">
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Analyze
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
              
              <Alert className="border-blue-200 bg-blue-50" data-testid="hr-anomaly-3">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Overtime Trend</AlertTitle>
                <AlertDescription className="text-blue-700 text-sm">
                  Vendite: +30% overtime last 2 weeks (Q4 push expected)
                  <div className="mt-2">
                    <Button size="sm" variant="outline" data-testid="hr-button-review">
                      <Eye className="h-3 w-3 mr-1" />
                      Review
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
            
            {/* AI Settings */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">AI Detection Sensitivity</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Low</span>
                  <div className="w-20 h-2 bg-gray-200 rounded-full relative">
                    <div className="w-3/5 h-full bg-orange-500 rounded-full"></div>
                  </div>
                  <span className="text-xs text-muted-foreground">High</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderLeaveManagement = () => (
    <div className="space-y-6">
      {/* Enhanced Leave Management Header */}
      <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-leave-management-header">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-green-600" />
            Advanced Leave Management
            <Badge variant="outline" className="ml-auto">
              {hrMetrics.pendingApprovals} Pending Approvals
            </Badge>
          </CardTitle>
          <CardDescription>Centralized leave approval, balance management e policy configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600"
              data-testid="hr-button-bulk-approval"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Bulk Approval
            </Button>
            <Button 
              variant="outline" 
              className="hover:bg-blue-50 hover:border-blue-200"
              data-testid="hr-button-leave-calendar"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Team Calendar
            </Button>
            <Button 
              variant="outline" 
              className="hover:bg-purple-50 hover:border-purple-200"
              data-testid="hr-button-balance-management"
            >
              <Scale className="h-4 w-4 mr-2" />
              Balance Management
            </Button>
            <Button 
              variant="outline" 
              className="hover:bg-orange-50 hover:border-orange-200"
              data-testid="hr-button-policy-config"
            >
              <Settings className="h-4 w-4 mr-2" />
              Policy Config
            </Button>
            <Button 
              variant="outline" 
              className="hover:bg-red-50 hover:border-red-200"
              data-testid="hr-button-leave-reports"
            >
              <FileText className="h-4 w-4 mr-2" />
              Reports
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leave Balance Management Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Overall Balance Status */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-balance-overview">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-600" />
              Balance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">1,247</div>
                <div className="text-xs text-muted-foreground">Total Days Available</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>Accrued YTD</span>
                  <span className="font-medium text-green-600">+847</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Used YTD</span>
                  <span className="font-medium text-red-600">-542</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Pending</span>
                  <span className="font-medium text-yellow-600">-156</span>
                </div>
                <div className="flex justify-between items-center text-sm border-t pt-2">
                  <span className="font-medium">Available</span>
                  <span className="font-bold text-blue-600">549</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accrual Tracking */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-accrual-tracking">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Accrual Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">2.5</div>
                <div className="text-xs text-muted-foreground">Days/Month Rate</div>
                <Progress value={83} className="mt-2" />
                <div className="text-xs text-muted-foreground mt-1">83% of annual accrual</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>Next Accrual</span>
                  <Badge variant="outline" className="text-xs">Oct 1st</Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Adjustment Needed</span>
                  <Badge variant="secondary" className="text-xs">3 employees</Badge>
                </div>
              </div>
              
              <Button size="sm" variant="outline" className="w-full" data-testid="hr-button-process-accrual">
                <Calculator className="h-4 w-4 mr-2" />
                Process Accrual
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Policy Compliance */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-policy-compliance">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              Policy Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">94%</div>
                <div className="text-xs text-muted-foreground">Compliance Rate</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>Policy Violations</span>
                  <Badge variant="destructive" className="text-xs">7</Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Auto-approved</span>
                  <Badge variant="secondary" className="text-xs">89%</Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Manual Review</span>
                  <Badge variant="outline" className="text-xs">11%</Badge>
                </div>
              </div>
              
              <Button size="sm" variant="outline" className="w-full" data-testid="hr-button-review-violations">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Review Violations
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payroll Integration */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-payroll-sync">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Payroll Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">98%</div>
                <div className="text-xs text-muted-foreground">Sync Accuracy</div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600">Live</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>Last Sync</span>
                  <span className="font-medium">2 mins ago</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>Pending Export</span>
                  <Badge variant="outline" className="text-xs">23 records</Badge>
                </div>
              </div>
              
              <Button size="sm" variant="outline" className="w-full" data-testid="hr-button-export-payroll">
                <Download className="h-4 w-4 mr-2" />
                Export to Payroll
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Centralized Approval Dashboard with Bulk Actions */}
      <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-approval-dashboard">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Centralized Approval Dashboard
            <Badge variant="outline" className="ml-auto">
              {hrMetrics.pendingApprovals} requests
            </Badge>
          </CardTitle>
          <CardDescription>Bulk operations, SLA tracking e workflow automation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Bulk Action Bar */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <input type="checkbox" className="rounded" data-testid="hr-checkbox-select-all" />
                <span className="text-sm font-medium">Select All ({hrMetrics.pendingApprovals} requests)</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="bg-green-600 hover:bg-green-700" data-testid="hr-button-bulk-approve">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Bulk Approve (0)
                </Button>
                <Button size="sm" variant="destructive" data-testid="hr-button-bulk-reject">
                  <XCircle className="h-4 w-4 mr-2" />
                  Bulk Reject (0)
                </Button>
                <Button size="sm" variant="outline" data-testid="hr-button-bulk-defer">
                  <Clock className="h-4 w-4 mr-2" />
                  Defer (0)
                </Button>
              </div>
            </div>

            {/* Enhanced Manager Approval Queue */}
            <ManagerApprovalQueue />
          </div>
        </CardContent>
      </Card>

      {/* Advanced Leave Calendar with Team View */}
      <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-team-leave-calendar">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-blue-600" />
            Team Leave Calendar
            <Badge variant="secondary" className="ml-auto">Conflict Detection</Badge>
          </CardTitle>
          <CardDescription>Advanced calendar con team view, conflict detection e planning tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Calendar Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Select defaultValue="all-teams">
                  <SelectTrigger className="w-48" data-testid="hr-select-team-filter">
                    <SelectValue placeholder="Filter by team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-teams">All Teams</SelectItem>
                    <SelectItem value="it">IT Department</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="month">
                  <SelectTrigger className="w-32" data-testid="hr-select-calendar-view">
                    <SelectValue placeholder="View" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="quarter">Quarter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" data-testid="hr-button-conflict-report">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Conflicts (3)
                </Button>
                <Button variant="outline" size="sm" data-testid="hr-button-coverage-analysis">
                  <Users className="h-4 w-4 mr-2" />
                  Coverage Analysis
                </Button>
                <Button variant="outline" size="sm" data-testid="hr-button-export-calendar">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Integrated Leave Calendar */}
            <LeaveCalendar compact={false} className="border-0 shadow-none bg-transparent" />

            {/* Conflict Detection Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              <Alert className="border-red-200 bg-red-50" data-testid="hr-alert-conflict-1">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">Coverage Conflict</AlertTitle>
                <AlertDescription className="text-red-700 text-sm">
                  IT Team: 15-18 Ottobre, solo 2/8 developers disponibili
                </AlertDescription>
              </Alert>
              <Alert className="border-yellow-200 bg-yellow-50" data-testid="hr-alert-conflict-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800">Overlap Warning</AlertTitle>
                <AlertDescription className="text-yellow-700 text-sm">
                  Marketing: 3 manager in ferie stessa settimana
                </AlertDescription>
              </Alert>
              <Alert className="border-blue-200 bg-blue-50" data-testid="hr-alert-conflict-3">
                <Users className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">Recommended Action</AlertTitle>
                <AlertDescription className="text-blue-700 text-sm">
                  Consider staggering Sales team leaves Q4
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave Policy Configuration */}
      <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-policy-configuration">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-600" />
            Leave Policy Configuration
          </CardTitle>
          <CardDescription>Automated calculations, workflow rules e compliance settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Policy Rules */}
            <div className="space-y-4">
              <h3 className="font-medium">Active Policy Rules</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-green-50 border border-green-200" data-testid="hr-policy-rule-1">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">Annual Leave Accrual</span>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">2.5 days/month, max 30 days carryover</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" data-testid="hr-button-edit-rule">
                      <Edit3 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200" data-testid="hr-policy-rule-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">Sick Leave Policy</span>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">12 days/year, doctor note required &gt;3 days</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" data-testid="hr-button-edit-sick-policy">
                      <Edit3 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg bg-purple-50 border border-purple-200" data-testid="hr-policy-rule-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">Approval Workflow</span>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Auto-approve &lt;5 days, manager approval &gt;5 days</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" data-testid="hr-button-edit-workflow">
                      <Edit3 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Automated Calculations */}
            <div className="space-y-4">
              <h3 className="font-medium">Automated Calculations</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-gray-50 border" data-testid="hr-calc-engine">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4 text-gray-600" />
                    <span className="font-medium text-sm">Calculation Engine</span>
                    <Badge variant="outline" className="ml-auto">Running</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Last Run:</span>
                      <div className="font-medium">Today 00:30</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Next Run:</span>
                      <div className="font-medium">Tomorrow 00:30</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Records Processed:</span>
                      <div className="font-medium">127 employees</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Errors:</span>
                      <div className="font-medium text-red-600">2 conflicts</div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" data-testid="hr-button-run-calculation">
                    <Play className="h-4 w-4 mr-2" />
                    Run Manual Calculation
                  </Button>
                  <Button variant="outline" className="w-full justify-start" data-testid="hr-button-view-calculation-log">
                    <FileText className="h-4 w-4 mr-2" />
                    View Calculation Log
                  </Button>
                  <Button variant="outline" className="w-full justify-start" data-testid="hr-button-policy-wizard">
                    <Wand2 className="h-4 w-4 mr-2" />
                    Policy Setup Wizard
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comprehensive Leave Analytics & Reporting Suite */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Leave Analytics */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-leave-analytics-enhanced">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              Advanced Leave Analytics
            </CardTitle>
            <CardDescription>Comprehensive trends, predictions e compliance reporting</CardDescription>
          </CardHeader>
          <CardContent>
            <LeaveAnalytics period="year" compact={false} />
            
            {/* Additional Analytics Insights */}
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-sm text-green-800 mb-2">Predictive Insights</h4>
              <div className="space-y-1 text-xs text-green-700">
                <div>• Peak leave period: 15-31 Agosto (67% team off)</div>
                <div>• Projected Q4 usage: 89% of available balance</div>
                <div>• Sick leave trend: +15% vs last year</div>
                <div>• Recommended policy adjustment: Increase accrual rate</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance & Reporting Suite */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-compliance-reporting">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Compliance & Reporting Suite
            </CardTitle>
            <CardDescription>Automated reports, audit trails e regulatory compliance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Compliance Status */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-blue-800">Compliance Status</span>
                  <Badge className="bg-blue-600 text-white">97% Compliant</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs text-blue-700">
                  <div>
                    <span>GDPR Compliance:</span>
                    <div className="font-medium">✓ Compliant</div>
                  </div>
                  <div>
                    <span>Labor Law:</span>
                    <div className="font-medium">✓ Compliant</div>
                  </div>
                  <div>
                    <span>Internal Audit:</span>
                    <div className="font-medium">⚠ 3 minor issues</div>
                  </div>
                  <div>
                    <span>External Audit:</span>
                    <div className="font-medium">✓ Ready</div>
                  </div>
                </div>
              </div>
              
              {/* Report Generation */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Generate Reports</h4>
                <div className="grid grid-cols-1 gap-2">
                  <Button variant="outline" className="justify-start text-xs h-8" data-testid="hr-button-monthly-report">
                    <Calendar className="h-3 w-3 mr-2" />
                    Monthly Leave Report
                  </Button>
                  <Button variant="outline" className="justify-start text-xs h-8" data-testid="hr-button-compliance-report">
                    <Shield className="h-3 w-3 mr-2" />
                    Compliance Report
                  </Button>
                  <Button variant="outline" className="justify-start text-xs h-8" data-testid="hr-button-usage-forecast">
                    <TrendingUp className="h-3 w-3 mr-2" />
                    Usage Forecast
                  </Button>
                  <Button variant="outline" className="justify-start text-xs h-8" data-testid="hr-button-audit-trail">
                    <Search className="h-3 w-3 mr-2" />
                    Audit Trail Report
                  </Button>
                </div>
              </div>
              
              {/* Automated Reporting */}
              <div className="p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">Automated Reports</span>
                  <Badge variant="outline">5 Active</Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>• Weekly manager summary (Fridays)</div>
                  <div>• Monthly compliance report (1st of month)</div>
                  <div>• Quarterly forecast (Q-end)</div>
                </div>
                <Button size="sm" variant="outline" className="w-full mt-2" data-testid="hr-button-manage-auto-reports">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Auto Reports
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderDocuments = () => {
    // Mock data for enhanced documents management
    const documentMetrics = {
      totalDocuments: 3847,
      expiringSoon: 23,
      pendingApproval: 12,
      templatesAvailable: 15,
      complianceRate: 94.7,
      storageUsed: 78.3,
      digitalSignatures: 156,
      activeWorkflows: 8
    };

    const documentCategories = [
      { id: 'contracts', name: 'Contratti', count: 847, expiring: 5, icon: FileSignature, color: 'blue' },
      { id: 'policies', name: 'Policy', count: 156, expiring: 2, icon: BookOpen, color: 'green' },
      { id: 'certifications', name: 'Certificazioni', count: 234, expiring: 8, icon: Award, color: 'purple' },
      { id: 'employee-docs', name: 'Documenti Personale', count: 2156, expiring: 6, icon: Users, color: 'orange' },
      { id: 'legal', name: 'Legali', count: 298, expiring: 1, icon: Scale, color: 'red' },
      { id: 'compliance', name: 'Compliance', count: 156, expiring: 1, icon: ShieldCheck, color: 'indigo' }
    ];

    const templates = [
      { id: 'contract-std', name: 'Contratto Standard', category: 'Contratti', usage: 245, lastModified: '2024-12-15' },
      { id: 'nda', name: 'Accordo Riservatezza', category: 'Legali', usage: 89, lastModified: '2024-12-10' },
      { id: 'policy-template', name: 'Template Policy', category: 'Policy', usage: 156, lastModified: '2024-12-08' },
      { id: 'performance-review', name: 'Valutazione Performance', category: 'HR', usage: 78, lastModified: '2024-12-05' }
    ];

    const recentDocuments = [
      { id: 'doc-001', name: 'Contratto Marco Rossi.pdf', type: 'Contract', size: '2.4 MB', modified: '2024-12-18', status: 'signed', author: 'HR Admin' },
      { id: 'doc-002', name: 'Policy Sicurezza 2024.docx', type: 'Policy', size: '1.8 MB', modified: '2024-12-17', status: 'approved', author: 'Safety Manager' },
      { id: 'doc-003', name: 'Certificazione ISO 9001.pdf', type: 'Certification', size: '3.2 MB', modified: '2024-12-16', status: 'pending', author: 'Quality Manager' }
    ];

    return (
      <div className="space-y-6">
        {/* PHASE 2.5: Enhanced Documents Management with Sub-Tabs */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-documents-enterprise">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Enterprise Document Repository
              <Badge variant="outline" className="ml-auto">
                {documentMetrics.totalDocuments.toLocaleString()} documenti
              </Badge>
            </CardTitle>
            <CardDescription>Document management avanzato con version control, audit trail e workflow automation</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Sub-Tab Structure per PHASE 2.5 */}
            <Tabs defaultValue="repository" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="repository" data-testid="hr-tab-repository">
                  <Folder className="h-4 w-4 mr-2" />
                  Repository
                </TabsTrigger>
                <TabsTrigger value="compliance" data-testid="hr-tab-compliance">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Compliance
                </TabsTrigger>
                <TabsTrigger value="templates" data-testid="hr-tab-templates">
                  <Layers className="h-4 w-4 mr-2" />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="workflows" data-testid="hr-tab-workflows">
                  <Workflow className="h-4 w-4 mr-2" />
                  Workflows
                </TabsTrigger>
                <TabsTrigger value="audit" data-testid="hr-tab-audit">
                  <History className="h-4 w-4 mr-2" />
                  Audit Trail
                </TabsTrigger>
              </TabsList>

              {/* Repository Tab - Enterprise Document Repository */}
              <TabsContent value="repository" className="space-y-6">
                {/* Enhanced Repository Metrics Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200"
                    data-testid="hr-metric-total-docs"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900">Documenti Totali</p>
                        <p className="text-2xl font-bold text-blue-700">{documentMetrics.totalDocuments.toLocaleString()}</p>
                      </div>
                      <Database className="h-8 w-8 text-blue-600" />
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200"
                    data-testid="hr-metric-expiring"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-900">In Scadenza</p>
                        <p className="text-2xl font-bold text-orange-700">{documentMetrics.expiringSoon}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-orange-600" />
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border border-green-200"
                    data-testid="hr-metric-compliance"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-900">Compliance Rate</p>
                        <p className="text-2xl font-bold text-green-700">{documentMetrics.complianceRate}%</p>
                      </div>
                      <ShieldCheck className="h-8 w-8 text-green-600" />
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200"
                    data-testid="hr-metric-storage"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-900">Storage Utilizzato</p>
                        <p className="text-2xl font-bold text-purple-700">{documentMetrics.storageUsed}%</p>
                      </div>
                      <HardDrive className="h-8 w-8 text-purple-600" />
                    </div>
                  </motion.div>
                </div>

                {/* Advanced Search and Filters */}
                <Card className="border-gray-200" data-testid="hr-card-document-search">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Search className="h-5 w-5 text-gray-600" />
                      Advanced Search & Metadata Filtering
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                      <div className="lg:col-span-2">
                        <Label htmlFor="search-documents">Search Documents</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="search-documents"
                            placeholder="Search by name, content, metadata..."
                            className="pl-10"
                            data-testid="hr-input-search-documents"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="filter-category">Category</Label>
                        <Select data-testid="hr-select-category-filter">
                          <SelectTrigger>
                            <SelectValue placeholder="All categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="contracts">Contratti</SelectItem>
                            <SelectItem value="policies">Policy</SelectItem>
                            <SelectItem value="certifications">Certificazioni</SelectItem>
                            <SelectItem value="employee-docs">Documenti Personale</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="filter-status">Status</Label>
                        <Select data-testid="hr-select-status-filter">
                          <SelectTrigger>
                            <SelectValue placeholder="All status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="signed">Signed</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Advanced Metadata Tags */}
                    <div className="mt-4">
                      <Label className="text-sm">Quick Filters (Tags)</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="cursor-pointer hover:bg-blue-50" data-testid="hr-tag-urgent">
                          <Tags className="h-3 w-3 mr-1" />
                          Urgent
                        </Badge>
                        <Badge variant="outline" className="cursor-pointer hover:bg-green-50" data-testid="hr-tag-signed">
                          <FileSignature className="h-3 w-3 mr-1" />
                          Signed
                        </Badge>
                        <Badge variant="outline" className="cursor-pointer hover:bg-orange-50" data-testid="hr-tag-expiring">
                          <Clock className="h-3 w-3 mr-1" />
                          Expiring Soon
                        </Badge>
                        <Badge variant="outline" className="cursor-pointer hover:bg-purple-50" data-testid="hr-tag-confidential">
                          <Lock className="h-3 w-3 mr-1" />
                          Confidential
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Document Categories Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documentCategories.map((category) => {
                    const IconComponent = category.icon;
                    return (
                      <motion.div
                        key={category.id}
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="cursor-pointer"
                        data-testid={`hr-category-${category.id}`}
                      >
                        <Card className="h-full hover:shadow-lg transition-all duration-300 border-gray-200 hover:border-blue-300">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-${category.color}-100`}>
                                  <IconComponent className={`h-6 w-6 text-${category.color}-600`} />
                                </div>
                                <div>
                                  <h3 className="font-medium">{category.name}</h3>
                                  <p className="text-sm text-muted-foreground">{category.count} documenti</p>
                                </div>
                              </div>
                              {category.expiring > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {category.expiring} scadono
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex justify-between items-center">
                              <Button variant="outline" size="sm" data-testid={`hr-button-view-${category.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizza
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`hr-button-manage-${category.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Recent Documents with Version Control */}
                <Card className="border-gray-200" data-testid="hr-card-recent-documents">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-gray-600" />
                        Documenti Recenti
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" data-testid="hr-button-upload-document">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </Button>
                        <Button variant="outline" size="sm" data-testid="hr-button-bulk-operations">
                          <CheckSquare className="h-4 w-4 mr-2" />
                          Bulk Actions
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentDocuments.map((doc, index) => (
                        <motion.div
                          key={doc.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                          data-testid={`hr-document-${doc.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100">
                              {doc.name.endsWith('.pdf') ? (
                                <FilePdf className="h-5 w-5 text-red-600" />
                              ) : (
                                <FileText className="h-5 w-5 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-medium">{doc.name}</h4>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>{doc.type}</span>
                                <span>{doc.size}</span>
                                <span>Modified: {doc.modified}</span>
                                <span>by {doc.author}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <Badge 
                              className={
                                doc.status === 'signed' ? 'bg-green-100 text-green-700' :
                                doc.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                'bg-yellow-100 text-yellow-700'
                              }
                            >
                              {doc.status}
                            </Badge>
                            
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" data-testid={`hr-button-view-${doc.id}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`hr-button-version-${doc.id}`}>
                                <GitBranch className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`hr-button-download-${doc.id}`}>
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`hr-button-share-${doc.id}`}>
                                <Share2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Compliance Tab - Automated Compliance Monitoring */}
              <TabsContent value="compliance" className="space-y-6">
                {/* Compliance Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Compliance Overview */}
                  <Card className="lg:col-span-2 border-gray-200" data-testid="hr-card-compliance-overview">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                        Compliance Monitoring Dashboard
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Compliance Metrics */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                            <div className="text-2xl font-bold text-green-700">94.7%</div>
                            <div className="text-sm text-green-600">Overall Compliance</div>
                            <Progress value={94.7} className="mt-2 h-2" />
                          </div>
                          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                            <div className="text-2xl font-bold text-blue-700">97.2%</div>
                            <div className="text-sm text-blue-600">Documentation Rate</div>
                            <Progress value={97.2} className="mt-2 h-2" />
                          </div>
                        </div>

                        {/* Compliance Categories */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 rounded-lg bg-white border">
                            <div className="flex items-center gap-3">
                              <Shield className="h-5 w-5 text-green-600" />
                              <div>
                                <div className="font-medium">GDPR Compliance</div>
                                <div className="text-sm text-muted-foreground">Data protection compliance</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-green-100 text-green-700">98.5%</Badge>
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            </div>
                          </div>

                          <div className="flex justify-between items-center p-3 rounded-lg bg-white border">
                            <div className="flex items-center gap-3">
                              <FileCheck className="h-5 w-5 text-blue-600" />
                              <div>
                                <div className="font-medium">Document Retention</div>
                                <div className="text-sm text-muted-foreground">Legal retention periods</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-100 text-blue-700">96.3%</Badge>
                              <CheckCircle className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>

                          <div className="flex justify-between items-center p-3 rounded-lg bg-white border">
                            <div className="flex items-center gap-3">
                              <Award className="h-5 w-5 text-yellow-600" />
                              <div>
                                <div className="font-medium">Certification Tracking</div>
                                <div className="text-sm text-muted-foreground">Professional certifications</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-yellow-100 text-yellow-700">89.7%</Badge>
                              <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Expiry Alerts */}
                  <Card className="border-gray-200" data-testid="hr-card-expiry-alerts">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        Expiry Alerts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <Alert className="border-red-200 bg-red-50">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <AlertTitle className="text-red-800">Urgent</AlertTitle>
                          <AlertDescription className="text-red-700 text-sm">
                            5 contratti scadono questa settimana
                          </AlertDescription>
                        </Alert>

                        <Alert className="border-yellow-200 bg-yellow-50">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          <AlertTitle className="text-yellow-800">Upcoming</AlertTitle>
                          <AlertDescription className="text-yellow-700 text-sm">
                            18 documenti scadono nei prossimi 30 giorni
                          </AlertDescription>
                        </Alert>

                        <Alert className="border-blue-200 bg-blue-50">
                          <Info className="h-4 w-4 text-blue-600" />
                          <AlertTitle className="text-blue-800">Info</AlertTitle>
                          <AlertDescription className="text-blue-700 text-sm">
                            Automated renewal configurato per 12 documenti
                          </AlertDescription>
                        </Alert>

                        <Button variant="outline" className="w-full" data-testid="hr-button-renewal-workflows">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Configure Auto-Renewal
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Enhanced Compliance Dashboard Integration */}
                <Card className="border-gray-200" data-testid="hr-card-compliance-dashboard-detailed">
                  <CardHeader>
                    <CardTitle>Detailed Compliance Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ComplianceDashboard showDetails={true} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Templates Tab - Document Templates with Bulk Generation */}
              <TabsContent value="templates" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Template Library */}
                  <Card className="border-gray-200" data-testid="hr-card-template-library">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="h-5 w-5 text-purple-600" />
                          Template Library
                        </div>
                        <Badge variant="outline">{documentMetrics.templatesAvailable} templates</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {templates.map((template, index) => (
                          <motion.div
                            key={template.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between p-3 rounded-lg bg-white border hover:border-purple-200 hover:bg-purple-50 transition-all"
                            data-testid={`hr-template-${template.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-purple-100">
                                <BookOpen className="h-5 w-5 text-purple-600" />
                              </div>
                              <div>
                                <div className="font-medium">{template.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {template.category} • Used {template.usage} times
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Last modified: {template.lastModified}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" data-testid={`hr-button-use-template-${template.id}`}>
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`hr-button-edit-template-${template.id}`}>
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      
                      <div className="mt-4 flex gap-2">
                        <Button className="flex-1" data-testid="hr-button-create-template">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Template
                        </Button>
                        <Button variant="outline" data-testid="hr-button-import-template">
                          <Upload className="h-4 w-4 mr-2" />
                          Import
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Bulk Generation */}
                  <Card className="border-gray-200" data-testid="hr-card-bulk-generation">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Copy className="h-5 w-5 text-green-600" />
                        Bulk Document Generation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="bulk-template">Select Template</Label>
                          <Select data-testid="hr-select-bulk-template">
                            <SelectTrigger>
                              <SelectValue placeholder="Choose template..." />
                            </SelectTrigger>
                            <SelectContent>
                              {templates.map(template => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="target-employees">Target Employees</Label>
                          <Select data-testid="hr-select-target-employees">
                            <SelectTrigger>
                              <SelectValue placeholder="Select employees..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Employees</SelectItem>
                              <SelectItem value="department">By Department</SelectItem>
                              <SelectItem value="role">By Role</SelectItem>
                              <SelectItem value="custom">Custom Selection</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="generation-options">Options</Label>
                          <div className="space-y-2 mt-2">
                            <div className="flex items-center space-x-2">
                              <input type="checkbox" id="auto-sign" className="rounded" />
                              <Label htmlFor="auto-sign" className="text-sm">Auto-sign documents</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input type="checkbox" id="send-notification" className="rounded" />
                              <Label htmlFor="send-notification" className="text-sm">Send notification to employees</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input type="checkbox" id="track-delivery" className="rounded" />
                              <Label htmlFor="track-delivery" className="text-sm">Track delivery status</Label>
                            </div>
                          </div>
                        </div>

                        <Button className="w-full" data-testid="hr-button-generate-bulk">
                          <Zap className="h-4 w-4 mr-2" />
                          Generate Documents
                        </Button>

                        <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="text-sm text-green-800">
                            <div className="font-medium">Last Bulk Generation</div>
                            <div>47 contratti generati per nuovi assunti</div>
                            <div className="text-xs text-green-600 mt-1">Completed: 2024-12-15 14:23</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Workflows Tab - Digital Signature & Approval Workflows */}
              <TabsContent value="workflows" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Active Workflows */}
                  <Card className="border-gray-200" data-testid="hr-card-active-workflows">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Workflow className="h-5 w-5 text-blue-600" />
                        Active Approval Workflows
                        <Badge variant="outline" className="ml-auto">{documentMetrics.activeWorkflows} active</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100">
                              <FileSignature className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium">Contract Approval</div>
                              <div className="text-sm text-muted-foreground">HR → Legal → CEO</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-100 text-blue-700">3 pending</Badge>
                            <Button variant="ghost" size="sm" data-testid="hr-button-workflow-contract">
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100">
                              <BookOpen className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <div className="font-medium">Policy Review</div>
                              <div className="text-sm text-muted-foreground">Manager → HR → Compliance</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-700">1 pending</Badge>
                            <Button variant="ghost" size="sm" data-testid="hr-button-workflow-policy">
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-200">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-100">
                              <Award className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <div className="font-medium">Certification Upload</div>
                              <div className="text-sm text-muted-foreground">Employee → HR → Manager</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-purple-100 text-purple-700">4 pending</Badge>
                            <Button variant="ghost" size="sm" data-testid="hr-button-workflow-certification">
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <Button variant="outline" className="w-full mt-4" data-testid="hr-button-create-workflow">
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Workflow
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Digital Signatures */}
                  <Card className="border-gray-200" data-testid="hr-card-digital-signatures">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Signature className="h-5 w-5 text-purple-600" />
                        Digital Signature Workflows
                        <Badge variant="outline" className="ml-auto">{documentMetrics.digitalSignatures} signatures</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                            <div className="text-2xl font-bold text-green-700">142</div>
                            <div className="text-sm text-green-600">Signed This Month</div>
                          </div>
                          <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                            <div className="text-2xl font-bold text-orange-700">14</div>
                            <div className="text-sm text-orange-600">Pending Signatures</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Signature Providers</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 rounded-lg bg-white border">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm">DocuSign</span>
                              </div>
                              <Badge variant="secondary" className="text-xs">Connected</Badge>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-white border">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-sm">Adobe Sign</span>
                              </div>
                              <Badge variant="secondary" className="text-xs">Connected</Badge>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-white border">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                <span className="text-sm">HelloSign</span>
                              </div>
                              <Badge variant="outline" className="text-xs">Inactive</Badge>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Button variant="outline" className="w-full justify-start" data-testid="hr-button-configure-signatures">
                            <Settings className="h-4 w-4 mr-2" />
                            Configure Signature Settings
                          </Button>
                          <Button variant="outline" className="w-full justify-start" data-testid="hr-button-legal-compliance">
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Legal Compliance Check
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Audit Trail Tab - Comprehensive Audit Trail */}
              <TabsContent value="audit" className="space-y-6">
                <Card className="border-gray-200" data-testid="hr-card-audit-trail">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5 text-gray-600" />
                      Comprehensive Audit Trail
                    </CardTitle>
                    <CardDescription>Complete activity log with version control and compliance tracking</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Audit Filters */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Date Range</Label>
                          <Select data-testid="hr-select-audit-date">
                            <SelectTrigger>
                              <SelectValue placeholder="Last 30 days" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="7d">Last 7 days</SelectItem>
                              <SelectItem value="30d">Last 30 days</SelectItem>
                              <SelectItem value="90d">Last 90 days</SelectItem>
                              <SelectItem value="custom">Custom range</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Action Type</Label>
                          <Select data-testid="hr-select-audit-action">
                            <SelectTrigger>
                              <SelectValue placeholder="All actions" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Actions</SelectItem>
                              <SelectItem value="create">Document Created</SelectItem>
                              <SelectItem value="edit">Document Edited</SelectItem>
                              <SelectItem value="approve">Document Approved</SelectItem>
                              <SelectItem value="sign">Document Signed</SelectItem>
                              <SelectItem value="delete">Document Deleted</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>User</Label>
                          <Select data-testid="hr-select-audit-user">
                            <SelectTrigger>
                              <SelectValue placeholder="All users" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Users</SelectItem>
                              <SelectItem value="hr-admin">HR Admin</SelectItem>
                              <SelectItem value="legal-team">Legal Team</SelectItem>
                              <SelectItem value="managers">Managers</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Document Type</Label>
                          <Select data-testid="hr-select-audit-document-type">
                            <SelectTrigger>
                              <SelectValue placeholder="All types" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Types</SelectItem>
                              <SelectItem value="contracts">Contracts</SelectItem>
                              <SelectItem value="policies">Policies</SelectItem>
                              <SelectItem value="certifications">Certifications</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Audit Log Entries */}
                      <div className="space-y-3">
                        {[
                          {
                            id: 'audit-001',
                            timestamp: '2024-12-18 15:23:47',
                            user: 'HR Admin',
                            action: 'Document Approved',
                            document: 'Contratto Marco Rossi.pdf',
                            details: 'Contract approved by HR Manager',
                            type: 'approve'
                          },
                          {
                            id: 'audit-002',
                            timestamp: '2024-12-18 14:45:12',
                            user: 'Legal Team',
                            action: 'Version Updated',
                            document: 'Policy Sicurezza 2024.docx',
                            details: 'Version 2.1 uploaded with compliance updates',
                            type: 'edit'
                          },
                          {
                            id: 'audit-003',
                            timestamp: '2024-12-18 13:12:33',
                            user: 'Marco Rossi',
                            action: 'Document Signed',
                            document: 'NDA Agreement.pdf',
                            details: 'Digital signature applied via DocuSign',
                            type: 'sign'
                          },
                          {
                            id: 'audit-004',
                            timestamp: '2024-12-18 11:56:21',
                            user: 'Quality Manager',
                            action: 'Document Created',
                            document: 'Certificazione ISO 9001.pdf',
                            details: 'New certification document uploaded',
                            type: 'create'
                          }
                        ].map((entry, index) => (
                          <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between p-4 rounded-lg bg-white border hover:border-gray-300 transition-colors"
                            data-testid={`hr-audit-${entry.id}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-lg ${
                                entry.type === 'approve' ? 'bg-green-100' :
                                entry.type === 'edit' ? 'bg-blue-100' :
                                entry.type === 'sign' ? 'bg-purple-100' :
                                'bg-gray-100'
                              }`}>
                                {entry.type === 'approve' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                                 entry.type === 'edit' ? <Edit3 className="h-5 w-5 text-blue-600" /> :
                                 entry.type === 'sign' ? <Signature className="h-5 w-5 text-purple-600" /> :
                                 <Plus className="h-5 w-5 text-gray-600" />}
                              </div>
                              
                              <div>
                                <div className="font-medium">{entry.action}</div>
                                <div className="text-sm text-muted-foreground">{entry.document}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {entry.timestamp} • by {entry.user}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-sm text-muted-foreground">{entry.details}</div>
                              </div>
                              
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" data-testid={`hr-button-view-audit-${entry.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" data-testid={`hr-button-export-audit-${entry.id}`}>
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Audit Actions */}
                      <div className="flex justify-between items-center pt-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          Showing 4 of 1,247 audit entries
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" data-testid="hr-button-export-audit-log">
                            <Download className="h-4 w-4 mr-2" />
                            Export Audit Log
                          </Button>
                          <Button variant="outline" size="sm" data-testid="hr-button-compliance-report">
                            <FileCheck className="h-4 w-4 mr-2" />
                            Compliance Report
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* External Storage Integration */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-external-storage">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-blue-600" />
              External Storage Integration
              <Badge variant="outline" className="ml-auto">3 providers connected</Badge>
            </CardTitle>
            <CardDescription>SharePoint, Google Drive, S3 integration con sync automatico</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 rounded-lg bg-blue-50 border border-blue-200 cursor-pointer"
                data-testid="hr-storage-sharepoint"
              >
                <div className="flex items-center justify-between mb-3">
                  <Server className="h-8 w-8 text-blue-600" />
                  <Badge className="bg-green-100 text-green-700">Connected</Badge>
                </div>
                <h3 className="font-medium">SharePoint</h3>
                <p className="text-sm text-muted-foreground mt-1">2,147 documenti sincronizzati</p>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" data-testid="hr-button-sync-sharepoint">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Sync
                  </Button>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 rounded-lg bg-green-50 border border-green-200 cursor-pointer"
                data-testid="hr-storage-googledrive"
              >
                <div className="flex items-center justify-between mb-3">
                  <Cloud className="h-8 w-8 text-green-600" />
                  <Badge className="bg-green-100 text-green-700">Connected</Badge>
                </div>
                <h3 className="font-medium">Google Drive</h3>
                <p className="text-sm text-muted-foreground mt-1">892 documenti sincronizzati</p>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" data-testid="hr-button-sync-googledrive">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Sync
                  </Button>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 rounded-lg bg-orange-50 border border-orange-200 cursor-pointer"
                data-testid="hr-storage-s3"
              >
                <div className="flex items-center justify-between mb-3">
                  <HardDrive className="h-8 w-8 text-orange-600" />
                  <Badge className="bg-green-100 text-green-700">Connected</Badge>
                </div>
                <h3 className="font-medium">Amazon S3</h3>
                <p className="text-sm text-muted-foreground mt-1">808 documenti sincronizzati</p>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" data-testid="hr-button-sync-s3">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Sync
                  </Button>
                </div>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderPerformance = () => {
    // Mock data for enhanced performance management
    const performanceMetrics = {
      totalGoals: 1247,
      activeReviews: 89,
      completedReviews: 156,
      overallRating: 4.2,
      improvementPlans: 23,
      calibrationSessions: 8,
      feedbackSubmissions: 342,
      developmentPlans: 67
    };

    const reviewCycles = [
      { id: 'q4-2024', name: 'Q4 2024 Performance Review', progress: 67, total: 127, status: 'active', deadline: '2024-12-31' },
      { id: 'mid-year', name: 'Mid-Year Check-in', progress: 89, total: 127, status: 'completed', deadline: '2024-06-30' },
      { id: '360-feedback', name: '360° Leadership Feedback', progress: 45, total: 25, status: 'active', deadline: '2024-12-20' },
      { id: 'q1-planning', name: 'Q1 2025 Goal Setting', progress: 12, total: 127, status: 'upcoming', deadline: '2025-01-15' }
    ];

    const goalCategories = [
      { id: 'strategic', name: 'Strategic Goals', count: 45, achieved: 32, icon: Target, color: 'blue' },
      { id: 'operational', name: 'Operational Goals', count: 234, achieved: 189, icon: Activity, color: 'green' },
      { id: 'development', name: 'Development Goals', count: 567, achieved: 423, icon: TrendingUp, color: 'purple' },
      { id: 'team', name: 'Team Goals', count: 401, achieved: 298, icon: Users, color: 'orange' }
    ];

    const departmentPerformance = [
      { department: 'Engineering', rating: 4.5, goals: 342, completed: 298, trend: 'up' },
      { department: 'Sales', rating: 4.2, goals: 189, completed: 167, trend: 'up' },
      { department: 'Marketing', rating: 3.9, goals: 156, completed: 134, trend: 'stable' },
      { department: 'HR', rating: 4.3, goals: 89, completed: 78, trend: 'up' },
      { department: 'Finance', rating: 4.1, goals: 67, completed: 59, trend: 'down' }
    ];

    const upcomingCalibrations = [
      { id: 'eng-cal', department: 'Engineering', date: '2024-12-20', participants: 8, status: 'scheduled' },
      { id: 'sales-cal', department: 'Sales', date: '2024-12-22', participants: 6, status: 'scheduled' },
      { id: 'cross-dep', department: 'Cross-Department', date: '2024-12-25', participants: 12, status: 'pending' }
    ];

    return (
      <div className="space-y-6">
        {/* PHASE 2.6: Enhanced Performance Management with Sub-Tabs */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-performance-enterprise">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-red-600" />
              Performance Management Orchestration Center
              <Badge variant="outline" className="ml-auto">
                {performanceMetrics.totalGoals.toLocaleString()} obiettivi attivi
              </Badge>
            </CardTitle>
            <CardDescription>Company-wide performance orchestration con automated cycles, goal cascade management e predictive analytics</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Sub-Tab Structure per PHASE 2.6 */}
            <Tabs defaultValue="orchestration" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="orchestration" data-testid="hr-tab-orchestration">
                  <Target className="h-4 w-4 mr-2" />
                  Orchestration
                </TabsTrigger>
                <TabsTrigger value="goals" data-testid="hr-tab-goals">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Goals
                </TabsTrigger>
                <TabsTrigger value="analytics" data-testid="hr-tab-analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="calibration" data-testid="hr-tab-calibration">
                  <Users className="h-4 w-4 mr-2" />
                  Calibration
                </TabsTrigger>
                <TabsTrigger value="development" data-testid="hr-tab-development">
                  <Star className="h-4 w-4 mr-2" />
                  Development
                </TabsTrigger>
              </TabsList>

              {/* Orchestration Tab - Company-wide Performance Review Orchestration */}
              <TabsContent value="orchestration" className="space-y-6">
                {/* Enhanced Performance Metrics Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-lg bg-gradient-to-br from-red-50 to-red-100 border border-red-200"
                    data-testid="hr-metric-active-reviews"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-900">Active Reviews</p>
                        <p className="text-2xl font-bold text-red-700">{performanceMetrics.activeReviews}</p>
                      </div>
                      <Target className="h-8 w-8 text-red-600" />
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border border-green-200"
                    data-testid="hr-metric-completed-reviews"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-900">Completed Reviews</p>
                        <p className="text-2xl font-bold text-green-700">{performanceMetrics.completedReviews}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200"
                    data-testid="hr-metric-overall-rating"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900">Overall Rating</p>
                        <p className="text-2xl font-bold text-blue-700">{performanceMetrics.overallRating}/5.0</p>
                      </div>
                      <Star className="h-8 w-8 text-blue-600" />
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200"
                    data-testid="hr-metric-feedback-submissions"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-900">360° Feedback</p>
                        <p className="text-2xl font-bold text-purple-700">{performanceMetrics.feedbackSubmissions}</p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-purple-600" />
                    </div>
                  </motion.div>
                </div>

                {/* Active Review Cycles Management */}
                <Card className="border-gray-200" data-testid="hr-card-review-cycles">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5 text-gray-600" />
                        Review Cycles Orchestration
                      </div>
                      <Button size="sm" data-testid="hr-button-create-cycle">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Cycle
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {reviewCycles.map((cycle, index) => (
                        <motion.div
                          key={cycle.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`p-4 rounded-lg border ${
                            cycle.status === 'active' ? 'bg-blue-50 border-blue-200' :
                            cycle.status === 'completed' ? 'bg-green-50 border-green-200' :
                            'bg-gray-50 border-gray-200'
                          }`}
                          data-testid={`hr-cycle-${cycle.id}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-medium">{cycle.name}</h4>
                              <p className="text-sm text-muted-foreground">Deadline: {cycle.deadline}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={
                                cycle.status === 'active' ? 'bg-blue-100 text-blue-700' :
                                cycle.status === 'completed' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'
                              }>
                                {cycle.status}
                              </Badge>
                              <Button variant="ghost" size="sm" data-testid={`hr-button-cycle-settings-${cycle.id}`}>
                                <Settings className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>{cycle.progress}/{cycle.total} completed</span>
                            </div>
                            <Progress value={(cycle.progress / cycle.total) * 100} className="h-2" />
                          </div>
                          
                          <div className="flex gap-2 mt-3">
                            <Button variant="outline" size="sm" data-testid={`hr-button-manage-${cycle.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              Manage
                            </Button>
                            <Button variant="outline" size="sm" data-testid={`hr-button-notifications-${cycle.id}`}>
                              <Bell className="h-4 w-4 mr-1" />
                              Notifications
                            </Button>
                            <Button variant="outline" size="sm" data-testid={`hr-button-automate-${cycle.id}`}>
                              <Zap className="h-4 w-4 mr-1" />
                              Automate
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* 360-Degree Feedback Coordination */}
                <Card className="border-gray-200" data-testid="hr-card-360-feedback">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-purple-600" />
                      360° Feedback Coordination
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-medium">Anonymous Feedback System</h4>
                        <div className="space-y-3">
                          <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium text-sm">Leadership Feedback</span>
                              <Badge className="bg-purple-100 text-purple-700">12/25 submitted</Badge>
                            </div>
                            <Progress value={48} className="h-2" />
                          </div>
                          
                          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium text-sm">Peer Reviews</span>
                              <Badge className="bg-blue-100 text-blue-700">89/127 submitted</Badge>
                            </div>
                            <Progress value={70} className="h-2" />
                          </div>
                          
                          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium text-sm">Direct Report Feedback</span>
                              <Badge className="bg-green-100 text-green-700">67/89 submitted</Badge>
                            </div>
                            <Progress value={75} className="h-2" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-medium">Feedback Management</h4>
                        <div className="space-y-2">
                          <Button variant="outline" className="w-full justify-start" data-testid="hr-button-send-reminders">
                            <Bell className="h-4 w-4 mr-2" />
                            Send Reminders
                          </Button>
                          <Button variant="outline" className="w-full justify-start" data-testid="hr-button-feedback-analytics">
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Feedback Analytics
                          </Button>
                          <Button variant="outline" className="w-full justify-start" data-testid="hr-button-anonymity-check">
                            <Shield className="h-4 w-4 mr-2" />
                            Anonymity Check
                          </Button>
                          <Button variant="outline" className="w-full justify-start" data-testid="hr-button-export-feedback">
                            <Download className="h-4 w-4 mr-2" />
                            Export Results
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Goals Tab - Goal Cascade Management */}
              <TabsContent value="goals" className="space-y-6">
                {/* Goal Categories Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {goalCategories.map((category) => {
                    const IconComponent = category.icon;
                    const achievementRate = (category.achieved / category.count) * 100;
                    
                    return (
                      <motion.div
                        key={category.id}
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="cursor-pointer"
                        data-testid={`hr-goal-category-${category.id}`}
                      >
                        <Card className="h-full hover:shadow-lg transition-all duration-300 border-gray-200 hover:border-blue-300">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-${category.color}-100`}>
                                  <IconComponent className={`h-6 w-6 text-${category.color}-600`} />
                                </div>
                                <div>
                                  <h3 className="font-medium">{category.name}</h3>
                                  <p className="text-sm text-muted-foreground">{category.count} obiettivi</p>
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Achievement Rate</span>
                                <span>{achievementRate.toFixed(1)}%</span>
                              </div>
                              <Progress value={achievementRate} className="h-2" />
                              <div className="text-xs text-muted-foreground">
                                {category.achieved} of {category.count} achieved
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Goal Cascade Management */}
                <Card className="border-gray-200" data-testid="hr-card-goal-cascade">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Strategic Goal Cascade Management
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" data-testid="hr-button-cascade-wizard">
                          <Wand2 className="h-4 w-4 mr-2" />
                          Cascade Wizard
                        </Button>
                        <Button size="sm" data-testid="hr-button-create-goal">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Goal
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Goal Hierarchy Visualization */}
                      <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-green-50 border">
                        <h4 className="font-medium mb-4">Goal Hierarchy (Strategic → Individual)</h4>
                        
                        <div className="space-y-4">
                          {/* Company Level */}
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-blue-200">
                            <div className="p-2 rounded-lg bg-blue-100">
                              <Building className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">Company Goals</div>
                              <div className="text-sm text-muted-foreground">5 strategic objectives</div>
                            </div>
                            <Badge className="bg-blue-100 text-blue-700">100% alignment</Badge>
                          </div>
                          
                          {/* Department Level */}
                          <div className="ml-8 flex items-center gap-3 p-3 rounded-lg bg-white border border-green-200">
                            <div className="p-2 rounded-lg bg-green-100">
                              <Users className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">Department Goals</div>
                              <div className="text-sm text-muted-foreground">23 departmental objectives</div>
                            </div>
                            <Badge className="bg-green-100 text-green-700">87% alignment</Badge>
                          </div>
                          
                          {/* Team Level */}
                          <div className="ml-16 flex items-center gap-3 p-3 rounded-lg bg-white border border-purple-200">
                            <div className="p-2 rounded-lg bg-purple-100">
                              <Target className="h-5 w-5 text-purple-600" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">Team Goals</div>
                              <div className="text-sm text-muted-foreground">156 team objectives</div>
                            </div>
                            <Badge className="bg-purple-100 text-purple-700">92% alignment</Badge>
                          </div>
                          
                          {/* Individual Level */}
                          <div className="ml-24 flex items-center gap-3 p-3 rounded-lg bg-white border border-orange-200">
                            <div className="p-2 rounded-lg bg-orange-100">
                              <UserCheck className="h-5 w-5 text-orange-600" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">Individual Goals</div>
                              <div className="text-sm text-muted-foreground">1,063 personal objectives</div>
                            </div>
                            <Badge className="bg-orange-100 text-orange-700">89% alignment</Badge>
                          </div>
                        </div>
                      </div>

                      {/* Goal Management Actions */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button variant="outline" className="h-20 flex-col gap-2" data-testid="hr-button-goal-templates">
                          <BookOpen className="h-6 w-6" />
                          <span>Goal Templates</span>
                        </Button>
                        <Button variant="outline" className="h-20 flex-col gap-2" data-testid="hr-button-bulk-assign">
                          <Copy className="h-6 w-6" />
                          <span>Bulk Assignment</span>
                        </Button>
                        <Button variant="outline" className="h-20 flex-col gap-2" data-testid="hr-button-alignment-check">
                          <CheckCircle className="h-6 w-6" />
                          <span>Alignment Check</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Analytics Tab - Performance Analytics with Predictive Insights */}
              <TabsContent value="analytics" className="space-y-6">
                {/* Department Performance Analytics */}
                <Card className="border-gray-200" data-testid="hr-card-department-analytics">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      Department Performance Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {departmentPerformance.map((dept, index) => (
                        <motion.div
                          key={dept.department}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center justify-between p-4 rounded-lg bg-white border hover:border-blue-200 transition-colors"
                          data-testid={`hr-dept-${dept.department.toLowerCase()}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-blue-100">
                              <Building className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-medium">{dept.department}</h4>
                              <div className="text-sm text-muted-foreground">
                                {dept.completed}/{dept.goals} goals completed
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Average Rating</div>
                              <div className="font-medium text-lg">{dept.rating}/5.0</div>
                            </div>
                            
                            <div className={`p-2 rounded-lg ${
                              dept.trend === 'up' ? 'bg-green-100' :
                              dept.trend === 'down' ? 'bg-red-100' :
                              'bg-gray-100'
                            }`}>
                              {dept.trend === 'up' ? (
                                <TrendingUp className="h-5 w-5 text-green-600" />
                              ) : dept.trend === 'down' ? (
                                <TrendingUp className="h-5 w-5 text-red-600 transform rotate-180" />
                              ) : (
                                <TrendingUp className="h-5 w-5 text-gray-600 transform rotate-90" />
                              )}
                            </div>
                            
                            <Button variant="outline" size="sm" data-testid={`hr-button-dept-details-${dept.department.toLowerCase()}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Predictive Analytics Dashboard */}
                <Card className="border-gray-200" data-testid="hr-card-predictive-analytics">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-600" />
                      Predictive Insights & Trend Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-medium">Performance Predictions</h4>
                        <div className="space-y-3">
                          <Alert className="border-green-200 bg-green-50">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <AlertTitle className="text-green-800">Positive Trend</AlertTitle>
                            <AlertDescription className="text-green-700 text-sm">
                              Engineering team performance projected to increase 12% next quarter
                            </AlertDescription>
                          </Alert>
                          
                          <Alert className="border-yellow-200 bg-yellow-50">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <AlertTitle className="text-yellow-800">Watch Area</AlertTitle>
                            <AlertDescription className="text-yellow-700 text-sm">
                              Marketing team showing signs of goal fatigue - recommend review
                            </AlertDescription>
                          </Alert>
                          
                          <Alert className="border-blue-200 bg-blue-50">
                            <Info className="h-4 w-4 text-blue-600" />
                            <AlertTitle className="text-blue-800">Insight</AlertTitle>
                            <AlertDescription className="text-blue-700 text-sm">
                              Teams with regular 1:1s show 23% higher performance ratings
                            </AlertDescription>
                          </Alert>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-medium">Advanced Analytics Tools</h4>
                        <div className="space-y-2">
                          <Button variant="outline" className="w-full justify-start" data-testid="hr-button-performance-forecast">
                            <LineChart className="h-4 w-4 mr-2" />
                            Performance Forecast
                          </Button>
                          <Button variant="outline" className="w-full justify-start" data-testid="hr-button-correlation-analysis">
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Correlation Analysis
                          </Button>
                          <Button variant="outline" className="w-full justify-start" data-testid="hr-button-risk-assessment">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Risk Assessment
                          </Button>
                          <Button variant="outline" className="w-full justify-start" data-testid="hr-button-benchmark-analysis">
                            <Target className="h-4 w-4 mr-2" />
                            Benchmark Analysis
                          </Button>
                        </div>
                        
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mt-4">
                          <div className="text-sm text-blue-800">
                            <div className="font-medium">AI-Powered Recommendations</div>
                            <div className="mt-1">• Increase 1:1 frequency for underperforming teams</div>
                            <div>• Implement peer mentoring in Sales department</div>
                            <div>• Consider goal redistribution in Q1 planning</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Calibration Tab - Cross-Department Performance Alignment */}
              <TabsContent value="calibration" className="space-y-6">
                {/* Upcoming Calibration Sessions */}
                <Card className="border-gray-200" data-testid="hr-card-calibration-sessions">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-orange-600" />
                        Calibration Sessions Management
                      </div>
                      <Button size="sm" data-testid="hr-button-schedule-calibration">
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Session
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {upcomingCalibrations.map((session, index) => (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`p-4 rounded-lg border ${
                            session.status === 'scheduled' ? 'bg-green-50 border-green-200' :
                            'bg-yellow-50 border-yellow-200'
                          }`}
                          data-testid={`hr-calibration-${session.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{session.department} Calibration</h4>
                              <div className="text-sm text-muted-foreground">
                                {session.date} • {session.participants} participants
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge className={
                                session.status === 'scheduled' ? 'bg-green-100 text-green-700' :
                                'bg-yellow-100 text-yellow-700'
                              }>
                                {session.status}
                              </Badge>
                              
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" data-testid={`hr-button-calibration-details-${session.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" data-testid={`hr-button-calibration-participants-${session.id}`}>
                                  <Users className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" data-testid={`hr-button-calibration-materials-${session.id}`}>
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Cross-Department Alignment Tools */}
                <Card className="border-gray-200" data-testid="hr-card-alignment-tools">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      Cross-Department Alignment Tools
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-medium">Rating Distribution Analysis</h4>
                        <div className="space-y-3">
                          <div className="p-3 rounded-lg bg-white border">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm">5.0 - Exceptional</span>
                              <span className="text-sm font-medium">8%</span>
                            </div>
                            <Progress value={8} className="h-2" />
                          </div>
                          
                          <div className="p-3 rounded-lg bg-white border">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm">4.0 - Exceeds</span>
                              <span className="text-sm font-medium">34%</span>
                            </div>
                            <Progress value={34} className="h-2" />
                          </div>
                          
                          <div className="p-3 rounded-lg bg-white border">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm">3.0 - Meets</span>
                              <span className="text-sm font-medium">47%</span>
                            </div>
                            <Progress value={47} className="h-2" />
                          </div>
                          
                          <div className="p-3 rounded-lg bg-white border">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm">2.0 - Below</span>
                              <span className="text-sm font-medium">9%</span>
                            </div>
                            <Progress value={9} className="h-2" />
                          </div>
                          
                          <div className="p-3 rounded-lg bg-white border">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm">1.0 - Inadequate</span>
                              <span className="text-sm font-medium">2%</span>
                            </div>
                            <Progress value={2} className="h-2" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-medium">Calibration Tools</h4>
                        <div className="space-y-2">
                          <Button variant="outline" className="w-full justify-start" data-testid="hr-button-rating-guidelines">
                            <BookOpen className="h-4 w-4 mr-2" />
                            Rating Guidelines
                          </Button>
                          <Button variant="outline" className="w-full justify-start" data-testid="hr-button-bias-detection">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Bias Detection
                          </Button>
                          <Button variant="outline" className="w-full justify-start" data-testid="hr-button-comparative-analysis">
                            <BarChart3 className="h-4 w-4 mr-2" />
                            Comparative Analysis
                          </Button>
                          <Button variant="outline" className="w-full justify-start" data-testid="hr-button-calibration-feedback">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Session Feedback
                          </Button>
                        </div>
                        
                        <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="text-sm text-orange-800">
                            <div className="font-medium">Calibration Insights</div>
                            <div className="mt-1">• Engineering dept rates 15% higher on average</div>
                            <div>• Recommended normalization for Q4 reviews</div>
                            <div>• Cross-training needed for newer managers</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Development Tab - Career Development & Succession Planning */}
              <TabsContent value="development" className="space-y-6">
                {/* Career Development Planning */}
                <Card className="border-gray-200" data-testid="hr-card-development-planning">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-600" />
                        Career Development & Succession Planning
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" data-testid="hr-button-development-wizard">
                          <Wand2 className="h-4 w-4 mr-2" />
                          Development Wizard
                        </Button>
                        <Button size="sm" data-testid="hr-button-create-plan">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Plan
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-medium">Active Development Plans</h4>
                        <div className="space-y-3">
                          {[
                            { employee: 'Sarah Chen', role: 'Senior Developer', plan: 'Tech Lead Path', progress: 67, timeline: '6 months' },
                            { employee: 'Marco Rossi', role: 'Marketing Specialist', plan: 'Manager Track', progress: 45, timeline: '8 months' },
                            { employee: 'Lisa Johnson', role: 'Sales Rep', plan: 'Account Manager', progress: 78, timeline: '4 months' }
                          ].map((plan, index) => (
                            <motion.div
                              key={plan.employee}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="p-4 rounded-lg bg-white border hover:border-yellow-200 transition-colors"
                              data-testid={`hr-dev-plan-${plan.employee.replace(' ', '-').toLowerCase()}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <div className="font-medium">{plan.employee}</div>
                                  <div className="text-sm text-muted-foreground">{plan.role} → {plan.plan}</div>
                                </div>
                                <Badge variant="outline">{plan.timeline}</Badge>
                              </div>
                              
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span>Progress</span>
                                  <span>{plan.progress}%</span>
                                </div>
                                <Progress value={plan.progress} className="h-2" />
                              </div>
                              
                              <div className="flex gap-1 mt-3">
                                <Button variant="ghost" size="sm" data-testid={`hr-button-view-plan-${plan.employee.replace(' ', '-').toLowerCase()}`}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" data-testid={`hr-button-milestones-${plan.employee.replace(' ', '-').toLowerCase()}`}>
                                  <Target className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" data-testid={`hr-button-mentor-${plan.employee.replace(' ', '-').toLowerCase()}`}>
                                  <Users className="h-4 w-4" />
                                </Button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-medium">Succession Planning</h4>
                        <div className="space-y-3">
                          {[
                            { position: 'VP Engineering', readiness: 'Ready Now', candidates: 2, risk: 'Low' },
                            { position: 'Sales Manager', readiness: '6-12 months', candidates: 3, risk: 'Medium' },
                            { position: 'HR Director', readiness: '1-2 years', candidates: 1, risk: 'High' }
                          ].map((succession, index) => (
                            <div
                              key={succession.position}
                              className={`p-3 rounded-lg border ${
                                succession.risk === 'Low' ? 'bg-green-50 border-green-200' :
                                succession.risk === 'Medium' ? 'bg-yellow-50 border-yellow-200' :
                                'bg-red-50 border-red-200'
                              }`}
                              data-testid={`hr-succession-${succession.position.replace(' ', '-').toLowerCase()}`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-sm">{succession.position}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {succession.candidates} candidates • {succession.readiness}
                                  </div>
                                </div>
                                <Badge className={
                                  succession.risk === 'Low' ? 'bg-green-100 text-green-700' :
                                  succession.risk === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }>
                                  {succession.risk} Risk
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="space-y-2">
                          <Button variant="outline" className="w-full justify-start" data-testid="hr-button-succession-matrix">
                            <Layers className="h-4 w-4 mr-2" />
                            Succession Matrix
                          </Button>
                          <Button variant="outline" className="w-full justify-start" data-testid="hr-button-talent-pipeline">
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Talent Pipeline
                          </Button>
                          <Button variant="outline" className="w-full justify-start" data-testid="hr-button-leadership-assessment">
                            <Award className="h-4 w-4 mr-2" />
                            Leadership Assessment
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Improvement Plans */}
                <Card className="border-gray-200" data-testid="hr-card-improvement-plans">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-red-600" />
                      Performance Improvement Plan Tracking
                      <Badge variant="outline" className="ml-auto">{performanceMetrics.improvementPlans} active</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { employee: 'John Smith', department: 'Sales', startDate: '2024-11-01', milestone: 'Month 1 Check-in', status: 'on-track' },
                        { employee: 'Maria Garcia', department: 'Marketing', startDate: '2024-10-15', milestone: 'Month 2 Review', status: 'needs-attention' },
                        { employee: 'David Lee', department: 'Support', startDate: '2024-12-01', milestone: 'Initial Setup', status: 'completed' }
                      ].map((pip, index) => (
                        <motion.div
                          key={pip.employee}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`p-4 rounded-lg border ${
                            pip.status === 'on-track' ? 'bg-green-50 border-green-200' :
                            pip.status === 'needs-attention' ? 'bg-yellow-50 border-yellow-200' :
                            'bg-blue-50 border-blue-200'
                          }`}
                          data-testid={`hr-pip-${pip.employee.replace(' ', '-').toLowerCase()}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{pip.employee}</div>
                              <div className="text-sm text-muted-foreground">
                                {pip.department} • Started {pip.startDate}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Current: {pip.milestone}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge className={
                                pip.status === 'on-track' ? 'bg-green-100 text-green-700' :
                                pip.status === 'needs-attention' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-blue-100 text-blue-700'
                              }>
                                {pip.status === 'on-track' ? 'On Track' :
                                 pip.status === 'needs-attention' ? 'Needs Attention' :
                                 'Completed'}
                              </Badge>
                              
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" data-testid={`hr-button-pip-details-${pip.employee.replace(' ', '-').toLowerCase()}`}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" data-testid={`hr-button-pip-notes-${pip.employee.replace(' ', '-').toLowerCase()}`}>
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" data-testid={`hr-button-pip-schedule-${pip.employee.replace(' ', '-').toLowerCase()}`}>
                                  <Calendar className="h-4 w-4" />
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
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderTraining = () => {
    // Training Management Advanced Metrics
    const trainingMetrics = {
      trainingEffectiveness: 94.2,
      employeeSkillDevelopment: 23, // YoY %
      certificationCompliance: 97.3,
      trainingBudgetUtilization: 89.7,
      learningPathCompletion: 87.5,
      externalPlatformIntegrations: 8,
      totalCourses: 847,
      activeLearners: 127,
      completedCertifications: 234,
      averageRating: 4.7,
      monthlyBudget: 45000,
      budgetSpent: 40365
    };

    return (
      <div className="space-y-6">
        {/* Enterprise Training Management Header */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-training-management-header">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-purple-600" />
              Enterprise Learning Management System
              <Badge variant="outline" className="ml-auto bg-purple-50 text-purple-700">
                847 Corsi Programmati
              </Badge>
            </CardTitle>
            <CardDescription>
              Full-featured LMS con AI-powered skills analysis e external platform integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Advanced Training KPIs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200"
                data-testid="hr-training-kpi-effectiveness"
              >
                <div className="flex items-center gap-3">
                  <BrainCircle className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{trainingMetrics.trainingEffectiveness}%</p>
                    <p className="text-xs text-purple-700">Training Effectiveness</p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border border-green-200"
                data-testid="hr-training-kpi-skill-development"
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-600">+{trainingMetrics.employeeSkillDevelopment}%</p>
                    <p className="text-xs text-green-700">Skill Development YoY</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200"
                data-testid="hr-training-kpi-compliance"
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{trainingMetrics.certificationCompliance}%</p>
                    <p className="text-xs text-blue-700">Compliance Rate</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200"
                data-testid="hr-training-kpi-budget"
              >
                <div className="flex items-center gap-3">
                  <DollarSign className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{trainingMetrics.trainingBudgetUtilization}%</p>
                    <p className="text-xs text-orange-700">Budget Utilization</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Enterprise Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <Button 
                className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
                data-testid="hr-button-course-creation-wizard"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Course Creation Wizard
              </Button>
              <Button 
                variant="outline" 
                className="hover:bg-green-50 hover:border-green-200"
                data-testid="hr-button-ai-skills-analysis"
              >
                <BrainCircle className="h-4 w-4 mr-2" />
                AI Skills Gap Analysis
              </Button>
              <Button 
                variant="outline" 
                className="hover:bg-blue-50 hover:border-blue-200"
                data-testid="hr-button-certification-monitor"
              >
                <FileCheck className="h-4 w-4 mr-2" />
                Certification Monitor
              </Button>
              <Button 
                variant="outline" 
                className="hover:bg-orange-50 hover:border-orange-200"
                data-testid="hr-button-roi-analytics"
              >
                <Calculator className="h-4 w-4 mr-2" />
                ROI Analytics
              </Button>
              <Button 
                variant="outline" 
                className="hover:bg-purple-50 hover:border-purple-200"
                data-testid="hr-button-external-integrations"
              >
                <Globe className="h-4 w-4 mr-2" />
                External Platforms ({trainingMetrics.externalPlatformIntegrations})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Enterprise Training Sub-Tabs */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-training-enterprise-tabs">
          <CardContent className="p-0">
            <Tabs defaultValue="lms" className="w-full">
              <div className="border-b border-gray-200 px-6 pt-6">
                <TabsList className="grid w-full grid-cols-5 bg-gray-50/50">
                  <TabsTrigger 
                    value="lms" 
                    className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
                    data-testid="hr-training-tab-lms"
                  >
                    Learning Management
                  </TabsTrigger>
                  <TabsTrigger 
                    value="programs" 
                    className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700"
                    data-testid="hr-training-tab-programs"
                  >
                    Training Programs
                  </TabsTrigger>
                  <TabsTrigger 
                    value="certifications" 
                    className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
                    data-testid="hr-training-tab-certifications"
                  >
                    Certifications
                  </TabsTrigger>
                  <TabsTrigger 
                    value="skills" 
                    className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700"
                    data-testid="hr-training-tab-skills"
                  >
                    Skills Analysis
                  </TabsTrigger>
                  <TabsTrigger 
                    value="budget" 
                    className="data-[state=active]:bg-red-100 data-[state=active]:text-red-700"
                    data-testid="hr-training-tab-budget"
                  >
                    Budget & ROI
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Learning Management System Tab */}
              <TabsContent value="lms" className="p-6 space-y-6" data-testid="hr-training-content-lms">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-purple-600" />
                    Enterprise Learning Management System
                  </h3>
                  <Button 
                    className="bg-purple-600 hover:bg-purple-700"
                    data-testid="hr-button-create-course"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Course
                  </Button>
                </div>

                {/* LMS Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Course Creation Wizard */}
                  <Card className="border-purple-200" data-testid="hr-lms-course-wizard">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Wand2 className="h-5 w-5 text-purple-600" />
                        Course Creation Wizard
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        {[
                          { step: 1, title: 'Course Structure', status: 'completed' },
                          { step: 2, title: 'Content Upload', status: 'active' },
                          { step: 3, title: 'Assessments', status: 'pending' },
                          { step: 4, title: 'Publishing', status: 'pending' }
                        ].map(step => (
                          <div key={step.step} className="flex items-center gap-3" data-testid={`hr-wizard-step-${step.step}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                              step.status === 'completed' ? 'bg-green-100 text-green-700' :
                              step.status === 'active' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-500'
                            }`}>
                              {step.status === 'completed' ? <CheckCircle className="h-3 w-3" /> : step.step}
                            </div>
                            <span className={`text-sm ${step.status === 'active' ? 'font-medium' : ''}`}>
                              {step.title}
                            </span>
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" className="w-full" data-testid="hr-button-continue-wizard">
                        Continue Wizard
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Active Courses */}
                  <Card className="border-green-200" data-testid="hr-lms-active-courses">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BookOpen className="h-5 w-5 text-green-600" />
                        Active Courses
                        <Badge variant="secondary">{trainingMetrics.totalCourses}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        { title: 'Advanced Excel Skills', learners: 45, completion: 78, rating: 4.8 },
                        { title: 'Leadership Fundamentals', learners: 32, completion: 92, rating: 4.6 },
                        { title: 'Cyber Security Basics', learners: 67, completion: 85, rating: 4.9 },
                        { title: 'Project Management', learners: 28, completion: 73, rating: 4.5 }
                      ].map((course, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                          data-testid={`hr-course-${idx}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-sm">{course.title}</h4>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-current" />
                              <span className="text-xs text-gray-600">{course.rating}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-xs text-gray-600 mb-2">
                            <span>{course.learners} learners</span>
                            <span>{course.completion}% completion</span>
                          </div>
                          <Progress value={course.completion} className="h-1" />
                        </motion.div>
                      ))}
                      <Button variant="outline" className="w-full" data-testid="hr-button-view-all-courses">
                        View All Courses
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Learning Analytics */}
                  <Card className="border-blue-200" data-testid="hr-lms-analytics">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                        Learning Analytics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{trainingMetrics.activeLearners}</div>
                          <div className="text-xs text-blue-700">Active Learners</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{trainingMetrics.completedCertifications}</div>
                          <div className="text-xs text-green-700">Completions</div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Learning Progress Today</h4>
                        {[
                          { metric: 'Course Completions', value: 23, trend: '+12%' },
                          { metric: 'Active Sessions', value: 89, trend: '+5%' },
                          { metric: 'Avg. Session Time', value: '47min', trend: '+8%' }
                        ].map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">{item.metric}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{item.value}</span>
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                {item.trend}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button variant="outline" className="w-full" data-testid="hr-button-detailed-analytics">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Detailed Analytics
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* External Platform Integrations */}
                <Card className="border-gray-200" data-testid="hr-lms-integrations">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-indigo-600" />
                      External Learning Platform Integrations
                      <Badge variant="outline" className="ml-auto">{trainingMetrics.externalPlatformIntegrations} Connected</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {[
                        { platform: 'Coursera', status: 'connected', courses: 156, learners: 89 },
                        { platform: 'LinkedIn Learning', status: 'connected', courses: 234, learners: 76 },
                        { platform: 'Udemy Business', status: 'connected', courses: 198, learners: 92 },
                        { platform: 'Pluralsight', status: 'setup', courses: 0, learners: 0 }
                      ].map((integration, idx) => (
                        <motion.div
                          key={idx}
                          whileHover={{ scale: 1.02 }}
                          className={`p-4 rounded-lg border ${
                            integration.status === 'connected' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                          }`}
                          data-testid={`hr-integration-${integration.platform.toLowerCase().replace(' ', '-')}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-sm">{integration.platform}</h4>
                            <Badge className={
                              integration.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }>
                              {integration.status}
                            </Badge>
                          </div>
                          {integration.status === 'connected' ? (
                            <div className="space-y-2 text-xs text-gray-600">
                              <div className="flex justify-between">
                                <span>Courses:</span>
                                <span className="font-medium">{integration.courses}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Active Learners:</span>
                                <span className="font-medium">{integration.learners}</span>
                              </div>
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" className="w-full text-xs">
                              Setup Integration
                            </Button>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Training Programs Tab */}
              <TabsContent value="programs" className="p-6 space-y-6" data-testid="hr-training-content-programs">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-600" />
                    Advanced Training Program Scheduling
                  </h3>
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="hr-button-create-program"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Program
                  </Button>
                </div>

                {/* Resource Optimization Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-green-200" data-testid="hr-programs-resource-optimization">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Cpu className="h-5 w-5 text-green-600" />
                        Resource Optimization Engine
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Resource Utilization */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Trainer Utilization</span>
                          <span className="text-sm text-green-600 font-medium">87%</span>
                        </div>
                        <Progress value={87} className="h-2" />
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Room Availability</span>
                          <span className="text-sm text-blue-600 font-medium">92%</span>
                        </div>
                        <Progress value={92} className="h-2" />
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Equipment Usage</span>
                          <span className="text-sm text-purple-600 font-medium">78%</span>
                        </div>
                        <Progress value={78} className="h-2" />
                      </div>

                      {/* Optimization Suggestions */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-green-700">AI Optimization Suggestions:</h4>
                        <Alert className="border-green-200 bg-green-50" data-testid="hr-optimization-suggestion-1">
                          <Lightbulb className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-sm text-green-800">
                            Move "Excel Advanced" to Room B for better AV setup (+15% efficiency)
                          </AlertDescription>
                        </Alert>
                        <Alert className="border-blue-200 bg-blue-50" data-testid="hr-optimization-suggestion-2">
                          <BrainCircle className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-sm text-blue-800">
                            Combine "Leadership" sessions to reduce trainer workload by 20%
                          </AlertDescription>
                        </Alert>
                      </div>

                      <Button variant="outline" className="w-full" data-testid="hr-button-apply-optimizations">
                        <Wand2 className="h-4 w-4 mr-2" />
                        Apply Optimizations
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Program Calendar */}
                  <Card className="border-blue-200" data-testid="hr-programs-calendar">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CalendarView className="h-5 w-5 text-blue-600" />
                        Training Calendar
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Calendar View */}
                        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium mb-2">
                          {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map(day => (
                            <div key={day} className="p-2">{day}</div>
                          ))}
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1">
                          {Array.from({length: 35}).map((_, idx) => (
                            <div 
                              key={idx} 
                              className={`p-2 text-xs text-center rounded cursor-pointer transition-colors ${
                                idx < 5 || idx > 30 ? 'text-gray-400' : 'hover:bg-blue-50'
                              } ${
                                [8, 12, 15, 22].includes(idx) ? 'bg-green-100 text-green-700' : ''
                              } ${
                                [10, 17, 24].includes(idx) ? 'bg-orange-100 text-orange-700' : ''
                              }`}
                              data-testid={`hr-calendar-day-${idx}`}
                            >
                              {idx < 5 ? idx + 27 : idx > 30 ? idx - 30 : idx - 4}
                            </div>
                          ))}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-green-100 rounded"></div>
                            <span>Mandatory</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-orange-100 rounded"></div>
                            <span>Optional</span>
                          </div>
                        </div>

                        <Button variant="outline" className="w-full" data-testid="hr-button-full-calendar">
                          <Calendar className="h-4 w-4 mr-2" />
                          Full Calendar View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Active Training Programs List */}
                <Card className="border-gray-200" data-testid="hr-programs-active-list">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-purple-600" />
                      Active Training Programs
                      <Badge variant="outline" className="ml-auto">847 Scheduled</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { 
                          name: 'Leadership Development Program', 
                          type: 'Mandatory', 
                          participants: 45, 
                          progress: 78, 
                          startDate: '2024-12-01',
                          duration: '12 weeks',
                          trainer: 'Dr. Sarah Johnson',
                          budget: 15000,
                          status: 'active'
                        },
                        { 
                          name: 'Technical Skills Bootcamp', 
                          type: 'Optional', 
                          participants: 32, 
                          progress: 45, 
                          startDate: '2024-12-15',
                          duration: '8 weeks',
                          trainer: 'Mark Stevens',
                          budget: 12000,
                          status: 'enrolling'
                        },
                        { 
                          name: 'Customer Service Excellence', 
                          type: 'Mandatory', 
                          participants: 67, 
                          progress: 92, 
                          startDate: '2024-11-01',
                          duration: '6 weeks',
                          trainer: 'Lisa Chen',
                          budget: 8000,
                          status: 'completing'
                        }
                      ].map((program, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="p-4 rounded-lg bg-gradient-to-r from-white to-gray-50 border border-gray-200 hover:shadow-md transition-all"
                          data-testid={`hr-program-${idx}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-lg">{program.name}</h4>
                                <Badge className={
                                  program.type === 'Mandatory' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                }>
                                  {program.type}
                                </Badge>
                                <Badge variant="outline" className={
                                  program.status === 'active' ? 'border-green-200 text-green-700' :
                                  program.status === 'enrolling' ? 'border-blue-200 text-blue-700' :
                                  'border-orange-200 text-orange-700'
                                }>
                                  {program.status}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  {program.participants} participants
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  {program.startDate}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Timer className="h-4 w-4" />
                                  {program.duration}
                                </div>
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-4 w-4" />
                                  €{program.budget.toLocaleString()}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-sm text-gray-600">Trainer:</span>
                                <span className="text-sm font-medium">{program.trainer}</span>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-600">Progress:</span>
                                <Progress value={program.progress} className="flex-1" />
                                <span className="text-sm font-medium">{program.progress}%</span>
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 ml-4">
                              <Button variant="ghost" size="sm" data-testid={`hr-button-view-program-${idx}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`hr-button-edit-program-${idx}`}>
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`hr-button-analytics-program-${idx}`}>
                                <BarChart3 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Certifications Tab */}
              <TabsContent value="certifications" className="p-6 space-y-6" data-testid="hr-training-content-certifications">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-blue-600" />
                    Certification Compliance Monitoring
                  </h3>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="hr-button-create-certification"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Certification
                  </Button>
                </div>

                {/* Compliance Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="border-blue-200" data-testid="hr-certifications-compliance-overview">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Shield className="h-5 w-5 text-blue-600" />
                        Compliance Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-blue-600 mb-2">{trainingMetrics.certificationCompliance}%</div>
                        <p className="text-sm text-blue-700">Overall Compliance</p>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Active Certificates</span>
                          <Badge variant="secondary">234</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Expiring Soon</span>
                          <Badge variant="destructive">12</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Renewal Required</span>
                          <Badge variant="outline">8</Badge>
                        </div>
                      </div>

                      <Progress value={trainingMetrics.certificationCompliance} className="h-3" />
                    </CardContent>
                  </Card>

                  {/* Certification Categories */}
                  <Card className="border-green-200" data-testid="hr-certifications-categories">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Tags className="h-5 w-5 text-green-600" />
                        Certification Categories
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        { category: 'Safety & Compliance', count: 89, compliance: 98, color: 'red' },
                        { category: 'Technical Skills', count: 67, compliance: 94, color: 'blue' },
                        { category: 'Professional Development', count: 45, compliance: 92, color: 'purple' },
                        { category: 'Industry Specific', count: 33, compliance: 100, color: 'green' }
                      ].map((cat, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-gray-50" data-testid={`hr-cert-category-${idx}`}>
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium text-sm">{cat.category}</h4>
                            <Badge className={`bg-${cat.color}-100 text-${cat.color}-700`}>
                              {cat.count}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-600">Compliance:</span>
                            <span className="font-medium">{cat.compliance}%</span>
                          </div>
                          <Progress value={cat.compliance} className="h-1 mt-1" />
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Expiring Certifications Alert */}
                  <Card className="border-red-200" data-testid="hr-certifications-expiring">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        Expiring Certifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        { name: 'First Aid Certificate', employee: 'Marco Rossi', expires: '2024-12-30', days: 11 },
                        { name: 'Fire Safety Training', employee: 'Lisa Chen', expires: '2025-01-15', days: 27 },
                        { name: 'Data Protection Cert', employee: 'Paolo Verdi', expires: '2025-01-20', days: 32 }
                      ].map((cert, idx) => (
                        <Alert 
                          key={idx} 
                          className={`p-3 ${cert.days <= 15 ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}
                          data-testid={`hr-expiring-cert-${idx}`}
                        >
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle className="text-sm font-medium">{cert.name}</AlertTitle>
                          <AlertDescription className="text-xs">
                            <div>{cert.employee}</div>
                            <div className="flex justify-between items-center mt-1">
                              <span>Expires: {cert.expires}</span>
                              <Badge variant={cert.days <= 15 ? 'destructive' : 'secondary'}>
                                {cert.days} days
                              </Badge>
                            </div>
                          </AlertDescription>
                        </Alert>
                      ))}

                      <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50" data-testid="hr-button-renewal-reminders">
                        <Mail className="h-4 w-4 mr-2" />
                        Send Renewal Reminders
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Certification Management Table */}
                <Card className="border-gray-200" data-testid="hr-certifications-management-table">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-gray-600" />
                      Certification Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Input 
                          placeholder="Search certifications..." 
                          className="max-w-sm"
                          data-testid="hr-input-search-certifications"
                        />
                        <Select defaultValue="all">
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Filter by status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Certifications</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="expiring">Expiring Soon</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="outline" data-testid="hr-button-export-certifications">
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </div>

                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Employee</TableHead>
                              <TableHead>Certification</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Issue Date</TableHead>
                              <TableHead>Expiry Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[
                              {
                                employee: 'Mario Rossi',
                                certification: 'Advanced Excel Certification',
                                category: 'Technical Skills',
                                issueDate: '2023-06-15',
                                expiryDate: '2025-06-15',
                                status: 'active'
                              },
                              {
                                employee: 'Giulia Bianchi',
                                certification: 'Project Management Professional',
                                category: 'Professional Development',
                                issueDate: '2023-03-20',
                                expiryDate: '2025-03-20',
                                status: 'active'
                              },
                              {
                                employee: 'Luca Verde',
                                certification: 'Fire Safety Training',
                                category: 'Safety & Compliance',
                                issueDate: '2023-01-10',
                                expiryDate: '2024-01-10',
                                status: 'expired'
                              }
                            ].map((cert, idx) => (
                              <TableRow key={idx} data-testid={`hr-cert-row-${idx}`}>
                                <TableCell className="font-medium">{cert.employee}</TableCell>
                                <TableCell>{cert.certification}</TableCell>
                                <TableCell>{cert.category}</TableCell>
                                <TableCell>{cert.issueDate}</TableCell>
                                <TableCell>{cert.expiryDate}</TableCell>
                                <TableCell>
                                  <Badge className={
                                    cert.status === 'active' ? 'bg-green-100 text-green-700' :
                                    cert.status === 'expiring' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }>
                                    {cert.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center gap-2 justify-end">
                                    <Button variant="ghost" size="sm" data-testid={`hr-button-view-cert-${idx}`}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" data-testid={`hr-button-download-cert-${idx}`}>
                                      <Download className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" data-testid={`hr-button-renew-cert-${idx}`}>
                                      <RefreshCw className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Skills Analysis Tab */}
              <TabsContent value="skills" className="p-6 space-y-6" data-testid="hr-training-content-skills">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <BrainCircle className="h-5 w-5 text-orange-600" />
                    AI-Powered Skills Gap Analysis
                  </h3>
                  <Button 
                    className="bg-orange-600 hover:bg-orange-700"
                    data-testid="hr-button-run-skills-analysis"
                  >
                    <BrainCircle className="h-4 w-4 mr-2" />
                    Run AI Analysis
                  </Button>
                </div>

                {/* Skills Overview Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-orange-200" data-testid="hr-skills-gap-analysis">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-orange-600" />
                        Skills Gap Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-600 mb-2">23%</div>
                        <p className="text-sm text-orange-700">Average Skills Gap</p>
                      </div>

                      <div className="space-y-3">
                        {[
                          { skill: 'Data Analysis', current: 68, target: 85, gap: 17 },
                          { skill: 'Digital Marketing', current: 72, target: 90, gap: 18 },
                          { skill: 'Project Management', current: 81, target: 95, gap: 14 },
                          { skill: 'Leadership', current: 59, target: 80, gap: 21 }
                        ].map((skill, idx) => (
                          <div key={idx} className="space-y-2" data-testid={`hr-skill-gap-${idx}`}>
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">{skill.skill}</span>
                              <Badge variant="outline" className="text-orange-700">
                                {skill.gap}% gap
                              </Badge>
                            </div>
                            <div className="relative">
                              <Progress value={skill.current} className="h-2" />
                              <div 
                                className="absolute top-0 h-2 bg-orange-200 rounded-full"
                                style={{ 
                                  left: `${skill.current}%`, 
                                  width: `${skill.gap}%` 
                                }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Current: {skill.current}%</span>
                              <span>Target: {skill.target}%</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button variant="outline" className="w-full" data-testid="hr-button-detailed-skills-report">
                        <FileText className="h-4 w-4 mr-2" />
                        Detailed Skills Report
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-purple-200" data-testid="hr-competency-mapping">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-purple-600" />
                        Competency Matrix
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Skill Matrix Visualization */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium">Top Skills by Department</h4>
                        <div className="grid grid-cols-5 gap-2 text-xs">
                          <div></div>
                          <div className="text-center font-medium">IT</div>
                          <div className="text-center font-medium">Marketing</div>
                          <div className="text-center font-medium">Sales</div>
                          <div className="text-center font-medium">HR</div>
                          
                          <div className="font-medium">Technical</div>
                          <div className="h-6 bg-green-200 rounded flex items-center justify-center text-green-800">92</div>
                          <div className="h-6 bg-yellow-200 rounded flex items-center justify-center text-yellow-800">64</div>
                          <div className="h-6 bg-red-200 rounded flex items-center justify-center text-red-800">34</div>
                          <div className="h-6 bg-yellow-200 rounded flex items-center justify-center text-yellow-800">58</div>
                          
                          <div className="font-medium">Communication</div>
                          <div className="h-6 bg-yellow-200 rounded flex items-center justify-center text-yellow-800">76</div>
                          <div className="h-6 bg-green-200 rounded flex items-center justify-center text-green-800">89</div>
                          <div className="h-6 bg-green-200 rounded flex items-center justify-center text-green-800">95</div>
                          <div className="h-6 bg-green-200 rounded flex items-center justify-center text-green-800">88</div>
                          
                          <div className="font-medium">Leadership</div>
                          <div className="h-6 bg-yellow-200 rounded flex items-center justify-center text-yellow-800">68</div>
                          <div className="h-6 bg-yellow-200 rounded flex items-center justify-center text-yellow-800">72</div>
                          <div className="h-6 bg-yellow-200 rounded flex items-center justify-center text-yellow-800">71</div>
                          <div className="h-6 bg-green-200 rounded flex items-center justify-center text-green-800">82</div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-green-200 rounded"></div>
                            <span>80-100%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-yellow-200 rounded"></div>
                            <span>60-79%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-red-200 rounded"></div>
                            <span>&lt;60%</span>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-purple-700">Development Pathways</h4>
                        <div className="space-y-2">
                          <Button variant="ghost" className="w-full justify-start text-sm h-8" data-testid="hr-button-technical-pathway">
                            <ArrowRight className="h-3 w-3 mr-2" />
                            Technical Skills → Senior Developer (8 weeks)
                          </Button>
                          <Button variant="ghost" className="w-full justify-start text-sm h-8" data-testid="hr-button-leadership-pathway">
                            <ArrowRight className="h-3 w-3 mr-2" />
                            Leadership → Team Manager (12 weeks)
                          </Button>
                          <Button variant="ghost" className="w-full justify-start text-sm h-8" data-testid="hr-button-communication-pathway">
                            <ArrowRight className="h-3 w-3 mr-2" />
                            Communication → Client Relations (6 weeks)
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* AI Recommendations */}
                <Card className="border-green-200" data-testid="hr-skills-ai-recommendations">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-green-600" />
                      AI Training Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      {
                        priority: 'High',
                        recommendation: 'Implement Advanced Excel training for Sales team',
                        impact: 'Improve data analysis capabilities by 35%',
                        timeframe: '4-6 weeks',
                        cost: 3200,
                        participants: 24
                      },
                      {
                        priority: 'High',
                        recommendation: 'Leadership development program for team leads',
                        impact: 'Increase team productivity by 20%',
                        timeframe: '12 weeks',
                        cost: 8500,
                        participants: 12
                      },
                      {
                        priority: 'Medium',
                        recommendation: 'Digital marketing certification for Marketing team',
                        impact: 'Enhance online campaign effectiveness by 25%',
                        timeframe: '8 weeks',
                        cost: 4200,
                        participants: 18
                      }
                    ].map((rec, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={`p-4 rounded-lg border ${
                          rec.priority === 'High' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                        }`}
                        data-testid={`hr-ai-recommendation-${idx}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={
                                rec.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                              }>
                                {rec.priority} Priority
                              </Badge>
                              <BrainCircle className="h-4 w-4 text-green-600" />
                            </div>
                            <h4 className="font-semibold text-lg mb-2">{rec.recommendation}</h4>
                            <p className="text-sm text-gray-700 mb-3">{rec.impact}</p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Timer className="h-4 w-4 text-gray-500" />
                                {rec.timeframe}
                              </div>
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-gray-500" />
                                €{rec.cost.toLocaleString()}
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-gray-500" />
                                {rec.participants} people
                              </div>
                              <div className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-gray-500" />
                                ROI: 285%
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 ml-4">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" data-testid={`hr-button-approve-recommendation-${idx}`}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button variant="outline" size="sm" data-testid={`hr-button-customize-recommendation-${idx}`}>
                              <Edit3 className="h-4 w-4 mr-2" />
                              Customize
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    <Button variant="outline" className="w-full" data-testid="hr-button-generate-more-recommendations">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate More Recommendations
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Budget & ROI Tab */}
              <TabsContent value="budget" className="p-6 space-y-6" data-testid="hr-training-content-budget">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-red-600" />
                    Training Budget Management & ROI Analytics
                  </h3>
                  <Button 
                    className="bg-red-600 hover:bg-red-700"
                    data-testid="hr-button-budget-planning"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Budget Planning
                  </Button>
                </div>

                {/* Budget Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <Card className="border-green-200" data-testid="hr-budget-overview">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Monthly Budget</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">€{trainingMetrics.monthlyBudget.toLocaleString()}</div>
                        <div className="text-sm text-green-700">Total Allocated</div>
                        <div className="mt-2">
                          <Progress value={(trainingMetrics.budgetSpent / trainingMetrics.monthlyBudget) * 100} className="h-2" />
                          <div className="flex justify-between text-xs text-gray-600 mt-1">
                            <span>Spent: €{trainingMetrics.budgetSpent.toLocaleString()}</span>
                            <span>{Math.round((trainingMetrics.budgetSpent / trainingMetrics.monthlyBudget) * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-200" data-testid="hr-budget-utilization">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Budget Utilization</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">{trainingMetrics.trainingBudgetUtilization}%</div>
                        <div className="text-sm text-blue-700">Utilization Rate</div>
                        <div className="mt-2 space-y-2">
                          <div className="flex justify-between text-xs">
                            <span>Q1 Target</span>
                            <span>85%</span>
                          </div>
                          <Progress value={trainingMetrics.trainingBudgetUtilization} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-purple-200" data-testid="hr-budget-roi">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Training ROI</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600">285%</div>
                        <div className="text-sm text-purple-700">Average ROI</div>
                        <div className="mt-2 space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>Investment:</span>
                            <span>€{trainingMetrics.budgetSpent.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Return:</span>
                            <span>€{(trainingMetrics.budgetSpent * 2.85).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-orange-200" data-testid="hr-budget-cost-per-employee">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Cost Per Employee</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-600">€{Math.round(trainingMetrics.budgetSpent / trainingMetrics.activeLearners)}</div>
                        <div className="text-sm text-orange-700">Avg Per Learner</div>
                        <div className="mt-2 space-y-1 text-xs text-gray-600">
                          <div>Industry avg: €420</div>
                          <Badge className="bg-green-100 text-green-700">
                            -24% vs industry
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Budget Breakdown & Cost Optimization */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-gray-200" data-testid="hr-budget-breakdown">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChart className="h-5 w-5 text-gray-600" />
                        Budget Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {[
                        { category: 'External Training', amount: 18500, percentage: 46, color: 'blue' },
                        { category: 'Internal Programs', amount: 12000, percentage: 30, color: 'green' },
                        { category: 'Certifications', amount: 6200, percentage: 15, color: 'purple' },
                        { category: 'Materials & Resources', amount: 2465, percentage: 6, color: 'orange' },
                        { category: 'Technology & Platforms', amount: 1200, percentage: 3, color: 'red' }
                      ].map((item, idx) => (
                        <div key={idx} className="space-y-2" data-testid={`hr-budget-category-${idx}`}>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{item.category}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">€{item.amount.toLocaleString()}</span>
                              <Badge variant="outline">{item.percentage}%</Badge>
                            </div>
                          </div>
                          <Progress value={item.percentage} className="h-2" />
                        </div>
                      ))}

                      <div className="pt-4 border-t">
                        <div className="flex justify-between items-center font-semibold">
                          <span>Total Spent</span>
                          <span>€{trainingMetrics.budgetSpent.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-600 mt-1">
                          <span>Remaining Budget</span>
                          <span>€{(trainingMetrics.monthlyBudget - trainingMetrics.budgetSpent).toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-green-200" data-testid="hr-budget-cost-optimization">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-green-600" />
                        Cost Optimization Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <Alert className="border-green-200 bg-green-50" data-testid="hr-cost-optimization-1">
                          <Lightbulb className="h-4 w-4 text-green-600" />
                          <AlertTitle className="text-green-800">Bulk Training Discount</AlertTitle>
                          <AlertDescription className="text-green-700 text-sm">
                            Grouping Excel and PowerPoint courses could save €2,400 (15% discount)
                          </AlertDescription>
                        </Alert>

                        <Alert className="border-blue-200 bg-blue-50" data-testid="hr-cost-optimization-2">
                          <BrainCircle className="h-4 w-4 text-blue-600" />
                          <AlertTitle className="text-blue-800">Internal Trainer Opportunity</AlertTitle>
                          <AlertDescription className="text-blue-700 text-sm">
                            Marco Rossi could deliver leadership training internally, saving €4,800
                          </AlertDescription>
                        </Alert>

                        <Alert className="border-purple-200 bg-purple-50" data-testid="hr-cost-optimization-3">
                          <Globe className="h-4 w-4 text-purple-600" />
                          <AlertTitle className="text-purple-800">Platform Optimization</AlertTitle>
                          <AlertDescription className="text-purple-700 text-sm">
                            Switch to annual Coursera subscription saves €1,200/year
                          </AlertDescription>
                        </Alert>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">Potential Savings</h4>
                        <div className="text-2xl font-bold text-green-600">€8,400</div>
                        <div className="text-sm text-green-700">21% cost reduction possible</div>
                      </div>

                      <Button className="w-full bg-green-600 hover:bg-green-700" data-testid="hr-button-apply-optimizations-budget">
                        <Wand2 className="h-4 w-4 mr-2" />
                        Apply Optimizations
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* ROI Analytics & Performance */}
                <Card className="border-gray-200" data-testid="hr-budget-roi-analytics">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LineChart className="h-5 w-5 text-indigo-600" />
                      ROI Analytics & Training Effectiveness
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* ROI by Training Program */}
                    <div className="space-y-4">
                      <h4 className="font-medium">ROI by Training Program</h4>
                      {[
                        { 
                          program: 'Leadership Development', 
                          cost: 15000, 
                          roi: 420, 
                          participants: 24,
                          productivity_increase: '28%',
                          retention_improvement: '15%'
                        },
                        { 
                          program: 'Technical Skills Bootcamp', 
                          cost: 12000, 
                          roi: 285, 
                          participants: 18,
                          productivity_increase: '22%',
                          retention_improvement: '8%'
                        },
                        { 
                          program: 'Customer Service Excellence', 
                          cost: 8000, 
                          roi: 380, 
                          participants: 32,
                          productivity_increase: '31%',
                          retention_improvement: '12%'
                        }
                      ].map((program, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200"
                          data-testid={`hr-roi-program-${idx}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-semibold text-lg">{program.program}</h5>
                            <Badge className="bg-green-100 text-green-700 text-sm">
                              {program.roi}% ROI
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Investment:</span>
                              <div className="font-semibold">€{program.cost.toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Participants:</span>
                              <div className="font-semibold">{program.participants}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Productivity:</span>
                              <div className="font-semibold text-green-600">+{program.productivity_increase}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Retention:</span>
                              <div className="font-semibold text-blue-600">+{program.retention_improvement}</div>
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-indigo-200">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Estimated Return:</span>
                              <span className="font-semibold text-lg">
                                €{((program.cost * program.roi) / 100).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-600">15%</div>
                        <div className="text-sm text-green-700">Employee Retention Improvement</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600">27%</div>
                        <div className="text-sm text-blue-700">Productivity Increase</div>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="text-2xl font-bold text-purple-600">92%</div>
                        <div className="text-sm text-purple-700">Employee Satisfaction</div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button variant="outline" data-testid="hr-button-export-roi-report">
                        <Download className="h-4 w-4 mr-2" />
                        Export ROI Report
                      </Button>
                      <Button data-testid="hr-button-schedule-budget-review">
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  };

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

  const renderSettings = () => {
    // Settings & Configuration Advanced Metrics
    const settingsMetrics = {
      systemUptime: 99.97,
      policyComplianceRate: 98.4,
      workflowAutomationCoverage: 85,
      integrationHealthScore: 94.1,
      customReportUsage: 147,
      accessControlViolations: 0,
      activeIntegrations: 12,
      activePolicies: 34,
      workflowsDeployed: 18,
      complianceAudits: 3,
      systemUsers: 125
    };

    return (
      <div className="space-y-6">
        {/* Enterprise Settings Control Center Header */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-settings-control-center-header">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-600" />
              Enterprise HR Control Center
              <Badge variant="outline" className="ml-auto bg-indigo-50 text-indigo-700">
                12+ Integrazioni Attive
              </Badge>
            </CardTitle>
            <CardDescription>
              Advanced system configuration con policy management, workflow automation e integrations monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Advanced Settings KPIs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border border-green-200"
                data-testid="hr-settings-kpi-uptime"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-600">{settingsMetrics.systemUptime}%</p>
                    <p className="text-xs text-green-700">System Uptime</p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200"
                data-testid="hr-settings-kpi-policy-compliance"
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{settingsMetrics.policyComplianceRate}%</p>
                    <p className="text-xs text-blue-700">Policy Compliance</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200"
                data-testid="hr-settings-kpi-automation"
              >
                <div className="flex items-center gap-3">
                  <Cpu className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{settingsMetrics.workflowAutomationCoverage}%</p>
                    <p className="text-xs text-purple-700">Workflow Automation</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200"
                data-testid="hr-settings-kpi-integration-health"
              >
                <div className="flex items-center gap-3">
                  <Globe className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{settingsMetrics.integrationHealthScore}%</p>
                    <p className="text-xs text-orange-700">Integration Health</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Enterprise Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <Button 
                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                data-testid="hr-button-policy-manager"
              >
                <FileText className="h-4 w-4 mr-2" />
                Policy Manager
              </Button>
              <Button 
                variant="outline" 
                className="hover:bg-green-50 hover:border-green-200"
                data-testid="hr-button-workflow-designer"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Workflow Designer
              </Button>
              <Button 
                variant="outline" 
                className="hover:bg-blue-50 hover:border-blue-200"
                data-testid="hr-button-integration-hub"
              >
                <Globe className="h-4 w-4 mr-2" />
                Integration Hub
              </Button>
              <Button 
                variant="outline" 
                className="hover:bg-orange-50 hover:border-orange-200"
                data-testid="hr-button-compliance-center"
              >
                <Shield className="h-4 w-4 mr-2" />
                Compliance Center
              </Button>
              <Button 
                variant="outline" 
                className="hover:bg-purple-50 hover:border-purple-200"
                data-testid="hr-button-report-builder"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Report Builder ({settingsMetrics.customReportUsage})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Enterprise Settings Sub-Tabs */}
        <Card className="backdrop-blur-xl bg-white/80 border-white/20" data-testid="hr-card-settings-enterprise-tabs">
          <CardContent className="p-0">
            <Tabs defaultValue="policies" className="w-full">
              <div className="border-b border-gray-200 px-6 pt-6">
                <TabsList className="grid w-full grid-cols-5 bg-gray-50/50">
                  <TabsTrigger 
                    value="policies" 
                    className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700"
                    data-testid="hr-settings-tab-policies"
                  >
                    HR Policies
                  </TabsTrigger>
                  <TabsTrigger 
                    value="workflows" 
                    className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700"
                    data-testid="hr-settings-tab-workflows"
                  >
                    Workflow Designer
                  </TabsTrigger>
                  <TabsTrigger 
                    value="integrations" 
                    className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
                    data-testid="hr-settings-tab-integrations"
                  >
                    System Integrations
                  </TabsTrigger>
                  <TabsTrigger 
                    value="compliance" 
                    className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700"
                    data-testid="hr-settings-tab-compliance"
                  >
                    Compliance Config
                  </TabsTrigger>
                  <TabsTrigger 
                    value="reports" 
                    className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
                    data-testid="hr-settings-tab-reports"
                  >
                    Custom Reports
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* HR Policies Tab */}
              <TabsContent value="policies" className="p-6 space-y-6" data-testid="hr-settings-content-policies">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    Dynamic HR Policy Configuration
                  </h3>
                  <Button 
                    className="bg-indigo-600 hover:bg-indigo-700"
                    data-testid="hr-button-create-policy"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Policy
                  </Button>
                </div>

                {/* Policy Management Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="border-indigo-200" data-testid="hr-policies-overview">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FileCheck className="h-5 w-5 text-indigo-600" />
                        Policy Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-indigo-600">{settingsMetrics.activePolicies}</div>
                        <div className="text-sm text-indigo-700">Active Policies</div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Published</span>
                          <Badge variant="secondary">{settingsMetrics.activePolicies - 3}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Draft</span>
                          <Badge variant="outline">3</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Pending Review</span>
                          <Badge variant="destructive">2</Badge>
                        </div>
                      </div>

                      <Progress value={settingsMetrics.policyComplianceRate} className="h-3" />
                      <div className="text-center text-sm text-gray-600">
                        {settingsMetrics.policyComplianceRate}% Compliance Rate
                      </div>
                    </CardContent>
                  </Card>

                  {/* Version Management */}
                  <Card className="border-green-200" data-testid="hr-policies-version-management">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <History className="h-5 w-5 text-green-600" />
                        Version Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-3">
                        {[
                          { policy: 'Remote Work Policy', version: '2.1', status: 'active', changes: 5 },
                          { policy: 'Leave Policy', version: '1.8', status: 'review', changes: 2 },
                          { policy: 'Performance Review', version: '3.0', status: 'draft', changes: 12 }
                        ].map((policy, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-gray-50" data-testid={`hr-policy-version-${idx}`}>
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-medium text-sm">{policy.policy}</h4>
                              <Badge className={
                                policy.status === 'active' ? 'bg-green-100 text-green-700' :
                                policy.status === 'review' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }>
                                v{policy.version}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-gray-600">{policy.changes} changes</span>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" data-testid={`hr-button-view-policy-${idx}`}>
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" data-testid={`hr-button-rollback-policy-${idx}`}>
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button variant="outline" className="w-full" data-testid="hr-button-version-history">
                        <History className="h-4 w-4 mr-2" />
                        Full Version History
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Approval Workflows */}
                  <Card className="border-blue-200" data-testid="hr-policies-approval-workflows">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="h-5 w-5 text-blue-600" />
                        Approval Workflows
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Pending Approvals</h4>
                        {[
                          { policy: 'Hybrid Work Guidelines', approver: 'CEO', stage: '2/3' },
                          { policy: 'Expense Policy Update', approver: 'CFO', stage: '1/2' }
                        ].map((approval, idx) => (
                          <Alert key={idx} className="p-3 border-blue-200 bg-blue-50" data-testid={`hr-policy-approval-${idx}`}>
                            <Clock className="h-4 w-4 text-blue-600" />
                            <AlertTitle className="text-sm font-medium">{approval.policy}</AlertTitle>
                            <AlertDescription className="text-xs">
                              <div className="flex justify-between items-center mt-1">
                                <span>Awaiting: {approval.approver}</span>
                                <Badge variant="outline" className="text-xs">
                                  Stage {approval.stage}
                                </Badge>
                              </div>
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>

                      <Button variant="outline" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50" data-testid="hr-button-approval-queue">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Manage Approval Queue
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Policy Management Table */}
                <Card className="border-gray-200" data-testid="hr-policies-management-table">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-gray-600" />
                      Policy Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Input 
                          placeholder="Search policies..." 
                          className="max-w-sm"
                          data-testid="hr-input-search-policies"
                        />
                        <Select defaultValue="all">
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Filter by status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Policies</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="review">Under Review</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="outline" data-testid="hr-button-export-policies">
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </div>

                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Policy Name</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Version</TableHead>
                              <TableHead>Last Updated</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Compliance</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[
                              {
                                name: 'Remote Work Policy',
                                category: 'Work Arrangements',
                                version: '2.1',
                                lastUpdated: '2024-12-15',
                                status: 'active',
                                compliance: 98
                              },
                              {
                                name: 'Performance Review Guidelines',
                                category: 'Performance Management',
                                version: '3.0',
                                lastUpdated: '2024-12-10',
                                status: 'draft',
                                compliance: 0
                              },
                              {
                                name: 'Code of Conduct',
                                category: 'Ethics & Compliance',
                                version: '1.5',
                                lastUpdated: '2024-11-30',
                                status: 'active',
                                compliance: 100
                              }
                            ].map((policy, idx) => (
                              <TableRow key={idx} data-testid={`hr-policy-row-${idx}`}>
                                <TableCell className="font-medium">{policy.name}</TableCell>
                                <TableCell>{policy.category}</TableCell>
                                <TableCell>v{policy.version}</TableCell>
                                <TableCell>{policy.lastUpdated}</TableCell>
                                <TableCell>
                                  <Badge className={
                                    policy.status === 'active' ? 'bg-green-100 text-green-700' :
                                    policy.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }>
                                    {policy.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress value={policy.compliance} className="w-16 h-2" />
                                    <span className="text-sm">{policy.compliance}%</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center gap-2 justify-end">
                                    <Button variant="ghost" size="sm" data-testid={`hr-button-view-policy-table-${idx}`}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" data-testid={`hr-button-edit-policy-${idx}`}>
                                      <Edit3 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" data-testid={`hr-button-history-policy-${idx}`}>
                                      <History className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Workflow Designer Tab */}
              <TabsContent value="workflows" className="p-6 space-y-6" data-testid="hr-settings-content-workflows">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-green-600" />
                    Visual Workflow Configuration Designer
                  </h3>
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="hr-button-create-workflow"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Workflow
                  </Button>
                </div>

                {/* Workflow Designer Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-green-200" data-testid="hr-workflows-designer-canvas">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-green-600" />
                        Drag & Drop Workflow Designer
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Workflow Canvas */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 min-h-96 bg-gray-50/50">
                        <div className="text-center text-gray-500 mb-6">
                          <Wand2 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                          <p className="text-lg font-medium">Workflow Canvas</p>
                          <p className="text-sm">Drag components from the sidebar to build your workflow</p>
                        </div>

                        {/* Sample Workflow Elements */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              className="flex items-center gap-3 p-3 bg-blue-100 border border-blue-200 rounded-lg cursor-move"
                              data-testid="hr-workflow-element-start"
                            >
                              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                              <span className="text-sm font-medium">Start: Leave Request Submitted</span>
                            </motion.div>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              className="flex items-center gap-3 p-3 bg-yellow-100 border border-yellow-200 rounded-lg cursor-move"
                              data-testid="hr-workflow-element-approval"
                            >
                              <div className="w-3 h-3 bg-yellow-600 rounded-full"></div>
                              <span className="text-sm font-medium">Manager Approval</span>
                            </motion.div>
                          </div>
                          
                          <div className="flex items-center justify-center">
                            <ArrowDown className="h-4 w-4 text-gray-400" />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              className="flex items-center gap-3 p-3 bg-purple-100 border border-purple-200 rounded-lg cursor-move"
                              data-testid="hr-workflow-element-hr-review"
                            >
                              <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                              <span className="text-sm font-medium">HR Review</span>
                            </motion.div>
                            <ArrowRight className="h-4 w-4 text-gray-400" />
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              className="flex items-center gap-3 p-3 bg-green-100 border border-green-200 rounded-lg cursor-move"
                              data-testid="hr-workflow-element-approved"
                            >
                              <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                              <span className="text-sm font-medium">End: Approved</span>
                            </motion.div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" data-testid="hr-button-save-workflow">
                          <Save className="h-4 w-4 mr-2" />
                          Save Draft
                        </Button>
                        <Button className="flex-1 bg-green-600 hover:bg-green-700" data-testid="hr-button-deploy-workflow">
                          <Rocket className="h-4 w-4 mr-2" />
                          Deploy
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-200" data-testid="hr-workflows-component-library">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Box className="h-5 w-5 text-blue-600" />
                        Component Library
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-blue-700">Triggers</h4>
                        <div className="space-y-2">
                          {[
                            { name: 'Form Submission', icon: FileText },
                            { name: 'Time Schedule', icon: Clock },
                            { name: 'Status Change', icon: RefreshCw }
                          ].map((component, idx) => (
                            <motion.div
                              key={idx}
                              whileHover={{ scale: 1.02 }}
                              className="flex items-center gap-3 p-2 border border-blue-200 rounded cursor-move hover:bg-blue-50"
                              data-testid={`hr-workflow-trigger-${idx}`}
                            >
                              <component.icon className="h-4 w-4 text-blue-600" />
                              <span className="text-sm">{component.name}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-green-700">Actions</h4>
                        <div className="space-y-2">
                          {[
                            { name: 'Send Email', icon: Mail },
                            { name: 'Approve/Reject', icon: CheckCircle },
                            { name: 'Update Record', icon: Edit3 },
                            { name: 'Create Task', icon: Plus }
                          ].map((component, idx) => (
                            <motion.div
                              key={idx}
                              whileHover={{ scale: 1.02 }}
                              className="flex items-center gap-3 p-2 border border-green-200 rounded cursor-move hover:bg-green-50"
                              data-testid={`hr-workflow-action-${idx}`}
                            >
                              <component.icon className="h-4 w-4 text-green-600" />
                              <span className="text-sm">{component.name}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-purple-700">Conditions</h4>
                        <div className="space-y-2">
                          {[
                            { name: 'If/Then Logic', icon: GitBranch },
                            { name: 'Data Validation', icon: CheckSquare },
                            { name: 'Time Condition', icon: Timer }
                          ].map((component, idx) => (
                            <motion.div
                              key={idx}
                              whileHover={{ scale: 1.02 }}
                              className="flex items-center gap-3 p-2 border border-purple-200 rounded cursor-move hover:bg-purple-50"
                              data-testid={`hr-workflow-condition-${idx}`}
                            >
                              <component.icon className="h-4 w-4 text-purple-600" />
                              <span className="text-sm">{component.name}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Active Workflows */}
                <Card className="border-gray-200" data-testid="hr-workflows-active-list">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-gray-600" />
                      Active Workflows
                      <Badge variant="outline" className="ml-auto">{settingsMetrics.workflowsDeployed} Deployed</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { 
                          name: 'Leave Request Approval', 
                          trigger: 'Form Submission',
                          steps: 4,
                          executed: 127,
                          success_rate: 96,
                          avg_time: '2.3 days',
                          status: 'active'
                        },
                        { 
                          name: 'Performance Review Process', 
                          trigger: 'Time Schedule',
                          steps: 6,
                          executed: 45,
                          success_rate: 89,
                          avg_time: '5.1 days',
                          status: 'active'
                        },
                        { 
                          name: 'Expense Approval Chain', 
                          trigger: 'Form Submission',
                          steps: 3,
                          executed: 234,
                          success_rate: 98,
                          avg_time: '1.2 days',
                          status: 'active'
                        }
                      ].map((workflow, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="p-4 rounded-lg bg-gradient-to-r from-white to-gray-50 border border-gray-200 hover:shadow-md transition-all"
                          data-testid={`hr-workflow-${idx}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-lg">{workflow.name}</h4>
                                <Badge className="bg-green-100 text-green-700">
                                  {workflow.status}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                                <div className="flex items-center gap-2">
                                  <Zap className="h-4 w-4" />
                                  {workflow.trigger}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Layers className="h-4 w-4" />
                                  {workflow.steps} steps
                                </div>
                                <div className="flex items-center gap-2">
                                  <Activity className="h-4 w-4" />
                                  {workflow.executed} executions
                                </div>
                                <div className="flex items-center gap-2">
                                  <Timer className="h-4 w-4" />
                                  {workflow.avg_time} avg time
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-600">Success Rate:</span>
                                <Progress value={workflow.success_rate} className="flex-1 max-w-32" />
                                <span className="text-sm font-medium">{workflow.success_rate}%</span>
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 ml-4">
                              <Button variant="ghost" size="sm" data-testid={`hr-button-view-workflow-${idx}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`hr-button-edit-workflow-${idx}`}>
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`hr-button-analytics-workflow-${idx}`}>
                                <BarChart3 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* System Integrations Tab */}
              <TabsContent value="integrations" className="p-6 space-y-6" data-testid="hr-settings-content-integrations">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-600" />
                    System Integration Management Hub
                  </h3>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="hr-button-add-integration"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Integration
                  </Button>
                </div>

                {/* Integration Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  <Card className="border-green-200" data-testid="hr-integrations-overview">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Active Integrations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">{settingsMetrics.activeIntegrations}</div>
                        <div className="text-sm text-green-700">Connected Systems</div>
                        <div className="mt-2">
                          <Progress value={settingsMetrics.integrationHealthScore} className="h-2" />
                          <div className="text-xs text-gray-600 mt-1">
                            Health: {settingsMetrics.integrationHealthScore}%
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-200" data-testid="hr-integrations-payroll">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Payroll Systems</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">3</div>
                        <div className="text-sm text-blue-700">Connected</div>
                        <div className="mt-2 space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>ADP:</span>
                            <Badge className="bg-green-100 text-green-700">Active</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>BambooHR:</span>
                            <Badge className="bg-green-100 text-green-700">Active</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Workday:</span>
                            <Badge className="bg-yellow-100 text-yellow-700">Setup</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-purple-200" data-testid="hr-integrations-benefits">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Benefits Platforms</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600">4</div>
                        <div className="text-sm text-purple-700">Connected</div>
                        <div className="mt-2 space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>Sync Rate:</span>
                            <span className="font-medium">98.7%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Last Sync:</span>
                            <span className="font-medium">2 min ago</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-orange-200" data-testid="hr-integrations-analytics">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Data Analytics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-600">5</div>
                        <div className="text-sm text-orange-700">Tools Connected</div>
                        <div className="mt-2 space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>Data Flow:</span>
                            <Badge className="bg-green-100 text-green-700">Live</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Reports:</span>
                            <span className="font-medium">{settingsMetrics.customReportUsage}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Integration Management Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    {
                      name: 'ADP Workforce Now',
                      category: 'Payroll',
                      status: 'connected',
                      health: 98,
                      lastSync: '2 minutes ago',
                      version: '3.2.1',
                      features: ['Payroll Sync', 'Employee Data', 'Time Tracking']
                    },
                    {
                      name: 'BambooHR',
                      category: 'HRIS',
                      status: 'connected',
                      health: 96,
                      lastSync: '5 minutes ago',
                      version: '2.8.4',
                      features: ['Employee Records', 'Performance', 'Recruiting']
                    },
                    {
                      name: 'Slack',
                      category: 'Communication',
                      status: 'connected',
                      health: 100,
                      lastSync: '1 minute ago',
                      version: '1.5.0',
                      features: ['Notifications', 'Team Updates', 'Bot Integration']
                    },
                    {
                      name: 'Microsoft 365',
                      category: 'Productivity',
                      status: 'connected',
                      health: 94,
                      lastSync: '3 minutes ago',
                      version: '4.1.2',
                      features: ['SSO', 'Calendar Sync', 'Email Integration']
                    },
                    {
                      name: 'Tableau',
                      category: 'Analytics',
                      status: 'connected',
                      health: 92,
                      lastSync: '8 minutes ago',
                      version: '2.3.0',
                      features: ['Data Visualization', 'Custom Reports', 'Dashboard']
                    },
                    {
                      name: 'Workday',
                      category: 'Enterprise HCM',
                      status: 'setup',
                      health: 0,
                      lastSync: 'Never',
                      version: 'Pending',
                      features: ['Full HCM Suite', 'Advanced Analytics', 'Global Payroll']
                    }
                  ].map((integration, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.02 }}
                      className={`p-4 rounded-lg border ${
                        integration.status === 'connected' 
                          ? 'bg-gradient-to-br from-green-50 to-white border-green-200' 
                          : 'bg-gradient-to-br from-gray-50 to-white border-gray-200'
                      }`}
                      data-testid={`hr-integration-${idx}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-lg">{integration.name}</h4>
                        <Badge className={
                          integration.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }>
                          {integration.status}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Category:</span>
                          <span className="font-medium">{integration.category}</span>
                        </div>
                        
                        {integration.status === 'connected' && (
                          <>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Health:</span>
                              <div className="flex items-center gap-2">
                                <Progress value={integration.health} className="w-16 h-2" />
                                <span className="font-medium">{integration.health}%</span>
                              </div>
                            </div>
                            
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Last Sync:</span>
                              <span className="font-medium">{integration.lastSync}</span>
                            </div>
                            
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Version:</span>
                              <span className="font-medium">{integration.version}</span>
                            </div>
                          </>
                        )}

                        <div className="space-y-2">
                          <div className="text-sm text-gray-600">Features:</div>
                          <div className="flex flex-wrap gap-1">
                            {integration.features.map((feature, featureIdx) => (
                              <Badge key={featureIdx} variant="secondary" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-3 border-t">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            data-testid={`hr-button-configure-integration-${idx}`}
                          >
                            <Settings className="h-3 w-3 mr-2" />
                            Configure
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            data-testid={`hr-button-test-integration-${idx}`}
                          >
                            <Activity className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Integration Health Monitoring */}
                <Card className="border-gray-200" data-testid="hr-integrations-health-monitoring">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5 text-indigo-600" />
                      Integration Health Monitoring
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="text-2xl font-bold text-green-600">99.2%</div>
                          <div className="text-sm text-green-700">System Uptime</div>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-2xl font-bold text-blue-600">4.8s</div>
                          <div className="text-sm text-blue-700">Avg Response Time</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="text-2xl font-bold text-purple-600">847</div>
                          <div className="text-sm text-purple-700">API Calls Today</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-medium">Recent Integration Events</h4>
                        {[
                          { time: '2 min ago', event: 'ADP Payroll sync completed successfully', type: 'success' },
                          { time: '5 min ago', event: 'BambooHR employee data updated (47 records)', type: 'info' },
                          { time: '12 min ago', event: 'Slack notification sent: Performance reviews due', type: 'info' },
                          { time: '1 hour ago', event: 'Microsoft 365 authentication renewed', type: 'success' }
                        ].map((event, idx) => (
                          <Alert 
                            key={idx}
                            className={`p-3 ${
                              event.type === 'success' ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'
                            }`}
                            data-testid={`hr-integration-event-${idx}`}
                          >
                            <CheckCircle className={`h-4 w-4 ${
                              event.type === 'success' ? 'text-green-600' : 'text-blue-600'
                            }`} />
                            <AlertDescription className="text-sm">
                              <div className="flex justify-between items-center">
                                <span>{event.event}</span>
                                <span className="text-xs text-gray-500">{event.time}</span>
                              </div>
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Compliance Configuration Tab */}
              <TabsContent value="compliance" className="p-6 space-y-6" data-testid="hr-settings-content-compliance">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Shield className="h-5 w-5 text-orange-600" />
                    Advanced Compliance Configuration
                  </h3>
                  <Button 
                    className="bg-orange-600 hover:bg-orange-700"
                    data-testid="hr-button-compliance-audit"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Run Audit
                  </Button>
                </div>

                {/* Compliance Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  <Card className="border-green-200" data-testid="hr-compliance-overview">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Compliance Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="text-4xl font-bold text-green-600">{settingsMetrics.policyComplianceRate}%</div>
                        <div className="text-sm text-green-700">Overall Compliance</div>
                        <Progress value={settingsMetrics.policyComplianceRate} className="mt-2 h-2" />
                        <div className="text-xs text-green-600 mt-1">Target: 98%</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-200" data-testid="hr-compliance-audits">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Compliance Audits</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">{settingsMetrics.complianceAudits}</div>
                        <div className="text-sm text-blue-700">This Quarter</div>
                        <div className="mt-2 space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>Passed:</span>
                            <Badge className="bg-green-100 text-green-700">{settingsMetrics.complianceAudits}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Failed:</span>
                            <Badge className="bg-red-100 text-red-700">0</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-purple-200" data-testid="hr-compliance-violations">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Violations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600">{settingsMetrics.accessControlViolations}</div>
                        <div className="text-sm text-purple-700">This Month</div>
                        <div className="mt-2">
                          <Badge className="bg-green-100 text-green-700">
                            Zero Violations
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-orange-200" data-testid="hr-compliance-regulatory">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Regulatory Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-600">100%</div>
                        <div className="text-sm text-orange-700">GDPR Compliant</div>
                        <div className="mt-2 space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>SOX:</span>
                            <Badge className="bg-green-100 text-green-700">✓</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>ISO 27001:</span>
                            <Badge className="bg-green-100 text-green-700">✓</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Compliance Configuration Sections */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-gray-200" data-testid="hr-compliance-audit-trail">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-gray-600" />
                        Audit Trail Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        {[
                          { category: 'User Authentication', logging: 'enabled', retention: '7 years' },
                          { category: 'Data Access', logging: 'enabled', retention: '5 years' },
                          { category: 'Policy Changes', logging: 'enabled', retention: '10 years' },
                          { category: 'System Configuration', logging: 'enabled', retention: '3 years' }
                        ].map((config, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg" data-testid={`hr-audit-config-${idx}`}>
                            <div>
                              <h4 className="font-medium text-sm">{config.category}</h4>
                              <p className="text-xs text-gray-600">Retention: {config.retention}</p>
                            </div>
                            <Badge className={
                              config.logging === 'enabled' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }>
                              {config.logging}
                            </Badge>
                          </div>
                        ))}
                      </div>

                      <Button variant="outline" className="w-full" data-testid="hr-button-audit-settings">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure Audit Settings
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-green-200" data-testid="hr-compliance-regulatory-reporting">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileCheck className="h-5 w-5 text-green-600" />
                        Regulatory Reporting Automation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        {[
                          { 
                            report: 'GDPR Data Processing Record', 
                            frequency: 'Monthly',
                            next_due: '2024-12-31',
                            status: 'automated'
                          },
                          { 
                            report: 'Equal Employment Opportunity', 
                            frequency: 'Quarterly',
                            next_due: '2025-01-15',
                            status: 'automated'
                          },
                          { 
                            report: 'Workplace Safety Compliance', 
                            frequency: 'Annual',
                            next_due: '2025-03-01',
                            status: 'manual'
                          }
                        ].map((report, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded-lg" data-testid={`hr-regulatory-report-${idx}`}>
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-medium text-sm">{report.report}</h4>
                              <Badge className={
                                report.status === 'automated' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                              }>
                                {report.status}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-600">
                              <span>{report.frequency}</span>
                              <span>Due: {report.next_due}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button variant="outline" className="w-full" data-testid="hr-button-reporting-automation">
                        <Cpu className="h-4 w-4 mr-2" />
                        Manage Automation
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Compliance Monitoring */}
                <Card className="border-gray-200" data-testid="hr-compliance-monitoring">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Monitor className="h-5 w-5 text-indigo-600" />
                      Real-time Compliance Monitoring
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-xl font-bold text-green-600">45</div>
                        <div className="text-xs text-green-700">Active Policies</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-xl font-bold text-blue-600">12</div>
                        <div className="text-xs text-blue-700">Compliance Checks</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="text-xl font-bold text-purple-600">3</div>
                        <div className="text-xs text-purple-700">Risk Assessments</div>
                      </div>
                      <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="text-xl font-bold text-orange-600">0</div>
                        <div className="text-xs text-orange-700">Open Issues</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Recent Compliance Activities</h4>
                      {[
                        { time: '1 hour ago', activity: 'GDPR data processing audit completed - No issues found', type: 'success' },
                        { time: '3 hours ago', activity: 'Policy review: Remote Work Policy v2.1 approved', type: 'info' },
                        { time: '6 hours ago', activity: 'Automated compliance check: Access controls verified', type: 'success' },
                        { time: '1 day ago', activity: 'Quarterly SOX compliance report generated and submitted', type: 'info' }
                      ].map((activity, idx) => (
                        <Alert 
                          key={idx}
                          className={`p-3 ${
                            activity.type === 'success' ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'
                          }`}
                          data-testid={`hr-compliance-activity-${idx}`}
                        >
                          <CheckCircle className={`h-4 w-4 ${
                            activity.type === 'success' ? 'text-green-600' : 'text-blue-600'
                          }`} />
                          <AlertDescription className="text-sm">
                            <div className="flex justify-between items-center">
                              <span>{activity.activity}</span>
                              <span className="text-xs text-gray-500">{activity.time}</span>
                            </div>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Custom Reports Tab */}
              <TabsContent value="reports" className="p-6 space-y-6" data-testid="hr-settings-content-reports">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    Custom Dashboard Builder
                  </h3>
                  <Button 
                    className="bg-purple-600 hover:bg-purple-700"
                    data-testid="hr-button-create-report"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Report
                  </Button>
                </div>

                {/* Report Builder Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-purple-200" data-testid="hr-reports-builder-canvas">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-purple-600" />
                        Drag & Drop Dashboard Builder
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Dashboard Canvas */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 min-h-96 bg-gray-50/50">
                        <div className="text-center text-gray-500 mb-6">
                          <BarChart3 className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                          <p className="text-lg font-medium">Dashboard Canvas</p>
                          <p className="text-sm">Drag chart components to build your custom report</p>
                        </div>

                        {/* Sample Dashboard Components */}
                        <div className="grid grid-cols-2 gap-4">
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="p-4 bg-white border border-gray-200 rounded-lg cursor-move shadow-sm"
                            data-testid="hr-report-component-attendance"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="h-4 w-4 text-blue-600" />
                              <h4 className="font-medium text-sm">Attendance Overview</h4>
                            </div>
                            <div className="h-16 bg-blue-50 rounded flex items-center justify-center">
                              <BarChart3 className="h-8 w-8 text-blue-300" />
                            </div>
                          </motion.div>

                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="p-4 bg-white border border-gray-200 rounded-lg cursor-move shadow-sm"
                            data-testid="hr-report-component-performance"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              <h4 className="font-medium text-sm">Performance Metrics</h4>
                            </div>
                            <div className="h-16 bg-green-50 rounded flex items-center justify-center">
                              <PieChart className="h-8 w-8 text-green-300" />
                            </div>
                          </motion.div>

                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="p-4 bg-white border border-gray-200 rounded-lg cursor-move shadow-sm"
                            data-testid="hr-report-component-training"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <GraduationCap className="h-4 w-4 text-purple-600" />
                              <h4 className="font-medium text-sm">Training Progress</h4>
                            </div>
                            <div className="h-16 bg-purple-50 rounded flex items-center justify-center">
                              <LineChart className="h-8 w-8 text-purple-300" />
                            </div>
                          </motion.div>

                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="p-4 bg-white border border-gray-200 rounded-lg cursor-move shadow-sm"
                            data-testid="hr-report-component-costs"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <DollarSign className="h-4 w-4 text-orange-600" />
                              <h4 className="font-medium text-sm">Cost Analysis</h4>
                            </div>
                            <div className="h-16 bg-orange-50 rounded flex items-center justify-center">
                              <BarChart3 className="h-8 w-8 text-orange-300" />
                            </div>
                          </motion.div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" data-testid="hr-button-save-report">
                          <Save className="h-4 w-4 mr-2" />
                          Save Draft
                        </Button>
                        <Button className="flex-1 bg-purple-600 hover:bg-purple-700" data-testid="hr-button-publish-report">
                          <Rocket className="h-4 w-4 mr-2" />
                          Publish
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-gray-200" data-testid="hr-reports-component-library">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Box className="h-5 w-5 text-gray-600" />
                        Component Library
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-blue-700">Charts</h4>
                        <div className="space-y-2">
                          {[
                            { name: 'Bar Chart', icon: BarChart3 },
                            { name: 'Line Chart', icon: LineChart },
                            { name: 'Pie Chart', icon: PieChart },
                            { name: 'Area Chart', icon: TrendingUp }
                          ].map((component, idx) => (
                            <motion.div
                              key={idx}
                              whileHover={{ scale: 1.02 }}
                              className="flex items-center gap-3 p-2 border border-blue-200 rounded cursor-move hover:bg-blue-50"
                              data-testid={`hr-report-chart-${idx}`}
                            >
                              <component.icon className="h-4 w-4 text-blue-600" />
                              <span className="text-sm">{component.name}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-green-700">Data Tables</h4>
                        <div className="space-y-2">
                          {[
                            { name: 'Employee List', icon: Users },
                            { name: 'Performance Table', icon: Target },
                            { name: 'Attendance Grid', icon: Calendar },
                            { name: 'Training Records', icon: BookOpen }
                          ].map((component, idx) => (
                            <motion.div
                              key={idx}
                              whileHover={{ scale: 1.02 }}
                              className="flex items-center gap-3 p-2 border border-green-200 rounded cursor-move hover:bg-green-50"
                              data-testid={`hr-report-table-${idx}`}
                            >
                              <component.icon className="h-4 w-4 text-green-600" />
                              <span className="text-sm">{component.name}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-purple-700">Metrics</h4>
                        <div className="space-y-2">
                          {[
                            { name: 'KPI Card', icon: Target },
                            { name: 'Progress Bar', icon: BarChart3 },
                            { name: 'Gauge Chart', icon: Activity },
                            { name: 'Number Display', icon: Hash }
                          ].map((component, idx) => (
                            <motion.div
                              key={idx}
                              whileHover={{ scale: 1.02 }}
                              className="flex items-center gap-3 p-2 border border-purple-200 rounded cursor-move hover:bg-purple-50"
                              data-testid={`hr-report-metric-${idx}`}
                            >
                              <component.icon className="h-4 w-4 text-purple-600" />
                              <span className="text-sm">{component.name}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Active Reports */}
                <Card className="border-gray-200" data-testid="hr-reports-active-list">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-gray-600" />
                      Active Custom Reports
                      <Badge variant="outline" className="ml-auto">{settingsMetrics.customReportUsage} Reports</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { 
                          name: 'Executive HR Dashboard', 
                          type: 'Dashboard',
                          views: 234,
                          last_accessed: '2 hours ago',
                          components: 8,
                          shared_with: 5,
                          status: 'published'
                        },
                        { 
                          name: 'Monthly Performance Report', 
                          type: 'Report',
                          views: 89,
                          last_accessed: '1 day ago',
                          components: 12,
                          shared_with: 15,
                          status: 'published'
                        },
                        { 
                          name: 'Training ROI Analysis', 
                          type: 'Analytics',
                          views: 156,
                          last_accessed: '3 hours ago',
                          components: 6,
                          shared_with: 8,
                          status: 'draft'
                        }
                      ].map((report, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="p-4 rounded-lg bg-gradient-to-r from-white to-gray-50 border border-gray-200 hover:shadow-md transition-all"
                          data-testid={`hr-report-${idx}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-lg">{report.name}</h4>
                                <Badge variant="secondary">{report.type}</Badge>
                                <Badge className={
                                  report.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                }>
                                  {report.status}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                                <div className="flex items-center gap-2">
                                  <Eye className="h-4 w-4" />
                                  {report.views} views
                                </div>
                                <div className="flex items-center gap-2">
                                  <Layers className="h-4 w-4" />
                                  {report.components} components
                                </div>
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  {report.shared_with} users
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  {report.last_accessed}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 ml-4">
                              <Button variant="ghost" size="sm" data-testid={`hr-button-view-report-${idx}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`hr-button-edit-report-${idx}`}>
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" data-testid={`hr-button-share-report-${idx}`}>
                                <Share className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  };


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