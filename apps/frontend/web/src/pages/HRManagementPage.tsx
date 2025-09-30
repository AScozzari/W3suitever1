import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuthReadiness } from '@/hooks/useAuthReadiness';
import HRCalendar from '@/components/HRCalendar';
import ShiftTemplateManager from '@/components/Shifts/ShiftTemplateManager';
import ShiftAssignmentDashboard from '@/components/Shifts/ShiftAssignmentDashboard';

// UI Components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

// Icons
import {
  Users, Plus, Settings, Calendar, FileText, BarChart3, 
  Building, Clock, CheckCircle, XCircle, AlertCircle, TrendingUp,
  Filter, Search, Download, Upload, Eye, MoreHorizontal,
  PieChart, Activity, Target, Brain, Zap, ArrowRight,
  MapPin, Phone, Mail, Shield, Award, Briefcase,
  Coffee, Home, Plane, Car, DollarSign, AlertTriangle, Heart, UserCog,
  RefreshCw
} from 'lucide-react';
import { getStatusColor, getStatusLabel, getStatusBadgeClass } from '@/utils/request-status';

// ==================== TYPES ====================

interface HRRequest {
  id: string;
  department: string;
  category: string;
  type: string;
  requesterId: string;
  requesterName: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';
  startDate: string;
  endDate?: string;
  amount?: number;
  reason: string;
  title?: string;
  description?: string;
  workflowInstanceId?: string;
  createdAt: string;
}

interface ShiftTemplate {
  id: string;
  name: string;
  segments: Array<{ start: string; end: string; break?: number }>;
  totalHours: number;
  daysOfWeek: number[];
  isActive: boolean;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position: string;
  department: string;
  hireDate: string;
  status: 'active' | 'inactive' | 'terminated';
  manager?: string;
  storeId?: string;
}

interface HRDocument {
  id: string;
  name: string;
  type: 'payslip' | 'contract' | 'certificate' | 'policy';
  userId?: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
  expiresAt?: string;
}

// ==================== MAIN COMPONENT ====================

const HRManagementPage: React.FC = () => {
  // 🚨 DEBUG: VERY FIRST LOG to see if component loads at all
  console.log('🚨 [HR-COMPONENT] HRManagementPage IS LOADING!', new Date().toISOString());
  
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'shifts' | 'documents' | 'analytics' | 'employees' | 'monitoring'>('dashboard');
  const [currentModule, setCurrentModule] = useState('hr');
  
  // ✅ NEW: HR Authentication Readiness Hook
  const { isReady: hrQueriesEnabled, attempts, debugInfo } = useAuthReadiness();
  
  // 🔍 DEBUG: Log query readiness status
  console.log('🔍 [HR-DEBUG] Query readiness status:', {
    hrQueriesEnabled,
    attempts,
    debugInfo,
    timestamp: new Date().toISOString()
  });
  
  // State for various modals and forms
  const [showRequestModal, setShowRequestModal] = useState(false);
  // Removed showShiftModal - ShiftTemplateManager has its own modal
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showPushDocumentModal, setShowPushDocumentModal] = useState(false);
  const [requestFormData, setRequestFormData] = useState<Partial<HRRequest>>({});
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [pushDocumentData, setPushDocumentData] = useState<{
    documentId: string;
    userIds: string[];
    message?: string;
  }>({ documentId: '', userIds: [] });

  // ==================== DATA QUERIES ====================
  
  // HR Templates inherited from WorkflowManagementPage
  const { data: hrWorkflowTemplates = [], isLoading: loadingTemplates } = useQuery<any[]>({
    queryKey: ['/api/workflow-templates', { department: 'hr' }],
    staleTime: 5 * 60 * 1000,
  });

  // ✅ UPDATED: HR Requests data with authentication readiness
  const { data: hrRequestsResponse, isLoading: loadingRequests } = useQuery<{success: boolean, data: HRRequest[], pagination: any}>({
    queryKey: ['/api/universal-requests', { department: 'hr' }],
    enabled: hrQueriesEnabled, // Wait for auth readiness
    staleTime: 2 * 60 * 1000,
  });
  
  // Extract requests array from API response
  const hrRequests = hrRequestsResponse?.data || [];

  // ✅ UPDATED: Employees data (non-HR endpoint, no dependency needed)
  const { data: employees = [], isLoading: loadingEmployees } = useQuery<Employee[]>({
    queryKey: ['/api/users'],
    staleTime: 5 * 60 * 1000,
  });

  // ✅ NEW: Stores data for assignment dashboard
  const { data: stores = [], isLoading: loadingStores } = useQuery<any[]>({
    queryKey: ['/api/stores'],
    staleTime: 5 * 60 * 1000,
  });

  // Initialize selectedStore with first available store
  useEffect(() => {
    if (stores.length > 0 && !selectedStore) {
      setSelectedStore(stores[0]);
    }
  }, [stores, selectedStore]);

  // ✅ UPDATED: Shifts data with authentication readiness  
  const { data: shifts = [], isLoading: loadingShifts } = useQuery<any[]>({
    queryKey: ['/api/hr/shifts'],
    enabled: hrQueriesEnabled, // Wait for auth readiness
    staleTime: 2 * 60 * 1000,
  });

  // ✅ NEW: Shift Templates data for template manager
  const { data: shiftTemplates = [], isLoading: loadingShiftTemplates } = useQuery<any[]>({
    queryKey: ['/api/hr/shift-templates'],
    enabled: hrQueriesEnabled, // Wait for auth readiness
    staleTime: 5 * 60 * 1000,
  });

  // ✅ UPDATED: Documents data with authentication readiness
  const { data: documents = [], isLoading: loadingDocuments } = useQuery<HRDocument[]>({
    queryKey: ['/api/hr/documents'],
    enabled: hrQueriesEnabled, // Wait for auth readiness
    staleTime: 5 * 60 * 1000,
  });

  // ==================== MUTATIONS ====================

  // ✅ NEW: Push Document to Users mutation
  const pushDocumentMutation = useMutation({
    mutationFn: async (pushData: { documentId: string; userIds: string[]; message?: string }) => {
      if (!hrQueriesEnabled) {
        throw new Error('HR_AUTH_NOT_READY: Authentication not initialized. Please wait.');
      }
      
      console.log('🔄 [HR-PUSH] Pushing document to users:', pushData);
      
      return await apiRequest('/api/hr/documents/push-to-user', {
        method: 'POST',
        body: JSON.stringify(pushData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: "Documento Inviato",
        description: "Il documento è stato inviato agli utenti selezionati",
      });
      setShowPushDocumentModal(false);
      setPushDocumentData({ documentId: '', userIds: [] });
    },
    onError: (error: any) => {
      console.error('🚨 [HR-PUSH] Error pushing document:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore nell'invio del documento",
        variant: "destructive",
      });
    },
  });

  // ✅ UPDATED: HR Request mutation with retry logic for authentication timing issues
  const createHRRequestMutation = useMutation({
    mutationFn: async (requestData: Partial<HRRequest>) => {
      // Pre-validate HR authentication readiness before attempt
      if (!hrQueriesEnabled) {
        console.warn('🚨 [HR-MUTATION] Blocking HR request - authentication not ready');
        throw new Error('HR_AUTH_NOT_READY: Authentication not initialized. Please wait.');
      }
      
      console.log('🚀 [HR-MUTATION] Creating HR request:', requestData.type);
      
      // Step 1: Create HR request
      const hrRequest = await apiRequest('/api/universal-requests', {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      // Step 2: Find appropriate workflow template (inherited from WorkflowManagementPage)
      const templateKey = getWorkflowTemplateKey(requestData.type || 'leave');
      const template = hrWorkflowTemplates.find(t => 
        t.category === 'hr' && t.templateKey === templateKey
      );

      if (!template) {
        throw new Error(`Workflow template not found for ${requestData.type}`);
      }

      // Step 3: Create workflow instance (managed by WorkflowEngine)
      const workflowInstance = await apiRequest('/api/workflow-instances', {
        method: 'POST',
        body: JSON.stringify({
          templateId: template.id,
          requestId: hrRequest.id,
          instanceName: `${getRequestTypeName(requestData.type)} - ${requestData.requesterName}`,
          metadata: {
            requestType: requestData.type,
            amount: requestData.amount,
            days: requestData.endDate && requestData.startDate ? 
              Math.max(1, Math.ceil((new Date(requestData.endDate).getTime() - new Date(requestData.startDate).getTime()) / (1000 * 60 * 60 * 24))) : 1
          }
        }),
      });

      return { hrRequest, workflowInstance };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/universal-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workflow-instances'] });
      toast({
        title: "Richiesta Creata",
        description: "La richiesta è stata inviata per l'approvazione",
      });
      setShowRequestModal(false);
      setRequestFormData({});
    },
    // ✅ NEW: Retry configuration for HR authentication timing issues
    retry: (failureCount, error: any) => {
      const isHRAuthError = error?.message?.includes('HR_AUTH_NOT_READY') || 
                           error?.message?.includes('Tenant ID') ||
                           error?.message?.includes('Invalid tenant');
      
      if (isHRAuthError && failureCount < 3) {
        console.log(`⏳ [HR-RETRY] Retry attempt ${failureCount + 1}/3 for auth timing issue`);
        return true;
      }
      
      console.log(`❌ [HR-RETRY] No more retries. Failure count: ${failureCount}, Error: ${error?.message}`);
      return false;
    },
    retryDelay: (attemptIndex) => {
      const delay = Math.min(1000 * Math.pow(2, attemptIndex), 5000); // Exponential backoff max 5s
      console.log(`⏳ [HR-RETRY] Waiting ${delay}ms before retry attempt ${attemptIndex + 1}`);
      return delay;
    },
    onError: (error: any) => {
      console.error('🚨 [HR-MUTATION] Final error after retries:', error);
      
      const isAuthError = error?.message?.includes('HR_AUTH_NOT_READY');
      const title = isAuthError ? "Sistema non pronto" : "Errore";
      const description = isAuthError 
        ? "Il sistema HR si sta ancora inizializzando. Riprova tra qualche secondo."
        : error.message || "Errore nella creazione della richiesta";
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  // ==================== HELPER FUNCTIONS ====================

  const getWorkflowTemplateKey = (type: string): string => {
    const mapping: { [key: string]: string } = {
      'leave': 'leave_approval',
      'sick_leave': 'sick_leave_approval', 
      'overtime': 'overtime_approval',
      'expense': 'expense_reimbursement',
      'training': 'training_request',
      'remote_work': 'remote_work_approval'
    };
    return mapping[type] || 'leave_approval';
  };

  const getRequestTypeName = (type: string | undefined): string => {
    const mapping: { [key: string]: string } = {
      'leave': 'Richiesta Ferie',
      'sick_leave': 'Malattia',
      'overtime': 'Straordinari',
      'expense': 'Nota Spese',
      'training': 'Formazione',
      'remote_work': 'Lavoro Remoto'
    };
    return mapping[type || ''] || 'Richiesta HR';
  };

  // ✅ Removed: Using centralized request status system

  const calculateKPIs = () => {
    const totalEmployees = employees.length;
    const activeRequests = hrRequests.filter(r => r.status === 'pending').length;
    const thisMonthRequests = hrRequests.filter(r => 
      new Date(r.createdAt).getMonth() === new Date().getMonth()
    ).length;
    const approvalRate = hrRequests.length > 0 ? 
      Math.round((hrRequests.filter(r => r.status === 'approved').length / hrRequests.length) * 100) : 0;

    return { totalEmployees, activeRequests, thisMonthRequests, approvalRate };
  };

  const handleCreateRequest = () => {
    if (!requestFormData.type || !requestFormData.startDate || !requestFormData.reason?.trim()) {
      toast({
        title: "Campi Obbligatori",
        description: "Compila tutti i campi richiesti",
        variant: "destructive",
      });
      return;
    }

    createHRRequestMutation.mutate(requestFormData);
  };

  const handlePushDocument = () => {
    if (!pushDocumentData.documentId || pushDocumentData.userIds.length === 0) {
      toast({
        title: "Campi Obbligatori",
        description: "Seleziona un documento e almeno un utente",
        variant: "destructive",
      });
      return;
    }

    pushDocumentMutation.mutate(pushDocumentData);
  };

  // ==================== DASHBOARD SECTION ====================

  const DashboardSection = () => {
    const kpis = calculateKPIs();

    return (
      <div className="space-y-6">
        {/* Hero Section with Glassmorphism */}
        <div className="backdrop-blur-md bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
                HR Management Center
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                Centro gestionale risorse umane con integrazione workflow
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => setShowRequestModal(true)}
                className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white shadow-lg"
                data-testid="button-new-request"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuova Richiesta
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setActiveTab('shifts')}
                className="backdrop-blur-sm bg-white/10 border-white/30 hover:bg-white/20"
                data-testid="button-manage-shifts"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Gestisci Turni
              </Button>
            </div>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg hover:bg-white/15 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Dipendenti Attivi</p>
                    <p className="text-2xl font-bold text-orange-500" data-testid="stat-employees">{kpis.totalEmployees}</p>
                    <p className="text-xs text-slate-500">totale staff</p>
                  </div>
                  <Users className="w-8 h-8 text-orange-500 opacity-70" />
                </div>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg hover:bg-white/15 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Richieste Pendenti</p>
                    <p className="text-2xl font-bold text-purple-600" data-testid="stat-pending">{kpis.activeRequests}</p>
                    <p className="text-xs text-slate-500">da approvare</p>
                  </div>
                  <Clock className="w-8 h-8 text-purple-600 opacity-70" />
                </div>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg hover:bg-white/15 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Richieste Mese</p>
                    <p className="text-2xl font-bold text-emerald-600" data-testid="stat-monthly">{kpis.thisMonthRequests}</p>
                    <p className="text-xs text-slate-500">questo mese</p>
                  </div>
                  <Activity className="w-8 h-8 text-emerald-600 opacity-70" />
                </div>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg hover:bg-white/15 transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Tasso Approvazione</p>
                    <p className="text-2xl font-bold text-blue-600" data-testid="stat-approval">{kpis.approvalRate}%</p>
                    <p className="text-xs text-slate-500">medio</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-blue-600 opacity-70" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Requests */}
          <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-500" />
                Richieste Recenti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {hrRequests.slice(0, 5).map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(request.status)}`} />
                        <div>
                          <p className="font-medium text-sm" data-testid={`request-${request.id.slice(0, 8)}`}>
                            {getRequestTypeName(request.type)} - {request.requesterName || 'Nome non disponibile'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={request.status === 'pending' ? 'default' : 'secondary'}>
                        {request.status}
                      </Badge>
                    </div>
                  ))}
                  {hrRequests.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Nessuna richiesta recente</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                Azioni Rapide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start hover:bg-orange-500/10 hover:text-orange-600"
                  onClick={() => setShowRequestModal(true)}
                  data-testid="quick-action-request"
                >
                  <Plus className="w-4 h-4 mr-3" />
                  Crea Nuova Richiesta
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start hover:bg-purple-500/10 hover:text-purple-600"
                  onClick={() => setActiveTab('shifts')}
                  data-testid="quick-action-shifts"
                >
                  <Calendar className="w-4 h-4 mr-3" />
                  Pianifica Turni
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start hover:bg-emerald-500/10 hover:text-emerald-600"
                  onClick={() => setActiveTab('documents')}
                  data-testid="quick-action-documents"
                >
                  <FileText className="w-4 h-4 mr-3" />
                  Gestisci Documenti
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start hover:bg-blue-500/10 hover:text-blue-600"
                  onClick={() => setActiveTab('analytics')}
                  data-testid="quick-action-analytics"
                >
                  <BarChart3 className="w-4 h-4 mr-3" />
                  Visualizza Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // ==================== REQUESTS SECTION ====================

  const RequestsSection = () => {
    // Advanced Filters State
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFromFilter, setDateFromFilter] = useState<string>('');
    const [dateToFilter, setDateToFilter] = useState<string>('');

    // Enhanced filtering logic
    const filteredRequests = hrRequests.filter(request => {
      // Status filter
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      
      // Category filter (currently all HR, but prepared for future Finance/Operations)
      const matchesCategory = categoryFilter === 'all' || categoryFilter === 'hr';
      
      // Enhanced search: name, type, description
      const requesterFullName = request.requesterName || '';
      const matchesSearch = searchTerm === '' || (
        requesterFullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getRequestTypeName(request.type).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (request.reason || request.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      // Date range filter
      const requestDate = new Date(request.createdAt);
      const matchesDateFrom = dateFromFilter === '' || requestDate >= new Date(dateFromFilter);
      const matchesDateTo = dateToFilter === '' || requestDate <= new Date(dateToFilter + 'T23:59:59');
      
      return matchesStatus && matchesCategory && matchesSearch && matchesDateFrom && matchesDateTo;
    });

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Gestione Richieste</h2>
            <p className="text-slate-600 dark:text-slate-400">Richieste HR con integrazione workflow</p>
          </div>
          <Button 
            onClick={() => setShowRequestModal(true)}
            className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white"
            data-testid="button-create-request"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuova Richiesta
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Requests */}
          <Card className="backdrop-blur-md bg-white/10 border-white/20 hover:bg-white/15 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Totale Richieste
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white" data-testid="stat-total">
                    {hrRequests.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Requests */}
          <Card className="backdrop-blur-md bg-white/10 border-white/20 hover:bg-white/15 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    In Attesa
                  </p>
                  <p className="text-3xl font-bold text-amber-600" data-testid="stat-pending">
                    {hrRequests.filter(r => r.status === 'pending').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approved Requests */}
          <Card className="backdrop-blur-md bg-white/10 border-white/20 hover:bg-white/15 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Approvate
                  </p>
                  <p className="text-3xl font-bold text-green-600" data-testid="stat-approved">
                    {hrRequests.filter(r => r.status === 'approved').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rejected Requests */}
          <Card className="backdrop-blur-md bg-white/10 border-white/20 hover:bg-white/15 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Rifiutate
                  </p>
                  <p className="text-3xl font-bold text-red-600" data-testid="stat-rejected">
                    {hrRequests.filter(r => r.status === 'rejected').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Filters */}
        <Card className="backdrop-blur-md bg-white/10 border-white/20">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-slate-600" />
                <h3 className="text-lg font-semibold">Filtri Avanzati</h3>
              </div>
              
              {/* First Row: Search & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Enhanced Search */}
                <div>
                  <Label className="text-sm font-medium">Ricerca Globale</Label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <Input 
                      placeholder="Cerca per nome, tipo, descrizione..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-global"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Cerca in richiedente, tipologia e descrizione
                  </p>
                </div>

                {/* Category Filter */}
                <div>
                  <Label className="text-sm font-medium">Categoria</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger data-testid="select-category-filter">
                      <SelectValue placeholder="Seleziona categoria..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte le categorie</SelectItem>
                      <SelectItem value="hr">
                        <div className="flex items-center gap-2">
                          <UserCog className="w-4 h-4 text-indigo-600" />
                          HR - Risorse Umane
                        </div>
                      </SelectItem>
                      <SelectItem value="support">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-blue-600" />
                          Support - Assistenza
                        </div>
                      </SelectItem>
                      <SelectItem value="finance">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          Finance
                        </div>
                      </SelectItem>
                      <SelectItem value="operations">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-purple-600" />
                          Operations
                        </div>
                      </SelectItem>
                      <SelectItem value="sales">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-orange-600" />
                          Sales
                        </div>
                      </SelectItem>
                      <SelectItem value="marketing">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-purple-600" />
                          Marketing
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Second Row: Status & Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Status Filter */}
                <div>
                  <Label className="text-sm font-medium">Stato Richiesta</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="select-status-filter">
                      <SelectValue placeholder="Filtra per stato..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti gli stati</SelectItem>
                      <SelectItem value="pending">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-600" />
                          Pendenti
                        </div>
                      </SelectItem>
                      <SelectItem value="approved">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          Approvate
                        </div>
                      </SelectItem>
                      <SelectItem value="rejected">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-600" />
                          Rifiutate
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date From Filter */}
                <div>
                  <Label className="text-sm font-medium">Data Inizio</Label>
                  <Input 
                    type="date"
                    value={dateFromFilter}
                    onChange={(e) => setDateFromFilter(e.target.value)}
                    className="w-full"
                    data-testid="input-date-from"
                  />
                </div>

                {/* Date To Filter */}
                <div>
                  <Label className="text-sm font-medium">Data Fine</Label>
                  <Input 
                    type="date"
                    value={dateToFilter}
                    onChange={(e) => setDateToFilter(e.target.value)}
                    className="w-full"
                    data-testid="input-date-to"
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              <div className="flex justify-between items-center pt-2">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {filteredRequests.length} richieste trovate su {hrRequests.length} totali
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setCategoryFilter('all');
                    setStatusFilter('all');
                    setSearchTerm('');
                    setDateFromFilter('');
                    setDateToFilter('');
                  }}
                  data-testid="button-clear-filters"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Pulisci Filtri
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Requests Table */}
        <Card className="backdrop-blur-md bg-white/10 border-white/20">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 font-medium">Richiedente</th>
                    <th className="text-left p-4 font-medium">Categoria</th>
                    <th className="text-left p-4 font-medium">Tipologia</th>
                    <th className="text-left p-4 font-medium">Descrizione</th>
                    <th className="text-left p-4 font-medium">Periodo/Importo</th>
                    <th className="text-left p-4 font-medium">Stato</th>
                    <th className="text-left p-4 font-medium">Workflow</th>
                    <th className="text-left p-4 font-medium">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      {/* Richiedente */}
                      <td className="p-4">
                        <div>
                          <p className="font-medium" data-testid={`requester-${request.id}`}>
                            {request.requesterName || 'Nome non disponibile'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(request.createdAt).toLocaleDateString('it-IT', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </td>

                      {/* Categoria */}
                      <td className="p-4">
                        <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30">
                          <Users className="w-3 h-3 mr-1" />
                          {request.category?.toUpperCase() || 'HR'}
                        </Badge>
                      </td>

                      {/* Tipologia Specifica */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {request.type === 'leave' && <Plane className="w-4 h-4 text-green-600" />}
                          {request.type === 'sick_leave' && <Heart className="w-4 h-4 text-red-600" />}
                          {request.type === 'overtime' && <Clock className="w-4 h-4 text-orange-600" />}
                          {request.type === 'expense' && <DollarSign className="w-4 h-4 text-purple-600" />}
                          {request.type === 'training' && <Target className="w-4 h-4 text-blue-600" />}
                          {request.type === 'remote_work' && <Home className="w-4 h-4 text-indigo-600" />}
                          <span className="text-sm font-medium">{getRequestTypeName(request.type)}</span>
                        </div>
                      </td>

                      {/* Descrizione */}
                      <td className="p-4 max-w-xs">
                        <p className="text-sm text-slate-700 dark:text-slate-300 truncate" 
                           title={request.reason || request.description}
                           data-testid={`description-${request.id}`}>
                          {request.reason || request.description || request.title || 'Nessuna descrizione'}
                        </p>
                      </td>

                      {/* Periodo/Importo */}
                      <td className="p-4">
                        {request.amount ? (
                          <div className="text-sm">
                            <p className="font-semibold text-green-600">€ {request.amount.toFixed(2)}</p>
                            {request.startDate && (
                              <p className="text-xs text-slate-500">
                                {new Date(request.startDate).toLocaleDateString('it-IT')}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm">
                            {request.startDate && (
                              <p className="font-medium">
                                {new Date(request.startDate).toLocaleDateString('it-IT')}
                              </p>
                            )}
                            {request.endDate && (
                              <p className="text-xs text-slate-500">
                                → {new Date(request.endDate).toLocaleDateString('it-IT')}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Stato */}
                      <td className="p-4">
                        <Badge 
                          className={getStatusBadgeClass(request.status)}
                          data-testid={`status-${request.id}`}
                        >
                          {getStatusLabel(request.status)}
                        </Badge>
                      </td>

                      {/* Workflow */}
                      <td className="p-4">
                        {request.workflowInstanceId ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(`/staging/workflow-management`, '_blank')}
                            data-testid={`workflow-${request.id}`}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Workflow
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-500">Non collegato</span>
                        )}
                      </td>

                      {/* Azioni Specifiche */}
                      <td className="p-4">
                        <div className="flex gap-1">
                          {request.status === 'pending' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-green-600 hover:bg-green-500/10 hover:text-green-700"
                                data-testid={`approve-${request.id}`}
                                title="Approva richiesta"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:bg-red-500/10 hover:text-red-700"
                                data-testid={`reject-${request.id}`}
                                title="Rifiuta richiesta"
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`view-details-${request.id}`}
                            title="Vedi dettagli"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredRequests.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Nessuna richiesta trovata</p>
                <p className="text-sm mt-2">Utilizza i filtri per cercare richieste specifiche</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // ==================== REQUEST MODAL ====================

  const RequestModal = () => (
    <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuova Richiesta HR</DialogTitle>
          <DialogDescription>
            La richiesta creerà automaticamente un workflow per l'approvazione
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo Richiesta *</Label>
              <Select 
                value={requestFormData.type || ''} 
                onValueChange={(value) => setRequestFormData(prev => ({ ...prev, type: value as any }))}
              >
                <SelectTrigger data-testid="select-request-type">
                  <SelectValue placeholder="Seleziona tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leave">Ferie</SelectItem>
                  <SelectItem value="sick_leave">Malattia</SelectItem>
                  <SelectItem value="overtime">Straordinari</SelectItem>
                  <SelectItem value="expense">Nota Spese</SelectItem>
                  <SelectItem value="training">Formazione</SelectItem>
                  <SelectItem value="remote_work">Lavoro Remoto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nome Richiedente *</Label>
              <Input 
                value={requestFormData.requesterName || ''}
                onChange={(e) => setRequestFormData(prev => ({ ...prev, requesterName: e.target.value }))}
                placeholder="Nome e cognome"
                data-testid="input-requester-name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Inizio *</Label>
              <Input 
                type="date"
                value={requestFormData.startDate || ''}
                onChange={(e) => setRequestFormData(prev => ({ ...prev, startDate: e.target.value }))}
                data-testid="input-start-date"
              />
            </div>
            <div>
              <Label>Data Fine</Label>
              <Input 
                type="date"
                value={requestFormData.endDate || ''}
                onChange={(e) => setRequestFormData(prev => ({ ...prev, endDate: e.target.value }))}
                data-testid="input-end-date"
              />
            </div>
          </div>

          {(requestFormData.type === 'expense' || requestFormData.type === 'overtime') && (
            <div>
              <Label>Importo (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={requestFormData.amount || ''}
                onChange={(e) => setRequestFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
                data-testid="input-amount"
              />
            </div>
          )}

          <div>
            <Label>Motivazione *</Label>
            <Textarea 
              value={requestFormData.reason || ''}
              onChange={(e) => setRequestFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Descrivi il motivo della richiesta..."
              rows={3}
              data-testid="textarea-reason"
            />
          </div>

          {hrWorkflowTemplates.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Questa richiesta creerà automaticamente un workflow utilizzando i template configurati in WorkflowManagement
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setShowRequestModal(false)}>
            Annulla
          </Button>
          <Button 
            onClick={handleCreateRequest} 
            disabled={createHRRequestMutation.isPending}
            data-testid="button-submit-request"
          >
            {createHRRequestMutation.isPending ? 'Creazione...' : 'Crea Richiesta'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // ==================== PUSH DOCUMENT MODAL ====================

  const PushDocumentModal = () => (
    <Dialog open={showPushDocumentModal} onOpenChange={setShowPushDocumentModal}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-purple-500" />
            Invia Documento a Utenti
          </DialogTitle>
          <DialogDescription>
            Seleziona un documento e gli utenti a cui vuoi inviarlo. Gli utenti riceveranno una notifica.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Selection */}
          <div>
            <Label>Documento *</Label>
            <Select 
              value={pushDocumentData.documentId} 
              onValueChange={(value) => setPushDocumentData(prev => ({ ...prev, documentId: value }))}
            >
              <SelectTrigger data-testid="select-document">
                <SelectValue placeholder="Seleziona documento da inviare..." />
              </SelectTrigger>
              <SelectContent>
                {documents.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>{doc.name}</span>
                      <Badge variant="outline" className="ml-2">{doc.type}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Users Selection */}
          <div>
            <Label>Utenti Destinatari *</Label>
            <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg p-3 bg-slate-50 dark:bg-slate-900">
              <div className="space-y-2">
                {employees.map((employee) => (
                  <div key={employee.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`user-${employee.id}`}
                      checked={pushDocumentData.userIds.includes(employee.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setPushDocumentData(prev => ({
                            ...prev,
                            userIds: [...prev.userIds, employee.id]
                          }));
                        } else {
                          setPushDocumentData(prev => ({
                            ...prev,
                            userIds: prev.userIds.filter(id => id !== employee.id)
                          }));
                        }
                      }}
                      data-testid={`checkbox-user-${employee.id.slice(0, 8)}`}
                    />
                    <Label 
                      htmlFor={`user-${employee.id}`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {employee.firstName[0]}{employee.lastName[0]}
                      </div>
                      <span>{employee.firstName} {employee.lastName}</span>
                      <Badge variant="secondary" className="text-xs">
                        {employee.position}
                      </Badge>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Selezionati: {pushDocumentData.userIds.length} utenti
            </p>
          </div>

          {/* Optional Message */}
          <div>
            <Label>Messaggio (opzionale)</Label>
            <Textarea 
              value={pushDocumentData.message || ''}
              onChange={(e) => setPushDocumentData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Aggiungi un messaggio personalizzato per i destinatari..."
              rows={3}
              data-testid="textarea-push-message"
            />
          </div>

          {/* Warning */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Gli utenti selezionati riceveranno una notifica e potranno visualizzare il documento nell'area "I Miei Documenti".
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button 
            variant="outline" 
            onClick={() => {
              setShowPushDocumentModal(false);
              setPushDocumentData({ documentId: '', userIds: [] });
            }}
          >
            Annulla
          </Button>
          <Button 
            onClick={handlePushDocument} 
            disabled={pushDocumentMutation.isPending}
            className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white"
            data-testid="button-confirm-push"
          >
            {pushDocumentMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Invio...
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4 mr-2" />
                Invia Documento
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // ==================== SHIFTS SECTION ====================

  const ShiftsSection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestione Turni</h2>
          <p className="text-slate-600 dark:text-slate-400">Template e assegnazioni turni</p>
        </div>
      </div>

      {/* 1. Professional HR Calendar with its own filters */}
      <HRCalendar 
        storeId={selectedStore?.id}
        startDate={null}
        endDate={null}
      />

      {/* 3. Shift Template Manager */}
      <Card className="backdrop-blur-md bg-white/10 border-white/20">
        <CardContent className="pt-6">
          <ShiftTemplateManager 
            templates={shiftTemplates} 
            storeId="" 
            onApplyTemplate={async (templateId, startDate, endDate) => {
              try {
                // TODO: Implement apply template logic
                toast({
                  title: "Template applicato",
                  description: "Template turno applicato con successo"
                });
              } catch (error) {
                toast({
                  title: "Errore",
                  description: "Impossibile applicare il template",
                  variant: "destructive"
                });
              }
            }}
          />
        </CardContent>
      </Card>

      {/* 4. Assignment Section - Gantt & Grid Views */}
      <Card className="backdrop-blur-md bg-white/10 border-white/20">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>Assegnazione Turni - Vista Gantt & Grid</CardTitle>
              <CardDescription>Assegna turni alle risorse con controllo conflitti</CardDescription>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800 flex-shrink-0">
              <CheckCircle className="w-4 h-4 mr-1" />
              Sistema Attivo
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ShiftAssignmentDashboard
            storeId={selectedStore?.id}
            selectedWeek={selectedDate}
            onAssignShift={async (shiftId: string, employeeIds: string[]) => {
              try {

                const response = await apiRequest(`/api/hr/shifts/${shiftId}/assign`, {
                  method: 'POST',
                  body: JSON.stringify({ employeeIds })
                });
                
                // Refresh queries
                queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts'] });
                queryClient.invalidateQueries({ queryKey: ['/api/hr/shift-assignments'] });
                
                toast({
                  title: "Assegnazione Completata",
                  description: `${employeeIds.length} dipendente/i assegnato/i al turno`
                });
              } catch (error) {
                console.error('Error assigning shift:', error);
                throw error;
              }
            }}
            onUnassignShift={async (shiftId: string, employeeIds: string[]) => {
              try {

                const response = await apiRequest(`/api/hr/shifts/${shiftId}/unassign`, {
                  method: 'POST',
                  body: JSON.stringify({ employeeIds })
                });
                
                // Refresh queries
                queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts'] });
                queryClient.invalidateQueries({ queryKey: ['/api/hr/shift-assignments'] });
                
                toast({
                  title: "Rimozione Completata",
                  description: `${employeeIds.length} dipendente/i rimosso/i dal turno`
                });
              } catch (error) {
                console.error('Error unassigning shift:', error);
                throw error;
              }
            }}
            onBulkAssign={async (assignments: { shiftId: string; employeeId: string }[]) => {
              try {
                // Group assignments by shiftId to match backend API format
                const groupedAssignments = assignments.reduce((acc, assignment) => {
                  const existing = acc.find(item => item.shiftId === assignment.shiftId);
                  if (existing) {
                    existing.employeeIds.push(assignment.employeeId);
                  } else {
                    acc.push({
                      shiftId: assignment.shiftId,
                      employeeIds: [assignment.employeeId]
                    });
                  }
                  return acc;
                }, [] as { shiftId: string; employeeIds: string[] }[]);

                const response = await apiRequest('/api/hr/shifts/bulk-assign', {
                  method: 'POST',
                  body: JSON.stringify({ assignments: groupedAssignments })
                });
                
                // Refresh queries
                queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts'] });
                queryClient.invalidateQueries({ queryKey: ['/api/hr/shift-assignments'] });
                
                toast({
                  title: "Bulk Assignment Completato",
                  description: `${assignments.length} assegnazioni create con successo`
                });
              } catch (error) {
                console.error('Error bulk assigning shifts:', error);
                throw error;
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  );

  // ==================== DOCUMENTS SECTION ====================

  const DocumentsSection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Centro Documenti</h2>
          <p className="text-slate-600 dark:text-slate-400">Gestione payslip, contratti e certificati</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => setShowPushDocumentModal(true)}
            className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white"
            data-testid="button-push-document"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Push a Utenti
          </Button>
          <Button 
            className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white"
            data-testid="button-upload-document"
          >
            <Upload className="w-4 h-4 mr-2" />
            Carica Documento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* File Categories */}
        <Card className="backdrop-blur-md bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="text-lg">Categorie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-start">
                <DollarSign className="w-4 h-4 mr-2" />
                Payslip (24)
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Contratti (12)
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <Award className="w-4 h-4 mr-2" />
                Certificati (8)
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <Shield className="w-4 h-4 mr-2" />
                Policy (15)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* File Manager */}
        <Card className="lg:col-span-3 backdrop-blur-md bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle>File Manager</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
              <div className="text-center text-slate-500">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>File Manager Interface</p>
                <p className="text-sm">Drag & drop, viewer PDF, gestione versioning</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Documents */}
      <Card className="backdrop-blur-md bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle>Documenti Recenti</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-3 font-medium">Nome</th>
                  <th className="text-left p-3 font-medium">Tipo</th>
                  <th className="text-left p-3 font-medium">Dimensione</th>
                  <th className="text-left p-3 font-medium">Caricato</th>
                  <th className="text-left p-3 font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {documents.slice(0, 5).map((doc) => (
                  <tr key={doc.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{doc.name}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">{doc.type}</Badge>
                    </td>
                    <td className="p-3 text-sm text-slate-500">
                      {(doc.fileSize / 1024).toFixed(1)} KB
                    </td>
                    <td className="p-3 text-sm text-slate-500">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="w-3 h-3" />
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
    </div>
  );

  // ==================== ANALYTICS SECTION ====================

  const AnalyticsSection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics & AI Insights</h2>
          <p className="text-slate-600 dark:text-slate-400">Previsioni e analisi intelligenti</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Flight Risk Prediction */}
        <Card className="backdrop-blur-md bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              Flight Risk Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <div>
                    <p className="font-medium">Mario Rossi</p>
                    <p className="text-sm text-slate-500">Venditore Senior</p>
                  </div>
                </div>
                <Badge className="bg-red-500 text-white">85%</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <div>
                    <p className="font-medium">Anna Bianchi</p>
                    <p className="text-sm text-slate-500">Cassiera</p>
                  </div>
                </div>
                <Badge className="bg-yellow-500 text-white">65%</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <div>
                    <p className="font-medium">Luca Verdi</p>
                    <p className="text-sm text-slate-500">Store Manager</p>
                  </div>
                </div>
                <Badge className="bg-green-500 text-white">15%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Turnover Trends */}
        <Card className="backdrop-blur-md bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle>Trend Turnover</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
              <div className="text-center text-slate-500">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Chart Turnover</p>
                <p className="text-sm">Predizione AI per PDV/ruolo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pattern Detection */}
      <Card className="backdrop-blur-md bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-500" />
            Pattern Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
              <AlertTriangle className="w-8 h-8 text-orange-500 mb-2" />
              <h4 className="font-medium">Assenze Anomale</h4>
              <p className="text-sm text-slate-500">Rilevate 3 anomalie questa settimana</p>
            </div>
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Clock className="w-8 h-8 text-blue-500 mb-2" />
              <h4 className="font-medium">Overtime Pattern</h4>
              <p className="text-sm text-slate-500">Incremento 15% straordinari</p>
            </div>
            <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <TrendingUp className="w-8 h-8 text-purple-500 mb-2" />
              <h4 className="font-medium">Performance Index</h4>
              <p className="text-sm text-slate-500">NPS dipendenti: 78/100</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ==================== EMPLOYEES SECTION ====================

  const EmployeesSection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Directory Dipendenti</h2>
          <p className="text-slate-600 dark:text-slate-400">Anagrafica e organigramma</p>
        </div>
        <Button 
          onClick={() => setShowEmployeeModal(true)}
          className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 text-white"
          data-testid="button-add-employee"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuovo Dipendente
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Employee Stats */}
        <div className="space-y-4">
          <Card className="backdrop-blur-md bg-white/10 border-white/20">
            <CardContent className="p-4">
              <div className="text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                <p className="text-2xl font-bold">{employees.length}</p>
                <p className="text-sm text-slate-500">Totale Dipendenti</p>
              </div>
            </CardContent>
          </Card>
          <Card className="backdrop-blur-md bg-white/10 border-white/20">
            <CardContent className="p-4">
              <div className="text-center">
                <Building className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                <p className="text-2xl font-bold">8</p>
                <p className="text-sm text-slate-500">Dipartimenti</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employee List */}
        <Card className="lg:col-span-3 backdrop-blur-md bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle>Lista Dipendenti</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {employees.map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-3 bg-white/10 rounded-lg hover:bg-white/15 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {employee.firstName[0]}{employee.lastName[0]}
                      </div>
                      <div>
                        <p className="font-medium">{employee.firstName} {employee.lastName}</p>
                        <p className="text-sm text-slate-500">{employee.position} - {employee.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                        {employee.status}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Org Chart */}
      <Card className="backdrop-blur-md bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle>Organigramma</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-[16/9] bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
            <div className="text-center text-slate-500">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Organigramma Interattivo</p>
              <p className="text-sm">Struttura gerarchica con skill matrix</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ==================== ATTENDANCE & ANOMALIES SECTION ====================

  const AttendanceSection = () => {
    const [filters, setFilters] = useState({ storeId: '', userId: '', status: 'pending', severity: 'all' });
    
    const { data: anomalies, isLoading: loadingAnomalies } = useQuery({
      queryKey: ['/api/hr/attendance/anomalies', filters],
      enabled: hrQueriesEnabled,
      staleTime: 30000
    });

    // Fetch timbrature/attendance logs
    const { data: attendanceResponse, isLoading: loadingAttendance } = useQuery({
      queryKey: ['/api/hr/attendance/logs', filters],
      enabled: hrQueriesEnabled,
      staleTime: 30000
    });

    const attendanceData = attendanceResponse?.records || [];

    return (
      <div className="space-y-6">
        {/* Timbrature DataTable */}
        <Card className="backdrop-blur-md bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Timbrature Presenze
            </CardTitle>
            <CardDescription>Registro timbrature dipendenti</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAttendance ? (
              <Skeleton className="h-64 w-full" data-testid="skeleton-attendance-table" />
            ) : (
              <div className="rounded-md border" data-testid="attendance-table">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 text-left text-sm font-medium">Dipendente</th>
                      <th className="p-3 text-left text-sm font-medium">Negozio</th>
                      <th className="p-3 text-left text-sm font-medium">Clock In</th>
                      <th className="p-3 text-left text-sm font-medium">Clock Out</th>
                      <th className="p-3 text-left text-sm font-medium">Stato</th>
                      <th className="p-3 text-left text-sm font-medium">Deviazione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(attendanceData || []).map((record: any, i: number) => (
                      <tr key={record.id || i} className="border-t" data-testid={`attendance-row-${i}`}>
                        <td className="p-3 text-sm" data-testid={`attendance-user-${i}`}>{record.user?.fullName || '-'}</td>
                        <td className="p-3 text-sm" data-testid={`attendance-store-${i}`}>{record.store?.name || '-'}</td>
                        <td className="p-3 text-sm" data-testid={`attendance-clockin-${i}`}>
                          {record.actualStartTime ? new Date(record.actualStartTime).toLocaleTimeString() : '-'}
                        </td>
                        <td className="p-3 text-sm" data-testid={`attendance-clockout-${i}`}>
                          {record.actualEndTime ? new Date(record.actualEndTime).toLocaleTimeString() : '-'}
                        </td>
                        <td className="p-3" data-testid={`attendance-status-${i}`}>
                          <Badge variant={record.isOnTime ? 'default' : 'destructive'}>
                            {record.attendanceStatus}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm" data-testid={`attendance-deviation-${i}`}>
                          {record.startDeviationMinutes ? `${record.startDeviationMinutes} min` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Anomalies Section */}
        <Card className="backdrop-blur-md bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Anomalie Presenze
            </CardTitle>
            <CardDescription>Anomalie rilevate e da risolvere</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAnomalies ? (
              <Skeleton className="h-64 w-full" data-testid="skeleton-anomalies" />
            ) : (
              <div className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200" data-testid="anomaly-summary">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  <AlertDescription>
                    {anomalies?.summary.total || 0} anomalie rilevate - 
                    <strong className="ml-1">{anomalies?.summary.byStatus.pending || 0} in attesa</strong>
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4">
                  {anomalies?.anomalies.map((anomaly: any, i: number) => (
                    <Card key={anomaly.id} className="border-l-4" style={{
                      borderLeftColor: anomaly.severity === 'critical' ? '#ef4444' : 
                                      anomaly.severity === 'high' ? '#f59e0b' : '#94a3b8'
                    }} data-testid={`anomaly-card-${i}`}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={anomaly.severity === 'critical' ? 'destructive' : 'default'} data-testid={`anomaly-type-${i}`}>
                                {anomaly.anomalyType.replace(/_/g, ' ')}
                              </Badge>
                              <span className="text-sm text-slate-600" data-testid={`anomaly-user-${i}`}>{anomaly.user?.fullName}</span>
                              <span className="text-sm text-slate-400" data-testid={`anomaly-store-${i}`}>{anomaly.store?.name}</span>
                            </div>
                            <p className="text-sm text-slate-600 mt-2" data-testid={`anomaly-deviation-${i}`}>
                              Deviazione: {anomaly.deviationMinutes} minuti
                            </p>
                            <p className="text-xs text-slate-400" data-testid={`anomaly-time-${i}`}>
                              {new Date(anomaly.detectedAt).toLocaleString()}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" data-testid={`button-resolve-${i}`}>Risolvi</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // ==================== STORE COVERAGE SECTION ====================

  const StoreCoverageSection = () => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedStore, setSelectedStore] = useState('all');

    const { data: coverage, isLoading } = useQuery({
      queryKey: ['/api/hr/attendance/store-coverage', { date: selectedDate, storeId: selectedStore }],
      enabled: hrQueriesEnabled,
      staleTime: 60000
    });

    // Generate hourly heatmap data
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const heatmapData = hours.map(hour => {
      const shiftsInHour = (coverage?.coverage || []).filter((shift: any) => {
        const start = new Date(shift.time.start).getHours();
        const end = new Date(shift.time.end).getHours();
        return hour >= start && hour < end;
      });
      const avgCoverage = shiftsInHour.length > 0 
        ? shiftsInHour.reduce((sum: number, s: any) => sum + s.staffing.coverageRate, 0) / shiftsInHour.length 
        : 0;
      return { hour, coverage: avgCoverage, shifts: shiftsInHour.length };
    });

    const getHeatColor = (coverage: number) => {
      if (coverage >= 100) return 'bg-green-500';
      if (coverage >= 80) return 'bg-green-300';
      if (coverage >= 60) return 'bg-yellow-300';
      if (coverage >= 40) return 'bg-orange-300';
      if (coverage > 0) return 'bg-red-300';
      return 'bg-slate-100';
    };

    return (
      <div className="space-y-6">
        {/* Hourly Heatmap */}
        <Card className="backdrop-blur-md bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Heatmap Copertura Oraria
            </CardTitle>
            <CardDescription>Visualizzazione copertura per fasce orarie</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24 w-full" data-testid="skeleton-heatmap" />
            ) : (
              <div className="space-y-2" data-testid="coverage-heatmap">
                <div className="grid grid-cols-24 gap-1">
                  {heatmapData.map((data, i) => (
                    <div 
                      key={i}
                      className={`h-12 ${getHeatColor(data.coverage)} rounded hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer`}
                      title={`${data.hour}:00 - ${data.coverage.toFixed(0)}% copertura (${data.shifts} turni)`}
                      data-testid={`heatmap-hour-${i}`}
                    >
                      <div className="text-[8px] text-center pt-1 font-medium">{data.hour}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-300 rounded"></div>
                    <span>&lt;40%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-yellow-300 rounded"></div>
                    <span>60-80%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-300 rounded"></div>
                    <span>80-100%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>100%+</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <Card className="backdrop-blur-md bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              KPI Copertura
            </CardTitle>
            <CardDescription>Metriche principali copertura turni</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-32 w-full" data-testid="skeleton-kpi" />
            ) : (
              <div className="grid grid-cols-4 gap-4">
                <Card className="bg-blue-50" data-testid="kpi-total-shifts">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-blue-600" data-testid="value-total-shifts">{coverage?.summary.totalShifts || 0}</div>
                    <p className="text-sm text-blue-600">Turni Totali</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50" data-testid="kpi-fully-staffed">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600" data-testid="value-fully-staffed">{coverage?.summary.fullyStaffed || 0}</div>
                    <p className="text-sm text-green-600">Completamente Coperti</p>
                  </CardContent>
                </Card>
                <Card className="bg-orange-50" data-testid="kpi-critical">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-orange-600" data-testid="value-critical-shifts">{coverage?.summary.criticalShifts || 0}</div>
                    <p className="text-sm text-orange-600">Sotto Soglia Critica</p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50" data-testid="kpi-average">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-purple-600" data-testid="value-avg-coverage">
                      {Math.round(coverage?.summary.averageCoverageRate || 0)}%
                    </div>
                    <p className="text-sm text-purple-600">Copertura Media</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shift List */}
        <Card className="backdrop-blur-md bg-white/10 border-white/20">
          <CardHeader>
            <CardTitle>Dettaglio Turni</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" data-testid="skeleton-shifts" />
            ) : (
              <div className="space-y-3">
                {coverage?.coverage.map((shift: any, i: number) => (
                  <Card key={shift.shiftId} className="bg-white/50" data-testid={`shift-card-${i}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium" data-testid={`shift-name-${i}`}>{shift.shiftName}</h4>
                          <p className="text-sm text-slate-600" data-testid={`shift-store-${i}`}>{shift.storeName}</p>
                          <p className="text-xs text-slate-400" data-testid={`shift-time-${i}`}>
                            {new Date(shift.time.start).toLocaleTimeString()} - {new Date(shift.time.end).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold" data-testid={`shift-staffing-${i}`}>{shift.staffing.present}/{shift.staffing.required}</div>
                          <Progress value={shift.staffing.coverageRate} className="w-24 mt-2" data-testid={`progress-coverage-${i}`} />
                          <p className="text-xs text-slate-500 mt-1" data-testid={`shift-rate-${i}`}>{Math.round(shift.staffing.coverageRate)}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // ==================== MONITORING SECTION ====================

  const MonitoringSection = () => {
    const [monitoringFilters, setMonitoringFilters] = useState({
      storeId: 'all',
      dateRange: 'today',
      employeeId: 'all',
      shiftStatus: 'all'
    });

    // Real-time shift coverage data with proper auth and filters
    const { data: shiftCoverage = [], isLoading: loadingCoverage } = useQuery({
      queryKey: ['/api/hr/shifts', 'coverage', monitoringFilters],
      enabled: hrQueriesEnabled, // Wait for auth readiness
      staleTime: 2 * 60 * 1000, // Cache for 2 minutes
      refetchInterval: 30000, // Auto-refresh every 30 seconds
    });

    // Live shift status calculation
    const calculateShiftStatus = (shift: any) => {
      const staffRatio = shift.assignedStaff / shift.requiredStaff;
      if (staffRatio === 0) return 'vacant';
      if (staffRatio < 0.7) return 'understaffed';
      if (staffRatio >= 0.7 && staffRatio < 1) return 'partial';
      if (staffRatio === 1) return 'fully_staffed';
      return 'overstaffed';
    };

    const getCoverageStatusColor = (status: string) => {
      switch (status) {
        case 'vacant': return 'bg-red-100 text-red-800 border-red-200';
        case 'understaffed': return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'fully_staffed': return 'bg-green-100 text-green-800 border-green-200';
        case 'overstaffed': return 'bg-blue-100 text-blue-800 border-blue-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    const getCoverageStatusLabel = (status: string) => {
      switch (status) {
        case 'vacant': return 'Vacante';
        case 'understaffed': return 'Sottorganico';
        case 'partial': return 'Parziale';
        case 'fully_staffed': return 'Completo';
        case 'overstaffed': return 'Sovraorganico';
        default: return 'Sconosciuto';
      }
    };

    // Coverage statistics
    const coverageStats = useMemo(() => {
      const total = shiftCoverage.length;
      const vacant = shiftCoverage.filter(s => calculateShiftStatus(s) === 'vacant').length;
      const understaffed = shiftCoverage.filter(s => calculateShiftStatus(s) === 'understaffed').length;
      const fullyStaffed = shiftCoverage.filter(s => calculateShiftStatus(s) === 'fully_staffed').length;
      const overstaffed = shiftCoverage.filter(s => calculateShiftStatus(s) === 'overstaffed').length;
      
      return { total, vacant, understaffed, fullyStaffed, overstaffed };
    }, [shiftCoverage]);

    return (
      <div className="space-y-6">
        {/* Real-Time Header */}
        <div className="backdrop-blur-md bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
                Real-Time Monitoring
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Copertura turni live con aggiornamento automatico
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600 font-medium">Live</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.reload()}
                className="backdrop-blur-sm bg-white/10 border-white/30 hover:bg-white/20"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Aggiorna
              </Button>
            </div>
          </div>
        </div>

        {/* Live Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Turni Totali</p>
                  <p className="text-2xl font-bold text-slate-700" data-testid="stat-total-shifts">
                    {coverageStats.total}
                  </p>
                </div>
                <Calendar className="w-6 h-6 text-slate-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Vacanti</p>
                  <p className="text-2xl font-bold text-red-600" data-testid="stat-vacant">
                    {coverageStats.vacant}
                  </p>
                </div>
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Sottorganico</p>
                  <p className="text-2xl font-bold text-orange-600" data-testid="stat-understaffed">
                    {coverageStats.understaffed}
                  </p>
                </div>
                <Users className="w-6 h-6 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Completi</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="stat-fully-staffed">
                    {coverageStats.fullyStaffed}
                  </p>
                </div>
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Sovraorganico</p>
                  <p className="text-2xl font-bold text-blue-600" data-testid="stat-overstaffed">
                    {coverageStats.overstaffed}
                  </p>
                </div>
                <Zap className="w-6 h-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Filters */}
        <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filtri Avanzati Real-Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="store-filter">Punto Vendita</Label>
                <Select 
                  value={monitoringFilters.storeId} 
                  onValueChange={(value) => setMonitoringFilters(prev => ({ ...prev, storeId: value }))}
                >
                  <SelectTrigger data-testid="select-store-filter">
                    <SelectValue placeholder="Seleziona store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i Store</SelectItem>
                    {stores?.map((store: any) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date-filter">Periodo</Label>
                <Select 
                  value={monitoringFilters.dateRange} 
                  onValueChange={(value) => setMonitoringFilters(prev => ({ ...prev, dateRange: value }))}
                >
                  <SelectTrigger data-testid="select-date-filter">
                    <SelectValue placeholder="Seleziona periodo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Oggi</SelectItem>
                    <SelectItem value="tomorrow">Domani</SelectItem>
                    <SelectItem value="week">Questa Settimana</SelectItem>
                    <SelectItem value="month">Questo Mese</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="employee-filter">Dipendente</Label>
                <Select 
                  value={monitoringFilters.employeeId} 
                  onValueChange={(value) => setMonitoringFilters(prev => ({ ...prev, employeeId: value }))}
                >
                  <SelectTrigger data-testid="select-employee-filter">
                    <SelectValue placeholder="Seleziona dipendente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i Dipendenti</SelectItem>
                    {employees?.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status-filter">Stato Copertura</Label>
                <Select 
                  value={monitoringFilters.shiftStatus} 
                  onValueChange={(value) => setMonitoringFilters(prev => ({ ...prev, shiftStatus: value }))}
                >
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue placeholder="Seleziona stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli Stati</SelectItem>
                    <SelectItem value="vacant">Vacanti</SelectItem>
                    <SelectItem value="understaffed">Sottorganico</SelectItem>
                    <SelectItem value="fully_staffed">Completi</SelectItem>
                    <SelectItem value="overstaffed">Sovraorganico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Shift Coverage Table */}
        <Card className="backdrop-blur-md bg-white/10 border-white/20 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                Copertura Turni Live
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Aggiornato ogni 30s
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCoverage ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                <span>Caricamento monitoring real-time...</span>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {shiftCoverage.map((shift: any) => {
                    const status = calculateShiftStatus(shift);
                    return (
                      <div 
                        key={shift.id} 
                        className="flex items-center justify-between p-4 rounded-lg bg-white/50 hover:bg-white/70 transition-all"
                        data-testid={`shift-coverage-${shift.id}`}
                      >
                        <div className="flex items-center space-x-4">
                          <div>
                            <p className="font-medium">{shift.title}</p>
                            <p className="text-sm text-slate-600">
                              {format(new Date(shift.date), 'EEE d MMM', { locale: it })} • {shift.startTime} - {shift.endTime}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {shift.assignedStaff}/{shift.requiredStaff} staff
                            </p>
                            <p className="text-xs text-slate-500">
                              {shift.storeName || 'Store sconosciuto'}
                            </p>
                          </div>
                          
                          <Badge 
                            className={cn(
                              "px-3 py-1 text-xs font-medium border rounded-full",
                              getCoverageStatusColor(status)
                            )}
                            data-testid={`status-badge-${shift.id}`}
                          >
                            {getCoverageStatusLabel(status)}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                  
                  {shiftCoverage.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p>Nessun turno trovato per i filtri selezionati</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // ==================== MAIN RENDER ====================

  // HR Tabs Configuration
  const hrTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'requests', label: 'Richieste', icon: FileText },
    { id: 'shifts', label: 'Turni', icon: Calendar },
    { id: 'attendance', label: 'Presenze & Anomalie', icon: Clock },
    { id: 'coverage', label: 'Copertura Negozi', icon: MapPin },
    { id: 'monitoring', label: 'Monitoring', icon: Activity },
    { id: 'documents', label: 'Documenti', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: Brain },
    { id: 'employees', label: 'Dipendenti', icon: Users }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardSection />;
      case 'requests':
        return <RequestsSection />;
      case 'shifts':
        return <ShiftsSection />;
      case 'attendance':
        return <AttendanceSection />;
      case 'coverage':
        return <StoreCoverageSection />;
      case 'monitoring':
        return <MonitoringSection />;
      case 'documents':
        return <DocumentsSection />;
      case 'analytics':
        return <AnalyticsSection />;
      case 'employees':
        return <EmployeesSection />;
      default:
        return <DashboardSection />;
    }
  };

  return (
    <>
      {/* Modals */}
      <RequestModal />
      <PushDocumentModal />

      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#111827',
            margin: '0 0 8px 0'
          }}>
            Sistema HR Management
          </h1>
          <p style={{
            fontSize: '15px',
            color: '#6b7280',
            margin: 0
          }}>
            Gestione completa risorse umane con workflow automatizzati
          </p>
        </div>

        {/* Tabs Container */}
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
            gap: '4px'
          }}>
            {hrTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    flex: 1,
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
                    WebkitBackdropFilter: 'blur(8px)'
                  }}
                  onMouseOver={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'hsla(255, 255, 255, 0.08)';
                      e.currentTarget.style.color = '#374151';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#6b7280';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                  data-testid={`hr-tab-${tab.id}`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area - Responsive to sidebar changes */}
        <div className="w-full max-w-full overflow-x-auto">
          {renderContent()}
        </div>
      </Layout>
    </>
  );
};

export default HRManagementPage;