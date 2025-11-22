/**
 * 🎛️ NODE CONFIG FORM HOST
 * 
 * Registry-based configuration renderer:
 * - Checks config registry for custom components
 * - Falls back to JSON editor if no custom component registered
 * - Supports drag & drop for all config types
 */

import { useState, useRef, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Check, Settings, Target } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import type { DraggedFieldData } from './NodeInspector';
import { getNodeConfigComponent } from './config-registry';

interface NodeConfigFormHostProps {
  node: Node;
  allNodes: Node[];
  edges: Edge[];
  onSave: (nodeId: string, config: unknown) => void;
  onClose: () => void;
}

/**
 * Droppable Textarea - Riceve campi trascinati dall'Input Panel
 */
interface DroppableTextareaProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

function DroppableTextarea({ value, onChange, className, placeholder }: DroppableTextareaProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'config-json-editor',
    data: {
      accept: ['input'] // Accetta drop solo dall'Input panel
    }
  });

  return (
    <div className="relative">
      <Textarea 
        ref={setNodeRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          ${className}
          transition-all duration-200
          ${isOver 
            ? 'ring-4 ring-[#c43e00]/40 border-[#c43e00] bg-[#c43e00]/5 scale-[1.02]' 
            : ''
          }
        `}
        placeholder={placeholder}
        data-testid="droppable-config-json"
      />
      {isOver && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-[#c43e00]/10 rounded-md border-2 border-dashed border-[#c43e00]">
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-[#c43e00] animate-pulse" />
            <span className="text-sm font-semibold text-gray-900">
              Rilascia qui per inserire campo
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Smart config renderer - uses registry or falls back to JSON editor
 */
export default function NodeConfigFormHost({ 
  node,
  allNodes,
  edges,
  onSave,
  onClose 
}: NodeConfigFormHostProps) {
  // Check for custom config component in registry
  const CustomConfigComponent = getNodeConfigComponent(node.data.id as string);

  // If custom component exists, render it
  if (CustomConfigComponent) {
    return (
      <CustomConfigComponent
        node={node}
        allNodes={allNodes}
        edges={edges}
        onSave={onSave}
        onClose={onClose}
      />
    );
  }

  // Otherwise, fall back to JSON editor
  const [configJson, setConfigJson] = useState(() => 
    JSON.stringify(node.data.config || {}, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Sync configJson when node.data.config changes (e.g., from drag & drop)
  useEffect(() => {
    const newConfigJson = JSON.stringify(node.data.config || {}, null, 2);
    if (newConfigJson !== configJson) {
      setConfigJson(newConfigJson);
      setSaved(false);
    }
  }, [node.data.config]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    try {
      const parsedConfig = JSON.parse(configJson);
      onSave(node.id, parsedConfig);
      setSaved(true);
      setJsonError(null);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'JSON non valido');
    }
  };

  const handleJsonChange = (value: string) => {
    setConfigJson(value);
    setSaved(false);
    
    // Validate JSON in real-time
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch {
      // Silent validation - error shown on save
    }
  };

  return (
    <div className="space-y-4">
      {/* Node Info */}
      <Card className="p-4 bg-gradient-to-br from-windtre-orange/5 to-windtre-purple/5 border-white/30">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-white/70 backdrop-blur-sm">
            <Settings className="h-5 w-5 text-windtre-orange" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">
              {String(node.data.name || node.data.title || node.data.id)}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/70 text-gray-600">
                {String(node.data.category || 'node')}
              </span>
              <span className="text-xs text-gray-500 font-mono">
                {node.id}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* JSON Editor */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          📝 Configurazione JSON
          <span className="text-xs text-gray-500 font-normal">(editabile - trascina campi dall'Input Panel)</span>
        </label>
        <DroppableTextarea 
          value={configJson}
          onChange={handleJsonChange}
          className="font-mono text-xs min-h-[300px] bg-white/70 backdrop-blur-sm border-white/30"
          placeholder="{}"
        />
      </div>

      {/* Error Alert */}
      {jsonError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Errore JSON: {jsonError}
          </AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {saved && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <Check className="h-4 w-4" />
          <AlertDescription className="text-sm">
            ✅ Configurazione salvata con successo
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-2">
        <Button
          variant="outline"
          onClick={onClose}
          data-testid="button-cancel-config"
        >
          Annulla
        </Button>
        <Button
          onClick={handleSave}
          size="default"
          className="bg-[#c43e00] hover:bg-[#a33500] text-white font-semibold shadow-md"
          disabled={!!jsonError}
          data-testid="button-save-config"
        >
          💾 Salva Configurazione
        </Button>
      </div>

      {/* Future Enhancement Notice */}
      <Card className="p-3 bg-blue-50/50 border-blue-200/50">
        <p className="text-xs text-blue-700">
          <strong>🚧 Prossimamente (v2.0):</strong> Form specifici per ogni tipo di nodo 
          con validazione automatica e interfaccia guidata.
        </p>
      </Card>
    </div>
  );
}
