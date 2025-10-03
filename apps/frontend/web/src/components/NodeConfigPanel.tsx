import React, { useState, useCallback } from 'react';
import { Node } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
            🎛️ Configurazione Nodo: {String(node.data.title || node.data.id)}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* AI Decision Config */}
          {node.data.id === 'ai-decision' && (
            <AiDecisionConfig node={node} onSave={onSave} onClose={onClose} />
          )}
          
          {/* Approval Action Config */}
          {node.data.id === 'approve-request' && (
            <ActionNodeConfig node={node} onSave={onSave} onClose={onClose} />
          )}
          
          {/* Task Action Configs */}
          {node.data.id === 'create-task' && (
            <TaskCreateConfig node={node} onSave={onSave} onClose={onClose} />
          )}
          
          {node.data.id === 'assign-task' && (
            <TaskAssignConfig node={node} onSave={onSave} onClose={onClose} />
          )}
          
          {node.data.id === 'update-task-status' && (
            <TaskStatusUpdateConfig node={node} onSave={onSave} onClose={onClose} />
          )}
          
          {/* Task Trigger Configs */}
          {['task-created', 'task-status-changed', 'task-assigned'].includes(node.data.id) && (
            <TaskTriggerConfig node={node} onSave={onSave} onClose={onClose} />
          )}
          
          {/* Default JSON config for unmapped nodes */}
          {!['ai-decision', 'approve-request', 'create-task', 'assign-task', 'update-task-status', 'task-created', 'task-status-changed', 'task-assigned'].includes(node.data.id) && (
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
  const config = (node.data.config || {}) as any;
  const fallbackDefaults = config.fallback || { timeout: 30000, defaultPath: 'manual_review' };
  const outputsDefaults = config.outputs || [
    { condition: 'approve', path: 'approve' },
    { condition: 'reject', path: 'reject' },
    { condition: 'escalate', path: 'escalate' }
  ];
  
  const [prompt, setPrompt] = useState(config.prompt || 'Analizza i seguenti dati e prendi una decisione: {{variabile}}');
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
                onChange={(e) => setOutputs((prev: any) => 
                  prev.map((o: any, i: number) => i === index ? { ...o, path: e.target.value } : o)
                )}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-windtre-orange/50 bg-white/70"
                placeholder={`Percorso per ${String(output.condition)}`}
                data-testid={`input-output-${String(output.condition)}`}
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
  const config = (node.data.config || {}) as any;
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
  const [priority, setPriority] = useState(config.filters?.priority || '');
  const [fromStatus, setFromStatus] = useState(config.filters?.fromStatus || '');
  const [toStatus, setToStatus] = useState(config.filters?.toStatus || '');
  const [assignedTo, setAssignedTo] = useState(config.filters?.assignedTo || '');

  const handleSave = useCallback(() => {
    const filters: any = {};
    
    if (department) filters.department = department;
    
    if (eventType === 'task-created') {
      if (priority) filters.priority = priority;
    } else if (eventType === 'task-status-changed') {
      if (fromStatus) filters.fromStatus = fromStatus;
      if (toStatus) filters.toStatus = toStatus;
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
              <SelectItem value="">Tutte</SelectItem>
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
                <SelectItem value="">Qualsiasi</SelectItem>
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
                <SelectItem value="">Qualsiasi</SelectItem>
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