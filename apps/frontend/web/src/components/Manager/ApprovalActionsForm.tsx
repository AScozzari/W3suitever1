import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle, XCircle, AlertTriangle, User, Calendar, FileText,
  Clock, MessageSquare, Send
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  useHRRequest,
  useApproveHRRequest,
  useRejectHRRequest,
  HR_REQUEST_TYPES,
  HR_REQUEST_PRIORITY_LABELS
} from '@/hooks/useHRRequests';
import { useToast } from '@/hooks/use-toast';

// Form schemas
const approveSchema = z.object({
  comment: z.string().max(1000, 'Massimo 1000 caratteri').optional(),
  action: z.literal('approve')
});

const rejectSchema = z.object({
  reason: z.string().min(1, 'Il motivo del rifiuto è obbligatorio').max(1000, 'Massimo 1000 caratteri'),
  comment: z.string().max(1000, 'Massimo 1000 caratteri').optional(),
  action: z.literal('reject')
});

type ApproveFormData = z.infer<typeof approveSchema>;
type RejectFormData = z.infer<typeof rejectSchema>;
type FormData = ApproveFormData | RejectFormData;

interface ApprovalActionsFormProps {
  requestId: string;
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
  className?: string;
}

// Status color mapping
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': 
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300';
    case 'high': 
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300';
    default: 
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300';
  }
};

export default function ApprovalActionsForm({ 
  requestId, 
  open, 
  onClose, 
  onComplete,
  className 
}: ApprovalActionsFormProps) {
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | null>(null);
  const { toast } = useToast();

  // Data queries
  const { data: request, isLoading: requestLoading, error: requestError } = useHRRequest(requestId);

  // Mutations
  const approveMutation = useApproveHRRequest();
  const rejectMutation = useRejectHRRequest();

  // Forms
  const approveForm = useForm<ApproveFormData>({
    resolver: zodResolver(approveSchema),
    defaultValues: { comment: '', action: 'approve' }
  });

  const rejectForm = useForm<RejectFormData>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { reason: '', comment: '', action: 'reject' }
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: it });
    } catch {
      return '-';
    }
  };

  const handleApprove = async (data: ApproveFormData) => {
    try {
      await approveMutation.mutateAsync({
        requestId,
        comment: data.comment
      });
      
      toast({
        title: "Richiesta Approvata",
        description: "La richiesta è stata approvata con successo",
      });
      
      approveForm.reset();
      onComplete?.();
      onClose();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Errore",
        description: "Errore durante l'approvazione della richiesta",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (data: RejectFormData) => {
    try {
      await rejectMutation.mutateAsync({
        requestId,
        reason: data.reason,
        comment: data.comment
      });
      
      toast({
        title: "Richiesta Rifiutata",
        description: "La richiesta è stata rifiutata con successo",
      });
      
      rejectForm.reset();
      onComplete?.();
      onClose();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Errore",
        description: "Errore durante il rifiuto della richiesta",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setSelectedAction(null);
    approveForm.reset();
    rejectForm.reset();
    onClose();
  };

  if (requestError) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl glassmorphism-card border-0">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Errore nel caricamento della richiesta: {requestError.message}
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] glassmorphism-card border-0" data-testid="modal-approval-actions">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-windtre-orange" />
            Azioni di Approvazione
          </DialogTitle>
          <DialogDescription>
            Approva o rifiuta la richiesta HR con commenti e motivazioni
          </DialogDescription>
        </DialogHeader>

        {requestLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : request ? (
          <div className="space-y-6">
            {/* Request Summary */}
            <Card className="glassmorphism-card border-0">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Riepilogo Richiesta
                  </span>
                  <Badge className={getPriorityColor(request.priority)}>
                    {HR_REQUEST_PRIORITY_LABELS[request.priority as keyof typeof HR_REQUEST_PRIORITY_LABELS]}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Richiedente</dt>
                    <dd className="text-sm font-medium mb-2">
                      {request.requester ? 
                        `${request.requester.firstName} ${request.requester.lastName}` : 
                        'N/A'
                      }
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Tipo</dt>
                    <dd className="text-sm font-medium mb-2">
                      {HR_REQUEST_TYPES[request.type as keyof typeof HR_REQUEST_TYPES]}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-sm font-medium text-muted-foreground">Titolo</dt>
                    <dd className="text-sm font-medium mb-2">{request.title}</dd>
                  </div>
                  {request.description && (
                    <div className="col-span-2">
                      <dt className="text-sm font-medium text-muted-foreground">Descrizione</dt>
                      <dd className="text-sm bg-muted/50 p-3 rounded-lg">{request.description}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Data Inizio</dt>
                    <dd className="text-sm">{formatDate(request.startDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Data Fine</dt>
                    <dd className="text-sm">{formatDate(request.endDate)}</dd>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Action Selection */}
            {!selectedAction && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Scegli un'azione
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card 
                    className="glassmorphism-card border-0 cursor-pointer hover:bg-green-50/50 transition-colors group" 
                    onClick={() => setSelectedAction('approve')}
                    data-testid="card-approve-action"
                  >
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center space-y-3">
                        <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full group-hover:bg-green-200 transition-colors">
                          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-green-900 dark:text-green-100">
                            Approva Richiesta
                          </h4>
                          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                            Autorizza la richiesta del dipendente
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card 
                    className="glassmorphism-card border-0 cursor-pointer hover:bg-red-50/50 transition-colors group" 
                    onClick={() => setSelectedAction('reject')}
                    data-testid="card-reject-action"
                  >
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center space-y-3">
                        <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full group-hover:bg-red-200 transition-colors">
                          <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-red-900 dark:text-red-100">
                            Rifiuta Richiesta
                          </h4>
                          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                            Respingi la richiesta con motivazione
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Approve Form */}
            {selectedAction === 'approve' && (
              <Card className="glassmorphism-card border-0 border-l-4 border-l-green-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle className="h-5 w-5" />
                    Approva Richiesta
                  </CardTitle>
                  <CardDescription>
                    Aggiungi un commento opzionale all'approvazione
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...approveForm}>
                    <form onSubmit={approveForm.handleSubmit(handleApprove)} className="space-y-4">
                      <FormField
                        control={approveForm.control}
                        name="comment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Commento (opzionale)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Aggiungi un commento all'approvazione..."
                                className="glassmorphism-card border-0 min-h-[100px]"
                                {...field} 
                                data-testid="textarea-approve-comment"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-3">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setSelectedAction(null)}
                          data-testid="button-cancel-approve"
                        >
                          Indietro
                        </Button>
                        <Button 
                          type="submit"
                          disabled={approveMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                          data-testid="button-confirm-approve"
                        >
                          {approveMutation.isPending ? (
                            <>
                              <Clock className="h-4 w-4 mr-2 animate-spin" />
                              Approvando...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approva Richiesta
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {/* Reject Form */}
            {selectedAction === 'reject' && (
              <Card className="glassmorphism-card border-0 border-l-4 border-l-red-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                    <XCircle className="h-5 w-5" />
                    Rifiuta Richiesta
                  </CardTitle>
                  <CardDescription>
                    Specifica il motivo del rifiuto (obbligatorio)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...rejectForm}>
                    <form onSubmit={rejectForm.handleSubmit(handleReject)} className="space-y-4">
                      <FormField
                        control={rejectForm.control}
                        name="reason"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Motivo del rifiuto *</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Specifica chiaramente il motivo del rifiuto..."
                                className="glassmorphism-card border-0 min-h-[100px]"
                                {...field} 
                                data-testid="textarea-reject-reason"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={rejectForm.control}
                        name="comment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Commento aggiuntivo (opzionale)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Suggerimenti per migliorare la richiesta..."
                                className="glassmorphism-card border-0 min-h-[80px]"
                                {...field} 
                                data-testid="textarea-reject-comment"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-3">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setSelectedAction(null)}
                          data-testid="button-cancel-reject"
                        >
                          Indietro
                        </Button>
                        <Button 
                          type="submit"
                          variant="destructive"
                          disabled={rejectMutation.isPending}
                          data-testid="button-confirm-reject"
                        >
                          {rejectMutation.isPending ? (
                            <>
                              <Clock className="h-4 w-4 mr-2 animate-spin" />
                              Rifiutando...
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 mr-2" />
                              Rifiuta Richiesta
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Richiesta non trovata</p>
          </div>
        )}

        {!selectedAction && (
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={handleCancel} data-testid="button-close-actions">
              Chiudi
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}