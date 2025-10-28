import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { 
  CheckCircle2, 
  AlertCircle, 
  Server,
  Code2,
  Key,
  Activity,
  Copy,
  ExternalLink,
  RefreshCw,
  Settings as SettingsIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ServerDetailsPanelProps {
  open: boolean;
  onClose: () => void;
  serverId: string | null;
}

interface MCPServer {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  status: 'active' | 'configuring' | 'error' | 'disabled';
  category: string;
  sourceType: string;
  installMethod?: string;
  discoveredTools: Array<{
    name: string;
    description?: string;
    inputSchema?: any;
  }>;
  createdAt: string;
}

export function ServerDetailsPanel({ open, onClose, serverId }: ServerDetailsPanelProps) {
  const { toast } = useToast();
  const [copiedTool, setCopiedTool] = useState<string | null>(null);

  // Fetch server details
  const { data: server, isLoading } = useQuery<MCPServer>({
    queryKey: [`/api/mcp/servers/${serverId}`],
    enabled: !!serverId && open,
  });

  const handleCopyToolName = (toolName: string) => {
    navigator.clipboard.writeText(toolName);
    setCopiedTool(toolName);
    toast({
      title: "Copied!",
      description: `Tool name "${toolName}" copied to clipboard`,
    });
    setTimeout(() => setCopiedTool(null), 2000);
  };

  const handleCopySchema = (schema: any) => {
    const schemaStr = JSON.stringify(schema, null, 2);
    navigator.clipboard.writeText(schemaStr);
    toast({
      title: "Schema Copied",
      description: "Tool schema copied to clipboard",
    });
  };

  if (!server && !isLoading) {
    return null;
  }

  const statusConfig = {
    active: {
      color: 'text-green-700',
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: CheckCircle2,
      label: 'Active'
    },
    configuring: {
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: AlertCircle,
      label: 'Needs Config'
    },
    error: {
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: AlertCircle,
      label: 'Error'
    },
    disabled: {
      color: 'text-gray-700',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      icon: AlertCircle,
      label: 'Disabled'
    }
  };

  const status = server ? statusConfig[server.status] : statusConfig.disabled;
  const StatusIcon = status.icon;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#FF6900]/10 to-[#7B2CBF]/10 border border-[#FF6900]/20">
              <Server className="h-5 w-5 text-[#FF6900]" />
            </div>
            {server?.displayName || 'Loading...'}
          </SheetTitle>
          <SheetDescription>
            {server?.description || 'MCP Server Details'}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : server ? (
          <div className="mt-6 space-y-6">
            {/* Server Info */}
            <Card className="p-4 bg-gray-50 border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Status</div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${status.bg} ${status.border} border w-fit`}>
                    <StatusIcon className={`h-4 w-4 ${status.color}`} />
                    <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Category</div>
                  <Badge variant="secondary" className="capitalize">{server.category}</Badge>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Source Type</div>
                  <Badge variant="outline" className="capitalize">
                    {server.sourceType.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Tools Available</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {server.discoveredTools?.length || 0}
                  </div>
                </div>
              </div>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="tools" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="tools">
                  <Code2 className="h-4 w-4 mr-2" />
                  Tools ({server.discoveredTools?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="auth">
                  <Key className="h-4 w-4 mr-2" />
                  Authentication
                </TabsTrigger>
                <TabsTrigger value="usage">
                  <Activity className="h-4 w-4 mr-2" />
                  Usage
                </TabsTrigger>
              </TabsList>

              {/* Tools Tab */}
              <TabsContent value="tools" className="space-y-4 mt-4">
                {server.discoveredTools && server.discoveredTools.length > 0 ? (
                  <div className="space-y-3">
                    {server.discoveredTools.map((tool, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card className="p-4 hover:shadow-md transition-shadow border-gray-200">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-sm font-mono font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                                  {tool.name}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleCopyToolName(tool.name)}
                                  data-testid={`button-copy-tool-${idx}`}
                                >
                                  {copiedTool === tool.name ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5 text-gray-400" />
                                  )}
                                </Button>
                              </div>
                              <p className="text-sm text-gray-600">
                                {tool.description || 'No description available'}
                              </p>
                            </div>
                          </div>

                          {/* Input Schema */}
                          {tool.inputSchema && (
                            <details className="mt-3">
                              <summary className="text-xs font-medium text-gray-700 cursor-pointer hover:text-[#FF6900]">
                                View Input Schema
                              </summary>
                              <div className="mt-2 relative">
                                <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto">
                                  {JSON.stringify(tool.inputSchema, null, 2)}
                                </pre>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute top-2 right-2 h-7 text-xs text-gray-400 hover:text-white"
                                  onClick={() => handleCopySchema(tool.inputSchema)}
                                  data-testid={`button-copy-schema-${idx}`}
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy
                                </Button>
                              </div>
                            </details>
                          )}
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center border-dashed border-2 border-gray-300">
                    <Code2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 mb-2">No tools discovered yet</p>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-3.5 w-3.5 mr-2" />
                      Refresh Discovery
                    </Button>
                  </Card>
                )}
              </TabsContent>

              {/* Authentication Tab */}
              <TabsContent value="auth" className="space-y-4 mt-4">
                <Card className="p-4 border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Authentication Status</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Credentials and connection configuration
                      </p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${status.bg} ${status.border} border`}>
                      <StatusIcon className={`h-4 w-4 ${status.color}`} />
                      <span className={`text-xs font-medium ${status.color}`}>
                        {server.status === 'active' ? 'Configured' : 'Not Configured'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-200">
                      <span className="text-sm text-gray-600">Connection Type</span>
                      <Badge variant="outline" className="capitalize">
                        {server.sourceType === 'npm_package' ? 'OAuth2 / API Key' : 'Custom'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between py-2 border-b border-gray-200">
                      <span className="text-sm text-gray-600">Last Tested</span>
                      <span className="text-sm text-gray-900">Never</span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">Auto-refresh Tokens</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        Enabled
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <SettingsIcon className="h-3.5 w-3.5 mr-2" />
                      Reconfigure
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Activity className="h-3.5 w-3.5 mr-2" />
                      Test Connection
                    </Button>
                  </div>
                </Card>

                <Card className="p-4 bg-amber-50 border-amber-200">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-900 mb-1">Security Notice</h4>
                      <p className="text-xs text-amber-700">
                        Credentials are encrypted at rest and never exposed in logs. 
                        OAuth tokens are automatically refreshed before expiration.
                      </p>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* Usage Tab */}
              <TabsContent value="usage" className="space-y-4 mt-4">
                <Card className="p-4 border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Usage in Workflows</h4>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Active Workflows</span>
                      <span className="text-lg font-semibold text-gray-900">0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Executions (30d)</span>
                      <span className="text-lg font-semibold text-gray-900">0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Success Rate</span>
                      <span className="text-lg font-semibold text-green-600">-</span>
                    </div>
                  </div>

                  <Button className="w-full bg-gradient-to-r from-[#FF6900] to-[#7B2CBF]">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Create Workflow with this Server
                  </Button>
                </Card>

                <Card className="p-4 bg-blue-50 border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Example Usage</h4>
                  <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
                    <pre className="text-xs text-gray-100">
{`// Use this server in a workflow node
{
  "type": "mcp-connector",
  "config": {
    "serverId": "${server.id}",
    "toolName": "${server.discoveredTools?.[0]?.name || 'tool_name'}",
    "input": {
      // Tool-specific parameters
    }
  }
}`}
                    </pre>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
