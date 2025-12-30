import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Activity, Search, Download, RefreshCw, ChevronLeft, ChevronRight,
  AlertCircle, Info, AlertTriangle, Bug, User, Clock, Globe,
  Settings, Phone, Package, Users, BarChart3, Shield, Cpu, Workflow
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { apiRequest, getCurrentTenantId } from '@/lib/queryClient';

const SERVICES = [
  { value: 'all', label: 'Tutti i servizi', icon: Activity },
  { value: 'WMS', label: 'Magazzino', icon: Package },
  { value: 'CRM', label: 'CRM', icon: Users },
  { value: 'HR', label: 'Risorse Umane', icon: Users },
  { value: 'VOIP', label: 'Telefonia', icon: Phone },
  { value: 'POS', label: 'Punto Vendita', icon: BarChart3 },
  { value: 'AUTH', label: 'Autenticazione', icon: Shield },
  { value: 'WORKFLOW', label: 'Workflow', icon: Workflow },
  { value: 'SETTINGS', label: 'Impostazioni', icon: Settings },
  { value: 'AI', label: 'AI', icon: Cpu },
  { value: 'SYSTEM', label: 'Sistema', icon: Globe },
];

const LEVELS = [
  { value: 'all', label: 'Tutti i livelli' },
  { value: 'DEBUG', label: 'Debug', color: 'bg-gray-500' },
  { value: 'INFO', label: 'Info', color: 'bg-blue-500' },
  { value: 'WARN', label: 'Warning', color: 'bg-yellow-500' },
  { value: 'ERROR', label: 'Errore', color: 'bg-red-500' },
];

const SERVICE_COLORS: Record<string, string> = {
  WMS: '#3b82f6',
  CRM: '#10b981',
  HR: '#8b5cf6',
  VOIP: '#f59e0b',
  POS: '#ec4899',
  AUTH: '#ef4444',
  WORKFLOW: '#06b6d4',
  SETTINGS: '#6366f1',
  AI: '#14b8a6',
  SYSTEM: '#64748b',
  ANALYTICS: '#f97316',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#64748b', '#f97316', '#6366f1'];

interface ActivityLog {
  id: string;
  tenantId: string;
  service: string;
  module: string | null;
  action: string;
  actionCategory: string | null;
  entityType: string | null;
  entityId: string | null;
  entityName: string | null;
  actorId: string | null;
  actorEmail: string | null;
  actorRole: string | null;
  ipAddress: string | null;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  status: string | null;
  message: string | null;
  payloadBefore: any;
  payloadAfter: any;
  diff: any;
  metadata: any;
  latencyMs: number | null;
  executedAt: string;
}

interface LogStats {
  total: number;
  byService: { service: string; count: number }[];
  byLevel: { level: string; count: number }[];
  byStatus: { status: string; count: number }[];
  byHour: { hour: number; count: number }[];
  topActors: { actorEmail: string; count: number }[];
  recentActivity: { date: string; count: number }[];
}

export default function ActivityLogsPage() {
  const [selectedService, setSelectedService] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const tenantId = getCurrentTenantId();
  
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', '25');
    if (selectedService !== 'all') params.set('service', selectedService);
    if (selectedLevel !== 'all') params.set('level', selectedLevel);
    if (searchQuery) params.set('search', searchQuery);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    return params.toString();
  };
  
  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['/api/activity-logs', selectedService, selectedLevel, searchQuery, page, dateFrom, dateTo],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/activity-logs?${buildQueryParams()}`);
      return res.json();
    },
    refetchInterval: 30000,
  });
  
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/activity-logs/stats', selectedService, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedService !== 'all') params.set('service', selectedService);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      const res = await apiRequest('GET', `/api/activity-logs/stats?${params.toString()}`);
      return res.json() as Promise<LogStats>;
    },
  });
  
  const handleExport = async (format: 'json' | 'csv') => {
    const params = new URLSearchParams();
    params.set('format', format);
    if (selectedService !== 'all') params.set('service', selectedService);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    
    const res = await apiRequest('GET', `/api/activity-logs/export?${params.toString()}`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity_logs_${new Date().toISOString().split('T')[0]}.${format}`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  const getLevelBadge = (level: string) => {
    const config = {
      DEBUG: { variant: 'outline' as const, icon: Bug, className: 'border-gray-400 text-gray-600' },
      INFO: { variant: 'outline' as const, icon: Info, className: 'border-blue-400 text-blue-600' },
      WARN: { variant: 'outline' as const, icon: AlertTriangle, className: 'border-yellow-400 text-yellow-600' },
      ERROR: { variant: 'destructive' as const, icon: AlertCircle, className: '' },
    }[level] || { variant: 'outline' as const, icon: Info, className: '' };
    
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className={`${config.className} gap-1`}>
        <Icon className="h-3 w-3" />
        {level}
      </Badge>
    );
  };
  
  const getServiceIcon = (service: string) => {
    const svc = SERVICES.find(s => s.value === service);
    if (!svc) return Activity;
    return svc.icon;
  };
  
  const logs = logsData?.data || [];
  const pagination = logsData?.pagination || { page: 1, totalPages: 1, total: 0 };
  
  return (
    <div className="space-y-6" data-testid="activity-logs-page">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" data-testid="page-title">Log Attività</h2>
          <p className="text-muted-foreground">Monitora tutte le attività della piattaforma</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchLogs()} data-testid="btn-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Aggiorna
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')} data-testid="btn-export-csv">
            <Download className="h-4 w-4 mr-2" />
            Esporta CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('json')} data-testid="btn-export-json">
            <Download className="h-4 w-4 mr-2" />
            Esporta JSON
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Panoramica</TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-logs">Log Dettagliati</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          {statsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map(i => (
                <Card key={i}><CardContent className="p-6"><Skeleton className="h-20" /></CardContent></Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card data-testid="card-total">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Totale Eventi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{statsData?.total?.toLocaleString() || 0}</div>
                  </CardContent>
                </Card>
                
                <Card data-testid="card-errors">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Errori</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-500">
                      {statsData?.byLevel?.find(l => l.level === 'ERROR')?.count?.toLocaleString() || 0}
                    </div>
                  </CardContent>
                </Card>
                
                <Card data-testid="card-warnings">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Warnings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-500">
                      {statsData?.byLevel?.find(l => l.level === 'WARN')?.count?.toLocaleString() || 0}
                    </div>
                  </CardContent>
                </Card>
                
                <Card data-testid="card-services">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Servizi Attivi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{statsData?.byService?.length || 0}</div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <Card data-testid="chart-timeline">
                  <CardHeader>
                    <CardTitle className="text-sm">Attività nel Tempo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={statsData?.recentActivity?.slice().reverse() || []}>
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f680" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card data-testid="chart-services">
                  <CardHeader>
                    <CardTitle className="text-sm">Distribuzione per Servizio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statsData?.byService || []}
                            dataKey="count"
                            nameKey="service"
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            label={({ service }) => service}
                          >
                            {statsData?.byService?.map((entry, index) => (
                              <Cell key={entry.service} fill={SERVICE_COLORS[entry.service] || CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card data-testid="chart-hourly">
                  <CardHeader>
                    <CardTitle className="text-sm">Attività per Ora</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statsData?.byHour?.sort((a, b) => a.hour - b.hour) || []}>
                          <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card data-testid="chart-top-users">
                  <CardHeader>
                    <CardTitle className="text-sm">Utenti più Attivi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(statsData?.topActors || []).slice(0, 5).map((actor, i) => (
                        <div key={actor.actorEmail} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm truncate max-w-[180px]">{actor.actorEmail}</span>
                          </div>
                          <Badge variant="secondary">{actor.count}</Badge>
                        </div>
                      ))}
                      {!statsData?.topActors?.length && (
                        <p className="text-sm text-muted-foreground">Nessun dato disponibile</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
        
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca azione, messaggio, utente..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    className="flex-1"
                    data-testid="input-search"
                  />
                </div>
                
                <Select value={selectedService} onValueChange={(v) => { setSelectedService(v); setPage(1); }}>
                  <SelectTrigger className="w-[180px]" data-testid="select-service">
                    <SelectValue placeholder="Servizio" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICES.map(svc => (
                      <SelectItem key={svc.value} value={svc.value}>{svc.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedLevel} onValueChange={(v) => { setSelectedLevel(v); setPage(1); }}>
                  <SelectTrigger className="w-[140px]" data-testid="select-level">
                    <SelectValue placeholder="Livello" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map(lvl => (
                      <SelectItem key={lvl.value} value={lvl.value}>{lvl.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                  className="w-[150px]"
                  data-testid="input-date-from"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                  className="w-[150px]"
                  data-testid="input-date-to"
                />
              </div>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : (
                <>
                  <Table data-testid="table-logs">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Data/Ora</TableHead>
                        <TableHead className="w-[100px]">Servizio</TableHead>
                        <TableHead className="w-[80px]">Livello</TableHead>
                        <TableHead>Azione</TableHead>
                        <TableHead>Utente</TableHead>
                        <TableHead className="w-[80px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log: ActivityLog) => {
                        const ServiceIcon = getServiceIcon(log.service);
                        return (
                          <TableRow
                            key={log.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setSelectedLog(log)}
                            data-testid={`row-log-${log.id}`}
                          >
                            <TableCell className="font-mono text-xs">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                {format(new Date(log.executedAt), 'dd/MM HH:mm:ss', { locale: it })}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <ServiceIcon className="h-4 w-4" style={{ color: SERVICE_COLORS[log.service] }} />
                                <span className="text-xs">{log.service}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getLevelBadge(log.level)}</TableCell>
                            <TableCell className="max-w-[200px] truncate" title={log.action}>
                              {log.action}
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate">
                              {log.actorEmail || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                                {log.status || 'unknown'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {logs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Nessun log trovato
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Pagina {pagination.page} di {pagination.totalPages} ({pagination.total} risultati)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        data-testid="btn-prev-page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= pagination.totalPages}
                        onClick={() => setPage(p => p + 1)}
                        data-testid="btn-next-page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Dettaglio Log
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Servizio</p>
                    <p>{selectedLog.service}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Modulo</p>
                    <p>{selectedLog.module || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Azione</p>
                    <p>{selectedLog.action}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Livello</p>
                    {getLevelBadge(selectedLog.level)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Utente</p>
                    <p>{selectedLog.actorEmail || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">IP Address</p>
                    <p className="font-mono text-sm">{selectedLog.ipAddress || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Entità</p>
                    <p>{selectedLog.entityType ? `${selectedLog.entityType}: ${selectedLog.entityId}` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Latenza</p>
                    <p>{selectedLog.latencyMs ? `${selectedLog.latencyMs}ms` : '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Data/Ora</p>
                    <p>{format(new Date(selectedLog.executedAt), 'dd MMMM yyyy HH:mm:ss', { locale: it })}</p>
                  </div>
                </div>
                
                {selectedLog.message && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Messaggio</p>
                    <p className="bg-muted p-2 rounded text-sm">{selectedLog.message}</p>
                  </div>
                )}
                
                {selectedLog.diff && Object.keys(selectedLog.diff).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Modifiche</p>
                    <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.diff, null, 2)}
                    </pre>
                  </div>
                )}
                
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Metadata</p>
                    <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
