// 🏪 ENTERPRISE WORKFLOW STATE MANAGEMENT
// Zustand store for professional workflow builder state persistence

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { Node, Edge, Viewport } from 'reactflow';
import { nanoid } from 'nanoid';

// 🔧 SAFE ID GENERATORS - Prevent collision with deterministic IDs
export const generateTemplateId = () => `template-${nanoid()}`;
export const generateNodeId = () => `node-${nanoid()}`;
export const generateEdgeId = () => `edge-${nanoid()}`;
export const generateInstanceId = () => `instance-${nanoid()}`;

// 🎯 WORKFLOW STATE INTERFACE
interface WorkflowState {
  // Core workflow data
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  
  // Hydration state
  hasHydrated: boolean;
  hasBootstrapped: boolean; // 🛡️ Prevent duplicate template seeding
  
  // Template management
  templates: WorkflowTemplate[];
  currentTemplate: WorkflowTemplate | null;
  
  // UI state
  selectedNodeId: string | null;
  isRunning: boolean;
  searchTerm: string;
  selectedCategory: string | null;
  
  // History for undo/redo
  history: WorkflowSnapshot[];
  historyIndex: number;
  maxHistorySize: number;
}

// 🎯 WORKFLOW TEMPLATE INTERFACE
interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sales' | 'finance' | 'marketing' | 'support' | 'operations';
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  createdAt: string;
  updatedAt: string;
  version: number;
  tags: string[];
  isPublic: boolean;
  createdBy: string;
}

// 🎯 WORKFLOW SNAPSHOT FOR HISTORY
interface WorkflowSnapshot {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  timestamp: string;
  action: string;
}

// 🎯 WORKFLOW ACTIONS INTERFACE
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
  
  // Template management
  saveTemplate: (name: string, description: string, category: WorkflowTemplate['category']) => void;
  loadTemplate: (templateId: string) => void;
  deleteTemplate: (templateId: string) => void;
  duplicateTemplate: (templateId: string) => void;
  bootstrapDefaultTemplates: (templates: WorkflowTemplate[]) => void; // 🛡️ Safe template seeding
  
  // UI state
  setRunning: (isRunning: boolean) => void;
  setSearchTerm: (term: string) => void;
  setSelectedCategory: (category: string | null) => void;
  
  // History management
  saveSnapshot: (action: string) => void;
  undo: () => boolean;
  redo: () => boolean;
  clearHistory: () => void;
  
  // Batch operations
  replaceWorkflow: (nodes: Node[], edges: Edge[], viewport?: Viewport) => void;
  clearWorkflow: () => void;
  
  // Export/Import
  exportWorkflow: () => string;
  importWorkflow: (workflowData: string) => boolean;
}

// 🎯 DEFAULT INITIAL STATE
const INITIAL_STATE: WorkflowState = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  hasHydrated: false,
  hasBootstrapped: false, // 🛡️ Prevent duplicate template seeding
  templates: [],
  currentTemplate: null,
  selectedNodeId: null,
  isRunning: false,
  searchTerm: '',
  selectedCategory: null,
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,
};

// 🎯 PROFESSIONAL WORKFLOW STORE WITH ZUSTAND
export const useWorkflowStore = create<WorkflowState & WorkflowActions>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        ...INITIAL_STATE,

        // 🔄 CORE STATE UPDATES
        setNodes: (nodes: Node[]) => {
          set((state) => {
            state.nodes = nodes;
          });
        },

        setEdges: (edges: Edge[]) => {
          set((state) => {
            state.edges = edges;
          });
        },

        setViewport: (viewport: Viewport) => {
          set((state) => {
            state.viewport = viewport;
          });
        },

        // 🎯 NODE OPERATIONS
        addNode: (node: Node) => {
          set((state) => {
            state.nodes.push(node);
          });
          get().saveSnapshot(`Add node: ${node.data?.label || node.type}`);
        },

        updateNode: (nodeId: string, updates: Partial<Node>) => {
          set((state) => {
            const nodeIndex = state.nodes.findIndex(n => n.id === nodeId);
            if (nodeIndex !== -1) {
              state.nodes[nodeIndex] = { ...state.nodes[nodeIndex], ...updates };
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
            }
          });
          get().saveSnapshot(`Add edge: ${edge.source} → ${edge.target}`);
        },

        removeEdge: (edgeId: string) => {
          set((state) => {
            state.edges = state.edges.filter(e => e.id !== edgeId);
          });
          get().saveSnapshot(`Remove edge: ${edgeId}`);
        },

        // 📋 TEMPLATE MANAGEMENT
        saveTemplate: (name: string, description: string, category: WorkflowTemplate['category']) => {
          const state = get();
          const template: WorkflowTemplate = {
            id: generateTemplateId(),
            name,
            description,
            category,
            nodes: structuredClone(state.nodes),
            edges: structuredClone(state.edges),
            viewport: structuredClone(state.viewport),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1,
            tags: [],
            isPublic: false,
            createdBy: 'current-user', // TODO: Get from auth context
          };

          set((state) => {
            state.templates.push(template);
            state.currentTemplate = template;
          });
        },

        loadTemplate: (templateId: string) => {
          const state = get();
          const template = state.templates.find(t => t.id === templateId);
          if (template) {
            set((state) => {
              state.nodes = structuredClone(template.nodes);
              state.edges = structuredClone(template.edges);
              state.viewport = structuredClone(template.viewport);
              state.currentTemplate = template;
            });
            get().saveSnapshot(`Load template: ${template.name}`);
          }
        },

        deleteTemplate: (templateId: string) => {
          set((state) => {
            state.templates = state.templates.filter(t => t.id !== templateId);
            if (state.currentTemplate?.id === templateId) {
              state.currentTemplate = null;
            }
          });
        },

        duplicateTemplate: (templateId: string) => {
          const state = get();
          const template = state.templates.find(t => t.id === templateId);
          if (template) {
            const duplicate: WorkflowTemplate = {
              ...structuredClone(template),
              id: generateTemplateId(),
              name: `${template.name} (Copy)`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              version: 1,
            };

            set((state) => {
              state.templates.push(duplicate);
            });
          }
        },

        // 🛡️ SAFE TEMPLATE BOOTSTRAP - Prevent duplicate seeding
        bootstrapDefaultTemplates: (templates: WorkflowTemplate[]) => {
          const state = get();
          if (!state.hasHydrated || state.hasBootstrapped) {
            return; // Wait for hydration or already bootstrapped
          }

          const existingIds = new Set(state.templates.map(t => t.id));
          const newTemplates = templates.filter(t => !existingIds.has(t.id));
          
          if (newTemplates.length > 0) {
            set((state) => {
              state.templates.push(...newTemplates);
              state.hasBootstrapped = true;
            });
          } else {
            set((state) => {
              state.hasBootstrapped = true;
            });
          }
        },

        // 🎛️ UI STATE
        setRunning: (isRunning: boolean) => {
          set((state) => {
            state.isRunning = isRunning;
          });
        },

        setSearchTerm: (term: string) => {
          set((state) => {
            state.searchTerm = term;
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
          const snapshot: WorkflowSnapshot = {
            nodes: structuredClone(state.nodes),
            edges: structuredClone(state.edges),
            viewport: structuredClone(state.viewport),
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
            state.currentTemplate = null;
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
              template: state.currentTemplate,
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
      })),
      {
        name: 'w3-workflow-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Persist workflow data and templates
          nodes: state.nodes,
          edges: state.edges,
          templates: state.templates,
          viewport: state.viewport,
          currentTemplate: state.currentTemplate,
          // Don't persist: selectedNodeId, isRunning, history, etc.
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.hasHydrated = true;
          }
        },
        version: 1,
        migrate: (persistedState: any, version: number) => {
          // Handle migration between versions
          if (version === 0) {
            // Migration from v0 to v1
            return {
              ...persistedState,
              templates: persistedState.templates || [],
              viewport: persistedState.viewport || { x: 0, y: 0, zoom: 1 },
            };
          }
          return persistedState;
        },
      }
    )
  )
);

// 🎯 DERIVED STATE SELECTORS (for performance)
export const useWorkflowNodes = () => useWorkflowStore((state) => state.nodes);
export const useWorkflowEdges = () => useWorkflowStore((state) => state.edges);
export const useWorkflowViewport = () => useWorkflowStore((state) => state.viewport);
export const useWorkflowTemplates = () => useWorkflowStore((state) => state.templates);
export const useWorkflowHasHydrated = () => useWorkflowStore((state) => state.hasHydrated);
export const useWorkflowUI = () => useWorkflowStore((state) => ({
  isRunning: state.isRunning,
  searchTerm: state.searchTerm,
  selectedCategory: state.selectedCategory,
  selectedNodeId: state.selectedNodeId,
}));
export const useWorkflowHistory = () => useWorkflowStore((state) => ({
  canUndo: state.historyIndex > 0,
  canRedo: state.historyIndex < state.history.length - 1,
  historyLength: state.history.length,
  currentAction: state.history[state.historyIndex]?.action,
}));