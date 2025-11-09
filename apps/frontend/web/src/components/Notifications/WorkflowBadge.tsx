import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Workflow, Clock, CheckCircle } from 'lucide-react';
import { useLocation, useParams } from 'wouter';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface WorkflowBadgeProps {
  isMobile?: boolean;
}

export function WorkflowBadge({ isMobile = false }: WorkflowBadgeProps) {
  const [, navigate] = useLocation();
  const params = useParams();
  const currentTenant = (params as any).tenant || 'staging';
  const { toast } = useToast();
  
  // Fetch pending workflow count
  const { data: stats } = useQuery({
    queryKey: ['/api/crm/workflow-queue/stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 20000, // Consider data stale after 20 seconds
  });

  const pendingCount = stats?.totalPending || 0;

  // WebSocket subscription for real-time updates
  useEffect(() => {
    // Subscribe to workflow events for real-time updates
    const handleWorkflowUpdate = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (data.type === 'workflow.execution.requested' || 
          data.type === 'workflow.execution.approved' ||
          data.type === 'workflow.execution.rejected') {
        // Invalidate the stats query to refresh the count
        queryClient.invalidateQueries({ queryKey: ['/api/crm/workflow-queue/stats'] });
        
        // Show toast notification for new workflow requests
        if (data.type === 'workflow.execution.requested') {
          toast({
            title: 'Nuovo Workflow in Attesa',
            description: `${data.workflowName} richiede approvazione`,
            className: "bg-orange-50 border-orange-200",
          });
        }
      }
    };

    // Connect to WebSocket if available
    const ws = (window as any).__W3_WS_CONNECTION;
    if (ws) {
      ws.addEventListener('message', handleWorkflowUpdate);
      return () => {
        ws.removeEventListener('message', handleWorkflowUpdate);
      };
    }
  }, [toast]);

  // Navigate to workflow queue
  const handleClick = () => {
    navigate(`/${currentTenant}/crm/workflows`);
  };

  // Don't show badge if no pending workflows
  if (pendingCount === 0) {
    return null;
  }

  return (
    <Button
      onClick={handleClick}
      variant="ghost"
      size="sm"
      className={`
        relative windtre-glass-panel hover:bg-white/20 
        ${isMobile ? 'p-1.5' : 'px-3 py-2'}
        transition-all duration-200
      `}
      data-testid="workflow-badge"
    >
      <div className="flex items-center gap-2">
        <div className="relative">
          <Workflow 
            className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-windtre-orange`}
          />
          
          {/* Animated pulse effect for critical workflows */}
          {stats?.byPriority?.critical > 0 && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
        </div>
        
        {!isMobile && (
          <span className="text-sm font-medium text-gray-700">
            Workflow
          </span>
        )}
        
        {/* Pending count badge */}
        <Badge 
          variant="outline" 
          className={`
            ${stats?.byPriority?.critical > 0 
              ? 'bg-red-100 text-red-700 border-red-300' 
              : stats?.byPriority?.high > 0
              ? 'bg-orange-100 text-orange-700 border-orange-300'
              : 'bg-blue-100 text-blue-700 border-blue-300'
            }
            font-bold ${isMobile ? 'text-xs px-1.5 py-0' : 'text-sm'}
          `}
        >
          {pendingCount > 99 ? '99+' : pendingCount}
        </Badge>
      </div>
      
      {/* Hover tooltip - desktop only */}
      {!isMobile && (
        <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap">
            <div className="flex flex-col gap-1">
              <div className="font-semibold">Workflow in Attesa</div>
              {stats && (
                <>
                  {stats.byPriority?.critical > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Critici: {stats.byPriority.critical}</span>
                    </div>
                  )}
                  {stats.byPriority?.high > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>Alta priorità: {stats.byPriority.high}</span>
                    </div>
                  )}
                  {stats.byPriority?.medium > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Media priorità: {stats.byPriority.medium}</span>
                    </div>
                  )}
                  {stats.byPriority?.low > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      <span>Bassa priorità: {stats.byPriority.low}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
          </div>
        </div>
      )}
    </Button>
  );
}