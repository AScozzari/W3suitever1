import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CalendarIcon, Users, Store, AlertTriangle, CheckCircle, 
  Clock, Plus, X, Target, Zap, Building
} from 'lucide-react';
import { format, addDays, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface AssignmentEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
  storeId: string;
  skills?: string[];
  status: 'active' | 'inactive';
}

interface Store {
  id: string;
  name: string;
  code: string;
  address: string;
}

interface ShiftTemplate {
  id: string;
  name: string;
  description?: string;
  defaultStartTime: string;
  defaultEndTime: string;
  defaultRequiredStaff: number;
  defaultBreakMinutes?: number;
  pattern: 'daily' | 'weekly' | 'monthly';
  rules?: {
    daysOfWeek?: number[];
  };
  isActive: boolean;
}

interface AssignmentConflict {
  type: 'double_booking' | 'overtime' | 'insufficient_rest' | 'missing_skills';
  userId: string;
  userName: string;
  message: string;
  severity: 'warning' | 'error';
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Gio' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sab' },
  { value: 0, label: 'Dom' }
];

const DATE_PRESETS = [
  { 
    label: 'Questa settimana', 
    getValue: () => ({ 
      from: startOfWeek(new Date(), { weekStartsOn: 1 }), 
      to: endOfWeek(new Date(), { weekStartsOn: 1 }) 
    })
  },
  { 
    label: 'Prossima settimana', 
    getValue: () => ({ 
      from: startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 }), 
      to: endOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 }) 
    })
  },
  { 
    label: 'Questo mese', 
    getValue: () => ({ 
      from: startOfMonth(new Date()), 
      to: endOfMonth(new Date()) 
    })
  },
  { 
    label: 'Prossimo mese', 
    getValue: () => ({ 
      from: startOfMonth(addMonths(new Date(), 1)), 
      to: endOfMonth(addMonths(new Date(), 1)) 
    })
  }
];

export default function AssignmentEngineModal({ isOpen, onClose }: AssignmentEngineModalProps) {
  const { toast } = useToast();
  
  // Form state
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [assignmentMode, setAssignmentMode] = useState<'template' | 'manual'>('template');
  const [conflicts, setConflicts] = useState<AssignmentConflict[]>([]);
  const [showConflicts, setShowConflicts] = useState(false);

  // Data queries
  const { data: stores = [] } = useQuery<Store[]>({
    queryKey: ['/api/stores'],
    staleTime: 5 * 60 * 1000
  });

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['/api/users'],
    staleTime: 2 * 60 * 1000
  });

  const { data: templates = [] } = useQuery<ShiftTemplate[]>({
    queryKey: ['/api/hr/shift-templates'],
    staleTime: 5 * 60 * 1000
  });

  // Filter employees by selected store
  const storeEmployees = useMemo(() => {
    if (!selectedStoreId) return employees;
    return employees.filter(emp => emp.storeId === selectedStoreId && emp.status === 'active');
  }, [employees, selectedStoreId]);

  // Selected template
  const selectedTemplate = useMemo(() => {
    return templates.find(t => t.id === selectedTemplateId);
  }, [templates, selectedTemplateId]);

  // Conflict detection mutation
  const conflictMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStoreId || !dateRange.from || !dateRange.to) return [];
      
      return await apiRequest('/api/hr/shifts/conflicts', {
        method: 'POST',
        body: JSON.stringify({
          storeId: selectedStoreId,
          startDate: format(dateRange.from, 'yyyy-MM-dd'),
          endDate: format(dateRange.to, 'yyyy-MM-dd'),
          userIds: selectedEmployees
        })
      });
    },
    onSuccess: (data) => {
      setConflicts(data || []);
      setShowConflicts(true);
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile verificare conflitti",
        variant: "destructive"
      });
    }
  });

  // Assignment mutation
  const assignmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStoreId || !selectedTemplateId || !dateRange.from || !dateRange.to) {
        throw new Error('Dati mancanti');
      }

      // Step 1: Apply template to generate shifts
      const shifts = await apiRequest('/api/hr/shifts/apply-template', {
        method: 'POST',
        body: JSON.stringify({
          templateId: selectedTemplateId,
          storeId: selectedStoreId,
          startDate: format(dateRange.from, 'yyyy-MM-dd'),
          endDate: format(dateRange.to, 'yyyy-MM-dd'),
          overwriteExisting: false
        })
      });

      // Step 2: Assign employees to generated shifts
      const assignments = [];
      for (const shift of shifts) {
        for (const employeeId of selectedEmployees) {
          try {
            await apiRequest(`/api/hr/shifts/${shift.id}/assign`, {
              method: 'POST',
              body: JSON.stringify({ userId: employeeId })
            });
            assignments.push({ shiftId: shift.id, employeeId });
          } catch (error) {
            console.warn(`Failed to assign ${employeeId} to shift ${shift.id}:`, error);
          }
        }
      }

      return { shifts, assignments };
    },
    onSuccess: async (data) => {
      // 🔄 CRITICAL FIX: Invalidate all related caches after successful assignment
      await queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/hr/calendar/events'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/hr/assignments'] });
      
      toast({
        title: "Assegnazione completata",
        description: `${data.shifts.length} turni generati con ${data.assignments.length} assegnazioni`
      });
      
      // 🧹 Reset modal state and close
      resetModalState();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Errore assegnazione",
        description: error.message || "Impossibile completare l'assegnazione",
        variant: "destructive"
      });
    }
  });

  const handleDatePreset = (preset: typeof DATE_PRESETS[0]) => {
    const range = preset.getValue();
    setDateRange(range);
  };

  const handleEmployeeSelect = (employeeId: string, checked: boolean) => {
    if (checked) {
      setSelectedEmployees(prev => [...prev, employeeId]);
    } else {
      setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
    }
  };

  const handleSelectAllEmployees = () => {
    if (selectedEmployees.length === storeEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(storeEmployees.map(emp => emp.id));
    }
  };

  // 🧹 CRITICAL FIX: Reset function for clean modal state
  const resetModalState = () => {
    setSelectedEmployees([]);
    setConflicts([]);
    setShowConflicts(false);
    setSelectedTemplateId('');
    setDateRange({ from: undefined, to: undefined });
    // Keep selectedStoreId for user convenience
  };

  // 🧹 CRITICAL FIX: Reset employees when store changes
  useEffect(() => {
    if (selectedStoreId) {
      setSelectedEmployees([]);
      setConflicts([]);
      setShowConflicts(false);
    }
  }, [selectedStoreId]);

  // 🧹 CRITICAL FIX: Reset all state when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetModalState();
    }
  }, [isOpen]);

  const canCheckConflicts = selectedStoreId && dateRange.from && dateRange.to && selectedEmployees.length > 0;
  const canAssign = canCheckConflicts && selectedTemplateId && assignmentMode === 'template';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetModalState();
      }
      onClose();
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-orange-500" />
            Assignment Engine
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={assignmentMode} onValueChange={(v) => setAssignmentMode(v as any)} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="template">Assegnazione da Template</TabsTrigger>
              <TabsTrigger value="manual" disabled>Assegnazione Manuale (Presto)</TabsTrigger>
            </TabsList>

            <TabsContent value="template" className="flex-1 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                {/* Left Column - Configuration */}
                <div className="space-y-4 overflow-y-auto pr-2">
                  {/* Store Selection */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Store className="h-4 w-4" />
                        Store Selection
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                        <SelectTrigger data-testid="select-store">
                          <SelectValue placeholder="Seleziona store" />
                        </SelectTrigger>
                        <SelectContent>
                          {stores.map(store => (
                            <SelectItem key={store.id} value={store.id}>
                              <div className="flex items-center gap-2">
                                <Building className="h-4 w-4" />
                                {store.name} ({store.code})
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>

                  {/* Date Range Selection */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <CalendarIcon className="h-4 w-4" />
                        Periodo Assegnazione
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Quick Presets */}
                      <div className="grid grid-cols-2 gap-2">
                        {DATE_PRESETS.map(preset => (
                          <Button
                            key={preset.label}
                            variant="outline"
                            size="sm"
                            onClick={() => handleDatePreset(preset)}
                            data-testid={`preset-${preset.label.toLowerCase().replace(' ', '-')}`}
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>

                      {/* Custom Date Range */}
                      <div className="grid grid-cols-2 gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateRange.from ? format(dateRange.from, 'dd/MM/yyyy', { locale: it }) : 'Data inizio'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dateRange.from}
                              onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                              disabled={(date) => date < new Date()}
                            />
                          </PopoverContent>
                        </Popover>

                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateRange.to ? format(dateRange.to, 'dd/MM/yyyy', { locale: it }) : 'Data fine'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dateRange.to}
                              onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                              disabled={(date) => date < (dateRange.from || new Date())}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Template Selection */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4" />
                        Template Turno
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                        <SelectTrigger data-testid="select-template">
                          <SelectValue placeholder="Seleziona template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.filter(t => t.isActive).map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{template.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {template.defaultStartTime} - {template.defaultEndTime} • {template.defaultRequiredStaff} persone
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {selectedTemplate && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <div className="flex items-center justify-between text-sm">
                            <span>Orario: {selectedTemplate.defaultStartTime} - {selectedTemplate.defaultEndTime}</span>
                            <Badge variant="secondary">{selectedTemplate.pattern}</Badge>
                          </div>
                          {selectedTemplate.rules?.daysOfWeek && (
                            <div className="flex gap-1 mt-2">
                              {selectedTemplate.rules.daysOfWeek.map(day => (
                                <Badge key={day} variant="outline" className="text-xs">
                                  {DAYS_OF_WEEK.find(d => d.value === day)?.label}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Employee Selection */}
                <div className="space-y-4 overflow-hidden flex flex-col">
                  <Card className="flex-1 overflow-hidden flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4" />
                          Risorse ({selectedEmployees.length} selezionate)
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAllEmployees}
                          disabled={!selectedStoreId || storeEmployees.length === 0}
                        >
                          {selectedEmployees.length === storeEmployees.length ? 'Deseleziona tutto' : 'Seleziona tutto'}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden">
                      {!selectedStoreId ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-center">
                          <div>
                            <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                            <p>Seleziona uno store per vedere le risorse</p>
                          </div>
                        </div>
                      ) : storeEmployees.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-center">
                          <div>
                            <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                            <p>Nessun dipendente attivo in questo store</p>
                          </div>
                        </div>
                      ) : (
                        <ScrollArea className="h-full">
                          <div className="space-y-2">
                            {storeEmployees.map(employee => (
                              <div
                                key={employee.id}
                                className={cn(
                                  "flex items-center space-x-3 p-3 rounded-lg border transition-colors",
                                  selectedEmployees.includes(employee.id)
                                    ? "bg-primary/5 border-primary/20"
                                    : "bg-background hover:bg-muted/50"
                                )}
                              >
                                <Checkbox
                                  id={employee.id}
                                  checked={selectedEmployees.includes(employee.id)}
                                  onCheckedChange={(checked) => handleEmployeeSelect(employee.id, checked as boolean)}
                                  data-testid={`employee-${employee.id}`}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">
                                      {employee.firstName} {employee.lastName}
                                    </span>
                                    <Badge variant="secondary" className="text-xs">
                                      {employee.position}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{employee.email}</p>
                                  {employee.skills && employee.skills.length > 0 && (
                                    <div className="flex gap-1 mt-1">
                                      {employee.skills.slice(0, 3).map(skill => (
                                        <Badge key={skill} variant="outline" className="text-xs">
                                          {skill}
                                        </Badge>
                                      ))}
                                      {employee.skills.length > 3 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{employee.skills.length - 3}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>

                  {/* Conflict Detection Results */}
                  {showConflicts && conflicts.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-sm text-amber-600">
                          <AlertTriangle className="h-4 w-4" />
                          Conflitti rilevati ({conflicts.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-32">
                          <div className="space-y-2">
                            {conflicts.map((conflict, index) => (
                              <Alert key={index} className={conflict.severity === 'error' ? 'border-red-200' : 'border-amber-200'}>
                                <AlertDescription className="text-sm">
                                  <span className="font-medium">{conflict.userName}:</span> {conflict.message}
                                </AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => conflictMutation.mutate()}
              disabled={!canCheckConflicts || conflictMutation.isPending}
              data-testid="button-check-conflicts"
            >
              {conflictMutation.isPending ? (
                <Zap className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Verifica Conflitti
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button
              onClick={() => assignmentMutation.mutate()}
              disabled={!canAssign || assignmentMutation.isPending}
              className="bg-gradient-to-r from-blue-500 to-cyan-600"
              data-testid="button-assign"
            >
              {assignmentMutation.isPending ? (
                <Zap className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Assegna Turni
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}