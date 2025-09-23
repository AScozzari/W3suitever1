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
  openaiModel: string;
  maxTokensPerResponse: number;
  temperatureDefault: number;
  featuresEnabled: {
    chat_assistant: boolean;
    document_analysis: boolean;
    financial_forecasting: boolean;
    web_search: boolean;
    code_interpreter: boolean;
  };
  privacySettings: {
    dataRetentionDays: number;
    allowDataTraining: boolean;
    anonymizeConversations: boolean;
  };
  isActive: boolean;
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

  // Fetch AI settings
  const { data: settings, isLoading: settingsLoading, error: settingsError } = useQuery({
    queryKey: ['/api/ai/settings'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch usage statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/ai/usage/stats'],
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch usage logs
  const { data: usageLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['/api/ai/usage/logs'],
    refetchInterval: 30000,
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

      {/* Model Configuration */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Settings className="w-5 h-5 mr-2 text-[#FF6900]" />
          Configurazione Modello
        </h3>
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
      {stats?.data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Richieste Totali</p>
                <p className="text-2xl font-bold text-gray-900">{stats.data.totalRequests}</p>
              </div>
              <Activity className="w-8 h-8 text-[#FF6900]" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Token Utilizzati</p>
                <p className="text-2xl font-bold text-gray-900">{stats.data.totalTokens.toLocaleString()}</p>
              </div>
              <Database className="w-8 h-8 text-[#7B2CBF]" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Costo Totale</p>
                <p className="text-2xl font-bold text-gray-900">${stats.data.totalCost.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tempo Medio</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(stats.data.avgResponseTime)}ms</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>
      )}

      {/* Usage Logs */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-[#FF6900]" />
          Log Utilizzo Recenti
        </h3>
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
                {usageLogs?.data?.map((log: AIUsageLog) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{log.feature}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.tokensUsed}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">${log.cost.toFixed(4)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.responseTimeMs}ms</td>
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
                      {new Date(log.createdAt).toLocaleString('it-IT')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
                  { id: 'analytics', name: 'Analytics', icon: BarChart3 }
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
      </div>
    </div>
  );
}