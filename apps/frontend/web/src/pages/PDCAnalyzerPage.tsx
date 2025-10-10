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
  FileSearch
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

const WINDTRE_HIERARCHY = {
  "Fisso": {
    "Fibra": ["FTTH", "FTTC"],
    "ADSL": ["Basic", "Plus"]
  },
  "Mobile": {
    "Abbonamento": ["Postpagato", "Business"],
    "Ricaricabile": ["Prepagata", "Easy"]
  },
  "Energia": {
    "Luce": ["Domestica", "Business"],
    "Gas": ["Domestica", "Business"]
  },
  "Assicurazione": {
    "Vita": ["Base", "Premium"],
    "Casa": ["Base", "Premium"]
  },
  "Protecta": {
    "Device": ["Smartphone", "Tablet"],
    "Servizi": ["Assistenza", "Garanzia"]
  },
  "Customer Base": {
    "Retention": ["Fidelizzazione", "Winback"],
    "Upsell": ["Cross-sell", "Up-sell"]
  }
};

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

  // Query per sessioni precedenti
  const { data: previousSessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['/api/pdc/sessions'],
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
      
      const currentTenantId = localStorage.getItem("currentTenantId") || localStorage.getItem("tenantId") || "";
      
      const response = await fetch(`/api/pdc/sessions/${session.id}/upload`, {
        method: "POST",
        headers: {
          "X-Tenant-ID": currentTenantId,
          "X-Auth-Session": "authenticated",
          "X-Demo-User": "admin-user",
        },
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload fallito");
      }
      return await response.json();
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
    onSuccess: () => {
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

  const handleSaveServiceMapping = async (mapping: any) => {
    if (!selectedResult) return;
    
    try {
      await saveServiceMappingMutation.mutateAsync({
        extractedDataId: selectedResult.extractedDataId,
        mapping: {
          serviceIndex: currentServiceIndex,
          ...mapping,
        },
      });

      if (currentServiceIndex < (reviewData?.servicesExtracted?.length || 0) - 1) {
        setCurrentServiceIndex(currentServiceIndex + 1);
        toast({ title: "✅ Mapping salvato", description: `Servizio ${currentServiceIndex + 1} mappato` });
      } else {
        setActiveView('export');
        await handlePrepareExport();
        toast({ title: "✅ Tutti i servizi mappati", description: "Preparazione export..." });
      }
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

  const handleDownloadJson = () => {
    if (!exportJson) return;
    
    const blob = new Blob([JSON.stringify(exportJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdc-export-${selectedResult?.extractedDataId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="min-h-screen bg-white">
        {/* Hero Header con WindTre Gradient */}
        <div className="bg-gradient-to-r from-windtre-orange to-windtre-purple p-8 mb-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Sparkles className="h-8 w-8" />
                  PDC Analyzer
                </h1>
                <p className="text-white/90 mt-2">
                  Analisi AI-powered dei contratti PDF con estrazione automatica dati
                </p>
              </div>
            </div>
            
            {/* Navigation Tabs */}
            <div className="flex gap-1 mt-6">
              {[
                { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                { id: 'upload', label: 'Upload & Analyze', icon: Upload },
                { id: 'review', label: 'Review & Correct', icon: FileSearch },
                { id: 'export', label: 'Export JSON', icon: Download }
              ].map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeView === tab.id ? 'default' : 'ghost'}
                  onClick={() => setActiveView(tab.id as any)}
                  className={`flex items-center gap-2 ${
                    activeView === tab.id 
                      ? 'bg-white text-windtre-orange hover:bg-white/90' 
                      : 'text-white hover:bg-white/20'
                  }`}
                  data-testid={`button-tab-${tab.id}`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 pb-6">
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
                          <div>
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
                          <Badge variant="outline" className="capitalize">
                            {sess.status}
                          </Badge>
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
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Upload & Analyze PDFs</h2>

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
                            Crea Sessione
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
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}

          {activeView === 'review' && reviewData && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Review & Correct</h2>

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
                    Servizi Estratti
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reviewData.servicesExtracted?.map((service: any, index: number) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Servizio {index + 1}</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600">Nome:</span>
                            <span className="ml-2 font-medium">{service.serviceName}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Prezzo:</span>
                            <span className="ml-2 font-medium">€{service.price}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
                      Salva Revisione
                    </>
                  )}
                </Button>
              </div>
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
      </div>
    </Layout>
  );
}
