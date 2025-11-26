import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { 
  X, Settings, Database, Activity, Copy, Check, 
  Trash2, FileText, Link2, MessageSquare, RefreshCw,
  Loader2, ChevronDown, ChevronUp, AlertCircle,
  Globe, File, Cpu, Thermometer, Target, Layers,
  Clock, Zap, PieChart
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const COLORS = {
  primary: {
    orange: '#FF6900',
    orangeLight: '#ff8533',
    purple: '#7B2CBF',
    purpleLight: '#9747ff',
  },
  semantic: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  neutral: {
    dark: '#1f2937',
    medium: '#6b7280',
    light: '#9ca3af',
    lighter: '#e5e7eb',
    lightest: '#f9fafb',
    white: '#ffffff',
  }
};

interface AgentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  agentName: string;
  agentConfig?: {
    systemPrompt?: string;
    description?: string;
    role?: string;
    temperature?: number;
    llmModel?: string;
  };
}

type TabType = 'configuration' | 'knowledge' | 'health';

const sourceTypeConfig: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  document: { icon: FileText, label: 'Documento', color: COLORS.semantic.info },
  web_url: { icon: Globe, label: 'Web URL', color: COLORS.primary.purple },
  manual_text: { icon: MessageSquare, label: 'Testo Manuale', color: COLORS.semantic.success },
  pdf: { icon: File, label: 'PDF', color: COLORS.semantic.error },
};

export default function AgentDetailsModal({ isOpen, onClose, agentId, agentName, agentConfig }: AgentDetailsModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('configuration');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const { data: detailsData, isLoading: loadingDetails, refetch: refetchDetails } = useQuery({
    queryKey: ['/brand-api/agents', agentId, 'details'],
    queryFn: () => apiRequest(`/brand-api/agents/${agentId}/details`),
    enabled: isOpen
  });

  const { data: sourcesData, isLoading: loadingSources, refetch: refetchSources } = useQuery({
    queryKey: ['/brand-api/agents', agentId, 'rag', 'sources'],
    queryFn: () => apiRequest(`/brand-api/agents/${agentId}/rag/sources`),
    enabled: isOpen && activeTab === 'knowledge'
  });

  const deleteSourceMutation = useMutation({
    mutationFn: (sourceId: string) => 
      apiRequest(`/brand-api/agents/${agentId}/rag/sources/${sourceId}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/agents', agentId] });
      showToast('Fonte eliminata con successo', 'success');
      setDeletingSourceId(null);
    },
    onError: (error: any) => {
      showToast(error?.message || 'Errore durante l\'eliminazione', 'error');
      setDeletingSourceId(null);
    }
  });

  const details = (detailsData as any)?.data;
  const sources = (sourcesData as any)?.data || [];

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: typeof Settings }[] = [
    { id: 'configuration', label: 'Configurazione', icon: Settings },
    { id: 'knowledge', label: 'Knowledge Base', icon: Database },
    { id: 'health', label: 'RAG Health', icon: Activity },
  ];

  const renderConfiguration = () => {
    const config = details?.configuration || {};
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {agentConfig?.systemPrompt && (
          <div style={{
            background: COLORS.neutral.lightest,
            borderRadius: '12px',
            padding: '16px',
            border: `1px solid ${COLORS.neutral.lighter}`
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: 600, 
                color: COLORS.neutral.dark 
              }}>
                System Prompt
              </span>
              <button
                onClick={() => copyToClipboard(agentConfig.systemPrompt!, 'systemPrompt')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: copiedField === 'systemPrompt' ? COLORS.semantic.success : COLORS.neutral.medium,
                  background: 'white',
                  border: `1px solid ${COLORS.neutral.lighter}`,
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                data-testid="button-copy-prompt"
              >
                {copiedField === 'systemPrompt' ? <Check size={14} /> : <Copy size={14} />}
                {copiedField === 'systemPrompt' ? 'Copiato!' : 'Copia'}
              </button>
            </div>
            <pre style={{
              fontSize: '13px',
              color: COLORS.neutral.dark,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'monospace',
              margin: 0,
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {agentConfig.systemPrompt}
            </pre>
          </div>
        )}

        {agentConfig?.description && (
          <div style={{
            background: COLORS.neutral.lightest,
            borderRadius: '12px',
            padding: '16px',
            border: `1px solid ${COLORS.neutral.lighter}`
          }}>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: 600, 
              color: COLORS.neutral.dark,
              display: 'block',
              marginBottom: '8px'
            }}>
              Descrizione Ruolo
            </span>
            <p style={{
              fontSize: '13px',
              color: COLORS.neutral.medium,
              margin: 0,
              lineHeight: 1.6
            }}>
              {agentConfig.description}
            </p>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px'
        }}>
          <ConfigCard
            icon={Thermometer}
            label="Temperature"
            value={agentConfig?.temperature?.toFixed(2) || config.metadata?.temperature?.toFixed(2) || '0.70'}
            color={COLORS.semantic.warning}
          />
          <ConfigCard
            icon={Target}
            label="Similarity Threshold"
            value={config.similarityThreshold?.toFixed(2) || '0.30'}
            color={COLORS.primary.purple}
          />
          <ConfigCard
            icon={Cpu}
            label="Embedding Model"
            value={config.embeddingModel || 'text-embedding-3-small'}
            color={COLORS.semantic.info}
          />
          <ConfigCard
            icon={Layers}
            label="LLM Model"
            value={agentConfig?.llmModel || 'gpt-4o'}
            color={COLORS.primary.orange}
          />
          <ConfigCard
            icon={Zap}
            label="Top-K Results"
            value={config.topK?.toString() || '5'}
            color={COLORS.semantic.success}
          />
          <ConfigCard
            icon={FileText}
            label="Chunk Size"
            value={`${config.chunkSize || 512} tokens`}
            color={COLORS.neutral.medium}
          />
        </div>
      </div>
    );
  };

  const renderKnowledgeBase = () => {
    if (loadingSources) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: '60px',
          color: COLORS.neutral.medium
        }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ marginLeft: '12px' }}>Caricamento fonti...</span>
        </div>
      );
    }

    if (sources.length === 0) {
      return (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: COLORS.neutral.medium
        }}>
          <Database size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p style={{ margin: 0, fontSize: '14px' }}>Nessuna fonte caricata</p>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: COLORS.neutral.light }}>
            Aggiungi URL, documenti o testo per costruire la knowledge base
          </p>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span style={{ fontSize: '14px', color: COLORS.neutral.medium }}>
            {sources.length} fonte{sources.length !== 1 ? 'i' : ''} caricata{sources.length !== 1 ? 'e' : ''}
          </span>
          <button
            onClick={() => refetchSources()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              color: COLORS.neutral.medium,
              background: 'white',
              border: `1px solid ${COLORS.neutral.lighter}`,
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            data-testid="button-refresh-sources"
          >
            <RefreshCw size={14} />
            Aggiorna
          </button>
        </div>

        {sources.map((source: any) => {
          const typeInfo = sourceTypeConfig[source.sourceType] || sourceTypeConfig.document;
          const Icon = typeInfo.icon;
          const isDeleting = deletingSourceId === source.id;

          return (
            <div
              key={source.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: 'white',
                borderRadius: '10px',
                border: `1px solid ${COLORS.neutral.lighter}`,
                transition: 'all 0.2s'
              }}
              data-testid={`source-item-${source.id}`}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: `${typeInfo.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon size={18} style={{ color: typeInfo.color }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: COLORS.neutral.dark,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {source.sourceUrl || source.originalFilename || 'Testo manuale'}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: COLORS.neutral.light,
                  marginTop: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: `${typeInfo.color}15`,
                    color: typeInfo.color,
                    fontWeight: 500
                  }}>
                    {typeInfo.label}
                  </span>
                  <span>{source.chunksCount || 0} chunks</span>
                  {source.createdAt && (
                    <span>
                      {format(new Date(source.createdAt), 'dd MMM yyyy', { locale: it })}
                    </span>
                  )}
                </div>
              </div>

              <div style={{
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 500,
                background: source.status === 'completed' 
                  ? `${COLORS.semantic.success}15` 
                  : source.status === 'processing'
                  ? `${COLORS.semantic.warning}15`
                  : source.status === 'failed'
                  ? `${COLORS.semantic.error}15`
                  : `${COLORS.neutral.light}15`,
                color: source.status === 'completed' 
                  ? COLORS.semantic.success 
                  : source.status === 'processing'
                  ? COLORS.semantic.warning
                  : source.status === 'failed'
                  ? COLORS.semantic.error
                  : COLORS.neutral.light
              }}>
                {source.status === 'completed' ? 'Completato' :
                 source.status === 'processing' ? 'In corso...' :
                 source.status === 'failed' ? 'Fallito' : 'In attesa'}
              </div>

              <button
                onClick={() => {
                  setDeletingSourceId(source.id);
                  deleteSourceMutation.mutate(source.id);
                }}
                disabled={isDeleting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  border: 'none',
                  background: isDeleting ? COLORS.neutral.lighter : `${COLORS.semantic.error}10`,
                  color: COLORS.semantic.error,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.5 : 1
                }}
                data-testid={`button-delete-source-${source.id}`}
              >
                {isDeleting ? (
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Trash2 size={14} />
                )}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  const renderRagHealth = () => {
    if (loadingDetails) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          padding: '60px',
          color: COLORS.neutral.medium
        }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      );
    }

    const stats = details?.stats || {};
    const breakdown = details?.sourcesBreakdown || {};
    const totalSources = stats.sourcesCount || 0;
    const totalChunks = stats.chunksCount || 0;
    const estimatedTokens = stats.estimatedTokens || 0;

    const knowledgeLevel = Math.min(100, Math.round((totalChunks / 100) * 100));

    const breakdownData = Object.entries(breakdown).map(([type, count]) => ({
      type,
      count: count as number,
      label: sourceTypeConfig[type]?.label || type,
      color: sourceTypeConfig[type]?.color || COLORS.neutral.medium
    }));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px'
        }}>
          <StatCard
            label="Fonti Totali"
            value={totalSources}
            icon={Database}
            color={COLORS.primary.purple}
          />
          <StatCard
            label="Chunks"
            value={totalChunks}
            icon={Layers}
            color={COLORS.semantic.info}
          />
          <StatCard
            label="Token Stimati"
            value={estimatedTokens.toLocaleString()}
            icon={Zap}
            color={COLORS.semantic.success}
          />
          <StatCard
            label="Token Usati"
            value={stats.totalTokensUsed?.toLocaleString() || '0'}
            icon={Cpu}
            color={COLORS.primary.orange}
          />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${COLORS.neutral.lighter}`
          }}>
            <h4 style={{ 
              margin: '0 0 16px', 
              fontSize: '14px', 
              fontWeight: 600,
              color: COLORS.neutral.dark
            }}>
              Livello Knowledge Base
            </h4>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}>
              <GaugeChart value={knowledgeLevel} />
              <span style={{ 
                fontSize: '13px', 
                color: COLORS.neutral.medium 
              }}>
                {knowledgeLevel < 30 ? 'Base' : 
                 knowledgeLevel < 70 ? 'Intermedio' : 'Avanzato'}
              </span>
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${COLORS.neutral.lighter}`
          }}>
            <h4 style={{ 
              margin: '0 0 16px', 
              fontSize: '14px', 
              fontWeight: 600,
              color: COLORS.neutral.dark
            }}>
              Distribuzione Fonti
            </h4>
            {breakdownData.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {breakdownData.map(item => (
                  <div key={item.type} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '3px',
                      background: item.color
                    }} />
                    <span style={{ flex: 1, fontSize: '13px', color: COLORS.neutral.dark }}>
                      {item.label}
                    </span>
                    <span style={{ 
                      fontSize: '13px', 
                      fontWeight: 600, 
                      color: COLORS.neutral.dark 
                    }}>
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                color: COLORS.neutral.light,
                padding: '20px'
              }}>
                <PieChart size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '13px' }}>Nessuna fonte caricata</p>
              </div>
            )}
          </div>
        </div>

        {details?.recentActivity && details.recentActivity.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${COLORS.neutral.lighter}`
          }}>
            <h4 style={{ 
              margin: '0 0 16px', 
              fontSize: '14px', 
              fontWeight: 600,
              color: COLORS.neutral.dark
            }}>
              Attività Recente (Ultimi 7 Giorni)
            </h4>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '80px' }}>
              {details.recentActivity.map((day: { date: string; count: number }, i: number) => {
                const maxCount = Math.max(...details.recentActivity.map((d: any) => d.count));
                const height = maxCount > 0 ? (day.count / maxCount) * 60 + 20 : 20;
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${height}px`,
                        background: COLORS.primary.orange,
                        borderRadius: '4px',
                        opacity: day.count > 0 ? 1 : 0.2
                      }}
                    />
                    <span style={{ fontSize: '10px', color: COLORS.neutral.light }}>
                      {format(new Date(day.date), 'dd/MM')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {details?.updatedAt && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: COLORS.neutral.light
          }}>
            <Clock size={14} />
            Ultimo aggiornamento: {format(new Date(details.updatedAt), 'dd MMM yyyy, HH:mm', { locale: it })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '85vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: `1px solid ${COLORS.neutral.lighter}`
          }}>
            <div>
              <h2 style={{ 
                margin: 0, 
                fontSize: '18px', 
                fontWeight: 600,
                color: COLORS.neutral.dark
              }}>
                {agentName}
              </h2>
              <p style={{ 
                margin: '4px 0 0', 
                fontSize: '13px', 
                color: COLORS.neutral.medium 
              }}>
                Dettagli configurazione e knowledge base
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: 'none',
                background: COLORS.neutral.lightest,
                cursor: 'pointer',
                color: COLORS.neutral.medium
              }}
              data-testid="button-close-modal"
            >
              <X size={20} />
            </button>
          </div>

          <div style={{
            display: 'flex',
            gap: '4px',
            padding: '0 24px',
            borderBottom: `1px solid ${COLORS.neutral.lighter}`
          }}>
            {tabs.map(tab => {
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
                    padding: '12px 16px',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? COLORS.primary.orange : COLORS.neutral.medium,
                    background: 'transparent',
                    border: 'none',
                    borderBottom: isActive ? `2px solid ${COLORS.primary.orange}` : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '24px',
            background: COLORS.neutral.lightest
          }}>
            {activeTab === 'configuration' && renderConfiguration()}
            {activeTab === 'knowledge' && renderKnowledgeBase()}
            {activeTab === 'health' && renderRagHealth()}
          </div>
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '12px 20px',
          borderRadius: '8px',
          background: toast.type === 'success' ? COLORS.semantic.success : COLORS.semantic.error,
          color: 'white',
          fontSize: '14px',
          fontWeight: 500,
          zIndex: 1100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

function ConfigCard({ icon: Icon, label, value, color }: {
  icon: typeof Settings;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '10px',
      padding: '16px',
      border: `1px solid ${COLORS.neutral.lighter}`
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px'
      }}>
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '6px',
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={14} style={{ color }} />
        </div>
        <span style={{ fontSize: '12px', color: COLORS.neutral.medium }}>
          {label}
        </span>
      </div>
      <div style={{ 
        fontSize: '14px', 
        fontWeight: 600, 
        color: COLORS.neutral.dark,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {value}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string;
  value: number | string;
  icon: typeof Database;
  color: string;
}) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '10px',
      padding: '16px',
      border: `1px solid ${COLORS.neutral.lighter}`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        background: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '12px'
      }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div style={{ 
        fontSize: '20px', 
        fontWeight: 700, 
        color: COLORS.neutral.dark 
      }}>
        {value}
      </div>
      <div style={{ 
        fontSize: '12px', 
        color: COLORS.neutral.medium,
        marginTop: '4px'
      }}>
        {label}
      </div>
    </div>
  );
}

function GaugeChart({ value }: { value: number }) {
  const radius = 60;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  
  const getColor = (val: number) => {
    if (val < 30) return COLORS.semantic.error;
    if (val < 70) return COLORS.semantic.warning;
    return COLORS.semantic.success;
  };

  return (
    <svg width={radius * 2} height={radius + 20} viewBox={`0 0 ${radius * 2} ${radius + 20}`}>
      <path
        d={`M ${strokeWidth / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - strokeWidth / 2} ${radius}`}
        fill="none"
        stroke={COLORS.neutral.lighter}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d={`M ${strokeWidth / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - strokeWidth / 2} ${radius}`}
        fill="none"
        stroke={getColor(value)}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text
        x={radius}
        y={radius - 5}
        textAnchor="middle"
        fontSize="24"
        fontWeight="700"
        fill={COLORS.neutral.dark}
      >
        {value}%
      </text>
    </svg>
  );
}
