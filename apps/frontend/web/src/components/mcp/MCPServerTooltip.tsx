import { Info, Book, Wrench, Shield, Lightbulb, ExternalLink, Copy, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface MCPServerTooltipProps {
  /**
   * Server name for display
   */
  serverName: string;
  
  /**
   * Marketplace template data (optional - needed for enhanced info)
   */
  marketplaceData?: {
    installHints?: {
      envVars?: string[];
      postInstallNotes?: string;
      dependencies?: string[];
    };
    exampleTools?: string[];
    securityNotes?: string;
    repoUrl?: string;
    authType?: string;
    transport?: string;
  };
  
  /**
   * Discovered tools from installed server
   */
  discoveredTools?: Array<{
    name: string;
    description?: string;
  }>;
}

/**
 * 🔌 MCP Server Tooltip Component
 * 
 * Contextual mini-guide for installed MCP servers with tabs:
 * - Setup: Credential sourcing, env vars, OAuth flow
 * - Tools: Available tools with descriptions
 * - Security: Security notes, auth type, transport
 * - Examples: Use cases, documentation links
 * 
 * @example
 * ```tsx
 * <MCPServerTooltip
 *   serverName="Google Workspace"
 *   marketplaceData={marketplaceTemplate}
 *   discoveredTools={server.discoveredTools}
 * />
 * ```
 */
export function MCPServerTooltip({
  serverName,
  marketplaceData,
  discoveredTools = []
}: MCPServerTooltipProps) {
  const [copiedEnvVar, setCopiedEnvVar] = useState<string | null>(null);

  const copyToClipboard = (text: string, envVar: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEnvVar(envVar);
    setTimeout(() => setCopiedEnvVar(null), 2000);
  };

  // If no marketplace data, show minimal tooltip
  if (!marketplaceData) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-[#FF6900]/10"
            data-testid={`button-tooltip-${serverName}`}
          >
            <Info className="h-4 w-4 text-[#FF6900]" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">{serverName}</h4>
            <p className="text-xs text-gray-600">
              Marketplace data not available. View server details for configuration.
            </p>
            {discoveredTools.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-gray-700 mb-1">
                  {discoveredTools.length} tools discovered
                </p>
                <div className="flex flex-wrap gap-1">
                  {discoveredTools.slice(0, 5).map((tool, idx) => (
                    <Badge key={`${tool.name}-${idx}`} variant="secondary" className="text-xs">
                      {tool.name}
                    </Badge>
                  ))}
                  {discoveredTools.length > 5 && (
                    <Badge key="more-tools" variant="secondary" className="text-xs">
                      +{discoveredTools.length - 5} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-[#FF6900]/10"
          data-testid={`button-tooltip-${serverName}`}
        >
          <Info className="h-4 w-4 text-[#FF6900]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 max-h-[500px] overflow-y-auto" align="start">
        <div className="space-y-4">
          {/* Header */}
          <div>
            <h4 className="font-semibold text-sm mb-1">{serverName}</h4>
            <p className="text-xs text-gray-500">Quick Setup & Usage Guide</p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="setup" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="setup" className="text-xs">
                <Book className="h-3 w-3 mr-1" />
                Setup
              </TabsTrigger>
              <TabsTrigger value="tools" className="text-xs">
                <Wrench className="h-3 w-3 mr-1" />
                Tools
              </TabsTrigger>
              <TabsTrigger value="security" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Security
              </TabsTrigger>
              <TabsTrigger value="examples" className="text-xs">
                <Lightbulb className="h-3 w-3 mr-1" />
                Examples
              </TabsTrigger>
            </TabsList>

            {/* Setup Tab */}
            <TabsContent value="setup" className="space-y-3 mt-3">
              <div className="space-y-3">
                {/* Environment Variables */}
                {marketplaceData.installHints?.envVars && marketplaceData.installHints.envVars.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">Required Environment Variables</p>
                    <div className="space-y-1.5">
                      {marketplaceData.installHints.envVars.map(envVar => (
                        <div
                          key={envVar}
                          className="flex items-center justify-between bg-gray-50 rounded px-2 py-1.5 border border-gray-200"
                        >
                          <code className="text-xs font-mono text-gray-800">{envVar}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard(envVar, envVar)}
                            data-testid={`button-copy-${envVar}`}
                          >
                            {copiedEnvVar === envVar ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-gray-500" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dependencies */}
                {marketplaceData.installHints?.dependencies && marketplaceData.installHints.dependencies.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">Dependencies</p>
                    <ul className="space-y-1">
                      {marketplaceData.installHints.dependencies.map((dep, idx) => (
                        <li key={idx} className="text-xs text-gray-600 flex items-start">
                          <span className="text-[#FF6900] mr-1.5">•</span>
                          {dep}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Post-Install Notes */}
                {marketplaceData.installHints?.postInstallNotes && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">Setup Notes</p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                      <p className="text-xs text-blue-900 leading-relaxed">
                        {marketplaceData.installHints.postInstallNotes}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tools Tab */}
            <TabsContent value="tools" className="space-y-3 mt-3">
              <div>
                {discoveredTools.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-600">
                      <span className="font-semibold text-gray-900">{discoveredTools.length}</span> tools available in this server
                    </p>
                    <div className="space-y-2 max-h-[280px] overflow-y-auto">
                      {discoveredTools.map(tool => (
                        <div
                          key={tool.name}
                          className="bg-gradient-to-r from-[#FF6900]/5 to-[#7B2CBF]/5 border border-gray-200 rounded-lg p-2.5"
                        >
                          <code className="text-xs font-mono font-semibold text-gray-900 block mb-1">
                            {tool.name}
                          </code>
                          {tool.description && (
                            <p className="text-xs text-gray-600 leading-relaxed">
                              {tool.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : marketplaceData.exampleTools && marketplaceData.exampleTools.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-600 mb-2">Example tools provided by this server:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {marketplaceData.exampleTools.map((tool, idx) => (
                        <Badge key={`example-${tool}-${idx}`} variant="secondary" className="text-xs font-mono">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">No tools information available</p>
                )}
              </div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-3 mt-3">
              {/* Auth Type */}
              <div>
                <p className="text-xs font-medium text-gray-700 mb-1.5">Authentication</p>
                <Badge variant="outline" className="text-xs">
                  {marketplaceData.authType || 'Unknown'}
                </Badge>
              </div>

              {/* Transport */}
              <div>
                <p className="text-xs font-medium text-gray-700 mb-1.5">Transport Protocol</p>
                <Badge variant="outline" className="text-xs">
                  {marketplaceData.transport === 'stdio' ? 'stdio (Process)' : 'HTTP-SSE (Remote)'}
                </Badge>
              </div>

              {/* Security Notes */}
              {marketplaceData.securityNotes && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-2">Security Notes</p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                    <p className="text-xs text-amber-900 leading-relaxed">
                      {marketplaceData.securityNotes}
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Examples Tab */}
            <TabsContent value="examples" className="space-y-3 mt-3">
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Common Use Cases</p>
                <div className="space-y-2">
                  {/* Special section for Google Tag Manager MCP */}
                  {serverName.toLowerCase().includes('tag manager') || serverName.toLowerCase().includes('gtm') ? (
                    <>
                      <div key="gtm-config" className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-2.5">
                        <p className="text-xs font-semibold text-orange-900 mb-1">
                          🎯 Store Tracking Auto-Configuration
                        </p>
                        <p className="text-xs text-orange-800 leading-relaxed">
                          Quando configuri GA4, Facebook Pixel o TikTok IDs nel modal <strong>Modifica Punto Vendita → Marketing</strong>, questo server crea automaticamente:
                        </p>
                        <ul className="mt-1.5 ml-3 space-y-0.5 text-xs text-orange-800">
                          {['Trigger condizionale per lo store', 'Tag GA4, Facebook Pixel, TikTok', 'Variabili tenant_id e store_id'].map((item, idx) => (
                            <li key={`gtm-item-${idx}`}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div key="gtm-snippet" className="bg-green-50 border border-green-200 rounded-lg p-2.5">
                        <p className="text-xs text-green-900">
                          ✓ Snippet GTM generato automaticamente con tracking IDs
                        </p>
                      </div>
                      <div key="gtm-conversions" className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                        <p className="text-xs text-blue-900">
                          ✓ Enhanced Conversions: email/phone hashati (GDPR-compliant)
                        </p>
                      </div>
                      <div key="gtm-isolation" className="bg-purple-50 border border-purple-200 rounded-lg p-2.5">
                        <p className="text-xs text-purple-900">
                          ✓ Tracciamento isolato per ogni store con trigger separati
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Auto-generated use cases based on server type */}
                      <div key="use-workflow" className="bg-green-50 border border-green-200 rounded-lg p-2.5">
                        <p className="text-xs text-green-900">
                          ✓ Use in workflow automations with the AI Workflow Builder
                        </p>
                      </div>
                      <div key="use-crm" className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                        <p className="text-xs text-blue-900">
                          ✓ Trigger actions from CRM events (lead created, deal closed)
                        </p>
                      </div>
                      <div key="use-multi" className="bg-purple-50 border border-purple-200 rounded-lg p-2.5">
                        <p className="text-xs text-purple-900">
                          ✓ Connect with other MCP servers for multi-service workflows
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Documentation Link */}
              {marketplaceData.repoUrl && (
                <div className="pt-2 border-t">
                  <a
                    href={marketplaceData.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-[#FF6900] hover:text-[#7B2CBF] transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Official Documentation
                  </a>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </PopoverContent>
    </Popover>
  );
}
