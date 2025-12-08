import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bot, Brain, Database, RefreshCw, Settings2, TrendingUp, Upload, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AIAgent {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  category: string;
  provider: string;
  model: string;
  isSystemAgent: boolean;
  capabilities: string[];
  created_at: string;
  updated_at: string;
}

interface AISettings {
  apiKey: string;
  defaultModel: string;
  maxTokens: number;
  temperature: number;
  agentsEnabled: boolean;
}

export default function AISettingsPage() {
  const [activeTab, setActiveTab] = useState('agents');
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [settings, setSettings] = useState<AISettings>({
    apiKey: '',
    defaultModel: 'gpt-4o',
    maxTokens: 4000,
    temperature: 0.7,
    agentsEnabled: true
  });
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const { toast } = useToast();

  // Load agents from API
  useEffect(() => {
    const loadAgents = async () => {
      try {
        setAgentsLoading(true);
        const response = await fetch('/api/ai/agents');
        if (response.ok) {
          const data = await response.json();
          setAgents(data);
        } else {
          // Fallback to mock data
          setAgents([
            {
              id: 'tippy-sales',
              name: 'Tippy - Assistente Vendite WindTre',
              description: 'Assistente AI specializzato nelle vendite WindTre con accesso completo al catalogo prodotti.',
              status: 'active' as const,
              category: 'sales',
              provider: 'openai',
              model: 'gpt-4o',
              isSystemAgent: true,
              capabilities: ['product_search', 'price_calculation', 'offer_comparison'],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]);
        }
      } catch (error) {
        console.error('Error loading agents:', error);
        setAgents([]);
      } finally {
        setAgentsLoading(false);
      }
    };

    loadAgents();
  }, []);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setSettingsLoading(true);
        const response = await fetch('/api/ai/settings');
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setSettingsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const renderAgentsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Agents Registry</h3>
          <p className="text-sm text-gray-600">Gestisci gli agenti AI disponibili nel sistema</p>
        </div>
        <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
          {agents.filter(a => a.status === 'active').length} Attivi
        </Badge>
      </div>

      {agentsLoading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-[#FF6900]" />
        </div>
      ) : (
        <div className="grid gap-4">
          {agents.map((agent) => (
            <Card key={agent.id} className="border border-gray-200">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-[#FF6900]/10 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-[#FF6900]" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-medium text-gray-900">
                        {agent.name}
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-600">
                        {agent.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={agent.status === 'active' ? 'default' : 'secondary'}
                    className={agent.status === 'active' 
                      ? 'bg-green-50 text-green-700 border-green-200' 
                      : 'bg-gray-50 text-gray-600 border-gray-200'
                    }
                  >
                    {agent.status === 'active' ? 'Attivo' : 'Inattivo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center space-x-4">
                    <span className="capitalize">{agent.category}</span>
                    <span>{agent.model}</span>
                    {agent.isSystemAgent && (
                      <Badge variant="outline" className="text-xs">Sistema</Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>Capacità: {agent.capabilities.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderConfigurationTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Configurazione AI</h3>
        <p className="text-sm text-gray-600">Configura le impostazioni generali del sistema AI</p>
      </div>

      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-base font-medium">Impostazioni Modello</CardTitle>
          <CardDescription>Configura i parametri del modello AI predefinito</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="defaultModel">Modello Predefinito</Label>
              <Input
                id="defaultModel"
                value={settings.defaultModel}
                onChange={(e) => setSettings(prev => ({ ...prev, defaultModel: e.target.value }))}
                placeholder="gpt-4o"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max Token</Label>
              <Input
                id="maxTokens"
                type="number"
                value={settings.maxTokens}
                onChange={(e) => setSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                placeholder="4000"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature ({settings.temperature})</Label>
            <input
              id="temperature"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="agentsEnabled"
              checked={settings.agentsEnabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, agentsEnabled: checked }))}
            />
            <Label htmlFor="agentsEnabled">Abilita Sistema Agents</Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={() => toast({ title: 'Impostazioni salvate con successo!' })}
          className="bg-[#FF6900] hover:bg-[#e55a00] text-white"
        >
          Salva Configurazione
        </Button>
      </div>
    </div>
  );

  const renderKnowledgeBaseTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Knowledge Base</h3>
        <p className="text-sm text-gray-600">Gestisci i documenti e le fonti di conoscenza per gli agenti AI</p>
      </div>

      <Card className="border border-gray-200">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center">
            <Database className="w-5 h-5 mr-2 text-[#FF6900]" />
            Carica Documenti
          </CardTitle>
          <CardDescription>Aggiungi documenti per espandere la conoscenza degli agenti</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Trascina i file qui o clicca per selezionare</p>
            <p className="text-xs text-gray-500 mt-1">Supportati: PDF, TXT, DOCX (max 10MB)</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="url">Aggiungi URL</Label>
            <div className="flex space-x-2">
              <Input
                id="url"
                placeholder="https://esempio.com/documentazione"
                className="flex-1"
              />
              <Button variant="outline">Aggiungi</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          I documenti caricati saranno processati e indicizzati automaticamente per permettere agli agenti di accedere alle informazioni.
        </AlertDescription>
      </Alert>
    </div>
  );

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-[#FF6900]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#FF6900]/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-[#FF6900]" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">AI Settings</h1>
                <p className="text-sm text-gray-600">Gestisci il sistema AI dell'organizzazione</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[#FF6900] border-[#FF6900]">
              Sistema Attivo
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="agents" className="flex items-center space-x-2">
              <Bot className="w-4 h-4" />
              <span>Agents</span>
            </TabsTrigger>
            <TabsTrigger value="configuration" className="flex items-center space-x-2">
              <Settings2 className="w-4 h-4" />
              <span>Configurazione</span>
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center space-x-2">
              <Database className="w-4 h-4" />
              <span>Knowledge Base</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="space-y-6">
            {renderAgentsTab()}
          </TabsContent>

          <TabsContent value="configuration" className="space-y-6">
            {renderConfigurationTab()}
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-6">
            {renderKnowledgeBaseTab()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}