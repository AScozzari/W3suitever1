// Time Tracking Page - Enterprise HR Management System
import { useState, useEffect, useMemo } from 'react';
import { ListPageTemplate, DashboardTemplate } from '@w3suite/frontend-kit/templates';
import { Column } from '@w3suite/frontend-kit/components/blocks/DataTable';
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
import {
  Clock,
  Calendar,
  Download,
  Timer,
  LogIn,
  LogOut,
  Coffee,
  Activity,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  MapPin,
  Users,
  FileText,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
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
import ClockWidget from '@/components/TimeTracking/ClockWidget';
import {
  useCurrentSession,
  useTimeBalance,
  useTimeEntries,
  useTimeReports,
  useTeamReports,
  useTimeTrackingPermissions,
  useExportEntries,
  useUpdateEntry,
  useApproveEntry,
  useDisputeEntry,
  useClockIn,
  useClockOut,
} from '@/hooks/useTimeTracking';
import { useStores } from '@/hooks/useStores';
import { timeTrackingService } from '@/services/timeTrackingService';

export default function TimeTrackingPage() {
  const [currentModule, setCurrentModule] = useState('time-tracking');
  const { toast } = useToast();
  const { user } = useAuth();
  const currentUser = user;
  
  // State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'entries' | 'reports'>('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'disputed'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return {
      start: format(now, 'yyyy-MM-dd'),
      end: format(now, 'yyyy-MM-dd'),
    };
  });

  // Get stores and permissions
  const { stores = [], isLoading: storesLoading } = useStores();
  const permissions = useTimeTrackingPermissions(
    currentUser?.id,
    currentUser?.role || 'EMPLOYEE'
  );

  // Queries & Mutations
  const { session, isActive, elapsedMinutes, requiresBreak, isOvertime, refetch: refetchSession } = useCurrentSession();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  
  const { balance, isLoading: balanceLoading } = useTimeBalance(
    currentUser?.id,
    dateRange
  );

  const { data: entries = [], isLoading: entriesLoading, refetch: refetchEntries } = useTimeEntries({
    userId: currentUser?.id,
    storeId: selectedStore || undefined,
    startDate: dateRange.start,
    endDate: dateRange.end,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const { data: report, isLoading: reportLoading } = useTimeReports(
    currentUser?.id || '',
    dateRange.start,
    dateRange.end
  );

  const { data: teamReports = [], isLoading: teamReportsLoading } = useTeamReports(
    selectedStore || currentUser?.storeId || '',
    dateRange.start,
    dateRange.end
  );

  const updateEntry = useUpdateEntry();
  const approveEntry = useApproveEntry();
  const disputeEntry = useDisputeEntry();
  const exportEntries = useExportEntries();

  // Update date range based on period
  useEffect(() => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (selectedPeriod) {
      case 'today':
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
    }

    setDateRange({
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
    });
  }, [selectedPeriod]);

  // Prepare metrics for dashboard
  const metrics: MetricCard[] = useMemo(() => [
    {
      id: 'status',
      title: 'Stato Corrente',
      value: isActive ? 'In Turno' : 'Fuori Turno',
      description: isActive ? `Da ${timeTrackingService.formatDuration(elapsedMinutes)}` : 'Non in servizio',
      trend: isActive ? { value: elapsedMinutes, label: 'minuti' } : undefined,
      icon: <Activity className={`h-4 w-4 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />,
    },
    {
      id: 'total-hours',
      title: 'Ore Totali',
      value: `${balance.totalHours.toFixed(1)}h`,
      description: `Target: ${balance.targetHours.toFixed(0)}h`,
      trend: balance.percentComplete > 0 ? { value: balance.percentComplete, label: '%' } : undefined,
      icon: <Clock className="h-4 w-4 text-purple-600" />,
    },
    {
      id: 'overtime',
      title: 'Straordinari',
      value: `${balance.overtimeHours > 0 ? '+' : ''}${balance.overtimeHours.toFixed(1)}h`,
      description: balance.overtimeHours > 0 ? 'Da recuperare' : 'Nessuno',
      icon: <TrendingUp className={`h-4 w-4 ${balance.overtimeHours > 0 ? 'text-orange-600' : 'text-gray-400'}`} />,
    },
    {
      id: 'balance',
      title: 'Saldo Ore',
      value: `${balance.balanceHours > 0 ? '+' : ''}${balance.balanceHours.toFixed(1)}h`,
      description: balance.balanceHours > 0 ? 'Credito' : balance.balanceHours < 0 ? 'Debito' : 'In pari',
      icon: <BarChart3 className={`h-4 w-4 ${
        balance.balanceHours > 0 ? 'text-green-600' : 
        balance.balanceHours < 0 ? 'text-red-600' : 'text-gray-400'
      }`} />,
    },
  ], [isActive, elapsedMinutes, balance]);

  // Prepare columns for entries list
  const entriesColumns = useMemo(() => [
    {
      key: 'date',
      label: 'Data',
      render: (entry: any) => format(new Date(entry.clockIn), 'dd/MM/yyyy', { locale: it }),
    },
    {
      key: 'clockIn',
      label: 'Entrata',
      render: (entry: any) => format(new Date(entry.clockIn), 'HH:mm'),
    },
    {
      key: 'clockOut',
      label: 'Uscita',
      render: (entry: any) => entry.clockOut ? format(new Date(entry.clockOut), 'HH:mm') : '-',
    },
    {
      key: 'duration',
      label: 'Durata',
      render: (entry: any) => timeTrackingService.formatDuration(entry.totalMinutes || 0),
    },
    {
      key: 'status',
      label: 'Stato',
      render: (entry: any) => {
        const statusConfig = {
          active: { label: 'Attivo', variant: 'default' as const },
          completed: { label: 'Completato', variant: 'secondary' as const },
          edited: { label: 'Modificato', variant: 'outline' as const },
          disputed: { label: 'Contestato', variant: 'destructive' as const },
        };
        const config = statusConfig[entry.status as keyof typeof statusConfig] || statusConfig.active;
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: 'trackingMethod',
      label: 'Metodo',
      render: (entry: any) => {
        const methodIcons = {
          badge: '🪪',
          nfc: '📱',
          app: '📲',
          gps: '📍',
          manual: '✍️',
          biometric: '👆',
        };
        return (
          <span className="text-sm">
            {methodIcons[entry.trackingMethod as keyof typeof methodIcons] || '❓'} {entry.trackingMethod}
          </span>
        );
      },
    },
  ], []);

  // Handle actions
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchSession(),
      refetchEntries(),
    ]);
    setIsRefreshing(false);
    toast({
      title: 'Dashboard aggiornato',
      description: 'Tutti i dati sono stati aggiornati',
    });
  };

  const handleExport = () => {
    exportEntries.mutate({
      filters: {
        userId: currentUser?.id,
        storeId: selectedStore || undefined,
        startDate: dateRange.start,
        endDate: dateRange.end,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      },
      format: 'csv',
    });
  };

  const handleApproveEntry = (entry: any) => {
    approveEntry.mutate({ id: entry.id });
  };

  const handleDisputeEntry = (entry: any) => {
    const reason = prompt('Motivo della contestazione:');
    if (reason) {
      disputeEntry.mutate({ id: entry.id, reason });
    }
  };

  const handleEditEntry = (entry: any) => {
    updateEntry.mutate({
      id: entry.id,
      data: entry,
    });
  };

  // Prepare quick actions for dashboard
  const quickActions = [
    {
      label: isActive ? 'Timbra Uscita' : 'Timbra Entrata',
      icon: isActive ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />,
      onClick: () => {
        if (isActive && session) {
          clockOut.mutate({ id: session.id });
        } else {
          clockIn.mutate({
            storeId: currentUser?.storeId || '',
            trackingMethod: 'app',
          });
        }
      },
      variant: 'default' as const,
    },
    ...(isActive && !session?.currentBreak ? [{
      label: 'Inizia Pausa',
      icon: <Coffee className="h-4 w-4" />,
      onClick: () => {
        if (session) {
          timeTrackingService.startBreak(session.id);
        }
      },
      variant: 'outline' as const,
    }] : []),
    ...(isActive && session?.currentBreak ? [{
      label: 'Termina Pausa',
      icon: <Timer className="h-4 w-4" />,
      onClick: () => {
        if (session) {
          timeTrackingService.endBreak(session.id);
        }
      },
      variant: 'outline' as const,
    }] : []),
  ];

  // Render page content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardTemplate
            title="Time Tracking Dashboard"
            subtitle={`Periodo: ${format(new Date(dateRange.start), 'd MMM', { locale: it })} - ${format(new Date(dateRange.end), 'd MMM yyyy', { locale: it })}`}
            metrics={metrics}
            metricsLoading={balanceLoading}
            quickActions={quickActions}
            showFilters={true}
            filterOptions={
              <div className="flex gap-2">
                <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
                  <SelectTrigger className="w-32" data-testid="select-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Oggi</SelectItem>
                    <SelectItem value="week">Settimana</SelectItem>
                    <SelectItem value="month">Mese</SelectItem>
                  </SelectContent>
                </Select>
                {stores.length > 0 && (
                  <Select value={selectedStore} onValueChange={setSelectedStore}>
                    <SelectTrigger className="w-40" data-testid="select-store">
                      <SelectValue placeholder="Tutti gli store" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tutti gli store</SelectItem>
                      {stores.map((store: any) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            }
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onExport={handleExport}
            lastUpdated={new Date()}
          >
            {/* Clock Widget and Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <ClockWidget
                storeId={selectedStore || currentUser?.storeId || ''}
                storeName={currentUser?.storeName}
                userId={currentUser?.id || ''}
                userName={currentUser?.fullName}
                onClockIn={refetchEntries}
                onClockOut={refetchEntries}
              />
              
              {/* Quick Info Card */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Informazioni Rapide</CardTitle>
                  <CardDescription>Dettagli del tuo profilo di lavoro</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Store Assegnato</span>
                    </div>
                    <span className="text-sm font-medium">
                      {currentUser?.storeName || 'Non assegnato'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Orario Standard</span>
                    </div>
                    <span className="text-sm font-medium">09:00 - 18:00</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Ruolo</span>
                    </div>
                    <Badge variant="outline">{currentUser?.role || 'EMPLOYEE'}</Badge>
                  </div>
                  
                  {requiresBreak && (
                    <Alert className="border-orange-200 bg-orange-50">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        Hai lavorato per oltre 6 ore. È richiesta una pausa obbligatoria.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {isOvertime && (
                    <Alert className="border-purple-200 bg-purple-50">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                      <AlertDescription className="text-purple-800">
                        Stai accumulando ore di straordinario.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          </DashboardTemplate>
        );
        
      case 'entries':
        return (
          <ListPageTemplate
            title="Registrazioni Presenze"
            subtitle="Gestisci le tue timbrature e presenze"
            data={entries}
            columns={entriesColumns}
            isLoading={entriesLoading}
            searchPlaceholder="Cerca registrazioni..."
            filters={[
              {
                id: 'status',
                label: 'Stato',
                type: 'select',
                options: [
                  { value: 'all', label: 'Tutti' },
                  { value: 'active', label: 'Attivo' },
                  { value: 'completed', label: 'Completato' },
                  { value: 'disputed', label: 'Contestato' },
                ],
                value: statusFilter,
                onChange: (value) => setStatusFilter(value as any),
              },
              {
                id: 'period',
                label: 'Periodo',
                type: 'select',
                options: [
                  { value: 'today', label: 'Oggi' },
                  { value: 'week', label: 'Settimana' },
                  { value: 'month', label: 'Mese' },
                ],
                value: selectedPeriod,
                onChange: (value) => setSelectedPeriod(value as any),
              },
            ]}
            itemActions={(entry) => {
              const actions = [];
              
              if (permissions.canEditOwn && entry.userId === currentUser?.id) {
                actions.push({
                  id: 'edit',
                  label: 'Modifica',
                  onClick: () => handleEditEntry(entry),
                });
              }
              
              if (!entry.clockOut) {
                actions.push({
                  id: 'close',
                  label: 'Chiudi',
                  onClick: () => clockOut.mutate({ id: entry.id }),
                });
              }
              
              if (permissions.canApproveTeam && entry.status === 'completed') {
                actions.push({
                  id: 'approve',
                  label: 'Approva',
                  onClick: () => handleApproveEntry(entry),
                });
              }
              
              if (entry.status !== 'disputed') {
                actions.push({
                  id: 'dispute',
                  label: 'Contesta',
                  onClick: () => handleDisputeEntry(entry),
                });
              }
              
              return actions;
            }}
            primaryAction={{
              label: 'Esporta',
              icon: <Download className="h-4 w-4" />,
              onClick: handleExport,
            }}
            emptyStateProps={{
              title: 'Nessuna registrazione',
              description: 'Non ci sono timbrature per il periodo selezionato',
              icon: <Clock className="h-8 w-8 text-gray-400" />,
            }}
          />
        );
        
      case 'reports':
        return (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Report Time Tracking</CardTitle>
              <CardDescription>Analisi dettagliata delle presenze</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Individual Report */}
                {report && (
                  <div className="p-6 rounded-lg border">
                    <h3 className="font-semibold mb-4">Report Personale</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Ore Totali</p>
                        <p className="text-xl font-bold">{report.totalHours.toFixed(1)}h</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Ore Regolari</p>
                        <p className="text-xl font-bold">{report.regularHours.toFixed(1)}h</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Straordinari</p>
                        <p className="text-xl font-bold text-orange-600">
                          {report.overtimeHours.toFixed(1)}h
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Giorni Lavorati</p>
                        <p className="text-xl font-bold">{report.daysWorked}</p>
                      </div>
                    </div>
                    
                    {report.disputedEntries > 0 && (
                      <Alert className="mt-4 border-yellow-200 bg-yellow-50">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                          Hai {report.disputedEntries} registrazioni contestate da rivedere.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
                
                {/* Team Reports */}
                {teamReports.length > 0 && permissions.canViewReports && (
                  <div className="p-6 rounded-lg border">
                    <h3 className="font-semibold mb-4">Report Team</h3>
                    <div className="space-y-3">
                      {teamReports.map((teamReport: any) => (
                        <div key={teamReport.userId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{teamReport.userName}</p>
                            <p className="text-sm text-gray-500">
                              {teamReport.totalHours.toFixed(1)}h totali • {teamReport.daysWorked} giorni
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {teamReport.overtimeHours > 0 && (
                              <Badge variant="outline" className="text-orange-600">
                                +{teamReport.overtimeHours.toFixed(1)}h extra
                              </Badge>
                            )}
                            <Progress 
                              value={(teamReport.totalHours / (teamReport.daysWorked * 8)) * 100}
                              className="w-20 h-2"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Export Actions */}
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => handleExport()}
                    data-testid="button-export-csv"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Esporta CSV
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => exportEntries.mutate({ 
                      filters: {
                        userId: currentUser?.id,
                        startDate: dateRange.start,
                        endDate: dateRange.end,
                      },
                      format: 'pdf',
                    })}
                    data-testid="button-export-pdf"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Esporta PDF
                  </Button>
                </div>
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
      <div className="p-6 space-y-6" data-testid="time-tracking-page">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
              Time Tracking
            </h1>
            <p className="text-gray-600 mt-1">
              Sistema di rilevazione presenze aziendale
            </p>
          </div>
        </div>
        
        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="entries">Registrazioni</TabsTrigger>
            <TabsTrigger value="reports">Report</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-6">
            {renderContent()}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}