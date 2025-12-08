// Approval Queue - Dashboard for managers to approve/reject leave requests
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Clock, AlertCircle, User, Calendar, MessageSquare } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useApprovalQueue, useApproveLeaveRequest, useRejectLeaveRequest } from '@/hooks/useLeaveManagement';
import { leaveService } from '@/services/leaveService';

interface ApprovalQueueProps {
  compact?: boolean;
  className?: string;
}

export function ApprovalQueue({ compact = false, className }: ApprovalQueueProps) {
  const { requests, pendingCount, urgentCount, isLoading } = useApprovalQueue();
  const approveRequest = useApproveLeaveRequest();
  const rejectRequest = useRejectLeaveRequest();
  
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [comments, setComments] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  
  // Handle quick approve
  const handleQuickApprove = (request: any) => {
    setSelectedRequest(request);
    setActionType('approve');
  };
  
  // Handle quick reject
  const handleQuickReject = (request: any) => {
    setSelectedRequest(request);
    setActionType('reject');
  };
  
  // Confirm approval
  const confirmApproval = () => {
    if (!selectedRequest) return;
    
    approveRequest.mutate({
      id: selectedRequest.id,
      comments: comments
    });
    
    setSelectedRequest(null);
    setActionType(null);
    setComments('');
  };
  
  // Confirm rejection
  const confirmRejection = () => {
    if (!selectedRequest || !rejectReason) return;
    
    rejectRequest.mutate({
      id: selectedRequest.id,
      reason: rejectReason
    });
    
    setSelectedRequest(null);
    setActionType(null);
    setRejectReason('');
  };
  
  // Calculate urgency
  const getUrgency = (request: any) => {
    const daysAgo = differenceInDays(new Date(), new Date(request.submittedAt || request.createdAt));
    const daysUntilStart = differenceInDays(new Date(request.startDate), new Date());
    
    if (daysAgo > 3 || daysUntilStart < 7) {
      return 'urgent';
    } else if (daysAgo > 2 || daysUntilStart < 14) {
      return 'medium';
    }
    return 'normal';
  };
  
  if (isLoading) {
    return (
      <Card className={cn("backdrop-blur-sm bg-white/90", className)}>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (compact) {
    return (
      <div className="space-y-2">
        {requests.length === 0 ? (
          <div className="text-center py-4">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Nessuna richiesta in attesa</p>
          </div>
        ) : (
          <>
            {requests.slice(0, 3).map((request) => {
              const urgency = getUrgency(request);
              const typeConfig = leaveService.getLeaveTypeConfig(request.leaveType);
              
              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "p-3 rounded-lg border",
                    urgency === 'urgent' && "border-red-200 bg-red-50",
                    urgency === 'medium' && "border-yellow-200 bg-yellow-50",
                    urgency === 'normal' && "border-gray-200 bg-gray-50"
                  )}
                  data-testid={`approval-item-${request.id}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{typeConfig.icon}</span>
                      <span className="font-medium text-sm">{request.userName}</span>
                    </div>
                    {urgency === 'urgent' && (
                      <Badge variant="destructive" className="text-xs">
                        Urgente
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    {leaveService.formatDateRange(request.startDate, request.endDate)}
                    ({request.totalDays} giorni)
                  </p>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => handleQuickApprove(request)}
                      data-testid={`button-approve-${request.id}`}
                    >
                      Approva
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs text-red-600"
                      onClick={() => handleQuickReject(request)}
                      data-testid={`button-reject-${request.id}`}
                    >
                      Rifiuta
                    </Button>
                  </div>
                </motion.div>
              );
            })}
            
            {requests.length > 3 && (
              <Button variant="link" className="w-full text-sm">
                Vedi tutte ({requests.length})
              </Button>
            )}
          </>
        )}
      </div>
    );
  }
  
  return (
    <>
      <Card className={cn("backdrop-blur-sm bg-white/90", className)}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span>Richieste da Approvare</span>
            </div>
            <div className="flex gap-2">
              {urgentCount > 0 && (
                <Badge variant="destructive">
                  {urgentCount} urgenti
                </Badge>
              )}
              <Badge variant="secondary">
                {pendingCount} totali
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-600">Tutte le richieste sono state processate</p>
              <p className="text-sm text-gray-500 mt-1">Ottimo lavoro!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => {
                const urgency = getUrgency(request);
                const typeConfig = leaveService.getLeaveTypeConfig(request.leaveType);
                
                return (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-4 rounded-lg border-2",
                      urgency === 'urgent' && "border-red-200 bg-red-50",
                      urgency === 'medium' && "border-yellow-200 bg-yellow-50",
                      urgency === 'normal' && "border-gray-200 bg-white"
                    )}
                    data-testid={`approval-card-${request.id}`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        {request.userAvatar ? (
                          <img
                            src={request.userAvatar}
                            alt={request.userName}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-6 w-6 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold">{request.userName}</h4>
                          <p className="text-sm text-gray-600">{request.storeName}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{typeConfig.icon}</span>
                        <Badge variant="outline">{typeConfig.label}</Badge>
                        {urgency === 'urgent' && (
                          <Badge variant="destructive">Urgente</Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Request Details */}
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          {leaveService.formatDateRange(request.startDate, request.endDate)}
                        </span>
                      </div>
                      <div className="text-sm">
                        <strong>{request.totalDays}</strong> giorni lavorativi
                      </div>
                    </div>
                    
                    {/* Notes */}
                    {request.notes && (
                      <div className="bg-white/50 rounded-lg p-3 mb-3">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 text-gray-500 mt-0.5" />
                          <p className="text-sm text-gray-700 flex-1">{request.notes}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Coverage */}
                    {request.coverageName && (
                      <div className="flex items-center gap-2 mb-3">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          Sostituto: <strong>{request.coverageName}</strong>
                        </span>
                      </div>
                    )}
                    
                    {/* Metadata */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-500">
                        Richiesto {format(new Date(request.submittedAt || request.createdAt), 'dd MMM yyyy', { locale: it })}
                      </span>
                      {request.submittedAt && (
                        <span className="text-xs text-gray-500">
                          In attesa da {differenceInDays(new Date(), new Date(request.submittedAt))} giorni
                        </span>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleQuickApprove(request)}
                        data-testid={`button-approve-full-${request.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approva
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => handleQuickReject(request)}
                        data-testid={`button-reject-full-${request.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Rifiuta
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Approval Dialog */}
      <Dialog open={actionType === 'approve'} onOpenChange={() => setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma Approvazione</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Stai per approvare la richiesta di {selectedRequest?.userName} per{' '}
                {selectedRequest?.totalDays} giorni di{' '}
                {selectedRequest && leaveService.getLeaveTypeConfig(selectedRequest.leaveType).label}.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Commenti (opzionali)</label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Aggiungi eventuali commenti..."
                rows={3}
                data-testid="textarea-approve-comments"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)}>
              Annulla
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={confirmApproval}
              disabled={approveRequest.isPending}
              data-testid="button-confirm-approve"
            >
              {approveRequest.isPending ? 'Approvazione...' : 'Conferma Approvazione'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Rejection Dialog */}
      <Dialog open={actionType === 'reject'} onOpenChange={() => setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rifiuta Richiesta</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Stai per rifiutare la richiesta di {selectedRequest?.userName}.
                Il dipendente riceverà una notifica con la motivazione.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivazione *</label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Inserisci la motivazione del rifiuto..."
                rows={3}
                required
                data-testid="textarea-reject-reason"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRejection}
              disabled={!rejectReason || rejectRequest.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectRequest.isPending ? 'Rifiuto...' : 'Conferma Rifiuto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}