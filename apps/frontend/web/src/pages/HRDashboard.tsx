import { useState, useMemo } from 'react';
import { useParams } from 'wouter';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import Layout from '@/components/Layout';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  UserCheck,
  UserX,
  CalendarDays,
  Timer,
  DollarSign,
  Shield,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Calendar,
  FileText,
  BarChart3,
  Award,
  Target,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Coffee,
  Home,
  MapPin,
  Building,
  Filter,
  Search,
  RefreshCw,
  Download,
  Plus,
  Settings,
  ChevronRight,
  BellRing,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// Import HR hooks for real data
import { 
  useDashboardMetrics, 
  useAttendanceAnalytics,
  useLeaveAnalytics,
  useShiftAnalytics,
  useComplianceMetrics 
} from '@/hooks/useHRAnalytics';
import { useLeaveRequests, useTeamCalendar } from '@/hooks/useLeaveManagement';
import { useShifts, useCoverageAnalysis } from '@/hooks/useShiftPlanning';
import { useCurrentSession, useTimeEntries } from '@/hooks/useTimeTracking';
import { useExpenseReports } from '@/hooks/useExpenseManagement';

// WindTre Color System
const BRAND_COLORS = {
  orange: 'hsl(23, 100%, 50%)', // #FF6900
  purple: 'hsl(269, 62%, 44%)', // #7B2CBF
  orangeLight: 'hsl(23, 100%, 60%)',
  purpleLight: 'hsl(269, 100%, 64%)',
  orangeDark: 'hsl(23, 100%, 40%)',
  purpleDark: 'hsl(269, 62%, 34%)'
};

export default function HRDashboard() {
  const params = useParams();
  const tenantId = params.tenant || 'default';
  const [currentModule] = useState('hr');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  // Fetch real data using HR hooks
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useDashboardMetrics(selectedPeriod);
  const { data: attendance, isLoading: attendanceLoading } = useAttendanceAnalytics(selectedPeriod);
  const { data: leaveData } = useLeaveAnalytics(selectedPeriod);
  const { data: compliance } = useComplianceMetrics();
  const { data: leaveRequests = [] } = useLeaveRequests({ status: 'pending' });
  const { reports: expenseReports = [] } = useExpenseReports({ status: 'pending' });
  const currentDate = useMemo(() => new Date(), []);
  const { shifts: todayShifts = [] } = useShifts('all', currentDate, currentDate);
  const { avgCoverage, understaffedHours, criticalHours, analysis } = useCoverageAnalysis('all', currentDate, currentDate);
  const { session: currentTimeSession } = useCurrentSession();
  const { data: teamCalendar = [] } = useTeamCalendar();

  // Prepare metrics for DashboardTemplate
  const dashboardMetrics = useMemo(() => {
    if (!metrics) return [];
    
    return [
      {
        id: 'total-employees',
        title: 'Dipendenti Totali',
        value: metrics.totalEmployees || 0,
        description: 'Dipendenti attivi nel sistema',
        trend: metrics.trends?.employeeGrowth ? {
          value: metrics.trends.employeeGrowth,
          label: `${metrics.trends.employeeGrowth > 0 ? '+' : ''}${metrics.trends.employeeGrowth}%`
        } : undefined,
        icon: <Users className="h-5 w-5" style={{ color: BRAND_COLORS.orange }} />
      },
      {
        id: 'attendance-rate',
        title: 'Tasso Presenze',
        value: `${(metrics.attendanceRate || 0).toFixed(1)}%`,
        description: attendance ? `${attendance.totalPresent} presenti oggi` : 'Media giornaliera',
        trend: metrics.trends?.attendanceChange ? {
          value: metrics.trends.attendanceChange,
          label: `${metrics.trends.attendanceChange > 0 ? '+' : ''}${metrics.trends.attendanceChange}%`
        } : undefined,
        icon: <UserCheck className="h-5 w-5 text-green-600" />
      },
      {
        id: 'pending-leaves',
        title: 'Ferie in Sospeso',
        value: leaveRequests.length,
        description: 'Richieste da approvare',
        trend: leaveData?.trends ? {
          value: leaveData.pendingRequests > 0 ? -5 : 0,
          label: 'Da gestire'
        } : undefined,
        icon: <CalendarDays className="h-5 w-5 text-blue-600" />
      },
      {
        id: 'overtime-hours',
        title: 'Ore Straordinario',
        value: `${(metrics.overtimeHours || 0).toFixed(0)}h`,
        description: 'Questo mese',
        trend: metrics.trends?.overtimeChange ? {
          value: metrics.trends.overtimeChange,
          label: `${metrics.trends.overtimeChange > 0 ? '+' : ''}${metrics.trends.overtimeChange}%`
        } : undefined,
        icon: <Timer className="h-5 w-5 text-orange-600" />
      },
      {
        id: 'labor-cost',
        title: 'Costo del Lavoro',
        value: `€${(metrics.laborCostThisMonth / 1000).toFixed(0)}K`,
        description: 'Costo mensile totale',
        trend: metrics.trends?.laborCostChange ? {
          value: metrics.trends.laborCostChange,
          label: `${metrics.trends.laborCostChange > 0 ? '+' : ''}${metrics.trends.laborCostChange}%`
        } : undefined,
        icon: <DollarSign className="h-5 w-5" style={{ color: BRAND_COLORS.purple }} />
      },
      {
        id: 'compliance-score',
        title: 'Compliance Score',
        value: `${(compliance?.overallScore || metrics.complianceScore || 0).toFixed(0)}%`,
        description: 'Conformità HR',
        trend: {
          value: 2.5,
          label: '+2.5%'
        },
        icon: <Shield className="h-5 w-5 text-green-600" />
      },
      {
        id: 'active-shifts',
        title: 'Turni Attivi',
        value: todayShifts.length || metrics.activeShifts || 0,
        description: 'Turni di oggi',
        icon: <Clock className="h-5 w-5 text-indigo-600" />
      },
      {
        id: 'expense-reports',
        title: 'Note Spese',
        value: expenseReports.length,
        description: 'Da approvare',
        icon: <FileText className="h-5 w-5 text-pink-600" />
      }
    ];
  }, [metrics, attendance, compliance, leaveRequests, expenseReports, todayShifts, leaveData]);

  // Recent activities from various sources
  const recentActivities = useMemo(() => {
    const activities = [];
    
    // Add time tracking activities
    if (currentTimeSession) {
      activities.push({
        id: 'session-active',
        title: 'Sessione Attiva',
        description: `Tempo trascorso: ${Math.floor((currentTimeSession.elapsedMinutes || 0) / 60)}h ${(currentTimeSession.elapsedMinutes || 0) % 60}m`,
        timestamp: new Date(),
        icon: <Clock className="h-4 w-4 text-green-500" />,
        badge: { label: 'Live', variant: 'default' as const }
      });
    }

    // Add recent leave requests
    leaveRequests.slice(0, 3).forEach((request: any, index: number) => {
      activities.push({
        id: `leave-${index}`,
        title: `Richiesta Ferie`,
        description: `${request.userName || 'Dipendente'} - ${request.totalDays} giorni`,
        timestamp: request.createdAt || new Date(),
        icon: <CalendarDays className="h-4 w-4 text-blue-500" />,
        badge: { label: 'Pending', variant: 'secondary' as const }
      });
    });

    // Add shift updates
    if (todayShifts.length > 0) {
      activities.push({
        id: 'shifts-today',
        title: 'Turni di Oggi',
        description: `${todayShifts.length} turni programmati`,
        timestamp: new Date(),
        icon: <Users className="h-4 w-4 text-purple-500" />
      });
    }

    // Add expense reports
    expenseReports.slice(0, 2).forEach((report: any, index: number) => {
      activities.push({
        id: `expense-${index}`,
        title: 'Nota Spese',
        description: `€${report.totalAmount || 0} - ${report.userName || 'Dipendente'}`,
        timestamp: report.submittedAt || new Date(),
        icon: <DollarSign className="h-4 w-4 text-orange-500" />,
        badge: { label: 'Review', variant: 'outline' as const }
      });
    });

    return activities.sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
      return timeB - timeA;
    });
  }, [currentTimeSession, leaveRequests, todayShifts, expenseReports]);

  // Charts section
  const charts = useMemo(() => {
    const chartData = [];

    // Attendance trend chart
    if (attendance?.trends?.daily && attendance.trends.daily.length > 0) {
      chartData.push({
        id: 'attendance-trend',
        title: 'Trend Presenze',
        description: 'Ultimi 7 giorni',
        component: (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="space-y-2 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p>Grafico presenze disponibile</p>
              <p className="text-sm">Media: {attendance.attendanceRate.toFixed(1)}%</p>
            </div>
          </div>
        )
      });
    }

    // Department performance chart
    if (attendance?.trends?.departmental && attendance.trends.departmental.length > 0) {
      chartData.push({
        id: 'department-performance',
        title: 'Performance per Reparto',
        description: 'Tasso di presenza per dipartimento',
        component: (
          <div className="space-y-3 p-4">
            {attendance.trends.departmental.map((dept: any) => (
              <div key={dept.department} className="flex items-center justify-between">
                <span className="text-sm font-medium">{dept.department}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-purple-600"
                      style={{ width: `${dept.rate}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">{dept.rate.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        )
      });
    }

    return chartData;
  }, [attendance]);

  // Quick actions
  const quickActions = [
    {
      label: 'Richiedi Ferie',
      icon: <CalendarDays className="h-4 w-4" />,
      onClick: () => {
        window.location.href = `/${tenantId}/leave-management`;
      },
      variant: 'outline' as const
    },
    {
      label: 'Visualizza Turni',
      icon: <Clock className="h-4 w-4" />,
      onClick: () => {
        window.location.href = `/${tenantId}/shift-planning`;
      },
      variant: 'outline' as const
    },
    {
      label: 'Nota Spese',
      icon: <FileText className="h-4 w-4" />,
      onClick: () => {
        window.location.href = `/${tenantId}/expense-management`;
      },
      variant: 'outline' as const
    },
    {
      label: 'Timbratura',
      icon: <Timer className="h-4 w-4" />,
      onClick: () => {
        window.location.href = `/${tenantId}/time-tracking`;
      },
      variant: 'outline' as const
    }
  ];

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchMetrics();
      toast({
        title: 'Dashboard aggiornato',
        description: 'I dati sono stati aggiornati con successo'
      });
    } catch (error) {
      toast({
        title: 'Errore aggiornamento',
        description: 'Impossibile aggiornare i dati',
        variant: 'destructive'
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Handle export
  const handleExport = () => {
    toast({
      title: 'Export avviato',
      description: 'Il report sarà disponibile a breve'
    });
  };

  // Filters component
  const filterOptions = (
    <div className="flex items-center gap-2">
      <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
        <SelectTrigger className="w-32" data-testid="select-period">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="day">Oggi</SelectItem>
          <SelectItem value="week">Settimana</SelectItem>
          <SelectItem value="month">Mese</SelectItem>
          <SelectItem value="quarter">Trimestre</SelectItem>
          <SelectItem value="year">Anno</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Layout currentModule={currentModule} setCurrentModule={() => {}}>
      <DashboardTemplate
        title="HR Dashboard"
        subtitle="Gestione completa delle risorse umane con analytics in tempo reale"
        breadcrumbs={[
          { label: 'Home', href: `/${tenantId}` },
          { label: 'HR', href: `/${tenantId}/hr` },
          { label: 'Dashboard' }
        ]}
        metrics={dashboardMetrics}
        metricsLoading={metricsLoading || attendanceLoading}
        charts={charts}
        chartsLayout="grid"
        activityTitle="Attività Recenti"
        activityItems={recentActivities}
        showActivityViewAll={true}
        onActivityViewAll={() => window.location.href = `/${tenantId}/hr/activities`}
        quickActions={quickActions}
        showFilters={true}
        filterOptions={filterOptions}
        isRefreshing={refreshing}
        lastUpdated={new Date()}
        onRefresh={handleRefresh}
        onExport={handleExport}
        primaryAction={{
          label: 'Nuovo Dipendente',
          icon: <Plus className="h-4 w-4" />,
          onClick: () => window.location.href = `/${tenantId}/employee-management`
        }}
        className="hr-dashboard"
      >
        {/* Additional custom content with tabs */}
        <div className="mt-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50">
              <TabsTrigger value="overview" data-testid="tab-overview">Panoramica</TabsTrigger>
              <TabsTrigger value="employees" data-testid="tab-employees">Dipendenti</TabsTrigger>
              <TabsTrigger value="attendance" data-testid="tab-attendance">Presenze</TabsTrigger>
              <TabsTrigger value="leaves" data-testid="tab-leaves">Ferie</TabsTrigger>
              <TabsTrigger value="compliance" data-testid="tab-compliance">Compliance</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Coverage Analysis */}
                <Card className="glass-card" data-testid="card-coverage">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" style={{ color: BRAND_COLORS.orange }} />
                      Copertura Turni
                    </CardTitle>
                    <CardDescription>Analisi copertura di oggi</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {avgCoverage ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Copertura Media</span>
                          <Badge variant={avgCoverage >= 80 ? 'default' : 'destructive'}>
                            {avgCoverage}%
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Turni Scoperti</span>
                          <span className="font-semibold text-red-600">{understaffedHours || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Staff Richiesto</span>
                          <span className="font-semibold">{criticalHours || 0}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nessun dato disponibile</p>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="glass-card" data-testid="card-quick-stats">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" style={{ color: BRAND_COLORS.purple }} />
                      Statistiche Rapide
                    </CardTitle>
                    <CardDescription>Metriche chiave in tempo reale</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-green-500" />
                          Presenti Ora
                        </span>
                        <span className="font-semibold">{attendance?.totalPresent || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center gap-2">
                          <UserX className="h-4 w-4 text-red-500" />
                          Assenti
                        </span>
                        <span className="font-semibold">{attendance?.totalAbsent || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center gap-2">
                          <Coffee className="h-4 w-4 text-orange-500" />
                          In Pausa
                        </span>
                        <span className="font-semibold">{currentTimeSession?.currentBreak ? 1 : 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm flex items-center gap-2">
                          <Home className="h-4 w-4 text-blue-500" />
                          Smart Working
                        </span>
                        <span className="font-semibold">12</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* HR Modules Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { title: 'Calendario', icon: Calendar, color: 'blue', path: 'calendar', count: metrics?.upcomingEvents || 0 },
                  { title: 'Timbrature', icon: Clock, color: 'green', path: 'time-tracking', count: attendance?.totalPresent || 0 },
                  { title: 'Ferie', icon: CalendarDays, color: 'purple', path: 'leave-management', count: leaveRequests.length },
                  { title: 'Turni', icon: Users, color: 'orange', path: 'shift-planning', count: todayShifts.length },
                  { title: 'Documenti', icon: FileText, color: 'indigo', path: 'documents', count: 342 },
                  { title: 'Note Spese', icon: DollarSign, color: 'pink', path: 'expense-management', count: expenseReports.length }
                ].map((module) => (
                  <Card 
                    key={module.path}
                    className="glass-card cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                    onClick={() => window.location.href = `/${tenantId}/${module.path}`}
                    data-testid={`module-${module.path}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center text-center space-y-2">
                        <div className={`p-3 rounded-lg bg-${module.color}-100 dark:bg-${module.color}-900/20`}>
                          <module.icon className={`h-6 w-6 text-${module.color}-600`} />
                        </div>
                        <p className="text-sm font-medium">{module.title}</p>
                        {module.count > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {module.count}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Employees Tab */}
            <TabsContent value="employees" className="mt-4">
              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Elenco Dipendenti</CardTitle>
                    <CardDescription>Gestione anagrafica e presenza</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Cerca dipendente..." 
                        className="w-64"
                        data-testid="input-search-employee"
                      />
                    </div>
                    <Button variant="outline" size="sm" data-testid="button-filter-employees">
                      <Filter className="h-4 w-4 mr-1" />
                      Filtri
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Ruolo</TableHead>
                        <TableHead>Reparto</TableHead>
                        <TableHead>Presenza</TableHead>
                        <TableHead>Turno</TableHead>
                        <TableHead>Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamCalendar.slice(0, 5).map((member: any, index: number) => (
                        <TableRow key={index} data-testid={`row-employee-${index}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                                {member.userName?.charAt(0) || 'U'}
                              </div>
                              {member.userName || `Dipendente ${index + 1}`}
                            </div>
                          </TableCell>
                          <TableCell>Sales Specialist</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              <Building className="h-3 w-3 mr-1" />
                              Milano Centro
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={member.status === 'leave' ? 'secondary' : 'default'}>
                              {member.status === 'leave' ? 'In Ferie' : 'Presente'}
                            </Badge>
                          </TableCell>
                          <TableCell>09:00 - 18:00</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" data-testid={`button-view-${index}`}>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Attendance Tab */}
            <TabsContent value="attendance" className="mt-4">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Monitoraggio Presenze</CardTitle>
                  <CardDescription>
                    Tasso di presenza: {attendance?.attendanceRate.toFixed(1)}% | 
                    Puntualità: {attendance?.punctualityRate.toFixed(1)}%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Presenti</span>
                        <span className="font-semibold text-green-600">{attendance?.totalPresent || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Assenti</span>
                        <span className="font-semibold text-red-600">{attendance?.totalAbsent || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Ritardatari</span>
                        <span className="font-semibold text-orange-600">{attendance?.totalLate || 0}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Ore Medie</span>
                        <span className="font-semibold">{attendance?.averageWorkHours.toFixed(1) || 0}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Straordinari</span>
                        <span className="font-semibold text-purple-600">{attendance?.overtimeHours.toFixed(0) || 0}h</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
                          {attendance?.attendanceRate.toFixed(0) || 0}%
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Tasso Presenza</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Leaves Tab */}
            <TabsContent value="leaves" className="mt-4">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Gestione Ferie e Permessi</CardTitle>
                  <CardDescription>
                    {leaveRequests.length} richieste in sospeso | 
                    {leaveData ? ` ${leaveData.approvedRequests} approvate questo mese` : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dipendente</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Periodo</TableHead>
                        <TableHead>Giorni</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead>Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveRequests.slice(0, 5).map((request: any, index: number) => (
                        <TableRow key={request.id || index} data-testid={`row-leave-${index}`}>
                          <TableCell>{request.userName || 'Dipendente'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {request.leaveType === 'vacation' ? 'Ferie' : 
                               request.leaveType === 'sick' ? 'Malattia' : 'Permesso'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(request.startDate), 'dd/MM', { locale: it })} - 
                            {format(new Date(request.endDate), 'dd/MM', { locale: it })}
                          </TableCell>
                          <TableCell>{request.totalDays}</TableCell>
                          <TableCell>
                            <Badge variant={request.status === 'approved' ? 'default' : 'secondary'}>
                              {request.status === 'approved' ? 'Approvata' : 
                               request.status === 'rejected' ? 'Rifiutata' : 'In Attesa'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="text-green-600">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-600">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Compliance Tab */}
            <TabsContent value="compliance" className="mt-4">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Compliance e Conformità HR</CardTitle>
                  <CardDescription>
                    Score complessivo: {compliance?.overallScore.toFixed(0) || metrics?.complianceScore || 0}%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {compliance && [
                      { category: 'documentCompliance', data: compliance.documentCompliance },
                      { category: 'workingTimeCompliance', data: compliance.workingTimeCompliance },
                      { category: 'trainingCompliance', data: compliance.trainingCompliance },
                      { category: 'contractCompliance', data: compliance.contractCompliance }
                    ].map(({ category, data }) => (
                      <div key={category} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium capitalize">{category.replace(/_/g, ' ')}</span>
                          <Badge variant={data.score >= 90 ? 'default' : data.score >= 70 ? 'secondary' : 'destructive'}>
                            {data.score.toFixed(0)}%
                          </Badge>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={cn(
                              "h-2 rounded-full transition-all",
                              data.score >= 90 ? "bg-green-500" : 
                              data.score >= 70 ? "bg-yellow-500" : "bg-red-500"
                            )}
                            style={{ width: `${data.score}%` }}
                          />
                        </div>
                        {(() => {
                          let issues = 0;
                          if (category === 'documentCompliance' && 'expiredDocuments' in data) {
                            issues = (data as any).expiredDocuments || 0;
                          } else if (category === 'workingTimeCompliance' && 'violations' in data) {
                            issues = (data as any).violations || 0;
                          } else if (category === 'trainingCompliance' && 'expiredCertifications' in data) {
                            issues = (data as any).expiredCertifications || 0;
                          } else if (category === 'contractCompliance' && 'expiredContracts' in data) {
                            issues = (data as any).expiredContracts || 0;
                          }
                          return issues > 0 && (
                            <div className="text-sm text-muted-foreground">
                              {issues} problemi da risolvere
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardTemplate>
    </Layout>
  );
}