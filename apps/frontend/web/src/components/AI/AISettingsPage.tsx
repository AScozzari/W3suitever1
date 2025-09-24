import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, Activity, MessageCircle, FileText, TrendingUp, Search,
  Shield, Clock, DollarSign, Eye, EyeOff, Save, Zap, Brain,
  BarChart3, Database, Trash2, RefreshCw, AlertTriangle,
  CheckCircle, Users, Lock, Unlock, Upload, Link, CheckSquare,
  ChevronDown, ChevronUp, Globe, Mic, Image, Video, FileUp
} from 'lucide-react';

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
  featureType: string; // Correct field name from backend
  modelUsed: string;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number; // Correct field name from backend
  costUsd: number; // In cents, not dollars
  responseTimeMs: number;
  success: boolean;
  requestTimestamp: string; // Correct field name from backend
}

export default function AISettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('settings');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [urlToProcess, setUrlToProcess] = useState('');
  const [processingUrl, setProcessingUrl] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch AI settings
  const { data: settings, isLoading: settingsLoading, error: settingsError } = useQuery<{success: boolean, data: AISettings}>({
    queryKey: ['/api/ai/settings'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch usage statistics
  const { data: stats, isLoading: statsLoading } = useQuery<{success: boolean, data: AIUsageStats}>({
    queryKey: ['/api/ai/usage/stats'],
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch usage logs
  const { data: usageLogs, isLoading: logsLoading } = useQuery<{success: boolean, data: AIUsageLog[]}>({
    queryKey: ['/api/ai/usage/logs'],
    refetchInterval: 30000,
  });

  // Fetch AI conversations for archive
  const { data: conversations, isLoading: conversationsLoading } = useQuery<{success: boolean, data: any[]}>({
    queryKey: ['/api/ai/conversations'],
    refetchInterval: 60000,
    enabled: activeTab === 'conversations'
  });



  // Update settings mutation
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

  // Process URL mutation
  const processUrlMutation = useMutation({
    mutationFn: async (url: string) => {
      return await apiRequest('/api/ai/training/url', {
        method: 'POST',
        body: { url, extractContent: true },
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/training/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/training/sessions'] });
      setUrlToProcess('');
      setProcessingUrl(false);
      
      // Success toast with details
      toast({
        title: "✅ URL Processato con Successo",
        description: `Contenuto estratto: ${data.data?.metadata?.contentLength || 'N/A'} caratteri usando metodo ${data.data?.metadata?.scrapingMethod || 'standard'}`,
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      setProcessingUrl(false);
      
      // Detailed error toast based on error type
      let errorTitle = "❌ Errore Processamento URL";
      let errorDescription = error.message;
      
      if (error.message.includes('Network error')) {
        errorTitle = "🌐 Errore di Connessione";
        errorDescription = "Sito non raggiungibile o non accessibile. Verifica l'URL.";
      } else if (error.message.includes('CORS error')) {
        errorTitle = "🔒 Blocco CORS";
        errorDescription = "Il sito blocca le richieste cross-origin. Prova con un URL diverso.";
      } else if (error.message.includes('403 Forbidden')) {
        errorTitle = "🚫 Accesso Negato";
        errorDescription = "Il sito ha protezioni anti-bot. Potrebbe non essere accessibile.";
      } else if (error.message.includes('404 Not Found')) {
        errorTitle = "📄 Pagina Non Trovata";
        errorDescription = "L'URL specificato non esiste o non è più disponibile.";
      } else if (error.message.includes('Timeout')) {
        errorTitle = "⏱️ Timeout";
        errorDescription = "Il sito ha impiegato troppo tempo a rispondere (>30s).";
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
        duration: 8000,
      });
    },
  });

  // Delete training session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await apiRequest(`/api/ai/training/sessions/${sessionId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/training/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/training/sessions'] });
      
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

  // Upload media mutation
  const uploadMediaMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await apiRequest('/api/ai/training/media', {
        method: 'POST',
        body: formData,
        headers: {} // Let FormData set its own content-type boundary
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

  const [formData, setFormData] = useState<Partial<AISettings>>({});

  useEffect(() => {
    if (settings?.data) {
      setFormData(settings.data);
    }
  }, [settings]);

  // Test API connection
  const testApiConnection = async () => {
    if (!formData.openaiApiKey) {
      setConnectionTestResult({ success: false, message: 'Inserire prima la chiave API OpenAI' });
      return;
    }

    setTestingConnection(true);
    setConnectionTestResult(null);

    try {
      const result = await apiRequest('/api/ai/test-connection', {
        method: 'POST',
        body: { 
          apiKey: formData.openaiApiKey,
          model: formData.openaiModel || 'gpt-4-turbo'
        },
      });
      
      if (result.success) {
        setConnectionTestResult({ success: true, message: 'Connessione riuscita! API key valida.' });
        setFormData(prev => ({ 
          ...prev, 
          apiConnectionStatus: 'connected',
          lastConnectionTest: new Date().toISOString(),
          connectionTestResult: result
        }));
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
    updateSettingsMutation.mutate(formData);
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
    if (setting === 'dataRetentionDays') return; // Handled separately
    setFormData(prev => ({
      ...prev,
      privacySettings: {
        ...prev.privacySettings,
        [setting]: !prev.privacySettings?.[setting]
      }
    }));
  };

  // Handle URL processing
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

    // URL validation
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
    
    setProcessingUrl(true);
    // The mutation handles success/error toasts automatically
    await processUrlMutation.mutateAsync(urlToProcess.trim());
  };

  // Handle file upload
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
        // Simulate upload progress
        const interval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 200);
        
        await uploadMediaMutation.mutateAsync(formData);
        
        clearInterval(interval);
        setUploadProgress(100);
        
        alert(`${fileType.toUpperCase()} caricato e processato con successo!`);
        
        setTimeout(() => {
          setUploadProgress(0);
        }, 1000);
      } catch (error) {
        alert('Errore nel caricamento: ' + (error as Error).message);
      }
    };
    
    input.click();
  };

  // Handle review responses
  const handleReviewResponses = () => {
    // Navigate to responses review (could be a modal or separate page)
    alert('Funzionalità di review delle risposte in arrivo!');
    // TODO: Implement response review interface
  };

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#FF6900]" />
          <span className="text-lg">Caricamento impostazioni AI...</span>
        </div>
      </div>
    );
  }

  if (settingsError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Errore di Caricamento</h2>
          <p className="text-gray-600">Impossibile caricare le impostazioni AI.</p>
        </div>
      </div>
    );
  }

  const renderSettingsTab = () => (
    <div className="space-y-8">
      {/* AI Activation Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#FF6900]/10 rounded-lg">
              <Brain className="w-6 h-6 text-[#FF6900]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Stato AI</h3>
              <p className="text-gray-600">Attiva o disattiva l'integrazione AI per il tenant</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              formData.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {formData.isActive ? 'Attivo' : 'Disattivo'}
            </span>
            <button
              onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF6900] focus:ring-offset-2 ${
                formData.isActive ? 'bg-[#FF6900]' : 'bg-gray-200'
              }`}
              data-testid="toggle-ai-active"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* OpenAI API Configuration */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Settings className="w-5 h-5 mr-2 text-[#FF6900]" />
          Configurazione OpenAI API
        </h3>
        
        {/* API Key Management */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chiave API OpenAI per questo Tenant
            <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="relative">
            <input
              type={apiKeyVisible ? 'text' : 'password'}
              value={formData.openaiApiKey || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, openaiApiKey: e.target.value }))}
              placeholder="sk-..."
              className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6900] focus:border-transparent"
              data-testid="input-openai-api-key"
            />
            <button
              type="button"
              onClick={() => setApiKeyVisible(!apiKeyVisible)}
              className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700"
              data-testid="toggle-api-key-visibility"
            >
              {apiKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Ogni tenant può avere la propria chiave API. I dati vengono crittografati nel database.
          </p>
        </div>

        {/* Connection Test */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                formData.apiConnectionStatus === 'connected' ? 'bg-green-500' :
                formData.apiConnectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
              }`}></div>
              <span className="text-sm font-medium text-gray-700">
                Stato Connessione: {
                  formData.apiConnectionStatus === 'connected' ? 'Connesso' :
                  formData.apiConnectionStatus === 'error' ? 'Errore' : 'Disconnesso'
                }
              </span>
            </div>
            <button
              onClick={testApiConnection}
              disabled={testingConnection || !formData.openaiApiKey}
              className="px-4 py-2 bg-[#FF6900] text-white rounded-lg hover:bg-[#E55A00] disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
              data-testid="button-test-connection"
            >
              {testingConnection ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Testa Connessione</span>
                </>
              )}
            </button>
          </div>
          
          {connectionTestResult && (
            <div className={`p-3 rounded-lg ${
              connectionTestResult.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center space-x-2">
                {connectionTestResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  connectionTestResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {connectionTestResult.message}
                </span>
              </div>
            </div>
          )}
          
          {formData.lastConnectionTest && (
            <p className="text-xs text-gray-500 mt-2">
              Ultimo test: {new Date(formData.lastConnectionTest).toLocaleString('it-IT')}
            </p>
          )}
        </div>

      </div>

      {/* Agenti AI Disponibili */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Brain className="w-5 h-5 mr-2 text-[#FF6900]" />
          Agenti AI Disponibili
        </h3>
        <div className="space-y-4">
          {[
            {
              id: 'tippy',
              name: 'Tippy - Assistente Vendite WindTre',
              description: 'Assistente AI specializzato nelle vendite WindTre con knowledge base personalizzata',
              icon: MessageCircle,
              active: true // Per ora sempre attivo
            }
          ].map((agent) => (
            <div key={agent.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <agent.icon className="w-5 h-5 text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">{agent.name}</h4>
                  <p className="text-sm text-gray-600">{agent.description}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Toggle per attivare/disattivare l'agente */}
                <button
                  onClick={() => {
                    // TODO: Implementare toggle agente per tenant
                    alert(`Toggle agente ${agent.name} - funzionalità in arrivo!`);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF6900] focus:ring-offset-2 ${
                    agent.active ? 'bg-[#FF6900]' : 'bg-gray-200'
                  }`}
                  data-testid={`toggle-agent-${agent.id}`}
                  title={`${agent.active ? 'Disattiva' : 'Attiva'} agente`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      agent.active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                
                {/* Icona modifica per implementare RAG context */}
                <button
                  onClick={() => {
                    // TODO: Aprire modal per gestire URL e documenti RAG tenant-specific
                    alert(`Gestione contesto RAG per ${agent.name} - funzionalità in arrivo!`);
                  }}
                  className="p-2 text-gray-400 hover:text-[#FF6900] hover:bg-[#FF6900]/10 rounded-lg transition-colors"
                  data-testid={`edit-context-${agent.id}`}
                  title="Modifica contesto RAG"
                >
                  <Settings className="w-4 h-4" />
                </button>
                
                {/* Icona occhio per vedere story board custom tenant */}
                <button
                  onClick={() => {
                    // TODO: Aprire modal storyboard custom tenant
                    alert(`Storyboard custom tenant per ${agent.name} - funzionalità in arrivo!`);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  data-testid={`view-storyboard-${agent.id}`}
                  title="Visualizza storyboard tenant"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {/* Informazioni aggiuntive */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-blue-600" />
            <p className="text-sm text-blue-800 font-medium">Contesto RAG Vectoriale</p>
          </div>
          <p className="text-xs text-blue-700 mt-1">
            Ogni agente può avere documenti e URL personalizzati per il tuo tenant. 
            I dati vengono salvati in tabelle vectoriali con desinenza "_override" nello schema w3suite.
          </p>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-[#FF6900]" />
          Impostazioni Privacy
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-gray-600" />
              <div>
                <h4 className="font-medium text-gray-900">Conservazione Dati</h4>
                <p className="text-sm text-gray-600">Giorni di conservazione conversazioni AI</p>
              </div>
            </div>
            <select
              value={formData.privacySettings?.dataRetentionDays || 30}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                privacySettings: {
                  ...prev.privacySettings,
                  dataRetentionDays: parseInt(e.target.value)
                }
              }))}
              className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6900] focus:border-transparent"
              data-testid="select-retention-days"
            >
              <option value={7}>7 giorni</option>
              <option value={30}>30 giorni</option>
              <option value={90}>90 giorni</option>
              <option value={365}>1 anno</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Lock className="w-5 h-5 text-gray-600" />
              <div>
                <h4 className="font-medium text-gray-900">Anonimizza Conversazioni</h4>
                <p className="text-sm text-gray-600">Rimuovi informazioni identificative dai log</p>
              </div>
            </div>
            <button
              onClick={() => handlePrivacyToggle('anonymizeConversations')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF6900] focus:ring-offset-2 ${
                formData.privacySettings?.anonymizeConversations ? 'bg-[#FF6900]' : 'bg-gray-200'
              }`}
              data-testid="toggle-anonymize"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.privacySettings?.anonymizeConversations ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

        </div>
        
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            saveStatus === 'saving'
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : saveStatus === 'success'
              ? 'bg-green-100 text-green-800'
              : saveStatus === 'error'
              ? 'bg-red-100 text-red-800'
              : 'bg-[#FF6900] text-white hover:bg-[#e55a00]'
          }`}
          data-testid="button-save-settings"
        >
          {saveStatus === 'saving' ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : saveStatus === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : saveStatus === 'error' ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>
            {saveStatus === 'saving' ? 'Salvando...' :
             saveStatus === 'success' ? 'Salvato!' :
             saveStatus === 'error' ? 'Errore!' :
             'Salva Impostazioni'}
          </span>
        </button>
      </div>
    </div>
  );


  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      {/* Usage Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Richieste Totali</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.data?.totalRequests || 0}</p>
            </div>
            <Activity className="w-8 h-8 text-[#FF6900]" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Token Utilizzati</p>
              <p className="text-2xl font-bold text-gray-900">{(stats?.data?.totalTokens || 0).toLocaleString()}</p>
            </div>
            <Database className="w-8 h-8 text-[#7B2CBF]" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Costo Totale</p>
              <p className="text-2xl font-bold text-gray-900">${(Number(stats?.data?.totalCost) || 0).toFixed(2)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tempo Medio</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(stats?.data?.avgResponseTime || 0)}ms</p>
            </div>
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {statsLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-[#FF6900] mx-auto mb-4" />
            <p className="text-gray-600">Caricamento statistiche...</p>
          </div>
        </div>
      )}

      {/* Granular Analytics by Operation Type */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-6">
          <BarChart3 className="w-5 h-5 mr-2 text-[#FF6900]" />
          Analytics Granulari per Tipologia Operazione
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {[
            { type: 'chat', label: 'Chat', icon: '💬', color: 'bg-blue-100 text-blue-800' },
            { type: 'embedding', label: 'Embedding', icon: '🔍', color: 'bg-purple-100 text-purple-800' },
            { type: 'transcription', label: 'Trascrizione', icon: '🎙️', color: 'bg-green-100 text-green-800' },
            { type: 'vision_analysis', label: 'Vision', icon: '👁️', color: 'bg-orange-100 text-orange-800' },
            { type: 'url_scraping', label: 'URL Scraping', icon: '🌐', color: 'bg-cyan-100 text-cyan-800' }
          ].map(({ type, label, icon, color }) => {
            const logsForType = usageLogs?.data?.filter((log: AIUsageLog) => log.featureType === type) || [];
            const requestCount = logsForType.length;
            const totalCostDollars = logsForType.reduce((sum: number, log: AIUsageLog) => sum + (log.costUsd || 0), 0);
            
            return (
              <div key={type} className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">{icon}</div>
                <div className="text-sm font-medium text-gray-700 mb-1">{label}</div>
                <div className="text-lg font-bold text-gray-900 mb-1" data-testid={`text-requests-${type}`}>
                  {requestCount}
                </div>
                <div className="text-xs text-gray-500">richieste</div>
                <div className="text-sm font-semibold text-green-600 mt-1" data-testid={`text-cost-${type}`}>
                  ${totalCostDollars.toFixed(4)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Cost Breakdown Chart */}
        <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-4 border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-3">Breakdown Costi per Tipologia</h4>
          <div className="space-y-2">
            {[
              { type: 'chat', label: 'Chat Assistant', color: '#3B82F6' },
              { type: 'embedding', label: 'Vector Embeddings', color: '#8B5CF6' },
              { type: 'transcription', label: 'Audio Transcription', color: '#10B981' },
              { type: 'vision_analysis', label: 'Image Analysis', color: '#F59E0B' },
              { type: 'url_scraping', label: 'URL Content Extraction', color: '#06B6D4' }
            ].map(({ type, label, color }) => {
              const logs = usageLogs?.data?.filter((log: AIUsageLog) => log.featureType === type) || [];
              const totalCostDollars = logs.reduce((sum: number, log: AIUsageLog) => sum + (log.costUsd || 0), 0);
              const totalTokens = logs.reduce((sum: number, log: AIUsageLog) => sum + (log.tokensTotal || 0), 0);
              
              // Calculate percentage based on total cost from all logs (in dollars)
              const allLogsCostDollars = usageLogs?.data?.reduce((sum: number, log: AIUsageLog) => sum + (log.costUsd || 0), 0) || 0;
              const percentage = allLogsCostDollars > 0 ? (totalCostDollars / allLogsCostDollars * 100) : 0;
              
              return (
                <div key={type} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-gray-600" data-testid={`text-tokens-${type}`}>
                      {totalTokens.toLocaleString()} tokens
                    </span>
                    <span className="font-semibold text-gray-900" data-testid={`text-cost-breakdown-${type}`}>
                      ${totalCostDollars.toFixed(4)}
                    </span>
                    <span className="text-gray-500" data-testid={`text-percentage-${type}`}>
                      ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Activity Logs */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-[#FF6900]" />
            Registro Attività AI Dettagliato
          </h3>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Cerca nei logs..."
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF6900] focus:border-transparent"
              data-testid="input-search-logs"
            />
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF6900] focus:border-transparent">
              <option value="">Tutte le tipologie</option>
              <option value="chat">💬 Chat Assistant</option>
              <option value="embedding">🔍 Vector Embeddings</option>
              <option value="transcription">🎙️ Audio Transcription</option>
              <option value="vision_analysis">👁️ Image Analysis</option>
              <option value="url_scraping">🌐 URL Content Extraction</option>
            </select>
          </div>
        </div>
        {logsLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-[#FF6900]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Tipologia Operazione</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Modello AI</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Token</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Costo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Tempo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Stato</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {usageLogs?.data?.length > 0 ? usageLogs.data.map((log: AIUsageLog) => {
                  const getOperationDisplay = (featureType: string) => {
                    const typeMap: Record<string, { label: string, icon: string, color: string }> = {
                      'chat': { label: 'Chat Assistant', icon: '💬', color: 'bg-blue-100 text-blue-800' },
                      'embedding': { label: 'Vector Embedding', icon: '🔍', color: 'bg-purple-100 text-purple-800' },
                      'transcription': { label: 'Audio Transcription', icon: '🎙️', color: 'bg-green-100 text-green-800' },
                      'vision_analysis': { label: 'Image Analysis', icon: '👁️', color: 'bg-orange-100 text-orange-800' },
                      'url_scraping': { label: 'URL Content Extraction', icon: '🌐', color: 'bg-cyan-100 text-cyan-800' }
                    };
                    return typeMap[featureType] || { label: featureType || 'N/A', icon: '❓', color: 'bg-gray-100 text-gray-800' };
                  };

                  const opType = getOperationDisplay(log.featureType);
                  const costInDollars = log.costUsd || 0; // Already in dollars from backend
                  
                  return (
                    <tr key={log.id} className="hover:bg-gray-50" data-testid={`row-log-${log.id}`}>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{opType.icon}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${opType.color}`}>
                            {opType.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                        {log.modelUsed || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-medium">
                        <div className="text-xs text-gray-500">
                          <div>Total: {(log.tokensTotal || 0).toLocaleString()}</div>
                          {(log.tokensInput > 0 || log.tokensOutput > 0) && (
                            <div>In: {log.tokensInput || 0} | Out: {log.tokensOutput || 0}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        <span className="text-green-600">${costInDollars.toFixed(4)}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <span className={`${log.responseTimeMs && log.responseTimeMs > 5000 ? 'text-orange-600 font-medium' : ''}`}>
                          {log.responseTimeMs || 0}ms
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {log.success ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                            ✅ Successo
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                            ❌ Errore
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.requestTimestamp ? new Date(log.requestTimestamp).toLocaleString('it-IT') : 'N/A'}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center space-y-2">
                        <BarChart3 className="w-12 h-12 text-gray-300" />
                        <p>Nessun log di utilizzo disponibile.</p>
                        <p className="text-xs">I logs granulari appariranno quando l'AI Assistant verrà utilizzato.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderConversationsTab = () => (
    <div className="space-y-6">
      {/* GDPR Controls */}
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
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
                <Trash2 className="w-4 h-4 inline mr-1" />
                Cancella Tutti i Dati
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conversations Archive */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <MessageCircle className="w-5 h-5 mr-2 text-[#FF6900]" />
            Archivio Conversazioni AI
          </h3>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Cerca conversazioni..."
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF6900] focus:border-transparent"
              data-testid="input-search-conversations"
            />
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF6900] focus:border-transparent">
              <option value="">Tutti gli utenti</option>
              <option value="current">Solo le mie</option>
              <option value="team">Team</option>
            </select>
            <button className="px-4 py-2 bg-[#FF6900] text-white rounded-lg hover:bg-[#E55A00] text-sm font-medium">
              <FileText className="w-4 h-4 inline mr-1" />
              Esporta
            </button>
          </div>
        </div>

        {conversationsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-[#FF6900] mx-auto mb-4" />
              <p className="text-gray-600">Caricamento conversazioni...</p>
            </div>
          </div>
        ) : conversations?.data?.length > 0 ? (
          <div className="space-y-4">
            {conversations.data.map((conversation: any) => (
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
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
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

      {/* Export and Management Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-[#FF6900]" />
          Gestione Dati
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#FF6900] hover:bg-[#FF6900]/5 transition-colors">
            <div className="text-center">
              <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="font-medium text-gray-700">Esporta CSV</p>
              <p className="text-sm text-gray-500">Export logs in CSV</p>
            </div>
          </button>
          <button className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#FF6900] hover:bg-[#FF6900]/5 transition-colors">
            <div className="text-center">
              <Shield className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="font-medium text-gray-700">Audit Report</p>
              <p className="text-sm text-gray-500">Report GDPR compliance</p>
            </div>
          </button>
          <button className="flex items-center justify-center p-4 border-2 border-dashed border-red-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors">
            <div className="text-center">
              <Trash2 className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="font-medium text-red-700">Cancellazione GDPR</p>
              <p className="text-sm text-red-500">Elimina tutti i dati</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
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

          {/* Tabs */}
          <div className="mt-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'settings', name: 'Configurazione', icon: Settings },
                  { id: 'analytics', name: 'Analytics', icon: BarChart3 },
                  { id: 'conversations', name: 'Archivio Chat', icon: MessageCircle }
                ].map(({ id, name, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === id
                        ? 'border-[#FF6900] text-[#FF6900]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    data-testid={`tab-${id}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{name}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        {activeTab === 'settings' && renderSettingsTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'conversations' && renderConversationsTab()}
      </div>
    </div>
  );
}