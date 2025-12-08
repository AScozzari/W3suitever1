import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Clock, AlertTriangle } from 'lucide-react';

interface ExecutionStatusBadgeProps {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'compensated';
  showIcon?: boolean;
}

export function ExecutionStatusBadge({ status, showIcon = true }: ExecutionStatusBadgeProps) {
  const statusConfig = {
    pending: {
      label: 'Pending',
      color: 'bg-gray-100 text-gray-800 border-gray-300',
      icon: Clock,
    },
    running: {
      label: 'Running',
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: Loader2,
    },
    completed: {
      label: 'Completed',
      color: 'bg-green-100 text-green-800 border-green-300',
      icon: CheckCircle2,
    },
    failed: {
      label: 'Failed',
      color: 'bg-red-100 text-red-800 border-red-300',
      icon: XCircle,
    },
    compensated: {
      label: 'Rolled Back',
      color: 'bg-purple-100 text-purple-800 border-purple-300',
      icon: AlertTriangle,
    },
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={`${config.color} font-medium`}
      data-testid={`status-badge-${status}`}
    >
      {showIcon && (
        <Icon className={`h-3 w-3 mr-1 ${status === 'running' ? 'animate-spin' : ''}`} />
      )}
      {config.label}
    </Badge>
  );
}
