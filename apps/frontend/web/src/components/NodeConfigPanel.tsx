import React, { useState, useCallback } from 'react';
import { Node } from '@xyflow/react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Trash2, Info, Sparkles } from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';

interface NodeConfigPanelProps {
  node: Node | null;
  allNodes: Node[]; // Lista di tutti i nodi disponibili per dropdown
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeId: string, config: any) => void;
}

interface Role {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
}

interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  department: string | null;
  isActive: boolean;
}

interface Team {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  teamType: string;
  department: string | null;
}

/**
 * 🎛️ Node Configuration Panel
 * 
 * Componente separato per evitare hook order violations nel WorkflowBuilder.
 * Gestisce la configurazione di tutti i tipi di nodi in modo sicuro.
 */
export default function NodeConfigPanel({ node, allNodes, isOpen, onClose, onSave }: NodeConfigPanelProps) {
  if (!node) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent 
        className="max-w-3xl max-h-[85vh] overflow-y-auto backdrop-blur-xl bg-gradient-to-br from-white/15 via-white/10 to-white/5 dark:from-gray-900/20 dark:via-gray-900/15 dark:to-gray-900/10 border-2 border-white/30 dark:border-white/20 shadow-2xl ring-1 ring-inset ring-white/20 dark:ring-white/10 animate-in fade-in-0 zoom-in-95 duration-200"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="pb-4 border-b border-white/20 dark:border-white/10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-3 text-xl font-bold bg-gradient-to-r from-windtre-orange to-windtre-purple bg-clip-text text-transparent">
                🎛️ Configurazione Nodo
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-2">
                {String(node.data.name || node.data.title || node.data.id)}
              </DialogDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1">
              Node ID: {node.id}
            </Badge>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {/* ========== AI NODES ========== */}
          {node.data.id === 'ai-decision' && (
            <AiDecisionConfig node={node} allNodes={allNodes} onSave={onSave} onClose={onClose} />
          )}
          
          {/* ========== ACTION NODES ========== */}
          {node.data.id === 'send-email' && (
            <SendEmailConfig node={node} onSave={onSave} onClose={onClose} />
          )}
          
          {node.data.id === 'approve-request' && (
            <ApprovalRequestConfig node={node} onSave={onSave} onClose={onClose} />
          )}
          
          {node.data.id === 'auto-approval' && (
            <AutoApprovalConfig node={node} onSave={onSave} onClose={onClose} />
          )}
          
          {/* ========== TASK NODES ========== */}
          {node.data.id === 'create-task' && (
            <TaskCreateConfig node={node} onSave={onSave} onClose={onClose} />
          )}
          
          {node.data.id === 'assign-task' && (
            <TaskAssignConfig node={node} onSave={onSave} onClose={onClose} />
          )}
          
          {node.data.id === 'update-task-status' && (
            <TaskStatusUpdateConfig node={node} onSave={onSave} onClose={onClose} />
          )}
          
          {/* ========== TASK TRIGGERS ========== */}
          {['task-created', 'task-status-changed', 'task-assigned'].includes(node.data.id) && (
            <TaskTriggerConfig node={node} onSave={onSave} onClose={onClose} />
          )}
          
          {/* ========== FLOW CONTROL NODES ========== */}
          {node.data.id === 'if-condition' && (
            <IfConditionConfig node={node} onSave={onSave} onClose={onClose} />
          )}
          
          {node.data.id === 'switch-case' && (
            <SwitchCaseConfig node={node} onSave={onSave} onClose={onClose} />
          )}
          
          {node.data.id === 'while-loop' && (
            <WhileLoopConfig node={node} onSave={onSave} onClose={onClose} />
          )}
          
          {node.data.id === 'parallel-fork' && (
            <ParallelForkConfig node={node} onSave={onSave} onClose={onClose} />
          )}
          
          {node.data.id === 'join-sync' && (
            <JoinSyncConfig node={node} onSave={onSave} onClose={onClose} />
          )}
          
          {/* ========== ROUTING NODES ========== */}
          {node.data.id === 'team-assignment' && (
            <TeamAssignmentConfig node={node} onSave={onSave} onClose={onClose} />
          )}
          
          {node.data.id === 'user-assignment' && (
            <UserAssignmentConfig node={node} onSave={onSave} onClose={onClose} />
          )}
          
          {/* ========== FALLBACK (solo per nodi non mappati) ========== */}
          {!['ai-decision', 'send-email', 'approve-request', 'auto-approval', 'create-task', 'assign-task', 'update-task-status', 'task-created', 'task-status-changed', 'task-assigned', 'if-condition', 'switch-case', 'while-loop', 'parallel-fork', 'join-sync', 'team-assignment', 'user-assignment'].includes(node.data.id) && (
            <GenericNodeConfig node={node} onSave={onSave} onClose={onClose} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 🎯 NODE SELECTOR COMPONENT
 * Dropdown intelligente per selezione nodi di destinazione
 */
interface NodeSelectorProps {
  value: string;
  onChange: (nodeId: string) => void;
  allNodes: Node[];
  currentNodeId: string;
  placeholder?: string;
  testId?: string;
}

function NodeSelector({ value, onChange, allNodes, currentNodeId, placeholder = "Seleziona nodo", testId }: NodeSelectorProps) {
  // Filtra il nodo corrente dalla lista
  const availableNodes = allNodes.filter(n => n.id !== currentNodeId);
  
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger data-testid={testId} className="text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {availableNodes.length === 0 ? (
          <SelectItem value="none" disabled>Nessun nodo disponibile</SelectItem>
        ) : (
          availableNodes.map(node => {
            const nodeName = String(node.data.name || node.data.title || node.data.id);
            const nodeType = String(node.data.category || 'node');
            return (
              <SelectItem key={node.id} value={node.id}>
                <span className="font-mono text-xs text-gray-500 mr-2">{node.id}</span>
                <span className="font-medium">{nodeName}</span>
                <span className="text-xs text-gray-400 ml-2">({nodeType})</span>
              </SelectItem>
            );
          })
        )}
      </SelectContent>
    </Select>
  );
}

/**
 * 🤖 AI Decision Node Configuration - ADVANCED PROMPT BUILDER
 */
function AiDecisionConfig({ node, allNodes, onSave, onClose }: { node: Node; allNodes: Node[]; onSave: (nodeId: string, config: any) => void; onClose: () => void }) {
  const config = (node.data.config || {}) as any;
  const params = config.parameters || {};
  
  // Template preconfigurati
  const PROMPT_TEMPLATES = [
    { id: 'approval', name: '✅ Approvazione', prompt: 'Analizza questa richiesta e decidi se approvarla:\n- Importo: {{amount}}\n- Richiedente: {{requester}}\n- Motivazione: {{reason}}\n\nCriteri: approva se importo < 1000€ e motivazione valida.' },
    { id: 'classification', name: '🏷️ Classificazione', prompt: 'Classifica questa richiesta in base a:\n- Tipo: {{type}}\n- Urgenza: {{urgency}}\n- Descrizione: {{description}}\n\nCategorie: urgent/normal/low' },
    { id: 'routing', name: '🔀 Routing', prompt: 'Determina il team corretto per gestire:\n- Cliente: {{customer}}\n- Categoria: {{category}}\n- Problema: {{issue}}\n\nTeam disponibili: support/sales/technical' },
    { id: 'sentiment', name: '😊 Sentiment Analysis', prompt: 'Analizza il sentiment di questo messaggio:\n{{message}}\n\nClassifica come: positive/neutral/negative' },
    { id: 'crm_lead', name: '🎯 CRM Lead Qualification', prompt: 'Qualifica questo lead CRM secondo il framework BANT:\n- Nome Azienda: {{company_name}}\n- Budget Stimato: {{budget}}\n- Decision Maker: {{authority}}\n- Necessità: {{need}}\n- Timeline Acquisto: {{timeline}}\n- Fonte Lead: {{source}}\n- Engagement Score: {{engagement}}\n\nClassifica come:\n- hot_lead: Budget >10k€, authority confermata, timeline <30 giorni\n- warm_lead: Budget 5-10k€, interesse moderato, timeline 1-3 mesi\n- cold_lead: Budget <5k€, no decision maker, timeline >3 mesi\n- nurture: Potenziale futuro, richiede follow-up continuo' },
    { id: 'custom', name: '🎯 Custom', prompt: '' }
  ];

  const [selectedTemplate, setSelectedTemplate] = useState(config.templateId || 'custom');
  const [prompt, setPrompt] = useState(config.prompt || '');
  const [maxTokens, setMaxTokens] = useState(params.maxTokens || 500);
  const [outputs, setOutputs] = useState(config.outputs || [
    { condition: 'approve', path: '', label: 'Approva' },
    { condition: 'reject', path: '', label: 'Rifiuta' },
    { condition: 'escalate', path: '', label: 'Escalation' }
  ]);
  const [timeoutSeconds, setTimeoutSeconds] = useState((config.fallback?.timeout || 30000) / 1000);
  const [defaultPath, setDefaultPath] = useState(config.fallback?.defaultPath || 'manual_review');

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = PROMPT_TEMPLATES.find(t => t.id === templateId);
    if (template && template.prompt) {
      setPrompt(template.prompt);
    }
  };

  const addOutput = () => {
    setOutputs([...outputs, { condition: '', path: '', label: '' }]);
  };

  const removeOutput = (index: number) => {
    setOutputs(outputs.filter((_, i) => i !== index));
  };

  const handleSave = useCallback(() => {
    onSave(node.id, {
      templateId: selectedTemplate,
      prompt,
      parameters: {
        maxTokens
      },
      outputs: outputs.filter(o => o.condition && o.path).map(o => ({
        condition: o.condition,
        path: o.path,
        ...(o.label && { label: o.label }) // Include label solo se presente
      })),
      fallback: {
        enabled: true,
        timeout: timeoutSeconds * 1000,
        defaultPath
      }
    });
    onClose();
  }, [selectedTemplate, prompt, maxTokens, outputs, timeoutSeconds, defaultPath, node.id, onSave, onClose]);

  return (
    <div className="space-y-6">
      {/* Template Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-windtre-orange" />
          Template Prompt Preconfigurato
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PROMPT_TEMPLATES.map(template => (
            <Button
              key={template.id}
              variant={selectedTemplate === template.id ? 'default' : 'outline'}
              className={selectedTemplate === template.id ? 'bg-gradient-to-r from-windtre-orange to-windtre-purple text-white' : ''}
              onClick={() => handleTemplateChange(template.id)}
              data-testid={`template-${template.id}`}
            >
              {template.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Prompt Editor */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center">
          📝 Prompt AI
          <InfoTooltip 
            title="Prompt per l'AI"
            description="Il messaggio che guida il modello AI nella decisione. Definisce cosa analizzare e quali criteri utilizzare."
            examples={[
              "Analizza questa richiesta: {{description}}",
              "Approva se {{amount}} < 1000 e {{department}} == 'Sales'"
            ]}
            notes="Usa {{variabile}} per inserire dati dinamici dal workflow"
          />
        </label>
        <textarea 
          value={prompt} 
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-windtre-orange bg-white font-mono text-sm"
          rows={6}
          placeholder="Scrivi il prompt per l'AI..."
          data-testid="textarea-ai-prompt"
        />
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
          <Info className="h-3 w-3" />
          Usa <code className="bg-gray-100 px-1 rounded">{'{{variabile}}'}</code> per inserire dati del workflow
        </p>
      </div>

      {/* Agent Configuration Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900 mb-1">Agente AI: workflow-assistant</p>
            <p className="text-xs text-blue-700">
              Modello e temperatura sono configurati centralmente nell'AI Registry (default: GPT-4 Turbo, temp 0.7)
            </p>
          </div>
        </div>
      </div>

      {/* Max Tokens */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center">
          📏 Lunghezza Risposta (Max Tokens): {maxTokens}
          <InfoTooltip 
            title="Max Tokens (Lunghezza)"
            description="Massimo numero di token (parole) che l'AI può generare. Limita la lunghezza e il costo della risposta."
            examples={[
              "50-200: Risposte brevi (es: sì/no, categorie)",
              "500-1000: Spiegazioni dettagliate"
            ]}
            notes="Più token = costi maggiori. 1 token ≈ 0.75 parole italiane"
          />
        </label>
        <input
          type="range"
          value={maxTokens}
          onChange={(e) => setMaxTokens(Number(e.target.value))}
          min={50}
          max={2000}
          step={50}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-windtre-orange"
          data-testid="slider-max-tokens"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Breve (50)</span>
          <span>Lungo (2000)</span>
        </div>
      </div>

      {/* Output Mapper */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center">
          🔀 Mappatura Decisioni → Percorsi
          <InfoTooltip 
            title="Condizioni AI Decision"
            description="Mappa le decisioni dell'AI ai percorsi del workflow. L'AI può restituire qualsiasi valore testuale, ma queste sono le condizioni più comuni."
            examples={[
              "approve - Richiesta approvata",
              "reject - Richiesta rifiutata",
              "escalate - Invia a livello superiore",
              "manual_review - Revisione manuale necessaria",
              "approved_auto - Approvazione automatica",
              "pending - In attesa di più informazioni",
              "urgent - Richiede attenzione immediata",
              "low_priority - Priorità bassa"
            ]}
            notes="Puoi usare condizioni personalizzate: l'AI restituirà il valore corrispondente al prompt che hai configurato"
          />
        </label>
        <div className="space-y-2">
          {outputs.map((output: any, index: number) => (
            <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <input 
                type="text" 
                value={output.condition}
                onChange={(e) => setOutputs(outputs.map((o, i) => i === index ? { ...o, condition: e.target.value } : o))}
                className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="approve"
                data-testid={`input-condition-${index}`}
              />
              <span className="text-gray-400">→</span>
              <input 
                type="text" 
                value={output.label}
                onChange={(e) => setOutputs(outputs.map((o, i) => i === index ? { ...o, label: e.target.value } : o))}
                className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="Etichetta"
              />
              <span className="text-gray-400">→</span>
              <div className="flex-1">
                <NodeSelector
                  value={output.path}
                  onChange={(nodeId) => setOutputs(outputs.map((o, i) => i === index ? { ...o, path: nodeId } : o))}
                  allNodes={allNodes}
                  currentNodeId={node.id}
                  placeholder="Seleziona nodo destinazione"
                  testId={`select-path-${index}`}
                />
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeOutput(index)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addOutput} className="mt-2" data-testid="button-add-output">
          <Plus className="h-4 w-4 mr-1" /> Aggiungi Percorso
        </Button>
      </div>

      {/* Fallback & Timeout */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            ⏱️ Timeout (secondi)
          </label>
          <input 
            type="number" 
            value={timeoutSeconds}
            onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-windtre-orange"
            min={5}
            max={300}
            data-testid="input-timeout-seconds"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            🔄 Fallback (se timeout)
          </label>
          <NodeSelector
            value={defaultPath}
            onChange={setDefaultPath}
            allNodes={allNodes}
            currentNodeId={node.id}
            placeholder="Nodo fallback"
            testId="select-default-path"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose} data-testid="button-cancel-config">
          Annulla
        </Button>
        <Button 
          onClick={handleSave}
          className="bg-gradient-to-r from-windtre-orange to-windtre-purple text-white hover:shadow-lg"
          data-testid="button-save-ai-config"
        >
          💾 Salva Configurazione
        </Button>
      </div>
    </div>
  );
}

/**
 * 📧 Send Email Configuration
 */
function SendEmailConfig({ node, onSave, onClose }: { node: Node; onSave: (nodeId: string, config: any) => void; onClose: () => void }) {
  const config = (node.data.config || {}) as any;
  // Backend richiede to: string[] - supportiamo multi-recipient
  const existingRecipients = Array.isArray(config.to) ? config.to : (config.to ? [config.to] : []);
  const [recipients, setRecipients] = useState<string[]>(existingRecipients.length > 0 ? existingRecipients : ['']);
  const [subject, setSubject] = useState(config.subject || '');
  const [template, setTemplate] = useState(config.template || ''); // Schema requires 'template' not 'message'
  const [priority, setPriority] = useState(config.priority || 'normal');
  const [error, setError] = useState('');

  const addRecipient = () => {
    setRecipients([...recipients, '']);
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const updateRecipient = (index: number, value: string) => {
    setRecipients(recipients.map((r, i) => i === index ? value : r));
  };

  const handleSave = useCallback(() => {
    // Validazione pre-save (EmailActionConfigSchema compliance)
    const validRecipients = recipients.filter(r => r.trim() !== '');
    
    if (validRecipients.length === 0) {
      setError('Almeno un destinatario è obbligatorio');
      return;
    }
    
    if (!subject.trim()) {
      setError('L\'oggetto è obbligatorio');
      return;
    }
    
    if (!template.trim()) {
      setError('Il template/messaggio è obbligatorio');
      return;
    }
    
    setError('');
    
    onSave(node.id, {
      to: validRecipients, // ARRAY min 1 (validated)
      subject: subject.trim(), // Non-empty (validated)
      template: template.trim(), // 'template' per EmailActionConfigSchema (validated)
      priority,
      tracking: true
    });
    onClose();
  }, [recipients, subject, template, priority, node.id, onSave, onClose]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center">
          👤 Destinatari Email <span className="text-red-500 ml-1">*</span>
          <InfoTooltip 
            title="Destinatari Email"
            description="Gli indirizzi email che riceveranno la notifica. Supporta destinatari multipli e variabili dinamiche."
            examples={[
              "user@windtre.it",
              "{{approver_email}}",
              "{{requester.email}}"
            ]}
            notes="Usa {{variabile}} per email dinamiche dal workflow. Puoi aggiungere più destinatari."
          />
        </label>
        <div className="space-y-2">
          {recipients.map((email, index) => (
            <div key={index} className="flex items-center gap-2">
              <input 
                type="text" 
                value={email}
                onChange={(e) => updateRecipient(index, e.target.value)}
                className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-windtre-orange"
                placeholder="user@example.com o {{email}}"
                data-testid={`input-email-recipient-${index}`}
              />
              {recipients.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removeRecipient(index)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addRecipient} className="mt-2">
          <Plus className="h-4 w-4 mr-1" /> Aggiungi Destinatario
        </Button>
        <p className="text-xs text-gray-500 mt-2">Usa {'{{variabile}}'} per email dinamica dal workflow</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center">
          📋 Oggetto <span className="text-red-500 ml-1">*</span>
          <InfoTooltip 
            title="Oggetto Email"
            description="L'oggetto dell'email che apparirà nella casella di posta del destinatario."
            examples={[
              "Nuova richiesta da {{requester_name}}",
              "Approvazione richiesta: {{request_type}}"
            ]}
            notes="Mantieni l'oggetto breve e descrittivo. Supporta variabili dinamiche."
          />
        </label>
        <input 
          type="text" 
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-windtre-orange"
          placeholder="Oggetto della email..."
          data-testid="input-email-subject"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center">
          ✉️ Template Email <span className="text-red-500 ml-1">*</span>
          <InfoTooltip 
            title="Template Email"
            description="Il nome del template predefinito o il contenuto completo dell'email. Supporta variabili dinamiche."
            examples={[
              "welcome_email (template predefinito)",
              "Ciao {{user_name}}, la tua richiesta..."
            ]}
            notes="Puoi usare template salvati oppure scrivere il testo completo con variabili {{nome}}"
          />
        </label>
        <textarea 
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-windtre-orange"
          rows={5}
          placeholder="Nome template o testo messaggio..."
          data-testid="textarea-email-template"
        />
        <p className="text-xs text-gray-500 mt-1">Es: 'welcome_email' o testo completo del messaggio</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          🎯 Priorità
        </label>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger data-testid="select-email-priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">🟢 Bassa</SelectItem>
            <SelectItem value="normal">🟡 Normale</SelectItem>
            <SelectItem value="high">🔴 Alta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose}>Annulla</Button>
        <Button onClick={handleSave} className="bg-gradient-to-r from-windtre-orange to-windtre-purple text-white">
          💾 Salva
        </Button>
      </div>
    </div>
  );
}

/**
 * ✅ Approval Request Configuration
 */
function ApprovalRequestConfig({ node, onSave, onClose }: { node: Node; onSave: (nodeId: string, config: any) => void; onClose: () => void }) {
  const config = (node.data.config || {}) as any;
  const [approverRole, setApproverRole] = useState((config.roles && config.roles[0]) || '');
  const [message, setMessage] = useState(config.message || '');
  const [timeoutHours, setTimeoutHours] = useState(config.timeout?.hours || 72);
  const [escalationEnabled, setEscalationEnabled] = useState(config.escalation?.enabled || false);

  // 🔄 Carica ruoli reali dal database
  const { data: rolesData, isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ['/api/roles'],
  });

  const handleSave = useCallback(() => {
    onSave(node.id, {
      approverType: 'role', // Valid enum: role-based approval
      roles: [approverRole], // ARRAY richiesto da schema
      message,
      timeout: { hours: timeoutHours, action: 'escalate' },
      escalation: { 
        enabled: escalationEnabled,
        delayHours: 24,
        escalateTo: [],
        maxLevels: 3
      }
    });
    onClose();
  }, [approverRole, message, timeoutHours, escalationEnabled, node.id, onSave, onClose]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center">
          👤 Ruolo Approvatore
          <InfoTooltip 
            title="Ruolo Approvatore"
            description="Il ruolo aziendale che deve approvare la richiesta. Il workflow si fermerà fino all'approvazione."
            examples={[
              "Manager: Responsabili di reparto",
              "HR: Ufficio risorse umane",
              "Finance: Ufficio amministrativo"
            ]}
            notes="Gli utenti con questo ruolo riceveranno la notifica di approvazione"
          />
        </label>
        <Select value={approverRole} onValueChange={setApproverRole} disabled={rolesLoading}>
          <SelectTrigger data-testid="select-approver-role">
            <SelectValue placeholder={rolesLoading ? "Caricamento ruoli..." : "Seleziona ruolo"} />
          </SelectTrigger>
          <SelectContent>
            {rolesLoading ? (
              <SelectItem value="loading" disabled>⏳ Caricamento...</SelectItem>
            ) : rolesData && rolesData.length > 0 ? (
              rolesData.map((role) => (
                <SelectItem key={role.id} value={role.name}>
                  {role.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-roles" disabled>⚠️ Nessun ruolo disponibile</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center">
          📝 Messaggio Richiesta
          <InfoTooltip 
            title="Messaggio Richiesta"
            description="Il messaggio che accompagna la richiesta di approvazione. Spiega cosa deve essere approvato."
            examples={[
              "Richiesta ferie dal {{start_date}} al {{end_date}}",
              "Approvazione spesa di {{amount}}€ per {{description}}"
            ]}
            notes="Fornisci dettagli chiari per facilitare la decisione dell'approvatore"
          />
        </label>
        <textarea 
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-windtre-orange"
          rows={3}
          placeholder="Descrivi la richiesta di approvazione..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center">
            ⏱️ Timeout (ore)
            <InfoTooltip 
              title="Timeout Approvazione"
              description="Tempo massimo di attesa prima di escalare la richiesta. Dopo questo periodo, la richiesta passa al livello superiore."
              examples={[
                "24 ore: Decisioni urgenti",
                "72 ore: Approvazioni standard",
                "168 ore: Richieste non urgenti"
              ]}
              notes="L'escalation automatica previene blocchi del workflow"
            />
          </label>
          <input 
            type="number" 
            value={timeoutHours}
            onChange={(e) => setTimeoutHours(Number(e.target.value))}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg"
            min={1}
            max={168}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            🔼 Escalation
          </label>
          <div className="flex items-center gap-2 h-10">
            <Switch checked={escalationEnabled} onCheckedChange={setEscalationEnabled} />
            <span className="text-sm">{escalationEnabled ? 'Abilitata' : 'Disabilitata'}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose}>Annulla</Button>
        <Button onClick={handleSave} className="bg-gradient-to-r from-windtre-orange to-windtre-purple text-white">
          💾 Salva
        </Button>
      </div>
    </div>
  );
}

/**
 * 🤖 Auto Approval Configuration
 */
function AutoApprovalConfig({ node, onSave, onClose }: { node: Node; onSave: (nodeId: string, config: any) => void; onClose: () => void }) {
  const config = (node.data.config || {}) as any;
  const autoApprove = config.autoApprove || {};
  const conditions = autoApprove.conditions || [];
  
  // Estrai condizioni esistenti o crea defaults
  const amountCond = conditions.find((c: any) => c.field === 'amount');
  const roleCond = conditions.find((c: any) => c.field === 'role');
  
  const [maxAmount, setMaxAmount] = useState(amountCond?.value || 1000);
  const [requiredRole, setRequiredRole] = useState(roleCond?.value || 'employee');
  const [businessHoursOnly, setBusinessHoursOnly] = useState(autoApprove.businessHoursOnly || false);

  const handleSave = useCallback(() => {
    // Costruisci conditions compatibili con ApprovalActionConfigSchema.autoApprove
    const autoApproveConditions = [
      { field: 'amount', operator: 'less_than' as const, value: Number(maxAmount) },
      { field: 'role', operator: 'equals' as const, value: requiredRole }
    ];
    
    // Se business hours, aggiungi condizione
    if (businessHoursOnly) {
      autoApproveConditions.push({
        field: 'businessHours',
        operator: 'equals' as const,
        value: true
      });
    }
    
    onSave(node.id, {
      // approverType valido (richiesto da schema)
      approverType: 'role',
      roles: [requiredRole],
      
      // autoApprove config (compatibile con ApprovalActionConfigSchema)
      autoApprove: {
        enabled: true,
        conditions: autoApproveConditions
      },
      
      // Timeout default
      timeout: {
        hours: 72,
        action: 'auto_approve'
      }
    });
    onClose();
  }, [maxAmount, requiredRole, businessHoursOnly, node.id, onSave, onClose]);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          ⚡ Auto-approva richieste che rispettano tutte le regole configurate
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          💰 Importo Massimo (€)
        </label>
        <input 
          type="number" 
          value={maxAmount}
          onChange={(e) => setMaxAmount(Number(e.target.value))}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg"
          min={0}
          step={100}
        />
        <p className="text-xs text-gray-500 mt-1">Approva automaticamente se importo &lt; questo valore</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          👤 Ruolo Richiesto Minimo
        </label>
        <Select value={requiredRole} onValueChange={setRequiredRole}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="employee">👔 Employee</SelectItem>
            <SelectItem value="manager">👨‍💼 Manager</SelectItem>
            <SelectItem value="director">🎯 Director</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          🕐 Solo Orario Lavorativo
        </label>
        <div className="flex items-center gap-2">
          <Switch checked={businessHoursOnly} onCheckedChange={setBusinessHoursOnly} />
          <span className="text-sm">{businessHoursOnly ? '9:00-17:00 lun-ven' : 'Sempre attivo'}</span>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose}>Annulla</Button>
        <Button onClick={handleSave} className="bg-gradient-to-r from-windtre-orange to-windtre-purple text-white">
          💾 Salva
        </Button>
      </div>
    </div>
  );
}

/**
 * 🔧 Default Node Configuration
 */
function DefaultNodeConfig({ node, onSave, onClose }: { node: Node; onSave: (nodeId: string, config: any) => void; onClose: () => void }) {
  const config = node.data.config || {};
  const [nodeConfig, setNodeConfig] = useState(JSON.stringify(config, null, 2));

  const handleSave = useCallback(() => {
    try {
      const updatedConfig = JSON.parse(nodeConfig);
      onSave(node.id, updatedConfig);
      onClose();
    } catch (error) {
      console.error('Invalid JSON configuration:', error);
    }
  }, [nodeConfig, node.id, onSave, onClose]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-windtre-dark mb-1">
          ⚙️ Configurazione (JSON)
        </label>
        <textarea 
          value={nodeConfig}
          onChange={(e) => setNodeConfig(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-windtre-orange/50 bg-white/70 font-mono text-sm"
          rows={8}
          placeholder='{"key": "value"}'
          data-testid="textarea-node-config"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose} data-testid="button-cancel-config">
          Annulla
        </Button>
        <Button 
          onClick={handleSave}
          className="bg-gradient-to-r from-windtre-orange to-windtre-purple text-white hover:shadow-lg"
          data-testid="button-save-default-config"
        >
          💾 Salva Configurazione
        </Button>
      </div>
    </div>
  );
}

/**
 * ✅ Create Task Configuration
 */
function TaskCreateConfig({ node, onSave, onClose }: { node: Node; onSave: (nodeId: string, config: any) => void; onClose: () => void }) {
  const config = (node.data.config || {}) as any;
  
  const [title, setTitle] = useState(config.title || '');
  const [description, setDescription] = useState(config.description || '');
  const [priority, setPriority] = useState(config.priority || 'medium');
  const [urgency, setUrgency] = useState(config.urgency || 'medium');
  const [department, setDepartment] = useState(config.department || '');
  const [assignToUser, setAssignToUser] = useState(config.assignToUser || '');

  const handleSave = useCallback(() => {
    onSave(node.id, {
      action: 'create',
      title,
      description,
      status: 'todo',
      priority,
      urgency,
      department: department || null,
      assignToUser: assignToUser || null
    });
    onClose();
  }, [title, description, priority, urgency, department, assignToUser, node.id, onSave, onClose]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-windtre-dark mb-1">
          📝 Titolo Task <span className="text-red-500">*</span>
        </label>
        <input 
          type="text" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-windtre-orange/50 bg-white/70"
          placeholder="es: Approvazione richiesta ferie"
          data-testid="input-task-title"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-windtre-dark mb-1">
          📄 Descrizione
        </label>
        <textarea 
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-windtre-orange/50 bg-white/70"
          rows={3}
          placeholder="Dettagli sul task..."
          data-testid="textarea-task-description"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-windtre-dark mb-1">
            🎯 Priorità
          </label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger data-testid="select-task-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">🟢 Bassa</SelectItem>
              <SelectItem value="medium">🟡 Media</SelectItem>
              <SelectItem value="high">🔴 Alta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-windtre-dark mb-1">
            ⚡ Urgenza
          </label>
          <Select value={urgency} onValueChange={setUrgency}>
            <SelectTrigger data-testid="select-task-urgency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">🕐 Bassa</SelectItem>
              <SelectItem value="medium">🕑 Media</SelectItem>
              <SelectItem value="high">🕒 Alta</SelectItem>
              <SelectItem value="critical">🚨 Critica</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-windtre-dark mb-1">
          🏢 Dipartimento (opzionale)
        </label>
        <input 
          type="text" 
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-windtre-orange/50 bg-white/70"
          placeholder="es: hr, sales, support"
          data-testid="input-task-department"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-windtre-dark mb-1">
          👤 Assegna a User ID (opzionale)
        </label>
        <input 
          type="text" 
          value={assignToUser}
          onChange={(e) => setAssignToUser(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-windtre-orange/50 bg-white/70"
          placeholder="UUID utente o usa {{variabile}} dal workflow"
          data-testid="input-task-assign-user"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose} data-testid="button-cancel-config">
          Annulla
        </Button>
        <Button 
          onClick={handleSave}
          className="bg-gradient-to-r from-windtre-orange to-windtre-purple text-white hover:shadow-lg"
          data-testid="button-save-task-create"
        >
          💾 Salva Configurazione
        </Button>
      </div>
    </div>
  );
}

/**
 * 👥 Assign Task Configuration
 */
function TaskAssignConfig({ node, onSave, onClose }: { node: Node; onSave: (nodeId: string, config: any) => void; onClose: () => void }) {
  const config = (node.data.config || {}) as any;
  
  const [taskId, setTaskId] = useState(config.taskId || '');
  const [assignToUser, setAssignToUser] = useState(config.assignToUser || '');
  const [role, setRole] = useState(config.role || 'assignee');

  const handleSave = useCallback(() => {
    onSave(node.id, {
      action: 'assign',
      taskId,
      assignToUser,
      role
    });
    onClose();
  }, [taskId, assignToUser, role, node.id, onSave, onClose]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-windtre-dark mb-1">
          🆔 Task ID <span className="text-red-500">*</span>
        </label>
        <input 
          type="text" 
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-windtre-orange/50 bg-white/70"
          placeholder="UUID task o usa {{taskId}} dal workflow"
          data-testid="input-assign-task-id"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-windtre-dark mb-1">
          👤 Assegna a User ID <span className="text-red-500">*</span>
        </label>
        <input 
          type="text" 
          value={assignToUser}
          onChange={(e) => setAssignToUser(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-windtre-orange/50 bg-white/70"
          placeholder="UUID utente o usa {{userId}} dal workflow"
          data-testid="input-assign-user-id"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-windtre-dark mb-1">
          🎭 Ruolo Assegnazione
        </label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger data-testid="select-assign-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="assignee">👤 Assegnatario</SelectItem>
            <SelectItem value="reviewer">👁️ Revisore</SelectItem>
            <SelectItem value="watcher">📋 Osservatore</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose} data-testid="button-cancel-config">
          Annulla
        </Button>
        <Button 
          onClick={handleSave}
          className="bg-gradient-to-r from-windtre-orange to-windtre-purple text-white hover:shadow-lg"
          data-testid="button-save-task-assign"
        >
          💾 Salva Configurazione
        </Button>
      </div>
    </div>
  );
}

/**
 * 🔄 Update Task Status Configuration
 */
function TaskStatusUpdateConfig({ node, onSave, onClose }: { node: Node; onSave: (nodeId: string, config: any) => void; onClose: () => void }) {
  const config = (node.data.config || {}) as any;
  
  const [taskId, setTaskId] = useState(config.taskId || '');
  const [newStatus, setNewStatus] = useState(config.newStatus || 'in_progress');

  const handleSave = useCallback(() => {
    onSave(node.id, {
      action: 'update_status',
      taskId,
      newStatus
    });
    onClose();
  }, [taskId, newStatus, node.id, onSave, onClose]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-windtre-dark mb-1">
          🆔 Task ID <span className="text-red-500">*</span>
        </label>
        <input 
          type="text" 
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-windtre-orange/50 bg-white/70"
          placeholder="UUID task o usa {{taskId}} dal workflow"
          data-testid="input-status-task-id"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-windtre-dark mb-1">
          📊 Nuovo Status <span className="text-red-500">*</span>
        </label>
        <Select value={newStatus} onValueChange={setNewStatus}>
          <SelectTrigger data-testid="select-new-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">📋 Da Fare</SelectItem>
            <SelectItem value="in_progress">🔄 In Corso</SelectItem>
            <SelectItem value="review">👁️ In Revisione</SelectItem>
            <SelectItem value="done">✅ Completato</SelectItem>
            <SelectItem value="archived">📦 Archiviato</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose} data-testid="button-cancel-config">
          Annulla
        </Button>
        <Button 
          onClick={handleSave}
          className="bg-gradient-to-r from-windtre-orange to-windtre-purple text-white hover:shadow-lg"
          data-testid="button-save-task-status"
        >
          💾 Salva Configurazione
        </Button>
      </div>
    </div>
  );
}

/**
 * 🔔 Task Trigger Configuration
 */
function TaskTriggerConfig({ node, onSave, onClose }: { node: Node; onSave: (nodeId: string, config: any) => void; onClose: () => void }) {
  const config = (node.data.config || {}) as any;
  const eventType = node.data.id as string; // task-created, task-status-changed, task-assigned
  
  const [department, setDepartment] = useState(config.filters?.department || '');
  const [priority, setPriority] = useState(config.filters?.priority || 'all');
  const [fromStatus, setFromStatus] = useState(config.filters?.fromStatus || 'any');
  const [toStatus, setToStatus] = useState(config.filters?.toStatus || 'any');
  const [assignedTo, setAssignedTo] = useState(config.filters?.assignedTo || '');

  const handleSave = useCallback(() => {
    const filters: any = {};
    
    if (department) filters.department = department;
    
    if (eventType === 'task-created') {
      if (priority && priority !== 'all') filters.priority = priority;
    } else if (eventType === 'task-status-changed') {
      if (fromStatus && fromStatus !== 'any') filters.fromStatus = fromStatus;
      if (toStatus && toStatus !== 'any') filters.toStatus = toStatus;
    } else if (eventType === 'task-assigned') {
      if (assignedTo) filters.assignedTo = assignedTo;
    }

    onSave(node.id, {
      eventType: eventType.replace('-', '_'),
      source: 'tasks',
      filters
    });
    onClose();
  }, [eventType, department, priority, fromStatus, toStatus, assignedTo, node.id, onSave, onClose]);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          🔔 <strong>Trigger:</strong> {String(node.data.title)}
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Questo workflow si attiverà quando l'evento specificato si verifica
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-windtre-dark mb-1">
          🏢 Filtra per Dipartimento (opzionale)
        </label>
        <input 
          type="text" 
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-windtre-orange/50 bg-white/70"
          placeholder="es: hr, sales, support (vuoto = tutti)"
          data-testid="input-trigger-department"
        />
      </div>

      {eventType === 'task-created' && (
        <div>
          <label className="block text-sm font-medium text-windtre-dark mb-1">
            🎯 Filtra per Priorità (opzionale)
          </label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger data-testid="select-trigger-priority">
              <SelectValue placeholder="Tutte le priorità" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte</SelectItem>
              <SelectItem value="low">🟢 Bassa</SelectItem>
              <SelectItem value="medium">🟡 Media</SelectItem>
              <SelectItem value="high">🔴 Alta</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {eventType === 'task-status-changed' && (
        <>
          <div>
            <label className="block text-sm font-medium text-windtre-dark mb-1">
              📊 Da Status (opzionale)
            </label>
            <Select value={fromStatus} onValueChange={setFromStatus}>
              <SelectTrigger data-testid="select-trigger-from-status">
                <SelectValue placeholder="Qualsiasi status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Qualsiasi</SelectItem>
                <SelectItem value="todo">📋 Da Fare</SelectItem>
                <SelectItem value="in_progress">🔄 In Corso</SelectItem>
                <SelectItem value="review">👁️ In Revisione</SelectItem>
                <SelectItem value="done">✅ Completato</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-windtre-dark mb-1">
              📊 A Status (opzionale)
            </label>
            <Select value={toStatus} onValueChange={setToStatus}>
              <SelectTrigger data-testid="select-trigger-to-status">
                <SelectValue placeholder="Qualsiasi status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Qualsiasi</SelectItem>
                <SelectItem value="todo">📋 Da Fare</SelectItem>
                <SelectItem value="in_progress">🔄 In Corso</SelectItem>
                <SelectItem value="review">👁️ In Revisione</SelectItem>
                <SelectItem value="done">✅ Completato</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {eventType === 'task-assigned' && (
        <div>
          <label className="block text-sm font-medium text-windtre-dark mb-1">
            👤 Filtra per User ID (opzionale)
          </label>
          <input 
            type="text" 
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-windtre-orange/50 bg-white/70"
            placeholder="UUID utente (vuoto = tutti gli utenti)"
            data-testid="input-trigger-assigned-to"
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose} data-testid="button-cancel-config">
          Annulla
        </Button>
        <Button 
          onClick={handleSave}
          className="bg-gradient-to-r from-windtre-orange to-windtre-purple text-white hover:shadow-lg"
          data-testid="button-save-task-trigger"
        >
          💾 Salva Configurazione
        </Button>
      </div>
    </div>
  );
}

/**
 * 🔀 IF Condition Configuration - VISUAL BUILDER
 */
function IfConditionConfig({ node, onSave, onClose }: { node: Node; onSave: (nodeId: string, config: any) => void; onClose: () => void }) {
  const config = (node.data.config || {}) as any;
  const [conditions, setConditions] = useState(config.conditions || [{ field: '', operator: 'equals', value: '' }]);
  const [logic, setLogic] = useState(config.logic || 'AND');
  const [truePath, setTruePath] = useState(config.truePath || '');
  const [falsePath, setFalsePath] = useState(config.falsePath || '');

  const addCondition = () => {
    setConditions([...conditions, { field: '', operator: 'equals', value: '' }]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleSave = useCallback(() => {
    onSave(node.id, {
      conditions: conditions.filter(c => c.field && c.value),
      logic,
      truePath,
      falsePath
    });
    onClose();
  }, [conditions, logic, truePath, falsePath, node.id, onSave, onClose]);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          🔀 Esegue azioni diverse in base a condizioni configurabili
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center">
          ⚖️ Logica Condizioni
          <InfoTooltip 
            title="Logica Condizioni"
            description="Come combinare le condizioni quando sono multiple."
            examples={[
              "AND: Tutte le condizioni devono essere vere",
              "OR: Almeno una condizione deve essere vera"
            ]}
            notes="Con AND tutte devono essere soddisfatte, con OR basta una qualsiasi"
          />
        </label>
        <Select value={logic} onValueChange={setLogic}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">AND - Tutte devono essere vere</SelectItem>
            <SelectItem value="OR">OR - Almeno una deve essere vera</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center">
          📋 Condizioni
          <InfoTooltip 
            title="Condizioni di Valutazione"
            description="Regole che determinano quale percorso seguire. Campo = dato dal workflow, Operatore = tipo confronto, Valore = valore atteso."
            examples={[
              "amount > 1000 (importo maggiore di 1000)",
              "status equals approved",
              "department contains Sales"
            ]}
            notes="Usa nomi campo dal workflow. Supporta confronti numerici e testuali."
          />
        </label>
        <div className="space-y-2">
          {conditions.map((cond: any, index: number) => (
            <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <input 
                type="text" 
                value={cond.field}
                onChange={(e) => setConditions(conditions.map((c, i) => i === index ? { ...c, field: e.target.value } : c))}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="Campo (es: amount)"
              />
              <Select value={cond.operator} onValueChange={(val) => setConditions(conditions.map((c, i) => i === index ? { ...c, operator: val } : c))}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">=</SelectItem>
                  <SelectItem value="not_equals">≠</SelectItem>
                  <SelectItem value="greater_than">&gt;</SelectItem>
                  <SelectItem value="less_than">&lt;</SelectItem>
                  <SelectItem value="contains">contiene</SelectItem>
                </SelectContent>
              </Select>
              <input 
                type="text" 
                value={cond.value}
                onChange={(e) => setConditions(conditions.map((c, i) => i === index ? { ...c, value: e.target.value } : c))}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="Valore"
              />
              {conditions.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removeCondition(index)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addCondition} className="mt-2">
          <Plus className="h-4 w-4 mr-1" /> Aggiungi Condizione
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            ✅ Percorso TRUE
          </label>
          <input 
            type="text" 
            value={truePath}
            onChange={(e) => setTruePath(e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg"
            placeholder="node-id-true"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            ❌ Percorso FALSE
          </label>
          <input 
            type="text" 
            value={falsePath}
            onChange={(e) => setFalsePath(e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg"
            placeholder="node-id-false"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose}>Annulla</Button>
        <Button onClick={handleSave} className="bg-gradient-to-r from-windtre-orange to-windtre-purple text-white">
          💾 Salva
        </Button>
      </div>
    </div>
  );
}

/**
 * 🔄 Switch Case Configuration
 */
function SwitchCaseConfig({ node, onSave, onClose }: { node: Node; onSave: (nodeId: string, config: any) => void; onClose: () => void }) {
  const config = (node.data.config || {}) as any;
  const [variable, setVariable] = useState(config.variable || 'status');
  const [cases, setCases] = useState(config.cases || [{ value: '', label: '', path: '' }]);
  const [defaultPath, setDefaultPath] = useState(config.defaultPath || '');

  const addCase = () => {
    setCases([...cases, { value: '', label: '', path: '' }]);
  };

  const removeCase = (index: number) => {
    setCases(cases.filter((_, i) => i !== index));
  };

  const handleSave = useCallback(() => {
    onSave(node.id, {
      variable,
      cases: cases.filter(c => c.value && c.path),
      defaultPath
    });
    onClose();
  }, [variable, cases, defaultPath, node.id, onSave, onClose]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          🔍 Variabile da Valutare
        </label>
        <input 
          type="text" 
          value={variable}
          onChange={(e) => setVariable(e.target.value)}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg"
          placeholder="es: status, priority, type"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          📋 Casi
        </label>
        <div className="space-y-2">
          {cases.map((c: any, index: number) => (
            <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <input 
                type="text" 
                value={c.value}
                onChange={(e) => setCases(cases.map((cs, i) => i === index ? { ...cs, value: e.target.value } : cs))}
                className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="urgent"
              />
              <input 
                type="text" 
                value={c.label}
                onChange={(e) => setCases(cases.map((cs, i) => i === index ? { ...cs, label: e.target.value } : cs))}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="Urgente"
              />
              <span className="text-gray-400">→</span>
              <input 
                type="text" 
                value={c.path}
                onChange={(e) => setCases(cases.map((cs, i) => i === index ? { ...cs, path: e.target.value } : cs))}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="node-id"
              />
              <Button variant="ghost" size="sm" onClick={() => removeCase(index)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addCase} className="mt-2">
          <Plus className="h-4 w-4 mr-1" /> Aggiungi Caso
        </Button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          🔄 Percorso Default
        </label>
        <input 
          type="text" 
          value={defaultPath}
          onChange={(e) => setDefaultPath(e.target.value)}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg"
          placeholder="node-id-default"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose}>Annulla</Button>
        <Button onClick={handleSave} className="bg-gradient-to-r from-windtre-orange to-windtre-purple text-white">
          💾 Salva
        </Button>
      </div>
    </div>
  );
}

/**
 * 🔁 While Loop Configuration
 */
function WhileLoopConfig({ node, onSave, onClose }: { node: Node; onSave: (nodeId: string, config: any) => void; onClose: () => void }) {
  const config = (node.data.config || {}) as any;
  const cond = config.condition || {};
  const [field, setField] = useState(cond.field || 'retries');
  const [operator, setOperator] = useState(cond.operator || 'less_than');
  const [value, setValue] = useState(cond.value || 3);
  const [maxIterations, setMaxIterations] = useState(config.maxIterations || 10);
  const [loopBody, setLoopBody] = useState(config.loopBody || '');
  const [exitPath, setExitPath] = useState(config.exitPath || '');

  const handleSave = useCallback(() => {
    onSave(node.id, {
      condition: { field, operator, value },
      maxIterations: Number(maxIterations),
      loopBody,
      exitPath,
      incrementVar: field
    });
    onClose();
  }, [field, operator, value, maxIterations, loopBody, exitPath, node.id, onSave, onClose]);

  return (
    <div className="space-y-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p className="text-sm text-yellow-800">
          🔁 Ripete azioni fino a quando la condizione è vera (con limite di sicurezza)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          📊 Condizione Loop
        </label>
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            value={field}
            onChange={(e) => setField(e.target.value)}
            className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg"
            placeholder="retries"
          />
          <Select value={operator} onValueChange={setOperator}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="less_than">&lt;</SelectItem>
              <SelectItem value="greater_than">&gt;</SelectItem>
              <SelectItem value="equals">=</SelectItem>
            </SelectContent>
          </Select>
          <input 
            type="number" 
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-24 px-3 py-2 border-2 border-gray-200 rounded-lg"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          🔢 Massimo Iterazioni (sicurezza)
        </label>
        <input 
          type="number" 
          value={maxIterations}
          onChange={(e) => setMaxIterations(Number(e.target.value))}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg"
          min={1}
          max={100}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            🔄 Node Loop Body
          </label>
          <input 
            type="text" 
            value={loopBody}
            onChange={(e) => setLoopBody(e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg"
            placeholder="node-id-ripeti"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            🚪 Node Uscita
          </label>
          <input 
            type="text" 
            value={exitPath}
            onChange={(e) => setExitPath(e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg"
            placeholder="node-id-uscita"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose}>Annulla</Button>
        <Button onClick={handleSave} className="bg-gradient-to-r from-windtre-orange to-windtre-purple text-white">
          💾 Salva
        </Button>
      </div>
    </div>
  );
}

/**
 * 🌿 Parallel Fork Configuration
 */
function ParallelForkConfig({ node, onSave, onClose }: { node: Node; onSave: (nodeId: string, config: any) => void; onClose: () => void }) {
  const config = (node.data.config || {}) as any;
  const [branches, setBranches] = useState(config.branches || [{ name: '', startNode: '', color: '#FF6900' }]);
  const [waitFor, setWaitFor] = useState(config.waitFor || 'all');
  const [timeoutSeconds, setTimeoutSeconds] = useState((config.timeout || 3600));

  const addBranch = () => {
    setBranches([...branches, { name: '', startNode: '', color: '#7B2CBF' }]);
  };

  const removeBranch = (index: number) => {
    setBranches(branches.filter((_, i) => i !== index));
  };

  const handleSave = useCallback(() => {
    onSave(node.id, {
      branches: branches.filter(b => b.name && b.startNode),
      waitFor,
      timeout: timeoutSeconds
    });
    onClose();
  }, [branches, waitFor, timeoutSeconds, node.id, onSave, onClose]);

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <p className="text-sm text-green-800">
          🌿 Esegue più branch in parallelo contemporaneamente
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          🔀 Branch Paralleli
        </label>
        <div className="space-y-2">
          {branches.map((b: any, index: number) => (
            <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <input 
                type="text" 
                value={b.name}
                onChange={(e) => setBranches(branches.map((br, i) => i === index ? { ...br, name: e.target.value } : br))}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="Nome branch"
              />
              <input 
                type="text" 
                value={b.startNode}
                onChange={(e) => setBranches(branches.map((br, i) => i === index ? { ...br, startNode: e.target.value } : br))}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="node-id-inizio"
              />
              <Button variant="ghost" size="sm" onClick={() => removeBranch(index)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={addBranch} className="mt-2">
          <Plus className="h-4 w-4 mr-1" /> Aggiungi Branch
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            ⏱️ Attendi
          </label>
          <Select value={waitFor} onValueChange={setWaitFor}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i branch</SelectItem>
              <SelectItem value="any">Almeno uno</SelectItem>
              <SelectItem value="first">Il primo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            ⏱️ Timeout (secondi)
          </label>
          <input 
            type="number" 
            value={timeoutSeconds}
            onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg"
            min={10}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose}>Annulla</Button>
        <Button onClick={handleSave} className="bg-gradient-to-r from-windtre-orange to-windtre-purple text-white">
          💾 Salva
        </Button>
      </div>
    </div>
  );
}

/**
 * 🔗 Join/Sync Configuration
 */
function JoinSyncConfig({ node, onSave, onClose }: { node: Node; onSave: (nodeId: string, config: any) => void; onClose: () => void }) {
  const config = (node.data.config || {}) as any;
  const [waitForAll, setWaitForAll] = useState(config.waitForAll ?? true);
  const [timeoutSeconds, setTimeoutSeconds] = useState(config.timeout || 3600);
  const [onTimeout, setOnTimeout] = useState(config.onTimeout || 'continue');
  const [aggregateResults, setAggregateResults] = useState(config.aggregateResults ?? true);

  const handleSave = useCallback(() => {
    onSave(node.id, {
      waitForAll,
      timeout: timeoutSeconds,
      onTimeout,
      aggregateResults
    });
    onClose();
  }, [waitForAll, timeoutSeconds, onTimeout, aggregateResults, node.id, onSave, onClose]);

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
        <p className="text-sm text-purple-800">
          🔗 Sincronizza branch paralleli prima di continuare
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          ⏱️ Strategia di Attesa
        </label>
        <div className="flex items-center gap-2">
          <Switch checked={waitForAll} onCheckedChange={setWaitForAll} />
          <span className="text-sm">{waitForAll ? 'Aspetta TUTTI i branch' : 'Aspetta ALMENO UNO'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            ⏱️ Timeout (secondi)
          </label>
          <input 
            type="number" 
            value={timeoutSeconds}
            onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg"
            min={10}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            🚨 Se Timeout
          </label>
          <Select value={onTimeout} onValueChange={setOnTimeout}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="continue">Continua</SelectItem>
              <SelectItem value="fail">Fallisci</SelectItem>
              <SelectItem value="retry">Riprova</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          📊 Aggrega Risultati
        </label>
        <div className="flex items-center gap-2">
          <Switch checked={aggregateResults} onCheckedChange={setAggregateResults} />
          <span className="text-sm">{aggregateResults ? 'Combina output di tutti i branch' : 'Usa solo primo risultato'}</span>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose}>Annulla</Button>
        <Button onClick={handleSave} className="bg-gradient-to-r from-windtre-orange to-windtre-purple text-white">
          💾 Salva
        </Button>
      </div>
    </div>
  );
}

/**
 * 👥 Team Assignment Configuration
 */
function TeamAssignmentConfig({ node, onSave, onClose }: { node: Node; onSave: (nodeId: string, config: any) => void; onClose: () => void }) {
  const config = (node.data.config || {}) as any;
  const [assignmentMode, setAssignmentMode] = useState(config.assignmentMode || 'auto');
  const [teamId, setTeamId] = useState(config.teamId || '');
  const [forDepartment, setForDepartment] = useState(config.forDepartment || 'operations');

  // 🔄 Carica team dal database
  const { data: teamsData, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });

  const handleSave = useCallback(() => {
    onSave(node.id, {
      assignmentMode,
      teamId: assignmentMode === 'manual' ? teamId : null,
      forDepartment: assignmentMode === 'auto' ? forDepartment : null,
      priority: 100,
      fallbackToAny: true
    });
    onClose();
  }, [assignmentMode, teamId, forDepartment, node.id, onSave, onClose]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          🎯 Modalità Assegnazione
        </label>
        <Select value={assignmentMode} onValueChange={setAssignmentMode}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">🤖 Automatica (da department)</SelectItem>
            <SelectItem value="manual">👤 Manuale (team specifico)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {assignmentMode === 'auto' && (
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            🏢 Dipartimento
          </label>
          <Select value={forDepartment} onValueChange={setForDepartment}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hr">👥 HR</SelectItem>
              <SelectItem value="finance">💰 Finance</SelectItem>
              <SelectItem value="sales">📈 Sales</SelectItem>
              <SelectItem value="operations">⚙️ Operations</SelectItem>
              <SelectItem value="support">🎧 Support</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {assignmentMode === 'manual' && (
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2 flex items-center">
            👥 Team
            <InfoTooltip 
              title="Selezione Team"
              description="Seleziona il team a cui assegnare il workflow. Puoi scegliere tra tutti i team attivi del tenant."
              examples={[
                "Team Sales Nord",
                "Team HR Milano",
                "Team Finance Centrale"
              ]}
              notes="Solo i team attivi sono disponibili nella lista"
            />
          </label>
          <Select value={teamId} onValueChange={setTeamId} disabled={teamsLoading}>
            <SelectTrigger data-testid="select-team">
              <SelectValue placeholder={teamsLoading ? "Caricamento team..." : "Seleziona team"} />
            </SelectTrigger>
            <SelectContent>
              {teamsLoading ? (
                <SelectItem value="loading" disabled>⏳ Caricamento...</SelectItem>
              ) : teamsData && teamsData.length > 0 ? (
                teamsData.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name} {team.department && `(${team.department})`}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-teams" disabled>⚠️ Nessun team disponibile</SelectItem>
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            💡 Tip: Puoi anche usare variabili come <code className="bg-gray-100 px-1 rounded">{'{{teamId}}'}</code>
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose}>Annulla</Button>
        <Button onClick={handleSave} className="bg-gradient-to-r from-windtre-orange to-windtre-purple text-white">
          💾 Salva
        </Button>
      </div>
    </div>
  );
}

/**
 * 👤 User Assignment Configuration
 */
function UserAssignmentConfig({ node, onSave, onClose }: { node: Node; onSave: (nodeId: string, config: any) => void; onClose: () => void }) {
  const config = (node.data.config || {}) as any;
  const [userIds, setUserIds] = useState((config.userIds || []).join(', '));
  const [assignmentType, setAssignmentType] = useState(config.assignmentType || 'all');

  const handleSave = useCallback(() => {
    onSave(node.id, {
      userIds: userIds.split(',').map(id => id.trim()).filter(Boolean),
      assignmentType,
      waitForAll: assignmentType === 'all'
    });
    onClose();
  }, [userIds, assignmentType, node.id, onSave, onClose]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          👤 User IDs (separati da virgola)
        </label>
        <textarea 
          value={userIds}
          onChange={(e) => setUserIds(e.target.value)}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg"
          rows={3}
          placeholder="user-id-1, user-id-2, {{userId}}"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          🎯 Tipo Assegnazione
        </label>
        <Select value={assignmentType} onValueChange={setAssignmentType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">👥 Tutti (parallelo)</SelectItem>
            <SelectItem value="any">🎲 Primo disponibile</SelectItem>
            <SelectItem value="sequential">⏭️ Sequenziale</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose}>Annulla</Button>
        <Button onClick={handleSave} className="bg-gradient-to-r from-windtre-orange to-windtre-purple text-white">
          💾 Salva
        </Button>
      </div>
    </div>
  );
}

/**
 * ⚙️ Generic Node Configuration - Fallback Migliorato
 */
function GenericNodeConfig({ node, onSave, onClose }: { node: Node; onSave: (nodeId: string, config: any) => void; onClose: () => void }) {
  const config = node.data.config || {};
  const [title, setTitle] = useState(config.title || '');
  const [description, setDescription] = useState(config.description || '');

  const handleSave = useCallback(() => {
    onSave(node.id, {
      title,
      description
    });
    onClose();
  }, [title, description, node.id, onSave, onClose]);

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <p className="text-sm text-gray-700">
          ⚙️ Configurazione generica per questo tipo di nodo
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          📝 Titolo
        </label>
        <input 
          type="text" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-windtre-orange"
          placeholder="Nome del nodo..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          📄 Descrizione
        </label>
        <textarea 
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-windtre-orange"
          rows={3}
          placeholder="Descrivi cosa fa questo nodo..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose}>Annulla</Button>
        <Button onClick={handleSave} className="bg-gradient-to-r from-windtre-orange to-windtre-purple text-white">
          💾 Salva
        </Button>
      </div>
    </div>
  );
}