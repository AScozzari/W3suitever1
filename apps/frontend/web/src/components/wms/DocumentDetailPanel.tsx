import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  FileText,
  X,
  CheckCircle,
  Clock,
  Archive,
  AlertCircle,
  Package,
  Truck,
  ClipboardList,
  FileEdit,
  Paperclip,
  Download,
  Upload,
  User,
  Calendar,
  Hash,
  Building2,
  MessageSquare,
  MoreHorizontal,
  Printer,
  Send,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface DocumentPhase {
  id: string;
  phaseName: string;
  phaseStatus: 'pending' | 'completed' | 'skipped' | 'failed';
  completedAt: string | null;
  completedByName: string | null;
  phaseOrder: number;
  notes: string | null;
}

interface DocumentItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  receivedQuantity: number;
  unitPrice: string | null;
  totalPrice: string | null;
  itemStatus: string;
  notes: string | null;
}

interface DocumentAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  attachmentType: string | null;
  uploadedAt: string;
}

interface DocumentDetail {
  id: string;
  documentType: 'order' | 'ddt' | 'adjustment_report';
  documentNumber: string;
  documentDate: string;
  documentDirection: 'active' | 'passive';
  status: 'draft' | 'pending_approval' | 'confirmed' | 'archived' | 'cancelled';
  ddtReason: string | null;
  counterpartyType: string | null;
  totalItems: number;
  totalQuantity: number;
  totalValue: string | null;
  notes: string | null;
  internalNotes: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  supplierName: string | null;
  storeName: string | null;
  items: DocumentItem[];
  phases: DocumentPhase[];
  attachments: DocumentAttachment[];
}

const DOCUMENT_TYPE_CONFIG: Record<string, { 
  label: string; 
  icon: typeof FileText; 
  color: string;
  bgColor: string;
}> = {
  order: { label: 'Ordine', icon: ClipboardList, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  ddt: { label: 'DDT', icon: Truck, color: 'text-green-600', bgColor: 'bg-green-100' },
  adjustment_report: { label: 'Rettifica', icon: FileEdit, color: 'text-purple-600', bgColor: 'bg-purple-100' }
};

const STATUS_CONFIG: Record<string, { 
  label: string; 
  color: string; 
  bgColor: string;
  icon: typeof Clock 
}> = {
  draft: { label: 'Bozza', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: FileEdit },
  pending_approval: { label: 'In Attesa Approvazione', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: Clock },
  confirmed: { label: 'Confermato', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle },
  archived: { label: 'Archiviato', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Archive },
  cancelled: { label: 'Annullato', color: 'text-red-600', bgColor: 'bg-red-100', icon: X }
};

const DDT_REASON_LABELS: Record<string, string> = {
  sale: 'Vendita',
  purchase: 'Acquisto',
  service_send: 'Invio Assistenza',
  service_return: 'Ritorno Assistenza',
  doa_return: 'Reso DOA',
  internal_transfer: 'Trasferimento',
  supplier_return: 'Reso Fornitore',
  customer_return: 'Reso Cliente',
  loan: 'Comodato',
  other: 'Altro'
};

interface DocumentDetailPanelProps {
  documentId: string | null;
  onClose: () => void;
}

export function DocumentDetailPanel({ documentId, onClose }: DocumentDetailPanelProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'items' | 'phases' | 'attachments'>('items');

  const { data: document, isLoading, error } = useQuery<DocumentDetail>({
    queryKey: ['/api/wms/documents', documentId],
    enabled: !!documentId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: string; reason?: string }) => {
      return apiRequest(`/api/wms/documents/${documentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wms/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wms/documents', documentId] });
      queryClient.invalidateQueries({ queryKey: ['/api/wms/documents/stats'] });
      toast({ title: 'Stato aggiornato' });
    },
    onError: () => {
      toast({ title: 'Errore', description: 'Impossibile aggiornare lo stato', variant: 'destructive' });
    }
  });

  if (!documentId) return null;

  const typeConfig = document ? DOCUMENT_TYPE_CONFIG[document.documentType] : null;
  const statusConfig = document ? STATUS_CONFIG[document.status] : null;
  const TypeIcon = typeConfig?.icon || FileText;
  const StatusIcon = statusConfig?.icon || Clock;

  return (
    <Sheet open={!!documentId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[600px] sm:w-[700px] sm:max-w-none p-0 flex flex-col">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-3" />
            <p className="text-red-600 font-medium">Errore nel caricamento</p>
            <Button variant="outline" onClick={onClose} className="mt-4">
              Chiudi
            </Button>
          </div>
        ) : document ? (
          <>
            <SheetHeader className="p-6 pb-4 border-b bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={cn("p-3 rounded-xl", typeConfig?.bgColor)}>
                    <TypeIcon className={cn("h-6 w-6", typeConfig?.color)} />
                  </div>
                  <div>
                    <SheetTitle className="text-xl font-bold flex items-center gap-2">
                      {document.documentNumber}
                      <Badge className={cn("ml-2", statusConfig?.bgColor, statusConfig?.color, "border-0")}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig?.label}
                      </Badge>
                    </SheetTitle>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(document.documentDate), 'dd MMMM yyyy', { locale: it })}
                      </span>
                      <span className="flex items-center gap-1">
                        {document.documentDirection === 'active' ? (
                          <Upload className="h-4 w-4 text-purple-500" />
                        ) : (
                          <Download className="h-4 w-4 text-green-500" />
                        )}
                        {document.documentDirection === 'active' ? 'Attivo' : 'Passivo'}
                      </span>
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Printer className="h-4 w-4 mr-2" />
                      Stampa
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Send className="h-4 w-4 mr-2" />
                      Invia via Email
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {document.status === 'draft' && (
                      <DropdownMenuItem 
                        onClick={() => updateStatusMutation.mutate({ status: 'pending_approval' })}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Invia per Approvazione
                      </DropdownMenuItem>
                    )}
                    {document.status === 'pending_approval' && (
                      <>
                        <DropdownMenuItem 
                          onClick={() => updateStatusMutation.mutate({ status: 'confirmed' })}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approva
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => updateStatusMutation.mutate({ status: 'cancelled', reason: 'Rifiutato' })}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Rifiuta
                        </DropdownMenuItem>
                      </>
                    )}
                    {document.status === 'confirmed' && (
                      <DropdownMenuItem 
                        onClick={() => updateStatusMutation.mutate({ status: 'archived' })}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archivia
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100">
                          <Hash className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Tipo</p>
                          <p className="font-medium">{typeConfig?.label}</p>
                          {document.ddtReason && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {DDT_REASON_LABELS[document.ddtReason]}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-100">
                          <Package className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Prodotti</p>
                          <p className="font-medium">{document.totalItems} articoli</p>
                          <p className="text-xs text-gray-500">{document.totalQuantity} pezzi totali</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {document.supplierName && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-orange-100">
                            <Building2 className="h-5 w-5 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Fornitore</p>
                            <p className="font-medium">{document.supplierName}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {document.totalValue && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-purple-100">
                            <FileText className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Valore</p>
                            <p className="font-medium">
                              € {parseFloat(document.totalValue).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {document.notes && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-gray-400" />
                        Note
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">{document.notes}</p>
                    </CardContent>
                  </Card>
                )}

                <div className="flex border-b">
                  {(['items', 'phases', 'attachments'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                        activeTab === tab 
                          ? "border-orange-500 text-orange-600" 
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      )}
                    >
                      {tab === 'items' && `Prodotti (${document.items.length})`}
                      {tab === 'phases' && `Fasi (${document.phases.length})`}
                      {tab === 'attachments' && `Allegati (${document.attachments.length})`}
                    </button>
                  ))}
                </div>

                {activeTab === 'items' && (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>Prodotto</TableHead>
                          <TableHead className="text-center">Qtà</TableHead>
                          <TableHead className="text-center">Ricevuti</TableHead>
                          <TableHead className="text-right">Prezzo</TableHead>
                          <TableHead>Stato</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {document.items.length > 0 ? (
                          document.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">{item.productName}</p>
                                  <p className="text-xs text-gray-500">{item.productSku}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-medium">
                                {item.quantity}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={cn(
                                  "font-medium",
                                  item.receivedQuantity === item.quantity ? "text-green-600" :
                                  item.receivedQuantity > 0 ? "text-yellow-600" : "text-gray-400"
                                )}>
                                  {item.receivedQuantity}
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {item.unitPrice ? `€ ${parseFloat(item.unitPrice).toFixed(2)}` : '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {item.itemStatus === 'received' ? 'Ricevuto' :
                                   item.itemStatus === 'pending' ? 'In attesa' :
                                   item.itemStatus === 'rejected' ? 'Rifiutato' : item.itemStatus}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                              Nessun prodotto
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {activeTab === 'phases' && (
                  <div className="space-y-3">
                    {document.phases.length > 0 ? (
                      document.phases.map((phase, index) => (
                        <div 
                          key={phase.id} 
                          className={cn(
                            "flex items-start gap-4 p-4 rounded-lg border",
                            phase.phaseStatus === 'completed' ? "bg-green-50 border-green-200" :
                            phase.phaseStatus === 'pending' ? "bg-gray-50 border-gray-200" :
                            phase.phaseStatus === 'failed' ? "bg-red-50 border-red-200" : "bg-gray-50"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                            phase.phaseStatus === 'completed' ? "bg-green-500 text-white" :
                            phase.phaseStatus === 'pending' ? "bg-gray-300 text-gray-600" :
                            phase.phaseStatus === 'failed' ? "bg-red-500 text-white" : "bg-gray-300"
                          )}>
                            {phase.phaseStatus === 'completed' ? <CheckCircle className="h-4 w-4" /> : index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{phase.phaseName}</p>
                            {phase.completedAt && (
                              <p className="text-xs text-gray-500 mt-1">
                                Completata {formatDistanceToNow(new Date(phase.completedAt), { addSuffix: true, locale: it })}
                                {phase.completedByName && ` da ${phase.completedByName}`}
                              </p>
                            )}
                            {phase.notes && (
                              <p className="text-sm text-gray-600 mt-2">{phase.notes}</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nessuna fase registrata</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'attachments' && (
                  <div className="space-y-2">
                    {document.attachments.length > 0 ? (
                      document.attachments.map((att) => (
                        <div 
                          key={att.id}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                        >
                          <div className="p-2 rounded-lg bg-blue-100">
                            <Paperclip className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{att.fileName}</p>
                            <p className="text-xs text-gray-500">
                              {Math.round(att.fileSize / 1024)} KB • 
                              {format(new Date(att.uploadedAt), ' dd/MM/yyyy HH:mm', { locale: it })}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nessun allegato</p>
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                <div className="text-xs text-gray-400 space-y-1">
                  <p className="flex items-center gap-2">
                    <User className="h-3 w-3" />
                    Creato da {document.createdBy} il {format(new Date(document.createdAt), 'dd/MM/yyyy HH:mm', { locale: it })}
                  </p>
                  {document.approvedBy && document.approvedAt && (
                    <p className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3" />
                      Approvato da {document.approvedBy} il {format(new Date(document.approvedAt), 'dd/MM/yyyy HH:mm', { locale: it })}
                    </p>
                  )}
                </div>
              </div>
            </ScrollArea>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
