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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, Clock, Users, AlertTriangle, CheckCircle, X, Search, 
  Filter, Download, Settings, Eye, EyeOff, MoreHorizontal,
  DragHandleDots2, UserCheck, UserX, Zap, ZoomIn, ZoomOut
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
const TIME_SLOTS_24H = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
const TIME_SLOTS_QUARTER = Array.from({ length: 96 }, (_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});
const TIME_SLOTS_HALF = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
});

const CONFLICT_COLORS = {
  overlap: 'bg-red-100 border-red-300 text-red-800',
  overtime: 'bg-orange-100 border-orange-300 text-orange-800', 
  skill_mismatch: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  availability: 'bg-blue-100 border-blue-300 text-blue-800',
  rest_period: 'bg-purple-100 border-purple-300 text-purple-800',
  double_shift: 'bg-pink-100 border-pink-300 text-pink-800'
};

const CONFLICT_SEVERITY_ICONS = {
  high: '🔴',
  medium: '🟡', 
  low: '🟢'
};

const MIN_REST_HOURS = 11; // Minimum rest period between shifts in hours

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
  const [draggedData, setDraggedData] = useState<any>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'gantt' | 'grid'>('gantt');
  const [timelineZoom, setTimelineZoom] = useState<'hours' | 'quarter' | 'half'>('hours');
  const [timelineStartHour, setTimelineStartHour] = useState(6); // Start from 6 AM
  const [timelineEndHour, setTimelineEndHour] = useState(22); // End at 10 PM
  
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
    
    // Helper function to parse time
    const parseTime = (time: string): number => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours + minutes / 60;
    };

    // Helper function to get date difference in hours
    const getHoursDifference = (date1: string, time1: string, date2: string, time2: string): number => {
      const d1 = new Date(`${date1}T${time1}`);
      const d2 = new Date(`${date2}T${time2}`);
      return Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60);
    };

    // Group assignments by employee for easier processing
    const assignmentsByEmployee = assignments.reduce((acc, assignment) => {
      if (!acc[assignment.employeeId]) acc[assignment.employeeId] = [];
      acc[assignment.employeeId].push(assignment);
      return acc;
    }, {} as Record<string, ShiftAssignment[]>);

    Object.entries(assignmentsByEmployee).forEach(([employeeId, employeeAssignments]) => {
      const employee = filteredStaff.find(e => e.id === employeeId);
      if (!employee) return;

      // 1. Check for time overlaps
      employeeAssignments.forEach(assignment => {
        const overlapping = employeeAssignments.filter(other => 
          other.id !== assignment.id &&
          other.date === assignment.date &&
          (parseTime(assignment.startTime) < parseTime(other.endTime) && 
           parseTime(assignment.endTime) > parseTime(other.startTime))
        );
        
        if (overlapping.length > 0) {
          conflicts.push({
            type: 'overlap',
            severity: 'high',
            message: `⚠️ Sovrapposizione turni il ${format(parseISO(assignment.date), 'd MMM', { locale: it })} per ${employee.firstName} ${employee.lastName}`,
            affectedShifts: [assignment.shiftId, ...overlapping.map(o => o.shiftId)],
            affectedEmployees: [employeeId]
          });
        }
      });

      // 2. Check for insufficient rest periods
      const sortedAssignments = [...employeeAssignments].sort((a, b) => 
        new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime()
      );

      for (let i = 0; i < sortedAssignments.length - 1; i++) {
        const current = sortedAssignments[i];
        const next = sortedAssignments[i + 1];
        
        const restHours = getHoursDifference(current.date, current.endTime, next.date, next.startTime);
        
        if (restHours < MIN_REST_HOURS) {
          conflicts.push({
            type: 'rest_period',
            severity: restHours < 8 ? 'high' : 'medium',
            message: `⏰ Riposo insufficiente (${restHours.toFixed(1)}h < ${MIN_REST_HOURS}h) per ${employee.firstName} ${employee.lastName}`,
            affectedShifts: [current.shiftId, next.shiftId],
            affectedEmployees: [employeeId]
          });
        }
      }

      // 3. Check weekly overtime
      const weeklyHours = employeeAssignments.reduce((total, assignment) => {
        const shift = shifts.find(s => s.id === assignment.shiftId);
        if (!shift) return total;
        return total + calculateShiftHours(assignment.startTime, assignment.endTime);
      }, 0);

      if (weeklyHours > employee.maxWeeklyHours) {
        const overtime = weeklyHours - employee.maxWeeklyHours;
        conflicts.push({
          type: 'overtime',
          severity: overtime > 10 ? 'high' : 'medium',
          message: `📊 Straordinario eccessivo: ${overtime.toFixed(1)}h oltre il limite per ${employee.firstName} ${employee.lastName}`,
          affectedShifts: employeeAssignments.map(a => a.shiftId),
          affectedEmployees: [employeeId]
        });
      }

      // 4. Check skill requirements
      employeeAssignments.forEach(assignment => {
        const shift = shifts.find(s => s.id === assignment.shiftId);
        if (!shift || !shift.requiredSkills || shift.requiredSkills.length === 0) return;

        const missingSkills = shift.requiredSkills.filter(skill => 
          !employee.skills.includes(skill)
        );

        if (missingSkills.length > 0) {
          conflicts.push({
            type: 'skill_mismatch',
            severity: 'medium',
            message: `🎯 Skills mancanti per ${employee.firstName} ${employee.lastName}: ${missingSkills.join(', ')}`,
            affectedShifts: [assignment.shiftId],
            affectedEmployees: [employeeId]
          });
        }
      });

      // 5. Check employee availability
      employeeAssignments.forEach(assignment => {
        if (employee.availability !== 'available') {
          let severity: 'high' | 'medium' | 'low' = 'medium';
          let message = '';

          switch (employee.availability) {
            case 'leave':
              severity = 'high';
              message = `🏖️ ${employee.firstName} ${employee.lastName} in ferie il ${format(parseISO(assignment.date), 'd MMM', { locale: it })}`;
              break;
            case 'training':
              severity = 'medium';
              message = `📚 ${employee.firstName} ${employee.lastName} in formazione il ${format(parseISO(assignment.date), 'd MMM', { locale: it })}`;
              break;
            case 'busy':
              severity = 'low';
              message = `⏳ ${employee.firstName} ${employee.lastName} occupato il ${format(parseISO(assignment.date), 'd MMM', { locale: it })}`;
              break;
          }

          conflicts.push({
            type: 'availability',
            severity,
            message,
            affectedShifts: [assignment.shiftId],
            affectedEmployees: [employeeId]
          });
        }
      });

      // 6. Check for double shifts (same day, different shifts)
      const assignmentsByDate = employeeAssignments.reduce((acc, assignment) => {
        if (!acc[assignment.date]) acc[assignment.date] = [];
        acc[assignment.date].push(assignment);
        return acc;
      }, {} as Record<string, ShiftAssignment[]>);

      Object.entries(assignmentsByDate).forEach(([date, dayAssignments]) => {
        if (dayAssignments.length > 1) {
          const totalHours = dayAssignments.reduce((total, assignment) => {
            return total + calculateShiftHours(assignment.startTime, assignment.endTime);
          }, 0);

          if (totalHours > 12) {
            conflicts.push({
              type: 'double_shift',
              severity: totalHours > 16 ? 'high' : 'medium',
              message: `🔄 Doppio turno eccessivo (${totalHours.toFixed(1)}h) per ${employee.firstName} ${employee.lastName} il ${format(parseISO(date), 'd MMM', { locale: it })}`,
              affectedShifts: dayAssignments.map(a => a.shiftId),
              affectedEmployees: [employeeId]
            });
          }
        }
      });
    });

    // 7. Check shift staffing conflicts
    shifts.forEach(shift => {
      const shiftAssignments = assignments.filter(a => a.shiftId === shift.id);
      
      if (shiftAssignments.length > shift.requiredStaff) {
        conflicts.push({
          type: 'overstaffing',
          severity: 'low',
          message: `👥 Sovraffollamento turno "${shift.title}": ${shiftAssignments.length}/${shift.requiredStaff} staff`,
          affectedShifts: [shift.id],
          affectedEmployees: shiftAssignments.map(a => a.employeeId)
        });
      } else if (shiftAssignments.length < shift.requiredStaff) {
        const deficit = shift.requiredStaff - shiftAssignments.length;
        conflicts.push({
          type: 'understaffing',
          severity: deficit > 2 ? 'high' : 'medium',
          message: `📉 Sottodimensionamento turno "${shift.title}": mancano ${deficit} persone`,
          affectedShifts: [shift.id],
          affectedEmployees: []
        });
      }
    });
    
    return conflicts;
  }, [assignments, filteredStaff, shifts, calculateShiftHours]);

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

  // Utility functions
  const calculateShiftHours = useCallback((startTime: string, endTime: string): number => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diffMs = end.getTime() - start.getTime();
    return diffMs / (1000 * 60 * 60); // Convert to hours
  }, []);

  const handleViewEmployeeDetails = useCallback((employeeId: string) => {
    const employee = filteredStaff.find(e => e.id === employeeId);
    if (employee) {
      toast({
        title: `${employee.firstName} ${employee.lastName}`,
        description: `${employee.role} - Skills: ${employee.skills.join(', ')}`,
      });
    }
  }, [filteredStaff, toast]);

  // Enhanced Drag and Drop with visual feedback
  const handleDragStart = useCallback((e: React.DragEvent, data: any) => {
    let dragInfo: any;
    
    if (typeof data === 'string') {
      // Legacy support for employee drag
      dragInfo = { type: 'employee', employeeId: data };
      setDraggedEmployee(data);
    } else if (data.shiftId && !data.employeeId) {
      // Dragging an unassigned shift
      dragInfo = { type: 'shift', shiftId: data.shiftId };
    } else if (data.id && data.employeeId) {
      // Dragging an assignment
      dragInfo = { 
        type: 'assignment', 
        assignmentId: data.id,
        shiftId: data.shiftId,
        employeeId: data.employeeId 
      };
    }
    
    setDraggedData(dragInfo);
    e.dataTransfer.setData('text/plain', JSON.stringify(dragInfo));
    e.dataTransfer.effectAllowed = 'move';
    
    // Add visual drag feedback
    const element = e.currentTarget as HTMLElement;
    element.style.opacity = '0.5';
    element.style.transform = 'scale(0.95)';
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    // Reset visual feedback
    const element = e.currentTarget as HTMLElement;
    element.style.opacity = '1';
    element.style.transform = 'scale(1)';
    
    // Reset drag state
    setDraggedData(null);
    setDraggedEmployee(null);
    setDragOverTarget(null);
  }, []);

  const isValidDropTarget = useCallback((dragData: any, targetEmployeeId: string, targetDate: Date): { valid: boolean; reason?: string } => {
    if (!dragData) return { valid: false, reason: 'Nessun dato di trascinamento' };
    
    const employee = filteredStaff.find(e => e.id === targetEmployeeId);
    if (!employee) return { valid: false, reason: 'Dipendente non trovato' };
    
    if (dragData.type === 'shift') {
      const shift = shifts.find(s => s.id === dragData.shiftId);
      if (!shift) return { valid: false, reason: 'Turno non trovato' };
      
      // Check if employee already has a shift on this day
      const existingAssignment = assignments.find(a => 
        a.employeeId === targetEmployeeId && 
        isSameDay(parseISO(a.date), targetDate)
      );
      
      if (existingAssignment) {
        return { valid: false, reason: 'Dipendente già assegnato in questo giorno' };
      }
      
      // Check skill requirements
      if (shift.requiredSkills && shift.requiredSkills.length > 0) {
        const hasRequiredSkills = shift.requiredSkills.every(skill => 
          employee.skills.includes(skill)
        );
        if (!hasRequiredSkills) {
          return { valid: false, reason: 'Skills non compatibili' };
        }
      }
      
      // Check weekly hours
      const employeeAssignments = assignments.filter(a => a.employeeId === targetEmployeeId);
      const weeklyHours = employeeAssignments.reduce((total, assignment) => {
        const s = shifts.find(sh => sh.id === assignment.shiftId);
        if (!s) return total;
        return total + calculateShiftHours(s.startTime, s.endTime);
      }, 0);
      
      const shiftHours = calculateShiftHours(shift.startTime, shift.endTime);
      if (weeklyHours + shiftHours > employee.maxWeeklyHours) {
        return { valid: false, reason: 'Supererebbe le ore massime settimanali' };
      }
    }
    
    return { valid: true };
  }, [filteredStaff, shifts, assignments, calculateShiftHours]);

  const handleGridDrop = useCallback(async (e: React.DragEvent, targetEmployeeId: string, targetDate: Date) => {
    e.preventDefault();
    setDragOverTarget(null);
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
      
      // Validate drop target
      const validation = isValidDropTarget(dragData, targetEmployeeId, targetDate);
      if (!validation.valid) {
        toast({
          title: "Operazione Non Valida",
          description: validation.reason,
          variant: "destructive"
        });
        return;
      }
      
      if (dragData.type === 'shift') {
        // Assigning unassigned shift to employee
        await onAssignShift(dragData.shiftId, [targetEmployeeId]);
        toast({
          title: "Turno Assegnato",
          description: "Turno assegnato con successo al dipendente"
        });
      } else if (dragData.type === 'assignment') {
        // Moving assignment from one employee to another
        if (dragData.employeeId !== targetEmployeeId) {
          await onUnassignShift(dragData.shiftId, [dragData.employeeId]);
          await onAssignShift(dragData.shiftId, [targetEmployeeId]);
          toast({
            title: "Assegnazione Spostata",
            description: "Assegnazione spostata con successo"
          });
        }
      }
    } catch (error) {
      console.error('Grid drop error:', error);
      toast({
        title: "Errore",
        description: "Impossibile completare l'operazione",
        variant: "destructive"
      });
    }
  }, [onAssignShift, onUnassignShift, toast, isValidDropTarget]);

  const handleGridDragOver = useCallback((e: React.DragEvent, targetEmployeeId: string, targetDate: Date) => {
    e.preventDefault();
    
    if (draggedData) {
      const validation = isValidDropTarget(draggedData, targetEmployeeId, targetDate);
      if (validation.valid) {
        e.dataTransfer.dropEffect = 'move';
        setDragOverTarget(`${targetEmployeeId}-${format(targetDate, 'yyyy-MM-dd')}`);
      } else {
        e.dataTransfer.dropEffect = 'none';
        setDragOverTarget(null);
      }
    }
  }, [draggedData, isValidDropTarget]);

  const handleGridDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTarget(null);
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

  // Gantt Timeline utilities
  const getTimeSlots = useCallback(() => {
    switch (timelineZoom) {
      case 'quarter':
        return TIME_SLOTS_QUARTER.slice(timelineStartHour * 4, timelineEndHour * 4);
      case 'half':
        return TIME_SLOTS_HALF.slice(timelineStartHour * 2, timelineEndHour * 2);
      default:
        return TIME_SLOTS_24H.slice(timelineStartHour, timelineEndHour);
    }
  }, [timelineZoom, timelineStartHour, timelineEndHour]);

  const getShiftPosition = useCallback((startTime: string, endTime: string): { left: number; width: number } => {
    const parseTime = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours + minutes / 60;
    };

    const startHour = parseTime(startTime);
    const endHour = parseTime(endTime);
    const totalHours = timelineEndHour - timelineStartHour;
    
    const left = ((startHour - timelineStartHour) / totalHours) * 100;
    const width = ((endHour - startHour) / totalHours) * 100;
    
    return {
      left: Math.max(0, Math.min(100, left)),
      width: Math.max(1, Math.min(100 - left, width))
    };
  }, [timelineStartHour, timelineEndHour]);

  const handleTimelineShiftDrop = useCallback(async (e: React.DragEvent, employeeId: string, day: Date, timeSlot: string) => {
    e.preventDefault();
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
      
      if (dragData.type === 'shift') {
        await onAssignShift(dragData.shiftId, [employeeId]);
        toast({
          title: "Turno Assegnato",
          description: `Turno assegnato a ${timeSlot} per ${format(day, 'd MMM', { locale: it })}`
        });
      } else if (dragData.type === 'assignment') {
        if (dragData.employeeId !== employeeId) {
          await onUnassignShift(dragData.shiftId, [dragData.employeeId]);
          await onAssignShift(dragData.shiftId, [employeeId]);
          toast({
            title: "Assegnazione Spostata",
            description: "Assegnazione spostata con successo nella timeline"
          });
        }
      }
    } catch (error) {
      console.error('Timeline drop error:', error);
      toast({
        title: "Errore",
        description: "Impossibile completare l'operazione",
        variant: "destructive"
      });
    }
  }, [onAssignShift, onUnassignShift, toast]);

  const renderGanttTimeline = () => {
    const timeSlots = getTimeSlots();
    const colWidth = 100 / timeSlots.length;

    return (
      <div className="space-y-4">
        {/* Timeline Controls */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Zoom:</label>
              <Select value={timelineZoom} onValueChange={(value) => setTimelineZoom(value as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours">Ore</SelectItem>
                  <SelectItem value="half">30 min</SelectItem>
                  <SelectItem value="quarter">15 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Orario:</label>
              <Select value={timelineStartHour.toString()} onValueChange={(value) => setTimelineStartHour(Number(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>{i.toString().padStart(2, '0')}:00</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm">-</span>
              <Select value={timelineEndHour.toString()} onValueChange={(value) => setTimelineEndHour(Number(value))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>{i.toString().padStart(2, '0')}:00</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTimelineStartHour(Math.max(0, timelineStartHour - 2));
                setTimelineEndHour(Math.max(timelineStartHour + 4, timelineEndHour - 2));
              }}
              data-testid="button-timeline-zoom-out"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTimelineStartHour(Math.min(20, timelineStartHour + 1));
                setTimelineEndHour(Math.min(24, timelineEndHour + 1));
              }}
              data-testid="button-timeline-zoom-in"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Gantt Chart */}
        <div className="relative bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Timeline Header */}
          <div className="sticky top-0 z-10 bg-white border-b">
            {/* Days Header */}
            <div className="flex border-b bg-gray-100">
              <div className="w-48 p-3 font-semibold border-r bg-white">Dipendenti</div>
              {weekDays.map(day => (
                <div key={day.toISOString()} className="flex-1 text-center p-2 border-r font-medium min-w-0">
                  <div className="text-sm">{format(day, 'EEE', { locale: it })}</div>
                  <div className="text-xs text-gray-500">{format(day, 'd MMM', { locale: it })}</div>
                </div>
              ))}
            </div>

            {/* Time Slots Header */}
            <div className="flex border-b bg-gray-50">
              <div className="w-48 border-r bg-white"></div>
              {weekDays.map(day => (
                <div key={day.toISOString()} className="flex-1 border-r min-w-0">
                  <div className="flex text-xs">
                    {timeSlots.map((time, index) => (
                      <div 
                        key={`${day.toISOString()}-${time}`} 
                        className="border-r border-gray-100 text-center py-1 px-1"
                        style={{ width: `${colWidth}%` }}
                      >
                        {timelineZoom === 'hours' ? time.slice(0, 2) : time}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Staff Rows */}
          <ScrollArea className="h-96">
            {filteredStaff.map(employee => (
              <div key={employee.id} className="flex border-b hover:bg-gray-50 h-16">
                {/* Employee Info */}
                <div className="w-48 p-3 border-r flex items-center space-x-3 bg-white sticky left-0 z-5">
                  <Checkbox
                    checked={selectedEmployees.has(employee.id)}
                    onCheckedChange={(checked) => handleEmployeeSelection(employee.id, !!checked)}
                    data-testid={`checkbox-employee-${employee.id}`}
                  />
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={employee.avatar} />
                    <AvatarFallback>
                      {employee.firstName[0]}{employee.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-sm truncate">
                      {employee.firstName} {employee.lastName}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{employee.role}</div>
                  </div>
                </div>

                {/* Timeline Days */}
                {weekDays.map(day => (
                  <div key={day.toISOString()} className="flex-1 border-r relative min-w-0">
                    {/* Time Grid Background */}
                    <div className="absolute inset-0 flex">
                      {timeSlots.map((time, index) => (
                        <div 
                          key={`${day.toISOString()}-${time}-grid`}
                          className="border-r border-gray-100 h-full"
                          style={{ width: `${colWidth}%` }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleTimelineShiftDrop(e, employee.id, day, time)}
                          data-testid={`timeline-slot-${employee.id}-${format(day, 'yyyy-MM-dd')}-${time}`}
                        />
                      ))}
                    </div>

                    {/* Shift Bars */}
                    <div className="absolute inset-0 p-1">
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
                          const position = getShiftPosition(assignment.startTime, assignment.endTime);
                          
                          return (
                            <Tooltip key={assignment.id}>
                              <TooltipTrigger asChild>
                                <div
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, assignment)}
                                  onDragEnd={handleDragEnd}
                                  className={cn(
                                    "absolute top-1 bottom-1 rounded cursor-move text-xs font-medium text-white flex items-center justify-center",
                                    "hover:shadow-lg transition-all duration-200",
                                    SHIFT_STATUS_COLORS[status],
                                    conflicts.length > 0 && "ring-1 ring-red-400",
                                    selectedShifts.has(shift.id) && "ring-2 ring-blue-400"
                                  )}
                                  style={{
                                    left: `${position.left}%`,
                                    width: `${position.width}%`
                                  }}
                                  onClick={() => handleShiftSelection(shift.id, !selectedShifts.has(shift.id))}
                                  data-testid={`gantt-shift-${shift.id}`}
                                >
                                  <div className="text-center truncate px-1">
                                    <div className="font-semibold text-xs truncate">{shift.title}</div>
                                    {position.width > 15 && (
                                      <div className="text-xs opacity-90">
                                        {assignment.startTime.slice(0,5)}-{assignment.endTime.slice(0,5)}
                                      </div>
                                    )}
                                    {conflicts.length > 0 && position.width > 10 && (
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
                                  <div>Durata: {calculateShiftHours(assignment.startTime, assignment.endTime).toFixed(1)}h</div>
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
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </ScrollArea>
        </div>
      </div>
    );
  };

  const renderGridView = () => {
    const weekDays = Array.from({ length: 7 }, (_, i) => 
      addDays(startOfWeek(selectedWeek, { weekStartsOn: 1 }), i)
    );

    return (
      <div className="space-y-4">
        {/* Filter and Search Bar */}
        <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex-1 min-w-64">
            <Input
              placeholder="Cerca dipendente, turno o skill..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
              data-testid="input-search-assignments"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => setSelectedShifts(new Set())}
            data-testid="button-clear-selection"
          >
            <X className="w-4 h-4 mr-1" />
            Pulisci Selezione
          </Button>
          <Button 
            onClick={handleBulkAssign}
            disabled={selectedShifts.size === 0 || selectedEmployees.size === 0}
            data-testid="button-bulk-assign"
          >
            <UserCheck className="w-4 h-4 mr-1" />
            Assegna in Blocco ({selectedShifts.size})
          </Button>
        </div>

        {/* Grid Table */}
        <div className="overflow-auto border rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left font-semibold">Dipendente</th>
                {weekDays.map(day => (
                  <th key={day.toISOString()} className="border p-2 text-center font-semibold min-w-32">
                    <div>{format(day, 'EEE', { locale: it })}</div>
                    <div className="text-xs text-gray-500">{format(day, 'd MMM', { locale: it })}</div>
                  </th>
                ))}
                <th className="border p-2 text-center font-semibold">Tot. Ore</th>
                <th className="border p-2 text-center font-semibold">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map(employee => {
                const employeeAssignments = assignments.filter(a => a.employeeId === employee.id);
                const weeklyHours = employeeAssignments.reduce((total, assignment) => {
                  const shift = shifts.find(s => s.id === assignment.shiftId);
                  if (!shift) return total;
                  const hours = calculateShiftHours(shift.startTime, shift.endTime);
                  return total + hours;
                }, 0);

                return (
                  <tr 
                    key={employee.id} 
                    className={cn(
                      "hover:bg-gray-50",
                      selectedEmployees.has(employee.id) && "bg-blue-50"
                    )}
                  >
                    {/* Employee Info Column */}
                    <td className="border p-2">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedEmployees.has(employee.id)}
                          onCheckedChange={(checked) => handleEmployeeSelection(employee.id, checked as boolean)}
                          data-testid={`checkbox-employee-${employee.id}`}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={employee.avatar} alt={employee.firstName} />
                          <AvatarFallback>
                            {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">
                            {employee.firstName} {employee.lastName}
                          </div>
                          <div className="text-xs text-gray-500">{employee.role}</div>
                          <div className="flex gap-1 mt-1">
                            {employee.skills.slice(0, 2).map(skill => (
                              <Badge key={skill} variant="secondary" className="text-xs px-1 py-0">
                                {skill}
                              </Badge>
                            ))}
                            {employee.skills.length > 2 && (
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                +{employee.skills.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Daily Assignment Columns */}
                    {weekDays.map(day => {
                      const dayAssignments = employeeAssignments.filter(assignment =>
                        isSameDay(parseISO(assignment.date), day)
                      );
                      
                      return (
                        <td 
                          key={day.toISOString()} 
                          className={cn(
                            "border p-1 align-top transition-colors",
                            dragOverTarget === `${employee.id}-${format(day, 'yyyy-MM-dd')}` && 
                            "bg-green-100 border-green-300 border-2"
                          )}
                          onDrop={(e) => handleGridDrop(e, employee.id, day)}
                          onDragOver={(e) => handleGridDragOver(e, employee.id, day)}
                          onDragLeave={handleGridDragLeave}
                          data-testid={`cell-${employee.id}-${format(day, 'yyyy-MM-dd')}`}
                        >
                          <div className="space-y-1 min-h-16">
                            {dayAssignments.map(assignment => {
                              const shift = shifts.find(s => s.id === assignment.shiftId);
                              if (!shift) return null;

                              const status = getShiftStatus(shift);
                              const conflicts = getShiftConflicts(shift.id);
                              
                              return (
                                <div
                                  key={assignment.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, assignment)}
                                  onDragEnd={handleDragEnd}
                                  className={cn(
                                    "text-xs p-1 rounded cursor-move border transition-all duration-200",
                                    SHIFT_STATUS_COLORS[status],
                                    "text-white font-medium hover:shadow-lg",
                                    conflicts.length > 0 && "ring-1 ring-red-400",
                                    selectedShifts.has(shift.id) && "ring-1 ring-blue-400"
                                  )}
                                  onClick={() => handleShiftSelection(shift.id, !selectedShifts.has(shift.id))}
                                  data-testid={`grid-shift-${shift.id}`}
                                >
                                  <div className="truncate font-semibold">{shift.title}</div>
                                  <div className="flex justify-between items-center">
                                    <span>{assignment.startTime.slice(0,5)}-{assignment.endTime.slice(0,5)}</span>
                                    {conflicts.length > 0 && (
                                      <AlertTriangle className="w-3 h-3" />
                                    )}
                                  </div>
                                  {assignment.status === 'pending' && (
                                    <Badge variant="secondary" className="text-xs mt-1">
                                      In Attesa
                                    </Badge>
                                  )}
                                </div>
                              );
                            })}
                            
                            {/* Enhanced Drop Zone */}
                            {dayAssignments.length === 0 && (
                              <div className={cn(
                                "h-12 border-2 border-dashed rounded flex items-center justify-center text-xs transition-all duration-200",
                                dragOverTarget === `${employee.id}-${format(day, 'yyyy-MM-dd')}` 
                                  ? "border-green-400 bg-green-50 text-green-600" 
                                  : "border-gray-300 text-gray-400 hover:border-gray-400"
                              )}>
                                {dragOverTarget === `${employee.id}-${format(day, 'yyyy-MM-dd')}` 
                                  ? "Rilascia qui" 
                                  : "Trascina qui"
                                }
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {/* Weekly Hours Column */}
                    <td className="border p-2 text-center">
                      <div className={cn(
                        "font-semibold",
                        weeklyHours > employee.maxWeeklyHours ? "text-red-600" :
                        weeklyHours > employee.maxWeeklyHours * 0.9 ? "text-orange-600" : "text-green-600"
                      )}>
                        {weeklyHours}h
                      </div>
                      <div className="text-xs text-gray-500">
                        /{employee.maxWeeklyHours}h
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                        <div 
                          className={cn(
                            "h-1 rounded-full",
                            weeklyHours > employee.maxWeeklyHours ? "bg-red-500" :
                            weeklyHours > employee.maxWeeklyHours * 0.9 ? "bg-orange-500" : "bg-green-500"
                          )}
                          style={{ width: `${Math.min(100, (weeklyHours / employee.maxWeeklyHours) * 100)}%` }}
                        />
                      </div>
                    </td>

                    {/* Actions Column */}
                    <td className="border p-2 text-center">
                      <div className="flex justify-center space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEmployeeSelection(employee.id, !selectedEmployees.has(employee.id))}
                          data-testid={`button-select-employee-${employee.id}`}
                        >
                          <UserCheck className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewEmployeeDetails(employee.id)}
                          data-testid={`button-view-employee-${employee.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Unassigned Shifts Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
              Turni Non Assegnati ({unassignedShifts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {unassignedShifts.map(shift => {
                const conflicts = getShiftConflicts(shift.id);
                const status = getShiftStatus(shift);
                
                return (
                  <div
                    key={shift.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, { shiftId: shift.id })}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "p-3 border rounded-lg cursor-move hover:shadow-md transition-all duration-200",
                      "hover:scale-105 active:scale-95",
                      conflicts.length > 0 && "border-red-300 bg-red-50",
                      selectedShifts.has(shift.id) && "border-blue-500 bg-blue-50"
                    )}
                    onClick={() => handleShiftSelection(shift.id, !selectedShifts.has(shift.id))}
                    data-testid={`unassigned-shift-${shift.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm truncate">{shift.title}</h4>
                      <Badge className={cn("text-xs", SHIFT_STATUS_COLORS[status], "text-white")}>
                        {shift.assignedStaff}/{shift.requiredStaff}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>📅 {format(parseISO(shift.date), 'd MMM yyyy', { locale: it })}</div>
                      <div>🕒 {shift.startTime} - {shift.endTime}</div>
                      {shift.requiredSkills && shift.requiredSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {shift.requiredSkills.map(skill => (
                            <Badge key={skill} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {conflicts.length > 0 && (
                      <div className="text-red-600 text-xs mt-2 flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {conflicts.length} conflitto/i
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {unassignedShifts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                Tutti i turni sono stati assegnati!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

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

        {/* Enhanced Conflicts Panel */}
        {showConflicts && conflictDetection.length > 0 && (
          <Card className="mb-4 border-orange-200 bg-orange-50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-orange-800">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Sistema Rilevamento Conflitti
                <Badge variant="secondary" className="ml-2">
                  {conflictDetection.length} conflitto/i
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Conflict Summary by Severity */}
                <div className="flex gap-4 text-sm">
                  {['high', 'medium', 'low'].map(severity => {
                    const count = conflictDetection.filter(c => c.severity === severity).length;
                    if (count === 0) return null;
                    
                    return (
                      <div key={severity} className="flex items-center">
                        <span className={cn(
                          "w-3 h-3 rounded-full mr-2",
                          severity === 'high' ? 'bg-red-500' :
                          severity === 'medium' ? 'bg-orange-500' : 'bg-green-500'
                        )} />
                        <span className="font-medium">
                          {CONFLICT_SEVERITY_ICONS[severity as keyof typeof CONFLICT_SEVERITY_ICONS]} 
                          {severity === 'high' ? 'Critici' : 
                           severity === 'medium' ? 'Moderati' : 'Minori'}: {count}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Conflict Categories */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(
                    conflictDetection.reduce((acc, conflict) => {
                      if (!acc[conflict.type]) acc[conflict.type] = [];
                      acc[conflict.type].push(conflict);
                      return acc;
                    }, {} as Record<string, ConflictDetection[]>)
                  ).map(([type, conflicts]) => (
                    <div key={type} className={cn(
                      "p-3 rounded-lg border",
                      CONFLICT_COLORS[type as keyof typeof CONFLICT_COLORS]
                    )}>
                      <div className="font-semibold text-sm mb-1">
                        {type === 'overlap' ? '⚠️ Sovrapposizioni' :
                         type === 'overtime' ? '📊 Straordinari' :
                         type === 'skill_mismatch' ? '🎯 Skills Mancanti' :
                         type === 'availability' ? '📅 Disponibilità' :
                         type === 'rest_period' ? '⏰ Riposi' :
                         type === 'double_shift' ? '🔄 Doppi Turni' :
                         type === 'overstaffing' ? '👥 Sovraffollamento' :
                         type === 'understaffing' ? '📉 Sottodimensionamento' : type}
                        <Badge variant="outline" className="ml-2 text-xs">
                          {conflicts.length}
                        </Badge>
                      </div>
                      <div className="text-xs space-y-1">
                        {conflicts.slice(0, 2).map((conflict, index) => (
                          <div key={index} className="truncate">
                            {conflict.message}
                          </div>
                        ))}
                        {conflicts.length > 2 && (
                          <div className="text-xs opacity-75">
                            +{conflicts.length - 2} altri...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      // Auto-resolve conflicts where possible
                      toast({
                        title: "Risoluzione Automatica",
                        description: "Funzionalità in sviluppo - risoluzione automatica dei conflitti",
                      });
                    }}
                    data-testid="button-auto-resolve-conflicts"
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    Risoluzione Automatica
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      // Export conflict report
                      const report = conflictDetection.map(c => ({
                        severity: c.severity,
                        type: c.type,
                        message: c.message,
                        affectedShifts: c.affectedShifts,
                        affectedEmployees: c.affectedEmployees
                      }));
                      
                      const blob = new Blob([JSON.stringify(report, null, 2)], {
                        type: 'application/json'
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `conflict-report-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      
                      toast({
                        title: "Report Esportato",
                        description: "Report dei conflitti scaricato con successo",
                      });
                    }}
                    data-testid="button-export-conflicts"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Esporta Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
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
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Vista Grid - Gestione Assegnazioni
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderGridView()}
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}