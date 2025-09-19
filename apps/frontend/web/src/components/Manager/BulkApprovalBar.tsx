import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, XCircle, X, Users, MessageSquare, AlertTriangle, 
  Clock, Zap
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  useBulkApproveHRRequests,
  useBulkRejectHRRequests,
} from '@/hooks/useHRRequests';
import { useToast } from '@/hooks/use-toast';

// Form schemas
const bulkApproveSchema = z.object({
  comment: z.string().max(1000, 'Massimo 1000 caratteri').optional()
});

const bulkRejectSchema = z.object({
  reason: z.string().min(1, 'Il motivo del rifiuto è obbligatorio').max(1000, 'Massimo 1000 caratteri'),
  comment: z.string().max(1000, 'Massimo 1000 caratteri').optional()
});

type BulkApproveFormData = z.infer<typeof bulkApproveSchema>;
type BulkRejectFormData = z.infer<typeof bulkRejectSchema>;

interface BulkApprovalBarProps {
  selectedCount: number;
  selectedRequests: string[];
  onBulkAction: (action: 'approve' | 'reject') => void;
  onClearSelection: () => void;
  className?: string;
}

export default function BulkApprovalBar({ 
  selectedCount, 
  selectedRequests, 
  onBulkAction,
  onClearSelection,
  className 
}: BulkApprovalBarProps) {
  const [showBulkApproval, setShowBulkApproval] = useState(false);
  const [showBulkRejection, setShowBulkRejection] = useState(false);
  const { toast } = useToast();

  // Mutations
  const bulkApproveMutation = useBulkApproveHRRequests();
  const bulkRejectMutation = useBulkRejectHRRequests();

  // Forms
  const bulkApproveForm = useForm<BulkApproveFormData>({
    resolver: zodResolver(bulkApproveSchema),
    defaultValues: { comment: '' }
  });

  const bulkRejectForm = useForm<BulkRejectFormData>({
    resolver: zodResolver(bulkRejectSchema),
    defaultValues: { reason: '', comment: '' }
  });

  const handleBulkApprove = async (data: BulkApproveFormData) => {
    try {
      await bulkApproveMutation.mutateAsync({
        requestIds: selectedRequests,
        comment: data.comment || `Approvazione multipla di ${selectedCount} richieste`
      });
      
      toast({
        title: "Richieste Approvate",
        description: `${selectedCount} richieste sono state approvate con successo`,
      });
      
      bulkApproveForm.reset();
      setShowBulkApproval(false);
      onBulkAction('approve');
      onClearSelection();
    } catch (error) {
      console.error('Error bulk approving requests:', error);
      toast({
        title: "Errore",
        description: "Errore durante l'approvazione multipla delle richieste",
        variant: "destructive",
      });
    }
  };

  const handleBulkReject = async (data: BulkRejectFormData) => {
    try {
      await bulkRejectMutation.mutateAsync({
        requestIds: selectedRequests,
        reason: data.reason,
        comment: data.comment
      });
      
      toast({
        title: "Richieste Rifiutate",
        description: `${selectedCount} richieste sono state rifiutate con successo`,
      });
      
      bulkRejectForm.reset();
      setShowBulkRejection(false);
      onBulkAction('reject');
      onClearSelection();
    } catch (error) {
      console.error('Error bulk rejecting requests:', error);
      toast({
        title: "Errore",
        description: "Errore durante il rifiuto multiplo delle richieste",
        variant: "destructive",
      });
    }
  };

  if (selectedCount === 0) return null;

  return (
    <Card className={`glassmorphism-card border-0 shadow-lg ${className}`} data-testid="bulk-approval-bar">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-windtre-orange/10 text-windtre-orange border-windtre-orange/20">
                <Users className="h-3 w-3 mr-1" />
                {selectedCount} selezionate
              </Badge>
              <span className="text-sm text-muted-foreground">
                Gestisci le richieste selezionate
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onClearSelection}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-clear-selection"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Approve All */}
            <Dialog open={showBulkApproval} onOpenChange={setShowBulkApproval}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700 text-white"
                  data-testid="button-bulk-approve"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approva Tutto ({selectedCount})
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg glassmorphism-card border-0" data-testid="dialog-bulk-approve">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle2 className="h-5 w-5" />
                    Approvazione Multipla
                  </DialogTitle>
                  <DialogDescription>
                    Stai per approvare <strong>{selectedCount} richieste</strong>. 
                    Questa azione non può essere annullata.
                  </DialogDescription>
                </DialogHeader>

                <Alert className="bg-green-50/50 border-green-200 dark:bg-green-900/20">
                  <Zap className="h-4 w-4" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    Tutte le richieste selezionate verranno approvate simultaneamente con il commento inserito.
                  </AlertDescription>
                </Alert>

                <Form {...bulkApproveForm}>
                  <form onSubmit={bulkApproveForm.handleSubmit(handleBulkApprove)} className="space-y-4">
                    <FormField
                      control={bulkApproveForm.control}
                      name="comment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Commento (opzionale)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={`Approvazione multipla di ${selectedCount} richieste effettuata dal manager`}
                              className="glassmorphism-card border-0 min-h-[80px]"
                              {...field} 
                              data-testid="textarea-bulk-approve-comment"
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
                        onClick={() => setShowBulkApproval(false)}
                        data-testid="button-cancel-bulk-approve"
                      >
                        Annulla
                      </Button>
                      <Button 
                        type="submit"
                        disabled={bulkApproveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                        data-testid="button-confirm-bulk-approve"
                      >
                        {bulkApproveMutation.isPending ? (
                          <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            Approvando...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approva Tutto ({selectedCount})
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Bulk Reject */}
            <Dialog open={showBulkRejection} onOpenChange={setShowBulkRejection}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  variant="destructive"
                  data-testid="button-bulk-reject-trigger"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rifiuta Tutto ({selectedCount})
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg glassmorphism-card border-0" data-testid="dialog-bulk-reject">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                    <XCircle className="h-5 w-5" />
                    Rifiuto Multiplo
                  </DialogTitle>
                  <DialogDescription>
                    Stai per rifiutare <strong>{selectedCount} richieste</strong>. 
                    Specifica il motivo del rifiuto.
                  </DialogDescription>
                </DialogHeader>

                <Alert variant="destructive" className="bg-red-50/50 dark:bg-red-900/20">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Il motivo del rifiuto verrà applicato a tutte le richieste selezionate. 
                    Assicurati che sia appropriato per tutte.
                  </AlertDescription>
                </Alert>

                <Form {...bulkRejectForm}>
                  <form onSubmit={bulkRejectForm.handleSubmit(handleBulkReject)} className="space-y-4">
                    <FormField
                      control={bulkRejectForm.control}
                      name="reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Motivo del rifiuto *</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Specifica il motivo del rifiuto per tutte le richieste selezionate..."
                              className="glassmorphism-card border-0 min-h-[100px]"
                              {...field} 
                              data-testid="textarea-bulk-reject-reason"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={bulkRejectForm.control}
                      name="comment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Commento aggiuntivo (opzionale)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Suggerimenti per migliorare le richieste..."
                              className="glassmorphism-card border-0 min-h-[80px]"
                              {...field} 
                              data-testid="textarea-bulk-reject-comment"
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
                        onClick={() => setShowBulkRejection(false)}
                        data-testid="button-cancel-bulk-reject"
                      >
                        Annulla
                      </Button>
                      <Button 
                        type="submit"
                        variant="destructive"
                        disabled={bulkRejectMutation.isPending}
                        data-testid="button-confirm-bulk-reject"
                      >
                        {bulkRejectMutation.isPending ? (
                          <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            Rifiutando...
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Rifiuta Tutto ({selectedCount})
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Advanced Actions Dropdown */}
            <Button 
              variant="outline" 
              size="sm"
              className="glassmorphism-card border-0"
              data-testid="button-bulk-advanced"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Azioni Avanzate
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}