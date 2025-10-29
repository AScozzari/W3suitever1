import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, Activity, MessageCircle, Brain, Phone,
  Shield, Clock, DollarSign, Eye, EyeOff, Save, Zap,
  BarChart3, Database, Trash2, RefreshCw, AlertTriangle,
  CheckCircle, Users, Lock, Unlock, Upload, Link, CheckSquare,
  ChevronDown, ChevronUp, Globe, Mic, Image, Video, FileUp, FileText,
  TrendingUp, Search
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AISettings {
  tenantId: string;
  openaiModel?: string;
  openaiApiKey?: string;
  apiConnectionStatus?: 'connected' | 'disconnected' | 'error';
  lastConnectionTest?: string;
  connectionTestResult?: any;
  maxTokensPerResponse?: number;
  temperatureDefault?: number;
  featuresEnabled?: {
    chat_assistant?: boolean;
    document_analysis?: boolean;
    financial_forecasting?: boolean;
    web_search?: boolean;
    code_interpreter?: boolean;
  };
  privacySettings?: {
    dataRetentionDays?: number;
    allowDataTraining?: boolean;
    anonymizeConversations?: boolean;
  };
  trainingMode?: boolean;
  trainingSettings?: {
    urlIngestion?: boolean;
    documentProcessing?: boolean;
    imageAnalysis?: boolean;
    audioTranscription?: boolean;
    videoProcessing?: boolean;
    responseValidation?: boolean;
  };
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface AIUsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgResponseTime: number;
}

interface AIUsageLog {
  id: string;
  tenantId: string;
  userId: string;
  featureType: string;
  modelUsed: string;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  costUsd: number;
  responseTimeMs: number;
  success: boolean;
  requestTimestamp: string;
}

interface AIAgent {
  id: string;
  agentId: string;
  name: string;
  description: string;
  systemPrompt: string;
  personality: Record<string, any>;
  moduleContext: string;
  baseConfiguration: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  };
  version: number;
  status: 'active' | 'inactive' | 'deprecated';
  isEnabled?: boolean;
  isLegacy?: boolean;
}

interface Store {
  id: string;
  name: string;
  code: string;
}

interface VoIPTrunk {
  id: string;
  storeId: string;
  provider: string;
  description?: string;
  sipUsername?: string;
  enabled?: boolean;
}

interface VoIPAIConfig {
  id?: string;
  storeId: string;
  trunkId: string;
  enabled: boolean;
  businessHours: {
    [key: string]: { start: string; end: string } | null;
  };
  fallbackExtension?: string;
}

type TabId = 'settings' | 'agents' | 'telephony' | 'conversations' | 'usage';

export default function AISettingsPage() {
  const { toast } = useToast();
  const [expandedTab, setExpandedTab] = useState<TabId | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [userEnteredApiKey, setUserEnteredApiKey] = useState<string | null>(null);
  
  const [selectedAgentForTraining, setSelectedAgentForTraining] = useState<string | null>(null);
  const [agentTrainingModalOpen, setAgentTrainingModalOpen] = useState(false);
  const [agentStoryboardModalOpen, setAgentStoryboardModalOpen] = useState(false);
  const [urlToProcess, setUrlToProcess] = useState('');
  const [processingUrl, setProcessingUrl] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [selectedStoreForVoIP, setSelectedStoreForVoIP] = useState<string>('');
  const [selectedTrunk, setSelectedTrunk] = useState<string>('');
  const [voipConfig, setVoipConfig] = useState<VoIPAIConfig>({
    storeId: '',
    trunkId: '',
    enabled: false,
    businessHours: {
      monday: null,
      tuesday: null,
      wednesday: null,
      thursday: null,
      friday: null,
      saturday: null,
      sunday: null,
    },
    fallbackExtension: '',
  });

  const { data: settings, isLoading: settingsLoading, error: settingsError } = useQuery<{success: boolean, data: AISettings}>({
    queryKey: ['/api/ai/settings'],
    refetchInterval: 30000,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
    retry: 2,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<{success: boolean, data: AIUsageStats}>({
    queryKey: ['/api/ai/usage/stats'],
    refetchInterval: 60000,
  });

  const { data: usageLogs, isLoading: logsLoading } = useQuery<{success: boolean, data: AIUsageLog[]}>({
    queryKey: ['/api/ai/usage/logs'],
    refetchInterval: 30000,
  });

  const { data: conversations, isLoading: conversationsLoading } = useQuery<{success: boolean, data: any[]}>({
    queryKey: ['/api/ai/conversations'],
    refetchInterval: 60000,
    enabled: expandedTab === 'conversations'
  });

  const { data: agentTrainingStats, isLoading: agentTrainingStatsLoading } = useQuery<{success: boolean, data: any}>({
    queryKey: ['/api/ai/agents', selectedAgentForTraining, 'training/stats'],
    refetchInterval: 30000,
    enabled: !!selectedAgentForTraining && agentTrainingModalOpen
  });

  const { data: agentTrainingSessions, isLoading: agentTrainingSessionsLoading } = useQuery<{success: boolean, data: any[]}>({
    queryKey: ['/api/ai/agents', selectedAgentForTraining, 'training/sessions'],
    refetchInterval: 30000,
    enabled: !!selectedAgentForTraining && (agentTrainingModalOpen || agentStoryboardModalOpen)
  });

  const { data: aiAgents, isLoading: aiAgentsLoading } = useQuery<AIAgent[]>({
    queryKey: ['/api/ai/agents'],
    refetchInterval: 60000,
  });

  const { data: stores, isLoading: storesLoading } = useQuery<Store[]>({
    queryKey: ['/api/stores'],
    enabled: expandedTab === 'telephony',
  });

  const { data: trunks, isLoading: trunksLoading } = useQuery<VoIPTrunk[]>({
    queryKey: ['/api/voip/trunks', { storeId: selectedStoreForVoIP }],
    enabled: !!selectedStoreForVoIP && expandedTab === 'telephony',
  });

  const { data: existingVoIPConfig } = useQuery<{success: boolean, data: VoIPAIConfig}>({
    queryKey: ['/api/voip/ai-config', selectedStoreForVoIP],
    enabled: !!selectedStoreForVoIP && expandedTab === 'telephony',
  });

  const toggleAgentMutation = useMutation({
    mutationFn: async ({ agentId, isEnabled }: { agentId: string; isEnabled: boolean }) => {
      return await apiRequest(`/api/ai/agents/${agentId}/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ isEnabled }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Agente aggiornato",
        description: `L'agente è stato ${variables.isEnabled ? 'abilitato' : 'disabilitato'} per questo tenant`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/agents'] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiornare l'agente",
        variant: "destructive",
      });
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<AISettings>) => {
      return await apiRequest('/api/ai/settings', {
        method: 'PUT',
        body: updates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/settings'] });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
    onError: () => setSaveStatus('error'),
  });

  const processAgentUrlMutation = useMutation({
    mutationFn: async ({ agentId, url }: { agentId: string; url: string }) => {
      return await apiRequest(`/api/ai/agents/${agentId}/training/url`, {
        method: 'POST',
        body: { url, extractContent: true },
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/agents', selectedAgentForTraining, 'training/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/agents', selectedAgentForTraining, 'training/sessions'] });
      setUrlToProcess('');
      setProcessingUrl(false);
      
      toast({
        title: "✅ URL Processato con Successo",
        description: `Contenuto estratto: ${data.data?.metadata?.contentLength || 'N/A'} caratteri`,
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      setProcessingUrl(false);
      toast({
        title: "❌ Errore Processamento URL",
        description: error.message,
        variant: "destructive",
        duration: 8000,
      });
    },
  });

  const deleteAgentSessionMutation = useMutation({
    mutationFn: async ({ agentId, sessionId }: { agentId: string; sessionId: string }) => {
      return await apiRequest(`/api/ai/agents/${agentId}/training/sessions/${sessionId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/agents', selectedAgentForTraining, 'training/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/agents', selectedAgentForTraining, 'training/sessions'] });
      
      toast({
        title: "🗑️ Sessione Eliminata",
        description: "La sessione di training è stata eliminata con successo",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Errore Eliminazione",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const uploadMediaMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await apiRequest('/api/ai/training/media', {
        method: 'POST',
        body: formData,
        headers: {}
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/training/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/training/sessions'] });
      setUploadingFile(false);
      setUploadProgress(0);
    },
    onError: () => {
      setUploadingFile(false);
      setUploadProgress(0);
    },
  });

  const saveVoIPConfigMutation = useMutation({
    mutationFn: async (config: VoIPAIConfig) => {
      return await apiRequest(`/api/voip/ai-config/${config.storeId}`, {
        method: 'POST',
        body: config,
      });
    },
    onSuccess: () => {
      toast({
        title: "✅ Configurazione Salvata",
        description: "La configurazione VoIP AI è stata salvata con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/voip/ai-config', selectedStoreForVoIP] });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Errore",
        description: error.message || "Impossibile salvare la configurazione",
        variant: "destructive",
      });
    },
  });

  const [formData, setFormData] = useState<Partial<AISettings>>({
    isActive: true,
    apiConnectionStatus: 'disconnected',
    openaiApiKey: '',
    featuresEnabled: {
      chat_assistant: true,
      document_analysis: true,
      financial_forecasting: false,
      web_search: false,
      code_interpreter: false,
    },
    privacySettings: {
      dataRetentionDays: 30,
      allowDataTraining: false,
      anonymizeConversations: true,
    }
  });

  useEffect(() => {
    if (settings?.data) {
      const newFormData = {
        ...settings.data,
        isActive: settings.data.isActive !== undefined ? settings.data.isActive : true,
        apiConnectionStatus: settings.data.apiConnectionStatus || 'disconnected',
        openaiApiKey: userEnteredApiKey !== null ? userEnteredApiKey : settings.data.openaiApiKey
      };
      setFormData(newFormData);
    } else if (settingsError && !settingsLoading) {
      setFormData({
        isActive: false,
        apiConnectionStatus: 'disconnected',
        featuresEnabled: {
          chat_assistant: true,
          document_analysis: true,
          financial_forecasting: false,
          web_search: false,
          code_interpreter: false,
        },
        privacySettings: {
          dataRetentionDays: 30,
          allowDataTraining: false,
          anonymizeConversations: true,
        }
      });
    }
  }, [settings, settingsError, settingsLoading]);

  useEffect(() => {
    if (existingVoIPConfig?.data) {
      setVoipConfig(existingVoIPConfig.data);
      setSelectedTrunk(existingVoIPConfig.data.trunkId);
    }
  }, [existingVoIPConfig]);

  const testApiConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);

    try {
      const dataToSave = { ...formData };
      
      if (userEnteredApiKey !== null) {
        dataToSave.openaiApiKey = userEnteredApiKey;
        await apiRequest('/api/ai/settings', {
          method: 'PUT',
          body: dataToSave,
        });
      } else if (dataToSave.openaiApiKey?.includes('*')) {
        delete dataToSave.openaiApiKey;
        
        if (Object.keys(dataToSave).length > 1) {
          await apiRequest('/api/ai/settings', {
            method: 'PUT',
            body: dataToSave,
          });
        }
      } else if (dataToSave.openaiApiKey) {
        await apiRequest('/api/ai/settings', {
          method: 'PUT',
          body: dataToSave,
        });
      }

      const result = await apiRequest('/api/ai/test-connection', {
        method: 'POST',
        body: {},
      });
      
      if (result.success) {
        setConnectionTestResult({ success: true, message: 'Connessione riuscita! API key valida e salvata.' });
        setFormData(prev => ({ 
          ...prev, 
          apiConnectionStatus: 'connected',
          lastConnectionTest: new Date().toISOString(),
          connectionTestResult: result
        }));
        
        queryClient.invalidateQueries({ queryKey: ['/api/ai/settings'] });
        
        toast({
          title: "✅ Connessione OK",
          description: "API key salvata e connessione riuscita!",
        });
      } else {
        setConnectionTestResult({ 
          success: false, 
          message: result.message || 'Test di connessione fallito' 
        });
        setFormData(prev => ({ 
          ...prev, 
          apiConnectionStatus: 'error'
        }));
      }
    } catch (error) {
      setConnectionTestResult({ success: false, message: 'Errore di rete durante il test' });
      setFormData(prev => ({ ...prev, apiConnectionStatus: 'error' }));
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSave = () => {
    setSaveStatus('saving');
    
    const dataToSave = { ...formData };
    
    if (userEnteredApiKey !== null) {
      dataToSave.openaiApiKey = userEnteredApiKey;
    } else {
      const isMaskedKey = dataToSave.openaiApiKey?.startsWith('sk-') && 
                          dataToSave.openaiApiKey?.includes('***') &&
                          dataToSave.openaiApiKey?.match(/\*{3,}/);
      
      if (isMaskedKey) {
        delete dataToSave.openaiApiKey;
      }
    }
    
    updateSettingsMutation.mutate(dataToSave, {
      onSuccess: () => {
        setUserEnteredApiKey(null);
        queryClient.invalidateQueries({ queryKey: ['/api/ai/settings'] });
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      },
      onError: () => setSaveStatus('error')
    });
  };

  const handleFeatureToggle = (feature: keyof AISettings['featuresEnabled']) => {
    setFormData(prev => ({
      ...prev,
      featuresEnabled: {
        ...prev.featuresEnabled,
        [feature]: !prev.featuresEnabled?.[feature]
      }
    }));
  };

  const handlePrivacyToggle = (setting: keyof AISettings['privacySettings']) => {
    if (setting === 'dataRetentionDays') return;
    setFormData(prev => ({
      ...prev,
      privacySettings: {
        ...prev.privacySettings,
        [setting]: !prev.privacySettings?.[setting]
      }
    }));
  };

  const handleProcessUrl = async () => {
    if (!urlToProcess.trim()) {
      toast({
        title: "⚠️ URL Richiesto",
        description: "Inserisci un URL valido per procedere con il processamento.",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    try {
      new URL(urlToProcess.trim());
    } catch {
      toast({
        title: "❌ URL Non Valido", 
        description: "Inserisci un URL completo (es: https://windtre.it)",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    if (!selectedAgentForTraining) {
      toast({
        title: "⚠️ Nessun Agente Selezionato",
        description: "Seleziona un agente per processare l'URL.",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    setProcessingUrl(true);
    await processAgentUrlMutation.mutateAsync({
      agentId: selectedAgentForTraining,
      url: urlToProcess.trim()
    });
  };

  const handleProcessAgentUrl = async () => {
    await handleProcessUrl();
  };

  const handleFileUpload = async (fileType: 'pdf' | 'image' | 'audio' | 'video') => {
    const input = document.createElement('input');
    input.type = 'file';
    
    const acceptTypes = {
      pdf: '.pdf',
      image: '.jpg,.jpeg,.png,.gif,.webp',
      audio: '.mp3,.wav,.ogg,.m4a',
      video: '.mp4,.avi,.mov,.webm'
    };
    
    input.accept = acceptTypes[fileType];
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      setUploadingFile(true);
      setUploadProgress(0);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mediaType', fileType);
      
      try {
        const interval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 200);
        
        await uploadMediaMutation.mutateAsync(formData);
        
        clearInterval(interval);
        setUploadProgress(100);
        
        toast({
          title: "✅ Upload Completato",
          description: `${fileType.toUpperCase()} caricato e processato con successo!`,
        });
        
        setTimeout(() => {
          setUploadProgress(0);
        }, 1000);
      } catch (error) {
        toast({
          title: "❌ Errore Upload",
          description: (error as Error).message,
          variant: "destructive",
        });
      }
    };
    
    input.click();
  };

  const openAgentTrainingModal = (agentId: string) => {
    setSelectedAgentForTraining(agentId);
    setAgentTrainingModalOpen(true);
  };

  const openAgentStoryboardModal = (agentId: string) => {
    setSelectedAgentForTraining(agentId);
    setAgentStoryboardModalOpen(true);
  };

  const closeTrainingModals = () => {
    setAgentTrainingModalOpen(false);
    setAgentStoryboardModalOpen(false);
    setSelectedAgentForTraining(null);
    setUrlToProcess('');
    setProcessingUrl(false);
  };

  const handleToggleTab = (tabId: TabId) => {
    setExpandedTab(expandedTab === tabId ? null : tabId);
  };

  const handleSaveVoIPConfig = () => {
    if (!selectedStoreForVoIP || !selectedTrunk) {
      toast({
        title: "⚠️ Dati Mancanti",
        description: "Seleziona un negozio e un trunk prima di salvare",
        variant: "destructive",
      });
      return;
    }

    const configToSave: VoIPAIConfig = {
      ...voipConfig,
      storeId: selectedStoreForVoIP,
      trunkId: selectedTrunk,
    };

    saveVoIPConfigMutation.mutate(configToSave);
  };

  const handleBusinessHourChange = (day: string, field: 'start' | 'end', value: string) => {
    setVoipConfig(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...(prev.businessHours[day] || { start: '', end: '' }),
          [field]: value,
        },
      },
    }));
  };

  const handleToggleBusinessDay = (day: string, enabled: boolean) => {
    setVoipConfig(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: enabled ? { start: '09:00', end: '18:00' } : null,
      },
    }));
  };

  const tabs: Array<{ id: TabId; icon: React.ElementType; label: string; color: string }> = [
    { id: 'settings', icon: Settings, label: 'Impostazioni', color: 'bg-[#FF6900]' },
    { id: 'agents', icon: Brain, label: 'Agenti', color: 'bg-purple-600' },
    { id: 'telephony', icon: Phone, label: 'Telefonia', color: 'bg-green-600' },
    { id: 'conversations', icon: MessageCircle, label: 'Conversazioni', color: 'bg-blue-600' },
    { id: 'usage', icon: Activity, label: 'Utilizzo', color: 'bg-indigo-600' },
  ];

  const renderTabContent = () => {
    if (!expandedTab) return null;

    switch (expandedTab) {
      case 'settings':
        return renderSettingsContent();
      case 'agents':
        return renderAgentsContent();
      case 'telephony':
        return renderTelephonyContent();
      case 'conversations':
        return renderConversationsContent();
      case 'usage':
        return renderUsageContent();
      default:
        return null;
    }
  };

  const renderSettingsContent = () => (
    <div className="space-y-6">
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-[#FF6900]/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#FF6900]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Stato AI Assistant</h3>
              <p className="text-sm text-gray-600">Configurazione globale del sistema AI</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Switch
              checked={formData.isActive || false}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              data-testid="switch-ai-active"
            />
            <span className={`text-sm font-medium ${formData.isActive ? 'text-green-600' : 'text-gray-500'}`}>
              {formData.isActive ? 'Attivo' : 'Disattivo'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="openai-api-key" className="text-sm font-medium text-gray-700">
              OpenAI API Key
            </Label>
            <div className="flex space-x-2">
              <Input
                id="openai-api-key"
                type={apiKeyVisible ? 'text' : 'password'}
                value={userEnteredApiKey !== null ? userEnteredApiKey : (formData.openaiApiKey || '')}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setUserEnteredApiKey(newValue);
                  setFormData(prev => ({ ...prev, openaiApiKey: newValue }));
                }}
                placeholder="sk-proj-..."
                className="flex-1"
                data-testid="input-openai-api-key"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setApiKeyVisible(!apiKeyVisible)}
                data-testid="button-toggle-api-key-visibility"
              >
                {apiKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="openai-model" className="text-sm font-medium text-gray-700">
              Modello OpenAI
            </Label>
            <Select
              value={formData.openaiModel || 'gpt-4o'}
              onValueChange={(value) => setFormData(prev => ({ ...prev, openaiModel: value }))}
            >
              <SelectTrigger id="openai-model" data-testid="select-openai-model">
                <SelectValue placeholder="Seleziona modello" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o">GPT-4o (Raccomandato)</SelectItem>
                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 flex items-center space-x-3">
          <Button
            onClick={testApiConnection}
            disabled={testingConnection}
            variant="outline"
            data-testid="button-test-connection"
          >
            {testingConnection ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Test Connessione
              </>
            )}
          </Button>
          
          {connectionTestResult && (
            <div className={`flex items-center space-x-2 ${connectionTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
              {connectionTestResult.success ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">{connectionTestResult.message}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Funzionalità Abilitate</h3>
        <div className="space-y-3">
          {[
            { key: 'chat_assistant', label: 'Chat Assistant', icon: MessageCircle },
            { key: 'document_analysis', label: 'Analisi Documenti', icon: FileText },
            { key: 'financial_forecasting', label: 'Previsioni Finanziarie', icon: TrendingUp },
            { key: 'web_search', label: 'Ricerca Web', icon: Search },
            { key: 'code_interpreter', label: 'Code Interpreter', icon: Brain },
          ].map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Icon className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">{label}</span>
              </div>
              <Switch
                checked={formData.featuresEnabled?.[key as keyof AISettings['featuresEnabled']] || false}
                onCheckedChange={() => handleFeatureToggle(key as keyof AISettings['featuresEnabled'])}
                data-testid={`switch-feature-${key}`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Privacy e GDPR</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="text-sm font-medium text-gray-900">Retention Dati (giorni)</span>
              <p className="text-xs text-gray-600">I dati vengono eliminati automaticamente dopo questo periodo</p>
            </div>
            <Input
              type="number"
              value={formData.privacySettings?.dataRetentionDays || 30}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                privacySettings: {
                  ...prev.privacySettings,
                  dataRetentionDays: parseInt(e.target.value)
                }
              }))}
              className="w-20"
              min={1}
              max={365}
              data-testid="input-data-retention-days"
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-900">Anonimizza Conversazioni</span>
            <Switch
              checked={formData.privacySettings?.anonymizeConversations || false}
              onCheckedChange={() => handlePrivacyToggle('anonymizeConversations')}
              data-testid="switch-anonymize-conversations"
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-900">Consenti Training su Dati</span>
            <Switch
              checked={formData.privacySettings?.allowDataTraining || false}
              onCheckedChange={() => handlePrivacyToggle('allowDataTraining')}
              data-testid="switch-allow-data-training"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="bg-[#FF6900] hover:bg-[#E55A00]"
          data-testid="button-save-settings"
        >
          {saveStatus === 'saving' ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Salvataggio...
            </>
          ) : saveStatus === 'success' ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Salvato!
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salva Configurazione
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderAgentsContent = () => (
    <div className="space-y-6">
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Agenti AI Disponibili</h3>
        {aiAgentsLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-[#FF6900]" />
          </div>
        ) : (aiAgents?.length || 0) > 0 ? (
          <div className="space-y-3">
            {aiAgents?.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Brain className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{agent.name}</h4>
                      <p className="text-sm text-gray-600">{agent.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{agent.moduleContext}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          agent.status === 'active' ? 'bg-green-100 text-green-800' :
                          agent.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {agent.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAgentTrainingModal(agent.agentId)}
                    data-testid={`button-training-${agent.agentId}`}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Training
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAgentStoryboardModal(agent.agentId)}
                    data-testid={`button-storyboard-${agent.agentId}`}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Storyboard
                  </Button>
                  <Switch
                    checked={agent.isEnabled || false}
                    onCheckedChange={(checked) => toggleAgentMutation.mutate({ agentId: agent.agentId, isEnabled: checked })}
                    data-testid={`switch-agent-${agent.agentId}`}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Brain className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p>Nessun agente AI disponibile</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderTelephonyContent = () => (
    <div className="space-y-6">
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-2 mb-6">
          <Phone className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Configurazione VoIP AI Agent</h3>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="voip-store" className="text-sm font-medium text-gray-700">
                Seleziona Negozio
              </Label>
              <Select
                value={selectedStoreForVoIP}
                onValueChange={(value) => {
                  setSelectedStoreForVoIP(value);
                  setVoipConfig(prev => ({ ...prev, storeId: value }));
                  setSelectedTrunk('');
                }}
              >
                <SelectTrigger id="voip-store" data-testid="select-voip-store">
                  <SelectValue placeholder="Seleziona un negozio" />
                </SelectTrigger>
                <SelectContent>
                  {storesLoading ? (
                    <div className="p-2 text-sm text-gray-500">Caricamento...</div>
                  ) : stores?.length ? (
                    stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name} ({store.code})
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-gray-500">Nessun negozio disponibile</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="voip-trunk" className="text-sm font-medium text-gray-700">
                Seleziona Trunk VoIP
              </Label>
              <Select
                value={selectedTrunk}
                onValueChange={(value) => {
                  setSelectedTrunk(value);
                  setVoipConfig(prev => ({ ...prev, trunkId: value }));
                }}
                disabled={!selectedStoreForVoIP}
              >
                <SelectTrigger id="voip-trunk" data-testid="select-voip-trunk">
                  <SelectValue placeholder={selectedStoreForVoIP ? "Seleziona trunk" : "Prima seleziona un negozio"} />
                </SelectTrigger>
                <SelectContent>
                  {trunksLoading ? (
                    <div className="p-2 text-sm text-gray-500">Caricamento...</div>
                  ) : trunks?.length ? (
                    trunks.map((trunk) => (
                      <SelectItem key={trunk.id} value={trunk.id}>
                        {trunk.provider} - {trunk.description || trunk.sipUsername}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-gray-500">Nessun trunk disponibile</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <span className="text-sm font-medium text-gray-900">Abilita AI Voice Agent</span>
              <p className="text-xs text-gray-600">Attiva l'assistente vocale AI per questo trunk</p>
            </div>
            <Switch
              checked={voipConfig.enabled}
              onCheckedChange={(checked) => setVoipConfig(prev => ({ ...prev, enabled: checked }))}
              disabled={!selectedTrunk}
              data-testid="switch-enable-ai-voice"
            />
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-600" />
              <span>Orari Business Hours</span>
            </h4>
            
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
              const dayLabel = {
                monday: 'Lunedì',
                tuesday: 'Martedì',
                wednesday: 'Mercoledì',
                thursday: 'Giovedì',
                friday: 'Venerdì',
                saturday: 'Sabato',
                sunday: 'Domenica',
              }[day];

              const isEnabled = voipConfig.businessHours[day] !== null;

              return (
                <div key={day} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 w-32">
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleToggleBusinessDay(day, checked)}
                      data-testid={`switch-business-${day}`}
                    />
                    <span className="text-sm font-medium text-gray-700">{dayLabel}</span>
                  </div>
                  {isEnabled && (
                    <div className="flex items-center space-x-2 flex-1">
                      <Input
                        type="time"
                        value={voipConfig.businessHours[day]?.start || '09:00'}
                        onChange={(e) => handleBusinessHourChange(day, 'start', e.target.value)}
                        className="w-32"
                        data-testid={`input-business-${day}-start`}
                      />
                      <span className="text-gray-500">-</span>
                      <Input
                        type="time"
                        value={voipConfig.businessHours[day]?.end || '18:00'}
                        onChange={(e) => handleBusinessHourChange(day, 'end', e.target.value)}
                        className="w-32"
                        data-testid={`input-business-${day}-end`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fallback-extension" className="text-sm font-medium text-gray-700">
              Fallback Extension (Operatore Umano)
            </Label>
            <Input
              id="fallback-extension"
              type="text"
              value={voipConfig.fallbackExtension || ''}
              onChange={(e) => setVoipConfig(prev => ({ ...prev, fallbackExtension: e.target.value }))}
              placeholder="es: 100"
              data-testid="input-fallback-extension"
            />
            <p className="text-xs text-gray-600">
              Estensione di fallback per trasferire la chiamata a un operatore umano
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveVoIPConfig}
              disabled={!selectedStoreForVoIP || !selectedTrunk || saveVoIPConfigMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-save-voip-config"
            >
              {saveVoIPConfigMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salva Configurazione
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderConversationsContent = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <Shield className="w-6 h-6 text-blue-600 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Privacy e Conformità GDPR</h3>
            <p className="text-blue-700 text-sm mb-4">
              Le conversazioni AI sono gestite in conformità al GDPR. I dati vengono automaticamente 
              anonimizzati e cancellati secondo le policy di retention configurate.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="bg-white px-3 py-2 rounded-lg border border-blue-200">
                <span className="text-sm font-medium text-blue-800">
                  Retention: {formData.privacySettings?.dataRetentionDays || 30} giorni
                </span>
              </div>
              <div className="bg-white px-3 py-2 rounded-lg border border-blue-200">
                <span className="text-sm font-medium text-blue-800">
                  Anonimizzazione: {formData.privacySettings?.anonymizeConversations ? 'Attiva' : 'Disattiva'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <MessageCircle className="w-5 h-5 mr-2 text-[#FF6900]" />
            Archivio Conversazioni AI
          </h3>
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              placeholder="Cerca conversazioni..."
              className="w-64"
              data-testid="input-search-conversations"
            />
          </div>
        </div>

        {conversationsLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-[#FF6900]" />
          </div>
        ) : (conversations?.data?.length || 0) > 0 ? (
          <div className="space-y-4">
            {conversations!.data!.map((conversation: any) => (
              <div key={conversation.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-[#FF6900]/10 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-[#FF6900]" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{conversation.title || 'Conversazione AI'}</h4>
                      <p className="text-sm text-gray-600">
                        {conversation.featureContext} • {new Date(conversation.createdAt).toLocaleString('it-IT')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      {conversation.messageCount || 0} messaggi
                    </span>
                    <Button variant="ghost" size="icon">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <p>Anteprima: {conversation.lastMessage || 'Nessun messaggio disponibile'}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nessuna Conversazione</h3>
            <p className="text-gray-600">Le conversazioni AI appariranno qui quando gli utenti inizieranno a utilizzare l'assistente.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderUsageContent = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Richieste Totali', value: stats?.data?.totalRequests || 0, icon: Activity, color: 'bg-blue-100 text-blue-800' },
          { label: 'Token Usati', value: (stats?.data?.totalTokens || 0).toLocaleString(), icon: Database, color: 'bg-purple-100 text-purple-800' },
          { label: 'Costo Totale', value: `$${((stats?.data?.totalCost || 0) / 100).toFixed(2)}`, icon: DollarSign, color: 'bg-green-100 text-green-800' },
          { label: 'Tempo Medio', value: `${stats?.data?.avgResponseTime || 0}ms`, icon: Clock, color: 'bg-orange-100 text-orange-800' },
        ].map((stat, index) => (
          <div key={index} className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-[#FF6900]" />
          Log Utilizzo Dettagliato
        </h3>
        
        {logsLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-[#FF6900]" />
          </div>
        ) : (usageLogs?.data?.length || 0) > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Timestamp</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Feature</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Modello</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Token</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Costo</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Tempo</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Stato</th>
                </tr>
              </thead>
              <tbody>
                {usageLogs!.data!.slice(0, 50).map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {new Date(log.requestTimestamp).toLocaleString('it-IT')}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">{log.featureType}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{log.modelUsed}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-right">{log.tokensTotal.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-right">
                      ${(log.costUsd / 100).toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-right">{log.responseTimeMs}ms</td>
                    <td className="py-3 px-4 text-center">
                      {log.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Nessun log di utilizzo disponibile</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200 bg-white">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#FF6900]/10 rounded-lg">
              <Brain className="w-6 h-6 text-[#FF6900]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Impostazioni AI</h1>
              <p className="text-gray-600">Configura l'integrazione AI e monitora l'utilizzo</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="flex flex-nowrap gap-4 overflow-x-auto pb-4 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isExpanded = expandedTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => handleToggleTab(tab.id)}
                className={`
                  flex items-center space-x-3 px-6 py-4 rounded-xl border-2 transition-all duration-300
                  backdrop-blur-sm flex-shrink-0 min-w-[200px]
                  ${isExpanded 
                    ? 'bg-white/90 border-[#FF6900] shadow-lg' 
                    : 'bg-white/60 border-gray-200 hover:border-[#FF6900]/50 hover:shadow-md'
                  }
                `}
                style={{ height: isExpanded ? 'auto' : '96px' }}
                data-testid={`card-${tab.id}`}
              >
                <div className={`w-12 h-12 rounded-lg ${tab.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-gray-900">{tab.label}</h3>
                  {!isExpanded && (
                    <p className="text-sm text-gray-600 mt-1">Clicca per espandere</p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-[#FF6900]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {expandedTab && (
          <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
            {renderTabContent()}
          </div>
        )}
      </div>

      <Dialog open={agentTrainingModalOpen} onOpenChange={setAgentTrainingModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Brain className="w-6 h-6 text-[#FF6900]" />
              <span>Training AI Agent</span>
            </DialogTitle>
            <DialogDescription>
              Importa contenuti da URL o carica file per arricchire il contesto dell'agente AI.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-5 border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Globe className="w-5 h-5 text-blue-600" />
                <h5 className="font-semibold text-gray-900">Importa Contenuti da URL</h5>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Inserisci URL di documenti, pagine web o risorse online da memorizzare nel database vettoriale.
              </p>
              <div className="flex space-x-2">
                <Input
                  type="url"
                  value={urlToProcess}
                  onChange={(e) => setUrlToProcess(e.target.value)}
                  placeholder="https://esempio.com/documento"
                  className="flex-1"
                  data-testid="input-agent-training-url"
                />
                <Button 
                  onClick={handleProcessAgentUrl}
                  disabled={processingUrl || !urlToProcess.trim()}
                  data-testid="button-process-agent-url"
                >
                  {processingUrl ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link className="w-4 h-4" />
                  )}
                  <span className="ml-2">{processingUrl ? 'Processando...' : 'Processa'}</span>
                </Button>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-5 border border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Upload className="w-5 h-5 text-purple-600" />
                <h5 className="font-semibold text-gray-900">Upload Media & Documenti</h5>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Carica PDF, immagini, audio o video per arricchire il contesto dell'agente.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { type: 'pdf', icon: FileText, label: 'PDF' },
                  { type: 'image', icon: Image, label: 'Immagini' },
                  { type: 'audio', icon: Mic, label: 'Audio' },
                  { type: 'video', icon: Video, label: 'Video' },
                ].map(({ type, icon: Icon, label }) => (
                  <Button
                    key={type}
                    onClick={() => handleFileUpload(type as 'pdf' | 'image' | 'audio' | 'video')}
                    disabled={uploadingFile}
                    variant="outline"
                    className="h-20 flex flex-col items-center justify-center"
                    data-testid={`button-upload-agent-${type}`}
                  >
                    <Icon className="w-6 h-6 text-gray-600 mb-1" />
                    <span className="text-xs text-gray-600">{label}</span>
                  </Button>
                ))}
              </div>
              
              {uploadingFile && (
                <div className="mt-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#FF6900]" />
                    <span className="text-sm text-gray-600">Processing media content...</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-[#FF6900] h-2 rounded-full transition-all duration-300" 
                      style={{width: `${uploadProgress}%`}}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{uploadProgress}% completato</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/60 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-[#FF6900]">
                  {agentTrainingStatsLoading ? '...' : (agentTrainingStats?.data?.documentsProcessed || 0)}
                </p>
                <p className="text-xs text-gray-600">Documenti Processati</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {agentTrainingStatsLoading ? '...' : (agentTrainingStats?.data?.embeddingsCreated || 0)}
                </p>
                <p className="text-xs text-gray-600">Embeddings Creati</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {agentTrainingStatsLoading ? '...' : (agentTrainingStats?.data?.validationsCompleted || 0)}
                </p>
                <p className="text-xs text-gray-600">Validazioni</p>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                onClick={closeTrainingModals}
                variant="outline"
                data-testid="button-close-agent-training"
              >
                Chiudi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={agentStoryboardModalOpen} onOpenChange={setAgentStoryboardModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Eye className="w-6 h-6 text-blue-600" />
              <span>Storyboard Training</span>
            </DialogTitle>
            <DialogDescription>
              Visualizza e gestisci i contenuti di training caricati per l'agente AI.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-blue-600" />
                <h5 className="font-semibold text-gray-900">Contenuti Training</h5>
              </div>
              <span className="text-sm text-gray-500">
                {agentTrainingSessions?.data?.length || 0} sessioni trovate
              </span>
            </div>
            
            {agentTrainingSessionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-5 h-5 animate-spin text-[#FF6900]" />
                <span className="ml-2 text-sm text-gray-600">Caricamento sessioni...</span>
              </div>
            ) : (agentTrainingSessions?.data?.length || 0) > 0 ? (
              <div className="max-h-80 overflow-y-auto space-y-3">
                {agentTrainingSessions!.data!.map((session: any, index: number) => {
                  const sessionType = session.sessionType || 'unknown';
                  const sessionStatus = session.sessionStatus || session.status || 'unknown';
                  
                  return (
                    <div key={session.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                          sessionStatus === 'completed' ? 'bg-green-500' :
                          sessionStatus === 'processing' ? 'bg-yellow-500 animate-pulse' :
                          sessionStatus === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                        }`}></div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-lg">
                              {sessionType === 'url_ingestion' ? '🌐' :
                               sessionType === 'document_upload' ? '📄' :
                               sessionType === 'media_processing' ? '🎬' : '📁'}
                            </span>
                            <p className="font-medium text-sm text-gray-900">
                              {sessionType === 'url_ingestion' ? 'URL Processato' :
                               sessionType === 'document_upload' ? 'Documento Caricato' :
                               sessionType === 'media_processing' ? 'Media Processato' : 'Contenuto Altro'}
                            </p>
                          </div>
                          <p className="text-xs text-gray-600 truncate">
                            {sessionType === 'url_ingestion' && session.sourceUrl ? (
                              <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                                {session.sourceUrl.length > 50 ? session.sourceUrl.substring(0, 50) + '...' : session.sourceUrl}
                              </span>
                            ) : (
                              <span className="text-gray-500">
                                {session.content?.slice(0, 50) + '...' || 'Contenuto non disponibile'}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {session.createdAt ? new Date(session.createdAt).toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            }) : 'N/A'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteAgentSessionMutation.mutate({ agentId: selectedAgentForTraining!, sessionId: session.id })}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Database className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p>Nessuna sessione di training trovata</p>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
              <Button
                onClick={closeTrainingModals}
                variant="outline"
                data-testid="button-close-storyboard"
              >
                Chiudi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
