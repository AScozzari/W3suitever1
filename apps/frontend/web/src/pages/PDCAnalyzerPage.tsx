import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Layout from "../components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Plus
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

type Step = "create-session" | "upload" | "analyzing" | "results";

interface SessionData {
  id: string;
  sessionName: string;
}

interface AnalysisResult {
  pdfId: string;
  fileName: string;
  status: "success" | "error";
  data?: any;
  error?: string;
}

export default function PDCAnalyzerPage() {
  const [currentModule, setCurrentModule] = useState("ai");
  const { toast } = useToast();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState<Step>("create-session");
  const [sessionName, setSessionName] = useState("");
  const [session, setSession] = useState<SessionData | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Mutation per creare sessione
  const createSessionMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("/api/pdc/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tenant-ID": localStorage.getItem("tenantId") || "",
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
      
      const response = await fetch(`/api/pdc/sessions/${session.id}/upload`, {
        method: "POST",
        headers: {
          "X-Tenant-ID": localStorage.getItem("tenantId") || "",
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Upload fallito");
      return await response.json();
    },
  });

  // Handle step 1: Crea sessione
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

  // Handle step 2: Upload files
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
  };

  // Handle step 3: Processa tutti i file
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
          pdfId: result.id,
          fileName: file.name,
          status: "success",
          data: result.analysis,
        });
      } catch (error: any) {
        results.push({
          pdfId: "",
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
      description: `${results.filter(r => r.status === "success").length}/${results.length} documenti analizzati con successo` 
    });
  };

  // Reset wizard
  const handleNewSession = () => {
    setSessionName("");
    setSession(null);
    setUploadedFiles([]);
    setAnalysisResults([]);
    setCurrentStep("create-session");
  };

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)",
            color: "white",
          }}
        >
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
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4">
          {[
            { step: "create-session", label: "Crea Sessione", icon: Plus },
            { step: "upload", label: "Carica PDF", icon: Upload },
            { step: "analyzing", label: "Analisi AI", icon: Loader2 },
            { step: "results", label: "Risultati", icon: CheckCircle2 },
          ].map((item, idx) => {
            const Icon = item.icon;
            const isActive = currentStep === item.step;
            const isPast = ["create-session", "upload", "analyzing", "results"].indexOf(currentStep) > idx;
            
            return (
              <div key={item.step} className="flex items-center">
                <div className={`flex flex-col items-center ${isActive ? "opacity-100" : isPast ? "opacity-70" : "opacity-30"}`}>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    isActive ? "bg-gradient-to-br from-orange-500 to-purple-600 text-white" :
                    isPast ? "bg-green-500 text-white" :
                    "bg-gray-200 dark:bg-gray-700 text-gray-400"
                  }`}>
                    {isPast ? <Check className="h-6 w-6" /> : <Icon className={`h-6 w-6 ${isActive && item.step === "analyzing" ? "animate-spin" : ""}`} />}
                  </div>
                  <span className="mt-2 text-sm font-medium">{item.label}</span>
                </div>
                {idx < 3 && (
                  <ChevronRight className={`h-5 w-5 mx-2 ${isPast ? "text-green-500" : "text-gray-300"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
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
                  
                  <Button
                    data-testid="button-create-session"
                    onClick={handleCreateSession}
                    disabled={sessionName.trim().length < 3 || createSessionMutation.isPending}
                    className="w-full bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700"
                    size="lg"
                  >
                    {createSessionMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Creazione in corso...
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
            )}

            {/* STEP 2: Upload Files */}
            {currentStep === "upload" && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold">Carica i tuoi documenti PDF</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Puoi caricare più file contemporaneamente. L'AI analizzerà tutti i documenti.
                  </p>
                </div>

                {/* Drag & Drop Area */}
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

                {/* Uploaded Files List */}
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

                {/* Actions */}
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
                    {analysisResults.filter(r => r.status === "success").length} documenti analizzati con successo
                  </p>
                </div>

                {/* Results List */}
                <div className="space-y-3">
                  {analysisResults.map((result, idx) => (
                    <div key={idx} className={`p-4 rounded-lg ${
                      result.status === "success" ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" : 
                      "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {result.status === "success" ? (
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                          ) : (
                            <AlertCircle className="h-6 w-6 text-red-600" />
                          )}
                          <div>
                            <p className="font-semibold">{result.fileName}</p>
                            {result.status === "error" && (
                              <p className="text-sm text-red-600">{result.error}</p>
                            )}
                          </div>
                        </div>
                        {result.status === "success" && (
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Esporta JSON
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={handleNewSession}
                    variant="outline"
                    className="flex-1"
                  >
                    Nuova Analisi
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-orange-500 to-purple-600"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    Esporta Tutti i Risultati
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
