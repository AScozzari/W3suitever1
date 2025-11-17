/**
 * 📊 DEPLOY STATUS MATRIX
 * 
 * Real-time deployment status tracking table for 300+ tenants × branches
 * Features: Auto-refresh, status badges, filtering, sorting
 */

import { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { 
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Filter
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import { useDeploymentStatuses, DeploymentStatus } from '../../hooks/useDeploymentStatus';

interface DeployStatusMatrixProps {
  deploymentId?: string;
  className?: string;
}

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial';

const statusConfig = {
  pending: {
    label: 'In Attesa',
    icon: Clock,
    color: 'text-gray-600',
    bg: 'bg-gray-50 border-gray-200'
  },
  in_progress: {
    label: 'In Corso',
    icon: Activity,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200'
  },
  completed: {
    label: 'Completato',
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200'
  },
  failed: {
    label: 'Fallito',
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200'
  },
  partial: {
    label: 'Parziale',
    icon: AlertTriangle,
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200'
  }
};

export function DeployStatusMatrix({ deploymentId, className }: DeployStatusMatrixProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: statuses, isLoading, error, dataUpdatedAt } = useDeploymentStatuses({ 
    deploymentId,
    limit: 500 
  });
  
  // Filter statuses
  let filteredStatuses = statuses || [];
  
  if (statusFilter !== 'all') {
    filteredStatuses = filteredStatuses.filter(s => s.status === statusFilter);
  }
  
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredStatuses = filteredStatuses.filter(s => 
      s.branchName.toLowerCase().includes(term) ||
      s.tenantName.toLowerCase().includes(term)
    );
  }
  
  // Calculate summary
  const summary = {
    total: statuses?.length || 0,
    pending: statuses?.filter(s => s.status === 'pending').length || 0,
    inProgress: statuses?.filter(s => s.status === 'in_progress').length || 0,
    completed: statuses?.filter(s => s.status === 'completed').length || 0,
    failed: statuses?.filter(s => s.status === 'failed').length || 0,
    partial: statuses?.filter(s => s.status === 'partial').length || 0,
  };
  
  const lastUpdate = dataUpdatedAt ? formatDistanceToNow(new Date(dataUpdatedAt), { 
    addSuffix: true, 
    locale: it 
  }) : null;
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <XCircle className="w-12 h-12 mx-auto mb-3 text-red-600" />
        <p className="text-red-900 font-medium">Errore caricamento status deployment</p>
        <p className="text-red-700 text-sm mt-1">{error.message}</p>
      </div>
    );
  }
  
  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 backdrop-blur-sm bg-white/80">
          <p className="text-sm text-gray-600 mb-1">Totale</p>
          <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-600 mb-1">In Attesa</p>
          <p className="text-2xl font-bold text-gray-600">{summary.pending}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <p className="text-sm text-blue-600 mb-1">In Corso</p>
          <p className="text-2xl font-bold text-blue-600">{summary.inProgress}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <p className="text-sm text-green-600 mb-1">Completati</p>
          <p className="text-2xl font-bold text-green-600">{summary.completed}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <p className="text-sm text-red-600 mb-1">Falliti</p>
          <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
          <p className="text-sm text-orange-600 mb-1">Parziali</p>
          <p className="text-2xl font-bold text-orange-600">{summary.partial}</p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <Input
            placeholder="Cerca tenant o branch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white/80 backdrop-blur-sm"
            data-testid="input-search-status"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-48 bg-white/80 backdrop-blur-sm" data-testid="select-status-filter">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli status</SelectItem>
            <SelectItem value="pending">In Attesa</SelectItem>
            <SelectItem value="in_progress">In Corso</SelectItem>
            <SelectItem value="completed">Completati</SelectItem>
            <SelectItem value="failed">Falliti</SelectItem>
            <SelectItem value="partial">Parziali</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Aggiornato {lastUpdate || 'ora'}</span>
        </div>
      </div>
      
      {/* Status Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden backdrop-blur-sm bg-white/80">
        {isLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 text-gray-400 animate-spin" />
            <p className="text-gray-600">Caricamento status...</p>
          </div>
        ) : filteredStatuses.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-900 font-medium mb-1">Nessun deployment trovato</p>
            <p className="text-gray-600 text-sm">
              {searchTerm || statusFilter !== 'all' 
                ? 'Prova a modificare i filtri di ricerca'
                : 'Inizia un nuovo deployment dal Commit Browser'
              }
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Branch</TableHead>
                <TableHead className="w-[25%]">Tenant</TableHead>
                <TableHead className="w-[15%]">Status</TableHead>
                <TableHead className="w-[15%]">Iniziato</TableHead>
                <TableHead className="w-[15%]">Completato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStatuses.map((status) => {
                const config = statusConfig[status.status];
                const StatusIcon = config.icon;
                
                return (
                  <TableRow 
                    key={status.id} 
                    className="hover:bg-gray-50/50"
                    data-testid={`row-status-${status.id}`}
                  >
                    <TableCell className="font-medium">
                      <span className="text-gray-900">{status.branchName}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-700">{status.tenantName}</span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn('gap-1.5 font-medium border', config.bg, config.color)}
                        data-testid={`badge-status-${status.status}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {status.startedAt ? (
                        <span className="text-sm text-gray-600">
                          {formatDistanceToNow(new Date(status.startedAt), { 
                            addSuffix: true, 
                            locale: it 
                          })}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {status.completedAt ? (
                        <span className="text-sm text-gray-600">
                          {formatDistanceToNow(new Date(status.completedAt), { 
                            addSuffix: true, 
                            locale: it 
                          })}
                        </span>
                      ) : status.status === 'in_progress' ? (
                        <span className="text-sm text-blue-600 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 animate-pulse" />
                          In corso...
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
      
      {/* Results count */}
      {filteredStatuses.length > 0 && (
        <p className="text-sm text-gray-600 text-center">
          Mostrati {filteredStatuses.length} di {summary.total} deployment
        </p>
      )}
    </div>
  );
}
