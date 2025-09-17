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
  CheckCircle,
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

// Import UI components and utilities
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

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

  // Mock data for display - replace with real API calls when available
  const [isLoading, setIsLoading] = useState(false);
  const mockMetrics = {
    totalEmployees: 156,
    presentToday: 142,
    absentToday: 6,
    onLeave: 8,
    attendanceRate: 91.0,
    overtimeHours: 234,
    pendingApprovals: 12,
    complianceScore: 94.2
  };

  // Auto-refresh simulation
  useEffect(() => {
    if (!isAutoRefresh) return;

    const interval = setInterval(() => {
      // Simulate refresh - replace with real API calls when available
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 1000);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [isAutoRefresh, refreshInterval]);

  // Handle manual refresh
  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Dashboard aggiornato",
        description: "Tutti i dati sono stati aggiornati",
      });
    }, 1000);
  };

  // Handle export (mock implementation)
  const handleExport = async (exportFormat: 'pdf' | 'excel' | 'csv') => {
    try {
      // Simulate export - replace with real implementation when available
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Export completato",
        description: `Dashboard esportato in formato ${exportFormat.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Errore nell'export",
        description: "Si è verificato un errore durante l'export",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check permissions
  const userRole = (user as any)?.role || '';
  const canViewFullAnalytics = ['HR_MANAGER', 'ADMIN', 'EXECUTIVE'].includes(userRole);
  const canExport = ['HR_MANAGER', 'ADMIN', 'EXECUTIVE', 'TEAM_LEADER'].includes(userRole);

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
        {/* Header with Enhanced WindTre Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/50 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-white/20 hover:bg-white/60 transition-all duration-300"
          data-testid="analytics-header"
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
                  <div className="absolute right-0 mt-2 w-48 bg-white/90 backdrop-blur-sm rounded-md shadow-lg border border-white/20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <button
                      onClick={() => handleExport('pdf')}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-white/60 backdrop-blur transition-all duration-200 first:rounded-t-md text-gray-700 hover:text-orange-600"
                      data-testid="export-pdf"
                    >
                      <FileText className="inline h-4 w-4 mr-2" />
                      Esporta PDF
                    </button>
                    <button
                      onClick={() => handleExport('excel')}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-white/60 backdrop-blur transition-all duration-200 text-gray-700 hover:text-orange-600"
                      data-testid="export-excel"
                    >
                      <FileText className="inline h-4 w-4 mr-2" />
                      Esporta Excel
                    </button>
                    <button
                      onClick={() => handleExport('csv')}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-white/60 backdrop-blur transition-all duration-200 last:rounded-b-md text-gray-700 hover:text-orange-600"
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

          {/* Enhanced Filters with Consistent Glassmorphism */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-white/30 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/40 transition-all duration-300" data-testid="analytics-filters">
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
                {stores?.map((store: any) => (
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

            {/* Date range display with enhanced styling */}
            <div className="ml-auto flex items-center gap-2 text-sm text-gray-700 font-medium px-3 py-2 bg-white/40 backdrop-blur rounded-lg border border-white/20">
              <Calendar className="h-4 w-4 text-orange-500" />
              <span>
                {format(dateRange.start, 'dd MMM yyyy', { locale: it })} - {format(dateRange.end, 'dd MMM yyyy', { locale: it })}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Main Content with WindTre Styling */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ViewType)} className="space-y-6">
            <TabsList className="grid grid-cols-7 w-full max-w-[800px] mx-auto bg-white/50 backdrop-blur-sm border border-white/20 shadow-lg hover:bg-white/60 transition-all duration-300">
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

            {/* Overview Tab with Mock Analytics Content */}
            <TabsContent value="overview" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {/* KPI Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="kpi-grid">
                  <Card className="bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/60 transition-all duration-300">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-gray-900">{mockMetrics.totalEmployees}</div>
                          <div className="text-sm text-gray-600">Dipendenti Totali</div>
                        </div>
                        <Users className="h-8 w-8 text-orange-500 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/60 transition-all duration-300">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-gray-900">{mockMetrics.presentToday}</div>
                          <div className="text-sm text-gray-600">Presenti Oggi</div>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/60 transition-all duration-300">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-gray-900">{mockMetrics.attendanceRate}%</div>
                          <div className="text-sm text-gray-600">Tasso Presenza</div>
                        </div>
                        <TrendingUp className="h-8 w-8 text-purple-500 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/60 transition-all duration-300">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-gray-900">{mockMetrics.pendingApprovals}</div>
                          <div className="text-sm text-gray-600">Approvazioni Pendenti</div>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-orange-500 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
              
              <motion.div 
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {/* Attendance Overview */}
                <Card className="bg-white/50 backdrop-blur-sm border-white/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-orange-500" />
                      Analisi Presenze
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span>Tasso di presenza generale</span>
                        <span className="font-semibold">{mockMetrics.attendanceRate}%</span>
                      </div>
                      <Progress value={mockMetrics.attendanceRate} className="h-2" />
                      <div className="border-t border-white/20 pt-4 mt-4"></div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Presenti</div>
                          <div className="font-semibold text-green-600">{mockMetrics.presentToday}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Assenti</div>
                          <div className="font-semibold text-red-600">{mockMetrics.absentToday}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Labor Cost Overview */}
                <Card className="bg-white/50 backdrop-blur-sm border-white/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-500" />
                      Costi del Lavoro
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span>Ore straordinarie</span>
                        <span className="font-semibold">{mockMetrics.overtimeHours}h</span>
                      </div>
                      <Progress value={75} className="h-2" />
                      <div className="border-t border-white/20 pt-4 mt-4"></div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Budget utilizzato</div>
                          <div className="font-semibold text-orange-600">78%</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Efficienza</div>
                          <div className="font-semibold text-green-600">92%</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Other Tabs with Placeholder Content */}
            <TabsContent value="attendance">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-white/50 backdrop-blur-sm border-white/20 p-8 text-center">
                  <Clock className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Analisi Presenze Dettagliata</h3>
                  <p className="text-gray-600 mb-4">Dashboard completa delle presenze per periodo: {selectedPeriod}</p>
                  {isLoading ? <Skeleton className="h-32 w-full" /> : <div className="h-32 bg-gradient-to-r from-orange-100 to-purple-100 rounded-lg flex items-center justify-center text-gray-500">Grafici e metriche presenze</div>}
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="leave">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-white/50 backdrop-blur-sm border-white/20 p-8 text-center">
                  <Calendar className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Gestione Ferie e Permessi</h3>
                  <p className="text-gray-600 mb-4">Analisi completa delle richieste di ferie per dipartimento: {selectedDepartment === 'all' ? 'Tutti' : selectedDepartment}</p>
                  {isLoading ? <Skeleton className="h-32 w-full" /> : <div className="h-32 bg-gradient-to-r from-blue-100 to-green-100 rounded-lg flex items-center justify-center text-gray-500">Dashboard ferie e permessi</div>}
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="costs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-white/50 backdrop-blur-sm border-white/20 p-8 text-center">
                  <DollarSign className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Analisi Costi del Lavoro</h3>
                  <p className="text-gray-600 mb-4">Monitoraggio completo dei costi per periodo: {selectedPeriod}</p>
                  {isLoading ? <Skeleton className="h-32 w-full" /> : <div className="h-32 bg-gradient-to-r from-green-100 to-blue-100 rounded-lg flex items-center justify-center text-gray-500">Analisi costi e budget</div>}
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="shifts">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-white/50 backdrop-blur-sm border-white/20 p-8 text-center">
                  <Users className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Pianificazione Turni</h3>
                  <p className="text-gray-600 mb-4">Gestione e analisi turni per punto vendita: {selectedStore === 'all' ? 'Tutti i negozi' : 'Negozio selezionato'}</p>
                  {isLoading ? <Skeleton className="h-32 w-full" /> : <div className="h-32 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg flex items-center justify-center text-gray-500">Gestione turni e coperture</div>}
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="demographics">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-white/50 backdrop-blur-sm border-white/20 p-8 text-center">
                  <PieChart className="h-12 w-12 text-indigo-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Demografia Dipendenti</h3>
                  <p className="text-gray-600 mb-4">Analisi demografica e distribuzione del personale</p>
                  {isLoading ? <Skeleton className="h-32 w-full" /> : <div className="h-32 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center text-gray-500">Grafici demografici e statistiche</div>}
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="compliance">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-white/50 backdrop-blur-sm border-white/20 p-8 text-center">
                  <Shield className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Dashboard Compliance</h3>
                  <p className="text-gray-600 mb-4">Monitoraggio conformità normative e procedure HR</p>
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Compliance Score: {mockMetrics.complianceScore}%</Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Stato: Conforme</Badge>
                  </div>
                  {isLoading ? <Skeleton className="h-32 w-full" /> : <div className="h-32 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center text-gray-500">Indicatori compliance e audit</div>}
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Enhanced Real-time status indicator */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-6 right-6 z-50"
          data-testid="status-indicator"
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full shadow-xl border border-white/30 hover:bg-white/70 transition-all duration-300">
            <div className={cn(
              "w-3 h-3 rounded-full shadow-sm",
              isAutoRefresh ? "bg-green-500 animate-pulse shadow-green-200" : "bg-gray-400"
            )} />
            <span className="text-xs font-medium text-gray-700">
              {isAutoRefresh ? "Live" : "Manual"}
            </span>
            {isAutoRefresh && (
              <Badge variant="secondary" className="text-xs px-2 py-0 bg-green-100 text-green-700">
                {refreshInterval / 1000}s
              </Badge>
            )}
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}