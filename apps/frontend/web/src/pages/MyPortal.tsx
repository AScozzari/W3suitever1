import React, { useState, useEffect, useRef } from 'react';
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
  Clock, FileText, GraduationCap, Target, Sun, Home, Bell, Plus, User, CheckCircle, ClipboardList,
  BarChart3, Activity, Coffee, RefreshCw, AlertCircle, Edit3, Save, Filter, Eye, Star, 
  Calendar1, Receipt, Loader2, X, Calendar as CalendarIcon, Upload, TrendingUp, Award, BookOpen, PlayCircle,
  ChevronLeft, ChevronRight, MapPin
} from 'lucide-react';
import { format, addDays, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
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
import UniversalRequestModal from '@/components/Requests/UniversalRequestModal';

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
  console.log('🚀 [MYPORTAL] Component rendering - start');
  
  // Tab Router Hook with security validation - seguendo pattern Settings
  const { activeTab, setTab, getTabUrl } = useTabRouter({
    defaultTab: 'overview',
    validTabs: VALID_EMPLOYEE_TABS,
    validSections: VALID_EMPLOYEE_SECTIONS
  });
  
  console.log('🚀 [MYPORTAL] activeTab:', activeTab);

  // Use proper tenant context instead of URL parsing
  const { currentTenant } = useTenant();
  
  // Authentication and user data
  const { user: authUser, isAuthenticated } = useAuth();
  const userId = authUser?.id;
  
  // ✅ HR Authentication Readiness Hook
  const { enabled: hrQueriesEnabled, loading: hrAuthLoading, attempts, debugInfo } = useHRQueryReadiness();
  const { toast } = useToast();
  
  console.log('🚀 [MYPORTAL] hrQueriesEnabled:', hrQueriesEnabled, 'authUser:', authUser);
  
  // Real data queries with hierarchical cache keys - REVERTED TO STABLE VERSION
  const { data: userData, isLoading: userLoading, error: userError } = useUser(userId || '');
  const { data: leaveBalance, isLoading: leaveLoading } = useLeaveBalance(userId || '');
  const { data: notifications = [], isLoading: notificationsLoading } = useNotifications({ status: 'unread', limit: 3 });
  
  // ✅ SHIFT NOTIFICATIONS: Query for shift-related notifications
  const { data: shiftNotifications = [], isLoading: shiftNotificationsLoading } = useNotifications({ 
    type: 'shift', 
    status: 'unread',
    limit: 5 
  });
  
  // ✅ UPCOMING SHIFTS: Query for my upcoming shift assignments (next 7 days)
  const today = format(new Date(), 'yyyy-MM-dd');
  const nextWeek = format(addDays(new Date(), 7), 'yyyy-MM-dd');
  const { data: upcomingShiftsData, isLoading: upcomingShiftsLoading } = useQuery<any>({
    queryKey: ['/api/hr/shift-assignments/my-assignments', { startDate: today, endDate: nextWeek }],
    enabled: !!hrQueriesEnabled
  });
  
  // ✅ PAST SHIFTS: Query for my past shift assignments (last 30 days)
  const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const { data: pastShiftsData, isLoading: pastShiftsLoading } = useQuery<any>({
    queryKey: ['/api/hr/shift-assignments/my-assignments', { startDate: thirtyDaysAgo, endDate: yesterday }],
    enabled: !!hrQueriesEnabled
  });
  
  // ✅ CALENDAR SHIFTS: Query for calendar view (current month ± 1 month)
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const calendarStartDate = format(startOfMonth(subMonths(calendarMonth, 1)), 'yyyy-MM-dd');
  const calendarEndDate = format(endOfMonth(addMonths(calendarMonth, 1)), 'yyyy-MM-dd');
  const { data: calendarShiftsData, isLoading: calendarShiftsLoading } = useQuery<any>({
    queryKey: ['/api/hr/shift-assignments/my-assignments', { startDate: calendarStartDate, endDate: calendarEndDate }],
    enabled: !!hrQueriesEnabled
  });
  
  // ✅ CALENDAR EVENT CLICK STATE
  const [selectedShiftEvent, setSelectedShiftEvent] = useState<any>(null);
  const [showShiftDetailModal, setShowShiftDetailModal] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);
  
  // ✅ DEFINITIVE SOLUTION: TanStack Query for HR requests with proper cache management
  const { data: myRequestsData = [], isLoading: requestsLoading } = useQuery<any[]>({
    queryKey: ['/api/universal-requests', { department: 'hr', mine: true }],
    queryFn: () => apiRequest('/api/universal-requests?department=hr&mine=true').then(res => res?.requests || res?.data || []),
    enabled: !!hrQueriesEnabled,
    staleTime: 2 * 60 * 1000, // 2 minutes - HR requests change less frequently
  });

  // ✅ WORKFLOW TEMPLATES: Query for HR workflow templates with proper enablement
  const { data: hrWorkflowTemplates = [] } = useQuery<any[]>({
    queryKey: ['/api/workflow-templates', { department: 'hr' }],
    queryFn: () => apiRequest('/api/workflow-templates?department=hr'),
    enabled: !!hrQueriesEnabled, // ✅ RE-ENABLED: Query ready when auth is ready
    staleTime: 5 * 60 * 1000,
  });
  const { session: currentSession, isLoading: sessionLoading } = useCurrentSession();
  const { documents, isLoading: documentsLoading } = useDocumentDrive();
  
  // Modal states with proper types - discriminated union to eliminate any
  type ModalState = 
    | { open: false; data: null }
    | { open: true; data: Record<string, unknown> };
  const [hrRequestModal, setHrRequestModal] = useState<ModalState>({ open: false, data: null });
  const [universalRequestModal, setUniversalRequestModal] = useState<ModalState>({ open: false, data: null });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [documentViewerModal, setDocumentViewerModal] = useState<ModalState>({ open: false, data: null });
  const [profileEditModal, setProfileEditModal] = useState<ModalState>({ open: false, data: null });
  
  // Time display state (minimal for header display only)
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // ✅ FILTER LOGIC: Apply status and time filters
  const filteredRequests = React.useMemo(() => {
    let filtered = myRequestsData || [];
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((request: any) => request.status === statusFilter);
    }
    
    // Time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      
      switch (timeFilter) {
        case 'today':
          filtered = filtered.filter((request: any) => {
            const reqDate = new Date(request.createdAt || request.submittedAt);
            return reqDate >= startOfDay(now) && reqDate <= endOfDay(now);
          });
          break;
        case 'week':
          filtered = filtered.filter((request: any) => {
            const reqDate = new Date(request.createdAt || request.submittedAt);
            return reqDate >= subDays(now, 7);
          });
          break;
        case '30days':
          filtered = filtered.filter((request: any) => {
            const reqDate = new Date(request.createdAt || request.submittedAt);
            return reqDate >= subDays(now, 30);
          });
          break;
        case '60days':
          filtered = filtered.filter((request: any) => {
            const reqDate = new Date(request.createdAt || request.submittedAt);
            return reqDate >= subDays(now, 60);
          });
          break;
      }
    }
    
    return filtered;
  }, [myRequestsData, statusFilter, timeFilter]);

  const myRequests = filteredRequests;
  
  // ✅ DELETE Request Mutation
  const deleteRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await apiRequest(`/api/universal-requests/${requestId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/universal-requests', { department: 'hr', mine: true }] });
      toast({
        title: "Richiesta eliminata",
        description: "La richiesta è stata eliminata con successo.",
      });
    },
    onError: (error: any) => {
      console.error('Errore eliminazione richiesta:', error);
      toast({
        title: "Errore",
        description: error?.message || "Errore durante l'eliminazione della richiesta.",
        variant: "destructive",
      });
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ['/api/universal-requests', { department: 'hr', mine: true }] });
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

  // Update current time every minute (not every second to prevent excessive re-renders)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
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
                  minWidth: 'clamp(80px, 15vw, 120px)',
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
                  <Card className="col-span-1 lg:col-span-2 glass-card hover:shadow-xl transition-all duration-300">
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
                          setHrRequestModal({ open: true, data: { type: 'leave', leaveType: 'vacation' } });
                        }
                      },
                      {
                        id: 'shift-change',
                        title: 'Cambio Turno',
                        description: 'Richiedi scambio',
                        icon: RefreshCw,
                        color: '#3B82F6',
                        onClick: () => {
                          setTab('requests');
                          setUniversalRequestModal({ 
                            open: true, 
                            data: { 
                              department: 'hr', 
                              category: 'shift_change',
                              title: 'Richiesta Cambio Turno',
                              description: '' 
                            } 
                          });
                        }
                      },
                      {
                        id: 'sick-leave',
                        title: 'Segnala Malattia',
                        description: 'Comunicazione urgente',
                        icon: AlertCircle,
                        color: '#DC2626',
                        onClick: () => {
                          setTab('requests');
                          setHrRequestModal({ open: true, data: { type: 'leave', leaveType: 'sick_leave', urgent: true } });
                        }
                      },
                      {
                        id: 'timesheet',
                        title: 'Timbrature',
                        description: 'Registra ore',
                        icon: Clock,
                        color: '#10B981',
                        onClick: () => setTab('time-attendance')
                      },
                      {
                        id: 'payslip',
                        title: 'Buste Paga',
                        description: 'Scarica PDF',
                        icon: FileText,
                        color: '#7B2CBF',
                        onClick: () => setTab('documents')
                      },
                      {
                        id: 'expense-report',
                        title: 'Nota Spese',
                        description: 'Compila spese',
                        icon: Receipt,
                        color: '#6B7280',
                        onClick: () => {
                          setTab('requests');
                          setHrRequestModal({ open: true, data: { type: 'expense' } });
                        }
                      }
                    ] as QuickAction[]}
                    columns={3}
                    variant="compact"
                    className=""
                  />
                </div>

                {/* ✅ PERSONAL CALENDAR - Shows shifts and events on monthly view */}
                <Card className="glass-card hover:shadow-xl transition-all duration-300">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2" data-testid="section-personal-calendar">
                        <CalendarIcon className="h-5 w-5 text-orange-500" />
                        Calendario Personale
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newMonth = subMonths(calendarMonth, 1);
                            setCalendarMonth(newMonth);
                            calendarRef.current?.getApi().gotoDate(newMonth);
                          }}
                          data-testid="btn-calendar-prev"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium min-w-[120px] text-center">
                          {format(calendarMonth, 'MMMM yyyy', { locale: it })}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newMonth = addMonths(calendarMonth, 1);
                            setCalendarMonth(newMonth);
                            calendarRef.current?.getApi().gotoDate(newMonth);
                          }}
                          data-testid="btn-calendar-next"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const todayDate = new Date();
                            setCalendarMonth(todayDate);
                            calendarRef.current?.getApi().today();
                          }}
                          data-testid="btn-calendar-today"
                        >
                          Oggi
                        </Button>
                      </div>
                    </div>
                    <CardDescription>I tuoi turni e pianificazioni</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {calendarShiftsLoading ? (
                      <div className="h-[400px] flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                      </div>
                    ) : (
                      <div className="personal-calendar-container" style={{ height: '400px' }}>
                        <FullCalendar
                          ref={calendarRef}
                          plugins={[dayGridPlugin, interactionPlugin]}
                          initialView="dayGridMonth"
                          initialDate={calendarMonth}
                          locale="it"
                          headerToolbar={false}
                          height="100%"
                          firstDay={1}
                          dayMaxEvents={3}
                          events={(() => {
                            const shifts = Array.isArray(calendarShiftsData) ? calendarShiftsData : [];
                            return shifts.map((shift: any) => {
                              const isPast = new Date(shift.shiftDate) < new Date(today);
                              const isTodayShift = shift.shiftDate === today;
                              const startTimeFormatted = shift.startTime ? format(new Date(shift.startTime), 'HH:mm') : '';
                              const endTimeFormatted = shift.endTime ? format(new Date(shift.endTime), 'HH:mm') : '';
                              
                              return {
                                id: shift.id,
                                title: `${startTimeFormatted}-${endTimeFormatted}`,
                                start: shift.shiftDate,
                                allDay: true,
                                backgroundColor: isPast ? '#9CA3AF' : isTodayShift ? '#FF6900' : '#3B82F6',
                                borderColor: isPast ? '#6B7280' : isTodayShift ? '#EA580C' : '#2563EB',
                                textColor: '#FFFFFF',
                                extendedProps: {
                                  shiftId: shift.shiftId,
                                  storeId: shift.storeId,
                                  storeName: shift.store?.name || shift.storeName || 'PDV',
                                  startTime: startTimeFormatted,
                                  endTime: endTimeFormatted,
                                  status: shift.status,
                                  shiftName: shift.shiftName,
                                  isPast,
                                  isToday: isTodayShift
                                }
                              };
                            });
                          })()}
                          eventClick={(info) => {
                            const props = info.event.extendedProps;
                            setSelectedShiftEvent({
                              id: info.event.id,
                              date: format(info.event.start!, 'EEEE d MMMM yyyy', { locale: it }),
                              startTime: props.startTime,
                              endTime: props.endTime,
                              storeName: props.storeName,
                              shiftName: props.shiftName,
                              status: props.status,
                              isPast: props.isPast,
                              isToday: props.isToday
                            });
                            setShowShiftDetailModal(true);
                          }}
                          eventContent={(eventInfo) => (
                            <div 
                              className="px-1 py-0.5 text-xs font-medium truncate cursor-pointer hover:opacity-90"
                              style={{
                                backgroundColor: eventInfo.event.backgroundColor,
                                borderRadius: '4px',
                                color: '#FFFFFF'
                              }}
                            >
                              <Clock className="inline h-3 w-3 mr-1" />
                              {eventInfo.event.title}
                            </div>
                          )}
                          dayCellClassNames={(arg) => {
                            const dateStr = format(arg.date, 'yyyy-MM-dd');
                            const shifts = Array.isArray(calendarShiftsData) ? calendarShiftsData : [];
                            const hasShift = shifts.some((s: any) => s.shiftDate === dateStr);
                            return hasShift ? 'has-shift-day' : '';
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                        <span className="text-xs text-gray-600">Oggi</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="text-xs text-gray-600">Turni futuri</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-400" />
                        <span className="text-xs text-gray-600">Turni passati</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Shift Detail Modal */}
                <Dialog open={showShiftDetailModal} onOpenChange={setShowShiftDetailModal}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Calendar1 className="h-5 w-5 text-orange-500" />
                        Dettaglio Turno
                      </DialogTitle>
                    </DialogHeader>
                    {selectedShiftEvent && (
                      <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-lg font-semibold text-gray-900 capitalize">
                              {selectedShiftEvent.date}
                            </p>
                            <Badge 
                              className={
                                selectedShiftEvent.isToday 
                                  ? 'bg-orange-500' 
                                  : selectedShiftEvent.isPast 
                                    ? 'bg-gray-400' 
                                    : 'bg-blue-500'
                              }
                            >
                              {selectedShiftEvent.isToday 
                                ? 'Oggi' 
                                : selectedShiftEvent.isPast 
                                  ? 'Passato' 
                                  : 'Futuro'}
                            </Badge>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <Clock className="h-5 w-5 text-blue-500" />
                              <div>
                                <p className="text-sm text-gray-500">Orario</p>
                                <p className="font-medium text-gray-900">
                                  {selectedShiftEvent.startTime} - {selectedShiftEvent.endTime}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <MapPin className="h-5 w-5 text-green-500" />
                              <div>
                                <p className="text-sm text-gray-500">Punto Vendita</p>
                                <p className="font-medium text-gray-900">
                                  {selectedShiftEvent.storeName}
                                </p>
                              </div>
                            </div>
                            
                            {selectedShiftEvent.shiftName && (
                              <div className="flex items-center gap-3">
                                <Calendar1 className="h-5 w-5 text-purple-500" />
                                <div>
                                  <p className="text-sm text-gray-500">Tipo Turno</p>
                                  <p className="font-medium text-gray-900">
                                    {selectedShiftEvent.shiftName}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <DialogFooter>
                          <Button 
                            variant="outline" 
                            onClick={() => setShowShiftDetailModal(false)}
                          >
                            Chiudi
                          </Button>
                        </DialogFooter>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                {/* ✅ UPCOMING SHIFTS SECTION - Shows next 7 days shifts with badges */}
                <Card className="glass-card hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2" data-testid="section-upcoming-shifts">
                      <Calendar1 className="h-5 w-5 text-blue-500" />
                      Turni Prossimi
                      {upcomingShiftsData?.assignments?.length > 0 && (
                        <Badge variant="default" className="ml-2 bg-blue-500" data-testid="badge-shift-count">
                          {upcomingShiftsData.assignments.length}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>Prossimi 7 giorni</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {upcomingShiftsLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(() => {
                          const assignments = upcomingShiftsData?.assignments || [];
                          if (assignments.length === 0) {
                            return (
                              <Alert>
                                <AlertDescription className="text-gray-500 text-center">
                                  Nessun turno assegnato nei prossimi 7 giorni
                                </AlertDescription>
                              </Alert>
                            );
                          }
                          return assignments.slice(0, 4).map((shift: any) => {
                            const isToday = shift.shiftDate === today || shift.date === today;
                            const storeName = shift.storeName || shift.shift?.storeName || shift.store?.name || 'PDV';
                            const rawStartTime = shift.startTime || shift.shift?.startTime || '';
                            const rawEndTime = shift.endTime || shift.shift?.endTime || '';
                            const startTimeFormatted = rawStartTime ? format(new Date(rawStartTime), 'HH:mm') : '';
                            const endTimeFormatted = rawEndTime ? format(new Date(rawEndTime), 'HH:mm') : '';
                            
                            return (
                              <div 
                                key={shift.id} 
                                className={`p-3 rounded-lg border ${isToday ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}
                                data-testid={`item-shift-${shift.id}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${isToday ? 'bg-orange-500 animate-pulse' : 'bg-blue-500'}`} />
                                    <div>
                                      <div className="font-medium text-gray-900">
                                        {format(new Date(shift.shiftDate || shift.date), 'EEEE d MMMM', { locale: it })}
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        {storeName} • {startTimeFormatted} - {endTimeFormatted}
                                      </div>
                                    </div>
                                  </div>
                                  {isToday && (
                                    <Badge className="bg-orange-500" data-testid="badge-shift-today">
                                      Oggi
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* ✅ PAST SHIFTS SECTION - Shows last 30 days shifts */}
                <Card className="glass-card hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2" data-testid="section-past-shifts">
                      <Clock className="h-5 w-5 text-gray-500" />
                      Turni Passati
                      {(Array.isArray(pastShiftsData) ? pastShiftsData : []).length > 0 && (
                        <Badge variant="outline" className="ml-2" data-testid="badge-past-shift-count">
                          {(Array.isArray(pastShiftsData) ? pastShiftsData : []).length}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>Ultimi 30 giorni</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pastShiftsLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {(() => {
                          const pastAssignments = Array.isArray(pastShiftsData) ? pastShiftsData : [];
                          if (pastAssignments.length === 0) {
                            return (
                              <Alert>
                                <AlertDescription className="text-gray-500 text-center">
                                  Nessun turno negli ultimi 30 giorni
                                </AlertDescription>
                              </Alert>
                            );
                          }
                          return pastAssignments.slice(0, 10).map((shift: any) => {
                            const storeName = shift.storeName || shift.store?.name || 'PDV';
                            const startTimeFormatted = shift.startTime ? format(new Date(shift.startTime), 'HH:mm') : '';
                            const endTimeFormatted = shift.endTime ? format(new Date(shift.endTime), 'HH:mm') : '';
                            
                            return (
                              <div 
                                key={shift.id} 
                                className="p-3 rounded-lg border border-gray-200 bg-gray-50/50"
                                data-testid={`item-past-shift-${shift.id}`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                                    <div>
                                      <div className="font-medium text-gray-700">
                                        {format(new Date(shift.shiftDate || shift.date), 'EEEE d MMMM', { locale: it })}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {storeName} • {startTimeFormatted} - {endTimeFormatted}
                                      </div>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="text-gray-500" data-testid={`badge-past-shift-status-${shift.id}`}>
                                    {shift.status === 'completed' ? 'Completato' : 'Passato'}
                                  </Badge>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Notifications - WindTre Glass */}
                <Card className="glass-card hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2" data-testid="section-notifications">
                      <Bell className="h-5 w-5 text-orange-500" />
                      Notifiche Recenti
                      {(Array.isArray(notifications) ? notifications : []).length > 0 && (
                        <Badge variant="destructive" className="ml-2" data-testid="badge-notification-count">
                          {(Array.isArray(notifications) ? notifications : []).length}
                        </Badge>
                      )}
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
                        {(Array.isArray(notifications) ? notifications : []).slice(0, 3).map((notification) => {
                          const isShiftNotification = notification.type === 'shift' || notification.category === 'shift';
                          return (
                            <Alert 
                              key={notification.id} 
                              className={`border-l-4 ${isShiftNotification ? 'border-l-blue-500 bg-blue-50/50' : 'border-l-orange-500'}`}
                              data-testid={`item-notification-${notification.id}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2 flex-1">
                                  {isShiftNotification && <Calendar1 className="h-4 w-4 text-blue-500 flex-shrink-0" />}
                                  <div className="flex-1">
                                    <AlertTitle className="text-sm font-medium" data-testid={`text-notification-title-${notification.id}`}>
                                      {notification.title || notification.titolo}
                                    </AlertTitle>
                                    <AlertDescription className="text-xs text-gray-600 mt-1" data-testid={`text-notification-message-${notification.id}`}>
                                      {notification.message || notification.messaggio}
                                    </AlertDescription>
                                  </div>
                                </div>
                                <Badge 
                                  variant={notification.status === 'read' || notification.letto ? 'secondary' : 'default'} 
                                  className={`ml-2 ${isShiftNotification ? 'bg-blue-500' : ''}`}
                                  data-testid={`badge-notification-status-${notification.id}`}
                                >
                                  {notification.status === 'read' || notification.letto ? 'Letto' : 'Nuovo'}
                                </Badge>
                              </div>
                            </Alert>
                          );
                        })}
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
                          // ✅ PROGRESSIVE DISCLOSURE: No defaultStrategy - user must select PDV → method workflow
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
                    onClick={() => setUniversalRequestModal({ open: true, data: {} })}
                    className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                    data-testid="button-new-request"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuova Richiesta
                  </Button>
                </div>

                {/* Request Filters */}
                <div className="flex gap-4 mb-6 flex-wrap">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                  
                  <Select value={timeFilter} onValueChange={setTimeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Periodo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutto il periodo</SelectItem>
                      <SelectItem value="today">Oggi</SelectItem>
                      <SelectItem value="week">Ultimi 7 giorni</SelectItem>
                      <SelectItem value="30days">Ultimi 30 giorni</SelectItem>
                      <SelectItem value="60days">Ultimi 60 giorni</SelectItem>
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
                      <div className="overflow-x-auto">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: 'linear-gradient(135deg, #f9fafb, #f3f4f6)' }}>
                              <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', width: '20%' }}>Nome Richiesta</th>
                              <th style={{ padding: '16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', width: '12%' }}>Dipartimento</th>
                              <th style={{ padding: '16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', width: '13%' }}>Categoria</th>
                              <th style={{ padding: '16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', width: '13%' }}>Tipologia</th>
                              <th style={{ padding: '16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', width: '14%' }}>Data</th>
                              <th style={{ padding: '16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', width: '10%' }}>Stato</th>
                              <th style={{ padding: '16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', width: '18%' }}>Azioni</th>
                            </tr>
                          </thead>
                          <tbody>
                            {myRequests.map((request: any) => (
                              <tr 
                                key={request.id} 
                                data-testid={`row-request-${request.id}`}
                                style={{ 
                                  borderBottom: '1px solid #f3f4f6',
                                  transition: 'background 0.2s ease'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#fafbfc'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                              >
                                <td style={{ padding: '16px', textAlign: 'left' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-start' }}>
                                    <div style={{
                                      background: 'linear-gradient(135deg, #FF6900, #ff8533)',
                                      color: 'white',
                                      padding: '8px',
                                      borderRadius: '8px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      <FileText size={16} />
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '14px', color: '#111827', fontWeight: '600' }} data-testid={`text-request-name-${request.id}`}>
                                        {request.title || 'Richiesta HR'}
                                      </div>
                                      {request.description && (
                                        <div style={{ fontSize: '12px', color: '#6b7280', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} data-testid={`text-request-desc-${request.id}`}>
                                          {request.description}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center' }} data-testid={`text-request-department-${request.id}`}>
                                  <span style={{
                                    fontSize: '12px',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    ...(request.department === 'hr' && { background: '#FFF4ED', color: '#FF6900' }),
                                    ...(request.department === 'finance' && { background: '#F3E8FF', color: '#7B2CBF' }),
                                    ...(request.department === 'operations' && { background: '#ECFDF5', color: '#10B981' }),
                                    ...(request.department === 'support' && { background: '#EFF6FF', color: '#3B82F6' }),
                                    ...(request.department === 'crm' && { background: '#FEF3C7', color: '#F59E0B' }),
                                    ...(request.department === 'sales' && { background: '#FEE2E2', color: '#EF4444' }),
                                    ...(request.department === 'marketing' && { background: '#F5F3FF', color: '#8B5CF6' }),
                                    ...(!['hr', 'finance', 'operations', 'support', 'crm', 'sales', 'marketing'].includes(request.department) && { background: '#F3F4F6', color: '#6B7280' })
                                  }}>
                                    {request.department === 'hr' && 'HR'}
                                    {request.department === 'finance' && 'Finance'}
                                    {request.department === 'operations' && 'Operations'}
                                    {request.department === 'support' && 'IT Support'}
                                    {request.department === 'crm' && 'CRM'}
                                    {request.department === 'sales' && 'Sales'}
                                    {request.department === 'marketing' && 'Marketing'}
                                    {!['hr', 'finance', 'operations', 'support', 'crm', 'sales', 'marketing'].includes(request.department) && (request.department || 'N/A')}
                                  </span>
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center' }} data-testid={`text-request-category-${request.id}`}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '16px' }}>
                                      {request.category && ITALIAN_HR_CATEGORIES[request.category as keyof typeof ITALIAN_HR_CATEGORIES]?.icon || '📋'}
                                    </span>
                                    <span style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280' }}>
                                      {request.category && ITALIAN_HR_CATEGORIES[request.category as keyof typeof ITALIAN_HR_CATEGORIES]?.name || request.category || 'N/A'}
                                    </span>
                                  </div>
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center' }} data-testid={`text-request-type-${request.id}`}>
                                  <span style={{
                                    fontSize: '12px',
                                    padding: '4px 8px',
                                    background: '#dbeafe',
                                    color: '#1e40af',
                                    borderRadius: '12px',
                                    fontWeight: '500'
                                  }}>
                                    {request.type && ITALIAN_REQUEST_TYPES[request.type as keyof typeof ITALIAN_REQUEST_TYPES] || request.type || 'N/A'}
                                  </span>
                                </td>
                                <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280', textAlign: 'center' }} data-testid={`text-request-date-${request.id}`}>
                                  {request.createdAt ? format(new Date(request.createdAt), 'dd/MM/yyyy HH:mm') : 'N/A'}
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center' }}>
                                  <span 
                                    style={{
                                      fontSize: '11px',
                                      padding: '4px 8px',
                                      borderRadius: '12px',
                                      fontWeight: '600',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.025em',
                                      ...(request.status === 'pending' && { background: '#fef3c7', color: '#92400e' }),
                                      ...(request.status === 'approved' && { background: '#d1fae5', color: '#065f46' }),
                                      ...(request.status === 'rejected' && { background: '#fee2e2', color: '#991b1b' }),
                                      ...(request.status === 'draft' && { background: '#f3f4f6', color: '#374151' }),
                                      ...(!['pending', 'approved', 'rejected', 'draft'].includes(request.status) && { background: '#f3f4f6', color: '#6b7280' })
                                    }}
                                    data-testid={`badge-request-status-${request.id}`}
                                  >
                                    {getStatusLabel(request.status)}
                                  </span>
                                </td>
                                <td style={{ padding: '16px', textAlign: 'center' }}>
                                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                    <button
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
                                      style={{
                                        background: 'transparent',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '6px',
                                        padding: '6px',
                                        cursor: 'pointer',
                                        color: '#6b7280',
                                        transition: 'all 0.2s'
                                      }}
                                      onMouseOver={(e) => {
                                        e.currentTarget.style.background = '#f9fafb';
                                        e.currentTarget.style.borderColor = '#d1d5db';
                                      }}
                                      onMouseOut={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.borderColor = '#e5e7eb';
                                      }}
                                    >
                                      <Eye size={14} />
                                    </button>
                                    {request.status === 'draft' && (
                                      <button
                                        onClick={() => {
                                          if (confirm('Sei sicuro di voler eliminare questa bozza?')) {
                                            deleteRequestMutation.mutate(request.id);
                                          }
                                        }}
                                        data-testid={`button-delete-request-${request.id}`}
                                        title="Elimina bozza"
                                        style={{
                                          background: 'transparent',
                                          border: '1px solid #e5e7eb',
                                          borderRadius: '6px',
                                          padding: '6px',
                                          cursor: 'pointer',
                                          color: '#ef4444',
                                          transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => {
                                          e.currentTarget.style.background = '#fef2f2';
                                          e.currentTarget.style.borderColor = '#fca5a5';
                                        }}
                                        onMouseOut={(e) => {
                                          e.currentTarget.style.background = 'transparent';
                                          e.currentTarget.style.borderColor = '#e5e7eb';
                                        }}
                                      >
                                        <AlertCircle size={14} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
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
                <div className="overflow-x-auto">
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
                </div>

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
                              alert('ID utente mancante');
                              return;
                            }

                            if (!avatarData.blob) {
                              console.error('❌ No file blob provided');
                              alert('Nessun file selezionato');
                              return;
                            }
                            
                            // Step 1: Generate presigned upload URL
                            const initResponse = await fetch('/api/avatar/upload', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'X-Tenant-ID': localStorage.getItem('currentTenantId') || '00000000-0000-0000-0000-000000000001',
                                'X-Auth-Session': 'authenticated',
                                'X-Demo-User': 'admin-user'
                              },
                              body: JSON.stringify({
                                fileName: 'avatar.jpg',
                                contentType: avatarData.blob.type,
                                fileSize: avatarData.blob.size
                              })
                            });

                            if (!initResponse.ok) {
                              const initError = await initResponse.json();
                              throw new Error(initError.message || 'Errore generazione URL upload');
                            }

                            const initResult = await initResponse.json();
                            console.log('✅ Upload URL generated:', initResult);
                            
                            // Step 2: Upload file to Object Storage
                            const uploadFormData = new FormData();
                            uploadFormData.append('file', avatarData.blob, 'avatar.jpg');
                            uploadFormData.append('fileName', 'avatar.jpg');
                            uploadFormData.append('contentType', avatarData.blob.type);
                            uploadFormData.append('objectPath', initResult.data.objectPath);
                            uploadFormData.append('visibility', 'public');
                            uploadFormData.append('category', 'avatars');

                            const uploadResponse = await fetch('/api/objects/upload', {
                              method: 'POST',
                              headers: {
                                'X-Tenant-ID': localStorage.getItem('currentTenantId') || '00000000-0000-0000-0000-000000000001',
                                'X-Auth-Session': 'authenticated',
                                'X-Demo-User': 'admin-user'
                              },
                              body: uploadFormData
                            });

                            if (!uploadResponse.ok) {
                              const uploadError = await uploadResponse.json().catch(() => ({ message: 'Errore upload' }));
                              throw new Error(uploadError.message || 'Errore durante l\'upload del file');
                            }

                            const uploadResult = await uploadResponse.json();
                            console.log('✅ File uploaded to storage:', uploadResult);

                            // Step 3: Update user avatar with objectPath
                            const response = await fetch(`/api/users/${displayUser.matricola}/avatar`, {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                                'X-Tenant-ID': localStorage.getItem('currentTenantId') || '00000000-0000-0000-0000-000000000001',
                                'X-Auth-Session': 'authenticated',
                                'X-Demo-User': 'admin-user'
                              },
                              body: JSON.stringify({
                                objectPath: uploadResult.data.objectPath,
                                avatarUrl: uploadResult.data.publicUrl
                              })
                            });

                            if (!response.ok) {
                              const errorData = await response.json();
                              throw new Error(errorData.message || 'Errore aggiornamento avatar');
                            }

                            const result = await response.json();
                            console.log('✅ Avatar updated successfully:', result);
                            
                            // Refresh user data to show updated avatar
                            alert('Avatar aggiornato con successo!');
                            setTimeout(() => {
                              window.location.reload();
                            }, 500);

                          } catch (error) {
                            console.error('❌ Error updating avatar:', error);
                            alert(error instanceof Error ? error.message : 'Errore durante l\'aggiornamento dell\'avatar');
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
          
          {/* Universal Request Modal - Dynamic forms for all departments */}
          <UniversalRequestModal
            open={universalRequestModal.open}
            onOpenChange={(open) => setUniversalRequestModal(open ? { open, data: {} } : { open: false, data: null })}
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
  initialData?: any;
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

const HRRequestForm: React.FC<HRRequestFormProps> = ({ open, onOpenChange, onSubmit, isSubmitting, initialData }) => {
  const { toast } = useToast();
  
  // Helper function to convert backend data to form data
  const convertToFormData = (backendData: any): HRRequestFormData => {
    if (!backendData || Object.keys(backendData).length === 0) {
      return {
        type: 'vacation',
        startDate: '',
        endDate: '',
        reason: '',
        category: 'leave',
        priority: 'normal'
      };
    }
    
    return {
      type: backendData.type || backendData.requestSubtype || 'vacation',
      startDate: backendData.startDate ? new Date(backendData.startDate).toISOString().split('T')[0] : '',
      endDate: backendData.endDate ? new Date(backendData.endDate).toISOString().split('T')[0] : '',
      reason: backendData.description || backendData.reason || '',
      category: backendData.category || backendData.requestType || 'leave',
      priority: backendData.priority || 'normal'
    };
  };
  
  const [formData, setFormData] = useState<HRRequestFormData>(() => convertToFormData(initialData));

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Update form data when initialData changes (for edit mode)
  React.useEffect(() => {
    if (open) {
      setFormData(convertToFormData(initialData));
      setValidationErrors({});
    }
  }, [open, initialData]);

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
      // Backend schema requires: department, category, type, title, description
      department: 'hr', // Fixed department for HR requests
      category: validatedData.category, // Use category as category (leave, permission, training, etc.)
      type: validatedData.type, // Use type as type (vacation, sick, etc.)
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

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1050
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        width: '95%',
        maxWidth: '900px',
        maxHeight: '95vh',
        overflow: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '32px'
        }}>
          <div>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#111827',
              margin: '0 0 8px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ClipboardList size={24} style={{ color: '#FF6900' }} />
              Nuova Richiesta HR
            </h2>
            <p style={{
              fontSize: '15px',
              color: '#6b7280',
              margin: 0
            }}>
              Compila il modulo per inviare la tua richiesta al reparto HR
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              color: '#6b7280',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#f3f4f6';
              e.currentTarget.style.color = '#111827';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '24px' }}>
            
            {/* Sezione Categoria e Tipo */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 20px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <FileText size={20} />
                Tipologia Richiesta
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                    Categoria *
                  </label>
                  <select 
                    value={formData.category} 
                    onChange={(e) => {
                      setFormData({ ...formData, category: e.target.value as any, type: 'vacation' });
                    }}
                    style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: '#f9fafb' }}
                  >
                    <option value="">Seleziona categoria</option>
                    {Object.entries(ITALIAN_HR_CATEGORIES).map(([key, category]) => (
                      <option key={key} value={key}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {validationErrors.category && (
                    <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {validationErrors.category}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                    Tipologia *
                  </label>
                  <select 
                    value={formData.type} 
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: '#f9fafb' }}
                  >
                    <option value="">Seleziona tipo</option>
                    {formData.category && ITALIAN_HR_TYPES[formData.category as keyof typeof ITALIAN_HR_TYPES] && 
                      Object.entries(ITALIAN_HR_TYPES[formData.category as keyof typeof ITALIAN_HR_TYPES]).map(([key, type]) => (
                        <option key={key} value={key}>
                          {type.name}
                        </option>
                      ))
                    }
                  </select>
                  {validationErrors.type && (
                    <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {validationErrors.type}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sezione Date */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 20px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CalendarIcon size={20} />
                Periodo
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                    Data Inizio *
                  </label>
                  <input 
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: '#f9fafb' }}
                  />
                  {validationErrors.startDate && (
                    <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {validationErrors.startDate}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                    Data Fine (opzionale)
                  </label>
                  <input 
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    min={formData.startDate}
                    style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: '#f9fafb' }}
                  />
                </div>
              </div>
            </div>

            {/* Sezione Motivazione */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 20px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Edit3 size={20} />
                Dettagli
              </h3>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                  Motivazione *
                </label>
                <textarea 
                  placeholder={`Descrivi la tua richiesta per ${formData.category && ITALIAN_HR_CATEGORIES[formData.category as keyof typeof ITALIAN_HR_CATEGORIES] ? ITALIAN_HR_CATEGORIES[formData.category as keyof typeof ITALIAN_HR_CATEGORIES].name : 'questa tipologia'}...`}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={4}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '8px', 
                    fontSize: '14px',
                    background: '#f9fafb',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
                {validationErrors.reason && (
                  <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                    {validationErrors.reason}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer con Azioni */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '2px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              {hasDraft() && (
                <button
                  type="button"
                  onClick={loadDraft}
                  disabled={isSubmitting}
                  style={{
                    padding: '12px 24px',
                    border: '1px solid #3b82f6',
                    borderRadius: '8px',
                    background: 'white',
                    color: '#3b82f6',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#eff6ff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'white';
                  }}
                >
                  Carica Bozza
                </button>
              )}
              <button
                type="button"
                onClick={saveDraft}
                disabled={isSubmitting}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #10b981',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#10b981',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#ecfdf5';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                Salva Bozza
              </button>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onOpenChange(false);
                }}
                disabled={isSubmitting}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  background: 'white',
                  color: '#6b7280',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isSubmitting || Object.keys(validationErrors).length > 0}
                style={{
                  padding: '12px 32px',
                  border: 'none',
                  borderRadius: '8px',
                  background: isSubmitting 
                    ? 'linear-gradient(135deg, #d1d5db, #9ca3af)' 
                    : 'linear-gradient(135deg, #FF6900, #ff8533)',
                  color: 'white',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                  boxShadow: '0 4px 15px -3px rgba(255, 105, 0, 0.3)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseOver={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #ff7a1f, #ff9547)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(255, 105, 0, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #FF6900, #ff8533)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px -3px rgba(255, 105, 0, 0.3)';
                  }
                }}
              >
                {isSubmitting ? 'Invio in corso...' : 'Invia Richiesta'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};