import { useState, useEffect } from 'react';
import { useTabRouter } from '@/hooks/useTabRouter';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/hooks/useAuth';
import { useUser } from '@/hooks/useUsers';
import { useNotifications } from '@/hooks/useNotifications';
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
  Share2, Upload
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Link } from 'wouter';
import ClockWidget from '@/components/TimeTracking/ClockWidget';
import TimeAttendancePage from '@/components/TimeTracking/TimeAttendancePage';
import HRRequestWizard from '@/components/HR/HRRequestWizard';
import HRRequestDetails from '@/components/HR/HRRequestDetails';
import PayslipManager from '@/components/Documents/PayslipManager';
import DocumentGrid from '@/components/Documents/DocumentGrid';
import DocumentCategories from '@/components/Documents/DocumentCategories';
import DocumentUploadModal from '@/components/Documents/DocumentUploadModal';
import DocumentViewer from '@/components/Documents/DocumentViewer';
import { LeaveBalanceWidget } from '@/components/Leave/LeaveBalanceWidget';
import { LeaveCalendar } from '@/components/Leave/LeaveCalendar';
import { useCurrentSession, useTimeBalance } from '@/hooks/useTimeTracking';
import { useHRRequests, HRRequestFilters } from '@/hooks/useHRRequests';
import { useLeaveBalance } from '@/hooks/useLeaveManagement';
import { useDocumentDrive } from '@/hooks/useDocumentDrive';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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

export default function EmployeeDashboard() {
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
  
  // Real data queries with hierarchical cache keys - REVERTED TO STABLE VERSION
  const { data: userData, isLoading: userLoading, error: userError } = useUser(userId || '');
  const { data: leaveBalance, isLoading: leaveLoading } = useLeaveBalance(userId || '');
  const { data: notifications = [], isLoading: notificationsLoading } = useNotifications({ status: 'unread', limit: 3 });
  const { data: myRequestsData, isLoading: requestsLoading } = useHRRequests({ status: 'pending', limit: 5 });
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
  
  // Extract requests from response and provide fallbacks
  const myRequests = Array.isArray(myRequestsData) ? myRequestsData : (myRequestsData?.data || []);
  
  // Loading states
  const isLoading = userLoading || leaveLoading || notificationsLoading || requestsLoading;
  
  // Display user info with fallbacks
  const displayUser = {
    nome: (userData as any)?.firstName || authUser?.name?.split(' ')[0] || 'Demo',
    cognome: (userData as any)?.lastName || authUser?.name?.split(' ')[1] || 'User',
    email: (userData as any)?.email || authUser?.email || 'demo@windtre.it',
    telefono: (userData as any)?.phone || '+39 335 123 4567',
    ruolo: (userData as any)?.position || 'Employee',
    reparto: (userData as any)?.department || 'General',
    matricola: (userData as any)?.id || 'W3-DEMO',
    foto: (userData as any)?.profileImageUrl || null,
    dataAssunzione: (userData as any)?.hireDate || '15/03/2022',
    manager: 'Laura Bianchi',
    store: 'Milano Centro'
  };
  
  // Display leave balance with fallbacks
  const displayLeaveBalance = {
    ferieRimanenti: (leaveBalance as any)?.remainingVacationDays || (leaveBalance as any)?.vacationDaysRemaining || 18,
    permessiRimanenti: (leaveBalance as any)?.remainingPersonalDays || (leaveBalance as any)?.personalDaysRemaining || 20,
    ferieAnno: (leaveBalance as any)?.totalVacationDays || 26,
    ferieUsate: (leaveBalance as any)?.usedVacationDays || 8,
    permessiROL: (leaveBalance as any)?.totalPersonalDays || 32,
    permessiUsati: (leaveBalance as any)?.usedPersonalDays || 12,
    malattia: (leaveBalance as any)?.sickDays || 5,
    congedi: (leaveBalance as any)?.otherLeave || 0
  };

  // Performance data - Remove mock data for production readiness
  const [performance] = useState([] as any[]);

  // Training data - Remove mock data for production readiness
  const [training] = useState([] as any[]);

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
                              <p className="text-xl font-bold text-purple-800" data-testid="text-performance-score">85%</p>
                            </div>
                            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg" data-testid="card-training">
                              <GraduationCap className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                              <p className="text-sm text-orange-700 font-medium" data-testid="label-training">Formazione</p>
                              <p className="text-xl font-bold text-orange-800" data-testid="text-training-progress">2/3</p>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions - WindTre Glass */}
                  <Card className="glass-card hover:shadow-xl transition-all duration-300">
                    <CardHeader>
                      <CardTitle data-testid="section-quick-actions">Azioni Rapide</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button 
                        onClick={() => setTab('requests')}
                        className="w-full justify-start bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                        data-testid="button-quick-request"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Nuova Richiesta
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setTab('documents')}
                        className="w-full justify-start"
                        data-testid="button-quick-documents"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Scarica Buste Paga
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setTab('time-attendance')}
                        className="w-full justify-start"
                        data-testid="button-quick-timesheet"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Timbrature
                      </Button>
                    </CardContent>
                  </Card>
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
                  
                  {/* RIGHT: TimeAttendancePage (Mobile: Full Width, Desktop: 60%) */}
                  <div className="w-full xl:w-[60%] xl:flex-1">
                    <TimeAttendancePage
                      userId={displayUser.matricola}
                    />
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
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          Presenze
                        </TabsTrigger>
                        <TabsTrigger value="analytics" data-testid="tab-quick-analytics">
                          <Activity className="h-4 w-4 mr-2" />
                          Analytics
                        </TabsTrigger>
                      </TabsList>

                      {/* Enhanced Time Summary */}
                      <TabsContent value="riepilogo" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                                <Clock className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm text-green-700 font-medium">Ore Oggi</p>
                                <p className="text-xl font-bold text-green-800" data-testid="text-hours-today">
                                  {isClockedIn && clockInTime ? 
                                    `${Math.floor((Date.now() - clockInTime.getTime()) / (1000 * 60 * 60))}h ${Math.floor(((Date.now() - clockInTime.getTime()) % (1000 * 60 * 60)) / (1000 * 60))}m` : 
                                    '0h 0m'
                                  }
                                </p>
                              </div>
                            </div>
                          </Card>
                          
                          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                <BarChart3 className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm text-blue-700 font-medium">Settimana</p>
                                <p className="text-xl font-bold text-blue-800" data-testid="text-hours-week">38h 45m</p>
                              </div>
                            </div>
                          </Card>

                          <Card className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                                <Coffee className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm text-yellow-700 font-medium">Pause</p>
                                <p className="text-xl font-bold text-yellow-800" data-testid="text-break-total">
                                  {Math.floor(breakTime / 60)}h {breakTime % 60}m
                                </p>
                              </div>
                            </div>
                          </Card>

                          <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                                <AlertCircle className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm text-orange-700 font-medium">Straordinari</p>
                                <p className="text-xl font-bold text-orange-800" data-testid="text-overtime">2h 15m</p>
                              </div>
                            </div>
                          </Card>
                        </div>

                        {/* Weekly Progress */}
                        <Card className="p-6">
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <h4 className="font-medium">Progresso Settimanale</h4>
                              <Badge variant="outline">80.6% completato</Badge>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Ore lavorate questa settimana:</span>
                                <span className="font-medium" data-testid="text-weekly-hours">32h 15m</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Target settimanale:</span>
                                <span className="font-medium">40h 0m</span>
                              </div>
                              <Progress value={80.6} className="h-3" />
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>Rimanenti: 7h 45m</span>
                                <span>2 giorni rimanenti</span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </TabsContent>

                      {/* Enhanced Attendance History */}
                      <TabsContent value="presenze" className="space-y-6">
                        {/* Filters */}
                        <Card className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Periodo</Label>
                              <Select defaultValue="week">
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="today">Oggi</SelectItem>
                                  <SelectItem value="week">Settimana</SelectItem>
                                  <SelectItem value="month">Mese</SelectItem>
                                  <SelectItem value="custom">Personalizzato</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Tipo</Label>
                              <Select defaultValue="all">
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Tutti</SelectItem>
                                  <SelectItem value="regular">Regolari</SelectItem>
                                  <SelectItem value="overtime">Straordinari</SelectItem>
                                  <SelectItem value="break">Pause</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Status</Label>
                              <Select defaultValue="all">
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Tutti</SelectItem>
                                  <SelectItem value="approved">Approvate</SelectItem>
                                  <SelectItem value="pending">In Attesa</SelectItem>
                                  <SelectItem value="disputed">Contestate</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-end">
                              <Button variant="outline" className="w-full">
                                <Search className="h-4 w-4 mr-2" />
                                Cerca
                              </Button>
                            </div>
                          </div>
                        </Card>

                        {/* Enhanced Time Entries Table */}
                        <Card>
                          <CardHeader>
                            <div className="flex justify-between items-center">
                              <CardTitle data-testid="section-attendance-history">Storico Presenze</CardTitle>
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Esporta
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b bg-gray-50/50">
                                    <th className="text-left py-3 px-4 font-medium">Data</th>
                                    <th className="text-left py-3 px-4 font-medium">Entrata</th>
                                    <th className="text-left py-3 px-4 font-medium">Uscita</th>
                                    <th className="text-left py-3 px-4 font-medium">Ore Totali</th>
                                    <th className="text-left py-3 px-4 font-medium">Metodo</th>
                                    <th className="text-left py-3 px-4 font-medium">Status</th>
                                    <th className="text-left py-3 px-4 font-medium">Azioni</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[
                                    { data: format(new Date(), 'dd/MM/yyyy'), entrata: '08:30', uscita: isClockedIn ? '-' : '17:30', ore: isClockedIn ? 'In corso' : '8h 30m', metodo: 'GPS', stato: isClockedIn ? 'attivo' : 'completo', location: 'Milano Centro' },
                                    { data: format(addDays(new Date(), -1), 'dd/MM/yyyy'), entrata: '08:15', uscita: '18:45', ore: '9h 30m', metodo: 'App', stato: 'completo', location: 'Milano Centro' },
                                    { data: format(addDays(new Date(), -2), 'dd/MM/yyyy'), entrata: '09:00', uscita: '17:15', ore: '7h 45m', metodo: 'NFC', stato: 'completo', location: 'Milano Centro' },
                                    { data: format(addDays(new Date(), -3), 'dd/MM/yyyy'), entrata: '08:45', uscita: '17:30', ore: '8h 15m', metodo: 'QR', stato: 'completo', location: 'Milano Centro' },
                                    { data: format(addDays(new Date(), -4), 'dd/MM/yyyy'), entrata: '08:30', uscita: '17:00', ore: '8h 00m', metodo: 'GPS', stato: 'completo', location: 'Milano Centro' }
                                  ].map((entry, index) => (
                                    <tr key={index} className="border-b hover:bg-gray-50/30 transition-colors" data-testid={`row-attendance-${index}`}>
                                      <td className="py-3 px-4" data-testid={`cell-date-${index}`}>{entry.data}</td>
                                      <td className="py-3 px-4 font-mono" data-testid={`cell-entry-${index}`}>{entry.entrata}</td>
                                      <td className="py-3 px-4 font-mono" data-testid={`cell-exit-${index}`}>{entry.uscita}</td>
                                      <td className="py-3 px-4 font-medium" data-testid={`cell-hours-${index}`}>{entry.ore}</td>
                                      <td className="py-3 px-4">
                                        <Badge variant="outline" className="text-xs">
                                          {entry.metodo}
                                        </Badge>
                                      </td>
                                      <td className="py-3 px-4">
                                        <Badge 
                                          variant={entry.stato === 'attivo' ? 'default' : entry.stato === 'completo' ? 'secondary' : 'destructive'} 
                                          className={entry.stato === 'attivo' ? 'bg-green-500' : ''}
                                          data-testid={`badge-status-${index}`}
                                        >
                                          {entry.stato === 'attivo' ? 'In Corso' : entry.stato === 'completo' ? 'Completo' : 'Contestato'}
                                        </Badge>
                                      </td>
                                      <td className="py-3 px-4">
                                        <Button variant="ghost" size="sm" data-testid={`button-view-${index}`}>
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Quick Analytics */}
                      <TabsContent value="analytics" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Time Distribution */}
                          <Card className="p-6">
                            <h4 className="font-medium mb-4">Distribuzione Ore Settimanale</h4>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm">Ore Regolari</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full" style={{width: '85%'}}></div>
                                  </div>
                                  <span className="text-sm font-medium w-12">34h</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm">Straordinari</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-500 rounded-full" style={{width: '25%'}}></div>
                                  </div>
                                  <span className="text-sm font-medium w-12">4h 45m</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm">Pause</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-500 rounded-full" style={{width: '15%'}}></div>
                                  </div>
                                  <span className="text-sm font-medium w-12">4h 30m</span>
                                </div>
                              </div>
                            </div>
                          </Card>

                          {/* Performance Metrics */}
                          <Card className="p-6">
                            <h4 className="font-medium mb-4">Metriche Prestazioni</h4>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Puntualità</span>
                                <div className="flex items-center gap-2">
                                  <Progress value={95} className="w-16 h-2" />
                                  <span className="text-sm font-medium">95%</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Presenza</span>
                                <div className="flex items-center gap-2">
                                  <Progress value={98} className="w-16 h-2" />
                                  <span className="text-sm font-medium">98%</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Completezza</span>
                                <div className="flex items-center gap-2">
                                  <Progress value={92} className="w-16 h-2" />
                                  <span className="text-sm font-medium">92%</span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        </div>

                        {/* Location and Security */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <Card className="p-6">
                            <h4 className="font-medium mb-4 flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-blue-500" />
                              Posizione e Mobilità
                            </h4>
                            <div className="space-y-3">
                              <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  <p className="text-sm font-medium">{userData?.store}</p>
                                </div>
                                <p className="text-xs text-gray-600">Via Roma 123, Milano, MI</p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                  <span>📍 Lat: 45.4642</span>
                                  <span>📍 Lng: 9.1900</span>
                                  <span>🎯 Precisione: 15m</span>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">
                                <p>Ultima sincronizzazione: {format(new Date(), 'HH:mm:ss')}</p>
                              </div>
                            </div>
                          </Card>

                          <Card className="p-6">
                            <h4 className="font-medium mb-4 flex items-center gap-2">
                              <Shield className="h-4 w-4 text-purple-500" />
                              Sicurezza e Conformità
                            </h4>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm">Geofencing attivo</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm">Crittografia SSL/TLS</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm">Audit log completo</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-orange-500" />
                                <span className="text-sm">Sincronizzazione: 98%</span>
                              </div>
                              <Progress value={98} className="h-2" />
                            </div>
                          </Card>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="space-y-6" data-testid="section-requests">
                {/* Enhanced Requests Dashboard */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-orange-500" />
                      Centro Richieste Personali
                    </CardTitle>
                    <CardDescription>
                      Gestione completa delle richieste HR con monitoraggio real-time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="overview" className="w-full">
                      <TabsList className="grid w-full grid-cols-5" data-testid="tabs-requests">
                        <TabsTrigger value="overview" data-testid="tab-req-overview">
                          <Home className="h-4 w-4 mr-2" />
                          Panoramica
                        </TabsTrigger>
                        <TabsTrigger value="new-request" data-testid="tab-new-request">
                          <Plus className="h-4 w-4 mr-2" />
                          Nuova Richiesta
                        </TabsTrigger>
                        <TabsTrigger value="history" data-testid="tab-req-history">
                          <Clock className="h-4 w-4 mr-2" />
                          Storico
                        </TabsTrigger>
                        <TabsTrigger value="balances" data-testid="tab-balances">
                          <Target className="h-4 w-4 mr-2" />
                          Saldi
                        </TabsTrigger>
                        <TabsTrigger value="calendar" data-testid="tab-req-calendar">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          Calendario
                        </TabsTrigger>
                      </TabsList>

                      {/* Overview Tab */}
                      <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Quick Stats */}
                          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                                <CheckCircle className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm text-green-700 font-medium">Approvate</p>
                                <p className="text-2xl font-bold text-green-800" data-testid="stat-approved">
                                  {myRequests.filter(r => r.stato === 'approved').length}
                                </p>
                              </div>
                            </div>
                          </Card>

                          <Card className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                                <Clock className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm text-yellow-700 font-medium">In Attesa</p>
                                <p className="text-2xl font-bold text-yellow-800" data-testid="stat-pending">
                                  {myRequests.filter(r => r.stato === 'pending').length}
                                </p>
                              </div>
                            </div>
                          </Card>

                          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                <ClipboardList className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm text-blue-700 font-medium">Totale Anno</p>
                                <p className="text-2xl font-bold text-blue-800" data-testid="stat-total-year">
                                  {myRequests.length}
                                </p>
                              </div>
                            </div>
                          </Card>
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Card className="p-6">
                            <h3 className="font-semibold mb-4">Azioni Rapide</h3>
                            <div className="space-y-3">
                              <Dialog open={hrRequestModal.open} onOpenChange={(open) => setHrRequestModal({ open, data: null })}>
                                <DialogTrigger asChild>
                                  <Button className="w-full justify-start bg-gradient-to-r from-orange-500 to-purple-600" data-testid="button-quick-new-request">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Nuova Richiesta Ferie
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="modal-hr-request">
                                  <HRRequestWizard
                                    onSuccess={handleHRRequestSuccess}
                                    onCancel={() => setHrRequestModal({ open: false as false, data: null })}
                                    data-testid="wizard-hr-request"
                                  />
                                </DialogContent>
                              </Dialog>
                              <Button variant="outline" className="w-full justify-start" data-testid="button-quick-sick-leave">
                                <Shield className="h-4 w-4 mr-2" />
                                Richiesta Malattia
                              </Button>
                              <Button variant="outline" className="w-full justify-start" data-testid="button-quick-permission">
                                <User className="h-4 w-4 mr-2" />
                                Permesso ROL
                              </Button>
                              <Button variant="outline" className="w-full justify-start" data-testid="button-quick-training">
                                <GraduationCap className="h-4 w-4 mr-2" />
                                Richiesta Formazione
                              </Button>
                            </div>
                          </Card>

                          <Card className="p-6">
                            <h3 className="font-semibold mb-4">Richieste Recenti</h3>
                            <div className="space-y-3">
                              {myRequests.slice(0, 4).map((request: any) => (
                                <div key={request.id} className="flex items-center gap-3 p-2 rounded-lg border">
                                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(request.stato)}`}></div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{request.tipo}</p>
                                    <p className="text-xs text-gray-500">{request.dal}</p>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {request.stato === 'approved' ? 'OK' : request.stato === 'pending' ? 'Attesa' : 'KO'}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </Card>
                        </div>
                      </TabsContent>

                      {/* New Request Tab */}
                      <TabsContent value="new-request" className="space-y-6">
                        <Card className="p-6">
                          <div className="flex items-center justify-between mb-6">
                            <div>
                              <h3 className="text-xl font-semibold">Crea Nuova Richiesta</h3>
                              <p className="text-gray-600">Utilizza il wizard guidato per creare richieste complete</p>
                            </div>
                          </div>
                          
                          <Dialog open={hrRequestModal.open} onOpenChange={(open) => setHrRequestModal({ open, data: null })}>
                            <DialogTrigger asChild>
                              <Button 
                                size="lg"
                                className="w-full h-16 text-lg bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                                data-testid="button-main-new-request"
                              >
                                <Plus className="h-6 w-6 mr-3" />
                                Avvia Wizard Richieste
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="modal-main-hr-request">
                              <HRRequestWizard
                                onSuccess={handleHRRequestSuccess}
                                onCancel={() => setHrRequestModal({ open: false as false, data: null })}
                                data-testid="wizard-main-hr-request"
                              />
                            </DialogContent>
                          </Dialog>
                          
                          {/* Request Categories */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
                            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                  <Shield className="h-5 w-5 text-green-600" />
                                </div>
                                <h4 className="font-medium">Congedi Legali</h4>
                              </div>
                              <p className="text-sm text-gray-600">Ferie, permessi ROL, congedi parentali</p>
                            </Card>

                            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <GraduationCap className="h-5 w-5 text-blue-600" />
                                </div>
                                <h4 className="font-medium">Sviluppo</h4>
                              </div>
                              <p className="text-sm text-gray-600">Formazione, certificazioni, corsi</p>
                            </Card>

                            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                  <Home className="h-5 w-5 text-purple-600" />
                                </div>
                                <h4 className="font-medium">Smart Work</h4>
                              </div>
                              <p className="text-sm text-gray-600">Lavoro remoto, orari flessibili</p>
                            </Card>
                          </div>
                        </Card>
                      </TabsContent>

                      {/* Enhanced History Tab */}
                      <TabsContent value="history" className="space-y-6">
                        {/* Advanced Filters */}
                        <Card className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Periodo</Label>
                              <Select defaultValue="all">
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Tutti i periodi</SelectItem>
                                  <SelectItem value="this-year">Quest'anno</SelectItem>
                                  <SelectItem value="last-6-months">Ultimi 6 mesi</SelectItem>
                                  <SelectItem value="last-3-months">Ultimi 3 mesi</SelectItem>
                                  <SelectItem value="custom">Personalizzato</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Tipo</Label>
                              <Select defaultValue="all">
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Tutti i tipi</SelectItem>
                                  <SelectItem value="leave">Ferie</SelectItem>
                                  <SelectItem value="wellness_health">Permessi</SelectItem>
                                  <SelectItem value="professional_development">Formazione</SelectItem>
                                  <SelectItem value="family">Congedi Familiari</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Stato</Label>
                              <Select defaultValue="all">
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Tutti gli stati</SelectItem>
                                  <SelectItem value="approved">Approvate</SelectItem>
                                  <SelectItem value="pending">In Attesa</SelectItem>
                                  <SelectItem value="rejected">Rifiutate</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-end">
                              <Button variant="outline" className="w-full">
                                <Search className="h-4 w-4 mr-2" />
                                Filtra
                              </Button>
                            </div>
                          </div>
                        </Card>

                        {/* Enhanced Request List */}
                        <Card>
                          <CardHeader>
                            <div className="flex justify-between items-center">
                              <CardTitle data-testid="section-request-history">Storico Richieste</CardTitle>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm">
                                  <Download className="h-4 w-4 mr-2" />
                                  Esporta
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {myRequests.map((request: any) => (
                                <div 
                                  key={request.id} 
                                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50/50 transition-colors group"
                                  data-testid={`item-request-history-${request.id}`}
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className={`w-3 h-3 rounded-full ${getStatusColor(request.stato)}`}></div>
                                      <Badge variant="outline" className="text-xs" data-testid={`badge-category-${request.id}`}>
                                        {request.categoria}
                                      </Badge>
                                      <h4 className="font-medium" data-testid={`text-request-type-${request.id}`}>{request.tipo}</h4>
                                      {request.giorni > 5 && (
                                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                          Lunga Durata
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                      <div>
                                        <span className="font-medium">Periodo:</span> {request.dal} {request.al !== request.dal && `- ${request.al}`}
                                        {request.giorni > 1 && ` (${request.giorni} giorni)`}
                                      </div>
                                      <div>
                                        <span className="font-medium">Richiesta:</span> {request.dataRichiesta}
                                      </div>
                                      <div>
                                        <span className="font-medium">Motivo:</span> {request.motivo || 'Non specificato'}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Badge variant={
                                      request.stato === 'approved' ? 'default' :
                                      request.stato === 'pending' ? 'secondary' :
                                      'destructive'
                                    } data-testid={`badge-request-status-${request.id}`}>
                                      {request.stato === 'approved' ? 'Approvata' :
                                       request.stato === 'pending' ? 'In Attesa' :
                                       'Rifiutata'}
                                    </Badge>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                                      data-testid={`button-view-details-${request.id}`}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>

                      {/* Leave Balance Tab */}
                      <TabsContent value="balances" className="space-y-6">
                        <LeaveBalanceWidget 
                          userId={userData?.id}
                          className="glass-card"
                        />

                        {/* Additional Balance Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <Card className="p-6">
                            <h3 className="font-semibold mb-4">Dettaglio Ferie</h3>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <span className="text-sm">Totale annuale</span>
                                <span className="font-medium">{leaveBalance.ferieAnno} giorni</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm">Utilizzate</span>
                                <span className="font-medium text-orange-600">{leaveBalance.ferieUsate} giorni</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm">Rimanenti</span>
                                <span className="font-medium text-green-600">{leaveBalance.ferieRimanenti} giorni</span>
                              </div>
                              <Progress value={(leaveBalance.ferieUsate / leaveBalance.ferieAnno) * 100} className="h-2" />
                            </div>
                          </Card>

                          <Card className="p-6">
                            <h3 className="font-semibold mb-4">Permessi ROL</h3>
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <span className="text-sm">Totale annuale</span>
                                <span className="font-medium">{leaveBalance.permessiROL} ore</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm">Utilizzate</span>
                                <span className="font-medium text-orange-600">{leaveBalance.permessiUsati} ore</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm">Rimanenti</span>
                                <span className="font-medium text-green-600">{leaveBalance.permessiRimanenti} ore</span>
                              </div>
                              <Progress value={(leaveBalance.permessiUsati / leaveBalance.permessiROL) * 100} className="h-2" />
                            </div>
                          </Card>
                        </div>
                      </TabsContent>

                      {/* Calendar Tab */}
                      <TabsContent value="calendar" className="space-y-6">
                        <Card className="p-6">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold">Calendario Personale Richieste</h3>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-green-50 border-green-200">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                Approvate
                              </Badge>
                              <Badge variant="outline" className="bg-yellow-50 border-yellow-200">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                                In Attesa
                              </Badge>
                              <Badge variant="outline" className="bg-red-50 border-red-200">
                                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                                Rifiutate
                              </Badge>
                            </div>
                          </div>
                          <LeaveCalendar 
                            storeId="store-001"
                            compact={false}
                            className="bg-transparent"
                          />
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-6" data-testid="section-documents">
                {/* Enhanced Document Management System */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-orange-500" />
                      Centro Documenti Personali
                    </CardTitle>
                    <CardDescription>
                      Gestione completa documenti HR con organizzazione avanzata
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="payslips" className="w-full">
                      <TabsList className="grid w-full grid-cols-5" data-testid="tabs-documents">
                        <TabsTrigger value="payslips" data-testid="tab-payslips">
                          <Download className="h-4 w-4 mr-2" />
                          Buste Paga
                        </TabsTrigger>
                        <TabsTrigger value="personal" data-testid="tab-personal-docs">
                          <User className="h-4 w-4 mr-2" />
                          Personali
                        </TabsTrigger>
                        <TabsTrigger value="contracts" data-testid="tab-contracts">
                          <Shield className="h-4 w-4 mr-2" />
                          Contratti
                        </TabsTrigger>
                        <TabsTrigger value="certificates" data-testid="tab-certificates">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Certificati
                        </TabsTrigger>
                        <TabsTrigger value="upload" data-testid="tab-upload">
                          <Plus className="h-4 w-4 mr-2" />
                          Carica
                        </TabsTrigger>
                      </TabsList>

                      {/* Payslips Tab (Enhanced PayslipManager) */}
                      <TabsContent value="payslips" className="space-y-6">
                        <PayslipManager data-testid="component-enhanced-payslip-manager" />
                      </TabsContent>

                      {/* Personal Documents Tab */}
                      <TabsContent value="personal" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                          {/* Document Categories Sidebar */}
                          <Card className="lg:col-span-1 p-4">
                            <h3 className="font-semibold mb-4">Categorie</h3>
                            <div className="space-y-2">
                              {[
                                { id: 'cv', label: 'CV/Resume', count: 3, color: 'bg-teal-100 text-teal-800' },
                                { id: 'id_document', label: 'Documenti ID', count: 2, color: 'bg-gray-100 text-gray-800' },
                                { id: 'medical', label: 'Certificati Medici', count: 1, color: 'bg-blue-100 text-blue-800' },
                                { id: 'education', label: 'Titoli Studio', count: 2, color: 'bg-purple-100 text-purple-800' },
                                { id: 'other', label: 'Altri', count: 5, color: 'bg-orange-100 text-orange-800' }
                              ].map((category) => (
                                <div key={category.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                                  <span className="text-sm">{category.label}</span>
                                  <Badge variant="outline" className={`text-xs ${category.color}`}>
                                    {category.count}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </Card>

                          {/* Documents Grid */}
                          <div className="lg:col-span-3 space-y-4">
                            {/* Search and Filters */}
                            <div className="flex gap-4">
                              <div className="flex-1">
                                <Input 
                                  placeholder="Cerca documenti..." 
                                  className="glass-card"
                                  data-testid="input-search-documents"
                                />
                              </div>
                              <Select>
                                <SelectTrigger className="w-48">
                                  <SelectValue placeholder="Tipo documento" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Tutti i tipi</SelectItem>
                                  <SelectItem value="cv">CV/Resume</SelectItem>
                                  <SelectItem value="id_document">Documenti ID</SelectItem>
                                  <SelectItem value="certificate">Certificati</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button variant="outline" size="sm">
                                <Filter className="h-4 w-4 mr-2" />
                                Filtri
                              </Button>
                            </div>

                            {/* Documents List */}
                            <div className="space-y-3">
                              {[
                                { id: 1, name: 'CV_Aggiornato_2024.pdf', type: 'CV/Resume', size: '2.1 MB', date: '15/12/2024', category: 'cv' },
                                { id: 2, name: 'Carta_Identita_Fronte.pdf', type: 'Documento ID', size: '1.5 MB', date: '10/11/2024', category: 'id_document' },
                                { id: 3, name: 'Laurea_Informatica.pdf', type: 'Titolo Studio', size: '3.2 MB', date: '05/10/2024', category: 'education' },
                                { id: 4, name: 'Certificato_Inglese_B2.pdf', type: 'Certificato Lingue', size: '890 KB', date: '20/09/2024', category: 'certificate' },
                                { id: 5, name: 'Attestato_Sicurezza.pdf', type: 'Certificato Sicurezza', size: '1.1 MB', date: '15/08/2024', category: 'certificate' }
                              ].map((doc) => (
                                <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                        <FileText className="h-6 w-6 text-white" />
                                      </div>
                                      <div className="flex-1">
                                        <h4 className="font-medium text-gray-900">{doc.name}</h4>
                                        <p className="text-sm text-gray-600">{doc.type} • {doc.size}</p>
                                        <p className="text-xs text-gray-500">Aggiornato il {doc.date}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button variant="outline" size="sm" data-testid={`button-view-${doc.id}`}>
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button variant="outline" size="sm" data-testid={`button-download-${doc.id}`}>
                                        <Download className="h-4 w-4" />
                                      </Button>
                                      <Button variant="outline" size="sm">
                                        <Share2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      {/* Contracts Tab */}
                      <TabsContent value="contracts" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Current Contract */}
                          <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                                <Shield className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <h3 className="font-semibold">Contratto Attuale</h3>
                                <p className="text-sm text-gray-600">Tempo indeterminato</p>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span>Tipo contratto:</span>
                                <span className="font-medium">Tempo indeterminato</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Data assunzione:</span>
                                <span className="font-medium">15/03/2022</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Livello:</span>
                                <span className="font-medium">Quadro - Q4</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>CCNL:</span>
                                <span className="font-medium">Telecomunicazioni</span>
                              </div>
                            </div>
                            <Button className="w-full mt-4" variant="outline">
                              <Download className="h-4 w-4 mr-2" />
                              Scarica Contratto
                            </Button>
                          </Card>

                          {/* Contract History */}
                          <Card className="p-6">
                            <h3 className="font-semibold mb-4">Storico Contratti</h3>
                            <div className="space-y-3">
                              {[
                                { tipo: 'Tempo indeterminato', dal: '15/03/2022', al: 'Attuale', stato: 'active' },
                                { tipo: 'Apprendistato', dal: '01/06/2021', al: '14/03/2022', stato: 'completed' },
                                { tipo: 'Stage', dal: '15/01/2021', al: '31/05/2021', stato: 'completed' }
                              ].map((contract, index) => (
                                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div>
                                    <p className="text-sm font-medium">{contract.tipo}</p>
                                    <p className="text-xs text-gray-500">{contract.dal} - {contract.al}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={contract.stato === 'active' ? 'default' : 'secondary'}>
                                      {contract.stato === 'active' ? 'Attivo' : 'Completato'}
                                    </Badge>
                                    <Button variant="ghost" size="sm">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Card>
                        </div>
                      </TabsContent>

                      {/* Certificates Tab */}
                      <TabsContent value="certificates" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {[
                            { nome: 'Certificato Sicurezza sul Lavoro', scadenza: '20/06/2025', stato: 'valid', urgency: 'normal' },
                            { nome: 'Certificazione Microsoft Azure', scadenza: '15/03/2025', stato: 'valid', urgency: 'normal' },
                            { nome: 'Certificato Primo Soccorso', scadenza: '10/02/2025', stato: 'expiring', urgency: 'high' },
                            { nome: 'Certificazione ITIL v4', scadenza: '30/12/2024', stato: 'expired', urgency: 'critical' },
                            { nome: 'Patente Europea Computer', scadenza: 'Permanente', stato: 'permanent', urgency: 'none' },
                            { nome: 'Certificato Inglese B2', scadenza: 'Permanente', stato: 'permanent', urgency: 'none' }
                          ].map((cert, index) => (
                            <Card key={index} className={`p-4 ${cert.urgency === 'critical' ? 'border-red-500 bg-red-50' : cert.urgency === 'high' ? 'border-orange-500 bg-orange-50' : ''}`}>
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm">{cert.nome}</h4>
                                  <p className="text-xs text-gray-600 mt-1">Scadenza: {cert.scadenza}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <Badge 
                                    variant={
                                      cert.stato === 'valid' ? 'default' :
                                      cert.stato === 'expiring' ? 'secondary' :
                                      cert.stato === 'expired' ? 'destructive' :
                                      'outline'
                                    }
                                    className="text-xs"
                                  >
                                    {cert.stato === 'valid' ? 'Valido' :
                                     cert.stato === 'expiring' ? 'In Scadenza' :
                                     cert.stato === 'expired' ? 'Scaduto' :
                                     'Permanente'}
                                  </Badge>
                                  {cert.urgency === 'critical' && (
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                  )}
                                  {cert.urgency === 'high' && (
                                    <Clock className="h-4 w-4 text-orange-500" />
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="flex-1 text-xs">
                                  <Eye className="h-3 w-3 mr-1" />
                                  Visualizza
                                </Button>
                                <Button variant="outline" size="sm" className="flex-1 text-xs">
                                  <Download className="h-3 w-3 mr-1" />
                                  Scarica
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>

                        {/* Renewal Alerts */}
                        <Card className="p-6 bg-gradient-to-r from-orange-50 to-red-50">
                          <div className="flex items-center gap-3 mb-4">
                            <AlertCircle className="h-6 w-6 text-orange-500" />
                            <h3 className="font-semibold text-orange-800">Avvisi Rinnovo Certificazioni</h3>
                          </div>
                          <div className="space-y-2">
                            <Alert className="border-orange-200 bg-orange-50">
                              <AlertCircle className="h-4 w-4 text-orange-600" />
                              <AlertDescription className="text-orange-800">
                                <strong>Certificato Primo Soccorso</strong> scade tra 45 giorni. Programma il rinnovo.
                              </AlertDescription>
                            </Alert>
                            <Alert className="border-red-200 bg-red-50">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                              <AlertDescription className="text-red-800">
                                <strong>Certificazione ITIL v4</strong> è scaduta. Contatta HR per il rinnovo urgente.
                              </AlertDescription>
                            </Alert>
                          </div>
                        </Card>
                      </TabsContent>

                      {/* Upload Tab */}
                      <TabsContent value="upload" className="space-y-6">
                        <Card className="p-6">
                          <h3 className="text-lg font-semibold mb-6">Carica Nuovi Documenti</h3>
                          
                          {/* Drag and Drop Area */}
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-500 transition-colors">
                            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h4 className="text-lg font-medium text-gray-900 mb-2">Trascina e rilascia i file qui</h4>
                            <p className="text-gray-600 mb-4">oppure</p>
                            <Button className="bg-gradient-to-r from-orange-500 to-purple-600" data-testid="button-select-files">
                              <FileText className="h-4 w-4 mr-2" />
                              Seleziona File
                            </Button>
                            <p className="text-xs text-gray-500 mt-4">
                              Formati supportati: PDF, DOC, DOCX, JPG, PNG (max 10MB)
                            </p>
                          </div>

                          {/* Quick Upload Categories */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                              <div className="flex items-center gap-3 mb-3">
                                <User className="h-8 w-8 text-blue-500" />
                                <h4 className="font-medium">Documenti Personali</h4>
                              </div>
                              <p className="text-sm text-gray-600">CV, documenti identità, titoli studio</p>
                              <Button variant="outline" size="sm" className="w-full mt-3">
                                Carica Documenti ID
                              </Button>
                            </Card>

                            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                              <div className="flex items-center gap-3 mb-3">
                                <CheckCircle className="h-8 w-8 text-green-500" />
                                <h4 className="font-medium">Certificazioni</h4>
                              </div>
                              <p className="text-sm text-gray-600">Certificati, attestati, qualifiche</p>
                              <Button variant="outline" size="sm" className="w-full mt-3">
                                Carica Certificati
                              </Button>
                            </Card>

                            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                              <div className="flex items-center gap-3 mb-3">
                                <Shield className="h-8 w-8 text-purple-500" />
                                <h4 className="font-medium">Documenti Medici</h4>
                              </div>
                              <p className="text-sm text-gray-600">Certificati medici, visite, referti</p>
                              <Button variant="outline" size="sm" className="w-full mt-3">
                                Carica Documenti Medici
                              </Button>
                            </Card>
                          </div>

                          {/* Upload Progress */}
                          <div className="mt-6">
                            <h4 className="font-medium mb-3">Caricamenti Recenti</h4>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                  <div>
                                    <p className="text-sm font-medium">CV_Aggiornato_2024.pdf</p>
                                    <p className="text-xs text-green-600">Caricamento completato</p>
                                  </div>
                                </div>
                                <span className="text-xs text-green-600">100%</span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="space-y-6" data-testid="section-performance">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>I Miei Obiettivi</CardTitle>
                    <CardDescription>Performance personale e goals</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {performance.map((goal) => (
                        <div key={goal.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">{goal.titolo}</h4>
                            <Badge variant={goal.stato === 'completed' ? 'default' : 'secondary'}>
                              {goal.stato === 'completed' ? 'Completato' :
                               goal.stato === 'excellent' ? 'Eccellente' : 'In Corso'}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progresso</span>
                              <span>{goal.progress}%</span>
                            </div>
                            <Progress value={goal.progress} className="h-2" />
                          </div>
                          <p className="text-sm text-gray-600 mt-3">{goal.dettagli}</p>
                          <p className="text-xs text-gray-500 mt-2">Scadenza: {goal.scadenza}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'training' && (
              <div className="space-y-6" data-testid="section-training">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>I Miei Corsi</CardTitle>
                    <CardDescription>Formazione assegnata e volontaria</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {training.map((course) => (
                        <div key={course.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-medium">{course.titolo}</h4>
                                <Badge variant="outline" className={getPriorityColor(course.tipo)}>
                                  {course.tipo}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">{course.provider}</p>
                            </div>
                            <div className="text-right">
                              <div className={`w-3 h-3 rounded-full ${getStatusColor(course.stato)} mb-1`}></div>
                              <p className="text-xs text-gray-500">{course.crediti} crediti</p>
                            </div>
                          </div>
                          
                          <div className="space-y-2 mb-3">
                            <div className="flex justify-between text-sm">
                              <span>Completamento</span>
                              <span>{course.progress}%</span>
                            </div>
                            <Progress value={course.progress} className="h-2" />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">
                              {course.stato === 'completed' ? 'Completato' : `Scadenza: ${course.scadenza}`}
                            </p>
                            <div className="flex gap-2">
                              {course.certificato && (
                                <Button variant="outline" size="sm" data-testid={`button-certificate-${course.id}`}>
                                  <Download className="h-3 w-3 mr-1" />
                                  Certificato
                                </Button>
                              )}
                              {course.stato !== 'completed' && (
                                <Button size="sm" data-testid={`button-continue-${course.id}`}>
                                  {course.progress === 0 ? 'Inizia' : 'Continua'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6" data-testid="section-profile">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Personal Info */}
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Informazioni Personali
                        <Button variant="outline" size="sm" data-testid="button-edit-profile">
                          <Edit3 className="h-4 w-4 mr-2" />
                          Modifica
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={displayUser.foto || undefined} />
                          <AvatarFallback className="bg-gradient-to-r from-orange-500 to-purple-500 text-white text-xl">
                            {displayUser.nome?.[0]}{displayUser.cognome?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-lg">{displayUser.nome} {displayUser.cognome}</h3>
                          <p className="text-gray-600">{displayUser.ruolo}</p>
                          <p className="text-sm text-gray-500">Matricola: {displayUser.matricola}</p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{displayUser.email}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{displayUser.telefono}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Building className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{displayUser.reparto}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{displayUser.store}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CalendarIcon className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Dal {displayUser.dataAssunzione}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Account Settings */}
                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle>Impostazioni Account</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">Notifiche Email</Label>
                            <p className="text-xs text-gray-500">Ricevi aggiornamenti via email</p>
                          </div>
                          <input type="checkbox" defaultChecked className="rounded" />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">Notifiche Push</Label>
                            <p className="text-xs text-gray-500">Notifiche sul dispositivo</p>
                          </div>
                          <input type="checkbox" defaultChecked className="rounded" />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">Modalità Scura</Label>
                            <p className="text-xs text-gray-500">Tema dell'interfaccia</p>
                          </div>
                          <input type="checkbox" className="rounded" />
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Lingua</Label>
                          <select className="w-full px-3 py-2 border rounded-lg text-sm">
                            <option value="it">Italiano</option>
                            <option value="en">English</option>
                          </select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Fuso Orario</Label>
                          <select className="w-full px-3 py-2 border rounded-lg text-sm">
                            <option value="Europe/Rome">Europe/Rome</option>
                            <option value="Europe/London">Europe/London</option>
                          </select>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="pt-4">
                        <Button className="w-full bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700">
                          <Save className="h-4 w-4 mr-2" />
                          Salva Impostazioni
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="space-y-6" data-testid="section-performance">
                {/* Advanced Performance Management System */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-orange-500" />
                      Sistema Valutazione Performance
                    </CardTitle>
                    <CardDescription>
                      Dashboard completo per performance, obiettivi, skills e feedback 360°
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="overview" className="w-full">
                      <TabsList className="grid w-full grid-cols-5" data-testid="tabs-performance">
                        <TabsTrigger value="overview" data-testid="tab-performance-overview">
                          <PieChart className="h-4 w-4 mr-2" />
                          Overview
                        </TabsTrigger>
                        <TabsTrigger value="reviews" data-testid="tab-performance-reviews">
                          <Award className="h-4 w-4 mr-2" />
                          Performance Reviews
                        </TabsTrigger>
                        <TabsTrigger value="goals" data-testid="tab-performance-goals">
                          <Target className="h-4 w-4 mr-2" />
                          My Goals
                        </TabsTrigger>
                        <TabsTrigger value="skills" data-testid="tab-performance-skills">
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Skills Assessment
                        </TabsTrigger>
                        <TabsTrigger value="feedback" data-testid="tab-performance-feedback">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          360° Feedback
                        </TabsTrigger>
                      </TabsList>

                      {/* Performance Overview Tab */}
                      <TabsContent value="overview" className="space-y-6">
                        {/* KPI Dashboard */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                                <Target className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm text-green-700 font-medium">Performance Score</p>
                                <p className="text-xl font-bold text-green-800" data-testid="text-performance-score">85%</p>
                              </div>
                            </div>
                          </Card>
                          
                          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                <CheckCircle className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm text-blue-700 font-medium">Goals Completed</p>
                                <p className="text-xl font-bold text-blue-800" data-testid="text-goals-completed">7/10</p>
                              </div>
                            </div>
                          </Card>

                          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                                <Star className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm text-purple-700 font-medium">Skills Rating</p>
                                <p className="text-xl font-bold text-purple-800" data-testid="text-skills-rating">4.2/5.0</p>
                              </div>
                            </div>
                          </Card>

                          <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                                <Users2 className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm text-orange-700 font-medium">Feedback Score</p>
                                <p className="text-xl font-bold text-orange-800" data-testid="text-feedback-score">92%</p>
                              </div>
                            </div>
                          </Card>
                        </div>

                        {/* Performance Progress */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <Card className="p-6">
                            <h3 className="font-semibold mb-4">Obiettivi in Corso</h3>
                            <div className="space-y-4">
                              {performance.map((item) => (
                                <div key={item.id} className="space-y-2" data-testid={`item-goal-progress-${item.id}`}>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">{item.titolo}</span>
                                    <span className="text-sm text-gray-600">{item.progress}%</span>
                                  </div>
                                  <Progress value={item.progress} className="h-2" />
                                  <p className="text-xs text-gray-500">{item.dettagli}</p>
                                </div>
                              ))}
                            </div>
                          </Card>

                          <Card className="p-6">
                            <h3 className="font-semibold mb-4">Performance Trend</h3>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Q1 2024</span>
                                <div className="flex items-center gap-2">
                                  <Progress value={78} className="h-2 w-20" />
                                  <span className="text-sm font-medium">78%</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Q2 2024</span>
                                <div className="flex items-center gap-2">
                                  <Progress value={82} className="h-2 w-20" />
                                  <span className="text-sm font-medium">82%</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Q3 2024</span>
                                <div className="flex items-center gap-2">
                                  <Progress value={85} className="h-2 w-20" />
                                  <span className="text-sm font-medium">85%</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Q4 2024 (Current)</span>
                                <div className="flex items-center gap-2">
                                  <Progress value={88} className="h-2 w-20" />
                                  <span className="text-sm font-medium text-green-600">88%</span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        </div>
                      </TabsContent>

                      {/* Performance Reviews Tab */}
                      <TabsContent value="reviews" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Current Review Status */}
                          <Card className="lg:col-span-2 p-6">
                            <div className="flex items-center justify-between mb-6">
                              <h3 className="font-semibold">Review Attivi</h3>
                              <Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-800">
                                2 In Corso
                              </Badge>
                            </div>
                            
                            <div className="space-y-4">
                              <div className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-blue-100" data-testid="item-current-review-1">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-medium">Annual Performance Review 2024</h4>
                                  <Badge className="bg-blue-500">In Corso</Badge>
                                </div>
                                <div className="space-y-2 text-sm text-gray-600">
                                  <p><span className="font-medium">Reviewer:</span> Laura Bianchi (Manager)</p>
                                  <p><span className="font-medium">Scadenza:</span> 31 Dicembre 2024</p>
                                  <p><span className="font-medium">Completamento:</span> 60%</p>
                                </div>
                                <div className="mt-3">
                                  <Progress value={60} className="h-2" />
                                </div>
                                <div className="mt-3 flex gap-2">
                                  <Button size="sm" variant="outline" data-testid="button-complete-review-1">
                                    <Edit3 className="h-4 w-4 mr-2" />
                                    Completa Review
                                  </Button>
                                  <Button size="sm" variant="ghost" data-testid="button-view-review-1">
                                    <Eye className="h-4 w-4 mr-2" />
                                    Visualizza
                                  </Button>
                                </div>
                              </div>

                              <div className="p-4 border rounded-lg bg-gradient-to-br from-green-50 to-green-100" data-testid="item-current-review-2">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-medium">Peer Review - Team Collaboration</h4>
                                  <Badge className="bg-green-500">Quasi Completato</Badge>
                                </div>
                                <div className="space-y-2 text-sm text-gray-600">
                                  <p><span className="font-medium">Tipo:</span> 360° Feedback</p>
                                  <p><span className="font-medium">Scadenza:</span> 20 Dicembre 2024</p>
                                  <p><span className="font-medium">Completamento:</span> 90%</p>
                                </div>
                                <div className="mt-3">
                                  <Progress value={90} className="h-2" />
                                </div>
                                <div className="mt-3 flex gap-2">
                                  <Button size="sm" variant="outline" data-testid="button-complete-review-2">
                                    <Edit3 className="h-4 w-4 mr-2" />
                                    Finalizza
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </Card>

                          {/* Review History */}
                          <Card className="p-6">
                            <h3 className="font-semibold mb-4">Storico Review</h3>
                            <div className="space-y-3">
                              {[
                                { anno: '2023', score: '4.2/5.0', stato: 'Completed' },
                                { anno: '2022', score: '4.0/5.0', stato: 'Completed' },
                                { anno: '2021', score: '3.8/5.0', stato: 'Completed' }
                              ].map((review) => (
                                <div key={review.anno} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div>
                                    <p className="font-medium">{review.anno}</p>
                                    <p className="text-sm text-gray-600">Score: {review.score}</p>
                                  </div>
                                  <Badge variant="outline" className="bg-green-50 text-green-800">
                                    {review.stato}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </Card>
                        </div>
                      </TabsContent>

                      {/* My Goals Tab */}
                      <TabsContent value="goals" className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">I Miei Obiettivi</h3>
                          <Button className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700" data-testid="button-new-goal">
                            <Plus className="h-4 w-4 mr-2" />
                            Nuovo Obiettivo
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {performance.map((goal) => (
                            <Card key={goal.id} className="p-6" data-testid={`card-goal-${goal.id}`}>
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <h4 className="font-medium mb-2" data-testid={`text-goal-title-${goal.id}`}>{goal.titolo}</h4>
                                  <p className="text-sm text-gray-600 mb-3" data-testid={`text-goal-details-${goal.id}`}>{goal.dettagli}</p>
                                </div>
                                <Badge variant={goal.stato === 'completed' ? 'default' : 'secondary'} data-testid={`badge-goal-status-${goal.id}`}>
                                  {goal.stato === 'completed' ? 'Completato' : 
                                   goal.stato === 'in_progress' ? 'In Corso' : 
                                   goal.stato === 'excellent' ? 'Eccellente' : goal.stato}
                                </Badge>
                              </div>
                              
                              <div className="space-y-3">
                                <div>
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium">Progresso</span>
                                    <span className="text-sm text-gray-600" data-testid={`text-goal-progress-${goal.id}`}>{goal.progress}%</span>
                                  </div>
                                  <Progress value={goal.progress} className="h-2" />
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-600">Scadenza: {goal.scadenza}</span>
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline" data-testid={`button-edit-goal-${goal.id}`}>
                                      <Edit3 className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" data-testid={`button-view-goal-${goal.id}`}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </TabsContent>

                      {/* Skills Assessment Tab */}
                      <TabsContent value="skills" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Skills Matrix */}
                          <Card className="lg:col-span-2 p-6">
                            <h3 className="font-semibold mb-4">Matrice Competenze</h3>
                            <div className="space-y-4">
                              {[
                                { categoria: 'Technical Skills', skills: [
                                  { nome: 'CRM Management', livello: 4.5, target: 5.0 },
                                  { nome: 'Data Analysis', livello: 3.8, target: 4.5 },
                                  { nome: 'Project Management', livello: 4.2, target: 4.5 }
                                ]},
                                { categoria: 'Soft Skills', skills: [
                                  { nome: 'Communication', livello: 4.7, target: 5.0 },
                                  { nome: 'Leadership', livello: 3.5, target: 4.0 },
                                  { nome: 'Problem Solving', livello: 4.3, target: 4.5 }
                                ]},
                                { categoria: 'Business Skills', skills: [
                                  { nome: 'Sales Strategy', livello: 4.6, target: 5.0 },
                                  { nome: 'Customer Relations', livello: 4.8, target: 5.0 },
                                  { nome: 'Market Analysis', livello: 3.9, target: 4.2 }
                                ]}
                              ].map((categoria) => (
                                <div key={categoria.categoria} className="space-y-3">
                                  <h4 className="font-medium text-gray-900">{categoria.categoria}</h4>
                                  <div className="space-y-2">
                                    {categoria.skills.map((skill) => (
                                      <div key={skill.nome} className="space-y-1" data-testid={`item-skill-${skill.nome.replace(/\s+/g, '-').toLowerCase()}`}>
                                        <div className="flex justify-between items-center">
                                          <span className="text-sm">{skill.nome}</span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">{skill.livello}/5.0</span>
                                            <span className="text-xs text-gray-500">(Target: {skill.target})</span>
                                          </div>
                                        </div>
                                        <div className="flex gap-1">
                                          {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                              key={star}
                                              className={`h-4 w-4 ${
                                                star <= skill.livello
                                                  ? 'text-orange-500 fill-orange-500'
                                                  : star <= skill.target
                                                  ? 'text-gray-300'
                                                  : 'text-gray-200'
                                              }`}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Card>

                          {/* Development Plan */}
                          <Card className="p-6">
                            <h3 className="font-semibold mb-4">Piano di Sviluppo</h3>
                            <div className="space-y-4">
                              <div className="p-3 border rounded-lg bg-blue-50" data-testid="item-development-plan-1">
                                <h4 className="font-medium text-sm">Leadership Skills</h4>
                                <p className="text-xs text-gray-600 mt-1">Target: 4.0/5.0</p>
                                <div className="mt-2">
                                  <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">Corso Raccomandato</Badge>
                                </div>
                              </div>
                              <div className="p-3 border rounded-lg bg-green-50" data-testid="item-development-plan-2">
                                <h4 className="font-medium text-sm">Data Analysis</h4>
                                <p className="text-xs text-gray-600 mt-1">Target: 4.5/5.0</p>
                                <div className="mt-2">
                                  <Badge variant="outline" className="text-xs bg-green-100 text-green-800">Mentoring</Badge>
                                </div>
                              </div>
                              <div className="p-3 border rounded-lg bg-purple-50" data-testid="item-development-plan-3">
                                <h4 className="font-medium text-sm">Market Analysis</h4>
                                <p className="text-xs text-gray-600 mt-1">Target: 4.2/5.0</p>
                                <div className="mt-2">
                                  <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800">Workshop</Badge>
                                </div>
                              </div>
                            </div>
                          </Card>
                        </div>
                      </TabsContent>

                      {/* 360° Feedback Tab */}
                      <TabsContent value="feedback" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Feedback Requests */}
                          <Card className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-semibold">Richieste Feedback</h3>
                              <Button size="sm" className="bg-gradient-to-r from-orange-500 to-purple-600" data-testid="button-request-feedback">
                                <Plus className="h-4 w-4 mr-2" />
                                Richiedi Feedback
                              </Button>
                            </div>
                            
                            <div className="space-y-3">
                              {[
                                { nome: 'Laura Bianchi', ruolo: 'Manager', stato: 'completed', data: '15/12/2024' },
                                { nome: 'Giulia Verdi', ruolo: 'Colleague', stato: 'pending', data: '18/12/2024' },
                                { nome: 'Marco Neri', ruolo: 'Team Member', stato: 'pending', data: '20/12/2024' }
                              ].map((feedback, index) => (
                                <div key={index} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`item-feedback-request-${index}`}>
                                  <div>
                                    <p className="font-medium text-sm">{feedback.nome}</p>
                                    <p className="text-xs text-gray-600">{feedback.ruolo}</p>
                                    <p className="text-xs text-gray-500">Richiesto: {feedback.data}</p>
                                  </div>
                                  <Badge variant={feedback.stato === 'completed' ? 'default' : 'secondary'}>
                                    {feedback.stato === 'completed' ? 'Completato' : 'In Attesa'}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </Card>

                          {/* Feedback Summary */}
                          <Card className="p-6">
                            <h3 className="font-semibold mb-4">Riepilogo Feedback</h3>
                            <div className="space-y-4">
                              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                                <div className="text-2xl font-bold text-green-800 mb-1" data-testid="text-overall-feedback-score">4.2/5.0</div>
                                <p className="text-sm text-green-700">Overall Rating</p>
                              </div>
                              
                              <div className="space-y-3">
                                {[
                                  { area: 'Communication', score: 4.5, feedback: '12 reviews' },
                                  { area: 'Teamwork', score: 4.2, feedback: '8 reviews' },
                                  { area: 'Problem Solving', score: 4.0, feedback: '10 reviews' },
                                  { area: 'Initiative', score: 4.3, feedback: '7 reviews' }
                                ].map((area) => (
                                  <div key={area.area} className="space-y-1" data-testid={`item-feedback-area-${area.area.toLowerCase().replace(/\s+/g, '-')}`}>
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-medium">{area.area}</span>
                                      <span className="text-sm text-gray-600">{area.score}/5.0</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <Progress value={area.score * 20} className="h-2 flex-1 mr-2" />
                                      <span className="text-xs text-gray-500">{area.feedback}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </Card>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'training' && (
              <div className="space-y-6" data-testid="section-training">
                {/* Advanced Learning Management System */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-orange-500" />
                      Centro Formazione & Sviluppo
                    </CardTitle>
                    <CardDescription>
                      Gestione completa corsi, certificazioni, learning paths e calendar formativo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="dashboard" className="w-full">
                      <TabsList className="grid w-full grid-cols-5" data-testid="tabs-training">
                        <TabsTrigger value="dashboard" data-testid="tab-training-dashboard">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Dashboard
                        </TabsTrigger>
                        <TabsTrigger value="courses" data-testid="tab-training-courses">
                          <BookOpen className="h-4 w-4 mr-2" />
                          My Courses
                        </TabsTrigger>
                        <TabsTrigger value="certifications" data-testid="tab-training-certifications">
                          <Award className="h-4 w-4 mr-2" />
                          Certifications
                        </TabsTrigger>
                        <TabsTrigger value="learning-paths" data-testid="tab-training-paths">
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Learning Paths
                        </TabsTrigger>
                        <TabsTrigger value="calendar" data-testid="tab-training-calendar">
                          <Calendar1 className="h-4 w-4 mr-2" />
                          Training Calendar
                        </TabsTrigger>
                      </TabsList>

                      {/* Training Dashboard Tab */}
                      <TabsContent value="dashboard" className="space-y-6">
                        {/* Training KPI Dashboard */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                <BookOpen className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm text-blue-700 font-medium">Corsi Attivi</p>
                                <p className="text-xl font-bold text-blue-800" data-testid="text-active-courses">3</p>
                              </div>
                            </div>
                          </Card>
                          
                          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                                <CheckCircle className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm text-green-700 font-medium">Completati</p>
                                <p className="text-xl font-bold text-green-800" data-testid="text-completed-courses">8</p>
                              </div>
                            </div>
                          </Card>

                          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                                <Award className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm text-purple-700 font-medium">Certificazioni</p>
                                <p className="text-xl font-bold text-purple-800" data-testid="text-certifications">5</p>
                              </div>
                            </div>
                          </Card>

                          <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm text-orange-700 font-medium">Crediti Formativi</p>
                                <p className="text-xl font-bold text-orange-800" data-testid="text-training-credits">127</p>
                              </div>
                            </div>
                          </Card>
                        </div>

                        {/* Training Progress Overview */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <Card className="p-6">
                            <h3 className="font-semibold mb-4">Corsi in Corso</h3>
                            <div className="space-y-4">
                              {training.map((course) => (
                                <div key={course.id} className="space-y-2" data-testid={`item-course-progress-${course.id}`}>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">{course.titolo}</span>
                                    <span className="text-sm text-gray-600">{course.progress}%</span>
                                  </div>
                                  <Progress value={course.progress} className="h-2" />
                                  <div className="flex justify-between items-center text-xs text-gray-500">
                                    <span>{course.provider}</span>
                                    <span>{course.crediti} crediti</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Card>

                          <Card className="p-6">
                            <h3 className="font-semibold mb-4">Learning Goals 2024</h3>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Target annuale</span>
                                <div className="flex items-center gap-2">
                                  <Progress value={68} className="h-2 w-20" />
                                  <span className="text-sm font-medium">68%</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-600">Ore formazione:</p>
                                  <p className="font-medium" data-testid="text-training-hours">34/50h</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Certificazioni:</p>
                                  <p className="font-medium" data-testid="text-target-certifications">2/3</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Corsi obbligatori:</p>
                                  <p className="font-medium text-green-600" data-testid="text-mandatory-courses">100%</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Skills sviluppate:</p>
                                  <p className="font-medium" data-testid="text-skills-developed">5/7</p>
                                </div>
                              </div>
                            </div>
                          </Card>
                        </div>

                        {/* Upcoming Training */}
                        <Card className="p-6">
                          <h3 className="font-semibold mb-4">Prossimi Training</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                              { titolo: 'Digital Transformation Workshop', data: '22 Dec 2024', tipo: 'Webinar', durata: '2h' },
                              { titolo: 'Advanced CRM Techniques', data: '05 Jan 2025', tipo: 'Corso', durata: '8h' },
                              { titolo: 'Cybersecurity Awareness', data: '15 Jan 2025', tipo: 'E-learning', durata: '4h' }
                            ].map((training, index) => (
                              <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors" data-testid={`item-upcoming-training-${index}`}>
                                <h4 className="font-medium text-sm mb-2">{training.titolo}</h4>
                                <div className="space-y-1 text-xs text-gray-600">
                                  <p><span className="font-medium">Data:</span> {training.data}</p>
                                  <p><span className="font-medium">Tipo:</span> {training.tipo}</p>
                                  <p><span className="font-medium">Durata:</span> {training.durata}</p>
                                </div>
                                <Button size="sm" variant="outline" className="w-full mt-3" data-testid={`button-enroll-${index}`}>
                                  Iscriviti
                                </Button>
                              </div>
                            ))}
                          </div>
                        </Card>
                      </TabsContent>

                      {/* My Courses Tab */}
                      <TabsContent value="courses" className="space-y-6">
                        {/* Course Filters */}
                        <Card className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Stato</Label>
                              <Select defaultValue="all">
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Tutti i corsi</SelectItem>
                                  <SelectItem value="in_progress">In corso</SelectItem>
                                  <SelectItem value="completed">Completati</SelectItem>
                                  <SelectItem value="assigned">Assegnati</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Provider</Label>
                              <Select defaultValue="all">
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Tutti i provider</SelectItem>
                                  <SelectItem value="windtre">WindTre Academy</SelectItem>
                                  <SelectItem value="linkedin">LinkedIn Learning</SelectItem>
                                  <SelectItem value="external">Esterni</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Tipo</Label>
                              <Select defaultValue="all">
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">Tutti i tipi</SelectItem>
                                  <SelectItem value="mandatory">Obbligatori</SelectItem>
                                  <SelectItem value="voluntary">Volontari</SelectItem>
                                  <SelectItem value="career">Sviluppo Carriera</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-end">
                              <Button variant="outline" className="w-full">
                                <Search className="h-4 w-4 mr-2" />
                                Cerca Corsi
                              </Button>
                            </div>
                          </div>
                        </Card>

                        {/* Courses List */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {training.map((course) => (
                            <Card key={course.id} className="p-6" data-testid={`card-course-${course.id}`}>
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <h4 className="font-medium mb-2" data-testid={`text-course-title-${course.id}`}>{course.titolo}</h4>
                                  <p className="text-sm text-gray-600 mb-2">Provider: {course.provider}</p>
                                  <div className="flex gap-2 mb-3">
                                    <Badge variant="outline" className={getPriorityColor(course.tipo)} data-testid={`badge-course-type-${course.id}`}>
                                      {course.tipo}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {course.crediti} crediti
                                    </Badge>
                                  </div>
                                </div>
                                <Badge variant={course.stato === 'completed' ? 'default' : course.stato === 'in_progress' ? 'secondary' : 'outline'} data-testid={`badge-course-status-${course.id}`}>
                                  {course.stato === 'completed' ? 'Completato' : 
                                   course.stato === 'in_progress' ? 'In Corso' : 
                                   'Assegnato'}
                                </Badge>
                              </div>
                              
                              <div className="space-y-3">
                                <div>
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium">Progresso</span>
                                    <span className="text-sm text-gray-600" data-testid={`text-course-progress-${course.id}`}>{course.progress}%</span>
                                  </div>
                                  <Progress value={course.progress} className="h-2" />
                                </div>
                                
                                <div className="flex items-center justify-between text-sm text-gray-600">
                                  <span>Scadenza: {course.scadenza}</span>
                                  {course.certificato && (
                                    <Button size="sm" variant="outline" data-testid={`button-download-cert-${course.id}`}>
                                      <Download className="h-4 w-4 mr-2" />
                                      Certificato
                                    </Button>
                                  )}
                                </div>
                                
                                <div className="flex gap-2">
                                  <Button size="sm" className="flex-1 bg-gradient-to-r from-orange-500 to-purple-600" data-testid={`button-continue-course-${course.id}`}>
                                    <PlayCircle className="h-4 w-4 mr-2" />
                                    {course.progress > 0 ? 'Continua' : 'Inizia'}
                                  </Button>
                                  <Button size="sm" variant="outline" data-testid={`button-course-details-${course.id}`}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </TabsContent>

                      {/* Certifications Tab */}
                      <TabsContent value="certifications" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Active Certifications */}
                          <Card className="lg:col-span-2 p-6">
                            <div className="flex items-center justify-between mb-6">
                              <h3 className="font-semibold">Le Mie Certificazioni</h3>
                              <Button size="sm" className="bg-gradient-to-r from-orange-500 to-purple-600" data-testid="button-browse-certifications">
                                <Plus className="h-4 w-4 mr-2" />
                                Esplora Certificazioni
                              </Button>
                            </div>
                            
                            <div className="space-y-4">
                              {[
                                { 
                                  nome: 'Digital Marketing Fundamentals', 
                                  provider: 'LinkedIn Learning', 
                                  ottenuta: '15/10/2024', 
                                  scadenza: '15/10/2026', 
                                  stato: 'active',
                                  id: 'cert_001.pdf'
                                },
                                { 
                                  nome: 'Sicurezza sul Lavoro - Base', 
                                  provider: 'WindTre Academy', 
                                  ottenuta: '20/03/2024', 
                                  scadenza: '20/03/2025', 
                                  stato: 'expiring',
                                  id: 'cert_002.pdf'
                                },
                                { 
                                  nome: 'CRM Management Professional', 
                                  provider: 'Salesforce', 
                                  ottenuta: '10/06/2023', 
                                  scadenza: '10/06/2025', 
                                  stato: 'active',
                                  id: 'cert_003.pdf'
                                },
                                { 
                                  nome: 'Project Management Basics', 
                                  provider: 'PMI', 
                                  ottenuta: '15/01/2023', 
                                  scadenza: '15/01/2024', 
                                  stato: 'expired',
                                  id: 'cert_004.pdf'
                                }
                              ].map((cert, index) => (
                                <div key={index} className={`p-4 border rounded-lg ${
                                  cert.stato === 'active' ? 'bg-green-50 border-green-200' :
                                  cert.stato === 'expiring' ? 'bg-yellow-50 border-yellow-200' :
                                  'bg-red-50 border-red-200'
                                }`} data-testid={`item-certification-${index}`}>
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                      <h4 className="font-medium">{cert.nome}</h4>
                                      <p className="text-sm text-gray-600">{cert.provider}</p>
                                    </div>
                                    <Badge variant={
                                      cert.stato === 'active' ? 'default' :
                                      cert.stato === 'expiring' ? 'secondary' :
                                      'destructive'
                                    } data-testid={`badge-cert-status-${index}`}>
                                      {cert.stato === 'active' ? 'Attiva' :
                                       cert.stato === 'expiring' ? 'In Scadenza' :
                                       'Scaduta'}
                                    </Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                                    <div>
                                      <span className="font-medium">Ottenuta:</span> {cert.ottenuta}
                                    </div>
                                    <div>
                                      <span className="font-medium">Scadenza:</span> {cert.scadenza}
                                    </div>
                                  </div>
                                  
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline" data-testid={`button-download-cert-${index}`}>
                                      <Download className="h-4 w-4 mr-2" />
                                      Scarica
                                    </Button>
                                    {cert.stato === 'expiring' || cert.stato === 'expired' ? (
                                      <Button size="sm" className="bg-orange-500 hover:bg-orange-600" data-testid={`button-renew-cert-${index}`}>
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Rinnova
                                      </Button>
                                    ) : null}
                                    <Button size="sm" variant="ghost" data-testid={`button-verify-cert-${index}`}>
                                      <Shield className="h-4 w-4 mr-2" />
                                      Verifica
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Card>

                          {/* Certification Stats */}
                          <Card className="p-6">
                            <h3 className="font-semibold mb-4">Statistiche</h3>
                            <div className="space-y-4">
                              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                                <div className="text-2xl font-bold text-blue-800 mb-1" data-testid="text-total-certifications">5</div>
                                <p className="text-sm text-blue-700">Certificazioni Totali</p>
                              </div>
                              
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm">Attive</span>
                                  <span className="font-medium text-green-600">3</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm">In scadenza (30gg)</span>
                                  <span className="font-medium text-yellow-600">1</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm">Scadute</span>
                                  <span className="font-medium text-red-600">1</span>
                                </div>
                              </div>
                              
                              <Separator />
                              
                              <div className="space-y-3">
                                <h4 className="font-medium text-sm">Prossime Scadenze</h4>
                                <Alert className="border-yellow-200 bg-yellow-50">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertTitle className="text-sm">Attenzione</AlertTitle>
                                  <AlertDescription className="text-xs">
                                    Sicurezza sul Lavoro scade tra 45 giorni
                                  </AlertDescription>
                                </Alert>
                              </div>
                            </div>
                          </Card>
                        </div>
                      </TabsContent>

                      {/* Learning Paths Tab */}
                      <TabsContent value="learning-paths" className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">Percorsi di Apprendimento</h3>
                          <Button className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700" data-testid="button-explore-paths">
                            <Search className="h-4 w-4 mr-2" />
                            Esplora Percorsi
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {[
                            {
                              id: 1,
                              titolo: 'Sales Excellence Path',
                              descrizione: 'Percorso completo per eccellenza nelle vendite',
                              progress: 65,
                              corsi: 8,
                              completati: 5,
                              durata: '40h',
                              livello: 'Intermedio',
                              iscritto: true
                            },
                            {
                              id: 2,
                              titolo: 'Digital Leadership',
                              descrizione: 'Sviluppo competenze di leadership digitale',
                              progress: 30,
                              corsi: 6,
                              completati: 2,
                              durata: '30h',
                              livello: 'Avanzato',
                              iscritto: true
                            },
                            {
                              id: 3,
                              titolo: 'Customer Experience Master',
                              descrizione: 'Gestione avanzata esperienza cliente',
                              progress: 0,
                              corsi: 10,
                              completati: 0,
                              durata: '50h',
                              livello: 'Intermedio',
                              iscritto: false
                            },
                            {
                              id: 4,
                              titolo: 'Data-Driven Decision Making',
                              descrizione: 'Analisi dati per decisioni strategiche',
                              progress: 0,
                              corsi: 7,
                              completati: 0,
                              durata: '35h',
                              livello: 'Intermedio',
                              iscritto: false
                            }
                          ].map((path) => (
                            <Card key={path.id} className="p-6" data-testid={`card-learning-path-${path.id}`}>
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <h4 className="font-medium mb-2" data-testid={`text-path-title-${path.id}`}>{path.titolo}</h4>
                                  <p className="text-sm text-gray-600 mb-3" data-testid={`text-path-description-${path.id}`}>{path.descrizione}</p>
                                  <div className="flex gap-2 mb-3">
                                    <Badge variant="outline" className="text-xs">
                                      {path.livello}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {path.durata}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {path.corsi} corsi
                                    </Badge>
                                  </div>
                                </div>
                                {path.iscritto && (
                                  <Badge className="bg-green-500">Iscritto</Badge>
                                )}
                              </div>
                              
                              {path.iscritto && (
                                <div className="space-y-3 mb-4">
                                  <div>
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-sm font-medium">Progresso</span>
                                      <span className="text-sm text-gray-600" data-testid={`text-path-progress-${path.id}`}>{path.progress}%</span>
                                    </div>
                                    <Progress value={path.progress} className="h-2" />
                                  </div>
                                  <div className="flex justify-between text-sm text-gray-600">
                                    <span>Corsi completati: {path.completati}/{path.corsi}</span>
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex gap-2">
                                <Button size="sm" className={`flex-1 ${path.iscritto ? 'bg-gradient-to-r from-orange-500 to-purple-600' : 'bg-gray-500'}`} data-testid={`button-path-action-${path.id}`}>
                                  {path.iscritto ? (
                                    <>
                                      <PlayCircle className="h-4 w-4 mr-2" />
                                      Continua
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="h-4 w-4 mr-2" />
                                      Iscriviti
                                    </>
                                  )}
                                </Button>
                                <Button size="sm" variant="outline" data-testid={`button-path-details-${path.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </TabsContent>

                      {/* Training Calendar Tab */}
                      <TabsContent value="calendar" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Calendar View */}
                          <Card className="lg:col-span-2 p-6">
                            <div className="flex items-center justify-between mb-6">
                              <h3 className="font-semibold">Calendario Formazione</h3>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-blue-50 border-blue-200">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                                  Corsi
                                </Badge>
                                <Badge variant="outline" className="bg-green-50 border-green-200">
                                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                  Webinar
                                </Badge>
                                <Badge variant="outline" className="bg-purple-50 border-purple-200">
                                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                                  Certificazioni
                                </Badge>
                              </div>
                            </div>
                            
                            <Calendar 
                              mode="single"
                              selected={selectedDate}
                              onSelect={setSelectedDate}
                              className="w-full"
                              data-testid="calendar-training"
                            />
                          </Card>

                          {/* Upcoming Events */}
                          <Card className="p-6">
                            <h3 className="font-semibold mb-4">Prossimi Eventi</h3>
                            <div className="space-y-3">
                              {[
                                { 
                                  titolo: 'Digital Marketing Workshop', 
                                  data: '22 Dec', 
                                  ora: '14:00', 
                                  tipo: 'Webinar',
                                  durata: '2h'
                                },
                                { 
                                  titolo: 'Leadership Skills Assessment', 
                                  data: '28 Dec', 
                                  ora: '09:00', 
                                  tipo: 'Test',
                                  durata: '1h'
                                },
                                { 
                                  titolo: 'New Year Training Planning', 
                                  data: '05 Jan', 
                                  ora: '10:00', 
                                  tipo: 'Meeting',
                                  durata: '1h30'
                                }
                              ].map((event, index) => (
                                <div key={index} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors" data-testid={`item-training-event-${index}`}>
                                  <h4 className="font-medium text-sm mb-1">{event.titolo}</h4>
                                  <div className="space-y-1 text-xs text-gray-600">
                                    <p><span className="font-medium">Data:</span> {event.data} alle {event.ora}</p>
                                    <p><span className="font-medium">Tipo:</span> {event.tipo}</p>
                                    <p><span className="font-medium">Durata:</span> {event.durata}</p>
                                  </div>
                                  <div className="flex gap-1 mt-2">
                                    <Button size="sm" variant="outline" className="flex-1 text-xs" data-testid={`button-add-calendar-${index}`}>
                                      <CalendarIcon className="h-3 w-3 mr-1" />
                                      Aggiungi
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-xs" data-testid={`button-remind-${index}`}>
                                      <Bell className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <Separator className="my-4" />
                            
                            <div className="space-y-3">
                              <h4 className="font-medium text-sm">Quick Actions</h4>
                              <Button size="sm" variant="outline" className="w-full justify-start" data-testid="button-schedule-training">
                                <Plus className="h-4 w-4 mr-2" />
                                Programma Training
                              </Button>
                              <Button size="sm" variant="outline" className="w-full justify-start" data-testid="button-request-training">
                                <Mail className="h-4 w-4 mr-2" />
                                Richiedi Formazione
                              </Button>
                              <Button size="sm" variant="outline" className="w-full justify-start" data-testid="button-export-calendar">
                                <Download className="h-4 w-4 mr-2" />
                                Esporta Calendario
                              </Button>
                            </div>
                          </Card>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            )}
      </div>
    </Layout>
  );
}
