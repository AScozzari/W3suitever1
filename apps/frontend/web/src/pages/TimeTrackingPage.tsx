// Time Tracking Page - Enterprise HR Management System
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Calendar,
  Download,
  Filter,
  Settings,
  ChevronLeft,
  ChevronRight,
  Users,
  MapPin,
  Activity,
  TrendingUp,
  AlertCircle,
  Info,
  RefreshCw,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import ClockWidget from '@/components/TimeTracking/ClockWidget';
import TimeEntriesList from '@/components/TimeTracking/TimeEntriesList';
import TimeReports from '@/components/TimeTracking/TimeReports';
import DeviceSimulator from '@/components/TimeTracking/DeviceSimulator';
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
} from '@/hooks/useTimeTracking';
import { geolocationManager, ITALY_STORE_ZONES } from '@/utils/geolocationManager';
import { timeTrackingService } from '@/services/timeTrackingService';

export default function TimeTrackingPage() {
  const [currentModule, setCurrentModule] = useState('time-tracking');
  const { toast } = useToast();
  const { user } = useAuth();
  const currentUser = user;
  
  // State
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return {
      start: format(now, 'yyyy-MM-dd'),
      end: format(now, 'yyyy-MM-dd'),
    };
  });
  const [activeTab, setActiveTab] = useState<'clock' | 'entries' | 'reports' | 'settings'>('clock');
  const [showDeviceSimulator, setShowDeviceSimulator] = useState(false);

  // Get user permissions
  const permissions = useTimeTrackingPermissions(
    currentUser?.id,
    currentUser?.role || 'EMPLOYEE'
  );

  // Queries & Mutations
  const { session, isActive, elapsedMinutes, requiresBreak, isOvertime } = useCurrentSession();
  
  const { balance, isLoading: balanceLoading } = useTimeBalance(
    currentUser?.id,
    dateRange
  );

  const { data: entries = [], isLoading: entriesLoading, refetch: refetchEntries } = useTimeEntries({
    userId: currentUser?.id,
    storeId: selectedStore || undefined,
    startDate: dateRange.start,
    endDate: dateRange.end,
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

  // Handle entry edit
  const handleEditEntry = async (entry: any) => {
    updateEntry.mutate({
      id: entry.id,
      data: entry,
    });
  };

  // Handle entry approve
  const handleApproveEntry = async (entryId: string) => {
    approveEntry.mutate({ id: entryId });
  };

  // Handle entry dispute
  const handleDisputeEntry = async (entryId: string, reason: string) => {
    disputeEntry.mutate({ id: entryId, reason });
  };

  // Handle export
  const handleExport = async (format: 'csv' | 'pdf') => {
    exportEntries.mutate({
      filters: {
        userId: currentUser?.id,
        startDate: dateRange.start,
        endDate: dateRange.end,
      },
      format,
    });
  };

  // Handle device simulation
  const handleDeviceRead = (type: string, data: any) => {
    console.log('Device read:', type, data);
    toast({
      title: `${type.toUpperCase()} Letto`,
      description: `ID: ${data.id || data.uid || data.code}`,
    });
  };

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="time-tracking-page">
        {/* Header with Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-md rounded-xl shadow-xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
                Time Tracking
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Sistema di rilevazione presenze multi-device
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Period Selector */}
              <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
                <SelectTrigger className="w-32 bg-white/60 backdrop-blur border-white/30" data-testid="select-period">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Oggi</SelectItem>
                  <SelectItem value="week">Settimana</SelectItem>
                  <SelectItem value="month">Mese</SelectItem>
                </SelectContent>
              </Select>

              {/* Settings */}
              {permissions.canManageSettings && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setActiveTab('settings')}
                  className="bg-white/60 backdrop-blur border-white/30"
                  data-testid="button-settings"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Date Range Display */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>
              {format(new Date(dateRange.start), 'd MMM', { locale: it })}
              {dateRange.start !== dateRange.end && (
                <>
                  {' - '}
                  {format(new Date(dateRange.end), 'd MMM yyyy', { locale: it })}
                </>
              )}
            </span>
          </div>
        </motion.div>

        {/* Quick Stats */}
        {!balanceLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            {/* Today's Status */}
            <Card className="p-4 bg-white/80 backdrop-blur-md border-white/20 hover:shadow-lg transition-all duration-200" data-testid="stat-today-status">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Stato Oggi</p>
                  <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                    {isActive ? 'In Turno' : 'Fuori Turno'}
                  </p>
                  {isActive && (
                    <p className="text-xs text-gray-500 mt-1">
                      Da {Math.floor(elapsedMinutes / 60)}h {elapsedMinutes % 60}min
                    </p>
                  )}
                </div>
                <div className={cn(
                  "p-2 rounded-lg",
                  isActive ? "bg-green-100" : "bg-gray-100"
                )}>
                  <Activity className={cn(
                    "w-5 h-5",
                    isActive ? "text-green-600" : "text-gray-600"
                  )} />
                </div>
              </div>
              {requiresBreak && (
                <div className="mt-3 p-2 bg-orange-100 rounded text-xs text-orange-700">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  Pausa obbligatoria richiesta
                </div>
              )}
            </Card>

            {/* Total Hours */}
            <Card className="p-4 bg-white/80 backdrop-blur-md border-white/20 hover:shadow-lg transition-all duration-200" data-testid="stat-total-hours">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Ore Totali</p>
                  <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">
                    {balance.totalHours.toFixed(1)}h
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Target: {balance.targetHours.toFixed(0)}h
                  </p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">{balance.percentComplete.toFixed(0)}%</span>
                </div>
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
                    style={{ width: `${Math.min(100, balance.percentComplete)}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* Overtime */}
            <Card className="p-4 bg-white/80 backdrop-blur-md border-white/20 hover:shadow-lg transition-all duration-200" data-testid="stat-overtime">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Straordinari</p>
                  <p className={cn(
                    "text-2xl font-bold mt-1",
                    balance.overtimeHours > 0 ? "text-orange-600" : "text-gray-900 dark:text-white"
                  )}>
                    {balance.overtimeHours > 0 ? '+' : ''}{balance.overtimeHours.toFixed(1)}h
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {balance.overtimeHours > 0 ? 'Da recuperare' : 'Nessuno'}
                  </p>
                </div>
                <div className={cn(
                  "p-2 rounded-lg",
                  balance.overtimeHours > 0 ? "bg-orange-100" : "bg-gray-100"
                )}>
                  <TrendingUp className={cn(
                    "w-5 h-5",
                    balance.overtimeHours > 0 ? "text-orange-600" : "text-gray-600"
                  )} />
                </div>
              </div>
            </Card>

            {/* Balance */}
            <Card className="p-4 bg-white/80 backdrop-blur-md border-white/20 hover:shadow-lg transition-all duration-200" data-testid="stat-balance">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Saldo Ore</p>
                  <p className={cn(
                    "text-2xl font-bold mt-1",
                    balance.balanceHours > 0 ? "text-green-600" : balance.balanceHours < 0 ? "text-red-600" : "text-gray-900 dark:text-white"
                  )}>
                    {balance.balanceHours > 0 ? '+' : ''}{balance.balanceHours.toFixed(1)}h
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {balance.balanceHours > 0 ? 'Credito' : balance.balanceHours < 0 ? 'Debito' : 'In pari'}
                  </p>
                </div>
                <div className={cn(
                  "p-2 rounded-lg",
                  balance.balanceHours > 0 ? "bg-green-100" : 
                  balance.balanceHours < 0 ? "bg-red-100" : "bg-gray-100"
                )}>
                  <Activity className={cn(
                    "w-5 h-5",
                    balance.balanceHours > 0 ? "text-green-600" : 
                    balance.balanceHours < 0 ? "text-red-600" : "text-gray-600"
                  )} />
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="clock">Timbratura</TabsTrigger>
            <TabsTrigger value="entries">Registrazioni</TabsTrigger>
            <TabsTrigger value="reports">Report</TabsTrigger>
            <TabsTrigger value="settings">Impostazioni</TabsTrigger>
          </TabsList>

          {/* Clock Tab */}
          <TabsContent value="clock" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Clock Widget */}
              <ClockWidget
                storeId={selectedStore || currentUser?.storeId || ''}
                storeName={currentUser?.storeName}
                userId={currentUser?.id || ''}
                userName={currentUser?.fullName}
                onClockIn={refetchEntries}
                onClockOut={refetchEntries}
              />

              {/* Quick Info */}
              <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-400" />
                  Informazioni Utili
                </h3>
                
                <div className="space-y-4">
                  {/* Store Info */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">Store Assegnato</span>
                    </div>
                    <span className="text-sm font-medium">
                      {currentUser?.storeName || 'Non assegnato'}
                    </span>
                  </div>

                  {/* Working Hours */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">Orario Standard</span>
                    </div>
                    <span className="text-sm font-medium">09:00 - 18:00</span>
                  </div>

                  {/* Break Time */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">Pausa Obbligatoria</span>
                    </div>
                    <span className="text-sm font-medium">Dopo 6 ore</span>
                  </div>

                  {/* User Role */}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">Ruolo</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {currentUser?.role || 'EMPLOYEE'}
                    </Badge>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowDeviceSimulator(!showDeviceSimulator)}
                  >
                    {showDeviceSimulator ? 'Nascondi' : 'Mostra'} Simulatore Dispositivi
                  </Button>
                </div>
              </Card>
            </motion.div>

            {/* Device Simulator (Development) */}
            {showDeviceSimulator && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <DeviceSimulator
                  onDeviceRead={handleDeviceRead}
                  showInProduction={false}
                />
              </motion.div>
            )}
          </TabsContent>

          {/* Entries Tab */}
          <TabsContent value="entries" className="space-y-6">
            <TimeEntriesList
              entries={entries}
              loading={entriesLoading}
              userId={currentUser?.id}
              canEdit={permissions.canEditOwn}
              canApprove={permissions.canApproveTeam}
              onEdit={handleEditEntry}
              onApprove={handleApproveEntry}
              onDispute={handleDisputeEntry}
              onExport={handleExport}
            />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <TimeReports
              userId={currentUser?.id}
              storeId={selectedStore || currentUser?.storeId}
              startDate={dateRange.start}
              endDate={dateRange.end}
              reports={report ? [report] : []}
              teamReports={teamReports}
              loading={reportLoading || teamReportsLoading}
              onExport={handleExport}
            />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="p-6 bg-white/5 backdrop-blur-xl border-white/10">
              <h3 className="text-lg font-semibold mb-4">Impostazioni Time Tracking</h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <div className="flex items-center gap-2 text-orange-400 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">In Sviluppo</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Le impostazioni avanzate del sistema Time Tracking saranno disponibili prossimamente.
                  </p>
                </div>

                {/* Placeholder Settings */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-sm">Notifiche Timbratura</span>
                    <Badge variant="outline">Attivo</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-sm">Geolocalizzazione</span>
                    <Badge variant="outline">Permesso</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-sm">Validazione Automatica</span>
                    <Badge variant="outline">Disattivato</Badge>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}