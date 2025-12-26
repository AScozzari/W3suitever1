import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  PackagePlus,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Package,
  Truck,
  ClipboardCheck,
  Archive,
  Search,
  Filter,
  Plus,
  ChevronRight,
  Calendar,
  Building2,
  FileText
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ReceivingModal } from './ReceivingModal';
import { useToast } from '@/hooks/use-toast';

interface ReceivingStats {
  todayReceived: number;
  inProgress: number;
  pending: number;
  discrepancies: number;
}

interface ReceivingOperation {
  id: string;
  documentNumber: string;
  supplier: string;
  status: 'unloading' | 'checking' | 'storing' | 'completed';
  itemsExpected: number;
  itemsReceived: number;
  createdAt: string;
  hasDiscrepancy: boolean;
}

const STATUS_CONFIG = {
  unloading: { label: 'Scarico', color: 'bg-blue-100 text-blue-700', icon: Truck },
  checking: { label: 'Controllo', color: 'bg-yellow-100 text-yellow-700', icon: ClipboardCheck },
  storing: { label: 'Stoccaggio', color: 'bg-purple-100 text-purple-700', icon: Archive },
  completed: { label: 'Completato', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
};

const PROCESS_STEPS = [
  { id: 'unloading', label: 'Scarico', icon: Truck },
  { id: 'checking', label: 'Controllo', icon: ClipboardCheck },
  { id: 'storing', label: 'Stoccaggio', icon: Archive },
  { id: 'completed', label: 'Conferma', icon: CheckCircle2 },
];

export function ReceivingTabContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const handleReceivingSubmit = (data: any) => {
    console.log('Receiving data:', data);
    toast({
      title: 'Carico registrato',
      description: `${data.items.length} prodotti caricati con successo`,
    });
  };

  const stats: ReceivingStats = {
    todayReceived: 47,
    inProgress: 3,
    pending: 5,
    discrepancies: 2,
  };

  const processStats = {
    unloading: 1,
    checking: 1,
    storing: 1,
    completed: 47,
  };

  const operations: ReceivingOperation[] = [
    {
      id: '1',
      documentNumber: 'DDT-2024-001234',
      supplier: 'TechDistribution Srl',
      status: 'checking',
      itemsExpected: 50,
      itemsReceived: 48,
      createdAt: '2024-12-26T09:30:00',
      hasDiscrepancy: true,
    },
    {
      id: '2',
      documentNumber: 'DDT-2024-001235',
      supplier: 'MobileWorld SpA',
      status: 'unloading',
      itemsExpected: 25,
      itemsReceived: 0,
      createdAt: '2024-12-26T10:15:00',
      hasDiscrepancy: false,
    },
    {
      id: '3',
      documentNumber: 'DDT-2024-001236',
      supplier: 'AccessoriPlus',
      status: 'storing',
      itemsExpected: 100,
      itemsReceived: 100,
      createdAt: '2024-12-26T08:00:00',
      hasDiscrepancy: false,
    },
    {
      id: '4',
      documentNumber: 'DDT-2024-001230',
      supplier: 'TechDistribution Srl',
      status: 'completed',
      itemsExpected: 75,
      itemsReceived: 75,
      createdAt: '2024-12-26T07:00:00',
      hasDiscrepancy: false,
    },
  ];

  const filteredOperations = operations.filter(op => {
    if (statusFilter !== 'all' && op.status !== statusFilter) return false;
    if (searchQuery && !op.documentNumber.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !op.supplier.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Carico Merce</h2>
          <p className="text-sm text-gray-500">Hub di ricevimento e controllo merci in ingresso</p>
        </div>
        <Button 
          className="bg-orange-500 hover:bg-orange-600"
          data-testid="btn-new-receiving"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Carico
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Ricevuti Oggi</p>
                <p className="text-2xl font-bold text-gray-900" data-testid="stat-today-received">{stats.todayReceived}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">In Corso</p>
                <p className="text-2xl font-bold text-gray-900" data-testid="stat-in-progress">{stats.inProgress}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pendenti</p>
                <p className="text-2xl font-bold text-gray-900" data-testid="stat-pending">{stats.pending}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Discrepanze</p>
                <p className="text-2xl font-bold text-gray-900" data-testid="stat-discrepancies">{stats.discrepancies}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Flusso Processo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {PROCESS_STEPS.map((step, index) => {
              const Icon = step.icon;
              const count = processStats[step.id as keyof typeof processStats];
              const isActive = count > 0 && step.id !== 'completed';
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div 
                      className={`h-12 w-12 rounded-full flex items-center justify-center mb-2 ${
                        isActive 
                          ? 'bg-orange-100 ring-2 ring-orange-500' 
                          : step.id === 'completed' 
                            ? 'bg-green-100' 
                            : 'bg-gray-100'
                      }`}
                    >
                      <Icon className={`h-6 w-6 ${
                        isActive 
                          ? 'text-orange-600' 
                          : step.id === 'completed' 
                            ? 'text-green-600' 
                            : 'text-gray-400'
                      }`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{step.label}</span>
                    <Badge 
                      variant="secondary" 
                      className={`mt-1 ${isActive ? 'bg-orange-100 text-orange-700' : ''}`}
                    >
                      {count}
                    </Badge>
                  </div>
                  {index < PROCESS_STEPS.length - 1 && (
                    <ChevronRight className="h-5 w-5 text-gray-300 mx-2" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Operazioni di Carico</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cerca DDT o fornitore..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                  data-testid="input-search-receiving"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-status-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="unloading">Scarico</SelectItem>
                  <SelectItem value="checking">Controllo</SelectItem>
                  <SelectItem value="storing">Stoccaggio</SelectItem>
                  <SelectItem value="completed">Completato</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-36" data-testid="select-date-filter">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Data" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Oggi</SelectItem>
                  <SelectItem value="week">Questa settimana</SelectItem>
                  <SelectItem value="month">Questo mese</SelectItem>
                  <SelectItem value="all">Tutto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Documento</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Fornitore</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Stato</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Progresso</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Data</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredOperations.map((op) => {
                  const StatusIcon = STATUS_CONFIG[op.status].icon;
                  return (
                    <tr 
                      key={op.id} 
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      data-testid={`row-receiving-${op.id}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{op.documentNumber}</span>
                          {op.hasDiscrepancy && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-700">{op.supplier}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={STATUS_CONFIG[op.status].color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {STATUS_CONFIG[op.status].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                            <div 
                              className={`h-2 rounded-full ${op.hasDiscrepancy ? 'bg-red-500' : 'bg-green-500'}`}
                              style={{ width: `${(op.itemsReceived / op.itemsExpected) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {op.itemsReceived}/{op.itemsExpected}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(op.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          data-testid={`btn-view-receiving-${op.id}`}
                        >
                          Dettagli
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ReceivingModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleReceivingSubmit}
      />
    </div>
  );
}
