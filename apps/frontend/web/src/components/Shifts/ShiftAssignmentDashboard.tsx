import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Calendar, Clock, Users, AlertTriangle, CheckCircle, X, Search, 
  Filter, Download, Settings, Eye, EyeOff, MoreHorizontal,
  DragHandleDots2, UserCheck, UserX, Zap
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, addDays, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

// ==================== TYPES & INTERFACES ====================

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: string;
  skills: string[];
  weeklyHours: number;
  maxWeeklyHours: number;
  availability: 'available' | 'leave' | 'training' | 'busy';
  preferredShifts?: string[];
  currentAssignments?: string[];
}

interface ShiftAssignment {
  id: string;
  shiftId: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'assigned' | 'pending' | 'confirmed' | 'rejected';
  notes?: string;
}

interface Shift {
  id: string;
  templateId?: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  requiredStaff: number;
  assignedStaff: number;
  requiredSkills?: string[];
  storeId: string;
  assignments?: ShiftAssignment[];
}

interface ConflictDetection {
  type: 'overlap' | 'overtime' | 'skill_mismatch' | 'availability';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedShifts: string[];
  affectedEmployees: string[];
}

interface Props {
  storeId: string;
  selectedWeek: Date;
  onAssignShift: (shiftId: string, employeeIds: string[]) => Promise<void>;
  onUnassignShift: (shiftId: string, employeeIds: string[]) => Promise<void>;
  onBulkAssign: (assignments: { shiftId: string; employeeId: string }[]) => Promise<void>;
}

// ==================== CONSTANTS ====================

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

const CONFLICT_COLORS = {
  overlap: 'bg-red-100 border-red-300 text-red-800',
  overtime: 'bg-orange-100 border-orange-300 text-orange-800', 
  skill_mismatch: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  availability: 'bg-blue-100 border-blue-300 text-blue-800'
};

const SHIFT_STATUS_COLORS = {
  understaffed: 'bg-red-500',
  partial: 'bg-orange-500',
  staffed: 'bg-green-500',
  overstaffed: 'bg-blue-500'
};

// ==================== MAIN COMPONENT ====================

export default function ShiftAssignmentDashboard({
  storeId,
  selectedWeek,
  onAssignShift,
  onUnassignShift,
  onBulkAssign
}: Props) {
  // ==================== STATE MANAGEMENT ====================
  
  const [selectedShifts, setSelectedShifts] = useState<Set<string>>(new Set());
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterAvailability, setFilterAvailability] = useState<string>('all');
  const [showConflicts, setShowConflicts] = useState(true);
  const [draggedEmployee, setDraggedEmployee] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'gantt' | 'grid'>('gantt');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ==================== DATA FETCHING ====================

  // Get staff members
  const { data: staffMembers = [], isLoading: staffLoading } = useQuery({
    queryKey: ['/api/users'],
    select: (users: any[]) => users.filter(user => user.storeId === storeId)
  });

  // Get shifts for selected week
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  
  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['/api/hr/shifts', storeId, format(weekStart, 'yyyy-MM-dd')],
    enabled: !!storeId
  });

  // Get existing assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ['/api/hr/shift-assignments', storeId, format(weekStart, 'yyyy-MM-dd')]
  });

  // ==================== COMPUTED VALUES ====================

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const filteredStaff = useMemo(() => {
    return staffMembers.filter(staff => {
      const matchesSearch = searchQuery === '' || 
        `${staff.firstName} ${staff.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.role.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = filterRole === 'all' || staff.role === filterRole;
      const matchesAvailability = filterAvailability === 'all' || staff.availability === filterAvailability;
      
      return matchesSearch && matchesRole && matchesAvailability;
    });
  }, [staffMembers, searchQuery, filterRole, filterAvailability]);

  const conflictDetection = useMemo(() => {
    const conflicts: ConflictDetection[] = [];
    
    // Detect overlapping shifts for same employee
    assignments.forEach(assignment => {
      const overlapping = assignments.filter(other => 
        other.employeeId === assignment.employeeId &&
        other.id !== assignment.id &&
        other.date === assignment.date &&
        ((other.startTime >= assignment.startTime && other.startTime < assignment.endTime) ||
         (other.endTime > assignment.startTime && other.endTime <= assignment.endTime))
      );
      
      if (overlapping.length > 0) {
        conflicts.push({
          type: 'overlap',
          severity: 'high',
          message: `Sovrapposizione turni per dipendente ${assignment.employeeId}`,
          affectedShifts: [assignment.shiftId, ...overlapping.map(o => o.shiftId)],
          affectedEmployees: [assignment.employeeId]
        });
      }
    });
    
    return conflicts;
  }, [assignments]);

  // ==================== EVENT HANDLERS ====================

  const handleShiftSelection = useCallback((shiftId: string, selected: boolean) => {
    setSelectedShifts(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(shiftId);
      } else {
        newSet.delete(shiftId);
      }
      return newSet;
    });
  }, []);

  const handleEmployeeSelection = useCallback((employeeId: string, selected: boolean) => {
    setSelectedEmployees(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(employeeId);
      } else {
        newSet.delete(employeeId);
      }
      return newSet;
    });
  }, []);

  const handleBulkAssign = useCallback(async () => {
    if (selectedShifts.size === 0 || selectedEmployees.size === 0) {
      toast({
        title: "Selezione Incompleta",
        description: "Seleziona almeno un turno e un dipendente",
        variant: "destructive"
      });
      return;
    }

    const assignmentData = Array.from(selectedShifts).flatMap(shiftId =>
      Array.from(selectedEmployees).map(employeeId => ({
        shiftId,
        employeeId
      }))
    );

    try {
      await onBulkAssign(assignmentData);
      setSelectedShifts(new Set());
      setSelectedEmployees(new Set());
      toast({
        title: "Assegnazioni Completate",
        description: `${assignmentData.length} assegnazioni create con successo`
      });
    } catch (error) {
      toast({
        title: "Errore Assegnazione",
        description: "Impossibile completare le assegnazioni",
        variant: "destructive"
      });
    }
  }, [selectedShifts, selectedEmployees, onBulkAssign, toast]);

  // Drag and Drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, employeeId: string) => {
    setDraggedEmployee(employeeId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, shiftId: string) => {
    e.preventDefault();
    if (draggedEmployee) {
      try {
        await onAssignShift(shiftId, [draggedEmployee]);
        toast({
          title: "Assegnazione Completata",
          description: "Dipendente assegnato al turno con successo"
        });
      } catch (error) {
        toast({
          title: "Errore Assegnazione",
          description: "Impossibile assegnare il dipendente",
          variant: "destructive"
        });
      }
    }
    setDraggedEmployee(null);
  }, [draggedEmployee, onAssignShift, toast]);

  // ==================== RENDER HELPERS ====================

  const getShiftStatus = (shift: Shift) => {
    const coverage = shift.assignedStaff / shift.requiredStaff;
    if (coverage === 0) return 'understaffed';
    if (coverage < 1) return 'partial';
    if (coverage === 1) return 'staffed';
    return 'overstaffed';
  };

  const getShiftConflicts = (shiftId: string) => {
    return conflictDetection.filter(conflict => 
      conflict.affectedShifts.includes(shiftId)
    );
  };

  const renderGanttTimeline = () => (
    <div className="relative bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header with time slots */}
      <div className="flex border-b bg-gray-50">
        <div className="w-48 p-3 font-semibold border-r">Dipendenti</div>
        <div className="flex-1 grid grid-cols-24 text-xs">
          {TIME_SLOTS.map(time => (
            <div key={time} className="p-1 text-center border-r border-gray-100">
              {time}
            </div>
          ))}
        </div>
      </div>

      {/* Header with days */}
      <div className="flex border-b bg-gray-100">
        <div className="w-48 p-3 font-semibold border-r">Dipendenti</div>
        {weekDays.map(day => (
          <div key={day.toISOString()} className="flex-1 text-center p-2 border-r font-medium">
            <div className="text-sm">{format(day, 'EEE', { locale: it })}</div>
            <div className="text-xs text-gray-500">{format(day, 'd MMM', { locale: it })}</div>
          </div>
        ))}
      </div>
      
      {/* Staff rows with shift visualization */}
      <ScrollArea className="h-96">
        {filteredStaff.map(employee => (
          <div key={employee.id} className="flex border-b hover:bg-gray-50">
            {/* Employee info */}
            <div className="w-48 p-3 border-r flex items-center space-x-3">
              <Checkbox
                checked={selectedEmployees.has(employee.id)}
                onCheckedChange={(checked) => 
                  handleEmployeeSelection(employee.id, !!checked)
                }
                data-testid={`checkbox-employee-${employee.id}`}
              />
              <Avatar className="w-8 h-8">
                <AvatarImage src={employee.avatar} />
                <AvatarFallback>
                  {employee.firstName[0]}{employee.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div 
                className="flex-1 cursor-move"
                draggable
                onDragStart={(e) => handleDragStart(e, employee.id)}
                data-testid={`draggable-employee-${employee.id}`}
              >
                <div className="font-medium text-sm">
                  {employee.firstName} {employee.lastName}
                </div>
                <div className="text-xs text-gray-500">{employee.role}</div>
              </div>
            </div>

            {/* Days grid */}
            <div className="flex-1 grid grid-cols-7 relative">
              {weekDays.map((day, dayIndex) => (
                <div 
                  key={day.toISOString()} 
                  className="border-r border-gray-100 h-16 relative p-1"
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    // Find available shifts for this day to assign to
                    const dayShifts = shifts.filter(shift => 
                      isSameDay(parseISO(shift.date), day)
                    );
                    if (dayShifts.length > 0) {
                      handleDrop(e, dayShifts[0].id); // Drop on first available shift for now
                    }
                  }}
                >
                  {/* Render shift bars for this employee and day */}
                  {assignments
                    .filter(assignment => 
                      assignment.employeeId === employee.id &&
                      isSameDay(parseISO(assignment.date), day)
                    )
                    .map(assignment => {
                      const shift = shifts.find(s => s.id === assignment.shiftId);
                      if (!shift) return null;

                      const status = getShiftStatus(shift);
                      const conflicts = getShiftConflicts(shift.id);
                      
                      return (
                        <Tooltip key={assignment.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "w-full h-12 rounded text-xs font-medium text-white cursor-pointer flex items-center justify-center mb-1",
                                SHIFT_STATUS_COLORS[status],
                                conflicts.length > 0 && "ring-1 ring-red-500",
                                selectedShifts.has(shift.id) && "ring-1 ring-blue-500"
                              )}
                              onClick={() => handleShiftSelection(shift.id, !selectedShifts.has(shift.id))}
                              data-testid={`shift-bar-${shift.id}`}
                            >
                              <div className="text-center">
                                <div className="font-semibold truncate">{shift.title}</div>
                                <div className="text-xs">{assignment.startTime.slice(0,5)}-{assignment.endTime.slice(0,5)}</div>
                                {conflicts.length > 0 && (
                                  <AlertTriangle className="w-3 h-3 mx-auto" />
                                )}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm">
                              <div className="font-semibold">{shift.title}</div>
                              <div>{format(day, 'd MMM yyyy', { locale: it })}</div>
                              <div>{assignment.startTime} - {assignment.endTime}</div>
                              <div>Staff: {shift.assignedStaff}/{shift.requiredStaff}</div>
                              {conflicts.length > 0 && (
                                <div className="text-red-400 mt-1">
                                  ⚠️ {conflicts.length} conflitto/i rilevato/i
                                </div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  {/* Drop zone for unassigned shifts on this day */}
                  {!assignments.some(assignment => 
                    assignment.employeeId === employee.id &&
                    isSameDay(parseISO(assignment.date), day)
                  ) && (
                    <div className="w-full h-12 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-gray-500">
                      Trascina qui per assegnare
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </ScrollArea>
    </div>
  );

  const renderControlPanel = () => (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Assignment Dashboard Enterprise
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Gestione avanzata assegnazioni con drag & drop e conflict detection
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={showConflicts ? "default" : "outline"}
              size="sm"
              onClick={() => setShowConflicts(!showConflicts)}
              data-testid="button-toggle-conflicts"
            >
              {showConflicts ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              Conflitti
            </Button>
            <Button
              variant={viewMode === 'gantt' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode(viewMode === 'gantt' ? 'grid' : 'gantt')}
              data-testid="button-toggle-view"
            >
              <Calendar className="w-4 h-4 mr-1" />
              {viewMode === 'gantt' ? 'Gantt' : 'Grid'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Cerca dipendenti..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-employees"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full p-2 border rounded-md"
              data-testid="select-filter-role"
            >
              <option value="all">Tutti i ruoli</option>
              <option value="Cassiere">Cassiere</option>
              <option value="Supervisore">Supervisore</option>
              <option value="Magazziniere">Magazziniere</option>
            </select>
          </div>

          {/* Availability Filter */}
          <div>
            <select
              value={filterAvailability}
              onChange={(e) => setFilterAvailability(e.target.value)}
              className="w-full p-2 border rounded-md"
              data-testid="select-filter-availability"
            >
              <option value="all">Tutte le disponibilità</option>
              <option value="available">Disponibile</option>
              <option value="leave">In ferie</option>
              <option value="training">In formazione</option>
              <option value="busy">Occupato</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {(selectedShifts.size > 0 || selectedEmployees.size > 0) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-medium">Selezione: </span>
                {selectedShifts.size} turno/i, {selectedEmployees.size} dipendente/i
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={handleBulkAssign}
                  disabled={selectedShifts.size === 0 || selectedEmployees.size === 0}
                  data-testid="button-bulk-assign"
                >
                  <UserCheck className="w-4 h-4 mr-1" />
                  Assegna Selezionati
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedShifts(new Set());
                    setSelectedEmployees(new Set());
                  }}
                  data-testid="button-clear-selection"
                >
                  <X className="w-4 h-4 mr-1" />
                  Pulisci
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Conflicts Alert */}
        {showConflicts && conflictDetection.length > 0 && (
          <Alert className="mb-4 border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">
                {conflictDetection.length} conflitto/i rilevato/i:
              </span>
              <ul className="mt-1 text-sm">
                {conflictDetection.slice(0, 3).map((conflict, index) => (
                  <li key={index} className="flex items-center">
                    <span className={cn(
                      "w-2 h-2 rounded-full mr-2",
                      conflict.severity === 'high' ? 'bg-red-500' :
                      conflict.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'
                    )} />
                    {conflict.message}
                  </li>
                ))}
                {conflictDetection.length > 3 && (
                  <li className="text-gray-500">
                    ... e altri {conflictDetection.length - 3} conflitti
                  </li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  // ==================== MAIN RENDER ====================

  if (staffLoading || shiftsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Caricamento assignment dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {renderControlPanel()}
        
        {viewMode === 'gantt' ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Vista Timeline Gantt - Settimana {format(selectedWeek, 'd MMM', { locale: it })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderGanttTimeline()}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Vista Grid (Implementazione futura)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Vista grid in fase di sviluppo
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}