import React, { useState, useCallback } from 'react';
import { Node } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';

interface NodeConfigPanelProps {
  node: Node | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeId: string, config: any) => void;
}

/**
 * 🎛️ Node Configuration Panel
 * 
 * Componente separato per evitare hook order violations nel WorkflowBuilder.
 * Gestisce la configurazione di tutti i tipi di nodi in modo sicuro.
 */
export default function NodeConfigPanel({ node, isOpen, onClose, onSave }: NodeConfigPanelProps) {
  if (!node) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="windtre-modal-panel max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-windtre-dark">
            🎛️ Configurazione Nodo: {node.data.title || node.data.id}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Render specific config based on node type */}
          {node.data.id === 'ai-decision' && (
            <AiDecisionConfig node={node} onSave={onSave} onClose={onClose} />
          )}
          
          {node.data.id === 'approve-request' && (
            <ActionNodeConfig node={node} onSave={onSave} onClose={onClose} />
          )}
          
          {/* Default config for other nodes */}
          {!['ai-decision', 'approve-request'].includes(node.data.id) && (
            <DefaultNodeConfig node={node} onSave={onSave} onClose={onClose} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 🤖 AI Decision Node Configuration
 */
function AiDecisionConfig({ node, onSave, onClose }: { node: Node; onSave: (nodeId: string, config: any) => void; onClose: () => void }) {
  // Schema-based defaults to prevent crash on undefined config
  const config = node.data.config || {};
  const fallbackDefaults = config.fallback || { timeout: 30000, defaultPath: 'manual_review' };
  const outputsDefaults = config.outputs || [
    { condition: 'approve', path: 'approve' },
    { condition: 'reject', path: 'reject' },
    { condition: 'escalate', path: 'escalate' }
  ];
  
  const [prompt, setPrompt] = useState(config.prompt || 'Analizza i seguenti dati e prendi una decisione: {{input}}');
  const [outputs, setOutputs] = useState(outputsDefaults);
  const [timeout, setTimeout] = useState(fallbackDefaults.timeout || 30000);
  const [defaultPath, setDefaultPath] = useState(fallbackDefaults.defaultPath || 'manual_review');

  const handleSave = useCallback(() => {
    const updatedConfig = {
      prompt,
      outputs,
      fallback: {
        timeout: Number(timeout),
        defaultPath
      }
    };
    
    onSave(node.id, updatedConfig);
    onClose();
  }, [prompt, outputs, timeout, defaultPath, node.id, onSave, onClose]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-windtre-dark mb-1">
          📝 Prompt AI
        </label>
        <textarea 
          value={prompt} 
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-windtre-orange/50 bg-white/70"
          rows={4}
          placeholder="Scrivi il prompt per l'AI..."
          data-testid="textarea-ai-prompt"
        />
        <p className="text-xs text-gray-600 mt-1">Usa {{input}} per riferimenti ai dati del workflow</p>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-windtre-dark mb-2">
          🔀 Percorsi Decisione
        </label>
        <div className="space-y-2">
          {outputs.map((output: any, index: number) => (
            <div key={output.condition} className="flex items-center gap-2">
              <span className="text-sm w-16 capitalize text-windtre-dark">{output.condition}:</span>
              <input 
                type="text" 
                value={output.path}
                onChange={(e) => setOutputs(prev => 
                  prev.map((o: any, i: number) => i === index ? { ...o, path: e.target.value } : o)
                )}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-windtre-orange/50 bg-white/70"
                placeholder={`Percorso per ${output.condition}`}
                data-testid={`input-output-${output.condition}`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-windtre-dark mb-1">
            ⏱️ Timeout (ms)
          </label>
          <input 
            type="number" 
            value={timeout}
            onChange={(e) => setTimeout(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-windtre-orange/50 bg-white/70"
            min={1000}
            max={300000}
            data-testid="input-ai-timeout"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-windtre-dark mb-1">
            🔄 Percorso Default
          </label>
          <input 
            type="text" 
            value={defaultPath}
            onChange={(e) => setDefaultPath(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-windtre-orange/50 bg-white/70"
            placeholder="manual_review"
            data-testid="input-ai-default-path"
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
 * ⚙️ Action Node Configuration
 */
function ActionNodeConfig({ node, onSave, onClose }: { node: Node; onSave: (nodeId: string, config: any) => void; onClose: () => void }) {
  const config = node.data.config || {};
  const [title, setTitle] = useState(config.title || node.data.title || '');
  const [description, setDescription] = useState(config.description || node.data.description || '');

  const handleSave = useCallback(() => {
    const updatedConfig = {
      title,
      description
    };
    
    onSave(node.id, updatedConfig);
    onClose();
  }, [title, description, node.id, onSave, onClose]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-windtre-dark mb-1">
          📝 Titolo
        </label>
        <input 
          type="text" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-windtre-orange/50 bg-white/70"
          placeholder="Nome dell'azione..."
          data-testid="input-action-title"
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
          placeholder="Descrivi cosa fa questa azione..."
          data-testid="textarea-action-description"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose} data-testid="button-cancel-config">
          Annulla
        </Button>
        <Button 
          onClick={handleSave}
          className="bg-gradient-to-r from-windtre-orange to-windtre-purple text-white hover:shadow-lg"
          data-testid="button-save-action-config"
        >
          💾 Salva Configurazione
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