// Leave Management Page - Enterprise HR Management System with frontend-kit
import { useState, useMemo } from 'react';
import { ListPageTemplate } from '../../../../../packages/frontend-kit/templates';
import { DashboardTemplate } from '../../../../../packages/frontend-kit/templates';
import { Column } from '../../../../../packages/frontend-kit/components/blocks/DataTable';
import {
  Calendar,
  CalendarDays,
  Plus,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  FileText,
  TrendingUp,
  RefreshCw,
  Plane,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  useLeaveBalance,
  useLeaveRequests,
  useCreateLeaveRequest,
  useUpdateLeaveRequest,
  useDeleteLeaveRequest,
  useApproveLeaveRequest,
  useRejectLeaveRequest,
  useApprovalQueue,
  useLeaveStatistics,
  useLeavePolicies,
  useTeamCalendar,
} from '@/hooks/useLeaveManagement';
import { leaveService } from '@/services/leaveService';
import { LeaveRequestModal } from '@/components/Leave/LeaveRequestModal';
import { LeaveBalanceWidget } from '@/components/Leave/LeaveBalanceWidget';
import { queryClient } from '@/lib/queryClient';

// Define local types
interface MetricCard {
  id: string;
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    label?: string;
  };
  icon?: React.ReactNode;
}

export function LeaveManagementPage() {
  const [currentModule, setCurrentModule] = useState('leave-management');
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'approval' | 'calendar'>('dashboard');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'vacation' | 'sick' | 'personal' | 'other'>('all');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Determine if user is a manager
  const isManager = user?.role === 'TEAM_LEADER' || user?.role === 'HR_MANAGER' || user?.role === 'ADMIN';
  
  // Hooks
  const { data: balance, isLoading: balanceLoading } = useLeaveBalance(user?.id);
  const { data: requests = [], isLoading: requestsLoading, filters, setFilters } = useLeaveRequests({
    userId: activeTab === 'requests' ? user?.id : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    leaveType: typeFilter !== 'all' ? typeFilter : undefined,
  });
  const { data: statistics, isLoading: statsLoading } = useLeaveStatistics();
  const { data: policies } = useLeavePolicies();
  const { requests: approvalRequests = [], pendingCount, urgentCount } = useApprovalQueue();
  const { data: teamCalendar = [] } = useTeamCalendar();
  
  const createRequest = useCreateLeaveRequest();
  const updateRequest = useUpdateLeaveRequest();
  const deleteRequest = useDeleteLeaveRequest();
  const approveRequest = useApproveLeaveRequest();
  const rejectRequest = useRejectLeaveRequest();
  
  // Prepare metrics for dashboard
  const metrics: MetricCard[] = useMemo(() => [
    {
      id: 'balance',
      title: 'Saldo Ferie',
      value: balance?.vacationDaysRemaining || 0,
      description: `Su ${balance?.vacationDaysEntitled || 0} giorni totali`,
      trend: balance ? { 
        value: Math.round((balance.vacationDaysRemaining / balance.vacationDaysEntitled) * 100),
        label: '% disponibile'
      } : undefined,
      icon: <Plane className="h-4 w-4 text-green-600" />,
    },
    {
      id: 'used',
      title: 'Giorni Utilizzati',
      value: balance?.vacationDaysUsed || 0,
      description: 'Quest\'anno',
      icon: <Calendar className="h-4 w-4 text-blue-600" />,
    },
    {
      id: 'pending',
      title: 'Richieste in Attesa',
      value: statistics?.pendingRequests || 0,
      description: urgentCount > 0 ? `${urgentCount} urgenti` : 'Nessuna urgente',
      icon: <Clock className="h-4 w-4 text-orange-600" />,
    },
    {
      id: 'upcoming',
      title: 'Assenze Prossime',
      value: statistics?.upcomingAbsences || 0,
      description: 'Nei prossimi 30 giorni',
      icon: <Users className="h-4 w-4 text-purple-600" />,
    },
  ], [balance, statistics, urgentCount]);
  
  // Prepare columns for requests list
  const requestsColumns: Column[] = useMemo(() => [
    {
      key: 'period',
      label: 'Periodo',
      render: (request: any) => leaveService.formatDateRange(request.startDate, request.endDate),
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (request: any) => {
        const config = leaveService.getLeaveTypeConfig(request.leaveType);
        return (
          <span className="flex items-center gap-1">
            <span>{config.icon}</span>
            <span>{config.label}</span>
          </span>
        );
      },
    },
    {
      key: 'days',
      label: 'Giorni',
      render: (request: any) => request.totalDays,
    },
    {
      key: 'status',
      label: 'Stato',
      render: (request: any) => {
        const config = leaveService.getStatusConfig(request.status);
        return (
          <Badge 
            variant="outline" 
            style={{ 
              backgroundColor: config.bgColor,
              color: config.color,
              borderColor: config.color 
            }}
          >
            {config.icon} {config.label}
          </Badge>
        );
      },
    },
    ...(isManager ? [{
      key: 'employee',
      label: 'Dipendente',
      render: (request: any) => request.userName || 'N/A',
    }] : []),
    {
      key: 'submitted',
      label: 'Richiesta',
      render: (request: any) => request.submittedAt 
        ? format(new Date(request.submittedAt), 'dd/MM/yyyy', { locale: it })
        : 'Bozza',
    },
  ], [isManager]);
  
  // Handlers
  const handleCreateRequest = () => {
    setSelectedRequest(null);
    setShowRequestModal(true);
  };
  
  const handleEditRequest = (request: any) => {
    setSelectedRequest(request);
    setShowRequestModal(true);
  };
  
  const handleDeleteRequest = (request: any) => {
    if (confirm('Sei sicuro di voler eliminare questa richiesta?')) {
      deleteRequest.mutate(request.id);
    }
  };
  
  const handleApproveRequest = (request: any) => {
    approveRequest.mutate({ id: request.id });
  };
  
  const handleRejectRequest = (request: any) => {
    const reason = prompt('Motivo del rifiuto:');
    if (reason) {
      rejectRequest.mutate({ id: request.id, reason });
    }
  };
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/hr/leave'] }),
    ]);
    setIsRefreshing(false);
    toast({
      title: 'Dashboard aggiornato',
      description: 'Tutti i dati sono stati aggiornati',
    });
  };
  
  const handleExport = () => {
    const csv = [
      ['ID', 'Data Richiesta', 'Tipo', 'Data Inizio', 'Data Fine', 'Giorni', 'Stato', 'Note'],
      ...requests.map(r => [
        r.id,
        r.createdAt ? format(new Date(r.createdAt), 'dd/MM/yyyy') : '',
        leaveService.getLeaveTypeConfig(r.leaveType).label,
        format(new Date(r.startDate), 'dd/MM/yyyy'),
        format(new Date(r.endDate), 'dd/MM/yyyy'),
        r.totalDays,
        leaveService.getStatusConfig(r.status).label,
        r.notes || ''
      ])
    ];
    
    const csvContent = csv.map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave-requests-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };
  
  // Quick actions for dashboard
  const quickActions = [
    {
      label: 'Nuova Richiesta',
      icon: <Plus className="h-4 w-4" />,
      onClick: handleCreateRequest,
      variant: 'default' as const,
    },
    {
      label: 'Visualizza Calendario',
      icon: <Calendar className="h-4 w-4" />,
      onClick: () => setActiveTab('calendar'),
      variant: 'outline' as const,
    },
  ];
  
  // Render content based on tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardTemplate
            title="Dashboard Ferie"
            subtitle={`Anno ${new Date().getFullYear()} • ${user?.fullName || user?.email}`}
            metrics={metrics}
            metricsLoading={balanceLoading || statsLoading}
            quickActions={quickActions}
            showFilters={false}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onExport={handleExport}
            lastUpdated={new Date()}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Leave Balance Widget */}
              <LeaveBalanceWidget
                balance={balance}
                loading={balanceLoading}
                onRequestLeave={handleCreateRequest}
              />
              
              {/* Recent Requests */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Richieste Recenti</CardTitle>
                  <CardDescription>Le tue ultime richieste di ferie</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {requests.slice(0, 5).map((request: any) => {
                      const config = leaveService.getStatusConfig(request.status);
                      return (
                        <div key={request.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                          <div>
                            <p className="font-medium">
                              {leaveService.formatDateRange(request.startDate, request.endDate)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {leaveService.getLeaveTypeConfig(request.leaveType).label} • {request.totalDays} giorni
                            </p>
                          </div>
                          <Badge 
                            variant="outline"
                            style={{
                              backgroundColor: config.bgColor,
                              color: config.color,
                              borderColor: config.color
                            }}
                          >
                            {config.label}
                          </Badge>
                        </div>
                      );
                    })}
                    {requests.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Nessuna richiesta recente
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Policies Info */}
              {policies && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Policy Aziendali</CardTitle>
                    <CardDescription>Regole e limiti per le richieste</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between p-2 rounded bg-gray-50">
                      <span className="text-sm">Giorni di preavviso</span>
                      <span className="text-sm font-medium">{policies.minimumAdvanceDays} giorni</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-gray-50">
                      <span className="text-sm">Giorni consecutivi max</span>
                      <span className="text-sm font-medium">{policies.maximumConsecutiveDays} giorni</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-gray-50">
                      <span className="text-sm">Giorni riportabili</span>
                      <span className="text-sm font-medium">{policies.carryoverDays} giorni</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-gray-50">
                      <span className="text-sm">Certificato malattia dopo</span>
                      <span className="text-sm font-medium">{policies.sickDaysRequireCertificate} giorni</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Upcoming Team Absences */}
              {teamCalendar.length > 0 && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle>Assenze Team</CardTitle>
                    <CardDescription>Prossime assenze nel tuo team</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {teamCalendar.slice(0, 5).map((event: any) => (
                        <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                          <div>
                            <p className="font-medium">{event.userName}</p>
                            <p className="text-sm text-gray-500">
                              {leaveService.formatDateRange(event.startDate, event.endDate)}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {leaveService.getLeaveTypeConfig(event.leaveType).label}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </DashboardTemplate>
        );
        
      case 'requests':
        return (
          <ListPageTemplate
            title="Le Mie Richieste"
            subtitle="Gestisci le tue richieste di ferie e permessi"
            data={requests}
            columns={requestsColumns}
            isLoading={requestsLoading}
            searchPlaceholder="Cerca richieste..."
            filters={[
              {
                id: 'status',
                label: 'Stato',
                type: 'select',
                options: [
                  { value: 'all', label: 'Tutti' },
                  { value: 'pending', label: 'In attesa' },
                  { value: 'approved', label: 'Approvate' },
                  { value: 'rejected', label: 'Rifiutate' },
                ],
                value: statusFilter,
                onChange: (value: string) => setStatusFilter(value as any),
              },
              {
                id: 'type',
                label: 'Tipo',
                type: 'select',
                options: [
                  { value: 'all', label: 'Tutti' },
                  { value: 'vacation', label: 'Ferie' },
                  { value: 'sick', label: 'Malattia' },
                  { value: 'personal', label: 'Personale' },
                  { value: 'other', label: 'Altro' },
                ],
                value: typeFilter,
                onChange: (value: string) => setTypeFilter(value as any),
              },
            ]}
            itemActions={(request) => {
              const actions = [];
              
              if (request.status === 'draft' || request.status === 'pending') {
                actions.push({
                  id: 'edit',
                  label: 'Modifica',
                  onClick: () => handleEditRequest(request),
                });
                actions.push({
                  id: 'delete',
                  label: 'Elimina',
                  onClick: () => handleDeleteRequest(request),
                });
              }
              
              if (request.status === 'approved') {
                const startDate = new Date(request.startDate);
                const today = new Date();
                if (startDate > today) {
                  actions.push({
                    id: 'cancel',
                    label: 'Annulla',
                    onClick: () => {
                      if (confirm('Sei sicuro di voler annullare questa richiesta approvata?')) {
                        updateRequest.mutate({ 
                          id: request.id, 
                          updates: { status: 'cancelled' } 
                        });
                      }
                    },
                  });
                }
              }
              
              return actions;
            }}
            primaryAction={{
              label: 'Nuova Richiesta',
              icon: <Plus className="h-4 w-4" />,
              onClick: handleCreateRequest,
            }}
            emptyStateProps={{
              title: 'Nessuna richiesta',
              description: 'Non hai ancora fatto richieste di ferie',
              icon: <Calendar className="h-8 w-8 text-gray-400" />,
              primaryAction: {
                label: 'Crea la prima richiesta',
                onClick: handleCreateRequest,
              },
            }}
          />
        );
        
      case 'approval':
        return isManager ? (
          <ListPageTemplate
            title="Coda di Approvazione"
            subtitle={`${pendingCount} richieste in attesa${urgentCount > 0 ? ` • ${urgentCount} urgenti` : ''}`}
            data={approvalRequests}
            columns={[
              {
                key: 'employee',
                label: 'Dipendente',
                render: (request: any) => request.userName || 'N/A',
              },
              ...requestsColumns,
            ]}
            isLoading={false}
            itemActions={(request) => [
              {
                id: 'approve',
                label: 'Approva',
                onClick: () => handleApproveRequest(request),
              },
              {
                id: 'reject',
                label: 'Rifiuta',
                onClick: () => handleRejectRequest(request),
              },
              {
                id: 'view',
                label: 'Dettagli',
                onClick: () => handleEditRequest(request),
              },
            ]}
            emptyStateProps={{
              title: 'Nessuna richiesta in attesa',
              description: 'Non ci sono richieste da approvare',
              icon: <CheckCircle className="h-8 w-8 text-gray-400" />,
            }}
          />
        ) : (
          <Card className="glass-card">
            <CardContent className="py-8">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Non hai i permessi per approvare le richieste.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        );
        
      case 'calendar':
        return (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Calendario Team</CardTitle>
              <CardDescription>Visualizzazione delle assenze del team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamCalendar.length > 0 ? (
                  <div className="grid gap-3">
                    {teamCalendar.map((event: any) => {
                      const config = leaveService.getLeaveTypeConfig(event.leaveType);
                      return (
                        <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                              <Users className="h-6 w-6 text-gray-600" />
                            </div>
                            <div>
                              <p className="font-medium">{event.userName}</p>
                              <p className="text-sm text-gray-500">
                                {leaveService.formatDateRange(event.startDate, event.endDate)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline"
                              style={{ 
                                backgroundColor: `${config.color}20`,
                                color: config.color,
                                borderColor: config.color 
                              }}
                            >
                              {config.icon} {config.label}
                            </Badge>
                            {event.status === 'approved' && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nessuna assenza programmata</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="p-6 space-y-6" data-testid="leave-management-page">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
              Gestione Ferie
            </h1>
            <p className="text-gray-600 mt-1">
              Richieste, approvazioni e calendario assenze
            </p>
          </div>
        </div>
        
        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="requests">Le Mie Richieste</TabsTrigger>
            {isManager && (
              <TabsTrigger value="approval">
                Approvazioni
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="calendar">Calendario</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-6">
            {renderContent()}
          </TabsContent>
        </Tabs>
        
        {/* Request Modal */}
        {showRequestModal && (
          <LeaveRequestModal
            request={selectedRequest}
            open={showRequestModal}
            onClose={() => {
              setShowRequestModal(false);
              setSelectedRequest(null);
            }}
            onSave={(data) => {
              if (selectedRequest) {
                updateRequest.mutate({ id: selectedRequest.id, updates: data });
              } else {
                createRequest.mutate(data);
              }
              setShowRequestModal(false);
              setSelectedRequest(null);
            }}
          />
        )}
      </div>
    </Layout>
  );
}