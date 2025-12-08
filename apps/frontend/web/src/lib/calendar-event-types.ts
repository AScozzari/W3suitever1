import { Calendar, Palmtree, GraduationCap, AlertTriangle, Users, Clock, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface CalendarEventType {
  id: string;
  label: string;
  labelPlural: string;
  tooltip: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const CALENDAR_EVENT_TYPES: Record<string, CalendarEventType> = {
  shift_planning: {
    id: 'shift_planning',
    label: 'Pianificazione Turno',
    labelPlural: 'Pianificazioni Turni',
    tooltip: 'Turni pianificati',
    icon: Calendar,
    color: 'hsl(25, 95%, 53%)',
    bgColor: 'hsl(25, 95%, 95%)',
    borderColor: 'hsl(25, 95%, 53%)',
  },
  leave: {
    id: 'leave',
    label: 'Ferie/Permesso',
    labelPlural: 'Ferie/Permessi',
    tooltip: 'Ferie e permessi',
    icon: Palmtree,
    color: 'hsl(217, 91%, 60%)',
    bgColor: 'hsl(217, 91%, 95%)',
    borderColor: 'hsl(217, 91%, 60%)',
  },
  training: {
    id: 'training',
    label: 'Formazione',
    labelPlural: 'Formazioni',
    tooltip: 'Sessioni formative',
    icon: GraduationCap,
    color: 'hsl(142, 76%, 36%)',
    bgColor: 'hsl(142, 76%, 95%)',
    borderColor: 'hsl(142, 76%, 36%)',
  },
  deadline: {
    id: 'deadline',
    label: 'Scadenza',
    labelPlural: 'Scadenze',
    tooltip: 'Scadenze documenti',
    icon: AlertTriangle,
    color: 'hsl(0, 84%, 60%)',
    bgColor: 'hsl(0, 84%, 95%)',
    borderColor: 'hsl(0, 84%, 60%)',
  },
  meeting: {
    id: 'meeting',
    label: 'Riunione',
    labelPlural: 'Riunioni',
    tooltip: 'Riunioni e meeting',
    icon: Users,
    color: 'hsl(280, 70%, 50%)',
    bgColor: 'hsl(280, 70%, 95%)',
    borderColor: 'hsl(280, 70%, 50%)',
  },
  overtime: {
    id: 'overtime',
    label: 'Straordinario',
    labelPlural: 'Straordinari',
    tooltip: 'Ore straordinarie',
    icon: Clock,
    color: 'hsl(45, 93%, 47%)',
    bgColor: 'hsl(45, 93%, 95%)',
    borderColor: 'hsl(45, 93%, 47%)',
  },
  document: {
    id: 'document',
    label: 'Documento',
    labelPlural: 'Documenti',
    tooltip: 'Documenti HR',
    icon: FileText,
    color: 'hsl(200, 80%, 50%)',
    bgColor: 'hsl(200, 80%, 95%)',
    borderColor: 'hsl(200, 80%, 50%)',
  },
};

export function getEventTypeConfig(eventType: string): CalendarEventType {
  return CALENDAR_EVENT_TYPES[eventType] || CALENDAR_EVENT_TYPES.shift_planning;
}

export function mapBackendEventToType(backendType: string): string {
  const mapping: Record<string, string> = {
    shift: 'shift_planning',
    shift_assignment: 'shift_planning',
    planned_shift: 'shift_planning',
    store_assignment: 'shift_planning',
    time_off: 'leave',
    leave: 'leave',
    sick_leave: 'leave',
    training: 'training',
    deadline: 'deadline',
    meeting: 'meeting',
    overtime: 'overtime',
    document: 'document',
  };
  return mapping[backendType] || 'shift_planning';
}
