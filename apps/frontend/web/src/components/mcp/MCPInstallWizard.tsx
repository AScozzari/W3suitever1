import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Search, 
  ChevronRight, 
  ChevronLeft,
  Download,
  Settings,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Github,
  FileArchive,
  Code2,
  ExternalLink
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface MarketplaceTemplate {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: string;
  language: 'typescript' | 'python';
  packageManager: 'npm' | 'pip';
  authType: string;
  iconUrl?: string;
  officialSupport: boolean;
  exampleTools?: string[];
}

interface MCPInstallWizardProps {
  open: boolean;
  onClose: () => void;
  selectedTemplate?: MarketplaceTemplate;
}

type WizardStep = 'select' | 'install' | 'configure' | 'summary';
type SourceType = 'marketplace' | 'github' | 'zip' | 'code';

interface InstallationProgress {
  status: 'downloading' | 'installing' | 'discovering' | 'complete' | 'error';
  message: string;
  progress: number;
}

interface DiscoveredTool {
  name: string;
  description?: string;
  inputSchema?: any;
}

export function MCPInstallWizard({ open, onClose, selectedTemplate }: MCPInstallWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<WizardStep>('select');
  const [sourceType, setSourceType] = useState<SourceType>('marketplace');
  const [selectedServer, setSelectedServer] = useState<MarketplaceTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Sync selectedTemplate prop to internal state when wizard opens
  useEffect(() => {
    if (open && selectedTemplate) {
      setSelectedServer(selectedTemplate);
      setSourceType('marketplace');
      setCurrentStep('select');
    }
  }, [open, selectedTemplate]);
  
  // Custom source fields
  const [githubUrl, setGithubUrl] = useState('');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [customCode, setCustomCode] = useState('');
  const [customName, setCustomName] = useState('');
  
  // Installation state
  const [installProgress, setInstallProgress] = useState<InstallationProgress>({
    status: 'downloading',
    message: 'Preparing installation...',
    progress: 0
  });
  const [installedServerId, setInstalledServerId] = useState<string | null>(null);
  const [discoveredTools, setDiscoveredTools] = useState<DiscoveredTool[]>([]);
  
  // Configuration state
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // Fetch marketplace templates
  const { data: marketplaceTemplates = [] } = useQuery<MarketplaceTemplate[]>({
    queryKey: ['/api/mcp/marketplace', { search: searchQuery, category: categoryFilter !== 'all' ? categoryFilter : undefined }],
    enabled: sourceType === 'marketplace'
  });

  // Install mutation
  const installMutation = useMutation({
    mutationFn: async (params: any) => {
      // Simulate progress updates
      setInstallProgress({ status: 'downloading', message: 'Downloading package...', progress: 25 });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      setInstallProgress({ status: 'installing', message: 'Installing dependencies...', progress: 50 });
      
      const response = await apiRequest('/api/mcp/servers/install', {
        method: 'POST',
        body: JSON.stringify(params)
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setInstallProgress({ status: 'discovering', message: 'Discovering tools...', progress: 75 });
      
      return response;
    },
    onSuccess: async (data: any) => {
      setInstallProgress({ status: 'complete', message: 'Installation complete!', progress: 100 });
      setInstalledServerId(data.id);
      
      // Fetch discovered tools
      try {
        const toolsResponse = await fetch(`/api/mcp/servers/${data.id}/tools`);
        const toolsData = await toolsResponse.json();
        setDiscoveredTools(toolsData.tools || []);
      } catch (error) {
        console.error('Failed to fetch tools:', error);
      }
      
      // Move to configure step
      setTimeout(() => setCurrentStep('configure'), 1000);
    },
    onError: (error: any) => {
      setInstallProgress({ 
        status: 'error', 
        message: error.message || 'Installation failed', 
        progress: 0 
      });
      toast({
        title: "Installation Failed",
        description: error.message || "Failed to install MCP server",
        variant: "destructive"
      });
    }
  });

  // Configure mutation
  const configureMutation = useMutation({
    mutationFn: async (credentials: Record<string, string>) => {
      return apiRequest(`/api/mcp/servers/${installedServerId}/configure`, {
        method: 'POST',
        body: JSON.stringify({ credentials })
      });
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "MCP server configured successfully"
      });
      setCurrentStep('summary');
      queryClient.invalidateQueries({ queryKey: ['/api/mcp/servers'] });
    },
    onError: (error: any) => {
      toast({
        title: "Configuration Failed",
        description: error.message || "Failed to configure server",
        variant: "destructive"
      });
    }
  });

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      setTestStatus('testing');
      return apiRequest(`/api/mcp/servers/${installedServerId}/test`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      setTestStatus('success');
      toast({
        title: "Connection Test Successful",
        description: "MCP server is working correctly"
      });
    },
    onError: (error: any) => {
      setTestStatus('error');
      toast({
        title: "Connection Test Failed",
        description: error.message || "Failed to connect to server",
        variant: "destructive"
      });
    }
  });

  const handleInstall = () => {
    if (sourceType === 'marketplace' && selectedServer) {
      // NPM package install
      setCurrentStep('install');
      fetch('/api/mcp/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedServer.id
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.server) {
            setInstalledServerId(data.server.id);
            setInstallProgress({ status: 'complete', message: 'Installation complete!', progress: 100 });
            setTimeout(() => setCurrentStep('configure'), 1000);
          } else {
            throw new Error(data.error || 'Installation failed');
          }
        })
        .catch(error => {
          setInstallProgress({ status: 'error', message: error.message, progress: 0 });
          toast({
            title: "Installation Failed",
            description: error.message,
            variant: "destructive"
          });
        });
    } else if (sourceType === 'github' && githubUrl && customName) {
      // GitHub install
      setCurrentStep('install');
      fetch('/api/mcp/install-github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: githubUrl,
          serverName: customName,
          displayName: customName,
          category: 'other'
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.server) {
            setInstalledServerId(data.server.id);
            setInstallProgress({ status: 'complete', message: 'GitHub installation complete!', progress: 100 });
            setTimeout(() => setCurrentStep('configure'), 1000);
          } else {
            throw new Error(data.error || 'Installation failed');
          }
        })
        .catch(error => {
          setInstallProgress({ status: 'error', message: error.message, progress: 0 });
          toast({
            title: "GitHub Installation Failed",
            description: error.message,
            variant: "destructive"
          });
        });
    } else if (sourceType === 'zip' && zipFile && customName) {
      // ZIP upload
      setCurrentStep('install');
      const formData = new FormData();
      formData.append('file', zipFile);
      formData.append('serverName', customName);
      formData.append('displayName', customName);
      formData.append('category', 'other');
      
      fetch('/api/mcp/install-zip', {
        method: 'POST',
        body: formData
      })
        .then(res => res.json())
        .then(data => {
          if (data.server) {
            setInstalledServerId(data.server.id);
            setInstallProgress({ status: 'complete', message: 'ZIP installation complete!', progress: 100 });
            setTimeout(() => setCurrentStep('configure'), 1000);
          } else {
            throw new Error(data.error || 'Installation failed');
          }
        })
        .catch(error => {
          setInstallProgress({ status: 'error', message: error.message, progress: 0 });
          toast({
            title: "ZIP Installation Failed",
            description: error.message,
            variant: "destructive"
          });
        });
    } else if (sourceType === 'code' && customCode && customName) {
      // Custom code install
      setCurrentStep('install');
      fetch('/api/mcp/install-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverName: customName,
          displayName: customName,
          category: 'other',
          code: customCode,
          fileName: 'server.ts'
        })
      })
        .then(res => res.json())
        .then(data => {
          if (data.server) {
            setInstalledServerId(data.server.id);
            setInstallProgress({ status: 'complete', message: 'Code installation complete!', progress: 100 });
            setTimeout(() => setCurrentStep('configure'), 1000);
          } else {
            throw new Error(data.error || 'Installation failed');
          }
        })
        .catch(error => {
          setInstallProgress({ status: 'error', message: error.message, progress: 0 });
          toast({
            title: "Code Installation Failed",
            description: error.message,
            variant: "destructive"
          });
        });
    } else {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
  };

  const handleConfigure = () => {
    configureMutation.mutate(configValues);
  };

  const handleClose = () => {
    setCurrentStep('select');
    setSelectedServer(null);
    setSourceType('marketplace');
    setInstallProgress({ status: 'downloading', message: 'Preparing installation...', progress: 0 });
    setInstalledServerId(null);
    setDiscoveredTools([]);
    setConfigValues({});
    setTestStatus('idle');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-[#FF6900]/10 to-[#7B2CBF]/10 border border-[#FF6900]/20">
              <Package className="h-5 w-5 text-[#FF6900]" />
            </div>
            Install MCP Server
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between px-2 py-4 border-b">
          {['select', 'install', 'configure', 'summary'].map((step, idx) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all
                ${currentStep === step ? 'bg-[#FF6900] border-[#FF6900] text-white' : 
                  ['select', 'install', 'configure', 'summary'].indexOf(currentStep) > idx ? 
                    'bg-green-500 border-green-500 text-white' : 
                    'bg-gray-100 border-gray-300 text-gray-400'}
              `}>
                {['select', 'install', 'configure', 'summary'].indexOf(currentStep) > idx ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span className="text-sm font-medium">{idx + 1}</span>
                )}
              </div>
              <span className={`text-sm ${currentStep === step ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                {step.charAt(0).toUpperCase() + step.slice(1)}
              </span>
              {idx < 3 && <ChevronRight className="h-4 w-4 text-gray-300 ml-2" />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-2">
          <AnimatePresence mode="wait">
            {currentStep === 'select' && (
              <StepSelect
                sourceType={sourceType}
                setSourceType={setSourceType}
                selectedServer={selectedServer}
                setSelectedServer={setSelectedServer}
                marketplaceTemplates={marketplaceTemplates}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                githubUrl={githubUrl}
                setGithubUrl={setGithubUrl}
                zipFile={zipFile}
                setZipFile={setZipFile}
                customName={customName}
                setCustomName={setCustomName}
                customCode={customCode}
                setCustomCode={setCustomCode}
              />
            )}
            {currentStep === 'install' && (
              <StepInstall installProgress={installProgress} />
            )}
            {currentStep === 'configure' && (
              <StepConfigure
                selectedServer={selectedServer}
                configValues={configValues}
                setConfigValues={setConfigValues}
                testStatus={testStatus}
                onTest={() => testMutation.mutate()}
              />
            )}
            {currentStep === 'summary' && (
              <StepSummary
                selectedServer={selectedServer}
                discoveredTools={discoveredTools}
                testStatus={testStatus}
                onClose={handleClose}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t pt-4 px-2">
          <Button
            variant="outline"
            onClick={currentStep === 'select' ? handleClose : () => setCurrentStep('select')}
            disabled={currentStep === 'install' || installMutation.isPending}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {currentStep === 'select' ? 'Cancel' : 'Back'}
          </Button>

          {currentStep === 'select' && (
            <Button
              onClick={handleInstall}
              disabled={
                (sourceType === 'marketplace' && !selectedServer) ||
                (sourceType === 'github' && (!githubUrl || !customName)) ||
                (sourceType === 'zip' && (!zipFile || !customName)) ||
                (sourceType === 'code' && (!customCode || !customName))
              }
              className="bg-gradient-to-r from-[#FF6900] to-[#7B2CBF]"
              data-testid="button-start-install"
            >
              Start Installation
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {currentStep === 'configure' && (
            <Button
              onClick={handleConfigure}
              disabled={configureMutation.isPending}
              className="bg-gradient-to-r from-[#FF6900] to-[#7B2CBF]"
              data-testid="button-save-config"
            >
              {configureMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Configuration
            </Button>
          )}

          {currentStep === 'summary' && (
            <Button
              onClick={handleClose}
              className="bg-gradient-to-r from-[#FF6900] to-[#7B2CBF]"
              data-testid="button-finish-wizard"
            >
              Finish
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Step 1: Select Server
function StepSelect({
  sourceType,
  setSourceType,
  selectedServer,
  setSelectedServer,
  marketplaceTemplates,
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  githubUrl,
  setGithubUrl,
  zipFile,
  setZipFile,
  customName,
  setCustomName,
  customCode,
  setCustomCode
}: any) {
  const { toast } = useToast();
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 py-4"
    >
      <Tabs value={sourceType} onValueChange={setSourceType}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="marketplace">
            <Package className="h-4 w-4 mr-2" />
            Marketplace
          </TabsTrigger>
          <TabsTrigger value="github">
            <Github className="h-4 w-4 mr-2" />
            GitHub
          </TabsTrigger>
          <TabsTrigger value="zip">
            <FileArchive className="h-4 w-4 mr-2" />
            ZIP Upload
          </TabsTrigger>
          <TabsTrigger value="code">
            <Code2 className="h-4 w-4 mr-2" />
            Custom Code
          </TabsTrigger>
        </TabsList>

        {/* Marketplace Tab */}
        <TabsContent value="marketplace" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search marketplace..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-marketplace-wizard"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm"
              data-testid="select-category-wizard"
            >
              <option value="all">All Categories</option>
              <option value="productivity">Productivity</option>
              <option value="communication">Communication</option>
              <option value="storage">Storage</option>
              <option value="database">Database</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
            {marketplaceTemplates.map((template: MarketplaceTemplate) => (
              <div
                key={template.id}
                onClick={() => setSelectedServer(template)}
                className={`
                  p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${selectedServer?.id === template.id
                    ? 'border-[#FF6900] bg-[#FF6900]/5'
                    : 'border-gray-200 hover:border-gray-300'}
                `}
                data-testid={`card-template-${template.id}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  {template.iconUrl ? (
                    <img src={template.iconUrl} alt={template.displayName} className="h-10 w-10 rounded-lg" />
                  ) : (
                    <div className="p-2 rounded-lg bg-gradient-to-br from-[#FF6900]/10 to-[#7B2CBF]/10">
                      <Package className="h-6 w-6 text-[#FF6900]" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{template.displayName}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">{template.language}</Badge>
                      {template.officialSupport && (
                        <Badge className="text-xs bg-green-100 text-green-700">Official</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* GitHub Tab */}
        <TabsContent value="github" className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label>GitHub Repository URL</Label>
              <Input
                placeholder="https://github.com/username/mcp-server"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                data-testid="input-github-url"
              />
            </div>
            <div>
              <Label>Server Name</Label>
              <Input
                placeholder="my-custom-server"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                data-testid="input-custom-name"
              />
            </div>
          </div>
        </TabsContent>

        {/* ZIP Tab */}
        <TabsContent value="zip" className="space-y-4">
          <div>
            <Label>Server Name</Label>
            <Input
              placeholder="my-custom-server"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              data-testid="input-zip-name"
            />
          </div>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <FileArchive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            {zipFile ? (
              <>
                <p className="text-sm font-medium text-gray-900 mb-2">{zipFile.name}</p>
                <p className="text-xs text-gray-500 mb-4">{(zipFile.size / 1024).toFixed(2)} KB</p>
                <Button 
                  variant="outline" 
                  onClick={() => setZipFile(null)}
                  data-testid="button-clear-zip"
                >
                  Clear
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-4">Drag & drop ZIP file or click to browse</p>
                <Button 
                  variant="outline" 
                  onClick={() => document.getElementById('zip-input')?.click()}
                  data-testid="button-select-zip"
                >
                  Select ZIP File
                </Button>
                <input
                  id="zip-input"
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.name.endsWith('.zip')) {
                      setZipFile(file);
                    } else {
                      toast({
                        title: "Invalid File",
                        description: "Please select a ZIP file",
                        variant: "destructive"
                      });
                    }
                  }}
                />
              </>
            )}
          </div>
        </TabsContent>

        {/* Custom Code Tab */}
        <TabsContent value="code" className="space-y-4">
          <div>
            <Label>Server Name</Label>
            <Input
              placeholder="my-custom-server"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              data-testid="input-code-name"
            />
          </div>
          <div>
            <Label>TypeScript/JavaScript Code</Label>
            <Textarea
              placeholder="// Paste your MCP server code here..."
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              className="font-mono text-sm h-64"
              data-testid="textarea-custom-code"
            />
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

// Step 2: Installation Progress
function StepInstall({ installProgress }: { installProgress: InstallationProgress }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col items-center justify-center py-12"
    >
      {installProgress.status === 'error' ? (
        <>
          <div className="p-4 rounded-full bg-red-100 mb-6">
            <AlertCircle className="h-12 w-12 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Installation Failed</h3>
          <p className="text-sm text-gray-500">{installProgress.message}</p>
        </>
      ) : installProgress.status === 'complete' ? (
        <>
          <div className="p-4 rounded-full bg-green-100 mb-6">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Installation Complete!</h3>
          <p className="text-sm text-gray-500">Proceeding to configuration...</p>
        </>
      ) : (
        <>
          <div className="p-4 rounded-full bg-[#FF6900]/10 mb-6">
            <Loader2 className="h-12 w-12 text-[#FF6900] animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{installProgress.message}</h3>
          <div className="w-full max-w-md mt-6">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#FF6900] to-[#7B2CBF] transition-all duration-300"
                style={{ width: `${installProgress.progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">{installProgress.progress}%</p>
          </div>
        </>
      )}
    </motion.div>
  );
}

// Step 3: Configuration
function StepConfigure({ selectedServer, configValues, setConfigValues, testStatus, onTest }: any) {
  const authFields = getAuthFields(selectedServer?.authType);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 py-4"
    >
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Configure Authentication</h3>
        <p className="text-sm text-gray-500">
          Provide credentials for {selectedServer?.displayName || 'the server'}
        </p>
      </div>

      <div className="space-y-4">
        {authFields.map((field) => (
          <div key={field.key}>
            <Label>{field.label}</Label>
            <Input
              type={field.type}
              placeholder={field.placeholder}
              value={configValues[field.key] || ''}
              onChange={(e) => setConfigValues({ ...configValues, [field.key]: e.target.value })}
              data-testid={`input-config-${field.key}`}
            />
            {field.hint && <p className="text-xs text-gray-500 mt-1">{field.hint}</p>}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={onTest}
          disabled={testStatus === 'testing'}
          data-testid="button-test-connection"
        >
          {testStatus === 'testing' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Test Connection
        </Button>
        {testStatus === 'success' && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Connection successful</span>
          </div>
        )}
        {testStatus === 'error' && (
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Connection failed</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Step 4: Summary
function StepSummary({ selectedServer, discoveredTools, testStatus, onClose }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 py-4"
    >
      <div className="text-center">
        <div className="inline-flex p-4 rounded-full bg-green-100 mb-4">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Server Installed Successfully!</h3>
        <p className="text-sm text-gray-500">
          {selectedServer?.displayName} is ready to use in your workflows
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Discovered Tools</h4>
          <div className="flex flex-wrap gap-2">
            {discoveredTools.map((tool: DiscoveredTool, idx: number) => (
              <Badge key={idx} variant="secondary">
                {tool.name}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Connection Status</h4>
          <div className="flex items-center gap-2">
            {testStatus === 'success' ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">Connected and operational</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-700">Not tested</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          <Settings className="h-4 w-4 mr-2" />
          View Settings
        </Button>
        <Button className="flex-1 bg-gradient-to-r from-[#FF6900] to-[#7B2CBF]">
          <ExternalLink className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>
    </motion.div>
  );
}

// Helper to get auth fields based on authType
function getAuthFields(authType: string = 'api_key') {
  switch (authType) {
    case 'oauth2':
      return [
        { key: 'clientId', label: 'Client ID', type: 'text', placeholder: 'Enter client ID' },
        { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'Enter client secret' },
        { key: 'redirectUri', label: 'Redirect URI', type: 'text', placeholder: 'https://...', hint: 'OAuth callback URL' }
      ];
    case 'api_key':
      return [
        { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Enter API key' }
      ];
    case 'connection_string':
      return [
        { key: 'connectionString', label: 'Connection String', type: 'text', placeholder: 'postgresql://...' }
      ];
    default:
      return [];
  }
}
