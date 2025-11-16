/* AI Workflow Chat Modal - Imported from W3 Suite */
import { useState } from 'react';
import { Button } from './components/ui/button';
import { Textarea } from './components/ui/textarea';
import { Loader2, Send, Sparkles, CheckCircle2, XCircle, FileText, Zap } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from './lib/queryClient';

interface AIWorkflowChatModalProps {
  onWorkflowGenerated: (workflowJson: any) => void;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  workflowJson?: any;
  taskReminder?: any;
  readyToBuild?: boolean;
}

export function AIWorkflowChatModal({ onWorkflowGenerated }: AIWorkflowChatModalProps) {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: 'Descrivi il tuo workflow in linguaggio naturale e lo analizzerò per te!'
    }
  ]);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<any | null>(null);
  const [currentUserPrompt, setCurrentUserPrompt] = useState<string>('');
  const [workflowPhase, setWorkflowPhase] = useState<'idle' | 'analyzed' | 'generated'>('idle');

  // Phase 1: Conversational Analysis (auto-triggered on message send)
  const analyzeMutation = useMutation({
    mutationFn: async ({ userPrompt, conversationHistory }: { userPrompt: string; conversationHistory: Message[] }) => {
      const response = await apiRequest('/api/workflows/ai-analyze', {
        method: 'POST',
        body: JSON.stringify({
          prompt: userPrompt,
          conversationHistory: conversationHistory.filter(m => m.role !== 'system').map(m => ({
            role: m.role,
            content: m.content
          })),
          context: {}
        })
      });
      return response;
    },
    onSuccess: (response) => {
      const parsed = response.data.parsedAnalysis;
      
      if (parsed?.status === 'complete' && parsed.taskReminder) {
        // AI has complete vision - show task reminder
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: parsed.message,
            taskReminder: parsed.taskReminder,
            readyToBuild: true
          }
        ]);
        setWorkflowPhase('analyzed');
      } else if (parsed?.status === 'incomplete') {
        // AI needs more info - show question
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: parsed.message
          }
        ]);
        setWorkflowPhase('idle'); // Allow user to continue conversation
      } else {
        // Fallback: raw analysis text
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: response.data.analysis
          }
        ]);
        setWorkflowPhase('idle');
      }
    },
    onError: (error: any) => {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Errore durante l'analisi: ${error.message || 'Errore sconosciuto'}. Riprova con una descrizione diversa.`
        }
      ]);
      setWorkflowPhase('idle');
    }
  });

  // Phase 2: Generation
  const generateMutation = useMutation({
    mutationFn: async ({ taskReminder, originalPrompt }: { taskReminder: any; originalPrompt: string }) => {
      const response = await apiRequest('/api/workflows/ai-generate', {
        method: 'POST',
        body: JSON.stringify({
          taskReminder: taskReminder,
          originalPrompt: originalPrompt,
          context: {}
        })
      });
      return response;
    },
    onSuccess: (response) => {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Ho generato il tuo workflow! Controlla il risultato qui sotto e clicca "Applica al Canvas" per usarlo.',
          workflowJson: response.data.workflow
        }
      ]);
      setGeneratedWorkflow(response.data.workflow);
      setWorkflowPhase('generated');
    },
    onError: (error: any) => {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Errore durante la generazione: ${error.message || 'Errore sconosciuto'}. Riprova.`
        }
      ]);
      setWorkflowPhase('analyzed'); // Torna alla fase di analisi
    }
  });

  const handleSend = () => {
    if (!prompt.trim()) return;

    const userPrompt = prompt;
    setCurrentUserPrompt(userPrompt);
    
    const updatedMessages = [
      ...messages,
      { role: 'user', content: userPrompt } as Message
    ];
    
    setMessages(updatedMessages);

    // Phase 1: Analyze the request with full conversation history
    analyzeMutation.mutate({ 
      userPrompt, 
      conversationHistory: updatedMessages 
    });
    setPrompt('');
  };

  const handleGenerateTemplate = () => {
    // Find the task reminder from the last complete assistant message
    const lastCompleteMessage = messages
      .slice()
      .reverse()
      .find(msg => msg.role === 'assistant' && msg.taskReminder);

    if (!lastCompleteMessage?.taskReminder) {
      console.error('No task reminder found');
      return;
    }

    // Phase 2: Generate workflow JSON with full task reminder context
    setMessages(prev => [
      ...prev,
      { role: 'user', content: '🎯 Genera il template del workflow' }
    ]);
    
    // Pass the complete task reminder to the generator
    generateMutation.mutate({ 
      taskReminder: lastCompleteMessage.taskReminder,
      originalPrompt: currentUserPrompt 
    });
  };

  const handleApplyToCanvas = () => {
    if (generatedWorkflow) {
      onWorkflowGenerated(generatedWorkflow);
      setMessages([{
        role: 'system',
        content: 'Descrivi il tuo workflow in linguaggio naturale e lo analizzerò per te!'
      }]);
      setGeneratedWorkflow(null);
      setCurrentUserPrompt('');
      setWorkflowPhase('idle');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-orange-50 to-purple-50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-500" />
          <h3 className="font-semibold text-gray-900">AI Workflow Assistant</h3>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-orange-500 text-white'
                    : msg.role === 'system'
                    ? 'bg-purple-100 text-purple-900 border border-purple-200'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                
                {/* Task Reminder + Start Building Button */}
                {msg.taskReminder && msg.readyToBuild && (
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                    {/* Task Reminder Card */}
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-semibold text-green-900">
                          Workflow Pronto per la Costruzione
                        </span>
                      </div>
                      <details className="text-xs">
                        <summary className="cursor-pointer text-green-700 hover:text-green-900 font-medium">
                          📋 View Remind
                        </summary>
                        <div className="mt-2 space-y-1 text-gray-700">
                          <p><strong>Tipo:</strong> {msg.taskReminder.workflowType}</p>
                          <p><strong>Trigger:</strong> {msg.taskReminder.trigger}</p>
                          <p><strong>Approver:</strong> {msg.taskReminder.approver}</p>
                          <p><strong>Team:</strong> {msg.taskReminder.teamsInvolved?.join(', ')}</p>
                          <p><strong>Flow:</strong> {msg.taskReminder.flow}</p>
                          {msg.taskReminder.routing && (
                            <p><strong>Routing:</strong> {msg.taskReminder.routing.mode === 'auto' ? '🤖 Automatico' : '👤 Manuale'} {msg.taskReminder.routing.department && `(${msg.taskReminder.routing.department})`}</p>
                          )}
                          {msg.taskReminder.notifications && (
                            <p><strong>Notifiche:</strong> {msg.taskReminder.notifications}</p>
                          )}
                          {msg.taskReminder.businessRules && (
                            <p><strong>Regole:</strong> {msg.taskReminder.businessRules}</p>
                          )}
                          {msg.taskReminder.sla && (
                            <p><strong>SLA:</strong> {msg.taskReminder.sla}</p>
                          )}
                        </div>
                      </details>
                    </div>
                    
                    {/* Start Building Button */}
                    <Button
                      onClick={handleGenerateTemplate}
                      disabled={generateMutation.isPending}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white h-12"
                      data-testid="button-start-building"
                      title="Start to build"
                    >
                      {generateMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Building...
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5 mr-2" />
                          ▶ Start Building
                        </>
                      )}
                    </Button>
                  </div>
                )}
                
                {msg.workflowJson && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium text-gray-700">
                        Workflow Generato
                      </span>
                    </div>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                        Visualizza JSON (debug)
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-50 rounded text-[10px] overflow-x-auto">
                        {JSON.stringify(msg.workflowJson, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            </div>
          ))}

          {analyzeMutation.isPending && (
            <div className="flex gap-3 justify-start">
              <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Analisi in corso...</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4 space-y-3">
          {generatedWorkflow && (
            <Button
              onClick={handleApplyToCanvas}
              className="w-full bg-green-600 hover:bg-green-700"
              data-testid="button-apply-workflow"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Applica al Canvas
            </Button>
          )}

          <div className="flex gap-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descrivi il tuo workflow... (es: 'Quando viene inviata una richiesta di ferie, notifica il manager e aspetta l'approvazione')"
              className="resize-none"
              rows={3}
              disabled={analyzeMutation.isPending || generateMutation.isPending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              data-testid="input-ai-prompt"
            />
            <Button
              onClick={handleSend}
              disabled={!prompt.trim() || analyzeMutation.isPending || generateMutation.isPending}
              className="shrink-0 bg-purple-600 hover:bg-purple-700"
              data-testid="button-send-prompt"
            >
              {analyzeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 text-center">
            Premi Invio per inviare, Shift+Invio per nuova riga
          </p>
        </div>
      </div>
  );
}
