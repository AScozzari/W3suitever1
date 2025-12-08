import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ExecutionStatusBadge } from './ExecutionStatusBadge';
import { useWorkflowExecutions, useRetryStep } from '@/hooks/useAsyncWorkflows';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Clock, CheckCircle2, XCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface WorkflowExecutionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceId: string | null;
  instanceName?: string;
}

export function WorkflowExecutionDrawer({ 
  open, 
  onOpenChange, 
  instanceId, 
  instanceName = 'Workflow' 
}: WorkflowExecutionDrawerProps) {
  const { toast } = useToast();
  const { data: executions, isLoading } = useWorkflowExecutions(instanceId);
  const retryMutation = useRetryStep();

  const handleRetry = (stepId: string) => {
    if (!instanceId) return;

    retryMutation.mutate(
      { instanceId, stepId },
      {
        onSuccess: () => {
          toast({
            title: 'Retry Enqueued',
            description: 'Step execution retry has been queued successfully',
          });
        },
        onError: (error: any) => {
          toast({
            title: 'Retry Failed',
            description: error.message || 'Failed to enqueue retry',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl bg-white/95 backdrop-blur-xl border-white/20">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ChevronRight className="h-5 w-5 text-windtre-orange" />
            Step Executions
          </SheetTitle>
          <SheetDescription>
            {instanceName} - Workflow execution details
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading executions...</div>
            </div>
          ) : !executions || executions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Executions Found</h3>
              <p className="text-gray-600 text-center">
                This workflow instance has not been executed yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {executions.map((execution, index) => (
                <Card 
                  key={execution.id} 
                  className="p-4 windtre-glass-panel border-white/20"
                  data-testid={`execution-${execution.stepId}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {execution.stepName || execution.stepId}
                        </span>
                        <ExecutionStatusBadge status={execution.status} />
                      </div>
                      <div className="text-sm text-gray-600">
                        Step ID: {execution.stepId}
                      </div>
                    </div>
                    {execution.status === 'failed' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-windtre-orange text-windtre-orange hover:bg-windtre-orange/10"
                            disabled={retryMutation.isPending}
                            data-testid={`button-retry-${execution.stepId}`}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Retry
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="windtre-glass-panel border-white/20">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Step Retry</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to retry this failed step? This will create a new execution attempt.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRetry(execution.stepId)}
                              className="bg-windtre-orange hover:bg-windtre-orange-dark text-white"
                            >
                              Retry Step
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>Attempt #{execution.attemptNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{formatDuration(execution.durationMs)}</span>
                    </div>
                    <div className="text-gray-600">
                      Retries: {execution.retryCount}/{execution.maxRetries}
                    </div>
                    {execution.startedAt && (
                      <div className="text-gray-600">
                        {formatDistanceToNow(new Date(execution.startedAt), { 
                          addSuffix: true,
                          locale: it 
                        })}
                      </div>
                    )}
                  </div>

                  {execution.status === 'failed' && execution.errorDetails && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium text-red-900 text-sm mb-1">Error Details</div>
                          <div className="text-sm text-red-700">
                            {execution.errorDetails.message || 'Unknown error'}
                          </div>
                          {execution.errorDetails.code && (
                            <div className="text-xs text-red-600 mt-1">
                              Code: {execution.errorDetails.code}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {execution.status === 'completed' && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-900 font-medium">Execution successful</span>
                      </div>
                    </div>
                  )}

                  {execution.compensationExecuted && (
                    <div className="mt-3">
                      <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                        Compensation Executed (Rollback)
                      </Badge>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
