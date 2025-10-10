import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  UserPlus, 
  Phone, 
  Mail,
  Search,
  Filter,
  ArrowRight,
  User,
  DollarSign
} from 'lucide-react';
import { LoadingState, ErrorState } from '@w3suite/frontend-kit/components/blocks';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { crmLeadFormSchema, type CrmLeadFormValidation } from '@/lib/validation/italian-business-validation';

interface Lead {
  id: string;
  personId: string;
  personName: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  productInterest: string | null;
  notes: string | null;
  status: string;
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

export default function LeadsPage() {
  const [currentModule, setCurrentModule] = useState('crm');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form with zodResolver
  const form = useForm<CrmLeadFormValidation>({
    resolver: zodResolver(crmLeadFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      companyName: '',
      productInterest: '',
      notes: '',
      storeId: '00000000-0000-0000-0000-000000000001', // Default store
      personId: '',
    }
  });

  // Fetch leads
  const { data: leads, isLoading, error } = useQuery<Lead[]>({
    queryKey: ['/api/crm/leads'],
    initialData: [
      {
        id: '1',
        personId: '1',
        personName: 'Mario Rossi',
        firstName: 'Mario',
        lastName: 'Rossi',
        email: 'mario.rossi@example.com',
        phone: '+39 340 1234567',
        companyName: 'ACME Corp',
        productInterest: 'Enterprise Plan',
        notes: 'Interessato a contratto enterprise',
        status: 'qualified',
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        personId: '2',
        personName: 'Laura Bianchi',
        firstName: 'Laura',
        lastName: 'Bianchi',
        email: 'laura.bianchi@techcorp.it',
        phone: '+39 348 9876543',
        companyName: 'TechCorp',
        productInterest: 'Business Plan',
        notes: 'Prima chiamata effettuata',
        status: 'contacted',
        createdAt: new Date().toISOString()
      }
    ]
  });

  // Fetch persons for dropdown
  const { data: persons } = useQuery<Array<{ id: string; fullName: string }>>({
    queryKey: ['/api/crm/persons'],
    select: (data: any) => data?.map((p: any) => ({ 
      id: p.id, 
      fullName: `${p.firstName} ${p.lastName}` 
    })) || [],
    initialData: [
      { id: '1', fullName: 'Mario Rossi' },
      { id: '2', fullName: 'Laura Bianchi' }
    ]
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CrmLeadFormValidation) => {
      return await apiRequest('/api/crm/leads', 'POST', {
        ...data,
        tenantId: '00000000-0000-0000-0000-000000000001' // Will be set by backend
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/leads'] });
      toast({
        title: 'Lead creato',
        description: 'Il lead è stato aggiunto con successo',
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile creare il lead',
        variant: 'destructive',
      });
    }
  });

  // Convert to deal mutation
  const convertToDealMutation = useMutation({
    mutationFn: async (leadId: string) => {
      return await apiRequest(`/api/crm/leads/${leadId}/convert`, 'POST', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/leads'] });
      toast({
        title: 'Lead convertito',
        description: 'Il lead è stato convertito in deal',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile convertire il lead',
        variant: 'destructive',
      });
    }
  });

  const onSubmit = (data: CrmLeadFormValidation) => {
    createMutation.mutate(data);
  };

  // Filter leads
  const filteredLeads = leads?.filter(lead => {
    const matchesSearch = searchQuery === '' || 
      lead.personName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.companyName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
      <div className="space-y-6" data-testid="crm-leads">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
              Gestione Lead
            </h1>
            <p className="text-gray-600 mt-1">
              {filteredLeads?.length || 0} lead in gestione
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
                <DialogTitle>Nuovo Lead</DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="personId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Persona *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-person">
                              <SelectValue placeholder="Seleziona persona" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {persons?.map(person => (
                              <SelectItem key={person.id} value={person.id}>
                                {person.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Mario" 
                              data-testid="input-firstName"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cognome *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Rossi" 
                              data-testid="input-lastName"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="mario.rossi@example.com" 
                            data-testid="input-email"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefono</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+39 340 1234567" 
                            data-testid="input-phone"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Azienda</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ACME Corporation" 
                            data-testid="input-companyName"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="productInterest"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interesse Prodotto</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enterprise Plan" 
                            data-testid="input-productInterest"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Note</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Note aggiuntive..." 
                            data-testid="input-notes"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                      {createMutation.isPending ? 'Creazione...' : 'Crea Lead'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Cerca per nome, email o azienda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48" data-testid="select-status-filter">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filtra per stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="new">Nuovo</SelectItem>
              <SelectItem value="contacted">Contattato</SelectItem>
              <SelectItem value="qualified">Qualificato</SelectItem>
              <SelectItem value="proposal">Proposta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Leads Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeads?.map((lead) => (
            <Card 
              key={lead.id}
              className="hover:shadow-xl transition-shadow border-2 hover:border-orange-200"
              data-testid={`card-lead-${lead.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{lead.personName}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      {lead.companyName || 'Nessuna azienda'}
                    </p>
                  </div>
                  <Badge className={statusColors[lead.status as keyof typeof statusColors]}>
                    {lead.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {lead.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700" data-testid={`text-email-${lead.id}`}>
                      {lead.email}
                    </span>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700" data-testid={`text-phone-${lead.id}`}>
                      {lead.phone}
                    </span>
                  </div>
                )}
                {lead.productInterest && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{lead.productInterest}</span>
                  </div>
                )}

                <div className="pt-3 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => convertToDealMutation.mutate(lead.id)}
                    disabled={convertToDealMutation.isPending}
                    data-testid={`button-convert-${lead.id}`}
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Converti in Deal
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredLeads?.length === 0 && (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Nessun lead trovato</h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchQuery ? 'Prova con una ricerca diversa' : 'Inizia creando il primo lead'}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
