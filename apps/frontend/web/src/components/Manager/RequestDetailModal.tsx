import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, Calendar, Clock, FileText, MessageSquare, Activity, 
  CheckCircle, XCircle, AlertTriangle, Download, Eye,
  Paperclip, History, Info
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  useHRRequest, 
  useHRRequestComments,
  useHRRequestHistory,
  HR_REQUEST_TYPES,
  HR_REQUEST_PRIORITY_LABELS,
  HR_REQUEST_STATUS_LABELS
} from '@/hooks/useHRRequests';

interface RequestDetailModalProps {
  requestId: string;
  open: boolean;
  onClose: () => void;
  className?: string;
}

// Status color mapping
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300';
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300';
    default:
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300';
  }
};

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

export default function RequestDetailModal({ requestId, open, onClose, className }: RequestDetailModalProps) {
  // Data queries
  const { data: request, isLoading: requestLoading, error: requestError } = useHRRequest(requestId);
  const { data: commentsData, isLoading: commentsLoading } = useHRRequestComments(requestId);
  const { data: historyData, isLoading: historyLoading } = useHRRequestHistory(requestId);

  const comments = commentsData?.comments || [];
  const history = historyData?.history || [];

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy HH:mm', { locale: it });
    } catch {
      return '-';
    }
  };

  const formatDateOnly = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: it });
    } catch {
      return '-';
    }
  };

  if (requestError) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl glassmorphism-card border-0">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Errore nel caricamento dei dettagli della richiesta: {requestError.message}
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] glassmorphism-card border-0" data-testid="modal-request-details">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-windtre-orange" />
            Dettagli Richiesta HR
          </DialogTitle>
          <DialogDescription>
            Visualizza tutti i dettagli, commenti e storico della richiesta
          </DialogDescription>
        </DialogHeader>

        {requestLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : request ? (
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3 glassmorphism-card">
              <TabsTrigger 
                value="details" 
                className="data-[state=active]:bg-windtre-orange data-[state=active]:text-white"
              >
                <Info className="h-4 w-4 mr-2" />
                Dettagli
              </TabsTrigger>
              <TabsTrigger 
                value="comments"
                className="data-[state=active]:bg-windtre-purple data-[state=active]:text-white"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Commenti ({comments.length})
              </TabsTrigger>
              <TabsTrigger 
                value="history"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                <History className="h-4 w-4 mr-2" />
                Storico ({history.length})
              </TabsTrigger>
            </TabsList>

            {/* Request Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-6 pr-4">
                  {/* Basic Information */}
                  <Card className="glassmorphism-card border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          Informazioni Generali
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(request.status)}>
                            {HR_REQUEST_STATUS_LABELS[request.status as keyof typeof HR_REQUEST_STATUS_LABELS]}
                          </Badge>
                          <Badge className={getPriorityColor(request.priority)}>
                            {HR_REQUEST_PRIORITY_LABELS[request.priority as keyof typeof HR_REQUEST_PRIORITY_LABELS]}
                          </Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">Richiedente</dt>
                          <dd className="text-sm font-medium">
                            {request.requester ? 
                              `${request.requester.firstName} ${request.requester.lastName}` : 
                              'N/A'
                            }
                          </dd>
                          {request.requester?.email && (
                            <dd className="text-xs text-muted-foreground">{request.requester.email}</dd>
                          )}
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">Tipo Richiesta</dt>
                          <dd className="text-sm">
                            {HR_REQUEST_TYPES[request.type as keyof typeof HR_REQUEST_TYPES]}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">Data Creazione</dt>
                          <dd className="text-sm">{formatDate(request.createdAt)}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">Ultima Modifica</dt>
                          <dd className="text-sm">{formatDate(request.updatedAt)}</dd>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground mb-2">Titolo</dt>
                        <dd className="text-sm font-medium">{request.title}</dd>
                      </div>
                      
                      {request.description && (
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground mb-2">Descrizione</dt>
                          <dd className="text-sm bg-muted/50 p-3 rounded-lg">{request.description}</dd>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Date Information */}
                  {(request.startDate || request.endDate) && (
                    <Card className="glassmorphism-card border-0">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          Date
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          {request.startDate && (
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">Data Inizio</dt>
                              <dd className="text-sm font-medium">{formatDateOnly(request.startDate)}</dd>
                            </div>
                          )}
                          {request.endDate && (
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">Data Fine</dt>
                              <dd className="text-sm font-medium">{formatDateOnly(request.endDate)}</dd>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Additional Data */}
                  {request.payload && Object.keys(request.payload).length > 0 && (
                    <Card className="glassmorphism-card border-0">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Informazioni Aggiuntive
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {Object.entries(request.payload).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <dt className="text-sm font-medium text-muted-foreground capitalize">
                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                              </dt>
                              <dd className="text-sm font-medium">
                                {typeof value === 'string' || typeof value === 'number' ? 
                                  String(value) : 
                                  JSON.stringify(value)
                                }
                              </dd>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Attachments */}
                  {request.attachments && request.attachments.length > 0 && (
                    <Card className="glassmorphism-card border-0">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Paperclip className="h-5 w-5" />
                          Allegati ({request.attachments.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {request.attachments.map((attachment, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{attachment}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4 mr-1" />
                                  Visualizza
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Download className="h-4 w-4 mr-1" />
                                  Scarica
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments" className="space-y-4">
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 pr-4">
                  {commentsLoading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <Card key={index} className="glassmorphism-card border-0">
                        <CardContent className="pt-4">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-16 w-full" />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : comments.length === 0 ? (
                    <Card className="glassmorphism-card border-0">
                      <CardContent className="pt-6 text-center">
                        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Nessun commento disponibile</p>
                      </CardContent>
                    </Card>
                  ) : (
                    comments.map((comment) => (
                      <Card key={comment.id} className="glassmorphism-card border-0">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-windtre-orange to-windtre-purple flex items-center justify-center">
                                <span className="text-xs font-medium text-white">
                                  {comment.author?.firstName?.charAt(0)}{comment.author?.lastName?.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {comment.author?.firstName} {comment.author?.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(comment.createdAt)}
                                </p>
                              </div>
                            </div>
                            {comment.isInternal && (
                              <Badge variant="outline" className="text-xs">
                                Interno
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm bg-muted/30 p-3 rounded-lg">
                            {comment.comment}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 pr-4">
                  {historyLoading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <Card key={index} className="glassmorphism-card border-0">
                        <CardContent className="pt-4">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-16 w-full" />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : history.length === 0 ? (
                    <Card className="glassmorphism-card border-0">
                      <CardContent className="pt-6 text-center">
                        <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Nessun evento nello storico</p>
                      </CardContent>
                    </Card>
                  ) : (
                    history.map((event) => {
                      const statusIcon = event.toStatus === 'approved' ? CheckCircle : 
                                        event.toStatus === 'rejected' ? XCircle : 
                                        event.toStatus === 'pending' ? Clock : Activity;
                      const IconComponent = statusIcon;
                      
                      return (
                        <Card key={event.id} className="glassmorphism-card border-0">
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-3">
                              <div className="bg-muted/50 p-2 rounded-full">
                                <IconComponent className="h-4 w-4" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-sm font-medium">
                                    Cambiamento stato: {event.fromStatus || 'N/A'} → {event.toStatus}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDate(event.createdAt)}
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">
                                  da {event.changer?.firstName} {event.changer?.lastName}
                                </p>
                                {event.reason && (
                                  <div className="text-sm bg-muted/30 p-2 rounded">
                                    {event.reason}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Richiesta non trovata</p>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} data-testid="button-close-modal">
            Chiudi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}