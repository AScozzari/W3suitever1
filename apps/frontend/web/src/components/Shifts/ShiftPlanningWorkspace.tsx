import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Store as StoreIcon, Calendar as CalendarIcon, Users, BarChart3,
  ChevronLeft, ChevronRight, Check, AlertTriangle, AlertCircle,
  Zap, Clock, Grid3X3, GanttChart, CalendarDays, Play, Filter
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

type PeriodType = 'day' | 'week' | 'month';
type ViewMode = 'gantt' | 'grid' | 'month';

interface Store {
  id: string;
  name?: string;
  nome?: string;
  code?: string;
}

interface ShiftTemplate {
  id: string;
  name: string;
  scope: 'global' | 'store';
  storeId?: string;
  timeSlots?: TimeSlot[];
  defaultStartTime?: string;
  defaultEndTime?: string;
}

interface TimeSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  requiredStaff?: number;
}

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role?: string;
}

interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  storeId: string;
  status: string;
}

interface ShiftAssignment {
  id: string;
  shiftId: string;
  userId: string;
}

interface CoverageAlert {
  date: string;
  slot: string;
  type: 'critical' | 'warning';
  message: string;
  assigned: number;
  required: number;
}

const STEPS = [
  { id: 1, label: 'Negozio', icon: StoreIcon },
  { id: 2, label: 'Template', icon: CalendarIcon },
  { id: 3, label: 'Risorse', icon: Users },
  { id: 4, label: 'Coperture', icon: BarChart3 },
];

export default function ShiftPlanningWorkspace() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  
  const [periodType, setPeriodType] = useState<PeriodType>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  const [excludeWeekends, setExcludeWeekends] = useState(true);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const { data: stores = [] } = useQuery<Store[]>({
    queryKey: ['/api/stores'],
  });

  const { data: templates = [] } = useQuery<ShiftTemplate[]>({
    queryKey: ['/api/hr/shift-templates', selectedStoreId],
    queryFn: async () => {
      const response = await fetch(`/api/hr/shift-templates?storeId=${selectedStoreId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedStoreId,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users', selectedStoreId],
    enabled: !!selectedStoreId,
  });

  const periodStart = useMemo(() => getPeriodStart(), [currentDate, periodType]);
  const periodEnd = useMemo(() => getPeriodEnd(), [currentDate, periodType]);
  
  const { data: shifts = [] } = useQuery<Shift[]>({
    queryKey: ['/api/hr/shifts', selectedStoreId, format(periodStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const response = await fetch(
        `/api/hr/shifts?storeId=${selectedStoreId}&startDate=${format(periodStart, 'yyyy-MM-dd')}&endDate=${format(periodEnd, 'yyyy-MM-dd')}`
      );
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedStoreId,
  });

  const { data: assignments = [] } = useQuery<ShiftAssignment[]>({
    queryKey: ['/api/hr/shift-assignments', selectedStoreId],
    queryFn: async () => {
      const response = await fetch(`/api/hr/shift-assignments?storeId=${selectedStoreId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!selectedStoreId,
  });

  const applyTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/hr/shifts/bulk-template-assign', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts'] });
      toast({ 
        title: 'Template applicato!',
        description: `Creati ${result.createdCount || 0} turni`
      });
      setCurrentStep(3);
    },
    onError: () => {
      toast({ title: 'Errore applicazione template', variant: 'destructive' });
    }
  });

  const assignResourcesMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/hr/shift-assignments/bulk', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shift-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts'] });
      toast({ 
        title: 'Risorse assegnate!',
        description: `${result.createdCount || selectedUserIds.length} assegnazioni create`
      });
      setSelectedUserIds([]);
      setCurrentStep(4);
    },
    onError: () => {
      toast({ title: 'Errore assegnazione', variant: 'destructive' });
    }
  });

  function getPeriodStart(): Date {
    switch (periodType) {
      case 'day': return currentDate;
      case 'week': return startOfWeek(currentDate, { weekStartsOn: 1 });
      case 'month': return startOfMonth(currentDate);
    }
  }

  function getPeriodEnd(): Date {
    switch (periodType) {
      case 'day': return currentDate;
      case 'week': return endOfWeek(currentDate, { weekStartsOn: 1 });
      case 'month': return endOfMonth(currentDate);
    }
  }

  function navigatePeriod(direction: 'prev' | 'next') {
    const days = periodType === 'day' ? 1 : periodType === 'week' ? 7 : 30;
    setCurrentDate(prev => addDays(prev, direction === 'next' ? days : -days));
  }

  const periodDays = useMemo(() => {
    return eachDayOfInterval({ start: getPeriodStart(), end: getPeriodEnd() });
  }, [currentDate, periodType]);

  const workingDays = useMemo(() => {
    return excludeWeekends ? periodDays.filter(d => !isWeekend(d)) : periodDays;
  }, [periodDays, excludeWeekends]);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const selectedStore = stores.find(s => s.id === selectedStoreId);
  
  const filteredUsers = useMemo(() => {
    if (roleFilter === 'all') return users;
    return users.filter(u => u.role === roleFilter);
  }, [users, roleFilter]);

  const coverageAlerts = useMemo((): CoverageAlert[] => {
    if (!selectedStoreId || !selectedTemplate) return [];
    
    const alerts: CoverageAlert[] = [];
    const slots = selectedTemplate.timeSlots || [];
    
    workingDays.forEach(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayShifts = shifts.filter(s => s.date === dayStr && s.storeId === selectedStoreId);
      
      slots.forEach(slot => {
        const slotShifts = dayShifts.filter(s => 
          s.startTime === slot.startTime && s.endTime === slot.endTime
        );
        
        const assignedCount = slotShifts.reduce((acc, shift) => {
          return acc + assignments.filter(a => a.shiftId === shift.id).length;
        }, 0);
        
        const required = slot.requiredStaff || 1;
        
        if (assignedCount === 0 && slotShifts.length > 0) {
          alerts.push({
            date: dayStr,
            slot: slot.name,
            type: 'critical',
            message: `${format(day, 'EEE d MMM', { locale: it })} - ${slot.name}: Nessuna risorsa assegnata`,
            assigned: 0,
            required
          });
        } else if (assignedCount < required && slotShifts.length > 0) {
          alerts.push({
            date: dayStr,
            slot: slot.name,
            type: 'warning',
            message: `${format(day, 'EEE d MMM', { locale: it })} - ${slot.name}: Copertura ${Math.round(assignedCount/required*100)}%`,
            assigned: assignedCount,
            required
          });
        }
      });
    });
    
    return alerts;
  }, [selectedStoreId, selectedTemplate, workingDays, shifts, assignments]);

  const coveragePercent = useMemo(() => {
    if (!selectedTemplate || workingDays.length === 0) return 0;
    const totalSlots = workingDays.length * (selectedTemplate.timeSlots?.length || 1);
    const criticalCount = coverageAlerts.filter(a => a.type === 'critical').length;
    return Math.round(((totalSlots - criticalCount) / totalSlots) * 100);
  }, [selectedTemplate, workingDays, coverageAlerts]);

  function handleApplyTemplate() {
    if (!selectedTemplateId || !selectedStoreId) {
      toast({ title: 'Seleziona template e negozio', variant: 'destructive' });
      return;
    }

    const excludeDates = excludeWeekends 
      ? periodDays.filter(d => isWeekend(d)).map(d => format(d, 'yyyy-MM-dd'))
      : [];

    applyTemplateMutation.mutate({
      templateId: selectedTemplateId,
      storeIds: [selectedStoreId],
      startDate: format(getPeriodStart(), 'yyyy-MM-dd'),
      endDate: format(getPeriodEnd(), 'yyyy-MM-dd'),
      periodType,
      excludeDates,
      overwriteExisting,
    });
  }

  function handleAssignResources() {
    if (selectedUserIds.length === 0) {
      toast({ title: 'Seleziona almeno una risorsa', variant: 'destructive' });
      return;
    }

    const targetShifts = shifts.filter(s => {
      const shiftDate = new Date(s.date);
      return workingDays.some(d => isSameDay(d, shiftDate)) && s.storeId === selectedStoreId;
    });

    if (targetShifts.length === 0) {
      toast({ title: 'Nessun turno disponibile. Applica prima un template.', variant: 'destructive' });
      return;
    }

    assignResourcesMutation.mutate({
      shiftIds: targetShifts.map(s => s.id),
      userIds: selectedUserIds,
      storeId: selectedStoreId,
    });
  }

  function toggleUserSelection(userId: string) {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  }

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-500" />
          Gestione Turni
        </CardTitle>
        <CardDescription>Assegna template e risorse ai turni</CardDescription>
        
        <div className="flex items-center gap-1 mt-4">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center">
              <Button
                variant={currentStep === step.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  if (step.id === 1 || (step.id === 2 && selectedStoreId) || 
                      (step.id === 3 && selectedTemplateId) || (step.id === 4)) {
                    setCurrentStep(step.id);
                  }
                }}
                className={cn(
                  "gap-1",
                  currentStep > step.id && "bg-green-100 text-green-700 border-green-200"
                )}
                data-testid={`step-${step.id}`}
              >
                {currentStep > step.id ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <step.icon className="w-4 h-4" />
                )}
                {step.label}
              </Button>
              {idx < STEPS.length - 1 && (
                <div className="w-8 h-px bg-border mx-1" />
              )}
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-medium">Seleziona Negozio</Label>
              <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                <SelectTrigger className="w-full" data-testid="select-store">
                  <SelectValue placeholder="Scegli un negozio..." />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.nome || store.name} {store.code && `(${store.code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-base font-medium">Periodo</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => navigatePeriod('prev')}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex-1 text-center font-medium">
                  {periodType === 'day' && format(currentDate, 'd MMMM yyyy', { locale: it })}
                  {periodType === 'week' && `${format(getPeriodStart(), 'd MMM', { locale: it })} - ${format(getPeriodEnd(), 'd MMM yyyy', { locale: it })}`}
                  {periodType === 'month' && format(currentDate, 'MMMM yyyy', { locale: it })}
                </div>
                
                <Button variant="outline" size="icon" onClick={() => navigatePeriod('next')}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex gap-1 justify-center">
                {(['day', 'week', 'month'] as PeriodType[]).map(type => (
                  <Button
                    key={type}
                    variant={periodType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPeriodType(type)}
                  >
                    {type === 'day' ? 'Giorno' : type === 'week' ? 'Settimana' : 'Mese'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={() => setCurrentStep(2)} 
                disabled={!selectedStoreId}
                data-testid="btn-next-step-1"
              >
                Avanti
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Negozio selezionato</div>
              <div className="font-medium">{selectedStore?.nome || selectedStore?.name}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {format(getPeriodStart(), 'd MMM', { locale: it })} - {format(getPeriodEnd(), 'd MMM yyyy', { locale: it })}
                <span className="ml-2">({workingDays.length} giorni lavorativi)</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium">Seleziona Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger data-testid="select-template">
                  <SelectValue placeholder="Scegli un template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        {template.name}
                        <Badge variant="secondary" className="text-xs">
                          {template.scope === 'global' ? 'Globale' : 'Sede'}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <div className="p-3 border rounded-lg space-y-2">
                <div className="font-medium">{selectedTemplate.name}</div>
                <div className="space-y-1">
                  {selectedTemplate.timeSlots?.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {slot.name}: {slot.startTime} - {slot.endTime}
                      <Badge variant="outline" className="text-xs">{slot.requiredStaff || 1} risorse</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={excludeWeekends}
                  onCheckedChange={setExcludeWeekends}
                  data-testid="switch-exclude-weekends"
                />
                <Label>Escludi weekend</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={overwriteExisting}
                  onCheckedChange={setOverwriteExisting}
                  data-testid="switch-overwrite"
                />
                <Label>Sovrascrivi esistenti</Label>
              </div>
            </div>

            <Alert className="bg-orange-50 border-orange-200">
              <Zap className="w-4 h-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                Verranno creati <strong>{workingDays.length}</strong> turni per questo periodo
              </AlertDescription>
            </Alert>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Indietro
              </Button>
              <Button 
                onClick={handleApplyTemplate}
                disabled={!selectedTemplateId || applyTemplateMutation.isPending}
                data-testid="btn-apply-template"
              >
                <Play className="w-4 h-4 mr-2" />
                Applica Template
              </Button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
              <div>
                <div className="font-medium">{selectedStore?.nome || selectedStore?.name}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedTemplate?.name} • {workingDays.length} giorni
                </div>
              </div>
              <Badge variant={coveragePercent >= 80 ? 'default' : 'destructive'}>
                Copertura: {coveragePercent}%
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Fasce Orarie</Label>
                </div>
                <ScrollArea className="h-[250px] border rounded-lg p-2">
                  {selectedTemplate?.timeSlots?.map((slot) => (
                    <div
                      key={slot.id}
                      className={cn(
                        "p-2 rounded cursor-pointer mb-1 transition-colors",
                        selectedSlotId === slot.id 
                          ? "bg-orange-100 border border-orange-300" 
                          : "hover:bg-muted"
                      )}
                      onClick={() => setSelectedSlotId(slot.id)}
                      data-testid={`slot-${slot.id}`}
                    >
                      <div className="font-medium">{slot.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {slot.startTime} - {slot.endTime}
                      </div>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {slot.requiredStaff || 1} risorse richieste
                      </Badge>
                    </div>
                  )) || (
                    <div className="text-center text-muted-foreground py-4">
                      Nessuna fascia oraria
                    </div>
                  )}
                </ScrollArea>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Dipendenti Disponibili</Label>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-32">
                      <Filter className="w-3 h-3 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti</SelectItem>
                      <SelectItem value="sales">Vendita</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="support">Supporto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ScrollArea className="h-[250px] border rounded-lg p-2">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center text-muted-foreground py-4">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      Nessun dipendente disponibile
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                        onClick={() => toggleUserSelection(user.id)}
                        data-testid={`user-${user.id}`}
                      >
                        <Checkbox 
                          checked={selectedUserIds.includes(user.id)}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                        {user.role && (
                          <Badge variant="secondary" className="text-xs">
                            {user.role}
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </ScrollArea>
              </div>
            </div>

            {selectedUserIds.length > 0 && (
              <Alert>
                <Users className="w-4 h-4" />
                <AlertDescription>
                  <strong>{selectedUserIds.length}</strong> dipendenti selezionati
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Indietro
              </Button>
              <Button 
                onClick={handleAssignResources}
                disabled={selectedUserIds.length === 0 || assignResourcesMutation.isPending}
                data-testid="btn-assign-resources"
              >
                <Check className="w-4 h-4 mr-2" />
                Assegna {selectedUserIds.length} Risorse
              </Button>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-muted/50 rounded-lg flex-1 mr-4">
                <div className="font-medium">{selectedStore?.nome || selectedStore?.name}</div>
                <div className="text-sm text-muted-foreground">
                  {format(getPeriodStart(), 'd MMM', { locale: it })} - {format(getPeriodEnd(), 'd MMM yyyy', { locale: it })}
                </div>
              </div>
              <Badge 
                variant={coveragePercent >= 80 ? 'default' : coveragePercent >= 50 ? 'secondary' : 'destructive'}
                className="text-lg px-4 py-2"
              >
                {coveragePercent}% Copertura
              </Badge>
            </div>

            <div className="flex gap-1">
              {(['gantt', 'grid', 'month'] as ViewMode[]).map(mode => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode(mode)}
                >
                  {mode === 'gantt' && <GanttChart className="w-4 h-4 mr-1" />}
                  {mode === 'grid' && <Grid3X3 className="w-4 h-4 mr-1" />}
                  {mode === 'month' && <CalendarDays className="w-4 h-4 mr-1" />}
                  {mode === 'gantt' ? 'Gantt' : mode === 'grid' ? 'Griglia' : 'Mese'}
                </Button>
              ))}
            </div>

            {coverageAlerts.length > 0 && (
              <div className="space-y-2">
                <Label className="text-base font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Alert Copertura ({coverageAlerts.length})
                </Label>
                <ScrollArea className="h-[150px] border rounded-lg p-2">
                  {coverageAlerts.map((alert, idx) => (
                    <Alert
                      key={idx}
                      className={cn(
                        "mb-2",
                        alert.type === 'critical' 
                          ? "bg-red-50 border-red-200" 
                          : "bg-amber-50 border-amber-200"
                      )}
                    >
                      {alert.type === 'critical' ? (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                      <AlertDescription className={alert.type === 'critical' ? 'text-red-800' : 'text-amber-800'}>
                        {alert.message}
                        <span className="ml-2 text-xs">
                          ({alert.assigned}/{alert.required} risorse)
                        </span>
                      </AlertDescription>
                    </Alert>
                  ))}
                </ScrollArea>
              </div>
            )}

            <div className="border rounded-lg p-4 min-h-[200px]">
              {viewMode === 'grid' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-8 gap-1 text-sm font-medium text-center">
                    <div>Fascia</div>
                    {workingDays.slice(0, 7).map(day => (
                      <div key={day.toISOString()}>
                        {format(day, 'EEE', { locale: it })}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {format(day, 'd MMM', { locale: it })}
                        </span>
                      </div>
                    ))}
                  </div>
                  {selectedTemplate?.timeSlots?.map(slot => (
                    <div key={slot.id} className="grid grid-cols-8 gap-1">
                      <div className="text-sm p-2 bg-muted rounded">
                        {slot.name}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {slot.startTime}-{slot.endTime}
                        </span>
                      </div>
                      {workingDays.slice(0, 7).map(day => {
                        const dayStr = format(day, 'yyyy-MM-dd');
                        const alert = coverageAlerts.find(a => a.date === dayStr && a.slot === slot.name);
                        return (
                          <div
                            key={day.toISOString()}
                            className={cn(
                              "p-2 rounded text-center text-xs",
                              alert?.type === 'critical' && "bg-red-100 text-red-700",
                              alert?.type === 'warning' && "bg-amber-100 text-amber-700",
                              !alert && "bg-green-100 text-green-700"
                            )}
                          >
                            {alert ? `${alert.assigned}/${alert.required}` : '✓'}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
              
              {viewMode === 'gantt' && (
                <div className="text-center text-muted-foreground py-8">
                  <GanttChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  Vista Gantt Timeline
                  <p className="text-sm">Visualizzazione risorse nel tempo</p>
                </div>
              )}
              
              {viewMode === 'month' && (
                <div className="text-center text-muted-foreground py-8">
                  <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  Vista Mensile
                  <p className="text-sm">Panoramica copertura mensile</p>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(3)}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Modifica Assegnazioni
              </Button>
              <Button variant="outline" onClick={() => {
                setCurrentStep(1);
                setSelectedStoreId('');
                setSelectedTemplateId('');
                setSelectedUserIds([]);
              }}>
                Nuovo Negozio
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
