/**
 * Workflow Test Result Dialog
 * 
 * Advanced step-by-step debug view for workflow test execution
 * Shows detailed input/output, timing, context, messages, and errors
 */

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogAction
} from '@/components/ui/alert-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Copy,
  Download,
  ChevronRight
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface StepResult {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  executorId: string;
  status: 'success' | 'warning' | 'error';
  durationMs: number;
  startedAt: string;
  completedAt: string;
  inputData: Record<string, any>;
  outputData: Record<string, any> | null;
  contextSnapshot: Record<string, any>;
  messages: string[];
  warnings: string[];
  config: Record<string, any>;
  stack?: string;
}

interface TestResult {
  success: boolean;
  data: {
    status: string;
    executionTime: number;
    totalSteps: number;
    executedSteps: number;
    startNodeId?: string;
    failedNodeId?: string;
    failureReason?: string;
    failureStack?: string;
    executionResults: StepResult[];
    workflowContext?: Record<string, any>;
  };
  message?: string;
  error?: string;
}

interface WorkflowTestResultDialogProps {
  result: TestResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkflowTestResultDialog({
  result,
  open,
  onOpenChange
}: WorkflowTestResultDialogProps) {
  const { toast } = useToast();
  const [debugMode, setDebugMode] = useState(false);

  if (!result) return null;

  const isSuccess = result.success && result.data?.status === 'success';
  const hasWarnings = result.data?.executionResults?.some(step => step.status === 'warning');

  // Status icon component
  const StatusIcon = ({ status }: { status: 'success' | 'warning' | 'error' }) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  // Copy full result to clipboard
  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    toast({
      title: 'Copiato!',
      description: 'Risultato test copiato negli appunti',
    });
  };

  // Download full result as JSON
  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-test-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: 'Download avviato',
      description: 'Report test scaricato con successo',
    });
  };

  // Format JSON for display
  const formatJSON = (data: any): string => {
    return JSON.stringify(data, null, 2);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-4xl max-h-[90vh] bg-white" data-testid="workflow-test-result-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {isSuccess ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <span className="text-green-700">
                    {hasWarnings ? '⚠️ Test Completato con Warning' : '✓ Test Completato con Successo'}
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-6 w-6 text-red-600" />
                  <span className="text-red-700">✗ Test Fallito</span>
                </>
              )}
            </div>
            
            {/* Debug Mode Toggle */}
            <div className="flex items-center gap-2">
              <Label htmlFor="debug-mode" className="text-sm text-gray-600">
                Debug Mode
              </Label>
              <Switch
                id="debug-mode"
                checked={debugMode}
                onCheckedChange={setDebugMode}
                data-testid="toggle-debug-mode"
              />
            </div>
          </AlertDialogTitle>
          
          <AlertDialogDescription asChild>
            <div className="space-y-4 mt-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className={`${isSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} p-4 rounded-lg border`}>
                  <div className="text-sm text-gray-600 mb-1">Tempo Totale</div>
                  <div className={`text-2xl font-bold ${isSuccess ? 'text-green-700' : 'text-red-700'}`}>
                    {result.data?.executionTime || 0}ms
                  </div>
                </div>
                <div className={`${isSuccess ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'} p-4 rounded-lg border`}>
                  <div className="text-sm text-gray-600 mb-1">Step Eseguiti</div>
                  <div className={`text-2xl font-bold ${isSuccess ? 'text-green-700' : 'text-orange-700'}`}>
                    {result.data?.executedSteps || 0} / {result.data?.totalSteps || 0}
                  </div>
                </div>
                <div className="bg-blue-50 border-blue-200 p-4 rounded-lg border">
                  <div className="text-sm text-gray-600 mb-1">Status</div>
                  <Badge variant={isSuccess ? 'default' : 'destructive'} className="text-sm">
                    {result.data?.status?.toUpperCase() || 'ERROR'}
                  </Badge>
                </div>
              </div>

              {/* Error Summary */}
              {!isSuccess && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      {result.data?.failedNodeId ? (
                        <>
                          <div className="text-sm font-semibold text-red-700 mb-1">
                            Errore al Node: {result.data.failedNodeId}
                          </div>
                          <div className="text-sm text-red-600">
                            {result.data.failureReason || result.error || 'Unknown error'}
                          </div>
                          {debugMode && result.data?.failureStack && (
                            <div className="mt-2 text-xs text-red-600 font-mono bg-red-100 p-2 rounded">
                              <div className="font-semibold mb-1">Stack Trace:</div>
                              <pre className="whitespace-pre-wrap">{result.data.failureStack}</pre>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-semibold text-red-700 mb-1">
                            Test Execution Failed
                          </div>
                          <div className="text-sm text-red-600">
                            {result.error || result.message || 'An error occurred during test execution'}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step-by-Step Results */}
              {result.data?.executionResults && result.data.executionResults.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Execution Path ({result.data.executionResults.length} steps)
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyJSON}
                        data-testid="button-copy-json"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy JSON
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadJSON}
                        data-testid="button-download-json"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className="h-[400px] border rounded-lg p-4">
                    <Accordion type="multiple" className="space-y-2">
                      {(result.data?.executionResults || []).map((step, idx) => (
                        <AccordionItem
                          key={step.nodeId}
                          value={step.nodeId}
                          className={`border rounded-lg ${
                            step.status === 'success' ? 'border-green-200 bg-green-50/30' :
                            step.status === 'warning' ? 'border-amber-200 bg-amber-50/30' :
                            'border-red-200 bg-red-50/30'
                          }`}
                        >
                          <AccordionTrigger className="px-4 py-3 hover:no-underline">
                            <div className="flex items-center gap-3 w-full">
                              <StatusIcon status={step.status} />
                              <div className="flex-1 text-left">
                                <div className="font-semibold text-sm">
                                  Step {idx + 1}: {step.nodeName}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {step.nodeType}
                                  </Badge>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {step.durationMs}ms
                                  </span>
                                </div>
                              </div>
                              {step.warnings && step.warnings.length > 0 && (
                                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                                  {step.warnings.length} warning{step.warnings.length > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>
                          
                          <AccordionContent className="px-4 pb-4 pt-2 space-y-3">
                            {/* Messages */}
                            {step.messages && step.messages.length > 0 && (
                              <div className="bg-blue-50 border border-blue-200 rounded p-2">
                                <div className="text-xs font-semibold text-blue-900 mb-1">
                                  💬 Messages:
                                </div>
                                <ul className="text-xs text-blue-800 space-y-0.5">
                                  {step.messages.map((msg, i) => (
                                    <li key={i} className="flex items-start gap-1">
                                      <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                      <span>{msg}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Warnings */}
                            {step.warnings && step.warnings.length > 0 && (
                              <div className="bg-amber-50 border border-amber-200 rounded p-2">
                                <div className="text-xs font-semibold text-amber-900 mb-1">
                                  ⚠️ Warnings:
                                </div>
                                <ul className="text-xs text-amber-800 space-y-0.5">
                                  {step.warnings.map((warn, i) => (
                                    <li key={i} className="flex items-start gap-1">
                                      <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                      <span>{warn}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Error Stack */}
                            {step.status === 'error' && step.stack && debugMode && (
                              <div className="bg-red-50 border border-red-200 rounded p-2">
                                <div className="text-xs font-semibold text-red-900 mb-1">
                                  📜 Stack Trace:
                                </div>
                                <pre className="text-xs text-red-800 font-mono whitespace-pre-wrap">
                                  {step.stack}
                                </pre>
                              </div>
                            )}

                            {/* Debug Mode: Input Data */}
                            {debugMode && step.inputData && (
                              <div className="bg-gray-50 border border-gray-200 rounded p-2">
                                <div className="text-xs font-semibold text-gray-900 mb-1">
                                  📥 Input Data:
                                </div>
                                <pre className="text-xs text-gray-700 font-mono overflow-x-auto whitespace-pre-wrap">
                                  {formatJSON(step.inputData)}
                                </pre>
                              </div>
                            )}

                            {/* Debug Mode: Output Data */}
                            {debugMode && step.outputData && (
                              <div className="bg-gray-50 border border-gray-200 rounded p-2">
                                <div className="text-xs font-semibold text-gray-900 mb-1">
                                  📤 Output Data:
                                </div>
                                <pre className="text-xs text-gray-700 font-mono overflow-x-auto whitespace-pre-wrap">
                                  {formatJSON(step.outputData)}
                                </pre>
                              </div>
                            )}

                            {/* Debug Mode: Context Snapshot */}
                            {debugMode && step.contextSnapshot && Object.keys(step.contextSnapshot).length > 0 && (
                              <div className="bg-purple-50 border border-purple-200 rounded p-2">
                                <div className="text-xs font-semibold text-purple-900 mb-1">
                                  🔍 Context Snapshot:
                                </div>
                                <pre className="text-xs text-purple-800 font-mono overflow-x-auto whitespace-pre-wrap">
                                  {formatJSON(step.contextSnapshot)}
                                </pre>
                              </div>
                            )}

                            {/* Debug Mode: Executor & Config */}
                            {debugMode && (
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-gray-100 rounded p-2">
                                  <span className="font-semibold text-gray-700">Executor:</span>
                                  <span className="ml-1 text-gray-600 font-mono">{step.executorId}</span>
                                </div>
                                <div className="bg-gray-100 rounded p-2">
                                  <span className="font-semibold text-gray-700">Node ID:</span>
                                  <span className="ml-1 text-gray-600 font-mono">{step.nodeId}</span>
                                </div>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </ScrollArea>
                </div>
              )}

              {/* Workflow Context (Debug Mode) */}
              {debugMode && result.data.workflowContext && Object.keys(result.data.workflowContext).length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="text-sm font-semibold text-purple-900 mb-2">
                    🌐 Final Workflow Context:
                  </div>
                  <pre className="text-xs text-purple-800 font-mono overflow-x-auto whitespace-pre-wrap">
                    {formatJSON(result.data.workflowContext)}
                  </pre>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)} data-testid="button-close-dialog">
            Chiudi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
