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
import { Label } from '@/components/ui/label';
import { 
  Store as StoreIcon, Calendar as CalendarIcon, Users, 
  ChevronLeft, ChevronRight, Check, AlertTriangle, AlertCircle,
  Clock, CheckCircle2, XCircle, User, Plus, Minus, 
  ArrowRight, Layers, Eye, Save, RotateCcw,
  CalendarDays, CalendarRange, Trash2, Search, MapPin, 
  Phone, Filter, Globe, Building2, Briefcase, CalendarCheck,
  AlertOctagon, CalendarX, Star, Edit, RefreshCcw, UserSwitch
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isWeekend, getDay, parseISO, isSameDay, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { useShiftPlanningStore, type ShiftTemplate, type TimeSlot, type ResourceAssignment, type ConflictInfo } from '@/stores/shiftPlanningStore';
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
  weeklyHours?: number;
  contractType?: string;
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
    conflicts,
    hasConflicts,
    planningExists,
    isLoadingPlanning,
    setStore,
    setPeriod,
    setStoreOpeningHours,
    addTemplateSelection,
    removeTemplateSelection,
    toggleDayForTemplate,
    selectAllDaysForTemplate,
    assignResource,
    removeResourceAssignment,
    loadExistingPlanning,
    setLoadingPlanning,
    setPlanningExists,
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
  
  const [storeSearch, setStoreSearch] = useState('');
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>('all');
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  
  const [selectedSlotForAssignment, setSelectedSlotForAssignment] = useState<string | null>(null);
  const [assignmentMode, setAssignmentMode] = useState<'single' | 'bulk'>('bulk');
  const [singleAssignmentDay, setSingleAssignmentDay] = useState<Date | null>(null);
  const [hoveredCalendarDay, setHoveredCalendarDay] = useState<Date | null>(null);
  const [resourceCalendarMonth, setResourceCalendarMonth] = useState(new Date());
  
  const [showSummaryFilterModal, setShowSummaryFilterModal] = useState(false);
  const [summaryFilterDay, setSummaryFilterDay] = useState<Date | null>(null);
  const [summaryFilterStores, setSummaryFilterStores] = useState<string[]>([]);
  const [summaryFilterResources, setSummaryFilterResources] = useState<string[]>([]);
  
  const [showSegmentActionModal, setShowSegmentActionModal] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<{
    resourceId: string;
    resourceName: string;
    templateId: string;
    slotId: string;
    day: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  const [segmentNewResourceId, setSegmentNewResourceId] = useState<string>('');
  const [segmentNewStartTime, setSegmentNewStartTime] = useState<string>('');
  const [segmentNewEndTime, setSegmentNewEndTime] = useState<string>('');
  
  const [showSummaryCalendar, setShowSummaryCalendar] = useState(true);
  
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

  // ==================== RESOURCE AVAILABILITY (FERIE, MALATTIA) ====================
  interface ResourceAvailabilityPeriod {
    id: string;
    type: string;
    label: string;
    startDate: string;
    endDate: string;
    isFullDay: boolean;
    reason: string | null;
  }
  
  interface ResourceAvailabilitySummary {
    userId: string;
    totalBlocks: number;
    periods: ResourceAvailabilityPeriod[];
  }
  
  const periodStartStr = periodDays.length > 0 ? format(periodDays[0], 'yyyy-MM-dd') : null;
  const periodEndStr = periodDays.length > 0 ? format(periodDays[periodDays.length - 1], 'yyyy-MM-dd') : null;
  
  const { data: availabilityData } = useQuery<{
    success: boolean;
    availability: ResourceAvailabilitySummary[];
    totalResourcesWithBlocks: number;
  }>({
    queryKey: ['/api/hr/resources/availability', { startDate: periodStartStr, endDate: periodEndStr }],
    enabled: !!periodStartStr && !!periodEndStr,
  });

  // Create a map for quick lookup of resource availability blocks
  const resourceAvailabilityMap = useMemo(() => {
    const map = new Map<string, ResourceAvailabilitySummary>();
    if (availabilityData?.availability) {
      availabilityData.availability.forEach(item => {
        map.set(item.userId, item);
      });
    }
    return map;
  }, [availabilityData]);

  // Check if a resource has blocking availability for a specific date
  const hasBlockingAvailability = useCallback((resourceId: string, dateStr: string): ResourceAvailabilityPeriod | null => {
    const availability = resourceAvailabilityMap.get(resourceId);
    if (!availability) return null;
    
    return availability.periods.find(period => {
      const date = new Date(dateStr);
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);
      return date >= start && date <= end;
    }) || null;
  }, [resourceAvailabilityMap]);

  // Get overall availability status for a resource in the period
  const getResourceAvailabilityStatus = useCallback((resourceId: string): { hasBlocks: boolean; periods: ResourceAvailabilityPeriod[] } => {
    const availability = resourceAvailabilityMap.get(resourceId);
    return {
      hasBlocks: !!availability && availability.totalBlocks > 0,
      periods: availability?.periods || []
    };
  }, [resourceAvailabilityMap]);

  const resourceCalendarDays = useMemo(() => {
    const monthStart = startOfMonth(resourceCalendarMonth);
    const monthEnd = endOfMonth(resourceCalendarMonth);
    const startDay = getDay(monthStart);
    const adjustedStartDay = startDay === 0 ? 6 : startDay - 1;
    
    const calendarStart = addDays(monthStart, -adjustedStartDay);
    
    const allMonthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const totalDays = adjustedStartDay + allMonthDays.length;
    const rowsNeeded = Math.ceil(totalDays / 7);
    const totalCells = rowsNeeded * 7;
    const paddingEnd = totalCells - allMonthDays.length - adjustedStartDay;
    
    const calendarEnd = addDays(monthEnd, paddingEnd);
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd }).map(day => ({
      date: day,
      isCurrentMonth: isSameMonth(day, resourceCalendarMonth),
      isInPeriod: periodDays.some(pd => isSameDay(pd, day)),
      isToday: isSameDay(day, new Date())
    }));
  }, [resourceCalendarMonth, periodDays]);

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
    const hoursByWeek: Record<string, number> = {};
    
    resourceAssignmentsForPeriod.forEach(ra => {
      assignedDays.add(ra.day);
      const slot = coveragePreview.find(
        s => s.templateId === ra.templateId && s.slotId === ra.slotId && s.day === ra.day
      );
      if (slot) {
        const start = parseInt(slot.startTime.substring(0, 2)) * 60 + parseInt(slot.startTime.substring(3, 5));
        const end = parseInt(slot.endTime.substring(0, 2)) * 60 + parseInt(slot.endTime.substring(3, 5));
        const hours = (end - start) / 60;
        totalHours += hours;
        
        const weekKey = format(startOfWeek(new Date(ra.day), { weekStartsOn: 1 }), 'yyyy-MM-dd');
        hoursByWeek[weekKey] = (hoursByWeek[weekKey] || 0) + hours;
      }
    });
    
    const freeDays = periodDays.filter(d => !assignedDays.has(format(d, 'yyyy-MM-dd')));
    const busyDays = periodDays.filter(d => assignedDays.has(format(d, 'yyyy-MM-dd')));
    
    const contractHours = selectedResource.weeklyHours || 40;
    
    const allWeeksInPeriod = new Set<string>();
    periodDays.forEach(day => {
      const weekKey = format(startOfWeek(day, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      allWeeksInPeriod.add(weekKey);
    });
    
    const weeksInPeriod = Array.from(allWeeksInPeriod)
      .map(weekKey => {
        const hours = hoursByWeek[weekKey] || 0;
        return {
          weekKey,
          weekStart: new Date(weekKey),
          hours: Math.round(hours * 10) / 10,
          overtime: Math.max(0, Math.round((hours - contractHours) * 10) / 10),
          status: hours > contractHours + 4 ? 'danger' as const :
                  hours > contractHours ? 'warning' as const : 'ok' as const
        };
      })
      .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
    
    const worstStatus = weeksInPeriod.reduce((worst, week) => {
      if (week.status === 'danger') return 'danger';
      if (week.status === 'warning' && worst !== 'danger') return 'warning';
      return worst;
    }, 'ok' as 'ok' | 'warning' | 'danger');
    
    const totalOvertime = weeksInPeriod.reduce((sum, w) => sum + w.overtime, 0);
    
    return {
      totalHours: Math.round(totalHours * 10) / 10,
      freeDays,
      busyDays,
      assignmentsCount: resourceAssignmentsForPeriod.length,
      weeksInPeriod,
      contractHours,
      overtimeStatus: worstStatus,
      totalOvertime: Math.round(totalOvertime * 10) / 10
    };
  }, [selectedResource, resourceAssignments, coveragePreview, periodDays]);

  const availableTemplatesForAssignment = useMemo(() => {
    return templateSelections.map(ts => {
      const slotsInfo = ts.template.timeSlots.map(slot => ({
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        label: slot.label
      }));
      
      const timesLabel = slotsInfo.map(s => `${s.startTime}-${s.endTime}`).join(', ');
      
      return {
        id: ts.templateId,
        templateId: ts.templateId,
        templateName: ts.template.name,
        label: `${ts.template.name} (${timesLabel})`,
        slots: slotsInfo,
        color: ts.template.color
      };
    });
  }, [templateSelections]);

  const summaryFilteredCoverage = useMemo(() => {
    if (!summaryFilterDay) return [];
    
    const dayStr = format(summaryFilterDay, 'yyyy-MM-dd');
    let filtered = coveragePreview.filter(c => c.day === dayStr);
    
    if (summaryFilterResources.length > 0) {
      filtered = filtered.filter(c => 
        c.assignedResources.some(ar => summaryFilterResources.includes(ar.resourceId))
      );
    }
    
    return filtered;
  }, [summaryFilterDay, coveragePreview, summaryFilterResources]);

  const allResourcesInCoverage = useMemo(() => {
    const resourceIds = new Set<string>();
    coveragePreview.forEach(c => {
      c.assignedResources.forEach(ar => resourceIds.add(ar.resourceId));
    });
    return resources.filter(r => resourceIds.has(r.id));
  }, [coveragePreview, resources]);

  const handleOpenSummaryModal = useCallback((day: Date) => {
    setSummaryFilterDay(day);
    setSummaryFilterResources([]);
    setShowSummaryFilterModal(true);
  }, []);

  const getResourceDayInfo = useCallback((resourceId: string, day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const assignments = resourceAssignments.filter(
      ra => ra.resourceId === resourceId && ra.day === dayStr
    );
    
    if (assignments.length === 0) return null;
    
    return assignments.map(ra => {
      const slot = coveragePreview.find(
        s => s.templateId === ra.templateId && s.slotId === ra.slotId && s.day === dayStr
      );
      return {
        templateName: slot?.templateName || 'Turno',
        startTime: slot?.startTime || '',
        endTime: slot?.endTime || '',
        storeName: selectedStoreName
      };
    });
  }, [resourceAssignments, coveragePreview, selectedStoreName]);

  const suggestedResources = useMemo(() => {
    if (!selectedStoreId) return [];
    
    return resources
      .filter(r => r.storeId === selectedStoreId)
      .map(r => {
        const assignmentsForPeriod = resourceAssignments.filter(
          ra => ra.resourceId === r.id
        );
        
        let hoursAssigned = 0;
        assignmentsForPeriod.forEach(ra => {
          const slot = coveragePreview.find(
            s => s.templateId === ra.templateId && s.slotId === ra.slotId && s.day === ra.day
          );
          if (slot) {
            const start = parseInt(slot.startTime.substring(0, 2)) * 60 + parseInt(slot.startTime.substring(3, 5));
            const end = parseInt(slot.endTime.substring(0, 2)) * 60 + parseInt(slot.endTime.substring(3, 5));
            hoursAssigned += (end - start) / 60;
          }
        });
        
        const contractHours = r.weeklyHours || 40;
        const availableHours = Math.max(0, contractHours - hoursAssigned);
        const status: 'available' | 'busy' | 'overtime' = 
          hoursAssigned === 0 ? 'available' :
          hoursAssigned >= contractHours ? 'overtime' : 'busy';
        
        return {
          ...r,
          assignmentsCount: assignmentsForPeriod.length,
          hoursAssigned: Math.round(hoursAssigned * 10) / 10,
          availableHours: Math.round(availableHours * 10) / 10,
          status
        };
      })
      .sort((a, b) => a.hoursAssigned - b.hoursAssigned);
  }, [resources, selectedStoreId, resourceAssignments, coveragePreview]);

  const otherResources = useMemo(() => {
    if (!selectedStoreId) return resources;
    return resources.filter(r => r.storeId !== selectedStoreId);
  }, [resources, selectedStoreId]);

  const handleAssignResource = () => {
    if (!selectedResource || !selectedSlotForAssignment) {
      toast({ title: "Seleziona un turno", variant: "destructive" });
      return;
    }
    
    const template = availableTemplatesForAssignment.find(t => t.id === selectedSlotForAssignment);
    if (!template) return;
    
    const daysToAssign = assignmentMode === 'single' && singleAssignmentDay 
      ? [singleAssignmentDay]
      : periodDays;
    
    let assignedCount = 0;
    let conflictCount = 0;
    let availabilityBlockCount = 0;
    const conflictsFound: ConflictInfo[] = [];
    const availabilityBlocksFound: Array<{ day: string; label: string }> = [];
    const resourceName = `${selectedResource.firstName || ''} ${selectedResource.lastName || ''}`.trim() || selectedResource.email;
    
    daysToAssign.forEach(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      
      // ✅ Check for blocking availability (ferie, malattia, permessi)
      const blockingPeriod = hasBlockingAvailability(selectedResource.id, dayStr);
      if (blockingPeriod) {
        availabilityBlockCount++;
        availabilityBlocksFound.push({ day: dayStr, label: blockingPeriod.label });
        return; // Skip this day - resource is blocked
      }
      
      template.slots.forEach(slot => {
        const alreadyAssigned = resourceAssignments.some(
          ra => ra.resourceId === selectedResource.id && 
                ra.templateId === template.templateId && 
                ra.slotId === slot.id && 
                ra.day === dayStr
        );
        
        if (!alreadyAssigned) {
          // Try to assign - store will check for conflicts and return conflict if blocked
          const conflict = assignResource({
            templateId: template.templateId,
            slotId: slot.id,
            day: dayStr,
            resourceId: selectedResource.id,
            resourceName,
            startTime: slot.startTime,
            endTime: slot.endTime
          });
          
          if (conflict) {
            conflictCount++;
            conflictsFound.push(conflict);
          } else {
            assignedCount++;
          }
        }
      });
    });
    
    // Show availability block warning with details
    if (availabilityBlockCount > 0) {
      const firstBlock = availabilityBlocksFound[0];
      toast({ 
        title: "Giorni bloccati esclusi", 
        description: `${availabilityBlockCount} ${availabilityBlockCount === 1 ? 'giorno escluso' : 'giorni esclusi'} per ${firstBlock.label}. Risorsa non disponibile in quelle date.`,
        variant: "destructive"
      });
    }
    
    if (conflictCount > 0) {
      toast({ 
        title: "Conflitti rilevati", 
        description: `${conflictCount} assegnazioni saltate per sovrapposizione orari. ${conflictsFound[0]?.message || ''}`,
        variant: "destructive"
      });
    }
    
    if (assignedCount > 0) {
      toast({ 
        title: "Turno assegnato", 
        description: `${selectedResource.firstName} assegnato al turno "${template.templateName}" per ${assignedCount} ${assignedCount === 1 ? 'turno' : 'turni'}`
      });
      computeCoverage();
    }
  };

  useEffect(() => {
    setSelectedSlotForAssignment(null);
    setAssignmentMode('bulk');
    setSingleAssignmentDay(null);
  }, [selectedResourceId]);

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

  // Memoize period dates to avoid unnecessary re-renders
  const periodStartDate = useMemo(() => {
    const result = periodDays.length > 0 ? format(periodDays[0], 'yyyy-MM-dd') : null;
    console.log('[PLANNING-MEMO] periodStartDate recalculated:', result, 'from', periodDays.length, 'days');
    return result;
  }, [periodDays]);
  
  const periodEndDate = useMemo(() => {
    const result = periodDays.length > 0 ? format(periodDays[periodDays.length - 1], 'yyyy-MM-dd') : null;
    console.log('[PLANNING-MEMO] periodEndDate recalculated:', result);
    return result;
  }, [periodDays]);
  
  // Debug: Log when selectedStoreId changes
  useEffect(() => {
    console.log('[PLANNING-DEBUG] selectedStoreId changed:', selectedStoreId);
  }, [selectedStoreId]);

  // Load existing planning when store and period are selected
  useEffect(() => {
    const loadPlanning = async () => {
      if (!selectedStoreId || !periodStartDate || !periodEndDate) {
        console.log('[PLANNING] Skipping load - missing params:', { selectedStoreId, periodStartDate, periodEndDate });
        return;
      }
      
      setLoadingPlanning(true);
      try {
        console.log('[PLANNING] ========== LOADING EXISTING PLANNING ==========');
        console.log('[PLANNING] Store ID:', selectedStoreId);
        console.log('[PLANNING] Period:', periodStartDate, '->', periodEndDate);
        
        // Use apiRequest for proper authentication headers
        const planning = await apiRequest(
          `/api/hr/shifts/planning?storeId=${selectedStoreId}&startDate=${periodStartDate}&endDate=${periodEndDate}`,
          { method: 'GET' }
        );
        
        console.log('[PLANNING] Response exists:', planning.exists);
        console.log('[PLANNING] Shifts count:', planning.shifts?.length || 0);
        console.log('[PLANNING] Assignments count:', planning.assignments?.length || 0);
        console.log('[PLANNING] Templates count:', planning.templates?.length || 0);
        
        if (planning.exists && planning.shifts?.length > 0) {
          console.log('[PLANNING] Loading existing planning into store...');
          loadExistingPlanning(planning);
          toast({
            title: "Pianificazione caricata",
            description: `Trovati ${planning.shifts.length} turni con ${planning.assignments?.length || 0} assegnazioni`
          });
        } else {
          console.log('[PLANNING] No existing planning found');
          setPlanningExists(false);
        }
      } catch (error) {
        console.error('[PLANNING] Error loading planning:', error);
      } finally {
        setLoadingPlanning(false);
      }
    };
    
    loadPlanning();
  }, [selectedStoreId, periodStartDate, periodEndDate, loadExistingPlanning, setLoadingPlanning, setPlanningExists, toast]);

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
            {isLoadingPlanning && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Caricamento...
              </div>
            )}
            {planningExists && !isLoadingPlanning && (
              <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50">
                <CalendarCheck className="w-3 h-3 mr-1" />
                Pianificazione esistente
              </Badge>
            )}
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredStores.map(store => (
                <div 
                  key={store.id}
                  className={cn(
                    "group relative p-3 rounded-xl cursor-pointer transition-all duration-200",
                    "bg-white border",
                    "hover:shadow-md hover:border-primary/40",
                    selectedStoreId === store.id 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-gray-200"
                  )}
                  onClick={() => handleStoreSelect(store.id)}
                  data-testid={`store-card-${store.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      "bg-gradient-to-br from-primary/10 to-primary/20"
                    )}>
                      <StoreIcon className="w-5 h-5 text-primary" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm truncate">
                          {store.nome || store.name}
                        </h3>
                        {selectedStoreId === store.id && (
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-0.5">
                        {store.code && (
                          <span className="text-[10px] text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
                            {store.code}
                          </span>
                        )}
                        {store.city && (
                          <span className="text-[11px] text-muted-foreground truncate">
                            {store.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
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
              <div className="w-[40%] shrink-0 space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Modalità selezione</h3>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                    <button
                      className={cn(
                        "flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all",
                        daySelectionMode === 'range' 
                          ? "bg-white shadow-sm text-primary" 
                          : "text-gray-600 hover:text-gray-900"
                      )}
                      onClick={() => setDaySelectionMode('range')}
                      data-testid="btn-range-mode"
                    >
                      <CalendarRange className="w-4 h-4" />
                      Intervallo
                    </button>
                    <button
                      className={cn(
                        "flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all",
                        daySelectionMode === 'calendar' 
                          ? "bg-white shadow-sm text-primary" 
                          : "text-gray-600 hover:text-gray-900"
                      )}
                      onClick={() => setDaySelectionMode('calendar')}
                      data-testid="btn-calendar-mode"
                    >
                      <CalendarDays className="w-4 h-4" />
                      Selezione libera
                    </button>
                  </div>
                </div>

                {daySelectionMode === 'range' && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Periodo pianificazione</h3>
                    
                    <div className="space-y-4">
                      <div className="relative">
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Data inizio</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="w-full justify-between h-11 font-medium" 
                              data-testid="btn-date-from"
                            >
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-primary" />
                                {format(dateRange.from, 'EEEE d MMMM yyyy', { locale: it })}
                              </div>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start" container={null}>
                            <Calendar
                              mode="single"
                              selected={dateRange.from}
                              onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                              locale={it}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div className="flex items-center justify-center">
                        <div className="flex items-center gap-2 text-gray-400">
                          <div className="h-px w-8 bg-gray-200" />
                          <ArrowRight className="w-4 h-4" />
                          <div className="h-px w-8 bg-gray-200" />
                        </div>
                      </div>
                      
                      <div className="relative">
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Data fine</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="w-full justify-between h-11 font-medium" 
                              data-testid="btn-date-to"
                            >
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-primary" />
                                {format(dateRange.to, 'EEEE d MMMM yyyy', { locale: it })}
                              </div>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start" container={null}>
                            <Calendar
                              mode="single"
                              selected={dateRange.to}
                              onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                              locale={it}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                        <span className="text-sm font-medium text-gray-600">Giorni totali</span>
                        <span className="text-2xl font-bold text-primary">{periodDays.length}</span>
                      </div>
                    </div>
                  </div>
                )}

                {daySelectionMode === 'calendar' && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Selezione libera</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Clicca sui giorni nel calendario per selezionarli o deselezionarli
                    </p>
                    
                    {selectedDates.length > 0 ? (
                      <>
                        <div className="flex flex-wrap gap-1.5 mb-4 max-h-32 overflow-y-auto">
                          {selectedDates.sort((a, b) => a.getTime() - b.getTime()).map(date => (
                            <Badge 
                              key={date.toISOString()} 
                              variant="secondary" 
                              className="text-xs py-1 cursor-pointer hover:bg-red-100 hover:text-red-600 transition-colors"
                              onClick={() => setSelectedDates(prev => prev.filter(d => d.getTime() !== date.getTime()))}
                            >
                              {format(date, 'd MMM', { locale: it })}
                              <span className="ml-1 opacity-50">×</span>
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedDates([])}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Cancella tutto
                          </Button>
                          <span className="text-sm font-medium">
                            <span className="text-2xl font-bold text-primary mr-1">{selectedDates.length}</span>
                            giorni
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-6 text-gray-400">
                        <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">Nessun giorno selezionato</p>
                      </div>
                    )}
                  </div>
                )}
                
                {periodDays.length > 0 && (
                  <Button 
                    className="w-full h-11" 
                    onClick={() => setActiveTab('templates')}
                    data-testid="btn-next-templates"
                  >
                    Avanti: Seleziona Template
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
              
              <div className="flex-1">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm h-full">
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
                    numberOfMonths={1}
                    className="w-full"
                    classNames={{
                      months: "flex flex-col w-full",
                      month: "space-y-6 w-full",
                      caption: "flex justify-center pt-2 relative items-center mb-4",
                      caption_label: "text-lg font-bold text-gray-800",
                      nav: "space-x-2 flex items-center",
                      nav_button: "h-9 w-9 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors",
                      nav_button_previous: "absolute left-2",
                      nav_button_next: "absolute right-2",
                      table: "w-full border-collapse",
                      head_row: "flex w-full mb-2",
                      head_cell: "text-muted-foreground rounded-md flex-1 font-semibold text-sm text-center py-2",
                      row: "flex w-full",
                      cell: cn(
                        "relative flex-1 p-1 text-center text-sm focus-within:relative focus-within:z-20"
                      ),
                      day: cn(
                        "h-12 w-full p-0 font-medium rounded-lg text-base",
                        "hover:bg-primary/10 hover:text-primary transition-colors",
                        "focus:bg-primary focus:text-primary-foreground"
                      ),
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground font-bold",
                      day_today: "bg-orange-100 text-orange-700 font-bold",
                      day_outside: "text-muted-foreground opacity-40",
                      day_disabled: "text-muted-foreground opacity-30",
                      day_hidden: "invisible",
                    }}
                    modifiers={{
                      inRange: daySelectionMode === 'range' 
                        ? periodDays 
                        : []
                    }}
                    modifiersClassNames={{
                      inRange: "bg-primary/20 text-primary font-semibold"
                    }}
                  />
                  
                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-primary" />
                        <span className="text-xs text-muted-foreground">Selezionato</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-orange-100 border border-orange-200" />
                        <span className="text-xs text-muted-foreground">Oggi</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-muted-foreground">Giorni selezionati: </span>
                      <span className="text-xl font-bold text-primary">{periodDays.length}</span>
                    </div>
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
                <SelectContent container={null}>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredTemplates.map(template => {
                  const isSelected = templateSelections.find(ts => ts.templateId === template.id);
                  return (
                    <div 
                      key={template.id}
                      className={cn(
                        "group relative p-3 rounded-xl cursor-pointer transition-all duration-200",
                        "bg-white border",
                        "hover:shadow-md hover:border-primary/40",
                        isSelected 
                          ? "border-primary bg-primary/5 shadow-sm" 
                          : "border-gray-200"
                      )}
                      onClick={() => handleTemplateToggle(template)}
                      data-testid={`template-card-${template.id}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${template.color}20` }}
                        >
                          <Layers className="w-4 h-4" style={{ color: template.color }} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-medium text-sm truncate">{template.name}</h3>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            )}
                          </div>
                        </div>
                        
                        <Badge 
                          variant={template.scope === 'global' ? 'default' : 'outline'} 
                          className="text-[9px] h-5 px-1.5"
                        >
                          {template.scope === 'global' ? 'G' : 'P'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        {template.timeSlots.map((slot, idx) => (
                          <div 
                            key={idx}
                            className="flex items-center justify-between text-xs px-2 py-1 rounded bg-gray-50"
                          >
                            <span className="font-medium text-gray-700">
                              {slot.startTime} - {slot.endTime}
                            </span>
                            <span className="text-gray-500">{slot.requiredStaff}p</span>
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
            <div className="flex gap-4">
              <div className="w-64 shrink-0">
                <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-3">
                  {suggestedResources.length > 0 && (
                    <div>
                      <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-500" />
                        Suggeriti ({suggestedResources.length})
                      </h3>
                      <p className="text-[10px] text-muted-foreground mb-2">
                        Risorse assegnate a {selectedStoreName}
                      </p>
                      <div className="space-y-1">
                        {suggestedResources.map(resource => {
                          const isSelected = selectedResourceId === resource.id;
                          const availabilityStatus = getResourceAvailabilityStatus(resource.id);
                          
                          return (
                            <div
                              key={resource.id}
                              onClick={() => setSelectedResourceId(isSelected ? null : resource.id)}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all",
                                isSelected 
                                  ? "bg-primary/10 ring-1 ring-primary" 
                                  : availabilityStatus.hasBlocks 
                                    ? "hover:bg-red-50/80 bg-red-50/50 border border-red-200"
                                    : "hover:bg-amber-50 bg-amber-50/50"
                              )}
                              data-testid={`suggested-resource-${resource.id}`}
                            >
                              <div className="relative">
                                <Avatar className={cn("h-8 w-8", getAvatarColor(resource.id))}>
                                  <AvatarFallback className="text-white text-xs font-semibold">
                                    {getInitials(resource.firstName, resource.lastName, resource.email)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className={cn(
                                  "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                                  availabilityStatus.hasBlocks ? "bg-red-500" :
                                  resource.status === 'available' ? "bg-green-500" :
                                  resource.status === 'busy' ? "bg-amber-500" :
                                  resource.status === 'overtime' ? "bg-red-500" : "bg-gray-400"
                                )} />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">
                                  {resource.firstName} {resource.lastName}
                                </p>
                                {availabilityStatus.hasBlocks ? (
                                  <p className="text-[10px] text-red-600 font-medium truncate flex items-center gap-1">
                                    <AlertOctagon className="w-3 h-3" />
                                    {availabilityStatus.periods[0]?.label}
                                  </p>
                                ) : (
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {resource.availableHours}h disp. • {resource.hoursAssigned}h ass.
                                  </p>
                                )}
                              </div>
                              
                              {availabilityStatus.hasBlocks ? (
                                <Badge variant="destructive" className="h-5 text-[10px] px-1.5">
                                  Blocco
                                </Badge>
                              ) : resource.assignmentsCount > 0 ? (
                                <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                                  {resource.assignmentsCount}
                                </Badge>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {otherResources.length > 0 && (
                    <div>
                      <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        Altre risorse ({otherResources.length})
                      </h3>
                      
                      <ScrollArea className={cn(
                        "-mx-1 px-1",
                        suggestedResources.length > 0 ? "h-[200px]" : "h-[400px]"
                      )}>
                        <div className="space-y-1">
                          {otherResources.map(resource => {
                            const isSelected = selectedResourceId === resource.id;
                            const assignmentsCount = resourceAssignments.filter(
                              ra => ra.resourceId === resource.id
                            ).length;
                            const availabilityStatus = getResourceAvailabilityStatus(resource.id);
                            
                            return (
                              <div
                                key={resource.id}
                                onClick={() => setSelectedResourceId(isSelected ? null : resource.id)}
                                className={cn(
                                  "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all",
                                  isSelected 
                                    ? "bg-primary/10 ring-1 ring-primary" 
                                    : availabilityStatus.hasBlocks 
                                      ? "hover:bg-red-50/80 bg-red-50/50 border border-red-200"
                                      : "hover:bg-gray-50"
                                )}
                                data-testid={`resource-${resource.id}`}
                              >
                                <div className="relative">
                                  <Avatar className={cn("h-8 w-8", getAvatarColor(resource.id))}>
                                    <AvatarFallback className="text-white text-xs font-semibold">
                                      {getInitials(resource.firstName, resource.lastName, resource.email)}
                                    </AvatarFallback>
                                  </Avatar>
                                  {availabilityStatus.hasBlocks && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white bg-red-500" />
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">
                                    {resource.firstName} {resource.lastName}
                                  </p>
                                  {availabilityStatus.hasBlocks ? (
                                    <p className="text-[10px] text-red-600 font-medium truncate flex items-center gap-1">
                                      <AlertOctagon className="w-3 h-3" />
                                      {availabilityStatus.periods[0]?.label}
                                    </p>
                                  ) : (
                                    <p className="text-[10px] text-muted-foreground truncate">
                                      {resource.role || 'Staff'}
                                    </p>
                                  )}
                                </div>
                                
                                {availabilityStatus.hasBlocks ? (
                                  <Badge variant="destructive" className="h-5 text-[10px] px-1.5">
                                    Blocco
                                  </Badge>
                                ) : assignmentsCount > 0 ? (
                                  <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                                    {assignmentsCount}
                                  </Badge>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                  
                  {suggestedResources.length === 0 && otherResources.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      Nessuna risorsa disponibile
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 flex flex-col min-h-0">
                {selectedResource ? (
                  <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col min-h-0 h-full space-y-3">
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                      <Avatar className={cn("h-10 w-10", getAvatarColor(selectedResource.id))}>
                        <AvatarFallback className="text-white text-sm font-semibold">
                          {getInitials(selectedResource.firstName, selectedResource.lastName, selectedResource.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h2 className="font-semibold text-base truncate">
                          {selectedResource.firstName} {selectedResource.lastName}
                        </h2>
                        <p className="text-xs text-muted-foreground truncate">{selectedResource.email}</p>
                      </div>
                      {selectedResource.role && (
                        <Badge variant="outline" className="text-[10px]">
                          {selectedResource.role}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2">
                      <div className="p-2 rounded-lg bg-blue-50 text-center">
                        <p className="text-lg font-bold text-blue-700">{resourceStats?.totalHours || 0}h</p>
                        <p className="text-[10px] text-blue-600">Ore periodo</p>
                      </div>
                      <div className="p-2 rounded-lg bg-green-50 text-center">
                        <p className="text-lg font-bold text-green-700">{resourceStats?.freeDays.length || 0}</p>
                        <p className="text-[10px] text-green-600">Liberi</p>
                      </div>
                      <div className="p-2 rounded-lg bg-purple-50 text-center">
                        <p className="text-lg font-bold text-purple-700">{resourceStats?.busyDays.length || 0}</p>
                        <p className="text-[10px] text-purple-600">Occupati</p>
                      </div>
                      <div className="p-2 rounded-lg bg-orange-50 text-center">
                        <p className="text-lg font-bold text-orange-700">{resourceStats?.assignmentsCount || 0}</p>
                        <p className="text-[10px] text-orange-600">Turni</p>
                      </div>
                    </div>
                    
                    {resourceStats && resourceStats.weeksInPeriod.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <p className="text-xs font-medium">Ore settimanali periodo</p>
                          <p className="text-[10px] text-gray-400">
                            (Contratto: {resourceStats.contractHours}h/sett.)
                          </p>
                        </div>
                        <div className="grid gap-1.5">
                          {resourceStats.weeksInPeriod.map((week) => (
                            <div 
                              key={week.weekKey}
                              className={cn(
                                "p-2 rounded-lg border flex items-center justify-between",
                                week.status === 'ok' && "bg-green-50 border-green-200",
                                week.status === 'warning' && "bg-amber-50 border-amber-200",
                                week.status === 'danger' && "bg-red-50 border-red-200"
                              )}
                            >
                              <div className="text-xs">
                                <p className="font-medium">
                                  Sett. {format(week.weekStart, 'd MMM', { locale: it })}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className={cn(
                                  "text-sm font-bold",
                                  week.status === 'ok' && "text-green-700",
                                  week.status === 'warning' && "text-amber-700",
                                  week.status === 'danger' && "text-red-700"
                                )}>
                                  {week.hours}h / {resourceStats.contractHours}h
                                </p>
                                {week.overtime > 0 && (
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-[9px] h-4 px-1",
                                      week.status === 'warning' && "border-amber-400 text-amber-700 bg-amber-100",
                                      week.status === 'danger' && "border-red-400 text-red-700 bg-red-100"
                                    )}
                                  >
                                    +{week.overtime}h
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {resourceStats.totalOvertime > 0 && (
                          <p className={cn(
                            "text-[10px] font-medium text-right",
                            resourceStats.overtimeStatus === 'warning' && "text-amber-600",
                            resourceStats.overtimeStatus === 'danger' && "text-red-600"
                          )}>
                            Straordinario totale periodo: +{resourceStats.totalOvertime}h
                          </p>
                        )}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                      <div className="flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-medium text-gray-500">Calendario disponibilità</h4>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setResourceCalendarMonth(prev => addDays(startOfMonth(prev), -1))}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                              <ChevronLeft className="h-3 w-3 text-gray-500" />
                            </button>
                            <span className="text-[10px] font-medium text-gray-600 min-w-[70px] text-center">
                              {format(resourceCalendarMonth, 'MMMM yyyy', { locale: it })}
                            </span>
                            <button
                              onClick={() => setResourceCalendarMonth(prev => addDays(endOfMonth(prev), 1))}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                              <ChevronRight className="h-3 w-3 text-gray-500" />
                            </button>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 flex-1 flex flex-col min-h-0">
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => (
                              <div key={i} className="text-[10px] font-medium text-center text-gray-400">{d}</div>
                            ))}
                          </div>
                          <ScrollArea className="flex-1 min-h-0">
                            <div className="grid grid-cols-7 gap-1 pr-2">
                              {resourceCalendarDays.map((dayData, idx) => {
                                const { date: day, isCurrentMonth, isInPeriod, isToday } = dayData;
                                const dayInfo = selectedResource ? getResourceDayInfo(selectedResource.id, day) : null;
                                const isBusy = dayInfo && dayInfo.length > 0;
                                const dayOfWeek = getDay(day);
                                const dayOpening = storeOpeningHours.find(h => h.day === dayOfWeek);
                                const isClosed = dayOpening?.isClosed ?? false;
                                
                                const dayStr = format(day, 'yyyy-MM-dd');
                                const dayCoverage = coveragePreview.filter(c => c.day === dayStr);
                                const totalSlots = dayCoverage.length;
                                const coveredSlots = dayCoverage.filter(c => c.assignedResources.length >= c.requiredStaff).length;
                                const partialSlots = dayCoverage.filter(c => c.assignedResources.length > 0 && c.assignedResources.length < c.requiredStaff).length;
                                const uniqueResources = new Set(dayCoverage.flatMap(c => c.assignedResources.map(r => r.resourceId))).size;
                                
                                return (
                                  <Popover key={idx}>
                                    <PopoverTrigger asChild>
                                      <button
                                        className={cn(
                                          "h-8 w-full rounded text-[11px] font-medium transition-colors relative",
                                          !isCurrentMonth && "opacity-30",
                                          isCurrentMonth && (
                                            isClosed 
                                              ? "bg-gray-100 text-gray-400"
                                              : isBusy 
                                                ? "bg-purple-200 text-purple-800 hover:bg-purple-300" 
                                                : "bg-green-100 text-green-700 hover:bg-green-200"
                                          ),
                                          !isCurrentMonth && "bg-gray-50 text-gray-300",
                                          isToday && "ring-2 ring-orange-400",
                                          isInPeriod && isCurrentMonth && "shadow-[inset_0_0_0_50px_rgba(59,130,246,0.25)]"
                                        )}
                                      >
                                        {format(day, 'd')}
                                        {isInPeriod && isCurrentMonth && totalSlots > 0 && (
                                          <div 
                                            className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5 cursor-pointer"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenSummaryModal(day);
                                            }}
                                          >
                                            {coveredSlots > 0 && (
                                              <div className="w-1.5 h-1.5 rounded-full bg-green-500" title={`${coveredSlots} coperti`} />
                                            )}
                                            {partialSlots > 0 && (
                                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" title={`${partialSlots} parziali`} />
                                            )}
                                            {uniqueResources > 0 && (
                                              <div className="absolute -top-0.5 -right-1 text-[6px] bg-primary text-white rounded-full w-2.5 h-2.5 flex items-center justify-center leading-none">
                                                {uniqueResources}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent side="top" className="w-60 p-2" container={null}>
                                      <div className="text-xs">
                                        <p className="font-semibold mb-1">{format(day, 'EEEE d MMMM yyyy', { locale: it })}</p>
                                        {isInPeriod && (
                                          <Badge variant="outline" className="text-[9px] mb-2 bg-primary/10 text-primary border-primary/30">
                                            Nel periodo selezionato
                                          </Badge>
                                        )}
                                        {isClosed ? (
                                          <p className="text-gray-500">Sede chiusa</p>
                                        ) : (
                                          <>
                                            {dayInfo && dayInfo.length > 0 ? (
                                              <div className="space-y-1 mb-2">
                                                <p className="text-[10px] text-gray-500 font-medium">Turni risorsa:</p>
                                                {dayInfo.map((info, i) => (
                                                  <div key={i} className="p-1.5 bg-purple-50 rounded text-purple-700">
                                                    <p className="font-medium">{info.templateName}</p>
                                                    <p className="text-[10px]">{info.startTime} - {info.endTime}</p>
                                                    <p className="text-[10px] text-purple-500 flex items-center gap-1">
                                                      <MapPin className="h-2.5 w-2.5" />
                                                      {info.storeName}
                                                    </p>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <p className="text-green-600 mb-2">Risorsa disponibile</p>
                                            )}
                                            {totalSlots > 0 && (
                                              <div className="pt-2 border-t">
                                                <p className="text-[10px] text-gray-500 font-medium mb-1">Copertura turni giorno:</p>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <span className="flex items-center gap-1">
                                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                                    <span className="text-[9px]">{coveredSlots} coperti</span>
                                                  </span>
                                                  <span className="flex items-center gap-1">
                                                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                                                    <span className="text-[9px]">{partialSlots} parziali</span>
                                                  </span>
                                                  <span className="flex items-center gap-1">
                                                    <Users className="w-2.5 h-2.5 text-primary" />
                                                    <span className="text-[9px]">{uniqueResources} risorse</span>
                                                  </span>
                                                </div>
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                );
                              })}
                            </div>
                          </ScrollArea>
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t shrink-0 flex-wrap">
                            <div className="flex items-center gap-1">
                              <div className="w-2.5 h-2.5 rounded bg-green-100 border border-green-200" />
                              <span className="text-[8px] text-gray-500">Libero</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-2.5 h-2.5 rounded bg-purple-200" />
                              <span className="text-[8px] text-gray-500">Occupato</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-2.5 h-2.5 rounded bg-gray-100 border border-gray-200" />
                              <span className="text-[8px] text-gray-500">Chiuso</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-2.5 h-2.5 rounded bg-blue-500/25" />
                              <span className="text-[8px] text-gray-500">Periodo</span>
                            </div>
                            <div className="h-3 border-l border-gray-200 mx-1" />
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              <span className="text-[8px] text-gray-500">Coperto</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-amber-500" />
                              <span className="text-[8px] text-gray-500">Parziale</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col min-h-0">
                        <h4 className="text-xs font-medium text-gray-500 mb-2">Assegna turno</h4>
                        <div className="bg-primary/5 rounded-lg p-3 border border-primary/20 space-y-3 flex-1 flex flex-col min-h-0">
                          <div>
                            <label className="text-[10px] font-medium text-gray-500 mb-1 block">Turno</label>
                            <Select value={selectedSlotForAssignment || ''} onValueChange={setSelectedSlotForAssignment}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Seleziona turno..." />
                              </SelectTrigger>
                              <SelectContent container={null}>
                                {availableTemplatesForAssignment.map(template => (
                                  <SelectItem key={template.id} value={template.id} className="text-xs">
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-2 h-2 rounded-full shrink-0" 
                                        style={{ backgroundColor: template.color }}
                                      />
                                      <span className="truncate">{template.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <label className="text-[10px] font-medium text-gray-500 mb-1 block">Giorni</label>
                            <div className="grid grid-cols-2 gap-1 p-0.5 bg-gray-100 rounded">
                              <button
                                className={cn(
                                  "py-1 text-[10px] font-medium rounded transition-colors",
                                  assignmentMode === 'bulk' ? "bg-white shadow-sm" : "text-gray-500"
                                )}
                                onClick={() => setAssignmentMode('bulk')}
                              >
                                Tutti ({periodDays.length})
                              </button>
                              <button
                                className={cn(
                                  "py-1 text-[10px] font-medium rounded transition-colors",
                                  assignmentMode === 'single' ? "bg-white shadow-sm" : "text-gray-500"
                                )}
                                onClick={() => setAssignmentMode('single')}
                              >
                                Singolo
                              </button>
                            </div>
                          </div>
                          
                          {assignmentMode === 'single' && (
                            <div>
                              <label className="text-[10px] font-medium text-gray-500 mb-1 block">Giorno</label>
                              <Select 
                                value={singleAssignmentDay?.toISOString() || ''} 
                                onValueChange={(v) => setSingleAssignmentDay(v ? new Date(v) : null)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Seleziona giorno..." />
                                </SelectTrigger>
                                <SelectContent container={null}>
                                  {periodDays.map(day => (
                                    <SelectItem key={day.toISOString()} value={day.toISOString()} className="text-xs">
                                      {format(day, 'EEE d MMM', { locale: it })}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          
                          <Button 
                            className="w-full h-8 text-xs" 
                            onClick={handleAssignResource}
                            disabled={!selectedSlotForAssignment || (assignmentMode === 'single' && !singleAssignmentDay)}
                            data-testid="btn-assign-resource"
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Assegna
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <div className="text-center py-8">
                      <User className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm font-medium text-gray-500">Seleziona una risorsa</p>
                      <p className="text-xs text-muted-foreground">per vedere dettagli e assegnare turni</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <div className="mb-3">
          <TimelineLegend />
        </div>
        
        <div className="space-y-3">
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

      {/* Summary Filter Modal */}
      <Dialog open={showSummaryFilterModal} onOpenChange={setShowSummaryFilterModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-primary" />
              Dettaglio Copertura - {summaryFilterDay && format(summaryFilterDay, 'EEEE d MMMM yyyy', { locale: it })}
            </DialogTitle>
            <DialogDescription>
              Visualizza e filtra la copertura turni per il giorno selezionato
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Filter Section */}
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filtra per Risorsa
              </h4>
              <div className="flex flex-wrap gap-2">
                {allResourcesInCoverage.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nessuna risorsa assegnata nel periodo</p>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant={summaryFilterResources.length === 0 ? "default" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => setSummaryFilterResources([])}
                    >
                      Tutte ({allResourcesInCoverage.length})
                    </Button>
                    {allResourcesInCoverage.map(r => (
                      <Button
                        key={r.id}
                        size="sm"
                        variant={summaryFilterResources.includes(r.id) ? "default" : "outline"}
                        className="h-7 text-xs"
                        onClick={() => {
                          setSummaryFilterResources(prev => 
                            prev.includes(r.id) 
                              ? prev.filter(id => id !== r.id)
                              : [...prev, r.id]
                          );
                        }}
                      >
                        {r.firstName} {r.lastName}
                      </Button>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Timeline Visualization */}
            {summaryFilteredCoverage.length > 0 && (
              <div className="bg-white border rounded-lg p-3">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Visualizzazione Timeline
                </h4>
                <TimelineBar 
                  timeRange={{ start: '06:00', end: '24:00' }}
                  lanes={(() => {
                    const grouped: Record<string, typeof summaryFilteredCoverage> = {};
                    summaryFilteredCoverage.forEach(slot => {
                      const key = slot.templateId;
                      if (!grouped[key]) grouped[key] = [];
                      grouped[key].push(slot);
                    });
                    
                    return Object.entries(grouped).map(([templateId, slots]) => ({
                      id: templateId,
                      label: slots[0]?.templateName || 'Template',
                      segments: slots.map(slot => ({
                        id: `${slot.slotId}`,
                        startTime: slot.startTime.substring(0, 5),
                        endTime: slot.endTime.substring(0, 5),
                        color: slot.assignedResources.length >= slot.requiredStaff 
                          ? '#22c55e' 
                          : slot.assignedResources.length > 0 
                            ? '#f59e0b' 
                            : '#6b7280',
                        label: `${slot.startTime.substring(0, 5)}-${slot.endTime.substring(0, 5)}`,
                        type: slot.assignedResources.length >= slot.requiredStaff 
                          ? 'assigned' as const
                          : slot.assignedResources.length > 0 
                            ? 'partial' as const 
                            : 'gap' as const,
                        tooltip: (
                          <div className="text-xs">
                            <p className="font-medium">{slot.templateName}</p>
                            <p>{slot.startTime.substring(0, 5)} - {slot.endTime.substring(0, 5)}</p>
                            <p className="mt-1">Staff: {slot.assignedResources.length}/{slot.requiredStaff}</p>
                            {slot.assignedResources.length > 0 && (
                              <p className="text-green-300">
                                {slot.assignedResources.map(r => r.resourceName).join(', ')}
                              </p>
                            )}
                          </div>
                        )
                      }))
                    }));
                  })()}
                  height={60}
                  showTimeMarkers
                />
              </div>
            )}

            {/* Coverage Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Template</th>
                    <th className="px-3 py-2 text-left">Fascia Oraria</th>
                    <th className="px-3 py-2 text-center">Richiesti</th>
                    <th className="px-3 py-2 text-left">Risorse Assegnate</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryFilteredCoverage.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                        Nessun turno trovato per i filtri selezionati
                      </td>
                    </tr>
                  ) : (
                    summaryFilteredCoverage.map((slot, idx) => (
                      <tr key={idx} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded shrink-0"
                              style={{ backgroundColor: slot.templateColor }}
                            />
                            <span className="truncate">{slot.templateName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono">
                          {slot.startTime.substring(0, 5)} - {slot.endTime.substring(0, 5)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Badge variant="outline">{slot.requiredStaff}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          {slot.assignedResources.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {slot.assignedResources.map((ra, i) => (
                                <Popover key={i}>
                                  <PopoverTrigger asChild>
                                    <Badge 
                                      variant="secondary" 
                                      className="text-[10px] bg-green-100 text-green-700 cursor-pointer hover:bg-green-200"
                                    >
                                      <User className="w-2.5 h-2.5 mr-1" />
                                      {ra.resourceName}
                                    </Badge>
                                  </PopoverTrigger>
                                  <PopoverContent side="top" className="w-48 p-2" container={null}>
                                    <div className="space-y-2">
                                      <p className="text-xs font-medium">{ra.resourceName}</p>
                                      <Separator />
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="w-full h-7 text-xs"
                                        onClick={() => {
                                          removeResourceAssignment(ra.resourceId, slot.templateId, slot.slotId, slot.day);
                                          toast({
                                            title: 'Assegnazione rimossa',
                                            description: `${ra.resourceName} rimosso dal turno ${slot.startTime.substring(0, 5)}-${slot.endTime.substring(0, 5)}`,
                                          });
                                        }}
                                        data-testid={`btn-remove-assignment-${ra.resourceId}`}
                                      >
                                        <Trash2 className="w-3 h-3 mr-1" />
                                        Rimuovi Assegnazione
                                      </Button>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">Nessuno</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {slot.assignedResources.length >= slot.requiredStaff ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Coperto
                            </Badge>
                          ) : slot.assignedResources.length > 0 ? (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Parziale ({slot.assignedResources.length}/{slot.requiredStaff})
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Scoperto
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary Stats */}
            {summaryFilteredCoverage.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-green-50">
                  <CardContent className="p-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-lg font-bold text-green-700">
                        {summaryFilteredCoverage.filter(s => s.assignedResources.length >= s.requiredStaff).length}
                      </p>
                      <p className="text-xs text-green-600">Turni Coperti</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50">
                  <CardContent className="p-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="text-lg font-bold text-amber-700">
                        {summaryFilteredCoverage.filter(s => s.assignedResources.length > 0 && s.assignedResources.length < s.requiredStaff).length}
                      </p>
                      <p className="text-xs text-amber-600">Parzialmente Coperti</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-red-50">
                  <CardContent className="p-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-lg font-bold text-red-700">
                        {summaryFilteredCoverage.filter(s => s.assignedResources.length === 0).length}
                      </p>
                      <p className="text-xs text-red-600">Scoperti</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSummaryFilterModal(false)}>
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
