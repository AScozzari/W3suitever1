/**
 * 🎛️ NODE CONFIGURATION PANEL - BRAND INTERFACE
 * Simplified version with core configurations for template governance
 */

import React, { useState, useCallback } from 'react';
import { Node } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X, Plus, Trash2, Info, Sparkles } from 'lucide-react';

interface NodeConfigPanelProps {
  node: Node | null;
  allNodes: Node[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeId: string, config: any) => void;
}

/**
 * 🎛️ Node Configuration Panel Main Component
 */
export default function NodeConfigPanel({ node, allNodes, isOpen, onClose, onSave }: NodeConfigPanelProps) {
  if (!node) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent 
        className="max-w-3xl max-h-[85vh] overflow-y-auto backdrop-blur-xl bg-gradient-to-br from-white/15 via-white/10 to-white/5 border-2 border-white/30 shadow-2xl ring-1 ring-inset ring-white/20 animate-in fade-in-0 zoom-in-95 duration-200"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="pb-4 border-b border-white/20">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-3 text-xl font-bold bg-gradient-to-r from-windtre-orange to-windtre-purple bg-clip-text text-transparent">
                🎛️ Configurazione Nodo
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-2">
                {String(node.data.label || node.data.id)}
              </DialogDescription>
            </div>
            <Badge variant="outline" className="text-xs font-mono bg-gray-100 px-2 py-1">
              Node ID: {node.id}
            </Badge>
          </div>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {/* AI Decision Node */}
          {node.data.id === 'ai-decision' && (
            <AiDecisionConfig node={node} allNodes={allNodes} onSave={onSave} onClose={onClose} />
          )}
          
          {/* Send Email Node */}
          {node.data.id === 'send-email' && (
            <SendEmailConfig node={node} onSave={onSave} onClose={onClose} />
          )}
          
          {/* Generic Fallback for other nodes */}
          {!['ai-decision', 'send-email'].includes(node.data.id) && (
            <GenericNodeConfig node={node} onSave={onSave} onClose={onClose} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 🎯 NODE SELECTOR COMPONENT
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
            const nodeName = String(node.data.label || node.data.id);
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
 * 🤖 AI DECISION NODE CONFIGURATION
 */
function AiDecisionConfig({ node, allNodes, onSave, onClose }: { node: Node; allNodes: Node[]; onSave: (nodeId: string, config: any) => void; onClose: () => void }) {
  const config = (node.data.config || {}) as any;
  const params = config.parameters || {};
  
  const PROMPT_TEMPLATES = [
    { id: 'approval', name: '✅ Approvazione', prompt: 'Analizza questa richiesta e decidi se approvarla:\n- Importo: {{amount}}\n- Richiedente: {{requester}}\n- Motivazione: {{reason}}\n\nCriteri: approva se importo < 1000€ e motivazione valida.' },
    { id: 'classification', name: '🏷️ Classificazione', prompt: 'Classifica questa richiesta in base a:\n- Tipo: {{type}}\n- Urgenza: {{urgency}}\n- Descrizione: {{description}}\n\nCategorie: urgent/normal/low' },
    { id: 'routing', name: '🔀 Routing', prompt: 'Determina il team corretto per gestire:\n- Cliente: {{customer}}\n- Categoria: {{category}}\n- Problema: {{issue}}\n\nTeam disponibili: support/sales/technical' },
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
  const [defaultPath, setDefaultPath] = useState(config.fallback?.defaultPath || '');

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
      parameters: { maxTokens },
      outputs: outputs.filter(o => o.condition && o.path).map(o => ({
        condition: o.condition,
        path: o.path,
        ...(o.label && { label: o.label })
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

      {/* Max Tokens */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          📏 Lunghezza Risposta (Max Tokens): {maxTokens}
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
        <label className="block text-sm font-medium text-gray-900 mb-2">
          🔀 Mappatura Decisioni → Percorsi
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
 * 📧 SEND EMAIL CONFIGURATION
 */
function SendEmailConfig({ node, onSave, onClose }: { node: Node; onSave: (nodeId: string, config: any) => void; onClose: () => void }) {
  const config = (node.data.config || {}) as any;
  const existingRecipients = Array.isArray(config.to) ? config.to : (config.to ? [config.to] : []);
  const [recipients, setRecipients] = useState<string[]>(existingRecipients.length > 0 ? existingRecipients : ['']);
  const [subject, setSubject] = useState(config.subject || '');
  const [template, setTemplate] = useState(config.template || '');
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
      to: validRecipients,
      subject: subject.trim(),
      template: template.trim(),
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
        <label className="block text-sm font-medium text-gray-900 mb-2">
          👤 Destinatari Email <span className="text-red-500 ml-1">*</span>
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
        <label className="block text-sm font-medium text-gray-900 mb-2">
          📋 Oggetto <span className="text-red-500 ml-1">*</span>
        </label>
        <input 
          type="text" 
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-windtre-orange"
          placeholder="Oggetto dell'email"
          data-testid="input-email-subject"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          📝 Messaggio / Template <span className="text-red-500 ml-1">*</span>
        </label>
        <textarea 
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-windtre-orange bg-white font-mono text-sm"
          rows={8}
          placeholder="Corpo dell'email..."
          data-testid="textarea-email-template"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          🔔 Priorità
        </label>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger data-testid="select-email-priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Bassa</SelectItem>
            <SelectItem value="normal">Normale</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose} data-testid="button-cancel-email">
          Annulla
        </Button>
        <Button 
          onClick={handleSave}
          className="bg-gradient-to-r from-windtre-orange to-windtre-purple text-white hover:shadow-lg"
          data-testid="button-save-email"
        >
          💾 Salva Configurazione
        </Button>
      </div>
    </div>
  );
}

/**
 * 🔧 GENERIC NODE CONFIGURATION (Fallback)
 */
function GenericNodeConfig({ node, onSave, onClose }: { node: Node; onSave: (nodeId: string, config: any) => void; onClose: () => void }) {
  const [nodeName, setNodeName] = useState(String(node.data.label || ''));
  const [description, setDescription] = useState(String(node.data.description || ''));

  const handleSave = useCallback(() => {
    onSave(node.id, {
      label: nodeName,
      description
    });
    onClose();
  }, [nodeName, description, node.id, onSave, onClose]);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          ℹ️ Configurazione base per questo nodo. Configurazioni specializzate saranno aggiunte in futuro.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Nome Nodo
        </label>
        <Input 
          value={nodeName}
          onChange={(e) => setNodeName(e.target.value)}
          placeholder="Nome descrittivo del nodo"
          data-testid="input-node-name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Descrizione
        </label>
        <textarea 
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-windtre-orange"
          rows={4}
          placeholder="Descrizione del nodo"
          data-testid="textarea-node-description"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose}>
          Annulla
        </Button>
        <Button 
          onClick={handleSave}
          className="bg-gradient-to-r from-windtre-orange to-windtre-purple text-white hover:shadow-lg"
        >
          💾 Salva
        </Button>
      </div>
    </div>
  );
}
