import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useIdleDetection } from '@/contexts/IdleDetectionContext';

export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
}

export interface StepExecution {
  id: string;
  instanceId: string;
  stepId: string;
  stepName: string | null;
  idempotencyKey: string;
  attemptNumber: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'compensated';
  inputData: Record<string, any>;
  outputData: Record<string, any>;
  errorDetails: Record<string, any>;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string | null;
  compensationExecuted: boolean;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export function useQueueMetrics() {
  const { isIdle } = useIdleDetection();
  
  return useQuery<QueueMetrics>({
    queryKey: ['/api/workflows/queue/metrics'],
    refetchInterval: isIdle ? false : 5000,
  });
}

export function useWorkflowExecutions(instanceId: string | null) {
  const { isIdle } = useIdleDetection();
  
  return useQuery<StepExecution[]>({
    queryKey: ['/api/workflows/instances', instanceId, 'executions'],
    enabled: !!instanceId,
    refetchInterval: isIdle ? false : 3000,
  });
}

export function useExecuteWorkflow() {
  return useMutation({
    mutationFn: async (instanceId: string) => {
      return await apiRequest(`/api/workflows/instances/${instanceId}/execute`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows/instances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workflows/queue/metrics'] });
    }
  });
}

export function useRetryStep() {
  return useMutation({
    mutationFn: async ({ instanceId, stepId }: { instanceId: string; stepId: string }) => {
      return await apiRequest(`/api/workflows/instances/${instanceId}/steps/${stepId}/retry`, {
        method: 'POST'
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/workflows/instances', variables.instanceId, 'executions'] 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/workflows/queue/metrics'] });
    }
  });
}
