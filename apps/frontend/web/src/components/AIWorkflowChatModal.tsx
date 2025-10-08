import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface AIWorkflowChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkflowGenerated: (workflowJson: any) => void;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  workflowJson?: any;
}

export function AIWorkflowChatModal({ open, onOpenChange, onWorkflowGenerated }: AIWorkflowChatModalProps) {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: 'Describe your workflow in natural language and I\'ll generate it for you!'
    }
  ]);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<any | null>(null);

  const generateMutation = useMutation({
    mutationFn: async (userPrompt: string) => {
      const response = await apiRequest<{ workflow: any }>('/api/workflows/ai-generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt: userPrompt,
          context: {}
        })
      });
      return response;
    },
    onSuccess: (data) => {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'I\'ve generated your workflow! Review it below and click "Apply to Canvas" to use it.',
          workflowJson: data.workflow
        }
      ]);
      setGeneratedWorkflow(data.workflow);
    },
    onError: (error: any) => {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Error generating workflow: ${error.message || 'Unknown error'}. Please try again with a different description.`
        }
      ]);
    }
  });

  const handleSend = () => {
    if (!prompt.trim()) return;

    setMessages(prev => [
      ...prev,
      { role: 'user', content: prompt }
    ]);

    generateMutation.mutate(prompt);
    setPrompt('');
  };

  const handleApplyToCanvas = () => {
    if (generatedWorkflow) {
      onWorkflowGenerated(generatedWorkflow);
      setMessages([{
        role: 'system',
        content: 'Describe your workflow in natural language and I\'ll generate it for you!'
      }]);
      setGeneratedWorkflow(null);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="left" 
        className="w-[500px] sm:w-[540px] flex flex-col p-0"
        style={{ left: '48px' }}
      >
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-500" />
            AI Workflow Assistant
          </SheetTitle>
        </SheetHeader>

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
                
                {msg.workflowJson && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium text-gray-700">
                        Workflow Generated
                      </span>
                    </div>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                        View JSON (debug)
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

          {generateMutation.isPending && (
            <div className="flex gap-3 justify-start">
              <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Generating workflow...</span>
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
              Apply to Canvas
            </Button>
          )}

          <div className="flex gap-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your workflow... (e.g., 'When a leave request is submitted, notify manager and wait for approval')"
              className="resize-none"
              rows={3}
              disabled={generateMutation.isPending}
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
              disabled={!prompt.trim() || generateMutation.isPending}
              className="shrink-0"
              data-testid="button-send-prompt"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
