import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useHRQueryReadiness } from '@/hooks/useAuthReadiness';
import { useAuth } from '@/hooks/useAuth';
import HRCalendar from '@/components/HRCalendar';
import ShiftTemplateManager from '@/components/Shifts/ShiftTemplateManager';
import ShiftPlanningWorkspace from '@/components/Shifts/ShiftPlanningWorkspace';
import { EmployeeDataTable } from '@/components/hr/EmployeeDataTable';
import { EmployeeEditModal } from '@/components/hr/EmployeeEditModal';

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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  RefreshCw, Gavel, FileX, HelpCircle, Loader2, Store, ChevronDown
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  const { toast } = useToast();
  const { user } = useAuth(); // Get current user from auth context
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'shifts' | 'attendance' | 'coverage' | 'documents' | 'analytics' | 'employees' | 'monitoring'>('dashboard');
  const [currentModule, setCurrentModule] = useState('hr');
  
  // ✅ NEW: HR Authentication Readiness Hook - usando useHRQueryReadiness per abilitazione immediata
  const { enabled: hrQueriesEnabled, attempts, debugInfo } = useHRQueryReadiness();
  
  // State for various modals and forms
  const [showRequestModal, setShowRequestModal] = useState(false);
  // Removed showShiftModal - ShiftTemplateManager has its own modal
  const [showPushDocumentModal, setShowPushDocumentModal] = useState(false);
  // Employee modal state
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [requestFormData, setRequestFormData] = useState<Partial<HRRequest>>({});
  // ✅ CROSS-STORE: selectedStore ora può essere 'all' o uno store specifico
  // Default 'all' per amministratori - mostra dati di tutti i negozi
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
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

  // ✅ UPDATED: Employees data with authentication readiness
  const { data: employees = [], isLoading: loadingEmployees } = useQuery<Employee[]>({
    queryKey: ['/api/users'],
    enabled: hrQueriesEnabled, // Wait for auth readiness
    staleTime: 5 * 60 * 1000,
  });

  // ✅ NEW: Stores data for assignment dashboard
  const { data: stores = [], isLoading: loadingStores } = useQuery<any[]>({
    queryKey: ['/api/stores'],
    staleTime: 5 * 60 * 1000,
  });

  // ✅ CROSS-STORE: Computed selected store object (null if 'all')
  const selectedStore = useMemo(() => {
    if (selectedStoreId === 'all') return null;
    return stores.find(s => s.id === selectedStoreId) || null;
  }, [selectedStoreId, stores]);

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
        return true;
      }
      
      return false;
    },
    retryDelay: (attemptIndex) => {
      return Math.min(1000 * Math.pow(2, attemptIndex), 5000); // Exponential backoff max 5s
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
        {/* KPI Cards Grid */}
        <div className="backdrop-blur-md bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 rounded-3xl p-8 shadow-xl">
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
    
    // ✅ Impact Preview State
    const [impactDialogOpen, setImpactDialogOpen] = useState(false);
    const [selectedRequestForImpact, setSelectedRequestForImpact] = useState<HRRequest | null>(null);
    const [impactData, setImpactData] = useState<{
      affectedShifts: any[];
      coverageGaps: any[];
      overtimeImpact: number;
      costImpact: number;
    } | null>(null);
    const [isLoadingImpact, setIsLoadingImpact] = useState(false);
    
    // ✅ Mutation to calculate impact before approval
    const calculateImpactMutation = useMutation({
      mutationFn: async (requestId: string) => {
        return apiRequest(`/api/hr/requests/${requestId}/calculate-impact`, {
          method: 'POST'
        });
      }
    });
    
    // ✅ Mutation to approve request
    const approveRequestMutation = useMutation({
      mutationFn: async (requestId: string) => {
        return apiRequest(`/api/hr/universal-requests/${requestId}/approve`, {
          method: 'POST'
        });
      },
      onSuccess: () => {
        toast({
          title: 'Richiesta Approvata',
          description: 'La richiesta è stata approvata con successo. I turni in conflitto sono stati sovrascrittti.',
        });
        queryClient.invalidateQueries({ queryKey: ['/api/hr/universal-requests'] });
        setImpactDialogOpen(false);
        setSelectedRequestForImpact(null);
        setImpactData(null);
      },
      onError: (error) => {
        toast({
          title: 'Errore',
          description: 'Impossibile approvare la richiesta.',
          variant: 'destructive'
        });
      }
    });
    
    // ✅ Mutation to reject request
    const rejectRequestMutation = useMutation({
      mutationFn: async (requestId: string) => {
        return apiRequest(`/api/hr/universal-requests/${requestId}/reject`, {
          method: 'POST'
        });
      },
      onSuccess: () => {
        toast({
          title: 'Richiesta Rifiutata',
          description: 'La richiesta è stata rifiutata.',
        });
        queryClient.invalidateQueries({ queryKey: ['/api/hr/universal-requests'] });
      },
      onError: (error) => {
        toast({
          title: 'Errore',
          description: 'Impossibile rifiutare la richiesta.',
          variant: 'destructive'
        });
      }
    });
    
    // ✅ Handle approve button click - first calculate impact
    const handleApproveClick = async (request: HRRequest) => {
      setSelectedRequestForImpact(request);
      setIsLoadingImpact(true);
      setImpactDialogOpen(true);
      
      try {
        const result = await calculateImpactMutation.mutateAsync(request.id);
        setImpactData(result);
      } catch (error) {
        console.error('Failed to calculate impact:', error);
        setImpactData({
          affectedShifts: [],
          coverageGaps: [],
          overtimeImpact: 0,
          costImpact: 0
        });
      } finally {
        setIsLoadingImpact(false);
      }
    };
    
    // ✅ Handle reject button click
    const handleRejectClick = (request: HRRequest) => {
      if (confirm('Sei sicuro di voler rifiutare questa richiesta?')) {
        rejectRequestMutation.mutate(request.id);
      }
    };
    
    // ✅ Handle confirm approval after seeing impact
    const handleConfirmApproval = () => {
      if (selectedRequestForImpact) {
        approveRequestMutation.mutate(selectedRequestForImpact.id);
      }
    };

    // Extract unique categories from HR requests
    const uniqueCategories = useMemo(() => {
      const categories = new Set(hrRequests.map(req => req.category).filter(Boolean));
      return Array.from(categories).sort();
    }, [hrRequests]);

    // Enhanced filtering logic
    const filteredRequests = hrRequests.filter(request => {
      // Status filter
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      
      // Category filter - use actual request category
      const matchesCategory = categoryFilter === 'all' || request.category === categoryFilter;
      
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
                      {uniqueCategories.map(category => (
                        <SelectItem key={category} value={category}>
                          <div className="flex items-center gap-2">
                            <UserCog className="w-4 h-4 text-indigo-600" />
                            {category.toUpperCase()}
                          </div>
                        </SelectItem>
                      ))}
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
                    <th className="text-left p-4 font-medium">Periodo</th>
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
                                onClick={() => handleApproveClick(request)}
                                disabled={approveRequestMutation.isPending}
                                data-testid={`approve-${request.id}`}
                                title="Approva richiesta - Vedi impatto sui turni"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:bg-red-500/10 hover:text-red-700"
                                onClick={() => handleRejectClick(request)}
                                disabled={rejectRequestMutation.isPending}
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
        
        {/* ✅ Impact Preview Dialog */}
        <Dialog open={impactDialogOpen} onOpenChange={setImpactDialogOpen}>
          <DialogContent className="sm:max-w-[600px]" data-testid="dialog-impact-preview">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Analisi Impatto Pre-Approvazione
              </DialogTitle>
              <DialogDescription>
                Verifica l'impatto di questa richiesta sui turni pianificati prima di procedere
              </DialogDescription>
            </DialogHeader>
            
            {selectedRequestForImpact && (
              <div className="space-y-4 py-4">
                {/* Request Summary */}
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge>{getRequestTypeName(selectedRequestForImpact.type)}</Badge>
                      <span className="font-medium">{selectedRequestForImpact.requesterName}</span>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700">
                      In Attesa
                    </Badge>
                  </div>
                  {selectedRequestForImpact.startDate && (
                    <p className="text-sm text-slate-600">
                      Periodo: {new Date(selectedRequestForImpact.startDate).toLocaleDateString('it-IT')}
                      {selectedRequestForImpact.endDate && ` - ${new Date(selectedRequestForImpact.endDate).toLocaleDateString('it-IT')}`}
                    </p>
                  )}
                </div>
                
                {isLoadingImpact ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    <span className="ml-3 text-slate-600">Calcolo impatto in corso...</span>
                  </div>
                ) : impactData ? (
                  <div className="space-y-4">
                    {/* Impact Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 text-center">
                        <div className="text-2xl font-bold text-orange-600">{impactData.affectedShifts?.length || 0}</div>
                        <div className="text-xs text-orange-700">Turni Interessati</div>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center">
                        <div className="text-2xl font-bold text-red-600">{impactData.coverageGaps?.length || 0}</div>
                        <div className="text-xs text-red-700">Gap Copertura</div>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
                        <div className="text-2xl font-bold text-blue-600">{impactData.overtimeImpact || 0}h</div>
                        <div className="text-xs text-blue-700">Ore Straord.</div>
                      </div>
                    </div>
                    
                    {/* Affected Shifts List */}
                    {impactData.affectedShifts && impactData.affectedShifts.length > 0 ? (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Turni che verranno sovrascritti:</Label>
                        <div className="max-h-40 overflow-y-auto space-y-2">
                          {impactData.affectedShifts.map((shift: any, index: number) => (
                            <div key={index} className="p-2 bg-amber-50 rounded border border-amber-200 flex justify-between items-center">
                              <div>
                                <span className="text-sm font-medium">{shift.shiftName || 'Turno'}</span>
                                <span className="text-xs text-slate-500 ml-2">
                                  {shift.date ? new Date(shift.date).toLocaleDateString('it-IT') : ''}
                                </span>
                              </div>
                              <Badge variant="outline" className="text-amber-700 border-amber-300">
                                → Override
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Alert className="bg-green-50 border-green-200">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          Nessun turno in conflitto. L'approvazione non impatterà la pianificazione esistente.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {/* Coverage Gaps Warning */}
                    {impactData.coverageGaps && impactData.coverageGaps.length > 0 && (
                      <Alert className="bg-red-50 border-red-200">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <AlertDescription className="text-red-800">
                          <strong>Attenzione:</strong> L'approvazione creerà gap di copertura nei seguenti negozi/orari. 
                          Considera di pianificare sostituzioni.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : null}
              </div>
            )}
            
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setImpactDialogOpen(false);
                  setSelectedRequestForImpact(null);
                  setImpactData(null);
                }}
                data-testid="button-cancel-approval"
              >
                Annulla
              </Button>
              <Button
                onClick={handleConfirmApproval}
                disabled={approveRequestMutation.isPending || isLoadingImpact}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-confirm-approval"
              >
                {approveRequestMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Conferma Approvazione
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                <SelectContent container={null}>
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
              <SelectContent container={null}>
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
                        {employee.firstName?.[0] || 'U'}{employee.lastName?.[0] || ''}
                      </div>
                      <span>{employee.firstName || 'Utente'} {employee.lastName || 'Sconosciuto'}</span>
                      <Badge variant="secondary" className="text-xs">
                        {employee.position || 'N/A'}
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
  // Struttura semplificata: 1. Calendario 2. Template Studio 3. Gestione Turni
  // ✅ FIX: Memoized to prevent remount on parent re-render (fixes FullCalendar DOM cleanup errors)
  
  const handleApplyTemplate = useMemo(() => async (templateId: string, startDate: Date, endDate: Date) => {
    if (selectedStoreId === 'all') {
      toast({
        title: "Seleziona Negozio",
        description: "Per applicare un template, seleziona prima un negozio specifico",
        variant: "destructive"
      });
      return;
    }
    await apiRequest('/api/hr/shifts/bulk-template-assign', {
      method: 'POST',
      body: JSON.stringify({
        templateId,
        storeId: selectedStoreId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })
    });
    queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts'] });
  }, [selectedStoreId, toast, queryClient]);

  const ShiftsSectionContent = useMemo(() => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestione Turni</h2>
          <p className="text-slate-600 dark:text-slate-400">Calendario, template e assegnazioni cross-store</p>
        </div>
        
        {/* ✅ CROSS-STORE: Filtro negozio opzionale */}
        <div className="flex items-center gap-3">
          <Label className="text-sm font-medium">Negozio:</Label>
          <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
            <SelectTrigger className="w-[250px]" data-testid="select-store-filter">
              <SelectValue placeholder="Tutti i Negozi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🏪 Tutti i Negozi</SelectItem>
              {stores.map((store: any) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name || store.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 1. CALENDARIO - Visualizzazione turni CROSS-STORE */}
      <HRCalendar 
        storeId={selectedStoreId === 'all' ? undefined : selectedStoreId}
        startDate={null}
        endDate={null}
      />

      {/* 2. TEMPLATE MANAGER - Gestione template turni */}
      <ShiftTemplateManager 
        templates={shiftTemplates}
        storeId={selectedStoreId === 'all' ? '' : selectedStoreId}
        onApplyTemplate={handleApplyTemplate}
      />

      {/* 3. GESTIONE TURNI - Flusso lineare: Negozio → Template → Risorse → Coperture */}
      <ShiftPlanningWorkspace />
    </div>
  ), [selectedStoreId, stores, shiftTemplates, handleApplyTemplate]);

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

  const handleEmployeeClick = (userId: string) => {
    // Find the full employee object from the employees array
    const employee = employees.find(emp => emp.id === userId);
    if (employee) {
      setSelectedEmployee(employee);
      setShowEmployeeModal(true);
    }
  };

  // Get current user role from auth context
  const currentUserRole = user?.role || 'user';

  const EmployeesSection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Directory Dipendenti</h2>
          <p className="text-slate-600 dark:text-slate-400">Gestione completa dipendenti con filtri avanzati, scope e permessi</p>
        </div>
      </div>

      {/* Employee Data Table with Advanced Filters */}
      <EmployeeDataTable 
        onEmployeeClick={handleEmployeeClick}
        onEditEmployee={handleEmployeeClick}
        currentUserRole={currentUserRole}
      />
    </div>
  );

  // ==================== ATTENDANCE & ANOMALIES SECTION (ENHANCED) ====================

  const AttendanceSection = () => {
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [selectedStore, setSelectedStore] = useState('all');
    const [filters, setFilters] = useState({ storeId: '', userId: '', status: 'pending', severity: 'all' });
    const [resolutionDialogOpen, setResolutionDialogOpen] = useState(false);
    const [selectedAnomaly, setSelectedAnomaly] = useState<any>(null);
    const [resolutionType, setResolutionType] = useState<'justify' | 'sanction' | 'dismiss'>('justify');
    const [resolutionNotes, setResolutionNotes] = useState('');
    
    // Generate month options (last 12 months)
    const monthOptions = useMemo(() => {
      const options = [];
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        options.push({
          month: d.getMonth() + 1,
          year: d.getFullYear(),
          label: d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
        });
      }
      return options;
    }, []);

    // Combined filters for API
    const apiFilters = useMemo(() => ({
      ...filters,
      storeId: selectedStore !== 'all' ? selectedStore : '',
      month: selectedMonth,
      year: selectedYear
    }), [filters, selectedStore, selectedMonth, selectedYear]);

    const { data: anomalies, isLoading: loadingAnomalies, refetch: refetchAnomalies } = useQuery({
      queryKey: ['/api/hr/attendance/anomalies', apiFilters],
      enabled: hrQueriesEnabled,
      staleTime: 30000
    });

    // Fetch timbrature/attendance logs (from time tracking entries)
    const { data: attendanceData = [], isLoading: loadingAttendance } = useQuery<any[]>({
      queryKey: ['/api/hr/time-tracking/entries', apiFilters],
      enabled: hrQueriesEnabled,
      staleTime: 30000
    });

    // Mutation to detect no-shows (shifts without clock-in)
    const detectNoShowsMutation = useMutation({
      mutationFn: async () => {
        return apiRequest(`/api/hr/attendance/detect-no-shows`, {
          method: 'POST',
          body: JSON.stringify({ month: selectedMonth, year: selectedYear, storeId: selectedStore !== 'all' ? selectedStore : undefined })
        });
      },
      onSuccess: (data: any) => {
        toast({
          title: 'Scansione Completata',
          description: `Rilevate ${data.anomaliesCreated || 0} nuove anomalie per turni senza timbrature.`,
        });
        refetchAnomalies();
      },
      onError: () => {
        toast({
          title: 'Errore',
          description: 'Impossibile eseguire la scansione anomalie.',
          variant: 'destructive'
        });
      }
    });
    
    // Mutation for resolving anomalies
    const resolveAnomalyMutation = useMutation({
      mutationFn: async (params: { anomalyId: string; resolution: string; notes: string }) => {
        return apiRequest(`/api/hr/attendance/anomalies/${params.anomalyId}/resolve`, {
          method: 'POST',
          body: JSON.stringify({ resolution: params.resolution, notes: params.notes })
        });
      },
      onSuccess: () => {
        toast({
          title: 'Anomalia Risolta',
          description: 'L\'anomalia è stata processata con successo.',
        });
        refetchAnomalies();
        setResolutionDialogOpen(false);
        setSelectedAnomaly(null);
        setResolutionNotes('');
      },
      onError: (error) => {
        toast({
          title: 'Errore',
          description: 'Impossibile risolvere l\'anomalia.',
          variant: 'destructive'
        });
      }
    });
    
    // Handle opening resolution dialog
    const handleResolveClick = (anomaly: any) => {
      setSelectedAnomaly(anomaly);
      setResolutionType('justify');
      setResolutionNotes('');
      setResolutionDialogOpen(true);
    };
    
    // Handle resolution submission
    const handleResolveSubmit = () => {
      if (!selectedAnomaly) return;
      resolveAnomalyMutation.mutate({
        anomalyId: selectedAnomaly.id,
        resolution: resolutionType,
        notes: resolutionNotes
      });
    };
    
    // Severity filter options
    const severityOptions = [
      { value: 'all', label: 'Tutte le severità', color: 'bg-slate-500' },
      { value: 'critical', label: 'Critiche', color: 'bg-red-500' },
      { value: 'high', label: 'Alte', color: 'bg-orange-500' },
      { value: 'medium', label: 'Medie', color: 'bg-amber-500' },
      { value: 'low', label: 'Basse', color: 'bg-blue-500' }
    ];
    
    // Status filter options
    const statusOptions = [
      { value: 'pending', label: 'In Attesa' },
      { value: 'acknowledged', label: 'Presa Visione' },
      { value: 'resolved', label: 'Risolte' },
      { value: 'all', label: 'Tutte' }
    ];
    
    // Get resolution type label and icon
    const getResolutionInfo = (type: string) => {
      switch (type) {
        case 'justify':
          return { label: 'Giustifica', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' };
        case 'sanction':
          return { label: 'Sanzione', icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50 border-red-200' };
        case 'dismiss':
          return { label: 'Archivia', icon: FileX, color: 'text-slate-600', bgColor: 'bg-slate-50 border-slate-200' };
        default:
          return { label: type, icon: HelpCircle, color: 'text-slate-600', bgColor: 'bg-slate-50 border-slate-200' };
      }
    };
    
    // Filter anomalies based on selected filters
    const filteredAnomalies = React.useMemo(() => {
      if (!anomalies?.anomalies) return [];
      return anomalies.anomalies.filter((a: any) => {
        if (filters.severity !== 'all' && a.severity !== filters.severity) return false;
        if (filters.status !== 'all' && a.resolutionStatus !== filters.status) return false;
        return true;
      });
    }, [anomalies, filters]);

    return (
      <div className="space-y-6">
        {/* Enhanced Filters Row */}
        <Card className="bg-white border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Month/Year Selector */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <Select 
                  value={`${selectedMonth}-${selectedYear}`}
                  onValueChange={(val) => {
                    const [m, y] = val.split('-').map(Number);
                    setSelectedMonth(m);
                    setSelectedYear(y);
                  }}
                >
                  <SelectTrigger className="w-[200px] bg-white" data-testid="select-attendance-month">
                    <SelectValue placeholder="Seleziona mese" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(opt => (
                      <SelectItem key={`${opt.month}-${opt.year}`} value={`${opt.month}-${opt.year}`}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Store Selector */}
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-slate-500" />
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger className="w-[220px] bg-white" data-testid="select-attendance-store">
                    <SelectValue placeholder="Tutti i negozi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i negozi</SelectItem>
                    {stores.map((store: any) => (
                      <SelectItem key={store.id} value={store.id}>{store.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Scan No-Shows Button */}
              <div className="ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => detectNoShowsMutation.mutate()}
                  disabled={detectNoShowsMutation.isPending}
                  className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                  data-testid="btn-detect-no-shows"
                >
                  {detectNoShowsMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 mr-2" />
                  )}
                  Rileva Assenze Ingiustificate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timbrature DataTable */}
        <Card className="bg-white border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Timbrature Presenze
            </CardTitle>
            <CardDescription>
              Registro timbrature dipendenti - {monthOptions.find(o => o.month === selectedMonth && o.year === selectedYear)?.label}
            </CardDescription>
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
                    {(attendanceData || []).map((record: any, i: number) => {
                      const userName = record.userFirstName && record.userLastName 
                        ? `${record.userFirstName} ${record.userLastName}` 
                        : record.userEmail || '-';
                      
                      const getStatusVariant = (status: string) => {
                        switch (status) {
                          case 'completed': return 'default';
                          case 'active': return 'secondary';
                          case 'disputed': return 'destructive';
                          case 'edited': return 'outline';
                          default: return 'default';
                        }
                      };
                      
                      const getStatusLabel = (status: string) => {
                        const labels: any = {
                          'active': 'In corso',
                          'completed': 'Completato',
                          'disputed': 'Contestato',
                          'edited': 'Modificato'
                        };
                        return labels[status] || status;
                      };
                      
                      return (
                        <tr key={record.id || i} className="border-t" data-testid={`attendance-row-${i}`}>
                          <td className="p-3 text-sm" data-testid={`attendance-user-${i}`}>{userName}</td>
                          <td className="p-3 text-sm" data-testid={`attendance-store-${i}`}>{record.storeName || record.storeCode || '-'}</td>
                          <td className="p-3 text-sm" data-testid={`attendance-clockin-${i}`}>
                            {record.clockIn ? new Date(record.clockIn).toLocaleString('it-IT') : '-'}
                          </td>
                          <td className="p-3 text-sm" data-testid={`attendance-clockout-${i}`}>
                            {record.clockOut ? new Date(record.clockOut).toLocaleString('it-IT') : 'In corso'}
                          </td>
                          <td className="p-3" data-testid={`attendance-status-${i}`}>
                            <Badge variant={getStatusVariant(record.status)}>
                              {getStatusLabel(record.status)}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm" data-testid={`attendance-deviation-${i}`}>
                            {record.overtimeMinutes ? `+${record.overtimeMinutes} min` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Anomalies Section with Enhanced Filters */}
        <Card className="backdrop-blur-md bg-white/10 border-white/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Anomalie Presenze
                </CardTitle>
                <CardDescription>Anomalie rilevate e da risolvere</CardDescription>
              </div>
              
              {/* Severity and Status Filters */}
              <div className="flex items-center gap-3">
                <Select 
                  value={filters.severity} 
                  onValueChange={(value) => setFilters(f => ({ ...f, severity: value }))}
                >
                  <SelectTrigger className="w-[160px]" data-testid="select-severity-filter">
                    <SelectValue placeholder="Severità" />
                  </SelectTrigger>
                  <SelectContent>
                    {severityOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} data-testid={`option-severity-${opt.value}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select 
                  value={filters.status} 
                  onValueChange={(value) => setFilters(f => ({ ...f, status: value }))}
                >
                  <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                    <SelectValue placeholder="Stato" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} data-testid={`option-status-${opt.value}`}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingAnomalies ? (
              <Skeleton className="h-64 w-full" data-testid="skeleton-anomalies" />
            ) : (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4" data-testid="anomaly-summary-stats">
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center">
                    <div className="text-2xl font-bold text-red-600">{anomalies?.summary?.bySeverity?.critical || 0}</div>
                    <div className="text-xs text-red-700">Critiche</div>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 text-center">
                    <div className="text-2xl font-bold text-orange-600">{anomalies?.summary?.bySeverity?.high || 0}</div>
                    <div className="text-xs text-orange-700">Alte</div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-center">
                    <div className="text-2xl font-bold text-amber-600">{anomalies?.summary?.bySeverity?.medium || 0}</div>
                    <div className="text-xs text-amber-700">Medie</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
                    <div className="text-2xl font-bold text-blue-600">{anomalies?.summary?.bySeverity?.low || 0}</div>
                    <div className="text-xs text-blue-700">Basse</div>
                  </div>
                </div>

                {/* Anomalies List */}
                <div className="grid gap-4">
                  {filteredAnomalies.length === 0 ? (
                    <Alert className="bg-green-50 border-green-200" data-testid="no-anomalies">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <AlertDescription>
                        Nessuna anomalia trovata con i filtri selezionati.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    filteredAnomalies.map((anomaly: any, i: number) => {
                      // Format anomaly type in Italian
                      const getAnomalyTypeLabel = (type: string) => {
                        const labels: Record<string, string> = {
                          'no_clock_in': 'Assenza Ingiustificata',
                          'no_clock_out': 'Mancata Uscita',
                          'late_clock_in': 'Ingresso in Ritardo',
                          'early_clock_out': 'Uscita Anticipata',
                          'overtime': 'Straordinario Non Autorizzato',
                          'break_violation': 'Violazione Pausa'
                        };
                        return labels[type] || type?.replace(/_/g, ' ') || 'Anomalia';
                      };
                      
                      // Format occurrence date
                      const occurredAt = anomaly.occurredAt || anomaly.detectedAt;
                      const occurredDate = occurredAt ? new Date(occurredAt) : null;
                      const formattedOccurredDate = occurredDate 
                        ? occurredDate.toLocaleDateString('it-IT', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })
                        : '-';
                      const formattedOccurredTime = occurredDate
                        ? occurredDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                        : '';
                        
                      return (
                      <Card key={anomaly.id} className="border-l-4" style={{
                        borderLeftColor: anomaly.severity === 'critical' ? '#ef4444' : 
                                        anomaly.severity === 'high' ? '#f59e0b' : 
                                        anomaly.severity === 'medium' ? '#f59e0b' : '#94a3b8'
                      }} data-testid={`anomaly-card-${i}`}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge 
                                  variant={anomaly.severity === 'critical' ? 'destructive' : 
                                          anomaly.severity === 'high' ? 'default' : 'secondary'} 
                                  data-testid={`anomaly-type-${i}`}
                                >
                                  {getAnomalyTypeLabel(anomaly.anomalyType)}
                                </Badge>
                                <Badge 
                                  variant="outline"
                                  className={
                                    anomaly.severity === 'critical' ? 'border-red-300 text-red-700 bg-red-50' :
                                    anomaly.severity === 'high' ? 'border-orange-300 text-orange-700 bg-orange-50' :
                                    anomaly.severity === 'medium' ? 'border-amber-300 text-amber-700 bg-amber-50' :
                                    'border-blue-300 text-blue-700 bg-blue-50'
                                  }
                                  data-testid={`anomaly-severity-${i}`}
                                >
                                  {anomaly.severity === 'critical' ? 'Critico' :
                                   anomaly.severity === 'high' ? 'Alto' :
                                   anomaly.severity === 'medium' ? 'Medio' : 'Basso'}
                                </Badge>
                              </div>
                              
                              {/* Occurrence date - prominently displayed */}
                              <div className="mt-2" data-testid={`anomaly-date-${i}`}>
                                <p className="text-base font-medium text-slate-800 capitalize">
                                  {formattedOccurredDate}
                                  {formattedOccurredTime && <span className="text-slate-500"> • ore {formattedOccurredTime}</span>}
                                </p>
                              </div>
                              
                              {/* User and Store info */}
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm font-medium text-slate-700" data-testid={`anomaly-user-${i}`}>
                                  {anomaly.user?.firstName} {anomaly.user?.lastName}
                                </span>
                                <span className="text-sm text-slate-400">•</span>
                                <span className="text-sm text-slate-500" data-testid={`anomaly-store-${i}`}>
                                  {anomaly.store?.nome || anomaly.store?.name}
                                </span>
                              </div>
                              
                              {/* Show shift name if available */}
                              {anomaly.shift?.name && (
                                <p className="text-sm text-slate-500" data-testid={`anomaly-shift-${i}`}>
                                  Turno: {anomaly.shift.name}
                                </p>
                              )}
                              
                              {/* Only show deviation for relevant anomaly types */}
                              {anomaly.anomalyType !== 'no_clock_in' && anomaly.anomalyType !== 'no_clock_out' && anomaly.deviationMinutes && (
                                <p className="text-sm text-slate-600" data-testid={`anomaly-deviation-${i}`}>
                                  Deviazione: {anomaly.deviationMinutes} minuti
                                </p>
                              )}
                              
                              {/* Detection info - secondary */}
                              <p className="text-xs text-slate-400 mt-1" data-testid={`anomaly-detected-${i}`}>
                                Rilevata automaticamente: {anomaly.detectedAt ? new Date(anomaly.detectedAt).toLocaleString('it-IT') : '-'}
                              </p>
                              
                              {anomaly.resolutionStatus === 'resolved' && (
                                <div className="mt-2 p-2 bg-green-50 rounded border border-green-200 text-sm text-green-700">
                                  Risolta: {anomaly.resolutionNotes || 'Nessuna nota'}
                                </div>
                              )}
                            </div>
                            
                            {/* Resolution Actions */}
                            {anomaly.resolutionStatus !== 'resolved' ? (
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleResolveClick(anomaly)}
                                  data-testid={`button-resolve-${i}`}
                                >
                                  <Gavel className="w-4 h-4 mr-1" />
                                  Risolvi
                                </Button>
                              </div>
                            ) : (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Risolta
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Resolution Dialog */}
        <Dialog open={resolutionDialogOpen} onOpenChange={setResolutionDialogOpen}>
          <DialogContent className="sm:max-w-[500px]" data-testid="dialog-resolve-anomaly">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gavel className="w-5 h-5 text-orange-500" />
                Risolvi Anomalia
              </DialogTitle>
              <DialogDescription>
                Scegli come processare questa anomalia
              </DialogDescription>
            </DialogHeader>
            
            {selectedAnomaly && (
              <div className="space-y-4 py-4">
                {/* Anomaly Summary */}
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={selectedAnomaly.severity === 'critical' ? 'destructive' : 'default'}>
                      {selectedAnomaly.anomalyType?.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-sm font-medium">
                      {selectedAnomaly.user?.firstName} {selectedAnomaly.user?.lastName}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    Deviazione: {selectedAnomaly.deviationMinutes || 0} minuti
                  </p>
                </div>
                
                {/* Resolution Type Selection */}
                <div className="space-y-2">
                  <Label>Tipo di Risoluzione</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['justify', 'sanction', 'dismiss'] as const).map((type) => {
                      const info = getResolutionInfo(type);
                      const IconComponent = info.icon;
                      return (
                        <Button
                          key={type}
                          variant={resolutionType === type ? 'default' : 'outline'}
                          className={resolutionType === type ? '' : info.bgColor}
                          onClick={() => setResolutionType(type)}
                          data-testid={`button-resolution-${type}`}
                        >
                          <IconComponent className={`w-4 h-4 mr-1 ${resolutionType === type ? '' : info.color}`} />
                          {info.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Resolution Notes */}
                <div className="space-y-2">
                  <Label htmlFor="resolution-notes">Note (opzionale)</Label>
                  <Textarea
                    id="resolution-notes"
                    placeholder={
                      resolutionType === 'justify' ? 'Es: Ritardo giustificato per visita medica documentata' :
                      resolutionType === 'sanction' ? 'Es: Seconda infrazione nel mese, richiamo scritto' :
                      'Es: Anomalia sistema, nessuna azione richiesta'
                    }
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={3}
                    data-testid="textarea-resolution-notes"
                  />
                </div>
                
                {/* Warning for Sanction */}
                {resolutionType === 'sanction' && (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      La sanzione verrà registrata nel fascicolo del dipendente e sarà visibile nei report HR.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setResolutionDialogOpen(false)} data-testid="button-cancel-resolution">
                Annulla
              </Button>
              <Button 
                onClick={handleResolveSubmit}
                disabled={resolveAnomalyMutation.isPending}
                className={
                  resolutionType === 'justify' ? 'bg-green-600 hover:bg-green-700' :
                  resolutionType === 'sanction' ? 'bg-red-600 hover:bg-red-700' :
                  ''
                }
                data-testid="button-submit-resolution"
              >
                {resolveAnomalyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Conferma {getResolutionInfo(resolutionType).label}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  // ==================== STORE COVERAGE SECTION (ENHANCED) ====================

  const StoreCoverageSection = () => {
    // Filter states - default to current month
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [selectedStore, setSelectedStore] = useState('all');
    const [viewMode, setViewMode] = useState<'matrix' | 'daily'>('matrix');
    const [hoveredCell, setHoveredCell] = useState<{day: number, hour: number} | null>(null);
    const [sortField, setSortField] = useState<'date' | 'coverage' | 'store'>('date');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    // Fetch monthly coverage data
    const { data: monthlyData, isLoading } = useQuery({
      queryKey: ['/api/hr/coverage/monthly', { month: selectedMonth, year: selectedYear, storeId: selectedStore }],
      enabled: hrQueriesEnabled,
      staleTime: 60000
    });

    // Generate month options (last 12 months)
    const monthOptions = useMemo(() => {
      const options = [];
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        options.push({
          month: d.getMonth() + 1,
          year: d.getFullYear(),
          label: d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
        });
      }
      return options;
    }, []);

    // Build day×hour matrix from heatmap data
    const heatmapMatrix = useMemo(() => {
      const matrix: Record<string, any> = {};
      (monthlyData?.heatmap || []).forEach((cell: any) => {
        const key = `${cell.day}-${cell.hour}`;
        matrix[key] = cell;
      });
      return matrix;
    }, [monthlyData?.heatmap]);

    // Hourly aggregate for the header summary
    const hourlyAggregate = monthlyData?.hourlyAggregate || Array.from({ length: 24 }, (_, i) => ({ hour: i, coverage: 0, shifts: 0 }));

    const getHeatColor = (coverage: number, hasData: boolean = true) => {
      if (!hasData || coverage === 0) return 'bg-slate-100 dark:bg-slate-800';
      if (coverage >= 100) return 'bg-emerald-500 text-white';
      if (coverage >= 80) return 'bg-emerald-400 text-white';
      if (coverage >= 60) return 'bg-amber-400 text-slate-900';
      if (coverage >= 40) return 'bg-orange-400 text-white';
      return 'bg-red-400 text-white';
    };

    const getHeatBorder = (coverage: number, hasData: boolean = true) => {
      if (!hasData || coverage === 0) return 'border-slate-200';
      if (coverage >= 100) return 'border-emerald-600';
      if (coverage >= 80) return 'border-emerald-500';
      if (coverage >= 60) return 'border-amber-500';
      if (coverage >= 40) return 'border-orange-500';
      return 'border-red-500';
    };

    // Group shifts by date for daily view
    const shiftsByDate = useMemo(() => {
      const grouped: Record<string, any[]> = {};
      (monthlyData?.shifts || []).forEach((shift: any) => {
        const date = shift.date;
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(shift);
      });
      return grouped;
    }, [monthlyData?.shifts]);

    // Sorted shifts for table
    const sortedShifts = useMemo(() => {
      const shifts = [...(monthlyData?.shifts || [])];
      shifts.sort((a, b) => {
        let cmp = 0;
        if (sortField === 'date') cmp = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        else if (sortField === 'coverage') cmp = a.coverageRate - b.coverageRate;
        else if (sortField === 'store') cmp = (a.storeName || '').localeCompare(b.storeName || '');
        return sortDir === 'asc' ? cmp : -cmp;
      });
      return shifts;
    }, [monthlyData?.shifts, sortField, sortDir]);

    // Get cell data from matrix
    const getCellData = (day: number, hour: number) => {
      return heatmapMatrix[`${day}-${hour}`] || { coverage: 0, shiftsCount: 0, hasData: false };
    };

    // Check if day is weekend
    const isWeekend = (day: number) => {
      const date = new Date(selectedYear, selectedMonth - 1, day);
      return date.getDay() === 0 || date.getDay() === 6;
    };

    // Get day of week abbreviated
    const getDayOfWeek = (day: number) => {
      const date = new Date(selectedYear, selectedMonth - 1, day);
      return date.toLocaleDateString('it-IT', { weekday: 'short' }).substring(0, 2);
    };

    return (
      <div className="space-y-6">
        {/* Enhanced Filters Row */}
        <Card className="bg-white border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Month/Year Selector */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <Select 
                  value={`${selectedMonth}-${selectedYear}`}
                  onValueChange={(val) => {
                    const [m, y] = val.split('-').map(Number);
                    setSelectedMonth(m);
                    setSelectedYear(y);
                  }}
                >
                  <SelectTrigger className="w-[200px] bg-white" data-testid="select-month">
                    <SelectValue placeholder="Seleziona mese" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(opt => (
                      <SelectItem key={`${opt.month}-${opt.year}`} value={`${opt.month}-${opt.year}`}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Store Selector */}
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-slate-500" />
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger className="w-[220px] bg-white" data-testid="select-store-coverage">
                    <SelectValue placeholder="Tutti i negozi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i negozi</SelectItem>
                    {stores.map((store: any) => (
                      <SelectItem key={store.id} value={store.id}>{store.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 ml-auto bg-slate-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'matrix' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('matrix')}
                  className="h-8"
                  data-testid="btn-view-matrix"
                >
                  <Activity className="w-4 h-4 mr-1" />
                  Matrice
                </Button>
                <Button
                  variant={viewMode === 'daily' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('daily')}
                  className="h-8"
                  data-testid="btn-view-daily"
                >
                  <Calendar className="w-4 h-4 mr-1" />
                  Calendario
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Summary Cards - Enhanced Design */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm" data-testid="kpi-total-shifts">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Turni Totali</p>
                  <div className="text-3xl font-bold text-blue-700 mt-1" data-testid="value-total-shifts">
                    {monthlyData?.summary?.totalShifts || 0}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 shadow-sm" data-testid="kpi-fully-staffed">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Coperti 100%</p>
                  <div className="text-3xl font-bold text-emerald-700 mt-1" data-testid="value-fully-staffed">
                    {monthlyData?.summary?.fullyStaffed || 0}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-200 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 shadow-sm" data-testid="kpi-critical">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Critici</p>
                  <div className="text-3xl font-bold text-amber-700 mt-1" data-testid="value-critical-shifts">
                    {monthlyData?.summary?.criticalShifts || 0}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-200 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border-violet-200 shadow-sm" data-testid="kpi-average">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-violet-600 uppercase tracking-wide">Copertura Media</p>
                  <div className="text-3xl font-bold text-violet-700 mt-1" data-testid="value-avg-coverage">
                    {monthlyData?.summary?.averageCoverageRate || 0}%
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-violet-200 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-violet-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Day×Hour Matrix Heatmap */}
        {viewMode === 'matrix' && (
          <Card className="bg-white border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="w-5 h-5 text-orange-500" />
                Mappa Copertura Giorno × Ora
              </CardTitle>
              <CardDescription>
                {monthOptions.find(o => o.month === selectedMonth && o.year === selectedYear)?.label}
                {selectedStore !== 'all' && stores.find((s: any) => s.id === selectedStore) && 
                  ` - ${stores.find((s: any) => s.id === selectedStore)?.nome}`
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[500px] w-full" data-testid="skeleton-heatmap" />
              ) : (
                <div className="space-y-4" data-testid="coverage-heatmap-matrix">
                  {/* Scrollable Matrix Container */}
                  <div className="overflow-x-auto">
                    <div className="min-w-[900px]">
                      {/* Hour Headers */}
                      <div className="flex mb-1">
                        <div className="w-14 flex-shrink-0"></div>
                        {Array.from({ length: 24 }, (_, h) => (
                          <div key={h} className="flex-1 text-center text-[10px] font-medium text-slate-500 px-0.5">
                            {String(h).padStart(2, '0')}
                          </div>
                        ))}
                      </div>

                      {/* Day Rows */}
                      {Array.from({ length: monthlyData?.daysInMonth || 30 }, (_, dayIdx) => {
                        const day = dayIdx + 1;
                        const weekend = isWeekend(day);
                        const dow = getDayOfWeek(day);
                        const today = new Date();
                        const isToday = today.getDate() === day && 
                                       today.getMonth() + 1 === selectedMonth && 
                                       today.getFullYear() === selectedYear;

                        return (
                          <div key={day} className={`flex items-center mb-0.5 ${weekend ? 'bg-slate-50' : ''}`}>
                            {/* Day Label */}
                            <div className={`w-14 flex-shrink-0 text-xs font-medium pr-2 text-right ${isToday ? 'text-blue-600 font-bold' : 'text-slate-600'}`}>
                              <span className="text-slate-400">{dow}</span> {day}
                            </div>

                            {/* Hour Cells */}
                            {Array.from({ length: 24 }, (_, h) => {
                              const cellData = getCellData(day, h);
                              const isHovered = hoveredCell?.day === day && hoveredCell?.hour === h;

                              return (
                                <Tooltip key={h}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={`flex-1 h-5 mx-px rounded-sm cursor-pointer transition-all border ${getHeatColor(cellData.coverage, cellData.hasData)} ${getHeatBorder(cellData.coverage, cellData.hasData)} ${isHovered ? 'ring-2 ring-blue-500 scale-110 z-10' : ''} flex items-center justify-center`}
                                      onMouseEnter={() => setHoveredCell({ day, hour: h })}
                                      onMouseLeave={() => setHoveredCell(null)}
                                      data-testid={`heatmap-cell-${day}-${h}`}
                                    >
                                      {cellData.hasData && cellData.coverage > 0 && (
                                        <span className="text-[8px] font-bold opacity-90">
                                          {cellData.coverage}
                                        </span>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="bg-slate-900 text-white p-3 max-w-xs">
                                    <div className="space-y-1">
                                      <p className="font-semibold">
                                        {day}/{selectedMonth} alle {String(h).padStart(2, '0')}:00
                                      </p>
                                      {cellData.hasData ? (
                                        <>
                                          <p className="text-emerald-400">Copertura: {cellData.coverage}%</p>
                                          <p className="text-slate-300">Turni attivi: {cellData.shiftsCount}</p>
                                        </>
                                      ) : (
                                        <p className="text-slate-400">Nessun turno programmato</p>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-6 pt-4 border-t text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded bg-slate-100 border border-slate-200"></div>
                      <span className="text-slate-600">Nessun turno</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded bg-red-400 border border-red-500"></div>
                      <span className="text-slate-600">&lt;40%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded bg-orange-400 border border-orange-500"></div>
                      <span className="text-slate-600">40-60%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded bg-amber-400 border border-amber-500"></div>
                      <span className="text-slate-600">60-80%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded bg-emerald-400 border border-emerald-500"></div>
                      <span className="text-slate-600">80-100%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded bg-emerald-500 border border-emerald-600"></div>
                      <span className="text-slate-600">100%+</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Daily Calendar View */}
        {viewMode === 'daily' && (
          <Card className="bg-white border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-blue-500" />
                Calendario Copertura
              </CardTitle>
              <CardDescription>
                {monthOptions.find(o => o.month === selectedMonth && o.year === selectedYear)?.label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" data-testid="skeleton-daily-grid" />
              ) : (
                <div className="space-y-4" data-testid="coverage-daily-grid">
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {/* Day headers */}
                    {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                      <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2 bg-slate-50 rounded">{day}</div>
                    ))}
                    
                    {/* Empty cells for first week offset */}
                    {Array.from({ length: (new Date(selectedYear, selectedMonth - 1, 1).getDay() + 6) % 7 }, (_, i) => (
                      <div key={`empty-${i}`} className="h-24"></div>
                    ))}
                    
                    {/* Day cells */}
                    {Array.from({ length: monthlyData?.daysInMonth || 30 }, (_, i) => {
                      const day = i + 1;
                      const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const dayShifts = shiftsByDate[dateStr] || [];
                      const avgCoverage = dayShifts.length > 0
                        ? Math.round(dayShifts.reduce((sum: number, s: any) => sum + s.coverageRate, 0) / dayShifts.length)
                        : 0;
                      const isToday = new Date().toISOString().split('T')[0] === dateStr;
                      const weekend = isWeekend(day);
                      
                      return (
                        <Tooltip key={day}>
                          <TooltipTrigger asChild>
                            <div
                              className={`h-24 rounded-lg p-2 border-2 transition-all cursor-pointer hover:shadow-md ${getHeatColor(avgCoverage, dayShifts.length > 0)} ${getHeatBorder(avgCoverage, dayShifts.length > 0)} ${isToday ? 'ring-2 ring-blue-500 ring-offset-2' : ''} ${weekend && dayShifts.length === 0 ? 'bg-slate-50' : ''}`}
                              data-testid={`day-cell-${day}`}
                            >
                              <div className="flex justify-between items-start">
                                <span className={`text-sm font-bold ${dayShifts.length > 0 ? '' : 'text-slate-400'}`}>{day}</span>
                                {dayShifts.length > 0 && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 h-5 bg-white/80">
                                    {dayShifts.length}
                                  </Badge>
                                )}
                              </div>
                              {dayShifts.length > 0 && (
                                <div className="mt-2 text-center">
                                  <div className="text-2xl font-bold">{avgCoverage}%</div>
                                  <div className="text-[10px] opacity-80">copertura</div>
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="bg-slate-900 text-white p-3 max-w-xs">
                            <div className="space-y-1">
                              <p className="font-semibold">{day}/{selectedMonth}/{selectedYear}</p>
                              {dayShifts.length > 0 ? (
                                <>
                                  <p className="text-emerald-400">Copertura media: {avgCoverage}%</p>
                                  <p className="text-slate-300">{dayShifts.length} turni programmati</p>
                                </>
                              ) : (
                                <p className="text-slate-400">Nessun turno programmato</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Enhanced Shift Table with Sorting */}
        <Card className="bg-white border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-indigo-500" />
                Dettaglio Turni
              </CardTitle>
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {sortedShifts.length} turni
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" data-testid="skeleton-shifts" />
            ) : sortedShifts.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="text-lg font-medium">Nessun turno trovato</p>
                <p className="text-sm mt-1">Prova a selezionare un altro mese o negozio</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th 
                        className="text-left py-3 px-4 font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => { setSortField('date'); setSortDir(sortField === 'date' && sortDir === 'asc' ? 'desc' : 'asc'); }}
                      >
                        <div className="flex items-center gap-1">
                          Data/Ora
                          {sortField === 'date' && (
                            <ChevronDown className={`w-4 h-4 transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`} />
                          )}
                        </div>
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-600">Turno</th>
                      <th 
                        className="text-left py-3 px-4 font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => { setSortField('store'); setSortDir(sortField === 'store' && sortDir === 'asc' ? 'desc' : 'asc'); }}
                      >
                        <div className="flex items-center gap-1">
                          Negozio
                          {sortField === 'store' && (
                            <ChevronDown className={`w-4 h-4 transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`} />
                          )}
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-600">Staff</th>
                      <th 
                        className="text-center py-3 px-4 font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => { setSortField('coverage'); setSortDir(sortField === 'coverage' && sortDir === 'asc' ? 'desc' : 'asc'); }}
                      >
                        <div className="flex items-center justify-center gap-1">
                          Copertura
                          {sortField === 'coverage' && (
                            <ChevronDown className={`w-4 h-4 transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`} />
                          )}
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-600">Stato</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedShifts.map((shift: any, i: number) => (
                      <tr key={shift.shiftId} className="hover:bg-slate-50 transition-colors" data-testid={`shift-row-${i}`}>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800" data-testid={`shift-date-${i}`}>
                            {new Date(shift.startTime).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </div>
                          <div className="text-xs text-slate-500" data-testid={`shift-time-${i}`}>
                            {new Date(shift.startTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} - {new Date(shift.endTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-700" data-testid={`shift-name-${i}`}>{shift.shiftName}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Store className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600" data-testid={`shift-store-${i}`}>{shift.storeName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-bold text-slate-800" data-testid={`shift-staffing-${i}`}>
                            {shift.assignedStaff}/{shift.requiredStaff}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <Progress value={shift.coverageRate} className="w-16 h-2" data-testid={`progress-coverage-${i}`} />
                            <span className="text-xs font-medium w-10 text-right" data-testid={`shift-rate-${i}`}>{shift.coverageRate}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              shift.status === 'fully_staffed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              shift.status === 'adequate' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            {shift.status === 'fully_staffed' ? 'Completo' : 
                             shift.status === 'adequate' ? 'Adeguato' : 'Critico'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                        {emp.firstName || 'Utente'} {emp.lastName || 'Sconosciuto'}
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
        return ShiftsSectionContent;
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
      {selectedEmployee && (
        <EmployeeEditModal 
          employee={selectedEmployee}
          open={showEmployeeModal}
          onClose={() => {
            setShowEmployeeModal(false);
            setSelectedEmployee(null);
          }}
        />
      )}

      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <div className="h-full flex flex-col">
          {/* 🎯 WindTre Glassmorphism Header */}
          <div className="windtre-glass-panel border-b border-white/20 mb-6">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Users className="h-6 w-6 text-windtre-orange" />
                    HR Management Center
                  </h1>
                  <p className="text-gray-600 mt-1">Gestione completa risorse umane con workflow automatizzati</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button 
                    onClick={() => setShowRequestModal(true)}
                    className="bg-windtre-orange hover:bg-windtre-orange-dark text-white"
                    data-testid="button-new-request"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nuova Richiesta
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('shifts')}
                    data-testid="button-manage-shifts"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Gestisci Turni
                  </Button>
                </div>
              </div>
              
              {/* 🎯 Navigation Tabs */}
              <div className="flex gap-1 mt-4 overflow-x-auto">
                {hrTabs.map((tab) => (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? 'default' : 'ghost'}
                    onClick={() => setActiveTab(tab.id as any)}
                    className="flex items-center gap-2 flex-shrink-0"
                    data-testid={`hr-tab-${tab.id}`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Content Area - Responsive to sidebar changes */}
          <div className="flex-1 px-6 overflow-x-auto">
            {renderContent()}
          </div>
        </div>
      </Layout>
    </>
  );
};

export default HRManagementPage;