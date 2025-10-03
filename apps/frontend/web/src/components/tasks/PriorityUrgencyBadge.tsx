import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, Flag, Zap } from 'lucide-react';

interface PriorityUrgencyBadgeProps {
  priority: 'low' | 'medium' | 'high';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  size?: 'sm' | 'md';
  showLabels?: boolean;
  className?: string;
}

const priorityConfig = {
  low: { label: 'Bassa', icon: Flag, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  medium: { label: 'Media', icon: Flag, color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  high: { label: 'Alta', icon: AlertTriangle, color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
};

const urgencyConfig = {
  low: { label: 'Non urgente', icon: Zap, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
  medium: { label: 'Moderata', icon: Zap, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  high: { label: 'Urgente', icon: Zap, color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  critical: { label: 'Critica', icon: Zap, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
};

const getCombinedColor = (priority: string, urgency: string) => {
  if (urgency === 'critical' || (urgency === 'high' && priority === 'high')) {
    return {
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-300',
      label: 'Critico',
    };
  }
  
  if (urgency === 'high' || priority === 'high') {
    return {
      color: 'text-orange-700',
      bg: 'bg-orange-50',
      border: 'border-orange-300',
      label: 'Alto',
    };
  }
  
  if (urgency === 'medium' || priority === 'medium') {
    return {
      color: 'text-yellow-700',
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      label: 'Medio',
    };
  }
  
  return {
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-300',
    label: 'Basso',
  };
};

export function PriorityUrgencyBadge({
  priority,
  urgency,
  size = 'md',
  showLabels = true,
  className
}: PriorityUrgencyBadgeProps) {
  const combined = getCombinedColor(priority, urgency);
  const PriorityIcon = priorityConfig[priority].icon;
  const UrgencyIcon = urgencyConfig[urgency].icon;
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-sm px-2 py-1 gap-1.5',
  };

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  if (!showLabels) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <div
          data-testid="badge-priority"
          className={cn(
            'inline-flex items-center rounded border',
            sizeClasses[size],
            priorityConfig[priority].bg,
            priorityConfig[priority].color,
            priorityConfig[priority].border
          )}
        >
          <PriorityIcon className={iconSize} />
        </div>
        <div
          data-testid="badge-urgency"
          className={cn(
            'inline-flex items-center rounded border',
            sizeClasses[size],
            urgencyConfig[urgency].bg,
            urgencyConfig[urgency].color,
            urgencyConfig[urgency].border
          )}
        >
          <UrgencyIcon className={iconSize} />
        </div>
      </div>
    );
  }

  return (
    <Badge
      data-testid="badge-priority-urgency"
      variant="outline"
      className={cn(
        'font-medium border',
        sizeClasses[size],
        combined.bg,
        combined.color,
        combined.border,
        className
      )}
    >
      <AlertTriangle className={cn(iconSize, 'mr-1')} />
      {combined.label}
    </Badge>
  );
}
