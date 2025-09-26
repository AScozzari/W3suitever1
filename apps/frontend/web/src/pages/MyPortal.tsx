import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTabRouter } from '@/hooks/useTabRouter';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/hooks/useAuth';
import { useHRQueryReadiness } from '@/hooks/useAuthReadiness';
import { useUser } from '@/hooks/useUsers';
import { useNotifications } from '@/hooks/useNotifications';
import { getDisplayUser, getDisplayLeaveBalance } from '@/types';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Clock, FileText, GraduationCap,
  Download, Target, Sun,
  Home, Bell, Plus, User, CheckCircle, ClipboardList,
  LogIn, LogOut, Play, Pause, Smartphone, MapPin, Wifi, QrCode,
  BarChart3, Activity, Coffee, Shield, RefreshCw, AlertCircle,
  Calendar as CalendarIcon, Edit3, Mail, Phone, Building, Save,
  Filter, Eye, Search, Award, BookOpen, TrendingUp, Star,
  Bookmark, PlayCircle, Lock, Settings, Camera, Briefcase,
  ChevronRight, MessageSquare, Users2, PieChart, Calendar1,
  Globe, Palette, Key, History, Smartphone as SmartphoneIcon,
  Share2, Upload, Receipt, Loader2
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Link } from 'wouter';
import { z } from 'zod';
import { getStatusColor, getStatusLabel, getStatusBadgeClass } from '@/utils/request-status';
import ClockWidget from '@/components/TimeTracking/ClockWidget';
// NEW: Import componenti unificati
import UnifiedClockingPanel from '@/components/TimeTracking/UnifiedClockingPanel';
import ShiftsCalendar from '@/components/Shifts/ShiftsCalendar';
// OLD: Lazy load TimeAttendancePage to improve initial load time (SOSTITUITO)
// const TimeAttendancePage = React.lazy(() => import('@/components/TimeTracking/TimeAttendancePage'));
// HR components removed - now handled in dedicated HRManagementPage
import PayslipManager from '@/components/Documents/PayslipManager';
import DocumentGrid from '@/components/Documents/DocumentGrid';
import DocumentCategories from '@/components/Documents/DocumentCategories';
import DocumentUploadModal from '@/components/Documents/DocumentUploadModal';
import DocumentViewer from '@/components/Documents/DocumentViewer';
import { LeaveBalanceWidget } from '@/components/Leave/LeaveBalanceWidget';
import { LeaveCalendar } from '@/components/Leave/LeaveCalendar';
import { useCurrentSession, useTimeBalance } from '@/hooks/useTimeTracking';
// useHRRequests hook removed - now handled in HRManagementPage
import { useLeaveBalance } from '@/hooks/useLeaveManagement';
import { useDocumentDrive } from '@/hooks/useDocumentDrive';
import { CurrentSession, ModalState, DocumentCategoriesProps, DocumentGridProps } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import AvatarSelector from '@/components/AvatarSelector';
import QuickActions, { type QuickAction } from '@/components/QuickActions';

// Tab configuration for Employee Dashboard
const EMPLOYEE_TABS = [
  {
    id: 'overview',
    label: 'Overview',
    icon: Home,
    description: 'Dashboard personale e notifiche'
  },
  {
    id: 'time-attendance',
    label: 'Time & Attendance', 
    icon: Clock,
    description: 'Timbrature e calendario eventi'
  },
  {
    id: 'requests',
    label: 'My Requests',
    icon: ClipboardList,
    description: 'Richieste ferie e permessi'
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: FileText,
    description: 'Buste paga e documenti'
  },
  {
    id: 'performance',
    label: 'My Performance',
    icon: Target,
    description: 'Goals e recensioni personali'
  },
  {
    id: 'training',
    label: 'Training',
    icon: GraduationCap,
    description: 'Corsi e certificazioni'
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    description: 'Impostazioni personali'
  }
];

// SECURITY: Valid tabs for Employee Dashboard - prevents malformed deep links
const VALID_EMPLOYEE_TABS = ['overview', 'time-attendance', 'requests', 'documents', 'performance', 'training', 'profile'];
const VALID_EMPLOYEE_SECTIONS = ['pending', 'approved', 'rejected']; // for requests tab

export default function MyPortal() {
  // Tab Router Hook with security validation - seguendo pattern Settings
  const { activeTab, setTab, getTabUrl } = useTabRouter({
    defaultTab: 'overview',
    validTabs: VALID_EMPLOYEE_TABS,
    validSections: VALID_EMPLOYEE_SECTIONS
  });

  // Use proper tenant context instead of URL parsing
  const { currentTenant } = useTenant();
  
  // Authentication and user data
  const { user: authUser, isAuthenticated } = useAuth();
  const userId = authUser?.id;
  
  // ✅ HR Authentication Readiness Hook
  const { enabled: hrQueriesEnabled, loading: hrAuthLoading, attempts, debugInfo } = useHRQueryReadiness();
  const { toast } = useToast();
  
  // Real data queries with hierarchical cache keys - REVERTED TO STABLE VERSION
  const { data: userData, isLoading: userLoading, error: userError } = useUser(userId || '');
  const { data: leaveBalance, isLoading: leaveLoading } = useLeaveBalance(userId || '');
  const { data: notifications = [], isLoading: notificationsLoading } = useNotifications({ status: 'unread', limit: 3 });
  
  // ✅ UPDATED: Universal Requests data for employee portal (temporary: showing all HR requests)
  const { data: myRequestsResponse, isLoading: requestsLoading } = useQuery<{requests: any[]}>({
    queryKey: ['/api/universal-requests', 'category', 'hr', 'all'],
    queryFn: () => apiRequest('/api/universal-requests?category=hr&mine=false'),
    // enabled: hrQueriesEnabled, // Temporarily disabled for testing
    staleTime: 2 * 60 * 1000,
  });
  
  // ✅ FIX: Extract requests array from response object
  const myRequestsData = myRequestsResponse?.requests || [];

  // Query HR workflow templates for automatic workflow creation
  const { data: hrWorkflowTemplates = [] } = useQuery<any[]>({
    queryKey: ['/api/workflow-templates', { category: 'hr' }],
    queryFn: () => apiRequest('/api/workflow-templates?category=hr'),
    enabled: hrQueriesEnabled,
    staleTime: 5 * 60 * 1000,
  });
  const { session: currentSession, isLoading: sessionLoading } = useCurrentSession();
  const { documents, isLoading: documentsLoading } = useDocumentDrive();
  
  // Modal states with proper types - discriminated union to eliminate any
  type ModalState = 
    | { open: false; data: null }
    | { open: true; data: Record<string, unknown> };
  const [hrRequestModal, setHrRequestModal] = useState<ModalState>({ open: false, data: null });
  const [documentViewerModal, setDocumentViewerModal] = useState<ModalState>({ open: false, data: null });
  const [profileEditModal, setProfileEditModal] = useState<ModalState>({ open: false, data: null });
  
  // Stati principali
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [breakTime, setBreakTime] = useState(0);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // ✅ RESTORED: Use actual requests data instead of placeholder
  const myRequests = myRequestsData || [];
  
  // ✅ STEP 2: Create Universal Request Mutation
  const createRequestMutation = useMutation({
    mutationFn: async (requestData: any) => {
      return await apiRequest('/api/universal-requests', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/universal-requests', 'category', 'hr', 'all'] });
      toast({
        title: "Richiesta inviata",
        description: "La tua richiesta è stata inviata con successo e sarà esaminata dal manager.",
      });
      // Clear draft after successful submission
      try {
        localStorage.removeItem('hr_request_draft');
      } catch (error) {
        // Silent fail for localStorage issues
      }
      setHrRequestModal({ open: false, data: null });
    },
    onError: (error: any) => {
      console.error('Errore creazione richiesta:', error);
      toast({
        title: "Errore",
        description: error?.message || "Errore durante l'invio della richiesta. Riprova.",
        variant: "destructive",
      });
    },
  });
  
  // Loading states
  const isLoading = userLoading || leaveLoading || notificationsLoading || requestsLoading;
  
  // Display user info using typed helper
  const displayUser = getDisplayUser(userData, authUser);
  
  // Display leave balance using typed helper
  const displayLeaveBalance = getDisplayLeaveBalance(leaveBalance);

  // Performance data from API - only load when needed
  const { data: performanceData, isLoading: performanceLoading } = useQuery<{
    overview: {
      goalsAchieved: number;
      totalGoals: number;
      averageRating: number;
      recognitions: number;
    };
    goals: Array<{
      id: string;
      title: string;
      description: string;
      progress: number;
      deadline: Date;
      status: string;
    }>;
    periodicity: string;
  }>({
    queryKey: ['/api/employee/performance'],
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: activeTab === 'performance' || activeTab === 'overview'  // Only load on relevant tabs
  });

  // Training data from API - only load when needed
  const { data: trainingData, isLoading: trainingLoading } = useQuery<{
    overview: {
      completedCourses: number;
      ongoingCourses: number;
      certifications: number;
      totalHours: number;
    };
    courses: Array<{
      id: string;
      title: string;
      description: string;
      duration: string;
      difficulty: string;
      category: string;
      status: string;
      progress: number;
    }>;
    categories: string[];
  }>({
    queryKey: ['/api/employee/training'],
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: activeTab === 'training' || activeTab === 'overview'  // Only load on relevant tabs
  });

  // Extract data for compatibility
  const performance = performanceData?.goals || [];
  const training = trainingData?.courses || [];

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Apply loaded class to body to trigger WindTre gradient background
  useEffect(() => {
    // Add loaded class after component mount to prevent flash
    const timeoutId = setTimeout(() => {
      document.body.classList.add('loaded');
    }, 100); // Small delay to ensure white background is rendered first
    
    return () => {
      clearTimeout(timeoutId);
      document.body.classList.remove('loaded');
    };
  }, []);

  // Format time utility
  const formatTime = (date: Date) => {
    return format(date, 'HH:mm:ss');
  };

  // Handle HR Request
  const handleHRRequestSuccess = () => {
    setHrRequestModal({ open: false as false, data: null });
    // Refresh requests data
  };

  // ✅ Removed: Using centralized request status system

  // Get priority color
  const getPriorityColor = (type: string) => {
    switch (type) {
      case 'Obbligatorio': return 'bg-red-100 text-red-800';
      case 'Sviluppo Carriera': return 'bg-blue-100 text-blue-800';
      case 'Volontario': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout currentModule="employee" setCurrentModule={() => {}}>
      {/* Header - Direttamente sullo sfondo come Settings */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#111827',
          margin: '0 0 8px 0'
        }} data-testid="text-dashboard-title">
          Il mio Portale
        </h1>
        <div className="flex items-center justify-between mt-4">
          <div></div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-500" data-testid="label-current-time">Ora corrente</p>
              <p className="text-xl font-mono font-bold text-gray-900" data-testid="text-current-time">
                {formatTime(currentTime)}
              </p>
            </div>
            {userLoading ? (
              <Skeleton className="h-12 w-12 rounded-full" />
            ) : (
              <Avatar className="h-12 w-12" data-testid="avatar-user">
                <AvatarImage src={displayUser.foto || undefined} alt={`${displayUser.nome} ${displayUser.cognome}`} />
                <AvatarFallback className="bg-gradient-to-r from-orange-500 to-purple-500 text-white" data-testid="avatar-fallback">
                  {displayUser.nome[0]}{displayUser.cognome[0]}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Container - Glassmorphism come Settings */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{
          display: 'flex',
          background: 'rgba(243, 244, 246, 0.5)',
          borderRadius: '12px',
          padding: '4px',
          gap: '4px',
          flexWrap: 'wrap'
        }}>
          {EMPLOYEE_TABS.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={getTabUrl(tab.id)}
                onClick={() => setTab(tab.id)}
                style={{
                  flex: '1 1 auto',
                  minWidth: '120px',
                  background: isActive 
                    ? 'linear-gradient(135deg, #FF6900, #ff8533)'
                    : 'transparent',
                  color: isActive ? 'white' : '#6b7280',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px 20px',
                  fontSize: '14px',
                  fontWeight: isActive ? '600' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isActive 
                    ? '0 4px 16px rgba(255, 105, 0, 0.3)' 
                    : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  textAlign: 'center',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  textDecoration: 'none'
                }}
                data-testid={`tab-${tab.id}`}
              >
                <IconComponent size={16} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Content Area - Direttamente sullo sfondo come Settings */}
      <div>
            {activeTab === 'overview' && (
              <div className="space-y-6" data-testid="section-overview">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Welcome Card - WindTre Glass */}
                  <Card className="lg:col-span-2 glass-card hover:shadow-xl transition-all duration-300">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sun className="h-5 w-5 text-orange-500" />
                        Benvenuto, {displayUser.nome}!
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(), 'EEEE d MMMM yyyy', { locale: it })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {leaveLoading ? (
                          <>
                            <Skeleton className="h-24 rounded-lg" />
                            <Skeleton className="h-24 rounded-lg" />
                            <Skeleton className="h-24 rounded-lg" />
                            <Skeleton className="h-24 rounded-lg" />
                          </>
                        ) : (
                          <>
                            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg" data-testid="card-leave-balance">
                              <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                              <p className="text-sm text-green-700 font-medium" data-testid="label-leave-remaining">Ferie Rimanenti</p>
                              <p className="text-xl font-bold text-green-800" data-testid="text-leave-remaining">{displayLeaveBalance.ferieRimanenti}</p>
                            </div>
                            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg" data-testid="card-rol-balance">
                              <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                              <p className="text-sm text-blue-700 font-medium" data-testid="label-rol-remaining">Permessi ROL</p>
                              <p className="text-xl font-bold text-blue-800" data-testid="text-rol-remaining">{displayLeaveBalance.permessiRimanenti}</p>
                            </div>
                            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg" data-testid="card-performance">
                              <Target className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                              <p className="text-sm text-purple-700 font-medium" data-testid="label-performance">Performance</p>
                              <p className="text-xl font-bold text-purple-800" data-testid="text-performance-score">
                                {performanceLoading ? '...' : `${performanceData?.overview?.goalsAchieved || 0}/${performanceData?.overview?.totalGoals || 10}`}
                              </p>
                            </div>
                            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg" data-testid="card-training">
                              <GraduationCap className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                              <p className="text-sm text-orange-700 font-medium" data-testid="label-training">Formazione</p>
                              <p className="text-xl font-bold text-orange-800" data-testid="text-training-progress">
                                {trainingLoading ? '...' : `${trainingData?.overview?.ongoingCourses || 0}/${trainingData?.overview?.completedCourses || 0}`}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions - Enhanced with QuickActions component */}
                  <QuickActions
                    actions={[
                      {
                        id: 'leave-request',
                        title: 'Richiedi Ferie',
                        description: 'Invia richiesta',
                        icon: CalendarIcon,
                        color: '#FF6900',
                        onClick: () => {
                          setTab('requests');
                          setHrRequestModal({ open: true, data: { type: 'leave' } });
                        }
                      },
                      {
                        id: 'expense-report',
                        title: 'Nota Spese',
                        description: 'Compila spese',
                        icon: Receipt,
                        color: '#7B2CBF',
                        onClick: () => {
                          setTab('requests');
                          setHrRequestModal({ open: true, data: { type: 'expense' } });
                        }
                      },
                      {
                        id: 'payslip',
                        title: 'Buste Paga',
                        description: 'Scarica PDF',
                        icon: FileText,
                        color: '#10B981',
                        onClick: () => setTab('documents')
                      },
                      {
                        id: 'timesheet',
                        title: 'Timbrature',
                        description: 'Registra ore',
                        icon: Clock,
                        color: '#3B82F6',
                        onClick: () => setTab('time-attendance')
                      }
                    ] as QuickAction[]}
                    columns={2}
                    variant="compact"
                    className=""
                  />
                </div>

                {/* Notifications - WindTre Glass */}
                <Card className="glass-card hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2" data-testid="section-notifications">
                      <Bell className="h-5 w-5 text-orange-500" />
                      Notifiche Recenti
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {notificationsLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(Array.isArray(notifications) ? notifications : []).slice(0, 3).map((notification) => (
                          <Alert key={notification.id} className="border-l-4 border-l-orange-500" data-testid={`item-notification-${notification.id}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <AlertTitle className="text-sm font-medium" data-testid={`text-notification-title-${notification.id}`}>
                                  {notification.title || notification.titolo}
                                </AlertTitle>
                                <AlertDescription className="text-xs text-gray-600 mt-1" data-testid={`text-notification-message-${notification.id}`}>
                                  {notification.message || notification.messaggio}
                                </AlertDescription>
                              </div>
                              <Badge variant={notification.status === 'read' || notification.letto ? 'secondary' : 'default'} className="ml-2" data-testid={`badge-notification-status-${notification.id}`}>
                                {notification.status === 'read' || notification.letto ? 'Letto' : 'Nuovo'}
                              </Badge>
                            </div>
                          </Alert>
                        ))}
                        {(!Array.isArray(notifications) || notifications.length === 0) && (
                          <Alert>
                            <AlertDescription className="text-gray-500 text-center">
                              Nessuna notifica recente
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'time-attendance' && (
              <div className="space-y-6" data-testid="section-time-attendance">
                
                {/* =============== BARRA TABS PRINCIPALE - SPOSTATA ALL'INIZIO =============== */}
                <Card className="glass-card">
                  <CardContent className="p-4">
                    <Tabs defaultValue="riepilogo" className="w-full">
                      <TabsList className="grid w-full grid-cols-3" data-testid="tabs-time-tracking">
                        <TabsTrigger value="riepilogo" data-testid="tab-summary">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Riepilogo
                        </TabsTrigger>
                        <TabsTrigger value="presenze" data-testid="tab-attendance">
                          <Clock className="h-4 w-4 mr-2" />
                          Presenze
                        </TabsTrigger>
                        <TabsTrigger value="turni" data-testid="tab-shifts">
                          <Calendar1 className="h-4 w-4 mr-2" />
                          Turni
                        </TabsTrigger>
                      </TabsList>
                      
                      {/* ========== TAB RIEPILOGO - UNIFIED CLOCKING PANEL + STATS ========== */}
                      <TabsContent value="riepilogo" className="space-y-6">
                        {/* Sistema Timbratura Unificato */}
                        <UnifiedClockingPanel
                          userId={displayUser.matricola}
                          enabledStrategies={['gps', 'nfc', 'qr', 'smart', 'web', 'badge']}
                          defaultStrategy="gps"
                          onClockIn={() => {
                            // Refresh data after clock in
                            // TODO: Invalidate queries for time tracking
                          }}
                          onClockOut={() => {
                            // Refresh data after clock out  
                            // TODO: Invalidate queries for time tracking
                          }}
                        />
                        
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <Card className="glass-card">
                            <CardContent className="p-4 text-center">
                              <ClipboardList className="h-8 w-8 text-green-600 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">Ore di Lavoro</p>
                              <p className="text-2xl font-bold text-gray-900" data-testid="text-work-hours">
                                {currentSession?.totalHours || '0:00'}
                              </p>
                            </CardContent>
                          </Card>
                          
                          <Card className="glass-card">
                            <CardContent className="p-4 text-center">
                              <Coffee className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">Pause</p>
                              <p className="text-2xl font-bold text-gray-900" data-testid="text-break-time">
                                {currentSession?.breakTime || '0:00'}
                              </p>
                            </CardContent>
                          </Card>
                          
                          <Card className="glass-card">
                            <CardContent className="p-4 text-center">
                              <Activity className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">Status</p>
                              <p className="text-lg font-semibold text-gray-900" data-testid="text-work-status">
                                {currentSession?.status || 'Fuori Turno'}
                              </p>
                            </CardContent>
                          </Card>
                          
                          <Card className="glass-card">
                            <CardContent className="p-4 text-center">
                              <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                              <p className="text-sm text-gray-600">Produttività</p>
                              <p className="text-2xl font-bold text-gray-900" data-testid="text-productivity">
                                92%
                              </p>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>
                      
                      {/* ========== TAB PRESENZE - REGISTRO CRONOLOGICO ========== */}
                      <TabsContent value="presenze" className="space-y-4">
                        <Card className="glass-card">
                          <CardHeader>
                            <CardTitle>Registro Presenze</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="font-medium">Oggi</span>
                                <span className="text-green-600 font-semibold">8:30 - In corso</span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="font-medium">Ieri</span>
                                <span className="text-gray-600">8:30 - 17:30</span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="font-medium">Mercoledì</span>
                                <span className="text-gray-600">8:30 - 17:30</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                      
                      {/* ========== TAB TURNI - CALENDARIO INTERATTIVO ========== */}
                      <TabsContent value="turni" className="space-y-4">
                        <ShiftsCalendar
                          userId={displayUser.matricola}
                        />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="space-y-6" data-testid="section-requests">
                {/* Enhanced Requests Section with HR Request Wizard */}
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Le mie Richieste</h2>
                  <Button 
                    onClick={() => setHrRequestModal({ open: true, data: {} })}
                    className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                    data-testid="button-new-request"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuova Richiesta
                  </Button>
                </div>

                {/* Request Status Filter */}
                <div className="flex gap-4 mb-6">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtra per stato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte le richieste</SelectItem>
                      <SelectItem value="draft">Bozze</SelectItem>
                      <SelectItem value="pending">In attesa</SelectItem>
                      <SelectItem value="approved">Approvate</SelectItem>
                      <SelectItem value="rejected">Rifiutate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* ✅ CENTRALISED REQUESTS: Tabella unificata con tutte le colonne del sistema centralizzato */}
                <Card className="glass-card">
                  <CardContent className="p-0">
                    {requestsLoading ? (
                      <div className="p-6">
                        <Skeleton className="h-8 w-full mb-4" />
                        <Skeleton className="h-6 w-full mb-2" />
                        <Skeleton className="h-6 w-full mb-2" />
                        <Skeleton className="h-6 w-full" />
                      </div>
                    ) : myRequests.length === 0 ? (
                      <div className="p-8 text-center">
                        <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">Nessuna richiesta presente</p>
                        <p className="text-sm text-gray-400 mt-2">Crea la tua prima richiesta HR per iniziare</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome Richiesta</TableHead>
                            <TableHead>Categoria Richiesta</TableHead>
                            <TableHead>Tipologia Specifica</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Stato</TableHead>
                            <TableHead className="text-right">Azioni</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {myRequests.map((request) => (
                            <TableRow key={request.id} data-testid={`row-request-${request.id}`}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                  <div className="bg-gradient-to-r from-orange-500 to-purple-600 text-white p-2 rounded-lg">
                                    <FileText className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <p className="font-semibold" data-testid={`text-request-name-${request.id}`}>
                                      {request.title || 'Richiesta HR'}
                                    </p>
                                    {request.description && (
                                      <p className="text-sm text-gray-500 max-w-xs truncate" data-testid={`text-request-desc-${request.id}`}>
                                        {request.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell data-testid={`text-request-category-${request.id}`}>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">
                                    {request.category && ITALIAN_HR_CATEGORIES[request.category as keyof typeof ITALIAN_HR_CATEGORIES]?.icon || '📋'}
                                  </span>
                                  <span className="font-medium text-sm">
                                    {request.category && ITALIAN_HR_CATEGORIES[request.category as keyof typeof ITALIAN_HR_CATEGORIES]?.name || request.category || 'N/A'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell data-testid={`text-request-type-${request.id}`}>
                                <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                  {request.requestType && ITALIAN_REQUEST_TYPES[request.requestType as keyof typeof ITALIAN_REQUEST_TYPES] || request.requestType || 'N/A'}
                                </span>
                              </TableCell>
                              <TableCell data-testid={`text-request-date-${request.id}`}>
                                {request.createdAt ? format(new Date(request.createdAt), 'dd/MM/yyyy HH:mm') : 'N/A'}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  className={getStatusBadgeClass(request.status)}
                                  data-testid={`badge-request-status-${request.id}`}
                                >
                                  {getStatusLabel(request.status)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      // ✅ View/Edit request - per bozze si può modificare
                                      if (request.status === 'draft') {
                                        // TODO: Open in edit mode
                                        setHrRequestModal({ open: true, data: request });
                                      } else {
                                        // TODO: Open in view-only mode
                                        setHrRequestModal({ open: true, data: request });
                                      }
                                    }}
                                    data-testid={`button-view-request-${request.id}`}
                                    title={request.status === 'draft' ? 'Modifica richiesta' : 'Visualizza richiesta'}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {request.status === 'draft' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        // TODO: Elimina bozza
                                        if (confirm('Sei sicuro di voler eliminare questa bozza?')) {
                                          // Delete request
                                        }
                                      }}
                                      data-testid={`button-delete-request-${request.id}`}
                                      title="Elimina bozza"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <AlertCircle className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* ✅ Modal handled globally outside tabs to prevent conflicts */}
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-6" data-testid="section-documents">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">I miei Documenti</h2>
                  <Button 
                    className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                    data-testid="button-upload-document"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Carica Documento
                  </Button>
                </div>

                {/* Document Categories */}
                <DocumentCategories 
                  categories={[]}
                  selectedCategory={null}
                  onSelectCategory={(categoryId: string | null) => {
                    // Handle category selection
                  }}
                  onCategorySelect={(category: any) => {
                    // Handle category selection
                  }}
                  documentCounts={{
                    'payslip': 12,
                    'contract': 3,
                    'certificate': 5,
                    'id_document': 2,
                    'cv': 1,
                    'evaluation': 4,
                    'warning': 0,
                    'confidential': 8,
                    'expiring': 2
                  }}
                />

                {/* Document Grid */}
                <DocumentGrid
                  documents={documents}
                  viewMode="grid"
                  selectedDocuments={new Set<string>()}
                  onSelectDocument={(docId: string, isSelected: boolean) => {}}
                  onViewDocument={(doc: any) => {
                    setDocumentViewerModal({ open: true, data: doc });
                  }}
                  onDeleteDocument={async (docId: string) => {}}
                  onDocumentClick={(document: any) => {
                    setDocumentViewerModal({ open: true, data: document });
                  }}
                  isLoading={documentsLoading}
                />

                {/* Payslip Manager */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-orange-500" />
                      Buste Paga
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PayslipManager />
                  </CardContent>
                </Card>

                {/* Document Viewer Modal */}
                <Dialog 
                  open={documentViewerModal.open} 
                  onOpenChange={(open) => setDocumentViewerModal(open ? { open, data: documentViewerModal.data || {} } : { open: false, data: null })}
                >
                  <DialogContent className="max-w-4xl max-h-[90vh]">
                    {documentViewerModal.open && documentViewerModal.data && (
                      <DocumentViewer
                        document={documentViewerModal.data}
                        onClose={() => setDocumentViewerModal({ open: false, data: null })}
                      />
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="space-y-6" data-testid="section-performance">
                <h2 className="text-2xl font-bold text-gray-900">Le mie Performance</h2>
                
                {/* Performance Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="glass-card">
                    <CardContent className="p-6 text-center">
                      <Target className="h-12 w-12 text-green-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Obiettivi Raggiunti</h3>
                      <p className="text-3xl font-bold text-green-600" data-testid="text-goals-achieved">
                        {performanceLoading ? '...' : `${performanceData?.overview?.goalsAchieved || 0}/${performanceData?.overview?.totalGoals || 10}`}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">Questo trimestre</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="glass-card">
                    <CardContent className="p-6 text-center">
                      <TrendingUp className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Valutazione Media</h3>
                      <p className="text-3xl font-bold text-blue-600" data-testid="text-average-rating">
                        {performanceLoading ? '...' : `${performanceData?.overview?.averageRating || 0}/5`}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">Ultimi 6 mesi</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="glass-card">
                    <CardContent className="p-6 text-center">
                      <Award className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Riconoscimenti</h3>
                      <p className="text-3xl font-bold text-orange-600" data-testid="text-recognitions">
                        {performanceLoading ? '...' : performanceData?.overview?.recognitions || 0}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">Quest'anno</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Current Goals */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Obiettivi Correnti</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {performanceLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    ) : performance.length === 0 ? (
                      <div className="text-center py-8">
                        <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">Nessun obiettivo in corso</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {performance.map((goal) => (
                          <div key={goal.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold text-gray-900">{goal.title}</h4>
                              <Badge variant={goal.status === 'completed' ? 'default' : 'secondary'}>
                                {goal.status === 'completed' ? 'Completato' : 'In corso'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{goal.description}</p>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Progresso</span>
                                <span>{goal.progress}%</span>
                              </div>
                              <Progress value={goal.progress} className="h-2" />
                              <p className="text-xs text-gray-500">
                                Scadenza: {format(new Date(goal.deadline), 'dd MMM yyyy', { locale: it })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'training' && (
              <div className="space-y-6" data-testid="section-training">
                <h2 className="text-2xl font-bold text-gray-900">Formazione e Sviluppo</h2>
                
                {/* Training Progress */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="glass-card">
                    <CardContent className="p-6 text-center">
                      <BookOpen className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Corsi Completati</h3>
                      <p className="text-3xl font-bold text-blue-600" data-testid="text-completed-courses">
                        {trainingLoading ? '...' : trainingData?.overview?.completedCourses || 0}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">Quest'anno</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="glass-card">
                    <CardContent className="p-6 text-center">
                      <PlayCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">In Corso</h3>
                      <p className="text-3xl font-bold text-green-600" data-testid="text-ongoing-courses">
                        {trainingLoading ? '...' : trainingData?.overview?.ongoingCourses || 0}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">Corsi attivi</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="glass-card">
                    <CardContent className="p-6 text-center">
                      <Star className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Certificazioni</h3>
                      <p className="text-3xl font-bold text-orange-600" data-testid="text-certifications">
                        {trainingLoading ? '...' : trainingData?.overview?.certifications || 0}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">Ottenute</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Available Courses */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Corsi Disponibili</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {trainingLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    ) : training.length === 0 ? (
                      <div className="text-center py-8">
                        <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">Nessun corso disponibile al momento</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {training.map((course) => (
                          <div key={course.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold text-gray-900">{course.title}</h4>
                              <div className="flex gap-2">
                                <Badge variant={
                                  course.status === 'required' ? 'destructive' :
                                  course.status === 'recommended' ? 'default' :
                                  course.status === 'completed' ? 'secondary' : 'outline'
                                }>
                                  {course.status === 'required' ? 'Obbligatorio' :
                                   course.status === 'recommended' ? 'Consigliato' :
                                   course.status === 'completed' ? 'Completato' : 'Disponibile'}
                                </Badge>
                                <Badge variant="outline">{course.difficulty}</Badge>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{course.description}</p>
                            <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                              <span>Durata: {course.duration}</span>
                              <span>Categoria: {course.category}</span>
                            </div>
                            {course.progress > 0 && (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Progresso</span>
                                  <span>{course.progress}%</span>
                                </div>
                                <Progress value={course.progress} className="h-2" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6" data-testid="section-profile">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Il mio Profilo</h2>
                  <Button 
                    onClick={() => setProfileEditModal({ open: true, data: {} })}
                    variant="outline"
                    data-testid="button-edit-profile"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Modifica
                  </Button>
                </div>

                {/* Profile Information */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Personal Information */}
                  <Card className="lg:col-span-2 glass-card">
                    <CardHeader>
                      <CardTitle>Informazioni Personali</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {userLoading ? (
                        <div className="space-y-4">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Nome</Label>
                            <p className="text-gray-900 font-medium" data-testid="text-profile-firstname">{displayUser.nome}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Cognome</Label>
                            <p className="text-gray-900 font-medium" data-testid="text-profile-lastname">{displayUser.cognome}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Email</Label>
                            <p className="text-gray-900" data-testid="text-profile-email">{displayUser.email}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Telefono</Label>
                            <p className="text-gray-900" data-testid="text-profile-phone">{displayUser.telefono || 'Non specificato'}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Matricola</Label>
                            <p className="text-gray-900 font-mono" data-testid="text-profile-id">{displayUser.matricola}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">Ruolo</Label>
                            <p className="text-gray-900" data-testid="text-profile-role">{displayUser.ruolo}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Profile Picture - Now with working avatar upload */}
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle>Foto Profilo</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <AvatarSelector
                        currentAvatarUrl={displayUser.foto || undefined}
                        firstName={displayUser.nome}
                        lastName={displayUser.cognome}
                        username={displayUser.email}
                        onAvatarChange={async (avatarData) => {
                          console.log('🖼️ Avatar change requested for profile:', avatarData);
                          
                          try {
                            if (!displayUser.matricola) {
                              console.error('❌ No user ID available for avatar update');
                              return;
                            }
                            
                            // Update avatar using existing API endpoint
                            const response = await fetch(`/api/users/${displayUser.matricola}/avatar`, {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                                'X-Tenant-ID': localStorage.getItem('currentTenantId') || '00000000-0000-0000-0000-000000000001'
                              },
                              body: JSON.stringify({
                                avatarUrl: avatarData.url || null
                              })
                            });

                            if (!response.ok) {
                              const errorData = await response.json();
                              throw new Error(errorData.message || `Failed to update avatar: ${response.statusText}`);
                            }

                            const result = await response.json();
                            console.log('✅ Avatar updated successfully:', result);
                            
                            // Refresh user data to show updated avatar
                            setTimeout(() => {
                              window.location.reload();
                            }, 1000);

                          } catch (error) {
                            console.error('❌ Error updating avatar:', error);
                            alert('Errore durante l\'aggiornamento dell\'avatar. Riprova.');
                          }
                        }}
                        loading={false}
                        size={120}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Work Information */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Informazioni Lavorative</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Punto Vendita</Label>
                        <p className="text-gray-900" data-testid="text-profile-store">{displayUser.store || 'Non assegnato'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Dipartimento</Label>
                        <p className="text-gray-900" data-testid="text-profile-department">{displayUser.department || 'Non specificato'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Data Assunzione</Label>
                        <p className="text-gray-900" data-testid="text-profile-hire-date">{displayUser.dataAssunzione || 'Non specificata'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Profile Edit Modal */}
                <Dialog 
                  open={profileEditModal.open} 
                  onOpenChange={(open) => setProfileEditModal(open ? { open, data: {} } : { open: false, data: null })}
                >
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Modifica Profilo</DialogTitle>
                      <DialogDescription>
                        Aggiorna le tue informazioni personali
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">Nome</Label>
                          <Input id="firstName" defaultValue={displayUser.nome} />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Cognome</Label>
                          <Input id="lastName" defaultValue={displayUser.cognome} />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue={displayUser.email} />
                      </div>
                      <div>
                        <Label htmlFor="phone">Telefono</Label>
                        <Input id="phone" defaultValue={displayUser.telefono || ''} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setProfileEditModal({ open: false, data: null })}>
                        Annulla
                      </Button>
                      <Button className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700">
                        <Save className="h-4 w-4 mr-2" />
                        Salva Modifiche
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          
          {/* HR Request Modal - Restored Original Complete Form */}
          <HRRequestForm
            open={hrRequestModal.open}
            onOpenChange={(open) => setHrRequestModal(open ? { open, data: {} } : { open: false, data: null })}
            onSubmit={(data) => {
              createRequestMutation.mutate(data);
            }}
            isSubmitting={createRequestMutation.isPending}
          />
      </div>
    </Layout>
  );
}

// ✅ HR Request Form Component
interface HRRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

// 🇮🇹 Traduzione tipi di richiesta HR per sistema centralizzato
const ITALIAN_REQUEST_TYPES = {
  // Leave types
  'vacation': 'Ferie Annuali',
  'rol': 'ROL (Riduzione Orario Lavorativo)',
  'ex_festivita': 'Ex Festività',
  'permesso_breve': 'Permesso Breve',
  
  // Italian legal leaves
  'matrimonio': 'Congedo Matrimoniale',
  'maternita': 'Congedo di Maternità',
  'paternita': 'Congedo di Paternità', 
  'lutto': 'Congedo per Lutto',
  'legge_104': 'Permessi Legge 104/92',
  
  // Family & assistance
  'figli_malattia': 'Congedo per Malattia Figli',
  'assistenza_familiari': 'Congedo Assistenza Familiari',
  'donazione_sangue': 'Permesso Donazione Sangue',
  
  // Professional development  
  'formazione': 'Formazione Professionale',
  'corsi_esterni': 'Corsi Esterni',
  'conferenze': 'Conferenze e Eventi',
  
  // Wellness & health
  'visite_mediche': 'Visite Mediche',
  'malattia': 'Congedo per Malattia',
  'recupero_straordinari': 'Recupero Straordinari',
  
  // Remote work
  'smart_working': 'Smart Working',
  'lavoro_agile': 'Lavoro Agile',
  'telelavoro': 'Telelavoro',
  
  // Schedule changes
  'cambio_turno': 'Cambio Turno',
  'orario_flessibile': 'Orario Flessibile',
  'part_time': 'Richiesta Part-time',
  
  // Other
  'altro': 'Altra Tipologia',
  'documenti_personali': 'Documenti Personali'
};

// 🇮🇹 Complete Italian HR Request Categories based on Labor Law and Web Research
const ITALIAN_HR_CATEGORIES = {
  // Primary Categories from Database Enum + Web Research
  leave: {
    name: 'Ferie e Permessi',
    description: 'Vacanze retribuite, ROL, ex festività, permessi brevi',
    icon: '🏖️'
  },
  italian_legal: {
    name: 'Congedi Legali',
    description: 'Matrimonio, maternità, paternità, lutto, Legge 104',
    icon: '⚖️'
  },
  family: {
    name: 'Famiglia e Assistenza',
    description: 'Congedo parentale, allattamento, assistenza familiare',
    icon: '👨‍👩‍👧‍👦'
  },
  professional_development: {
    name: 'Formazione e Carriera', 
    description: 'Corsi, conferenze, sviluppo professionale, certificazioni',
    icon: '📚'
  },
  wellness_health: {
    name: 'Salute e Benessere',
    description: 'Malattia, visite mediche, wellness program, salute mentale',
    icon: '🏥'
  },
  remote_work: {
    name: 'Lavoro Agile',
    description: 'Smart working, lavoro remoto, VPN, equipaggiamento',
    icon: '💻'
  },
  schedule: {
    name: 'Orari e Turni',
    description: 'Straordinari, cambio turni, orario flessibile',
    icon: '⏰'
  },
  other: {
    name: 'Altre Richieste',
    description: 'Richieste particolari e personalizzate',
    icon: '📋'
  }
} as const;

// 🇮🇹 Complete Italian HR Request Types mapped to Database Enum
const ITALIAN_HR_TYPES = {
  // 🏖️ FERIE E PERMESSI (Leave Category)
  leave: {
    vacation: { name: 'Ferie Annuali', desc: 'Vacanze retribuite (min. 26gg/anno)', legal: 'Art. 36 Costituzione' },
    rol_leave: { name: 'Permessi ROL', desc: 'Riduzione Orario Lavoro', legal: 'CCNL' },
    personal: { name: 'Permessi Personali', desc: 'Ex festività e permessi brevi', legal: 'CCNL' },
    study_leave: { name: 'Permessi Studio', desc: 'Diritto allo studio (150h/3anni)', legal: 'L. 300/70 art. 10' },
    electoral_leave: { name: 'Permesso Elettorale', desc: 'Seggio elettorale, referendum', legal: 'DPR 570/60' }
  },
  
  // ⚖️ CONGEDI LEGALI (Italian Legal Category) 
  italian_legal: {
    marriage_leave: { name: 'Congedo Matrimoniale', desc: '15 giorni calendari', legal: 'Art. 1 L. 53/00' },
    bereavement_extended: { name: 'Permesso Lutto', desc: '3 giorni/anno (parenti 2° grado)', legal: 'Art. 4 L. 53/00' },
    law_104_leave: { name: 'Permessi Legge 104', desc: '3 giorni/mese o 2h/giorno', legal: 'L. 104/92' },
    jury_duty: { name: 'Servizio Giuria', desc: 'Tribunale popolare, corte assise', legal: 'CPP' },
    military: { name: 'Servizio Militare', desc: 'Richiami, ferma volontaria', legal: 'L. 331/00' }
  },
  
  // 👨‍👩‍👧‍👦 FAMIGLIA E ASSISTENZA (Family Category)
  family: {
    maternity_leave: { name: 'Congedo Maternità', desc: '5 mesi retribuiti (2+3)', legal: 'D.Lgs 151/01' },
    paternity_leave: { name: 'Congedo Paternità', desc: '10 giorni obbligatori', legal: 'D.Lgs 151/01' },
    parental_leave: { name: 'Congedo Parentale', desc: '10-11 mesi totali genitori', legal: 'D.Lgs 151/01' },
    breastfeeding_leave: { name: 'Permessi Allattamento', desc: '2h/giorno o riposi giornalieri', legal: 'D.Lgs 151/01' }
  },
  
  // 📚 FORMAZIONE E CARRIERA (Professional Development Category)
  professional_development: {
    training_request: { name: 'Richiesta Corso', desc: 'Formazione professionale aziendale', legal: 'CCNL' },
    certification_request: { name: 'Certificazioni', desc: 'Qualifiche e abilitazioni', legal: 'CCNL' },
    conference_attendance: { name: 'Convegni', desc: 'Partecipazione eventi formativi', legal: 'CCNL' },
    mentorship_request: { name: 'Mentorship', desc: 'Programma di tutoraggio', legal: 'Piano formativo' },
    career_development: { name: 'Sviluppo Carriera', desc: 'Pianificazione crescita professionale', legal: 'Valutazione' }
  },
  
  // 🏥 SALUTE E BENESSERE (Wellness Health Category)
  wellness_health: {
    sick: { name: 'Malattia', desc: 'Congedo per malattia (certificato)', legal: 'INPS/CCNL' },
    medical_appt: { name: 'Visita Medica', desc: 'Visite specialistiche, controlli', legal: 'CCNL' },
    wellness_program: { name: 'Wellness Program', desc: 'Programmi benessere aziendale', legal: 'Piano welfare' },
    mental_health_support: { name: 'Supporto Psicologico', desc: 'Assistenza salute mentale', legal: 'Piano welfare' },
    gym_membership: { name: 'Palestra Aziendale', desc: 'Abbonamento fitness', legal: 'Benefit' }
  },
  
  // 💻 LAVORO AGILE (Remote Work Category) 
  remote_work: {
    wfh: { name: 'Smart Working', desc: 'Lavoro agile da remoto', legal: 'L. 81/17' },
    remote_work_request: { name: 'Lavoro Remoto', desc: 'Telelavoro strutturato', legal: 'CCNL' },
    equipment_request: { name: 'Attrezzature', desc: 'PC, monitor, periferiche', legal: 'Sicurezza lavoro' },
    vpn_access: { name: 'Accesso VPN', desc: 'Connessione aziendale remota', legal: 'GDPR' },
    internet_stipend: { name: 'Rimborso Internet', desc: 'Connettività domestica', legal: 'Benefit' }
  },
  
  // ⏰ ORARI E TURNI (Schedule Category)
  schedule: {
    overtime: { name: 'Lavoro Straordinario', desc: 'Ore supplementari', legal: 'CCNL' },
    shift_swap: { name: 'Cambio Turno', desc: 'Scambio con colleghi', legal: 'Organizzazione' },
    flex_hours: { name: 'Orario Flessibile', desc: 'Flessibilità entrata/uscita', legal: 'CCNL' },
    time_change: { name: 'Modifica Orario', desc: 'Cambio orario di lavoro', legal: 'Accordo' }
  },
  
  // 📋 ALTRE RICHIESTE (Other Category)
  other: {
    sabbatical_request: { name: 'Anno Sabbatico', desc: 'Aspettativa lunga retribuita', legal: 'CCNL' },
    sabbatical_unpaid: { name: 'Aspettativa', desc: 'Congedo non retribuito', legal: 'CCNL' },
    volunteer_leave: { name: 'Volontariato', desc: 'Attività di volontariato', legal: 'L. 266/91' },
    donation_leave: { name: 'Donazione', desc: 'Sangue, midollo, organi', legal: 'L. 107/90' }
  }
} as const;

// HR Request validation schema aligned with backend
const hrRequestSchema = z.object({
  category: z.enum(['leave', 'schedule', 'other', 'italian_legal', 'family', 'professional_development', 'wellness_health', 'remote_work', 'technology_support']),
  type: z.enum([
    // Leave types
    'vacation', 'sick', 'fmla', 'parental', 'bereavement', 'personal', 'religious', 'military',
    'jury_duty', 'medical_appt', 'emergency', 'shift_swap', 'time_change', 'flex_hours', 'wfh', 'overtime',
    // Italian-specific
    'marriage_leave', 'maternity_leave', 'paternity_leave', 'parental_leave', 'breastfeeding_leave',
    'law_104_leave', 'study_leave', 'rol_leave', 'electoral_leave', 'bereavement_extended',
    // Modern types
    'remote_work_request', 'equipment_request', 'training_request', 'certification_request',
    'sabbatical_request', 'sabbatical_unpaid', 'wellness_program', 'mental_health_support',
    'gym_membership', 'financial_counseling', 'pet_insurance', 'ergonomic_assessment',
    'vpn_access', 'internet_stipend', 'mobile_allowance', 'conference_attendance',
    'mentorship_request', 'skill_assessment', 'career_development', 'experience_rewards',
    'volunteer_leave', 'donation_leave'
  ]),
  startDate: z.string().min(1, "Data di inizio è obbligatoria"),
  endDate: z.string().optional(),
  reason: z.string().min(5, "Motivo deve essere di almeno 5 caratteri").max(1000, "Motivo troppo lungo"),
  priority: z.enum(['normal', 'high', 'urgent']).optional().default('normal')
});

type HRRequestFormData = z.infer<typeof hrRequestSchema>;

const HRRequestForm: React.FC<HRRequestFormProps> = ({ open, onOpenChange, onSubmit, isSubmitting }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<HRRequestFormData>({
    type: 'vacation',
    startDate: '',
    endDate: '',
    reason: '',
    category: 'leave',
    priority: 'normal'
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Helper function to get display name for request type
  const getTypeDisplayName = (type: string): string => {
    const typeNames: Record<string, string> = {
      'vacation': 'Ferie Annuali',
      'sick': 'Congedo Malattia', 
      'personal': 'Permesso Personale',
      'maternity_leave': 'Congedo Maternità',
      'overtime': 'Straordinario',
      'flex_hours': 'Recupero Ore',
      'equipment_request': 'Richiesta Attrezzature',
      'training_request': 'Formazione',
      'conference_attendance': 'Convegno',
      'wfh': 'Smart Working',
      'remote_work_request': 'Lavoro Remoto'
    };
    return typeNames[type] || type;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous validation errors
    setValidationErrors({});
    
    // Validate form data with zod schema
    const validationResult = hrRequestSchema.safeParse(formData);
    
    if (!validationResult.success) {
      // Set validation errors
      const errors: Record<string, string> = {};
      validationResult.error.errors.forEach((error) => {
        if (error.path.length > 0) {
          errors[error.path[0]] = error.message;
        }
      });
      setValidationErrors(errors);
      return;
    }

    // Submit data with proper format for backend API
    const validatedData = validationResult.data;
    onSubmit({
      // Backend schema requires: category, requestType, requestSubtype, title, description
      category: 'hr', // Fixed category for HR requests
      requestType: validatedData.category, // Use category as requestType (leave, permission, training, etc.)
      requestSubtype: validatedData.type, // Use type as requestSubtype (vacation, sick, etc.)
      title: `${getTypeDisplayName(validatedData.type)} - ${validatedData.startDate}`,
      description: validatedData.reason || '', // Use reason as description
      priority: validatedData.priority || 'normal',
      startDate: `${validatedData.startDate}T00:00:00.000Z`,
      endDate: validatedData.endDate ? `${validatedData.endDate}T23:59:59.999Z` : `${validatedData.startDate}T23:59:59.999Z`,
      requestData: { // Additional data in requestData field
        originalType: validatedData.type,
        originalCategory: validatedData.category
      }
    });
  };

  const resetForm = () => {
    setFormData({
      type: 'vacation',
      startDate: '',
      endDate: '',
      reason: '',
      category: 'leave',
      priority: 'normal'
    });
    setValidationErrors({});
  };

  // Draft functionality
  const DRAFT_KEY = 'hr_request_draft';
  
  const saveDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
      toast({
        title: "Bozza salvata",
        description: "La tua richiesta è stata salvata come bozza e può essere ripresa in qualsiasi momento.",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Non è stato possibile salvare la bozza.",
        variant: "destructive",
      });
    }
  };

  const loadDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draftData = JSON.parse(saved);
        setFormData(draftData);
        toast({
          title: "Bozza caricata",
          description: "La tua bozza precedente è stata ripristinata.",
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Non è stato possibile caricare la bozza.",
        variant: "destructive",
      });
    }
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      // Silent fail for localStorage issues
    }
  };

  const hasDraft = (): boolean => {
    try {
      return localStorage.getItem(DRAFT_KEY) !== null;
    } catch (error) {
      return false;
    }
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(open) => {
        if (!open) resetForm();
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-modal">
        <DialogHeader className="pb-6 border-b border-gray-200/50">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="bg-gradient-to-r from-orange-500 to-purple-600 text-white p-2.5 rounded-xl">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-orange-600 to-purple-700 bg-clip-text text-transparent font-bold">
                Nuova Richiesta HR
              </span>
              <div className="text-sm text-gray-600 font-normal mt-1">
                Sistema di richieste integrate WindTre
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="text-gray-600 leading-relaxed mt-4">
            Compila il modulo per inviare una nuova richiesta HR. Il sistema seguirà automaticamente 
            i workflow di approvazione aziendali secondo la normativa italiana del lavoro.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span>📂</span> Categoria Richiesta
              </Label>
              <Select 
                value={formData.category} 
                onValueChange={(value: typeof formData.category) => {
                  // Reset type when category changes
                  setFormData({ ...formData, category: value, type: 'vacation' });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona categoria">
                    {formData.category && ITALIAN_HR_CATEGORIES[formData.category as keyof typeof ITALIAN_HR_CATEGORIES]?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-w-md">
                  {Object.entries(ITALIAN_HR_CATEGORIES).map(([key, category]) => (
                    <SelectItem key={key} value={key} className="py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl flex-shrink-0">{category.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 text-sm">{category.name}</div>
                          <div className="text-xs text-gray-600 leading-tight mt-0.5">{category.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span>🎯</span> Tipologia Specifica
              </Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: typeof formData.type) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona tipo">
                    {formData.type && formData.category && ITALIAN_HR_TYPES[formData.category as keyof typeof ITALIAN_HR_TYPES]?.[formData.type as keyof any]?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-w-lg max-h-80">
                  {formData.category && ITALIAN_HR_TYPES[formData.category as keyof typeof ITALIAN_HR_TYPES] && 
                    Object.entries(ITALIAN_HR_TYPES[formData.category as keyof typeof ITALIAN_HR_TYPES]).map(([key, type]) => (
                      <SelectItem key={key} value={key} className="py-3">
                        <div className="space-y-1">
                          <div className="font-semibold text-gray-900 text-sm">{type.name}</div>
                          <div className="text-xs text-gray-600 leading-tight">{type.desc}</div>
                          <div className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded font-medium">{type.legal}</div>
                        </div>
                      </SelectItem>
                    ))
                  }
                  {!formData.category && (
                    <SelectItem value="" disabled className="py-3">
                      <div className="flex items-center gap-2 text-gray-400">
                        <span>💡</span>
                        <span>Seleziona prima una categoria</span>
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span>📅</span> Data Inizio *
              </Label>
              <Input 
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span>🏁</span> Data Fine (opzionale)
              </Label>
              <Input 
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                min={formData.startDate}
              />
            </div>
          </div>

          {/* Removed Legal Information Panel */}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span>✍️</span> Motivazione *
            </Label>
            <Textarea 
              id="reason"
              placeholder={`Descrivi la tua richiesta per ${formData.category && ITALIAN_HR_CATEGORIES[formData.category as keyof typeof ITALIAN_HR_CATEGORIES] ? ITALIAN_HR_CATEGORIES[formData.category as keyof typeof ITALIAN_HR_CATEGORIES].name : 'questa tipologia'}...`}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="space-y-4 pt-6 border-t border-gray-200/50">
            {/* Draft Actions Row */}
            <div className="flex gap-3">
              {hasDraft() && (
                <Button 
                  type="button"
                  variant="outline"
                  onClick={loadDraft}
                  disabled={isSubmitting}
                  className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                  data-testid="button-load-draft"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Carica Bozza
                </Button>
              )}
              <Button 
                type="button"
                variant="outline"
                onClick={saveDraft}
                disabled={isSubmitting}
                className="flex-1 border-green-200 text-green-700 hover:bg-green-50"
                data-testid="button-save-draft"
              >
                <Save className="h-4 w-4 mr-2" />
                Salva Bozza
              </Button>
            </div>
            
            {/* Main Actions Row */}
            <div className="flex gap-4">
              <Button 
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="flex-1"
                data-testid="button-cancel"
              >
                Annulla
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting || Object.keys(validationErrors).length > 0}
                className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 flex-1"
                data-testid="button-submit"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Invia Richiesta
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};