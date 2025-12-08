import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Clock, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  UserPlus, 
  MessageSquare,
  FileText,
  GitBranch,
  Activity,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EntityLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  previousStatus?: string | null;
  newStatus?: string | null;
  changes?: Record<string, any> | null;
  userId?: string | null;
  userEmail?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface ActivityFeedProps {
  taskId: string;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'created':
      return <FileText className="h-4 w-4 text-green-600" />;
    case 'updated':
      return <Edit className="h-4 w-4 text-blue-600" />;
    case 'deleted':
      return <Trash2 className="h-4 w-4 text-red-600" />;
    case 'status_changed':
      return <CheckCircle2 className="h-4 w-4 text-purple-600" />;
    case 'assigned':
      return <UserPlus className="h-4 w-4 text-indigo-600" />;
    case 'commented':
      return <MessageSquare className="h-4 w-4 text-amber-600" />;
    case 'dependency_added':
    case 'dependency_removed':
      return <GitBranch className="h-4 w-4 text-teal-600" />;
    default:
      return <Activity className="h-4 w-4 text-gray-600" />;
  }
};

const getActionLabel = (action: string, log: EntityLog): string => {
  switch (action) {
    case 'created':
      return 'ha creato il task';
    case 'updated':
      return 'ha aggiornato il task';
    case 'deleted':
      return 'ha eliminato il task';
    case 'status_changed':
      return `ha cambiato lo stato da "${log.previousStatus}" a "${log.newStatus}"`;
    case 'assigned':
      return 'ha assegnato il task';
    case 'commented':
      return 'ha commentato';
    case 'dependency_added':
      return 'ha aggiunto una dipendenza';
    case 'dependency_removed':
      return 'ha rimosso una dipendenza';
    default:
      return action;
  }
};

const formatChanges = (changes: Record<string, any> | null | undefined): string | null => {
  if (!changes || Object.keys(changes).length === 0) return null;
  
  const changesList = Object.entries(changes).map(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      const { from, to } = value;
      return `${key}: ${from} → ${to}`;
    }
    return `${key}: ${value}`;
  });
  
  return changesList.join(', ');
};

export function ActivityFeed({ taskId }: ActivityFeedProps) {
  const { data: activityLogs = [], isLoading, isError, refetch } = useQuery<EntityLog[]>({
    queryKey: ['/api/tasks', taskId, 'activity'],
    queryFn: () => apiRequest(`/api/tasks/${taskId}/activity`),
    refetchInterval: 30000, // Auto-refetch every 30s for real-time updates
    refetchOnWindowFocus: true, // Refetch when tab becomes visible
  });

  // Subscribe to manual invalidation events (e.g., when task is updated)
  useEffect(() => {
    const handleTaskUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId, 'activity'] });
    };

    // Listen for custom task update events
    window.addEventListener(`task-updated-${taskId}`, handleTaskUpdate);

    return () => {
      window.removeEventListener(`task-updated-${taskId}`, handleTaskUpdate);
    };
  }, [taskId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
        <p className="text-sm text-gray-600 mb-3">Errore caricamento attività</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          data-testid="button-retry-activity"
        >
          Riprova
        </Button>
      </div>
    );
  }

  if (activityLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Activity className="h-8 w-8 text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">Nessuna attività registrata</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="activity-feed">
      <div className="relative">
        {activityLogs.map((log, index) => (
          <div 
            key={log.id} 
            className="relative flex gap-3 pb-4"
            data-testid={`activity-item-${log.id}`}
          >
            {/* Timeline line */}
            {index < activityLogs.length - 1 && (
              <div className="absolute left-[11px] top-6 bottom-0 w-px bg-gray-200" />
            )}
            
            {/* Icon */}
            <div className="relative z-10 flex-shrink-0 mt-1">
              <div className="w-6 h-6 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                {getActionIcon(log.action)}
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{log.userEmail || 'Sistema'}</span>
                    {' '}
                    <span className="text-gray-600">{getActionLabel(log.action, log)}</span>
                  </p>
                  
                  {log.notes && (
                    <p className="text-sm text-gray-600 mt-1">{log.notes}</p>
                  )}
                  
                  {log.changes && (
                    <p className="text-xs text-gray-500 mt-1 font-mono">
                      {formatChanges(log.changes)}
                    </p>
                  )}
                </div>
                
                <div className="flex-shrink-0">
                  <time 
                    className="text-xs text-gray-500"
                    dateTime={log.createdAt}
                    title={format(new Date(log.createdAt), "PPpp", { locale: it })}
                  >
                    {format(new Date(log.createdAt), "d MMM HH:mm", { locale: it })}
                  </time>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
