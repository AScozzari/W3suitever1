import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { 
  Database, Upload, Link2, Search, BarChart3, FileText,
  Loader2, Plus, Trash2, RefreshCw, Play, Check, X, XCircle,
  AlertCircle, ChevronDown, ChevronUp, Eye, Zap, File
} from 'lucide-react';

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

interface RagKnowledgeSectionProps {
  agentId: string;
  agentName: string;
}

type TabType = 'sources' | 'chunks' | 'playground' | 'analytics';

export default function RagKnowledgeSection({ agentId, agentName }: RagKnowledgeSectionProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>('sources');
  const [newUrl, setNewUrl] = useState('');
  const [newText, setNewText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [playgroundQuery, setPlaygroundQuery] = useState('');
  const [expandedChunk, setExpandedChunk] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const { data: statsData, isLoading: loadingStats } = useQuery({
    queryKey: ['/brand-api/agents', agentId, 'rag', 'stats'],
    queryFn: () => apiRequest(`/brand-api/agents/${agentId}/rag/stats`),
    staleTime: 30000
  });

  const { data: sourcesData, isLoading: loadingSources } = useQuery({
    queryKey: ['/brand-api/agents', agentId, 'rag', 'sources'],
    queryFn: () => apiRequest(`/brand-api/agents/${agentId}/rag/sources`),
    staleTime: 30000
  });

  const { data: chunksData, isLoading: loadingChunks } = useQuery({
    queryKey: ['/brand-api/agents', agentId, 'rag', 'chunks'],
    queryFn: () => apiRequest(`/brand-api/agents/${agentId}/rag/chunks?limit=100`),
    staleTime: 30000,
    enabled: activeTab === 'chunks'
  });

  const { data: usageData, isLoading: loadingUsage } = useQuery({
    queryKey: ['/brand-api/agents', agentId, 'rag', 'usage'],
    queryFn: () => apiRequest(`/brand-api/agents/${agentId}/rag/usage`),
    staleTime: 60000,
    enabled: activeTab === 'analytics'
  });

  const { data: jobsData } = useQuery({
    queryKey: ['/brand-api/agents', agentId, 'rag', 'jobs'],
    queryFn: () => apiRequest(`/brand-api/agents/${agentId}/rag/jobs`),
    staleTime: 15000,
    enabled: activeTab === 'sources' || activeTab === 'analytics'
  });

  const addUrlMutation = useMutation({
    mutationFn: (url: string) => 
      apiRequest(`/brand-api/agents/${agentId}/rag/sources/url`, {
        method: 'POST',
        body: JSON.stringify({ url })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/agents', agentId, 'rag'] });
      setNewUrl('');
      showToast('URL aggiunto con successo', 'success');
    },
    onError: (error: any) => {
      showToast(error?.message || 'Errore durante l\'aggiunta dell\'URL', 'error');
    }
  });

  const addTextMutation = useMutation({
    mutationFn: (text: string) => 
      apiRequest(`/brand-api/agents/${agentId}/rag/sources/text`, {
        method: 'POST',
        body: JSON.stringify({ text })
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/agents', agentId, 'rag'] });
      setNewText('');
      setShowTextInput(false);
      showToast('Testo aggiunto con successo', 'success');
    },
    onError: (error: any) => {
      showToast(error?.message || 'Errore durante l\'aggiunta del testo', 'error');
    }
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => formData.append('documents', file));
      
      const response = await fetch(`/brand-api/agents/${agentId}/rag/sources/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/agents', agentId, 'rag'] });
      showToast(`${data?.data?.count || 1} documento/i caricato/i con successo`, 'success');
    },
    onError: (error: any) => {
      showToast(error?.message || 'Errore durante il caricamento dei documenti', 'error');
    }
  });

  const syncSourceMutation = useMutation({
    mutationFn: (sourceId: string) => 
      apiRequest(`/brand-api/agents/${agentId}/rag/sources/${sourceId}/sync`, {
        method: 'POST'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/agents', agentId, 'rag'] });
      showToast('Sincronizzazione avviata', 'success');
    },
    onError: (error: any) => {
      showToast(error?.message || 'Errore durante la sincronizzazione', 'error');
    }
  });

  const deleteSourceMutation = useMutation({
    mutationFn: (sourceId: string) => 
      apiRequest(`/brand-api/agents/${agentId}/rag/sources/${sourceId}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/agents', agentId, 'rag'] });
      showToast('Sorgente eliminata con successo', 'success');
    },
    onError: (error: any) => {
      showToast(error?.message || 'Errore durante l\'eliminazione', 'error');
    }
  });

  const deleteChunkMutation = useMutation({
    mutationFn: (chunkId: string) => 
      apiRequest(`/brand-api/agents/${agentId}/rag/chunks/${chunkId}`, {
        method: 'DELETE'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/agents', agentId, 'rag', 'chunks'] });
      showToast('Chunk eliminato con successo', 'success');
    },
    onError: (error: any) => {
      showToast(error?.message || 'Errore durante l\'eliminazione del chunk', 'error');
    }
  });

  const cancelJobMutation = useMutation({
    mutationFn: (jobId: string) => 
      apiRequest(`/brand-api/agents/${agentId}/rag/jobs/${jobId}/cancel`, {
        method: 'POST'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/agents', agentId, 'rag'] });
      showToast('Job annullato con successo', 'success');
    },
    onError: (error: any) => {
      showToast(error?.message || 'Errore durante l\'annullamento del job', 'error');
    }
  });

  const cancelAllJobsMutation = useMutation({
    mutationFn: () => 
      apiRequest(`/brand-api/agents/${agentId}/rag/jobs/cancel-all`, {
        method: 'POST'
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/brand-api/agents', agentId, 'rag'] });
      showToast(`${data?.data?.cancelled || 0} job annullati`, 'success');
    },
    onError: (error: any) => {
      showToast(error?.message || 'Errore durante l\'annullamento dei job', 'error');
    }
  });

  const handleSearch = async () => {
    if (!playgroundQuery.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const response = await apiRequest(`/brand-api/agents/${agentId}/rag/search`, {
        method: 'POST',
        body: JSON.stringify({ query: playgroundQuery, limit: 5 })
      });
      setSearchResults(response?.data?.results || []);
    } catch (error: any) {
      console.error('Search error:', error);
      setSearchError(error?.message || 'Errore durante la ricerca');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf' || 
              file.type === 'text/plain' ||
              file.name.endsWith('.doc') ||
              file.name.endsWith('.docx') ||
              file.name.endsWith('.md')
    );
    if (files.length > 0) {
      uploadDocumentMutation.mutate(files);
    } else {
      showToast('Formato file non supportato. Usa PDF, TXT, DOC, DOCX o MD.', 'error');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      uploadDocumentMutation.mutate(files);
    }
    e.target.value = '';
  };

  const stats = statsData?.data || { sourcesCount: 0, chunksCount: 0, totalTokensUsed: 0, totalCostCents: 0 };
  const sources = sourcesData?.data || [];
  const chunks = chunksData?.data || [];
  const jobs = jobsData?.data || [];
  const usage = usageData?.data || { totalTokens: 0, totalCost: 0, history: [] };

  const filteredChunks = searchQuery 
    ? chunks.filter((c: any) => c.chunkText?.toLowerCase().includes(searchQuery.toLowerCase()))
    : chunks;

  const tabStyle = (isActive: boolean) => ({
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: isActive ? 600 : 500,
    color: isActive ? COLORS.primary.orange : COLORS.neutral.medium,
    background: isActive ? `${COLORS.primary.orange}10` : 'transparent',
    border: 'none',
    borderBottom: isActive ? `2px solid ${COLORS.primary.orange}` : '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return COLORS.semantic.success;
      case 'processing':
      case 'running': return COLORS.semantic.warning;
      case 'failed': return COLORS.semantic.error;
      default: return COLORS.neutral.medium;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <Check size={12} />;
      case 'processing':
      case 'running': return <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />;
      case 'failed': return <X size={12} />;
      default: return <AlertCircle size={12} />;
    }
  };

  return (
    <div style={{ marginTop: '24px', borderTop: `1px solid ${COLORS.neutral.lighter}`, paddingTop: '24px', position: 'relative' }}>
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '12px 20px',
          background: toast.type === 'success' ? COLORS.semantic.success : COLORS.semantic.error,
          color: 'white',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 500,
          zIndex: 10000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      <h4 style={{
        fontSize: '16px',
        fontWeight: 700,
        color: COLORS.neutral.dark,
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <Database size={18} style={{ color: COLORS.primary.purple }} />
        RAG Training & Knowledge Base
      </h4>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{
          padding: '12px',
          background: `${COLORS.semantic.info}10`,
          borderRadius: '8px',
          border: `1px solid ${COLORS.semantic.info}20`
        }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: COLORS.semantic.info }}>
            {loadingStats ? '...' : stats.sourcesCount}
          </div>
          <div style={{ fontSize: '11px', color: COLORS.neutral.medium }}>Data Sources</div>
        </div>
        <div style={{
          padding: '12px',
          background: `${COLORS.primary.purple}10`,
          borderRadius: '8px',
          border: `1px solid ${COLORS.primary.purple}20`
        }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: COLORS.primary.purple }}>
            {loadingStats ? '...' : stats.chunksCount}
          </div>
          <div style={{ fontSize: '11px', color: COLORS.neutral.medium }}>Chunks</div>
        </div>
        <div style={{
          padding: '12px',
          background: `${COLORS.semantic.success}10`,
          borderRadius: '8px',
          border: `1px solid ${COLORS.semantic.success}20`
        }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: COLORS.semantic.success }}>
            {loadingStats ? '...' : (stats.totalTokensUsed / 1000).toFixed(1)}k
          </div>
          <div style={{ fontSize: '11px', color: COLORS.neutral.medium }}>Tokens Used</div>
        </div>
        <div style={{
          padding: '12px',
          background: `${COLORS.primary.orange}10`,
          borderRadius: '8px',
          border: `1px solid ${COLORS.primary.orange}20`
        }}>
          <div style={{ fontSize: '20px', fontWeight: 700, color: COLORS.primary.orange }}>
            ${loadingStats ? '...' : (stats.totalCostCents / 100).toFixed(3)}
          </div>
          <div style={{ fontSize: '11px', color: COLORS.neutral.medium }}>Cost</div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${COLORS.neutral.lighter}`,
        marginBottom: '16px'
      }}>
        <button onClick={() => setActiveTab('sources')} style={tabStyle(activeTab === 'sources')} data-testid="tab-sources">
          <Link2 size={14} /> Sources
        </button>
        <button onClick={() => setActiveTab('chunks')} style={tabStyle(activeTab === 'chunks')} data-testid="tab-chunks">
          <FileText size={14} /> Chunks
        </button>
        <button onClick={() => setActiveTab('playground')} style={tabStyle(activeTab === 'playground')} data-testid="tab-playground">
          <Search size={14} /> Playground
        </button>
        <button onClick={() => setActiveTab('analytics')} style={tabStyle(activeTab === 'analytics')} data-testid="tab-analytics">
          <BarChart3 size={14} /> Analytics
        </button>
      </div>

      {activeTab === 'sources' && (
        <div>
          <div 
            style={{
              border: `2px dashed ${isDragging ? COLORS.primary.orange : COLORS.neutral.lighter}`,
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              background: isDragging ? `${COLORS.primary.orange}08` : COLORS.neutral.lightest,
              marginBottom: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            data-testid="dropzone-documents"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.doc,.docx,.md"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
              data-testid="input-file-upload"
            />
            {uploadDocumentMutation.isPending ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Loader2 size={32} style={{ color: COLORS.primary.orange, animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                <p style={{ color: COLORS.primary.orange, fontSize: '14px', margin: 0 }}>Caricamento in corso...</p>
              </div>
            ) : (
              <>
                <Upload size={32} style={{ color: isDragging ? COLORS.primary.orange : COLORS.neutral.medium, marginBottom: '8px' }} />
                <p style={{ color: COLORS.neutral.dark, fontSize: '14px', margin: 0, fontWeight: 500 }}>
                  Trascina file o clicca per selezionare
                </p>
                <p style={{ color: COLORS.neutral.light, fontSize: '12px', margin: '4px 0 0 0' }}>
                  PDF, TXT, DOC, DOCX, MD supportati
                </p>
              </>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1, display: 'flex', gap: '8px' }}>
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://example.com/docs"
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: `1px solid ${COLORS.neutral.lighter}`,
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none'
                }}
                onKeyDown={(e) => e.key === 'Enter' && newUrl.trim() && addUrlMutation.mutate(newUrl.trim())}
                data-testid="input-new-url"
              />
              <button
                onClick={() => newUrl.trim() && addUrlMutation.mutate(newUrl.trim())}
                disabled={!newUrl.trim() || addUrlMutation.isPending}
                style={{
                  padding: '10px 16px',
                  background: newUrl.trim() ? COLORS.primary.purple : COLORS.neutral.lighter,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: newUrl.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                data-testid="button-add-url"
              >
                {addUrlMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
                Add URL
              </button>
            </div>
            <button
              onClick={() => setShowTextInput(!showTextInput)}
              style={{
                padding: '10px 16px',
                background: COLORS.neutral.lightest,
                color: COLORS.neutral.dark,
                border: `1px solid ${COLORS.neutral.lighter}`,
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              data-testid="button-toggle-text"
            >
              <FileText size={14} />
              Add Text
            </button>
          </div>

          {showTextInput && (
            <div style={{ marginBottom: '16px' }}>
              <textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Paste or type knowledge content here..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `1px solid ${COLORS.neutral.lighter}`,
                  borderRadius: '8px',
                  fontSize: '13px',
                  resize: 'vertical',
                  marginBottom: '8px'
                }}
                data-testid="textarea-new-text"
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setShowTextInput(false); setNewText(''); }}
                  style={{
                    padding: '8px 16px',
                    background: 'transparent',
                    color: COLORS.neutral.medium,
                    border: `1px solid ${COLORS.neutral.lighter}`,
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => newText.trim() && addTextMutation.mutate(newText.trim())}
                  disabled={!newText.trim() || addTextMutation.isPending}
                  style={{
                    padding: '8px 16px',
                    background: newText.trim() ? COLORS.semantic.success : COLORS.neutral.lighter,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: newText.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  data-testid="button-save-text"
                >
                  {addTextMutation.isPending ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
                  Save Text
                </button>
              </div>
            </div>
          )}

          {/* Active Jobs Section */}
          {jobs.length > 0 && (
            <div style={{
              border: `1px solid ${COLORS.semantic.warning}`,
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              background: `${COLORS.semantic.warning}10`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Loader2 size={16} style={{ color: COLORS.semantic.warning, animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: COLORS.neutral.dark }}>
                    {jobs.length} job{jobs.length > 1 ? 's' : ''} in elaborazione
                  </span>
                </div>
                <button
                  onClick={() => cancelAllJobsMutation.mutate()}
                  disabled={cancelAllJobsMutation.isPending}
                  style={{
                    padding: '6px 12px',
                    background: COLORS.semantic.error,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  data-testid="button-cancel-all-jobs"
                >
                  {cancelAllJobsMutation.isPending ? (
                    <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <XCircle size={12} />
                  )}
                  Ferma Tutti
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {jobs.map((job: any) => (
                  <div 
                    key={job.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      background: 'white',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: COLORS.neutral.dark
                    }}
                  >
                    <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {job.name}
                    </span>
                    <span style={{ 
                      padding: '2px 6px', 
                      background: job.status === 'processing' ? COLORS.semantic.info : COLORS.neutral.lighter,
                      color: job.status === 'processing' ? 'white' : COLORS.neutral.medium,
                      borderRadius: '3px',
                      fontSize: '10px',
                      fontWeight: 600
                    }}>
                      {job.status}
                    </span>
                    <button
                      onClick={() => cancelJobMutation.mutate(job.id)}
                      disabled={cancelJobMutation.isPending}
                      style={{
                        padding: '2px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: COLORS.semantic.error,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      data-testid={`button-cancel-job-${job.id}`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{
            border: `1px solid ${COLORS.neutral.lighter}`,
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {loadingSources ? (
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <Loader2 size={24} style={{ color: COLORS.primary.orange, animation: 'spin 1s linear infinite' }} />
              </div>
            ) : sources.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: COLORS.neutral.medium }}>
                <Database size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '14px' }}>No data sources yet</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>Add URLs, files or text to train this agent</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: COLORS.neutral.lightest }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: COLORS.neutral.medium }}>Source</th>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: COLORS.neutral.medium }}>Type</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: COLORS.neutral.medium }}>Chunks</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: COLORS.neutral.medium }}>Status</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: COLORS.neutral.medium }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((source: any) => (
                    <tr key={source.id} style={{ borderTop: `1px solid ${COLORS.neutral.lighter}` }}>
                      <td style={{ padding: '12px', fontSize: '13px', color: COLORS.neutral.dark, maxWidth: '250px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {source.sourceType === 'web_url' ? (
                            <Link2 size={14} style={{ color: COLORS.semantic.info, flexShrink: 0 }} />
                          ) : source.sourceType === 'document' ? (
                            <File size={14} style={{ color: COLORS.semantic.warning, flexShrink: 0 }} />
                          ) : (
                            <FileText size={14} style={{ color: COLORS.primary.purple, flexShrink: 0 }} />
                          )}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {source.sourceUrl || source.fileName || 'Manual Text'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', fontSize: '12px', color: COLORS.neutral.medium }}>
                        {source.sourceType?.replace('_', ' ')}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: COLORS.primary.purple }}>
                        {source.chunksCount || 0}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: getStatusColor(source.status),
                          background: `${getStatusColor(source.status)}15`,
                          borderRadius: '12px'
                        }}>
                          {getStatusIcon(source.status)}
                          {source.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {source.status !== 'processing' && source.status !== 'running' && (
                            <button
                              onClick={() => syncSourceMutation.mutate(source.id)}
                              disabled={syncSourceMutation.isPending}
                              style={{
                                padding: '6px 10px',
                                background: `${COLORS.semantic.success}15`,
                                color: COLORS.semantic.success,
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Sync & Generate Embeddings"
                              data-testid={`button-sync-${source.id}`}
                            >
                              <Play size={12} /> Sync
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm('Eliminare questa sorgente? Tutti i chunks associati verranno rimossi.')) {
                                deleteSourceMutation.mutate(source.id);
                              }
                            }}
                            disabled={deleteSourceMutation.isPending}
                            style={{
                              padding: '6px 10px',
                              background: `${COLORS.semantic.error}15`,
                              color: COLORS.semantic.error,
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Delete Source"
                            data-testid={`button-delete-${source.id}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {jobs.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h5 style={{ fontSize: '13px', fontWeight: 600, color: COLORS.neutral.dark, marginBottom: '8px' }}>
                Recent Sync Jobs
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {jobs.slice(0, 5).map((job: any) => (
                  <div key={job.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: COLORS.neutral.lightest,
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getStatusIcon(job.status)}
                      <span style={{ color: COLORS.neutral.dark }}>{job.jobType}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: COLORS.neutral.medium }}>
                      <span>{job.chunksCreated || 0} chunks</span>
                      <span>{job.tokensUsed || 0} tokens</span>
                      <span style={{ fontSize: '11px' }}>
                        {job.completedAt ? new Date(job.completedAt).toLocaleString('it-IT') : 'In progress...'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'chunks' && (
        <div>
          <div style={{ marginBottom: '12px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chunks..."
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${COLORS.neutral.lighter}`,
                borderRadius: '8px',
                fontSize: '13px',
                outline: 'none'
              }}
              data-testid="input-search-chunks"
            />
          </div>

          <div style={{
            border: `1px solid ${COLORS.neutral.lighter}`,
            borderRadius: '8px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {loadingChunks ? (
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <Loader2 size={24} style={{ color: COLORS.primary.orange, animation: 'spin 1s linear infinite' }} />
              </div>
            ) : filteredChunks.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: COLORS.neutral.medium }}>
                <FileText size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '14px' }}>No chunks found</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filteredChunks.map((chunk: any, index: number) => (
                  <div 
                    key={chunk.id} 
                    style={{ 
                      padding: '12px',
                      borderBottom: index < filteredChunks.length - 1 ? `1px solid ${COLORS.neutral.lighter}` : 'none',
                      background: expandedChunk === chunk.id ? COLORS.neutral.lightest : 'transparent'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ 
                          fontSize: '10px', 
                          fontWeight: 600, 
                          color: COLORS.primary.purple,
                          background: `${COLORS.primary.purple}15`,
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          #{chunk.chunkIndex}
                        </span>
                        <span style={{ fontSize: '11px', color: COLORS.neutral.light }}>
                          {chunk.chunkText?.length || 0} chars
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => setExpandedChunk(expandedChunk === chunk.id ? null : chunk.id)}
                          style={{
                            padding: '4px 8px',
                            background: 'transparent',
                            color: COLORS.neutral.medium,
                            border: `1px solid ${COLORS.neutral.lighter}`,
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {expandedChunk === chunk.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          {expandedChunk === chunk.id ? 'Collapse' : 'Expand'}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Eliminare questo chunk?')) {
                              deleteChunkMutation.mutate(chunk.id);
                            }
                          }}
                          style={{
                            padding: '4px 8px',
                            background: `${COLORS.semantic.error}15`,
                            color: COLORS.semantic.error,
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                          data-testid={`button-delete-chunk-${chunk.id}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: '12px',
                      color: COLORS.neutral.dark,
                      lineHeight: 1.5,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: expandedChunk === chunk.id ? 'unset' : 3,
                      WebkitBoxOrient: 'vertical'
                    }}>
                      {chunk.chunkText}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div style={{ marginTop: '8px', fontSize: '12px', color: COLORS.neutral.medium, textAlign: 'right' }}>
            Showing {filteredChunks.length} of {chunks.length} chunks
          </div>
        </div>
      )}

      {activeTab === 'playground' && (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: COLORS.neutral.dark, marginBottom: '8px' }}>
              Test Query
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={playgroundQuery}
                onChange={(e) => setPlaygroundQuery(e.target.value)}
                placeholder="Enter a question to test retrieval..."
                style={{
                  flex: 1,
                  padding: '12px',
                  border: `1px solid ${COLORS.neutral.lighter}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                data-testid="input-playground-query"
              />
              <button
                onClick={handleSearch}
                disabled={!playgroundQuery.trim() || isSearching}
                style={{
                  padding: '12px 20px',
                  background: playgroundQuery.trim() ? COLORS.primary.orange : COLORS.neutral.lighter,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: playgroundQuery.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                data-testid="button-search"
              >
                {isSearching ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />}
                Search
              </button>
            </div>
          </div>

          {searchError && (
            <div style={{
              padding: '12px 16px',
              background: `${COLORS.semantic.error}10`,
              border: `1px solid ${COLORS.semantic.error}30`,
              borderRadius: '8px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: COLORS.semantic.error,
              fontSize: '13px'
            }}>
              <AlertCircle size={16} />
              {searchError}
            </div>
          )}

          <div style={{
            border: `1px solid ${COLORS.neutral.lighter}`,
            borderRadius: '8px',
            minHeight: '200px'
          }}>
            {searchResults.length === 0 && !isSearching && !searchError ? (
              <div style={{ padding: '48px', textAlign: 'center', color: COLORS.neutral.medium }}>
                <Search size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: '14px' }}>Enter a query to test RAG retrieval</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>Results will show the top matching chunks</p>
              </div>
            ) : isSearching ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <Loader2 size={32} style={{ color: COLORS.primary.orange, animation: 'spin 1s linear infinite' }} />
                <p style={{ margin: '12px 0 0 0', fontSize: '14px', color: COLORS.neutral.medium }}>Searching...</p>
              </div>
            ) : (
              <div>
                <div style={{ 
                  padding: '12px 16px', 
                  background: COLORS.neutral.lightest,
                  borderBottom: `1px solid ${COLORS.neutral.lighter}`,
                  fontSize: '13px',
                  fontWeight: 600,
                  color: COLORS.neutral.dark
                }}>
                  Found {searchResults.length} results
                </div>
                {searchResults.map((result: any, index: number) => (
                  <div key={index} style={{
                    padding: '16px',
                    borderBottom: index < searchResults.length - 1 ? `1px solid ${COLORS.neutral.lighter}` : 'none'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'white',
                        background: COLORS.semantic.success,
                        padding: '2px 8px',
                        borderRadius: '10px'
                      }}>
                        {((result.similarity || 0) * 100).toFixed(1)}% match
                      </span>
                      <span style={{ fontSize: '11px', color: COLORS.neutral.light }}>
                        Result #{index + 1}
                      </span>
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: '13px',
                      color: COLORS.neutral.dark,
                      lineHeight: 1.6,
                      background: COLORS.neutral.lightest,
                      padding: '12px',
                      borderRadius: '6px',
                      borderLeft: `3px solid ${COLORS.semantic.success}`
                    }}>
                      {result.text || result.chunkText}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              padding: '20px',
              background: `linear-gradient(135deg, ${COLORS.semantic.success}15, ${COLORS.semantic.success}05)`,
              borderRadius: '12px',
              border: `1px solid ${COLORS.semantic.success}20`
            }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: COLORS.semantic.success }}>
                {loadingUsage ? '...' : (usage.totalTokens / 1000).toFixed(1)}k
              </div>
              <div style={{ fontSize: '13px', color: COLORS.neutral.medium, marginTop: '4px' }}>Total Tokens Used</div>
            </div>
            <div style={{
              padding: '20px',
              background: `linear-gradient(135deg, ${COLORS.primary.orange}15, ${COLORS.primary.orange}05)`,
              borderRadius: '12px',
              border: `1px solid ${COLORS.primary.orange}20`
            }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: COLORS.primary.orange }}>
                ${loadingUsage ? '...' : (usage.totalCost / 100).toFixed(4)}
              </div>
              <div style={{ fontSize: '13px', color: COLORS.neutral.medium, marginTop: '4px' }}>Estimated Cost</div>
            </div>
          </div>

          <h5 style={{ fontSize: '14px', fontWeight: 600, color: COLORS.neutral.dark, marginBottom: '12px' }}>
            Usage History
          </h5>
          <div style={{
            border: `1px solid ${COLORS.neutral.lighter}`,
            borderRadius: '8px',
            overflow: 'hidden',
            maxHeight: '250px',
            overflowY: 'auto'
          }}>
            {loadingUsage ? (
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <Loader2 size={24} style={{ color: COLORS.primary.orange, animation: 'spin 1s linear infinite' }} />
              </div>
            ) : usage.history?.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: COLORS.neutral.medium }}>
                <BarChart3 size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '14px' }}>No usage data yet</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: COLORS.neutral.lightest }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: COLORS.neutral.medium }}>Date</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: COLORS.neutral.medium }}>Tokens</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: COLORS.neutral.medium }}>Chunks</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: COLORS.neutral.medium }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.history?.map((item: any) => (
                    <tr key={item.id} style={{ borderTop: `1px solid ${COLORS.neutral.lighter}` }}>
                      <td style={{ padding: '10px 12px', fontSize: '12px', color: COLORS.neutral.dark }}>
                        {new Date(item.createdAt).toLocaleString('it-IT')}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', color: COLORS.neutral.dark, textAlign: 'right', fontWeight: 600 }}>
                        {item.tokensUsed?.toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', color: COLORS.neutral.dark, textAlign: 'right' }}>
                        {item.chunksProcessed}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', color: COLORS.semantic.success, textAlign: 'right', fontWeight: 600 }}>
                        ${(item.estimatedCost / 100).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
