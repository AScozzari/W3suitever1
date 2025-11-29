import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Store as StoreIcon, Calendar as CalendarIcon, Users, 
  ChevronLeft, ChevronRight, Check, AlertTriangle, AlertCircle,
  Clock, CheckCircle2, XCircle, User, Plus, Minus, 
  ArrowRight, Layers, Eye, Save, RotateCcw, GripVertical,
  CalendarDays, CalendarRange, Trash2, Search, MapPin, 
  Phone, Filter, Globe, Building2, Briefcase, CalendarCheck,
  AlertOctagon, CalendarX
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isWeekend, getDay, parseISO, isSameDay, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { useShiftPlanningStore, type ShiftTemplate, type TimeSlot, type ResourceAssignment } from '@/stores/shiftPlanningStore';
import { TimelineBar, TimelineLegend, type TimelineSegment, type TimelineLane } from './TimelineBar';

interface Store {
  id: string;
  name?: string;
  nome?: string;
  code?: string;
  address?: string;
  city?: string;
  phone?: string;
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
type TemplateFilter = 'all' | 'global' | 'store';

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
  
  const [storeSearch, setStoreSearch] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>('all');
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  
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

  const filteredStores = useMemo(() => {
    if (!storeSearch) return stores;
    const search = storeSearch.toLowerCase();
    return stores.filter(s => 
      (s.nome || s.name || '').toLowerCase().includes(search) ||
      (s.code || '').toLowerCase().includes(search) ||
      (s.city || '').toLowerCase().includes(search)
    );
  }, [stores, storeSearch]);

  const filteredTemplates = useMemo(() => {
    let result = templates;
    
    if (templateFilter !== 'all') {
      result = result.filter(t => t.scope === templateFilter);
    }
    
    if (templateSearch) {
      const search = templateSearch.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(search));
    }
    
    return result;
  }, [templates, templateFilter, templateSearch]);

  const periodDays = useMemo(() => {
    if (daySelectionMode === 'range') {
      return eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    }
    return selectedDates.sort((a, b) => a.getTime() - b.getTime());
  }, [daySelectionMode, dateRange, selectedDates]);

  const selectedResource = useMemo(() => {
    return resources.find(r => r.id === selectedResourceId) || null;
  }, [resources, selectedResourceId]);

  const resourceStats = useMemo(() => {
    if (!selectedResource || periodDays.length === 0) return null;
    
    const resourceAssignmentsForPeriod = resourceAssignments.filter(
      ra => ra.resourceId === selectedResource.id
    );
    
    let totalHours = 0;
    const assignedDays = new Set<string>();
    
    resourceAssignmentsForPeriod.forEach(ra => {
      assignedDays.add(ra.day);
      const slot = coveragePreview.find(
        s => s.templateId === ra.templateId && s.slotId === ra.slotId && s.day === ra.day
      );
      if (slot) {
        const start = parseInt(slot.startTime.substring(0, 2)) * 60 + parseInt(slot.startTime.substring(3, 5));
        const end = parseInt(slot.endTime.substring(0, 2)) * 60 + parseInt(slot.endTime.substring(3, 5));
        totalHours += (end - start) / 60;
      }
    });
    
    const freeDays = periodDays.filter(d => !assignedDays.has(format(d, 'yyyy-MM-dd')));
    const busyDays = periodDays.filter(d => assignedDays.has(format(d, 'yyyy-MM-dd')));
    
    return {
      totalHours: Math.round(totalHours * 10) / 10,
      freeDays,
      busyDays,
      assignmentsCount: resourceAssignmentsForPeriod.length
    };
  }, [selectedResource, resourceAssignments, coveragePreview, periodDays]);

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

  const buildTimelineLanes = useCallback((day: Date): TimelineLane[] => {
    const lanes: TimelineLane[] = [];
    const dayOfWeek = getDay(day);
    const dayStr = format(day, 'yyyy-MM-dd');
    
    const dayOpening = storeOpeningHours.find(h => h.day === dayOfWeek);
    
    if (dayOpening && !dayOpening.isClosed) {
      lanes.push({
        id: `lane-opening-${dayStr}`,
        type: 'opening',
        label: 'Apertura',
        segments: [{
          id: `opening-${dayStr}`,
          startTime: dayOpening.openTime.substring(0, 5),
          endTime: dayOpening.closeTime.substring(0, 5),
          type: 'opening',
          label: `${dayOpening.openTime.substring(0, 5)} - ${dayOpening.closeTime.substring(0, 5)}`
        }]
      });
    }
    
    const daySlots = coveragePreview.filter(s => s.day === dayStr);
    const openStart = dayOpening && !dayOpening.isClosed 
      ? parseInt(dayOpening.openTime.substring(0, 2)) * 60 + parseInt(dayOpening.openTime.substring(3, 5))
      : 0;
    const openEnd = dayOpening && !dayOpening.isClosed 
      ? parseInt(dayOpening.closeTime.substring(0, 2)) * 60 + parseInt(dayOpening.closeTime.substring(3, 5))
      : 1440;
    
    daySlots.forEach((slot) => {
      const slotStart = parseInt(slot.startTime.substring(0, 2)) * 60 + parseInt(slot.startTime.substring(3, 5));
      const slotEnd = parseInt(slot.endTime.substring(0, 2)) * 60 + parseInt(slot.endTime.substring(3, 5));
      
      const templateSegments: TimelineSegment[] = [];
      
      const hasOverflowBefore = slotStart < openStart;
      const hasOverflowAfter = slotEnd > openEnd;
      
      if (hasOverflowBefore) {
        const overflowEnd = Math.min(slotEnd, openStart);
        templateSegments.push({
          id: `overflow-before-${slot.templateId}-${slot.slotId}-${dayStr}`,
          startTime: slot.startTime.substring(0, 5),
          endTime: `${Math.floor(overflowEnd / 60).toString().padStart(2, '0')}:${(overflowEnd % 60).toString().padStart(2, '0')}`,
          type: 'overflow',
          label: 'Fuori orario',
          templateName: slot.templateName
        });
      }
      
      const effectiveStart = Math.max(slotStart, openStart);
      const effectiveEnd = Math.min(slotEnd, openEnd);
      
      if (effectiveStart < effectiveEnd) {
        templateSegments.push({
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
      
      if (hasOverflowAfter) {
        const overflowStart = Math.max(slotStart, openEnd);
        templateSegments.push({
          id: `overflow-after-${slot.templateId}-${slot.slotId}-${dayStr}`,
          startTime: `${Math.floor(overflowStart / 60).toString().padStart(2, '0')}:${(overflowStart % 60).toString().padStart(2, '0')}`,
          endTime: slot.endTime.substring(0, 5),
          type: 'overflow',
          label: 'Fuori orario',
          templateName: slot.templateName
        });
      }
      
      if (templateSegments.length > 0) {
        lanes.push({
          id: `lane-template-${slot.templateId}-${slot.slotId}-${dayStr}`,
          type: 'template',
          label: slot.templateName,
          segments: templateSegments,
          templateId: slot.templateId,
          slotId: slot.slotId,
          isDropTarget: true
        });
      }
      
      slot.assignedResources.forEach((ra, raIdx) => {
        lanes.push({
          id: `lane-resource-${ra.resourceId}-${slot.slotId}-${dayStr}`,
          type: 'resource',
          label: ra.resourceName,
          segments: [{
            id: `resource-${ra.resourceId}-${slot.slotId}-${dayStr}-${raIdx}`,
            startTime: slot.startTime.substring(0, 5),
            endTime: slot.endTime.substring(0, 5),
            type: 'resource',
            label: ra.resourceName,
            resourceName: ra.resourceName,
            templateName: slot.templateName
          }]
        });
      });
      
      if (slot.assignedResources.length < slot.requiredStaff) {
        const missing = slot.requiredStaff - slot.assignedResources.length;
        lanes.push({
          id: `lane-shortage-${slot.templateId}-${slot.slotId}-${dayStr}`,
          type: 'shortage',
          label: `Mancano ${missing}`,
          segments: [{
            id: `shortage-${slot.templateId}-${slot.slotId}-${dayStr}`,
            startTime: slot.startTime.substring(0, 5),
            endTime: slot.endTime.substring(0, 5),
            type: 'shortage',
            label: `Mancano ${missing}`,
            requiredStaff: slot.requiredStaff,
            assignedStaff: slot.assignedResources.length
          }],
          templateId: slot.templateId,
          slotId: slot.slotId,
          isDropTarget: true
        });
      }
    });

    if (dayOpening && !dayOpening.isClosed && daySlots.length > 0) {
      const coveredRanges = daySlots.map(s => ({
        start: parseInt(s.startTime.substring(0, 2)) * 60 + parseInt(s.startTime.substring(3, 5)),
        end: parseInt(s.endTime.substring(0, 2)) * 60 + parseInt(s.endTime.substring(3, 5))
      })).sort((a, b) => a.start - b.start);
      
      const gapSegments: TimelineSegment[] = [];
      let cursor = openStart;
      
      coveredRanges.forEach(range => {
        if (range.start > cursor) {
          const gapStart = `${Math.floor(cursor / 60).toString().padStart(2, '0')}:${(cursor % 60).toString().padStart(2, '0')}`;
          const gapEnd = `${Math.floor(range.start / 60).toString().padStart(2, '0')}:${(range.start % 60).toString().padStart(2, '0')}`;
          gapSegments.push({
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
        gapSegments.push({
          id: `gap-${dayStr}-${cursor}-end`,
          startTime: gapStart,
          endTime: gapEnd,
          type: 'gap',
          label: 'Non coperto'
        });
      }
      
      if (gapSegments.length > 0) {
        lanes.push({
          id: `lane-gap-${dayStr}`,
          type: 'gap',
          label: 'Gap',
          segments: gapSegments
        });
      }
    }
    
    return lanes;
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

  const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) return firstName.substring(0, 2).toUpperCase();
    if (email) return email.substring(0, 2).toUpperCase();
    return '??';
  };

  const getAvatarColor = (id: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 
      'bg-pink-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-rose-500'
    ];
    const hash = id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

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
            <div className="mb-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca negozio per nome, codice o città..."
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-store-search"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStores.map(store => (
                <div 
                  key={store.id}
                  className={cn(
                    "group relative p-5 rounded-2xl cursor-pointer transition-all duration-300",
                    "bg-white/80 backdrop-blur-sm border-2",
                    "hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1",
                    selectedStoreId === store.id 
                      ? "border-primary bg-primary/5 shadow-lg shadow-primary/20" 
                      : "border-gray-100 hover:border-primary/30"
                  )}
                  onClick={() => handleStoreSelect(store.id)}
                  data-testid={`store-card-${store.id}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center shrink-0",
                      "bg-gradient-to-br from-primary/10 to-primary/20",
                      "group-hover:from-primary/20 group-hover:to-primary/30 transition-colors"
                    )}>
                      <StoreIcon className="w-7 h-7 text-primary" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-base truncate">
                          {store.nome || store.name}
                        </h3>
                        {selectedStoreId === store.id && (
                          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                        )}
                      </div>
                      
                      {store.code && (
                        <Badge variant="outline" className="text-xs mb-2">
                          {store.code}
                        </Badge>
                      )}
                      
                      <div className="space-y-1">
                        {store.city && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{store.city}</span>
                          </div>
                        )}
                        {store.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span>{store.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className={cn(
                    "absolute inset-0 rounded-2xl opacity-0 transition-opacity pointer-events-none",
                    "bg-gradient-to-br from-primary/5 to-transparent",
                    selectedStoreId === store.id && "opacity-100"
                  )} />
                </div>
              ))}
            </div>
            
            {filteredStores.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <StoreIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nessun negozio trovato</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="days" className="mt-4">
            <div className="flex gap-6">
              <div className="flex-1">
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

                {daySelectionMode === 'range' && (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border">
                    <div>
                      <label className="text-sm font-medium mb-2 block text-muted-foreground">Dal</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-44 justify-start" data-testid="btn-date-from">
                            <CalendarIcon className="w-4 h-4 mr-2" />
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
                    
                    <ArrowRight className="w-5 h-5 text-muted-foreground mt-6" />
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block text-muted-foreground">Al</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-44 justify-start" data-testid="btn-date-to">
                            <CalendarIcon className="w-4 h-4 mr-2" />
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
                    
                    <div className="ml-4 p-3 bg-white rounded-lg border">
                      <p className="text-2xl font-bold text-primary">{periodDays.length}</p>
                      <p className="text-xs text-muted-foreground">giorni</p>
                    </div>
                  </div>
                )}

                {daySelectionMode === 'calendar' && (
                  <div className="p-4 bg-gray-50 rounded-xl border">
                    <p className="text-sm text-muted-foreground mb-2">
                      Clicca sui giorni per selezionarli/deselezionarli
                    </p>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {selectedDates.slice(0, 14).map(date => (
                        <Badge key={date.toISOString()} variant="secondary" className="text-xs">
                          {format(date, 'd MMM', { locale: it })}
                        </Badge>
                      ))}
                      {selectedDates.length > 14 && (
                        <Badge variant="outline">+{selectedDates.length - 14}</Badge>
                      )}
                    </div>
                    
                    {selectedDates.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedDates([])}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Cancella selezione
                      </Button>
                    )}
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
              </div>
              
              <div className="w-[340px] shrink-0">
                <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 shadow-sm">
                  <Calendar
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={(dates: Date[] | undefined) => {
                      if (daySelectionMode === 'calendar') {
                        setSelectedDates(dates || []);
                      }
                    }}
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    locale={it}
                    className="w-full"
                    classNames={{
                      months: "flex flex-col",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-base font-semibold",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 rounded-lg hover:bg-gray-100",
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex",
                      head_cell: "text-muted-foreground rounded-md w-10 font-medium text-[0.8rem]",
                      row: "flex w-full mt-2",
                      cell: cn(
                        "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                        "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
                      ),
                      day: cn(
                        "h-10 w-10 p-0 font-normal rounded-lg",
                        "hover:bg-primary/10 hover:text-primary",
                        "focus:bg-primary focus:text-primary-foreground"
                      ),
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground font-bold",
                      day_outside: "text-muted-foreground opacity-50",
                      day_disabled: "text-muted-foreground opacity-50",
                      day_hidden: "invisible",
                    }}
                    modifiers={{
                      inRange: daySelectionMode === 'range' 
                        ? periodDays 
                        : []
                    }}
                    modifiersClassNames={{
                      inRange: "bg-primary/20 text-primary"
                    }}
                  />
                  
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Giorni selezionati</span>
                    <span className="text-xl font-bold text-primary">{periodDays.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="templates" className="mt-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca template..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-template-search"
                />
              </div>
              
              <Select value={templateFilter} onValueChange={(v) => setTemplateFilter(v as TemplateFilter)}>
                <SelectTrigger className="w-40" data-testid="select-template-filter">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="global">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Globali
                    </div>
                  </SelectItem>
                  <SelectItem value="store">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Proprietari
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {templatesLoading ? (
              <div className="text-center py-8">Caricamento template...</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Layers className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nessun template trovato</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map(template => {
                  const isSelected = templateSelections.find(ts => ts.templateId === template.id);
                  return (
                    <div 
                      key={template.id}
                      className={cn(
                        "group relative p-5 rounded-2xl cursor-pointer transition-all duration-300",
                        "bg-white/80 backdrop-blur-sm border-2",
                        "hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1",
                        isSelected 
                          ? "border-primary bg-primary/5 shadow-lg" 
                          : "border-gray-100 hover:border-primary/30"
                      )}
                      onClick={() => handleTemplateToggle(template)}
                      data-testid={`template-card-${template.id}`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${template.color}20` }}
                        >
                          <Layers className="w-6 h-6" style={{ color: template.color }} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-base truncate">{template.name}</h3>
                            {isSelected && (
                              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                            )}
                          </div>
                          
                          <Badge 
                            variant={template.scope === 'global' ? 'default' : 'secondary'} 
                            className="text-[10px]"
                          >
                            {template.scope === 'global' ? (
                              <><Globe className="w-3 h-3 mr-1" /> Globale</>
                            ) : (
                              <><Building2 className="w-3 h-3 mr-1" /> Proprietario</>
                            )}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {template.timeSlots.map((slot, idx) => (
                          <div 
                            key={idx}
                            className="flex items-center gap-2 p-2 rounded-lg bg-gray-50"
                          >
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {slot.startTime} - {slot.endTime}
                            </span>
                            <Badge variant="outline" className="ml-auto text-[10px]">
                              {slot.requiredStaff} staff
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
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
            <div className="flex gap-6">
              <div className="w-72 shrink-0">
                <div className="bg-white rounded-2xl border-2 border-gray-100 p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Risorse Disponibili
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Clicca per vedere i dettagli, trascina per assegnare
                  </p>
                  
                  <ScrollArea className="h-[320px] -mx-2 px-2">
                    <div className="space-y-2">
                      {resources.map(resource => {
                        const isSelected = selectedResourceId === resource.id;
                        const assignmentsCount = resourceAssignments.filter(
                          ra => ra.resourceId === resource.id
                        ).length;
                        
                        return (
                          <div
                            key={resource.id}
                            draggable
                            onDragStart={() => setDraggedResource(resource)}
                            onDragEnd={() => setDraggedResource(null)}
                            onClick={() => setSelectedResourceId(isSelected ? null : resource.id)}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                              "border-2",
                              isSelected 
                                ? "bg-primary/5 border-primary shadow-sm" 
                                : "bg-gray-50 border-transparent hover:bg-gray-100 hover:border-gray-200",
                              "active:cursor-grabbing"
                            )}
                            data-testid={`resource-${resource.id}`}
                          >
                            <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
                            
                            <Avatar className={cn("h-10 w-10", getAvatarColor(resource.id))}>
                              <AvatarFallback className="text-white text-sm font-semibold">
                                {getInitials(resource.firstName, resource.lastName, resource.email)}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {resource.firstName} {resource.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {resource.role || resource.email}
                              </p>
                            </div>
                            
                            {assignmentsCount > 0 && (
                              <Badge variant="secondary" className="shrink-0">
                                {assignmentsCount}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>
              
              <div className="flex-1">
                {selectedResource ? (
                  <div className="bg-white rounded-2xl border-2 border-gray-100 p-5">
                    <div className="flex items-start gap-4 mb-6">
                      <Avatar className={cn("h-16 w-16", getAvatarColor(selectedResource.id))}>
                        <AvatarFallback className="text-white text-xl font-semibold">
                          {getInitials(selectedResource.firstName, selectedResource.lastName, selectedResource.email)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <h2 className="text-xl font-semibold">
                          {selectedResource.firstName} {selectedResource.lastName}
                        </h2>
                        <p className="text-sm text-muted-foreground">{selectedResource.email}</p>
                        {selectedResource.role && (
                          <Badge variant="secondary" className="mt-2">
                            <Briefcase className="w-3 h-3 mr-1" />
                            {selectedResource.role}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-medium">Ore Pianificate</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-700">
                          {resourceStats?.totalHours || 0}h
                        </p>
                      </div>
                      
                      <div className="p-4 rounded-xl bg-green-50 border border-green-100">
                        <div className="flex items-center gap-2 text-green-600 mb-1">
                          <CalendarCheck className="w-4 h-4" />
                          <span className="text-sm font-medium">Giorni Liberi</span>
                        </div>
                        <p className="text-2xl font-bold text-green-700">
                          {resourceStats?.freeDays.length || periodDays.length}
                        </p>
                      </div>
                      
                      <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                        <div className="flex items-center gap-2 text-purple-600 mb-1">
                          <CalendarDays className="w-4 h-4" />
                          <span className="text-sm font-medium">Giorni Occupati</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-700">
                          {resourceStats?.busyDays.length || 0}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        Disponibilità nel periodo
                      </h4>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <Calendar
                          mode="multiple"
                          selected={resourceStats?.busyDays || []}
                          month={periodDays[0] || new Date()}
                          locale={it}
                          disabled
                          className="pointer-events-none"
                          classNames={{
                            day_selected: "bg-purple-500 text-white",
                            day: "h-9 w-9 rounded-lg",
                          }}
                          modifiers={{
                            free: resourceStats?.freeDays || [],
                            busy: resourceStats?.busyDays || []
                          }}
                          modifiersClassNames={{
                            free: "bg-green-100 text-green-700",
                            busy: "bg-purple-100 text-purple-700"
                          }}
                        />
                        
                        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-green-100 border border-green-200" />
                            <span className="text-xs text-muted-foreground">Libero</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-purple-100 border border-purple-200" />
                            <span className="text-xs text-muted-foreground">Occupato</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <div className="text-center py-12">
                      <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium text-gray-500 mb-2">
                        Seleziona una risorsa
                      </p>
                      <p className="text-sm text-muted-foreground max-w-xs">
                        Clicca su una risorsa dalla lista per vedere le sue informazioni e disponibilità
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <div className="mb-3 flex items-center justify-between">
          <TimelineLegend />
          {draggedResource && (
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg border border-primary/30 animate-pulse">
              <User className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Trascinando: {draggedResource.firstName} {draggedResource.lastName}
              </span>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          {periodDays.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            
            return (
              <TimelineBar
                key={dayStr}
                day={dayStr}
                dayLabel={format(day, 'EEE d MMM', { locale: it })}
                lanes={buildTimelineLanes(day)}
                startHour={6}
                endHour={24}
                isDragging={!!draggedResource}
                onDropResource={(templateId, slotId, dropDay) => {
                  if (draggedResource) {
                    handleResourceDrop(templateId, slotId, dropDay, draggedResource);
                  }
                }}
              />
            );
          })}
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
