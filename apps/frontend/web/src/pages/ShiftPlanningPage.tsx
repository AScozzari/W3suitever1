import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Users, AlertTriangle, FileText, Settings, TrendingUp, Download } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import Layout from '@/components/Layout';
import ShiftCalendar from '../components/Shifts/ShiftCalendar';
import ShiftTemplateManager from '../components/Shifts/ShiftTemplateManager';
import StaffAssignment from '../components/Shifts/StaffAssignment';
import CoverageAnalysis from '../components/Shifts/CoverageAnalysis';
import ShiftReports from '../components/Shifts/ShiftReports';
import ShiftEditorModal from '../components/Shifts/ShiftEditorModal';
import { useShifts, useShiftTemplates, useStaffAvailability, useShiftConflicts } from '@/hooks/useShiftPlanning';
import { useStores } from '@/hooks/useStores';
import { useToast } from '@/hooks/use-toast';

type ViewMode = 'week' | 'month' | 'day';
type TabView = 'calendar' | 'templates' | 'coverage' | 'reports';

export default function ShiftPlanningPage() {
  const [currentModule, setCurrentModule] = useState('shift-planning');
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabView>('calendar');
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  
  const { toast } = useToast();
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
  const { conflicts } = useShiftConflicts(selectedStore);
  
  // Stats calculations
  const totalShifts = shifts?.length || 0;
  const understaffedShifts = shifts?.filter(s => 
    (s.assignedUsers?.length || 0) < s.requiredStaff
  ).length || 0;
  const totalHours = shifts?.reduce((sum, shift) => {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return sum + hours * (shift.assignedUsers?.length || 0);
  }, 0) || 0;
  
  const coverageRate = totalShifts > 0 
    ? Math.round(((totalShifts - understaffedShifts) / totalShifts) * 100)
    : 100;
  
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
    
    try {
      const response = await fetch('/api/hr/shifts/auto-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: selectedStore,
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString()
        })
      });
      
      if (!response.ok) throw new Error('Auto-scheduling failed');
      
      toast({
        title: "Auto-scheduling completato",
        description: "I turni sono stati assegnati automaticamente"
      });
      
      // Refresh shifts
      window.location.reload();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Auto-scheduling fallito",
        variant: "destructive"
      });
    }
  };
  
  const handleExport = () => {
    // Implement export functionality
    toast({
      title: "Export in corso",
      description: "Il file sarà pronto a breve"
    });
  };
  
  // Set default store
  useEffect(() => {
    if (stores?.length > 0 && !selectedStore) {
      setSelectedStore(stores[0].id);
    }
  }, [stores, selectedStore]);
  
  if (storesLoading || !stores) {
    return <div className="p-8">Caricamento...</div>;
  }
  
  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="p-6 space-y-6 max-w-7xl mx-auto" data-testid="shift-planning-page">
        {/* Header with Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-md rounded-xl shadow-xl p-6 border border-white/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent mb-2">
                Pianificazione Turni
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Gestisci turni e assegnazioni del personale
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Select value={selectedStore} onValueChange={setSelectedStore} data-testid="select-store">
                <SelectTrigger className="w-[200px] bg-white/60 backdrop-blur border-white/30">
                  <SelectValue placeholder="Seleziona negozio" />
                </SelectTrigger>
                <SelectContent>
                  {stores?.map(store => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button 
                onClick={handleAutoSchedule}
                variant="outline"
                className="bg-white/60 backdrop-blur border-white/30"
                data-testid="button-auto-schedule"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Auto-Schedule
              </Button>
              
              <Button 
                onClick={handleExport}
                variant="outline"
                className="bg-white/60 backdrop-blur border-white/30"
                data-testid="button-export"
              >
                <Download className="h-4 w-4 mr-2" />
                Esporta
              </Button>
              
              <Button 
                onClick={handleCreateShift}
                className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                data-testid="button-create-shift"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Nuovo Turno
              </Button>
            </div>
          </div>
        </motion.div>
      
        {/* Stats Cards with Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <Card className="bg-white/80 backdrop-blur-md border-white/20 hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Turni Totali
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="stat-total-shifts">
                  {totalShifts}
                </span>
                <Calendar className="h-5 w-5 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-md border-white/20 hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Copertura
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="stat-coverage">
                  {coverageRate}%
                </span>
                <Users className="h-5 w-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-md border-white/20 hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Ore Totali
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="stat-total-hours">
                  {Math.round(totalHours)}
                </span>
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-md border-white/20 hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Conflitti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-red-600" data-testid="stat-conflicts">
                  {conflicts?.length || 0}
                </span>
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              {conflicts?.length > 0 && (
                <Badge variant="destructive" className="mt-2">
                  Richiede attenzione
                </Badge>
              )}
            </CardContent>
          </Card>
        </motion.div>
      
        {/* Main Content Tabs with Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white/80 backdrop-blur-md border-white/20 min-h-[600px]">
            <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabView)}>
            <div className="flex items-center justify-between mb-6">
              <TabsList className="grid grid-cols-4 w-[500px]">
                <TabsTrigger value="calendar" data-testid="tab-calendar">
                  <Calendar className="h-4 w-4 mr-2" />
                  Calendario
                </TabsTrigger>
                <TabsTrigger value="templates" data-testid="tab-templates">
                  <FileText className="h-4 w-4 mr-2" />
                  Template
                </TabsTrigger>
                <TabsTrigger value="coverage" data-testid="tab-coverage">
                  <Users className="h-4 w-4 mr-2" />
                  Copertura
                </TabsTrigger>
                <TabsTrigger value="reports" data-testid="tab-reports">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Report
                </TabsTrigger>
              </TabsList>
              
              <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <SelectTrigger className="w-[150px]" data-testid="select-view-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Giornaliero</SelectItem>
                  <SelectItem value="week">Settimanale</SelectItem>
                  <SelectItem value="month">Mensile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <TabsContent value="calendar" className="space-y-4">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-9">
                  <ShiftCalendar
                    shifts={shifts || []}
                    viewMode={viewMode}
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    onShiftClick={handleEditShift}
                    onShiftDrop={async (shiftId, newDate, newTime) => {
                      await updateShift(shiftId, { date: newDate, startTime: newTime });
                    }}
                  />
                </div>
                <div className="col-span-3">
                  <StaffAssignment
                    storeId={selectedStore}
                    selectedDate={selectedDate}
                    shifts={shifts || []}
                    availability={availability || []}
                    onAssign={assignUser}
                    onUnassign={unassignUser}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="templates">
              <ShiftTemplateManager
                templates={templates || []}
                storeId={selectedStore}
                onApplyTemplate={async (templateId, startDate, endDate) => {
                  await applyTemplate(templateId, selectedStore, startDate, endDate);
                  toast({
                    title: "Template applicato",
                    description: "I turni sono stati creati dal template"
                  });
                }}
              />
            </TabsContent>
            
            <TabsContent value="coverage">
              <CoverageAnalysis
                storeId={selectedStore}
                dateRange={dateRange}
                shifts={shifts || []}
              />
            </TabsContent>
            
            <TabsContent value="reports">
              <ShiftReports
                storeId={selectedStore}
                dateRange={dateRange}
                shifts={shifts || []}
              />
            </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
        
        {/* Shift Editor Modal */}
        {isShiftModalOpen && (
          <ShiftEditorModal
            isOpen={isShiftModalOpen}
            onClose={() => setIsShiftModalOpen(false)}
            shift={selectedShift}
            storeId={selectedStore}
            onSave={handleSaveShift}
          />
        )}
      </div>
    </Layout>
  );
}