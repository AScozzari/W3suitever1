import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  Store as StoreIcon, Calendar as CalendarIcon, Users, 
  ChevronLeft, ChevronRight, Check, AlertTriangle, AlertCircle,
  Clock, CheckCircle2, XCircle, User, Plus, Minus, 
  ArrowRight, Layers, Eye, Save, RotateCcw, GripVertical,
  CalendarDays, CalendarRange, Trash2
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isWeekend, getDay, parseISO, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { useShiftPlanningStore, type ShiftTemplate, type TimeSlot, type ResourceAssignment } from '@/stores/shiftPlanningStore';
import { TimelineBar, TimelineLegend, type TimelineSegment } from './TimelineBar';

interface Store {
  id: string;
  name?: string;
  nome?: string;
  code?: string;
}

interface StoreOpeningRule {
  id: string;
  storeId: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
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
}

interface Resource {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role?: string;
  storeId?: string;
}

type ActiveTab = 'store' | 'days' | 'templates' | 'resources';
type DaySelectionMode = 'range' | 'calendar';

export default function ShiftPlanningWorkspace() {
  const { toast } = useToast();
  
  const {
    selectedStoreId,
    selectedStoreName,
    periodStart,
    periodEnd,
    templateSelections,
    resourceAssignments,
    coveragePreview,
    storeOpeningHours,
    setStore,
    setPeriod,
    setStoreOpeningHours,
    addTemplateSelection,
    removeTemplateSelection,
    toggleDayForTemplate,
    selectAllDaysForTemplate,
    assignResource,
    removeResourceAssignment,
    computeCoverage,
    resetPlanning
  } = useShiftPlanningStore();
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('store');
  const [daySelectionMode, setDaySelectionMode] = useState<DaySelectionMode>('range');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfWeek(new Date(), { weekStartsOn: 1 })
  });
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [draggedResource, setDraggedResource] = useState<Resource | null>(null);
  
  const { data: stores = [] } = useQuery<Store[]>({
    queryKey: ['/api/stores'],
  });

  const { data: openingRules = [] } = useQuery<StoreOpeningRule[]>({
    queryKey: [`/api/stores/${selectedStoreId}/opening-rules`],
    enabled: !!selectedStoreId,
  });

  const { data: apiTemplates = [], isLoading: templatesLoading } = useQuery<ApiShiftTemplate[]>({
    queryKey: ['/api/hr/shift-templates', { storeId: selectedStoreId }],
    enabled: !!selectedStoreId,
  });

  const { data: resources = [] } = useQuery<Resource[]>({
    queryKey: ['/api/users', selectedStoreId],
    enabled: !!selectedStoreId,
  });

  const templates: ShiftTemplate[] = useMemo(() => {
    return apiTemplates.map(t => ({
      id: t.id,
      name: t.name,
      color: t.color || '#f97316',
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

  const periodDays = useMemo(() => {
    if (daySelectionMode === 'range') {
      return eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    }
    return selectedDates.sort((a, b) => a.getTime() - b.getTime());
  }, [daySelectionMode, dateRange, selectedDates]);

  useEffect(() => {
    if (periodDays.length > 0) {
      setPeriod(periodDays[0], periodDays[periodDays.length - 1]);
    }
  }, [periodDays, setPeriod]);

  useEffect(() => {
    if (openingRules.length > 0) {
      const hours = openingRules.map(rule => ({
        day: rule.dayOfWeek,
        openTime: rule.openTime,
        closeTime: rule.closeTime,
        isClosed: rule.isClosed
      }));
      setStoreOpeningHours(hours);
    }
  }, [openingRules, setStoreOpeningHours]);

  const handleStoreSelect = (storeId: string) => {
    const store = stores.find(s => s.id === storeId);
    if (store) {
      setStore(storeId, store.nome || store.name || '');
      setActiveTab('days');
    }
  };

  const handleTemplateToggle = (template: ShiftTemplate) => {
    const isSelected = templateSelections.find(ts => ts.templateId === template.id);
    if (isSelected) {
      removeTemplateSelection(template.id);
    } else {
      addTemplateSelection(template);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    if (daySelectionMode === 'calendar') {
      setSelectedDates(prev => {
        const exists = prev.find(d => isSameDay(d, date));
        if (exists) {
          return prev.filter(d => !isSameDay(d, date));
        }
        return [...prev, date];
      });
    }
  };

  const buildTimelineSegments = useCallback((day: Date): TimelineSegment[] => {
    const segments: TimelineSegment[] = [];
    const dayOfWeek = getDay(day);
    const dayStr = format(day, 'yyyy-MM-dd');
    
    const dayOpening = storeOpeningHours.find(h => h.day === dayOfWeek);
    if (dayOpening && !dayOpening.isClosed) {
      segments.push({
        id: `opening-${dayStr}`,
        startTime: dayOpening.openTime.substring(0, 5),
        endTime: dayOpening.closeTime.substring(0, 5),
        type: 'opening',
        label: 'Apertura'
      });
    }
    
    const daySlots = coveragePreview.filter(s => s.day === dayStr);
    const openStart = dayOpening && !dayOpening.isClosed 
      ? parseInt(dayOpening.openTime.substring(0, 2)) * 60 + parseInt(dayOpening.openTime.substring(3, 5))
      : 0;
    const openEnd = dayOpening && !dayOpening.isClosed 
      ? parseInt(dayOpening.closeTime.substring(0, 2)) * 60 + parseInt(dayOpening.closeTime.substring(3, 5))
      : 1440;
    
    daySlots.forEach((slot, idx) => {
      const slotStart = parseInt(slot.startTime.substring(0, 2)) * 60 + parseInt(slot.startTime.substring(3, 5));
      const slotEnd = parseInt(slot.endTime.substring(0, 2)) * 60 + parseInt(slot.endTime.substring(3, 5));
      
      const hasOverflowBefore = slotStart < openStart;
      const hasOverflowAfter = slotEnd > openEnd;
      
      if (hasOverflowBefore) {
        const overflowEnd = Math.min(slotEnd, openStart);
        segments.push({
          id: `overflow-before-${slot.templateId}-${slot.slotId}-${dayStr}`,
          startTime: slot.startTime.substring(0, 5),
          endTime: `${Math.floor(overflowEnd / 60).toString().padStart(2, '0')}:${(overflowEnd % 60).toString().padStart(2, '0')}`,
          type: 'overflow',
          label: 'Fuori orario',
          templateName: slot.templateName
        });
      }
      
      if (hasOverflowAfter) {
        const overflowStart = Math.max(slotStart, openEnd);
        segments.push({
          id: `overflow-after-${slot.templateId}-${slot.slotId}-${dayStr}`,
          startTime: `${Math.floor(overflowStart / 60).toString().padStart(2, '0')}:${(overflowStart % 60).toString().padStart(2, '0')}`,
          endTime: slot.endTime.substring(0, 5),
          type: 'overflow',
          label: 'Fuori orario',
          templateName: slot.templateName
        });
      }
      
      const effectiveStart = Math.max(slotStart, openStart);
      const effectiveEnd = Math.min(slotEnd, openEnd);
      
      if (effectiveStart < effectiveEnd) {
        segments.push({
          id: `template-${slot.templateId}-${slot.slotId}-${dayStr}`,
          startTime: `${Math.floor(effectiveStart / 60).toString().padStart(2, '0')}:${(effectiveStart % 60).toString().padStart(2, '0')}`,
          endTime: `${Math.floor(effectiveEnd / 60).toString().padStart(2, '0')}:${(effectiveEnd % 60).toString().padStart(2, '0')}`,
          type: 'template',
          label: slot.templateName,
          templateName: slot.templateName,
          color: slot.templateColor,
          requiredStaff: slot.requiredStaff,
          assignedStaff: slot.assignedResources.length
        });
      }
      
      slot.assignedResources.forEach((ra, raIdx) => {
        segments.push({
          id: `resource-${ra.resourceId}-${slot.slotId}-${dayStr}-${raIdx}`,
          startTime: slot.startTime.substring(0, 5),
          endTime: slot.endTime.substring(0, 5),
          type: 'resource',
          label: ra.resourceName,
          resourceName: ra.resourceName,
          templateName: slot.templateName
        });
      });
      
      if (slot.assignedResources.length < slot.requiredStaff) {
        const missing = slot.requiredStaff - slot.assignedResources.length;
        segments.push({
          id: `shortage-${slot.templateId}-${slot.slotId}-${dayStr}`,
          startTime: slot.startTime.substring(0, 5),
          endTime: slot.endTime.substring(0, 5),
          type: 'shortage',
          label: `Mancano ${missing}`,
          requiredStaff: slot.requiredStaff,
          assignedStaff: slot.assignedResources.length
        });
      }
    });

    if (dayOpening && !dayOpening.isClosed && daySlots.length > 0) {
      const coveredRanges = daySlots.map(s => ({
        start: parseInt(s.startTime.substring(0, 2)) * 60 + parseInt(s.startTime.substring(3, 5)),
        end: parseInt(s.endTime.substring(0, 2)) * 60 + parseInt(s.endTime.substring(3, 5))
      })).sort((a, b) => a.start - b.start);
      
      let cursor = openStart;
      coveredRanges.forEach(range => {
        if (range.start > cursor) {
          const gapStart = `${Math.floor(cursor / 60).toString().padStart(2, '0')}:${(cursor % 60).toString().padStart(2, '0')}`;
          const gapEnd = `${Math.floor(range.start / 60).toString().padStart(2, '0')}:${(range.start % 60).toString().padStart(2, '0')}`;
          segments.push({
            id: `gap-${dayStr}-${cursor}`,
            startTime: gapStart,
            endTime: gapEnd,
            type: 'gap',
            label: 'Non coperto'
          });
        }
        cursor = Math.max(cursor, range.end);
      });
      
      if (cursor < openEnd) {
        const gapStart = `${Math.floor(cursor / 60).toString().padStart(2, '0')}:${(cursor % 60).toString().padStart(2, '0')}`;
        const gapEnd = `${Math.floor(openEnd / 60).toString().padStart(2, '0')}:${(openEnd % 60).toString().padStart(2, '0')}`;
        segments.push({
          id: `gap-${dayStr}-${cursor}-end`,
          startTime: gapStart,
          endTime: gapEnd,
          type: 'gap',
          label: 'Non coperto'
        });
      }
    }
    
    return segments;
  }, [storeOpeningHours, coveragePreview]);

  const handleResourceDrop = (templateId: string, slotId: string, day: string, resource: Resource) => {
    const existingAssignment = resourceAssignments.find(
      ra => ra.resourceId === resource.id && ra.day === day
    );
    
    if (existingAssignment) {
      const slot = coveragePreview.find(s => s.slotId === existingAssignment.slotId && s.day === day);
      if (slot) {
        const overlap = checkTimeOverlap(
          slot.startTime, slot.endTime,
          coveragePreview.find(s => s.templateId === templateId && s.slotId === slotId && s.day === day)?.startTime || '',
          coveragePreview.find(s => s.templateId === templateId && s.slotId === slotId && s.day === day)?.endTime || ''
        );
        
        if (overlap) {
          toast({
            title: 'Sovrapposizione orario',
            description: `${resource.firstName || resource.email} è già assegnato a una fascia sovrapposta in questo giorno`,
            variant: 'destructive'
          });
          return;
        }
      }
    }
    
    assignResource({
      resourceId: resource.id,
      resourceName: `${resource.firstName || ''} ${resource.lastName || ''}`.trim() || resource.email,
      templateId,
      slotId,
      day
    });
    
    toast({
      title: 'Risorsa assegnata',
      description: `${resource.firstName || resource.email} assegnato`
    });
  };

  const checkTimeOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
    return start1 < end2 && end1 > start2;
  };

  const totalCoverage = useMemo(() => {
    if (coveragePreview.length === 0) return 0;
    const covered = coveragePreview.filter(s => s.assignedResources.length >= s.requiredStaff).length;
    return Math.round((covered / coveragePreview.length) * 100);
  }, [coveragePreview]);

  const savePlanningMutation = useMutation({
    mutationFn: async () => {
      const shifts = templateSelections.flatMap(ts => 
        ts.selectedDays.flatMap(day => 
          ts.template.timeSlots.map((slot, slotIndex) => {
            const slotId = slot.id || `slot-${slotIndex}`;
            const assignments = resourceAssignments.filter(
              ra => ra.templateId === ts.templateId && ra.slotId === slotId && ra.day === day
            );
            return {
              templateId: ts.templateId,
              storeId: selectedStoreId,
              date: day,
              startTime: slot.startTime,
              endTime: slot.endTime,
              slotId,
              assignments: assignments.map(ra => ra.resourceId)
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
        description: 'I turni sono stati salvati correttamente'
      });
      setShowSummaryModal(false);
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: 'Impossibile salvare la pianificazione',
        variant: 'destructive'
      });
    }
  });

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold">Pianificazione Turni</h1>
            <p className="text-sm text-muted-foreground">
              {selectedStoreName ? `${selectedStoreName} - ` : ''}
              {periodDays.length > 0 && `${format(periodDays[0], 'd MMM', { locale: it })} - ${format(periodDays[periodDays.length - 1], 'd MMM yyyy', { locale: it })}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={totalCoverage >= 80 ? 'default' : totalCoverage >= 50 ? 'secondary' : 'destructive'}>
              Copertura: {totalCoverage}%
            </Badge>
            <Button variant="outline" size="sm" onClick={resetPlanning} data-testid="btn-reset">
              <RotateCcw className="w-4 h-4 mr-1" />
              Reset
            </Button>
            <Button 
              size="sm" 
              onClick={() => setShowSummaryModal(true)}
              disabled={templateSelections.length === 0}
              data-testid="btn-save"
            >
              <Save className="w-4 h-4 mr-1" />
              Salva Pianificazione
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="store" className="gap-2" data-testid="tab-store">
              <StoreIcon className="w-4 h-4" />
              Negozio
            </TabsTrigger>
            <TabsTrigger value="days" className="gap-2" disabled={!selectedStoreId} data-testid="tab-days">
              <CalendarIcon className="w-4 h-4" />
              Giorni
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2" disabled={!selectedStoreId || periodDays.length === 0} data-testid="tab-templates">
              <Layers className="w-4 h-4" />
              Template
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-2" disabled={templateSelections.length === 0} data-testid="tab-resources">
              <Users className="w-4 h-4" />
              Risorse
            </TabsTrigger>
          </TabsList>

          <TabsContent value="store" className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {stores.map(store => (
                <Card 
                  key={store.id}
                  className={cn(
                    "cursor-pointer hover:border-primary transition-colors",
                    selectedStoreId === store.id && "border-primary bg-primary/5"
                  )}
                  onClick={() => handleStoreSelect(store.id)}
                  data-testid={`store-card-${store.id}`}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <StoreIcon className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{store.nome || store.name}</p>
                      {store.code && <p className="text-xs text-muted-foreground">{store.code}</p>}
                    </div>
                    {selectedStoreId === store.id && (
                      <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="days" className="mt-4">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant={daySelectionMode === 'range' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDaySelectionMode('range')}
                data-testid="btn-range-mode"
              >
                <CalendarRange className="w-4 h-4 mr-1" />
                Range Dal/Al
              </Button>
              <Button
                variant={daySelectionMode === 'calendar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDaySelectionMode('calendar')}
                data-testid="btn-calendar-mode"
              >
                <CalendarDays className="w-4 h-4 mr-1" />
                Multi-Selezione
              </Button>
            </div>

            {daySelectionMode === 'range' ? (
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Dal</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-40" data-testid="btn-date-from">
                        {format(dateRange.from, 'd MMM yyyy', { locale: it })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                        locale={it}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Al</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-40" data-testid="btn-date-to">
                        {format(dateRange.to, 'd MMM yyyy', { locale: it })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                        locale={it}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="ml-4">
                  <p className="text-sm text-muted-foreground">
                    {periodDays.length} giorni selezionati
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex gap-6">
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates) => setSelectedDates(dates || [])}
                  locale={it}
                  className="rounded-md border"
                />
                <div>
                  <p className="text-sm font-medium mb-2">Giorni selezionati: {selectedDates.length}</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedDates.slice(0, 10).map(date => (
                      <Badge key={date.toISOString()} variant="secondary" className="text-xs">
                        {format(date, 'd MMM', { locale: it })}
                      </Badge>
                    ))}
                    {selectedDates.length > 10 && (
                      <Badge variant="outline">+{selectedDates.length - 10}</Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {periodDays.length > 0 && (
              <Button 
                className="mt-4" 
                onClick={() => setActiveTab('templates')}
                data-testid="btn-next-templates"
              >
                Avanti: Seleziona Template
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            {templatesLoading ? (
              <div className="text-center py-8">Caricamento template...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nessun template disponibile per questo negozio
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {templates.map(template => {
                  const isSelected = templateSelections.find(ts => ts.templateId === template.id);
                  return (
                    <Card 
                      key={template.id}
                      className={cn(
                        "cursor-pointer hover:border-primary transition-colors",
                        isSelected && "border-primary bg-primary/5"
                      )}
                      onClick={() => handleTemplateToggle(template)}
                      data-testid={`template-card-${template.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: template.color }}
                          />
                          <p className="font-medium text-sm flex-1">{template.name}</p>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          {template.timeSlots.map((slot, idx) => (
                            <p key={idx}>{slot.startTime} - {slot.endTime}</p>
                          ))}
                        </div>
                        <Badge variant="outline" className="mt-2 text-[10px]">
                          {template.scope === 'global' ? 'Globale' : 'Locale'}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            
            {templateSelections.length > 0 && (
              <Button 
                className="mt-4" 
                onClick={() => setActiveTab('resources')}
                data-testid="btn-next-resources"
              >
                Avanti: Assegna Risorse
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </TabsContent>

          <TabsContent value="resources" className="mt-4">
            <div className="flex gap-4">
              <div className="w-64 shrink-0">
                <h3 className="font-medium mb-3">Risorse Disponibili</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Trascina una risorsa sulla fascia oraria nel timeline sotto
                </p>
                <ScrollArea className="h-[300px] border rounded-lg p-2">
                  {resources.map(resource => (
                    <div
                      key={resource.id}
                      draggable
                      onDragStart={() => setDraggedResource(resource)}
                      onDragEnd={() => setDraggedResource(null)}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 cursor-grab active:cursor-grabbing mb-1"
                      data-testid={`resource-${resource.id}`}
                    >
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {resource.firstName} {resource.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {resource.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </div>
              
              <div className="flex-1">
                <h3 className="font-medium mb-3">Fasce da Coprire</h3>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {periodDays.map(day => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const daySlots = coveragePreview.filter(s => s.day === dayStr);
                      
                      if (daySlots.length === 0) return null;
                      
                      return (
                        <Card key={dayStr} className="overflow-hidden">
                          <CardHeader className="py-2 px-3 bg-gray-50">
                            <CardTitle className="text-sm">
                              {format(day, 'EEEE d MMMM', { locale: it })}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-2 space-y-1">
                            {daySlots.map((slot, idx) => (
                              <div
                                key={`${slot.templateId}-${slot.slotId}-${idx}`}
                                className={cn(
                                  "p-2 rounded border-2 border-dashed transition-colors",
                                  slot.assignedResources.length >= slot.requiredStaff 
                                    ? "border-green-300 bg-green-50"
                                    : slot.assignedResources.length > 0
                                    ? "border-amber-300 bg-amber-50"
                                    : "border-gray-300 bg-gray-50"
                                )}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => {
                                  if (draggedResource) {
                                    handleResourceDrop(slot.templateId, slot.slotId, dayStr, draggedResource);
                                  }
                                }}
                                data-testid={`slot-drop-${slot.slotId}-${dayStr}`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded"
                                      style={{ backgroundColor: slot.templateColor }}
                                    />
                                    <span className="text-xs font-medium">
                                      {slot.startTime.substring(0, 5)} - {slot.endTime.substring(0, 5)}
                                    </span>
                                  </div>
                                  <Badge variant="outline" className="text-[10px]">
                                    {slot.assignedResources.length}/{slot.requiredStaff}
                                  </Badge>
                                </div>
                                <p className="text-[10px] text-muted-foreground mb-1">
                                  {slot.templateName}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {slot.assignedResources.map(ra => (
                                    <Badge 
                                      key={ra.resourceId}
                                      variant="secondary"
                                      className="text-[10px] gap-1"
                                    >
                                      {ra.resourceName}
                                      <button
                                        className="hover:text-red-500"
                                        onClick={() => removeResourceAssignment(
                                          ra.resourceId, slot.templateId, slot.slotId, dayStr
                                        )}
                                      >
                                        <XCircle className="w-3 h-3" />
                                      </button>
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <div className="mb-3">
          <TimelineLegend />
        </div>
        
        <div className="space-y-2">
          {periodDays.map(day => (
            <TimelineBar
              key={format(day, 'yyyy-MM-dd')}
              day={format(day, 'yyyy-MM-dd')}
              dayLabel={format(day, 'EEE d MMM', { locale: it })}
              segments={buildTimelineSegments(day)}
              startHour={6}
              endHour={24}
            />
          ))}
        </div>
      </div>

      <Dialog open={showSummaryModal} onOpenChange={setShowSummaryModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Riepilogo Pianificazione</DialogTitle>
            <DialogDescription>
              Verifica la pianificazione prima di salvare
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{periodDays.length}</p>
                  <p className="text-sm text-muted-foreground">Giorni</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{coveragePreview.length}</p>
                  <p className="text-sm text-muted-foreground">Fasce orarie</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{totalCoverage}%</p>
                  <p className="text-sm text-muted-foreground">Copertura</p>
                </CardContent>
              </Card>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Giorno</th>
                    <th className="px-3 py-2 text-left">Template</th>
                    <th className="px-3 py-2 text-left">Fascia</th>
                    <th className="px-3 py-2 text-left">Risorse</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {coveragePreview.slice(0, 20).map((slot, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">
                        {format(parseISO(slot.day), 'EEE d MMM', { locale: it })}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: slot.templateColor }}
                          />
                          {slot.templateName}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {slot.startTime.substring(0, 5)} - {slot.endTime.substring(0, 5)}
                      </td>
                      <td className="px-3 py-2">
                        {slot.assignedResources.map(ra => ra.resourceName).join(', ') || '-'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {slot.assignedResources.length >= slot.requiredStaff ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 inline" />
                        ) : slot.assignedResources.length > 0 ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600 inline" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600 inline" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {coveragePreview.length > 20 && (
                <div className="p-2 text-center text-sm text-muted-foreground border-t">
                  ... e altre {coveragePreview.length - 20} fasce
                </div>
              )}
            </div>

            {coveragePreview.filter(s => s.assignedResources.length < s.requiredStaff).length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium">
                    Attenzione: {coveragePreview.filter(s => s.assignedResources.length < s.requiredStaff).length} fasce non hanno copertura completa
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSummaryModal(false)}>
              Annulla
            </Button>
            <Button 
              onClick={() => savePlanningMutation.mutate()}
              disabled={savePlanningMutation.isPending}
            >
              {savePlanningMutation.isPending ? 'Salvataggio...' : 'Conferma e Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
