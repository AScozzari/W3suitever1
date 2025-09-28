// 🏪 ENTERPRISE WORKFLOW STATE MANAGEMENT
// Zustand store for local workflow editor state (no persistence)
// Templates are now managed via TanStack Query + API

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { Node, Edge, Viewport } from '@xyflow/react';
import { nanoid } from 'nanoid';

// 🔧 SAFE ID GENERATORS - Prevent collision with deterministic IDs
export const generateTemplateId = () => `template-${nanoid()}`;
export const generateNodeId = () => `node-${nanoid()}`;
export const generateEdgeId = () => `edge-${nanoid()}`;
export const generateInstanceId = () => `instance-${nanoid()}`;

// 🎯 WORKFLOW STATE INTERFACE (Local Editor State Only)
interface WorkflowState {
  // Core workflow data (current editing session)
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  
  // Current template being edited (template data from API)
  currentTemplateId: string | null;
  isTemplateDirty: boolean; // Track if current workflow has unsaved changes
  
  // UI state - Local filters and search (NOT persisted)
  selectedNodeId: string | null;
  isRunning: boolean;
  searchTerm: string; // For filtering actions/templates in UI
  selectedCategory: string | null; // For department filtering
  
  // History for undo/redo (local session only)
  history: WorkflowSnapshot[];
  historyIndex: number;
  maxHistorySize: number;
}

// Note: WorkflowTemplate interface moved to useWorkflowTemplates.ts
// Templates are now managed via TanStack Query instead of Zustand

// 🎯 WORKFLOW SNAPSHOT FOR HISTORY
interface WorkflowSnapshot {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  timestamp: string;
  action: string;
}

// 🎯 WORKFLOW ACTIONS INTERFACE (Local Editor Only)
interface WorkflowActions {
  // Core state updates
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setViewport: (viewport: Viewport) => void;
  
  // Node operations
  addNode: (node: Node) => void;
  updateNode: (nodeId: string, updates: Partial<Node>) => void;
  removeNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  
  // Edge operations
  addEdge: (edge: Edge) => void;
  removeEdge: (edgeId: string) => void;
  
  // Template context management (ID only, data comes from TanStack Query)
  setCurrentTemplateId: (templateId: string | null) => void;
  markTemplateDirty: (dirty: boolean) => void;
  loadTemplateDefinition: (definition: { nodes: Node[]; edges: Edge[]; viewport: Viewport }, templateId: string) => void;
  
  // UI state
  setRunning: (isRunning: boolean) => void;
  setSearchTerm: (searchTerm: string) => void;
  setSelectedCategory: (category: string | null) => void;
  
  // History management
  saveSnapshot: (action: string) => void;
  undo: () => boolean;
  redo: () => boolean;
  clearHistory: () => void;
  
  // Batch operations
  replaceWorkflow: (nodes: Node[], edges: Edge[], viewport?: Viewport) => void;
  clearWorkflow: () => void;
  
  // Export/Import (local session only)
  exportWorkflow: () => string;
  importWorkflow: (workflowData: string) => boolean;
}

// 🎯 DEFAULT INITIAL STATE (Local Editor Only)
const INITIAL_STATE: WorkflowState = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  currentTemplateId: null,
  isTemplateDirty: false,
  selectedNodeId: null,
  isRunning: false,
  searchTerm: '', // Initialize empty search
  selectedCategory: null, // Initialize no category filter
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,
};

// 🎯 PROFESSIONAL WORKFLOW STORE WITH ZUSTAND
export const useWorkflowStore = create<WorkflowState & WorkflowActions>()(
  subscribeWithSelector(
    immer((set, get) => ({
        ...INITIAL_STATE,

        // 🔄 CORE STATE UPDATES
        setNodes: (nodes: Node[]) => {
          set((state) => {
            state.nodes = nodes;
            state.isTemplateDirty = true;
          });
        },

        setEdges: (edges: Edge[]) => {
          set((state) => {
            state.edges = edges;
            state.isTemplateDirty = true;
          });
        },

        setViewport: (viewport: Viewport) => {
          set((state) => {
            state.viewport = viewport;
            state.isTemplateDirty = true;
          });
        },

        // 🎯 NODE OPERATIONS
        addNode: (node: Node) => {
          console.log('🏪 STORE: Adding node:', node);
          set((state) => {
            console.log('🏪 BEFORE ADD: nodes count =', state.nodes.length);
            state.nodes.push(node);
            console.log('🏪 AFTER ADD: nodes count =', state.nodes.length);
            state.isTemplateDirty = true;
          });
          console.log('🏪 FINAL STATE: nodes =', get().nodes);
          get().saveSnapshot(`Add node: ${node.data?.label || node.type}`);
        },

        updateNode: (nodeId: string, updates: Partial<Node>) => {
          set((state) => {
            const nodeIndex = state.nodes.findIndex(n => n.id === nodeId);
            if (nodeIndex !== -1) {
              state.nodes[nodeIndex] = { ...state.nodes[nodeIndex], ...updates };
              state.isTemplateDirty = true;
            }
          });
          get().saveSnapshot(`Update node: ${nodeId}`);
        },

        removeNode: (nodeId: string) => {
          set((state) => {
            state.nodes = state.nodes.filter(n => n.id !== nodeId);
            state.edges = state.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
            if (state.selectedNodeId === nodeId) {
              state.selectedNodeId = null;
            }
            state.isTemplateDirty = true;
          });
          get().saveSnapshot(`Remove node: ${nodeId}`);
        },

        selectNode: (nodeId: string | null) => {
          set((state) => {
            state.selectedNodeId = nodeId;
          });
        },

        // 🔗 EDGE OPERATIONS
        addEdge: (edge: Edge) => {
          set((state) => {
            const exists = state.edges.some(e => e.id === edge.id);
            if (!exists) {
              state.edges.push(edge);
              state.isTemplateDirty = true;
            }
          });
          get().saveSnapshot(`Add edge: ${edge.source} → ${edge.target}`);
        },

        removeEdge: (edgeId: string) => {
          set((state) => {
            state.edges = state.edges.filter(e => e.id !== edgeId);
            state.isTemplateDirty = true;
          });
          get().saveSnapshot(`Remove edge: ${edgeId}`);
        },

        // 🏷️ TEMPLATE CONTEXT MANAGEMENT (ID only, data from TanStack Query)
        setCurrentTemplateId: (templateId: string | null) => {
          set((state) => {
            state.currentTemplateId = templateId;
            state.isTemplateDirty = false;
          });
        },

        markTemplateDirty: (dirty: boolean) => {
          set((state) => {
            state.isTemplateDirty = dirty;
          });
        },

        loadTemplateDefinition: (definition: { nodes: Node[]; edges: Edge[]; viewport: Viewport }, templateId: string) => {
          set((state) => {
            state.nodes = structuredClone(definition.nodes);
            state.edges = structuredClone(definition.edges);
            state.viewport = structuredClone(definition.viewport);
            state.currentTemplateId = templateId;
            state.isTemplateDirty = false;
          });
          get().saveSnapshot(`Load template: ${templateId}`);
        },

        // 🎛️ UI STATE
        setRunning: (isRunning: boolean) => {
          set((state) => {
            state.isRunning = isRunning;
          });
        },

        setSearchTerm: (searchTerm: string) => {
          set((state) => {
            state.searchTerm = searchTerm;
          });
        },

        setSelectedCategory: (category: string | null) => {
          set((state) => {
            state.selectedCategory = category;
          });
        },

        // 📚 HISTORY MANAGEMENT
        saveSnapshot: (action: string) => {
          const state = get();
          
          // Safe clone that removes non-serializable properties
          const safeCloneNodes = (nodes: Node[]) => {
            return nodes.map(node => ({
              id: node.id,
              type: node.type,
              position: { ...node.position },
              data: node.data ? { ...node.data } : {},
              selected: node.selected,
              dragging: false,
              draggable: node.draggable,
              selectable: node.selectable,
              connectable: node.connectable,
              deletable: node.deletable
            }));
          };
          
          const safeCloneEdges = (edges: Edge[]) => {
            return edges.map(edge => ({
              id: edge.id,
              source: edge.source,
              target: edge.target,
              type: edge.type,
              animated: edge.animated,
              style: edge.style ? { ...edge.style } : undefined,
              sourceHandle: edge.sourceHandle,
              targetHandle: edge.targetHandle
            }));
          };
          
          const snapshot: WorkflowSnapshot = {
            nodes: safeCloneNodes(state.nodes),
            edges: safeCloneEdges(state.edges),
            viewport: { ...state.viewport },
            timestamp: new Date().toISOString(),
            action,
          };

          set((draft) => {
            // Remove any history after current index
            draft.history = draft.history.slice(0, draft.historyIndex + 1);
            
            // Add new snapshot
            draft.history.push(snapshot);
            
            // Limit history size
            if (draft.history.length > draft.maxHistorySize) {
              draft.history = draft.history.slice(-draft.maxHistorySize);
            }
            
            draft.historyIndex = draft.history.length - 1;
          });
        },

        undo: (): boolean => {
          const state = get();
          if (state.historyIndex > 0) {
            const prevSnapshot = state.history[state.historyIndex - 1];
            set((draft) => {
              draft.nodes = structuredClone(prevSnapshot.nodes);
              draft.edges = structuredClone(prevSnapshot.edges);
              draft.viewport = structuredClone(prevSnapshot.viewport);
              draft.historyIndex = draft.historyIndex - 1;
            });
            return true;
          }
          return false;
        },

        redo: (): boolean => {
          const state = get();
          if (state.historyIndex < state.history.length - 1) {
            const nextSnapshot = state.history[state.historyIndex + 1];
            set((draft) => {
              draft.nodes = structuredClone(nextSnapshot.nodes);
              draft.edges = structuredClone(nextSnapshot.edges);
              draft.viewport = structuredClone(nextSnapshot.viewport);
              draft.historyIndex = draft.historyIndex + 1;
            });
            return true;
          }
          return false;
        },

        clearHistory: () => {
          set((state) => {
            state.history = [];
            state.historyIndex = -1;
          });
        },

        // 🔄 BATCH OPERATIONS
        replaceWorkflow: (nodes: Node[], edges: Edge[], viewport?: Viewport) => {
          set((state) => {
            state.nodes = structuredClone(nodes);
            state.edges = structuredClone(edges);
            if (viewport) {
              state.viewport = structuredClone(viewport);
            }
          });
          get().saveSnapshot('Replace workflow');
        },

        clearWorkflow: () => {
          set((state) => {
            state.nodes = [];
            state.edges = [];
            state.viewport = { x: 0, y: 0, zoom: 1 };
            state.selectedNodeId = null;
            state.currentTemplateId = null;
            state.isTemplateDirty = false;
          });
          get().saveSnapshot('Clear workflow');
        },

        // 📤 EXPORT/IMPORT
        exportWorkflow: (): string => {
          const state = get();
          const exportData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            workflow: {
              nodes: state.nodes,
              edges: state.edges,
              viewport: state.viewport,
            },
            metadata: {
              templateId: state.currentTemplateId,
              nodeCount: state.nodes.length,
              edgeCount: state.edges.length,
            },
          };
          return JSON.stringify(exportData, null, 2);
        },

        importWorkflow: (workflowData: string): boolean => {
          try {
            const parsed = JSON.parse(workflowData);
            if (parsed.workflow && parsed.workflow.nodes && parsed.workflow.edges) {
              get().replaceWorkflow(
                parsed.workflow.nodes,
                parsed.workflow.edges,
                parsed.workflow.viewport
              );
              return true;
            }
            return false;
          } catch (error) {
            console.error('Failed to import workflow:', error);
            return false;
          }
        },
      }))
    )
  );

// 🎯 DERIVED STATE SELECTORS (for performance - local editor state only)
export const useWorkflowNodes = () => useWorkflowStore((state) => state.nodes);
export const useWorkflowEdges = () => useWorkflowStore((state) => state.edges);
export const useWorkflowViewport = () => useWorkflowStore((state) => state.viewport);
export const useWorkflowCurrentTemplateId = () => useWorkflowStore((state) => state.currentTemplateId);
export const useWorkflowIsTemplateDirty = () => useWorkflowStore((state) => state.isTemplateDirty);
// 🛡️ INDIVIDUAL SELECTORS (prevent infinite re-renders)
export const useWorkflowIsRunning = () => useWorkflowStore((state) => state.isRunning);
export const useWorkflowSelectedNodeId = () => useWorkflowStore((state) => state.selectedNodeId);
export const useWorkflowSearchTerm = () => useWorkflowStore((state) => state.searchTerm);
export const useWorkflowSelectedCategory = () => useWorkflowStore((state) => state.selectedCategory);

export const useWorkflowCanUndo = () => useWorkflowStore((state) => state.historyIndex > 0);
export const useWorkflowCanRedo = () => useWorkflowStore((state) => state.historyIndex < state.history.length - 1);
export const useWorkflowHistoryLength = () => useWorkflowStore((state) => state.history.length);

// 🌱 HYDRATION HOOK (No persistence needed - always ready)
export const useWorkflowHasHydrated = () => true; // Local store, always hydrated
export const useWorkflowCurrentAction = () => useWorkflowStore((state) => state.history[state.historyIndex]?.action);