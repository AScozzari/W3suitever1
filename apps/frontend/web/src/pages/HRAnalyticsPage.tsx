// HR Analytics Page - Enterprise HR Management System
import { useState, useMemo, useEffect } from 'react';
import { DashboardTemplate } from '@w3suite/frontend-kit/templates';
import { Column } from '@w3suite/frontend-kit/components/blocks/DataTable';
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  Clock,
  DollarSign,
  AlertTriangle,
  Download,
  RefreshCw,
  Filter,
  Settings,
  FileText,
  Shield,
  Target,
  Activity,
  PieChart,
  Zap,
  CheckCircle,
  UserCheck,
  Briefcase,
  GraduationCap,
  Award,
  Building2,
  HeartHandshake,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { it } from 'date-fns/locale';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useStores } from '@/hooks/useStores';
import {
  useDashboardMetrics,
  useAttendanceAnalytics,
  useLeaveAnalytics,
  useLaborCostAnalytics,
  useShiftAnalytics,
  useEmployeeDemographics,
  useComplianceMetrics,
  useExportDashboard,
  useCurrentAttendance,
  useActiveShifts,
  useUpcomingEvents,
  useHistoricalTrends,
  usePredictions,
  useAnomalies,
  useBenchmarks,
  useRefreshAnalytics,
} from '@/hooks/useHRAnalytics';
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
  color?: string;
}

type PeriodType = 'day' | 'week' | 'month' | 'quarter' | 'year';
type ViewType = 'overview' | 'attendance' | 'leave' | 'costs' | 'shifts' | 'demographics' | 'compliance';

export default function HRAnalyticsPage() {
  const [currentModule, setCurrentModule] = useState('hr-analytics');
  const { toast } = useToast();
  const { user } = useAuth();
  const { stores, isLoading: storesLoading } = useStores();
  
  // State
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('month');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [activeView, setActiveView] = useState<ViewType>('overview');
  const [isAutoRefresh, setIsAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return {
      start: startOfMonth(now),
      end: endOfMonth(now),
    };
  });

  // Calculate date range based on period
  useEffect(() => {
    const now = new Date();
    let start: Date, end: Date;

    switch (selectedPeriod) {
      case 'day':
        start = now;
        end = now;
        break;
      case 'week':
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'quarter':
        const quarter = Math.floor((now.getMonth() / 3));
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        break;
      case 'year':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
    }

    setDateRange({ start, end });
  }, [selectedPeriod]);

  // Check permissions
  const userRole = user?.role || '';
  const canViewFullAnalytics = ['HR_MANAGER', 'ADMIN', 'EXECUTIVE'].includes(userRole);
  const canExport = ['HR_MANAGER', 'ADMIN', 'EXECUTIVE', 'TEAM_LEADER'].includes(userRole);

  // Build filters
  const filters = {
    storeId: selectedStore !== 'all' ? selectedStore : undefined,
    departmentId: selectedDepartment !== 'all' ? selectedDepartment : undefined,
    period: selectedPeriod,
  };

  // Hooks for analytics data
  const { data: dashboardMetrics, isLoading: metricsLoading } = useDashboardMetrics(selectedPeriod, filters);
  const { data: attendance, isLoading: attendanceLoading } = useAttendanceAnalytics(selectedPeriod, filters.storeId);
  const { data: leaveData, isLoading: leaveLoading } = useLeaveAnalytics(selectedPeriod, filters.departmentId);
  const { data: laborCosts, isLoading: costsLoading } = useLaborCostAnalytics(selectedPeriod, filters);
  const { data: shiftData, isLoading: shiftsLoading } = useShiftAnalytics(selectedPeriod, filters.storeId);
  const { data: demographics, isLoading: demographicsLoading } = useEmployeeDemographics(filters);
  const { data: compliance, isLoading: complianceLoading } = useComplianceMetrics();
  const { data: currentAttendance } = useCurrentAttendance(filters.storeId);
  const { data: activeShifts } = useActiveShifts(filters.storeId);
  const { data: upcomingEvents } = useUpcomingEvents(7);
  const exportDashboard = useExportDashboard();
  const refreshAnalytics = useRefreshAnalytics();

  // Auto-refresh
  useEffect(() => {
    if (!isAutoRefresh) return;

    const interval = setInterval(() => {
      refreshAnalytics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [isAutoRefresh, refreshInterval, refreshAnalytics]);

  // Prepare metrics for dashboard
  const metrics: MetricCard[] = useMemo(() => {
    const baseMetrics = [
      {
        id: 'total-employees',
        title: 'Dipendenti Totali',
        value: dashboardMetrics?.totalEmployees || 0,
        description: `${dashboardMetrics?.activeEmployees || 0} attivi`,
        icon: <Users className="h-4 w-4" />,
        color: 'text-blue-600',
      },
      {
        id: 'attendance-rate',
        title: 'Tasso Presenza',
        value: `${attendance?.attendanceRate || 0}%`,
        description: `${currentAttendance?.presentToday || 0} presenti oggi`,
        trend: attendance?.attendanceRate < 90 ? { value: attendance?.attendanceRate - 90, label: 'Sotto target' } : undefined,
        icon: <UserCheck className="h-4 w-4" />,
        color: 'text-green-600',
      },
      {
        id: 'labor-costs',
        title: 'Costi del Lavoro',
        value: `€${(laborCosts?.totalCost || 0).toFixed(0)}`,
        description: `${laborCosts?.costPerEmployee ? `€${laborCosts.costPerEmployee.toFixed(0)}/dipendente` : ''}`,
        icon: <DollarSign className="h-4 w-4" />,
        color: 'text-purple-600',
      },
      {
        id: 'compliance-score',
        title: 'Compliance Score',
        value: `${compliance?.overallScore || 0}%`,
        description: compliance?.criticalIssues > 0 ? `${compliance.criticalIssues} problemi critici` : 'Tutto in regola',
        trend: compliance?.criticalIssues > 0 ? { value: -100, label: 'Richiede attenzione' } : undefined,
        icon: <Shield className="h-4 w-4" />,
        color: compliance?.overallScore >= 90 ? 'text-green-600' : 'text-orange-600',
      },
    ];

    // Add view-specific metrics
    switch (activeView) {
      case 'attendance':
        return [
          ...baseMetrics.filter(m => ['attendance-rate', 'total-employees'].includes(m.id)),
          {
            id: 'absent-today',
            title: 'Assenti Oggi',
            value: currentAttendance?.absentToday || 0,
            description: `${currentAttendance?.onLeave || 0} in ferie`,
            icon: <AlertTriangle className="h-4 w-4" />,
            color: 'text-red-600',
          },
          {
            id: 'overtime-hours',
            title: 'Ore Straordinario',
            value: attendance?.overtimeHours || 0,
            description: 'Questo periodo',
            icon: <Clock className="h-4 w-4" />,
            color: 'text-orange-600',
          },
        ];
      case 'leave':
        return [
          {
            id: 'pending-requests',
            title: 'Richieste in Attesa',
            value: leaveData?.pendingRequests || 0,
            description: 'Da approvare',
            icon: <Clock className="h-4 w-4" />,
            color: 'text-orange-600',
          },
          {
            id: 'approved-leave',
            title: 'Ferie Approvate',
            value: leaveData?.approvedDays || 0,
            description: 'Giorni totali',
            icon: <CheckCircle className="h-4 w-4" />,
            color: 'text-green-600',
          },
          {
            id: 'avg-leave-days',
            title: 'Media Giorni',
            value: leaveData?.avgDaysPerRequest || 0,
            description: 'Per richiesta',
            icon: <Calendar className="h-4 w-4" />,
            color: 'text-blue-600',
          },
          {
            id: 'utilization-rate',
            title: 'Utilizzo Ferie',
            value: `${leaveData?.utilizationRate || 0}%`,
            description: 'Del totale disponibile',
            icon: <TrendingUp className="h-4 w-4" />,
            color: 'text-purple-600',
          },
        ];
      case 'shifts':
        return [
          {
            id: 'active-shifts',
            title: 'Turni Attivi',
            value: activeShifts?.count || 0,
            description: 'In corso ora',
            icon: <Activity className="h-4 w-4" />,
            color: 'text-green-600',
          },
          {
            id: 'coverage-rate',
            title: 'Copertura',
            value: `${shiftData?.coverageRate || 0}%`,
            description: shiftData?.understaffedShifts > 0 ? `${shiftData.understaffedShifts} turni scoperti` : 'Completa',
            icon: <Users className="h-4 w-4" />,
            color: 'text-blue-600',
          },
          {
            id: 'shift-hours',
            title: 'Ore Totali',
            value: shiftData?.totalHours || 0,
            description: 'Questo periodo',
            icon: <Clock className="h-4 w-4" />,
            color: 'text-purple-600',
          },
          {
            id: 'shift-efficiency',
            title: 'Efficienza',
            value: `${shiftData?.efficiency || 0}%`,
            description: 'Utilizzo risorse',
            icon: <Target className="h-4 w-4" />,
            color: 'text-orange-600',
          },
        ];
      default:
        return baseMetrics;
    }
  }, [activeView, dashboardMetrics, attendance, currentAttendance, compliance, leaveData, activeShifts, shiftData]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['hr-analytics'] }),
    ]);
    setIsRefreshing(false);
    toast({
      title: "Dashboard aggiornato",
      description: "Tutti i dati sono stati aggiornati",
    });
  };

  // Handle export
  const handleExport = async (exportFormat: 'pdf' | 'excel' | 'csv' = 'pdf') => {
    exportDashboard.mutate({
      format: exportFormat,
      period: selectedPeriod,
      filters,
    });
  };

  // Quick actions for dashboard
  const quickActions = [
    {
      label: 'Auto-Refresh',
      icon: isAutoRefresh ? <Zap className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />,
      onClick: () => setIsAutoRefresh(!isAutoRefresh),
      variant: isAutoRefresh ? 'default' as const : 'outline' as const,
    },
    {
      label: 'Export PDF',
      icon: <Download className="h-4 w-4" />,
      onClick: () => handleExport('pdf'),
      variant: 'outline' as const,
      disabled: !canExport,
    },
  ];

  // Render content based on view
  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance Summary */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-green-600" />
                  Presenze
                </CardTitle>
                <CardDescription>Riepilogo presenze in tempo reale</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Presenti</span>
                    <span className="font-medium">{currentAttendance?.presentToday || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Assenti</span>
                    <span className="font-medium">{currentAttendance?.absentToday || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">In ferie</span>
                    <span className="font-medium">{currentAttendance?.onLeave || 0}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Tasso presenza</span>
                    <span className="text-lg font-bold">{attendance?.attendanceRate || 0}%</span>
                  </div>
                  <Progress value={attendance?.attendanceRate || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Labor Costs */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                  Costi del Lavoro
                </CardTitle>
                <CardDescription>Analisi costi {selectedPeriod === 'month' ? 'mensili' : selectedPeriod === 'year' ? 'annuali' : 'del periodo'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Costo totale</span>
                    <span className="font-medium">€{(laborCosts?.totalCost || 0).toFixed(0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Costo medio/dipendente</span>
                    <span className="font-medium">€{(laborCosts?.costPerEmployee || 0).toFixed(0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Straordinari</span>
                    <span className="font-medium">€{(laborCosts?.overtimeCost || 0).toFixed(0)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Trend vs periodo precedente</span>
                    <Badge variant={laborCosts?.trend > 0 ? 'destructive' : 'default'}>
                      {laborCosts?.trend > 0 ? '+' : ''}{laborCosts?.trend || 0}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compliance Status */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Stato Compliance
                </CardTitle>
                <CardDescription>Conformità normativa e contrattuale</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Documenti</p>
                      <p className="text-xl font-bold">{compliance?.documentCompliance || 0}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Contratti</p>
                      <p className="text-xl font-bold">{compliance?.contractCompliance || 0}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Formazione</p>
                      <p className="text-xl font-bold">{compliance?.trainingCompliance || 0}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Orario</p>
                      <p className="text-xl font-bold">{compliance?.workingTimeCompliance || 0}%</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Score totale</span>
                      <span className="font-bold">{compliance?.overallScore || 0}%</span>
                    </div>
                    <Progress value={compliance?.overallScore || 0} className="h-2" />
                  </div>
                  {compliance?.criticalIssues > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Attenzione</AlertTitle>
                      <AlertDescription>
                        {compliance.criticalIssues} problemi critici richiedono intervento
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Employee Demographics */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Demografia Dipendenti
                </CardTitle>
                <CardDescription>Composizione workforce</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Genere</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">M: {demographics?.genderDistribution?.male || 0}%</Badge>
                        <Badge variant="outline">F: {demographics?.genderDistribution?.female || 0}%</Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Età media</p>
                      <p className="text-xl font-bold">{demographics?.avgAge || 0} anni</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Tipologia contratto</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Indeterminato</span>
                        <span className="text-sm font-medium">{demographics?.contractTypes?.permanent || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Determinato</span>
                        <span className="text-sm font-medium">{demographics?.contractTypes?.temporary || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Part-time</span>
                        <span className="text-sm font-medium">{demographics?.contractTypes?.partTime || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
        
      case 'attendance':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card col-span-2">
              <CardHeader>
                <CardTitle>Trend Presenze</CardTitle>
                <CardDescription>Andamento presenze nel periodo</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Chart would be rendered here */}
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <BarChart3 className="h-12 w-12" />
                  <span className="ml-2">Grafico presenze</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Additional attendance cards */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Dettaglio Assenze</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Malattia</span>
                    <span className="text-sm font-medium">{attendance?.absenceByType?.sick || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Ferie</span>
                    <span className="text-sm font-medium">{attendance?.absenceByType?.vacation || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Permessi</span>
                    <span className="text-sm font-medium">{attendance?.absenceByType?.personal || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Altri</span>
                    <span className="text-sm font-medium">{attendance?.absenceByType?.other || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Straordinari</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Ore totali</span>
                    <span className="text-sm font-medium">{attendance?.overtimeHours || 0}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Dipendenti coinvolti</span>
                    <span className="text-sm font-medium">{attendance?.overtimeEmployees || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Media per dipendente</span>
                    <span className="text-sm font-medium">{attendance?.avgOvertimePerEmployee || 0}h</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
        
      default:
        return (
          <div className="text-center py-12">
            <p className="text-gray-500">Seleziona una vista dal menu per visualizzare i dettagli</p>
          </div>
        );
    }
  };

  if (!canViewFullAnalytics) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <div className="container mx-auto p-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Accesso limitato</AlertTitle>
            <AlertDescription>
              Non hai i permessi necessari per visualizzare il dashboard HR Analytics completo.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="p-6 space-y-6" data-testid="hr-analytics-page">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
              HR Analytics Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Analisi completa delle risorse umane
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isAutoRefresh ? 'default' : 'outline'}>
              {isAutoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </Badge>
          </div>
        </div>
        
        {/* Tabs Navigation */}
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ViewType)}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="attendance">Presenze</TabsTrigger>
            <TabsTrigger value="leave">Ferie</TabsTrigger>
            <TabsTrigger value="costs">Costi</TabsTrigger>
            <TabsTrigger value="shifts">Turni</TabsTrigger>
            <TabsTrigger value="demographics">Demografia</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeView} className="mt-6">
            <DashboardTemplate
              title={`Analytics ${activeView === 'overview' ? 'Generale' : activeView.charAt(0).toUpperCase() + activeView.slice(1)}`}
              subtitle={`Periodo: ${format(dateRange.start, 'dd MMM', { locale: it })} - ${format(dateRange.end, 'dd MMM yyyy', { locale: it })}`}
              metrics={metrics}
              metricsLoading={metricsLoading || attendanceLoading || costsLoading || complianceLoading}
              quickActions={quickActions}
              showFilters={true}
              filters={[
                <Select key="period" value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as PeriodType)}>
                  <SelectTrigger className="w-[150px]" data-testid="select-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Giorno</SelectItem>
                    <SelectItem value="week">Settimana</SelectItem>
                    <SelectItem value="month">Mese</SelectItem>
                    <SelectItem value="quarter">Trimestre</SelectItem>
                    <SelectItem value="year">Anno</SelectItem>
                  </SelectContent>
                </Select>,
                <Select key="store" value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger className="w-[200px]" data-testid="select-store">
                    <SelectValue placeholder="Tutti i negozi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i negozi</SelectItem>
                    {stores?.map(store => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>,
                <Select key="department" value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-[200px]" data-testid="select-department">
                    <SelectValue placeholder="Tutti i reparti" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i reparti</SelectItem>
                    <SelectItem value="sales">Vendite</SelectItem>
                    <SelectItem value="support">Assistenza</SelectItem>
                    <SelectItem value="tech">Tecnico</SelectItem>
                    <SelectItem value="admin">Amministrazione</SelectItem>
                  </SelectContent>
                </Select>,
              ]}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              onExport={() => handleExport('pdf')}
              lastUpdated={new Date()}
            >
              {renderContent()}
            </DashboardTemplate>
          </TabsContent>
        </Tabs>
        
        {/* Upcoming Events Widget */}
        {upcomingEvents && upcomingEvents.length > 0 && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Eventi Imminenti
              </CardTitle>
              <CardDescription>Prossimi 7 giorni</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.slice(0, 5).map((event: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-gray-500">{format(new Date(event.date), 'dd/MM/yyyy')}</p>
                    </div>
                    <Badge variant="outline">{event.type}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}