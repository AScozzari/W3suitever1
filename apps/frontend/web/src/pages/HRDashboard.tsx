import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { 
  BarChart3,
  Users,
  Calendar as CalendarIcon,
  Briefcase,
  TrendingUp,
  Shield,
  FileText,
  Settings,
  Clock,
  DollarSign,
  Activity,
  AlertTriangle,
  Award,
  ChevronRight,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  Mail,
  Phone,
  Building,
  MapPin,
  UserPlus,
  UserCheck,
  UserX,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Info,
  Star,
  Target,
  Sparkles,
  Heart,
  ArrowUp,
  ArrowDown,
  Copy,
  MoreVertical,
  Globe,
  Layers,
  Zap,
  Gift,
  BookOpen,
  GraduationCap,
  Trophy,
  Cpu,
  Database,
  Lock,
  Unlock,
  Key,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  TrendingDown,
  Package,
  Palette,
  Timer,
  Sunrise,
  Sunset,
  Moon,
  Sun,
  Bell
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, subDays, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

// WindTre Colors
const WINDTRE_COLORS = {
  primary: '#FF6900',
  secondary: '#7B2CBF',
  accent: '#FF0090',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  dark: '#1F2937',
  light: '#F9FAFB'
};

// Chart colors palette
const CHART_COLORS = ['#FF6900', '#7B2CBF', '#FF0090', '#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6'];

// Types
interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  status: 'active' | 'leave' | 'inactive';
  email: string;
  phone: string;
  location: string;
  salary: number;
  startDate: string;
  lastLogin: string;
  avatar?: string;
  performance?: number;
  skills?: string[];
  certifications?: string[];
  emergencyContact?: string;
  address?: string;
  birthDate?: string;
  contractType?: string;
  manager?: string;
  team?: string[];
}

interface ShiftTemplate {
  id: string;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  requiredStaff: number;
  recurrence: 'daily' | 'weekly' | 'monthly' | 'custom';
  daysOfWeek?: number[];
  createdAt: string;
  createdBy: string;
  isActive: boolean;
  color: string;
  storeId?: string;
  roles?: string[];
}

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'vacation' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'other';
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reason: string;
  approvedBy?: string;
  approvedDate?: string;
  notes?: string;
  attachments?: string[];
}

export default function HRDashboard() {
  const tenant = localStorage.getItem('currentTenant') || 'staging';
  const { toast } = useToast();
  
  // Main tab state
  const [selectedTab, setSelectedTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  
  // States for different sections
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');
  const [selectedStore, setSelectedStore] = useState('all');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ShiftTemplate | null>(null);
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState<LeaveRequest | null>(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  
  // Animation counter for stats
  const [animatedStats, setAnimatedStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    onLeave: 0,
    pendingRequests: 0,
    attendanceRate: 0,
    turnoverRate: 0,
    newHires: 0,
    totalPayroll: 0
  });
  
  // Real stats
  const stats = {
    totalEmployees: 127,
    activeEmployees: 119,
    onLeave: 8,
    pendingRequests: 15,
    attendanceRate: 94.2,
    turnoverRate: 8.5,
    newHires: 3,
    totalPayroll: 847650
  };
  
  // Animate stats on mount and tab change
  useEffect(() => {
    const duration = 1500;
    const steps = 50;
    const interval = duration / steps;
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      
      setAnimatedStats({
        totalEmployees: Math.floor(stats.totalEmployees * progress),
        activeEmployees: Math.floor(stats.activeEmployees * progress),
        onLeave: Math.floor(stats.onLeave * progress),
        pendingRequests: Math.floor(stats.pendingRequests * progress),
        attendanceRate: parseFloat((stats.attendanceRate * progress).toFixed(1)),
        turnoverRate: parseFloat((stats.turnoverRate * progress).toFixed(1)),
        newHires: Math.floor(stats.newHires * progress),
        totalPayroll: Math.floor(stats.totalPayroll * progress)
      });
      
      if (currentStep >= steps) {
        clearInterval(timer);
        setAnimatedStats(stats);
      }
    }, interval);
    
    return () => clearInterval(timer);
  }, [selectedTab]);
  
  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Dashboard Overview', icon: BarChart3, badge: null },
    { id: 'employees', label: 'Dipendenti', icon: Users, badge: '127' },
    { id: 'shifts', label: 'Turni & Calendario', icon: CalendarIcon, badge: 'NEW' },
    { id: 'leave', label: 'Ferie & Permessi', icon: Briefcase, badge: '15' },
    { id: 'analytics', label: 'HR Analytics', icon: TrendingUp, badge: null },
    { id: 'compliance', label: 'Compliance & Reports', icon: Shield, badge: '✓' },
    { id: 'settings', label: 'Impostazioni HR', icon: Settings, badge: null }
  ];
  
  // Mock data
  const employees: Employee[] = [
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
      lastLogin: '2 ore fa',
      performance: 92,
      skills: ['Leadership', 'Communication', 'Problem Solving'],
      certifications: ['SHRM-CP', 'PHR'],
      contractType: 'Full-time',
      manager: 'CEO'
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
      lastLogin: '1 ora fa',
      performance: 88,
      skills: ['React', 'Node.js', 'TypeScript', 'Docker'],
      certifications: ['AWS Certified Developer'],
      contractType: 'Full-time',
      manager: 'CTO'
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
      lastLogin: '1 giorno fa',
      performance: 95,
      skills: ['Negotiation', 'CRM', 'Strategic Planning'],
      contractType: 'Full-time',
      manager: 'Sales Director'
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
      lastLogin: '30 min fa',
      performance: 79,
      skills: ['Social Media', 'Content Creation', 'SEO', 'Analytics'],
      contractType: 'Full-time',
      manager: 'Marketing Director'
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
      lastLogin: '15 min fa',
      performance: 91,
      skills: ['Kubernetes', 'CI/CD', 'AWS', 'Terraform'],
      certifications: ['CKA', 'AWS Solutions Architect'],
      contractType: 'Full-time',
      manager: 'CTO'
    }
  ];
  
  const shiftTemplates: ShiftTemplate[] = [
    {
      id: 'tpl-001',
      name: 'Turno Mattina',
      description: 'Turno standard del mattino',
      startTime: '08:00',
      endTime: '14:00',
      requiredStaff: 3,
      recurrence: 'daily',
      createdAt: '2024-01-15',
      createdBy: 'Mario Rossi',
      isActive: true,
      color: '#FF6900',
      roles: ['Sales', 'Cashier']
    },
    {
      id: 'tpl-002',
      name: 'Turno Pomeriggio',
      description: 'Turno standard del pomeriggio',
      startTime: '14:00',
      endTime: '20:00',
      requiredStaff: 4,
      recurrence: 'daily',
      createdAt: '2024-01-15',
      createdBy: 'Mario Rossi',
      isActive: true,
      color: '#7B2CBF',
      roles: ['Sales', 'Cashier', 'Manager']
    },
    {
      id: 'tpl-003',
      name: 'Turno Weekend',
      description: 'Turno speciale per il weekend',
      startTime: '09:00',
      endTime: '21:00',
      requiredStaff: 5,
      recurrence: 'weekly',
      daysOfWeek: [6, 0],
      createdAt: '2024-01-20',
      createdBy: 'Giulia Bianchi',
      isActive: true,
      color: '#10B981',
      roles: ['Sales', 'Cashier', 'Manager', 'Security']
    }
  ];
  
  const leaveRequests: LeaveRequest[] = [
    {
      id: 'leave-001',
      employeeId: 'emp-003',
      employeeName: 'Luca Verdi',
      type: 'vacation',
      startDate: '2024-02-01',
      endDate: '2024-02-10',
      status: 'approved',
      reason: 'Vacanza famiglia',
      approvedBy: 'Mario Rossi',
      approvedDate: '2024-01-20'
    },
    {
      id: 'leave-002',
      employeeId: 'emp-002',
      employeeName: 'Giulia Bianchi',
      type: 'sick',
      startDate: '2024-01-25',
      endDate: '2024-01-26',
      status: 'pending',
      reason: 'Influenza',
      attachments: ['certificato_medico.pdf']
    },
    {
      id: 'leave-003',
      employeeId: 'emp-004',
      employeeName: 'Anna Neri',
      type: 'personal',
      startDate: '2024-02-15',
      endDate: '2024-02-16',
      status: 'pending',
      reason: 'Motivi personali'
    }
  ];
  
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
    { name: 'Sviluppo', value: 42, color: WINDTRE_COLORS.primary },
    { name: 'Vendite', value: 28, color: WINDTRE_COLORS.secondary },
    { name: 'Marketing', value: 19, color: WINDTRE_COLORS.accent },
    { name: 'HR', value: 15, color: WINDTRE_COLORS.success },
    { name: 'Amministrazione', value: 23, color: WINDTRE_COLORS.warning }
  ];
  
  const turnoverData = [
    { month: 'Gen', turnover: 8.2, hires: 5, departures: 3 },
    { month: 'Feb', turnover: 7.8, hires: 4, departures: 2 },
    { month: 'Mar', turnover: 9.1, hires: 3, departures: 4 },
    { month: 'Apr', turnover: 7.5, hires: 6, departures: 2 },
    { month: 'Mag', turnover: 8.8, hires: 4, departures: 3 },
    { month: 'Giu', turnover: 8.5, hires: 3, departures: 3 }
  ];
  
  const performanceData = [
    { subject: 'Produttività', A: 85, B: 90, fullMark: 100 },
    { subject: 'Qualità', A: 88, B: 92, fullMark: 100 },
    { subject: 'Puntualità', A: 93, B: 95, fullMark: 100 },
    { subject: 'Teamwork', A: 90, B: 88, fullMark: 100 },
    { subject: 'Leadership', A: 82, B: 85, fullMark: 100 },
    { subject: 'Innovazione', A: 78, B: 83, fullMark: 100 }
  ];
  
  const salaryDistribution = [
    { range: '30-40k', count: 15 },
    { range: '40-50k', count: 32 },
    { range: '50-60k', count: 45 },
    { range: '60-70k', count: 28 },
    { range: '70-80k', count: 12 },
    { range: '80k+', count: 7 }
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
  
  // Render functions for each tab
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <Card className="relative overflow-hidden backdrop-blur-xl bg-white/80 border-white/20 hover:border-orange-500 transition-all duration-300 group hover:bg-gradient-to-br hover:from-orange-50 hover:to-white">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent group-hover:from-orange-500/20 transition-all duration-300" />
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600/0 to-orange-100/0 group-hover:from-orange-600/5 group-hover:to-orange-100/10 transition-all duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dipendenti Totali</CardTitle>
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.3 }}
              >
                <Users className="h-4 w-4 text-orange-600 group-hover:text-orange-500 transition-colors duration-300" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <motion.div 
                key={animatedStats.totalEmployees}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent"
              >
                <motion.span
                  key={animatedStats.totalEmployees}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  {animatedStats.totalEmployees}
                </motion.span>
              </motion.div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ArrowUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500">+2.5%</span> dal mese scorso
              </p>
              <Progress value={95} className="mt-2 h-1" />
            </CardContent>
          </Card>
        </motion.div>
        
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
          <Card className="relative overflow-hidden backdrop-blur-xl bg-white/80 border-white/20 hover:border-purple-500 transition-all duration-300 group hover:bg-gradient-to-br hover:from-purple-50 hover:to-white">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent group-hover:from-purple-500/20 transition-all duration-300" />
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 to-purple-100/0 group-hover:from-purple-600/5 group-hover:to-purple-100/10 transition-all duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dipendenti Attivi</CardTitle>
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.3 }}
              >
                <Activity className="h-4 w-4 text-purple-600 group-hover:text-purple-500 transition-colors duration-300" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <motion.div 
                key={animatedStats.activeEmployees}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
              >
                <motion.span
                  key={animatedStats.activeEmployees}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  {animatedStats.activeEmployees}
                </motion.span>
              </motion.div>
              <p className="text-xs text-muted-foreground">
                {animatedStats.onLeave} in ferie/permesso
              </p>
              <Progress value={93.7} className="mt-2 h-1" />
            </CardContent>
          </Card>
        </motion.div>
        
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
          <Card className="relative overflow-hidden backdrop-blur-xl bg-white/80 border-white/20 hover:border-green-500 transition-all duration-300 group hover:bg-gradient-to-br hover:from-green-50 hover:to-white">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent group-hover:from-green-500/20 transition-all duration-300" />
            <div className="absolute inset-0 bg-gradient-to-r from-green-600/0 to-green-100/0 group-hover:from-green-600/5 group-hover:to-green-100/10 transition-all duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasso Presenza</CardTitle>
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.3 }}
              >
                <CheckCircle2 className="h-4 w-4 text-green-600 group-hover:text-green-500 transition-colors duration-300" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <motion.div 
                key={animatedStats.attendanceRate}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent"
              >
                <motion.span
                  key={animatedStats.attendanceRate}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  {animatedStats.attendanceRate}%
                </motion.span>
              </motion.div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ArrowUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500">+1.2%</span> dalla settimana scorsa
              </p>
              <Progress value={animatedStats.attendanceRate} className="mt-2 h-1" />
            </CardContent>
          </Card>
        </motion.div>
        
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
          <Card className="relative overflow-hidden backdrop-blur-xl bg-white/80 border-white/20 hover:border-yellow-500 transition-all duration-300 group hover:bg-gradient-to-br hover:from-yellow-50 hover:to-white">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent group-hover:from-yellow-500/20 transition-all duration-300" />
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/0 to-yellow-100/0 group-hover:from-yellow-600/5 group-hover:to-yellow-100/10 transition-all duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Richieste Pendenti</CardTitle>
              <motion.div
                whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                transition={{ duration: 0.5 }}
              >
                <AlertTriangle className="h-4 w-4 text-yellow-600 group-hover:text-yellow-500 transition-colors duration-300" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <motion.div 
                key={animatedStats.pendingRequests}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent"
              >
                <motion.span
                  key={animatedStats.pendingRequests}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  {animatedStats.pendingRequests}
                </motion.span>
              </motion.div>
              <p className="text-xs text-muted-foreground">
                Richiede attenzione
              </p>
              <div className="mt-2 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={cn(
                    "h-1 flex-1 rounded",
                    i < 3 ? "bg-yellow-500" : "bg-gray-200"
                  )} />
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ 
            scale: 1.01,
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
            y: -2
          }}
          className="cursor-pointer"
        >
          <Card className="backdrop-blur-xl bg-white/80 border-white/20 hover:border-orange-300 transition-all duration-300 group hover:bg-gradient-to-br hover:from-white hover:to-orange-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <motion.div
                  whileHover={{ rotate: 15, scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                >
                  <TrendingUp className="h-5 w-5 text-orange-600 group-hover:text-orange-500 transition-colors duration-300" />
                </motion.div>
                <span className="group-hover:font-semibold transition-all duration-300">Trend Presenze</span>
              </CardTitle>
              <CardDescription>Andamento mensile del tasso di presenza</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e5e5',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="attendance" 
                    stroke={WINDTRE_COLORS.primary}
                    strokeWidth={3}
                    dot={{ fill: WINDTRE_COLORS.primary, r: 5 }}
                    activeDot={{ r: 8 }}
                    name="Presenza %"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="target" 
                    stroke={WINDTRE_COLORS.secondary}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Target"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ 
            scale: 1.01,
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
            y: -2
          }}
          className="cursor-pointer"
        >
          <Card className="backdrop-blur-xl bg-white/80 border-white/20 hover:border-purple-300 transition-all duration-300 group hover:bg-gradient-to-br hover:from-white hover:to-purple-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <motion.div
                  whileHover={{ rotate: 180, scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                >
                  <PieChart className="h-5 w-5 text-purple-600 group-hover:text-purple-500 transition-colors duration-300" />
                </motion.div>
                <span className="group-hover:font-semibold transition-all duration-300">Distribuzione Dipartimenti</span>
              </CardTitle>
              <CardDescription>Dipendenti per dipartimento</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e5e5',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {departmentData.map((dept, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }} />
                    <span className="text-xs text-muted-foreground">{dept.name}: {dept.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="backdrop-blur-xl bg-white/80 border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              Attività Recenti
            </CardTitle>
            <CardDescription>Ultime azioni nel sistema HR</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-4">
                {[
                  { icon: UserPlus, color: 'text-green-600', title: 'Nuovo dipendente', desc: 'Marco Bianchi aggiunto al team Sviluppo', time: '5 min fa' },
                  { icon: CheckCircle2, color: 'text-blue-600', title: 'Ferie approvate', desc: 'Richiesta di Giulia Rossi approvata', time: '1 ora fa' },
                  { icon: Award, color: 'text-purple-600', title: 'Performance review', desc: 'Completata valutazione Q1 2024', time: '2 ore fa' },
                  { icon: CalendarIcon, color: 'text-orange-600', title: 'Turno modificato', desc: 'Aggiornato turno weekend store Milano', time: '3 ore fa' },
                  { icon: FileText, color: 'text-gray-600', title: 'Report generato', desc: 'Report mensile HR pronto', time: '5 ore fa' }
                ].map((activity, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50/50 transition-colors"
                  >
                    <activity.icon className={cn("h-5 w-5 mt-0.5", activity.color)} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.desc}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
  
  const renderEmployees = () => (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Cerca dipendente per nome, ruolo o dipartimento..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="active">Attivi</SelectItem>
              <SelectItem value="leave">In ferie</SelectItem>
              <SelectItem value="inactive">Inattivi</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterDepartment} onValueChange={setFilterDepartment}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Dipartimento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i dipartimenti</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              onClick={() => {
                setSelectedEmployee(null);
                setIsEmployeeModalOpen(true);
              }}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/25"
              data-testid="button-new-employee"
            >
              <motion.div
                whileHover={{ rotate: 180, scale: 1.2 }}
                transition={{ duration: 0.3 }}
                className="inline-block"
              >
                <Plus className="h-4 w-4 mr-2" />
              </motion.div>
              Nuovo Dipendente
            </Button>
          </motion.div>
        </div>
      </div>
      
      {/* Employees Table */}
      <Card className="backdrop-blur-xl bg-white/80 border-white/20">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Dipendente</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead>Dipartimento</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Posizione</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Ultimo Accesso</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="wait">
                {filteredEmployees.map((emp, i) => (
                  <motion.tr
                    key={emp.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: i * 0.05 }}
                    className="hover:bg-gradient-to-r hover:from-orange-50/50 hover:to-transparent transition-all duration-300 hover:shadow-lg group cursor-pointer relative overflow-hidden"
                    whileHover={{ 
                      scale: 1.005,
                      x: 2,
                      boxShadow: '0 4px 15px rgba(255, 105, 0, 0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderLeft = '4px solid #FF6900';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 105, 0, 0.03)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderLeft = 'none';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Avatar className="h-9 w-9 border-2 border-white shadow-sm group-hover:border-orange-200 group-hover:shadow-md transition-all duration-300">
                          <AvatarImage src={emp.avatar} />
                          <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-600 text-white">
                            {emp.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                          </Avatar>
                        </motion.div>
                        <div>
                          <p className="font-medium text-sm">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {emp.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={emp.status === 'active' ? 'default' : emp.status === 'leave' ? 'secondary' : 'destructive'}
                        className={cn(
                          "transition-all duration-300",
                          emp.status === 'active' && "bg-green-100 text-green-700 hover:bg-green-200 animate-pulse"
                        )}
                      >
                        {emp.status === 'active' ? 'Attivo' : emp.status === 'leave' ? 'In ferie' : 'Inattivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {emp.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={emp.performance || 0} className="w-16 h-2" />
                        <span className="text-xs font-medium">{emp.performance || 0}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{emp.lastLogin}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setIsEmployeeModalOpen(true);
                          }}
                          className="hover:bg-orange-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="hover:bg-purple-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
  
  const renderShifts = () => (
    <div className="space-y-6">
      {/* Sub-tabs for Shifts */}
      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-4 backdrop-blur-xl bg-white/80">
          <TabsTrigger value="templates" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
            <Layers className="h-4 w-4 mr-2" />
            Turni Template
          </TabsTrigger>
          <TabsTrigger value="total-calendar" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Calendario Totale
          </TabsTrigger>
          <TabsTrigger value="store-calendar" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white">
            <Building className="h-4 w-4 mr-2" />
            Per Punto Vendita
          </TabsTrigger>
          <TabsTrigger value="auto-schedule" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white">
            <Zap className="h-4 w-4 mr-2" />
            Auto-Scheduling
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Gestione Template Turni</h3>
              <p className="text-sm text-muted-foreground">Crea e gestisci template riutilizzabili per i turni</p>
            </div>
            <Button 
              onClick={() => {
                setSelectedTemplate(null);
                setIsTemplateModalOpen(true);
              }}
              className="bg-gradient-to-r from-orange-600 to-red-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Template
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shiftTemplates.map((template, i) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ 
                  scale: 1.02, 
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
                  y: -3
                }}
                className="cursor-pointer"
              >
                <Card className="backdrop-blur-xl bg-white/80 border-white/20 hover:shadow-lg transition-all duration-300 overflow-hidden group hover:border-opacity-70 hover:bg-gradient-to-br hover:from-white hover:to-gray-50">
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none"
                    style={{ backgroundColor: template.color }}
                  />
                  <motion.div 
                    className="h-2 group-hover:h-3 transition-all duration-300" 
                    style={{ backgroundColor: template.color }}
                    whileHover={{ scaleY: 1.2 }}
                  />
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.2 }}>
                          <CardTitle className="text-base group-hover:font-semibold transition-all duration-300">
                            {template.name}
                          </CardTitle>
                        </motion.div>
                        <CardDescription className="text-xs mt-1">
                          {template.description}
                        </CardDescription>
                      </div>
                      <Badge variant={template.isActive ? "default" : "secondary"}>
                        {template.isActive ? 'Attivo' : 'Inattivo'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{template.startTime} - {template.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{template.requiredStaff} persone richieste</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <RefreshCw className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">{template.recurrence}</span>
                    </div>
                    {template.roles && (
                      <div className="flex flex-wrap gap-1">
                        {template.roles.map(role => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        Creato da {template.createdBy}
                      </span>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost">
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="total-calendar" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Calendario Completo</h3>
              <p className="text-sm text-muted-foreground">Vista unificata di tutti i turni</p>
            </div>
            <div className="flex gap-2">
              <Select value={calendarView} onValueChange={(v: any) => setCalendarView(v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Vista Mensile</SelectItem>
                  <SelectItem value="week">Vista Settimanale</SelectItem>
                  <SelectItem value="day">Vista Giornaliera</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filtri
              </Button>
            </div>
          </div>
          
          <Card className="backdrop-blur-xl bg-white/80 border-white/20">
            <CardContent className="p-6">
              <div className="grid grid-cols-7 gap-2">
                {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                  <div key={day} className="text-center text-sm font-semibold text-muted-foreground p-2">
                    {day}
                  </div>
                ))}
                {Array.from({ length: 35 }, (_, i) => {
                  const date = addDays(startOfMonth(selectedDate), i - 5);
                  const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
                  const hasShifts = Math.random() > 0.5;
                  
                  return (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.05 }}
                      className={cn(
                        "min-h-[80px] p-2 rounded-lg border cursor-pointer transition-all",
                        isCurrentMonth ? "bg-white" : "bg-gray-50",
                        isToday(date) && "border-orange-500 border-2",
                        hasShifts && "bg-gradient-to-br from-white to-orange-50"
                      )}
                    >
                      <div className="text-sm font-medium">{format(date, 'd')}</div>
                      {hasShifts && isCurrentMonth && (
                        <div className="mt-1 space-y-1">
                          <div className="h-1 bg-orange-400 rounded-full" />
                          <div className="h-1 bg-purple-400 rounded-full w-3/4" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="backdrop-blur-xl bg-white/80">
              <CardHeader>
                <CardTitle className="text-sm">Legenda</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { color: 'bg-orange-400', label: 'Turno Mattina' },
                    { color: 'bg-purple-400', label: 'Turno Pomeriggio' },
                    { color: 'bg-green-400', label: 'Turno Sera' },
                    { color: 'bg-blue-400', label: 'Weekend' }
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", item.color)} />
                      <span className="text-xs">{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card className="backdrop-blur-xl bg-white/80">
              <CardHeader>
                <CardTitle className="text-sm">Statistiche Mese</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Turni totali</span>
                    <span className="text-xs font-medium">248</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Ore totali</span>
                    <span className="text-xs font-medium">1,488</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Copertura</span>
                    <span className="text-xs font-medium">94%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="backdrop-blur-xl bg-white/80">
              <CardHeader>
                <CardTitle className="text-sm">Azioni Rapide</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button className="w-full justify-start" variant="outline" size="sm">
                    <Plus className="h-3 w-3 mr-2" />
                    Aggiungi Turno
                  </Button>
                  <Button className="w-full justify-start" variant="outline" size="sm">
                    <Copy className="h-3 w-3 mr-2" />
                    Duplica Settimana
                  </Button>
                  <Button className="w-full justify-start" variant="outline" size="sm">
                    <Download className="h-3 w-3 mr-2" />
                    Esporta PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="store-calendar" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Calendario per Punto Vendita</h3>
              <p className="text-sm text-muted-foreground">Gestisci i turni per ogni negozio</p>
            </div>
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Seleziona negozio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i negozi</SelectItem>
                <SelectItem value="milano-centro">Milano Centro</SelectItem>
                <SelectItem value="roma-termini">Roma Termini</SelectItem>
                <SelectItem value="napoli-centro">Napoli Centro</SelectItem>
                <SelectItem value="torino-porta-nuova">Torino Porta Nuova</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {['Milano Centro', 'Roma Termini', 'Napoli Centro', 'Torino Porta Nuova'].map((store, i) => (
              <motion.div
                key={store}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="backdrop-blur-xl bg-white/80 hover:shadow-lg transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm">{store}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {Math.floor(Math.random() * 10) + 15} staff
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Oggi</span>
                        <span className="font-medium text-green-600">Completo</span>
                      </div>
                      <Progress value={100} className="h-1" />
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Domani</span>
                        <span className="font-medium text-yellow-600">80%</span>
                      </div>
                      <Progress value={80} className="h-1" />
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Settimana</span>
                        <span className="font-medium">92%</span>
                      </div>
                      <Progress value={92} className="h-1" />
                      <Button className="w-full mt-3" variant="outline" size="sm">
                        Visualizza Dettagli
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="auto-schedule" className="space-y-4">
          <Alert className="border-green-200 bg-green-50">
            <Zap className="h-4 w-4 text-green-600" />
            <AlertTitle>Auto-Scheduling AI</AlertTitle>
            <AlertDescription>
              Il sistema di auto-scheduling utilizza l'intelligenza artificiale per ottimizzare automaticamente i turni basandosi su: disponibilità staff, competenze richieste, preferenze personali, storico presenze e bilanciamento carichi di lavoro.
            </AlertDescription>
          </Alert>
          
          <Card className="backdrop-blur-xl bg-white/80">
            <CardHeader>
              <CardTitle>Configura Auto-Scheduling</CardTitle>
              <CardDescription>Imposta i parametri per la generazione automatica dei turni</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Periodo da schedulare</Label>
                  <Select defaultValue="week">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Prossima settimana</SelectItem>
                      <SelectItem value="2weeks">Prossime 2 settimane</SelectItem>
                      <SelectItem value="month">Prossimo mese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Punto vendita</Label>
                  <Select defaultValue="all">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i punti vendita</SelectItem>
                      <SelectItem value="milano">Milano Centro</SelectItem>
                      <SelectItem value="roma">Roma Termini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <Label>Ottimizzazioni</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox id="balance" defaultChecked />
                      <label htmlFor="balance" className="text-sm">
                        Bilancia equamente le ore tra i dipendenti
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox id="preferences" defaultChecked />
                      <label htmlFor="preferences" className="text-sm">
                        Rispetta le preferenze dei dipendenti
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox id="skills" defaultChecked />
                      <label htmlFor="skills" className="text-sm">
                        Assegna in base alle competenze
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox id="cost" />
                      <label htmlFor="cost" className="text-sm">
                        Ottimizza i costi del personale
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex gap-2">
                <Button className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Genera Turni Automaticamente
                </Button>
                <Button variant="outline">
                  Anteprima
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
  
  const renderLeave = () => (
    <div className="space-y-6">
      {/* Leave Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="backdrop-blur-xl bg-white/80 hover:shadow-lg transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Richieste Pendenti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{leaveRequests.filter(r => r.status === 'pending').length}</div>
            <p className="text-xs text-muted-foreground">Da approvare</p>
          </CardContent>
        </Card>
        
        <Card className="backdrop-blur-xl bg-white/80 hover:shadow-lg transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">In Ferie Oggi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">8</div>
            <p className="text-xs text-muted-foreground">Dipendenti</p>
          </CardContent>
        </Card>
        
        <Card className="backdrop-blur-xl bg-white/80 hover:shadow-lg transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Giorni Totali</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">342</div>
            <p className="text-xs text-muted-foreground">Questo mese</p>
          </CardContent>
        </Card>
        
        <Card className="backdrop-blur-xl bg-white/80 hover:shadow-lg transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tasso Approvazione</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">87%</div>
            <p className="text-xs text-muted-foreground">Media mensile</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Leave Requests Table */}
      <Card className="backdrop-blur-xl bg-white/80">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Richieste Ferie e Permessi</CardTitle>
              <CardDescription>Gestisci le richieste di assenza del personale</CardDescription>
            </div>
            <Button className="bg-gradient-to-r from-orange-600 to-red-600">
              <Plus className="h-4 w-4 mr-2" />
              Nuova Richiesta
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dipendente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Giorni</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveRequests.map((request, i) => (
                <motion.tr
                  key={request.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="hover:bg-gray-50/50"
                >
                  <TableCell className="font-medium">{request.employeeName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {request.type === 'vacation' ? 'Ferie' : 
                       request.type === 'sick' ? 'Malattia' : 
                       request.type === 'personal' ? 'Personale' : request.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(request.startDate), 'dd/MM')} - {format(new Date(request.endDate), 'dd/MM')}
                  </TableCell>
                  <TableCell>
                    {Math.ceil((new Date(request.endDate).getTime() - new Date(request.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{request.reason}</TableCell>
                  <TableCell>
                    <Badge variant={
                      request.status === 'approved' ? 'default' :
                      request.status === 'pending' ? 'secondary' :
                      request.status === 'rejected' ? 'destructive' : 'outline'
                    }>
                      {request.status === 'approved' ? 'Approvata' :
                       request.status === 'pending' ? 'In attesa' :
                       request.status === 'rejected' ? 'Rifiutata' : 'Cancellata'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {request.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="hover:bg-green-50 hover:text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="hover:bg-red-50 hover:text-red-600">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Leave Calendar */}
      <Card className="backdrop-blur-xl bg-white/80">
        <CardHeader>
          <CardTitle>Calendario Ferie</CardTitle>
          <CardDescription>Vista mensile delle assenze programmate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-muted-foreground p-2">
                {day}
              </div>
            ))}
            {Array.from({ length: 35 }, (_, i) => {
              const hasLeave = Math.random() > 0.8;
              const leaveCount = hasLeave ? Math.ceil(Math.random() * 3) : 0;
              
              return (
                <div
                  key={i}
                  className={cn(
                    "aspect-square border rounded-lg p-2 cursor-pointer hover:bg-gray-50 transition-colors",
                    hasLeave && "bg-orange-50 border-orange-200"
                  )}
                >
                  <div className="text-xs font-medium">{(i % 31) + 1}</div>
                  {hasLeave && (
                    <div className="mt-1">
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        {leaveCount}
                      </Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  const renderAnalytics = () => (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="backdrop-blur-xl bg-white/80 hover:shadow-lg transition-all">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-600" />
              Employee Satisfaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              8.7/10
            </div>
            <Progress value={87} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">+0.5 dal Q precedente</p>
          </CardContent>
        </Card>
        
        <Card className="backdrop-blur-xl bg-white/80 hover:shadow-lg transition-all">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Retention Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              91.5%
            </div>
            <Progress value={91.5} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">Above industry average</p>
          </CardContent>
        </Card>
        
        <Card className="backdrop-blur-xl bg-white/80 hover:shadow-lg transition-all">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-600" />
              Cost per Employee
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              €68.5K
            </div>
            <Progress value={75} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">-3% YoY</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="backdrop-blur-xl bg-white/80">
          <CardHeader>
            <CardTitle>Performance Distribution</CardTitle>
            <CardDescription>Confronto performance Q1 vs Q2</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={performanceData}>
                <PolarGrid stroke="#e5e5e5" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar name="Q1 2024" dataKey="A" stroke={WINDTRE_COLORS.primary} fill={WINDTRE_COLORS.primary} fillOpacity={0.6} />
                <Radar name="Q2 2024" dataKey="B" stroke={WINDTRE_COLORS.secondary} fill={WINDTRE_COLORS.secondary} fillOpacity={0.6} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="backdrop-blur-xl bg-white/80">
          <CardHeader>
            <CardTitle>Distribuzione Stipendi</CardTitle>
            <CardDescription>Range salariali per numero dipendenti</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salaryDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill={WINDTRE_COLORS.primary}>
                  {salaryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* Predictive Analytics */}
      <Card className="backdrop-blur-xl bg-white/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-blue-600" />
            Analytics Predittive AI
          </CardTitle>
          <CardDescription>Previsioni basate su machine learning</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-sm">Turnover Risk</AlertTitle>
              <AlertDescription className="text-xs">
                3 dipendenti con alto rischio di abbandono nei prossimi 3 mesi. Considera azioni di retention.
              </AlertDescription>
            </Alert>
            
            <Alert className="border-green-200 bg-green-50">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-sm">Hiring Forecast</AlertTitle>
              <AlertDescription className="text-xs">
                Previsto aumento del 15% del carico di lavoro in Q3. Inizia recruiting per 5 posizioni.
              </AlertDescription>
            </Alert>
            
            <Alert className="border-purple-200 bg-purple-50">
              <Award className="h-4 w-4 text-purple-600" />
              <AlertTitle className="text-sm">Training ROI</AlertTitle>
              <AlertDescription className="text-xs">
                Il programma di formazione tecnica mostra ROI del 285%. Considera espansione budget.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  const renderCompliance = () => (
    <div className="space-y-6">
      {/* Compliance Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="backdrop-blur-xl bg-white/80 hover:shadow-lg transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              GDPR Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-600">Conforme</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ultimo audit: 15/01/2024</p>
          </CardContent>
        </Card>
        
        <Card className="backdrop-blur-xl bg-white/80 hover:shadow-lg transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Documenti Richiesti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">127/127</div>
            <Progress value={100} className="mt-1 h-1" />
            <p className="text-xs text-muted-foreground mt-1">Tutti completi</p>
          </CardContent>
        </Card>
        
        <Card className="backdrop-blur-xl bg-white/80 hover:shadow-lg transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Audit Pendenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">3</div>
            <p className="text-xs text-muted-foreground mt-1">Prossimo: 01/02/2024</p>
          </CardContent>
        </Card>
        
        <Card className="backdrop-blur-xl bg-white/80 hover:shadow-lg transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lock className="h-4 w-4 text-purple-600" />
              Security Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">94/100</div>
            <Progress value={94} className="mt-1 h-1" />
            <p className="text-xs text-muted-foreground mt-1">Eccellente</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Compliance Tasks & Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="backdrop-blur-xl bg-white/80">
          <CardHeader>
            <CardTitle>Attività di Compliance</CardTitle>
            <CardDescription>Task e scadenze da completare</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { title: 'Aggiornamento Privacy Policy', due: '30/01/2024', priority: 'high' },
                { title: 'Training GDPR Q1', due: '15/02/2024', priority: 'medium' },
                { title: 'Audit Sicurezza IT', due: '01/03/2024', priority: 'high' },
                { title: 'Review Contratti Fornitori', due: '10/02/2024', priority: 'low' },
                { title: 'Certificazione ISO 27001', due: '30/03/2024', priority: 'medium' }
              ].map((task, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox />
                    <div>
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">Scadenza: {task.due}</p>
                    </div>
                  </div>
                  <Badge variant={
                    task.priority === 'high' ? 'destructive' :
                    task.priority === 'medium' ? 'secondary' : 'outline'
                  }>
                    {task.priority === 'high' ? 'Alta' :
                     task.priority === 'medium' ? 'Media' : 'Bassa'}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="backdrop-blur-xl bg-white/80">
          <CardHeader>
            <CardTitle>Report Disponibili</CardTitle>
            <CardDescription>Documentazione e report HR</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { name: 'Report Mensile HR', type: 'PDF', size: '2.4 MB', date: '20/01/2024' },
                { name: 'Analisi Turnover Q4', type: 'XLSX', size: '1.8 MB', date: '18/01/2024' },
                { name: 'GDPR Compliance Audit', type: 'PDF', size: '3.2 MB', date: '15/01/2024' },
                { name: 'Payroll Summary 2024', type: 'PDF', size: '1.5 MB', date: '10/01/2024' },
                { name: 'Training Report Q4', type: 'DOCX', size: '890 KB', date: '05/01/2024' }
              ].map((report, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{report.name}</p>
                      <p className="text-xs text-muted-foreground">{report.type} • {report.size} • {report.date}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost">
                    <Download className="h-4 w-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
  
  const renderSettings = () => (
    <div className="space-y-6">
      <Card className="backdrop-blur-xl bg-white/80">
        <CardHeader>
          <CardTitle>Impostazioni Generali HR</CardTitle>
          <CardDescription>Configura le impostazioni del modulo risorse umane</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notifiche Email</Label>
                <p className="text-xs text-muted-foreground">Ricevi notifiche per nuove richieste</p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Approvazione Automatica</Label>
                <p className="text-xs text-muted-foreground">Approva automaticamente richieste sotto 3 giorni</p>
              </div>
              <Switch />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Report Settimanali</Label>
                <p className="text-xs text-muted-foreground">Genera report automatici ogni lunedì</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Limiti e Soglie</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Giorni ferie annuali</Label>
                <Input type="number" defaultValue="22" />
              </div>
              <div className="space-y-2">
                <Label>Ore straordinario mensili max</Label>
                <Input type="number" defaultValue="40" />
              </div>
              <div className="space-y-2">
                <Label>Preavviso richieste (giorni)</Label>
                <Input type="number" defaultValue="7" />
              </div>
              <div className="space-y-2">
                <Label>Target presenza (%)</Label>
                <Input type="number" defaultValue="95" />
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex justify-end gap-2">
            <Button variant="outline">Annulla</Button>
            <Button className="bg-gradient-to-r from-orange-600 to-red-600">
              Salva Impostazioni
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  // Employee Modal
  const EmployeeModal = () => (
    <Dialog open={isEmployeeModalOpen} onOpenChange={setIsEmployeeModalOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedEmployee ? 'Dettagli Dipendente' : 'Nuovo Dipendente'}
          </DialogTitle>
          <DialogDescription>
            {selectedEmployee ? 'Visualizza e modifica le informazioni del dipendente' : 'Aggiungi un nuovo dipendente al sistema'}
          </DialogDescription>
        </DialogHeader>
        
        {selectedEmployee ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={selectedEmployee.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-orange-400 to-red-600 text-white text-xl">
                  {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{selectedEmployee.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedEmployee.role}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant={selectedEmployee.status === 'active' ? 'default' : 'secondary'}>
                    {selectedEmployee.status === 'active' ? 'Attivo' : 'In ferie'}
                  </Badge>
                  <Badge variant="outline">{selectedEmployee.contractType}</Badge>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{selectedEmployee.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Telefono</p>
                <p className="text-sm font-medium">{selectedEmployee.phone}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Posizione</p>
                <p className="text-sm font-medium">{selectedEmployee.location}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Dipartimento</p>
                <p className="text-sm font-medium">{selectedEmployee.department}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Data assunzione</p>
                <p className="text-sm font-medium">{format(new Date(selectedEmployee.startDate), 'dd/MM/yyyy')}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Manager</p>
                <p className="text-sm font-medium">{selectedEmployee.manager}</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Performance</h4>
              <div className="flex items-center gap-3">
                <Progress value={selectedEmployee.performance} className="flex-1" />
                <span className="text-sm font-medium">{selectedEmployee.performance}%</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Competenze</h4>
              <div className="flex flex-wrap gap-2">
                {selectedEmployee.skills?.map(skill => (
                  <Badge key={skill} variant="secondary">{skill}</Badge>
                ))}
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Certificazioni</h4>
              <div className="flex flex-wrap gap-2">
                {selectedEmployee.certifications?.map(cert => (
                  <Badge key={cert} variant="outline">
                    <Award className="h-3 w-3 mr-1" />
                    {cert}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <form className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input placeholder="Nome completo" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="email@azienda.com" />
              </div>
              <div className="space-y-2">
                <Label>Ruolo</Label>
                <Input placeholder="Posizione lavorativa" />
              </div>
              <div className="space-y-2">
                <Label>Dipartimento</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona dipartimento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Telefono</Label>
                <Input type="tel" placeholder="+39 xxx xxx xxxx" />
              </div>
              <div className="space-y-2">
                <Label>Posizione</Label>
                <Input placeholder="Città" />
              </div>
              <div className="space-y-2">
                <Label>Data assunzione</Label>
                <Input type="date" />
              </div>
              <div className="space-y-2">
                <Label>Tipo contratto</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contratto</SelectItem>
                    <SelectItem value="internship">Stage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsEmployeeModalOpen(false)}>
            Chiudi
          </Button>
          {!selectedEmployee && (
            <Button className="bg-gradient-to-r from-orange-600 to-red-600">
              Aggiungi Dipendente
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  
  // Template Modal
  const TemplateModal = () => (
    <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {selectedTemplate ? 'Modifica Template' : 'Nuovo Template Turno'}
          </DialogTitle>
          <DialogDescription>
            Crea un template riutilizzabile per i turni
          </DialogDescription>
        </DialogHeader>
        
        <form className="space-y-4">
          <div className="space-y-2">
            <Label>Nome Template</Label>
            <Input placeholder="Es. Turno Mattina Standard" />
          </div>
          
          <div className="space-y-2">
            <Label>Descrizione</Label>
            <Textarea placeholder="Descrizione del template..." />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ora Inizio</Label>
              <Input type="time" defaultValue="08:00" />
            </div>
            <div className="space-y-2">
              <Label>Ora Fine</Label>
              <Input type="time" defaultValue="14:00" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Staff Richiesto</Label>
            <Input type="number" placeholder="3" min="1" />
          </div>
          
          <div className="space-y-2">
            <Label>Ricorrenza</Label>
            <Select defaultValue="daily">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Giornaliera</SelectItem>
                <SelectItem value="weekly">Settimanale</SelectItem>
                <SelectItem value="monthly">Mensile</SelectItem>
                <SelectItem value="custom">Personalizzata</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Giorni della Settimana</Label>
            <div className="flex gap-2">
              {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((day, i) => (
                <div key={i} className="flex items-center">
                  <Checkbox id={`day-${i}`} />
                  <label htmlFor={`day-${i}`} className="ml-1 text-sm">{day}</label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Colore</Label>
            <div className="flex gap-2">
              {CHART_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className="w-8 h-8 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </form>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsTemplateModalOpen(false)}>
            Annulla
          </Button>
          <Button className="bg-gradient-to-r from-orange-600 to-red-600">
            Salva Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  
  return (
    <Layout currentModule="hr" setCurrentModule={() => {}}>
      <div className="w-full max-w-none p-4 lg:p-6 space-y-6 transition-all duration-300">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="backdrop-blur-xl bg-white/80 rounded-xl p-6 border border-white/20 shadow-lg"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-purple-600 bg-clip-text text-transparent">
                HR Dashboard ✨
              </h1>
              <p className="text-muted-foreground mt-1">Sistema completo di gestione risorse umane con effetti hover avanzati</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Bell className="h-4 w-4" />
              </Button>
              <Button className="bg-gradient-to-r from-orange-600 to-red-600">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
          
          {/* Tabs Navigation */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all duration-300",
                    selectedTab === tab.id
                      ? "bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg"
                      : "bg-white/50 hover:bg-white/80 text-gray-600 hover:text-gray-900"
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className={cn(
                    "h-4 w-4 transition-transform duration-300",
                    selectedTab === tab.id && "rotate-12"
                  )} />
                  <span className="font-medium">{tab.label}</span>
                  {tab.badge && (
                    <motion.div
                      animate={{
                        scale: tab.badge === 'NEW' ? [1, 1.1, 1] : 1,
                      }}
                      transition={{
                        duration: 2,
                        repeat: tab.badge === 'NEW' ? Infinity : 0,
                        ease: "easeInOut"
                      }}
                    >
                      <Badge 
                        variant={selectedTab === tab.id ? "secondary" : "outline"}
                        className={cn(
                          "ml-1 transition-all duration-300",
                          selectedTab === tab.id && "animate-pulse",
                          tab.badge === 'NEW' && "bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-md",
                          tab.badge === '15' && "bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 shadow-md animate-pulse",
                          tab.badge === '✓' && "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0"
                        )}
                    >
                        {tab.badge}
                      </Badge>
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
        
        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {selectedTab === 'overview' && renderOverview()}
            {selectedTab === 'employees' && renderEmployees()}
            {selectedTab === 'shifts' && renderShifts()}
            {selectedTab === 'leave' && renderLeave()}
            {selectedTab === 'analytics' && renderAnalytics()}
            {selectedTab === 'compliance' && renderCompliance()}
            {selectedTab === 'settings' && renderSettings()}
          </motion.div>
        </AnimatePresence>
        
        {/* Modals */}
        <EmployeeModal />
        <TemplateModal />
      </div>
    </Layout>
  );
}