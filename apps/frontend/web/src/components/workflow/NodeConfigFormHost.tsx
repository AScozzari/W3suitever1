/**
 * 🎛️ NODE CONFIG FORM HOST
 * 
 * Wrapper component che riusa tutti i form di configurazione esistenti
 * dal NodeConfigPanel.tsx senza duplicazione di codice.
 * 
 * Questo componente viene embedato nel pannello centrale del NodeInspector.
 */

import { Node, Edge } from '@xyflow/react';

// TODO: Import specific config components from NodeConfigPanel
// For now, we'll use a placeholder that will be replaced with actual forms

interface NodeConfigFormHostProps {
  node: Node;
  allNodes: Node[];
  edges: Edge[];
  onSave: (nodeId: string, config: unknown) => void;
  onClose: () => void;
}

/**
 * Component che renderizza il form di configurazione appropriato per il nodo
 */
export default function NodeConfigFormHost({ 
  node, 
  allNodes, 
  edges,
  onSave,
  onClose 
}: NodeConfigFormHostProps) {
  
  // Placeholder - sarà sostituito con la logica effettiva dei form
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm font-medium text-blue-900 mb-2">
          ⚙️ Configurazione Nodo: {String(node.data.name || node.data.title || node.data.id)}
        </p>
        <p className="text-xs text-blue-700">
          <strong>Tipo:</strong> {String(node.data.category || 'N/A')}
        </p>
        <p className="text-xs text-blue-700">
          <strong>ID:</strong> {node.id}
        </p>
      </div>
      
      <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="font-medium mb-2">📝 Configurazione</p>
        <p className="text-xs">
          I form di configurazione specifici per ogni tipo di nodo verranno integrati qui.
          Al momento stiamo visualizzando il layout a 3 pannelli.
        </p>
        <pre className="text-xs mt-3 bg-white p-2 rounded border overflow-auto">
          {JSON.stringify(node.data.config || {}, null, 2)}
        </pre>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Annulla
        </button>
        <button
          onClick={() => {
            // Salva la configurazione corrente
            onSave(node.id, node.data.config || {});
            onClose();
          }}
          className="px-4 py-2 text-sm text-white bg-gradient-to-r from-windtre-orange to-windtre-purple rounded-lg hover:opacity-90 transition-opacity"
        >
          Salva
        </button>
      </div>
    </div>
  );
}
