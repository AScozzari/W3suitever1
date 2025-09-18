import { useState } from 'react';
import { useHRRequest, useHRRequestComments, useHRRequestHistory, useAddHRRequestComment, useCancelHRRequest } from '@/hooks/useHRRequests';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, Clock, CheckCircle, XCircle, AlertTriangle, MessageSquare, 
  History, Paperclip, User, Calendar, Send, X, Download, AlertCircle,
  Umbrella, Heart, Shield, Baby, Users, Activity, Home, Building, Globe, Briefcase
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Request type icons
const TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  vacation: Umbrella,
  sick: Heart,
  fmla: Shield,
  parental: Baby,
  bereavement: Heart,
  personal: User,
  religious: Globe,
  military: Shield,
  shift_swap: Users,
  time_change: Clock,
  flex_hours: Activity,
  wfh: Home,
  overtime: Clock,
  jury_duty: Building,
  medical_appt: Heart,
  emergency: AlertTriangle
};

// Status styling
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'approved':
      return { variant: 'success' as const, color: 'text-green-700', icon: CheckCircle };
    case 'pending':
      return { variant: 'warning' as const, color: 'text-orange-700', icon: Clock };
    case 'rejected':
      return { variant: 'destructive' as const, color: 'text-red-700', icon: XCircle };
    case 'cancelled':
      return { variant: 'secondary' as const, color: 'text-gray-700', icon: X };
    case 'draft':
      return { variant: 'outline' as const, color: 'text-gray-700', icon: FileText };
    default:
      return { variant: 'secondary' as const, color: 'text-gray-700', icon: FileText };
  }
};

// Comment form schema
const commentSchema = z.object({
  comment: z.string().min(1, 'Il commento non può essere vuoto').max(2000, 'Massimo 2000 caratteri'),
  isInternal: z.boolean().optional()
});

type CommentFormData = z.infer<typeof commentSchema>;

interface HRRequestDetailsProps {
  requestId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function HRRequestDetails({ requestId, isOpen, onClose, onUpdate }: HRRequestDetailsProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Data queries
  const { data: request, isLoading: requestLoading, error: requestError } = useHRRequest(requestId);
  const { data: comments = [], isLoading: commentsLoading } = useHRRequestComments(requestId);
  const { data: history = [], isLoading: historyLoading } = useHRRequestHistory(requestId);

  // Mutations
  const addCommentMutation = useAddHRRequestComment();
  const cancelMutation = useCancelHRRequest();

  // Comment form
  const commentForm = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      comment: '',
      isInternal: false
    }
  });

  const handleAddComment = async (data: CommentFormData) => {
    try {
      await addCommentMutation.mutateAsync({
        requestId,
        comment: data.comment,
        isInternal: data.isInternal
      });
      commentForm.reset();
      onUpdate();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleCancelRequest = async () => {
    try {
      await cancelMutation.mutateAsync({
        requestId,
        reason: 'Richiesta annullata dall\'utente'
      });
      setShowCancelDialog(false);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error cancelling request:', error);
    }
  };

  if (!isOpen) return null;

  if (requestLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <Skeleton className="h-8 w-64" />
          </DialogHeader>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (requestError || !request) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Errore</DialogTitle>
          </DialogHeader>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Impossibile caricare i dettagli della richiesta. 
              <Button variant="link" onClick={onClose} className="p-0 h-auto ml-2">
                Chiudi
              </Button>
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  const IconComponent = TYPE_ICONS[request.type] || FileText;
  const statusConfig = getStatusConfig(request.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
              <IconComponent className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{request.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={statusConfig.variant}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </Badge>
                <span className="text-sm text-gray-500">
                  ID: {request.id.slice(0, 8)}
                </span>
              </div>
            </div>
            {request.status === 'pending' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelDialog(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                data-testid="button-cancel-request"
              >
                <X className="h-4 w-4 mr-1" />
                Annulla
              </Button>
            )}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Dettagli
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Commenti ({comments.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Cronologia
            </TabsTrigger>
          </TabsList>

          {/* Request Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informazioni Richiesta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Categoria</Label>
                    <p className="text-sm mt-1">{request.category}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Tipo</Label>
                    <p className="text-sm mt-1">{request.type}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Priorità</Label>
                    <p className={`text-sm mt-1 font-medium ${
                      request.priority === 'urgent' ? 'text-red-600' :
                      request.priority === 'high' ? 'text-orange-600' :
                      'text-green-600'
                    }`}>
                      {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Data Creazione</Label>
                    <p className="text-sm mt-1">
                      {format(parseISO(request.createdAt), 'PPP', { locale: it })}
                    </p>
                  </div>
                </div>

                {(request.startDate || request.endDate) && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Periodo</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <p className="text-sm">
                        {request.startDate && format(parseISO(request.startDate), 'PPP', { locale: it })}
                        {request.startDate && request.endDate && ' - '}
                        {request.endDate && format(parseISO(request.endDate), 'PPP', { locale: it })}
                      </p>
                    </div>
                  </div>
                )}

                {request.description && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Descrizione</Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{request.description}</p>
                  </div>
                )}

                {/* Additional payload fields */}
                {request.payload && Object.keys(request.payload).length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Dettagli Aggiuntivi</Label>
                    <div className="mt-2 space-y-2">
                      {Object.entries(request.payload as Record<string, any>).map(([key, value]) => (
                        value && (
                          <div key={key} className="text-sm">
                            <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}: </span>
                            <span>{String(value)}</span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {request.attachments && request.attachments.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Allegati</Label>
                    <div className="mt-2 space-y-2">
                      {request.attachments.map((attachment: string, index: number) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <Paperclip className="h-4 w-4 text-gray-400" />
                          <span className="text-sm flex-1">{attachment}</span>
                          <Button variant="ghost" size="sm" data-testid={`button-download-${index}`}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="space-y-4">
            {/* Add Comment Form */}
            <Card>
              <CardHeader>
                <CardTitle>Aggiungi Commento</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...commentForm}>
                  <form onSubmit={commentForm.handleSubmit(handleAddComment)} className="space-y-4">
                    <FormField
                      control={commentForm.control}
                      name="comment"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="Scrivi un commento..."
                              className="min-h-[100px]"
                              {...field}
                              data-testid="textarea-comment"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      disabled={addCommentMutation.isPending}
                      data-testid="button-add-comment"
                    >
                      {addCommentMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Invio...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Aggiungi Commento
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Comments List */}
            <Card>
              <CardHeader>
                <CardTitle>Commenti ({comments.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {commentsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex space-x-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-16 w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nessun commento ancora</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-96">
                    <div className="space-y-4">
                      {comments.map((comment: any, index: number) => (
                        <div key={comment.id} className="flex space-x-3">
                          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                            <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">
                                {comment.author?.firstName} {comment.author?.lastName}
                              </p>
                              {comment.isInternal && (
                                <Badge variant="secondary" className="text-xs">Interno</Badge>
                              )}
                              <p className="text-xs text-gray-500">
                                {format(parseISO(comment.createdAt), 'PPp', { locale: it })}
                              </p>
                            </div>
                            <p className="text-sm mt-1 whitespace-pre-wrap">{comment.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cronologia Status</CardTitle>
                <CardDescription>Tracciamento delle modifiche di stato</CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex space-x-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nessuna cronologia disponibile</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((item: any, index: number) => {
                      const isLast = index === history.length - 1;
                      const statusConfig = getStatusConfig(item.toStatus);
                      const StatusIcon = statusConfig.icon;
                      
                      return (
                        <div key={item.id} className="flex space-x-3">
                          <div className="flex flex-col items-center">
                            <div className={`p-1.5 rounded-full ${statusConfig.color} bg-gray-100`}>
                              <StatusIcon className="h-4 w-4" />
                            </div>
                            {!isLast && <div className="w-px h-8 bg-gray-200 mt-2" />}
                          </div>
                          <div className="flex-1 min-w-0 pb-4">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">
                                {item.fromStatus ? `${item.fromStatus} → ${item.toStatus}` : `Stato: ${item.toStatus}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {format(parseISO(item.createdAt), 'PPp', { locale: it })}
                              </p>
                            </div>
                            {item.changer && (
                              <p className="text-xs text-gray-500 mt-1">
                                da {item.changer.firstName} {item.changer.lastName}
                              </p>
                            )}
                            {item.reason && (
                              <p className="text-sm text-gray-600 mt-1">{item.reason}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Cancel Confirmation Dialog */}
        {showCancelDialog && (
          <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Conferma Annullamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Sei sicuro di voler annullare questa richiesta? Questa azione non può essere annullata.
                  </AlertDescription>
                </Alert>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                    Mantieni
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleCancelRequest}
                    disabled={cancelMutation.isPending}
                  >
                    {cancelMutation.isPending ? 'Annullamento...' : 'Annulla Richiesta'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Helper Label component (if not available)
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}