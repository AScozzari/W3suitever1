/**
 * 🎛️ NODE INSPECTOR - N8N-STYLE THREE-PANEL LAYOUT
 * 
 * Componente ispirato a n8n per configurazione e debugging visuale dei nodi workflow.
 * Layout a 3 pannelli: Input (sinistra) | Configuration (centro) | Output (destra)
 * 
 * @features
 * - Input Preview: visualizza dati in arrivo dagli edge upstream
 * - Node Configuration: form di configurazione del nodo (riusa componenti esistenti)
 * - Output Execution: esegue singolo nodo e mostra risultato
 * - Data Views: Schema/Table/JSON per ispezione dettagliata
 * - WindTre Glassmorphism Design
 */

import { useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { 
  Play, 
  Pin, 
  Copy, 
  Table2, 
  Braces, 
  Database,
  ChevronLeft,
  ChevronRight,
  Download,
  Check
} from 'lucide-react';
import NodeConfigFormHost from './NodeConfigFormHost';
import { useExecuteNode, type NodeExecutionResult as BackendExecutionResult } from './hooks/useExecuteNode';
import { useToast } from '@/hooks/use-toast';
import { useWorkflowStore } from '@/stores/workflowStore';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Formato standard per item di workflow (compatibile n8n)
 */
export interface WorkflowItem {
  id: string;
  json: Record<string, unknown>;
  binary?: Record<string, unknown>;
}

/**
 * Execution result di un nodo
 */
export interface NodeExecutionResult {
  nodeId: string;
  success: boolean;
  items: WorkflowItem[];
  executedAt: string;
  executionTime: number;
  error?: string;
}

interface NodeInspectorProps {
  node: Node | null;
  allNodes: Node[];
  edges: Edge[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (nodeId: string, config: unknown) => void;
  workflowId?: string;
}

// ============================================================================
// DATA VIEW TABS COMPONENT
// ============================================================================

type DataViewMode = 'schema' | 'table' | 'json';

interface DataViewTabsProps {
  data: WorkflowItem[];
  title: string;
  emptyMessage?: string;
}

/**
 * 📊 Componente per visualizzare dati in 3 modalità (Schema/Table/JSON)
 */
function DataViewTabs({ data, title, emptyMessage = "Nessun dato disponibile" }: DataViewTabsProps) {
  const [viewMode, setViewMode] = useState<DataViewMode>('schema');

  // Se non ci sono dati, mostra placeholder
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Database className="h-12 w-12 mb-3 opacity-50" />
        <p className="text-sm font-medium">{emptyMessage}</p>
        <p className="text-xs mt-1">Esegui il nodo per vedere i risultati</p>
      </div>
    );
  }

  const itemCount = data.length;
  const firstItem = data[0];

  return (
    <div className="space-y-4">
      {/* Header con conteggio item */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <Badge variant="secondary" className="text-xs bg-gradient-to-r from-windtre-orange to-windtre-purple text-white">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </Badge>
        </div>
      </div>

      {/* Custom Button Group - Alto Contrasto */}
      <div className="grid grid-cols-3 gap-2 p-1.5 bg-gray-100 rounded-lg">
        <Button
          onClick={() => setViewMode('schema')}
          variant={viewMode === 'schema' ? 'default' : 'ghost'}
          size="sm"
          className={`
            relative h-10 text-xs font-semibold transition-all
            ${viewMode === 'schema' 
              ? 'bg-[#c43e00] hover:bg-[#c43e00]/90 text-white shadow-lg ring-2 ring-[#c43e00]/40 font-bold' 
              : 'bg-transparent text-gray-800 hover:bg-white/70 font-medium'
            }
          `}
        >
          <Database className="h-4 w-4 mr-2" />
          Schema
          {viewMode === 'schema' && <Check className="h-3.5 w-3.5 ml-2 absolute right-2" />}
        </Button>

        <Button
          onClick={() => setViewMode('table')}
          variant={viewMode === 'table' ? 'default' : 'ghost'}
          size="sm"
          className={`
            relative h-10 text-xs font-semibold transition-all
            ${viewMode === 'table' 
              ? 'bg-[#c43e00] hover:bg-[#c43e00]/90 text-white shadow-lg ring-2 ring-[#c43e00]/40 font-bold' 
              : 'bg-transparent text-gray-800 hover:bg-white/70 font-medium'
            }
          `}
        >
          <Table2 className="h-4 w-4 mr-2" />
          Table
          {viewMode === 'table' && <Check className="h-3.5 w-3.5 ml-2 absolute right-2" />}
        </Button>

        <Button
          onClick={() => setViewMode('json')}
          variant={viewMode === 'json' ? 'default' : 'ghost'}
          size="sm"
          className={`
            relative h-10 text-xs font-semibold transition-all
            ${viewMode === 'json' 
              ? 'bg-[#c43e00] hover:bg-[#c43e00]/90 text-white shadow-lg ring-2 ring-[#c43e00]/40 font-bold' 
              : 'bg-transparent text-gray-800 hover:bg-white/70 font-medium'
            }
          `}
        >
          <Braces className="h-4 w-4 mr-2" />
          JSON
          {viewMode === 'json' && <Check className="h-3.5 w-3.5 ml-2 absolute right-2" />}
        </Button>
      </div>

      {/* Content area - Conditional Rendering with View Indicator */}
      <Card className="border-2 border-white/30 bg-white/10 backdrop-blur-sm">
        {/* Permanent View Indicator - Always visible */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/20 bg-white/30">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 font-medium">Currently viewing:</span>
            <Badge className="bg-[#c43e00] text-white text-xs font-bold">
              {viewMode === 'schema' && <><Database className="h-3 w-3 mr-1" /> Schema</>}
              {viewMode === 'table' && <><Table2 className="h-3 w-3 mr-1" /> Table</>}
              {viewMode === 'json' && <><Braces className="h-3 w-3 mr-1" /> JSON</>}
            </Badge>
          </div>
        </div>
        
        <ScrollArea className="h-[400px] w-full">
          <div className="p-4">
            {viewMode === 'schema' && <SchemaView data={firstItem} />}
            {viewMode === 'table' && <TableView data={data} />}
            {viewMode === 'json' && <JsonView data={data} />}
          </div>
        </ScrollArea>
      </Card>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="text-xs">
          <Copy className="h-3 w-3 mr-1" />
          Copy Data
        </Button>
        <Button variant="outline" size="sm" className="text-xs">
          <Download className="h-3 w-3 mr-1" />
          Export
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// VIEW RENDERERS
// ============================================================================

/**
 * Schema View: mostra struttura dati con tipi
 */
function SchemaView({ data }: { data: WorkflowItem }) {
  const schema = extractSchema(data.json);

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-gray-700 mb-3 bg-gray-100 px-3 py-2 rounded">
        Data Structure
      </div>
      {Object.entries(schema).map(([key, type]) => (
        <div key={key} className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded transition-colors">
          <span className="font-mono text-sm text-gray-900">{key}</span>
          <Badge variant="outline" className="text-xs font-mono">
            {type}
          </Badge>
        </div>
      ))}
    </div>
  );
}

/**
 * Table View: visualizzazione tabellare responsive
 */
function TableView({ data }: { data: WorkflowItem[] }) {
  if (data.length === 0) return null;

  // Estrai colonne dal primo item
  const columns = Object.keys(data[0].json);

  return (
    <div className="w-full overflow-auto p-4">
      <table className="w-full text-sm border-collapse table-auto">
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b whitespace-nowrap">
              #
            </th>
            {columns.map(col => (
              <th key={col} className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-3 py-2 text-xs text-gray-500 border-b font-mono whitespace-nowrap">
                {idx + 1}
              </td>
              {columns.map(col => {
                const value = formatValue(item.json[col]);
                return (
                  <td 
                    key={col} 
                    className="px-3 py-2 text-xs text-gray-900 border-b font-mono whitespace-nowrap"
                    title={typeof value === 'string' ? value : JSON.stringify(value)}
                  >
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * JSON View: visualizzazione JSON formattata con syntax highlighting
 */
function JsonView({ data }: { data: WorkflowItem[] }) {
  const jsonString = JSON.stringify(data, null, 2);

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="sm" 
        className="absolute top-2 right-2 text-xs z-10"
        onClick={() => navigator.clipboard.writeText(jsonString)}
      >
        <Copy className="h-3 w-3 mr-1" />
        Copy
      </Button>
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs font-mono leading-relaxed">
        <code>{jsonString}</code>
      </pre>
    </div>
  );
}

// ============================================================================
// INPUT PREVIEW PANEL
// ============================================================================

interface InputPreviewPanelProps {
  node: Node;
  edges: Edge[];
  allNodes: Node[];
}

/**
 * 📥 Input Preview Panel - Mostra dati in arrivo dagli edge upstream
 */
function InputPreviewPanel({ node, edges, allNodes }: InputPreviewPanelProps) {
  // Trova edge upstream connesso a questo nodo
  const upstreamEdges = edges.filter(edge => edge.target === node.id);
  const nodeExecutionResults = useWorkflowStore(state => state.nodeExecutionResults);
  
  // Recupera e aggrega execution results da TUTTI i nodi upstream (fan-in support)
  const { inputData, missingUpstreamNodes } = upstreamEdges.length > 0
    ? (() => {
        const aggregatedItems: WorkflowItem[] = [];
        const missing: string[] = [];
        
        upstreamEdges.forEach(edge => {
          const sourceNodeId = edge.source;
          const sourceNode = allNodes.find(n => n.id === sourceNodeId);
          const sourceNodeName = (typeof sourceNode?.data.name === 'string' ? sourceNode.data.name : sourceNodeId);
          const upstreamResults = nodeExecutionResults[sourceNodeId];
          
          if (upstreamResults && upstreamResults.length > 0) {
            // Add provenance metadata to items
            upstreamResults.forEach((item, idx) => {
              aggregatedItems.push({
                id: `${sourceNodeId}_${idx}`,
                json: {
                  ...item.json,
                  __sourceNode: sourceNodeName,
                  __sourceNodeId: sourceNodeId
                }
              });
            });
          } else {
            missing.push(sourceNodeName);
          }
        });
        
        return { inputData: aggregatedItems, missingUpstreamNodes: missing };
      })()
    : { inputData: [], missingUpstreamNodes: [] };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <h2 className="text-sm font-bold text-gray-700">Input Data</h2>
      </div>

      {upstreamEdges.length === 0 ? (
        <Card className="p-6 text-center border-2 border-dashed border-gray-300 bg-gray-50">
          <p className="text-sm text-gray-500">
            Nessun nodo connesso in input
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Collega un nodo per vedere i dati in arrivo
          </p>
        </Card>
      ) : (
        <>
          <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <strong>Connesso a:</strong>{' '}
            {upstreamEdges.map(edge => {
              const sourceNode = allNodes.find(n => n.id === edge.source);
              return sourceNode?.data.name || edge.source;
            }).join(', ')}
          </div>
          
          {inputData.length > 0 && (
            <>
              {missingUpstreamNodes.length > 0 && (
                <div className="text-xs bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                  <p className="text-yellow-800">
                    ⚠️ <strong>Dati parziali:</strong> Mancano risultati da: {missingUpstreamNodes.join(', ')}
                  </p>
                </div>
              )}
              <DataViewTabs 
                data={inputData} 
                title="Dati in Ingresso"
                emptyMessage="In attesa di esecuzione del nodo precedente"
              />
            </>
          )}
          
          {inputData.length === 0 && missingUpstreamNodes.length > 0 && (
            <Card className="p-6 text-center border-2 border-dashed border-orange-300 bg-orange-50">
              <Play className="h-8 w-8 mx-auto mb-2 text-orange-400" />
              <p className="text-sm text-orange-700 font-medium">
                Dati non disponibili
              </p>
              <p className="text-xs text-orange-600 mt-1">
                Esegui {missingUpstreamNodes.length === 1 ? 'il nodo' : 'i nodi'} upstream: {missingUpstreamNodes.join(', ')}
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// OUTPUT EXECUTION PANEL
// ============================================================================

interface OutputExecutionPanelProps {
  node: Node;
  workflowId?: string;
}

/**
 * 📤 Output Execution Panel - Esegue nodo singolo e mostra output
 */
function OutputExecutionPanel({ node }: OutputExecutionPanelProps) {
  const [isPinned, setIsPinned] = useState(false);
  const { toast } = useToast();
  const executeMutation = useExecuteNode(node.id);
  const setNodeExecutionResult = useWorkflowStore(state => state.setNodeExecutionResult);

  const handleExecute = async () => {
    executeMutation.mutate(
      {
        nodeData: {
          id: (typeof node.data.id === 'string' ? node.data.id : node.id),
          type: node.type || 'action',
          category: node.data.category as string,
          config: node.data.config as Record<string, unknown> | undefined
        },
        inputData: {} // TODO: populate from upstream nodes
      },
      {
        onError: (error: any) => {
          toast({
            title: 'Errore Esecuzione Nodo',
            description: error.message || 'Si è verificato un errore durante l\'esecuzione del nodo',
            variant: 'destructive'
          });
        },
        onSuccess: (data) => {
          // Save execution results to store for InputPreviewPanel
          const items = data.items.map((item, idx) => ({
            id: `item_${idx}`,
            json: item
          }));
          setNodeExecutionResult(node.id, items);
          
          toast({
            title: '✅ Esecuzione Completata',
            description: 'Il nodo è stato eseguito con successo',
          });
        }
      }
    );
  };

  // Convert backend format to local format for display
  const executionResult = executeMutation.data
    ? {
        nodeId: executeMutation.data.execution.nodeId,
        success: executeMutation.data.execution.status === 'success',
        items: executeMutation.data.items.map((item, idx) => ({
          id: `item_${idx}`,
          json: item
        })),
        executedAt: executeMutation.data.execution.completedAt,
        executionTime: executeMutation.data.metadata.executionTime
      }
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChevronLeft className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-bold text-gray-700">Output Data</h2>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPinned(!isPinned)}
            className={isPinned ? 'bg-blue-50 border-blue-300' : ''}
            data-testid="button-pin-output"
          >
            <Pin className={`h-3 w-3 ${isPinned ? 'fill-blue-500 text-blue-500' : ''}`} />
          </Button>
          <Button
            variant="default"
            size="default"
            onClick={handleExecute}
            disabled={executeMutation.isPending}
            className="bg-[#c43e00] hover:bg-[#a33500] text-white font-semibold shadow-md"
            data-testid="button-execute-node"
          >
            <Play className="h-4 w-4 mr-2" />
            {executeMutation.isPending ? 'Esecuzione...' : 'Esegui Nodo'}
          </Button>
        </div>
      </div>

      {executionResult && (
        <div className="text-xs bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-green-800">✅ Esecuzione completata</span>
            <Badge variant="secondary" className="text-xs">
              {executionResult.executionTime}ms
            </Badge>
          </div>
          <p className="text-green-700">
            {executionResult.items.length} {executionResult.items.length === 1 ? 'item' : 'items'} generato
          </p>
        </div>
      )}

      {executionResult ? (
        <DataViewTabs 
          data={executionResult.items} 
          title="Risultato Esecuzione"
        />
      ) : (
        <Card className="p-12 text-center border-2 border-dashed border-gray-300 bg-gray-50">
          <Play className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500 font-medium">
            Clicca "Esegui Nodo" per vedere l'output
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Verrà eseguito solo questo nodo con i dati di input correnti
          </p>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// MAIN NODE INSPECTOR SHELL
// ============================================================================

/**
 * 🎛️ Node Inspector Shell - Layout principale a 3 pannelli
 */
export default function NodeInspector({ 
  node, 
  allNodes, 
  edges, 
  isOpen, 
  onClose, 
  onSave,
  workflowId 
}: NodeInspectorProps) {
  if (!node) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent 
        className="max-w-[1600px] w-[95vw] h-[90vh] p-0 backdrop-blur-xl bg-gradient-to-br from-white/95 via-white/90 to-white/85 border-2 border-white/30 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-white/20 bg-white/50 backdrop-blur-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-3 text-xl font-bold bg-gradient-to-r from-windtre-orange to-windtre-purple bg-clip-text text-transparent">
                🎛️ Node Inspector
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600 mt-1">
                {String(node.data.name || node.data.title || node.data.id)}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono bg-white/70 px-2 py-1">
                ID: {node.id}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {String(node.data.category || 'node')}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Three-Panel Layout - Responsive Grid */}
        <div className="grid lg:grid-cols-[minmax(300px,1fr)_minmax(400px,1.5fr)_minmax(300px,1fr)] grid-cols-1 h-[calc(85vh-120px)] lg:divide-x divide-white/20">
          {/* LEFT PANEL - Input Preview */}
          <div className="overflow-y-auto lg:block hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                <InputPreviewPanel 
                  node={node} 
                  edges={edges} 
                  allNodes={allNodes} 
                />
              </div>
            </ScrollArea>
          </div>

          {/* CENTER PANEL - Node Configuration (Always Visible) */}
          <div className="overflow-y-auto bg-white/30 backdrop-blur-sm">
            <ScrollArea className="h-full">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-sm font-bold text-gray-700">⚙️ Configuration</h2>
                </div>
                
                <NodeConfigFormHost 
                  node={node}
                  allNodes={allNodes}
                  edges={edges}
                  onSave={onSave}
                  onClose={onClose}
                />
              </div>
            </ScrollArea>
          </div>

          {/* RIGHT PANEL - Output Execution */}
          <div className="overflow-y-auto lg:block hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                <OutputExecutionPanel 
                  node={node} 
                  workflowId={workflowId} 
                />
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Estrae schema da oggetto JSON
 */
function extractSchema(obj: Record<string, unknown>): Record<string, string> {
  const schema: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === null) {
      schema[key] = 'null';
    } else if (Array.isArray(value)) {
      schema[key] = `array[${value.length}]`;
    } else {
      schema[key] = typeof value;
    }
  }
  
  return schema;
}

/**
 * Formatta valore per visualizzazione in tabella
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
