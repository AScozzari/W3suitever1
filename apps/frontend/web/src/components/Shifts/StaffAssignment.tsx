import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, User, Clock, Calendar, AlertTriangle, Check, X, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: string;
  skills: string[];
  weeklyHours: number;
  maxWeeklyHours: number;
  preferredShifts?: string[];
  availability: 'available' | 'leave' | 'training' | 'busy';
}

interface Shift {
  id: string;
  name: string;
  date: string;
  startTime: string | Date;
  endTime: string | Date;
  requiredStaff: number;
  assignedUsers: string[];
  requiredSkills?: string[];
}

interface Props {
  storeId: string;
  selectedDate: Date;
  shifts: Shift[];
  availability: any[];
  onAssign: (shiftId: string, userId: string) => Promise<void>;
  onUnassign: (shiftId: string, userId: string) => Promise<void>;
}

const MOCK_STAFF: StaffMember[] = [
  {
    id: '1',
    firstName: 'Mario',
    lastName: 'Rossi',
    role: 'Cassiere',
    skills: ['cassa', 'customer-service'],
    weeklyHours: 32,
    maxWeeklyHours: 40,
    preferredShifts: ['morning'],
    availability: 'available'
  },
  {
    id: '2',
    firstName: 'Laura',
    lastName: 'Bianchi',
    role: 'Supervisore',
    skills: ['cassa', 'gestione-team', 'inventario'],
    weeklyHours: 38,
    maxWeeklyHours: 40,
    availability: 'available'
  },
  {
    id: '3',
    firstName: 'Giuseppe',
    lastName: 'Verdi',
    role: 'Magazziniere',
    skills: ['inventario', 'logistica'],
    weeklyHours: 20,
    maxWeeklyHours: 40,
    availability: 'training'
  },
  {
    id: '4',
    firstName: 'Anna',
    lastName: 'Neri',
    role: 'Cassiere',
    skills: ['cassa'],
    weeklyHours: 35,
    maxWeeklyHours: 40,
    availability: 'leave'
  }
];

export default function StaffAssignment({
  storeId,
  selectedDate,
  shifts,
  availability,
  onAssign,
  onUnassign
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'all'>('available');
  const { toast } = useToast();
  
  // Filter staff based on search and availability
  const filteredStaff = useMemo(() => {
    return MOCK_STAFF.filter(staff => {
      const matchesSearch = searchQuery === '' || 
        `${staff.firstName} ${staff.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        staff.role.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesAvailability = activeTab === 'all' || staff.availability === 'available';
      
      return matchesSearch && matchesAvailability;
    });
  }, [searchQuery, activeTab]);
  
  // Get current shift details
  const currentShift = shifts.find(s => s.id === selectedShift);
  
  // Check if staff member is assigned to selected shift
  const isAssignedToShift = (staffId: string) => {
    if (!currentShift) return false;
    return currentShift.assignedUsers.includes(staffId);
  };
  
  // Check if staff member has required skills
  const hasRequiredSkills = (staff: StaffMember) => {
    if (!currentShift?.requiredSkills || currentShift.requiredSkills.length === 0) {
      return true;
    }
    return currentShift.requiredSkills.every(skill => staff.skills.includes(skill));
  };
  
  // Calculate overtime risk
  const getOvertimeRisk = (staff: StaffMember) => {
    const remaining = staff.maxWeeklyHours - staff.weeklyHours;
    if (remaining <= 0) return 'high';
    if (remaining <= 8) return 'medium';
    return 'low';
  };
  
  const handleToggleAssignment = async (staffId: string) => {
    if (!currentShift) {
      toast({
        title: "Seleziona un turno",
        description: "Devi selezionare un turno prima di assegnare il personale",
        variant: "destructive"
      });
      return;
    }
    
    try {
      if (isAssignedToShift(staffId)) {
        await onUnassign(currentShift.id, staffId);
        toast({
          title: "Dipendente rimosso",
          description: "Il dipendente è stato rimosso dal turno"
        });
      } else {
        await onAssign(currentShift.id, staffId);
        toast({
          title: "Dipendente assegnato",
          description: "Il dipendente è stato assegnato al turno"
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Operazione fallita",
        variant: "destructive"
      });
    }
  };
  
  const renderStaffCard = (staff: StaffMember) => {
    const overtimeRisk = getOvertimeRisk(staff);
    const hasSkills = hasRequiredSkills(staff);
    const isAssigned = isAssignedToShift(staff.id);
    
    return (
      <Card
        key={staff.id}
        className={cn(
          "cursor-pointer transition-all hover:shadow-md",
          isAssigned && "ring-2 ring-orange-400",
          !hasSkills && "opacity-60"
        )}
        onClick={() => handleToggleAssignment(staff.id)}
        data-testid={`staff-${staff.id}`}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={staff.avatar} />
                <AvatarFallback>
                  {staff.firstName[0]}{staff.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">
                  {staff.firstName} {staff.lastName}
                </div>
                <div className="text-xs text-muted-foreground">{staff.role}</div>
              </div>
            </div>
            
            {isAssigned && (
              <Badge className="bg-green-100 text-green-700">
                <Check className="h-3 w-3 mr-1" />
                Assegnato
              </Badge>
            )}
          </div>
          
          <div className="mt-3 space-y-2">
            {/* Skills */}
            <div className="flex gap-1 flex-wrap">
              {staff.skills.slice(0, 3).map(skill => (
                <Badge
                  key={skill}
                  variant="outline"
                  className={cn(
                    "text-xs",
                    currentShift?.requiredSkills?.includes(skill) && "bg-orange-100 border-orange-300"
                  )}
                >
                  {skill}
                </Badge>
              ))}
              {staff.skills.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{staff.skills.length - 3}
                </Badge>
              )}
            </div>
            
            {/* Hours and Availability */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>{staff.weeklyHours}/{staff.maxWeeklyHours}h</span>
                {overtimeRisk === 'high' && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Rischio straordinario</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {overtimeRisk === 'medium' && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Vicino al limite ore</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              
              <Badge
                variant={staff.availability === 'available' ? 'default' : 'secondary'}
                className={cn(
                  "text-xs",
                  staff.availability === 'available' && "bg-green-100 text-green-700",
                  staff.availability === 'leave' && "bg-red-100 text-red-700",
                  staff.availability === 'training' && "bg-blue-100 text-blue-700",
                  staff.availability === 'busy' && "bg-gray-100 text-gray-700"
                )}
              >
                {staff.availability === 'available' && 'Disponibile'}
                {staff.availability === 'leave' && 'Ferie'}
                {staff.availability === 'training' && 'Formazione'}
                {staff.availability === 'busy' && 'Occupato'}
              </Badge>
            </div>
            
            {!hasSkills && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded text-xs">
                <AlertTriangle className="h-3 w-3 inline mr-1 text-yellow-600" />
                Skills mancanti per questo turno
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Assegnazione Staff</CardTitle>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca dipendente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            data-testid="input-search-staff"
          />
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Shift Selector */}
        <div className="px-4 pb-4">
          <label className="text-sm font-medium">Seleziona Turno</label>
          <ScrollArea className="h-24 mt-2 rounded border">
            <div className="p-2 space-y-2">
              {shifts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nessun turno per questa data
                </p>
              ) : (
                shifts.map(shift => (
                  <div
                    key={shift.id}
                    className={cn(
                      "p-2 rounded cursor-pointer transition-colors",
                      selectedShift === shift.id 
                        ? "bg-orange-100 dark:bg-orange-900/30" 
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                    onClick={() => setSelectedShift(shift.id)}
                    data-testid={`shift-selector-${shift.id}`}
                  >
                    <div className="font-medium text-sm">{shift.name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(shift.startTime).toLocaleTimeString('it-IT', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                      {' - '}
                      {new Date(shift.endTime).toLocaleTimeString('it-IT', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                      <span className="ml-2">
                        {shift.assignedUsers.length}/{shift.requiredStaff} assegnati
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
        
        {/* Staff Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full rounded-none">
            <TabsTrigger value="available" className="flex-1">
              Disponibili ({filteredStaff.filter(s => s.availability === 'available').length})
            </TabsTrigger>
            <TabsTrigger value="all" className="flex-1">
              Tutti ({MOCK_STAFF.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="available" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="p-4 space-y-3">
                {filteredStaff.filter(s => s.availability === 'available').map(renderStaffCard)}
                {filteredStaff.filter(s => s.availability === 'available').length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nessun dipendente disponibile
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="all" className="mt-0">
            <ScrollArea className="h-[400px]">
              <div className="p-4 space-y-3">
                {filteredStaff.map(renderStaffCard)}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}