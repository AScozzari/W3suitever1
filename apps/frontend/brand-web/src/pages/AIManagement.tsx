import React, { useState, useMemo, useEffect } from 'react';
import { useBrandAuth } from '../contexts/BrandAuthContext';
import { useBrandTenant } from '../contexts/BrandTenantContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSSE } from '../hooks/useSSE';
import BrandLayout from '../components/BrandLayout';
import RagKnowledgeSection from '../components/RagKnowledgeSection';
import { 
  Brain, Bot, Settings, Cpu, Activity, Target,
  BarChart3, Filter, Search, Download, Plus, Edit, Trash2,
  Eye, RefreshCw, Star, Award, Zap, Server, Database,
  CheckSquare, Square, MoreVertical, AlertTriangle, Clock,
  X, Check, Loader2, Upload, FileText, Archive,
  Sparkles, Rocket, Shield, Crown, Layers,
  ChevronRight, ArrowUpRight, CircleDollarSign,
  NetworkIcon, Boxes, LineChart, PieChart, Wallet,
  ShieldCheck, Lock, Unlock, Globe, Link2, 
  Lightbulb, Gauge, HeartHandshake, MessageCircle,
  Users, TrendingUp, DollarSign, Play, Pause,
  RotateCcw, Copy, ExternalLink, Info
} from 'lucide-react';
import { apiRequest } from '../lib/queryClient';
import { format } from 'date-fns';

// Modern W3 Suite Color Palette - Consistent with Management.tsx
const COLORS = {
  primary: {
    orange: '#FF6900',
    orangeLight: '#ff8533',
    orangeDark: '#e55a00',
    purple: '#7B2CBF',
    purpleLight: '#9747ff',
    purpleDark: '#6a24a8',
  },
  semantic: {
    success: '#10b981',
    successLight: '#34d399',
    warning: '#f59e0b',
    warningLight: '#fbbf24',
    error: '#ef4444',
    errorLight: '#f87171',
    info: '#3b82f6',
    infoLight: '#60a5fa',
  },
  neutral: {
    dark: '#1f2937',
    medium: '#6b7280',
    light: '#9ca3af',
    lighter: '#e5e7eb',
    lightest: '#f9fafb',
    white: '#ffffff',
  },
  gradients: {
    orange: 'linear-gradient(135deg, #FF6900, #ff8533)',
    purple: 'linear-gradient(135deg, #7B2CBF, #9747ff)',
    blue: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
    green: 'linear-gradient(135deg, #10b981, #34d399)',
    pinkOrange: 'linear-gradient(135deg, #ff6b6b, #FF6900)',
    purpleBlue: 'linear-gradient(135deg, #7B2CBF, #3b82f6)',
  }
};

// Glassmorphism styles aligned with W3 Suite
const glassStyle = {
  background: 'hsla(255, 255, 255, 0.08)',
  backdropFilter: 'blur(24px) saturate(140%)',
  WebkitBackdropFilter: 'blur(24px) saturate(140%)',
  border: '1px solid hsla(255, 255, 255, 0.12)',
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
};

const cardStyle = {
  background: 'white',
  borderRadius: '16px',
  overflow: 'hidden',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  border: '1px solid #e5e7eb',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
};

// Animated counter component
const AnimatedCounter = ({ value, duration = 2000 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = value;
    const increment = end / (duration / 10);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 10);
    return () => clearInterval(timer);
  }, [value, duration]);
  
  return <span>{count.toLocaleString()}</span>;
};

// Pulse indicator component
const PulseIndicator = ({ color = COLORS.semantic.success }: { color?: string }) => (
  <span style={{
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: color,
    position: 'relative',
  }}>
    <span style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: color,
      animation: 'pulse 2s infinite',
    }} />
    <style>{`
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(2); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
    `}</style>
  </span>
);

// Status badge component
const StatusBadge = ({ status }: { status: 'active' | 'inactive' | 'deprecated' }) => {
  const statusConfig = {
    active: { color: COLORS.semantic.success, label: 'Attivo' },
    inactive: { color: COLORS.neutral.medium, label: 'Inattivo' },
    deprecated: { color: COLORS.semantic.error, label: 'Deprecato' }
  };
  
  const config = statusConfig[status];
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 12px',
      fontSize: '12px',
      fontWeight: 600,
      color: config.color,
      background: `${config.color}15`,
      borderRadius: '12px',
      border: `1px solid ${config.color}30`
    }}>
      <PulseIndicator color={config.color} />
      {config.label}
    </span>
  );
};

export default function AIManagement() {
  const { isAuthenticated, user } = useBrandAuth();
  const { currentTenant, isCrossTenant } = useBrandTenant();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('registry');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Filters state for AI agents
  const [filters, setFilters] = useState({
    moduleContext: 'all' as 'all' | 'sales' | 'support' | 'hr' | 'finance' | 'analytics' | 'general',
    status: 'all' as 'all' | 'active' | 'inactive' | 'deprecated',
    search: '',
    page: 1,
    limit: 25
  });

  // Selected agents for bulk operations
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [bulkOperation, setBulkOperation] = useState('');
  
  // Modals state
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
  const [knowledgeAgent, setKnowledgeAgent] = useState<any>(null);
  
  // Agent form state
  const [agentForm, setAgentForm] = useState({
    agentId: '',
    name: '',
    description: '',
    systemPrompt: '',
    personality: '{}',
    moduleContext: 'general' as 'sales' | 'support' | 'hr' | 'finance' | 'analytics' | 'general',
    baseConfiguration: '{"maxTokens": 4000, "temperature": 0.7, "model": "gpt-4-turbo"}'
  });

  // RAG Knowledge state
  const [knowledgeUrl, setKnowledgeUrl] = useState('');

  // Analytics filters
  const [analyticsFilters, setAnalyticsFilters] = useState({
    agentId: '',
    tenantId: '',
    dateFrom: '',
    dateTo: ''
  });

  // Types
  interface AIAgent {
    id: string;
    agentId: string;
    name: string;
    description: string;
    systemPrompt: string;
    personality: any;
    moduleContext: 'sales' | 'support' | 'hr' | 'finance' | 'analytics' | 'general';
    baseConfiguration: any;
    version: number;
    status: 'active' | 'inactive' | 'deprecated';
    createdAt: string;
    updatedAt: string;
  }

  interface AIUsageStats {
    totalAgents: number;
    activeAgents: number;
    totalInteractions: number;
    totalTokensUsed: number;
    agentsByModule: Array<{
      module: string;
      count: number;
      percentage: number;
    }>;
    usageByAgent: Array<{
      agentId: string;
      agentName: string;
      interactions: number;
      tokensUsed: number;
    }>;
    tenantUsage: Array<{
      tenantId: string;
      tenantName: string;
      interactions: number;
      tokensUsed: number;
    }>;
  }

  // Filter params serialization
  const filterParams = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        params.append(key, String(value));
      }
    });
    return params.toString();
  }, [filters]);

  // Analytics params serialization
  const analyticsParams = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(analyticsFilters).forEach(([key, value]) => {
      if (value) {
        params.append(key, String(value));
      }
    });
    return params.toString();
  }, [analyticsFilters]);

  // 1. FETCH AI AGENTS REGISTRY
  const { data: agentsData, isLoading: agentsLoading } = useQuery({
    queryKey: ['/brand-api/ai/agents', filterParams],
    queryFn: async () => {
      const response = await fetch(`/brand-api/ai/agents?${filterParams}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: activeTab === 'registry' && isAuthenticated
  });

  // 2. REAL-TIME AI USAGE ANALYTICS
  const sseAnalyticsUrl = `/brand-api/ai/analytics/stream?${analyticsParams}`;
  const fallbackAnalyticsUrl = `/brand-api/ai/analytics?${analyticsParams}`;
  
  const { 
    data: analyticsData, 
    isLoading: analyticsLoading, 
    isConnected: analyticsConnected,
    error: analyticsError,
    lastUpdate: analyticsLastUpdate
  } = useSSE<{ success: boolean; data: AIUsageStats }>(
    sseAnalyticsUrl, 
    fallbackAnalyticsUrl, 
    {
      enabled: activeTab === 'analytics' && isAuthenticated
    }
  );

  // 3. TENANT CONFIGURATIONS
  const { data: configurationsData, isLoading: configurationsLoading } = useQuery({
    queryKey: ['/brand-api/ai/configurations', currentTenant],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentTenant && !isCrossTenant) {
        params.append('tenantId', currentTenant);
      }
      const response = await fetch(`/brand-api/ai/configurations?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    enabled: activeTab === 'configurations' && isAuthenticated
  });

  // 4. CREATE/UPDATE AGENT MUTATION
  const saveAgentMutation = useMutation({
    mutationFn: async (data: typeof agentForm) => {
      const url = editingAgent 
        ? `/brand-api/ai/agents/${editingAgent.id}`
        : '/brand-api/ai/agents';
      const method = editingAgent ? 'PUT' : 'POST';
      
      return apiRequest(url, {
        method,
        body: JSON.stringify({
          ...data,
          personality: JSON.parse(data.personality),
          baseConfiguration: JSON.parse(data.baseConfiguration)
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/ai/agents'] });
      setShowAgentModal(false);
      setEditingAgent(null);
      resetAgentForm();
      alert(editingAgent ? 'Agente aggiornato con successo!' : 'Agente creato con successo!');
    },
    onError: (error) => {
      console.error('Error saving agent:', error);
      alert('Errore nel salvataggio dell\'agente');
    }
  });

  // 5. BULK OPERATIONS MUTATION
  const bulkOperationMutation = useMutation({
    mutationFn: async (operation: { operation: string; agentIds: string[]; values?: any }) => {
      return apiRequest('/brand-api/ai/agents/bulk', {
        method: 'POST',
        body: JSON.stringify(operation)
      });
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/ai/agents'] });
      setSelectedAgents([]);
      setBulkOperation('');
      alert(`Operazione completata: ${result.processedCount} elaborati, ${result.errorCount} errori`);
    },
    onError: (error) => {
      console.error('Error in bulk operation:', error);
      alert('Errore nell\'operazione bulk');
    }
  });

  // 6. RAG KNOWLEDGE BASE MUTATIONS
  const uploadDocumentsMutation = useMutation({
    mutationFn: async ({ agentId, files }: { agentId: string; files: File[] }) => {
      const formData = new FormData();
      files.forEach(file => formData.append('documents', file));
      
      const response = await fetch(`/brand-api/ai/agents/${agentId}/documents`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload documents');
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/ai/agents', variables.agentId, 'knowledge'] });
      alert(`Documenti caricati con successo! Processamento in corso...`);
    },
    onError: (error) => {
      console.error('Error uploading documents:', error);
      alert('Errore nel caricamento documenti');
    }
  });

  const addUrlMutation = useMutation({
    mutationFn: async ({ agentId, url }: { agentId: string; url: string }) => {
      return apiRequest(`/brand-api/ai/agents/${agentId}/urls`, {
        method: 'POST',
        body: JSON.stringify({ url })
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/ai/agents', variables.agentId, 'knowledge'] });
      queryClient.invalidateQueries({ queryKey: ['/brand-api/ai/agents', variables.agentId, 'urls'] });
      alert(`URL aggiunto con successo! Processamento in corso...`);
    },
    onError: (error) => {
      console.error('Error adding URL:', error);
      alert('Errore nell\'aggiunta URL');
    }
  });

  // 7. KNOWLEDGE BASE QUERY - Per visualizzare documenti/URL embeddati
  const { data: knowledgeData, isLoading: isLoadingKnowledge } = useQuery({
    queryKey: ['/brand-api/ai/agents', knowledgeAgent?.id, 'knowledge'],
    queryFn: () => apiRequest(`/brand-api/ai/agents/${knowledgeAgent.id}/knowledge`),
    enabled: !!knowledgeAgent?.id && showKnowledgeModal,
    staleTime: 30000 // Cache per 30 secondi
  });

  // 8. DELETE KNOWLEDGE MUTATIONS - Per eliminare documenti/URL
  const deleteKnowledgeMutation = useMutation({
    mutationFn: async ({ agentId, itemId, type }: { agentId: string; itemId: string; type: 'document' | 'url' }) => {
      return apiRequest(`/brand-api/ai/agents/${agentId}/knowledge/${itemId}`, {
        method: 'DELETE',
        body: JSON.stringify({ type })
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/ai/agents', variables.agentId, 'knowledge'] });
      queryClient.invalidateQueries({ queryKey: ['/brand-api/ai/agents', variables.agentId, 'urls'] });
      alert(`${variables.type === 'document' ? 'Documento' : 'URL'} eliminato con successo!`);
    },
    onError: (error) => {
      console.error('Error deleting knowledge item:', error);
      alert('Errore nell\'eliminazione');
    }
  });

  // 9. URL LIST QUERY - Per visualizzare URL nel modal editing
  const { data: urlListData, isLoading: isLoadingUrls } = useQuery({
    queryKey: ['/brand-api/ai/agents', editingAgent?.id, 'urls'],
    queryFn: () => apiRequest(`/brand-api/ai/agents/${editingAgent.id}/urls`),
    enabled: !!editingAgent?.id && showAgentModal,
    staleTime: 10000 // Cache per 10 secondi
  });

  if (!isAuthenticated) {
    window.location.href = '/brandinterface/login';
    return null;
  }

  // Helper functions
  const resetAgentForm = () => {
    setAgentForm({
      agentId: '',
      name: '',
      description: '',
      systemPrompt: '',
      personality: '{}',
      moduleContext: 'general',
      baseConfiguration: '{"maxTokens": 4000, "temperature": 0.7, "model": "gpt-4-turbo"}'
    });
  };

  const handleEditAgent = (agent: AIAgent) => {
    setEditingAgent(agent);
    setAgentForm({
      agentId: agent.agentId,
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      personality: JSON.stringify(agent.personality, null, 2),
      moduleContext: agent.moduleContext,
      baseConfiguration: JSON.stringify(agent.baseConfiguration, null, 2)
    });
    setShowAgentModal(true);
  };

  const handleViewKnowledge = (agent: AIAgent) => {
    setKnowledgeAgent(agent);
    setShowKnowledgeModal(true);
  };

  const handleBulkOperation = () => {
    if (!bulkOperation || selectedAgents.length === 0) {
      alert('Seleziona agenti e operazione');
      return;
    }

    const operation = {
      operation: bulkOperation,
      agentIds: selectedAgents,
      reason: `Bulk ${bulkOperation} operation by ${user?.email}`
    };

    bulkOperationMutation.mutate(operation);
  };

  const toggleAgentSelection = (agentId: string) => {
    setSelectedAgents(prev => 
      prev.includes(agentId) 
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    );
  };

  const toggleSelectAll = () => {
    const allAgentIds = agentsData?.data?.agents?.map((a: AIAgent) => a.id) || [];
    setSelectedAgents(prev => 
      prev.length === allAgentIds.length ? [] : allAgentIds
    );
  };

  const getModuleIcon = (module: string) => {
    const icons = {
      sales: TrendingUp,
      support: MessageCircle,
      hr: Users,
      finance: DollarSign,
      analytics: BarChart3,
      general: Bot
    };
    return icons[module as keyof typeof icons] || Bot;
  };

  const getModuleColor = (module: string) => {
    const colors = {
      sales: COLORS.primary.orange,
      support: COLORS.semantic.info,
      hr: COLORS.primary.purple,
      finance: COLORS.semantic.success,
      analytics: COLORS.semantic.warning,
      general: COLORS.neutral.medium
    };
    return colors[module as keyof typeof colors] || COLORS.neutral.medium;
  };

  // Export CSV functionality
  const handleExportCSV = async () => {
    try {
      const response = await fetch(`/brand-api/ai/agents/export.csv?${filterParams}`);
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-agents-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      alert('Export CSV completato!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Errore durante l\'export CSV');
    }
  };

  // Role-based access control
  if (user?.role !== 'super_admin' && user?.role !== 'national_manager') {
    return (
      <BrandLayout>
        <div style={{ 
          padding: '64px 24px', 
          textAlign: 'center',
          ...cardStyle,
          margin: '24px',
        }}>
          <Shield size={64} style={{ color: COLORS.neutral.medium, marginBottom: '16px' }} />
          <h2 style={{ color: COLORS.neutral.dark, marginBottom: '8px' }}>
            Accesso Non Autorizzato
          </h2>
          <p style={{ color: COLORS.neutral.medium }}>
            Solo Super Admin e National Manager possono accedere all'AI Management.
          </p>
        </div>
      </BrandLayout>
    );
  }

  // Tab configuration
  const tabs = [
    {
      id: 'registry',
      name: 'Registry Agenti',
      icon: Brain,
      description: 'Gestione agenti AI centralizzata'
    },
    {
      id: 'configurations',
      name: 'Configurazioni',
      icon: Settings,
      description: 'Configurazioni per tenant'
    },
    {
      id: 'analytics',
      name: 'Analytics',
      icon: BarChart3,
      description: 'Monitoring utilizzo agenti'
    }
  ];

  return (
    <BrandLayout>
      <div style={{ padding: '0 24px 24px' }}>
        {/* Header Section */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px'
          }}>
            <div>
              <h1 style={{
                fontSize: '32px',
                fontWeight: 700,
                color: COLORS.neutral.dark,
                margin: '0 0 8px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  padding: '12px',
                  background: COLORS.gradients.purple,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Brain size={24} color="white" />
                </div>
                AI Management
              </h1>
              <p style={{
                color: COLORS.neutral.medium,
                fontSize: '16px',
                margin: 0
              }}>
                Gestione centralizzata degli agenti AI e configurazioni tenant
              </p>
            </div>

            <button
              onClick={() => setShowAgentModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: COLORS.gradients.orange,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(255, 105, 0, 0.3)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              data-testid="button-create-agent"
            >
              <Plus size={16} />
              Nuovo Agente
            </button>
          </div>

          {/* Quick Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              ...cardStyle,
              padding: '20px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <span style={{
                  fontSize: '14px',
                  color: COLORS.neutral.medium,
                  fontWeight: 500
                }}>
                  Agenti Totali
                </span>
                <Bot size={20} style={{ color: COLORS.primary.purple }} />
              </div>
              <div style={{
                fontSize: '24px',
                fontWeight: 700,
                color: COLORS.neutral.dark
              }}>
                <AnimatedCounter value={analyticsData?.data?.totalAgents || agentsData?.data?.agents?.length || 1} />
              </div>
            </div>

            <div style={{
              ...cardStyle,
              padding: '20px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <span style={{
                  fontSize: '14px',
                  color: COLORS.neutral.medium,
                  fontWeight: 500
                }}>
                  Agenti Attivi
                </span>
                <Activity size={20} style={{ color: COLORS.semantic.success }} />
              </div>
              <div style={{
                fontSize: '24px',
                fontWeight: 700,
                color: COLORS.semantic.success
              }}>
                <AnimatedCounter value={analyticsData?.data?.activeAgents || 1} />
              </div>
            </div>

            <div style={{
              ...cardStyle,
              padding: '20px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <span style={{
                  fontSize: '14px',
                  color: COLORS.neutral.medium,
                  fontWeight: 500
                }}>
                  Interazioni Totali
                </span>
                <MessageCircle size={20} style={{ color: COLORS.primary.orange }} />
              </div>
              <div style={{
                fontSize: '24px',
                fontWeight: 700,
                color: COLORS.primary.orange
              }}>
                <AnimatedCounter value={analyticsData?.data?.totalInteractions || 0} />
              </div>
            </div>

            <div style={{
              ...cardStyle,
              padding: '20px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <span style={{
                  fontSize: '14px',
                  color: COLORS.neutral.medium,
                  fontWeight: 500
                }}>
                  Token Utilizzati
                </span>
                <Cpu size={20} style={{ color: COLORS.semantic.warning }} />
              </div>
              <div style={{
                fontSize: '24px',
                fontWeight: 700,
                color: COLORS.semantic.warning
              }}>
                <AnimatedCounter value={analyticsData?.data?.totalTokensUsed || 0} />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: `2px solid ${COLORS.neutral.lighter}`,
          marginBottom: '24px'
        }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px 24px',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? `3px solid ${COLORS.primary.orange}` : '3px solid transparent',
                  color: isActive ? COLORS.primary.orange : COLORS.neutral.medium,
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = COLORS.neutral.dark;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = COLORS.neutral.medium;
                  }
                }}
                data-testid={`tab-${tab.id}`}
              >
                <Icon size={16} />
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'registry' && (
          <div>
            {/* Filters and Actions */}
            <div style={{
              ...cardStyle,
              padding: '20px',
              marginBottom: '24px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flex: 1
                }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ 
                      position: 'absolute', 
                      left: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      color: COLORS.neutral.medium 
                    }} />
                    <input
                      placeholder="Cerca agenti..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      style={{
                        padding: '10px 12px 10px 40px',
                        border: `1px solid ${COLORS.neutral.lighter}`,
                        borderRadius: '8px',
                        background: COLORS.neutral.white,
                        fontSize: '14px',
                        outline: 'none',
                        width: '200px',
                        transition: 'all 0.2s ease'
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary.orange}
                      onBlur={(e) => e.currentTarget.style.borderColor = COLORS.neutral.lighter}
                      data-testid="input-search-agents"
                    />
                  </div>

                  <select
                    value={filters.moduleContext}
                    onChange={(e) => setFilters(prev => ({ ...prev, moduleContext: e.target.value as any }))}
                    style={{
                      padding: '10px 12px',
                      border: `1px solid ${COLORS.neutral.lighter}`,
                      borderRadius: '8px',
                      background: COLORS.neutral.white,
                      fontSize: '14px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                    data-testid="select-module-filter"
                  >
                    <option value="all">Tutti i Moduli</option>
                    <option value="sales">Sales</option>
                    <option value="support">Support</option>
                    <option value="hr">HR</option>
                    <option value="finance">Finance</option>
                    <option value="analytics">Analytics</option>
                    <option value="general">General</option>
                  </select>

                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                    style={{
                      padding: '10px 12px',
                      border: `1px solid ${COLORS.neutral.lighter}`,
                      borderRadius: '8px',
                      background: COLORS.neutral.white,
                      fontSize: '14px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                    data-testid="select-status-filter"
                  >
                    <option value="all">Tutti gli Stati</option>
                    <option value="active">Attivo</option>
                    <option value="inactive">Inattivo</option>
                    <option value="deprecated">Deprecato</option>
                  </select>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <button
                    onClick={handleExportCSV}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 16px',
                      background: COLORS.neutral.white,
                      border: `1px solid ${COLORS.neutral.lighter}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: COLORS.neutral.dark,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = COLORS.neutral.lightest}
                    onMouseLeave={(e) => e.currentTarget.style.background = COLORS.neutral.white}
                    data-testid="button-export-csv"
                  >
                    <Download size={14} />
                    Export CSV
                  </button>

                  <button
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['/brand-api/ai/agents'] })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 16px',
                      background: COLORS.neutral.white,
                      border: `1px solid ${COLORS.neutral.lighter}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: COLORS.neutral.dark,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = COLORS.neutral.lightest}
                    onMouseLeave={(e) => e.currentTarget.style.background = COLORS.neutral.white}
                    data-testid="button-refresh"
                  >
                    <RefreshCw size={14} />
                    Aggiorna
                  </button>
                </div>
              </div>

              {/* Bulk Operations */}
              {selectedAgents.length > 0 && (
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  background: `${COLORS.primary.orange}10`,
                  borderRadius: '8px',
                  border: `1px solid ${COLORS.primary.orange}30`
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <span style={{
                      fontSize: '14px',
                      color: COLORS.neutral.dark,
                      fontWeight: 600
                    }}>
                      {selectedAgents.length} agenti selezionati
                    </span>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <select
                        value={bulkOperation}
                        onChange={(e) => setBulkOperation(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          border: `1px solid ${COLORS.neutral.lighter}`,
                          borderRadius: '6px',
                          background: COLORS.neutral.white,
                          fontSize: '14px',
                          outline: 'none'
                        }}
                        data-testid="select-bulk-operation"
                      >
                        <option value="">Seleziona operazione...</option>
                        <option value="activate">Attiva</option>
                        <option value="deactivate">Disattiva</option>
                        <option value="deprecate">Depreca</option>
                        <option value="delete">Elimina</option>
                      </select>
                      
                      <button
                        onClick={handleBulkOperation}
                        disabled={!bulkOperation || bulkOperationMutation.isPending}
                        style={{
                          padding: '8px 16px',
                          background: COLORS.primary.orange,
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: bulkOperation ? 'pointer' : 'not-allowed',
                          opacity: bulkOperation ? 1 : 0.5,
                          transition: 'all 0.2s ease'
                        }}
                        data-testid="button-execute-bulk"
                      >
                        {bulkOperationMutation.isPending ? (
                          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                          'Esegui'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Agents Table */}
            <div style={{ ...cardStyle }}>
              {agentsLoading ? (
                <div style={{
                  padding: '64px',
                  textAlign: 'center',
                  color: COLORS.neutral.medium
                }}>
                  <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
                  <p>Caricamento agenti AI...</p>
                </div>
              ) : (
                <div style={{ overflow: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse'
                  }}>
                    <thead>
                      <tr style={{
                        background: COLORS.neutral.lightest,
                        borderBottom: `1px solid ${COLORS.neutral.lighter}`
                      }}>
                        <th style={{
                          padding: '16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: COLORS.neutral.medium,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          <input
                            type="checkbox"
                            checked={selectedAgents.length === (agentsData?.data?.agents?.length || 0) && selectedAgents.length > 0}
                            onChange={toggleSelectAll}
                            style={{ marginRight: '8px' }}
                            data-testid="checkbox-select-all"
                          />
                          Agente
                        </th>
                        <th style={{
                          padding: '16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: COLORS.neutral.medium,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Modulo
                        </th>
                        <th style={{
                          padding: '16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: COLORS.neutral.medium,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Stato
                        </th>
                        <th style={{
                          padding: '16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: COLORS.neutral.medium,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Versione
                        </th>
                        <th style={{
                          padding: '16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: COLORS.neutral.medium,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Aggiornato
                        </th>
                        <th style={{
                          padding: '16px',
                          textAlign: 'center',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: COLORS.neutral.medium,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Azioni
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {agentsData?.data?.agents?.map((agent: AIAgent) => {
                        const ModuleIcon = getModuleIcon(agent.moduleContext);
                        const moduleColor = getModuleColor(agent.moduleContext);
                        
                        return (
                          <tr
                            key={agent.id}
                            style={{
                              borderBottom: `1px solid ${COLORS.neutral.lighter}`,
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = COLORS.neutral.lightest}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '16px' }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                              }}>
                                <input
                                  type="checkbox"
                                  checked={selectedAgents.includes(agent.id)}
                                  onChange={() => toggleAgentSelection(agent.id)}
                                  data-testid={`checkbox-agent-${agent.agentId}`}
                                />
                                <div style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '10px',
                                  background: `${moduleColor}15`,
                                  border: `2px solid ${moduleColor}30`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <ModuleIcon size={20} style={{ color: moduleColor }} />
                                </div>
                                <div>
                                  <div style={{
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: COLORS.neutral.dark,
                                    marginBottom: '4px'
                                  }}>
                                    {agent.name}
                                  </div>
                                  <div style={{
                                    fontSize: '12px',
                                    color: COLORS.neutral.medium,
                                    fontFamily: 'JetBrains Mono, monospace'
                                  }}>
                                    {agent.agentId}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '16px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 12px',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: moduleColor,
                                background: `${moduleColor}15`,
                                borderRadius: '12px',
                                border: `1px solid ${moduleColor}30`,
                                textTransform: 'capitalize'
                              }}>
                                <ModuleIcon size={12} />
                                {agent.moduleContext}
                              </span>
                            </td>
                            <td style={{ padding: '16px' }}>
                              <StatusBadge status={agent.status} />
                            </td>
                            <td style={{ padding: '16px' }}>
                              <span style={{
                                fontSize: '14px',
                                color: COLORS.neutral.dark,
                                fontWeight: 500
                              }}>
                                v{agent.version}
                              </span>
                            </td>
                            <td style={{ padding: '16px' }}>
                              <span style={{
                                fontSize: '14px',
                                color: COLORS.neutral.medium
                              }}>
                                {format(new Date(agent.updatedAt), 'dd/MM/yyyy')}
                              </span>
                            </td>
                            <td style={{ padding: '16px', textAlign: 'center' }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                              }}>
                                <button
                                  onClick={() => handleEditAgent(agent)}
                                  style={{
                                    padding: '6px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: COLORS.neutral.medium,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = COLORS.neutral.lightest;
                                    e.currentTarget.style.color = COLORS.primary.orange;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = COLORS.neutral.medium;
                                  }}
                                  data-testid={`button-edit-${agent.agentId}`}
                                >
                                  <Edit size={16} />
                                </button>
                                
                                <button
                                  onClick={() => handleViewKnowledge(agent)}
                                  style={{
                                    padding: '6px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: COLORS.neutral.medium,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = COLORS.neutral.lightest;
                                    e.currentTarget.style.color = COLORS.semantic.info;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = COLORS.neutral.medium;
                                  }}
                                  data-testid={`button-view-${agent.agentId}`}
                                >
                                  <Eye size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }) || (
                        <tr>
                          <td colSpan={6} style={{
                            padding: '64px',
                            textAlign: 'center',
                            color: COLORS.neutral.medium
                          }}>
                            <Brain size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                            <p>Nessun agente AI trovato</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Agent Creation/Edit Modal */}
        {showAgentModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{
              ...cardStyle,
              width: '90%',
              maxWidth: '800px',
              padding: '32px',
              maxHeight: '90vh',
              overflowY: 'auto',
              animation: 'slideUp 0.3s ease'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
              }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: COLORS.neutral.dark,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <Brain size={24} style={{ color: COLORS.primary.purple }} />
                  {editingAgent ? 'Modifica Agente AI' : 'Crea Nuovo Agente AI'}
                </h3>
                <button
                  onClick={() => {
                    setShowAgentModal(false);
                    setEditingAgent(null);
                    resetAgentForm();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '8px',
                    color: COLORS.neutral.medium,
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = COLORS.neutral.lightest}
                  onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                  data-testid="button-close-agent-modal"
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark,
                    marginBottom: '8px'
                  }}>
                    ID Agente *
                  </label>
                  <input
                    type="text"
                    value={agentForm.agentId}
                    onChange={(e) => setAgentForm(prev => ({ ...prev, agentId: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${COLORS.neutral.lighter}`,
                      borderRadius: '8px',
                      background: COLORS.neutral.white,
                      color: COLORS.neutral.dark,
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary.orange}
                    onBlur={(e) => e.currentTarget.style.borderColor = COLORS.neutral.lighter}
                    placeholder="es: sales-assistant-v2"
                    data-testid="input-agent-id"
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark,
                    marginBottom: '8px'
                  }}>
                    Nome Agente *
                  </label>
                  <input
                    type="text"
                    value={agentForm.name}
                    onChange={(e) => setAgentForm(prev => ({ ...prev, name: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${COLORS.neutral.lighter}`,
                      borderRadius: '8px',
                      background: COLORS.neutral.white,
                      color: COLORS.neutral.dark,
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary.orange}
                    onBlur={(e) => e.currentTarget.style.borderColor = COLORS.neutral.lighter}
                    placeholder="es: Assistente Vendite WindTre"
                    data-testid="input-agent-name"
                  />
                </div>

                <div style={{ gridColumn: '1 / 3' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark,
                    marginBottom: '8px'
                  }}>
                    Descrizione
                  </label>
                  <textarea
                    value={agentForm.description}
                    onChange={(e) => setAgentForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${COLORS.neutral.lighter}`,
                      borderRadius: '8px',
                      background: COLORS.neutral.white,
                      color: COLORS.neutral.dark,
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary.orange}
                    onBlur={(e) => e.currentTarget.style.borderColor = COLORS.neutral.lighter}
                    placeholder="Descrizione delle capacità e del ruolo dell'agente..."
                    data-testid="textarea-agent-description"
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark,
                    marginBottom: '8px'
                  }}>
                    Modulo di Contesto *
                  </label>
                  <select
                    value={agentForm.moduleContext}
                    onChange={(e) => setAgentForm(prev => ({ ...prev, moduleContext: e.target.value as any }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${COLORS.neutral.lighter}`,
                      borderRadius: '8px',
                      background: COLORS.neutral.white,
                      color: COLORS.neutral.dark,
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary.orange}
                    onBlur={(e) => e.currentTarget.style.borderColor = COLORS.neutral.lighter}
                    data-testid="select-agent-module"
                  >
                    <option value="general">General</option>
                    <option value="sales">Sales</option>
                    <option value="support">Support</option>
                    <option value="hr">HR</option>
                    <option value="finance">Finance</option>
                    <option value="analytics">Analytics</option>
                  </select>
                </div>

                <div style={{ gridColumn: '1 / 3' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark,
                    marginBottom: '8px'
                  }}>
                    System Prompt *
                  </label>
                  <textarea
                    value={agentForm.systemPrompt}
                    onChange={(e) => setAgentForm(prev => ({ ...prev, systemPrompt: e.target.value }))}
                    rows={6}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${COLORS.neutral.lighter}`,
                      borderRadius: '8px',
                      background: COLORS.neutral.white,
                      color: COLORS.neutral.dark,
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary.orange}
                    onBlur={(e) => e.currentTarget.style.borderColor = COLORS.neutral.lighter}
                    placeholder="Definisci la personalità e il comportamento dell'agente..."
                    data-testid="textarea-system-prompt"
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark,
                    marginBottom: '8px'
                  }}>
                    Personalità (JSON)
                  </label>
                  <textarea
                    value={agentForm.personality}
                    onChange={(e) => setAgentForm(prev => ({ ...prev, personality: e.target.value }))}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${COLORS.neutral.lighter}`,
                      borderRadius: '8px',
                      background: COLORS.neutral.white,
                      color: COLORS.neutral.dark,
                      fontSize: '12px',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary.orange}
                    onBlur={(e) => e.currentTarget.style.borderColor = COLORS.neutral.lighter}
                    placeholder='{"tone": "friendly", "expertise": "sales"}'
                    data-testid="textarea-personality"
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.neutral.dark,
                    marginBottom: '8px'
                  }}>
                    Configurazione Base (JSON)
                  </label>
                  <textarea
                    value={agentForm.baseConfiguration}
                    onChange={(e) => setAgentForm(prev => ({ ...prev, baseConfiguration: e.target.value }))}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `1px solid ${COLORS.neutral.lighter}`,
                      borderRadius: '8px',
                      background: COLORS.neutral.white,
                      color: COLORS.neutral.dark,
                      fontSize: '12px',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'JetBrains Mono, monospace'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary.orange}
                    onBlur={(e) => e.currentTarget.style.borderColor = COLORS.neutral.lighter}
                    data-testid="textarea-base-configuration"
                  />
                </div>
              </div>

              {/* RAG Training Section - Multi-Agent with Tabs */}
              {editingAgent?.agentId && (
                <RagKnowledgeSection 
                  agentId={editingAgent.agentId} 
                  agentName={editingAgent.name || editingAgent.agentId}
                />
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '32px',
                paddingTop: '24px',
                borderTop: `1px solid ${COLORS.neutral.lighter}`
              }}>
                <button
                  onClick={() => {
                    setShowAgentModal(false);
                    setEditingAgent(null);
                    resetAgentForm();
                  }}
                  style={{
                    padding: '12px 24px',
                    background: COLORS.neutral.white,
                    color: COLORS.neutral.dark,
                    border: `1px solid ${COLORS.neutral.lighter}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = COLORS.neutral.lightest}
                  onMouseLeave={(e) => e.currentTarget.style.background = COLORS.neutral.white}
                  data-testid="button-cancel-agent"
                >
                  Annulla
                </button>
                
                <button
                  onClick={() => saveAgentMutation.mutate(agentForm)}
                  disabled={!agentForm.agentId || !agentForm.name || !agentForm.systemPrompt || saveAgentMutation.isPending}
                  style={{
                    padding: '12px 24px',
                    background: COLORS.gradients.orange,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: agentForm.agentId && agentForm.name && agentForm.systemPrompt ? 'pointer' : 'not-allowed',
                    opacity: agentForm.agentId && agentForm.name && agentForm.systemPrompt ? 1 : 0.5,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  data-testid="button-save-agent"
                >
                  {saveAgentMutation.isPending ? (
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    editingAgent ? <Edit size={16} /> : <Plus size={16} />
                  )}
                  {editingAgent ? 'Aggiorna' : 'Crea'} Agente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs content would go here... */}
        {activeTab === 'configurations' && (
          <div style={{
            ...cardStyle,
            padding: '64px',
            textAlign: 'center'
          }}>
            <Settings size={48} style={{ color: COLORS.neutral.medium, marginBottom: '16px' }} />
            <h3 style={{ color: COLORS.neutral.dark, marginBottom: '8px' }}>
              Configurazioni Tenant
            </h3>
            <p style={{ color: COLORS.neutral.medium }}>
              Gestione configurazioni specifiche per tenant - In arrivo...
            </p>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div style={{
            ...cardStyle,
            padding: '64px',
            textAlign: 'center'
          }}>
            <BarChart3 size={48} style={{ color: COLORS.neutral.medium, marginBottom: '16px' }} />
            <h3 style={{ color: COLORS.neutral.dark, marginBottom: '8px' }}>
              Analytics Utilizzo
            </h3>
            <p style={{ color: COLORS.neutral.medium }}>
              Monitoring e analytics degli agenti AI - In arrivo...
            </p>
          </div>
        )}

        {/* 📚 Knowledge Base Viewer Modal */}
        {showKnowledgeModal && knowledgeAgent && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '900px',
              maxHeight: '80vh',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
              {/* Modal Header */}
              <div style={{
                padding: '24px',
                borderBottom: `1px solid ${COLORS.neutral.lighter}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Database size={24} style={{ color: COLORS.primary.purple }} />
                  <div>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: COLORS.neutral.dark,
                      margin: 0
                    }}>
                      Knowledge Base: {knowledgeAgent.name}
                    </h3>
                    <p style={{
                      fontSize: '14px',
                      color: COLORS.neutral.medium,
                      margin: '4px 0 0 0'
                    }}>
                      Documenti e URL embeddati nel contesto RAG
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowKnowledgeModal(false);
                    setKnowledgeAgent(null);
                  }}
                  style={{
                    padding: '8px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: COLORS.neutral.medium,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = COLORS.neutral.lightest}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  data-testid="button-close-knowledge-modal"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div style={{
                padding: '24px',
                maxHeight: 'calc(80vh - 120px)',
                overflowY: 'auto'
              }}>
                {isLoadingKnowledge ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '64px'
                  }}>
                    <Loader2 size={48} style={{ 
                      color: COLORS.primary.purple, 
                      marginBottom: '16px',
                      animation: 'spin 1s linear infinite' 
                    }} />
                    <p style={{ color: COLORS.neutral.medium }}>
                      Caricamento knowledge base...
                    </p>
                  </div>
                ) : knowledgeData?.data?.knowledgeBase?.length > 0 ? (
                  <div>
                    {/* Stats Overview */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '16px',
                      marginBottom: '32px'
                    }}>
                      <div style={{
                        background: `${COLORS.primary.orange}15`,
                        border: `1px solid ${COLORS.primary.orange}30`,
                        borderRadius: '12px',
                        padding: '16px',
                        textAlign: 'center'
                      }}>
                        <div style={{
                          fontSize: '24px',
                          fontWeight: 700,
                          color: COLORS.primary.orange,
                          marginBottom: '4px'
                        }}>
                          {knowledgeData.data.stats.totalDocuments}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: COLORS.neutral.medium,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Documenti
                        </div>
                      </div>
                      <div style={{
                        background: `${COLORS.primary.purple}15`,
                        border: `1px solid ${COLORS.primary.purple}30`,
                        borderRadius: '12px',
                        padding: '16px',
                        textAlign: 'center'
                      }}>
                        <div style={{
                          fontSize: '24px',
                          fontWeight: 700,
                          color: COLORS.primary.purple,
                          marginBottom: '4px'
                        }}>
                          {knowledgeData.data.stats.totalUrls}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: COLORS.neutral.medium,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          URL Sources
                        </div>
                      </div>
                      <div style={{
                        background: `${COLORS.semantic.info}15`,
                        border: `1px solid ${COLORS.semantic.info}30`,
                        borderRadius: '12px',
                        padding: '16px',
                        textAlign: 'center'
                      }}>
                        <div style={{
                          fontSize: '24px',
                          fontWeight: 700,
                          color: COLORS.semantic.info,
                          marginBottom: '4px'
                        }}>
                          {knowledgeData.data.stats.totalEmbeddings}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: COLORS.neutral.medium,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Embeddings
                        </div>
                      </div>
                    </div>

                    {/* Knowledge Items List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {knowledgeData.data.knowledgeBase.map((item: any, index: number) => (
                        <div key={item.id || index} style={{
                          background: COLORS.neutral.white,
                          border: `1px solid ${COLORS.neutral.lighter}`,
                          borderRadius: '12px',
                          padding: '16px',
                          transition: 'all 0.2s ease'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            marginBottom: '8px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                              {item.sourceType === 'pdf_document' ? (
                                <FileText size={16} style={{ color: COLORS.semantic.error }} />
                              ) : (
                                <Link2 size={16} style={{ color: COLORS.semantic.info }} />
                              )}
                              <span style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: COLORS.neutral.dark
                              }}>
                                {item.filename || item.sourceUrl}
                              </span>
                              <span style={{
                                fontSize: '11px',
                                background: item.origin === 'brand' ? COLORS.primary.orange : COLORS.primary.purple,
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                {item.origin === 'brand' ? 'Brand' : 'Tenant'}
                              </span>
                            </div>
                            
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px',
                              marginLeft: '12px'
                            }}>
                              <span style={{
                                fontSize: '12px',
                                color: COLORS.neutral.light,
                                whiteSpace: 'nowrap'
                              }}>
                                {format(new Date(item.createdAt), 'dd/MM/yyyy HH:mm')}
                              </span>
                              
                              {/* 🗑️ DELETE BUTTON - Solo per elementi Brand-level */}
                              {item.origin === 'brand' && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Sei sicuro di voler eliminare ${item.filename || item.sourceUrl}?`)) {
                                      deleteKnowledgeMutation.mutate({
                                        agentId: knowledgeAgent.id,
                                        itemId: item.id,
                                        type: item.sourceType === 'pdf_document' ? 'document' : 'url'
                                      });
                                    }
                                  }}
                                  disabled={deleteKnowledgeMutation.isPending}
                                  style={{
                                    padding: '4px',
                                    background: 'transparent',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: COLORS.neutral.light,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    opacity: deleteKnowledgeMutation.isPending ? 0.5 : 1
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = `${COLORS.semantic.error}15`;
                                    e.currentTarget.style.color = COLORS.semantic.error;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = COLORS.neutral.light;
                                  }}
                                  data-testid={`button-delete-knowledge-${item.id}`}
                                >
                                  {deleteKnowledgeMutation.isPending ? (
                                    <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                                  ) : (
                                    <Trash2 size={12} />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                          <p style={{
                            fontSize: '13px',
                            color: COLORS.neutral.medium,
                            lineHeight: '1.4',
                            margin: 0
                          }}>
                            {item.contentPreview}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '64px',
                    textAlign: 'center'
                  }}>
                    <Database size={64} style={{ 
                      color: COLORS.neutral.light, 
                      marginBottom: '16px',
                      opacity: 0.5 
                    }} />
                    <h4 style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: COLORS.neutral.dark,
                      marginBottom: '8px'
                    }}>
                      Nessuna Knowledge Base
                    </h4>
                    <p style={{
                      fontSize: '14px',
                      color: COLORS.neutral.medium,
                      maxWidth: '400px',
                      lineHeight: '1.5'
                    }}>
                      Questo agente non ha ancora documenti o URL nella sua knowledge base.
                      Utilizza la sezione "RAG Training" nel modal di modifica per aggiungere contenuti.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </BrandLayout>
  );
}