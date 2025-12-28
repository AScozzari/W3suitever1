import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  FileText,
  Download,
  Upload,
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Archive,
  FileEdit,
  Eye,
  MoreHorizontal,
  TrendingUp,
  Package,
  Truck,
  ClipboardList,
  Calendar,
  User,
  Paperclip,
  RefreshCw,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { CreateDocumentWizard } from './CreateDocumentWizard';
import { DocumentDetailPanel } from './DocumentDetailPanel';

interface DocumentStats {
  total: number;
  passive: number;
  active: number;
  pendingApproval: number;
  successRate: number;
}

interface TrendData {
  date: string;
  passive: number;
  active: number;
}

interface TimelineEvent {
  id: string;
  documentNumber: string;
  documentType: string;
  event: string;
  eventTime: string;
  createdBy: string | null;
}

interface WmsDocument {
  id: string;
  documentType: 'order' | 'ddt' | 'adjustment_report';
  documentNumber: string;
  documentDate: string;
  documentDirection: 'active' | 'passive';
  status: 'draft' | 'pending_approval' | 'confirmed' | 'archived' | 'cancelled';
  ddtReason: string | null;
  totalItems: number;
  totalQuantity: number;
  totalValue: string | null;
  notes: string | null;
  createdAt: string;
  createdBy: string;
  supplierName: string | null;
  storeName: string | null;
}

interface DocumentPhase {
  id: string;
  phaseName: string;
  phaseStatus: 'pending' | 'completed' | 'skipped' | 'failed';
  completedAt: string | null;
  completedByName: string | null;
  phaseOrder: number;
}

interface DocumentDetails extends WmsDocument {
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    receivedQuantity: number;
    productName: string;
    productSku: string;
  }>;
  phases: DocumentPhase[];
  attachments: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }>;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  order: 'Ordine',
  ddt: 'DDT',
  adjustment_report: 'Rettifica'
};

const DOCUMENT_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  order: ClipboardList,
  ddt: Truck,
  adjustment_report: FileEdit
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { label: 'Bozza', color: 'bg-gray-100 text-gray-700', icon: FileEdit },
  pending_approval: { label: 'In Attesa', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  confirmed: { label: 'Confermato', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  archived: { label: 'Archiviato', color: 'bg-blue-100 text-blue-700', icon: Archive },
  cancelled: { label: 'Annullato', color: 'bg-red-100 text-red-700', icon: X }
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

function KPICard({ title, value, icon: Icon, trend, color }: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  color: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {trend !== undefined && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className={`h-3 w-3 ${trend < 0 ? 'rotate-180' : ''}`} />
                {trend >= 0 ? '+' : ''}{trend}% vs mese scorso
              </p>
            )}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentRow({ document, onExpand, isExpanded, onViewDetails }: {
  document: WmsDocument;
  onExpand: () => void;
  isExpanded: boolean;
  onViewDetails: () => void;
}) {
  const { toast } = useToast();
  const TypeIcon = DOCUMENT_TYPE_ICONS[document.documentType] || FileText;
  const statusConfig = STATUS_CONFIG[document.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;

  const { data: details, isLoading: detailsLoading } = useQuery<DocumentDetails>({
    queryKey: ['/api/wms/documents', document.id],
    enabled: isExpanded,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: string; reason?: string }) => {
      return apiRequest(`/api/wms/documents/${document.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wms/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wms/documents/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wms/documents/trend'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wms/documents/timeline'] });
      toast({ title: 'Stato documento aggiornato' });
    },
    onError: () => {
      toast({ title: 'Errore', description: 'Impossibile aggiornare lo stato', variant: 'destructive' });
    }
  });

  return (
    <Collapsible open={isExpanded} onOpenChange={onExpand}>
      <TableRow className="hover:bg-gray-50 cursor-pointer" onClick={onExpand}>
        <TableCell className="w-8">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </TableCell>
        <TableCell className="font-mono font-medium">{document.documentNumber}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <TypeIcon className="h-4 w-4 text-gray-500" />
            <span>{DOCUMENT_TYPE_LABELS[document.documentType]}</span>
          </div>
        </TableCell>
        <TableCell>
          {document.ddtReason ? (
            <Badge variant="outline" className="text-xs">
              {DDT_REASON_LABELS[document.ddtReason] || document.ddtReason}
            </Badge>
          ) : '-'}
        </TableCell>
        <TableCell className="text-gray-600">
          {format(new Date(document.documentDate), 'dd/MM/yyyy', { locale: it })}
        </TableCell>
        <TableCell>
          <Badge className={`${statusConfig.color} border-0`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </TableCell>
        <TableCell className="text-right">{document.totalQuantity}</TableCell>
        <TableCell className="text-gray-600 truncate max-w-[150px]">
          {document.supplierName || document.storeName || '-'}
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onViewDetails}>
                <Eye className="h-4 w-4 mr-2" />
                Visualizza
              </DropdownMenuItem>
              {document.status === 'draft' && (
                <>
                  <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ status: 'pending_approval' })}>
                    <Clock className="h-4 w-4 mr-2" />
                    Invia per Approvazione
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => updateStatusMutation.mutate({ status: 'cancelled' })}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Annulla
                  </DropdownMenuItem>
                </>
              )}
              {document.status === 'pending_approval' && (
                <>
                  <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ status: 'confirmed' })}>
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
                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ status: 'archived' })}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archivia
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <CollapsibleContent asChild>
        <TableRow className="bg-gray-50 hover:bg-gray-50">
          <TableCell colSpan={9} className="p-0">
            <div className="p-4 border-t border-gray-200">
              {detailsLoading ? (
                <div className="flex gap-4">
                  <Skeleton className="h-24 w-1/3" />
                  <Skeleton className="h-24 w-1/3" />
                  <Skeleton className="h-24 w-1/3" />
                </div>
              ) : details ? (
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" />
                      Fasi Documento
                    </h4>
                    <div className="space-y-2">
                      {details.phases.map((phase) => (
                        <div key={phase.id} className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            phase.phaseStatus === 'completed' ? 'bg-green-500' :
                            phase.phaseStatus === 'pending' ? 'bg-gray-300' :
                            phase.phaseStatus === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                          }`} />
                          <div className="flex-1">
                            <span className={`text-sm ${phase.phaseStatus === 'completed' ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                              {phase.phaseName}
                            </span>
                          </div>
                          {phase.completedAt && (
                            <span className="text-xs text-gray-400">
                              {format(new Date(phase.completedAt), 'dd/MM HH:mm', { locale: it })}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      Allegati ({details.attachments.length})
                    </h4>
                    {details.attachments.length > 0 ? (
                      <div className="space-y-2">
                        {details.attachments.map((att) => (
                          <div key={att.id} className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <span className="truncate">{att.fileName}</span>
                            <span className="text-xs text-gray-400">
                              ({Math.round(att.fileSize / 1024)}KB)
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Nessun allegato</p>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Info
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Creato da</span>
                        <span className="font-medium">{details.createdBy || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Prodotti</span>
                        <span className="font-medium">{details.totalItems}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Quantità totale</span>
                        <span className="font-medium">{details.totalQuantity}</span>
                      </div>
                      {details.totalValue && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Valore</span>
                          <span className="font-medium">€ {parseFloat(details.totalValue).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Impossibile caricare i dettagli</p>
              )}
            </div>
          </TableCell>
        </TableRow>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function DocumentsTabContent() {
  const { toast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'passive' | 'active' | 'archive' | 'drafts'>('passive');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { data: stats, isLoading: statsLoading } = useQuery<DocumentStats>({
    queryKey: ['/api/wms/documents/stats'],
  });

  const { data: trendData, isLoading: trendLoading } = useQuery<TrendData[]>({
    queryKey: ['/api/wms/documents/trend'],
  });

  const { data: timeline, isLoading: timelineLoading } = useQuery<TimelineEvent[]>({
    queryKey: ['/api/wms/documents/timeline'],
  });

  const { data: documentsData, isLoading: documentsLoading, refetch } = useQuery<{
    data: WmsDocument[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>({
    queryKey: ['/api/wms/documents', { tab: activeSubTab, type: typeFilter, status: statusFilter, search: searchQuery, page }],
  });

  const formattedTrendData = useMemo(() => {
    if (!trendData) return [];
    return trendData.map(d => ({
      ...d,
      date: format(new Date(d.date), 'dd/MM', { locale: it })
    }));
  }, [trendData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Documenti Operativi</h2>
          <p className="text-sm text-gray-500">Gestione ordini, DDT e rettifiche</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Aggiorna
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)} className="bg-orange-500 hover:bg-orange-600" data-testid="btn-new-document">
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Documento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {statsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))
        ) : (
          <>
            <KPICard
              title="Totale Mese"
              value={stats?.total || 0}
              icon={FileText}
              color="bg-blue-500"
            />
            <KPICard
              title="Passivi"
              value={stats?.passive || 0}
              icon={Download}
              color="bg-green-500"
            />
            <KPICard
              title="Attivi"
              value={stats?.active || 0}
              icon={Upload}
              color="bg-purple-500"
            />
            <KPICard
              title="In Attesa"
              value={stats?.pendingApproval || 0}
              icon={Clock}
              color="bg-yellow-500"
            />
            <KPICard
              title="Success Rate"
              value={`${stats?.successRate || 100}%`}
              icon={CheckCircle}
              color="bg-emerald-500"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              Trend Documenti (7 giorni)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-[200px]" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={formattedTrendData}>
                  <defs>
                    <linearGradient id="colorPassive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="passive" 
                    name="Passivi" 
                    stroke="#22c55e" 
                    fillOpacity={1} 
                    fill="url(#colorPassive)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="active" 
                    name="Attivi" 
                    stroke="#a855f7" 
                    fillOpacity={1} 
                    fill="url(#colorActive)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              Eventi Recenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timelineLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : timeline && timeline.length > 0 ? (
              <div className="space-y-3">
                {timeline.map((event) => {
                  const TypeIcon = DOCUMENT_TYPE_ICONS[event.documentType] || FileText;
                  return (
                    <div key={event.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                      <div className="p-1.5 rounded-lg bg-gray-100">
                        <TypeIcon className="h-3.5 w-3.5 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {event.documentNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          {event.event} • {formatDistanceToNow(new Date(event.eventTime), { addSuffix: true, locale: it })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nessun evento recente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as typeof activeSubTab)}>
            <div className="border-b px-4 pt-4">
              <TabsList className="bg-gray-100">
                <TabsTrigger value="passive" className="data-[state=active]:bg-white" data-testid="tab-passive">
                  <Download className="h-4 w-4 mr-2" />
                  Passivi
                </TabsTrigger>
                <TabsTrigger value="active" className="data-[state=active]:bg-white" data-testid="tab-active">
                  <Upload className="h-4 w-4 mr-2" />
                  Attivi
                </TabsTrigger>
                <TabsTrigger value="archive" className="data-[state=active]:bg-white" data-testid="tab-archive">
                  <Archive className="h-4 w-4 mr-2" />
                  Archivio
                </TabsTrigger>
                <TabsTrigger value="drafts" className="data-[state=active]:bg-white" data-testid="tab-drafts">
                  <FileEdit className="h-4 w-4 mr-2" />
                  Bozze
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-4 border-b bg-gray-50 flex items-center gap-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cerca documento..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white"
                  data-testid="input-search-document"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px] bg-white">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  <SelectItem value="order">Ordine</SelectItem>
                  <SelectItem value="ddt">DDT</SelectItem>
                  <SelectItem value="adjustment_report">Rettifica</SelectItem>
                </SelectContent>
              </Select>
              {activeSubTab !== 'drafts' && activeSubTab !== 'archive' && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px] bg-white">
                    <SelectValue placeholder="Stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli stati</SelectItem>
                    <SelectItem value="pending_approval">In Attesa</SelectItem>
                    <SelectItem value="confirmed">Confermato</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <TabsContent value={activeSubTab} className="m-0">
              {documentsLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : documentsData?.data && documentsData.data.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Numero</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Causale</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead className="text-right">Qtà</TableHead>
                        <TableHead>Controparte</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documentsData.data.map((doc) => (
                        <DocumentRow
                          key={doc.id}
                          document={doc}
                          isExpanded={expandedRow === doc.id}
                          onExpand={() => setExpandedRow(expandedRow === doc.id ? null : doc.id)}
                          onViewDetails={() => setSelectedDocument(doc.id)}
                        />
                      ))}
                    </TableBody>
                  </Table>

                  {documentsData.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <p className="text-sm text-gray-500">
                        Pagina {documentsData.pagination.page} di {documentsData.pagination.totalPages} ({documentsData.pagination.total} documenti)
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          Precedente
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => p + 1)}
                          disabled={page >= documentsData.pagination.totalPages}
                        >
                          Successiva
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium text-gray-600">Nessun documento trovato</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {activeSubTab === 'drafts' 
                      ? 'Non ci sono bozze in lavorazione'
                      : 'I documenti appariranno qui una volta creati'}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <CreateDocumentWizard
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={(docId) => {
          toast({ title: 'Documento creato', description: `ID: ${docId}` });
        }}
      />

      <DocumentDetailPanel
        documentId={selectedDocument}
        onClose={() => setSelectedDocument(null)}
      />
    </div>
  );
}
