/**
 * 🎛️ NODE CONFIG FORM HOST
 * 
 * SIMPLIFIED VERSION (v1.0):
 * Fornisce un JSON editor per configurare rapidamente i nodi.
 * Questo approccio funzionale sblocca il workflow mentre pianifichiamo
 * il refactoring completo del NodeConfigPanel.
 * 
 * FUTURE (v2.0):
 * - Estrarre config components dal NodeConfigPanel in registry condiviso
 * - Renderizzare form specifici per ogni tipo di nodo
 * - Registry-based architecture: nodeId → Component
 */

import { useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Check, Settings } from 'lucide-react';

interface NodeConfigFormHostProps {
  node: Node;
  allNodes: Node[];
  edges: Edge[];
  onSave: (nodeId: string, config: unknown) => void;
  onClose: () => void;
}

/**
 * Simplified JSON-based config editor
 * 
 * v1.0: JSON editor per tutti i nodi
 * v2.0: Type-specific forms estratti dal NodeConfigPanel
 */
export default function NodeConfigFormHost({ 
  node,
  allNodes,
  edges,
  onSave,
  onClose 
}: NodeConfigFormHostProps) {
  const [configJson, setConfigJson] = useState(() => 
    JSON.stringify(node.data.config || {}, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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
          <span className="text-xs text-gray-500 font-normal">(editabile)</span>
        </label>
        <Textarea 
          value={configJson}
          onChange={(e) => handleJsonChange(e.target.value)}
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
          className="bg-gradient-to-r from-windtre-orange to-windtre-purple text-white"
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
