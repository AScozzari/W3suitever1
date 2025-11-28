import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useHRQueryReadiness } from '@/hooks/useAuthReadiness';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { format, addDays, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Calendar as CalendarIcon, Clock, Users, Building, ChevronLeft, ChevronRight,
  LayoutGrid, GanttChart, CalendarDays, Check, X, AlertTriangle, Zap,
  Eye, Play, UserPlus, Layers, Target, TrendingUp, RefreshCw
} from 'lucide-react';

interface ShiftTemplate {
  id: string;
  name: string;
  description?: string;
  pattern: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
  defaultBreakMinutes?: number;
  minStaffRequired?: number;
  maxStaffAllowed?: number;
  isActive: boolean;
}

interface Store {
  id: string;
  name: string;
  code?: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  storeId?: string;
  position?: string;
  weeklyHoursContract?: number;
}

interface ShiftTimeSlot {
  id: string;
  templateId: string;
  name: string;
  startTime: string;
  endTime: string;
  minStaff?: number;
  maxStaff?: number;
}

interface Shift {
  id: string;
  templateId?: string;
  storeId: string;
  date: string;
  status: string;
}

interface ShiftAssignment {
  id: string;
  shiftId: string;
  userId: string;
  timeSlotId?: string;
  status: string;
}

type ViewMode = 'gantt' | 'grid' | 'month';
type PeriodType = 'day' | 'week' | 'month' | 'year';

interface BulkShiftPlannerProps {
  storeId?: string | null;
  className?: string;
}

export default function BulkShiftPlanner({ storeId, className }: BulkShiftPlannerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const hrQueryReadiness = useHRQueryReadiness();

  const [activeTab, setActiveTab] = useState<'template-store' | 'resource-slot'>('template-store');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [periodType, setPeriodType] = useState<PeriodType>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>(storeId ? [storeId] : []);
  const [multiStoreMode, setMultiStoreMode] = useState(false);
  
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [assignmentPeriod, setAssignmentPeriod] = useState<PeriodType>('week');
  
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [excludeWeekends, setExcludeWeekends] = useState(true);
  
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const { data: templates = [] } = useQuery<ShiftTemplate[]>({
    queryKey: ['/api/hr/shift-templates'],
    enabled: hrQueryReadiness.enabled,
  });

  const { data: stores = [] } = useQuery<Store[]>({
    queryKey: ['/api/stores'],
    enabled: hrQueryReadiness.enabled,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: hrQueryReadiness.enabled,
  });

  const { data: timeSlots = [] } = useQuery<ShiftTimeSlot[]>({
    queryKey: ['/api/hr/shift-time-slots', selectedTemplateId],
    enabled: hrQueryReadiness.enabled && !!selectedTemplateId,
  });

  const { data: existingShifts = [] } = useQuery<Shift[]>({
    queryKey: ['/api/hr/shifts', { storeId: selectedStoreIds[0], startDate: format(getPeriodStart(), 'yyyy-MM-dd'), endDate: format(getPeriodEnd(), 'yyyy-MM-dd') }],
    enabled: hrQueryReadiness.enabled && selectedStoreIds.length > 0,
  });

  function getPeriodStart(): Date {
    switch (periodType) {
      case 'day': return currentDate;
      case 'week': return startOfWeek(currentDate, { weekStartsOn: 1 });
      case 'month': return startOfMonth(currentDate);
      case 'year': return new Date(currentDate.getFullYear(), 0, 1);
    }
  }

  function getPeriodEnd(): Date {
    switch (periodType) {
      case 'day': return currentDate;
      case 'week': return endOfWeek(currentDate, { weekStartsOn: 1 });
      case 'month': return endOfMonth(currentDate);
      case 'year': return new Date(currentDate.getFullYear(), 11, 31);
    }
  }

  function navigatePeriod(direction: 'prev' | 'next') {
    const delta = direction === 'next' ? 1 : -1;
    switch (periodType) {
      case 'day': setCurrentDate(addDays(currentDate, delta)); break;
      case 'week': setCurrentDate(addWeeks(currentDate, delta)); break;
      case 'month': setCurrentDate(addMonths(currentDate, delta)); break;
      case 'year': setCurrentDate(addMonths(currentDate, delta * 12)); break;
    }
  }

  function getPeriodLabel(): string {
    switch (periodType) {
      case 'day': return format(currentDate, 'EEEE d MMMM yyyy', { locale: it });
      case 'week': return `Settimana ${format(currentDate, 'w')} - ${format(getPeriodStart(), 'd MMM', { locale: it })} - ${format(getPeriodEnd(), 'd MMM yyyy', { locale: it })}`;
      case 'month': return format(currentDate, 'MMMM yyyy', { locale: it });
      case 'year': return format(currentDate, 'yyyy', { locale: it });
    }
  }

  const periodDays = useMemo(() => {
    return eachDayOfInterval({ start: getPeriodStart(), end: getPeriodEnd() });
  }, [currentDate, periodType]);

  const bulkTemplateAssignMutation = useMutation({
    mutationFn: async (data: { 
      templateId: string; 
      storeIds: string[]; 
      startDate: string; 
      endDate: string; 
      periodType: PeriodType;
      excludeDates?: string[];
      overwriteExisting?: boolean;
    }) => {
      return apiRequest('/api/hr/shifts/bulk-template-assign', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/calendar/events'] });
      toast({ 
        title: 'Template applicato!',
        description: `Creati ${result.createdCount || 0} turni con successo`
      });
      setShowPreviewModal(false);
    },
    onError: () => {
      toast({ title: 'Errore nell\'applicazione del template', variant: 'destructive' });
    },
  });

  const bulkResourceAssignMutation = useMutation({
    mutationFn: async (data: { userIds: string[]; shiftIds: string[]; slotIds?: string[]; startDate: string; endDate: string }) => {
      return apiRequest('/api/hr/shift-assignments/bulk', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shift-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/calendar/events'] });
      toast({
        title: 'Risorse assegnate!',
        description: `Create ${result.createdCount || 0} assegnazioni con successo`
      });
    },
    onError: () => {
      toast({ title: 'Errore nell\'assegnazione risorse', variant: 'destructive' });
    },
  });

  function handleStoreToggle(storeId: string) {
    if (multiStoreMode) {
      setSelectedStoreIds(prev =>
        prev.includes(storeId) ? prev.filter(id => id !== storeId) : [...prev, storeId]
      );
    } else {
      setSelectedStoreIds([storeId]);
    }
  }

  function handleUserToggle(userId: string) {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  }

  function getExcludeDates(): string[] {
    if (!excludeWeekends) return [];
    return periodDays
      .filter(d => d.getDay() === 0 || d.getDay() === 6)
      .map(d => format(d, 'yyyy-MM-dd'));
  }

  function handlePreviewTemplateAssign() {
    if (!selectedTemplateId || selectedStoreIds.length === 0) {
      toast({ title: 'Seleziona template e negozi', variant: 'destructive' });
      return;
    }
    const template = templates.find(t => t.id === selectedTemplateId);
    const selectedStores = stores.filter(s => selectedStoreIds.includes(s.id));
    const excludeDates = getExcludeDates();
    const effectiveDays = periodDays.length - excludeDates.length;
    
    setPreviewData({
      type: 'template',
      template,
      stores: selectedStores,
      periodDays: effectiveDays,
      startDate: format(getPeriodStart(), 'yyyy-MM-dd'),
      endDate: format(getPeriodEnd(), 'yyyy-MM-dd'),
      estimatedShifts: effectiveDays * selectedStoreIds.length,
      excludeWeekends,
      overwriteExisting,
    });
    setShowPreviewModal(true);
  }

  function handleApplyTemplateAssign() {
    bulkTemplateAssignMutation.mutate({
      templateId: selectedTemplateId,
      storeIds: selectedStoreIds,
      startDate: format(getPeriodStart(), 'yyyy-MM-dd'),
      endDate: format(getPeriodEnd(), 'yyyy-MM-dd'),
      periodType,
      excludeDates: getExcludeDates(),
      overwriteExisting,
    });
  }

  function handleApplyResourceAssign() {
    if (selectedUserIds.length === 0) {
      toast({ title: 'Seleziona almeno una risorsa', variant: 'destructive' });
      return;
    }
    
    const shiftIds = existingShifts.map(s => s.id);
    if (shiftIds.length === 0) {
      toast({ title: 'Nessun turno disponibile nel periodo. Applica prima un template.', variant: 'destructive' });
      return;
    }

    bulkResourceAssignMutation.mutate({
      userIds: selectedUserIds,
      shiftIds,
      slotIds: selectedSlotIds.length > 0 ? selectedSlotIds : undefined,
      startDate: format(getPeriodStart(), 'yyyy-MM-dd'),
      endDate: format(getPeriodEnd(), 'yyyy-MM-dd'),
    });
  }

  const filteredUsers = useMemo(() => {
    if (!selectedStoreIds.length) return users;
    return users.filter((u: User) => !u.storeId || selectedStoreIds.includes(u.storeId));
  }, [users, selectedStoreIds]);

  const coverageStats = useMemo(() => {
    const totalSlots = periodDays.length * (timeSlots.length || 1);
    const filledSlots = existingShifts.length;
    const percentage = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;
    return { totalSlots, filledSlots, percentage };
  }, [periodDays, timeSlots, existingShifts]);

  return (
    <Card className={cn("backdrop-blur-md bg-white/10 border-white/20", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-orange-500" />
            <CardTitle className="text-lg">Pianificazione Rapida Turni</CardTitle>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-lg p-1 bg-muted/50">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-7 px-2"
                data-testid="view-grid"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'gantt' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('gantt')}
                className="h-7 px-2"
                data-testid="view-gantt"
              >
                <GanttChart className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'month' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
                className="h-7 px-2"
                data-testid="view-month"
              >
                <CalendarDays className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigatePeriod('prev')} data-testid="period-prev">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium min-w-[200px] text-center capitalize">{getPeriodLabel()}</span>
            <Button variant="ghost" size="icon" onClick={() => navigatePeriod('next')} data-testid="period-next">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {(['day', 'week', 'month', 'year'] as PeriodType[]).map((p) => (
              <Button
                key={p}
                variant={periodType === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodType(p)}
                className="capitalize"
                data-testid={`period-${p}`}
              >
                {p === 'day' ? 'Giorno' : p === 'week' ? 'Settimana' : p === 'month' ? 'Mese' : 'Anno'}
              </Button>
            ))}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" data-testid="date-picker-trigger">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Vai a data
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(date) => date && setCurrentDate(date)}
                locale={it}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main Content - 3 columns */}
          <div className="lg:col-span-3 space-y-4">
            {/* Coverage Bar */}
            <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium">Copertura Periodo:</span>
              </div>
              <Progress value={coverageStats.percentage} className="flex-1 h-2" />
              <Badge variant={coverageStats.percentage >= 80 ? 'default' : coverageStats.percentage >= 50 ? 'secondary' : 'destructive'}>
                {coverageStats.percentage}% ({coverageStats.filledSlots}/{coverageStats.totalSlots})
              </Badge>
            </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="template-store" className="flex items-center gap-2" data-testid="tab-template-store">
              <Layers className="w-4 h-4" />
              Template → Negozio
            </TabsTrigger>
            <TabsTrigger value="resource-slot" className="flex items-center gap-2" data-testid="tab-resource-slot">
              <UserPlus className="w-4 h-4" />
              Risorse → Fasce
            </TabsTrigger>
          </TabsList>

          <TabsContent value="template-store" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Template Turno
                </Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger data-testid="select-template">
                    <SelectValue placeholder="Seleziona template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.filter((t: ShiftTemplate) => t.isActive).map((template: ShiftTemplate) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          <span>{template.name}</span>
                          {template.defaultStartTime && template.defaultEndTime && (
                            <Badge variant="outline" className="text-xs">
                              {template.defaultStartTime}-{template.defaultEndTime}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedTemplateId && (
                  <div className="p-3 bg-muted/50 rounded-lg text-sm">
                    {(() => {
                      const t = templates.find((t: ShiftTemplate) => t.id === selectedTemplateId);
                      return t ? (
                        <div className="space-y-1">
                          <div><strong>Pattern:</strong> {t.pattern}</div>
                          {t.description && <div className="text-muted-foreground">{t.description}</div>}
                          {t.minStaffRequired && <div><strong>Staff min:</strong> {t.minStaffRequired}</div>}
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Negozi
                  </Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="multi-store"
                      checked={multiStoreMode}
                      onCheckedChange={(checked) => {
                        setMultiStoreMode(!!checked);
                        if (!checked && selectedStoreIds.length > 1) {
                          setSelectedStoreIds([selectedStoreIds[0]]);
                        }
                      }}
                    />
                    <Label htmlFor="multi-store" className="text-xs cursor-pointer">Multi-selezione</Label>
                  </div>
                </div>

                <ScrollArea className="h-[200px] border rounded-lg p-2">
                  <div className="space-y-1">
                    {stores.map((store: Store) => (
                      <div
                        key={store.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                          selectedStoreIds.includes(store.id)
                            ? "bg-orange-100 dark:bg-orange-900/30 border border-orange-300"
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => handleStoreToggle(store.id)}
                        data-testid={`store-${store.id}`}
                      >
                        {multiStoreMode && (
                          <Checkbox checked={selectedStoreIds.includes(store.id)} />
                        )}
                        <Building className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{store.name}</div>
                          {store.code && <div className="text-xs text-muted-foreground">{store.code}</div>}
                        </div>
                        {selectedStoreIds.includes(store.id) && !multiStoreMode && (
                          <Check className="w-4 h-4 text-orange-600" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Options Row */}
            <div className="flex items-center gap-6 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="exclude-weekends"
                  checked={excludeWeekends}
                  onCheckedChange={(checked) => setExcludeWeekends(!!checked)}
                  data-testid="exclude-weekends"
                />
                <Label htmlFor="exclude-weekends" className="text-sm cursor-pointer">
                  Escludi weekend
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="overwrite-existing"
                  checked={overwriteExisting}
                  onCheckedChange={(checked) => setOverwriteExisting(!!checked)}
                  data-testid="overwrite-existing"
                />
                <Label htmlFor="overwrite-existing" className="text-sm cursor-pointer">
                  Sovrascrivi esistenti
                </Label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedTemplateId && selectedStoreIds.length > 0 ? (
                  <span className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Verranno creati <strong>{periodDays.filter(d => !excludeWeekends || (d.getDay() !== 0 && d.getDay() !== 6)).length * selectedStoreIds.length}</strong> turni
                  </span>
                ) : (
                  <span>Seleziona template e negozi per procedere</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handlePreviewTemplateAssign}
                  disabled={!selectedTemplateId || selectedStoreIds.length === 0}
                  data-testid="preview-template"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Anteprima
                </Button>
                <Button
                  onClick={handlePreviewTemplateAssign}
                  disabled={!selectedTemplateId || selectedStoreIds.length === 0 || bulkTemplateAssignMutation.isPending}
                  data-testid="apply-template"
                >
                  {bulkTemplateAssignMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Applica Template
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="resource-slot" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Pool Risorse Disponibili
                  <Badge variant="secondary">{selectedUserIds.length} selezionati</Badge>
                </Label>

                <ScrollArea className="h-[250px] border rounded-lg p-2">
                  <div className="space-y-1">
                    {filteredUsers.map((user: User) => (
                      <div
                        key={user.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                          selectedUserIds.includes(user.id)
                            ? "bg-blue-100 dark:bg-blue-900/30 border border-blue-300"
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => handleUserToggle(user.id)}
                        data-testid={`user-${user.id}`}
                      >
                        <Checkbox checked={selectedUserIds.includes(user.id)} />
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{user.firstName} {user.lastName}</div>
                          <div className="text-xs text-muted-foreground truncate">{user.position || user.email}</div>
                        </div>
                        {user.weeklyHoursContract && (
                          <Badge variant="outline" className="text-xs">
                            {user.weeklyHoursContract}h/sett
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUserIds(filteredUsers.map((u: User) => u.id))}
                    data-testid="select-all-users"
                  >
                    Seleziona tutti
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUserIds([])}
                    data-testid="deselect-all-users"
                  >
                    Deseleziona tutti
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Turni da Coprire
                  <Badge variant={existingShifts.length > 0 ? 'default' : 'destructive'}>
                    {existingShifts.length} turni
                  </Badge>
                </Label>

                {existingShifts.length === 0 ? (
                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      Nessun turno nel periodo selezionato. Applica prima un template nella tab "Template → Negozio".
                    </AlertDescription>
                  </Alert>
                ) : (
                  <ScrollArea className="h-[250px] border rounded-lg p-2">
                    <div className="space-y-1">
                      {existingShifts.map((shift: Shift) => {
                        const template = templates.find((t: ShiftTemplate) => t.id === shift.templateId);
                        return (
                          <div
                            key={shift.id}
                            className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                          >
                            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {format(parseISO(shift.date), 'EEE d MMM', { locale: it })}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {template?.name || 'Turno'}
                              </div>
                            </div>
                            <Badge variant={shift.status === 'active' ? 'default' : 'secondary'}>
                              {shift.status}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}

                <div className="p-3 bg-muted/50 rounded-lg">
                  <Label className="text-sm font-medium mb-2 block">Applica a:</Label>
                  <div className="flex gap-2">
                    {(['day', 'week', 'month'] as PeriodType[]).map((p) => (
                      <Button
                        key={p}
                        variant={assignmentPeriod === p ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAssignmentPeriod(p)}
                        className="capitalize flex-1"
                        data-testid={`assign-period-${p}`}
                      >
                        {p === 'day' ? 'Solo oggi' : p === 'week' ? 'Settimana' : 'Mese'}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedUserIds.length > 0 && existingShifts.length > 0 ? (
                  <span className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    <strong>{selectedUserIds.length}</strong> risorse × <strong>{existingShifts.length}</strong> turni = 
                    <strong className="text-orange-600 ml-1">{selectedUserIds.length * existingShifts.length}</strong> assegnazioni
                  </span>
                ) : (
                  <span>Seleziona risorse e turni per procedere</span>
                )}
              </div>

              <Button
                onClick={handleApplyResourceAssign}
                disabled={selectedUserIds.length === 0 || existingShifts.length === 0 || bulkResourceAssignMutation.isPending}
                data-testid="apply-resources"
              >
                {bulkResourceAssignMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                Assegna Risorse
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {viewMode === 'grid' && (
          <div className="mt-6 border rounded-lg overflow-hidden">
            <div className="bg-muted/50 p-2 border-b">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                Vista Griglia - {getPeriodLabel()}
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="p-2 text-left font-medium border-r">Fascia</th>
                    {periodDays.slice(0, 7).map((day) => (
                      <th key={day.toISOString()} className="p-2 text-center font-medium min-w-[100px]">
                        <div>{format(day, 'EEE', { locale: it })}</div>
                        <div className="text-xs text-muted-foreground">{format(day, 'd MMM', { locale: it })}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(timeSlots.length > 0 ? timeSlots : [{ id: 'default', name: 'Turno', startTime: '09:00', endTime: '18:00' }]).map((slot: ShiftTimeSlot | { id: string; name: string; startTime: string; endTime: string }) => (
                    <tr key={slot.id} className="border-t">
                      <td className="p-2 font-medium border-r bg-muted/20">
                        <div>{slot.name}</div>
                        <div className="text-xs text-muted-foreground">{slot.startTime}-{slot.endTime}</div>
                      </td>
                      {periodDays.slice(0, 7).map((day) => {
                        const dayShifts = existingShifts.filter((s: Shift) => isSameDay(parseISO(s.date), day));
                        const hasShift = dayShifts.length > 0;
                        return (
                          <td key={day.toISOString()} className={cn(
                            "p-2 text-center border-l",
                            hasShift ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"
                          )}>
                            {hasShift ? (
                              <Badge variant="outline" className="bg-green-100 text-green-800">
                                {dayShifts.length} turni
                              </Badge>
                            ) : (
                              <span className="text-red-500 text-xs">Scoperto</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === 'gantt' && (
          <div className="mt-6 border rounded-lg overflow-hidden">
            <div className="bg-muted/50 p-2 border-b">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <GanttChart className="w-4 h-4" />
                Vista Gantt - {getPeriodLabel()}
              </h4>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="flex bg-muted/30 border-b">
                  <div className="w-[150px] p-2 font-medium border-r">Risorsa</div>
                  <div className="flex-1 flex">
                    {periodDays.slice(0, 7).map((day) => (
                      <div key={day.toISOString()} className="flex-1 p-2 text-center text-sm border-l">
                        <div>{format(day, 'EEE', { locale: it })}</div>
                        <div className="text-xs text-muted-foreground">{format(day, 'd', { locale: it })}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {filteredUsers.slice(0, 10).map((user: User) => (
                  <div key={user.id} className="flex border-b hover:bg-muted/20">
                    <div className="w-[150px] p-2 border-r flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </div>
                      <span className="text-sm truncate">{user.firstName} {user.lastName}</span>
                    </div>
                    <div className="flex-1 flex">
                      {periodDays.slice(0, 7).map((day) => (
                        <div key={day.toISOString()} className="flex-1 p-1 border-l min-h-[40px] relative">
                          {selectedUserIds.includes(user.id) && existingShifts.some((s: Shift) => isSameDay(parseISO(s.date), day)) && (
                            <div className="absolute inset-1 bg-orange-400 rounded text-white text-xs flex items-center justify-center">
                              9-18
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'month' && (
          <div className="mt-6 border rounded-lg overflow-hidden">
            <div className="bg-muted/50 p-2 border-b">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Vista Mensile - {format(currentDate, 'MMMM yyyy', { locale: it })}
              </h4>
            </div>
            <div className="grid grid-cols-7 gap-px bg-muted">
              {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day) => (
                <div key={day} className="bg-muted/50 p-2 text-center text-sm font-medium">
                  {day}
                </div>
              ))}
              {periodDays.map((day) => {
                const dayShifts = existingShifts.filter((s: Shift) => isSameDay(parseISO(s.date), day));
                const coverage = dayShifts.length > 0 ? 'covered' : 'uncovered';
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "bg-background p-2 min-h-[80px]",
                      coverage === 'covered' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
                    )}
                  >
                    <div className="font-medium text-sm">{format(day, 'd')}</div>
                    {dayShifts.length > 0 && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {dayShifts.length} turni
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
          </div>

          {/* InsightPanel - Right sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-500" />
                  Statistiche Periodo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Coverage Stats */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Copertura</span>
                    <span className={cn(
                      "font-medium",
                      coverageStats.percentage >= 80 ? "text-green-600" : 
                      coverageStats.percentage >= 50 ? "text-amber-600" : "text-red-600"
                    )}>
                      {coverageStats.percentage}%
                    </span>
                  </div>
                  <Progress value={coverageStats.percentage} className="h-1.5" />
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <div className="text-lg font-bold text-orange-600">{existingShifts.length}</div>
                    <div className="text-xs text-muted-foreground">Turni</div>
                  </div>
                  <div className="text-center p-2 bg-muted/50 rounded">
                    <div className="text-lg font-bold text-blue-600">{selectedUserIds.length}</div>
                    <div className="text-xs text-muted-foreground">Risorse Sel.</div>
                  </div>
                </div>

                {/* Period Info */}
                <div className="space-y-1 pt-2 border-t text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Giorni:</span>
                    <span className="font-medium">{periodDays.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Negozi:</span>
                    <span className="font-medium">{selectedStoreIds.length || 'Nessuno'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Template:</span>
                    <span className="font-medium truncate max-w-[100px]">
                      {templates.find((t: ShiftTemplate) => t.id === selectedTemplateId)?.name || 'Nessuno'}
                    </span>
                  </div>
                </div>

                {/* Warnings */}
                {coverageStats.percentage < 80 && (
                  <div className="pt-2 border-t">
                    <Alert className="p-2 bg-amber-50 dark:bg-amber-900/20 border-amber-200">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                        Copertura sotto 80%. Assegna più risorse.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {existingShifts.length === 0 && selectedTemplateId && (
                  <div className="pt-2 border-t">
                    <Alert className="p-2 bg-blue-50 dark:bg-blue-900/20 border-blue-200">
                      <Zap className="w-3 h-3 text-blue-600" />
                      <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
                        Applica il template per creare turni.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="pt-2 border-t space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs"
                    onClick={() => setActiveTab('template-store')}
                    disabled={!selectedTemplateId}
                  >
                    <Layers className="w-3 h-3 mr-1" />
                    Applica Template
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs"
                    onClick={() => setActiveTab('resource-slot')}
                    disabled={existingShifts.length === 0}
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    Assegna Risorse
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>

      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-orange-500" />
              Anteprima Applicazione Template
            </DialogTitle>
            <DialogDescription>
              Verifica i dettagli prima di applicare il template ai negozi selezionati
            </DialogDescription>
          </DialogHeader>
          
          {previewData && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Template:</span>
                  <span className="font-medium">{previewData.template?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Negozi:</span>
                  <span className="font-medium">{previewData.stores?.map((s: Store) => s.name).join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Periodo:</span>
                  <span className="font-medium">{previewData.startDate} → {previewData.endDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Giorni lavorativi:</span>
                  <span className="font-medium">{previewData.periodDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Escludi weekend:</span>
                  <Badge variant={previewData.excludeWeekends ? 'default' : 'secondary'}>
                    {previewData.excludeWeekends ? 'Sì' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sovrascrivi esistenti:</span>
                  <Badge variant={previewData.overwriteExisting ? 'destructive' : 'secondary'}>
                    {previewData.overwriteExisting ? 'Sì' : 'No'}
                  </Badge>
                </div>
              </div>
              
              <Alert className="bg-orange-50 border-orange-200">
                <Zap className="w-4 h-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  Verranno creati <strong>{previewData.estimatedShifts}</strong> nuovi turni
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
              <X className="w-4 h-4 mr-2" />
              Annulla
            </Button>
            <Button onClick={handleApplyTemplateAssign} disabled={bulkTemplateAssignMutation.isPending}>
              {bulkTemplateAssignMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Conferma e Applica
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
