import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  UserPlus, 
  Phone, 
  Mail,
  Search,
  Filter,
  ArrowRight,
  Calendar,
  User,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { LoadingState, ErrorState } from '@w3suite/frontend-kit/components/blocks';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Lead {
  id: string;
  personId: string;
  personName: string;
  source: string | null;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  score: number | null;
  temperature: 'cold' | 'warm' | 'hot' | null;
  nextFollowUpAt: string | null;
  estimatedValue: number | null;
  estimatedCloseDate: string | null;
  notes: string | null;
  lostReason: string | null;
  wonAt: string | null;
  lostAt: string | null;
  convertedDealId: string | null;
  createdAt: string;
}

const statusColors = {
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  contacted: 'bg-purple-100 text-purple-700 border-purple-200',
  qualified: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  proposal: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  negotiation: 'bg-orange-100 text-orange-700 border-orange-200',
  won: 'bg-green-100 text-green-700 border-green-200',
  lost: 'bg-gray-100 text-gray-700 border-gray-200'
};

const temperatureColors = {
  cold: 'bg-blue-50 text-blue-600',
  warm: 'bg-yellow-50 text-yellow-600',
  hot: 'bg-red-50 text-red-600'
};

export default function LeadsPage() {
  const [currentModule, setCurrentModule] = useState('crm');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [temperatureFilter, setTemperatureFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    personId: '',
    source: '',
    status: 'new' as const,
    temperature: 'warm' as const,
    estimatedValue: '',
    estimatedCloseDate: '',
    notes: ''
  });

  // Fetch leads
  const { data: leads, isLoading, error } = useQuery<Lead[]>({
    queryKey: ['/api/crm/leads'],
    // Fallback to demo data if API not ready
    initialData: [
      {
        id: '1',
        personId: '1',
        personName: 'Mario Rossi',
        source: 'Website',
        status: 'qualified',
        score: 85,
        temperature: 'hot',
        nextFollowUpAt: new Date(Date.now() + 86400000).toISOString(),
        estimatedValue: 50000,
        estimatedCloseDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        notes: 'Interessato a contratto enterprise',
        lostReason: null,
        wonAt: null,
        lostAt: null,
        convertedDealId: null,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        personId: '2',
        personName: 'Laura Bianchi',
        source: 'Referral',
        status: 'contacted',
        score: 60,
        temperature: 'warm',
        nextFollowUpAt: new Date(Date.now() + 2 * 86400000).toISOString(),
        estimatedValue: 35000,
        estimatedCloseDate: new Date(Date.now() + 45 * 86400000).toISOString(),
        notes: 'Prima chiamata effettuata',
        lostReason: null,
        wonAt: null,
        lostAt: null,
        convertedDealId: null,
        createdAt: new Date().toISOString()
      },
      {
        id: '3',
        personId: '3',
        personName: 'Giuseppe Verdi',
        source: 'LinkedIn',
        status: 'new',
        score: 40,
        temperature: 'cold',
        nextFollowUpAt: null,
        estimatedValue: null,
        estimatedCloseDate: null,
        notes: null,
        lostReason: null,
        wonAt: null,
        lostAt: null,
        convertedDealId: null,
        createdAt: new Date().toISOString()
      }
    ]
  });

  // Fetch persons for dropdown
  const { data: persons } = useQuery<Array<{ id: string; fullName: string }>>({
    queryKey: ['/api/crm/persons'],
    select: (data: any) => data?.map((p: any) => ({ id: p.id, fullName: p.fullName })) || [],
    initialData: [
      { id: '1', fullName: 'Mario Rossi' },
      { id: '2', fullName: 'Laura Bianchi' }
    ]
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        estimatedValue: data.estimatedValue ? parseFloat(data.estimatedValue) : null,
        estimatedCloseDate: data.estimatedCloseDate || null
      };
      return await apiRequest('/api/crm/leads', 'POST', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/leads'] });
      setIsDialogOpen(false);
      setFormData({
        personId: '',
        source: '',
        status: 'new',
        temperature: 'warm',
        estimatedValue: '',
        estimatedCloseDate: '',
        notes: ''
      });
      toast({
        title: 'Lead creato',
        description: 'Il lead è stato creato con successo',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile creare il lead',
        variant: 'destructive',
      });
    }
  });

  // Filter leads
  const filteredLeads = leads?.filter(lead => {
    const matchesSearch = lead.personName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lead.source?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesTemp = temperatureFilter === 'all' || lead.temperature === temperatureFilter;
    return matchesSearch && matchesStatus && matchesTemp;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <LoadingState />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
        <ErrorState message="Errore nel caricamento dei lead" />
      </Layout>
    );
  }

  return (
    <Layout currentModule={currentModule} setCurrentModule={setCurrentModule}>
      <div className="space-y-6" data-testid="crm-leads-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
              Gestione Lead
            </h1>
            <p className="text-gray-600 mt-1">
              Pipeline qualifica - {filteredLeads?.length || 0} lead attivi
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                data-testid="button-new-lead"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Nuovo Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crea Nuovo Lead</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="personId">Contatto *</Label>
                  <Select 
                    required
                    value={formData.personId} 
                    onValueChange={(value) => setFormData({ ...formData, personId: value })}
                  >
                    <SelectTrigger data-testid="select-person">
                      <SelectValue placeholder="Seleziona contatto" />
                    </SelectTrigger>
                    <SelectContent>
                      {persons?.map(person => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="source">Fonte</Label>
                    <Input
                      id="source"
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      placeholder="es. Website, LinkedIn, Referral"
                      data-testid="input-source"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Nuovo</SelectItem>
                        <SelectItem value="contacted">Contattato</SelectItem>
                        <SelectItem value="qualified">Qualificato</SelectItem>
                        <SelectItem value="proposal">Proposta</SelectItem>
                        <SelectItem value="negotiation">Negoziazione</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperatura</Label>
                  <Select 
                    value={formData.temperature} 
                    onValueChange={(value: any) => setFormData({ ...formData, temperature: value })}
                  >
                    <SelectTrigger data-testid="select-temperature">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cold">Freddo</SelectItem>
                      <SelectItem value="warm">Tiepido</SelectItem>
                      <SelectItem value="hot">Caldo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="estimatedValue">Valore Stimato (€)</Label>
                    <Input
                      id="estimatedValue"
                      type="number"
                      value={formData.estimatedValue}
                      onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                      data-testid="input-estimated-value"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimatedCloseDate">Data Chiusura Prevista</Label>
                    <Input
                      id="estimatedCloseDate"
                      type="date"
                      value={formData.estimatedCloseDate}
                      onChange={(e) => setFormData({ ...formData, estimatedCloseDate: e.target.value })}
                      data-testid="input-close-date"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Note</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    data-testid="input-notes"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Annulla
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    className="bg-gradient-to-r from-orange-500 to-orange-600"
                    data-testid="button-submit"
                  >
                    {createMutation.isPending ? 'Salvataggio...' : 'Crea Lead'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cerca lead..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-filter-status">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filtra per status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli status</SelectItem>
                  <SelectItem value="new">Nuovo</SelectItem>
                  <SelectItem value="contacted">Contattato</SelectItem>
                  <SelectItem value="qualified">Qualificato</SelectItem>
                  <SelectItem value="proposal">Proposta</SelectItem>
                  <SelectItem value="negotiation">Negoziazione</SelectItem>
                  <SelectItem value="won">Vinto</SelectItem>
                  <SelectItem value="lost">Perso</SelectItem>
                </SelectContent>
              </Select>
              <Select value={temperatureFilter} onValueChange={setTemperatureFilter}>
                <SelectTrigger data-testid="select-filter-temperature">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filtra per temperatura" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le temperature</SelectItem>
                  <SelectItem value="hot">Caldo</SelectItem>
                  <SelectItem value="warm">Tiepido</SelectItem>
                  <SelectItem value="cold">Freddo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Leads List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredLeads?.map((lead) => (
            <Card 
              key={lead.id} 
              className="hover:shadow-lg transition-shadow border-2 hover:border-orange-300"
              data-testid={`lead-card-${lead.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-5 w-5 text-orange-600" />
                      <CardTitle className="text-lg">{lead.personName}</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={statusColors[lead.status]}>
                        {lead.status}
                      </Badge>
                      {lead.temperature && (
                        <Badge className={temperatureColors[lead.temperature]}>
                          {lead.temperature}
                        </Badge>
                      )}
                      {lead.score && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700">
                          Score: {lead.score}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {lead.source && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>Fonte: {lead.source}</span>
                  </div>
                )}

                {lead.estimatedValue && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="h-4 w-4" />
                    <span>Valore: €{lead.estimatedValue.toLocaleString('it-IT')}</span>
                  </div>
                )}

                {lead.estimatedCloseDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Chiusura prevista: {new Date(lead.estimatedCloseDate).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                )}

                {lead.nextFollowUpAt && (
                  <div className="flex items-center gap-2 text-sm text-orange-600 font-medium">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Follow-up: {new Date(lead.nextFollowUpAt).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                )}

                {lead.notes && (
                  <p className="text-sm text-gray-600 pt-2 border-t">
                    {lead.notes}
                  </p>
                )}

                <div className="pt-3 border-t flex justify-end">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                    data-testid={`button-convert-${lead.id}`}
                  >
                    Converti in Deal
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredLeads?.length === 0 && (
          <Card className="py-12">
            <CardContent className="text-center">
              <div className="inline-flex p-4 bg-gray-100 rounded-full mb-4">
                <Phone className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nessun lead trovato
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || statusFilter !== 'all' || temperatureFilter !== 'all' 
                  ? 'Prova con criteri di filtro diversi' 
                  : 'Inizia creando il tuo primo lead'}
              </p>
              {!searchQuery && statusFilter === 'all' && temperatureFilter === 'all' && (
                <Button 
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-gradient-to-r from-orange-500 to-orange-600"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Crea Primo Lead
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
