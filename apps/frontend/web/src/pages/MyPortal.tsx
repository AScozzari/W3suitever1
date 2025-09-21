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
  Share2, Upload, Receipt
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Link } from 'wouter';
import { z } from 'zod';
import ClockWidget from '@/components/TimeTracking/ClockWidget';
// Lazy load TimeAttendancePage to improve initial load time
const TimeAttendancePage = React.lazy(() => import('@/components/TimeTracking/TimeAttendancePage'));
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
  
  // ✅ RESTORED: HR Requests data for employee portal (scoped to current user)
  const { data: myRequestsData = [], isLoading: requestsLoading } = useQuery<any[]>({
    queryKey: ['/api/hr/requests/mine'],
    enabled: hrQueriesEnabled, // Wait for auth readiness
    staleTime: 2 * 60 * 1000,
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
  
  // ✅ STEP 2: Create HR Request Mutation
  const createRequestMutation = useMutation({
    mutationFn: async (requestData: any) => {
      return await apiRequest('/api/hr/requests', {
        method: 'POST',
        body: JSON.stringify(requestData),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/requests/mine'] });
      toast({
        title: "Richiesta inviata",
        description: "La tua richiesta è stata inviata con successo e sarà esaminata dal manager.",
      });
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

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'rejected': return 'bg-red-500';
      case 'in_progress': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

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
                {/* COMPLETELY REDESIGNED HORIZONTAL TIME ATTENDANCE INTERFACE */}
                
                {/* HEADER - COMPACT */}
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-windtre-orange" />
                        Sistema Timbratura Avanzato
                      </div>
                      <Badge variant="outline" className="glass-button">
                        Multi-metodo: GPS, NFC, QR, Smart
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                </Card>

                {/* RESPONSIVE FLEXBOX LAYOUT - FULL HORIZONTAL UTILIZATION */}
                <div className="flex flex-col xl:flex-row gap-6 w-full">
                  {/* LEFT: ClockWidget (Mobile: Full Width, Desktop: 40%) */}
                  <div className="w-full xl:w-[40%] xl:flex-none">
                    <ClockWidget
                      userId={displayUser.matricola}
                      userName={`${displayUser.nome} ${displayUser.cognome}`.trim()}
                      storeId="store-001" 
                      storeName={displayUser.store}
                      className="h-full"
                      onClockIn={() => {
                        // Refresh data after clock in
                      }}
                      onClockOut={() => {
                        // Refresh data after clock out  
                      }}
                    />
                  </div>
                  
                  {/* RIGHT: TimeAttendancePage (Mobile: Full Width, Desktop: 60%) - Lazy loaded */}
                  <div className="w-full xl:w-[60%] xl:flex-1">
                    <React.Suspense fallback={
                      <Card className="glass-card h-full flex items-center justify-center">
                        <CardContent>
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
                            <p className="text-gray-500">Caricamento Time & Attendance...</p>
                          </div>
                        </CardContent>
                      </Card>
                    }>
                      <TimeAttendancePage
                        userId={displayUser.matricola}
                      />
                    </React.Suspense>
                  </div>
                </div>

                {/* ALTERNATIVE VIEWS - HORIZONTAL TABS */}
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
                      
                      <TabsContent value="riepilogo" className="space-y-6">
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
                      
                      <TabsContent value="turni" className="space-y-4">
                        <Card className="glass-card">
                          <CardHeader>
                            <CardTitle>Turni Programmati</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                <span className="font-medium">Oggi</span>
                                <span className="text-blue-600 font-semibold">8:30 - 17:30</span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="font-medium">Domani</span>
                                <span className="text-gray-600">8:30 - 17:30</span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="font-medium">Sabato</span>
                                <span className="text-gray-600">Riposo</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
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
                      <SelectItem value="pending">In attesa</SelectItem>
                      <SelectItem value="approved">Approvate</SelectItem>
                      <SelectItem value="rejected">Rifiutate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Requests Grid */}
                <div className="grid gap-4">
                  {requestsLoading ? (
                    <>
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </>
                  ) : (
                    <>
                      {myRequests.length === 0 ? (
                        <Card className="glass-card">
                          <CardContent className="p-8 text-center">
                            <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">Nessuna richiesta presente</p>
                          </CardContent>
                        </Card>
                      ) : (
                        myRequests.map((request) => (
                          <Card key={request.id} className="glass-card hover:shadow-lg transition-all duration-200" data-testid={`card-request-${request.id}`}>
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-semibold text-lg" data-testid={`text-request-title-${request.id}`}>
                                      {request.tipo}
                                    </h3>
                                    <Badge 
                                      className={`${getStatusColor(request.stato)} text-white`}
                                      data-testid={`badge-request-status-${request.id}`}
                                    >
                                      {request.stato}
                                    </Badge>
                                  </div>
                                  <p className="text-gray-600 mb-3" data-testid={`text-request-description-${request.id}`}>
                                    {request.descrizione}
                                  </p>
                                  <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span data-testid={`text-request-date-${request.id}`}>
                                      Creata: {format(new Date(request.dataCreazione), 'dd/MM/yyyy')}
                                    </span>
                                    {request.dataInizio && (
                                      <span data-testid={`text-request-start-${request.id}`}>
                                        Dal: {format(new Date(request.dataInizio), 'dd/MM/yyyy')}
                                      </span>
                                    )}
                                    {request.dataFine && (
                                      <span data-testid={`text-request-end-${request.id}`}>
                                        Al: {format(new Date(request.dataFine), 'dd/MM/yyyy')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    // Open request details
                                  }}
                                  data-testid={`button-view-request-${request.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </>
                  )}
                </div>

                {/* ✅ RESTORED: HR Request Creation Modal with real form */}
                <HRRequestForm 
                  open={hrRequestModal.open}
                  onOpenChange={(open) => setHrRequestModal(open ? { open, data: {} } : { open: false, data: null })}
                  onSubmit={(requestData) => createRequestMutation.mutate(requestData)}
                  isSubmitting={createRequestMutation.isPending}
                />
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
                  documentCounts={{}}
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
      requesterId: 'admin-user', // Current user ID from auth
      title: `${getTypeDisplayName(validatedData.type)} - ${validatedData.startDate}`, // Required field
      type: validatedData.type,
      startDate: `${validatedData.startDate}T00:00:00.000Z`, // Convert to datetime
      endDate: validatedData.endDate ? `${validatedData.endDate}T23:59:59.999Z` : `${validatedData.startDate}T23:59:59.999Z`, // Convert to datetime
      notes: validatedData.reason,
      priority: validatedData.priority || 'normal',
      category: validatedData.category
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

  return (
    <Dialog 
      open={open} 
      onOpenChange={(open) => {
        if (!open) resetForm();
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-orange-600" />
            Nuova Richiesta HR
          </DialogTitle>
          <DialogDescription>
            Compila il modulo per inviare una nuova richiesta. Sarà processata tramite il workflow automatico.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leave">Ferie e Permessi</SelectItem>
                  <SelectItem value="overtime">Straordinario</SelectItem>
                  <SelectItem value="expense">Rimborso Spese</SelectItem>
                  <SelectItem value="training">Formazione</SelectItem>
                  <SelectItem value="remote">Smart Working</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div>
              <Label htmlFor="type">Tipo Richiesta</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona tipo" />
                </SelectTrigger>
                <SelectContent>
                  {formData.category === 'leave' && (
                    <>
                      <SelectItem value="vacation">Ferie Annuali</SelectItem>
                      <SelectItem value="sick">Congedo per Malattia</SelectItem>
                      <SelectItem value="personal">Permesso Personale</SelectItem>
                      <SelectItem value="maternity_leave">Congedo Maternità</SelectItem>
                    </>
                  )}
                  {formData.category === 'overtime' && (
                    <>
                      <SelectItem value="overtime">Richiesta Straordinario</SelectItem>
                      <SelectItem value="flex_hours">Recupero Ore</SelectItem>
                    </>
                  )}
                  {formData.category === 'expense' && (
                    <>
                      <SelectItem value="equipment_request">Richiesta Attrezzature</SelectItem>
                      <SelectItem value="training_request">Formazione</SelectItem>
                    </>
                  )}
                  {formData.category === 'training' && (
                    <>
                      <SelectItem value="training_request">Richiesta Corso</SelectItem>
                      <SelectItem value="conference_attendance">Partecipazione Convegno</SelectItem>
                    </>
                  )}
                  {formData.category === 'remote' && (
                    <>
                      <SelectItem value="wfh">Smart Working</SelectItem>
                      <SelectItem value="remote_work_request">Lavoro Remoto</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <Label htmlFor="startDate">Data Inizio *</Label>
              <Input 
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            {/* End Date */}
            <div>
              <Label htmlFor="endDate">Data Fine</Label>
              <Input 
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                min={formData.startDate}
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <Label htmlFor="reason">Motivazione *</Label>
            <Textarea 
              id="reason"
              placeholder="Descrivi la tua richiesta..."
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Annulla
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting || Object.keys(validationErrors).length > 0}
              className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 flex-1"
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
        </form>
      </DialogContent>
    </Dialog>
  );
};