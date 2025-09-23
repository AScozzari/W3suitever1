import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { 
  Settings, Activity, MessageCircle, FileText, TrendingUp, Search,
  Shield, Clock, DollarSign, Eye, EyeOff, Save, Zap, Brain,
  BarChart3, Database, Trash2, RefreshCw, AlertTriangle,
  CheckCircle, Users, Lock, Unlock
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
    allowDataTraining?: boolean;
    anonymizeConversations?: boolean;
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
  feature: string;
  tokensUsed: number;
  cost: number;
  responseTimeMs: number;
  success: boolean;
  createdAt: string;
}

export default function AISettingsPage() {
  const [activeTab, setActiveTab] = useState('settings');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);

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
      const response = await fetch('/api/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/settings'] });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
    onError: () => setSaveStatus('error'),
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
      const response = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          apiKey: formData.openaiApiKey,
          model: formData.openaiModel || 'gpt-5'
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
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

        {/* Model Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modello OpenAI
            </label>
            <select
              value={formData.openaiModel || 'gpt-5'}
              onChange={(e) => setFormData(prev => ({ ...prev, openaiModel: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6900] focus:border-transparent"
              data-testid="select-openai-model"
            >
              <option value="gpt-5">GPT-5 (Raccomandato)</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4">GPT-4</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Token per Risposta
            </label>
            <input
              type="number"
              value={formData.maxTokensPerResponse || 4000}
              onChange={(e) => setFormData(prev => ({ ...prev, maxTokensPerResponse: parseInt(e.target.value) }))}
              min="100"
              max="8000"
              step="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6900] focus:border-transparent"
              data-testid="input-max-tokens"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperatura ({formData.temperatureDefault || 0.7})
            </label>
            <input
              type="range"
              value={formData.temperatureDefault || 0.7}
              onChange={(e) => setFormData(prev => ({ ...prev, temperatureDefault: parseFloat(e.target.value) }))}
              min="0"
              max="1"
              step="0.1"
              className="w-full"
              data-testid="slider-temperature"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Preciso</span>
              <span>Creativo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Zap className="w-5 h-5 mr-2 text-[#FF6900]" />
          Funzionalità AI
        </h3>
        <div className="space-y-4">
          {[
            {
              key: 'chat_assistant' as const,
              icon: MessageCircle,
              title: 'Chat Assistant',
              description: 'Assistente AI conversazionale per supporto generale'
            },
            {
              key: 'document_analysis' as const,
              icon: FileText,
              title: 'Analisi Documenti',
              description: 'Analisi e estrazione informazioni da documenti'
            },
            {
              key: 'financial_forecasting' as const,
              icon: TrendingUp,
              title: 'Previsioni Finanziarie',
              description: 'Analisi predittive e forecasting finanziario'
            },
            {
              key: 'web_search' as const,
              icon: Search,
              title: 'Ricerca Web',
              description: 'Ricerca informazioni aggiornate sul web'
            },
            {
              key: 'code_interpreter' as const,
              icon: Database,
              title: 'Code Interpreter',
              description: 'Esecuzione codice e analisi dati avanzate'
            }
          ].map(({ key, icon: Icon, title, description }) => (
            <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Icon className="w-5 h-5 text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">{title}</h4>
                  <p className="text-sm text-gray-600">{description}</p>
                </div>
              </div>
              <button
                onClick={() => handleFeatureToggle(key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF6900] focus:ring-offset-2 ${
                  formData.featuresEnabled?.[key] ? 'bg-[#FF6900]' : 'bg-gray-200'
                }`}
                data-testid={`toggle-feature-${key}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.featuresEnabled?.[key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
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

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <EyeOff className="w-5 h-5 text-gray-600" />
              <div>
                <h4 className="font-medium text-gray-900">Training OpenAI</h4>
                <p className="text-sm text-gray-600">Consenti utilizzo dati per training modelli</p>
              </div>
            </div>
            <button
              onClick={() => handlePrivacyToggle('allowDataTraining')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF6900] focus:ring-offset-2 ${
                formData.privacySettings?.allowDataTraining ? 'bg-[#FF6900]' : 'bg-gray-200'
              }`}
              data-testid="toggle-training"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.privacySettings?.allowDataTraining ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
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
              <p className="text-2xl font-bold text-gray-900">${(stats?.data?.totalCost || 0).toFixed(2)}</p>
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

      {/* Activity Logs */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-[#FF6900]" />
            Registro Attività AI
          </h3>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Cerca nei logs..."
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF6900] focus:border-transparent"
              data-testid="input-search-logs"
            />
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#FF6900] focus:border-transparent">
              <option value="">Tutte le funzioni</option>
              <option value="chat">Chat Assistant</option>
              <option value="document_analysis">Analisi Documenti</option>
              <option value="financial_forecasting">Previsioni</option>
              <option value="web_search">Ricerca Web</option>
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
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Funzione</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Token</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Costo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Tempo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Stato</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {usageLogs?.data?.length > 0 ? usageLogs.data.map((log: AIUsageLog) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{log.feature || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.tokensUsed || 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">${(log.cost || 0).toFixed(4)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.responseTimeMs || 0}ms</td>
                    <td className="px-4 py-3">
                      {log.success ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Successo
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                          Errore
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString('it-IT') : 'N/A'}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Nessun log di utilizzo disponibile. I logs appariranno quando l'AI Assistant verrà utilizzato.
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