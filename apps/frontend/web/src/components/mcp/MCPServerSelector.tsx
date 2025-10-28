import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Server, RefreshCw } from 'lucide-react';

interface MCPServer {
  id: string;
  name: string;
  displayName: string;
  status: 'active' | 'configuring' | 'error' | 'disabled';
  category: string;
  discoveredTools?: Array<{ name: string }>;
}

interface MCPServerSelectorProps {
  /**
   * Currently selected server ID
   */
  value: string | null;
  
  /**
   * Callback when server selection changes
   */
  onChange: (serverId: string | null, serverName: string | null) => void;
  
  /**
   * Optional: Filter servers by specific tool name
   * If provided, only shows servers that support this tool
   */
  toolName?: string;
  
  /**
   * Placeholder text when no server is selected
   */
  placeholder?: string;
  
  /**
   * Test ID for automation
   */
  testId?: string;
  
  /**
   * Optional: Show only active servers (status === 'active')
   */
  onlyActive?: boolean;
}

/**
 * 🔌 MCP Server Selector Component
 * 
 * Reusable dropdown for selecting MCP servers with:
 * - User-friendly labels (e.g., "Google Workspace (mario@windtre.it)")
 * - Status badges (✅ Active, ⚠️ Needs Config)
 * - Auto-select when only 1 server available
 * - Optional filtering by tool name
 * 
 * @example
 * ```tsx
 * <MCPServerSelector
 *   value={serverId}
 *   onChange={(id, name) => setServerId(id)}
 *   toolName="gmail_send_email" // Optional: filter by tool
 *   placeholder="Select MCP connection"
 * />
 * ```
 */
export function MCPServerSelector({
  value,
  onChange,
  toolName,
  placeholder = "Select MCP connection",
  testId = "select-mcp-server",
  onlyActive = false
}: MCPServerSelectorProps) {
  
  // Fetch all servers OR servers filtered by tool
  const queryKey = toolName 
    ? [`/api/mcp/servers/by-tool/${toolName}`]
    : ['/api/mcp/servers'];
  
  const { data: servers = [], isLoading } = useQuery<MCPServer[]>({
    queryKey,
  });

  // Filter servers if needed
  const filteredServers = onlyActive
    ? servers.filter(s => s.status === 'active')
    : servers;

  // Auto-select when only 1 server available
  useEffect(() => {
    if (filteredServers.length === 1 && !value) {
      const server = filteredServers[0];
      onChange(server.id, server.name);
    }
  }, [filteredServers, value, onChange]);

  // Status configuration
  const getStatusConfig = (status: string) => {
    const configs = {
      active: {
        icon: CheckCircle2,
        color: 'text-green-700',
        bg: 'bg-green-50',
        border: 'border-green-200',
        label: 'Active'
      },
      configuring: {
        icon: AlertCircle,
        color: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        label: 'Needs Config'
      },
      error: {
        icon: AlertCircle,
        color: 'text-red-700',
        bg: 'bg-red-50',
        border: 'border-red-200',
        label: 'Error'
      },
      disabled: {
        icon: AlertCircle,
        color: 'text-gray-700',
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        label: 'Disabled'
      }
    };
    return configs[status as keyof typeof configs] || configs.disabled;
  };

  // Get user-friendly label (e.g., "Google Workspace (mario@windtre.it)")
  const getServerLabel = (server: MCPServer) => {
    // TODO: In future, fetch actual OAuth user email from credentials
    // For now, just show displayName
    return server.displayName;
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
        <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Loading servers...</span>
      </div>
    );
  }

  if (filteredServers.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border border-amber-200 rounded-md bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <span className="text-sm text-amber-900">
          {toolName 
            ? `No MCP servers found for tool "${toolName}". Install one in Settings → MCP.`
            : 'No MCP servers installed. Go to Settings → MCP to install.'}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Select 
        value={value || undefined} 
        onValueChange={(serverId) => {
          const server = filteredServers.find(s => s.id === serverId);
          onChange(serverId, server?.name || null);
        }}
      >
        <SelectTrigger data-testid={testId} className="text-sm">
          <SelectValue placeholder={placeholder}>
            {value && (() => {
              const selectedServer = filteredServers.find(s => s.id === value);
              if (!selectedServer) return placeholder;
              
              const statusConfig = getStatusConfig(selectedServer.status);
              const StatusIcon = statusConfig.icon;
              
              return (
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-gray-400" />
                  <span>{getServerLabel(selectedServer)}</span>
                  <StatusIcon className={`h-3.5 w-3.5 ${statusConfig.color}`} />
                </div>
              );
            })()}
          </SelectValue>
        </SelectTrigger>
        
        <SelectContent>
          {filteredServers.map((server) => {
            const statusConfig = getStatusConfig(server.status);
            const StatusIcon = statusConfig.icon;
            
            return (
              <SelectItem 
                key={server.id} 
                value={server.id}
                data-testid={`option-server-${server.id}`}
              >
                <div className="flex items-center justify-between w-full gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <Server className="h-4 w-4 text-gray-400" />
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{getServerLabel(server)}</span>
                      <span className="text-xs text-gray-500">
                        {server.category} • {server.discoveredTools?.length || 0} tools
                      </span>
                    </div>
                  </div>
                  
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${statusConfig.bg} ${statusConfig.border} border`}>
                    <StatusIcon className={`h-3 w-3 ${statusConfig.color}`} />
                    <span className={`font-medium ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Info: Auto-selected single server */}
      {filteredServers.length === 1 && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          Auto-selected (only 1 server available)
        </p>
      )}

      {/* Warning: Server needs configuration */}
      {value && (() => {
        const selectedServer = filteredServers.find(s => s.id === value);
        if (selectedServer?.status === 'configuring') {
          return (
            <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-900">Configuration Required</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  This server needs authentication setup. Go to Settings → MCP → Details to configure.
                </p>
              </div>
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
}
