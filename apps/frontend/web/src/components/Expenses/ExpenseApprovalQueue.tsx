// Expense Approval Queue Component
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useExpenseApprovals } from '@/hooks/useExpenseManagement';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Check,
  X,
  Clock,
  Euro,
  Calendar,
  User,
  FileText,
  AlertCircle,
  ChevronRight,
  MessageSquare
} from 'lucide-react';

interface ExpenseApprovalQueueProps {
  showActions?: boolean;
}

export default function ExpenseApprovalQueue({ showActions = true }: ExpenseApprovalQueueProps) {
  const { toast } = useToast();
  const { pendingApprovals, isLoading, approveReport, rejectReport } = useExpenseApprovals();
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (pendingApprovals.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Nessuna nota spese in attesa di approvazione
        </AlertDescription>
      </Alert>
    );
  }

  const handleApprove = async (report: any) => {
    setProcessingId(report.id);
    try {
      await approveReport.mutateAsync({
        id: report.id,
        comments: 'Approvata'
      });
      toast({
        title: 'Nota spese approvata',
        description: `La nota spese di ${report.userName} è stata approvata`,
      });
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile approvare la nota spese',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedReport || !rejectReason.trim()) {
      toast({
        title: 'Errore',
        description: 'Inserisci una motivazione per il rifiuto',
        variant: 'destructive',
      });
      return;
    }

    setProcessingId(selectedReport.id);
    try {
      await rejectReport.mutateAsync({
        id: selectedReport.id,
        reason: rejectReason
      });
      toast({
        title: 'Nota spese rifiutata',
        description: `La nota spese di ${selectedReport.userName} è stata rifiutata`,
      });
      setShowRejectDialog(false);
      setRejectReason('');
      setSelectedReport(null);
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile rifiutare la nota spese',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getPriorityColor = (amount: number) => {
    if (amount > 1000) return 'text-red-600';
    if (amount > 500) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getDaysWaiting = (submittedAt: Date) => {
    const days = Math.floor((new Date().getTime() - new Date(submittedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Oggi';
    if (days === 1) return 'Ieri';
    return `${days} giorni fa`;
  };

  return (
    <div className="space-y-4" data-testid="expense-approval-queue">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Note Spese da Approvare</h3>
          <p className="text-sm text-muted-foreground">
            {pendingApprovals.length} {pendingApprovals.length === 1 ? 'richiesta' : 'richieste'} in attesa
          </p>
        </div>
        <Badge variant="warning" className="text-lg px-3 py-1">
          <Clock className="h-4 w-4 mr-1" />
          In Attesa
        </Badge>
      </div>

      <div className="space-y-4">
        {pendingApprovals.map((report) => (
          <Card key={report.id} className={cn(
            "transition-all hover:shadow-md",
            processingId === report.id && "opacity-50"
          )}>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={report.userAvatar} />
                    <AvatarFallback>
                      {report.userName?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{report.title}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{report.userName}</span>
                      <span>•</span>
                      <Calendar className="h-3 w-3" />
                      <span>{getDaysWaiting(report.submittedAt || new Date())}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn("text-2xl font-bold", getPriorityColor(report.totalAmount))}>
                    € {report.totalAmount?.toFixed(2) || '0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {report.itemsCount || 0} voci
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Period */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Periodo</span>
                  <span>
                    {format(new Date(report.startDate || report.periodStart || new Date()), 'dd/MM/yyyy')} - 
                    {format(new Date(report.endDate || report.periodEnd || new Date()), 'dd/MM/yyyy')}
                  </span>
                </div>

                {/* Categories Breakdown */}
                {report.categories && report.categories.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Categorie</p>
                    <div className="flex flex-wrap gap-2">
                      {report.categories.map((cat: any) => (
                        <Badge key={cat.name} variant="secondary">
                          {cat.name}: € {cat.amount.toFixed(2)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {report.description && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Descrizione</p>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                  </div>
                )}

                {/* Notes */}
                {report.notes && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                    <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Note</p>
                      <p className="text-sm text-muted-foreground">{report.notes}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {showActions && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // View details
                        console.log('View details', report);
                      }}
                      data-testid={`button-view-${report.id}`}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Dettagli
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setSelectedReport(report);
                          setShowRejectDialog(true);
                        }}
                        disabled={processingId === report.id}
                        data-testid={`button-reject-${report.id}`}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Rifiuta
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(report)}
                        disabled={processingId === report.id}
                        data-testid={`button-approve-${report.id}`}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approva
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rifiuta Nota Spese</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedReport && (
              <Alert>
                <AlertDescription>
                  Stai per rifiutare la nota spese di <strong>{selectedReport.userName}</strong> 
                  per un importo di <strong>€ {selectedReport.totalAmount?.toFixed(2)}</strong>.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Motivazione del rifiuto <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Inserisci il motivo del rifiuto..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                data-testid="textarea-reject-reason"
              />
              <p className="text-xs text-muted-foreground">
                La motivazione sarà visibile al dipendente
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectReason('');
                setSelectedReport(null);
              }}
              data-testid="button-cancel-reject"
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || processingId === selectedReport?.id}
              data-testid="button-confirm-reject"
            >
              Conferma Rifiuto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}