// HRAttendance.tsx - Attendance Tracking using FormPageTemplate
import { FormPageTemplate } from '@w3suite/frontend-kit/templates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { 
  Clock, 
  LogIn, 
  LogOut,
  Users, 
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Play,
  Pause,
  MapPin,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Eye,
  Search
} from 'lucide-react';
import Layout from '@/components/Layout';
import { 
  useCurrentSession, 
  useClockIn, 
  useClockOut, 
  useTimeEntries,
  useTimeBalance,
  useExportEntries
} from '@/hooks/useTimeTracking';
import { TimeTrackingFilters } from '@/services/timeTrackingService';
import { useUsers, type User } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentTenantId } from '@/contexts/TenantContext';
import { useForm } from 'react-hook-form';
import { useState, useMemo } from 'react';
import { format, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';

// WindTre Color System - CSS VARIABLES
const BRAND_COLORS = {
  orange: 'hsl(var(--brand-orange))',
  purple: 'hsl(var(--brand-purple))',
};

interface ClockFormData {
  notes?: string;
  address?: string;
}


export default function HRAttendance() {
  const [selectedTab, setSelectedTab] = useState('clock');
  const [filters, setFilters] = useState<TimeTrackingFilters>({
    startDate: format(startOfWeek(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfWeek(new Date()), 'yyyy-MM-dd')
  });

  // Auth hooks for real user and tenant IDs
  const { user } = useAuth();
  const currentTenantId = useCurrentTenantId();

  // Clock Form
  const clockForm = useForm<ClockFormData>({
    defaultValues: {
      notes: '',
      address: ''
    }
  });

  // Hooks for attendance tracking
  const { session, isActive, elapsedMinutes, isOnBreak, isOvertime } = useCurrentSession();
  const clockIn = useClockIn();
  const clockOut = useClockOut();
  const { data: timeEntries = [], isLoading: entriesLoading } = useTimeEntries(filters);
  const { data: employees = [] } = useUsers();
  const exportEntries = useExportEntries();

  // Time balance for current user
  const { balance } = useTimeBalance(
    user?.id, 
    { 
      start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    }
  );

  // Handle clock in/out
  const handleClockIn = async (data: ClockFormData) => {
    try {
      await clockIn.mutateAsync({
        storeId: currentTenantId,
        trackingMethod: 'app',
        geoLocation: {
          lat: 0,
          lng: 0,
          accuracy: 10,
          address: data.address
        },
        notes: data.notes
      });
      clockForm.reset();
    } catch (error) {
      console.error('Clock in failed:', error);
    }
  };

  const handleClockOut = async (data: ClockFormData) => {
    if (!session?.id) return;
    
    try {
      await clockOut.mutateAsync({
        id: session.id,
        data: {
          geoLocation: {
            lat: 0,
            lng: 0,
            accuracy: 10,
            address: data.address
          },
          notes: data.notes
        }
      });
      clockForm.reset();
    } catch (error) {
      console.error('Clock out failed:', error);
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      await exportEntries.mutateAsync({
        filters,
        format: 'csv'
      });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Format time duration
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Additional actions for export
  const additionalActions = (
    <Button
      onClick={handleExport}
      disabled={exportEntries.isPending}
      data-testid="button-export-report"
    >
      <Download className="h-4 w-4 mr-2" />
      Esporta Report
    </Button>
  );

  // Breadcrumbs
  const breadcrumbs = [
    { label: 'HR', href: '/hr' },
    { label: 'Tracciamento Presenze', href: '/hr/presenze' }
  ];

  return (
    <Layout currentModule="hr" setCurrentModule={() => {}}>
      <FormPageTemplate
        title="Tracciamento Presenze"
        subtitle="Gestione clock in/out e orari lavorativi"
        breadcrumbs={breadcrumbs}
        form={clockForm}
        onSubmit={isActive ? handleClockOut : handleClockIn}
        additionalActions={additionalActions}
        maxWidth="full"
        className="space-y-6"
      >
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4" data-testid="tabs-attendance">
            <TabsTrigger value="clock" data-testid="tab-clock">
              <Clock className="h-4 w-4 mr-2" />
              Timbratura
            </TabsTrigger>
            <TabsTrigger value="status" data-testid="tab-status">
              <Users className="h-4 w-4 mr-2" />
              Status Dipendenti
            </TabsTrigger>
            <TabsTrigger value="entries" data-testid="tab-entries">
              <Calendar className="h-4 w-4 mr-2" />
              Lista Presenze
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Report Veloci
            </TabsTrigger>
          </TabsList>

          {/* Clock In/Out Tab */}
          <TabsContent value="clock" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Current Status Card */}
              <Card className="glass-card" data-testid="card-current-status">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" style={{ color: BRAND_COLORS.orange }} />
                    Status Corrente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Stato:</span>
                    <Badge 
                      variant={isActive ? "default" : "secondary"}
                      data-testid="badge-current-status"
                      style={{
                        backgroundColor: isActive ? BRAND_COLORS.orange : undefined,
                        color: isActive ? 'white' : undefined
                      }}
                    >
                      {isActive ? 'Presente' : 'Assente'}
                    </Badge>
                  </div>
                  
                  {isActive && session && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Entrata:</span>
                        <span className="font-medium" data-testid="text-clock-in-time">
                          {format(new Date(session.clockIn), 'HH:mm', { locale: it })}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Tempo trascorso:</span>
                        <span 
                          className="font-medium" 
                          data-testid="text-elapsed-time"
                          style={{ color: isOvertime ? BRAND_COLORS.purple : undefined }}
                        >
                          {formatDuration(elapsedMinutes)}
                        </span>
                      </div>

                      {isOnBreak && (
                        <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
                          <Pause className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm text-yellow-800">In pausa</span>
                        </div>
                      )}

                      {isOvertime && (
                        <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg">
                          <AlertCircle className="h-4 w-4" style={{ color: BRAND_COLORS.purple }} />
                          <span className="text-sm" style={{ color: BRAND_COLORS.purple }}>
                            Straordinario attivo
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Clock In/Out Form */}
              <Card className="glass-card" data-testid="card-clock-form">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {isActive ? (
                      <LogOut className="h-5 w-5" style={{ color: BRAND_COLORS.purple }} />
                    ) : (
                      <LogIn className="h-5 w-5" style={{ color: BRAND_COLORS.orange }} />
                    )}
                    {isActive ? 'Timbratura Uscita' : 'Timbratura Entrata'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Form {...clockForm}>
                    <FormField
                      control={clockForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Posizione (opzionale)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                {...field}
                                placeholder="Es. Ufficio principale, Punto vendita Roma"
                                className="pl-10"
                                data-testid="input-clock-location"
                              />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={clockForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Note (opzionale)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Es. Riunione, Trasferta, Lavoro da remoto"
                              data-testid="input-clock-note"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={clockIn.isPending || clockOut.isPending}
                      data-testid={isActive ? "button-clock-out" : "button-clock-in"}
                      style={{
                        backgroundColor: isActive ? BRAND_COLORS.purple : BRAND_COLORS.orange,
                        color: 'white'
                      }}
                    >
                      {(clockIn.isPending || clockOut.isPending) ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Elaborazione...
                        </>
                      ) : (
                        <>
                          {isActive ? (
                            <LogOut className="mr-2 h-4 w-4" />
                          ) : (
                            <LogIn className="mr-2 h-4 w-4" />
                          )}
                          {isActive ? 'Timbra Uscita' : 'Timbra Entrata'}
                        </>
                      )}
                    </Button>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Employee Status Tab */}
          <TabsContent value="status" className="space-y-6">
            <Card className="glass-card" data-testid="card-employee-status">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" style={{ color: BRAND_COLORS.orange }} />
                  Status Dipendenti in Tempo Reale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {(employees as User[]).slice(0, 6).map((employee: User) => (
                    <div
                      key={employee.id}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                      data-testid={`card-employee-status-${employee.id}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                        {(employee.firstName?.[0] || employee.email?.[0] || 'U').toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {employee.firstName && employee.lastName 
                            ? `${employee.firstName} ${employee.lastName}`
                            : employee.email?.split('@')[0] || 'N/A'
                          }
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          Presente dalle 09:00
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Entries Tab */}
          <TabsContent value="entries" className="space-y-6">
            {/* Filters */}
            <Card className="glass-card" data-testid="card-attendance-filters">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" style={{ color: BRAND_COLORS.orange }} />
                  Filtri Presenze
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Dipendente</label>
                    <select 
                      className="w-full border rounded-md px-3 py-2"
                      value={filters.userId || ''}
                      onChange={(e) => setFilters({...filters, userId: e.target.value || undefined})}
                      data-testid="select-employee-filter"
                    >
                      <option value="">Tutti i dipendenti</option>
                      {(employees as User[]).map((emp: User) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName && emp.lastName 
                            ? `${emp.firstName} ${emp.lastName}`
                            : emp.email?.split('@')[0] || 'N/A'
                          }
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Data Inizio</label>
                    <Input
                      type="date"
                      value={filters.startDate || ''}
                      onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                      data-testid="input-start-date-filter"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Data Fine</label>
                    <Input
                      type="date"
                      value={filters.endDate || ''}
                      onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                      data-testid="input-end-date-filter"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select 
                      className="w-full border rounded-md px-3 py-2"
                      value={filters.status || ''}
                      onChange={(e) => setFilters({...filters, status: (e.target.value as 'active' | 'completed' | 'edited' | 'disputed') || undefined})}
                      data-testid="select-status-filter"
                    >
                      <option value="">Tutti gli stati</option>
                      <option value="active">Attivo</option>
                      <option value="completed">Completato</option>
                      <option value="edited">Modificato</option>
                      <option value="disputed">Contestato</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Table */}
            <Card className="glass-card" data-testid="card-attendance-table">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" style={{ color: BRAND_COLORS.purple }} />
                  Lista Presenze
                </CardTitle>
              </CardHeader>
              <CardContent>
                {entriesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Caricamento presenze...</span>
                  </div>
                ) : timeEntries.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse" data-testid="table-attendance-entries">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Data</th>
                          <th className="text-left p-3">Dipendente</th>
                          <th className="text-left p-3">Entrata</th>
                          <th className="text-left p-3">Uscita</th>
                          <th className="text-left p-3">Ore Totali</th>
                          <th className="text-left p-3">Status</th>
                          <th className="text-left p-3">Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeEntries.map((entry: any) => (
                          <tr key={entry.id} className="border-b hover:bg-gray-50" data-testid={`row-entry-${entry.id}`}>
                            <td className="p-3">
                              {format(new Date(entry.date), 'dd/MM/yyyy', { locale: it })}
                            </td>
                            <td className="p-3">
                              <div className="font-medium">
                                {entry.user?.firstName && entry.user?.lastName 
                                  ? `${entry.user.firstName} ${entry.user.lastName}`
                                  : entry.user?.email?.split('@')[0] || 'N/A'
                                }
                              </div>
                            </td>
                            <td className="p-3">
                              {entry.clockIn ? format(new Date(entry.clockIn), 'HH:mm', { locale: it }) : '-'}
                            </td>
                            <td className="p-3">
                              {entry.clockOut ? format(new Date(entry.clockOut), 'HH:mm', { locale: it }) : '-'}
                            </td>
                            <td className="p-3">
                              {entry.totalMinutes ? formatDuration(entry.totalMinutes) : '-'}
                            </td>
                            <td className="p-3">
                              <Badge 
                                variant={entry.status === 'approved' ? 'default' : 'secondary'}
                                data-testid={`badge-entry-status-${entry.id}`}
                              >
                                {entry.status === 'completed' ? 'Completato' : 
                                 entry.status === 'active' ? 'Attivo' : 
                                 entry.status === 'edited' ? 'Modificato' : 
                                 entry.status === 'disputed' ? 'Contestato' : 'Sconosciuto'}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <Button
                                size="sm"
                                variant="ghost"
                                data-testid={`button-view-entry-${entry.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nessuna presenza trovata per i filtri selezionati.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quick Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Today's Hours */}
              <Card className="glass-card" data-testid="card-today-hours">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Ore Oggi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" style={{ color: BRAND_COLORS.orange }}>
                    {isActive ? formatDuration(elapsedMinutes) : '0h 0m'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isActive ? 'In corso' : 'Non presente'}
                  </p>
                </CardContent>
              </Card>

              {/* Week's Hours */}
              <Card className="glass-card" data-testid="card-week-hours">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Ore Settimana</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" style={{ color: BRAND_COLORS.purple }}>
                    {formatDuration(balance.totalHours * 60)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {balance.percentComplete.toFixed(1)}% del target
                  </p>
                </CardContent>
              </Card>

              {/* Month's Hours */}
              <Card className="glass-card" data-testid="card-month-hours">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Ore Mese</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" style={{ color: BRAND_COLORS.orange }}>
                    {formatDuration(balance.totalHours * 60)}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Saldo: {balance.balanceHours >= 0 ? '+' : ''}{balance.balanceHours.toFixed(1)}h
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Overtime Alert */}
            {balance.overtimeHours > 0 && (
              <Card className="glass-card border-purple-200" data-testid="card-overtime-alert">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-800">
                    <AlertCircle className="h-5 w-5" />
                    Straordinari
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold" style={{ color: BRAND_COLORS.purple }}>
                    {formatDuration(balance.overtimeHours * 60)} di straordinari questo mese
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Assicurati di rispettare i limiti contrattuali e le normative vigenti.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </FormPageTemplate>
    </Layout>
  );
}