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
  GitBranch
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLocation } from "wouter";

type Step = "dashboard" | "create-session" | "upload" | "analyzing" | "results" | "review" | "service-mapping" | "export";

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

// WindTre Product Hierarchy
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
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState<Step>("dashboard");
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
  const { data: previousSessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['/api/pdc/sessions'],
    enabled: currentStep === "dashboard",
  });

  // Mutation per creare sessione
  const createSessionMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("/api/pdc/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionName: name }),
      });
      return response;
    },
    onSuccess: (data) => {
      setSession(data);
      setCurrentStep("upload");
      toast({ title: "✅ Sessione creata", description: `Sessione "${sessionName}" pronta per l'upload` });
    },
    onError: (error: any) => {
      toast({ 
        title: "❌ Errore creazione sessione", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Mutation per upload e analisi
  const analyzeFileMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!session) throw new Error("Nessuna sessione attiva");
      
      const formData = new FormData();
      formData.append("pdf", file);
      
      // Get tenant ID dynamically (same as apiRequest)
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
        method: "PUT",
        body: {
          correctedData,
          reviewNotes: notes,
        },
      });
      return response;
    },
    onSuccess: () => {
      toast({ title: "✅ Review salvata", description: "Correzioni salvate con successo" });
      setCurrentStep("service-mapping");
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

  const handleCreateSession = () => {
    if (sessionName.trim().length < 3) {
      toast({ 
        title: "Nome troppo corto", 
        description: "Il nome deve avere almeno 3 caratteri",
        variant: "destructive" 
      });
      return;
    }
    createSessionMutation.mutate(sessionName);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleProcessFiles = async () => {
    if (uploadedFiles.length === 0) {
      toast({ title: "Nessun file", description: "Carica almeno un PDF" });
      return;
    }

    setCurrentStep("analyzing");
    setIsProcessing(true);
    const results: AnalysisResult[] = [];

    for (const file of uploadedFiles) {
      try {
        const result = await analyzeFileMutation.mutateAsync(file);
        results.push({
          id: result.id,
          extractedDataId: result.extractedDataId,
          fileName: file.name,
          status: "completed",
          analysis: result.analysis,
        });
      } catch (error: any) {
        results.push({
          id: "",
          extractedDataId: "",
          fileName: file.name,
          status: "error",
          error: error.message,
        });
      }
    }

    setAnalysisResults(results);
    setIsProcessing(false);
    setCurrentStep("results");
    toast({ 
      title: "🎉 Analisi completata!", 
      description: `${results.filter(r => r.status === "completed").length}/${results.length} documenti analizzati` 
    });
  };

  const handleStartReview = (result: AnalysisResult) => {
    setSelectedResult(result);
    setReviewData(result.analysis);
    setCurrentStep("review");
  };

  const handleSaveReview = () => {
    if (!selectedResult) return;
    
    submitReviewMutation.mutate({
      extractedDataId: selectedResult.extractedDataId,
      correctedData: reviewData,
      notes: reviewNotes,
    });
  };

  const handleSaveServiceMapping = async () => {
    if (!selectedResult) return;
    
    const mapping = serviceMappings[currentServiceIndex];
    
    try {
      await saveServiceMappingMutation.mutateAsync({
        extractedDataId: selectedResult.extractedDataId,
        mapping: {
          serviceIndex: currentServiceIndex,
          ...mapping,
        },
      });

      // Only advance after successful save
      if (currentServiceIndex < (reviewData?.services?.length || 0) - 1) {
        setCurrentServiceIndex(currentServiceIndex + 1);
        toast({ title: "✅ Mapping salvato", description: `Servizio ${currentServiceIndex + 1} mappato` });
      } else {
        setCurrentStep("export");
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

  const handleNewSession = () => {
    setSessionName("");
    setSession(null);
    setUploadedFiles([]);
    setAnalysisResults([]);
    setSelectedResult(null);
    setReviewData(null);
    setServiceMappings([]);
    setCurrentServiceIndex(0);
    setExportJson(null);
    setCurrentStep("dashboard");
  };

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Header */}
        <div
          className="rounded-2xl p-8 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)",
            color: "white",
          }}
        >
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">PDC Analyzer</h1>
                <p className="mt-1 text-lg text-white/90">
                  Analisi automatica proposte contrattuali con AI
                </p>
              </div>
            </div>
            {currentStep === "dashboard" && (
              <Button
                size="lg"
                onClick={() => setCurrentStep("create-session")}
                className="bg-white text-purple-700 hover:bg-gray-100"
                data-testid="button-new-analysis"
              >
                <Plus className="mr-2 h-5 w-5" />
                Nuova Analisi
              </Button>
            )}
          </div>
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-purple-500/20 rounded-full -ml-48 -mb-48" />
        </div>

        {/* Dashboard View */}
        {currentStep === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sessioni Totali</CardTitle>
                  <FileCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{previousSessions?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Analisi completate</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">PDC Analizzati</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {previousSessions?.reduce((acc: number, s: any) => acc + (s.totalPdfs || 0), 0) || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Documenti processati</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ultima Sessione</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {previousSessions?.[0]?.createdAt ? new Date(previousSessions[0].createdAt).toLocaleDateString('it-IT') : "-"}
                  </div>
                  <p className="text-xs text-muted-foreground">Data analisi</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Sessioni Recenti</CardTitle>
                <CardDescription>Le tue ultime analisi PDC</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSessions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                  </div>
                ) : previousSessions && previousSessions.length > 0 ? (
                  <div className="space-y-3">
                    {previousSessions.slice(0, 5).map((sess: any) => (
                      <div
                        key={sess.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-purple-600">
                            <FileText className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">{sess.sessionName || `Sessione ${sess.id.slice(0, 8)}`}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(sess.createdAt).toLocaleDateString('it-IT', { 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric' 
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={sess.status === 'completed' ? 'default' : 'secondary'}>
                            {sess.totalPdfs || 0} PDC
                          </Badge>
                          <Button variant="ghost" size="sm">
                            Vedi dettagli
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="flex justify-center mb-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                        <Sparkles className="h-10 w-10 text-gray-400" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Nessuna analisi trovata</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Inizia la tua prima analisi PDC con l'intelligenza artificiale
                    </p>
                    <Button
                      onClick={() => setCurrentStep("create-session")}
                      className="bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Crea Prima Sessione
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Progress Steps */}
        {currentStep !== "dashboard" && (
          <div className="flex items-center justify-center gap-4 overflow-x-auto pb-2">
            {[
              { step: "create-session", label: "Crea Sessione", icon: Plus },
              { step: "upload", label: "Carica PDF", icon: Upload },
              { step: "analyzing", label: "Analisi AI", icon: Loader2 },
              { step: "results", label: "Risultati", icon: CheckCircle2 },
              { step: "review", label: "Review", icon: Edit },
              { step: "service-mapping", label: "Mapping", icon: GitBranch },
              { step: "export", label: "Export", icon: Download },
            ].map((item, idx) => {
              const Icon = item.icon;
              const isActive = currentStep === item.step;
              const steps = ["create-session", "upload", "analyzing", "results", "review", "service-mapping", "export"];
              const isPast = steps.indexOf(currentStep) > idx;
              
              return (
                <div key={item.step} className="flex items-center">
                  <div className={`flex flex-col items-center ${isActive ? "opacity-100" : isPast ? "opacity-70" : "opacity-30"}`}>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      isActive ? "bg-gradient-to-br from-orange-500 to-purple-600 text-white" :
                      isPast ? "bg-green-500 text-white" :
                      "bg-gray-200 dark:bg-gray-700 text-gray-400"
                    }`}>
                      {isPast ? <Check className="h-5 w-5" /> : <Icon className={`h-5 w-5 ${isActive && item.step === "analyzing" ? "animate-spin" : ""}`} />}
                    </div>
                    <span className="mt-1 text-xs font-medium whitespace-nowrap">{item.label}</span>
                  </div>
                  {idx < 6 && (
                    <ChevronRight className={`h-4 w-4 mx-1 ${isPast ? "text-green-500" : "text-gray-300"}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Step Content */}
        {currentStep !== "dashboard" && (
          <Card>
            <CardContent className="p-8">
              {/* STEP 1: Create Session */}
              {currentStep === "create-session" && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">Inizia una nuova analisi</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Dai un nome alla sessione per organizzare i tuoi documenti PDC
                    </p>
                  </div>
                  
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="session-name">Nome Sessione *</Label>
                      <Input
                        id="session-name"
                        data-testid="input-session-name"
                        placeholder="es. Proposte Gennaio 2025"
                        value={sessionName}
                        onChange={(e) => setSessionName(e.target.value)}
                        className="text-lg"
                        onKeyDown={(e) => e.key === "Enter" && handleCreateSession()}
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep("dashboard")}
                        className="flex-1"
                      >
                        Annulla
                      </Button>
                      <Button
                        data-testid="button-create-session"
                        onClick={handleCreateSession}
                        disabled={sessionName.trim().length < 3 || createSessionMutation.isPending}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                        size="lg"
                      >
                        {createSessionMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Creazione...
                          </>
                        ) : (
                          <>
                            Crea Sessione
                            <ChevronRight className="ml-2 h-5 w-5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Upload Files */}
              {currentStep === "upload" && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">Carica i tuoi documenti PDF</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Carica più file contemporaneamente. L'AI analizzerà tutti i documenti.
                    </p>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center hover:border-orange-500 transition-colors">
                    <Upload className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium mb-2">Trascina i PDF qui o clicca per selezionare</p>
                    <p className="text-sm text-gray-500 mb-4">PDF fino a 10MB ciascuno</p>
                    <Input
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button asChild variant="outline">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        Seleziona File
                      </label>
                    </Button>
                  </div>

                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">Documenti caricati ({uploadedFiles.length})</h3>
                      <div className="space-y-2">
                        {uploadedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-orange-500" />
                              <span className="font-medium">{file.name}</span>
                              <span className="text-sm text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))}
                            >
                              Rimuovi
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={handleNewSession}
                      className="flex-1"
                    >
                      Annulla
                    </Button>
                    <Button
                      onClick={handleProcessFiles}
                      disabled={uploadedFiles.length === 0}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                      size="lg"
                    >
                      Analizza {uploadedFiles.length} {uploadedFiles.length === 1 ? "documento" : "documenti"}
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: Analyzing */}
              {currentStep === "analyzing" && (
                <div className="space-y-6 text-center py-12">
                  <Loader2 className="h-20 w-20 mx-auto animate-spin text-orange-500" />
                  <h2 className="text-2xl font-bold">Analisi in corso...</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    L'intelligenza artificiale sta processando i tuoi documenti
                  </p>
                  <Progress value={65} className="max-w-md mx-auto" />
                </div>
              )}

              {/* STEP 4: Results */}
              {currentStep === "results" && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <CheckCircle2 className="h-20 w-20 mx-auto text-green-500" />
                    <h2 className="text-2xl font-bold">Analisi completata!</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      {analysisResults.filter(r => r.status === "completed").length} documenti analizzati con successo
                    </p>
                  </div>

                  <div className="space-y-3">
                    {analysisResults.map((result, idx) => (
                      <div key={idx} className={`p-4 rounded-lg ${
                        result.status === "completed" ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" : 
                        "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {result.status === "completed" ? (
                              <CheckCircle2 className="h-6 w-6 text-green-600" />
                            ) : (
                              <AlertCircle className="h-6 w-6 text-red-600" />
                            )}
                            <div>
                              <p className="font-semibold">{result.fileName}</p>
                              {result.status === "error" && (
                                <p className="text-sm text-red-600">{result.error}</p>
                              )}
                              {result.status === "completed" && result.analysis && (
                                <p className="text-sm text-green-600">Confidence: {result.analysis.confidence}%</p>
                              )}
                            </div>
                          </div>
                          {result.status === "completed" && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleStartReview(result)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Review & Export
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button
                      onClick={handleNewSession}
                      variant="outline"
                      className="flex-1"
                    >
                      Nuova Analisi
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 5: Review */}
              {currentStep === "review" && reviewData && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">Review Dati Estratti</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Verifica e correggi i dati estratti dall'AI
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Cliente</h3>
                      <Textarea
                        value={JSON.stringify(reviewData.customer, null, 2)}
                        onChange={(e) => {
                          try {
                            const customer = JSON.parse(e.target.value);
                            setReviewData({ ...reviewData, customer });
                          } catch {}
                        }}
                        rows={8}
                        className="font-mono text-sm"
                      />
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Servizi ({reviewData.services?.length || 0})</h3>
                      <Textarea
                        value={JSON.stringify(reviewData.services, null, 2)}
                        onChange={(e) => {
                          try {
                            const services = JSON.parse(e.target.value);
                            setReviewData({ ...reviewData, services });
                          } catch {}
                        }}
                        rows={10}
                        className="font-mono text-sm"
                      />
                    </div>

                    <div>
                      <Label>Note di Revisione (opzionale)</Label>
                      <Textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Descrivi eventuali correzioni apportate..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep("results")}
                      className="flex-1"
                    >
                      Indietro
                    </Button>
                    <Button
                      onClick={handleSaveReview}
                      disabled={submitReviewMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-purple-600"
                      size="lg"
                    >
                      {submitReviewMutation.isPending ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-5 w-5" />
                      )}
                      Salva Review
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 6: Service Mapping */}
              {currentStep === "service-mapping" && reviewData && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold">Mapping Servizi WindTre</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Mappa servizio {currentServiceIndex + 1} di {reviewData.services?.length || 0} alla gerarchia WindTre
                    </p>
                  </div>

                  {reviewData.services?.[currentServiceIndex] && (
                    <div className="space-y-4">
                      <Card className="bg-gray-50 dark:bg-gray-800">
                        <CardContent className="p-4">
                          <p className="font-semibold">Servizio dal PDF:</p>
                          <p className="text-sm mt-1">{reviewData.services[currentServiceIndex].productDescription || "N/A"}</p>
                          <p className="text-sm text-gray-500 mt-1">Prezzo: €{reviewData.services[currentServiceIndex].price || "N/A"}</p>
                        </CardContent>
                      </Card>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Driver (Livello 1) *</Label>
                          <Select
                            value={serviceMappings[currentServiceIndex]?.driverSelected}
                            onValueChange={(value) => {
                              const newMappings = [...serviceMappings];
                              newMappings[currentServiceIndex] = { 
                                ...newMappings[currentServiceIndex], 
                                driverSelected: value,
                                categorySelected: "",
                                typologySelected: "",
                              };
                              setServiceMappings(newMappings);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona driver" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.keys(WINDTRE_HIERARCHY).map(driver => (
                                <SelectItem key={driver} value={driver}>{driver}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Categoria (Livello 2) *</Label>
                          <Select
                            value={serviceMappings[currentServiceIndex]?.categorySelected}
                            onValueChange={(value) => {
                              const newMappings = [...serviceMappings];
                              newMappings[currentServiceIndex] = { 
                                ...newMappings[currentServiceIndex], 
                                categorySelected: value,
                                typologySelected: "",
                              };
                              setServiceMappings(newMappings);
                            }}
                            disabled={!serviceMappings[currentServiceIndex]?.driverSelected}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              {serviceMappings[currentServiceIndex]?.driverSelected && 
                                Object.keys(WINDTRE_HIERARCHY[serviceMappings[currentServiceIndex].driverSelected as keyof typeof WINDTRE_HIERARCHY] || {}).map(cat => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))
                              }
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Tipologia (Livello 3) *</Label>
                          <Select
                            value={serviceMappings[currentServiceIndex]?.typologySelected}
                            onValueChange={(value) => {
                              const newMappings = [...serviceMappings];
                              newMappings[currentServiceIndex] = { 
                                ...newMappings[currentServiceIndex], 
                                typologySelected: value,
                              };
                              setServiceMappings(newMappings);
                            }}
                            disabled={!serviceMappings[currentServiceIndex]?.categorySelected}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona tipologia" />
                            </SelectTrigger>
                            <SelectContent>
                              {serviceMappings[currentServiceIndex]?.driverSelected && 
                               serviceMappings[currentServiceIndex]?.categorySelected &&
                                (WINDTRE_HIERARCHY[serviceMappings[currentServiceIndex].driverSelected as keyof typeof WINDTRE_HIERARCHY]?.[serviceMappings[currentServiceIndex].categorySelected as any] || []).map((typ: string) => (
                                  <SelectItem key={typ} value={typ}>{typ}</SelectItem>
                                ))
                              }
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Prodotto Esatto (descrizione da PDF)</Label>
                        <Input
                          value={serviceMappings[currentServiceIndex]?.productMatched || ""}
                          onChange={(e) => {
                            const newMappings = [...serviceMappings];
                            newMappings[currentServiceIndex] = { 
                              ...newMappings[currentServiceIndex], 
                              productMatched: e.target.value,
                            };
                            setServiceMappings(newMappings);
                          }}
                          placeholder="es. WindTre Top 50GB"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (currentServiceIndex > 0) {
                          setCurrentServiceIndex(currentServiceIndex - 1);
                        }
                      }}
                      disabled={currentServiceIndex === 0}
                      className="flex-1"
                    >
                      Servizio Precedente
                    </Button>
                    <Button
                      onClick={handleSaveServiceMapping}
                      disabled={
                        !serviceMappings[currentServiceIndex]?.driverSelected ||
                        !serviceMappings[currentServiceIndex]?.categorySelected ||
                        !serviceMappings[currentServiceIndex]?.typologySelected
                      }
                      className="flex-1 bg-gradient-to-r from-orange-500 to-purple-600"
                      size="lg"
                    >
                      {currentServiceIndex < (reviewData.services?.length || 0) - 1 ? "Servizio Successivo" : "Completa Mapping"}
                      <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 7: Export */}
              {currentStep === "export" && exportJson && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <Download className="h-20 w-20 mx-auto text-green-500" />
                    <h2 className="text-2xl font-bold">Export JSON Completato</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Dati pronti per l'integrazione con il sistema di cassa
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Anteprima JSON</h3>
                      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg max-h-96 overflow-auto">
                        <pre className="text-xs">{JSON.stringify(exportJson, null, 2)}</pre>
                      </div>
                    </div>

                    <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                      <CardContent className="p-4">
                        <p className="text-sm">
                          <strong>✅ Dati validati e corretti</strong><br />
                          {exportJson.metadata?.wasHumanReviewed ? "Review umana completata" : "Solo AI extraction"}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={handleNewSession}
                      className="flex-1"
                    >
                      Nuova Analisi
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex-1"
                        >
                          Salva nel Training Dataset
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Salva nel Training Dataset</DialogTitle>
                          <DialogDescription>
                            Contribuisci al miglioramento dell'AI salvando questi dati validati
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Note per Training (opzionale)</Label>
                            <Textarea
                              placeholder="Descrivi eventuali pattern o regole apprese..."
                              rows={3}
                            />
                          </div>
                          <Button
                            onClick={() => {
                              saveToTrainingMutation.mutate({
                                extractedDataId: selectedResult?.extractedDataId,
                                isPublic: true,
                                trainingPrompt: "",
                              });
                            }}
                            className="w-full bg-gradient-to-r from-orange-500 to-purple-600"
                          >
                            Salva (Cross-Tenant)
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      onClick={handleDownloadJson}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-purple-600"
                      size="lg"
                    >
                      <Download className="mr-2 h-5 w-5" />
                      Download JSON
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
