import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DatabaseOperationConfig from '@/components/workflow/config-components/DatabaseOperationConfig';
import { Node } from '@xyflow/react';

const queryClient = new QueryClient();

export default function TestDatabaseOperation() {
  const [savedConfig, setSavedConfig] = useState<any>(null);
  
  // Test node with white value
  const testNode: Node = {
    id: 'test-node',
    type: 'W3 Data',
    position: { x: 0, y: 0 },
    data: {
      label: 'Database Operation Test',
      nodeType: 'W3 Data',
      subtype: 'DatabaseOperation',
      config: {
        operation: 'SELECT',
        table: 'white', // Testing with the problematic value
      }
    }
  };

  const handleSave = (nodeId: string, config: unknown) => {
    console.log('Saved config:', config);
    setSavedConfig(config);
  };

  const handleClose = () => {
    console.log('Close called');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-100 p-8">
        <h1 className="text-2xl font-bold mb-6">Test Database Operation Component</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl">
          <h2 className="text-lg font-semibold mb-4">Component Test</h2>
          <DatabaseOperationConfig 
            node={testNode}
            allNodes={[testNode]}
            onSave={handleSave}
            onClose={handleClose}
          />
        </div>

        {savedConfig && (
          <div className="mt-6 bg-white rounded-lg shadow-lg p-6 max-w-4xl">
            <h2 className="text-lg font-semibold mb-4">Saved Configuration:</h2>
            <pre className="bg-gray-100 p-4 rounded">
              {JSON.stringify(savedConfig, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </QueryClientProvider>
  );
}