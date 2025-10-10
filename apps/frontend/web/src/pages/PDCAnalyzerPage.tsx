import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Layout from "../components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Upload, 
  Check, 
  ChevronRight, 
  Loader2,
  Download,
  CheckCircle2,
  AlertCircle,
  Plus,
  TrendingUp,
  Clock,
  FileCheck,
  Sparkles,
  Edit,
  Save,
  GitBranch,
  BarChart3,
  FileSearch,
  Trash2
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLocation } from "wouter";

interface SessionData {
  id: string;
  sessionName: string;
  createdAt: string;
  status: string;
}

interface AnalysisResult {
  id: string;
  extractedDataId: string;
  fileName: string;
  status: "completed" | "error";
  analysis?: {
    customer: any;
    services: any[];
    confidence: number;
    notes?: string;
  };
  error?: string;
}

interface ExtractedData {
  id: string;
  customerData: any;
  servicesExtracted: any[];
  aiRawOutput: any;
  wasReviewed: boolean;
  correctedData?: any;
  reviewNotes?: string;
  pdfFileName: string;
}

interface DriverTypology {
  id: string;
  code: string;
  name: string;
  description?: string;
}

interface DriverCategory {
  id: string;
  code: string;
  name: string;
  description?: string;
  typologies: DriverTypology[];
}

interface Driver {
  id: string;
  code: string;
  name: string;
  categories: DriverCategory[];
}

export default function PDCAnalyzerPage() {
  const [currentModule, setCurrentModule] = useState("ai");
  const { toast } = useToast();
  const [location] = useLocation();
  
  // Navigation state
  const [activeView, setActiveView] = useState<'analytics' | 'upload' | 'review' | 'export'>('analytics');
  
  // Session & Upload state
  const [sessionName, setSessionName] = useState("");
  const [session, setSession] = useState<SessionData | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Review state
  const [reviewData, setReviewData] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  // Service mapping state
  const [serviceMappings, setServiceMappings] = useState<any[]>([]);
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0);

  // Export state
  const [exportJson, setExportJson] = useState<any>(null);

  // Training dialog state
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [trainingPrompt, setTrainingPrompt] = useState("");
  const [isPublicTraining, setIsPublicTraining] = useState(true);

  // PDF2 Flow Dialog state
  const [showPdf2Dialog, setShowPdf2Dialog] = useState(false);
  const [waitingForPdf2, setWaitingForPdf2] = useState(false);

  // Flow step calculation
  const getFlowStep = () => {
    if (!session) return 1;
    if (analysisResults.length === 0) return 2;
    if (!reviewData || !reviewData.wasReviewed) return 3;
    return 4;
  };

  const isStepCompleted = (step: number) => getFlowStep() > step;
  const isStepActive = (step: number) => getFlowStep() === step;
  const isStepLocked = (step: number) => getFlowStep() < step;

  // Query per sessioni precedenti
  const { data: previousSessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['/api/pdc/sessions'],
  });

  // Query per gerarchia drivers da DB
  const { data: driversHierarchy = [], isLoading: loadingHierarchy, error: hierarchyError } = useQuery<Driver[]>({
    queryKey: ['/api/pdc/drivers/hierarchy'],
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes - hierarchy data doesn't change often
  });

  // Mutation per creare sessione
  const createSessionMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("/api/pdc/sessions", {
        method: "POST",
        body: { sessionName: name },
      });
      return response;
    },
    onSuccess: (data) => {
      setSession(data);
      setActiveView('upload');
      toast({ title: "✅ Sessione creata", description: `Sessione "${sessionName}" pronta per l'upload` });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Errore creazione sessione",
        description: error.message || "Riprova",
        variant: "destructive",
      });
    },
  });

  // Mutation per upload e analisi
  const analyzeFileMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!session) throw new Error("Nessuna sessione attiva");
      
      const formData = new FormData();
      formData.append("pdf", file);
      
      // apiRequest handles X-Tenant-ID and auth headers automatically
      const response = await apiRequest(`/api/pdc/sessions/${session.id}/upload`, {
        method: "POST",
        body: formData, // apiRequest supports FormData natively
      });
      
      return response;
    },
  });

  // Mutation per review
  const submitReviewMutation = useMutation({
    mutationFn: async ({ extractedDataId, correctedData, notes }: any) => {
      const response = await apiRequest(`/api/pdc/extracted/${extractedDataId}/review`, {
        method: "POST",
        body: {
          correctedData,
          notes,
        },
      });
      return response;
    },
    onSuccess: (data) => {
      // Generate export JSON from reviewed data
      const exportData = {
        customer: reviewData.customerData,
        services: reviewData.servicesExtracted,
        reviewNotes: reviewNotes,
        sessionInfo: {
          sessionId: session?.id,
          sessionName: session?.sessionName,
          reviewedAt: new Date().toISOString()
        }
      };
      setExportJson(exportData);
      setReviewData({ ...reviewData, wasReviewed: true });
      toast({ title: "✅ Review salvata" });
      setActiveView('export');
    },
  });

  // Mutation per service mapping
  const saveServiceMappingMutation = useMutation({
    mutationFn: async ({ extractedDataId, mapping }: any) => {
      const response = await apiRequest(`/api/pdc/extracted/${extractedDataId}/service-mapping`, {
        method: "POST",
        body: mapping,
      });
      return response;
    },
    onSuccess: () => {
      toast({ title: "✅ Mapping salvato" });
    },
  });

  // Mutation per training
  const saveToTrainingMutation = useMutation({
    mutationFn: async ({ extractedDataId, isPublic, trainingPrompt }: any) => {
      const response = await apiRequest(`/api/pdc/extracted/${extractedDataId}/training`, {
        method: "POST",
        body: {
          isPublic,
          trainingPrompt,
        },
      });
      return response;
    },
    onSuccess: () => {
      toast({ title: "✅ Salvato nel training dataset cross-tenant" });
    },
  });

  const handleCreateSession = async () => {
    if (!sessionName.trim()) {
      toast({
        title: "❌ Nome richiesto",
        description: "Inserisci un nome per la sessione",
        variant: "destructive",
      });
      return;
    }
    createSessionMutation.mutate(sessionName);
  };

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      const result = await analyzeFileMutation.mutateAsync(file);
      
      setAnalysisResults(prev => [...prev, result]);
      setUploadedFiles(prev => [...prev, file]);
      
      if (result.status === "completed") {
        toast({ 
          title: "✅ Analisi completata", 
          description: `${file.name} analizzato con successo`
        });
        
        // After FIRST PDF: show dialog asking for PDF2
        if (analysisResults.length === 0) {
          setShowPdf2Dialog(true);
        } 
        // After SECOND PDF (while waiting): go to review automatically
        else if (waitingForPdf2) {
          setWaitingForPdf2(false);
          toast({
            title: "✅ Secondo PDF analizzato",
            description: "Procedendo al review dei dati"
          });
          // Auto-select first result for review
          const firstResult = analysisResults.find(r => r.status === 'completed');
          if (firstResult) {
            await handleSelectResult(firstResult);
          }
        }
      } else {
        toast({
          title: "❌ Errore analisi",
          description: result.error || "Errore sconosciuto",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "❌ Upload fallito",
        description: error.message || "Riprova",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectResult = async (result: AnalysisResult) => {
    setSelectedResult(result);
    
    if (result.status === "completed") {
      const extractedData: ExtractedData = await apiRequest(`/api/pdc/extracted/${result.extractedDataId}`);
      setReviewData(extractedData);
      setActiveView('review');
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedResult) return;
    
    try {
      await submitReviewMutation.mutateAsync({
        extractedDataId: selectedResult.extractedDataId,
        correctedData: reviewData,
        notes: reviewNotes,
      });
    } catch (error: any) {
      toast({
        title: "❌ Errore salvataggio review",
        description: error.message || "Riprova",
        variant: "destructive",
      });
    }
  };

  const handleSaveServiceMapping = async (serviceIndex: number) => {
    if (!selectedResult) return;
    
    const mapping = serviceMappings[serviceIndex];
    if (!mapping || !mapping.driverId) {
      toast({
        title: "❌ Mapping incompleto",
        description: "Seleziona almeno il Driver",
        variant: "destructive",
      });
      return;
    }

    // Convert IDs to codes/names for backend
    const driver = driversHierarchy.find(d => d.id === mapping.driverId);
    const category = driver?.categories.find(c => c.id === mapping.categoryId);
    const typology = category?.typologies.find(t => t.id === mapping.typologyId);

    try {
      await saveServiceMappingMutation.mutateAsync({
        extractedDataId: selectedResult.extractedDataId,
        mapping: {
          serviceIndex,
          driverSelected: driver?.code || driver?.name,
          categorySelected: category?.code || category?.name,
          typologySelected: typology?.code || typology?.name,
        },
      });

      toast({ 
        title: "✅ Mapping salvato", 
        description: `Servizio ${serviceIndex + 1} mappato correttamente` 
      });
    } catch (error: any) {
      toast({
        title: "❌ Errore salvataggio mapping",
        description: error.message || "Riprova",
        variant: "destructive",
      });
    }
  };

  const handlePrepareExport = async () => {
    if (!selectedResult) return;

    try {
      const json = await apiRequest(`/api/pdc/extracted/${selectedResult.extractedDataId}/export`);
      setExportJson(json);
    } catch (error) {
      toast({ title: "Errore", description: "Impossibile preparare export", variant: "destructive" });
    }
  };

  const handleDownloadJson = async () => {
    if (!exportJson || !session) return;
    
    const blob = new Blob([JSON.stringify(exportJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdc-export-${selectedResult?.extractedDataId}.json`;
    a.click();
    URL.revokeObjectURL(url);

    // Finalize session (mark as completed)
    try {
      await apiRequest(`/api/pdc/sessions/${session.id}/finalize`, {
        method: 'POST'
      });
      toast({ 
        title: "✅ Sessione Completata", 
        description: "Il JSON è stato esportato e la sessione è stata finalizzata",
        variant: "default" 
      });
      // Refresh sessions list
      queryClient.invalidateQueries({ queryKey: ['/api/pdc/sessions'] });
    } catch (error) {
      console.error('Failed to finalize session:', error);
      // Don't show error to user - download was successful
    }
  };

  // PDF2 Flow handlers
  const handlePdf2Response = async (hasPdf2: boolean) => {
    setShowPdf2Dialog(false);
    
    if (hasPdf2) {
      // User has PDF2 - wait for second upload
      setWaitingForPdf2(true);
      toast({
        title: "📄 Carica il secondo PDF",
        description: "Puoi caricare il retro del contratto o un allegato"
      });
    } else {
      // No PDF2 - proceed directly to review
      const completedResult = analysisResults.find(r => r.status === 'completed');
      if (completedResult) {
        await handleSelectResult(completedResult);
      }
    }
  };

  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3, disabled: false },
    { id: 'upload', label: 'Genera Sessione', icon: Upload, disabled: false },
    { id: 'review', label: 'Review', icon: FileSearch, disabled: !reviewData },
    { id: 'export', label: 'Export', icon: Download, disabled: !exportJson },
  ];

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="min-h-screen bg-white">
        {/* Header Dedicato - Stile Settings */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#111827',
            margin: '0 0 8px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Sparkles style={{ color: '#FF6900', width: '32px', height: '32px' }} />
            PDC Analyzer
          </h1>
          <p style={{
            fontSize: '15px',
            color: '#6b7280',
            margin: 0
          }}>
            Estrazione automatica dati da PDF Proposte di Contratto con AI - Mapping prodotti WindTre e export JSON
          </p>
        </div>

        {/* Tabs Container - Stile Settings con Glassmorphism */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{
            display: 'flex',
            background: 'rgba(243, 244, 246, 0.5)',
            borderRadius: '12px',
            padding: '4px',
            gap: '4px'
          }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeView === tab.id;
              const isDisabled = tab.disabled;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => !isDisabled && setActiveView(tab.id as any)}
                  disabled={isDisabled}
                  style={{
                    flex: 1,
                    background: isActive 
                      ? 'linear-gradient(135deg, #FF6900, #ff8533)'
                      : 'transparent',
                    color: isActive ? 'white' : isDisabled ? '#d1d5db' : '#6b7280',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '14px 20px',
                    fontSize: '14px',
                    fontWeight: isActive ? '600' : '500',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isActive 
                      ? '0 4px 16px rgba(255, 105, 0, 0.3)' 
                      : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    textAlign: 'center',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    opacity: isDisabled ? 0.5 : 1
                  }}
                  onMouseOver={(e) => {
                    if (!isActive && !isDisabled) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.color = '#374151';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isActive && !isDisabled) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#6b7280';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="px-6 py-6">
          {activeView === 'analytics' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Dashboard Analytics</h2>
              
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card className="windtre-glass-panel border-white/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-windtre-orange" />
                      Sessioni Totali
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-windtre-orange" data-testid="stat-total-sessions">
                      {loadingSessions ? '...' : previousSessions.length || 0}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Tutte le sessioni di analisi
                    </p>
                  </CardContent>
                </Card>

                <Card className="windtre-glass-panel border-white/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-windtre-purple" />
                      PDF Analizzati
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-windtre-purple" data-testid="stat-analyzed-pdfs">
                      {analysisResults.length}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      In questa sessione
                    </p>
                  </CardContent>
                </Card>

                <Card className="windtre-glass-panel border-white/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Success Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600" data-testid="stat-success-rate">
                      {analysisResults.length > 0 
                        ? Math.round((analysisResults.filter(r => r.status === 'completed').length / analysisResults.length) * 100)
                        : 0}%
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Analisi completate
                    </p>
                  </CardContent>
                </Card>

                <Card className="windtre-glass-panel border-white/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-windtre-orange" />
                      In Revisione
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-windtre-orange" data-testid="stat-in-review">
                      {reviewData ? 1 : 0}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Dati da correggere
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Sessions */}
              <Card className="windtre-glass-panel border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-windtre-orange">
                    <Clock className="h-5 w-5" />
                    Sessioni Recenti
                  </CardTitle>
                  <CardDescription>Ultime sessioni di analisi PDC</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingSessions ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-windtre-orange mx-auto" />
                      <p className="text-gray-500 mt-2">Caricamento sessioni...</p>
                    </div>
                  ) : previousSessions.length > 0 ? (
                    <div className="space-y-3">
                      {previousSessions.slice(0, 10).map((sess: any) => (
                        <div 
                          key={sess.id}
                          className="flex items-center justify-between p-3 windtre-glass-panel rounded-lg border-white/20"
                          data-testid={`session-item-${sess.id}`}
                        >
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{sess.sessionName}</h4>
                            <p className="text-sm text-gray-600">
                              {new Date(sess.createdAt).toLocaleDateString('it-IT', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="capitalize">
                              {sess.status}
                            </Badge>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setSession(sess);
                                  setActiveView('upload');
                                }}
                                className="h-8 w-8 text-windtre-purple hover:bg-windtre-purple hover:text-white"
                                data-testid={`button-view-session-${sess.id}`}
                                title="Visualizza sessione"
                              >
                                <FileSearch className="h-4 w-4" />
                              </Button>
                              {sess.status === 'pending' && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={async () => {
                                    try {
                                      await apiRequest(`/api/pdc/sessions/${sess.id}/finalize`, {
                                        method: 'POST',
                                      });
                                      queryClient.invalidateQueries({ queryKey: ['/api/pdc/sessions'] });
                                      toast({ title: "✅ Sessione finalizzata" });
                                    } catch (error: any) {
                                      toast({
                                        title: "❌ Errore finalizzazione",
                                        description: error.message,
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                  className="h-8 w-8 text-green-600 hover:bg-green-600 hover:text-white"
                                  data-testid={`button-finalize-session-${sess.id}`}
                                  title="Finalizza sessione"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={async () => {
                                  if (!confirm(`Eliminare la sessione "${sess.sessionName}"?`)) return;
                                  try {
                                    await apiRequest(`/api/pdc/sessions/${sess.id}`, {
                                      method: 'DELETE',
                                    });
                                    queryClient.invalidateQueries({ queryKey: ['/api/pdc/sessions'] });
                                    toast({ title: "🗑️ Sessione eliminata" });
                                  } catch (error: any) {
                                    toast({
                                      title: "❌ Errore eliminazione",
                                      description: error.message,
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                className="h-8 w-8 text-red-600 hover:bg-red-600 hover:text-white"
                                data-testid={`button-delete-session-${sess.id}`}
                                title="Elimina sessione"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Nessuna sessione trovata</p>
                      <Button 
                        onClick={() => setActiveView('upload')}
                        className="mt-4 bg-windtre-orange hover:bg-windtre-orange-dark text-white"
                        data-testid="button-create-first-session"
                      >
                        Crea Prima Sessione
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeView === 'upload' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Genera Sessione</h2>

              {/* Flow Steps Indicator - DENTRO TAB */}
              <div className="mb-8 p-6 bg-gradient-to-r from-windtre-orange/10 to-windtre-purple/10 rounded-lg">
                <div className="flex items-center justify-center gap-4">
                  {[
                    { step: 1, label: 'Crea Sessione', completed: !!session },
                    { step: 2, label: 'Upload PDF', completed: analysisResults.length > 0 },
                    { step: 3, label: 'Review Dati', completed: !!reviewData },
                    { step: 4, label: 'Export JSON', completed: !!exportJson }
                  ].map((item, idx) => (
                    <div key={item.step} className="flex items-center">
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                            item.completed
                              ? 'bg-green-500 text-white' 
                              : item.step === (session ? (analysisResults.length > 0 ? (reviewData ? 3 : 2) : 1) : 1)
                              ? 'bg-windtre-orange text-white ring-4 ring-windtre-orange/30'
                              : 'bg-gray-300 text-gray-600'
                          }`}
                          data-testid={`workflow-step-${item.step}`}
                        >
                          {item.completed ? <Check className="h-5 w-5" /> : item.step}
                        </div>
                        <span 
                          className={`text-sm font-medium ${
                            item.completed ? 'text-green-600' : 'text-gray-600'
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                      {idx < 3 && (
                        <div 
                          className={`w-12 h-0.5 mx-2 ${
                            item.completed ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Create Session Section */}
              {!session && (
                <Card className="windtre-glass-panel border-white/20 mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-windtre-orange">
                      <Plus className="h-5 w-5" />
                      Crea Nuova Sessione
                    </CardTitle>
                    <CardDescription>Inizia una nuova sessione di analisi PDC</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="session-name">Nome Sessione *</Label>
                        <Input
                          id="session-name"
                          value={sessionName}
                          onChange={(e) => setSessionName(e.target.value)}
                          placeholder="es. Analisi PDC Gennaio 2024"
                          className="mt-1"
                          data-testid="input-session-name"
                        />
                      </div>
                      <Button
                        onClick={handleCreateSession}
                        disabled={!sessionName.trim() || createSessionMutation.isPending}
                        className="w-full bg-windtre-orange hover:bg-windtre-orange-dark text-white"
                        data-testid="button-create-session"
                      >
                        {createSessionMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creazione...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Crea Sessione e Procedi
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Upload Section */}
              {session && (
                <>
                  <Card className="windtre-glass-panel border-white/20 mb-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-windtre-purple">
                        <Upload className="h-5 w-5" />
                        Upload PDF Contratti
                      </CardTitle>
                      <CardDescription>
                        Sessione attiva: <strong>{session.sessionName}</strong>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div 
                        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-windtre-orange transition-colors cursor-pointer"
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files[0];
                          if (file && file.type === 'application/pdf') {
                            handleFileUpload(file);
                          }
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        data-testid="upload-dropzone"
                      >
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">Trascina qui il PDF o clicca per selezionare</p>
                        <Input
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          id="pdf-upload"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file);
                          }}
                          data-testid="input-pdf-upload"
                        />
                        <Button
                          onClick={() => document.getElementById('pdf-upload')?.click()}
                          variant="outline"
                          disabled={isProcessing}
                          data-testid="button-select-pdf"
                        >
                          Seleziona PDF
                        </Button>
                      </div>

                      {isProcessing && (
                        <div className="mt-4">
                          <div className="flex items-center gap-2 text-windtre-orange mb-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="font-medium">Analisi AI in corso...</span>
                          </div>
                          <Progress value={50} className="h-2" />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Session Summary - PDF Counter */}
                  {analysisResults.length > 0 && (
                    <Card className="windtre-glass-panel border-white/20 mb-6">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-16 w-16 bg-gradient-to-br from-windtre-orange to-windtre-purple rounded-full flex items-center justify-center">
                              <FileCheck className="h-8 w-8 text-white" />
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold text-gray-900">{analysisResults.length}</h3>
                              <p className="text-gray-600">PDF Caricati in questa sessione</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600">Completati con successo</div>
                            <div className="text-3xl font-bold text-green-600">
                              {analysisResults.filter(r => r.status === 'completed').length}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Analysis Results */}
                  {analysisResults.length > 0 && (
                    <Card className="windtre-glass-panel border-white/20">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-windtre-orange">
                          <FileCheck className="h-5 w-5" />
                          Risultati Analisi ({analysisResults.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {analysisResults.map((result) => (
                            <div
                              key={result.id}
                              className="flex items-center justify-between p-4 windtre-glass-panel rounded-lg border-white/20"
                              data-testid={`result-item-${result.id}`}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                {result.status === "completed" ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                ) : (
                                  <AlertCircle className="h-5 w-5 text-red-600" />
                                )}
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900">{result.fileName}</h4>
                                  <p className="text-sm text-gray-600">
                                    {result.status === "completed" 
                                      ? `Confidence: ${result.analysis?.confidence}%` 
                                      : result.error}
                                  </p>
                                </div>
                              </div>
                              {result.status === "completed" && (
                                <Button
                                  onClick={() => handleSelectResult(result)}
                                  variant="outline"
                                  size="sm"
                                  className="border-windtre-orange text-windtre-orange hover:bg-windtre-orange hover:text-white"
                                  data-testid={`button-review-${result.id}`}
                                >
                                  Review
                                  <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {/* Actions: Continue or Proceed */}
                        {analysisResults.some(r => r.status === 'completed') && (
                          <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-purple-50 rounded-lg border border-windtre-orange/20">
                            <h4 className="font-medium text-gray-900 mb-3">Cosa vuoi fare?</h4>
                            <div className="flex gap-3">
                              <Button
                                onClick={() => document.getElementById('pdf-upload')?.click()}
                                variant="outline"
                                className="flex-1 border-windtre-orange text-windtre-orange hover:bg-windtre-orange hover:text-white"
                                data-testid="button-upload-another"
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Carica un altro PDF
                              </Button>
                              <Button
                                onClick={() => {
                                  const completedResult = analysisResults.find(r => r.status === 'completed');
                                  if (completedResult) handleSelectResult(completedResult);
                                }}
                                className="flex-1 bg-windtre-purple hover:bg-windtre-purple-dark text-white"
                                data-testid="button-proceed-to-review"
                              >
                                Procedi al Review
                                <ChevronRight className="h-4 w-4 ml-2" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}

          {activeView === 'review' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Review & Correct</h2>

              {/* Lista Review Storiche */}
              {session && (session as any).extractedData?.length > 0 && (
                <Card className="windtre-glass-panel border-white/20 mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-windtre-orange">
                      <FileText className="h-5 w-5" />
                      Review Disponibili ({(session as any).extractedData.length})
                    </CardTitle>
                    <CardDescription>Seleziona una review da visualizzare o modificare</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(session as any).extractedData.map((extracted: any, idx: number) => (
                        <div
                          key={extracted.id}
                          onClick={() => {
                            setReviewData({
                              customerData: extracted.customerData || {},
                              servicesExtracted: extracted.servicesExtracted || []
                            });
                            setSelectedResult({ extractedDataId: extracted.id } as any);
                          }}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            selectedResult?.extractedDataId === extracted.id
                              ? 'border-windtre-orange bg-orange-50'
                              : 'border-gray-200 hover:border-windtre-purple hover:bg-purple-50'
                          }`}
                          data-testid={`review-card-${idx}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-medium text-gray-500">
                              #{idx + 1} - {new Date(extracted.createdAt).toLocaleDateString('it-IT', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {selectedResult?.extractedDataId === extracted.id && (
                              <CheckCircle2 className="h-5 w-5 text-windtre-orange" />
                            )}
                          </div>
                          <h4 className="font-semibold text-gray-900 mb-1">
                            {extracted.customerData?.firstName} {extracted.customerData?.lastName}
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            {extracted.servicesExtracted?.length || 0} servizi
                          </p>
                          <div className="text-xs text-gray-500">
                            {extracted.customerData?.phone && (
                              <div className="flex items-center gap-1">
                                <span>📞</span>
                                <span>{extracted.customerData.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {reviewData && (
              <div>
              <Card className="windtre-glass-panel border-white/20 mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-windtre-purple">
                    <Edit className="h-5 w-5" />
                    Dati Cliente
                  </CardTitle>
                  <CardDescription>Verifica e correggi i dati estratti dall'AI</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nome</Label>
                      <Input 
                        value={reviewData.customerData?.firstName || ''} 
                        onChange={(e) => setReviewData({
                          ...reviewData,
                          customerData: { ...reviewData.customerData, firstName: e.target.value }
                        })}
                        data-testid="input-customer-firstname"
                      />
                    </div>
                    <div>
                      <Label>Cognome</Label>
                      <Input 
                        value={reviewData.customerData?.lastName || ''} 
                        onChange={(e) => setReviewData({
                          ...reviewData,
                          customerData: { ...reviewData.customerData, lastName: e.target.value }
                        })}
                        data-testid="input-customer-lastname"
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input 
                        value={reviewData.customerData?.email || ''} 
                        onChange={(e) => setReviewData({
                          ...reviewData,
                          customerData: { ...reviewData.customerData, email: e.target.value }
                        })}
                        data-testid="input-customer-email"
                      />
                    </div>
                    <div>
                      <Label>Telefono</Label>
                      <Input 
                        value={reviewData.customerData?.phone || ''} 
                        onChange={(e) => setReviewData({
                          ...reviewData,
                          customerData: { ...reviewData.customerData, phone: e.target.value }
                        })}
                        data-testid="input-customer-phone"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="windtre-glass-panel border-white/20 mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-windtre-orange">
                    <GitBranch className="h-5 w-5" />
                    Mapping Servizi WindTre
                  </CardTitle>
                  <CardDescription>Mappa ogni servizio estratto alla gerarchia prodotti WindTre</CardDescription>
                </CardHeader>
                <CardContent>
                  {hierarchyError ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                      <p className="text-red-600 font-medium">Errore caricamento gerarchia prodotti</p>
                      <p className="text-gray-500 text-sm mt-1">Riprova più tardi</p>
                    </div>
                  ) : loadingHierarchy ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-windtre-orange mx-auto" />
                      <p className="text-gray-500 mt-2">Caricamento gerarchia prodotti...</p>
                    </div>
                  ) : driversHierarchy.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                      <p className="text-gray-600 font-medium">Nessun driver disponibile</p>
                      <p className="text-gray-500 text-sm mt-1">Contatta l'amministratore per configurare la gerarchia prodotti</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {reviewData.servicesExtracted?.map((service: any, index: number) => {
                        const mapping = serviceMappings[index] || {};
                        const selectedDriver = driversHierarchy.find(d => d.id === mapping.driverId);
                        const selectedCategory = selectedDriver?.categories.find(c => c.id === mapping.categoryId);
                        
                        return (
                          <div key={index} className="p-4 bg-gradient-to-r from-orange-50 to-purple-50 rounded-lg border border-windtre-orange/20">
                            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                              <span className="w-6 h-6 bg-windtre-orange text-white rounded-full flex items-center justify-center text-sm">
                                {index + 1}
                              </span>
                              {service.serviceName || `Servizio ${index + 1}`}
                              <span className="text-sm text-gray-500 ml-auto">€{service.price || 'N/A'}</span>
                            </h4>
                            
                            <div className="grid grid-cols-3 gap-4">
                              {/* Driver Select */}
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Driver *</Label>
                                <Select
                                  value={mapping.driverId || ""}
                                  onValueChange={(value) => {
                                    const newMappings = [...serviceMappings];
                                    newMappings[index] = { driverId: value, categoryId: undefined, typologyId: undefined };
                                    setServiceMappings(newMappings);
                                  }}
                                >
                                  <SelectTrigger className="mt-1" data-testid={`select-driver-${index}`}>
                                    <SelectValue placeholder="Seleziona Driver" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {driversHierarchy.map(driver => (
                                      <SelectItem key={driver.id} value={driver.id}>
                                        {driver.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Category Select */}
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Categoria *</Label>
                                <Select
                                  value={mapping.categoryId || ""}
                                  onValueChange={(value) => {
                                    const newMappings = [...serviceMappings];
                                    newMappings[index] = { ...mapping, categoryId: value, typologyId: undefined };
                                    setServiceMappings(newMappings);
                                  }}
                                  disabled={!selectedDriver}
                                >
                                  <SelectTrigger className="mt-1" data-testid={`select-category-${index}`}>
                                    <SelectValue placeholder={selectedDriver ? "Seleziona Categoria" : "Prima seleziona Driver"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {selectedDriver?.categories.map(category => (
                                      <SelectItem key={category.id} value={category.id}>
                                        {category.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Typology Select */}
                              <div>
                                <Label className="text-sm font-medium text-gray-700">Tipologia *</Label>
                                <Select
                                  value={mapping.typologyId || ""}
                                  onValueChange={(value) => {
                                    const newMappings = [...serviceMappings];
                                    newMappings[index] = { ...mapping, typologyId: value };
                                    setServiceMappings(newMappings);
                                  }}
                                  disabled={!selectedCategory}
                                >
                                  <SelectTrigger className="mt-1" data-testid={`select-typology-${index}`}>
                                    <SelectValue placeholder={selectedCategory ? "Seleziona Tipologia" : "Prima seleziona Categoria"} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {selectedCategory?.typologies.map(typology => (
                                      <SelectItem key={typology.id} value={typology.id}>
                                        {typology.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            {/* Save Mapping Button */}
                            <div className="mt-4 flex justify-end">
                              <Button
                                onClick={() => handleSaveServiceMapping(index)}
                                disabled={!mapping.driverId || saveServiceMappingMutation.isPending}
                                className="bg-windtre-orange hover:bg-windtre-orange/90"
                                data-testid={`button-save-mapping-${index}`}
                              >
                                {saveServiceMappingMutation.isPending ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Salvataggio...
                                  </>
                                ) : (
                                  <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Salva Mapping
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="windtre-glass-panel border-white/20 mb-6">
                <CardHeader>
                  <CardTitle>Note di Revisione</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Aggiungi note sulla revisione..."
                    rows={4}
                    data-testid="textarea-review-notes"
                  />
                </CardContent>
              </Card>

              {/* Training Prompt Dialog */}
              <Dialog open={trainingDialogOpen} onOpenChange={setTrainingDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="mb-4 border-windtre-orange text-windtre-orange hover:bg-windtre-orange hover:text-white"
                    data-testid="button-open-training-dialog"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Addestra AI su questa PDC
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-windtre-orange">
                      <Sparkles className="h-5 w-5" />
                      Training AI Cross-Tenant
                    </DialogTitle>
                    <DialogDescription>
                      Fornisci istruzioni all'AI per migliorare l'analisi futura di PDC simili. 
                      Il training sarà condiviso tra tutti i tenant per migliorare l'accuratezza globale.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="training-prompt">Prompt di Addestramento *</Label>
                      <Textarea
                        id="training-prompt"
                        value={trainingPrompt}
                        onChange={(e) => setTrainingPrompt(e.target.value)}
                        placeholder="Esempio: 'Quando vedi campo X nel PDF, estrailo sempre come Y...' oppure 'Questo servizio dovrebbe essere mappato a Driver Mobile, Categoria Ricaricabile...'"
                        rows={6}
                        className="mt-2"
                        data-testid="textarea-training-prompt"
                      />
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                      <input
                        type="checkbox"
                        id="is-public"
                        checked={isPublicTraining}
                        onChange={(e) => setIsPublicTraining(e.target.checked)}
                        className="w-4 h-4 text-windtre-orange"
                        data-testid="checkbox-public-training"
                      />
                      <Label htmlFor="is-public" className="text-sm">
                        Condividi training cross-tenant (consigliato per migliorare l'AI globalmente)
                      </Label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTrainingDialogOpen(false);
                        setTrainingPrompt("");
                      }}
                      data-testid="button-cancel-training"
                    >
                      Annulla
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!trainingPrompt.trim() || !selectedResult) return;
                        
                        await saveToTrainingMutation.mutateAsync({
                          extractedDataId: selectedResult.extractedDataId,
                          isPublic: isPublicTraining,
                          trainingPrompt: trainingPrompt,
                        });
                        
                        setTrainingDialogOpen(false);
                        setTrainingPrompt("");
                      }}
                      disabled={!trainingPrompt.trim() || saveToTrainingMutation.isPending}
                      className="bg-windtre-orange hover:bg-windtre-orange-dark text-white"
                      data-testid="button-save-training"
                    >
                      {saveToTrainingMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Salvataggio...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Salva Training
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="flex justify-end gap-3">
                <Button
                  onClick={handleSubmitReview}
                  disabled={submitReviewMutation.isPending}
                  className="bg-windtre-purple hover:bg-windtre-purple-dark text-white"
                  data-testid="button-submit-review"
                >
                  {submitReviewMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salva e Procedi all'Export
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
              </div>
              )}
            </div>
          )}

          {activeView === 'export' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Export JSON</h2>

              {exportJson ? (
                <>
                  <Card className="windtre-glass-panel border-white/20 mb-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-windtre-orange">
                        <Download className="h-5 w-5" />
                        JSON Pronto per Export
                      </CardTitle>
                      <CardDescription>Dati formattati per integrazione con cassa</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-xs">
                        {JSON.stringify(exportJson, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end gap-3">
                    <Button
                      onClick={handleDownloadJson}
                      className="bg-windtre-orange hover:bg-windtre-orange-dark text-white"
                      data-testid="button-download-json"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download JSON
                    </Button>
                  </div>
                </>
              ) : (
                <Card className="windtre-glass-panel border-white/20">
                  <CardContent className="pt-12 pb-12 text-center">
                    <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nessun Export Disponibile</h3>
                    <p className="text-gray-600 mb-6">
                      Completa la revisione di almeno un PDF per generare l'export JSON
                    </p>
                    <Button
                      onClick={() => setActiveView('upload')}
                      variant="outline"
                      data-testid="button-go-to-upload"
                    >
                      Vai a Upload
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* PDF2 Flow Dialog */}
        <Dialog open={showPdf2Dialog} onOpenChange={setShowPdf2Dialog}>
          <DialogContent className="windtre-glass-panel border-windtre-orange/20">
            <DialogHeader>
              <DialogTitle className="text-windtre-purple flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Secondo PDF Disponibile?
              </DialogTitle>
              <DialogDescription>
                Hai un secondo PDF da caricare (es. retro del contratto o allegati)?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-600">
                Se il contratto ha un retro o documenti allegati, puoi caricarli ora per un'analisi completa.
                Altrimenti, procederemo direttamente alla revisione dei dati estratti.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => handlePdf2Response(false)}
                  variant="outline"
                  className="flex-1 border-gray-300"
                  data-testid="button-no-pdf2"
                >
                  No, Procedi al Review
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  onClick={() => handlePdf2Response(true)}
                  className="flex-1 bg-windtre-orange hover:bg-windtre-orange-dark text-white"
                  data-testid="button-yes-pdf2"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Sì, Carica PDF2
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* PDF2 Waiting State */}
        {waitingForPdf2 && (
          <div className="fixed bottom-8 right-8 bg-windtre-orange text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-pulse">
            <Upload className="h-5 w-5" />
            <span className="font-medium">In attesa del secondo PDF...</span>
          </div>
        )}
      </div>
    </Layout>
  );
}
