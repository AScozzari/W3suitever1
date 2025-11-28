import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Store as StoreIcon, Calendar as CalendarIcon, Users, 
  ChevronLeft, ChevronRight, Check, AlertTriangle, AlertCircle,
  Clock, CheckCircle2, XCircle, User, Plus, Minus, 
  ArrowRight, Layers, Eye, Save, RotateCcw
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isWeekend, getDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { useShiftPlanningStore, type ShiftTemplate, type TimeSlot, type ResourceAssignment } from '@/stores/shiftPlanningStore';

interface Store {
  id: string;
  name?: string;
  nome?: string;
  code?: string;
}

interface ApiShiftTemplate {
  id: string;
  name: string;
  scope?: 'global' | 'store';
  storeId?: string | null;
  color?: string;
  timeSlots?: Array<{
    id?: string;
    startTime: string;
    endTime: string;
    name?: string;
    requiredStaff?: number;
  }>;
  defaultStartTime?: string;
  defaultEndTime?: string;
}

interface Resource {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role?: string;
  storeId?: string;
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const DAY_NAMES_FULL = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

export default function ShiftPlanningWorkspace() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Zustand store
  const {
    currentPhase,
    selectedStoreId,
    selectedStoreName,
    periodStart,
    periodEnd,
    templateSelections,
    resourceAssignments,
    coveragePreview,
    setStore,
    setPeriod,
    addTemplateSelection,
    removeTemplateSelection,
    toggleDayForTemplate,
    selectAllDaysForTemplate,
    clearAllDaysForTemplate,
    assignResource,
    removeResourceAssignment,
    goToPhase,
    computeCoverage,
    resetPlanning
  } = useShiftPlanningStore();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [selectedSlotForAssignment, setSelectedSlotForAssignment] = useState<{
    templateId: string;
    slotId: string;
    day: string;
    startTime: string;
    endTime: string;
    templateName: string;
  } | null>(null);
  
  // Fetch stores
  const { data: stores = [] } = useQuery<Store[]>({
    queryKey: ['/api/stores'],
  });

  // Fetch templates for selected store (global + store-specific)
  const { data: apiTemplates = [], isLoading: templatesLoading } = useQuery<ApiShiftTemplate[]>({
    queryKey: ['/api/hr/shift-templates', { storeId: selectedStoreId }],
    enabled: !!selectedStoreId,
  });

  // Fetch resources/users
  const { data: resources = [] } = useQuery<Resource[]>({
    queryKey: ['/api/users', selectedStoreId],
    enabled: !!selectedStoreId,
  });
  
  // Period calculations
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  
  const periodDays = useMemo(() => {
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [weekStart, weekEnd]);
  
  // Convert API templates to store format
  const templates: ShiftTemplate[] = useMemo(() => {
    return apiTemplates.map(t => ({
      id: t.id,
      name: t.name,
      color: t.color || '#FF6900',
      scope: t.scope || (t.storeId ? 'store' : 'global'),
      storeId: t.storeId || null,
      timeSlots: (t.timeSlots || []).map((slot, idx) => ({
        id: slot.id || `slot-${idx}`,
        startTime: slot.startTime,
        endTime: slot.endTime,
        label: slot.name || `${slot.startTime}-${slot.endTime}`,
        requiredStaff: slot.requiredStaff || 1
      }))
    }));
  }, [apiTemplates]);
  
  // Update period in store when currentDate changes
  useEffect(() => {
    setPeriod(weekStart, weekEnd);
  }, [weekStart, weekEnd, setPeriod]);
  
  // Navigate week
  function navigateWeek(direction: 'prev' | 'next') {
    setCurrentDate(prev => addDays(prev, direction === 'next' ? 7 : -7));
  }
  
  // Handle store selection
  function handleStoreSelect(storeId: string) {
    const store = stores.find(s => s.id === storeId);
    if (store) {
      setStore(storeId, store.nome || store.name || '');
    }
  }
  
  // Handle template toggle (multi-select)
  function handleTemplateToggle(template: ShiftTemplate) {
    const isSelected = templateSelections.find(ts => ts.templateId === template.id);
    if (isSelected) {
      removeTemplateSelection(template.id);
    } else {
      addTemplateSelection(template);
    }
  }
  
  // Get days as ISO strings for the current period
  const periodDayStrings = useMemo(() => {
    return periodDays.map(d => format(d, 'yyyy-MM-dd'));
  }, [periodDays]);
  
  // Compute coverage stats per day
  const dayCoverageStats = useMemo(() => {
    const stats: Record<string, { total: number; covered: number; partial: number; uncovered: number }> = {};
    
    periodDayStrings.forEach(day => {
      const daySlots = coveragePreview.filter(s => s.day === day);
      stats[day] = {
        total: daySlots.length,
        covered: daySlots.filter(s => s.coverageStatus === 'covered').length,
        partial: daySlots.filter(s => s.coverageStatus === 'partial').length,
        uncovered: daySlots.filter(s => s.coverageStatus === 'uncovered').length
      };
    });
    
    return stats;
  }, [periodDayStrings, coveragePreview]);
  
  // Get slots for a specific day grouped by template
  const getSlotsForDay = (day: string) => {
    return coveragePreview.filter(s => s.day === day);
  };
  
  // Open resource assignment modal
  function openResourceModal(templateId: string, slotId: string, day: string, startTime: string, endTime: string, templateName: string) {
    setSelectedSlotForAssignment({ templateId, slotId, day, startTime, endTime, templateName });
    setShowResourceModal(true);
  }
  
  // Assign resource to slot
  function handleAssignResource(resource: Resource) {
    if (!selectedSlotForAssignment) return;
    
    assignResource({
      resourceId: resource.id,
      resourceName: `${resource.firstName || ''} ${resource.lastName || ''}`.trim() || resource.email,
      templateId: selectedSlotForAssignment.templateId,
      slotId: selectedSlotForAssignment.slotId,
      day: selectedSlotForAssignment.day
    });
    
    toast({
      title: 'Risorsa assegnata',
      description: `${resource.firstName || resource.email} assegnato alla fascia ${selectedSlotForAssignment.startTime}-${selectedSlotForAssignment.endTime}`
    });
  }
  
  // Get assigned resources for a slot
  function getAssignedResources(templateId: string, slotId: string, day: string): ResourceAssignment[] {
    return resourceAssignments.filter(
      ra => ra.templateId === templateId && ra.slotId === slotId && ra.day === day
    );
  }
  
  // Save planning mutation
  const savePlanningMutation = useMutation({
    mutationFn: async () => {
      // Build bulk data from selections
      // Use consistent slotId generation matching the store
      const shifts = templateSelections.flatMap(ts => 
        ts.selectedDays.flatMap(day => 
          ts.template.timeSlots.map((slot, slotIndex) => {
            const slotId = slot.id || `slot-${slotIndex}`;
            return {
              templateId: ts.templateId,
              storeId: selectedStoreId,
              date: day,
              startTime: slot.startTime,
              endTime: slot.endTime,
              slotId, // Include slotId for backend reference
              assignments: getAssignedResources(ts.templateId, slotId, day).map(ra => ra.resourceId)
            };
          })
        )
      );
      
      return apiRequest('/api/hr/shifts/bulk-planning', {
        method: 'POST',
        body: JSON.stringify({ shifts, storeId: selectedStoreId })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts'] });
      toast({
        title: 'Pianificazione salvata!',
        description: 'I turni e le assegnazioni sono stati salvati con successo'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore salvataggio',
        description: error.message || 'Errore nel salvataggio della pianificazione',
        variant: 'destructive'
      });
    }
  });
  
  // Check if a resource is already assigned to a slot
  function isResourceAssigned(resourceId: string, templateId: string, slotId: string, day: string): boolean {
    return resourceAssignments.some(
      ra => ra.resourceId === resourceId && ra.templateId === templateId && ra.slotId === slotId && ra.day === day
    );
  }
  
  // Coverage status color
  function getCoverageColor(status: 'covered' | 'partial' | 'uncovered'): string {
    switch (status) {
      case 'covered': return 'bg-green-100 border-green-300 text-green-800';
      case 'partial': return 'bg-amber-100 border-amber-300 text-amber-800';
      case 'uncovered': return 'bg-red-100 border-red-300 text-red-800';
    }
  }
  
  // Day coverage badge color
  function getDayCoverageColor(stats: { total: number; covered: number; partial: number; uncovered: number }): string {
    if (stats.total === 0) return 'bg-gray-100 text-gray-500';
    if (stats.uncovered > 0) return 'bg-red-500 text-white';
    if (stats.partial > 0) return 'bg-amber-500 text-white';
    return 'bg-green-500 text-white';
  }
  
  // Total coverage percentage
  const totalCoverage = useMemo(() => {
    const total = coveragePreview.length;
    if (total === 0) return 0;
    const covered = coveragePreview.filter(s => s.coverageStatus === 'covered').length;
    return Math.round((covered / total) * 100);
  }, [coveragePreview]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Layers className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Pianificazione Turni</h2>
              <p className="text-sm text-muted-foreground">
                {currentPhase === 1 ? 'Fase 1: Seleziona template e giorni' : 'Fase 2: Assegna risorse alle fasce'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Phase indicator */}
            <div className="flex items-center gap-1 mr-4">
              <Button
                variant={currentPhase === 1 ? 'default' : 'outline'}
                size="sm"
                onClick={() => goToPhase(1)}
                className="gap-1"
                data-testid="btn-phase-1"
              >
                <CalendarIcon className="w-4 h-4" />
                Template
              </Button>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <Button
                variant={currentPhase === 2 ? 'default' : 'outline'}
                size="sm"
                onClick={() => goToPhase(2)}
                disabled={templateSelections.length === 0}
                className="gap-1"
                data-testid="btn-phase-2"
              >
                <Users className="w-4 h-4" />
                Risorse
              </Button>
            </div>
            
            {/* Coverage indicator */}
            {templateSelections.length > 0 && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-sm",
                  totalCoverage >= 80 ? "bg-green-50 text-green-700 border-green-200" :
                  totalCoverage >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" :
                  "bg-red-50 text-red-700 border-red-200"
                )}
              >
                Copertura: {totalCoverage}%
              </Badge>
            )}
            
            {/* Actions */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetPlanning()}
              data-testid="btn-reset"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
            
            <Button
              size="sm"
              onClick={() => savePlanningMutation.mutate()}
              disabled={templateSelections.length === 0 || savePlanningMutation.isPending}
              data-testid="btn-save-planning"
            >
              <Save className="w-4 h-4 mr-1" />
              Salva Pianificazione
            </Button>
          </div>
        </div>

        {/* Main content: 3-panel layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel: Context (Store, Period) */}
          <div className="w-64 border-r bg-gray-50 p-4 flex flex-col">
            <div className="space-y-4">
              {/* Store selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <StoreIcon className="w-4 h-4" />
                  Punto Vendita
                </Label>
                <Select value={selectedStoreId || ''} onValueChange={handleStoreSelect}>
                  <SelectTrigger data-testid="select-store">
                    <SelectValue placeholder="Seleziona negozio..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.nome || store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              {/* Week navigator */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Settimana
                </Label>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateWeek('prev')}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex-1 text-center text-sm font-medium">
                    {format(weekStart, 'd MMM', { locale: it })} - {format(weekEnd, 'd MMM', { locale: it })}
                  </div>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateWeek('next')}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              {/* Selected templates summary */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Template Selezionati</Label>
                {templateSelections.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nessun template selezionato</p>
                ) : (
                  <div className="space-y-1">
                    {templateSelections.map(ts => (
                      <div 
                        key={ts.templateId}
                        className="flex items-center gap-2 p-2 bg-white rounded border text-xs"
                      >
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: ts.template.color }}
                        />
                        <span className="flex-1 truncate">{ts.template.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {ts.selectedDays.length}g
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center Panel: Phase-specific content */}
          <div className="flex-1 overflow-auto p-4">
            {!selectedStoreId ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                  <StoreIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Seleziona un punto vendita per iniziare</p>
                </div>
              </div>
            ) : currentPhase === 1 ? (
              /* Phase 1: Template Multi-Select */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Seleziona Template</h3>
                  <Badge variant="outline">
                    {templates.length} template disponibili
                  </Badge>
                </div>
                
                {templatesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Caricamento template...</div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nessun template disponibile per questo negozio</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {templates.map(template => {
                      const selection = templateSelections.find(ts => ts.templateId === template.id);
                      const isSelected = !!selection;
                      
                      return (
                        <Card 
                          key={template.id}
                          className={cn(
                            "transition-all cursor-pointer hover:shadow-md",
                            isSelected && "ring-2 ring-orange-500"
                          )}
                          onClick={() => handleTemplateToggle(template)}
                          data-testid={`template-card-${template.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {/* Color indicator */}
                              <div 
                                className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                                style={{ backgroundColor: template.color }}
                              />
                              
                              {/* Template info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium">{template.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {template.scope === 'global' ? '🌐 Globale' : '🏪 Store'}
                                  </Badge>
                                </div>
                                
                                {/* Time slots preview */}
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {template.timeSlots.map((slot, idx) => (
                                    <Badge 
                                      key={slot.id || idx}
                                      variant="secondary" 
                                      className="text-xs"
                                    >
                                      <Clock className="w-3 h-3 mr-1" />
                                      {slot.startTime}-{slot.endTime}
                                    </Badge>
                                  ))}
                                </div>
                                
                                {/* Day selection (only if selected) */}
                                {isSelected && selection && (
                                  <div className="mt-3 pt-3 border-t" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs text-muted-foreground">Giorni attivi:</span>
                                      <div className="flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 text-xs"
                                          onClick={() => selectAllDaysForTemplate(template.id, periodDayStrings)}
                                        >
                                          Tutti
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 text-xs"
                                          onClick={() => clearAllDaysForTemplate(template.id)}
                                        >
                                          Nessuno
                                        </Button>
                                      </div>
                                    </div>
                                    <div className="flex gap-1">
                                      {periodDays.map((day, idx) => {
                                        const dayStr = format(day, 'yyyy-MM-dd');
                                        const isActive = selection.selectedDays.includes(dayStr);
                                        const dayOfWeek = getDay(day);
                                        
                                        return (
                                          <Tooltip key={dayStr}>
                                            <TooltipTrigger asChild>
                                              <button
                                                className={cn(
                                                  "w-9 h-9 rounded-md text-xs font-medium transition-colors",
                                                  isActive 
                                                    ? "bg-orange-500 text-white" 
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                                                  isWeekend(day) && !isActive && "bg-gray-50 text-gray-400"
                                                )}
                                                onClick={() => toggleDayForTemplate(template.id, dayStr)}
                                                data-testid={`day-toggle-${template.id}-${dayStr}`}
                                              >
                                                {DAY_NAMES[dayOfWeek]}
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              {format(day, 'EEEE d MMMM', { locale: it })}
                                            </TooltipContent>
                                          </Tooltip>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Selection checkbox */}
                              <Checkbox
                                checked={isSelected}
                                className="mt-1"
                                data-testid={`checkbox-template-${template.id}`}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
                
                {/* Proceed to Phase 2 */}
                {templateSelections.length > 0 && (
                  <div className="flex justify-end mt-4">
                    <Button onClick={() => goToPhase(2)} data-testid="btn-proceed-phase2">
                      Procedi alle Risorse
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* Phase 2: Resource Assignment */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Assegna Risorse alle Fasce</h3>
                  <Button variant="outline" size="sm" onClick={() => goToPhase(1)}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Torna ai Template
                  </Button>
                </div>
                
                {/* Resource assignment grid by day and slot */}
                <div className="space-y-4">
                  {periodDays.map(day => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    const daySlots = getSlotsForDay(dayStr);
                    
                    if (daySlots.length === 0) return null;
                    
                    return (
                      <Card key={dayStr} className="overflow-hidden">
                        <CardHeader className="py-3 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">
                              {format(day, 'EEEE d MMMM', { locale: it })}
                            </CardTitle>
                            <Badge 
                              className={getDayCoverageColor(dayCoverageStats[dayStr] || { total: 0, covered: 0, partial: 0, uncovered: 0 })}
                            >
                              {dayCoverageStats[dayStr]?.covered || 0}/{dayCoverageStats[dayStr]?.total || 0} coperti
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-3">
                          <div className="space-y-2">
                            {daySlots.map((slot, idx) => {
                              // Use slot.slotId for consistent matching with store
                              const slotId = slot.slotId;
                              const assigned = getAssignedResources(slot.templateId, slotId, dayStr);
                              
                              return (
                                <div 
                                  key={`${slot.templateId}-${slotId}-${dayStr}`}
                                  className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border",
                                    getCoverageColor(slot.coverageStatus)
                                  )}
                                >
                                  {/* Template color + time */}
                                  <div className="flex items-center gap-2 min-w-[120px]">
                                    <div 
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: slot.templateColor }}
                                    />
                                    <span className="text-sm font-medium">
                                      {slot.startTime} - {slot.endTime}
                                    </span>
                                  </div>
                                  
                                  {/* Template name */}
                                  <span className="text-xs text-muted-foreground truncate min-w-[100px]">
                                    {slot.templateName}
                                  </span>
                                  
                                  {/* Assigned resources */}
                                  <div className="flex-1 flex items-center gap-1 flex-wrap">
                                    {assigned.map(ra => (
                                      <Badge 
                                        key={ra.resourceId}
                                        variant="secondary"
                                        className="gap-1"
                                      >
                                        <User className="w-3 h-3" />
                                        {ra.resourceName}
                                        <button
                                          className="ml-1 hover:text-red-500"
                                          onClick={() => removeResourceAssignment(ra.resourceId, slot.templateId, slotId, dayStr)}
                                        >
                                          <XCircle className="w-3 h-3" />
                                        </button>
                                      </Badge>
                                    ))}
                                  </div>
                                  
                                  {/* Coverage status + Add button */}
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs">
                                      {assigned.length}/{slot.requiredStaff}
                                    </span>
                                    {slot.coverageStatus === 'covered' ? (
                                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    ) : slot.coverageStatus === 'partial' ? (
                                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                                    ) : (
                                      <AlertCircle className="w-4 h-4 text-red-600" />
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7"
                                      onClick={() => openResourceModal(
                                        slot.templateId, 
                                        slotId, 
                                        dayStr, 
                                        slot.startTime, 
                                        slot.endTime,
                                        slot.templateName
                                      )}
                                      data-testid={`btn-assign-${dayStr}-${slotId}`}
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Assegna
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Coverage Matrix Preview */}
          <div className="w-80 border-l bg-gray-50 p-4 overflow-auto">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <h3 className="font-medium text-sm">
                  {currentPhase === 1 ? 'Pianificazione Turni' : 'Copertura Risorse'}
                </h3>
              </div>
              
              {templateSelections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Seleziona almeno un template per vedere la copertura</p>
                </div>
              ) : (
                <>
                  {/* Phase indicator */}
                  <div className={cn(
                    "p-2 rounded-lg text-xs",
                    currentPhase === 1 
                      ? "bg-blue-50 text-blue-700 border border-blue-200" 
                      : "bg-orange-50 text-orange-700 border border-orange-200"
                  )}>
                    {currentPhase === 1 ? (
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        <span>Fase 1: Selezione fasce orarie per giorno</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>Fase 2: Assegnazione risorse alle fasce</span>
                      </div>
                    )}
                  </div>
                
                  {/* Weekly overview grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {periodDays.map(day => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const stats = dayCoverageStats[dayStr] || { total: 0, covered: 0, partial: 0, uncovered: 0 };
                      const dayOfWeek = getDay(day);
                      
                      // Phase 1: green if has slots planned, gray if no slots
                      // Phase 2: green/amber/red based on resource coverage
                      const getColorClass = () => {
                        if (stats.total === 0) return "bg-gray-100 text-gray-400";
                        if (currentPhase === 1) {
                          // Phase 1: all slots are "covered" (planned)
                          return "bg-green-100 text-green-700 border border-green-200";
                        } else {
                          // Phase 2: based on resource assignments
                          if (stats.uncovered > 0) return "bg-red-100 text-red-700 border border-red-200";
                          if (stats.partial > 0) return "bg-amber-100 text-amber-700 border border-amber-200";
                          return "bg-green-100 text-green-700 border border-green-200";
                        }
                      };
                      
                      return (
                        <Tooltip key={dayStr}>
                          <TooltipTrigger asChild>
                            <div 
                              className={cn(
                                "aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-medium cursor-pointer transition-all hover:scale-105",
                                getColorClass()
                              )}
                            >
                              <span>{DAY_NAMES[dayOfWeek]}</span>
                              <span className="text-[10px] opacity-70">{format(day, 'd')}</span>
                              {stats.total > 0 && (
                                <span className="text-[8px] font-bold">{stats.total}</span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <div className="text-xs">
                              <p className="font-medium">{format(day, 'EEEE d MMMM', { locale: it })}</p>
                              {stats.total > 0 ? (
                                currentPhase === 1 ? (
                                  <p className="text-green-600">✓ {stats.total} fasce pianificate</p>
                                ) : (
                                  <>
                                    <p className="text-green-600">✓ Coperti: {stats.covered}</p>
                                    {stats.partial > 0 && <p className="text-amber-600">⚠ Parziali: {stats.partial}</p>}
                                    {stats.uncovered > 0 && <p className="text-red-600">✗ Da assegnare: {stats.uncovered}</p>}
                                  </>
                                )
                              ) : (
                                <p className="text-muted-foreground">Nessuna fascia pianificata</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                  
                  <Separator />
                  
                  {/* Legend - different for each phase */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Legenda</p>
                    {currentPhase === 1 ? (
                      <>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded bg-green-500" />
                          <span>Fascia pianificata</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded bg-gray-300" />
                          <span>Nessun template</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded bg-green-500" />
                          <span>Risorse complete</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded bg-amber-500" />
                          <span>Risorse parziali</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-3 h-3 rounded bg-red-500" />
                          <span>Risorse mancanti</span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <Separator />
                  
                  {/* Slot summary per day */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      {currentPhase === 1 ? 'Riepilogo Fasce' : 'Stato Assegnazioni'}
                    </p>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-1">
                        {periodDays.map(day => {
                          const dayStr = format(day, 'yyyy-MM-dd');
                          const daySlots = coveragePreview.filter(s => s.day === dayStr);
                          
                          if (daySlots.length === 0) return null;
                          
                          return (
                            <div key={dayStr} className="p-2 bg-white rounded border">
                              <p className="text-xs font-medium mb-1">
                                {format(day, 'EEE d MMM', { locale: it })}
                              </p>
                              <div className="space-y-1">
                                {daySlots.map((slot, idx) => (
                                  <div 
                                    key={idx}
                                    className={cn(
                                      "flex items-center justify-between text-[10px] p-1 rounded",
                                      currentPhase === 1 
                                        ? "bg-green-50 text-green-700"
                                        : slot.resourceCoverageStatus === 'covered'
                                          ? "bg-green-50 text-green-700"
                                          : slot.resourceCoverageStatus === 'partial'
                                            ? "bg-amber-50 text-amber-700"
                                            : "bg-red-50 text-red-700"
                                    )}
                                  >
                                    <div className="flex items-center gap-1">
                                      <div 
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: slot.templateColor }}
                                      />
                                      <span>{slot.startTime}-{slot.endTime}</span>
                                    </div>
                                    <span>
                                      {currentPhase === 1 
                                        ? `${slot.requiredStaff} richiesti`
                                        : `${slot.assignedResources.length}/${slot.requiredStaff}`
                                      }
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                  
                  {/* Phase 2 only: Coverage alerts */}
                  {currentPhase === 2 && coveragePreview.filter(s => s.resourceCoverageStatus !== 'covered').length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-red-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Fasce da completare
                        </p>
                        <div className="space-y-1">
                          {coveragePreview
                            .filter(s => s.resourceCoverageStatus !== 'covered')
                            .slice(0, 10)
                            .map((slot, idx) => (
                              <div 
                                key={`alert-${idx}`}
                                className={cn(
                                  "p-2 rounded text-xs",
                                  slot.resourceCoverageStatus === 'uncovered' 
                                    ? "bg-red-50 text-red-700" 
                                    : "bg-amber-50 text-amber-700"
                                )}
                              >
                                <div className="flex items-center gap-1">
                                  {slot.resourceCoverageStatus === 'uncovered' 
                                    ? <AlertCircle className="w-3 h-3" />
                                    : <AlertTriangle className="w-3 h-3" />
                                  }
                                  <span className="font-medium">
                                    {format(new Date(slot.day), 'EEE d', { locale: it })}
                                  </span>
                                  <span>{slot.startTime}-{slot.endTime}</span>
                                </div>
                                <p className="text-[10px] opacity-80 ml-4">
                                  {slot.assignedResources.length}/{slot.requiredStaff} risorse assegnate
                                </p>
                              </div>
                            ))}
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Phase 1 only: Template summary */}
                  {currentPhase === 1 && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                        <CheckCircle2 className="w-4 h-4" />
                        <div>
                          <p className="font-medium">{coveragePreview.length} fasce pianificate</p>
                          <p className="text-[10px] opacity-80">
                            Procedi alla Fase 2 per assegnare le risorse
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Resource Assignment Modal */}
        <Dialog open={showResourceModal} onOpenChange={setShowResourceModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assegna Risorsa</DialogTitle>
              <DialogDescription>
                {selectedSlotForAssignment && (
                  <>
                    Fascia {selectedSlotForAssignment.startTime} - {selectedSlotForAssignment.endTime}
                    <br />
                    {format(new Date(selectedSlotForAssignment.day), 'EEEE d MMMM yyyy', { locale: it })}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {resources.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Nessuna risorsa disponibile</p>
                ) : (
                  resources.map(resource => {
                    const isAssigned = selectedSlotForAssignment && isResourceAssigned(
                      resource.id, 
                      selectedSlotForAssignment.templateId,
                      selectedSlotForAssignment.slotId,
                      selectedSlotForAssignment.day
                    );
                    
                    return (
                      <div
                        key={resource.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                          isAssigned 
                            ? "bg-green-50 border-green-200" 
                            : "hover:bg-gray-50"
                        )}
                        onClick={() => !isAssigned && handleAssignResource(resource)}
                        data-testid={`resource-option-${resource.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {resource.firstName} {resource.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">{resource.email}</p>
                          </div>
                        </div>
                        {isAssigned ? (
                          <Badge variant="outline" className="bg-green-100 text-green-700">
                            <Check className="w-3 h-3 mr-1" />
                            Assegnato
                          </Badge>
                        ) : (
                          <Button variant="ghost" size="sm">
                            <Plus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
