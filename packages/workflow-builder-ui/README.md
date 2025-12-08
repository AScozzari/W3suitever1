# @w3suite/workflow-builder-ui

Shared ReactFlow workflow builder components for Brand Interface and W3 Suite tenant apps.

## Features

- **WorkflowCanvas**: Main ReactFlow canvas with dual mode support (Brand/Tenant)
- **NodePalette**: Draggable palette of workflow nodes organized by category
- **Node Components**: Pre-built components for all workflow node types (22 executors)
- **Validation**: Workflow structure and configuration validation
- **Builder Hook**: React hook for managing workflow builder state

## Installation

```bash
pnpm add @w3suite/workflow-builder-ui
```

## Usage

### Basic Workflow Builder

```tsx
import { 
  WorkflowCanvas, 
  NodePalette, 
  workflowNodeTypes,
  useWorkflowBuilder 
} from '@w3suite/workflow-builder-ui';
import '@xyflow/react/dist/style.css';

function MyWorkflowBuilder() {
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    save,
    validate
  } = useWorkflowBuilder({
    onSave: async (payload) => {
      // Save to backend
      await fetch('/api/workflows', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
  });

  return (
    <div className="flex h-screen">
      <NodePalette className="w-64 border-r" />
      
      <WorkflowCanvas
        mode="brand"
        nodeTypes={workflowNodeTypes}
        initialNodes={nodes}
        initialEdges={edges}
        onNodesChange={setNodes}
        onEdgesChange={setEdges}
        className="flex-1"
      />
    </div>
  );
}
```

### Tenant Mode (Locked Templates)

```tsx
<WorkflowCanvas
  mode="tenant"
  nodeTypes={workflowNodeTypes}
  initialNodes={templateNodes}
  initialEdges={templateEdges}
  readOnly
  className="flex-1"
/>
```

## Components

### WorkflowCanvas

Main ReactFlow canvas for workflow building.

**Props:**
- `mode`: 'brand' | 'tenant' - Builder mode
- `nodeTypes`: NodeTypes - ReactFlow node types configuration
- `initialNodes`: WorkflowNode[] - Initial nodes
- `initialEdges`: WorkflowEdge[] - Initial edges
- `readOnly`: boolean - Disable editing
- `onNodesChange`: (nodes) => void - Nodes change callback
- `onEdgesChange`: (edges) => void - Edges change callback

### NodePalette

Draggable palette of workflow nodes.

**Props:**
- `onNodeSelect`: (node) => void - Node selection callback
- `disabled`: boolean - Disable palette
- `className`: string - CSS classes

### Node Components

All workflow node types are pre-built and exported:

- StartNode, EndNode
- ActionNode, ApprovalNode
- DecisionNode, AIDecisionNode
- RoutingNode, TriggerNode
- CampaignLeadIntakeNode, PipelineAssignmentNode
- Funnel nodes (5 types)
- Control flow nodes (3 types)

### useWorkflowBuilder Hook

React hook for managing workflow builder state.

**Returns:**
- `nodes`, `edges` - Current workflow state
- `addNode`, `updateNode`, `removeNode` - Node operations
- `addEdge`, `removeEdge` - Edge operations
- `validate` - Validate workflow
- `save` - Save workflow
- `reset` - Reset to initial state
- `isDirty`, `isSaving` - State flags

## Node Palette Categories

1. **Triggers**: Start, Form Trigger, Task Trigger
2. **Actions**: Send Email, Approval Request, Auto Approval
3. **Decisions**: Decision, AI Decision, Switch Case
4. **Routing**: Route Lead, Route Deal, Route Customer
5. **Campaign**: Campaign Lead Intake, Pipeline Assignment
6. **Funnel**: 5 funnel-related executors
7. **Control Flow**: While Loop, Parallel Fork, Join Sync
8. **End**: End node

## Validation

```tsx
const validation = validate();

if (!validation.valid) {
  console.log('Errors:', validation.errors);
  console.log('Warnings:', validation.warnings);
}
```

**Validation checks:**
- Start/End node presence
- Disconnected nodes
- Missing executorIds
- Missing configuration
- Cycle detection

## Architecture

### Dual-Mode Support

**Brand Mode**: Full editing capabilities
- Create, edit, delete nodes
- Configure all settings
- Save as templates

**Tenant Mode**: Locked templates with config overrides
- Read-only canvas structure
- Editable node configurations
- Team assignment customization

### Node Structure

```typescript
interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    executorId?: string;
    config?: Record<string, any>;
    locked?: boolean;
    brandTemplateId?: string;
    overrideConfig?: Record<string, any>;
  };
}
```

## Integration with @w3suite/workflow-engine

This package works seamlessly with `@w3suite/workflow-engine`:

```tsx
import { CORE_EXECUTOR_IDS, EXECUTOR_METADATA } from '@w3suite/workflow-engine';
import { NODE_PALETTE, getNodeByExecutorId } from '@w3suite/workflow-builder-ui';

// Map executor metadata to UI nodes
const executorNode = getNodeByExecutorId('email-action-executor');
const metadata = EXECUTOR_METADATA['email-action-executor'];
```

## Advanced Usage

### Custom Node Styling

```tsx
import { BaseNode } from '@w3suite/workflow-builder-ui';

const CustomActionNode = (props) => (
  <BaseNode 
    {...props} 
    icon="⚡" 
    color="blue"
    showConfig={true}
  />
);

const customNodeTypes = {
  ...workflowNodeTypes,
  'custom-action': CustomActionNode
};
```

### Workflow Validation

```tsx
import { validateWorkflow } from '@w3suite/workflow-builder-ui';

function MyBuilder() {
  const { nodes, edges, validate } = useWorkflowBuilder();

  const handleSave = async () => {
    const result = validate();
    
    if (!result.valid) {
      // Show errors
      result.errors.forEach(error => {
        console.error(`Node ${error.nodeId}: ${error.message}`);
      });
      return;
    }

    // Show warnings
    result.warnings.forEach(warning => {
      console.warn(`${warning.severity}: ${warning.message}`);
    });

    // Proceed with save
  };
}
```

### Brand Template Creation

```tsx
import { WorkflowCanvas, NodePalette } from '@w3suite/workflow-builder-ui';

function BrandTemplateBuilder() {
  const { nodes, edges, save } = useWorkflowBuilder({
    onSave: async (payload) => {
      const response = await fetch('/api/brand/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          is_template: true,
          target_entity: 'campaign'
        })
      });
      
      if (!response.ok) throw new Error('Save failed');
      
      const { workflow_id } = await response.json();
      console.log('Template created:', workflow_id);
    }
  });

  return (
    <div className="flex h-screen">
      <NodePalette className="w-64" />
      <WorkflowCanvas mode="brand" nodeTypes={workflowNodeTypes} />
    </div>
  );
}
```

### Tenant Override Configuration

```tsx
function TenantWorkflowEditor({ templateWorkflow }) {
  const [overrides, setOverrides] = useState({});

  const handleConfigOverride = (nodeId, config) => {
    setOverrides(prev => ({
      ...prev,
      [nodeId]: { ...prev[nodeId], ...config }
    }));
  };

  return (
    <div className="flex">
      <WorkflowCanvas
        mode="tenant"
        initialNodes={templateWorkflow.nodes}
        initialEdges={templateWorkflow.edges}
        readOnly
      />
      
      <ConfigPanel
        selectedNode={selectedNode}
        onConfigChange={handleConfigOverride}
        allowedFields={['teamId', 'userId', 'emailTo']}
      />
    </div>
  );
}
```

### Node Configuration Schema

Each executor node supports different configuration fields:

```typescript
// Email Action Executor
{
  executorId: 'email-action-executor',
  config: {
    to: 'user@example.com',
    subject: 'Workflow Notification',
    template: 'workflow_complete',
    from: 'noreply@w3suite.com' // Overridable
  }
}

// Approval Action Executor
{
  executorId: 'approval-action-executor',
  config: {
    approverRole: 'manager',
    teamId: 'team-uuid', // Overridable
    timeout: 86400, // 24 hours
    autoReject: false
  }
}

// AI Decision Executor
{
  executorId: 'ai-decision-executor',
  config: {
    model: 'gpt-4o',
    systemPrompt: 'Evaluate lead quality...',
    teamId: 'team-uuid', // Overridable
    confidenceThreshold: 0.8
  }
}

// Lead Routing Executor
{
  executorId: 'lead-routing-executor',
  config: {
    routingStrategy: 'round-robin',
    teamId: 'sales-team-uuid', // Overridable
    fallbackTeamId: 'default-team-uuid'
  }
}
```

## Troubleshooting

### Issue: Nodes not appearing in palette

**Solution**: Ensure you've imported the ReactFlow styles:

```tsx
import '@xyflow/react/dist/style.css';
```

### Issue: Workflow validation fails

**Common causes**:
- Missing Start node
- Nodes without executorId
- Disconnected nodes
- Circular dependencies

**Debug**:
```tsx
const validation = validate();
console.log('Errors:', validation.errors);
console.log('Warnings:', validation.warnings);
```

### Issue: Locked nodes still editable in tenant mode

**Solution**: Ensure `readOnly` prop is set on WorkflowCanvas:

```tsx
<WorkflowCanvas mode="tenant" readOnly={true} />
```

**Note**: When `mode="tenant"` or `readOnly={true}`, the following protections are automatically applied:
- Nodes are not draggable
- Nodes are not connectable
- Handles are visually disabled (opacity: 0.3, cursor: not-allowed)
- Lock icon (🔒) appears on all nodes
- Yellow banner displays at top-right

### Issue: Custom config not persisting

**Solution**: Use controlled state and handle onChange events:

```tsx
const { nodes, setNodes } = useWorkflowBuilder();

const updateNodeConfig = (nodeId, newConfig) => {
  setNodes(prev => prev.map(n => 
    n.id === nodeId 
      ? { ...n, data: { ...n.data, config: newConfig }}
      : n
  ));
};
```

## Performance Considerations

- **Large Workflows** (100+ nodes): Use `fitView` sparingly
- **Real-time Updates**: Debounce onChange handlers (300ms recommended)
- **Validation**: Run validation on save, not on every change
- **Node Rendering**: Use React.memo for custom node components

## Type Safety

All types are fully typed with TypeScript:

```typescript
import type { 
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeData,
  WorkflowNodeType,
  BuilderMode,
  WorkflowValidationResult
} from '@w3suite/workflow-builder-ui';
```

## Integration Patterns

### With TanStack Query

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function WorkflowBuilderWithQuery() {
  const queryClient = useQueryClient();

  const { data: workflow } = useQuery({
    queryKey: ['/api/workflows', workflowId],
    queryFn: async () => {
      const res = await fetch(`/api/workflows/${workflowId}`);
      return res.json();
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workflows'] });
    }
  });

  const { save } = useWorkflowBuilder({
    initialNodes: workflow?.nodes,
    initialEdges: workflow?.edges,
    onSave: saveMutation.mutateAsync
  });
}
```

### With React Hook Form

```tsx
import { useForm } from 'react-hook-form';

function WorkflowBuilderForm() {
  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
      workflow: { nodes: [], edges: [] }
    }
  });

  const { nodes, edges } = useWorkflowBuilder();

  const onSubmit = async (data) => {
    await fetch('/api/workflows', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        workflow: { nodes, edges }
      })
    });
  };
}
```

## API Reference

### WorkflowCanvas Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `mode` | `'brand' \| 'tenant'` | ✅ | Builder mode |
| `nodeTypes` | `NodeTypes` | ✅ | ReactFlow node types |
| `initialNodes` | `WorkflowNode[]` | ❌ | Initial nodes |
| `initialEdges` | `WorkflowEdge[]` | ❌ | Initial edges |
| `readOnly` | `boolean` | ❌ | Disable editing |
| `onNodesChange` | `(nodes) => void` | ❌ | Nodes change callback |
| `onEdgesChange` | `(edges) => void` | ❌ | Edges change callback |

### NodePalette Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onNodeSelect` | `(node) => void` | ❌ | Node selection callback |
| `disabled` | `boolean` | ❌ | Disable palette |
| `className` | `string` | ❌ | CSS classes |

### useWorkflowBuilder Hook

**Options**:
```typescript
interface UseWorkflowBuilderOptions {
  initialNodes?: WorkflowNode[];
  initialEdges?: WorkflowEdge[];
  onSave?: (payload: WorkflowSavePayload) => Promise<void>;
}
```

**Returns**:
```typescript
{
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNode: WorkflowNode | null;
  isSaving: boolean;
  isDirty: boolean;
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  setSelectedNode: (node: WorkflowNode | null) => void;
  addNode: (node: WorkflowNode) => void;
  updateNode: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (edge: WorkflowEdge) => void;
  removeEdge: (edgeId: string) => void;
  validate: () => WorkflowValidationResult;
  save: (name: string, description?: string) => Promise<void>;
  reset: () => void;
}
```

## Contributing

This is an internal W3 Suite package. For questions or issues, contact the platform team.

## License

UNLICENSED - Internal W3 Suite package
