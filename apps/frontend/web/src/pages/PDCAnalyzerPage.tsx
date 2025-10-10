import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Layout from "../components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRequiredTenant } from "@/hooks/useTenantSafety";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Download, Edit, Trash2, Plus, Sparkles, CheckCircle, XCircle, Clock } from "lucide-react";

interface PDCSession {
  id: string;
  sessionName: string;
  totalPdfs: number;
  analyzedPdfs: number;
  reviewedPdfs: number;
  status: string;
  createdAt: string;
}

// Type for AI extracted data from PDC
interface PDCExtractedData {
  customer: Record<string, unknown>;
  services: Array<Record<string, unknown>>;
  confidence: number;
  extractionNotes?: string;
}

interface TrainingEntry {
  id: string;
  pdfFileName: string;
  pdfFileSize: number;
  aiRawOutput: PDCExtractedData;
  humanCorrectedOutput?: PDCExtractedData;
  confidenceScore: number;
  isReviewed: boolean;
  reviewNotes?: string;
  analyzedAt: string;
  reviewedAt?: string;
}

export default function PDCAnalyzerPage() {
  const [currentModule, setCurrentModule] = useState("ai");
  const { toast } = useToast();
  const { tenant } = useRequiredTenant();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [newSessionName, setNewSessionName] = useState("");
  const [newSessionError, setNewSessionError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reviewEntry, setReviewEntry] = useState<TrainingEntry | null>(null);
  const [correctedData, setCorrectedData] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  // Fetch sessions
  const { data: sessions = [] } = useQuery<PDCSession[]>({
    queryKey: ["/api/pdc/sessions"],
  });

  // Fetch session details with training data
  const { data: sessionDetails } = useQuery({
    queryKey: ["/api/pdc/sessions", selectedSession],
    enabled: !!selectedSession,
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (name: string) => {
      // Validate session name
      if (!name || name.trim().length === 0) {
        throw new Error("Il nome della sessione è obbligatorio");
      }
      if (name.trim().length < 3) {
        throw new Error("Il nome della sessione deve essere almeno 3 caratteri");
      }
      return await apiRequest("POST", "/api/pdc/sessions", { name: name.trim() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc/sessions"] });
      toast({ title: "Sessione creata", description: "Nuova sessione di analisi PDC creata con successo" });
      setIsCreateDialogOpen(false);
      setNewSessionName("");
      setNewSessionError("");
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Errore durante la creazione della sessione";
      setNewSessionError(errorMessage);
      toast({ title: "Errore", description: errorMessage, variant: "destructive" });
    },
  });

  // Upload and analyze mutation
  const analyzeMutation = useMutation({
    mutationFn: async ({ file, sessionId }: { file: File; sessionId: string }) => {
      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("sessionId", sessionId);

      const response = await fetch("/api/pdc/analyze", {
        method: "POST",
        headers: {
          "X-Tenant-ID": localStorage.getItem("tenantId") || "",
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to analyze PDF");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc/sessions", selectedSession] });
      queryClient.invalidateQueries({ queryKey: ["/api/pdc/sessions"] });
      toast({ title: "Analisi completata", description: "PDF analizzato con successo" });
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast({ title: "Errore analisi", description: error.message, variant: "destructive" });
    },
  });

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ entryId, correctedOutput, reviewNotes }: { entryId: string; correctedOutput: PDCExtractedData; reviewNotes: string }) => {
      return await apiRequest("POST", "/api/pdc/training", {
        entryId,
        correctedOutput,
        reviewNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc/sessions", selectedSession] });
      queryClient.invalidateQueries({ queryKey: ["/api/pdc/sessions"] });
      toast({ title: "Review salvata", description: "Correzioni salvate per il training AI" });
      setIsReviewDialogOpen(false);
      setReviewEntry(null);
      setCorrectedData("");
      setReviewNotes("");
    },
    onError: (error: any) => {
      toast({ title: "Errore review", description: error.message, variant: "destructive" });
    },
  });

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/pdc/sessions/${sessionId}`, {
        method: "DELETE",
        headers: {
          "X-Tenant-ID": localStorage.getItem("tenantId") || "",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete session");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdc/sessions"] });
      toast({ title: "Sessione eliminata", description: "Sessione e dati associati eliminati" });
      setSelectedSession(null);
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const handleExport = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/pdc/export/${sessionId}`, {
        headers: {
          "X-Tenant-ID": localStorage.getItem("tenantId") || "",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export session");
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pdc-export-${sessionId}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast({ title: "Export completato", description: "JSON scaricato con successo" });
    } catch (error: any) {
      toast({ title: "Errore export", description: error.message, variant: "destructive" });
    }
  };

  const openReviewDialog = (entry: TrainingEntry) => {
    setReviewEntry(entry);
    setCorrectedData(JSON.stringify(entry.humanCorrectedOutput || entry.aiRawOutput, null, 2));
    setReviewNotes(entry.reviewNotes || "");
    setIsReviewDialogOpen(true);
  };

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="space-y-6">
        {/* Header con gradiente WindTre */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "linear-gradient(135deg, #FF6900 0%, #7B2CBF 100%)",
            color: "white",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">PDC Analyzer</h1>
                <p className="mt-1 text-lg text-white/90">
                  Estrai dati da proposte contrattuali PDF con OCR intelligente e AI
                </p>
              </div>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-session" className="bg-white text-purple-600 hover:bg-white/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuova Sessione
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crea Nuova Sessione</DialogTitle>
                  <DialogDescription>
                    Crea una sessione di analisi per raggruppare più PDC
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="session-name">Nome Sessione *</Label>
                    <Input
                      id="session-name"
                      data-testid="input-session-name"
                      placeholder="es. Analisi PDC Gennaio 2025"
                      value={newSessionName}
                      onChange={(e) => {
                        setNewSessionName(e.target.value);
                        setNewSessionError("");
                      }}
                      className={newSessionError ? "border-red-500" : ""}
                    />
                    {newSessionError && (
                      <p className="text-sm text-red-600 dark:text-red-400" data-testid="error-session-name">
                        {newSessionError}
                      </p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    data-testid="button-confirm-create"
                    onClick={() => createSessionMutation.mutate(newSessionName)}
                    disabled={!newSessionName || newSessionName.trim().length < 3 || createSessionMutation.isPending}
                  >
                    {createSessionMutation.isPending ? "Creazione..." : "Crea Sessione"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Sessions List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => (
          <Card
            key={session.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedSession === session.id ? "ring-2 ring-orange-500" : ""
            }`}
            onClick={() => setSelectedSession(session.id)}
            data-testid={`card-session-${session.id}`}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                {session.sessionName}
                <Badge variant={session.status === "active" ? "default" : "secondary"}>
                  {session.status}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                {new Date(session.createdAt).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Tot. PDC:</span>
                  <span className="font-medium">{session.totalPdfs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Analizzati:</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">{session.analyzedPdfs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Revisionati:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">{session.reviewedPdfs}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Session Details */}
      {selectedSession && sessionDetails && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>PDC Analizzati - {sessionDetails.sessionName}</CardTitle>
              <div className="flex gap-2">
                <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" data-testid="button-upload-pdf">
                      <Upload className="mr-2 h-4 w-4" />
                      Carica PDF
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Carica e Analizza PDF</DialogTitle>
                      <DialogDescription>
                        Seleziona un PDF da analizzare con l'AI
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="pdf-file">File PDF</Label>
                        <Input
                          id="pdf-file"
                          data-testid="input-pdf-file"
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        data-testid="button-confirm-analyze"
                        onClick={() => {
                          if (selectedFile) {
                            analyzeMutation.mutate({ file: selectedFile, sessionId: selectedSession });
                          }
                        }}
                        disabled={!selectedFile || analyzeMutation.isPending}
                      >
                        {analyzeMutation.isPending ? (
                          <>
                            <span className="mr-2">🔄</span>
                            Analisi in corso...
                          </>
                        ) : (
                          "Analizza PDF"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  data-testid="button-export-session"
                  onClick={() => handleExport(selectedSession)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Esporta JSON
                </Button>

                <Button
                  variant="destructive"
                  data-testid="button-delete-session"
                  onClick={() => deleteSessionMutation.mutate(selectedSession)}
                  disabled={deleteSessionMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleteSessionMutation.isPending ? "Eliminazione..." : "Elimina"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Analisi</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionDetails.trainingData?.map((entry: TrainingEntry) => (
                  <TableRow key={entry.id} data-testid={`row-training-${entry.id}`}>
                    <TableCell className="font-medium">{entry.pdfFileName}</TableCell>
                    <TableCell>
                      <Badge variant={entry.confidenceScore >= 80 ? "default" : "secondary"}>
                        {entry.confidenceScore}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {entry.isReviewed ? (
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">Revisionato</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">Da rivedere</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(entry.analyzedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`button-review-${entry.id}`}
                        onClick={() => openReviewDialog(entry)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review & Correzione AI</DialogTitle>
            <DialogDescription>
              Correggi i dati estratti dall'AI. Le tue correzioni migliorano il sistema per tutti i tenant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="corrected-data">Dati Estratti (JSON)</Label>
              <Textarea
                id="corrected-data"
                data-testid="textarea-corrected-data"
                className="font-mono text-xs min-h-[300px]"
                value={correctedData}
                onChange={(e) => setCorrectedData(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-notes">Note di Revisione</Label>
              <Textarea
                id="review-notes"
                data-testid="textarea-review-notes"
                placeholder="Es: Campo 'phone' non rilevato correttamente, CAP mancante"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              data-testid="button-save-review"
              onClick={() => {
                if (reviewEntry) {
                  try {
                    const parsed: PDCExtractedData = JSON.parse(correctedData);
                    reviewMutation.mutate({
                      entryId: reviewEntry.id,
                      correctedOutput: parsed,
                      reviewNotes,
                    });
                  } catch (error) {
                    toast({ title: "Errore JSON", description: "JSON non valido", variant: "destructive" });
                  }
                }
              }}
              disabled={reviewMutation.isPending}
            >
              {reviewMutation.isPending ? "Salvataggio..." : "Salva Correzioni"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </Layout>
  );
}
