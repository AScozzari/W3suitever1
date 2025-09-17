import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useCurrentTenantId } from '@/contexts/TenantContext';
import { 
  useDashboardMetrics, 
  useAttendanceAnalytics,
  useComplianceMetrics 
} from '@/hooks/useHRAnalytics';
import { useCurrentSession } from '@/hooks/useTimeTracking';
import { useLeaveRequests } from '@/hooks/useLeaveManagement';
import { useExpenseReports } from '@/hooks/useExpenseManagement';
import {
  Calendar,
  Clock,
  CalendarDays,
  Users,
  FileText,
  DollarSign,
  BarChart3,
  Settings,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  MoreVertical,
  Plus,
  Download,
  RefreshCw,
  Filter,
  ChevronRight,
  Activity,
  Target,
  Shield,
  Award,
  UserCheck,
  UserX,
  Timer,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Module configurations with real API integration
const hrModules = [
  {
    id: 'calendar',
    title: 'Calendario',
    description: 'Sistema eventi con RBAC e permissions',
    icon: Calendar,
    path: '/calendar',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500/10 dark:bg-blue-400/10',
    iconColor: 'text-blue-600 dark:text-blue-400',
    stats: { label: 'Eventi oggi', valueKey: 'upcomingEvents' }
  },
  {
    id: 'time-tracking',
    title: 'Timbrature',
    description: 'Clock in/out con geolocalizzazione',
    icon: Clock,
    path: '/time-tracking',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-500/10 dark:bg-green-400/10',
    iconColor: 'text-green-600 dark:text-green-400',
    stats: { label: 'Attivi ora', valueKey: 'activeShifts' }
  },
  {
    id: 'leave-management',
    title: 'Gestione Ferie',
    description: 'Richieste con workflow approvazione',
    icon: CalendarDays,
    path: '/leave-management',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-500/10 dark:bg-purple-400/10',
    iconColor: 'text-purple-600 dark:text-purple-400',
    stats: { label: 'Da approvare', valueKey: 'pendingLeaveRequests' }
  },
  {
    id: 'shift-planning',
    title: 'Pianificazione Turni',
    description: 'Auto-scheduling ottimizzato',
    icon: Users,
    path: '/shift-planning',
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-500/10 dark:bg-orange-400/10',
    iconColor: 'text-orange-600 dark:text-orange-400',
    stats: { label: 'Turni settimana', valueKey: 'weeklyShifts' }
  },
  {
    id: 'documents',
    title: 'Document Drive',
    description: 'Storage sicuro documenti HR',
    icon: FileText,
    path: '/documents',
    color: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-indigo-500/10 dark:bg-indigo-400/10',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    stats: { label: 'Documenti', valueKey: 'totalDocuments' }
  },
  {
    id: 'expenses',
    title: 'Note Spese',
    description: 'Gestione rimborsi con OCR',
    icon: DollarSign,
    path: '/expense-management',
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-500/10 dark:bg-pink-400/10',
    iconColor: 'text-pink-600 dark:text-pink-400',
    stats: { label: 'Da rimborsare', valueKey: 'pendingExpenses' }
  },
  {
    id: 'analytics',
    title: 'HR Analytics',
    description: 'Dashboard KPI real-time',
    icon: BarChart3,
    path: '/hr-analytics',
    color: 'from-cyan-500 to-cyan-600',
    bgColor: 'bg-cyan-500/10 dark:bg-cyan-400/10',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    stats: { label: 'Compliance', valueKey: 'complianceScore' }
  },
  {
    id: 'settings',
    title: 'Configurazione',
    description: 'Impostazioni sistema HR',
    icon: Settings,
    path: '/settings',
    color: 'from-gray-500 to-gray-600',
    bgColor: 'bg-gray-500/10 dark:bg-gray-400/10',
    iconColor: 'text-gray-600 dark:text-gray-400',
    stats: { label: 'Parametri', valueKey: 'configItems' }
  }
];

// KPI Card Component with glassmorphism
function KPICard({ 
  label, 
  value, 
  change, 
  trend, 
  icon: Icon, 
  loading = false,
  color = "default"
}: any) {
  const isPositive = trend === 'up';
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  
  const colorClasses = {
    default: "from-gray-500 to-gray-600",
    success: "from-green-500 to-green-600",
    warning: "from-amber-500 to-amber-600",
    danger: "from-red-500 to-red-600",
    info: "from-blue-500 to-blue-600"
  };

  if (loading) {
    return (
      <Card className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20 mt-2" />
            </div>
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
      data-testid={`kpi-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground" data-testid={`kpi-label-${label}`}>
              {label}
            </p>
            <p className="text-2xl font-bold mt-1" data-testid={`kpi-value-${value}`}>
              {value}
            </p>
            {change && (
              <div className="flex items-center gap-1 mt-2">
                <TrendIcon className={cn("h-4 w-4", isPositive ? "text-green-600" : "text-red-600")} />
                <span 
                  className={cn("text-sm font-medium", isPositive ? "text-green-600" : "text-red-600")}
                  data-testid={`kpi-change-${change}`}
                >
                  {change}
                </span>
              </div>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-lg bg-gradient-to-br",
            colorClasses[color as keyof typeof colorClasses] || colorClasses.default
          )}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Module Card Component with glassmorphism
function ModuleCard({ module, stats, onClick }: any) {
  const Icon = module.icon;
  
  return (
    <Card 
      className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer group"
      onClick={onClick}
      data-testid={`card-${module.id}`}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className={cn("p-3 rounded-xl", module.bgColor, "group-hover:scale-110 transition-transform duration-300")}>
            <Icon className={cn("h-6 w-6", module.iconColor)} />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                data-testid={`button-menu-${module.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); }}
                data-testid={`menu-open-${module.id}`}
              >
                <ChevronRight className="mr-2 h-4 w-4" />
                Apri modulo
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); }}
                data-testid={`menu-config-${module.id}`}
              >
                <Settings className="mr-2 h-4 w-4" />
                Configura
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); }}
                data-testid={`menu-help-${module.id}`}
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                Aiuto
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg" data-testid={`text-title-${module.id}`}>
            {module.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1" data-testid={`text-description-${module.id}`}>
            {module.description}
          </p>
        </div>
        {stats && (
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm text-muted-foreground" data-testid={`text-stats-label-${module.id}`}>
              {module.stats.label}
            </span>
            <Badge variant="secondary" className="font-semibold" data-testid={`badge-stats-${module.id}`}>
              {stats}
            </Badge>
          </div>
        )}
        <Button 
          className="w-full group-hover:bg-primary group-hover:text-white transition-colors"
          variant="outline"
          data-testid={`button-navigate-${module.id}`}
        >
          Accedi
          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </CardContent>
    </Card>
  );
}

// Approval Item Component
function ApprovalItem({ type, title, requester, date, urgency, onApprove, onReject }: any) {
  const urgencyColors = {
    high: "text-red-600 bg-red-100 dark:bg-red-900/20",
    medium: "text-amber-600 bg-amber-100 dark:bg-amber-900/20",
    low: "text-green-600 bg-green-100 dark:bg-green-900/20"
  };

  return (
    <TableRow data-testid={`row-approval-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <TableCell>
        <div className="flex items-center gap-3">
          <Badge 
            variant="outline" 
            className={cn("text-xs", urgencyColors[urgency as keyof typeof urgencyColors])}
            data-testid={`badge-urgency-${urgency}`}
          >
            {urgency === 'high' ? 'Urgente' : urgency === 'medium' ? 'Media' : 'Bassa'}
          </Badge>
          <div>
            <p className="font-medium" data-testid={`text-title-${title}`}>{title}</p>
            <p className="text-sm text-muted-foreground" data-testid={`text-requester-${requester}`}>
              da {requester}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell data-testid={`text-type-${type}`}>{type}</TableCell>
      <TableCell data-testid={`text-date-${date}`}>{date}</TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20"
            onClick={onApprove}
            data-testid={`button-approve-${title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Approva
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
            onClick={onReject}
            data-testid={`button-reject-${title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            Rifiuta
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function HRDashboardPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const tenantId = useCurrentTenantId();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Get tenant from localStorage with fallback
  const tenant = localStorage.getItem('currentTenant') || 'staging';

  // Real data hooks
  const { data: dashboardMetrics, isLoading: metricsLoading, refetch: refetchMetrics } = useDashboardMetrics('month');
  const { data: attendance, isLoading: attendanceLoading } = useAttendanceAnalytics('month');
  const { data: compliance, isLoading: complianceLoading } = useComplianceMetrics();
  const { session, isActive: hasActiveSession } = useCurrentSession();
  const { data: leaveRequests, isLoading: leavesLoading } = useLeaveRequests({ status: 'pending' });
  const { reports: expenseReports, isLoading: expensesLoading } = useExpenseReports({ status: 'pending' });

  // Calculate real stats for modules
  const moduleStats = {
    upcomingEvents: dashboardMetrics?.upcomingEvents || 0,
    activeShifts: dashboardMetrics?.activeShifts || 0,
    pendingLeaveRequests: leaveRequests?.length || 0,
    weeklyShifts: attendance?.trends?.weekly?.length || 0,
    totalDocuments: '1,842', // Hardcoded as no API yet
    pendingExpenses: expenseReports?.length || 0,
    complianceScore: compliance?.overallScore ? `${compliance.overallScore}%` : '0%',
    configItems: '24' // Hardcoded
  };

  // Navigate to module
  const navigateToModule = (path: string) => {
    navigate(`/${tenant}${path}`);
  };

  // Handle refresh
  const handleRefresh = async () => {
    toast({
      title: "Aggiornamento",
      description: "Aggiornamento dati in corso...",
    });
    
    await refetchMetrics();
    
    toast({
      title: "Completato",
      description: "Dashboard aggiornata con successo",
    });
  };

  // Handle approval actions
  const handleApprove = (item: string) => {
    toast({
      title: "Approvato",
      description: `${item} è stato approvato con successo`,
    });
  };

  const handleReject = (item: string) => {
    toast({
      title: "Rifiutato",
      description: `${item} è stato rifiutato`,
      variant: "destructive",
    });
  };

  // Mock approval items (replace with real data when API ready)
  const approvalItems = [
    { 
      type: 'Ferie', 
      title: 'Richiesta ferie agosto',
      requester: 'Mario Rossi',
      date: '2025-09-15',
      urgency: 'high'
    },
    {
      type: 'Spese',
      title: 'Rimborso trasferta Milano',
      requester: 'Laura Bianchi',
      date: '2025-09-14',
      urgency: 'medium'
    },
    {
      type: 'Permesso',
      title: 'Permesso visita medica',
      requester: 'Giuseppe Verdi',
      date: '2025-09-16',
      urgency: 'low'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 dark:from-neutral-900 dark:via-neutral-900 dark:to-purple-950">
      <div className="p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-purple-600 bg-clip-text text-transparent" data-testid="text-page-title">
                HR Dashboard
              </h1>
              <p className="text-muted-foreground mt-1" data-testid="text-page-description">
                Gestione completa delle risorse umane - {tenant.toUpperCase()}
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
                data-testid="button-refresh"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Aggiorna
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-export">
                    <Download className="h-4 w-4 mr-2" />
                    Esporta
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem data-testid="menu-export-pdf">
                    <FileText className="mr-2 h-4 w-4" />
                    Esporta PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem data-testid="menu-export-excel">
                    <FileText className="mr-2 h-4 w-4" />
                    Esporta Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem data-testid="menu-export-csv">
                    <FileText className="mr-2 h-4 w-4" />
                    Esporta CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-orange-600 to-purple-600" data-testid="button-quick-action">
                    <Plus className="h-4 w-4 mr-2" />
                    Azione Rapida
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nuova Azione HR</DialogTitle>
                    <DialogDescription>
                      Seleziona il tipo di azione da eseguire
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Button 
                      variant="outline" 
                      className="justify-start"
                      onClick={() => {
                        setDialogOpen(false);
                        navigateToModule('/leave-management');
                      }}
                      data-testid="button-new-leave"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      Nuova richiesta ferie
                    </Button>
                    <Button 
                      variant="outline" 
                      className="justify-start"
                      onClick={() => {
                        setDialogOpen(false);
                        navigateToModule('/expense-management');
                      }}
                      data-testid="button-new-expense"
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      Nuova nota spese
                    </Button>
                    <Button 
                      variant="outline" 
                      className="justify-start"
                      onClick={() => {
                        setDialogOpen(false);
                        navigateToModule('/shift-planning');
                      }}
                      data-testid="button-new-shift"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Nuovo turno
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KPICard
              label="Dipendenti Totali"
              value={dashboardMetrics?.totalEmployees || 0}
              change={dashboardMetrics?.trends?.employeeGrowth ? `+${dashboardMetrics.trends.employeeGrowth}` : '+0'}
              trend={(dashboardMetrics?.trends?.employeeGrowth ?? 0) > 0 ? 'up' : 'down'}
              icon={Users}
              loading={metricsLoading}
              color="info"
            />
            <KPICard
              label="Tasso Presenza"
              value={attendance?.attendanceRate ? `${attendance.attendanceRate}%` : '0%'}
              change={dashboardMetrics?.trends?.attendanceChange ? `${dashboardMetrics.trends.attendanceChange}%` : '0%'}
              trend={(dashboardMetrics?.trends?.attendanceChange ?? 0) > 0 ? 'up' : 'down'}
              icon={UserCheck}
              loading={attendanceLoading}
              color="success"
            />
            <KPICard
              label="Ore Straordinario"
              value={dashboardMetrics?.overtimeHours ? `${dashboardMetrics.overtimeHours}h` : '0h'}
              change={dashboardMetrics?.trends?.overtimeChange ? `${dashboardMetrics.trends.overtimeChange}%` : '0%'}
              trend={(dashboardMetrics?.trends?.overtimeChange ?? 0) < 0 ? 'up' : 'down'}
              icon={Timer}
              loading={metricsLoading}
              color="warning"
            />
            <KPICard
              label="Compliance Score"
              value={compliance?.overallScore ? `${compliance.overallScore}%` : '0%'}
              change={"+3%"}
              trend="up"
              icon={Shield}
              loading={complianceLoading}
              color="success"
            />
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md border-white/20">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Activity className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="approvals" data-testid="tab-approvals">
              <CheckCircle className="h-4 w-4 mr-2" />
              Approvazioni
            </TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports">
              <BarChart3 className="h-4 w-4 mr-2" />
              Report
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <Target className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {hrModules.map((module) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  stats={moduleStats[module.stats.valueKey as keyof typeof moduleStats]}
                  onClick={() => navigateToModule(module.path)}
                />
              ))}
            </div>
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals">
            <Card className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md border-white/20 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Richieste in Attesa</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" data-testid="button-filter-approvals">
                      <Filter className="h-4 w-4 mr-2" />
                      Filtra
                    </Button>
                    <Badge variant="secondary">
                      {approvalItems.length} elementi
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  Gestisci le richieste di ferie, permessi e note spese
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Richiesta</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvalItems.map((item, index) => (
                      <ApprovalItem
                        key={index}
                        {...item}
                        onApprove={() => handleApprove(item.title)}
                        onReject={() => handleReject(item.title)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle>Report Mensili</CardTitle>
                  <CardDescription>Documenti e statistiche del mese corrente</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Report Presenze</p>
                        <p className="text-sm text-muted-foreground">Settembre 2025</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" data-testid="button-download-attendance">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">Analisi Costi</p>
                        <p className="text-sm text-muted-foreground">Q3 2025</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" data-testid="button-download-costs">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-medium">Compliance Report</p>
                        <p className="text-sm text-muted-foreground">Ultimo update: oggi</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" data-testid="button-download-compliance">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle>Performance Team</CardTitle>
                  <CardDescription>Metriche di produttività per area</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Vendite</span>
                        <span className="text-sm text-muted-foreground">92%</span>
                      </div>
                      <Progress value={92} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Amministrazione</span>
                        <span className="text-sm text-muted-foreground">88%</span>
                      </div>
                      <Progress value={88} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Logistica</span>
                        <span className="text-sm text-muted-foreground">95%</span>
                      </div>
                      <Progress value={95} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Marketing</span>
                        <span className="text-sm text-muted-foreground">79%</span>
                      </div>
                      <Progress value={79} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md border-white/20 shadow-xl lg:col-span-2">
                <CardHeader>
                  <CardTitle>Trend Presenze</CardTitle>
                  <CardDescription>Andamento mensile tasso di presenza</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mr-2" />
                    Grafico presenze (integrazione chart in sviluppo)
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md border-white/20 shadow-xl">
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                  <CardDescription>Metriche in tempo reale</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Presenti oggi</span>
                    </div>
                    <Badge variant="secondary">{attendance?.totalPresent || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserX className="h-4 w-4 text-red-600" />
                      <span className="text-sm">Assenti oggi</span>
                    </div>
                    <Badge variant="secondary">{attendance?.totalAbsent || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-amber-600" />
                      <span className="text-sm">In ritardo</span>
                    </div>
                    <Badge variant="secondary">{attendance?.totalLate || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Turni attivi</span>
                    </div>
                    <Badge variant="secondary">{dashboardMetrics?.activeShifts || 0}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}