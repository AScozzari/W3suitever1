// Shift Planning Page - Enterprise HR Management System with frontend-kit
import { useState, useMemo, useEffect } from 'react';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import { Column } from '@/components/templates/DataTable';
import {
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  FileText,
  Settings,
  TrendingUp,
  Download,
  Plus,
  RefreshCw,
  Timer,
  UserCheck,
  UserX,
  CalendarDays,
  BarChart3,
  Zap,
  CheckCircle2,
  AlertCircle,
  Layers,
  Shield,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, eachDayOfInterval } from 'date-fns';
import { it } from 'date-fns/locale';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  useShifts,
  useShiftTemplates,
  useStaffAvailability,
  useShiftConflicts,
  useCoverageAnalysis,
  useAutoSchedule,
  useShiftStats,
} from '@/hooks/useShiftPlanning';
import { useStores } from '@/hooks/useStores';
import { queryClient } from '@/lib/queryClient';
import ShiftCalendar from '../components/Shifts/ShiftCalendar';
import ShiftTemplateManager from '../components/Shifts/ShiftTemplateManager';
import StaffAssignment from '../components/Shifts/StaffAssignment';
import CoverageAnalysis from '../components/Shifts/CoverageAnalysis';
import ShiftReports from '../components/Shifts/ShiftReports';
import ShiftEditorModal from '../components/Shifts/ShiftEditorModal';

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

type ViewMode = 'week' | 'month' | 'day';
type TabView = 'dashboard' | 'calendar' | 'templates' | 'coverage' | 'reports';

export default function ShiftPlanningPage() {
  const [currentModule, setCurrentModule] = useState('shift-planning');
  const { toast } = useToast();
  
  // State management
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabView>('dashboard');
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Load stores
  const { stores, isLoading: storesLoading } = useStores();
  
  // Calculate date range based on view mode
  const getDateRange = () => {
    switch (viewMode) {
      case 'week':
        return {
          start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
          end: endOfWeek(selectedDate, { weekStartsOn: 1 })
        };
      case 'month':
        return {
          start: startOfMonth(selectedDate),
          end: endOfMonth(selectedDate)
        };
      default:
        return {
          start: selectedDate,
          end: selectedDate
        };
    }
  };
  
  const dateRange = getDateRange();
  
  // Hooks for shift management
  const {
    shifts,
    isLoading: shiftsLoading,
    createShift,
    updateShift,
    deleteShift,
    assignUser,
    unassignUser
  } = useShifts(selectedStore, dateRange.start, dateRange.end);
  
  const { templates, applyTemplate } = useShiftTemplates();
  const { availability } = useStaffAvailability(selectedStore, dateRange.start, dateRange.end);
  const { conflicts, hasConflicts, errorCount, warningCount } = useShiftConflicts(selectedStore);
  const { 
    analysis, 
    avgCoverage, 
    understaffedHours, 
    criticalHours 
  } = useCoverageAnalysis(selectedStore, dateRange.start, dateRange.end);
  const { autoSchedule, isScheduling } = useAutoSchedule();
  const { stats, isLoading: statsLoading } = useShiftStats(selectedStore, dateRange.start, dateRange.end);
  
  // Calculate metrics
  const totalShifts = shifts?.length || 0;
  const understaffedShifts = shifts?.filter(s => 
    (s.assignedUsers?.length || 0) < s.requiredStaff
  ).length || 0;
  const totalHours = stats?.totalHours || 0;
  const coverageRate = stats?.coverageRate || 100;
  
  // Set default store
  useEffect(() => {
    if (stores?.length > 0 && !selectedStore) {
      setSelectedStore(stores[0].id);
    }
  }, [stores, selectedStore]);
  
  // Prepare metrics for dashboard
  const metrics: MetricCard[] = useMemo(() => [
    {
      id: 'total-shifts',
      title: 'Turni Totali',
      value: totalShifts,
      description: `${viewMode === 'week' ? 'Settimana' : viewMode === 'month' ? 'Mese' : 'Giorno'} corrente`,
      icon: <Calendar className="h-4 w-4 text-blue-600" />,
    },
    {
      id: 'coverage',
      title: 'Copertura',
      value: `${coverageRate}%`,
      description: understaffedShifts > 0 ? `${understaffedShifts} turni scoperti` : 'Completa',
      trend: coverageRate < 100 ? { value: coverageRate - 100, label: 'Sotto target' } : undefined,
      icon: <Users className="h-4 w-4 text-green-600" />,
    },
    {
      id: 'hours',
      title: 'Ore Totali',
      value: totalHours.toFixed(1),
      description: `${stats?.averageStaffPerShift || 0} staff medio`,
      icon: <Clock className="h-4 w-4 text-purple-600" />,
    },
    {
      id: 'conflicts',
      title: 'Conflitti',
      value: errorCount + warningCount,
      description: `${errorCount} errori, ${warningCount} avvisi`,
      trend: hasConflicts ? { value: -100, label: 'Richiede attenzione' } : undefined,
      icon: <AlertTriangle className="h-4 w-4 text-orange-600" />,
    },
  ], [totalShifts, coverageRate, understaffedShifts, totalHours, stats, errorCount, warningCount, hasConflicts, viewMode]);
  
  // Prepare columns for shift list
  const shiftColumns: Column[] = useMemo(() => [
    {
      key: 'date',
      label: 'Data',
      render: (shift: any) => format(new Date(shift.date), 'dd/MM/yyyy', { locale: it }),
    },
    {
      key: 'time',
      label: 'Orario',
      render: (shift: any) => `${format(new Date(shift.startTime), 'HH:mm')} - ${format(new Date(shift.endTime), 'HH:mm')}`,
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (shift: any) => (
        <Badge variant="outline">
          {shift.type || 'Standard'}
        </Badge>
      ),
    },
    {
      key: 'staff',
      label: 'Staff',
      render: (shift: any) => (
        <div className="flex items-center gap-2">
          <span>{shift.assignedUsers?.length || 0}/{shift.requiredStaff}</span>
          {(shift.assignedUsers?.length || 0) < shift.requiredStaff && (
            <AlertCircle className="h-4 w-4 text-orange-500" />
          )}
        </div>
      ),
    },
    {
      key: 'store',
      label: 'Negozio',
      render: (shift: any) => shift.storeName || stores?.find(s => s.id === shift.storeId)?.name || 'N/A',
    },
    {
      key: 'status',
      label: 'Stato',
      render: (shift: any) => {
        const isFullyStaffed = (shift.assignedUsers?.length || 0) >= shift.requiredStaff;
        return (
          <Badge variant={isFullyStaffed ? 'default' : 'destructive'}>
            {isFullyStaffed ? 'Completo' : 'Incompleto'}
          </Badge>
        );
      },
    },
  ], [stores]);
  
  // Handlers
  const handleCreateShift = () => {
    setSelectedShift(null);
    setIsShiftModalOpen(true);
  };
  
  const handleEditShift = (shift: any) => {
    setSelectedShift(shift);
    setIsShiftModalOpen(true);
  };
  
  const handleSaveShift = async (shiftData: any) => {
    try {
      if (selectedShift) {
        await updateShift(selectedShift.id, shiftData);
        toast({ 
          title: "Turno aggiornato",
          description: "Le modifiche sono state salvate"
        });
      } else {
        await createShift(shiftData);
        toast({ 
          title: "Turno creato",
          description: "Il nuovo turno è stato aggiunto"
        });
      }
      setIsShiftModalOpen(false);
    } catch (error) {
      toast({ 
        title: "Errore",
        description: "Si è verificato un errore durante il salvataggio",
        variant: "destructive"
      });
    }
  };
  
  const handleAutoSchedule = async () => {
    if (!selectedStore) {
      toast({ 
        title: "Seleziona un negozio",
        description: "Devi selezionare un negozio prima di procedere",
        variant: "destructive"
      });
      return;
    }
    
    autoSchedule({
      storeId: selectedStore,
      startDate: dateRange.start,
      endDate: dateRange.end,
      constraints: {
        minStaffPerShift: 2,
        maxHoursPerWeek: 40,
        respectAvailability: true,
      }
    });
  };
  
  const handleApplyTemplate = async (templateId: string) => {
    if (!selectedStore) {
      toast({ 
        title: "Seleziona un negozio",
        description: "Devi selezionare un negozio prima di applicare il template",
        variant: "destructive"
      });
      return;
    }
    
    applyTemplate(templateId, selectedStore, dateRange.start, dateRange.end);
  };
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts/stats'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts/coverage-analysis'] }),
    ]);
    setIsRefreshing(false);
    toast({
      title: 'Dashboard aggiornato',
      description: 'Tutti i dati sono stati aggiornati',
    });
  };
  
  const handleExport = () => {
    const csv = [
      ['Data', 'Orario', 'Tipo', 'Staff Assegnato', 'Staff Richiesto', 'Negozio', 'Stato'],
      ...(shifts || []).map(s => [
        format(new Date(s.date), 'dd/MM/yyyy'),
        `${format(new Date(s.startTime), 'HH:mm')} - ${format(new Date(s.endTime), 'HH:mm')}`,
        s.type || 'Standard',
        s.assignedUsers?.length || 0,
        s.requiredStaff,
        s.storeName || '',
        (s.assignedUsers?.length || 0) >= s.requiredStaff ? 'Completo' : 'Incompleto'
      ])
    ];
    
    const csvContent = csv.map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shifts-${format(dateRange.start, 'yyyy-MM-dd')}-${format(dateRange.end, 'yyyy-MM-dd')}.csv`;
    a.click();
    
    toast({
      title: "Export completato",
      description: "Il file CSV è stato scaricato"
    });
  };
  
  // Quick actions for dashboard
  const quickActions = [
    {
      label: 'Nuovo Turno',
      icon: <Plus className="h-4 w-4" />,
      onClick: handleCreateShift,
      variant: 'default' as const,
    },
    {
      label: 'Auto-Schedule',
      icon: <Zap className="h-4 w-4" />,
      onClick: handleAutoSchedule,
      variant: 'outline' as const,
      disabled: isScheduling,
    },
  ];
  
  // Render content based on tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardTemplate
            title="Dashboard Turni"
            subtitle={`${stores?.find(s => s.id === selectedStore)?.name || 'Seleziona negozio'} • ${format(dateRange.start, 'dd MMM', { locale: it })} - ${format(dateRange.end, 'dd MMM yyyy', { locale: it })}`}
            metrics={metrics}
            metricsLoading={shiftsLoading || statsLoading}
            quickActions={quickActions}
            showFilters={true}
            filters={[
              <Select key="store" value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger className="w-[200px]" data-testid="select-store">
                  <SelectValue placeholder="Seleziona negozio" />
                </SelectTrigger>
                <SelectContent>
                  {stores?.map(store => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>,
              <Select key="view" value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <SelectTrigger className="w-[150px]" data-testid="select-view-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Giorno</SelectItem>
                  <SelectItem value="week">Settimana</SelectItem>
                  <SelectItem value="month">Mese</SelectItem>
                </SelectContent>
              </Select>
            ]}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onExport={handleExport}
            lastUpdated={new Date()}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Coverage Analysis Chart */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Analisi Copertura</CardTitle>
                  <CardDescription>
                    Copertura media: {avgCoverage}%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Ore Scoperte</span>
                      <span className="text-sm font-medium">{understaffedHours}</span>
                    </div>
                    <Progress value={avgCoverage} className="h-2" />
                    {criticalHours > 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Attenzione</AlertTitle>
                        <AlertDescription>
                          {criticalHours} ore con copertura critica (&lt;60%)
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Conflicts Summary */}
              {hasConflicts && (
                <Card className="glass-card border-orange-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Conflitti Rilevati
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {conflicts?.slice(0, 5).map((conflict: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-2">
                          {conflict.severity === 'error' ? (
                            <AlertCircle className="h-4 w-4 text-red-500 mt-1" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-orange-500 mt-1" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{conflict.type}</p>
                            <p className="text-xs text-gray-500">{conflict.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Staff Availability Summary */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Disponibilità Staff</CardTitle>
                  <CardDescription>Personale disponibile nel periodo</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {availability?.slice(0, 5).map((staff: any) => (
                      <div key={staff.userId} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{staff.userName}</span>
                        </div>
                        <Badge variant="outline">
                          {staff.availableHours}h disponibili
                        </Badge>
                      </div>
                    ))}
                    {(!availability || availability.length === 0) && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Nessuna disponibilità registrata
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Templates Quick Access */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Template Rapidi</CardTitle>
                  <CardDescription>Applica un template predefinito</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {templates?.slice(0, 3).map((template: any) => (
                      <Button
                        key={template.id}
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => handleApplyTemplate(template.id)}
                        data-testid={`button-apply-template-${template.id}`}
                      >
                        <span className="flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          {template.name}
                        </span>
                        <Badge variant="secondary">{template.shiftsCount} turni</Badge>
                      </Button>
                    ))}
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => setActiveTab('templates')}
                      data-testid="button-view-all-templates"
                    >
                      Visualizza tutti i template →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DashboardTemplate>
        );
        
      case 'calendar':
        return (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Calendario Turni</CardTitle>
              <CardDescription>
                Visualizzazione e gestione turni per {stores?.find(s => s.id === selectedStore)?.name || 'tutti i negozi'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ShiftCalendar
                shifts={shifts || []}
                selectedDate={selectedDate}
                viewMode={viewMode}
                onDateSelect={setSelectedDate}
                onShiftClick={handleEditShift}
                onCreateShift={handleCreateShift}
              />
            </CardContent>
          </Card>
        );
        
      case 'templates':
        return (
          <ShiftTemplateManager
            templates={templates || []}
            onApply={handleApplyTemplate}
            selectedStore={selectedStore}
          />
        );
        
      case 'coverage':
        return (
          <CoverageAnalysis
            analysis={analysis || []}
            avgCoverage={avgCoverage}
            understaffedHours={understaffedHours}
            criticalHours={criticalHours}
            selectedStore={selectedStore}
            dateRange={dateRange}
          />
        );
        
      case 'reports':
        return (
          <ShiftReports
            shifts={shifts || []}
            stats={stats}
            selectedStore={selectedStore}
            dateRange={dateRange}
            onExport={handleExport}
          />
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="p-6 space-y-6" data-testid="shift-planning-page">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
              Pianificazione Turni
            </h1>
            <p className="text-gray-600 mt-1">
              Gestione intelligente dei turni e del personale
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleExport}
              data-testid="button-export"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Store Alert if not selected */}
        {!selectedStore && stores?.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Seleziona un negozio</AlertTitle>
            <AlertDescription>
              Seleziona un negozio per visualizzare e gestire i turni
            </AlertDescription>
          </Alert>
        )}
        
        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabView)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="calendar">
              Calendario
              {understaffedShifts > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {understaffedShifts}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="templates">Template</TabsTrigger>
            <TabsTrigger value="coverage">Copertura</TabsTrigger>
            <TabsTrigger value="reports">Report</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-6">
            {renderContent()}
          </TabsContent>
        </Tabs>
        
        {/* Shift Editor Modal */}
        {isShiftModalOpen && (
          <ShiftEditorModal
            shift={selectedShift}
            open={isShiftModalOpen}
            onClose={() => {
              setIsShiftModalOpen(false);
              setSelectedShift(null);
            }}
            onSave={handleSaveShift}
            storeId={selectedStore}
          />
        )}
      </div>
    </Layout>
  );
}