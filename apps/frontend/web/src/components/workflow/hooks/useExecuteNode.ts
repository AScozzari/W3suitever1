/**
 * 🎯 USE EXECUTE NODE HOOK
 * 
 * React Query hook per eseguire un singolo nodo in isolation.
 * Utilizzato dal Node Inspector per testare/debuggare nodi senza eseguire l'intero workflow.
 * 
 * Endpoint: POST /api/workflows/nodes/:nodeId/test-execute
 */

import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

/**
 * Input data format per node execution
 */
export interface NodeExecutionInput {
  nodeData: {
    id: string;
    type: string;
    category?: string;
    config?: Record<string, unknown>;
  };
  inputData?: Record<string, unknown>;
}

/**
 * Output format matching WorkflowItem structure
 */
export interface NodeExecutionResult {
  execution: {
    nodeId: string;
    nodeType: string;
    category: string;
    status: 'success' | 'error' | 'warning';
    durationMs: number;
    startedAt: string;
    completedAt: string;
    inputData: Record<string, unknown>;
    outputData: Record<string, unknown>;
    messages: string[];
    warnings: string[];
    config?: Record<string, unknown>;
  };
  items: Record<string, unknown>[]; // n8n-style items array
  metadata: {
    executionTime: number;
    itemCount: number;
    nodeId: string;
    timestamp: string;
  };
}

/**
 * Hook per eseguire un singolo nodo
 */
export function useExecuteNode(nodeId: string) {
  return useMutation({
    mutationKey: ['execute-node', nodeId],
    mutationFn: async (input: NodeExecutionInput): Promise<NodeExecutionResult> => {
      const response = await apiRequest<NodeExecutionResult>(
        `/api/workflows/nodes/${nodeId}/test-execute`,
        {
          method: 'POST',
          body: input
        }
      );
      return response;
    }
  });
}
