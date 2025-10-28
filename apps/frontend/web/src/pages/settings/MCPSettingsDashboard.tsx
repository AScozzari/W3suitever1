import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Server, 
  Plus, 
  Search,
  Filter,
  Package,
  CheckCircle2,
  AlertCircle,
  Settings,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Types
interface MCPServer {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  status: 'active' | 'configuring' | 'error' | 'disabled';
  category: string;
  iconUrl?: string;
  sourceType: string;
  discoveredTools: Array<{
    name: string;
    description?: string;
  }>;
  createdAt: string;
}

interface MarketplaceTemplate {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: 'productivity' | 'communication' | 'storage' | 'database' | 'payment' | 'analytics' | 'other';
  language: 'typescript' | 'python';
  packageManager: 'npm' | 'pip';
  authType: string;
  iconUrl?: string;
  officialSupport: boolean;
  exampleTools?: string[];
}

// Framer Motion Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.96 },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 18
    }
  }
};

export default function MCPSettingsDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');

  // Fetch installed servers
  const { data: installedServers = [], isLoading: isLoadingServers } = useQuery<MCPServer[]>({
    queryKey: ['/api/mcp/servers'],
  });

  // Fetch marketplace templates
  const { data: marketplaceTemplates = [], isLoading: isLoadingMarketplace } = useQuery<MarketplaceTemplate[]>({
    queryKey: ['/api/mcp/marketplace', { search: searchQuery, category: categoryFilter !== 'all' ? categoryFilter : undefined, language: languageFilter !== 'all' ? languageFilter : undefined }],
  });

  // Filter installed servers by search
  const filteredInstalledServers = installedServers.filter(server =>
    server.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    server.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Count servers by status
  const activeServers = installedServers.filter(s => s.status === 'active').length;
  const configuringServers = installedServers.filter(s => s.status === 'configuring').length;
  const errorServers = installedServers.filter(s => s.status === 'error').length;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#FF6900]/10 to-[#7B2CBF]/10 border border-[#FF6900]/20">
                  <Server className="h-6 w-6 text-[#FF6900]" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    MCP Server Management
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Install and manage Model Context Protocol servers
                  </p>
                </div>
              </div>
            </div>

            {/* Status Summary */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 border border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">{activeServers} Active</span>
              </div>
              {configuringServers > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-700">{configuringServers} Configuring</span>
                </div>
              )}
              {errorServers > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700">{errorServers} Error</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        <Tabs defaultValue="installed" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="installed" className="gap-2">
              <Server className="h-4 w-4" />
              Installed Servers ({installedServers.length})
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="gap-2">
              <Package className="h-4 w-4" />
              Marketplace ({marketplaceTemplates.length})
            </TabsTrigger>
          </TabsList>

          {/* Installed Servers Tab */}
          <TabsContent value="installed" className="space-y-6">
            {/* Search Bar */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search installed servers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-servers"
                />
              </div>
            </div>

            {/* Installed Servers Grid */}
            {isLoadingServers ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading servers...</p>
              </div>
            ) : filteredInstalledServers.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#FF6900]/10 to-[#7B2CBF]/10 mb-4">
                  <Server className="h-8 w-8 text-[#FF6900]" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No MCP Servers Installed
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Get started by installing a server from the marketplace
                </p>
                <Button className="bg-gradient-to-r from-[#FF6900] to-[#7B2CBF]">
                  <Plus className="h-4 w-4 mr-2" />
                  Browse Marketplace
                </Button>
              </Card>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {filteredInstalledServers.map((server) => (
                  <motion.div key={server.id} variants={cardVariants}>
                    <InstalledServerCard server={server} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="space-y-6">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search marketplace..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-marketplace"
                />
              </div>
              
              <select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6900]/20"
                data-testid="select-category-filter"
              >
                <option value="all">All Categories</option>
                <option value="productivity">Productivity</option>
                <option value="communication">Communication</option>
                <option value="storage">Storage</option>
                <option value="database">Database</option>
                <option value="payment">Payment</option>
                <option value="analytics">Analytics</option>
                <option value="other">Other</option>
              </select>

              <select 
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6900]/20"
                data-testid="select-language-filter"
              >
                <option value="all">All Languages</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
              </select>
            </div>

            {/* Marketplace Grid */}
            {isLoadingMarketplace ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading marketplace...</p>
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {marketplaceTemplates.map((template) => (
                  <motion.div key={template.id} variants={cardVariants}>
                    <AvailableServerCard template={template} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Installed Server Card Component (Task 14)
function InstalledServerCard({ server }: { server: MCPServer }) {
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

  const status = statusConfig[server.status];
  const StatusIcon = status.icon;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-gray-200/60 hover:border-[#FF6900]/30 bg-white/80 backdrop-blur-sm">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {server.iconUrl ? (
              <img src={server.iconUrl} alt={server.displayName} className="h-10 w-10 rounded-lg" />
            ) : (
              <div className="p-2 rounded-lg bg-gradient-to-br from-[#FF6900]/10 to-[#7B2CBF]/10 border border-[#FF6900]/20">
                <Server className="h-6 w-6 text-[#FF6900]" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{server.displayName}</h3>
              <p className="text-xs text-gray-500">{server.category}</p>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md ${status.bg} ${status.border} border`}>
            <StatusIcon className={`h-3.5 w-3.5 ${status.color}`} />
            <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
          </div>
        </div>

        {/* Description */}
        {server.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {server.description}
          </p>
        )}

        {/* Tools Count */}
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-1">Discovered Tools</div>
          <div className="text-lg font-semibold text-gray-900">
            {server.discoveredTools?.length || 0}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            data-testid={`button-configure-${server.id}`}
          >
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Configure
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            data-testid={`button-remove-${server.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Available Server Card Component (Task 15)
function AvailableServerCard({ template }: { template: MarketplaceTemplate }) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-gray-200/60 hover:border-[#FF6900]/30 bg-white/80 backdrop-blur-sm">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {template.iconUrl ? (
              <img src={template.iconUrl} alt={template.displayName} className="h-10 w-10 rounded-lg" />
            ) : (
              <div className="p-2 rounded-lg bg-gradient-to-br from-[#FF6900]/10 to-[#7B2CBF]/10 border border-[#FF6900]/20">
                <Package className="h-6 w-6 text-[#FF6900]" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{template.displayName}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="secondary" className="text-xs">{template.language}</Badge>
                {template.officialSupport && (
                  <Badge variant="default" className="text-xs bg-green-100 text-green-700 border-green-200">
                    Official
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-3">
          {template.description}
        </p>

        {/* Example Tools */}
        {template.exampleTools && template.exampleTools.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-2">Example Tools</div>
            <div className="flex flex-wrap gap-1.5">
              {template.exampleTools.slice(0, 3).map((tool, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {tool}
                </Badge>
              ))}
              {template.exampleTools.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{template.exampleTools.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Install Button */}
        <Button 
          className="w-full bg-gradient-to-r from-[#FF6900] to-[#7B2CBF] hover:shadow-md"
          data-testid={`button-install-${template.id}`}
        >
          <Plus className="h-4 w-4 mr-2" />
          Install
        </Button>
      </div>
    </Card>
  );
}
