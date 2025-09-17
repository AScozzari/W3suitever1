// Time Entries List Component - Enterprise Time Management
import { useState, useMemo } from 'react';
import {
  Clock,
  Edit,
  Check,
  X,
  AlertCircle,
  Calendar,
  MapPin,
  Smartphone,
  CreditCard,
  Wifi,
  Fingerprint,
  Coffee,
  TrendingUp,
  Download,
  Filter,
  MoreVertical,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, differenceInMinutes, isToday, isYesterday, isThisWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { TimeTrackingEntry } from '@/services/timeTrackingService';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TimeEntriesListProps {
  entries: TimeTrackingEntry[];
  loading?: boolean;
  userId?: string;
  canEdit?: boolean;
  canApprove?: boolean;
  onEdit?: (entry: TimeTrackingEntry) => void;
  onApprove?: (entryId: string) => void;
  onDispute?: (entryId: string, reason: string) => void;
  onExport?: (format: 'csv' | 'pdf') => void;
  className?: string;
}

type GroupByPeriod = 'day' | 'week' | 'month';
type FilterStatus = 'all' | 'active' | 'completed' | 'edited' | 'disputed';

const TRACKING_METHOD_ICONS: Record<string, React.ReactNode> = {
  badge: <CreditCard className="w-4 h-4" />,
  nfc: <Wifi className="w-4 h-4" />,
  app: <Smartphone className="w-4 h-4" />,
  gps: <MapPin className="w-4 h-4" />,
  biometric: <Fingerprint className="w-4 h-4" />,
  manual: <Edit className="w-4 h-4" />,
};

const TRACKING_METHOD_COLORS: Record<string, string> = {
  badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  nfc: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  app: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  gps: 'bg-green-500/10 text-green-400 border-green-500/20',
  biometric: 'bg-red-500/10 text-red-400 border-red-500/20',
  manual: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

export default function TimeEntriesList({
  entries,
  loading = false,
  userId,
  canEdit = false,
  canApprove = false,
  onEdit,
  onApprove,
  onDispute,
  onExport,
  className,
}: TimeEntriesListProps) {
  const { toast } = useToast();
  const [groupBy, setGroupBy] = useState<GroupByPeriod>('day');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TimeTrackingEntry>>({});
  const [disputeId, setDisputeId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');

  // Group entries by period
  const groupedEntries = useMemo(() => {
    const filtered = entries.filter((entry) => {
      if (filterStatus === 'all') return true;
      return entry.status === filterStatus;
    });

    const groups: Record<string, TimeTrackingEntry[]> = {};

    filtered.forEach((entry) => {
      let key: string;
      const date = parseISO(entry.clockIn);

      if (groupBy === 'day') {
        key = format(date, 'yyyy-MM-dd');
      } else if (groupBy === 'week') {
        key = format(date, 'yyyy-ww');
      } else {
        key = format(date, 'yyyy-MM');
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(entry);
    });

    // Sort groups by date descending
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, entries]) => ({
        key,
        entries: entries.sort((a, b) =>
          new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime()
        ),
      }));
  }, [entries, groupBy, filterStatus]);

  const formatGroupTitle = (key: string): string => {
    if (groupBy === 'day') {
      const date = parseISO(key);
      if (isToday(date)) return 'Oggi';
      if (isYesterday(date)) return 'Ieri';
      if (isThisWeek(date)) return format(date, 'EEEE d MMMM', { locale: it });
      return format(date, 'd MMMM yyyy', { locale: it });
    } else if (groupBy === 'week') {
      const [year, week] = key.split('-');
      return `Settimana ${week}, ${year}`;
    } else {
      const [year, month] = key.split('-');
      return format(new Date(Number(year), Number(month) - 1), 'MMMM yyyy', {
        locale: it,
      });
    }
  };

  const calculateDuration = (clockIn: string, clockOut?: string | null): number => {
    const start = parseISO(clockIn);
    const end = clockOut ? parseISO(clockOut) : new Date();
    return differenceInMinutes(end, start);
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const getStatusBadge = (entry: TimeTrackingEntry) => {
    const status = entry.status || 'active';
    const variants: Record<string, string> = {
      active: 'bg-green-500/10 text-green-400 border-green-500/20',
      completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      edited: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      disputed: 'bg-red-500/10 text-red-400 border-red-500/20',
    };

    const labels: Record<string, string> = {
      active: 'Attivo',
      completed: 'Completato',
      edited: 'Modificato',
      disputed: 'Disputato',
    };

    return (
      <Badge className={cn('text-xs', variants[status])}>
        {labels[status]}
      </Badge>
    );
  };

  const handleEdit = (entry: TimeTrackingEntry) => {
    setEditingId(entry.id);
    setEditForm({
      clockIn: entry.clockIn,
      clockOut: entry.clockOut,
      notes: entry.notes,
      editReason: '',
    });
  };

  const handleSaveEdit = () => {
    if (!editingId || !editForm.editReason) {
      toast({
        title: "Errore",
        description: "Inserisci il motivo della modifica",
        variant: "destructive",
      });
      return;
    }

    if (onEdit) {
      const entry = entries.find(e => e.id === editingId);
      if (entry) {
        onEdit({ ...entry, ...editForm });
      }
    }

    setEditingId(null);
    setEditForm({});
  };

  const handleDispute = (entryId: string) => {
    if (!disputeReason.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci il motivo della disputa",
        variant: "destructive",
      });
      return;
    }

    if (onDispute) {
      onDispute(entryId, disputeReason);
    }

    setDisputeId(null);
    setDisputeReason('');
  };

  const calculateGroupStats = (entries: TimeTrackingEntry[]) => {
    const totalMinutes = entries.reduce((sum, entry) => {
      return sum + (entry.totalMinutes || calculateDuration(entry.clockIn, entry.clockOut));
    }, 0);

    const overtimeMinutes = entries.reduce((sum, entry) => {
      return sum + (entry.overtimeMinutes || 0);
    }, 0);

    const breakMinutes = entries.reduce((sum, entry) => {
      return sum + (entry.breakMinutes || 0);
    }, 0);

    return {
      totalMinutes,
      overtimeMinutes,
      breakMinutes,
      regularMinutes: totalMinutes - overtimeMinutes,
    };
  };

  if (loading) {
    return (
      <Card className={cn("p-6 bg-white/5 backdrop-blur-xl border-white/10", className)}>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-white/5 rounded-lg" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn("p-6 bg-white/5 backdrop-blur-xl border-white/10", className)}
      data-testid="time-entries-list"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Timbrature</h3>
          <p className="text-sm text-gray-400">
            {entries.length} registrazioni
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Group By */}
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByPeriod)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Giorno</SelectItem>
              <SelectItem value="week">Settimana</SelectItem>
              <SelectItem value="month">Mese</SelectItem>
            </SelectContent>
          </Select>

          {/* Filter */}
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="active">Attivi</SelectItem>
              <SelectItem value="completed">Completati</SelectItem>
              <SelectItem value="edited">Modificati</SelectItem>
              <SelectItem value="disputed">Disputati</SelectItem>
            </SelectContent>
          </Select>

          {/* Export */}
          {onExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onExport('csv')}>
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onExport('pdf')}>
                  Export PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Entries List */}
      <ScrollArea className="h-[600px]">
        <AnimatePresence mode="wait">
          {groupedEntries.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">Nessuna timbratura trovata</p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {groupedEntries.map(({ key, entries }) => {
                const stats = calculateGroupStats(entries);
                
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    {/* Group Header */}
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-300">
                        {formatGroupTitle(key)}
                      </h4>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>Totale: {formatDuration(stats.totalMinutes)}</span>
                        {stats.overtimeMinutes > 0 && (
                          <span className="text-orange-400">
                            Straordinari: {formatDuration(stats.overtimeMinutes)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Group Entries */}
                    <div className="space-y-2">
                      {entries.map((entry) => (
                        <motion.div
                          key={entry.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="relative"
                        >
                          {editingId === entry.id ? (
                            /* Edit Mode */
                            <Card className="p-4 bg-white/5 border-blue-500/30">
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-xs text-gray-400">Entrata</label>
                                    <Input
                                      type="datetime-local"
                                      value={typeof editForm.clockIn === 'string' ? editForm.clockIn.slice(0, 16) : new Date(editForm.clockIn || '').toISOString().slice(0, 16)}
                                      onChange={(e) =>
                                        setEditForm({ ...editForm, clockIn: new Date(e.target.value) })
                                      }
                                      className="mt-1"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-400">Uscita</label>
                                    <Input
                                      type="datetime-local"
                                      value={typeof editForm.clockOut === 'string' ? editForm.clockOut.slice(0, 16) : (editForm.clockOut ? new Date(editForm.clockOut).toISOString().slice(0, 16) : '')}
                                      onChange={(e) =>
                                        setEditForm({ ...editForm, clockOut: new Date(e.target.value) })
                                      }
                                      className="mt-1"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs text-gray-400">Motivo Modifica</label>
                                  <Textarea
                                    value={editForm.editReason || ''}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, editReason: e.target.value })
                                    }
                                    placeholder="Inserisci il motivo della modifica..."
                                    className="mt-1 h-20"
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingId(null);
                                      setEditForm({});
                                    }}
                                  >
                                    Annulla
                                  </Button>
                                  <Button size="sm" onClick={handleSaveEdit}>
                                    Salva
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ) : disputeId === entry.id ? (
                            /* Dispute Mode */
                            <Card className="p-4 bg-white/5 border-red-500/30">
                              <div className="space-y-3">
                                <div>
                                  <label className="text-xs text-gray-400">Motivo Disputa</label>
                                  <Textarea
                                    value={disputeReason}
                                    onChange={(e) => setDisputeReason(e.target.value)}
                                    placeholder="Spiega il motivo della disputa..."
                                    className="mt-1 h-20"
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setDisputeId(null);
                                      setDisputeReason('');
                                    }}
                                  >
                                    Annulla
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDispute(entry.id)}
                                  >
                                    Invia Disputa
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          ) : (
                            /* Normal Display */
                            <Card
                              className={cn(
                                "p-4 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer",
                                entry.status === 'disputed' && "border-red-500/30",
                                entry.status === 'edited' && "border-orange-500/30"
                              )}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    {/* Time Range */}
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">
                                        {format(parseISO(entry.clockIn), 'HH:mm')}
                                      </span>
                                      <span className="text-gray-400">→</span>
                                      <span className="text-sm font-medium">
                                        {entry.clockOut
                                          ? format(parseISO(entry.clockOut), 'HH:mm')
                                          : 'In corso'}
                                      </span>
                                    </div>

                                    {/* Duration */}
                                    <Badge variant="secondary" className="text-xs">
                                      {formatDuration(
                                        entry.totalMinutes ||
                                          calculateDuration(entry.clockIn, entry.clockOut)
                                      )}
                                    </Badge>

                                    {/* Status */}
                                    {getStatusBadge(entry)}

                                    {/* Overtime */}
                                    {entry.overtimeMinutes && entry.overtimeMinutes > 0 && (
                                      <Badge className="bg-orange-500/10 text-orange-400 text-xs">
                                        <TrendingUp className="w-3 h-3 mr-1" />
                                        +{formatDuration(entry.overtimeMinutes)}
                                      </Badge>
                                    )}

                                    {/* Breaks */}
                                    {entry.breakMinutes && entry.breakMinutes > 0 && (
                                      <Badge className="bg-blue-500/10 text-blue-400 text-xs">
                                        <Coffee className="w-3 h-3 mr-1" />
                                        {formatDuration(entry.breakMinutes)}
                                      </Badge>
                                    )}
                                  </div>

                                  {/* Additional Info */}
                                  <div className="flex items-center gap-4 text-xs text-gray-400">
                                    {/* Tracking Method */}
                                    <div className="flex items-center gap-1">
                                      {TRACKING_METHOD_ICONS[entry.trackingMethod]}
                                      <span className="capitalize">{entry.trackingMethod}</span>
                                    </div>

                                    {/* Store */}
                                    {entry.storeName && (
                                      <div className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        <span>{entry.storeName}</span>
                                      </div>
                                    )}

                                    {/* User */}
                                    {entry.userName && (
                                      <div className="flex items-center gap-1">
                                        <span>{entry.userName}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Notes */}
                                  {entry.notes && (
                                    <p className="text-xs text-gray-400 mt-2 italic">
                                      "{entry.notes}"
                                    </p>
                                  )}

                                  {/* Edit Reason */}
                                  {entry.editReason && (
                                    <div className="mt-2 p-2 bg-orange-500/10 rounded text-xs">
                                      <span className="text-orange-400 font-medium">Modificato:</span>{' '}
                                      {entry.editReason}
                                    </div>
                                  )}
                                </div>

                                {/* Actions */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {canEdit && entry.status !== 'disputed' && (
                                      <>
                                        <DropdownMenuItem onClick={() => handleEdit(entry)}>
                                          <Edit className="w-4 h-4 mr-2" />
                                          Modifica
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                      </>
                                    )}
                                    {canApprove && entry.status === 'edited' && (
                                      <>
                                        <DropdownMenuItem
                                          onClick={() => onApprove && onApprove(entry.id)}
                                        >
                                          <Check className="w-4 h-4 mr-2" />
                                          Approva
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                      </>
                                    )}
                                    <DropdownMenuItem
                                      onClick={() => setDisputeId(entry.id)}
                                      className="text-red-400"
                                    >
                                      <AlertCircle className="w-4 h-4 mr-2" />
                                      Disputa
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </Card>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </ScrollArea>
    </Card>
  );
}