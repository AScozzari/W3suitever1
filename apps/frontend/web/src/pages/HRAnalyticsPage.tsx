// HR Analytics Dashboard - Comprehensive analytics for HR management
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '@/components/Layout';
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
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useStores } from '@/hooks/useStores';

// Analytics Components
import KPICardsGrid from '@/components/Analytics/KPICardsGrid';
import AttendanceAnalytics from '@/components/Analytics/AttendanceAnalytics';
import LeaveAnalytics from '@/components/Analytics/LeaveAnalytics';
import LaborCostAnalytics from '@/components/Analytics/LaborCostAnalytics';
import ShiftAnalytics from '@/components/Analytics/ShiftAnalytics';
import EmployeeDemographics from '@/components/Analytics/EmployeeDemographics';
import ComplianceDashboard from '@/components/Analytics/ComplianceDashboard';

// Analytics Hooks
import {
  useDashboardMetrics,
  useAttendanceAnalytics,
  useLeaveAnalytics,
  useLaborCostAnalytics,
  useShiftAnalytics,
  useEmployeeDemographics,
  useComplianceMetrics,
  useExportDashboard,
} from '@/hooks/useHRAnalytics';

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

  // Fetch analytics data
  const { metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useDashboardMetrics({
    storeId: selectedStore !== 'all' ? selectedStore : undefined,
    department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
    startDate: format(dateRange.start, 'yyyy-MM-dd'),
    endDate: format(dateRange.end, 'yyyy-MM-dd'),
  });

  const { data: attendanceData, refetch: refetchAttendance } = useAttendanceAnalytics({
    storeId: selectedStore !== 'all' ? selectedStore : undefined,
    startDate: format(dateRange.start, 'yyyy-MM-dd'),
    endDate: format(dateRange.end, 'yyyy-MM-dd'),
  });

  const { data: leaveData, refetch: refetchLeave } = useLeaveAnalytics({
    storeId: selectedStore !== 'all' ? selectedStore : undefined,
    startDate: format(dateRange.start, 'yyyy-MM-dd'),
    endDate: format(dateRange.end, 'yyyy-MM-dd'),
  });

  const { data: laborCostData, refetch: refetchLabor } = useLaborCostAnalytics({
    storeId: selectedStore !== 'all' ? selectedStore : undefined,
    department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
    startDate: format(dateRange.start, 'yyyy-MM-dd'),
    endDate: format(dateRange.end, 'yyyy-MM-dd'),
  });

  const { data: shiftData, refetch: refetchShifts } = useShiftAnalytics({
    storeId: selectedStore !== 'all' ? selectedStore : undefined,
    startDate: format(dateRange.start, 'yyyy-MM-dd'),
    endDate: format(dateRange.end, 'yyyy-MM-dd'),
  });

  const { data: demographicsData } = useEmployeeDemographics({
    storeId: selectedStore !== 'all' ? selectedStore : undefined,
    department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
  });

  const { data: complianceData, refetch: refetchCompliance } = useComplianceMetrics({
    storeId: selectedStore !== 'all' ? selectedStore : undefined,
    startDate: format(dateRange.start, 'yyyy-MM-dd'),
    endDate: format(dateRange.end, 'yyyy-MM-dd'),
  });

  const exportDashboard = useExportDashboard();

  // Auto-refresh
  useEffect(() => {
    if (!isAutoRefresh) return;

    const interval = setInterval(() => {
      refetchMetrics();
      refetchAttendance();
      refetchLeave();
      refetchLabor();
      refetchShifts();
      refetchCompliance();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [isAutoRefresh, refreshInterval, refetchMetrics, refetchAttendance, refetchLeave, refetchLabor, refetchShifts, refetchCompliance]);

  // Handle manual refresh
  const handleRefresh = () => {
    refetchMetrics();
    refetchAttendance();
    refetchLeave();
    refetchLabor();
    refetchShifts();
    refetchCompliance();
    toast({
      title: "Dashboard aggiornato",
      description: "Tutti i dati sono stati aggiornati",
    });
  };

  // Handle export
  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      await exportDashboard.mutateAsync({
        format,
        view: activeView,
        filters: {
          storeId: selectedStore !== 'all' ? selectedStore : undefined,
          department: selectedDepartment !== 'all' ? selectedDepartment : undefined,
          startDate: format(dateRange.start, 'yyyy-MM-dd'),
          endDate: format(dateRange.end, 'yyyy-MM-dd'),
        },
      });
      toast({
        title: "Export completato",
        description: `Dashboard esportato in formato ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Errore nell'export",
        description: "Si è verificato un errore durante l'export",
        variant: "destructive",
      });
    }
  };

  // Check permissions
  const canViewFullAnalytics = ['HR_MANAGER', 'ADMIN', 'EXECUTIVE'].includes(user?.role || '');
  const canExport = ['HR_MANAGER', 'ADMIN', 'EXECUTIVE', 'TEAM_LEADER'].includes(user?.role || '');

  if (!canViewFullAnalytics) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Non hai i permessi necessari per visualizzare il dashboard HR Analytics completo.
            Contatta l'amministratore per maggiori informazioni.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto" data-testid="hr-analytics-page">
        {/* Header with Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-md rounded-xl shadow-xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent mb-2">
                HR Analytics Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Analisi completa delle metriche HR e workforce management
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Auto-refresh toggle */}
              <Button
                variant={isAutoRefresh ? "default" : "outline"}
                size="sm"
                className={isAutoRefresh ? "bg-gradient-to-r from-orange-500 to-purple-600" : "bg-white/60 backdrop-blur border-white/30"}
                onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                data-testid="button-auto-refresh"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isAutoRefresh && "animate-spin")} />
                {isAutoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
              </Button>

              {/* Manual refresh */}
              <Button
                variant="outline"
                size="sm"
                className="bg-white/60 backdrop-blur border-white/30"
                onClick={handleRefresh}
                data-testid="button-refresh"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Aggiorna
              </Button>

              {/* Export menu */}
              {canExport && (
                <div className="relative group">
                  <Button
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                    data-testid="button-export"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Esporta
                  </Button>
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <button
                      onClick={() => handleExport('pdf')}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                      data-testid="export-pdf"
                    >
                      <FileText className="inline h-4 w-4 mr-2" />
                      Esporta PDF
                    </button>
                    <button
                      onClick={() => handleExport('excel')}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                      data-testid="export-excel"
                    >
                      <FileText className="inline h-4 w-4 mr-2" />
                      Esporta Excel
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                      data-testid="export-csv"
                    >
                      <FileText className="inline h-4 w-4 mr-2" />
                      Esporta CSV
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-700">
            {/* Period selector */}
            <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as PeriodType)}>
              <SelectTrigger className="w-[150px]" data-testid="select-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Giornaliero</SelectItem>
                <SelectItem value="week">Settimanale</SelectItem>
                <SelectItem value="month">Mensile</SelectItem>
                <SelectItem value="quarter">Trimestrale</SelectItem>
                <SelectItem value="year">Annuale</SelectItem>
              </SelectContent>
            </Select>

            {/* Store filter */}
            <Select value={selectedStore} onValueChange={setSelectedStore}>
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
            </Select>

            {/* Department filter */}
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[200px]" data-testid="select-department">
                <SelectValue placeholder="Tutti i dipartimenti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i dipartimenti</SelectItem>
                <SelectItem value="sales">Vendite</SelectItem>
                <SelectItem value="warehouse">Magazzino</SelectItem>
                <SelectItem value="administration">Amministrazione</SelectItem>
                <SelectItem value="management">Management</SelectItem>
              </SelectContent>
            </Select>

            {/* Date range display */}
            <div className="ml-auto flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>
                {format(dateRange.start, 'dd MMM yyyy', { locale: it })} - {format(dateRange.end, 'dd MMM yyyy', { locale: it })}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ViewType)} className="space-y-6">
          <TabsList className="grid grid-cols-7 w-full max-w-[800px] mx-auto">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <BarChart3 className="h-4 w-4 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="attendance" data-testid="tab-attendance">
              <Clock className="h-4 w-4 mr-1" />
              Presenze
            </TabsTrigger>
            <TabsTrigger value="leave" data-testid="tab-leave">
              <Calendar className="h-4 w-4 mr-1" />
              Ferie
            </TabsTrigger>
            <TabsTrigger value="costs" data-testid="tab-costs">
              <DollarSign className="h-4 w-4 mr-1" />
              Costi
            </TabsTrigger>
            <TabsTrigger value="shifts" data-testid="tab-shifts">
              <Users className="h-4 w-4 mr-1" />
              Turni
            </TabsTrigger>
            <TabsTrigger value="demographics" data-testid="tab-demographics">
              <PieChart className="h-4 w-4 mr-1" />
              Demografia
            </TabsTrigger>
            <TabsTrigger value="compliance" data-testid="tab-compliance">
              <Shield className="h-4 w-4 mr-1" />
              Compliance
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <KPICardsGrid
              metrics={metrics}
              isLoading={metricsLoading}
              period={selectedPeriod}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AttendanceAnalytics
                data={attendanceData}
                compact={true}
              />
              <LaborCostAnalytics
                data={laborCostData}
                compact={true}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ShiftAnalytics
                data={shiftData}
                compact={true}
              />
              <ComplianceDashboard
                data={complianceData}
                compact={true}
              />
            </div>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <AttendanceAnalytics
              data={attendanceData}
              period={selectedPeriod}
              storeId={selectedStore !== 'all' ? selectedStore : undefined}
            />
          </TabsContent>

          {/* Leave Tab */}
          <TabsContent value="leave">
            <LeaveAnalytics
              data={leaveData}
              period={selectedPeriod}
              storeId={selectedStore !== 'all' ? selectedStore : undefined}
            />
          </TabsContent>

          {/* Costs Tab */}
          <TabsContent value="costs">
            <LaborCostAnalytics
              data={laborCostData}
              period={selectedPeriod}
              storeId={selectedStore !== 'all' ? selectedStore : undefined}
              department={selectedDepartment !== 'all' ? selectedDepartment : undefined}
            />
          </TabsContent>

          {/* Shifts Tab */}
          <TabsContent value="shifts">
            <ShiftAnalytics
              data={shiftData}
              period={selectedPeriod}
              storeId={selectedStore !== 'all' ? selectedStore : undefined}
            />
          </TabsContent>

          {/* Demographics Tab */}
          <TabsContent value="demographics">
            <EmployeeDemographics
              data={demographicsData}
              storeId={selectedStore !== 'all' ? selectedStore : undefined}
              department={selectedDepartment !== 'all' ? selectedDepartment : undefined}
            />
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance">
            <ComplianceDashboard
              data={complianceData}
              period={selectedPeriod}
              storeId={selectedStore !== 'all' ? selectedStore : undefined}
            />
          </TabsContent>
        </Tabs>

        {/* Real-time status indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed bottom-6 right-6"
        >
          <div className="flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-white/20">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isAutoRefresh ? "bg-green-500 animate-pulse" : "bg-gray-400"
            )} />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {isAutoRefresh ? "Live" : "Manual"}
            </span>
            {isAutoRefresh && (
              <span className="text-xs text-gray-500 dark:text-gray-500">
                {refreshInterval / 1000}s
              </span>
            )}
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}